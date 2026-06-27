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
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-6 shadow-none">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Theme Preferences Card */}
        <div className="glass-card space-y-4 shadow-none">
          <div className="flex items-center gap-2 border-b border-theme-border pb-3">
            <Sun className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="font-semibold text-xs text-theme-text uppercase tracking-wider tracking-apple-body">Aspecto de la App</h3>
              <p className="text-[10px] text-theme-textSecondary mt-0.5 tracking-apple-body-sm">Elige el tema visual para la interfaz.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            {/* Light Mode Selector Card */}
            <button
              onClick={() => handleThemeChange('light')}
              className={`p-4 rounded-[28px] text-center flex flex-col items-center justify-center gap-2.5 transition-colors duration-200 active:scale-95 shadow-none ${theme === 'light'
                  ? 'border-theme-border/0 bg-theme-text/[0.08] text-theme-text font-semibold ring-1 ring-inset ring-theme-accent/40'
                  : 'border-theme-border/0 bg-theme-card text-theme-textSecondary hover:bg-theme-input'
                }`}
            >
              <div className="w-10 h-10 rounded-full bg-theme-card border border-theme-border flex items-center justify-center text-amber-500">
                <Sun className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1 font-bold text-xs tracking-apple-body">
                <span>Claro</span>
                {theme === 'light' && <Check className="w-3.5 h-3.5" />}
              </div>
            </button>

            {/* Dark Mode Selector Card */}
            <button
              onClick={() => handleThemeChange('dark')}
              className={`p-4 rounded-[28px] text-center flex flex-col items-center justify-center gap-2.5 transition-colors duration-200 active:scale-95 shadow-none ${theme === 'dark'
                  ? 'border-theme-border/0 bg-theme-text/[0.08] text-theme-text font-semibold ring-1 ring-inset ring-theme-accent/40'
                  : 'border-theme-border/0 bg-theme-card text-theme-textSecondary hover:bg-theme-input'
                }`}
            >
              <div className="w-10 h-10 rounded-full bg-theme-card border border-theme-border flex items-center justify-center text-indigo-400">
                <Moon className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1 font-bold text-xs tracking-apple-body">
                <span>Oscuro</span>
                {theme === 'dark' && <Check className="w-3.5 h-3.5" />}
              </div>
            </button>
          </div>
        </div>

        {/* Diagnostics & Connection Card */}
        <div className="glass-card space-y-4 shadow-none">
          <div className="flex items-center justify-between border-b border-theme-border pb-3">
            <div className="flex items-center gap-2">
              <Wifi className="w-5 h-5 text-emerald-500" />
              <div>
                <h3 className="font-semibold text-xs text-theme-text uppercase tracking-wider tracking-apple-body">Conexión y Red</h3>
                <p className="text-[10px] text-theme-textSecondary mt-0.5 tracking-apple-body-sm">Estado técnico del dispositivo activo.</p>
              </div>
            </div>
            {selectedIp && (
              <button
                onClick={handleTestConnection}
                title="Probar conexión"
                aria-label="Probar conexión con el dispositivo"
                className="p-2 hover:bg-theme-input rounded-full border border-theme-border text-theme-textSecondary hover:text-theme-text transition-colors active:scale-95 flex items-center justify-center shadow-none"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="space-y-3 pt-1">
            {selectedIp ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-theme-card border border-theme-border rounded-[28px] p-4 shadow-none">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-theme-textSecondary font-semibold uppercase tracking-wider tracking-apple-body-sm">Dirección IP</span>
                    <span className=" text-xs text-theme-text font-bold mt-0.5">{selectedIp}</span>
                  </div>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border shadow-none ${isConnected
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      : 'bg-red-500/10 text-red-500 border-red-500/20'
                    }`}>
                    {isConnected ? 'En Línea' : 'Desconectado'}
                  </span>
                </div>
                <div className="flex justify-between text-xs tracking-apple-body">
                  <span className="text-theme-textSecondary font-medium">Estado de Conexión</span>
                  <span className="font-bold text-theme-text">{connectionStatus}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 bg-theme-card/30 border border-dashed border-theme-border rounded-[28px] shadow-none">
                <ShieldAlert className="w-6 h-6 text-theme-textSecondary/40 mx-auto mb-1.5" />
                <p className="text-xs text-theme-textSecondary font-semibold tracking-apple-body">Ninguna lámpara seleccionada</p>
                <p className="text-[10px] text-theme-textSecondary/70 mt-0.5 tracking-apple-body-sm">Selecciona un dispositivo en la barra lateral.</p>
              </div>
            )}

            <button
              onClick={scan}
              disabled={isScanning}
              className="w-full py-2.5 bg-theme-card hover:bg-theme-input border border-theme-border text-theme-text text-xs font-bold rounded-full transition-colors duration-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-none"
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
      <div className="glass-card space-y-5 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-theme-border pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-theme-accent" />
            <div>
              <h3 className="font-semibold text-xs text-theme-text uppercase tracking-wider tracking-apple-body">Ritmo Circadiano</h3>
              <p className="text-[10px] text-theme-textSecondary mt-0.5 tracking-apple-body-sm">
                Simulación del ciclo de luz solar natural que cambia brillo y temperatura según la hora.
              </p>
            </div>
          </div>
          {selectedIp && (
            <button
              onClick={applyCircadianRhythm}
              disabled={isSyncingLocation || circadianActive}
              className="px-5 py-2.5 bg-theme-accent hover:bg-theme-accent/90 disabled:bg-theme-accent/50 disabled:text-white/60 text-white rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors duration-200 active:scale-95 shadow-none"
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
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-theme-card/30 border border-theme-border rounded-[28px] text-[11px] justify-between shadow-none">
            <div className="flex items-center gap-2 text-theme-text font-semibold tracking-apple-body-sm">
              <MapPin className="w-3.5 h-3.5 text-theme-accent shrink-0" />
              <span>
                {location.city ? `${location.city}, ${location.country || ''}` : `Lat: ${location.latitude.toFixed(3)}, Lng: ${location.longitude.toFixed(3)}`}
              </span>
              <span className="text-[10px] text-theme-textSecondary font-normal ">
                (Sincronizado: {new Date(location.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </span>
            </div>
            <div className="flex items-center gap-3 text-theme-textSecondary  font-semibold tracking-apple-body-sm">
              <span className="flex items-center gap-1">
                <Sun className="w-3 h-3 text-amber-500 shrink-0" />
                Amanecer: {formatHour(location.sunriseHour)}
              </span>
              <span className="text-theme-border font-normal">|</span>
              <span className="flex items-center gap-1">
                <Moon className="w-3 h-3 text-indigo-500 shrink-0" />
                Ocaso: {formatHour(location.sunsetHour)}
              </span>
            </div>
          </div>
        )}

        {syncLocationError && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-[28px] text-xs flex items-center gap-2 animate-fade-in shadow-none">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span className="tracking-apple-body-sm">{syncLocationError}</span>
          </div>
        )}

        {/* Informative description */}
        <div className="flex gap-2.5 p-5 bg-theme-accent/10 border border-theme-accent/20 rounded-[28px] text-xs text-theme-accent shadow-none">
          <Info className="w-4 h-4 shrink-0 text-theme-accent" />
          <p className="leading-relaxed text-[11px] tracking-apple-body-sm">
            El ritmo circadiano automatiza tu luz. En las mañanas la luz estimula con tonos fríos y brillantes; por la tarde va templando la luz, y en la noche baja la intensidad a tonos ultra cálidos para favorecer la producción de melatonina y mejorar tu sueño.
          </p>
        </div>

        {/* Horizontal visual timeline */}
        <div className="space-y-3 pt-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-theme-textSecondary block tracking-apple-body-sm">
            Cronograma del ciclo diario
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {circadianPoints.map((point) => {
              const rgb = kelvinToRgb(point.temp);
              const swatchColor = `rgb(${rgb.join(',')})`;

              return (
                <div
                  key={point.name}
                  className="bg-theme-card border border-theme-border rounded-[28px] p-4 flex flex-col justify-between space-y-3 hover:border-theme-border transition-colors shadow-none"
                >
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-theme-text tracking-apple-body">{point.name}</span>
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-theme-border/60 shadow-none"
                        style={{ backgroundColor: swatchColor }}
                      />
                    </div>
                    <span className=" text-[9px] text-theme-textSecondary/85 block">{point.time}</span>
                  </div>
                  <p className="text-[10px] text-theme-textSecondary leading-normal min-h-[36px] tracking-apple-body-sm">
                    {point.desc}
                  </p>
                  <div className="flex justify-between text-[9px] border-t border-theme-border pt-2 font-bold tracking-apple-body-sm">
                    <span className="text-theme-textSecondary">Brillo: {point.dimming}%</span>
                    <span className="text-theme-textSecondary ">{point.temp}K</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* About Card */}
      <div className="glass-card space-y-4 shadow-none">
        <div className="flex items-center gap-2 border-b border-theme-border pb-3">
          <Code2 className="w-5 h-5 text-theme-textSecondary" />
          <div>
            <h3 className="font-semibold text-xs text-theme-text uppercase tracking-wider tracking-apple-body">Acerca de</h3>
            <p className="text-[10px] text-theme-textSecondary mt-0.5 tracking-apple-body-sm">Información de la aplicación y el desarrollador.</p>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between bg-theme-card border border-theme-border rounded-[28px] p-4 shadow-none">
            <div className="flex flex-col">
              <span className="text-[10px] text-theme-textSecondary font-semibold uppercase tracking-wider tracking-apple-body-sm">Lumus Control</span>
              <span className="text-xs text-theme-text font-bold mt-0.5">v{__APP_VERSION__}</span>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold border border-theme-accent/20 bg-theme-accent/10 text-theme-accent shadow-none">
              Tauri + React
            </span>
          </div>

          <div className="bg-theme-card border border-theme-border rounded-[28px] p-4 space-y-2 shadow-none">
            <div className="flex items-center gap-2">
              <Github className="w-3.5 h-3.5 text-theme-textSecondary" />
              <span className="text-[10px] text-theme-textSecondary font-semibold uppercase tracking-wider tracking-apple-body-sm">Desarrollado por</span>
            </div>
            <p className="text-xs text-theme-text font-bold tracking-apple-body">
              dotfn &mdash; <a href="https://github.com/dotfn" target="_blank" rel="noopener noreferrer" className="text-theme-accent hover:underline transition-colors">github.com/dotfn</a>
            </p>
            <p className="text-[10px] text-theme-textSecondary">
              <a href="https://github.com/dotfn/lumus-control" target="_blank" rel="noopener noreferrer" className="hover:text-theme-accent hover:underline transition-colors">github.com/dotfn/lumus-control</a>
            </p>
          </div>

          <p className="text-[9px] text-theme-textSecondary/60 text-center pt-1 font-medium tracking-apple-body-sm">
            Panel local para controlar lámparas WiZ via UDP &mdash; Licencia MIT
          </p>
        </div>
      </div>
    </div>
  );
};
