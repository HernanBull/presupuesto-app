import React, { useState, useMemo, useEffect } from 'react';
import { Search, User, Mail, Phone, Calendar, ShoppingBag, ExternalLink, Plus, Edit2, Trash2, X } from 'lucide-react';

export default function CustomersManager() {
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    fetch(`https://axonmarket-api.onrender.com/api/ecommerce/customers`)
      .then(res => res.json())
      .then(data => {
        if(Array.isArray(data)) {
          const mapped = data.map(c => ({
            ...c,
            joinDate: c.join_date,
            totalOrders: c.total_orders || 0,
            ltv: c.ltv || 0
          }));
          setCustomers(mapped);
        }
      })
      .catch(console.error);
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'Activo',
    totalOrders: 0,
    ltv: 0
  });

  // Cálculos KPIs
  const { totalCustomers, avgOrders, newThisMonth } = useMemo(() => {
    const total = customers.length;
    const avg = total > 0 ? (customers.reduce((acc, curr) => acc + curr.totalOrders, 0) / total).toFixed(1) : 0;
    // Simulamos que los creados con 0 pedidos son "Nuevos este mes" o los VIPs para dar movimiento visual
    const news = customers.filter(c => c.totalOrders <= 1).length;
    
    return { totalCustomers: total, avgOrders: avg, newThisMonth: news };
  }, [customers]);

  // Filtros
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm);
      
    const matchesStatus = statusFilter === 'Todos' || customer.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // CRUD
  const openEditor = (customer = null) => {
    if (customer) {
      setEditingId(customer.id);
      setFormData({ ...customer });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        status: 'Activo',
        totalOrders: 0,
        ltv: 0
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

  const handleSave = () => {
    if (!formData.name || !formData.email) {
      alert("Por favor llena los campos requeridos (Nombre, Email).");
      return;
    }

    const today = new Date().toISOString().split('T')[0]; // Simular fecha YYYY-MM-DD

    if (editingId) {
      // Editar
      setCustomers(customers.map(c => c.id === editingId ? { 
        ...c, 
        ...formData, 
        totalOrders: Number(formData.totalOrders), 
        ltv: Number(formData.ltv) 
      } : c));
    } else {
      // Crear
      const newCustomer = {
        ...formData,
        id: `CUST-${Date.now().toString().slice(-4)}`,
        joinDate: today,
        totalOrders: Number(formData.totalOrders),
        ltv: Number(formData.ltv)
      };
      setCustomers([newCustomer, ...customers]);
    }
    closeEditor();
  };

  const handleDelete = (id) => {
    if(window.confirm('¿Estás seguro de eliminar este cliente? Se perderá su historial de compras.')) {
      setCustomers(customers.filter(c => c.id !== id));
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
          <button onClick={() => openEditor()} className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-violet-500/20">
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
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-shadow dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              <option value="Todos">Todos los Estados</option>
              <option value="Activo">Activo</option>
              <option value="VIP">VIP</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
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
                  <td colSpan="5" className="py-8 text-center text-slate-500">
                    No se encontraron clientes con esos criterios.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(customer => (
                  <tr key={customer.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                          customer.status === 'VIP' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
                        }`}>
                          {customer.name.charAt(0)}
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
                        <button className="p-1.5 text-slate-400 hover:text-violet-500 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors" title="Ver Historial (Mock)">
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
          
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
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
                     className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white" 
                   />
                 </div>

                 <div className="space-y-2">
                   <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Correo Electrónico *</label>
                   <input 
                     type="email" 
                     name="email"
                     value={formData.email}
                     onChange={handleInputChange}
                     className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white" 
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
                     className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white" 
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
                     className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white"
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
                       className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white" 
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-semibold text-slate-600 dark:text-slate-400" title="Lifetime Value (Total gastado)">LTV Gastado ($)</label>
                     <input 
                       type="number" 
                       name="ltv"
                       value={formData.ltv}
                       onChange={handleInputChange}
                       className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:text-white" 
                     />
                   </div>
                 </div>
               </section>

            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex gap-3 justify-end">
               <button onClick={closeEditor} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors">
                 Cancelar
               </button>
               <button onClick={handleSave} className="px-6 py-2 text-sm font-bold bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors shadow-sm shadow-violet-500/20">
                 Guardar Perfil
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
