import React, { useState, useEffect } from 'react';
import { DollarSign, Package, ShoppingCart, TrendingUp, AlertTriangle, ArrowUpRight, Activity } from 'lucide-react';
import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { supabase } from '../../../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function EcommerceDashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState({ revenue: 0, orders: 0, aov: 0, products: 0, revenueChange: 0, ordersChange: 0, aovChange: 0, productsChange: 0 });
  const [topSellers, setTopSellers] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const workspaceId = localStorage.getItem('activeWorkspace');
        if (!workspaceId) return;

        // Date ranges
        const now = new Date();
        const start = new Date();
        let prevStart = new Date();
        
        if (timeRange === '7d') {
          start.setDate(now.getDate() - 7);
          prevStart.setDate(start.getDate() - 7);
        } else if (timeRange === '30d') {
          start.setDate(now.getDate() - 30);
          prevStart.setDate(start.getDate() - 30);
        } else if (timeRange === 'year') {
          start.setFullYear(now.getFullYear() - 1);
          prevStart.setFullYear(start.getFullYear() - 1);
        }

        const { count: productsCount } = await supabase
          .from('ecommerce_products')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId);

        const { data: currentOrders } = await supabase
          .from('ecommerce_orders_v2')
          .select('*')
          .eq('workspace_id', workspaceId)
          .gte('date', start.toISOString())
          .neq('status', 'Cancelado');

        const { data: prevOrders } = await supabase
          .from('ecommerce_orders_v2')
          .select('*')
          .eq('workspace_id', workspaceId)
          .gte('date', prevStart.toISOString())
          .lt('date', start.toISOString())
          .neq('status', 'Cancelado');

        const curOrders = currentOrders || [];
        const prvOrders = prevOrders || [];
        
        const curRevenue = curOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
        const prvRevenue = prvOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
        
        const curAOV = curOrders.length > 0 ? curRevenue / curOrders.length : 0;
        const prvAOV = prvOrders.length > 0 ? prvRevenue / prvOrders.length : 0;

        const calcChange = (cur, prv) => prv === 0 ? (cur > 0 ? 100 : 0) : ((cur - prv) / prv) * 100;

        setSummary({
          revenue: curRevenue,
          orders: curOrders.length,
          aov: curAOV,
          products: productsCount || 0,
          revenueChange: calcChange(curRevenue, prvRevenue),
          ordersChange: calcChange(curOrders.length, prvOrders.length),
          aovChange: calcChange(curAOV, prvAOV),
          productsChange: 0
        });

        const salesMap = {};
        curOrders.forEach(o => {
          const d = o.date.substring(0, 10);
          if (!salesMap[d]) salesMap[d] = { date: d, revenue: 0, orders: 0 };
          salesMap[d].revenue += Number(o.total) || 0;
          salesMap[d].orders += 1;
        });
        
        const daysToFill = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 365;
        const salesArray = [];
        for (let i = daysToFill - 1; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const dStr = d.toISOString().substring(0, 10);
          salesArray.push(salesMap[dStr] || { date: dStr, revenue: 0, orders: 0 });
        }
        
        if (timeRange === 'year') {
           const monthly = {};
           salesArray.forEach(s => {
             const m = s.date.substring(0, 7);
             if(!monthly[m]) monthly[m] = { date: m, revenue: 0, orders: 0 };
             monthly[m].revenue += s.revenue;
             monthly[m].orders += s.orders;
           });
           setSalesData(Object.values(monthly));
        } else {
           setSalesData(salesArray);
        }

        const productMap = {};
        curOrders.forEach(o => {
          let items = [];
          if (typeof o.items === 'string') {
            try { items = JSON.parse(o.items); } catch(e){}
          } else {
            items = o.items;
          }
          if (Array.isArray(items)) {
            items.forEach(item => {
              if (!productMap[item.id]) productMap[item.id] = { id: item.id, name: item.name || item.id, sales: 0, revenue: 0 };
              productMap[item.id].sales += Number(item.quantity) || 1;
              productMap[item.id].revenue += (Number(item.price) || 0) * (Number(item.quantity) || 1);
            });
          }
        });
        const sortedProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
        setTopSellers(sortedProducts);

        const { data: lowStock } = await supabase
          .from('ecommerce_products')
          .select('id')
          .eq('workspace_id', workspaceId)
          .lte('stock_vitrina', 4)
          .gt('stock', 0);
        
        setLowStockCount(lowStock ? lowStock.length : 0);
        
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 rounded-xl md:rounded-2xl p-3 md:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] md:text-sm font-medium text-slate-500 dark:text-slate-400 leading-tight">{stat.title}</p>
                <h3 className="text-lg md:text-2xl font-bold text-slate-800 dark:text-white mt-1">{stat.value}</h3>
              </div>
              <div className={`p-1.5 md:p-2.5 rounded-lg md:rounded-xl hidden sm:block ${stat.bg}`}>
                <stat.icon size={20} className={stat.color} />
              </div>
            </div>
            <div className="mt-2 md:mt-4 flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
              <span className={`text-[9px] md:text-xs font-bold px-1.5 py-0.5 rounded-md self-start ${stat.change.startsWith('+') ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                {stat.change}
              </span>
              <span className="text-[9px] md:text-xs text-slate-400 dark:text-slate-500 font-medium hidden sm:inline">vs mes anterior</span>
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
          
          <div className="flex-1 min-h-[300px] w-full mt-4 min-w-0 overflow-x-auto overflow-y-hidden scrollbar-hide">
             {loading ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                 <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                 <p className="text-sm">Analizando datos...</p>
               </div>
             ) : salesData.length === 0 ? (
               <div className="h-full flex items-center justify-center text-slate-400 text-sm">No hay datos en este periodo</div>
             ) : (
               <div className="min-w-[600px] h-full">
                 <ResponsiveContainer width="100%" height={300}>
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
               </div>
             )}
          </div>
        </div>

        {/* Alertas y Top Sellers */}
        <div className="space-y-6">
          
          {/* Bajo Stock Alert */}
          {lowStockCount > 0 && (
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
                     {lowStockCount} producto(s) están por agotarse en la vitrina.
                   </p>
                   <button onClick={() => navigate('/inventory')} className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
                     Revisar inventario
                   </button>
                 </div>
               </div>
            </div>
          )}

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
