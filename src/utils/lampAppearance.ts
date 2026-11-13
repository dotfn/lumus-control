import { LightDevice, LightState, TargetSummary } from '../types';
import { PRESET_SCENES } from '../data/scenes';
import { getLampRgbColor, rgbToHex } from './color';

type Lamp = Pick<LightDevice, 'online' | 'state'>;

/** Nombre para mostrar; las lámparas sin nombre se distinguen por el final de su MAC. */
export function lampName(device: Pick<LightDevice, 'mac' | 'name'>): string {
  return device.name || `Lámpara ${device.mac.replace(/[^0-9a-f]/gi, '').slice(-4).toUpperCase()}`;
}

export function sceneGradient(colors: string[]): string {
  return colors.length > 1 ? `linear-gradient(135deg, ${colors.join(', ')})` : colors[0];
}

/**
 * Relleno con el color que la lámpara está emitiendo, o `undefined` si está
 * apagada o sin conexión (en ese caso el mosaico usa su gris por defecto).
 */
export function lampFill(device?: Lamp): { background: string; color: string; glow: string } | undefined {
  const state = device?.state;
  if (!device?.online || !state?.state) return undefined;

  const scene = PRESET_SCENES.find((s) => s.id === state.sceneId);
  if (scene) {
    return { background: sceneGradient(scene.colors), color: '#fff', glow: scene.colors[0] };
  }

  const [r, g, b] = getLampRgbColor(state);
  // Glifo oscuro sobre colores claros y blanco sobre los oscuros, para que se lea siempre.
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return {
    background: `rgb(${r}, ${g}, ${b})`,
    glow: `rgb(${r}, ${g}, ${b})`,
    color: luminance > 0.6 ? 'rgba(0, 0, 0, 0.72)' : '#fff',
  };
}

function temperatureName(kelvin: number): string {
  if (kelvin < 3000) return 'Blanco cálido';
  if (kelvin < 4500) return 'Blanco neutro';
  return 'Blanco frío';
}

/** Modo de color en palabras: "Escena Ocean", "Blanco cálido · 2700 K", "Color #FF8800". */
export function describeColor(state: LightState): string {
  const scene = PRESET_SCENES.find((s) => s.id === state.sceneId);
  if (scene) return `Escena ${scene.name}`;
  if (state.temp !== undefined) return `${temperatureName(state.temp)} · ${state.temp} K`;
  if (state.r !== undefined && state.g !== undefined && state.b !== undefined) {
    return `Color ${rgbToHex(state.r, state.g, state.b).toUpperCase()}`;
  }
  return state.sceneId !== undefined ? 'Escena personalizada' : 'Encendida';
}

/** Estado de una lámpara en una línea. */
export function describeLamp(device: Lamp): string {
  if (!device.online) return 'Sin conexión';
  if (!device.state) return 'Conectando…';
  if (!device.state.state) return 'Apagada';
  return `${device.state.dimming} % · ${describeColor(device.state)}`;
}

/** Estado de una habitación en una línea. */
export function describeRoom(summary: TargetSummary): string {
  if (summary.total === 0) return 'Sin lámparas';
  if (summary.online === 0) return 'Sin conexión';

  const power =
    summary.on === 0
      ? 'Todas apagadas'
      : summary.on === summary.total
        ? summary.total === 1
          ? 'Encendida'
          : 'Todas encendidas'
        : `${summary.on} de ${summary.total} encendidas`;
  const offline = summary.total - summary.online;
  return offline > 0 ? `${power} · ${offline} sin conexión` : power;
}

export function describeSignal(rssi: number | null | undefined): string {
  if (rssi === null || rssi === undefined) return '—';
  const quality = rssi >= -60 ? 'Excelente' : rssi >= -70 ? 'Buena' : rssi >= -80 ? 'Regular' : 'Débil';
  return `${quality} (${rssi} dBm)`;
}

export function formatMac(mac: string): string {
  const hex = mac.replace(/[^0-9a-f]/gi, '');
  return hex.length === 12 ? (hex.match(/.{2}/g) ?? []).join(':').toUpperCase() : mac;
}
