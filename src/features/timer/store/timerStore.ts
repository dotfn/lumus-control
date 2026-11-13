import { create } from 'zustand';
import { useLightingStore } from '../../lighting/store/lightingStore';
import { getLitMacs, getTargetMacs, useDeviceStore } from '../../devices/store/deviceStore';

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
  // Lámparas a apagar, fijadas al iniciar: cambiar la selección mientras corre
  // el temporizador no debe terminar apagando otra lámpara.
  targetMacs: string[];

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
  targetMacs: [],

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
      targetMacs: getTargetMacs(),
    });
  },

  tickTimer: () => {
    const { endTime, timerFadeOut, totalTimerSeconds, initialDimming, targetMacs, cancelTimer } = get();
    if (endTime === null) return;

    const remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));

    if (remaining <= 0) {
      cancelTimer();
      // Turn off light
      useLightingStore.getState().setLampState({ state: false }, { macs: targetMacs });
      return;
    }

    set({ timerSeconds: remaining });

    // Gradual Fade-out: ajustar brillo como máximo cada 15s para no saturar la red.
    if (timerFadeOut && Date.now() - _lastFadeSentAt >= FADE_STEP_MS) {
      const progress = remaining / totalTimerSeconds; // 1.0 down to 0.0
      const minDim = 10;
      const range = initialDimming - minDim;
      // Solo atenúa las que siguen encendidas: si ya se apagaron a mano, un
      // cambio de brillo no debe volver a encenderlas.
      const litMacs = getLitMacs(targetMacs);
      if (range > 0 && litMacs.length > 0) {
        const targetDimming = Math.max(minDim, Math.round(minDim + range * progress));
        const { devices } = useDeviceStore.getState();
        const currentDimming = devices.find((d) => d.mac === litMacs[0])?.state?.dimming;
        if (targetDimming !== currentDimming) {
          _lastFadeSentAt = Date.now();
          useLightingStore.getState().setLampState({ dimming: targetDimming }, { macs: litMacs });
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
      targetMacs: [],
    });
  },
}));
