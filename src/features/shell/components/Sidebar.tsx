import React, { useState } from 'react';
import { ChevronRight, LayoutGrid, Plus, Settings } from 'lucide-react';
import { LightDevice } from '../../../types';
import { useDeviceStore } from '../../devices/store/deviceStore';
import { aggregateLamp, roomMembers, summarize, useVisibleDevices } from '../../devices/selectors';
import { lampName } from '../../../utils/lampAppearance';
import { LampTile } from './primitives';
import { useTranslation } from '../../../i18n';

export type AppView = 'target' | 'overview' | 'settings';

interface SidebarProps {
  view: AppView;
  isOpen: boolean;
  /** Reserva espacio arriba para los botones de ventana de macOS. */
  trafficLights: boolean;
  onNavigate: (view: AppView) => void;
  onNewRoom: () => void;
  onAddLamp: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  view,
  isOpen,
  trafficLights,
  onNavigate,
  onNewRoom,
  onAddLamp,
}) => {
  const { t } = useTranslation();
  const devices = useDeviceStore((s) => s.devices);
  const excludedMacs = useDeviceStore((s) => s.excludedMacs);
  const deviceNames = useDeviceStore((s) => s.deviceNames);
  const groups = useDeviceStore((s) => s.groups);
  const selectedMac = useDeviceStore((s) => s.selectedMac);
  const selectedGroupId = useDeviceStore((s) => s.selectedGroupId);
  const selectDevice = useDeviceStore((s) => s.selectDevice);
  const selectGroup = useDeviceStore((s) => s.selectGroup);
  const visible = useVisibleDevices();

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const macsInRooms = new Set(groups.flatMap((g) => g.deviceMacs));
  const unassigned = visible.filter((d) => !macsInRooms.has(d.mac));
  const isTargetView = view === 'target';

  const lampItem = (device: LightDevice, child: boolean) => {
    const isSelected = isTargetView && !selectedGroupId && selectedMac === device.mac;
    return (
      <button
        key={device.mac}
        type="button"
        className={`mac-nav__item ${child ? 'mac-nav__item--child' : ''} ${isSelected ? 'is-selected' : ''}`}
        aria-current={isSelected ? 'page' : undefined}
        onClick={() => {
          selectDevice(device.mac);
          onNavigate('target');
        }}
      >
        <LampTile device={device} />
        <span className="mac-nav__label">{lampName(device)}</span>
        {device.online && device.state?.state && (
          <span className="mac-nav__meta">{device.state.dimming} %</span>
        )}
      </button>
    );
  };

  return (
    <nav className={`mac-sidebar ${isOpen ? 'is-open' : ''}`} aria-label={t.app.sidebar.navAria}>
      <div
        data-tauri-drag-region
        className={`mac-sidebar__top ${trafficLights ? 'mac-sidebar__top--traffic' : ''}`}
      />

      <div className="mac-nav">
        {/* Con una sola lámpara y sin habitaciones no hay nada que resumir. */}
        {(visible.length > 1 || groups.length > 0) && (
          <button
            type="button"
            className={`mac-nav__item ${view === 'overview' ? 'is-selected' : ''}`}
            aria-current={view === 'overview' ? 'page' : undefined}
            onClick={() => onNavigate('overview')}
          >
            <span className="mac-nav__glyph">
              <LayoutGrid size={15} />
            </span>
            <span className="mac-nav__label">{t.app.sidebar.allLamps}</span>
            <span className="mac-nav__meta">{visible.length}</span>
          </button>
        )}

        <div className="mac-nav__header">
          <span>{t.app.sidebar.rooms}</span>
          <button
            type="button"
            className="mac-nav__add"
            onClick={onNewRoom}
            aria-label={t.app.sidebar.newRoom}
            title={t.app.sidebar.newRoom}
          >
            <Plus size={14} />
          </button>
        </div>
        {groups.length === 0 && (
          <p className="mac-nav__empty">{t.app.sidebar.emptyRooms}</p>
        )}
        {groups.map((group) => {
          const members = roomMembers(group, devices, excludedMacs, deviceNames);
          const summary = summarize(members);
          const isSelected = isTargetView && selectedGroupId === group.id;
          const isOpenRoom = !collapsed[group.id];

          return (
            <React.Fragment key={group.id}>
              <div className={`mac-nav__item ${isSelected ? 'is-selected' : ''}`}>
                <button
                  type="button"
                  className={`mac-nav__chevron ${isOpenRoom ? 'is-open' : ''}`}
                  aria-label={isOpenRoom ? t.app.sidebar.collapse(group.name) : t.app.sidebar.expand(group.name)}
                  aria-expanded={isOpenRoom}
                  onClick={() => setCollapsed((prev) => ({ ...prev, [group.id]: isOpenRoom }))}
                >
                  <ChevronRight size={12} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  className="mac-nav__link"
                  aria-current={isSelected ? 'page' : undefined}
                  onClick={() => {
                    selectGroup(group.id);
                    onNavigate('target');
                  }}
                >
                  <LampTile device={aggregateLamp(members)} />
                  <span className="mac-nav__label">{group.name}</span>
                  <span className="mac-nav__meta">
                    {summary.on}/{summary.total}
                  </span>
                </button>
              </div>
              {isOpenRoom && members.map((device) => lampItem(device, true))}
            </React.Fragment>
          );
        })}

        <div className="mac-nav__header">
          <span>{t.app.sidebar.lamps}</span>
          <button
            type="button"
            className="mac-nav__add"
            onClick={onAddLamp}
            aria-label={t.app.sidebar.addByIp}
            title={t.app.sidebar.addByIp}
          >
            <Plus size={14} />
          </button>
        </div>
        {unassigned.length === 0 && (
          <p className="mac-nav__empty">
            {visible.length === 0 ? t.app.sidebar.noLampsFound : t.app.sidebar.allInRooms}
          </p>
        )}
        {unassigned.map((device) => lampItem(device, false))}
      </div>

      <div className="mac-nav__footer">
        <button
          type="button"
          className={`mac-nav__item ${view === 'settings' ? 'is-selected' : ''}`}
          aria-current={view === 'settings' ? 'page' : undefined}
          onClick={() => onNavigate('settings')}
        >
          <span className="mac-nav__glyph">
            <Settings size={15} />
          </span>
          <span className="mac-nav__label">{t.app.sidebar.settings}</span>
        </button>
      </div>
    </nav>
  );
};
