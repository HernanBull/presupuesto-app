import React, { useState, useEffect } from 'react';
import { DollarSign, Package, ShoppingCart, TrendingUp, AlertTriangle, ArrowUpRight, Activity } from 'lucide-react';
import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export default function EcommerceDashboard() {
  const [summary, setSummary] = useState({ revenue: 0, orders: 0, aov: 0, products: 0, revenueChange: 0, ordersChange: 0, aovChange: 0, productsChange: 0 });
  const [topSellers, setTopSellers] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const workspaceId = localStorage.getItem('activeWorkspace') || 'default_workspace';
        const [summaryRes, topRes, salesRes] = await Promise.all([
          fetch(`http://localhost:3001/api/ecommerce/analytics/summary?range=${timeRange}&workspaceId=${workspaceId}`),
          fetch(`http://localhost:3001/api/ecommerce/analytics/top-products?range=${timeRange}&workspaceId=${workspaceId}`),
          fetch(`http://localhost:3001/api/ecommerce/analytics/sales-by-date?range=${timeRange}&workspaceId=${workspaceId}`)
        ]);
        
        if (summaryRes.ok) setSummary(await summaryRes.json());
        if (topRes.ok) setTopSellers(await topRes.json());
        if (salesRes.ok) setSalesData(await salesRes.json());
      } catch (error) {
        console.error("Error fetching analytics data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [timeRange]);

  const formatChange = (val) => {
    if (val === undefined || val === null) return '0%';
    if (val > 0) return `+${val.toFixed(1)}%`;
    if (val < 0) return `${val.toFixed(1)}%`;
    return '0%';
  };

  const stats = [
    { title: 'Ventas Totales', value: `$${(summary.revenue || 0).toFixed(2)}`, change: formatChange(summary.revenueChange), icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { title: 'Pedidos', value: (summary.orders || 0).toString(), change: formatChange(summary.ordersChange), icon: ShoppingCart, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-500/10' },
    { title: 'Productos', value: (summary.products || 0).toString(), change: formatChange(summary.productsChange), icon: Package, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    { title: 'Ticket Promedio', value: `$${(summary.aov || 0).toFixed(2)}`, change: formatChange(summary.aovChange), icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 pb-24 md:pb-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Resumen General</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Métricas clave y alertas del rendimiento de tu tienda.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.title}</p>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{stat.value}</h3>
              </div>
              <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                <stat.icon size={20} className={stat.color} />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${stat.change.startsWith('+') ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                {stat.change}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 ml-2 font-medium">vs mes anterior</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Charts & Alerts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* Gráfico principal */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col transition-all">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Ingresos vs Pedidos</h3>
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)} 
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50 cursor-pointer"
            >
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="year">Último año</option>
            </select>
          </div>
          
          <div className="flex-1 min-h-[300px] w-full mt-4">
             {loading ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                 <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                 <p className="text-sm">Analizando datos...</p>
               </div>
             ) : salesData.length === 0 ? (
               <div className="h-full flex items-center justify-center text-slate-400 text-sm">No hay datos en este periodo</div>
             ) : (
               <ResponsiveContainer width="100%" height="100%">
                 <ComposedChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                   <defs>
                     <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                       <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                     </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                   <XAxis dataKey="date" tick={{fontSize: 10, fill: '#64748b'}} tickFormatter={(val) => val.substring(5)} stroke="#334155" tickLine={false} axisLine={false} dy={10} />
                   <YAxis yAxisId="left" tick={{fontSize: 10, fill: '#64748b'}} stroke="#334155" tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                   <YAxis yAxisId="right" orientation="right" tick={{fontSize: 10, fill: '#64748b'}} stroke="#334155" tickLine={false} axisLine={false} hide={true} />
                   <Tooltip 
                     contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid #334155', borderRadius: '12px', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}
                     itemStyle={{ fontWeight: 600 }}
                     cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '3 3' }}
                   />
                   <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '15px' }} iconType="circle" />
                   <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" name="Ingresos ($)" activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }} />
                   <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} name="Pedidos" />
                 </ComposedChart>
               </ResponsiveContainer>
             )}
          </div>
        </div>

        {/* Alertas y Top Sellers */}
        <div className="space-y-6">
          
          {/* Bajo Stock Alert */}
          <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-200 dark:border-amber-500/20 shadow-sm p-5 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
               <AlertTriangle size={64} className="text-amber-500" />
             </div>
             <div className="flex items-start gap-3 relative z-10">
               <div className="p-2 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg shrink-0">
                 <AlertTriangle size={20} />
               </div>
               <div>
                 <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400">Alerta de Inventario</h3>
                 <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1 mb-3">
                   2 productos están por agotarse (menos de 5 unidades).
                 </p>
                 <button className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 px-3 py-1.5 rounded-lg transition-colors">
                   Revisar inventario
                 </button>
               </div>
             </div>
          </div>

          {/* Top Sellers */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4 flex items-center justify-between">
              Top Ventas
              <button className="p-1.5 text-slate-400 hover:text-violet-500 transition-colors">
                <ArrowUpRight size={16} />
              </button>
            </h3>
            
            <div className="space-y-4">
               {loading ? <p className="text-sm text-slate-400">Cargando...</p> : topSellers.map((product, idx) => (
                 <div key={product.id} className="flex items-center gap-3">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                     idx === 0 ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500' : 
                     idx === 1 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500' : 
                     'bg-amber-100 dark:bg-amber-900/30 text-amber-500'
                   }`}>
                     #{idx + 1}
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{product.name}</p>
                     <p className="text-xs text-slate-500 truncate">{product.sales} ventas</p>
                   </div>
                   <div className="text-right shrink-0">
                     <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">${product.revenue.toFixed(2)}</p>
                   </div>
                 </div>
               ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
