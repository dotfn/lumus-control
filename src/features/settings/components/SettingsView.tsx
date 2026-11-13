import React from 'react';
import { Loader2 } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useDeviceStore } from '../../devices/store/deviceStore';
import { useLightingStore } from '../../lighting/store/lightingStore';
import { kelvinToRgb } from '../../../utils/color';
import { formatMac, lampName } from '../../../utils/lampAppearance';
import { formatHour, getCircadianPoints } from '../../lighting/utils/circadian';
import { Row, Section, Segmented } from '../../shell/components/primitives';

type Theme = 'light' | 'dark';

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
];

interface SettingsViewProps {
  onAddLamp: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onAddLamp }) => {
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

  const online = devices.filter((d) => d.online).length;
  const circadianPoints = getCircadianPoints(location?.sunriseHour ?? 6, location?.sunsetHour ?? 19);

  return (
    <>
      <Section title="Apariencia">
        <Row label="Tema">
          <Segmented
            value={theme}
            options={THEME_OPTIONS}
            label="Tema de la interfaz"
            onChange={(value) => {
              if (value !== theme) toggleTheme(selectedMac);
            }}
          />
        </Row>
      </Section>

      <Section
        title="Red"
        footer="Las lámparas se buscan solas al abrir la app y cada minuto. Su estado se actualiza al instante, también cuando cambian desde otra app o un interruptor."
      >
        <Row
          label="Buscar lámparas"
          hint={
            scanFailed
              ? 'No se pudo buscar: revisa la conexión de red'
              : `${devices.length} conocidas · ${online} en línea`
          }
        >
          <button type="button" className="mac-btn" onClick={scan} disabled={isScanning}>
            {isScanning && <Loader2 size={13} className="mac-spin" />}
            {isScanning ? 'Buscando…' : 'Buscar ahora'}
          </button>
        </Row>
        <Row label="Añadir por dirección IP" hint="Para lámparas en otra subred">
          <button type="button" className="mac-btn" onClick={onAddLamp}>
            Añadir…
          </button>
        </Row>
      </Section>

      {excludedMacs.length > 0 && (
        <Section title="Lámparas ocultas">
          {excludedMacs.map((mac) => {
            const device = devices.find((d) => d.mac === mac);
            return (
              <Row
                key={mac}
                label={lampName({ mac, name: device?.name ?? deviceNames[mac] })}
                hint={device?.ip || formatMac(mac)}
              >
                <button type="button" className="mac-btn" onClick={() => includeDevice(mac)}>
                  Mostrar
                </button>
              </Row>
            );
          })}
        </Section>
      )}

      <Section
        title="Ritmo circadiano"
        footer={
          location
            ? `Horarios calculados para ${location.city || 'tu ubicación'}: amanece a las ${formatHour(location.sunriseHour)} y anochece a las ${formatHour(location.sunsetHour)}. Se activa desde cada lámpara o habitación.`
            : 'Horarios de referencia; se ajustan a tu amanecer y atardecer al activarlo desde una lámpara o habitación.'
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

      <Section title="Acerca de" footer="Control local de lámparas WiZ por UDP. Sin cuentas ni nube. Licencia MIT.">
        <Row label="Lumus Control">
          <span className="mac-row__value">Versión {__APP_VERSION__}</span>
        </Row>
        <Row label="Código fuente">
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
