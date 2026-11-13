import React, { useState } from 'react';
import { Loader2, Pencil, TriangleAlert } from 'lucide-react';
import { LightState } from '../../../types';
import { useDeviceStore } from '../../devices/store/deviceStore';
import { useLightingStore } from '../store/lightingStore';
import { roomMembers } from '../../devices/selectors';
import {
  describeLamp,
  describeRoom,
  describeSignal,
  formatMac,
  lampName,
} from '../../../utils/lampAppearance';
import { LampTile, Row, Section, Switch } from '../../shell/components/primitives';
import { LightControls } from './LightControls';
import { AutomationSection } from './AutomationSection';

interface TargetViewProps {
  onEditRoom: (groupId: string) => void;
}

/**
 * Detalle del destino seleccionado. La misma pantalla sirve para una lámpara
 * y para una habitación: cambian el encabezado y la última sección.
 */
export const TargetView: React.FC<TargetViewProps> = ({ onEditRoom }) => {
  const devices = useDeviceStore((s) => s.devices);
  const snapshots = useDeviceStore((s) => s.snapshots);
  const excludedMacs = useDeviceStore((s) => s.excludedMacs);
  const deviceNames = useDeviceStore((s) => s.deviceNames);
  const groups = useDeviceStore((s) => s.groups);
  const selectedMac = useDeviceStore((s) => s.selectedMac);
  const selectedGroupId = useDeviceStore((s) => s.selectedGroupId);
  const lampState = useDeviceStore((s) => s.lampState);
  const isConnected = useDeviceStore((s) => s.isConnected);
  const targetSummary = useDeviceStore((s) => s.targetSummary);
  const isScanning = useDeviceStore((s) => s.isScanning);
  const scan = useDeviceStore((s) => s.scan);
  const selectDevice = useDeviceStore((s) => s.selectDevice);
  const excludeDevice = useDeviceStore((s) => s.excludeDevice);
  const updateDeviceName = useDeviceStore((s) => s.updateDeviceName);
  const setLampState = useLightingStore((s) => s.setLampState);

  const [draftName, setDraftName] = useState<string | null>(null);

  const group = selectedGroupId ? groups.find((g) => g.id === selectedGroupId) : undefined;
  const device = !group && selectedMac ? devices.find((d) => d.mac === selectedMac) : undefined;
  if (!group && !device) return null;

  const members = group ? roomMembers(group, devices, excludedMacs, deviceNames) : device ? [device] : [];
  const targetMacs = members.map((d) => d.mac);
  const title = group ? group.name : device ? lampName(device) : '';
  const status = group
    ? describeRoom(targetSummary)
    : device
      ? describeLamp(device)
      : '';

  const commitName = () => {
    if (device && draftName !== null && draftName.trim() && draftName.trim() !== device.name) {
      updateDeviceName(device.mac, draftName.trim());
    }
    setDraftName(null);
  };

  const setMemberPower = (mac: string, on: boolean) => {
    setLampState({ state: on }, { macs: [mac] });
  };

  return (
    <>
      <header className="mac-hero">
        <LampTile device={{ online: isConnected, state: lampState }} size="lg" />
        <div className="mac-hero__text">
          {device && draftName !== null ? (
            <input
              className="mac-input mac-input--title"
              aria-label="Nombre de la lámpara"
              value={draftName}
              maxLength={60}
              autoFocus
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitName();
                if (e.key === 'Escape') setDraftName(null);
              }}
            />
          ) : (
            <div className="mac-hero__title-row">
              <h1 className="mac-hero__title">{title}</h1>
              <button
                type="button"
                className="mac-hero__edit"
                aria-label={group ? 'Editar habitación' : 'Cambiar nombre'}
                title={group ? 'Editar habitación' : 'Cambiar nombre'}
                onClick={() => (group ? onEditRoom(group.id) : setDraftName(device?.name ?? ''))}
              >
                <Pencil size={13} />
              </button>
            </div>
          )}
          <p className="mac-hero__status">{status}</p>
        </div>
        <Switch
          size="lg"
          checked={lampState.state}
          disabled={!isConnected}
          label={group ? `Encender ${group.name}` : 'Encender lámpara'}
          onChange={(on) => setLampState({ state: on })}
        />
      </header>

      {members.length === 0 ? (
        <div className="mac-notice" role="status">
          <TriangleAlert size={18} className="mac-notice__icon" aria-hidden="true" />
          <div className="mac-row__text">
            <div>Esta habitación no tiene lámparas</div>
            <div className="mac-row__hint">Añade alguna para poder controlarla.</div>
          </div>
          {group && (
            <button type="button" className="mac-btn" onClick={() => onEditRoom(group.id)}>
              Editar…
            </button>
          )}
        </div>
      ) : (
        <>
          {!isConnected && (
            <div className="mac-notice" role="status">
              <TriangleAlert size={18} className="mac-notice__icon" aria-hidden="true" />
              <div className="mac-row__text">
                <div>{group ? 'Ninguna lámpara responde' : 'La lámpara no responde'}</div>
                <div className="mac-row__hint">
                  Comprueba que tenga corriente y esté en la misma red Wi‑Fi. Se reconectará sola.
                </div>
              </div>
              <button type="button" className="mac-btn" onClick={scan} disabled={isScanning}>
                {isScanning && <Loader2 size={13} className="mac-spin" />}
                Buscar
              </button>
            </div>
          )}

          <LightControls
            lampState={lampState}
            disabled={!isConnected}
            onChange={(patch: Partial<LightState>) => setLampState(patch)}
          />

          <AutomationSection
            targetMacs={targetMacs}
            currentDimming={lampState.dimming}
            disabled={!isConnected}
          />
        </>
      )}

      {group && members.length > 0 && (
        <Section
          title="Lámparas"
          footer="El interruptor de cada una funciona por separado del de la habitación."
        >
          {members.map((member) => (
            <div key={member.mac} className="mac-row">
              <button type="button" className="mac-row__link" onClick={() => selectDevice(member.mac)}>
                <LampTile device={member} />
                <div className="mac-row__text">
                  <div className="mac-row__label">{lampName(member)}</div>
                  <div className="mac-row__hint">{describeLamp(member)}</div>
                </div>
              </button>
              <div className="mac-row__trailing">
                <Switch
                  checked={!!member.state?.state}
                  disabled={!member.online}
                  label={`Encender ${lampName(member)}`}
                  onChange={(on) => setMemberPower(member.mac, on)}
                />
              </div>
            </div>
          ))}
        </Section>
      )}

      {device && (
        <Section title="Información">
          <Row label="Dirección IP">
            <span className="mac-row__value">{device.ip || 'Desconocida'}</span>
          </Row>
          <Row label="Dirección MAC">
            <span className="mac-row__value">{formatMac(device.mac)}</span>
          </Row>
          <Row label="Señal Wi‑Fi">
            <span className="mac-row__value">
              {device.online ? describeSignal(snapshots[device.mac]?.rssi) : '—'}
            </span>
          </Row>
          <Row label="Ocultar lámpara" hint="Deja de aparecer en la lista; se recupera desde Ajustes">
            <button type="button" className="mac-btn" onClick={() => excludeDevice(device.mac)}>
              Ocultar
            </button>
          </Row>
        </Section>
      )}
    </>
  );
};
