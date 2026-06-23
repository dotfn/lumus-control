import React, { useEffect, useState } from 'react';
import { Sparkles, Sun, LayoutDashboard, Palette, Clock, Settings, Laptop } from 'lucide-react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { kelvinToRgb } from '../utils/color';
import { PRESET_SCENES } from '../features/lighting/components/SceneSelector';
import { isTauri } from '../utils/tauri';
import { useDemo } from '../context/DemoContext';

// Stores
import { useDeviceStore } from '../features/devices/store/deviceStore';
import { useLightingStore } from '../features/lighting/store/lightingStore';
import { useTimerStore } from '../features/timer/store/timerStore';
import { useSettingsStore } from '../features/settings/store/settingsStore';

// Hooks
import { useLightEvents } from '../features/lighting/hooks/useLightEvents';
import { useSleepTimerCountdown } from '../features/timer/hooks/useSleepTimerCountdown';

// Components
import { Titlebar } from '../features/layout/components/Titlebar';
import { DeviceSelector } from '../features/devices/components/DeviceSelector';
import { DashboardView } from '../features/lighting/components/DashboardView';
import { ScenesView } from '../features/lighting/components/ScenesView';
import { TimerView } from '../features/timer/components/TimerView';
import { SettingsView } from '../features/settings/components/SettingsView';

type TabId = 'dashboard' | 'scenes' | 'timer' | 'settings';

export const ControlPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const { isDemo } = useDemo();

  // Device store selector
  const {
    devices,
    selectedIp,
    isScanning,
    connectionStatus,
    loadPreferencesAndScan,
    selectDevice,
    updateDeviceName,
    scan,
  } = useDeviceStore();

  // Lighting store selector
  const {
    lampState,
    isConnected,
    circadianActive,
    setLampState,
    applyCircadianRhythm,
  } = useLightingStore();

  // Timer store selector
  const {
    timerActive,
    timerSeconds,
    totalTimerSeconds,
    timerFadeOut,
    startTimer,
    cancelTimer,
  } = useTimerStore();

  // Native events & timer side-effects (React hook lifecycle wrapper)
  useLightEvents();
  useSleepTimerCountdown();

  const initTheme = useSettingsStore((state) => state.initTheme);

  // Initialize theme, load preferences and scan local network on mount
  useEffect(() => {
    initTheme();
    // La ventana arranca oculta (visible: false en tauri.conf.json).
    // La mostramos aquí, una vez que el tema está aplicado, para evitar
    // que el usuario vea el flash blanco del primer paint.
    if (isTauri()) {
      try {
        getCurrentWebviewWindow().show().catch(() => {});
      } catch (e) {
        console.warn('Tauri window show is not available', e);
      }
    }
    loadPreferencesAndScan();
  }, [initTheme, loadPreferencesAndScan]);

  // Disable CSS transitions during window resizing to prevent layout/repaint lag and white background gaps
  useEffect(() => {
    let resizeTimer: number;
    const handleResize = () => {
      document.documentElement.classList.add('resizing');
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        document.documentElement.classList.remove('resizing');
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  // Update CSS custom properties for Dynamic Ambient Theme
  useEffect(() => {
    const isOn = lampState.state;
    let rgb: [number, number, number] = [255, 180, 84];

    if (isOn) {
      if (lampState.sceneId !== undefined) {
        const scene = PRESET_SCENES.find((s) => s.id === lampState.sceneId);
        if (scene && scene.colors.length > 0) {
          // Parse hex of first color of the scene
          const hex = scene.colors[0];
          const cleanHex = hex.replace('#', '');
          rgb = [
            parseInt(cleanHex.substring(0, 2), 16),
            parseInt(cleanHex.substring(2, 4), 16),
            parseInt(cleanHex.substring(4, 6), 16),
          ];
        }
      } else if (lampState.temp !== undefined) {
        rgb = kelvinToRgb(lampState.temp);
      } else if (lampState.r !== undefined) {
        rgb = [lampState.r, lampState.g ?? 0, lampState.b ?? 0];
      }
    }

    const glowStrength = isOn ? lampState.dimming / 100 : 0;
    document.documentElement.style.setProperty('--glow-color', rgb.join(','));
    document.documentElement.style.setProperty('--glow-strength', glowStrength.toString());
  }, [lampState]);

  const handleStartTimer = (mins: number, fadeOut: boolean) => {
    startTimer(mins, fadeOut, lampState.dimming);
  };

  return (
    <div className="w-full h-full bg-theme-bg flex flex-col overflow-hidden text-theme-text font-sans antialiased relative select-none transition-colors duration-300">
      <Titlebar />

      {/* Dynamic Background Glow Layer */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000 -z-10"
        style={{
          background: `radial-gradient(circle at 50% 0%, var(--glow-color) 0%, transparent 65%)`,
          opacity: `calc(0.04 * var(--glow-strength-multiplier, 1.0))`
        }}
      />

      {/* Main Container - Split View (Sidebar + Main Pane) */}
      <div className="flex-1 flex overflow-hidden pt-12 flex-col">
        {/* Banner de simulación interactiva si está en modo demo */}
        {isDemo && (
          <div className="bg-blue-500/10 border-b border-theme-border text-blue-400 px-5 py-2 text-xs flex justify-between items-center z-40 animate-fade-in">
            <div className="flex items-center gap-2 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              <span>
                <strong>Modo Demo Activo:</strong> Estás explorando la interfaz con un dispositivo virtual.
              </span>
            </div>
            <a
              href="/download"
              className="text-[10px] bg-blue-500 hover:bg-blue-600 text-white font-bold px-2 py-0.5 rounded transition-all flex items-center gap-1"
            >
              <Laptop className="w-3 h-3" /> Descargar App
            </a>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden w-full">
          {/* Left Sidebar Pane: Devices & Scanning */}
          <aside className="w-[280px] bg-theme-sidebar border-r border-theme-border flex flex-col p-5 overflow-y-auto space-y-6 flex-shrink-0 transition-colors duration-300">
            <DeviceSelector
              selectedIp={selectedIp}
              onSelect={selectDevice}
              devices={devices}
              onScan={scan}
              isScanning={isScanning}
              onUpdateDeviceName={updateDeviceName}
            />
          </aside>

          {/* Right Main Pane: Active Controls */}
          <main className="flex-1 flex flex-col overflow-hidden p-6 space-y-6 bg-theme-main transition-colors duration-300">
            {/* Header Section */}
            <header className="flex items-center justify-between pb-4 border-b border-theme-border transition-colors duration-300">
              <div>
                <h1 className="font-display font-bold text-xl tracking-tight text-theme-text flex items-center gap-2 transition-colors duration-300">
                  Lumus Control
                  {circadianActive && (
                    <span className="text-[10px] bg-blue-500/15 text-blue-500 border border-blue-500/30 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 animate-bounce">
                      <Sparkles className="w-2.5 h-2.5" />
                      Sincronizado
                    </span>
                  )}
                </h1>
                <p className="text-[10px] text-theme-textSecondary font-mono mt-0.5 flex items-center gap-1.5 font-semibold transition-colors duration-300">
                  {selectedIp && isConnected ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                  )}
                  <span className="ml-1">{selectedIp ? `${connectionStatus} · ${selectedIp}` : connectionStatus}</span>
                </p>
              </div>

              {selectedIp && (
                <button
                  onClick={applyCircadianRhythm}
                  title="Sincronizar ritmo circadiano"
                  className="p-2 hover:opacity-80 active:scale-95 rounded-xl border border-theme-border text-theme-accent bg-theme-input transition-all flex items-center gap-1.5 text-xs"
                >
                  <Sun className="w-4 h-4" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">Circadiano</span>
                </button>
              )}
            </header>

            {/* Navigation Bar */}
            <nav className="flex bg-theme-input border border-theme-border rounded-xl p-0.5 gap-0.5 max-w-md w-full transition-colors duration-300" role="tablist" aria-label="Secciones de control">
              {([
                { id: 'dashboard', label: 'Panel', icon: LayoutDashboard },
                { id: 'scenes', label: 'Escenas', icon: Palette },
                { id: 'timer', label: 'Temporizador', icon: Clock },
                { id: 'settings', label: 'Configuración', icon: Settings },
              ] as const).map((tab) => {
                const TabIcon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    id={`tab-${tab.id}`}
                    aria-selected={isActive}
                    aria-controls={`tabpanel-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all duration-150 ${
                      isActive
                        ? 'bg-theme-card text-theme-text shadow-sm'
                        : 'text-theme-textSecondary hover:text-theme-text font-normal'
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Tab Content Panel */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1" role="tabpanel" id="tabpanel-settings" aria-labelledby="tab-settings">
              {activeTab === 'settings' ? (
                <SettingsView />
              ) : selectedIp ? (
                <>
                  {activeTab === 'dashboard' && (
                    <DashboardView
                      lampState={lampState}
                      isConnected={isConnected}
                      setLampState={setLampState}
                      circadianActive={circadianActive}
                    />
                  )}
                  {activeTab === 'scenes' && (
                    <ScenesView
                      currentSceneId={lampState.sceneId}
                      onSelectScene={(id) => setLampState({ sceneId: id, state: true, temp: undefined })}
                    />
                  )}
                  {activeTab === 'timer' && (
                    <TimerView
                      isActive={timerActive}
                      onStartTimer={handleStartTimer}
                      onCancelTimer={cancelTimer}
                      remainingSeconds={timerSeconds}
                      totalSeconds={totalTimerSeconds}
                      fadeOutEnabled={timerFadeOut}
                    />
                  )}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 border border-dashed border-theme-border rounded-2xl bg-theme-input animate-fade-in">
                  <p className="text-sm text-theme-textSecondary text-center max-w-sm transition-colors duration-300">
                    Selecciona una lámpara de la lista o introduce una dirección en el panel izquierdo para comenzar a controlarla.
                  </p>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className="mt-4 px-4 py-2 bg-theme-input hover:bg-theme-border border border-theme-border rounded-xl text-xs font-semibold text-theme-text transition-all active:scale-95"
                  >
                    Ir a Configuración de Red
                  </button>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
