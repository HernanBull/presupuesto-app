import React, { useState, useEffect } from 'react';
import { 
  Wallet, DollarSign, Store, ArrowUpRight, ArrowDownRight, 
  RefreshCw, CheckCircle2, Clock, Users, QrCode, Copy, ExternalLink,
  ChevronRight, AlertCircle, ShoppingBag, Landmark, Smartphone,
  ShieldCheck, PlusCircle, Calculator, Layers, Receipt, CreditCard,
  Banknote, ArrowRightLeft, Zap
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import toast from 'react-hot-toast';
import UserManagementModal from '../components/admin/UserManagementModal';

export default function MerchantCashMasterView() {
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [storeName, setStoreName] = useState(() => localStorage.getItem('merchant_store_name') || 'Mi Comercio');
  const [storeSlug, setStoreSlug] = useState(() => localStorage.getItem('storeSlug') || '');
  const [configuredRegisters, setConfiguredRegisters] = useState([]);
  const [bcvRate, setBcvRate] = useState(888.89);
  const [selectedShiftForQr, setSelectedShiftForQr] = useState(null);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState(false);

  const workspaceId = localStorage.getItem('activeWorkspace');

  const fetchMerchantCashData = async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 1. Obtener tasa BCV oficial
      fetch('https://axonmarket-api.onrender.com/api/bcv')
        .then(res => res.json())
        .then(data => {
          if (data?.rate) setBcvRate(Number(data.rate));
        })
        .catch(() => {});

      // 2. Obtener datos del comercio (Workspace config)
      const { data: wsData, error: wsErr } = await supabase
        .from('workspaces')
        .select('id, name, store_slug, config')
        .eq('id', workspaceId)
        .maybeSingle();

      if (!wsErr && wsData) {
        if (wsData.name) setStoreName(wsData.name);
        if (wsData.store_slug) setStoreSlug(wsData.store_slug);

        const cfg = typeof wsData.config === 'object' ? (wsData.config || {}) : (() => {
          try { return JSON.parse(wsData.config || '{}'); } catch(e) { return {}; }
        })();

        const rawRegs = Array.isArray(cfg.cashRegisters) && cfg.cashRegisters.length > 0
          ? cfg.cashRegisters
          : [
              { id: 'caja-1', name: 'Caja 1 - Principal', isDefault: true, enabled: true },
              { id: 'caja-2', name: 'Caja 2 - Rápida', enabled: true }
            ];
        setConfiguredRegisters(rawRegs);
      }

      // 3. Obtener turnos de caja exclusivos de este comercio
      const { data: shiftsData, error: shiftsErr } = await supabase
        .from('cash_shifts')
        .select('*')
        .or(`workspace_id.eq.${workspaceId},branch_id.eq.${workspaceId}`)
        .order('opened_at', { ascending: false })
        .limit(60);

      if (shiftsErr) console.warn('Aviso cargando cash_shifts:', shiftsErr);
      setShifts(shiftsData || []);

      // 4. Obtener pedidos y ventas de este comercio con desglose detallado de pago
      const { data: ordersData, error: ordersErr } = await supabase
        .from('ecommerce_orders_v2')
        .select('id, total, status, paymentmethod, paymentdetails, date, workspace_id, items, order_type, customer')
        .eq('workspace_id', workspaceId)
        .neq('status', 'Cancelado')
        .order('date', { ascending: false });

      if (ordersErr) console.warn('Aviso cargando orders:', ordersErr);
      setOrders(ordersData || []);

    } catch (e) {
      console.error('Error cargando Caja Maestra del Comercio:', e);
      toast.error('Error consultando ingresos de tus cajas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMerchantCashData();
    const interval = setInterval(fetchMerchantCashData, 20000); // Polling cada 20s
    return () => clearInterval(interval);
  }, [workspaceId]);

  // Desglose Consolidado por Método de Pago y Moneda Exacta (Bimonetario Físico & Digital)
  const breakdown = {
    cashUsd: { usd: 0, ves: 0, count: 0 },
    cashVes: { ves: 0, usd: 0, count: 0 },
    pagoMovil: { ves: 0, usd: 0, count: 0 },
    pos: { ves: 0, usd: 0, count: 0 },
    zelle: { usd: 0, ves: 0, count: 0 },
    transferencia: { ves: 0, usd: 0, count: 0 },
    otros: { usd: 0, ves: 0, count: 0 }
  };

  let totalSalesUsd = 0;
  let totalSalesVes = 0;

  orders.forEach(o => {
    const totalOrderUsd = Number(o.total) || 0;
    const pd = typeof o.paymentdetails === 'string'
      ? (() => { try { return JSON.parse(o.paymentdetails); } catch(e) { return {}; } })()
      : (o.paymentdetails || {});
    
    const rate = Number(pd.bcvRate) || bcvRate || 1;
    const orderVes = Number(pd.totalVes) || (totalOrderUsd * rate);

    totalSalesUsd += totalOrderUsd;
    totalSalesVes += orderVes;

    // A) Si la orden tiene desglose detallado de pagos (POS mostrador con pagos divididos)
    if (Array.isArray(pd.payments) && pd.payments.length > 0) {
      pd.payments.forEach(p => {
        const method = String(p.method || '').toUpperCase();
        const cur = String(p.currency || 'USD').toUpperCase();
        const paid = Number(p.amountPaid) || 0;
        const usdVal = Number(p.amountUsdEquivalent) || (cur === 'USD' ? paid : (paid / rate));
        const vesVal = cur === 'VES' ? paid : (paid * rate);

        if (method === 'CASH_USD' || (method.includes('CASH') && cur === 'USD') || method === 'EFECTIVO_USD') {
          breakdown.cashUsd.usd += paid;
          breakdown.cashUsd.ves += vesVal;
          breakdown.cashUsd.count++;
        } else if (method === 'CASH_VES' || (method.includes('CASH') && cur === 'VES') || method.includes('EFECTIVO_BS') || method.includes('EFECTIVO_VES')) {
          breakdown.cashVes.ves += paid;
          breakdown.cashVes.usd += usdVal;
          breakdown.cashVes.count++;
        } else if (method === 'PAGO_MOVIL' || method.includes('MOVIL')) {
          breakdown.pagoMovil.ves += paid;
          breakdown.pagoMovil.usd += usdVal;
          breakdown.pagoMovil.count++;
        } else if (method === 'POS_CARD' || method.includes('PUNTO') || method.includes('TARJETA') || method.includes('CARD') || method.includes('DEBITO')) {
          breakdown.pos.ves += (cur === 'VES' ? paid : vesVal);
          breakdown.pos.usd += usdVal;
          breakdown.pos.count++;
        } else if (method === 'ZELLE') {
          breakdown.zelle.usd += paid;
          breakdown.zelle.ves += vesVal;
          breakdown.zelle.count++;
        } else if (method.includes('TRANSF') || method === 'TRANSFER') {
          if (cur === 'USD') {
            breakdown.transferencia.usd += paid;
            breakdown.transferencia.ves += vesVal;
          } else {
            breakdown.transferencia.ves += paid;
            breakdown.transferencia.usd += usdVal;
          }
          breakdown.transferencia.count++;
        } else {
          breakdown.otros.usd += usdVal;
          breakdown.otros.ves += vesVal;
          breakdown.otros.count++;
        }
      });
    } else {
      // B) Pedido con método de pago único (Catálogo virtual o POS simple)
      const pm = String(o.paymentmethod || '').toLowerCase();
      if (pm === 'cash_usd' || pm === 'efectivo_usd' || pm === 'efectivo usd' || pm === 'dolares') {
        breakdown.cashUsd.usd += totalOrderUsd;
        breakdown.cashUsd.ves += orderVes;
        breakdown.cashUsd.count++;
      } else if (pm === 'cash_ves' || pm === 'efectivo_ves' || pm === 'efectivo_bs' || pm === 'efectivo bolivares' || pm === 'bolivares') {
        breakdown.cashVes.ves += orderVes;
        breakdown.cashVes.usd += totalOrderUsd;
        breakdown.cashVes.count++;
      } else if (pm.includes('movil') || pm.includes('pago movil') || pm === 'pago_movil') {
        breakdown.pagoMovil.ves += orderVes;
        breakdown.pagoMovil.usd += totalOrderUsd;
        breakdown.pagoMovil.count++;
      } else if (pm.includes('punto') || pm.includes('tarjeta') || pm.includes('pos') || pm.includes('debito')) {
        breakdown.pos.ves += orderVes;
        breakdown.pos.usd += totalOrderUsd;
        breakdown.pos.count++;
      } else if (pm.includes('zelle')) {
        breakdown.zelle.usd += totalOrderUsd;
        breakdown.zelle.ves += orderVes;
        breakdown.zelle.count++;
      } else if (pm.includes('transf')) {
        breakdown.transferencia.ves += orderVes;
        breakdown.transferencia.usd += totalOrderUsd;
        breakdown.transferencia.count++;
      } else if (pm.includes('efectivo') || pm.includes('cash')) {
        breakdown.cashUsd.usd += totalOrderUsd;
        breakdown.cashUsd.ves += orderVes;
        breakdown.cashUsd.count++;
      } else {
        breakdown.otros.usd += totalOrderUsd;
        breakdown.otros.ves += orderVes;
        breakdown.otros.count++;
      }
    }
  });

  // Dinero Físico en Gavetas / Caja Fuerte (Efectivo Billete en Mano)
  const totalPhysicalCashUsd = breakdown.cashUsd.usd + breakdown.cashVes.usd;
  const totalPhysicalCashVes = breakdown.cashUsd.ves + breakdown.cashVes.ves;

  // Dinero en Cuentas Bancarias / Digital (Pago Móvil + POS + Zelle + Transferencias)
  const totalDigitalBankUsd = breakdown.pagoMovil.usd + breakdown.pos.usd + breakdown.zelle.usd + breakdown.transferencia.usd + breakdown.otros.usd;
  const totalDigitalBankVes = breakdown.pagoMovil.ves + breakdown.pos.ves + breakdown.zelle.ves + breakdown.transferencia.ves + breakdown.otros.ves;

  // Cajas Abiertas Actualmente en este Comercio
  const openShifts = shifts.filter(s => s.status === 'OPEN');
  const totalInitialCashUsd = openShifts.reduce((acc, s) => acc + (Number(s.initial_usd) || 0), 0);
  const totalInitialCashVes = openShifts.reduce((acc, s) => acc + (Number(s.initial_ves) || 0), 0);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 pb-28 md:pb-8 animate-in fade-in duration-200">
      
      {/* Encabezado del Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
              <Wallet size={20} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Caja Maestra Consolidada</span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-500/30">
                  {storeName}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Supervisión en tiempo real de ingresos, gavetas y turnos de todas las cajas registradoras de tu negocio.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Tasa BCV */}
          <div className="bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 shadow-2xs">
            <span className="text-slate-400">Tasa BCV Oficial:</span>
            <span className="font-mono text-orange-600 dark:text-orange-400 font-black">Bs. {bcvRate.toFixed(2)}</span>
          </div>

          {/* Botón Gestión de Cajas & Empleados */}
          <button
            onClick={() => setIsUserManagementModalOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
          >
            <ShieldCheck size={15} className="text-orange-400" />
            <span>Configurar Cajas & PINes</span>
          </button>

          {/* Botón Refrescar */}
          <button
            onClick={fetchMerchantCashData}
            className="p-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold border border-slate-200 dark:border-slate-800 shadow-2xs"
            title="Actualizar datos"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-orange-500' : ''} />
            <span className="hidden sm:inline">Refrescar</span>
          </button>
        </div>
      </div>

      {/* Tarjetas Principales de Ingresos Consolidados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Ingreso Total Consolidado */}
        <div className="bg-gradient-to-br from-slate-900 via-zinc-900 to-black text-white p-5 rounded-3xl shadow-xl flex flex-col justify-between border border-white/10 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 block mb-1">
                Ingresos Consolidados
              </span>
              <h3 className="text-3xl font-black font-mono tracking-tight text-white">
                ${totalSalesUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-xs font-mono font-bold text-amber-300 mt-1">
                Bs. {totalSalesVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-white/10 rounded-2xl text-orange-400">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <span>Operaciones de venta:</span>
            <strong className="text-white font-mono">{orders.length} tickets</strong>
          </div>
        </div>

        {/* KPI 2: Efectivo Físico en Gavetas (Dinero en Mano) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                Efectivo Físico (En Gaveta)
              </span>
              <h3 className="text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                ${totalPhysicalCashUsd.toFixed(2)}
              </h3>
              <div className="space-y-1 mt-2">
                <div className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-between gap-2 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                  <span className="text-[10px] uppercase font-sans">Billetes USD:</span>
                  <span>${breakdown.cashUsd.usd.toFixed(2)}</span>
                </div>
                <div className="text-[11px] font-mono font-bold text-blue-700 dark:text-blue-400 flex items-center justify-between gap-2 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-100 dark:border-blue-500/20">
                  <span className="text-[10px] uppercase font-sans">Billetes Bs:</span>
                  <span>Bs. {breakdown.cashVes.ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-200 dark:border-emerald-500/20">
              <Banknote size={20} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Billetes en caja:</span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{breakdown.cashUsd.count + breakdown.cashVes.count} cobros</strong>
          </div>
        </div>

        {/* KPI 3: Dinero en Cuentas Bancarias / Digital */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
                Bancos & Cobros Digitales
              </span>
              <h3 className="text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                ${totalDigitalBankUsd.toFixed(2)}
              </h3>
              <div className="space-y-1 mt-2">
                <div className="text-[11px] font-mono font-bold text-blue-700 dark:text-blue-400 flex items-center justify-between gap-2 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-100 dark:border-blue-500/20">
                  <span className="text-[10px] uppercase font-sans">Pago Móvil:</span>
                  <span>Bs. {breakdown.pagoMovil.ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] uppercase font-sans">Punto / Otros:</span>
                  <span>${(breakdown.pos.usd + breakdown.zelle.usd + breakdown.transferencia.usd + breakdown.otros.usd).toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-200 dark:border-blue-500/20">
              <Smartphone size={20} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Acreditado en cuentas:</span>
            <strong className="text-blue-600 dark:text-blue-400 font-bold">{breakdown.pagoMovil.count + breakdown.pos.count + breakdown.zelle.count + breakdown.transferencia.count + breakdown.otros.count} cobros</strong>
          </div>
        </div>

        {/* KPI 4: Cajas Registradoras & Turnos */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Cajas en Servicio
              </span>
              <h3 className="text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <span>{openShifts.length}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${openShifts.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                {configuredRegisters.length} cajas registradas en total
              </p>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-2xl border border-orange-200 dark:border-orange-500/20">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Fondo base gavetas:</span>
            <strong className="text-slate-800 dark:text-slate-200 font-bold font-mono">
              ${totalInitialCashUsd.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">/ Bs. {totalInitialCashVes.toLocaleString('es-VE')}</span>
            </strong>
          </div>
        </div>

      </div>

      {/* Desglose Consolidado por Métodos de Pago */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Landmark size={16} className="text-orange-500" />
            <span>Consolidación por Métodos de Pago (Bimonetario)</span>
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Tasa BCV del día: <strong className="font-mono text-slate-800 dark:text-slate-200">Bs. {bcvRate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          
          {/* 1. Efectivo USD */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">Efectivo USD</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-200/70 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                  {breakdown.cashUsd.count} cobro{breakdown.cashUsd.count !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-400 mt-2">
                ${breakdown.cashUsd.usd.toFixed(2)}
              </p>
              <p className="text-[11px] font-mono text-emerald-600/80 dark:text-emerald-400/70 mt-0.5">
                Bs. {breakdown.cashUsd.ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <span className="text-[9px] text-emerald-800/60 dark:text-emerald-400/60 font-semibold mt-3 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40">
              💵 Billetes en gaveta
            </span>
          </div>

          {/* 2. Efectivo Bolívares */}
          <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/40 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider block">Efectivo Bolívares</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-200/70 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300">
                  {breakdown.cashVes.count} cobro{breakdown.cashVes.count !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xl font-black font-mono text-blue-700 dark:text-blue-400 mt-2">
                Bs. {breakdown.cashVes.ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] font-mono text-blue-600/80 dark:text-blue-400/70 mt-0.5">
                ${breakdown.cashVes.usd.toFixed(2)} USD
              </p>
            </div>
            <span className="text-[9px] text-blue-800/60 dark:text-blue-400/60 font-semibold mt-3 pt-2 border-t border-blue-200/60 dark:border-blue-800/40">
              🇻🇪 Billetes en gaveta
            </span>
          </div>

          {/* 3. Pago Móvil */}
          <div className="p-4 rounded-2xl bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-200/80 dark:border-cyan-800/40 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-cyan-800 dark:text-cyan-400 uppercase tracking-wider block">Pago Móvil</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-cyan-200/70 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300">
                  {breakdown.pagoMovil.count} cobro{breakdown.pagoMovil.count !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xl font-black font-mono text-cyan-800 dark:text-cyan-400 mt-2">
                Bs. {breakdown.pagoMovil.ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] font-mono text-cyan-700/80 dark:text-cyan-400/70 mt-0.5">
                ${breakdown.pagoMovil.usd.toFixed(2)} USD
              </p>
            </div>
            <span className="text-[9px] text-cyan-800/60 dark:text-cyan-400/60 font-semibold mt-3 pt-2 border-t border-cyan-200/60 dark:border-cyan-800/40">
              📲 Banco directo
            </span>
          </div>

          {/* 4. Punto de Venta */}
          <div className="p-4 rounded-2xl bg-violet-50/60 dark:bg-violet-950/20 border border-violet-200/80 dark:border-violet-800/40 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-violet-700 dark:text-violet-400 uppercase tracking-wider block">Punto de Venta</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-violet-200/70 dark:bg-violet-500/20 text-violet-800 dark:text-violet-300">
                  {breakdown.pos.count} cobro{breakdown.pos.count !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xl font-black font-mono text-violet-700 dark:text-violet-400 mt-2">
                Bs. {breakdown.pos.ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] font-mono text-violet-600/80 dark:text-violet-400/70 mt-0.5">
                ${breakdown.pos.usd.toFixed(2)} USD
              </p>
            </div>
            <span className="text-[9px] text-violet-800/60 dark:text-violet-400/60 font-semibold mt-3 pt-2 border-t border-violet-200/60 dark:border-violet-800/40">
              💳 Tarjetas Débito/Crédito
            </span>
          </div>

          {/* 5. Zelle */}
          <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/40 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-purple-700 dark:text-purple-400 uppercase tracking-wider block">Zelle</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-purple-200/70 dark:bg-purple-500/20 text-purple-800 dark:text-purple-300">
                  {breakdown.zelle.count} cobro{breakdown.zelle.count !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xl font-black font-mono text-purple-700 dark:text-purple-400 mt-2">
                ${breakdown.zelle.usd.toFixed(2)}
              </p>
              <p className="text-[11px] font-mono text-purple-600/80 dark:text-purple-400/70 mt-0.5">
                Bs. {breakdown.zelle.ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <span className="text-[9px] text-purple-800/60 dark:text-purple-400/60 font-semibold mt-3 pt-2 border-t border-purple-200/60 dark:border-purple-800/40">
              ⚡ Transferencia USD
            </span>
          </div>

          {/* 6. Transferencia Bancaria */}
          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider block">Transferencia</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-200/70 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300">
                  {breakdown.transferencia.count} cobro{breakdown.transferencia.count !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xl font-black font-mono text-amber-700 dark:text-amber-400 mt-2">
                Bs. {breakdown.transferencia.ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] font-mono text-amber-600/80 dark:text-amber-400/70 mt-0.5">
                ${breakdown.transferencia.usd.toFixed(2)} USD
              </p>
            </div>
            <span className="text-[9px] text-amber-800/60 dark:text-amber-400/60 font-semibold mt-3 pt-2 border-t border-amber-200/60 dark:border-amber-800/40">
              🏦 Cuentas bancarias
            </span>
          </div>

          {/* 7. Otros Canales */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Otros Canales</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {breakdown.otros.count} cobro{breakdown.otros.count !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xl font-black font-mono text-slate-700 dark:text-slate-300 mt-2">
                ${breakdown.otros.usd.toFixed(2)}
              </p>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                Bs. {breakdown.otros.ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <span className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold mt-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              🌐 Cashea / Otros
            </span>
          </div>

        </div>
      </div>

      {/* Monitor de Cajas Registradoras y Turnos */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              Monitor de Turnos y Cajas Registradoras
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Historial de aperturas, cajeros responsables y estado de cuadre en vivo de tu negocio.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20 w-fit">
              {shifts.length} registros cargados
            </span>
          </div>
        </div>

        {shifts.length === 0 ? (
          <div className="py-14 text-center flex flex-col items-center justify-center max-w-sm mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-3">
              <Calculator size={26} />
            </div>
            <h4 className="font-bold text-slate-800 dark:text-white text-sm">No hay turnos registrados aún</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Cuando tus cajeros abran turno con su PIN o desde el punto de venta, aparecerán en este monitor en vivo.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-3">Caja</th>
                  <th className="py-3 px-3">Cajero Responsable</th>
                  <th className="py-3 px-3">Apertura</th>
                  <th className="py-3 px-3 font-mono">Fondo Inicial ($)</th>
                  <th className="py-3 px-3 font-mono">Fondo Inicial (Bs)</th>
                  <th className="py-3 px-3 text-right">Acción QR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                {shifts.map(shift => {
                  const isOpen = shift.status === 'OPEN';
                  const registerSlug = storeSlug || 'tienda';

                  return (
                    <tr key={shift.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          isOpen 
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 shadow-2xs' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                          {isOpen ? 'En Servicio' : 'Cerrada'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white">
                        {shift.register_name || 'Caja 1'}
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                          <div className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center text-[10px]">
                            {(shift.cashier_name || 'C').charAt(0).toUpperCase()}
                          </div>
                          <span>{shift.cashier_name || 'Cajero'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-slate-500 dark:text-slate-400">
                        {shift.opened_at ? new Date(shift.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '-'}
                      </td>

                      <td className="py-3.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                        ${Number(shift.initial_usd || 0).toFixed(2)}
                      </td>

                      <td className="py-3.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                        Bs. {Number(shift.initial_ves || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedShiftForQr({
                              name: shift.register_name || 'Caja',
                              url: `${window.location.origin}/${registerSlug}/caja`
                            });
                          }}
                          className="px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/10 dark:hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-xl font-bold text-[11px] inline-flex items-center gap-1 transition-all cursor-pointer"
                          title="Ver QR de esta caja"
                        >
                          <QrCode size={13} />
                          <span>QR / Link</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detalle y Arqueo de Operaciones Recientes */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Receipt size={18} className="text-orange-500" />
              <span>Arqueo de Operaciones & Cobros Desglosados</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Desglose detallado de cada ticket con los métodos de pago combinados (Efectivo $, Efectivo Bs, Pago Móvil, etc.)
            </p>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20 w-fit">
            {orders.length} ventas registradas
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-xs">No hay ventas registradas aún.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Ticket / Ref</th>
                  <th className="py-3 px-3">Fecha y Hora</th>
                  <th className="py-3 px-3">Cajero / Canal</th>
                  <th className="py-3 px-3">Desglose de Pago Registrado</th>
                  <th className="py-3 px-3 text-right font-mono">Total Cobrado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                {orders.map(order => {
                  const pd = typeof order.paymentdetails === 'string'
                    ? (() => { try { return JSON.parse(order.paymentdetails); } catch(e) { return {}; } })()
                    : (order.paymentdetails || {});
                  
                  const hasSplit = Array.isArray(pd.payments) && pd.payments.length > 0;
                  const rate = Number(pd.bcvRate) || bcvRate || 1;
                  const orderVes = Number(pd.totalVes) || (Number(order.total || 0) * rate);

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                        {pd.invoiceNumber || order.id}
                      </td>

                      <td className="py-3.5 px-3 text-slate-500 dark:text-slate-400">
                        {order.date ? new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '-'}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {pd.cashier || (order.order_type === 'pos' ? 'Venta POS' : (order.customer || 'Mostrador'))}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {hasSplit ? (
                            pd.payments.map((p, idx) => {
                              const m = String(p.method || '').toUpperCase();
                              const isCashUsd = m.includes('CASH_USD') || (m.includes('CASH') && p.currency === 'USD');
                              const isCashVes = m.includes('CASH_VES') || (m.includes('CASH') && p.currency === 'VES');
                              const isPagoMovil = m.includes('MOVIL');
                              const isPos = m.includes('POS') || m.includes('PUNTO');

                              let badgeClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
                              let icon = '💵';
                              let label = p.method;

                              if (isCashUsd) {
                                badgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800';
                                icon = '💵';
                                label = `$${Number(p.amountPaid || 0).toFixed(2)} USD (Efectivo)`;
                              } else if (isCashVes) {
                                badgeClass = 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800';
                                icon = '🇻🇪';
                                label = `Bs. ${Number(p.amountPaid || 0).toLocaleString('es-VE')} (Efectivo)`;
                              } else if (isPagoMovil) {
                                badgeClass = 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200/80 dark:border-cyan-800';
                                icon = '📲';
                                label = `Bs. ${Number(p.amountPaid || 0).toLocaleString('es-VE')} (Pago Móvil${p.bankName ? ' ' + p.bankName : ''}${p.referenceNumber ? ' #' + p.referenceNumber : ''})`;
                              } else if (isPos) {
                                badgeClass = 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200/80 dark:border-violet-800';
                                icon = '💳';
                                label = `Bs. ${Number(p.amountPaid || 0).toLocaleString('es-VE')} (Punto POS)`;
                              } else {
                                label = `${p.method}: ${p.amountPaid} ${p.currency || ''}`;
                              }

                              return (
                                <span key={idx} className={`px-2 py-0.5 rounded-md text-[10px] font-bold inline-flex items-center gap-1 ${badgeClass}`}>
                                  <span>{icon}</span>
                                  <span>{label}</span>
                                </span>
                              );
                            })
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {order.paymentmethod || 'Pago estándar'}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="font-mono font-black text-slate-900 dark:text-white">
                          ${Number(order.total || 0).toFixed(2)}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          Bs. {orderVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Visual de Código QR de la Caja */}
      {selectedShiftForQr && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{selectedShiftForQr.name}</h3>
              <button onClick={() => setSelectedShiftForQr(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">✕</button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl flex flex-col items-center justify-center border border-slate-200 dark:border-slate-800">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(selectedShiftForQr.url)}`}
                alt="QR Caja"
                className="w-44 h-44 rounded-lg object-contain bg-white p-2"
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-2">
                Escanea para acceder directo con PIN
              </span>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-xl text-xs">
              <input 
                type="text" 
                readOnly 
                value={selectedShiftForQr.url}
                className="bg-transparent border-none outline-none text-slate-600 dark:text-slate-300 w-full text-[11px] font-mono truncate"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedShiftForQr.url);
                  toast.success('¡Enlace copiado al portapapeles!');
                }}
                className="p-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-orange-600 rounded-lg shadow-2xs cursor-pointer"
              >
                <Copy size={13} />
              </button>
            </div>

            <button
              onClick={() => setSelectedShiftForQr(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Listo
            </button>
          </div>
        </div>
      )}

      {/* Modal Creador y Editor de Personal & Cajas Registradoras */}
      {isUserManagementModalOpen && (
        <UserManagementModal
          isOpen={isUserManagementModalOpen}
          onClose={() => {
            setIsUserManagementModalOpen(false);
            fetchMerchantCashData();
          }}
        />
      )}

    </div>
  );
}
