use std::collections::HashMap;
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

use state::{ActiveDeviceState, ConfigPathState, ConfigState, DeviceMapState, ShutdownSignal};

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

            let initial_mac = initial_config.last_mac.clone();
            let initial_theme = initial_config.theme.clone();

            let shutdown_signal = Arc::new(AtomicBool::new(false));

            // Migrate device_names from old IP keys to MAC keys
            // At startup we don't have a device map yet; migration happens progressively
            // during discovery. Store the config for later use.

            app.manage(ConfigState(std::sync::Mutex::new(initial_config)));
            app.manage(ActiveDeviceState(std::sync::Mutex::new(initial_mac.clone())));
            app.manage(DeviceMapState(std::sync::Mutex::new(HashMap::new())));
            app.manage(ConfigPathState(config_path));
            app.manage(ShutdownSignal(shutdown_signal.clone()));

            // Populate DeviceMapState in background so the monitor resolves the
            // saved device's IP immediately on restart instead of waiting ~60s.
            if initial_mac.is_some() {
                let app_handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    if let Ok(devices) = network::discover_udp().await {
                        if let Ok(mut map) = app_handle.state::<DeviceMapState>().0.lock() {
                            for device in &devices {
                                if let (Some(mac), Some(ip)) = (
                                    device.get("mac").and_then(|m| m.as_str()),
                                    device.get("ip").and_then(|i| i.as_str()),
                                ) {
                                    map.insert(mac.to_string(), ip.to_string());
                                }
                            }
                        }
                    }
                });
            }

            if let Some(window) = app.get_webview_window("main") {
                let is_light = initial_theme
                    .as_deref()
                    .map(|t| t == "light")
                    .unwrap_or(false);
                let color = if is_light {
                    tauri::window::Color(245, 245, 247, 255)
                } else {
                    tauri::window::Color(20, 20, 22, 255)
                };
                let _ = window.set_background_color(Some(color));
            }

            monitor::start_polling(app.handle().clone(), shutdown_signal);

            Ok(())
        })
        .on_window_event(|window, event| {
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
