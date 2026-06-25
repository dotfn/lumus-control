import React, { useEffect, useState } from 'react';
import { Sparkles, Sun, LayoutDashboard, Palette, Clock, Settings, Laptop, X, Wifi } from 'lucide-react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { Link } from 'react-router-dom';
import { getLampRgbColor } from '../utils/color';
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
import { useCircadianAutoClear } from '../features/lighting/hooks/useCircadianAutoClear';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isDemo } = useDemo();

  // Device store selector
  const devices = useDeviceStore((s) => s.devices);
  const selectedIp = useDeviceStore((s) => s.selectedIp);
  const isScanning = useDeviceStore((s) => s.isScanning);
  const connectionStatus = useDeviceStore((s) => s.connectionStatus);
  const loadPreferencesAndScan = useDeviceStore((s) => s.loadPreferencesAndScan);
  const selectDevice = useDeviceStore((s) => s.selectDevice);
  const updateDeviceName = useDeviceStore((s) => s.updateDeviceName);
  const scan = useDeviceStore((s) => s.scan);

  // Lighting store selector
  const lampState = useLightingStore((s) => s.lampState);
  const isConnected = useLightingStore((s) => s.isConnected);
  const circadianActive = useLightingStore((s) => s.circadianActive);
  const setLampState = useLightingStore((s) => s.setLampState);
  const applyCircadianRhythm = useLightingStore((s) => s.applyCircadianRhythm);

  // Timer store selector
  const timerActive = useTimerStore((s) => s.timerActive);
  const timerSeconds = useTimerStore((s) => s.timerSeconds);
  const totalTimerSeconds = useTimerStore((s) => s.totalTimerSeconds);
  const timerFadeOut = useTimerStore((s) => s.timerFadeOut);
  const startTimer = useTimerStore((s) => s.startTimer);
  const cancelTimer = useTimerStore((s) => s.cancelTimer);

  // Native events & timer side-effects (React hook lifecycle wrapper)
  useLightEvents();
  useSleepTimerCountdown();
  useCircadianAutoClear();

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
    const rgb = getLampRgbColor(lampState);

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
            {isTauri() ? (
              <a
                href="https://lumuscontrol.app/download"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] bg-blue-500 hover:bg-blue-600 text-white font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap shadow-sm shadow-blue-500/10 active:scale-95"
              >
                <Laptop className="w-3 h-3" /> Descargar App
              </a>
            ) : (
              <Link
                to="/download"
                className="text-[10px] bg-blue-500 hover:bg-blue-600 text-white font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap shadow-sm shadow-blue-500/10 active:scale-95"
              >
                <Laptop className="w-3 h-3" /> Descargar App
              </Link>
            )}
          </div>
        )}

        <div className="flex-1 flex overflow-hidden w-full relative">
          {/* Mobile Sidebar Drawer (aside visible as overlay) */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-50 flex md:hidden animate-fade-in">
              {/* Backdrop overlay */}
              <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
                onClick={() => setSidebarOpen(false)}
              />

              {/* Sidebar content drawer */}
              <aside className="relative w-[280px] max-w-[85vw] h-full bg-theme-sidebar border-r border-theme-border flex flex-col p-5 overflow-y-auto space-y-6 transition-transform duration-300 ease-out shadow-2xl">
                {/* Close button inside Drawer header */}
                <div className="flex justify-between items-center pb-2 border-b border-theme-border">
                  <span className="text-xs font-bold text-theme-text uppercase tracking-wider">Menú de Red</span>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="p-1 hover:bg-theme-border rounded-lg text-theme-textSecondary hover:text-theme-text transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <DeviceSelector
                  selectedIp={selectedIp}
                  onSelect={(ip) => {
                    selectDevice(ip);
                    setSidebarOpen(false);
                  }}
                  devices={devices}
                  onScan={scan}
                  isScanning={isScanning}
                  onUpdateDeviceName={updateDeviceName}
                />
              </aside>
            </div>
          )}

          {/* Left Sidebar Pane: Devices & Scanning (desktop only) */}
          <aside className="hidden md:flex w-[280px] bg-theme-sidebar border-r border-theme-border flex-col p-5 overflow-y-auto space-y-6 flex-shrink-0 transition-colors duration-300">
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
              <div className="flex items-center gap-3">
                {/* Botón Wifi responsivo para abrir el menú lateral en móvil */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden p-2 hover:bg-theme-input rounded-xl border border-theme-border text-theme-text transition-all active:scale-95 flex items-center justify-center"
                  aria-label="Abrir lista de dispositivos"
                >
                  <Wifi className="w-4 h-4" />
                </button>
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
                { id: 'settings', label: 'Ajustes', icon: Settings },
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
                    className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all duration-150 ${
                      isActive
                        ? 'bg-theme-card text-theme-text shadow-sm'
                        : 'text-theme-textSecondary hover:text-theme-text font-normal'
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5" aria-hidden="true" />
                    <span className="hidden min-[400px]:inline">{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Tab Content Panel */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
              {activeTab === 'settings' ? (
                <div role="tabpanel" id="tabpanel-settings" aria-labelledby="tab-settings">
                  <SettingsView />
                </div>
              ) : selectedIp ? (
                <>
                  {activeTab === 'dashboard' && (
                    <div role="tabpanel" id="tabpanel-dashboard" aria-labelledby="tab-dashboard">
                      <DashboardView
                        lampState={lampState}
                        isConnected={isConnected}
                        setLampState={setLampState}
                        circadianActive={circadianActive}
                      />
                    </div>
                  )}
                  {activeTab === 'scenes' && (
                    <div role="tabpanel" id="tabpanel-scenes" aria-labelledby="tab-scenes">
                      <ScenesView
                        currentSceneId={lampState.sceneId}
                        onSelectScene={(id) => setLampState({ sceneId: id, state: true, temp: undefined })}
                      />
                    </div>
                  )}
                  {activeTab === 'timer' && (
                    <div role="tabpanel" id="tabpanel-timer" aria-labelledby="tab-timer">
                      <TimerView
                        isActive={timerActive}
                        onStartTimer={handleStartTimer}
                        onCancelTimer={cancelTimer}
                        remainingSeconds={timerSeconds}
                        totalSeconds={totalTimerSeconds}
                        fadeOutEnabled={timerFadeOut}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
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
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
