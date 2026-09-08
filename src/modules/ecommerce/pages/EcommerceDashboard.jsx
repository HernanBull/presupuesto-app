import React from 'react';
import { DollarSign, Package, ShoppingCart, TrendingUp, AlertTriangle, ArrowUpRight } from 'lucide-react';

export default function EcommerceDashboard() {
  const stats = [
    { title: 'Ventas Totales', value: '$12,543.00', change: '+12.5%', icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { title: 'Pedidos', value: '143', change: '+5.2%', icon: ShoppingCart, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-500/10' },
    { title: 'Productos', value: '45', change: '0%', icon: Package, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    { title: 'Conversión', value: '3.2%', change: '+1.1%', icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  ];

  const topSellers = [
    { id: 1, name: 'Camiseta de Algodón Premium', sales: 124, revenue: '$3,718.76', image: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500' },
    { id: 2, name: 'Auriculares Inalámbricos', sales: 89, revenue: '$7,921.00', image: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500' },
    { id: 3, name: 'Mochila de Viaje', sales: 45, revenue: '$2,925.00', image: 'bg-amber-100 dark:bg-amber-900/30 text-amber-500' },
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
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Ventas y Tráfico</h3>
            <select className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50">
              <option>Últimos 7 días</option>
              <option>Este mes</option>
              <option>Este año</option>
            </select>
          </div>
          
          <div className="flex-1 min-h-[250px] flex items-end gap-2 mt-4 relative">
             {/* Mock Chart Columns */}
             {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end group cursor-pointer relative h-full">
                  <div 
                    className="w-full bg-violet-100 dark:bg-violet-900/30 rounded-t-lg transition-all duration-300 group-hover:bg-violet-200 dark:group-hover:bg-violet-900/50 absolute bottom-0"
                    style={{ height: `${h}%` }}
                  >
                    <div 
                      className="w-full bg-violet-600 rounded-t-lg transition-all duration-300 group-hover:bg-violet-500 absolute bottom-0 shadow-[0_0_15px_rgba(124,58,237,0.3)]"
                      style={{ height: `${h * 0.7}%` }}
                    ></div>
                  </div>
                  <div className="absolute -bottom-6 w-full text-center text-[10px] font-bold text-slate-400">
                    D{i+1}
                  </div>
                </div>
             ))}
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
               {topSellers.map((product, idx) => (
                 <div key={product.id} className="flex items-center gap-3">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${product.image}`}>
                     #{idx + 1}
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{product.name}</p>
                     <p className="text-xs text-slate-500 truncate">{product.sales} ventas</p>
                   </div>
                   <div className="text-right shrink-0">
                     <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{product.revenue}</p>
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
