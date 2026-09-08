import React, { useState, useEffect } from 'react';
import { Save, CheckCircle2, Users, IdCard, Truck, User, ShieldBan, ShieldCheck, Phone, Trash2 } from 'lucide-react';

export default function AgencySettings({ session, theme, toggleTheme }) {
  const [groupId, setGroupId] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [saved, setSaved] = useState(false);

  // Al cargar, leemos de localStorage si existe
  const [bannedIds, setBannedIds] = useState([]);

  useEffect(() => {
    const savedGroupId = localStorage.getItem('delivery_master_group_id');
    if (savedGroupId) setGroupId(savedGroupId);
    
    const storedDrivers = JSON.parse(localStorage.getItem('delivery_drivers') || '[]');
    setDrivers(storedDrivers);

    const storedBanned = JSON.parse(localStorage.getItem('banned_drivers') || '[]');
    setBannedIds(storedBanned);
  }, []);

  const handleDriverChange = (id, field, value) => {
    const newDrivers = drivers.map(d => d.id === id ? { ...d, [field]: value } : d);
    setDrivers(newDrivers);
    localStorage.setItem('delivery_drivers', JSON.stringify(newDrivers));
  };

  const handleBanDriver = (id) => {
    if (window.confirm('🚨 ¿Estás seguro de que deseas BANEAR a este conductor?\n\nNo podrá interactuar con el bot ni aceptar viajes bajo ninguna circunstancia.')) {
      // 1. Añadir a la lista negra
      const banned = JSON.parse(localStorage.getItem('banned_drivers') || '[]');
      if (!banned.includes(id)) {
        banned.push(id);
        localStorage.setItem('banned_drivers', JSON.stringify(banned));
        setBannedIds(banned);
      }
      
      // 2. Marcar como baneado en la BD (para no perder sus datos)
      const newDrivers = drivers.map(d => d.id === id ? { ...d, isBanned: true } : d);
      setDrivers(newDrivers);
      localStorage.setItem('delivery_drivers', JSON.stringify(newDrivers));
    }
  };

  const handleUnbanDriver = (id) => {
    if (window.confirm('✅ ¿Deseas LEVANTAR LA SUSPENSIÓN a este conductor?\n\nPodrá volver a recibir notificaciones y aceptar viajes de inmediato.')) {
      // 1. Quitar de la lista negra
      const banned = JSON.parse(localStorage.getItem('banned_drivers') || '[]');
      const newBanned = banned.filter(b => b !== id);
      localStorage.setItem('banned_drivers', JSON.stringify(newBanned));
      setBannedIds(newBanned);
      
      // 2. Quitar marca en la BD
      const newDrivers = drivers.map(d => d.id === id ? { ...d, isBanned: false } : d);
      setDrivers(newDrivers);
      localStorage.setItem('delivery_drivers', JSON.stringify(newDrivers));
    }
  };

  const handleDeleteDriver = (id) => {
    if (window.confirm('🗑️ ¿Deseas eliminar el registro de este conductor?\n\nSus datos se borrarán, pero podrá volver a enviar /registrar en el bot para crear un perfil nuevo.')) {
      const newDrivers = drivers.filter(d => d.id !== id);
      setDrivers(newDrivers);
      localStorage.setItem('delivery_drivers', JSON.stringify(newDrivers));
      
      // Si por casualidad estaba baneado, lo desbaneamos para que pueda registrarse
      const banned = JSON.parse(localStorage.getItem('banned_drivers') || '[]');
      const newBanned = banned.filter(b => b !== id);
      localStorage.setItem('banned_drivers', JSON.stringify(newBanned));
      setBannedIds(newBanned);
    }
  };

  const handleSave = () => {
    localStorage.setItem('delivery_master_group_id', groupId);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Ajustes de Delivery</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          Configura el Grupo de Telegram principal donde se enviarán todas las solicitudes de los comercios.
        </p>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-500">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Grupo Maestro de Repartidores</h2>
              <p className="text-slate-500 text-sm">Todas las peticiones irán a este grupo</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-2">Chat ID del Grupo de Telegram</label>
              <input 
                type="text" 
                value={groupId} 
                onChange={(e) => setGroupId(e.target.value)}
                placeholder="Ej. -1001234567890"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
              />
              <p className="text-xs text-slate-500 mt-2">
                Para obtener el Chat ID, añade tu bot a un grupo y ve a <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code>
              </p>
            </div>

            <button 
              onClick={handleSave}
              disabled={!groupId}
              className={`w-full font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2
                ${groupId 
                  ? 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'}`}
            >
              {saved ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  ¡Guardado Correctamente!
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Guardar Configuración
                </>
              )}
            </button>
          </div>
        </div>

        {/* Base de Datos de Conductores */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm mt-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500">
              <IdCard className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2">Base de Datos de Conductores</h2>
              <p className="text-slate-500 mb-6">Registra los datos de los repartidores para mayor seguridad</p>
            </div>
          </div>

          {drivers.length === 0 && bannedIds.filter(bId => !drivers.some(d => d.id === bId)).length === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-800/50 p-12 rounded-3xl border border-slate-200 dark:border-slate-700 text-center text-slate-500">
              Aún no hay conductores registrados ni suspendidos. Aparecerán aquí cuando interactúen con el bot.
            </div>
          ) : (
            <div className="space-y-6">
              {drivers.map(driver => (
                <div key={driver.id} className={`p-6 rounded-2xl border ${driver.isBanned ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 opacity-80' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 font-bold text-lg">
                      <User className={`w-5 h-5 ${driver.isBanned ? 'text-red-500' : 'text-indigo-500'}`} />
                      <span className={driver.isBanned ? 'line-through text-red-700 dark:text-red-400' : ''}>{driver.name}</span>
                      <span className="text-xs font-normal text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-full ml-2">
                        ID: {driver.driverCode || driver.id}
                      </span>
                      {driver.isBanned && (
                        <span className="text-xs font-bold text-white bg-red-500 px-2 py-1 rounded uppercase animate-pulse ml-2">
                          Baneado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleDeleteDriver(driver.id)}
                        className="text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 p-2 rounded-lg transition-colors flex items-center gap-1 text-sm font-bold"
                        title="Eliminar Registro (Puede volver a registrarse)"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      {driver.isBanned ? (
                        <button 
                          onClick={() => handleUnbanDriver(driver.id)}
                          className="text-red-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 p-2 rounded-lg transition-colors flex items-center gap-1 text-sm font-bold"
                          title="Levantar Suspensión (Desbanear)"
                        >
                          <ShieldCheck className="w-5 h-5" />
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleBanDriver(driver.id)}
                          className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-2 rounded-lg transition-colors flex items-center gap-1 text-sm font-bold"
                          title="Banear Permanente (No puede volver)"
                        >
                          <ShieldBan className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                        <IdCard className="w-3 h-3" /> Cédula
                      </label>
                      <input 
                        type="text" 
                        value={driver.cedula || ''}
                        onChange={(e) => handleDriverChange(driver.id, 'cedula', e.target.value)}
                        placeholder="Ej. 12345678"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> Teléfono
                      </label>
                      <input 
                        type="text" 
                        value={driver.telefono || ''}
                        onChange={(e) => handleDriverChange(driver.id, 'telefono', e.target.value)}
                        placeholder="Ej. 0414-123"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                        <User className="w-3 h-3" /> Edad
                      </label>
                      <input 
                        type="text" 
                        value={driver.age || ''}
                        onChange={(e) => handleDriverChange(driver.id, 'age', e.target.value)}
                        placeholder="Ej. 28"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                        <Truck className="w-3 h-3" /> Vehículo
                      </label>
                      <input 
                        type="text" 
                        value={driver.moto || ''}
                        onChange={(e) => handleDriverChange(driver.id, 'moto', e.target.value)}
                        placeholder="Ej. Yamaha FZ"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Placa</label>
                      <input 
                        type="text" 
                        value={driver.placa || ''}
                        onChange={(e) => handleDriverChange(driver.id, 'placa', e.target.value)}
                        placeholder="Ej. ABC-123"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Agencia</label>
                      <input 
                        type="text" 
                        value={driver.agencia || ''}
                        onChange={(e) => handleDriverChange(driver.id, 'agencia', e.target.value)}
                        placeholder="Ej. MotoYa"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Conductores huérfanos que fueron baneados con la versión anterior */}
              {bannedIds.filter(bId => !drivers.some(d => d.id === bId)).map(orphanId => (
                <div key={orphanId} className="p-6 rounded-2xl border bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 opacity-80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-lg">
                      <User className="w-5 h-5 text-red-500" />
                      <span className="line-through text-red-700 dark:text-red-400">Desconocido (Borrado)</span>
                      <span className="text-xs font-normal text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-full ml-2">
                        ID Telegram: {orphanId}
                      </span>
                      <span className="text-xs font-bold text-white bg-red-500 px-2 py-1 rounded uppercase animate-pulse ml-2">
                        Baneado
                      </span>
                    </div>
                    <button 
                      onClick={() => handleUnbanDriver(orphanId)}
                      className="text-red-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 p-2 rounded-lg transition-colors flex items-center gap-1 text-sm font-bold"
                      title="Levantar Suspensión (Desbanear)"
                    >
                      <ShieldCheck className="w-5 h-5" /> Levantar Suspensión
                    </button>
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                    Este conductor fue baneado y eliminado de la base de datos con la versión anterior del sistema.
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
