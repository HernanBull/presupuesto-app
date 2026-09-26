import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, X, Image as ImageIcon, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
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
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'Ropa',
    price: '',
    stock: '',
    description: '',
    publishStatus: 'Borrador',
    variants: 1
  });

  // Filtros
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'Todas' || product.category === categoryFilter;
    const matchesStatus = statusFilter === 'Todos' || product.publishStatus === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const openEditor = (product = null) => {
    if (product) {
      navigate(`/ecommerce/product-studio/${product.id}`);
    } else {
      navigate('/ecommerce/product-studio');
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
    if(window.confirm('¿Estás seguro de eliminar este producto?')) {
      try {
        const { error } = await supabase
          .from('ecommerce_products')
          .delete()
          .eq('id', id);
          
        if (!error) {
          setProducts(products.filter(p => p.id !== id));
        } else {
          alert('Error al eliminar producto: ' + error.message);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 pb-24 md:pb-8 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Productos</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestiona tu catálogo, variantes y disponibilidad en la tienda.</p>
        </div>
        <button onClick={() => openEditor()} className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-violet-500/20">
          <Plus size={18} />
          Nuevo Producto
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar productos..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-shadow dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              <option value="Todas">Todas las Categorías</option>
              <option value="Ropa">Ropa</option>
              <option value="Electrónica">Electrónica</option>
              <option value="Accesorios">Accesorios</option>
            </select>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
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
            <div className="py-12 text-center text-slate-500 font-medium">
              No se encontraron productos.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product, i) => (
                <div 
                  key={product.id} 
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer animate-in fade-in zoom-in-95" 
                  style={{ animationDelay: `${(i % 10) * 50}ms` }}
                  onClick={() => openEditor(product)}
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

                    {/* Botones rápidos: hover en desktop, siempre visibles en móvil */}
                    <div className="absolute bottom-2 right-2 flex gap-1.5 sm:hidden">
                      <button onClick={(e) => { e.stopPropagation(); openEditor(product); }} className="w-8 h-8 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-md">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }} className="w-8 h-8 rounded-full bg-red-500/90 text-white flex items-center justify-center shadow-md">
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Quick Actions Hover overlay — solo desktop */}
                    <div className="hidden sm:flex absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center gap-3">
                       <button onClick={(e) => { e.stopPropagation(); openEditor(product); }} className="w-10 h-10 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                         <Edit2 size={18} />
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
                        <p className="text-xs text-slate-500 dark:text-slate-400">{product.category}</p>
                      </div>
                      <p className="font-black text-lg text-violet-600 dark:text-violet-400">${product.price.toFixed(2)}</p>
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

      {/* Drawer eliminated in favor of ProductStudio */}
    </div>
  );
}
