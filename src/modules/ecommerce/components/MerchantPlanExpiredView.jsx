// src/modules/ecommerce/components/MerchantPlanExpiredView.jsx
import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, Download, Copy, Check, ShieldCheck, Sparkles, 
  Smartphone, Building2, Upload, FileText, CheckCircle2, Clock, 
  ArrowLeft, RefreshCw, FileSpreadsheet, FileJson, LogOut, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../supabaseClient';
import { 
  downloadProfessionalExcelTemplate,
  downloadProfessionalWordTemplate,
  downloadNumericBackupCSV,
  downloadNumericBackupJSON,
  copyNumericSummaryToClipboard 
} from '../services/numericBackupService';

export default function MerchantPlanExpiredView({ 
  workspace, 
  onClose, 
  onLogout 
}) {
  const [bcvRate, setBcvRate] = useState(888.89);
  const [selectedPlan, setSelectedPlan] = useState('mensual'); // 'mensual' ($30) o 'trimestral' ($60)
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingWord, setDownloadingWord] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [copyingSummary, setCopyingSummary] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  // Formulario de pago
  const [reference, setReference] = useState('');
  const [amountVes, setAmountVes] = useState('');
  const [bankOrigin, setBankOrigin] = useState('0102 - Banco de Venezuela');
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentReported, setPaymentReported] = useState(() => {
    return workspace?.status === 'Pago_En_Revision' || workspace?.config?.paymentReported === true;
  });

  const storeName = workspace?.name || 'Mi Comercio';
  const workspaceId = workspace?.id;

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
      priceUsd: 30,
      durationMonths: 1,
      badge: 'Estándar',
      desc: '30 días de acceso total a POS, catálogo ilimitado, vitrina y gestión.'
    },
    trimestral: {
      id: 'trimestral',
      name: 'Plan Trimestral',
      priceUsd: 60,
      durationMonths: 3,
      badge: '🔥 Ahorra $30 (Paga 2 y Lleva 3)',
      desc: 'Pagas 2 meses ($60) y disfrutas 3 meses completos de servicio ininterrumpido.'
    }
  };

  const currentPlan = PLANS[selectedPlan] || PLANS.mensual;

  // Cargar tasa BCV oficial
  useEffect(() => {
    supabase.from('app_settings').select('bcv_rate').limit(1).maybeSingle()
      .then(({ data }) => {
        if (data?.bcv_rate) {
          const r = parseFloat(data.bcv_rate);
          setBcvRate(r);
          setAmountVes((currentPlan.priceUsd * r).toFixed(2));
        }
      })
      .catch(() => {
        setAmountVes((currentPlan.priceUsd * bcvRate).toFixed(2));
      });
  }, [selectedPlan]);

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`¡${fieldName} copiado!`, { duration: 2000 });
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleDownloadExcel = async () => {
    if (!workspaceId) return;
    setDownloadingExcel(true);
    try {
      await downloadProfessionalExcelTemplate(workspaceId, storeName);
      toast.success('¡Plantilla contable de Excel (.xls) descargada con éxito!');
    } catch (err) {
      toast.error('Error al generar plantilla Excel: ' + err.message);
    } finally {
      setDownloadingExcel(false);
    }
  };

  const handleDownloadWord = async () => {
    if (!workspaceId) return;
    setDownloadingWord(true);
    try {
      await downloadProfessionalWordTemplate(workspaceId, storeName);
      toast.success('¡Informe formal para Word (.doc) descargado con éxito!');
    } catch (err) {
      toast.error('Error al generar informe Word: ' + err.message);
    } finally {
      setDownloadingWord(false);
    }
  };

  const handleDownloadJSON = async () => {
    if (!workspaceId) return;
    setDownloadingJson(true);
    try {
      await downloadNumericBackupJSON(workspaceId, storeName);
      toast.success('¡Respaldo numérico JSON descargado con éxito!');
    } catch (err) {
      toast.error('Error al generar respaldo JSON: ' + err.message);
    } finally {
      setDownloadingJson(false);
    }
  };

  const handleDownloadCSV = async () => {
    if (!workspaceId) return;
    setDownloadingCsv(true);
    try {
      await downloadNumericBackupCSV(workspaceId, storeName);
      toast.success('¡Respaldo numérico CSV descargado con éxito!');
    } catch (err) {
      toast.error('Error al generar respaldo CSV: ' + err.message);
    } finally {
      setDownloadingCsv(false);
    }
  };

  const handleCopySummary = async () => {
    if (!workspaceId) return;
    setCopyingSummary(true);
    try {
      await copyNumericSummaryToClipboard(workspaceId);
      toast.success('¡Resumen contable copiado al portapapeles!');
    } catch (err) {
      toast.error('Error al copiar resumen: ' + err.message);
    } finally {
      setCopyingSummary(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        toast.error('La imagen no debe superar 8MB');
        return;
      }
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setReceiptPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleReportPayment = async (e) => {
    e.preventDefault();
    if (!reference.trim()) {
      toast.error('Ingresa el número de referencia del Pago Móvil');
      return;
    }
    if (!receiptFile && !receiptPreview) {
      toast.error('Adjunta la captura del comprobante');
      return;
    }

    setSubmittingPayment(true);
    try {
      let receiptUrl = null;

      // 1. Subida a Supabase Storage
      if (receiptFile) {
        try {
          const fileExt = receiptFile.name.split('.').pop() || 'jpg';
          const filePath = `receipts/${workspaceId}_sub_${Date.now()}.${fileExt}`;
          const { error: upErr } = await supabase.storage
            .from('ecommerce')
            .upload(filePath, receiptFile, { upsert: true });

          if (!upErr) {
            const { data: pubData } = supabase.storage.from('ecommerce').getPublicUrl(filePath);
            receiptUrl = pubData?.publicUrl || null;
          } else {
            receiptUrl = receiptPreview;
          }
        } catch (_) {
          receiptUrl = receiptPreview;
        }
      }

      const paymentRecord = {
        id: `sub-${Date.now()}`,
        workspace_id: workspaceId,
        merchant_name: storeName,
        reference_number: reference.trim(),
        reference: reference.trim(),
        amount_usd: currentPlan.priceUsd,
        amount_ves: parseFloat(amountVes) || (currentPlan.priceUsd * bcvRate),
        amount_bs: parseFloat(amountVes) || (currentPlan.priceUsd * bcvRate),
        plan_type: selectedPlan,
        months_granted: currentPlan.durationMonths,
        bcv_rate: bcvRate,
        bank_origin: bankOrigin,
        receipt_url: receiptUrl,
        receipt_filename: receiptFile?.name || null,
        status: 'Pendiente',
        created_at: new Date().toISOString()
      };

      // 2. Guardar en tabla de suscripciones
      try {
        await supabase.from('merchant_subscription_payments').insert([paymentRecord]);
      } catch (insertErr) {
        console.warn('Notice inserting into merchant_subscription_payments:', insertErr);
      }

      // 3. Actualizar workspace a Pago_En_Revision
      const { data: wsData } = await supabase.from('workspaces').select('config').eq('id', workspaceId).maybeSingle();
      const existingConfig = wsData?.config || {};
      const updatedConfig = {
        ...existingConfig,
        paymentReported: true,
        lastSubscriptionPayment: paymentRecord
      };

      await supabase.from('workspaces').update({
        status: 'Pago_En_Revision',
        config: updatedConfig
      }).eq('id', workspaceId);

      setPaymentReported(true);
      toast.success('¡Comprobante enviado con éxito! SuperAdmin validará tu pago para reactivar tu cuenta.', {
        duration: 8000,
        icon: '🎉'
      });
    } catch (err) {
      console.error('Error reportando pago:', err);
      toast.error('Error al enviar el comprobante: ' + (err.message || 'Intenta de nuevo'));
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md overflow-y-auto flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl sm:rounded-[2rem] max-w-2xl w-full shadow-2xl overflow-hidden my-auto">
        
        {/* Cabecera de Alerta */}
        <div className="bg-gradient-to-r from-rose-600 via-orange-600 to-amber-600 p-6 sm:p-8 text-white relative">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-black uppercase tracking-wider text-white">
              <Clock size={13} />
              <span>Prueba VIP Finalizada</span>
            </span>

            {onLogout && (
              <button 
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/25 hover:bg-black/40 text-xs font-bold text-white transition-colors cursor-pointer"
                title="Cerrar sesión"
              >
                <LogOut size={13} />
                <span>Cerrar Sesión</span>
              </button>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-black leading-tight drop-shadow-xs">
            Tu período de prueba de 7 días ha concluido
          </h1>
          <p className="text-xs sm:text-sm text-white/90 font-medium mt-1 leading-relaxed">
            Comercio: <strong className="text-white underline">{storeName}</strong>. Para continuar operando tu punto de venta, inventario en tiempo real y vitrina en Axon Market, reactiva tu Plan VIP.
          </p>
        </div>

        <div className="p-5 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto scrollbar-hide">
          
          {/* SECCIÓN 1: RESPALDO NUMÉRICO DE SEGURIDAD (PARA NO DEJARLO EN LA CALLE) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5">
                <ShieldCheck size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Tus datos son tuyos: Descarga tu Respaldo Numérico
                </h3>
                <p className="text-xs text-slate-600 dark:text-zinc-300 mt-0.5 leading-relaxed">
                  No te dejamos sin tu información. Puedes exportar o copiar de inmediato todas tus ventas, pedidos, inventario, precios y stock en formato contable (números y texto, sin fotos pesadas).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleDownloadExcel}
                disabled={downloadingExcel}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <FileSpreadsheet size={17} />
                <span>{downloadingExcel ? 'Generando Excel...' : '📊 Plantilla Excel (.xls)'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadWord}
                disabled={downloadingWord}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <FileText size={17} />
                <span>{downloadingWord ? 'Generando Word...' : '📄 Informe Word (.doc)'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadCSV}
                disabled={downloadingCsv}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 hover:bg-slate-50 text-slate-800 dark:text-white text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Download size={14} className="text-orange-500" />
                <span>{downloadingCsv ? 'Descargando...' : '📑 Archivo CSV'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopySummary}
                disabled={copyingSummary}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 hover:bg-slate-50 text-slate-800 dark:text-white text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Copy size={14} className="text-amber-600" />
                <span>{copyingSummary ? 'Copiando...' : '📋 Copiar Resumen'}</span>
              </button>
            </div>
          </div>

          {/* SECCIÓN 2: FORMULARIO DE REACTIVACIÓN / ESTADO DE PAGO */}
          {paymentReported ? (
            <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-base font-black text-emerald-950 dark:text-emerald-300">
                ¡Comprobante de Pago en Revisión!
              </h3>
              <p className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-200/90 leading-relaxed max-w-md mx-auto">
                Hemos recibido los datos de tu Pago Móvil y tu comprobante adjunto. El equipo administrativo de AxonMarket está validando la acreditación bancaria para reactivar tu acceso VIP de inmediato.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <RefreshCw size={14} />
                  <span>Verificar Estado Actual</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              
              {/* Selector de Plan */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-2">
                  1. Selecciona tu Plan VIP:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.values(PLANS).map(plan => {
                    const isSelected = selectedPlan === plan.id;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlan(plan.id)}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-orange-50/80 dark:bg-orange-500/15 border-2 border-orange-500 shadow-md ring-2 ring-orange-500/20'
                            : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 hover:border-orange-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {plan.name}
                          </span>
                          <span className="text-base font-black text-orange-600">
                            ${plan.priceUsd} USD
                          </span>
                        </div>
                        <span className="inline-block text-[10px] font-bold text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-500/20 px-2 py-0.5 rounded-full mb-1">
                          {plan.badge}
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
                          {plan.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Datos de Pago Móvil BNC (Cuenta Jurídica) */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                    <Building2 size={16} className="text-orange-500" />
                    <span>2. Datos de Pago Móvil (Cuenta Jurídica)</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 bg-white dark:bg-zinc-700 px-2 py-0.5 rounded-md border border-slate-200 dark:border-zinc-600">
                    Tasa BCV: {bcvRate.toFixed(2)} Bs/$
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Banco Receptor:</span>
                      <strong className="text-slate-800 dark:text-zinc-100">0191 - BNC</strong>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => copyToClipboard('0191', 'Banco BNC')}
                      className="p-1.5 text-slate-400 hover:text-orange-500 cursor-pointer"
                    >
                      {copiedField === 'Banco BNC' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">RIF Jurídico:</span>
                      <strong className="text-slate-800 dark:text-zinc-100">{PAGO_MOVIL_DATA.rif}</strong>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => copyToClipboard(PAGO_MOVIL_DATA.rif, 'RIF')}
                      className="p-1.5 text-slate-400 hover:text-orange-500 cursor-pointer"
                    >
                      {copiedField === 'RIF' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">Teléfono Receptor:</span>
                      <strong className="text-slate-800 dark:text-zinc-100">{PAGO_MOVIL_DATA.telefono}</strong>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => copyToClipboard(PAGO_MOVIL_DATA.telefono, 'Teléfono')}
                      className="p-1.5 text-slate-400 hover:text-orange-500 cursor-pointer"
                    >
                      {copiedField === 'Teléfono' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-orange-50/80 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-orange-600 block font-bold">Monto Exacto a Transferir:</span>
                      <strong className="text-orange-700 dark:text-orange-400 text-sm">
                        Bs. {(currentPlan.priceUsd * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => copyToClipboard((currentPlan.priceUsd * bcvRate).toFixed(2), 'Monto Bs')}
                      className="p-1.5 text-orange-600 hover:text-orange-700 cursor-pointer"
                    >
                      {copiedField === 'Monto Bs' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Formulario de Reporte */}
              <form onSubmit={handleReportPayment} className="space-y-4 pt-1">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  3. Reporta tu Referencia y Comprobante:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-300 mb-1">
                      Banco Emisor:
                    </label>
                    <select
                      value={bankOrigin}
                      onChange={(e) => setBankOrigin(e.target.value)}
                      className="w-full text-xs font-medium px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="0102 - Banco de Venezuela">0102 - Banco de Venezuela</option>
                      <option value="0108 - Banco Provincial">0108 - Banco Provincial</option>
                      <option value="0134 - Banesco">0134 - Banesco</option>
                      <option value="0105 - Banco Mercantil">0105 - Banco Mercantil</option>
                      <option value="0191 - BNC">0191 - BNC</option>
                      <option value="0114 - Bancaribe">0114 - Bancaribe</option>
                      <option value="0115 - Banco Exterior">0115 - Banco Exterior</option>
                      <option value="0172 - Bancamiga">0172 - Bancamiga</option>
                      <option value="Otro Banco">Otro Banco Nacional</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-300 mb-1">
                      Número de Referencia:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. 12345678"
                      value={reference}
                      onChange={(e) => setReference(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-xs font-medium px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                </div>

                {/* Subida de Comprobante / Screenshot */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-300 mb-1">
                    Captura del Comprobante (Screenshot):
                  </label>
                  <label className="border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-orange-500 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50/50 dark:bg-zinc-800/40 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {receiptPreview ? (
                      <div className="flex flex-col items-center gap-2">
                        <img 
                          src={receiptPreview} 
                          alt="Comprobante" 
                          className="max-h-36 rounded-xl object-contain border border-slate-200 dark:border-zinc-700 shadow-xs" 
                        />
                        <span className="text-[11px] font-bold text-orange-600 hover:underline">
                          Cambiar imagen
                        </span>
                      </div>
                    ) : (
                      <>
                        <Upload size={24} className="text-slate-400 dark:text-zinc-500" />
                        <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 text-center">
                          Toca aquí para subir el capture de tu Pago Móvil
                        </span>
                        <span className="text-[10px] text-slate-400">JPG, PNG o WEBP (máx. 8MB)</span>
                      </>
                    )}
                  </label>
                </div>

                {/* Botón de Enviar */}
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="w-full py-3.5 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-black text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submittingPayment ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Enviando comprobante...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Reportar Pago y Reactivar Plan VIP (${currentPlan.priceUsd})</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

