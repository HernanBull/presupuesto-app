import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Box, FileText, Link as LinkIcon, CheckSquare, Clock, Code, AlertTriangle, Paperclip, ListChecks, FolderPlus } from 'lucide-react';
import { DndContext, DragOverlay, useDroppable, useDraggable, closestCorners } from '@dnd-kit/core';
import { supabase } from '../utils/supabaseClient';

// --- COMPONENTES AUXILIARES ---

function DraggableServiceCard({ service, onEdit, onDelete, isDragging }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: service.id,
    data: { service }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 999 : 1,
    opacity: isDragging ? 0.4 : 1,
  } : undefined;

  const hasLogbook = service.logbook?.steps?.length > 0 || service.logbook?.links?.length > 0 || service.logbook?.notes;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all flex flex-col cursor-grab active:cursor-grabbing ${isDragging ? 'shadow-2xl ring-2 ring-indigo-500' : ''}`}
      {...listeners}
      {...attributes}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <Box size={20} />
        </div>
        <div className="flex gap-1" onPointerDown={(e) => e.stopPropagation()}>
          <button
            onClick={() => onEdit(service)}
            className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
            title="Editar servicio"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => onDelete(service.id)}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            title="Eliminar servicio"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      
      <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1 line-clamp-1">
        {service.name || 'Servicio sin nombre'}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2 flex-1">
        {service.description || 'Sin descripción...'}
      </p>
      
      {hasLogbook && (
        <div className="flex flex-wrap gap-1.5 mb-3 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg text-[10px] text-slate-500 font-medium">
          {service.logbook?.estimatedTime && (
            <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400"><Clock size={10} /> {service.logbook.estimatedTime}</span>
          )}
          {service.logbook?.requirements?.length > 0 && (
            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400"><ListChecks size={10} /> {service.logbook.requirements.length}</span>
          )}
          {service.logbook?.steps?.length > 0 && (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckSquare size={10} /> {service.logbook.steps.length}</span>
          )}
        </div>
      )}
      
      <div className="flex items-end justify-between mt-auto pt-3 border-t border-slate-100 dark:border-slate-800">
        <div>
          <p className="text-[9px] text-slate-400 uppercase font-semibold mb-0.5">Costo / Precio</p>
          <p className="text-xs font-bold text-slate-800 dark:text-white">
            <span className="text-red-500">{service.cost ? `${service.cost}€` : '-'}</span> / <span className="text-emerald-500">{service.price ? `${service.price}€` : '-'}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function CategoryColumn({ category, services, onEdit, onDelete, onDeleteCategory }) {
  const { setNodeRef, isOver } = useDroppable({
    id: category.name || 'Unassigned',
    data: { categoryName: category.name || '' }
  });

  const isUnassigned = !category.name;

  return (
    <div 
      ref={setNodeRef}
      className={`flex flex-col bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 w-full border-2 transition-colors ${isOver ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-transparent'}`}
    >
      <div className="flex justify-between items-center mb-4 px-1">
        <h3 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
          {category.name || 'Sin Asignar'}
          <span className="bg-white dark:bg-slate-800 text-slate-500 text-xs px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
            {services.length}
          </span>
        </h3>
        {!isUnassigned && (
          <button 
            onClick={() => onDeleteCategory(category.name)}
            className="text-slate-400 hover:text-red-500 transition-colors p-1"
            title="Eliminar Categoría"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-2">
        {services.map(service => (
          <DraggableServiceCard 
            key={service.id} 
            service={service} 
            onEdit={onEdit} 
            onDelete={onDelete} 
          />
        ))}
        {services.length === 0 && (
          <div className="col-span-full border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 flex items-center justify-center text-slate-400 text-sm">
            Suelta un servicio aquí
          </div>
        )}
      </div>
    </div>
  );
}


// --- COMPONENTE PRINCIPAL ---

export function ServicesList({ services, categories = [], onAdd, onEdit, onDelete, onUpdateCategory, refreshCategories }) {
  const [activeId, setActiveId] = useState(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const activeService = activeId ? services.find(s => s.id === activeId) : null;

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && over.data.current) {
      const newCategoryName = over.data.current.categoryName;
      const serviceId = active.id;
      const service = services.find(s => s.id === serviceId);
      
      // Solo actualizamos si cambió de categoría
      if (service && (service.category || '') !== newCategoryName) {
        if(onUpdateCategory) onUpdateCategory(serviceId, newCategoryName);
      }
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      const { error } = await supabase.from('categories').insert([{ name: newCategoryName.trim(), order_index: categories.length }]);
      if (!error) {
        setNewCategoryName('');
        setIsCreatingCategory(false);
        if(refreshCategories) refreshCategories();
      } else {
        alert(error.message || "Error al crear la categoría");
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión");
    }
  };

  const handleDeleteCategory = async (catName) => {
    if (window.confirm(`¿Seguro que deseas eliminar la categoría "${catName}"? Los servicios pasarán a "Sin Asignar".`)) {
      try {
        await supabase.from('categories').delete().eq('name', catName);
        if(refreshCategories) refreshCategories();
        setTimeout(() => window.location.reload(), 500); 
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Preparar columnas
  const categoryColumns = [...categories];
  const unassignedServices = services.filter(s => !s.category || !categories.find(c => c.name === s.category));
  
  return (
    <div className="flex flex-col h-full animate-in fade-in">
      
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Box className="text-indigo-600 dark:text-indigo-400" />
            Tablero de Servicios
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Organiza tus servicios arrastrándolos a las categorías.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreatingCategory(true)}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl font-medium transition-all"
          >
            <FolderPlus size={18} />
            Nueva Categoría
          </button>
          <button
            onClick={onAdd}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
          >
            <Plus size={18} />
            Crear Servicio
          </button>
        </div>
      </div>

      {/* Modal para Nueva Categoría */}
      {isCreatingCategory && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <FolderPlus className="text-indigo-500" /> Crear Categoría
            </h3>
            <input
              type="text"
              autoFocus
              placeholder="Ej. Redes, Software, Diseño..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 mb-6 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsCreatingCategory(false)} className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>
              <button onClick={handleCreateCategory} disabled={!newCategoryName.trim()} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Tablero Kanban */}
      <DndContext 
        collisionDetection={closestCorners} 
        onDragStart={handleDragStart} 
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex flex-col gap-8 pb-12">
          
          {/* Columna "Sin Asignar" siempre va primero */}
          <CategoryColumn 
            category={{ name: '' }} 
            services={unassignedServices} 
            onEdit={onEdit} 
            onDelete={onDelete}
            onDeleteCategory={handleDeleteCategory}
          />

          {/* Columnas Creadas por el Usuario */}
          {categoryColumns.map(cat => (
            <CategoryColumn 
              key={cat.name} 
              category={cat} 
              services={services.filter(s => s.category === cat.name)} 
              onEdit={onEdit} 
              onDelete={onDelete}
              onDeleteCategory={handleDeleteCategory}
            />
          ))}

        </div>

        {/* Capa fantasma mientras se arrastra */}
        <DragOverlay>
          {activeService ? (
            <DraggableServiceCard service={activeService} isDragging={true} onEdit={() => {}} onDelete={() => {}} />
          ) : null}
        </DragOverlay>
      </DndContext>

    </div>
  );
}
