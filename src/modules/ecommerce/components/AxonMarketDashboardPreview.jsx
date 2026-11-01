import React from 'react';
import { 
  LayoutDashboard, ShoppingBag, ShoppingCart, Settings, LogOut, 
  BarChart3, PackageSearch, Package, Zap, MapPin, Bell, 
  LifeBuoy, Share2, Box, TrendingUp, DollarSign, Activity, 
  Search, ArrowUpRight, CheckCircle2, Clock, Truck
} from 'lucide-react';

export default function AxonMarketDashboardPreview() {
  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, active: true },
    { name: 'Analítica', icon: BarChart3 },
    { name: 'Combos', icon: Package },
    { name: 'Inventario', icon: PackageSearch },
    { name: 'Pedidos', icon: ShoppingCart, badge: '5' },
    { name: 'Soporte', icon: LifeBuoy },
    { name: 'Preparación', icon: Box },
    { name: 'Ofertas Flash', icon: Zap },
    { name: 'Red Social', icon: Share2 },
    { name: 'Notificaciones', icon: Bell, badge: '2' },
    { name: 'Perfil Tienda', icon: Settings },
    { name: 'Ubicación', icon: MapPin },
  ];

  const recentOrders = [
    { id: '#ORD-1082', customer: 'Carlos Mendoza', total: '$24.50', status: 'En preparación', color: 'bg-amber-100 text-amber-800' },
    { id: '#ORD-1081', customer: 'María Fernández', total: '$42.00', status: 'En camino', color: 'bg-blue-100 text-blue-800' },
    { id: '#ORD-1080', customer: 'José Rodríguez', total: '$18.20', status: 'Entregado', color: 'bg-emerald-100 text-emerald-800' },
    { id: '#ORD-1079', customer: 'Valentina Silva', total: '$35.10', status: 'Entregado', color: 'bg-emerald-100 text-emerald-800' },
    { id: '#ORD-1078', customer: 'Andrés Gil', total: '$14.90', status: 'Entregado', color: 'bg-emerald-100 text-emerald-800' },
  ];

  const topProducts = [
    { name: 'Harina de Maíz PAN 1kg', sales: 142, revenue: '$191.70', stock: '48 uds' },
    { name: 'Arroz Mary Tradicional 1kg', sales: 98, revenue: '$142.10', stock: '32 uds' },
    { name: 'Café Fama de América 250g', sales: 86, revenue: '$240.80', stock: '20 uds' },
    { name: 'Queso Blanco Llanero 1kg', sales: 64, revenue: '$416.00', stock: '15 kg' },
    { name: 'Aceite Vegetal Mazeite 1L', sales: 52, revenue: '$166.40', stock: '25 uds' },
  ];

  return (
    <div className="w-full h-full min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-50 flex overflow-hidden font-sans select-none pointer-events-none">
      
      {/* Sidebar Desktop Auténtico de AxonMarket */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-white/5 shrink-0 shadow-lg shadow-slate-200/50">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-amber-400 to-amber-600 p-2 rounded-xl text-black shadow-lg shadow-amber-200">
              <ShoppingBag size={24} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">Mi Tienda</h1>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest">
                Vitrina Activa
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 mt-2">
          {navItems.map((item) => (
            <div
              key={item.name}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                item.active 
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-500 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={16} strokeWidth={item.active ? 2.5 : 2} />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="bg-orange-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-white/5">
          <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs">
            <span className="font-bold text-slate-900 block">Plan Profesional 7 Días</span>
            <span className="text-[11px] text-slate-500">Prueba gratuita en curso</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header Superior Auténtico */}
        <header className="h-16 bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-white/5 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-800 dark:text-white">Panel de Control</span>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-medium text-slate-500">Resumen de Ventas y Pedidos</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>En vivo · Tasa BCV Oficial</span>
            </div>

            <div className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-900 text-slate-500 relative">
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500" />
            </div>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-black text-xs flex items-center justify-center">
                C
              </div>
              <span className="text-xs font-bold text-slate-700 hidden sm:block">Comercio</span>
            </div>
          </div>
        </header>

        {/* Dashboard Body */}
        <main className="flex-1 p-6 md:p-8 overflow-hidden space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Buenas tardes, Comerciante</h2>
              <p className="text-xs text-slate-500 mt-0.5">Resumen de tu operación.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center bg-slate-100 rounded-xl p-1 text-xs font-semibold text-slate-600">
                <span className="px-3 py-1 rounded-lg">Hoy</span>
                <span className="px-3 py-1 rounded-lg">7 días</span>
                <span className="px-3 py-1 rounded-lg bg-slate-900 text-white font-bold shadow-xs">30 días</span>
                <span className="px-3 py-1 rounded-lg">90 días</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5">
                <span>Reporte</span>
              </div>
            </div>
          </div>

          {/* 4 KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">Ventas Totales</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <DollarSign size={16} />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900">$1,840.50</div>
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5 mt-1">
                <TrendingUp size={12} /> +18.4% vs semana previa
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">Pedidos</span>
                <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
                  <ShoppingCart size={16} />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900">42</div>
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5 mt-1">
                <TrendingUp size={12} /> +12.5% recibidos
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">Productos</span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Package size={16} />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900">30</div>
              <span className="text-[11px] font-semibold text-slate-500 mt-1 block">
                Catálogo precargado
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">Ticket Promedio</span>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Activity size={16} />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900">$43.82</div>
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5 mt-1">
                <TrendingUp size={12} /> +5.1% en compras
              </span>
            </div>
          </div>

          {/* Gráfico y Tablas Inferiores */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Gráfico de Ventas */}
            <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-slate-900">Evolución de Ingresos Semanales</span>
                <span className="text-xs text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded-full">USD / Bs</span>
              </div>
              
              {/* SVG Gráfico de Barras y Curva */}
              <div className="h-44 w-full flex items-end justify-between gap-3 pt-6 px-2">
                {[
                  { day: 'Lun', val: 40, amt: '$180' },
                  { day: 'Mar', val: 55, amt: '$240' },
                  { day: 'Mié', val: 70, amt: '$310' },
                  { day: 'Jue', val: 45, amt: '$195' },
                  { day: 'Vie', val: 90, amt: '$420' },
                  { day: 'Sáb', val: 82, amt: '$380' },
                  { day: 'Dom', val: 100, amt: '$510' },
                ].map((col) => (
                  <div key={col.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <span className="text-[10px] font-bold text-slate-400">{col.amt}</span>
                    <div 
                      className="w-full bg-gradient-to-t from-orange-500 to-amber-400 rounded-t-lg transition-all"
                      style={{ height: `${col.val}%` }}
                    />
                    <span className="text-[11px] font-semibold text-slate-600">{col.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pedidos Recientes */}
            <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-slate-900">Últimos Pedidos</span>
                <span className="text-xs text-slate-400 font-medium">5 recientes</span>
              </div>
              <div className="space-y-2.5">
                {recentOrders.map((ord) => (
                  <div key={ord.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-slate-900 block">{ord.id}</span>
                      <span className="text-[11px] text-slate-500">{ord.customer}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-slate-900 block">{ord.total}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${ord.color}`}>
                        {ord.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </main>

      </div>

    </div>
  );
}
