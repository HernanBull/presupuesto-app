import React, { useState, useEffect } from 'react';
import { Bell, Search, CheckCheck, PackageSearch, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NotificationsManager() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const workspaceId = localStorage.getItem('storeSlug');

  const fetchNotifications = async () => {
    if (!workspaceId) return;
    try {
      setLoading(true);
      const res = await fetch(`https://axonmarket-api.onrender.com/api/ecommerce/notifications/${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [workspaceId]);

  const markAsRead = async (id) => {
    try {
      const res = await fetch(`https://axonmarket-api.onrender.com/api/ecommerce/notifications/${id}/read`, { method: 'PUT' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAutoReplenish = async (n) => {
    try {
      // 1. Obtener datos actuales del producto
      const res = await fetch(`https://axonmarket-api.onrender.com/api/ecommerce/products/${n.product_id}`);
      if (!res.ok) {
        alert('⚠️ Error al consultar el producto.');
        return;
      }
      const product = await res.json();
      
      // 2. Validar si hay stock en depósito
      if (product.stock > 0) {
        const newStock = product.stock - 1;
        const newVitrina = (product.stock_vitrina || 0) + 1;
        
        // 3. Aplicar parche (transferencia)
        const patchRes = await fetch(`https://axonmarket-api.onrender.com/api/ecommerce/products/${n.product_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stock: newStock, stock_vitrina: newVitrina })
        });
        
        if (patchRes.ok) {
          // 4. Marcar como leída y avisar
          markAsRead(n.id);
          alert(`✅ Éxito: Se ha transferido 1 unidad de '${product.name}' de Depósito a Vitrina.`);
        }
      } else {
        // No hay stock
        alert(`⚠️ No hay stock disponible en Depósito para '${product.name}'. Debes reponer inventario externo primero.`);
      }
    } catch (err) {
      console.error('Error auto-replenish:', err);
      alert('⚠️ Hubo un error al intentar transferir el stock automáticamente.');
    }
  };

  const filteredNotifications = notifications.filter(n => n.message.toLowerCase().includes(searchTerm.toLowerCase()));
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Bell className="text-amber-500" /> Historial de Notificaciones
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Monitorea intenciones de compra sin stock y otras alertas importantes de tu vitrina.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar en notificaciones..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 dark:text-white"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">Alertas Recientes</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 text-xs font-bold rounded-full">
                {unreadCount} sin leer
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-zinc-500">Cargando notificaciones...</div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-zinc-500">
            <Bell size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
            <p>No tienes notificaciones en este momento.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {filteredNotifications.map(n => (
              <div 
                key={n.id} 
                className={`p-6 flex flex-col md:flex-row gap-4 transition-colors ${n.is_read ? 'bg-transparent opacity-75' : 'bg-amber-50 dark:bg-amber-500/5'}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full ${n.type === 'stock_alert' ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'}`}>
                      {n.type === 'stock_alert' ? 'Falta de Stock' : 'Sistema'}
                    </span>
                    <span className="text-xs text-slate-400">{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-800 dark:text-slate-200 text-base leading-relaxed">{n.message}</p>
                </div>
                
                <div className="flex items-center gap-2 shrink-0 md:flex-col md:items-end justify-center">
                  {!n.is_read && (
                    <button 
                      onClick={() => markAsRead(n.id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors w-full md:w-auto justify-center"
                    >
                      <CheckCheck size={14} /> Marcar Leída
                    </button>
                  )}
                  {n.product_id && (
                    <button 
                      onClick={() => handleAutoReplenish(n)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-bold transition-colors w-full md:w-auto justify-center"
                    >
                      <PackageSearch size={14} /> Reponer (1 u.)
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
