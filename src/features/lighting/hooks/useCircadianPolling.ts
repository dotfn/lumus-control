import { useEffect, useRef } from 'react';
import { useLightingStore } from '../store/lightingStore';
import { getCircadianSettingForHour } from '../utils/circadian';

const POLL_INTERVAL_MS = 15 * 60 * 1000;

export const useCircadianPolling = () => {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      if (
        target &&
        target.temp === setting.temp &&
        target.dimming === setting.dimming
      ) {
        return;
      }

      const lampState = state.lampState;
      if (
        lampState.temp !== undefined &&
        lampState.temp === setting.temp &&
        lampState.dimming === setting.dimming
      ) {
        useLightingStore.setState({
          circadianTarget: setting,
          lastCircadianUpdate: Date.now(),
        });
        return;
      }

      useLightingStore.setState({
        circadianTarget: setting,
        lastCircadianUpdate: Date.now(),
      });

      useLightingStore
        .getState()
        .setLampState(
          { state: true, temp: setting.temp, dimming: setting.dimming, sceneId: undefined },
          { isCircadian: true },
        );
    };

    checkAndApply();

    intervalRef.current = setInterval(checkAndApply, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
};
