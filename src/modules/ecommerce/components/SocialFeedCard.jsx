import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, MessageCircle, Send, Bookmark, User, UserPlus, CheckCircle, 
  MapPin, MoreHorizontal, Store, Check, Copy, CheckCheck, Share2, X,
  Play, Volume2, VolumeX 
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

const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
  return `https://axonmarket-api.onrender.com${url}`;
};

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return 'Reciente';
  const diffSec = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (diffSec < 60) return 'Hace un momento';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH} horas`;
  const diffD = Math.floor(diffH / 24);
  return `Hace ${diffD} días`;
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

  // Estados síncronos iniciales para render estático inmediato (sin parpadeos ni animaciones de recarga)
  const [isLiked, setIsLiked] = useState(() => isPostLikedLocally(postId, currentCustomer?.id));
  const [likesCount, setLikesCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(() => isStoreFollowedLocally(workspaceId, currentCustomer?.id));
  const [isSaved, setIsSaved] = useState(() => {
    if (!currentCustomer?.id || !postId) return false;
    const inCustomerFavs = Array.isArray(currentCustomer?.favorites) && 
      currentCustomer.favorites.some(f => (f.id && String(f.id) === String(postId)) || (f.postId && String(f.postId) === String(postId)));
    return inCustomerFavs || isPostSavedLocally(postId, currentCustomer.id);
  });
  const [commentsCount, setCommentsCount] = useState(0);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const isVideo = Boolean(post.video_url || post.media_type === 'video' || (storeCover && /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(storeCover)));

  // Control inteligente de reproducción y audio en Scroll (IntersectionObserver estilo TikTok)
  useEffect(() => {
    if (!isVideo || !containerRef.current) return;

    const el = containerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            // El video está enfocado en pantalla: reproducir con audio
            if (videoRef.current) {
              const playPromise = videoRef.current.play();
              if (playPromise !== undefined) {
                playPromise
                  .then(() => {
                    setIsPlaying(true);
                  })
                  .catch(() => {
                    // Si el navegador bloquea autoplay con audio antes del primer toque, silenciar temporalmente
                    if (videoRef.current) {
                      videoRef.current.muted = true;
                      setIsMuted(true);
                      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
                    }
                  });
              }
            }
          } else {
            // Al scrollear hacia arriba o abajo y salir del viewport: pausar inmediatamente
            if (videoRef.current) {
              videoRef.current.pause();
              setIsPlaying(false);
            }
          }
        });
      },
      { threshold: [0, 0.55, 1.0] }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isVideo]);

  // Si el navegador forzó mute, desmutear automáticamente al primer toque del cliente
  useEffect(() => {
    if (!isVideo || !isMuted) return;
    const handleFirstTouch = () => {
      if (videoRef.current) {
        videoRef.current.muted = false;
        setIsMuted(false);
      }
    };

    window.addEventListener('click', handleFirstTouch, { once: true });
    window.addEventListener('touchstart', handleFirstTouch, { once: true });
    return () => {
      window.removeEventListener('click', handleFirstTouch);
      window.removeEventListener('touchstart', handleFirstTouch);
    };
  }, [isVideo, isMuted]);

  // Cargar estado desde el servidor
  useEffect(() => {
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
      if (custId) {
        const inCustomerFavs = Array.isArray(currentCustomer?.favorites) && 
          currentCustomer.favorites.some(f => (f.id && String(f.id) === String(postId)) || (f.postId && String(f.postId) === String(postId)));
        const saveRes = await getPostSaveState(postId, custId);
        if (mounted) {
          setIsSaved(inCustomerFavs || saveRes.isSaved);
        }
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
      if (detail.eventType === 'like' && detail.postId === postId) {
        setLikesCount(detail.count);
        if (detail.customerId === currentCustomer?.id) setIsLiked(detail.isLiked);
      } else if (detail.eventType === 'follow' && detail.workspaceId === workspaceId) {
        if (detail.customerId === currentCustomer?.id) setIsFollowing(detail.isFollowing);
      } else if (detail.eventType === 'comment_added' && detail.postId === postId) {
        setCommentsCount(prev => prev + 1);
      } else if (detail.eventType === 'save' && detail.postId === postId) {
        if (detail.customerId === currentCustomer?.id) setIsSaved(detail.isSaved);
      }
    };

    window.addEventListener('axon_social_updated', handleGlobalUpdate);

    return () => {
      mounted = false;
      window.removeEventListener('axon_social_updated', handleGlobalUpdate);
    };
  }, [postId, workspaceId, currentCustomer?.id]);

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
    e.stopPropagation();
    if (!currentCustomer) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    const newFollowing = !isFollowing;
    setIsFollowing(newFollowing);

    try {
      await toggleFollowStore(workspaceId, currentCustomer.id);
    } catch (err) {
      setIsFollowing(!newFollowing);
    }
  };

  // Manejo de Guardado (Guarda exclusivamente la publicación individual)
  const handleSave = async (e) => {
    e.stopPropagation();
    if (!currentCustomer) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    const newSaved = !isSaved;
    setIsSaved(newSaved);

    try {
      await toggleSavePost(postId, workspaceId, currentCustomer.id, {
        id: String(postId),
        postId: String(postId),
        title: post.title || post.name || storeName,
        caption: caption,
        cover: storeCover,
        image_url: storeCover,
        store_name: storeName,
        store_slug: storeSlug,
        workspace_id: workspaceId,
        type: post.type || 'news'
      });
    } catch (err) {
      setIsSaved(!newSaved);
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
      className="tiktok-feed-item relative w-full h-[100dvh] snap-start snap-always shrink-0 bg-black cursor-pointer overflow-hidden select-none flex flex-col justify-end will-change-transform m-0 p-0"
      style={{
        height: '100dvh',
        border: 'none',
        outline: 'none',
        boxShadow: 'none'
      }}
      onDoubleClick={handleDoubleTap}
    >
      {/* Background Media - 100% Pantalla Completa TikTok */}
      {isVideo ? (
        <div className="absolute inset-0 w-full h-full bg-black z-0">
          <video
            ref={videoRef}
            src={resolveImageUrl(post.video_url || storeCover)}
            playsInline
            loop
            muted={isMuted}
            autoPlay
            className="w-full h-full object-cover"
            onClick={(e) => {
              e.stopPropagation();
              if (videoRef.current) {
                if (videoRef.current.paused) {
                  videoRef.current.play();
                  setIsPlaying(true);
                } else {
                  videoRef.current.pause();
                  setIsPlaying(false);
                }
              }
            }}
          />
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-2xl">
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
          className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none select-none" 
        />
      ) : (
        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-3 text-slate-400 bg-zinc-950 z-0">
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
            onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
            className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center border border-white/15 hover:bg-black/70 active:scale-95 transition-all cursor-pointer shadow-sm"
            title={isMuted ? "Activar sonido" : "Silenciar"}
          >
            {isMuted ? <VolumeX size={14} className="text-amber-400" /> : <Volume2 size={14} className="text-emerald-400" />}
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
        className="absolute right-3 bottom-24 sm:bottom-20 z-20 flex flex-col items-center gap-3.5 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Like / Corazón */}
        <button 
          type="button"
          onClick={handleLike} 
          className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform group cursor-pointer"
          title="Me gusta"
        >
          <div className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-[0_4px_12px_rgba(0,0,0,0.5)] group-hover:bg-black/65 transition-colors">
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
          <div className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-[0_4px_12px_rgba(0,0,0,0.5)] group-hover:bg-black/65 transition-colors">
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
          <div className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-[0_4px_12px_rgba(0,0,0,0.5)] group-hover:bg-black/65 transition-colors">
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
          <div className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-[0_4px_12px_rgba(0,0,0,0.5)] group-hover:bg-black/65 transition-colors">
            <Bookmark 
              size={20} 
              strokeWidth={isSaved ? 0 : 2} 
              fill={isSaved ? '#f59e0b' : 'none'} 
              className={isSaved ? 'text-amber-500 scale-105' : 'text-white'} 
            />
          </div>
          <span className="text-[10px] font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] tracking-tight">
            {isSaved ? 'Guardado' : 'Guardar'}
          </span>
        </button>
      </div>

      {/* TikTok-Style Bottom Left Info Overlay (Author, Follow, Caption, Comments, Date) */}
      <div 
        className="relative z-20 p-4 pb-24 sm:pb-20 pr-16 flex flex-col gap-1.5 select-none pointer-events-auto"
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
            <span className="text-zinc-300 text-[10px] font-medium flex items-center gap-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] truncate">
              <MapPin size={10} className="text-amber-400 shrink-0" /> {address}
            </span>
          </div>

          {/* Botón Seguir */}
          <button 
            type="button"
            onClick={handleFollow}
            className={`ml-1 text-xs font-bold rounded-full flex items-center justify-center gap-1 active:scale-95 cursor-pointer shadow-md transition-all shrink-0 ${
              isFollowing 
                ? 'bg-white/20 backdrop-blur-md text-emerald-400 border border-emerald-400/40 px-2 py-0.5' 
                : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 px-2.5 py-0.5 font-black'
            }`}
            title={isFollowing ? 'Siguiendo este comercio' : 'Seguir este comercio'}
          >
            {isFollowing ? (
              <Check size={13} strokeWidth={2.8} />
            ) : (
              <>
                <UserPlus size={12} strokeWidth={2.5} />
                <span className="text-[11px]">Seguir</span>
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
          <span className="text-zinc-400 text-[10px] font-medium">
            • {formatTimeAgo(createdAt)}
          </span>
        </div>
      </div>

      {/* Animated Heart Burst on double tap */}
      {showHeartBurst && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-ping z-30">
          <Heart size={90} className="fill-red-500 text-red-500 drop-shadow-2xl" />
        </div>
      )}

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
