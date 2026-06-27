import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useDeviceStore } from '../../devices/store/deviceStore';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useSettingsStore();
  const selectedIp = useDeviceStore((s) => s.selectedIp);

  return (
    <button
      onClick={() => toggleTheme(selectedIp)}
      className="p-1.5 rounded-lg border border-theme-border bg-theme-input hover:bg-theme-border text-theme-textSecondary hover:text-theme-text transition-colors duration-200 active:scale-95 flex items-center justify-center relative overflow-hidden group shadow-none"
      aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {/* Sun Icon for switching to light mode */}
        <Sun
          className={`w-4 h-4 absolute transition-[opacity,transform] duration-300 ${
            theme === 'dark'
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 -rotate-90 scale-50 pointer-events-none'
          }`}
          aria-hidden="true"
        />
        {/* Moon Icon for switching to dark mode */}
        <Moon
          className={`w-4 h-4 absolute transition-[opacity,transform] duration-300 ${
            theme === 'light'
              ? 'opacity-100 rotate-0 scale-100'
              : 'opacity-0 rotate-90 scale-50 pointer-events-none'
          }`}
          aria-hidden="true"
        />
      </div>
    </button>
  );
};
