import React, { useState, useMemo, useEffect } from 'react';
import { ConfigPanel } from './components/ConfigPanel';
import { DashboardPanel } from './components/DashboardPanel';
import { CatalogBuilder } from './components/CatalogBuilder';
import { QuoteBuilder } from './components/QuoteBuilder';
import { WorkspaceSelector } from './components/WorkspaceSelector';
import { ContractsViewer } from './components/ContractsViewer';
import { SDDManager } from './components/SDDManager';
import { calculateProfitability } from './utils/calculator';
import { Calculator, LayoutList, FileText, Briefcase, ArrowLeft, Scale, Bot, Sun, Moon } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from './utils/supabaseClient';
import { Login } from './components/Login';
import { ClientTracker } from './components/ClientTracker';

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
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const clientCode = localStorage.getItem('sdd_client_code');

  if (clientCode) {
    return <ClientTracker />;
  }

  // Autenticación Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  if (!activeWorkspace) {
    return (
      <div className="relative">
        <button 
          onClick={toggleTheme}
          className="absolute top-4 left-4 sm:top-6 sm:left-6 text-slate-500 hover:text-indigo-500 bg-white dark:bg-slate-900 p-2.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors z-50"
          title="Cambiar Tema"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button 
          onClick={() => supabase.auth.signOut()}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 text-sm font-medium text-slate-500 hover:text-red-500 bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors z-50"
        >
          Cerrar Sesión
        </button>
        <WorkspaceSelector onSelect={handleSelectWorkspace} />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 overflow-hidden">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-20 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-row items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4 flex-1">
            <button 
              onClick={() => setActiveWorkspace(null)}
              className="text-slate-400 hover:text-indigo-500 transition-colors bg-slate-100 dark:bg-slate-800 p-2 rounded-xl"
              title="Cambiar Negocio"
            >
              <Briefcase size={20} />
            </button>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 hidden sm:block">
                {activeTab === 'calculator' && <Calculator size={20} />}
                {activeTab === 'catalog' && <LayoutList size={20} />}
                {activeTab === 'quote' && <FileText size={20} />}
                {activeTab === 'contracts' && <Scale size={20} />}
                {activeTab === 'sdd' && <Bot size={20} />}
              </div>
              <div className="hidden sm:block">
                <h2 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{activeWorkspace.name}</h2>
                <h1 className="text-lg font-extrabold text-slate-800 dark:text-white leading-tight">
                  {activeTab === 'calculator' && 'Calculadora'}
                  {activeTab === 'catalog' && 'Catálogo Global'}
                  {activeTab === 'quote' && 'Presupuestos'}
                  {activeTab === 'contracts' && 'Contratos'}
                  {activeTab === 'sdd' && 'Proyectos AI'}
                </h1>
              </div>
              {/* Solo en móviles, mostrar el nombre simple */}
              <div className="sm:hidden">
                <h1 className="text-base font-bold text-slate-800 dark:text-white truncate max-w-[120px]">
                  {activeWorkspace.name}
                </h1>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className="text-slate-400 hover:text-indigo-500 transition-colors bg-slate-100 dark:bg-slate-800 p-1.5 rounded-lg"
              title="Cambiar Tema"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button 
              onClick={() => supabase.auth.signOut()}
              className="text-xs font-semibold text-slate-500 hover:text-red-500 transition-colors"
            >
              Salir
            </button>

          <nav className="hidden sm:flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-xl">
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
            <button
              onClick={() => setActiveTab('contracts')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === 'contracts' 
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Scale size={16} />
              Contratos
            </button>
            <button
              onClick={() => setActiveTab('sdd')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === 'sdd' 
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Bot size={16} />
              Proyectos AI
            </button>
          </nav>
        </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pb-6 sm:pb-8 custom-scrollbar">
        {activeTab === 'calculator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
            {/* Panel Izquierdo (Configuración) */}
            <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24">
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
        {activeTab === 'contracts' && (
          <div className="h-full">
            <ContractsViewer />
          </div>
        )}
        {activeTab === 'sdd' && (
          <div className="h-full">
            <SDDManager activeWorkspace={activeWorkspace} />
          </div>
        )}
      </main>

      {/* Bottom Navigation para Móviles (Look Premium) */}
      <nav className="sm:hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-800/50 z-30 px-2 pt-2 pb-6 flex items-center justify-around shadow-[0_-10px_40px_rgba(0,0,0,0.04)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.2)] shrink-0 transition-colors duration-300">
        <button
          onClick={() => setActiveTab('calculator')}
          className="relative flex flex-col items-center justify-center p-2 transition-all w-20 group"
        >
          {activeTab === 'calculator' && (
             <div className="absolute inset-0 bg-indigo-50/80 dark:bg-indigo-500/10 rounded-2xl -z-10 animate-in zoom-in-95 duration-200"></div>
          )}
          <div className={cn(
            "p-1.5 rounded-xl mb-1 transition-all duration-300", 
            activeTab === 'calculator' ? "text-indigo-600 dark:text-indigo-400 scale-110" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
          )}>
            <Calculator size={24} strokeWidth={activeTab === 'calculator' ? 2.5 : 2} />
          </div>
          <span className={cn(
            "text-[10px] font-bold tracking-wide transition-colors", 
            activeTab === 'calculator' ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"
          )}>
            Calculadora
          </span>
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className="relative flex flex-col items-center justify-center p-2 transition-all w-20 group"
        >
          {activeTab === 'catalog' && (
             <div className="absolute inset-0 bg-indigo-50/80 dark:bg-indigo-500/10 rounded-2xl -z-10 animate-in zoom-in-95 duration-200"></div>
          )}
          <div className={cn(
            "p-1.5 rounded-xl mb-1 transition-all duration-300", 
            activeTab === 'catalog' ? "text-indigo-600 dark:text-indigo-400 scale-110" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
          )}>
            <LayoutList size={24} strokeWidth={activeTab === 'catalog' ? 2.5 : 2} />
          </div>
          <span className={cn(
            "text-[10px] font-bold tracking-wide transition-colors", 
            activeTab === 'catalog' ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"
          )}>
            Catálogo
          </span>
        </button>

        <button
          onClick={() => setActiveTab('quote')}
          className="relative flex flex-col items-center justify-center p-2 transition-all w-20 group"
        >
          {activeTab === 'quote' && (
             <div className="absolute inset-0 bg-indigo-50/80 dark:bg-indigo-500/10 rounded-2xl -z-10 animate-in zoom-in-95 duration-200"></div>
          )}
          <div className={cn(
            "p-1.5 rounded-xl mb-1 transition-all duration-300", 
            activeTab === 'quote' ? "text-indigo-600 dark:text-indigo-400 scale-110" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
          )}>
            <FileText size={24} strokeWidth={activeTab === 'quote' ? 2.5 : 2} />
          </div>
          <span className={cn(
            "text-[10px] font-bold tracking-wide transition-colors", 
            activeTab === 'quote' ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"
          )}>
            Presupuestos
          </span>
        </button>

        <button
          onClick={() => setActiveTab('contracts')}
          className="relative flex flex-col items-center justify-center p-2 transition-all w-20 group"
        >
          {activeTab === 'contracts' && (
             <div className="absolute inset-0 bg-indigo-50/80 dark:bg-indigo-500/10 rounded-2xl -z-10 animate-in zoom-in-95 duration-200"></div>
          )}
          <div className={cn(
            "p-1.5 rounded-xl mb-1 transition-all duration-300", 
            activeTab === 'contracts' ? "text-indigo-600 dark:text-indigo-400 scale-110" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
          )}>
            <Scale size={24} strokeWidth={activeTab === 'contracts' ? 2.5 : 2} />
          </div>
          <span className={cn(
            "text-[10px] font-bold tracking-wide transition-colors", 
            activeTab === 'contracts' ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"
          )}>
            Contratos
          </span>
        </button>

        <button
          onClick={() => setActiveTab('sdd')}
          className="relative flex flex-col items-center justify-center p-2 transition-all w-20 group"
        >
          {activeTab === 'sdd' && (
             <div className="absolute inset-0 bg-indigo-50/80 dark:bg-indigo-500/10 rounded-2xl -z-10 animate-in zoom-in-95 duration-200"></div>
          )}
          <div className={cn(
            "p-1.5 rounded-xl mb-1 transition-all duration-300", 
            activeTab === 'sdd' ? "text-indigo-600 dark:text-indigo-400 scale-110" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
          )}>
            <Bot size={24} strokeWidth={activeTab === 'sdd' ? 2.5 : 2} />
          </div>
          <span className={cn(
            "text-[10px] font-bold tracking-wide transition-colors", 
            activeTab === 'sdd' ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"
          )}>
            SDD
          </span>
        </button>
      </nav>
    </div>
  );
}

export default App;
