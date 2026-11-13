use std::sync::atomic::Ordering;
use std::sync::Arc;
use tauri::Manager;

mod commands;
mod config;
mod errors;
mod models;
mod monitor;
mod network;
mod registry;
mod state;

use state::{AppShared, ConfigPathState, ConfigState, Shared};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let config_path = config::get_config_path(app.handle())
                .map_err(|e| e.to_string())?;
            let initial_config = match config::read_config_from_path(&config_path) {
                Ok(cfg) => cfg,
                Err(e) => {
                    log::warn!(
                        "No se pudo leer config.json al iniciar: {}. Se usarán valores por defecto.",
                        e
                    );
                    models::AppConfig::default()
                }
            };

            #[cfg(not(target_os = "macos"))]
            let initial_theme = initial_config.theme.clone();

            // Las lámparas de la sesión anterior se sondean desde el primer
            // ciclo por su última IP, sin esperar a que el discovery las vea.
            let shared = Arc::new(Shared::default());
            {
                let mut registry = shared.registry();
                for (mac, ip) in &initial_config.known_devices {
                    if let Ok(ip) = network::validate_ip(ip) {
                        registry.seed(mac, ip);
                    }
                }
            }

            app.manage(ConfigState(std::sync::Mutex::new(initial_config)));
            app.manage(ConfigPathState(config_path));
            app.manage(AppShared(shared.clone()));

            // En macOS la ventana es translúcida (material nativo detrás del
            // webview); pintarle un color de fondo lo taparía.
            #[cfg(not(target_os = "macos"))]
            if let Some(window) = app.get_webview_window("main") {
                let is_light = initial_theme
                    .as_deref()
                    .map(|t| t == "light")
                    .unwrap_or(false);
                let color = if is_light {
                    tauri::window::Color(255, 255, 255, 255)
                } else {
                    tauri::window::Color(30, 30, 32, 255)
                };
                let _ = window.set_background_color(Some(color));
            }

            monitor::start(app.handle().clone(), shared);

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let shared = window.app_handle().state::<AppShared>();
                shared.0.shutdown.store(true, Ordering::Relaxed);
                shared.0.poll_now.notify_one();
                log::info!("Señal de apagado enviada al monitor de dispositivos.");
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_devices,
            commands::discover,
            commands::refresh,
            commands::add_device_by_ip,
            commands::control,
            commands::get_device_names,
            commands::save_device_name,
            commands::get_preferences,
            commands::save_preferences,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
