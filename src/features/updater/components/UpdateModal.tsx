import React from 'react';
import { ArrowUpCircle, Download, X, AlertCircle } from 'lucide-react';

interface UpdateModalProps {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error';
  updateInfo: {
    version: string;
    body?: string;
  } | null;
  progress: number;
  errorMsg: string | null;
  downloadAndInstall: () => void;
  dismiss: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  status,
  updateInfo,
  progress,
  errorMsg,
  downloadAndInstall,
  dismiss,
}) => {
  if (status === 'idle' || status === 'checking') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden glass-card flex flex-col gap-5 p-6 select-none">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-theme-accent/15 text-theme-accent">
              <ArrowUpCircle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-theme-text">
                Actualización Disponible
              </h3>
              <p className="text-xs text-theme-textSecondary font-mono mt-0.5">
                Nueva versión: v{updateInfo?.version}
              </p>
            </div>
          </div>
          
          {/* Close button (only if not downloading or ready) */}
          {(status === 'available' || status === 'error') && (
            <button 
              onClick={dismiss}
              className="p-1 rounded-md hover:bg-theme-input text-theme-textSecondary hover:text-theme-text transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col gap-3">
          {status === 'available' && (
            <>
              <p className="text-sm text-theme-textSecondary leading-relaxed">
                Una nueva actualización está disponible para Lumus Control. Te recomendamos instalarla para obtener las últimas características y mejoras.
              </p>
              {updateInfo?.body && (
                <div className="p-3 rounded-lg bg-theme-input border border-theme-border max-h-36 overflow-y-auto">
                  <span className="text-xs font-semibold text-theme-text uppercase tracking-wider block mb-1">
                    Notas de la versión
                  </span>
                  <div className="text-xs text-theme-textSecondary leading-relaxed whitespace-pre-wrap">
                    {updateInfo.body}
                  </div>
                </div>
              )}
            </>
          )}

          {status === 'downloading' && (
            <div className="flex flex-col gap-3 my-2">
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-theme-text">Descargando actualización...</span>
                <span className="text-theme-accent font-mono">{progress}%</span>
              </div>
              <div className="w-full h-2 bg-theme-input rounded-full overflow-hidden border border-theme-border">
                <div 
                  className="h-full bg-theme-accent rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(0,122,255,0.4)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-theme-textSecondary">
                La aplicación se reiniciará automáticamente al completar la instalación.
              </p>
            </div>
          )}

          {status === 'ready' && (
            <div className="flex flex-col items-center justify-center gap-2 py-4">
              <div className="w-12 h-12 rounded-full bg-theme-green/10 text-theme-green flex items-center justify-center animate-bounce">
                <ArrowUpCircle className="w-8 h-8" />
              </div>
              <span className="text-sm font-medium text-theme-text mt-2">
                Instalación completada
              </span>
              <p className="text-xs text-theme-textSecondary text-center">
                Reiniciando la aplicación...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-red-500 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-xs font-medium leading-relaxed">
                  Error: {errorMsg || 'No se pudo completar la actualización.'}
                </span>
              </div>
              <p className="text-xs text-theme-textSecondary">
                Por favor, inténtalo de nuevo más tarde o descarga el instalador manualmente de GitHub.
              </p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-3 border-t border-theme-border pt-4 mt-1">
          {status === 'available' && (
            <>
              <button
                onClick={dismiss}
                className="px-4 py-2 text-sm font-medium rounded-lg text-theme-textSecondary hover:text-theme-text hover:bg-theme-input transition-colors"
              >
                Omitir
              </button>
              <button
                onClick={downloadAndInstall}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-theme-accent text-white hover:bg-theme-accent/90 transition-colors flex items-center gap-2 shadow-[0_2px_4px_rgba(0,122,255,0.2)]"
              >
                <Download className="w-4 h-4" />
                Actualizar ahora
              </button>
            </>
          )}

          {status === 'error' && (
            <button
              onClick={dismiss}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-theme-input text-theme-text hover:bg-theme-input/80 transition-colors"
            >
              Cerrar
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
