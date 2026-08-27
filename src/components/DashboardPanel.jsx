import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Calculator, Briefcase, TrendingUp, DollarSign, Target, CheckCircle2, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';
import { supabase } from '../utils/supabaseClient';

const COLORS = ['#10b981', '#f59e0b', '#64748b', '#1d4ed8'];

function MetricCard({ title, value, subtitle }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
      <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{value}</p>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
}

export function DashboardPanel({ results, workspaceId }) {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch presupuestos al cargar o al cambiar de workspace
  useEffect(() => {
    if (!workspaceId) return;
    
    supabase.from('budgets').select('*').eq('workspace_id', workspaceId)
      .then(({ data, error }) => {
        if(error) throw error;
        setBudgets(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching budgets:", err);
        setLoading(false);
      });
  }, [workspaceId]);

  // Cálculos de Negocio Real
  const businessMetrics = useMemo(() => {
    let totalApprovedRevenue = 0; // Ingresos de proyectos de un solo pago
    let totalMRR = 0; // Monthly Recurring Revenue (Mantenimiento)
    let totalApprovedProfit = 0;

    budgets.forEach(budget => {
      // 1. Calcular pagos únicos (ítems aprobados)
      const approvedItems = (budget.items || []).filter(item => item.status === 'approved');
      
      if (approvedItems.length > 0) {
        const itemRev = approvedItems.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
        const itemCost = approvedItems.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
        totalApprovedRevenue += itemRev;
        totalApprovedProfit += (itemRev - itemCost);
        
        // 2. Si el proyecto tiene items aprobados, asumimos que el mantenimiento asociado está activo (MRR)
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
      }
    });

    return { totalApprovedRevenue, totalApprovedProfit, totalMRR };
  }, [budgets]);

  const data = [
    { name: 'Salario Neto', value: results.breakdown.netSalaryPerHour },
    { name: 'Impuestos', value: results.breakdown.taxesPerHour },
    { name: 'Costes Oper.', value: results.breakdown.costsPerHour },
    { name: 'Beneficio', value: results.breakdown.profitPerHour },
  ].filter(item => item.value > 0);

  // Para el balance mensual
  const targetMonthlySalary = results.grossSalary;
  const operationalCosts = results.totalMonthlyCosts;
  
  const mrrCoveragePct = operationalCosts > 0 ? Math.min(100, (businessMetrics.totalMRR / operationalCosts) * 100) : 100;
  
  // Excedente de MRR va hacia el salario
  const mrrSurplus = Math.max(0, businessMetrics.totalMRR - operationalCosts);
  const totalEarnedForSalary = businessMetrics.totalApprovedProfit + mrrSurplus; // Profit de proyectos + Sobrante del MRR
  const salaryCoveragePct = targetMonthlySalary > 0 ? Math.min(100, (totalEarnedForSalary / targetMonthlySalary) * 100) : 100;

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Tarjeta Principal */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 text-white shadow-xl shadow-blue-900/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10">
          <Calculator size={120} />
        </div>
        <div className="relative z-10">
          <p className="text-blue-100 font-medium mb-2">Tu Tarifa de Venta Recomendada</p>
          <div className="flex items-baseline gap-2">
            <h1 className="text-5xl font-extrabold">{results.finalHourlyRate.toFixed(2)}€</h1>
            <span className="text-blue-200 text-lg">/ hora</span>
          </div>
          <p className="mt-4 text-sm text-blue-100 max-w-sm">
            Esta tarifa es la <strong>Maestra</strong>. Cubre tu salario, impuestos, costes operativos y margen.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <MetricCard 
          title="Salario Bruto Mensual (Meta)" 
          value={`${results.grossSalary.toFixed(2)}€`} 
        />
        <MetricCard 
          title="Costes Operativos (Fijos)" 
          value={`${results.totalMonthlyCosts.toFixed(2)}€/mes`} 
          subtitle="Internet, Licencias, etc."
        />
      </div>

      {/* Gráfico de la Hora */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex-1 min-h-[300px] flex flex-col">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Desglose de cada hora facturada</h3>
        <div className="flex-1 min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip 
                formatter={(value) => `${value.toFixed(2)}€`}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* BALANCE REAL DEL NEGOCIO (Sustituye al viejo Simulador) */}
      <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-3xl p-6 lg:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6 border-b border-emerald-100 dark:border-emerald-800/50 pb-4">
          <div className="bg-emerald-100 dark:bg-emerald-800/50 p-2 rounded-xl text-emerald-600 dark:text-emerald-400">
            <Target size={24} />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-emerald-900 dark:text-emerald-100">Balance Real del Negocio</h3>
            <p className="text-sm text-emerald-700/70 dark:text-emerald-400/70 mt-0.5">Basado en tus Presupuestos Aprobados</p>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-emerald-600 animate-pulse font-medium">
            Cargando presupuestos...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Break-Even de Mantenimiento */}
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex justify-between">
                  <span>MRR (Ingreso Recurrente)</span>
                  <span className="text-emerald-600">{businessMetrics.totalMRR.toFixed(2)}€</span>
                </p>
                <div className="flex justify-between items-end mb-2">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Cobertura de Gastos Fijos</h4>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{mrrCoveragePct.toFixed(0)}%</span>
                </div>
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all duration-1000", mrrCoveragePct >= 100 ? "bg-emerald-500" : "bg-blue-500")} 
                    style={{ width: `${mrrCoveragePct}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  Tus mantenimientos cubren {mrrCoveragePct >= 100 ? 'el 100%' : `el ${mrrCoveragePct.toFixed(0)}%`} de tus costes operativos ({operationalCosts.toFixed(2)}€).
                  {mrrSurplus > 0 && <span className="text-emerald-600 font-bold ml-1">¡Tienes +{mrrSurplus.toFixed(2)}€ de superávit!</span>}
                </p>
              </div>
            </div>

            {/* Avance hacia Salario Deseado */}
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex justify-between">
                  <span>Ganancia Neta (Proyectos + Superávit)</span>
                  <span className="text-emerald-600">{totalEarnedForSalary.toFixed(2)}€</span>
                </p>
                <div className="flex justify-between items-end mb-2">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Meta Salarial ({targetMonthlySalary.toFixed(2)}€)</h4>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{salaryCoveragePct.toFixed(0)}%</span>
                </div>
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all duration-1000", salaryCoveragePct >= 100 ? "bg-emerald-500" : "bg-amber-500")} 
                    style={{ width: `${salaryCoveragePct}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  Dinero libre generado por proyectos de pago único este mes.
                </p>
              </div>
            </div>

          </div>
        )}

        <div className="mt-8 bg-white dark:bg-slate-900 p-4 rounded-2xl flex items-center justify-between border border-emerald-100 dark:border-emerald-800/50 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
              <Briefcase className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Ingresos Totales (Facturación)</p>
              <p className="text-xs text-slate-500">Histórico de proyectos aprobados</p>
            </div>
          </div>
          <span className="text-xl font-black text-slate-900 dark:text-white">
            {businessMetrics.totalApprovedRevenue.toFixed(2)}€
          </span>
        </div>
      </div>
    </div>
  );
}
