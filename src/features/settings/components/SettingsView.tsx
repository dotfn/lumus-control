import React from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useDeviceStore } from '../../devices/store/deviceStore';
import { useLightingStore } from '../../lighting/store/lightingStore';
import { Sun, Moon, Info, RefreshCw, Sparkles, Check, Wifi, ShieldAlert, Github, Code2, MapPin, Loader2 } from 'lucide-react';
import { kelvinToRgb } from '../../../utils/color';
import { getCircadianPoints, formatHour } from '../../lighting/utils/circadian';

export const SettingsView: React.FC = () => {
  const { theme, toggleTheme } = useSettingsStore();
  const { selectedIp, connectionStatus, scan, isScanning } = useDeviceStore();
  const { 
    isConnected, 
    refreshState, 
    applyCircadianRhythm, 
    circadianActive,
    location,
    isSyncingLocation,
    syncLocationError 
  } = useLightingStore();

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

  // Circadian Rhythm timeline points (dynamically adapted from geolocation)
  const sunriseHour = location ? location.sunriseHour : 6.0;
  const sunsetHour = location ? location.sunsetHour : 19.0;
  const circadianPoints = getCircadianPoints(sunriseHour, sunsetHour);

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
              disabled={isSyncingLocation || circadianActive}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-700/50 disabled:text-white/60 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_2px_10px_rgba(59,130,246,0.2)]"
            >
              {isSyncingLocation ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sun className={`w-3.5 h-3.5 ${circadianActive ? 'animate-spin' : ''}`} />
              )}
              {isSyncingLocation ? 'Sincronizando...' : 'Sincronizar Ahora'}
            </button>
          )}
        </div>

        {/* Geolocation status info */}
        {location && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-theme-input/30 border border-theme-border rounded-xl text-[11px] justify-between">
            <div className="flex items-center gap-2 text-theme-text font-medium">
              <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>
                {location.city ? `${location.city}, ${location.country || ''}` : `Lat: ${location.latitude.toFixed(3)}, Lng: ${location.longitude.toFixed(3)}`}
              </span>
              <span className="text-[10px] text-theme-textSecondary font-normal font-mono">
                (Sincronizado: {new Date(location.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </span>
            </div>
            <div className="flex items-center gap-3 text-theme-textSecondary font-mono font-semibold">
              <span className="flex items-center gap-1">
                <Sun className="w-3 h-3 text-amber-400 shrink-0" />
                Amanecer: {formatHour(location.sunriseHour)}
              </span>
              <span className="text-theme-border font-normal">|</span>
              <span className="flex items-center gap-1">
                <Moon className="w-3 h-3 text-blue-400 shrink-0" />
                Ocaso: {formatHour(location.sunsetHour)}
              </span>
            </div>
          </div>
        )}

        {syncLocationError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{syncLocationError}</span>
          </div>
        )}

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

      {/* About Card */}
      <div className="glass-card space-y-4">
        <div className="flex items-center gap-2 border-b border-theme-border pb-3">
          <Code2 className="w-5 h-5 text-theme-textSecondary" />
          <div>
            <h3 className="font-semibold text-xs text-theme-text uppercase tracking-wider">Acerca de</h3>
            <p className="text-[10px] text-theme-textSecondary mt-0.5">Información de la aplicación y el desarrollador.</p>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between bg-theme-input/40 border border-theme-border rounded-xl p-3">
            <div className="flex flex-col">
              <span className="text-[10px] text-theme-textSecondary font-semibold uppercase tracking-wider">Lumus Control</span>
              <span className="text-xs text-theme-text font-bold mt-0.5">v{__APP_VERSION__}</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border bg-blue-500/10 text-blue-400 border-blue-500/30">
              Tauri + React
            </span>
          </div>

          <div className="bg-theme-input/40 border border-theme-border rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Github className="w-3.5 h-3.5 text-theme-textSecondary" />
              <span className="text-[10px] text-theme-textSecondary font-semibold uppercase tracking-wider">Desarrollado por</span>
            </div>
            <p className="text-xs text-theme-text font-medium">
              dotfn &mdash; <a href="https://github.com/dotfn" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">github.com/dotfn</a>
            </p>
            <p className="text-[10px] text-theme-textSecondary">
              <a href="https://github.com/dotfn/lumus-control" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">github.com/dotfn/lumus-control</a>
            </p>
          </div>

          <p className="text-[9px] text-theme-textSecondary/60 text-center pt-1">
            Panel local para controlar lámparas WiZ via UDP &mdash; Licencia MIT
          </p>
        </div>
      </div>
    </div>
  );
};
