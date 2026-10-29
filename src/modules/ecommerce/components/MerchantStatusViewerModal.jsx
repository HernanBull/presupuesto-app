import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Store, CheckCircle, ExternalLink, Volume2, VolumeX, Clock } from 'lucide-react';

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

      const prevBodyOverflow = document.body.style.overflow;
      const prevBodyBg = document.body.style.backgroundColor;
      const prevHtmlBg = document.documentElement.style.backgroundColor;

      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      document.body.style.backgroundColor = '#000000';
      document.documentElement.style.backgroundColor = '#000000';

      return () => {
        document.body.style.overflow = prevBodyOverflow;
        document.body.style.touchAction = '';
        document.body.style.backgroundColor = prevBodyBg;
        document.documentElement.style.backgroundColor = prevHtmlBg;
      };
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

  const modalContent = (
    <div 
      className="fixed inset-0 z-[999999] bg-black select-none overflow-hidden touch-none flex items-center justify-center"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100dvh',
        backgroundColor: '#000000',
        zIndex: 999999,
        margin: 0,
        padding: 0
      }}
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Contenedor del Estado Estilo WhatsApp / Instagram Stories - 100% Pantalla Completa */}
      <div className="relative w-full h-full max-w-lg bg-black flex flex-col justify-between overflow-hidden">
        
        {/* Contenido Visual Central 100% Pantalla Completa (object-cover) */}
        <div className="absolute inset-0 w-full h-full overflow-hidden bg-black flex items-center justify-center">
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
              className="w-full h-full object-cover" 
            />
          ) : mediaUrl ? (
            <img 
              src={mediaUrl} 
              alt={storeName} 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = storeLogo ? resolveImageUrl(storeLogo) : '';
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 text-zinc-400 p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shadow-lg">
                <Store size={36} />
              </div>
              <span className="text-base font-bold text-white">Promoción de {storeName}</span>
              {caption && <p className="text-xs text-zinc-300 max-w-xs">{caption}</p>}
            </div>
          )}

          {/* Degradados cinematográficos superior e inferior para legibilidad perfecta */}
          <div className="absolute top-0 inset-x-0 h-44 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none z-10" />
          <div className="absolute bottom-0 inset-x-0 h-56 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none z-10" />
        </div>

        {/* Barras de Progreso Segmentadas Tipo WhatsApp / Instagram (Con animación visible) */}
        <div className="absolute top-3.5 inset-x-3 z-30 flex items-center gap-1.5 pt-[env(safe-area-inset-top,4px)]">
          {statuses.map((_, idx) => (
            <div 
              key={idx} 
              className="flex-1 h-1.5 bg-white/35 rounded-full overflow-hidden backdrop-blur-xs shadow-sm"
            >
              <div 
                className="h-full bg-white transition-all duration-75 ease-linear rounded-full shadow-xs"
                style={{
                  width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Encabezado del Perfil (Estilo WhatsApp Status con tiempo visible) */}
        <div className="absolute top-8 inset-x-3.5 z-30 flex items-center justify-between text-white pt-[env(safe-area-inset-top,4px)]">
          <div 
            className="flex items-center gap-2.5 cursor-pointer max-w-[75%]"
            onClick={() => {
              onClose();
              if (onNavigateStore) onNavigateStore(storeSlug);
            }}
          >
            {/* Avatar circular con borde blanco elegante */}
            <div className="w-10 h-10 rounded-full border-2 border-white shadow-lg overflow-hidden bg-zinc-900 shrink-0">
              {storeLogo ? (
                <img src={resolveImageUrl(storeLogo)} alt={storeName} className="w-full h-full object-cover" />
              ) : (
                <Store size={18} className="text-amber-400 m-auto mt-2.5" />
              )}
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-black text-sm text-white drop-shadow-md truncate">
                  {storeName}
                </span>
                {isVerified && <CheckCircle size={14} className="text-blue-400 fill-blue-400/20 shrink-0" />}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-200 drop-shadow-md font-medium">
                <Clock size={11} className="text-emerald-400" />
                <span>{currentStatus.time || 'Hace unos momentos'}</span>
                <span className="text-zinc-400">·</span>
                <span className="text-emerald-400 font-bold">Estado activo</span>
              </div>
            </div>
          </div>

          {/* Botones de Control: Volumen si es video, y Cerrar */}
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
                className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center border border-white/20 hover:bg-black/80 active:scale-95 transition-all cursor-pointer shadow-lg"
                title={isMuted ? 'Activar sonido' : 'Silenciar'}
              >
                {isMuted ? <VolumeX size={16} className="text-amber-400" /> : <Volume2 size={16} className="text-emerald-400" />}
              </button>
            )}

            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center border border-white/20 hover:bg-black/80 active:scale-95 transition-all cursor-pointer shadow-lg"
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

        {/* Pie de Estado: Caption y Botón de Acción Principal */}
        <div className="absolute bottom-5 inset-x-4 z-30 flex flex-col gap-2.5 pb-[env(safe-area-inset-bottom,12px)]">
          {caption && (
            <div className="bg-black/60 backdrop-blur-md border border-white/15 p-3.5 rounded-2xl text-white text-xs leading-relaxed max-h-24 overflow-y-auto shadow-2xl">
              <p className="font-semibold drop-shadow-sm text-zinc-100">{caption}</p>
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
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-105 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-2xl flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer border border-amber-300/40"
          >
            <Store size={16} strokeWidth={2.5} />
            <span>Ver Vitrina de {storeName}</span>
            <ExternalLink size={14} strokeWidth={2.5} />
          </button>
        </div>

      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
}
