use std::fs::{self, File};
use std::io::Write;
use std::path::PathBuf;
use tauri::Manager;
use crate::errors::AppError;
use crate::models::AppConfig;

/// Resuelve la ruta al archivo `config.json` dentro del directorio de datos
/// de la aplicación gestionado por Tauri. Crea el directorio si no existe.
pub fn get_config_path(app: &tauri::AppHandle) -> Result<PathBuf, AppError> {
    let mut path = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Config(e.to_string()))?;
    if !path.exists() {
        fs::create_dir_all(&path).map_err(|e| AppError::Config(e.to_string()))?;
    }
    path.push("config.json");
    Ok(path)
}

/// Lee y deserializa la configuración desde disco.
/// Devuelve `AppConfig::default()` si el archivo no existe.
/// Propaga el error si el archivo existe pero el JSON está corrupto,
/// sin sobrescribirlo con un estado vacío.
pub fn read_config(app: &tauri::AppHandle) -> Result<AppConfig, AppError> {
    let path = get_config_path(app)?;
    if !path.exists() {
        return Ok(AppConfig::default());
    }
    let content = fs::read_to_string(&path).map_err(|e| AppError::Config(e.to_string()))?;
    let config: AppConfig =
        serde_json::from_str(&content).map_err(|e| AppError::Config(e.to_string()))?;
    Ok(config)
}

/// Persiste la configuración en disco usando una escritura atómica:
///
/// 1. Serializa `AppConfig` a JSON legible.
/// 2. Escribe el contenido en un archivo temporal `.tmp` en el mismo directorio.
/// 3. Llama a `sync_all()` para garantizar que los datos lleguen al disco físico
///    antes de continuar (previene corrupción por cortes de energía).
/// 4. Aplica permisos restrictivos `0o600` sobre el `.tmp` en sistemas Unix.
/// 5. Renombra el `.tmp` al archivo final `config.json`.
///    `fs::rename` es atómica a nivel de sistema operativo: si el proceso
///    muere entre los pasos 2-4, el archivo original permanece intacto.
pub fn write_config(path: &PathBuf, config: &AppConfig) -> Result<(), AppError> {
    let content =
        serde_json::to_string_pretty(config).map_err(|e| AppError::Config(e.to_string()))?;

    // Construye la ruta del archivo temporal en el mismo directorio que el destino.
    // Usar el mismo directorio es requisito para que `rename` sea atómico:
    // en la mayoría de sistemas, rename entre distintos filesystems no es atómico.
    let tmp_path = path.with_extension("json.tmp");

    // Escribe en el archivo temporal y garantiza el flush a disco físico.
    {
        let mut tmp_file =
            File::create(&tmp_path).map_err(|e| AppError::Config(e.to_string()))?;
        tmp_file
            .write_all(content.as_bytes())
            .map_err(|e| AppError::Config(e.to_string()))?;
        tmp_file
            .sync_all()
            .map_err(|e| AppError::Config(e.to_string()))?;
    } // `tmp_file` se cierra aquí al salir del bloque.

    // Aplica permisos restrictivos antes del rename para que el archivo
    // final herede los permisos correctos desde su creación.
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(metadata) = fs::metadata(&tmp_path) {
            let mut perms = metadata.permissions();
            perms.set_mode(0o600);
            fs::set_permissions(&tmp_path, perms).ok();
        }
    }

    // Rename atómico: reemplaza `config.json` con el `.tmp` ya sincronizado.
    fs::rename(&tmp_path, path).map_err(|e| AppError::Config(e.to_string()))?;

    Ok(())
}
