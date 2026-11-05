import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  ShoppingBag, ShoppingCart, Settings, ArrowLeft, LogOut, 
  Sun, Moon, Tag, BarChart3, PackageSearch, 
  Box, Zap, Bell, CheckCheck, Menu, X, ShieldAlert, 
  Share2, ExternalLink, Search, Rocket, ChevronDown, ChevronUp,
  Building2, Users, Gift, LayoutGrid, ArrowUpDown, CreditCard,
  Store, Globe, MonitorSmartphone, DollarSign, Layers,
  Receipt, RotateCcw, Award, CheckSquare, Sparkles, FolderTree,
  FileSpreadsheet, Database, TrendingUp, UserCheck, MessageSquare,
  HelpCircle, ChevronRight, Calculator, PlayCircle, Home, ClipboardList,
  Clock, RefreshCw, ShieldCheck
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../../supabaseClient';
import SubscriptionPaymentModal from './components/SubscriptionPaymentModal';
import UserManagementModal from './components/admin/UserManagementModal';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function EcommerceLayout({ theme, toggleTheme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [storeName, setStoreName] = useState(() => localStorage.getItem('merchant_store_name') || 'Mi Comercio');
  const [storeLogo, setStoreLogo] = useState(() => localStorage.getItem('merchant_store_logo') || '');
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  // Estados de acordeón para submenús desplegables estilo Commercy (Image 4)
  const [openMenus, setOpenMenus] = useState({
    ventas: true,       // Abierto por defecto
    inventario: true,   // Abierto por defecto
    clientes: false
  });

  const toggleSubmenu = (menuKey) => {
    setOpenMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  // Detección de Rol y Modo Cajero para Terminal Exclusiva
  const [activeUserRole, setActiveUserRole] = useState(() => {
    return localStorage.getItem('axonpos_active_user_role') || 'MASTER';
  });
  const [activeUserName, setActiveUserName] = useState(() => {
    return localStorage.getItem('axonpos_active_user_name') || '';
  });
  const isCashier = activeUserRole === 'CASHIER' || localStorage.getItem('axon_cashier_mode') === 'true';
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

  // Escuchar cambios de sesión y modo cajero
  useEffect(() => {
    const syncRole = () => {
      setActiveUserRole(localStorage.getItem('axonpos_active_user_role') || 'MASTER');
      setActiveUserName(localStorage.getItem('axonpos_active_user_name') || '');
    };
    window.addEventListener('storage', syncRole);
    return () => window.removeEventListener('storage', syncRole);
  }, []);

  // Consultar pedidos pendientes para la terminal
  useEffect(() => {
    const fetchPendingOrders = async () => {
      try {
        const workspaceId = localStorage.getItem('activeWorkspace') || 'default_workspace';
        const { count, error } = await supabase
          .from('ecommerce_orders_v2')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId)
          .in('status', ['Pendiente', 'Preparando']);
        
        if (!error && typeof count === 'number') {
          setPendingOrdersCount(count);
        }
      } catch (e) {}
    };

    fetchPendingOrders();
    const interval = setInterval(fetchPendingOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  // Bloqueo estricto de rutas administrativas para Cajero (Solo POS, Pedidos y Turno)
  useEffect(() => {
    if (isCashier) {
      const allowedPaths = ['/pos', '/orders', '/shifts'];
      if (!allowedPaths.includes(location.pathname)) {
        navigate('/pos?view=pos', { replace: true });
      }
    }
  }, [isCashier, location.pathname, navigate]);

  // Auto-expandir el menú correspondiente a la ruta actual
  useEffect(() => {
    const path = location.pathname;
    if (['/orders', '/invoicing', '/returns', '/pos', '/shifts', '/coupons', '/cash-master', '/caja-maestra'].includes(path)) {
      setOpenMenus(prev => ({ ...prev, ventas: true }));
    } else if (['/inventory', '/stock', '/combos', '/categories', '/products', '/offers', '/prices', '/goods-receipt'].includes(path)) {
      setOpenMenus(prev => ({ ...prev, inventario: true }));
    } else if (['/leads', '/customers', '/abandoned-carts', '/campaigns', '/audiences', '/credits'].includes(path)) {
      setOpenMenus(prev => ({ ...prev, clientes: true }));
    }
  }, [location.pathname]);

  const handleLogout = () => {
    if (window.confirm('¿Deseas cerrar sesión de tu tienda?')) {
      localStorage.removeItem('activeWorkspace');
      localStorage.removeItem('storeSlug');
      navigate('/merchant/login');
    }
  };

  const fetchNotifications = async () => {
    const slug = localStorage.getItem('storeSlug');
    const wsId = localStorage.getItem('activeWorkspace');
    if (!slug && !wsId) return;
    
    try {
      let apiNotifs = [];
      if (slug) {
        try {
          const res = await fetch(`https://axonmarket-api.onrender.com/api/ecommerce/notifications/${slug}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) apiNotifs = data;
          }
        } catch (e) { console.error("Error fetching API notifs", e); }
      }
      
      let virtualNotifs = [];
      if (wsId) {
        const { data: lowStock } = await supabase
          .from('ecommerce_products')
          .select('id, name, stock, stock_vitrina')
          .eq('workspace_id', wsId)
          .lte('stock_vitrina', 4)
          .gt('stock', 0)
          .in('publish_status', ['Activo', 'Publicado']);
          
        if (lowStock && lowStock.length > 0) {
          const readIds = JSON.parse(localStorage.getItem(`read_notifs_${wsId}`) || '[]');
          const dismissedIds = JSON.parse(localStorage.getItem(`dismissed_notifs_${wsId}`) || '[]');

          virtualNotifs = lowStock
            .filter(p => !dismissedIds.includes('virtual-stock-' + p.id))
            .map(p => ({
              id: 'virtual-stock-' + p.id,
              product_id: p.id,
              is_read: readIds.includes('virtual-stock-' + p.id),
              type: 'stock_alert',
              message: `¡Vitrina vaciándose! Quedan ${p.stock_vitrina || 0} uds de "${p.name}". Tienes ${p.stock} uds en el depósito.`,
              created_at: new Date().toISOString()
            }));
        }
      }
      
      setNotifications([...virtualNotifs, ...apiNotifs]);
    } catch(e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    const handleUpdate = () => fetchNotifications();
    window.addEventListener('notifications_updated', handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('notifications_updated', handleUpdate);
    };
  }, []);

  const markAsRead = async (id) => {
    const wsId = localStorage.getItem('activeWorkspace');
    if (typeof id === 'string' && id.startsWith('virtual-stock-')) {
      if (wsId) {
        const readIds = JSON.parse(localStorage.getItem(`read_notifs_${wsId}`) || '[]');
        if (!readIds.includes(id)) {
          readIds.push(id);
          localStorage.setItem(`read_notifs_${wsId}`, JSON.stringify(readIds));
        }
      }
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      window.dispatchEvent(new Event('notifications_updated'));
      return;
    }

    try {
      await fetch(`https://axonmarket-api.onrender.com/api/ecommerce/notifications/${id}/read`, { method: 'PUT' });
      try {
        await supabase.from('ecommerce_notifications').update({ is_read: 1 }).eq('id', id);
      } catch(e){}
    } catch(e) {
      console.error(e);
    }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    window.dispatchEvent(new Event('notifications_updated'));
  };

  const [workspaceStatus, setWorkspaceStatus] = useState(null);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(7);
  const [isTrialExpired, setIsTrialExpired] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);

  useEffect(() => {
    const wsId = localStorage.getItem('activeWorkspace');
    if (wsId) {
      supabase.from('workspaces').select('name, store_slug, status, config, created_at').eq('id', wsId).maybeSingle()
        .then(({ data, error }) => {
          if (!error && data) {
            const rawName = data.name || localStorage.getItem('merchant_store_name') || 'Mi Comercio';
            setStoreName(rawName);
            setWorkspaceStatus(data.status || 'Activo');
            if (data.store_slug) localStorage.setItem('storeSlug', data.store_slug);
            if (data.name) localStorage.setItem('merchant_store_name', data.name);

            const rawLogo = data.config?.logoUrl || data.config?.storefront?.logoUrl || '';
            if (rawLogo) {
              setStoreLogo(rawLogo);
              localStorage.setItem('merchant_store_logo', rawLogo);
            }

            // Verificar si el período de prueba de 7 días ya culminó
            const trialEndStr = data.config?.trialEndsAt;
            if (trialEndStr) {
              const diffDays = Math.ceil((new Date(trialEndStr) - new Date()) / (1000 * 60 * 60 * 24));
              setTrialDaysRemaining(Math.max(0, diffDays));
              if (diffDays <= 0 && data.status !== 'Activo') {
                setIsTrialExpired(true);
              }
            } else if (data.created_at) {
              const end = new Date(new Date(data.created_at).getTime() + 7 * 24 * 60 * 60 * 1000);
              const diffDays = Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24));
              setTrialDaysRemaining(Math.max(0, diffDays));
              if (diffDays <= 0 && data.status !== 'Activo') {
                setIsTrialExpired(true);
              }
            }
          }
        })
        .catch(err => console.error("Error fetching store info:", err));
    }
  }, []);

  // Atajo de teclado global Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Estructura simplificada y sin duplicados para el comerciante
  const menuSections = [
    {
      id: 'dashboard',
      name: 'Estadísticas',
      path: '/dashboard',
      icon: BarChart3
    },
    {
      id: 'ventas',
      name: 'Ventas',
      icon: ShoppingCart,
      isDropdown: true,
      items: [
        { name: 'Órdenes', path: '/orders' },
        { name: 'POS Kiosco', path: '/pos', isPos: true },
        { name: 'Caja Maestra', path: '/cash-master', badge: 'Global' },
        { name: 'Caja & Turnos', path: '/shifts' },
      ]
    },
    {
      id: 'inventario',
      name: 'Inventario',
      icon: PackageSearch,
      isDropdown: true,
      items: [
        { name: 'Inventario General', path: '/inventory' },
        { name: 'Combos, Paquetes & Categorías', path: '/combos' },
        { name: 'Ofertas Flash', path: '/offers' },
      ]
    },
    {
      id: 'clientes',
      name: 'Clientes',
      icon: Users,
      isDropdown: true,
      items: [
        { name: 'Clientes', path: '/customers' },
        { name: 'Carritos Abandonados', path: '/abandoned-carts' },
      ]
    },
    {
      id: 'tareas',
      name: 'Tareas',
      path: '/preparation',
      icon: Box
    }
  ];

  const isSubItemActive = (subPath, currentPath) => {
    if (currentPath === subPath) return true;
    if (subPath === '/cash-master' && (currentPath === '/cash-master' || currentPath === '/caja-maestra')) return true;
    if (subPath === '/combos' && (currentPath === '/categories' || currentPath === '/products')) return true;
    if (subPath === '/inventory' && (currentPath === '/stock' || currentPath === '/prices' || currentPath === '/goods-receipt')) return true;
    if (subPath === '/orders' && currentPath === '/returns') return true;
    if (subPath === '/customers' && (currentPath === '/leads' || currentPath === '/audiences')) return true;
    if (subPath === '/pos' && currentPath === '/invoicing') return true;
    return false;
  };

  // Filtro en vivo para la barra de búsqueda ⌘K
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return menuSections;
    const q = searchQuery.toLowerCase().trim();
    return menuSections
      .map(sec => {
        if (sec.isDropdown) {
          const matchingItems = sec.items.filter(sub => sub.name.toLowerCase().includes(q));
          if (matchingItems.length > 0 || sec.name.toLowerCase().includes(q)) {
            return {
              ...sec,
              items: matchingItems.length > 0 ? matchingItems : sec.items,
              forceOpen: true
            };
          }
          return null;
        } else {
          return sec.name.toLowerCase().includes(q) ? sec : null;
        }
      })
      .filter(Boolean);
  }, [searchQuery, menuSections]);

  // Enlaces secundarios inferiores
  const bottomUtilityItems = [
    { name: 'Sucursales', path: '/location', icon: Building2 },
    { name: 'Notificaciones', path: '/notifications', icon: Bell },
    { name: 'Chat', path: '/support', icon: MessageSquare },
    { 
      name: 'Personal & Usuarios', 
      icon: Users, 
      onClick: () => setIsUserManagementModalOpen(true),
      badge: 'Maestro'
    },
    { name: 'Configuración', path: '/store-profile', icon: Settings },
  ];

  const handleOpenVitrina = () => {
    const slug = localStorage.getItem('storeSlug');
    if (slug) window.open(`/${slug}`, '_blank');
    else alert('No se encontró el enlace de tu tienda.');
  };

  if (isTrialExpired && workspaceStatus !== 'Activo' && workspaceStatus !== 'Pago_En_Revision') {
    return (
      <div className="min-h-screen h-[100dvh] flex flex-col bg-gradient-to-b from-slate-900 via-zinc-950 to-black text-white font-sans items-center justify-center p-4 sm:p-6 text-center">
        <div className="max-w-md w-full bg-zinc-900 border border-orange-500/30 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl shadow-orange-500/10 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/40 text-orange-500 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <ShieldAlert size={34} />
          </div>
          <span className="text-[11px] font-black uppercase tracking-wider text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
            Período de Prueba Finalizado
          </span>
          <h2 className="text-2xl font-black text-white mt-3 mb-2 tracking-tight">
            Renueva tu Acceso a AxonMarket
          </h2>
          <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
            Tus 7 días de prueba gratuita han culminado. Para continuar operando tu POS, emitiendo comprobantes y vendiendo en línea, realiza tu pago móvil BNC.
          </p>
          <div className="bg-zinc-800/80 border border-white/10 rounded-2xl p-4 mb-6 text-left space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Banco:</span>
              <span className="font-bold text-white">0191 - BNC</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">RIF Jurídico:</span>
              <span className="font-bold text-orange-400 font-mono">J-50805614</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Teléfono:</span>
              <span className="font-bold text-white font-mono">04243592392</span>
            </div>
          </div>
          <button 
            onClick={() => setIsSubscriptionModalOpen(true)}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black py-3.5 rounded-2xl transition-all text-xs uppercase tracking-wider shadow-lg shadow-orange-500/25 active:scale-98 cursor-pointer"
          >
            Pagar y Reportar Referencia Bancaria
          </button>
        </div>

        <SubscriptionPaymentModal 
          isOpen={isSubscriptionModalOpen} 
          onClose={() => setIsSubscriptionModalOpen(false)}
          storeInfo={{ name: storeName }}
          onPaymentReported={() => {
            setWorkspaceStatus('Pago_En_Revision');
            setIsTrialExpired(false);
          }}
        />
      </div>
    );
  }

  if (workspaceStatus === 'Pago_En_Revision') {
    return (
      <div className="min-h-screen h-[100dvh] flex flex-col bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900 font-sans items-center justify-center p-4 sm:p-6 text-center">
        <div className="max-w-md w-full bg-white border border-slate-200/90 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200/60 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-600 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Clock size={32} />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">
            Pago en Verificación
          </h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Hemos recibido el comprobante de tu pago móvil. Nuestro equipo de administración verificará la referencia en el BNC para activar tus 30 días de servicio en breve.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-2xl transition-all text-sm flex items-center justify-center gap-2 shadow-md shadow-slate-900/10 active:scale-98 cursor-pointer"
          >
            <RefreshCw size={16} /> Comprobar Estado
          </button>
        </div>
      </div>
    );
  }

  if (workspaceStatus === 'Pendiente') {
    return (
      <div className="min-h-screen h-[100dvh] flex flex-col bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900 font-sans items-center justify-center p-4 sm:p-6 text-center">
        <div className="max-w-md w-full bg-white border border-slate-200/90 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200/60 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200/70 text-orange-600 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-3 tracking-tight">
            Cuenta en Revisión
          </h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Tu tienda ha sido pre-registrada con éxito. Para proteger la seguridad de nuestros clientes, un representante de AxonMarket verificará tu negocio y procesará tu suscripción.
          </p>
          <div className="bg-orange-50/70 border border-orange-200/60 rounded-2xl p-4 mb-6 text-left flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 shrink-0" />
            <p className="text-xs text-orange-950 leading-relaxed font-medium">
              Nos pondremos en contacto contigo pronto por correo o teléfono para activar tu vitrina oficial.
            </p>
          </div>
          <button 
            onClick={() => { localStorage.removeItem('activeWorkspace'); localStorage.removeItem('storeSlug'); navigate('/'); }}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-2xl transition-all text-sm flex items-center justify-center gap-2 shadow-md shadow-slate-900/10 active:scale-98"
          >
            <ArrowLeft size={16} /> Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  const isPosRoute = location.pathname === '/pos';

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row bg-[#f4f7fb] dark:bg-black text-slate-900 dark:text-slate-50 overflow-hidden font-sans">
      
      {/* ========================================================
          SIDEBAR COMMERCY ULTRA-COMPACTO (IMAGEN 1) EN MODO POS
          ======================================================== */}
      {isPosRoute ? (
        <aside className="hidden md:flex flex-col items-center justify-between w-20 bg-white dark:bg-zinc-900 border-r border-slate-200/80 dark:border-white/10 z-30 shrink-0 select-none py-4 font-sans shadow-xs h-screen">
          
          {/* 1. Top: Logo Oficial AxonMarket + Indicador de Estado de Caja */}
          <div className="flex flex-col items-center gap-1.5 w-full">
            <div 
              onClick={() => {
                if (!isCashier) navigate('/dashboard');
              }}
              title={isCashier ? "Estación de Caja Activa" : "AxonMarket · Volver al Panel de Control"}
              className="w-12 h-12 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all select-none"
            >
              <img 
                src="/axonmarket-logo-icon.png" 
                alt="AxonMarket" 
                className="w-full h-full object-contain rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement.querySelector('.fallback-logo');
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div className="fallback-logo hidden w-full h-full rounded-2xl bg-[#ea580c] items-center justify-center text-white shadow-sm">
                <Store size={22} className="text-white" />
              </div>
            </div>

            {/* Indicador de Caja Abierta */}
            <div className="flex items-center gap-1 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-300">
                {isCashier ? (activeUserName ? activeUserName.split(' ')[0] : 'Caja') : 'Caja'}
              </span>
            </div>
          </div>

          {/* 2. Middle: Botones Principales Centrados Verticalmente (Vender, Pedidos, Caja Única) */}
          {(() => {
            const searchParams = new URLSearchParams(location.search);
            const currentView = searchParams.get('view') || 'pos';

            return (
              <div className="flex flex-col items-center justify-center gap-3 w-full px-2 my-auto">
                {/* Vender (Mostrador POS) */}
                <button
                  onClick={() => navigate('/pos?view=pos')}
                  title="Vender · Mostrador POS"
                  className={`w-full py-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    currentView === 'pos'
                      ? 'bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 font-bold border border-orange-200/80 shadow-xs'
                      : 'text-slate-500 hover:text-orange-600 hover:bg-orange-50/50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className={`p-1.5 rounded-xl ${currentView === 'pos' ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-600 dark:text-zinc-400'}`}>
                    <Calculator size={20} strokeWidth={2.2} />
                  </div>
                  <span className={`text-[11px] font-bold ${currentView === 'pos' ? 'text-orange-600 dark:text-orange-400' : 'text-slate-600 dark:text-zinc-300'}`}>
                    Vender
                  </span>
                </button>

                {/* Pedidos (Tablero Kanban de Pedidos) */}
                <button
                  onClick={() => navigate('/pos?view=orders')}
                  title="Pedidos y Entregas"
                  className={`w-full py-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group relative ${
                    currentView === 'orders'
                      ? 'bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 font-bold border border-orange-200/80 shadow-xs'
                      : 'text-slate-500 hover:text-orange-600 hover:bg-orange-50/50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Receipt size={20} className={currentView === 'orders' ? 'text-orange-600 dark:text-orange-400' : 'group-hover:scale-110 group-hover:text-orange-600 transition-transform text-slate-600 dark:text-zinc-400'} />
                  {pendingOrdersCount > 0 && (
                    <span className="absolute top-2 right-3 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                      {pendingOrdersCount}
                    </span>
                  )}
                  <span className={`text-[11px] font-bold ${currentView === 'orders' ? 'text-orange-600 dark:text-orange-400' : 'text-slate-600 dark:text-zinc-300'}`}>
                    Pedidos
                  </span>
                </button>

                {/* Caja Única & Turnos (Icono de Dólar) */}
                <button
                  onClick={() => navigate('/pos?view=shifts')}
                  title="Caja, Turnos y Arqueos"
                  className={`w-full py-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer group ${
                    currentView === 'shifts'
                      ? 'bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 font-bold border border-orange-200/80 shadow-xs'
                      : 'text-slate-500 hover:text-orange-600 hover:bg-orange-50/50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <DollarSign size={20} className={currentView === 'shifts' ? 'text-orange-600 dark:text-orange-400' : 'group-hover:scale-110 group-hover:text-orange-600 transition-transform text-slate-600 dark:text-zinc-400'} />
                  <span className={`text-[11px] font-bold ${currentView === 'shifts' ? 'text-orange-600 dark:text-orange-400' : 'text-slate-600 dark:text-zinc-300'}`}>
                    Caja
                  </span>
                </button>
              </div>
            );
          })()}

          {/* 3. Bottom: Botón Salir */}
          <div className="flex flex-col items-center gap-3 w-full px-2">
            <button
              onClick={() => {
                if (isCashier) {
                  if (window.confirm('¿Deseas bloquear la estación de caja y volver a la pantalla de PIN?')) {
                    localStorage.removeItem('axon_cashier_mode');
                    localStorage.removeItem('axonpos_active_user_role');
                    const slug = localStorage.getItem('storeSlug');
                    navigate(slug ? `/${slug}/caja` : '/pos');
                  }
                } else {
                  navigate('/dashboard');
                }
              }}
              title={isCashier ? "Bloquear Estación de Caja" : "Salir al Panel de AxonMarket"}
              className="w-full py-2.5 rounded-xl flex flex-col items-center justify-center gap-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer font-bold group"
            >
              <LogOut size={20} className="group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-[11px] font-extrabold text-red-600">{isCashier ? 'Bloquear' : 'Salir'}</span>
            </button>
          </div>

        </aside>
      ) : (
        <aside className="hidden md:flex flex-col w-64 bg-gradient-to-b from-[#ea580c] via-[#ea580c] to-[#c2410c] text-white z-20 shrink-0 select-none shadow-2xl shadow-orange-950/20 font-sans border-r border-orange-700/40">
        
        {/* 1. Header: Logo comerciante / AxonMarket */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-xs border border-white/20">
              <ShoppingBag size={18} className="text-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-white lowercase">
              axonmarket
            </span>
          </div>
        </div>

        {/* 2. Workspace Selector Card */}
        <div className="px-4 py-2">
          <div 
            onClick={handleOpenVitrina}
            title="Ver Vitrina Pública"
            className="bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md rounded-2xl p-2.5 flex items-center justify-between transition-all cursor-pointer group shadow-xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white font-black text-sm shrink-0 border border-white/20 group-hover:scale-105 transition-transform overflow-hidden shadow-xs">
                {storeLogo ? (
                  <img src={storeLogo} alt={storeName} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <Store size={18} />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-extrabold text-white truncate leading-tight">
                  {storeName}
                </h2>
                <span className="text-[11px] text-white/75 font-medium block truncate">
                  Profesional
                </span>
              </div>
            </div>
            <ExternalLink size={14} className="text-white/60 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
        </div>

        {/* 3. Search Bar [ Buscar... ⌘K ] */}
        <div className="px-4 py-2">
          <div className="bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl px-3 py-2 flex items-center justify-between text-xs text-white placeholder-white/60 transition-all focus-within:ring-2 focus-within:ring-white/40 focus-within:bg-white/20">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Search size={14} className="text-white/60 shrink-0" />
              <input 
                ref={searchInputRef}
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-white placeholder-white/60 w-full min-w-0"
              />
            </div>
            <kbd className="bg-white/20 text-white/90 text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 border border-white/10">
              ⌘ K
            </kbd>
          </div>
        </div>

        {/* 4. Main Nav List con Acordeones Desplegables Estilo Commercy (Image 4) */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-2">
          {filteredSections.map((sec) => {
            // Caso 1: Ítem con submenú desplegable (Ventas, Inventario, Clientes)
            if (sec.isDropdown) {
              const isOpen = sec.forceOpen || openMenus[sec.id];
              const isChildActive = sec.items.some(item => isSubItemActive(item.path, location.pathname));

              return (
                <div key={sec.id} className="space-y-1">
                  {/* Encabezado del Menú Desplegable */}
                  <button
                    onClick={() => toggleSubmenu(sec.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 select-none cursor-pointer group",
                      isChildActive && !isOpen 
                        ? "bg-white/15 text-white" 
                        : "text-white/85 hover:text-white hover:bg-white/10"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <sec.icon size={17} strokeWidth={2.2} className="shrink-0 text-white" />
                      <span className="truncate">{sec.name}</span>
                    </div>
                    {isOpen ? (
                      <ChevronUp size={15} className="text-white/70 group-hover:text-white transition-transform" />
                    ) : (
                      <ChevronDown size={15} className="text-white/70 group-hover:text-white transition-transform" />
                    )}
                  </button>

                  {/* Sub-ítems (Píldora blanca con texto naranja cuando está activo) */}
                  {isOpen && (
                    <div className="pl-6 pr-1 space-y-1 pt-0.5 pb-1 animate-in slide-in-from-top-1 duration-150">
                      {sec.items.map((sub) => {
                        const isSubActive = isSubItemActive(sub.path, location.pathname);
                        return (
                          <NavLink
                            key={sub.name}
                            to={sub.path}
                            className={cn(
                              "block px-3.5 py-2 rounded-xl text-xs transition-all duration-150 font-semibold",
                              isSubActive 
                                ? "bg-white text-orange-600 font-extrabold shadow-sm" 
                                : "text-white/80 hover:text-white hover:bg-white/10"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="truncate">{sub.name}</span>
                              {sub.isPos && (
                                <span className={cn(
                                  "text-[9px] font-black px-1.5 py-0.2 rounded-full",
                                  isSubActive ? "bg-orange-100 text-orange-600" : "bg-white/20 text-white"
                                )}>
                                  POS
                                </span>
                              )}
                            </div>
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Caso 2: Ítem simple (Puesta en marcha, Estadísticas, Tareas)
            const isSetupActive = sec.path === '/setup' && (location.pathname === '/setup' || location.pathname === '/puesta-en-marcha');
            return (
              <NavLink
                key={sec.name}
                to={sec.path}
                end={sec.exact}
                className={({ isActive }) => {
                  const active = isActive || isSetupActive;
                  return cn(
                    "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group",
                    active 
                      ? "bg-white/20 text-white shadow-inner backdrop-blur-md" 
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  );
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <sec.icon size={17} strokeWidth={2.2} className="shrink-0 text-white" />
                  <span className="truncate">{sec.name}</span>
                </div>
                {sec.badge && (
                  <span className="text-[10px] font-extrabold text-white/90 bg-white/20 px-2 py-0.5 rounded-full border border-white/15 shrink-0">
                    {sec.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* 5. Bottom Section: Trial Card + Utilities + User Card */}
        <div className="shrink-0 pt-2 pb-3 border-t border-white/15 bg-black/5 backdrop-blur-xs">
          
          {/* Trial Progress Card (7 Días de Prueba) */}
          {workspaceStatus !== 'Activo' && (
            <div className="mx-3.5 mb-2.5 p-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md">
              <div className="flex items-center justify-between text-xs font-bold text-white mb-2">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${trialDaysRemaining <= 2 ? 'bg-red-400 animate-ping' : 'bg-white animate-pulse'}`} />
                  Prueba · {trialDaysRemaining > 0 ? `${trialDaysRemaining} días` : 'Expirada'}
                </span>
                <button 
                  onClick={() => setIsSubscriptionModalOpen(true)}
                  className="bg-white hover:bg-slate-50 text-orange-600 font-extrabold text-[10px] px-3 py-1 rounded-full shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  Activar
                </button>
              </div>
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="bg-white h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, Math.max(12, (trialDaysRemaining / 7) * 100))}%` }}
                />
              </div>
            </div>
          )}

          {/* Secondary Utility Links (Sucursales, Notificaciones, Chat, Personal & Usuarios, Configuración) */}
          <div className="px-3.5 space-y-0.5 mb-2">
            {bottomUtilityItems.map((u) => (
              u.onClick ? (
                <button
                  key={u.name}
                  type="button"
                  onClick={u.onClick}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-white/75 hover:text-white hover:bg-white/10 cursor-pointer text-left group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <u.icon size={15} className="shrink-0 text-white/80 group-hover:text-white" />
                    <span className="truncate">{u.name}</span>
                  </div>
                  {u.badge && (
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-white/20 text-white shrink-0 group-hover:bg-white group-hover:text-orange-600 transition-colors">
                      {u.badge}
                    </span>
                  )}
                </button>
              ) : (
                <NavLink
                  key={u.name}
                  to={u.path}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                    isActive 
                      ? "bg-white/20 text-white font-bold" 
                      : "text-white/75 hover:text-white hover:bg-white/10"
                  )}
                >
                  <u.icon size={15} className="shrink-0 text-white/80" />
                  <span className="truncate">{u.name}</span>
                </NavLink>
              )
            ))}
          </div>

          {/* User Profile Footer Card */}
          <div className="mx-3.5 pt-2 border-t border-white/15 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-full bg-white text-orange-600 font-black text-xs flex items-center justify-center shadow-xs border border-white/30 overflow-hidden">
                  {storeLogo ? (
                    <img src={storeLogo} alt={storeName} className="w-full h-full object-cover" />
                  ) : (
                    storeName.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 border border-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white leading-tight truncate">
                  {storeName}
                </p>
                <p className="text-[10px] text-white/75 truncate">
                  Admin · {storeName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button 
                onClick={handleOpenVitrina}
                title="Ver Vitrina"
                className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowUpDown size={15} />
              </button>
              <button 
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>

        </div>

      </aside>
      )}

      {/* ========================================================
          MOBILE HEADER (Oculto en Terminal POS, Dashboard y Más para estética Commercy)
          ======================================================== */}
      {!isPosRoute && location.pathname !== '/dashboard' && location.pathname !== '/more' && (
        <header 
          className="md:hidden sticky top-0 z-30 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 shrink-0 px-4 flex items-center justify-between"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))', paddingBottom: '0.75rem' }}
        >
          {isCashier ? (
            <div className="flex items-center gap-2 max-w-[65%] select-none">
              <div className="bg-gradient-to-tr from-orange-500 to-amber-600 p-1.5 rounded-lg text-white shrink-0 shadow-sm">
                <Store size={20} />
              </div>
              <div className="flex flex-col min-w-0">
                <h1 className="text-sm font-black text-slate-800 dark:text-white truncate">
                  {storeName}
                </h1>
                <span className="text-[10px] font-bold text-orange-600 truncate flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  Caja: {activeUserName || 'Cajero'}
                </span>
              </div>
            </div>
          ) : (
            <div 
              onClick={handleOpenVitrina}
              title="Ver mi Vitrina"
              className="flex items-center gap-2 max-w-[60%] cursor-pointer group active:scale-95 transition-transform select-none"
            >
              <div className="bg-gradient-to-tr from-orange-500 to-amber-600 p-1.5 rounded-lg text-white shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                <ShoppingBag size={20} />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1">
                  <h1 className="text-base font-extrabold text-slate-800 dark:text-white truncate group-hover:text-orange-600 transition-colors">
                    {storeName}
                  </h1>
                  <ExternalLink size={11} className="text-orange-500 opacity-70 shrink-0" />
                </div>
                <span className="text-[9px] font-bold text-orange-600 uppercase tracking-widest leading-none">
                  Ver Vitrina
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2.5 relative">
            {!isCashier && (
              <button 
                onClick={() => setShowNotifications(!showNotifications)} 
                className="text-slate-500 hover:text-orange-500 p-2 relative cursor-pointer"
                title="Notificaciones"
              >
                <Bell size={18} />
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </button>
            )}
            <button onClick={toggleTheme} className="text-slate-500 hover:text-orange-500 p-2 cursor-pointer">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button 
              onClick={() => {
                if (isCashier) {
                  if (window.confirm('¿Deseas bloquear la estación de caja y volver a la pantalla de PIN?')) {
                    localStorage.removeItem('axon_cashier_mode');
                    localStorage.removeItem('axonpos_active_user_role');
                    const slug = localStorage.getItem('storeSlug');
                    navigate(slug ? `/${slug}/caja` : '/pos');
                  }
                } else {
                  handleLogout();
                }
              }} 
              title={isCashier ? "Bloquear Estación de Caja" : "Cerrar sesión"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 border border-red-200/80 dark:border-red-900/40 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <LogOut size={14} />
              <span>{isCashier ? 'Bloquear' : 'Salir'}</span>
            </button>

            {/* Dropdown de Notificaciones Mobile */}
            {showNotifications && (
              <>
                <div 
                  className="fixed inset-0 z-40 bg-black/25 backdrop-blur-xs md:hidden" 
                  onClick={() => setShowNotifications(false)} 
                />
                <div className="absolute top-full right-0 mt-2 w-80 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 dark:text-white">Notificaciones</h3>
                    <span className="text-xs font-bold text-orange-500">{notifications.filter(n => !n.is_read).length} nuevas</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 dark:text-zinc-500 text-sm">No tienes notificaciones.</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-4 border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer ${n.is_read ? 'opacity-60' : 'bg-orange-50/50 dark:bg-orange-500/5'}`}
                          onClick={() => {
                            markAsRead(n.id);
                            if(n.type === 'stock_alert') {
                              navigate('/inventory');
                            } else if(n.product_id) {
                              navigate(`/product-studio/${n.product_id}`);
                            }
                            setShowNotifications(false);
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className={`text-xs mb-1 ${n.is_read ? 'text-slate-500' : 'text-orange-600 font-bold'}`}>
                                {n.type === 'stock_alert' ? '⚠️ Alerta de Stock' : 'Notificación'}
                              </p>
                              <p className="text-sm text-slate-700 dark:text-zinc-300 leading-tight">{n.message}</p>
                              <span className="text-[10px] text-slate-400 mt-2 block">{new Date(n.created_at).toLocaleString()}</span>
                            </div>
                            {!n.is_read && (
                              <button onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }} className="text-slate-400 hover:text-orange-500 p-1" title="Marcar como leída">
                                <CheckCheck size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-3 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-900/50">
                    <button onClick={() => { setShowNotifications(false); navigate('/notifications'); }} className="w-full py-2 bg-orange-100 hover:bg-orange-200 dark:bg-orange-500/20 dark:hover:bg-orange-500/30 text-orange-700 dark:text-orange-400 font-bold text-xs rounded-xl transition-colors cursor-pointer">
                      Ver todas las notificaciones
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>
      )}

      {/* ========================================================
          MAIN CONTENT AREA - AIRY COMMERCY BACKGROUND & CARDS
          ======================================================== */}
      <main className={cn(
        "flex-1 overflow-y-auto w-full custom-scrollbar bg-[#f4f7fb] dark:bg-zinc-950 relative",
        isPosRoute ? "p-0 pb-16 md:pb-0 overflow-hidden" : "pb-24 md:pb-8"
      )}>
        
        {/* Desktop Top Bar Controls (Oculto en /pos para terminal limpia) */}
        {!isPosRoute && (
          <div className="sticky top-0 z-40 bg-[#f4f7fb]/80 dark:bg-zinc-950/80 backdrop-blur-md px-6 md:px-10 py-3.5 hidden md:flex items-center justify-between border-b border-slate-200/60 dark:border-white/5 mb-2">
            
            <div className="flex items-center gap-2">
              {/* Botón Destacado para Entrar al POS Kiosco (Mostrador) */}
              <NavLink
                to="/pos"
                className="px-4 py-1.5 rounded-full text-xs font-black transition-all flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/25 active:scale-95"
              >
                <MonitorSmartphone size={14} />
                Entrar a POS Kiosco (Mostrador)
              </NavLink>

              <NavLink
                to="/dashboard"
                className={({ isActive }) => cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5",
                  isActive
                    ? "bg-orange-500 text-white shadow-xs"
                    : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200/60 dark:border-white/10"
                )}
              >
                <BarChart3 size={13} />
                Resumen General
              </NavLink>
            </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)} 
                className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/70 dark:border-white/10 text-slate-500 hover:text-orange-600 shadow-xs transition-colors relative cursor-pointer"
              >
                <Bell size={18} />
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 dark:text-white">Notificaciones</h3>
                    <span className="text-xs font-bold text-orange-500">{notifications.filter(n => !n.is_read).length} nuevas</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 dark:text-zinc-500 text-sm">No tienes notificaciones.</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-4 border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer ${n.is_read ? 'opacity-60' : 'bg-orange-50/50 dark:bg-orange-500/5'}`}
                          onClick={() => {
                            markAsRead(n.id);
                            if(n.type === 'stock_alert') {
                              navigate('/inventory');
                            } else if(n.product_id) {
                              navigate(`/product-studio/${n.product_id}`);
                            }
                            setShowNotifications(false);
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className={`text-xs mb-1 ${n.is_read ? 'text-slate-500' : 'text-orange-600 font-bold'}`}>
                                {n.type === 'stock_alert' ? '⚠️ Alerta de Stock' : 'Notificación'}
                              </p>
                              <p className="text-sm text-slate-700 dark:text-zinc-300 leading-tight">{n.message}</p>
                              <span className="text-[10px] text-slate-400 mt-2 block">{new Date(n.created_at).toLocaleString()}</span>
                            </div>
                            {!n.is_read && (
                              <button onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }} className="text-slate-400 hover:text-orange-500" title="Marcar como leída">
                                <CheckCheck size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-3 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-900/50">
                    <button onClick={() => { setShowNotifications(false); navigate('/notifications'); }} className="w-full py-2 bg-orange-100 hover:bg-orange-200 dark:bg-orange-500/20 dark:hover:bg-orange-500/30 text-orange-700 dark:text-orange-400 font-bold text-xs rounded-xl transition-colors">
                      Ver todas las notificaciones
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <button 
              onClick={toggleTheme} 
              className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/70 dark:border-white/10 text-slate-500 hover:text-orange-600 shadow-xs transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

        </div>
        )}
        
        <Outlet />
      </main>

      {/* ========================================================
          MOBILE BOTTOM NAV (Visible en POS y resto de módulos)
          ======================================================== */}
      {!location.pathname.startsWith('/product-studio') && (
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/5 shadow-[0_-4px_25px_rgba(0,0,0,0.08)]"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center justify-around px-1 pt-2">
            {isCashier ? (
              // Barra Exclusiva de Terminal de Caja (Sin Inicio, Sin Inventario, Sin Más)
              [
                { name: 'Caja POS', path: '/pos?view=pos', icon: ShoppingCart },
                { name: 'Pedidos', path: '/pos?view=orders', icon: ClipboardList, badge: pendingOrdersCount },
                { name: 'Turno', path: '/pos?view=shifts', icon: DollarSign },
              ].map((item) => {
                const searchParams = new URLSearchParams(location.search);
                const currentView = searchParams.get('view') || 'pos';
                const isActive = (item.path.includes('view=orders') && (currentView === 'orders' || location.pathname === '/orders')) ||
                                 (item.path.includes('view=shifts') && (currentView === 'shifts' || location.pathname === '/shifts')) ||
                                 (item.path.includes('view=pos') && location.pathname === '/pos' && currentView === 'pos');
                return (
                  <button
                    key={item.name}
                    onClick={() => navigate(item.path)}
                    className="relative flex flex-col items-center justify-center p-2 transition-all min-w-[5rem] group cursor-pointer"
                  >
                    {isActive && (
                      <div className="absolute inset-0 bg-orange-50 dark:bg-orange-500/10 rounded-2xl -z-10" />
                    )}
                    <div className={cn(
                      "p-1.5 rounded-xl mb-0.5 transition-all duration-200 relative",
                      isActive ? "text-orange-600 scale-110" : "text-slate-400"
                    )}>
                      <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                      {item.badge > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold tracking-wide transition-colors",
                      isActive ? "text-orange-600" : "text-slate-500 dark:text-zinc-400"
                    )}>
                      {item.name}
                    </span>
                  </button>
                );
              })
            ) : (
              // Barra Completa para Propietario / Administrador
              [
                { name: 'Inicio', path: '/dashboard', icon: Home },
                { name: 'POS', path: '/pos', icon: ShoppingCart },
                { name: 'Órdenes', path: '/orders', icon: ClipboardList },
                { name: 'Inventario', path: '/inventory', icon: PackageSearch },
                { name: 'Más', path: '/more', icon: Menu }
              ].map((item) => (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className="relative flex flex-col items-center justify-center p-2 transition-all min-w-[4rem] group"
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <div className="absolute inset-0 bg-orange-50 dark:bg-orange-500/10 rounded-2xl -z-10" />
                      )}
                      <div className={cn(
                        "p-1.5 rounded-xl mb-0.5 transition-all duration-200",
                        isActive ? "text-orange-600 scale-110" : "text-slate-400"
                      )}>
                        <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold tracking-wide transition-colors",
                        isActive ? "text-orange-600" : "text-slate-400"
                      )}>
                        {item.name}
                      </span>
                    </>
                  )}
                </NavLink>
              ))
            )}
          </div>
        </nav>
      )}

      {/* ========================================================
          PANTALLA DE BLOQUEO POR TRIAL EXPIRADO
          ======================================================== */}
      {isTrialExpired && workspaceStatus !== 'Activo' && (
        <div className="fixed inset-0 z-[99990] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl max-w-md w-full p-6 sm:p-7 text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 mx-auto flex items-center justify-center">
              <Clock size={28} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-950 dark:text-white">
                Período de Prueba Finalizado
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-300 mt-1 leading-relaxed">
                Tus 7 días de acceso gratuito han concluido. Para continuar gestionando tus ventas, POS Kiosco y catálogo online, renueva tu suscripción.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-zinc-800/80 p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center font-bold">
                <span className="text-slate-800 dark:text-white">Plan Mensual:</span>
                <span className="font-mono text-slate-950 dark:text-white font-black">$30 / mes</span>
              </div>
              <div className="flex justify-between items-center font-bold text-orange-600 dark:text-orange-400">
                <span>Promo Trimestral (3 meses):</span>
                <span className="font-mono font-black">$60 (1 mes gratis)</span>
              </div>
              <div className="text-[10px] text-purple-700 dark:text-purple-300 font-bold border-t border-slate-200 dark:border-white/10 pt-2 flex items-center gap-1">
                <span>💳 Próximamente pago en cuotas con Cashea</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => setIsSubscriptionModalOpen(true)}
                className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-orange-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CreditCard size={16} />
                <span>Pagar con Pago Móvil BNC</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full py-2.5 text-slate-500 hover:text-slate-800 dark:hover:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pago de Suscripción */}
      <SubscriptionPaymentModal 
        isOpen={isSubscriptionModalOpen} 
        onClose={() => setIsSubscriptionModalOpen(false)} 
        storeInfo={{ name: storeName }}
        onPaymentReported={() => {
          setWorkspaceStatus('Pago_En_Revision');
        }}
      />

      {/* Centro de Control Maestro: Personal, Cajas y PINes */}
      <UserManagementModal
        isOpen={isUserManagementModalOpen}
        onClose={() => setIsUserManagementModalOpen(false)}
      />

    </div>
  );
}

