import React, { useState } from 'react';
import { Power, Sun, Thermometer, Palette } from 'lucide-react';
import { LightState } from '../../../types';
import { ColorPicker } from './ColorPicker';

interface LightControllerProps {
  state: LightState;
  onStateChange: (updatedState: Partial<LightState>) => void;
}

export const LightController: React.FC<LightControllerProps> = ({
  state,
  onStateChange,
}) => {
  const [activeTab, setActiveTab] = useState<'color' | 'white'>(
    state.temp !== undefined && state.sceneId === undefined ? 'white' : 'color'
  );

  const handlePower = () => {
    onStateChange({ state: !state.state });
  };

  const handleBrightnessInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    onStateChange({ dimming: parseInt(e.target.value, 10) });
  };

  const handleTempInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    // If user changes temperature, we clear sceneId
    onStateChange({ temp: parseInt(e.target.value, 10), sceneId: undefined });
  };

  const handleColorChange = (r: number, g: number, b: number) => {
    // If user changes color, we clear temp and sceneId
    onStateChange({ r, g, b, state: true, temp: undefined, sceneId: undefined });
  };

  return (
    <div className="space-y-5">
      {/* Power Control Row */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePower}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-xs transition-all duration-200 ${
            state.state
              ? 'bg-theme-green border-transparent text-white shadow-[0_4px_12px_rgba(52,199,89,0.25)]'
              : 'bg-theme-input border-theme-border text-theme-textSecondary hover:opacity-85'
          }`}
        >
          <Power className="w-3.5 h-3.5" />
          {state.state ? 'Apagar' : 'Encender'}
        </button>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-theme-textSecondary font-display flex items-center gap-1 transition-colors duration-300">
          <Sun className="w-3.5 h-3.5" />
          Brillo: {state.dimming}%
        </span>
      </div>

      {/* Brightness Slider */}
      <div className="space-y-1">
        <input
          type="range"
          min="10"
          max="100"
          value={state.dimming}
          onChange={handleBrightnessInput}
          className="w-full"
          aria-label={`Brillo: ${state.dimming}%`}
        />
      </div>

      {/* Mode Tabs */}
      <div className="flex bg-theme-input border border-theme-border rounded-lg p-0.5 transition-colors duration-300">
        <button
          onClick={() => setActiveTab('color')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all duration-150 ${
            activeTab === 'color'
              ? 'bg-theme-card text-theme-text shadow-sm'
              : 'text-theme-textSecondary hover:text-theme-text font-normal'
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          Color
        </button>
        <button
          onClick={() => setActiveTab('white')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-all duration-150 ${
            activeTab === 'white'
              ? 'bg-theme-card text-theme-text shadow-sm'
              : 'text-theme-textSecondary hover:text-theme-text font-normal'
          }`}
        >
          <Thermometer className="w-3.5 h-3.5" />
          Blanco
        </button>
      </div>

      {/* Tab Contents */}
      <div className="transition-all duration-300">
        {activeTab === 'color' ? (
          <ColorPicker
            currentR={state.r}
            currentG={state.g}
            currentB={state.b}
            onChange={handleColorChange}
          />
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center transition-colors duration-300">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-theme-textSecondary">
                Temperatura de blanco
              </label>
              <span className="font-mono text-[10px] text-theme-textSecondary">{state.temp || 4000}K</span>
            </div>
            <input
              type="range"
              min="2200"
              max="6500"
              value={state.temp || 4000}
              onChange={handleTempInput}
              className="w-full"
              aria-label={`Temperatura de blanco: ${state.temp || 4000}K`}
              style={{
                background: 'linear-gradient(to right, #ff9b34, #ffe7d0, #ffffff, #c7dfff, #6ab1ff)',
              }}
            />
            <div className="flex justify-between text-[10px] text-theme-textSecondary font-mono transition-colors duration-300">
              <span>2200K cálido</span>
              <span>6500K frío</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
