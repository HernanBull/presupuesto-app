import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Store,
  Sparkles,
  ShoppingBag,
  ShoppingCart,
  Package,
  Layers,
  BarChart3,
  ShieldCheck,
  Share2,
  Clock,
  ArrowRight,
  Check,
  X,
  MapPin,
  Lock,
  Tag,
  DollarSign,
  Truck,
  Box,
  MessageSquare,
  ChevronDown,
  HelpCircle,
  TrendingUp,
  Award,
  Smartphone,
  Eye,
  CheckCircle2,
  Flame,
  LayoutDashboard
} from 'lucide-react';

export default function MerchantFeaturesPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('todos');
  const [openFaq, setOpenFaq] = useState(null);
  const [ordersPerDay, setOrdersPerDay] = useState(25);

  const isMerchantLogged = Boolean(localStorage.getItem('activeWorkspace'));

  const handleStartMerchant = () => {
    if (isMerchantLogged) {
      navigate('/dashboard');
    } else {
      navigate('/', { state: { openMerchantRegister: true, mode: 'register' } });
    }
  };

  const handleLoginMerchant = () => {
    if (isMerchantLogged) {
      navigate('/dashboard');
    } else {
      navigate('/', { state: { openMerchantModal: true, mode: 'login' } });
    }
  };

  // Módulos reales del sistema
  const modulesList = [
    {
      id: 'storefront',
      category: 'ventas',
      title: 'Vitrina Digital & Tienda Web',
      subtitle: 'Tu negocio en internet con identidad propia 24/7',
      description: 'Presencia web de alto nivel con tu propio enlace personalizado. Incluye logotipo, portada en alta definición, horarios de apertura y cierre, y navegación fluida adaptada a teléfonos móviles.',
      badge: 'Presencia de Marca',
      icon: Store,
      accent: 'from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/30',
      features: [
        'Enlace único directo para compartir en redes sociales y WhatsApp',
        'Personalización con logotipo, portada, biografía y colores de tu marca',
        'Horarios comerciales con aviso automático de tienda abierta o cerrada',
        'Diseño ultrarrápido sin descargas pesadas obligatorias para tus clientes'
      ]
    },
    {
      id: 'products',
      category: 'ventas',
      title: 'Product Studio & Catálogo con Variantes',
      subtitle: 'Organización impecable de tus productos',
      description: 'Crea fichas de productos atractivas en segundos. Añade múltiples variantes (tallas, colores, sabores o presentaciones), etiquetas de destacados y fotografías en alta definición optimizadas.',
      badge: 'Catálogo Inteligente',
      icon: ShoppingBag,
      accent: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30',
      features: [
        'Variantes ilimitadas (tallas, sabores, colores y presentaciones)',
        'Múltiples fotos por producto con visualización nítida y zoom',
        'Categorías y subcategorías con buscador instantáneo en vivo',
        'Etiquetas de estado: nuevo, oferta especial y disponibilidad'
      ]
    },
    {
      id: 'orders',
      category: 'operaciones',
      title: 'Punto de Venta (POS) & Pedidos en Vivo',
      subtitle: 'Control total de cada orden en tiempo real',
      description: 'Recibe compras al instante con señales visuales y sonoras. Gestiona el ciclo completo de cada pedido (Pendiente, En Preparación, Despachado y Entregado) verificando comprobantes de pago adjuntos.',
      badge: 'Flujo en Tiempo Real',
      icon: ShoppingCart,
      accent: 'from-blue-500/20 to-cyan-500/10 text-blue-400 border-blue-500/30',
      features: [
        'Alerta instantánea de nuevos pedidos para atender con máxima agilidad',
        'Visualizador integrado de comprobantes de pago (Pago Móvil, Zelle, Transferencias)',
        'Historial completo de clientes con detalle de artículos solicitados',
        'Transición ordenada de estados de orden sin perder el hilo'
      ]
    },
    {
      id: 'picking',
      category: 'operaciones',
      title: 'Módulo de Preparación y Picking',
      subtitle: 'Cero errores para cocina, bodega o empaque',
      description: 'Una pantalla dedicada especialmente para tu equipo operativo. Permite chequear cada producto antes de empaquetar, garantizando que el pedido salga completo y a tiempo hacia el cliente.',
      badge: 'Operación Exacta',
      icon: Box,
      accent: 'from-amber-500/20 to-yellow-500/10 text-amber-300 border-amber-500/30',
      features: [
        'Lista de verificación interactiva ítem por ítem durante el empaque',
        'Ideal para despensas, cocinas, tiendas de ropa o bodegas de despacho',
        'Aislamiento operativo: tu equipo prepara sin acceder a tus finanzas',
        'Minimiza devoluciones y reclamos por artículos equivocados'
      ]
    },
    {
      id: 'inventory',
      category: 'operaciones',
      title: 'Control de Inventario & Alertas de Stock',
      subtitle: 'Existencias exactas sin sorpresas desagradables',
      description: 'Sincronización automática de existencias con cada orden despachada. Configura niveles mínimos de alerta para reabastecer a tiempo y evitar vender productos que no tienes en almacén.',
      badge: 'Stock Automatizado',
      icon: Package,
      accent: 'from-purple-500/20 to-pink-500/10 text-purple-400 border-purple-500/30',
      features: [
        'Descuento automático de existencias en cuanto se confirma la compra',
        'Alertas tempranas de bajo inventario en tu panel de control',
        'Ajustes rápidos de stock físico para entradas o mermas',
        'Protección total contra ventas dobles o quiebres de inventario'
      ]
    },
    {
      id: 'social',
      category: 'fidelizacion',
      title: 'Red Social Comercial (Social Feed)',
      subtitle: 'Comunidad directa con tus compradores dentro del marketplace',
      description: 'Publica noticias, lanzamientos, videos y promociones especiales directamente en el feed interactivo. Tus clientes pueden dar "Me gusta", comentar preguntas y seguir tu tienda para no perderse nada.',
      badge: 'Comunidad Exclusiva',
      icon: Share2,
      accent: 'from-pink-500/20 to-rose-500/10 text-pink-400 border-pink-500/30',
      features: [
        'Muro de publicaciones propio dentro de AxonMarket',
        'Interacción social con me gustas, comentarios y favoritos',
        'Base de seguidores fieles que reciben tus noticias de primera mano',
        'Sin intermediarios ni algoritmos que oculten tus publicaciones'
      ]
    },
    {
      id: 'promotions',
      category: 'ventas',
      title: 'Ofertas Flash & Cupones Promocionales',
      subtitle: 'Impulsa picos de venta cuando lo necesites',
      description: 'Crea promociones con cuenta regresiva para generar urgencia de compra. Configura cupones de descuento exclusivos para premiar a tus clientes más leales o liquidar inventario de temporada.',
      badge: 'Motor de Conversión',
      icon: Flame,
      accent: 'from-red-500/20 to-orange-500/10 text-red-400 border-red-500/30',
      features: [
        'Cronómetro de ofertas con tiempo limitado visible en vitrina',
        'Descuentos porcentuales o montos fijos aplicables al carrito',
        'Insignias llamativas para captar la atención de compradores',
        'Activación y desactivación inmediata con un solo clic'
      ]
    },
    {
      id: 'currency',
      category: 'finanzas',
      title: 'Multi-Moneda Dinámica & Tasa Oficial',
      subtitle: 'Precios en Bolívares y Dólares siempre al día',
      description: 'Cálculo transparente y automático de tus precios en base a la tasa de cambio oficial vigente. Olvídate de rehacer precios uno a uno cada mañana: el sistema mantiene tu catálogo al día sin esfuerzo.',
      badge: 'Finanzas Transparentes',
      icon: DollarSign,
      accent: 'from-green-500/20 to-emerald-500/10 text-green-400 border-green-500/30',
      features: [
        'Precios calculados en Dólares ($) y Bolívares (Bs) al instante',
        'Sincronización con la tasa de cambio oficial sin trabajo manual',
        'Soporte de pagos múltiples: Pago Móvil, Zelle, Transferencia o Efectivo',
        'Totales claros y exactos tanto para el cliente como para tu caja'
      ]
    },
    {
      id: 'delivery',
      category: 'operaciones',
      title: 'Logística, Delivery & Retiro en Local',
      subtitle: 'Entregas coordinadas y transparentes',
      description: 'Permite a tus clientes elegir entre entrega a domicilio o retiro en tu sucursal. Asigna órdenes a tus motorizados o repartidores de confianza manteniendo el estado de despacho actualizado.',
      badge: 'Envíos Transparentes',
      icon: Truck,
      accent: 'from-sky-500/20 to-blue-500/10 text-sky-400 border-sky-500/30',
      features: [
        'Flexibilidad para envíos a domicilio o retiro en tienda (Pick-up)',
        'Cálculo y especificación clara del costo de despacho por zona',
        'Coordinación directa con motorizados y seguimiento de entrega',
        'Notificaciones de despacho para que el cliente esté atento'
      ]
    },
    {
      id: 'map',
      category: 'ventas',
      title: 'Radar de Tiendas & Geolocalización',
      subtitle: 'Atracción de clientes por cercanía en tu ciudad',
      description: 'Posiciona tu negocio en el mapa interactivo de comercios. Los compradores de tu municipio o zona geográfica pueden descubrir tu local físico, ver la distancia exacta y pedir directamente.',
      badge: 'Tráfico Local',
      icon: MapPin,
      accent: 'from-amber-400/20 to-yellow-500/10 text-amber-300 border-amber-400/30',
      features: [
        'Ubicación satelital precisa de tu local en el mapa de comercios',
        'Búsqueda por cercanía para compradores de tu localidad',
        'Dirección física, referencias y enlaces directos a navegación',
        'Atracción de tráfico físico a tu punto de venta'
      ]
    },
    {
      id: 'analytics',
      category: 'finanzas',
      title: 'Analíticas Comerciales & Métricas en Vivo',
      subtitle: 'Decisiones basadas en datos reales de tu negocio',
      description: 'Tablero ejecutivo con gráficos visuales de tus ventas brutas, promedio de compra por cliente, volumen de pedidos y productos estrella de mayor rentabilidad para optimizar tus compras.',
      badge: 'Inteligencia de Negocio',
      icon: BarChart3,
      accent: 'from-indigo-500/20 to-violet-500/10 text-indigo-400 border-indigo-500/30',
      features: [
        'Gráficos de ingresos diarios, semanales y mensuales',
        'Ranking de productos más vendidos para abastecer con precisión',
        'Ticket promedio de compra y conteo de clientes recurrentes',
        'Exportación y revisión rápida sin enredos contables'
      ]
    },
    {
      id: 'security',
      category: 'finanzas',
      title: 'Seguridad Administrativa con PIN & 2FA',
      subtitle: 'Tus datos, ventas y finanzas 100% blindados',
      description: 'Protección con PIN administrativo para áreas sensibles del panel y autenticación en dos factores (2FA con Google Authenticator o Authy). Tus márgenes, finanzas y clientes permanecen bajo tu custodia.',
      badge: 'Máxima Privacidad',
      icon: ShieldCheck,
      accent: 'from-rose-500/20 to-red-500/10 text-rose-400 border-rose-500/30',
      features: [
        'Bloqueo con PIN de 4 dígitos para módulos de finanzas y configuración',
        'Doble factor de autenticación (2FA) contra accesos no autorizados',
        'Aislamiento total de los datos de tus clientes y proveedores',
        'Acceso seguro desde cualquier dispositivo autorizado por ti'
      ]
    }
  ];

  const filteredModules = activeCategory === 'todos'
    ? modulesList
    : modulesList.filter(m => m.category === activeCategory);

  // Cuadro comparativo universal
  const comparisonRows = [
    {
      feature: 'Vitrina Web con Identidad Propia (Logo, Portada y Catálogo)',
      axon: true,
      chat: 'Inexistente (solo fotos sueltas)',
      traditional: 'Costosa y difícil de mantener',
      tooltip: 'Tu propia página profesional lista para compartir.'
    },
    {
      feature: 'Comisión por Venta Realizada',
      axonText: '0% Comisión por Venta',
      chatText: '0% pero alto costo operativo',
      traditionalText: '3% a 10% por transacción',
      highlight: true
    },
    {
      feature: 'Actualización Dinámica de Tasa Oficial (USD / Bs)',
      axon: true,
      chat: 'Manual producto por producto',
      traditional: 'Compleja o no compatible con tasa local',
      tooltip: 'Tus precios se recalculan automáticamente sin trabajo manual.'
    },
    {
      feature: 'Control de Stock en Tiempo Real con Alertas',
      axon: true,
      chat: 'Riesgo alto de vender artículos agotados',
      traditional: 'Parcial o requiere plugins pagos',
      tooltip: 'Descuenta existencias al vender para evitar quejas.'
    },
    {
      feature: 'Recepción Centralizada de Órdenes y Comprobantes',
      axon: true,
      chat: 'Capturas de pantalla perdidas en el chat',
      traditional: 'Buzón de correos desordenado',
      tooltip: 'Todas las compras organizadas en un panel con alerta sonora.'
    },
    {
      feature: 'Módulo de Preparación / Picking para Personal',
      axon: true,
      chat: 'Listas en papel o notas a mano',
      traditional: 'No incluido en planes estándar',
      tooltip: 'Pantalla operativa para cocina o bodega sin acceso a finanzas.'
    },
    {
      feature: 'Red Social Comercial Integrada (Publicaciones, Likes y Seguidores)',
      axon: true,
      chat: 'Dependes de algoritmos externos que cobran',
      traditional: 'No existe componente social nativo',
      tooltip: 'Publica tus novedades directo a los clientes de tu tienda.'
    },
    {
      feature: 'Seguimiento de Delivery y Retiro en Tienda',
      axon: true,
      chat: 'Llamadas y mensajes desorganizados',
      traditional: 'Módulos de envío costosos',
      tooltip: 'Asigna despachos y notifica al cliente cuando va en camino.'
    },
    {
      feature: 'Acceso Móvil Instantáneo (PWA sin descargas obligatorias)',
      axon: true,
      chat: 'Requiere tener guardado tu número telefónico',
      traditional: 'Sitios pesados que cargan lento en teléfonos',
      tooltip: 'Tus clientes entran de inmediato desde el navegador.'
    },
    {
      feature: 'Reportes de Ventas, Ingresos y Productos Estrella',
      axon: true,
      chat: 'Hojas de cálculo manuales al fin del mes',
      traditional: 'Reportes complejos difíciles de entender',
      tooltip: 'Métricas claras y visuales para tomar mejores decisiones.'
    },
    {
      feature: 'Seguridad Blindada con PIN y Autenticación 2FA',
      axon: true,
      chat: 'Cualquiera con el teléfono ve tus ventas',
      traditional: 'Contraseña estándar simple',
      tooltip: 'Tus ganancias y configuraciones protegidas con clave maestra.'
    },
    {
      feature: 'Puesta en Marcha y Creación de Tienda',
      axonText: 'En solo 2 Minutos',
      chatText: 'Inmediata pero desordenada',
      traditionalText: 'Semanas de configuración técnica',
      highlight: true
    }
  ];

  const faqs = [
    {
      q: '¿Necesito conocimientos de programación o servidores para usar AxonMarket?',
      a: 'Absolutamente no. Toda la plataforma está diseñada con una interfaz visual intuitiva y en español sencillo. En menos de 2 minutos creas tu tienda, cargas tus primeros productos y estás listo para recibir pedidos.'
    },
    {
      q: '¿Cómo funciona el cálculo automático entre Dólares ($) y Bolívares (Bs)?',
      a: 'El sistema integra el valor oficial del día de forma automática. Tú puedes fijar tus precios en tu moneda de referencia y el sistema calcula la conversión exacta al instante para tus compradores, asegurando cobros justos y cuentas claras al cierre de caja.'
    },
    {
      q: '¿Mis clientes están obligados a descargar una aplicación pesada para comprarme?',
      a: 'No. Tus clientes acceden a tu vitrina directamente desde cualquier navegador móvil o de escritorio a través de tu enlace. Además, pueden añadir el acceso directo a su pantalla principal en un solo toque sin consumir memoria del teléfono.'
    },
    {
      q: '¿Puedo tener a mi equipo preparando pedidos sin que vean mis ganancias o finanzas?',
      a: 'Sí. AxonMarket incluye un Módulo de Preparación y Picking diseñado específicamente para la cocina, almacén o equipo de empaque. Además, tus módulos financieros y de configuración están resguardados por un PIN de seguridad administrativo y autenticación en dos factores.'
    },
    {
      q: '¿Qué ventaja tiene la Red Social Comercial integrada frente a publicar solo en redes tradicionales?',
      a: 'En las redes sociales tradicionales, un algoritmo decide si tus clientes ven o no lo que publicas (generalmente menos del 5% de tu audiencia lo ve sin pagar publicidad). En AxonMarket, tus novedades y ofertas aparecen en el muro comercial directo de quienes siguen tu tienda y exploran el marketplace con intención real de compra.'
    },
    {
      q: '¿Cómo inicio el registro de mi comercio en la plataforma?',
      a: 'Solo debes hacer clic en el botón "Abrir mi Tienda", ingresar el nombre de tu negocio, tu correo y categoría. Podrás personalizar tu vitrina de inmediato y comenzar a vender.'
    }
  ];

  return (
    <div className="min-h-screen bg-black text-slate-50 font-sans selection:bg-amber-500/30 overflow-x-hidden">
      
      {/* Background Lighting Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-amber-500/5 blur-[150px] rounded-full translate-x-1/4 -translate-y-1/3" />
        <div className="absolute top-1/3 left-0 w-[600px] h-[600px] bg-indigo-500/5 blur-[140px] rounded-full -translate-x-1/3" />
        <div className="absolute bottom-0 right-1/4 w-[700px] h-[700px] bg-emerald-500/5 blur-[150px] rounded-full" />
      </div>

      {/* Navbar Superior */}
      <header className="sticky top-0 z-50 bg-zinc-950/85 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-[1240px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center text-black shadow-[0_0_25px_rgba(245,158,11,0.35)] transition-transform group-hover:scale-105">
              <Zap size={20} className="stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-[0.2em] text-white">AXON<span className="text-amber-500 font-light">MARKET</span></span>
              <span className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500 -mt-1">Ecosistema Comercial</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isMerchantLogged ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-black font-black text-xs tracking-wider uppercase hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all"
              >
                <LayoutDashboard size={16} />
                Mi Panel Comercial
              </button>
            ) : (
              <>
                <button
                  onClick={handleLoginMerchant}
                  className="hidden sm:inline-block text-xs font-bold tracking-wider uppercase text-zinc-400 hover:text-white transition-colors"
                >
                  Acceso Comerciantes
                </button>
                <button
                  onClick={handleStartMerchant}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-black font-black text-xs tracking-wider uppercase hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all"
                >
                  <Store size={15} />
                  Abrir mi Tienda
                </button>
              </>
            )}
            <button
              onClick={() => navigate('/')}
              className="text-xs font-bold tracking-wider uppercase text-zinc-500 hover:text-zinc-300 transition-colors ml-2"
            >
              Volver
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-6 z-10 max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold tracking-[0.2em] uppercase mb-8 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
            <Sparkles size={14} className="text-amber-400" />
            Funciones y Herramientas para Comercios
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-light text-white mb-6 tracking-tight leading-[1.1]">
            Todo lo que tu comercio necesita para <br className="hidden sm:inline" />
            <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600">
              vender y operar sin límites.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-zinc-400 font-light leading-relaxed mb-10 max-w-3xl mx-auto">
            Olvídate de malabares entre libretas, chats caóticos o plataformas costosas. AxonMarket reúne vitrina digital, pedidos en vivo, inventario automático, delivery y comunidad en una sola solución elegante y profesional.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={handleStartMerchant}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black font-black text-sm tracking-wider uppercase hover:shadow-[0_0_35px_rgba(245,158,11,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              <Store size={18} />
              {isMerchantLogged ? 'Ir a mi Panel de Control' : 'Crear mi Tienda en 2 Minutos'}
              <ArrowRight size={18} />
            </button>

            <a
              href="#comparativa"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-zinc-900/90 text-zinc-300 font-bold text-sm tracking-wider uppercase border border-white/10 hover:bg-zinc-800 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <Award size={18} className="text-amber-500" />
              Ver Cuadro Comparativo
            </a>
          </div>

          {/* Value Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-2xl bg-zinc-950/70 border border-white/5 backdrop-blur-sm">
              <div className="text-2xl font-black text-amber-400 mb-1">0%</div>
              <p className="text-xs text-zinc-400 font-medium">Comisión oculta por venta</p>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-950/70 border border-white/5 backdrop-blur-sm">
              <div className="text-2xl font-black text-emerald-400 mb-1">100%</div>
              <p className="text-xs text-zinc-400 font-medium">Control de tu negocio y clientes</p>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-950/70 border border-white/5 backdrop-blur-sm">
              <div className="text-2xl font-black text-blue-400 mb-1">En Vivo</div>
              <p className="text-xs text-zinc-400 font-medium">Tasa oficial y multi-moneda (USD/Bs)</p>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-950/70 border border-white/5 backdrop-blur-sm">
              <div className="text-2xl font-black text-purple-400 mb-1">Todo-en-1</div>
              <p className="text-xs text-zinc-400 font-medium">Vitrina, inventario, pedidos y social</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Selector de Categorías de Módulos */}
      <section id="modulos" className="relative px-6 py-12 z-10 max-w-[1240px] mx-auto border-t border-white/5">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 text-amber-500 text-xs font-black uppercase tracking-[0.2em] mb-2">
              <Layers size={14} /> Módulos Disponibles
            </div>
            <h2 className="text-3xl md:text-5xl font-light text-white tracking-tight">
              Diseñado para cada etapa de tu operación
            </h2>
            <p className="text-zinc-400 text-base font-light mt-2 max-w-xl">
              Explora las herramientas diseñadas para simplificar tus ventas, empaque, finanzas y relación con tus clientes.
            </p>
          </div>

          {/* Categorías */}
          <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-zinc-950 border border-white/10 self-start md:self-auto">
            {[
              { id: 'todos', label: 'Todos los Módulos' },
              { id: 'ventas', label: 'Ventas & Vitrina' },
              { id: 'operaciones', label: 'Operación & Pedidos' },
              { id: 'fidelizacion', label: 'Social & Clientes' },
              { id: 'finanzas', label: 'Finanzas & Seguridad' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeCategory === tab.id
                    ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de Módulos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredModules.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.35, delay: index * 0.04 }}
                  className="group relative bg-zinc-950/80 border border-white/5 hover:border-white/15 rounded-3xl p-7 transition-all flex flex-col justify-between hover:shadow-[0_10px_35px_rgba(0,0,0,0.5)] overflow-hidden"
                >
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-5">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.accent} border flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm`}>
                        <IconComponent size={24} />
                      </div>
                      <span className="text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-300">
                        {item.badge}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-1 group-hover:text-amber-400 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs font-semibold text-amber-500/80 mb-3 uppercase tracking-wider">
                      {item.subtitle}
                    </p>
                    <p className="text-zinc-400 text-sm font-light leading-relaxed mb-6">
                      {item.description}
                    </p>

                    <div className="space-y-2.5 pt-4 border-t border-white/5">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-3">
                        Capacidades clave:
                      </p>
                      {item.features.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-2.5 text-xs text-zinc-300 leading-snug">
                          <CheckCircle2 size={15} className="text-amber-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-bold text-zinc-400 group-hover:text-amber-400 transition-colors">
                    <span>Módulo Integrado</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </section>

      {/* Cuadro Comparativo Universal */}
      <section id="comparativa" className="relative px-6 py-28 z-10 border-t border-white/5 bg-zinc-950/40">
        <div className="max-w-[1240px] mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 text-amber-500 text-xs font-black uppercase tracking-[0.2em] mb-3">
              <Award size={16} /> Cuadro Comparativo Universal
            </div>
            <h2 className="text-3xl sm:text-5xl font-light text-white tracking-tight mb-4">
              ¿Por qué elegir <span className="font-bold text-amber-400">AxonMarket</span>?
            </h2>
            <p className="text-zinc-400 font-light text-base sm:text-lg">
              Compara cómo resolvemos los desafíos diarios de tu negocio frente a métodos tradicionales y tiendas genéricas.
            </p>
          </div>

          {/* Tabla Comparativa Desktop & Tablet */}
          <div className="overflow-x-auto rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-white/10 bg-zinc-900/50">
                  <th className="p-6 text-xs font-black uppercase tracking-widest text-zinc-400 w-2/5">
                    Función / Capacidad
                  </th>
                  <th className="p-6 text-xs font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 border-x border-amber-500/20 w-1/5 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-base text-amber-400 font-extrabold">AxonMarket</span>
                      <span className="text-[10px] text-amber-300 font-medium px-2 py-0.5 rounded-full bg-amber-500/20">Recomendado</span>
                    </div>
                  </th>
                  <th className="p-6 text-xs font-black uppercase tracking-widest text-zinc-400 w-1/5 text-center">
                    Venta por WhatsApp / Chat
                  </th>
                  <th className="p-6 text-xs font-black uppercase tracking-widest text-zinc-400 w-1/5 text-center">
                    Tiendas Online Tradicionales
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm font-light">
                {comparisonRows.map((row, index) => (
                  <tr key={index} className={`hover:bg-white/[0.02] transition-colors ${row.highlight ? 'bg-amber-500/[0.03]' : ''}`}>
                    {/* Función */}
                    <td className="p-5 text-zinc-200 font-medium">
                      <div className="flex flex-col">
                        <span>{row.feature}</span>
                        {row.tooltip && (
                          <span className="text-[11px] text-zinc-500 font-normal mt-0.5">{row.tooltip}</span>
                        )}
                      </div>
                    </td>

                    {/* AxonMarket */}
                    <td className="p-5 text-center bg-amber-500/[0.04] border-x border-amber-500/20 font-bold text-amber-300">
                      {row.axonText ? (
                        <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-extrabold">
                          {row.axonText}
                        </span>
                      ) : row.axon ? (
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <Check size={18} className="stroke-[3]" />
                        </div>
                      ) : (
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 text-zinc-500">
                          <X size={18} />
                        </div>
                      )}
                    </td>

                    {/* Chat */}
                    <td className="p-5 text-center text-zinc-400 text-xs">
                      {row.chatText ? (
                        <span>{row.chatText}</span>
                      ) : (
                        <span className="text-zinc-500">{row.chat}</span>
                      )}
                    </td>

                    {/* Tradicionales */}
                    <td className="p-5 text-center text-zinc-400 text-xs">
                      {row.traditionalText ? (
                        <span>{row.traditionalText}</span>
                      ) : (
                        <span className="text-zinc-500">{row.traditional}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Calculadora / Simulador de Beneficios */}
      <section className="relative px-6 py-24 z-10 max-w-4xl mx-auto text-center">
        <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 border border-amber-500/30 rounded-3xl p-8 sm:p-12 shadow-[0_0_60px_rgba(245,158,11,0.08)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[90px] rounded-full pointer-events-none" />

          <div className="inline-flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-[0.2em] mb-4">
            <TrendingUp size={16} /> Simulador de Impacto Operativo
          </div>

          <h3 className="text-2xl sm:text-4xl font-light text-white mb-4">
            ¿Cuánto tiempo y dinero ahorras al mes?
          </h3>
          <p className="text-zinc-400 text-sm sm:text-base font-light mb-8 max-w-xl mx-auto">
            Mueve el control para estimar el número promedio de pedidos que gestionas al día.
          </p>

          {/* Slider */}
          <div className="max-w-md mx-auto mb-10">
            <div className="flex justify-between items-center text-xs font-bold text-zinc-400 mb-2">
              <span>5 pedidos/día</span>
              <span className="text-amber-400 font-extrabold text-lg">{ordersPerDay} pedidos/día</span>
              <span>100+ pedidos/día</span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={ordersPerDay}
              onChange={(e) => setOrdersPerDay(Number(e.target.value))}
              className="w-full accent-amber-500 h-2 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Resultados de la estimación */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            <div className="p-5 rounded-2xl bg-zinc-950/80 border border-white/5">
              <div className="text-amber-400 font-black text-2xl mb-1">
                ~{Math.round(ordersPerDay * 0.4 * 30)} Horas
              </div>
              <p className="text-xs text-zinc-400">
                Ahorradas al mes al no responder precios y disponibilidad uno a uno por chat.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-950/80 border border-white/5">
              <div className="text-emerald-400 font-black text-2xl mb-1">
                Cero Errores
              </div>
              <p className="text-xs text-zinc-400">
                En productos y pedidos gracias al Módulo de Preparación y descuento de stock.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-950/80 border border-white/5">
              <div className="text-blue-400 font-black text-2xl mb-1">
                +{Math.round(ordersPerDay * 12)} Clientes
              </div>
              <p className="text-xs text-zinc-400">
                Fidelizados en tu comunidad de seguidores para compras recurrentes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Preguntas Frecuentes (FAQ) */}
      <section className="relative px-6 py-20 z-10 max-w-4xl mx-auto border-t border-white/5">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-amber-500 text-xs font-black uppercase tracking-[0.2em] mb-2">
            <HelpCircle size={14} /> Respuestas Claras
          </div>
          <h2 className="text-3xl font-light text-white tracking-tight">
            Preguntas Frecuentes de Comerciantes
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-white/5 bg-zinc-950/80 overflow-hidden transition-colors hover:border-white/10"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-zinc-200 hover:text-amber-400 transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  size={18}
                  className={`text-zinc-500 shrink-0 transition-transform ${openFaq === idx ? 'rotate-180 text-amber-400' : ''}`}
                />
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-5 pt-1 text-xs text-zinc-400 font-light leading-relaxed border-t border-white/5">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Gran CTA Final */}
      <section className="relative px-6 py-28 z-10 text-center border-t border-white/5 bg-gradient-to-b from-transparent to-zinc-950">
        <div className="max-w-3xl mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 text-black flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(245,158,11,0.4)]">
            <Zap size={32} className="stroke-[2.5]" />
          </div>

          <h2 className="text-3xl sm:text-5xl font-light text-white mb-6 tracking-tight leading-tight">
            Comienza a digitalizar tu comercio hoy mismo.
          </h2>

          <p className="text-zinc-400 text-base sm:text-lg font-light mb-10 max-w-xl mx-auto">
            Únete a la nueva generación de comercios que gestionan su inventario, pedidos y comunidad desde un solo lugar.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleStartMerchant}
              className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black font-black tracking-widest uppercase text-xs hover:shadow-[0_0_35px_rgba(245,158,11,0.45)] hover:scale-105 transition-all flex items-center justify-center gap-3"
            >
              <Store size={18} />
              {isMerchantLogged ? 'Entrar a mi Panel Comercial' : 'Crear mi Tienda en AxonMarket'}
              <ArrowRight size={18} />
            </button>

            <button
              onClick={() => navigate('/')}
              className="w-full sm:w-auto px-8 py-5 rounded-2xl bg-zinc-900 border border-white/10 text-zinc-300 font-bold tracking-widest uppercase text-xs hover:bg-zinc-800 hover:text-white transition-all"
            >
              Explorar el Marketplace
            </button>
          </div>
        </div>
      </section>

      {/* Footer Minimalista */}
      <footer className="border-t border-white/5 py-8 px-6 text-center text-xs text-zinc-600 bg-black">
        <p>© 2026 AxonMarket. Ecosistema comercial para negocios independientes. Todos los derechos reservados.</p>
      </footer>

    </div>
  );
}
