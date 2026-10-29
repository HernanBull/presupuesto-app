import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Store, CheckCircle, ExternalLink, Volume2, VolumeX, Play } from 'lucide-react';

const resolveImageUrl = (url) => {
  if (!url) return '';
  if (typeof url !== 'string') return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) return url;
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
  const [isMuted, setIsMuted] = useState(false);
  const timerRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.min(Math.max(0, initialIndex), statuses.length - 1));
      setProgress(0);
      setIsPaused(false);
    }
  }, [isOpen, initialIndex, statuses.length]);

  const currentStatus = statuses[currentIndex] || {};

  const storeName = currentStatus.store_name || currentStatus.name || currentStatus.storeName || 'Comercio';
  const storeLogo = currentStatus.store_logo || currentStatus.avatar || currentStatus.storeLogo || '';
  const storeSlug = currentStatus.store_slug || currentStatus.slug || currentStatus.id;
  const isVerified = Boolean(currentStatus.is_verified ?? currentStatus.isVerified);
  const caption = currentStatus.caption || currentStatus.title || currentStatus.content || '';

  const rawMedia = currentStatus.video_url || currentStatus.videoUrl || currentStatus.media_url || currentStatus.mediaUrl || currentStatus.image_url || currentStatus.imageUrl || '';
  const isVideo = Boolean(
    currentStatus.media_type === 'video' || 
    currentStatus.mediaType === 'video' || 
    Boolean(currentStatus.video_url || currentStatus.videoUrl) ||
    (typeof rawMedia === 'string' && /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(rawMedia))
  );
  const mediaUrl = resolveImageUrl(rawMedia);

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

  // Reproducir video automáticamente con sonido si es posible
  useEffect(() => {
    if (!isOpen || !isVideo) return;
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    video.muted = isMuted;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback: Si el navegador bloquea audio antes de interacción, mutear y reproducir
        video.muted = true;
        setIsMuted(true);
        video.play().catch(e => console.warn('Status video autoplay blocked:', e));
      });
    }
  }, [isOpen, currentIndex, isVideo]);

  // Manejo de avance automático:
  // Si es video: la barra de progreso avanza con el currentTime / duration del video
  // Si es imagen: temporizador de 5 segundos
  useEffect(() => {
    if (!isOpen || statuses.length === 0) return;

    if (isVideo) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalTime = 50; // cada 50ms
    const totalDuration = 5000; // 5 segundos para imágenes
    const step = (intervalTime / totalDuration) * 100;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timerRef.current);
  }, [isOpen, currentIndex, statuses.length, isPaused, isVideo]);

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

  // Pausar y reanudar video cuando el usuario mantiene presionado
  useEffect(() => {
    if (!isVideo || !videoRef.current) return;
    if (isPaused) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  }, [isPaused, isVideo]);

  if (!isOpen || statuses.length === 0) return null;

  return (
    <div 
      className="fixed inset-0 z-[150] bg-black/95 flex items-center justify-center select-none"
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Contenedor del Estado Estilo WhatsApp / Instagram Stories */}
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
            className="flex items-center gap-2.5 cursor-pointer bg-black/50 backdrop-blur-md py-1 px-2.5 rounded-full border border-white/10 max-w-[70%]"
            onClick={() => {
              onClose();
              if (onNavigateStore) onNavigateStore(storeSlug);
            }}
          >
            <div className="w-8 h-8 rounded-full overflow-hidden border border-amber-400 bg-amber-500 shrink-0">
              {storeLogo ? (
                <img src={resolveImageUrl(storeLogo)} alt="" className="w-full h-full object-cover" />
              ) : (
                <Store size={16} className="text-black m-auto mt-1.5" />
              )}
            </div>
            <div className="flex flex-col min-w-0 pr-1">
              <span className="font-bold text-xs flex items-center gap-1 truncate text-white">
                {storeName}
                {isVerified && <CheckCircle size={12} className="text-blue-400 fill-blue-400/20 shrink-0" />}
              </span>
              <span className="text-[10px] text-zinc-300 font-medium leading-none">
                Estado • Promoción activa
              </span>
            </div>
          </div>

          {/* Botones de Control (Volumen si es video, y Cerrar) */}
          <div className="flex items-center gap-2">
            {isVideo && (
              <button 
                type="button"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  const nextMuted = !isMuted;
                  setIsMuted(nextMuted);
                  if (videoRef.current) videoRef.current.muted = nextMuted;
                }}
                className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center border border-white/20 hover:bg-black/80 active:scale-95 transition-all cursor-pointer"
                title={isMuted ? 'Activar sonido' : 'Silenciar'}
              >
                {isMuted ? <VolumeX size={16} className="text-amber-400" /> : <Volume2 size={16} className="text-emerald-400" />}
              </button>
            )}

            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center border border-white/20 hover:bg-black/80 active:scale-95 transition-all cursor-pointer"
              title="Cerrar estado"
            >
              <X size={18} />
            </button>
          </div>
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
          {isVideo && mediaUrl ? (
            <video 
              ref={videoRef}
              src={mediaUrl} 
              autoPlay 
              playsInline 
              muted={isMuted}
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                if (v.duration > 0) {
                  setProgress((v.currentTime / v.duration) * 100);
                }
              }}
              onEnded={() => handleNext()}
              className="w-full h-full object-contain" 
            />
          ) : mediaUrl ? (
            <img 
              src={mediaUrl} 
              alt={storeName} 
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = storeLogo ? resolveImageUrl(storeLogo) : '';
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 text-zinc-400 p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
                <Store size={36} />
              </div>
              <span className="text-sm font-bold text-white">Promoción de {storeName}</span>
              {caption && <p className="text-xs text-zinc-300 max-w-xs">{caption}</p>}
            </div>
          )}

          {/* Sombra de fondo para el texto */}
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none z-10" />
        </div>

        {/* Pie de Estado: Caption y Botón para Visitar / Pedir */}
        <div className="absolute bottom-6 inset-x-4 z-30 flex flex-col gap-3">
          {/* Descripción / Texto del Estado */}
          {caption && (
            <div className="bg-black/70 backdrop-blur-md border border-white/10 p-3 rounded-2xl text-white text-xs leading-relaxed max-h-24 overflow-y-auto">
              <p className="font-medium">{caption}</p>
            </div>
          )}

          {/* Botón de Acción Principal (Ir a la Tienda) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
              if (onNavigateStore) onNavigateStore(storeSlug);
            }}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
          >
            <Store size={16} />
            <span>Ver Vitrina de {storeName}</span>
            <ExternalLink size={14} />
          </button>
        </div>

      </div>
    </div>
  );
}
