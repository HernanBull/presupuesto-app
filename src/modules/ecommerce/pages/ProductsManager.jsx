import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, X, Image as ImageIcon, CheckCircle, Clock } from 'lucide-react';

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
      const res = await fetch('http://localhost:3001/api/ecommerce/products');
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map(p => ({
          ...p,
          publishStatus: p.publish_status || 'Borrador',
          imageUrl: p.image_url || ''
        }));
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

  const handleDelete = async (id) => {
    if(window.confirm('¿Estás seguro de eliminar este producto?')) {
      try {
        const res = await fetch(`http://localhost:3001/api/ecommerce/products/${id}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          setProducts(products.filter(p => p.id !== id));
        } else {
          alert('Error al eliminar producto');
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

      {/* Drawer eliminated in favor of ProductStudio */}
    </div>
  );
}
