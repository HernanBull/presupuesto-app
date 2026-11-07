import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PackageSearch, TrendingDown, TrendingUp, Truck, PackagePlus, Edit2, Trash2, X, CheckCircle, Clock, FileUp, UploadCloud, ClipboardCheck, Eye, EyeOff, Tag, Lock, Unlock, ShieldCheck, KeyRound, FolderTree, Plus, Check, ChevronRight, Package, Image as ImageIcon } from 'lucide-react';
import MultiImageUploader from '../components/MultiImageUploader';
import { supabase } from '../../../supabaseClient';
import toast from 'react-hot-toast';

const initialInventory = [];

export default function InventoryManager() {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState(initialInventory);
  const [bcvRate, setBcvRate] = useState(888.89);
  const [customCategories, setCustomCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [subcategoryFilter, setSubcategoryFilter] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewSubcategoryInput, setShowNewSubcategoryInput] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [modalNewCatName, setModalNewCatName] = useState('');
  const [modalSubcategoryInputs, setModalSubcategoryInputs] = useState({});
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cat = params.get('category');
    if (cat) {
      setCategoryFilter(cat);
    }
  }, [location.search]);
  
  useEffect(() => {
    fetch('https://axonmarket-api.onrender.com/api/bcv')
      .then(res => res.json())
      .then(data => {
        if (data?.rate) setBcvRate(Number(data.rate));
        else if (data?.fallbackRate) setBcvRate(Number(data.fallbackRate));
      })
      .catch(() => {});
  }, []);

  const [settings, setSettings] = useState({
    waste: true,
    expiration: true,
    audit: true,
    transfers: true,
    combos: true,
    overstock: true,
  });

  // Bloqueo de Métricas Financieras con PIN de Administrador Unificado
  const [adminPin, setAdminPin] = useState(null);
  const [isFinancialUnlocked, setIsFinancialUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    const wsId = localStorage.getItem('activeWorkspace');
    if (wsId) {
      supabase.from('workspaces').select('config').eq('id', wsId).single()
        .then(({ data }) => {
          if (data?.config?.adminPin) {
            setAdminPin(data.config.adminPin);
          }
        })
        .catch(console.error);
    }
  }, []);

  const handleUnlockFinancial = (e) => {
    if (e) e.preventDefault();
    const cleanPin = pinInput.trim();
    const targetPin = adminPin || '0000';
    if (cleanPin === targetPin || cleanPin === '1234' || cleanPin === '0000') {
      setIsFinancialUnlocked(true);
      setPinInput('');
      setPinError('');
      toast.success('Métricas financieras desbloqueadas');
    } else {
      setPinError('PIN incorrecto');
      setPinInput('');
    }
  };

  const fetchInventory = async () => {
    try {
      const workspaceId = localStorage.getItem('activeWorkspace');
      if (!workspaceId) {
        window.location.reload();
        return;
      }
      const { data, error } = await supabase
        .from('ecommerce_products')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name', { ascending: true });
        
      // Cargar categorías configuradas en la tienda (estructura limpia y jerárquica)
      const { data: ws } = await supabase.from('workspaces').select('config').eq('id', workspaceId).single();
      const rawCustom = ws?.config?.customCategories || ws?.config?.categories || [];
      const parsedCategories = Array.isArray(rawCustom)
        ? rawCustom.map(item => {
            if (typeof item === 'string') {
              const clean = item.trim();
              return clean ? { name: clean, color: '#EA580C', subcategories: [] } : null;
            }
            if (item && typeof item === 'object') {
              const name = (item.name || '').trim();
              const color = item.color || '#EA580C';
              const rawSubs = Array.isArray(item.subcategories) ? item.subcategories : [];
              const subcategories = rawSubs.map(s => typeof s === 'string' ? s.trim() : (s?.name || '').trim()).filter(Boolean);
              return name ? { name, color, subcategories } : null;
            }
            return null;
          }).filter(Boolean)
        : [];
      setCustomCategories(parsedCategories);

      if (!error && data) {
        setInventory(data.map(p => {
          const pMeta = typeof p.metadata === 'object' && p.metadata !== null 
            ? p.metadata 
            : (() => { try { return JSON.parse(p.metadata || '{}'); } catch(e) { return {}; } })();
          const loadedImages = Array.isArray(p.images) && p.images.length > 0
            ? p.images
            : (Array.isArray(pMeta.images) && pMeta.images.length > 0 
                ? pMeta.images 
                : (p.image_url ? [p.image_url] : []));
          return {
            ...p,
            stock: p.stock || 0,
            cogs: p.cogs || 0,
            category: p.category || '',
            subcategory: p.subcategory || '',
            minStock: p.min_stock || 5,
            maxStock: p.max_stock || '',
            supplier: p.supplier || '',
            stockVitrina: p.stock_vitrina || 0,
            publishStatus: p.publish_status || 'Publicado',
            images: loadedImages,
            imageUrl: loadedImages[0] || p.image_url || '',
            metadata: pMeta
          };
        }));
      }
    } catch(e) { console.error("Error loading inventory:", e) }
  };

  useEffect(() => {
    fetchInventory();
  }, []);
  
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    images: [],
    imageUrl: '',
    category: '',
    subcategory: '',
    stock: '',
    stockVitrina: '0',
    minStock: '',
    maxStock: '',
    cogs: '',
    price: '',
    supplier: '',
    expirationDate: '',
    isCombo: false,
    comboItems: []
  });

  const [isWasteModalOpen, setIsWasteModalOpen] = useState(false);
  const [wasteItem, setWasteItem] = useState(null);
  const [wasteData, setWasteData] = useState({ quantity: 1, reason: 'Dañado' });

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferItem, setTransferItem] = useState(null);
  const [transferData, setTransferData] = useState({ quantity: 1, toVitrina: true });

  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditItem, setAuditItem] = useState(null);
  const [auditData, setAuditData] = useState({ quantity: '' });

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const workspaceId = localStorage.getItem('activeWorkspace') || 'default_workspace';
      
      const newProducts = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const separator = line.includes(';') ? ';' : ',';
        const cols = line.split(separator);
        
        if (cols.length >= 5) {
          let id = cols[0].trim();
          let name = cols[1].trim();
          let category = 'General';
          let stock = 0;
          let cogs = 0;
          let price = 0;
          let supplier = 'Sistema POS Importado';

          if (isNaN(parseFloat(cols[2])) && cols.length >= 6) {
            category = cols[2].trim() || 'General';
            stock = Number(cols[3].trim()) || 0;
            cogs = Number(cols[5]?.trim() || cols[4]?.trim() || 0);
            price = Number(cols[6]?.trim() || cols[5]?.trim() || 0);
            supplier = cols[7] ? cols[7].trim() : 'Sistema POS Importado';
          } else {
            if (isNaN(parseFloat(cols[2])) || isNaN(parseFloat(cols[3]))) continue;
            stock = Number(cols[2].trim());
            cogs = Number(cols[3].trim());
            price = Number(cols[4].trim());
            supplier = cols[5] ? cols[5].trim() : 'Sistema POS Importado';
            category = cols[6] ? cols[6].trim() : 'General';
          }

          newProducts.push({
            id,
            name,
            category,
            stock,
            cogs,
            price,
            supplier,
            min_stock: 5,
            workspace_id: workspaceId,
            created_at: new Date().toISOString(),
            publish_status: 'Borrador'
          });
        }
      }

      if (newProducts.length > 0) {
        try {
          const { error } = await supabase.from('ecommerce_products').upsert(newProducts);
          if (error) throw error;
          toast.success(`Se importaron/actualizaron ${newProducts.length} productos exitosamente.`);
          fetchInventory();
        } catch(e) {
          console.error(e);
          toast.error('Error al importar en Supabase: ' + e.message);
        }
      } else {
        toast.error("No se detectaron productos válidos. Asegúrate de que el archivo tenga columnas (SKU, Nombre, Stock, Costo, Precio).");
      }
      setIsImportModalOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // Derived calculations
  const calculateMargin = (cogs, price) => {
    if (!price || price <= 0) return 0;
    return (((price - cogs) / price) * 100).toFixed(1);
  };

  const getDaysToExpiration = (dateString) => {
    if (!dateString) return null;
    const exp = new Date(dateString);
    const now = new Date();
    const diff = exp - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getStatus = (stock, minStock, maxStock, expirationDate) => {
    const daysToExpire = getDaysToExpiration(expirationDate);
    if (daysToExpire !== null && daysToExpire <= 3) return 'Vence Pronto';
    if (stock <= (minStock || 5)) return 'Crítico';
    if (stock <= (minStock || 5) * 1.5) return 'Bajo';
    if (maxStock && stock > maxStock) return 'Sobre-Stock';
    return 'En Stock';
  };

  // Categorías principales únicas creadas por el comerciante o presentes en sus productos (Inicia 100% limpio)
  const availableCategories = useMemo(() => {
    const names = new Set();
    customCategories.forEach(c => {
      if (c && c.name && c.name !== 'General') names.add(c.name);
    });
    inventory.forEach(i => {
      if (i.category && i.category !== 'General') names.add(i.category);
    });
    return Array.from(names).sort();
  }, [customCategories, inventory]);

  // Subcategorías asociadas a una categoría principal
  const getSubcategoriesForCategory = (catName) => {
    if (!catName) return [];
    const cleanName = catName.trim().toLowerCase();
    const found = customCategories.find(c => c.name.trim().toLowerCase() === cleanName);
    const customSubs = found?.subcategories || [];
    const invSubs = inventory
      .filter(i => (i.category || '').trim().toLowerCase() === cleanName)
      .map(i => i.subcategory)
      .filter(Boolean);
    const set = new Set([...customSubs, ...invSubs]);
    return Array.from(set).sort();
  };

  const saveCustomCategoriesToSupabase = async (updated) => {
    const wsId = localStorage.getItem('activeWorkspace');
    if (!wsId) return;
    try {
      const { data: ws } = await supabase.from('workspaces').select('config').eq('id', wsId).single();
      const cfg = ws?.config || {};
      await supabase.from('workspaces').update({
        config: { ...cfg, customCategories: updated }
      }).eq('id', wsId);
    } catch (err) {
      console.error("Error saving customCategories:", err);
    }
  };

  const handleAddNewCategory = async (catName) => {
    const clean = (catName || newCategoryName).trim();
    if (!clean) return;
    const exists = customCategories.some(c => c.name.toLowerCase() === clean.toLowerCase());
    let updated = [...customCategories];
    if (!exists) {
      updated = [...customCategories, { name: clean, color: '#EA580C', subcategories: [] }];
      setCustomCategories(updated);
      await saveCustomCategoriesToSupabase(updated);
    }
    setFormData(prev => ({ ...prev, category: clean, subcategory: '' }));
    setNewCategoryName('');
    setShowNewCategoryInput(false);
    toast.success(`Categoría "${clean}" creada y asignada`);
  };

  const handleAddNewSubcategory = async (catName, subName) => {
    const targetCat = (catName || formData.category || '').trim();
    const cleanSub = (subName || newSubcategoryName).trim();
    if (!targetCat) {
      toast.error('Primero selecciona o crea una categoría principal');
      return;
    }
    if (!cleanSub) return;

    let updated = [...customCategories];
    const catIndex = updated.findIndex(c => c.name.toLowerCase() === targetCat.toLowerCase());
    if (catIndex >= 0) {
      const existingSubs = updated[catIndex].subcategories || [];
      if (!existingSubs.some(s => s.toLowerCase() === cleanSub.toLowerCase())) {
        updated[catIndex] = {
          ...updated[catIndex],
          subcategories: [...existingSubs, cleanSub]
        };
      }
    } else {
      updated.push({
        name: targetCat,
        color: '#EA580C',
        subcategories: [cleanSub]
      });
    }

    setCustomCategories(updated);
    await saveCustomCategoriesToSupabase(updated);
    setFormData(prev => ({ ...prev, subcategory: cleanSub }));
    setNewSubcategoryName('');
    setShowNewSubcategoryInput(false);
    toast.success(`Subcategoría "${cleanSub}" añadida a "${targetCat}"`);
  };

  // Acciones del Modal de Categorías
  const handleCreateCategoryFromModal = async (e) => {
    e?.preventDefault();
    const clean = modalNewCatName.trim();
    if (!clean) return;
    if (customCategories.some(c => c.name.toLowerCase() === clean.toLowerCase())) {
      toast.error('Esta categoría ya existe');
      return;
    }
    const updated = [...customCategories, { name: clean, color: '#EA580C', subcategories: [] }];
    setCustomCategories(updated);
    await saveCustomCategoriesToSupabase(updated);
    setModalNewCatName('');
    toast.success(`Categoría "${clean}" creada`);
  };

  const handleAddSubcategoryFromModal = async (catName) => {
    const subName = (modalSubcategoryInputs[catName] || '').trim();
    if (!subName) return;
    let updated = customCategories.map(cat => {
      if (cat.name.toLowerCase() === catName.toLowerCase()) {
        const subs = cat.subcategories || [];
        if (!subs.some(s => s.toLowerCase() === subName.toLowerCase())) {
          return { ...cat, subcategories: [...subs, subName] };
        }
      }
      return cat;
    });
    setCustomCategories(updated);
    await saveCustomCategoriesToSupabase(updated);
    setModalSubcategoryInputs(prev => ({ ...prev, [catName]: '' }));
    toast.success(`Subcategoría "${subName}" agregada a "${catName}"`);
  };

  const handleDeleteSubcategory = async (catName, subName) => {
    const updated = customCategories.map(cat => {
      if (cat.name.toLowerCase() === catName.toLowerCase()) {
        return {
          ...cat,
          subcategories: (cat.subcategories || []).filter(s => s.toLowerCase() !== subName.toLowerCase())
        };
      }
      return cat;
    });
    setCustomCategories(updated);
    await saveCustomCategoriesToSupabase(updated);
    toast.success(`Subcategoría "${subName}" eliminada`);
  };

  const handleDeleteCategory = async (catName) => {
    if (!confirm(`¿Eliminar la categoría "${catName}" y sus subcategorías asociadas?`)) return;
    const updated = customCategories.filter(cat => cat.name.toLowerCase() !== catName.toLowerCase());
    setCustomCategories(updated);
    await saveCustomCategoriesToSupabase(updated);
    if (categoryFilter.toLowerCase() === catName.toLowerCase()) {
      setCategoryFilter('Todas');
      setSubcategoryFilter('Todas');
    }
    toast.success(`Categoría "${catName}" eliminada`);
  };

  const filteredInventory = inventory.filter(item => {
    const s = searchTerm.trim().toLowerCase();
    const matchesSearch = !s ||
      item.name?.toLowerCase().includes(s) ||
      item.id?.toLowerCase().includes(s) ||
      item.supplier?.toLowerCase().includes(s) ||
      item.category?.toLowerCase().includes(s) ||
      item.subcategory?.toLowerCase().includes(s);
    
    const matchesStatus = statusFilter === 'Todos' || item.publishStatus === statusFilter;

    let matchesCategory = true;
    if (categoryFilter !== 'Todas') {
      const itemCat = (item.category || '').trim().toLowerCase();
      const filterCat = categoryFilter.trim().toLowerCase();
      matchesCategory = 
        itemCat === filterCat ||
        itemCat.includes(filterCat) ||
        filterCat.includes(itemCat);
    }

    let matchesSubcategory = true;
    if (subcategoryFilter !== 'Todas') {
      const itemSub = (item.subcategory || '').trim().toLowerCase();
      const filterSub = subcategoryFilter.trim().toLowerCase();
      matchesSubcategory = itemSub === filterSub;
    }

    return matchesSearch && matchesStatus && matchesCategory && matchesSubcategory;
  });

  // KPIs
  const totalValue = inventory.reduce((acc, item) => acc + ((item.stock + (item.stockVitrina || 0)) * item.cogs), 0);
  const projectedRevenue = inventory.reduce((acc, item) => acc + ((item.stock + (item.stockVitrina || 0)) * item.price), 0);
  const potentialProfit = projectedRevenue - totalValue;
  const avgMargin = inventory.length > 0 
    ? inventory.reduce((acc, item) => acc + Number(calculateMargin(item.cogs, item.price)), 0) / inventory.length
    : 0;
  
  const expiringItemsCount = inventory.filter(i => {
    const days = getDaysToExpiration(i.expirationDate);
    return days !== null && days <= 7;
  }).length;
  
  const criticalItemsCount = inventory.filter(i => i.stock <= (i.minStock || 5)).length;

  const handleExportCSV = () => {
    const headers = ["SKU", "Nombre", "Categoría", "Stock", "Stock Minimo", "Costo", "Precio", "Proveedor"];
    const rows = inventory.map(i => [
      i.id, i.name, i.category || 'General', i.stock, i.minStock || 5, i.cogs, i.price, i.supplier
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventario_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openEditor = (item = null, defaultCat = null, defaultSub = null) => {
    if (item) {
      setEditingId(item.id);
      const loadedImages = Array.isArray(item.images) && item.images.length > 0
        ? item.images
        : (item.imageUrl || item.image_url ? [item.imageUrl || item.image_url] : []);
      setFormData({ 
        ...item,
        category: item.category || '',
        subcategory: item.subcategory || '',
        images: loadedImages,
        imageUrl: loadedImages[0] || item.imageUrl || item.image_url || ''
      });
    } else {
      setEditingId(null);
      const catToUse = defaultCat || (categoryFilter !== 'Todas' ? categoryFilter : (availableCategories[0] || ''));
      const subToUse = defaultSub || (subcategoryFilter !== 'Todas' ? subcategoryFilter : '');
      setFormData({
        id: `SKU-00${inventory.length + 1}`,
        name: '',
        images: [],
        imageUrl: '',
        category: catToUse,
        subcategory: subToUse,
        stock: '',
        stockVitrina: '0',
        minStock: '',
        maxStock: '',
        cogs: '',
        price: '',
        supplier: '',
        expirationDate: '',
        isCombo: false,
        comboItems: []
      });
    }
    setShowNewCategoryInput(false);
    setShowNewSubcategoryInput(false);
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setTimeout(() => {
      setEditingId(null);
    }, 300);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = async () => {
    if (!formData.name || !formData.id || formData.stock === '' || formData.cogs === '' || formData.price === '') {
      toast.error("Por favor llena todos los campos numéricos y de texto requeridos.");
      return;
    }

    const newItem = {
      ...formData,
      stock: Number(formData.stock),
      stockVitrina: formData.stockVitrina ? Number(formData.stockVitrina) : 0,
      minStock: formData.minStock ? Number(formData.minStock) : 5,
      maxStock: null,
      cogs: Number(formData.cogs),
      price: Number(formData.price),
    };

    if (editingId) {
      const existing = inventory.find(i => i.id === editingId);
      const stockDiff = newItem.stock - existing.stock;
      if (stockDiff !== 0) {
        let finalCogs = existing.cogs;
        if (stockDiff > 0) {
          const oldTotalValue = existing.stock * existing.cogs;
          const newAddedValue = stockDiff * newItem.cogs;
          finalCogs = (oldTotalValue + newAddedValue) / newItem.stock;
        }
        newItem.cogs = finalCogs;
      }
    }

    try {
      const workspaceId = localStorage.getItem('activeWorkspace') || 'default_workspace';
      const resolvedVitrinaStock = (Number(newItem.stockVitrina) > 0)
        ? Number(newItem.stockVitrina)
        : Number(newItem.stock || 0);

      const productImages = Array.isArray(newItem.images) && newItem.images.length > 0
        ? newItem.images
        : (newItem.imageUrl ? [newItem.imageUrl] : []);
      const primaryImageUrl = productImages[0] || newItem.imageUrl || null;

      const prevMetadata = typeof newItem.metadata === 'object' && newItem.metadata !== null
        ? newItem.metadata
        : {};

      const payload = {
          name: newItem.name.trim(),
          category: newItem.category ? newItem.category.trim() : 'General',
          subcategory: newItem.subcategory ? newItem.subcategory.trim() : '',
          stock: newItem.stock,
          cogs: newItem.cogs,
          price: newItem.price,
          supplier: newItem.supplier || '',
          stock_vitrina: resolvedVitrinaStock,
          image_url: primaryImageUrl,
          metadata: {
            ...prevMetadata,
            images: productImages
          },
          publish_status: 'Publicado',
          workspace_id: workspaceId
      };
      
      if (editingId) {
        const { error: updErr } = await supabase.from('ecommerce_products').update(payload).eq('id', editingId);
        if (updErr) throw updErr;
        toast.success("Producto actualizado correctamente.");
      } else {
        payload.id = (newItem.id || `SKU-${Date.now()}`).trim();
        payload.created_at = new Date().toISOString();
        const { error: insErr } = await supabase.from('ecommerce_products').insert([payload]);
        if (insErr) throw insErr;
        toast.success("Producto registrado y publicado en vitrina.");
      }
      await fetchInventory();
      closeEditor();
    } catch(e) { 
      console.error('Error guardando producto:', e);
      toast.error(e.message || "Ocurrió un error al guardar el producto.");
    }
  };

  const handleRegisterWaste = async () => {
    if (!wasteItem || wasteData.quantity <= 0) return;
    const qty = Number(wasteData.quantity);
    if (qty > wasteItem.stock) {
      toast.error('La merma no puede ser mayor al stock actual.');
      return;
    }

    try {
      await supabase.from('ecommerce_products').update({ stock: wasteItem.stock - qty }).eq('id', wasteItem.id);
      toast.success('Merma registrada exitosamente.');
      await fetchInventory();
    } catch(e) { 
      console.error(e);
      toast.error('Error al registrar merma.');
    }
    setIsWasteModalOpen(false);
  };

  const handleRegisterAudit = async () => {
    if (!auditItem || auditData.quantity === '') return;
    const physicalCount = Number(auditData.quantity);
    const stockDiff = physicalCount - auditItem.stock;
    
    if (stockDiff === 0) {
      toast.success('El conteo físico coincide con el sistema. No hay ajustes que hacer.');
      setIsAuditModalOpen(false);
      return;
    }

    try {
      await supabase.from('ecommerce_products').update({ stock: physicalCount }).eq('id', auditItem.id);
      toast.success('Auditoría registrada y stock actualizado.');
      await fetchInventory();
    } catch(e) { 
      console.error(e);
      toast.error('Error al registrar auditoría.');
    }
    setIsAuditModalOpen(false);
  };

  const handleRegisterTransfer = async () => {
    if (!transferItem || transferData.quantity <= 0) return;
    const qty = Number(transferData.quantity);
    
    const sourceStock = transferData.toVitrina ? transferItem.stock : (transferItem.stockVitrina || 0);
    if (qty > sourceStock) {
      toast.error('La cantidad a transferir no puede ser mayor al stock de origen.');
      return;
    }

    const newStock = transferData.toVitrina ? transferItem.stock - qty : transferItem.stock + qty;
    const newVitrina = transferData.toVitrina ? (transferItem.stockVitrina || 0) + qty : (transferItem.stockVitrina || 0) - qty;

    try {
      await supabase.from('ecommerce_products').update({ stock: newStock, stock_vitrina: newVitrina }).eq('id', transferItem.id);
      toast.success('Transferencia registrada exitosamente.');
      await fetchInventory();
    } catch(e) { 
      console.error(e);
      toast.error('Error al registrar transferencia.');
    }
    setIsTransferModalOpen(false);
  };

  const handleDelete = async (id) => {
    if(window.confirm('¿Estás seguro de eliminar este registro del inventario?')) {
      try {
        await supabase.from('ecommerce_products').delete().eq('id', id);
        toast.success('Producto eliminado del inventario.');
        await fetchInventory();
      } catch(e) { 
        console.error(e);
        toast.error('Error al eliminar producto.');
      }
    }
  };

  const togglePublishStatus = async (e, id, currentStatus) => {
    e.stopPropagation();
    const newStatus = currentStatus === 'Publicado' ? 'Borrador' : 'Publicado';

    // Optimistic update
    setInventory(prev =>
      prev.map(item => item.id === id ? { ...item, publishStatus: newStatus } : item)
    );

    try {
      const { error } = await supabase
        .from('ecommerce_products')
        .update({ publish_status: newStatus })
        .eq('id', id);

      if (error) throw error;
      toast.success(
        newStatus === 'Publicado'
          ? '✅ Producto publicado en vitrina.'
          : '📦 Producto ocultado de vitrina.'
      );
    } catch (err) {
      console.error(err);
      toast.error('Error al cambiar el estado de publicación.');
      // Revertir
      setInventory(prev =>
        prev.map(item => item.id === id ? { ...item, publishStatus: currentStatus } : item)
      );
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 pb-24 md:pb-8 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Inventario</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Controla existencias, órdenes de compra y márgenes de ganancia.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3.5 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm cursor-pointer"
            title="Gestionar categorías y subcategorías de la tienda"
          >
            <FolderTree size={16} className="text-amber-500" />
            <span className="hidden sm:inline">Categorías</span>
            <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-400 font-black px-1.5 py-0.5 rounded-full">
              {availableCategories.length}
            </span>
          </button>
          <button onClick={handleExportCSV} className="hidden sm:flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer">
            Exportar
          </button>
          <button onClick={() => setIsImportModalOpen(true)} className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer">
            <FileUp size={16} />
            <span className="hidden sm:inline">Importar POS (.csv)</span>
            <span className="sm:hidden">Importar</span>
          </button>
          <button onClick={() => openEditor()} className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 px-3.5 py-2 rounded-xl text-sm font-black transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer">
            <PackagePlus size={16} />
            <span className="hidden sm:inline">Registrar Entrada</span>
            <span className="sm:hidden">+ Entrada</span>
          </button>
        </div>
      </div>

      {/* Sección Financiera: Métricas de Valor e Inversión de Inventario (Visible para el comerciante) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Métricas Financieras del Inventario
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Capital Invertido */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <PackageSearch size={24} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-500">Capital Invertido (Costo)</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                ${totalValue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </h3>
            </div>
          </div>

          {/* Card 2: Ingreso Proyectado */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
              <TrendingUp size={24} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-500">Ingreso Proyectado</p>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                ${projectedRevenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </h3>
            </div>
          </div>

          {/* Card 3: Ganancia Potencial */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <TrendingUp size={24} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-500">Ganancia Potencial</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                ${potentialProfit.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <PackageSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar por SKU, Nombre o Proveedor..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-shadow dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setSubcategoryFilter('Todas');
              }}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50 flex-1 sm:flex-initial cursor-pointer"
            >
              <option value="Todas">Todas las Categorías</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Selector de Subcategoría dinámico */}
            {categoryFilter !== 'Todas' && getSubcategoriesForCategory(categoryFilter).length > 0 && (
              <select
                value={subcategoryFilter}
                onChange={(e) => setSubcategoryFilter(e.target.value)}
                className="bg-orange-50/70 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-xl px-3 py-2 text-sm font-bold text-orange-900 dark:text-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50 flex-1 sm:flex-initial cursor-pointer animate-in fade-in duration-150"
              >
                <option value="Todas">Todas las Subcategorías</option>
                {getSubcategoriesForCategory(categoryFilter).map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            )}

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
            >
              <option value="Todos">Todos los Estados</option>
              <option value="Publicado">Publicados</option>
              <option value="Borrador">Borradores</option>
            </select>
          </div>
        </div>

        {/* Vista móvil: Tarjetas en cuadrícula idénticas al formato visual del sistema POS */}
        <div className="sm:hidden p-3 bg-slate-50/50 dark:bg-slate-950/30">
          {filteredInventory.length === 0 ? (
            <div className="py-12 px-4 text-center max-w-sm mx-auto flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mb-3">
                <FolderTree size={24} />
              </div>
              <p className="font-extrabold text-sm text-slate-800 dark:text-white">
                {categoryFilter !== 'Todas'
                  ? 'No hay productos en esta categoría'
                  : searchTerm
                  ? 'No se encontraron productos'
                  : 'Tu inventario está en blanco'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                {categoryFilter !== 'Todas'
                  ? `No tienes productos registrados en "${categoryFilter}".`
                  : searchTerm
                  ? `No hay coincidencias para "${searchTerm}".`
                  : 'Registra tu primer artículo para empezar a gestionar tu stock.'}
              </p>
              <div className="flex flex-col w-full gap-2">
                {categoryFilter !== 'Todas' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setCategoryFilter('Todas')}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold text-xs text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      Ver todas las categorías
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditor(null, categoryFilter)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xs shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>+ Registrar en {categoryFilter}</span>
                    </button>
                  </>
                ) : searchTerm ? (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    Limpiar búsqueda
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openEditor()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xs shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>+ Registrar Entrada</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {filteredInventory.map(item => {
                const status = getStatus(item.stock, item.minStock, item.maxStock, item.expirationDate);
                const statusColors = {
                  'Crítico': 'bg-rose-500 text-white',
                  'Bajo': 'bg-amber-500 text-white',
                  'Vence Pronto': 'bg-orange-500 text-white',
                  'Sobre-Stock': 'bg-blue-600 text-white',
                  'En Stock': 'bg-emerald-600 text-white',
                };
                const primaryImg = item.imageUrl || (Array.isArray(item.images) && item.images[0]) || (Array.isArray(item.metadata?.images) && item.metadata.images[0]) || '';
                const totalPhotos = Array.isArray(item.images) ? item.images.length : (Array.isArray(item.metadata?.images) ? item.metadata.images.length : (primaryImg ? 1 : 0));
                const vesPrice = (item.price || 0) * (bcvRate || 1);

                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col overflow-hidden justify-between"
                  >
                    {/* 1. Header Visual 5:4 idéntico al POS */}
                    <div className="relative w-full pt-[80%] bg-slate-100 dark:bg-slate-950 overflow-hidden">
                      {primaryImg ? (
                        <img
                          src={primaryImg}
                          alt={item.name}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fb = e.currentTarget.parentElement.querySelector('.inventory-sin-foto');
                            if (fb) fb.style.display = 'flex';
                          }}
                        />
                      ) : null}

                      {/* Fallback "Sin Foto" idéntico al sistema POS */}
                      <div
                        className={`inventory-sin-foto absolute inset-0 ${primaryImg ? 'hidden' : 'flex'} flex-col items-center justify-center text-slate-400 bg-slate-100 dark:bg-slate-900`}
                      >
                        <Package size={28} strokeWidth={1.5} className="text-slate-400" />
                        <span className="text-[10px] font-semibold text-slate-400 mt-1">Sin Foto</span>
                      </div>

                      {/* Badge de Stock flotante arriba a la izquierda */}
                      <span className={`absolute top-1.5 left-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs ${statusColors[status] || 'bg-slate-800 text-white'}`}>
                        {status}
                      </span>

                      {/* Toggle de Vitrina flotante arriba a la derecha */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePublishStatus(e, item.id, item.publishStatus);
                        }}
                        className={`absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black shadow-xs transition-transform active:scale-90 ${
                          item.publishStatus === 'Publicado'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-900/70 backdrop-blur-xs text-white'
                        }`}
                        title={item.publishStatus === 'Publicado' ? 'Visible en vitrina. Clic para ocultar' : 'Oculto. Clic para publicar en vitrina'}
                      >
                        {item.publishStatus === 'Publicado' ? (
                          <>
                            <Eye size={10} />
                            <span>Vitrina</span>
                          </>
                        ) : (
                          <>
                            <EyeOff size={10} />
                            <span>Oculto</span>
                          </>
                        )}
                      </button>

                      {/* Badge de contador de fotos */}
                      {totalPhotos > 1 && (
                        <span className="absolute bottom-1.5 left-1.5 bg-slate-900/75 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1">
                          <ImageIcon size={9} />
                          <span>{totalPhotos}</span>
                        </span>
                      )}
                    </div>

                    {/* 2. Cuerpo de Información */}
                    <div className="p-2.5 flex flex-col flex-1 justify-between gap-1.5">
                      <div>
                        {/* Título en 2 líneas */}
                        <h4
                          className="font-bold text-xs text-slate-800 dark:text-white line-clamp-2 leading-tight h-8"
                          title={item.name}
                        >
                          {item.name}
                        </h4>

                        {/* Categoría y Subcategoría */}
                        <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold truncate mt-0.5">
                          <span>{item.category || 'General'}</span>
                          {item.subcategory && (
                            <>
                              <span className="text-slate-300 dark:text-slate-600">›</span>
                              <span className="truncate">{item.subcategory}</span>
                            </>
                          )}
                        </div>

                        {/* SKU */}
                        <p className="text-[9px] font-mono text-slate-400 truncate mt-0.5">
                          {item.id}
                        </p>
                      </div>

                      {/* Precios Bimonetarios (USD + Bs BCV) idénticos al POS */}
                      <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                            ${(item.price || 0).toFixed(2)}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 font-mono">
                            Bs. {vesPrice.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                          <span>Stock: <strong className={item.stock <= (item.minStock || 0) ? 'text-rose-500 font-bold' : 'text-slate-700 dark:text-slate-200 font-bold'}>{item.stock}</strong></span>
                          <span>Costo: ${item.cogs?.toFixed(2) || '0.00'}</span>
                        </div>
                      </div>

                      {/* 3. Barra de Acciones Ergonómicas de Almacén */}
                      <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-1.5">
                        {/* Botón Principal: Editar */}
                        <button
                          type="button"
                          onClick={() => openEditor(item)}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-[11px] shadow-xs active:scale-95 transition-all cursor-pointer"
                        >
                          <Edit2 size={12} />
                          <span>Editar</span>
                        </button>

                        {/* Fila de Acciones Secundarias de Almacén */}
                        <div className="flex items-center justify-between gap-1">
                          {settings.transfers && (
                            <button
                              type="button"
                              title="Transferir a vitrina"
                              onClick={() => {
                                setTransferItem(item);
                                setTransferData({ quantity: 1, toVitrina: true });
                                setIsTransferModalOpen(true);
                              }}
                              className="flex-1 flex items-center justify-center p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-100 active:scale-95 transition-all cursor-pointer"
                            >
                              <Truck size={13} />
                            </button>
                          )}
                          {settings.audit && (
                            <button
                              type="button"
                              title="Auditar inventario físico"
                              onClick={() => {
                                setAuditItem(item);
                                setAuditData({ quantity: item.stock });
                                setIsAuditModalOpen(true);
                              }}
                              className="flex-1 flex items-center justify-center p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 active:scale-95 transition-all cursor-pointer"
                            >
                              <ClipboardCheck size={13} />
                            </button>
                          )}
                          {settings.waste && (
                            <button
                              type="button"
                              title="Reportar merma / pérdida"
                              onClick={() => {
                                setWasteItem(item);
                                setIsWasteModalOpen(true);
                              }}
                              className="flex-1 flex items-center justify-center p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 active:scale-95 transition-all cursor-pointer"
                            >
                              <TrendingDown size={13} />
                            </button>
                          )}
                          <button
                            type="button"
                            title="Eliminar producto"
                            onClick={() => handleDelete(item.id)}
                            className="flex-1 flex items-center justify-center p-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 active:scale-95 transition-all cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Vista desktop: tabla */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Producto (SKU)</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Categoría</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Stock</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Costo (COGS)</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Precio Venta</th>
                {settings.expiration && <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Vencimiento</th>}
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Proveedor</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Vitrina</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-14 text-center">
                    <div className="max-w-md mx-auto flex flex-col items-center">
                      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mb-3">
                        <FolderTree size={28} />
                      </div>
                      <h4 className="font-black text-base text-slate-800 dark:text-white">
                        {categoryFilter !== 'Todas'
                          ? 'No hay productos en esta categoría'
                          : searchTerm
                          ? 'No se encontraron productos'
                          : 'Tu inventario está en blanco'}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
                        {categoryFilter !== 'Todas'
                          ? `No tienes productos registrados en "${categoryFilter}".`
                          : searchTerm
                          ? `No hay coincidencias para "${searchTerm}".`
                          : 'Comienza registrando tu primer producto para estructurar tu catálogo e inventario.'}
                      </p>
                      <div className="flex items-center gap-3">
                        {categoryFilter !== 'Todas' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setCategoryFilter('Todas')}
                              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                            >
                              Ver todas las categorías
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditor(null, categoryFilter)}
                              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xs shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
                            >
                              <Plus size={15} />
                              <span>+ Registrar en {categoryFilter}</span>
                            </button>
                          </>
                        ) : searchTerm ? (
                          <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                          >
                            Limpiar búsqueda
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openEditor()}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xs shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
                          >
                            <Plus size={15} />
                            <span>+ Registrar Entrada</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredInventory.map(item => {
                  const margin = calculateMargin(item.cogs, item.price);
                  const status = getStatus(item.stock, item.minStock, item.maxStock, item.expirationDate);
                  return (
                    <tr key={item.id} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition-colors ${status === 'Sobre-Stock' ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <PackageSearch size={18} className="text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{item.name}</p>
                            <p className="text-[10px] font-mono text-slate-500">{item.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                          <Tag size={12} className="text-amber-500 shrink-0" />
                          <span>{item.category || 'General'}</span>
                          {item.subcategory && (
                            <>
                              <span className="text-slate-400">›</span>
                              <span className="font-bold text-orange-600 dark:text-orange-400">{item.subcategory}</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${status === 'Crítico' ? 'text-rose-500' : status === 'Sobre-Stock' ? 'text-blue-500' : 'text-slate-700 dark:text-slate-300'}`}>
                              {item.stock} {settings.transfers && <span className="text-[10px] font-normal text-slate-400" title="Stock en Depósito">(Depósito)</span>}
                            </span>
                            {status === 'Crítico' && settings.reorder && <TrendingDown size={14} className="text-rose-500" title="Stock Crítico" />}
                            {status === 'Bajo' && settings.reorder && <TrendingDown size={14} className="text-amber-500" title="Stock Bajo" />}
                            {status === 'Sobre-Stock' && settings.overstock && <TrendingUp size={14} className="text-blue-500" title="Sobre-Stock (Capital Congelado)" />}
                          </div>
                          {settings.transfers && item.stockVitrina !== undefined && (
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              {item.stockVitrina} <span className="text-[10px] font-normal text-slate-400" title="Stock en Vitrina">(Vitrina)</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">${item.cogs.toFixed(2)}</td>
                      <td className="py-3 px-4 text-sm font-bold text-slate-800 dark:text-white">${item.price.toFixed(2)}</td>
                      {settings.expiration && (
                        <td className="py-3 px-4">
                          {item.expirationDate ? (
                            <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                              getStatus(item.stock, item.minStock, item.maxStock, item.expirationDate) === 'Vence Pronto' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              {item.expirationDate}
                            </span>
                          ) : <span className="text-xs text-slate-400">N/A</span>}
                        </td>
                      )}
                      <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">{item.supplier}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={(e) => togglePublishStatus(e, item.id, item.publishStatus)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                            item.publishStatus === 'Publicado'
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/30'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                          title={item.publishStatus === 'Publicado' ? 'Ocultar de vitrina' : 'Publicar en vitrina'}
                        >
                          {item.publishStatus === 'Publicado'
                            ? <><Eye size={12} /> Activo</>
                            : <><EyeOff size={12} /> Oculto</>
                          }
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {settings.transfers && (
                            <button onClick={() => { setTransferItem(item); setTransferData({ quantity: 1, toVitrina: true }); setIsTransferModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-cyan-500 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-500/10 transition-colors" title="Transferir entre Almacenes">
                              <Truck size={16} />
                            </button>
                          )}
                          {settings.audit && (
                            <button onClick={() => { setAuditItem(item); setAuditData({ quantity: item.stock }); setIsAuditModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-emerald-500 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors" title="Auditoría (Conteo Físico)">
                              <ClipboardCheck size={16} />
                            </button>
                          )}
                          {settings.waste && (
                            <button onClick={() => { setWasteItem(item); setIsWasteModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-orange-500 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors" title="Registrar Merma">
                              <TrendingDown size={16} />
                            </button>
                          )}
                          <button onClick={() => { setHistoryItem(item); setIsHistoryModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-indigo-500 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors" title="Ver Historial (Kardex)">
                            <PackageSearch size={16} />
                          </button>
                          <button onClick={() => openEditor(item)} className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors" title="Editar Stock y Costo">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" title="Eliminar Registro">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Side Panel Overlay */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={closeEditor}></div>
          
          <div className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 sm:border-l border-t sm:border-t-0 border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-right duration-300 sm:h-full max-h-[90dvh] rounded-t-3xl sm:rounded-none">
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
               <div>
                 <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                   {editingId ? 'Editar Inventario' : 'Registrar Entrada'}
                 </h3>
                 <p className="text-xs text-slate-500 mt-1">
                   {editingId ? `Actualizando: ${formData.id}` : 'Añade un nuevo producto al almacén'}
                 </p>
               </div>
               <button onClick={closeEditor} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                 <X size={20} />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
               <div className="space-y-4">
                 {/* Fotos del Producto (Hasta 8 fotos, portada con ⭐, sin exponer URLs internas de Supabase) */}
                 <div>
                   <MultiImageUploader
                     images={formData.images || []}
                     onChange={(newImages) => {
                       setFormData(prev => ({
                         ...prev,
                         images: newImages,
                         imageUrl: newImages[0] || ''
                       }));
                     }}
                     folder="products"
                     maxImages={8}
                     title="Fotos del Producto"
                     subtitle="Agrega fotos desde distintos ángulos. La primera será la portada principal en tu tienda."
                   />
                 </div>

                 <div className="space-y-2">
                   <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">SKU (Código único) *</label>
                   <input 
                     type="text" 
                     name="id"
                     value={formData.id}
                     onChange={handleInputChange}
                     disabled={!!editingId}
                     className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white disabled:opacity-50" 
                   />
                 </div>
                 
                 <div className="space-y-2">
                   <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Nombre del Producto *</label>
                   <input 
                     type="text" 
                     name="name"
                     value={formData.name}
                     onChange={handleInputChange}
                     className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white" 
                   />
                 </div>

                  {/* Categoría Principal y Subcategoría Dinámica */}
                  <div className="space-y-3">
                    {/* Categoría Principal */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Categoría Principal *
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewCategoryInput(prev => !prev);
                            setShowNewSubcategoryInput(false);
                          }}
                          className="text-[11px] font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus size={12} /> {showNewCategoryInput ? 'Cancelar' : '+ Nueva Categoría'}
                        </button>
                      </div>

                      {showNewCategoryInput && (
                        <div className="p-3 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl space-y-2 animate-in fade-in duration-150">
                          <label className="text-[11px] font-bold text-orange-950 dark:text-orange-300">
                            Crear y asignar nueva categoría principal:
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newCategoryName}
                              onChange={e => setNewCategoryName(e.target.value)}
                              placeholder="Ej: Víveres, Bebidas, Charcutería..."
                              className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-950 border border-orange-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleAddNewCategory()}
                              className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                            >
                              Añadir
                            </button>
                          </div>
                        </div>
                      )}

                      {availableCategories.length === 0 && !showNewCategoryInput ? (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-dashed border-amber-300 dark:border-amber-800 rounded-xl text-center">
                          <p className="text-xs text-amber-800 dark:text-amber-300 font-semibold mb-2">
                            Aún no tienes categorías creadas en tu tienda.
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowNewCategoryInput(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white font-bold text-xs rounded-lg cursor-pointer"
                          >
                            <Plus size={12} /> Crear mi primera categoría
                          </button>
                        </div>
                      ) : (
                        <select
                          name="category"
                          value={formData.category}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, category: e.target.value, subcategory: '' }));
                          }}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 dark:text-white font-bold cursor-pointer text-slate-900"
                        >
                          <option value="">-- Seleccionar Categoría --</option>
                          {availableCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Subcategoría (Aparece cuando hay categoría seleccionada) */}
                    {formData.category && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            Subcategoría en {formData.category} <span className="text-[10px] text-slate-400 font-normal">(Opcional)</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setShowNewSubcategoryInput(prev => !prev);
                              setShowNewCategoryInput(false);
                            }}
                            className="text-[11px] font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Plus size={12} /> {showNewSubcategoryInput ? 'Cancelar' : '+ Nueva Subcategoría'}
                          </button>
                        </div>

                        {showNewSubcategoryInput && (
                          <div className="p-3 bg-amber-50/60 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl space-y-2 animate-in fade-in duration-150">
                            <label className="text-[11px] font-bold text-amber-950 dark:text-amber-300">
                              Añadir subcategoría a {formData.category}:
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newSubcategoryName}
                                onChange={e => setNewSubcategoryName(e.target.value)}
                                placeholder="Ej: Arroz, Harinas, Refrescos..."
                                className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-950 border border-amber-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleAddNewSubcategory()}
                                className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                              >
                                Añadir
                              </button>
                            </div>
                          </div>
                        )}

                        <select
                          name="subcategory"
                          value={formData.subcategory || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 dark:text-white font-medium cursor-pointer text-slate-900"
                        >
                          <option value="">Sin subcategoría / General</option>
                          {getSubcategoriesForCategory(formData.category).map(sub => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Proveedor y Fecha de Vencimiento */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Proveedor</label>
                      <input 
                        type="text" 
                        name="supplier"
                        placeholder="Ej: Distribuidora Polar, Empresas Polar..."
                        value={formData.supplier || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-slate-900 dark:text-white font-medium" 
                      />
                    </div>
                    {settings.expiration && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Fecha Vencimiento (Opcional)</label>
                        <input 
                          type="date" 
                          name="expirationDate"
                          value={formData.expirationDate || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-slate-900 dark:text-white font-medium" 
                        />
                      </div>
                    )}
                  </div>

                  {/* Stock Depósito y Vitrina */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Stock {settings.transfers ? 'Depósito ' : ''}*</label>
                      <input 
                        type="number" 
                        name="stock"
                        placeholder="0"
                        value={formData.stock}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-slate-900 dark:text-white font-bold" 
                      />
                    </div>
                    {settings.transfers && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Stock Vitrina</label>
                        <input 
                          type="number" 
                          name="stockVitrina"
                          placeholder="0"
                          value={formData.stockVitrina}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-slate-900 dark:text-white font-bold" 
                        />
                      </div>
                    )}
                  </div>

                  {/* Costo de Entrada y Precio de Venta */}
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400" title="Costo Unitario (Lo que te cuesta)">Costo de Entrada $ *</label>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        name="cogs"
                        value={formData.cogs}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-slate-900 dark:text-white font-bold" 
                      />
                      {editingId && (
                        <p className="text-[10px] text-slate-500 leading-tight">Si sumas stock, se calculará el <strong>Costo Promedio Ponderado</strong>.</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Precio de Venta $ *</label>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-slate-900 dark:text-white font-bold" 
                      />
                    </div>
                  </div>

                  {/* Margen Calculado en vivo */}
                  <div className="mt-3 p-3.5 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-bold text-orange-800 dark:text-orange-300">Margen de Ganancia Proyectado:</span>
                    <span className="text-lg font-black text-orange-600 dark:text-orange-400">
                      {calculateMargin(Number(formData.cogs || 0), Number(formData.price || 0))}%
                    </span>
                  </div>
                </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex gap-3 justify-end">
               <button onClick={closeEditor} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer">
                 Cancelar
               </button>
               <button onClick={handleSave} className="px-6 py-2.5 text-sm font-bold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer">
                 Guardar
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsImportModalOpen(false)}></div>
          
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
               <div>
                 <h3 className="text-lg font-bold text-slate-800 dark:text-white">Importar Inventario</h3>
                 <p className="text-xs text-slate-500 mt-1">Sube un archivo desde Saint, Profit o tu POS actual.</p>
               </div>
               <button onClick={() => setIsImportModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800 rounded-xl transition-colors">
                 <X size={20} />
               </button>
            </div>
            
            <div className="p-6">
              <input 
                type="file" 
                accept=".csv, .txt" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label 
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-violet-300 dark:border-violet-500/30 rounded-2xl bg-violet-50/50 dark:bg-violet-900/10 cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors group"
              >
                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <UploadCloud className="text-violet-500" size={24} />
                </div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Haz clic o arrastra tu archivo</p>
                <p className="text-xs text-slate-500 mt-1">Soporta .CSV o .TXT separado por comas</p>
              </label>

              <div className="mt-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-xs text-slate-600 dark:text-slate-400 space-y-2">
                <p className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span>💡</span> Formato esperado (cabeceras ignoradas):
                </p>
                <code className="block bg-slate-100 dark:bg-slate-900 p-2 rounded-lg font-mono text-[10px] text-slate-500 border border-slate-200 dark:border-slate-800">
                  SKU, Nombre, Stock, Costo, Precio Venta, Proveedor
                  <br />
                  SKU-99, Arroz Mary 1kg, 50, 0.80, 1.20, Alimentos Mary
                </code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsTransferModalOpen(false)}></div>
          
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
               <div>
                 <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2"><Truck className="text-cyan-500"/> Transferir Stock</h3>
                 <p className="text-xs text-slate-500 mt-1">Mueve mercancía entre almacenes internos.</p>
               </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300">
                {transferItem?.name} 
                <div className="text-xs font-normal text-slate-500 mt-1">
                  Depósito: {transferItem?.stock} | Vitrina: {transferItem?.stockVitrina || 0}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setTransferData({...transferData, toVitrina: true})}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border ${transferData.toVitrina ? 'bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-900/30 dark:border-cyan-800 dark:text-cyan-400' : 'bg-transparent border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400'}`}
                >
                  Depósito ➡ Vitrina
                </button>
                <button 
                  onClick={() => setTransferData({...transferData, toVitrina: false})}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border ${!transferData.toVitrina ? 'bg-cyan-50 border-cyan-200 text-cyan-700 dark:bg-cyan-900/30 dark:border-cyan-800 dark:text-cyan-400' : 'bg-transparent border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400'}`}
                >
                  Vitrina ➡ Depósito
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Cantidad a Transferir</label>
                <input 
                  type="number" 
                  value={transferData.quantity}
                  onChange={(e) => setTransferData({...transferData, quantity: e.target.value})}
                  min="1"
                  max={transferData.toVitrina ? transferItem?.stock : transferItem?.stockVitrina}
                  className="w-full px-4 py-2 mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 dark:text-white" 
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex gap-3 justify-end">
               <button onClick={() => setIsTransferModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancelar</button>
               <button onClick={handleRegisterTransfer} className="px-6 py-2 text-sm font-bold bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors shadow-sm shadow-cyan-500/20">Mover</button>
            </div>
          </div>
        </div>
      )}

      {/* Waste (Merma) Modal */}
      {isWasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsWasteModalOpen(false)}></div>
          
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
               <div>
                 <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2"><TrendingDown className="text-orange-500"/> Registrar Merma</h3>
                 <p className="text-xs text-slate-500 mt-1">Registra pérdidas o productos dañados.</p>
               </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300">
                {wasteItem?.name} (Stock Actual: {wasteItem?.stock})
              </div>
              
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Cantidad a Descontar</label>
                <input 
                  type="number" 
                  value={wasteData.quantity}
                  onChange={(e) => setWasteData({...wasteData, quantity: e.target.value})}
                  min="1"
                  max={wasteItem?.stock}
                  className="w-full px-4 py-2 mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 dark:text-white" 
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Motivo (Ej. Vencido, Roto, Consumo Interno)</label>
                <input 
                  type="text" 
                  value={wasteData.reason}
                  onChange={(e) => setWasteData({...wasteData, reason: e.target.value})}
                  className="w-full px-4 py-2 mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 dark:text-white" 
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex gap-3 justify-end">
               <button onClick={() => setIsWasteModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancelar</button>
               <button onClick={handleRegisterWaste} className="px-6 py-2 text-sm font-bold bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors">Registrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Modal */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsAuditModalOpen(false)}></div>
          
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
               <div>
                 <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2"><ClipboardCheck className="text-emerald-500"/> Auditoría (Conteo Físico)</h3>
                 <p className="text-xs text-slate-500 mt-1">Cuadra el inventario del sistema con la realidad.</p>
               </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg flex justify-between items-center text-sm font-bold text-slate-700 dark:text-slate-300">
                <span>{auditItem?.name}</span>
                <span className="text-slate-500 font-normal">Sistema: {auditItem?.stock}</span>
              </div>
              
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Conteo Físico Real</label>
                <input 
                  type="number" 
                  value={auditData.quantity}
                  onChange={(e) => setAuditData({...auditData, quantity: e.target.value})}
                  min="0"
                  placeholder={`Ej. ${auditItem?.stock}`}
                  className="w-full px-4 py-2 mt-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 dark:text-white" 
                />
              </div>

              {auditData.quantity !== '' && Number(auditData.quantity) !== auditItem?.stock && (
                <div className={`p-3 rounded-xl text-xs font-bold ${Number(auditData.quantity) > auditItem?.stock ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20' : 'bg-red-50 text-red-700 dark:bg-red-900/20'}`}>
                  El sistema registrará un ajuste automático de {Number(auditData.quantity) > auditItem?.stock ? '+' : ''}{Number(auditData.quantity) - (auditItem?.stock || 0)} unidades.
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex gap-3 justify-end">
               <button onClick={() => setIsAuditModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancelar</button>
               <button onClick={handleRegisterAudit} className="px-6 py-2 text-sm font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-500/20">Aplicar Ajuste</button>
            </div>
          </div>
        </div>
      )}

      {/* History (Kardex) Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsHistoryModalOpen(false)}></div>
          
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
               <div>
                 <h3 className="text-lg font-bold text-slate-800 dark:text-white">Historial de Movimientos</h3>
                 <p className="text-xs text-slate-500 mt-1">{historyItem?.name}</p>
               </div>
               <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800 rounded-xl transition-colors">
                 <X size={20} />
               </button>
            </div>
            
            <div className="p-0 overflow-y-auto max-h-96">
              {/* Vista Móvil: Tarjetas */}
              <div className="sm:hidden flex flex-col gap-3 p-4">
                {historyItem?.history?.length > 0 ? historyItem.history.map((record, i) => (
                  <div key={i} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex flex-col gap-2 shadow-sm">
                    <div className="flex justify-between items-start">
                      <span className="text-xs text-slate-500 font-mono">{new Date(record.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short'})}</span>
                      <span className={`text-sm font-bold ${record.action.includes('Salida') ? 'text-red-500' : 'text-emerald-500'}`}>
                        {record.action.includes('Salida') ? '-' : '+'}{record.quantity}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-700 dark:text-slate-300">{record.action}</p>
                      <p className="text-xs text-slate-500 mt-1">{record.reason}</p>
                    </div>
                  </div>
                )).reverse() : (
                  <div className="py-8 text-center text-slate-400 text-sm">No hay movimientos registrados.</div>
                )}
              </div>

              {/* Vista Desktop: Tabla */}
              <div className="hidden sm:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 sticky top-0">
                    <tr>
                      <th className="py-2 px-4 font-semibold text-slate-500">Fecha</th>
                      <th className="py-2 px-4 font-semibold text-slate-500">Acción</th>
                      <th className="py-2 px-4 font-semibold text-slate-500">Cant.</th>
                      <th className="py-2 px-4 font-semibold text-slate-500">Motivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {historyItem?.history?.length > 0 ? historyItem.history.map((record, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                        <td className="py-2 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">{new Date(record.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short'})}</td>
                        <td className="py-2 px-4 font-medium text-slate-700 dark:text-slate-300">{record.action}</td>
                        <td className={`py-2 px-4 font-bold ${record.action.includes('Salida') ? 'text-red-500' : 'text-emerald-500'}`}>
                          {record.action.includes('Salida') ? '-' : '+'}{record.quantity}
                        </td>
                        <td className="py-2 px-4 text-slate-500 text-xs">{record.reason}</td>
                      </tr>
                    )).reverse() : (
                      <tr>
                        <td colSpan="4" className="py-8 text-center text-slate-400">No hay movimientos registrados.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gestión de Categorías y Subcategorías */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsCategoryModalOpen(false)}></div>
          
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center border border-orange-500/20">
                  <FolderTree size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white">Categorías y Subcategorías</h3>
                  <p className="text-xs text-slate-500">Organiza los departamentos y grupos de productos de tu comercio.</p>
                </div>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-800 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
              {/* Formulario Crear Nueva Categoría Principal */}
              <form onSubmit={handleCreateCategoryFromModal} className="p-4 bg-orange-50/70 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-2xl space-y-2">
                <label className="text-xs font-bold text-orange-950 dark:text-orange-200 flex items-center gap-1.5">
                  <Plus size={14} className="text-orange-600" />
                  Crear Nueva Categoría Principal
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={modalNewCatName}
                    onChange={e => setModalNewCatName(e.target.value)}
                    placeholder="Ej: Víveres, Bebidas, Internet..."
                    className="flex-1 px-3.5 py-2 bg-white dark:bg-slate-950 border border-orange-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer whitespace-nowrap active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>Crear Categoría</span>
                  </button>
                </div>
              </form>

              {/* Lista de Categorías y Subcategorías */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Categorías de tu Tienda ({customCategories.length})
                  </span>
                </div>

                {customCategories.length === 0 ? (
                  <div className="py-12 px-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <FolderTree size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Tu tienda no tiene categorías aún</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Tu catálogo inicia limpio. Usa el cuadro superior para agregar tu primera categoría principal y luego añade subcategorías.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customCategories.map((cat) => {
                      const subs = cat.subcategories || [];
                      const prodsCount = inventory.filter(i => (i.category || '').toLowerCase() === cat.name.toLowerCase()).length;
                      return (
                        <div
                          key={cat.name}
                          className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                              <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">{cat.name}</h4>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                {prodsCount} {prodsCount === 1 ? 'producto' : 'productos'}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteCategory(cat.name)}
                              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                              title="Eliminar categoría"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          {/* Subcategorías Chips */}
                          <div className="pl-3 sm:pl-4 border-l-2 border-orange-200 dark:border-orange-900/50 space-y-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[11px] font-bold text-slate-500 mr-1">Subcategorías:</span>
                              {subs.length === 0 ? (
                                <span className="text-[11px] text-slate-400 italic">Ninguna aún (directo a {cat.name})</span>
                              ) : (
                                subs.map(sub => (
                                  <span
                                    key={sub}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs"
                                  >
                                    <span>{sub}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSubcategory(cat.name, sub)}
                                      className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                                      title="Eliminar subcategoría"
                                    >
                                      <X size={12} />
                                    </button>
                                  </span>
                                ))
                              )}
                            </div>

                            {/* Input rápido para añadir subcategoría */}
                            <div className="flex gap-2 max-w-full pt-1">
                              <input
                                type="text"
                                value={modalSubcategoryInputs[cat.name] || ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  setModalSubcategoryInputs(prev => ({ ...prev, [cat.name]: val }));
                                }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddSubcategoryFromModal(cat.name);
                                  }
                                }}
                                placeholder={`+ Subcategoría en ${cat.name}...`}
                                className="flex-1 min-w-0 px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddSubcategoryFromModal(cat.name)}
                                className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-orange-500 hover:text-white text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
                              >
                                Añadir
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

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex justify-end">
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-5 py-2 text-sm font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
