import React from 'react';
import { Presentation, Sparkles, Calculator as CalcIcon } from 'lucide-react';

export function ServicePreview({ service }) {
  const fields = service?.fields || [];

  return (
    <div className="bg-slate-100 dark:bg-slate-800/50 rounded-3xl p-6 lg:p-8 h-full flex flex-col items-center relative overflow-hidden overflow-y-auto custom-scrollbar">
      
      {/* Background Decorators */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full mix-blend-multiply dark:mix-blend-lighten pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-fuchsia-500/10 blur-3xl rounded-full mix-blend-multiply dark:mix-blend-lighten pointer-events-none" />

      <div className="w-full max-w-md relative z-10 flex flex-col min-h-full py-4">
        <div className="flex items-center gap-2 justify-center mb-6 text-slate-500 dark:text-slate-400">
          <Presentation size={20} />
          <span className="font-semibold tracking-wide uppercase text-sm">Presentación del Servicio</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl shadow-indigo-900/5 dark:shadow-black/40 border border-slate-100 dark:border-slate-800/60 backdrop-blur-xl">
          
          {/* Cabecera del Servicio */}
          <div className="mb-8 text-center border-b border-slate-100 dark:border-slate-800 pb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <Sparkles size={32} />
            </div>
            <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
              {service?.name || 'Nombre del Servicio'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 leading-relaxed">
              {service?.description || 'Añade una descripción para detallar el alcance de este servicio al cliente.'}
            </p>
            
            <div className="mt-4 inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-full font-bold text-lg">
              {service?.price ? `Desde ${service.price}€` : 'Precio a consultar'}
            </div>
          </div>

          <form className="space-y-5">
            {fields.length === 0 ? (
              <div className="text-center py-4 opacity-50">
                <p className="text-sm italic">Servicio simple sin variables adicionales.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                  <span>Variables del Servicio</span>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700"></div>
                </div>
                {fields.map(field => (
                  <div key={field.id} className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      {field.label || 'Variable sin nombre'} {field.required && <span className="text-red-500">*</span>}
                    </label>

                    {field.type === 'text' && (
                      <input
                        type="text"
                        placeholder={field.placeholder}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400"
                      />
                    )}

                    {field.type === 'number' && (
                      <input
                        type="number"
                        placeholder={field.placeholder}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400"
                      />
                    )}

                    {field.type === 'select' && (
                      <select className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer text-slate-700 dark:text-slate-300">
                        <option value="" disabled selected>{field.placeholder || 'Selecciona una opción'}</option>
                        {field.options?.map((opt, i) => (
                          <option key={i} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}

                    {field.type === 'checkbox' && (
                      <label className="flex items-center gap-3 cursor-pointer p-3 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-slate-600 dark:text-slate-400">{field.placeholder || 'Incluir este extra'}</span>
                      </label>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
              <button 
                type="button" 
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 transition-all active:scale-[0.98]"
              >
                <CalcIcon size={20} />
                Calcular Cotización
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
