use crate::errors::AppError;
use std::collections::HashMap;

#[derive(serde::Serialize, serde::Deserialize, Default, Clone)]
#[serde(default)]
pub struct AppConfig {
    pub device_names: HashMap<String, String>,
    pub last_mac: Option<String>,
    pub theme: Option<String>,
    /// Última IP conocida de cada lámpara (MAC → IP). Permite sondearlas al
    /// arrancar sin esperar al discovery y listar las que están sin corriente.
    pub known_devices: HashMap<String, String>,
}

/// Estado de una lámpara tal como lo ve el frontend. El modo de color es
/// excluyente en la práctica: escena, temperatura de blanco o RGB.
#[derive(serde::Serialize, serde::Deserialize, Clone, Debug, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct LightState {
    pub state: bool,
    pub dimming: u8,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temp: Option<u16>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub r: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub g: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub b: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scene_id: Option<u16>,
}

impl LightState {
    /// Refleja en el estado local un comando que la lámpara ya confirmó.
    pub fn apply(&mut self, patch: &PilotPatch) {
        if let Some(state) = patch.state {
            self.state = state;
        }
        if let Some(dimming) = patch.dimming {
            self.dimming = dimming;
        }
        match patch.mode() {
            Some(ColorMode::Scene(id)) => {
                self.scene_id = Some(id);
                self.temp = None;
                (self.r, self.g, self.b) = (None, None, None);
            }
            Some(ColorMode::White(temp)) => {
                self.temp = Some(temp);
                self.scene_id = None;
                (self.r, self.g, self.b) = (None, None, None);
            }
            Some(ColorMode::Rgb(r, g, b)) => {
                (self.r, self.g, self.b) = (Some(r), Some(g), Some(b));
                self.temp = None;
                self.scene_id = None;
            }
            None => {}
        }
    }
}

#[derive(Debug, PartialEq)]
pub enum ColorMode {
    Scene(u16),
    White(u16),
    Rgb(u8, u8, u8),
}

/// Cambios parciales que el frontend pide aplicar con `setPilot`.
#[derive(serde::Deserialize, Clone, Debug, Default, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct PilotPatch {
    pub state: Option<bool>,
    pub dimming: Option<u8>,
    pub temp: Option<u16>,
    pub r: Option<u8>,
    pub g: Option<u8>,
    pub b: Option<u8>,
    pub scene_id: Option<u16>,
}

impl PilotPatch {
    /// Modo de color pedido. Si llegan varios a la vez gana escena > blanco > RGB,
    /// el mismo orden con el que se arma el payload y se refleja el estado.
    pub fn mode(&self) -> Option<ColorMode> {
        if let Some(id) = self.scene_id {
            return Some(ColorMode::Scene(id));
        }
        if let Some(temp) = self.temp {
            return Some(ColorMode::White(temp));
        }
        match (self.r, self.g, self.b) {
            (Some(r), Some(g), Some(b)) => Some(ColorMode::Rgb(r, g, b)),
            _ => None,
        }
    }

    pub fn validate(&self) -> Result<(), AppError> {
        if let Some(d) = self.dimming {
            if !(10..=100).contains(&d) {
                return Err(AppError::Validation(
                    "El brillo debe estar entre 10 y 100".to_string(),
                ));
            }
        }
        if let Some(t) = self.temp {
            if !(2200..=6500).contains(&t) {
                return Err(AppError::Validation(
                    "La temperatura debe estar entre 2200K y 6500K".to_string(),
                ));
            }
        }
        if let Some(id) = self.scene_id {
            if !(1..=35).contains(&id) {
                return Err(AppError::Validation(
                    "El ID de escena debe estar entre 1 y 35".to_string(),
                ));
            }
        }
        let rgb_parts = [self.r, self.g, self.b].iter().flatten().count();
        if rgb_parts != 0 && rgb_parts != 3 {
            return Err(AppError::Validation(
                "El color necesita los tres canales r, g y b".to_string(),
            ));
        }
        if self.state.is_none() && self.dimming.is_none() && self.mode().is_none() {
            return Err(AppError::Validation(
                "El comando no contiene ningún cambio".to_string(),
            ));
        }
        Ok(())
    }

    pub fn to_params(&self) -> serde_json::Map<String, serde_json::Value> {
        let mut params = serde_json::Map::new();
        if let Some(state) = self.state {
            params.insert("state".to_string(), state.into());
        }
        if let Some(dimming) = self.dimming {
            params.insert("dimming".to_string(), dimming.into());
        }
        match self.mode() {
            Some(ColorMode::Scene(id)) => {
                params.insert("sceneId".to_string(), id.into());
            }
            Some(ColorMode::White(temp)) => {
                params.insert("temp".to_string(), temp.into());
            }
            Some(ColorMode::Rgb(r, g, b)) => {
                params.insert("r".to_string(), r.into());
                params.insert("g".to_string(), g.into());
                params.insert("b".to_string(), b.into());
            }
            None => {}
        }
        params
    }
}

/// Foto de una lámpara que viaja al frontend, tanto en respuestas de comandos
/// como en el evento `device-updated`.
#[derive(serde::Serialize, Clone, Debug, PartialEq)]
pub struct DeviceSnapshot {
    pub mac: String,
    pub ip: Option<String>,
    pub online: bool,
    pub state: Option<LightState>,
    pub rssi: Option<i32>,
}

/// Resultado de un `control` para una lámpara concreta del lote.
#[derive(serde::Serialize, Clone, Debug)]
pub struct ControlOutcome {
    pub mac: String,
    pub ok: bool,
    pub error: Option<String>,
    pub device: Option<DeviceSnapshot>,
}

#[derive(serde::Serialize, serde::Deserialize, Default, Clone)]
#[serde(default)]
pub struct MigratedConfig {
    pub device_names: HashMap<String, String>,
    pub last_ip: Option<String>,
    pub last_mac: Option<String>,
    pub theme: Option<String>,
    pub known_devices: HashMap<String, String>,
}

impl MigratedConfig {
    pub fn into_app_config(self) -> AppConfig {
        AppConfig {
            device_names: self.device_names,
            last_mac: self.last_mac.or(self.last_ip),
            theme: self.theme,
            known_devices: self.known_devices,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn patch(json: serde_json::Value) -> PilotPatch {
        serde_json::from_value(json).unwrap()
    }

    #[test]
    fn patch_rejects_out_of_range_values() {
        assert!(patch(serde_json::json!({ "dimming": 5 }))
            .validate()
            .is_err());
        assert!(patch(serde_json::json!({ "temp": 9000 }))
            .validate()
            .is_err());
        assert!(patch(serde_json::json!({ "sceneId": 0 }))
            .validate()
            .is_err());
        assert!(patch(serde_json::json!({ "r": 255 })).validate().is_err());
        assert!(patch(serde_json::json!({})).validate().is_err());
    }

    #[test]
    fn patch_accepts_valid_values() {
        assert!(patch(serde_json::json!({ "state": false }))
            .validate()
            .is_ok());
        assert!(patch(serde_json::json!({ "dimming": 10, "temp": 2200 }))
            .validate()
            .is_ok());
        assert!(patch(serde_json::json!({ "r": 1, "g": 2, "b": 3 }))
            .validate()
            .is_ok());
    }

    #[test]
    fn params_send_a_single_color_mode() {
        let params =
            patch(serde_json::json!({ "sceneId": 4, "temp": 3000, "r": 1, "g": 2, "b": 3 }))
                .to_params();
        assert_eq!(params.get("sceneId"), Some(&serde_json::json!(4)));
        assert!(!params.contains_key("temp"));
        assert!(!params.contains_key("r"));
    }

    #[test]
    fn apply_switches_color_mode_exclusively() {
        let mut light = LightState {
            state: false,
            dimming: 40,
            temp: Some(2700),
            ..Default::default()
        };

        light.apply(&patch(
            serde_json::json!({ "state": true, "r": 10, "g": 20, "b": 30 }),
        ));
        assert!(light.state);
        assert_eq!(light.temp, None);
        assert_eq!((light.r, light.g, light.b), (Some(10), Some(20), Some(30)));

        light.apply(&patch(serde_json::json!({ "sceneId": 6 })));
        assert_eq!(light.scene_id, Some(6));
        assert_eq!(light.r, None);

        light.apply(&patch(serde_json::json!({ "temp": 4000, "dimming": 80 })));
        assert_eq!(light.temp, Some(4000));
        assert_eq!(light.scene_id, None);
        assert_eq!(light.dimming, 80);
    }

    #[test]
    fn light_state_serializes_camel_case_without_nulls() {
        let light = LightState {
            state: true,
            dimming: 50,
            scene_id: Some(3),
            ..Default::default()
        };
        assert_eq!(
            serde_json::to_value(&light).unwrap(),
            serde_json::json!({ "state": true, "dimming": 50, "sceneId": 3 })
        );
    }
}
