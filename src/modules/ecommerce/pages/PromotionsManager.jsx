import React, { useState } from 'react';
import { Tag, Plus, Scissors, Calendar, Trash2 } from 'lucide-react';

export default function PromotionsManager() {
  const [coupons, setCoupons] = useState([]);
  const workspaceId = localStorage.getItem('activeWorkspace') || 'default_workspace';
  
  // Estado para el formulario del creador rápido
  const [formData, setFormData] = useState({
    code: '',
    type: 'Porcentaje (%)',
    value: ''
  });

  const fetchPromotions = async () => {
    try {
      const res = await fetch(`https://axonmarket-api.onrender.com/api/ecommerce/promotions?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        const formatted = data.map(p => {
          let displayDiscount = p.value;
          if (p.type === 'Porcentaje (%)') displayDiscount = `${p.value}%`;
          else if (p.type === 'Monto Fijo ($)') displayDiscount = `$${Number(p.value).toFixed(2)}`;
          else displayDiscount = 'Envío Gratis';

          return {
            id: p.id,
            code: p.code,
            discount: displayDiscount,
            type: p.type,
            usage: `${p.usage_count}/${p.usage_limit > 0 ? p.usage_limit : '∞'}`,
            expires: p.expires_at ? new Date(p.expires_at).toLocaleDateString() : 'Ilimitado',
            status: p.status
          };
        });
        setCoupons(formatted);
      }
    } catch (err) {
      console.error(err);
    }
  };

  React.useEffect(() => {
    fetchPromotions();
  }, [workspaceId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'PROMO-';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, code: result }));
  };

  const handleCreateCoupon = async () => {
    if (!formData.code || (!formData.value && formData.type !== 'Envío Gratis')) {
      alert('Por favor ingresa un código y un valor válido.');
      return;
    }

    try {
      const res = await fetch(`https://axonmarket-api.onrender.com/api/ecommerce/promotions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          code: formData.code,
          type: formData.type,
          value: formData.value || '0'
        })
      });

      if (res.ok) {
        fetchPromotions();
        setFormData({
          code: '',
          type: 'Porcentaje (%)',
          value: ''
        });
      } else {
        const error = await res.json();
        alert(error.error || 'Error al crear el cupón');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este cupón?')) {
      try {
        const res = await fetch(`https://axonmarket-api.onrender.com/api/ecommerce/promotions/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchPromotions();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const activeCouponsCount = coupons.filter(c => c.status === 'Activo').length;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Promociones y Descuentos</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Crea cupones y ofertas especiales para tus clientes.</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-xl text-sm font-bold shadow-sm">
          <span className="text-emerald-600 dark:text-emerald-400">{activeCouponsCount}</span> Activos
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4">Todos los Cupones</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coupons.length === 0 ? (
              <div className="col-span-2 p-8 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                No tienes cupones creados. Usa el generador para crear uno.
              </div>
            ) : (
              coupons.map((coupon) => (
                <div key={coupon.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
                  {coupon.status === 'Expirado' && (
                    <div className="absolute inset-0 bg-slate-50/70 dark:bg-slate-950/70 z-10"></div>
                  )}
                  
                  {/* Botón de eliminar visible en hover */}
                  <button 
                    onClick={() => handleDelete(coupon.id)}
                    className="absolute top-4 right-4 z-30 p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    title="Eliminar Cupón"
                  >
                    <Trash2 size={16} />
                  </button>

                  <div className="flex justify-between items-start relative z-20">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-lg">
                        <Scissors size={20} />
                      </div>
                      <span className="text-lg font-black text-slate-800 dark:text-white tracking-widest uppercase">{coupon.code}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 relative z-20">
                    <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{coupon.discount}</p>
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-2 mt-1">
                      {coupon.type}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                        coupon.status === 'Activo' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {coupon.status}
                      </span>
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs font-medium text-slate-500 dark:text-slate-400 relative z-20">
                     <div className="flex items-center gap-1.5">
                       <Calendar size={14} /> {coupon.expires}
                     </div>
                     <div className="flex items-center gap-1.5">
                       <Tag size={14} /> Usos: {coupon.usage}
                     </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Quick Create Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm h-fit sticky top-6">
          <h3 className="text-base font-bold text-slate-800 dark:text-white mb-6">Generador Rápido</h3>
          
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Código del Cupón</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  placeholder="Ej. OTOÑO20" 
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white" 
                />
                <button onClick={generateRandomCode} className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Generar aleatorio">
                  <Tag size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Tipo de Descuento</label>
              <select 
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white"
              >
                <option value="Porcentaje (%)">Porcentaje (%)</option>
                <option value="Monto Fijo ($)">Monto Fijo ($)</option>
                <option value="Envío Gratis">Envío Gratis</option>
              </select>
            </div>

            {formData.type !== 'Envío Gratis' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Valor ({formData.type === 'Porcentaje (%)' ? '%' : '$'})</label>
                <input 
                  type="number" 
                  name="value"
                  value={formData.value}
                  onChange={handleInputChange}
                  placeholder={formData.type === 'Porcentaje (%)' ? "20" : "50"} 
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white" 
                />
              </div>
            )}

            <button onClick={handleCreateCoupon} className="w-full py-2.5 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 transition-colors mt-2 shadow-sm shadow-violet-500/20">
              Crear Cupón Activo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
