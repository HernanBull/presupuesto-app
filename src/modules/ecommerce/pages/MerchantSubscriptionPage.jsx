import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Check, Copy, CreditCard, ShieldCheck, Sparkles, 
  Smartphone, Building2, Hash, Calendar, DollarSign, 
  AlertCircle, ChevronRight, CheckCircle2, Clock, Zap, Upload, Image, X, FileText
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import toast from 'react-hot-toast';

export default function MerchantSubscriptionPage() {
  const navigate = useNavigate();
  const [bcvRate, setBcvRate] = useState(888.89);
  const [copiedField, setCopiedField] = useState(null);
  const [loading, setLoading] = useState(false);
  const [storeInfo, setStoreInfo] = useState({ name: 'Mi Comercio', status: 'En_Prueba' });
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(7);
  const [subscriptionEndsAt, setSubscriptionEndsAt] = useState(null);

  // Selector de Plan: 'mensual' ($30) o 'trimestral' ($60 - 3 meses con 1 mes gratis)
  const [selectedPlan, setSelectedPlan] = useState('trimestral');

  // Formulario de Reporte de Pago
  const [reference, setReference] = useState('');
  const [amountVes, setAmountVes] = useState('');
  const [bankOrigin, setBankOrigin] = useState('0102 - Banco de Venezuela');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Archivo adjunto (captura del Pago Móvil)
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);

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
      desc: 'Acceso completo a todos los módulos y herramientas por 30 días continuos.'
    },
    trimestral: {
      id: 'trimestral',
      name: 'Plan Trimestral Promo (3 Meses)',
      durationDays: 90,
      durationMonths: 3,
      priceUsd: 60,
      badge: '🔥 Paga 2 y Lleva 3 (1 Mes GRATIS)',
      desc: 'Pagas 2 meses ($60) y disfrutas de 3 meses completos de servicio. ¡Ahorras $30 USD!'
    }
  };

  const currentPlan = PLANS[selectedPlan] || PLANS.trimestral;

  useEffect(() => {
    // 1. Cargar datos del comercio y calcular días restantes de prueba
    const wsId = localStorage.getItem('activeWorkspace');
    if (wsId) {
      supabase.from('workspaces').select('name, store_slug, status, config, created_at').eq('id', wsId).maybeSingle()
        .then(({ data }) => {
          if (data) {
            setStoreInfo({
              name: data.name || 'Mi Comercio',
              slug: data.store_slug || '',
              status: data.status || 'Activo'
            });

            const trialEndStr = data.config?.trialEndsAt;
            if (trialEndStr) {
              const diffDays = Math.ceil((new Date(trialEndStr) - new Date()) / (1000 * 60 * 60 * 24));
              setTrialDaysRemaining(Math.max(0, diffDays));
            } else if (data.created_at) {
              const end = new Date(new Date(data.created_at).getTime() + 7 * 24 * 60 * 60 * 1000);
              const diffDays = Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24));
              setTrialDaysRemaining(Math.max(0, diffDays));
            }

            if (data.config?.subscriptionEndsAt) {
              setSubscriptionEndsAt(data.config.subscriptionEndsAt);
            }
          }
        })
        .catch(console.error);
    }

    // 2. Cargar tasa BCV oficial
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
  }, []);

  // Actualizar monto al cambiar plan o tasa BCV
  useEffect(() => {
    if (bcvRate) {
      setAmountVes((currentPlan.priceUsd * bcvRate).toFixed(2));
    }
  }, [selectedPlan, bcvRate]);

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

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error('El archivo es muy pesado (máximo 8 MB)');
      return;
    }

    setReceiptFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setReceiptPreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview(null);
    }
  };

  const handleRemoveFile = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
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

      let receiptUrl = null;

      // Subir archivo adjunto si el usuario seleccionó uno
      if (receiptFile) {
        setUploadingFile(true);
        try {
          const fileExt = receiptFile.name.split('.').pop() || 'jpg';
          const filePath = `subscriptions/${workspaceId}_${Date.now()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('ecommerce')
            .upload(filePath, receiptFile, { upsert: true });

          if (!uploadError) {
            const { data: urlData } = supabase.storage.from('ecommerce').getPublicUrl(filePath);
            receiptUrl = urlData?.publicUrl || null;
          } else {
            console.warn('Fallo upload storage, usando vista previa base64:', uploadError);
            receiptUrl = receiptPreview; // fallback Base64
          }
        } catch (fileErr) {
          console.warn('Error subiendo archivo:', fileErr);
          receiptUrl = receiptPreview;
        } finally {
          setUploadingFile(false);
        }
      }

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
        receipt_url: receiptUrl,
        receipt_filename: receiptFile?.name || null,
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
      toast.success('¡Comprobante enviado con éxito! SuperAdmin validará tu pago en breve.', {
        duration: 6000,
        icon: '🎉'
      });

      setStoreInfo(prev => ({ ...prev, status: 'Pago_En_Revision' }));
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
    <div className="w-full min-h-screen bg-[#f4f7fb] dark:bg-black font-sans pb-32">
      
      {/* Barra Superior con botón Volver */}
      <div className="bg-white dark:bg-zinc-900 border-b border-slate-200/80 dark:border-white/10 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs flex items-center justify-between">
        <button
          onClick={() => navigate('/more')}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-zinc-300 hover:text-orange-600 transition-colors cursor-pointer"
        >
          <ArrowLeft size={18} />
          <span>Volver a Más</span>
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-black">
          <Sparkles size={14} />
          <span>Plan VIP</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">

        {/* Encabezado Principal */}
        <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-orange-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-15 pointer-events-none">
            <Sparkles size={110} />
          </div>
          <div className="relative z-10 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-black uppercase tracking-wider">
                AxonMarket VIP
              </span>
              <span className={`text-[10px] font-black px-3 py-1 rounded-full ${
                storeInfo.status === 'Activo'
                  ? 'bg-emerald-500 text-white'
                  : storeInfo.status === 'Pago_En_Revision'
                    ? 'bg-amber-400 text-slate-950 animate-pulse font-black'
                    : trialDaysRemaining > 2
                      ? 'bg-white/25 text-white'
                      : 'bg-red-500 text-white animate-pulse'
              }`}>
                {storeInfo.status === 'Activo'
                  ? 'Suscripción Activa'
                  : storeInfo.status === 'Pago_En_Revision'
                    ? 'Pago en Revisión'
                    : trialDaysRemaining > 0
                      ? `${trialDaysRemaining} días de prueba`
                      : 'Prueba Vencida'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black leading-tight tracking-tight">
              {storeInfo.status === 'Activo' ? 'Tu Plan VIP está Activo' : 'Activa o Renueva tu Plan VIP'}
            </h1>
            <p className="text-sm text-white/95 max-w-2xl leading-relaxed">
              Disfruta sin límites de todo el ecosistema: POS Mostrador, Facturación SENIAT, Control de Caja F9, Catálogo Online 24/7 y 21 permisos de equipo.
            </p>

            {/* Temporizador de los 7 días */}
            {storeInfo.status !== 'Activo' && (
              <div className="bg-black/20 backdrop-blur-md p-4 rounded-2xl border border-white/20 space-y-2 mt-4">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span className="flex items-center gap-2">
                    <Clock size={16} />
                    <span>Temporizador de Prueba (7 Días)</span>
                  </span>
                  <span className="font-mono font-black text-amber-200">
                    {trialDaysRemaining > 0 ? `${trialDaysRemaining} días restantes` : 'Período Culminado'}
                  </span>
                </div>
                <div className="w-full bg-black/30 h-2.5 rounded-full overflow-hidden p-0.5">
                  <div 
                    className="bg-white h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(10, (trialDaysRemaining / 7) * 100))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-white/80 font-bold">
                  <span>Día {Math.max(1, 8 - trialDaysRemaining)} de 7</span>
                  <span>{trialDaysRemaining > 0 ? 'Acceso completo temporal' : 'Requiere pago móvil para reactivar'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 1. Selector de Planes (Mensual vs Trimestral) */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
                <Zap className="text-orange-500" size={20} />
                <span>1. Elige tu Plan de Suscripción</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Selecciona la modalidad de pago que prefieras para tu negocio.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Opción Trimestral (Paga 2 y Lleva 3) */}
            <div 
              onClick={() => setSelectedPlan('trimestral')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                selectedPlan === 'trimestral'
                  ? 'border-orange-500 bg-orange-50/60 dark:bg-orange-500/10 shadow-md ring-2 ring-orange-500/20'
                  : 'border-slate-200 dark:border-white/10 hover:border-slate-300'
              }`}
            >
              <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                🔥 1 Mes GRATIS
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-black text-slate-900 dark:text-white uppercase">Plan Trimestral</span>
                  <div className="text-right">
                    <span className="text-2xl font-black font-mono text-orange-600">$60</span>
                    <span className="text-xs text-slate-400 block">por 3 meses</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed mt-1">
                  Pagas 2 meses ($60) y disfrutas de <strong>3 meses continuos</strong>. ¡Ahorras $30 USD!
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <span className="flex items-center gap-1.5"><Check size={14} /> 90 días de acceso total</span>
                <span className="font-mono text-slate-500 text-[11px]">≈ Bs. {(60 * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Opción Mensual */}
            <div 
              onClick={() => setSelectedPlan('mensual')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                selectedPlan === 'mensual'
                  ? 'border-orange-500 bg-orange-50/60 dark:bg-orange-500/10 shadow-md ring-2 ring-orange-500/20'
                  : 'border-slate-200 dark:border-white/10 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-black text-slate-900 dark:text-white uppercase">Plan Mensual</span>
                  <div className="text-right">
                    <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">$30</span>
                    <span className="text-xs text-slate-400 block">por 1 mes</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed mt-1">
                  Renovación estándar mensual de tu tienda y POS Kiosco.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs font-bold text-slate-700 dark:text-zinc-300">
                <span className="flex items-center gap-1.5"><Check size={14} /> 30 días de acceso</span>
                <span className="font-mono text-slate-500 text-[11px]">≈ Bs. {(30 * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Banner de Cashea (Próximamente) */}
          <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-pink-50 dark:from-purple-950/20 dark:via-indigo-950/20 dark:to-pink-950/20 p-4 rounded-2xl border border-purple-200 dark:border-purple-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black shrink-0 shadow-sm">
                <CreditCard size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-purple-950 dark:text-purple-200 uppercase tracking-wide">
                    Paga en Cuotas con Cashea
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-purple-200 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 text-[9px] font-black uppercase tracking-wider">
                    Próximamente
                  </span>
                </div>
                <p className="text-xs text-purple-900/80 dark:text-purple-300/80 mt-0.5">
                  Muy pronto podrás pagar tu Plan VIP en cuotas sin interés mediante Cashea a crédito.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Datos Oficiales de Pago Móvil BNC */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
                <Building2 className="text-orange-500" size={20} />
                <span>2. Datos de Pago Móvil BNC (Cuenta Jurídica)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Transfiere desde cualquier banco nacional con los datos corporativos oficiales.
              </p>
            </div>
            <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-800">
              Verificado
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Banco */}
            <div className="p-3.5 bg-slate-50 dark:bg-zinc-800 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">BANCO BNC</span>
                <span className="font-bold text-xs text-slate-900 dark:text-white mt-1 block">{PAGO_MOVIL_DATA.bancoNombre}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(PAGO_MOVIL_DATA.bancoCodigo, 'Código 0191')}
                className="mt-3 w-full py-1.5 rounded-xl bg-white dark:bg-zinc-700 hover:bg-slate-100 text-slate-700 dark:text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-200 dark:border-white/10 cursor-pointer shadow-2xs"
              >
                {copiedField === 'Código 0191' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                <span>Copiar 0191</span>
              </button>
            </div>

            {/* RIF */}
            <div className="p-3.5 bg-slate-50 dark:bg-zinc-800 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">RIF JURÍDICO</span>
                <span className="font-mono font-black text-sm text-slate-900 dark:text-white mt-1 block">{PAGO_MOVIL_DATA.rif}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(PAGO_MOVIL_DATA.rif, 'RIF')}
                className="mt-3 w-full py-1.5 rounded-xl bg-white dark:bg-zinc-700 hover:bg-slate-100 text-slate-700 dark:text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-200 dark:border-white/10 cursor-pointer shadow-2xs"
              >
                {copiedField === 'RIF' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                <span>Copiar RIF</span>
              </button>
            </div>

            {/* Teléfono */}
            <div className="p-3.5 bg-slate-50 dark:bg-zinc-800 rounded-2xl border border-slate-200/80 dark:border-white/10 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">TELÉFONO PAGO MÓVIL</span>
                <span className="font-mono font-black text-sm text-slate-900 dark:text-white mt-1 block">{PAGO_MOVIL_DATA.telefono}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(PAGO_MOVIL_DATA.telefono, 'Teléfono')}
                className="mt-3 w-full py-1.5 rounded-xl bg-white dark:bg-zinc-700 hover:bg-slate-100 text-slate-700 dark:text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-200 dark:border-white/10 cursor-pointer shadow-2xs"
              >
                {copiedField === 'Teléfono' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                <span>Copiar Teléfono</span>
              </button>
            </div>
          </div>

          <div className="p-3 bg-orange-50/50 dark:bg-orange-500/10 rounded-2xl border border-orange-200 dark:border-orange-500/20 flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-zinc-300">
              Tasa oficial BCV: <strong className="font-mono text-slate-900 dark:text-white">Bs. {bcvRate.toFixed(2)}</strong>
            </span>
            <span className="text-orange-700 dark:text-orange-300 font-bold">
              Monto a transferir: <strong className="font-mono text-base font-black">Bs. {totalVesEstimado}</strong> (${currentPlan.priceUsd} USD)
            </span>
          </div>
        </div>

        {/* 3. Formulario de Notificación con Carga de Comprobante */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
              <Upload className="text-orange-500" size={20} />
              <span>3. Reportar Comprobante & Captura de Pago</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Ingresa los datos bancarios y adjunta la captura del pago para su conciliación inmediata en SuperAdmin.
            </p>
          </div>

          <form onSubmit={handleSubmitPayment} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Referencia */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Número de Referencia Bancaria (4 a 8 dígitos) *
                </label>
                <div className="relative">
                  <Hash size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ej: 849201"
                    value={reference}
                    onChange={(e) => setReference(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-2xl text-sm font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Banco Emisor */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Banco de Origen (Emisor) *
                </label>
                <select
                  value={bankOrigin}
                  onChange={(e) => setBankOrigin(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-800 dark:text-white outline-none"
                >
                  <option value="0102 - Banco de Venezuela">0102 - Banco de Venezuela</option>
                  <option value="0108 - Banco Provincial">0108 - Banco Provincial</option>
                  <option value="0134 - Banesco">0134 - Banesco</option>
                  <option value="0105 - Banco Mercantil">0105 - Banco Mercantil</option>
                  <option value="0191 - BNC">0191 - BNC</option>
                  <option value="0172 - Bancamiga">0172 - Bancamiga</option>
                  <option value="0114 - Bancaribe">0114 - Bancaribe</option>
                  <option value="0115 - Banco Exterior">0115 - Banco Exterior</option>
                  <option value="0163 - Banco del Tesoro">0163 - Banco del Tesoro</option>
                  <option value="Otro Banco">Otro Banco Nacional</option>
                </select>
              </div>

              {/* Monto Pagado */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Monto Pagado en Bolívares (Bs) *
                </label>
                <input
                  type="text"
                  required
                  value={amountVes}
                  onChange={(e) => setAmountVes(e.target.value)}
                  placeholder="Ej: 53333.40"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-mono font-bold text-slate-800 dark:text-white outline-none"
                />
              </div>

              {/* Fecha de Pago */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Fecha de la Transferencia *
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-800 dark:text-white outline-none"
                />
              </div>
            </div>

            {/* Subida de Archivo / Captura de Pago Móvil */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                <span>Captura o Comprobante del Pago Móvil (Recomendado)</span>
                {receiptFile && <span className="text-[10px] text-emerald-600 font-bold">1 archivo adjunto</span>}
              </label>

              {!receiptFile ? (
                <label className="border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-orange-500 dark:hover:border-orange-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-zinc-800/40">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-2">
                    <Image size={24} />
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-white">
                    Toca para seleccionar o tomar foto de la captura
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">
                    Formatos JPG, PNG o PDF (máx. 8 MB)
                  </span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="p-3 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {receiptPreview ? (
                      <img 
                        src={receiptPreview} 
                        alt="Comprobante" 
                        className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-white/10 shrink-0" 
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 flex items-center justify-center shrink-0">
                        <FileText size={24} />
                      </div>
                    )}
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{receiptFile.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{(receiptFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    title="Quitar archivo"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || uploadingFile}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm uppercase tracking-wider transition-all shadow-xl shadow-orange-500/25 active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
            >
              {loading ? (
                <span>Validando y enviando comprobante...</span>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>Enviar Comprobante ({currentPlan.name} · ${currentPlan.priceUsd})</span>
                </>
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
