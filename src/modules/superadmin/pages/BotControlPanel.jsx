import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { 
  Bot, AlertTriangle, Power, PauseCircle, PlayCircle, 
  Terminal, ShieldAlert, CheckCircle2, Clock, Info
} from 'lucide-react';

export default function BotControlPanel() {
  const [logs, setLogs] = useState([]);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [acceptOrders, setAcceptOrders] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
    fetchLogs();

    // Suscripción en tiempo real a los logs
    const logsSubscription = supabase
      .channel('bot_logs_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bot_logs' }, payload => {
        setLogs(current => [payload.new, ...current].slice(0, 100)); // Mantener los últimos 100
      })
      .subscribe();

    return () => {
      supabase.removeChannel(logsSubscription);
    };
  }, []);

  async function fetchSettings() {
    const { data, error } = await supabase.from('platform_settings').select('*').in('key', ['bot_maintenance_mode', 'bot_accept_orders']);
    if (!error && data) {
      data.forEach(setting => {
        if (setting.key === 'bot_maintenance_mode') setMaintenanceMode(setting.value === 'true');
        if (setting.key === 'bot_accept_orders') setAcceptOrders(setting.value === 'true');
      });
    }
  }

  async function fetchLogs() {
    const { data, error } = await supabase.from('bot_logs').select('*').order('created_at', { ascending: false }).limit(50);
    if (!error && data) {
      setLogs(data);
    }
    setLoading(false);
  }

  async function toggleSetting(key, currentValue) {
    const newValue = !currentValue;
    const { error } = await supabase.from('platform_settings').upsert({ key, value: newValue.toString() }, { onConflict: 'key' });
    
    if (!error) {
      if (key === 'bot_maintenance_mode') setMaintenanceMode(newValue);
      if (key === 'bot_accept_orders') setAcceptOrders(newValue);
      
      // Registrar la acción manual en los logs
      await supabase.from('bot_logs').insert([{
        level: 'warning',
        message: `Admin cambió ${key} a ${newValue}`,
        details: { action: 'admin_toggle', key, newValue }
      }]);
    } else {
      alert("Error al actualizar la configuración");
    }
  }

  const getLevelColor = (level) => {
    switch (level) {
      case 'error': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'warning': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'info': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default: return 'text-gray-400 bg-gray-800 border-gray-700';
    }
  };

  const getLevelIcon = (level) => {
    switch (level) {
      case 'error': return <ShieldAlert className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info': return <Info className="w-4 h-4 text-blue-500" />;
      default: return <Terminal className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot className="w-8 h-8 text-indigo-400" />
            Control Central del Bot
          </h2>
          <p className="text-gray-400 mt-1">Supervisa y controla el comportamiento del bot de Telegram en tiempo real.</p>
        </div>
      </div>

      {/* Panel de Interruptores (Kill Switches) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Mantenimiento Global */}
        <div className={`p-6 rounded-xl border ${maintenanceMode ? 'bg-red-500/10 border-red-500/50' : 'bg-[#242424] border-gray-800'}`}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className={`text-xl font-bold flex items-center gap-2 ${maintenanceMode ? 'text-red-500' : 'text-white'}`}>
                <Power className="w-6 h-6" />
                Modo Mantenimiento
              </h3>
              <p className="text-gray-400 mt-2 text-sm">
                Si activas esto, el bot dejará de procesar mensajes y responderá que está en mantenimiento. Usa esto solo en caso de emergencia extrema o caída del sistema.
              </p>
            </div>
            <button 
              onClick={() => toggleSetting('bot_maintenance_mode', maintenanceMode)}
              className={`px-4 py-2 rounded-lg font-bold transition-colors ${maintenanceMode ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
              {maintenanceMode ? 'DESACTIVAR MANTENIMIENTO' : 'ACTIVAR MANTENIMIENTO'}
            </button>
          </div>
        </div>

        {/* Pausa de Pedidos */}
        <div className={`p-6 rounded-xl border ${!acceptOrders ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-[#242424] border-gray-800'}`}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className={`text-xl font-bold flex items-center gap-2 ${!acceptOrders ? 'text-yellow-500' : 'text-white'}`}>
                {!acceptOrders ? <PauseCircle className="w-6 h-6" /> : <PlayCircle className="w-6 h-6" />}
                Asignación de Pedidos
              </h3>
              <p className="text-gray-400 mt-2 text-sm">
                Controla si los repartidores pueden tomar nuevos pedidos. Si lo pausas, el bot funcionará normalmente pero bloqueará el botón de "Aceptar Viaje".
              </p>
            </div>
            <button 
              onClick={() => toggleSetting('bot_accept_orders', acceptOrders)}
              className={`px-4 py-2 rounded-lg font-bold transition-colors ${!acceptOrders ? 'bg-yellow-500 text-black hover:bg-yellow-600' : 'bg-green-500 text-white hover:bg-green-600'}`}
            >
              {!acceptOrders ? 'REANUDAR ASIGNACIONES' : 'PAUSAR ASIGNACIONES'}
            </button>
          </div>
        </div>

      </div>

      {/* Consola de Logs */}
      <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 overflow-hidden shadow-2xl font-mono">
        <div className="flex items-center justify-between px-4 py-3 bg-[#242424] border-b border-gray-800">
          <div className="flex items-center gap-2 text-gray-300">
            <Terminal className="w-5 h-5 text-green-400" />
            <span className="font-semibold">Terminal del Bot en Vivo</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-xs text-gray-400 uppercase tracking-wider">Conectado</span>
          </div>
        </div>
        
        <div className="p-4 h-[500px] overflow-y-auto space-y-2">
          {loading ? (
            <div className="text-gray-500 animate-pulse">Cargando logs del servidor...</div>
          ) : logs.length === 0 ? (
            <div className="text-gray-500">No hay registros recientes en la base de datos.</div>
          ) : (
            logs.map(log => (
              <div key={log.id} className={`p-3 rounded-lg border text-sm flex flex-col sm:flex-row sm:items-start gap-3 ${getLevelColor(log.level)}`}>
                <div className="flex items-center gap-2 shrink-0 mt-0.5">
                  {getLevelIcon(log.level)}
                  <span className="font-bold uppercase opacity-80 text-xs w-16">{log.level}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{log.message}</p>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <pre className="mt-2 text-xs opacity-70 bg-black/20 p-2 rounded overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-1 text-xs opacity-60">
                  <Clock className="w-3 h-3" />
                  {new Date(log.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
