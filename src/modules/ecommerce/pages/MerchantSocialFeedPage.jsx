import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../../supabaseClient';
import { 
  Plus, Edit2, Trash2, Eye, EyeOff, Search, Loader2, Image as ImageIcon, 
  X, Heart, MessageSquare, Bookmark, Users, Sparkles, Share2, 
  ExternalLink, Check, ShoppingBag, ArrowUpRight, Flame, Megaphone, Star, Tag, Send,
  Video, Camera, Volume2, VolumeX, Play
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  getPostLikeState, 
  getPostComments, 
  getPostSaveState, 
  getStoreFollowState,
  addPostComment,
  getStoreRealMetrics,
  getPostSavesCount,
  getPostLikesList,
  getStoreLikesList
} from '../services/socialService';
import PostCommentsDrawer from '../components/PostCommentsDrawer';
import ResponsiveModal from '../components/ResponsiveModal';

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
  const [storeTotalLikes, setStoreTotalLikes] = useState(0);
  const [storeTotalComments, setStoreTotalComments] = useState(0);
  const [postInteractions, setPostInteractions] = useState({});

  // Likes Details Modal
  const [likesModal, setLikesModal] = useState({ isOpen: false, title: '', likes: [], loading: false });

  // Active Comments Drawer
  const [activeCommentsPost, setActiveCommentsPost] = useState(null);

  // Modal / Creator State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const videoFileInputRef = useRef(null);
  const videoRecordInputRef = useRef(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);

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

      // Cargar métricas reales de la tienda (seguidores, me gusta y comentarios)
      const metrics = await getStoreRealMetrics(workspaceId, storeSlug);
      setFollowerCount(metrics.followersCount || 0);
      setStoreTotalLikes(metrics.likesCount || 0);
      setStoreTotalComments(metrics.commentsCount || 0);
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
        const savesCount = await getPostSavesCount(item.id);
        interactions[item.id] = {
          likes: likeState.likesCount || likeState.count || 0,
          commentsCount: comments.length,
          savedCount: savesCount
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
      fetchStoreInfo();
    };
    window.addEventListener('axon_social_updated', handleSocialUpdate);
    return () => window.removeEventListener('axon_social_updated', handleSocialUpdate);
  }, [workspaceId]);

  // Centrado y Recorte Automático 9:16 Inteligente (Sin fricción ni arrastre manual)
  const processAndCenterImage916 = async (source) => {
    if (!source) return;
    setUploadingImage(true);
    const toastId = toast.loading('Centrando y optimizando foto a formato 9:16...');
    try {
      // 1. Obtener DataURL si es un objeto File o Blob
      let src = source;
      if (source instanceof File || source instanceof Blob) {
        src = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(source);
        });
      }

      // 2. Cargar objeto Image nativo
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
      });

      // 3. Crear canvas 1080 x 1920 (proporción 9:16 estándar vertical)
      const targetWidth = 1080;
      const targetHeight = 1920;
      const targetAspect = targetWidth / targetHeight; // 9/16 = 0.5625
      const imgAspect = img.width / img.height;

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 4. Calcular recorte centrado perfecto automáticamente
      let sWidth, sHeight, sx, sy;
      if (imgAspect > targetAspect) {
        // La imagen es horizontal o cuadrada (más ancha que 9:16). Se centra horizontalmente.
        sHeight = img.height;
        sWidth = img.height * targetAspect;
        sx = (img.width - sWidth) / 2;
        sy = 0;
      } else {
        // La imagen es más alta que 9:16. Se centra verticalmente.
        sWidth = img.width;
        sHeight = img.width / targetAspect;
        sx = 0;
        sy = (img.height - sHeight) / 2;
      }

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);

      // 5. Convertir a Blob y subir a Supabase Storage
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      const fileName = `social_posts/${workspaceId}/${Date.now()}_autocentered_9_16.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('ecommerce')
        .upload(fileName, blob, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) {
        // Fallback local en caso de error de red o permisos en bucket
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setFormData(prev => ({ ...prev, image_url: dataUrl, media_type: 'image' }));
        toast.success('¡Foto centrada a 9:16 correctamente!', { id: toastId });
      } else {
        const { data } = supabase.storage.from('ecommerce').getPublicUrl(fileName);
        setFormData(prev => ({ ...prev, image_url: data.publicUrl, media_type: 'image' }));
        toast.success('¡Foto centrada automáticamente a 9:16!', { id: toastId });
      }
    } catch (err) {
      console.warn('Error en auto-centrado:', err);
      if (typeof source === 'string') {
        setFormData(prev => ({ ...prev, image_url: source, media_type: 'image' }));
      }
      toast.success('Foto cargada', { id: toastId });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Manejar selección de foto del comerciante
  const handleImageFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error('La imagen no debe superar los 25 MB');
      return;
    }
    await processAndCenterImage916(file);
  };

  // Manejar subida y grabación de Video
  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error('El video no debe superar los 50 MB');
      return;
    }
    setUploadingVideo(true);
    try {
      const ext = file.name.split('.').pop() || 'mp4';
      const fileName = `social_videos/${workspaceId}/${Date.now()}_video.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('ecommerce')
        .upload(fileName, file, { upsert: true, contentType: file.type || 'video/mp4' });

      if (uploadError) {
        const blobUrl = URL.createObjectURL(file);
        setFormData(prev => ({ ...prev, image_url: blobUrl, media_type: 'video' }));
        toast.success('Video cargado localmente');
      } else {
        const { data } = supabase.storage.from('ecommerce').getPublicUrl(fileName);
        setFormData(prev => ({ ...prev, image_url: data.publicUrl, media_type: 'video' }));
        toast.success('¡Video subido exitosamente!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error al procesar el video');
    } finally {
      setUploadingVideo(false);
      if (videoFileInputRef.current) videoFileInputRef.current.value = '';
      if (videoRecordInputRef.current) videoRecordInputRef.current.value = '';
    }
  };

  // Manejar subida directa fallback
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
    const postSum = Object.values(postInteractions).reduce((acc, curr) => acc + (curr.likes || 0), 0);
    return Math.max(postSum, storeTotalLikes);
  }, [postInteractions, storeTotalLikes]);

  const totalComments = useMemo(() => {
    const postSum = Object.values(postInteractions).reduce((acc, curr) => acc + (curr.commentsCount || 0), 0);
    return Math.max(postSum, storeTotalComments);
  }, [postInteractions, storeTotalComments]);

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
        <div 
          onClick={async () => {
            setLikesModal({ isOpen: true, title: 'Reacciones de Me Gusta (Tienda y Publicaciones)', likes: [], loading: true });
            const list = await getStoreLikesList(workspaceId);
            setLikesModal(prev => ({ ...prev, likes: list, loading: false }));
          }}
          className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/5 p-5 rounded-2xl shadow-xs cursor-pointer hover:border-red-500/40 hover:shadow-md transition-all group"
          title="Ver quiénes dieron like a tu tienda y publicaciones"
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider group-hover:text-red-500 transition-colors">Me Gusta</span>
            <Heart size={18} className="text-red-500 fill-red-500 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
            {totalLikes}
          </p>
          <span className="text-[11px] text-gray-400 mt-1 block">Toca para ver quiénes dieron like</span>
        </div>

        {/* Comentarios */}
        <div 
          onClick={() => setActiveCommentsPost({
            id: 'all',
            postId: 'all',
            title: 'Todos los Comentarios',
            store_name: storeName,
            store_logo: storeLogo,
            workspaceId
          })}
          className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/5 p-5 rounded-2xl shadow-xs cursor-pointer hover:border-indigo-500/40 hover:shadow-md transition-all group"
          title="Ver y responder comentarios"
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider group-hover:text-indigo-500 transition-colors">Comentarios</span>
            <MessageSquare size={18} className="text-indigo-500 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
            {totalComments}
          </p>
          <span className="text-[11px] text-gray-400 mt-1 block">Toca para ver y responder</span>
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
                        <button 
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            setLikesModal({ 
                              isOpen: true, 
                              title: `Personas a las que les gustó "${item.title}"`, 
                              likes: [], 
                              loading: true 
                            });
                            const list = await getPostLikesList(item.id);
                            setLikesModal(prev => ({ ...prev, likes: list, loading: false }));
                          }}
                          className="flex items-center gap-1.5 hover:text-red-500 transition-colors cursor-pointer group/like"
                          title="Ver clientes que le dieron like"
                        >
                          <Heart size={15} className={stats.likes > 0 ? "text-red-500 fill-red-500 group-hover/like:scale-110 transition-transform" : "text-gray-400 group-hover/like:text-red-400"} />
                          <span className="font-bold text-gray-900 dark:text-white group-hover/like:text-red-500">{stats.likes}</span> likes
                        </button>
                        
                        <button 
                          onClick={() => setActiveCommentsPost({
                            id: item.id,
                            postId: item.id,
                            title: item.title,
                            store_name: storeName,
                            store_logo: storeLogo,
                            workspaceId
                          })}
                          className="flex items-center gap-1.5 hover:text-amber-500 transition-colors cursor-pointer"
                          title="Ver y responder comentarios"
                        >
                          <MessageSquare size={15} className="text-indigo-500" />
                          <span className="font-bold text-gray-900 dark:text-white">{stats.commentsCount}</span> comentarios
                        </button>

                        <div className="flex items-center gap-1.5" title="Veces guardado por clientes">
                          <Bookmark size={15} className={stats.savedCount > 0 ? "text-amber-500 fill-amber-500" : "text-gray-400"} />
                          <span className="font-bold text-gray-900 dark:text-white">{stats.savedCount}</span> guardados
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
                      onChange={handleImageFileSelect} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    <input 
                      type="file" 
                      ref={videoRecordInputRef} 
                      onChange={handleVideoUpload} 
                      accept="video/*" 
                      capture="environment" 
                      className="hidden" 
                    />
                    <input 
                      type="file" 
                      ref={videoFileInputRef} 
                      onChange={handleVideoUpload} 
                      accept="video/mp4,video/webm,video/quicktime" 
                      className="hidden" 
                    />

                    {/* Botón Subir Foto con Auto-centrado 9:16 */}
                    <button
                      type="button"
                      disabled={uploadingImage || uploadingVideo}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                    >
                      {uploadingImage ? <Loader2 size={14} className="animate-spin text-amber-500" /> : <ImageIcon size={14} className="text-amber-500" />}
                      Subir Foto (Auto-centrado 9:16)
                    </button>

                    {/* Botón Grabar Video desde Cámara */}
                    <button
                      type="button"
                      disabled={uploadingImage || uploadingVideo}
                      onClick={() => videoRecordInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                    >
                      <Camera size={14} />
                      Grabar Video
                    </button>

                    {/* Botón Subir Video MP4 */}
                    <button
                      type="button"
                      disabled={uploadingImage || uploadingVideo}
                      onClick={() => videoFileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-500/30 bg-blue-500/10 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors cursor-pointer"
                    >
                      {uploadingVideo ? <Loader2 size={14} className="animate-spin text-blue-500" /> : <Video size={14} />}
                      Subir Video MP4
                    </button>

                    {storeProducts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsProductPickerOpen(!isProductPickerOpen)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors cursor-pointer"
                      >
                        <ShoppingBag size={14} />
                        Foto de Catálogo ({storeProducts.length})
                      </button>
                    )}
                  </div>

                  {/* Selector desplegable de productos del catálogo con centrado automático */}
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
                                  title: prev.title || `¡Disponible: ${p.name}!`,
                                  content: prev.content || `Aprovecha nuestro producto ${p.name} a tan solo ${p.price}. Disponible para entrega inmediata.`
                                }));
                                setIsProductPickerOpen(false);
                                processAndCenterImage916(img);
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

                  {/* Guía informativa de formato y centrado 9:16 */}
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-2.5 mt-2">
                    <Sparkles size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      <span className="font-bold text-amber-600 dark:text-amber-400 block mb-0.5">Encuadre Automático Inteligente (9:16)</span>
                      Cualquier foto que subas o elijas de tu catálogo se centra y adapta automáticamente a la pantalla completa de tus clientes en proporción vertical 9:16 (1080 × 1920 px) sin cortes manuales ni necesidad de arrastrar.
                    </div>
                  </div>
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

              {/* Live Preview Estilo TikTok a la derecha */}
              <div className="lg:col-span-5 bg-zinc-950 p-6 flex flex-col items-center justify-center border-l border-zinc-800">
                <div className="w-full max-w-[280px]">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Eye size={13} className="text-amber-400" />
                      Vista Previa TikTok (9:16)
                    </span>
                    <span className="text-[10px] font-extrabold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-full">
                      Feed AxonMarket
                    </span>
                  </div>

                  {/* Teléfono Mockup TikTok Vertical */}
                  <div className="relative w-full aspect-[9/16] bg-black border-4 border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col justify-end select-none">
                    
                    {/* Isla Dinámica / Parlante Superior */}
                    <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-4 bg-zinc-900 rounded-full z-30 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-zinc-950 border border-zinc-800 mr-2"></div>
                      <div className="w-2 h-2 rounded-full bg-zinc-800"></div>
                    </div>

                    {/* Background Media 100% Pantalla Completa TikTok */}
                    {Boolean(formData.image_url && (formData.media_type === 'video' || /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(formData.image_url))) ? (
                      <video 
                        src={formData.image_url} 
                        autoPlay 
                        loop 
                        muted 
                        playsInline 
                        className="w-full h-full object-cover z-0" 
                      />
                    ) : formData.image_url ? (
                      <img 
                        src={formData.image_url} 
                        alt="Preview" 
                        className="w-full h-full object-cover z-0" 
                        onError={(e) => { e.target.onerror = null; e.target.src = ''; }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 z-0 gap-2 p-4 text-center">
                        <ImageIcon size={36} className="opacity-40 text-amber-500" />
                        <span className="text-xs font-semibold text-zinc-400">Sube o selecciona una foto para verla aquí</span>
                        <span className="text-[10px] text-zinc-600">Formato 9:16 vertical o cualquier imagen</span>
                      </div>
                    )}

                    {/* Degradado inferior */}
                    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none z-10" />

                    {/* Top Overlay: Pager */}
                    <div className="absolute top-8 right-3 z-20">
                      <div className="bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] text-white/90 border border-white/15 font-semibold">
                        1/1
                      </div>
                    </div>

                    {/* TikTok Right Action Column */}
                    <div className="absolute right-2.5 bottom-12 z-20 flex flex-col items-center gap-3">
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="w-8 h-8 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                          <Heart size={16} className="text-red-500 fill-red-500" />
                        </div>
                        <span className="text-[9px] font-bold text-white drop-shadow-sm">1</span>
                      </div>

                      <div className="flex flex-col items-center gap-0.5">
                        <div className="w-8 h-8 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                          <MessageSquare size={15} className="text-white" />
                        </div>
                        <span className="text-[9px] font-bold text-white drop-shadow-sm">0</span>
                      </div>

                      <div className="flex flex-col items-center gap-0.5">
                        <div className="w-8 h-8 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                          <Send size={14} className="text-white -ml-0.5" />
                        </div>
                        <span className="text-[8px] font-bold text-white drop-shadow-sm">Enviar</span>
                      </div>

                      <div className="flex flex-col items-center gap-0.5">
                        <div className="w-8 h-8 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                          <Bookmark size={15} className="text-amber-400 fill-amber-400" />
                        </div>
                        <span className="text-[8px] font-bold text-white drop-shadow-sm">Guardar</span>
                      </div>
                    </div>

                    {/* TikTok Bottom Left Info Overlay */}
                    <div className="relative z-20 p-3 pb-8 pr-14 flex flex-col gap-1 pointer-events-none">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-amber-500 overflow-hidden border border-white/80 shrink-0">
                          {storeLogo ? (
                            <img src={storeLogo} alt="Logo" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-[9px] text-black">
                              {storeName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <span className="text-white font-extrabold text-xs truncate drop-shadow-md">
                          @{storeName}
                        </span>
                        <span className="bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.2 rounded-full ml-0.5">
                          Seguir
                        </span>
                      </div>

                      {formData.title && (
                        <p className="text-white font-bold text-[11px] leading-tight line-clamp-1 drop-shadow-md">
                          {formData.title}
                        </p>
                      )}

                      <p className="text-zinc-200 text-[10px] leading-tight line-clamp-2 drop-shadow-md">
                        {formData.content || 'Escribe los detalles de tu publicación en el formulario...'}
                      </p>
                    </div>

                  </div>

                  <p className="text-[10px] text-zinc-500 text-center mt-2.5">
                    ✨ Vista previa idéntica a la pantalla del cliente en el feed TikTok.
                  </p>
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
        postId={activeCommentsPost?.id !== 'all' ? (activeCommentsPost?.id || activeCommentsPost?.postId) : null}
        postTitle={activeCommentsPost?.title}
        workspaceId={workspaceId}
        post={activeCommentsPost}
        currentCustomer={{
          id: workspaceId || 'merchant_author',
          name: `${storeName} (Comercio)`,
          profile_pic: storeLogo
        }}
        onRequireAuth={() => {}}
      />

      {/* Modal de Personas a las que les gustó (Likes) */}
      <ResponsiveModal
        isOpen={likesModal.isOpen}
        onClose={() => setLikesModal(prev => ({ ...prev, isOpen: false }))}
        className="md:max-w-sm bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 p-0 overflow-hidden"
        contentClassName="p-0"
      >
        <div className="p-4 border-b border-gray-100 dark:border-white/10 flex justify-between items-center sticky top-0 bg-white dark:bg-zinc-950 z-10">
          <div className="flex items-center gap-2">
            <Heart size={18} className="text-red-500 fill-red-500" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[240px]">
              {likesModal.title || 'Me Gusta'}
            </h2>
          </div>
          <button 
            onClick={() => setLikesModal(prev => ({ ...prev, isOpen: false }))}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar flex flex-col gap-3">
          {likesModal.loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
              <Loader2 className="animate-spin text-red-500" size={24} />
              <span className="text-xs">Cargando reacciones...</span>
            </div>
          ) : likesModal.likes.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-3">
                <Heart size={24} />
              </div>
              <p className="text-sm font-semibold text-gray-800 dark:text-zinc-200">Aún no hay reacciones</p>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 max-w-[220px]">
                Cuando los compradores pulsen Me Gusta, aparecerán listados aquí.
              </p>
            </div>
          ) : (
            likesModal.likes.map((like) => {
              const initials = (like.name || 'C').slice(0, 2).toUpperCase();
              return (
                <div key={like.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  {like.profilePic ? (
                    <img 
                      src={like.profilePic} 
                      alt={like.name} 
                      className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-white/10" 
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center font-bold text-xs">
                      {initials}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white truncate block">
                      {like.name}
                    </span>
                    <span className="text-[11px] text-gray-400 dark:text-zinc-500 block truncate">
                      {like.email ? like.email : (like.created_at ? new Date(like.created_at).toLocaleDateString() : 'Cliente verificado')}
                    </span>
                  </div>
                  <Heart size={14} className="text-red-500 fill-red-500 shrink-0" />
                </div>
              );
            })
          )}
        </div>
      </ResponsiveModal>
    </div>
  );
}
