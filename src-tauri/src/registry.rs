use crate::models::{DeviceSnapshot, LightState, PilotPatch};
use std::collections::HashMap;
use std::net::IpAddr;

/// Sondeos fallidos seguidos antes de dar una lámpara por desconectada. Uno
/// solo no alcanza: cada sondeo ya retransmite, pero el Wi-Fi tiene baches.
const OFFLINE_THRESHOLD: u32 = 2;

#[derive(Default)]
struct Entry {
    ip: Option<IpAddr>,
    state: Option<LightState>,
    online: bool,
    failures: u32,
    rssi: Option<i32>,
    /// Cambia cada vez que un comando empieza o termina. Un sondeo cuya
    /// respuesta llega con otro valor leyó el estado previo al comando y no
    /// debe pisar lo que el usuario acaba de pedir.
    seq: u64,
    inflight: u32,
}

impl Entry {
    fn snapshot(&self, mac: &str) -> DeviceSnapshot {
        DeviceSnapshot {
            mac: mac.to_string(),
            ip: self.ip.map(|ip| ip.to_string()),
            online: self.online,
            state: self.state.clone(),
            rssi: self.rssi,
        }
    }
}

pub struct PollTarget {
    pub mac: String,
    pub ip: IpAddr,
    pub seq: u64,
    pub online: bool,
}

pub enum CommandResult<'a> {
    /// La lámpara confirmó el comando.
    Applied(&'a PilotPatch),
    /// La lámpara respondió pero no aceptó el comando: sigue en línea.
    Rejected,
    /// No hubo respuesta tras todas las retransmisiones.
    Unreachable,
}

/// Fuente única de verdad sobre las lámparas: dirección, conectividad y último
/// estado conocido de cada una, indexadas por MAC. Toda mutación devuelve las
/// fotos de los dispositivos que cambiaron, listas para emitirse al frontend.
#[derive(Default)]
pub struct Registry {
    devices: HashMap<String, Entry>,
}

impl Registry {
    /// Carga una lámpara conocida de una sesión anterior, aún sin confirmar.
    pub fn seed(&mut self, mac: &str, ip: IpAddr) {
        self.devices.entry(mac.to_string()).or_default().ip = Some(ip);
    }

    pub fn is_empty(&self) -> bool {
        self.devices.is_empty()
    }

    pub fn has_unreachable(&self) -> bool {
        self.devices.values().any(|e| !e.online)
    }

    pub fn snapshot(&self, mac: &str) -> Option<DeviceSnapshot> {
        self.devices.get(mac).map(|e| e.snapshot(mac))
    }

    pub fn snapshots(&self) -> Vec<DeviceSnapshot> {
        let mut all: Vec<_> = self
            .devices
            .iter()
            .map(|(mac, e)| e.snapshot(mac))
            .collect();
        all.sort_by(|a, b| a.mac.cmp(&b.mac));
        all
    }

    /// Mapa MAC → IP de las lámparas con dirección conocida.
    pub fn address_map(&self) -> HashMap<String, String> {
        self.devices
            .iter()
            .filter_map(|(mac, e)| e.ip.map(|ip| (mac.clone(), ip.to_string())))
            .collect()
    }

    pub fn poll_targets(&self) -> Vec<PollTarget> {
        self.devices
            .iter()
            .filter_map(|(mac, e)| {
                e.ip.map(|ip| PollTarget {
                    mac: mac.clone(),
                    ip,
                    seq: e.seq,
                    online: e.online,
                })
            })
            .collect()
    }

    /// Aplica `f` sobre los dispositivos y devuelve los que quedaron distintos.
    fn mutate(&mut self, f: impl FnOnce(&mut HashMap<String, Entry>)) -> Vec<DeviceSnapshot> {
        let before: HashMap<String, DeviceSnapshot> = self
            .devices
            .iter()
            .map(|(mac, e)| (mac.clone(), e.snapshot(mac)))
            .collect();
        f(&mut self.devices);
        let mut changed: Vec<_> = self
            .devices
            .iter()
            .map(|(mac, e)| e.snapshot(mac))
            .filter(|snap| before.get(&snap.mac) != Some(snap))
            .collect();
        changed.sort_by(|a, b| a.mac.cmp(&b.mac));
        changed
    }

    /// Una lámpara se anunció por su cuenta (discovery, push o alta manual).
    /// Si su IP figuraba a nombre de otra MAC, esa otra queda sin dirección:
    /// el router reasignó la IP y hay que redescubrirla.
    pub fn observe(
        &mut self,
        mac: &str,
        ip: IpAddr,
        state: Option<LightState>,
        rssi: Option<i32>,
    ) -> Vec<DeviceSnapshot> {
        self.mutate(|devices| {
            for (other_mac, other) in devices.iter_mut() {
                if other_mac != mac && other.ip == Some(ip) {
                    other.ip = None;
                    other.online = false;
                }
            }
            let entry = devices.entry(mac.to_string()).or_default();
            entry.ip = Some(ip);
            entry.online = true;
            entry.failures = 0;
            if rssi.is_some() {
                entry.rssi = rssi;
            }
            if let Some(state) = state {
                if entry.inflight == 0 {
                    entry.state = Some(state);
                }
            }
        })
    }

    /// Respuesta a un sondeo. `seq` es el valor que tenía el dispositivo al
    /// enviar el getPilot.
    pub fn poll_ok(
        &mut self,
        mac: &str,
        ip: IpAddr,
        seq: u64,
        state: LightState,
        rssi: Option<i32>,
    ) -> Vec<DeviceSnapshot> {
        self.mutate(|devices| {
            let Some(entry) = devices.get_mut(mac).filter(|e| e.ip == Some(ip)) else {
                return;
            };
            entry.online = true;
            entry.failures = 0;
            if rssi.is_some() {
                entry.rssi = rssi;
            }
            if entry.seq == seq && entry.inflight == 0 {
                entry.state = Some(state);
            }
        })
    }

    pub fn poll_failed(&mut self, mac: &str, ip: IpAddr) -> Vec<DeviceSnapshot> {
        self.mutate(|devices| {
            let Some(entry) = devices.get_mut(mac).filter(|e| e.ip == Some(ip)) else {
                return;
            };
            entry.failures = entry.failures.saturating_add(1);
            if entry.failures >= OFFLINE_THRESHOLD {
                entry.online = false;
            }
        })
    }

    /// Marca el inicio de un comando y devuelve a dónde enviarlo, junto con si
    /// la lámpara estaba en línea. `None` si no se conoce su dirección.
    pub fn begin_command(&mut self, mac: &str) -> Option<(IpAddr, bool)> {
        let entry = self.devices.get_mut(mac)?;
        let ip = entry.ip?;
        entry.seq += 1;
        entry.inflight += 1;
        Some((ip, entry.online))
    }

    pub fn end_command(&mut self, mac: &str, result: CommandResult) -> Vec<DeviceSnapshot> {
        self.mutate(|devices| {
            let Some(entry) = devices.get_mut(mac) else {
                return;
            };
            entry.seq += 1;
            entry.inflight = entry.inflight.saturating_sub(1);
            match result {
                CommandResult::Applied(patch) => {
                    entry.online = true;
                    entry.failures = 0;
                    entry
                        .state
                        .get_or_insert_with(|| LightState {
                            state: true,
                            dimming: 100,
                            ..Default::default()
                        })
                        .apply(patch);
                }
                CommandResult::Rejected => {
                    entry.online = true;
                    entry.failures = 0;
                }
                CommandResult::Unreachable => {
                    entry.failures = entry.failures.max(OFFLINE_THRESHOLD);
                    entry.online = false;
                }
            }
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const MAC: &str = "a8bb50aabbcc";

    fn ip(last: u8) -> IpAddr {
        IpAddr::from([192, 168, 1, last])
    }

    fn light(on: bool, dimming: u8) -> LightState {
        LightState {
            state: on,
            dimming,
            temp: Some(2700),
            ..Default::default()
        }
    }

    fn online_registry() -> Registry {
        let mut reg = Registry::default();
        reg.observe(MAC, ip(10), Some(light(true, 80)), None);
        reg
    }

    #[test]
    fn external_power_off_is_reported_as_a_change() {
        let mut reg = online_registry();
        let seq = reg.poll_targets()[0].seq;

        let changed = reg.poll_ok(MAC, ip(10), seq, light(false, 80), None);

        assert_eq!(changed.len(), 1);
        assert!(!changed[0].state.as_ref().unwrap().state);
    }

    #[test]
    fn unchanged_poll_emits_nothing() {
        let mut reg = online_registry();
        let seq = reg.poll_targets()[0].seq;
        assert!(reg
            .poll_ok(MAC, ip(10), seq, light(true, 80), None)
            .is_empty());
    }

    #[test]
    fn goes_offline_only_after_consecutive_failures() {
        let mut reg = online_registry();

        assert!(reg.poll_failed(MAC, ip(10)).is_empty());
        let changed = reg.poll_failed(MAC, ip(10));
        assert_eq!(changed.len(), 1);
        assert!(!changed[0].online);

        // Conserva el último estado conocido y vuelve en cuanto responde.
        let seq = reg.poll_targets()[0].seq;
        let changed = reg.poll_ok(MAC, ip(10), seq, light(true, 80), None);
        assert!(changed[0].online);
    }

    #[test]
    fn poll_sent_before_a_command_does_not_revert_it() {
        let mut reg = online_registry();
        let stale_seq = reg.poll_targets()[0].seq;

        reg.begin_command(MAC).unwrap();
        // Respuesta que llega con el comando aún en vuelo.
        assert!(reg
            .poll_ok(MAC, ip(10), stale_seq, light(true, 80), None)
            .is_empty());

        let patch = PilotPatch {
            dimming: Some(30),
            ..Default::default()
        };
        let changed = reg.end_command(MAC, CommandResult::Applied(&patch));
        assert_eq!(changed[0].state.as_ref().unwrap().dimming, 30);

        // Respuesta atrasada del sondeo previo: llega después del comando.
        assert!(reg
            .poll_ok(MAC, ip(10), stale_seq, light(true, 80), None)
            .is_empty());
        assert_eq!(reg.snapshot(MAC).unwrap().state.unwrap().dimming, 30);

        // Un sondeo nuevo sí es autoritativo.
        let fresh_seq = reg.poll_targets()[0].seq;
        let changed = reg.poll_ok(MAC, ip(10), fresh_seq, light(false, 30), None);
        assert!(!changed[0].state.as_ref().unwrap().state);
    }

    #[test]
    fn push_update_is_ignored_while_a_command_is_in_flight() {
        let mut reg = online_registry();
        reg.begin_command(MAC).unwrap();
        assert!(reg
            .observe(MAC, ip(10), Some(light(false, 10)), None)
            .is_empty());
    }

    #[test]
    fn unreachable_command_marks_device_offline_immediately() {
        let mut reg = online_registry();
        reg.begin_command(MAC).unwrap();
        let changed = reg.end_command(MAC, CommandResult::Unreachable);
        assert!(!changed[0].online);
    }

    #[test]
    fn rejected_command_keeps_device_online_and_state_untouched() {
        let mut reg = online_registry();
        reg.begin_command(MAC).unwrap();
        assert!(reg.end_command(MAC, CommandResult::Rejected).is_empty());
        assert!(reg.snapshot(MAC).unwrap().online);
    }

    #[test]
    fn command_needs_a_known_address() {
        let mut reg = Registry::default();
        assert!(reg.begin_command("unknown").is_none());
    }

    #[test]
    fn reassigned_ip_detaches_the_previous_owner() {
        let mut reg = online_registry();

        let changed = reg.observe("a8bb50ddeeff", ip(10), Some(light(true, 50)), None);

        assert_eq!(changed.len(), 2);
        let previous = reg.snapshot(MAC).unwrap();
        assert_eq!(previous.ip, None);
        assert!(!previous.online);
        assert_eq!(reg.poll_targets().len(), 1);
    }

    #[test]
    fn device_moving_to_a_new_ip_ignores_answers_from_the_old_one() {
        let mut reg = online_registry();
        let seq = reg.poll_targets()[0].seq;
        reg.observe(MAC, ip(20), None, None);

        assert!(reg.poll_failed(MAC, ip(10)).is_empty());
        assert!(reg
            .poll_ok(MAC, ip(10), seq, light(false, 1), None)
            .is_empty());
        assert_eq!(
            reg.snapshot(MAC).unwrap().ip.as_deref(),
            Some("192.168.1.20")
        );
    }

    #[test]
    fn seeded_device_starts_offline_until_it_answers() {
        let mut reg = Registry::default();
        reg.seed(MAC, ip(10));

        let snap = reg.snapshot(MAC).unwrap();
        assert!(!snap.online);
        assert!(snap.state.is_none());
        assert!(reg.has_unreachable());

        let seq = reg.poll_targets()[0].seq;
        let changed = reg.poll_ok(MAC, ip(10), seq, light(true, 80), None);
        assert!(changed[0].online);
    }
}
