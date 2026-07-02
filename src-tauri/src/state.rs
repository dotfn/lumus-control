use crate::models::AppConfig;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use std::sync::Mutex;

pub struct ConfigState(pub Mutex<AppConfig>);

/// MACs que el monitor vigila: una sola para un dispositivo individual,
/// varias cuando el usuario selecciona un grupo. Vacío = nada que vigilar.
pub struct ActiveDeviceState(pub Mutex<Vec<String>>);

pub struct DeviceMapState(pub Mutex<HashMap<String, String>>);

pub struct ShutdownSignal(pub Arc<AtomicBool>);

pub struct ConfigPathState(pub PathBuf);
