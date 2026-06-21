import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Sun, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { WizDevice, WizState, GetStateResponse, DiscoverDeviceResponse, PreferencesResponse } from './types';
import { DeviceSelector } from './components/DeviceSelector';
import { LightController } from './components/LightController';
import { SceneSelector, WIZ_SCENES } from './components/SceneSelector';
import { SleepTimer } from './components/SleepTimer';
import { kelvinToRgb } from './utils/color';


export const App: React.FC = () => {
  // Selection and State
  const [selectedIp, setSelectedIp] = useState<string | null>(null);
  const [devices, setDevices] = useState<WizDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('Buscando dispositivos...');
  const [isConnected, setIsConnected] = useState(false);

  const [lampState, setLampState] = useState<WizState>({
    state: false,
    dimming: 60,
    r: 255,
    g: 180,
    b: 84,
  });

  // Timers and Circadian Rhythm
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [totalTimerSeconds, setTotalTimerSeconds] = useState(0);
  const [timerFadeOut, setTimerFadeOut] = useState(false);
  const [initialDimming, setInitialDimming] = useState(100);
  const [circadianActive, setCircadianActive] = useState(false);
  const [deviceNames, setDeviceNames] = useState<Record<string, string>>({});

  // Refs for tracking mutable states in intervals/callbacks
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef(lampState);
  stateRef.current = lampState;

  // 1. Load devices metadata from Tauri Config and scan
  useEffect(() => {
    const loadConfigAndScan = async () => {
      let savedIp: string | null = null;
      let names: Record<string, string> = {};
      try {
        const prefs = await invoke<PreferencesResponse>('get_preferences');
        names = prefs.device_names;
        savedIp = prefs.last_ip;
        setDeviceNames(names);
      } catch (e) {
        console.error('Failed to load preferences', e);
      }

      // Scan
      const foundDevices = await handleScan(names);
      if (foundDevices && foundDevices.length > 0) {
        // Hydrate names
        const hydrated = foundDevices.map((d: WizDevice) => ({
          ...d,
          name: names[d.ip] || undefined,
        }));
        setDevices(hydrated);

        // Auto select first device, or saved IP if found in scan
        const targetIp = savedIp && hydrated.some((d) => d.ip === savedIp) ? savedIp : hydrated[0].ip;
        if (!selectedIp) {
          setSelectedIp(targetIp);
        }
      } else if (savedIp) {
        // If broadcast didn't find it but we have a saved IP, ensure it's in list
        setDevices([{ ip: savedIp, name: names[savedIp] || 'Lámpara guardada' }]);
        setSelectedIp(savedIp);
      }
    };

    loadConfigAndScan();
  }, []);

  // 2. Poll lamp state every 5 seconds
  useEffect(() => {
    if (!selectedIp) {
      setConnectionStatus('Sin lámpara seleccionada');
      setIsConnected(false);
      return;
    }

    refreshState();
    const poll = setInterval(refreshState, 5000);
    return () => clearInterval(poll);
  }, [selectedIp]);

  // 3. React Sleep Timer countdown handler
  useEffect(() => {
    if (timerActive) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            // Timer finished! Turn off light
            clearInterval(timerIntervalRef.current!);
            setTimerActive(false);
            apiControl({ state: false });
            return 0;
          }

          const nextSecs = prev - 1;

          // Gradual Fade-out calculation:
          // We recalculate and adjust dimming every 15 seconds to avoid network spam.
          if (timerFadeOut && nextSecs % 15 === 0) {
            const progress = nextSecs / totalTimerSeconds; // 1.0 down to 0.0
            const minDim = 10;
            const range = initialDimming - minDim;
            if (range > 0) {
              const targetDimming = Math.max(minDim, Math.round(minDim + range * progress));
              if (targetDimming !== stateRef.current.dimming) {
                apiControl({ dimming: targetDimming });
              }
            }
          }

          return nextSecs;
        });
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerActive, timerFadeOut, totalTimerSeconds, initialDimming]);

  // 4. Update CSS custom properties for Dynamic Ambient Theme
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

  // APIs and Operations
  const refreshState = async () => {
    if (!selectedIp) return;
    try {
      const data = await invoke<GetStateResponse>('get_state', { ip: selectedIp });
      if (!data) throw new Error();

      const newState: WizState = {
        state: !!data.state,
        dimming: typeof data.dimming === 'number' ? data.dimming : 60,
      };

      if (data.r !== undefined && data.r !== null) {
        newState.r = data.r;
        newState.g = data.g;
        newState.b = data.b;
      }
      if (data.temp) {
        newState.temp = data.temp;
      }
      if (data.sceneId) {
        newState.sceneId = data.sceneId;
      }

      setLampState(newState);
      setConnectionStatus(`Lámpara conectada`);
      setIsConnected(true);
    } catch (e) {
      setConnectionStatus(`Lámpara no responde`);
      setIsConnected(false);
    }
  };

  const apiControl = async (payload: Partial<WizState>) => {
    if (!selectedIp) return;
    // Optimistic UI state update
    setLampState((prev) => ({ ...prev, ...payload }));

    try {
      await invoke('control', {
        ip: selectedIp,
        state: payload.state,
        dimming: payload.dimming,
        temp: payload.temp,
        r: payload.r,
        g: payload.g,
        b: payload.b,
        sceneId: payload.sceneId,
      });
      setIsConnected(true);
    } catch (e) {
      setIsConnected(false);
      setConnectionStatus(`Lámpara no responde`);
    }
  };

  const handleScan = async (namesMap?: Record<string, string>): Promise<WizDevice[] | null> => {
    setIsScanning(true);
    setConnectionStatus('Buscando lámparas...');
    try {
      const data = await invoke<DiscoverDeviceResponse[]>('discover');
      const formatted: WizDevice[] = data.map((d: DiscoverDeviceResponse) => ({
        ip: d.ip,
        name: (namesMap || deviceNames)[d.ip] || undefined,
        state: d.state ? {
          state: !!d.state.state,
          dimming: typeof d.state.dimming === 'number' ? d.state.dimming : 60,
          r: d.state.r,
          g: d.state.g,
          b: d.state.b,
          temp: d.state.temp,
          sceneId: d.state.sceneId,
        } : undefined,
      }));
      return formatted;
    } catch (e) {
      setConnectionStatus('Error al buscar lámparas');
      return null;
    } finally {
      setIsScanning(false);
    }
  };

  const triggerScan = async () => {
    const found = await handleScan();
    if (found) {
      const hydrated = found.map((d: WizDevice) => ({
        ...d,
        name: deviceNames[d.ip] || undefined,
      }));
      setDevices(hydrated);
    }
  };

  const updateDeviceName = async (ip: string, name: string) => {
    // Update local state
    const updated = devices.map((d) => (d.ip === ip ? { ...d, name } : d));
    setDevices(updated);

    const nextNames = { ...deviceNames, [ip]: name };
    setDeviceNames(nextNames);

    try {
      await invoke('save_device_name', { ip, name });
    } catch (e) {
      console.error('Failed to save device name to config', e);
    }
  };

  const selectDevice = (ip: string) => {
    setSelectedIp(ip);
    invoke('save_preferences', { lastIp: ip }).catch(() => {});
    // Add to device list if it's manual and not there
    if (!devices.some((d) => d.ip === ip)) {
      setDevices((prev) => [...prev, { ip, name: deviceNames[ip] || 'Lámpara manual' }]);
    }
  };

  // Timer Control
  const startTimer = (minutes: number, fadeOut: boolean) => {
    const seconds = minutes * 60;
    setTimerSeconds(seconds);
    setTotalTimerSeconds(seconds);
    setTimerFadeOut(fadeOut);
    setInitialDimming(lampState.dimming);
    setTimerActive(true);
  };

  const cancelTimer = () => {
    setTimerActive(false);
    setTimerSeconds(0);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  // Circadian Sync
  const applyCircadianRhythm = () => {
    const hour = new Date().getHours();
    let temp = 4000;
    let dimming = 80;

    if (hour >= 0 && hour < 6) {
      temp = 2200;
      dimming = 15;
    } else if (hour >= 6 && hour < 9) {
      temp = 3000;
      dimming = 60;
    } else if (hour >= 9 && hour < 17) {
      temp = 5000;
      dimming = 100;
    } else if (hour >= 17 && hour < 20) {
      temp = 3500;
      dimming = 70;
    } else {
      temp = 2700;
      dimming = 40;
    }

    setCircadianActive(true);
    apiControl({ state: true, temp, dimming, sceneId: undefined });

    // Toast/Alert auto-clear
    setTimeout(() => setCircadianActive(false), 3000);
  };

  const handleStateChange = (updates: Partial<WizState>) => {
    apiControl(updates);
  };

  const handleSceneSelect = (sceneId: number) => {
    apiControl({ sceneId, state: true, temp: undefined });
  };

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

  return (
    <div className="w-full max-w-md lg:max-w-5xl mx-auto px-4 py-6 md:py-12 transition-all duration-500">
      {/* Dynamic Background Glow Layer */}
      <div
        className="fixed inset-0 pointer-events-none transition-all duration-1000 -z-10 opacity-[0.06]"
        style={{
          background: `radial-gradient(circle at 50% 0%, var(--glow-color) 0%, transparent 65%)`,
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Panel (Header, Orb, Controls) */}
        <div className="lg:col-span-7 bg-white/[0.03] border border-white/10 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl transition-all duration-500 hover:border-white/15 space-y-6">
          {/* Header Section */}
          <header className="flex items-center justify-between pb-4 border-b border-white/5">
            <div>
              <h1 className="font-display font-bold text-xl tracking-tight text-white flex items-center gap-2">
                WiZ Control
                {circadianActive && (
                  <span className="text-[10px] bg-amber-400/20 text-amber-200 border border-amber-400/30 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 animate-bounce">
                    <Sparkles className="w-2.5 h-2.5" />
                    Sincronizado
                  </span>
                )}
              </h1>
              <p className="text-[10px] text-[#9a968c] font-mono mt-0.5 flex items-center gap-1.5">
                {isConnected ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-3 h-3 text-red-400" />
                )}
                {selectedIp ? `${connectionStatus} · ${selectedIp}` : connectionStatus}
              </p>
            </div>

            <button
              onClick={applyCircadianRhythm}
              title="Sincronizar ritmo circadiano"
              className="p-2 hover:bg-white/5 active:scale-95 rounded-xl border border-white/10 text-amber-400 transition-all flex items-center gap-1 text-xs"
            >
              <Sun className="w-4 h-4" />
              <span className="sr-only lg:not-sr-only text-[10px] font-semibold uppercase">Circadiano</span>
            </button>
          </header>

          {/* Breathing Orb Visualization */}
          <div className="flex justify-center py-4">
            <div
              className={`w-36 h-36 rounded-full border border-white/15 relative transition-all duration-700 ${
                lampState.state ? 'animate-breathe' : ''
              }`}
              style={{
                background: lampState.state
                  ? `radial-gradient(circle at 38% 32%, ${currentRgbString()} 0%, rgba(var(--glow-color), 0.3) 60%, rgba(255,255,255,0.01) 100%)`
                  : 'radial-gradient(circle at 38% 32%, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
                boxShadow: lampState.state
                  ? `0 0 calc(20px + 60px * (var(--glow-strength))) calc(2px + 12px * (var(--glow-strength))) rgba(var(--glow-color), 0.3), inset 0 0 15px rgba(255,255,255,0.06)`
                  : 'none',
              }}
            />
          </div>

          {selectedIp ? (
            <div className="space-y-6">
              {/* Light Controller */}
              <LightController state={lampState} onStateChange={handleStateChange} />

              {/* WiZ Scene Selector */}
              <SceneSelector currentSceneId={lampState.sceneId} onSelectScene={handleSceneSelect} />
            </div>
          ) : (
            <div className="text-center py-12 bg-white/[0.01] border border-dashed border-white/10 rounded-2xl">
              <p className="text-sm text-[#9a968c]">Por favor, selecciona o ingresa una lámpara en el panel lateral para comenzar.</p>
            </div>
          )}
        </div>

        {/* Sidebar Panel (Devices and Sleep Timer) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Device Selector Card */}
          <div className="bg-white/[0.03] border border-white/10 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl transition-all duration-500 hover:border-white/15">
            <DeviceSelector
              selectedIp={selectedIp}
              onSelect={selectDevice}
              devices={devices}
              onScan={triggerScan}
              isScanning={isScanning}
              onUpdateDeviceName={updateDeviceName}
            />
          </div>

          {/* Sleep Timer Card */}
          {selectedIp && (
            <div className="bg-white/[0.03] border border-white/10 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl transition-all duration-500 hover:border-white/15">
              <SleepTimer
                isActive={timerActive}
                onStartTimer={startTimer}
                onCancelTimer={cancelTimer}
                remainingSeconds={timerSeconds}
                fadeOutEnabled={timerFadeOut}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
