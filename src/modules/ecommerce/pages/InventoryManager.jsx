import React, { useState, useMemo } from 'react';
import { PackageSearch, TrendingDown, TrendingUp, Truck, PackagePlus, Edit2, Trash2, X, CheckCircle } from 'lucide-react';

const initialInventory = [
  { id: 'SKU-001', name: 'Camiseta de Algodón Premium', stock: 124, cogs: 8.50, price: 29.99, supplier: 'TextilPro SA' },
  { id: 'SKU-002', name: 'Auriculares Inalámbricos', stock: 4, cogs: 35.00, price: 89.00, supplier: 'TechImport' },
  { id: 'SKU-003', name: 'Mochila de Viaje', stock: 12, cogs: 22.00, price: 65.00, supplier: 'LeatherGoods' },
];

export default function InventoryManager() {
  const [inventory, setInventory] = useState(initialInventory);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    stock: '',
    cogs: '',
    price: '',
    supplier: ''
  });

  // Derived calculations
  const calculateMargin = (cogs, price) => {
    if (!price || price <= 0) return 0;
    return (((price - cogs) / price) * 100).toFixed(1);
  };

  const getStatus = (stock) => {
    if (stock <= 5) return 'Crítico';
    if (stock <= 15) return 'Bajo';
    return 'En Stock';
  };

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.supplier.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // KPIs
  const totalValue = inventory.reduce((acc, item) => acc + (item.stock * item.cogs), 0);
  const avgMargin = inventory.length > 0 
    ? inventory.reduce((acc, item) => acc + Number(calculateMargin(item.cogs, item.price)), 0) / inventory.length
    : 0;
  const criticalItemsCount = inventory.filter(i => i.stock <= 5).length;

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
        cogs: '',
        price: '',
        supplier: ''
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
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    if (!formData.name || !formData.id || formData.stock === '' || formData.cogs === '' || formData.price === '') {
      alert("Por favor llena todos los campos numéricos y de texto requeridos.");
      return;
    }

    const newItem = {
      ...formData,
      stock: Number(formData.stock),
      cogs: Number(formData.cogs),
      price: Number(formData.price),
    };

    if (editingId) {
      setInventory(inventory.map(i => i.id === editingId ? { ...newItem, id: formData.id } : i));
    } else {
      setInventory([newItem, ...inventory]);
    }
    closeEditor();
  };

  const handleDelete = (id) => {
    if(window.confirm('¿Estás seguro de eliminar este registro del inventario?')) {
      setInventory(inventory.filter(i => i.id !== id));
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 pb-24 md:pb-8 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Logística e Inventario</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Controla existencias, órdenes de compra y márgenes de ganancia.</p>
        </div>
        <button onClick={() => openEditor()} className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-violet-500/20">
          <PackagePlus size={18} />
          Registrar Entrada
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <PackageSearch size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Costo Total del Inventario</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">${totalValue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Margen Promedio</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{avgMargin.toFixed(1)}%</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className={`p-3 rounded-xl ${criticalItemsCount > 0 ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-slate-50 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400'}`}>
            <TrendingDown size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Productos en Estado Crítico</p>
            <h3 className={`text-2xl font-bold ${criticalItemsCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-white'}`}>
              {criticalItemsCount}
            </h3>
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
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Producto (SKU)</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Stock</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Costo (COGS)</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Precio Venta</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Margen</th>
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
                  const status = getStatus(item.stock);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 px-4">
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{item.name}</p>
                        <p className="text-[10px] font-mono text-slate-500">{item.id}</p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${status === 'Crítico' ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>
                            {item.stock}
                          </span>
                          {status === 'Crítico' && <TrendingDown size={14} className="text-rose-500" title="Stock Crítico" />}
                          {status === 'Bajo' && <TrendingDown size={14} className="text-amber-500" title="Stock Bajo" />}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                        ${item.cogs.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-sm font-bold text-slate-800 dark:text-white">
                        ${item.price.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold ${
                          margin >= 50 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                        }`}>
                          {margin}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                        {item.supplier}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEditor(item)} className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors" title="Editar Stock">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" title="Eliminar Registro">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
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
          
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
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

                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Stock Físico *</label>
                     <input 
                       type="number" 
                       name="stock"
                       value={formData.stock}
                       onChange={handleInputChange}
                       className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white" 
                     />
                   </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                   <div className="space-y-2">
                     <label className="text-xs font-semibold text-slate-600 dark:text-slate-400" title="Cost Of Goods Sold (Lo que te cuesta)">Costo (COGS) $ *</label>
                     <input 
                       type="number" 
                       name="cogs"
                       value={formData.cogs}
                       onChange={handleInputChange}
                       className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white" 
                     />
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
    </div>
  );
}
