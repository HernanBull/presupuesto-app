import React, { useState, useEffect } from 'react';
import { 
  Wallet, DollarSign, Store, ArrowUpRight, ArrowDownRight, 
  RefreshCw, CheckCircle2, Clock, Users, QrCode, Copy, ExternalLink,
  ChevronRight, AlertCircle, ShoppingBag, Landmark, Smartphone,
  ShieldCheck, PlusCircle, Calculator, Layers, Receipt, CreditCard,
  Banknote, ArrowRightLeft, Zap, Printer, Lock, FileSpreadsheet, Calendar,
  BookOpen
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import toast from 'react-hot-toast';
import UserManagementModal from '../components/admin/UserManagementModal';
import CashShiftModal from '../components/admin/CashShiftModal';
import FiscalReportModal from '../components/admin/FiscalReportModal';
import CashMasterTutorialOverlay from '../components/admin/CashMasterTutorialOverlay';

export default function MerchantCashMasterView() {
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [storeName, setStoreName] = useState(() => localStorage.getItem('merchant_store_name') || 'Mi Comercio');
  const [storeSlug, setStoreSlug] = useState(() => localStorage.getItem('storeSlug') || '');
  const [configuredRegisters, setConfiguredRegisters] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [bcvRate, setBcvRate] = useState(888.89);
  const [selectedShiftForQr, setSelectedShiftForQr] = useState(null);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState(false);
  const [isCashShiftModalOpen, setIsCashShiftModalOpen] = useState(false);
  const [cashShiftModalTab, setCashShiftModalTab] = useState('status');
  const [selectedShiftForModal, setSelectedShiftForModal] = useState(null);
  const [selectedDateFilter, setSelectedDateFilter] = useState('ALL'); // 'ALL', 'TODAY', 'YESTERDAY', '7DAYS', 'CUSTOM'
  const [customDate, setCustomDate] = useState('');
  const [isFiscalReportModalOpen, setIsFiscalReportModalOpen] = useState(false);
  const [fiscalReportType, setFiscalReportType] = useState('X'); // 'X' o 'Z'
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

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
        setStaffList(Array.isArray(cfg.users) ? cfg.users : []);
      }

      // 3. Obtener turnos de caja exclusivos de este comercio
      const { data: shiftsData, error: shiftsErr } = await supabase
        .from('cash_shifts')
        .select('*')
        .eq('branch_id', workspaceId)
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

  // Filtro de fecha para conciliación y KPIs consolidados
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const yDate = new Date(now); yDate.setDate(yDate.getDate() - 1);
  const yesterdayKey = yDate.toISOString().slice(0, 10);

  const todayCount = orders.filter(o => o.date && o.date.slice(0, 10) === todayKey).length;
  const yesterdayCount = orders.filter(o => o.date && o.date.slice(0, 10) === yesterdayKey).length;

  const filteredOrders = orders.filter(o => {
    if (!o.date) return false;
    const odStr = o.date.slice(0, 10);

    if (selectedDateFilter === 'TODAY') return odStr === todayKey;
    if (selectedDateFilter === 'YESTERDAY') return odStr === yesterdayKey;
    if (selectedDateFilter === '7DAYS') {
      const diffTime = now.getTime() - new Date(o.date).getTime();
      const diffDays = diffTime / (1000 * 3600 * 24);
      return diffDays <= 7;
    }
    if (selectedDateFilter === 'CUSTOM' && customDate) {
      return odStr === customDate;
    }
    return true; // 'ALL'
  });

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

  filteredOrders.forEach(o => {
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
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/25 shrink-0">
              <Wallet size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Caja Maestra Consolidada
                </h2>

                {/* BOTÓN CUADERNITO: GUÍA Y TUTORIAL DIDÁCTICO */}
                <button
                  onClick={() => setIsTutorialOpen(true)}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 animate-pulse"
                  title="Abrir Tutorial y Guía Didáctica Interactiva"
                >
                  <BookOpen size={14} className="text-orange-600 dark:text-orange-400" />
                  <span>Guía Didáctica</span>
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Supervisión en tiempo real de ingresos, gavetas y turnos de todas las cajas registradoras de tu negocio.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Tasa BCV */}
          <div 
            data-tour="tour-bcv"
            className="bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 shadow-2xs"
          >
            <span className="text-slate-400">Tasa BCV Oficial:</span>
            <span className="font-mono text-orange-600 dark:text-orange-400 font-black">Bs. {bcvRate.toFixed(2)}</span>
          </div>

          {/* Botón Gestión de Cajas & Empleados */}
          <button
            data-tour="tour-config"
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

      {/* ========================================================
          SELECTOR DE PERÍODO CLARO Y SIMPLE (ORDEN CONTABLE)
          ======================================================== */}
      <div 
        data-tour="tour-period"
        className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Calendar size={13} className="text-orange-500" />
            <span>Período:</span>
          </span>

          <button
            onClick={() => setSelectedDateFilter('TODAY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              selectedDateFilter === 'TODAY'
                ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            Hoy ({todayCount})
          </button>

          <button
            onClick={() => setSelectedDateFilter('YESTERDAY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              selectedDateFilter === 'YESTERDAY'
                ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            Ayer ({yesterdayCount})
          </button>

          <button
            onClick={() => setSelectedDateFilter('7DAYS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              selectedDateFilter === '7DAYS'
                ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            Últimos 7 Días
          </button>

          <button
            onClick={() => setSelectedDateFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              selectedDateFilter === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            Todo ({orders.length})
          </button>
        </div>

        {/* Selector de Fecha Específica */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400">Día específico:</span>
          <input
            type="date"
            value={customDate}
            onChange={(e) => {
              setCustomDate(e.target.value);
              setSelectedDateFilter('CUSTOM');
            }}
            className="px-2.5 py-1 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-2xs"
          />
        </div>
      </div>

      {/* ========================================================
          BARRA DE ACCIONES SIMPLIFICADA (3 ACCIONES CLARAS)
          ======================================================== */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        
        {/* Bloque 1: Operativa del Turno y Gastos de Caja Chica */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            data-tour="tour-shift"
            onClick={() => {
              setCashShiftModalTab('status');
              setSelectedShiftForModal(openShifts[0] || null);
              setIsCashShiftModalOpen(true);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-sm cursor-pointer active:scale-95 ${
              openShifts.length > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/20'
            }`}
          >
            <Wallet size={16} />
            <span>
              {openShifts.length > 0 
                ? `🟢 Caja en Servicio: ${openShifts[0].register_name || 'Caja 1'} (${openShifts[0].cashier_name || 'Cajero'})` 
                : '🟠 Iniciar Turno de Hoy (Abrir Caja)'}
            </span>
          </button>

          <button
            data-tour="tour-pettycash"
            onClick={() => {
              setCashShiftModalTab('movement');
              setSelectedShiftForModal(openShifts[0] || null);
              setIsCashShiftModalOpen(true);
            }}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
            title="Registrar compras menores, hielo, bolsas o anticipos"
          >
            <ArrowRightLeft size={14} className="text-orange-500" />
            <span>Caja Chica (Gastos)</span>
          </button>
        </div>

        {/* Bloque 2: Cierres y Reportes Fiscales SENIAT */}
        <div data-tour="tour-fiscal" className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setFiscalReportType('X');
              setIsFiscalReportModalOpen(true);
            }}
            className="px-3.5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
            title="Ver o imprimir Corte X (Informe Parcial)"
          >
            <Receipt size={14} className="text-orange-500" />
            <span>Corte X (Parcial)</span>
          </button>

          <button
            onClick={() => {
              setFiscalReportType('Z');
              setIsFiscalReportModalOpen(true);
            }}
            className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
            title="Emitir Cierre Z Definitivo del Día"
          >
            <Printer size={14} className="text-rose-500" />
            <span>Cierre Z (Definitivo)</span>
          </button>
        </div>

      </div>

      {/* Tarjetas Principales de Ingresos Consolidados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Ingreso Total Consolidado */}
        <div 
          data-tour="tour-kpis"
          className="bg-gradient-to-br from-slate-900 via-zinc-900 to-black text-white p-5 rounded-3xl shadow-xl flex flex-col justify-between border border-white/10 relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 block mb-1">
                Ingresos {selectedDateFilter === 'TODAY' ? 'de Hoy' : selectedDateFilter === 'YESTERDAY' ? 'de Ayer' : selectedDateFilter === '7DAYS' ? '(Últimos 7 Días)' : 'Consolidados'}
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
            <span>Operaciones en este período:</span>
            <strong className="text-white font-mono">{filteredOrders.length} tickets</strong>
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

      {/* Desglose Consolidado por Métodos de Pago (Estética Axon Orange & White) */}
      <div 
        data-tour="tour-method-breakdown"
        className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Landmark size={16} className="text-orange-500" />
            <span>Consolidación por Métodos de Pago (Bimonetario)</span>
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Tasa BCV del día: <strong className="font-mono text-orange-600 dark:text-orange-400 font-bold">Bs. {bcvRate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          
          {/* 1. Efectivo USD */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-orange-500/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Efectivo USD</span>
                </span>
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-500/20">
                  {breakdown.cashUsd.count} cobro{breakdown.cashUsd.count !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white mt-2">
                ${breakdown.cashUsd.usd.toFixed(2)}
              </p>
              <p className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400 mt-0.5">
                Bs. {breakdown.cashUsd.ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1">
              💵 Billetes en gaveta
            </span>
          </div>

          {/* 2. Efectivo Bolívares */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-orange-500/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Efectivo Bs.</span>
                </span>
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-500/20">
                  {breakdown.cashVes.count} cobro{breakdown.cashVes.count !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xl font-black font-mono tracking-tight text-slate-900 dark:text-white mt-2">
                Bs. {breakdown.cashVes.ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400 mt-0.5">
                ${breakdown.cashVes.usd.toFixed(2)} USD
              </p>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1">
              🇻🇪 Billetes en gaveta
            </span>
          </div>

          {/* 3. Pago Móvil */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-orange-500/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-500" />
                  <span>Pago Móvil</span>
                </span>
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200/60 dark:border-orange-500/20">
                  {breakdown.pagoMovil.count} cobro{breakdown.pagoMovil.count !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xl font-black font-mono tracking-tight text-slate-900 dark:text-white mt-2">
                Bs. {breakdown.pagoMovil.ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400 mt-0.5">
                ${breakdown.pagoMovil.usd.toFixed(2)} USD
              </p>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1">
              📲 Directo en banco
            </span>
          </div>

          {/* 4. Punto de Venta */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-orange-500/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>Punto POS</span>
                </span>
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {breakdown.pos.count} cobros
                </span>
              </div>
              <p className="text-xl font-black font-mono tracking-tight text-slate-900 dark:text-white mt-2">
                Bs. {breakdown.pos.ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400 mt-0.5">
                ${breakdown.pos.usd.toFixed(2)} USD
              </p>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1">
              💳 Tarjetas débito/crédito
            </span>
          </div>

          {/* 5. Zelle */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-orange-500/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span>Zelle USD</span>
                </span>
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {breakdown.zelle.count} cobros
                </span>
              </div>
              <p className="text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white mt-2">
                ${breakdown.zelle.usd.toFixed(2)}
              </p>
              <p className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400 mt-0.5">
                Bs. {breakdown.zelle.ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1">
              ⚡ Transferencia USD
            </span>
          </div>

          {/* 6. Transferencia Bancaria */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-orange-500/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Transferencia</span>
                </span>
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {breakdown.transferencia.count} cobros
                </span>
              </div>
              <p className="text-xl font-black font-mono tracking-tight text-slate-900 dark:text-white mt-2">
                Bs. {breakdown.transferencia.ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400 mt-0.5">
                ${breakdown.transferencia.usd.toFixed(2)} USD
              </p>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1">
              🏦 Acreditación cuenta
            </span>
          </div>

          {/* 7. Otros Canales */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xs hover:border-orange-500/40 transition-all flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>Otros Canales</span>
                </span>
                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {breakdown.otros.count} cobros
                </span>
              </div>
              <p className="text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white mt-2">
                ${breakdown.otros.usd.toFixed(2)}
              </p>
              <p className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400 mt-0.5">
                Bs. {breakdown.otros.ves.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1">
              🌐 Cashea / Otros
            </span>
          </div>

        </div>
      </div>

      {/* Monitor de Cajas Registradoras y Turnos */}
      <div 
        data-tour="tour-shift-monitor"
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden space-y-4 p-6"
      >
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
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedShiftForModal(shift);
                              setCashShiftModalTab('status');
                              setIsCashShiftModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold text-[11px] inline-flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                            title="Abrir panel operativo de caja"
                          >
                            <Wallet size={12} className="text-orange-400" />
                            <span>Operar</span>
                          </button>

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
                            <QrCode size={12} />
                            <span>QR</span>
                          </button>
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

      {/* Detalle y Arqueo de Operaciones Recientes Agrupado por Días */}
      <div 
        data-tour="tour-operations-audit"
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden space-y-4 p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Receipt size={18} className="text-orange-500" />
              <span>Arqueo de Operaciones & Cobros Desglosados</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Desglose detallado de cada ticket separado por días con métodos de pago combinados y cortes de jornada.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20 w-fit">
              {(() => {
                const now = new Date();
                const todayKey = now.toISOString().split('T')[0];
                const yDate = new Date(now); yDate.setDate(yDate.getDate() - 1);
                const yesterdayKey = yDate.toISOString().split('T')[0];

                const filtered = orders.filter(order => {
                  if (selectedDateFilter === 'ALL') return true;
                  if (!order.date) return false;
                  const od = new Date(order.date);
                  if (isNaN(od.getTime())) return false;
                  const odStr = od.toISOString().split('T')[0];
                  if (selectedDateFilter === 'TODAY') return odStr === todayKey;
                  if (selectedDateFilter === 'YESTERDAY') return odStr === yesterdayKey;
                  if (selectedDateFilter === '7DAYS') {
                    const d7 = new Date(now); d7.setDate(d7.getDate() - 7);
                    return od >= d7;
                  }
                  if (selectedDateFilter === 'CUSTOM' && customDate) return odStr === customDate;
                  return true;
                });
                return `${filtered.length} ventas mostradas`;
              })()}
            </span>
          </div>
        </div>

        {/* Barra de Filtro de Fechas y Calendario */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 pb-1 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'Todas las fechas' },
              { id: 'TODAY', label: 'Hoy' },
              { id: 'YESTERDAY', label: 'Ayer' },
              { id: '7DAYS', label: 'Últimos 7 días' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedDateFilter(tab.id);
                  if (tab.id !== 'CUSTOM') setCustomDate('');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedDateFilter === tab.id
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Selector de Calendario */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-xl text-xs">
            <Calendar size={14} className="text-orange-500 shrink-0" />
            <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">Filtrar Fecha:</span>
            <input 
              type="date"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                if (e.target.value) setSelectedDateFilter('CUSTOM');
                else setSelectedDateFilter('ALL');
              }}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-white focus:outline-none cursor-pointer"
            />
            {customDate && (
              <button 
                onClick={() => {
                  setCustomDate('');
                  setSelectedDateFilter('ALL');
                }}
                className="text-[10px] text-slate-400 hover:text-rose-500 font-bold ml-1 cursor-pointer"
                title="Limpiar fecha"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {(() => {
          const now = new Date();
          const todayKey = now.toISOString().split('T')[0];
          const yDate = new Date(now); yDate.setDate(yDate.getDate() - 1);
          const yesterdayKey = yDate.toISOString().split('T')[0];

          const filtered = orders.filter(order => {
            if (selectedDateFilter === 'ALL') return true;
            if (!order.date) return false;
            const od = new Date(order.date);
            if (isNaN(od.getTime())) return false;
            const odStr = od.toISOString().split('T')[0];
            if (selectedDateFilter === 'TODAY') return odStr === todayKey;
            if (selectedDateFilter === 'YESTERDAY') return odStr === yesterdayKey;
            if (selectedDateFilter === '7DAYS') {
              const d7 = new Date(now); d7.setDate(d7.getDate() - 7);
              return od >= d7;
            }
            if (selectedDateFilter === 'CUSTOM' && customDate) return odStr === customDate;
            return true;
          });

          if (filtered.length === 0) {
            return (
              <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                <Calendar size={28} className="text-slate-300 dark:text-zinc-700" />
                <p className="font-bold">No hay operaciones registradas para el período seleccionado.</p>
                <button
                  onClick={() => { setSelectedDateFilter('ALL'); setCustomDate(''); }}
                  className="text-xs font-bold text-orange-600 hover:underline cursor-pointer"
                >
                  Ver todas las fechas
                </button>
              </div>
            );
          }

          // Agrupar por fecha en orden cronológico descendente
          const groups = filtered.reduce((acc, order) => {
            const d = order.date ? new Date(order.date) : new Date();
            const dateKey = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : 'Otras fechas';
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(order);
            return acc;
          }, {});

          const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

          return (
            <div className="space-y-6">
              {sortedKeys.map(dateKey => {
                const dayOrders = groups[dateKey];
                const dayTotalUsd = dayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
                const dayTotalVes = dayTotalUsd * (Number(bcvRate) || 888.89);

                // Título de fecha legible
                let title = dateKey;
                try {
                  const [y, m, d] = dateKey.split('-').map(Number);
                  const dt = new Date(y, m - 1, d);
                  const formatted = dt.toLocaleDateString('es-VE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
                  if (dateKey === todayKey) title = `Hoy — ${formatted}`;
                  else if (dateKey === yesterdayKey) title = `Ayer — ${formatted}`;
                  else title = formatted;
                } catch (e) {}

                return (
                  <div key={dateKey} className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
                    {/* Cabecera del Día con Totales */}
                    <div className="bg-slate-50 dark:bg-zinc-950/70 p-3.5 px-4 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Calendar size={15} className="text-orange-500 shrink-0" />
                        <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-white capitalize">
                          {title}
                        </h4>
                        <span className="text-[10px] bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-full font-bold text-slate-500 border border-slate-200 dark:border-white/5">
                          {dayOrders.length} {dayOrders.length === 1 ? 'venta' : 'ventas'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 font-mono text-xs">
                        <span className="text-[11px] text-slate-500 font-sans font-bold">Total del Día:</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400">
                          ${dayTotalUsd.toFixed(2)}
                        </span>
                        <span className="text-slate-300 dark:text-zinc-700">|</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          Bs. {dayTotalVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Tabla de Operaciones de este Día */}
                    <div className="overflow-x-auto bg-white dark:bg-slate-900">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[9px] bg-slate-50/50 dark:bg-zinc-900/50">
                            <th className="py-2.5 px-3">Ticket / Ref</th>
                            <th className="py-2.5 px-3">Hora</th>
                            <th className="py-2.5 px-3">Cajero / Canal</th>
                            <th className="py-2.5 px-3">Desglose de Pago Registrado</th>
                            <th className="py-2.5 px-3 text-right font-mono">Total Cobrado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                          {dayOrders.map(order => {
                            const pd = typeof order.paymentdetails === 'string'
                              ? (() => { try { return JSON.parse(order.paymentdetails); } catch(e) { return {}; } })()
                              : (order.paymentdetails || {});
                            
                            const hasSplit = Array.isArray(pd.payments) && pd.payments.length > 0;
                            const rate = Number(pd.bcvRate) || bcvRate || 1;
                            const orderVes = Number(pd.totalVes) || (Number(order.total || 0) * rate);

                            return (
                              <tr key={order.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                                  {pd.invoiceNumber || order.id}
                                </td>

                                <td className="py-3 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                                  {order.date ? new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                </td>

                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center text-[10px] font-black shrink-0">
                                      {((pd.cashier || (order.order_type === 'pos' ? 'yende' : (order.customer || 'yende'))).charAt(0)).toUpperCase()}
                                    </div>
                                    <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">
                                      {pd.cashier || (order.order_type === 'pos' ? 'yende' : (order.customer || 'yende'))}
                                    </span>
                                  </div>
                                </td>

                                <td className="py-3 px-3">
                                  <div className="flex flex-wrap gap-1.5 items-center">
                                    {hasSplit ? (
                                      pd.payments.map((p, idx) => {
                                        const m = String(p.method || '').toUpperCase();
                                        const isCashUsd = m.includes('CASH_USD') || (m.includes('CASH') && p.currency === 'USD') || m.includes('EFECTIVO_USD');
                                        const isCashVes = m.includes('CASH_VES') || (m.includes('CASH') && p.currency === 'VES') || m.includes('EFECTIVO_BS') || m.includes('EFECTIVO_VES');
                                        const isPagoMovil = m.includes('MOVIL');
                                        const isPos = m.includes('POS') || m.includes('PUNTO');

                                        let badgeClass = 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs';
                                        let dot = 'bg-slate-400';
                                        let label = p.method;

                                        if (isCashUsd) {
                                          badgeClass = 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-emerald-500/30 dark:border-emerald-500/40 shadow-2xs';
                                          dot = 'bg-emerald-500';
                                          label = `$${Number(p.amountPaid || 0).toFixed(2)} USD (Efectivo)`;
                                        } else if (isCashVes) {
                                          badgeClass = 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-blue-500/30 dark:border-blue-500/40 shadow-2xs';
                                          dot = 'bg-blue-500';
                                          label = `Bs. ${Number(p.amountPaid || 0).toLocaleString('es-VE')} (Efectivo)`;
                                        } else if (isPagoMovil) {
                                          badgeClass = 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-cyan-500/30 dark:border-cyan-500/40 shadow-2xs';
                                          dot = 'bg-cyan-500';
                                          label = `Bs. ${Number(p.amountPaid || 0).toLocaleString('es-VE')} (Pago Móvil${p.bankName ? ' ' + p.bankName : ''}${p.referenceNumber ? ' #' + p.referenceNumber : ''})`;
                                        } else if (isPos) {
                                          badgeClass = 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-purple-500/30 dark:border-purple-500/40 shadow-2xs';
                                          dot = 'bg-purple-500';
                                          label = `Bs. ${Number(p.amountPaid || 0).toLocaleString('es-VE')} (Punto POS)`;
                                        } else {
                                          label = `${p.method}: ${p.amountPaid} ${p.currency || ''}`;
                                        }

                                        return (
                                          <span key={idx} className={`px-2 py-0.5 rounded-lg text-[10px] font-bold inline-flex items-center gap-1.5 ${badgeClass}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                                            <span>{label}</span>
                                          </span>
                                        );
                                      })
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs inline-flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                        <span>{order.paymentmethod || 'Pago estándar'}</span>
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="py-3 px-3 text-right">
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
                  </div>
                );
              })}
            </div>
          );
        })()}
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

      {/* Modal Operativo Integral de Caja & Turno (Arqueo, Gastos, Cuadre, SENIAT) */}
      {isCashShiftModalOpen && (
        <CashShiftModal
          isOpen={isCashShiftModalOpen}
          onClose={() => {
            setIsCashShiftModalOpen(false);
            fetchMerchantCashData();
          }}
          activeShift={selectedShiftForModal || openShifts[0] || null}
          onShiftChange={() => {
            fetchMerchantCashData();
          }}
          initialTab={cashShiftModalTab}
          bcvRate={bcvRate}
          storeName={storeName}
          orders={orders}
        />
      )}

      {/* Modal Fiscal SENIAT: Corte X y Cierre Z (PDF, Word, Impresión Móvil y Hardware) */}
      {isFiscalReportModalOpen && (
        <FiscalReportModal
          isOpen={isFiscalReportModalOpen}
          onClose={() => setIsFiscalReportModalOpen(false)}
          initialReportType={fiscalReportType}
          workspaceId={workspaceId}
          storeName={storeName}
          bcvRate={bcvRate}
          orders={orders}
          shifts={shifts}
          registers={configuredRegisters}
        />
      )}

      {/* Tutorial y Guía Didáctica Interactiva Paso a Paso */}
      <CashMasterTutorialOverlay
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />

    </div>
  );
}
