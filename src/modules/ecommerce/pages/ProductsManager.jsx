import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, X, Image as ImageIcon, CheckCircle, Clock, Package } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import ComboBuilderModal from '../components/ComboBuilderModal';
export default function ProductsManager() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const workspaceId = localStorage.getItem('activeWorkspace');
      if (!workspaceId) {
        window.location.reload();
        return;
      }
      const { data, error } = await supabase
        .from('ecommerce_products')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped = data.map(p => {
          let metadata = p.metadata || {};
          if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch(e) {}
          }
          return {
            ...p,
            publishStatus: p.publish_status || 'Borrador',
            imageUrl: p.image_url || (metadata?.images && metadata.images.length > 0 ? metadata.images[0] : '')
          };
        });
        setProducts(mapped);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState('Todos');
  
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Modal de Combos Promocionales
  const [isComboModalOpen, setIsComboModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'Ropa',
    price: '',
    stock: '',
    description: '',
    publishStatus: 'Borrador',
    variants: 1
  });

  // Filtros de Combos
  const combosOnly = products.filter(p => p.metadata?.is_combo || p.category === 'Combos');
  const filteredProducts = combosOnly.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'Todos' || product.publishStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openEditor = (product = null) => {
    if (product) {
      navigate(`/product-studio/${product.id}`);
    } else {
      navigate('/product-studio');
    }
  };

  const togglePublishStatus = async (e, id, currentStatus) => {
    e.stopPropagation();
    const newStatus = currentStatus === 'Publicado' ? 'Borrador' : 'Publicado';
    
    // Optimistic update
    setProducts(products.map(p => p.id === id ? { ...p, publishStatus: newStatus } : p));
    
    try {
      const { error } = await supabase
        .from('ecommerce_products')
        .update({ publish_status: newStatus })
        .eq('id', id);
        
      if (error) throw error;
    } catch (err) {
      console.error(err);
      // Revert on error
      setProducts(products.map(p => p.id === id ? { ...p, publishStatus: currentStatus } : p));
    }
  };

  const handleDelete = async (id) => {
    if(window.confirm('¿Estás seguro de eliminar este combo?')) {
      try {
        const { error } = await supabase
          .from('ecommerce_products')
          .delete()
          .eq('id', id);
          
        if (!error) {
          setProducts(products.filter(p => p.id !== id));
        } else {
          alert('Error al eliminar combo: ' + error.message);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 pb-28 md:pb-8 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <span className="w-2.5 h-6 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full inline-block"></span>
            Combos & Paquetes
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Arma combos atractivos con los productos de tu inventario y publícalos directamente en tu vitrina.
          </p>
        </div>
        <div className="w-full sm:w-auto flex items-center justify-end">
          <button 
            type="button"
            onClick={() => {
              setEditingCombo(null);
              setIsComboModalOpen(true);
            }} 
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black px-5 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-amber-500/25 active:scale-95 cursor-pointer"
          >
            <Package size={18} />
            <span>+ Crear Combo</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar combos..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-shadow dark:text-white font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-medium"
            >
              <option value="Todos">Todos los Estados</option>
              <option value="Publicado">Publicado</option>
              <option value="Borrador">Borrador</option>
            </select>
          </div>
        </div>

        {/* Grid de Tarjetas */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50">
          {filteredProducts.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 mb-4 shadow-inner">
                <Package size={32} />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                {searchTerm ? 'No se encontraron combos' : 'Aún no tienes combos creados'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                {searchTerm ? 'Intenta con otro término de búsqueda.' : 'Crea paquetes especiales combinando productos que ya tienes registrados en tu inventario para venderlos juntos en tu vitrina.'}
              </p>
              {!searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCombo(null);
                    setIsComboModalOpen(true);
                  }}
                  className="mt-5 flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
                >
                  <Package size={15} />
                  <span>+ Crear mi primer combo</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredProducts.map((product, i) => (
                <div 
                  key={product.id} 
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer animate-in fade-in zoom-in-95" 
                  style={{ animationDelay: `${(i % 10) * 50}ms` }}
                  onClick={() => {
                    setEditingCombo(product);
                    setIsComboModalOpen(true);
                  }}
                >
                  <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <ImageIcon size={40} className="text-slate-300 dark:text-slate-700" />
                    )}
                    
                    {/* Badge Stock */}
                    <div className="absolute top-3 left-3">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm backdrop-blur-md ${product.stock > 0 ? 'bg-white/90 text-emerald-600 dark:bg-slate-900/90 dark:text-emerald-400' : 'bg-red-500/90 text-white'}`}>
                        {product.stock > 0 ? `${product.stock} un.` : 'Agotado'}
                      </span>
                    </div>

                    {/* Contador de fotos */}
                    {((Array.isArray(product.images) && product.images.length > 1) || (Array.isArray(product.metadata?.images) && product.metadata.images.length > 1)) && (
                      <div className="absolute bottom-3 left-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/70 text-white shadow-sm backdrop-blur-xs flex items-center gap-1">
                          <ImageIcon size={10} /> {(product.images || product.metadata?.images).length} fotos
                        </span>
                      </div>
                    )}

                    {/* Badge de Combo */}
                    {(product.metadata?.is_combo || product.category === 'Combos') && (
                      <div className="absolute top-3 right-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-sm">
                          {product.metadata?.combo_badge || '🎁 COMBO'}
                        </span>
                      </div>
                    )}

                    {/* Botones rápidos: hover en desktop, siempre visibles en móvil */}
                    <div className="absolute bottom-2 right-2 flex gap-1.5 sm:hidden">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setEditingCombo(product);
                          setIsComboModalOpen(true);
                        }} 
                        className="w-8 h-8 rounded-full bg-white/95 text-slate-900 flex items-center justify-center shadow-md hover:bg-amber-50 transition-colors"
                      >
                        <Edit2 size={14} className="text-amber-600" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }} className="w-8 h-8 rounded-full bg-red-500/90 text-white flex items-center justify-center shadow-md">
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Quick Actions Hover overlay — solo desktop */}
                    <div className="hidden sm:flex absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center gap-3">
                       <button 
                         onClick={(e) => { 
                           e.stopPropagation(); 
                           setEditingCombo(product);
                           setIsComboModalOpen(true);
                         }} 
                         className="w-10 h-10 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-lg hover:scale-110 hover:bg-amber-50 transition-all"
                       >
                         <Edit2 size={18} className="text-amber-600" />
                       </button>
                       <button onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }} className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                         <Trash2 size={18} />
                       </button>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-white line-clamp-1">{product.name}</h3>
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">{product.category || 'Combo Especial'}</p>
                      </div>
                      <p className="font-black text-lg text-amber-600 dark:text-amber-400">${product.price.toFixed(2)}</p>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        {product.variants} {product.variants === 1 ? 'variante' : 'variantes'}
                      </div>
                      
                      {/* Quick Toggle Status */}
                      <button 
                        onClick={(e) => togglePublishStatus(e, product.id, product.publishStatus)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                          product.publishStatus === 'Publicado' 
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' 
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {product.publishStatus === 'Publicado' ? (
                          <><CheckCircle size={12} /> Activo</>
                        ) : (
                          <><Clock size={12} /> Oculto</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Creador y Editor de Combos Promocionales */}
      <ComboBuilderModal
        isOpen={isComboModalOpen}
        onClose={() => setIsComboModalOpen(false)}
        onComboSaved={() => {
          fetchProducts();
        }}
        existingCombo={editingCombo}
        availableProducts={products}
      />
    </div>
  );
}
