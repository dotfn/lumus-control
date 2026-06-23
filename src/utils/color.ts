import { LightState } from '../types';
import { PRESET_SCENES } from '../data/scenes';

export function kelvinToRgb(kelvin: number): [number, number, number] {
  const temp = kelvin / 100;
  let r: number, g: number, b: number;

  if (temp <= 66) {
    r = 255;
    g = 99.47 * Math.log(temp) - 161.12;
  } else {
    r = 329.7 * Math.pow(temp - 60, -0.133);
    g = 288.12 * Math.pow(temp - 60, -0.0755);
  }

  if (temp >= 66) {
    b = 255;
  } else if (temp <= 19) {
    b = 0;
  } else {
    b = 138.52 * Math.log(temp - 10) - 305.04;
  }

  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return [clamp(r), clamp(g), clamp(b)];
}

export function hexToRgb(hex: string): [number, number, number] {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return [255, 255, 255];
  }
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return [r, g, b];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const hex = c.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function getLampRgbColor(lampState: LightState): [number, number, number] {
  const isOn = lampState.state;
  let rgb: [number, number, number] = [255, 180, 84];

  if (isOn) {
    if (lampState.sceneId !== undefined) {
      const scene = PRESET_SCENES.find((s) => s.id === lampState.sceneId);
      if (scene && scene.colors.length > 0) {
        const hex = scene.colors[0];
        const cleanHex = hex.replace('#', '');
        rgb = [
          parseInt(cleanHex.substring(0, 2), 16),
          parseInt(cleanHex.substring(2, 4), 16),
          parseInt(cleanHex.substring(4, 6), 16),
        ];
      }
    } else if (lampState.temp !== undefined) {
      rgb = kelvinToRgb(lampState.temp);
    } else if (lampState.r !== undefined) {
      rgb = [lampState.r, lampState.g ?? 0, lampState.b ?? 0];
    }
  }

  return rgb;
}

export const PRESET_COLORS = [
  { name: "Cálido",  r: 255, g: 180, b: 107 },
  { name: "Blanco",  r: 255, g: 244, b: 229 },
  { name: "Rojo",    r: 255, g: 64,  b: 64  },
  { name: "Naranja", r: 255, g: 140, b: 30  },
  { name: "Verde",   r: 60,  g: 220, b: 110 },
  { name: "Celeste", r: 80,  g: 190, b: 255 },
  { name: "Azul",    r: 70,  g: 100, b: 255 },
  { name: "Violeta", r: 170, g: 90,  b: 255 },
  { name: "Rosa",    r: 255, g: 100, b: 190 },
];
