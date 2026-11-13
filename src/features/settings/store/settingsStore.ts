import { create } from 'zustand';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { deviceService } from '../../../services/deviceService';
import { isTauri } from '../../../utils/tauri';

// En macOS la ventana usa el material translúcido nativo; un color de fondo
// opaco lo taparía, así que solo se pinta en las demás plataformas.
const IS_MAC = typeof navigator !== 'undefined' && /Mac/i.test(navigator.userAgent);

function setWindowBackground(win: ReturnType<typeof getCurrentWebviewWindow>, theme: 'light' | 'dark') {
  if (IS_MAC) return;
  win.setBackgroundColor(theme === 'dark' ? '#1e1e20' : '#ffffff').catch((e) => {
    console.warn('Failed to set native window background color:', e);
  });
}

interface SettingsState {
  theme: 'light' | 'dark';
  toggleTheme: (selectedMac?: string | null) => void;
  initTheme: () => void;
  syncThemeFromBackend: (backendTheme: string | null) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: (() => {
    if (typeof window === 'undefined') return 'dark';
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  })(),

  toggleTheme: (selectedMac?: string | null) => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark';
    set({ theme: newTheme });
    localStorage.setItem('theme', newTheme);

    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    if (isTauri()) {
      try {
        const win = getCurrentWebviewWindow();
        win.setTheme(newTheme === 'dark' ? 'dark' : 'light').catch((e) => {
          console.warn('Failed to set native window theme:', e);
        });
        setWindowBackground(win, newTheme);
      } catch (e) {
        console.warn('Tauri window API is not available:', e);
      }
    }

    const mac = selectedMac !== undefined ? selectedMac : null;
    deviceService.savePreferences(mac, newTheme).catch(() => {});
  },

  initTheme: () => {
    const isDark = document.documentElement.classList.contains('dark');
    const finalTheme = isDark ? 'dark' : 'light';

    set({ theme: finalTheme });
    localStorage.setItem('theme', finalTheme);

    if (isTauri()) {
      try {
        const win = getCurrentWebviewWindow();
        win.setTheme(finalTheme === 'dark' ? 'dark' : 'light').catch((e) => {
          console.warn('Failed to set native window theme:', e);
        });
        setWindowBackground(win, finalTheme);
      } catch (e) {
        console.warn('Tauri window API is not available:', e);
      }
    }
  },

  syncThemeFromBackend: (backendTheme: string | null) => {
    if (!localStorage.getItem('theme') && backendTheme) {
      const theme = backendTheme as 'light' | 'dark';
      localStorage.setItem('theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      set({ theme });
    }
  },
}));
