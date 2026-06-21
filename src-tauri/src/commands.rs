use std::collections::HashMap;
use serde_json::Value;
use tauri::Emitter;

use crate::config::{get_config_path, write_config};
use crate::errors::AppError;
use crate::models::{AppConfig, DeviceStatePayload};
use crate::network::{discover_udp, send_udp_cmd, validate_ip};
use crate::state::{ActiveDeviceState, ConfigState};

/// Devuelve los nombres personalizados de dispositivos desde la caché en memoria.
/// Síncrono: no realiza I/O, solo lee el Mutex en memoria.
#[tauri::command]
pub fn get_device_names(
    config_state: tauri::State<'_, ConfigState>,
) -> Result<HashMap<String, String>, AppError> {
    let config = config_state.0.lock().map_err(|e| AppError::Config(e.to_string()))?;
    Ok(config.device_names.clone())
}

/// Guarda el nombre personalizado de un dispositivo en disco y actualiza la caché.
/// Asíncrono: realiza I/O de disco (escritura atómica).
#[tauri::command]
pub async fn save_device_name(
    app: tauri::AppHandle,
    config_state: tauri::State<'_, ConfigState>,
    ip: String,
    name: String,
) -> Result<(), AppError> {
    validate_ip(&ip)?;
    if ip.len() > 45 {
        return Err(AppError::Validation(
            "La dirección IP no puede superar los 45 caracteres".to_string(),
        ));
    }
    if name.len() > 256 {
        return Err(AppError::Validation(
            "El nombre del dispositivo no puede superar los 256 caracteres".to_string(),
        ));
    }

    let path = get_config_path(&app)?;
    // El guard del Mutex debe liberarse antes de la escritura a disco para no
    // mantener el lock durante el I/O. Clonamos la config y liberamos el guard.
    let updated_config = {
        let mut config = config_state.0.lock().map_err(|e| AppError::Config(e.to_string()))?;
        config.device_names.insert(ip, name);
        config.clone()
    };
    // Escribe en disco fuera del lock para minimizar el tiempo de bloqueo.
    tokio::task::spawn_blocking(move || write_config(&path, &updated_config))
        .await
        .map_err(|e| AppError::Config(e.to_string()))?
}

/// Devuelve la configuración completa del usuario desde la caché en memoria.
/// Síncrono: no realiza I/O, solo lee el Mutex en memoria.
#[tauri::command]
pub fn get_preferences(
    config_state: tauri::State<'_, ConfigState>,
) -> Result<AppConfig, AppError> {
    let config = config_state.0.lock().map_err(|e| AppError::Config(e.to_string()))?;
    Ok(config.clone())
}

/// Guarda las preferencias del usuario (IP activa y tema) en disco y actualiza ambas cachés.
/// Asíncrono: realiza I/O de disco (escritura atómica).
#[tauri::command]
pub async fn save_preferences(
    app: tauri::AppHandle,
    config_state: tauri::State<'_, ConfigState>,
    active_device: tauri::State<'_, ActiveDeviceState>,
    last_ip: Option<String>,
    theme: Option<String>,
) -> Result<(), AppError> {
    let path = get_config_path(&app)?;

    // Actualiza la caché en memoria y libera ambos locks antes del I/O de disco.
    let updated_config = {
        let mut config = config_state.0.lock().map_err(|e| AppError::Config(e.to_string()))?;

        if let Some(ref ip) = last_ip {
            config.last_ip = Some(ip.clone());
            // Actualiza también el estado del dispositivo activo para el monitor.
            let mut device_lock = active_device
                .0
                .lock()
                .map_err(|e| AppError::Config(e.to_string()))?;
            *device_lock = Some(ip.clone());
        }

        if let Some(ref t) = theme {
            if t != "light" && t != "dark" {
                return Err(AppError::Validation(
                    format!("Tema inválido: '{}'. Debe ser 'light' o 'dark'.", t),
                ));
            }
            config.theme = Some(t.clone());
        }

        config.clone()
    };

    tokio::task::spawn_blocking(move || write_config(&path, &updated_config))
        .await
        .map_err(|e| AppError::Config(e.to_string()))?
}

/// Descubre dispositivos WiZ en la red local mediante broadcast UDP.
/// Asíncrono: realiza I/O de red con timeout de 2 segundos.
#[tauri::command]
pub async fn discover() -> Result<Value, AppError> {
    let devices = discover_udp().await?;
    Ok(serde_json::json!(devices))
}

/// Consulta el estado actual de un dispositivo WiZ por su IP.
/// Asíncrono: realiza I/O de red con timeout de 1500 ms.
#[tauri::command]
pub async fn get_state(ip: String) -> Result<Value, AppError> {
    let payload = serde_json::json!({
        "method": "getPilot",
        "params": {}
    });
    let resp = send_udp_cmd(&ip, &payload).await?;
    Ok(resp.get("result").cloned().unwrap_or(serde_json::Value::Null))
}

/// Envía un comando de control a un dispositivo WiZ y emite el nuevo estado al frontend.
/// Asíncrono: realiza I/O de red con timeout de 1500 ms.
#[tauri::command]
pub async fn control(
    app: tauri::AppHandle,
    ip: String,
    state: Option<bool>,
    dimming: Option<u8>,
    temp: Option<u16>,
    r: Option<u8>,
    g: Option<u8>,
    b: Option<u8>,
    scene_id: Option<u8>,
) -> Result<Value, AppError> {
    if let Some(d) = dimming {
        if d < 10 || d > 100 {
            return Err(AppError::Validation(
                "El brillo debe estar entre 10 y 100".to_string(),
            ));
        }
    }
    if let Some(t) = temp {
        if t < 2200 || t > 6500 {
            return Err(AppError::Validation(
                "La temperatura debe estar entre 2200K y 6500K".to_string(),
            ));
        }
    }
    if let Some(s_id) = scene_id {
        if s_id < 1 || s_id > 32 {
            return Err(AppError::Validation(
                "El ID de escena debe estar entre 1 y 32".to_string(),
            ));
        }
    }

    let mut params = serde_json::Map::new();
    if let Some(s) = state {
        params.insert("state".to_string(), serde_json::Value::Bool(s));
    }
    if let Some(d) = dimming {
        params.insert("dimming".to_string(), serde_json::Value::Number(d.into()));
    }
    if let Some(t) = temp {
        params.insert("temp".to_string(), serde_json::Value::Number(t.into()));
    }
    if let (Some(rv), Some(gv), Some(bv)) = (r, g, b) {
        params.insert("r".to_string(), serde_json::Value::Number(rv.into()));
        params.insert("g".to_string(), serde_json::Value::Number(gv.into()));
        params.insert("b".to_string(), serde_json::Value::Number(bv.into()));
    }
    if let Some(s_id) = scene_id {
        params.insert("sceneId".to_string(), serde_json::Value::Number(s_id.into()));
    }

    let payload = serde_json::json!({
        "method": "setPilot",
        "params": params
    });

    let resp = send_udp_cmd(&ip, &payload).await?;

    // Consulta el estado actualizado inmediatamente y lo emite al frontend.
    if let Ok(state_val) = get_state(ip.clone()).await {
        let event_payload = DeviceStatePayload {
            ip: ip.clone(),
            online: true,
            state: Some(state_val),
        };
        let _ = app.emit("device-state-changed", event_payload);
    }

    Ok(resp)
}
