import React from 'react';
import { ThemeToggle } from '../../settings/components/ThemeToggle';
import { UpdaterWidget } from '../../updater/components/UpdaterWidget';

export const Titlebar: React.FC = () => {
  return (
    <div
      data-tauri-drag-region
      className="absolute top-0 left-0 right-0 h-12 bg-theme-card/75 border-b border-theme-border backdrop-blur-xl flex items-center justify-between px-5 select-none z-50 text-xs font-sans text-theme-textSecondary transition-colors duration-300"
      role="toolbar"
      aria-label="Barra de título de la aplicación"
    >
      {/* Spacer for native macOS Traffic Lights */}
      <div className="w-[72px]" />

      {/* App Centered Title */}
      <div data-tauri-drag-region className="absolute left-1/2 -translate-x-1/2 font-sans font-semibold text-theme-text tracking-wide pointer-events-none text-[11px] transition-colors duration-300">
        Lumus Control
      </div>

      {/* Theme toggle and updater widget on the right */}
      <div className="flex items-center gap-2">
        <UpdaterWidget />
        <ThemeToggle />
      </div>
    </div>
  );
};
