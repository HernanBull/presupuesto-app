import React, { useState, useEffect } from 'react';
import { 
  Check, ChevronRight, Globe, FileText, 
  Play, MessageCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';

export default function OnboardingChecklistPage() {
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState(() => localStorage.getItem('merchant_store_name') || 'Tu Negocio');
  const [productCount, setProductCount] = useState(0);
  const [completedSteps, setCompletedSteps] = useState({
    businessCreated: true,
    priceConfirmed: true,
    paymentMethodSet: true,
    firstSale: true
  });

  useEffect(() => {
    const wsId = localStorage.getItem('activeWorkspace');
    if (wsId) {
      supabase.from('workspaces').select('name, config').eq('id', wsId).single()
        .then(({ data }) => {
          if (data?.name) setStoreName(data.name);
        });

      supabase.from('ecommerce_products').select('id', { count: 'exact', head: true })
        .eq('workspace_id', wsId)
        .then(({ count }) => {
          if (count !== null) setProductCount(count);
        });
    }
  }, []);

  const totalSteps = 4;
  const readySteps = Object.values(completedSteps).filter(Boolean).length;

  const handleOpenVitrina = () => {
    const slug = localStorage.getItem('storeSlug');
    if (slug) window.open(`/${slug}`, '_blank');
    else navigate('/dashboard');
  };

  const handleSupportWhatsApp = () => {
    const msg = encodeURIComponent(`Hola Lucas, necesito ayuda para configurar mi tienda en AxonMarket (${storeName})`);
    window.open(`https://wa.me/584120000000?text=${msg}`, '_blank');
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Puesta en marcha
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configuración inicial paso a paso para comenzar a vender en AxonMarket.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Tu Objetivo Checklist Card (8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200/80 dark:border-white/10 shadow-sm p-6 sm:p-8 space-y-6">
          
          {/* Header row */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20">
              Tu objetivo
            </span>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {readySteps} de {totalSteps} · Listo
            </span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Hiciste tu primera venta
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Todos los requisitos fundamentales para que tu tienda opere han sido verificados.
            </p>
          </div>

          {/* Segmented Progress Bar in Brand Orange */}
          <div className="grid grid-cols-4 gap-2 pt-1">
            {[1, 2, 3, 4].map((seg) => (
              <div 
                key={seg} 
                className={`h-2 rounded-full transition-all duration-500 ${
                  seg <= readySteps 
                    ? 'bg-orange-500 shadow-xs' 
                    : 'bg-slate-100 dark:bg-white/10'
                }`}
              />
            ))}
          </div>

          {/* Checklist Items */}
          <div className="space-y-3 pt-2">
            
            {/* Step 1 */}
            <div 
              onClick={() => navigate('/store-profile')}
              className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/15 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20">
                  <Check size={16} strokeWidth={3} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    Creaste tu negocio
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {storeName} · Almacén y kiosco
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-emerald-500/20 px-3 py-1 rounded-full shadow-xs shrink-0">
                Listo
              </span>
            </div>

            {/* Step 2 */}
            <div 
              onClick={() => navigate('/inventory')}
              className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/15 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20">
                  <Check size={16} strokeWidth={3} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    Confirmaste el precio de {productCount > 0 ? productCount : 30} productos
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    Inventario sincronizado para venta inmediata en vitrina
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-emerald-500/20 px-3 py-1 rounded-full shadow-xs shrink-0">
                Listo
              </span>
            </div>

            {/* Step 3 */}
            <div 
              onClick={() => navigate('/cart-settings')}
              className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/15 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20">
                  <Check size={16} strokeWidth={3} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    Dijiste cómo te pagan
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    Pago Móvil, Efectivo, Binance, Transferencia activos
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-emerald-500/20 px-3 py-1 rounded-full shadow-xs shrink-0">
                Listo
              </span>
            </div>

            {/* Step 4 */}
            <div 
              onClick={() => navigate('/orders')}
              className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/15 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20">
                  <Check size={16} strokeWidth={3} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    Vendiste desde el POS
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    Tu punto de venta e integración web están listos
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-emerald-500/20 px-3 py-1 rounded-full shadow-xs shrink-0">
                Listo
              </span>
            </div>

          </div>

        </div>

        {/* Right Column: Support & Extra Actions (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Support / Lucas Card in Brand Orange (replicating Commercy blue card in orange) */}
          <div className="bg-gradient-to-br from-[#ea580c] via-[#f97316] to-[#c2410c] text-white rounded-[2rem] p-6 sm:p-7 shadow-xl shadow-orange-500/20 relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-4">
              
              {/* Agent status */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white text-orange-600 font-black flex items-center justify-center text-base shadow-md">
                  L
                </div>
                <div>
                  <h4 className="text-sm font-extrabold leading-tight">Lucas, de AxonMarket</h4>
                  <p className="text-[11px] text-white/80">Te responde hoy en minutos</p>
                </div>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold leading-snug">
                  ¿Venís de Tango o Excel? Lucas te ayuda a pasar tus productos y clientes
                </h3>
                <p className="text-xs text-white/85 mt-2 leading-relaxed">
                  Te responde una persona por WhatsApp, de lunes a viernes de 9 a 18.
                </p>
              </div>

            </div>

            {/* Actions */}
            <div className="pt-6 space-y-3">
              <button 
                onClick={handleSupportWhatsApp}
                className="w-full bg-white hover:bg-slate-50 text-orange-600 font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <MessageCircle size={16} />
                Escríbele a Lucas
              </button>

              <button 
                onClick={() => navigate('/support')}
                className="w-full text-white/90 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 py-1.5 transition-colors cursor-pointer"
              >
                <Play size={13} className="fill-current" />
                Ver tutoriales
              </button>
            </div>

          </div>

          {/* "Cuando quieras" Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200/80 dark:border-white/10 shadow-sm p-6 space-y-4">
            
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Cuando quieras</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">No hacen falta para tu primera venta.</p>
            </div>

            <div className="space-y-2.5 pt-1">
              
              {/* Option 1: Publicar tienda online */}
              <div 
                onClick={handleOpenVitrina}
                className="p-3.5 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10 hover:bg-slate-50/70 dark:hover:bg-white/5 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                    <Globe size={18} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white leading-tight group-hover:text-orange-600 transition-colors">
                      Publicar tu tienda online
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      Se publican sólo los productos con precio confirmado
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </div>

              {/* Option 2: Facturar en ARCA / AxonPOS */}
              <div 
                onClick={() => navigate('/preparation')}
                className="p-3.5 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10 hover:bg-slate-50/70 dark:hover:bg-white/5 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white leading-tight">
                      Facturar en ARCA / POS
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      Sincronizado con AxonPOS Desktop
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/20 px-2.5 py-0.5 rounded-md shrink-0 flex items-center gap-1">
                  🔒 Plan
                </span>
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
