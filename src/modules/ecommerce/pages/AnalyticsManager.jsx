import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CalendarDays, DollarSign, Target, TrendingUp, TrendingDown, 
  ArrowLeft, Package, ChevronRight, AlertTriangle, 
  PackagePlus, Sparkles, ShoppingCart, Clock, CheckCircle2,
  Boxes, ArrowUpRight, Flame, Store
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, BarChart, Bar 
} from 'recharts';
import { supabase } from '../../../supabaseClient';

export default function AnalyticsManager() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('30d'); // 'today' | '7d' | '30d' | 'month' | 'custom'
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  // Datos del comercio
  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [inventoryEntries, setInventoryEntries] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [stagnantProducts, setStagnantProducts] = useState([]);
  const [summaryMetrics, setSummaryMetrics] = useState({
    totalRevenue: 0,
    totalUnits: 0,
    ordersCount: 0,
    avgTicket: 0,
    peakDay: null
  });

  const workspaceId = localStorage.getItem('activeWorkspace') || 'default_workspace';

  // Cálculo de fechas según el rango seleccionado
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date(now);

    if (timeRange === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (timeRange === '7d') {
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (timeRange === '30d') {
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    } else if (timeRange === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
    } else if (timeRange === 'custom') {
      if (customStartDate) {
        start = new Date(customStartDate + 'T00:00:00');
      } else {
        start.setDate(now.getDate() - 30);
      }
      if (customEndDate) {
        end = new Date(customEndDate + 'T23:59:59');
      }
    }

    return { startDate: start, endDate: end };
  }, [timeRange, customStartDate, customEndDate]);

  const fetchProductIntelligence = async () => {
    setLoading(true);
    try {
      const startIso = startDate.toISOString();
      const endIso = endDate.toISOString();

      // 1. Obtener órdenes EXCLUSIVAS del comercio con fallback inteligente
      let orders = [];
      const { data: ord2 } = await supabase
        .from('ecommerce_orders_v2')
        .select('*')
        .eq('workspace_id', workspaceId);

      if (Array.isArray(ord2) && ord2.length > 0) {
        orders = ord2;
      } else {
        const { data: ord1 } = await supabase
          .from('ecommerce_orders')
          .select('*')
          .eq('workspace_id', workspaceId);
        if (Array.isArray(ord1)) orders = ord1;
      }

      // 2. Obtener productos del catálogo del comercio
      const { data: allProducts, error: prodErr } = await supabase
        .from('ecommerce_products')
        .select('*')
        .eq('workspace_id', workspaceId);

      const catalog = allProducts || [];

      // Mapa de productos de catálogo por id
      const catalogMap = new Map();
      catalog.forEach(p => {
        const pImages = Array.isArray(p.images) && p.images.length > 0
          ? p.images
          : (p.image_url ? [p.image_url] : []);
        catalogMap.set(p.id, {
          ...p,
          imageUrl: pImages[0] || p.image_url || ''
        });
      });

      // Procesar métricas de ventas y productos
      const salesByDay = {};
      let totalRevenue = 0;
      let totalUnits = 0;
      const productStats = {};

      const validOrders = (orders || []).filter(o => {
        if (o.status === 'Rechazado' || o.status === 'Cancelado') return false;
        const rawDate = o.date || o.created_at;
        if (!rawDate) return true;
        const d = new Date(rawDate);
        return d >= startDate && d <= endDate;
      });

      validOrders.forEach(order => {
        const dateStr = (order.date || '').split('T')[0];
        const orderTotal = Number(order.total) || 0;
        totalRevenue += orderTotal;
        salesByDay[dateStr] = (salesByDay[dateStr] || 0) + orderTotal;

        let items = [];
        try { 
          items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items; 
        } catch(e) {}

        if (Array.isArray(items)) {
          items.forEach(item => {
            const qty = Number(item.quantity) || 1;
            const price = Number(item.price) || 0;
            totalUnits += qty;

            const pKey = item.id || item.name;
            if (!productStats[pKey]) {
              const matchedCatalog = catalogMap.get(item.id);
              productStats[pKey] = {
                id: item.id || pKey,
                name: item.name || 'Producto',
                category: matchedCatalog?.category || item.category || 'General',
                subcategory: matchedCatalog?.subcategory || '',
                imageUrl: matchedCatalog?.imageUrl || item.image || item.imageUrl || '',
                currentStock: matchedCatalog?.stock ?? 'N/D',
                vitrinaStock: matchedCatalog?.stock_vitrina ?? 0,
                unitsSold: 0,
                revenue: 0
              };
            }
            productStats[pKey].unitsSold += qty;
            productStats[pKey].revenue += (price * qty);
          });
        }
      });

      // Generar serie temporal continua completa del período para trazar una curva suave
      const dailyTimeline = [];
      const curr = new Date(startDate);
      const maxDays = 60;
      let dayCount = 0;
      while (curr <= endDate && dayCount < maxDays) {
        const yyyy = curr.getFullYear();
        const mm = String(curr.getMonth() + 1).padStart(2, '0');
        const dd = String(curr.getDate()).padStart(2, '0');
        dailyTimeline.push(`${yyyy}-${mm}-${dd}`);
        curr.setDate(curr.getDate() + 1);
        dayCount++;
      }

      // Asegurar al menos 2 puntos para que Recharts dibuje una curva fluida con pendiente
      if (dailyTimeline.length < 2) {
        const prev = new Date(startDate);
        prev.setDate(prev.getDate() - 1);
        const yyyy = prev.getFullYear();
        const mm = String(prev.getMonth() + 1).padStart(2, '0');
        const dd = String(prev.getDate()).padStart(2, '0');
        dailyTimeline.unshift(`${yyyy}-${mm}-${dd}`);
      }

      const sortedDailySales = dailyTimeline.map(d => ({
        date: d,
        revenue: Number((salesByDay[d] || 0).toFixed(2))
      }));
      setSalesData(sortedDailySales);

      // Calcular pico de ventas (día récord)
      let peak = null;
      let maxRev = 0;
      sortedDailySales.forEach(s => {
        if (s.revenue > maxRev) {
          maxRev = s.revenue;
          peak = s;
        }
      });

      const avgTicket = validOrders.length > 0 ? (totalRevenue / validOrders.length) : 0;
      setSummaryMetrics({
        totalRevenue,
        totalUnits,
        ordersCount: validOrders.length,
        avgTicket,
        peakDay: peak
      });

      // Ranking Top Productos Más Vendidos
      const sortedTop = Object.values(productStats)
        .sort((a, b) => b.unitsSold - a.unitsSold)
        .slice(0, 10);
      setTopProducts(sortedTop);

      // 3. Entradas de Inventario en el Período
      // Identificar productos registrados o que ingresaron en el período
      const entriesInPeriod = catalog.filter(p => {
        if (!p.created_at) return false;
        const entryDate = new Date(p.created_at);
        return entryDate >= startDate && entryDate <= endDate;
      }).map(p => {
        const pImages = Array.isArray(p.images) && p.images.length > 0
          ? p.images
          : (p.image_url ? [p.image_url] : []);
        return {
          id: p.id,
          name: p.name || 'Sin Nombre',
          sku: p.id,
          category: p.category || 'General',
          subcategory: p.subcategory || '',
          imageUrl: pImages[0] || p.image_url || '',
          stock: p.stock || 0,
          stockVitrina: p.stock_vitrina || 0,
          cogs: p.cogs || 0,
          price: p.price || 0,
          supplier: p.supplier || 'Proveedor Local',
          createdAt: p.created_at ? p.created_at.split('T')[0] : 'Hoy'
        };
      }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setInventoryEntries(entriesInPeriod);

      // 4. Alertas de Stock Inteligente
      // Productos con stock bajo (menor o igual a 5 unidades)
      const lowStock = catalog.filter(p => {
        const totalAvail = (Number(p.stock) || 0) + (Number(p.stock_vitrina) || 0);
        return totalAvail <= 5;
      }).map(p => {
        const pImages = Array.isArray(p.images) && p.images.length > 0 ? p.images : (p.image_url ? [p.image_url] : []);
        return {
          id: p.id,
          name: p.name,
          category: p.category || 'General',
          imageUrl: pImages[0] || p.image_url || '',
          stock: p.stock || 0,
          stockVitrina: p.stock_vitrina || 0
        };
      }).slice(0, 6);
      setLowStockProducts(lowStock);

      // Productos estancados (tienen stock pero 0 ventas en el período)
      const soldProductIds = new Set(Object.keys(productStats));
      const stagnant = catalog.filter(p => {
        const hasStock = (Number(p.stock) || 0) > 0 || (Number(p.stock_vitrina) || 0) > 0;
        const noSales = !soldProductIds.has(p.id) && !soldProductIds.has(p.name);
        return hasStock && noSales;
      }).map(p => {
        const pImages = Array.isArray(p.images) && p.images.length > 0 ? p.images : (p.image_url ? [p.image_url] : []);
        return {
          id: p.id,
          name: p.name,
          category: p.category || 'General',
          imageUrl: pImages[0] || p.image_url || '',
          stock: (p.stock || 0) + (p.stock_vitrina || 0),
          cogs: p.cogs || 0,
          tiedUpCapital: ((p.stock || 0) + (p.stock_vitrina || 0)) * (Number(p.cogs) || 0)
        };
      }).slice(0, 6);
      setStagnantProducts(stagnant);

    } catch (e) {
      console.error('Error cargando inteligencia de productos:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductIntelligence();
  }, [workspaceId, timeRange, customStartDate, customEndDate]);

  return (
    <div className="p-3.5 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 pb-32 md:pb-12 font-sans animate-in fade-in duration-300">
      
      {/* ========================================================
          CABECERA PROFESIONAL CON BOTÓN DE RETORNO AL INICIO
          ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="p-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-orange-600 hover:border-orange-400 transition-all cursor-pointer shadow-xs shrink-0 flex items-center justify-center gap-1.5 text-xs font-bold active:scale-95"
            title="Volver a Inicio"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Inicio</span>
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
              <span>Inteligencia de Producto & Ventas</span>
              <Sparkles size={20} className="text-orange-500" />
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Evolución de ventas, rotación de productos y entradas de almacén por fecha.
            </p>
          </div>
        </div>

        {/* ========================================================
            SELECTOR DE PERÍODO & CALENDARIO INTERACTIVO
            ======================================================== */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {[
            { id: 'today', label: 'Hoy' },
            { id: '7d', label: '7 días' },
            { id: '30d', label: '30 días' },
            { id: 'month', label: 'Este mes' },
            { id: 'custom', label: 'Personalizado' },
          ].map(r => (
            <button
              key={r.id}
              onClick={() => setTimeRange(r.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                timeRange === r.id
                  ? 'bg-orange-500 text-white shadow-orange-500/30'
                  : 'bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-orange-300'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rango de Fechas Personalizado (Aparece al seleccionar 'Personalizado') */}
      {timeRange === 'custom' && (
        <div className="bg-orange-50/60 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 p-4 rounded-2xl flex flex-wrap items-center gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-orange-950 dark:text-orange-300">Desde:</span>
            <input 
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-orange-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-orange-950 dark:text-orange-300">Hasta:</span>
            <input 
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-orange-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Filtrando pedidos e inventario en este intervalo exacto.
          </span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
          <div className="w-9 h-9 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold">Analizando productos y ventas del período...</p>
        </div>
      ) : (
        <>
          {/* ========================================================
              TARJETAS RESUMEN DE VENTAS Y PRODUCTOS
              ======================================================== */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-4 shadow-xs">
              <div className="flex items-center gap-1.5 text-slate-400 mb-2">
                <DollarSign size={16} className="text-orange-500" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Ingresos Totales</span>
              </div>
              <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                ${summaryMetrics.totalRevenue.toFixed(2)}
              </p>
              <p className="text-[10px] font-semibold text-slate-400 mt-1">
                {summaryMetrics.ordersCount} ventas en el período
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-4 shadow-xs">
              <div className="flex items-center gap-1.5 text-slate-400 mb-2">
                <Package size={16} className="text-orange-500" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Uds. Despachadas</span>
              </div>
              <p className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                {summaryMetrics.totalUnits}
              </p>
              <p className="text-[10px] font-semibold text-slate-400 mt-1">
                Artículos vendidos
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-4 shadow-xs">
              <div className="flex items-center gap-1.5 text-slate-400 mb-2">
                <ShoppingCart size={16} className="text-orange-500" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Ticket Promedio</span>
              </div>
              <p className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                ${summaryMetrics.avgTicket.toFixed(2)}
              </p>
              <p className="text-[10px] font-semibold text-slate-400 mt-1">
                Por cada cliente/venta
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-4 shadow-xs">
              <div className="flex items-center gap-1.5 text-slate-400 mb-2">
                <Flame size={16} className="text-orange-500" />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Día Récord</span>
              </div>
              <p className="text-2xl font-black font-mono text-orange-600 dark:text-orange-400">
                ${summaryMetrics.peakDay ? summaryMetrics.peakDay.revenue.toFixed(2) : '0.00'}
              </p>
              <p className="text-[10px] font-semibold text-slate-400 mt-1">
                {summaryMetrics.peakDay ? `Fecha: ${summaryMetrics.peakDay.date}` : 'Sin ventas aún'}
              </p>
            </div>
          </div>

          {/* ========================================================
              GRÁFICO: EVOLUCIÓN DE VENTAS DEL PERÍODO
              ======================================================== */}
          <section className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200/80 dark:border-white/10 shadow-xs p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2 text-slate-900 dark:text-white">
                  <TrendingUp size={18} className="text-orange-500" /> Evolución Diaria de Ventas
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Curva de ingresos generados día tras día durante el período seleccionado.
                </p>
              </div>
            </div>

            {salesData.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto mb-3 border border-orange-200 dark:border-orange-500/20 shadow-xs">
                  <CalendarDays size={26} />
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">Sin ventas registradas en este período</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  A medida que registres ventas en el POS o tu vitrina virtual, verás aquí el gráfico de crecimiento diario.
                </p>
              </div>
            ) : (
              <div className="w-full h-[280px] min-w-0">
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ea580c" stopOpacity={0.45}/>
                        <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" opacity={0.15} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10, fill: '#64748b' }} 
                      tickFormatter={(val) => val.substring(5)} 
                      stroke="#cbd5e1" 
                      tickLine={false} 
                      axisLine={false} 
                      dy={10} 
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: '#64748b' }} 
                      stroke="#cbd5e1" 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(val) => `$${val}`} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid #334155', borderRadius: '16px', color: '#fff', fontSize: '12px' }} 
                      formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Venta del Día']}
                      labelFormatter={(label) => `Fecha: ${label}`}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#ea580c" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorRev)" 
                      name="Ingresos ($)" 
                      activeDot={{ r: 6, fill: '#ea580c', stroke: '#fff', strokeWidth: 2 }} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {/* ========================================================
              TOP PRODUCTOS MÁS VENDIDOS (CON FOTO Y RENTABILIDAD)
              ======================================================== */}
          <section className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200/80 dark:border-white/10 shadow-xs p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2 text-slate-900 dark:text-white">
                  <Target size={18} className="text-orange-500" /> Ranking: Productos Más Vendidos
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Artículos con mayor demanda y rotación dentro del período seleccionado.
                </p>
              </div>
            </div>

            {topProducts.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                No hay ventas de productos registradas para este rango de fechas.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {topProducts.map((p, i) => (
                  <div 
                    key={p.id} 
                    className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/5 flex items-center gap-3.5 hover:border-orange-300 transition-all shadow-xs"
                  >
                    {/* Badge de Posición */}
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                      #{i + 1}
                    </div>

                    {/* Foto del Producto */}
                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={20} className="text-slate-400" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-slate-800 dark:text-white truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{p.category} {p.subcategory ? `› ${p.subcategory}` : ''}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400">
                          {p.unitsSold} {p.unitsSold === 1 ? 'ud vendida' : 'uds vendidas'}
                        </span>
                        <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
                          ${p.revenue.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ========================================================
              MÓDULO: ENTRADAS DE INVENTARIO EN EL PERÍODO
              ======================================================== */}
          <section className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200/80 dark:border-white/10 shadow-xs p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2 text-slate-900 dark:text-white">
                  <Boxes size={18} className="text-orange-500" /> Entradas de Productos al Almacén
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Lotes y productos registrados o ingresados al inventario hasta esta fecha.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/inventory')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-100 font-bold text-xs transition-colors cursor-pointer self-start sm:self-auto"
              >
                <PackagePlus size={14} /> + Registrar Nueva Entrada
              </button>
            </div>

            {inventoryEntries.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                No hay ingresos de productos registrados en este rango de fechas.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {inventoryEntries.map(item => (
                  <div 
                    key={item.id} 
                    className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200/60 dark:border-white/5 flex items-center gap-3 hover:border-orange-300 transition-all shadow-xs"
                  >
                    {/* Foto */}
                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={20} className="text-slate-400" />
                      )}
                    </div>

                    {/* Datos */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-bold text-xs text-slate-800 dark:text-white truncate">{item.name}</p>
                        <span className="text-[9px] font-mono font-bold text-slate-400 bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-zinc-700 shrink-0">
                          {item.createdAt}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">{item.category} • Prov: {item.supplier}</p>
                      
                      <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-200/50 dark:border-white/5">
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                          Stock: <strong className="text-slate-900 dark:text-white">{item.stock + item.stockVitrina}</strong> uds
                        </span>
                        <span className="text-[10px] font-black font-mono text-emerald-600 dark:text-emerald-400">
                          Costo: ${Number(item.cogs).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ========================================================
              ALERTAS INTELIGENTES DE STOCK (BAJO STOCK & ESTANCADOS)
              ======================================================== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Tarjeta 1: Próximos a Agotarse */}
            <section className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200/80 dark:border-white/10 shadow-xs p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-sm flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <AlertTriangle size={17} /> Próximos a Agotarse (Stock ≤ 5)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20">
                  {lowStockProducts.length} productos
                </span>
              </div>

              {lowStockProducts.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center font-medium">
                  ¡Excelente! No tienes productos con inventario crítico.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {lowStockProducts.map(p => (
                    <div key={p.id} className="p-3 bg-rose-50/40 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/10 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-white dark:bg-zinc-800 border border-rose-200/60 overflow-hidden shrink-0 flex items-center justify-center">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package size={16} className="text-rose-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{p.name}</p>
                          <p className="text-[10px] text-slate-400">{p.category}</p>
                        </div>
                      </div>
                      <span className="text-xs font-black font-mono text-rose-600 shrink-0">
                        {p.stock + p.stockVitrina} uds disponibles
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Tarjeta 2: Sin Rotación en el Período */}
            <section className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200/80 dark:border-white/10 shadow-xs p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-sm flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Clock size={17} /> Sin Rotación (0 ventas en el período)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                  {stagnantProducts.length} productos
                </span>
              </div>

              {stagnantProducts.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center font-medium">
                  Todo tu inventario con existencia ha registrado movimiento de ventas.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {stagnantProducts.map(p => (
                    <div key={p.id} className="p-3 bg-amber-50/40 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-white dark:bg-zinc-800 border border-amber-200/60 overflow-hidden shrink-0 flex items-center justify-center">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package size={16} className="text-amber-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{p.name}</p>
                          <p className="text-[10px] text-slate-400">{p.category} • Capital inmóvil: ${p.tiedUpCapital.toFixed(2)}</p>
                        </div>
                      </div>
                      <span className="text-xs font-black font-mono text-amber-600 shrink-0">
                        {p.stock} uds en almacén
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>
        </>
      )}

    </div>
  );
}
