import { ControlOutcome, DeviceSnapshot, LightState, PreferencesResponse } from '../../types';
import { applyPatch } from '../../utils/lightState';

// Lámparas virtuales de la demo web: suficientes para probar habitaciones y
// la vista general sin hardware real.
const lamps: Record<string, DeviceSnapshot> = {
  'd8a011aa0001': {
    mac: 'd8a011aa0001',
    ip: '192.168.1.21',
    online: true,
    rssi: -52,
    state: { state: true, dimming: 75, temp: 4000 },
  },
  'd8a011aa0002': {
    mac: 'd8a011aa0002',
    ip: '192.168.1.22',
    online: true,
    rssi: -64,
    state: { state: true, dimming: 45, r: 255, g: 140, b: 30 },
  },
  'd8a011aa0003': {
    mac: 'd8a011aa0003',
    ip: '192.168.1.23',
    online: true,
    rssi: -71,
    state: { state: false, dimming: 30, temp: 2700 },
  },
};

const deviceNames: Record<string, string> = {
  'd8a011aa0001': 'Escritorio',
  'd8a011aa0002': 'Lámpara de pie',
  'd8a011aa0003': 'Mesa de luz',
};

let lastMac: string | null = 'd8a011aa0001';
let theme: string | null = 'dark';

const subscribers = new Set<(device: DeviceSnapshot) => void>();

const snapshot = (mac: string): DeviceSnapshot => ({
  ...lamps[mac],
  state: lamps[mac].state ? { ...lamps[mac].state } : null,
});

const allSnapshots = () => Object.keys(lamps).map(snapshot);

export const demoDeviceService = {
  async listDevices(): Promise<DeviceSnapshot[]> {
    return allSnapshots();
  },

  async discover(): Promise<DeviceSnapshot[]> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return allSnapshots();
  },

  async refresh(): Promise<DeviceSnapshot[]> {
    return allSnapshots();
  },

  async addDeviceByIp(_ip: string): Promise<DeviceSnapshot> {
    throw 'La demo solo incluye lámparas virtuales';
  },

  async control(macs: string[], patch: Partial<LightState>): Promise<ControlOutcome[]> {
    if (patch.dimming !== undefined && (patch.dimming < 10 || patch.dimming > 100)) {
      throw new Error(`Dimming out of range: ${patch.dimming}. Expected 10–100.`);
    }
    if (patch.temp !== undefined && (patch.temp < 2200 || patch.temp > 6500)) {
      throw new Error(`Temperature out of range: ${patch.temp}. Expected 2200–6500.`);
    }

    return macs.map((mac) => {
      const lamp = lamps[mac];
      if (!lamp?.state) {
        return { mac, ok: false, error: 'Device not found', device: null };
      }
      lamps[mac] = { ...lamp, state: applyPatch(lamp.state, patch) };
      setTimeout(() => subscribers.forEach((callback) => callback(snapshot(mac))), 50);
      return { mac, ok: true, device: snapshot(mac) };
    });
  },

  async getPreferences(): Promise<PreferencesResponse> {
    return {
      device_names: { ...deviceNames },
      last_mac: lastMac,
      theme: theme,
    };
  },

  async savePreferences(mac: string | null, newTheme?: string): Promise<void> {
    if (mac) {
      lastMac = mac;
    }
    if (newTheme) {
      theme = newTheme;
    }
  },

  async saveDeviceName(mac: string, name: string): Promise<void> {
    deviceNames[mac] = name;
  },

  async subscribeToDevices(callback: (device: DeviceSnapshot) => void): Promise<() => void> {
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  },
};
