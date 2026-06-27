import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface ResizeStartData {
  x: number;
  y: number;
  width: number;
  height: number;
  posX: number;
  posY: number;
}

const MIN_WIDTH = 720;
const MIN_HEIGHT = 480;
const DEFAULT_SIZE = { width: 960, height: 640 };

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const handleCursor = (handle: ResizeHandle) => {
  switch (handle) {
    case 'n': case 's': return 'cursor-ns-resize';
    case 'e': case 'w': return 'cursor-ew-resize';
    case 'ne': case 'sw': return 'cursor-nesw-resize';
    case 'nw': case 'se': return 'cursor-nwse-resize';
  }
};

export const FloatingDemoWindow: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();

  const [position, setPosition] = useState(() => ({
    x: Math.round((window.innerWidth - DEFAULT_SIZE.width) / 2),
    y: Math.max(24, Math.round((window.innerHeight - DEFAULT_SIZE.height) / 2)),
  }));
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const activeResizeHandleRef = useRef<ResizeHandle | null>(null);
  const resizeStartRef = useRef<ResizeStartData>({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 });
  const prevStateRef = useRef({ size: DEFAULT_SIZE, position: { x: 0, y: 0 } });

  const positionRef = useRef(position);
  const sizeRef = useRef(size);
  positionRef.current = position;
  sizeRef.current = size;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        setPosition({
          x: clamp(e.clientX - dragOffsetRef.current.x, -sizeRef.current.width + 100, window.innerWidth - 40),
          y: clamp(e.clientY - dragOffsetRef.current.y, -sizeRef.current.height + 100, window.innerHeight - 40),
        });
      } else if (activeResizeHandleRef.current) {
        const start = resizeStartRef.current;
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;

        let newWidth = start.width;
        let newHeight = start.height;
        let newX = start.posX;
        let newY = start.posY;

        switch (activeResizeHandleRef.current) {
          case 'e':
            newWidth = clamp(start.width + dx, MIN_WIDTH, window.innerWidth - start.posX + 20);
            break;
          case 'w':
            newWidth = clamp(start.width - dx, MIN_WIDTH, start.posX + start.width - 20);
            newX = start.posX + (start.width - newWidth);
            break;
          case 's':
            newHeight = clamp(start.height + dy, MIN_HEIGHT, window.innerHeight - start.posY + 20);
            break;
          case 'n':
            newHeight = clamp(start.height - dy, MIN_HEIGHT, start.posY + start.height - 20);
            newY = start.posY + (start.height - newHeight);
            break;
          case 'se':
            newWidth = clamp(start.width + dx, MIN_WIDTH, window.innerWidth - start.posX + 20);
            newHeight = clamp(start.height + dy, MIN_HEIGHT, window.innerHeight - start.posY + 20);
            break;
          case 'sw':
            newWidth = clamp(start.width - dx, MIN_WIDTH, start.posX + start.width - 20);
            newX = start.posX + (start.width - newWidth);
            newHeight = clamp(start.height + dy, MIN_HEIGHT, window.innerHeight - start.posY + 20);
            break;
          case 'ne':
            newWidth = clamp(start.width + dx, MIN_WIDTH, window.innerWidth - start.posX + 20);
            newHeight = clamp(start.height - dy, MIN_HEIGHT, start.posY + start.height - 20);
            newY = start.posY + (start.height - newHeight);
            break;
          case 'nw':
            newWidth = clamp(start.width - dx, MIN_WIDTH, start.posX + start.width - 20);
            newX = start.posX + (start.width - newWidth);
            newHeight = clamp(start.height - dy, MIN_HEIGHT, start.posY + start.height - 20);
            newY = start.posY + (start.height - newHeight);
            break;
        }

        setSize({ width: newWidth, height: newHeight });
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      document.body.classList.remove('is-dragging');
      isDraggingRef.current = false;
      activeResizeHandleRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleDragStart = (e: React.MouseEvent) => {
    if (isMaximized) return;
    isDraggingRef.current = true;
    document.body.classList.add('is-dragging');
    dragOffsetRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleResizeStart = (handle: ResizeHandle) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isMaximized) return;
    activeResizeHandleRef.current = handle;
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
      posX: position.x,
      posY: position.y,
    };
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/');
  };

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMinimized(true);
  };

  const handleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMaximized) {
      setIsMaximized(false);
      setSize(prevStateRef.current.size);
      setPosition(prevStateRef.current.position);
    } else {
      prevStateRef.current = { size: { ...size }, position: { ...position } };
      setIsMaximized(true);
      setSize({ width: window.innerWidth - 40, height: window.innerHeight - 40 });
      setPosition({ x: 20, y: 20 });
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
        <button
          className="bg-theme-card/90 backdrop-blur-xl border border-theme-border rounded-xl px-5 py-3 shadow-2xl flex items-center gap-4 cursor-pointer hover:bg-theme-card transition-all duration-200 active:scale-95"
          onClick={() => setIsMinimized(false)}
        >
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <span className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="text-sm font-semibold text-theme-text">Lumus Control</span>
          <span className="text-[11px] text-theme-textSecondary">— Demo</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed z-50 flex flex-col rounded-xl overflow-hidden shadow-2xl border border-white/15 dark:border-white/10 animate-demo-window-enter"
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
      }}
    >
      <div
        className="relative flex items-center h-10 bg-theme-card/80 backdrop-blur-xl border-b border-theme-border select-none flex-shrink-0 px-4 cursor-grab"
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-[6px]" onMouseDown={(e) => e.stopPropagation()}>
          <div
            className="relative w-[13px] h-[13px] rounded-full bg-[#ff5f57] hover:brightness-90 active:scale-90 cursor-pointer flex items-center justify-center group"
            onClick={handleClose}
          >
            <svg className="w-2.5 h-2.5 text-[#4c0000]/80 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M1.5 1.5 L6.5 6.5 M6.5 1.5 L1.5 6.5" />
            </svg>
          </div>
          <div
            className="relative w-[13px] h-[13px] rounded-full bg-[#febc2e] hover:brightness-90 active:scale-90 cursor-pointer flex items-center justify-center group"
            onClick={handleMinimize}
          >
            <div className="w-2.5 h-[1.5px] rounded-full bg-[#5c4a00]/80 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div
            className="relative w-[13px] h-[13px] rounded-full bg-[#28c840] hover:brightness-90 active:scale-90 cursor-pointer flex items-center justify-center group"
            onClick={handleZoom}
          >
            <svg className="w-2.5 h-2.5 text-[#003d00]/80 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
            </svg>
          </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 font-sans font-semibold text-theme-text text-[11px] tracking-wide pointer-events-none select-none">
          Lumus Control — Demo
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-theme-bg min-h-0">
        {children}
      </div>

      {[
        'nw', 'ne', 'sw', 'se',
        'n', 's', 'e', 'w',
      ].map((h) => (
        <div
          key={h}
          className={`absolute ${handleCursor(h as ResizeHandle)} z-20`}
          style={resizeHandleStyle(h as ResizeHandle)}
          onMouseDown={handleResizeStart(h as ResizeHandle)}
        />
      ))}
    </div>
  );
};

const resizeHandleStyle = (handle: ResizeHandle): React.CSSProperties => {
  const isCorner = handle.length === 2;
  const size = isCorner ? 12 : 6;
  const offset = isCorner ? -3 : 0;

  const style: React.CSSProperties = { position: 'absolute' };

  if (handle.includes('n')) style.top = offset;
  if (handle.includes('s')) style.bottom = offset;
  if (handle.includes('w')) style.left = offset;
  if (handle.includes('e')) style.right = offset;

  if (handle === 'n' || handle === 's') {
    style.left = 12;
    style.right = 12;
    style.height = size;
  } else if (handle === 'e' || handle === 'w') {
    style.top = 12;
    style.bottom = 12;
    style.width = size;
  } else {
    style.width = 12;
    style.height = 12;
  }

  return style;
};
