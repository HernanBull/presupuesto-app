import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Package, ShoppingCart, TrendingUp, AlertTriangle, 
  ArrowUpRight, Activity, ShoppingBag, Eye, EyeOff, ExternalLink, Plus, MoreHorizontal, 
  FileText, Banknote, UserPlus, ChevronRight, BarChart2, X,
  Rocket, PackageSearch, Tag, Users, Building2, Settings, Wallet, Flame, Compass
} from 'lucide-react';
import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { supabase } from '../../../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function EcommerceDashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState({ 
    revenue: 0, orders: 0, aov: 0, products: 0, 
    revenueChange: 0, ordersChange: 0, aovChange: 0, productsChange: 0 
  });
  const [topSellers, setTopSellers] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [lowStockCount, setLowStockCount] = useState(0);
  const [bcvRate, setBcvRate] = useState(888.89);

  // Ocultar montos / divisas (tipo app bancaria)
  const [hideFinancials, setHideFinancials] = useState(() => {
    return localStorage.getItem('hide_dashboard_amounts') === 'true';
  });

  const toggleHideFinancials = () => {
    setHideFinancials(prev => {
      const next = !prev;
      localStorage.setItem('hide_dashboard_amounts', String(next));
      return next;
    });
  };

  // Estados específicos para la vista móvil estilo Commercy (en Naranja Corporativo)
  const [storeInfo, setStoreInfo] = useState(() => {
    const rawStore = localStorage.getItem('merchant_store_name') || 'Mi Comercio';
    const rawOwner = localStorage.getItem('merchant_owner_name') || '';
    const validOwner = (rawOwner && rawOwner.toLowerCase() !== rawStore.toLowerCase()) ? rawOwner : '';
    return { 
      name: rawStore, 
      slug: localStorage.getItem('storeSlug') || '',
      merchantName: validOwner
    };
  });
  const [mobilePeriod, setMobilePeriod] = useState('today'); // 'today' | 'month'
  const [todayMetrics, setTodayMetrics] = useState({
    sales: 0,
    orders: 0,
    pendingOrders: 0,
    aov: 0,
    vsYesterdayPercent: 0
  });
  const [monthMetrics, setMonthMetrics] = useState({
    sales: 0,
    orders: 0,
    aov: 0
  });
  const [newCustomersCount, setNewCustomersCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState([]);
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);

  // Saludo dinámico según la hora local — Utiliza el Nombre del Comerciante (no de la tienda)
  const getGreeting = () => {
    const hour = new Date().getHours();
    const candidate = storeInfo.merchantName && storeInfo.merchantName.toLowerCase() !== (storeInfo.name || '').toLowerCase()
      ? storeInfo.merchantName
      : (localStorage.getItem('merchant_owner_name') || '');
    
    const finalName = (candidate && candidate.toLowerCase() !== (storeInfo.name || '').toLowerCase())
      ? candidate
      : 'Comerciante';

    const firstName = finalName.trim().split(' ')[0];
    if (hour < 12) return `Buenos días, ${firstName}`;
    if (hour < 19) return `Buenas tardes, ${firstName}`;
    return `Buenas noches, ${firstName}`;
  };

  // Cargar datos para la vista Desktop y Móvil
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const workspaceId = localStorage.getItem('activeWorkspace');
        if (!workspaceId) return;

        // 1. Datos de la tienda y resolución del nombre del comerciante
        const { data: wsData } = await supabase
          .from('workspaces')
          .select('name, store_slug, config')
          .eq('id', workspaceId)
          .maybeSingle();
        if (wsData) {
          const rawSlug = wsData.store_slug || localStorage.getItem('storeSlug') || '';
          const rawName = wsData.name || localStorage.getItem('merchant_store_name') || 'Mi Comercio';
          
          let ownerName = localStorage.getItem('merchant_owner_name') || '';
          if (!ownerName || ownerName.toLowerCase() === rawName.toLowerCase()) {
            ownerName = wsData.config?.ownerName || 
                        wsData.config?.expediente?.ownerName || 
                        wsData.config?.contact?.name || 
                        wsData.config?.adminName || '';
          }

          if (!ownerName || ownerName.toLowerCase() === rawName.toLowerCase()) {
            const { data: contact } = await supabase
              .from('merchant_contacts')
              .select('full_name')
              .eq('id', workspaceId)
              .maybeSingle();
            if (contact?.full_name && contact.full_name.toLowerCase() !== rawName.toLowerCase()) {
              ownerName = contact.full_name;
            }
          }

          if (!ownerName || ownerName.toLowerCase() === rawName.toLowerCase()) {
            const { data: { user } } = await supabase.auth.getUser();
            const userMetaName = user?.user_metadata?.full_name || user?.user_metadata?.name || '';
            if (userMetaName && userMetaName.toLowerCase() !== rawName.toLowerCase()) {
              ownerName = userMetaName;
            }
          }

          if (ownerName && ownerName.toLowerCase() !== rawName.toLowerCase()) {
            localStorage.setItem('merchant_owner_name', ownerName);
          }

          if (wsData.store_slug) localStorage.setItem('storeSlug', wsData.store_slug);
          if (wsData.name) localStorage.setItem('merchant_store_name', wsData.name);

          setStoreInfo({ 
            name: rawName, 
            slug: rawSlug,
            merchantName: ownerName || ''
          });

          // Extraer tasa BCV configurada o consultar API oficial
          if (wsData?.config?.bcvRate) {
            setBcvRate(Number(wsData.config.bcvRate));
          }
          fetch('https://axonmarket-api.onrender.com/api/bcv')
            .then(res => res.json())
            .then(bcvRes => {
              if (bcvRes?.rate && !wsData?.config?.manualBcv) {
                setBcvRate(Number(bcvRes.rate));
              }
            })
            .catch(() => {});
        }

        // 2. Fechas de cálculo
        const now = new Date();
        const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        const startYesterday = new Date(startToday);
        startYesterday.setDate(startYesterday.getDate() - 1);
        const yesterdaySameTime = new Date(now);
        yesterdaySameTime.setDate(yesterdaySameTime.getDate() - 1);

        const startMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

        // Date ranges para gráfica desktop
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

        // Consulta de órdenes completa
        const { data: currentOrders } = await supabase
          .from('ecommerce_orders_v2')
          .select('*')
          .eq('workspace_id', workspaceId)
          .gte('date', start.toISOString())
          .neq('status', 'Cancelado')
          .order('date', { ascending: false });

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

        // 3. Métricas precisas para Vista Móvil (Hoy vs Ayer vs Este Mes)
        const todayOrders = curOrders.filter(o => {
          const t = new Date(o.date).getTime();
          return t >= startToday.getTime() && t <= endToday.getTime();
        });

        const yesterdayOrders = prvOrders.filter(o => {
          const t = new Date(o.date).getTime();
          return t >= startYesterday.getTime() && t <= yesterdaySameTime.getTime();
        });

        const tSales = todayOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
        const ySales = yesterdayOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
        const pendingCount = todayOrders.filter(o => o.status === 'Pendiente').length;
        const tAov = todayOrders.length > 0 ? tSales / todayOrders.length : 0;
        const vsYesterday = ySales === 0 ? (tSales > 0 ? 100 : 0) : ((tSales - ySales) / ySales) * 100;

        setTodayMetrics({
          sales: tSales,
          orders: todayOrders.length,
          pendingOrders: pendingCount,
          aov: tAov,
          vsYesterdayPercent: vsYesterday
        });

        const monthOrders = curOrders.filter(o => {
          return new Date(o.date).getTime() >= startMonth.getTime();
        });
        const mSales = monthOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
        const mAov = monthOrders.length > 0 ? mSales / monthOrders.length : 0;

        setMonthMetrics({
          sales: mSales,
          orders: monthOrders.length,
          aov: mAov
        });

        // 4. Últimas ventas para el feed móvil
        setRecentOrders(curOrders.slice(0, 4));

        // 5. Clientes nuevos de este mes (exclusivos de este comercio)
        const uniqueCustomers = new Set();
        curOrders.forEach(o => {
          const custIdentifier = (o.customer_email || o.customer || '').trim().toLowerCase();
          if (custIdentifier && custIdentifier !== 'consumidor final' && custIdentifier !== 'cliente general' && custIdentifier !== 'cliente') {
            uniqueCustomers.add(custIdentifier);
          }
        });
        setNewCustomersCount(uniqueCustomers.size);

        // 6. Gráfico Desktop
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

        // 7. Top Sellers
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

        // 8. Low Stock
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

  const storeSlug = storeInfo.slug || localStorage.getItem('storeSlug') || '';
  const storeUrl = storeSlug ? `/${storeSlug}` : '/';

  const stats = [
    { 
      title: 'Ventas Totales', 
      value: hideFinancials ? '••••' : `$${(summary.revenue || 0).toFixed(2)}`, 
      subValue: hideFinancials ? '••••' : `Bs. ${((summary.revenue || 0) * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: formatChange(summary.revenueChange), 
      icon: DollarSign, 
      color: 'text-emerald-500', 
      bg: 'bg-emerald-50 dark:bg-emerald-500/10' 
    },
    { title: 'Pedidos', value: (summary.orders || 0).toString(), change: formatChange(summary.ordersChange), icon: ShoppingCart, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10' },
    { title: 'Productos', value: (summary.products || 0).toString(), change: formatChange(summary.productsChange), icon: Package, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    { title: 'Ticket Promedio', value: hideFinancials ? '••••' : `$${(summary.aov || 0).toFixed(2)}`, change: formatChange(summary.aovChange), icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  ];

  // Variables para la vista móvil
  const currentSales = mobilePeriod === 'today' ? todayMetrics.sales : monthMetrics.sales;
  const currentSalesVes = currentSales * bcvRate;
  const currentOrdersCount = mobilePeriod === 'today' ? todayMetrics.orders : monthMetrics.orders;
  const currentAov = mobilePeriod === 'today' ? todayMetrics.aov : monthMetrics.aov;
  const comparisonText = mobilePeriod === 'today' 
    ? `${todayMetrics.vsYesterdayPercent >= 0 ? '↑' : '↓'} ${Math.abs(todayMetrics.vsYesterdayPercent).toFixed(0)}% vs. ayer a esta hora`
    : `${summary.revenueChange >= 0 ? '↑' : '↓'} ${Math.abs(summary.revenueChange).toFixed(0)}% vs. mes anterior`;

  return (
    <div className="w-full min-h-screen bg-[#f4f7fb] dark:bg-black font-sans">
      
      {/* ========================================================
          VISTA MÓVIL: ESTÉTICA COMMERCY EN NARANJA CORPORATIVO (IMAGE 1)
          ======================================================== */}
      <div className="block md:hidden pb-12">
        
        {/* HERO CARD NARANJA CORPORATIVO */}
        <div className="bg-gradient-to-b from-[#ea580c] via-[#f97316] to-[#ea580c] text-white pt-4 pb-12 px-5 relative overflow-hidden shadow-lg">
          
          {/* Resplandor decorativo de fondo */}
          <div className="absolute -top-16 -right-16 w-52 h-52 bg-amber-300/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 -left-12 w-40 h-40 bg-orange-700/30 rounded-full blur-2xl pointer-events-none" />

          {/* Fila Superior: Badge Tienda, Atajo a Mercado General y Ocultar/Mostrar Divisas */}
          <div className="flex items-center justify-between mb-4 relative z-10 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(storeUrl)}
                className="flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur-md px-3.5 py-1.5 rounded-full cursor-pointer transition-all active:scale-95 border border-white/20 shadow-xs text-white"
                title={`Ir a la tienda virtual: ${storeInfo.name}`}
              >
                <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-orange-600 shadow-2xs shrink-0">
                  <ShoppingBag size={11} strokeWidth={2.5} />
                </div>
                <span className="text-xs font-black tracking-wide truncate max-w-[130px] sm:max-w-[170px]">{storeInfo.name}</span>
                <ExternalLink size={11} className="text-white/80 shrink-0" />
              </button>

              {/* Botón Atajo al Mercado General */}
              <button
                type="button"
                onClick={() => navigate('/explorar')}
                className="flex items-center gap-1.5 bg-amber-400/25 hover:bg-amber-400/35 backdrop-blur-md px-3 py-1.5 rounded-full cursor-pointer transition-all active:scale-95 border border-amber-300/40 shadow-xs text-white"
                title="Ir al Mercado General de AxonMarket (Explorar Comercios y Publicaciones)"
              >
                <Compass size={13} className="text-amber-300 shrink-0" />
                <span className="text-xs font-black tracking-wide">Mercado</span>
              </button>
            </div>

            <button
              onClick={toggleHideFinancials}
              className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md flex items-center justify-center text-white transition-all active:scale-95 border border-white/20 shadow-xs cursor-pointer"
              title={hideFinancials ? "Mostrar cifras y divisas" : "Ocultar cifras y divisas"}
            >
              {hideFinancials ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          {/* Saludo */}
          <p className="text-white/85 text-sm font-semibold mb-3 relative z-10">
            {getGreeting()}
          </p>

          {/* Filtros: Hoy | Este mes */}
          <div className="flex items-center gap-2 mb-5 relative z-10">
            <button
              onClick={() => setMobilePeriod('today')}
              className={`px-4 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                mobilePeriod === 'today'
                  ? 'bg-white text-orange-600 shadow-md scale-105'
                  : 'bg-white/15 text-white/90 hover:bg-white/25 backdrop-blur-sm'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setMobilePeriod('month')}
              className={`px-4 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                mobilePeriod === 'month'
                  ? 'bg-white text-orange-600 shadow-md scale-105'
                  : 'bg-white/15 text-white/90 hover:bg-white/25 backdrop-blur-sm'
              }`}
            >
              Este mes
            </button>
          </div>

          {/* Métrica Hero Principal: Vendiste hoy / Vendiste este mes */}
          <div className="mb-6 relative z-10">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-white/80 uppercase tracking-wider">
                {mobilePeriod === 'today' ? 'Vendiste hoy' : 'Vendiste este mes'}
              </p>
              {bcvRate > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm border border-white/20">
                  Tasa BCV: {bcvRate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs/$
                </span>
              )}
            </div>

            {/* Monto en Divisas ($) */}
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="text-2xl font-black font-mono text-white/90">$</span>
              <h2 className="text-5xl font-black font-mono tracking-tight text-white leading-none">
                {hideFinancials ? '••••' : currentSales.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </h2>
            </div>

            {/* Conversión Oficial a Bolívares (Bs.) */}
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-xs font-bold text-white/75 uppercase tracking-wide">Equivalente:</span>
              <span className="text-lg font-black font-mono text-white tracking-tight drop-shadow-xs">
                {hideFinancials ? '••••••••' : `Bs. ${currentSalesVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </span>
            </div>
            
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white text-[11px] font-bold border border-white/10">
              <ArrowUpRight size={13} className="text-emerald-300" />
              <span>{comparisonText}</span>
            </div>
          </div>

          {/* Fila de Botones de Acción (Nueva venta | Caja Maestra | ...) */}
          <div className="flex items-center gap-2 relative z-10">
            <button
              onClick={() => navigate('/pos')}
              className="flex-1 py-3 px-3 bg-white text-orange-600 hover:bg-orange-50 font-black rounded-2xl shadow-lg shadow-black/15 flex items-center justify-center gap-1.5 active:scale-95 transition-all text-xs cursor-pointer truncate"
            >
              <ShoppingCart size={16} strokeWidth={2.5} className="shrink-0" />
              <span>Nueva venta</span>
            </button>

            <button
              onClick={() => navigate('/cash-master')}
              className="py-3 px-3 bg-white/20 hover:bg-white/30 text-white font-black rounded-2xl backdrop-blur-md border border-white/25 flex items-center justify-center gap-1.5 active:scale-95 transition-all text-xs cursor-pointer shadow-xs shrink-0"
              title="Caja Maestra & Turnos"
            >
              <Wallet size={16} strokeWidth={2.5} className="text-amber-300" />
              <span>Caja Maestra</span>
            </button>

            <button
              onClick={() => setIsMoreActionsOpen(true)}
              className="py-3 px-2.5 bg-white/20 hover:bg-white/30 text-white rounded-2xl backdrop-blur-md border border-white/25 flex items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xs shrink-0"
              title="Más opciones de gestión"
            >
              <MoreHorizontal size={17} />
            </button>
          </div>

        </div>

        {/* CONTENEDOR BLANCO INFERIOR (ESTILO COMMERCY SHEET) */}
        <div className="bg-[#f4f7fb] dark:bg-black rounded-t-[32px] -mt-6 pt-6 px-4 pb-24 relative z-10 shadow-2xl space-y-6">
          
          {/* SECCIÓN 1: Hoy en números */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 px-1">
              {mobilePeriod === 'today' ? 'Hoy en números' : 'Este mes en números'}
            </h4>

            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xs divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">
              {/* Item 1: Pedidos */}
              <div 
                onClick={() => navigate('/orders')}
                className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <FileText size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">Pedidos</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{todayMetrics.pendingOrders} pendientes</p>
                  </div>
                </div>
                <span className="text-xl font-black font-mono text-slate-900 dark:text-white">
                  {currentOrdersCount}
                </span>
              </div>

              {/* Item 2: Ticket promedio */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Banknote size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">Ticket promedio</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">sobre {currentOrdersCount} ventas</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-sm font-bold text-slate-500 dark:text-slate-400">$</span>
                  <span className="text-xl font-black font-mono text-slate-900 dark:text-white">
                    {hideFinancials ? '••••' : currentAov.toFixed(0)}
                  </span>
                </div>
              </div>

              {/* Item 3: Clientes nuevos */}
              <div 
                onClick={() => navigate('/customers')}
                className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <UserPlus size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight">Clientes nuevos</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">este mes</p>
                  </div>
                </div>
                <span className="text-xl font-black font-mono text-slate-900 dark:text-white">
                  {newCustomersCount}
                </span>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: Últimas ventas > */}
          <div>
            <div 
              onClick={() => navigate('/orders')}
              className="flex items-center justify-between mb-3 px-1 cursor-pointer group"
            >
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-orange-600 transition-colors flex items-center gap-1">
                <span>Últimas ventas</span>
                <ChevronRight size={17} className="text-slate-400 group-hover:text-orange-600 group-hover:translate-x-0.5 transition-all" />
              </h4>
              <span className="text-xs font-bold text-orange-600 hover:underline">Ver todas</span>
            </div>

            <div className="space-y-2.5">
              {recentOrders.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 text-center border border-slate-200/80 dark:border-white/10 shadow-xs">
                  <ShoppingCart size={28} className="mx-auto text-slate-300 dark:text-zinc-600 mb-2" />
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">No hay ventas registradas aún</p>
                  <button
                    onClick={() => navigate('/pos')}
                    className="mt-3 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl text-xs font-bold shadow-xs hover:from-orange-600 hover:to-amber-600 transition-all cursor-pointer"
                  >
                    Registrar venta en POS
                  </button>
                </div>
              ) : (
                recentOrders.map((order) => {
                  const customerName = order.customer || 'Consumidor Final';
                  const initials = customerName
                    .split(' ')
                    .filter(Boolean)
                    .map(w => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase() || 'CF';
                  
                  const dObj = new Date(order.dateRaw || order.date);
                  const orderTime = isNaN(dObj.getTime()) 
                    ? '15:28' 
                    : dObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  
                  const payment = order.order_type === 'pos'
                    ? 'Mostrador POS' 
                    : (order.paymentmethod || order.paymentMethod || 'Efectivo');
                  const isDelivered = order.status === 'Entregado';
                  const statusColor = isDelivered 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-amber-600 dark:text-amber-400';

                  return (
                    <div
                      key={order.id}
                      onClick={() => navigate('/orders')}
                      className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center justify-between gap-3 hover:border-orange-300 transition-all cursor-pointer active:scale-99"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-black text-xs flex items-center justify-center shrink-0 border border-amber-200/60 dark:border-amber-800/40">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-slate-800 dark:text-white truncate">
                            {customerName}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            #{order.id.slice(-7)} · {payment} · {orderTime}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black font-mono text-slate-900 dark:text-white">
                          {hideFinancials ? '••••' : `$${Number(order.total || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </p>
                        <p className={`text-[10px] font-bold ${statusColor}`}>
                          {order.status || 'Entregado'}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* SECCIÓN 3: Análisis del período > */}
          <div
            onClick={() => navigate('/analytics')}
            className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center justify-between gap-3 hover:border-orange-300 transition-all cursor-pointer group active:scale-99"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <BarChart2 size={20} />
              </div>
              <div>
                <h5 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-orange-600 transition-colors">
                  Análisis del período
                </h5>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Gráfico, bruto y neto, de 7 a 90 días
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-400 group-hover:text-orange-600 group-hover:translate-x-0.5 transition-all" />
          </div>

        </div>

        {/* MODAL / DRAWER DE ACCIONES RÁPIDAS (BOTÓN ···) */}
        {isMoreActionsOpen && (
          <div 
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end animate-in fade-in"
            onClick={() => setIsMoreActionsOpen(false)}
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 w-full rounded-t-3xl p-5 border-t border-slate-200 dark:border-white/10 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom"
            >
              <div className="w-12 h-1 bg-slate-200 dark:bg-white/20 rounded-full mx-auto" />
              
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">Accesos Rápidos</h3>
                <button 
                  onClick={() => setIsMoreActionsOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { name: 'Puesta en marcha', path: '/setup', icon: Rocket, color: 'text-orange-500' },
                  { name: 'POS Kiosco', path: '/pos', icon: ShoppingCart, color: 'text-emerald-500' },
                  { name: 'Inventario & Stock', path: '/inventory', icon: PackageSearch, color: 'text-blue-500' },
                  { name: 'Precios & Tarifas', path: '/prices', icon: Tag, color: 'text-amber-500' },
                  { name: 'Clientes & CRM', path: '/customers', icon: Users, color: 'text-orange-500' },
                  { name: 'Caja Maestra & Turnos', path: '/cash-master', icon: Wallet, color: 'text-orange-500' },
                  { name: 'Facturación & SENIAT', path: '/invoicing', icon: FileText, color: 'text-cyan-500' },
                  { name: 'Perfil de Tienda', path: '/store-profile', icon: Settings, color: 'text-slate-500' },
                ].map(item => (
                  <button
                    key={item.name}
                    onClick={() => {
                      setIsMoreActionsOpen(false);
                      navigate(item.path);
                    }}
                    className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 hover:bg-orange-50 dark:hover:bg-orange-500/10 border border-slate-200/60 dark:border-white/5 text-left transition-all cursor-pointer"
                  >
                    <item.icon size={18} className={item.color} />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-tight">
                      {item.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================
          VISTA DESKTOP: DASHBOARD INTEGRAL CON GRÁFICOS Y TOP SELLERS
          ======================================================== */}
      <div className="hidden md:block p-6 md:p-10 max-w-7xl mx-auto space-y-8 pb-24 md:pb-8 animate-in fade-in duration-300">
        
        {/* Header Desktop */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Resumen General
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Métricas clave y alertas del rendimiento en tiempo real de tu tienda.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleHideFinancials}
              className="p-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-orange-600 hover:border-orange-500 transition-all shadow-xs cursor-pointer flex items-center gap-2 text-xs font-bold"
              title={hideFinancials ? "Mostrar cifras y divisas" : "Ocultar cifras y divisas"}
            >
              {hideFinancials ? <EyeOff size={16} /> : <Eye size={16} />}
              <span className="hidden sm:inline">{hideFinancials ? "Mostrar cifras" : "Ocultar cifras"}</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Cards in Commercy Style (Desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-white dark:bg-zinc-900 rounded-[1.75rem] p-5 md:p-6 border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400 leading-tight">
                    {stat.title}
                  </p>
                  <h3 className="text-xl md:text-3xl font-extrabold text-slate-900 dark:text-white mt-1.5 tracking-tight">
                    {stat.value}
                  </h3>
                  {stat.subValue && (
                    <p className="text-xs font-bold text-orange-600 dark:text-orange-400 mt-1 font-mono">
                      ≈ {stat.subValue}
                    </p>
                  )}
                </div>
                <div className={`p-2.5 rounded-2xl hidden sm:flex items-center justify-center ${stat.bg} shadow-xs`}>
                  <stat.icon size={20} className={stat.color} />
                </div>
              </div>
              
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className={`text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full ${
                  stat.change.startsWith('+') 
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/60' 
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {stat.change}
                </span>
                <span className="text-[10px] md:text-xs text-slate-400 dark:text-slate-500 font-medium">
                  vs mes anterior
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Accesos Destacados: Análisis del Período & Feed Social (Desktop) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            onClick={() => navigate('/analytics')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[1.75rem] p-5 text-white shadow-md flex items-center justify-between cursor-pointer hover:shadow-lg hover:scale-[1.008] transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-xs">
                <BarChart2 size={24} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-sm sm:text-base tracking-tight text-white">Análisis del Período</h4>
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-white/20 rounded-full">7 a 90 Días</span>
                </div>
                <p className="text-xs text-white/90 mt-0.5">Gráficos de ventas brutas, netas, ticket promedio y rotación de stock</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-white/80 group-hover:translate-x-1 transition-transform shrink-0" />
          </div>

          <div 
            onClick={() => navigate('/social-feed')}
            className="bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 rounded-[1.75rem] p-5 text-white shadow-md flex items-center justify-between cursor-pointer hover:shadow-lg hover:scale-[1.008] transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-xs">
                <Flame size={24} className="text-white fill-white/20" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-sm sm:text-base tracking-tight text-white">Publicaciones & Redes Sociales</h4>
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-white text-rose-600 rounded-full shadow-xs">FEED</span>
                </div>
                <p className="text-xs text-white/90 mt-0.5">Crea posts, sube carruseles de fotos y estados interactivos para tu vitrina</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-white/80 group-hover:translate-x-1 transition-transform shrink-0" />
          </div>
        </div>

        {/* Main Charts & Alerts Area (Desktop) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          
          {/* Gráfico principal */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200/80 dark:border-white/10 shadow-sm p-6 sm:p-7 flex flex-col transition-all">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Ingresos vs Pedidos
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Evolución del flujo comercial
                </p>
              </div>
              <select 
                value={timeRange} 
                onChange={(e) => setTimeRange(e.target.value)} 
                className="bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/40 cursor-pointer shadow-xs"
              >
                <option value="7d">Últimos 7 días</option>
                <option value="30d">Últimos 30 días</option>
                <option value="year">Último año</option>
              </select>
            </div>
            
            <div className="flex-1 min-h-[300px] w-full mt-2 min-w-0 overflow-x-auto overflow-y-hidden scrollbar-hide">
               {loading ? (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                   <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                   <p className="text-xs font-semibold">Analizando datos comerciales...</p>
                 </div>
               ) : salesData.length === 0 ? (
                 <div className="h-full flex items-center justify-center text-slate-400 text-sm">No hay datos en este periodo</div>
               ) : (
                 <div className="min-w-[600px] h-full">
                   <ResponsiveContainer width="100%" height={300}>
                     <ComposedChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                       <defs>
                         <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#ea580c" stopOpacity={0.4}/>
                           <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                         </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.15} />
                       <XAxis dataKey="date" tick={{fontSize: 10, fill: '#64748b'}} tickFormatter={(val) => val.substring(5)} stroke="#cbd5e1" tickLine={false} axisLine={false} dy={10} />
                       <YAxis yAxisId="left" tick={{fontSize: 10, fill: '#64748b'}} stroke="#cbd5e1" tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                       <YAxis yAxisId="right" orientation="right" tick={{fontSize: 10, fill: '#64748b'}} stroke="#cbd5e1" tickLine={false} axisLine={false} hide={true} />
                       <Tooltip 
                         contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid #334155', borderRadius: '16px', color: '#f8fafc', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)' }}
                         itemStyle={{ fontWeight: 600 }}
                         cursor={{ stroke: '#f97316', strokeWidth: 1.5, strokeDasharray: '3 3' }}
                       />
                       <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '15px' }} iconType="circle" />
                       <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#ea580c" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" name="Ingresos ($)" activeDot={{ r: 6, fill: '#ea580c', stroke: '#fff', strokeWidth: 2 }} />
                       <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} name="Pedidos" />
                     </ComposedChart>
                   </ResponsiveContainer>
                 </div>
               )}
            </div>
          </div>

          {/* Alertas y Top Sellers (Desktop) */}
          <div className="space-y-6">
            
            {/* Bajo Stock Alert */}
            {lowStockCount > 0 && (
              <div className="bg-orange-50/60 dark:bg-orange-500/10 rounded-[2rem] border border-orange-200/80 dark:border-orange-500/20 shadow-sm p-6 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10">
                   <AlertTriangle size={64} className="text-orange-500" />
                 </div>
                 <div className="flex items-start gap-3 relative z-10">
                   <div className="p-2.5 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-xl shrink-0">
                     <AlertTriangle size={20} />
                   </div>
                   <div>
                     <h3 className="text-sm font-bold text-orange-950 dark:text-orange-400">Alerta de Inventario</h3>
                     <p className="text-xs text-orange-900/80 dark:text-orange-400/80 mt-1 mb-3">
                       {lowStockCount} producto(s) están por agotarse en la vitrina.
                     </p>
                     <button onClick={() => navigate('/inventory')} className="text-xs font-bold text-orange-700 dark:text-orange-300 bg-white/80 dark:bg-black/30 hover:bg-white dark:hover:bg-black/50 px-3.5 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer">
                       Revisar inventario
                     </button>
                   </div>
                 </div>
              </div>
            )}

            {/* Top Sellers */}
            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200/80 dark:border-white/10 shadow-sm p-6">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-4 flex items-center justify-between">
                Top Ventas
                <button className="p-1.5 text-slate-400 hover:text-orange-500 transition-colors">
                  <ArrowUpRight size={18} />
                </button>
              </h3>
              
              <div className="space-y-4">
                 {loading ? <p className="text-xs font-semibold text-slate-400">Cargando...</p> : topSellers.map((product, idx) => (
                   <div key={product.id} className="flex items-center gap-3">
                     <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${
                       idx === 0 ? 'bg-orange-100 dark:bg-orange-950/40 text-orange-600' : 
                       idx === 1 ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600' : 
                       'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300'
                     }`}>
                       #{idx + 1}
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{product.name}</p>
                       <p className="text-[11px] text-slate-400 truncate">{product.sales} ventas</p>
                     </div>
                     <div className="text-right shrink-0">
                       <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">{hideFinancials ? '••••' : `$${product.revenue.toFixed(2)}`}</p>
                     </div>
                   </div>
                 ))}
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
