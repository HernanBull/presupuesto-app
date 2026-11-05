import React, { useState, useEffect } from 'react';
import { 
  X, Check, Copy, CreditCard, ShieldCheck, Sparkles, 
  Smartphone, Building2, Hash, Calendar, DollarSign, 
  AlertCircle, ChevronRight, CheckCircle2, Clock, Zap
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import toast from 'react-hot-toast';

export default function SubscriptionPaymentModal({ isOpen, onClose, storeInfo, onPaymentReported }) {
  const [bcvRate, setBcvRate] = useState(888.89);
  const [copiedField, setCopiedField] = useState(null);
  const [loading, setLoading] = useState(false);

  // Selector de Plan: 'mensual' ($30) o 'trimestral' ($60 - 3 meses con 1 mes gratis)
  const [selectedPlan, setSelectedPlan] = useState('trimestral');

  // Formulario de Reporte de Pago
  const [reference, setReference] = useState('');
  const [amountVes, setAmountVes] = useState('');
  const [bankOrigin, setBankOrigin] = useState('0102 - Banco de Venezuela');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Datos Oficiales de Pago Móvil BNC (Cuenta Jurídica)
  const PAGO_MOVIL_DATA = {
    rif: 'J-50805614',
    bancoCodigo: '0191',
    bancoNombre: '0191 - Banco Nacional de Crédito (BNC)',
    telefono: '04243592392',
    titular: 'AxonMarket C.A.'
  };

  const PLANS = {
    mensual: {
      id: 'mensual',
      name: 'Plan Mensual',
      durationDays: 30,
      durationMonths: 1,
      priceUsd: 30,
      badge: 'Estándar',
      desc: 'Acceso completo a todos los módulos por 30 días.'
    },
    trimestral: {
      id: 'trimestral',
      name: 'Plan Trimestral Promo (3 Meses)',
      durationDays: 90,
      durationMonths: 3,
      priceUsd: 60,
      badge: '🔥 Paga 2 y Lleva 3 (1 Mes GRATIS)',
      desc: 'Pagas 2 meses ($60) y disfrutas de 3 meses completos. ¡Ahorras $30!'
    }
  };

  const currentPlan = PLANS[selectedPlan] || PLANS.trimestral;

  useEffect(() => {
    if (isOpen) {
      // Cargar tasa BCV oficial
      fetch('https://axonmarket-api.onrender.com/api/bcv')
        .then(res => res.json())
        .then(data => {
          if (data?.rate) {
            const r = Number(data.rate);
            setBcvRate(r);
            setAmountVes((currentPlan.priceUsd * r).toFixed(2));
          }
        })
        .catch(() => {
          const cached = Number(localStorage.getItem('axon_bcv_rate')) || 888.89;
          setBcvRate(cached);
          setAmountVes((currentPlan.priceUsd * cached).toFixed(2));
        });
    }
  }, [isOpen]);

  // Actualizar monto cuando cambia el plan
  useEffect(() => {
    if (bcvRate) {
      setAmountVes((currentPlan.priceUsd * bcvRate).toFixed(2));
    }
  }, [selectedPlan, bcvRate]);

  if (!isOpen) return null;

  const copyToClipboard = (text, fieldName) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success(`¡${fieldName} copiado!`);
      setTimeout(() => setCopiedField(null), 2500);
    } catch (e) {
      toast.error('No se pudo copiar automáticamente');
    }
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!reference.trim() || reference.trim().length < 4) {
      toast.error('Indica un número de referencia válido (mínimo 4 dígitos)');
      return;
    }

    setLoading(true);
    try {
      const workspaceId = localStorage.getItem('activeWorkspace');
      if (!workspaceId) throw new Error('Sesión de comercio no encontrada');

      const paymentRecord = {
        id: `sub-${Date.now()}`,
        workspace_id: workspaceId,
        merchant_name: storeInfo?.name || localStorage.getItem('merchant_store_name') || 'Mi Comercio',
        reference_number: reference.trim(),
        reference: reference.trim(),
        amount_ves: parseFloat(amountVes) || (currentPlan.priceUsd * bcvRate),
        amount_bs: parseFloat(amountVes) || (currentPlan.priceUsd * bcvRate),
        amount_usd: currentPlan.priceUsd,
        plan_type: selectedPlan,
        months_granted: currentPlan.durationMonths,
        duration_days: currentPlan.durationDays,
        bcv_rate: bcvRate,
        exchange_rate: bcvRate,
        bank_origin: bankOrigin,
        payment_date: paymentDate,
        status: 'Pendiente',
        created_at: new Date().toISOString()
      };

      // 1. Guardar en tabla merchant_subscription_payments (si existe)
      try {
        await supabase.from('merchant_subscription_payments').insert([paymentRecord]);
      } catch (dbErr) {
        console.warn('Notice inserting into merchant_subscription_payments:', dbErr);
      }

      // 2. Respaldo directo en el config del Workspace para disponibilidad 100% garantizada
      const { data: wsData } = await supabase
        .from('workspaces')
        .select('config')
        .eq('id', workspaceId)
        .maybeSingle();

      const existingConfig = wsData?.config || {};
      const updatedConfig = {
        ...existingConfig,
        paymentReported: true,
        lastSubscriptionPayment: paymentRecord
      };

      await supabase
        .from('workspaces')
        .update({ 
          config: updatedConfig,
          status: 'Pago_En_Revision'
        })
        .eq('id', workspaceId);

      // 3. Notificación local inmediata
      localStorage.setItem('subscription_payment_reported', 'true');
      toast.success('¡Pago reportado con éxito! SuperAdmin validará tu referencia bancaria en breve.', {
        duration: 6000,
        icon: '🎉'
      });

      if (onPaymentReported) onPaymentReported(paymentRecord);
      onClose();
    } catch (err) {
      console.error('Error reportando pago:', err);
      toast.error(err.message || 'Error al enviar el comprobante');
    } finally {
      setLoading(false);
    }
  };

  const totalVesEstimado = (currentPlan.priceUsd * bcvRate).toLocaleString('es-VE', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });

  return (
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden my-auto">
        
        {/* Encabezado Oficial AxonMarket */}
        <div className="relative p-6 sm:p-7 bg-gradient-to-br from-[#ea580c] via-[#ea580c] to-[#c2410c] text-white">
          <button 
            type="button" 
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 hover:bg-black/35 flex items-center justify-center transition-all text-white cursor-pointer active:scale-95"
          >
            <X size={18} />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-black uppercase tracking-wider mb-2.5 border border-white/20">
            <Sparkles size={13} className="text-amber-200" />
            <span>Suscripción Oficial AxonMarket</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black leading-tight tracking-tight">
            Planes Profesionales
          </h3>
          <p className="text-xs text-white/90 mt-1 max-w-sm">
            Activa o renueva todas las herramientas de tu tienda y POS Kiosco sin límites.
          </p>

          <div className="mt-4 flex flex-wrap items-baseline gap-2 pt-2 border-t border-white/20">
            <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight">${currentPlan.priceUsd}</span>
            <span className="text-xs font-bold text-white/80">/ {selectedPlan === 'trimestral' ? '3 meses' : 'mes'}</span>
            <span className="ml-auto text-xs font-bold text-white bg-black/25 px-3 py-1 rounded-full font-mono border border-white/15 shadow-2xs">
              ≈ Bs. {totalVesEstimado}
            </span>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">

          {/* Selector de Planes: Mensual vs Trimestral */}
          <div className="space-y-2.5">
            <label className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Zap size={14} className="text-orange-500" />
              <span>Selecciona tu Plan de Suscripción</span>
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Opción Trimestral */}
              <div 
                onClick={() => setSelectedPlan('trimestral')}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                  selectedPlan === 'trimestral'
                    ? 'border-orange-500 bg-orange-50/70 dark:bg-orange-500/10 shadow-sm'
                    : 'border-slate-200 dark:border-white/10 hover:border-slate-300'
                }`}
              >
                <div className="absolute -top-2.5 right-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[9px] font-black uppercase tracking-wider shadow-xs">
                  1 Mes GRATIS
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-slate-900 dark:text-white">Plan Trimestral</span>
                  <span className="text-base font-black font-mono text-orange-600">$60</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-tight">
                  Pagas 2 meses ($60) y disfrutas de <strong>3 meses</strong>. ¡Ahorras $30!
                </p>
                <div className="mt-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check size={12} /> 90 días de servicio continuo
                </div>
              </div>

              {/* Opción Mensual */}
              <div 
                onClick={() => setSelectedPlan('mensual')}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                  selectedPlan === 'mensual'
                    ? 'border-orange-500 bg-orange-50/70 dark:bg-orange-500/10 shadow-sm'
                    : 'border-slate-200 dark:border-white/10 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-slate-900 dark:text-white">Plan Mensual</span>
                  <span className="text-base font-black font-mono text-slate-900 dark:text-white">$30</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-tight">
                  Renovación estándar mensual de tu tienda y herramientas.
                </p>
                <div className="mt-2 text-[10px] font-bold text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                  <Check size={12} /> 30 días de servicio
                </div>
              </div>
            </div>
          </div>

          {/* Banner: Cashea (Próximamente) — 100% Paleta Axon (Sin Morado) */}
          <div className="bg-gradient-to-r from-orange-50/70 via-amber-50/40 to-slate-50 dark:from-zinc-800/90 dark:via-zinc-800/60 dark:to-zinc-800/30 p-3.5 sm:p-4 rounded-2xl border border-orange-200/80 dark:border-white/10 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#ea580c] text-white flex items-center justify-center font-black shrink-0 shadow-xs">
                <CreditCard size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide">
                    Paga en Cuotas con Cashea
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 text-[9px] font-black uppercase tracking-wider border border-orange-200 dark:border-orange-500/30">
                    Próximamente
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-zinc-300 mt-0.5 leading-snug">
                  Muy pronto podrás pagar tu plan profesional en cómodas cuotas sin interés mediante Cashea.
                </p>
              </div>
            </div>
          </div>

          {/* Tarjeta de Datos de Pago Móvil BNC Jurídico */}
          <div className="border border-orange-200 dark:border-orange-500/30 bg-orange-50/40 dark:bg-orange-500/5 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#ea580c] text-white flex items-center justify-center shadow-xs shrink-0">
                  <Smartphone size={17} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Pago Móvil BNC (Cuenta Jurídica)
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                    Transfiere directamente desde cualquier banco nacional
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 shadow-2xs">
                <ShieldCheck size={12} className="text-emerald-600" />
                Verificado
              </span>
            </div>

            {/* Fila: Banco */}
            <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/80 dark:border-white/10 text-xs shadow-2xs">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">BANCO DESTINO</span>
                <span className="font-extrabold text-slate-900 dark:text-white truncate block">{PAGO_MOVIL_DATA.bancoNombre}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(PAGO_MOVIL_DATA.bancoCodigo, 'Código de Banco')}
                className="px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-orange-700 dark:text-orange-400 font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border border-orange-200/60 dark:border-white/10 active:scale-95"
              >
                {copiedField === 'Código de Banco' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                <span>{copiedField === 'Código de Banco' ? '¡Copiado!' : 'Copiar 0191'}</span>
              </button>
            </div>

            {/* Fila: RIF */}
            <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/80 dark:border-white/10 text-xs shadow-2xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">RIF JURÍDICO</span>
                <span className="font-black text-slate-900 dark:text-white font-mono text-sm tracking-wide">{PAGO_MOVIL_DATA.rif}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(PAGO_MOVIL_DATA.rif, 'RIF')}
                className="px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-orange-700 dark:text-orange-400 font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border border-orange-200/60 dark:border-white/10 active:scale-95"
              >
                {copiedField === 'RIF' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                <span>{copiedField === 'RIF' ? '¡Copiado!' : 'Copiar RIF'}</span>
              </button>
            </div>

            {/* Fila: Teléfono */}
            <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/80 dark:border-white/10 text-xs shadow-2xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">TELÉFONO DE PAGO MÓVIL</span>
                <span className="font-black text-slate-900 dark:text-white font-mono text-sm tracking-wide">{PAGO_MOVIL_DATA.telefono}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(PAGO_MOVIL_DATA.telefono, 'Teléfono')}
                className="px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-orange-700 dark:text-orange-400 font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border border-orange-200/60 dark:border-white/10 active:scale-95"
              >
                {copiedField === 'Teléfono' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                <span>{copiedField === 'Teléfono' ? '¡Copiado!' : 'Copiar Teléfono'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-zinc-400 px-1 pt-1 font-medium border-t border-orange-200/60 dark:border-white/10">
              <span>Tasa Oficial BCV: <strong className="text-slate-900 dark:text-white font-mono">Bs. {bcvRate.toFixed(2)}</strong></span>
              <span>Monto a transferir: <strong className="text-orange-600 dark:text-orange-400 font-mono text-xs">Bs. {totalVesEstimado}</strong></span>
            </div>
          </div>

          {/* Formulario de Notificación de Pago */}
          <form onSubmit={handleSubmitPayment} className="space-y-4 pt-1">
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={15} className="text-orange-500" />
              <span>Reportar Comprobante de Pago Móvil</span>
            </h4>

            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-800 dark:text-zinc-200">
                Número de Referencia Bancaria (últimos 4 a 8 dígitos) *
              </label>
              <div className="relative">
                <Hash size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Ej: 849201"
                  value={reference}
                  onChange={(e) => setReference(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-white/15 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 shadow-2xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 dark:text-zinc-200">
                  Banco Emisor
                </label>
                <select
                  value={bankOrigin}
                  onChange={(e) => setBankOrigin(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-white/15 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 shadow-2xs"
                >
                  <option value="0102 - Banco de Venezuela">0102 - Banco de Venezuela</option>
                  <option value="0108 - Banco Provincial">0108 - Banco Provincial</option>
                  <option value="0134 - Banesco">0134 - Banesco</option>
                  <option value="0105 - Banco Mercantil">0105 - Banco Mercantil</option>
                  <option value="0191 - BNC">0191 - BNC</option>
                  <option value="0172 - Bancamiga">0172 - Bancamiga</option>
                  <option value="0114 - Banco del Caribe">0114 - Bancaribe</option>
                  <option value="0115 - Banco Exterior">0115 - Banco Exterior</option>
                  <option value="0163 - Banco del Tesoro">0163 - Banco del Tesoro</option>
                  <option value="Otro Banco">Otro Banco Nacional</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 dark:text-zinc-200">
                  Monto Pagado (Bs)
                </label>
                <input
                  type="text"
                  value={amountVes}
                  onChange={(e) => setAmountVes(e.target.value)}
                  placeholder="Ej: 26846.63"
                  className="w-full px-3 py-2.5 bg-white dark:bg-zinc-800 border border-slate-300 dark:border-white/15 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-500 shadow-2xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-orange-500/25 active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Validando comprobante...</span>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Confirmar Comprobante ({currentPlan.name})</span>
                </>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
