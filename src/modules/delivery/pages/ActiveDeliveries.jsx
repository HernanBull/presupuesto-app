import React, { useState, useEffect } from 'react';
import { PackageCheck, Loader2, ArrowLeft, Truck, Clock, Lock, User, IdCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { globalListeners } from '../utils/telegramService';

export default function ActiveDeliveries({ session, theme, toggleTheme }) {
  const [activeOrders, setActiveOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [isListening, setIsListening] = useState(true);

  // Cargar datos de memoria
  useEffect(() => {
    const active = JSON.parse(localStorage.getItem('active_deliveries') || '[]');
    const completed = JSON.parse(localStorage.getItem('completed_deliveries') || '[]');
    
    setActiveOrders(active.map(o => ({...o, time: new Date(o.time)})));
    setCompletedOrders(completed.map(o => ({...o, time: new Date(o.time)})));
  }, []);

  // Escuchar a Telegram
  useEffect(() => {
    const handleUpdate = () => {
      const active = JSON.parse(localStorage.getItem('active_deliveries') || '[]');
      const completed = JSON.parse(localStorage.getItem('completed_deliveries') || '[]');
      
      setActiveOrders(active.map(o => ({...o, time: new Date(o.time)})));
      setCompletedOrders(completed.map(o => ({...o, time: new Date(o.time)})));
    };
    
    const handleComplete = () => {
      handleUpdate();
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play();
      } catch(e) {}
    };

    const handleCancel = (orderId, driverName) => {
      handleUpdate();
      alert(`🚨 ¡ALERTA! El conductor ${driverName} ha ABORTADO el viaje #${orderId}. Se ha vuelto a enviar al grupo maestro automáticamente.`);
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play();
      } catch(e) {}
    };

    globalListeners.onAccept.push(handleUpdate);
    globalListeners.onComplete.push(handleComplete);
    globalListeners.onCancel.push(handleCancel);

    return () => {
      globalListeners.onAccept = globalListeners.onAccept.filter(cb => cb !== handleUpdate);
      globalListeners.onComplete = globalListeners.onComplete.filter(cb => cb !== handleComplete);
      globalListeners.onCancel = globalListeners.onCancel.filter(cb => cb !== handleCancel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 pb-12">
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/delivery" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors mr-2 text-slate-500">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <PackageCheck className="w-6 h-6 text-emerald-500" />
            <span className="font-bold text-lg hidden sm:inline">Panel de Envíos</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-sm font-medium text-slate-500 hidden sm:inline">Sincronizado con Telegram</span>
            </div>
            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Columna: En Camino */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Truck className="w-6 h-6 text-amber-500" />
              <h2 className="text-2xl font-bold">En Camino ({activeOrders.length})</h2>
            </div>
            
            {activeOrders.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center shadow-sm">
                <Clock className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500">No hay pedidos en la calle en este momento.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeOrders.map((order, index) => (
                  <div key={index} className="bg-white dark:bg-slate-900 border-l-4 border-l-amber-500 border-t border-b border-r border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm animate-in fade-in slide-in-from-bottom-4 relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-amber-500/10 rounded-full blur-xl"></div>
                    
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-lg">#{order.orderId}</h3>
                        <p className="text-slate-500 text-sm">Cliente: {order.customerName}</p>
                      </div>
                      <div className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> En Ruta
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 mt-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                          <User className="w-4 h-4" />
                          <span><strong>{order.driverData?.name || order.driverName}</strong></span>
                          {order.driverData?.agencia && order.driverData.agencia !== 'Desconocida' && (
                            <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded font-bold uppercase">
                              {order.driverData.agencia}
                            </span>
                          )}
                          {order.driverData?.driverCode && (
                            <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono text-slate-500">
                              {order.driverData.driverCode}
                            </span>
                          )}
                        </div>
                        {order.pin && (
                          <div className="flex items-center gap-1 text-sm bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md font-mono text-slate-700 dark:text-slate-300">
                            <Lock className="w-3 h-3" />
                            PIN: {order.pin}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <IdCard className="w-3 h-3" /> {order.driverData?.cedula || 'N/A'} {order.driverData?.age ? `(${order.driverData.age} años)` : ''}
                        </div>
                        <div className="flex items-center gap-1">
                          <Truck className="w-3 h-3" /> {order.driverData?.moto || 'N/A'} ({order.driverData?.placa || 'N/A'})
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Columna: Entregados */}
          <section>
            <div className="flex items-center gap-2 mb-6">
              <PackageCheck className="w-6 h-6 text-emerald-500" />
              <h2 className="text-2xl font-bold">Entregados Hoy ({completedOrders.length})</h2>
            </div>
            
            {completedOrders.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center shadow-sm">
                <PackageCheck className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500">Aún no se han completado pedidos hoy.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {completedOrders.map((order, index) => (
                  <div key={index} className="bg-white dark:bg-slate-900 border-l-4 border-l-emerald-500 border-t border-b border-r border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm opacity-80 flex justify-between items-center animate-in fade-in slide-in-from-bottom-4">
                    <div>
                      <h3 className="font-bold text-slate-700 dark:text-slate-300 line-through decoration-emerald-500/50 decoration-2">#{order.orderId}</h3>
                      <p className="text-slate-500 text-sm flex items-center gap-1">
                        Por {order.driverData?.name || order.driverName}
                        {order.driverData?.agencia && order.driverData.agencia !== 'Desconocida' && (
                           <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded font-bold uppercase">
                             {order.driverData.agencia}
                           </span>
                        )}
                        {order.driverData?.driverCode && (
                           <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono text-slate-500">
                             {order.driverData.driverCode}
                           </span>
                        )}
                      </p>
                    </div>
                    <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      {order.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

      </main>
    </div>
  );
}
