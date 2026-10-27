import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Store, CheckCircle, ExternalLink, MessageCircle, Play } from 'lucide-react';

const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
  return `https://axonmarket-api.onrender.com${url}`;
};

export default function MerchantStatusViewerModal({
  isOpen,
  onClose,
  statuses = [],
  initialIndex = 0,
  onNavigateStore
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.min(Math.max(0, initialIndex), statuses.length - 1));
      setProgress(0);
      setIsPaused(false);
    }
  }, [isOpen, initialIndex, statuses.length]);

  // Manejo de avance automático (5 segundos por estado)
  useEffect(() => {
    if (!isOpen || statuses.length === 0 || isPaused) return;

    const intervalTime = 50; // cada 50ms
    const totalDuration = 5000; // 5 segundos
    const step = (intervalTime / totalDuration) * 100;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (currentIndex < statuses.length - 1) {
            setCurrentIndex((idx) => idx + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timerRef.current);
  }, [isOpen, currentIndex, statuses.length, isPaused, onClose]);

  // Reset progress al cambiar de estado
  useEffect(() => {
    setProgress(0);
  }, [currentIndex]);

  // Teclado
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, statuses.length]);

  if (!isOpen || statuses.length === 0) return null;

  const currentStatus = statuses[currentIndex] || {};

  const handleNext = () => {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[150] bg-black/95 flex items-center justify-center select-none"
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Contenedor del Estado Estilo WhatsApp */}
      <div className="relative w-full h-full max-w-md bg-zinc-950 flex flex-col justify-between overflow-hidden shadow-2xl">
        
        {/* Barras de Progreso Segmentadas en la parte superior */}
        <div className="absolute top-3 inset-x-3 z-30 flex items-center gap-1.5">
          {statuses.map((_, idx) => (
            <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-75"
                style={{
                  width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Encabezado del Estado (Perfil del Comercio) */}
        <div className="absolute top-7 inset-x-3 z-30 flex items-center justify-between text-white">
          <div 
            className="flex items-center gap-2.5 cursor-pointer bg-black/40 backdrop-blur-md py-1 px-2.5 rounded-full border border-white/10"
            onClick={() => {
              onClose();
              if (onNavigateStore) onNavigateStore(currentStatus.store_slug || currentStatus.id);
            }}
          >
            <div className="w-8 h-8 rounded-full overflow-hidden border border-amber-400 bg-amber-500 shrink-0">
              {currentStatus.store_logo ? (
                <img src={resolveImageUrl(currentStatus.store_logo)} alt="" className="w-full h-full object-cover" />
              ) : (
                <Store size={16} className="text-black m-auto mt-1.5" />
              )}
            </div>
            <div className="flex flex-col min-w-0 pr-1">
              <span className="font-bold text-xs flex items-center gap-1 truncate">
                {currentStatus.store_name}
                {currentStatus.is_verified && <CheckCircle size={12} className="text-blue-400 fill-blue-400/20" />}
              </span>
              <span className="text-[10px] text-zinc-300 font-medium leading-none">
                Estado • Promoción activa
              </span>
            </div>
          </div>

          {/* Botón Cerrar */}
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center border border-white/20 hover:bg-black/80 active:scale-95 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Áreas Táctiles para Navegar Izquierda / Derecha */}
        <div 
          className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); handlePrev(); }}
        />
        <div 
          className="absolute inset-y-0 right-0 w-2/3 z-20 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); handleNext(); }}
        />

        {/* Contenido Visual Central (Foto o Video) */}
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          {currentStatus.video_url ? (
            <video 
              src={resolveImageUrl(currentStatus.video_url)} 
              autoPlay 
              playsInline 
              muted 
              loop
              className="w-full h-full object-contain"
            />
          ) : currentStatus.media_url ? (
            <img 
              src={resolveImageUrl(currentStatus.media_url)} 
              alt={currentStatus.store_name} 
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 text-zinc-400">
              <Store size={48} className="text-amber-500" />
              <span className="text-sm font-semibold text-white">Promoción de {currentStatus.store_name}</span>
            </div>
          )}

          {/* Sombra de fondo para el texto */}
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none z-10" />
        </div>

        {/* Pie de Estado: Caption y Botón para Visitar / Pedir */}
        <div className="absolute bottom-6 inset-x-4 z-30 flex flex-col gap-3">
          {/* Descripción / Texto del Estado */}
          {currentStatus.caption && (
            <div className="bg-black/70 backdrop-blur-md border border-white/10 p-3 rounded-2xl text-white text-xs leading-relaxed max-h-24 overflow-y-auto">
              <p className="font-medium">{currentStatus.caption}</p>
            </div>
          )}

          {/* Botón de Acción Principal (Ir a la Tienda) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
              if (onNavigateStore) onNavigateStore(currentStatus.store_slug || currentStatus.id);
            }}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
          >
            <Store size={16} />
            <span>Ver Vitrina de {currentStatus.store_name}</span>
            <ExternalLink size={14} />
          </button>
        </div>

      </div>
    </div>
  );
}
