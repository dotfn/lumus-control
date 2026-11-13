let context: AudioContext | null = null;

/** Clic seco de interruptor de cadena, sintetizado para no cargar un audio. */
export function playSwitchClick() {
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') void context.resume();
    const now = context.currentTime;

    const length = Math.floor(context.sampleRate * 0.03);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
    }
    const noise = context.createBufferSource();
    noise.buffer = buffer;
    const band = context.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 2600;
    band.Q.value = 1.2;
    const noiseGain = context.createGain();
    noiseGain.gain.value = 0.22;
    noise.connect(band).connect(noiseGain).connect(context.destination);
    noise.start(now);

    const thunk = context.createOscillator();
    thunk.frequency.setValueAtTime(190, now);
    thunk.frequency.exponentialRampToValueAtTime(70, now + 0.06);
    const thunkGain = context.createGain();
    thunkGain.gain.setValueAtTime(0.16, now);
    thunkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    thunk.connect(thunkGain).connect(context.destination);
    thunk.start(now);
    thunk.stop(now + 0.08);
  } catch {
    // Sin audio disponible la lámpara funciona igual.
  }
}
