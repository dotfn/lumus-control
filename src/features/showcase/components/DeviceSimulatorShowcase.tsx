import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

export interface Finish {
  id: string;
  label: string;
  swatchHex: string;
  gradient: string;
  activeColor: string;
}

interface DeviceSimulatorShowcaseProps {
  finishes: readonly Finish[];
  defaultFinishId?: string;
  animationDuration?: number;
  className?: string;
}

export const DeviceSimulatorShowcase: React.FC<DeviceSimulatorShowcaseProps> = ({
  finishes,
  defaultFinishId,
  animationDuration = 12,
  className = '',
}) => {
  const [selectedFinish, setSelectedFinish] = useState(
    defaultFinishId ?? finishes[0]?.id ?? ''
  );
  const [lampOn, setLampOn] = useState(true);
  const [brightness, setBrightness] = useState(80);

  const currentFinish = finishes.find((f) => f.id === selectedFinish) ?? finishes[0];
  const bulbIntensity = lampOn ? brightness / 100 : 0;
  const i = bulbIntensity;
  const i2 = i * i;

  return (
    <section className={`relative px-6 max-w-6xl mx-auto pb-24 ${className}`}>
      <div className="flex flex-col items-center gap-8">
        {/* Swatch Switcher */}
        <div
          className="flex flex-col items-center gap-2.5 transition-opacity duration-700"
          style={{ opacity: 0.3 + i * 0.7 }}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-theme-textSecondary">
            Acabado de iluminación
          </span>
          <div className="flex bg-theme-input/40 border border-theme-border rounded-full p-1.5 gap-2">
            {finishes.map((finish) => {
              const isActive = selectedFinish === finish.id;
              return (
                <button
                  key={finish.id}
                  onClick={() => setSelectedFinish(finish.id)}
                  className={`group relative w-7 h-7 rounded-full transition-shadow flex items-center justify-center active:scale-90 ${isActive ? 'ring-2 ring-theme-accent ring-offset-2 ring-offset-theme-bg' : ''
                    }`}
                  style={{ backgroundColor: finish.swatchHex }}
                  title={finish.label}
                  aria-label={`Seleccionar acabado ${finish.label}`}
                >
                  <span className="absolute inset-0.5 rounded-full border border-black/10 opacity-50" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Device Simulator Showcase with Theatrical Backdrop */}
        <div className="relative w-full max-w-4xl h-[480px] sm:h-[520px] rounded-[28px] overflow-hidden border border-theme-border flex items-center justify-center">
          {/* Theatrical Animated Backdrop Gradient */}
          <div
            className="absolute inset-0 transition-[opacity,filter] duration-1000 ease-in-out animate-gradient-flow"
            style={{
              background: currentFinish.gradient,
              animationDuration: `${animationDuration}s`,
              animationPlayState: i < 0.1 ? 'paused' : 'running',
              opacity: 0.06 + i * 0.84,
              filter: i < 0.1 ? 'grayscale(0.6) brightness(0.3)' : 'none',
            }}
          />

          {/* Dark overlay that fades in when lamp turns off */}
          <div
            className="absolute inset-0 transition-opacity duration-1000 ease-in-out pointer-events-none"
            style={{
              backgroundColor: 'rgb(0,0,0)',
              opacity: (1 - i) * 0.75,
            }}
          />

          {/* Glowing effect inside backdrop */}
          <div
            className="absolute w-80 h-80 rounded-full filter blur-[80px] pointer-events-none transition-[opacity,background-color] duration-1000 ease-in-out"
            style={{
              backgroundColor: currentFinish.activeColor,
              opacity: 0.05 + i2 * 0.7,
            }}
          />

          {/* Simulated Desktop Window App Mockup */}
          <div className="relative z-10 w-full max-w-md bg-black/40 backdrop-blur-xl border border-white/10 rounded-[28px] p-6 shadow-none max-sm:mx-4 animate-fade-in text-left">
            {/* Window Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
                <span className="ml-2 text-[9px] text-white/50 uppercase tracking-wider">
                  Lumus Control · {currentFinish.label}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[8px] text-emerald-400 uppercase tracking-wider">
                  Local
                </span>
              </div>
            </div>

            {/* Glowing bulb icon representation */}
            <div className="py-6 flex flex-col items-center justify-center relative">
              {/* Bulb wrapper — single fade control, no thresholds */}
              <div
                className="transition-opacity duration-700"
                style={{ opacity: 0.1 + i * 0.9 }}
              >
                <div
                  className={`w-24 h-24 mx-auto rounded-full border flex items-center justify-center transition-[background,border-color,box-shadow] duration-700 ${i > 0.3 ? 'animate-breathe' : ''
                    }`}
                  style={{
                    background: `radial-gradient(circle at 38% 32%, ${currentFinish.activeColor} 0%, rgba(255,255,255,${0.15 * i2}) 60%, rgba(255,255,255,${0.02 * i2}) 100%)`,
                    borderColor: `rgba(255,255,255,${0.08 + i * 0.85})`,
                    boxShadow: `0 0 ${i * 100}px ${i * 20}px ${currentFinish.activeColor}`,
                  }}
                >
                  <Sparkles
                    className="w-8 h-8 transition-[color,transform] duration-500"
                    style={{
                      color: currentFinish.activeColor,
                      opacity: 0.2 + i * 0.8,
                      transform: `scale(${0.7 + i * 0.55})`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-4.5 text-center">
                <span className="font-semibold text-xs text-white block">
                  Lámpara Estudio ({currentFinish.label})
                </span>
                <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider mt-0.5 inline-block">
                  {lampOn ? `Encendida · Brillo ${brightness}%` : 'Apagada'}
                </span>
              </div>
            </div>

            {/* Simplified Mockup Dashboard Controls */}
            <div className="space-y-4 pt-4.5 border-t border-white/10">
              {/* Switcher Row */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                  Estado de Energía
                </span>
                <button
                  onClick={() => setLampOn(!lampOn)}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors active:scale-95 ${lampOn
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-white/5 text-white/60 border border-white/10'
                    }`}
                >
                  {lampOn ? 'Apagar' : 'Encender'}
                </button>
              </div>

              {/* Slider Row */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-white/50">
                  <span>Brillo</span>
                  <span>{brightness}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={brightness}
                  disabled={!lampOn}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full accent-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
