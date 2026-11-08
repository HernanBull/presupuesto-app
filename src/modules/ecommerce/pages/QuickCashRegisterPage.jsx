import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Store, User, Lock, DollarSign, ArrowRight, ShieldCheck, 
  Sparkles, CheckCircle2, ChevronRight, AlertCircle, RefreshCw
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { authService } from '../services/authService';
import { offlineDb } from '../services/offlineSyncService';
import toast from 'react-hot-toast';

export default function QuickCashRegisterPage() {
  const { registerId, storeSlug } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState('Mi Tienda');
  const [currentRegister, setCurrentRegister] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [bcvRate, setBcvRate] = useState(888.89);

  // Estados del formulario táctil
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [pinVerified, setPinVerified] = useState(false);
  const [step, setStep] = useState(1); // 1: Seleccionar Cajero & PIN, 2: Fondo Inicial & Apertura

  const [initialUsd, setInitialUsd] = useState('50.00');
  const [initialVes, setInitialVes] = useState('');

  // Cargar datos de la tienda, la caja y el personal
  useEffect(() => {
    const initRegisterPage = async () => {
      try {
        setLoading(true);
        const activeWs = localStorage.getItem('activeWorkspace') || 'default_workspace';

        // 1. Obtener datos de la tienda
        let targetWs = activeWs;
        if (storeSlug) {
          const { data: wsData } = await supabase
            .from('workspaces')
            .select('id, name, store_slug, config')
            .eq('store_slug', storeSlug)
            .maybeSingle();

          if (wsData) {
            targetWs = wsData.id;
            setStoreName(wsData.name);
            localStorage.setItem('activeWorkspace', wsData.id);
            if (wsData.store_slug) localStorage.setItem('storeSlug', wsData.store_slug);
            if (wsData.config?.bcvRate) setBcvRate(Number(wsData.config.bcvRate));
          }
        } else {
          const savedStore = localStorage.getItem('merchant_store_name');
          if (savedStore) setStoreName(savedStore);
        }

        // Tasa BCV oficial
        fetch('https://axonmarket-api.onrender.com/api/bcv')
          .then(res => res.json())
          .then(data => {
            if (data?.rate) setBcvRate(Number(data.rate));
          })
          .catch(() => {});

        // 2. Obtener la caja seleccionada
        const allRegisters = await authService.getCashRegisters(targetWs);
        let foundRegister = null;

        if (registerId) {
          foundRegister = allRegisters.find(r => r.id === registerId || r.code?.toLowerCase() === registerId.toLowerCase());
        }

        if (!foundRegister) {
          // Si no existe o es genérica, tomar la primera o crear una principal
          foundRegister = allRegisters[0] || {
            id: 'reg-principal',
            name: 'Caja 1 - Mostrador Principal',
            code: 'CAJA-01',
            defaultFloatUsd: 50,
            defaultFloatVes: 1000
          };
        }

        setCurrentRegister(foundRegister);
        if (foundRegister.defaultFloatUsd) setInitialUsd(Number(foundRegister.defaultFloatUsd).toFixed(2));
        if (foundRegister.defaultFloatVes) {
          setInitialVes(Number(foundRegister.defaultFloatVes).toFixed(2));
        } else {
          setInitialVes((Number(foundRegister.defaultFloatUsd || 50) * bcvRate).toFixed(2));
        }

        // 3. Obtener el personal configurado para esta tienda
        const users = await authService.getUsers(targetWs);
        const activeUsers = users.filter(u => u.isActive);
        setStaffList(activeUsers);

        // Preseleccionar si solo hay uno
        if (activeUsers.length === 1) {
          setSelectedStaff(activeUsers[0]);
        } else if (activeUsers.length > 0) {
          // Preseleccionar el primer cajero por conveniencia
          setSelectedStaff(activeUsers[0]);
        }
      } catch (e) {
        console.error('Error inicializando caja rápida:', e);
        // Fallback seguro para no bloquear la pantalla
        const fallbackWs = localStorage.getItem('activeWorkspace') || 'default_workspace';
        const fallbackUsers = await authService.getUsers(fallbackWs).catch(() => []);
        if (fallbackUsers.length > 0) {
          setStaffList(fallbackUsers);
          setSelectedStaff(fallbackUsers[0]);
        }
      } finally {
        setLoading(false);
      }
    };

    initRegisterPage();
  }, [registerId, storeSlug]);

  // Teclado numérico táctil para PIN
  const handlePinDigit = (digit) => {
    if (pinInput.length < 4) {
      const nextPin = pinInput + digit;
      setPinInput(nextPin);
      if (nextPin.length === 4) {
        validatePin(nextPin);
      }
    }
  };

  const handlePinDelete = () => {
    setPinInput(prev => prev.slice(0, -1));
  };

  const validatePin = (pinToTest) => {
    if (!selectedStaff) {
      toast.error('Selecciona primero tu usuario.');
      setPinInput('');
      return;
    }

    // Verificar si es Master PIN o el PIN del usuario
    const masterPin = localStorage.getItem('axon_master_pin') || '1234';
    const isMaster = selectedStaff.role === 'MASTER' || selectedStaff.isMaster;
    
    if (isMaster && pinToTest === masterPin) {
      proceedToFloatStep();
      return;
    }

    if (selectedStaff.pinCode === pinToTest) {
      proceedToFloatStep();
      return;
    }

    toast.error('PIN incorrecto. Intenta de nuevo.');
    setPinInput('');
  };

  const proceedToFloatStep = () => {
    setPinVerified(true);
    authService.saveCurrentUser(selectedStaff);
    localStorage.setItem('axonpos_active_user_role', selectedStaff.role || 'CASHIER');
    localStorage.setItem('axonpos_active_user_name', selectedStaff.fullName || 'Cajero');
    localStorage.setItem('axon_cashier_mode', selectedStaff.role === 'MASTER' ? 'false' : 'true');
    toast.success(`Identidad verificada: ${selectedStaff.fullName}`);
    setStep(2);
  };

  // Abrir Turno e ir al POS inmediatamente
  const handleStartShiftAndOpenPos = async () => {
    try {
      const parsedUsd = parseFloat(initialUsd) || 0;
      const parsedVes = parseFloat(initialVes) || 0;

      const newShift = {
        id: `shift-${Date.now()}`,
        registerId: currentRegister?.id || 'caja-1',
        registerName: currentRegister?.name || 'Caja Mostrador',
        cashierId: selectedStaff?.id || 'master',
        cashierName: selectedStaff?.fullName || 'Cajero',
        initialUsd: parsedUsd,
        initialCashUsd: parsedUsd,
        initialVes: parsedVes,
        initialCashVes: parsedVes,
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
      localStorage.setItem('axon_cashier_mode', selectedStaff?.role === 'MASTER' ? 'false' : 'true');
      localStorage.setItem('axonpos_active_user_role', selectedStaff?.role || 'CASHIER');
      localStorage.setItem('axonpos_active_user_name', selectedStaff?.fullName || 'Cajero');
      localStorage.setItem('axon_active_register_id', currentRegister?.id || 'caja-1');
      localStorage.setItem('axon_active_register_name', currentRegister?.name || 'Caja Mostrador');

      // Sincronizar en Supabase cash_shifts para la Caja Maestra y Monitor de Cajas
      try {
        let wsId = localStorage.getItem('activeWorkspace');
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(wsId);
        if (!isUuid && storeSlug) {
          const { data: wsData } = await supabase
            .from('workspaces')
            .select('id')
            .eq('store_slug', storeSlug)
            .maybeSingle();
          if (wsData?.id) {
            wsId = wsData.id;
            localStorage.setItem('activeWorkspace', wsId);
          }
        }

        if (wsId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(wsId)) {
          // Si había un turno previo abierto en esta misma caja, cerrarlo previamente
          await supabase
            .from('cash_shifts')
            .update({ status: 'CLOSED', closed_at: new Date().toISOString() })
            .eq('branch_id', wsId)
            .eq('register_name', currentRegister?.name)
            .eq('status', 'OPEN');

          const { error: insErr } = await supabase.from('cash_shifts').insert([{
            branch_id: wsId,
            register_name: currentRegister?.name || 'Caja 1',
            cashier_name: selectedStaff?.fullName || 'Cajero',
            opened_at: newShift.openedAt,
            initial_usd: parsedUsd,
            initial_ves: parsedVes,
            expected_usd: parsedUsd,
            expected_ves: parsedVes,
            status: 'OPEN',
            notes: JSON.stringify({
              registerCode: currentRegister?.code || 'CAJA-01',
              registerId: currentRegister?.id,
              bcvRate: Number(bcvRate) || 888.89,
              storeName,
              storeSlug
            })
          }]);

          if (insErr) {
            console.error('Error insertando cash_shifts en Supabase:', insErr);
          }
        }
      } catch (errDb) {
        console.warn('Advertencia sincronizando turno a Supabase:', errDb);
      }
      
      toast.success(`¡Turno abierto en ${currentRegister?.name}! Listo para cobrar.`);
      navigate('/pos');
    } catch (e) {
      console.error('Error al abrir turno:', e);
      toast.error('Error abriendo turno. Intenta nuevamente.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <RefreshCw size={36} className="text-orange-500 animate-spin mb-4" />
        <p className="text-sm font-semibold">Cargando estación de caja...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white flex flex-col justify-between p-4 sm:p-6 font-sans select-none">
      
      {/* Encabezado Visual */}
      <div className="w-full max-w-md mx-auto text-center pt-2 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-bold mb-3 border border-white/10 backdrop-blur-md">
          <Store size={14} className="text-orange-400" />
          <span>{storeName}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          {currentRegister?.name || 'Caja Registradora'}
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Código: <span className="font-mono text-orange-400 font-bold">{currentRegister?.code || 'CAJA-01'}</span> • Tasa BCV: <span className="font-mono font-bold text-amber-300">Bs. {bcvRate.toFixed(2)}</span>
        </p>
      </div>

      {/* Contenido Principal según el Paso */}
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center">
        
        {/* ========================================================
            PASO 1: SELECCIÓN DE CAJERO Y PIN TÁCTIL
            ======================================================== */}
        {step === 1 && (
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 shadow-2xl backdrop-blur-xl space-y-5 animate-in fade-in">
            
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
                ¿Quién está en caja?
              </label>

              {/* Lista de Usuarios Disponibles */}
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                {(staffList.length > 0 ? staffList : [
                  { id: 'usr-owner', fullName: 'Propietario / Admin', role: 'MASTER', isMaster: true },
                  { id: 'usr-caja1', fullName: 'Cajero de Turno', role: 'CASHIER', pinCode: '1234' }
                ]).map(staff => (
                  <button
                    key={staff.id}
                    onClick={() => {
                      setSelectedStaff(staff);
                      setPinInput('');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                      selectedStaff?.id === staff.id
                        ? 'border-orange-500 bg-orange-500/20 text-white shadow-lg shadow-orange-500/20 ring-1 ring-orange-500'
                        : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center font-bold text-xs text-white shrink-0">
                      {(staff.fullName || 'C').charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black truncate">{staff.fullName}</p>
                      <span className="text-[10px] text-slate-400 capitalize block">
                        {staff.role === 'MASTER' ? 'Propietario' : 'Cajero'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Display de PIN */}
            <div className="pt-2 text-center">
              <span className="text-xs text-slate-400 font-bold block mb-2">
                Ingresa tu PIN de 4 dígitos
              </span>
              <div className="flex justify-center gap-3">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`w-10 h-12 rounded-xl border flex items-center justify-center text-xl font-mono font-black transition-all ${
                      pinInput.length > idx
                        ? 'border-orange-500 bg-orange-500/20 text-orange-400 shadow-sm'
                        : 'border-white/15 bg-white/5 text-transparent'
                    }`}
                  >
                    {pinInput.length > idx ? '●' : ''}
                  </div>
                ))}
              </div>
            </div>

            {/* Teclado Numérico Táctil Grande */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handlePinDigit(num.toString())}
                  className="h-13 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-xl font-bold font-mono transition-all flex items-center justify-center cursor-pointer border border-white/5 shadow-xs"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => setPinInput('')}
                className="h-13 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 text-xs font-bold text-slate-400 transition-all flex items-center justify-center cursor-pointer"
              >
                Limpiar
              </button>
              <button
                onClick={() => handlePinDigit('0')}
                className="h-13 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-xl font-bold font-mono transition-all flex items-center justify-center cursor-pointer border border-white/5 shadow-xs"
              >
                0
              </button>
              <button
                onClick={handlePinDelete}
                className="h-13 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 text-xs font-bold text-rose-400 transition-all flex items-center justify-center cursor-pointer"
              >
                Borrar ⌫
              </button>
            </div>

          </div>
        )}

        {/* ========================================================
            PASO 2: FONDO INICIAL (DINERO EN CAJA AL COMENZAR)
            ======================================================== */}
        {step === 2 && (
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 shadow-2xl backdrop-blur-xl space-y-6 animate-in zoom-in-95">
            
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  ¡Hola, {selectedStaff?.fullName}!
                </h3>
                <p className="text-xs text-slate-400">
                  Anota cuánto efectivo tienes en caja para dar vuelto.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Fondo en Dólares ($) */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 focus-within:border-orange-500 transition-colors">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Efectivo en Dólares ($ USD)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black font-mono text-emerald-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={initialUsd}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInitialUsd(val);
                      if (val && bcvRate) {
                        setInitialVes((parseFloat(val || 0) * bcvRate).toFixed(2));
                      }
                    }}
                    placeholder="0.00"
                    className="w-full bg-transparent text-2xl font-black font-mono text-white outline-none"
                  />
                </div>
              </div>

              {/* Fondo en Bolívares (Bs.) */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 focus-within:border-orange-500 transition-colors">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Efectivo en Bolívares (Bs. VES)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold font-mono text-amber-300">Bs.</span>
                  <input
                    type="number"
                    step="0.01"
                    value={initialVes}
                    onChange={(e) => setInitialVes(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent text-xl font-black font-mono text-white outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Botón Gigante de Comienzo */}
            <button
              onClick={handleStartShiftAndOpenPos}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm rounded-2xl shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
            >
              <span>Abrir Turno y Comenzar a Facturar</span>
              <ArrowRight size={18} />
            </button>

            <button
              onClick={() => {
                setStep(1);
                setPinInput('');
              }}
              className="w-full text-center text-xs text-slate-400 hover:text-white transition-colors"
            >
              ← Cambiar de usuario o caja
            </button>

          </div>
        )}

      </div>

      {/* Pie de Página */}
      <div className="text-center pt-4 text-slate-500 text-[11px]">
        <span>AxonPOS • Sistema de Caja y Turnos Blindados</span>
      </div>

    </div>
  );
}
