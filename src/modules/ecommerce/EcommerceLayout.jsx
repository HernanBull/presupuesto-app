import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, ShoppingCart, Settings, ArrowLeft, Sun, Moon, Tag, MonitorSmartphone, BarChart3, MessageSquare, PackageSearch, Box, Zap, MapPin, Bell, CheckCheck, LifeBuoy, Menu, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function EcommerceLayout({ theme, toggleTheme }) {
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState('Tienda');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);

  const fetchNotifications = () => {
    const slug = localStorage.getItem('storeSlug');
    if (!slug) return;
    fetch(`http://localhost:3001/api/ecommerce/notifications/${slug}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setNotifications(data);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = (id) => {
    fetch(`http://localhost:3001/api/ecommerce/notifications/${id}/read`, { method: 'PUT' })
      .then(() => fetchNotifications())
      .catch(console.error);
  };

  useEffect(() => {
    const slug = localStorage.getItem('storeSlug');
    if (slug) {
      fetch(`http://localhost:3001/api/workspaces/store/${slug}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.name) setStoreName(data.name);
        })
        .catch(err => console.error("Error fetching store name:", err));
    }
  }, []);

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
    { name: 'Soporte', path: '/ecommerce/support', icon: LifeBuoy },
    { name: 'Preparación', path: '/ecommerce/preparation', icon: Box },
    { name: 'Reseñas', path: '/ecommerce/reviews', icon: MessageSquare },
    { name: 'Promociones', path: '/ecommerce/promotions', icon: Tag },
    { name: 'Ofertas Flash', path: '/ecommerce/offers', icon: Zap },
    { name: 'Notificaciones', path: '/ecommerce/notifications', icon: Bell },
    { name: 'Perfil Tienda', path: '/ecommerce/store-profile', icon: Settings },
    { name: 'Ubicación', path: '/ecommerce/location', icon: MapPin },

  ];

  // Navegación móvil: 4 ítems primarios + botón "Más"
  const primaryNavItems = [
    navItems[0], // Dashboard
    navItems[4], // Pedidos
    navItems[2], // Productos
    navItems[3], // Inventario
  ];
  const secondaryNavItems = navItems.filter((_, i) => ![0, 4, 2, 3].includes(i));

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-50 overflow-hidden font-sans">
      
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-white/5 z-20 shrink-0 shadow-lg shadow-slate-200/50 dark:shadow-none transition-colors">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-amber-400 to-amber-600 p-2 rounded-xl text-black shadow-lg shadow-amber-200 dark:shadow-amber-900/20">
              <ShoppingBag size={24} />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-800 dark:text-white leading-tight tracking-tight line-clamp-1">{storeName}</h1>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest">E-commerce</span>
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
                  ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-500 shadow-sm" 
                  : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <item.icon size={18} strokeWidth={2.5} />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-white/5 space-y-3">
          <button 
            onClick={() => {
              const slug = localStorage.getItem('storeSlug');
              if (slug) window.open(`/ecommerce/live/${slug}`, '_blank');
              else alert('No se encontró el enlace de tu tienda.');
            }}
            className="flex w-full items-center justify-center gap-2 px-4 py-3 bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-500 hover:bg-amber-200 dark:hover:bg-amber-500/20 transition-colors text-sm font-semibold rounded-xl"
          >
            <MonitorSmartphone size={16} /> Ver mi Vitrina
          </button>
          <button 
            onClick={() => {
              localStorage.removeItem('activeWorkspace');
              localStorage.removeItem('storeSlug');
              navigate('/ecommerce/live');
            }}
            className="flex w-full items-center justify-center gap-2 px-4 py-3 bg-slate-100 dark:bg-zinc-900 rounded-xl text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors text-sm font-semibold"
          >
            <ArrowLeft size={16} /> Salir de la tienda
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-white dark:bg-zinc-950 border-b border-slate-200 dark:border-white/5 z-20 shrink-0 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 max-w-[60%]">
          <div className="bg-gradient-to-tr from-amber-400 to-amber-600 p-1.5 rounded-lg text-black shrink-0">
            <ShoppingBag size={20} />
          </div>
          <h1 className="text-base font-extrabold text-slate-800 dark:text-white truncate">{storeName}</h1>
        </div>
        <div className="flex items-center gap-3 relative">
          <button onClick={() => setShowNotifications(!showNotifications)} className="text-slate-400 hover:text-amber-500 p-2 relative">
            <Bell size={18} />
            {notifications.filter(n => !n.is_read).length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            )}
          </button>
          <button onClick={toggleTheme} className="text-slate-400 hover:text-amber-500 p-2">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={() => { localStorage.removeItem('activeWorkspace'); localStorage.removeItem('storeSlug'); navigate('/ecommerce/live'); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2">
            <ArrowLeft size={18} />
          </button>
          
          {showNotifications && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
              <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 dark:text-white">Notificaciones</h3>
                <span className="text-xs font-bold text-amber-500">{notifications.filter(n => !n.is_read).length} nuevas</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 dark:text-zinc-500 text-sm">No tienes notificaciones.</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`p-4 border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer ${n.is_read ? 'opacity-60' : 'bg-amber-50 dark:bg-amber-500/5'}`}
                      onClick={() => {
                        markAsRead(n.id);
                        if(n.product_id) navigate(`/ecommerce/product-studio/${n.product_id}`);
                        setShowNotifications(false);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`text-xs mb-1 ${n.is_read ? 'text-slate-500' : 'text-amber-600 font-bold'}`}>
                            {n.type === 'stock_alert' ? '⚠️ Alerta de Stock' : 'Notificación'}
                          </p>
                          <p className="text-sm text-slate-700 dark:text-zinc-300 leading-tight">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-2 block">{new Date(n.created_at).toLocaleString()}</span>
                        </div>
                        {!n.is_read && (
                          <button onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }} className="text-slate-400 hover:text-amber-500" title="Marcar como leída">
                            <CheckCheck size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
                  </div>
                  <div className="p-3 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-900/50">
                    <button onClick={() => { setShowNotifications(false); navigate('/ecommerce/notifications'); }} className="w-full py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 text-amber-700 dark:text-amber-400 font-bold text-xs rounded-xl transition-colors">
                      Ver todas las notificaciones
                    </button>
                  </div>
                </div>
              )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto w-full custom-scrollbar bg-slate-50 dark:bg-black relative">
        <div className="absolute top-4 right-6 hidden md:flex items-center gap-3 z-50">
           <div className="relative">
             <button onClick={() => setShowNotifications(!showNotifications)} className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 text-slate-400 hover:text-amber-500 shadow-sm transition-colors relative">
                <Bell size={18} />
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                )}
             </button>
             
             {showNotifications && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                  <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 dark:text-white">Notificaciones</h3>
                    <span className="text-xs font-bold text-amber-500">{notifications.filter(n => !n.is_read).length} nuevas</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 dark:text-zinc-500 text-sm">No tienes notificaciones.</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-4 border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer ${n.is_read ? 'opacity-60' : 'bg-amber-50 dark:bg-amber-500/5'}`}
                          onClick={() => {
                            markAsRead(n.id);
                            if(n.product_id) navigate(`/ecommerce/product-studio/${n.product_id}`);
                            setShowNotifications(false);
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className={`text-xs mb-1 ${n.is_read ? 'text-slate-500' : 'text-amber-600 font-bold'}`}>
                                {n.type === 'stock_alert' ? '⚠️ Alerta de Stock' : 'Notificación'}
                              </p>
                              <p className="text-sm text-slate-700 dark:text-zinc-300 leading-tight">{n.message}</p>
                              <span className="text-[10px] text-slate-400 mt-2 block">{new Date(n.created_at).toLocaleString()}</span>
                            </div>
                            {!n.is_read && (
                              <button onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }} className="text-slate-400 hover:text-amber-500" title="Marcar como leída">
                                <CheckCheck size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-3 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-900/50">
                    <button onClick={() => { setShowNotifications(false); navigate('/ecommerce/notifications'); }} className="w-full py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 text-amber-700 dark:text-amber-400 font-bold text-xs rounded-xl transition-colors">
                      Ver todas las notificaciones
                    </button>
                  </div>
                </div>
              )}
           </div>
           
           <button onClick={toggleTheme} className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/5 text-slate-400 hover:text-amber-500 shadow-sm transition-colors">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
           </button>
        </div>
        
        <Outlet />
      </main>

      {/* Mobile Bottom Nav — 4 primary + "Más" */}
      <nav
        className="md:hidden bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-slate-200/50 dark:border-white/5 z-30 shrink-0 shadow-[0_-8px_32px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-around px-1 pt-2">
          {primaryNavItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.exact}
              onClick={() => setShowMoreDrawer(false)}
              className="relative flex flex-col items-center justify-center p-2 transition-all min-w-[4rem] group"
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute inset-0 bg-amber-50 dark:bg-amber-500/10 rounded-2xl -z-10" />
                  )}
                  <div className={cn(
                    "p-1.5 rounded-xl mb-0.5 transition-all duration-200",
                    isActive ? "text-amber-600 dark:text-amber-500 scale-110" : "text-slate-400"
                  )}>
                    <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold tracking-wide transition-colors",
                    isActive ? "text-amber-600 dark:text-amber-500" : "text-slate-400"
                  )}>
                    {item.name}
                  </span>
                </>
              )}
            </NavLink>
          ))}

          {/* Botón "Más" */}
          <button
            onClick={() => setShowMoreDrawer(true)}
            className="relative flex flex-col items-center justify-center p-2 transition-all min-w-[4rem] group active:scale-95"
          >
            <div className="p-1.5 rounded-xl mb-0.5 text-slate-400 group-active:text-amber-500 transition-colors">
              <Menu size={22} strokeWidth={2} />
            </div>
            <span className="text-[10px] font-bold tracking-wide text-slate-400">Más</span>
          </button>
        </div>
      </nav>

      {/* Drawer "Más" — Bottom Sheet Móvil */}
      {showMoreDrawer && (
        <div className="md:hidden fixed inset-0 z-50" onClick={() => setShowMoreDrawer(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Sheet */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-zinc-950 rounded-t-3xl border-t border-slate-200 dark:border-white/5 shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle + header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-tr from-amber-400 to-amber-600 p-1.5 rounded-lg text-black">
                  <ShoppingBag size={18} />
                </div>
                <span className="text-sm font-extrabold text-slate-800 dark:text-white truncate max-w-[160px]">{storeName}</span>
              </div>
              <button
                onClick={() => setShowMoreDrawer(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-100 dark:bg-zinc-900 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-4 pb-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Más opciones</p>
            </div>

            {/* Grid de ítems secundarios */}
            <div className="grid grid-cols-4 gap-2 px-4 py-3">
              {secondaryNavItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  end={item.exact}
                  onClick={() => setShowMoreDrawer(false)}
                  className={({ isActive }) => cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all active:scale-95",
                    isActive
                      ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500"
                      : "text-slate-500 dark:text-zinc-400 active:bg-slate-100 dark:active:bg-zinc-900"
                  )}
                >
                  <item.icon size={22} strokeWidth={2} />
                  <span className="text-[10px] font-bold text-center leading-tight">{item.name}</span>
                </NavLink>
              ))}
            </div>

            {/* Acciones rápidas */}
            <div
              className="px-4 pt-3 border-t border-slate-100 dark:border-white/5 space-y-2"
              style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
            >
              <button
                onClick={() => {
                  const slug = localStorage.getItem('storeSlug');
                  if (slug) window.open(`/ecommerce/live/${slug}`, '_blank');
                  else alert('No se encontró el enlace de tu tienda.');
                  setShowMoreDrawer(false);
                }}
                className="flex w-full items-center justify-center gap-2 px-4 py-3 bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-500 font-semibold text-sm rounded-xl active:bg-amber-200 transition-colors"
              >
                <MonitorSmartphone size={16} /> Ver mi Vitrina
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('activeWorkspace');
                  localStorage.removeItem('storeSlug');
                  navigate('/ecommerce/live');
                }}
                className="flex w-full items-center justify-center gap-2 px-4 py-3 bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 font-semibold text-sm rounded-xl active:bg-slate-200 transition-colors"
              >
                <ArrowLeft size={16} /> Salir de la tienda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
