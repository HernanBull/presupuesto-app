import React, { useState, useEffect } from 'react';
import { Bell, Search, CheckCheck, PackageSearch, Trash2, ArrowUpRight, CheckCircle2, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';

export default function NotificationsManager() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [replenishingId, setReplenishingId] = useState(null);
  const navigate = useNavigate();

  const slug = localStorage.getItem('storeSlug');
  const wsId = localStorage.getItem('activeWorkspace');

  const fetchNotifications = async () => {
    if (!slug && !wsId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 1. Notificaciones desde la API de Render
      let apiNotifs = [];
      if (slug) {
        try {
          const res = await fetch(`https://axonmarket-api.onrender.com/api/ecommerce/notifications/${slug}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) apiNotifs = data;
          }
        } catch (e) {
          console.error("Error fetching API notifs:", e);
        }
      }

      // 2. Notificaciones desde Supabase (si existen)
      let supaNotifs = [];
      if (wsId || slug) {
        try {
          const query = supabase.from('ecommerce_notifications').select('*');
          if (wsId && slug) {
            query.or(`workspace_id.eq.${wsId},workspace_id.eq.${slug}`);
          } else if (wsId) {
            query.eq('workspace_id', wsId);
          } else {
            query.eq('workspace_id', slug);
          }
          const { data } = await query.order('created_at', { ascending: false });
          if (Array.isArray(data)) supaNotifs = data;
        } catch (e) {
          console.error("Error fetching Supabase notifs:", e);
        }
      }

      // 3. Notificaciones Virtuales de Stock Bajo en Vitrina
      let virtualNotifs = [];
      if (wsId) {
        try {
          const { data: lowStock } = await supabase
            .from('ecommerce_products')
            .select('id, name, stock, stock_vitrina')
            .eq('workspace_id', wsId)
            .lte('stock_vitrina', 4)
            .gt('stock', 0)
            .in('publish_status', ['Activo', 'Publicado']);

          if (lowStock && lowStock.length > 0) {
            const readIds = JSON.parse(localStorage.getItem(`read_notifs_${wsId}`) || '[]');
            const dismissedIds = JSON.parse(localStorage.getItem(`dismissed_notifs_${wsId}`) || '[]');

            virtualNotifs = lowStock
              .filter(p => !dismissedIds.includes('virtual-stock-' + p.id))
              .map(p => ({
                id: 'virtual-stock-' + p.id,
                product_id: p.id,
                is_read: readIds.includes('virtual-stock-' + p.id),
                type: 'stock_alert',
                message: `¡Vitrina vaciándose! Quedan ${p.stock_vitrina || 0} uds de "${p.name}". Tienes ${p.stock} uds en el depósito.`,
                created_at: new Date().toISOString()
              }));
          }
        } catch (e) {
          console.error("Error fetching virtual stock notifs:", e);
        }
      }

      // 4. Fusionar y deduplicar por ID
      const dismissedIds = wsId ? JSON.parse(localStorage.getItem(`dismissed_notifs_${wsId}`) || '[]') : [];
      const readIds = wsId ? JSON.parse(localStorage.getItem(`read_notifs_${wsId}`) || '[]') : [];

      const map = new Map();
      [...virtualNotifs, ...apiNotifs, ...supaNotifs].forEach(item => {
        if (!item || !item.id) return;
        if (dismissedIds.includes(item.id)) return;

        // Normalizar is_read
        const isRead = Boolean(item.is_read) || readIds.includes(item.id);
        if (!map.has(item.id)) {
          map.set(item.id, { ...item, is_read: isRead });
        }
      });

      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );

      setNotifications(merged);
    } catch (err) {
      console.error("Error global fetchNotifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const handleUpdate = () => fetchNotifications();
    window.addEventListener('notifications_updated', handleUpdate);
    return () => window.removeEventListener('notifications_updated', handleUpdate);
  }, [slug, wsId]);

  const markAsRead = async (id) => {
    if (typeof id === 'string' && id.startsWith('virtual-stock-')) {
      if (wsId) {
        const readIds = JSON.parse(localStorage.getItem(`read_notifs_${wsId}`) || '[]');
        if (!readIds.includes(id)) {
          readIds.push(id);
          localStorage.setItem(`read_notifs_${wsId}`, JSON.stringify(readIds));
        }
      }
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      window.dispatchEvent(new Event('notifications_updated'));
      return;
    }

    try {
      await fetch(`https://axonmarket-api.onrender.com/api/ecommerce/notifications/${id}/read`, { method: 'PUT' });
      try {
        await supabase.from('ecommerce_notifications').update({ is_read: 1 }).eq('id', id);
      } catch (e) {}
    } catch (err) {
      console.error(err);
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    window.dispatchEvent(new Event('notifications_updated'));
  };

  const markAllAsRead = async () => {
    if (wsId) {
      const readIds = JSON.parse(localStorage.getItem(`read_notifs_${wsId}`) || '[]');
      notifications.forEach(n => {
        if (!readIds.includes(n.id)) readIds.push(n.id);
      });
      localStorage.setItem(`read_notifs_${wsId}`, JSON.stringify(readIds));
    }

    // Actualizar remotas si las hay
    const remoteUnread = notifications.filter(n => !n.is_read && !n.id.startsWith('virtual-stock-'));
    for (const n of remoteUnread) {
      try {
        fetch(`https://axonmarket-api.onrender.com/api/ecommerce/notifications/${n.id}/read`, { method: 'PUT' });
        supabase.from('ecommerce_notifications').update({ is_read: 1 }).eq('id', n.id);
      } catch (e) {}
    }

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    window.dispatchEvent(new Event('notifications_updated'));
  };

  const deleteNotification = async (id) => {
    if (typeof id === 'string' && id.startsWith('virtual-stock-')) {
      if (wsId) {
        const dismissed = JSON.parse(localStorage.getItem(`dismissed_notifs_${wsId}`) || '[]');
        if (!dismissed.includes(id)) {
          dismissed.push(id);
          localStorage.setItem(`dismissed_notifs_${wsId}`, JSON.stringify(dismissed));
        }
      }
      setNotifications(prev => prev.filter(n => n.id !== id));
      window.dispatchEvent(new Event('notifications_updated'));
      return;
    }

    try {
      await supabase.from('ecommerce_notifications').delete().eq('id', id);
    } catch (e) {}

    setNotifications(prev => prev.filter(n => n.id !== id));
    window.dispatchEvent(new Event('notifications_updated'));
  };

  const handleAutoReplenish = async (n) => {
    if (!n.product_id) return;
    try {
      setReplenishingId(n.id);

      // 1. Obtener datos actuales del producto
      const { data: product, error: fetchErr } = await supabase
        .from('ecommerce_products')
        .select('*')
        .eq('id', n.product_id)
        .single();

      if (fetchErr || !product) {
        alert('⚠️ Error al consultar el producto.');
        return;
      }

      // 2. Validar si hay stock en depósito
      if ((product.stock || 0) > 0) {
        const newStock = Number(product.stock) - 1;
        const newVitrina = Number(product.stock_vitrina || 0) + 1;

        // 3. Aplicar parche (transferencia)
        const { error: patchErr } = await supabase
          .from('ecommerce_products')
          .update({ stock: newStock, stock_vitrina: newVitrina })
          .eq('id', n.product_id);

        if (!patchErr) {
          // 4. Marcar como leída y si la vitrina ya está por encima de 4, descartar
          if (newVitrina > 4 && wsId) {
            const dismissed = JSON.parse(localStorage.getItem(`dismissed_notifs_${wsId}`) || '[]');
            if (!dismissed.includes(n.id)) {
              dismissed.push(n.id);
              localStorage.setItem(`dismissed_notifs_${wsId}`, JSON.stringify(dismissed));
            }
          }

          markAsRead(n.id);
          alert(`✅ Éxito: Se ha transferido 1 unidad de "${product.name}" de Depósito a Vitrina. (Vitrina: ${newVitrina}, Depósito: ${newStock})`);
          fetchNotifications();
        } else {
          alert('⚠️ Error al actualizar el inventario.');
        }
      } else {
        alert(`⚠️ No hay stock disponible en Depósito para "${product.name}". Debes registrar una entrada de stock externo primero.`);
      }
    } catch (err) {
      console.error('Error auto-replenish:', err);
      alert('⚠️ Hubo un error al transferir el stock automáticamente.');
    } finally {
      setReplenishingId(null);
    }
  };

  const filteredNotifications = notifications.filter(n =>
    (n.message || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-6 pb-28 md:pb-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2.5 tracking-tight">
            <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-xl">
              <Bell size={22} className="stroke-[2.5]" />
            </div>
            <span>Historial de Notificaciones</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Alertas en tiempo real sobre inventario de vitrina, reposiciones y movimientos de tu tienda.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar alertas..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30 dark:text-white placeholder:text-slate-400 shadow-2xs"
            />
          </div>

          <button
            onClick={fetchNotifications}
            disabled={loading}
            title="Actualizar notificaciones"
            className="p-2.5 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-zinc-300 transition-colors shadow-2xs active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Card Principal */}
      <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden shadow-xs">
        {/* Barra superior de estado */}
        <div className="p-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between bg-slate-50/70 dark:bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <h3 className="font-bold text-slate-800 dark:text-white text-xs sm:text-sm tracking-wide">Alertas Recientes</h3>
            {unreadCount > 0 ? (
              <span className="px-2.5 py-0.5 bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 text-[11px] font-black rounded-full">
                {unreadCount} sin leer
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-[11px] font-bold rounded-full flex items-center gap-1">
                <CheckCircle2 size={12} /> Al día
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-1.5 transition-colors active:scale-95"
            >
              <CheckCheck size={14} /> Marcar todas leídas
            </button>
          )}
        </div>

        {/* Contenido */}
        {loading ? (
          <div className="p-16 text-center text-slate-400 dark:text-zinc-500 text-sm flex flex-col items-center gap-3">
            <RefreshCw size={24} className="animate-spin text-amber-500" />
            <span>Consultando alertas en tiempo real...</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-16 text-center text-slate-500 dark:text-zinc-500 flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-500 mb-4">
              <Bell size={28} />
            </div>
            <h4 className="font-bold text-base text-slate-800 dark:text-white mb-1">Bandeja al día</h4>
            <p className="text-xs text-slate-400 dark:text-zinc-400 max-w-xs">
              No tienes notificaciones pendientes. Te avisaremos aquí cuando tu vitrina necesite reposición o recibas pedidos.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {filteredNotifications.map(n => {
              const isStockAlert = n.type === 'stock_alert';

              return (
                <div 
                  key={n.id} 
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row gap-4 transition-colors ${
                    n.is_read 
                      ? 'bg-transparent opacity-80 hover:opacity-100' 
                      : 'bg-amber-50/60 dark:bg-amber-500/5'
                  }`}
                >
                  {/* Icono de tipo */}
                  <div className="shrink-0 pt-0.5">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-2xs ${
                      isStockAlert 
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' 
                        : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                    }`}>
                      {isStockAlert ? <AlertTriangle size={18} /> : <Info size={18} />}
                    </div>
                  </div>

                  {/* Cuerpo del mensaje */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[10px] uppercase tracking-widest font-black px-2 py-0.5 rounded-md ${
                        isStockAlert 
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300' 
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                      }`}>
                        {isStockAlert ? 'Alerta de Vitrina' : 'Sistema'}
                      </span>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      )}
                      <span className="text-[11px] text-slate-400 ml-auto">
                        {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                      </span>
                    </div>

                    <p className="text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-medium leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                  
                  {/* Botones de acción */}
                  <div className="flex items-center gap-2 shrink-0 sm:flex-col sm:items-end justify-end pt-2 sm:pt-0">
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      {/* Reponer stock */}
                      {n.product_id && (
                        <button 
                          onClick={() => handleAutoReplenish(n)}
                          disabled={replenishingId === n.id}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                        >
                          <PackageSearch size={14} />
                          <span>{replenishingId === n.id ? 'Moviendo...' : 'Reponer (1 u.)'}</span>
                        </button>
                      )}

                      {/* Marcar leída */}
                      {!n.is_read && (
                        <button 
                          onClick={() => markAsRead(n.id)}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors active:scale-95"
                          title="Marcar como leída"
                        >
                          <CheckCheck size={14} />
                          <span className="sm:inline">Leída</span>
                        </button>
                      )}

                      {/* Ver en Inventario */}
                      {isStockAlert && (
                        <button
                          onClick={() => navigate('/inventory')}
                          className="p-2 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-white/5 rounded-xl transition-colors"
                          title="Ir a Inventario"
                        >
                          <ArrowUpRight size={16} />
                        </button>
                      )}

                      {/* Eliminar / Descartar */}
                      <button
                        onClick={() => deleteNotification(n.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                        title="Descartar notificación"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
