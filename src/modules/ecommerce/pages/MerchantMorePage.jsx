import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Rocket, Search, Copy, Share2, ArrowUpRight, ChevronRight, 
  Store, Building2, Users, PackageSearch, Tag, Gift, 
  DollarSign, Receipt, Settings, HelpCircle, LogOut, 
  ExternalLink, Check, Sparkles, X, Globe, Layers,
  ShieldCheck, CreditCard, ShoppingBag, Zap, Package,
  Database, Wallet, Bell, Clock, MessageSquare, Flame, FolderTree,
  Briefcase, FileText, Download, Trash2, MessageCircle
} from 'lucide-react';
import ResponsiveModal from '../components/ResponsiveModal';
import { supabase } from '../../../supabaseClient';
import toast from 'react-hot-toast';
import UserManagementModal from '../components/admin/UserManagementModal';
import BackupManagerModal from '../components/admin/BackupManagerModal';
import CashShiftModal from '../components/admin/CashShiftModal';
import SubscriptionPaymentModal from '../components/SubscriptionPaymentModal';

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
  const [trialDaysRemaining, setTrialDaysRemaining] = useState(7);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [workspaceStatus, setWorkspaceStatus] = useState('Pendiente');
  const [isSubscriptionPaid, setIsSubscriptionPaid] = useState(false);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState(null);
  const [isPendingActivation, setIsPendingActivation] = useState(false);

  // Modales de administración crítica (AxonPOS ➔ AxonMarket)
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isCashShiftModalOpen, setIsCashShiftModalOpen] = useState(false);
  const [isJobApplicationsModalOpen, setIsJobApplicationsModalOpen] = useState(false);
  const [jobApplicationsList, setJobApplicationsList] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
  const [rawWorkspaceConfig, setRawWorkspaceConfig] = useState(null);

  useEffect(() => {
    const wsId = localStorage.getItem('activeWorkspace');
    const storeSlug = localStorage.getItem('storeSlug');

    let query = supabase.from('workspaces').select('id, name, store_slug, config, status, created_at');
    if (wsId) {
      query = query.eq('id', wsId);
    } else if (storeSlug) {
      query = query.eq('store_slug', storeSlug);
    } else {
      return;
    }

    query.maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) {
          const rawSlug = data.store_slug || storeSlug || '';
          const rawName = data.name || localStorage.getItem('merchant_store_name') || 'Mi Comercio';
          const cfg = typeof data.config === 'object' ? (data.config || {}) : (() => { try { return JSON.parse(data.config || '{}'); } catch(e) { return {}; } })();
          const ownerOrContact = cfg.contact?.name || cfg.ownerName || cfg.adminName || cfg.contact?.ownerName || rawName.split(' ')[0] || 'Comerciante';

          if (data.store_slug) localStorage.setItem('storeSlug', data.store_slug);
          if (data.name) localStorage.setItem('merchant_store_name', data.name);
          if (data.id) localStorage.setItem('activeWorkspace', data.id);

          setWorkspaceStatus(data.status || 'Activo');
          setActiveWorkspaceId(data.id);
          setRawWorkspaceConfig(cfg);
          if (cfg.jobs?.applications && Array.isArray(cfg.jobs.applications)) {
            setJobApplicationsList(cfg.jobs.applications);
          }

          const isPaid = Boolean(cfg.subscriptionEndsAt && new Date(cfg.subscriptionEndsAt) > new Date());
          setIsSubscriptionPaid(isPaid);
          if (cfg.subscriptionEndsAt) {
            setSubscriptionExpiresAt(cfg.subscriptionEndsAt);
          }

          const isPending = data.status === 'Pendiente' || data.status === 'Pre_Registro' || data.status === 'Solicitud';
          setIsPendingActivation(isPending);

          // Si está en pre-registro/pendiente, la prueba aún no corre
          if (isPending) {
            setTrialDaysRemaining(7);
          } else {
            // Cuenta activa: calcular días restantes de la prueba de 7 días
            const trialEndStr = cfg.trialEndsAt;
            if (trialEndStr) {
              const diff = Math.ceil((new Date(trialEndStr) - new Date()) / (1000 * 60 * 60 * 24));
              setTrialDaysRemaining(Math.max(0, diff));
            } else if (cfg.trialStartedAt) {
              const end = new Date(new Date(cfg.trialStartedAt).getTime() + 7 * 24 * 60 * 60 * 1000);
              const diff = Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24));
              setTrialDaysRemaining(Math.max(0, diff));
            } else if (data.created_at) {
              const end = new Date(new Date(data.created_at).getTime() + 7 * 24 * 60 * 60 * 1000);
              const diff = Math.ceil((end - new Date()) / (1000 * 60 * 60 * 24));
              setTrialDaysRemaining(Math.max(0, diff));
            } else {
              setTrialDaysRemaining(7);
            }
          }

          setStoreInfo({
            name: rawName,
            slug: rawSlug,
            plan: isPaid ? 'Plan VIP (Suscrito)' : 'Plan VIP (7 Días de Prueba)',
            merchantName: ownerOrContact
          });
        }
      })
      .catch(console.error);
  }, []);

  // Dominio oficial de producción para la vitrina comercial (axonmarket.vip)
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
      toast.success('¡Enlace oficial de tu vitrina copiado!');
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      toast.error('No se pudo copiar automáticamente');
    }
  };

  const handleShareUrl = async () => {
    const shareTitle = `${storeInfo.name} — Catálogo & Vitrina Oficial`;
    const shareText = `Tus precios y stock real en vivo. Arma tu pedido directo desde el catálogo oficial:\n${storeUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: `Tus precios y stock real en vivo. Arma tu pedido directo desde el catálogo oficial:`,
          url: storeUrl
        });
        return;
      } catch (e) {}
    }
    
    // Fallback si no tiene Web Share API: abrir WhatsApp directamente con el enlace enriquecido
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareTitle}\n\n${shareText}`)}`;
    window.open(waUrl, '_blank');
  };

  const handleLogout = async () => {
    if (window.confirm('¿Deseas cerrar tu sesión comercial en este dispositivo?')) {
      await supabase.auth.signOut().catch(() => {});
      localStorage.removeItem('activeWorkspace');
      localStorage.removeItem('merchant_store_name');
      navigate('/merchant/login');
    }
  };

  const handleDeleteApplication = async (appId) => {
    if (!window.confirm('¿Deseas eliminar esta postulación?')) return;
    try {
      const updated = jobApplicationsList.filter(a => a.id !== appId);
      setJobApplicationsList(updated);
      if (activeWorkspaceId) {
        const newCfg = { ...rawWorkspaceConfig, jobs: { ...(rawWorkspaceConfig?.jobs || {}), applications: updated } };
        setRawWorkspaceConfig(newCfg);
        await supabase.from('workspaces').update({ config: newCfg }).eq('id', activeWorkspaceId);
      }
      toast.success('Postulación eliminada');
    } catch (e) {
      console.error(e);
      toast.error('Error al eliminar postulación');
    }
  };

  // Menú optimizado y resumido de funcionalidades (sin duplicados)
  const menuItems = [
    {
      id: 'postulaciones-cv',
      name: 'Postulaciones & CV (Trabaja con Nosotros)',
      desc: 'Candidatos, currículums en PDF y contacto directo por WhatsApp',
      onClick: () => setIsJobApplicationsModalOpen(true),
      icon: Briefcase,
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      badge: jobApplicationsList.length > 0 ? `${jobApplicationsList.length} RECIBIDAS` : null,
      keywords: ['postulaciones', 'curriculum', 'cv', 'empleo', 'trabajo', 'vacantes', 'candidatos', 'personal', 'rrhh']
    },
    {
      id: 'social-feed',
      name: 'Publicaciones & Redes Sociales',
      desc: 'Crea posts, carruseles de fotos y estados para tu vitrina',
      path: '/social-feed',
      icon: Flame,
      color: 'text-rose-500',
      bg: 'bg-rose-50 dark:bg-rose-500/10',
      badge: 'FEED SOCIAL',
      keywords: ['redes', 'social', 'feed', 'publicaciones', 'fotos', 'estados', 'carrusel', 'noticias', 'videos', 'historias']
    },
    {
      id: 'caja-maestra',
      name: 'Caja Maestra & Turnos',
      desc: 'Ingresos consolidados, bimonetario, gavetas y arqueo de turnos',
      path: '/cash-master',
      icon: Wallet,
      color: 'text-orange-500',
      bg: 'bg-orange-50 dark:bg-orange-500/10',
      badge: 'ACTIVO',
      keywords: ['caja', 'turnos', 'arqueo', 'dinero', 'dolares', 'bolivares', 'gaveta', 'cierres']
    },
    {
      id: 'categorias',
      name: 'Categorías del Catálogo',
      desc: 'Crea y organiza departamentos, subcategorías y fotos de tu tienda',
      path: '/categories',
      icon: FolderTree,
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      badge: 'CATÁLOGO',
      keywords: ['categorias', 'catalogo', 'subcategorias', 'departamentos', 'rubros', 'fotos', 'organizar']
    },
    {
      id: 'ofertas',
      name: 'Promociones, Ofertas & Combos',
      desc: 'Descuentos con tiempo límite, precios tachados y kits promocionales',
      path: '/offers',
      icon: Zap,
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      keywords: ['ofertas', 'promociones', 'combos', 'descuentos', 'flash sales', 'paquetes']
    },
    {
      id: 'facturacion',
      name: 'Facturación & SENIAT',
      desc: 'Libro de ventas fiscal, notas de entrega e IVA',
      path: '/invoicing',
      icon: Receipt,
      color: 'text-teal-500',
      bg: 'bg-teal-50 dark:bg-teal-500/10',
      keywords: ['facturacion', 'seniat', 'libro', 'ventas', 'fiscal', 'iva', 'notas']
    },
    {
      id: 'clientes',
      name: 'Clientes & CRM',
      desc: 'Base de leads, directorio de clientes y fidelización',
      path: '/customers',
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      keywords: ['clientes', 'crm', 'leads', 'directorio', 'contactos']
    },
    {
      id: 'chat',
      name: 'Chat de Clientes',
      desc: 'Atención y mensajes en vivo con clientes',
      path: '/support',
      icon: MessageSquare,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      keywords: ['chat', 'mensajes', 'soporte', 'atencion', 'whatsapp']
    },
    {
      id: 'sucursales',
      name: 'Sucursales & Geolocalización',
      desc: 'Visor general de sucursales y ubicación en el mapa',
      path: '/location',
      icon: Building2,
      color: 'text-indigo-500',
      bg: 'bg-indigo-50 dark:bg-indigo-500/10',
      keywords: ['sucursales', 'mapa', 'gps', 'ubicacion', 'sedes', 'locacion']
    },
    {
      id: 'notificaciones',
      name: 'Centro de Notificaciones',
      desc: 'Alertas de stock, pedidos y avisos del sistema',
      path: '/notifications',
      icon: Bell,
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      keywords: ['notificaciones', 'alertas', 'avisos', 'pedidos']
    },
    {
      id: 'equipo',
      name: 'Personal & Permisos (Maestro)',
      desc: 'Centro de control: 21 permisos de seguridad y PINes',
      onClick: () => setIsUserManagementModalOpen(true),
      icon: ShieldCheck,
      color: 'text-violet-500',
      bg: 'bg-violet-50 dark:bg-violet-500/10',
      keywords: ['personal', 'usuarios', 'roles', 'permisos', 'pines', 'cajeros', 'seguridad', 'equipo']
    },
    {
      id: 'respaldos',
      name: 'Centro de Respaldos (.axonbak)',
      desc: 'Motor ACID v4.0, copias locales y en la nube',
      onClick: () => setIsBackupModalOpen(true),
      icon: Database,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      keywords: ['respaldos', 'copia', 'backup', 'nube', 'restaurar', 'axonbak']
    },
    {
      id: 'perfil-tienda',
      name: 'Perfil de Tienda & Configuración',
      desc: 'Datos comerciales, logo, catálogo y contacto',
      path: '/store-profile',
      icon: Settings,
      color: 'text-slate-600 dark:text-slate-300',
      bg: 'bg-slate-100 dark:bg-zinc-800',
      keywords: ['perfil', 'tienda', 'configuracion', 'logo', 'ajustes', 'slug']
    }
  ];

  const filteredMenuItems = menuItems.filter(item => {
    const q = searchFilter.toLowerCase().trim();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.desc.toLowerCase().includes(q) ||
      (item.keywords && item.keywords.some(k => k.toLowerCase().includes(q)))
    );
  });

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
            BANNER: PLAN VIP & TEMPORIZADOR DE TRIAL 7 DÍAS
            ======================================================== */}
        <div 
          onClick={() => navigate('/subscription')}
          className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 rounded-3xl p-5 text-white shadow-lg shadow-orange-500/20 relative overflow-hidden animate-in fade-in space-y-4 cursor-pointer hover:shadow-orange-500/30 transition-all group"
        >
          <div className="absolute top-0 right-0 p-3 opacity-15 pointer-events-none group-hover:scale-110 transition-transform">
            <Sparkles size={80} />
          </div>

          <div className="relative z-10 space-y-3.5">
            {/* Cabecera del Banner: Etiqueta Plan VIP y Badge de Estado */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-black uppercase tracking-wider">
                <Sparkles size={12} />
                <span>Plan VIP</span>
              </div>
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs ${
                isSubscriptionPaid 
                  ? 'bg-emerald-500 text-white' 
                  : isPendingActivation
                    ? 'bg-amber-400 text-amber-950 font-extrabold'
                    : trialDaysRemaining > 2 
                      ? 'bg-white text-orange-600 font-black' 
                      : trialDaysRemaining > 0
                        ? 'bg-amber-300 text-amber-950 font-black animate-pulse'
                        : 'bg-red-500 text-white animate-pulse'
              }`}>
                {isSubscriptionPaid 
                  ? 'Suscripción Activa' 
                  : isPendingActivation
                    ? 'Pre-registro (Por Activar)'
                    : trialDaysRemaining > 0 
                      ? `⏳ ${trialDaysRemaining} ${trialDaysRemaining === 1 ? 'día restante' : 'días restantes'}` 
                      : 'Prueba Vencida'}
              </span>
            </div>

            {/* TEMPORIZADOR PROMINENTE DE 7 DÍAS (ARRIBA EN LA TARJETA) */}
            {!isSubscriptionPaid && (
              <div className="bg-black/20 backdrop-blur-xs rounded-2xl p-3 border border-white/15 space-y-2">
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="flex items-center gap-1.5 text-white">
                    <Clock size={14} className="text-amber-300" />
                    <span>Temporizador de Prueba (7 Días)</span>
                  </span>
                  <span className="font-mono text-[11px] text-amber-200 bg-white/10 px-2 py-0.5 rounded-md">
                    {isPendingActivation 
                      ? '7 días listos al activar' 
                      : trialDaysRemaining > 0 
                        ? `Día ${Math.min(7, Math.max(1, 8 - trialDaysRemaining))} de 7` 
                        : 'Culminado'}
                  </span>
                </div>

                <div className="w-full bg-black/30 h-2.5 rounded-full overflow-hidden p-0.5">
                  <div 
                    className="bg-gradient-to-r from-amber-300 to-white h-full rounded-full transition-all duration-500 shadow-sm"
                    style={{ 
                      width: isPendingActivation 
                        ? '100%' 
                        : `${Math.min(100, Math.max(10, (trialDaysRemaining / 7) * 100))}%` 
                    }}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] font-bold text-white/90">
                  <span>
                    {isPendingActivation 
                      ? 'Inicia al ser aprobado por SuperAdmin' 
                      : 'Cortesía con acceso VIP total'}
                  </span>
                  <span className="font-mono text-amber-200">
                    {isPendingActivation 
                      ? '7 días completos' 
                      : trialDaysRemaining > 0 
                        ? `${trialDaysRemaining} ${trialDaysRemaining === 1 ? 'día restante' : 'días restantes'}` 
                        : 'Prueba finalizada'}
                  </span>
                </div>
              </div>
            )}

            {/* Texto Descriptivo */}
            <div>
              <h4 className="text-base sm:text-lg font-black leading-tight">
                {isSubscriptionPaid 
                  ? 'Tu comercio cuenta con Plan VIP Activo' 
                  : isPendingActivation
                    ? 'Cuenta en Pre-Registro'
                    : trialDaysRemaining > 0 
                      ? 'Plan VIP · 7 Días de Prueba Gratuita' 
                      : 'Período de Prueba Culminado'}
              </h4>
              <p className="text-xs text-white/90 mt-1 leading-relaxed">
                {isSubscriptionPaid
                  ? `Disfruta de POS Mostrador, Facturación SENIAT, Caja F9, Catálogo Online y gestión de equipo sin límites. Válido hasta: ${subscriptionExpiresAt ? new Date(subscriptionExpiresAt).toLocaleDateString() : 'Activo'}.`
                  : isPendingActivation
                    ? 'Tu comercio fue registrado. Tan pronto como el SuperAdmin active tu cuenta comenzarán a correr tus 7 días de acceso completo.'
                    : trialDaysRemaining > 0
                      ? `Disfruta de POS Mostrador, Facturación SENIAT, Caja F9, Catálogo Online y gestión de equipo. Te quedan ${trialDaysRemaining} días de cortesía.`
                      : 'Tu prueba gratuita de 7 días ha finalizado. Reporta tu Pago Móvil BNC ($30 mensual o $60 trimestral) para continuar.'
                }
              </p>
            </div>

            {/* Botón de Acción a Pantalla Completa de Suscripción */}
            <div className="pt-0.5 flex items-center justify-between">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); navigate('/subscription'); }}
                className="px-5 py-2.5 bg-white hover:bg-orange-50 text-orange-600 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <CreditCard size={15} />
                <span>
                  {isSubscriptionPaid 
                    ? 'Ver Planes & Datos de Pago' 
                    : 'Ver Planes VIP & Pagar con BNC'}
                </span>
              </button>
              <ChevronRight size={20} className="text-white/80 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

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
            DESTACADO: FEED SOCIAL DE TU COMERCIO
            ======================================================== */}
        <div 
          onClick={() => navigate('/social-feed')}
          className="bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 rounded-3xl p-4 sm:p-5 text-white shadow-lg shadow-rose-500/20 relative overflow-hidden cursor-pointer hover:shadow-rose-500/30 transition-all group active:scale-[0.99]"
        >
          <div className="absolute top-0 right-0 p-3 opacity-15 pointer-events-none group-hover:scale-110 transition-transform">
            <Flame size={90} />
          </div>

          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                <Flame size={24} className="fill-white/30 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black tracking-tight text-white truncate">
                    Publicaciones & Redes Sociales
                  </h3>
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-white text-rose-600 rounded-full shadow-xs">
                    Feed Dinámico
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-white/90 font-medium truncate mt-0.5">
                  Sube fotos, carruseles de productos y estados en vivo
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 group-hover:translate-x-1 transition-transform">
              <ChevronRight size={18} className="text-white" />
            </div>
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-white group-hover:text-orange-600 transition-colors truncate">
                      {item.name}
                    </h4>
                    {item.badge && (
                      <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full shadow-2xs ${
                        item.id === 'social-feed' 
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-orange-500 text-white'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
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

      <SubscriptionPaymentModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        storeInfo={storeInfo}
        onPaymentReported={() => {
          setWorkspaceStatus('Pago_En_Revision');
        }}
      />

      {/* Modal Gerencial Móvil: Postulaciones y CVs Recibidos */}
      {isJobApplicationsModalOpen && (
        <ResponsiveModal
          isOpen={isJobApplicationsModalOpen}
          onClose={() => setIsJobApplicationsModalOpen(false)}
          title="Postulaciones & Currículos (CV)"
          className="max-w-2xl"
          contentClassName="p-4 sm:p-6"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-2xl">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                  <Briefcase size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">Postulaciones Recibidas</h4>
                  <p className="text-xs text-slate-600 dark:text-zinc-400">Currículos enviados por candidatos desde tu vitrina.</p>
                </div>
              </div>
              <span className="text-xs font-black px-2.5 py-1 rounded-full bg-amber-500 text-slate-950">
                {jobApplicationsList.length} Total
              </span>
            </div>

            {jobApplicationsList.length === 0 ? (
              <div className="text-center py-12 px-4 bg-slate-50 dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
                <FileText size={40} className="mx-auto text-slate-400 mb-2 stroke-[1.5]" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200">No hay postulaciones registradas aún</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Cuando las personas se postulen a tus ofertas de trabajo o envíen su CV espontáneo desde la vitrina, aparecerán listadas aquí para revisarlas y contactarlas.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {jobApplicationsList.map((app) => (
                  <div
                    key={app.id || app.createdAt}
                    className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900 dark:text-white">
                            {app.applicantName}
                          </h4>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            {app.position || 'Postulación General'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5 mt-1.5 text-xs text-slate-500 dark:text-zinc-400">
                          {app.age && <span>🎂 {app.age} años</span>}
                          {app.location && <span>📍 {app.location}</span>}
                          {app.education && <span>🎓 {app.education}</span>}
                          {app.createdAt && <span>📅 {new Date(app.createdAt).toLocaleDateString()}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {app.cvUrl && (
                          <a
                            href={app.cvUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                            title="Descargar o Ver Documento PDF del CV"
                          >
                            <Download size={13} />
                            <span>Ver CV</span>
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteApplication(app.id)}
                          className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                          title="Eliminar postulación"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {app.notes && (
                      <p className="text-xs bg-slate-50 dark:bg-zinc-800/60 p-2.5 rounded-xl text-slate-600 dark:text-zinc-300 italic border border-slate-100 dark:border-zinc-800">
                        "{app.notes}"
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800">
                      <span className="text-xs text-slate-500">Teléfono: <strong>{app.phone}</strong></span>
                      <a
                        href={`https://wa.me/${(app.phone || '').replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1"
                      >
                        <MessageCircle size={13} />
                        WhatsApp
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ResponsiveModal>
      )}

    </div>
  );
}
