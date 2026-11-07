import React, { useState, useEffect } from 'react';
import { Clock, Zap } from 'lucide-react';

export default function FlashOfferCountdown({ endDate, onExpire, compact = false }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!endDate) {
      setTimeLeft(null);
      return;
    }

    const targetTime = new Date(endDate).getTime();
    if (isNaN(targetTime)) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft(null);
        if (onExpire) onExpire();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const pad = (n) => String(n).padStart(2, '0');
      setTimeLeft(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endDate, onExpire]);

  if (!timeLeft) return null;

  if (compact) {
    return (
      <span 
        className="inline-flex items-center gap-1 text-[10px] font-black text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 px-1.5 py-0.5 rounded-md shadow-2xs font-mono tracking-tight"
        title="Tiempo restante de la oferta flash"
      >
        <Clock size={10} className="stroke-[2.5] animate-spin-slow" />
        <span>{timeLeft}</span>
      </span>
    );
  }

  return (
    <span 
      className="inline-flex items-center gap-1.5 text-[11px] font-black text-rose-700 bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-950/40 dark:to-amber-950/30 border border-rose-300 dark:border-rose-800/70 px-2 py-0.5 rounded-md shadow-2xs font-mono tracking-tight"
      title="Esta oferta flash termina automáticamente en:"
    >
      <Zap size={11} className="fill-rose-500 text-rose-500 animate-pulse" />
      <span>Termina en:</span>
      <strong className="text-rose-600 dark:text-rose-400">{timeLeft}</strong>
    </span>
  );
}
