use crate::errors::AppError;
use crate::models::{LightState, PilotPatch};
use serde_json::Value;
use std::collections::HashMap;
use std::net::{IpAddr, Ipv4Addr, Ipv6Addr, SocketAddr};
use std::time::Duration;
use tokio::net::UdpSocket;
use tokio::time::{timeout, Instant};

/// Puerto en el que las lámparas WiZ escuchan comandos.
pub const WIZ_PORT: u16 = 38899;
/// Puerto al que las lámparas envían `syncPilot`/`firstBeat` tras un registro.
pub const PUSH_PORT: u16 = 38900;

/// Esperas (ms) por intento. UDP no garantiza entrega: si no hay respuesta se
/// retransmite el mismo paquete, que es idempotente para getPilot y setPilot.
pub const CONTROL_ATTEMPTS: &[u64] = &[350, 600, 1000];
pub const POLL_ATTEMPTS: &[u64] = &[500, 900];
/// Un solo intento corto para lámparas que ya se consideran sin conexión, así
/// no frenan a las demás de su grupo.
pub const OFFLINE_ATTEMPTS: &[u64] = &[400];

const DISCOVERY_SENDS_MS: &[u64] = &[0, 250, 600];
const DISCOVERY_LISTEN_MS: u64 = 1500;
/// Identificador que la lámpara asocia al registro de notificaciones push.
const PUSH_CLIENT_ID: &str = "AAAAAAAAAAAA";

/// Lectura de estado reportada por una lámpara (getPilot o syncPilot).
#[derive(Debug, Clone, PartialEq)]
pub struct PilotReport {
    pub mac: Option<String>,
    pub state: LightState,
    pub rssi: Option<i32>,
}

#[derive(Debug, Clone)]
pub struct Discovered {
    pub ip: IpAddr,
    pub mac: String,
    pub state: LightState,
    pub rssi: Option<i32>,
}

fn net_err(e: std::io::Error) -> AppError {
    AppError::Network(e.to_string())
}

fn unspecified_for(dest: &SocketAddr) -> SocketAddr {
    let ip = if dest.is_ipv6() {
        IpAddr::V6(Ipv6Addr::UNSPECIFIED)
    } else {
        IpAddr::V4(Ipv4Addr::UNSPECIFIED)
    };
    SocketAddr::new(ip, 0)
}

/// Valida que la cadena de texto dada sea una dirección IP válida (IPv4 o IPv6).
pub fn validate_ip(ip: &str) -> Result<IpAddr, AppError> {
    ip.parse::<IpAddr>()
        .map_err(|_| AppError::Validation(format!("Dirección IP inválida: {}", ip)))
}

/// Interpreta el objeto `result` de getPilot o `params` de syncPilot.
/// WiZ reporta `sceneId: 0` y `temp: 0` cuando ese modo no está activo.
pub fn parse_report(obj: &Value) -> Option<PilotReport> {
    let state = obj.get("state")?.as_bool()?;
    let channel = |key: &str| {
        obj.get(key)
            .and_then(Value::as_u64)
            .map(|v| v.min(255) as u8)
    };
    let rgb = match (channel("r"), channel("g"), channel("b")) {
        (Some(r), Some(g), Some(b)) => (Some(r), Some(g), Some(b)),
        _ => (None, None, None),
    };

    Some(PilotReport {
        mac: obj.get("mac").and_then(Value::as_str).map(str::to_string),
        rssi: obj.get("rssi").and_then(Value::as_i64).map(|v| v as i32),
        state: LightState {
            state,
            dimming: obj
                .get("dimming")
                .and_then(Value::as_u64)
                .map(|v| v.min(100) as u8)
                .unwrap_or(100),
            temp: obj
                .get("temp")
                .and_then(Value::as_u64)
                .filter(|t| *t > 0)
                .map(|t| t.min(u16::MAX as u64) as u16),
            r: rgb.0,
            g: rgb.1,
            b: rgb.2,
            scene_id: obj
                .get("sceneId")
                .and_then(Value::as_u64)
                .filter(|id| *id > 0)
                .map(|id| id.min(u16::MAX as u64) as u16),
        },
    })
}

/// Envía un comando UDP y espera la respuesta de ese mismo dispositivo.
///
/// Retransmite según `attempts_ms` y descarta, sin abortar, cualquier paquete
/// que no venga de la IP consultada o que no responda al método enviado.
pub async fn request(
    dest: SocketAddr,
    payload: &Value,
    attempts_ms: &[u64],
) -> Result<Value, AppError> {
    let socket = UdpSocket::bind(unspecified_for(&dest))
        .await
        .map_err(net_err)?;
    let msg = payload.to_string();
    let method = payload.get("method").and_then(Value::as_str);
    let mut buf = [0u8; 4096];

    for wait_ms in attempts_ms {
        socket
            .send_to(msg.as_bytes(), dest)
            .await
            .map_err(net_err)?;

        let deadline = Instant::now() + Duration::from_millis(*wait_ms);
        loop {
            let remaining = deadline.saturating_duration_since(Instant::now());
            if remaining.is_zero() {
                break;
            }
            let Ok(Ok((amt, src))) = timeout(remaining, socket.recv_from(&mut buf)).await else {
                break;
            };
            if src.ip() != dest.ip() {
                continue;
            }
            let Ok(resp) = serde_json::from_slice::<Value>(&buf[..amt]) else {
                continue;
            };
            if resp.get("method").and_then(Value::as_str) != method {
                continue;
            }
            if let Some(err) = resp.get("error") {
                return Err(AppError::Device(err.to_string()));
            }
            return Ok(resp);
        }
    }

    Err(AppError::Network(
        "Timeout esperando respuesta del dispositivo".to_string(),
    ))
}

pub async fn get_pilot(dest: SocketAddr, attempts_ms: &[u64]) -> Result<PilotReport, AppError> {
    let payload = serde_json::json!({ "method": "getPilot", "params": {} });
    let resp = request(dest, &payload, attempts_ms).await?;
    resp.get("result")
        .and_then(parse_report)
        .ok_or_else(|| AppError::Device("Respuesta getPilot sin estado".to_string()))
}

pub async fn set_pilot(
    dest: SocketAddr,
    patch: &PilotPatch,
    attempts_ms: &[u64],
) -> Result<(), AppError> {
    let payload = serde_json::json!({ "method": "setPilot", "params": patch.to_params() });
    let resp = request(dest, &payload, attempts_ms).await?;
    if resp["result"]["success"].as_bool() == Some(true) {
        Ok(())
    } else {
        Err(AppError::Device(resp.to_string()))
    }
}

/// Pide a la lámpara que notifique sus cambios de estado a este equipo
/// (`syncPilot` al puerto 38900). El registro caduca solo, hay que renovarlo.
pub async fn register_push(dest: SocketAddr) -> Result<(), AppError> {
    // Un socket "conectado" revela qué IP local usa el sistema para llegar a la
    // lámpara, sin enumerar interfaces ni enviar ningún paquete.
    let local_ip = {
        let probe = UdpSocket::bind(unspecified_for(&dest))
            .await
            .map_err(net_err)?;
        probe.connect(dest).await.map_err(net_err)?;
        probe.local_addr().map_err(net_err)?.ip()
    };

    let payload = serde_json::json!({
        "method": "registration",
        "params": {
            "phoneMac": PUSH_CLIENT_ID,
            "register": true,
            "phoneIp": local_ip.to_string(),
            "id": "1"
        }
    });
    request(dest, &payload, &[500]).await.map(|_| ())
}

/// Envía un broadcast UDP a la red local para descubrir lámparas.
///
/// El broadcast se repite porque un único paquete se pierde con facilidad en
/// Wi-Fi; las respuestas se deduplican por MAC. Aquí se aceptan respuestas de
/// cualquier IP, ya que el objetivo es encontrar dispositivos desconocidos.
pub async fn discover(port: u16) -> Result<Vec<Discovered>, AppError> {
    let socket = UdpSocket::bind("0.0.0.0:0").await.map_err(net_err)?;
    socket.set_broadcast(true).map_err(net_err)?;

    let msg = serde_json::json!({ "method": "getPilot", "params": {} }).to_string();
    let dest = SocketAddr::new(IpAddr::V4(Ipv4Addr::BROADCAST), port);

    let mut found: HashMap<String, Discovered> = HashMap::new();
    let mut buf = [0u8; 4096];
    let start = Instant::now();
    let mut next_send = 0;

    loop {
        let elapsed = start.elapsed();
        while next_send < DISCOVERY_SENDS_MS.len()
            && elapsed >= Duration::from_millis(DISCOVERY_SENDS_MS[next_send])
        {
            let sent = socket.send_to(msg.as_bytes(), dest).await;
            // Sin red no hay nada que escuchar; solo el primer envío es fatal.
            if next_send == 0 {
                sent.map_err(net_err)?;
            }
            next_send += 1;
        }

        let until_ms = DISCOVERY_SENDS_MS
            .get(next_send)
            .copied()
            .unwrap_or(DISCOVERY_LISTEN_MS);
        let wait = Duration::from_millis(until_ms).saturating_sub(elapsed);
        if wait.is_zero() {
            if next_send >= DISCOVERY_SENDS_MS.len() {
                break;
            }
            continue;
        }

        match timeout(wait, socket.recv_from(&mut buf)).await {
            Ok(Ok((amt, src))) => {
                let Ok(resp) = serde_json::from_slice::<Value>(&buf[..amt]) else {
                    continue;
                };
                if resp.get("method").and_then(Value::as_str) != Some("getPilot") {
                    continue;
                }
                let Some(report) = resp.get("result").and_then(parse_report) else {
                    continue;
                };
                if let Some(mac) = report.mac {
                    found.insert(
                        mac.clone(),
                        Discovered {
                            ip: src.ip(),
                            mac,
                            state: report.state,
                            rssi: report.rssi,
                        },
                    );
                }
            }
            Ok(Err(_)) => break,
            Err(_) => continue,
        }
    }

    Ok(found.into_values().collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn block_on<F: std::future::Future>(future: F) -> F::Output {
        tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap()
            .block_on(future)
    }

    /// Lámpara simulada en localhost: responde getPilot/setPilot ignorando los
    /// primeros `drop_first` paquetes, para ejercitar las retransmisiones.
    async fn fake_bulb(drop_first: usize) -> (SocketAddr, tokio::task::JoinHandle<Vec<Value>>) {
        let socket = UdpSocket::bind("127.0.0.1:0").await.unwrap();
        let addr = socket.local_addr().unwrap();
        let handle = tokio::spawn(async move {
            let mut received = Vec::new();
            let mut buf = [0u8; 4096];
            while let Ok(Ok((amt, src))) =
                timeout(Duration::from_millis(1500), socket.recv_from(&mut buf)).await
            {
                let msg: Value = serde_json::from_slice(&buf[..amt]).unwrap();
                received.push(msg.clone());
                if received.len() <= drop_first {
                    continue;
                }
                let reply = match msg["method"].as_str() {
                    Some("getPilot") => serde_json::json!({
                        "method": "getPilot",
                        "env": "pro",
                        "result": {
                            "mac": "a8bb50aabbcc", "rssi": -61, "state": true,
                            "sceneId": 0, "temp": 2700, "dimming": 80
                        }
                    }),
                    Some("setPilot") if msg["params"]["temp"] == 1 => serde_json::json!({
                        "method": "setPilot",
                        "error": { "code": -32600, "message": "Invalid Request" }
                    }),
                    _ => serde_json::json!({
                        "method": msg["method"], "env": "pro", "result": { "success": true }
                    }),
                };
                // Paquete parásito previo: debe ignorarse, no abortar la espera.
                socket.send_to(b"not json", src).await.unwrap();
                socket
                    .send_to(reply.to_string().as_bytes(), src)
                    .await
                    .unwrap();
            }
            received
        });
        (addr, handle)
    }

    #[test]
    fn get_pilot_parses_state_from_bulb() {
        block_on(async {
            let (addr, _bulb) = fake_bulb(0).await;
            let report = get_pilot(addr, POLL_ATTEMPTS).await.unwrap();
            assert_eq!(report.mac.as_deref(), Some("a8bb50aabbcc"));
            assert_eq!(report.rssi, Some(-61));
            assert_eq!(
                report.state,
                LightState {
                    state: true,
                    dimming: 80,
                    temp: Some(2700),
                    ..Default::default()
                }
            );
        });
    }

    #[test]
    fn request_retransmits_when_first_packet_is_lost() {
        block_on(async {
            let (addr, bulb) = fake_bulb(1).await;
            let patch: PilotPatch =
                serde_json::from_value(serde_json::json!({ "dimming": 40 })).unwrap();
            set_pilot(addr, &patch, &[100, 300]).await.unwrap();
            assert_eq!(bulb.await.unwrap().len(), 2);
        });
    }

    #[test]
    fn request_times_out_when_bulb_is_silent() {
        block_on(async {
            let (addr, _bulb) = fake_bulb(usize::MAX).await;
            let result = get_pilot(addr, &[50, 50]).await;
            assert!(matches!(result, Err(AppError::Network(_))));
        });
    }

    #[test]
    fn rejected_command_is_a_device_error() {
        block_on(async {
            let (addr, _bulb) = fake_bulb(0).await;
            let patch = PilotPatch {
                temp: Some(1),
                ..Default::default()
            };
            let result = set_pilot(addr, &patch, &[300]).await;
            assert!(matches!(result, Err(AppError::Device(_))));
        });
    }

    #[test]
    fn parse_report_reads_rgb_and_ignores_inactive_modes() {
        let report = parse_report(&serde_json::json!({
            "mac": "a8bb50aabbcc", "state": false, "sceneId": 0, "temp": 0,
            "r": 255, "g": 10, "b": 0, "c": 0, "w": 0, "dimming": 35
        }))
        .unwrap();
        assert_eq!(
            report.state,
            LightState {
                state: false,
                dimming: 35,
                r: Some(255),
                g: Some(10),
                b: Some(0),
                ..Default::default()
            }
        );
    }

    #[test]
    fn parse_report_requires_power_state() {
        assert!(parse_report(&serde_json::json!({ "mac": "a8bb50aabbcc" })).is_none());
    }

    #[test]
    fn validate_ip_rejects_invalid_input() {
        assert!(validate_ip("").is_err());
        assert!(validate_ip("not-an-ip").is_err());
        assert!(validate_ip("999.999.999.999").is_err());
    }

    #[test]
    fn validate_ip_accepts_ipv4_and_ipv6() {
        assert_eq!(
            validate_ip("127.0.0.1").unwrap(),
            IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1))
        );
        assert!(validate_ip("192.168.1.100").is_ok());
        assert!(validate_ip("::1").is_ok());
        assert!(validate_ip("fe80::1").is_ok());
    }
}
