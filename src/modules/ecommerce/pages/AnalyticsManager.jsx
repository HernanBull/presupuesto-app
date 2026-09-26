import React, { useState, useMemo, useEffect } from 'react';
import { BarChart3, PieChart, ShoppingCart, Mail, Activity, ArrowRight, CheckCircle2, RotateCcw, CalendarDays, DollarSign, Target, TrendingUp, TrendingDown, Layers, Calculator, CreditCard, Factory, LineChart as LineChartIcon, Bot } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import CFOAssistantWizard from '../components/CFOAssistantWizard';

export default function AnalyticsManager() {
  const [activeTab, setActiveTab] = useState('funnel');
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  
  // Data States
  const [salesData, setSalesData] = useState([]);
  const [funnelData, setFunnelData] = useState({ visitors: 0, addedToCart: 0, checkoutStarted: 0, purchases: 0 });
  const [trafficData, setTrafficData] = useState({ org: 0, soc: 0, dir: 0 });
  const [carts, setCarts] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [finData, setFinData] = useState({ revenue: 0, cogs: 0, ordersCount: 0, customersCount: 0 });

  // Financial Config States
  const [finConfig, setFinConfig] = useState({
    marketing: 0,
    fixedCosts: 0,
    equity: 0,
    dso: 0, // Days Sales Outstanding
    dpo: 0, // Days Payable Outstanding
    dio: 0, // Days Inventory Outstanding
    lifespan: 12 // meses
  });

  const workspaceId = localStorage.getItem('activeWorkspace') || 'default_workspace';

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [salesRes, funnelRes, cartsRes, topRes, finRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}/api/ecommerce/analytics/sales-by-date?workspaceId=${workspaceId}&range=${timeRange}`),
        fetch(`${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}/api/ecommerce/analytics/funnel?workspaceId=${workspaceId}&range=${timeRange}`),
        fetch(`${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}/api/ecommerce/analytics/abandoned-carts?workspaceId=${workspaceId}`),
        fetch(`${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}/api/ecommerce/analytics/top-products?workspaceId=${workspaceId}&range=${timeRange}`),
        fetch(`${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}/api/ecommerce/analytics/financials?workspaceId=${workspaceId}&range=${timeRange}`)
      ]);
      
      if (salesRes.ok) setSalesData(await salesRes.json());
      if (funnelRes.ok) {
        const d = await funnelRes.json();
        setFunnelData(d.funnel || { visitors: 0, addedToCart: 0, checkoutStarted: 0, purchases: 0 });
        setTrafficData(d.traffic || { org: 0, soc: 0, dir: 0 });
      }
      if (cartsRes.ok) setCarts(await cartsRes.json());
      if (topRes.ok) setTopProducts(await topRes.json());
      if (finRes.ok) setFinData(await finRes.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAnalytics();
    // Load finConfig from localstorage
    const saved = localStorage.getItem(`fin_config_${workspaceId}`);
    if (saved) {
      try { setFinConfig(JSON.parse(saved)); } catch(e){}
    }
  }, [workspaceId, timeRange]);

  const saveFinConfig = (newConfig) => {
    setFinConfig(newConfig);
    localStorage.setItem(`fin_config_${workspaceId}`, JSON.stringify(newConfig));
  };

  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    saveFinConfig({ ...finConfig, [name]: Number(value) || 0 });
  };

  // Funnel Calculations
  const visitors = funnelData.visitors || 0;
  const addedToCart = funnelData.addedToCart || 0;
  const checkoutStarted = funnelData.checkoutStarted || 0;
  const purchases = funnelData.purchases || 0;
  const rateAddToCart = visitors > 0 ? ((addedToCart / visitors) * 100).toFixed(1) : "0.0";
  const rateCheckout = addedToCart > 0 ? ((checkoutStarted / addedToCart) * 100).toFixed(1) : "0.0";
  const ratePurchase = checkoutStarted > 0 ? ((purchases / checkoutStarted) * 100).toFixed(1) : "0.0";

  // Abandoned Carts Calculation
  const { lostRevenue, recoveredRevenue } = useMemo(() => {
    return carts.reduce((acc, cart) => {
      if (cart.status === 'Recuperado') acc.recoveredRevenue += cart.total;
      else acc.lostRevenue += cart.total;
      return acc;
    }, { lostRevenue: 0, recoveredRevenue: 0 });
  }, [carts]);

  // Financial Metrics Calculations
  const rev = Number(finData.revenue) || 0;
  const cogs = Number(finData.cogs) || 0;
  const mkt = Number(finConfig.marketing) || 0;
  const fc = Number(finConfig.fixedCosts) || 0;
  
  const grossProfit = rev - cogs;
  const grossMargin = rev > 0 ? (grossProfit / rev) * 100 : 0;
  
  const contributionMargin = rev - cogs - mkt; 
  const contributionMarginPct = rev > 0 ? (contributionMargin / rev) * 100 : 0;
  
  const netIncome = rev - cogs - mkt - fc;
  const netMargin = rev > 0 ? (netIncome / rev) * 100 : 0;
  
  const breakEvenPoint = contributionMarginPct > 0 ? (fc / (contributionMarginPct / 100)) : 0;
  
  const ticketPromedio = finData.ordersCount > 0 ? (rev / finData.ordersCount) : 0;
  const cac = finData.customersCount > 0 ? (mkt / finData.customersCount) : 0;
  
  // LTV = Ticket Promedio * (Ventas Totales / Clientes Unicos) * lifespan
  const avgPurchasesPerCustomer = finData.customersCount > 0 ? (finData.ordersCount / finData.customersCount) : 1;
  const ltv = ticketPromedio * avgPurchasesPerCustomer * (finConfig.lifespan || 12);
  
  const operatingCashFlow = netIncome; // Simplified
  
  const ccc = (finConfig.dio || 0) + (finConfig.dso || 0) - (finConfig.dpo || 0);
  
  const roe = finConfig.equity > 0 ? (netIncome / finConfig.equity) * 100 : 0;

  // Render Functions
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Analítica e Inteligencia Financiera</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Métricas de conversión, inteligencia de negocio y salud financiera.</p>
        </div>
        <select 
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 dark:text-white focus:outline-none"
        >
          <option value="7d">Últimos 7 días</option>
          <option value="30d">Últimos 30 días</option>
          <option value="year">Este año</option>
        </select>
      </div>

      <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
        <button onClick={() => setActiveTab('funnel')} className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-colors ${activeTab === 'funnel' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>Embudo de Ventas</button>
        <button onClick={() => setActiveTab('products')} className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-colors ${activeTab === 'products' ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>Inteligencia de Productos</button>
        <button onClick={() => setActiveTab('finance')} className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-colors ${activeTab === 'finance' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>Métricas Financieras (CFO)</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-slate-400"><Activity className="animate-spin" size={32} /></div>
      ) : (
        <>
          {activeTab === 'funnel' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0 relative z-10">
                  <div className="w-full md:w-1/4 text-center">
                    <div className="h-24 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center border-b-4 border-indigo-500 mx-4"><span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{visitors.toLocaleString()}</span></div>
                    <p className="text-sm font-bold mt-3">Visitantes Únicos</p>
                  </div>
                  <ArrowRight className="hidden md:block text-slate-300 dark:text-slate-700" />
                  <div className="w-full md:w-1/4 text-center">
                    <div className="h-20 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center border-b-4 border-blue-500 mx-8"><span className="text-2xl font-black text-blue-600 dark:text-blue-400">{addedToCart.toLocaleString()}</span></div>
                    <p className="text-sm font-bold mt-3">Añadieron al Carrito</p>
                    <p className="text-[10px] font-bold text-emerald-500">{rateAddToCart}% conv.</p>
                  </div>
                  <ArrowRight className="hidden md:block text-slate-300 dark:text-slate-700" />
                  <div className="w-full md:w-1/4 text-center">
                    <div className="h-16 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center border-b-4 border-violet-500 mx-12"><span className="text-2xl font-black text-violet-600 dark:text-violet-400">{checkoutStarted.toLocaleString()}</span></div>
                    <p className="text-sm font-bold mt-3">Iniciaron Pago</p>
                    <p className="text-[10px] font-bold text-emerald-500">{rateCheckout}% conv.</p>
                  </div>
                  <ArrowRight className="hidden md:block text-slate-300 dark:text-slate-700" />
                  <div className="w-full md:w-1/4 text-center">
                    <div className="h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center border-b-4 border-emerald-500 mx-16 shadow-[0_0_15px_rgba(16,185,129,0.3)]"><span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{purchases.toLocaleString()}</span></div>
                    <p className="text-sm font-bold mt-3">Compras</p>
                    <p className="text-[10px] font-bold text-emerald-500">{ratePurchase}% conv.</p>
                  </div>
                </div>
              </section>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                  <h3 className="font-bold mb-6 flex items-center gap-2"><PieChart size={18}/> Fuentes de Tráfico</h3>
                  <div className="space-y-6">
                     <div>
                       <div className="flex justify-between text-sm mb-1"><span className="font-bold">Orgánico / Google</span><span>{trafficData.org}%</span></div>
                       <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full"><div className="bg-emerald-500 h-full rounded-full" style={{ width: `${trafficData.org}%` }}></div></div>
                     </div>
                     <div>
                       <div className="flex justify-between text-sm mb-1"><span className="font-bold">Redes Sociales</span><span>{trafficData.soc}%</span></div>
                       <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full"><div className="bg-blue-500 h-full rounded-full" style={{ width: `${trafficData.soc}%` }}></div></div>
                     </div>
                     <div>
                       <div className="flex justify-between text-sm mb-1"><span className="font-bold">Directo / Referidos</span><span>{trafficData.dir}%</span></div>
                       <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full"><div className="bg-violet-500 h-full rounded-full" style={{ width: `${trafficData.dir}%` }}></div></div>
                     </div>
                  </div>
                </section>
                <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                  <h3 className="font-bold mb-6 flex items-center gap-2"><ShoppingCart size={18}/> Carritos en Riesgo</h3>
                  <div className="flex justify-between text-sm mb-4">
                    <span className="text-emerald-500 font-bold">Recuperado: ${recoveredRevenue.toFixed(2)}</span>
                    <span className="text-rose-500 font-bold">Perdido: ${lostRevenue.toFixed(2)}</span>
                  </div>
                  <div className="max-h-[150px] overflow-y-auto space-y-2">
                    {carts.map(c => (
                      <div key={c.id} className="flex justify-between items-center p-3 border border-slate-100 dark:border-slate-800 rounded-lg">
                        <div>
                          <p className="text-xs font-bold">{c.user}</p>
                          <p className={`text-[10px] font-bold ${c.status === 'Recuperado' ? 'text-emerald-500' : 'text-rose-500'}`}>{c.status}</p>
                        </div>
                        <p className="text-sm font-bold">${c.total.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                <h3 className="font-bold mb-6 flex items-center gap-2"><CalendarDays size={18}/> Días con Más Ventas (Resumen Visual)</h3>
                <div className="w-full h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesData}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                      <XAxis dataKey="date" tick={{fontSize: 12}} tickFormatter={(val) => val.substring(5)} stroke="#94a3b8" />
                      <YAxis tick={{fontSize: 12}} stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                      <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorRev)" name="Ingresos ($)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
                <h3 className="font-bold mb-6 flex items-center gap-2"><Target size={18}/> Top Productos por Ingresos</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                  {topProducts.map((p, i) => (
                    <div key={p.id} className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center">
                      <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 flex items-center justify-center font-black text-lg mb-3">#{i+1}</div>
                      <p className="font-bold text-sm mb-1 line-clamp-2">{p.name}</p>
                      <p className="text-xs text-slate-500 mb-2">{p.sales} uds vendidas</p>
                      <p className="text-emerald-600 dark:text-emerald-400 font-black">${p.revenue.toFixed(2)}</p>
                    </div>
                  ))}
                  {topProducts.length === 0 && <p className="text-slate-400 text-sm col-span-5 text-center py-10">No hay suficientes datos.</p>}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 relative">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <h3 className="font-bold flex items-center gap-2"><Calculator size={18}/> Configurador Operativo</h3>
                  <button 
                    onClick={() => setIsWizardOpen(true)}
                    className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/30 transition-all w-full sm:w-auto justify-center"
                  >
                    <Bot size={18} /> Entender mis métricas
                  </button>
                </div>
                <p className="text-xs text-slate-500 mb-6 max-w-2xl">Ingresa tus datos operativos del periodo para calcular con precisión métricas como CAC, ROE y Flujo de Efectivo.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Gasto en Marketing ($)</label>
                    <input type="number" name="marketing" value={finConfig.marketing} onChange={handleConfigChange} className="mt-1 w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm font-bold" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Costos Fijos Operativos ($)</label>
                    <input type="number" name="fixedCosts" value={finConfig.fixedCosts} onChange={handleConfigChange} className="mt-1 w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm font-bold" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Patrimonio / Inversión ($)</label>
                    <input type="number" name="equity" value={finConfig.equity} onChange={handleConfigChange} className="mt-1 w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm font-bold" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Días Promedio en Cobrar (DSO)</label>
                    <input type="number" name="dso" value={finConfig.dso} onChange={handleConfigChange} className="mt-1 w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm font-bold" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Días Promedio en Pagar (DPO)</label>
                    <input type="number" name="dpo" value={finConfig.dpo} onChange={handleConfigChange} className="mt-1 w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm font-bold" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Días de Inventario (DIO)</label>
                    <input type="number" name="dio" value={finConfig.dio} onChange={handleConfigChange} className="mt-1 w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm font-bold" />
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard title="Ticket Promedio" value={`$${ticketPromedio.toFixed(2)}`} desc="Ingresos / Pedidos" icon={<ShoppingCart size={16}/>} />
                <MetricCard title="Margen Bruto" value={`${grossMargin.toFixed(1)}%`} desc="(Ingresos - COGS) / Ingresos" icon={<TrendingUp size={16}/>} />
                <MetricCard title="M. Contribución" value={`${contributionMarginPct.toFixed(1)}%`} desc="Tras Restar Marketing" icon={<Layers size={16}/>} />
                <MetricCard title="Margen Neto" value={`${netMargin.toFixed(1)}%`} desc="Ganancia Real (Tras CF)" icon={<DollarSign size={16}/>} color={netMargin >= 0 ? 'text-emerald-500' : 'text-rose-500'} />
                
                <MetricCard title="Pto. de Equilibrio" value={`$${breakEvenPoint.toFixed(2)}`} desc="Para cubrir costos fijos" icon={<Target size={16}/>} />
                <MetricCard title="C.A.C." value={`$${cac.toFixed(2)}`} desc="Costo Adquisición Cliente" icon={<Activity size={16}/>} />
                <MetricCard title="L.T.V." value={`$${ltv.toFixed(2)}`} desc="Valor Vida (Anualizado)" icon={<LineChartIcon size={16}/>} />
                <MetricCard title="R.O.E." value={`${roe.toFixed(1)}%`} desc="Retorno sobre Patrimonio" icon={<TrendingUp size={16}/>} color={roe >= 0 ? 'text-emerald-500' : 'text-rose-500'} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col justify-center items-center text-center">
                   <h3 className="text-slate-400 font-bold text-sm mb-2">Flujo de Efectivo Operativo</h3>
                   <p className={`text-4xl font-black ${operatingCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>${operatingCashFlow.toFixed(2)}</p>
                   <p className="text-xs text-slate-500 mt-2">Dinero real generado (Ingresos - COGS - MKT - CF)</p>
                </div>
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 flex flex-col justify-center items-center text-center">
                   <h3 className="text-slate-400 font-bold text-sm mb-2">Ciclo de Conversión (Efectivo)</h3>
                   <p className="text-4xl font-black text-violet-400">{ccc} días</p>
                   <p className="text-xs text-slate-500 mt-2">Días que tarda el inventario en volverse liquidez (DIO + DSO - DPO).</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <CFOAssistantWizard 
        isOpen={isWizardOpen} 
        onClose={() => setIsWizardOpen(false)} 
        data={{
          rev, cogs, mkt, fc, grossMargin, netMargin, breakEvenPoint, cac, ltv
        }}
      />
    </div>
  );
}

function MetricCard({ title, value, desc, icon, color = 'text-slate-800 dark:text-white' }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:border-indigo-500/50 transition-colors">
      <div className="flex items-center gap-2 text-slate-500 mb-2">
        {icon} <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
      </div>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="text-[10px] font-medium text-slate-400 mt-1">{desc}</p>
    </div>
  );
}
