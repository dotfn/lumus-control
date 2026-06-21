import React from 'react';
import { WizScene } from '../../../types';

interface SceneSelectorProps {
  currentSceneId?: number;
  onSelectScene: (sceneId: number) => void;
}

export const WIZ_SCENES: WizScene[] = [
  { id: 1, name: 'Ocean', colors: ['#0052d4', '#4364f7', '#6fb1fc'], description: 'Azul profundo y relajante' },
  { id: 2, name: 'Romance', colors: ['#f857a6', '#ff5858'], description: 'Tonos rosa y violeta cálidos' },
  { id: 3, name: 'Sunset', colors: ['#e65c00', '#f9d423'], description: 'Gradiente de atardecer dorado' },
  { id: 4, name: 'Party', colors: ['#ff007f', '#7f00ff', '#00ffff'], description: 'Cambio dinámico y festivo' },
  { id: 5, name: 'Fireplace', colors: ['#d31027', '#ea384d', '#ff9900'], description: 'Cálido parpadeo de chimenea' },
  { id: 6, name: 'Cozy', colors: ['#f12711', '#f5af19'], description: 'Luz tenue y acogedora' },
  { id: 7, name: 'Forest', colors: ['#11998e', '#38ef7d'], description: 'Tonos verdes de naturaleza' },
  { id: 9, name: 'Wake up', colors: ['#fffbd5', '#b20a2c'], description: 'Amanecer gradual energizante' },
  { id: 10, name: 'Bedtime', colors: ['#2c3e50', '#000000'], description: 'Luz ultra cálida para dormir' },
  { id: 18, name: 'TV Time', colors: ['#141517', '#4b6cb7', '#182848'], description: 'Luz de fondo suave indirecta' },
  { id: 25, name: 'Mojito', colors: ['#add100', '#7b920a'], description: 'Verde lima refrescante' },
  { id: 26, name: 'Club', colors: ['#450d87', '#b90d87'], description: 'Atmósfera nocturna vibrante' },
  { id: 27, name: 'Christmas', colors: ['#138808', '#d31027'], description: 'Verde y rojo tradicional' },
  { id: 28, name: 'Halloween', colors: ['#ff5f6d', '#ffc371'], description: 'Naranja misterioso y violeta' },
  { id: 29, name: 'Candlelight', colors: ['#f3904f', '#3b4b5a'], description: 'Cálida simulación de vela' },
];

export const SceneSelector: React.FC<SceneSelectorProps> = ({
  currentSceneId,
  onSelectScene,
}) => {
  return (
    <div className="space-y-3">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-theme-textSecondary transition-colors duration-300">
        Escenas dinámicas
      </label>
      
      <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
        {WIZ_SCENES.map((scene) => {
          const isSelected = scene.id === currentSceneId;
          const bgGradient = scene.colors.length > 2
            ? `linear-gradient(135deg, ${scene.colors[0]}, ${scene.colors[1]}, ${scene.colors[2]})`
            : `linear-gradient(135deg, ${scene.colors[0]}, ${scene.colors[1]})`;

          return (
            <button
              key={scene.id}
              onClick={() => onSelectScene(scene.id)}
              className={`relative overflow-hidden p-3 rounded-xl border text-left transition-all duration-300 group ${
                isSelected
                  ? 'border-blue-500/50 shadow-[0_0_12px_rgba(0,122,255,0.15)] bg-theme-card'
                  : 'border-theme-border bg-theme-input hover:bg-theme-border'
              }`}
            >
              {/* Colored background glow on hover or when selected */}
              <div
                className={`absolute right-[-20%] bottom-[-20%] w-16 h-16 rounded-full blur-xl opacity-30 group-hover:scale-125 transition-transform duration-300`}
                style={{ background: bgGradient }}
              />

              <div className="relative z-10 flex flex-col justify-between h-full min-h-[50px]">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
                    style={{ background: bgGradient }}
                  />
                  <span className="font-semibold text-xs text-theme-text truncate transition-colors duration-300">{scene.name}</span>
                </div>
                <span className="text-[10px] text-theme-textSecondary mt-1 line-clamp-2 transition-colors duration-300">
                  {scene.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
