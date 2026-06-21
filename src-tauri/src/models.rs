use std::collections::HashMap;

/// Modelo principal de configuración persistida en disco (`config.json`).
/// Todos los campos son opcionales o tienen valor por defecto para que
/// la deserialización sea resiliente a campos faltantes en versiones anteriores.
#[derive(serde::Serialize, serde::Deserialize, Default, Clone)]
pub struct AppConfig {
    pub device_names: HashMap<String, String>,
    pub last_ip: Option<String>,
    pub theme: Option<String>,
}

/// Payload emitido como evento Tauri al frontend cuando cambia el estado de un dispositivo.
/// El campo `state` es `None` cuando el dispositivo no responde (offline).
#[derive(serde::Serialize, Clone)]
pub struct DeviceStatePayload {
    pub ip: String,
    pub online: bool,
    pub state: Option<serde_json::Value>,
}
