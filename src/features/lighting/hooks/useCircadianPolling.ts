import { useEffect } from 'react';
import { useLightingStore } from '../store/lightingStore';
import { getCircadianSettingForHour } from '../utils/circadian';

const POLL_INTERVAL_MS = 15 * 60 * 1000;

export const useCircadianPolling = () => {
  useEffect(() => {
    const checkAndApply = () => {
      const state = useLightingStore.getState();
      if (!state.circadianActive) return;
      if (!state.location) return;

      const now = new Date();
      const currentHour = now.getHours() + now.getMinutes() / 60;
      const setting = getCircadianSettingForHour(
        state.location.sunriseHour,
        state.location.sunsetHour,
        currentHour,
      );

      const target = state.circadianTarget;
      if (target && target.temp === setting.temp && target.dimming === setting.dimming) {
        return;
      }

      state.updateCircadianTarget(setting);
    };

    checkAndApply();

    const interval = setInterval(checkAndApply, POLL_INTERVAL_MS);

    // El interval se suspende cuando la máquina duerme; al volver a foreground
    // recalculamos de inmediato la configuración circadiana para la hora actual.
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkAndApply();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
};
