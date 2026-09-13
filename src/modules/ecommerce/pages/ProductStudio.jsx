import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Image as ImageIcon, Plus, Check, Star, ShoppingBag } from 'lucide-react';

export default function ProductStudio() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    name: '',
    category: 'Ropa',
    price: '',
    stock: '',
    description: '',
    publishStatus: 'Publicado',
    variants: 1,
    imageUrl: '',
    isOffer: false,
    discountPrice: ''
  });

  useEffect(() => {
    if (isEditing) {
      fetch(`http://localhost:3001/api/ecommerce/products/${id}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            setFormData({
              name: data.name || '',
              category: data.category || 'Ropa',
              price: data.price || '',
              stock: data.stock || '',
              description: data.description || '',
              publishStatus: data.publish_status || 'Borrador',
              variants: data.variants || 1,
              imageUrl: data.image_url || '',
              isOffer: !!data.is_offer,
              discountPrice: data.discount_price || ''
            });
          }
        })
        .catch(err => console.error("Error loading product:", err));
    }
  }, [id, isEditing]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked ? 'Publicado' : 'Borrador' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    try {
      const url = isEditing 
        ? `http://localhost:3001/api/ecommerce/products/${id}` 
        : 'http://localhost:3001/api/ecommerce/products';
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          publishStatus: formData.publishStatus
        })
      });
      
      if (response.ok) {
        navigate('/ecommerce/products');
      } else {
        alert("Error al guardar el producto");
      }
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Error de conexión al guardar el producto");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row">
      {/* Left Panel - Editor */}
      <div className="w-full md:w-1/2 lg:w-7/12 p-6 md:p-8 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 overflow-y-auto custom-scrollbar h-[calc(100vh-64px)] md:h-screen">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/ecommerce/products')} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <p className="text-sm text-slate-500">Completa los detalles y observa la vista previa.</p>
            </div>
          </div>
          <button onClick={handleSave} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-violet-500/20">
            <Save size={18} />
            Guardar
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-8 max-w-2xl">
          {/* Información Básica */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="w-6 h-6 rounded-md bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xs">1</span>
              Información Básica
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Nombre del Producto *</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Ej. Zapatillas Deportivas XYZ"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white transition-all" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Categoría</label>
                  <select 
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white transition-all cursor-pointer"
                  >
                    <option value="Ropa">Ropa</option>
                    <option value="Electrónica">Electrónica</option>
                    <option value="Accesorios">Accesorios</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Estado</label>
                  <label className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer">
                    <input 
                      type="checkbox" 
                      name="publishStatus"
                      checked={formData.publishStatus === 'Publicado'}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {formData.publishStatus === 'Publicado' ? 'Publicado' : 'Borrador'}
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Descripción</label>
                <textarea 
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe los beneficios y características del producto..."
                  rows="4" 
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white resize-none transition-all"
                ></textarea>
              </div>
            </div>
          </section>

          {/* Precios e Inventario */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs">2</span>
              Precios e Inventario
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Precio de Venta ($) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input 
                    type="number" 
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white transition-all" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Inventario Disponible *</label>
                <input 
                  type="number" 
                  name="stock"
                  value={formData.stock}
                  onChange={handleInputChange}
                  placeholder="Ej. 50"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white transition-all" 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer mt-6">
                  <input 
                    type="checkbox" 
                    name="isOffer"
                    checked={formData.isOffer}
                    onChange={handleInputChange}
                    className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Producto en Oferta
                  </span>
                </label>
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${formData.isOffer ? 'text-slate-600 dark:text-slate-400' : 'text-slate-400 dark:text-slate-600'}`}>Precio con Descuento ($)</label>
                <div className="relative">
                  <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${formData.isOffer ? 'text-slate-400' : 'text-slate-300 dark:text-slate-700'}`}>$</span>
                  <input 
                    type="number" 
                    name="discountPrice"
                    value={formData.discountPrice}
                    onChange={handleInputChange}
                    disabled={!formData.isOffer}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white transition-all disabled:opacity-50" 
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Galería (Mock) */}
          <section className="space-y-4 pb-12">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs">3</span>
              Multimedia
            </h3>
            
            <div className="flex gap-4">
              <div className="w-32 h-32 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-violet-500 transition-all cursor-pointer group">
                <Plus size={24} className="group-hover:text-violet-500 mb-2 transition-colors" />
                <span className="text-xs font-semibold group-hover:text-violet-500 transition-colors">Subir Foto</span>
              </div>
              {/* Optional: Show placeholder image blocks if there are any */}
              {formData.imageUrl && (
                <div className="w-32 h-32 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                   <img src={formData.imageUrl} alt="preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Right Panel - Live Preview */}
      <div className="w-full md:w-1/2 lg:w-5/12 bg-slate-100 dark:bg-[#0b1120] flex items-center justify-center p-6 md:p-12 h-[calc(100vh-64px)] md:h-screen sticky top-0 relative overflow-hidden">
        
        {/* Background Decorative Blobs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>

        <div className="w-full max-w-sm relative z-10 flex flex-col">
          <div className="mb-6 flex flex-col items-center">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Live Preview</span>
            <div className="h-1 w-12 bg-violet-500/50 rounded-full"></div>
          </div>

          {/* Smartphone Frame Simulation */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-4 shadow-2xl border-8 border-slate-200 dark:border-slate-800 relative ring-1 ring-slate-900/5 dark:ring-white/10 overflow-hidden h-[650px] flex flex-col">
            
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-200 dark:bg-slate-800 rounded-b-2xl z-20"></div>

            {/* Preview Store UI */}
            <div className="flex-1 overflow-y-auto custom-scrollbar rounded-2xl bg-slate-50 dark:bg-slate-950 mt-4 pb-6">
              {/* Product Image Area */}
              <div className="w-full aspect-square bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400 relative">
                {formData.imageUrl ? (
                  <img src={formData.imageUrl} alt="Product" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={48} className="opacity-50" />
                )}
                
                {formData.stock <= 0 && (
                  <div className="absolute top-4 left-4 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                    Agotado
                  </div>
                )}
                {formData.publishStatus !== 'Publicado' && (
                  <div className="absolute top-4 right-4 bg-slate-800/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider border border-white/10">
                    Borrador
                  </div>
                )}
              </div>

              {/* Product Info Area */}
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-1 block">
                      {formData.category || 'Categoría'}
                    </span>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight break-words">
                      {formData.name || 'Nombre del Producto'}
                    </h1>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                    <Star size={12} className="text-amber-400 fill-amber-400" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">0.0</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    ${formData.isOffer && formData.discountPrice ? Number(formData.discountPrice).toFixed(2) : (formData.price ? Number(formData.price).toFixed(2) : '0.00')}
                  </div>
                  {formData.isOffer && formData.price && (
                    <div className="text-sm font-medium text-slate-400 line-through">
                      ${Number(formData.price).toFixed(2)}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Descripción</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap break-words">
                    {formData.description || 'La descripción de tu producto aparecerá aquí...'}
                  </p>
                </div>

                {/* Add to Cart Button Mock */}
                <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
                  <button className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${formData.stock > 0 ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'}`}>
                    <ShoppingBag size={18} />
                    {formData.stock > 0 ? 'Añadir al Carrito' : 'Agotado'}
                  </button>
                  <p className="text-center text-[10px] text-slate-500 mt-3 flex items-center justify-center gap-1">
                    <Check size={12} className="text-emerald-500" />
                    Envío disponible a todo el país
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
