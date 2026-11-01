import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, Flashlight, AlertCircle, CheckCircle2, Barcode, RefreshCw } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import toast from 'react-hot-toast';

export const CameraScannerModal = ({ isOpen, onClose, onScanProduct }) => {
  const [cameraError, setCameraError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [lastScanned, setLastScanned] = useState(null);
  const html5QrCodeRef = useRef(null);
  const lastScanTimeRef = useRef(0);

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {}
  };

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const scannerId = 'axon-camera-barcode-view';
    let scannerInstance = null;

    const startScanner = async () => {
      try {
        setCameraError(null);
        setIsScanning(true);

        // Pequeño retardo para asegurar que el div del DOM exista
        await new Promise((r) => setTimeout(r, 150));
        if (!isMounted) return;

        const el = document.getElementById(scannerId);
        if (!el) return;

        const formatsToSupport = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE
        ];

        scannerInstance = new Html5Qrcode(scannerId, {
          formatsToSupport,
          verbose: false
        });
        html5QrCodeRef.current = scannerInstance;

        const config = {
          fps: 20,
          qrbox: (viewfinderWidth, viewfinderHeight) => ({
            width: Math.min(Math.floor(viewfinderWidth * 0.85), 320),
            height: Math.min(Math.floor(viewfinderHeight * 0.5), 180)
          }),
          aspectRatio: 1.333333
        };

        const onDetected = (decodedText) => {
          const now = Date.now();
          // Cooldown de 1.2 segundos para evitar lecturas duplicadas accidentales
          if (now - lastScanTimeRef.current < 1200) return;
          lastScanTimeRef.current = now;

          playBeep();
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate([60, 40, 60]); } catch (e) {}
          }

          setLastScanned(decodedText);
          onScanProduct && onScanProduct(decodedText);
        };

        // Estrategia 1: Cámara trasera (environment)
        try {
          await scannerInstance.start({ facingMode: 'environment' }, config, onDetected, () => {});
        } catch (envErr) {
          console.warn('[CameraScanner] facingMode environment falló, probando cámaras disponibles:', envErr);
          try {
            const cameras = await Html5Qrcode.getCameras();
            if (cameras && cameras.length > 0) {
              const rear = cameras.find((c) => /back|rear|trasera|environment|externa/i.test(c.label));
              const targetId = rear ? rear.id : cameras[0].id;
              await scannerInstance.start(targetId, config, onDetected, () => {});
            } else {
              await scannerInstance.start({ facingMode: 'user' }, config, onDetected, () => {});
            }
          } catch (camErr) {
            throw camErr;
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('[CameraScanner Error]', err);
          setCameraError(
            err?.message || 'No se pudo acceder a la cámara. Asegúrate de otorgar permisos de cámara.'
          );
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop().then(() => {
              try { html5QrCodeRef.current.clear(); } catch (e) {}
            }).catch(() => {});
          } else {
            try { html5QrCodeRef.current.clear(); } catch (e) {}
          }
        } catch (e) {}
      }
    };
  }, [isOpen]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    playBeep();
    onScanProduct && onScanProduct(manualCode.trim());
    setManualCode('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/80 dark:bg-zinc-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
              <Camera size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                Lector de Código de Barras
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Apunta al código para cargarlo al carrito
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-200/70 dark:bg-zinc-800 text-slate-500 hover:text-slate-900 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Visor de Cámara */}
        <div className="relative bg-black flex-1 min-h-[260px] max-h-[360px] flex items-center justify-center overflow-hidden">
          <div id="axon-camera-barcode-view" className="w-full h-full" />

          {/* Mira de Escaneo Láser (Animada) */}
          {!cameraError && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
              <div className="relative w-full max-w-[280px] h-[160px] border-2 border-orange-500/80 rounded-2xl shadow-[0_0_20px_rgba(249,115,22,0.4)] overflow-hidden">
                {/* Línea Láser Animada */}
                <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_#ef4444] animate-pulse" 
                  style={{
                    animation: 'scannerLaser 2s ease-in-out infinite alternate',
                    top: '50%'
                  }}
                />
                {/* Esquinas destacadas */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white rounded-br-lg" />
              </div>
            </div>
          )}

          {/* Feedback de Último Escaneo */}
          {lastScanned && (
            <div className="absolute top-3 left-3 right-3 bg-emerald-600/90 text-white text-xs font-bold py-1.5 px-3 rounded-xl flex items-center justify-center gap-2 shadow-lg backdrop-blur-xs animate-in slide-in-from-top">
              <CheckCircle2 size={16} />
              <span>Detectado: {lastScanned}</span>
            </div>
          )}

          {/* Mensaje de Error de Cámara */}
          {cameraError && (
            <div className="absolute inset-0 bg-slate-900/90 p-6 flex flex-col items-center justify-center text-center text-white space-y-3">
              <AlertCircle size={36} className="text-amber-400" />
              <p className="text-xs text-slate-300 max-w-xs">{cameraError}</p>
              <p className="text-[11px] text-slate-400">
                Puedes ingresar el código de barras manualmente abajo.
              </p>
            </div>
          )}
        </div>

        {/* Input Manual de Respaldo */}
        <div className="p-4 bg-white dark:bg-zinc-900 border-t border-slate-100 dark:border-white/5 space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            O escribe el código / SKU:
          </span>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-slate-100 dark:bg-zinc-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10">
              <Barcode size={16} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Código de barras..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-xs text-slate-800 dark:text-white placeholder-slate-400 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 dark:disabled:bg-zinc-800 text-white text-xs font-black rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              Cargar
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
