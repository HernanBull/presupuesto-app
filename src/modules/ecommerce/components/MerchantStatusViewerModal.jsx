import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Store, CheckCircle, ExternalLink, Volume2, VolumeX } from 'lucide-react';

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
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
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

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] bg-black flex items-center justify-center select-none overflow-hidden touch-none"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100dvh',
        backgroundColor: '#000000',
        zIndex: 99999
      }}
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Contenedor del Estado Estilo Instagram Stories / WhatsApp */}
      <div className="relative w-full h-full md:max-w-md md:max-h-[92dvh] md:rounded-3xl bg-black flex flex-col justify-between overflow-hidden shadow-2xl">
        
        {/* Fondo ambiental difuminado para llenar de color los márgenes en fotos cuadradas */}
        {mediaUrl && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {isVideo ? (
              <video 
                src={mediaUrl} 
                muted 
                playsInline 
                loop 
                autoPlay 
                className="w-full h-full object-cover scale-150 blur-3xl opacity-35" 
              />
            ) : (
              <img 
                src={mediaUrl} 
                alt="" 
                className="w-full h-full object-cover scale-150 blur-3xl opacity-35" 
              />
            )}
            <div className="absolute inset-0 bg-black/40" />
          </div>
        )}

        {/* Barras de Progreso Segmentadas en la parte superior */}
        <div className="absolute top-2.5 sm:top-3 inset-x-3 z-40 flex items-center gap-1.5 pt-[env(safe-area-inset-top,0px)]">
          {statuses.map((_, idx) => (
            <div key={idx} className="flex-1 h-1 bg-white/25 rounded-full overflow-hidden shadow-xs">
              <div 
                className="h-full bg-white transition-all duration-75"
                style={{
                  width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
                }}
              />
            </div>
          ))}
        </div>

        {/* Encabezado del Estado (Perfil del Comercio) Estilo Instagram Stories - Limpio, sin cajas blancas */}
        <div className="absolute top-6 sm:top-7 inset-x-3 z-40 flex items-center justify-between text-white pt-[env(safe-area-inset-top,0px)]">
          {/* Degradado superior para legibilidad perfecta */}
          <div className="absolute -top-7 inset-x-0 h-28 bg-gradient-to-b from-black/85 via-black/45 to-transparent pointer-events-none -z-10" />

          {/* Comercio info */}
          <div 
            className="flex items-center gap-2.5 cursor-pointer max-w-[75%]"
            onClick={() => {
              onClose();
              if (onNavigateStore) onNavigateStore(storeSlug);
            }}
          >
            {/* Avatar con anillo luminoso */}
            <div className="w-9 h-9 rounded-full p-[1.5px] bg-gradient-to-tr from-amber-400 via-orange-500 to-emerald-400 shadow-md shrink-0">
              <div className="w-full h-full rounded-full bg-zinc-900 overflow-hidden flex items-center justify-center">
                {storeLogo ? (
                  <img src={resolveImageUrl(storeLogo)} alt={storeName} className="w-full h-full object-cover" />
                ) : (
                  <Store size={16} className="text-amber-400" />
                )}
              </div>
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-extrabold text-sm text-white drop-shadow-md truncate tracking-tight">
                  {storeName}
                </span>
                {isVerified && <CheckCircle size={13} className="text-blue-400 fill-blue-400/20 shrink-0" />}
                <span className="text-[11px] text-white/70 font-medium drop-shadow-xs">
                  · {currentStatus.time || 'Hoy'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold drop-shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Estado de Vitrina</span>
              </div>
            </div>
          </div>

          {/* Botones de Control (Volumen si es video, y Cerrar) */}
          <div className="flex items-center gap-1.5">
            {isVideo && (
              <button 
                type="button"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  const nextMuted = !isMuted;
                  setIsMuted(nextMuted);
                  if (videoRef.current) videoRef.current.muted = nextMuted;
                }}
                className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center border border-white/15 hover:bg-black/60 active:scale-95 transition-all cursor-pointer shadow-md"
                title={isMuted ? 'Activar sonido' : 'Silenciar'}
              >
                {isMuted ? <VolumeX size={16} className="text-amber-400" /> : <Volume2 size={16} className="text-emerald-400" />}
              </button>
            )}

            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center border border-white/15 hover:bg-black/60 active:scale-95 transition-all cursor-pointer shadow-md"
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
        <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden z-10">
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
              className="relative z-10 w-full h-full object-contain" 
            />
          ) : mediaUrl ? (
            <img 
              src={mediaUrl} 
              alt={storeName} 
              className="relative z-10 w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = storeLogo ? resolveImageUrl(storeLogo) : '';
              }}
            />
          ) : (
            <div className="relative z-10 flex flex-col items-center justify-center gap-3 text-zinc-400 p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shadow-lg">
                <Store size={36} />
              </div>
              <span className="text-base font-bold text-white">Promoción de {storeName}</span>
              {caption && <p className="text-xs text-zinc-300 max-w-xs">{caption}</p>}
            </div>
          )}

          {/* Sombra de fondo inferior cinematográfica para el texto y botón */}
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none z-20" />
        </div>

        {/* Pie de Estado: Caption y Botón para Visitar / Pedir */}
        <div className="absolute bottom-4 sm:bottom-6 inset-x-4 z-40 flex flex-col gap-2.5 pb-[env(safe-area-inset-bottom,8px)]">
          {/* Descripción / Texto del Estado */}
          {caption && (
            <div className="bg-black/60 backdrop-blur-md border border-white/10 p-3 rounded-2xl text-white text-xs leading-relaxed max-h-24 overflow-y-auto shadow-lg">
              <p className="font-medium drop-shadow-xs">{caption}</p>
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
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer border border-amber-400/30"
          >
            <Store size={16} />
            <span>Ver Vitrina de {storeName}</span>
            <ExternalLink size={14} />
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
