use std::net::{IpAddr, UdpSocket};
use std::time::Duration;
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{Manager, Emitter};

#[derive(serde::Serialize, Clone)]
struct DeviceStatePayload {
    ip: String,
    online: bool,
    state: Option<serde_json::Value>,
}

struct ActiveDevice(std::sync::Mutex<Option<String>>);

#[derive(Debug)]
#[allow(dead_code)]
enum AppError {
    Network(String),
    Config(String),
    Validation(String),
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppError::Network(_) => write!(f, "Error de comunicación con la lámpara"),
            AppError::Config(_) => write!(f, "Error de configuración interna"),
            AppError::Validation(msg) => write!(f, "{}", msg),
        }
    }
}

impl From<AppError> for String {
    fn from(e: AppError) -> String {
        e.to_string()
    }
}

impl From<AppError> for tauri::ipc::InvokeError {
    fn from(e: AppError) -> Self {
        tauri::ipc::InvokeError::from(e.to_string())
    }
}

#[derive(serde::Serialize, serde::Deserialize, Default, Clone)]
struct AppConfig {
    device_names: HashMap<String, String>,
    last_ip: Option<String>,
}

fn get_config_path(app: &tauri::AppHandle) -> Result<PathBuf, AppError> {
    let mut path = app.path().app_data_dir().map_err(|e| AppError::Config(e.to_string()))?;
    if !path.exists() {
        fs::create_dir_all(&path).map_err(|e| AppError::Config(e.to_string()))?;
    }
    path.push("config.json");
    Ok(path)
}

#[tauri::command]
fn get_device_names(app: tauri::AppHandle) -> Result<HashMap<String, String>, AppError> {
    let path = get_config_path(&app)?;
    if !path.exists() {
        return Ok(HashMap::new());
    }
    let content = fs::read_to_string(&path).map_err(|e| AppError::Config(e.to_string()))?;
    let config: AppConfig = serde_json::from_str(&content).unwrap_or_default();
    Ok(config.device_names)
}

#[tauri::command]
fn save_device_name(app: tauri::AppHandle, ip: String, name: String) -> Result<(), AppError> {
    validate_ip(&ip)?;
    if ip.len() > 45 {
        return Err(AppError::Validation("La dirección IP no puede superar los 45 caracteres".to_string()));
    }
    if name.len() > 256 {
        return Err(AppError::Validation("El nombre del dispositivo no puede superar los 256 caracteres".to_string()));
    }
    let path = get_config_path(&app)?;
    let mut config = if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| AppError::Config(e.to_string()))?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        AppConfig::default()
    };

    config.device_names.insert(ip, name);

    let content = serde_json::to_string_pretty(&config).map_err(|e| AppError::Config(e.to_string()))?;
    fs::write(&path, content).map_err(|e| AppError::Config(e.to_string()))?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(metadata) = fs::metadata(&path) {
            let mut perms = metadata.permissions();
            perms.set_mode(0o600);
            fs::set_permissions(&path, perms).ok();
        }
    }

    Ok(())
}

fn validate_ip(ip: &str) -> Result<IpAddr, AppError> {
    ip.parse::<IpAddr>()
        .map_err(|_| AppError::Validation(format!("Dirección IP inválida: {}", ip)))
}

fn send_udp_cmd(ip: &str, payload: &Value) -> Result<Value, AppError> {
    validate_ip(ip)?;
    let socket = UdpSocket::bind("0.0.0.0:0").map_err(|e| AppError::Network(e.to_string()))?;
    socket.set_read_timeout(Some(Duration::from_millis(1500))).map_err(|e| AppError::Network(e.to_string()))?;

    let dest = format!("{}:38899", ip);
    let msg = serde_json::to_string(payload).map_err(|e| AppError::Network(e.to_string()))?;

    socket.send_to(msg.as_bytes(), &dest).map_err(|e| AppError::Network(e.to_string()))?;

    let mut buf = [0; 4096];
    let (amt, _) = socket.recv_from(&mut buf).map_err(|e| AppError::Network(e.to_string()))?;

    let resp: Value = serde_json::from_slice(&buf[..amt]).map_err(|e| AppError::Network(e.to_string()))?;
    Ok(resp)
}

fn discover_udp() -> Result<Vec<Value>, AppError> {
    let socket = UdpSocket::bind("0.0.0.0:0").map_err(|e| AppError::Network(e.to_string()))?;
    socket.set_broadcast(true).map_err(|e| AppError::Network(e.to_string()))?;
    socket.set_read_timeout(Some(Duration::from_millis(2000))).map_err(|e| AppError::Network(e.to_string()))?;

    let payload = serde_json::json!({
        "method": "getPilot",
        "params": {}
    });
    let msg = payload.to_string();

    socket.send_to(msg.as_bytes(), "255.255.255.255:38899").map_err(|e| AppError::Network(e.to_string()))?;

    let mut found = Vec::new();
    let mut buf = [0; 4096];

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
            Err(_) => break,
        }
    }

    Ok(found)
}

#[tauri::command]
fn get_preferences(app: tauri::AppHandle) -> Result<AppConfig, AppError> {
    let path = get_config_path(&app)?;
    if !path.exists() {
        return Ok(AppConfig::default());
    }
    let content = fs::read_to_string(&path).map_err(|e| AppError::Config(e.to_string()))?;
    let config: AppConfig = serde_json::from_str(&content).unwrap_or_default();
    Ok(config)
}

#[tauri::command]
fn save_preferences(
    app: tauri::AppHandle,
    active_device: tauri::State<'_, ActiveDevice>,
    last_ip: Option<String>,
) -> Result<(), AppError> {
    let path = get_config_path(&app)?;
    let mut config = if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| AppError::Config(e.to_string()))?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        AppConfig::default()
    };

    if let Some(ref ip) = last_ip {
        config.last_ip = Some(ip.clone());
        
        if let Ok(mut lock) = active_device.0.lock() {
            *lock = Some(ip.clone());
        }
    }

    let content = serde_json::to_string_pretty(&config).map_err(|e| AppError::Config(e.to_string()))?;
    fs::write(&path, content).map_err(|e| AppError::Config(e.to_string()))?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(metadata) = fs::metadata(&path) {
            let mut perms = metadata.permissions();
            perms.set_mode(0o600);
            fs::set_permissions(&path, perms).ok();
        }
    }

    Ok(())
}

#[tauri::command]
fn discover() -> Result<Value, AppError> {
    let devices = discover_udp()?;
    Ok(serde_json::json!(devices))
}

#[tauri::command]
fn get_state(ip: String) -> Result<Value, AppError> {
    let payload = serde_json::json!({
        "method": "getPilot",
        "params": {}
    });
    let resp = send_udp_cmd(&ip, &payload)?;
    Ok(resp.get("result").cloned().unwrap_or(serde_json::Value::Null))
}

#[tauri::command]
fn control(
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
            return Err(AppError::Validation("El brillo debe estar entre 10 y 100".to_string()));
        }
    }
    if let Some(t) = temp {
        if t < 2200 || t > 6500 {
            return Err(AppError::Validation("La temperatura debe estar entre 2200K y 6500K".to_string()));
        }
    }
    if let Some(s_id) = scene_id {
        if s_id < 1 || s_id > 32 {
            return Err(AppError::Validation("El ID de escena debe estar entre 1 y 32".to_string()));
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

    let resp = send_udp_cmd(&ip, &payload)?;
    
    // Query state immediately after successful control command and emit event
    if let Ok(state_val) = get_state(ip.clone()) {
        let event_payload = DeviceStatePayload {
            ip: ip.clone(),
            online: true,
            state: Some(state_val),
        };
        let _ = app.emit("device-state-changed", event_payload);
    }

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

      let mut initial_ip = None;
      if let Ok(path) = get_config_path(app.handle()) {
        if path.exists() {
          if let Ok(content) = fs::read_to_string(&path) {
            let config: AppConfig = serde_json::from_str(&content).unwrap_or_default();
            initial_ip = config.last_ip;
          }
        }
      }

      let shutdown = Arc::new(AtomicBool::new(false));
      app.manage(shutdown.clone());
      app.manage(ActiveDevice(std::sync::Mutex::new(initial_ip)));

      let app_handle = app.handle().clone();
      std::thread::spawn(move || {
        while !shutdown.load(Ordering::Relaxed) {
          std::thread::sleep(Duration::from_secs(5));
          
          if shutdown.load(Ordering::Relaxed) {
            break;
          }

          let ip_opt = {
            let state = app_handle.state::<ActiveDevice>();
            let lock = state.0.lock();
            match lock {
              Ok(guard) => guard.clone(),
              Err(poisoned) => {
                let guard = poisoned.into_inner();
                guard.clone()
              }
            }
          };

          if let Some(ip) = ip_opt {
            let payload = serde_json::json!({
              "method": "getPilot",
              "params": {}
            });
            let result = send_udp_cmd(&ip, &payload);
            let event_payload = match result {
              Ok(resp) => {
                let state_val = resp.get("result").cloned().unwrap_or(serde_json::Value::Null);
                DeviceStatePayload {
                  ip: ip.clone(),
                  online: true,
                  state: Some(state_val),
                }
              }
              Err(_) => {
                DeviceStatePayload {
                  ip: ip.clone(),
                  online: false,
                  state: None,
                }
              }
            };
            let _ = app_handle.emit("device-state-changed", event_payload);
          }
        }
      });

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        discover,
        get_state,
        control,
        get_device_names,
        save_device_name,
        get_preferences,
        save_preferences
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
