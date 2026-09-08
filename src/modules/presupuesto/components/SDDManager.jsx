import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { 
  ClipboardCopy, CheckCircle2, GripVertical, Plus, Trash2, 
  PlayCircle, Clock, Share2, Code2, PenTool, Search, ShieldCheck,
  MessageSquare, X
} from 'lucide-react';
import { ChatWidget } from './ChatWidget';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cx(...inputs) {
  return twMerge(clsx(inputs));
}

export function SDDManager({ activeWorkspace }) {
  const [activeStep, setActiveStep] = useState('constitucion');
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareLink, setShareLink] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [initialMessages, setInitialMessages] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (activeWorkspace) {
      loadWorkspaceProject();
    }
  }, [activeWorkspace]);

  const loadWorkspaceProject = async () => {
    try {
      const { data: proj, error } = await supabase
        .from('sdd_projects')
        .select('*')
        .eq('workspace_id', activeWorkspace.id)
        .single();
        
      if (proj) {
        setData(prev => ({
          ...prev,
          constitucion: { ...prev.constitucion, name: proj.project_name || activeWorkspace.name },
          tareas: proj.tasks_data || prev.tareas
        }));
        setShareLink(proj.client_code);
        setProjectId(proj.id);
        setInitialMessages(proj.messages || []);
        if (proj.current_step) setActiveStep(proj.current_step);
      }
    } catch (err) {
      console.error("Error cargando proyecto SDD:", err);
    }
  };

  const [data, setData] = useState({
    constitucion: { name: '', techStack: '', goal: '' },
    especificacion: { content: '' },
    clarificacion: { qna: '' },
    plan: { content: '' },
    tareas: [
      { id: 1, text: 'Definir esquema de base de datos', status: 'todo', createdAt: new Date().toISOString() },
      { id: 2, text: 'Crear componentes UI', status: 'todo', createdAt: new Date().toISOString() },
    ]
  });

  const handleCopyPrompt = (promptText) => {
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPromptForStep = (stepId) => {
    switch (stepId) {
      case 'constitucion': return `Arquitecto. Iniciaremos el proyecto "${data.constitucion.name}". Stack: ${data.constitucion.techStack}. Objetivo: ${data.constitucion.goal}. Define la constitución.`;
      case 'especificacion': return `Basado en esta idea:\n${data.especificacion.content}\n\nAyúdame a redactar el archivo "spec.md" definiendo el QUÉ y el POR QUÉ. No escribas código.`;
      case 'clarificacion': return `Lee el spec.md. Como QA, hazme preguntas para mejorar la spec y cerrar decisiones.`;
      case 'plan': return `El spec.md está cerrado. Crea el "plan.md" definiendo El CÓMO: Arquitectura y Datos.`;
      case 'tareas': return `Convierte el plan.md en "tasks.md". Pasos pequeños y verificables.`;
      case 'implementacion': return `Implementa la primera tarea pendiente. Tests en verde. Una tarea a la vez.`;
      case 'validacion': return `Revisa el código final contra los criterios del spec.md. ¿Cumplimos todo?`;
      default: return '';
    }
  };

  const handleShareClient = async () => {
    if (!activeWorkspace) {
      alert("No hay un negocio activo seleccionado.");
      return;
    }
    setSharing(true);
    try {
      const completedTasks = data.tareas.filter(t => t.status === 'done').length;
      const totalTasks = data.tareas.length;

      let currentCode = shareLink;
      if (!currentCode) {
        const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        currentCode = `PRO-${randomCode}`;
        setShareLink(currentCode);
      }

      // Actualizar proyecto en lugar de crear
      const { error } = await supabase
        .from('sdd_projects')
        .upsert([{
          workspace_id: activeWorkspace.id,
          project_name: data.constitucion.name || activeWorkspace.name,
          current_step: activeStep,
          tasks_total: totalTasks,
          tasks_completed: completedTasks,
          tasks_data: data.tareas,
          client_code: currentCode
        }], { onConflict: 'workspace_id' });

      if (error) throw error;
      
      alert(`¡Portal sincronizado correctamente!\n\nEl cliente ya puede ver los cambios en su tablero con el código del negocio.`);
    } catch (err) {
      console.error(err);
      alert('Error al sincronizar con la base de datos.');
    } finally {
      setSharing(false);
    }
  };

  // Colores ajustados para Dark Mode (cuidan la vista pero mantienen la esencia del diagrama)
  const stepsColors = {
    constitucion: { bg: 'bg-slate-800', border: 'border-slate-500', text: 'text-slate-200', textMuted: 'text-slate-400', title: '0. CONSTITUCIÓN' },
    especificacion: { bg: 'bg-blue-900/30', border: 'border-blue-500', text: 'text-blue-300', textMuted: 'text-blue-400/70', title: '1. ESPECIFICACIÓN', subtitle: '(spec.md)' },
    clarificacion: { bg: 'bg-slate-900', border: 'border-blue-500', text: 'text-blue-300', textMuted: 'text-blue-400/70', title: '2. CLARIFICACIÓN' },
    plan: { bg: 'bg-orange-900/30', border: 'border-orange-500', text: 'text-orange-300', textMuted: 'text-orange-400/70', title: '3. PLAN TÉCNICO', subtitle: '(plan.md)' },
    tareas: { bg: 'bg-green-900/30', border: 'border-green-500', text: 'text-green-300', textMuted: 'text-green-400/70', title: '4. TAREAS', subtitle: '(tasks.md)' },
    implementacion: { bg: 'bg-slate-900', border: 'border-green-500', text: 'text-green-300', textMuted: 'text-green-400/70', title: '5. IMPLEMENTACIÓN' },
    validacion: { bg: 'bg-slate-900', border: 'border-green-500', text: 'text-green-300', textMuted: 'text-green-400/70', title: '6. VALIDACIÓN' },
  };

  if (!mounted) return null;

  return (
    <div className="h-full flex flex-col xl:flex-row gap-6 p-4 bg-slate-950 font-sans text-slate-200">
      
      {/* Sidebar: Flowchart adaptado a Dark Mode */}
      <div className="xl:w-[400px] shrink-0 flex flex-col items-center overflow-y-auto custom-scrollbar bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-md relative">
        
        {/* Fase 0 */}
        <div className="w-full border-2 border-dashed border-slate-700 p-4 rounded-lg flex flex-col items-center relative mb-8">
          <span className="absolute -top-3 bg-slate-900 px-2 text-[10px] text-slate-400 font-medium tracking-wider uppercase">Definición y Alcance</span>
          
          <button 
            onClick={() => setActiveStep('constitucion')}
            className={cx("w-48 py-3 px-4 border-2 shadow-sm transition-all text-center", stepsColors.constitucion.bg, stepsColors.constitucion.border, stepsColors.constitucion.text, activeStep === 'constitucion' ? 'ring-2 ring-slate-400 scale-105' : 'hover:bg-slate-700')}
          >
            <span className="font-bold text-sm block">{stepsColors.constitucion.title}</span>
          </button>
        </div>

        {/* Flecha */}
        <div className="flex flex-col items-center -mt-8 mb-2">
          <div className="w-0.5 h-6 bg-slate-600"></div>
          <span className="text-[10px] font-medium text-slate-400 my-1">Una vez por proyecto</span>
          <div className="w-0.5 h-6 bg-slate-600"></div>
          <div className="w-2 h-2 border-b-2 border-r-2 border-slate-600 rotate-45 -mt-1.5 mb-2"></div>
        </div>

        {/* Fase 1 */}
        <div className="w-full border-2 border-dashed border-slate-700 p-4 rounded-lg flex flex-col items-center relative mb-8">
          <span className="absolute -top-3 bg-slate-900 px-2 text-[10px] text-slate-400 font-medium tracking-wider uppercase">Diseño y Planificación</span>
          
          <div className="relative w-full flex flex-col items-center">
            {/* Especificación */}
            <button 
              onClick={() => setActiveStep('especificacion')}
              className={cx("w-48 py-3 px-4 border-2 shadow-sm transition-all text-center", stepsColors.especificacion.bg, stepsColors.especificacion.border, stepsColors.especificacion.text, activeStep === 'especificacion' ? 'ring-2 ring-blue-400 scale-105' : 'hover:bg-blue-900/40')}
            >
              <span className="font-bold text-sm block">{stepsColors.especificacion.title}</span>
              <span className="text-xs font-medium">{stepsColors.especificacion.subtitle}</span>
            </button>

            {/* Loop Arrow SVG */}
            <svg className="absolute left-1/2 ml-24 top-6 w-16 h-28 pointer-events-none" style={{zIndex: 0}}>
               <path d="M 0 0 C 40 0, 40 110, 0 110" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4" />
               <polygon points="4,4 0,0 8,4" fill="#3b82f6" stroke="none" />
            </svg>
            <span className="absolute left-1/2 ml-28 top-16 text-[9px] text-blue-300 font-medium w-24 text-center leading-tight bg-slate-900/90 rounded px-1">Bucle de preguntas<br/>(Mejora la spec)</span>

            {/* Flecha a Clarificación */}
            <div className="flex flex-col items-center">
              <div className="w-0.5 h-6 bg-slate-600"></div>
              <div className="flex items-center gap-2">
                 <span className="text-[10px] font-medium text-slate-400 absolute -ml-28">El QUÉ y el POR QUÉ</span>
              </div>
              <div className="w-0.5 h-6 bg-slate-600"></div>
              <div className="w-2 h-2 border-b-2 border-r-2 border-slate-600 rotate-45 -mt-1.5 mb-2"></div>
            </div>

            {/* Clarificación */}
            <button 
              onClick={() => setActiveStep('clarificacion')}
              className={cx("w-48 py-3 px-4 border-2 shadow-sm transition-all text-center", stepsColors.clarificacion.bg, stepsColors.clarificacion.border, stepsColors.clarificacion.text, activeStep === 'clarificacion' ? 'ring-2 ring-blue-400 scale-105' : 'hover:bg-slate-800')}
            >
              <span className="font-bold text-sm block">{stepsColors.clarificacion.title}</span>
            </button>

            {/* Flecha a Plan Técnico */}
            <div className="flex flex-col items-center">
              <div className="w-0.5 h-6 bg-slate-600"></div>
              <span className="text-[10px] font-medium text-slate-400 my-1">Decisiones cerradas</span>
              <div className="w-0.5 h-6 bg-slate-600"></div>
              <div className="w-2 h-2 border-b-2 border-r-2 border-slate-600 rotate-45 -mt-1.5 mb-2"></div>
            </div>

            {/* Plan Técnico */}
            <button 
              onClick={() => setActiveStep('plan')}
              className={cx("w-48 py-3 px-4 border-2 shadow-sm transition-all text-center", stepsColors.plan.bg, stepsColors.plan.border, stepsColors.plan.text, activeStep === 'plan' ? 'ring-2 ring-orange-400 scale-105' : 'hover:bg-orange-900/40')}
            >
              <span className="font-bold text-sm block">{stepsColors.plan.title}</span>
              <span className="text-xs font-medium">{stepsColors.plan.subtitle}</span>
            </button>
          </div>
        </div>

        {/* Flecha Fase 1 a Fase 2 */}
        <div className="flex flex-col items-center -mt-8 mb-2">
          <div className="w-0.5 h-8 bg-slate-600"></div>
          <span className="text-[10px] font-medium text-slate-400 my-1 text-center leading-tight">El CÓMO: Arquitectura<br/>y Datos</span>
          <div className="w-0.5 h-8 bg-slate-600"></div>
          <div className="w-2 h-2 border-b-2 border-r-2 border-slate-600 rotate-45 -mt-1.5 mb-2"></div>
        </div>

        {/* Fase 2 */}
        <div className="w-full border-2 border-dashed border-slate-700 p-4 rounded-lg flex flex-col items-center relative mb-8">
          <span className="absolute -top-3 bg-slate-900 px-2 text-[10px] text-slate-400 font-medium tracking-wider uppercase">Construcción y Control</span>
          
          <div className="relative w-full flex flex-col items-center">
            {/* Tareas */}
            <button 
              onClick={() => setActiveStep('tareas')}
              className={cx("w-48 py-3 px-4 border-2 shadow-sm transition-all text-center", stepsColors.tareas.bg, stepsColors.tareas.border, stepsColors.tareas.text, activeStep === 'tareas' ? 'ring-2 ring-green-400 scale-105' : 'hover:bg-green-900/40')}
            >
              <span className="font-bold text-sm block">{stepsColors.tareas.title}</span>
              <span className="text-xs font-medium">{stepsColors.tareas.subtitle}</span>
            </button>

            <div className="flex flex-col items-center">
              <div className="w-0.5 h-6 bg-slate-600"></div>
              <span className="text-[10px] font-medium text-slate-400 my-1 text-center leading-tight">Pasos pequeños y<br/>verificables</span>
              <div className="w-0.5 h-6 bg-slate-600"></div>
              <div className="w-2 h-2 border-b-2 border-r-2 border-slate-600 rotate-45 -mt-1.5 mb-2"></div>
            </div>

            {/* Implementacion */}
            <button 
              onClick={() => setActiveStep('implementacion')}
              className={cx("w-48 py-3 px-4 border-2 shadow-sm transition-all text-center", stepsColors.implementacion.bg, stepsColors.implementacion.border, stepsColors.implementacion.text, activeStep === 'implementacion' ? 'ring-2 ring-green-400 scale-105' : 'hover:bg-slate-800')}
            >
              <span className="font-bold text-sm block">{stepsColors.implementacion.title}</span>
            </button>

            <div className="flex flex-col items-center">
              <div className="w-0.5 h-6 bg-slate-600"></div>
              <span className="text-[10px] font-medium text-slate-400 my-1 text-center leading-tight">Tarea a tarea (Tests<br/>en verde)</span>
              <div className="w-0.5 h-6 bg-slate-600"></div>
              <div className="w-2 h-2 border-b-2 border-r-2 border-slate-600 rotate-45 -mt-1.5 mb-2"></div>
            </div>

            {/* Validacion */}
            <button 
              onClick={() => setActiveStep('validacion')}
              className={cx("w-48 py-3 px-4 border-2 shadow-sm transition-all text-center", stepsColors.validacion.bg, stepsColors.validacion.border, stepsColors.validacion.text, activeStep === 'validacion' ? 'ring-2 ring-green-400 scale-105' : 'hover:bg-slate-800')}
            >
              <span className="font-bold text-sm block">{stepsColors.validacion.title}</span>
            </button>

            <div className="flex flex-col items-center">
              <div className="w-0.5 h-6 bg-slate-600"></div>
              <span className="text-[10px] font-medium text-slate-400 my-1">Criterios vs Código</span>
              <div className="w-0.5 h-6 bg-slate-600"></div>
              <div className="w-2 h-2 border-b-2 border-r-2 border-slate-600 rotate-45 -mt-1.5 mb-2"></div>
            </div>

            {/* Rombo Decision */}
            <div className="relative mt-2">
              <div className="w-28 h-28 bg-yellow-900/30 border-2 border-yellow-500 rotate-45 flex items-center justify-center cursor-pointer hover:scale-105 transition-all shadow-sm" onClick={() => setActiveStep('validacion')}>
                <div className="-rotate-45 text-yellow-400 flex flex-col items-center text-center leading-tight">
                  <span className="font-bold text-sm">¿Cambios/<br/>mejoras?</span>
                </div>
              </div>

              {/* SÍ Arrow */}
              <div className="absolute right-[-70px] top-4 flex items-center">
                 <div className="w-24 border-t-2 border-slate-600"></div>
                 <div className="absolute -top-3 left-6 bg-slate-900 text-slate-300 text-[10px] px-1 whitespace-nowrap">SÍ: Volver a la fuente</div>
              </div>
            </div>
            
            <div className="flex flex-col items-center mt-6">
              <div className="w-0.5 h-6 bg-slate-600"></div>
              <span className="text-[10px] font-medium text-slate-400 my-1">NO: Fin del ciclo</span>
              <div className="w-0.5 h-6 bg-slate-600"></div>
              <div className="w-2 h-2 border-b-2 border-r-2 border-slate-600 rotate-45 -mt-1.5 mb-2"></div>
            </div>

            <div className="w-48 py-3 px-4 border-2 shadow-sm text-center bg-green-900/50 border-green-500 text-green-300 rounded-lg">
              <span className="font-bold text-sm block">PROYECTO<br/>COMPLETADO</span>
            </div>

          </div>
        </div>
      </div>

      {/* Main Content Area (Modo Oscuro, Descansa la Vista) */}
      <div className={cx("flex-1 rounded-xl shadow-md border-2 overflow-hidden flex flex-col transition-colors duration-300", stepsColors[activeStep]?.border || "border-slate-800", "bg-slate-900")}>
        
        {/* Header Dinámico */}
        <div className="px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/50 bg-slate-900/50">
          <div>
            <h2 className={cx("text-2xl font-bold tracking-tight", stepsColors[activeStep]?.text)}>
              {stepsColors[activeStep]?.title} {stepsColors[activeStep]?.subtitle && <span className={cx("text-base font-normal", stepsColors[activeStep]?.textMuted)}>{stepsColors[activeStep]?.subtitle}</span>}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            {shareLink && (
              <div className="flex flex-col items-end mr-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Código Portal</span>
                <button 
                  onClick={() => { navigator.clipboard.writeText(shareLink); alert('Código copiado: ' + shareLink); }}
                  className="bg-indigo-900/40 text-indigo-300 px-3 py-1 rounded-lg text-sm font-mono font-bold border border-indigo-800 hover:bg-indigo-800 transition-colors cursor-copy"
                  title="Copiar código"
                >
                  {shareLink}
                </button>
              </div>
            )}
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded shadow-sm text-sm font-bold transition-all border border-indigo-700 bg-indigo-900/50 text-indigo-300 hover:bg-indigo-800 hover:text-white relative"
            >
              <MessageSquare size={16} />
              Chat Cliente
            </button>
            <button
              onClick={handleShareClient}
              disabled={sharing}
              className="flex items-center gap-2 px-4 py-2 rounded shadow-sm text-sm font-bold transition-all border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              {sharing ? <div className="w-4 h-4 rounded-full border-2 border-slate-400 border-t-white animate-spin" /> : <Share2 size={16} />}
              Guardar / Sincronizar Portal
            </button>
            <button
              onClick={() => handleCopyPrompt(getPromptForStep(activeStep))}
              className={cx("flex items-center gap-2 px-4 py-2 rounded shadow-sm text-sm font-bold transition-all border bg-slate-800 hover:bg-slate-700", stepsColors[activeStep]?.border, stepsColors[activeStep]?.text)}
            >
              {copied ? <CheckCircle2 size={16} /> : <ClipboardCopy size={16} />}
              {copied ? 'Copiado al Portapapeles' : 'Copiar Prompt IA'}
            </button>
          </div>
        </div>

        {/* Workspace (Textareas oscuras para no cansar la vista) */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-950">
          <div className="max-w-4xl mx-auto">
            
            {activeStep === 'constitucion' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className={cx("block text-xs font-bold mb-2 uppercase tracking-wider", stepsColors.constitucion.textMuted)}>Nombre del Proyecto</label>
                    <input type="text" value={data.constitucion.name} onChange={e => setData({...data, constitucion: {...data.constitucion, name: e.target.value}})} className="w-full p-4 border border-slate-800 rounded-lg bg-slate-900 text-slate-200 focus:outline-none focus:border-slate-500 shadow-inner" placeholder="Ej. Presupuesto App" />
                  </div>
                  <div>
                    <label className={cx("block text-xs font-bold mb-2 uppercase tracking-wider", stepsColors.constitucion.textMuted)}>Stack Tecnológico</label>
                    <input type="text" value={data.constitucion.techStack} onChange={e => setData({...data, constitucion: {...data.constitucion, techStack: e.target.value}})} className="w-full p-4 border border-slate-800 rounded-lg bg-slate-900 text-slate-200 focus:outline-none focus:border-slate-500 shadow-inner" placeholder="React, Tailwind..." />
                  </div>
                </div>
                <div>
                  <label className={cx("block text-xs font-bold mb-2 uppercase tracking-wider", stepsColors.constitucion.textMuted)}>Definición y Alcance</label>
                  <textarea value={data.constitucion.goal} onChange={e => setData({...data, constitucion: {...data.constitucion, goal: e.target.value}})} className="w-full h-40 p-4 border border-slate-800 rounded-lg bg-slate-900 text-slate-200 focus:outline-none focus:border-slate-500 resize-none shadow-inner" placeholder="¿Qué vamos a construir y por qué?" />
                </div>
              </div>
            )}

            {activeStep === 'especificacion' && (
              <div className="space-y-4">
                <p className={cx("text-sm font-medium", stepsColors.especificacion.textMuted)}>Aquí definimos el QUÉ y el POR QUÉ basándonos en tu idea. No escribas código.</p>
                <textarea value={data.especificacion.content} onChange={e => setData({...data, especificacion: {content: e.target.value}})} className={cx("w-full h-[500px] p-6 border rounded-lg bg-slate-900 focus:outline-none resize-none font-mono text-sm shadow-inner transition-colors", stepsColors.especificacion.border, stepsColors.especificacion.text)} placeholder="Escribe aquí tus historias de usuario..." />
              </div>
            )}

            {activeStep === 'clarificacion' && (
              <div className="space-y-4">
                <p className={cx("text-sm font-medium", stepsColors.clarificacion.textMuted)}>Pega aquí el bucle de preguntas y las decisiones que cerraste con la IA.</p>
                <textarea value={data.clarificacion.qna} onChange={e => setData({...data, clarificacion: {qna: e.target.value}})} className={cx("w-full h-[500px] p-6 border rounded-lg bg-slate-900 focus:outline-none resize-none font-mono text-sm shadow-inner transition-colors", stepsColors.clarificacion.border, stepsColors.clarificacion.text)} placeholder="Q: ¿Qué pasa si falla?\nA: Mostramos un error genérico." />
              </div>
            )}

            {activeStep === 'plan' && (
              <div className="space-y-4">
                <p className={cx("text-sm font-medium", stepsColors.plan.textMuted)}>Arquitectura y Datos. El CÓMO se construye la especificación.</p>
                <textarea value={data.plan.content} onChange={e => setData({...data, plan: {content: e.target.value}})} className={cx("w-full h-[500px] p-6 border rounded-lg bg-slate-900 focus:outline-none resize-none font-mono text-sm shadow-inner transition-colors", stepsColors.plan.border, stepsColors.plan.text)} placeholder="[NEW] src/components/... \nModelos:..." />
              </div>
            )}

            {activeStep === 'tareas' && (
              <div className="space-y-4">
                 <p className={cx("text-sm font-medium mb-4", stepsColors.tareas.textMuted)}>Pasos pequeños y verificables. Convierte el plan en un tablero Kanban.</p>
                 
                 <div className="flex gap-4 items-start overflow-x-auto pb-4 custom-scrollbar">
                   {/* Columna Por Hacer */}
                   <div className="flex-1 min-w-[280px] bg-slate-900 rounded-xl border border-slate-800 p-4">
                     <h4 className="font-bold text-slate-300 mb-4 flex items-center justify-between">
                       Por Hacer 
                       <span className="bg-slate-800 text-slate-400 text-xs px-2 py-1 rounded-full">{data.tareas.filter(t => t.status === 'todo').length}</span>
                     </h4>
                     <div className="space-y-3">
                       {data.tareas.filter(t => t.status === 'todo').map((tarea) => (
                         <div key={tarea.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 shadow-sm flex items-start gap-2 group">
                           <input type="text" value={tarea.text} onChange={(e) => { const t = [...data.tareas]; const idx = t.findIndex(x => x.id === tarea.id); t[idx].text = e.target.value; setData({...data, tareas: t}); }} className="flex-1 bg-transparent border-none outline-none text-sm text-slate-300 w-full" />
                           <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => { const t = [...data.tareas]; const idx = t.findIndex(x => x.id === tarea.id); t[idx].status = 'in_progress'; t[idx].startedAt = new Date().toISOString(); setData({...data, tareas: t}); }} className="text-slate-500 hover:text-blue-400" title="Mover a En Curso">→</button>
                             <button onClick={() => setData({...data, tareas: data.tareas.filter(x => x.id !== tarea.id)})} className="text-slate-600 hover:text-red-500" title="Eliminar"><Trash2 size={14} /></button>
                           </div>
                         </div>
                       ))}
                       <button onClick={() => setData({...data, tareas: [...data.tareas, {id: Date.now(), text: 'Nueva tarea', status: 'todo', createdAt: new Date().toISOString()}]})} className="w-full p-2 mt-2 border-2 border-dashed border-slate-700 text-slate-500 text-sm font-bold hover:bg-slate-800 hover:text-slate-300 rounded-lg flex items-center justify-center gap-1 transition-colors">
                         <Plus size={16} /> Añadir
                       </button>
                     </div>
                   </div>

                   {/* Columna En Curso */}
                   <div className="flex-1 min-w-[280px] bg-indigo-950/20 rounded-xl border border-indigo-900/50 p-4">
                     <h4 className="font-bold text-indigo-300 mb-4 flex items-center justify-between">
                       En Curso 
                       <span className="bg-indigo-900/50 text-indigo-300 text-xs px-2 py-1 rounded-full">{data.tareas.filter(t => t.status === 'in_progress').length}</span>
                     </h4>
                     <div className="space-y-3">
                       {data.tareas.filter(t => t.status === 'in_progress').map((tarea) => (
                         <div key={tarea.id} className="bg-slate-900 p-3 rounded-lg border border-indigo-800/50 shadow-sm flex items-start gap-2 group ring-1 ring-indigo-500/30">
                           <span className="flex-1 text-sm text-indigo-100">{tarea.text}</span>
                           <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => { const t = [...data.tareas]; const idx = t.findIndex(x => x.id === tarea.id); t[idx].status = 'todo'; t[idx].startedAt = null; setData({...data, tareas: t}); }} className="text-indigo-400 hover:text-indigo-300" title="Devolver a Por Hacer">←</button>
                             <button onClick={() => { const t = [...data.tareas]; const idx = t.findIndex(x => x.id === tarea.id); t[idx].status = 'done'; t[idx].completedAt = new Date().toISOString(); setData({...data, tareas: t}); }} className="text-green-500 hover:text-green-400" title="Completar">→</button>
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>

                   {/* Columna Completado */}
                   <div className="flex-1 min-w-[280px] bg-green-950/20 rounded-xl border border-green-900/50 p-4">
                     <h4 className="font-bold text-green-300 mb-4 flex items-center justify-between">
                       Completado 
                       <span className="bg-green-900/50 text-green-300 text-xs px-2 py-1 rounded-full">{data.tareas.filter(t => t.status === 'done').length}</span>
                     </h4>
                     <div className="space-y-3">
                       {data.tareas.filter(t => t.status === 'done').map((tarea) => (
                         <div key={tarea.id} className="bg-slate-900 p-3 rounded-lg border border-green-800/50 shadow-sm flex items-start gap-2 group opacity-70">
                           <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
                           <span className="flex-1 text-sm text-green-200 line-through">{tarea.text}</span>
                           <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => { const t = [...data.tareas]; const idx = t.findIndex(x => x.id === tarea.id); t[idx].status = 'in_progress'; t[idx].completedAt = null; setData({...data, tareas: t}); }} className="text-slate-500 hover:text-indigo-400" title="Reabrir tarea">←</button>
                             <button onClick={() => setData({...data, tareas: data.tareas.filter(x => x.id !== tarea.id)})} className="text-slate-600 hover:text-red-500" title="Eliminar"><Trash2 size={14} /></button>
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 </div>
              </div>
            )}

            {activeStep === 'implementacion' && (
              <div className="text-center py-24">
                <h3 className={cx("text-3xl font-bold mb-4", stepsColors.implementacion.text)}>Tarea a tarea (Tests en verde)</h3>
                <p className="text-slate-400 mb-10 max-w-md mx-auto">Tu enfoque actual. Trabaja solo en las tareas "En Curso".</p>
                <div className={cx("max-w-lg mx-auto p-8 bg-slate-900 border-2 rounded-xl shadow-lg", stepsColors.implementacion.border)}>
                  <span className={cx("text-xs font-bold uppercase tracking-wider block mb-4", stepsColors.implementacion.textMuted)}>Trabajando en:</span>
                  {data.tareas.filter(t => t.status === 'in_progress').length > 0 ? (
                    <div className="space-y-4">
                      {data.tareas.filter(t => t.status === 'in_progress').map(t => (
                        <p key={t.id} className={cx("text-xl font-bold", stepsColors.implementacion.text)}>
                          {t.text}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className={cx("text-xl font-bold flex items-center justify-center gap-3", stepsColors.implementacion.text)}>
                      <CheckCircle2 size={24} /> No hay tareas en curso
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeStep === 'validacion' && (
              <div className="text-center py-24">
                <h3 className={cx("text-3xl font-bold mb-4", stepsColors.validacion.text)}>Criterios vs Código</h3>
                <p className="text-slate-400 mb-10 max-w-md mx-auto">Revisa que el código generado cumpla al 100% con los requerimientos definidos en `spec.md`.</p>
                <div className="flex flex-col sm:flex-row justify-center gap-6">
                  <button onClick={() => setActiveStep('especificacion')} className="px-8 py-4 border-2 border-yellow-500/50 text-yellow-400 bg-yellow-900/10 hover:bg-yellow-900/30 font-bold rounded-xl flex items-center justify-center gap-3 transition-colors">
                    SÍ HAY CAMBIOS (Volver a la fuente)
                  </button>
                  <button onClick={() => alert('Proyecto Finalizado')} className="px-8 py-4 border-2 border-green-500 text-slate-950 bg-green-500 hover:bg-green-400 font-bold rounded-xl flex items-center justify-center gap-3 transition-colors shadow-lg shadow-green-900/20">
                    NO (Proyecto Completado)
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Chat Sidebar Overlay */}
      <AnimatePresence>
        {isChatOpen && projectId && (
          <motion.div 
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-y-0 right-0 w-full sm:w-[400px] z-50 shadow-[-10px_0_30px_rgba(0,0,0,0.1)] dark:shadow-[-10px_0_30px_rgba(0,0,0,0.5)]"
          >
            <ChatWidget 
              projectId={projectId} 
              initialMessages={initialMessages} 
              currentUserType="agency"
              onClose={() => setIsChatOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
      

    </div>
  );
}
