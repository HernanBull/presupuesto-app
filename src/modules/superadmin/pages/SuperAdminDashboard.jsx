import React, { useState, useEffect } from 'react';
import { Trash2, Users, Store, ShieldAlert, Loader2, X, Activity, DollarSign, Package, BarChart3, Search, ShoppingBag, EyeOff, Eye, Download, Radio, Key, ArrowRight, Truck, ShieldCheck, ShieldBan, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];

export default function SuperAdminDashboard({ superKey }) {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'merchants', 'customers', 'monitor'
  const [merchants, setMerchants] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [liveOrders, setLiveOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deliveryGroupId, setDeliveryGroupId] = useState('');
  const [drivers, setDrivers] = useState([]);
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Details Modal State
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState(null);

  // Modal State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Key Change State
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [newKeyInput, setNewKeyInput] = useState('');
  const [keyError, setKeyError] = useState('');

  useEffect(() => {
    fetchData();
    setSearchTerm('');
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      if (activeTab === 'dashboard') endpoint = '/api/superadmin/stats';
      else if (activeTab === 'merchants') endpoint = '/api/superadmin/merchants';
      else if (activeTab === 'customers') endpoint = '/api/superadmin/customers';
      else if (activeTab === 'monitor') endpoint = '/api/superadmin/monitor';
      else if (activeTab === 'delivery_bot') {
        const [setRes, drvRes] = await Promise.all([
          fetch(`https://axonmarket-api.onrender.com/api/superadmin/settings`, { headers: { 'x-superadmin-key': superKey } }),
          fetch(`https://axonmarket-api.onrender.com/api/superadmin/drivers`, { headers: { 'x-superadmin-key': superKey } })
        ]);
        if (setRes.ok) { const data = await setRes.json(); setDeliveryGroupId(data.delivery_master_group_id || ''); }
        if (drvRes.ok) { const data = await drvRes.json(); setDrivers(data || []); }
        setLoading(false);
        return;
      }

      const res = await fetch(`https://axonmarket-api.onrender.com${endpoint}`, {
        headers: { 'x-superadmin-key': superKey }
      });
      if (res.ok) {
        const data = await res.json();
        if (activeTab === 'dashboard') setStats(data);
        else if (activeTab === 'merchants') setMerchants(data);
        else if (activeTab === 'customers') setCustomers(data);
        else if (activeTab === 'monitor') setLiveOrders(data);
      } else {
        alert('Error al obtener datos');
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSaveDeliveryGroup = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetch(`https://axonmarket-api.onrender.com/api/superadmin/settings`, {
        method: 'PUT',
        headers: { 'x-superadmin-key': superKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ delivery_master_group_id: deliveryGroupId })
      });
      if (res.ok) alert('Grupo de Telegram guardado exitosamente.');
      else alert('Error al guardar grupo');
    } catch(e) { alert('Error de conexión'); }
    setIsActionLoading(false);
  };

  const handleToggleDriverBan = async (driver) => {
    setIsActionLoading(true);
    const newBannedState = driver.banned ? 0 : 1;
    const confirmMessage = driver.banned 
      ? '✅ ¿Deseas LEVANTAR LA SUSPENSIÓN a este conductor?'
      : '🚨 ¿Estás seguro de que deseas BANEAR a este conductor?';
    
    if (window.confirm(confirmMessage)) {
      try {
        const res = await fetch(`https://axonmarket-api.onrender.com/api/superadmin/drivers/${driver.id}/status`, {
          method: 'PUT',
          headers: { 'x-superadmin-key': superKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ isBanned: newBannedState })
        });
        if (res.ok) fetchData();
        else alert('Error al cambiar estado');
      } catch(e) { alert('Error de conexión'); }
    }
    setIsActionLoading(false);
  };

  const handleDeleteDriver = async (id) => {
    if (window.confirm('🗑️ ¿Deseas eliminar el registro de este conductor?')) {
      setIsActionLoading(true);
      try {
        const res = await fetch(`https://axonmarket-api.onrender.com/api/superadmin/drivers/${id}`, {
          method: 'DELETE',
          headers: { 'x-superadmin-key': superKey }
        });
        if (res.ok) fetchData();
        else alert('Error al eliminar');
      } catch(e) { alert('Error de conexión'); }
      setIsActionLoading(false);
    }
  };

  const handleViewDetails = (item, type) => {
    setSelectedDetails({ ...item, type });
    setIsDetailsOpen(true);
  };

  const handleToggleSuspend = async (merchant) => {
    setIsActionLoading(true);
    const newStatus = merchant.status === 'Suspendido' ? 'Activo' : 'Suspendido';
    try {
      const res = await fetch(`https://axonmarket-api.onrender.com/api/superadmin/merchants/${merchant.id}/status`, {
        method: 'PUT',
        headers: { 
          'x-superadmin-key': superKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchData();
      } else {
        alert('Error al cambiar estado');
      }
    } catch(e) {
      alert('Error de conexión');
    }
    setIsActionLoading(false);
  };

  const handleDeleteClick = (item, type) => {
    setItemToDelete({ ...item, type });
    setConfirmText('');
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (confirmText.trim().toUpperCase() !== 'ELIMINAR') return;
    setIsActionLoading(true);
    try {
      const endpoint = itemToDelete.type === 'merchant' 
        ? `/api/superadmin/merchants/${itemToDelete.id}` 
        : `/api/superadmin/customers/${itemToDelete.id}`;
      
      const res = await fetch(`https://axonmarket-api.onrender.com${endpoint}`, {
        method: 'DELETE',
        headers: { 'x-superadmin-key': superKey }
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setIsConfirmOpen(false);
        fetchData();
      } else {
        alert('Error del servidor: ' + (data.error || 'Desconocido'));
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión con el servidor');
    }
    setIsActionLoading(false);
  };

  const handleChangeKey = async () => {
    if (!newKeyInput || newKeyInput.length < 4) {
      setKeyError('La clave debe tener al menos 4 caracteres');
      return;
    }
    setIsActionLoading(true);
    try {
      const res = await fetch(`https://axonmarket-api.onrender.com/api/superadmin/key`, {
        method: 'PUT',
        headers: { 
          'x-superadmin-key': superKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newKey: newKeyInput })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Clave cambiada exitosamente. Por favor, inicia sesión nuevamente.');
        localStorage.removeItem('superadmin_key');
        window.location.reload();
      } else {
        setKeyError(data.error || 'Error al cambiar la clave');
      }
    } catch(e) {
      setKeyError('Error de conexión');
    }
    setIsActionLoading(false);
  };

  const downloadCSV = () => {
    const dataToExport = activeTab === 'merchants' ? filteredMerchants : filteredCustomers;
    if (!dataToExport || dataToExport.length === 0) return;

    let headers = [];
    if (activeTab === 'merchants') {
      headers = ['ID', 'Nombre', 'Slug', 'Estado', 'Fecha Creacion'];
    } else {
      headers = ['ID', 'Nombre', 'Email', 'Telefono', 'Fecha Registro'];
    }

    const csvRows = [];
    csvRows.push(headers.join(','));

    dataToExport.forEach(item => {
      const row = activeTab === 'merchants' ? [
        item.id,
        `"${item.name}"`,
        item.store_slug || '',
        item.status || 'Activo',
        new Date(item.created_at).toLocaleDateString()
      ] : [
        item.id,
        `"${item.name}"`,
        item.email,
        item.phone || '',
        new Date(item.join_date).toLocaleDateString()
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${activeTab}_export_${new Date().getTime()}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-white/10 p-3 rounded-xl shadow-xl">
          <p className="text-zinc-400 text-xs mb-1 font-bold">{label}</p>
          <p className="text-emerald-400 font-mono font-bold">${payload[0].value.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };
  
  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-white/10 p-3 rounded-xl shadow-xl">
          <p className="text-white text-xs font-bold">{payload[0].name}</p>
          <p className="text-zinc-400 font-mono text-xs">{payload[0].value} pedidos</p>
        </div>
      );
    }
    return null;
  };

  const filteredMerchants = merchants.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (m.store_slug && m.store_slug.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm))
  );

  return (
    <div className="min-h-screen bg-black text-slate-50 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-zinc-950 border-b border-red-500/20 px-8 py-5 flex items-center justify-between sticky top-0 z-40 shadow-[0_4px_30px_rgba(239,68,68,0.1)]">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-red-500/10 text-red-500 rounded-lg">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-widest text-white">Super Admin</h1>
            <p className="text-xs text-red-400 font-bold tracking-widest uppercase">Centro Analítico y Control</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setIsKeyModalOpen(true); setKeyError(''); setNewKeyInput(''); }}
            className="p-2 bg-zinc-900 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Cambiar Clave Maestra"
          >
            <Key size={18} />
          </button>
          <button 
            onClick={() => { localStorage.removeItem('superadmin_key'); window.location.reload(); }}
            className="px-4 py-2 border border-white/10 rounded-full text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors uppercase tracking-widest"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        
        {/* Tabs */}
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`min-w-[140px] flex-1 py-4 px-2 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-all whitespace-nowrap ${
              activeTab === 'dashboard' ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <BarChart3 size={18} /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('monitor')}
            className={`min-w-[140px] flex-1 py-4 px-2 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-all whitespace-nowrap ${
              activeTab === 'monitor' ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <Radio size={18} /> Monitor
          </button>
          <button 
            onClick={() => setActiveTab('delivery_bot')}
            className={`min-w-[140px] flex-1 py-4 px-2 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-all whitespace-nowrap ${
              activeTab === 'delivery_bot' ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <Truck size={18} /> Delivery Bot
          </button>
          <button 
            onClick={() => setActiveTab('merchants')}
            className={`min-w-[140px] flex-1 py-4 px-2 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-all whitespace-nowrap ${
              activeTab === 'merchants' ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <Store size={18} /> Tiendas
          </button>
          <button 
            onClick={() => setActiveTab('customers')}
            className={`min-w-[140px] flex-1 py-4 px-2 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-all whitespace-nowrap ${
              activeTab === 'customers' ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <Users size={18} /> Clientes
          </button>
        </div>

        {/* Content Box */}
        <div className="bg-zinc-950 border border-white/5 rounded-3xl p-6 min-h-[500px]">
          {loading ? (
            <div className="h-full flex items-center justify-center min-h-[400px]">
              <Loader2 size={40} className="animate-spin text-red-500" />
            </div>
          ) : activeTab === 'dashboard' && stats ? (
            <div className="space-y-8">
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center col-span-2 md:col-span-1">
                  <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-full mb-2"><DollarSign size={20} /></div>
                  <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Volumen (GMV)</h3>
                  <p className="text-xl font-mono font-black text-white">${stats.totalGMV.toFixed(2)}</p>
                </div>
                <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center col-span-2 md:col-span-1">
                  <div className="p-2 bg-blue-500/10 text-blue-500 rounded-full mb-2"><Activity size={20} /></div>
                  <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Ticket Prom.</h3>
                  <p className="text-xl font-mono font-black text-white">${stats.aov.toFixed(2)}</p>
                </div>
                <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                  <div className="p-2 bg-amber-500/10 text-amber-500 rounded-full mb-2"><Store size={20} /></div>
                  <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Tiendas</h3>
                  <p className="text-xl font-mono font-black text-white">{stats.totalMerchants}</p>
                </div>
                <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                  <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-full mb-2"><Users size={20} /></div>
                  <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Clientes</h3>
                  <p className="text-xl font-mono font-black text-white">{stats.totalCustomers}</p>
                </div>
                <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                  <div className="p-2 bg-purple-500/10 text-purple-500 rounded-full mb-2"><Package size={20} /></div>
                  <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Pedidos Tot.</h3>
                  <p className="text-xl font-mono font-black text-white">{stats.totalOrders}</p>
                </div>
                <div className="bg-zinc-900 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                  <div className="p-2 bg-pink-500/10 text-pink-500 rounded-full mb-2"><ShoppingBag size={20} /></div>
                  <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Prods. Reg.</h3>
                  <p className="text-xl font-mono font-black text-white">{stats.totalProducts}</p>
                </div>
              </div>

              {/* Main Chart */}
              <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6">
                <h3 className="text-white font-bold uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
                  <Activity size={18} className="text-red-500"/> Ventas Últimos 7 Días
                </h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.salesChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                      <Tooltip content={<CustomTooltip />} cursor={{fill: '#ffffff05'}} />
                      <Bar dataKey="sales" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pie Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6">
                  <h3 className="text-white font-bold uppercase tracking-widest text-sm mb-6 text-center">Métodos de Pago</h3>
                  <div className="h-[200px] w-full">
                    {stats.paymentMethodsChart && stats.paymentMethodsChart.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={stats.paymentMethodsChart} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {stats.paymentMethodsChart.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomPieTooltip />} />
                          <Legend wrapperStyle={{ fontSize: '10px', color: '#a1a1aa' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                       <div className="flex items-center justify-center h-full text-zinc-600 text-sm">Sin datos de pagos</div>
                    )}
                  </div>
                </div>
                
                <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6">
                  <h3 className="text-white font-bold uppercase tracking-widest text-sm mb-6 text-center">Estado de Pedidos</h3>
                  <div className="h-[200px] w-full">
                    {stats.orderStatusesChart && stats.orderStatusesChart.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={stats.orderStatusesChart} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {stats.orderStatusesChart.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomPieTooltip />} />
                          <Legend wrapperStyle={{ fontSize: '10px', color: '#a1a1aa' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                       <div className="flex items-center justify-center h-full text-zinc-600 text-sm">Sin datos de pedidos</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Leaderboards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6">
                  <h3 className="text-white font-bold uppercase tracking-widest text-sm mb-6">Top 5 Tiendas (GMV)</h3>
                  <div className="space-y-4">
                    {stats.topMerchants.map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500">{idx+1}</span>
                          <span className="text-sm font-medium text-white">{m.name}</span>
                        </div>
                        <span className="text-emerald-400 font-mono text-sm">${m.sales.toFixed(2)}</span>
                      </div>
                    ))}
                    {stats.topMerchants.length === 0 && <p className="text-zinc-600 text-sm">Sin datos suficientes</p>}
                  </div>
                </div>
                <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6">
                  <h3 className="text-white font-bold uppercase tracking-widest text-sm mb-6">Top 5 Productos Vendidos</h3>
                  <div className="space-y-4">
                    {stats.topProducts.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500">{idx+1}</span>
                          <span className="text-sm font-medium text-white max-w-[200px] truncate">{p.name}</span>
                        </div>
                        <span className="text-zinc-400 font-mono text-sm">{p.qty} unid.</span>
                      </div>
                    ))}
                    {stats.topProducts.length === 0 && <p className="text-zinc-600 text-sm">Sin datos suficientes</p>}
                  </div>
                </div>
              </div>

            </div>
          ) : activeTab === 'delivery_bot' ? (
            <div className="space-y-8 max-w-4xl mx-auto w-full">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-widest text-white mb-2">Bot de Repartidores</h2>
                <p className="text-zinc-400">Configuración global del ecosistema de delivery de Telegram.</p>
              </div>

              {!deliveryGroupId && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-2xl flex items-center gap-3">
                  <ShieldBan className="w-6 h-6 shrink-0" />
                  <div>
                    <h3 className="font-bold">El motor de envíos requiere configuración</h3>
                    <p className="text-sm text-red-400">Para que el bot pueda despachar viajes, configura el Chat ID global.</p>
                  </div>
                </div>
              )}

              <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-red-500/10 rounded-xl text-red-500">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white uppercase tracking-widest">Grupo Maestro</h2>
                    <p className="text-zinc-500 text-sm">Todas las peticiones irán a este grupo</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <input 
                    type="text" 
                    value={deliveryGroupId} 
                    onChange={(e) => setDeliveryGroupId(e.target.value)}
                    placeholder="Ej. -1001234567890"
                    className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 font-mono"
                  />
                  <button 
                    onClick={handleSaveDeliveryGroup}
                    disabled={!deliveryGroupId || isActionLoading}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2"
                  >
                    {isActionLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Guardar
                  </button>
                </div>
              </div>

              <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white uppercase tracking-widest">Base de Conductores</h2>
                    <p className="text-zinc-500 text-sm">Gestiona los repartidores registrados en el bot</p>
                  </div>
                </div>
                
                {drivers.length === 0 ? (
                  <div className="bg-zinc-950 border border-white/5 p-8 rounded-2xl text-center text-zinc-500">
                    Aún no hay conductores registrados.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {drivers.map(driver => (
                      <div key={driver.id} className={`p-5 rounded-2xl border ${driver.banned ? 'bg-red-950/20 border-red-900/50' : 'bg-zinc-950 border-white/5'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-3 font-bold text-lg text-white mb-1">
                              <span className={driver.banned ? 'line-through text-red-500' : ''}>{driver.name}</span>
                              <span className="text-[10px] font-normal text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                {driver.driver_code}
                              </span>
                              {driver.banned ? (
                                <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">
                                  Suspendido
                                </span>
                              ) : null}
                            </div>
                            <div className="text-sm text-zinc-400 grid grid-cols-2 gap-x-6 gap-y-1 mt-3">
                              <p><b>CI:</b> {driver.cedula}</p>
                              <p><b>Tel:</b> {driver.telefono}</p>
                              <p><b>Moto:</b> {driver.moto} ({driver.placa})</p>
                              <p><b>Agencia:</b> {driver.agencia}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleDeleteDriver(driver.id)}
                              disabled={isActionLoading}
                              className="text-zinc-500 hover:text-orange-500 bg-zinc-900 hover:bg-orange-500/10 p-3 rounded-xl transition-colors flex items-center justify-center disabled:opacity-50"
                              title="Eliminar Registro"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleToggleDriverBan(driver)}
                              disabled={isActionLoading}
                              className={`p-3 rounded-xl transition-colors flex items-center justify-center disabled:opacity-50 ${driver.banned ? 'text-emerald-500 bg-zinc-900 hover:bg-emerald-500/10' : 'text-zinc-500 hover:text-red-500 bg-zinc-900 hover:bg-red-500/10'}`}
                              title={driver.banned ? 'Levantar Suspensión' : 'Suspender Conductor'}
                            >
                              {driver.banned ? <ShieldCheck className="w-5 h-5" /> : <ShieldBan className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'monitor' ? (
            <div className="flex flex-col h-full">
               <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2"><Radio className="text-red-500 animate-pulse" /> Monitor de Pedidos Global</h2>
                  <button onClick={fetchData} className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-xs font-bold uppercase tracking-widest rounded-full transition-colors border border-white/5">
                    Actualizar
                  </button>
               </div>
               <div className="overflow-x-auto flex-1 bg-zinc-900/50 rounded-2xl border border-white/5 p-4">
                 <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Fecha / Hora</th>
                        <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Tienda</th>
                        <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Cliente</th>
                        <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Monto</th>
                        <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500 text-right">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liveOrders.map(order => (
                        <tr key={order.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-4 px-4 text-sm text-zinc-400">{new Date(order.date).toLocaleString()}</td>
                          <td className="py-4 px-4 text-sm font-bold text-emerald-400">{order.workspace_name || 'Desconocida'}</td>
                          <td className="py-4 px-4 text-sm text-white">{order.customer}</td>
                          <td className="py-4 px-4 text-sm font-mono text-white">${order.total.toFixed(2)}</td>
                          <td className="py-4 px-4 text-right">
                             <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                order.status === 'Completado' || order.status === 'Entregado' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                                order.status === 'Cancelado' || order.status === 'Perdido' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                                'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                             }`}>
                               {order.status || 'Pendiente'}
                             </span>
                          </td>
                        </tr>
                      ))}
                      {liveOrders.length === 0 && (
                        <tr>
                          <td colSpan="5" className="py-12 text-center text-zinc-500">No hay pedidos recientes en la plataforma</td>
                        </tr>
                      )}
                    </tbody>
                 </table>
               </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Search Bar & Actions */}
              <div className="mb-6 flex items-center gap-4">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search size={18} className="text-zinc-500" />
                  </div>
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={`Buscar en ${activeTab === 'merchants' ? 'Tiendas' : 'Clientes'}...`}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:border-red-500/50 transition-colors"
                  />
                </div>
                <button 
                  onClick={downloadCSV}
                  className="px-4 py-3 bg-emerald-600/20 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-600/40 rounded-xl font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-all flex items-center gap-2 whitespace-nowrap"
                >
                  <Download size={18} /> Exportar CSV
                </button>
              </div>

              <div className="overflow-x-auto flex-1">
                {/* Tables for Merchants / Customers */}
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500">ID</th>
                      <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Nombre</th>
                      {activeTab === 'merchants' && <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Slug</th>}
                      {activeTab === 'merchants' && <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Estado</th>}
                      {activeTab === 'customers' && <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Email</th>}
                      {activeTab === 'customers' && <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Teléfono</th>}
                      <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Creación</th>
                      <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeTab === 'merchants' ? filteredMerchants : filteredCustomers).map(item => (
                      <tr key={item.id} className={`border-b border-white/5 transition-colors group ${item.status === 'Suspendido' ? 'opacity-50 grayscale hover:grayscale-0' : 'hover:bg-white/5'}`}>
                        <td className="py-4 px-4 text-sm font-mono text-zinc-500">{item.id.substring(0,8)}...</td>
                        <td className="py-4 px-4 text-sm font-bold text-white">{item.name}</td>
                        {activeTab === 'merchants' && <td className="py-4 px-4 text-sm text-zinc-400">{item.store_slug || 'N/A'}</td>}
                        {activeTab === 'merchants' && (
                          <td className="py-4 px-4 text-sm">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              item.status === 'Suspendido' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            }`}>
                              {item.status || 'Activo'}
                            </span>
                          </td>
                        )}
                        {activeTab === 'customers' && <td className="py-4 px-4 text-sm text-zinc-400">{item.email}</td>}
                        {activeTab === 'customers' && <td className="py-4 px-4 text-sm text-zinc-400">{item.phone || 'N/A'}</td>}
                        <td className="py-4 px-4 text-sm text-zinc-500">{new Date(item.created_at || item.join_date).toLocaleDateString()}</td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {activeTab === 'merchants' && (
                              <>
                                <button 
                                  onClick={() => handleViewDetails(item, 'merchant')}
                                  disabled={isActionLoading}
                                  className="p-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-colors border border-blue-500/30 opacity-70 hover:opacity-100"
                                  title="Ver Información del Comerciante"
                                >
                                  <Search size={18} />
                                </button>
                                <button 
                                  onClick={() => handleToggleSuspend(item)}
                                  disabled={isActionLoading}
                                  className={`p-2 rounded-lg transition-colors border ${
                                    item.status === 'Suspendido' 
                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500 hover:text-white'
                                    : 'bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500 hover:text-white'
                                  }`}
                                  title={item.status === 'Suspendido' ? "Reactivar Tienda" : "Suspender Tienda (Ocultar)"}
                                >
                                  {item.status === 'Suspendido' ? <Eye size={18} /> : <EyeOff size={18} />}
                                </button>
                              </>
                            )}
                            {activeTab === 'customers' && (
                                <button 
                                  onClick={() => handleViewDetails(item, 'customer')}
                                  disabled={isActionLoading}
                                  className="p-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-colors border border-blue-500/30 opacity-70 hover:opacity-100"
                                  title="Ver Detalles del Cliente"
                                >
                                  <Search size={18} />
                                </button>
                            )}
                            <button 
                              onClick={() => handleDeleteClick(item, activeTab === 'merchants' ? 'merchant' : 'customer')}
                              disabled={isActionLoading}
                              className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors border border-red-500/20 opacity-50 group-hover:opacity-100 disabled:opacity-30"
                              title="Eliminar Definitivamente (Destructivo)"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(activeTab === 'merchants' ? filteredMerchants : filteredCustomers).length === 0 && (
                      <tr>
                        <td colSpan="8" className="py-12 text-center text-zinc-500">No se encontraron resultados</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {isConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{scale:0.95, opacity:0, y: 20}} animate={{scale:1, opacity:1, y: 0}} exit={{scale:0.95, opacity:0, y: 20}} className="bg-zinc-950 border border-red-500/30 rounded-3xl p-8 max-w-md w-full relative z-10 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
              <button onClick={() => setIsConfirmOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={24} /></button>
              
              <div className="flex justify-center mb-4 text-red-500">
                <ShieldAlert size={48} />
              </div>
              <h2 className="text-xl font-black text-center text-white uppercase tracking-widest mb-2">Peligro: Borrado Irreversible</h2>
              
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                <p className="text-sm text-red-400 text-center">
                  Estás a punto de eliminar {itemToDelete?.type === 'merchant' ? 'la tienda' : 'el cliente'} <strong className="text-white">{itemToDelete?.name}</strong>.
                  {itemToDelete?.type === 'merchant' && " Esto borrará TODOS sus productos, pedidos y configuraciones para siempre."}
                </p>
                {itemToDelete?.type === 'merchant' && (
                  <p className="text-xs text-amber-400 mt-3 text-center border-t border-amber-500/20 pt-2">
                    💡 <strong>TIP:</strong> Si solo quieres ocultarla del público, considera usar el botón de "Suspender" en lugar de eliminarla.
                  </p>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Para confirmar, escribe "ELIMINAR"</label>
                <input 
                  type="text" 
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full bg-black border border-red-500/30 rounded-xl px-4 py-3 text-center text-white uppercase tracking-widest focus:outline-none focus:border-red-500 transition-colors"
                  placeholder="ELIMINAR"
                />
              </div>

              <button 
                onClick={confirmDelete}
                disabled={confirmText.trim().toUpperCase() !== 'ELIMINAR' || isActionLoading}
                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold text-xs uppercase tracking-[0.2em] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isActionLoading ? <Loader2 size={18} className="animate-spin" /> : <><Trash2 size={18} /> Destruir Registro</>}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Change Key Modal */}
      <AnimatePresence>
        {isKeyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{scale:0.95, opacity:0, y: 20}} animate={{scale:1, opacity:1, y: 0}} exit={{scale:0.95, opacity:0, y: 20}} className="bg-zinc-950 border border-red-500/30 rounded-3xl p-8 max-w-md w-full relative z-10 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
              <button onClick={() => setIsKeyModalOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={24} /></button>
              
              <div className="flex justify-center mb-4 text-red-500">
                <Key size={48} />
              </div>
              <h2 className="text-xl font-black text-center text-white uppercase tracking-widest mb-2">Seguridad Maestra</h2>
              <p className="text-sm text-zinc-400 text-center mb-6">Modifica la clave de acceso al panel SuperAdmin.</p>

              <div className="mb-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Nueva Clave Maestra</label>
                  <input 
                    type="text" 
                    value={newKeyInput}
                    onChange={(e) => { setNewKeyInput(e.target.value); setKeyError(''); }}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-center text-white tracking-[0.2em] focus:outline-none focus:border-red-500 transition-colors"
                    placeholder="Escribe la nueva clave..."
                  />
                </div>
                {keyError && <p className="text-red-500 text-xs font-bold text-center uppercase tracking-widest">{keyError}</p>}
              </div>

              <button 
                onClick={handleChangeKey}
                disabled={!newKeyInput || isActionLoading}
                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold text-xs uppercase tracking-[0.2em] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isActionLoading ? <Loader2 size={18} className="animate-spin" /> : <>Actualizar Clave <ArrowRight size={18}/></>}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Details Modal */}
      <AnimatePresence>
        {isDetailsOpen && selectedDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div initial={{scale:0.95, opacity:0, y: 20}} animate={{scale:1, opacity:1, y: 0}} exit={{scale:0.95, opacity:0, y: 20}} className="bg-zinc-950 border border-white/10 rounded-3xl p-8 max-w-lg w-full relative z-10 shadow-2xl">
              <button onClick={() => setIsDetailsOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={24} /></button>
              
              <h2 className="text-xl font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-white/10 pb-4">
                <Search className="text-blue-500" /> Detalles de {selectedDetails.type === 'merchant' ? 'Tienda' : 'Cliente'}
              </h2>
              
              <div className="space-y-4">
                <div className="bg-zinc-900 rounded-xl p-4 border border-white/5">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Nombre</p>
                  <p className="text-sm text-white font-medium">{selectedDetails.name}</p>
                </div>
                
                {selectedDetails.type === 'merchant' && (() => {
                  let config = {};
                  try {
                    config = JSON.parse(selectedDetails.config || '{}');
                  } catch(e) {}
                  
                  return (
                    <>
                      <div className="bg-zinc-900 rounded-xl p-4 border border-white/5">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Email Administrador</p>
                        <p className="text-sm text-white font-medium">{config.adminEmail || 'No registrado'}</p>
                      </div>
                      <div className="bg-zinc-900 rounded-xl p-4 border border-white/5">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Teléfono</p>
                        <p className="text-sm text-white font-medium">{config.phone || config.storefront?.phone || 'No registrado'}</p>
                      </div>
                      <div className="bg-zinc-900 rounded-xl p-4 border border-white/5">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Cripto (Binance Pay ID)</p>
                        <p className="text-sm text-white font-medium">{config.binancePayId || 'No registrado'}</p>
                      </div>
                      <div className="bg-zinc-900 rounded-xl p-4 border border-white/5">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Pago Móvil</p>
                        <p className="text-sm text-white font-medium whitespace-pre-wrap">{config.pagoMovilData || 'No registrado'}</p>
                      </div>
                    </>
                  )
                })()}

                {selectedDetails.type === 'customer' && (
                  <>
                    <div className="bg-zinc-900 rounded-xl p-4 border border-white/5">
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Email</p>
                      <p className="text-sm text-white font-medium">{selectedDetails.email || 'No registrado'}</p>
                    </div>
                    <div className="bg-zinc-900 rounded-xl p-4 border border-white/5">
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Teléfono</p>
                      <p className="text-sm text-white font-medium">{selectedDetails.phone || 'No registrado'}</p>
                    </div>
                    <div className="bg-zinc-900 rounded-xl p-4 border border-white/5">
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Cédula / Documento</p>
                      <p className="text-sm text-white font-medium">{selectedDetails.doc_id || 'No registrado'}</p>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
