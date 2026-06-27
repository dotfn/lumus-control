import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DemoProvider } from '../context/DemoContext';
import { ControlPage } from './ControlPage';
import { FloatingDemoWindow } from '../features/layout/components/FloatingDemoWindow';
import { useMediaQuery } from '../hooks/useMediaQuery';

export const DemoPage: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const handleClose = useCallback(() => {
    navigate('/');
  }, [navigate]);

  React.useEffect(() => {
    document.title = 'Lumus Control — Demo interactiva';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  if (isMobile) {
    return (
      <DemoProvider isDemo={true}>
        <div className="w-full h-full">
          <ControlPage hideTitlebar={false} onBack={handleClose} />
        </div>
      </DemoProvider>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-[#0a0a0f] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/40 via-transparent to-purple-950/40" />
        <div className="absolute top-1/3 left-1/3 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] animate-fade-in">
        <div className="bg-theme-card/80 backdrop-blur-2xl border border-theme-border/60 rounded-2xl shadow-2xl px-4 py-2.5 flex items-center gap-3 select-none max-w-full mx-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-theme-accent/15 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-theme-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 14c-2 0-3 1-3 1s-1-1-3-1-3 1-3 1" />
                <circle cx="9" cy="10" r="1" fill="currentColor" />
                <circle cx="15" cy="10" r="1" fill="currentColor" />
                <path d="M12 2a10 10 0 1 0 10 10" />
                <path d="M22 2 12 12" />
                <path d="M22 2v6" />
                <path d="M16 2h6" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-theme-text">Lumus Control</span>
          </div>

          <div className="w-px h-5 bg-theme-border/60" />

          <div className="flex items-center gap-1.5 text-xs text-theme-textSecondary">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Demo activa
          </div>

          <div className="w-px h-5 bg-theme-border/60" />

          <button
            onClick={handleClose}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-theme-textSecondary hover:text-theme-text hover:bg-theme-border/50 rounded-lg transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            aria-label="Cerrar demo y volver al inicio"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.5 1 L4 7.5 L10.5 14" />
            </svg>
            Cerrar
          </button>
        </div>
      </div>

      <DemoProvider isDemo={true}>
        <FloatingDemoWindow>
          <ControlPage hideTitlebar={true} />
        </FloatingDemoWindow>
      </DemoProvider>
    </>
  );
};
