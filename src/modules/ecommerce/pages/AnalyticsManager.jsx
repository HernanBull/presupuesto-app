import React, { useState, useMemo, useEffect } from 'react';
import { BarChart3, PieChart, ShoppingCart, Mail, Activity, ArrowRight, CheckCircle2, RotateCcw, CalendarDays } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// Datos iniciales
const initialCarts = [
  { id: 'CART-982', user: 'carlos@example.com', total: 145.50, time: 'Hace 2 horas', status: 'Pendiente' },
  { id: 'CART-983', user: 'laura.m@example.com', total: 89.99, time: 'Hace 5 horas', status: 'Email Enviado' },
  { id: 'CART-984', user: 'miguel.g@example.com', total: 320.00, time: 'Hace 1 día', status: 'Recuperado' },
  { id: 'CART-985', user: 'andres.f@example.com', total: 45.00, time: 'Hace 2 días', status: 'Pendiente' },
  { id: 'CART-986', user: 'sofia.v@example.com', total: 210.00, time: 'Hace 3 días', status: 'Email Enviado' },
];

// Simulador de datos para el embudo según el rango de fechas
const dataSets = {
  '7days': { visitors: 3500, traffic: { org: 40, soc: 45, dir: 15 } },
  '30days': { visitors: 12500, traffic: { org: 45, soc: 35, dir: 20 } },
  'year': { visitors: 154000, traffic: { org: 55, soc: 25, dir: 20 } },
};

export default function AnalyticsManager() {
  const [carts, setCarts] = useState(initialCarts);
  const [timeRange, setTimeRange] = useState('30days');
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3001/api/ecommerce/analytics/sales-by-date')
      .then(res => res.json())
      .then(data => {
        setSalesData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // Cálculos dinámicos del carrito abandonado
  const { lostRevenue, recoveredRevenue } = useMemo(() => {
    return carts.reduce((acc, cart) => {
      if (cart.status === 'Recuperado') {
        acc.recoveredRevenue += cart.total;
      } else {
        acc.lostRevenue += cart.total;
      }
      return acc;
    }, { lostRevenue: 0, recoveredRevenue: 0 });
  }, [carts]);

  // Acciones funcionales
  const handleSendPromo = (id) => {
    // Simula el envío de un correo y actualiza el estado
    alert(`Enviando correo con 10% de descuento automático a ${carts.find(c => c.id === id)?.user}...`);
    setCarts(carts.map(cart => cart.id === id ? { ...cart, status: 'Email Enviado' } : cart));
  };

  const handleSimulateRecovery = (id) => {
    // Convierte un carrito perdido en una venta exitosa
    setCarts(carts.map(cart => cart.id === id ? { ...cart, status: 'Recuperado' } : cart));
  };

  // Cálculos dinámicos del embudo (simulando tasas de conversión fijas)
  const currentData = dataSets[timeRange];
  const visitors = currentData.visitors;
  const addedToCart = Math.floor(visitors * 0.25); // 25% añaden al carrito
  const checkoutStarted = Math.floor(addedToCart * 0.40); // 40% de los carritos inician pago
  const purchases = Math.floor(checkoutStarted * 0.55); // 55% de los que inician terminan comprando

  // Tasas para la UI
  const rateAddToCart = ((addedToCart / visitors) * 100).toFixed(1);
  const rateCheckout = ((checkoutStarted / addedToCart) * 100).toFixed(1);
  const ratePurchase = ((purchases / checkoutStarted) * 100).toFixed(1);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Analítica Avanzada</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Métricas de conversión y recuperación de ventas.</p>
        </div>
        
        <select 
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 shadow-sm"
        >
          <option value="7days">Últimos 7 días</option>
          <option value="30days">Últimos 30 días</option>
          <option value="year">Este año</option>
        </select>
      </div>

      {/* Conversion Funnel */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 relative overflow-hidden transition-all duration-300">
        <div className="flex items-center gap-3 mb-8 relative z-10">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <Activity size={20} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Embudo de Conversión</h3>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0 relative z-10">
          <div className="w-full md:w-1/4 text-center">
            <div className="h-24 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center border-b-4 border-indigo-500 mx-4 transition-all duration-500">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{visitors.toLocaleString()}</span>
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-3">Visitantes</p>
          </div>
          
          <ArrowRight className="hidden md:block text-slate-300 dark:text-slate-700" />
          
          <div className="w-full md:w-1/4 text-center">
            <div className="h-20 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center border-b-4 border-blue-500 mx-8 transition-all duration-500">
              <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{addedToCart.toLocaleString()}</span>
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-3">Añadieron al Carrito</p>
            <p className="text-[10px] font-bold text-emerald-500">{rateAddToCart}% de retención</p>
          </div>

          <ArrowRight className="hidden md:block text-slate-300 dark:text-slate-700" />

          <div className="w-full md:w-1/4 text-center">
            <div className="h-16 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center border-b-4 border-violet-500 mx-12 transition-all duration-500">
              <span className="text-2xl font-black text-violet-600 dark:text-violet-400">{checkoutStarted.toLocaleString()}</span>
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-3">Iniciaron Pago</p>
            <p className="text-[10px] font-bold text-emerald-500">{rateCheckout}% de retención</p>
          </div>

          <ArrowRight className="hidden md:block text-slate-300 dark:text-slate-700" />

          <div className="w-full md:w-1/4 text-center">
            <div className="h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center border-b-4 border-emerald-500 mx-16 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all duration-500">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{purchases.toLocaleString()}</span>
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-3">Compras</p>
            <p className="text-[10px] font-bold text-emerald-500">{ratePurchase}% de retención</p>
          </div>
        </div>
      </section>

      {/* Calendario y Tendencias de Ventas */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 relative overflow-hidden">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-lg">
            <CalendarDays size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Calendario y Tendencias de Ventas</h3>
            <p className="text-xs text-slate-500">Visualiza patrones de ventas diarias de forma profesional.</p>
          </div>
        </div>

        <div className="w-full h-[300px]">
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400">Cargando analítica...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="date" tick={{fontSize: 12}} tickFormatter={(val) => val.substring(5)} stroke="#94a3b8" />
                <YAxis tick={{fontSize: 12}} stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#a78bfa' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={3} activeDot={{ r: 8 }} name="Ingresos ($)" />
                <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={3} name="Pedidos" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Abandoned Carts */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg">
                <ShoppingCart size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Carritos Abandonados</h3>
            </div>
            
            <div className="flex gap-2">
               <div className="flex flex-col items-end">
                 <span className="text-xs text-slate-500">Recuperado</span>
                 <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">${recoveredRevenue.toFixed(2)}</span>
               </div>
               <div className="w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>
               <div className="flex flex-col items-end">
                 <span className="text-xs text-slate-500">En riesgo</span>
                 <span className="text-sm font-bold text-rose-600 dark:text-rose-400">${lostRevenue.toFixed(2)}</span>
               </div>
            </div>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar max-h-[350px] pr-2">
            {carts.map((cart) => (
              <div key={cart.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50 hover:border-violet-300 dark:hover:border-violet-700 transition-colors gap-4 sm:gap-0">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    {cart.user}
                    {cart.status === 'Recuperado' && <CheckCircle2 size={14} className="text-emerald-500" />}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {cart.time} • 
                    <span className={`ml-1 font-semibold ${
                      cart.status === 'Recuperado' ? 'text-emerald-600 dark:text-emerald-400' :
                      cart.status === 'Email Enviado' ? 'text-blue-600 dark:text-blue-400' : 
                      'text-rose-600 dark:text-rose-400'
                    }`}>
                      {cart.status}
                    </span>
                  </p>
                </div>
                
                <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2">
                  <span className={`text-sm font-bold ${cart.status === 'Recuperado' ? 'text-emerald-600 dark:text-emerald-400 line-through opacity-70' : 'text-slate-800 dark:text-white'}`}>
                    ${cart.total.toFixed(2)}
                  </span>
                  
                  <div className="flex gap-1.5">
                    {cart.status === 'Pendiente' && (
                      <button 
                        onClick={() => handleSendPromo(cart.id)}
                        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1.5 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        <Mail size={12} /> Promoción
                      </button>
                    )}
                    
                    {(cart.status === 'Pendiente' || cart.status === 'Email Enviado') && (
                       <button 
                         onClick={() => handleSimulateRecovery(cart.id)}
                         className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-1.5 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                         title="Simular que el cliente finalizó la compra"
                       >
                         <RotateCcw size={12} /> Rescatar
                       </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Traffic Sources */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
              <PieChart size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Fuentes de Tráfico</h3>
          </div>

          <div className="space-y-8">
             <div className="space-y-2">
               <div className="flex justify-between text-sm">
                 <span className="font-bold text-slate-700 dark:text-slate-300">Búsqueda Orgánica (Google)</span>
                 <span className="font-bold text-slate-900 dark:text-white">{currentData.traffic.org}%</span>
               </div>
               <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                 <div className="bg-emerald-500 h-full transition-all duration-1000 ease-out" style={{ width: `${currentData.traffic.org}%` }}></div>
               </div>
             </div>
             
             <div className="space-y-2">
               <div className="flex justify-between text-sm">
                 <span className="font-bold text-slate-700 dark:text-slate-300">Redes Sociales (Instagram/FB)</span>
                 <span className="font-bold text-slate-900 dark:text-white">{currentData.traffic.soc}%</span>
               </div>
               <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                 <div className="bg-blue-500 h-full transition-all duration-1000 ease-out" style={{ width: `${currentData.traffic.soc}%` }}></div>
               </div>
             </div>

             <div className="space-y-2">
               <div className="flex justify-between text-sm">
                 <span className="font-bold text-slate-700 dark:text-slate-300">Directo / Referidos</span>
                 <span className="font-bold text-slate-900 dark:text-white">{currentData.traffic.dir}%</span>
               </div>
               <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                 <div className="bg-violet-500 h-full transition-all duration-1000 ease-out" style={{ width: `${currentData.traffic.dir}%` }}></div>
               </div>
             </div>
          </div>
        </section>
      </div>
    </div>
  );
}
