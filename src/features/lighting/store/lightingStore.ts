import { create } from 'zustand';
import { LightState } from '../../../types';
import { deviceService } from '../../../services/deviceService';
import { getActiveDeviceIp, getActiveDeviceMac, setDeviceConnectionStatus, getSelectedGroupId, getGroupById, resolveMacToIp, updateMacToIp } from '../../devices/services/storeAccessor';
import { useDeviceStore } from '../../devices/store/deviceStore';
import { LocationData, fetchIpLocation, fetchSunriseSunset, getCircadianSettingForHour } from '../utils/circadian';

let _unlistenEvent: (() => void) | null = null;
let _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let _lastEventTime = 0;
let _initPromise: Promise<void> | null = null;
let _visibilityHandler: (() => void) | null = null;
// Momento del último comando enviado por el usuario. Los eventos del monitor
// dentro de esta ventana no pisan lampState: el poll pudo haberse tomado ANTES
// del comando y llegaría después, revirtiendo el update optimista en pantalla.
let _lastCommandTime = 0;
const COMMAND_SUPPRESSION_MS = 7000;
const HEARTBEAT_TIMEOUT_MS = 15000;

// Throttle de comandos de red: la UI se actualiza en cada evento (slider fluido)
// pero a la lámpara se envía como máximo un setPilot cada SEND_THROTTLE_MS,
// acumulando los cambios intermedios y garantizando que el último valor llegue.
let _sendTimer: ReturnType<typeof setTimeout> | null = null;
let _lastSendAt = 0;
let _pendingUpdates: Partial<LightState> | null = null;
const SEND_THROTTLE_MS = 150;

interface CircadianTarget {
  temp: number;
  dimming: number;
}

interface LightingState {
  lampState: LightState;
  isConnected: boolean;
  circadianActive: boolean;
  circadianTarget: CircadianTarget | null;
  lastCircadianUpdate: number | null;
  location: LocationData | null;
  isSyncingLocation: boolean;
  syncLocationError: string | null;

  setLampState: (updates: Partial<LightState>, options?: { isCircadian?: boolean }) => Promise<void>;
  refreshState: (ip: string) => Promise<void>;
  applyCircadianRhythm: () => Promise<void>;
  stopCircadian: () => void;
  setIsConnected: (connected: boolean) => void;
  setCircadianActive: (active: boolean) => void;
  init: () => Promise<void>;
  shutdown: () => void;
}

export const useLightingStore = create<LightingState>((set, get) => ({
  lampState: {
    state: false,
    dimming: 60,
    r: 255,
    g: 180,
    b: 84,
  },
  isConnected: false,
  circadianActive: false,
  circadianTarget: null,
  lastCircadianUpdate: null,
  location: (() => {
    try {
      const saved = localStorage.getItem('circadian_location');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })(),
  isSyncingLocation: false,
  syncLocationError: null,

  setLampState: async (updates, options) => {
    if (get().circadianActive && !options?.isCircadian) {
      set({ circadianActive: false, circadianTarget: null, lastCircadianUpdate: null });
    }

    set((prev) => ({ lampState: { ...prev.lampState, ...updates } }));

    // Acumula los cambios y respeta el throttle. El merge conserva los
    // `undefined` explícitos (p. ej. temp: undefined al elegir escena).
    _pendingUpdates = { ..._pendingUpdates, ...updates };

    const flush = async () => {
      const payload = _pendingUpdates;
      _pendingUpdates = null;
      _lastSendAt = Date.now();
      if (!payload) return;

      const selectedMac = getActiveDeviceMac();
      const selectedGroupId = getSelectedGroupId();

      if (selectedGroupId) {
        const group = getGroupById(selectedGroupId);
        if (group && group.deviceMacs.length > 0) {
          const ips = group.deviceMacs
            .map((mac) => resolveMacToIp(mac))
            .filter((ip): ip is string => ip !== null);

          if (ips.length === 0) {
            setDeviceConnectionStatus('No se pudieron resolver IPs del grupo');
            return;
          }

          try {
            _lastCommandTime = Date.now();
            const results = await Promise.allSettled(
              ips.map((ip) => deviceService.control(ip, payload))
            );

            const anySuccess = results.some((r) => r.status === 'fulfilled');
            if (anySuccess) {
              set({ isConnected: true });
              setDeviceConnectionStatus('Grupo controlado');
            } else {
              throw new Error('No se pudo establecer comunicación con ningún dispositivo del grupo');
            }
          } catch (e) {
            set({ isConnected: false });
            setDeviceConnectionStatus('El grupo no responde');
            console.error('Error al enviar comando a grupo:', e);
          }
        }
        return;
      }

      if (!selectedMac) return;
      const ip = getActiveDeviceIp();
      if (!ip) {
        setDeviceConnectionStatus('IP no resuelta para el dispositivo');
        return;
      }

      try {
        _lastCommandTime = Date.now();
        await deviceService.control(ip, payload);
        set({ isConnected: true });
        setDeviceConnectionStatus('Lámpara conectada');
      } catch (e) {
        set({ isConnected: false });
        setDeviceConnectionStatus('Lámpara no responde');
        console.error('Error al enviar comando de control:', e);
      }
    };

    if (_sendTimer) return; // ya hay un envío programado que tomará lo acumulado

    const elapsed = Date.now() - _lastSendAt;
    if (elapsed >= SEND_THROTTLE_MS) {
      await flush();
    } else {
      _sendTimer = setTimeout(() => {
        _sendTimer = null;
        flush();
      }, SEND_THROTTLE_MS - elapsed);
    }
  },

  refreshState: async (ip) => {
    try {
      const data = await deviceService.getState(ip);
      if (!data) throw new Error();

      const newState: LightState = {
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

      set({ lampState: newState, isConnected: true });
      setDeviceConnectionStatus('Lámpara conectada');
    } catch (e) {
      set({ isConnected: false });
      setDeviceConnectionStatus('Lámpara no responde');
    }
  },

  applyCircadianRhythm: async () => {
    set({ isSyncingLocation: true, syncLocationError: null });

    let lat = -34.6037;
    let lng = -58.3816;
    let city = 'Buenos Aires';
    let country = 'Argentina';
    let hasLocation = false;

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 4000,
          enableHighAccuracy: false,
        });
      });
      lat = position.coords.latitude;
      lng = position.coords.longitude;
      hasLocation = true;
    } catch (e) {
      console.warn('Geolocation API failed or timed out. Falling back to IP Geolocation:', e);
    }

    if (!hasLocation) {
      try {
        const ipLoc = await fetchIpLocation();
        lat = ipLoc.latitude;
        lng = ipLoc.longitude;
        city = ipLoc.city || '';
        country = ipLoc.country || '';
        hasLocation = true;
      } catch (e) {
        console.warn('IP Geolocation failed. Trying saved location or defaults:', e);
        const saved = get().location;
        if (saved) {
          lat = saved.latitude;
          lng = saved.longitude;
          city = saved.city || '';
          country = saved.country || '';
          hasLocation = true;
        }
      }
    }

    try {
      const solarTimes = await fetchSunriseSunset(lat, lng);

      const newLocation: LocationData = {
        latitude: lat,
        longitude: lng,
        city: city || undefined,
        country: country || undefined,
        sunriseHour: solarTimes.sunriseHour,
        sunsetHour: solarTimes.sunsetHour,
        lastSynced: new Date().toISOString(),
      };

      set({ location: newLocation, isSyncingLocation: false });
      localStorage.setItem('circadian_location', JSON.stringify(newLocation));

      const now = new Date();
      const currentHour = now.getHours() + now.getMinutes() / 60;
      const setting = getCircadianSettingForHour(solarTimes.sunriseHour, solarTimes.sunsetHour, currentHour);

      const now_ts = Date.now();
      set({
        circadianActive: true,
        circadianTarget: setting,
        lastCircadianUpdate: now_ts,
      });
      await get().setLampState({ state: true, temp: setting.temp, dimming: setting.dimming, sceneId: undefined }, { isCircadian: true });
    } catch (e) {
      console.error('Error applying circadian rhythm:', e);
      set({ isSyncingLocation: false, syncLocationError: 'No se pudo sincronizar la ubicación' });

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

      const now_ts = Date.now();
      set({
        circadianActive: true,
        circadianTarget: { temp, dimming },
        lastCircadianUpdate: now_ts,
      });
      await get().setLampState({ state: true, temp, dimming, sceneId: undefined }, { isCircadian: true });
    }
  },

  stopCircadian: () => {
    set({ circadianActive: false, circadianTarget: null, lastCircadianUpdate: null });
  },

  setIsConnected: (connected) => set({ isConnected: connected }),
  setCircadianActive: (active) => {
    if (!active) {
      set({ circadianActive: false, circadianTarget: null, lastCircadianUpdate: null });
    } else {
      set({ circadianActive: true });
    }
  },

  init: async () => {
    // Guard basado en promesa: dos llamadas concurrentes (p. ej. doble efecto de
    // React StrictMode) comparten la misma suscripción en vez de duplicarla.
    if (_initPromise) return _initPromise;

    _initPromise = (async () => {
      _lastEventTime = Date.now();

      // Normaliza el payload crudo del monitor (campos null/ausentes) a LightState.
      const toLightState = (raw: LightState): LightState => {
        const normalized: LightState = {
          state: !!raw.state,
          dimming: typeof raw.dimming === 'number' ? raw.dimming : 60,
        };
        if (raw.r !== undefined && raw.r !== null) {
          normalized.r = raw.r;
          normalized.g = raw.g;
          normalized.b = raw.b;
        }
        if (raw.temp) {
          normalized.temp = raw.temp;
        }
        if (raw.sceneId) {
          normalized.sceneId = raw.sceneId;
        }
        return normalized;
      };

      _unlistenEvent = await deviceService.subscribeToDeviceState((payload) => {
        const deviceState = useDeviceStore.getState();
        const selectedMac = deviceState.selectedMac;
        const group = deviceState.selectedGroupId
          ? deviceState.groups.find((g) => g.id === deviceState.selectedGroupId)
          : null;

        const isSelected = payload.mac === selectedMac;
        const isGroupMember = group?.deviceMacs.includes(payload.mac) ?? false;
        if (!isSelected && !isGroupMember) return;

        // Solo los eventos de dispositivos vigilados cuentan como latido;
        // si el backend vigila otra MAC, el heartbeat debe poder disparar.
        _lastEventTime = Date.now();

        const ip = deviceState.macToIp[payload.mac];
        if (payload.ip && payload.ip !== ip) {
          updateMacToIp(payload.mac, payload.ip);
        }

        if (payload.online && payload.state) {
          const normalized = toLightState(payload.state);
          // Estado por-lámpara en el sidebar, también para miembros del grupo.
          deviceState.applyDeviceState(payload.mac, normalized);

          if (!isSelected) return;

          set({ isConnected: true });
          setDeviceConnectionStatus('Lámpara conectada');

          if (Date.now() - _lastCommandTime < COMMAND_SUPPRESSION_MS) return;

          set({ lampState: normalized });
        } else if (isSelected) {
          set({ isConnected: false });
          setDeviceConnectionStatus('Lámpara no responde');
        }
      });

      _heartbeatTimer = setInterval(() => {
        if (Date.now() - _lastEventTime > HEARTBEAT_TIMEOUT_MS && get().isConnected) {
          set({ isConnected: false });
          setDeviceConnectionStatus('Conexión perdida');
        }
      }, 5000);

      // Al volver de reposo los timers estuvieron suspendidos y la lámpara pudo
      // cambiar (u obtener otra IP). Damos gracia al heartbeat y refrescamos ya.
      _visibilityHandler = () => {
        if (document.visibilityState !== 'visible') return;
        _lastEventTime = Date.now();
        const activeIp = getActiveDeviceIp();
        if (activeIp) {
          get().refreshState(activeIp);
        }
      };
      document.addEventListener('visibilitychange', _visibilityHandler);
    })();

    return _initPromise;
  },

  shutdown: () => {
    _unlistenEvent?.();
    if (_heartbeatTimer) clearInterval(_heartbeatTimer);
    if (_visibilityHandler) {
      document.removeEventListener('visibilitychange', _visibilityHandler);
    }
    _unlistenEvent = null;
    _heartbeatTimer = null;
    _visibilityHandler = null;
    _initPromise = null;
  },
}));
