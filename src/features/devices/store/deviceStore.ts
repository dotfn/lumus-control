import { create } from 'zustand';
import { LightDevice } from '../../../types';
import { deviceService } from '../../../services/deviceService';
import { useSettingsStore } from '../../settings/store/settingsStore';

export interface DeviceGroup {
  id: string;
  name: string;
  deviceIps: string[];
}

interface DeviceState {
  devices: LightDevice[];
  selectedIp: string | null;
  isScanning: boolean;
  connectionStatus: string;
  deviceNames: Record<string, string>;
  excludedIps: string[];
  groups: DeviceGroup[];
  selectedGroupId: string | null;

  // Actions
  loadPreferences: () => Promise<string | null>;
  scan: () => Promise<void>;
  loadPreferencesAndScan: () => Promise<void>;
  selectDevice: (ip: string) => void;
  updateDeviceName: (ip: string, name: string) => Promise<void>;
  setConnectionStatus: (status: string) => void;
  excludeDevice: (ip: string) => void;
  includeDevice: (ip: string) => void;
  createGroup: (name: string, deviceIps: string[]) => void;
  updateGroup: (id: string, name: string, deviceIps: string[]) => void;
  deleteGroup: (id: string) => void;
  selectGroup: (id: string | null) => void;
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  devices: [],
  selectedIp: null,
  isScanning: false,
  connectionStatus: 'Buscando dispositivos...',
  deviceNames: {},
  excludedIps: (() => {
    try {
      const saved = localStorage.getItem('excluded_ips');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  })(),
  groups: (() => {
    try {
      const saved = localStorage.getItem('device_groups');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  })(),
  selectedGroupId: null,

  loadPreferences: async () => {
    let savedIp: string | null = null;
    try {
      const prefs = await deviceService.getPreferences();
      savedIp = prefs.last_ip;
      set({ deviceNames: prefs.device_names });

      // Sincroniza el tema del backend solo si localStorage está vacío
      useSettingsStore.getState().syncThemeFromBackend(prefs.theme ?? null);
    } catch (e) {
      console.error('Failed to load preferences', e);
    }
    return savedIp;
  },

  loadPreferencesAndScan: async () => {
    const savedIp = await get().loadPreferences();
    await get().scan();

    const currentDevices = get().devices;
    const excluded = get().excludedIps;
    if (currentDevices.length > 0) {
      const nonExcluded = currentDevices.filter((d) => !excluded.includes(d.ip));
      const targetIp = savedIp && nonExcluded.some((d) => d.ip === savedIp)
        ? savedIp
        : nonExcluded.length > 0
          ? nonExcluded[0].ip
          : null;

      if (targetIp && !get().selectedIp) {
        get().selectDevice(targetIp);
      }
    } else if (savedIp && !excluded.includes(savedIp)) {
      set({
        devices: [{ ip: savedIp, name: get().deviceNames[savedIp] || 'Lámpara guardada' }],
      });
      get().selectDevice(savedIp);
    }
  },

  scan: async () => {
    set({ isScanning: true, connectionStatus: 'Buscando lámparas...' });
    try {
      const data = await deviceService.discover();
      const names = get().deviceNames;
      const formatted: LightDevice[] = data.map((d) => ({
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
    set({ selectedIp: ip, selectedGroupId: null });
    deviceService.savePreferences(ip).catch(() => {});

    // If it was excluded, automatically include it back
    if (get().excludedIps.includes(ip)) {
      get().includeDevice(ip);
    }
    
    // Add to device list if it's manual and not there
    const currentDevices = get().devices;
    if (!currentDevices.some((d) => d.ip === ip)) {
      set({
        devices: [...currentDevices, { ip, name: get().deviceNames[ip] || 'Lámpara manual' }],
      });
    }
  },

  excludeDevice: (ip) => {
    const nextExcluded = [...get().excludedIps, ip];
    set({ excludedIps: nextExcluded });
    try {
      localStorage.setItem('excluded_ips', JSON.stringify(nextExcluded));
    } catch (e) {
      console.error('Failed to save excluded_ips to localStorage', e);
    }

    // If we just excluded the selected device, select another one that isn't excluded
    if (get().selectedIp === ip) {
      const remaining = get().devices.filter((d) => !nextExcluded.includes(d.ip));
      if (remaining.length > 0) {
        get().selectDevice(remaining[0].ip);
      } else {
        set({ selectedIp: null });
      }
    }
  },

  includeDevice: (ip) => {
    const nextExcluded = get().excludedIps.filter((x) => x !== ip);
    set({ excludedIps: nextExcluded });
    try {
      localStorage.setItem('excluded_ips', JSON.stringify(nextExcluded));
    } catch (e) {
      console.error('Failed to save excluded_ips to localStorage', e);
    }

    // If no device is currently selected, select this one
    if (!get().selectedIp) {
      get().selectDevice(ip);
    }
  },

  updateDeviceName: async (ip, name) => {
    const updatedDevices = get().devices.map((d) => (d.ip === ip ? { ...d, name } : d));
    const nextNames = { ...get().deviceNames, [ip]: name };
    set({ devices: updatedDevices, deviceNames: nextNames });
    
    try {
      await deviceService.saveDeviceName(ip, name);
    } catch (e) {
      console.error('Failed to save device name to config', e);
    }
  },

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  createGroup: (name, deviceIps) => {
    const newGroup: DeviceGroup = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      deviceIps,
    };
    const nextGroups = [...get().groups, newGroup];
    set({ groups: nextGroups });
    try {
      localStorage.setItem('device_groups', JSON.stringify(nextGroups));
    } catch (e) {
      console.error('Failed to save device_groups to localStorage', e);
    }
  },

  updateGroup: (id, name, deviceIps) => {
    const nextGroups = get().groups.map((g) =>
      g.id === id ? { ...g, name, deviceIps } : g
    );
    set({ groups: nextGroups });
    try {
      localStorage.setItem('device_groups', JSON.stringify(nextGroups));
    } catch (e) {
      console.error('Failed to save device_groups to localStorage', e);
    }

    if (get().selectedGroupId === id) {
      get().selectGroup(id);
    }
  },

  deleteGroup: (id) => {
    const nextGroups = get().groups.filter((g) => g.id !== id);
    set({ groups: nextGroups });
    try {
      localStorage.setItem('device_groups', JSON.stringify(nextGroups));
    } catch (e) {
      console.error('Failed to save device_groups to localStorage', e);
    }

    if (get().selectedGroupId === id) {
      set({ selectedGroupId: null });
      const currentDevices = get().devices;
      const excluded = get().excludedIps;
      const nonExcluded = currentDevices.filter((d) => !excluded.includes(d.ip));
      if (nonExcluded.length > 0) {
        get().selectDevice(nonExcluded[0].ip);
      } else {
        set({ selectedIp: null });
      }
    }
  },

  selectGroup: (id) => {
    if (id === null) {
      set({ selectedGroupId: null });
      return;
    }
    const group = get().groups.find((g) => g.id === id);
    if (group) {
      set({ selectedGroupId: id });
      if (group.deviceIps.length > 0) {
        set({ selectedIp: group.deviceIps[0] });
      } else {
        set({ selectedIp: null });
      }
    }
  },
}));
