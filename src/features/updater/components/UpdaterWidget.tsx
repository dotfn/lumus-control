import React, { useState, useRef, useEffect } from 'react';
import { Download, ArrowUpCircle, X, AlertCircle, Loader2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppUpdater } from '../hooks/useAppUpdater';

export const UpdaterWidget: React.FC = () => {
  const {
    status,
    updateInfo,
    progress,
    errorMsg,
    downloadAndInstall,
    dismiss,
  } = useAppUpdater();

  const [isOpen, setIsOpen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Toggle dropdown menu
  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on Escape key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Focus trap for accessibility when open
  useEffect(() => {
    if (!isOpen) return;

    const focusableElements = containerRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex="0"]'
    );
    if (!focusableElements || focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => {
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [isOpen]);

  // If no update is available and we're not checking/error/downloading, don't show the widget
  if (status === 'idle' || status === 'checking') {
    return null;
  }

  return (
    <div ref={containerRef} className="relative flex items-center justify-center">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        onClick={toggleDropdown}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`Actualización disponible. Versión ${updateInfo?.version || ''}`}
        title="Actualización disponible"
        className={`relative p-2 rounded-lg text-theme-textSecondary hover:text-theme-text hover:bg-theme-input transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent ${
          status === 'downloading' ? 'animate-pulse text-theme-accent' : ''
        }`}
      >
        <ArrowUpCircle className="w-5 h-5" />
        
        {/* Glowing badge indicator (pulse) */}
        {status !== 'ready' && status !== 'downloading' && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-theme-accent ring-4 ring-theme-accent/20 animate-ping" />
        )}
        
        {status === 'downloading' && (
          <span className="absolute -bottom-1 -right-1 bg-theme-accent text-[8px] font-bold text-white px-1 rounded-full font-mono scale-90">
            {progress}%
          </span>
        )}
      </button>

      {/* Dropdown Menu (System Tray Menu style) */}
      {isOpen && (
        <div
          role="menu"
          aria-label="Menú de actualización"
          className="absolute right-0 top-10 w-80 glass-card bg-theme-card/95 border border-theme-border backdrop-blur-2xl rounded-xl shadow-2xl p-4 flex flex-col gap-4 z-50 animate-fade-in text-left select-text"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-theme-border pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-theme-accent" />
              <span className="text-sm font-semibold text-theme-text">
                Actualización de software
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar menú"
              className="p-1 rounded-md text-theme-textSecondary hover:text-theme-text hover:bg-theme-input transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body content based on state */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-theme-textSecondary uppercase font-semibold tracking-wider">
                Versión disponible
              </span>
              <span className="text-sm font-medium text-theme-text">
                Lumus Control v{updateInfo?.version || '0.0.0'}
              </span>
            </div>

            {/* Available State details */}
            {status === 'available' && (
              <p className="text-xs text-theme-textSecondary leading-relaxed mt-1">
                Hay mejoras de rendimiento, estabilidad y nuevas funciones disponibles.
              </p>
            )}

            {/* Expandable Changelog Release Notes */}
            {status === 'available' && updateInfo?.body && (
              <div className="mt-1">
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  aria-expanded={showNotes}
                  className="flex items-center gap-1 text-[11px] font-semibold text-theme-accent hover:text-theme-accent/80 transition-colors focus-visible:outline-none"
                >
                  {showNotes ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      Ocultar novedades
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      Ver novedades de la versión
                    </>
                  )}
                </button>
                {showNotes && (
                  <div className="mt-2 p-2 rounded-lg bg-theme-input border border-theme-border max-h-28 overflow-y-auto text-[11px] leading-relaxed text-theme-textSecondary whitespace-pre-wrap">
                    {updateInfo.body}
                  </div>
                )}
              </div>
            )}

            {/* Downloading State Progress */}
            {status === 'downloading' && (
              <div className="flex flex-col gap-2 my-1">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-theme-text">Descargando actualización...</span>
                  <span className="text-theme-accent font-mono">{progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-theme-input rounded-full overflow-hidden border border-theme-border">
                  <div
                    className="h-full bg-theme-accent rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(0,122,255,0.4)]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-[10px] text-theme-textSecondary italic">
                  La app se reiniciará sola al finalizar.
                </span>
              </div>
            )}

            {/* Ready State */}
            {status === 'ready' && (
              <div className="flex items-center gap-2 py-1 text-theme-green">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs font-semibold">
                  Instalado. Reiniciando Lumus Control...
                </span>
              </div>
            )}

            {/* Error State */}
            {status === 'error' && (
              <div className="flex items-start gap-2 text-red-500 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="font-semibold">Error al actualizar</span>
                  <span className="leading-snug text-[10px] text-red-400">
                    {errorMsg || 'Error inesperado.'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-2 border-t border-theme-border pt-3">
            {status === 'available' && (
              <>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    dismiss();
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg text-theme-textSecondary hover:text-theme-text hover:bg-theme-input transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-theme-accent"
                >
                  Omitir
                </button>
                <button
                  onClick={downloadAndInstall}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-theme-accent text-white hover:bg-theme-accent/90 transition-colors flex items-center gap-1.5 shadow-[0_2px_4px_rgba(0,122,255,0.2)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-theme-accent"
                >
                  <Download className="w-3.5 h-3.5" />
                  Instalar ahora
                </button>
              </>
            )}

            {status === 'error' && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  dismiss();
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-theme-input text-theme-text hover:bg-theme-input/80 transition-colors focus-visible:outline-none"
              >
                Entendido
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
