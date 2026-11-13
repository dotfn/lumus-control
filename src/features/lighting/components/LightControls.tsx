import React, { useEffect, useState } from 'react';
import { Sun, SunDim } from 'lucide-react';
import { LightState } from '../../../types';
import { PRESET_SCENES } from '../../../data/scenes';
import { PRESET_COLORS, kelvinToRgb, rgbToHex } from '../../../utils/color';
import { sceneGradient } from '../../../utils/lampAppearance';
import { Section, Segmented, Slider } from '../../shell/components/primitives';

type ColorMode = 'white' | 'color' | 'scene';

const MODE_OPTIONS: { value: ColorMode; label: string }[] = [
  { value: 'white', label: 'Blanco' },
  { value: 'color', label: 'Color' },
  { value: 'scene', label: 'Escenas' },
];

const WHITE_PRESETS = [
  { label: 'Vela', temp: 2200 },
  { label: 'Cálido', temp: 2700 },
  { label: 'Neutro', temp: 4000 },
  { label: 'Día', temp: 5000 },
  { label: 'Frío', temp: 6500 },
];

const TEMP_TRACK = 'linear-gradient(to right, #ff9b34, #ffd9a8, #ffffff, #cfe2ff, #8fc0ff)';
const DEFAULT_TEMP = 4000;

function modeOf(state: LightState): ColorMode {
  if (PRESET_SCENES.some((s) => s.id === state.sceneId)) return 'scene';
  if (state.temp !== undefined) return 'white';
  if (state.r !== undefined) return 'color';
  return state.sceneId !== undefined ? 'scene' : 'white';
}

interface LightControlsProps {
  lampState: LightState;
  disabled: boolean;
  /** Aplica un cambio de luz. Cualquier ajuste enciende la lámpara. */
  onChange: (patch: Partial<LightState>) => void;
}

export const LightControls: React.FC<LightControlsProps> = ({ lampState, disabled, onChange }) => {
  const actualMode = modeOf(lampState);
  const [mode, setMode] = useState<ColorMode>(actualMode);

  // Si el modo cambia desde fuera (otra app, una escena programada), la
  // pestaña visible lo acompaña; elegir una pestaña a mano no envía nada.
  useEffect(() => {
    setMode(actualMode);
  }, [actualMode]);

  const adjust = (patch: Partial<LightState>) => onChange({ ...patch, state: true });
  const dimming = Math.max(10, Math.min(100, lampState.dimming));
  const temp = lampState.temp ?? DEFAULT_TEMP;
  const currentHex =
    lampState.r !== undefined && lampState.g !== undefined && lampState.b !== undefined
      ? rgbToHex(lampState.r, lampState.g, lampState.b)
      : null;

  return (
    <>
      <Section title="Brillo" disabled={disabled}>
        <div className="mac-row">
          <div className="mac-slider-row" style={{ flex: 1 }}>
            <SunDim size={16} aria-hidden="true" />
            <Slider
              value={dimming}
              min={10}
              max={100}
              onChange={(value) => adjust({ dimming: value })}
              label={`Brillo: ${dimming} %`}
            />
            <Sun size={18} aria-hidden="true" />
            <span className="mac-slider-row__value">{dimming} %</span>
          </div>
        </div>
      </Section>

      <Section title="Color" disabled={disabled}>
        <div className="mac-row mac-row--stack">
          <Segmented value={mode} options={MODE_OPTIONS} onChange={setMode} label="Modo de color" fill />
        </div>

        {mode === 'white' && (
          <div className="mac-row mac-row--stack">
            <div className="mac-slider-row">
              <Slider
                value={Math.max(2200, Math.min(6500, temp))}
                min={2200}
                max={6500}
                step={100}
                onChange={(value) => adjust({ temp: value })}
                label={`Temperatura de blanco: ${temp} K`}
                track={TEMP_TRACK}
              />
              <span className="mac-slider-row__value" style={{ width: 56 }}>
                {temp} K
              </span>
            </div>
            <div className="mac-chips">
              {WHITE_PRESETS.map((preset) => (
                <button
                  key={preset.temp}
                  type="button"
                  className="mac-chip"
                  onClick={() => adjust({ temp: preset.temp })}
                >
                  <span
                    className="mac-chip__dot"
                    style={{ background: `rgb(${kelvinToRgb(preset.temp).join(',')})` }}
                  />
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'color' && (
          <div className="mac-row mac-row--stack">
            <div className="mac-swatches">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  className="mac-swatch"
                  style={{ background: `rgb(${color.r}, ${color.g}, ${color.b})` }}
                  aria-label={color.name}
                  title={color.name}
                  aria-pressed={
                    actualMode === 'color' &&
                    lampState.r === color.r &&
                    lampState.g === color.g &&
                    lampState.b === color.b
                  }
                  onClick={() => adjust({ r: color.r, g: color.g, b: color.b })}
                />
              ))}
              <label
                className="mac-swatch"
                style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}
                title="Color personalizado"
              >
                <input
                  type="color"
                  aria-label="Color personalizado"
                  value={currentHex ?? '#ffb454'}
                  onChange={(e) => {
                    const hex = e.target.value;
                    adjust({
                      r: parseInt(hex.slice(1, 3), 16),
                      g: parseInt(hex.slice(3, 5), 16),
                      b: parseInt(hex.slice(5, 7), 16),
                    });
                  }}
                />
              </label>
            </div>
          </div>
        )}

        {mode === 'scene' && (
          <div className="mac-row mac-row--stack">
            <div className="mac-scenes">
              {PRESET_SCENES.map((scene) => (
                <button
                  key={scene.id}
                  type="button"
                  className="mac-scene"
                  title={scene.description}
                  aria-pressed={actualMode === 'scene' && lampState.sceneId === scene.id}
                  onClick={() => adjust({ sceneId: scene.id })}
                >
                  <span className="mac-scene__art" style={{ background: sceneGradient(scene.colors) }} />
                  <span className="mac-scene__name">{scene.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </Section>
    </>
  );
};
