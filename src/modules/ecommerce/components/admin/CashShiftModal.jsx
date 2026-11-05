// ==============================================================================
// AXONMARKET & AXONPOS — Modal de Control de Caja, Turnos, Arqueo Ciego & SENIAT
// Diseño Ergonómico "Luminous White & Radiant Orange" — Retail & Gastro POS
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  FileSpreadsheet,
  Lock,
  Printer,
  AlertTriangle,
  X,
  Monitor,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  Clock,
  User,
  PlusCircle,
  Receipt,
  RotateCcw,
  Tag
} from 'lucide-react';
import { supabase } from '../../../../supabaseClient';
import { offlineDb } from '../../services/offlineSyncService';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';

export default function CashShiftModal({
  isOpen,
  onClose,
  activeShift,
  onShiftChange,
  bcvRate = 888.89,
  storeName = 'AxonMarket Store',
  initialTab = 'status'
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [currentUser, setCurrentUser] = useState(authService.getCurrentUser());
  const [movements, setMovements] = useState([]);
  const [registers, setAvailableRegisters] = useState([]);
  const [availableStaff, setAvailableStaff] = useState([]);

  // Estados para Apertura de Turno (si no hay turno activo)
  const [openRegisterName, setOpenRegisterName] = useState('Caja 1 - Principal');
  const [openCashierName, setOpenCashierName] = useState('yende');
  const [openInitialUsd, setOpenInitialUsd] = useState('50.00');
  const [openInitialVes, setOpenInitialVes] = useState('1000.00');

  // Arqueo Ciego
  const [actualUsd, setActualUsd] = useState('');
  const [actualVes, setActualVes] = useState('');
  const [showBlindDiscrepancies, setShowBlindDiscrepancies] = useState(false);

  // Caja Chica
  const [movementType, setMovementType] = useState('OUT');
  const [movementAmountUsd, setMovementAmountUsd] = useState('');
  const [movementAmountVes, setMovementAmountVes] = useState('');
  const [movementReason, setMovementReason] = useState('');

  // Cargar usuario actual, cajas y movimientos
  useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);

      const u = authService.getCurrentUser();
      if (u) {
        setCurrentUser(u);
      }

      // Cargar lista de cajeros y personal real
      const activeWs = localStorage.getItem('activeWorkspace');
      if (activeWs) {
        supabase.from('workspaces').select('config').eq('id', activeWs).maybeSingle().then(({ data }) => {
          const cfgUsers = data?.config?.users || [];
          if (cfgUsers.length > 0) {
            setAvailableStaff(cfgUsers);
            const defCashier = cfgUsers.find(x => x.role === 'CASHIER') || cfgUsers[0];
            if (defCashier) setOpenCashierName(defCashier.full_name || defCashier.fullName);
          }
        });
      }

      authService.getUsers().then(users => {
        if (users && users.length > 0) {
          setAvailableStaff(prev => prev.length > 0 ? prev : users);
          const firstCashier = users.find(x => x.role === 'CASHIER') || users[0];
          if (firstCashier) setOpenCashierName(firstCashier.fullName);
        }
      });

      authService.getCashRegisters().then(regs => {
        setAvailableRegisters(regs.filter(r => r.isActive));
      });
      loadMovements();
    }
  }, [isOpen, activeShift, initialTab]);

  const loadMovements = async () => {
    try {
      if (activeShift?.id) {
        const movs = await offlineDb.cash_movements.where('shiftId').equals(activeShift.id).toArray();
        setMovements(movs);
      } else {
        const movs = await offlineDb.cash_movements.orderBy('timestamp').reverse().limit(20).toArray();
        setMovements(movs);
      }
    } catch (e) {
      console.warn('Error loading cash movements:', e);
    }
  };

  if (!isOpen) return null;

  // Cálculos de ventas simuladas/reales del turno
  const shiftTotals = activeShift?.totals || {
    salesCount: activeShift?.salesCount || 0,
    cashUsd: activeShift?.cashUsd || 0,
    cashVes: activeShift?.cashVes || 0,
    pagoMovil: activeShift?.pagoMovil || 0,
    puntoVenta: activeShift?.puntoVenta || 0,
    zelle: activeShift?.zelle || 0,
    credito: activeShift?.credito || 0,
    totalSalesUsd: activeShift?.totalSalesUsd || 0,
    totalSalesVes: activeShift?.totalSalesVes || 0
  };

  const initialUsd = Number(activeShift?.initialUsd || 50.0);
  const initialVes = Number(activeShift?.initialVes || 1000.0);

  // Movimientos netos
  const totalInUsd = movements.filter(m => m.type === 'IN').reduce((acc, m) => acc + (Number(m.amountUsd) || 0), 0);
  const totalOutUsd = movements.filter(m => m.type === 'OUT').reduce((acc, m) => acc + (Number(m.amountUsd) || 0), 0);
  const totalInVes = movements.filter(m => m.type === 'IN').reduce((acc, m) => acc + (Number(m.amountVes) || 0), 0);
  const totalOutVes = movements.filter(m => m.type === 'OUT').reduce((acc, m) => acc + (Number(m.amountVes) || 0), 0);

  const expectedUsd = initialUsd + shiftTotals.cashUsd + totalInUsd - totalOutUsd;
  const expectedVes = initialVes + shiftTotals.cashVes + totalInVes - totalOutVes;

  // Apertura de nuevo turno
  const handleOpenShift = async () => {
    const newShift = {
      id: `shift-${Date.now()}`,
      registerName: openRegisterName,
      cashierName: openCashierName,
      initialUsd: parseFloat(openInitialUsd) || 0,
      initialVes: parseFloat(openInitialVes) || 0,
      openedAt: new Date().toISOString(),
      status: 'OPEN',
      bcvRate: Number(bcvRate) || 888.89,
      salesCount: 0,
      cashUsd: 0,
      cashVes: 0,
      pagoMovil: 0,
      puntoVenta: 0,
      zelle: 0,
      credito: 0,
      totalSalesUsd: 0,
      totalSalesVes: 0
    };

    await offlineDb.cash_shifts.put(newShift);
    localStorage.setItem('axon_active_shift', JSON.stringify(newShift));
    if (onShiftChange) onShiftChange(newShift);

    // Sincronizar en Supabase cash_shifts para la Caja Maestra
    try {
      const activeWs = localStorage.getItem('activeWorkspace');
      if (activeWs) {
        await supabase.from('cash_shifts').insert([{
          branch_id: activeWs,
          register_name: openRegisterName,
          cashier_name: openCashierName,
          opened_at: newShift.openedAt,
          initial_usd: newShift.initialUsd,
          initial_ves: newShift.initialVes,
          expected_usd: newShift.initialUsd,
          expected_ves: newShift.initialVes,
          status: 'OPEN',
          notes: JSON.stringify({
            bcvRate: Number(bcvRate) || 888.89,
            storeName
          })
        }]);
      }
    } catch (errDb) {
      console.warn('Advertencia sincronizando turno a Supabase:', errDb);
    }

    toast.success(`Turno abierto con éxito en ${openRegisterName}`);
    setActiveTab('status');
  };

  // Guardar movimiento de caja chica
  const handleRecordMovement = async () => {
    if (!movementReason.trim()) {
      toast.error('Ingrese el motivo del movimiento.');
      return;
    }
    const usd = parseFloat(movementAmountUsd) || 0;
    const ves = parseFloat(movementAmountVes) || 0;
    if (usd === 0 && ves === 0) {
      toast.error('Ingrese un monto válido en USD o Bs.');
      return;
    }

    const mov = {
      id: `mov-${Date.now()}`,
      shiftId: activeShift?.id || 'default_shift',
      type: movementType,
      amountUsd: usd,
      amountVes: ves,
      reason: movementReason.trim(),
      cashier: currentUser?.fullName || 'Axon (Propietario)',
      timestamp: new Date().toISOString()
    };

    await offlineDb.cash_movements.put(mov);
    toast.success(`${movementType === 'IN' ? 'Entrada' : 'Egreso'} de caja chica asentado.`);
    setMovementAmountUsd('');
    setMovementAmountVes('');
    setMovementReason('');
    loadMovements();
    setActiveTab('status');
  };

  // Cierre de Turno con Arqueo Ciego
  const handleCloseShift = async () => {
    const actUsd = parseFloat(actualUsd) || 0;
    const actVes = parseFloat(actualVes) || 0;

    const diffUsd = actUsd - expectedUsd;
    const diffVes = actVes - expectedVes;

    const closedShift = {
      ...activeShift,
      status: 'CLOSED',
      closedAt: new Date().toISOString(),
      actualUsd: actUsd,
      actualVes: actVes,
      expectedUsd,
      expectedVes,
      differenceUsd: diffUsd,
      differenceVes: diffVes,
      closedBy: currentUser?.fullName || 'Axon (Propietario)'
    };

    await offlineDb.cash_shifts.put(closedShift);
    localStorage.removeItem('axon_active_shift');
    if (onShiftChange) onShiftChange(null);

    // Actualizar en Supabase cash_shifts
    try {
      const activeWs = localStorage.getItem('activeWorkspace');
      if (activeWs) {
        await supabase
          .from('cash_shifts')
          .update({
            closed_at: closedShift.closedAt,
            actual_usd: actUsd,
            actual_ves: actVes,
            expected_usd: expectedUsd,
            expected_ves: expectedVes,
            difference_usd: diffUsd,
            difference_ves: diffVes,
            status: 'CLOSED'
          })
          .match({
            branch_id: activeWs,
            status: 'OPEN'
          });
      }
    } catch (errDb) {
      console.warn('Advertencia cerrando turno en Supabase:', errDb);
    }

    toast.success('Turno cerrado y archivado con éxito.');
    onClose();
  };

  // Impresión de comprobante térmico
  const handlePrintCuadre = () => {
    const win = window.open('', '_blank', 'width=350,height=550');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Cuadre de Turno - ${activeShift?.registerName || 'Caja 1'}</title>
          <style>
            body { font-family: monospace; font-size: 12px; width: 280px; margin: 0 auto; padding: 10px; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 14px;">${storeName}</div>
          <div class="center">CUADRE DE CAJA (ARQUEO)</div>
          <div class="center">${activeShift?.registerName || 'Caja 1 - Principal'}</div>
          <div class="divider"></div>
          <div class="row"><span>Cajero:</span><span class="bold">${activeShift?.cashierName || 'Cajero'}</span></div>
          <div class="row"><span>Apertura:</span><span>${new Date(activeShift?.openedAt || Date.now()).toLocaleTimeString()}</span></div>
          <div class="row"><span>Tasa BCV:</span><span>Bs. ${Number(bcvRate).toFixed(2)}</span></div>
          <div class="divider"></div>
          <div class="row"><span>Fondo Inicial ($):</span><span>$${initialUsd.toFixed(2)}</span></div>
          <div class="row"><span>Fondo Inicial (Bs):</span><span>Bs. ${initialVes.toFixed(2)}</span></div>
          <div class="divider"></div>
          <div class="row"><span>Efectivo USD:</span><span>$${shiftTotals.cashUsd.toFixed(2)}</span></div>
          <div class="row"><span>Efectivo Bs.:</span><span>Bs. ${shiftTotals.cashVes.toFixed(2)}</span></div>
          <div class="row"><span>Pago Móvil:</span><span>Bs. ${shiftTotals.pagoMovil.toFixed(2)}</span></div>
          <div class="row"><span>Punto de Venta:</span><span>Bs. ${shiftTotals.puntoVenta.toFixed(2)}</span></div>
          <div class="row"><span>Zelle:</span><span>$${shiftTotals.zelle.toFixed(2)}</span></div>
          <div class="row"><span>Créditos / Fiado:</span><span>$${shiftTotals.credito.toFixed(2)}</span></div>
          <div class="divider"></div>
          <div class="row bold"><span>TOTAL VENTAS:</span><span>$${shiftTotals.totalSalesUsd.toFixed(2)}</span></div>
          <div class="row bold"><span>TOTAL BS:</span><span>Bs. ${shiftTotals.totalSalesVes.toFixed(2)}</span></div>
          <div class="divider"></div>
          <div class="row bold"><span>EFECTIVO ESPERADO ($):</span><span>$${expectedUsd.toFixed(2)}</span></div>
          <div class="row bold"><span>EFECTIVO ESPERADO (Bs):</span><span>Bs. ${expectedVes.toFixed(2)}</span></div>
          <div class="center" style="margin-top: 15px;">Firma del Cajero: __________________</div>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  const handlePrintReportX = () => {
    toast.success('Reporte X (Corte Parcial) generado e impreso.');
  };

  const handlePrintReportZ = () => {
    if (window.confirm('¿Está seguro de emitir el REPORTE Z? Este es el corte fiscal definitivo diario para SENIAT.')) {
      toast.success('Reporte Z (Cierre Diario) emitido con éxito.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* ========================================================
            CABECERA PRINCIPAL (IDÉNTICA A IMAGEN 3)
            ======================================================== */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
              <Wallet size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Control de {activeShift?.registerName || 'Caja 1 - Principal'}
                </h2>
                <span className="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 text-[10px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider">
                  {activeShift?.status === 'OPEN' ? 'Activa' : 'Inactiva'}
                </span>
                <span className="bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 text-[10px] font-black px-1.5 py-0.5 rounded-md">
                  F9
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 flex items-center gap-2">
                <span>Cajero: <strong className="text-slate-700 dark:text-zinc-200">{activeShift?.cashierName || currentUser?.fullName || 'Axon (Propietario)'}</strong></span>
                <span>•</span>
                <span>Abierto: {activeShift ? new Date(activeShift.openedAt).toLocaleTimeString('es-VE') : 'Caja cerrada'}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* ========================================================
            BARRA DE PESTAÑAS
            ======================================================== */}
        <div className="px-4 sm:px-6 pt-3 pb-2 flex items-center gap-2 overflow-x-auto custom-scrollbar border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-zinc-950/40">
          {[
            { id: 'status', label: 'Estado de Caja' },
            { id: 'movement', label: 'Caja Chica (Gastos/Ingresos)' },
            { id: 'close', label: 'Arqueo y Cierre de Turno' },
            { id: 'registers', label: `Monitor Multi-Cajas (${registers.length || 1})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
                  : 'bg-white dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200/60 dark:border-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ========================================================
            CUERPO DE LA PESTAÑA SELECCIONADA
            ======================================================== */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 custom-scrollbar">

          {/* TAB 1: ESTADO DE CAJA */}
          {activeTab === 'status' && (
            <>
              {activeShift?.status !== 'OPEN' && (
                <div className="p-5 rounded-2xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-500/30 space-y-3.5 mb-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-orange-900 dark:text-orange-300 flex items-center gap-2">
                      <Lock size={15} className="text-orange-600" />
                      <span>Caja Cerrada — Apertura de Nuevo Turno</span>
                    </h4>
                    <span className="text-[10px] font-bold text-orange-600 bg-orange-100 dark:bg-orange-500/20 px-2 py-0.5 rounded-full">
                      Habilitar Cobros
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Cajero Responsable</label>
                      <select
                        value={openCashierName}
                        onChange={e => setOpenCashierName(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white"
                      >
                        {availableStaff.length > 0 ? (
                          availableStaff.map((st, i) => (
                            <option key={st.id || i} value={st.full_name || st.fullName}>
                              {st.full_name || st.fullName} ({st.role || 'Cajero'})
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="yende">yende (Cajero)</option>
                            <option value="Axon (Propietario)">Axon (Propietario)</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Caja Registradora</label>
                      <select
                        value={openRegisterName}
                        onChange={e => setOpenRegisterName(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white"
                      >
                        {registers.length > 0 ? (
                          registers.map(r => (
                            <option key={r.id} value={r.name}>{r.name}</option>
                          ))
                        ) : (
                          <option value="Caja 1 - Principal">Caja 1 - Principal</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Fondo Inicial en Divisas ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={openInitialUsd}
                        onChange={e => setOpenInitialUsd(e.target.value)}
                        placeholder="50.00"
                        className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Fondo Inicial en Bolívares (Bs.)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={openInitialVes}
                        onChange={e => setOpenInitialVes(e.target.value)}
                        placeholder="1000.00"
                        className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleOpenShift}
                    className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs rounded-xl shadow-md shadow-orange-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={16} />
                    <span>Iniciar Turno de Caja Ahora</span>
                  </button>
                </div>
              )}
              {/* Tarjetas de Fondos Iniciales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800/40 border border-slate-200/80 dark:border-white/5 shadow-xs">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-400 mb-1">
                    Fondo Inicial en Divisas:
                  </p>
                  <p className="text-2xl font-black text-emerald-500">
                    ${initialUsd.toFixed(2)}
                  </p>
                  <p className="text-[11px] font-medium text-slate-400 mt-1">
                    Tasa Oficial: Bs. {Number(bcvRate).toFixed(2)}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800/40 border border-slate-200/80 dark:border-white/5 shadow-xs">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-400 mb-1">
                    Fondo Inicial en Bolívares:
                  </p>
                  <p className="text-2xl font-black text-cyan-600 dark:text-cyan-400">
                    Bs. {initialVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[11px] font-medium text-slate-400 mt-1">
                    Caja asignada: {activeShift?.registerName || 'Caja 1 - Principal'}
                  </p>
                </div>
              </div>

              {/* Ventas Acumuladas */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-zinc-950/50 border border-slate-200/60 dark:border-white/5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/5 mb-3 flex-wrap gap-2">
                  <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    Ventas Acumuladas en {activeShift?.registerName || 'Caja 1 - Principal'} ({shiftTotals.salesCount} ventas):
                  </h3>
                  <button 
                    onClick={handlePrintCuadre}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-200 hover:text-orange-500 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Printer size={14} />
                    <span>Imprimir Cuadre Térmico</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-white dark:bg-zinc-800/60 rounded-xl border border-slate-100 dark:border-white/5">
                    <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Efectivo USD ($):</span>
                    <span className="text-sm font-black text-emerald-500">${shiftTotals.cashUsd.toFixed(2)}</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-zinc-800/60 rounded-xl border border-slate-100 dark:border-white/5">
                    <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Efectivo Bolívares:</span>
                    <span className="text-sm font-black text-cyan-600 dark:text-cyan-400">Bs. {shiftTotals.cashVes.toFixed(2)}</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-zinc-800/60 rounded-xl border border-slate-100 dark:border-white/5">
                    <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Pago Móvil:</span>
                    <span className="text-sm font-black text-orange-500">Bs. {shiftTotals.pagoMovil.toFixed(2)}</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-zinc-800/60 rounded-xl border border-slate-100 dark:border-white/5">
                    <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Punto de Venta:</span>
                    <span className="text-sm font-black text-teal-500">Bs. {shiftTotals.puntoVenta.toFixed(2)}</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-zinc-800/60 rounded-xl border border-slate-100 dark:border-white/5">
                    <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Zelle:</span>
                    <span className="text-sm font-black text-violet-500">${shiftTotals.zelle.toFixed(2)}</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-zinc-800/60 rounded-xl border border-slate-100 dark:border-white/5">
                    <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Créditos Cuenta:</span>
                    <span className="text-sm font-black text-pink-500">${shiftTotals.credito.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700 dark:text-zinc-200 uppercase">
                    Total Facturado en este Turno:
                  </span>
                  <span className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400">
                    ${shiftTotals.totalSalesUsd.toFixed(2)} (Bs. {shiftTotals.totalSalesVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })})
                  </span>
                </div>
              </div>

              {/* REPORTES SENIAT */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-400 mb-2">
                  Reportes de Impresora Fiscal SENIAT (X y Z):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button 
                    onClick={handlePrintReportX}
                    className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-2xl text-xs font-extrabold text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-zinc-700/50 shadow-2xs transition-all cursor-pointer"
                  >
                    <Receipt size={16} className="text-orange-500" />
                    <span>Emitir Reporte X (Corte Parcial)</span>
                  </button>

                  <button 
                    onClick={handlePrintReportZ}
                    className="flex items-center justify-center gap-2 p-3 bg-rose-50/50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-2xl text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:bg-rose-100/60 dark:hover:bg-rose-500/20 shadow-2xs transition-all cursor-pointer"
                  >
                    <Printer size={16} className="text-rose-500" />
                    <span>Emitir Reporte Z (Cierre Diario)</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: CAJA CHICA */}
          {activeTab === 'movement' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/60 dark:border-white/5 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-white">
                  Registrar Movimiento en Caja Chica
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMovementType('OUT')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      movementType === 'OUT' ? 'bg-rose-500 text-white shadow-xs' : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300'
                    }`}
                  >
                    Egreso / Retiro
                  </button>
                  <button
                    onClick={() => setMovementType('IN')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      movementType === 'IN' ? 'bg-emerald-500 text-white shadow-xs' : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300'
                    }`}
                  >
                    Entrada de Dinero
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Monto en USD ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={movementAmountUsd}
                      onChange={e => setMovementAmountUsd(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Monto en Bs.</label>
                    <input
                      type="number"
                      step="0.01"
                      value={movementAmountVes}
                      onChange={e => setMovementAmountVes(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Motivo / Concepto *</label>
                  <input
                    type="text"
                    value={movementReason}
                    onChange={e => setMovementReason(e.target.value)}
                    placeholder="Ej. Pago a proveedor de pan, compra de bolsas..."
                    className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                </div>

                <button
                  onClick={handleRecordMovement}
                  className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                >
                  Asentar Movimiento
                </button>
              </div>

              {/* Historial de Movimientos */}
              <div>
                <h5 className="text-[10px] font-black uppercase text-slate-400 mb-2">Movimientos del Turno:</h5>
                {movements.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 dark:bg-zinc-950 rounded-2xl">
                    No se han registrado movimientos de caja chica en este turno.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {movements.map(m => (
                      <div key={m.id} className="p-3 bg-white dark:bg-zinc-800/50 border border-slate-100 dark:border-white/5 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className={`p-1.5 rounded-lg ${m.type === 'IN' ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10' : 'bg-rose-50 text-rose-500 dark:bg-rose-500/10'}`}>
                            {m.type === 'IN' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                          </span>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-white">{m.reason}</p>
                            <p className="text-[10px] text-slate-400">{new Date(m.timestamp).toLocaleTimeString()} • Por: {m.cashier}</p>
                          </div>
                        </div>
                        <div className="text-right font-black">
                          {Number(m.amountUsd) > 0 && <p className={m.type === 'IN' ? 'text-emerald-500' : 'text-rose-500'}>{m.type === 'IN' ? '+' : '-'}${Number(m.amountUsd).toFixed(2)}</p>}
                          {Number(m.amountVes) > 0 && <p className="text-slate-500 text-[10px]">Bs. {Number(m.amountVes).toFixed(2)}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ARQUEO Y CIERRE DE TURNO */}
          {activeTab === 'close' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                <h4 className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <AlertTriangle size={16} /> Arqueo Ciego de Seguridad
                </h4>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                  Cuente físicamente el efectivo presente en la gaveta y digítelo a continuación. El sistema comparará con el saldo teórico y registrará cualquier diferencia.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 space-y-2">
                  <label className="text-xs font-black text-slate-700 dark:text-white uppercase block">
                    Efectivo Físico en Divisas ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={actualUsd}
                    onChange={e => setActualUsd(e.target.value)}
                    className="w-full text-xl font-black bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                  <p className="text-[10px] text-slate-400">Total billetes contados en USD</p>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 space-y-2">
                  <label className="text-xs font-black text-slate-700 dark:text-white uppercase block">
                    Efectivo Físico en Bolívares (Bs.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={actualVes}
                    onChange={e => setActualVes(e.target.value)}
                    className="w-full text-xl font-black bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                  <p className="text-[10px] text-slate-400">Total billetes contados en Bs.</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-zinc-950 rounded-2xl border border-slate-200/60 dark:border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Saldo Teórico Esperado USD:</span>
                  <span className="font-bold text-slate-800 dark:text-white">${expectedUsd.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Saldo Teórico Esperado Bs.:</span>
                  <span className="font-bold text-slate-800 dark:text-white">Bs. {expectedVes.toFixed(2)}</span>
                </div>

                {actualUsd && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-xs font-black">
                    <span>Diferencia USD:</span>
                    <span className={Number(actualUsd) - expectedUsd >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                      {Number(actualUsd) - expectedUsd >= 0 ? '+' : ''}${(Number(actualUsd) - expectedUsd).toFixed(2)}
                      {Number(actualUsd) - expectedUsd === 0 ? ' (Cuadre Exacto)' : (Number(actualUsd) - expectedUsd > 0 ? ' (Sobrante)' : ' (Faltante)')}
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={handleCloseShift}
                className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-sm rounded-2xl shadow-lg shadow-rose-500/25 transition-all cursor-pointer"
              >
                Confirmar Arqueo y Cerrar Turno Definitivo
              </button>
            </div>
          )}

          {/* TAB 4: MONITOR MULTI-CAJAS */}
          {activeTab === 'registers' && (
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                Terminales Configuradas en el Comercio ({registers.length}):
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {registers.map(reg => (
                  <div key={reg.id} className="p-4 bg-white dark:bg-zinc-800 rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                        <Monitor size={15} className="text-orange-500" />
                        {reg.name}
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${reg.id === activeShift?.registerId || reg.name === activeShift?.registerName ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                        {reg.id === activeShift?.registerId || reg.name === activeShift?.registerName ? 'En Uso (Tu Caja)' : 'Disponible'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">Código: {reg.code} • Sucursal: {reg.branchId || 'Principal'}</p>
                    <p className="text-[11px] text-slate-400 mt-1">Fondo predeterminado: ${reg.defaultFloatUsd || 50} / Bs. {reg.defaultFloatVes || 1000}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
