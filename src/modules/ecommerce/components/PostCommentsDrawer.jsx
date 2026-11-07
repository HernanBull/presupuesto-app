import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Send, MessageCircle, Loader2, Trash2, CornerDownRight, Heart, Smile, Sparkles } from 'lucide-react';
import { getPostComments, addPostComment, deletePostComment, toggleCommentReaction } from '../services/socialService';

const REACTION_EMOJIS = [
  { type: 'like', emoji: '👍', label: 'Me gusta', color: 'text-blue-500' },
  { type: 'love', emoji: '❤️', label: 'Me encanta', color: 'text-rose-500' },
  { type: 'haha', emoji: '😂', label: 'Me divierte', color: 'text-amber-500' },
  { type: 'wow', emoji: '😮', label: 'Me asombra', color: 'text-amber-500' },
  { type: 'clap', emoji: '👏', label: 'Me inspira', color: 'text-emerald-500' }
];

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return 'Hace un momento';
  const now = new Date();
  const date = new Date(timestamp);
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Hace unos segundos';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Hace ${diffInHours} h`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `Hace ${diffInDays} d`;
  return date.toLocaleDateString();
};

export default function PostCommentsDrawer({
  isOpen,
  onClose,
  postId,
  postTitle,
  workspaceId,
  post,
  currentCustomer,
  onRequireAuth
}) {
  const effectivePostId = postId || post?.id || post?.postId;
  const effectiveWorkspaceId = workspaceId || post?.workspaceId || post?.workspace_id;
  const effectivePostTitle = postTitle || post?.title || post?.postTitle || '';

  const activeWorkspace = localStorage.getItem('activeWorkspace');
  const isMerchantOwner = Boolean(activeWorkspace && effectiveWorkspaceId && activeWorkspace === effectiveWorkspaceId);

  const currentUserKey = useMemo(() => {
    if (currentCustomer?.id) return `cust_${currentCustomer.id}`;
    if (isMerchantOwner) return `merch_${activeWorkspace}`;
    return null;
  }, [currentCustomer, isMerchantOwner, activeWorkspace]);

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [activeReactionPickerCommentId, setActiveReactionPickerCommentId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const commentsEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && (effectivePostId || effectiveWorkspaceId)) {
      loadComments();
    }
  }, [isOpen, effectivePostId, effectiveWorkspaceId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const data = await getPostComments(effectivePostId, effectiveWorkspaceId);
      // Asignar reacciones locales por si no vienen en la BD
      const enhanced = (data || []).map(c => {
        try {
          const localReactions = localStorage.getItem(`axon_social_comment_reactions_${c.id}`);
          if (localReactions) {
            return { ...c, reactions: JSON.parse(localReactions) };
          }
        } catch {}
        return c;
      });
      setComments(enhanced);
    } catch (err) {
      console.error('Error cargando comentarios:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    if (!currentCustomer && !isMerchantOwner) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    const targetPostId = effectivePostId || (effectiveWorkspaceId ? `store_${effectiveWorkspaceId}` : null);
    if (!targetPostId) return;

    setIsSubmitting(true);
    try {
      const authorName = currentCustomer
        ? (currentCustomer.name || currentCustomer.email?.split('@')[0] || 'Cliente')
        : (post?.storeName || 'Comercio Oficial');

      const authorAvatar = currentCustomer
        ? (currentCustomer.profile_pic || currentCustomer.profilePic || '')
        : (post?.storeAvatar || '');

      const authorId = currentCustomer ? currentCustomer.id : (activeWorkspace || 'merchant');

      const saved = await addPostComment({
        postId: targetPostId,
        workspaceId: effectiveWorkspaceId,
        customerId: authorId,
        customerName: authorName,
        customerAvatar: authorAvatar,
        content: newComment.trim(),
        parentId: replyingTo?.id || null,
        replyToName: replyingTo?.customer_name || null
      });

      setComments(prev => [...prev, saved]);
      setNewComment('');
      setReplyingTo(null);
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Error publicando comentario:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('¿Deseas eliminar este comentario?')) return;
    setDeletingId(commentId);
    try {
      await deletePostComment(commentId, effectivePostId, effectiveWorkspaceId);
      setComments(prev => prev.filter(c => c.id !== commentId && c.parent_id !== commentId));
    } catch (err) {
      console.error('Error eliminando comentario:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleReaction = async (commentId, reactionType) => {
    if (!currentUserKey) {
      if (onRequireAuth) onRequireAuth();
      return;
    }
    setActiveReactionPickerCommentId(null);

    // Actualización optimista
    setComments(prev => prev.map(c => {
      if (c.id !== commentId) return c;
      const current = { ...(c.reactions || {}) };
      if (current[currentUserKey] === reactionType) {
        delete current[currentUserKey];
      } else {
        current[currentUserKey] = reactionType;
      }
      return { ...c, reactions: current };
    }));

    try {
      await toggleCommentReaction({
        commentId,
        postId: effectivePostId,
        reactionType,
        userKey: currentUserKey
      });
    } catch (err) {
      console.error('Error guardando reacción:', err);
    }
  };

  // Separar comentarios principales de sus respuestas
  const { rootComments, repliesMap } = useMemo(() => {
    const roots = [];
    const replies = {};
    comments.forEach(c => {
      if (c.parent_id) {
        if (!replies[c.parent_id]) replies[c.parent_id] = [];
        replies[c.parent_id].push(c);
      } else {
        roots.push(c);
      }
    });
    return { rootComments: roots, repliesMap: replies };
  }, [comments]);

  if (!isOpen) return null;

  const canDeleteComment = (c) => {
    if (isMerchantOwner) return true;
    if (currentCustomer && String(c.customer_id) === String(currentCustomer.id)) return true;
    return false;
  };

  const renderSingleComment = (c, isReply = false) => {
    const userReaction = c.reactions?.[currentUserKey];
    const reactionsList = Object.values(c.reactions || {});
    const uniqueReactionTypes = [...new Set(reactionsList)];
    const isPickerOpen = activeReactionPickerCommentId === c.id;

    return (
      <div key={c.id} className={`flex gap-2.5 items-start group relative ${isReply ? 'ml-8 mt-2' : ''}`}>
        {/* Avatar */}
        {c.customer_avatar ? (
          <img 
            src={c.customer_avatar} 
            alt={c.customer_name} 
            className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200 dark:border-white/10" 
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
            {(c.customer_name || 'U').charAt(0).toUpperCase()}
          </div>
        )}

        {/* Cuerpo del comentario */}
        <div className="flex-1 min-w-0">
          <div className="bg-slate-100/90 dark:bg-zinc-900/80 px-3.5 py-2.5 rounded-2xl rounded-tl-xs border border-slate-200/50 dark:border-white/5 relative">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-xs text-slate-900 dark:text-white">
                  {c.customer_name}
                </span>
                {c.reply_to_name && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-0.5">
                    <CornerDownRight size={10} /> @{c.reply_to_name}
                  </span>
                )}
              </div>
              <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-medium shrink-0">
                {formatRelativeTime(c.created_at)}
              </span>
            </div>

            <p className="text-xs text-slate-700 dark:text-zinc-200 leading-relaxed whitespace-pre-line break-words">
              {c.content}
            </p>

            {/* Badges de reacciones agregadas */}
            {reactionsList.length > 0 && (
              <div className="absolute -bottom-2 right-2 bg-white dark:bg-zinc-800 shadow-sm border border-slate-200 dark:border-zinc-700 rounded-full px-1.5 py-0.5 flex items-center gap-1 text-[10px] font-bold">
                <span className="flex items-center -space-x-1">
                  {uniqueReactionTypes.map(t => {
                    const match = REACTION_EMOJIS.find(r => r.type === t);
                    return match ? <span key={t} className="text-xs">{match.emoji}</span> : null;
                  })}
                </span>
                <span className="text-slate-600 dark:text-zinc-300 ml-0.5 text-[10px]">
                  {reactionsList.length}
                </span>
              </div>
            )}
          </div>

          {/* Fila de Acciones: Reaccionar, Responder, Eliminar */}
          <div className="flex items-center gap-3 mt-1.5 ml-2 text-[11px] font-bold text-slate-500 dark:text-zinc-400 relative">
            {/* Botón Reaccionar con Popover Picker Estilo Facebook */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setActiveReactionPickerCommentId(isPickerOpen ? null : c.id)}
                className={`hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1 transition-colors cursor-pointer ${
                  userReaction ? 'text-amber-600 dark:text-amber-400 font-black' : ''
                }`}
              >
                {userReaction ? (
                  <>
                    <span>{REACTION_EMOJIS.find(r => r.type === userReaction)?.emoji || '👍'}</span>
                    <span>{REACTION_EMOJIS.find(r => r.type === userReaction)?.label || 'Reacción'}</span>
                  </>
                ) : (
                  <>
                    <Smile size={12} />
                    <span>Reaccionar</span>
                  </>
                )}
              </button>

              {/* Floating Facebook Reaction Bar */}
              {isPickerOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => setActiveReactionPickerCommentId(null)}
                  />
                  <div className="absolute bottom-6 left-0 z-40 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-full p-1.5 shadow-2xl flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                    {REACTION_EMOJIS.map(item => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => handleToggleReaction(c.id, item.type)}
                        className={`text-lg p-1 rounded-full hover:scale-130 active:scale-95 transition-transform cursor-pointer ${
                          userReaction === item.type ? 'bg-amber-100 dark:bg-amber-950/60 ring-2 ring-amber-400' : ''
                        }`}
                        title={item.label}
                      >
                        {item.emoji}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Botón Responder */}
            <button
              type="button"
              onClick={() => {
                setReplyingTo(c);
                inputRef.current?.focus();
              }}
              className="hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1 transition-colors cursor-pointer"
            >
              Responder
            </button>

            {/* Botón Eliminar si corresponde */}
            {canDeleteComment(c) && (
              <button
                type="button"
                onClick={() => handleDeleteComment(c.id)}
                disabled={deletingId === c.id}
                className="hover:text-rose-600 text-slate-400 dark:text-zinc-500 flex items-center gap-0.5 transition-colors cursor-pointer"
                title="Eliminar este comentario"
              >
                <Trash2 size={11} />
                <span>Borrar</span>
              </button>
            )}
          </div>

          {/* Respuestas anidadas */}
          {repliesMap[c.id] && repliesMap[c.id].map(reply => renderSingleComment(reply, true))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center font-sans">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="absolute inset-0 bg-black/60 transition-opacity backdrop-blur-2xs" 
      />

      {/* Drawer Container */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white dark:bg-zinc-950 w-full sm:max-w-lg h-[82vh] sm:h-[650px] max-h-[92vh] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10 border border-slate-200/80 dark:border-white/10"
      >
        {/* Mobile Drag Pill */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-12 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <MessageCircle size={18} className="text-amber-500" />
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Comentarios</h3>
            <span className="text-xs bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-bold px-2 py-0.5 rounded-full">
              {comments.length}
            </span>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400">
              <Loader2 className="animate-spin text-amber-500" size={24} />
              <span className="text-xs">Cargando comentarios...</span>
            </div>
          ) : rootComments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center">
                <MessageCircle size={24} />
              </div>
              <p className="font-bold text-slate-800 dark:text-white text-sm">Aún no hay comentarios</p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-xs">
                Sé el primero en compartir tu opinión o interactuar con este comercio.
              </p>
            </div>
          ) : (
            rootComments.map(c => renderSingleComment(c, false))
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white dark:bg-zinc-950 border-t border-slate-100 dark:border-white/10 shrink-0">
          {/* Banner si está respondiendo a alguien */}
          {replyingTo && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl mb-2 text-xs">
              <span className="text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-1.5 truncate">
                <CornerDownRight size={12} />
                <span>Respondiendo a: <strong>@{replyingTo.customer_name}</strong></span>
              </span>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="text-amber-700 dark:text-amber-400 hover:text-red-500 p-0.5 font-bold cursor-pointer"
                title="Cancelar respuesta"
              >
                <X size={13} />
              </button>
            </div>
          )}

          {(currentCustomer || isMerchantOwner) ? (
            <form onSubmit={handleSendComment} className="flex items-center gap-2">
              {currentCustomer?.profile_pic ? (
                <img 
                  src={currentCustomer.profile_pic} 
                  alt="Avatar" 
                  className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200" 
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center shrink-0">
                  {((currentCustomer?.name || currentCustomer?.email || (isMerchantOwner ? 'Comercio' : 'U'))).charAt(0).toUpperCase()}
                </div>
              )}
              <input
                ref={inputRef}
                type="text"
                placeholder={replyingTo ? `Responde a @${replyingTo.customer_name}...` : "Escribe un comentario..."}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-full px-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || isSubmitting}
                className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white disabled:opacity-40 flex items-center justify-center transition-colors shadow-xs shrink-0 cursor-pointer"
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10">
              <span className="text-xs text-slate-500 dark:text-zinc-400">Inicia sesión para comentar</span>
              <button
                type="button"
                onClick={() => { onClose(); if (onRequireAuth) onRequireAuth(); }}
                className="px-3 py-1 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-amber-600 transition-colors cursor-pointer"
              >
                Ingresar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
