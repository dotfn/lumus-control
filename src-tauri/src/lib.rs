use std::net::{IpAddr, UdpSocket};
use std::time::Duration;
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

// Struct to represent app configuration
#[derive(serde::Serialize, serde::Deserialize, Default, Clone)]
struct AppConfig {
    device_names: HashMap<String, String>,
}

fn get_config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let mut path = app.path().app_data_dir().map_err(|e| e.to_string())?;
    if !path.exists() {
        fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }
    path.push("config.json");
    Ok(path)
}

#[tauri::command]
fn get_device_names(app: tauri::AppHandle) -> Result<HashMap<String, String>, String> {
    let path = get_config_path(&app)?;
    if !path.exists() {
        return Ok(HashMap::new());
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let config: AppConfig = serde_json::from_str(&content).unwrap_or_default();
    Ok(config.device_names)
}

#[tauri::command]
fn save_device_name(app: tauri::AppHandle, ip: String, name: String) -> Result<(), String> {
    validate_ip(&ip)?;
    let path = get_config_path(&app)?;
    let mut config = if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        AppConfig::default()
    };
    
    config.device_names.insert(ip, name);
    
    let content = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}

fn validate_ip(ip: &str) -> Result<IpAddr, String> {
    ip.parse::<IpAddr>()
        .map_err(|_| format!("Dirección IP inválida: {}", ip))
}

fn send_udp_cmd(ip: &str, payload: &Value) -> Result<Value, String> {
    validate_ip(ip)?;
    let socket = UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
    socket.set_read_timeout(Some(Duration::from_millis(1500))).map_err(|e| e.to_string())?;
    
    let dest = format!("{}:38899", ip);
    let msg = serde_json::to_string(payload).map_err(|e| e.to_string())?;
    
    socket.send_to(msg.as_bytes(), &dest).map_err(|e| e.to_string())?;
    
    let mut buf = [0; 2048];
    let (amt, _) = socket.recv_from(&mut buf).map_err(|e| e.to_string())?;
    
    let resp: Value = serde_json::from_slice(&buf[..amt]).map_err(|e| e.to_string())?;
    Ok(resp)
}

fn discover_udp() -> Result<Vec<Value>, String> {
    let socket = UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;
    socket.set_broadcast(true).map_err(|e| e.to_string())?;
    socket.set_read_timeout(Some(Duration::from_millis(2000))).map_err(|e| e.to_string())?;

    let payload = serde_json::json!({
        "method": "getPilot",
        "params": {}
    });
    let msg = payload.to_string();
    
    socket.send_to(msg.as_bytes(), "255.255.255.255:38899").map_err(|e| e.to_string())?;

    let mut found = Vec::new();
    let mut buf = [0; 2048];
    
    loop {
        match socket.recv_from(&mut buf) {
            Ok((amt, src)) => {
                if let Ok(resp) = serde_json::from_slice::<Value>(&buf[..amt]) {
                    found.push(serde_json::json!({
                        "ip": src.ip().to_string(),
                        "state": resp.get("result").unwrap_or(&serde_json::Value::Null)
                    }));
                }
            }
            Err(_) => break, // Timeout reached (end of scan)
        }
    }
    
    Ok(found)
}

#[tauri::command]
fn discover() -> Result<Value, String> {
    let devices = discover_udp()?;
    Ok(serde_json::json!(devices))
}

#[tauri::command]
fn get_state(ip: String) -> Result<Value, String> {
    let payload = serde_json::json!({
        "method": "getPilot",
        "params": {}
    });
    let resp = send_udp_cmd(&ip, &payload)?;
    Ok(resp.get("result").cloned().unwrap_or(serde_json::Value::Null))
}

#[tauri::command]
fn control(
    ip: String,
    state: Option<bool>,
    dimming: Option<u8>,
    temp: Option<u16>,
    r: Option<u8>,
    g: Option<u8>,
    b: Option<u8>,
    scene_id: Option<u8>,
) -> Result<Value, String> {
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
    
    let resp = send_udp_cmd(&ip, &payload)?;
    Ok(resp)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        discover,
        get_state,
        control,
        get_device_names,
        save_device_name
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
