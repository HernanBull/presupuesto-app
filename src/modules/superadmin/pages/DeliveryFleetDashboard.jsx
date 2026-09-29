import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { 
  Truck, Activity, Users, ShieldAlert, CheckCircle2, 
  XCircle, Clock, Search, AlertTriangle, ShieldBan, X
} from 'lucide-react';

export default function DeliveryFleetDashboard() {
  const [drivers, setDrivers] = useState([]);
  const [activeTrips, setActiveTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();

    // Set up Realtime subscriptions
    const driversSub = supabase
      .channel('drivers-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_drivers' }, payload => {
        fetchData();
      })
      .subscribe();

    const tripsSub = supabase
      .channel('trips-status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_active_trips' }, payload => {
        fetchData();
      })
      .subscribe();

    // Set an interval to update times every minute
    const interval = setInterval(() => {
      setActiveTrips(prev => [...prev]); // force re-render for timers
    }, 60000);

    return () => {
      supabase.removeChannel(driversSub);
      supabase.removeChannel(tripsSub);
      clearInterval(interval);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [driversRes, tripsRes] = await Promise.all([
        supabase.from('delivery_drivers').select('*'),
        supabase.from('delivery_active_trips').select('*')
      ]);
      if (driversRes.data) setDrivers(driversRes.data);
      if (tripsRes.data) setActiveTrips(tripsRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeStatus = async (driverId, newStatus) => {
    try {
      await supabase.from('delivery_drivers').update({ status: newStatus }).eq('id', driverId);
      // realtime will update UI, or we can just call fetchData()
      fetchData();
    } catch (e) {
      alert('Error cambiando estado');
    }
  };

  const handleAbortTrip = async (orderId) => {
    if (!window.confirm('¿Estás seguro de abortar este viaje desde el panel?')) return;
    try {
      const trip = activeTrips.find(t => t.order_id === orderId);
      if (!trip) return;
      await supabase.from('delivery_active_trips').delete().eq('order_id', orderId);
      await supabase.from('delivery_pending_trips').insert([{ 
        order_id: trip.order_id, 
        customer_data: trip.customer_data, 
        delivery_pin: trip.pin 
      }]);
      fetchData();
    } catch (e) {
      alert('Error abortando viaje');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'disponible': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'ocupado': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'accidentado': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default: return 'text-zinc-400 bg-zinc-800 border-white/5';
    }
  };

  const getStatusDot = (status) => {
    switch (status) {
      case 'disponible': return 'bg-emerald-500';
      case 'ocupado': return 'bg-red-500';
      case 'accidentado': return 'bg-amber-500';
      default: return 'bg-zinc-500';
    }
  };

  // Metrics
  const disponiblesCount = drivers.filter(d => d.status === 'disponible').length;
  const ocupadosCount = drivers.filter(d => d.status === 'ocupado').length;
  const inactivosCount = drivers.filter(d => !['disponible', 'ocupado'].includes(d.status)).length;

  const filteredDrivers = drivers.filter(d => 
    (d.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (d.driver_code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-5 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-500"><Users size={64} /></div>
          <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Disponibles
          </h3>
          <p className="text-3xl font-black text-white">{disponiblesCount}</p>
        </div>
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-5 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-red-500"><Truck size={64} /></div>
          <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div> Ocupados
          </h3>
          <p className="text-3xl font-black text-white">{ocupadosCount}</p>
        </div>
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-5 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-amber-500"><AlertTriangle size={64} /></div>
          <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-zinc-500"></div> Inactivos / Desc.
          </h3>
          <p className="text-3xl font-black text-white">{inactivosCount}</p>
        </div>
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-5 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-indigo-500"><Activity size={64} /></div>
          <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div> Viajes en Curso
          </h3>
          <p className="text-3xl font-black text-white">{activeTrips.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Tabla de Repartidores */}
        <div className="lg:col-span-2 bg-zinc-900 border border-white/5 rounded-3xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <Users className="text-red-500" /> Flota Registrada
              </h2>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input 
                type="text" 
                placeholder="Buscar repartidor..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-zinc-950 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-red-500/50 w-full sm:w-64"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Repartidor</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Agencia / Vehículo</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500 text-center">Estado</th>
                  <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map(driver => (
                  <tr key={driver.id} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${driver.banned ? 'opacity-50' : ''}`}>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-white border border-white/10">
                          {(driver.name || '?').charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{driver.name}</p>
                          <p className="text-xs text-zinc-500 font-mono">{driver.driver_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-sm text-white">{driver.agencia || 'Independiente'}</p>
                      <p className="text-xs text-zinc-500">{driver.moto} {driver.placa && `- ${driver.placa}`}</p>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getStatusColor(driver.status || 'descansando')}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(driver.status || 'descansando')}`}></span>
                        {driver.status || 'DESCANSANDO'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <select 
                        value={driver.status || 'descansando'}
                        onChange={(e) => handleChangeStatus(driver.id, e.target.value)}
                        className="bg-zinc-950 border border-white/10 text-white text-xs rounded-lg px-2 py-1.5 outline-none cursor-pointer hover:border-white/20"
                      >
                        <option value="disponible">Disponible</option>
                        <option value="ocupado">Ocupado</option>
                        <option value="accidentado">Accidentado</option>
                        <option value="descansando">Descansando</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {filteredDrivers.length === 0 && (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-zinc-500 text-sm">No se encontraron repartidores</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Columna Derecha: Viajes Activos */}
        <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 flex flex-col h-full">
          <h2 className="text-lg font-bold text-white uppercase tracking-widest flex items-center gap-2 mb-6">
            <Activity className="text-indigo-500" /> Viajes en Curso
          </h2>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[600px]">
            {activeTrips.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 py-10">
                <CheckCircle2 size={40} className="mb-3 opacity-20" />
                <p className="text-sm">Todo tranquilo en las calles.</p>
              </div>
            ) : (
              activeTrips.map(trip => {
                const startTime = new Date(trip.start_time);
                const diffMinutes = Math.floor((new Date() - startTime) / 60000);
                const isDelayed = diffMinutes > 45;
                const driverObj = drivers.find(d => d.id === trip.driver_id);
                
                return (
                  <div key={trip.order_id} className={`p-4 rounded-2xl border relative overflow-hidden ${isDelayed ? 'bg-red-500/10 border-red-500/30' : 'bg-zinc-950 border-white/10'}`}>
                    {isDelayed && (
                      <div className="absolute top-0 right-0 left-0 h-1 bg-red-500 animate-pulse"></div>
                    )}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Pedido</span>
                        <p className="text-white font-mono font-bold">#{trip.order_id}</p>
                      </div>
                      <div className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-lg ${isDelayed ? 'bg-red-500/20 text-red-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                        <Clock size={14} />
                        {diffMinutes} min
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-zinc-300">
                        <Truck size={14} className="text-zinc-500" />
                        <span className="font-medium">{driverObj ? driverObj.name : trip.driver_id}</span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-300">
                        <Users size={14} className="text-zinc-500" />
                        <span className="truncate">{trip.customer_name || 'Cliente'}</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/5 flex justify-end">
                      <button 
                        onClick={() => handleAbortTrip(trip.order_id)}
                        className="text-xs font-bold text-red-400 hover:text-white hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <X size={14} /> Abortar
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
