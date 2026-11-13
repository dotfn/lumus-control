use std::collections::{HashMap, HashSet};
use std::net::SocketAddr;
use std::sync::Arc;

use crate::config::{self, migrate_device_names};
use crate::errors::AppError;
use crate::models::{AppConfig, ControlOutcome, DeviceSnapshot, PilotPatch};
use crate::monitor::{emit_updates, persist_known, run_discovery};
use crate::network::{self, validate_ip, CONTROL_ATTEMPTS, OFFLINE_ATTEMPTS, WIZ_PORT};
use crate::registry::CommandResult;
use crate::state::{AppShared, ConfigState, Shared};

const MAX_CONTROL_TARGETS: usize = 64;

#[tauri::command]
pub fn get_device_names(
    config_state: tauri::State<'_, ConfigState>,
) -> Result<HashMap<String, String>, AppError> {
    let config = config_state
        .0
        .lock()
        .map_err(|e| AppError::Config(e.to_string()))?;
    Ok(config.device_names.clone())
}

#[tauri::command]
pub async fn save_device_name(
    app: tauri::AppHandle,
    config_state: tauri::State<'_, ConfigState>,
    shared: tauri::State<'_, AppShared>,
    mac: String,
    name: String,
) -> Result<(), AppError> {
    if mac.is_empty() {
        return Err(AppError::Validation(
            "El identificador MAC no puede estar vacío".to_string(),
        ));
    }
    if mac.len() > 64 {
        return Err(AppError::Validation(
            "El identificador MAC no puede superar los 64 caracteres".to_string(),
        ));
    }
    if name.len() > 256 {
        return Err(AppError::Validation(
            "El nombre del dispositivo no puede superar los 256 caracteres".to_string(),
        ));
    }

    {
        let mut config = config_state
            .0
            .lock()
            .map_err(|e| AppError::Config(e.to_string()))?;
        migrate_device_names(&mut config.device_names, &shared.0.registry().address_map());
        config.device_names.insert(mac, name);
    }
    config::persist(&app).await
}

#[tauri::command]
pub fn get_preferences(config_state: tauri::State<'_, ConfigState>) -> Result<AppConfig, AppError> {
    let config = config_state
        .0
        .lock()
        .map_err(|e| AppError::Config(e.to_string()))?;
    Ok(config.clone())
}

#[tauri::command]
pub async fn save_preferences(
    app: tauri::AppHandle,
    config_state: tauri::State<'_, ConfigState>,
    shared: tauri::State<'_, AppShared>,
    last_mac: Option<String>,
    theme: Option<String>,
) -> Result<(), AppError> {
    {
        let mut config = config_state
            .0
            .lock()
            .map_err(|e| AppError::Config(e.to_string()))?;

        if let Some(ref t) = theme {
            if t != "light" && t != "dark" {
                return Err(AppError::Validation(format!(
                    "Tema inválido: '{}'. Debe ser 'light' o 'dark'.",
                    t
                )));
            }
            config.theme = Some(t.clone());
        }
        if let Some(mac) = last_mac {
            config.last_mac = Some(mac);
        }
        migrate_device_names(&mut config.device_names, &shared.0.registry().address_map());
    }
    config::persist(&app).await
}

/// Estado actual de todas las lámparas conocidas, sin tocar la red.
#[tauri::command]
pub fn list_devices(shared: tauri::State<'_, AppShared>) -> Vec<DeviceSnapshot> {
    shared.0.registry().snapshots()
}

/// Busca lámparas en la red y devuelve la lista completa actualizada. Las que
/// no respondan siguen en la lista: un broadcast perdido no las hace desaparecer.
#[tauri::command]
pub async fn discover(
    app: tauri::AppHandle,
    shared: tauri::State<'_, AppShared>,
) -> Result<Vec<DeviceSnapshot>, AppError> {
    run_discovery(&app, &shared.0).await?;
    shared.0.poll_now.notify_one();
    Ok(shared.0.registry().snapshots())
}

/// Pide al monitor un sondeo inmediato (p. ej. al volver de reposo). Los
/// cambios llegan por el evento `device-updated`.
#[tauri::command]
pub fn refresh(shared: tauri::State<'_, AppShared>) -> Vec<DeviceSnapshot> {
    shared.0.poll_now.notify_one();
    shared.0.registry().snapshots()
}

/// Da de alta una lámpara por IP. Se le consulta el estado para obtener su MAC
/// real, de modo que quede identificada igual que las descubiertas.
#[tauri::command]
pub async fn add_device_by_ip(
    app: tauri::AppHandle,
    shared: tauri::State<'_, AppShared>,
    ip: String,
) -> Result<DeviceSnapshot, AppError> {
    let addr = validate_ip(ip.trim())?;
    let report = network::get_pilot(SocketAddr::new(addr, WIZ_PORT), CONTROL_ATTEMPTS).await?;
    let mac = report
        .mac
        .ok_or_else(|| AppError::Device("La lámpara no informó su MAC".to_string()))?;

    let changed = shared
        .0
        .registry()
        .observe(&mac, addr, Some(report.state), report.rssi);
    emit_updates(&app, changed);
    persist_known(&app, &shared.0);

    shared
        .0
        .registry()
        .snapshot(&mac)
        .ok_or_else(|| AppError::Config("Dispositivo no registrado".to_string()))
}

/// Aplica el mismo cambio a una o varias lámparas en paralelo. Devuelve un
/// resultado por lámpara: en un grupo, una caída no hace fallar a las demás.
#[tauri::command]
pub async fn control(
    app: tauri::AppHandle,
    shared: tauri::State<'_, AppShared>,
    macs: Vec<String>,
    patch: PilotPatch,
) -> Result<Vec<ControlOutcome>, AppError> {
    patch.validate()?;

    let mut seen = HashSet::new();
    let macs: Vec<String> = macs
        .into_iter()
        .filter(|mac| seen.insert(mac.clone()))
        .collect();
    if macs.is_empty() || macs.len() > MAX_CONTROL_TARGETS {
        return Err(AppError::Validation(format!(
            "Se debe indicar entre 1 y {} lámparas",
            MAX_CONTROL_TARGETS
        )));
    }

    let shared = shared.0.clone();
    let tasks: Vec<_> = macs
        .into_iter()
        .map(|mac| {
            tauri::async_runtime::spawn(control_one(
                app.clone(),
                shared.clone(),
                mac,
                patch.clone(),
            ))
        })
        .collect();

    let mut outcomes = Vec::with_capacity(tasks.len());
    for task in tasks {
        if let Ok(outcome) = task.await {
            outcomes.push(outcome);
        }
    }

    // Lectura de confirmación: la lámpara es la autoridad sobre su estado final.
    shared.poll_now.notify_one();
    Ok(outcomes)
}

async fn control_one(
    app: tauri::AppHandle,
    shared: Arc<Shared>,
    mac: String,
    patch: PilotPatch,
) -> ControlOutcome {
    let Some((ip, online)) = shared.registry().begin_command(&mac) else {
        return ControlOutcome {
            device: shared.registry().snapshot(&mac),
            mac,
            ok: false,
            error: Some("No se conoce la dirección de la lámpara".to_string()),
        };
    };

    let attempts = if online {
        CONTROL_ATTEMPTS
    } else {
        OFFLINE_ATTEMPTS
    };
    let result = network::set_pilot(SocketAddr::new(ip, WIZ_PORT), &patch, attempts).await;

    let changed = shared.registry().end_command(
        &mac,
        match &result {
            Ok(()) => CommandResult::Applied(&patch),
            Err(AppError::Device(_)) => CommandResult::Rejected,
            Err(_) => CommandResult::Unreachable,
        },
    );
    emit_updates(&app, changed);

    ControlOutcome {
        device: shared.registry().snapshot(&mac),
        ok: result.is_ok(),
        error: result.err().map(|e| e.to_string()),
        mac,
    }
}
