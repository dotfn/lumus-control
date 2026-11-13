import React, { useCallback, useEffect, useRef, useState } from 'react';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface AppWindowProps {
  title: string;
  /** En pantallas chicas la ventana va fija en el flujo de la página. */
  floating: boolean;
  /** Zona que ocupa la ventana (o `null` si está minimizada o no flota). */
  onLayout?: (rect: Rect | null) => void;
  children: React.ReactNode;
}

const MIN_WIDTH = 380;
const MIN_HEIGHT = 360;
const TOP_INSET = 72;
const EDGES: Edge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const initialRect = (): Rect => {
  // Desde 660 px la app muestra su barra lateral; se respeta si la pantalla da.
  const width = clamp(window.innerWidth * 0.46, window.innerWidth >= 1280 ? 660 : 440, 840);
  const height = clamp(window.innerHeight - 200, 420, 620);
  return {
    width,
    height,
    x: window.innerWidth - width - 40,
    y: Math.max(TOP_INSET + 12, (window.innerHeight - height) / 2 - 10),
  };
};

/** Mantiene la barra de título al alcance aunque la ventana se salga del borde. */
const keepReachable = (rect: Rect): Rect => ({
  ...rect,
  x: clamp(rect.x, 120 - rect.width, window.innerWidth - 120),
  y: clamp(rect.y, 0, window.innerHeight - 48),
});

const edgeStyle = (edge: Edge): React.CSSProperties => {
  const corner = edge.length === 2;
  const style: React.CSSProperties = {
    position: 'absolute',
    touchAction: 'none',
    cursor: edge === 'n' || edge === 's' ? 'ns-resize' : edge === 'e' || edge === 'w' ? 'ew-resize' : edge === 'ne' || edge === 'sw' ? 'nesw-resize' : 'nwse-resize',
  };
  if (edge.includes('n')) style.top = 0;
  if (edge.includes('s')) style.bottom = 0;
  if (edge.includes('w')) style.left = 0;
  if (edge.includes('e')) style.right = 0;
  if (corner) {
    style.width = 14;
    style.height = 14;
  } else if (edge === 'n' || edge === 's') {
    style.left = 14;
    style.right = 14;
    style.height = 6;
  } else {
    style.top = 14;
    style.bottom = 14;
    style.width = 6;
  }
  return style;
};

export const AppWindow: React.FC<AppWindowProps> = ({ title, floating, onLayout, children }) => {
  const [rect, setRect] = useState(initialRect);
  const [minimized, setMinimized] = useState(false);
  const [restore, setRestore] = useState<Rect | null>(null);
  const gesture = useRef<{ edge: Edge | 'move'; startX: number; startY: number; start: Rect } | null>(null);
  const [busy, setBusy] = useState(false);

  // La página solo necesita la posición final, no cada cuadro del arrastre.
  useEffect(() => {
    if (busy) return;
    onLayout?.(floating && !minimized ? rect : null);
  }, [busy, floating, minimized, rect, onLayout]);

  useEffect(() => {
    const onResize = () => {
      setRestore(null);
      setRect((current) =>
        keepReachable({
          ...current,
          width: Math.min(current.width, window.innerWidth - 32),
          height: Math.min(current.height, window.innerHeight - TOP_INSET - 16),
        }),
      );
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const begin = (edge: Edge | 'move') => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    gesture.current = { edge, startX: e.clientX, startY: e.clientY, start: rect };
    setRestore(null);
    setBusy(true);
  };

  const move = (e: React.PointerEvent) => {
    const current = gesture.current;
    if (!current) return;
    const dx = e.clientX - current.startX;
    const dy = e.clientY - current.startY;
    const { start, edge } = current;

    if (edge === 'move') {
      setRect(keepReachable({ ...start, x: start.x + dx, y: start.y + dy }));
      return;
    }

    const next = { ...start };
    if (edge.includes('e')) next.width = clamp(start.width + dx, MIN_WIDTH, window.innerWidth - start.x - 8);
    if (edge.includes('s')) next.height = clamp(start.height + dy, MIN_HEIGHT, window.innerHeight - start.y - 8);
    if (edge.includes('w')) {
      next.width = clamp(start.width - dx, MIN_WIDTH, start.x + start.width - 8);
      next.x = start.x + start.width - next.width;
    }
    if (edge.includes('n')) {
      next.height = clamp(start.height - dy, MIN_HEIGHT, start.y + start.height - 8);
      next.y = start.y + start.height - next.height;
    }
    setRect(next);
  };

  const end = () => {
    if (!gesture.current) return;
    gesture.current = null;
    setBusy(false);
  };

  const toggleZoom = useCallback(() => {
    if (restore) {
      setRect(restore);
      setRestore(null);
      return;
    }
    setRestore(rect);
    setRect({
      x: 24,
      y: TOP_INSET,
      width: window.innerWidth - 48,
      height: window.innerHeight - TOP_INSET - 24,
    });
  }, [rect, restore]);

  const frame = (
    <>
      <div
        className={`hero-window__bar ${floating ? 'cursor-grab active:cursor-grabbing touch-none' : ''}`}
        onPointerDown={floating ? begin('move') : undefined}
        onPointerMove={floating ? move : undefined}
        onPointerUp={floating ? end : undefined}
        onPointerCancel={floating ? end : undefined}
        onDoubleClick={floating ? toggleZoom : undefined}
      >
        {floating ? (
          <div className="flex items-center gap-[7px]" onPointerDown={(e) => e.stopPropagation()}>
            <button type="button" className="hero-window__dot bg-[#ff5f57]" aria-label="Ocultar la app" onClick={() => setMinimized(true)} />
            <button type="button" className="hero-window__dot bg-[#febc2e]" aria-label="Minimizar la app" onClick={() => setMinimized(true)} />
            <button
              type="button"
              className="hero-window__dot bg-[#28c840]"
              aria-label={restore ? 'Restaurar tamaño de la app' : 'Agrandar la app'}
              onClick={toggleZoom}
            />
          </div>
        ) : (
          <div className="flex items-center gap-[7px]" aria-hidden="true">
            <span className="hero-window__dot bg-[#ff5f57]" />
            <span className="hero-window__dot bg-[#febc2e]" />
            <span className="hero-window__dot bg-[#28c840]" />
          </div>
        )}
        <span className="hero-window__title">{title}</span>
      </div>
      <div className="flex-1 min-h-0 select-none">{children}</div>
    </>
  );

  if (!floating) {
    // La app es siempre oscura aquí: vive dentro de la habitación.
    return <div className="dark hero-window w-full h-[600px] flex flex-col">{frame}</div>;
  }

  return (
    <>
      <div
        className={`dark hero-window absolute z-30 flex flex-col ${busy ? '' : 'hero-window--settled'} ${minimized ? 'hidden' : ''}`}
        style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
      >
        {frame}
        {EDGES.map((edge) => (
          <div
            key={edge}
            style={edgeStyle(edge)}
            onPointerDown={begin(edge)}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
          />
        ))}
      </div>
      {minimized && (
        <button type="button" className="hero-dock absolute z-30 right-10 bottom-10" onClick={() => setMinimized(false)}>
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="hero-window__dot bg-[#ff5f57]" />
            <span className="hero-window__dot bg-[#febc2e]" />
            <span className="hero-window__dot bg-[#28c840]" />
          </span>
          Abrir {title}
        </button>
      )}
    </>
  );
};
