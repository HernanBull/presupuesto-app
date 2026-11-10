import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Plus, Search, Edit2, Trash2, X, Image as ImageIcon, 
  CheckCircle, Clock, Package, FolderTree, Tag, Layers, 
  ArrowRight, ExternalLink, Sparkles, CheckCircle2, AlertCircle,
  PackageSearch, Camera, Upload, CheckSquare, Square, CornerDownRight
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import toast from 'react-hot-toast';
import ComboBuilderModal from '../components/ComboBuilderModal';
import { MARKETPLACE_CATEGORIES } from '../../../config/marketplaceCategories';
import { optimizeStoreImage } from '../utils/imageOptimizer';

const MARKETPLACE_DEPT_NAMES = new Set(
  MARKETPLACE_CATEGORIES.flatMap(c => [
    (c.id || '').toLowerCase().trim(),
    (c.name || '').toLowerCase().trim(),
    (c.fullName || '').toLowerCase().trim()
  ]).filter(Boolean)
);

export default function ProductsManager() {
  const navigate = useNavigate();
  const location = useLocation();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customCategories, setCustomCategories] = useState([]);

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

      // Cargar categorías personalizadas del catálogo interno (con soporte completo de subcategorías e imágenes)
      const { data: ws } = await supabase.from('workspaces').select('config').eq('id', workspaceId).single();
      const rawCustom = Array.isArray(ws?.config?.customCategories) ? ws.config.customCategories : [];
      const parsedCategories = rawCustom.map(item => {
        if (typeof item === 'string') {
          const clean = item.trim();
          return clean ? { name: clean, color: '#EA580C', imageUrl: '', subcategories: [] } : null;
        }
        if (item && typeof item === 'object') {
          const name = (item.name || '').trim();
          const color = item.color || '#EA580C';
          const imageUrl = item.imageUrl || '';
          const rawSubs = Array.isArray(item.subcategories) ? item.subcategories : [];
          const subcategories = rawSubs.map(s => {
            if (typeof s === 'string') {
              const cleanSub = s.trim();
              return cleanSub ? { name: cleanSub, imageUrl: '' } : null;
            }
            if (s && typeof s === 'object') {
              const sName = (s.name || '').trim();
              return sName ? { name: sName, imageUrl: s.imageUrl || '' } : null;
            }
            return null;
          }).filter(Boolean);

          return name ? { name, color, imageUrl, subcategories } : null;
        }
        return null;
      }).filter(Boolean);

      setCustomCategories(parsedCategories);

      if (!error && data) {
        const mapped = data.map(p => {
          let metadata = p.metadata || {};
          if (typeof metadata === 'string') {
            try { metadata = JSON.parse(metadata); } catch(e) {}
          }
          return {
            ...p,
            category: p.category || 'General',
            subcategory: p.subcategory || '',
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

  // Extracción unificada de categorías (con subcategorías e imágenes)
  const categoriesList = useMemo(() => {
    const map = new Map();

    const productCategoriesLower = new Set(
      products.map(p => (p.category || 'General').trim().toLowerCase())
    );

    // Mapeo de conteo de subcategorías en inventario
    const subcatCountMap = new Map();
    products.forEach(p => {
      const c = (p.category || 'General').trim().toLowerCase();
      const s = (p.subcategory || '').trim().toLowerCase();
      if (s) {
        const key = `${c}:::${s}`;
        subcatCountMap.set(key, (subcatCountMap.get(key) || 0) + 1);
      }
    });

    customCategories.forEach(catItem => {
      const cleanName = (typeof catItem === 'string' ? catItem : catItem.name || '').trim();
      if (!cleanName) return;
      const cleanLower = cleanName.toLowerCase();
      if (MARKETPLACE_DEPT_NAMES.has(cleanLower) && !productCategoriesLower.has(cleanLower)) {
        return;
      }

      const rawSubs = Array.isArray(catItem.subcategories) ? catItem.subcategories : [];
      const subcategories = rawSubs.map(sub => {
        const sName = (typeof sub === 'string' ? sub : sub.name || '').trim();
        const sImg = typeof sub === 'object' ? (sub.imageUrl || '') : '';
        const sKey = `${cleanLower}:::${sName.toLowerCase()}`;
        return {
          name: sName,
          imageUrl: sImg,
          count: subcatCountMap.get(sKey) || 0
        };
      }).filter(s => s.name);

      if (!map.has(cleanName)) {
        map.set(cleanName, {
          name: cleanName,
          color: catItem.color || '#EA580C',
          imageUrl: catItem.imageUrl || '',
          subcategories,
          count: 0,
          totalStock: 0,
          combosCount: 0,
          sampleProducts: [],
          isCustom: true
        });
      }
    });

    // Extraer y contabilizar a partir de los productos en inventario
    products.forEach(p => {
      const cat = (p.category || 'General').trim();
      if (!map.has(cat)) {
        map.set(cat, {
          name: cat,
          color: '#EA580C',
          imageUrl: '',
          subcategories: [],
          count: 0,
          totalStock: 0,
          combosCount: 0,
          sampleProducts: [],
          isCustom: false
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

    return Array.from(map.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [products, customCategories]);

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categoriesList;
    const q = categorySearch.toLowerCase().trim();
    return categoriesList.filter(c => c.name.toLowerCase().includes(q));
  }, [categoriesList, categorySearch]);

  // Persistir cambios en workspaces.config.customCategories
  const saveCustomCategories = async (updatedList) => {
    setCustomCategories(updatedList);
    const workspaceId = localStorage.getItem('activeWorkspace');
    if (!workspaceId) return;
    try {
      const { data: ws } = await supabase.from('workspaces').select('config').eq('id', workspaceId).single();
      const currentConfig = ws?.config || {};
      await supabase.from('workspaces').update({
        config: { ...currentConfig, customCategories: updatedList }
      }).eq('id', workspaceId);
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar cambios: ' + err.message);
    }
  };

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
      const newCategoryObj = {
        name: cleanName,
        color: '#EA580C',
        imageUrl: '',
        subcategories: []
      };
      const updatedList = [...customCategories, newCategoryObj];
      await saveCustomCategories(updatedList);

      toast.success(`Categoría "${cleanName}" registrada exitosamente`);
      setNewCatName('');
      setIsCategoryModalOpen(false);
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
      const clean = newName.trim();
      const workspaceId = localStorage.getItem('activeWorkspace');

      const updatedList = customCategories.map(c => {
        const cName = typeof c === 'string' ? c : c.name;
        if (cName.toLowerCase() === oldName.toLowerCase()) {
          return typeof c === 'string' 
            ? { name: clean, color: '#EA580C', imageUrl: '', subcategories: [] } 
            : { ...c, name: clean };
        }
        return c;
      });

      await saveCustomCategories(updatedList);

      const { error } = await supabase
        .from('ecommerce_products')
        .update({ category: clean })
        .eq('workspace_id', workspaceId)
        .eq('category', oldName);

      if (error) throw error;
      toast.success(`Categoría "${oldName}" renombrada a "${clean}"`);
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

        const updatedList = customCategories.filter(c => (typeof c === 'string' ? c : c.name).toLowerCase() !== catName.toLowerCase());
        await saveCustomCategories(updatedList);

        const { error } = await supabase
          .from('ecommerce_products')
          .update({ category: 'General', subcategory: null })
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

  // ==========================================
  // GESTIÓN DE SUBCATEGORÍAS
  // ==========================================
  const [subcatModal, setSubcatModal] = useState({ isOpen: false, categoryName: '', subcatName: '' });

  const handleOpenAddSubcat = (categoryName) => {
    setSubcatModal({ isOpen: true, categoryName, subcatName: '' });
  };

  const handleCreateSubcategory = async (e) => {
    e?.preventDefault();
    const { categoryName, subcatName } = subcatModal;
    const cleanSub = subcatName.trim();
    if (!cleanSub) return toast.error('Escribe el nombre de la subcategoría');

    const catIndex = customCategories.findIndex(c => (typeof c === 'string' ? c : c.name).toLowerCase() === categoryName.toLowerCase());
    let updatedList = [...customCategories];

    if (catIndex >= 0) {
      const currentCat = typeof updatedList[catIndex] === 'object' ? updatedList[catIndex] : { name: updatedList[catIndex], subcategories: [] };
      const currentSubs = Array.isArray(currentCat.subcategories) ? [...currentCat.subcategories] : [];
      if (currentSubs.some(s => (typeof s === 'string' ? s : s.name).toLowerCase() === cleanSub.toLowerCase())) {
        return toast.error('Esta subcategoría ya existe en esta categoría');
      }
      currentSubs.push({ name: cleanSub, imageUrl: '' });
      updatedList[catIndex] = { ...currentCat, subcategories: currentSubs };
    } else {
      updatedList.push({
        name: categoryName,
        color: '#EA580C',
        imageUrl: '',
        subcategories: [{ name: cleanSub, imageUrl: '' }]
      });
    }

    await saveCustomCategories(updatedList);
    toast.success(`Subcategoría "${cleanSub}" creada en "${categoryName}"`);
    setSubcatModal({ isOpen: false, categoryName: '', subcatName: '' });
    fetchProducts();
  };

  const handleDeleteSubcategory = async (categoryName, subcatName) => {
    if (!window.confirm(`¿Seguro que deseas eliminar la subcategoría "${subcatName}"?`)) return;
    const catIndex = customCategories.findIndex(c => (typeof c === 'string' ? c : c.name).toLowerCase() === categoryName.toLowerCase());
    if (catIndex < 0) return;

    let updatedList = [...customCategories];
    const currentCat = typeof updatedList[catIndex] === 'object' ? updatedList[catIndex] : { name: updatedList[catIndex], subcategories: [] };
    const currentSubs = (Array.isArray(currentCat.subcategories) ? currentCat.subcategories : [])
      .filter(s => (typeof s === 'string' ? s : s.name).toLowerCase() !== subcatName.toLowerCase());
    updatedList[catIndex] = { ...currentCat, subcategories: currentSubs };

    await saveCustomCategories(updatedList);

    const workspaceId = localStorage.getItem('activeWorkspace');
    if (workspaceId) {
      await supabase
        .from('ecommerce_products')
        .update({ subcategory: null })
        .eq('workspace_id', workspaceId)
        .eq('category', categoryName)
        .eq('subcategory', subcatName);
    }

    toast.success(`Subcategoría "${subcatName}" eliminada`);
    fetchProducts();
  };

  // ==========================================
  // ASIGNACIÓN DE PRODUCTOS A SUBCATEGORÍA
  // ==========================================
  const [assignModal, setAssignModal] = useState({
    isOpen: false,
    categoryName: '',
    subcategoryName: '',
    selectedProductIds: new Set(),
    searchQuery: '',
    categoryFilter: 'ALL',
    saving: false
  });

  const handleOpenAssignModal = (categoryName, subcategoryName) => {
    const preSelected = new Set(
      products
        .filter(p => 
          (p.subcategory || '').toLowerCase() === subcategoryName.toLowerCase() &&
          (p.category || 'General').toLowerCase() === categoryName.toLowerCase()
        )
        .map(p => p.id)
    );
    setAssignModal({
      isOpen: true,
      categoryName,
      subcategoryName,
      selectedProductIds: preSelected,
      searchQuery: '',
      categoryFilter: 'ALL',
      saving: false
    });
  };

  const handleToggleProductInSubcat = (prodId) => {
    setAssignModal(prev => {
      const next = new Set(prev.selectedProductIds);
      if (next.has(prodId)) next.delete(prodId);
      else next.add(prodId);
      return { ...prev, selectedProductIds: next };
    });
  };

  const handleSaveProductAssignment = async () => {
    const { categoryName, subcategoryName, selectedProductIds } = assignModal;
    const workspaceId = localStorage.getItem('activeWorkspace');
    if (!workspaceId) return;

    try {
      setAssignModal(prev => ({ ...prev, saving: true }));

      const toAssign = [];
      const toUnassign = [];

      products.forEach(p => {
        const isSelected = selectedProductIds.has(p.id);
        const inThisSub = (p.subcategory || '').toLowerCase() === subcategoryName.toLowerCase() &&
                          (p.category || 'General').toLowerCase() === categoryName.toLowerCase();

        if (isSelected && !inThisSub) {
          toAssign.push(p.id);
        } else if (!isSelected && inThisSub) {
          toUnassign.push(p.id);
        }
      });

      // Asignar los seleccionados a la categoría padre y a la subcategoría
      if (toAssign.length > 0) {
        await supabase
          .from('ecommerce_products')
          .update({ 
            category: categoryName,
            subcategory: subcategoryName 
          })
          .in('id', toAssign);
      }

      // Desasignar los desmarcados
      if (toUnassign.length > 0) {
        await supabase
          .from('ecommerce_products')
          .update({ subcategory: null })
          .in('id', toUnassign);
      }

      toast.success(`Productos asignados a "${subcategoryName}" exitosamente`);
      setAssignModal({ isOpen: false, categoryName: '', subcategoryName: '', selectedProductIds: new Set(), searchQuery: '', categoryFilter: 'ALL', saving: false });
      fetchProducts();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar asignación: ' + err.message);
    } finally {
      setAssignModal(prev => ({ ...prev, saving: false }));
    }
  };

  // ==========================================
  // CARGA DE IMÁGENES CON BOTÓN (+)
  // ==========================================
  const fileInputRef = useRef(null);
  const [uploadTarget, setUploadTarget] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleTriggerUpload = (type, categoryName, subcategoryName = '') => {
    setUploadTarget({ type, categoryName, subcategoryName });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;

    try {
      setIsUploadingImage(true);
      const workspaceId = localStorage.getItem('activeWorkspace');
      let finalUrl = '';

      try {
        const optimized = await optimizeStoreImage(file, 'category');
        const fileExt = file.name ? file.name.split('.').pop() : 'webp';
        const fileName = `${uploadTarget.type}_${Date.now()}.${fileExt}`;
        const filePath = `category_assets/${workspaceId}/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('ecommerce').upload(filePath, optimized, {
          contentType: 'image/webp',
          upsert: true
        });

        if (!uploadError) {
          const { data: pubData } = supabase.storage.from('ecommerce').getPublicUrl(filePath);
          finalUrl = pubData?.publicUrl || '';
        }
      } catch (_) {}

      if (!finalUrl) {
        finalUrl = await new Promise((res) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result);
          reader.readAsDataURL(file);
        });
      }

      const catIndex = customCategories.findIndex(c => (typeof c === 'string' ? c : c.name).toLowerCase() === uploadTarget.categoryName.toLowerCase());
      let updatedList = [...customCategories];

      if (uploadTarget.type === 'category') {
        if (catIndex >= 0) {
          const cat = typeof updatedList[catIndex] === 'object' ? updatedList[catIndex] : { name: updatedList[catIndex], subcategories: [] };
          updatedList[catIndex] = { ...cat, imageUrl: finalUrl };
        } else {
          updatedList.push({ name: uploadTarget.categoryName, color: '#EA580C', imageUrl: finalUrl, subcategories: [] });
        }
      } else if (uploadTarget.type === 'subcategory') {
        if (catIndex >= 0) {
          const cat = typeof updatedList[catIndex] === 'object' ? updatedList[catIndex] : { name: updatedList[catIndex], subcategories: [] };
          const subs = (Array.isArray(cat.subcategories) ? cat.subcategories : []).map(s => {
            const sName = typeof s === 'string' ? s : s.name;
            if (sName.toLowerCase() === uploadTarget.subcategoryName.toLowerCase()) {
              return { name: sName, imageUrl: finalUrl };
            }
            return typeof s === 'string' ? { name: s, imageUrl: '' } : s;
          });
          updatedList[catIndex] = { ...cat, subcategories: subs };
        }
      }

      await saveCustomCategories(updatedList);
      toast.success('Imagen actualizada exitosamente');
      fetchProducts();
    } catch (err) {
      console.error(err);
      toast.error('Error al subir imagen: ' + err.message);
    } finally {
      setIsUploadingImage(false);
      setUploadTarget(null);
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
            {activeTab === 'categories' ? 'Categorías del Catálogo' : 'Combos & Paquetes Promocionales'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {activeTab === 'categories'
              ? 'Organiza los departamentos y rubros de tu negocio para que aparezcan en el POS Kiosco y el Inventario.'
              : 'Diseña combos especiales, ofertas 2x1 y paquetes con descuento para tus clientes.'}
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
                        {/* Cabecera de Categoría */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            {/* Avatar con botón (+) para imagen */}
                            <div className="relative shrink-0">
                              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-2 border-amber-500/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black overflow-hidden shadow-sm">
                                {cat.imageUrl ? (
                                  <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Tag size={24} />
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleTriggerUpload('category', cat.name)}
                                title={cat.imageUrl ? "Cambiar foto de categoría" : "Agregar foto a categoría"}
                                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow-md transition-transform hover:scale-110 cursor-pointer border-2 border-white dark:border-slate-900"
                              >
                                <Plus size={13} strokeWidth={3} />
                              </button>
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

                        {/* Bloque de Subcategorías */}
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                              <CornerDownRight size={13} className="text-amber-500" />
                              Subcategorías ({cat.subcategories?.length || 0})
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenAddSubcat(cat.name)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-700 dark:text-amber-300 hover:text-slate-950 text-[11px] font-black transition-colors cursor-pointer border border-amber-500/30"
                              title="Agregar subcategoría"
                            >
                              <Plus size={12} strokeWidth={3} />
                              <span>Subcategoría</span>
                            </button>
                          </div>

                          {(!cat.subcategories || cat.subcategories.length === 0) ? (
                            <p className="text-[11px] text-slate-400 italic py-1.5">
                              Sin subcategorías aún. Pulsa "+ Subcategoría" para agregar.
                            </p>
                          ) : (
                            <div className="space-y-1.5 my-2 max-h-48 overflow-y-auto pr-1">
                              {cat.subcategories.map((sub) => (
                                <div 
                                  key={sub.name} 
                                  className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 hover:border-amber-500/40 transition-colors"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    {/* Avatar subcategoría con botón (+) */}
                                    <div className="relative shrink-0">
                                      <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 flex items-center justify-center overflow-hidden border-2 border-amber-500/40 shadow-xs">
                                        {sub.imageUrl ? (
                                          <img src={sub.imageUrl} alt={sub.name} className="w-full h-full object-cover" />
                                        ) : (
                                          <FolderTree size={16} />
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleTriggerUpload('subcategory', cat.name, sub.name)}
                                        title="Subir foto a subcategoría"
                                        className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow cursor-pointer border border-white dark:border-slate-900"
                                      >
                                        <Plus size={9} strokeWidth={3} />
                                      </button>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                        {sub.name}
                                      </p>
                                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                        {sub.count} {sub.count === 1 ? 'producto' : 'productos'}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAssignModal(cat.name, sub.name)}
                                      title="Asignar productos a esta subcategoría"
                                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-200/80 hover:bg-amber-500 dark:bg-slate-800 dark:hover:bg-amber-500 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-slate-950 text-[10px] font-black transition-colors cursor-pointer"
                                    >
                                      <Package size={11} />
                                      <span>Asignar</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSubcategory(cat.name, sub.name)}
                                      title="Eliminar subcategoría"
                                      className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
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
                        className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-100 hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-amber-950/40 text-slate-700 hover:text-amber-700 dark:text-slate-300 dark:hover:text-amber-400 font-bold text-xs rounded-xl transition-all cursor-pointer border border-transparent hover:border-amber-500/30"
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

      {/* Input invisible para subida de imagen de categoría o subcategoría */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Modal para Crear Nueva Subcategoría */}
      {subcatModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center">
                  <CornerDownRight size={20} />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">Nueva Subcategoría</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Dentro de: <span className="font-bold text-amber-600 dark:text-amber-400">{subcatModal.categoryName}</span></p>
                </div>
              </div>
              <button 
                onClick={() => setSubcatModal({ isOpen: false, categoryName: '', subcatName: '' })}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubcategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  Nombre de la subcategoría
                </label>
                <input 
                  type="text" 
                  placeholder="Ej. Refrescos, Jugos, Lácteos, Harinas..." 
                  value={subcatModal.subcatName}
                  onChange={(e) => setSubcatModal(prev => ({ ...prev, subcatName: e.target.value }))}
                  autoFocus
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 dark:text-white font-medium"
                />
              </div>

              <div className="p-3 bg-amber-50/60 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                💡 Al crearla podrás asignarle una foto representativa con el botón (+) y colocar qué productos de "{subcatModal.categoryName}" pertenecen a ella.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSubcatModal({ isOpen: false, categoryName: '', subcatName: '' })}
                  className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!subcatModal.subcatName.trim()}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs shadow-md shadow-amber-500/25 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  Crear Subcategoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para Asignar Productos a Subcategoría */}
      {assignModal.isOpen && (() => {
        const availableCategories = ['ALL', ...Array.from(new Set(products.map(p => p.category || 'General')))];
        const filteredProds = products.filter(p => {
          const matchCat = assignModal.categoryFilter === 'ALL' || (p.category || 'General').toLowerCase() === assignModal.categoryFilter.toLowerCase();
          const q = assignModal.searchQuery.toLowerCase().trim();
          const matchQuery = !q || p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q));
          return matchCat && matchQuery;
        });

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 uppercase">
                      {assignModal.categoryName}
                    </span>
                    <ArrowRight size={13} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      Subcategoría
                    </span>
                  </div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white mt-1">
                    Asignar productos a "{assignModal.subcategoryName}"
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Puedes seleccionar cualquier producto de tu inventario. Al guardar, quedará registrado en esta subcategoría.
                  </p>
                </div>
                <button 
                  onClick={() => setAssignModal(prev => ({ ...prev, isOpen: false }))}
                  className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Barra de búsqueda y filtro de categoría */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Buscar producto por nombre o SKU..."
                    value={assignModal.searchQuery}
                    onChange={(e) => setAssignModal(prev => ({ ...prev, searchQuery: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50 dark:text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={assignModal.categoryFilter}
                    onChange={(e) => setAssignModal(prev => ({ ...prev, categoryFilter: e.target.value }))}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
                  >
                    <option value="ALL">Todo el Inventario ({products.length})</option>
                    {availableCategories.filter(c => c !== 'ALL').map(cat => (
                      <option key={cat} value={cat}>Categoría: {cat}</option>
                    ))}
                  </select>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0 whitespace-nowrap">
                    {assignModal.selectedProductIds.size} selec.
                  </span>
                </div>
              </div>

              {/* Lista de productos para seleccionar */}
              <div className="p-4 overflow-y-auto flex-1 space-y-2">
                {products.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No hay productos registrados en el inventario.
                  </div>
                ) : filteredProds.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No se encontraron productos con los filtros aplicados.
                  </div>
                ) : (
                  filteredProds.map((product) => {
                    const isChecked = assignModal.selectedProductIds.has(product.id);
                    const prodCat = product.category || 'General';
                    const prodSub = product.subcategory || '';
                    const isInOtherSub = prodSub && (prodSub.toLowerCase() !== assignModal.subcategoryName.toLowerCase() || prodCat.toLowerCase() !== assignModal.categoryName.toLowerCase());

                    return (
                      <div
                        key={product.id}
                        onClick={() => handleToggleProductInSubcat(product.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-amber-500/10 border-amber-500/40 dark:bg-amber-500/15 shadow-xs'
                            : 'bg-white dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            type="button"
                            className="shrink-0 text-amber-600 dark:text-amber-400"
                          >
                            {isChecked ? <CheckSquare size={18} /> : <Square size={18} className="text-slate-400" />}
                          </button>

                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-800" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                              <Package size={18} />
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {product.name}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                                ${Number(product.price || 0).toFixed(2)}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                · Stock: {product.stock ?? 0}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                                {prodCat}
                              </span>
                              {isInOtherSub && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 font-bold">
                                  subcat: {prodSub}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer con acciones */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setAssignModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveProductAssignment}
                  disabled={assignModal.saving}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 shadow-md shadow-amber-500/25 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {assignModal.saving ? 'Guardando...' : `Guardar Asignación (${assignModal.selectedProductIds.size})`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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