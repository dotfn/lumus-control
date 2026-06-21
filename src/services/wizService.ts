import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { GetStateResponse, DiscoverDeviceResponse, PreferencesResponse, WizState } from '../types';

export interface DeviceStatePayload {
  ip: string;
  online: boolean;
  state: WizState | null;
}

export const wizService = {
  async discover(): Promise<DiscoverDeviceResponse[]> {
    return await invoke<DiscoverDeviceResponse[]>('discover');
  },

  async getState(ip: string): Promise<GetStateResponse> {
    return await invoke<GetStateResponse>('get_state', { ip });
  },

  async control(ip: string, payload: Partial<WizState>): Promise<void> {
    await invoke('control', {
      ip,
      state: payload.state,
      dimming: payload.dimming,
      temp: payload.temp,
      r: payload.r,
      g: payload.g,
      b: payload.b,
      sceneId: payload.sceneId,
    });
  },

  async getPreferences(): Promise<PreferencesResponse> {
    return await invoke<PreferencesResponse>('get_preferences');
  },

  async savePreferences(lastIp: string): Promise<void> {
    await invoke('save_preferences', { lastIp });
  },

  async saveDeviceName(ip: string, name: string): Promise<void> {
    await invoke('save_device_name', { ip, name });
  },

  async subscribeToDeviceState(callback: (payload: DeviceStatePayload) => void): Promise<UnlistenFn> {
    return await listen<DeviceStatePayload>('device-state-changed', (event) => {
      callback(event.payload);
    });
  }
};
