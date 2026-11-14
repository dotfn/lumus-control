import { LightDevice, LightState, TargetSummary } from '../types';
import { PRESET_SCENES } from '../data/scenes';
import { getLampRgbColor, rgbToHex } from './color';
import { getTranslations } from '../i18n';

type Lamp = Pick<LightDevice, 'online' | 'state'>;

/** Nombre para mostrar; las lámparas sin nombre se distinguen por el final de su MAC. */
export function lampName(device: Pick<LightDevice, 'mac' | 'name'>): string {
  const t = getTranslations().app.appearance;
  return device.name || `${t.lampPrefix} ${device.mac.replace(/[^0-9a-f]/gi, '').slice(-4).toUpperCase()}`;
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
  const t = getTranslations().app.appearance;
  if (kelvin < 3000) return t.warmWhite;
  if (kelvin < 4500) return t.neutralWhite;
  return t.coolWhite;
}

/** Modo de color en palabras: "Escena Ocean", "Blanco cálido · 2700 K", "Color #FF8800". */
export function describeColor(state: LightState): string {
  const t = getTranslations().app.appearance;
  const scene = PRESET_SCENES.find((s) => s.id === state.sceneId);
  if (scene) return `${t.scenePrefix} ${scene.name}`;
  if (state.temp !== undefined) return `${temperatureName(state.temp)} · ${state.temp} K`;
  if (state.r !== undefined && state.g !== undefined && state.b !== undefined) {
    return `${t.colorPrefix} ${rgbToHex(state.r, state.g, state.b).toUpperCase()}`;
  }
  return state.sceneId !== undefined ? t.customScene : t.on;
}

/** Estado de una lámpara en una línea. */
export function describeLamp(device: Lamp): string {
  const t = getTranslations().app.appearance;
  if (!device.online) return t.offline;
  if (!device.state) return t.connecting;
  if (!device.state.state) return t.off;
  return `${device.state.dimming} % · ${describeColor(device.state)}`;
}

/** Estado de una habitación en una línea. */
export function describeRoom(summary: TargetSummary): string {
  const t = getTranslations().app.appearance;
  if (summary.total === 0) return t.noLamps;
  if (summary.online === 0) return t.offline;

  const power =
    summary.on === 0
      ? t.allOff
      : summary.on === summary.total
        ? summary.total === 1
          ? t.on
          : t.allOn
        : t.partialOn(summary.on, summary.total);
  const offline = summary.total - summary.online;
  return offline > 0 ? `${power} · ${t.offlineCount(offline)}` : power;
}

export function describeSignal(rssi: number | null | undefined): string {
  if (rssi === null || rssi === undefined) return '—';
  const s = getTranslations().app.appearance.signal;
  const quality = rssi >= -60 ? s.excellent : rssi >= -70 ? s.good : rssi >= -80 ? s.fair : s.weak;
  return `${quality} (${rssi} dBm)`;
}

export function formatMac(mac: string): string {
  const hex = mac.replace(/[^0-9a-f]/gi, '');
  return hex.length === 12 ? (hex.match(/.{2}/g) ?? []).join(':').toUpperCase() : mac;
}
