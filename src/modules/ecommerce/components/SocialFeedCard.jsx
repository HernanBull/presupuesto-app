import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Send, Bookmark, User, CheckCircle, MapPin, MoreHorizontal, Store, Check } from 'lucide-react';
import { 
  getPostLikeState, 
  toggleLikePost, 
  getStoreFollowState, 
  toggleFollowStore, 
  getPostSaveState, 
  toggleSavePost,
  getPostComments
} from '../services/socialService';

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

  // Estados locales optimistas
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Cargar estado inicial
  useEffect(() => {
    let mounted = true;

    const loadInteractions = async () => {
      const custId = currentCustomer?.id;
      
      // Likes
      const likeRes = await getPostLikeState(postId, custId);
      if (mounted) {
        setIsLiked(likeRes.isLiked);
        setLikesCount(likeRes.count);
      }

      // Seguidores
      if (workspaceId) {
        const followRes = await getStoreFollowState(workspaceId, custId);
        if (mounted) {
          setIsFollowing(followRes.isFollowing);
        }
      }

      // Guardados
      if (custId) {
        const saveRes = await getPostSaveState(postId, custId);
        if (mounted) {
          setIsSaved(saveRes.isSaved);
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

    // Actualización optimista inmediata
    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikesCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1));

    try {
      await toggleLikePost(postId, workspaceId, currentCustomer.id);
    } catch (err) {
      // Revertir si hay error
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

  // Manejo de Follow
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

  // Manejo de Guardado
  const handleSave = async (e) => {
    e.stopPropagation();
    if (!currentCustomer) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    const newSaved = !isSaved;
    setIsSaved(newSaved);

    try {
      await toggleSavePost(postId, workspaceId, currentCustomer.id);
    } catch (err) {
      setIsSaved(!newSaved);
    }
  };

  // Manejo de Compartir
  const handleShare = (e) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/${storeSlug}`;
    if (navigator.share) {
      navigator.share({
        title: storeName,
        text: caption,
        url: shareUrl
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('¡Enlace de la publicación copiado al portapapeles!');
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-950 flex flex-col pb-4 border-b border-slate-200 dark:border-white/10 last:border-b-0 shadow-xs">
      {/* Post Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-950">
        <div 
          className="flex items-center gap-3 cursor-pointer" 
          onClick={() => onNavigateStore(storeSlug)}
        >
          <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-white/10 p-0.5 shrink-0 shadow-xs">
            {storeLogo ? (
              <img src={resolveImageUrl(storeLogo)} alt={storeName} className="w-full h-full rounded-full object-cover bg-white" />
            ) : (
              <Store size={20} className="text-slate-950" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-slate-900 dark:text-white font-bold text-sm tracking-wide leading-tight flex items-center gap-1">
              {storeName}
              {isVerified && <CheckCircle size={13} className="text-blue-500 fill-blue-500/20 shrink-0" />}
            </span>
            <span className="text-slate-500 dark:text-zinc-400 text-[11px] flex items-center gap-1 mt-0.5 line-clamp-1">
              <MapPin size={11} className="text-amber-500 shrink-0" /> {address}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 relative">
          <button 
            type="button"
            onClick={handleFollow}
            className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs ${
              isFollowing 
                ? 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700' 
                : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
            }`}
          >
            {isFollowing ? (
              <>
                <Check size={12} strokeWidth={2.5} />
                <span>Siguiendo</span>
              </>
            ) : (
              <>
                <User size={12} />
                <span>Seguir</span>
              </>
            )}
          </button>
          
          <button 
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            <MoreHorizontal size={20} />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-10 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-slate-200 dark:border-white/10 py-1 min-w-[160px] z-30">
              <button 
                onClick={() => { setShowMenu(false); onNavigateStore(storeSlug); }}
                className="w-full text-left px-4 py-2 text-xs font-medium text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Visitar vitrina
              </button>
              <button 
                onClick={(e) => { setShowMenu(false); handleShare(e); }}
                className="w-full text-left px-4 py-2 text-xs font-medium text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Copiar enlace
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Post Image Container */}
      <div 
        className="w-full aspect-[4/5] bg-slate-900 cursor-pointer relative overflow-hidden select-none"
        onDoubleClick={handleDoubleTap}
      >
        {storeCover ? (
          <img 
            loading="lazy" 
            src={resolveImageUrl(storeCover)} 
            alt={storeName} 
            className="w-full h-full object-cover" 
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-400 bg-slate-950">
            <Store size={56} className="text-amber-500/80" />
            <span className="font-medium text-sm text-white">Explorar Tienda</span>
          </div>
        )}

        {/* Pager Indicator */}
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] text-white border border-white/15 font-semibold tracking-wider">
          1/1
        </div>

        {/* Animated Heart Burst on double tap */}
        {showHeartBurst && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-ping">
            <Heart size={90} className="fill-red-500 text-red-500 drop-shadow-2xl" />
          </div>
        )}
      </div>

      {/* Post Actions Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-950">
        <div className="flex items-center gap-4 text-slate-900 dark:text-white">
          <button 
            type="button"
            onClick={handleLike} 
            className="hover:scale-110 active:scale-90 transition-transform cursor-pointer"
            title="Me gusta"
          >
            <Heart 
              size={26} 
              strokeWidth={isLiked ? 0 : 2} 
              fill={isLiked ? '#ef4444' : 'none'} 
              className={isLiked ? 'text-red-500' : 'text-slate-800 dark:text-white'} 
            />
          </button>
          
          <button 
            type="button"
            onClick={() => onOpenComments({ postId, postTitle: storeName, workspaceId })}
            className="hover:scale-110 active:scale-90 transition-transform cursor-pointer"
            title="Comentar"
          >
            <MessageCircle size={26} strokeWidth={2} className="text-slate-800 dark:text-white" />
          </button>
          
          <button 
            type="button"
            onClick={handleShare}
            className="hover:scale-110 active:scale-90 transition-transform cursor-pointer -mt-0.5"
            title="Compartir"
          >
            <Send size={24} strokeWidth={2} className="text-slate-800 dark:text-white" />
          </button>
        </div>

        <button 
          type="button"
          onClick={handleSave}
          className="hover:scale-110 active:scale-90 transition-transform cursor-pointer text-slate-800 dark:text-white"
          title="Guardar"
        >
          <Bookmark 
            size={26} 
            strokeWidth={isSaved ? 0 : 2} 
            fill={isSaved ? 'currentColor' : 'none'} 
            className={isSaved ? 'text-amber-500' : ''} 
          />
        </button>
      </div>

      {/* Post Content / Caption */}
      <div className="px-4 flex flex-col gap-1 bg-white dark:bg-zinc-950">
        <span className="text-slate-900 dark:text-white text-sm font-black">
          {likesCount} {likesCount === 1 ? 'Me gusta' : 'Me gusta'}
        </span>
        
        <div className="text-slate-800 dark:text-zinc-200 text-sm leading-snug">
          <span 
            className="font-bold mr-2 cursor-pointer hover:underline"
            onClick={() => onNavigateStore(storeSlug)}
          >
            {storeName}
          </span>
          <span className="text-slate-600 dark:text-zinc-300 inline">
            {caption}
          </span>
        </div>

        {/* Botón para ver comentarios */}
        <button 
          type="button"
          onClick={() => onOpenComments({ postId, postTitle: storeName, workspaceId })}
          className="text-left text-slate-500 dark:text-zinc-400 text-xs font-semibold mt-1 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer"
        >
          {commentsCount > 0 
            ? `Ver los ${commentsCount} comentarios` 
            : 'Agregar un comentario...'}
        </button>

        <span className="text-slate-400 dark:text-zinc-500 text-[10px] uppercase tracking-wider mt-0.5 font-medium">
          {formatTimeAgo(createdAt)}
        </span>
      </div>
    </div>
  );
}
