import { useState, useEffect, useCallback } from 'react';
import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { isTauri } from '../../../utils/tauri';

export interface UpdateInfo {
  version: string;
  date?: string;
  body?: string;
}

export const useAppUpdater = () => {
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error'>('idle');
  const [update, setUpdate] = useState<Update | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const checkForUpdates = useCallback(async () => {
    if (!isTauri()) return;

    setStatus('checking');
    setErrorMsg(null);

    try {
      const pendingUpdate = await check();
      if (pendingUpdate) {
        setUpdate(pendingUpdate);
        setUpdateInfo({
          version: pendingUpdate.version,
          date: pendingUpdate.date,
          body: pendingUpdate.body,
        });
        setStatus('available');
      } else {
        setStatus('idle');
      }
    } catch (err) {
      console.error('Error checking for updates:', err);
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }, []);

  const downloadAndInstall = useCallback(async () => {
    if (!update) return;

    setStatus('downloading');
    setProgress(0);
    setErrorMsg(null);

    try {
      let downloaded = 0;
      let contentLength = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength || 0;
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              setProgress(Math.round((downloaded / contentLength) * 100));
            }
            break;
          case 'Finished':
            setStatus('ready');
            break;
        }
      });

      // Relaunch the app immediately
      await relaunch();
    } catch (err) {
      console.error('Error downloading and installing update:', err);
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }, [update]);

  const dismiss = useCallback(() => {
    setStatus('idle');
  }, []);

  useEffect(() => {
    if (isTauri()) {
      // Check for updates shortly after app startup
      const timer = setTimeout(() => {
        checkForUpdates();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [checkForUpdates]);

  return {
    status,
    updateInfo,
    progress,
    errorMsg,
    checkForUpdates,
    downloadAndInstall,
    dismiss,
  };
};
