import React from 'react';
import { ArrowLeft, Save, FileText, Tag, AlignLeft, BookOpen, CheckSquare, Link as LinkIcon, Plus, Trash2, Edit3, Clock, Code, AlertTriangle, Paperclip, Upload, Loader2, ListChecks, DollarSign, Lock, Cloud, ArrowUp } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../utils/supabaseClient';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function ServiceEditor({ service, categories = [], onChange, onSave, onCancel }) {
  
  const [isSaving, setIsSaving] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [pendingFiles, setPendingFiles] = React.useState([]);

  const isNameEmpty = !service.name || service.name.trim() === '';

  const logbook = service.logbook || { 
    steps: [], 
    links: [], 
    notes: '',
    estimatedTime: '',
    codeSnippets: [],
    resolutions: '',
    attachments: [],
    requirements: [],
    costBreakdown: []
  };

  const updateGeneralInfo = (key, value) => {
    onChange({ ...service, [key]: value });
  };

  const updateLogbook = (key, value) => {
    onChange({ ...service, logbook: { ...logbook, [key]: value } });
  };

  // Funciones para Desglose de Costos
  const addCostItem = () => {
    updateLogbook('costBreakdown', [...(logbook.costBreakdown || []), { id: Date.now().toString(), name: '', amount: 0 }]);
  };

  const updateCostItem = (id, key, value) => {
    const updated = (logbook.costBreakdown || []).map(c => c.id === id ? { ...c, [key]: value } : c);
    
    // Si estamos actualizando un monto, recalcular el costo total
    if (key === 'amount') {
      const newTotalCost = updated.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      onChange({ ...service, cost: newTotalCost, logbook: { ...logbook, costBreakdown: updated } });
    } else {
      updateLogbook('costBreakdown', updated);
    }
  };

  const removeCostItem = (id) => {
    const updated = (logbook.costBreakdown || []).filter(c => c.id !== id);
    const newTotalCost = updated.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    onChange({ ...service, cost: newTotalCost, logbook: { ...logbook, costBreakdown: updated } });
  };

  // Funciones para Requerimientos
  const addRequirement = () => {
    updateLogbook('requirements', [...(logbook.requirements || []), { id: Date.now().toString(), text: '' }]);
  };

  const updateRequirement = (id, text) => {
    updateLogbook('requirements', (logbook.requirements || []).map(r => r.id === id ? { ...r, text } : r));
  };

  const removeRequirement = (id) => {
    updateLogbook('requirements', (logbook.requirements || []).filter(r => r.id !== id));
  };

  // Funciones para Pasos (Checklist)
  const addStep = () => {
    updateLogbook('steps', [...(logbook.steps || []), { id: Date.now().toString(), text: '' }]);
  };

  const updateStep = (id, text) => {
    updateLogbook('steps', (logbook.steps || []).map(s => s.id === id ? { ...s, text } : s));
  };

  const removeStep = (id) => {
    updateLogbook('steps', (logbook.steps || []).filter(s => s.id !== id));
  };

  // Funciones para Enlaces
  const addLink = () => {
    updateLogbook('links', [...(logbook.links || []), { id: Date.now().toString(), title: '', url: '' }]);
  };

  const updateLink = (id, key, value) => {
    updateLogbook('links', (logbook.links || []).map(l => l.id === id ? { ...l, [key]: value } : l));
  };

  const removeLink = (id) => {
    updateLogbook('links', (logbook.links || []).filter(l => l.id !== id));
  };

  // Funciones para Archivos Adjuntos
  const uploadFileToDrive = (file, serviceName, onProgress) => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('serviceName', serviceName);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-to-drive`, true);
      xhr.setRequestHeader('Authorization', `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(event.loaded, event.total);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          try {
            reject(JSON.parse(xhr.responseText).error || 'Error desconocido');
          } catch (e) {
            reject('Error desconocido');
          }
        }
      };

      xhr.onerror = () => reject('Error de red');
      xhr.send(formData);
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert("El archivo supera el límite de 50MB");
      return;
    }

    setPendingFiles(prev => [...prev, { file, id: Date.now().toString(), originalName: file.name, size: file.size }]);
    e.target.value = '';
  };

  const removePendingFile = (id) => {
    setPendingFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleSave = async () => {
    if (pendingFiles.length === 0) {
      onSave();
      return;
    }

    setIsSaving(true);
    let successfullyUploaded = [];
    let hasError = false;

    for (let i = 0; i < pendingFiles.length; i++) {
      const pending = pendingFiles[i];
      try {
        const data = await uploadFileToDrive(pending.file, service.name, (loaded, total) => {
           const baseProgress = (i / pendingFiles.length) * 100;
           const currentProgress = (loaded / total) * (100 / pendingFiles.length);
           setUploadProgress(Math.round(baseProgress + currentProgress));
        });

        successfullyUploaded.push({
          id: Date.now().toString() + i,
          originalName: data.originalName,
          url: data.url,
          mimetype: data.mimetype,
          size: data.size
        });
      } catch (err) {
        alert(`Error al subir ${pending.originalName}: ${err}`);
        hasError = true;
        break;
      }
    }

    if (!hasError) {
      const finalAttachments = [...(logbook.attachments || []), ...successfullyUploaded];
      onChange({ ...service, logbook: { ...logbook, attachments: finalAttachments } });
      
      setTimeout(() => {
         setPendingFiles([]);
         setIsSaving(false);
         setUploadProgress(0);
         onSave();
      }, 100);
    } else {
      setIsSaving(false);
      setUploadProgress(0);
    }
  };

  const removeAttachment = (id) => {
    updateLogbook('attachments', (logbook.attachments || []).filter(a => a.id !== id));
  };

  // Funciones para Fragmentos de Código
  const addCodeSnippet = () => {
    updateLogbook('codeSnippets', [...(logbook.codeSnippets || []), { id: Date.now().toString(), title: '', code: '' }]);
  };

  const updateCodeSnippet = (id, key, value) => {
    updateLogbook('codeSnippets', (logbook.codeSnippets || []).map(c => c.id === id ? { ...c, [key]: value } : c));
  };

  const removeCodeSnippet = (id) => {
    updateLogbook('codeSnippets', (logbook.codeSnippets || []).filter(c => c.id !== id));
  };

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Overlay de Carga General al Guardar - PREMIUM */}
      {isSaving && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-500">
          <div className="relative bg-white/90 dark:bg-slate-900/90 p-10 rounded-[2rem] shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 border border-white/50 dark:border-slate-700/50 backdrop-blur-xl overflow-hidden">
            {/* Ambient Glow */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
               <div className="w-48 h-48 bg-blue-500 rounded-full blur-3xl animate-pulse"></div>
            </div>

             <div className="relative flex items-center justify-center w-24 h-24 mb-6 z-10">
               <div className="absolute inset-0 border-4 border-slate-100/20 dark:border-slate-800/50 rounded-full"></div>
               <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
               
               {/* Centro con Nube */}
               <div className="relative flex items-center justify-center w-full h-full text-blue-500">
                 <Cloud size={32} className="absolute opacity-80 drop-shadow-md" />
                 <ArrowUp size={16} className="absolute animate-bounce mt-1 text-blue-600 dark:text-blue-400" strokeWidth={3} />
               </div>
             </div>
             
             <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-2 z-10 tracking-tight drop-shadow-sm">Sincronizando...</h3>
             
             {uploadProgress === 0 ? (
               <p className="text-sm font-medium text-blue-600/80 dark:text-blue-400/80 mb-6 text-center z-10 animate-pulse">
                 Conectando con Google Drive y creando estructura de carpetas...
               </p>
             ) : (
               <p className="text-sm font-medium text-slate-500 mb-6 text-center z-10">
                 Subiendo archivos a tu catálogo en la nube.
               </p>
             )}
             
             {pendingFiles.length > 0 && (
               <div className="w-full z-10">
                 <div className="flex justify-between text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">
                   <span>Progreso Total</span>
                   <span className="text-blue-600 dark:text-blue-400 text-sm">{uploadProgress}%</span>
                 </div>
                 <div className="w-full bg-slate-200/50 dark:bg-slate-800/50 h-4 rounded-full overflow-hidden shadow-inner relative border border-slate-300/30 dark:border-slate-700/50">
                   <div 
                     className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-300 ease-out flex items-center justify-end overflow-hidden" 
                     style={{ width: `${uploadProgress}%` }}
                   >
                     {/* Efecto de brillo barriendo la barra */}
                     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
                   </div>
                 </div>
               </div>
             )}
          </div>
        </div>
      )}
      
      {/* Cabecera del Editor */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <button 
          onClick={onCancel}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors px-2 py-1 font-medium"
        >
          <ArrowLeft size={18} />
          Volver al Catálogo
        </button>
        
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] w-full sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={18} />
          Guardar Servicio y Bitácora
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start flex-1">
        
        {/* Panel Izquierdo: Información General */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 lg:sticky lg:top-24 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-xl font-extrabold mb-6 flex items-center gap-2">
              <FileText className="text-blue-500" size={24} />
              Datos del Servicio
            </h3>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Tag size={16} /> Nombre del Servicio
                </label>
                <input
                  type="text"
                  value={service.name}
                  onChange={(e) => updateGeneralInfo('name', e.target.value)}
                  placeholder="Ej. Mantenimiento Preventivo Servidor"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-800 dark:text-white shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Tag size={16} /> Categoría / Etiqueta
                </label>
                <select
                  value={service.category || ''}
                  onChange={(e) => updateGeneralInfo('category', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium shadow-inner appearance-none cursor-pointer"
                >
                  <option value="">-- Sin Asignar --</option>
                  {categories.map((cat, idx) => (
                    <option key={idx} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-red-500 flex items-center gap-1.5">
                    Costo Sugerido (€)
                    {(logbook.costBreakdown?.length > 0) && (
                      <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded ml-auto">(Auto)</span>
                    )}
                  </label>
                  <input
                    type="number"
                    value={service.cost || ''}
                    onChange={(e) => updateGeneralInfo('cost', e.target.value)}
                    placeholder="0.00"
                    disabled={logbook.costBreakdown?.length > 0}
                    className={cn(
                      "w-full rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 outline-none transition-all font-medium",
                      (logbook.costBreakdown?.length > 0) 
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-500 border-transparent cursor-not-allowed" 
                        : "bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30"
                    )}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-emerald-500">
                    Precio Sugerido (€)
                  </label>
                  <input
                    type="number"
                    value={service.price || ''}
                    onChange={(e) => updateGeneralInfo('price', e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlignLeft size={16} /> Descripción Corta
                </label>
                <textarea
                  value={service.description}
                  onChange={(e) => updateGeneralInfo('description', e.target.value)}
                  placeholder="Describe brevemente en qué consiste..."
                  rows={4}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none shadow-inner"
                />
              </div>

              {/* Desglose de Costos (NUEVO) */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign size={16} className="text-red-500" />
                    Desglose de Costos (Opcional)
                  </label>
                  <button 
                    onClick={addCostItem}
                    className="text-[10px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus size={12} /> Añadir Gasto
                  </button>
                </div>
                
                {(!logbook.costBreakdown || logbook.costBreakdown.length === 0) ? (
                   <p className="text-xs text-slate-400 italic">Si añades ítems aquí, el Costo Sugerido se calculará automáticamente.</p>
                ) : (
                  <div className="space-y-2">
                    {logbook.costBreakdown.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Ej. Cable red"
                          value={item.name}
                          onChange={(e) => updateCostItem(item.id, 'name', e.target.value)}
                          className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-red-500 outline-none transition-all"
                        />
                        <div className="relative w-24">
                          <input
                            type="number"
                            placeholder="0.00"
                            value={item.amount === 0 ? '' : item.amount}
                            onChange={(e) => updateCostItem(item.id, 'amount', e.target.value)}
                            className="w-full bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg pl-3 pr-6 py-1.5 text-xs font-medium focus:ring-2 focus:ring-red-500 outline-none transition-all"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-red-400 pointer-events-none">€</span>
                        </div>
                        <button 
                          onClick={() => removeCostItem(item.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100 dark:border-slate-800 font-bold">
                      <span className="text-slate-500">Suma Total:</span>
                      <span className="text-red-500">{service.cost || 0} €</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Panel Derecho: Bitácora Técnica Avanzada */}
        <div className="lg:col-span-7 relative">
          <div className={cn(
            "bg-white dark:bg-slate-900 rounded-3xl p-6 lg:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 h-full flex flex-col transition-all duration-300",
            isNameEmpty && "opacity-40 pointer-events-none blur-[3px] select-none scale-[0.98]"
          )}>
            
            <div className="flex items-center gap-3 mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
              <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 p-3 rounded-2xl text-indigo-600 dark:text-indigo-400">
                <BookOpen size={28} />
              </div>
              <div className="flex-1 flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-white">Bitácora Técnica</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manual de ejecución, enlaces, código y notas.</p>
                </div>
                {/* Tiempo Estimado (NUEVO) */}
                <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                  <Clock size={16} className="text-indigo-500" />
                  <input
                    type="text"
                    placeholder="Ej. 2 horas"
                    value={logbook.estimatedTime || ''}
                    onChange={(e) => updateLogbook('estimatedTime', e.target.value)}
                    className="w-24 bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-300 placeholder-slate-400 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-8 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[70vh]">
              
              {/* Sección: Requerimientos Previos (NUEVO) */}
              <section className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                    <ListChecks size={16} className="text-blue-500" />
                    Lista de Requerimientos
                  </h4>
                  <button 
                    onClick={addRequirement}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus size={14} /> Añadir Requisito
                  </button>
                </div>
                
                {(!logbook.requirements || logbook.requirements.length === 0) ? (
                  <p className="text-sm text-slate-400 italic bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">No hay requerimientos definidos. ¿Qué materiales o accesos necesitas para empezar?</p>
                ) : (
                  <div className="space-y-2">
                    {logbook.requirements.map((req, index) => (
                      <div key={req.id} className="flex items-start gap-3 group">
                        <div className="mt-2.5 shrink-0 flex items-center justify-center text-blue-400">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        </div>
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            value={req.text}
                            onChange={(e) => updateRequirement(req.id, e.target.value)}
                            placeholder={`Ej. Destornillador, Credenciales AWS, Pendrive 16GB...`}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          />
                        </div>
                        <button 
                          onClick={() => removeRequirement(req.id)}
                          className="mt-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Sección: Pasos a Seguir */}
              <section className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                    <CheckSquare size={16} className="text-emerald-500" />
                    Checklist de Tareas
                  </h4>
                  <button 
                    onClick={addStep}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus size={14} /> Añadir Paso
                  </button>
                </div>
                
                {(!logbook.steps || logbook.steps.length === 0) ? (
                  <p className="text-sm text-slate-400 italic bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">No hay pasos definidos. Añade el primer paso a seguir.</p>
                ) : (
                  <div className="space-y-2">
                    {logbook.steps.map((step, index) => (
                      <div key={step.id} className="flex items-start gap-3 group">
                        <div className="mt-2.5 w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-900">
                          {index + 1}
                        </div>
                        <div className="flex-1 relative">
                          <textarea
                            value={step.text}
                            onChange={(e) => updateStep(step.id, e.target.value)}
                            placeholder={`Describe el paso ${index + 1}...`}
                            rows={1}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-y min-h-[42px]"
                          />
                        </div>
                        <button 
                          onClick={() => removeStep(step.id)}
                          className="mt-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Sección: Enlaces Útiles */}
              <section className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                    <LinkIcon size={16} className="text-blue-500" />
                    Enlaces y Herramientas
                  </h4>
                  <button 
                    onClick={addLink}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus size={14} /> Añadir Enlace
                  </button>
                </div>

                {(!logbook.links || logbook.links.length === 0) ? (
                  <p className="text-sm text-slate-400 italic bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">No hay enlaces guardados.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {logbook.links.map((link) => (
                      <div key={link.id} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl relative group">
                        <input
                          type="text"
                          placeholder="Título (Ej. Driver v2.0)"
                          value={link.title}
                          onChange={(e) => updateLink(link.id, 'title', e.target.value)}
                          className="w-full bg-transparent text-sm font-bold text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none mb-2"
                        />
                        <div className="flex items-center gap-2">
                          <LinkIcon size={12} className="text-slate-400" />
                          <input
                            type="url"
                            placeholder="https://..."
                            value={link.url}
                            onChange={(e) => updateLink(link.id, 'url', e.target.value)}
                            className="w-full bg-transparent text-xs text-blue-500 placeholder-slate-400 outline-none"
                          />
                        </div>
                        <button 
                          onClick={() => removeLink(link.id)}
                          className="absolute right-2 top-2 p-1 text-slate-300 hover:text-red-500 bg-white dark:bg-slate-900 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Sección: Archivos Adjuntos (NUEVO) */}
              <section className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                    <Paperclip size={16} className="text-rose-500" />
                    Documentos Adjuntos
                  </h4>
                  <div className="relative rounded-lg overflow-hidden group bg-rose-50 dark:bg-rose-900/20 transition-all border border-rose-100 dark:border-rose-900/30">
                    <input 
                      type="file" 
                      id="file-upload" 
                      className="hidden" 
                      onChange={handleFileUpload} 
                    />
                    <label 
                      htmlFor="file-upload"
                      className="text-xs font-bold px-4 py-2.5 transition-all flex items-center justify-center gap-2 cursor-pointer text-rose-600 hover:text-rose-700 hover:bg-rose-100 dark:text-rose-400 dark:hover:text-rose-300 dark:hover:bg-rose-900/50 select-none"
                    >
                      <Upload size={15} className="group-hover:-translate-y-0.5 transition-transform" />
                      <span>Añadir Archivo</span>
                    </label>
                  </div>
                </div>

                {(!logbook.attachments || logbook.attachments.length === 0) && pendingFiles.length === 0 ? (
                  <p className="text-sm text-slate-400 italic bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">No hay archivos adjuntos (PDFs, Word, Imágenes).</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Archivos ya subidos */}
                    {(logbook.attachments || []).map((file) => (
                      <div key={file.id} className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl hover:border-rose-300 dark:hover:border-rose-500/50 transition-colors shadow-sm group">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="bg-rose-100 dark:bg-rose-900/30 text-rose-500 p-2 rounded-lg shrink-0">
                            <FileText size={18} />
                          </div>
                          <div className="truncate">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate" title={file.originalName}>
                              {file.originalName}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <a 
                            href={file.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Ver archivo"
                          >
                            <BookOpen size={16} />
                          </a>
                          <button 
                            onClick={() => removeAttachment(file.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Eliminar archivo"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Archivos pendientes de subir */}
                    {pendingFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/50 p-3 rounded-xl hover:border-orange-300 transition-colors shadow-sm group relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAiPjwvcmVjdD4KPHBhdGggZD0iTTAgMEw4IDhaTThgMTAgMExwMCAxMFoiIHN0cm9rZT0iI2ZiOTIzYyIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIiBmaWxsLW9wYWNpdHk9IjEiIHN0cm9rZS1vcGFjaXR5PSIwLjEiPjwvcGF0aD4KPC9zdmc+')] opacity-50"></div>
                        <div className="flex items-center gap-3 overflow-hidden relative z-10">
                          <div className="bg-orange-100 dark:bg-orange-900/40 text-orange-500 p-2 rounded-lg shrink-0">
                            <Clock size={18} />
                          </div>
                          <div className="truncate">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate" title={file.originalName}>
                              {file.originalName}
                            </p>
                            <p className="text-[10px] text-orange-500 font-semibold">
                              Pendiente • {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 relative z-10">
                          <button 
                            onClick={() => removePendingFile(file.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Quitar archivo"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Sección: Fragmentos de Código (NUEVO) */}
              <section className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                    <Code size={16} className="text-purple-500" />
                    Fragmentos de Código / Comandos
                  </h4>
                  <button 
                    onClick={addCodeSnippet}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus size={14} /> Añadir Snippet
                  </button>
                </div>

                {(!logbook.codeSnippets || logbook.codeSnippets.length === 0) ? (
                  <p className="text-sm text-slate-400 italic bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">No hay comandos guardados.</p>
                ) : (
                  <div className="space-y-4">
                    {logbook.codeSnippets.map((snippet) => (
                      <div key={snippet.id} className="bg-slate-900 dark:bg-black rounded-xl overflow-hidden border border-slate-700 relative group">
                        <div className="bg-slate-800 px-4 py-2 flex justify-between items-center">
                          <input
                            type="text"
                            placeholder="Descripción del comando (Ej. Reiniciar Docker)"
                            value={snippet.title}
                            onChange={(e) => updateCodeSnippet(snippet.id, 'title', e.target.value)}
                            className="bg-transparent text-xs font-mono text-slate-300 outline-none w-full"
                          />
                          <button 
                            onClick={() => removeCodeSnippet(snippet.id)}
                            className="p-1 text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <textarea
                          value={snippet.code}
                          onChange={(e) => updateCodeSnippet(snippet.id, 'code', e.target.value)}
                          placeholder="sudo systemctl restart docker..."
                          rows={3}
                          className="w-full bg-transparent text-sm font-mono text-emerald-400 p-4 outline-none resize-y"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Sección: Resoluciones de Problemas (NUEVO) */}
              <section className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                  <AlertTriangle size={16} className="text-orange-500" />
                  Historial de Resoluciones
                </h4>
                <p className="text-xs text-slate-500">Anota aquí cómo solucionaste problemas pasados al hacer este servicio.</p>
                <textarea
                  value={logbook.resolutions || ''}
                  onChange={(e) => updateLogbook('resolutions', e.target.value)}
                  placeholder="Ej. El 12/05 falló la conexión por el firewall. Se solucionó abriendo el puerto 8080..."
                  rows={4}
                  className="w-full bg-orange-50/30 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-400 outline-none transition-all shadow-inner"
                />
              </section>

              {/* Sección: Notas Adicionales */}
              <section className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                  <Edit3 size={16} className="text-amber-500" />
                  Notas Generales
                </h4>
                <textarea
                  value={logbook.notes || ''}
                  onChange={(e) => updateLogbook('notes', e.target.value)}
                  placeholder="Escribe aquí cualquier tip o consideración especial..."
                  rows={3}
                  className="w-full bg-amber-50/30 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-400 outline-none transition-all shadow-inner"
                />
              </section>

            </div>
          </div>

          {/* Overlay de Bloqueo (Se muestra si el nombre está vacío) */}
          {isNameEmpty && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/30 dark:bg-slate-950/40 backdrop-blur-md rounded-3xl animate-in fade-in zoom-in-95 duration-500 border border-white/50 dark:border-slate-700/50 p-6 text-center shadow-2xl">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-400 blur-xl opacity-20 rounded-full animate-pulse"></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-800 dark:to-slate-900 border border-blue-200 dark:border-slate-700 text-blue-500 dark:text-blue-400 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-blue-500/10">
                  <Lock size={32} className="drop-shadow-sm" />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mb-3 tracking-tight drop-shadow-sm">Sección Bloqueada</h3>
              <p className="text-slate-600 dark:text-slate-300 max-w-sm text-sm leading-relaxed font-medium">
                Para acceder a la bitácora, subir archivos o añadir tareas, primero debes escribir el <strong className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">Nombre del Servicio</strong> en el panel de la izquierda.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
