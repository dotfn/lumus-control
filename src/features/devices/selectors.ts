import { LightDevice, TargetSummary } from '../../types';
import { DeviceGroup, useDeviceStore } from './store/deviceStore';

/** Lámparas que el usuario no ocultó. */
export function useVisibleDevices(): LightDevice[] {
  const devices = useDeviceStore((s) => s.devices);
  const excludedMacs = useDeviceStore((s) => s.excludedMacs);
  return devices.filter((d) => !excludedMacs.includes(d.mac));
}

/**
 * Miembros visibles de una habitación. Una lámpara que el backend todavía no
 * vio en esta sesión aparece igual, como desconectada.
 */
export function roomMembers(
  group: DeviceGroup,
  devices: LightDevice[],
  excludedMacs: string[],
  deviceNames: Record<string, string>,
): LightDevice[] {
  return group.deviceMacs
    .filter((mac) => !excludedMacs.includes(mac))
    .map(
      (mac) =>
        devices.find((d) => d.mac === mac) ?? {
          mac,
          ip: '',
          name: deviceNames[mac] || undefined,
          online: false,
        },
    );
}

export function summarize(members: LightDevice[]): TargetSummary {
  const online = members.filter((d) => d.online);
  return {
    total: members.length,
    online: online.length,
    on: online.filter((d) => d.state?.state).length,
  };
}

/** Representa a un conjunto como si fuera una lámpara: encendido si alguna lo está. */
export function aggregateLamp(members: LightDevice[]): Pick<LightDevice, 'online' | 'state'> {
  const online = members.filter((d) => d.online);
  const lit = online.find((d) => d.state?.state);
  return {
    online: online.length > 0,
    state: lit?.state ?? (online[0]?.state ? { ...online[0].state, state: false } : undefined),
  };
}
