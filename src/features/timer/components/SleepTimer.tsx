import React, { useState } from 'react';
import { Moon, Play, Square, Sparkles } from 'lucide-react';

interface SleepTimerProps {
  isActive: boolean;
  onStartTimer: (minutes: number, fadeOut: boolean) => void;
  onCancelTimer: () => void;
  remainingSeconds: number;
  fadeOutEnabled: boolean;
}

export const SleepTimer: React.FC<SleepTimerProps> = ({
  isActive,
  onStartTimer,
  onCancelTimer,
  remainingSeconds,
  fadeOutEnabled,
}) => {
  const [minutes, setMinutes] = useState(15);
  const [fadeOut, setFadeOut] = useState(true);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    onStartTimer(minutes, fadeOut);
  };

  return (
    <div className="space-y-3.5 p-4 bg-theme-input border border-theme-border rounded-[28px] transition-colors duration-300">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-theme-textSecondary flex items-center gap-1.5 font-display transition-colors duration-300">
          <Moon className="w-3.5 h-3.5 text-indigo-400" />
          Temporizador de apagado
        </label>
        {isActive && (
          <span className="text-xs  text-indigo-400 animate-pulse">
            Activo · {formatTime(remainingSeconds)}
          </span>
        )}
      </div>

      {!isActive ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            {[15, 30, 45, 60].map((t) => (
              <button
                key={t}
                onClick={() => setMinutes(t)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  minutes === t
                    ? 'bg-indigo-500/10 border-indigo-400/30 text-indigo-200'
                    : 'bg-theme-input border border-theme-border text-theme-textSecondary hover:bg-theme-border hover:text-theme-text'
                }`}
              >
                {t} min
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none group text-xs text-theme-textSecondary hover:text-theme-text transition-colors">
            <input
              type="checkbox"
              checked={fadeOut}
              onChange={(e) => setFadeOut(e.target.checked)}
              className="accent-indigo-500 w-3.5 h-3.5"
            />
            <span className="flex items-center gap-1">
              Desvanecimiento gradual (Fade-out)
              <Sparkles className="w-3 h-3 text-indigo-400/80" />
            </span>
          </label>

          <button
            onClick={handleStart}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-none"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Iniciar temporizador
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-theme-textSecondary leading-relaxed transition-colors duration-300">
            La lámpara se apagará en{' '}
            <span className="font-semibold text-theme-text">{formatTime(remainingSeconds)}</span>
            {fadeOutEnabled && ' reduciendo el brillo paulatinamente.'}
          </p>
          <button
            onClick={onCancelTimer}
            className="w-full py-2 bg-theme-input hover:bg-theme-border border border-theme-border text-theme-text rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-none"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            Cancelar temporizador
          </button>
        </div>
      )}
    </div>
  );
};
