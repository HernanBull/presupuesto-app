// ==============================================================================
// AXONMARKET SUPERADMIN — Panel de Gestión de Terminales Físicas y Anti-Piratería
// Generación Exclusiva de API Keys, Control de Hardware (HWID), Kill Switch Remoto
// ==============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  ShieldBan,
  Cpu,
  Key,
  Copy,
  Check,
  RefreshCw,
  Plus,
  Trash2,
  AlertTriangle,
  Search,
  Monitor,
  Eye,
  EyeOff,
  Clock,
  HardDrive,
  Info,
  Server,
  Zap,
  Sliders
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';

export default function HardwareSecurityPanel({ superKey }) {
  const [activeSubTab, setActiveSubTab] = useState('terminals'); // 'terminals', 'apikeys', 'audit'
  const [workspaces, setWorkspaces] = useState([]);
  const [terminals, setTerminals] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWorkspace, setFilterWorkspace] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modal para Autorizar Nueva Terminal
  const [isAuthorizeModalOpen, setIsAuthorizeModalOpen] = useState(false);
  const [authWorkspaceId, setAuthWorkspaceId] = useState('');
  const [authTerminalCode, setAuthTerminalCode] = useState('CAJA-01');
  const [authHwid, setAuthHwid] = useState('');
  const [authMachineName, setAuthMachineName] = useState('POS-Terminal-01');
  const [authMotherboard, setAuthMotherboard] = useState('');
  const [authCpu, setAuthCpu] = useState('');
  const [authDisk, setAuthDisk] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Modal de Kill Switch / Revocación
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [targetTerminalToRevoke, setTargetTerminalToRevoke] = useState(null);
  const [revokeReason, setRevokeReason] = useState('Sospecha de clonación no autorizada / Violación de licencia');
  const [isSubmittingRevoke, setIsSubmittingRevoke] = useState(false);

  // Estados de copiado
  const [copiedId, setCopiedId] = useState(null);

  // Estado para visibilidad de API keys
  const [visibleKeys, setVisibleKeys] = useState({});

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchWorkspaces(), fetchTerminals(), fetchAuditLogs()]);
    } catch (err) {
      console.error('[HardwareSecurityPanel] Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkspaces = async () => {
    const { data, error } = await supabase
      .from('workspaces')
      .select('id, name, store_slug, api_key, api_key_status, max_terminals, is_pos_enabled, created_at')
      .order('name', { ascending: true });

    if (!error && data) {
      setWorkspaces(data);
      if (data.length > 0 && !authWorkspaceId) {
        setAuthWorkspaceId(data[0].id);
      }
    }
  };

  const fetchTerminals = async () => {
    const { data, error } = await supabase
      .from('store_terminals')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTerminals(data);
    }
  };

  const fetchAuditLogs = async () => {
    const { data, error } = await supabase
      .from('security_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(60);

    if (!error && data) {
      setAuditLogs(data);
    }
  };

  const handleCopy = (text, id) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const toggleKeyVisibility = (wsId) => {
    setVisibleKeys((prev) => ({
      ...prev,
      [wsId]: !prev[wsId]
    }));
  };

  // 1. Generar o Regenerar API Key exclusivamente desde SuperAdmin
  const handleGenerateApiKey = async (workspace) => {
    const hasKey = !!workspace.api_key;
    const confirmMsg = hasKey
      ? `🚨 ¿REGENERAR API KEY para "${workspace.name}"?\n\nLa clave actual dejará de funcionar inmediatamente y todas las cajas deberán actualizarse.`
      : `¿Generar una nueva API Key de acceso AxonPOS para "${workspace.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const { data, error } = await supabase.rpc('superadmin_generate_workspace_api_key', {
        p_workspace_id: workspace.id
      });

      if (error) throw error;
      if (data && data.success) {
        alert(`✅ API Key generada con éxito:\n\n${data.apiKey}\n\nHa sido asignada a "${workspace.name}".`);
        fetchWorkspaces();
      } else {
        alert(`Error: ${data?.error || 'No se pudo generar la API Key.'}`);
      }
    } catch (err) {
      console.error(err);
      alert(`Error al generar API Key: ${err.message}`);
    }
  };

  // 2. Modificar Límite de Terminales Permitidas
  const handleUpdateMaxTerminals = async (workspace, newLimit) => {
    const parsed = parseInt(newLimit, 10);
    if (isNaN(parsed) || parsed < 1) return;

    try {
      const { error } = await supabase
        .from('workspaces')
        .update({ max_terminals: parsed })
        .eq('id', workspace.id);

      if (!error) {
        setWorkspaces((prev) =>
          prev.map((w) => (w.id === workspace.id ? { ...w, max_terminals: parsed } : w))
        );
      }
    } catch (err) {
      alert(`Error al actualizar límite: ${err.message}`);
    }
  };

  // 3. Alternar Acceso POS de la Tienda (Switch Maestro)
  const handleTogglePosEnabled = async (workspace) => {
    const newState = !workspace.is_pos_enabled;
    const confirmMsg = newState
      ? `¿Habilitar acceso a AxonPOS para "${workspace.name}"?`
      : `🚨 ¿SUSPENDER ACCESO a AxonPOS para "${workspace.name}"?\n\nNinguna terminal física de este comercio podrá operar hasta reactivarlo.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const { error } = await supabase
        .from('workspaces')
        .update({ is_pos_enabled: newState })
        .eq('id', workspace.id);

      if (!error) {
        setWorkspaces((prev) =>
          prev.map((w) => (w.id === workspace.id ? { ...w, is_pos_enabled: newState } : w))
        );
      }
    } catch (err) {
      alert(`Error al cambiar estado: ${err.message}`);
    }
  };

  // 4. Autorizar Terminal Físicamente (RPC)
  const handleAuthorizeTerminalSubmit = async (e) => {
    e.preventDefault();
    if (!authWorkspaceId || !authHwid.trim() || !authTerminalCode.trim()) {
      setAuthError('Comercio, Huella HWID y Código de Caja son obligatorios.');
      return;
    }

    setIsSubmittingAuth(true);
    setAuthError(null);

    try {
      const { data, error } = await supabase.rpc('superadmin_authorize_terminal', {
        p_workspace_id: authWorkspaceId,
        p_hardware_fingerprint: authHwid.trim(),
        p_terminal_code: authTerminalCode.trim().toUpperCase(),
        p_machine_name: authMachineName.trim(),
        p_motherboard: authMotherboard.trim() || null,
        p_cpu: authCpu.trim() || null,
        p_disk: authDisk.trim() || null
      });

      if (error) throw error;
      if (data && data.success) {
        alert(`✅ Terminal ${data.terminalCode} autorizada exitosamente para el comercio.`);
        setIsAuthorizeModalOpen(false);
        setAuthHwid('');
        setAuthMotherboard('');
        setAuthCpu('');
        setAuthDisk('');
        fetchAllData();
      } else {
        setAuthError(data?.error || 'No se pudo autorizar la terminal.');
      }
    } catch (err) {
      setAuthError(err.message || 'Error de conexión.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // 5. Revocar Terminal (Kill Switch)
  const handleExecuteKillSwitch = async () => {
    if (!targetTerminalToRevoke) return;

    setIsSubmittingRevoke(true);
    try {
      const { data, error } = await supabase.rpc('superadmin_revoke_terminal', {
        p_terminal_id: targetTerminalToRevoke.id,
        p_reason: revokeReason.trim()
      });

      if (error) throw error;
      if (data && data.success) {
        alert(`🚨 KILL SWITCH EJECUTADO: La terminal "${targetTerminalToRevoke.terminal_code}" ha sido revocada. Se bloqueará de inmediato.`);
        setIsRevokeModalOpen(false);
        setTargetTerminalToRevoke(null);
        fetchTerminals();
        fetchAuditLogs();
      } else {
        alert(`Error: ${data?.error || 'No se pudo revocar la terminal.'}`);
      }
    } catch (err) {
      alert(`Error al ejecutar Kill Switch: ${err.message}`);
    } finally {
      setIsSubmittingRevoke(false);
    }
  };

  // 6. Reactivar Terminal previamente revocada
  const handleReactivateTerminal = async (term) => {
    const wsId = term.workspace_id || term.store_id;
    if (!window.confirm(`¿Reactivar la terminal "${term.terminal_code}" (${term.hardware_fingerprint})?`)) return;

    try {
      const { data, error } = await supabase.rpc('superadmin_authorize_terminal', {
        p_workspace_id: wsId,
        p_hardware_fingerprint: term.hardware_fingerprint,
        p_terminal_code: term.terminal_code,
        p_machine_name: term.machine_name || 'Terminal-PC'
      });

      if (error) throw error;
      if (data && data.success) {
        alert(`✅ Terminal reactivada con éxito.`);
        fetchTerminals();
      } else {
        alert(`Error: ${data?.error || 'No se pudo reactivar.'}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // 7. Eliminar Registro de Terminal
  const handleDeleteTerminal = async (termId) => {
    if (!window.confirm('¿Eliminar definitivamente el registro de esta terminal física?')) return;
    try {
      const { error } = await supabase.from('store_terminals').delete().eq('id', termId);
      if (!error) {
        fetchTerminals();
      }
    } catch (err) {
      alert('Error al eliminar registro');
    }
  };

  // Mapeo de Workspaces por ID para búsquedas rápidas
  const workspaceMap = useMemo(() => {
    const map = {};
    workspaces.forEach((w) => {
      map[w.id] = w;
    });
    return map;
  }, [workspaces]);

  // Terminales filtradas
  const filteredTerminals = useMemo(() => {
    return terminals.filter((t) => {
      const wsId = t.workspace_id || t.store_id;
      const ws = workspaceMap[wsId];
      const wsName = ws ? ws.name.toLowerCase() : '';
      const hw = (t.hardware_fingerprint || '').toLowerCase();
      const code = (t.terminal_code || '').toLowerCase();
      const machine = (t.machine_name || '').toLowerCase();
      const q = searchTerm.toLowerCase();

      const matchesSearch = hw.includes(q) || code.includes(q) || machine.includes(q) || wsName.includes(q);
      const matchesWs = filterWorkspace === 'ALL' || wsId === filterWorkspace;
      const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;

      return matchesSearch && matchesWs && matchesStatus;
    });
  }, [terminals, workspaceMap, searchTerm, filterWorkspace, filterStatus]);

  // Contadores de KPIs
  const stats = useMemo(() => {
    const totalPosActive = workspaces.filter((w) => w.is_pos_enabled).length;
    const activeTerminals = terminals.filter((t) => t.status === 'ACTIVE').length;
    const revokedTerminals = terminals.filter((t) => t.status === 'REVOKED').length;
    const securityViolations = auditLogs.filter(
      (l) => l.event_type === 'UNAUTHORIZED_HW' || l.event_type === 'REVOKED_ATTEMPT'
    ).length;

    return { totalPosActive, activeTerminals, revokedTerminals, securityViolations };
  }, [workspaces, terminals, auditLogs]);

  return (
    <div className="space-y-6 text-white font-sans">
      {/* 1. HEADER DE CONTROL Y KPIs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/60 border border-white/5 p-6 rounded-3xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-red-600 to-amber-600 rounded-xl text-white shadow-lg shadow-red-600/20">
              <Cpu size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-wider text-white">
                Blindaje de Terminales & Anti-Piratería
              </h2>
              <p className="text-xs text-zinc-400 font-medium">
                Generación exclusiva de API Keys por SuperAdmin y autorización atada a hardware físico (HWID)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAllData}
            disabled={loading}
            className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl border border-white/10 transition-colors flex items-center gap-2 text-xs font-bold"
            title="Recargar datos de terminales y auditoría"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={() => {
              setAuthError(null);
              setIsAuthorizeModalOpen(true);
            }}
            className="px-4 py-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg shadow-red-600/30 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Autorizar Terminal Física</span>
          </button>
        </div>
      </div>

      {/* 2. TARJETAS DE INDICADORES EN TIEMPO REAL */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Server size={22} />
          </div>
          <div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Comercios POS</p>
            <p className="text-2xl font-mono font-black text-white">{stats.totalPosActive}</p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <ShieldCheck size={22} />
          </div>
          <div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Cajas Activas</p>
            <p className="text-2xl font-mono font-black text-emerald-400">{stats.activeTerminals}</p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
          <div className="p-3 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20">
            <ShieldBan size={22} />
          </div>
          <div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Kill Switch Activo</p>
            <p className="text-2xl font-mono font-black text-red-400">{stats.revokedTerminals}</p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <AlertTriangle size={22} />
          </div>
          <div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Alertas Piratería</p>
            <p className="text-2xl font-mono font-black text-amber-400">{stats.securityViolations}</p>
          </div>
        </div>
      </div>

      {/* 3. SUB-PESTAÑAS DE NAVEGACIÓN */}
      <div className="flex gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveSubTab('terminals')}
          className={`px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center gap-2 transition-all ${
            activeSubTab === 'terminals'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
              : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Monitor size={15} />
          <span>Terminales Físicas ({terminals.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('apikeys')}
          className={`px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center gap-2 transition-all ${
            activeSubTab === 'apikeys'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
              : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Key size={15} />
          <span>Control de API Keys ({workspaces.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          className={`px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center gap-2 transition-all ${
            activeSubTab === 'audit'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
              : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <ShieldAlert size={15} />
          <span>Radar de Auditoría & Intentos ({auditLogs.length})</span>
        </button>
      </div>

      {/* 4. CONTENIDO: PESTAÑA 1 - TERMINALES FÍSICAS */}
      {activeSubTab === 'terminals' && (
        <div className="space-y-4">
          {/* Barra de Búsqueda y Filtros */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por HWID, caja, máquina o comercio..."
                className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
            </div>

            <select
              value={filterWorkspace}
              onChange={(e) => setFilterWorkspace(e.target.value)}
              className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-red-500"
            >
              <option value="ALL">Todos los Comercios</option>
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-red-500"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="ACTIVE">Activas (Autorizadas)</option>
              <option value="REVOKED">Revocadas (Kill Switch)</option>
              <option value="PENDING">Pendientes</option>
            </select>
          </div>

          {/* Tabla de Terminales */}
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Comercio</th>
                  <th className="py-3 px-4">Caja / Estación</th>
                  <th className="py-3 px-4">Huella Física (HWID)</th>
                  <th className="py-3 px-4">Última Presencia</th>
                  <th className="py-3 px-4">Autorizado</th>
                  <th className="py-3 px-4 text-right">Acciones Kill Switch</th>
                </tr>
              </thead>
              <tbody>
                {filteredTerminals.map((t) => {
                  const wsId = t.workspace_id || t.store_id;
                  const ws = workspaceMap[wsId];
                  const isRevoked = t.status === 'REVOKED';

                  return (
                    <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      {/* Estado */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isRevoked
                              ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isRevoked ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}
                          />
                          {isRevoked ? 'REVOCADA' : 'ACTIVA'}
                        </span>
                      </td>

                      {/* Comercio */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-xs text-white">{ws?.name || 'Comercio Desconocido'}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">{ws?.store_slug || wsId?.substring(0, 8)}</div>
                      </td>

                      {/* Caja / Estación */}
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-xs text-amber-400">{t.terminal_code}</div>
                        <div className="text-[10px] text-zinc-400">{t.machine_name || 'PC-Terminal'}</div>
                      </td>

                      {/* Huella Física (HWID) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-zinc-300 font-bold bg-zinc-800/80 px-2 py-0.5 rounded border border-white/5">
                            {t.hardware_fingerprint}
                          </span>
                          <button
                            onClick={() => handleCopy(t.hardware_fingerprint, t.id)}
                            className="p-1 hover:text-white text-zinc-500 transition-colors"
                            title="Copiar HWID"
                          >
                            {copiedId === t.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          </button>
                        </div>
                        {t.motherboard_serial && (
                          <div className="text-[9px] text-zinc-500 font-mono mt-0.5">
                            MB: {t.motherboard_serial.substring(0, 16)}...
                          </div>
                        )}
                      </td>

                      {/* Última Presencia */}
                      <td className="py-3 px-4">
                        <div className="text-xs text-zinc-300">
                          {t.last_seen_at ? new Date(t.last_seen_at).toLocaleDateString() : 'Sin conexión'}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {t.last_seen_at ? new Date(t.last_seen_at).toLocaleTimeString() : '—'}
                        </div>
                      </td>

                      {/* Fecha de Autorización */}
                      <td className="py-3 px-4">
                        <div className="text-xs text-zinc-400">{new Date(t.created_at).toLocaleDateString()}</div>
                        <div className="text-[10px] text-zinc-500">Por {t.authorized_by || 'SUPERADMIN'}</div>
                      </td>

                      {/* Acciones Kill Switch */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isRevoked ? (
                            <button
                              onClick={() => handleReactivateTerminal(t)}
                              className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                              title="Reactivar terminal física"
                            >
                              <ShieldCheck size={13} />
                              <span>Reactivar</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setTargetTerminalToRevoke(t);
                                setIsRevokeModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                              title="Apagar / Revocar terminal inmediatamente (Kill Switch)"
                            >
                              <ShieldBan size={13} />
                              <span>Kill Switch</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteTerminal(t.id)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Eliminar registro"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredTerminals.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-500 text-xs">
                      No se encontraron terminales registradas con los filtros actuales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. CONTENIDO: PESTAÑA 2 - GESTIÓN DE API KEYS (EXCLUSIVO SUPERADMIN) */}
      {activeSubTab === 'apikeys' && (
        <div className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3">
            <Info size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200">
              <span className="font-bold">Principio de Seguridad Anti-Piratería:</span> Las API Keys son controladas y
              generadas <strong>exclusivamente por el SuperAdmin</strong>. Los comerciantes en su POS no pueden inventarlas
              ni modificarlas. Cada comercio tiene un límite estricto de terminales físicas vinculadas por HWID.
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  <th className="py-3 px-4">Comercio</th>
                  <th className="py-3 px-4">API Key Maestra</th>
                  <th className="py-3 px-4">Estado Clave</th>
                  <th className="py-3 px-4">Límite Cajas</th>
                  <th className="py-3 px-4">Acceso POS</th>
                  <th className="py-3 px-4 text-right">Acción SuperAdmin</th>
                </tr>
              </thead>
              <tbody>
                {workspaces.map((ws) => {
                  const hasKey = !!ws.api_key;
                  const isVisible = !!visibleKeys[ws.id];
                  const linkedCount = terminals.filter(
                    (t) => (t.workspace_id === ws.id || t.store_id === ws.id) && t.status === 'ACTIVE'
                  ).length;

                  return (
                    <tr key={ws.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      {/* Comercio */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-xs text-white">{ws.name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">Slug: {ws.store_slug || 'sin-slug'}</div>
                      </td>

                      {/* API Key */}
                      <td className="py-3 px-4">
                        {hasKey ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-emerald-400 bg-zinc-800/80 px-2 py-0.5 rounded border border-white/5">
                              {isVisible ? ws.api_key : `${ws.api_key.substring(0, 14)}••••••••${ws.api_key.slice(-4)}`}
                            </span>
                            <button
                              onClick={() => toggleKeyVisibility(ws.id)}
                              className="p-1 hover:text-white text-zinc-500 transition-colors"
                              title={isVisible ? 'Ocultar' : 'Ver completa'}
                            >
                              {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                            <button
                              onClick={() => handleCopy(ws.api_key, `api-${ws.id}`)}
                              className="p-1 hover:text-white text-zinc-500 transition-colors"
                              title="Copiar API Key"
                            >
                              {copiedId === `api-${ws.id}` ? (
                                <Check size={14} className="text-emerald-400" />
                              ) : (
                                <Copy size={14} />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-500/80 italic">Sin clave asignada</span>
                        )}
                      </td>

                      {/* Estado Clave */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            hasKey
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-zinc-800 text-zinc-500'
                          }`}
                        >
                          {hasKey ? ws.api_key_status || 'ACTIVA' : 'INACTIVA'}
                        </span>
                      </td>

                      {/* Límite de Cajas */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white font-mono">
                            {linkedCount} / {ws.max_terminals || 1}
                          </span>
                          <button
                            onClick={() => {
                              const newLim = prompt(
                                `Nuevo límite de cajas para ${ws.name}:`,
                                String(ws.max_terminals || 1)
                              );
                              if (newLim) handleUpdateMaxTerminals(ws, newLim);
                            }}
                            className="p-1 hover:text-amber-400 text-zinc-500"
                            title="Modificar límite de cajas"
                          >
                            <Sliders size={13} />
                          </button>
                        </div>
                      </td>

                      {/* Switch Maestro de Acceso POS */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleTogglePosEnabled(ws)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                            ws.is_pos_enabled
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20'
                              : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:text-white'
                          }`}
                        >
                          {ws.is_pos_enabled ? 'HABILITADO' : 'SUSPENDIDO'}
                        </button>
                      </td>

                      {/* Acción SuperAdmin */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleGenerateApiKey(ws)}
                          className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5 ml-auto cursor-pointer"
                        >
                          <Zap size={13} />
                          <span>{hasKey ? 'Rotar Clave' : 'Generar Clave'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. CONTENIDO: PESTAÑA 3 - RADAR DE AUDITORÍA Y PIRATERÍA */}
      {activeSubTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              Eventos de Verificación de Hardware y Detección de Falsificación (Últimos 60)
            </h3>
            <button
              onClick={fetchAuditLogs}
              className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1"
            >
              <RefreshCw size={12} />
              <span>Refrescar Registro</span>
            </button>
          </div>

          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  <th className="py-3 px-4">Fecha / Hora</th>
                  <th className="py-3 px-4">Tipo de Evento</th>
                  <th className="py-3 px-4">Comercio</th>
                  <th className="py-3 px-4">Huella Hardware (HWID)</th>
                  <th className="py-3 px-4">IP Origen</th>
                  <th className="py-3 px-4">Detalles Técnicos</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => {
                  const ws = workspaceMap[log.workspace_id];
                  const isPiracyAlert = log.event_type === 'UNAUTHORIZED_HW' || log.event_type === 'REVOKED_ATTEMPT';
                  const isKeyError = log.event_type === 'INVALID_API_KEY';

                  return (
                    <tr
                      key={log.id}
                      className={`border-b border-white/5 ${
                        isPiracyAlert ? 'bg-red-500/[0.04]' : isKeyError ? 'bg-amber-500/[0.03]' : ''
                      }`}
                    >
                      {/* Fecha / Hora */}
                      <td className="py-3 px-4 text-xs font-mono text-zinc-400">
                        {new Date(log.created_at).toLocaleString()}
                      </td>

                      {/* Tipo de Evento */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isPiracyAlert
                              ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                              : isKeyError
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {isPiracyAlert && <AlertTriangle size={12} />}
                          {log.event_type}
                        </span>
                      </td>

                      {/* Comercio */}
                      <td className="py-3 px-4 text-xs font-bold text-white">
                        {ws?.name || (log.workspace_id ? log.workspace_id.substring(0, 8) : 'Anónimo / Desconocido')}
                      </td>

                      {/* HWID */}
                      <td className="py-3 px-4 font-mono text-xs text-zinc-300">
                        {log.hardware_fingerprint || '—'}
                      </td>

                      {/* IP */}
                      <td className="py-3 px-4 font-mono text-xs text-zinc-400">
                        {log.ip_address || '127.0.0.1'}
                      </td>

                      {/* Detalles */}
                      <td className="py-3 px-4 text-xs text-zinc-400 font-mono max-w-xs truncate">
                        {JSON.stringify(log.details || {})}
                      </td>
                    </tr>
                  );
                })}

                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-500 text-xs">
                      No hay registros de auditoría registrados en la plataforma.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. MODAL: AUTORIZAR NUEVA TERMINAL FÍSICA (SUPERADMIN) */}
      {isAuthorizeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-red-500/30 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Cpu size={20} className="text-red-500" />
                <h3 className="text-base font-black uppercase tracking-wide text-white">
                  Autorizar Terminal Física
                </h3>
              </div>
              <button
                onClick={() => setIsAuthorizeModalOpen(false)}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            {authError && (
              <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl text-red-400 text-xs font-bold">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthorizeTerminalSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Comercio / Tienda
                </label>
                <select
                  value={authWorkspaceId}
                  onChange={(e) => setAuthWorkspaceId(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                >
                  {workspaces.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.store_slug || 'sin-slug'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Código de Caja
                  </label>
                  <input
                    type="text"
                    value={authTerminalCode}
                    onChange={(e) => setAuthTerminalCode(e.target.value)}
                    placeholder="CAJA-01"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white uppercase focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Nombre del Equipo
                  </label>
                  <input
                    type="text"
                    value={authMachineName}
                    onChange={(e) => setAuthMachineName(e.target.value)}
                    placeholder="POS-Mostrador-Principal"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Huella de Hardware Físico (HWID)
                  </label>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const txt = await navigator.clipboard.readText();
                        if (txt) setAuthHwid(txt.trim());
                      } catch {}
                    }}
                    className="text-[10px] text-amber-400 hover:underline font-bold"
                  >
                    Pegar del Portapapeles
                  </button>
                </div>
                <input
                  type="text"
                  value={authHwid}
                  onChange={(e) => setAuthHwid(e.target.value)}
                  placeholder="HW-D3CE-6E0F-393F-0270"
                  required
                  className="w-full bg-zinc-900 border border-red-500/40 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-red-500"
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  Obtenido mediante el script <code>hardware-inspector.cjs</code> o atajo <code>Ctrl+Shift+H</code>.
                </p>
              </div>

              <div className="space-y-2 border-t border-white/10 pt-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Detalles Físicos Opcionales (Inspección en Sitio)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={authMotherboard}
                    onChange={(e) => setAuthMotherboard(e.target.value)}
                    placeholder="Motherboard Serial"
                    className="bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-zinc-300"
                  />
                  <input
                    type="text"
                    value={authCpu}
                    onChange={(e) => setAuthCpu(e.target.value)}
                    placeholder="CPU ID"
                    className="bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-zinc-300"
                  />
                  <input
                    type="text"
                    value={authDisk}
                    onChange={(e) => setAuthDisk(e.target.value)}
                    placeholder="Disk Serial"
                    className="bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-zinc-300"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAuthorizeModalOpen(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAuth}
                  className="px-5 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-600/30 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmittingAuth ? 'Autorizando...' : 'Vincular y Autorizar PC'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. MODAL: EJECUTAR KILL SWITCH REMOTO (SUPERADMIN) */}
      {isRevokeModalOpen && targetTerminalToRevoke && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-red-500 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <ShieldBan size={28} />
              <div>
                <h3 className="text-base font-black uppercase tracking-wider text-white">
                  Ejecutar Kill Switch Remoto
                </h3>
                <p className="text-[11px] text-red-400 font-bold">Acción Inmediata de Bloqueo de Hardware</p>
              </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-2xl text-xs text-red-200 space-y-1">
              <p>
                Está a punto de revocar la terminal <strong>{targetTerminalToRevoke.terminal_code}</strong> (HWID:{' '}
                <code>{targetTerminalToRevoke.hardware_fingerprint}</code>).
              </p>
              <p className="text-[11px] text-zinc-400">
                La terminal se desconectará del POS al instante mediante el monitor de seguridad en segundo plano.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Motivo de Revocación
              </label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                rows={3}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRevokeModalOpen(false);
                  setTargetTerminalToRevoke(null);
                }}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteKillSwitch}
                disabled={isSubmittingRevoke}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-red-600/40 flex items-center gap-2 cursor-pointer"
              >
                <ShieldBan size={15} />
                <span>{isSubmittingRevoke ? 'Revocando...' : 'Confirmar Kill Switch'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
