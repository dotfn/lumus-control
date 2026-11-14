import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { isTauri } from '../utils/tauri';
import { tauriRouter } from '../router/tauri';
import { webRouter } from '../router/web';
import { useSettingsStore } from '../features/settings/store/settingsStore';

export const App: React.FC = () => {
  const tauri = isTauri();
  const router = tauri ? tauriRouter : webRouter;
  const initTheme = useSettingsStore((state) => state.initTheme);

  React.useEffect(() => {
    initTheme();
  }, [initTheme]);

  return (
    <>
      <RouterProvider router={router} />
      {!tauri && <Analytics />}
    </>
  );
};
export default App;
