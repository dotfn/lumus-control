export interface LightState {
  state: boolean;
  dimming: number;
  r?: number;
  g?: number;
  b?: number;
  temp?: number;
  sceneId?: number;
}

/** Foto de una lámpara tal como la reporta el backend, que es la fuente de verdad. */
export interface DeviceSnapshot {
  mac: string;
  ip: string | null;
  online: boolean;
  state: LightState | null;
  rssi?: number | null;
}

/** Lámpara lista para mostrar: nombre resuelto y cambios optimistas aplicados. */
export interface LightDevice {
  ip: string;
  mac: string;
  name?: string;
  online: boolean;
  state?: LightState;
}

/** Resultado de un comando para una lámpara concreta del lote. */
export interface ControlOutcome {
  mac: string;
  ok: boolean;
  error?: string | null;
  device?: DeviceSnapshot | null;
}

/** Cuántas lámparas del destino actual están en línea y encendidas. */
export interface TargetSummary {
  total: number;
  online: number;
  on: number;
}

export interface LightScene {
  id: number;
  name: string;
  colors: string[];
  description?: string;
}

export interface PreferencesResponse {
  device_names: Record<string, string>;
  last_mac: string | null;
  theme: string | null;
}
