import { create } from 'zustand';
import { LightDevice } from '../../../types';
import { deviceService } from '../../../services/deviceService';
import { useSettingsStore } from '../../settings/store/settingsStore';
import { useLightingStore } from '../../lighting/store/lightingStore';

export interface DeviceGroup {
  id: string;
  name: string;
  deviceMacs: string[];
}

interface DeviceState {
  devices: LightDevice[];
  selectedMac: string | null;
  isScanning: boolean;
  connectionStatus: string;
  deviceNames: Record<string, string>;
  excludedMacs: string[];
  groups: DeviceGroup[];
  selectedGroupId: string | null;
  macToIp: Record<string, string>;

  loadPreferences: () => Promise<string | null>;
  scan: () => Promise<void>;
  loadPreferencesAndScan: () => Promise<void>;
  selectDevice: (mac: string, ipOverride?: string) => void;
  updateDeviceName: (mac: string, name: string) => Promise<void>;
  setConnectionStatus: (status: string) => void;
  excludeDevice: (mac: string) => void;
  includeDevice: (mac: string) => void;
  createGroup: (name: string, deviceMacs: string[]) => void;
  updateGroup: (id: string, name: string, deviceMacs: string[]) => void;
  deleteGroup: (id: string) => void;
  selectGroup: (id: string | null) => void;
}

function migrateExcludedIps(): string[] {
  try {
    const ips = localStorage.getItem('excluded_ips');
    if (ips) {
      localStorage.removeItem('excluded_ips');
      const parsed = JSON.parse(ips);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localStorage.setItem('excluded_macs', JSON.stringify(parsed));
        return parsed;
      }
    }
  } catch {}
  try {
    const macs = localStorage.getItem('excluded_macs');
    return macs ? JSON.parse(macs) : [];
  } catch {
    return [];
  }
}

function migrateGroups(): DeviceGroup[] {
  try {
    const saved = localStorage.getItem('device_groups');
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((g: Record<string, unknown>) => ({
      id: (g.id as string) || Math.random().toString(36).substring(2, 9),
      name: (g.name as string) || '',
      deviceMacs: (g.deviceMacs as string[]) || (g.deviceIps as string[]) || [],
    }));
  } catch {
    return [];
  }
}

let _savePrefTimer: ReturnType<typeof setTimeout> | null = null;

export const useDeviceStore = create<DeviceState>((set, get) => ({
  devices: [],
  selectedMac: null,
  isScanning: false,
  connectionStatus: 'Buscando dispositivos...',
  deviceNames: {},
  excludedMacs: migrateExcludedIps(),
  groups: migrateGroups(),
  selectedGroupId: null,
  macToIp: {},

  loadPreferences: async () => {
    let savedMac: string | null = null;
    try {
      const prefs = await deviceService.getPreferences();
      savedMac = prefs.last_mac;
      set({ deviceNames: prefs.device_names });
      useSettingsStore.getState().syncThemeFromBackend(prefs.theme ?? null);
    } catch (e) {
      console.error('Failed to load preferences', e);
    }
    return savedMac;
  },

  loadPreferencesAndScan: async () => {
    const savedMac = await get().loadPreferences();
    await get().scan();

    const currentDevices = get().devices;
    const excluded = get().excludedMacs;
    if (currentDevices.length > 0) {
      const nonExcluded = currentDevices.filter((d) => !excluded.includes(d.mac));
      const targetMac = savedMac && nonExcluded.some((d) => d.mac === savedMac)
        ? savedMac
        : nonExcluded.length > 0
          ? nonExcluded[0].mac
          : null;

      if (targetMac && !get().selectedMac) {
        get().selectDevice(targetMac);

        const device = currentDevices.find((d) => d.mac === targetMac);
        if (device?.state) {
          useLightingStore.setState({
            lampState: { ...device.state },
            isConnected: true,
          });
        }
      }
    } else if (savedMac && !excluded.includes(savedMac)) {
      set({
        devices: [{ ip: '', mac: savedMac, name: get().deviceNames[savedMac] || 'Lámpara guardada' }],
      });
      get().selectDevice(savedMac);
    }
  },

  scan: async () => {
    set({ isScanning: true, connectionStatus: 'Buscando lámparas...' });
    try {
      const data = await deviceService.discover();
      const names = get().deviceNames;
      const prevDevices = get().devices;
      const macToIp: Record<string, string> = {};

      const formatted: LightDevice[] = data.map((d) => {
        macToIp[d.mac] = d.ip;
        const existing = prevDevices.find((e) => e.mac === d.mac);
        return {
          ip: d.ip,
          mac: d.mac,
          name: names[d.mac] || existing?.name || undefined,
          state: d.state ? {
            state: !!d.state.state,
            dimming: typeof d.state.dimming === 'number' ? d.state.dimming : (existing?.state?.dimming ?? 60),
            r: d.state.r ?? existing?.state?.r,
            g: d.state.g ?? existing?.state?.g,
            b: d.state.b ?? existing?.state?.b,
            temp: d.state.temp ?? existing?.state?.temp,
            sceneId: d.state.sceneId ?? existing?.state?.sceneId,
          } : existing?.state,
        };
      });

      set({ devices: formatted, macToIp });
    } catch (e) {
      set({ connectionStatus: 'Error al buscar lámparas' });
    } finally {
      set({ isScanning: false });
    }
  },

  selectDevice: (mac, ipOverride?: string) => {
    set({ selectedMac: mac, selectedGroupId: null });
    if (_savePrefTimer) clearTimeout(_savePrefTimer);
    _savePrefTimer = setTimeout(() => {
      deviceService.savePreferences(mac).catch(() => {});
    }, 400);

    // Update macToIp if an IP override is provided (e.g. manual entry)
    if (ipOverride) {
      set((s) => ({ macToIp: { ...s.macToIp, [mac]: ipOverride } }));
    }

    if (get().excludedMacs.includes(mac)) {
      get().includeDevice(mac);
    }

    const currentDevices = get().devices;
    if (!currentDevices.some((d) => d.mac === mac)) {
      const ip = ipOverride || get().macToIp[mac] || '';
      set({
        devices: [...currentDevices, { ip, mac, name: get().deviceNames[mac] || 'Lámpara manual' }],
      });
    }
  },

  excludeDevice: (mac) => {
    const nextExcluded = [...get().excludedMacs, mac];
    set({ excludedMacs: nextExcluded });
    try {
      localStorage.setItem('excluded_macs', JSON.stringify(nextExcluded));
    } catch (e) {
      console.error('Failed to save excluded_macs to localStorage', e);
    }

    if (get().selectedMac === mac) {
      const remaining = get().devices.filter((d) => !nextExcluded.includes(d.mac));
      if (remaining.length > 0) {
        get().selectDevice(remaining[0].mac);
      } else {
        set({ selectedMac: null });
      }
    }
  },

  includeDevice: (mac) => {
    const nextExcluded = get().excludedMacs.filter((x) => x !== mac);
    set({ excludedMacs: nextExcluded });
    try {
      localStorage.setItem('excluded_macs', JSON.stringify(nextExcluded));
    } catch (e) {
      console.error('Failed to save excluded_macs to localStorage', e);
    }

    if (!get().selectedMac) {
      get().selectDevice(mac);
    }
  },

  updateDeviceName: async (mac, name) => {
    const updatedDevices = get().devices.map((d) => (d.mac === mac ? { ...d, name } : d));
    const nextNames = { ...get().deviceNames, [mac]: name };
    set({ devices: updatedDevices, deviceNames: nextNames });

    try {
      await deviceService.saveDeviceName(mac, name);
    } catch (e) {
      console.error('Failed to save device name to config', e);
    }
  },

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  createGroup: (name, deviceMacs) => {
    const newGroup: DeviceGroup = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      deviceMacs,
    };
    const nextGroups = [...get().groups, newGroup];
    set({ groups: nextGroups });
    try {
      localStorage.setItem('device_groups', JSON.stringify(nextGroups));
    } catch (e) {
      console.error('Failed to save device_groups to localStorage', e);
    }
  },

  updateGroup: (id, name, deviceMacs) => {
    const nextGroups = get().groups.map((g) =>
      g.id === id ? { ...g, name, deviceMacs } : g
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
      const excluded = get().excludedMacs;
      const nonExcluded = currentDevices.filter((d) => !excluded.includes(d.mac));
      if (nonExcluded.length > 0) {
        get().selectDevice(nonExcluded[0].mac);
      } else {
        set({ selectedMac: null });
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
      if (group.deviceMacs.length > 0) {
        set({ selectedMac: group.deviceMacs[0] });
      } else {
        set({ selectedMac: null });
      }
    }
  },
}));
