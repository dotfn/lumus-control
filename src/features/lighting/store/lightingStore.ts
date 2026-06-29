import { create } from 'zustand';
import { LightState } from '../../../types';
import { deviceService } from '../../../services/deviceService';
import { getActiveDeviceIp, getActiveDeviceMac, setDeviceConnectionStatus, getSelectedGroupId, getGroupById, resolveMacToIp, updateMacToIp } from '../../devices/services/storeAccessor';
import { useDeviceStore } from '../../devices/store/deviceStore';
import { LocationData, fetchIpLocation, fetchSunriseSunset, getCircadianSettingForHour } from '../utils/circadian';

let _unlistenEvent: (() => void) | null = null;
let _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let _lastEventTime = 0;

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
          const results = await Promise.allSettled(
            ips.map((ip) => deviceService.control(ip, updates))
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
      await deviceService.control(ip, updates);
      set({ isConnected: true });
      setDeviceConnectionStatus('Lámpara conectada');
    } catch (e) {
      set({ isConnected: false });
      setDeviceConnectionStatus('Lámpara no responde');
      console.error('Error al enviar comando de control:', e);
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
    if (_unlistenEvent) return;
    _lastEventTime = Date.now();

    _unlistenEvent = await deviceService.subscribeToDeviceState((payload) => {
      _lastEventTime = Date.now();

      const mac = useDeviceStore.getState().selectedMac;
      if (payload.mac !== mac) return;

      const ip = useDeviceStore.getState().macToIp[payload.mac];
      if (payload.ip && payload.ip !== ip) {
        updateMacToIp(payload.mac, payload.ip);
      }

      if (payload.online && payload.state) {
        const newState: LightState = {
          state: !!payload.state.state,
          dimming: typeof payload.state.dimming === 'number' ? payload.state.dimming : 60,
        };

        if (payload.state.r !== undefined && payload.state.r !== null) {
          newState.r = payload.state.r;
          newState.g = payload.state.g;
          newState.b = payload.state.b;
        }
        if (payload.state.temp) {
          newState.temp = payload.state.temp;
        }
        if (payload.state.sceneId) {
          newState.sceneId = payload.state.sceneId;
        }

        set({ lampState: newState, isConnected: true });
        setDeviceConnectionStatus('Lámpara conectada');
      } else {
        set({ isConnected: false });
        setDeviceConnectionStatus('Lámpara no responde');
      }
    });

    _heartbeatTimer = setInterval(() => {
      if (Date.now() - _lastEventTime > 15000 && get().isConnected) {
        set({ isConnected: false });
        setDeviceConnectionStatus('Conexión perdida');
      }
    }, 5000);
  },

  shutdown: () => {
    _unlistenEvent?.();
    if (_heartbeatTimer) clearInterval(_heartbeatTimer);
    _unlistenEvent = null;
    _heartbeatTimer = null;
  },
}));
