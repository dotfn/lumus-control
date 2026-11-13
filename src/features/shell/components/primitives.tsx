import React, { useEffect, useRef } from 'react';
import { Lightbulb, LightbulbOff, WifiOff } from 'lucide-react';
import { LightDevice } from '../../../types';
import { lampFill } from '../../../utils/lampAppearance';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  size?: 'md' | 'lg';
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, label, disabled, size = 'md' }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`mac-switch ${size === 'lg' ? 'mac-switch--lg' : ''}`}
  >
    <span className="mac-switch__knob" />
  </button>
);

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label: string;
  /** Degradado CSS para la pista, en lugar del relleno de acento. */
  track?: string;
}

export const Slider: React.FC<SliderProps> = ({ value, min, max, step = 1, onChange, label, track }) => {
  const style = {
    '--pct': `${((value - min) / (max - min)) * 100}%`,
    ...(track ? { '--track': track } : {}),
  } as React.CSSProperties;

  return (
    <input
      type="range"
      className={`mac-slider ${track ? 'mac-slider--wide' : ''}`}
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value, 10))}
      aria-label={label}
      style={style}
    />
  );
};

interface SegmentedProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
  fill?: boolean;
}

export function Segmented<T extends string>({ value, options, onChange, label, fill }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={`mac-segmented ${fill ? 'mac-segmented--fill' : ''}`}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className="mac-segmented__item"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

interface SectionProps {
  title?: string;
  footer?: string;
  disabled?: boolean;
  children: React.ReactNode;
}

/** Lista agrupada al estilo de Ajustes del Sistema: título, filas y nota al pie. */
export const Section: React.FC<SectionProps> = ({ title, footer, disabled, children }) => (
  <section className={`mac-section ${disabled ? 'is-disabled' : ''}`} aria-disabled={disabled || undefined}>
    {title && <h2 className="mac-section__title">{title}</h2>}
    <div className="mac-group">{children}</div>
    {footer && <p className="mac-section__footer">{footer}</p>}
  </section>
);

interface RowProps {
  icon?: React.ReactNode;
  label: string;
  hint?: string;
  children?: React.ReactNode;
}

export const Row: React.FC<RowProps> = ({ icon, label, hint, children }) => (
  <div className="mac-row">
    {icon && <span className="mac-row__icon">{icon}</span>}
    <div className="mac-row__text">
      <div className="mac-row__label">{label}</div>
      {hint && <div className="mac-row__hint">{hint}</div>}
    </div>
    {children && <div className="mac-row__trailing">{children}</div>}
  </div>
);

interface LampTileProps {
  /** Lámpara (o estado agregado de una habitación) a representar. */
  device?: Pick<LightDevice, 'online' | 'state'>;
  size?: 'sm' | 'lg';
}

/** Mosaico que adelanta el estado de un vistazo: color actual, apagada o sin conexión. */
export const LampTile: React.FC<LampTileProps> = ({ device, size = 'sm' }) => {
  const lit = lampFill(device);
  const fill = lit && ({
    background: lit.background,
    color: lit.color,
    '--tile-glow': lit.glow,
  } as React.CSSProperties);
  const iconSize = size === 'lg' ? 28 : 13;
  const Icon = !device?.online ? WifiOff : fill ? Lightbulb : LightbulbOff;

  return (
    <span
      className={`mac-tile ${size === 'lg' ? 'mac-tile--lg' : ''} ${fill ? 'is-lit' : ''}`}
      style={fill}
      aria-hidden="true"
    >
      <Icon size={iconSize} strokeWidth={size === 'lg' ? 1.75 : 2.25} />
    </span>
  );
};

/** Mosaico de color fijo para identificar una fila de ajustes. */
export const IconTile: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
  <span className="mac-icon-tile" style={{ background: color }} aria-hidden="true">
    {children}
  </span>
);

interface SheetProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}

/** Hoja modal anclada a la ventana. Se cierra con Escape o clic fuera. */
export const Sheet: React.FC<SheetProps> = ({ title, description, onClose, children }) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  // En una ref para que el efecto corra una sola vez: si dependiera de onClose,
  // cada render del padre devolvería el foco al primer campo mientras se escribe.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    sheetRef.current?.querySelector<HTMLElement>('input, select, button')?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      previous?.focus();
    };
  }, []);

  return (
    <div
      className="mac-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={sheetRef} className="mac-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <h2 className="mac-sheet__title">{title}</h2>
        {description && <p className="mac-sheet__text">{description}</p>}
        {children}
      </div>
    </div>
  );
};
