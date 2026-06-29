use crate::models::AppConfig;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use std::sync::Mutex;

pub struct ConfigState(pub Mutex<AppConfig>);

pub struct ActiveDeviceState(pub Mutex<Option<String>>);

pub struct DeviceMapState(pub Mutex<HashMap<String, String>>);

pub struct ShutdownSignal(pub Arc<AtomicBool>);

pub struct ConfigPathState(pub PathBuf);
