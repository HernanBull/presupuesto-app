import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageSearch, TrendingDown, TrendingUp, Truck, PackagePlus, Edit2, Trash2, X, CheckCircle, FileUp, UploadCloud, ClipboardCheck } from 'lucide-react';

const initialInventory = [];

export default function InventoryManager() {
  const navigate = useNavigate();
  const [inventory, setInventory] = useState(initialInventory);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [settings, setSettings] = useState({
    waste: true,
    expiration: true,
    audit: true,
    transfers: true,
    combos: true,
    overstock: true,
    reorder: true
  });

  const fetchInventory = async () => {
    try {
      const workspaceId = localStorage.getItem('activeWorkspace');
      if (!workspaceId) {
        window.location.reload();
        return;
      }
      const res = await fetch(`http://localhost:3001/api/ecommerce/products?workspace_id=${workspaceId}`);
      const data = await res.json();
      if (!data.error) {
        setInventory(data.map(p => ({
          ...p,
          stock: p.stock || 0,
          cogs: p.cogs || 0,
          minStock: p.min_stock || 5,
          maxStock: p.max_stock || '',
          supplier: p.supplier || '',
          stockVitrina: p.stock_vitrina || 0
        })));
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

  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const [shoppingList, setShoppingList] = useState({});

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
      
      let importedCount = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const separator = line.includes(';') ? ';' : ',';
        const cols = line.split(separator);
        
        if (cols.length >= 5) {
          if (isNaN(parseFloat(cols[2])) || isNaN(parseFloat(cols[3]))) continue; 
          const item = {
            id: cols[0].trim(),
            name: cols[1].trim(),
            stock: Number(cols[2].trim()),
            cogs: Number(cols[3].trim()),
            price: Number(cols[4].trim()),
            supplier: cols[5] ? cols[5].trim() : 'Sistema POS Importado',
            min_stock: 5,
            workspace_id: workspaceId
          };
          try {
            await fetch('http://localhost:3001/api/ecommerce/products', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item)
            });
            importedCount++;
          } catch(e) { console.error(e) }
        }
      }

      if (importedCount > 0) {
        alert(`Se importaron ${importedCount} productos exitosamente.`);
        fetchInventory();
      } else {
        alert("No se detectaron productos válidos. Asegúrate de que el archivo tenga columnas separadas por comas o punto y coma (SKU, Nombre, Stock, Costo, Precio).");
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

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    const headers = ["SKU", "Nombre", "Stock", "Stock Minimo", "Costo", "Precio", "Proveedor"];
    const rows = inventory.map(i => [
      i.id, i.name, i.stock, i.minStock || 5, i.cogs, i.price, i.supplier
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

  const generateShoppingList = () => {
    const list = {};
    inventory.forEach(item => {
      const min = item.minStock || 5;
      if (item.stock <= min) {
        const sup = item.supplier || 'Sin Proveedor';
        if (!list[sup]) list[sup] = [];
        list[sup].push({ ...item, qtyToOrder: min * 2 - item.stock });
      }
    });
    setShoppingList(list);
    setIsShoppingListOpen(true);
  };

  const openEditor = (item = null) => {
    if (item) {
      setEditingId(item.id);
      setFormData({ ...item });
    } else {
      setEditingId(null);
      setFormData({
        id: `SKU-00${inventory.length + 1}`,
        name: '',
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
      alert("Por favor llena todos los campos numéricos y de texto requeridos.");
      return;
    }

    const newItem = {
      ...formData,
      stock: Number(formData.stock),
      stockVitrina: formData.stockVitrina ? Number(formData.stockVitrina) : 0,
      minStock: Number(formData.minStock),
      maxStock: formData.maxStock ? Number(formData.maxStock) : '',
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
      const method = editingId ? 'PATCH' : 'POST';
      const url = editingId 
        ? `http://localhost:3001/api/ecommerce/products/${editingId}` 
        : 'http://localhost:3001/api/ecommerce/products';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newItem.id,
          name: newItem.name,
          stock: newItem.stock,
          cogs: newItem.cogs,
          price: newItem.price,
          min_stock: newItem.minStock,
          max_stock: newItem.maxStock || null,
          supplier: newItem.supplier,
          stock_vitrina: newItem.stockVitrina,
          workspace_id: workspaceId
        })
      });
      await fetchInventory();
    } catch(e) { console.error(e) }
    closeEditor();
  };

  const handleRegisterWaste = async () => {
    if (!wasteItem || wasteData.quantity <= 0) return;
    const qty = Number(wasteData.quantity);
    if (qty > wasteItem.stock) {
      alert('La merma no puede ser mayor al stock actual.');
      return;
    }

    try {
      await fetch(`http://localhost:3001/api/ecommerce/products/${wasteItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: wasteItem.stock - qty })
      });
      await fetchInventory();
    } catch(e) { console.error(e) }
    setIsWasteModalOpen(false);
  };

  const handleRegisterAudit = async () => {
    if (!auditItem || auditData.quantity === '') return;
    const physicalCount = Number(auditData.quantity);
    const stockDiff = physicalCount - auditItem.stock;
    
    if (stockDiff === 0) {
      alert('El conteo físico coincide con el sistema. No hay ajustes que hacer.');
      setIsAuditModalOpen(false);
      return;
    }

    try {
      await fetch(`http://localhost:3001/api/ecommerce/products/${auditItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: physicalCount })
      });
      await fetchInventory();
    } catch(e) { console.error(e) }
    setIsAuditModalOpen(false);
  };

  const handleRegisterTransfer = async () => {
    if (!transferItem || transferData.quantity <= 0) return;
    const qty = Number(transferData.quantity);
    
    const sourceStock = transferData.toVitrina ? transferItem.stock : (transferItem.stockVitrina || 0);
    if (qty > sourceStock) {
      alert('La cantidad a transferir no puede ser mayor al stock de origen.');
      return;
    }

    const newStock = transferData.toVitrina ? transferItem.stock - qty : transferItem.stock + qty;
    const newVitrina = transferData.toVitrina ? (transferItem.stockVitrina || 0) + qty : (transferItem.stockVitrina || 0) - qty;

    try {
      await fetch(`http://localhost:3001/api/ecommerce/products/${transferItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock, stock_vitrina: newVitrina })
      });
      await fetchInventory();
    } catch(e) { console.error(e) }
    setIsTransferModalOpen(false);
  };

  const handleDelete = async (id) => {
    if(window.confirm('¿Estás seguro de eliminar este registro del inventario?')) {
      try {
        await fetch(`http://localhost:3001/api/ecommerce/products/${id}`, { method: 'DELETE' });
        await fetchInventory();
      } catch(e) { console.error(e) }
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 pb-24 md:pb-8 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Logística e Inventario</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Controla existencias, órdenes de compra y márgenes de ganancia.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleExportCSV} className="hidden sm:flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm">
            Exportar
          </button>
          <button onClick={() => setIsImportModalOpen(true)} className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm">
            <FileUp size={16} />
            <span className="hidden sm:inline">Importar POS (.csv)</span>
            <span className="sm:hidden">Importar</span>
          </button>
          <button onClick={() => navigate('/ecommerce/product-studio')} className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-violet-500/20">
            <PackagePlus size={16} />
            <span className="hidden sm:inline">Registrar Entrada</span>
            <span className="sm:hidden">+ Entrada</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <PackageSearch size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Capital Invertido (Costo)</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">${totalValue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Ingreso Proyectado</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">${projectedRevenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Ganancia Potencial</p>
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">${potentialProfit.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
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
          {settings.reorder && (
            <button onClick={generateShoppingList} className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm">
              Generar Pedidos
            </button>
          )}
        </div>

        {/* Vista móvil: tarjetas */}
        <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredInventory.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-sm">No se encontraron registros.</div>
          ) : (
            filteredInventory.map(item => {
              const status = getStatus(item.stock, item.minStock, item.maxStock, item.expirationDate);
              const statusColors = {
                'Crítico': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
                'Bajo': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                'Vence Pronto': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                'Sobre-Stock': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                'En Stock': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
              };
              return (
                <div key={item.id} className="p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{item.name}</p>
                      <p className="text-[10px] font-mono text-slate-500 mt-0.5">{item.id}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 ${statusColors[status] || ''}`}>{status}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2">
                      <p className="text-[10px] text-slate-500 mb-0.5">Stock</p>
                      <p className={`text-sm font-bold ${status === 'Crítico' ? 'text-rose-500' : 'text-slate-800 dark:text-white'}`}>{item.stock}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2">
                      <p className="text-[10px] text-slate-500 mb-0.5">Costo</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">${item.cogs.toFixed(2)}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2">
                      <p className="text-[10px] text-slate-500 mb-0.5">Precio</p>
                      <p className="text-sm font-bold text-violet-600 dark:text-violet-400">${item.price.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {settings.transfers && (
                      <button onClick={() => { setTransferItem(item); setTransferData({ quantity: 1, toVitrina: true }); setIsTransferModalOpen(true); }} className="flex items-center gap-1 px-3 py-1.5 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 rounded-lg text-xs font-bold">
                        <Truck size={12} /> Transferir
                      </button>
                    )}
                    {settings.audit && (
                      <button onClick={() => { setAuditItem(item); setAuditData({ quantity: item.stock }); setIsAuditModalOpen(true); }} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold">
                        <ClipboardCheck size={12} /> Auditar
                      </button>
                    )}
                    {settings.waste && (
                      <button onClick={() => { setWasteItem(item); setIsWasteModalOpen(true); }} className="flex items-center gap-1 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-lg text-xs font-bold">
                        <TrendingDown size={12} /> Merma
                      </button>
                    )}
                    <button onClick={() => navigate('/ecommerce/product-studio/' + item.id)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold">
                      <Edit2 size={12} /> Editar
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold">
                      <Trash2 size={12} /> Borrar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Vista desktop: tabla */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Producto (SKU)</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Stock</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Costo (COGS)</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Precio Venta</th>
                {settings.expiration && <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Vencimiento</th>}
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Proveedor</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-500">
                    No se encontraron registros en el inventario.
                  </td>
                </tr>
              ) : (
                filteredInventory.map(item => {
                  const margin = calculateMargin(item.cogs, item.price);
                  const status = getStatus(item.stock, item.minStock, item.maxStock, item.expirationDate);
                  return (
                    <tr key={item.id} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition-colors ${status === 'Sobre-Stock' ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                      <td className="py-3 px-4">
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{item.name}</p>
                        <p className="text-[10px] font-mono text-slate-500">{item.id}</p>
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
                          <button onClick={() => navigate('/ecommerce/product-studio/' + item.id)} className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors" title="Editar Stock y Costo">
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

                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Proveedor</label>
                     <input 
                       type="text" 
                       name="supplier"
                       value={formData.supplier}
                       onChange={handleInputChange}
                       className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white" 
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
                         className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white" 
                       />
                     </div>
                   )}
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Stock {settings.transfers ? 'Depósito ' : ''}*</label>
                     <input 
                       type="number" 
                       name="stock"
                       value={formData.stock}
                       onChange={handleInputChange}
                       className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white" 
                     />
                   </div>
                   {settings.transfers && (
                     <div className="space-y-2">
                       <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Stock Vitrina</label>
                       <input 
                         type="number" 
                         name="stockVitrina"
                         value={formData.stockVitrina}
                         onChange={handleInputChange}
                         className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white" 
                       />
                     </div>
                   )}
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                   {settings.reorder && (
                     <div className="space-y-2">
                       <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Punto de Reorden (Min) *</label>
                       <input 
                         type="number" 
                         name="minStock"
                         value={formData.minStock}
                         onChange={handleInputChange}
                         className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white" 
                       />
                     </div>
                   )}
                   {settings.overstock && (
                     <div className="space-y-2">
                       <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Stock Máximo (Sobre-Stock)</label>
                       <input 
                         type="number" 
                         name="maxStock"
                         value={formData.maxStock || ''}
                         onChange={handleInputChange}
                         className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white" 
                       />
                     </div>
                   )}
                 </div>

                 {/* Combos Promocionales */}
                 {settings.combos && (
                   <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                   <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
                     <input 
                       type="checkbox" 
                       name="isCombo"
                       checked={formData.isCombo || false}
                       onChange={handleInputChange}
                       className="w-4 h-4 text-violet-600 rounded border-slate-300 focus:ring-violet-500"
                     />
                     <div>
                       <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Este producto es un Combo / Kit Promocional</p>
                       <p className="text-[10px] text-slate-500">Descuenta inventario de otros productos al crearse o venderse.</p>
                     </div>
                   </label>
                   
                   {formData.isCombo && (
                     <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
                       <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Productos incluidos en el Combo:</p>
                       
                       <div className="space-y-2">
                         {formData.comboItems?.map((cItem, i) => {
                           const p = inventory.find(inv => inv.id === cItem.id);
                           return (
                             <div key={i} className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                               <span className="flex-1 text-xs text-slate-700 dark:text-slate-300 font-medium truncate">{p?.name || cItem.id}</span>
                               <span className="text-xs font-bold text-slate-500">x{cItem.qty}</span>
                               <button 
                                 onClick={() => {
                                   const newItems = [...formData.comboItems];
                                   newItems.splice(i, 1);
                                   setFormData({...formData, comboItems: newItems});
                                 }}
                                 className="text-red-400 hover:text-red-500"
                               >
                                 <X size={14} />
                               </button>
                             </div>
                           )
                         })}
                       </div>

                       <div className="flex gap-2">
                         <select 
                           id="comboSelect" 
                           className="flex-1 px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none dark:text-white"
                         >
                           <option value="">Selecciona producto...</option>
                           {inventory.filter(i => !i.isCombo && i.id !== formData.id).map(i => (
                             <option key={i.id} value={i.id}>{i.name}</option>
                           ))}
                         </select>
                         <input type="number" id="comboQty" defaultValue="1" min="1" className="w-16 px-2 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none dark:text-white" />
                         <button 
                           onClick={() => {
                             const sel = document.getElementById('comboSelect');
                             const qty = document.getElementById('comboQty');
                             if(sel.value && qty.value > 0) {
                               const exists = formData.comboItems?.find(c => c.id === sel.value);
                               if(exists) {
                                 setFormData({...formData, comboItems: formData.comboItems.map(c => c.id === sel.value ? {...c, qty: Number(c.qty) + Number(qty.value)} : c)});
                               } else {
                                 setFormData({...formData, comboItems: [...(formData.comboItems || []), {id: sel.value, qty: Number(qty.value)}]});
                               }
                               sel.value = '';
                               qty.value = '1';
                             }
                           }}
                            className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-3 rounded-lg text-xs font-bold"
                          >
                            Añadir
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                 )}
                 <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                   <div className="space-y-2">
                     <label className="text-xs font-semibold text-slate-600 dark:text-slate-400" title="Cost Of Goods Sold (Lo que te cuesta)">Costo Unitario de Entrada $ *</label>
                     <input 
                       type="number" 
                       name="cogs"
                       value={formData.cogs}
                       onChange={handleInputChange}
                       className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white" 
                     />
                     {editingId && (
                       <p className="text-[10px] text-slate-500 leading-tight">Si sumas stock, el sistema usará este valor para recalcular el <strong>Costo Promedio Ponderado</strong> total.</p>
                     )}
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Precio de Venta $ *</label>
                     <input 
                       type="number" 
                       name="price"
                       value={formData.price}
                       onChange={handleInputChange}
                       className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white" 
                     />
                   </div>
                 </div>

                 {/* Margen Calculado en vivo */}
                 <div className="mt-4 p-4 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-900/50 rounded-xl flex items-center justify-between">
                   <span className="text-xs font-bold text-violet-700 dark:text-violet-400">Margen de Ganancia Proyectado:</span>
                   <span className="text-lg font-black text-violet-600 dark:text-violet-400">
                     {calculateMargin(Number(formData.cogs || 0), Number(formData.price || 0))}%
                   </span>
                 </div>
               </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex gap-3 justify-end">
               <button onClick={closeEditor} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors">
                 Cancelar
               </button>
               <button onClick={handleSave} className="px-6 py-2 text-sm font-bold bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors shadow-sm shadow-violet-500/20">
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
      )}
      {/* Shopping List Modal */}
      {isShoppingListOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsShoppingListOpen(false)}></div>
          
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
               <div>
                 <h3 className="text-lg font-bold text-slate-800 dark:text-white">Generador de Pedidos</h3>
                 <p className="text-xs text-slate-500 mt-1">Sugerencia de compras basada en el punto de reorden.</p>
               </div>
               <button onClick={() => setIsShoppingListOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                 <X size={20} />
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {Object.keys(shoppingList).length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  <p>¡Todo en orden!</p>
                  <p className="text-sm">Ningún producto está por debajo de su stock mínimo.</p>
                </div>
              ) : (
                Object.keys(shoppingList).map(supplier => (
                  <div key={supplier} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                      <h4 className="font-bold text-slate-700 dark:text-slate-200">{supplier}</h4>
                      <span className="text-xs font-semibold bg-white dark:bg-slate-900 px-2 py-1 rounded text-slate-500">
                        {shoppingList[supplier].length} items
                      </span>
                    </div>
                    <div className="p-4">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr>
                            <th className="pb-2 text-slate-500 font-semibold">Producto</th>
                            <th className="pb-2 text-slate-500 font-semibold text-center">Stock Actual</th>
                            <th className="pb-2 text-emerald-600 dark:text-emerald-400 font-semibold text-center">Pedir</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                          {shoppingList[supplier].map(item => (
                            <tr key={item.id}>
                              <td className="py-2 text-slate-800 dark:text-slate-200 font-medium">{item.name} <span className="text-[10px] text-slate-400 ml-2">{item.id}</span></td>
                              <td className="py-2 text-slate-600 dark:text-slate-400 text-center">{item.stock}</td>
                              <td className="py-2 text-emerald-600 dark:text-emerald-400 font-bold text-center">{item.qtyToOrder}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex justify-end">
               <button onClick={() => window.print()} className="px-6 py-2 text-sm font-bold bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors shadow-sm shadow-violet-500/20">
                 Imprimir / PDF
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
