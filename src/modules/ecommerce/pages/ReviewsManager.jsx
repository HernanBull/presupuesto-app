import React, { useState, useMemo, useEffect } from 'react';
import { Star, MessageSquare, Check, X, CornerDownRight, Send, Trash2 } from 'lucide-react';

export default function ReviewsManager() {
  const [reviews, setReviews] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [starsFilter, setStarsFilter] = useState('Todas');
  
  // Estado para manejar qué reseña se está respondiendo actualmente
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  const workspaceId = localStorage.getItem('activeWorkspace') || 'default_workspace';

  const fetchReviews = async () => {
    try {
      const res = await fetch(`https://axonmarket-api.onrender.com/api/ecommerce/reviews?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [workspaceId]);

  // KPIs
  const { totalReviews, avgRating, pendingCount } = useMemo(() => {
    const total = reviews.length;
    const avg = total > 0 ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / total).toFixed(1) : 0;
    const pending = reviews.filter(r => r.status === 'Pendiente').length;
    return { totalReviews: total, avgRating: avg, pendingCount: pending };
  }, [reviews]);

  // Filtros
  const filteredReviews = reviews.filter(review => {
    const matchesSearch = 
      (review.product_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (review.comment || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (review.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'Todos' || review.status === statusFilter;
    
    let matchesStars = true;
    if (starsFilter === '5 Estrellas') matchesStars = review.rating === 5;
    if (starsFilter === '1-3 Estrellas') matchesStars = review.rating <= 3;
    if (starsFilter === '4 Estrellas') matchesStars = review.rating === 4;

    return matchesSearch && matchesStatus && matchesStars;
  });

  // Acciones
  const handleApprove = async (id) => {
    try {
      await fetch(`https://axonmarket-api.onrender.com/api/ecommerce/reviews/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Aprobado' })
      });
      fetchReviews();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (id) => {
    if(window.confirm('¿Estás seguro de rechazar y ocultar esta reseña?')) {
      try {
        await fetch(`https://axonmarket-api.onrender.com/api/ecommerce/reviews/${id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Rechazado' })
        });
        fetchReviews();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const startReply = (id) => {
    setReplyingTo(id);
    setReplyText('');
  };

  const submitReply = async (id) => {
    if (!replyText.trim()) return;
    try {
      await fetch(`https://axonmarket-api.onrender.com/api/ecommerce/reviews/${id}/reply`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: replyText })
      });
      setReplyingTo(null);
      setReplyText('');
      fetchReviews();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Moderación de Reseñas</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Lee, aprueba y responde a las opiniones de tus clientes.</p>
        </div>
        
        {/* Quick Stats Banner */}
        <div className="flex gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-5 py-2.5 rounded-xl shadow-sm">
          <div className="flex flex-col">
             <span className="text-[10px] uppercase font-bold text-slate-500">Pendientes</span>
             <span className="text-lg font-black text-rose-500">{pendingCount}</span>
          </div>
          <div className="w-px bg-slate-200 dark:bg-slate-800"></div>
          <div className="flex flex-col">
             <span className="text-[10px] uppercase font-bold text-slate-500">Promedio</span>
             <span className="text-lg font-black text-amber-500 flex items-center gap-1">
               {avgRating} <Star size={14} className="fill-amber-500 mb-0.5" />
             </span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar por producto, cliente o comentario..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-shadow dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              <option value="Todos">Todos los Estados</option>
              <option value="Pendiente">Pendientes</option>
              <option value="Aprobado">Aprobados</option>
            </select>
            <select 
              value={starsFilter}
              onChange={(e) => setStarsFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              <option value="Todas">Estrellas: Todas</option>
              <option value="5 Estrellas">5 Estrellas</option>
              <option value="4 Estrellas">4 Estrellas</option>
              <option value="1-3 Estrellas">1-3 Estrellas</option>
            </select>
          </div>
        </div>

        {/* Reviews List */}
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
           {filteredReviews.length === 0 ? (
             <div className="p-8 text-center text-slate-500">
               No se encontraron reseñas con esos filtros.
             </div>
           ) : (
             filteredReviews.map((review) => (
               <div key={review.id} className="p-6 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                 <div className="flex items-start justify-between gap-4">
                   <div className="flex-1">
                     <div className="flex items-center gap-2 mb-1">
                       <span className="text-sm font-bold text-slate-800 dark:text-white">{review.customer_name}</span>
                       <span className="text-xs text-slate-500">• {new Date(review.created_at).toLocaleDateString()}</span>
                       <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                         review.status === 'Pendiente' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                       }`}>
                         {review.status}
                       </span>
                     </div>
                     
                     <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 mb-2">
                       En producto: {review.product_name}
                     </p>

                     <div className="flex items-center gap-1 mb-3">
                       {[1,2,3,4,5].map(star => (
                         <Star key={star} size={14} className={star <= review.rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700'} />
                       ))}
                     </div>

                     <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl italic border-l-4 border-slate-200 dark:border-slate-700">
                       "{review.comment}"
                     </p>

                     {/* Zona de Respuesta de la tienda */}
                     {review.reply ? (
                       <div className="ml-6 flex items-start gap-3 bg-violet-50 dark:bg-violet-900/20 p-4 rounded-xl border border-violet-100 dark:border-violet-900/50 relative group">
                         <CornerDownRight size={16} className="text-violet-500 mt-0.5 shrink-0" />
                         <div className="flex-1">
                           <p className="text-xs font-bold text-violet-700 dark:text-violet-400 mb-1">Respuesta de la Tienda:</p>
                           <p className="text-sm text-slate-700 dark:text-slate-300">{review.reply}</p>
                         </div>
                         <button 
                           onClick={async () => {
                             try {
                               await fetch(`https://axonmarket-api.onrender.com/api/ecommerce/reviews/${review.id}/reply`, {
                                 method: 'PUT',
                                 headers: { 'Content-Type': 'application/json' },
                                 body: JSON.stringify({ reply: null })
                               });
                               fetchReviews();
                             } catch(err) {}
                           }}
                           className="absolute top-2 right-2 p-1.5 text-violet-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                           title="Eliminar Respuesta"
                         >
                           <Trash2 size={14} />
                         </button>
                       </div>
                     ) : replyingTo === review.id ? (
                       <div className="ml-6 flex items-start gap-3 mt-4">
                         <div className="flex-1 flex gap-2">
                           <textarea
                             autoFocus
                             rows="2"
                             placeholder="Escribe tu respuesta pública aquí..."
                             value={replyText}
                             onChange={(e) => setReplyText(e.target.value)}
                             className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-violet-200 dark:border-violet-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white resize-none"
                           ></textarea>
                           <div className="flex flex-col gap-2">
                             <button 
                               onClick={() => submitReply(review.id)}
                               className="p-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors flex items-center justify-center"
                               title="Enviar"
                             >
                               <Send size={16} />
                             </button>
                             <button 
                               onClick={() => setReplyingTo(null)}
                               className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg transition-colors flex items-center justify-center"
                               title="Cancelar"
                             >
                               <X size={16} />
                             </button>
                           </div>
                         </div>
                       </div>
                     ) : (
                       <div className="flex gap-2">
                         {review.status === 'Pendiente' && (
                           <>
                             <button onClick={() => handleApprove(review.id)} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition-colors">
                               <Check size={14} /> Aprobar
                             </button>
                             <button onClick={() => handleReject(review.id)} className="flex items-center gap-1.5 px-4 py-2 bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 rounded-lg text-xs font-bold hover:bg-rose-200 dark:hover:bg-rose-500/30 transition-colors">
                               <X size={14} /> Rechazar
                             </button>
                           </>
                         )}
                         <button onClick={() => startReply(review.id)} className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                           <CornerDownRight size={14} /> Responder
                         </button>
                       </div>
                     )}
                   </div>
                 </div>
               </div>
             ))
           )}
        </div>
      </div>
    </div>
  );
}
