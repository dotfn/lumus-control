import React, { useState, useEffect } from 'react';
import { Moon, Play, Square, Sparkles, Clock } from 'lucide-react';

interface TimerViewProps {
  isActive: boolean;
  onStartTimer: (minutes: number, fadeOut: boolean) => void;
  onCancelTimer: () => void;
  remainingSeconds: number;
  totalSeconds: number;
  fadeOutEnabled: boolean;
}

export const TimerView: React.FC<TimerViewProps> = ({
  isActive,
  onStartTimer,
  onCancelTimer,
  remainingSeconds,
  totalSeconds,
  fadeOutEnabled,
}) => {
  const [minutes, setMinutes] = useState(15);
  const [fadeOut, setFadeOut] = useState(true);
  const [estimatedOffTime, setEstimatedOffTime] = useState<string>('');

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    onStartTimer(minutes, fadeOut);
  };

  // Calculate estimated off time when remainingSeconds changes
  useEffect(() => {
    if (isActive && remainingSeconds > 0) {
      const offDate = new Date();
      offDate.setSeconds(offDate.getSeconds() + remainingSeconds);
      const hrs = offDate.getHours().toString().padStart(2, '0');
      const mins = offDate.getMinutes().toString().padStart(2, '0');
      setEstimatedOffTime(`${hrs}:${mins}`);
    }
  }, [isActive, remainingSeconds]);

  // SVG Circumference calculation
  const radius = 70;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <div className="max-w-md mx-auto space-y-6 animate-fade-in">
      {!isActive ? (
        <div className="glass-card space-y-5">
          <div className="flex items-center gap-2 border-b border-theme-border pb-3">
            <Moon className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-semibold text-xs text-theme-text uppercase tracking-wider">Temporizador de apagado</h3>
              <p className="text-[10px] text-theme-textSecondary mt-0.5">Apaga tu lámpara gradualmente para conciliar el sueño.</p>
            </div>
          </div>

          {/* Quick presets grid */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-theme-textSecondary block">
              Seleccionar Tiempo
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[15, 30, 45, 60, 90, 120].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setMinutes(t)}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-all duration-150 flex flex-col items-center justify-center gap-1 ${
                    minutes === t
                      ? 'bg-indigo-500/10 border-indigo-400/50 text-indigo-200 shadow-[0_0_8px_rgba(99,102,241,0.15)]'
                      : 'bg-theme-input/55 border-theme-border text-theme-textSecondary hover:bg-theme-border hover:text-theme-text'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 opacity-80" />
                  <span>{t} min</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Duration Input */}
          <div className="space-y-2 bg-theme-input/30 p-3 border border-theme-border rounded-xl">
            <div className="flex justify-between items-center text-[10px] text-theme-textSecondary font-semibold uppercase tracking-wider">
              <label htmlFor="custom-time">Duración Personalizada</label>
              <span>{minutes} Minutos</span>
            </div>
            <input
              id="custom-time"
              type="range"
              min="1"
              max="180"
              value={minutes}
              onChange={(e) => setMinutes(parseInt(e.target.value, 10))}
              className="w-full"
              aria-label={`Duración: ${minutes} minutos`}
            />
          </div>

          {/* Fade-out toggle checkbox */}
          <label className="flex items-center gap-3 p-3 bg-theme-input/30 border border-theme-border rounded-xl cursor-pointer select-none group text-xs text-theme-textSecondary hover:text-theme-text transition-colors">
            <input
              type="checkbox"
              checked={fadeOut}
              onChange={(e) => setFadeOut(e.target.checked)}
              className="accent-indigo-500 w-4 h-4 rounded-md cursor-pointer"
            />
            <div className="flex-1">
              <span className="font-semibold flex items-center gap-1 text-theme-text">
                Desvanecimiento gradual
                <Sparkles className="w-3 h-3 text-indigo-400" />
              </span>
              <p className="text-[10px] text-theme-textSecondary/80 mt-0.5">La intensidad de la luz disminuirá progresivamente hasta apagarse.</p>
            </div>
          </label>

          {/* Action button */}
          <button
            onClick={handleStart}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-[0_4px_16px_rgba(99,102,241,0.25)] hover:shadow-[0_4px_20px_rgba(99,102,241,0.35)] active:scale-98"
          >
            <Play className="w-4 h-4 fill-current" />
            Iniciar Temporizador
          </button>
        </div>
      ) : (
        <div className="glass-card flex flex-col items-center justify-center text-center p-6 space-y-6">
          <div className="flex items-center justify-between w-full border-b border-theme-border pb-3 mb-2">
            <span className="text-xs font-semibold text-theme-textSecondary uppercase tracking-wider flex items-center gap-1.5">
              <Moon className="w-4 h-4 text-indigo-400" />
              Temporizador Activo
            </span>
            <span className="text-[10px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-semibold animate-pulse">
              Cuenta Regresiva
            </span>
          </div>

          {/* Radial Progress Circle Countdown */}
          <div className="relative flex items-center justify-center my-4">
            <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
              {/* Background circle track */}
              <circle
                stroke="var(--border-color)"
                fill="transparent"
                strokeWidth={stroke}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
                className="opacity-20"
              />
              {/* Glowing active progress circle */}
              <circle
                stroke="rgb(99, 102, 241)"
                fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={circumference + ' ' + circumference}
                style={{ strokeDashoffset }}
                strokeLinecap="round"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-bold font-mono text-theme-text leading-none">
                {formatTime(remainingSeconds)}
              </span>
              <span className="text-[9px] text-theme-textSecondary uppercase font-semibold tracking-wider mt-1">
                Restante
              </span>
            </div>
          </div>

          {/* Details info block */}
          <div className="w-full bg-theme-input/40 border border-theme-border rounded-2xl p-4 text-xs text-left space-y-2">
            <div className="flex justify-between border-b border-theme-border pb-2">
              <span className="text-theme-textSecondary font-semibold">Apagado Programado</span>
              <span className="font-bold text-theme-text">{estimatedOffTime}</span>
            </div>
            <div className="flex justify-between border-b border-theme-border pb-2">
              <span className="text-theme-textSecondary font-semibold">Desvanecimiento</span>
              <span className="font-bold text-theme-text">{fadeOutEnabled ? 'Activado' : 'Desactivado'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-theme-textSecondary font-semibold">Duración Total</span>
              <span className="font-bold text-theme-text">{Math.round(totalSeconds / 60)} min</span>
            </div>
          </div>

          {/* Stop / Cancel button */}
          <button
            onClick={onCancelTimer}
            className="w-full py-3 bg-theme-input hover:bg-theme-border border border-theme-border text-theme-text rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <Square className="w-4 h-4 fill-current text-red-500/80" />
            Cancelar Temporizador
          </button>
        </div>
      )}
    </div>
  );
};
