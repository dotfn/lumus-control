import { DiscoverDeviceResponse, PreferencesResponse, LightState } from '../../types';
import { DeviceStatePayload } from '../deviceService';

// Simulated in-memory state of the mock lamp
let mockLampState: LightState = {
  state: true,
  dimming: 75,
  temp: 4000,
  r: 255,
  g: 180,
  b: 84,
};

const deviceNames: Record<string, string> = {
  'virtual-lamp': 'Lámpara Virtual',
};

let lastIp: string | null = 'virtual-lamp';
let theme: string | null = 'dark';

// Store callbacks for state change subscriptions
const subscribers = new Set<(payload: DeviceStatePayload) => void>();

const notifySubscribers = () => {
  const payload: DeviceStatePayload = {
    ip: 'virtual-lamp',
    online: true,
    state: { ...mockLampState },
  };
  subscribers.forEach((callback) => callback(payload));
};

export const demoDeviceService = {
  async discover(): Promise<DiscoverDeviceResponse[]> {
    // Simulate minor network delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    return [
      {
        ip: 'virtual-lamp',
        state: { ...mockLampState },
      },
    ];
  },

  async getState(ip: string): Promise<LightState> {
    if (ip !== 'virtual-lamp') {
      throw new Error('Device not found');
    }
    return { ...mockLampState };
  },

  async control(ip: string, payload: Partial<LightState>): Promise<void> {
    if (ip !== 'virtual-lamp') {
      throw new Error('Device not found');
    }

    // Frontend validation — same constraints as tauriDeviceService
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

    // Update state
    mockLampState = {
      ...mockLampState,
      ...payload,
    };

    // If setting scene, clear color temp and custom RGB
    if (payload.sceneId !== undefined) {
      delete mockLampState.temp;
      delete mockLampState.r;
      delete mockLampState.g;
      delete mockLampState.b;
    }
    // If setting temp, clear scene and custom RGB
    else if (payload.temp !== undefined) {
      delete mockLampState.sceneId;
      delete mockLampState.r;
      delete mockLampState.g;
      delete mockLampState.b;
    }
    // If setting RGB, clear scene and temp
    else if (payload.r !== undefined || payload.g !== undefined || payload.b !== undefined) {
      delete mockLampState.sceneId;
      delete mockLampState.temp;
    }

    // Notify listeners asynchronously (similar to real backend events)
    setTimeout(() => {
      notifySubscribers();
    }, 50);
  },

  async getPreferences(): Promise<PreferencesResponse> {
    return {
      device_names: { ...deviceNames },
      last_ip: lastIp,
      theme: theme,
    };
  },

  async savePreferences(ip: string | null, newTheme?: string): Promise<void> {
    lastIp = ip;
    if (newTheme) {
      theme = newTheme;
    }
  },

  async saveDeviceName(ip: string, name: string): Promise<void> {
    deviceNames[ip] = name;
    // Simulate updating name
    setTimeout(() => {
      notifySubscribers();
    }, 50);
  },

  async subscribeToDeviceState(callback: (payload: DeviceStatePayload) => void): Promise<() => void> {
    subscribers.add(callback);
    // Trigger initial notification
    setTimeout(() => {
      callback({
        ip: 'virtual-lamp',
        online: true,
        state: { ...mockLampState },
      });
    }, 10);

    // Return the unlisten function
    return () => {
      subscribers.delete(callback);
    };
  }
};
