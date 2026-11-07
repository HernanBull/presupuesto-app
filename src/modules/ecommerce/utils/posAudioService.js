/**
 * posAudioService.js
 * Motor de efectos de sonido modernos para el Punto de Venta (POS) de Axon Market.
 * Basado en la Web Audio API nativa: Cero latencia, sin archivos de audio externos ni problemas de red.
 */

let audioCtx = null;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

/**
 * Sonido Beep digital moderno para escaneo y agregado de productos
 */
export function playPosBeep() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Frecuencia inicial agradable a 1760Hz (A6) con decaimiento rápido
    osc.frequency.setValueAtTime(1760, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1980, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.085);
  } catch (e) {
    // Silencioso ante restricciones de autoplay
  }
}

/**
 * Sonido moderno de Caja Registradora ("Ka-ching" y apertura de gaveta)
 */
export function playCashRegisterSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Primer ding de campana metálica
    const bellOsc = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bellOsc.type = 'sine';
    bellOsc.frequency.setValueAtTime(2489, now); // Re#7 brillante
    bellGain.gain.setValueAtTime(0.2, now);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    bellOsc.connect(bellGain);
    bellGain.connect(ctx.destination);
    bellOsc.start(now);
    bellOsc.stop(now + 0.45);

    // 2. Segundo ding armónico de caja ("Ka-ching")
    const bellOsc2 = ctx.createOscillator();
    const bellGain2 = ctx.createGain();
    bellOsc2.type = 'triangle';
    bellOsc2.frequency.setValueAtTime(3136, now + 0.08); // Sol7
    bellGain2.gain.setValueAtTime(0.18, now + 0.08);
    bellGain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    bellOsc2.connect(bellGain2);
    bellGain2.connect(ctx.destination);
    bellOsc2.start(now + 0.08);
    bellOsc2.stop(now + 0.55);

    // 3. Tintineo mecánico de monedas / gaveta (simulado con ruido blanco filtrado)
    const bufferSize = ctx.sampleRate * 0.25;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(4200, now + 0.04);
    filter.Q.setValueAtTime(3.5, now + 0.04);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15, now + 0.04);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noise.start(now + 0.04);
    noise.stop(now + 0.28);
  } catch (e) {
    // Silencioso ante restricciones
  }
}

/**
 * Sonido sutil para eliminación o ajuste menor
 */
export function playItemRemovedSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(380, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.09);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.095);
  } catch (e) {
    // Silencioso
  }
}
