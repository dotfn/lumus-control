import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { ControlOutcome, DeviceSnapshot, LightState, PreferencesResponse } from '../../types';

export const tauriDeviceService = {
  /** Lámparas conocidas por el backend, sin tocar la red. */
  async listDevices(): Promise<DeviceSnapshot[]> {
    return await invoke<DeviceSnapshot[]>('list_devices');
  },

  /** Busca lámparas en la red y devuelve la lista completa actualizada. */
  async discover(): Promise<DeviceSnapshot[]> {
    return await invoke<DeviceSnapshot[]>('discover');
  },

  /** Pide un sondeo inmediato; los cambios llegan por `subscribeToDevices`. */
  async refresh(): Promise<DeviceSnapshot[]> {
    return await invoke<DeviceSnapshot[]>('refresh');
  },

  async addDeviceByIp(ip: string): Promise<DeviceSnapshot> {
    return await invoke<DeviceSnapshot>('add_device_by_ip', { ip });
  },

  /** Aplica el mismo cambio a una o varias lámparas; devuelve un resultado por cada una. */
  async control(macs: string[], patch: Partial<LightState>): Promise<ControlOutcome[]> {
    return await invoke<ControlOutcome[]>('control', { macs, patch });
  },

  async getPreferences(): Promise<PreferencesResponse> {
    return await invoke<PreferencesResponse>('get_preferences');
  },

  async savePreferences(lastMac: string | null, theme?: string): Promise<void> {
    await invoke('save_preferences', { lastMac, theme });
  },

  async saveDeviceName(mac: string, name: string): Promise<void> {
    await invoke('save_device_name', { mac, name });
  },

  async subscribeToDevices(callback: (device: DeviceSnapshot) => void): Promise<UnlistenFn> {
    return await listen<DeviceSnapshot>('device-updated', (event) => {
      callback(event.payload);
    });
  },
};
