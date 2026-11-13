use crate::models::AppConfig;
use crate::registry::Registry;
use std::path::PathBuf;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex, MutexGuard};
use tokio::sync::Notify;

pub struct ConfigState(pub Mutex<AppConfig>);

pub struct ConfigPathState(pub PathBuf);

/// Estado compartido entre los comandos IPC y el monitor en segundo plano.
#[derive(Default)]
pub struct Shared {
    registry: Mutex<Registry>,
    /// Despierta al monitor para sondear ya, sin esperar al próximo ciclo.
    pub poll_now: Notify,
    pub shutdown: AtomicBool,
}

impl Shared {
    /// Acceso al registro. Nunca debe mantenerse el guard a través de un
    /// `.await`. Orden de locks cuando se toman ambos: config → registro.
    pub fn registry(&self) -> MutexGuard<'_, Registry> {
        self.registry.lock().unwrap_or_else(|e| e.into_inner())
    }
}

pub struct AppShared(pub Arc<Shared>);
