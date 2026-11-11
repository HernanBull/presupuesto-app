// ==============================================================================
// AXONMARKET & AXONPOS — Centro de Control Maestro: Personal & Cajas Registradoras
// Fiel a la Interfaz de AxonPOS (Imagen 1) — White & Radiant Orange Suite
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  History,
  Lock,
  Monitor,
  Plus,
  CheckSquare,
  Square,
  Crown,
  KeyRound,
  X,
  PlusCircle,
  RotateCcw,
  QrCode,
  Copy,
  ExternalLink,
  RefreshCw,
  Smartphone
} from 'lucide-react';
import { authService, ROLE_PERMISSIONS, PERMISSION_DEFINITIONS } from '../../services/authService';
import { supabase } from '../../../../supabaseClient';
import { offlineDb } from '../../services/offlineSyncService';
import ChangeMasterPinModal from './ChangeMasterPinModal';
import toast from 'react-hot-toast';

const PRESET_AVATAR_COLORS = [
  '#FF6B00', // Radiant Orange
  '#D97706', // Gold / Amber
  '#0284C7', // Sky Blue
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#6366F1'  // Indigo
];

export default function UserManagementModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' | 'registers' | 'audit'
  const [users, setUsers] = useState([]);
  const [registers, setRegisters] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditFilter, setAuditFilter] = useState('ALL'); // 'ALL' | 'REGISTERS' | 'USERS' | 'SECURITY'
  const [auditSearch, setAuditSearch] = useState('');
  const [currentUser, setCurrentUser] = useState(authService.getCurrentUser());

  // Sub-modal para cambio de PIN maestro
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);
  const [pinModalView, setPinModalView] = useState('change'); // 'change' | 'setup_2fa'

  // Sub-modal para Crear / Editar Empleado
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    role: 'CASHIER',
    pinCode: '',
    email: '',
    avatarColor: '#FF6B00',
    customPermissions: ROLE_PERMISSIONS.CASHIER
  });
  const [showFormPin, setShowFormPin] = useState(false);

  // Sub-modal para Crear / Editar Caja (Fusionada con Apertura de Turno)
  const [isRegisterFormOpen, setIsRegisterFormOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [bcvRate, setBcvRate] = useState(894.89);
  const [activeShifts, setActiveShifts] = useState([]);
  const [regFormData, setRegFormData] = useState({
    id: null,
    code: '',
    name: '',
    branchId: 'SUC-01',
    defaultCashier: 'yende',
    defaultFloatUsd: 50.0,
    defaultFloatVes: 1000.0,
    openShiftNow: true // Fusión: Abrir turno de una vez al registrar la caja
  });

  // Visibilidad de PINes en la tabla
  const [revealedPins, setRevealedPins] = useState({});
  // Sub-modal para Ver QR / Enlace de Acceso a Caja
  const [selectedRegisterForQr, setSelectedRegisterForQr] = useState(null);
  const storeSlug = localStorage.getItem('storeSlug') || '';

  useEffect(() => {
    if (isOpen) {
      loadData();

      // Suscripción en tiempo real a turnos de caja para actualizar estado al instante
      const channel = supabase
        .channel(`realtime_cash_shifts_${Date.now()}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'cash_shifts'
        }, () => {
          loadData();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen]);

  const loadData = async () => {
    const u = authService.getCurrentUser();
    setCurrentUser(u);
    const uList = await authService.getUsers();
    setUsers(uList);
    const rList = await authService.getCashRegisters();
    setRegisters(rList);
    const aList = await authService.getAuditLogs();
    setAuditLogs(aList);

    // Obtener tasa BCV oficial
    fetch('https://axonmarket-api.onrender.com/api/bcv')
      .then(r => r.json())
      .then(d => { if (d?.rate) setBcvRate(Number(d.rate)); })
      .catch(() => {});

    // Consultar turnos de caja actualmente abiertos
    let activeWs = localStorage.getItem('activeWorkspace');
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeWs);
    if (!isUuid) {
      const slug = localStorage.getItem('storeSlug');
      if (slug) {
        try {
          const { data: wsData } = await supabase.from('workspaces').select('id').eq('store_slug', slug).maybeSingle();
          if (wsData?.id) {
            activeWs = wsData.id;
            localStorage.setItem('activeWorkspace', wsData.id);
          }
        } catch (e) {}
      }
    }

    let remoteShifts = [];
    if (activeWs && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(activeWs)) {
      try {
        const { data: sData, error: sErr } = await supabase
          .from('cash_shifts')
          .select('*')
          .eq('branch_id', activeWs)
          .eq('status', 'OPEN');

        if (!sErr && sData) {
          remoteShifts = sData;
        }
      } catch (errShifts) {
        console.warn('Advertencia cargando turnos en modal de usuarios:', errShifts);
      }
    }

    // Merge con turno activo local en este dispositivo si existe
    try {
      const localShiftStr = localStorage.getItem('axon_active_shift');
      if (localShiftStr) {
        const localShift = JSON.parse(localShiftStr);
        if (localShift && (localShift.status === 'OPEN' || localShift.status === 'ABIERTO')) {
          const regName = localShift.registerName || localShift.name;
          const alreadyInRemote = remoteShifts.some(s => s.register_name?.toLowerCase() === regName?.toLowerCase());
          if (!alreadyInRemote && regName) {
            remoteShifts.push({
              id: localShift.id || 'local-active',
              register_name: regName,
              cashier_name: localShift.cashierName || localShift.cashier || 'Cajero activo',
              opened_at: localShift.openedAt || new Date().toISOString(),
              initial_usd: localShift.initialUsd || 0,
              initial_ves: localShift.initialVes || 0,
              status: 'OPEN',
              isCurrentDevice: true
            });
          }
        }
      }
    } catch (e) {}

    setActiveShifts(remoteShifts);
  };

  if (!isOpen) return null;

  const togglePinReveal = (userId) => {
    setRevealedPins(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const openCreateUserModal = () => {
    setEditingUserId(null);
    setFormData({
      fullName: '',
      username: '',
      role: 'CASHIER',
      pinCode: '',
      email: '',
      avatarColor: PRESET_AVATAR_COLORS[Math.floor(Math.random() * PRESET_AVATAR_COLORS.length)],
      customPermissions: [...ROLE_PERMISSIONS.CASHIER]
    });
    setShowFormPin(false);
    setIsUserFormOpen(true);
  };

  const openEditUserModal = (u) => {
    setEditingUserId(u.id);
    setFormData({
      fullName: u.fullName,
      username: u.username,
      role: u.role,
      pinCode: u.pinCode,
      email: u.email || '',
      avatarColor: u.avatarColor || '#FF6B00',
      customPermissions: u.customPermissions || ROLE_PERMISSIONS[u.role] || []
    });
    setShowFormPin(false);
    setIsUserFormOpen(true);
  };

  const handleRoleChange = (newRole) => {
    setFormData(prev => ({
      ...prev,
      role: newRole,
      customPermissions: [...(ROLE_PERMISSIONS[newRole] || [])]
    }));
  };

  const togglePermission = (permKey) => {
    setFormData(prev => {
      const exists = prev.customPermissions.includes(permKey);
      const next = exists
        ? prev.customPermissions.filter(k => k !== permKey)
        : [...prev.customPermissions, permKey];
      return { ...prev, customPermissions: next };
    });
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.pinCode.trim()) {
      toast.error('Nombre y PIN de 4 dígitos son requeridos.');
      return;
    }

    try {
      if (editingUserId) {
        await authService.updateUser(editingUserId, formData);
        toast.success('Empleado actualizado correctamente.');
      } else {
        await authService.createUser(formData);
        toast.success('Nuevo empleado registrado con éxito.');
      }
      setIsUserFormOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Error al guardar usuario.');
    }
  };

  const handleDeleteUser = async (u) => {
    if (u.role === 'MASTER') {
      toast.error('No se puede eliminar al usuario Maestro.');
      return;
    }
    if (window.confirm(`¿Está seguro de eliminar al empleado "${u.fullName}"?`)) {
      try {
        await authService.deleteUser(u.id);
        toast.success('Empleado eliminado.');
        loadData();
      } catch (err) {
        toast.error(err.message);
      }
    }
  };

  const handleToggleStatus = async (u) => {
    if (u.role === 'MASTER') return;
    try {
      await authService.toggleUserStatus(u.id);
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Cajas Registradoras (Fusionada con Apertura de Turno)
  const handleSaveRegister = async (e) => {
    e.preventDefault();
    if (!regFormData.name.trim()) {
      toast.error('El nombre de la caja es requerido.');
      return;
    }

    try {
      await authService.saveCashRegister(regFormData);

      // Fusión Operativa: Iniciar turno de inmediato si está marcado
      if (regFormData.openShiftNow && !regFormData.id) {
        const activeWs = localStorage.getItem('activeWorkspace');
        const chosenCashier = regFormData.defaultCashier || (users.find(u => u.role === 'CASHIER')?.fullName) || 'yende';
        const initUsd = Number(regFormData.defaultFloatUsd) || 0;
        const initVes = Number(regFormData.defaultFloatVes) || (initUsd * bcvRate);

        if (activeWs) {
          const shiftRecord = {
            id: `shift-${Date.now()}`,
            registerName: regFormData.name,
            cashierName: chosenCashier,
            initialUsd: initUsd,
            initialVes: initVes,
            openedAt: new Date().toISOString(),
            status: 'OPEN',
            bcvRate: Number(bcvRate) || 894.89,
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

          await offlineDb.cash_shifts.put(shiftRecord);
          localStorage.setItem('axon_active_shift', JSON.stringify(shiftRecord));

          try {
            await supabase.from('cash_shifts').insert([{
              branch_id: activeWs,
              register_name: regFormData.name,
              cashier_name: chosenCashier,
              opened_at: shiftRecord.openedAt,
              initial_usd: initUsd,
              initial_ves: initVes,
              expected_usd: initUsd,
              expected_ves: initVes,
              status: 'OPEN',
              notes: JSON.stringify({
                bcvRate: Number(bcvRate) || 894.89,
                autoCreatedWithRegister: true
              })
            }]);
          } catch (errDb) {
            console.warn('Advertencia registrando turno en Supabase:', errDb);
          }

          toast.success(`Caja "${regFormData.name}" registrada y Turno iniciado para ${chosenCashier}.`);
        }
      } else {
        toast.success('Caja guardada con éxito.');
      }

      setIsRegisterFormOpen(false);
      loadData();
    } catch (errSave) {
      console.error('Error guardando caja:', errSave);
      toast.error('Error al guardar la caja registradora.');
    }
  };

  const handleDeleteRegister = async (r) => {
    if (window.confirm(`¿Eliminar la caja "${r.name}"?`)) {
      await authService.deleteCashRegister(r.id);
      toast.success('Caja eliminada.');
      loadData();
    }
  };

  // Función amigable para formatear eventos del Libro de Auditoría
  const getAuditInfo = (action) => {
    switch (action) {
      case 'REGISTER_CREATED':
        return {
          label: 'Caja Creada',
          bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
          dot: 'bg-emerald-500',
          icon: PlusCircle
        };
      case 'REGISTER_UPDATED':
        return {
          label: 'Caja Modificada',
          bg: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400 border-sky-200 dark:border-sky-500/20',
          dot: 'bg-sky-500',
          icon: Edit2
        };
      case 'REGISTER_DELETED':
        return {
          label: 'Caja Eliminada',
          bg: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20',
          dot: 'bg-rose-500',
          icon: Trash2
        };
      case 'USER_CREATED':
        return {
          label: 'Nuevo Empleado',
          bg: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20',
          dot: 'bg-blue-500',
          icon: UserPlus
        };
      case 'USER_UPDATED':
        return {
          label: 'Empleado Editado',
          bg: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200 dark:border-purple-500/20',
          dot: 'bg-purple-500',
          icon: Edit2
        };
      case 'USER_DELETED':
        return {
          label: 'Empleado Eliminado',
          bg: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20',
          dot: 'bg-rose-500',
          icon: Trash2
        };
      case 'MASTER_PIN_CHANGED':
        return {
          label: 'PIN Maestro Modificado',
          bg: 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300 border-amber-300 dark:border-amber-500/30',
          dot: 'bg-amber-500',
          icon: KeyRound
        };
      case 'MASTER_PIN_RESET':
        return {
          label: 'PIN Restablecido (2FA/Clave)',
          bg: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30',
          dot: 'bg-emerald-500',
          icon: ShieldCheck
        };
      case 'PIN_CHANGED':
        return {
          label: 'PIN Cajero Modificado',
          bg: 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300 border-amber-300 dark:border-amber-500/30',
          dot: 'bg-amber-500',
          icon: KeyRound
        };
      case 'STATUS_TOGGLED':
        return {
          label: 'Estado de Acceso',
          bg: 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border-slate-200 dark:border-white/10',
          dot: 'bg-slate-500',
          icon: RotateCcw
        };
      case 'TEST_AUDIT':
        return {
          label: 'Prueba de Seguridad',
          bg: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400 border-teal-200 dark:border-teal-500/20',
          dot: 'bg-teal-500',
          icon: ShieldCheck
        };
      default:
        return {
          label: action,
          bg: 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border-slate-200 dark:border-white/10',
          dot: 'bg-slate-400',
          icon: History
        };
    }
  };

  // Prueba en vivo del Libro de Auditoría
  const handleTestAuditLog = async () => {
    try {
      await authService.addAuditLog(
        'TEST_AUDIT',
        currentUser?.id || 'admin',
        currentUser?.username || 'propietario',
        currentUser?.role || 'MASTER',
        'Propietario',
        'Verificación exitosa del Libro de Auditoría en tiempo real'
      );
      const updated = await authService.getAuditLogs();
      setAuditLogs(updated);
      toast.success('¡Registro de auditoría generado y verificado con éxito!');
    } catch (err) {
      toast.error('Error al registrar evento de auditoría.');
    }
  };

  // Filtrado de eventos de auditoría
  const filteredAuditLogs = auditLogs.filter(log => {
    if (auditFilter === 'REGISTERS' && !log.action.includes('REGISTER')) return false;
    if (auditFilter === 'USERS' && !log.action.includes('USER') && !log.action.includes('STATUS')) return false;
    if (auditFilter === 'SECURITY' && !log.action.includes('PIN') && !log.action.includes('TEST')) return false;
    if (auditSearch.trim()) {
      const q = auditSearch.toLowerCase();
      const txt = `${log.action} ${log.details} ${log.targetUsername} ${log.performedByAdmin}`.toLowerCase();
      return txt.includes(q);
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-4xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* ========================================================
            CABECERA COMPACTA & ELEGANTE
            ======================================================== */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-zinc-900 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/25">
              <ShieldCheck size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight truncate">
                  Control Maestro: Cajas & Personal
                </h2>
                <span className="bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-300 dark:border-amber-500/30 shrink-0">
                  👑 Axon Propietario
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-zinc-400 truncate hidden sm:block">
                Puntos de cobro, PINes táctiles, checklist de funciones y bitácora de seguridad
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X size={18} />
          </button>
        </div>

        {/* ========================================================
            BARRA DE PESTAÑAS (SEGMENTED CONTROL RESPONSIVE GRID 3 COLS)
            ======================================================== */}
        <div className="px-3 sm:px-6 pt-2.5 pb-2 border-b border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-zinc-950/40 shrink-0">
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-200/60 dark:bg-zinc-800 rounded-2xl w-full">
            {[
              { id: 'personal', label: 'Personal', fullLabel: 'Personal & PINes', count: users.length, icon: Users },
              { id: 'registers', label: 'Cajas', fullLabel: 'Cajas Registradoras', count: registers.length, icon: Monitor },
              { id: 'audit', label: 'Auditoría', fullLabel: 'Libro de Auditoría', count: auditLogs.length, icon: History }
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center gap-1 sm:gap-2 py-1.5 px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm shadow-orange-500/30'
                      : 'text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-zinc-700/50'
                  }`}
                >
                  <tab.icon size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
                  <span className="sm:hidden">{tab.label}</span>
                  <span className="hidden sm:inline">{tab.fullLabel}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-300/60 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================
            CUERPO DE LA PESTAÑA SELECCIONADA
            ======================================================== */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 space-y-4 custom-scrollbar">

          {/* TAB 1: PERSONAL & PINES */}
          {activeTab === 'personal' && (
            <>
              {/* Tarjeta de Seguridad del Propietario (Compacta y Moderna con Soporte 2FA) */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Crown size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                        PIN Maestro del Propietario
                      </h4>
                      <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                        🛡️ Protegido
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                      Controla autorizaciones, arqueos y cajas. Recuperable con contraseña o Google Authenticator.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setPinModalView('setup_2fa');
                      setIsChangePinOpen(true);
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-slate-200/80 dark:border-white/10 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95"
                    title="Vincular o gestionar Google Authenticator (2FA)"
                  >
                    <Smartphone size={13} className="text-orange-500" />
                    <span>Google Auth (2FA)</span>
                  </button>

                  <button
                    onClick={() => {
                      setPinModalView('change');
                      setIsChangePinOpen(true);
                    }}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-zinc-700 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-xs font-black shadow-2xs transition-all cursor-pointer whitespace-nowrap active:scale-95"
                  >
                    <KeyRound size={13} />
                    <span>Cambiar PIN</span>
                  </button>
                </div>
              </div>

              {/* Botón Registrar Nuevo Empleado */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    Personal Registrado ({users.length})
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Asigna roles, PINes individuales y funciones específicas para cada trabajador.
                  </p>
                </div>

                <button
                  onClick={openCreateUserModal}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs rounded-xl shadow-md shadow-orange-500/25 transition-all cursor-pointer active:scale-95"
                >
                  <UserPlus size={15} />
                  <span>+ Registrar Empleado</span>
                </button>
              </div>

              {/* VISTA MÓVIL: Tarjetas de Empleados */}
              <div className="grid grid-cols-1 gap-2.5 sm:hidden">
                {users.map(u => {
                  const isMaster = u.role === 'MASTER';
                  const permsCount = isMaster 
                    ? 20 
                    : (Array.isArray(u.customPermissions) ? u.customPermissions.length : (ROLE_PERMISSIONS[u.role] || []).length);

                  return (
                    <div key={u.id} className="p-3.5 bg-white dark:bg-zinc-800/80 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div 
                            className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-white text-xs shrink-0 shadow-2xs"
                            style={{ backgroundColor: u.avatarColor || '#FF6B00' }}
                          >
                            {(u.fullName || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 dark:text-white text-xs truncate flex items-center gap-1">
                              <span>{u.fullName}</span>
                              {isMaster && <span>👑</span>}
                            </h4>
                            <p className="text-[10px] text-slate-400 truncate">@{u.username}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => isMaster ? setIsChangePinOpen(true) : openEditUserModal(u)}
                            className="p-1.5 text-slate-400 hover:text-orange-500 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors"
                            title="Editar Empleado"
                          >
                            <Edit2 size={14} />
                          </button>
                          {!isMaster && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                              title="Eliminar Empleado"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-white/5 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                            isMaster 
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                              : u.role === 'ADMIN'
                                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300'
                                : u.role === 'PICKER'
                                  ? 'bg-pink-100 text-pink-800 dark:bg-pink-500/20 dark:text-pink-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                          }`}>
                            {isMaster ? 'Propietario' : (u.role === 'PICKER' ? 'Empacador' : (u.role === 'CASHIER' ? 'Cajero' : u.role))}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">
                            🛡️ {permsCount} funciones
                          </span>
                        </div>

                        {/* PIN Táctil */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-semibold">PIN:</span>
                          {isMaster ? (
                            <span className="text-amber-600 dark:text-amber-400 font-mono font-bold text-[10px]">••••</span>
                          ) : (
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-700/60 px-2 py-0.5 rounded-lg">
                              <span className="font-mono font-black text-slate-800 dark:text-white text-xs tracking-wider">
                                {revealedPins[u.id] ? u.pinCode : '••••'}
                              </span>
                              <button
                                onClick={() => togglePinReveal(u.id)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                              >
                                {revealedPins[u.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* VISTA ESCRITORIO: Tabla de Personal */}
              <div className="hidden sm:block bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/70 dark:bg-zinc-800/40 border-b border-slate-100 dark:border-white/5 text-[10px] uppercase font-black tracking-wider text-slate-400">
                        <th className="py-3 px-4">Usuario</th>
                        <th className="py-3 px-4">Rol & Funciones</th>
                        <th className="py-3 px-4">PIN Táctil</th>
                        <th className="py-3 px-4">Estado</th>
                        <th className="py-3 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {users.map(u => {
                        const isMaster = u.role === 'MASTER';
                        const permsCount = isMaster 
                          ? 20 
                          : (Array.isArray(u.customPermissions) ? u.customPermissions.length : (ROLE_PERMISSIONS[u.role] || []).length);

                        return (
                          <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                            {/* USUARIO */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-white text-xs shrink-0 shadow-2xs"
                                  style={{ backgroundColor: u.avatarColor || '#FF6B00' }}
                                >
                                  {(u.fullName || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <span>{u.fullName}</span>
                                    {isMaster && <span className="text-[10px]">👑</span>}
                                  </div>
                                  <p className="text-[11px] text-slate-400">@{u.username}</p>
                                </div>
                              </div>
                            </td>

                            {/* ROL & FUNCIONES */}
                            <td className="py-3 px-4">
                              <div className="space-y-0.5">
                                <span className={`inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                  isMaster 
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                                    : u.role === 'ADMIN'
                                      ? 'bg-indigo-100 text-indigo-800'
                                      : u.role === 'PICKER'
                                        ? 'bg-pink-100 text-pink-800'
                                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                                }`}>
                                  {isMaster ? 'Maestro / Propietario' : (u.role === 'PICKER' ? 'Empacador' : (u.role === 'CASHIER' ? 'Cajero' : u.role))}
                                </span>
                                <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold flex items-center gap-1">
                                  <span>🛡️</span>
                                  <span>{isMaster ? 'Acceso Total (20 funciones)' : `${permsCount} de 21 funciones`}</span>
                                </div>
                              </div>
                            </td>

                            {/* PIN TÁCTIL */}
                            <td className="py-3 px-4">
                              {isMaster ? (
                                <span className="text-amber-600 dark:text-amber-400 font-mono font-bold tracking-wider text-[11px]">
                                  •••• (Confidencial)
                                </span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-black text-slate-800 dark:text-white text-sm tracking-widest">
                                    {revealedPins[u.id] ? u.pinCode : '••••'}
                                  </span>
                                  <button
                                    onClick={() => togglePinReveal(u.id)}
                                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                                  >
                                    {revealedPins[u.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                  </button>
                                </div>
                              )}
                            </td>

                            {/* ESTADO */}
                            <td className="py-3 px-4">
                              <button
                                onClick={() => handleToggleStatus(u)}
                                disabled={isMaster}
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  u.isActive
                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                                    : 'bg-slate-100 text-slate-400 dark:bg-zinc-800'
                                }`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                {u.isActive ? 'Habilitado' : 'Inactivo'}
                              </button>
                            </td>

                            {/* ACCIONES */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => isMaster ? setIsChangePinOpen(true) : openEditUserModal(u)}
                                  className="p-1.5 text-slate-400 hover:text-orange-500 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors"
                                  title="Editar Empleado"
                                >
                                  <Edit2 size={15} />
                                </button>
                                {!isMaster && (
                                  <button
                                    onClick={() => handleDeleteUser(u)}
                                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                                    title="Eliminar Empleado"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: CAJAS REGISTRADORAS */}
          {activeTab === 'registers' && (
            <div className="space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    Puntos de Cobro ({registers.length})
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Crea terminales para tus cajeros y genera códigos QR para cobro independiente.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      setIsRefreshing(true);
                      await loadData();
                      setTimeout(() => setIsRefreshing(false), 500);
                      toast.success('Estado de cajas actualizado.');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-bold text-xs rounded-xl transition-all cursor-pointer active:scale-95 border border-slate-200/60 dark:border-white/5"
                    title="Actualizar estado de cajas en vivo"
                  >
                    <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-orange-500' : 'text-slate-500'} />
                    <span>Refrescar</span>
                  </button>
                  <button
                    onClick={() => {
                      const defaultCashier = users.find(u => u.role === 'CASHIER')?.fullName || 'yende';
                      const autoVes = Math.round(50 * bcvRate);
                      setRegFormData({
                        id: null,
                        code: `CAJA-0${registers.length + 1}`,
                        name: '',
                        branchId: 'SUC-01',
                        defaultCashier: defaultCashier,
                        defaultFloatUsd: 50.0,
                        defaultFloatVes: autoVes,
                        openShiftNow: true
                      });
                      setIsRegisterFormOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs rounded-xl shadow-sm shadow-orange-500/20 transition-all cursor-pointer active:scale-95 w-fit"
                  >
                    <Plus size={15} />
                    <span>+ Nueva Caja</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {registers.map(r => {
                  const liveShift = activeShifts.find(s => {
                    if (!s || s.status !== 'OPEN') return false;
                    const sRegName = (s.register_name || '').toLowerCase().trim();
                    const rName = (r.name || '').toLowerCase().trim();
                    const rCode = (r.code || '').toLowerCase().trim();
                    
                    if (sRegName === rName) return true;
                    if (rCode && (sRegName === rCode || sRegName.includes(rCode))) return true;
                    if (rName && (sRegName.includes(rName) || rName.includes(sRegName))) return true;
                    if (s.register_id && s.register_id === r.id) return true;
                    
                    if (s.notes) {
                      try {
                        const parsedNotes = typeof s.notes === 'string' ? JSON.parse(s.notes) : s.notes;
                        if (parsedNotes.registerCode && parsedNotes.registerCode.toLowerCase() === rCode) return true;
                        if (parsedNotes.registerId && parsedNotes.registerId === r.id) return true;
                      } catch (e) {}
                    }
                    return false;
                  });
                  const isOpenShift = !!liveShift;

                  return (
                    <div key={r.id} className="p-3.5 bg-white dark:bg-zinc-800 rounded-2xl border border-slate-200/90 dark:border-white/10 shadow-xs flex flex-col justify-between space-y-3 hover:border-orange-500/30 transition-all">
                      {/* Cabecera de la Tarjeta */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isOpenShift 
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border border-emerald-200 dark:border-emerald-500/20' 
                              : 'bg-orange-500/10 text-orange-500'
                          }`}>
                            <Monitor size={18} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-black text-slate-900 dark:text-white text-xs sm:text-sm truncate">{r.name}</h4>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                                isOpenShift 
                                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' 
                                  : 'bg-slate-100 dark:bg-zinc-700 text-slate-500 dark:text-slate-400'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isOpenShift ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                {isOpenShift ? 'En Servicio' : 'Cerrada'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {r.code} • Base: ${r.defaultFloatUsd || 0} / Bs. {(Number(r.defaultFloatVes) || (Number(r.defaultFloatUsd || 0) * bcvRate)).toLocaleString('es-VE')}
                            </p>
                          </div>
                        </div>

                        {/* Botones de Edición / Borrado */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            onClick={() => {
                              setRegFormData({
                                ...r,
                                defaultCashier: r.defaultCashier || 'yende',
                                defaultFloatUsd: r.defaultFloatUsd || 50,
                                defaultFloatVes: r.defaultFloatVes || 1000,
                                openShiftNow: false
                              });
                              setIsRegisterFormOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-orange-500 rounded-lg transition-colors cursor-pointer"
                            title="Editar Caja"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteRegister(r)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar Caja"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Estado del Cajero / Información de Turno */}
                      <div className="bg-slate-50 dark:bg-zinc-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-white/5">
                        {isOpenShift ? (
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 truncate">
                                <span>👤 Cajero:</span>
                                <b>{liveShift.cashier_name}</b>
                              </p>
                              <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <span>⏰ Abierta: {(() => {
                                  const rawDate = liveShift?.opened_at || liveShift?.openedAt;
                                  if (!rawDate) return 'Hoy';
                                  const d = new Date(rawDate);
                                  return isNaN(d.getTime()) ? 'Hoy' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                })()}</span>
                                {liveShift.isCurrentDevice && (
                                  <span className="text-[9px] bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 font-bold px-1.5 py-0.2 rounded">Esta estación</span>
                                )}
                              </p>
                            </div>
                            <button
                              onClick={async () => {
                                if (window.confirm(`¿Desea cerrar el turno de ${r.name} (Cajero: ${liveShift.cashier_name})?`)) {
                                  try {
                                    if (liveShift.id && !liveShift.isCurrentDevice) {
                                      await supabase.from('cash_shifts').update({
                                        status: 'CLOSED',
                                        closed_at: new Date().toISOString()
                                      }).eq('id', liveShift.id);
                                    }
                                    if (liveShift.isCurrentDevice) {
                                      localStorage.removeItem('axon_active_shift');
                                    }
                                    toast.success(`Turno de ${r.name} cerrado.`);
                                    loadData();
                                  } catch (e) {
                                    toast.error('Error cerrando turno.');
                                  }
                                }
                              }}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 rounded-lg text-[10px] font-black transition-all cursor-pointer whitespace-nowrap"
                            >
                              Cerrar Turno
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-[11px] text-slate-400 italic">
                              🔒 Sin turno activo actualmente
                            </span>
                            <button
                              onClick={() => {
                                setRegFormData({
                                  ...r,
                                  defaultCashier: r.defaultCashier || 'yende',
                                  defaultFloatUsd: r.defaultFloatUsd || 50,
                                  defaultFloatVes: r.defaultFloatVes || 1000,
                                  openShiftNow: true
                                });
                                setIsRegisterFormOpen(true);
                              }}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-lg text-[10px] font-black transition-all cursor-pointer whitespace-nowrap"
                            >
                              + Abrir Turno
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Botón Acceso Rápido QR */}
                      <button
                        onClick={() => setSelectedRegisterForQr(r)}
                        className="w-full py-2 bg-slate-100 hover:bg-orange-50 hover:text-orange-600 dark:bg-zinc-700/60 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98"
                      >
                        <QrCode size={14} className="text-orange-500" />
                        <span>Generar Código QR / Enlace de Cobro</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: LIBRO DE AUDITORÍA (AUDIT LOG PROFESIONAL) */}
          {activeTab === 'audit' && (
            <div className="space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    Bitácora Inmutable de Seguridad ({auditLogs.length})
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                    Registro de trazabilidad legal y seguridad: supervisa creaciones, borrados y cambios de PIN.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTestAuditLog}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 font-bold text-xs rounded-xl border border-emerald-200 dark:border-emerald-500/20 transition-all cursor-pointer active:scale-95"
                    title="Registrar un evento de prueba en la bitácora"
                  >
                    <ShieldCheck size={13} />
                    <span>🧪 Probar Registro en Vivo</span>
                  </button>
                </div>
              </div>

              {/* Filtros de Auditoría */}
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { id: 'ALL', label: 'Todos' },
                  { id: 'REGISTERS', label: 'Cajas' },
                  { id: 'USERS', label: 'Personal' },
                  { id: 'SECURITY', label: 'Seguridad / PIN' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setAuditFilter(f.id)}
                    className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                      auditFilter === f.id
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Lista de Registros */}
              {filteredAuditLogs.length === 0 ? (
                <div className="bg-slate-50 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-8 text-center space-y-2">
                  <History size={28} className="mx-auto text-slate-400" />
                  <p className="text-xs font-bold text-slate-600 dark:text-zinc-300">
                    Sin eventos en este criterio de búsqueda.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Presiona "Probar Registro en Vivo" para verificar el funcionamiento de la bitácora.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAuditLogs.map(log => {
                    const badge = getAuditInfo(log.action);
                    const IconComponent = badge.icon;
                    const dateFormatted = new Date(log.timestamp).toLocaleString('es-VE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    });

                    return (
                      <div 
                        key={log.id} 
                        className="p-3 bg-white dark:bg-zinc-800/70 border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-2xs flex items-start gap-3 hover:border-slate-300 transition-colors"
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${badge.bg}`}>
                          <IconComponent size={15} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${badge.bg}`}>
                              {badge.label}
                            </span>
                            <span className="text-xs font-bold text-slate-800 dark:text-white truncate">
                              {log.details || log.targetUsername || 'Operación de sistema'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1 flex-wrap font-medium">
                            <span className="flex items-center gap-1">
                              <span>👤 Autorizado por:</span>
                              <b className="text-slate-600 dark:text-zinc-300">{log.performedByAdmin || 'Propietario'}</b>
                            </span>
                            <span>•</span>
                            <span className="font-mono text-slate-500 dark:text-zinc-400">
                              📅 {dateFormatted}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* PIE DE PÁGINA */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-t border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-zinc-950/40 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
            <span className="truncate">Sincronización instantánea en estaciones POS locales y remotas</span>
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200/80 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0 ml-2"
          >
            Cerrar
          </button>
        </div>

      </div>

      {/* SUB-MODAL: CAMBIAR / RECUPERAR PIN MAESTRO / 2FA */}
      <ChangeMasterPinModal
        isOpen={isChangePinOpen}
        onClose={() => setIsChangePinOpen(false)}
        onSuccess={() => loadData()}
        initialView={pinModalView}
      />

      {/* SUB-MODAL: FORMULARIO CREAR / EDITAR EMPLEADO CON CHECKLIST DE 21 PERMISOS */}
      {isUserFormOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-800 dark:text-white">
                {editingUserId ? 'Editar Empleado' : 'Registrar Nuevo Empleado'}
              </h3>
              <button onClick={() => setIsUserFormOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-zinc-300 block mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Ej. Carlos Mendoza"
                    className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-zinc-300 block mb-1">Nombre de Usuario (@)</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    placeholder="carlos_pos"
                    className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-zinc-300 block mb-1">Rol Predeterminado</label>
                  <select
                    value={formData.role}
                    onChange={e => handleRoleChange(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  >
                    <option value="CASHIER">Cajero</option>
                    <option value="PICKER">Empacador</option>
                    <option value="ADMIN">Administrador</option>
                    <option value="MANAGER">Supervisor / Gerente</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-zinc-300 block mb-1">PIN Táctil (4 dígitos) *</label>
                  <div className="relative">
                    <input
                      type={showFormPin ? 'text' : 'password'}
                      maxLength={6}
                      required
                      value={formData.pinCode}
                      onChange={e => setFormData({ ...formData, pinCode: e.target.value.replace(/\D/g, '') })}
                      placeholder="••••"
                      className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-mono tracking-widest text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormPin(!showFormPin)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showFormPin ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-zinc-300 block mb-1">Color de Avatar</label>
                  <div className="flex items-center gap-1.5 pt-1">
                    {PRESET_AVATAR_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFormData({ ...formData, avatarColor: c })}
                        className={`w-6 h-6 rounded-full transition-transform ${formData.avatarColor === c ? 'scale-125 ring-2 ring-orange-500 ring-offset-1' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* CHECKLIST DE 21 PERMISOS AGRUPADOS */}
              <div className="pt-3 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-black uppercase text-slate-600 dark:text-zinc-300">
                    Checklist de Funciones & Permisos ({formData.customPermissions.length} de {PERMISSION_DEFINITIONS.length}):
                  </h4>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, customPermissions: PERMISSION_DEFINITIONS.map(p => p.key) })}
                      className="text-[10px] font-bold text-orange-600 hover:underline"
                    >
                      Marcar Todos
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, customPermissions: [] })}
                      className="text-[10px] font-bold text-slate-400 hover:underline"
                    >
                      Desmarcar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {PERMISSION_DEFINITIONS.map(perm => {
                    const isChecked = formData.customPermissions.includes(perm.key);
                    return (
                      <div
                        key={perm.key}
                        onClick={() => togglePermission(perm.key)}
                        className={`p-2 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                          isChecked 
                            ? 'bg-orange-50/60 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30' 
                            : 'bg-slate-50/50 dark:bg-zinc-800/40 border-slate-100 dark:border-white/5 opacity-70'
                        }`}
                      >
                        <span className={`mt-0.5 ${isChecked ? 'text-orange-600' : 'text-slate-400'}`}>
                          {isChecked ? <CheckSquare size={16} /> : <Square size={16} />}
                        </span>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white leading-tight">{perm.label}</p>
                          <p className="text-[10px] text-slate-400">{perm.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsUserFormOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-black bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/25 cursor-pointer"
                >
                  {editingUserId ? 'Guardar Cambios' : 'Registrar Empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL: CREAR / EDITAR CAJA (FUSIÓN TOTAL CON APERTURA DE TURNO) */}
      {isRegisterFormOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-lg p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
                  <Monitor size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {regFormData.id ? 'Editar Caja Registradora' : 'Registrar Nueva Caja & Turno'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Configura la terminal de venta y sus fondos base bimonetarios.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsRegisterFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRegister} className="space-y-3.5">
              {/* Nombre de la Caja */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                  Nombre de la Caja <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={regFormData.name}
                  onChange={e => setRegFormData({ ...regFormData, name: e.target.value })}
                  placeholder="Ej. Caja 2 - Pasillo / Terraza"
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>

              {/* Código y Cajero Asignado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                    Código Identificador
                  </label>
                  <input
                    type="text"
                    value={regFormData.code}
                    onChange={e => setRegFormData({ ...regFormData, code: e.target.value })}
                    placeholder="CAJA-02"
                    className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                    Cajero Responsable Asignado
                  </label>
                  <select
                    value={regFormData.defaultCashier}
                    onChange={e => setRegFormData({ ...regFormData, defaultCashier: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none"
                  >
                    {users.length > 0 ? (
                      users.map(u => (
                        <option key={u.id} value={u.fullName}>
                          {u.fullName} ({u.role === 'MASTER' ? 'Propietario' : (u.role === 'CASHIER' ? 'Cajero' : u.role)})
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
              </div>

              {/* Fondos Base Bimonetarios */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                    Fondo Inicial Divisas ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={regFormData.defaultFloatUsd}
                    onChange={e => {
                      const usd = parseFloat(e.target.value) || 0;
                      setRegFormData({
                        ...regFormData,
                        defaultFloatUsd: usd,
                        defaultFloatVes: Math.round(usd * bcvRate)
                      });
                    }}
                    className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-white focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block">
                      Fondo Inicial Bolívares (Bs.)
                    </label>
                    <span className="text-[10px] text-orange-600 font-bold font-mono">
                      BCV: {bcvRate.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={regFormData.defaultFloatVes}
                    onChange={e => setRegFormData({ ...regFormData, defaultFloatVes: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Checkbox / Switch: Fusión Directa con Apertura de Turno */}
              {!regFormData.id && (
                <div className="p-3.5 bg-orange-50/80 dark:bg-orange-500/10 border border-orange-200/90 dark:border-orange-500/20 rounded-2xl flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="openShiftNow"
                    checked={regFormData.openShiftNow}
                    onChange={e => setRegFormData({ ...regFormData, openShiftNow: e.target.checked })}
                    className="mt-0.5 w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500 cursor-pointer accent-orange-600 shrink-0"
                  />
                  <label htmlFor="openShiftNow" className="cursor-pointer text-xs">
                    <span className="font-black text-slate-900 dark:text-white block">
                      Abrir e Iniciar Turno de Caja Inmediatamente
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400 block mt-0.5">
                      Crea la caja en el sistema y activa automáticamente su turno operativo con este cajero y fondos base para facturar sin pasos dobles.
                    </span>
                  </label>
                </div>
              )}

              {/* Botones de Acción */}
              <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsRegisterFormOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/25 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 size={15} />
                  <span>
                    {regFormData.openShiftNow && !regFormData.id
                      ? 'Guardar e Iniciar Turno'
                      : (regFormData.id ? 'Guardar Cambios' : 'Guardar Caja')}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL: CÓDIGO QR Y ENLACE DE ACCESO DIRECTO A CAJA */}
      {selectedRegisterForQr && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-sm overflow-hidden flex flex-col p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
                  <QrCode size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {selectedRegisterForQr.name}
                  </h4>
                  <p className="text-[11px] text-slate-400">Acceso Rápido por QR o Link</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedRegisterForQr(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Código QR Generado */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-inner flex flex-col items-center justify-center">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  `${window.location.origin}${storeSlug ? `/${storeSlug}` : ''}/caja/${selectedRegisterForQr.id}`
                )}`}
                alt="QR Acceso a Caja"
                className="w-44 h-44 rounded-lg object-contain"
              />
              <span className="text-[10px] text-slate-500 font-bold mt-2">
                Escanea con la cámara del teléfono o tablet
              </span>
            </div>

            {/* Enlace Directo Copiable */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Enlace Directo
              </label>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800 p-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs">
                <input 
                  type="text" 
                  readOnly 
                  value={`${window.location.origin}${storeSlug ? `/${storeSlug}` : ''}/caja/${selectedRegisterForQr.id}`}
                  className="bg-transparent border-none outline-none text-slate-600 dark:text-zinc-300 w-full text-[11px] font-mono truncate"
                />
                <button
                  onClick={() => {
                    const link = `${window.location.origin}${storeSlug ? `/${storeSlug}` : ''}/caja/${selectedRegisterForQr.id}`;
                    navigator.clipboard.writeText(link);
                    toast.success('¡Enlace de caja copiado al portapapeles!');
                  }}
                  className="p-1.5 bg-white dark:bg-zinc-700 hover:bg-orange-500 hover:text-white text-slate-700 dark:text-zinc-200 rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
                  title="Copiar Enlace"
                >
                  <Copy size={13} />
                </button>
                <button
                  onClick={() => {
                    const link = `${window.location.origin}${storeSlug ? `/${storeSlug}` : ''}/caja/${selectedRegisterForQr.id}`;
                    window.open(link, '_blank');
                  }}
                  className="p-1.5 bg-white dark:bg-zinc-700 hover:bg-orange-500 hover:text-white text-slate-700 dark:text-zinc-200 rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer"
                  title="Abrir en nueva pestaña"
                >
                  <ExternalLink size={13} />
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              El cajero solo necesita escanear este código, elegir su nombre, ingresar su PIN y ya estará listo para cobrar.
            </p>

            <button
              onClick={() => setSelectedRegisterForQr(null)}
              className="w-full py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-white font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors"
            >
              Listo
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
