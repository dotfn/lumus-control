use std::net::SocketAddr;
use std::sync::atomic::Ordering;
use std::sync::Arc;
use std::time::Duration;
use tauri::{Emitter, Manager};
use tokio::net::UdpSocket;
use tokio::time::{sleep, timeout};

use crate::config;
use crate::errors::AppError;
use crate::models::DeviceSnapshot;
use crate::network::{self, OFFLINE_ATTEMPTS, POLL_ATTEMPTS, PUSH_PORT, WIZ_PORT};
use crate::registry::PollTarget;
use crate::state::{ConfigState, Shared};

const POLL_INTERVAL: Duration = Duration::from_secs(3);
/// Pausa tras un pedido de sondeo inmediato, para agrupar ráfagas de comandos
/// (un slider) en una sola lectura de confirmación.
const POLL_DEBOUNCE: Duration = Duration::from_millis(250);
/// Ciclos entre discoveries de rutina (~60 s) y cuando falta alguna lámpara (~15 s).
const DISCOVERY_EVERY: u32 = 20;
const DISCOVERY_RETRY: u32 = 5;
/// El registro push caduca en la lámpara; se renueva cada tres ciclos (~9 s).
const REGISTER_EVERY: u32 = 3;

pub fn emit_updates(app: &tauri::AppHandle, changed: Vec<DeviceSnapshot>) {
    for snapshot in changed {
        let _ = app.emit("device-updated", snapshot);
    }
}

/// Guarda las IPs conocidas si cambiaron, para reencontrar las lámparas al
/// próximo arranque sin depender del discovery.
pub fn persist_known(app: &tauri::AppHandle, shared: &Shared) {
    let addresses = shared.registry().address_map();
    {
        let state = app.state::<ConfigState>();
        let mut config = state.0.lock().unwrap_or_else(|e| e.into_inner());
        let mut merged = config.known_devices.clone();
        merged.extend(addresses);
        if merged == config.known_devices {
            return;
        }
        config.known_devices = merged;
    }
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(e) = config::persist(&app).await {
            log::warn!("No se pudieron guardar las lámparas conocidas: {:?}", e);
        }
    });
}

/// Busca lámparas en la red y las incorpora al registro.
pub async fn run_discovery(app: &tauri::AppHandle, shared: &Shared) -> Result<(), AppError> {
    let found = network::discover(WIZ_PORT).await?;
    let changed = {
        let mut registry = shared.registry();
        found
            .into_iter()
            .flat_map(|d| registry.observe(&d.mac, d.ip, Some(d.state), d.rssi))
            .collect::<Vec<_>>()
    };
    emit_updates(app, changed);
    persist_known(app, shared);
    Ok(())
}

pub fn start(app: tauri::AppHandle, shared: Arc<Shared>) {
    tauri::async_runtime::spawn(push_listener(app.clone(), shared.clone()));
    tauri::async_runtime::spawn(poll_loop(app, shared));
}

/// Sondea todas las lámparas conocidas, no solo la seleccionada: es lo que
/// permite reflejar apagados y cambios hechos desde otra app o un interruptor.
async fn poll_loop(app: tauri::AppHandle, shared: Arc<Shared>) {
    let mut cycle: u32 = 0;
    let mut since_discovery = DISCOVERY_EVERY;

    while !shutdown_requested(&shared) {
        let register_push = cycle % REGISTER_EVERY == 0;
        let targets = shared.registry().poll_targets();
        let polls: Vec<_> = targets
            .into_iter()
            .map(|target| {
                tauri::async_runtime::spawn(poll_device(
                    app.clone(),
                    shared.clone(),
                    target,
                    register_push,
                ))
            })
            .collect();
        for poll in polls {
            let _ = poll.await;
        }

        // El discovery va después del sondeo: al arrancar, las lámparas ya
        // conocidas se confirman por su IP sin esperar a que termine la búsqueda.
        let missing_devices = {
            let registry = shared.registry();
            registry.is_empty() || registry.has_unreachable()
        };
        if since_discovery >= DISCOVERY_EVERY
            || (missing_devices && since_discovery >= DISCOVERY_RETRY)
        {
            since_discovery = 0;
            if let Err(e) = run_discovery(&app, &shared).await {
                log::debug!("Discovery falló: {:?}", e);
            }
        }

        cycle = cycle.wrapping_add(1);
        since_discovery += 1;

        if timeout(POLL_INTERVAL, shared.poll_now.notified())
            .await
            .is_ok()
        {
            sleep(POLL_DEBOUNCE).await;
        }
    }
    log::info!("Monitor de dispositivos detenido.");
}

async fn poll_device(
    app: tauri::AppHandle,
    shared: Arc<Shared>,
    target: PollTarget,
    register_push: bool,
) {
    let dest = SocketAddr::new(target.ip, WIZ_PORT);
    let attempts = if target.online {
        POLL_ATTEMPTS
    } else {
        OFFLINE_ATTEMPTS
    };

    let report = network::get_pilot(dest, attempts).await;
    let reachable = report.is_ok();
    let changed = {
        let mut registry = shared.registry();
        match report {
            Ok(report) => match report.mac.as_deref() {
                // La IP ahora pertenece a otra lámpara: el router la reasignó.
                Some(mac) if mac != target.mac => {
                    registry.observe(mac, target.ip, Some(report.state), report.rssi)
                }
                _ => registry.poll_ok(
                    &target.mac,
                    target.ip,
                    target.seq,
                    report.state,
                    report.rssi,
                ),
            },
            Err(_) => registry.poll_failed(&target.mac, target.ip),
        }
    };
    emit_updates(&app, changed);

    if reachable && register_push {
        let _ = network::register_push(dest).await;
    }
}

/// Escucha las notificaciones que las lámparas registradas envían al cambiar
/// de estado (`syncPilot`) o al recibir corriente (`firstBeat`). Es lo que hace
/// que un cambio externo aparezca al instante; el sondeo queda como respaldo.
async fn push_listener(app: tauri::AppHandle, shared: Arc<Shared>) {
    let socket = match UdpSocket::bind(("0.0.0.0", PUSH_PORT)).await {
        Ok(socket) => socket,
        Err(e) => {
            log::warn!(
                "Puerto {} no disponible ({}); se usará solo sondeo.",
                PUSH_PORT,
                e
            );
            return;
        }
    };

    let mut buf = [0u8; 4096];
    while !shutdown_requested(&shared) {
        let (amt, src) = match timeout(Duration::from_secs(1), socket.recv_from(&mut buf)).await {
            Ok(Ok(received)) => received,
            Ok(Err(_)) => {
                sleep(Duration::from_secs(1)).await;
                continue;
            }
            Err(_) => continue,
        };
        let Ok(msg) = serde_json::from_slice::<serde_json::Value>(&buf[..amt]) else {
            continue;
        };
        let params = &msg["params"];

        let changed = match msg["method"].as_str() {
            Some("syncPilot") => {
                let Some(report) = network::parse_report(params) else {
                    continue;
                };
                let Some(mac) = report.mac else {
                    continue;
                };
                shared
                    .registry()
                    .observe(&mac, src.ip(), Some(report.state), report.rssi)
            }
            Some("firstBeat") => {
                let Some(mac) = params["mac"].as_str() else {
                    continue;
                };
                let changed = shared.registry().observe(mac, src.ip(), None, None);
                // Recién encendida: aún no informó su estado, lo pedimos ya.
                shared.poll_now.notify_one();
                changed
            }
            _ => continue,
        };

        if !changed.is_empty() {
            emit_updates(&app, changed);
            persist_known(&app, &shared);
        }
    }
}

fn shutdown_requested(shared: &Shared) -> bool {
    shared.shutdown.load(Ordering::Relaxed)
}
