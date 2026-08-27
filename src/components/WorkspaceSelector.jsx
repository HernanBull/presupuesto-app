import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, Loader2, LayoutDashboard, TrendingUp, DollarSign, Target, Activity, Award, Clock } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

export function WorkspaceSelector({ onSelect }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [globalBudgets, setGlobalBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchWorkspacesAndBudgets();
  }, []);

  const fetchWorkspacesAndBudgets = async () => {
    try {
      const [wsRes, budgetsRes] = await Promise.all([
        supabase.from('workspaces').select('*'),
        supabase.from('budgets').select('*')
      ]);
      const wsData = wsRes.data || [];
      const budgetsData = budgetsRes.data || [];
      setWorkspaces(wsData);
      setGlobalBudgets(budgetsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      const { error } = await supabase.from('workspaces').insert([{ name: newName.trim() }]);
      if (!error) {
        setNewName('');
        setShowCreate(false);
        fetchWorkspacesAndBudgets();
      }
    } catch (error) {
      console.error('Error creating workspace:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Cálculos de Vista General
  const globalMetrics = React.useMemo(() => {
    let totalMRR = 0;
    let totalRevenue = 0;
    let totalCost = 0;
    let pipeline = 0;
    let wonBudgetsCount = 0;
    let totalBudgets = globalBudgets.length;

    globalBudgets.forEach(budget => {
      const items = budget.items || [];
      const approvedItems = items.filter(item => item.status === 'approved');
      const pendingItems = items.filter(item => !item.status || item.status === 'pending');
      
      if (approvedItems.length > 0) {
        wonBudgetsCount++;
        
        // Ingresos y Costos de proyectos (Pago único)
        approvedItems.forEach(item => {
          totalRevenue += (item.finalPrice * item.quantity);
          totalCost += (item.cost * item.quantity);
        });
        
        // Mantenimiento (MRR)
        if (budget.maintenance) {
          const { hours = 0, hourlyRate = 0, margin = 0, infraCosts = [], services = [] } = budget.maintenance;
          let infraTotal = infraCosts.reduce((sum, cost) => {
            let m = cost.amount || 0;
            if (cost.type === 'hourly') m = m * 730;
            else if (cost.type === 'annual') m = m / 12;
            return sum + m;
          }, 0);
          
          const infraWithMargin = infraTotal * (1 + (margin / 100));
          const support = hours * hourlyRate;
          const recServices = services.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
          
          totalMRR += (support + infraWithMargin + recServices);
        }
      } else {
        // Si no está ganado, suma el pipeline pendiente
        pendingItems.forEach(item => {
          pipeline += (item.finalPrice * item.quantity);
        });
      }
    });

    const arr = totalMRR * 12;
    const winRate = totalBudgets > 0 ? (wonBudgetsCount / totalBudgets) * 100 : 0;
    const avgTicket = wonBudgetsCount > 0 ? (totalRevenue / wonBudgetsCount) : 0;
    const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

    return { totalMRR, totalRevenue, pipeline, arr, winRate, avgTicket, grossMargin };
  }, [globalBudgets]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 py-12">
      
      <div className="max-w-5xl w-full">
        {/* Cabecera Principal */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl mb-4 shadow-sm">
            <LayoutDashboard size={32} />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Vista General del Negocio
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
            Selecciona un cliente para ver sus finanzas específicas
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-indigo-500" size={40} />
          </div>
        ) : (
          <>
            {/* Dashboard Global - Big Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-3xl p-6 text-white shadow-lg shadow-emerald-900/20 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-10">
                  <TrendingUp size={160} />
                </div>
                <div className="relative z-10 flex items-center gap-4 mb-4">
                  <div className="bg-white/20 p-3 rounded-2xl">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <p className="text-emerald-100 font-medium">MRR Total (Ingreso Recurrente)</p>
                  </div>
                </div>
                <h2 className="text-4xl font-black relative z-10">{globalMetrics.totalMRR.toFixed(2)}€<span className="text-xl font-medium text-emerald-200">/mes</span></h2>
                <div className="mt-4 pt-4 border-t border-white/20 flex justify-between items-center relative z-10">
                  <span className="text-sm text-emerald-100 font-medium">ARR Proyectado:</span>
                  <span className="font-bold text-white bg-white/10 px-3 py-1 rounded-lg">{globalMetrics.arr.toFixed(2)}€ /año</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-6 text-white shadow-lg shadow-blue-900/20 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-10">
                  <DollarSign size={160} />
                </div>
                <div className="relative z-10 flex items-center gap-4 mb-4">
                  <div className="bg-white/20 p-3 rounded-2xl">
                    <DollarSign size={24} />
                  </div>
                  <div>
                    <p className="text-blue-100 font-medium">Facturación Global (Cerrada)</p>
                  </div>
                </div>
                <h2 className="text-4xl font-black relative z-10">{globalMetrics.totalRevenue.toFixed(2)}€</h2>
                <div className="mt-4 pt-4 border-t border-white/20 flex justify-between items-center relative z-10">
                  <span className="text-sm text-blue-100 font-medium">Margen Bruto Real:</span>
                  <span className="font-bold text-white bg-white/10 px-3 py-1 rounded-lg">{globalMetrics.grossMargin.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Dashboard Global - Small Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <Clock size={16} className="text-amber-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">Pipeline (Pendiente)</span>
                </div>
                <span className="text-xl font-black text-slate-800 dark:text-slate-100">{globalMetrics.pipeline.toFixed(2)}€</span>
              </div>
              
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <Target size={16} className="text-indigo-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">Tasa de Conversión</span>
                </div>
                <span className="text-xl font-black text-slate-800 dark:text-slate-100">{globalMetrics.winRate.toFixed(1)}%</span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <Award size={16} className="text-fuchsia-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">Ticket Promedio</span>
                </div>
                <span className="text-xl font-black text-slate-800 dark:text-slate-100">{globalMetrics.avgTicket.toFixed(2)}€</span>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
                <div className="flex items-center gap-2 text-slate-500 mb-2">
                  <Activity size={16} className="text-rose-500" />
                  <span className="text-xs font-bold uppercase tracking-wider">Proyectos Activos</span>
                </div>
                <span className="text-xl font-black text-slate-800 dark:text-slate-100">{globalBudgets.length}</span>
              </div>
            </div>

            {/* Listado de Workspaces */}
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Briefcase size={24} className="text-indigo-500" />
                Mis Clientes ({workspaces.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Tarjetas de Workspaces */}
            {workspaces.map(w => (
              <button
                key={w.id}
                onClick={() => onSelect(w)}
                className="group flex flex-col text-left bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm hover:shadow-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Briefcase size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">{w.name}</h3>
                <p className="text-sm text-slate-500 mt-4 flex items-center gap-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors font-medium">
                  Configurar y cotizar &rarr;
                </p>
              </button>
            ))}

            {/* Crear Nuevo */}
            {showCreate ? (
              <div className="bg-indigo-50 dark:bg-indigo-900/10 rounded-3xl p-6 border-2 border-dashed border-indigo-200 dark:border-indigo-800 flex flex-col">
                <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 mb-4">Nuevo Negocio</h3>
                <input
                  type="text"
                  placeholder="Nombre de la agencia/cliente..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  className="w-full bg-white dark:bg-slate-950 border border-indigo-200 dark:border-indigo-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none mb-3 text-slate-800 dark:text-slate-100"
                  autoFocus
                />
                <div className="flex gap-2 mt-auto">
                  <button 
                    onClick={() => setShowCreate(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleCreate}
                    disabled={!newName.trim() || isCreating}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center"
                  >
                    {isCreating ? <Loader2 size={16} className="animate-spin" /> : 'Crear'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCreate(true)}
                className="flex flex-col items-center justify-center text-center bg-transparent rounded-3xl p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all duration-300 min-h-[200px]"
              >
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl flex items-center justify-center mb-4">
                  <Plus size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-600 dark:text-slate-400">Añadir Workspace</h3>
                <p className="text-sm text-slate-400 mt-2">Crear un nuevo perfil de negocio</p>
              </button>
            )}

          </div>
          </>
        )}
      </div>

    </div>
  );
}
