import React, { useState } from 'react';
import { Plus, Trash2, Settings, ListPlus, Type, Hash, CheckSquare, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function FormBuilderConfig({ fields, setFields }) {
  const [activeFieldId, setActiveFieldId] = useState(null);

  const addField = (type) => {
    const newField = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      label: 'Nuevo Campo',
      placeholder: '',
      required: false,
      options: type === 'select' ? ['Opción 1', 'Opción 2'] : [],
    };
    setFields([...fields, newField]);
    setActiveFieldId(newField.id);
  };

  const removeField = (id) => {
    setFields(fields.filter(f => f.id !== id));
    if (activeFieldId === id) setActiveFieldId(null);
  };

  const updateField = (id, updates) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const fieldTypes = [
    { type: 'text', label: 'Texto', icon: Type },
    { type: 'number', label: 'Número', icon: Hash },
    { type: 'select', label: 'Desplegable', icon: ChevronDown },
    { type: 'checkbox', label: 'Check', icon: CheckSquare },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-indigo-600/10 p-2 rounded-xl text-indigo-600 dark:text-indigo-400">
          <ListPlus size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold">Variables del Servicio</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Añade parámetros y opciones adicionales para cotizar este servicio.</p>
        </div>
      </div>

      {/* Toolbox para añadir campos */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        {fieldTypes.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            onClick={() => addField(type)}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all font-medium text-sm group"
          >
            <Icon size={16} className="group-hover:scale-110 transition-transform" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
        {fields.length === 0 ? (
          <div className="text-center py-10 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <p className="text-slate-500 dark:text-slate-400 text-sm">No has definido variables. Añade opciones arriba para personalizar el alcance y costo del servicio.</p>
          </div>
        ) : (
          fields.map(field => (
            <div 
              key={field.id}
              className={cn(
                "border rounded-2xl p-4 transition-all duration-200",
                activeFieldId === field.id 
                  ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10 shadow-md shadow-indigo-100/50 dark:shadow-none" 
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
              )}
            >
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setActiveFieldId(activeFieldId === field.id ? null : field.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 p-1.5 rounded-lg">
                    {field.type === 'text' && <Type size={16} />}
                    {field.type === 'number' && <Hash size={16} />}
                    {field.type === 'select' && <ChevronDown size={16} />}
                    {field.type === 'checkbox' && <CheckSquare size={16} />}
                  </span>
                  <span className="font-medium">{field.label || 'Campo sin nombre'}</span>
                  {field.required && <span className="text-[10px] uppercase tracking-wider font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Requerido</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeField(field.id); }}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors">
                    <Settings size={16} className={cn("transition-transform", activeFieldId === field.id && "rotate-90 text-indigo-600")} />
                  </button>
                </div>
              </div>

              {/* Editor de Propiedades Expandible */}
              {activeFieldId === field.id && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Etiqueta (Label)</label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  
                  {field.type !== 'checkbox' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Placeholder</label>
                      <input
                        type="text"
                        value={field.placeholder || ''}
                        onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  )}

                  {field.type === 'select' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Opciones (separadas por coma)</label>
                      <input
                        type="text"
                        value={field.options?.join(', ')}
                        onChange={(e) => updateField(field.id, { options: e.target.value.split(',').map(s => s.trim()) })}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer mt-2">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => updateField(field.id, { required: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">¿Es un campo obligatorio?</span>
                  </label>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
