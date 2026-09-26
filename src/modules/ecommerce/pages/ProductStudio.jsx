import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Image as ImageIcon, Star, ShoppingBag, Check, TrendingUp, TrendingDown, Activity, AlertTriangle, FileSpreadsheet, Calculator, CheckCircle, PackageCheck } from 'lucide-react';
import UnifiedProductForm from '../components/UnifiedProductForm';

export default function ProductStudio() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [previewData, setPreviewData] = useState({
    sku: '',
    name: '',
    price_usd: '',
    stock: '',
    category: 'General',
    metadata: {}
  });

  const [initialData, setInitialData] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  
  useEffect(() => {
    if (isEditing) {
      fetch(`${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}/api/ecommerce/products/${id}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            const parsedData = {
              id: data.id,
              sku: data.batch_number || '', // Mapping to old fields for compatibility
              name: data.name || '',
              category: data.category || 'General',
              price_usd: data.price || '',
              stock: data.stock || '',
              metadata: data.metadata ? (typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata) : {}
            };
            setInitialData(parsedData);
            setPreviewData(parsedData);
          }
        })
        .catch(err => console.error("Error loading product:", err));
    } else {
      // Load inventory items for selection
      const workspaceId = localStorage.getItem('activeWorkspace') || 'default_workspace';
      fetch(`${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}/api/ecommerce/products?workspace_id=${workspaceId}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) setInventoryItems(data);
        })
        .catch(err => console.error("Error loading inventory:", err));
    }
  }, [id, isEditing]);

  const handleSave = async (formData) => {
    try {
      const url = isEditing 
        ? `${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}/api/ecommerce/products/${id}` 
        : `${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}/api/ecommerce/products`;
      const method = isEditing ? 'PATCH' : 'POST';
      
      const workspaceId = localStorage.getItem('activeWorkspace');
      if (!workspaceId) {
        alert('Error: Sesión de comerciante no encontrada. Por favor inicie sesión nuevamente.');
        window.location.reload();
        return;
      }

      const payload = {
        name: formData.name,
        category: formData.category,
        price: formData.price_usd,
        stock: formData.stock,
        cogs: formData.cogs,
        batchNumber: formData.sku, // Map SKU to batchNumber for legacy support
        metadata: JSON.stringify(formData.metadata), // Must stringify for PATCH/POST
        workspace_id: workspaceId
      };

      if (!isEditing) {
        payload.publish_status = 'Borrador'; // Default status on creation
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
      <div className="w-full md:w-1/2 lg:w-7/12 flex flex-col bg-slate-50 dark:bg-black overflow-y-auto custom-scrollbar h-[calc(100vh-64px)] md:h-screen">
        <UnifiedProductForm 
          initialData={initialData} 
          onFormChange={setPreviewData}
          onSave={handleSave} 
        />
      </div>

      {/* Right Panel - Live Preview */}
      <div className="w-full md:w-1/2 lg:w-5/12 bg-slate-100 dark:bg-[#0b1120] flex items-center justify-center p-6 md:p-12 h-[calc(100vh-64px)] md:h-screen sticky top-0 relative overflow-hidden">
        
        {/* Background Decorative Blobs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>

        <div className="w-full max-w-sm relative z-10 flex flex-col gap-6">
          
          <div className="flex flex-col items-center mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Inteligencia Comercial</span>
            <div className="h-1 w-12 bg-amber-500/50 rounded-full"></div>
          </div>

          {/* Calculator Widget */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-3xl p-6 border border-slate-200/50 dark:border-slate-800/50 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Calculator size={64} className="text-amber-500" />
            </div>
            
            <div className="relative z-10">
              <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-amber-500" />
                Margen de Ganancia
              </h3>
              
              <div className="flex items-end gap-3 mb-2">
                <span className="text-4xl font-black text-slate-800 dark:text-white">
                  {(() => {
                    const price = parseFloat(previewData.price_usd) || 0;
                    const cogs = parseFloat(previewData.cogs) || 0;
                    const profit = price - cogs;
                    const margin = price > 0 ? (profit / price) * 100 : 0;
                    return margin > 0 ? margin.toFixed(1) + '%' : '0.0%';
                  })()}
                </span>
                <span className="text-sm font-bold text-emerald-500 mb-1">
                  +${(() => {
                    const price = parseFloat(previewData.price_usd) || 0;
                    const cogs = parseFloat(previewData.cogs) || 0;
                    return Math.max(0, price - cogs).toFixed(2);
                  })()} neto
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Calculado en base a Costo vs. Precio de Venta
              </p>
            </div>
          </div>

          {/* Inventory Health Widget */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-3xl p-6 border border-slate-200/50 dark:border-slate-800/50 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Activity size={64} className="text-blue-500" />
            </div>
            
            <div className="relative z-10">
              <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-4">
                <PackageCheck size={16} className="text-blue-500" />
                Salud del Inventario
              </h3>
              
              {(() => {
                const stock = parseInt(previewData.stock) || 0;
                const minStock = parseInt(previewData?.metadata?.reorder_point) || 5;
                let status = 'Agotado';
                let color = 'text-red-500';
                let bg = 'bg-red-500/10';
                let Icon = AlertTriangle;

                if (stock > minStock) {
                  status = 'Saludable';
                  color = 'text-emerald-500';
                  bg = 'bg-emerald-500/10';
                  Icon = CheckCircle;
                } else if (stock > 0 && stock <= minStock) {
                  status = 'Stock Bajo';
                  color = 'text-amber-500';
                  bg = 'bg-amber-500/10';
                  Icon = TrendingDown;
                }

                return (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-sm ${color} ${bg} mb-1`}>
                        <Icon size={14} />
                        {status}
                      </div>
                      <p className="text-xs font-medium text-slate-400 mt-2">
                        Punto de reorden: {minStock} unds.
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-black text-slate-800 dark:text-white">{stock}</span>
                      <p className="text-[10px] uppercase font-bold text-slate-400">En Stock</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Bulk Import Call to Action */}
          <div className="mt-4 border border-dashed border-amber-500/30 rounded-3xl p-6 bg-gradient-to-br from-amber-500/5 to-transparent relative overflow-hidden">
            <div className="flex items-start gap-4 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-600 dark:text-amber-500 mb-1">Carga Masiva Disponible</h4>
                <p className="text-xs text-amber-700/70 dark:text-amber-400/70 leading-relaxed">
                  Evita llenar esto a mano. Usa nuestro importador de Excel/CSV para sincronizar cientos de precios e inventario en segundos.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
