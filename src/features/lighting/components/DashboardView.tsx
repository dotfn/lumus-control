import React from 'react';
import { WizState } from '../../../types';
import { LightController } from './LightController';
import { kelvinToRgb, rgbToHex } from '../../../utils/color';
import { WIZ_SCENES } from './SceneSelector';
import { Sparkles } from 'lucide-react';

interface DashboardViewProps {
  lampState: WizState;
  isConnected: boolean;
  setLampState: (updates: Partial<WizState>) => Promise<void>;
  circadianActive: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  lampState,
  isConnected,
  setLampState,
  circadianActive,
}) => {
  // Determine current active color for dynamic border or glow
  const getRgbColor = () => {
    let rgb = [255, 180, 84];
    if (lampState.state) {
      if (lampState.sceneId !== undefined) {
        const scene = WIZ_SCENES.find((s) => s.id === lampState.sceneId);
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
  };

  const rgb = getRgbColor();
  const currentRgbString = () => {
    if (lampState.state && lampState.sceneId !== undefined) {
      const scene = WIZ_SCENES.find((s) => s.id === lampState.sceneId);
      if (scene) return scene.colors[0];
    }
    return `rgb(${rgb.join(',')})`;
  };

  const getModeLabel = () => {
    if (!lampState.state) return 'Apagado';
    if (lampState.sceneId !== undefined) {
      const scene = WIZ_SCENES.find((s) => s.id === lampState.sceneId);
      return `Escena: ${scene?.name || 'Personalizada'}`;
    }
    if (lampState.temp !== undefined) {
      return `Blanco: ${lampState.temp}K`;
    }
    if (lampState.r !== undefined && lampState.g !== undefined && lampState.b !== undefined) {
      return `Color: ${rgbToHex(lampState.r, lampState.g, lampState.b).toUpperCase()}`;
    }
    return 'Luz Encendida';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch animate-fade-in">
      {/* Visualizer Card */}
      <div className="md:col-span-5 glass-card flex flex-col items-center justify-between min-h-[360px]">
        <div className="w-full flex items-center justify-between text-xs text-theme-textSecondary font-semibold uppercase tracking-wider mb-4 border-b border-theme-border pb-2">
          <span>Visualización</span>
          <span className="flex items-center gap-1">
            {isConnected ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                En línea
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                Desconectada
              </>
            )}
          </span>
        </div>

        {/* Breathing Orb */}
        <div className="flex-1 flex items-center justify-center py-6">
          <div
            className={`w-40 h-40 rounded-full border border-theme-border relative transition-all duration-700 ${
              lampState.state ? 'animate-breathe' : ''
            }`}
            style={{
              background: lampState.state
                ? `radial-gradient(circle at 38% 32%, ${currentRgbString()} 0%, rgba(var(--glow-color), 0.3) 60%, rgba(255,255,255,0.01) 100%)`
                : 'radial-gradient(circle at 38% 32%, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
              boxShadow: lampState.state
                ? `0 0 calc((25px + 65px * (var(--glow-strength))) * var(--glow-strength-multiplier, 1.0)) calc((3px + 15px * (var(--glow-strength))) * var(--glow-strength-multiplier, 1.0)) rgba(var(--glow-color), 0.35), inset 0 0 20px rgba(255,255,255,0.08)`
                : 'none',
            }}
          />
        </div>

        {/* Readout stats */}
        <div className="w-full bg-theme-input/40 border border-theme-border rounded-xl p-3.5 mt-4 space-y-2">
          <div className="flex justify-between text-xs transition-colors duration-300">
            <span className="text-theme-textSecondary font-medium">Estado</span>
            <span className={`font-semibold ${lampState.state ? 'text-theme-green' : 'text-theme-textSecondary'}`}>
              {lampState.state ? 'Encendido' : 'Apagado'}
            </span>
          </div>
          <div className="flex justify-between text-xs transition-colors duration-300">
            <span className="text-theme-textSecondary font-medium">Brillo</span>
            <span className="font-semibold text-theme-text">{lampState.state ? `${lampState.dimming}%` : '-'}</span>
          </div>
          <div className="flex justify-between text-xs transition-colors duration-300">
            <span className="text-theme-textSecondary font-medium">Modo Activo</span>
            <span className="font-semibold text-theme-text max-w-[160px] truncate" title={getModeLabel()}>
              {getModeLabel()}
            </span>
          </div>
        </div>
      </div>

      {/* Control Card */}
      <div className="md:col-span-7 glass-card flex flex-col justify-between">
        <div className="w-full flex items-center justify-between text-xs text-theme-textSecondary font-semibold uppercase tracking-wider mb-4 border-b border-theme-border pb-2">
          <span>Controles de Luz</span>
          {circadianActive && (
            <span className="text-[10px] bg-blue-500/15 text-blue-500 border border-blue-500/30 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 animate-bounce">
              <Sparkles className="w-2.5 h-2.5" />
              Ritmo Circadiano
            </span>
          )}
        </div>
        
        <div className="flex-1 flex flex-col justify-center">
          <LightController state={lampState} onStateChange={setLampState} />
        </div>
      </div>
    </div>
  );
};
