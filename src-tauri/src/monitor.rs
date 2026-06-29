use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::Emitter;
use tauri::Manager;

use crate::models::DeviceStatePayload;
use crate::network::{discover_udp, extract_mac, send_udp_cmd};
use crate::state::ActiveDeviceState;
use crate::state::DeviceMapState;

const MAX_FAILURES_BEFORE_REDISCOVERY: u32 = 3;
const REDISCOVERY_INTERVAL_CYCLES: u32 = 12; // every ~60s

pub fn start_polling(app_handle: tauri::AppHandle, shutdown: Arc<AtomicBool>) {
    tauri::async_runtime::spawn(async move {
        let mut consecutive_failures: u32 = 0;
        let mut cycles_since_rediscovery: u32 = 0;

        loop {
            tokio::time::sleep(Duration::from_secs(5)).await;

            if shutdown.load(Ordering::Relaxed) {
                log::info!("Monitor de dispositivo detenido por señal de apagado.");
                break;
            }

            let mac_opt: Option<String> = {
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

            if let Some(ref mac) = mac_opt {
                // Resolve IP from MAC
                let ip_opt: Option<String> = {
                    let map = app_handle.state::<DeviceMapState>();
                    let lock = map.0.lock();
                    match lock {
                        Ok(guard) => guard.get(mac).cloned(),
                        Err(poisoned) => poisoned.into_inner().get(mac).cloned(),
                    }
                };

                // Lock order: ActiveDeviceState → DeviceMapState (never acquire in reverse).
                let should_rediscover = consecutive_failures >= MAX_FAILURES_BEFORE_REDISCOVERY
                    || cycles_since_rediscovery >= REDISCOVERY_INTERVAL_CYCLES;

                if should_rediscover {
                    log::info!(
                        "Re-descubriendo dispositivos (fallos={}, ciclos={}, ip_presente={})",
                        consecutive_failures,
                        cycles_since_rediscovery,
                        ip_opt.is_some()
                    );

                    if let Ok(devices) = discover_udp().await {
                        let rediscovered_ip: Option<String> = {
                            let map_state = app_handle.state::<DeviceMapState>();
                            let mut map = match map_state.0.lock() {
                                Ok(guard) => guard,
                                Err(poisoned) => poisoned.into_inner(),
                            };

                            for device in &devices {
                                if let (Some(dmac), Some(dip)) = (
                                    device.get("mac").and_then(|m| m.as_str()),
                                    device.get("ip").and_then(|i| i.as_str()),
                                ) {
                                    map.insert(dmac.to_string(), dip.to_string());
                                }
                            }

                            map.get(mac).cloned()
                        };

                        if let Some(new_ip) = rediscovered_ip {
                            log::info!("MAC activa {} re-descubierta con IP {}", mac, new_ip);
                            consecutive_failures = 0;
                            cycles_since_rediscovery = 0;

                            let state_payload = serde_json::json!({
                                "method": "getPilot",
                                "params": {}
                            });
                            if let Ok(resp) = send_udp_cmd(&new_ip, &state_payload).await {
                                let state_val = resp
                                    .get("result")
                                    .cloned()
                                    .unwrap_or(serde_json::Value::Null);
                                let event_payload = DeviceStatePayload {
                                    ip: new_ip,
                                    mac: mac.clone(),
                                    online: true,
                                    state: Some(state_val),
                                };
                                let _ = app_handle.emit("device-state-changed", event_payload);
                            }
                            continue;
                        }
                    }
                    // Rediscovery ran but device not found — reset cycles to impose ~60s cooldown
                    cycles_since_rediscovery = 0;
                }

                cycles_since_rediscovery += 1;

                if let Some(ref ip) = ip_opt {
                    let payload = serde_json::json!({
                        "method": "getPilot",
                        "params": {}
                    });

                    let result = send_udp_cmd(ip, &payload).await;

                    match result {
                        Ok(resp) => {
                            consecutive_failures = 0;

                            if let Some(ref new_mac) = extract_mac(&resp) {
                                if new_mac != mac {
                                    let map_state = app_handle.state::<DeviceMapState>();
                                    let mut map_guard = match map_state.0.lock() {
                                        Ok(guard) => guard,
                                        Err(poisoned) => poisoned.into_inner(),
                                    };
                                    map_guard.insert(new_mac.clone(), ip.clone());
                                    // Reafirm tracked MAC→IP so next cycle resolves correctly
                                    map_guard.insert(mac.clone(), ip.clone());
                                    log::warn!(
                                        "MAC inesperada {} en IP {} (rastreando {})",
                                        new_mac, ip, mac
                                    );
                                }
                            }

                            let state_val = resp
                                .get("result")
                                .cloned()
                                .unwrap_or(serde_json::Value::Null);
                            let event_payload = DeviceStatePayload {
                                ip: ip.clone(),
                                mac: mac.clone(),
                                online: true,
                                state: Some(state_val),
                            };
                            let _ = app_handle.emit("device-state-changed", event_payload);
                        }
                        Err(_) => {
                            consecutive_failures += 1;
                            let event_payload = DeviceStatePayload {
                                ip: ip.clone(),
                                mac: mac.clone(),
                                online: false,
                                state: None,
                            };
                            let _ = app_handle.emit("device-state-changed", event_payload);
                        }
                    }
                } else {
                    // No IP resolved for this MAC; keep trying rediscovery
                    let event_payload = DeviceStatePayload {
                        ip: String::new(),
                        mac: mac.clone(),
                        online: false,
                        state: None,
                    };
                    let _ = app_handle.emit("device-state-changed", event_payload);
                }
            }
        }
    });
}
