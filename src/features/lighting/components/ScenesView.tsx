import React, { useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
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
  const [hoveredSceneId, setHoveredSceneId] = useState<number | null>(null);

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
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-theme-input/40 p-4 border border-theme-border rounded-[28px] shadow-none">
        {/* Category switcher */}
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
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
                className={`px-4 py-2 text-xs font-semibold rounded-full border transition-colors duration-200 shrink-0 flex items-center gap-2 shadow-none ${
                  isActive
                    ? 'bg-theme-accent border-theme-border/0 text-white'
                    : 'bg-theme-card border-theme-border text-theme-textSecondary hover:bg-theme-input hover:text-theme-text'
                }`}
              >
                <span>{label}</span>
                <span
                  className={`text-[10px] px-2 py-0.2 rounded-full  font-bold ${
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
            className="w-full bg-theme-input border border-theme-border rounded-full pl-10 pr-4 py-2 text-xs text-theme-text placeholder-theme-textSecondary/70 outline-none focus:border-theme-accent transition-colors shadow-none"
          />
        </div>
      </div>

      {/* Empty State */}
      {filteredScenes.length === 0 && (
        <div className="text-center py-20 bg-theme-input/20 border border-dashed border-theme-border rounded-[28px] shadow-none">
          <SlidersHorizontal className="w-8 h-8 text-theme-textSecondary/40 mx-auto mb-2" />
          <p className="text-xs text-theme-textSecondary font-bold tracking-apple-body">No se encontraron escenas</p>
          <p className="text-[11px] text-theme-textSecondary/70 mt-0.5 tracking-apple-body-sm">Intenta buscar con otros términos o cambia la categoría.</p>
        </div>
      )}

      {/* Scenes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
        {filteredScenes.map((scene) => {
          const isSelected = scene.id === currentSceneId;
          const isHovered = scene.id === hoveredSceneId;
          const bgGradient =
            scene.colors.length > 2
              ? `linear-gradient(135deg, ${scene.colors[0]}, ${scene.colors[1]}, ${scene.colors[2]})`
              : `linear-gradient(135deg, ${scene.colors[0]}, ${scene.colors[1]})`;

          return (
            <button
              key={scene.id}
              onClick={() => onSelectScene(scene.id)}
              onMouseEnter={() => setHoveredSceneId(scene.id)}
              onMouseLeave={() => setHoveredSceneId(null)}
              className={`relative overflow-hidden p-5 rounded-[28px] border text-left transition-[border-color,transform] duration-300 group hover:scale-[1.02] flex flex-col justify-between min-h-[130px] shadow-none ${
                isSelected
                  ? 'border-theme-text bg-theme-card'
                  : 'border-theme-border/0 bg-theme-card'
              }`}
              style={{
                borderColor: isHovered
                  ? `${scene.colors[0]}66`
                  : undefined,
                boxShadow: 'none',
              }}
            >
              {/* Background gradient overlay on hover/active */}
              <div
                className={`absolute inset-0 transition-opacity duration-500 ease-out z-0 pointer-events-none
                  ${isHovered 
                    ? 'opacity-[0.06] dark:opacity-[0.09]' 
                    : isSelected 
                      ? 'opacity-[0.03] dark:opacity-[0.05]' 
                      : 'opacity-0'
                  }`}
                style={{ background: bgGradient }}
              />

              {/* Dynamic colored background glow wrapper */}
              <div
                className={`absolute -right-6 -bottom-6 w-28 h-28 rounded-full blur-3xl pointer-events-none transition-[opacity,transform] duration-500 ease-out z-0
                  ${isHovered 
                    ? 'opacity-50' 
                    : isSelected 
                      ? 'opacity-25' 
                      : 'opacity-12'
                  }`}
                style={{
                  transform: isHovered 
                    ? 'scale(1.45)' 
                    : isSelected 
                      ? 'scale(1.0)' 
                      : 'scale(0.75)',
                  willChange: 'transform, opacity',
                }}
              >
                {/* Inner animating glow */}
                <div
                  className="w-full h-full rounded-full"
                  style={{
                    background: bgGradient,
                    animation: isHovered ? 'float-glow-scene 4s ease-in-out infinite' : undefined,
                  }}
                />
              </div>

              <div className="relative z-10 w-full">
                {/* Scene badge header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full border border-theme-border/60 shrink-0"
                      style={{ background: bgGradient }}
                    />
                    <span className="font-semibold text-xs text-theme-text truncate">{scene.name}</span>
                  </div>
                  {isSelected && (
                    <span className="text-[9px] bg-theme-accent text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1.5 shrink-0 shadow-none">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                      </span>
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
                    className="w-2 h-2 rounded-full border border-theme-border/60"
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
