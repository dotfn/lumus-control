import React from 'react';
import { Loader2 } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useDeviceStore } from '../../devices/store/deviceStore';
import { useLightingStore } from '../../lighting/store/lightingStore';
import { kelvinToRgb } from '../../../utils/color';
import { formatMac, lampName } from '../../../utils/lampAppearance';
import { formatHour, getCircadianPoints } from '../../lighting/utils/circadian';
import { Row, Section, Segmented } from '../../shell/components/primitives';
import { useTranslation, type Language } from '../../../i18n';

type Theme = 'light' | 'dark';

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
];

interface SettingsViewProps {
  onAddLamp: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onAddLamp }) => {
  const { t, lang, setLang } = useTranslation();
  const theme = useSettingsStore((s) => s.theme);
  const toggleTheme = useSettingsStore((s) => s.toggleTheme);
  const devices = useDeviceStore((s) => s.devices);
  const deviceNames = useDeviceStore((s) => s.deviceNames);
  const excludedMacs = useDeviceStore((s) => s.excludedMacs);
  const selectedMac = useDeviceStore((s) => s.selectedMac);
  const isScanning = useDeviceStore((s) => s.isScanning);
  const scanFailed = useDeviceStore((s) => s.scanFailed);
  const scan = useDeviceStore((s) => s.scan);
  const includeDevice = useDeviceStore((s) => s.includeDevice);
  const location = useLightingStore((s) => s.location);

  const themeOptions: { value: Theme; label: string }[] = [
    { value: 'light', label: t.app.settings.light },
    { value: 'dark', label: t.app.settings.dark },
  ];

  const online = devices.filter((d) => d.online).length;
  const circadianPoints = getCircadianPoints(location?.sunriseHour ?? 6, location?.sunsetHour ?? 19);

  return (
    <>
      <Section title={t.app.settings.appearance}>
        <Row label={t.app.settings.theme}>
          <Segmented
            value={theme}
            options={themeOptions}
            label={t.app.settings.themeAria}
            onChange={(value) => {
              if (value !== theme) toggleTheme(selectedMac);
            }}
          />
        </Row>
        <Row label={t.app.settings.language}>
          <Segmented
            value={lang}
            options={LANGUAGE_OPTIONS}
            label={t.app.settings.languageAria}
            onChange={setLang}
          />
        </Row>
      </Section>

      <Section
        title={t.app.settings.network}
        footer={t.app.settings.networkFooter}
      >
        <Row
          label={t.app.settings.scanLamps}
          hint={
            scanFailed
              ? t.app.settings.scanFailed
              : t.app.settings.scanSummary(devices.length, online)
          }
        >
          <button type="button" className="mac-btn" onClick={scan} disabled={isScanning}>
            {isScanning && <Loader2 size={13} className="mac-spin" />}
            {isScanning ? t.app.settings.searching : t.app.settings.scanNow}
          </button>
        </Row>
        <Row label={t.app.settings.addByIp} hint={t.app.settings.addByIpHint}>
          <button type="button" className="mac-btn" onClick={onAddLamp}>
            {t.app.settings.addDots}
          </button>
        </Row>
      </Section>

      {excludedMacs.length > 0 && (
        <Section title={t.app.settings.hiddenLamps}>
          {excludedMacs.map((mac) => {
            const device = devices.find((d) => d.mac === mac);
            return (
              <Row
                key={mac}
                label={lampName({ mac, name: device?.name ?? deviceNames[mac] })}
                hint={device?.ip || formatMac(mac)}
              >
                <button type="button" className="mac-btn" onClick={() => includeDevice(mac)}>
                  {t.app.settings.show}
                </button>
              </Row>
            );
          })}
        </Section>
      )}

      <Section
        title={t.app.settings.circadianTitle}
        footer={
          location
            ? t.app.settings.circadianFooterLoc(
                location.city || t.app.settings.yourLocation,
                formatHour(location.sunriseHour),
                formatHour(location.sunsetHour),
              )
            : t.app.settings.circadianFooterDefault
        }
      >
        {circadianPoints.map((point) => (
          <Row key={point.name} label={point.name} hint={point.time}>
            <span
              className="mac-chip__dot"
              style={{ background: `rgb(${kelvinToRgb(point.temp).join(',')})` }}
              aria-hidden="true"
            />
            <span className="mac-row__value">
              {point.temp} K · {point.dimming} %
            </span>
          </Row>
        ))}
      </Section>

      <Section title={t.app.settings.about} footer={t.app.settings.aboutFooter}>
        <Row label="Lumus Control">
          <span className="mac-row__value">{t.app.settings.version(__APP_VERSION__)}</span>
        </Row>
        <Row label={t.app.settings.sourceCode}>
          <a
            className="mac-row__value"
            style={{ color: 'var(--m-accent-text)' }}
            href="https://github.com/dotfn/lumus-control"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/dotfn/lumus-control
          </a>
        </Row>
      </Section>
    </>
  );
};
