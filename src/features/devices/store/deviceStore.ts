import { create } from 'zustand';
import { WizDevice } from '../../../types';
import { wizService } from '../../../services/wizService';
import { useSettingsStore } from '../../settings/store/settingsStore';

interface DeviceState {
  devices: WizDevice[];
  selectedIp: string | null;
  isScanning: boolean;
  connectionStatus: string;
  deviceNames: Record<string, string>;

  // Actions
  loadPreferencesAndScan: () => Promise<void>;
  scan: () => Promise<void>;
  selectDevice: (ip: string) => void;
  updateDeviceName: (ip: string, name: string) => Promise<void>;
  setConnectionStatus: (status: string) => void;
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  devices: [],
  selectedIp: null,
  isScanning: false,
  connectionStatus: 'Buscando dispositivos...',
  deviceNames: {},

  loadPreferencesAndScan: async () => {
    let savedIp: string | null = null;
    let names: Record<string, string> = {};
    try {
      const prefs = await wizService.getPreferences();
      names = prefs.device_names;
      savedIp = prefs.last_ip;
      set({ deviceNames: names });
    } catch (e) {
      console.error('Failed to load preferences', e);
    }

    await get().scan();

    const currentDevices = get().devices;
    if (currentDevices.length > 0) {
      const targetIp = savedIp && currentDevices.some((d) => d.ip === savedIp) ? savedIp : currentDevices[0].ip;
      if (!get().selectedIp) {
        get().selectDevice(targetIp);
      }
    } else if (savedIp) {
      set({
        devices: [{ ip: savedIp, name: names[savedIp] || 'Lámpara guardada' }],
      });
      get().selectDevice(savedIp);
    }
  },

  scan: async () => {
    set({ isScanning: true, connectionStatus: 'Buscando lámparas...' });
    try {
      const data = await wizService.discover();
      const names = get().deviceNames;
      const formatted: WizDevice[] = data.map((d) => ({
        ip: d.ip,
        name: names[d.ip] || undefined,
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
      set({ devices: formatted });
    } catch (e) {
      set({ connectionStatus: 'Error al buscar lámparas' });
    } finally {
      set({ isScanning: false });
    }
  },

  selectDevice: (ip) => {
    set({ selectedIp: ip });
    const currentTheme = useSettingsStore.getState().theme;
    wizService.savePreferences(ip, currentTheme).catch(() => {});
    
    // Add to device list if it's manual and not there
    const currentDevices = get().devices;
    if (!currentDevices.some((d) => d.ip === ip)) {
      set({
        devices: [...currentDevices, { ip, name: get().deviceNames[ip] || 'Lámpara manual' }],
      });
    }
  },

  updateDeviceName: async (ip, name) => {
    const updatedDevices = get().devices.map((d) => (d.ip === ip ? { ...d, name } : d));
    const nextNames = { ...get().deviceNames, [ip]: name };
    set({ devices: updatedDevices, deviceNames: nextNames });
    
    try {
      await wizService.saveDeviceName(ip, name);
    } catch (e) {
      console.error('Failed to save device name to config', e);
    }
  },

  setConnectionStatus: (status) => set({ connectionStatus: status }),
}));
