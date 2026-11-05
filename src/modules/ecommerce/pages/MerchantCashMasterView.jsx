import React, { useState, useEffect } from 'react';
import { 
  Wallet, DollarSign, Store, ArrowUpRight, ArrowDownRight, 
  RefreshCw, CheckCircle2, Clock, Users, QrCode, Copy, ExternalLink,
  ChevronRight, AlertCircle, ShoppingBag, Landmark, Smartphone,
  ShieldCheck, PlusCircle, Calculator, Layers, Receipt
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

      // 4. Obtener pedidos y ventas de este comercio
      const { data: ordersData, error: ordersErr } = await supabase
        .from('ecommerce_orders_v2')
        .select('id, total, status, paymentmethod, date, workspace_id, items, order_type')
        .eq('workspace_id', workspaceId)
        .neq('status', 'Cancelado');

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

  // Métricas Consolidadas Exclusivas del Comercio
  const totalSalesUsd = orders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
  const totalSalesVes = totalSalesUsd * bcvRate;

  // Desglose por Método de Pago Consolidado
  const paymentBreakdown = {
    cashUsd: 0,
    cashVes: 0,
    pagoMovil: 0,
    pos: 0,
    zelle: 0,
    transferencia: 0,
    otros: 0
  };

  orders.forEach(o => {
    const val = Number(o.total) || 0;
    const pm = (o.paymentmethod || '').toLowerCase();
    if (pm.includes('efectivo') || pm.includes('cash')) {
      paymentBreakdown.cashUsd += val;
    } else if (pm.includes('movil') || pm.includes('pago movil')) {
      paymentBreakdown.pagoMovil += val;
    } else if (pm.includes('punto') || pm.includes('tarjeta') || pm.includes('pos') || pm.includes('debito')) {
      paymentBreakdown.pos += val;
    } else if (pm.includes('zelle')) {
      paymentBreakdown.zelle += val;
    } else if (pm.includes('transf')) {
      paymentBreakdown.transferencia += val;
    } else {
      paymentBreakdown.otros += val;
    }
  });

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
        
        {/* KPI 1: Ingreso Total de Todas las Cajas */}
        <div className="bg-gradient-to-br from-slate-900 via-zinc-900 to-black text-white p-5 rounded-3xl shadow-xl flex flex-col justify-between border border-white/10 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 block mb-1">
                Ingresos Consolidados
              </span>
              <h3 className="text-3xl font-black font-mono tracking-tight text-white">
                ${totalSalesUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-xs font-mono font-bold text-amber-200 mt-1">
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

        {/* KPI 2: Cajas Abiertas Ahora */}
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
            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-200 dark:border-emerald-500/20">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Estado del negocio:</span>
            <strong className={`font-bold ${openShifts.length > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
              {openShifts.length > 0 ? 'Operación en Línea' : 'Cajas Cerradas'}
            </strong>
          </div>
        </div>

        {/* KPI 3: Fondos Iniciales en Gavetas */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Fondo Base (Gavetas)
              </span>
              <h3 className="text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                ${totalInitialCashUsd.toFixed(2)}
              </h3>
              <p className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 mt-1">
                Bs. {totalInitialCashVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl border border-blue-200 dark:border-blue-500/20">
              <Wallet size={20} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Fondo flotante activo</span>
            <strong className="text-blue-600 dark:text-blue-400 font-bold">{openShifts.length} cajas con vuelto</strong>
          </div>
        </div>

        {/* KPI 4: Efectivo Total Recaudado */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Efectivo Recaudado
              </span>
              <h3 className="text-2xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                ${paymentBreakdown.cashUsd.toFixed(2)}
              </h3>
              <p className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 mt-1">
                + Pago Móvil: ${paymentBreakdown.pagoMovil.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-200 dark:border-amber-500/20">
              <ShoppingBag size={20} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Cobros electrónicos:</span>
            <strong className="text-slate-800 dark:text-slate-200 font-bold font-mono">
              ${(totalSalesUsd - paymentBreakdown.cashUsd).toFixed(2)}
            </strong>
          </div>
        </div>

      </div>

      {/* Desglose Consolidado por Métodos de Pago */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
          <Landmark size={16} className="text-orange-500" />
          <span>Consolidación por Métodos de Pago</span>
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Efectivo USD</span>
            <p className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">${paymentBreakdown.cashUsd.toFixed(2)}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Pago Móvil</span>
            <p className="text-lg font-black font-mono text-blue-600 dark:text-blue-400 mt-1">${paymentBreakdown.pagoMovil.toFixed(2)}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Punto de Venta</span>
            <p className="text-lg font-black font-mono text-violet-600 dark:text-violet-400 mt-1">${paymentBreakdown.pos.toFixed(2)}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Zelle</span>
            <p className="text-lg font-black font-mono text-purple-600 dark:text-purple-400 mt-1">${paymentBreakdown.zelle.toFixed(2)}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Transferencia</span>
            <p className="text-lg font-black font-mono text-amber-600 dark:text-amber-400 mt-1">${paymentBreakdown.transferencia.toFixed(2)}</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Otros Canales</span>
            <p className="text-lg font-black font-mono text-slate-700 dark:text-slate-300 mt-1">${paymentBreakdown.otros.toFixed(2)}</p>
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
