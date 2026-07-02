import { create } from 'zustand';
import { useLightingStore } from '../../lighting/store/lightingStore';

// Marca de tiempo del último ajuste de fade-out enviado a la lámpara.
// Limita los comandos de red a uno cada 15s aunque el tick corra cada segundo.
let _lastFadeSentAt = 0;
const FADE_STEP_MS = 15000;

interface TimerState {
  timerActive: boolean;
  timerSeconds: number;
  totalTimerSeconds: number;
  timerFadeOut: boolean;
  initialDimming: number;
  // Fin del temporizador como timestamp absoluto. El countdown se deriva de
  // Date.now() en cada tick: si la máquina duerme, al despertar el tiempo
  // restante es el real y no el número de ticks que alcanzaron a ejecutarse.
  endTime: number | null;

  // Actions
  startTimer: (minutes: number, fadeOut: boolean, currentDimming: number) => void;
  tickTimer: () => void;
  cancelTimer: () => void;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  timerActive: false,
  timerSeconds: 0,
  totalTimerSeconds: 0,
  timerFadeOut: false,
  initialDimming: 100,
  endTime: null,

  startTimer: (minutes, fadeOut, currentDimming) => {
    const seconds = minutes * 60;
    _lastFadeSentAt = 0;
    set({
      timerActive: true,
      timerSeconds: seconds,
      totalTimerSeconds: seconds,
      timerFadeOut: fadeOut,
      initialDimming: currentDimming,
      endTime: Date.now() + seconds * 1000,
    });
  },

  tickTimer: () => {
    const { endTime, timerFadeOut, totalTimerSeconds, initialDimming, cancelTimer } = get();
    if (endTime === null) return;

    const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));

    if (remaining <= 0) {
      cancelTimer();
      // Turn off light
      useLightingStore.getState().setLampState({ state: false });
      return;
    }

    set({ timerSeconds: remaining });

    // Gradual Fade-out: ajustar brillo como máximo cada 15s para no saturar la red.
    if (timerFadeOut && Date.now() - _lastFadeSentAt >= FADE_STEP_MS) {
      const progress = remaining / totalTimerSeconds; // 1.0 down to 0.0
      const minDim = 10;
      const range = initialDimming - minDim;
      if (range > 0) {
        const targetDimming = Math.max(minDim, Math.round(minDim + range * progress));
        const currentDimming = useLightingStore.getState().lampState.dimming;
        if (targetDimming !== currentDimming) {
          _lastFadeSentAt = Date.now();
          useLightingStore.getState().setLampState({ dimming: targetDimming });
        }
      }
    }
  },

  cancelTimer: () => {
    set({
      timerActive: false,
      timerSeconds: 0,
      totalTimerSeconds: 0,
      timerFadeOut: false,
      endTime: null,
    });
  },
}));
