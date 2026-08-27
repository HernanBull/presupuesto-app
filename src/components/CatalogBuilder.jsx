import React, { useState, useEffect } from 'react';
import { ServicesList } from './ServicesList';
import { ServiceEditor } from './ServiceEditor';
import { supabase } from '../utils/supabaseClient';

export function CatalogBuilder() {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingServiceId, setEditingServiceId] = useState(null); // null means showing list

  // Cargar servicios y categorías desde Supabase
  useEffect(() => {
    supabase.from('services').select('*')
      .then(({ data }) => setServices(data || []))
      .catch(err => console.error('Error fetching services:', err));
      
    fetchCategories();
  }, []);

  const fetchCategories = () => {
    supabase.from('categories').select('*')
      .then(({ data }) => setCategories(data || []))
      .catch(err => console.error('Error fetching categories:', err));
  };

  const handleAddService = () => {
    const newService = {
      id: Date.now().toString(),
      name: '',
      description: '',
      price: '',
      cost: '',
      category: '',
      isNew: true, // Flag temporal para el backend
      logbook: {
        estimatedTime: '',
        steps: [],
        links: [],
        codeSnippets: [],
        resolutions: [],
        notes: ''
      }
    };
    
    // Crear en backend localmente primero para UX rápida o esperar? Haremos optimista
    setServices([...services, newService]);
    setEditingServiceId(newService.id);
  };

  const handleEditService = (service) => {
    setEditingServiceId(service.id);
  };

  const handleDeleteService = (serviceId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este servicio?')) {
      setServices(services.filter(s => s.id !== serviceId));
      
      supabase.from('services').delete().eq('id', serviceId)
        .catch(err => console.error('Error deleting:', err));
      
      if (editingServiceId === serviceId) setEditingServiceId(null);
    }
  };

  const handleSaveService = async (updatedService) => {
    // Optimistic UI update
    setServices(current => current.map(s => s.id === updatedService.id ? updatedService : s));
    setEditingServiceId(null);

    try {
      let categoryToSave = updatedService.category;
      if (!categoryToSave || categoryToSave.trim() === '') {
        categoryToSave = null;
      } else {
        categoryToSave = categoryToSave.trim();
        // Asegurar que exista la categoría para no violar la Foreign Key
        await supabase.from('categories').upsert([{ name: categoryToSave }], { onConflict: 'name' });
        fetchCategories(); // Refrescar lista de categorías global
      }
      
      // Crear copia del servicio a guardar con la categoría parseada
      const serviceToSave = { ...updatedService, category: categoryToSave };
  
      if (serviceToSave.isNew) {
        delete serviceToSave.isNew;
        delete serviceToSave.id; // supabase crea el UUID automáticamente
        
        const { data, error } = await supabase.from('services').insert([serviceToSave]).select();
        
        if (error) {
          console.error('Error saving:', error);
          alert('Error al guardar en base de datos: ' + error.message);
        } else if (data && data.length > 0) {
          setServices(current => current.map(s => s.id === updatedService.id ? data[0] : s));
        }
      } else {
        const { error } = await supabase.from('services').update(serviceToSave).eq('id', serviceToSave.id);
        if (error) {
          console.error('Error updating:', error);
          alert('Error al actualizar en base de datos: ' + error.message);
        }
      }
    } catch (err) {
      console.error('Error general al guardar:', err);
    }
  };

  const handleUpdateServiceCategory = (serviceId, newCategoryName) => {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;
    
    const updatedService = { ...service, category: newCategoryName };
    
    // Optimistic UI update
    setServices(services.map(s => s.id === serviceId ? updatedService : s));

    // Backend sync
    supabase.from('services').update({ category: newCategoryName }).eq('id', serviceId)
      .catch(err => console.error('Error updating category:', err));
  };

  const editingService = services.find(s => s.id === editingServiceId);

  return (
    <div className="h-full">
      {editingService ? (
        <ServiceEditor 
          service={editingService} 
          categories={categories}
          onChange={(updated) => setServices(services.map(s => s.id === updated.id ? updated : s))}
          onSave={() => handleSaveService(editingService)}
          onCancel={() => setEditingServiceId(null)}
        />
      ) : (
        <ServicesList 
          services={services}
          categories={categories}
          onAdd={handleAddService}
          onEdit={handleEditService}
          onDelete={handleDeleteService}
          onUpdateCategory={handleUpdateServiceCategory}
          refreshCategories={fetchCategories}
        />
      )}
    </div>
  );
}
