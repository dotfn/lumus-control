import { DiscoverDeviceResponse, PreferencesResponse, LightState } from '../../types';
import { DeviceStatePayload } from '../deviceService';

let mockLampState: LightState = {
  state: true,
  dimming: 75,
  temp: 4000,
  r: 255,
  g: 180,
  b: 84,
};

const VIRTUAL_MAC = 'AA:BB:CC:DD:EE:FF';
const VIRTUAL_IP = 'virtual-lamp';

const deviceNames: Record<string, string> = {
  [VIRTUAL_MAC]: 'Lámpara Virtual',
};

let lastMac: string | null = VIRTUAL_MAC;
let theme: string | null = 'dark';
const currentIp = VIRTUAL_IP;

const subscribers = new Set<(payload: DeviceStatePayload) => void>();

const notifySubscribers = () => {
  const payload: DeviceStatePayload = {
    ip: currentIp,
    mac: VIRTUAL_MAC,
    online: true,
    state: { ...mockLampState },
  };
  subscribers.forEach((callback) => callback(payload));
};

export const demoDeviceService = {
  async discover(): Promise<DiscoverDeviceResponse[]> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return [
      {
        ip: currentIp,
        mac: VIRTUAL_MAC,
        state: { ...mockLampState },
      },
    ];
  },

  async getState(ip: string): Promise<LightState> {
    if (ip !== currentIp) {
      throw new Error('Device not found');
    }
    return { ...mockLampState };
  },

  async control(ip: string, payload: Partial<LightState>): Promise<void> {
    if (ip !== currentIp) {
      throw new Error('Device not found');
    }

    if (payload.dimming !== undefined && (payload.dimming < 10 || payload.dimming > 100)) {
      throw new Error(`Dimming out of range: ${payload.dimming}. Expected 10–100.`);
    }
    if (payload.temp !== undefined && (payload.temp < 2200 || payload.temp > 6500)) {
      throw new Error(`Temperature out of range: ${payload.temp}. Expected 2200–6500.`);
    }
    if (payload.r !== undefined && (payload.r < 0 || payload.r > 255)) {
      throw new Error(`Red channel out of range: ${payload.r}. Expected 0–255.`);
    }
    if (payload.g !== undefined && (payload.g < 0 || payload.g > 255)) {
      throw new Error(`Green channel out of range: ${payload.g}. Expected 0–255.`);
    }
    if (payload.b !== undefined && (payload.b < 0 || payload.b > 255)) {
      throw new Error(`Blue channel out of range: ${payload.b}. Expected 0–255.`);
    }

    mockLampState = {
      ...mockLampState,
      ...payload,
    };

    if (payload.sceneId !== undefined) {
      delete mockLampState.temp;
      delete mockLampState.r;
      delete mockLampState.g;
      delete mockLampState.b;
    } else if (payload.temp !== undefined) {
      delete mockLampState.sceneId;
      delete mockLampState.r;
      delete mockLampState.g;
      delete mockLampState.b;
    } else if (payload.r !== undefined || payload.g !== undefined || payload.b !== undefined) {
      delete mockLampState.sceneId;
      delete mockLampState.temp;
    }

    setTimeout(() => {
      notifySubscribers();
    }, 50);
  },

  async getPreferences(): Promise<PreferencesResponse> {
    return {
      device_names: { ...deviceNames },
      last_mac: lastMac,
      theme: theme,
    };
  },

  async savePreferences(ipOrMac: string | null, newTheme?: string): Promise<void> {
    lastMac = ipOrMac;
    if (newTheme) {
      theme = newTheme;
    }
  },

  async setActiveDevices(_macs: string[]): Promise<void> {
    // La demo tiene un único dispositivo virtual; no hay monitor que sincronizar.
  },

  async saveDeviceName(mac: string, name: string): Promise<void> {
    deviceNames[mac] = name;
    setTimeout(() => {
      notifySubscribers();
    }, 50);
  },

  async subscribeToDeviceState(callback: (payload: DeviceStatePayload) => void): Promise<() => void> {
    subscribers.add(callback);
    setTimeout(() => {
      callback({
        ip: currentIp,
        mac: VIRTUAL_MAC,
        online: true,
        state: { ...mockLampState },
      });
    }, 10);

    return () => {
      subscribers.delete(callback);
    };
  }
};
