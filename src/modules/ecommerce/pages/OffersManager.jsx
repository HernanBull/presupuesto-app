import React, { useState, useEffect } from 'react';
import { Tag, Search, Save, Zap, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../supabaseClient';

// ─── Toast simple local (evita dependencia extra) ─────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = (msg, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };
  return { toasts, success: (m) => add(m, 'success'), error: (m) => add(m, 'error') };
}

function ToastContainer({ toasts }) {
  return (
    <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className={`flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl text-sm font-bold pointer-events-auto
              ${t.type === 'success'
                ? 'bg-emerald-500 text-white'
                : 'bg-red-500 text-white'}`}
          >
            {t.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function OffersManager() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [discountPrice, setDiscountPrice] = useState('');
  const toast = useToast();

  const workspaceId = localStorage.getItem('activeWorkspace');

  // ── Carga productos directamente de Supabase ──────────────────────────────
  const fetchProducts = async () => {
    if (!workspaceId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ecommerce_products')
        .select('id, name, price, image_url, is_offer, discount_price, publish_status')
        .eq('workspace_id', workspaceId)
        .eq('publish_status', 'Publicado') // Solo productos publicados pueden tener oferta
        .order('name', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error cargando productos:', err);
      toast.error('No se pudieron cargar los productos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [workspaceId]);

  // ── Apagar oferta ─────────────────────────────────────────────────────────
  const handleDisableOffer = async (product) => {
    try {
      const { error } = await supabase
        .from('ecommerce_products')
        .update({ is_offer: 0, discount_price: 0 })
        .eq('id', product.id);

      if (error) throw error;
      // Actualización optimista
      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, is_offer: 0, discount_price: 0 } : p
      ));
      toast.success('📦 Oferta desactivada.');
    } catch (err) {
      console.error(err);
      toast.error('Error al desactivar la oferta: ' + err.message);
    }
  };

  // ── Abrir modal para activar oferta ───────────────────────────────────────
  const handleOpenOfferModal = (product) => {
    setEditingProduct(product);
    setDiscountPrice(product.price > 0 ? (product.price * 0.8).toFixed(2) : '');
  };

  // ── Guardar oferta en Supabase ────────────────────────────────────────────
  const handleSaveOffer = async () => {
    if (!editingProduct) return;
    const priceNum = Number(discountPrice);

    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error('Ingresa un precio de oferta válido.');
      return;
    }
    if (priceNum >= editingProduct.price) {
      toast.error('El precio de oferta debe ser menor al precio original.');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('ecommerce_products')
        .update({ is_offer: 1, discount_price: priceNum })
        .eq('id', editingProduct.id);

      if (error) throw error;

      // Actualización optimista
      setProducts(prev => prev.map(p =>
        p.id === editingProduct.id
          ? { ...p, is_offer: 1, discount_price: priceNum }
          : p
      ));
      toast.success('⚡ ¡Oferta publicada en vitrina!');
      setEditingProduct(null);
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar la oferta: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const activeOffers  = filteredProducts.filter(p => Number(p.is_offer) === 1 || p.is_offer === true);
  const inactiveOffers = filteredProducts.filter(p => !p.is_offer || Number(p.is_offer) === 0);

  const discountPct = editingProduct && editingProduct.price > 0
    ? Math.round((1 - Number(discountPrice) / editingProduct.price) * 100)
    : 0;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 pb-24 md:pb-8">
      <ToastContainer toasts={toast.toasts} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Zap className="text-amber-500 fill-amber-500" /> Ofertas Flash
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Destaca productos publicados con precios rebajados en tu vitrina.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 dark:text-white"
          />
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-40 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {!loading && !workspaceId && (
        <div className="p-8 text-center text-slate-500">
          No hay una tienda activa seleccionada.
        </div>
      )}

      {!loading && workspaceId && (
        <>
          {/* ── Ofertas Activas ── */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse inline-block" />
              Ofertas Activas ({activeOffers.length})
            </h3>

            {activeOffers.length === 0 ? (
              <div className="p-10 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                <Zap size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p className="font-medium">No tienes ofertas activas.</p>
                <p className="text-sm mt-1">Selecciona un producto de abajo para crear una oferta flash.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {activeOffers.map(p => (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-4 flex flex-col relative overflow-hidden"
                  >
                    <div className="absolute -right-4 -top-4 opacity-10 text-amber-500 rotate-12 pointer-events-none">
                      <Zap size={100} />
                    </div>
                    <div className="flex gap-3 mb-3 relative z-10">
                      <div className="w-14 h-14 bg-white dark:bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-amber-100 dark:border-amber-500/20 shrink-0">
                        {p.image_url
                          ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                          : <Tag size={22} className="text-amber-300" />
                        }
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-800 dark:text-amber-50 text-sm line-clamp-2">{p.name}</h4>
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase tracking-wider font-bold bg-amber-100 dark:bg-amber-500/20 px-1.5 py-0.5 rounded-md mt-1 inline-block">
                          Oferta Flash
                        </span>
                      </div>
                    </div>
                    <div className="mt-auto flex items-center justify-between relative z-10 bg-white/60 dark:bg-black/20 p-2 rounded-xl backdrop-blur-sm gap-2">
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-400 line-through">${Number(p.price).toFixed(2)}</span>
                        <span className="text-base font-black text-amber-600 dark:text-amber-400">${Number(p.discount_price).toFixed(2)}</span>
                      </div>
                      <button
                        onClick={() => handleDisableOffer(p)}
                        className="px-3 py-1.5 bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 rounded-lg text-xs font-bold transition-colors shrink-0"
                      >
                        Apagar
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* ── Inventario Regular ── */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              Inventario Publicado ({inactiveOffers.length})
            </h3>

            {inactiveOffers.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                {products.length === 0
                  ? 'No tienes productos publicados aún. Ve a Inventario y publica tus productos primero.'
                  : 'Todos tus productos publicados están en oferta.'}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {inactiveOffers.map(p => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col transition-all hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md"
                >
                  <div className="flex gap-3 mb-3">
                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-100 dark:border-slate-800 shrink-0">
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                        : <Tag size={20} className="text-slate-300" />
                      }
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm line-clamp-2">{p.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">${Number(p.price).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <button
                      onClick={() => handleOpenOfferModal(p)}
                      className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-500/20 dark:hover:text-amber-400 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Zap size={13} className="fill-current" /> Convertir en Oferta
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Modal: Nueva Oferta Flash ── */}
      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              {/* Modal header */}
              <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-5 relative">
                <button
                  onClick={() => setEditingProduct(null)}
                  className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="flex items-center gap-2 text-white">
                  <Zap size={22} className="fill-white" />
                  <h3 className="text-lg font-black">Nueva Oferta Flash</h3>
                </div>
                <p className="text-white/80 text-xs mt-1">El precio de oferta aparecerá en la vitrina pública.</p>
              </div>

              <div className="p-6 space-y-5">
                {/* Producto */}
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                  <div className="w-10 h-10 bg-white dark:bg-slate-700 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                    {editingProduct.image_url
                      ? <img src={editingProduct.image_url} alt={editingProduct.name} className="w-full h-full object-cover" />
                      : <Tag size={18} className="text-slate-300" />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 dark:text-white text-sm truncate">{editingProduct.name}</p>
                    <p className="text-xs text-slate-500">Precio actual: <strong>${Number(editingProduct.price).toFixed(2)}</strong></p>
                  </div>
                </div>

                {/* Input precio oferta */}
                <div>
                  <label className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2 block">
                    Precio de Oferta ($)
                  </label>
                  <input
                    type="number"
                    autoFocus
                    min="0.01"
                    step="0.01"
                    value={discountPrice}
                    onChange={(e) => setDiscountPrice(e.target.value)}
                    placeholder="Ej. 19.99"
                    className="w-full px-4 py-3 bg-white dark:bg-slate-950 border-2 border-amber-200 dark:border-amber-500/40 rounded-xl text-xl font-black text-slate-800 dark:text-white focus:outline-none focus:border-amber-500 shadow-inner"
                  />
                  {/* Indicador de descuento */}
                  {discountPrice && Number(discountPrice) > 0 && Number(discountPrice) < editingProduct.price && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-2 flex items-center gap-1">
                      <CheckCircle size={12} />
                      {discountPct}% de descuento — precio original tachado en vitrina
                    </p>
                  )}
                  {discountPrice && Number(discountPrice) >= editingProduct.price && (
                    <p className="text-xs text-red-500 font-bold mt-2 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      Debe ser menor al precio original
                    </p>
                  )}
                </div>

                {/* Botones */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setEditingProduct(null)}
                    className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-bold text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveOffer}
                    disabled={saving || !discountPrice || Number(discountPrice) <= 0 || Number(discountPrice) >= editingProduct.price}
                    className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-xl font-bold text-sm transition-all shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      <><Save size={15} /> Publicar Oferta</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
