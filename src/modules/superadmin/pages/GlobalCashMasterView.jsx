import React, { useState, useEffect } from 'react';
import { 
  Wallet, DollarSign, Store, ArrowUpRight, ArrowDownRight, 
  RefreshCw, CheckCircle2, Clock, Users, QrCode, Copy, ExternalLink,
  ChevronRight, AlertCircle, ShoppingBag, Landmark, Smartphone
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import toast from 'react-hot-toast';

export default function GlobalCashMasterView() {
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [bcvRate, setBcvRate] = useState(888.89);
  const [selectedShiftForQr, setSelectedShiftForQr] = useState(null);

  const fetchGlobalCashData = async () => {
    try {
      setLoading(true);

      // 1. Obtener tasa BCV
      fetch('https://axonmarket-api.onrender.com/api/bcv')
        .then(res => res.json())
        .then(data => {
          if (data?.rate) setBcvRate(Number(data.rate));
        })
        .catch(() => {});

      // 2. Obtener tiendas / workspaces
      const { data: wsData } = await supabase
        .from('workspaces')
        .select('id, name, store_slug, config');
      setWorkspaces(wsData || []);

      // 3. Obtener turnos de cajas en Supabase
      const { data: shiftsData, error: shiftsErr } = await supabase
        .from('cash_shifts')
        .select('*')
        .order('opened_at', { ascending: false })
        .limit(50);

      if (shiftsErr) console.warn('Aviso cargando cash_shifts:', shiftsErr);
      setShifts(shiftsData || []);

      // 4. Obtener pedidos y ventas para computar ingresos consolidados
      const { data: ordersData, error: ordersErr } = await supabase
        .from('ecommerce_orders_v2')
        .select('id, total, status, paymentmethod, date, workspace_id, items, order_type')
        .neq('status', 'Cancelado');

      if (ordersErr) console.warn('Aviso cargando orders:', ordersErr);
      setOrders(ordersData || []);

    } catch (e) {
      console.error('Error cargando Caja Maestra Global:', e);
      toast.error('Error consultando ingresos globales.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalCashData();
    const interval = setInterval(fetchGlobalCashData, 20000); // Polling cada 20s
    return () => clearInterval(interval);
  }, []);

  // Mapas auxiliares para asociar nombres de tienda
  const storeNameMap = {};
  const storeSlugMap = {};
  workspaces.forEach(ws => {
    storeNameMap[ws.id] = ws.name;
    if (ws.store_slug) {
      storeNameMap[ws.store_slug] = ws.name;
      storeSlugMap[ws.id] = ws.store_slug;
    }
  });

  // Métricas Consolidadas Globales (Todas las Cajas y Tiendas)
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
    } else if (pm.includes('punto') || pm.includes('tarjeta') || pm.includes('pos')) {
      paymentBreakdown.pos += val;
    } else if (pm.includes('zelle')) {
      paymentBreakdown.zelle += val;
    } else if (pm.includes('transf')) {
      paymentBreakdown.transferencia += val;
    } else {
      paymentBreakdown.otros += val;
    }
  });

  // Cajas Abiertas Actualmente
  const openShifts = shifts.filter(s => s.status === 'OPEN');
  const totalInitialCashUsd = openShifts.reduce((acc, s) => acc + (Number(s.initial_usd) || 0), 0);
  const totalInitialCashVes = openShifts.reduce((acc, s) => acc + (Number(s.initial_ves) || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Encabezado del Módulo con Tasa Oficial */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/25">
              <Wallet size={20} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Caja Maestra Consolidada (SuperAdmin)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Monitor en tiempo real de ingresos, arqueos y turnos de todas las cajas del ecosistema Axon.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-2">
            <span>Tasa BCV Oficial:</span>
            <span className="font-mono text-orange-600 font-black">Bs. {bcvRate.toFixed(2)}</span>
          </div>
          <button
            onClick={fetchGlobalCashData}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="Actualizar datos"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-orange-500' : ''} />
            <span className="hidden sm:inline">Refrescar</span>
          </button>
        </div>
      </div>

      {/* Tarjetas Principales de Ingresos Consolidados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Ingreso Total Global */}
        <div className="bg-gradient-to-br from-slate-900 via-zinc-900 to-black text-white p-5 rounded-3xl shadow-xl flex flex-col justify-between border border-white/10 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 block mb-1">
                Ingresos Globales
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
            <span>Ventas registradas:</span>
            <strong className="text-white font-mono">{orders.length} operaciones</strong>
          </div>
        </div>

        {/* KPI 2: Cajas Abiertas Ahora */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                Cajas en Servicio
              </span>
              <h3 className="text-3xl font-black font-mono tracking-tight text-slate-900 flex items-center gap-2">
                <span>{openShifts.length}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {shifts.length} turnos archivados en total
              </p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Estado:</span>
            <strong className="text-emerald-600 font-bold">Operación en Línea</strong>
          </div>
        </div>

        {/* KPI 3: Fondos Iniciales en Mano */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                Fondo Base (Gavetas)
              </span>
              <h3 className="text-2xl font-black font-mono tracking-tight text-slate-900">
                ${totalInitialCashUsd.toFixed(2)}
              </h3>
              <p className="text-xs font-mono font-bold text-slate-600 mt-1">
                Bs. {totalInitialCashVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-200">
              <Wallet size={20} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Fondo flotante activo</span>
            <strong className="text-blue-600 font-bold">{openShifts.length} cajas con vuelto</strong>
          </div>
        </div>

        {/* KPI 4: Efectivo Total Recaudado */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                Efectivo Recaudado
              </span>
              <h3 className="text-2xl font-black font-mono tracking-tight text-emerald-600">
                ${paymentBreakdown.cashUsd.toFixed(2)}
              </h3>
              <p className="text-xs font-mono font-bold text-slate-500 mt-1">
                + Pago Móvil: ${paymentBreakdown.pagoMovil.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-200">
              <ShoppingBag size={20} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Cobros electrónicos:</span>
            <strong className="text-slate-800 font-bold font-mono">
              ${(totalSalesUsd - paymentBreakdown.cashUsd).toFixed(2)}
            </strong>
          </div>
        </div>

      </div>

      {/* Desglose por Canales / Métodos de Pago */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <Landmark size={16} className="text-orange-500" />
          <span>Consolidación por Métodos de Pago Globales</span>
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Efectivo USD</span>
            <p className="text-lg font-black font-mono text-emerald-600 mt-1">${paymentBreakdown.cashUsd.toFixed(2)}</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Pago Móvil</span>
            <p className="text-lg font-black font-mono text-blue-600 mt-1">${paymentBreakdown.pagoMovil.toFixed(2)}</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Punto de Venta</span>
            <p className="text-lg font-black font-mono text-violet-600 mt-1">${paymentBreakdown.pos.toFixed(2)}</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Zelle</span>
            <p className="text-lg font-black font-mono text-purple-600 mt-1">${paymentBreakdown.zelle.toFixed(2)}</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Transferencia</span>
            <p className="text-lg font-black font-mono text-amber-600 mt-1">${paymentBreakdown.transferencia.toFixed(2)}</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Otros Canales</span>
            <p className="text-lg font-black font-mono text-slate-700 mt-1">${paymentBreakdown.otros.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Monitor de Cajas y Turnos en Vivo */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Monitor de Turnos y Cajas Registradoras
            </h3>
            <p className="text-xs text-slate-500">
              Historial de aperturas, cajeros responsables y estado de cuadre ciego.
            </p>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-600 border border-orange-200 w-fit">
            {shifts.length} registros cargados
          </span>
        </div>

        {shifts.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            No hay turnos registrados en la base de datos central aún.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-3">Caja</th>
                  <th className="py-3 px-3">Tienda / Sucursal</th>
                  <th className="py-3 px-3">Cajero</th>
                  <th className="py-3 px-3">Apertura</th>
                  <th className="py-3 px-3 font-mono">Fondo Inicial ($)</th>
                  <th className="py-3 px-3 font-mono">Fondo Inicial (Bs)</th>
                  <th className="py-3 px-3 text-right">Acción QR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {shifts.map(shift => {
                  const isOpen = shift.status === 'OPEN';
                  const storeLabel = storeNameMap[shift.branch_id] || shift.branch_id || 'Tienda Principal';
                  const slug = storeSlugMap[shift.branch_id] || shift.branch_id;

                  return (
                    <tr key={shift.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          isOpen 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-2xs' 
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                          {isOpen ? 'En Servicio' : 'Cerrada'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-bold text-slate-900">
                        {shift.register_name || 'Caja 1'}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-slate-800">{storeLabel}</span>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[10px]">
                            {(shift.cashier_name || 'C').charAt(0)}
                          </div>
                          <span>{shift.cashier_name || 'Cajero'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-slate-500">
                        {shift.opened_at ? new Date(shift.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : '-'}
                      </td>

                      <td className="py-3.5 px-3 font-mono font-bold text-slate-900">
                        ${Number(shift.initial_usd || 0).toFixed(2)}
                      </td>

                      <td className="py-3.5 px-3 font-mono text-slate-600">
                        Bs. {Number(shift.initial_ves || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedShiftForQr({
                              name: shift.register_name || 'Caja',
                              url: `${window.location.origin}/${slug}/caja`
                            });
                          }}
                          className="px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-xl font-bold text-[11px] inline-flex items-center gap-1 transition-all cursor-pointer"
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
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-base">{selectedShiftForQr.name}</h3>
              <button onClick={() => setSelectedShiftForQr(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl flex flex-col items-center justify-center border border-slate-200">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(selectedShiftForQr.url)}`}
                alt="QR Caja"
                className="w-44 h-44 rounded-lg object-contain"
              />
              <span className="text-[10px] text-slate-500 font-bold mt-2">
                Escanea para acceder directo con PIN
              </span>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-xl text-xs">
              <input 
                type="text" 
                readOnly 
                value={selectedShiftForQr.url}
                className="bg-transparent border-none outline-none text-slate-600 w-full text-[11px] font-mono truncate"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedShiftForQr.url);
                  toast.success('¡Enlace copiado al portapapeles!');
                }}
                className="p-1.5 bg-white text-slate-700 hover:text-orange-600 rounded-lg shadow-2xs cursor-pointer"
              >
                <Copy size={13} />
              </button>
            </div>

            <button
              onClick={() => setSelectedShiftForQr(null)}
              className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl"
            >
              Listo
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
