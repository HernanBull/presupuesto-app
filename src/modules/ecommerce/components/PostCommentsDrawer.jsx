import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, Loader2 } from 'lucide-react';
import { getPostComments, addPostComment } from '../services/socialService';

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
  currentCustomer,
  onRequireAuth
}) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const commentsEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && postId) {
      loadComments();
    }
  }, [isOpen, postId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const data = await getPostComments(postId);
      setComments(data || []);
    } catch (err) {
      console.error('Error cargando comentarios:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    if (!currentCustomer) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    setIsSubmitting(true);
    try {
      const saved = await addPostComment({
        postId,
        workspaceId,
        customerId: currentCustomer.id,
        customerName: currentCustomer.name || currentCustomer.email?.split('@')[0] || 'Cliente',
        customerAvatar: currentCustomer.profile_pic || currentCustomer.profilePic || '',
        content: newComment.trim()
      });

      setComments(prev => [...prev, saved]);
      setNewComment('');
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Error publicando comentario:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center font-sans">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="absolute inset-0 bg-black/60 transition-opacity" 
      />

      {/* Drawer Container */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white dark:bg-zinc-950 w-full sm:max-w-lg h-[80vh] sm:h-[650px] max-h-[90vh] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10"
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
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-50 hover:bg-slate-100 dark:bg-zinc-900 transition-colors"
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
          ) : comments.length === 0 ? (
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
            comments.map((c) => (
              <div key={c.id} className="flex gap-3 items-start group">
                {c.customer_avatar ? (
                  <img 
                    src={c.customer_avatar} 
                    alt={c.customer_name} 
                    className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 dark:border-white/10" 
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                    {(c.customer_name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 bg-slate-50 dark:bg-zinc-900/60 p-3 rounded-2xl rounded-tl-sm border border-slate-200/60 dark:border-white/5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      {c.customer_name}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                      {formatRelativeTime(c.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                    {c.content}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={commentsEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white dark:bg-zinc-950 border-t border-slate-100 dark:border-white/10 shrink-0">
          {currentCustomer ? (
            <form onSubmit={handleSendComment} className="flex items-center gap-2">
              {currentCustomer.profile_pic ? (
                <img 
                  src={currentCustomer.profile_pic} 
                  alt="Avatar" 
                  className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200" 
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center shrink-0">
                  {(currentCustomer.name || currentCustomer.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <input
                type="text"
                placeholder="Escribe un comentario..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-full px-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || isSubmitting}
                className="w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 flex items-center justify-center transition-colors shadow-xs shrink-0 cursor-pointer"
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
                className="px-3 py-1 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-amber-600 transition-colors"
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
