import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Github } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { LumusLogo } from '../features/shell/components/LumusLogo';
import { DemoProvider } from '../context/DemoContext';
import { ControlPage } from './ControlPage';
import { RoomCanvas, RoomCanvasHandle } from '../features/hero/components/RoomCanvas';
import { AppWindow } from '../features/hero/components/AppWindow';
import { DownloadSection } from '../features/download/DownloadSection';
import type { LampKind, LampLight, LampSpec } from '../features/hero/roomScene';
import { playSwitchClick } from '../features/hero/clickSound';
import { useDeviceStore } from '../features/devices/store/deviceStore';
import { useLightingStore } from '../features/lighting/store/lightingStore';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { getLampRgbColor } from '../utils/color';
import { lampName } from '../utils/lampAppearance';
import { DEFAULT_LIGHT_STATE } from '../utils/lightState';
import { useTranslation } from '../i18n';

const GITHUB_URL = 'https://github.com/dotfn/lumus-control';

// Un mueble por lámpara de la demo, en el orden en que aparecen.
const LAMP_KINDS: LampKind[] = ['pendant', 'floor', 'table'];

// La habitación arranca a oscuras una sola vez por visita: si se vuelve a la
// landing desde la demo, las lámparas quedan como se dejaron.
let startedDark = false;

export const LandingPage: React.FC = () => {
  const { t, lang, setLang } = useTranslation();
  const devices = useDeviceStore((s) => s.devices);
  const selectedMac = useDeviceStore((s) => s.selectedMac);
  const initDevices = useDeviceStore((s) => s.init);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const { hash } = useLocation();

  const [ready, setReady] = useState(false);
  const [has3d, setHas3d] = useState(true);
  /** Lámpara enfocada por la cámara; `null` es la vista general y `undefined` una vista libre. */
  const [view, setView] = useState<string | null | undefined>(null);
  const [pulled, setPulled] = useState<Record<string, boolean>>({});
  const [viewShift, setViewShift] = useState(0);

  const roomRef = useRef<RoomCanvasHandle>(null);
  const anyPulled = useRef(false);
  // Selección hecha al tirar de una cuerda: no debe mover la cámara.
  const quietSelection = useRef<string | null>(null);
  const lastSelected = useRef<string | null>(null);

  useEffect(() => {
    document.title = t.meta.title;
  }, [t.meta.title]);

  // Los enlaces a `/#download` (incluida la antigua ruta /download) aterrizan aquí.
  useEffect(() => {
    if (hash !== '#download') return;
    document.getElementById('download')?.scrollIntoView({ block: 'start' });
  }, [hash]);

  const scrollToDownload = useCallback(() => {
    document.getElementById('download')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    let cancelled = false;
    initDevices().then(() => {
      if (!startedDark) {
        startedDark = true;
        if (!anyPulled.current) {
          const macs = useDeviceStore.getState().devices.map((d) => d.mac);
          void useLightingStore.getState().setLampState({ state: false }, { macs });
        }
      }
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [initDevices]);

  const roomDevices = useMemo(() => devices.slice(0, LAMP_KINDS.length), [devices]);
  const lampsKey = roomDevices.map((d) => d.mac).join('|');
  const lamps = useMemo<LampSpec[]>(
    () => lampsKey.split('|').filter(Boolean).map((id, i) => ({ id, kind: LAMP_KINDS[i] })),
    [lampsKey],
  );

  const lights = useMemo(() => {
    const next: Record<string, LampLight> = {};
    roomDevices.forEach((device) => {
      const state = device.state ?? DEFAULT_LIGHT_STATE;
      next[device.mac] = {
        on: ready && device.online && state.state,
        rgb: getLampRgbColor(state),
        level: 0.3 + 0.7 * (state.dimming / 100),
      };
    });
    return next;
  }, [roomDevices, ready]);

  const focus = useCallback((id: string | null) => {
    setView(id);
    roomRef.current?.focus(id);
  }, []);

  // Elegir una lámpara en la app lleva la cámara hasta ella.
  useEffect(() => {
    const previous = lastSelected.current;
    lastSelected.current = selectedMac;
    if (!selectedMac || previous === null || previous === selectedMac) return;
    if (quietSelection.current === selectedMac) {
      quietSelection.current = null;
      return;
    }
    if (lamps.some((lamp) => lamp.id === selectedMac)) focus(selectedMac);
  }, [selectedMac, lamps, focus]);

  const select = useCallback(
    (id: string) => {
      lastSelected.current = id;
      useDeviceStore.getState().selectDevice(id);
      focus(id);
    },
    [focus],
  );

  const toggle = useCallback((id: string) => {
    playSwitchClick();
    anyPulled.current = true;
    setPulled((current) => (current[id] ? current : { ...current, [id]: true }));
    const store = useDeviceStore.getState();
    if (store.selectedMac !== id || store.selectedGroupId) {
      quietSelection.current = id;
      store.selectDevice(id);
    }
    const isOn = useDeviceStore.getState().devices.find((d) => d.mac === id)?.state?.state ?? false;
    void useLightingStore.getState().setLampState({ state: !isOn }, { macs: [id] });
  }, []);

  // La escena se centra en el hueco que deja libre la ventana de la app.
  const onWindowLayout = useCallback((rect: { x: number; width: number } | null) => {
    if (!rect) {
      setViewShift(0);
      return;
    }
    const total = window.innerWidth;
    const center = (rect.x + rect.width / 2) / total;
    let shift = 0;
    if (center > 0.56) shift = Math.max(0, total - rect.x) / total / 2;
    else if (center < 0.44) shift = -Math.max(0, rect.x + rect.width) / total / 2;
    setViewShift(Math.max(-0.3, Math.min(0.3, Math.round(shift * 100) / 100)));
  }, []);

  // La interfaz se ilumina con la lámpara más brillante.
  const brightest = Object.values(lights).reduce<LampLight | null>(
    (best, light) => (light.on && (!best || light.level > best.level) ? light : best),
    null,
  );
  const roomStyle = {
    '--lamp': (brightest?.rgb ?? [255, 180, 84]).join(', '),
    '--lit': brightest?.level ?? 0,
  } as React.CSSProperties;

  const views = [
    { id: null as string | null, label: t.hero.room },
    ...roomDevices.map((device) => ({ id: device.mac as string | null, label: lampName(device) })),
  ];

  return (
    <div
      id="landing-scroll"
      className={`hero-room relative w-full h-full overflow-x-hidden overflow-y-auto ${has3d ? '' : 'hero-room--flat'}`}
      style={roomStyle}
    >
      <section className="relative lg:h-[100svh]">
        <div className="relative h-[62svh] min-h-[420px] lg:absolute lg:inset-0 lg:h-auto lg:min-h-0">
          {has3d && lamps.length > 0 && (
            <RoomCanvas
              ref={roomRef}
              className="absolute inset-0"
              lamps={lamps}
              lights={lights}
              viewShift={isDesktop ? viewShift : 0}
              onPull={toggle}
              onSelect={select}
              onUserOrbit={() => setView(undefined)}
              onUnavailable={() => setHas3d(false)}
              renderHint={(lamp, index) => (
                <span className={`hero-hint ${pulled[lamp.id] ? 'is-hidden' : ''}`}>
                  <span className="hero-hint__dot" />
                  {index === 0 && !anyPulled.current && <span className="hero-hint__label">{t.hero.pullCord}</span>}
                </span>
              )}
            />
          )}
          <div className="hero-fade pointer-events-none absolute inset-x-0 bottom-0 h-40 lg:h-80" />

          <nav
            className="hero-views absolute z-10 left-1/2 -translate-x-1/2 bottom-4 lg:left-10 lg:translate-x-0 lg:bottom-auto lg:top-[76px]"
            aria-label={t.hero.viewsAria}
          >
            {views.map((item) => (
              <button
                key={item.id ?? 'room'}
                type="button"
                className="hero-views__item shrink-0"
                aria-pressed={view === item.id}
                onClick={() => (item.id ? select(item.id) : focus(null))}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <p className="hero-ink-3 hidden lg:block absolute z-10 left-10 top-[124px] text-[11px] font-medium pointer-events-none">
            {t.hero.orbitHint}
          </p>
        </div>

        <header className="absolute inset-x-0 top-0 z-20">
          <div className="px-6 lg:px-10 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <LumusLogo variant="badge" size={32} className="shadow-sm" />
              <span className="font-display font-semibold text-sm tracking-tight text-white/90">Lumus Control</span>
            </Link>
            <nav className="flex items-center gap-1.5 text-[13px] font-medium">
              <Link to="/#download" className="hero-navlink" onClick={scrollToDownload}>
                {t.nav.downloads}
              </Link>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hero-navlink" aria-label={t.nav.githubAria}>
                <Github className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">GitHub</span>
              </a>
              <button
                type="button"
                className="hero-navlink"
                onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
                aria-label={`${t.nav.languageLabel}: ${lang === 'es' ? 'Español' : 'English'}`}
              >
                {lang === 'es' ? 'EN' : 'ES'}
              </button>
            </nav>
          </div>
        </header>

        <div className="relative z-10 px-6 pt-8 pb-10 lg:absolute lg:left-10 lg:bottom-10 lg:p-0 lg:max-w-[30rem] lg:pointer-events-none">
          <div className={has3d ? 'sr-only' : 'flex flex-wrap gap-2 mb-5'}>
            {roomDevices.map((device) => (
              <button
                key={device.mac}
                type="button"
                className="hero-switch pointer-events-auto"
                aria-pressed={lights[device.mac]?.on ?? false}
                onClick={() => (has3d ? roomRef.current?.pull(device.mac) : toggle(device.mac))}
              >
                {lights[device.mac]?.on ? t.hero.turnOff : t.hero.turnOn} {lampName(device)}
              </button>
            ))}
          </div>

          <h1 className="hero-ink font-display font-bold text-[40px] sm:text-5xl lg:text-[44px] xl:text-[50px] leading-[1.03] tracking-[-0.03em]">
            {t.hero.titleLine1}
            <br />
            {t.hero.titleLine2}
          </h1>
          <p className="hero-ink-2 mt-4 max-w-[28rem] text-[15px] leading-relaxed">
            {t.hero.subtitle}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to="/#download" className="hero-cta pointer-events-auto" onClick={scrollToDownload}>
              <Download className="w-4 h-4" aria-hidden="true" />
              {t.hero.cta}
            </Link>
            <span className="hero-ink-3 text-xs font-medium">{t.hero.platforms}</span>
          </div>
        </div>

        <div className="px-4 pb-16 lg:p-0">
          <AppWindow title="Lumus Control" floating={isDesktop} onLayout={onWindowLayout}>
            <DemoProvider isDemo={true}>
              <ControlPage hideTitlebar={true} />
            </DemoProvider>
          </AppWindow>
        </div>
      </section>

      <DownloadSection />
    </div>
  );
};
