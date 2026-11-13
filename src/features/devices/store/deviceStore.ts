import { create } from 'zustand';
import { DeviceSnapshot, LightDevice, LightState, TargetSummary } from '../../../types';
import { deviceService } from '../../../services/deviceService';
import { useSettingsStore } from '../../settings/store/settingsStore';
import {
  DEFAULT_LIGHT_STATE,
  applyPatch,
  mergePatch,
  sameLightState,
} from '../../../utils/lightState';

export interface DeviceGroup {
  id: string;
  name: string;
  deviceMacs: string[];
}

interface DeviceState {
  /** Último estado reportado por el backend para cada lámpara. Fuente de verdad. */
  snapshots: Record<string, DeviceSnapshot>;
  /** Cambios del usuario aún no confirmados; se muestran encima de `snapshots`. */
  overlay: Record<string, Partial<LightState>>;
  deviceNames: Record<string, string>;
  excludedMacs: string[];
  groups: DeviceGroup[];
  selectedMac: string | null;
  selectedGroupId: string | null;
  isScanning: boolean;
  scanFailed: boolean;
  /** Falso hasta que termina la carga inicial de lámparas. */
  isReady: boolean;

  // Vista derivada de lo anterior; se recalcula en cada cambio, no se asigna a mano.
  devices: LightDevice[];
  macToIp: Record<string, string>;
  /** Estado del destino actual: una lámpara, o el conjunto de una habitación. */
  lampState: LightState;
  isConnected: boolean;
  targetSummary: TargetSummary;
  connectionStatus: string;

  init: () => Promise<void>;
  scan: () => Promise<void>;
  refresh: () => Promise<void>;
  addDeviceByIp: (ip: string) => Promise<string | null>;
  selectDevice: (mac: string) => void;
  selectGroup: (id: string | null) => void;
  updateDeviceName: (mac: string, name: string) => Promise<void>;
  applySnapshots: (snapshots: DeviceSnapshot[]) => void;
  setOverlay: (macs: string[], patch: Partial<LightState>) => void;
  clearOverlay: (macs: string[]) => void;
  excludeDevice: (mac: string) => void;
  includeDevice: (mac: string) => void;
  createGroup: (name: string, deviceMacs: string[]) => void;
  updateGroup: (id: string, name: string, deviceMacs: string[]) => void;
  deleteGroup: (id: string) => void;
}

type CoreState = Pick<
  DeviceState,
  | 'snapshots'
  | 'overlay'
  | 'deviceNames'
  | 'excludedMacs'
  | 'groups'
  | 'selectedMac'
  | 'selectedGroupId'
  | 'isScanning'
  | 'scanFailed'
  | 'isReady'
>;
type DerivedState = Pick<
  DeviceState,
  'devices' | 'macToIp' | 'lampState' | 'isConnected' | 'targetSummary' | 'connectionStatus'
>;

const MANUAL_MAC_PREFIX = 'manual-';
const SELECTED_GROUP_KEY = 'selected_group_id';

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (e) {
    console.error(`Failed to save ${key} to localStorage`, e);
  }
}

function migrateExcludedIps(): string[] {
  const legacy = readStorage<unknown>('excluded_ips', null);
  if (Array.isArray(legacy) && legacy.length > 0) {
    writeStorage('excluded_macs', legacy);
    writeStorage('excluded_ips', null);
    return legacy as string[];
  }
  const macs = readStorage<unknown>('excluded_macs', []);
  return Array.isArray(macs) ? (macs as string[]) : [];
}

function migrateGroups(): DeviceGroup[] {
  const parsed = readStorage<unknown>('device_groups', []);
  if (!Array.isArray(parsed)) return [];

  return parsed.map((g: Record<string, unknown>) => ({
    id: (g.id as string) || Math.random().toString(36).substring(2, 9),
    name: (g.name as string) || '',
    deviceMacs: (g.deviceMacs as string[]) || (g.deviceIps as string[]) || [],
  }));
}

/** MACs que recibirán los comandos: la lámpara elegida o los miembros de la habitación. */
function targetMacsOf(state: CoreState): string[] {
  if (state.selectedGroupId) {
    const group = state.groups.find((g) => g.id === state.selectedGroupId);
    return group ? group.deviceMacs.filter((mac) => !state.excludedMacs.includes(mac)) : [];
  }
  return state.selectedMac ? [state.selectedMac] : [];
}

function toDevice(state: CoreState, snapshot: DeviceSnapshot): LightDevice {
  const patch = state.overlay[snapshot.mac];
  const known = snapshot.state ?? (patch ? DEFAULT_LIGHT_STATE : undefined);
  const light = known && patch ? applyPatch(known, patch) : known;

  return {
    mac: snapshot.mac,
    ip: snapshot.ip ?? '',
    name: state.deviceNames[snapshot.mac] || undefined,
    online: snapshot.online,
    // Sin conexión no hay forma de saber si sigue encendida: nunca se muestra
    // como activa, pero se conserva el último color y brillo conocidos.
    state: light && !snapshot.online ? { ...light, state: false } : light,
  };
}

function derive(state: CoreState, prev?: DerivedState): DerivedState {
  const devices = Object.values(state.snapshots).map((snapshot) => toDevice(state, snapshot));
  const macToIp: Record<string, string> = {};
  devices.forEach((d) => {
    if (d.ip) macToIp[d.mac] = d.ip;
  });

  const targetMacs = targetMacsOf(state);
  const members = targetMacs
    .map((mac) => devices.find((d) => d.mac === mac))
    .filter((d): d is LightDevice => d !== undefined);
  const online = members.filter((d) => d.online);
  const on = online.filter((d) => d.state?.state);

  // En un grupo, el color y brillo que se muestran son los de una lámpara
  // representativa: la primera encendida o, si no hay, la primera disponible.
  const lead = on[0] ?? online[0] ?? members[0];
  const lampState: LightState = {
    ...(lead?.state ?? DEFAULT_LIGHT_STATE),
    state: on.length > 0,
  };

  const targetSummary: TargetSummary = {
    total: targetMacs.length,
    online: online.length,
    on: on.length,
  };

  let connectionStatus: string;
  if (state.selectedGroupId) {
    connectionStatus =
      online.length === 0
        ? 'La habitación no responde'
        : `${online.length} de ${targetMacs.length} en línea`;
  } else if (state.selectedMac) {
    connectionStatus = online.length > 0 ? 'Lámpara conectada' : 'Lámpara no responde';
  } else if (state.isScanning || !state.isReady) {
    connectionStatus = 'Buscando lámparas...';
  } else if (state.scanFailed) {
    connectionStatus = 'Error al buscar lámparas';
  } else {
    connectionStatus = devices.length > 0 ? 'Selecciona una lámpara' : 'No se encontraron lámparas';
  }

  return {
    devices,
    macToIp,
    // Conserva la referencia si nada cambió, para no re-renderizar ni
    // re-disparar efectos que dependen del estado de la lámpara.
    lampState: prev && sameLightState(prev.lampState, lampState) ? prev.lampState : lampState,
    isConnected: online.length > 0,
    targetSummary,
    connectionStatus,
  };
}

let _savePrefTimer: ReturnType<typeof setTimeout> | null = null;
let _initPromise: Promise<void> | null = null;
// Lámpara de la sesión anterior: se elige en cuanto aparezca, aunque el
// discovery la encuentre después que a otras.
let _preferredMac: string | null = null;

const initialCore: CoreState = {
  snapshots: {},
  overlay: {},
  deviceNames: {},
  excludedMacs: migrateExcludedIps(),
  groups: migrateGroups(),
  selectedMac: null,
  selectedGroupId: null,
  isScanning: false,
  scanFailed: false,
  isReady: false,
};

export const useDeviceStore = create<DeviceState>((set, get) => {
  // Único punto de escritura: aplica el cambio y recalcula la vista derivada.
  const commit = (partial: Partial<CoreState>) => {
    set((prev) => ({ ...partial, ...derive({ ...prev, ...partial }, prev) }));
  };

  const saveGroups = (groups: DeviceGroup[]) => {
    commit({ groups });
    writeStorage('device_groups', groups);
  };

  const saveExcluded = (excludedMacs: string[]) => {
    commit({ excludedMacs });
    writeStorage('excluded_macs', excludedMacs);
  };

  const firstSelectableMac = (): string | null => {
    const { snapshots, excludedMacs } = get();
    const candidates = Object.keys(snapshots).filter((mac) => !excludedMacs.includes(mac));
    if (_preferredMac && candidates.includes(_preferredMac)) return _preferredMac;
    return candidates.find((mac) => snapshots[mac].online) ?? candidates[0] ?? null;
  };

  // Si no hay nada seleccionado, elige la lámpara guardada o la primera disponible.
  const ensureSelection = () => {
    const { selectedMac, selectedGroupId } = get();
    if (selectedMac || selectedGroupId) return;
    const mac = firstSelectableMac();
    if (mac) get().selectDevice(mac);
  };

  // Versiones anteriores identificaban las lámparas añadidas por IP con una
  // MAC sintética "manual-<ip>". Se reemplaza por la MAC real de cada una.
  const migrateManualMacs = async () => {
    const { groups, excludedMacs, deviceNames } = get();
    const legacy = new Set(
      [...groups.flatMap((g) => g.deviceMacs), ...excludedMacs, _preferredMac ?? ''].filter(
        (mac) => mac.startsWith(MANUAL_MAC_PREFIX),
      ),
    );
    if (legacy.size === 0) return;

    const remap: Record<string, string> = {};
    await Promise.all(
      [...legacy].map(async (mac) => {
        try {
          const device = await deviceService.addDeviceByIp(mac.slice(MANUAL_MAC_PREFIX.length));
          get().applySnapshots([device]);
          remap[mac] = device.mac;
        } catch {
          // La lámpara no responde ahora; se reintentará en el próximo arranque.
        }
      }),
    );
    if (Object.keys(remap).length === 0) return;

    const swap = (mac: string) => remap[mac] ?? mac;
    saveGroups(get().groups.map((g) => ({ ...g, deviceMacs: g.deviceMacs.map(swap) })));
    saveExcluded(get().excludedMacs.map(swap));
    if (_preferredMac) _preferredMac = swap(_preferredMac);
    Object.entries(remap).forEach(([oldMac, newMac]) => {
      const name = deviceNames[oldMac];
      if (name && !get().deviceNames[newMac]) get().updateDeviceName(newMac, name);
    });
  };

  return {
    ...initialCore,
    ...derive(initialCore),

    init: () => {
      // Guard basado en promesa: dos llamadas concurrentes (p. ej. doble efecto de
      // React StrictMode) comparten la misma suscripción en vez de duplicarla.
      if (_initPromise) return _initPromise;

      _initPromise = (async () => {
        // Suscribirse antes de pedir la lista: ningún cambio queda sin ver.
        await deviceService.subscribeToDevices((device) => get().applySnapshots([device]));

        try {
          const prefs = await deviceService.getPreferences();
          _preferredMac = prefs.last_mac;
          commit({ deviceNames: prefs.device_names });
          useSettingsStore.getState().syncThemeFromBackend(prefs.theme ?? null);
        } catch (e) {
          console.error('Failed to load preferences', e);
        }

        try {
          get().applySnapshots(await deviceService.listDevices());
        } catch (e) {
          console.error('Failed to list devices', e);
        }

        await migrateManualMacs();

        const savedGroupId = readStorage<string | null>(SELECTED_GROUP_KEY, null);
        if (savedGroupId && get().groups.some((g) => g.id === savedGroupId)) {
          get().selectGroup(savedGroupId);
        }

        if (Object.keys(get().snapshots).length === 0) {
          await get().scan();
        }
        commit({ isReady: true });

        // Al volver de reposo o de segundo plano la lámpara pudo cambiar (u
        // obtener otra IP): se pide un sondeo inmediato en vez de esperar al ciclo.
        const onResume = () => {
          if (document.visibilityState === 'visible') get().refresh();
        };
        document.addEventListener('visibilitychange', onResume);
        window.addEventListener('focus', onResume);
      })();

      return _initPromise;
    },

    scan: async () => {
      if (get().isScanning) return;
      commit({ isScanning: true, scanFailed: false });
      try {
        get().applySnapshots(await deviceService.discover());
        commit({ isScanning: false });
      } catch (e) {
        commit({ isScanning: false, scanFailed: true });
      }
    },

    refresh: async () => {
      try {
        get().applySnapshots(await deviceService.refresh());
      } catch (e) {
        console.error('Failed to refresh devices', e);
      }
    },

    addDeviceByIp: async (ip) => {
      try {
        const device = await deviceService.addDeviceByIp(ip);
        get().applySnapshots([device]);
        get().selectDevice(device.mac);
        return null;
      } catch (e) {
        return typeof e === 'string' ? e : 'No se encontró una lámpara en esa dirección';
      }
    },

    applySnapshots: (incoming) => {
      if (incoming.length === 0) return;
      const snapshots = { ...get().snapshots };
      incoming.forEach((snapshot) => {
        snapshots[snapshot.mac] = snapshot;
      });
      commit({ snapshots });
      ensureSelection();
    },

    setOverlay: (macs, patch) => {
      const overlay = { ...get().overlay };
      macs.forEach((mac) => {
        overlay[mac] = mergePatch(overlay[mac] ?? {}, patch);
      });
      commit({ overlay });
    },

    clearOverlay: (macs) => {
      const overlay = { ...get().overlay };
      macs.forEach((mac) => delete overlay[mac]);
      commit({ overlay });
    },

    selectDevice: (mac) => {
      commit({
        selectedMac: mac,
        selectedGroupId: null,
        excludedMacs: get().excludedMacs.filter((x) => x !== mac),
      });
      writeStorage('excluded_macs', get().excludedMacs);
      writeStorage(SELECTED_GROUP_KEY, null);

      _preferredMac = mac;
      if (_savePrefTimer) clearTimeout(_savePrefTimer);
      _savePrefTimer = setTimeout(() => {
        deviceService.savePreferences(mac).catch(() => {});
      }, 400);
    },

    selectGroup: (id) => {
      if (id === null) {
        commit({ selectedGroupId: null });
        writeStorage(SELECTED_GROUP_KEY, null);
        return;
      }
      const group = get().groups.find((g) => g.id === id);
      if (!group) return;

      const members = group.deviceMacs.filter((mac) => !get().excludedMacs.includes(mac));
      commit({ selectedGroupId: id, selectedMac: members[0] ?? null });
      writeStorage(SELECTED_GROUP_KEY, id);
    },

    excludeDevice: (mac) => {
      saveExcluded([...get().excludedMacs.filter((x) => x !== mac), mac]);

      const { selectedGroupId, selectedMac } = get();
      if (selectedGroupId) {
        // Recalcula la lámpara representativa de la habitación sin la excluida.
        get().selectGroup(selectedGroupId);
      } else if (selectedMac === mac) {
        commit({ selectedMac: null });
        ensureSelection();
      }
    },

    includeDevice: (mac) => {
      saveExcluded(get().excludedMacs.filter((x) => x !== mac));
      ensureSelection();
    },

    updateDeviceName: async (mac, name) => {
      commit({ deviceNames: { ...get().deviceNames, [mac]: name } });
      try {
        await deviceService.saveDeviceName(mac, name);
      } catch (e) {
        console.error('Failed to save device name to config', e);
      }
    },

    createGroup: (name, deviceMacs) => {
      const newGroup: DeviceGroup = {
        id: Math.random().toString(36).substring(2, 9),
        name,
        deviceMacs,
      };
      saveGroups([...get().groups, newGroup]);
    },

    updateGroup: (id, name, deviceMacs) => {
      saveGroups(get().groups.map((g) => (g.id === id ? { ...g, name, deviceMacs } : g)));
      if (get().selectedGroupId === id) {
        get().selectGroup(id);
      }
    },

    deleteGroup: (id) => {
      saveGroups(get().groups.filter((g) => g.id !== id));
      if (get().selectedGroupId === id) {
        commit({ selectedGroupId: null, selectedMac: null });
        writeStorage(SELECTED_GROUP_KEY, null);
        ensureSelection();
      }
    },
  };
});

/** MACs del destino actual (lámpara o habitación seleccionada). */
export function getTargetMacs(): string[] {
  return targetMacsOf(useDeviceStore.getState());
}

/** De las MACs dadas, las que están en línea y encendidas ahora mismo. */
export function getLitMacs(macs: string[]): string[] {
  const { devices } = useDeviceStore.getState();
  return macs.filter((mac) => devices.find((d) => d.mac === mac)?.state?.state);
}
