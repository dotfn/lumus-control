use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::Manager;
use tauri::Emitter;

use crate::models::DeviceStatePayload;
use crate::network::send_udp_cmd;
use crate::state::ActiveDeviceState;

/// Inicia el bucle de polling como una tarea asíncrona de Tokio.
///
/// Cada 5 segundos consulta el estado del dispositivo activo (si existe) usando
/// `tokio::time::sleep`, que suspende la tarea sin bloquear ningún hilo del OS.
/// El evento `device-state-changed` se emite al frontend con el resultado.
///
/// El bucle termina limpiamente cuando `shutdown` se establece en `true`,
/// lo que ocurre desde el handler `on_window_event` registrado en `lib.rs`.
pub fn start_polling(app_handle: tauri::AppHandle, shutdown: Arc<AtomicBool>) {
    tauri::async_runtime::spawn(async move {
        loop {
            // Espera 5 segundos de forma asíncrona, sin bloquear ningún hilo del OS.
            tokio::time::sleep(Duration::from_secs(5)).await;

            // Verifica la señal de apagado antes de cada ciclo de trabajo.
            if shutdown.load(Ordering::Relaxed) {
                log::info!("Monitor de dispositivo detenido por señal de apagado.");
                break;
            }

            // Lee la IP del dispositivo activo desde el estado compartido.
            // El lock se adquiere y libera dentro del bloque para no mantenerlo
            // durante el await de la llamada de red.
            let ip_opt: Option<String> = {
                let state = app_handle.state::<ActiveDeviceState>();
                let lock = state.0.lock();
                match lock {
                    Ok(guard) => guard.clone(),
                    Err(poisoned) => {
                        log::warn!("Mutex de ActiveDeviceState envenenado; recuperando valor.");
                        poisoned.into_inner().clone()
                    }
                }
            };

            if let Some(ip) = ip_opt {
                let payload = serde_json::json!({
                    "method": "getPilot",
                    "params": {}
                });

                // La llamada de red es completamente asíncrona aquí.
                // Si la bombilla no responde, el timeout de 1500ms expira sin
                // bloquear ningún otro hilo ni tarea del runtime de Tokio.
                let result = send_udp_cmd(&ip, &payload).await;

                let event_payload = match result {
                    Ok(resp) => {
                        let state_val =
                            resp.get("result").cloned().unwrap_or(serde_json::Value::Null);
                        DeviceStatePayload {
                            ip: ip.clone(),
                            online: true,
                            state: Some(state_val),
                        }
                    }
                    Err(_) => DeviceStatePayload {
                        ip: ip.clone(),
                        online: false,
                        state: None,
                    },
                };

                let _ = app_handle.emit("device-state-changed", event_payload);
            }
        }
    });
}
