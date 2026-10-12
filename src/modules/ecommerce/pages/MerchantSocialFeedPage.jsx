import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../../supabaseClient';
import { 
  Plus, Edit2, Trash2, Eye, EyeOff, Search, Loader2, Image as ImageIcon, 
  X, Heart, MessageSquare, Bookmark, Users, Sparkles, Share2, 
  ExternalLink, Check, ShoppingBag, ArrowUpRight, Flame, Megaphone, Star, Tag, Send
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  getPostLikeState, 
  getPostComments, 
  getPostSaveState, 
  getStoreFollowState,
  addPostComment
} from '../services/socialService';
import PostCommentsDrawer from '../components/PostCommentsDrawer';

const POST_BADGES = [
  { id: 'oferta', label: '🔥 Oferta Exclusiva', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  { id: 'nuevo', label: '✨ Nuevo Ingreso', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  { id: 'aviso', label: '📢 Comunicado', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { id: 'destacado', label: '⭐ Recomendado', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
];

const SUGGESTED_HASHTAGS = [
  '#Oferta', '#NuevoIngreso', '#Promocion', '#Calidad', '#FinDeSemana', '#AxonMarket'
];

export default function MerchantSocialFeedPage() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [storeData, setStoreData] = useState(null);
  const [storeProducts, setStoreProducts] = useState([]);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);

  // Stats
  const [followerCount, setFollowerCount] = useState(0);
  const [postInteractions, setPostInteractions] = useState({});

  // Active Comments Drawer
  const [activeCommentsPost, setActiveCommentsPost] = useState(null);

  // Modal / Creator State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    id: null,
    title: '',
    content: '',
    image_url: '',
    status: 'Publicado',
    badge: '🔥 Oferta Exclusiva'
  });

  const workspaceId = localStorage.getItem('activeWorkspace');
  const storeSlug = localStorage.getItem('storeSlug');

  // Cargar datos de la tienda y productos
  const fetchStoreInfo = async () => {
    if (!workspaceId) return;
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single();
      if (!error && data) {
        setStoreData(data);
      }

      // Cargar productos para selección rápida de fotos
      const { data: prods } = await supabase
        .from('ecommerce_products')
        .select('id, name, price, images, image_url')
        .eq('workspace_id', workspaceId)
        .limit(20);
      if (prods) setStoreProducts(prods);

      // Conteo de seguidores
      const followState = await getStoreFollowState(workspaceId);
      setFollowerCount(followState.followersCount || 0);
    } catch (e) {
      console.error('Error fetching store info:', e);
    }
  };

  // Cargar publicaciones
  const fetchNews = async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ecommerce_store_news')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching news from DB, loading fallback:', error);
      }
      
      const loadedNews = data || [];
      setNews(loadedNews);

      // Cargar interacciones individuales de cada post
      const interactions = {};
      for (const item of loadedNews) {
        const likeState = await getPostLikeState(item.id);
        const comments = await getPostComments(item.id);
        const saveState = await getPostSaveState(item.id);
        interactions[item.id] = {
          likes: likeState.likesCount || 0,
          commentsCount: comments.length,
          savedCount: saveState.isSaved ? 1 : 0
        };
      }
      setPostInteractions(interactions);
    } catch (error) {
      console.error('Error in fetchNews:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreInfo();
    fetchNews();

    const handleSocialUpdate = () => {
      fetchNews();
      if (workspaceId) {
        getStoreFollowState(workspaceId).then(st => setFollowerCount(st.followersCount));
      }
    };
    window.addEventListener('axon_social_updated', handleSocialUpdate);
    return () => window.removeEventListener('axon_social_updated', handleSocialUpdate);
  }, [workspaceId]);

  // Manejar subida de foto a Supabase Storage
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error('La imagen no debe superar los 8 MB');
      return;
    }

    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `social_posts/${workspaceId}/${Date.now()}_post.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('ecommerce')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        // Fallback FileReader base64
        const reader = new FileReader();
        reader.onload = (event) => {
          setFormData(prev => ({ ...prev, image_url: event.target.result }));
          toast.success('Imagen cargada localmente');
        };
        reader.readAsDataURL(file);
      } else {
        const { data } = supabase.storage.from('ecommerce').getPublicUrl(fileName);
        if (data?.publicUrl) {
          setFormData(prev => ({ ...prev, image_url: data.publicUrl }));
          toast.success('Imagen subida con éxito');
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al subir la imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleOpenModal = (newsItem = null) => {
    if (newsItem) {
      setFormData({
        id: newsItem.id,
        title: newsItem.title || '',
        content: newsItem.content || '',
        image_url: newsItem.image_url || '',
        status: newsItem.status || 'Publicado',
        badge: newsItem.badge || '🔥 Oferta Exclusiva'
      });
    } else {
      setFormData({
        id: null,
        title: '',
        content: '',
        image_url: '',
        status: 'Publicado',
        badge: '🔥 Oferta Exclusiva'
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
        title: formData.title.trim(),
        content: formData.content.trim(),
        image_url: formData.image_url.trim() || null,
        status: formData.status
      };

      if (formData.id) {
        const { error } = await supabase
          .from('ecommerce_store_news')
          .update(payload)
          .eq('id', formData.id);
        if (error) throw error;
        toast.success('Publicación actualizada en el feed');
      } else {
        const { error } = await supabase
          .from('ecommerce_store_news')
          .insert([payload]);
        if (error) throw error;
        toast.success('¡Publicado en Axon Market exitosamente!');
      }

      // Notificar al feed global para actualización instantánea
      window.dispatchEvent(new CustomEvent('axon_social_updated'));

      setIsModalOpen(false);
      fetchNews();
    } catch (error) {
      console.error('Error saving news:', error);
      toast.error('Error al guardar la publicación');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Deseas eliminar esta publicación del feed de Axon Market?')) {
      try {
        const { error } = await supabase
          .from('ecommerce_store_news')
          .delete()
          .eq('id', id);
        if (error) throw error;
        toast.success('Publicación eliminada');
        window.dispatchEvent(new CustomEvent('axon_social_updated'));
        fetchNews();
      } catch (error) {
        console.error('Error deleting:', error);
        toast.error('Error al eliminar');
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
      toast.success(newStatus === 'Publicado' ? 'Visible en el feed principal' : 'Oculto (Borrador)');
      window.dispatchEvent(new CustomEvent('axon_social_updated'));
      fetchNews();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Error al cambiar el estado');
    }
  };

  const addHashtag = (tag) => {
    setFormData(prev => ({
      ...prev,
      content: prev.content ? `${prev.content} ${tag}` : tag
    }));
  };

  // Métricas agregadas
  const totalLikes = useMemo(() => {
    return Object.values(postInteractions).reduce((acc, curr) => acc + (curr.likes || 0), 0);
  }, [postInteractions]);

  const totalComments = useMemo(() => {
    return Object.values(postInteractions).reduce((acc, curr) => acc + (curr.commentsCount || 0), 0);
  }, [postInteractions]);

  const filteredNews = news.filter(n => 
    n.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    n.content?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const storeLogo = storeData?.config?.logoUrl || storeData?.config?.storefront?.logoUrl;
  const storeName = storeData?.name || 'Mi Comercio';

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      
      {/* Cabecera Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-6 rounded-3xl border border-amber-500/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-amber-500 text-black">
              <Share2 size={18} />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Módulo Social
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Feed de Redes Sociales
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-2xl leading-relaxed">
            Publica novedades, fotos y promociones directamente en el feed de <span className="font-bold text-amber-600 dark:text-amber-400">Axon Market</span>. Los compradores podrán dar like, comentar y seguir tu tienda en tiempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => window.open('/', '_blank')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-gray-200 text-sm font-semibold transition-all shadow-xs"
          >
            <ExternalLink size={16} />
            Ver Feed Axon
          </button>
          
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 text-sm"
          >
            <Plus size={18} strokeWidth={2.5} />
            Nueva Publicación
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas Sociales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Seguidores */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/5 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-gray-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Seguidores</span>
            <Users size={18} className="text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
            {followerCount}
          </p>
          <span className="text-[11px] text-gray-400 mt-1 block">Compradores que siguen tu tienda</span>
        </div>

        {/* Me Gusta */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/5 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-gray-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Me Gusta</span>
            <Heart size={18} className="text-red-500 fill-red-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
            {totalLikes}
          </p>
          <span className="text-[11px] text-gray-400 mt-1 block">Reacciones en tus publicaciones</span>
        </div>

        {/* Comentarios */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/5 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-gray-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Comentarios</span>
            <MessageSquare size={18} className="text-indigo-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
            {totalComments}
          </p>
          <span className="text-[11px] text-gray-400 mt-1 block">Respuestas e interacciones</span>
        </div>

        {/* Publicaciones */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/5 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-gray-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">En el Feed</span>
            <Sparkles size={18} className="text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
            {news.filter(n => n.status === 'Publicado').length}
          </p>
          <span className="text-[11px] text-gray-400 mt-1 block">Posts activos en Axon Market</span>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-white/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar en tus publicaciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-xl bg-gray-50 dark:bg-zinc-800/60 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="text-xs text-gray-500 dark:text-zinc-400">
          Mostrando <span className="font-bold text-gray-900 dark:text-white">{filteredNews.length}</span> publicación(es)
        </div>
      </div>

      {/* Lista / Galería de Publicaciones */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Loader2 className="animate-spin text-amber-500 mb-3" size={36} />
          <p className="text-sm">Cargando publicaciones sociales...</p>
        </div>
      ) : filteredNews.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-white/5 p-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4">
            <Share2 size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            Aún no has creado publicaciones
          </h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400 max-w-md mx-auto mb-6">
            Comparte tus ofertas, promociones y fotos de productos. Llegarás a miles de clientes en la pantalla principal de Axon Market.
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-3 rounded-xl transition-all shadow-md active:scale-95 text-sm"
          >
            <Plus size={18} />
            Crear mi Primera Publicación
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNews.map((item) => {
            const stats = postInteractions[item.id] || { likes: 0, commentsCount: 0, savedCount: 0 };
            return (
              <div 
                key={item.id} 
                className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-white/5 overflow-hidden flex flex-col shadow-xs hover:border-amber-500/30 transition-all group"
              >
                {/* Imagen del Post */}
                <div className="relative aspect-4/3 bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                      <ImageIcon size={36} className="opacity-40 mb-1" />
                      <span className="text-xs">Sin foto adjunta</span>
                    </div>
                  )}

                  {/* Estado Badge */}
                  <div className="absolute top-3 left-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md shadow-sm flex items-center gap-1.5 ${
                      item.status === 'Publicado' 
                        ? 'bg-emerald-500/90 text-white' 
                        : 'bg-zinc-900/80 text-zinc-300'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${item.status === 'Publicado' ? 'bg-white animate-pulse' : 'bg-zinc-500'}`} />
                      {item.status === 'Publicado' ? 'En el Feed' : 'Borrador'}
                    </span>
                  </div>

                  {/* Fecha */}
                  <div className="absolute top-3 right-3">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-black/60 text-white backdrop-blur-md">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Contenido */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-base text-gray-900 dark:text-white line-clamp-1 mb-1.5">
                      {item.title}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-zinc-400 line-clamp-3 leading-relaxed mb-4">
                      {item.content}
                    </p>
                  </div>

                  {/* Métricas Interactivas del Post */}
                  <div>
                    <div className="flex items-center justify-between py-3 border-y border-gray-100 dark:border-white/5 text-xs text-gray-600 dark:text-zinc-400 mb-4">
                      <div className="flex items-center gap-1.5">
                        <Heart size={15} className={stats.likes > 0 ? "text-red-500 fill-red-500" : "text-gray-400"} />
                        <span className="font-bold">{stats.likes}</span> likes
                      </div>
                      
                      <button 
                        onClick={() => setActiveCommentsPost({
                          id: item.id,
                          title: item.title,
                          store_name: storeName,
                          store_logo: storeLogo
                        })}
                        className="flex items-center gap-1.5 hover:text-amber-500 transition-colors"
                      >
                        <MessageSquare size={15} className="text-indigo-500" />
                        <span className="font-bold">{stats.commentsCount}</span> comentarios
                      </button>

                      <div className="flex items-center gap-1.5">
                        <Bookmark size={15} className="text-amber-500" />
                        <span className="font-bold">{stats.savedCount}</span> guardados
                      </div>
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => toggleStatus(item)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                          item.status === 'Publicado'
                            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
                            : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 hover:bg-emerald-100'
                        }`}
                      >
                        {item.status === 'Publicado' ? <EyeOff size={14} /> : <Eye size={14} />}
                        {item.status === 'Publicado' ? 'Ocultar' : 'Publicar'}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenModal(item)}
                          className="p-2 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal / Creador con Live Preview Estilo Instagram */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-white/10 w-full max-w-5xl overflow-hidden shadow-2xl my-auto animate-in zoom-in-95 duration-200">
            
            {/* Header del Modal */}
            <div className="p-5 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center">
                  <Share2 size={18} />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-gray-900 dark:text-white">
                    {formData.id ? 'Editar Publicación' : 'Crear Publicación para Axon Market'}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    Tu post aparecerá directamente en el feed principal de clientes
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Contenido dividido: Formulario a la izquierda, Live Preview a la derecha */}
            <div className="grid grid-cols-1 lg:grid-cols-12 max-h-[80vh] overflow-y-auto">
              
              {/* Formulario */}
              <form onSubmit={handleSubmit} className="lg:col-span-7 p-6 space-y-5 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-zinc-800">
                {/* Título */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider mb-1.5">
                    Título o Asunto de la Publicación *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ej: ¡Nuevo cargamento de víveres y 20% off en combos!"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Contenido / Caption */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                      Descripción / Mensaje para los Clientes *
                    </label>
                    <span className="text-[11px] text-gray-400">{formData.content.length} caracteres</span>
                  </div>
                  <textarea
                    required
                    rows={4}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Escribe los detalles de tu publicación, precios, horario de entrega o invitación a visitar tu tienda..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  />
                  
                  {/* Hashtags sugeridos */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-gray-400 font-semibold mr-1">Hashtags rápidos:</span>
                    {SUGGESTED_HASHTAGS.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => addHashtag(tag)}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 font-medium transition-colors"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Imagen del Post */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                    Fotografía de la Publicación
                  </label>
                  
                  <div className="flex flex-wrap gap-2">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImageUpload} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    <button
                      type="button"
                      disabled={uploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                    >
                      {uploadingImage ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                      Subir foto desde dispositivo
                    </button>

                    {storeProducts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsProductPickerOpen(!isProductPickerOpen)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
                      >
                        <ShoppingBag size={14} />
                        Usar foto de mi catálogo ({storeProducts.length})
                      </button>
                    )}
                  </div>

                  {/* Selector desplegable de productos del catálogo */}
                  {isProductPickerOpen && storeProducts.length > 0 && (
                    <div className="p-3 bg-gray-50 dark:bg-zinc-800/80 rounded-2xl border border-gray-200 dark:border-zinc-700 space-y-2">
                      <p className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase">
                        Selecciona un producto para usar su foto:
                      </p>
                      <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto">
                        {storeProducts.map(p => {
                          const img = p.images?.[0] || p.image_url;
                          if (!img) return null;
                          return (
                            <div
                              key={p.id}
                              onClick={() => {
                                setFormData(prev => ({ 
                                  ...prev, 
                                  image_url: img,
                                  title: prev.title || `¡Disponible: ${p.name}!`,
                                  content: prev.content || `Aprovecha nuestro producto ${p.name} a tan solo $${p.price}. Disponible para entrega inmediata.`
                                }));
                                setIsProductPickerOpen(false);
                                toast.success(`Foto de "${p.name}" seleccionada`);
                              }}
                              className="cursor-pointer border border-transparent hover:border-amber-500 rounded-xl overflow-hidden group relative bg-white dark:bg-zinc-900"
                            >
                              <img src={img} alt={p.name} className="w-full h-14 object-cover" />
                              <div className="p-1 text-[10px] font-medium truncate text-gray-700 dark:text-zinc-300">
                                {p.name}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Input URL alternativo */}
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="O pega directamente la URL de la imagen..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Publicar inmediatamente check */}
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="modal-status"
                    checked={formData.status === 'Publicado'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.checked ? 'Publicado' : 'Borrador' })}
                    className="w-4 h-4 text-amber-500 rounded border-gray-300 focus:ring-amber-500"
                  />
                  <label htmlFor="modal-status" className="text-xs font-semibold text-gray-700 dark:text-zinc-300 select-none">
                    Transmitir en vivo inmediatamente en el feed de Axon Market
                  </label>
                </div>

                {/* Botones de Envío */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 active:scale-95"
                  >
                    {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                    {formData.id ? 'Guardar Cambios' : 'Publicar en Axon Market'}
                  </button>
                </div>
              </form>

              {/* Live Preview Estilo Instagram a la derecha */}
              <div className="lg:col-span-5 bg-gray-100 dark:bg-zinc-950 p-6 flex flex-col items-center justify-center">
                <div className="w-full max-w-[320px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <Eye size={13} />
                      Previsualización en Vivo
                    </span>
                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      Feed Móvil
                    </span>
                  </div>

                  {/* Teléfono Mockup */}
                  <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-[2rem] overflow-hidden shadow-xl text-left">
                    {/* Header del post */}
                    <div className="flex items-center justify-between px-3.5 py-3 border-b border-gray-100 dark:border-white/5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden border border-amber-500/30">
                          {storeLogo ? (
                            <img src={storeLogo} alt="Logo" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-xs text-amber-500">
                              {storeName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-extrabold text-gray-900 dark:text-white leading-tight">
                              {storeName}
                            </span>
                          </div>
                          <span className="text-[9px] text-gray-400 block">Venezuela</span>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full">
                        Siguiendo
                      </span>
                    </div>

                    {/* Foto */}
                    <div className="aspect-square bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
                      {formData.image_url ? (
                        <img 
                          src={formData.image_url} 
                          alt="Preview" 
                          className="w-full h-full object-cover" 
                          onError={(e) => { e.target.onerror = null; e.target.src = ''; }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                          <ImageIcon size={32} className="opacity-40 mb-1" />
                          <span className="text-[10px]">Carga una foto para verla aquí</span>
                        </div>
                      )}
                    </div>

                    {/* Acciones del Post */}
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Heart size={20} className="text-red-500 fill-red-500" />
                          <MessageSquare size={19} className="text-gray-700 dark:text-zinc-300" />
                          <Send size={18} className="text-gray-700 dark:text-zinc-300" />
                        </div>
                        <Bookmark size={19} className="text-gray-700 dark:text-zinc-300" />
                      </div>

                      <p className="text-[11px] font-black text-gray-900 dark:text-white mb-1">
                        1 Me gusta
                      </p>

                      <div className="text-[11px] text-gray-800 dark:text-zinc-200 leading-tight">
                        <span className="font-bold mr-1.5">{storeName}</span>
                        {formData.title && <span className="font-semibold block mb-0.5">{formData.title}</span>}
                        <span className="text-gray-600 dark:text-zinc-400">
                          {formData.content || 'Escribe tu mensaje en el formulario para verlo reflejado aquí en tiempo real...'}
                        </span>
                      </div>

                      <span className="text-[9px] text-gray-400 uppercase tracking-widest mt-2 block font-semibold">
                        HACE UNOS SEGUNDOS
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Drawer de Comentarios para Moderar / Responder */}
      <PostCommentsDrawer
        isOpen={!!activeCommentsPost}
        onClose={() => setActiveCommentsPost(null)}
        post={activeCommentsPost}
        currentCustomer={{
          id: workspaceId || 'merchant_author',
          name: `${storeName} (Comercio)`,
          profile_pic: storeLogo
        }}
        onRequireAuth={() => {}}
      />
    </div>
  );
}
