import React, { useState } from 'react';
import { Trash2, TrendingUp, CheckCircle, Clock, XCircle, FileText, ChevronDown, ChevronUp, BookOpen, CheckSquare, Link as LinkIcon, Code, AlertTriangle, Paperclip, Download, ListChecks, DollarSign } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function QuotePreview({ items, onRemoveItem, onUpdateItemStatus, maintenance }) {
  const [expandedLogbookId, setExpandedLogbookId] = useState(null);

  const toggleLogbook = (id) => {
    setExpandedLogbookId(expandedLogbookId === id ? null : id);
  };

  // Cálculos generales (incluyendo todo lo no rechazado para el "Presupuesto Total")
  const activeItems = items.filter(item => item.status !== 'rejected');
  
  const totalCost = activeItems.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
  const totalRevenue = activeItems.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
  const potentialProfit = totalRevenue - totalCost;

  // Cálculos de lo Aprobado Seguro
  const approvedItems = items.filter(item => item.status === 'approved');
  const approvedCost = approvedItems.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
  const approvedRevenue = approvedItems.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
  const approvedProfit = approvedRevenue - approvedCost;

  // Porcentajes para barra de progreso
  const approvedPct = totalRevenue > 0 ? (approvedRevenue / totalRevenue) * 100 : 0;

  // -- Cálculos de Mantenimiento --
  const maintActive = maintenance && (maintenance.hours > 0 || maintenance.services?.length > 0 || maintenance.infraCosts?.length > 0);
  
  let totalInfraCosts = 0;
  if (maintenance && maintenance.infraCosts) {
    totalInfraCosts = maintenance.infraCosts.reduce((sum, cost) => {
      let monthly = cost.amount || 0;
      if (cost.type === 'hourly') monthly = monthly * 730;
      else if (cost.type === 'annual') monthly = monthly / 12;
      return sum + monthly;
    }, 0);
  }
  
  const infraWithMargin = maintenance ? totalInfraCosts * (1 + (maintenance.margin / 100)) : 0;
  const supportCost = maintenance ? maintenance.hours * maintenance.hourlyRate : 0;
  
  let recurringServicesCost = 0;
  if (maintenance && maintenance.services) {
    recurringServicesCost = maintenance.services.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
  }
  
  const finalMaintQuote = supportCost + infraWithMargin + recurringServicesCost;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col h-auto lg:h-[calc(100vh-100px)]">
      
      {/* Cabecera del Panel */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 sm:p-8 text-white relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/5 blur-2xl"></div>
        <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-indigo-500/10 blur-xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-indigo-300 mb-1 font-medium">
            <TrendingUp size={18} />
            <span className="uppercase tracking-widest text-[10px]">Herramienta Personal</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Análisis de Costos y Ganancias</h2>
        </div>
      </div>

      {/* Contenido (Lista de ítems) */}
      <div className="flex-none lg:flex-1 lg:overflow-y-auto min-h-[300px] p-4 sm:p-8 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/50">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <FileText size={48} className="mb-4 opacity-20" />
            <p className="font-medium text-slate-500">No hay tareas en la lista.</p>
            <p className="text-sm mt-1">Añade servicios rápidos desde el panel izquierdo.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Cabecera de la tabla */}
            <div className="hidden sm:grid grid-cols-12 gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2 px-2">
              <div className="col-span-4">Servicio</div>
              <div className="col-span-3">Estado de Aprobación</div>
              <div className="col-span-2 text-right">Mi Costo</div>
              <div className="col-span-2 text-right text-emerald-500">Precio a Cobrar</div>
              <div className="col-span-1"></div>
            </div>

            {/* Ítems */}
            {items.map((item, index) => {
              const isRejected = item.status === 'rejected';
              const isApproved = item.status === 'approved';
              
              const itemCost = item.cost * item.quantity;
              const itemRevenue = item.finalPrice * item.quantity;
              const itemProfit = itemRevenue - itemCost;
              const margin = itemRevenue > 0 ? ((itemProfit / itemRevenue) * 100).toFixed(0) : 0;
              
              const hasLogbook = item.logbook && (
                item.logbook.steps?.length > 0 || 
                item.logbook.links?.length > 0 || 
                item.logbook.notes || 
                item.logbook.codeSnippets?.length > 0 || 
                item.logbook.resolutions ||
                item.logbook.attachments?.length > 0 ||
                item.logbook.requirements?.length > 0 ||
                item.logbook.costBreakdown?.length > 0
              );
              const isExpanded = expandedLogbookId === item.id;

              return (
                <div 
                  key={item.id} 
                  className={cn(
                    "flex flex-col border border-transparent last:border-0 group animate-in fade-in slide-in-from-bottom-4 transition-all duration-300 rounded-2xl relative overflow-hidden",
                    isRejected ? "bg-slate-100/50 dark:bg-slate-800/30 opacity-60" : "bg-white dark:bg-slate-900 shadow-sm hover:shadow-lg dark:hover:shadow-none hover:border-slate-200 dark:hover:border-slate-700/50",
                    isApproved && !isRejected && "bg-emerald-50/30 dark:bg-emerald-900/10 border-emerald-100/50 dark:border-emerald-900/30",
                    isExpanded && "border-indigo-200 dark:border-indigo-800 ring-2 ring-indigo-500/10"
                  )} 
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Borde izquierdo decorativo */}
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl transition-colors hidden sm:block",
                    isApproved ? 'bg-emerald-500' :
                    isRejected ? 'bg-slate-300 dark:bg-slate-700' : 'bg-amber-400'
                  )} />

                  {/* Fila Principal */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 items-center py-4 px-3 sm:px-4">
                    {/* Nombre y Cantidad */}
                    <div className="sm:col-span-4 pl-0 sm:pl-2">
                      <h4 className={cn(
                        "font-bold line-clamp-1",
                        isRejected ? "text-slate-500 line-through" : "text-slate-800 dark:text-slate-200"
                      )}>
                        {item.quantity > 1 ? `${item.quantity}x ` : ''}{item.name}
                      </h4>
                      {!isRejected && (
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          Margen: {margin}% (<span className={itemProfit >= 0 ? "text-emerald-500" : "text-red-500"}>{itemProfit >= 0 ? '+' : ''}{itemProfit.toFixed(2)}€</span>)
                        </p>
                      )}
                      {hasLogbook && !isRejected && (
                        <button 
                          onClick={() => toggleLogbook(item.id)}
                          className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-indigo-500 hover:text-indigo-600 uppercase tracking-wider bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 px-2 py-1 rounded-md transition-colors"
                        >
                          <BookOpen size={12} />
                          {isExpanded ? 'Ocultar Bitácora' : 'Ver Bitácora'}
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      )}
                    </div>
                    
                    {/* Selector de Estado */}
                    <div className="sm:col-span-3">
                      <div className="relative group/select">
                        <select
                          value={item.status || 'pending'}
                          onChange={(e) => onUpdateItemStatus(item.id, e.target.value)}
                          className={cn(
                            "text-xs font-bold px-3 py-2 rounded-full border outline-none w-full appearance-none cursor-pointer transition-all shadow-sm group-hover/select:shadow-md",
                            item.status === 'approved' ? "bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800/50 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500/20" :
                            item.status === 'rejected' ? "bg-slate-200 border-slate-300 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 focus:ring-2 focus:ring-slate-500/20" :
                            "bg-amber-100 border-amber-200 text-amber-700 dark:bg-amber-900/30 dark:border-amber-800/50 dark:text-amber-400 focus:ring-2 focus:ring-amber-500/20"
                          )}
                        >
                          <option value="pending" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium">⏳ En Evaluación</option>
                          <option value="approved" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium">✅ Aprobado (Seguro)</option>
                          <option value="rejected" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium">❌ Rechazado</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                      </div>
                    </div>

                    {/* Costo (Móvil y Desktop) */}
                    <div className="sm:col-span-2 flex justify-between sm:justify-end items-center sm:block">
                      <span className="sm:hidden text-xs text-slate-500 font-bold">Costo:</span>
                      <div className={cn("text-right font-medium", isRejected ? "text-slate-400 line-through" : "text-red-500 dark:text-red-400")}>
                        {itemCost.toFixed(2)}€
                      </div>
                    </div>
                    
                    {/* Precio a Cobrar (Móvil y Desktop) */}
                    <div className="sm:col-span-2 flex justify-between sm:justify-end items-center sm:block">
                      <span className="sm:hidden text-xs text-slate-500 font-bold">Cobrar:</span>
                      <div className={cn("text-right font-bold", isRejected ? "text-slate-400 line-through" : "text-slate-900 dark:text-white")}>
                        {itemRevenue.toFixed(2)}€
                      </div>
                    </div>
                    
                    {/* Borrar */}
                    <div className="sm:col-span-1 text-right absolute right-2 top-2 sm:static">
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="text-slate-300 hover:text-red-500 sm:opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white dark:bg-slate-800 rounded-md sm:bg-transparent"
                        title="Eliminar de la lista"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Panel Expandido (Bitácora Técnica Extendida) */}
                  {isExpanded && hasLogbook && !isRejected && (
                    <div className="border-t border-indigo-50 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-900/10 p-4 sm:p-6 animate-in slide-in-from-top-2">
                      
                      {/* Cabecera del Acordeón con Tiempo Estimado */}
                      {item.logbook.estimatedTime && (
                        <div className="mb-4 flex items-center gap-2 text-xs font-bold text-indigo-500 bg-white dark:bg-slate-900 w-max px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/50 shadow-sm">
                          <Clock size={14} /> Tiempo Estimado: {item.logbook.estimatedTime}
                        </div>
                      )}

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* Columna Izquierda */}
                        <div className="space-y-6">
                          
                          {/* Requerimientos (NUEVO) */}
                          {item.logbook.requirements?.length > 0 && (
                            <div>
                              <h5 className="text-[10px] uppercase font-bold text-blue-400 mb-2 flex items-center gap-1">
                                <ListChecks size={12} /> Requerimientos Previos
                              </h5>
                              <ul className="space-y-2">
                                {item.logbook.requirements.map((req) => (
                                  <li key={req.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-indigo-50 dark:border-indigo-900/50 shadow-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>
                                    <span>{req.text}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Desglose de Costos (NUEVO) */}
                          {item.logbook.costBreakdown?.length > 0 && (
                            <div>
                              <h5 className="text-[10px] uppercase font-bold text-red-400 mb-2 flex items-center gap-1">
                                <DollarSign size={12} /> Desglose de Gastos Base
                              </h5>
                              <ul className="space-y-2">
                                {item.logbook.costBreakdown.map((cost) => (
                                  <li key={cost.id} className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300 bg-red-50/50 dark:bg-red-900/10 p-2.5 rounded-lg border border-red-100/50 dark:border-red-900/30 shadow-sm">
                                    <span className="truncate">{cost.name || 'Gasto sin nombre'}</span>
                                    <span className="font-bold text-red-500">{Number(cost.amount).toFixed(2)}€</span>
                                  </li>
                                ))}
                                <li className="flex items-center justify-between text-sm p-2.5 border-t border-slate-100 dark:border-slate-800">
                                  <span className="font-bold text-slate-500 uppercase text-[10px]">Total Calculado</span>
                                  <span className="font-extrabold text-red-600">{Number(item.cost).toFixed(2)}€</span>
                                </li>
                              </ul>
                            </div>
                          )}

                          {/* Pasos */}
                          {item.logbook.steps?.length > 0 && (
                            <div>
                              <h5 className="text-[10px] uppercase font-bold text-indigo-400 mb-2 flex items-center gap-1">
                                <CheckSquare size={12} /> Checklist de Tareas
                              </h5>
                              <div className="space-y-2">
                                {item.logbook.steps.map((step) => (
                                  <label key={step.id} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-indigo-50 dark:border-indigo-900/50 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors shadow-sm">
                                    <input type="checkbox" className="mt-0.5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500" />
                                    <span>{step.text}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Resoluciones */}
                          {item.logbook.resolutions && (
                            <div>
                              <h5 className="text-[10px] uppercase font-bold text-orange-400 mb-2 flex items-center gap-1">
                                <AlertTriangle size={12} /> Historial de Resoluciones
                              </h5>
                              <p className="text-sm text-slate-700 dark:text-slate-300 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl border border-orange-100 dark:border-orange-900/30 whitespace-pre-wrap">
                                {item.logbook.resolutions}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Columna Derecha */}
                        <div className="space-y-6">
                          {/* Enlaces */}
                          {item.logbook.links?.length > 0 && (
                            <div>
                              <h5 className="text-[10px] uppercase font-bold text-indigo-400 mb-2 flex items-center gap-1">
                                <LinkIcon size={12} /> Enlaces Útiles
                              </h5>
                              <div className="space-y-2">
                                {item.logbook.links.map(link => (
                                  <a 
                                    key={link.id} 
                                    href={link.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:underline bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-indigo-50 dark:border-indigo-900/50 shadow-sm"
                                  >
                                    <LinkIcon size={14} />
                                    <span className="line-clamp-1">{link.title || link.url}</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Fragmentos de Código */}
                          {item.logbook.codeSnippets?.length > 0 && (
                            <div>
                              <h5 className="text-[10px] uppercase font-bold text-purple-400 mb-2 flex items-center gap-1">
                                <Code size={12} /> Fragmentos de Código
                              </h5>
                              <div className="space-y-3">
                                {item.logbook.codeSnippets.map(snippet => (
                                  <div key={snippet.id} className="bg-slate-900 dark:bg-black rounded-xl overflow-hidden shadow-md">
                                    <div className="bg-slate-800 px-3 py-1.5 flex justify-between items-center">
                                      <span className="text-[10px] font-mono text-slate-400">{snippet.title}</span>
                                      <button 
                                        className="text-[10px] text-indigo-400 hover:text-indigo-300"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigator.clipboard.writeText(snippet.code);
                                          // Se podría añadir un toast de copiado aquí
                                        }}
                                      >
                                        Copiar
                                      </button>
                                    </div>
                                    <pre className="p-3 text-xs font-mono text-emerald-400 overflow-x-auto">
                                      <code>{snippet.code}</code>
                                    </pre>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Documentos Adjuntos (NUEVO) */}
                          {item.logbook.attachments?.length > 0 && (
                            <div>
                              <h5 className="text-[10px] uppercase font-bold text-rose-400 mb-2 flex items-center gap-1">
                                <Paperclip size={12} /> Documentos Adjuntos
                              </h5>
                              <div className="space-y-2">
                                {item.logbook.attachments.map(file => (
                                  <a 
                                    key={file.id} 
                                    href={file.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-indigo-50 dark:border-indigo-900/50 shadow-sm transition-colors group"
                                  >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                      <FileText size={14} className="text-rose-400" />
                                      <span className="truncate" title={file.originalName}>{file.originalName}</span>
                                    </div>
                                    <Download size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-500 shrink-0" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Notas */}
                          {item.logbook.notes && (
                            <div>
                              <h5 className="text-[10px] uppercase font-bold text-amber-500 mb-2 flex items-center gap-1">
                                <FileText size={12} /> Notas Adicionales
                              </h5>
                              <p className="text-sm text-slate-700 dark:text-slate-300 italic bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30 whitespace-pre-wrap">
                                {item.logbook.notes}
                              </p>
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Totales y Resumen Financiero */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-6 lg:p-8 shrink-0">
        
        {/* Barra de Progreso de Aprobación */}
        {totalRevenue > 0 && (
          <div className="mb-8">
            <div className="flex justify-between items-end mb-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tasa de Aprobación</p>
              <span className="text-sm font-bold text-emerald-500">{approvedPct.toFixed(0)}% Aprobado</span>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
              <div 
                style={{ width: `${approvedPct}%` }} 
                className="bg-emerald-500 transition-all duration-1000 ease-out relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }}></div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Panel Izquierdo: Resumen Total Potencial */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-2">
              Si aprueban TODO (Potencial)
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Cobro Total al Cliente</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{totalRevenue.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Mis Costos Totales</span>
                <span className="font-medium text-red-500">-{totalCost.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-slate-100 dark:border-slate-800/50">
                <span className="font-bold text-slate-600 dark:text-slate-400">Ganancia Neta Potencial</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{potentialProfit.toFixed(2)}€</span>
              </div>
            </div>
          </div>

          {/* Panel Derecho: Dinero Seguro Aprobado */}
          <div className="space-y-4 bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
            <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle size={16} />
              Dinero Aprobado (Seguro)
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-emerald-700/70 dark:text-emerald-400/70">A Cobrar Seguro</span>
                <span className="font-medium text-emerald-800 dark:text-emerald-200">{approvedRevenue.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-emerald-700/70 dark:text-emerald-400/70">Costos Asegurados</span>
                <span className="font-medium text-red-500/80 dark:text-red-400">-{approvedCost.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-lg pt-2 border-t border-emerald-200/50 dark:border-emerald-800/50">
                <span className="font-extrabold text-emerald-900 dark:text-emerald-100">Ganancia Libre</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{approvedProfit.toFixed(2)}€</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* BLOQUE MANTENIMIENTO */}
      {maintActive && (
        <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border-t border-indigo-100 dark:border-indigo-900/30 p-6 lg:p-8 shrink-0">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-4">
            <Clock size={20} />
            <h3 className="text-lg font-extrabold">Plan de Mantenimiento Mensual</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Soporte ({maintenance.hours}h)</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{supportCost.toFixed(2)}€</p>
              <p className="text-[10px] text-slate-400 mt-1">A {Number(maintenance.hourlyRate).toFixed(2)}€/h</p>
            </div>
            
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Infraestructura</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{infraWithMargin.toFixed(2)}€</p>
              <p className="text-[10px] text-slate-400 mt-1">Margen aplicado: {maintenance.margin}%</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Servicios Recurrentes</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{recurringServicesCost.toFixed(2)}€</p>
              <p className="text-[10px] text-slate-400 mt-1">{maintenance.services?.length || 0} servicios incluidos</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-center bg-indigo-600 text-white p-4 sm:p-6 rounded-2xl shadow-lg shadow-indigo-600/20">
            <div>
              <p className="text-indigo-200 font-medium text-sm">Cuota Mensual del Cliente</p>
              <p className="text-3xl font-black mt-1">{finalMaintQuote.toFixed(2)}€<span className="text-lg font-medium text-indigo-300">/mes</span></p>
            </div>
            <div className="mt-4 sm:mt-0 text-right">
              <p className="text-indigo-200 text-sm">Mi Costo Fijo (Infraestructura)</p>
              <p className="font-bold text-lg">{totalInfraCosts.toFixed(2)}€/mes</p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
