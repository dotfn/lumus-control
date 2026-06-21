import { create } from 'zustand';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { wizService } from '../../../services/wizService';

interface SettingsState {
  theme: 'light' | 'dark';
  toggleTheme: (selectedIp?: string | null) => void;
  initTheme: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: 'dark', // Default to dark theme

  toggleTheme: (selectedIp?: string | null) => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark';
    set({ theme: newTheme });
    localStorage.setItem('theme', newTheme);

    // Apply class to root HTML tag
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Set native system window theme & background color
    const win = getCurrentWebviewWindow();
    win.setTheme(newTheme === 'dark' ? 'dark' : 'light').catch((e) => {
      console.warn('Failed to set native window theme:', e);
    });
    win.setBackgroundColor(newTheme === 'dark' ? '#141416' : '#f5f5f7').catch((e) => {
      console.warn('Failed to set native window background color:', e);
    });

    // Save theme to backend — IP is provided by caller to avoid circular dependency
    const ip = selectedIp !== undefined ? selectedIp : null;
    wizService.savePreferences(ip, newTheme).catch(() => {});
  },

  initTheme: () => {
    // El script inline en index.html ya aplicó la clase 'dark' en el <html>
    // antes del primer paint. Solo leemos el DOM para sincronizar el store
    // y la ventana nativa de Tauri.
    const isDark = document.documentElement.classList.contains('dark');
    const finalTheme = isDark ? 'dark' : 'light';

    set({ theme: finalTheme });
    localStorage.setItem('theme', finalTheme);

    const win = getCurrentWebviewWindow();
    win.setTheme(finalTheme === 'dark' ? 'dark' : 'light').catch((e) => {
      console.warn('Failed to set native window theme:', e);
    });
    win.setBackgroundColor(finalTheme === 'dark' ? '#141416' : '#f5f5f7').catch((e) => {
      console.warn('Failed to set native window background color:', e);
    });
  },
}));
