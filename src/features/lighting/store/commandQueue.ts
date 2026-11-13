import { LightState } from '../../../types';
import { deviceService } from '../../../services/deviceService';
import { useDeviceStore } from '../../devices/store/deviceStore';
import { mergePatch } from '../../../utils/lightState';

// Intervalo mínimo entre envíos a un mismo destino. La UI se actualiza en cada
// evento (slider fluido), pero a la lámpara le llega como máximo un setPilot
// cada SEND_INTERVAL_MS con los cambios intermedios ya combinados.
const SEND_INTERVAL_MS = 120;

interface Channel {
  macs: string[];
  pending: Partial<LightState> | null;
  lastSentAt: number;
}

// Un canal por destino (una lámpara o un conjunto de ellas).
const channels = new Map<string, Channel>();
// Cuántos canales activos incluyen a cada lámpara.
const busy = new Map<string, number>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Envía cambios a un conjunto de lámparas mostrando el resultado de inmediato.
 *
 * Por cada destino hay un único comando en vuelo: lo que llegue mientras tanto
 * se combina y sale en el siguiente envío. Así los comandos nunca se cruzan en
 * la red y el último valor elegido es siempre el que queda en la lámpara.
 */
export function sendLightCommand(macs: string[], patch: Partial<LightState>) {
  if (macs.length === 0) return;
  useDeviceStore.getState().setOverlay(macs, patch);

  const key = [...macs].sort().join('|');
  const channel = channels.get(key);
  if (channel) {
    channel.pending = channel.pending ? mergePatch(channel.pending, patch) : patch;
    return;
  }

  const created: Channel = { macs, pending: patch, lastSentAt: 0 };
  channels.set(key, created);
  macs.forEach((mac) => busy.set(mac, (busy.get(mac) ?? 0) + 1));
  void drain(key, created);
}

async function drain(key: string, channel: Channel) {
  while (channel.pending) {
    const wait = SEND_INTERVAL_MS - (Date.now() - channel.lastSentAt);
    if (wait > 0) await sleep(wait);

    const patch = channel.pending;
    channel.pending = null;
    channel.lastSentAt = Date.now();

    try {
      const outcomes = await deviceService.control(channel.macs, patch);
      useDeviceStore
        .getState()
        .applySnapshots(outcomes.flatMap((outcome) => (outcome.device ? [outcome.device] : [])));
    } catch (e) {
      console.error('Error al enviar comando de control:', e);
    }
  }

  channels.delete(key);

  // El cambio optimista se retira cuando ya no queda nada en vuelo para esa
  // lámpara: desde ahí manda el estado confirmado por el backend, que revierte
  // la vista por sí solo si el comando no llegó.
  const released = channel.macs.filter((mac) => {
    const remaining = (busy.get(mac) ?? 1) - 1;
    if (remaining > 0) {
      busy.set(mac, remaining);
      return false;
    }
    busy.delete(mac);
    return true;
  });
  useDeviceStore.getState().clearOverlay(released);
}
