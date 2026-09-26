import React, { useState, useEffect } from 'react';
import { Tag, Search, Save, Zap, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OffersManager() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [discountPrice, setDiscountPrice] = useState('');

  const workspaceId = localStorage.getItem('activeWorkspace') || 'default_workspace';

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}/api/ecommerce/products?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        // Solo productos publicados o en borrador, pero que existan.
        setProducts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [workspaceId]);

  const handleToggleOffer = async (product) => {
    if (product.is_offer) {
      // Apagar oferta
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}/api/ecommerce/products/${product.id}/offer`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isOffer: false, discountPrice: 0 })
        });
        if (res.ok) {
          fetchProducts();
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      // Encender oferta (Abre modal)
      setEditingProduct(product);
      setDiscountPrice(product.price > 0 ? (product.price * 0.8).toFixed(2) : ''); // Sugiere 20% off
    }
  };

  const handleSaveOffer = async () => {
    if (!editingProduct) return;
    const priceNum = Number(discountPrice);
    if (isNaN(priceNum) || priceNum <= 0 || priceNum >= editingProduct.price) {
      alert("El precio de oferta debe ser válido y menor al precio original.");
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}/api/ecommerce/products/${editingProduct.id}/offer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOffer: true, discountPrice: priceNum })
      });
      if (res.ok) {
        setEditingProduct(null);
        fetchProducts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const activeOffers = filteredProducts.filter(p => p.is_offer);
  const inactiveOffers = filteredProducts.filter(p => !p.is_offer);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Zap className="text-amber-500" /> Ofertas Flash
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Destaca productos temporalmente con precios rebajados en tu vitrina.
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

      <div className="space-y-6">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          Ofertas Activas ({activeOffers.length})
        </h3>
        {activeOffers.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
            No tienes ofertas activas en este momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeOffers.map(p => (
              <div key={p.id} className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-4 flex flex-col relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-10 text-amber-500 rotate-12 pointer-events-none">
                  <Zap size={100} />
                </div>
                <div className="flex gap-3 mb-3 relative z-10">
                  <div className="w-16 h-16 bg-white dark:bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-amber-100 dark:border-amber-500/20 shrink-0">
                    {p.image_url ? (
                      <img src={`${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}${p.image_url}`} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <Tag size={24} className="text-amber-300" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-amber-50 text-sm line-clamp-2">{p.name}</h4>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 uppercase tracking-wider font-bold">Oferta Flash</p>
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between relative z-10 bg-white/50 dark:bg-black/20 p-2 rounded-xl backdrop-blur-sm">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500 line-through">${Number(p.price).toFixed(2)}</span>
                    <span className="text-lg font-black text-amber-600 dark:text-amber-400">${Number(p.discount_price).toFixed(2)}</span>
                  </div>
                  <button 
                    onClick={() => handleToggleOffer(p)}
                    className="px-3 py-1.5 bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 rounded-lg text-xs font-bold transition-colors"
                  >
                    Apagar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
          Inventario Regular
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {inactiveOffers.map(p => (
            <div key={p.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col transition-all hover:border-slate-300 dark:hover:border-slate-700">
              <div className="flex gap-3 mb-3">
                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-100 dark:border-slate-800 shrink-0">
                  {p.image_url ? (
                    <img src={`${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}${p.image_url}`} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <Tag size={20} className="text-slate-300" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm line-clamp-2">{p.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">${Number(p.price).toFixed(2)}</p>
                </div>
              </div>
              <div className="mt-auto">
                <button 
                  onClick={() => handleToggleOffer(p)}
                  className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-100 hover:text-amber-600 dark:hover:bg-amber-500/20 dark:hover:text-amber-400 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Zap size={14} /> Convertir en Oferta
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 text-amber-500 mb-4">
                  <Zap size={24} className="fill-current" />
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">Nueva Oferta Flash</h3>
                </div>
                
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  Estás a punto de colocar <strong className="text-slate-800 dark:text-slate-200">{editingProduct.name}</strong> en oferta en tu vitrina pública.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Precio Original</label>
                    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-slate-600 dark:text-slate-400 font-medium line-through">
                      ${Number(editingProduct.price).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-1.5 block">Precio de Oferta ($)</label>
                    <input 
                      type="number"
                      autoFocus
                      value={discountPrice}
                      onChange={(e) => setDiscountPrice(e.target.value)}
                      placeholder="Ej. 19.99"
                      className="w-full px-4 py-3 bg-white dark:bg-slate-900 border-2 border-amber-200 dark:border-amber-500/50 rounded-xl text-lg font-black text-slate-800 dark:text-white focus:outline-none focus:border-amber-500 shadow-inner"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button 
                    onClick={() => setEditingProduct(null)}
                    className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-bold text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSaveOffer}
                    className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-black rounded-xl font-bold text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                  >
                    <Save size={16} /> Publicar
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
