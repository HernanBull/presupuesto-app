import React, { useState, useEffect } from 'react';
import { X, Scale, Printer, Database, RefreshCw, Cpu } from 'lucide-react';
import { hardwareService } from '../../services/hardwareService';
import { offlineSyncManager } from '../../services/offlineSyncService';
import toast from 'react-hot-toast';

export default function HardwareSettingsModal({ isOpen, onClose }) {
  const [hardwareConfig, setHardwareConfig] = useState({
    scaleWeight: '0.000',
    scaleUnit: 'Kg',
    scaleStable: true,
    printerSize: '80mm',
    autoDrawer: true
  });
  const [pendingSalesCount, setPendingSalesCount] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    const unsubScale = hardwareService.subscribeScale((reading) => {
      setHardwareConfig(prev => ({
        ...prev,
        scaleWeight: reading.weight.toFixed(3),
        scaleUnit: reading.unit,
        scaleStable: reading.stable
      }));
    });

    const updateOfflineCount = async () => {
      try {
        const pending = await offlineSyncManager.getPendingSales();
        setPendingSalesCount(pending.length);
      } catch (_) {}
    };

    updateOfflineCount();
    const unsubOffline = offlineSyncManager.subscribe(updateOfflineCount);

    return () => {
      unsubScale();
      unsubOffline();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 p-7 space-y-5 animate-in zoom-in-95">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center border border-orange-200 dark:border-orange-800">
              <Cpu size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest block">Dispositivos y Periféricos</span>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Hardware de Mostrador</h3>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Balanza Electrónica */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Scale size={14} className="text-orange-500" />
                Balanza Electrónica RS-232 / USB
              </h4>
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Conectada y calibrada
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm font-mono font-black text-orange-600 bg-orange-100 dark:bg-orange-950/40 px-2.5 py-1 rounded-lg">
                {hardwareConfig.scaleWeight} {hardwareConfig.scaleUnit}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button 
              type="button"
              onClick={() => hardwareService.setSimulatedWeight(1.450)}
              className="py-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-white hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Pesar 1.45 Kg
            </button>
            <button 
              type="button"
              onClick={() => hardwareService.tareScale()}
              className="py-1.5 bg-slate-200 dark:bg-zinc-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition-colors cursor-pointer"
            >
              Tara (T)
            </button>
            <button 
              type="button"
              onClick={() => hardwareService.zeroScale()}
              className="py-1.5 bg-slate-200 dark:bg-zinc-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition-colors cursor-pointer"
            >
              Cero (Z)
            </button>
          </div>

          <button 
            type="button"
            onClick={() => hardwareService.connectWebSerialScale()}
            className="w-full py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Vincular Balanza por Web Serial API
          </button>
        </div>

        {/* Impresora Térmica & Gaveta ESC/POS */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-3">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Printer size={14} className="text-orange-500" />
            Impresora Térmica & Gaveta ESC/POS
          </h4>
          <div className="flex gap-2">
            {['80mm', '58mm'].map(sz => (
              <button
                key={sz}
                type="button"
                onClick={() => setHardwareConfig(prev => ({ ...prev, printerSize: sz }))}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  hardwareConfig.printerSize === sz
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white'
                }`}
              >
                Formato {sz}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 pt-1 cursor-pointer">
            <input 
              type="checkbox"
              checked={hardwareConfig.autoDrawer}
              onChange={(e) => setHardwareConfig(prev => ({ ...prev, autoDrawer: e.target.checked }))}
              className="rounded text-orange-500 focus:ring-orange-500"
            />
            <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
              Pulso automático a gaveta de dinero al cobrar
            </span>
          </label>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button 
              type="button"
              onClick={() => hardwareService.openCashDrawer()}
              className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition-colors cursor-pointer"
            >
              Abrir Gaveta
            </button>
            <button 
              type="button"
              onClick={() => hardwareService.printTestTicket(hardwareConfig.printerSize)}
              className="py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Test ESC/POS
            </button>
          </div>
        </div>

        {/* Base de Datos Dexie Offline-First */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Database size={14} className="text-emerald-500" />
                Base de Datos Dexie (Offline-First)
              </h4>
              <span className="text-[10px] text-slate-500">IndexedDB local protegida contra caídas de internet</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700">
              {pendingSalesCount} pendientes
            </span>
          </div>

          <button 
            type="button"
            onClick={async () => {
              const res = await offlineSyncManager.syncPendingSales();
              const p = await offlineSyncManager.getPendingSales();
              setPendingSalesCount(p.length);
              if (res.synced === 0) toast.success('Cola Dexie al día. No hay ventas pendientes.');
            }}
            className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-extrabold rounded-xl transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
          >
            <RefreshCw size={13} />
            <span>Sincronizar Cola Dexie con Servidor</span>
          </button>
        </div>
      </div>
    </div>
  );
}
