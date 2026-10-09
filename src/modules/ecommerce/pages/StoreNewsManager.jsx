import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { Plus, Edit2, Trash2, Eye, EyeOff, Search, Loader2, Image as ImageIcon, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StoreNewsManager() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    id: null,
    title: '',
    content: '',
    image_url: '',
    status: 'Publicado'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const workspaceId = localStorage.getItem('activeWorkspace');

  const fetchNews = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ecommerce_store_news')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNews(data || []);
    } catch (error) {
      console.error('Error fetching news:', error);
      toast.error('Error al cargar las noticias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      fetchNews();
    }
  }, [workspaceId]);

  const handleOpenModal = (newsItem = null) => {
    if (newsItem) {
      setFormData({
        id: newsItem.id,
        title: newsItem.title,
        content: newsItem.content,
        image_url: newsItem.image_url || '',
        status: newsItem.status
      });
    } else {
      setFormData({
        id: null,
        title: '',
        content: '',
        image_url: '',
        status: 'Publicado'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('El título y contenido son obligatorios');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        workspace_id: workspaceId,
        title: formData.title,
        content: formData.content,
        image_url: formData.image_url,
        status: formData.status
      };

      if (formData.id) {
        const { error } = await supabase
          .from('ecommerce_store_news')
          .update(payload)
          .eq('id', formData.id);
        if (error) throw error;
        toast.success('Noticia actualizada');
      } else {
        const { error } = await supabase
          .from('ecommerce_store_news')
          .insert([payload]);
        if (error) throw error;
        toast.success('Noticia publicada');
      }

      setIsModalOpen(false);
      fetchNews();
    } catch (error) {
      console.error('Error saving news:', error);
      toast.error('Error al guardar la noticia');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta publicación? Esta acción no se puede deshacer.')) {
      try {
        const { error } = await supabase
          .from('ecommerce_store_news')
          .delete()
          .eq('id', id);
        if (error) throw error;
        toast.success('Publicación eliminada');
        fetchNews();
      } catch (error) {
        console.error('Error deleting news:', error);
        toast.error('Error al eliminar la publicación');
      }
    }
  };

  const toggleStatus = async (item) => {
    const newStatus = item.status === 'Publicado' ? 'Borrador' : 'Publicado';
    try {
      const { error } = await supabase
        .from('ecommerce_store_news')
        .update({ status: newStatus })
        .eq('id', item.id);
      if (error) throw error;
      toast.success(`Cambiado a ${newStatus}`);
      fetchNews();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Error al cambiar el estado');
    }
  };

  const filteredNews = news.filter(n => n.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Boletín de Noticias</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gestiona las publicaciones, avisos y novedades que ven tus clientes en tu vitrina.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus size={20} />
          Nueva Publicación
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por título..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="animate-spin text-indigo-500" size={32} />
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="text-center py-20">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No hay publicaciones</h3>
            <p className="mt-1 text-sm text-gray-500">Comienza compartiendo algo con tus clientes.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredNews.map((item) => (
              <div key={item.id} className="p-4 flex items-start gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title} className="w-20 h-20 rounded-lg object-cover bg-gray-200 dark:bg-gray-600 flex-shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 text-gray-400">
                    <ImageIcon size={24} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white truncate">{item.title}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.status === 'Publicado' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{item.content}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Publicado el {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleStatus(item)}
                    title={item.status === 'Publicado' ? "Ocultar (Borrador)" : "Mostrar (Publicar)"}
                    className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    {item.status === 'Publicado' ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                  <button
                    onClick={() => handleOpenModal(item)}
                    title="Editar"
                    className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    title="Eliminar"
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {formData.id ? 'Editar Publicación' : 'Nueva Publicación'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: ¡Llegó nueva mercancía!"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contenido</label>
                <textarea
                  required
                  rows="6"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Escribe los detalles de la noticia o actualización..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL de la Imagen (Opcional)</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
                {formData.image_url && (
                  <div className="mt-2 rounded-lg overflow-hidden w-32 h-32 border border-gray-200 dark:border-gray-600">
                    <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" onError={(e) => { e.target.onerror = null; e.target.src = ''; }} />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="status"
                  checked={formData.status === 'Publicado'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.checked ? 'Publicado' : 'Borrador' })}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="status" className="text-sm text-gray-700 dark:text-gray-300">Publicar inmediatamente</label>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  {formData.id ? 'Guardar Cambios' : 'Publicar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
