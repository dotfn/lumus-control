import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { isTauri } from '../utils/tauri';
import { tauriRouter } from '../router/tauri';
import { webRouter } from '../router/web';
import { useSettingsStore } from '../features/settings/store/settingsStore';

export const App: React.FC = () => {
  const router = isTauri() ? tauriRouter : webRouter;
  const initTheme = useSettingsStore((state) => state.initTheme);

  React.useEffect(() => {
    initTheme();
  }, [initTheme]);

  return <RouterProvider router={router} />;
};
export default App;
