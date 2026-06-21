use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::Manager;

mod commands;
mod config;
mod errors;
mod models;
mod monitor;
mod network;
mod state;

use state::{ActiveDeviceState, ConfigState, ShutdownSignal};

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

            // Carga la configuración inicial desde disco.
            // - Si el archivo no existe: usa valores por defecto.
            // - Si el archivo está corrupto: registra un warning y usa valores por defecto.
            let initial_config = match config::read_config(app.handle()) {
                Ok(cfg) => cfg,
                Err(e) => {
                    log::warn!(
                        "No se pudo leer config.json al iniciar: {}. Se usarán valores por defecto.",
                        e
                    );
                    models::AppConfig::default()
                }
            };

            let initial_ip = initial_config.last_ip.clone();
            let initial_theme = initial_config.theme.clone();

            // Registra los tres estados granulares de forma independiente.
            app.manage(ConfigState(std::sync::Mutex::new(initial_config)));
            app.manage(ActiveDeviceState(std::sync::Mutex::new(initial_ip)));
            app.manage(ShutdownSignal(Arc::new(AtomicBool::new(false))));

            // Establece el color de fondo de la ventana según el tema guardado,
            // evitando el parpadeo de color al inicio.
            if let Some(window) = app.get_webview_window("main") {
                let is_light = initial_theme
                    .as_deref()
                    .map(|t| t == "light")
                    .unwrap_or(false);
                let color = if is_light {
                    tauri::window::Color(245, 245, 247, 255) // `#f5f5f7`
                } else {
                    tauri::window::Color(20, 20, 22, 255) // `#141416`
                };
                let _ = window.set_background_color(Some(color));
            }

            // Recupera la señal de apagado ya registrada y arranca el monitor asíncrono.
            let shutdown = app.state::<ShutdownSignal>().0.clone();
            monitor::start_polling(app.handle().clone(), shutdown);

            Ok(())
        })
        .on_window_event(|window, event| {
            // Cuando el usuario cierra la ventana, activa la señal de apagado
            // para que el monitor asíncrono salga limpiamente en su próxima iteración.
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let shutdown = window.app_handle().state::<ShutdownSignal>();
                shutdown.0.store(true, Ordering::Relaxed);
                log::info!("Señal de apagado enviada al monitor de dispositivo.");
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::discover,
            commands::get_state,
            commands::control,
            commands::get_device_names,
            commands::save_device_name,
            commands::get_preferences,
            commands::save_preferences,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
