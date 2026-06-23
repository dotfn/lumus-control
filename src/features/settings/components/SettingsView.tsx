import React from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useDeviceStore } from '../../devices/store/deviceStore';
import { useLightingStore } from '../../lighting/store/lightingStore';
import { Sun, Moon, Info, RefreshCw, Sparkles, Check, Wifi, ShieldAlert } from 'lucide-react';
import { kelvinToRgb } from '../../../utils/color';

export const SettingsView: React.FC = () => {
  const { theme, toggleTheme } = useSettingsStore();
  const { selectedIp, connectionStatus, scan, isScanning } = useDeviceStore();
  const { isConnected, refreshState, applyCircadianRhythm, circadianActive } = useLightingStore();

  const handleThemeChange = (selectedTheme: 'light' | 'dark') => {
    if (theme !== selectedTheme) {
      toggleTheme(selectedIp);
    }
  };

  const handleTestConnection = () => {
    if (selectedIp) {
      refreshState(selectedIp);
    }
  };

  // Circadian Rhythm timeline points
  const circadianPoints = [
    { time: '00:00 - 06:00', temp: 2200, dimming: 15, name: 'Madrugada', desc: 'Luz cálida y suave para descansar' },
    { time: '06:00 - 09:00', temp: 3000, dimming: 60, name: 'Amanecer', desc: 'Luz moderada para despertar' },
    { time: '09:00 - 17:00', temp: 5000, dimming: 100, name: 'Día', desc: 'Blanco frío para concentración' },
    { time: '17:00 - 20:00', temp: 3500, dimming: 70, name: 'Tarde', desc: 'Temperatura y brillo medios' },
    { time: '20:00 - 24:00', temp: 2700, dimming: 40, name: 'Noche', desc: 'Relajante antes de dormir' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Theme Preferences Card */}
        <div className="glass-card space-y-4">
          <div className="flex items-center gap-2 border-b border-theme-border pb-3">
            <Sun className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="font-semibold text-xs text-theme-text uppercase tracking-wider">Aspecto de la App</h3>
              <p className="text-[10px] text-theme-textSecondary mt-0.5">Elige el tema visual para la interfaz.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            {/* Light Mode Selector Card */}
            <button
              onClick={() => handleThemeChange('light')}
              className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-center gap-2.5 transition-all ${
                theme === 'light'
                  ? 'border-blue-500 bg-blue-500/5 text-blue-600 dark:text-blue-400 font-semibold shadow-sm'
                  : 'border-theme-border bg-theme-input/40 text-theme-textSecondary hover:bg-theme-input'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center text-amber-500">
                <Sun className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs">Claro</span>
                {theme === 'light' && <Check className="w-3.5 h-3.5" />}
              </div>
            </button>

            {/* Dark Mode Selector Card */}
            <button
              onClick={() => handleThemeChange('dark')}
              className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-center gap-2.5 transition-all ${
                theme === 'dark'
                  ? 'border-blue-500 bg-blue-500/5 text-blue-400 font-semibold shadow-sm'
                  : 'border-theme-border bg-theme-input/40 text-theme-textSecondary hover:bg-theme-input'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-slate-800 dark:bg-slate-900 flex items-center justify-center text-indigo-400">
                <Moon className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs">Oscuro</span>
                {theme === 'dark' && <Check className="w-3.5 h-3.5" />}
              </div>
            </button>
          </div>
        </div>

        {/* Diagnostics & Connection Card */}
        <div className="glass-card space-y-4">
          <div className="flex items-center justify-between border-b border-theme-border pb-3">
            <div className="flex items-center gap-2">
              <Wifi className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="font-semibold text-xs text-theme-text uppercase tracking-wider">Conexión y Red</h3>
                <p className="text-[10px] text-theme-textSecondary mt-0.5">Estado técnico del dispositivo activo.</p>
              </div>
            </div>
            {selectedIp && (
              <button
                onClick={handleTestConnection}
                title="Probar conexión"
                aria-label="Probar conexión con el dispositivo"
                className="p-1.5 hover:bg-theme-border rounded-xl border border-theme-border text-theme-textSecondary hover:text-theme-text transition-all active:scale-95 flex items-center justify-center"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="space-y-3 pt-1">
            {selectedIp ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-theme-input/40 border border-theme-border rounded-xl p-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-theme-textSecondary font-semibold uppercase tracking-wider">Dirección IP</span>
                    <span className="font-mono text-xs text-theme-text font-bold mt-0.5">{selectedIp}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    isConnected
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-red-500/10 text-red-400 border-red-500/30'
                  }`}>
                    {isConnected ? 'En Línea' : 'Desconectado'}
                  </span>
                </div>
                <div className="flex justify-between text-xs transition-colors duration-300">
                  <span className="text-theme-textSecondary font-medium">Estado de Conexión</span>
                  <span className="font-semibold text-theme-text">{connectionStatus}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 bg-theme-input/20 border border-dashed border-theme-border rounded-xl">
                <ShieldAlert className="w-6 h-6 text-theme-textSecondary/40 mx-auto mb-1.5" />
                <p className="text-xs text-theme-textSecondary font-semibold">Ninguna lámpara seleccionada</p>
                <p className="text-[10px] text-theme-textSecondary/75 mt-0.5">Selecciona un dispositivo en la barra lateral.</p>
              </div>
            )}

            <button
              onClick={scan}
              disabled={isScanning}
              className="w-full py-2 bg-theme-input hover:bg-theme-border border border-theme-border text-theme-text text-xs font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Buscando...
                </>
              ) : (
                'Escanear Red Local'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Circadian Rhythm Card */}
      <div className="glass-card space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-theme-border pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-semibold text-xs text-theme-text uppercase tracking-wider">Ritmo Circadiano</h3>
              <p className="text-[10px] text-theme-textSecondary mt-0.5">
                Simulación del ciclo de luz solar natural que cambia brillo y temperatura según la hora.
              </p>
            </div>
          </div>
          {selectedIp && (
            <button
              onClick={applyCircadianRhythm}
              disabled={circadianActive}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_2px_10px_rgba(59,130,246,0.2)]"
            >
              <Sun className={`w-3.5 h-3.5 ${circadianActive ? 'animate-spin' : ''}`} />
              Sincronizar Ahora
            </button>
          )}
        </div>

        {/* Informative description */}
        <div className="flex gap-2.5 p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-900 dark:text-blue-200">
          <Info className="w-4 h-4 shrink-0 text-blue-500" />
          <p className="leading-relaxed text-[11px]">
            El ritmo circadiano automatiza tu luz. En las mañanas la luz estimula con tonos fríos y brillantes; por la tarde va templando la luz, y en la noche baja la intensidad a tonos ultra cálidos para favorecer la producción de melatonina y mejorar tu sueño.
          </p>
        </div>

        {/* Horizontal visual timeline */}
        <div className="space-y-3 pt-2">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-theme-textSecondary block">
            Cronograma del ciclo diario
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {circadianPoints.map((point) => {
              const rgb = kelvinToRgb(point.temp);
              const swatchColor = `rgb(${rgb.join(',')})`;

              return (
                <div
                  key={point.name}
                  className="bg-theme-input/40 border border-theme-border rounded-xl p-3 flex flex-col justify-between space-y-3 hover:border-theme-border transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-theme-text">{point.name}</span>
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm"
                        style={{ backgroundColor: swatchColor }}
                      />
                    </div>
                    <span className="font-mono text-[9px] text-theme-textSecondary/85 block">{point.time}</span>
                  </div>
                  <p className="text-[10px] text-theme-textSecondary leading-normal min-h-[36px]">
                    {point.desc}
                  </p>
                  <div className="flex justify-between text-[9px] border-t border-theme-border pt-2 font-semibold">
                    <span className="text-theme-textSecondary">Brillo: {point.dimming}%</span>
                    <span className="text-theme-textSecondary font-mono">{point.temp}K</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
