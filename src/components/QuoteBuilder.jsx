import React, { useState, useEffect } from 'react';
import { Plus, Box, Zap, Save, FolderOpen, FilePlus, Loader2, Calendar, Clock, Trash2, Eye, Edit3 } from 'lucide-react';
import { QuotePreview } from './QuotePreview';
import { supabase } from '../utils/supabaseClient';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function QuoteBuilder({ baseHourlyRate = 40, activeWorkspace }) {
  const [catalog, setCatalog] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // -- ESTADO PROYECTO --
  const [mobileTab, setMobileTab] = useState('edit'); // 'edit' | 'preview' - solo aplica a móviles
  const [quoteItems, setQuoteItems] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    cost: '',
    price: '',
    quantity: 1,
    logbook: null
  });

  // -- ESTADO MANTENIMIENTO --
  const [activeTab, setActiveTab] = useState('project'); // 'project' | 'maintenance'
  const [maintHours, setMaintHours] = useState(5);
  const [maintHourlyRate, setMaintHourlyRate] = useState(baseHourlyRate); // Tarifa por hora editable
  const [maintMargin, setMaintMargin] = useState(15);
  const [maintInfraCosts, setMaintInfraCosts] = useState([]);
  const [maintServices, setMaintServices] = useState([]); // Servicios recurrentes del catálogo

  // -- ESTADO GUARDADO --
  const [savedBudgets, setSavedBudgets] = useState([]);
  const [currentBudgetId, setCurrentBudgetId] = useState(null);
  const [currentBudgetName, setCurrentBudgetName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Cargar servicios, categorías y presupuestos
  useEffect(() => {
    supabase.from('services').select('*')
      .then(({ data }) => setCatalog(data || []))
      .catch(err => console.error('Error fetching catalog:', err));
      
    supabase.from('categories').select('*')
      .then(({ data }) => setCategories(data || []))
      .catch(err => console.error('Error fetching categories:', err));
      
    fetchBudgets();
  }, []);

  const fetchBudgets = () => {
    if (!activeWorkspace) return;
    supabase.from('budgets').select('*').eq('workspace_id', activeWorkspace.id)
      .then(({ data }) => setSavedBudgets(data || []))
      .catch(err => console.error('Error fetching budgets:', err));
  };

  // Auto-guardado si hay un presupuesto activo
  useEffect(() => {
    if (currentBudgetId && (quoteItems.length > 0 || maintHours > 0 || maintServices.length > 0)) {
      const timeoutId = setTimeout(() => saveCurrentBudget(false), 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [quoteItems, maintHours, maintHourlyRate, maintMargin, maintInfraCosts, maintServices]);

  const saveCurrentBudget = async (showLoading = true) => {
    if (!currentBudgetName) {
      if (showLoading) alert("Por favor, ponle un nombre al presupuesto antes de guardarlo.");
      return;
    }

    if (showLoading) setIsSaving(true);

    const totalCost = quoteItems.filter(i => i.status !== 'rejected').reduce((sum, item) => sum + (item.cost * item.quantity), 0);
    const totalRevenue = quoteItems.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
    const approvedRevenue = quoteItems.filter(i => i.status === 'approved').reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);

    const maintenanceData = {
      hours: maintHours,
      hourlyRate: maintHourlyRate,
      margin: maintMargin,
      infraCosts: maintInfraCosts,
      services: maintServices
    };

    const budgetData = {
      id: currentBudgetId,
      name: currentBudgetName,
      items: quoteItems,
      totalCost,
      totalRevenue,
      approvedRevenue,
      maintenance: maintenanceData,
      workspace_id: activeWorkspace?.id
    };

    try {
      let result;
      if (currentBudgetId) {
        result = await supabase.from('budgets').update(budgetData).eq('id', currentBudgetId).select();
      } else {
        // En supabase el id de budgetData (si es null) debe ser omitido, así que lo removemos
        const { id, ...newBudgetData } = budgetData;
        result = await supabase.from('budgets').insert([newBudgetData]).select();
      }
      
      const { data, error } = result;
      
      if (!error) {
        if (!currentBudgetId && data && data.length > 0) {
          setCurrentBudgetId(data[0].id);
        }
        fetchBudgets();
      } else {
         console.error(error);
         if (showLoading) alert('Error al guardar el presupuesto: ' + error.message);
      }
    } catch (error) {
      console.error('Error saving budget:', error);
      if (showLoading) alert('Error al guardar el presupuesto.');
    } finally {
      if (showLoading) setIsSaving(false);
    }
  };

  const loadBudget = (e) => {
    const id = e.target.value;
    if (!id) return;
    
    const budget = savedBudgets.find(b => b.id === id);
    if (budget) {
      setCurrentBudgetId(budget.id);
      setCurrentBudgetName(budget.name);
      setQuoteItems(budget.items || []);
      
      if (budget.maintenance) {
        setMaintHours(budget.maintenance.hours || 0);
        setMaintHourlyRate(budget.maintenance.hourlyRate || 40);
        setMaintMargin(budget.maintenance.margin || 15);
        setMaintInfraCosts(budget.maintenance.infraCosts || []);
        setMaintServices(budget.maintenance.services || []);
      } else {
        // Valores por defecto
        setMaintHours(0);
        setMaintHourlyRate(baseHourlyRate);
        setMaintMargin(15);
        setMaintInfraCosts([]);
        setMaintServices([]);
      }
    }
    e.target.value = "";
  };

  const startNewBudget = () => {
    setCurrentBudgetId(null);
    setCurrentBudgetName('');
    setQuoteItems([]);
    setMaintHours(5);
    setMaintHourlyRate(40);
    setMaintMargin(15);
    setMaintInfraCosts([]);
    setMaintServices([]);
  };

  // -- LOGICA DE PROYECTO --
  const handleCatalogSelect = (e) => {
    const serviceId = e.target.value;
    if (!serviceId) return;
    
    const service = catalog.find(s => s.id === serviceId);
    if (service) {
      setFormData({
        ...formData,
        name: service.name,
        price: service.price || '',
        cost: service.cost || '',
        logbook: service.logbook || null
      });
    }
    e.target.value = "";
  };

  const handleAddToQuote = () => {
    if (!formData.name || !formData.price) return;
    const newItem = {
      id: Date.now().toString(),
      name: formData.name,
      cost: parseFloat(formData.cost) || 0,
      finalPrice: parseFloat(formData.price) || 0,
      quantity: parseInt(formData.quantity) || 1,
      status: 'pending',
      logbook: formData.logbook || null
    };
    setQuoteItems([...quoteItems, newItem]);
    setFormData({ name: '', cost: '', price: '', quantity: 1, logbook: null });
  };

  const handleRemoveFromQuote = (itemId) => setQuoteItems(quoteItems.filter(item => item.id !== itemId));
  const handleUpdateItemStatus = (itemId, newStatus) => setQuoteItems(quoteItems.map(item => item.id === itemId ? { ...item, status: newStatus } : item));

  // -- LOGICA DE MANTENIMIENTO --
  const addMaintInfraCost = () => setMaintInfraCosts(prev => [...prev, { id: Date.now().toString(), name: '', amount: 0, type: 'monthly', usageHours: 730, usageDays: 30 }]);
  const updateMaintInfraCost = (id, field, value) => setMaintInfraCosts(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  const removeMaintInfraCost = (id) => setMaintInfraCosts(prev => prev.filter(c => c.id !== id));

  const handleMaintCatalogSelect = (e) => {
    const serviceId = e.target.value;
    if (!serviceId) return;
    const service = catalog.find(s => s.id === serviceId);
    if (service) {
      setMaintServices([...maintServices, { ...service, uniqueId: Date.now().toString() }]);
    }
    e.target.value = "";
  };
  const removeMaintService = (uniqueId) => setMaintServices(prev => prev.filter(s => s.uniqueId !== uniqueId));


  // Helper para agrupar en <select>
  const renderCatalogOptgroups = () => (
    <>
      <option value="">-- Seleccionar servicio --</option>
      {catalog.filter(s => !s.category || !categories.find(c => c.name === s.category)).length > 0 && (
        <optgroup label="Sin Asignar">
          {catalog.filter(s => !s.category || !categories.find(c => c.name === s.category)).map(service => (
            <option key={service.id} value={service.id}>{service.name}</option>
          ))}
        </optgroup>
      )}
      {categories.map(cat => {
        const catServices = catalog.filter(s => s.category === cat.name);
        if (catServices.length === 0) return null;
        return (
          <optgroup key={cat.name} label={cat.name}>
            {catServices.map(service => (
              <option key={service.id} value={service.id}>{service.name}</option>
            ))}
          </optgroup>
        );
      })}
    </>
  );

  return (
    <div className="flex flex-col h-full space-y-4 sm:space-y-6">
      
      {/* ZONA SUPERIOR STICKY */}
      <div className="sticky top-0 z-20 -mt-4 pt-4 pb-2 bg-slate-50 dark:bg-slate-950 shadow-[0_4px_10px_-4px_rgba(0,0,0,0.1)] dark:shadow-none">
        <div className="flex flex-col gap-3 sm:gap-4">
          
          {/* Navegación Móvil Interna */}
          <div className="flex lg:hidden bg-white dark:bg-slate-900 p-1.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setMobileTab('edit')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all",
                mobileTab === 'edit'
                  ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-800"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border border-transparent"
              )}
            >
              <Edit3 size={16} /> Configuración
            </button>
            <button
              onClick={() => setMobileTab('preview')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all",
                mobileTab === 'preview'
                  ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-800"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border border-transparent"
              )}
            >
              <Eye size={16} /> Resultados
            </button>
          </div>

          {/* Barra superior de Guardado y Carga */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">
              <input
                type="text"
                placeholder="Nombre del Presupuesto (Ej. Cliente Juan)"
                value={currentBudgetName}
                onChange={(e) => setCurrentBudgetName(e.target.value)}
                className="flex-1 min-w-0 md:w-80 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button
                onClick={() => saveCurrentBudget(true)}
                disabled={isSaving || !currentBudgetName}
                className="flex items-center justify-center gap-1.5 sm:gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95 whitespace-nowrap text-sm sm:text-base"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span className="hidden sm:inline">{currentBudgetId ? 'Guardado' : 'Guardar'}</span>
                <span className="sm:hidden">Guardar</span>
              </button>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FolderOpen size={16} className="text-slate-400" />
                </div>
                <select
                  onChange={loadBudget}
                  value=""
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                >
                  <option value="" disabled>Cargar...</option>
                  {savedBudgets.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({new Date(b.date).toLocaleDateString()})</option>
                  ))}
                </select>
              </div>
              <button onClick={startNewBudget} className="flex items-center justify-center gap-1.5 sm:gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold transition-all border border-slate-200 dark:border-slate-700 text-sm sm:text-base">
                <FilePlus size={16} /> <span className="hidden sm:inline">Nuevo</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start h-full">
        {/* Panel Izquierdo: Configuración */}
        <div className={cn(
          "lg:col-span-4 xl:col-span-4 space-y-6 lg:sticky lg:top-24",
          mobileTab === 'edit' ? "flex flex-col" : "hidden lg:flex lg:flex-col"
        )}>
          
          {/* TABS */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl">
            <button
              onClick={() => setActiveTab('project')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'project' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
              💼 Proyecto
            </button>
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'maintenance' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
              🔄 Mantenimiento
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
            
            {activeTab === 'project' ? (
              // TAB PROYECTO
              <div>
                <h2 className="text-lg font-bold mb-5 flex items-center gap-2">
                  <Zap className="text-yellow-500" size={20} fill="currentColor" />
                  Servicio de Proyecto
                </h2>

                <div className="space-y-4">
                  {catalog.length > 0 && (
                    <div className="mb-6 pb-6 border-b border-slate-200 dark:border-slate-800">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        <Box size={14} className="inline mr-1" /> Rellenar desde Catálogo
                      </label>
                      <select onChange={handleCatalogSelect} defaultValue="" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                        {renderCatalogOptgroups()}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nombre de la Tarea / Servicio</label>
                    <input type="text" placeholder="Ej. Conectar Hermes" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 text-red-500">Mi Costo (€)</label>
                      <input type="number" placeholder="0.00" min="0" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} className="w-full bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 text-emerald-500">Precio a Cobrar (€)</label>
                      <input type="number" placeholder="0.00" min="0" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Cantidad</label>
                    <input type="number" min="1" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>

                  <button onClick={handleAddToQuote} disabled={!formData.name || !formData.price} className="w-full mt-6 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-500 text-white px-4 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/30 active:scale-[0.98]">
                    <Plus size={18} /> Añadir a la Lista
                  </button>
                </div>
              </div>
            ) : (
              // TAB MANTENIMIENTO
              <div>
                <h2 className="text-lg font-bold mb-5 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <Calendar size={20} />
                  Plan de Mantenimiento
                </h2>

                <div className="space-y-6">
                  {/* Tarifa y Horas */}
                  <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                    <div className="flex justify-between items-center mb-4">
                      <label className="text-sm font-bold text-indigo-900 dark:text-indigo-100">Horas Mensuales</label>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{maintHours}h</span>
                    </div>
                    <input type="range" min="0" max="80" value={maintHours} onChange={(e) => setMaintHours(Number(e.target.value))} className="w-full accent-indigo-500 h-2 bg-indigo-200 dark:bg-indigo-800 rounded-lg cursor-pointer mb-4" />
                    
                    <div className="flex justify-between items-center mt-2">
                      <label className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                        Mi tarifa por hora (€)
                        {maintHourlyRate === baseHourlyRate && (
                          <span className="text-[9px] font-bold uppercase bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-sm">Tarifa Maestra</span>
                        )}
                      </label>
                      <input type="number" min="0" value={maintHourlyRate} onChange={(e) => setMaintHourlyRate(Number(e.target.value))} className="w-20 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-sm font-bold text-right outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>

                  {/* Servicios Recurrentes */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Servicios Recurrentes</label>
                    <select onChange={handleMaintCatalogSelect} defaultValue="" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none mb-3">
                      {renderCatalogOptgroups()}
                    </select>
                    
                    <div className="space-y-2">
                      {maintServices.map(s => (
                        <div key={s.uniqueId} className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{s.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-emerald-600">{s.price}€</span>
                            <button onClick={() => removeMaintService(s.uniqueId)} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Infraestructura */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Infraestructura (Cliente)</label>
                      <button onClick={addMaintInfraCost} className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md transition-colors"><Plus size={14}/> Añadir</button>
                    </div>
                    
                    <div className="space-y-3">
                      {maintInfraCosts.map(cost => (
                        <div key={cost.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-2 mb-2">
                            <input type="text" placeholder="Nombre" value={cost.name} onChange={(e) => updateMaintInfraCost(cost.id, 'name', e.target.value)} className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-sm outline-none" />
                            <div className="flex items-center">
                              <input type="number" placeholder="Coste" value={cost.amount} onChange={(e) => updateMaintInfraCost(cost.id, 'amount', Number(e.target.value))} className="w-16 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-l px-2 py-1 text-sm outline-none text-right" />
                              <span className="bg-slate-100 dark:bg-slate-800 border border-l-0 border-slate-200 dark:border-slate-700 px-2 py-1 text-sm rounded-r text-slate-500">€</span>
                            </div>
                            <button onClick={() => removeMaintInfraCost(cost.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
                          </div>
                          
                          <select value={cost.type} onChange={(e) => updateMaintInfraCost(cost.id, 'type', e.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-sm outline-none">
                            <option value="monthly">Mensual</option>
                            <option value="annual">Anual</option>
                            <option value="hourly">Por hora (~730h/mes)</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panel Derecho: Vista Previa y Análisis */}
        <div className={cn(
          "lg:col-span-8 xl:col-span-8",
          mobileTab === 'preview' ? "block" : "hidden lg:block"
        )}>
          <QuotePreview 
            items={quoteItems} 
            onRemoveItem={handleRemoveFromQuote} 
            onUpdateItemStatus={handleUpdateItemStatus}
            maintenance={{
              hours: maintHours,
              hourlyRate: maintHourlyRate,
              margin: maintMargin,
              infraCosts: maintInfraCosts,
              services: maintServices
            }}
          />
        </div>

      </div>
    </div>
  );
}
