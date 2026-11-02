import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Rocket, Search, Copy, Share2, ArrowUpRight, ChevronRight, 
  Store, Building2, Users, PackageSearch, Tag, Gift, 
  DollarSign, Receipt, Settings, HelpCircle, LogOut, 
  ExternalLink, Check, Sparkles, X, Globe, Layers,
  ShieldCheck, CreditCard, ShoppingBag, Zap, Package,
  Database, Wallet
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import toast from 'react-hot-toast';
import UserManagementModal from '../components/admin/UserManagementModal';
import BackupManagerModal from '../components/admin/BackupManagerModal';
import CashShiftModal from '../components/admin/CashShiftModal';

export default function MerchantMorePage() {
  const navigate = useNavigate();
  const [storeInfo, setStoreInfo] = useState(() => {
    const localStoreName = localStorage.getItem('merchant_store_name') || 'Mi Comercio';
    const localSlug = localStorage.getItem('storeSlug') || '';
    const localFirstName = localStoreName.split(' ')[0] || 'Comerciante';
    return { 
      name: localStoreName, 
      slug: localSlug, 
      plan: 'Profesional',
      merchantName: localFirstName
    };
  });
  const [copied, setCopied] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [showPlanBanner, setShowPlanBanner] = useState(true);

  // Modales de administración crítica (AxonPOS ➔ AxonMarket)
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isCashShiftModalOpen, setIsCashShiftModalOpen] = useState(false);

  useEffect(() => {
    const wsId = localStorage.getItem('activeWorkspace');
    if (wsId) {
      supabase.from('workspaces').select('id, name, store_slug, config, status').eq('id', wsId).maybeSingle()
        .then(({ data, error }) => {
          if (!error && data) {
            const rawSlug = data.store_slug || localStorage.getItem('storeSlug') || '';
            const rawName = data.name || localStorage.getItem('merchant_store_name') || 'Mi Comercio';
            const ownerOrContact = data.config?.contact?.name || data.config?.ownerName || data.config?.adminName || rawName.split(' ')[0] || 'Comerciante';

            if (data.store_slug) localStorage.setItem('storeSlug', data.store_slug);
            if (data.name) localStorage.setItem('merchant_store_name', data.name);

            setStoreInfo({
              name: rawName,
              slug: rawSlug,
              plan: 'Profesional',
              merchantName: ownerOrContact
            });
          }
        })
        .catch(console.error);
    }
  }, []);

  const canonicalOrigin = typeof window !== 'undefined' && window.location.origin.includes('localhost')
    ? window.location.origin
    : 'https://axonmarket.vip';

  const storeUrl = storeInfo.slug 
    ? `${canonicalOrigin}/${storeInfo.slug}`
    : `${canonicalOrigin}`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      toast.success('¡Enlace de tu vitrina copiado al portapapeles!');
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      toast.error('No se pudo copiar automáticamente');
    }
  };

  const handleShareUrl = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Vitrina de ${storeInfo.name} en AxonMarket`,
          text: `¡Haz tus pedidos en línea en ${storeInfo.name}!`,
          url: storeUrl
        });
      } catch (e) {}
    } else {
      handleCopyUrl();
    }
  };

  const handleLogout = async () => {
    if (window.confirm('¿Deseas cerrar tu sesión comercial en este dispositivo?')) {
      await supabase.auth.signOut().catch(() => {});
      localStorage.removeItem('activeWorkspace');
      localStorage.removeItem('merchant_store_name');
      navigate('/merchant/login');
    }
  };

  // Menú completo de funcionalidades (Excluyendo POS Kiosco como fue indicado)
  const menuItems = [
    {
      id: 'sucursales',
      name: 'Sucursales',
      desc: 'Visor general de tus sucursales',
      path: '/location',
      icon: Building2,
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-500/10'
    },
    {
      id: 'stock',
      name: 'Stock & Inventario',
      desc: 'Control de existencias y productos',
      path: '/inventory',
      icon: PackageSearch,
      color: 'text-orange-500',
      bg: 'bg-orange-50 dark:bg-orange-500/10'
    },
    {
      id: 'precios',
      name: 'Precios & Tarifas',
      desc: 'Centro de precios detal/mayor y margen',
      path: '/prices',
      icon: Tag,
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-500/10'
    },
    {
      id: 'ofertas',
      name: 'Ofertas & Flash Sales',
      desc: 'Descuentos con tiempo límite y precios tachados',
      path: '/offers',
      icon: Zap,
      color: 'text-rose-500',
      bg: 'bg-rose-50 dark:bg-rose-500/10'
    },
    {
      id: 'combos',
      name: 'Combos & Paquetes',
      desc: 'Arma kits y paquetes promocionales con descuento',
      path: '/combos',
      icon: Package,
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-500/10'
    },
    {
      id: 'clientes',
      name: 'Clientes & CRM',
      desc: 'Base de leads y fidelización',
      path: '/customers',
      icon: Users,
      color: 'text-orange-500',
      bg: 'bg-orange-50 dark:bg-orange-500/10'
    },
    {
      id: 'promociones',
      name: 'Promociones & Cupones',
      desc: 'Descuentos y ofertas de temporada',
      path: '/promotions',
      icon: Gift,
      color: 'text-pink-500',
      bg: 'bg-pink-50 dark:bg-pink-500/10'
    },
    {
      id: 'caja',
      name: 'Caja & Turnos (F9)',
      desc: 'Arqueos ciegos, aperturas y reportes Z',
      onClick: () => setIsCashShiftModalOpen(true),
      icon: Wallet,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10'
    },
    {
      id: 'facturacion',
      name: 'Facturación & SENIAT',
      desc: 'Libro de ventas y notas de entrega',
      path: '/invoicing',
      icon: Receipt,
      color: 'text-teal-500',
      bg: 'bg-teal-50 dark:bg-teal-500/10'
    },
    {
      id: 'equipo',
      name: 'Equipo & Permisos',
      desc: 'Centro de Control Maestro: 21 permisos y PINes',
      onClick: () => setIsUserManagementModalOpen(true),
      icon: Users,
      color: 'text-indigo-500',
      bg: 'bg-indigo-50 dark:bg-indigo-500/10'
    },
    {
      id: 'respaldos',
      name: 'Centro de Respaldos (.axonbak)',
      desc: 'Motor ACID v4.0, copias locales y nube',
      onClick: () => setIsBackupModalOpen(true),
      icon: Database,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10'
    },
    {
      id: 'perfil-tienda',
      name: 'Perfil de Tienda',
      desc: 'Datos comerciales, logo y contacto',
      path: '/store-profile',
      icon: Settings,
      color: 'text-slate-600 dark:text-slate-300',
      bg: 'bg-slate-100 dark:bg-zinc-800'
    },
    {
      id: 'apps',
      name: 'Apps & Extensiones',
      desc: 'Herramientas integradas a tu cuenta',
      path: '/app',
      icon: Layers,
      color: 'text-cyan-500',
      bg: 'bg-cyan-50 dark:bg-cyan-500/10'
    }
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    item.desc.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const initialLetter = ((storeInfo.merchantName || storeInfo.name || 'A')[0] || 'A').toUpperCase();

  return (
    <div className="w-full min-h-screen bg-[#f4f7fb] dark:bg-black font-sans pb-32">
      
      {/* ========================================================
          CABECERA SUPERIOR "MÁS" (ESTILO COMMERCY)
          ======================================================== */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Más
        </h1>
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar sección..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-36 sm:w-48 pl-8 pr-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 rounded-full text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 shadow-2xs"
          />
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      <div className="px-5 space-y-5 mt-2">
        
        {/* ========================================================
            SECCIÓN: PARA EMPEZAR
            ======================================================== */}
        <div>
          <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 px-1">
            Para empezar
          </p>
          <div
            onClick={() => navigate('/setup')}
            className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center justify-between gap-3 hover:border-orange-400 transition-all cursor-pointer group active:scale-99"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <Rocket size={20} />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-orange-600 transition-colors">
                  Puesta en marcha
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  4 de 4 pasos completados
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-400 group-hover:text-orange-600 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>

        {/* ========================================================
            BLOQUE DE PERFIL DEL COMERCIANTE (CENTRAL COMMERCY)
            ======================================================== */}
        <div className="flex flex-col items-center justify-center text-center py-2">
          {/* Avatar Circular con Inicial en Naranja Corporativo */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-orange-500/25 mb-3 border-4 border-white dark:border-zinc-900">
            {initialLetter}
          </div>

          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            {storeInfo.merchantName}
          </h2>
          <p className="text-xs font-bold text-slate-400 mt-0.5">
            Admin · {storeInfo.name}
          </p>

          {/* Píldora del Enlace de la Vitrina */}
          <div className="mt-3.5 inline-flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 px-3.5 py-1.5 rounded-full shadow-2xs max-w-full">
            <Globe size={13} className="text-slate-400 shrink-0" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate max-w-[200px] sm:max-w-[260px]">
              {storeUrl.replace(/^https?:\/\//, '')}
            </span>
            <div className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-white/10 shrink-0">
              <button
                type="button"
                onClick={handleCopyUrl}
                className="p-1 rounded-md text-slate-400 hover:text-orange-600 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Copiar enlace"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
              <button
                type="button"
                onClick={handleShareUrl}
                className="p-1 rounded-md text-slate-400 hover:text-orange-600 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Compartir vitrina"
              >
                <Share2 size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================
            BANNER: MEJORAR PLAN (ESTILO COMMERCY EN NARANJA CORPORATIVO)
            ======================================================== */}
        {showPlanBanner && (
          <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 rounded-3xl p-4 text-white shadow-md shadow-orange-500/20 relative overflow-hidden animate-in fade-in">
            <div className="absolute top-0 right-0 p-3 opacity-15 pointer-events-none">
              <Sparkles size={72} />
            </div>
            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-2xs">
                  <ArrowUpRight size={20} className="text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-black leading-tight">Mejorar plan</h4>
                  <p className="text-xs text-white/90 mt-0.5">Desbloqueá más módulos y funciones avanzadas</p>
                  <button
                    onClick={() => navigate('/pricing')}
                    className="mt-2 text-xs font-black underline flex items-center gap-1 hover:text-amber-200 transition-colors cursor-pointer"
                  >
                    <span>Ver planes</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowPlanBanner(false)}
                className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            SECCIÓN: CUENTA Y NIVEL
            ======================================================== */}
        <div>
          <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 px-1">
            Cuenta
          </p>
          <div className="bg-gradient-to-r from-orange-600 to-amber-600 rounded-2xl p-3.5 text-white shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                <Store size={18} />
              </div>
              <div>
                <p className="text-xs font-black leading-tight">{storeInfo.name}</p>
                <p className="text-[11px] text-white/80 font-medium">{storeInfo.plan}</p>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md border border-white/25">
              Activo
            </span>
          </div>
        </div>

        {/* ========================================================
            LISTA VERTICAL ESTILO COMMERCY (SIN POS KIOSCO)
            ======================================================== */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xs divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">
          {filteredMenuItems.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (item.onClick) {
                  item.onClick();
                } else if (item.path) {
                  navigate(item.path);
                }
              }}
              className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group active:scale-99"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className={`w-10 h-10 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-2xs`}>
                  <item.icon size={19} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-white group-hover:text-orange-600 transition-colors truncate">
                    {item.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                    {item.desc}
                  </p>
                </div>
              </div>
              <ChevronRight size={17} className="text-slate-400 group-hover:text-orange-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
            </div>
          ))}

          {/* Botón Cerrar Sesión */}
          <div
            onClick={handleLogout}
            className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer group active:scale-99"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 shadow-2xs">
                <LogOut size={19} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-red-600 dark:text-red-400">
                  Cerrar sesión
                </h4>
                <p className="text-[11px] text-slate-400">
                  Salir de la cuenta de comerciante
                </p>
              </div>
            </div>
            <ChevronRight size={17} className="text-red-400 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>

      </div>

      {/* ========================================================
          MODALES MASTER CRÍTICOS (AXONPOS ➔ AXONMARKET)
          ======================================================== */}
      <CashShiftModal 
        isOpen={isCashShiftModalOpen}
        onClose={() => setIsCashShiftModalOpen(false)}
        storeName={storeInfo.name}
      />

      <UserManagementModal
        isOpen={isUserManagementModalOpen}
        onClose={() => setIsUserManagementModalOpen(false)}
      />

      <BackupManagerModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />

    </div>
  );
}
