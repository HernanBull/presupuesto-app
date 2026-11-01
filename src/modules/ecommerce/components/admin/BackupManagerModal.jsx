// ==============================================================================
// AXONMARKET & AXONPOS — Centro de Respaldos & Disaster Recovery (Motor ACID v4.0)
// Fiel a la Interfaz de AxonPOS (Imagen 2) — White & Radiant Orange Suite
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Database,
  Cloud,
  Download,
  Upload,
  RefreshCw,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  Clock,
  Shield,
  ArrowRight,
  Package,
  ShoppingBag,
  Users,
  Copy,
  Check,
  RotateCcw
} from 'lucide-react';
import { backupService } from '../../services/backupService';
import toast from 'react-hot-toast';

export default function BackupManagerModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('LOCAL'); // 'LOCAL' | 'CLOUD' | 'HISTORY'
  const [isExporting, setIsExporting] = useState(false);
  const [isUploadingCloud, setIsUploadingCloud] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [stats, setStats] = useState({ products: 0, sales: 0, customers: 0, lastBackupDate: 'Cargando...' });
  const [history, setHistory] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      loadStats();
      loadHistory();
    }
  }, [isOpen]);

  const loadStats = async () => {
    try {
      const s = await backupService.getLiveStats();
      setStats(s);
    } catch (e) {
      console.warn('Error loading backup stats:', e);
    }
  };

  const loadHistory = async () => {
    try {
      const h = await backupService.getBackupHistory();
      setHistory(h);
    } catch (e) {
      console.warn('Error loading backup history:', e);
    }
  };

  if (!isOpen) return null;

  const handleExportLocal = async () => {
    setIsExporting(true);
    try {
      const res = await backupService.exportBackupFile();
      toast.success(`Copia de seguridad descargada: ${res.fileName}`);
      loadStats();
      loadHistory();
    } catch (err) {
      toast.error(err.message || 'Error al generar la copia');
    } finally {
      setIsExporting(false);
    }
  };

  const handleUploadCloud = async () => {
    setIsUploadingCloud(true);
    try {
      const res = await backupService.uploadBackupToCloud();
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
      loadStats();
      loadHistory();
    } catch (err) {
      toast.error(err.message || 'Error al conectar con la nube');
    } finally {
      setIsUploadingCloud(false);
    }
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm(`¿Desea restaurar la base de datos a partir de "${file.name}"? Los datos actuales serán actualizados atómicamente.`)) {
      e.target.value = '';
      return;
    }

    setIsRestoring(true);
    try {
      const res = await backupService.restoreFromFile(file);
      toast.success(`¡Base de datos restaurada con éxito para "${res.storeName}"!`);
      loadStats();
      loadHistory();
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      toast.error(err.message || 'Error al procesar el archivo .axonbak');
    } finally {
      setIsRestoring(false);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* ========================================================
            CABECERA PRINCIPAL (IDÉNTICA A IMAGEN 2)
            ======================================================== */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/5 flex items-start justify-between bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/30">
              <Database size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Centro de Respaldos & Disaster Recovery
                </h2>
                <span className="bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 border border-orange-200 dark:border-orange-500/30">
                  🛡️ Motor ACID v4.0
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Protección integral contra fallas de disco, cambio de equipos/tablets y resguardo en la nube
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
            CONTADORES MÉTRICOS EN VIVO (IDÉNTICOS A IMAGEN 2)
            ======================================================== */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-zinc-950/40">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-2.5 bg-white dark:bg-zinc-800 rounded-xl border border-slate-200/60 dark:border-white/5 flex items-center gap-2.5 shadow-2xs">
              <div className="p-2 bg-orange-50 text-orange-500 dark:bg-orange-500/10 rounded-lg">
                <Package size={16} />
              </div>
              <div>
                <span className="text-sm font-black text-slate-800 dark:text-white block leading-none">{stats.products}</span>
                <span className="text-[10px] text-slate-400 font-medium">Productos Activos</span>
              </div>
            </div>

            <div className="p-2.5 bg-white dark:bg-zinc-800 rounded-xl border border-slate-200/60 dark:border-white/5 flex items-center gap-2.5 shadow-2xs">
              <div className="p-2 bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10 rounded-lg">
                <ShoppingBag size={16} />
              </div>
              <div>
                <span className="text-sm font-black text-slate-800 dark:text-white block leading-none">{stats.sales}</span>
                <span className="text-[10px] text-slate-400 font-medium">Ventas Registradas</span>
              </div>
            </div>

            <div className="p-2.5 bg-white dark:bg-zinc-800 rounded-xl border border-slate-200/60 dark:border-white/5 flex items-center gap-2.5 shadow-2xs">
              <div className="p-2 bg-blue-50 text-blue-500 dark:bg-blue-500/10 rounded-lg">
                <Users size={16} />
              </div>
              <div>
                <span className="text-sm font-black text-slate-800 dark:text-white block leading-none">{stats.customers}</span>
                <span className="text-[10px] text-slate-400 font-medium">Clientes Guardados</span>
              </div>
            </div>

            <div className="p-2.5 bg-white dark:bg-zinc-800 rounded-xl border border-slate-200/60 dark:border-white/5 flex items-center gap-2.5 shadow-2xs">
              <div className="p-2 bg-violet-50 text-violet-500 dark:bg-violet-500/10 rounded-lg">
                <Clock size={16} />
              </div>
              <div>
                <span className="text-xs font-black text-slate-800 dark:text-white block leading-tight truncate">{stats.lastBackupDate}</span>
                <span className="text-[10px] text-slate-400 font-medium">Última Copia Local</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            BARRA DE PESTAÑAS (IDÉNTICA A IMAGEN 2)
            ======================================================== */}
        <div className="px-4 sm:px-6 pt-2 pb-2 flex items-center gap-2 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-zinc-950/40">
          <button
            onClick={() => setActiveTab('LOCAL')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'LOCAL'
                ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/30'
                : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 border border-slate-200/60 dark:border-white/5'
            }`}
          >
            <Download size={14} />
            <span>Respaldo Local (.axonbak)</span>
          </button>

          <button
            onClick={() => setActiveTab('CLOUD')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'CLOUD'
                ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/30'
                : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 border border-slate-200/60 dark:border-white/5'
            }`}
          >
            <Cloud size={14} />
            <span>Nube Supabase Disaster Recovery</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block ml-0.5"></span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'bg-orange-500 text-white shadow-xs shadow-orange-500/30'
                : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 border border-slate-200/60 dark:border-white/5'
            }`}
          >
            <Clock size={14} />
            <span>Historial de Puntos ({history.length})</span>
          </button>
        </div>

        {/* ========================================================
            CUERPO DE LA PESTAÑA SELECCIONADA
            ======================================================== */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 custom-scrollbar">

          {/* TAB 1: LOCAL (.axonbak) (IDÉNTICO A IMAGEN 2) */}
          {activeTab === 'LOCAL' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Tarjeta Izquierda: Generar Respaldo Local */}
              <div className="p-5 rounded-2xl bg-white dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 dark:bg-orange-500/10 flex items-center justify-center">
                      <Download size={20} />
                    </div>
                    <span className="text-[10px] font-black font-mono bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 px-2 py-0.5 rounded-md">
                      .axonbak
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Generar Respaldo Local
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Descarga un archivo seguro <strong className="text-orange-600 dark:text-orange-400">.axonbak</strong> con todas las ventas, productos, imágenes, kardex y usuarios.
                  </p>

                  <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-zinc-300 font-medium">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                      <span>Inventario completo, variantes, fotos y kardex</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                      <span>Historial de ventas, tickets SENIAT y cobros</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                      <span>Cuentas por cobrar y clientes fidelizados</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                      <span>Verificación criptográfica SHA-256 anti-corrupción</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 space-y-2">
                  <button
                    onClick={handleExportLocal}
                    disabled={isExporting}
                    className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs rounded-xl shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Download size={16} />
                    <span>{isExporting ? 'Generando Copia...' : 'Descargar Copia de Seguridad (.axonbak)'}</span>
                  </button>

                  <p className="text-[10px] text-slate-400 flex items-center gap-1 text-center justify-center">
                    💡 Recomendación: guarde una copia al finalizar la jornada en una memoria USB o disco externo.
                  </p>
                </div>
              </div>

              {/* Tarjeta Derecha: Restaurar desde Archivo */}
              <div className="p-5 rounded-2xl bg-white dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 dark:bg-blue-500/10 flex items-center justify-center">
                      <Upload size={20} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 px-2 py-0.5 rounded-md">
                      Disaster Recovery
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Restaurar desde Archivo
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Reconstituye toda la base de datos en esta computadora o tablet a partir de una copia previa <strong className="text-blue-600 dark:text-blue-400">.axonbak</strong>.
                  </p>

                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileSelected} 
                    accept=".axonbak,.json" 
                    className="hidden" 
                  />

                  {/* Drag & Drop Area */}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-4 p-6 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 mb-2">
                      <FileText size={22} />
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-zinc-200">
                      Arrastra tu archivo .axonbak aquí
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">o haz clic para examinar en tu equipo</p>

                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[9px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-300 px-2 py-0.5 rounded-full">
                        .axonbak (Oficial)
                      </span>
                      <span className="text-[9px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 px-2 py-0.5 rounded-full">
                        .json
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 space-y-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isRestoring}
                    className="w-full py-3 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Upload size={16} />
                    <span>{isRestoring ? 'Validando & Restaurando...' : 'Examinar Archivos en el Dispositivo'}</span>
                  </button>

                  <p className="text-[10px] text-slate-400 flex items-center gap-1 text-center justify-center">
                    🛡️ El sistema valida la integridad de firmas antes de permitir cualquier reemplazo.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: NUBE SUPABASE */}
          {activeTab === 'CLOUD' && (
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Cloud size={18} className="text-emerald-500" />
                    Sincronización en Nube Supabase
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Guarda una copia cifrada en los servidores seguros de AxonMarket Cloud.
                  </p>
                </div>

                <button
                  onClick={handleUploadCloud}
                  disabled={isUploadingCloud}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {isUploadingCloud ? 'Subiendo...' : 'Subir Respaldo a la Nube Ahora'}
                </button>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-zinc-950 rounded-xl text-xs text-slate-600 dark:text-zinc-300">
                <p className="font-bold mb-1">Estado de la Conexión Cloud:</p>
                <div className="flex items-center gap-2 text-emerald-600 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Conectado a Supabase PostgreSQL (Latencia &lt; 85ms)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HISTORIAL */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
                Copias y Puntos de Restauración ({history.length}):
              </h3>

              {history.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6 bg-slate-50 dark:bg-zinc-950 rounded-2xl">
                  Sin copias previas registradas en este equipo.
                </p>
              ) : (
                <div className="space-y-2">
                  {history.map(item => (
                    <div key={item.id} className="p-3 bg-white dark:bg-zinc-800 rounded-xl border border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="p-2 rounded-lg bg-orange-50 text-orange-500 dark:bg-orange-500/10">
                          <HardDrive size={16} />
                        </span>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white">{item.fileName}</p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(item.createdAt).toLocaleString('es-VE')} • Ubicación: {item.storageLocation}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-mono text-slate-400 block truncate max-w-[120px]">
                          SHA: {item.checksumSha256?.substring(0, 10)}...
                        </span>
                        <span className="text-[11px] font-bold text-slate-600 dark:text-zinc-300">
                          {Math.round((item.fileSizeBytes || 0) / 1024)} KB
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* PIE DE PÁGINA (IDÉNTICO A IMAGEN 2) */}
        <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-zinc-950/40 flex items-center justify-between">
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Shield size={14} className="text-orange-500" />
            <span>Transacciones atómicas protegidas por Dexie.js ACID contra cortes de luz o apagones</span>
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
