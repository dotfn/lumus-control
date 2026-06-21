/// Enumeración central de errores del backend.
/// Todos los módulos deben convertir sus errores nativos a este tipo
/// para que la propagación sea uniforme hasta el frontend IPC.
#[derive(Debug)]
#[allow(dead_code)]
pub enum AppError {
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
