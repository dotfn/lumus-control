use serde_json::Value;
use std::collections::HashMap;

use crate::config::{migrate_device_names, write_json_string};
use crate::errors::AppError;
use crate::models::AppConfig;
use crate::network::{discover_udp, extract_mac, send_udp_cmd};
use crate::state::{ActiveDeviceState, ConfigPathState, ConfigState, DeviceMapState};

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
    config_path_state: tauri::State<'_, ConfigPathState>,
    config_state: tauri::State<'_, ConfigState>,
    device_map: tauri::State<'_, DeviceMapState>,
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

    let path = config_path_state.0.clone();
    let json = {
        let mut config = config_state
            .0
            .lock()
            .map_err(|e| AppError::Config(e.to_string()))?;

        let map = device_map
            .0
            .lock()
            .map_err(|e| AppError::Config(e.to_string()))?;
        migrate_device_names(&mut config.device_names, &map);

        config.device_names.insert(mac, name);
        serde_json::to_string_pretty(&*config)
            .map_err(|e| AppError::Config(e.to_string()))?
    };
    tokio::task::spawn_blocking(move || write_json_string(&path, &json))
        .await
        .map_err(|e| AppError::Config(e.to_string()))?
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
    config_path_state: tauri::State<'_, ConfigPathState>,
    config_state: tauri::State<'_, ConfigState>,
    active_device: tauri::State<'_, ActiveDeviceState>,
    device_map: tauri::State<'_, DeviceMapState>,
    last_mac: Option<String>,
    theme: Option<String>,
) -> Result<(), AppError> {
    let path = config_path_state.0.clone();

    // Lock order: config_state → active_device → device_map. All commands acquiring
    // multiple locks MUST respect this order to prevent deadlocks under concurrency.
    let json = {
        let mut config = config_state
            .0
            .lock()
            .map_err(|e| AppError::Config(e.to_string()))?;

        if let Some(ref mac) = last_mac {
            config.last_mac = Some(mac.clone());
            let mut device_lock = active_device
                .0
                .lock()
                .map_err(|e| AppError::Config(e.to_string()))?;
            *device_lock = Some(mac.clone());
        }

        if let Some(ref t) = theme {
            if t != "light" && t != "dark" {
                return Err(AppError::Validation(format!(
                    "Tema inválido: '{}'. Debe ser 'light' o 'dark'.",
                    t
                )));
            }
            config.theme = Some(t.clone());
        }

        let map = device_map
            .0
            .lock()
            .map_err(|e| AppError::Config(e.to_string()))?;
        migrate_device_names(&mut config.device_names, &map);

        serde_json::to_string_pretty(&*config)
            .map_err(|e| AppError::Config(e.to_string()))?
    };

    tokio::task::spawn_blocking(move || write_json_string(&path, &json))
        .await
        .map_err(|e| AppError::Config(e.to_string()))?
}

#[tauri::command]
pub async fn discover(
    device_map: tauri::State<'_, DeviceMapState>,
) -> Result<Value, AppError> {
    let devices = discover_udp().await?;

    // Update the device map (MAC -> IP) with discovered devices
    {
        let mut map = device_map
            .0
            .lock()
            .map_err(|e| AppError::Config(e.to_string()))?;
        for device in &devices {
            if let (Some(mac), Some(ip)) = (
                device.get("mac").and_then(|m| m.as_str()),
                device.get("ip").and_then(|i| i.as_str()),
            ) {
                map.insert(mac.to_string(), ip.to_string());
            }
        }
    }

    Ok(serde_json::json!(devices))
}

#[tauri::command]
pub async fn get_state(
    ip: String,
    device_map: tauri::State<'_, DeviceMapState>,
) -> Result<Value, AppError> {
    let payload = serde_json::json!({
        "method": "getPilot",
        "params": {}
    });
    let resp = send_udp_cmd(&ip, &payload).await?;

    if let Some(mac) = extract_mac(&resp) {
        let mut map = device_map
            .0
            .lock()
            .map_err(|e| AppError::Config(e.to_string()))?;
        map.insert(mac, ip.clone());
    }

    Ok(resp
        .get("result")
        .cloned()
        .unwrap_or(serde_json::Value::Null))
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn control(
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
        if !(10..=100).contains(&d) {
            return Err(AppError::Validation(
                "El brillo debe estar entre 10 y 100".to_string(),
            ));
        }
    }
    if let Some(t) = temp {
        if !(2200..=6500).contains(&t) {
            return Err(AppError::Validation(
                "La temperatura debe estar entre 2200K y 6500K".to_string(),
            ));
        }
    }
    if let Some(s_id) = scene_id {
        if !(1..=32).contains(&s_id) {
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
        params.insert(
            "sceneId".to_string(),
            serde_json::Value::Number(s_id.into()),
        );
    }

    let payload = serde_json::json!({
        "method": "setPilot",
        "params": params
    });

    let resp = send_udp_cmd(&ip, &payload).await?;
    // The monitor emits the confirmed state in the next poll cycle (~5s).
    // A second getPilot round-trip here is redundant given optimistic UI updates.
    Ok(resp)
}
