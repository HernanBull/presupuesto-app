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
 * Sonido auténtico de Caja Registradora con tintineo de monedas de dólar cayendo en gaveta
 */
export function playCashRegisterSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Función auxiliar para sintetizar el "clink" metálico de una moneda
    const playCoinClink = (startTime, freq1, freq2, gainLevel) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(freq1, startTime);
      osc2.frequency.setValueAtTime(freq2, startTime);

      gainNode.gain.setValueAtTime(gainLevel, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + 0.18);
      osc2.stop(startTime + 0.18);
    };

    // 1. Cascada de monedas de metal chocando alegremente (tintineo de dólar)
    playCoinClink(now, 4186, 6272, 0.22); // Do8
    playCoinClink(now + 0.07, 4698, 7040, 0.24); // Re8
    playCoinClink(now + 0.14, 5587, 8372, 0.26); // Fa8

    // 2. Campana de caja registradora clásica ("Ka-ching")
    const bellOsc = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bellOsc.type = 'sine';
    bellOsc.frequency.setValueAtTime(2637, now + 0.18); // Mi7
    bellOsc.frequency.exponentialRampToValueAtTime(3520, now + 0.28); // La7
    bellGain.gain.setValueAtTime(0.28, now + 0.18);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    bellOsc.connect(bellGain);
    bellGain.connect(ctx.destination);
    bellOsc.start(now + 0.18);
    bellOsc.stop(now + 0.7);

    // 3. Resonador metálico de apertura de gaveta
    const drawerOsc = ctx.createOscillator();
    const drawerGain = ctx.createGain();
    drawerOsc.type = 'triangle';
    drawerOsc.frequency.setValueAtTime(120, now + 0.05);
    drawerOsc.frequency.exponentialRampToValueAtTime(75, now + 0.22);
    drawerGain.gain.setValueAtTime(0.15, now + 0.05);
    drawerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    drawerOsc.connect(drawerGain);
    drawerGain.connect(ctx.destination);
    drawerOsc.start(now + 0.05);
    drawerOsc.stop(now + 0.25);
  } catch (e) {
    // Silencioso
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

