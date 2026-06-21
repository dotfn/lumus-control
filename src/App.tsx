import React, { useEffect } from 'react';
import { Sparkles, Sun } from 'lucide-react';
import { kelvinToRgb } from './utils/color';
import { WIZ_SCENES } from './features/lighting/components/SceneSelector';

// Stores
import { useDeviceStore } from './features/devices/store/deviceStore';
import { useLightingStore } from './features/lighting/store/lightingStore';
import { useTimerStore } from './features/timer/store/timerStore';
import { useSettingsStore } from './features/settings/store/settingsStore';

// Hooks
import { useWizLightEvents } from './features/lighting/hooks/useWizLightEvents';
import { useSleepTimerCountdown } from './features/timer/hooks/useSleepTimerCountdown';

// Components
import { Titlebar } from './features/layout/components/Titlebar';
import { DeviceSelector } from './features/devices/components/DeviceSelector';
import { LightController } from './features/lighting/components/LightController';
import { SceneSelector } from './features/lighting/components/SceneSelector';
import { SleepTimer } from './features/timer/components/SleepTimer';

export const App: React.FC = () => {
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
    timerFadeOut,
    startTimer,
    cancelTimer,
  } = useTimerStore();

  // Native events & timer side-effects (React hook lifecycle wrapper)
  useWizLightEvents();
  useSleepTimerCountdown();

  const initTheme = useSettingsStore((state) => state.initTheme);

  // Initialize theme, load preferences and scan local network on mount
  useEffect(() => {
    initTheme();
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
        const scene = WIZ_SCENES.find((s) => s.id === lampState.sceneId);
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

  // Determine current active color for dynamic border or glow
  const currentRgbString = () => {
    let rgb = [255, 180, 84];
    if (lampState.state) {
      if (lampState.sceneId !== undefined) {
        const scene = WIZ_SCENES.find((s) => s.id === lampState.sceneId);
        if (scene) return scene.colors[0]; // fallback Hex
      } else if (lampState.temp !== undefined) {
        rgb = kelvinToRgb(lampState.temp);
      } else if (lampState.r !== undefined) {
        rgb = [lampState.r, lampState.g ?? 0, lampState.b ?? 0];
      }
    }
    return `rgb(${rgb.join(',')})`;
  };

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
      <div className="flex-1 flex overflow-hidden pt-12">
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
        <main className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6 custom-scrollbar bg-theme-main transition-colors duration-300">
          {/* Header Section */}
          <header className="flex items-center justify-between pb-4 border-b border-theme-border transition-colors duration-300">
            <div>
              <h1 className="font-display font-bold text-xl tracking-tight text-theme-text flex items-center gap-2 transition-colors duration-300">
                WiZ Control
                {circadianActive && (
                  <span className="text-[10px] bg-blue-500/15 text-blue-500 border border-blue-500/30 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 animate-bounce">
                    <Sparkles className="w-2.5 h-2.5" />
                    Sincronizado
                  </span>
                )}
              </h1>
              <p className="text-[10px] text-theme-textSecondary font-mono mt-0.5 flex items-center gap-1.5 font-semibold transition-colors duration-300">
                {isConnected ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                )}
                <span className="ml-1">{selectedIp ? `${connectionStatus} · ${selectedIp}` : connectionStatus}</span>
              </p>
            </div>

            <button
              onClick={applyCircadianRhythm}
              title="Sincronizar ritmo circadiano"
              className="p-2 hover:opacity-80 active:scale-95 rounded-xl border border-theme-border text-theme-accent bg-theme-input transition-all flex items-center gap-1.5 text-xs"
            >
              <Sun className="w-4 h-4" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">Circadiano</span>
            </button>
          </header>

          {selectedIp ? (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Main Controls (Orb + Sliders + Scenes) */}
              <div className="xl:col-span-7 space-y-6">
                {/* Breathing Orb Visualization */}
                <div className="flex justify-center py-6 bg-theme-input rounded-2xl border border-theme-border shadow-[inset_0_1px_1px_var(--border-color)]">
                  <div
                    className={`w-36 h-36 rounded-full border border-theme-border relative transition-all duration-700 ${
                      lampState.state ? 'animate-breathe' : ''
                    }`}
                    style={{
                      background: lampState.state
                        ? `radial-gradient(circle at 38% 32%, ${currentRgbString()} 0%, rgba(var(--glow-color), 0.3) 60%, rgba(255,255,255,0.01) 100%)`
                        : 'radial-gradient(circle at 38% 32%, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
                      boxShadow: lampState.state
                        ? `0 0 calc((20px + 60px * (var(--glow-strength))) * var(--glow-strength-multiplier, 1.0)) calc((2px + 12px * (var(--glow-strength))) * var(--glow-strength-multiplier, 1.0)) rgba(var(--glow-color), 0.3), inset 0 0 15px rgba(255,255,255,0.06)`
                        : 'none',
                    }}
                  />
                </div>

                {/* Light Controller */}
                <LightController state={lampState} onStateChange={setLampState} />

                {/* WiZ Scene Selector */}
                <SceneSelector currentSceneId={lampState.sceneId} onSelectScene={(id) => setLampState({ sceneId: id, state: true, temp: undefined })} />
              </div>

              {/* Sidebar controls: sleep timer, etc. */}
              <div className="xl:col-span-5 space-y-6">
                <SleepTimer
                  isActive={timerActive}
                  onStartTimer={handleStartTimer}
                  onCancelTimer={cancelTimer}
                  remainingSeconds={timerSeconds}
                  fadeOutEnabled={timerFadeOut}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 border border-dashed border-theme-border rounded-2xl bg-theme-input">
              <p className="text-sm text-theme-textSecondary text-center max-w-sm transition-colors duration-300">
                Selecciona una lámpara de la red local o introduce una IP manualmente en el panel izquierdo para comenzar a controlarla.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
