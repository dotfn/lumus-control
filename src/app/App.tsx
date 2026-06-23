import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { isTauri } from '../utils/tauri';
import { tauriRouter } from '../router/tauri';
import { webRouter } from '../router/web';
import { useSettingsStore } from '../features/settings/store/settingsStore';
import { useAppUpdater } from '../features/updater/hooks/useAppUpdater';
import { UpdateModal } from '../features/updater/components/UpdateModal';

export const App: React.FC = () => {
  const router = isTauri() ? tauriRouter : webRouter;
  const initTheme = useSettingsStore((state) => state.initTheme);
  
  const { status, updateInfo, progress, errorMsg, downloadAndInstall, dismiss } = useAppUpdater();

  React.useEffect(() => {
    initTheme();
  }, [initTheme]);

  return (
    <>
      <RouterProvider router={router} />
      <UpdateModal
        status={status}
        updateInfo={updateInfo}
        progress={progress}
        errorMsg={errorMsg}
        downloadAndInstall={downloadAndInstall}
        dismiss={dismiss}
      />
    </>
  );
};
export default App;
