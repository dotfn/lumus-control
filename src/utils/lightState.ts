import { LightState } from '../types';

export const DEFAULT_LIGHT_STATE: LightState = {
  state: false,
  dimming: 60,
  r: 255,
  g: 180,
  b: 84,
};

type ColorMode = 'scene' | 'white' | 'rgb' | null;

// Mismo orden de prioridad que el backend: escena > blanco > RGB.
function colorModeOf(patch: Partial<LightState>): ColorMode {
  if (patch.sceneId !== undefined) return 'scene';
  if (patch.temp !== undefined) return 'white';
  if (patch.r !== undefined && patch.g !== undefined && patch.b !== undefined) return 'rgb';
  return null;
}

function dropOtherModes<T extends Partial<LightState>>(target: T, mode: ColorMode): T {
  if (mode === null) return target;
  if (mode !== 'scene') delete target.sceneId;
  if (mode !== 'white') delete target.temp;
  if (mode !== 'rgb') {
    delete target.r;
    delete target.g;
    delete target.b;
  }
  return target;
}

/** Aplica cambios parciales a un estado; elegir un modo de color descarta los otros. */
export function applyPatch(base: LightState, patch: Partial<LightState>): LightState {
  const next: LightState = { ...base };
  if (patch.state !== undefined) next.state = patch.state;
  if (patch.dimming !== undefined) next.dimming = patch.dimming;

  const mode = colorModeOf(patch);
  if (mode === 'scene') next.sceneId = patch.sceneId;
  if (mode === 'white') next.temp = patch.temp;
  if (mode === 'rgb') {
    next.r = patch.r;
    next.g = patch.g;
    next.b = patch.b;
  }
  return dropOtherModes(next, mode);
}

/** Combina dos cambios pendientes; el modo de color del más nuevo reemplaza al anterior. */
export function mergePatch(
  older: Partial<LightState>,
  newer: Partial<LightState>,
): Partial<LightState> {
  const merged: Partial<LightState> = { ...older };
  (Object.keys(newer) as (keyof LightState)[]).forEach((key) => {
    if (newer[key] !== undefined) Object.assign(merged, { [key]: newer[key] });
  });
  return dropOtherModes(merged, colorModeOf(newer));
}

export function sameLightState(a: LightState, b: LightState): boolean {
  return (
    a.state === b.state &&
    a.dimming === b.dimming &&
    a.r === b.r &&
    a.g === b.g &&
    a.b === b.b &&
    a.temp === b.temp &&
    a.sceneId === b.sceneId
  );
}
