import { isTauri } from '../utils/tauri';
import { tauriDeviceService } from './tauri/deviceService';
import { demoDeviceService } from './demo/deviceService';

export type DeviceServiceType = typeof tauriDeviceService;
export const deviceService: DeviceServiceType = isTauri() ? tauriDeviceService : demoDeviceService;
export type { UnlistenFn } from '@tauri-apps/api/event';
