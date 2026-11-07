import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { 
  Heart, MessageCircle, Send, Bookmark, User, UserPlus, CheckCircle, 
  MapPin, MoreHorizontal, Store, Check, Copy, CheckCheck, Share2, X,
  Play, Volume2, VolumeX, ChevronRight 
} from 'lucide-react';
import { 
  getPostLikeState, 
  toggleLikePost, 
  getStoreFollowState, 
  toggleFollowStore, 
  getPostSaveState, 
  toggleSavePost,
  getPostComments,
  isPostLikedLocally,
  isStoreFollowedLocally,
  isPostSavedLocally
} from '../services/socialService';
import ResponsiveModal from './ResponsiveModal';
import { useActiveFeedMedia } from '../context/ActiveFeedMediaContext';

const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
  return `https://axonmarket-api.onrender.com${url}`;
};

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return 'Reciente';
  const diffSec = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (isNaN(diffSec) || diffSec < 60) return 'Hace un momento';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Ayer';
  if (diffD < 7) return `Hace ${diffD} días`;
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-VE', { day: 'numeric', month: 'short' });
  } catch (e) {
    return `Hace ${diffD} días`;
  }
};

export default function SocialFeedCard({
  post,
  currentCustomer,
  onOpenComments,
  onRequireAuth,
  onNavigateStore
}) {
  const postId = post.id || post.store_slug || post.slug;
  const workspaceId = post.workspace_id || post.id;
  const storeSlug = post.store_slug || post.slug;
  const storeName = post.store_name || post.name;
  const storeLogo = post.store_logo || post.config?.logoUrl || post.config?.storefront?.logoUrl;
  const storeCover = post.image_url || post.config?.coverUrl || post.config?.storefront?.heroUrl;
  const caption = post.content || post.config?.description || '¡Visita nuestra tienda para ver el catálogo completo!';
  const address = post.map_address || post.config?.address || post.config?.location?.address || post.config?.expediente?.city || 'Venezuela';
  const isVerified = post.is_verified || post.config?.is_verified;
  const createdAt = post.created_at;

  const customerIdResolved = currentCustomer?.id || currentCustomer?.uid || currentCustomer?.user_id || currentCustomer?.doc_id || currentCustomer?.docId;

  // Estados síncronos iniciales para render estático inmediato (sin parpadeos ni animaciones de recarga)
  const [isLiked, setIsLiked] = useState(() => isPostLikedLocally(postId, customerIdResolved));
  const [likesCount, setLikesCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(() => isStoreFollowedLocally(workspaceId, customerIdResolved || 'guest'));
  const [isSaved, setIsSaved] = useState(() => {
    const custId = customerIdResolved || 'guest';
    if (!postId) return false;
    const inCustomerFavs = Array.isArray(currentCustomer?.favorites) && 
      currentCustomer.favorites.some(f => (f.id && String(f.id) === String(postId)) || (f.postId && String(f.postId) === String(postId)));
    return inCustomerFavs || isPostSavedLocally(postId, custId);
  });
  const [showSaveBurst, setShowSaveBurst] = useState(false);
  const [saveBounced, setSaveBounced] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const { activeMediaId, setActiveMedia, clearActiveMedia, isMutedGlobal, toggleMutedGlobal } = useActiveFeedMedia();
  const isActive = activeMediaId === postId;
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false);
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const userPausedRef = useRef(false);
  const isVideo = Boolean(post.video_url || post.media_type === 'video' || (storeCover && /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(storeCover)));

  // Gesto Swipe Left estilo TikTok hacia la vitrina del comercio
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const isHorizontalSwipeRef = useRef(null);
  const isMouseDownRef = useRef(false);

  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    };
    isHorizontalSwipeRef.current = null;
    setIsSwiping(false);
  };

  const handleTouchMove = (e) => {
    if (e.touches.length !== 1) return;
    const clientX = e.touches[0].clientX;
    const clientY = e.touches[0].clientY;
    const dx = clientX - touchStartRef.current.x;
    const dy = clientY - touchStartRef.current.y;

    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        isHorizontalSwipeRef.current = Math.abs(dx) > Math.abs(dy);
      }
    }

    if (isHorizontalSwipeRef.current === true) {
      setIsSwiping(true);
      if (dx < 0) {
        // Deslizamiento hacia la izquierda con resistencia
        const dampened = Math.max(dx * 0.7, -140);
        setSwipeX(dampened);
      } else {
        // Leve amortiguación hacia la derecha sin abrir franjas blancas
        setSwipeX(Math.min(dx * 0.1, 15));
      }
    }
  };

  const handleTouchEnd = () => {
    if (isHorizontalSwipeRef.current === true) {
      const elapsed = Date.now() - touchStartRef.current.time;
      if (swipeX <= -65 || (swipeX <= -35 && elapsed < 280)) {
        // Swipe completado: redirigir fluidamente a la vitrina
        setSwipeX(-window.innerWidth);
        setIsSwiping(false);
        setTimeout(() => {
          if (onNavigateStore) onNavigateStore(storeSlug || workspaceId);
          setSwipeX(0);
        }, 160);
        return;
      }
    }
    // Rebote elástico automático a la posición 0
    setIsSwiping(false);
    setSwipeX(0);
    isHorizontalSwipeRef.current = null;
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    isMouseDownRef.current = true;
    touchStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now()
    };
    isHorizontalSwipeRef.current = null;
  };

  const handleMouseMove = (e) => {
    if (!isMouseDownRef.current) return;
    const dx = e.clientX - touchStartRef.current.x;
    const dy = e.clientY - touchStartRef.current.y;

    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(dx) > 10) {
        isHorizontalSwipeRef.current = true;
      }
    }

    if (isHorizontalSwipeRef.current === true) {
      setIsSwiping(true);
      if (dx < 0) {
        setSwipeX(Math.max(dx * 0.7, -140));
      } else {
        setSwipeX(Math.min(dx * 0.1, 15));
      }
    }
  };

  const handleMouseUp = () => {
    if (!isMouseDownRef.current) return;
    isMouseDownRef.current = false;
    handleTouchEnd();
  };

  // Control manual de Play/Pausa al tocar el video
  const togglePlayPause = (e) => {
    e?.stopPropagation();
    if (!isVideo || !videoRef.current) return;

    if (videoRef.current.paused || !isPlaying) {
      userPausedRef.current = false;
      setActiveMedia(postId, videoRef.current);
      setIsPlaying(true);
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    } else {
      userPausedRef.current = true;
      videoRef.current.pause();
      setIsPlaying(false);
      clearActiveMedia(postId);
    }
  };

  // Sincronizar estado isPlaying con isActive coordinado globalmente
  useEffect(() => {
    if (!isVideo) return;
    if (isActive) {
      if (!userPausedRef.current) {
        setIsPlaying(true);
        if (videoRef.current && videoRef.current.paused) {
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {});
          }
        }
      }
    } else {
      setIsPlaying(false);
      if (videoRef.current && !videoRef.current.paused) {
        try {
          videoRef.current.pause();
        } catch (e) {}
      }
    }
  }, [isActive, isVideo]);

  // Sincronizar audio con el estado global de mute
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMutedGlobal;
    }
  }, [isMutedGlobal]);

  // Si el usuario interactúa con la pantalla, habilitar audio si estaba silenciado
  useEffect(() => {
    if (!isVideo || !isMutedGlobal) return;
    const handleFirstTouch = () => {
      if (videoRef.current) {
        videoRef.current.muted = false;
      }
    };

    window.addEventListener('click', handleFirstTouch, { once: true });
    window.addEventListener('touchstart', handleFirstTouch, { once: true });
    return () => {
      window.removeEventListener('click', handleFirstTouch);
      window.removeEventListener('touchstart', handleFirstTouch);
    };
  }, [isVideo, isMutedGlobal]);

  // Control inteligente estilo TikTok: solo UN video activo y carga diferida
  useEffect(() => {
    if (!containerRef.current) return;

    const el = containerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Activar carga de interacciones de DB tan pronto como entra al área visible
          if (entry.isIntersecting) {
            setHasEnteredViewport(true);
          }

          if (isVideo) {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
              // El video está enfocado en pantalla (>55% visible): activar reproducción solo si el usuario no lo pausó manualmente
              if (videoRef.current && !userPausedRef.current) {
                setActiveMedia(postId, videoRef.current);
              }
            } else if (!entry.isIntersecting || entry.intersectionRatio < 0.35) {
              // Al scrollear y salir del foco: ceder el control y resetear pausa manual
              userPausedRef.current = false;
              clearActiveMedia(postId);
            }
          }
        });
      },
      { threshold: [0, 0.35, 0.55, 0.85, 1.0] }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (isVideo) {
        userPausedRef.current = false;
        clearActiveMedia(postId);
      }
    };
  }, [isVideo, postId, setActiveMedia, clearActiveMedia]);

  // Cargar estado desde el servidor diferido (cuando entra al viewport)
  useEffect(() => {
    if (!hasEnteredViewport) return;
    let mounted = true;

    const loadInteractions = async () => {
      const custId = currentCustomer?.id;
      
      // Likes
      const likeRes = await getPostLikeState(postId, custId);
      if (mounted) {
        setIsLiked(likeRes.isLiked);
        setLikesCount(likeRes.count || likeRes.likesCount || 0);
      }

      // Seguidores
      if (workspaceId) {
        const followRes = await getStoreFollowState(workspaceId, custId);
        if (mounted) {
          setIsFollowing(followRes.isFollowing);
        }
      }

      // Guardados (estrictamente por ID de la publicación)
      const custIdForSave = custId || 'guest';
      const inCustomerFavs = Array.isArray(currentCustomer?.favorites) && 
        currentCustomer.favorites.some(f => (f.id && String(f.id) === String(postId)) || (f.postId && String(f.postId) === String(postId)));
      const saveRes = custId ? await getPostSaveState(postId, custId) : { isSaved: false };
      if (mounted) {
        setIsSaved(saveRes.isSaved || inCustomerFavs || isPostSavedLocally(postId, custIdForSave));
      }

      // Comentarios count
      const comments = await getPostComments(postId);
      if (mounted) {
        setCommentsCount(comments.length);
      }
    };

    loadInteractions();

    const handleGlobalUpdate = (e) => {
      const detail = e.detail;
      if (!mounted) return;
      if (detail.eventType === 'like' && String(detail.postId) === String(postId)) {
        setLikesCount(detail.count);
        if (!detail.customerId || String(detail.customerId) === String(customerIdResolved)) setIsLiked(detail.isLiked);
      } else if (detail.eventType === 'follow' && String(detail.workspaceId) === String(workspaceId)) {
        if (!detail.customerId || String(detail.customerId) === String(customerIdResolved)) setIsFollowing(detail.isFollowing);
      } else if (detail.eventType === 'comment_added' && String(detail.postId) === String(postId)) {
        setCommentsCount(prev => prev + 1);
      } else if (detail.eventType === 'save' && String(detail.postId) === String(postId)) {
        if (!detail.customerId || String(detail.customerId) === String(customerIdResolved)) setIsSaved(detail.isSaved);
      }
    };

    window.addEventListener('axon_social_updated', handleGlobalUpdate);

    return () => {
      mounted = false;
      window.removeEventListener('axon_social_updated', handleGlobalUpdate);
    };
  }, [postId, workspaceId, customerIdResolved, hasEnteredViewport]);

  // Manejo de Like
  const handleLike = async (e) => {
    e?.stopPropagation();
    if (!currentCustomer) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikesCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1));

    try {
      await toggleLikePost(postId, workspaceId, currentCustomer.id);
    } catch (err) {
      setIsLiked(!newLiked);
      setLikesCount(prev => !newLiked ? prev + 1 : Math.max(0, prev - 1));
    }
  };

  // Doble toque para dar Like
  const handleDoubleTap = (e) => {
    e.stopPropagation();
    if (!isLiked) {
      handleLike();
    }
    setShowHeartBurst(true);
    setTimeout(() => setShowHeartBurst(false), 800);
  };

  // Manejo de Follow (Solo modifica la relación de seguimiento a la tienda)
  const handleFollow = async (e) => {
    e?.stopPropagation();
    const custId = customerIdResolved || 'guest';
    const newFollowing = !isFollowing;
    setIsFollowing(newFollowing);

    if (newFollowing) {
      toast.success(`Siguiendo a @${storeName}`, {
        icon: '✨',
        duration: 2000
      });
    }

    try {
      await toggleFollowStore(workspaceId, custId);
    } catch (err) {
      console.warn('Error en toggleFollowStore, guardado localmente:', err);
    }
  };

  // Manejo de Guardado (Guarda la publicación individual con respuesta y animación inmediata)
  const handleSave = async (e) => {
    e?.stopPropagation();
    const custId = customerIdResolved || 'guest';
    const newSaved = !isSaved;
    setIsSaved(newSaved);

    // Animación visual de rebote y pulso
    setSaveBounced(true);
    setTimeout(() => setSaveBounced(false), 500);

    if (newSaved) {
      setShowSaveBurst(true);
      setTimeout(() => setShowSaveBurst(false), 700);
      toast.success('¡Publicación guardada en tus favoritos!', {
        icon: '🔖',
        duration: 2500
      });
    } else {
      toast('Publicación eliminada de tus favoritos', {
        icon: '🗑️',
        duration: 2000
      });
    }

    try {
      const res = await toggleSavePost(postId, workspaceId, custId, {
        id: String(postId),
        postId: String(postId),
        post_id: String(postId),
        title: post.title || post.name || storeName,
        caption: caption,
        cover: storeCover,
        image_url: storeCover,
        store_name: storeName,
        store_slug: storeSlug,
        workspace_id: workspaceId,
        type: post.type || 'news'
      });
      if (res && typeof res.isSaved === 'boolean') {
        setIsSaved(res.isSaved);
      }
    } catch (err) {
      console.warn('Error saving post, maintained in local storage:', err);
    }
  };

  // Enlace directo único a esta publicación
  const postShareUrl = `${window.location.origin}/?post=${postId}#post-${postId}`;

  const handleOpenShare = (e) => {
    e?.stopPropagation();
    setShowShareModal(true);
  };

  const handleCopyPostLink = (e) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(postShareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareWhatsApp = (e) => {
    e?.stopPropagation();
    const cleanCaption = caption ? caption.replace(/\n+/g, ' ').slice(0, 110) : '';
    const text = `📢 *${storeName}* en Axon Market:\n\n${cleanCaption}${caption.length > 110 ? '...' : ''}\n\n👉 *Ver publicación completa:* ${postShareUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    setShowShareModal(false);
  };

  const handleNativeShare = (e) => {
    e?.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: `${storeName} - Axon Market`,
        text: caption,
        url: postShareUrl
      }).catch(() => {});
      setShowShareModal(false);
    } else {
      handleCopyPostLink(e);
    }
  };

  return (
    <div 
      id={`post-${postId}`}
      ref={containerRef}
      className="tiktok-feed-item relative w-full h-[100dvh] snap-start snap-always shrink-0 bg-black cursor-pointer overflow-hidden select-none flex flex-col justify-end will-change-transform m-0 p-0 touch-pan-y"
      style={{
        height: '100dvh',
        border: 'none',
        outline: 'none',
        boxShadow: 'none'
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleTap}
    >
      {/* Vista previa tras bastidores al deslizar hacia la izquierda (Estilo TikTok Perfil) */}
      <div 
        className="absolute inset-y-0 right-0 w-36 bg-gradient-to-l from-zinc-950 via-zinc-900 to-black flex flex-col items-center justify-center p-3 text-center z-0 pointer-events-none transition-opacity duration-150"
        style={{ opacity: swipeX < -12 ? Math.min(1, Math.abs(swipeX) / 60) : 0 }}
      >
        <div className="w-12 h-12 rounded-full border-2 border-amber-500 overflow-hidden shadow-lg mb-2 bg-white flex items-center justify-center">
          {storeLogo ? (
            <img src={resolveImageUrl(storeLogo)} alt={storeName} className="w-full h-full object-cover" />
          ) : (
            <Store size={22} className="text-amber-500" />
          )}
        </div>
        <span className="text-white text-xs font-black truncate max-w-full drop-shadow">
          @{storeName}
        </span>
        <span className="text-amber-400 text-[10px] font-bold mt-1.5 flex items-center gap-0.5">
          <span>Ver Vitrina</span>
          <ChevronRight size={12} strokeWidth={3} />
        </span>
      </div>

      {/* Capa Principal Desplazable con Retorno Elástico Automático */}
      <div 
        className="relative w-full h-full flex flex-col justify-end z-10 will-change-transform"
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)'
        }}
      >
        {/* Background Media - 100% Pantalla Completa TikTok con Animación Ascendente */}
      {isVideo ? (
        <div 
          className="absolute inset-0 w-full h-full bg-black z-0 cursor-pointer animate-in fade-in slide-in-from-bottom-8 duration-500 ease-out fill-mode-both"
          onClick={togglePlayPause}
        >
          <video
            ref={videoRef}
            src={resolveImageUrl(post.video_url || storeCover)}
            playsInline
            loop
            preload="none"
            muted={isMutedGlobal}
            className="w-full h-full object-cover pointer-events-none"
          />
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-2xl transition-transform active:scale-95">
                <Play size={32} fill="currentColor" className="translate-x-0.5 text-amber-400" />
              </div>
            </div>
          )}
        </div>
      ) : storeCover ? (
        <img 
          loading="lazy" 
          decoding="async"
          src={resolveImageUrl(storeCover)} 
          alt={storeName} 
          className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none select-none animate-in fade-in slide-in-from-bottom-8 duration-500 ease-out fill-mode-both" 
        />
      ) : (
        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-3 text-slate-400 bg-zinc-950 z-0 animate-in fade-in slide-in-from-bottom-8 duration-500 ease-out fill-mode-both">
          <Store size={56} className="text-amber-500/80" />
          <span className="font-medium text-sm text-white">Explorar Tienda</span>
        </div>
      )}

      {/* Full-Width Smooth Bottom Gradient for 100% Uniform Lighting */}
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/95 via-black/55 to-transparent pointer-events-none z-10" />

      {/* Top Overlay: Pager & Options Menu */}
      <div className="absolute top-3.5 right-3.5 z-20 flex items-center gap-2 select-none">
        {isVideo && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleMutedGlobal(); }}
            className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center border border-white/15 hover:bg-black/70 active:scale-95 transition-all cursor-pointer shadow-sm"
            title={isMutedGlobal ? "Activar sonido" : "Silenciar"}
          >
            {isMutedGlobal ? <VolumeX size={14} className="text-amber-400" /> : <Volume2 size={14} className="text-emerald-400" />}
          </button>
        )}

        <div className="bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] text-white/90 border border-white/15 font-semibold tracking-wider pointer-events-none shadow-sm">
          {isVideo ? 'VIDEO' : '1/1'}
        </div>

        <div className="relative">
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center border border-white/15 hover:bg-black/70 active:scale-95 transition-all cursor-pointer shadow-sm"
            title="Más opciones"
          >
            <MoreHorizontal size={16} />
          </button>

          {showMenu && (
            <div 
              className="absolute right-0 top-9 bg-zinc-900/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/15 py-1 min-w-[160px] z-30 animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => { setShowMenu(false); onNavigateStore(storeSlug || workspaceId); }}
                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-2"
              >
                <Store size={14} className="text-amber-400" />
                <span>Visitar vitrina</span>
              </button>
              <button 
                onClick={(e) => { setShowMenu(false); handleOpenShare(e); }}
                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-2"
              >
                <Share2 size={14} className="text-amber-400" />
                <span>Compartir publicación</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TikTok-Style Right Action Bar */}
      <div 
        className="absolute right-3 bottom-24 sm:bottom-20 z-20 flex flex-col items-center gap-3.5 select-none animate-in fade-in slide-in-from-bottom-5 duration-500 fill-mode-both"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Like / Corazón */}
        <button 
          type="button"
          onClick={handleLike} 
          className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform group cursor-pointer"
          title="Me gusta"
        >
          <div className="w-10 h-10 rounded-full bg-black/15 backdrop-blur-xs flex items-center justify-center text-white border border-white/25 shadow-xs group-hover:bg-black/30 transition-all">
            <Heart 
              size={22} 
              strokeWidth={isLiked ? 0 : 2} 
              fill={isLiked ? '#ef4444' : 'none'} 
              className={isLiked ? 'text-red-500 scale-110 transition-transform' : 'text-white'} 
            />
          </div>
          <span className="text-[11px] font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] tracking-tight">
            {likesCount}
          </span>
        </button>

        {/* Mensaje / Comentarios */}
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenComments({ postId, postTitle: storeName, workspaceId });
          }}
          className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform group cursor-pointer"
          title="Comentar"
        >
          <div className="w-10 h-10 rounded-full bg-black/15 backdrop-blur-xs flex items-center justify-center text-white border border-white/25 shadow-xs group-hover:bg-black/30 transition-all">
            <MessageCircle size={21} strokeWidth={2} className="text-white" />
          </div>
          <span className="text-[11px] font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] tracking-tight">
            {commentsCount}
          </span>
        </button>

        {/* Telegram / Compartir */}
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenShare(e);
          }}
          className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform group cursor-pointer"
          title="Compartir publicación"
        >
          <div className="w-10 h-10 rounded-full bg-black/15 backdrop-blur-xs flex items-center justify-center text-white border border-white/25 shadow-xs group-hover:bg-black/30 transition-all">
            <Send size={19} strokeWidth={2} className="text-white -ml-0.5" />
          </div>
          <span className="text-[10px] font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] tracking-tight">
            Compartir
          </span>
        </button>

        {/* Favoritos / Guardar */}
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleSave(e);
          }}
          className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform group cursor-pointer"
          title="Guardar en favoritos"
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white border backdrop-blur-xs shadow-xs transition-all duration-300 ${
            saveBounced 
              ? 'scale-125 bg-amber-500/30 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.7)]' 
              : isSaved 
                ? 'bg-amber-500/25 border-amber-400/80 shadow-[0_0_10px_rgba(245,158,11,0.4)]' 
                : 'bg-black/15 border-white/25 group-hover:bg-black/30'
          }`}>
            <Bookmark 
              size={20} 
              strokeWidth={isSaved ? 0 : 2} 
              fill={isSaved ? '#f59e0b' : 'none'} 
              className={`transition-all duration-300 ${
                saveBounced ? 'scale-125 rotate-[-12deg]' : ''
              } ${isSaved ? 'text-amber-500' : 'text-white'}`} 
            />
          </div>
          <span className={`text-[10px] font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] tracking-tight transition-colors duration-200 ${
            isSaved ? 'text-amber-400 font-extrabold' : 'text-white'
          }`}>
            {isSaved ? 'Guardado' : 'Guardar'}
          </span>
        </button>
      </div>

      {/* TikTok-Style Bottom Left Info Overlay (Author, Follow, Caption, Comments, Date) */}
      <div 
        className="relative z-20 p-4 pb-24 sm:pb-20 pr-16 flex flex-col gap-1.5 select-none pointer-events-auto animate-in fade-in slide-in-from-bottom-5 duration-500 fill-mode-both"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Merchant Profile Row */}
        <div className="flex items-center gap-2">
          <div 
            className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center overflow-hidden border border-white/80 p-0.5 shrink-0 shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            onClick={() => onNavigateStore(storeSlug || workspaceId)}
          >
            {storeLogo ? (
              <img src={resolveImageUrl(storeLogo)} alt={storeName} className="w-full h-full rounded-full object-cover bg-white" />
            ) : (
              <Store size={18} className="text-slate-950" />
            )}
          </div>

          <div 
            className="flex flex-col min-w-0 cursor-pointer" 
            onClick={() => onNavigateStore(storeSlug || workspaceId)}
          >
            <div className="flex items-center gap-1">
              <span className="text-white font-black text-sm tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] hover:underline truncate">
                @{storeName}
              </span>
              {isVerified && <CheckCircle size={13} className="text-blue-400 fill-blue-400/20 shrink-0" />}
            </div>
            <span className="text-white text-[11px] font-semibold flex items-center gap-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] truncate">
              <MapPin size={11} className="text-amber-400 shrink-0 stroke-[2.5]" />
              <span className="text-white drop-shadow-md">{address}</span>
            </span>
          </div>

          {/* Botón Seguir */}
          <button 
            type="button"
            onClick={handleFollow}
            className={`ml-1.5 text-xs font-bold rounded-full flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.5)] transition-all shrink-0 backdrop-blur-md ${
              isFollowing 
                ? 'bg-emerald-500/25 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-400/60 px-2.5 py-1' 
                : 'bg-black/40 hover:bg-black/60 text-white border border-white/50 hover:border-white/80 px-3 py-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]'
            }`}
            title={isFollowing ? 'Siguiendo este comercio' : 'Seguir este comercio'}
          >
            {isFollowing ? (
              <>
                <Check size={12} strokeWidth={3} className="text-emerald-400" />
                <span className="text-[11px] font-semibold text-emerald-200">Siguiendo</span>
              </>
            ) : (
              <>
                <UserPlus size={12} strokeWidth={2.5} className="text-white drop-shadow" />
                <span className="text-[11px] font-bold text-white tracking-wide drop-shadow">Seguir</span>
              </>
            )}
          </button>
        </div>

        {/* Caption / Description */}
        <div className="text-white text-xs font-normal leading-relaxed drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] pr-1">
          <span className="text-zinc-100 line-clamp-2">
            {caption}
          </span>
        </div>

        {/* Comments Link & Date */}
        <div className="flex items-center gap-2 text-[11px]">
          <button 
            type="button"
            onClick={() => onOpenComments({ postId, postTitle: storeName, workspaceId })}
            className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer transition-colors drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
          >
            <MessageCircle size={12} />
            <span>{commentsCount > 0 ? `Ver ${commentsCount} comentarios` : 'Comentar...'}</span>
          </button>
          <span className="text-white text-[11px] font-semibold flex items-center gap-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
            <span className="text-amber-400 font-bold">•</span>
            <span className="text-white drop-shadow-md">{formatTimeAgo(createdAt)}</span>
          </span>
        </div>
      </div>

      {/* Animated Heart Burst on double tap */}
      {showHeartBurst && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-ping z-30">
          <Heart size={90} className="fill-red-500 text-red-500 drop-shadow-2xl" />
        </div>
      )}

      {/* Animated Bookmark Burst on save */}
      {showSaveBurst && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-ping z-30">
          <Bookmark size={90} className="fill-amber-400 text-amber-400 drop-shadow-[0_0_30px_rgba(245,158,11,0.9)]" />
        </div>
      )}

      </div>

      {/* Modal / Menú de Compartir Publicación */}
      <ResponsiveModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        className="md:max-w-sm bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 p-0 overflow-hidden"
        contentClassName="p-0"
      >
        <div className="p-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-950 z-10">
          <div className="flex items-center gap-2">
            <Send size={18} className="text-amber-500" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Compartir Publicación</h3>
          </div>
          <button
            onClick={() => setShowShareModal(false)}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Vista previa de la publicación compartida */}
          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-white/5">
            {storeCover ? (
              <img src={resolveImageUrl(storeCover)} alt="Post" className="w-14 h-14 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <Store size={22} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="font-bold text-xs text-gray-900 dark:text-white truncate block">{storeName}</span>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 line-clamp-2 mt-0.5 leading-snug">{caption}</p>
            </div>
          </div>

          {/* Opciones directas */}
          <div className="flex flex-col gap-2.5">
            {/* WhatsApp */}
            <button
              onClick={handleShareWhatsApp}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm transition-all shadow-sm active:scale-98 cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Send size={14} className="fill-white" />
              </div>
              <span className="flex-1 text-left">Compartir en WhatsApp</span>
            </button>

            {/* Copiar Enlace Directo */}
            <button
              onClick={handleCopyPostLink}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-100 font-semibold text-sm transition-all shadow-xs active:scale-98 cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                {copiedLink ? <CheckCheck size={16} className="text-emerald-500" /> : <Copy size={15} />}
              </div>
              <span className="flex-1 text-left">
                {copiedLink ? '¡Enlace copiado al portapapeles!' : 'Copiar enlace directo de la publicación'}
              </span>
            </button>

            {/* Opciones del Sistema (Móvil) */}
            {typeof navigator !== 'undefined' && navigator.share && (
              <button
                onClick={handleNativeShare}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-900 text-xs font-semibold transition-all cursor-pointer"
              >
                <Share2 size={15} />
                <span>Más opciones para compartir</span>
              </button>
            )}
          </div>
        </div>
      </ResponsiveModal>
    </div>
  );
}
