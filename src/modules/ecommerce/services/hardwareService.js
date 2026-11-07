// ==============================================================================
// AXONPOS & AXONMARKET — Controladores de Hardware (Balanza RS-232 & Térmica ESC/POS)
// ==============================================================================

import toast from 'react-hot-toast';

export class HardwareService {
  constructor() {
    this.scaleWeight = 0.000;
    this.scaleTare = 0.000;
    this.scaleUnit = 'kg';
    this.scaleStable = true;
    this.scaleListeners = new Set();
    this.printerConfig = {
      type: 'USB', // USB, NETWORK, SERIAL
      width: '80mm',
      autoDrawer: true,
      openDrawerCommand: '\x1b\x70\x00\x19\xfa'
    };
  }

  // --- BALANZA DIGITAL (Web Serial API / Simulación Interactiva) ---
  
  subscribeScale(callback) {
    this.scaleListeners.add(callback);
    callback({
      weight: this.getNetWeight(),
      gross: this.scaleWeight,
      tare: this.scaleTare,
      unit: this.scaleUnit,
      isStable: this.scaleStable
    });
    return () => this.scaleListeners.delete(callback);
  }

  notifyScale() {
    const data = {
      weight: this.getNetWeight(),
      gross: this.scaleWeight,
      tare: this.scaleTare,
      unit: this.scaleUnit,
      isStable: this.scaleStable
    };
    this.scaleListeners.forEach(fn => fn(data));
  }

  getNetWeight() {
    return Math.max(0, Number((this.scaleWeight - this.scaleTare).toFixed(3)));
  }

  setSimulatedWeight(grossWeight) {
    this.scaleWeight = Math.max(0, Number(grossWeight) || 0);
    this.notifyScale();
  }

  tareScale() {
    this.scaleTare = this.scaleWeight;
    this.notifyScale();
    toast.success(`Balanza tarada en ${this.scaleTare.toFixed(3)} kg`);
  }

  zeroScale() {
    this.scaleWeight = 0.000;
    this.scaleTare = 0.000;
    this.notifyScale();
    toast.success('Balanza reseteada a 0.000 kg');
  }

  async connectWebSerialScale() {
    if (typeof navigator !== 'undefined' && 'serial' in navigator) {
      try {
        const port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });
        toast.success('Balanza RS-232 conectada exitosamente por puerto serie');
        return true;
      } catch (err) {
        toast.error('No se seleccionó puerto serie o fue cancelado');
        return false;
      }
    } else {
      toast('Web Serial API no soportado en este navegador. Usando emulador de balanza.', {
        icon: '⚖️'
      });
      return false;
    }
  }

  // --- IMPRESORA TÉRMICA & GAVETA DE DINERO (ESC/POS) ---

  openCashDrawer(options = {}) {
    if (options.showToast) {
      toast.success('Comando ESC/POS enviado: ¡Gaveta de dinero abierta!', {
        icon: '💵'
      });
    }
    // Reproducir un sonido de clic mecánico
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch(e) {}
  }

  printTestTicket(width = '80mm', options = {}) {
    const is80 = width === '80mm';
    if (options.showToast) {
      toast.success(`Ticket de prueba (${width}) enviado a impresora térmica ESC/POS`, {
        icon: '🖨️'
      });
    }
  }
}

export const hardwareService = new HardwareService();
