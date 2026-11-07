import React, { useState, useMemo, useEffect } from 'react';
import { Search, User, Mail, Phone, Calendar, ShoppingBag, ExternalLink, Plus, Edit2, Trash2, X } from 'lucide-react';

import { supabase } from '../../../supabaseClient';
import toast from 'react-hot-toast';

export default function CustomersManager() {
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const activeWs = localStorage.getItem('activeWorkspace');
      if (!activeWs) {
        setCustomers([]);
        setIsLoading(false);
        return;
      }

      // 1. Obtener pedidos EXCLUSIVOS de este workspace para computar clientes reales y LTV
      const { data: ordersData } = await supabase
        .from('ecommerce_orders_v2')
        .select('id, customer, customer_email, customer_phone, customer_dni, total, status, created_at')
        .eq('workspace_id', activeWs);

      const ordersList = ordersData || [];

      // 2. Obtener clientes registrados manualmente en este workspace
      const { data: wsData } = await supabase
        .from('workspaces')
        .select('config')
        .eq('id', activeWs)
        .maybeSingle();

      const wsConfig = typeof wsData?.config === 'object' && wsData?.config !== null 
        ? wsData.config 
        : (typeof wsData?.config === 'string' ? JSON.parse(wsData.config || '{}') : {});

      const manualCustomers = Array.isArray(wsConfig.crm_customers) ? wsConfig.crm_customers : [];

      // 3. Consolidar clientes de órdenes que no estén aún en manualCustomers
      const customerMap = new Map();

      // Primero agregamos los clientes manuales de la tienda
      manualCustomers.forEach(c => {
        customerMap.set(c.id, {
          id: c.id,
          name: c.name || 'Sin Nombre',
          email: c.email || '',
          phone: c.phone || '',
          docId: c.docId || c.doc_id || '',
          address: c.address || '',
          status: c.status || 'Activo',
          joinDate: c.joinDate || c.created_at || (c.join_date ? c.join_date.split('T')[0] : 'Reciente'),
          totalOrders: 0,
          ltv: 0,
          isManual: true
        });
      });

      // Luego agregamos o actualizamos con los compradores de órdenes en este comercio
      ordersList.forEach(o => {
        const custName = (o.customer || '').trim();
        const custEmail = (o.customer_email || '').trim();
        if (!custName && !custEmail) return;
        if (custName.toLowerCase() === 'consumidor final') return;

        // Buscar si ya existe por email o nombre
        let foundKey = null;
        for (const [key, c] of customerMap.entries()) {
          if ((custEmail && c.email && c.email.toLowerCase() === custEmail.toLowerCase()) ||
              (custName && c.name && c.name.toLowerCase() === custName.toLowerCase())) {
            foundKey = key;
            break;
          }
        }

        const orderTotal = Number(o.total) || 0;

        if (foundKey) {
          const existing = customerMap.get(foundKey);
          existing.totalOrders += 1;
          existing.ltv += orderTotal;
          if (!existing.phone && o.customer_phone) existing.phone = o.customer_phone;
          if (!existing.docId && o.customer_dni) existing.docId = o.customer_dni;
        } else {
          const autoId = `ORD-CUS-${customerMap.size + 1}`;
          customerMap.set(autoId, {
            id: autoId,
            name: custName || 'Cliente de Pedido',
            email: custEmail,
            phone: o.customer_phone || '',
            docId: o.customer_dni || '',
            address: '',
            status: 'Activo',
            joinDate: o.created_at ? o.created_at.split('T')[0] : 'Reciente',
            totalOrders: 1,
            ltv: orderTotal,
            isManual: false
          });
        }
      });

      setCustomers(Array.from(customerMap.values()));
    } catch (e) {
      console.error('Error fetching customers in CRM:', e);
      toast.error('Error al cargar la lista de clientes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    docId: '',
    address: '',
    status: 'Activo'
  });

  // Cálculos KPIs
  const { totalCustomers, avgOrders, newThisMonth } = useMemo(() => {
    const total = customers.length;
    const avg = total > 0 ? (customers.reduce((acc, curr) => acc + curr.totalOrders, 0) / total).toFixed(1) : 0;
    
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const news = customers.filter(c => c.joinDate && c.joinDate.startsWith(currentMonthPrefix)).length;
    
    return { totalCustomers: total, avgOrders: avg, newThisMonth: news };
  }, [customers]);

  // Filtros
  const filteredCustomers = customers.filter(customer => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (customer.name || '').toLowerCase().includes(term) || 
      (customer.email || '').toLowerCase().includes(term) ||
      (customer.phone || '').includes(term) ||
      (customer.docId || '').toLowerCase().includes(term);
      
    const matchesStatus = statusFilter === 'Todos' || customer.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // CRUD
  const openEditor = (customer = null) => {
    if (customer) {
      setEditingId(customer.id);
      setFormData({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        docId: customer.docId || '',
        address: customer.address || '',
        status: customer.status || 'Activo'
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        docId: '',
        address: '',
        status: 'Activo'
      });
    }
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setTimeout(() => {
      setEditingId(null);
    }, 300);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Por favor ingresa el nombre del cliente.");
      return;
    }

    const activeWs = localStorage.getItem('activeWorkspace');
    if (!activeWs) {
      toast.error("No hay un comercio activo identificado.");
      return;
    }

    try {
      const { data: wsData } = await supabase
        .from('workspaces')
        .select('config')
        .eq('id', activeWs)
        .maybeSingle();

      const wsConfig = typeof wsData?.config === 'object' && wsData?.config !== null 
        ? wsData.config 
        : (typeof wsData?.config === 'string' ? JSON.parse(wsData.config || '{}') : {});

      let currentCrm = Array.isArray(wsConfig.crm_customers) ? [...wsConfig.crm_customers] : [];

      if (editingId) {
        currentCrm = currentCrm.map(c => c.id === editingId ? {
          ...c,
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          docId: formData.docId.trim(),
          address: formData.address.trim(),
          status: formData.status
        } : c);
        toast.success('Cliente actualizado correctamente');
      } else {
        const newCustomer = {
          id: `CUS-${Date.now().toString().slice(-6)}`,
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          docId: formData.docId.trim(),
          address: formData.address.trim(),
          status: formData.status,
          joinDate: new Date().toISOString().split('T')[0]
        };
        currentCrm.unshift(newCustomer);
        toast.success(`Cliente ${newCustomer.name} registrado con éxito`);
      }

      await supabase
        .from('workspaces')
        .update({
          config: {
            ...wsConfig,
            crm_customers: currentCrm
          }
        })
        .eq('id', activeWs);

      await fetchCustomers();
      closeEditor();
    } catch (e) {
      console.error('Error guardando cliente en CRM:', e);
      toast.error('No se pudo guardar el cliente.');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`¿Estás seguro de eliminar al cliente ${name || ''}? Esta acción no se puede deshacer.`)) {
      const activeWs = localStorage.getItem('activeWorkspace');
      if (!activeWs) return;

      try {
        const { data: wsData } = await supabase
          .from('workspaces')
          .select('config')
          .eq('id', activeWs)
          .maybeSingle();

        const wsConfig = typeof wsData?.config === 'object' && wsData?.config !== null 
          ? wsData.config 
          : (typeof wsData?.config === 'string' ? JSON.parse(wsData.config || '{}') : {});

        const currentCrm = Array.isArray(wsConfig.crm_customers) ? wsConfig.crm_customers : [];
        const updatedCrm = currentCrm.filter(c => c.id !== id);

        await supabase
          .from('workspaces')
          .update({
            config: {
              ...wsConfig,
              crm_customers: updatedCrm
            }
          })
          .eq('id', activeWs);

        toast.success('Cliente eliminado con éxito');
        setCustomers(prev => prev.filter(c => c.id !== id));
      } catch (e) {
        console.error('Error eliminando cliente en CRM:', e);
        toast.error('Error al eliminar el cliente.');
      }
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 pb-24 md:pb-8 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Clientes (CRM)</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestiona la información de tus compradores y su historial.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
            Exportar CSV
          </button>
          <button onClick={() => openEditor()} className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-orange-500/25 cursor-pointer">
            <Plus size={18} />
            Nuevo Cliente
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
            <User size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Clientes</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{totalCustomers}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
            <ShoppingBag size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Compras Promedio</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{avgOrders}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Nuevos este mes</p>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white">+{newThisMonth}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, correo o teléfono..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-shadow dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            >
              <option value="Todos">Todos los Estados</option>
              <option value="Activo">Activo</option>
              <option value="VIP">VIP</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
        </div>

        {/* Mobile View: Cards */}
        <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredCustomers.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto mb-3 border border-orange-200 dark:border-orange-500/20 shadow-xs">
                <User size={26} />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Sin clientes registrados aún</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Los clientes de tu tienda aparecerán aquí automáticamente al realizar ventas, o puedes crear uno con "+ Nuevo Cliente".
              </p>
            </div>
          ) : (
            filteredCustomers.map(customer => (
              <div key={customer.id} className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                      customer.status === 'VIP' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
                    }`}>
                      {(customer.name || 'C').charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                        {customer.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{customer.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    {customer.status === 'VIP' && (
                      <span className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider mb-1">VIP</span>
                    )}
                    {customer.status === 'Inactivo' && (
                      <span className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider mb-1">Inactivo</span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2 text-center">
                    <p className="text-[10px] text-slate-500 mb-0.5">Pedidos</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{customer.totalOrders}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2 text-center">
                    <p className="text-[10px] text-slate-500 mb-0.5">LTV (Gastado)</p>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">${customer.ltv.toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <button onClick={() => openEditor(customer)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-bold">
                    <Edit2 size={12} /> Editar
                  </button>
                  <button onClick={() => handleDelete(customer.id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold">
                    <Trash2 size={12} /> Borrar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cliente</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contacto</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pedidos</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">LTV (Gastado)</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto mb-2 border border-orange-200 dark:border-orange-500/20 shadow-xs">
                      <User size={22} />
                    </div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">Sin clientes registrados aún</p>
                    <p className="text-xs text-slate-500 mt-0.5">Los clientes aparecerán automáticamente con tus ventas o agrégalos con "+ Nuevo Cliente".</p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(customer => (
                  <tr key={customer.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                          customer.status === 'VIP' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
                        }`}>
                          {(customer.name || 'C').charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            {customer.name}
                            {customer.status === 'VIP' && (
                              <span className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">VIP</span>
                            )}
                            {customer.status === 'Inactivo' && (
                              <span className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Inactivo</span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500">Cliente desde {customer.joinDate}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                          <Mail size={12} /> {customer.email}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                          <Phone size={12} /> {customer.phone || 'No registrado'}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{customer.totalOrders}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">${customer.ltv.toFixed(2)}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditor(customer)} className="p-1.5 text-slate-400 hover:text-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors" title="Editar Perfil">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(customer.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" title="Eliminar Cliente">
                          <Trash2 size={16} />
                        </button>
                        <button className="p-1.5 text-slate-400 hover:text-orange-500 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors" title="Ver Historial (Mock)">
                          <ExternalLink size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Side Panel Overlay */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={closeEditor}></div>
          
          <div className="relative w-full max-w-md h-[100dvh] sm:h-auto bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
               <div>
                 <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                   {editingId ? 'Editar Perfil del Cliente' : 'Agregar Nuevo Cliente'}
                 </h3>
                 <p className="text-xs text-slate-500 mt-1">
                   {editingId ? `Actualizando a: ${formData.name}` : 'Ingresa los datos del comprador manualmente'}
                 </p>
               </div>
               <button onClick={closeEditor} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                 <X size={20} />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
               
               <section className="space-y-4">
                 <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                   Datos Personales
                 </h4>
                 
                 <div className="space-y-2">
                   <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Nombre Completo *</label>
                   <input 
                     type="text" 
                     name="name"
                     value={formData.name}
                     onChange={handleInputChange}
                     className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 dark:text-white" 
                   />
                 </div>

                 <div className="space-y-2">
                   <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Correo Electrónico *</label>
                   <input 
                     type="email" 
                     name="email"
                     value={formData.email}
                     onChange={handleInputChange}
                     className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 dark:text-white" 
                   />
                 </div>

                 <div className="space-y-2">
                   <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Teléfono</label>
                   <input 
                     type="text" 
                     name="phone"
                     value={formData.phone}
                     onChange={handleInputChange}
                     placeholder="+34 600 000 000"
                     className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 dark:text-white" 
                   />
                 </div>
               </section>

               <section className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                 <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                   Cuenta y Estadísticas
                 </h4>
                 
                 <div className="space-y-2">
                   <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Estado de la Cuenta</label>
                   <select 
                     name="status"
                     value={formData.status}
                     onChange={handleInputChange}
                     className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 dark:text-white"
                   >
                     <option value="Activo">Activo</option>
                     <option value="VIP">VIP (Comprador Frecuente)</option>
                     <option value="Inactivo">Inactivo / Suspendido</option>
                   </select>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Total Pedidos</label>
                     <input 
                       type="number" 
                       name="totalOrders"
                       value={formData.totalOrders}
                       onChange={handleInputChange}
                       className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 dark:text-white" 
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-semibold text-slate-600 dark:text-slate-400" title="Lifetime Value (Total gastado)">LTV Gastado ($)</label>
                     <input 
                       type="number" 
                       name="ltv"
                       value={formData.ltv}
                       onChange={handleInputChange}
                       className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 dark:text-white" 
                     />
                   </div>
                 </div>
               </section>

            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex gap-3 justify-end">
               <button onClick={closeEditor} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors">
                 Cancelar
               </button>
               <button onClick={handleSave} className="px-6 py-2 text-sm font-bold bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors shadow-sm shadow-orange-500/25 cursor-pointer">
                 Guardar Perfil
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
