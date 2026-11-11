// ==============================================================================
// AXONMARKET & AXONPOS — Modal de Control de Caja, Turnos, Arqueo & SENIAT
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
  Tag,
  Coins,
  CreditCard,
  Smartphone,
  Landmark,
  TrendingUp,
  LogOut
} from 'lucide-react';
import { supabase } from '../../../../supabaseClient';
import { offlineDb } from '../../services/offlineSyncService';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';

export default function CashShiftModal({
  isOpen,
  onClose,
  activeShift: propActiveShift,
  onShiftChange,
  bcvRate = 888.89,
  storeName = 'AxonMarket Store',
  initialTab = 'status',
  orders: propOrders = []
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [currentUser, setCurrentUser] = useState(authService.getCurrentUser());
  const [movements, setMovements] = useState([]);
  const [registers, setAvailableRegisters] = useState([]);
  const [availableStaff, setAvailableStaff] = useState([]);
  const [internalOrders, setInternalOrders] = useState([]);

  // Estado del turno activo (prioriza prop, o carga de localStorage)
  const [currentShift, setCurrentShift] = useState(() => {
    if (propActiveShift) return propActiveShift;
    try {
      const s = localStorage.getItem('axon_active_shift');
      if (s) return JSON.parse(s);
    } catch (e) {}
    return null;
  });

  // Detectar si la sesión actual es modo cajero / trabajador
  const isCashier = Boolean(
    localStorage.getItem('axon_cashier_mode') === 'true' || 
    localStorage.getItem('axonpos_active_user_role') === 'CASHIER' ||
    currentUser?.role === 'CASHIER'
  );

  // Nombre de la caja activa y cajero
  const activeRegisterName = currentShift?.registerName || 
                             localStorage.getItem('axon_active_register_name') || 
                             'Caja 1 - Principal';
  const activeCashierName = currentShift?.cashierName || 
                            currentShift?.cashier || 
                            localStorage.getItem('axonpos_active_user_name') || 
                            currentUser?.fullName || 
                            'Cajero';

  // Estados para Apertura de Turno (si no hay turno activo)
  const [openRegisterName, setOpenRegisterName] = useState(activeRegisterName);
  const [openCashierName, setOpenCashierName] = useState(activeCashierName);
  const [openInitialUsd, setOpenInitialUsd] = useState('50.00');
  const [openInitialVes, setOpenInitialVes] = useState('1000.00');

  // Fusión: Registro inmediato de nueva caja desde apertura de turno (solo SuperAdmin)
  const [isCreatingNewRegInline, setIsCreatingNewRegInline] = useState(false);
  const [inlineRegName, setInlineRegName] = useState('');

  // Arqueo Ciego
  const [actualUsd, setActualUsd] = useState('');
  const [actualVes, setActualVes] = useState('');

  // Caja Chica
  const [movementType, setMovementType] = useState('OUT');
  const [movementAmountUsd, setMovementAmountUsd] = useState('');
  const [movementAmountVes, setMovementAmountVes] = useState('');
  const [movementReason, setMovementReason] = useState('');

  // Cargar usuario actual, cajas y movimientos
  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        // Si es cajero y pidieron 'registers', forzar a 'status'
        setActiveTab(isCashier && initialTab === 'registers' ? 'status' : initialTab);
      }

      const u = authService.getCurrentUser();
      if (u) {
        setCurrentUser(u);
      }

      // Sincronizar turno efectivo
      if (propActiveShift) {
        setCurrentShift(propActiveShift);
      } else {
        try {
          const s = localStorage.getItem('axon_active_shift');
          if (s) setCurrentShift(JSON.parse(s));
          else setCurrentShift(null);
        } catch (e) {}
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

      // Cargar órdenes de ecommerce_orders_v2 si no se pasaron como props
      if (propOrders.length === 0) {
        const wsId = localStorage.getItem('activeWorkspace');
        if (wsId) {
          supabase
            .from('ecommerce_orders_v2')
            .select('id, total, status, paymentmethod, paymentdetails, date, workspace_id, items')
            .eq('workspace_id', wsId)
            .neq('status', 'Cancelado')
            .order('date', { ascending: false })
            .then(({ data }) => {
              if (data) setInternalOrders(data);
            })
            .catch(console.error);
        }
      }
    }
  }, [isOpen, propActiveShift, initialTab, propOrders.length]);

  const orders = propOrders.length > 0 ? propOrders : internalOrders;

  const loadMovements = async () => {
    try {
      const shiftId = currentShift?.id || propActiveShift?.id;
      if (shiftId) {
        const movs = await offlineDb.cash_movements.where('shiftId').equals(shiftId).toArray();
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

  const isOpenShift = Boolean(currentShift && (currentShift.status === 'OPEN' || currentShift.status === 'ABIERTO'));

  // Totales de ventas acumuladas en este turno calculadas de las órdenes reales
  const shiftTotals = (() => {
    let salesCount = Number(currentShift?.salesCount || 0);
    let cashUsd = Number(currentShift?.cashUsd ?? currentShift?.cashSalesUsd ?? 0);
    let cashVes = Number(currentShift?.cashVes ?? currentShift?.cashSalesVes ?? 0);
    let pagoMovil = Number(currentShift?.pagoMovil || 0);
    let puntoVenta = Number(currentShift?.puntoVenta || 0);
    let zelle = Number(currentShift?.zelle || 0);
    let credito = Number(currentShift?.credito || 0);
    let totalSalesUsd = Number(currentShift?.totalSalesUsd || 0);
    let totalSalesVes = Number(currentShift?.totalSalesVes || 0);

    if (orders.length > 0) {
      const shiftStartRaw = currentShift?.opened_at || currentShift?.openedAt;
      const shiftEndRaw = currentShift?.closed_at || currentShift?.closedAt;
      const startMs = shiftStartRaw ? new Date(shiftStartRaw).getTime() : 0;
      const endMs = shiftEndRaw ? new Date(shiftEndRaw).getTime() : Infinity;

      const matchingOrders = orders.filter(o => {
        if (!o.date) return false;
        const oTime = new Date(o.date).getTime();
        if (isNaN(oTime)) return false;
        if (startMs > 0 && (oTime < startMs || oTime > endMs)) return false;
        return true;
      });

      const ordersToCount = matchingOrders.length > 0 
        ? matchingOrders 
        : (shiftStartRaw ? orders.filter(o => o.date && o.date.slice(0, 10) === shiftStartRaw.slice(0, 10)) : orders);

      if (ordersToCount.length > 0) {
        salesCount = ordersToCount.length;
        totalSalesUsd = 0;
        totalSalesVes = 0;
        cashUsd = 0;
        cashVes = 0;
        pagoMovil = 0;
        puntoVenta = 0;
        zelle = 0;
        credito = 0;

        ordersToCount.forEach(o => {
          const ordUsd = Number(o.total) || 0;
          const pd = typeof o.paymentdetails === 'string'
            ? (() => { try { return JSON.parse(o.paymentdetails); } catch(e) { return {}; } })()
            : (o.paymentdetails || {});
          const rate = Number(pd.bcvRate) || Number(bcvRate) || 1;
          const ordVes = Number(pd.totalVes) || (ordUsd * rate);

          totalSalesUsd += ordUsd;
          totalSalesVes += ordVes;

          if (Array.isArray(pd.payments) && pd.payments.length > 0) {
            pd.payments.forEach(p => {
              const m = String(p.method || '').toUpperCase();
              const cur = String(p.currency || 'USD').toUpperCase();
              const paid = Number(p.amountPaid) || 0;
              const vesEq = (cur === 'USD' ? paid * rate : paid);
              const usdEq = (cur === 'USD' ? paid : paid / rate);

              if (m === 'CASH_USD' || (m.includes('CASH') && cur === 'USD') || m === 'EFECTIVO_USD') {
                cashUsd += paid;
              } else if (m === 'CASH_VES' || (m.includes('CASH') && cur === 'VES') || m.includes('EFECTIVO_BS')) {
                cashVes += paid;
              } else if (m === 'PAGO_MOVIL' || m.includes('MOVIL')) {
                pagoMovil += vesEq;
              } else if (m === 'POS_CARD' || m.includes('PUNTO') || m.includes('TARJETA') || m.includes('CARD')) {
                puntoVenta += vesEq;
              } else if (m === 'ZELLE') {
                zelle += usdEq;
              } else if (m.includes('CREDIT') || m.includes('FIADO')) {
                credito += usdEq;
              }
            });
          } else {
            const pm = String(o.paymentmethod || '').toLowerCase();
            if (pm.includes('cash_usd') || pm.includes('dolares')) {
              cashUsd += ordUsd;
            } else if (pm.includes('cash_ves') || pm.includes('bolivares')) {
              cashVes += ordVes;
            } else if (pm.includes('movil')) {
              pagoMovil += ordVes;
            } else if (pm.includes('punto') || pm.includes('tarjeta')) {
              puntoVenta += ordVes;
            } else if (pm.includes('zelle')) {
              zelle += ordUsd;
            } else if (pm.includes('credito') || pm.includes('fiado')) {
              credito += ordUsd;
            } else {
              cashUsd += ordUsd;
            }
          }
        });
      }
    }

    return {
      salesCount,
      cashUsd,
      cashVes,
      pagoMovil,
      puntoVenta,
      zelle,
      credito,
      totalSalesUsd,
      totalSalesVes: totalSalesVes || (totalSalesUsd * (Number(bcvRate) || 888.89))
    };
  })();

  const initialUsd = Number(currentShift?.initial_usd ?? currentShift?.initialUsd ?? currentShift?.initialCashUsd ?? 50.0);
  const initialVes = Number(currentShift?.initial_ves ?? currentShift?.initialVes ?? currentShift?.initialCashVes ?? 1000.0);

  // Movimientos netos de caja chica
  const totalInUsd = movements.filter(m => m.type === 'IN').reduce((acc, m) => acc + (Number(m.amountUsd) || 0), 0);
  const totalOutUsd = movements.filter(m => m.type === 'OUT').reduce((acc, m) => acc + (Number(m.amountUsd) || 0), 0);
  const totalInVes = movements.filter(m => m.type === 'IN').reduce((acc, m) => acc + (Number(m.amountVes) || 0), 0);
  const totalOutVes = movements.filter(m => m.type === 'OUT').reduce((acc, m) => acc + (Number(m.amountVes) || 0), 0);

  // Efectivo físico esperado en gaveta
  const expectedUsd = initialUsd + shiftTotals.cashUsd + totalInUsd - totalOutUsd;
  const expectedVes = initialVes + shiftTotals.cashVes + totalInVes - totalOutVes;

  // Apertura de nuevo turno
  const handleOpenShift = async () => {
    let finalRegisterName = isCashier ? activeRegisterName : openRegisterName;

    if (!isCashier && isCreatingNewRegInline) {
      if (!inlineRegName.trim()) {
        toast.error('Ingrese el nombre de la nueva caja.');
        return;
      }
      finalRegisterName = inlineRegName.trim();

      try {
        await authService.saveCashRegister({
          name: finalRegisterName,
          defaultFloatUsd: parseFloat(openInitialUsd) || 0,
          defaultFloatVes: parseFloat(openInitialVes) || 0,
          defaultCashier: openCashierName
        });
        const updatedRegs = await authService.getCashRegisters();
        setAvailableRegisters(updatedRegs.filter(r => r.isActive));
        setIsCreatingNewRegInline(false);
      } catch (errReg) {
        console.warn('Advertencia guardando nueva caja:', errReg);
      }
    }

    const newShift = {
      id: `shift-${Date.now()}`,
      registerId: localStorage.getItem('axon_active_register_id') || `caja-${Date.now()}`,
      registerName: finalRegisterName,
      cashierId: localStorage.getItem('axonpos_active_user_id') || 'cashier',
      cashierName: isCashier ? activeCashierName : openCashierName,
      initialUsd: parseFloat(openInitialUsd) || 0,
      initialCashUsd: parseFloat(openInitialUsd) || 0,
      initialVes: parseFloat(openInitialVes) || 0,
      initialCashVes: parseFloat(openInitialVes) || 0,
      openedAt: new Date().toISOString(),
      status: 'OPEN',
      bcvRate: Number(bcvRate) || 888.89,
      salesCount: 0,
      cashUsd: 0,
      cashSalesUsd: 0,
      cashVes: 0,
      cashSalesVes: 0,
      pagoMovil: 0,
      puntoVenta: 0,
      zelle: 0,
      credito: 0,
      totalSalesUsd: 0,
      totalSalesVes: 0
    };

    await offlineDb.cash_shifts.put(newShift);
    localStorage.setItem('axon_active_shift', JSON.stringify(newShift));
    localStorage.setItem('axon_active_register_name', finalRegisterName);
    setCurrentShift(newShift);
    if (onShiftChange) onShiftChange(newShift);

    // Sincronizar en Supabase cash_shifts
    try {
      const activeWs = localStorage.getItem('activeWorkspace');
      if (activeWs) {
        await supabase.from('cash_shifts').insert([{
          branch_id: activeWs,
          register_name: finalRegisterName,
          cashier_name: newShift.cashierName,
          opened_at: newShift.openedAt,
          initial_usd: newShift.initialUsd,
          initial_ves: newShift.initialVes,
          expected_usd: newShift.initialUsd,
          expected_ves: newShift.initialVes,
          status: 'OPEN',
          notes: JSON.stringify({
            bcvRate: Number(bcvRate) || 888.89,
            storeName,
            fusedCreation: isCreatingNewRegInline
          })
        }]);
      }
    } catch (errDb) {
      console.warn('Advertencia sincronizando turno a Supabase:', errDb);
    }

    toast.success(`Turno abierto con éxito en ${finalRegisterName}`);
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
      shiftId: currentShift?.id || 'default_shift',
      registerName: activeRegisterName,
      type: movementType,
      amountUsd: usd,
      amountVes: ves,
      reason: movementReason.trim(),
      cashier: activeCashierName,
      timestamp: new Date().toISOString()
    };

    await offlineDb.cash_movements.put(mov);
    toast.success(`${movementType === 'IN' ? 'Entrada' : 'Egreso'} asentado en ${activeRegisterName}.`);
    setMovementAmountUsd('');
    setMovementAmountVes('');
    setMovementReason('');
    loadMovements();
    setActiveTab('status');
  };

  // Cierre definitivo de Turno con Arqueo
  const handleCloseShift = async () => {
    const actUsd = parseFloat(actualUsd) || 0;
    const actVes = parseFloat(actualVes) || 0;

    const diffUsd = actUsd - expectedUsd;
    const diffVes = actVes - expectedVes;

    const closedShift = {
      ...(currentShift || {}),
      registerName: activeRegisterName,
      cashierName: activeCashierName,
      status: 'CLOSED',
      closedAt: new Date().toISOString(),
      actualUsd: actUsd,
      actualVes: actVes,
      expectedUsd,
      expectedVes,
      differenceUsd: diffUsd,
      differenceVes: diffVes,
      closedBy: activeCashierName
    };

    await offlineDb.cash_shifts.put(closedShift);
    localStorage.removeItem('axon_active_shift');
    setCurrentShift(null);
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
            register_name: activeRegisterName,
            status: 'OPEN'
          });
      }
    } catch (errDb) {
      console.warn('Advertencia cerrando turno en Supabase:', errDb);
    }

    // Impresión automática de comprobante de cierre
    handlePrintCuadre();

    toast.success(`Turno de ${activeRegisterName} cerrado y archivado con éxito.`);
    onClose();

    // Si es cajero/trabajador, finalizar jornada y redirigir a la pantalla de estación / login
    if (isCashier) {
      localStorage.removeItem('axon_cashier_mode');
      localStorage.removeItem('axonpos_active_user_role');
      localStorage.removeItem('axonpos_active_user_name');
      localStorage.removeItem('axon_active_shift');
      localStorage.removeItem('axon_active_register_id');
      localStorage.removeItem('axon_active_register_name');
      const slug = localStorage.getItem('storeSlug');
      window.location.href = slug ? `/${slug}/caja` : '/merchant/login';
    }
  };

  // Impresión de comprobante térmico / Resumen Administrativo
  const handlePrintCuadre = () => {
    const win = window.open('', '_blank', 'width=350,height=580');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Cuadre de Turno - ${activeRegisterName}</title>
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
          <div class="center bold">RESUMEN ADMINISTRATIVO DE CAJA</div>
          <div class="center">${activeRegisterName}</div>
          <div class="divider"></div>
          <div class="row"><span>Cajero:</span><span class="bold">${activeCashierName}</span></div>
          <div class="row"><span>Apertura:</span><span>${currentShift?.openedAt ? new Date(currentShift.openedAt).toLocaleTimeString('es-VE') : 'N/A'}</span></div>
          <div class="row"><span>Tasa BCV:</span><span>Bs. ${Number(bcvRate).toFixed(2)}</span></div>
          <div class="divider"></div>
          <div class="row"><span>Fondo Inicial ($):</span><span>$${initialUsd.toFixed(2)}</span></div>
          <div class="row"><span>Fondo Inicial (Bs):</span><span>Bs. ${initialVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span></div>
          <div class="divider"></div>
          <div class="row"><span>Efectivo USD:</span><span>$${shiftTotals.cashUsd.toFixed(2)}</span></div>
          <div class="row"><span>Efectivo Bs.:</span><span>Bs. ${shiftTotals.cashVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span></div>
          <div class="row"><span>Pago Móvil:</span><span>Bs. ${shiftTotals.pagoMovil.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span></div>
          <div class="row"><span>Punto de Venta:</span><span>Bs. ${shiftTotals.puntoVenta.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span></div>
          <div class="row"><span>Zelle:</span><span>$${shiftTotals.zelle.toFixed(2)}</span></div>
          <div class="row"><span>Créditos / Fiado:</span><span>$${shiftTotals.credito.toFixed(2)}</span></div>
          <div class="divider"></div>
          <div class="row bold"><span>TOTAL VENTAS ($):</span><span>$${shiftTotals.totalSalesUsd.toFixed(2)}</span></div>
          <div class="row bold"><span>TOTAL VENTAS (Bs):</span><span>Bs. ${shiftTotals.totalSalesVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span></div>
          <div class="row"><span>Tickets / Facturas:</span><span>${shiftTotals.salesCount}</span></div>
          <div class="divider"></div>
          <div class="row"><span>Entradas Caja Chica:</span><span>+$${totalInUsd.toFixed(2)} / +Bs.${totalInVes.toFixed(2)}</span></div>
          <div class="row"><span>Egresos Caja Chica:</span><span>-$${totalOutUsd.toFixed(2)} / -Bs.${totalOutVes.toFixed(2)}</span></div>
          <div class="divider"></div>
          <div class="row bold"><span>EFECTIVO ESPERADO ($):</span><span>$${expectedUsd.toFixed(2)}</span></div>
          <div class="row bold"><span>EFECTIVO ESPERADO (Bs):</span><span>Bs. ${expectedVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span></div>
          <div class="divider"></div>
          <div class="center" style="margin-top: 15px;">Firma Cajero: __________________</div>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  // Pestañas disponibles: Para el cajero NO se muestra Monitor Multi-Cajas ni gestión de otras terminales
  const tabsList = [
    { id: 'status', label: 'Resumen de Caja' },
    { id: 'movement', label: 'Caja Chica (Gastos/Ingresos)' },
    { id: 'close', label: 'Arqueo y Cierre de Turno' }
  ];

  if (!isCashier) {
    tabsList.push({ id: 'registers', label: `Monitor Multi-Cajas (${registers.length || 1})` });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* ========================================================
            CABECERA PRINCIPAL DINÁMICA DE LA CAJA ACTIVA
            ======================================================== */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
              <Wallet size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Control de {activeRegisterName}
                </h2>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider ${
                  isOpenShift
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' 
                    : 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400'
                }`}>
                  {isOpenShift ? 'Activa' : 'Inactiva'}
                </span>
                <span className="bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 text-[10px] font-black px-1.5 py-0.5 rounded-md">
                  F9
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 flex items-center gap-2">
                <span>Cajero: <strong className="text-slate-700 dark:text-zinc-200">{activeCashierName}</strong></span>
                <span>•</span>
                <span>
                  {isOpenShift 
                    ? (() => {
                        const raw = currentShift?.opened_at || currentShift?.openedAt;
                        if (!raw) return 'Turno Abierto';
                        const d = new Date(raw);
                        return isNaN(d.getTime()) ? 'Turno Abierto' : `Abierto: ${d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}`;
                      })()
                    : 'Caja cerrada'
                  }
                </span>
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
            BARRA DE PESTAÑAS (ERGONOMÍA LIMPIA)
            ======================================================== */}
        <div className="px-4 sm:px-6 pt-3 pb-2 flex items-center gap-2 overflow-x-auto custom-scrollbar border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-zinc-950/40">
          {tabsList.map(tab => (
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

          {/* TAB 1: RESUMEN DE CAJA / ESTADO */}
          {activeTab === 'status' && (
            <>
              {/* Si la caja está cerrada, mostrar tarjeta de Apertura */}
              {!isOpenShift && (
                <div className="p-5 rounded-2xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-500/30 space-y-3.5 mb-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-orange-900 dark:text-orange-300 flex items-center gap-2">
                      <Lock size={15} className="text-orange-600" />
                      <span>Caja Cerrada — Apertura de Turno</span>
                    </h4>
                    <span className="text-[10px] font-bold text-orange-600 bg-orange-100 dark:bg-orange-500/20 px-2 py-0.5 rounded-full">
                      Habilitar Cobros
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Cajero Responsable</label>
                      {isCashier ? (
                        <input
                          type="text"
                          disabled
                          value={activeCashierName}
                          className="w-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white cursor-not-allowed"
                        />
                      ) : (
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
                              <option value={activeCashierName}>{activeCashierName} (Cajero)</option>
                              <option value="Axon (Propietario)">Axon (Propietario)</option>
                            </>
                          )}
                        </select>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">
                          Caja Registradora
                        </label>
                        {!isCashier && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsCreatingNewRegInline(prev => !prev);
                              if (!isCreatingNewRegInline && !inlineRegName) {
                                setInlineRegName(`Caja ${registers.length + 1}`);
                              }
                            }}
                            className="text-[10px] font-black text-orange-600 hover:text-orange-700 underline cursor-pointer"
                          >
                            {isCreatingNewRegInline ? '← Seleccionar existente' : '+ Registrar Nueva Caja'}
                          </button>
                        )}
                      </div>

                      {isCashier ? (
                        <input
                          type="text"
                          disabled
                          value={activeRegisterName}
                          className="w-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white cursor-not-allowed"
                        />
                      ) : isCreatingNewRegInline ? (
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={inlineRegName}
                            onChange={e => setInlineRegName(e.target.value)}
                            placeholder="Nombre de la nueva caja (Ej. Caja 2 - Terraza)"
                            className="w-full bg-orange-50/50 dark:bg-zinc-800 border border-orange-500/70 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                          />
                        </div>
                      ) : (
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
                            <option value={activeRegisterName}>{activeRegisterName}</option>
                          )}
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Fondo Inicial en Divisas ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={openInitialUsd}
                        onChange={e => {
                          const usd = e.target.value;
                          setOpenInitialUsd(usd);
                          if (!isNaN(usd) && usd !== '') {
                            setOpenInitialVes((parseFloat(usd) * (Number(bcvRate) || 894.89)).toFixed(2));
                          }
                        }}
                        placeholder="50.00"
                        className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Fondo Inicial en Bolívares (Bs.)</label>
                        <span className="text-[9px] text-orange-600 font-mono font-bold">BCV: {Number(bcvRate).toFixed(2)}</span>
                      </div>
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

              {/* RESUMEN ADMINISTRATIVO PRINCIPAL DE LA CAJA */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-zinc-950/60 border border-slate-200/80 dark:border-white/10 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-white/5 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-orange-500" />
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Resumen de Facturación en {activeRegisterName}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500">
                      {shiftTotals.salesCount} {shiftTotals.salesCount === 1 ? 'venta' : 'ventas'}
                    </span>
                    <button 
                      onClick={handlePrintCuadre}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-200 hover:text-orange-500 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Printer size={13} />
                      <span>Imprimir Cuadre</span>
                    </button>
                  </div>
                </div>

                {/* Tarjetas Principales de Totalización en Divisas y Bolívares */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 shadow-xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Total Facturado en Divisas ($):
                    </span>
                    <p className="text-2xl sm:text-3xl font-black text-emerald-500">
                      ${shiftTotals.totalSalesUsd.toFixed(2)}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">
                      Ventas cobradas en este turno
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 shadow-xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Total Facturado en Bolívares (Bs.):
                    </span>
                    <p className="text-2xl sm:text-3xl font-black text-cyan-600 dark:text-cyan-400">
                      Bs. {shiftTotals.totalSalesVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">
                      Tasa Oficial BCV: Bs. {Number(bcvRate).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Desglose por Método de Pago */}
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-400 mb-2.5">
                    Desglose por Medios de Pago:
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/70 dark:border-white/5">
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Efectivo USD ($)</span>
                      <span className="text-sm font-black text-emerald-500">${shiftTotals.cashUsd.toFixed(2)}</span>
                    </div>
                    <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/70 dark:border-white/5">
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Efectivo Bs.</span>
                      <span className="text-sm font-black text-cyan-600 dark:text-cyan-400">Bs. {shiftTotals.cashVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/70 dark:border-white/5">
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Pago Móvil</span>
                      <span className="text-sm font-black text-orange-500">Bs. {shiftTotals.pagoMovil.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/70 dark:border-white/5">
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Punto de Venta / Débito</span>
                      <span className="text-sm font-black text-teal-500">Bs. {shiftTotals.puntoVenta.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/70 dark:border-white/5">
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Zelle ($)</span>
                      <span className="text-sm font-black text-violet-500">${shiftTotals.zelle.toFixed(2)}</span>
                    </div>
                    <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/70 dark:border-white/5">
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Créditos / Cuentas</span>
                      <span className="text-sm font-black text-pink-500">${shiftTotals.credito.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Control Administrativo de Gaveta (Efectivo Físico Esperado) */}
                <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                      <Coins size={15} /> Efectivo Teórico que debe existir en Gaveta:
                    </span>
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                      Fondo + Ventas Efectivo ± Caja Chica
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-white/90 dark:bg-zinc-900 rounded-xl border border-amber-500/20">
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">Efectivo en Divisas Esperado ($)</span>
                      <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">${expectedUsd.toFixed(2)}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        Fondo inicial: ${initialUsd.toFixed(2)} · Ventas: ${shiftTotals.cashUsd.toFixed(2)} · Mov: ${Number(totalInUsd - totalOutUsd).toFixed(2)}
                      </p>
                    </div>

                    <div className="p-3 bg-white/90 dark:bg-zinc-900 rounded-xl border border-amber-500/20">
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">Efectivo en Bolívares Esperado (Bs.)</span>
                      <p className="text-xl font-black text-cyan-600 dark:text-cyan-400">Bs. {expectedVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">
                        Fondo inicial: Bs. {initialVes.toFixed(2)} · Ventas: Bs. {shiftTotals.cashVes.toFixed(2)} · Mov: Bs. {Number(totalInVes - totalOutVes).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Botones de Navegación Rápida */}
                {isOpenShift && (
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => setActiveTab('movement')}
                      className="flex-1 py-2.5 px-3 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Coins size={14} className="text-amber-500" />
                      <span>Registrar Gasto / Ingreso</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('close')}
                      className="flex-1 py-2.5 px-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-rose-500/20"
                    >
                      <LogOut size={14} />
                      <span>Arqueo y Cerrar Turno →</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: CAJA CHICA (GASTOS E INGRESOS) */}
          {activeTab === 'movement' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/60 dark:border-white/5 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-white flex items-center gap-2">
                  <Coins size={15} className="text-orange-500" />
                  <span>Registrar Movimiento en Caja Chica — {activeRegisterName}</span>
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMovementType('OUT')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      movementType === 'OUT' ? 'bg-rose-500 text-white shadow-xs' : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300'
                    }`}
                  >
                    Egreso / Retiro de Dinero
                  </button>
                  <button
                    onClick={() => setMovementType('IN')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
                    placeholder="Ej. Compra de bolsas, pago de hielo, anticipo..."
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

              {/* Historial de Movimientos de esta Caja */}
              <div>
                <h5 className="text-[10px] font-black uppercase text-slate-400 mb-2">Movimientos del Turno en {activeRegisterName}:</h5>
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

          {/* TAB 3: ARQUEO Y CIERRE DEFINITIVO DE TURNO */}
          {activeTab === 'close' && (
            <div className="space-y-4">
              
              {/* Resumen Administrativo Previo al Arqueo */}
              <div className="p-4 bg-slate-50 dark:bg-zinc-950 rounded-2xl border border-slate-200/60 dark:border-white/5 space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/5">
                  <span className="text-xs font-black uppercase text-slate-800 dark:text-white">
                    Resumen de Cierre: {activeRegisterName}
                  </span>
                  <span className="text-[11px] font-bold text-orange-600">
                    Cajero: {activeCashierName}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Ventas Totales ($):</span>
                    <span className="font-black text-slate-800 dark:text-white">${shiftTotals.totalSalesUsd.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Ventas Totales (Bs.):</span>
                    <span className="font-black text-slate-800 dark:text-white">Bs. {shiftTotals.totalSalesVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Ventas Efectivo $:</span>
                    <span className="font-bold text-emerald-600">${shiftTotals.cashUsd.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Ventas Efectivo Bs.:</span>
                    <span className="font-bold text-cyan-600">Bs. {shiftTotals.cashVes.toFixed(2)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <span className="text-slate-500 font-bold">Efectivo Teórico en Gaveta:</span>
                  <div className="flex items-center gap-3 font-mono font-black">
                    <span className="text-emerald-600">${expectedUsd.toFixed(2)}</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-cyan-600">Bs. {expectedVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Alerta de Arqueo Ciego */}
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                <h4 className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <AlertTriangle size={15} /> Arqueo Físico de Billetes en Gaveta
                </h4>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                  Cuente físicamente el efectivo presente en la caja y digite los montos contados. El sistema calculará el cuadre de forma automática.
                </p>
              </div>

              {/* Conteo Físico */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 space-y-2">
                  <label className="text-xs font-black text-slate-700 dark:text-white uppercase block">
                    Efectivo Físico Contado ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={actualUsd}
                    onChange={e => setActualUsd(e.target.value)}
                    className="w-full text-xl font-black bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                  <p className="text-[10px] text-slate-400">Total billetes contados en divisas</p>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 space-y-2">
                  <label className="text-xs font-black text-slate-700 dark:text-white uppercase block">
                    Efectivo Físico Contado (Bs.)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={actualVes}
                    onChange={e => setActualVes(e.target.value)}
                    className="w-full text-xl font-black bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                  <p className="text-[10px] text-slate-400">Total billetes contados en bolívares</p>
                </div>
              </div>

              {/* Diferencias en vivo */}
              {(actualUsd !== '' || actualVes !== '') && (
                <div className="p-4 bg-slate-50 dark:bg-zinc-950 rounded-2xl border border-slate-200/60 dark:border-white/5 space-y-2 text-xs">
                  {actualUsd !== '' && (
                    <div className="flex items-center justify-between font-black">
                      <span>Diferencia USD ($):</span>
                      <span className={Number(actualUsd) - expectedUsd >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                        {Number(actualUsd) - expectedUsd >= 0 ? '+' : ''}${(Number(actualUsd) - expectedUsd).toFixed(2)}
                        {Number(actualUsd) - expectedUsd === 0 ? ' (Cuadre Exacto)' : (Number(actualUsd) - expectedUsd > 0 ? ' (Sobrante)' : ' (Faltante)')}
                      </span>
                    </div>
                  )}
                  {actualVes !== '' && (
                    <div className="flex items-center justify-between font-black">
                      <span>Diferencia Bolívares (Bs.):</span>
                      <span className={Number(actualVes) - expectedVes >= 0 ? 'text-cyan-600' : 'text-rose-500'}>
                        {Number(actualVes) - expectedVes >= 0 ? '+' : ''}Bs. {(Number(actualVes) - expectedVes).toFixed(2)}
                        {Number(actualVes) - expectedVes === 0 ? ' (Cuadre Exacto)' : (Number(actualVes) - expectedVes > 0 ? ' (Sobrante)' : ' (Faltante)')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleCloseShift}
                className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-sm rounded-2xl shadow-lg shadow-rose-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <LogOut size={16} />
                <span>Confirmar Arqueo y Cerrar Turno Definitivo</span>
              </button>
            </div>
          )}

          {/* TAB 4: MONITOR MULTI-CAJAS (SOLO VISIBLE A SUPERADMIN / MASTER) */}
          {!isCashier && activeTab === 'registers' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  Terminales Configuradas en el Comercio ({registers.length}):
                </h4>
                <button
                  onClick={() => {
                    setActiveTab('status');
                    setIsCreatingNewRegInline(true);
                    setInlineRegName(`Caja ${registers.length + 1}`);
                  }}
                  className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <PlusCircle size={13} />
                  <span>+ Nueva Caja</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {registers.map(reg => {
                  const isCurrentActive = reg.id === currentShift?.registerId || reg.name === activeRegisterName;

                  return (
                    <div key={reg.id} className="p-4 bg-white dark:bg-zinc-800 rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-2xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                            <Monitor size={15} className="text-orange-500" />
                            {reg.name}
                          </span>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${isCurrentActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                            {isCurrentActive ? 'En Servicio (Tu Caja)' : 'Disponible'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">Código: {reg.code} • Sucursal: {reg.branchId || 'Principal'}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                          Fondo base: ${reg.defaultFloatUsd || 50} / Bs. {(Number(reg.defaultFloatVes) || (Number(reg.defaultFloatUsd || 50) * (Number(bcvRate) || 894.89))).toLocaleString('es-VE')}
                        </p>
                      </div>

                      {!isCurrentActive && (
                        <button
                          onClick={() => {
                            setOpenRegisterName(reg.name);
                            setIsCreatingNewRegInline(false);
                            setActiveTab('status');
                          }}
                          className="mt-3 w-full py-1.5 bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/10 dark:hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-xl text-[11px] font-bold text-center cursor-pointer transition-colors"
                        >
                          Abrir Turno en esta Caja →
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
