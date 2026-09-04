import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import {
  CheckCircle2, Clock, PlayCircle, ShieldCheck,
  Sparkles, Code2, PenTool, Search, MessageSquare, X,
  Wallet, FolderKanban, Link as LinkIcon, FileText, Download, DollarSign, ArrowRight,
  Users, CalendarDays, ExternalLink, Wrench, Server, Database, Globe, Headset, Check, Sun, Moon
} from 'lucide-react';
import { ChatWidget } from './ChatWidget';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cx(...inputs) {
  return twMerge(clsx(inputs));
}

function timeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((new Date() - date) / 1000);

  if (diffInSeconds < 60) return 'hace un momento';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `hace ${diffInMinutes} m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `hace ${diffInHours} h`;
  return `hace ${Math.floor(diffInHours / 24)} d`;
}

function formatShortDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Fases de alto nivel para el cliente
const clientPhases = [
  { id: 'definicion', label: 'Definición y Alcance', icon: Search, steps: ['constitucion'] },
  { id: 'diseno', label: 'Diseño y Arquitectura', icon: PenTool, steps: ['especificacion', 'clarificacion', 'plan'] },
  { id: 'desarrollo', label: 'Desarrollo en Curso', icon: Code2, steps: ['tareas', 'implementacion'] },
  { id: 'pruebas', label: 'Pruebas y Validación', icon: ShieldCheck, steps: ['validacion'] }
];

export function ClientTracker() {
  const [loading, setLoading] = useState(true);
  const [projectData, setProjectData] = useState(null);
  const [budgetData, setBudgetData] = useState(null);
  const [error, setError] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tablero');
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

  useEffect(() => {
    const fetchProject = async () => {
      const clientCode = localStorage.getItem('sdd_client_code');

      if (!clientCode) {
        setError('No hay sesión de cliente activa.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('sdd_projects')
        .select('*')
        .eq('client_code', clientCode)
        .single();

      if (error) throw error;

      if (data) {
        setProjectData(data);

        // Fetch budget (El presupuesto más reciente del workspace)
        if (data.workspace_id) {
          const { data: bData } = await supabase
            .from('budgets')
            .select('*')
            .eq('workspace_id', data.workspace_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (bData) {
            setBudgetData(bData);
          }
        }
      } else {
        console.error("Error fetching tracker data:", error);
        setError('No pudimos encontrar este proyecto o el código es inválido.');
      }
      setLoading(false);
    };

    fetchProject();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-800 dark:text-slate-200">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="font-medium animate-pulse">Cargando estado del proyecto...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6">
          <ShieldCheck size={40} />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Acceso Denegado</h1>
        <p className="text-slate-500 max-w-md">{error}</p>
        <button onClick={() => { localStorage.removeItem('sdd_client_code'); window.location.reload(); }} className="mt-6 text-indigo-600 hover:text-indigo-500 font-bold underline">Volver al Inicio</button>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('sdd_client_code');
    window.location.reload();
  };

  // Determinar la fase actual del cliente basada en el step técnico
  let currentClientPhaseIndex = 0;
  const currentTechStep = projectData.current_step;

  clientPhases.forEach((phase, index) => {
    if (phase.steps.includes(currentTechStep)) {
      currentClientPhaseIndex = index;
    }
  });

  const progressPercentage = (projectData.tasks_total > 0)
    ? Math.round((projectData.tasks_completed / projectData.tasks_total) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 pt-20 pb-12 md:py-12 px-4 sm:px-6 lg:px-8 font-sans relative">
      {/* Controles Superiores */}
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8 flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="bg-white/50 dark:bg-slate-900/50 backdrop-blur border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-500 px-3 py-2 rounded-xl shadow-sm transition-colors"
          title="Cambiar Tema"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          onClick={handleLogout}
          className="bg-white/50 dark:bg-slate-900/50 backdrop-blur border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-red-500 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors"
        >
          Salir
        </button>
      </div>

      <div className="max-w-3xl mx-auto space-y-8 md:space-y-12">

        {/* Header Superior */}
        <div className="mb-8 md:mb-10 p-6 md:p-10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-slate-800/50 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 blur-3xl rounded-full"></div>

          <div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white tracking-tight mb-2">
              Progreso del Proyecto
            </h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">
              Hola, <span className="text-indigo-600 dark:text-indigo-400">{projectData.project_name}</span>. Aquí tienes tu centro de control en tiempo real.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex p-2 bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl mb-8 w-full md:w-fit mx-auto border border-slate-300/30 dark:border-slate-700/30 shadow-inner overflow-x-auto hide-scrollbar snap-x">
          <button
            onClick={() => setActiveTab('tablero')}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-xl font-bold text-sm transition-all duration-300 whitespace-nowrap shrink-0 snap-start",
              activeTab === 'tablero' ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <FolderKanban size={18} /> Tablero
          </button>
          <button
            onClick={() => setActiveTab('finanzas')}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-xl font-bold text-sm transition-all duration-300 whitespace-nowrap shrink-0 snap-start",
              activeTab === 'finanzas' ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <Wallet size={18} /> Finanzas
          </button>
          <button
            onClick={() => setActiveTab('entregables')}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-xl font-bold text-sm transition-all duration-300 whitespace-nowrap shrink-0 snap-start",
              activeTab === 'entregables' ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <FileText size={18} /> Entregables
          </button>
          <button
            onClick={() => setActiveTab('equipo')}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-xl font-bold text-sm transition-all duration-300 whitespace-nowrap shrink-0 snap-start",
              activeTab === 'equipo' ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <Users size={18} /> Equipo
          </button>
          <button
            onClick={() => setActiveTab('mantenimiento')}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-xl font-bold text-sm transition-all duration-300 whitespace-nowrap shrink-0 snap-start",
              activeTab === 'mantenimiento' ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            <Wrench size={18} /> Mantenimiento
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'tablero' && (
            <motion.div
              key="tablero"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* KPIs (Fila de Resumen) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, staggerChildren: 0.1 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-6"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
                  className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800 shadow-lg shadow-indigo-500/5"
                >
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Fase Actual</span>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl">
                      <ShieldCheck size={20} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">{clientPhases[currentClientPhaseIndex].label}</h3>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
                  className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800 shadow-lg shadow-indigo-500/5"
                >
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Progreso de Tareas</span>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-3xl font-black text-slate-800 dark:text-white leading-none">{progressPercentage}%</h3>
                    <span className="text-sm font-bold text-slate-500">{projectData.tasks_completed || 0} / {projectData.tasks_total || 0}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      transition={{ duration: 1.5, type: "spring" }}
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full"
                    ></motion.div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.3 }}
                  className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/50 dark:border-slate-800 shadow-lg shadow-indigo-500/5"
                >
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Última Actualización</span>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                      <Clock size={20} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white">{timeAgo(projectData.updated_at) || 'Hoy'}</h3>
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{formatShortDate(projectData.updated_at)}</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* Status Card (Línea de Tiempo Compacta) */}
              <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border border-slate-200/50 dark:border-slate-800 p-6 md:p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-600"></div>

                {/* Stepper Vertical */}
                <div className="relative space-y-8 before:absolute before:inset-0 before:ml-[1.1rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-800 before:to-transparent">
                  {clientPhases.map((phase, index) => {
                    const isCompleted = index < currentClientPhaseIndex;
                    const isActive = index === currentClientPhaseIndex;
                    const isPending = index > currentClientPhaseIndex;
                    const Icon = phase.icon;

                    return (
                      <div key={phase.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">

                        {/* Icon */}
                        <div className={cx(
                          "flex items-center justify-center w-9 h-9 rounded-full border-4 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2",
                          isCompleted ? "bg-indigo-600 border-indigo-100 dark:border-indigo-900 text-white" :
                            isActive ? "bg-white dark:bg-slate-900 border-indigo-500 text-indigo-600 dark:text-indigo-400" :
                              "bg-slate-100 dark:bg-slate-800 border-white dark:border-slate-900 text-slate-400"
                        )}>
                          {isCompleted ? <CheckCircle2 size={16} /> : <Icon size={16} />}
                        </div>

                        {/* Content Card */}
                        <div className={cx(
                          "w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-2xl transition-all duration-300 border",
                          isActive ? "bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-200 dark:border-indigo-800/50 shadow-md ring-1 ring-indigo-500/20" :
                            isCompleted ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-70" :
                              "bg-transparent border-transparent opacity-40 grayscale"
                        )}>
                          <div className="flex items-center justify-between mb-1">
                            <h3 className={cx("font-bold", isActive ? "text-indigo-900 dark:text-indigo-100" : "text-slate-800 dark:text-slate-200")}>
                              {phase.label}
                            </h3>
                            {isActive && <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>}
                          </div>
                          <p className="text-sm text-slate-500">
                            {index === 0 && "Analizando tus requerimientos y objetivos clave."}
                            {index === 1 && "Construyendo la arquitectura y las reglas de negocio."}
                            {index === 2 && "Escribiendo y probando el código real de tu app."}
                            {index === 3 && "Revisión de calidad para asegurar que todo funciona perfecto."}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tablero Kanban (Siempre visible) */}
              {projectData.tasks_data && projectData.tasks_data.length > 0 ? (
                <div className="relative mt-12">
                  {/* Efecto de resplandor de fondo (Glow) */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur opacity-20 dark:opacity-30"></div>

                  <div className="relative bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 p-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                      <h3 className="text-2xl font-extrabold flex items-center gap-3 text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 tracking-tight">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl">
                          <Code2 size={24} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        Centro de Operaciones
                      </h3>
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 py-2 px-4 rounded-full border border-indigo-100 dark:border-indigo-800/50 shadow-sm">
                        <Clock size={14} className="animate-pulse" /> Sincronizado: {formatShortDate(projectData.updated_at)}
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 items-start overflow-x-auto pb-4 custom-scrollbar">

                      {/* Columna Por Hacer */}
                      <div className="flex-1 min-w-[280px] bg-slate-50/50 dark:bg-slate-950/40 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 p-5 backdrop-blur-sm">
                        <h4 className="font-extrabold text-slate-800 dark:text-slate-200 mb-5 flex items-center justify-between tracking-wide">
                          POR HACER
                          <span className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs px-2.5 py-1 rounded-md shadow-sm border border-slate-200 dark:border-slate-700">
                            {projectData.tasks_data.filter(t => t.status === 'todo').length}
                          </span>
                        </h4>
                        <div className="space-y-4">
                          {projectData.tasks_data.filter(t => t.status === 'todo').map((tarea) => (
                            <div key={tarea.id} className="group bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col gap-3">
                              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{tarea.text}</p>
                              {tarea.createdAt && (
                                <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/80">
                                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Creado {formatShortDate(tarea.createdAt)}</span>
                                </div>
                              )}
                            </div>
                          ))}
                          {projectData.tasks_data.filter(t => t.status === 'todo').length === 0 && (
                            <div className="py-8 text-center bg-slate-100/50 dark:bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                              <p className="text-xs font-bold text-slate-400">Sin tareas pendientes</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Columna En Curso */}
                      <div className="flex-1 min-w-[280px] bg-gradient-to-b from-indigo-50/80 to-transparent dark:from-indigo-950/30 dark:to-transparent rounded-2xl border-t-4 border-indigo-500 shadow-lg p-5">
                        <h4 className="font-extrabold text-indigo-900 dark:text-indigo-100 mb-5 flex items-center justify-between tracking-wide">
                          TRABAJANDO AHORA
                          <span className="bg-indigo-600 text-white text-xs px-2.5 py-1 rounded-md shadow-md animate-pulse">
                            {projectData.tasks_data.filter(t => t.status === 'in_progress').length}
                          </span>
                        </h4>
                        <div className="space-y-4">
                          {projectData.tasks_data.filter(t => t.status === 'in_progress').map((tarea) => (
                            <div key={tarea.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-indigo-200 dark:border-indigo-700/50 shadow-xl shadow-indigo-500/10 ring-1 ring-indigo-500/50 flex flex-col gap-4 relative overflow-hidden transition-transform duration-300 hover:scale-[1.02]">
                              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/20 to-purple-500/0 blur-2xl rounded-full"></div>

                              <div className="flex items-start gap-3">
                                <span className="relative flex h-3 w-3 mt-1 shrink-0">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                                </span>
                                <p className="text-sm font-bold text-indigo-950 dark:text-white leading-snug">{tarea.text}</p>
                              </div>

                              <div className="flex items-center justify-between mt-auto pt-4 border-t border-indigo-50 dark:border-indigo-900/50">
                                <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/60 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800/50">
                                  <PlayCircle size={14} className="text-indigo-600 dark:text-indigo-400" />
                                  <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">
                                    Empezado {timeAgo(tarea.startedAt) || 'hoy'}
                                  </span>
                                </div>
                                <div className="flex -space-x-2 drop-shadow-md">
                                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[9px] font-extrabold text-white" title="Equipo de Desarrollo">AI</div>
                                </div>
                              </div>
                            </div>
                          ))}
                          {projectData.tasks_data.filter(t => t.status === 'in_progress').length === 0 && (
                            <div className="py-8 text-center bg-indigo-50/50 dark:bg-indigo-900/20 rounded-xl border-2 border-dashed border-indigo-200 dark:border-indigo-800">
                              <p className="text-xs font-bold text-indigo-400">Preparando siguiente tarea...</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Columna Completado */}
                      <div className="flex-1 min-w-[280px] bg-green-50/30 dark:bg-green-950/10 rounded-2xl border border-green-100/50 dark:border-green-900/30 p-5">
                        <h4 className="font-extrabold text-green-800 dark:text-green-400 mb-5 flex items-center justify-between tracking-wide">
                          COMPLETADO
                          <span className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs px-2.5 py-1 rounded-md shadow-sm">
                            {projectData.tasks_data.filter(t => t.status === 'done').length}
                          </span>
                        </h4>
                        <div className="space-y-4">
                          {projectData.tasks_data.filter(t => t.status === 'done').map((tarea) => (
                            <div key={tarea.id} className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm p-5 rounded-xl border border-green-200/60 dark:border-green-800/40 shadow-sm flex flex-col gap-2 transition-all hover:bg-white dark:hover:bg-slate-900 hover:shadow-md">
                              <div className="flex items-start gap-3">
                                <div className="p-1 bg-green-100 dark:bg-green-900/50 rounded-full mt-0.5">
                                  <CheckCircle2 size={14} className="text-green-600 dark:text-green-400 shrink-0" strokeWidth={3} />
                                </div>
                                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 line-through decoration-green-500/40">{tarea.text}</p>
                              </div>
                              {tarea.completedAt && (
                                <div className="mt-2 pl-8">
                                  <span className="text-[10px] text-green-600/80 dark:text-green-400/80 font-black uppercase tracking-wider">Listo • {formatShortDate(tarea.completedAt)}</span>
                                </div>
                              )}
                            </div>
                          ))}
                          {projectData.tasks_data.filter(t => t.status === 'done').length === 0 && (
                            <div className="py-8 text-center bg-green-50/50 dark:bg-green-900/10 rounded-xl border-2 border-dashed border-green-200 dark:border-green-900/50">
                              <p className="text-xs font-bold text-green-600/60 dark:text-green-500/60">Aún no hay tareas finalizadas</p>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative mt-12 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl shadow-xl border border-slate-200/50 dark:border-slate-800 p-12 text-center">
                  <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <Code2 size={32} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Centro de Operaciones</h3>
                  <p className="text-slate-500 max-w-md mx-auto">Estamos planificando y estructurando las tareas de desarrollo para tu proyecto. Pronto aparecerán aquí.</p>
                </div>
              )}
            </motion.div>
          )}
          {/* PESTAÑA: FINANZAS */}
          {activeTab === 'finanzas' && (
            <motion.div
              key="finanzas"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] shadow-xl border border-slate-200/50 dark:border-slate-800 overflow-hidden relative p-8 md:p-12 text-center">
                <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                  <Wallet size={40} />
                </div>
                <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">Estado Financiero</h2>
                <p className="text-slate-500 max-w-lg mx-auto mb-10">Resumen de la inversión y pagos de tu proyecto.</p>

                {budgetData ? (
                  <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                    <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Presupuesto Total</span>
                      <div className="text-4xl font-black text-slate-800 dark:text-white flex items-center gap-1">
                        <DollarSign size={24} className="text-slate-400" />
                        {budgetData.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </div>
                      {budgetData.descuento > 0 && (
                        <span className="inline-block mt-2 text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded">Incluye descuento aplicado</span>
                      )}
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Estado Actual</span>
                      <div className="flex items-center gap-3 mt-2">
                        <div className={clsx(
                          "px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2",
                          budgetData.estado === 'Aceptado' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                            budgetData.estado === 'Rechazado' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                              "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        )}>
                          {budgetData.estado === 'Aceptado' && <CheckCircle2 size={16} />}
                          {budgetData.estado}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500 italic p-8 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 max-w-md mx-auto">
                    No hay presupuestos vinculados a este proyecto todavía.
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* PESTAÑA: ENTREGABLES */}
          {activeTab === 'entregables' && (
            <motion.div
              key="entregables"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] shadow-xl border border-slate-200/50 dark:border-slate-800 overflow-hidden relative p-8 md:p-12 text-center">
                <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                  <FileText size={40} />
                </div>
                <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">Entregables y Enlaces</h2>
                <p className="text-slate-500 max-w-lg mx-auto mb-10">Accede directamente a los archivos de diseño, código o documentos legales.</p>

                {projectData.deliverable_links && projectData.deliverable_links.length > 0 ? (
                  <div className="max-w-3xl mx-auto space-y-4 text-left">
                    {projectData.deliverable_links.map((link, idx) => (
                      <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-lg transition-all">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-slate-100 dark:bg-slate-900 text-slate-500 rounded-xl group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                            <LinkIcon size={20} />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 dark:text-white">{link.title}</h4>
                            <p className="text-xs text-slate-500">{link.description || link.url}</p>
                          </div>
                        </div>
                        <div className="p-2 text-slate-300 group-hover:text-indigo-500 transform group-hover:translate-x-1 transition-all">
                          <ArrowRight size={20} />
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-500 italic p-12 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 max-w-lg mx-auto flex flex-col items-center">
                    <FolderKanban size={32} className="mb-4 opacity-50" />
                    Aún no hemos subido entregables para tu proyecto. ¡Aparecerán aquí muy pronto!
                  </div>
                )}
              </div>
            </motion.div>
          )}

        {/* PESTAÑA: EQUIPO */}
        {activeTab === 'equipo' && (
        <motion.div
          key="equipo"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-8"
        >
          {/* Tarjetas de Equipo */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] shadow-xl border border-slate-200/50 dark:border-slate-800 overflow-hidden relative p-8 md:p-12 text-center">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-indigo-500 to-purple-600 opacity-20"></div>
            <div className="w-20 h-20 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl relative z-10">
              <Users size={40} />
            </div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2 relative z-10">Tu Equipo Asignado</h2>
            <p className="text-slate-500 max-w-lg mx-auto mb-10 relative z-10">Conoce a los especialistas detrás de tu proyecto.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-6 hover:shadow-lg transition-all">
                <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=256&h=256&auto=format&fit=crop" alt="CEO" className="w-20 h-20 rounded-full shadow-md object-cover ring-4 ring-indigo-50 dark:ring-indigo-900" />
                <div className="text-left">
                  <h4 className="text-lg font-bold text-slate-800 dark:text-white">Hernán Bull</h4>
                  <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-1">CEO & Founder</p>
                  <p className="text-xs text-slate-500">Supervisando personalmente el éxito de tu proyecto.</p>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-6 hover:shadow-lg transition-all">
                <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=256&h=256&auto=format&fit=crop" alt="Tech Lead" className="w-20 h-20 rounded-full shadow-md object-cover ring-4 ring-orange-50 dark:ring-orange-900" />
                <div className="text-left">
                  <h4 className="text-lg font-bold text-slate-800 dark:text-white">Sarah Jenkins</h4>
                  <p className="text-sm font-bold text-orange-600 dark:text-orange-400 mb-1">Lead Developer</p>
                  <p className="text-xs text-slate-500">Asegurando la máxima calidad y rendimiento del código.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Calendly / Reuniones */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[2rem] shadow-xl overflow-hidden relative p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 blur-3xl rounded-full"></div>
            <div className="text-left relative z-10 max-w-md">
              <h3 className="text-3xl font-black text-white mb-4">¿Necesitas hablar?</h3>
              <p className="text-indigo-200 mb-6">Agenda una videollamada de 30 minutos con nosotros para revisar avances, despejar dudas o planificar los siguientes pasos.</p>
              <a href="https://calendly.com/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-indigo-900 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                <CalendarDays size={20} /> Agendar Reunión
              </a>
            </div>
            <div className="relative z-10 w-full max-w-sm">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl text-white">
                 <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-indigo-500/30 rounded-xl"><Clock size={24} className="text-indigo-300"/></div>
                    <div>
                      <p className="font-bold">Horario de Atención</p>
                      <p className="text-sm text-indigo-200">Lun - Vie, 9:00am - 5:00pm</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/30 rounded-xl"><CalendarDays size={24} className="text-indigo-300"/></div>
                    <div>
                      <p className="font-bold">Disponibilidad Actual</p>
                      <p className="text-sm text-indigo-200">Alta. Agenda en 24h.</p>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </motion.div>
        )}

        {/* PESTAÑA: MANTENIMIENTO */}
        {activeTab === 'mantenimiento' && (
        <motion.div
          key="mantenimiento"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-8"
        >
          {(!projectData.maintenance_data || projectData.maintenance_data.status === 'inactive') ? (
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] shadow-xl border border-slate-200/50 dark:border-slate-800 overflow-hidden relative p-6 md:p-16 text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-inner">
                <Wrench size={32} className="md:w-10 md:h-10" />
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white mb-3 md:mb-4">Soporte y Mantenimiento</h2>
              <p className="text-sm md:text-lg text-slate-500 max-w-lg mx-auto">Este módulo se activará automáticamente una vez que tu software sea lanzado a producción.</p>
            </div>
          ) : (
            <>
              {/* Resumen de Salud */}
              {/* Resumen de Salud & Soporte Técnico */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-[2rem] p-8 text-white shadow-lg shadow-emerald-900/20 relative overflow-hidden">
                  <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-10">
                    <ShieldCheck size={160} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-white/20 rounded-xl"><Server size={24} /></div>
                      <h3 className="font-bold text-lg text-emerald-50">Estado del Sistema</h3>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-4 h-4 rounded-full bg-emerald-300 animate-pulse border-2 border-white"></div>
                      <span className="text-3xl font-black">Operativo al 100%</span>
                    </div>
                    <p className="mt-4 text-emerald-100 font-medium">Sistemas asegurados y actualizados. Sin vulnerabilidades detectadas.</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-center">
                  <div className="flex items-center gap-6 mb-6">
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shadow-inner">
                      <CalendarDays size={32} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Próximo Mantenimiento</h3>
                      <p className="text-2xl font-black text-slate-800 dark:text-white">
                        {projectData.maintenance_data.next_date ? formatShortDate(projectData.maintenance_data.next_date) : 'Por programar'}
                      </p>
                    </div>
                  </div>
                  {budgetData?.maintenance?.hours > 0 && (
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center">
                        <Headset size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-white">Bolsa de Horas</h4>
                        <p className="text-sm text-slate-500">{budgetData.maintenance.hours} horas mensuales disponibles</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Infraestructura y Servicios (Si aplica) */}
              {(budgetData?.maintenance?.infraCosts?.length > 0 || budgetData?.maintenance?.services?.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {budgetData.maintenance.infraCosts?.length > 0 && (
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] shadow-xl border border-slate-200/50 dark:border-slate-800 p-8">
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-3">
                        <Database className="text-indigo-500" /> Infraestructura Cloud
                      </h3>
                      <ul className="space-y-4">
                        {budgetData.maintenance.infraCosts.map((infra, idx) => (
                          <li key={idx} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
                              <Globe size={18} />
                            </div>
                            <span className="font-medium text-slate-700 dark:text-slate-300">{infra.name || 'Servidor Cloud'}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {budgetData.maintenance.services?.length > 0 && (
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] shadow-xl border border-slate-200/50 dark:border-slate-800 p-8">
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-3">
                        <Sparkles className="text-indigo-500" /> Servicios Activos
                      </h3>
                      <ul className="space-y-4">
                        {budgetData.maintenance.services.map((service, idx) => (
                          <li key={idx} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-lg">
                              <Check size={18} />
                            </div>
                            <span className="font-medium text-slate-700 dark:text-slate-300">{service.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Registro de Intervenciones */}
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] shadow-xl border border-slate-200/50 dark:border-slate-800 p-8">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-3">
                  <Clock className="text-indigo-500" /> Registro de Intervenciones
                </h3>
                
                {projectData.maintenance_data.logs && projectData.maintenance_data.logs.length > 0 ? (
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 dark:before:via-slate-700 before:to-transparent">
                    {projectData.maintenance_data.logs.map((log, idx) => (
                      <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-900 bg-indigo-500 text-slate-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                          <CheckCircle2 size={16} />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-800 dark:text-slate-100">{log.title}</span>
                          </div>
                          <span className="text-xs font-medium text-indigo-500 mb-2 block">{formatShortDate(log.date)}</span>
                          <p className="text-sm text-slate-500">{log.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                    <p className="text-slate-500 italic">No hay registros de mantenimiento todavía. Aquí aparecerán todos los trabajos de soporte y actualizaciones que realicemos.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>
        )}
        </AnimatePresence>

        {/* Footer */}
        <div className="text-center text-sm text-slate-500 pt-8 pb-4">
          <p>Esta página se actualiza automáticamente a medida que avanzamos en tu proyecto.</p>
        </div>
      </div>



      {/* Floating Chat Button */}
      <AnimatePresence>
        {!isChatOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-6 right-6 p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-2xl hover:shadow-indigo-500/50 z-50 flex items-center justify-center group"
          >
            <MessageSquare size={24} />
            {projectData.messages && projectData.messages.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-slate-900"></span>
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Sidebar Overlay */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 right-0 w-full sm:w-[400px] z-40 shadow-[-10px_0_30px_rgba(0,0,0,0.1)] dark:shadow-[-10px_0_30px_rgba(0,0,0,0.5)]"
          >
            <ChatWidget
              projectId={projectData.id}
              initialMessages={projectData.messages || []}
              currentUserType="client"
              onClose={() => setIsChatOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
