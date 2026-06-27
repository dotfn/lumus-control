import React from 'react';
import { PRESET_SCENES } from '../../../data/scenes';

interface SceneSelectorProps {
  currentSceneId?: number;
  onSelectScene: (sceneId: number) => void;
}

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
        {PRESET_SCENES.map((scene) => {
          const isSelected = scene.id === currentSceneId;
          const bgGradient = scene.colors.length > 2
            ? `linear-gradient(135deg, ${scene.colors[0]}, ${scene.colors[1]}, ${scene.colors[2]})`
            : `linear-gradient(135deg, ${scene.colors[0]}, ${scene.colors[1]})`;

          return (
            <button
              key={scene.id}
              onClick={() => onSelectScene(scene.id)}
              className={`relative overflow-hidden p-3 rounded-xl border text-left transition-colors duration-300 group ${
                isSelected
                  ? 'border-theme-text bg-theme-card shadow-none'
                  : 'border-theme-border/0 bg-theme-input hover:bg-theme-border'
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
                    className="w-2.5 h-2.5 rounded-full border border-theme-border/60 shrink-0"
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
