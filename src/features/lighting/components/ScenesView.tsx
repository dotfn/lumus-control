import React, { useState } from 'react';
import { Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { PRESET_SCENES } from '../../../data/scenes';

interface ScenesViewProps {
  currentSceneId?: number;
  onSelectScene: (sceneId: number) => void;
}

type SceneCategory = 'all' | 'relax' | 'party' | 'focus';

// Map scene IDs to categories for structured filtering
const CATEGORY_MAP: Record<number, SceneCategory> = {
  1: 'party',  // Ocean
  2: 'relax',  // Romance
  3: 'relax',  // Sunset
  4: 'party',  // Party
  5: 'relax',  // Fireplace
  6: 'relax',  // Cozy
  7: 'party',  // Forest
  9: 'focus',  // Wake up
  10: 'relax', // Bedtime
  18: 'focus', // TV Time
  25: 'party', // Mojito
  26: 'party', // Club
  27: 'party', // Christmas
  28: 'party', // Halloween
  29: 'relax', // Candlelight
};

export const ScenesView: React.FC<ScenesViewProps> = ({
  currentSceneId,
  onSelectScene,
}) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<SceneCategory>('all');

  const filteredScenes = PRESET_SCENES.filter((scene) => {
    const matchesSearch =
      scene.name.toLowerCase().includes(search.toLowerCase()) ||
      (scene.description || '').toLowerCase().includes(search.toLowerCase());

    const sceneCategory = CATEGORY_MAP[scene.id] || 'relax';
    const matchesCategory = activeCategory === 'all' || sceneCategory === activeCategory;

    return matchesSearch && matchesCategory;
  });

  const getCategoryCount = (category: SceneCategory) => {
    if (category === 'all') return PRESET_SCENES.length;
    return PRESET_SCENES.filter((s) => CATEGORY_MAP[s.id] === category).length;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header controls: Search & Category tabs */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-theme-input/30 p-3.5 border border-theme-border rounded-2xl">
        {/* Category switcher */}
        <div className="flex gap-1.5 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
          {(['all', 'relax', 'party', 'focus'] as SceneCategory[]).map((cat) => {
            const label = {
              all: 'Todas',
              relax: 'Relajación',
              party: 'Fiesta & Color',
              focus: 'Foco & TV',
            }[cat];

            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all duration-200 shrink-0 flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-theme-accent border-transparent text-white shadow-sm'
                    : 'bg-theme-input border-theme-border text-theme-textSecondary hover:bg-theme-border hover:text-theme-text'
                }`}
              >
                <span>{label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-white/20 text-white' : 'bg-theme-input text-theme-textSecondary'
                  }`}
                >
                  {getCategoryCount(cat)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative md:w-72">
          <Search className="w-4 h-4 text-theme-textSecondary absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar escena..."
            className="w-full bg-theme-input border border-theme-border rounded-xl pl-10 pr-4 py-1.5 text-xs text-theme-text placeholder-theme-textSecondary/70 outline-none focus:border-theme-accent/50 transition-colors"
          />
        </div>
      </div>

      {/* Empty State */}
      {filteredScenes.length === 0 && (
        <div className="text-center py-16 bg-theme-input/20 border border-dashed border-theme-border rounded-2xl">
          <SlidersHorizontal className="w-8 h-8 text-theme-textSecondary/40 mx-auto mb-2" />
          <p className="text-xs text-theme-textSecondary font-semibold">No se encontraron escenas</p>
          <p className="text-[11px] text-theme-textSecondary/75 mt-0.5">Intenta buscar con otros términos o cambia la categoría.</p>
        </div>
      )}

      {/* Scenes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
        {filteredScenes.map((scene) => {
          const isSelected = scene.id === currentSceneId;
          const bgGradient =
            scene.colors.length > 2
              ? `linear-gradient(135deg, ${scene.colors[0]}, ${scene.colors[1]}, ${scene.colors[2]})`
              : `linear-gradient(135deg, ${scene.colors[0]}, ${scene.colors[1]})`;

          return (
            <button
              key={scene.id}
              onClick={() => onSelectScene(scene.id)}
              className={`relative overflow-hidden p-4 rounded-2xl border text-left transition-all duration-300 group hover:scale-[1.02] flex flex-col justify-between min-h-[120px] ${
                isSelected
                  ? 'border-blue-500/50 shadow-[0_4px_16px_rgba(0,122,255,0.18)] bg-theme-card'
                  : 'border-theme-border bg-theme-card hover:bg-theme-input'
              }`}
            >
              {/* Dynamic colored background glow */}
              <div
                className={`absolute right-[-10%] bottom-[-10%] w-20 h-20 rounded-full blur-2xl opacity-20 group-hover:scale-135 transition-transform duration-500`}
                style={{ background: bgGradient }}
              />

              <div className="relative z-10 w-full">
                {/* Scene badge header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full border border-white/20 shrink-0 shadow-sm"
                      style={{ background: bgGradient }}
                    />
                    <span className="font-semibold text-xs text-theme-text truncate">{scene.name}</span>
                  </div>
                  {isSelected && (
                    <span className="text-[9px] bg-blue-500/15 text-blue-500 border border-blue-500/30 px-1 rounded font-semibold flex items-center gap-0.5 animate-pulse shrink-0">
                      <Sparkles className="w-2 h-2" />
                      Activo
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-[10px] text-theme-textSecondary/90 mt-2.5 leading-relaxed pr-2">
                  {scene.description || ''}
                </p>
              </div>

              {/* Color Swatch Dot List */}
              <div className="relative z-10 flex gap-1 mt-4">
                {scene.colors.map((color, idx) => (
                  <span
                    key={idx}
                    className="w-2 h-2 rounded-full border border-white/10"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
