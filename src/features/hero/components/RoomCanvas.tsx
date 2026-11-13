import React, { useEffect, useRef } from 'react';
import type { LampLight, LampSpec, RoomScene } from '../roomScene';

export interface RoomCanvasHandle {
  pull: (id: string) => void;
  focus: (id: string | null) => void;
}

interface RoomCanvasProps {
  lamps: LampSpec[];
  lights: Record<string, LampLight>;
  /** Desplazamiento del encuadre, como fracción del ancho (ver `RoomScene.setViewShift`). */
  viewShift: number;
  onPull: (id: string) => void;
  onSelect: (id: string) => void;
  onUserOrbit: () => void;
  /** Contenido que acompaña al tirador de cada lámpara (pistas). */
  renderHint?: (lamp: LampSpec, index: number) => React.ReactNode;
  /** WebGL no disponible: la página ofrece otro modo de accionar las lámparas. */
  onUnavailable: () => void;
  className?: string;
}

export const RoomCanvas = React.forwardRef<RoomCanvasHandle, RoomCanvasProps>(
  ({ lamps, lights, viewShift, onPull, onSelect, onUserOrbit, renderHint, onUnavailable, className = '' }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const hintRefs = useRef<(HTMLDivElement | null)[]>([]);
    const sceneRef = useRef<RoomScene | null>(null);
    const latest = useRef({ lamps, lights, viewShift, onPull, onSelect, onUserOrbit, onUnavailable });
    latest.current = { lamps, lights, viewShift, onPull, onSelect, onUserOrbit, onUnavailable };

    React.useImperativeHandle(
      ref,
      () => ({
        pull: (id) => sceneRef.current?.pull(id),
        focus: (id) => sceneRef.current?.focus(id),
      }),
      [],
    );

    // La escena solo se reconstruye si cambia el conjunto de lámparas.
    const lampsKey = lamps.map((lamp) => `${lamp.id}:${lamp.kind}`).join('|');

    useEffect(() => {
      let cancelled = false;
      // three.js va en su propio chunk: el texto de la página no espera al 3D.
      import('../roomScene')
        .then(({ createRoomScene }) => {
          if (cancelled || !canvasRef.current) return;
          const scene = createRoomScene(canvasRef.current, {
            lamps: latest.current.lamps,
            onPull: (id) => latest.current.onPull(id),
            onSelect: (id) => latest.current.onSelect(id),
            onUserOrbit: () => latest.current.onUserOrbit(),
            onHandleMove: (index, x, y) => {
              const hint = hintRefs.current[index];
              if (hint) hint.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            },
          });
          scene.setViewShift(latest.current.viewShift);
          Object.entries(latest.current.lights).forEach(([id, light]) => scene.setLight(id, light));
          sceneRef.current = scene;
        })
        .catch((e) => {
          console.warn('No se pudo iniciar la escena 3D', e);
          if (!cancelled) latest.current.onUnavailable();
        });

      return () => {
        cancelled = true;
        sceneRef.current?.dispose();
        sceneRef.current = null;
      };
    }, [lampsKey]);

    useEffect(() => {
      const scene = sceneRef.current;
      if (scene) Object.entries(lights).forEach(([id, light]) => scene.setLight(id, light));
    }, [lights]);

    useEffect(() => {
      sceneRef.current?.setViewShift(viewShift);
    }, [viewShift]);

    return (
      <div className={`overflow-hidden ${className}`}>
        <canvas ref={canvasRef} className="block w-full h-full" aria-hidden="true" />
        {renderHint && (
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            {lamps.map((lamp, index) => (
              <div
                key={lamp.id}
                ref={(el) => {
                  hintRefs.current[index] = el;
                }}
                className="absolute left-0 top-0 will-change-transform"
              >
                {renderHint(lamp, index)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
);
RoomCanvas.displayName = 'RoomCanvas';
