import React, { useState, useEffect } from 'react';
import { Upload, ChevronDown, ChevronUp, Save, FileSpreadsheet, Package, Tag, Hash, DollarSign, Boxes, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function UnifiedProductForm({ initialData, onSave, onImportClick, onFormChange }) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    price_usd: '',
    stock: '',
    category: 'General',
    metadata: {
      brand: '',
      supplier: '',
      batch: '',
      expiration: '',
      net_content: '',
      reorder_point: ''
    }
  });

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        metadata: {
          ...prev.metadata,
          ...(initialData.metadata || {})
        }
      }));
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (onFormChange) onFormChange(next);
      return next;
    });
  };

  const handleMetadataChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = {
        ...prev,
        metadata: {
          ...prev.metadata,
          [name]: value
        }
      };
      if (onFormChange) onFormChange(next);
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) onSave(formData);
  };

  return (
    <div className="w-full bg-slate-50 dark:bg-black pb-24 font-sans text-slate-900 dark:text-slate-50 relative">
      
      {!initialData?.id && (
        <section className="p-4 md:p-6 pb-2">
          <div 
            onClick={onImportClick}
            className="group cursor-pointer bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20 border border-emerald-500/30 dark:border-emerald-500/50 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <h3 className="text-emerald-700 dark:text-emerald-400 font-bold text-lg leading-tight">
                  ¿Tienes muchos productos?
                </h3>
                <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                  Importa tu inventario desde Excel o CSV. (Compatible con a2, Saint, Profit)
                </p>
              </div>
            </div>
            <button type="button" className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white font-bold rounded-lg text-sm shadow-md group-hover:bg-emerald-400 transition-colors whitespace-nowrap">
              Importar ahora <ArrowRight size={16} />
            </button>
          </div>
        </section>
      )}

      {!initialData?.id && (
        <div className="flex items-center gap-4 px-6 py-4">
          <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">O crea un producto manualmente</span>
          <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="px-4 md:px-6 space-y-6 max-w-4xl mx-auto mt-4">
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Hash size={16} className="text-amber-500" />
                SKU (Código Único) *
              </label>
              <input 
                type="text" 
                name="sku"
                required
                value={formData.sku}
                onChange={handleChange}
                placeholder="Ej. PROD-001"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-shadow dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Tag size={16} className="text-amber-500" />
                Nombre del Producto *
              </label>
              <input 
                type="text" 
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Ej. Harina Pan Blanca 1Kg"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-shadow dark:text-white"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Categoría</label>
              <select 
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-shadow dark:text-white"
              >
                <option value="General">General</option>
                <option value="Víveres">Víveres</option>
                <option value="Proteínas">Proteínas</option>
                <option value="Charcutería y Lácteos">Charcutería y Lácteos</option>
                <option value="Frutas y Verduras">Frutas y Verduras</option>
                <option value="Panadería y Dulces">Panadería y Dulces</option>
                <option value="Bebidas y Licores">Bebidas y Licores</option>
                <option value="Snacks y Golosinas">Snacks y Golosinas</option>
                <option value="Cuidado Personal">Cuidado Personal</option>
                <option value="Limpieza del Hogar">Limpieza del Hogar</option>
                <option value="Ropa y Calzado">Ropa y Calzado</option>
                <option value="Repuestos para Carros">Repuestos para Carros</option>
                <option value="Repuestos para Motos">Repuestos para Motos</option>
                <option value="Herramientas y Ferretería">Herramientas y Ferretería</option>
                <option value="Tecnología y Celulares">Tecnología y Celulares</option>
                <option value="Hogar y Electrodomésticos">Hogar y Electrodomésticos</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <DollarSign size={16} className="text-amber-500" />
                Costo / Compra ($)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input 
                  type="number" 
                  step="0.01"
                  name="cogs"
                  value={formData.cogs || ''}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-shadow dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <DollarSign size={16} className="text-emerald-500" />
                Precio de Venta ($) *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input 
                  type="number" 
                  step="0.01"
                  name="price_usd"
                  required
                  value={formData.price_usd}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-shadow dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Boxes size={16} className="text-amber-500" />
                Inventario Total *
              </label>
              <input 
                type="number" 
                step="0.01"
                name="stock"
                required
                value={formData.stock}
                onChange={handleChange}
                placeholder="0"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-shadow dark:text-white"
              />
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-all duration-300">
          <button 
            type="button"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="w-full p-6 flex items-center justify-between text-left focus:outline-none group"
          >
            <div className="flex items-center gap-3">
              <Package size={20} className="text-slate-400 group-hover:text-amber-500 transition-colors" />
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">Detalles Adicionales</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Marca, Proveedor, Lote, Vencimiento...</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-amber-100 group-hover:text-amber-600 dark:group-hover:bg-amber-500/20 transition-colors">
              {isAdvancedOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </button>

          {isAdvancedOpen && (
            <div className="p-6 pt-0 border-t border-slate-100 dark:border-slate-800/50 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Marca</label>
                  <input type="text" name="brand" value={formData.metadata.brand} onChange={handleMetadataChange} placeholder="Ej. Polar, Nestlé" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-700 dark:text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Proveedor</label>
                  <input type="text" name="supplier" value={formData.metadata.supplier} onChange={handleMetadataChange} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-700 dark:text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Número de Lote</label>
                  <input type="text" name="batch" value={formData.metadata.batch} onChange={handleMetadataChange} placeholder="Ej. L-202309" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-700 dark:text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Fecha Vencimiento</label>
                  <input type="date" name="expiration" value={formData.metadata.expiration} onChange={handleMetadataChange} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-700 dark:text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Contenido Neto</label>
                  <input type="text" name="net_content" value={formData.metadata.net_content} onChange={handleMetadataChange} placeholder="Ej. 1 Litro, 500g" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-700 dark:text-white" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Punto de Reorden (Min. Stock)</label>
                  <input type="number" name="reorder_point" value={formData.metadata.reorder_point} onChange={handleMetadataChange} placeholder="Ej. 5" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-700 dark:text-white" />
                </div>
              </div>
            </div>
          )}
        </section>
      </form>

      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] z-40">
        <div className="max-w-4xl mx-auto flex justify-end gap-4">
          <button type="button" onClick={() => navigate('/ecommerce')} className="px-6 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            Descartar
          </button>
          <button 
            onClick={handleSubmit}
            className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 transition-all transform hover:-translate-y-0.5"
          >
            <Save size={18} /> Guardar Producto
          </button>
        </div>
      </div>
    </div>
  );
}
