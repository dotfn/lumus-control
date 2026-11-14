import React, { useEffect, useState } from 'react';
import { ArrowLeft, Lightbulb, Loader2, PanelLeft, RefreshCw } from 'lucide-react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { Link } from 'react-router-dom';
import { isTauri } from '../utils/tauri';
import { useDemo } from '../context/DemoContext';

import { useDeviceStore } from '../features/devices/store/deviceStore';
import { useSettingsStore } from '../features/settings/store/settingsStore';
import { useVisibleDevices } from '../features/devices/selectors';

import { useSleepTimerCountdown } from '../features/timer/hooks/useSleepTimerCountdown';
import { useCircadianPolling } from '../features/lighting/hooks/useCircadianPolling';

import { AppView, Sidebar } from '../features/shell/components/Sidebar';
import { TargetView } from '../features/lighting/components/TargetView';
import { OverviewView } from '../features/devices/components/OverviewView';
import { AddLampSheet, RoomSheet } from '../features/devices/components/DeviceSheets';
import { SettingsView } from '../features/settings/components/SettingsView';
import { UpdaterWidget } from '../features/updater/components/UpdaterWidget';
import { useTranslation } from '../i18n';
import '../features/shell/shell.css';

type ControlPageProps = {
  hideTitlebar?: boolean;
  onBack?: () => void;
};

type ActiveSheet = { kind: 'room'; groupId?: string } | { kind: 'add-lamp' } | null;

const IS_MAC = typeof navigator !== 'undefined' && /Mac/i.test(navigator.userAgent);

export const ControlPage: React.FC<ControlPageProps> = ({ hideTitlebar = false, onBack }) => {
  const { t } = useTranslation();
  const [view, setView] = useState<AppView>('target');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sheet, setSheet] = useState<ActiveSheet>(null);
  const { isDemo } = useDemo();

  const devices = useDeviceStore((s) => s.devices);
  const groups = useDeviceStore((s) => s.groups);
  const selectedMac = useDeviceStore((s) => s.selectedMac);
  const selectedGroupId = useDeviceStore((s) => s.selectedGroupId);
  const connectionStatus = useDeviceStore((s) => s.connectionStatus);
  const isScanning = useDeviceStore((s) => s.isScanning);
  const isReady = useDeviceStore((s) => s.isReady);
  const scan = useDeviceStore((s) => s.scan);
  const initDevices = useDeviceStore((s) => s.init);
  const initTheme = useSettingsStore((s) => s.initTheme);
  const visible = useVisibleDevices();

  useSleepTimerCountdown();
  useCircadianPolling();

  useEffect(() => {
    initTheme();
    if (isTauri()) {
      try {
        getCurrentWebviewWindow().show().catch(() => { });
      } catch (e) {
        console.warn('Tauri window show is not available', e);
      }
    }
    initDevices();
  }, [initTheme, initDevices]);

  useEffect(() => {
    let resizeTimer: number;
    const handleResize = () => {
      document.documentElement.classList.add('resizing');
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        document.documentElement.classList.remove('resizing');
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  const group = selectedGroupId ? groups.find((g) => g.id === selectedGroupId) : undefined;
  const device = !group && selectedMac ? devices.find((d) => d.mac === selectedMac) : undefined;
  const hasTarget = !!group || !!device;
  // Sin nada que resumir (una sola lámpara), "Todas" cae al detalle.
  const canOverview = visible.length > 1 || groups.length > 0;
  const activeView: AppView = view === 'overview' && !canOverview ? 'target' : view;

  const navigate = (next: AppView) => {
    setView(next);
    setSidebarOpen(false);
  };

  let title: string;
  let subtitle: string;
  let dot: string;
  if (activeView === 'settings') {
    title = t.app.toolbar.settings;
    subtitle = '';
    dot = '';
  } else if (activeView === 'overview') {
    const lit = visible.filter((d) => d.online && d.state?.state).length;
    const offline = visible.filter((d) => !d.online).length;
    title = t.app.toolbar.allLamps;
    subtitle = t.app.toolbar.allSummary(lit, visible.length, offline);
    dot = offline === 0 ? 'mac-dot--ok' : offline === visible.length ? 'mac-dot--bad' : 'mac-dot--warn';
  } else if (hasTarget) {
    // El detalle ya lleva nombre y estado en su encabezado; repetirlos aquí
    // sería ruido. La barra queda como zona de arrastre con las acciones.
    title = '';
    subtitle = '';
    dot = '';
  } else {
    title = 'Lumus Control';
    subtitle = connectionStatus;
    dot = '';
  }

  const isSearching = isScanning || !isReady;
  const trafficLights = isTauri() && IS_MAC && !hideTitlebar;

  return (
    <div className={`mac-app ${trafficLights ? 'mac-app--traffic' : ''}`}>
      <button
        type="button"
        className={`mac-scrim ${sidebarOpen ? 'is-open' : ''}`}
        aria-label={t.app.toolbar.closeSidebar}
        onClick={() => setSidebarOpen(false)}
      />
      <Sidebar
        view={activeView}
        isOpen={sidebarOpen}
        trafficLights={trafficLights}
        onNavigate={navigate}
        onNewRoom={() => setSheet({ kind: 'room' })}
        onAddLamp={() => setSheet({ kind: 'add-lamp' })}
      />

      <main className="mac-main">
        <div className="mac-toolbar" data-tauri-drag-region>
          {onBack && (
            <button type="button" className="mac-toolbtn" onClick={onBack} aria-label={t.app.toolbar.backHome}>
              <ArrowLeft size={17} />
            </button>
          )}
          <button
            type="button"
            className="mac-toolbtn mac-toolbtn--menu"
            onClick={() => setSidebarOpen(true)}
            aria-label={t.app.toolbar.openSidebar}
          >
            <PanelLeft size={17} />
          </button>
          <div className="mac-toolbar__titles" data-tauri-drag-region>
            {title && (
              <div className="mac-toolbar__title" data-tauri-drag-region>
                {title}
              </div>
            )}
            {subtitle && (
              <div className="mac-toolbar__subtitle" data-tauri-drag-region role="status">
                {dot && <span className={`mac-dot ${dot}`} aria-hidden="true" />}
                {subtitle}
              </div>
            )}
          </div>
          <UpdaterWidget />
          <div className="mac-toolgroup">
            <button
              type="button"
              className="mac-toolbtn"
              onClick={scan}
              disabled={isScanning}
              aria-label={t.app.toolbar.scanLamps}
              title={t.app.toolbar.scanLamps}
            >
              <RefreshCw size={15} className={isScanning ? 'mac-spin' : ''} />
            </button>
          </div>
        </div>

        {isDemo && (
          <div className="mac-banner">
            <span>
              <strong>{t.app.toolbar.demoBadge}</strong> {t.app.toolbar.demoText}
            </span>
            {isTauri() ? (
              <a
                className="mac-btn mac-btn--primary"
                href="https://lumuscontrol.app/#download"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.app.toolbar.downloadApp}
              </a>
            ) : (
              <Link className="mac-btn mac-btn--primary" to="/#download">
                {t.app.toolbar.downloadApp}
              </Link>
            )}
          </div>
        )}

        <div className="mac-content">
          <div className="mac-content__inner">
            {activeView === 'settings' ? (
              <SettingsView onAddLamp={() => setSheet({ kind: 'add-lamp' })} />
            ) : activeView === 'overview' ? (
              <OverviewView onOpenTarget={() => navigate('target')} />
            ) : hasTarget ? (
              // La clave reinicia el estado local (pestaña de color, edición
              // del nombre) al cambiar de lámpara o habitación.
              <TargetView
                key={group ? `room:${group.id}` : `lamp:${device?.mac}`}
                onEditRoom={(groupId) => setSheet({ kind: 'room', groupId })}
              />
            ) : (
              <div className="mac-empty">
                {isSearching ? (
                  <Loader2 size={40} strokeWidth={1.5} className="mac-empty__icon mac-spin" />
                ) : (
                  <Lightbulb size={44} strokeWidth={1.25} className="mac-empty__icon" />
                )}
                <h1 className="mac-empty__title">
                  {isSearching ? t.app.toolbar.searching : t.app.toolbar.notFound}
                </h1>
                <p className="mac-empty__text">
                  {isSearching ? t.app.toolbar.searchingHint : t.app.toolbar.notFoundHint}
                </p>
                {!isSearching && (
                  <div className="mac-empty__actions">
                    <button type="button" className="mac-btn mac-btn--primary" onClick={scan}>
                      {t.app.toolbar.scanAgain}
                    </button>
                    <button type="button" className="mac-btn" onClick={() => setSheet({ kind: 'add-lamp' })}>
                      {t.app.toolbar.addByIp}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {sheet?.kind === 'room' && <RoomSheet groupId={sheet.groupId} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'add-lamp' && <AddLampSheet onClose={() => setSheet(null)} />}
    </div>
  );
};
