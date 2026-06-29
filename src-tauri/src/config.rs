use crate::errors::AppError;
use crate::models::{AppConfig, MigratedConfig};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::Write;
use std::path::PathBuf;
use tauri::Manager;

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

pub fn read_config_from_path(path: &PathBuf) -> Result<AppConfig, AppError> {
    if !path.exists() {
        return Ok(AppConfig::default());
    }
    let content = fs::read_to_string(path).map_err(|e| AppError::Config(e.to_string()))?;
    let migrated: MigratedConfig = serde_json::from_str(&content)
        .map_err(|e| AppError::Config(e.to_string()))?;
    Ok(migrated.into_app_config())
}

#[cfg_attr(not(test), allow(dead_code))]
pub fn write_config(path: &PathBuf, config: &AppConfig) -> Result<(), AppError> {
    let json = serde_json::to_string_pretty(config)
        .map_err(|e| AppError::Config(e.to_string()))?;
    write_json_string(path, &json)
}

pub fn write_json_string(path: &PathBuf, json: &str) -> Result<(), AppError> {
    let tmp_path = path.with_extension("json.tmp");

    {
        let mut tmp_file = File::create(&tmp_path).map_err(|e| AppError::Config(e.to_string()))?;
        tmp_file
            .write_all(json.as_bytes())
            .map_err(|e| AppError::Config(e.to_string()))?;
        tmp_file
            .sync_all()
            .map_err(|e| AppError::Config(e.to_string()))?;
    }

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(metadata) = fs::metadata(&tmp_path) {
            let mut perms = metadata.permissions();
            perms.set_mode(0o600);
            fs::set_permissions(&tmp_path, perms).ok();
        }
    }

    fs::rename(&tmp_path, path).map_err(|e| AppError::Config(e.to_string()))?;
    Ok(())
}

pub fn migrate_device_names(
    names: &mut HashMap<String, String>,
    mac_to_ip: &HashMap<String, String>,
) -> bool {
    // Invert MAC→IP to IP→MAC for lookup
    let ip_to_mac: HashMap<&str, &str> = mac_to_ip
        .iter()
        .map(|(mac, ip)| (ip.as_str(), mac.as_str()))
        .collect();

    let mut changed = false;
    // Only IPv4 keys have dots; MACs use ':' but not '.', so this filter is safe
    let ip_keys: Vec<String> = names.keys()
        .filter(|k| k.contains('.'))
        .cloned()
        .collect();

    for ip in ip_keys {
        if let Some(&mac) = ip_to_mac.get(ip.as_str()) {
            if !names.contains_key(mac) {
                if let Some(name) = names.remove(&ip) {
                    names.insert(mac.to_string(), name);
                    changed = true;
                }
            } else {
                names.remove(&ip);
                changed = true;
            }
        }
    }

    changed
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU32, Ordering};

    static TEST_COUNTER: AtomicU32 = AtomicU32::new(0);

    fn unique_test_path(name: &str) -> PathBuf {
        let mut path = std::env::temp_dir();
        let id = TEST_COUNTER.fetch_add(1, Ordering::Relaxed);
        path.push(format!("lumus_control_test_{}_{}.json", name, id));
        let _ = fs::remove_file(&path);
        let _ = fs::remove_file(path.with_extension("json.tmp"));
        path
    }

    #[test]
    fn read_config_returns_default_when_file_missing() {
        let path = unique_test_path("missing");
        let config = read_config_from_path(&path).unwrap();
        assert!(config.device_names.is_empty());
        assert!(config.last_mac.is_none());
        assert!(config.theme.is_none());
    }

    #[test]
    fn migrate_last_ip_to_last_mac() {
        let path = unique_test_path("migrate_ip");
        let old_config = serde_json::json!({
            "device_names": {},
            "last_ip": "192.168.1.42",
            "theme": "dark"
        });
        fs::write(&path, old_config.to_string()).unwrap();

        let config = read_config_from_path(&path).unwrap();
        assert_eq!(config.last_mac, Some("192.168.1.42".to_string()));
        assert_eq!(config.theme, Some("dark".to_string()));

        fs::remove_file(&path).ok();
    }

    #[test]
    fn write_and_read_roundtrip() {
        let path = unique_test_path("roundtrip");
        let mut config = AppConfig {
            last_mac: Some("AA:BB:CC:DD:EE:FF".to_string()),
            theme: Some("dark".to_string()),
            ..Default::default()
        };
        config
            .device_names
            .insert("AA:BB:CC:DD:EE:FF".to_string(), "Escritorio".to_string());

        write_config(&path, &config).unwrap();

        let loaded = read_config_from_path(&path).unwrap();
        assert_eq!(loaded.last_mac, Some("AA:BB:CC:DD:EE:FF".to_string()));
        assert_eq!(loaded.theme, Some("dark".to_string()));
        assert_eq!(
            loaded.device_names.get("AA:BB:CC:DD:EE:FF"),
            Some(&"Escritorio".to_string())
        );

        fs::remove_file(&path).ok();
    }

    #[test]
    fn migrate_device_names_works() {
        let mut names = HashMap::new();
        names.insert("192.168.1.10".to_string(), "Living".to_string());
        names.insert("192.168.1.20".to_string(), "Cocina".to_string());
        names.insert("AA:BB:CC:DD:EE:11".to_string(), "Dormitorio".to_string());

        // mac_to_ip mirrors DeviceMapState (MAC→IP)
        let mut mac_to_ip = HashMap::new();
        mac_to_ip.insert("AA:BB:CC:DD:EE:10".to_string(), "192.168.1.10".to_string());
        mac_to_ip.insert("AA:BB:CC:DD:EE:20".to_string(), "192.168.1.20".to_string());

        let changed = migrate_device_names(&mut names, &mac_to_ip);
        assert!(changed);
        assert_eq!(names.get("AA:BB:CC:DD:EE:10"), Some(&"Living".to_string()));
        assert_eq!(names.get("AA:BB:CC:DD:EE:20"), Some(&"Cocina".to_string()));
        assert_eq!(names.get("AA:BB:CC:DD:EE:11"), Some(&"Dormitorio".to_string()));
        assert!(!names.contains_key("192.168.1.10"));
        assert!(!names.contains_key("192.168.1.20"));
        assert_eq!(names.len(), 3);
    }

    #[test]
    fn migrate_device_names_does_not_corrupt_mac_keys() {
        // MAC keys must NOT be treated as IP keys and must survive unchanged
        let mut names = HashMap::new();
        names.insert("AA:BB:CC:DD:EE:FF".to_string(), "Sala".to_string());

        let mut mac_to_ip = HashMap::new();
        mac_to_ip.insert("AA:BB:CC:DD:EE:FF".to_string(), "192.168.1.10".to_string());

        let changed = migrate_device_names(&mut names, &mac_to_ip);
        assert!(!changed);
        assert_eq!(names.get("AA:BB:CC:DD:EE:FF"), Some(&"Sala".to_string()));
        assert_eq!(names.len(), 1);
    }

    #[test]
    fn write_config_is_atomic_cleanup() {
        let path = unique_test_path("atomic_cleanup");
        let config = AppConfig::default();

        write_config(&path, &config).unwrap();

        let tmp_path = path.with_extension("json.tmp");
        assert!(!tmp_path.exists());
        assert!(path.exists());

        fs::remove_file(&path).ok();
    }

    #[test]
    fn read_config_propagates_corrupt_json() {
        let path = unique_test_path("corrupt");
        fs::write(&path, "{corrupt json}").unwrap();

        let result = read_config_from_path(&path);
        assert!(result.is_err());

        fs::remove_file(&path).ok();
    }

    #[test]
    fn write_config_empty_device_names() {
        let path = unique_test_path("empty");
        let config = AppConfig::default();

        write_config(&path, &config).unwrap();

        let loaded = read_config_from_path(&path).unwrap();
        assert!(loaded.device_names.is_empty());
        assert!(loaded.last_mac.is_none());

        fs::remove_file(&path).ok();
    }
}
