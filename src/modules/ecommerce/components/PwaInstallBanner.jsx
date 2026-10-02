import React, { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DISMISSED_KEY = 'axon_pwa_banner_dismissed_until';
const DISMISS_DAYS = 7;

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Si ya está instalada como PWA, no mostrar nada
    if (isInStandaloneMode()) return;

    // Si fue descartada recientemente, no mostrar
    const dismissedUntil = localStorage.getItem(DISMISSED_KEY);
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil)) return;

    const ios = isIOS();
    setIsIOSDevice(ios);

    if (ios) {
      // En iOS no hay evento beforeinstallprompt, mostramos guía manual
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }

    // Android / Chrome / Edge — capturamos el evento nativo
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Si el usuario instala desde fuera de nuestro banner
    window.addEventListener('appinstalled', () => {
      setShowBanner(false);
      setInstalled(true);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowBanner(false);
    if (outcome === 'accepted') setInstalled(true);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISSED_KEY, String(until));
  };

  if (installed || isInStandaloneMode()) return null;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-[9999] px-4 pb-6 pointer-events-none"
          style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        >
          <div className="pointer-events-auto max-w-sm mx-auto bg-zinc-950 border border-amber-500/30 rounded-3xl shadow-[0_0_60px_rgba(245,158,11,0.25)] overflow-hidden">
            
            {/* Barra dorada decorativa superior */}
            <div className="h-0.5 w-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />

            <div className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 shadow-lg shadow-amber-900/30 border border-amber-500/20">
                    <img src="/icon-192x192.png" alt="AxonMarket" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-white font-extrabold text-sm leading-tight">AxonMarket</p>
                    <p className="text-zinc-400 text-xs mt-0.5">Tu marketplace local</p>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 shrink-0 mt-0.5"
                  aria-label="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Contenido según dispositivo */}
              {isIOSDevice ? (
                <div className="mt-3 bg-zinc-900/60 rounded-2xl p-3 border border-white/5">
                  <p className="text-zinc-300 text-xs leading-relaxed">
                    Instala AxonMarket en tu iPhone: toca{' '}
                    <span className="inline-flex items-center gap-1 font-bold text-amber-400">
                      <Share size={12} /> Compartir
                    </span>{' '}
                    y luego{' '}
                    <span className="font-bold text-amber-400">"Añadir a pantalla de inicio"</span>
                  </p>
                </div>
              ) : (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleInstall}
                    className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-extrabold text-sm py-3 px-4 rounded-2xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-95"
                  >
                    <Download size={16} />
                    Instalar App
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-4 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold text-sm transition-colors border border-white/5 active:scale-95"
                  >
                    Ahora no
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
