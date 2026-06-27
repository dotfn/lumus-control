import React from 'react';
import { LightState } from '../../../types';
import { LightController } from './LightController';
import { rgbToHex, getLampRgbColor } from '../../../utils/color';
import { PRESET_SCENES } from '../../../data/scenes';
import { Power, Sparkles } from 'lucide-react';

interface DashboardViewProps {
  lampState: LightState;
  isConnected: boolean;
  setLampState: (updates: Partial<LightState>) => Promise<void>;
  circadianActive: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  lampState,
  isConnected,
  setLampState,
  circadianActive,
}) => {
  const rgb = getLampRgbColor(lampState);

  const currentRgbString = () => {
    if (lampState.state && lampState.sceneId !== undefined) {
      const scene = PRESET_SCENES.find((s) => s.id === lampState.sceneId);
      if (scene) return scene.colors[0];
    }
    return `rgb(${rgb.join(',')})`;
  };

  const getModeLabel = () => {
    if (!lampState.state) return 'Apagado';
    if (lampState.sceneId !== undefined) {
      const scene = PRESET_SCENES.find((s) => s.id === lampState.sceneId);
      return `Escena: ${scene?.name || 'Personalizada'}`;
    }
    if (lampState.temp !== undefined) return `Blanco · ${lampState.temp}K`;
    if (lampState.r !== undefined && lampState.g !== undefined && lampState.b !== undefined) {
      return `Color: ${rgbToHex(lampState.r, lampState.g, lampState.b).toUpperCase()}`;
    }
    return 'Luz encendida';
  };

  const dimmingFactor = lampState.state ? lampState.dimming / 100 : 0;

  const handlePower = () => setLampState({ state: !lampState.state });

  const handleBrightnessInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLampState({ dimming: parseInt(e.target.value, 10) });
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in">

      {/* Hero Card — orb + state + primary controls */}
      <div className="glass-card flex flex-col sm:flex-row items-center gap-8 p-7 shadow-none">

        {/* Orb */}
        <div className="flex-shrink-0 flex items-center justify-center">
          <div
            className={`w-28 h-28 rounded-full border transition-[background,border-color,filter] duration-700 ${
              lampState.state ? 'animate-breathe' : ''
            }`}
            style={{
              background: lampState.state
                ? `radial-gradient(circle at 38% 32%, ${currentRgbString()} 0%, rgba(var(--glow-color), ${0.25 * dimmingFactor}) 60%, rgba(255,255,255,0.01) 100%)`
                : 'radial-gradient(circle at 38% 32%, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
              borderColor: lampState.state ? currentRgbString() : 'var(--border-color)',
              filter: lampState.state
                ? `drop-shadow(0 4px 16px rgba(var(--glow-color), ${0.35 * dimmingFactor}))`
                : 'none',
            }}
          />
        </div>

        {/* Right: state info + controls */}
        <div className="flex-1 min-w-0 flex flex-col gap-4 w-full">

          {/* Status row */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-xl font-bold tracking-apple-heading transition-colors ${lampState.state ? 'text-theme-text' : 'text-theme-textSecondary'}`}>
              {lampState.state ? 'Encendida' : 'Apagada'}
            </span>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 tracking-apple-body-sm ${
              isConnected
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'bg-red-500/10 text-red-500 border-red-500/20'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              {isConnected ? 'En línea' : 'Desconectada'}
            </span>
            {circadianActive && (
              <span className="text-[10px] bg-theme-accent/10 text-theme-accent border border-theme-accent/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold tracking-apple-body-sm">
                <Sparkles className="w-2.5 h-2.5 text-theme-accent" />
                Circadiano
              </span>
            )}
          </div>

          {/* Mode label */}
          <p className="text-xs text-theme-textSecondary font-medium tracking-apple-body">
            {getModeLabel()}
          </p>

          {/* Power + brightness row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <button
              onClick={handlePower}
              className={`flex-shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-full border text-xs font-bold transition-colors duration-200 active:scale-95 shadow-none ${
                lampState.state
                  ? 'bg-theme-green border-theme-border/0 text-white'
                  : 'bg-theme-card border-theme-border text-theme-textSecondary hover:bg-theme-input'
              }`}
            >
              <Power className="w-4 h-4" />
              {lampState.state ? 'Apagar' : 'Encender'}
            </button>
            <div className="flex-1 flex items-center gap-3.5 min-w-0 w-full">
              <span className="text-[11px]  text-theme-textSecondary font-semibold flex-shrink-0">
                {lampState.dimming}%
              </span>
              <input
                type="range"
                min="10"
                max="100"
                value={lampState.dimming}
                onChange={handleBrightnessInput}
                className="flex-1 cursor-pointer"
                aria-label={`Brillo: ${lampState.dimming}%`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom grid — color controls + readout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Color / White mode controls */}
        <div className="glass-card shadow-none">
          <div className="text-[10px] font-bold uppercase tracking-wider text-theme-textSecondary border-b border-theme-border/60 pb-2.5 mb-4 tracking-apple-body-sm">
            Modo de color
          </div>
          <LightController
            state={lampState}
            onStateChange={setLampState}
            hidePowerAndBrightness
          />
        </div>

        {/* Readout stats */}
        <div className="glass-card shadow-none">
          <div className="text-[10px] font-bold uppercase tracking-wider text-theme-textSecondary border-b border-theme-border/60 pb-2.5 mb-4 tracking-apple-body-sm">
            Estado
          </div>
          <div className="space-y-0">
            {[
              { label: 'Brillo', value: lampState.state ? `${lampState.dimming}%` : '—' },
              { label: 'Temperatura', value: lampState.state && lampState.temp ? `${lampState.temp}K` : '—' },
              { label: 'Modo activo', value: getModeLabel() },
              { label: 'Conexión', value: isConnected ? 'En línea' : 'Desconectada' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-3 border-b border-theme-border/60 last:border-0 text-xs tracking-apple-body">
                <span className="text-theme-textSecondary font-medium">{label}</span>
                <span className="font-bold text-theme-text max-w-[180px] truncate text-right" title={value}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};



