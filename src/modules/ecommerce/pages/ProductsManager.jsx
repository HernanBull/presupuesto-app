import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Plus, Search, Edit2, Trash2, X, Image as ImageIcon, 
  CheckCircle, Clock, Package, FolderTree, Tag, Layers, 
  ArrowRight, ExternalLink, Sparkles, CheckCircle2, AlertCircle,
  PackageSearch
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import toast from 'react-hot-toast';
import ComboBuilderModal from '../components/ComboBuilderModal';

export default function ProductsManager() {
  const navigate = useNavigate();
  const location = useLocation();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pestañas activas: 'combos' o 'categories'
  const [activeTab, setActiveTab] = useState(() => {
    if (location.pathname === '/categories' || location.search.includes('tab=categories')) {
      return 'categories';
    }
    return 'combos';
  });

  // Sincronizar pestaña según URL
  useEffect(() => {
    if (location.pathname === '/categories') {
      setActiveTab('categories');
    } else if (location.pathname === '/combos' || location.pathname === '/products') {
      setActiveTab('combos');
    }
  }, [location.pathname]);

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
            category: p.category || 'General',
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

  // ==========================================
  // ESTADOS Y FILTROS PARA COMBOS
  // ==========================================
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [isComboModalOpen, setIsComboModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);

  const combosOnly = useMemo(() => {
    return products.filter(p => p.metadata?.is_combo || p.category === 'Combos');
  }, [products]);

  const filteredCombos = useMemo(() => {
    return combosOnly.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'Todos' || product.publishStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [combosOnly, searchTerm, statusFilter]);

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
      toast.success(newStatus === 'Publicado' ? 'Combo publicado' : 'Combo guardado como borrador');
    } catch (err) {
      console.error(err);
      setProducts(products.map(p => p.id === id ? { ...p, publishStatus: currentStatus } : p));
      toast.error('Error al actualizar estado');
    }
  };

  const handleDeleteCombo = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este combo?')) {
      try {
        const { error } = await supabase
          .from('ecommerce_products')
          .delete()
          .eq('id', id);
          
        if (!error) {
          setProducts(products.filter(p => p.id !== id));
          toast.success('Combo eliminado exitosamente');
        } else {
          toast.error('Error al eliminar combo: ' + error.message);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // ==========================================
  // ESTADOS Y GESTIÓN DE CATEGORÍAS
  // ==========================================
  const [categorySearch, setCategorySearch] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  // Extracción unificada de categorías del inventario
  const categoriesList = useMemo(() => {
    const map = new Map();
    products.forEach(p => {
      const cat = (p.category || 'General').trim();
      if (!map.has(cat)) {
        map.set(cat, {
          name: cat,
          count: 0,
          totalStock: 0,
          combosCount: 0,
          sampleProducts: []
        });
      }
      const item = map.get(cat);
      item.count += 1;
      item.totalStock += (Number(p.stock) || 0);
      if (p.metadata?.is_combo || p.category === 'Combos') {
        item.combosCount += 1;
      }
      if (item.sampleProducts.length < 3) {
        item.sampleProducts.push(p.name);
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [products]);

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categoriesList;
    const q = categorySearch.toLowerCase().trim();
    return categoriesList.filter(c => c.name.toLowerCase().includes(q));
  }, [categoriesList, categorySearch]);

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    const cleanName = newCatName.trim();
    if (!cleanName) {
      toast.error('Indica un nombre para la categoría');
      return;
    }
    if (categoriesList.some(c => c.name.toLowerCase() === cleanName.toLowerCase())) {
      toast.error('Esta categoría ya existe en tu catálogo');
      return;
    }

    try {
      setSavingCategory(true);
      const workspaceId = localStorage.getItem('activeWorkspace');
      
      // Guardar en la configuración del workspace como categoría registrada
      const { data: ws } = await supabase.from('workspaces').select('config').eq('id', workspaceId).single();
      const currentConfig = ws?.config || {};
      const customCats = Array.isArray(currentConfig.customCategories) ? currentConfig.customCategories : [];
      if (!customCats.includes(cleanName)) {
        customCats.push(cleanName);
      }
      await supabase.from('workspaces').update({ config: { ...currentConfig, customCategories: customCats } }).eq('id', workspaceId);

      toast.success(`Categoría "${cleanName}" registrada exitosamente`);
      setNewCatName('');
      setIsCategoryModalOpen(false);
      // Redirigir opcionalmente al inventario filtrando o refrescar
      fetchProducts();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar categoría: ' + err.message);
    } finally {
      setSavingCategory(false);
    }
  };

  const handleRenameCategory = async (oldName) => {
    const newName = window.prompt(`Nuevo nombre para la categoría "${oldName}":`, oldName);
    if (!newName || newName.trim() === '' || newName.trim() === oldName) return;

    try {
      const workspaceId = localStorage.getItem('activeWorkspace');
      const { error } = await supabase
        .from('ecommerce_products')
        .update({ category: newName.trim() })
        .eq('workspace_id', workspaceId)
        .eq('category', oldName);

      if (error) throw error;
      toast.success(`Categoría "${oldName}" renombrada a "${newName.trim()}"`);
      fetchProducts();
    } catch (err) {
      console.error(err);
      toast.error('Error al renombrar categoría: ' + err.message);
    }
  };

  const handleDeleteCategory = async (catName) => {
    if (catName === 'General') {
      alert('La categoría General es la predeterminada del sistema y no puede eliminarse.');
      return;
    }
    if (window.confirm(`¿Seguro que deseas eliminar la categoría "${catName}"? Todos los productos asociados pasarán automáticamente a la categoría "General".`)) {
      try {
        const workspaceId = localStorage.getItem('activeWorkspace');
        const { error } = await supabase
          .from('ecommerce_products')
          .update({ category: 'General' })
          .eq('workspace_id', workspaceId)
          .eq('category', catName);

        if (error) throw error;
        toast.success(`Categoría "${catName}" eliminada. Productos movidos a General.`);
        fetchProducts();
      } catch (err) {
        console.error(err);
        toast.error('Error al eliminar categoría: ' + err.message);
      }
    }
  };

  const totalCatalogStock = useMemo(() => {
    return products.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
  }, [products]);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 pb-28 md:pb-8 relative">
      
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <span className="w-2.5 h-6 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full inline-block"></span>
            Combos, Paquetes & Categorías
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestiona los paquetes promocionales y clasifica los productos de tu catálogo en un solo lugar.
          </p>
        </div>

        {/* Acciones Rápidas */}
        <div className="w-full sm:w-auto flex items-center gap-2 justify-end">
          {activeTab === 'combos' ? (
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
          ) : (
            <button 
              type="button"
              onClick={() => setIsCategoryModalOpen(true)} 
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black px-5 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-amber-500/25 active:scale-95 cursor-pointer"
            >
              <Plus size={18} />
              <span>+ Nueva Categoría</span>
            </button>
          )}
        </div>
      </div>

      {/* Pestañas Unificadas: Combos & Paquetes vs Categorías */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('combos')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'combos'
              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <Package size={17} />
          <span>Combos & Paquetes</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-black ${
            activeTab === 'combos' ? 'bg-black/20 text-black' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}>
            {combosOnly.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
        >
          <FolderTree size={17} />
          <span>Categorías del Catálogo</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-black ${
            activeTab === 'categories' ? 'bg-black/20 text-black' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}>
            {categoriesList.length}
          </span>
        </button>
      </div>

      {/* ========================================================
          VISTA 1: COMBOS & PAQUETES
          ======================================================== */}
      {activeTab === 'combos' && (
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

          {/* Grid de Combos */}
          <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50">
            {filteredCombos.length === 0 ? (
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
                {filteredCombos.map((product, i) => (
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
                      <div className="absolute top-3 right-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-sm">
                          {product.metadata?.combo_badge || '🎁 COMBO'}
                        </span>
                      </div>

                      {/* Botones rápidos móvil */}
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
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteCombo(product.id); }} className="w-8 h-8 rounded-full bg-red-500/90 text-white flex items-center justify-center shadow-md">
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Quick Actions Hover overlay — desktop */}
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
                         <button onClick={(e) => { e.stopPropagation(); handleDeleteCombo(product.id); }} className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
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
                        <p className="font-black text-lg text-amber-600 dark:text-amber-400">${Number(product.price || 0).toFixed(2)}</p>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          {product.metadata?.combo_items ? `${product.metadata.combo_items.length} productos` : 'Combo'}
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
      )}

      {/* ========================================================
          VISTA 2: CATEGORÍAS DEL CATÁLOGO
          ======================================================== */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* Tarjetas de Resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                <FolderTree size={24} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Categorías Activas</span>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{categoriesList.length}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-600 flex items-center justify-center shrink-0">
                <PackageSearch size={24} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Productos en Catálogo</span>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{products.length}</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                <Layers size={24} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Unidades Totales Stock</span>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{totalCatalogStock}</p>
              </div>
            </div>
          </div>

          {/* Panel Principal de Categorías */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar categoría..." 
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-shadow dark:text-white font-medium"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                />
              </div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {filteredCategories.length} {filteredCategories.length === 1 ? 'categoría' : 'categorías'}
              </span>
            </div>

            {/* Grid de Categorías */}
            <div className="p-5 bg-slate-50/50 dark:bg-slate-900/50">
              {filteredCategories.length === 0 ? (
                <div className="py-16 text-center flex flex-col items-center justify-center max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 mb-4 shadow-inner">
                    <FolderTree size={32} />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">
                    {categorySearch ? 'No se encontraron categorías' : 'No hay categorías registradas'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                    {categorySearch ? 'Intenta con otro término de búsqueda.' : 'Crea tu primera categoría para organizar tu inventario y combos promocionales.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="mt-5 flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
                  >
                    <Plus size={15} />
                    <span>+ Crear Categoría</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCategories.map((cat) => (
                    <div 
                      key={cat.name}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-lg transition-all duration-200 flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
                              <Tag size={18} />
                            </div>
                            <div>
                              <h3 className="font-extrabold text-base text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                {cat.name}
                              </h3>
                              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                {cat.count} {cat.count === 1 ? 'producto' : 'productos'} · {cat.totalStock} unidades
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleRenameCategory(cat.name)}
                              title="Renombrar categoría"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              <Edit2 size={15} />
                            </button>
                            {cat.name !== 'General' && (
                              <button
                                onClick={() => handleDeleteCategory(cat.name)}
                                title="Eliminar categoría"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Muestra de productos de esta categoría */}
                        {cat.sampleProducts.length > 0 && (
                          <div className="bg-slate-50 dark:bg-slate-950/70 rounded-xl p-2.5 my-3 border border-slate-100 dark:border-slate-800/80">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                              Ejemplos en esta categoría:
                            </span>
                            <div className="space-y-1">
                              {cat.sampleProducts.map((pName, idx) => (
                                <p key={idx} className="text-xs text-slate-600 dark:text-slate-300 truncate font-medium flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                                  {pName}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Botón Ver Productos en Inventario */}
                      <button
                        onClick={() => navigate(`/inventory?category=${encodeURIComponent(cat.name)}`)}
                        className="mt-2 w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-amber-950/40 text-slate-700 hover:text-amber-700 dark:text-slate-300 dark:hover:text-amber-400 font-bold text-xs rounded-xl transition-all cursor-pointer border border-transparent hover:border-amber-500/30"
                      >
                        <PackageSearch size={14} />
                        <span>Ver productos en Inventario</span>
                        <ArrowRight size={13} className="ml-0.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal para Crear Nueva Categoría */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center">
                  <FolderTree size={20} />
                </div>
                <h3 className="font-black text-lg text-slate-900 dark:text-white">Nueva Categoría</h3>
              </div>
              <button 
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Nombre de la categoría
                </label>
                <input 
                  type="text" 
                  placeholder="Ej. Bebidas, Limpieza, Víveres, Postres..." 
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  autoFocus
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 dark:text-white font-medium"
                />
              </div>

              <div className="p-3 bg-amber-50/60 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                💡 Esta categoría estará disponible inmediatamente al crear o editar productos en tu inventario y para organizar combos.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCategory || !newCatName.trim()}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs shadow-md shadow-amber-500/25 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {savingCategory ? 'Guardando...' : 'Crear Categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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