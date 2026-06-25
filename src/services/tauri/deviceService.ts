import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { LightState, DiscoverDeviceResponse, PreferencesResponse } from '../../types';
import { DeviceStatePayload } from '../deviceService';

export const tauriDeviceService = {
  async discover(): Promise<DiscoverDeviceResponse[]> {
    return await invoke<DiscoverDeviceResponse[]>('discover');
  },

  async getState(ip: string): Promise<LightState> {
    return await invoke<LightState>('get_state', { ip });
  },

  async control(ip: string, payload: Partial<LightState>): Promise<void> {
    // Frontend validation — mirrors backend constraints in commands.rs
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

  async savePreferences(lastIp: string | null, theme?: string): Promise<void> {
    await invoke('save_preferences', { lastIp, theme });
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
