use crate::errors::AppError;
use serde_json::Value;
use std::net::{IpAddr, SocketAddr};
use std::time::Duration;
use tokio::net::UdpSocket;
use tokio::time::timeout;

/// Valida que la cadena de texto dada sea una dirección IP válida (IPv4 o IPv6).
pub fn validate_ip(ip: &str) -> Result<IpAddr, AppError> {
    ip.parse::<IpAddr>()
        .map_err(|_| AppError::Validation(format!("Dirección IP inválida: {}", ip)))
}

/// Envía un comando UDP a un dispositivo de luz y espera su respuesta de forma asíncrona.
///
/// Valida que el paquete de respuesta provenga exactamente de la IP esperada,
/// descartando paquetes parásitos de otros servicios en la red local.
/// El timeout de espera de respuesta es de 1500 ms.
pub async fn send_udp_cmd(ip: &str, payload: &Value) -> Result<Value, AppError> {
    let target_ip = validate_ip(ip)?;
    let dest: SocketAddr = format!("{}:38899", ip)
        .parse()
        .map_err(|e: std::net::AddrParseError| AppError::Network(e.to_string()))?;

    let socket = UdpSocket::bind("0.0.0.0:0")
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;

    let msg = serde_json::to_string(payload).map_err(|e| AppError::Network(e.to_string()))?;
    socket
        .send_to(msg.as_bytes(), dest)
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;

    let mut buf = [0u8; 4096];

    // Espera la respuesta con timeout. Si no llega en 1500 ms, devuelve error de red.
    let (amt, src) = timeout(Duration::from_millis(1500), socket.recv_from(&mut buf))
        .await
        .map_err(|_| AppError::Network("Timeout esperando respuesta del dispositivo".to_string()))?
        .map_err(|e| AppError::Network(e.to_string()))?;

    // Descarta respuestas de IPs distintas al dispositivo consultado
    // para evitar procesar paquetes broadcast parásitos en la red local.
    if src.ip() != target_ip {
        return Err(AppError::Network(format!(
            "Respuesta recibida de IP inesperada: {} (esperada: {})",
            src.ip(),
            target_ip
        )));
    }

    let resp: Value =
        serde_json::from_slice(&buf[..amt]).map_err(|e| AppError::Network(e.to_string()))?;
    Ok(resp)
}

/// Envía un broadcast UDP a la red local para descubrir dispositivos activos.
/// Escucha respuestas durante 2 segundos antes de retornar la lista encontrada.
///
/// A diferencia de `send_udp_cmd`, aquí sí aceptamos respuestas de cualquier IP
/// ya que el objetivo es descubrir dispositivos desconocidos.
pub async fn discover_udp() -> Result<Vec<Value>, AppError> {
    let socket = UdpSocket::bind("0.0.0.0:0")
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;
    socket
        .set_broadcast(true)
        .map_err(|e| AppError::Network(e.to_string()))?;

    let payload = serde_json::json!({
        "method": "getPilot",
        "params": {}
    });
    let msg = payload.to_string();

    socket
        .send_to(msg.as_bytes(), "255.255.255.255:38899")
        .await
        .map_err(|e| AppError::Network(e.to_string()))?;

    let mut found = Vec::new();
    let mut buf = [0u8; 4096];
    let listen_duration = Duration::from_millis(2000);

    // Escucha en bucle hasta que el timeout global expire.
    // Cada recv_from tiene su propio timeout relativo al inicio de la escucha.
    let deadline = tokio::time::Instant::now() + listen_duration;
    loop {
        let remaining = deadline.saturating_duration_since(tokio::time::Instant::now());
        if remaining.is_zero() {
            break;
        }
        match timeout(remaining, socket.recv_from(&mut buf)).await {
            Ok(Ok((amt, src))) => {
                if let Ok(resp) = serde_json::from_slice::<Value>(&buf[..amt]) {
                    // Validate that the response follows the WiZ protocol structure.
                    // A valid getPilot response must have method == "getPilot" and a
                    // result object containing at least "state" and "dimming" fields.
                    let is_wiz = resp.get("method").and_then(|m| m.as_str()) == Some("getPilot")
                        && resp
                            .get("result")
                            .and_then(|r| r.as_object())
                            .map(|r| r.contains_key("state") && r.contains_key("dimming"))
                            .unwrap_or(false);

                    if is_wiz {
                        found.push(serde_json::json!({
                            "ip": src.ip().to_string(),
                            "state": resp["result"]
                        }));
                    }
                }
            }
            // Timeout expirado o error de socket: terminamos la escucha.
            Ok(Err(_)) | Err(_) => break,
        }
    }

    Ok(found)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_ip_rejects_empty_string() {
        let result = validate_ip("");
        assert!(result.is_err());
    }

    #[test]
    fn validate_ip_rejects_garbage() {
        let result = validate_ip("not-an-ip");
        assert!(result.is_err());
    }

    #[test]
    fn validate_ip_rejects_out_of_range() {
        let result = validate_ip("999.999.999.999");
        assert!(result.is_err());
    }

    #[test]
    fn validate_ip_accepts_ipv4_loopback() {
        let result = validate_ip("127.0.0.1");
        assert!(result.is_ok());
        assert_eq!(
            result.unwrap(),
            IpAddr::V4(std::net::Ipv4Addr::new(127, 0, 0, 1))
        );
    }

    #[test]
    fn validate_ip_accepts_ipv4_local() {
        let result = validate_ip("192.168.1.100");
        assert!(result.is_ok());
    }

    #[test]
    fn validate_ip_accepts_ipv6_loopback() {
        let result = validate_ip("::1");
        assert!(result.is_ok());
    }

    #[test]
    fn validate_ip_accepts_ipv6_full() {
        let result = validate_ip("fe80::1");
        assert!(result.is_ok());
    }
}
