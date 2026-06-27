import { create } from 'zustand';
import { LightState } from '../../../types';
import { deviceService } from '../../../services/deviceService';
import { getActiveDeviceIp, setDeviceConnectionStatus } from '../../devices/services/storeAccessor';
import { LocationData, fetchIpLocation, fetchSunriseSunset, getCircadianSettingForHour } from '../utils/circadian';
import { useDeviceStore } from '../../devices/store/deviceStore';

interface LightingState {
  lampState: LightState;
  isConnected: boolean;
  circadianActive: boolean;
  location: LocationData | null;
  isSyncingLocation: boolean;
  syncLocationError: string | null;

  // Actions
  setLampState: (updates: Partial<LightState>) => Promise<void>;
  refreshState: (ip: string) => Promise<void>;
  applyCircadianRhythm: () => Promise<void>;
  setIsConnected: (connected: boolean) => void;
  setCircadianActive: (active: boolean) => void;
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

  setLampState: async (updates) => {
    const previousState = get().lampState;
    // Optimistic UI update
    set((prev) => ({ lampState: { ...prev.lampState, ...updates } }));

    const selectedIp = getActiveDeviceIp();
    const selectedGroupId = useDeviceStore.getState().selectedGroupId;

    if (selectedGroupId) {
      const group = useDeviceStore.getState().groups.find((g) => g.id === selectedGroupId);
      if (group && group.deviceIps.length > 0) {
        try {
          // Send control requests to all lamps in parallel and wait for all to settle
          const results = await Promise.allSettled(
            group.deviceIps.map((ip) => deviceService.control(ip, updates))
          );

          const anySuccess = results.some((r) => r.status === 'fulfilled');
          if (anySuccess) {
            set({ isConnected: true });
            setDeviceConnectionStatus('Grupo controlado');
          } else {
            throw new Error('No se pudo establecer comunicación con ningún dispositivo del grupo');
          }
        } catch (e) {
          // Rollback on failure of all devices
          set({ lampState: previousState, isConnected: false });
          setDeviceConnectionStatus('El grupo no responde');
          console.error('Error al enviar comando a grupo:', e);
        }
      }
      return;
    }

    if (!selectedIp) return;

    try {
      await deviceService.control(selectedIp, updates);
      set({ isConnected: true });
      setDeviceConnectionStatus('Lámpara conectada');
    } catch (e) {
      // Rollback on failure
      set({ lampState: previousState, isConnected: false });
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

    let lat = -34.6037; // Buenos Aires fallback
    let lng = -58.3816;
    let city = 'Buenos Aires';
    let country = 'Argentina';
    let hasLocation = false;

    // 1. Try Geolocation API
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

    // 2. Try IP Geolocation if GPS is not available/permitted
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
      // 3. Fetch or calculate sunrise/sunset times
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

      // Calculate settings for the current hour
      const now = new Date();
      const currentHour = now.getHours() + now.getMinutes() / 60;
      const setting = getCircadianSettingForHour(solarTimes.sunriseHour, solarTimes.sunsetHour, currentHour);

      set({ circadianActive: true });
      await get().setLampState({ state: true, temp: setting.temp, dimming: setting.dimming, sceneId: undefined });
    } catch (e) {
      console.error('Error applying circadian rhythm:', e);
      set({ isSyncingLocation: false, syncLocationError: 'No se pudo sincronizar la ubicación' });

      // Offline/Failure Fallback to static hours
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

      set({ circadianActive: true });
      await get().setLampState({ state: true, temp, dimming, sceneId: undefined });
    }
  },

  setIsConnected: (connected) => set({ isConnected: connected }),
  setCircadianActive: (active) => set({ circadianActive: active }),
}));

