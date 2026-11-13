import React from 'react';
import { useDeviceStore } from '../store/deviceStore';
import { useLightingStore } from '../../lighting/store/lightingStore';
import { aggregateLamp, roomMembers, summarize, useVisibleDevices } from '../selectors';
import { describeLamp, describeRoom, lampName } from '../../../utils/lampAppearance';
import { LampTile, Section, Switch } from '../../shell/components/primitives';

interface OverviewViewProps {
  /** Se llama tras elegir una lámpara o habitación para abrir su detalle. */
  onOpenTarget: () => void;
}

/** Resumen de toda la casa: cada habitación y cada lámpara con su interruptor. */
export const OverviewView: React.FC<OverviewViewProps> = ({ onOpenTarget }) => {
  const devices = useDeviceStore((s) => s.devices);
  const excludedMacs = useDeviceStore((s) => s.excludedMacs);
  const deviceNames = useDeviceStore((s) => s.deviceNames);
  const groups = useDeviceStore((s) => s.groups);
  const selectDevice = useDeviceStore((s) => s.selectDevice);
  const selectGroup = useDeviceStore((s) => s.selectGroup);
  const setLampState = useLightingStore((s) => s.setLampState);
  const visible = useVisibleDevices();

  const roomOf = (mac: string) => groups.find((g) => g.deviceMacs.includes(mac))?.name;

  return (
    <>
      {groups.length > 0 && (
        <Section title="Habitaciones">
          {groups.map((group) => {
            const members = roomMembers(group, devices, excludedMacs, deviceNames);
            const summary = summarize(members);
            return (
              <div key={group.id} className="mac-row">
                <button
                  type="button"
                  className="mac-row__link"
                  onClick={() => {
                    selectGroup(group.id);
                    onOpenTarget();
                  }}
                >
                  <LampTile device={aggregateLamp(members)} />
                  <div className="mac-row__text">
                    <div className="mac-row__label">{group.name}</div>
                    <div className="mac-row__hint">{describeRoom(summary)}</div>
                  </div>
                </button>
                <div className="mac-row__trailing">
                  <Switch
                    checked={summary.on > 0}
                    disabled={summary.online === 0}
                    label={`Encender ${group.name}`}
                    onChange={(on) => setLampState({ state: on }, { macs: members.map((d) => d.mac) })}
                  />
                </div>
              </div>
            );
          })}
        </Section>
      )}

      <Section title="Lámparas">
        {visible.map((device) => {
          const room = roomOf(device.mac);
          return (
            <div key={device.mac} className="mac-row">
              <button
                type="button"
                className="mac-row__link"
                onClick={() => {
                  selectDevice(device.mac);
                  onOpenTarget();
                }}
              >
                <LampTile device={device} />
                <div className="mac-row__text">
                  <div className="mac-row__label">{lampName(device)}</div>
                  <div className="mac-row__hint">
                    {room ? `${room} · ${describeLamp(device)}` : describeLamp(device)}
                  </div>
                </div>
              </button>
              <div className="mac-row__trailing">
                <Switch
                  checked={!!device.state?.state}
                  disabled={!device.online}
                  label={`Encender ${lampName(device)}`}
                  onChange={(on) => setLampState({ state: on }, { macs: [device.mac] })}
                />
              </div>
            </div>
          );
        })}
      </Section>
    </>
  );
};
