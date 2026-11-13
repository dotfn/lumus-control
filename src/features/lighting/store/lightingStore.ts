import { create } from 'zustand';
import { LightState } from '../../../types';
import { getLitMacs, getTargetMacs } from '../../devices/store/deviceStore';
import { sendLightCommand } from './commandQueue';
import { LocationData, fetchIpLocation, fetchSunriseSunset, getCircadianSettingForHour } from '../utils/circadian';

interface CircadianTarget {
  temp: number;
  dimming: number;
}

interface CommandOptions {
  isCircadian?: boolean;
  /** Lámparas destino. Por defecto, la selección actual. */
  macs?: string[];
}

interface LightingState {
  circadianActive: boolean;
  circadianTarget: CircadianTarget | null;
  /** Lámparas bajo ritmo circadiano: las seleccionadas al activarlo. */
  circadianMacs: string[];
  lastCircadianUpdate: number | null;
  location: LocationData | null;
  isSyncingLocation: boolean;
  syncLocationError: string | null;

  setLampState: (updates: Partial<LightState>, options?: CommandOptions) => Promise<void>;
  applyCircadianRhythm: () => Promise<void>;
  updateCircadianTarget: (setting: CircadianTarget) => void;
  stopCircadian: () => void;
  setCircadianActive: (active: boolean) => void;
}

const CIRCADIAN_OFF = {
  circadianActive: false,
  circadianTarget: null,
  circadianMacs: [],
  lastCircadianUpdate: null,
};

export const useLightingStore = create<LightingState>((set, get) => ({
  circadianActive: false,
  circadianTarget: null,
  circadianMacs: [],
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
    const macs = options?.macs ?? getTargetMacs();
    if (macs.length === 0) return;

    // Un ajuste manual sobre una lámpara bajo ritmo circadiano lo desactiva.
    const { circadianActive, circadianMacs } = get();
    if (circadianActive && !options?.isCircadian && macs.some((mac) => circadianMacs.includes(mac))) {
      set(CIRCADIAN_OFF);
    }

    sendLightCommand(macs, updates);
  },

  applyCircadianRhythm: async () => {
    // El destino se fija al activar: si luego se selecciona otra lámpara, el
    // ritmo sigue aplicándose a las que lo tenían.
    const macs = getTargetMacs();
    if (macs.length === 0) return;

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

    let setting: CircadianTarget;
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
      setting = getCircadianSettingForHour(solarTimes.sunriseHour, solarTimes.sunsetHour, currentHour);
    } catch (e) {
      console.error('Error applying circadian rhythm:', e);
      set({ isSyncingLocation: false, syncLocationError: 'No se pudo sincronizar la ubicación' });

      const hour = new Date().getHours();
      if (hour >= 0 && hour < 6) {
        setting = { temp: 2200, dimming: 15 };
      } else if (hour >= 6 && hour < 9) {
        setting = { temp: 3000, dimming: 60 };
      } else if (hour >= 9 && hour < 17) {
        setting = { temp: 5000, dimming: 100 };
      } else if (hour >= 17 && hour < 20) {
        setting = { temp: 3500, dimming: 70 };
      } else {
        setting = { temp: 2700, dimming: 40 };
      }
    }

    set({
      circadianActive: true,
      circadianTarget: setting,
      circadianMacs: macs,
      lastCircadianUpdate: Date.now(),
    });
    await get().setLampState({ state: true, ...setting }, { isCircadian: true, macs });
  },

  // Ajuste periódico del ritmo ya activo. Solo toca las lámparas que siguen
  // encendidas: si alguien apagó una desde otro dispositivo, no se la vuelve a
  // encender cada vez que cambia la franja horaria.
  updateCircadianTarget: (setting) => {
    const { circadianActive, circadianMacs } = get();
    if (!circadianActive) return;

    set({ circadianTarget: setting, lastCircadianUpdate: Date.now() });
    get().setLampState(setting, { isCircadian: true, macs: getLitMacs(circadianMacs) });
  },

  stopCircadian: () => {
    set(CIRCADIAN_OFF);
  },

  setCircadianActive: (active) => {
    if (!active) {
      set(CIRCADIAN_OFF);
    } else {
      set({ circadianActive: true });
    }
  },
}));
