import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, X, Image as ImageIcon, CheckCircle, Clock } from 'lucide-react';

const initialProducts = [
  { id: 1, name: 'Camiseta de Algodón Premium', category: 'Ropa', price: 29.99, stock: 124, publishStatus: 'Publicado', variants: 4, description: 'Camiseta 100% algodón orgánico.' },
  { id: 2, name: 'Auriculares Inalámbricos', category: 'Electrónica', price: 89.00, stock: 45, publishStatus: 'Publicado', variants: 2, description: 'Cancelación de ruido activa.' },
  { id: 3, name: 'Botella de Agua Reutilizable', category: 'Accesorios', price: 15.50, stock: 0, publishStatus: 'Publicado', variants: 1, description: 'Acero inoxidable 500ml.' },
  { id: 4, name: 'Mochila de Viaje', category: 'Accesorios', price: 65.00, stock: 12, publishStatus: 'Borrador', variants: 1, description: 'Impermeable con compartimento para laptop.' },
];

export default function ProductsManager() {
  const [products, setProducts] = useState(initialProducts);
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
      setEditingId(product.id);
      setFormData({ ...product });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        category: 'Ropa',
        price: '',
        stock: '',
        description: '',
        publishStatus: 'Borrador',
        variants: 1
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
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked ? 'Publicado' : 'Borrador' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = () => {
    if (!formData.name || !formData.price || !formData.stock) {
      alert("Por favor llena los campos requeridos (Nombre, Precio, Stock).");
      return;
    }

    if (editingId) {
      // Actualizar
      setProducts(products.map(p => p.id === editingId ? { ...formData, id: editingId, price: Number(formData.price), stock: Number(formData.stock) } : p));
    } else {
      // Crear
      const newProduct = {
        ...formData,
        id: Date.now(),
        price: Number(formData.price),
        stock: Number(formData.stock),
      };
      setProducts([newProduct, ...products]);
    }
    closeEditor();
  };

  const handleDelete = (id) => {
    if(window.confirm('¿Estás seguro de eliminar este producto?')) {
      setProducts(products.filter(p => p.id !== id));
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

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Producto</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Categoría</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Precio</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Inventario</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Estado de Tienda</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    No se encontraron productos.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => (
                  <tr key={product.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-shrink-0 items-center justify-center">
                          <ImageIcon size={18} className="text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1">{product.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{product.variants} {product.variants === 1 ? 'variante' : 'variantes'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                      {product.category}
                    </td>
                    <td className="py-3 px-4 text-sm font-bold text-slate-800 dark:text-white">
                      ${product.price.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-sm font-bold ${product.stock > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                        {product.stock > 0 ? `${product.stock} un.` : 'Agotado'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                        product.publishStatus === 'Publicado' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {product.publishStatus === 'Publicado' ? <CheckCircle size={14} /> : <Clock size={14} />}
                        {product.publishStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditor(product)} className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors" title="Editar">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(product.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" title="Eliminar">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Side Panel Overlay */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={closeEditor}></div>
          
          {/* Panel */}
          <div className="relative w-full max-w-md md:max-w-xl h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Panel Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
               <div>
                 <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                   {editingId ? 'Editar Producto' : 'Crear Nuevo Producto'}
                 </h3>
                 <p className="text-xs text-slate-500 mt-1">
                   {editingId ? `Editando: ${formData.name}` : 'Añade los detalles de tu nuevo producto'}
                 </p>
               </div>
               <button onClick={closeEditor} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                 <X size={20} />
               </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 custom-scrollbar">
               {/* Sección Básica */}
               <section className="space-y-4">
                 <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                   Información Básica
                 </h4>
                 <div className="space-y-3">
                   <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">Nombre del Producto *</label>
                   <input 
                     type="text" 
                     name="name"
                     value={formData.name}
                     onChange={handleInputChange}
                     className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white" 
                   />
                 </div>
                 <div className="space-y-3">
                   <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">Categoría</label>
                   <select 
                     name="category"
                     value={formData.category}
                     onChange={handleInputChange}
                     className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white"
                   >
                     <option value="Ropa">Ropa</option>
                     <option value="Electrónica">Electrónica</option>
                     <option value="Accesorios">Accesorios</option>
                   </select>
                 </div>
                 <div className="space-y-3">
                   <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">Descripción</label>
                   <textarea 
                     name="description"
                     value={formData.description}
                     onChange={handleInputChange}
                     rows="4" 
                     className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white resize-none"
                   ></textarea>
                 </div>
               </section>

               {/* Sección Multimedia */}
               <section className="space-y-4">
                 <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Galería</h4>
                 <div className="grid grid-cols-3 gap-3">
                   <div className="aspect-square border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                     <Plus size={24} />
                     <span className="text-[10px] mt-1 font-bold">Subir</span>
                   </div>
                 </div>
               </section>

               {/* Variantes y Precios */}
               <section className="space-y-4">
                 <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Variantes y Precio</h4>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Precio Base ($) *</label>
                     <input 
                       type="number" 
                       name="price"
                       value={formData.price}
                       onChange={handleInputChange}
                       className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white" 
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Stock Base *</label>
                     <input 
                       type="number" 
                       name="stock"
                       value={formData.stock}
                       onChange={handleInputChange}
                       className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white" 
                     />
                   </div>
                 </div>
                 <div className="pt-2">
                   <button className="text-sm font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1.5 hover:text-violet-700 dark:hover:text-violet-300">
                     <Plus size={16} /> Añadir opciones como Talla o Color
                   </button>
                 </div>
               </section>

               {/* Estado de Publicación */}
               <section className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                 <div className="flex items-center justify-between">
                   <div>
                     <h4 className="text-sm font-bold text-slate-800 dark:text-white">Publicar en la tienda</h4>
                     <p className="text-xs text-slate-500">Haz que este producto sea visible para los clientes.</p>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                     <input 
                       type="checkbox" 
                       name="publishStatus"
                       className="sr-only peer" 
                       checked={formData.publishStatus === 'Publicado'}
                       onChange={handleInputChange}
                     />
                     <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-violet-600"></div>
                   </label>
                 </div>
               </section>
            </div>

            {/* Panel Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex gap-3 justify-end">
               <button onClick={closeEditor} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors">
                 Cancelar
               </button>
               <button onClick={handleSave} className="px-6 py-2 text-sm font-bold bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors shadow-sm shadow-violet-500/20">
                 Guardar Producto
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
