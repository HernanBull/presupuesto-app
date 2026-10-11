import React, { useState, useEffect } from 'react';
import { Download, CheckCircle2, Trash2, X, HardDrive, Zap, Info, RefreshCw } from 'lucide-react';
import { downloadZoneTiles, getOfflineZoneInfo, clearMapCache } from '../utils/offlineMapService';

export default function OfflineMapModal({ isOpen, onClose, currentCenter }) {
  const [cachedInfo, setCachedInfo] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0, percent: 0 });
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadCacheInfo();
    }
  }, [isOpen]);

  const loadCacheInfo = async () => {
    const info = await getOfflineZoneInfo();
    setCachedInfo(info);
  };

  if (!isOpen) return null;

  const handleStartDownload = async () => {
    if (!currentCenter) return;
    try {
      setIsDownloading(true);
      setStatusMessage('Calculando mosaicos de la zona...');
      
      const meta = await downloadZoneTiles(
        currentCenter.lat, 
        currentCenter.lng, 
        3.5, // Radio de 3.5 km
        (prog) => {
          setProgress(prog);
          setStatusMessage(`Guardando en teléfono: ${prog.completed} de ${prog.total} mosaicos (${prog.percent}%)`);
        }
      );

      setStatusMessage('¡Descarga completada con éxito!');
      setCachedInfo(meta);
    } catch (err) {
      console.error('Error al descargar mapa offline:', err);
      setStatusMessage('Error al guardar mapa. Verifica tu conexión.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClearCache = async () => {
    if (window.confirm('¿Deseas eliminar los mapas guardados en este dispositivo para liberar espacio?')) {
      await clearMapCache();
      setCachedInfo(null);
      setStatusMessage('Caché de mapas eliminada.');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '2.5 MB aprox.';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden text-white font-sans">
        
        {/* Cabecera */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <HardDrive size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-zinc-100 leading-tight">Mapa en Caché Offline</h3>
              <p className="text-[11px] text-zinc-400">Ahorro de datos y carga instantánea</p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            disabled={isDownloading}
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-5 space-y-4">
          
          {/* Tarjeta de Beneficios */}
          <div className="p-3.5 bg-zinc-800/60 rounded-2xl border border-zinc-700/50 flex items-start gap-3">
            <Zap size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-300 leading-relaxed">
              Descarga los mosaicos de tu zona (aprox. 2.5 MB). El mapa cargará <strong>al instante desde la memoria de tu teléfono</strong>, sin gastar tus datos móviles ni sobrecalentar el dispositivo.
            </p>
          </div>

          {/* Estado Actual */}
          {cachedInfo ? (
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 size={16} />
                  <span>Zona guardada en tu teléfono</span>
                </div>
                <span className="text-[11px] font-bold text-zinc-400">
                  {formatBytes(cachedInfo.totalBytes)}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1.5">
                {cachedInfo.totalTiles} mosaicos guardados en el almacenamiento local.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-zinc-800/30 border border-dashed border-zinc-700 rounded-2xl text-center">
              <Info size={20} className="mx-auto text-zinc-500 mb-1" />
              <p className="text-xs text-zinc-400">No hay mapa guardado en este dispositivo.</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Puedes descargar tu zona actual para navegar sin lag.</p>
            </div>
          )}

          {/* Barra de Progreso durante la descarga */}
          {isDownloading && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                <span>Descargando zona...</span>
                <span>{progress.percent}%</span>
              </div>
              <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-200"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <p className="text-[11px] text-zinc-400 text-center animate-pulse">
                {statusMessage}
              </p>
            </div>
          )}

          {statusMessage && !isDownloading && (
            <p className="text-xs text-center text-amber-300 font-medium">
              {statusMessage}
            </p>
          )}

          {/* Botones de Acción */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleStartDownload}
              disabled={isDownloading}
              className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              {isDownloading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Descargando mosaicos...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>{cachedInfo ? 'Actualizar zona guardada (3.5 km)' : 'Descargar zona actual en caché'}</span>
                </>
              )}
            </button>

            {cachedInfo && !isDownloading && (
              <button
                onClick={handleClearCache}
                className="w-full py-2.5 px-3 bg-zinc-800 hover:bg-zinc-750 text-rose-400 hover:text-rose-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-zinc-700/50"
              >
                <Trash2 size={13} />
                <span>Borrar mapa guardado y liberar espacio</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
