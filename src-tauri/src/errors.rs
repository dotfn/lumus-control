/// Enumeración central de errores del backend.
/// Todos los módulos deben convertir sus errores nativos a este tipo
/// para que la propagación sea uniforme hasta el frontend IPC.
#[derive(Debug)]
#[allow(dead_code)]
pub enum AppError {
    /// La lámpara no respondió o la red no está disponible.
    Network(String),
    /// La lámpara respondió, pero rechazó el comando.
    Device(String),
    Config(String),
    Validation(String),
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AppError::Network(_) => write!(f, "Error de comunicación con la lámpara"),
            AppError::Device(_) => write!(f, "La lámpara rechazó el comando"),
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

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}
