import { useEffect } from 'react';
import { useTimerStore } from '../store/timerStore';

export const useSleepTimerCountdown = () => {
  const timerActive = useTimerStore((state) => state.timerActive);
  const tickTimer = useTimerStore((state) => state.tickTimer);

  useEffect(() => {
    if (!timerActive) return;

    // Tick the timer store every 1 second
    const interval = setInterval(() => {
      tickTimer();
    }, 1000);

    // Al despertar de reposo el interval estuvo suspendido; un tick inmediato
    // recalcula el tiempo restante real (y apaga la lámpara si ya venció).
    const onVisible = () => {
      if (document.visibilityState === 'visible') tickTimer();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [timerActive, tickTimer]);
};
