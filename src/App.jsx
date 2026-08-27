import React, { useState, useMemo, useEffect } from 'react';
import { ConfigPanel } from './components/ConfigPanel';
import { DashboardPanel } from './components/DashboardPanel';
import { CatalogBuilder } from './components/CatalogBuilder';
import { QuoteBuilder } from './components/QuoteBuilder';
import { WorkspaceSelector } from './components/WorkspaceSelector';
import { calculateProfitability } from './utils/calculator';
import { Calculator, LayoutList, FileText, Briefcase, ArrowLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from './utils/supabaseClient';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const defaultInputs = {
  netSalary: 1500,
  taxPercentage: 20,
  productiveHours: 80,
  costs: [
    { id: '2', name: 'Internet y Servicios Fijos', amount: 50, type: 'monthly', category: 'fijos' },
    { id: '3', name: 'Licencias de Software', amount: 50, type: 'monthly', category: 'licencias' },
  ],
  equipment: [
    { id: '1', name: 'Ordenador Portátil', price: 1500, residualValue: 300, lifespanYears: 3 }
  ],
  vehicleCosts: [
    { id: '1', name: 'Gasolina Promedio', amount: 30, type: 'weekly' },
    { id: '2', name: 'Seguro Moto', amount: 120, type: 'annual' }
  ],
  profitMargin: 20,
};

function App() {
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [activeTab, setActiveTab] = useState('calculator'); // 'calculator' | 'catalog' | 'quote'
  const [inputs, setInputs] = useState(defaultInputs);

  const results = useMemo(() => calculateProfitability(inputs), [inputs]);

  const handleSelectWorkspace = (workspace) => {
    setActiveWorkspace(workspace);
    if (workspace.config && Object.keys(workspace.config).length > 0) {
      setInputs(workspace.config);
    } else {
      setInputs(defaultInputs);
    }
  };

  // Autoguardado de configuración del workspace
  useEffect(() => {
    if (!activeWorkspace) return;
    const timer = setTimeout(() => {
      supabase.from('workspaces')
        .update({ config: inputs })
        .eq('id', activeWorkspace.id)
        .then(({ error }) => {
           if (error) console.error('Error saving config:', error);
        });
    }, 1000);
    return () => clearTimeout(timer);
  }, [inputs, activeWorkspace]);

  if (!activeWorkspace) {
    return <WorkspaceSelector onSelect={handleSelectWorkspace} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveWorkspace(null)}
              className="text-slate-400 hover:text-indigo-500 transition-colors bg-slate-100 dark:bg-slate-800 p-2 rounded-xl"
              title="Cambiar Negocio"
            >
              <Briefcase size={20} />
            </button>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20">
                {activeTab === 'calculator' && <Calculator size={20} />}
                {activeTab === 'catalog' && <LayoutList size={20} />}
                {activeTab === 'quote' && <FileText size={20} />}
              </div>
              <div>
                <h2 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{activeWorkspace.name}</h2>
                <h1 className="text-lg font-extrabold text-slate-800 dark:text-white leading-tight">
                  {activeTab === 'calculator' && 'Calculadora'}
                  {activeTab === 'catalog' && 'Catálogo Global'}
                  {activeTab === 'quote' && 'Presupuestos'}
                </h1>
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-xl">
            <button
              onClick={() => setActiveTab('calculator')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === 'calculator' 
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Calculator size={16} />
              Calculadora
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === 'catalog' 
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <LayoutList size={16} />
              Catálogo
            </button>
            <button
              onClick={() => setActiveTab('quote')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === 'quote' 
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <FileText size={16} />
              Presupuestos
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'calculator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Panel Izquierdo (Configuración) */}
            <div className="lg:col-span-5 xl:col-span-4 sticky top-24">
              <ConfigPanel inputs={inputs} setInputs={setInputs} />
            </div>

            {/* Panel Derecho (Resultados) */}
            <div className="lg:col-span-7 xl:col-span-8">
              <DashboardPanel results={results} workspaceId={activeWorkspace.id} />
            </div>
          </div>
        )}
        {activeTab === 'catalog' && (
          <div className="h-full">
            <CatalogBuilder />
          </div>
        )}
        {activeTab === 'quote' && (
          <div className="h-full">
            <QuoteBuilder baseHourlyRate={results.finalHourlyRate} activeWorkspace={activeWorkspace} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
