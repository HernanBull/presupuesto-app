import React, { useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, ShoppingCart, Settings, ArrowLeft, Sun, Moon, Tag, MonitorSmartphone, BarChart3, MessageSquare, PackageSearch, Box, Wallet } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function EcommerceLayout({ theme, toggleTheme }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const navItems = [
    { name: 'Dashboard', path: '/ecommerce', icon: LayoutDashboard, exact: true },
    { name: 'Analítica', path: '/ecommerce/analytics', icon: BarChart3 },
    { name: 'Productos', path: '/ecommerce/products', icon: ShoppingBag },
    { name: 'Inventario', path: '/ecommerce/inventory', icon: PackageSearch },
    { name: 'Pedidos', path: '/ecommerce/orders', icon: ShoppingCart },
    { name: 'Preparación', path: '/ecommerce/preparation', icon: Box },
    { name: 'Reseñas', path: '/ecommerce/reviews', icon: MessageSquare },
    { name: 'Promociones', path: '/ecommerce/promotions', icon: Tag },
    { name: 'Escaparate', path: '/ecommerce/storefront', icon: MonitorSmartphone },
    { name: 'Carrito', path: '/ecommerce/cart-settings', icon: Wallet },
    { name: 'Ajustes', path: '/ecommerce/settings', icon: Settings },
  ];

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 overflow-hidden font-sans">
      
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-20 shrink-0 shadow-lg shadow-slate-200/50 dark:shadow-none transition-colors">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-violet-600 to-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20">
              <ShoppingBag size={24} />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-800 dark:text-white leading-tight tracking-tight">Tienda</h1>
              <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest">E-commerce</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.exact}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300",
                isActive 
                  ? "bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 shadow-sm" 
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <item.icon size={18} strokeWidth={2.5} />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button 
            onClick={() => navigate('/presupuesto')}
            className="flex w-full items-center justify-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-semibold"
          >
            <ArrowLeft size={16} /> Volver a Presupuestos
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-20 shrink-0 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-tr from-violet-600 to-indigo-600 p-1.5 rounded-lg text-white">
            <ShoppingBag size={20} />
          </div>
          <h1 className="text-base font-extrabold text-slate-800 dark:text-white">E-commerce</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="text-slate-400 hover:text-violet-500 p-2">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={() => navigate('/presupuesto')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2">
            <ArrowLeft size={18} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto w-full custom-scrollbar bg-slate-50 dark:bg-slate-950 relative">
        <div className="absolute top-4 right-6 hidden md:block z-50">
           <button onClick={toggleTheme} className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-violet-500 shadow-sm transition-colors">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
           </button>
        </div>
        
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-800/50 z-30 px-2 pt-2 pb-6 flex items-center justify-around shadow-[0_-10px_40px_rgba(0,0,0,0.04)] shrink-0">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.exact}
            className={({ isActive }) => cn(
              "relative flex flex-col items-center justify-center p-2 transition-all w-20 group",
            )}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute inset-0 bg-violet-50 dark:bg-violet-500/10 rounded-2xl -z-10 animate-in zoom-in-95 duration-200"></div>
                )}
                <div className={cn(
                  "p-1.5 rounded-xl mb-1 transition-all duration-300", 
                  isActive ? "text-violet-600 dark:text-violet-400 scale-110" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                )}>
                  <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={cn(
                  "text-[10px] font-bold tracking-wide transition-colors", 
                  isActive ? "text-violet-600 dark:text-violet-400" : "text-slate-400"
                )}>
                  {item.name}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
