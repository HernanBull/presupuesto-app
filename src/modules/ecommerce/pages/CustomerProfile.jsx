import React, { useState, useEffect, useRef } from 'react';
import { User, FileText, Phone, MapPin, Edit3, ArrowLeft, LogOut, ShoppingBag, History, Heart, Package, Store, ChevronRight, CheckCircle, Clock, Plus, Trash2, Settings, HelpCircle, Star, StarHalf, Navigation, Loader2, Info, Lock, AlertCircle, MessageSquare, Send, Image as ImageIcon, X, CheckCheck } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

export default function CustomerProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'datos'); // 'datos', 'pedidos', 'favoritas', 'wishlist', 'direcciones', 'ajustes'
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ 
    name: '', docId: '', phone: '', address: '', 
    pagoMovilBank: '', pagoMovilPhone: '', pagoMovilDoc: '', pagoMovilName: '', legalAccepted: false, profilePic: '' 
  });
  
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderFilterStatus, setOrderFilterStatus] = useState('Todos');
  const [orderFilterDate, setOrderFilterDate] = useState('');
  
  const [newAddress, setNewAddress] = useState('');
  const [newAddressName, setNewAddressName] = useState('');
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  
  const [position, setPosition] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  
  const [ratingModal, setRatingModal] = useState({ isOpen: false, orderId: null, rating: 0, comment: '' });
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChatOrder, setActiveChatOrder] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatImage, setChatImage] = useState(null);
  const [chatImageFile, setChatImageFile] = useState(null);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const chatScrollRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }, 100);
  };

  useEffect(() => {
    const savedCustomer = localStorage.getItem('ecommerce_current_customer');
    if (savedCustomer) {
      const parsed = JSON.parse(savedCustomer);
      parsed.favorites = Array.isArray(parsed.favorites) ? parsed.favorites : (typeof parsed.favorites === 'string' ? JSON.parse(parsed.favorites || '[]') : []);
      parsed.wishlist = Array.isArray(parsed.wishlist) ? parsed.wishlist : (typeof parsed.wishlist === 'string' ? JSON.parse(parsed.wishlist || '[]') : []);
      parsed.addresses = Array.isArray(parsed.addresses) ? parsed.addresses : (typeof parsed.addresses === 'string' ? JSON.parse(parsed.addresses || '[]') : []);
      setCurrentCustomer(parsed);
      setProfileForm({
        name: parsed.name || '',
        docId: parsed.docId || '',
        phone: parsed.phone || '',
        address: parsed.address || '',
        pagoMovilBank: parsed.pagoMovilBank || '',
        pagoMovilPhone: parsed.pagoMovilPhone || '',
        pagoMovilDoc: parsed.pagoMovilDoc || '',
        pagoMovilName: parsed.pagoMovilName || '',
        legalAccepted: parsed.legalAccepted || false,
        profilePic: parsed.profilePic || ''
      });
      fetchOrders(parsed.email);
    } else {
      navigate('/ecommerce/live');
    }
  }, [navigate]);

  const fetchChatMessages = async (orderId) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}/api/ecommerce/orders/${orderId}/chat`);
      if(res.ok) {
        const data = await res.json();
        setChatMessages(data);
        scrollToBottom();
        // Mark as read
        fetch(`${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}/api/ecommerce/orders/${orderId}/chat/read`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ reader: 'customer' })
        }).catch(()=>{});
      }
    } catch(e) {}
  };

  const openChat = (order) => {
    setActiveChatOrder(order);
    setIsChatOpen(true);
    fetchChatMessages(order.id);
  };
  
  useEffect(() => {
    if (!isChatOpen || !activeChatOrder) return;
    const socket = io(`${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}`);
    socket.emit('join_chat', activeChatOrder.id);
    
    socket.on('new_message', (msg) => {
      setChatMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      scrollToBottom();
      if (msg.sender === 'merchant') {
        fetch(`${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}/api/ecommerce/orders/${activeChatOrder.id}/chat/read`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ reader: 'customer' })
        }).catch(()=>{});
      }
    });

    socket.on('typing', ({ sender }) => {
      if (sender === 'merchant') {
        setIsTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
        scrollToBottom();
      }
    });

    socket.on('messages_read', ({ reader }) => {
      if (reader === 'merchant') {
        setChatMessages(prev => prev.map(m => m.sender === 'customer' ? { ...m, read: true } : m));
      }
    });
    
    return () => socket.disconnect();
  }, [isChatOpen, activeChatOrder]);

  const handleTyping = (e) => {
    setChatInput(e.target.value);
    if (activeChatOrder) {
      const socket = io(`${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}`);
      socket.emit('typing', { orderId: activeChatOrder.id, sender: 'customer' });
      socket.disconnect();
    }
  };

  const sendChatMessage = async (e) => {
    e?.preventDefault();
    if(!chatInput.trim() && !chatImage) return;
    setIsSendingChat(true);
    try {
      let finalImageUrl = null;
      if (chatImageFile) {
        const formData = new FormData();
        formData.append('image', chatImageFile);
        const uploadRes = await fetch(`${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}/api/upload`, { method: 'POST', body: formData });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          finalImageUrl = `${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}` + uploadData.url;
        }
      }

      const tempId = Date.now().toString();
      const optimisticMsg = {
        id: tempId,
        sender: 'customer',
        text: chatInput,
        imageUrl: finalImageUrl || chatImage, // Fallback to base64 if upload fails or is bypassed
        timestamp: new Date().toISOString(),
        read: false
      };
      
      setChatMessages(prev => [...prev, optimisticMsg]);
      setChatInput('');
      setChatImage(null);
      setChatImageFile(null);
      scrollToBottom();

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}/api/ecommerce/orders/${activeChatOrder.id}/chat`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ sender: 'customer', text: optimisticMsg.text, imageUrl: finalImageUrl, id: tempId })
      });
      if(res.ok) {
        const data = await res.json();
        setChatMessages(prev => prev.map(m => m.id === tempId ? data.message : m));
      }
    } catch(err) {
      console.error(err);
    }
    setIsSendingChat(false);
  };

  const handleChatImageUpload = (e) => {
    const file = e.target.files[0];
    if(file) {
      setChatImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setChatImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const fetchOrders = async (email) => {
    setLoadingOrders(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}/api/ecommerce/customer-orders/${email}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingOrders(false);
  };

  const updateCustomerData = async (updatedData) => {
    const newUser = { ...currentCustomer, ...updatedData };
    setCurrentCustomer(newUser);
    localStorage.setItem('ecommerce_current_customer', JSON.stringify(newUser));
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}/api/ecommerce/customers/${currentCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    await updateCustomerData(profileForm);
    setIsEditingProfile(false);
  };

  const confirmOrderReceived = async (orderId) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://axomarket.pagina.dev'}/api/ecommerce/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_confirmed: 1 })
      });
      if (res.ok) {
        // Optimistically update the UI to show the customer has confirmed, 
        // even if it hasn't reached 'Entregado' yet if the driver hasn't confirmed.
        setOrders(orders.map(order => order.id === orderId ? { ...order, customer_confirmed: 1 } : order));
      }
    } catch(err) {
      console.error(err);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result;
        await updateCustomerData({ profilePic: base64String });
        setProfileForm(prev => ({ ...prev, profilePic: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFavorite = async (storeSlug) => {
    const favorites = currentCustomer.favorites || [];
    const updatedFavorites = favorites.filter(f => f.slug !== storeSlug);
    await updateCustomerData({ favorites: updatedFavorites });
  };
  
  const removeWishlist = async (productId) => {
    const wishlist = currentCustomer.wishlist || [];
    const updatedWishlist = wishlist.filter(p => p.productId !== productId);
    await updateCustomerData({ wishlist: updatedWishlist });
  };

  const getLocationFromGPS = () => {
    setGpsLoading(true);
    setGpsError('');
    if (!navigator.geolocation) {
      setGpsError('Tu navegador no soporta geolocalización.');
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setGpsLoading(false);
      },
      (err) => {
        setGpsError('No se pudo obtener la ubicación. Por favor, asegúrate de haber dado permisos al navegador/teléfono.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  function MapClickHandler() {
    useMapEvents({
      click(e) {
        setPosition(e.latlng);
      },
    });
    return null;
  }

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!newAddressName || !newAddress) return;
    
    const addresses = Array.isArray(currentCustomer.addresses) ? currentCustomer.addresses : (
      typeof currentCustomer.addresses === 'string' ? JSON.parse(currentCustomer.addresses || '[]') : []
    );
    
    const newAddr = {
      id: Date.now().toString(),
      name: newAddressName,
      address: newAddress,
      isDefault: addresses.length === 0
    };
    if (position) {
      newAddr.lat = position.lat;
      newAddr.lng = position.lng;
    }
    
    const updatedAddresses = [...addresses, newAddr];
    await updateCustomerData({ addresses: updatedAddresses });
    setIsAddingAddress(false);
    setNewAddress('');
    setNewAddressName('');
    setPosition(null);
    setGpsError('');
  };

  const removeAddress = async (id) => {
    const addresses = Array.isArray(currentCustomer.addresses) ? currentCustomer.addresses : (
      typeof currentCustomer.addresses === 'string' ? JSON.parse(currentCustomer.addresses || '[]') : []
    );
    const updatedAddresses = addresses.filter(a => a.id !== id);
    await updateCustomerData({ addresses: updatedAddresses });
  };

  const setDefaultAddress = async (id) => {
    const addresses = Array.isArray(currentCustomer.addresses) ? currentCustomer.addresses : (
      typeof currentCustomer.addresses === 'string' ? JSON.parse(currentCustomer.addresses || '[]') : []
    );
    const updatedAddresses = addresses.map(a => ({ ...a, isDefault: a.id === id }));
    await updateCustomerData({ addresses: updatedAddresses });
  };

  const handleLogout = () => {
    localStorage.removeItem('ecommerce_current_customer');
    navigate('/ecommerce/live');
  };
  
  const submitRating = () => {
    alert('¡Gracias por calificar tu orden!');
    setRatingModal({ isOpen: false, orderId: null, rating: 0, comment: '' });
  };

  if (!currentCustomer) return null;

  const parsedFavorites = currentCustomer.favorites || [];
  
  const parsedWishlist = currentCustomer.wishlist || [];

  const parsedAddresses = currentCustomer.addresses || [];

  return (
    <div className="min-h-screen bg-black font-sans text-slate-50 selection:bg-amber-500/30 relative overflow-x-hidden">
      
      {/* Luces de Fondo */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-amber-500/5 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-zinc-800/20 blur-[120px] rounded-full -translate-x-1/4 translate-y-1/3"></div>
      </div>

      {/* Navbar Premium */}
      <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-2xl border-b border-white/5 shadow-2xl">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/ecommerce/live')}>
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(245,158,11,0.3)] group-hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all">
              <ShoppingBag size={20} className="stroke-[2.5]" />
            </div>
            <span className="font-bold text-xl tracking-[0.2em] text-white">AXON<span className="text-amber-500 font-light">MARKET</span></span>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-6">
            <button 
              onClick={() => navigate('/ecommerce/live')}
              className="flex items-center gap-1.5 sm:gap-2 text-xs font-bold tracking-wider uppercase text-zinc-400 hover:text-amber-500 transition-colors"
            >
              <ArrowLeft size={16} /> 
              <span className="hidden sm:inline">Volver al Marketplace</span>
              <span className="sm:hidden">Volver</span>
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-1.5 sm:gap-2 text-xs font-bold tracking-wider uppercase bg-red-500/10 text-red-500 border border-red-500/20 px-3 sm:px-4 py-2 rounded-full hover:bg-red-500/20 transition-colors"
            >
              <LogOut size={16} /> 
              <span className="hidden sm:inline">Cerrar Sesión</span>
              <span className="sm:hidden">Salir</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Header Oscuro */}
      <div className="bg-zinc-950 px-6 py-12 relative overflow-hidden border-b border-white/5">
         <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-amber-500/30 to-transparent"></div>
           <div className="absolute -top-[50%] -right-[10%] w-[50%] h-[200%] bg-amber-500/5 rotate-12 blur-3xl rounded-full"></div>
         </div>
         <div className="max-w-5xl mx-auto relative z-10 flex flex-col md:flex-row items-center gap-6">
           <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 text-black rounded-full flex items-center justify-center text-4xl font-black shadow-[0_0_30px_rgba(245,158,11,0.3)] shrink-0 relative overflow-hidden group">
             <div className="absolute inset-0 border border-white/20 rounded-full mix-blend-overlay z-10 pointer-events-none"></div>
             {currentCustomer.profilePic ? (
               <img src={currentCustomer.profilePic} alt="Perfil" className="w-full h-full object-cover" />
             ) : (
               <span>{currentCustomer.name.charAt(0).toUpperCase()}</span>
             )}
             <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity z-20">
               <span className="text-white text-xs font-bold text-center px-2">Cambiar<br/>Foto</span>
               <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
             </label>
           </div>
           <div className="text-center md:text-left">
             <h1 className="text-3xl font-extrabold text-white tracking-tight">{currentCustomer.name}</h1>
             <p className="text-zinc-400 text-sm font-medium mt-1">{currentCustomer.email}</p>
           </div>
         </div>
      </div>

      {/* Mobile tab bar */}
      <div className="md:hidden px-6 py-3 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl sticky top-[80px] z-30">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[{id:'datos',icon:<User size={14}/>,label:'Perfil'},{id:'direcciones',icon:<MapPin size={14}/>,label:'Direcciones'},{id:'pedidos',icon:<History size={14}/>,label:'Pedidos'},{id:'wishlist',icon:<Package size={14}/>,label:'Guardados'},{id:'favoritas',icon:<Heart size={14}/>,label:'Favoritas'},{id:'ajustes',icon:<Settings size={14}/>,label:'Ajustes'}].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-full text-xs font-bold shrink-0 transition-all border ${activeTab === tab.id ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'text-zinc-500 border-transparent hover:text-white'}`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
        
        {/* Sidebar: oculto en móvil, visible en desktop */}
        <div className="hidden md:block md:col-span-1 space-y-4">
          <div className="bg-zinc-900/50 backdrop-blur-xl rounded-3xl p-4 border border-white/5 shadow-2xl flex flex-col gap-2">
            <button onClick={() => setActiveTab('datos')} className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === 'datos' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white border border-transparent'}`}><User size={18} /> Mi Perfil</button>
            <button onClick={() => setActiveTab('direcciones')} className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === 'direcciones' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white border border-transparent'}`}><MapPin size={18} /> Direcciones</button>
            <button onClick={() => setActiveTab('pedidos')} className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === 'pedidos' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white border border-transparent'}`}><History size={18} /> Mis Pedidos</button>
            <button onClick={() => setActiveTab('wishlist')} className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === 'wishlist' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white border border-transparent'}`}><Package size={18} /> Guardados</button>
            <button onClick={() => setActiveTab('favoritas')} className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === 'favoritas' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white border border-transparent'}`}><Heart size={18} /> Tiendas Favoritas</button>
            <div className="h-[1px] bg-white/5 my-2"></div>
            <button onClick={() => setActiveTab('ajustes')} className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === 'ajustes' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'text-zinc-400 hover:bg-white/5 hover:text-white border border-transparent'}`}><Settings size={18} /> Ajustes</button>
          </div>
        </div>

        {/* Panel Derecho: Contenido */}
        <div className="md:col-span-3">
          <AnimatePresence mode="wait">
            
            {/* TABS: DATOS */}
            {activeTab === 'datos' && (
              <motion.div 
                key="datos"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-zinc-900/50 backdrop-blur-xl rounded-3xl p-8 border border-white/5 shadow-2xl relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-amber-500/10 transition-colors"></div>
                <div className="relative z-10 flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-extrabold text-white">Información Personal</h2>
                  {!isEditingProfile && (
                    <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-2 text-amber-500 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-full text-sm font-bold hover:bg-amber-500/20 transition-colors">
                      <Edit3 size={16} /> Editar
                    </button>
                  )}
                </div>

                {!isEditingProfile ? (
                  <div className="space-y-8 relative z-10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block flex items-center gap-2"><User size={14} className="text-amber-500"/> Nombre Completo</label>
                        <p className="text-white font-semibold text-lg">{currentCustomer.name}</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block flex items-center gap-2"><FileText size={14} className="text-amber-500"/> Documento (CI/RUT)</label>
                        <p className="text-white font-semibold text-lg">{currentCustomer.docId || '-'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block flex items-center gap-2"><Phone size={14} className="text-amber-500"/> Teléfono</label>
                        <p className="text-white font-semibold text-lg">{currentCustomer.phone || '-'}</p>
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Lock size={18} className="text-emerald-500" />
                        <h3 className="text-lg font-bold text-white">Datos de Pago Móvil Autorizados</h3>
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 mb-6">
                        <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">Seguridad Antifraude Activada</p>
                        <p className="text-emerald-500/80 text-sm leading-relaxed">Los comercios de AxonMarket <strong>solo aceptarán</strong> pagos provenientes de esta cuenta registrada. Los pagos de terceros serán retenidos y estarán sujetos a un estricto proceso de verificación ("Voto de Confianza") con el comercio. De no poder probar la legitimidad del titular en 24 horas, los fondos no serán devueltos y se procederá a denuncia por estafa.</p>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
                        <div>
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Banco</label>
                          <p className="text-white font-medium">{currentCustomer.pagoMovilBank || 'No registrado'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Teléfono</label>
                          <p className="text-white font-medium">{currentCustomer.pagoMovilPhone || 'No registrado'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Cédula / RIF</label>
                          <p className="text-white font-medium">{currentCustomer.pagoMovilDoc || 'No registrado'}</p>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Titular</label>
                          <p className="text-white font-medium">{currentCustomer.pagoMovilName || 'No registrado'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateProfile} className="space-y-6 relative z-10">
                    <div>
                      <label className="block text-sm font-bold text-zinc-400 mb-2">Nombre Completo</label>
                      <input type="text" required value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full bg-zinc-950 border-2 border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-all shadow-inner" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-zinc-400 mb-2">Documento de Identidad General</label>
                        <input type="text" value={profileForm.docId} onChange={e => setProfileForm({...profileForm, docId: e.target.value})} className="w-full bg-zinc-950 border-2 border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-all shadow-inner" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-zinc-400 mb-2">Teléfono General</label>
                        <input type="tel" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="w-full bg-zinc-950 border-2 border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-all shadow-inner" />
                      </div>
                    </div>
                    
                    <div className="border-t border-white/10 pt-6 mt-6">
                      <h3 className="text-lg font-bold text-white mb-1">Registro de Pago Móvil</h3>
                      <p className="text-zinc-400 text-sm mb-6">Esta será la <strong>ÚNICA cuenta autorizada</strong> desde la cual los comercios aceptarán tus pagos.</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                        <div>
                          <label className="block text-sm font-bold text-zinc-400 mb-2">Banco Emisor</label>
                          <select required value={profileForm.pagoMovilBank} onChange={e => setProfileForm({...profileForm, pagoMovilBank: e.target.value})} className="w-full bg-zinc-950 border-2 border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-all shadow-inner">
                            <option value="">Selecciona un Banco...</option>
                            <option value="Banesco">Banesco</option>
                            <option value="Mercantil">Mercantil</option>
                            <option value="Provincial">Provincial</option>
                            <option value="Venezuela">Banco de Venezuela</option>
                            <option value="BNC">BNC</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-zinc-400 mb-2">Teléfono Asociado</label>
                          <input type="tel" required placeholder="04XX-XXXXXXX" value={profileForm.pagoMovilPhone} onChange={e => setProfileForm({...profileForm, pagoMovilPhone: e.target.value})} className="w-full bg-zinc-950 border-2 border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-all shadow-inner" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-zinc-400 mb-2">Cédula / RIF</label>
                          <input type="text" required placeholder="V-XXXXXXXX" value={profileForm.pagoMovilDoc} onChange={e => setProfileForm({...profileForm, pagoMovilDoc: e.target.value})} className="w-full bg-zinc-950 border-2 border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-all shadow-inner" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-zinc-400 mb-2">Nombre del Titular</label>
                          <input type="text" required value={profileForm.pagoMovilName} onChange={e => setProfileForm({...profileForm, pagoMovilName: e.target.value})} className="w-full bg-zinc-950 border-2 border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-all shadow-inner" />
                        </div>
                      </div>

                      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex gap-4">
                        <input type="checkbox" required checked={profileForm.legalAccepted} onChange={e => setProfileForm({...profileForm, legalAccepted: e.target.checked})} className="w-5 h-5 mt-0.5 rounded border-red-500/30 text-red-500 focus:ring-red-500 bg-zinc-950 shrink-0 cursor-pointer" />
                        <label className="text-sm text-red-200 cursor-pointer" onClick={() => setProfileForm({...profileForm, legalAccepted: !profileForm.legalAccepted})}>
                          <strong>Declaración Jurada Antifraude:</strong> Declaro bajo juramento que esta cuenta es de mi propiedad. Entiendo y acepto que cualquier pago enviado a AxonMarket o a sus comercios desde un número o cédula distinta a esta será retenido y sujeto a verificación. Si no puedo comprobar que el pago fue hecho por un familiar o bajo mi consentimiento legítimo en 24h, será considerado estafa y los fondos NO me serán reembolsados.
                        </label>
                      </div>
                    </div>

                    <div className="pt-6 flex gap-4 border-t border-white/10 mt-6">
                      <button type="button" onClick={() => setIsEditingProfile(false)} className="px-6 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-bold hover:bg-zinc-700 transition-colors">Cancelar</button>
                      <button type="submit" disabled={!profileForm.legalAccepted} className="px-8 py-3 bg-amber-500 text-black rounded-xl font-bold hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_0_20px_rgba(245,158,11,0.3)]">Guardar Cambios</button>
                    </div>
                  </form>
                )}
              </motion.div>
            )}
            
            {/* TABS: DIRECCIONES */}
            {activeTab === 'direcciones' && (
              <motion.div key="direcciones" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-extrabold text-white mb-2">Libreta de Direcciones</h2>
                    <p className="text-zinc-400 text-sm">Gestiona tus direcciones de entrega.</p>
                  </div>
                  {!isAddingAddress && (
                     <button onClick={() => setIsAddingAddress(true)} className="flex items-center gap-2 bg-amber-500 text-black px-4 py-2 rounded-xl text-sm font-bold hover:bg-amber-400 transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                       <Plus size={16} /> Nueva Dirección
                     </button>
                  )}
                </div>

                {isAddingAddress && (
                  <form onSubmit={handleAddAddress} className="bg-zinc-900/50 backdrop-blur-xl rounded-3xl p-6 border border-white/5 shadow-2xl mb-6 space-y-6">
                    
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3 text-blue-400 text-sm">
                      <Info size={20} className="shrink-0 mt-0.5" />
                      <div>
                        <strong>Ubicación Exacta:</strong> Te recomendamos fuertemente usar tu <strong>teléfono móvil</strong> y presionar el botón de GPS para capturar tu ubicación exacta. Esto asegurará que los repartidores lleguen sin problemas.
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold text-zinc-400 mb-2">Nombre (Ej: Casa, Oficina)</label>
                          <input type="text" required value={newAddressName} onChange={e => setNewAddressName(e.target.value)} className="w-full bg-zinc-950 border-2 border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-all shadow-inner" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-zinc-400 mb-2">Dirección Completa (Texto)</label>
                          <input type="text" required value={newAddress} onChange={e => setNewAddress(e.target.value)} className="w-full bg-zinc-950 border-2 border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 transition-all shadow-inner" />
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3 items-end">
                          <div className="flex-1 w-full space-y-2">
                            <label className="text-sm font-bold text-zinc-400 mb-2">Punto GPS (Opcional)</label>
                            <div className="bg-zinc-950 border-2 border-white/10 rounded-xl px-4 py-3 flex items-center justify-between shadow-inner h-[52px]">
                               {position ? (
                                 <span className="font-mono text-sm text-amber-500">
                                   {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
                                 </span>
                               ) : (
                                 <span className="text-sm text-zinc-600 italic">No fijado en el mapa</span>
                               )}
                            </div>
                          </div>
                          <button 
                            type="button"
                            onClick={getLocationFromGPS}
                            disabled={gpsLoading}
                            className="w-full sm:w-auto px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 h-[52px]"
                          >
                            {gpsLoading ? <Loader2 size={18} className="animate-spin" /> : <Navigation size={18} />}
                            Usar GPS
                          </button>
                        </div>
                        {gpsError && <p className="text-red-400 text-xs font-bold">{gpsError}</p>}
                        
                        <div className="h-[200px] w-full rounded-2xl overflow-hidden border border-white/10 relative z-0">
                          <MapContainer 
                            center={position || { lat: 10.4806, lng: -66.9036 }} 
                            zoom={position ? 16 : 12} 
                            style={{ height: '100%', width: '100%' }}
                          >
                            <TileLayer
                              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            {position && (
                               <Marker position={position} />
                            )}
                            <MapClickHandler />
                          </MapContainer>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-white/10">
                      <button type="submit" className="px-6 py-2.5 bg-amber-500 text-black rounded-xl font-bold text-sm hover:bg-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">Guardar Dirección</button>
                      <button type="button" onClick={() => { setIsAddingAddress(false); setPosition(null); setGpsError(''); }} className="px-6 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl font-bold text-sm hover:bg-zinc-700">Cancelar</button>
                    </div>
                  </form>
                )}

                {parsedAddresses.length === 0 ? (
                  <div className="bg-zinc-900/30 rounded-3xl p-12 border border-white/10 border-dashed text-center">
                    <MapPin size={48} className="mx-auto text-zinc-600 mb-4" />
                    <h3 className="text-lg font-bold text-white">No tienes direcciones</h3>
                    <p className="text-zinc-500 text-sm mt-2">Añade una dirección para facilitar tu próxima compra.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {parsedAddresses.map(addr => (
                      <div key={addr.id} className={`bg-zinc-900/50 backdrop-blur-xl rounded-2xl p-5 border ${addr.isDefault ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'border-white/5'} relative`}>
                        {addr.isDefault && (
                          <span className="absolute top-4 right-4 bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase px-2 py-1 rounded-md border border-amber-500/20">Por defecto</span>
                        )}
                        <h4 className="font-bold text-white mb-1 flex items-center gap-2"><MapPin size={16} className={addr.isDefault ? "text-amber-500" : "text-zinc-500"} /> {addr.name}</h4>
                        <p className="text-zinc-400 text-sm mb-4 leading-relaxed pr-12">{addr.address}</p>
                        {(addr.lat && addr.lng) && (
                           <div className="mb-4 inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase rounded-md">
                             <Navigation size={12} />
                             Ubicación GPS Guardada
                           </div>
                        )}
                        
                        <div className="flex items-center gap-3">
                          {!addr.isDefault && (
                            <button onClick={() => setDefaultAddress(addr.id)} className="text-amber-500 text-sm font-bold hover:text-amber-400 transition-colors">Hacer principal</button>
                          )}
                          <button onClick={() => removeAddress(addr.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg ml-auto transition-colors"><Trash2 size={16}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* TABS: PEDIDOS */}
            {activeTab === 'pedidos' && (
              <motion.div key="pedidos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-extrabold text-white mb-2">Historial de Pedidos</h2>
                    <p className="text-zinc-400 text-sm">Revisa el estado de tus compras anteriores y deja reseñas.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Estado</label>
                      <select 
                        value={orderFilterStatus}
                        onChange={(e) => setOrderFilterStatus(e.target.value)}
                        className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-all"
                      >
                        <option value="Todos">Todos</option>
                        <option value="Activos">En Proceso</option>
                        <option value="Completado">Completados</option>
                        <option value="Cancelado">Cancelados</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Fecha</label>
                      <input 
                        type="date"
                        value={orderFilterDate}
                        onChange={(e) => setOrderFilterDate(e.target.value)}
                        className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-all [color-scheme:dark]"
                      />
                    </div>
                    {orderFilterDate && (
                      <button 
                        onClick={() => setOrderFilterDate('')}
                        className="self-end h-[38px] px-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl flex items-center justify-center hover:bg-red-500/20 transition-all"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
                
                {loadingOrders ? (
                  <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div></div>
                ) : (() => {
                  const filteredOrders = orders.filter(o => {
                    let matchesStatus = true;
                    if (orderFilterStatus === 'Activos') matchesStatus = o.status !== 'Completado' && o.status !== 'Cancelado';
                    else if (orderFilterStatus !== 'Todos') matchesStatus = o.status === orderFilterStatus;
                    
                    let matchesDate = true;
                    if (orderFilterDate) {
                      const [year, month, day] = orderFilterDate.split('-');
                      const m = parseInt(month, 10).toString();
                      const d = parseInt(day, 10).toString();
                      const matchesF1 = o.date?.includes(`${d}/${m}/${year}`);
                      const matchesF2 = o.date?.includes(`${m}/${d}/${year}`);
                      const matchesF3 = o.date?.includes(`${year}-${month}-${day}`);
                      const matchesF4 = o.date?.includes(`${day}/${month}/${year}`);
                      matchesDate = matchesF1 || matchesF2 || matchesF3 || matchesF4;
                    }
                    return matchesStatus && matchesDate;
                  });

                  if (filteredOrders.length === 0) {
                    return (
                      <div className="bg-zinc-900/30 rounded-3xl p-12 border border-white/10 border-dashed text-center">
                        <Package size={48} className="mx-auto text-zinc-600 mb-4" />
                        <h3 className="text-lg font-bold text-white">{orders.length > 0 ? "No hay pedidos con estos filtros" : "No tienes pedidos"}</h3>
                        <p className="text-zinc-500 text-sm mt-2">{orders.length > 0 ? "Prueba cambiando el estado o la fecha." : "Tus futuras compras aparecerán aquí."}</p>
                        {orders.length === 0 && <button onClick={() => navigate('/ecommerce/live')} className="mt-6 px-6 py-2.5 bg-amber-500 text-black rounded-xl font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:bg-amber-400 transition-all">Explorar Marketplace</button>}
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {filteredOrders.map(order => (
                      <div key={order.id} className="bg-zinc-900/50 backdrop-blur-xl rounded-3xl p-6 border border-white/5 shadow-2xl flex flex-col md:flex-row gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <span className="bg-zinc-800 text-zinc-300 px-3 py-1 rounded-lg text-xs font-bold font-mono border border-white/5">{order.id}</span>
                            <span className="text-sm text-zinc-400 flex items-center gap-1"><Clock size={14}/> {order.date}</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                              order.status === 'Completado' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            }`}>
                              {order.status === 'Completado' && <CheckCircle size={14} />} {order.status}
                            </span>
                          </div>
                          
                          <div className="space-y-3">
                            {order.items && order.items.map(item => (
                              <div key={item.id} className="flex justify-between text-sm">
                                <span className="font-medium text-zinc-300">{item.quantity}x {item.name}</span>
                                <span className="text-zinc-500">${(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>

                          {order.paymentStatus === 'review' && (
                            <div className="mt-6 border border-orange-500/30 bg-orange-500/10 rounded-xl p-4 flex gap-4 items-start">
                              <AlertCircle size={24} className="text-orange-500 shrink-0" />
                              <div>
                                <h4 className="font-bold text-orange-400 mb-1">Pago En Revisión por Tercero</h4>
                                <p className="text-sm text-orange-500/80 mb-3">El comercio ha detectado que el pago proviene de una cuenta no autorizada en tu perfil. Su orden está congelada.</p>
                                <div className="text-xs text-orange-300 font-medium p-3 bg-orange-950/50 rounded-lg">
                                  <strong>ACCIÓN REQUERIDA:</strong> Tienes 24 horas para comunicarte directamente con el comercio y proveer <strong>pruebas verificables</strong> (Cédula del titular, parentesco) de que el pago es legítimo. De lo contrario, los fondos no serán devueltos y se denunciará fraude.
                                </div>
                                <button onClick={() => openChat(order)} className="mt-4 bg-orange-500 hover:bg-orange-600 text-black px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors">
                                  <MessageSquare size={16} /> Contactar Soporte / Enviar Pruebas
                                </button>
                              </div>
                            </div>
                          )}
                          {order.paymentStatus === 'fraud' && (
                            <div className="mt-6 border border-red-500/30 bg-red-500/10 rounded-xl p-4 flex gap-4 items-start">
                              <AlertCircle size={24} className="text-red-500 shrink-0" />
                              <div>
                                <h4 className="font-bold text-red-400 mb-1">Orden Cancelada - Fraude Reportado</h4>
                                <p className="text-sm text-red-500/80 mb-3">No se pudo verificar la procedencia del pago. Se ha emitido un reporte de fraude a la plataforma y no hay derecho a reembolso.</p>
                              </div>
                            </div>
                          )}
                          
                          {/* Seguridad: PIN del Delivery */}
                          <div className="mt-6 border-t border-white/5 pt-4">
                            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Seguridad de Entrega</h4>
                            {order.deliveryPin ? (
                              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between">
                                <div>
                                  <span className="block text-[10px] font-bold text-emerald-500/80 mb-1">PIN SECRETO DE ENTREGA</span>
                                  <span className="text-3xl font-black text-emerald-400 tracking-[0.3em] font-mono">{order.deliveryPin}</span>
                                </div>
                                <div className="text-right">
                                  <Lock size={24} className="text-emerald-500/60 inline-block mb-1" />
                                  <p className="text-xs text-emerald-500/80 max-w-[120px] leading-tight font-medium">Dicta este código al repartidor al recibir tu pedido.</p>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 flex items-center justify-center gap-2 text-zinc-500 text-xs font-medium text-center">
                                <Clock size={14} className="flex-shrink-0" />
                                El PIN de seguridad se generará cuando el comercio valide tu pago.
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="w-full md:w-64 bg-zinc-950/50 p-4 rounded-2xl flex flex-col justify-between shrink-0 border border-white/5">
                          <div>
                            <div className="text-xs text-zinc-500 font-bold uppercase mb-1">Total del Pedido</div>
                            <div className="text-2xl font-black text-amber-500">${order.total.toFixed(2)}</div>
                          </div>
                          <div className="space-y-2 mt-4">
                            <button className="w-full py-2.5 bg-zinc-800 border border-transparent text-white rounded-xl text-sm font-bold hover:border-amber-500/50 hover:text-amber-500 transition-colors flex items-center justify-center gap-2">
                              Ver Tienda <ChevronRight size={16} />
                            </button>
                            {order.status === 'Enviado' && (
                              order.customer_confirmed ? (
                                <div className="w-full py-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold border border-emerald-500/30 flex items-center justify-center gap-2 text-center px-2">
                                  <Clock size={16} /> Esperando al repartidor
                                </div>
                              ) : (
                                <button 
                                  onClick={() => confirmOrderReceived(order.id)}
                                  className="w-full py-2.5 bg-emerald-500 text-black rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:bg-emerald-400 transition-all flex items-center justify-center gap-2"
                                >
                                  <CheckCircle size={16} /> Confirmar Recibido
                                </button>
                              )
                            )}
                            {(order.status === 'Completado' || order.status === 'Entregado') && (
                              <button 
                                onClick={() => setRatingModal({ isOpen: true, orderId: order.id, rating: 0, comment: '' })}
                                className="w-full py-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl text-sm font-bold hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-2"
                              >
                                <Star size={16} /> Calificar Compra
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
                })()}
              </motion.div>
            )}

            {/* TABS: PRODUCTOS GUARDADOS (WISHLIST) */}
            {activeTab === 'wishlist' && (
              <motion.div key="wishlist" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <h2 className="text-2xl font-extrabold text-white mb-2">Productos Guardados</h2>
                <p className="text-zinc-400 text-sm mb-6">Tus artículos favoritos listos para cuando quieras comprar.</p>
                
                {parsedWishlist.length === 0 ? (
                  <div className="bg-zinc-900/30 rounded-3xl p-12 border border-white/10 border-dashed text-center">
                    <Package size={48} className="mx-auto text-zinc-600 mb-4" />
                    <h3 className="text-lg font-bold text-white">Tu lista está vacía</h3>
                    <p className="text-zinc-500 text-sm mt-2">Guarda productos haciendo clic en el corazón mientras navegas por las tiendas.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {parsedWishlist.map(product => (
                      <div key={product.productId} className="bg-zinc-900/50 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/5 shadow-2xl flex flex-col group hover:border-amber-500/30 transition-all">
                        <div className="h-40 w-full relative bg-zinc-800">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.productName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600"><Package size={40}/></div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80"></div>
                          <button 
                            onClick={() => removeWishlist(product.productId)}
                            className="absolute top-3 right-3 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-red-500 hover:text-red-400 hover:bg-black/70 transition-all shadow-sm"
                          >
                            <Heart size={16} fill="currentColor" />
                          </button>
                        </div>
                        <div className="p-4 flex-1 flex flex-col justify-between relative z-10 -mt-2">
                          <div>
                            <div className="text-xs text-amber-500 font-bold mb-1 uppercase tracking-wide truncate">{product.storeName}</div>
                            <h4 className="font-bold text-white leading-tight mb-2 line-clamp-2">{product.productName}</h4>
                          </div>
                          <div className="flex items-center justify-between mt-4">
                            <span className="font-black text-amber-500 text-lg">${product.productPrice?.toFixed(2)}</span>
                            <button 
                              onClick={() => navigate(`/ecommerce/live/${product.storeSlug}`)}
                              className="px-4 py-2 bg-amber-500 text-black rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:bg-amber-400 transition-all"
                            >
                              Ver Tienda
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* TABS: FAVORITAS */}
            {activeTab === 'favoritas' && (
              <motion.div key="favoritas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <h2 className="text-2xl font-extrabold text-white mb-2">Tiendas Favoritas</h2>
                <p className="text-zinc-400 text-sm mb-6">Tus negocios preferidos para un acceso rápido.</p>
                
                {parsedFavorites.length === 0 ? (
                  <div className="bg-zinc-900/30 rounded-3xl p-12 border border-white/10 border-dashed text-center">
                    <Heart size={48} className="mx-auto text-zinc-600 mb-4" />
                    <h3 className="text-lg font-bold text-white">Aún no tienes favoritas</h3>
                    <p className="text-zinc-500 text-sm mt-2">Navega por el marketplace y guarda las tiendas que más te gusten.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {parsedFavorites.map(store => (
                      <div key={store.slug} className="bg-zinc-900/50 backdrop-blur-xl rounded-3xl p-6 border border-white/5 shadow-2xl flex items-center gap-4 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all group cursor-pointer" onClick={() => navigate(`/ecommerce/live/${store.slug}`)}>
                        <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center shadow-inner border border-amber-500/20">
                           <Store size={24} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-white group-hover:text-amber-500 transition-colors">{store.name}</h4>
                          <span className="text-xs text-zinc-500 mt-1 block">Toca para visitar</span>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeFavorite(store.slug); }}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Heart size={20} fill="currentColor" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* TABS: AJUSTES */}
            {activeTab === 'ajustes' && (
              <motion.div key="ajustes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <h2 className="text-2xl font-extrabold text-white mb-2">Configuración y Soporte</h2>
                <p className="text-zinc-400 text-sm mb-6">Administra la seguridad de tu cuenta y obtén ayuda.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Seguridad */}
                  <div className="bg-zinc-900/50 backdrop-blur-xl rounded-3xl p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center mb-6 border border-amber-500/20 shadow-inner">
                      <Settings size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 relative z-10">Seguridad de la cuenta</h3>
                    <p className="text-zinc-400 text-sm mb-6 leading-relaxed relative z-10">Actualiza tu contraseña periódicamente para mantener tu cuenta segura.</p>
                    <button className="px-5 py-2.5 bg-zinc-800 text-white font-bold rounded-xl text-sm hover:bg-zinc-700 transition-colors border border-white/5 relative z-10">
                      Cambiar Contraseña
                    </button>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[40px] rounded-full pointer-events-none group-hover:bg-amber-500/10 transition-colors"></div>
                  </div>
                  
                  {/* Centro de Ayuda */}
                  <div className="bg-zinc-900/50 backdrop-blur-xl rounded-3xl p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center mb-6 border border-emerald-500/20 shadow-inner">
                      <HelpCircle size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 relative z-10">Centro de Ayuda</h3>
                    <p className="text-zinc-400 text-sm mb-6 leading-relaxed relative z-10">¿Tienes problemas con un pedido? Consulta nuestras preguntas frecuentes.</p>
                    <button className="px-5 py-2.5 bg-zinc-800 text-white font-bold rounded-xl text-sm hover:bg-zinc-700 transition-colors border border-white/5 relative z-10">
                      Ir a Preguntas Frecuentes
                    </button>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[40px] rounded-full pointer-events-none group-hover:bg-emerald-500/10 transition-colors"></div>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
      
      {/* Modal de Chat de Resolución */}
      {isChatOpen && activeChatOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsChatOpen(false)} />
          <div className="bg-zinc-950 rounded-3xl w-full max-w-md shadow-2xl relative z-10 flex flex-col h-[80vh] overflow-hidden border border-white/10">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-zinc-900/50">
              <div>
                <h3 className="font-bold text-white flex items-center gap-2"><MessageSquare size={18} className="text-amber-500" /> Resolución de Disputa</h3>
                <p className="text-xs font-mono text-zinc-500 mt-1">Orden: {activeChatOrder.id}</p>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-zinc-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-2 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/40">
              {chatMessages.length === 0 ? (
                <div className="text-center text-zinc-500 text-sm py-10 italic">Cargando chat... o aún no hay mensajes.</div>
              ) : (
                chatMessages.map(msg => (
                  <div key={msg.id} className={`flex flex-col max-w-[85%] ${msg.sender === 'customer' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                    <div className={`p-3 rounded-2xl text-sm shadow-sm ${msg.sender === 'customer' ? 'bg-amber-500 text-black rounded-tr-none font-medium' : 'bg-zinc-800 text-zinc-200 border border-white/5 rounded-tl-none'}`}>
                      {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                      {msg.imageUrl && (
                        <img src={msg.imageUrl} alt="Evidencia" className="mt-2 rounded-xl max-w-full h-auto max-h-64 object-cover cursor-pointer border border-black/20" onClick={() => window.open(msg.imageUrl, '_blank')} />
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1 mx-1">
                      <span className="text-[10px] text-zinc-500">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      {msg.sender === 'customer' && (
                        <CheckCheck size={12} className={msg.read ? 'text-blue-500' : 'text-zinc-500'} />
                      )}
                    </div>
                  </div>
                ))
              )}
              {isTyping && (
                <div className="mr-auto flex items-center gap-2 p-3 bg-zinc-800 text-zinc-400 rounded-2xl rounded-tl-none text-sm w-fit">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-zinc-900 border-t border-white/10">
              {chatImage && (
                 <div className="relative inline-block mb-3">
                   <img src={chatImage} alt="Preview" className="h-16 rounded-lg border border-white/20" />
                   <button onClick={() => setChatImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md"><X size={12}/></button>
                 </div>
              )}
              <form onSubmit={sendChatMessage} className="flex gap-2 items-end">
                <label className="p-3 bg-zinc-800 text-zinc-400 hover:text-amber-500 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-amber-500/30">
                  <input type="file" accept="image/*" className="hidden" onChange={handleChatImageUpload} />
                  <ImageIcon size={20} />
                </label>
                <textarea 
                  value={chatInput} 
                  onChange={handleTyping} 
                  placeholder="Escribe al comercio..." 
                  className="flex-1 max-h-32 bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 resize-none text-white"
                  rows="1"
                  onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                />
                <button type="submit" disabled={isSendingChat || (!chatInput.trim() && !chatImage) || activeChatOrder?.paymentStatus === 'approved' || activeChatOrder?.paymentStatus === 'fraud'} className="p-3 bg-amber-500 text-black rounded-xl hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md shadow-amber-500/20">
                  {isSendingChat ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* RATING MODAL */}
      {ratingModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-xl">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-zinc-900/90 border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[40px] rounded-full pointer-events-none"></div>
            <button onClick={() => setRatingModal({ isOpen: false, orderId: null, rating: 0, comment: '' })} className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors z-10"><X size={24}/></button>
            <h3 className="text-2xl font-black text-white mb-2 text-center relative z-10">Calificar Pedido</h3>
            <p className="text-zinc-400 text-sm text-center mb-6 relative z-10">¿Qué tal te pareció tu experiencia de compra y los productos recibidos?</p>
            
            <div className="flex items-center justify-center gap-2 mb-6 relative z-10">
              {[1, 2, 3, 4, 5].map((star) => (
                <button 
                  key={star} 
                  onClick={() => setRatingModal({...ratingModal, rating: star})}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star size={32} fill={ratingModal.rating >= star ? '#F59E0B' : 'transparent'} className={ratingModal.rating >= star ? 'text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'text-zinc-700'} />
                </button>
              ))}
            </div>
            
            <div className="mb-6 relative z-10">
              <label className="block text-sm font-bold text-zinc-400 mb-2">Comentarios (Opcional)</label>
              <textarea 
                rows="3" 
                value={ratingModal.comment}
                onChange={(e) => setRatingModal({...ratingModal, comment: e.target.value})}
                placeholder="Escribe tu reseña aquí..."
                className="w-full bg-zinc-950 border-2 border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 shadow-inner"
              ></textarea>
            </div>
            
            <button 
              onClick={submitRating}
              disabled={ratingModal.rating === 0}
              className={`w-full py-3 rounded-xl font-bold transition-all relative z-10 ${ratingModal.rating > 0 ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:bg-amber-400' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}`}
            >
              Enviar Calificación
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
