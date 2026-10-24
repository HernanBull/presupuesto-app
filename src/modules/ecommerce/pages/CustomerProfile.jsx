import React, { useState, useEffect, useRef } from 'react';
import { User, FileText, Banknote, Phone, MapPin, Edit3, ArrowLeft, LogOut, ShoppingBag, History, Heart, Package, Store, ChevronRight, CheckCircle, Clock, Plus, Trash2, Settings, HelpCircle, Star, StarHalf, Navigation, Loader2, Info, Lock, AlertCircle, ShieldAlert, MessageSquare, Send, Image as ImageIcon, X, CheckCheck, MailWarning, ShieldCheck, RefreshCw, Award, UserPlus, Bookmark, Hammer, Eye, EyeOff } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
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

import ProfileWizardModal from '../components/ProfileWizardModal';
import { getCustomerSavedPosts } from '../services/socialService';

export default function CustomerProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    if (location.state?.tab) return location.state.tab;
    return window.innerWidth < 768 ? 'menu' : 'menu'; // Default to menu layout
  });
  const [savedPosts, setSavedPosts] = useState([]);
  const [favSubTab, setFavSubTab] = useState('tiendas');
  const [loadingSavedPosts, setLoadingSavedPosts] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [profileForm, setProfileForm] = useState({ 
    name: '', docId: '', phone: '', address: '', profile_pic: '' 
  });
  const [paymentProfiles, setPaymentProfiles] = useState([]);
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({ bank: '', phone: '', legalAccepted: false });
  
  const [isEmailConfirmed, setIsEmailConfirmed] = useState(false);
  const [isRefreshingAuth, setIsRefreshingAuth] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [authProvider, setAuthProvider] = useState('email');
  const [showUnderConstruction, setShowUnderConstruction] = useState(false);

  const handleRefreshAuthStatus = async () => {
    setIsRefreshingAuth(true);
    try {
      // 1. Si es cuenta autenticada vía Google o en BD está activa
      const isGoogleAccount = currentCustomer?.password === 'GOOGLE_AUTH' || 
                              currentCustomer?.password === 'oauth-google' || 
                              currentCustomer?.auth_provider === 'google' || 
                              authProvider === 'google' || 
                              (currentCustomer?.profile_pic && currentCustomer.profile_pic.includes('googleusercontent.com'));

      if (isGoogleAccount) {
        setIsEmailConfirmed(true);
        setAuthProvider('google');
        alert('¡Tu cuenta está activa y verificada con Google!');
        return;
      }

      // 2. Verificar sesión de Supabase Auth
      await supabase.auth.refreshSession();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsEmailConfirmed(!!user.email_confirmed_at);
        if (!!user.email_confirmed_at) {
          alert('¡Tu correo ha sido verificado con éxito!');
        } else {
          alert('Tu correo aún no aparece como verificado. Si ya hiciste clic en el enlace desde otro dispositivo (como tu celular), por favor cierra sesión y vuelve a ingresar para actualizar el estado.');
        }
      } else {
        // 3. Fallback: consultar estado en ecommerce_customers
        if (currentCustomer?.email) {
          const { data: dbCust } = await supabase
            .from('ecommerce_customers')
            .select('status, password')
            .ilike('email', currentCustomer.email)
            .maybeSingle();

          if (dbCust && (dbCust.status === 'Activo' || dbCust.password === 'GOOGLE_AUTH' || dbCust.password === 'oauth-google')) {
            setIsEmailConfirmed(true);
            if (dbCust.password === 'GOOGLE_AUTH' || dbCust.password === 'oauth-google') setAuthProvider('google');
            alert('¡Tu cuenta ha sido verificada con éxito!');
            return;
          }
        }
        alert('No se detecta una sesión activa. Si confirmaste el correo en otro dispositivo, por favor cierra sesión y vuelve a ingresar.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshingAuth(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!currentCustomer?.email) return;
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: currentCustomer.email,
        options: {
          emailRedirectTo: window.location.origin + '/auth/callback'
        }
      });
      if (error) throw error;
      alert('Correo de confirmación reenviado. Revisa tu bandeja de entrada o spam.');
    } catch (err) {
      console.error(err);
      alert('Error al reenviar el correo: ' + err.message);
    } finally {
      setIsResending(false);
    }
  };

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderFilterStatus, setOrderFilterStatus] = useState('Todos');
  const [orderFilterDate, setOrderFilterDate] = useState('');
  
  const [newAddress, setNewAddress] = useState('');
  const [newAddressSector, setNewAddressSector] = useState('');
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
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setIsEmailConfirmed(!!session.user.email_confirmed_at);
        setAuthProvider(session.user.app_metadata?.provider || 'email');
      }
    });

    const checkSession = async () => {
      // 1. Revisar si el cliente guardado es de Google o está activo en BD
      const saved = localStorage.getItem('ecommerce_current_customer');
      if (saved) {
        try {
          const p = JSON.parse(saved);
          if (p.password === 'GOOGLE_AUTH' || p.password === 'oauth-google' || p.auth_provider === 'google' || (p.profile_pic && p.profile_pic.includes('googleusercontent.com'))) {
            setIsEmailConfirmed(true);
            setAuthProvider('google');
            return;
          }
          if (p.email) {
            const { data: dbUser } = await supabase
              .from('ecommerce_customers')
              .select('status, password')
              .ilike('email', p.email)
              .maybeSingle();
            if (dbUser && (dbUser.password === 'GOOGLE_AUTH' || dbUser.password === 'oauth-google' || dbUser.status === 'Activo')) {
              setIsEmailConfirmed(true);
              if (dbUser.password === 'GOOGLE_AUTH' || dbUser.password === 'oauth-google') setAuthProvider('google');
              return;
            }
          }
        } catch(e) {}
      }

      // 2. Revisar sesión en Supabase Auth
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsEmailConfirmed(!!user.email_confirmed_at);
        setAuthProvider(user.app_metadata?.provider || 'email');
      }
    };
    checkSession();

    let pollInterval;
    const startPolling = () => {
      pollInterval = setInterval(async () => {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error || !session) return;
          // Forzar refresh de la sesión para obtener los datos actualizados de Supabase
          const { data, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && data.user && data.user.email_confirmed_at) {
            setIsEmailConfirmed(true);
            clearInterval(pollInterval);
          }
        } catch (err) {
          console.error(err);
        }
      }, 5000);
    };
    
    // Iniciar polling solo si no se sabe todavía o si checkSession inicial da false.
    // Lo más seguro es iniciarlo y si en el checkSession se confirma, lo limpiamos, o depender de isEmailConfirmed.
    // Usaremos un timer simple que se limpia on unmount.
    startPolling();

    const initializeCustomer = (parsed) => {
      if (!parsed) return;
      const isGoogleUser = parsed.password === 'GOOGLE_AUTH' || 
                           parsed.password === 'oauth-google' || 
                           parsed.auth_provider === 'google' || 
                           (parsed.profile_pic && parsed.profile_pic.includes('googleusercontent.com'));
      if (isGoogleUser) {
        setIsEmailConfirmed(true);
        setAuthProvider('google');
      } else if (parsed.status === 'Activo' && (parsed.is_verified || parsed.password === 'GOOGLE_AUTH')) {
        setIsEmailConfirmed(true);
      }
      parsed.favorites = Array.isArray(parsed.favorites) ? parsed.favorites : (typeof parsed.favorites === 'string' ? JSON.parse(parsed.favorites || '[]') : []);
      parsed.wishlist = Array.isArray(parsed.wishlist) ? parsed.wishlist : (typeof parsed.wishlist === 'string' ? JSON.parse(parsed.wishlist || '[]') : []);
      parsed.addresses = Array.isArray(parsed.addresses) ? parsed.addresses : (typeof parsed.addresses === 'string' ? JSON.parse(parsed.addresses || '[]') : []);
      
      let pProfile = parsed.payment_profile;
      if (typeof pProfile === 'string') {
        try { pProfile = JSON.parse(pProfile); } catch(e) { pProfile = []; }
      }
      if (pProfile && !Array.isArray(pProfile)) {
        pProfile = (typeof pProfile === 'object' && Object.keys(pProfile).length > 0) ? [pProfile] : [];
      }
      if (!Array.isArray(pProfile)) pProfile = [];
      parsed.payment_profile = pProfile;
      
      if (parsed.profilePic && !parsed.profile_pic) {
        parsed.profile_pic = parsed.profilePic;
        delete parsed.profilePic;
      }
      localStorage.setItem('ecommerce_current_customer', JSON.stringify(parsed));
      
      setCurrentCustomer(parsed);
      setPaymentProfiles(pProfile);
      setProfileForm({
        name: parsed.name || '',
        docId: parsed.docId || '',
        phone: parsed.phone || '',
        address: parsed.address || '',
        profile_pic: parsed.profile_pic || ''
      });
      if (parsed.email) fetchOrders(parsed.email);

      // Solo sugerir wizard si no viene a ver una pestaña específica y no lo ha cerrado antes
      const isProfileIncomplete = !parsed.docId || !parsed.name || !parsed.phone || !parsed.addresses || parsed.addresses.length === 0 || !parsed.payment_profile || parsed.payment_profile.length === 0 || !parsed.profile_pic;
      if (isProfileIncomplete && !location.state?.tab && !sessionStorage.getItem('wizard_dismissed')) {
        setIsWizardOpen(true);
      }
    };

    const savedCustomer = localStorage.getItem('ecommerce_current_customer') || localStorage.getItem('ecommerce_user');
    if (savedCustomer) {
      try {
        const parsed = typeof savedCustomer === 'string' ? JSON.parse(savedCustomer) : savedCustomer;
        initializeCustomer(parsed);
      } catch (err) {
        console.error('Error al parsear cliente guardado:', err);
      }
    } else {
      // Recuperación proactiva con Supabase Auth si se recargó la página
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (user && user.email) {
          const { data: dbCust } = await supabase
            .from('ecommerce_customers')
            .select('*')
            .ilike('email', user.email)
            .maybeSingle();
          if (dbCust) {
            initializeCustomer(dbCust);
            return;
          }
        }
        navigate('/');
      }).catch(() => {
        navigate('/');
      });
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      authListener?.subscription?.unsubscribe();
    };
  }, [navigate]);

  // Sincronizar pestaña activa cuando se navega con state
  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state?.tab]);

  // Cargar publicaciones guardadas del cliente para la sección de favoritos
  useEffect(() => {
    if (!currentCustomer?.id) return;
    const fetchSaves = async () => {
      setLoadingSavedPosts(true);
      try {
        const saves = await getCustomerSavedPosts(currentCustomer.id);
        if (saves && saves.length > 0) {
          const postIds = saves.map(s => s.post_id).filter(Boolean);
          const { data: newsData } = await supabase
            .from('ecommerce_store_news')
            .select('*')
            .in('id', postIds);

          const combined = saves.map(s => {
            const foundNews = newsData?.find(n => String(n.id) === String(s.post_id));
            return {
              id: s.id,
              postId: s.post_id,
              workspaceId: s.workspace_id,
              title: foundNews?.title || 'Publicación Guardada',
              content: foundNews?.content || '',
              image_url: foundNews?.image_url || foundNews?.image || '',
              store_name: foundNews?.store_name || 'Comercio',
              store_slug: foundNews?.store_slug || s.workspace_id,
              created_at: s.created_at
            };
          });
          setSavedPosts(combined);
        } else {
          setSavedPosts([]);
        }
      } catch (err) {
        console.warn('Error fetching saved posts in profile:', err);
      } finally {
        setLoadingSavedPosts(false);
      }
    };

    fetchSaves();
  }, [currentCustomer?.id]);

  useEffect(() => {
    if (!currentCustomer?.email) return;
    
    const channel = supabase.channel('support_orders_updates')
      .on('broadcast', { event: 'order_updated' }, () => {
        fetchOrders(currentCustomer.email);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentCustomer?.email]);

  const fetchChatMessages = async (orderId) => {
    try {
      const { data, error } = await supabase
        .from('ecommerce_orders_v2')
        .select('chat_history')
        .eq('id', orderId)
        .single();
      if (!error && data) {
        let history = [];
        try { history = typeof data.chat_history === 'string' ? JSON.parse(data.chat_history) : (data.chat_history || []); } catch(e){}
        
        // Mark merchant messages as read
        let updated = false;
        const newHistory = history.map(m => {
          if (m.sender === 'merchant' && !m.read) {
            updated = true;
            return { ...m, read: true };
          }
          return m;
        });

        if (updated) {
          await supabase.from('ecommerce_orders_v2').update({ chat_history: JSON.stringify(newHistory) }).eq('id', orderId);
        }
        
        setChatMessages(newHistory);
        scrollToBottom();
      }
    } catch(e) { console.error(e); }
  };

  const openChat = (order) => {
    setActiveChatOrder(order);
    setIsChatOpen(true);
    fetchChatMessages(order.id);
  };
  
  useEffect(() => {
    if (!isChatOpen || !activeChatOrder) return;
    
    const channel = supabase.channel(`chat_${activeChatOrder.id}`)
      .on('broadcast', { event: 'chat_updated' }, (payload) => {
        if (payload.payload && payload.payload.history) {
          const history = payload.payload.history;
          setChatMessages(history);
          scrollToBottom();
          
          // Mark as read logic
          const unreadMerchant = history.some(m => m.sender === 'merchant' && !m.read);
          if (unreadMerchant) {
             const marked = history.map(m => (m.sender === 'merchant' && !m.read) ? { ...m, read: true } : m);
             supabase.from('ecommerce_orders_v2').update({ chat_history: JSON.stringify(marked) }).eq('id', activeChatOrder.id).then(()=>{});
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isChatOpen, activeChatOrder]);

  const handleTyping = (e) => {
    setChatInput(e.target.value);
  };

  const sendChatMessage = async (e) => {
    e?.preventDefault();
    if(!chatInput.trim() && !chatImage) return;
    setIsSendingChat(true);
    try {
      let finalImageUrl = null;
      if (chatImageFile) {
        const fileExt = chatImageFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `chat/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('ecommerce').upload(filePath, chatImageFile);
        if (!uploadError) {
          const { data } = supabase.storage.from('ecommerce').getPublicUrl(filePath);
          if (data && data.publicUrl) finalImageUrl = data.publicUrl;
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

      const { data: orderData } = await supabase.from('ecommerce_orders_v2').select('chat_history').eq('id', activeChatOrder.id).single();
      let currentHistory = [];
      if (orderData && orderData.chat_history) {
        try { currentHistory = typeof orderData.chat_history === 'string' ? JSON.parse(orderData.chat_history) : orderData.chat_history; } catch(e){}
      }
      
      const updatedHistory = [...currentHistory, optimisticMsg];
      
      const { error: updateError } = await supabase
        .from('ecommerce_orders_v2')
        .update({ chat_history: JSON.stringify(updatedHistory) })
        .eq('id', activeChatOrder.id);
        
      if (!updateError) {
        // Broadcast change
        supabase.channel(`chat_${activeChatOrder.id}`).send({
          type: 'broadcast',
          event: 'chat_updated',
          payload: { history: updatedHistory }
        });
        
        supabase.channel('support_orders_updates').send({
          type: 'broadcast',
          event: 'order_updated',
          payload: { orderId: activeChatOrder.id }
        });
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
      const { data, error } = await supabase
        .from('ecommerce_orders_v2')
        .select('*')
        .eq('customer_email', email)
        .order('date', { ascending: false });

      if (!error && data) {
        const mappedOrders = data.map(order => ({
          ...order,
          date: new Date(order.date).toLocaleString(),
          paymentMethod: order.paymentmethod,
          paymentStatus: order.paymentstatus,
          paymentDetails: typeof order.paymentdetails === 'string' ? JSON.parse(order.paymentdetails) : order.paymentdetails,
          shippingInfo: typeof order.shipping_info === 'string' ? JSON.parse(order.shipping_info) : order.shipping_info,
          items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
          deliveryPin: order.delivery_pin,
          isMobile: order.ismobile,
          chat_history: typeof order.chat_history === 'string' ? JSON.parse(order.chat_history) : (order.chat_history || [])
        }));
        setOrders(mappedOrders);
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
      const payload = {
        name: newUser.name,
        phone: newUser.phone,
        doc_id: newUser.docId,
        address: newUser.address,
        wishlist: newUser.wishlist,
        payment_profile: newUser.payment_profile,
        profile_pic: newUser.profile_pic,
        favorites: newUser.favorites,
        addresses: newUser.addresses
      };
      let { error } = await supabase.from('ecommerce_customers').update(payload).eq('id', currentCustomer.id);
      if (error) {
        alert("Advertencia de Base de Datos: La columna 'profile_pic' no existe. Los datos se guardarán, pero la foto se perderá. Por favor, ejecuta el script SQL para añadir las nuevas columnas.");
        const fallback = {
          name: newUser.name,
          phone: newUser.phone,
          doc_id: newUser.docId,
          address: newUser.address
        };
        await supabase.from('ecommerce_customers').update(fallback).eq('id', currentCustomer.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPaymentProfile = async (e) => {
    e.preventDefault();
    if (!newPayment.legalAccepted) return;
    const newProfile = {
      bank: newPayment.bank,
      phone: newPayment.phone,
      cedula: currentCustomer.docId,
      titular: currentCustomer.name
    };
    const currentList = Array.isArray(paymentProfiles) ? paymentProfiles : [];
    const updatedProfiles = [...currentList, newProfile];
    setPaymentProfiles(updatedProfiles);
    await updateCustomerData({ payment_profile: updatedProfiles });
    setIsAddingPayment(false);
    setNewPayment({ bank: '', phone: '', legalAccepted: false });
  };

  const handleDeletePaymentProfile = async (idx) => {
    if(!confirm('¿Estás seguro de eliminar esta cuenta?')) return;
    const currentList = Array.isArray(paymentProfiles) ? paymentProfiles : [];
    const updatedProfiles = currentList.filter((_, i) => i !== idx);
    setPaymentProfiles(updatedProfiles);
    await updateCustomerData({ payment_profile: updatedProfiles });
  };

  
  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setPasswordMsg('Error: Las contraseñas nuevas no coinciden');
      return;
    }
    if (currentCustomer.password && currentCustomer.password !== currentPassword) {
      setPasswordMsg('Error: Contraseña actual incorrecta');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setIsChangingPassword(true);
    setPasswordMsg('');
    try {
      const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
      if (authError) throw authError;

      // Update in DB so "Mostrar" shows the new one
      const { error: dbError } = await supabase.from('ecommerce_customers').update({ password: newPassword }).eq('id', user.id);
      if (dbError) throw dbError;
      
      setCurrentCustomer(prev => ({...prev, password: newPassword}));
      setPasswordMsg('¡Contraseña cambiada exitosamente!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error(error);
      setPasswordMsg('Error al cambiar contraseña');
    }
    setIsChangingPassword(false);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    if (profileForm.name && profileForm.name !== currentCustomer.name) {
       const { data } = await supabase.from('ecommerce_customers').select('id').ilike('name', profileForm.name.trim()).neq('id', currentCustomer.id).maybeSingle();
       if (data) {
           alert('Ese nombre ya está registrado por otra persona. Usa uno distinto.');
           return;
       }
    }
    
    if (profileForm.docId && profileForm.docId !== currentCustomer.docId) {
       const { data } = await supabase.from('ecommerce_customers').select('id').eq('doc_id', profileForm.docId.trim()).neq('id', currentCustomer.id).maybeSingle();
       if (data) {
           alert('Esa cédula/documento ya está registrada en otra cuenta.');
           return;
       }
    }

    await updateCustomerData(profileForm);
    setIsEditingProfile(false);
  };

  const confirmOrderReceived = async (orderId) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/telegram-bot`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`
        },
        body: JSON.stringify({ type: 'customer_confirm', orderId })
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(orders.map(order => {
          if (order.id === orderId) {
            return {
              ...order,
              customer_confirmed: 1,
              status: data.fullyDelivered ? 'Entregado' : order.status
            };
          }
          return order;
        }));
      }
    } catch(err) {
      console.error(err);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("La imagen es muy pesada. Máximo 2MB.");
        return;
      }
      setIsUploadingPhoto(true);
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `profiles/${currentCustomer.id}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('ecommerce').upload(fileName, file, { upsert: true });
        if (uploadError) throw uploadError;
        
        const { data } = supabase.storage.from('ecommerce').getPublicUrl(fileName);
        const publicUrl = data.publicUrl;

        await updateCustomerData({ profile_pic: publicUrl });
        setProfileForm(prev => ({ ...prev, profile_pic: publicUrl }));
        alert("¡Foto de perfil actualizada!");
      } catch (err) {
        console.error(err);
        alert("Error al subir la foto a Supabase Storage: " + (err.message || "Desconocido") + ". Verifica que el bucket 'ecommerce' exista.");
      } finally {
        setIsUploadingPhoto(false);
      }
    }
  };

  const removeFavorite = async (storeIdentifier) => {
    const favorites = Array.isArray(currentCustomer.favorites) 
      ? currentCustomer.favorites 
      : (typeof currentCustomer.favorites === 'string' ? JSON.parse(currentCustomer.favorites || '[]') : []);
    const updatedFavorites = favorites.filter(f => {
      const match = typeof f === 'string' ? f : (f.slug || f.id || f.postId);
      return match !== storeIdentifier;
    });
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
    if (!newAddressName || (!newAddress && !position)) {
      alert("Debes escribir una dirección o usar el botón de GPS para fijar tu ubicación.");
      return;
    }
    
    const addresses = Array.isArray(currentCustomer.addresses) ? currentCustomer.addresses : (
      typeof currentCustomer.addresses === 'string' ? JSON.parse(currentCustomer.addresses || '[]') : []
    );
    
    const finalAddressString = newAddressSector ? `${newAddressSector}, ${newAddress}` : newAddress;
    const finalAddressText = finalAddressString.trim() === '' ? 'Ubicación fijada por GPS' : finalAddressString;
    
    const newAddr = {
      id: Date.now().toString(),
      name: newAddressName,
      address: finalAddressText,
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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Error cerrando sesión en Supabase:', e);
    }
    localStorage.removeItem('ecommerce_current_customer');
    localStorage.removeItem('activeWorkspace');
    navigate('/');
  };
  
  const submitRating = () => {
    alert('¡Gracias por calificar tu orden!');
    setRatingModal({ isOpen: false, orderId: null, rating: 0, comment: '' });
  };

  if (!currentCustomer) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-500" size={36} />
      </div>
    );
  }

  const parsedFavorites = (Array.isArray(currentCustomer.favorites) 
    ? currentCustomer.favorites 
    : (typeof currentCustomer.favorites === 'string' ? (() => { try { return JSON.parse(currentCustomer.favorites); } catch(e){ return []; } })() : [])
  ).map((item, idx) => {
    if (typeof item === 'string') {
      return { id: item, slug: item, name: item, logo: null };
    }
    return {
      id: item.id || item.slug || `fav_${idx}`,
      slug: item.slug || item.store_slug || item.id || '',
      name: item.name || item.store_name || item.slug || 'Tienda',
      logo: item.logo || item.store_logo || null,
      cover: item.cover || item.image_url || null,
      postId: item.postId || null
    };
  }).filter(item => item.slug || item.id);
  
  const parsedWishlist = Array.isArray(currentCustomer.wishlist) 
    ? currentCustomer.wishlist 
    : (typeof currentCustomer.wishlist === 'string' ? (() => { try { return JSON.parse(currentCustomer.wishlist); } catch(e){ return []; } })() : []);

  const parsedAddresses = Array.isArray(currentCustomer.addresses) 
    ? currentCustomer.addresses 
    : (typeof currentCustomer.addresses === 'string' ? (() => { try { return JSON.parse(currentCustomer.addresses); } catch(e){ return []; } })() : []);

  const isAccountVerified = isEmailConfirmed || 
                            authProvider === 'google' || 
                            currentCustomer?.password === 'GOOGLE_AUTH' || 
                            currentCustomer?.password === 'oauth-google' || 
                            currentCustomer?.auth_provider === 'google' || 
                            (currentCustomer?.profile_pic && currentCustomer.profile_pic.includes('googleusercontent.com')) ||
                            (currentCustomer?.status === 'Activo' && (currentCustomer?.is_verified || currentCustomer?.password === 'GOOGLE_AUTH' || currentCustomer?.password === 'oauth-google'));

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-amber-500/30 relative overflow-x-hidden">
      
      {/* Luces de Fondo Sutiles */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-amber-500/5 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-200/20 blur-[100px] rounded-full -translate-x-1/4 translate-y-1/3"></div>
      </div>

      {/* Navbar Premium Claro */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-2xl border-b border-slate-200/80 shadow-xs">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center text-slate-950 shadow-sm group-hover:shadow-md transition-all">
              <ShoppingBag size={20} className="stroke-[2.5]" />
            </div>
            <span className="font-bold text-xl tracking-[0.2em] text-slate-900">AXON<span className="text-amber-500 font-light">MARKET</span></span>
          </div>
          
          <div className="flex items-center">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase text-slate-600 hover:text-amber-600 bg-slate-100/90 hover:bg-slate-200/90 px-3.5 py-2 rounded-full transition-colors"
              title="Volver a la tienda"
            >
              <ArrowLeft size={16} /> 
              <span>Volver</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Header Claro */}
      <div className="bg-white px-6 pt-10 pb-8 relative overflow-hidden flex flex-col items-center border-b border-slate-200/80 shadow-xs">
         <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent"></div>
         </div>
         
         <div className="w-full max-w-5xl mx-auto flex flex-col items-center relative z-10">
           <h2 className="text-slate-900 font-extrabold text-xl mb-4 tracking-tight">{currentCustomer.name}</h2>

           <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 rounded-full flex items-center justify-center text-4xl font-black shadow-md ring-4 ring-slate-100 mb-3 relative group overflow-hidden">
             {isUploadingPhoto ? (
               <Loader2 size={24} className="animate-spin text-white z-30" />
             ) : currentCustomer.profile_pic ? (
               <img src={currentCustomer.profile_pic} alt="Perfil" className="w-full h-full object-cover" />
             ) : (
               <span>{currentCustomer.name?.charAt(0)?.toUpperCase() || 'U'}</span>
             )}
             <label className="absolute inset-0 bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity z-20">
               <span className="text-white text-xs font-bold text-center px-1">{isUploadingPhoto ? '...' : 'Editar'}</span>
               <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isUploadingPhoto} />
             </label>
           </div>
           
           <div className="flex items-center gap-2 mb-2 cursor-pointer hover:bg-slate-100 px-3 py-1 rounded-full transition-colors" onClick={() => { setActiveTab('datos'); setIsEditingProfile(true); }}>
             <h1 className="text-base font-bold text-slate-700 tracking-tight">@{currentCustomer.email?.split('@')[0] || 'usuario'}</h1>
             <Edit3 size={14} className="text-slate-400" />
           </div>
           <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">Cliente Frecuente</span>

            {/* Estado de Cuenta / Verificación */}
            {isAccountVerified ? (
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs">
                <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                <span>Cuenta Activa / Verificada</span>
              </div>
            ) : (
              <div className="mt-3 flex flex-col items-center gap-2 max-w-sm w-full">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-xs">
                  <MailWarning size={14} className="text-amber-600 shrink-0" />
                  <span>Cuenta Inactiva (No Verificada)</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium text-center">
                  Revisa tu bandeja de entrada o reenvía el correo para activar tu cuenta.
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <button 
                    onClick={handleResendConfirmation} 
                    disabled={isResending}
                    className="text-xs font-bold text-amber-800 bg-white border border-amber-300 hover:bg-amber-100 px-3.5 py-1.5 rounded-xl transition-all shadow-xs disabled:opacity-50"
                  >
                    {isResending ? 'Enviando...' : 'Reenviar Correo'}
                  </button>
                  <button 
                    onClick={handleRefreshAuthStatus} 
                    disabled={isRefreshingAuth}
                    className="text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                    title="Actualizar estado si ya confirmaste"
                  >
                    <RefreshCw size={12} className={isRefreshingAuth ? "animate-spin" : ""} />
                    <span>{isRefreshingAuth ? 'Comprobando...' : 'Comprobar Estado'}</span>
                  </button>
                </div>
              </div>
            )}
         </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
        
        {/* Mobile/Desktop Menu List Claro */}
        <div className={`${activeTab === 'menu' ? 'block' : 'hidden'} md:block md:col-span-1 space-y-4`}>
          {/* Group 1 */}
          <div className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs">
            <button 
              className={`w-full flex items-center justify-between px-5 py-4 transition-colors ${activeTab === 'niveles' ? 'bg-amber-50/70 border-l-4 border-amber-500 text-amber-900 font-bold' : 'text-slate-700 hover:bg-slate-50 border-l-4 border-transparent'}`} 
              onClick={() => {
                setShowUnderConstruction(true);
                setActiveTab('niveles');
              }}
            >
               <div className="flex items-center gap-4">
                  <Award size={20} className={activeTab === 'niveles' ? 'text-amber-600' : 'text-slate-400'} />
                  <span className="text-[15px] font-medium">Niveles y logros</span>
               </div>
               <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-200">En construcción</span>
                  <ChevronRight size={18} className="text-slate-300" />
               </div>
            </button>
          </div>
          
          {/* Group 2 */}
          <div className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs">
            <button className={`w-full flex items-center justify-between px-5 py-4 transition-colors border-b border-slate-100 ${activeTab === 'pedidos' ? 'bg-amber-50/70 border-l-4 border-amber-500 text-amber-900 font-bold' : 'text-slate-700 hover:bg-slate-50 border-l-4 border-transparent'}`} onClick={() => setActiveTab('pedidos')}>
               <div className="flex items-center gap-4">
                  <ShoppingBag size={20} className={activeTab === 'pedidos' ? 'text-amber-600' : 'text-slate-400'} />
                  <span className="text-[15px] font-medium">Mis pedidos</span>
               </div>
               <div className="flex items-center gap-3">
                  <span className="bg-slate-100 text-xs font-bold px-2 py-0.5 rounded-full text-slate-600">{orders.length}</span>
                  <ChevronRight size={18} className="text-slate-300" />
               </div>
            </button>
            <button className={`w-full flex items-center justify-between px-5 py-4 transition-colors ${activeTab === 'direcciones' ? 'bg-amber-50/70 border-l-4 border-amber-500 text-amber-900 font-bold' : 'text-slate-700 hover:bg-slate-50 border-l-4 border-transparent'}`} onClick={() => setActiveTab('direcciones')}>
               <div className="flex items-center gap-4">
                  <MapPin size={20} className={activeTab === 'direcciones' ? 'text-amber-600' : 'text-slate-400'} />
                  <span className="text-[15px] font-medium">Mis direcciones</span>
               </div>
               <ChevronRight size={18} className="text-slate-300" />
            </button>
          </div>

          {/* Group 3 */}
          <div className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs">
            <button className={`w-full flex items-center justify-between px-5 py-4 transition-colors border-b border-slate-100 ${activeTab === 'calificaciones' ? 'bg-amber-50/70 border-l-4 border-amber-500 text-amber-900 font-bold' : 'text-slate-700 hover:bg-slate-50 border-l-4 border-transparent'}`} onClick={() => setActiveTab('calificaciones')}>
               <div className="flex items-center gap-4">
                  <Star size={20} className={activeTab === 'calificaciones' ? 'text-amber-600' : 'text-slate-400'} />
                  <span className="text-[15px] font-medium">Mis calificaciones</span>
               </div>
               <div className="flex items-center gap-3">
                  <span className="bg-slate-100 text-xs font-bold px-2 py-0.5 rounded-full text-slate-600">0</span>
                  <ChevronRight size={18} className="text-slate-300" />
               </div>
            </button>
            <button className={`w-full flex items-center justify-between px-5 py-4 transition-colors border-b border-slate-100 ${activeTab === 'recomendaciones' ? 'bg-amber-50/70 border-l-4 border-amber-500 text-amber-900 font-bold' : 'text-slate-700 hover:bg-slate-50 border-l-4 border-transparent'}`} onClick={() => setActiveTab('recomendaciones')}>
               <div className="flex items-center gap-4">
                  <Heart size={20} className={activeTab === 'recomendaciones' ? 'text-amber-600' : 'text-slate-400'} />
                  <span className="text-[15px] font-medium">Recomendaciones</span>
               </div>
               <div className="flex items-center gap-3">
                  <span className="bg-slate-100 text-xs font-bold px-2 py-0.5 rounded-full text-slate-600">0</span>
                  <ChevronRight size={18} className="text-slate-300" />
               </div>
            </button>
            <button className={`w-full flex items-center justify-between px-5 py-4 transition-colors border-b border-slate-100 ${activeTab === 'visitas' ? 'bg-amber-50/70 border-l-4 border-amber-500 text-amber-900 font-bold' : 'text-slate-700 hover:bg-slate-50 border-l-4 border-transparent'}`} onClick={() => setActiveTab('visitas')}>
               <div className="flex items-center gap-4">
                  <Store size={20} className={activeTab === 'visitas' ? 'text-amber-600' : 'text-slate-400'} />
                  <span className="text-[15px] font-medium">Visitas</span>
               </div>
               <div className="flex items-center gap-3">
                  <span className="bg-slate-100 text-xs font-bold px-2 py-0.5 rounded-full text-slate-600">0</span>
                  <ChevronRight size={18} className="text-slate-300" />
               </div>
            </button>
            <button className={`w-full flex items-center justify-between px-5 py-4 transition-colors ${(activeTab === 'datos' || activeTab === 'menu') ? 'bg-amber-50/70 border-l-4 border-amber-500 text-amber-900 font-bold' : 'text-slate-700 hover:bg-slate-50 border-l-4 border-transparent'}`} onClick={() => setActiveTab('datos')}>
               <div className="flex items-center gap-4">
                  <User size={20} className={(activeTab === 'datos' || activeTab === 'menu') ? 'text-amber-600' : 'text-slate-400'} />
                  <span className="text-[15px] font-medium">Ajustes de Perfil</span>
               </div>
               <ChevronRight size={18} className="text-slate-300" />
            </button>
          </div>

          {/* Group 4 */}
          <div className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs mb-4">
            <button className={`w-full flex items-center justify-between px-5 py-4 transition-colors border-b border-slate-100 ${activeTab === 'wishlist' ? 'bg-amber-50/70 border-l-4 border-amber-500 text-amber-900 font-bold' : 'text-slate-700 hover:bg-slate-50 border-l-4 border-transparent'}`} onClick={() => setActiveTab('wishlist')}>
               <div className="flex items-center gap-4">
                  <Bookmark size={20} className={activeTab === 'wishlist' ? 'text-amber-600' : 'text-slate-400'} />
                  <span className="text-[15px] font-medium">Guardados</span>
               </div>
               <ChevronRight size={18} className="text-slate-300" />
            </button>
            <button className={`w-full flex items-center justify-between px-5 py-4 transition-colors ${activeTab === 'favoritas' ? 'bg-amber-50/70 border-l-4 border-amber-500 text-amber-900 font-bold' : 'text-slate-700 hover:bg-slate-50 border-l-4 border-transparent'}`} onClick={() => setActiveTab('favoritas')}>
               <div className="flex items-center gap-4">
                  <UserPlus size={20} className={activeTab === 'favoritas' ? 'text-amber-600' : 'text-slate-400'} />
                  <span className="text-[15px] font-medium">Seguidos</span>
               </div>
               <ChevronRight size={18} className="text-slate-300" />
            </button>
          </div>

          {/* Botón Apartado Cerrar Sesión */}
          <div className="bg-white rounded-2xl overflow-hidden border border-red-200/80 shadow-xs hover:border-red-300 transition-all mb-8">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-between px-5 py-4 bg-red-50/30 hover:bg-red-50 transition-colors text-red-600 font-bold group"
            >
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <LogOut size={18} />
                </div>
                <div className="text-left">
                  <span className="text-[15px] block leading-tight font-bold">Cerrar Sesión</span>
                  <span className="text-[11px] text-red-400 font-medium block">Salir de la cuenta en este dispositivo</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-red-300 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Panel Derecho: Contenido */}
        <div className={`${activeTab === 'menu' ? 'hidden md:block' : 'block'} md:col-span-3`}>
          {/* Mobile Back Button */}
          <div className="md:hidden mb-6">
             <button onClick={() => setActiveTab('menu')} className="flex items-center gap-2 text-slate-700 hover:text-slate-900 transition-colors bg-white px-4 py-2 rounded-full w-max border border-slate-200 shadow-xs">
               <ArrowLeft size={18} /> <span className="font-bold text-sm">Volver al menú</span>
             </button>
          </div>
          <AnimatePresence mode="wait">
            
            {/* TABS: DATOS */}
            {(activeTab === 'datos' || activeTab === 'menu') && (
              <motion.div 
                key="datos"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-amber-500/10 transition-colors"></div>
                <div className="relative z-10 flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-slate-900">Información Personal</h2>
                  {!isEditingProfile && (
                    <button onClick={() => setIsEditingProfile(true)} className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200/80 px-4 py-2 rounded-xl text-sm font-bold hover:bg-amber-100 transition-colors">
                      <Edit3 size={16} /> Editar
                    </button>
                  )}
                </div>

                {!isEditingProfile ? (
                  <div className="space-y-8 relative z-10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-2"><User size={14} className="text-amber-500"/> Nombre Completo</label>
                        <p className="text-slate-900 font-semibold text-lg">{currentCustomer.name}</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-2"><FileText size={14} className="text-amber-500"/> Documento (CI/RUT)</label>
                        <p className="text-slate-900 font-semibold text-lg">{currentCustomer.docId || '-'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block flex items-center gap-2"><Phone size={14} className="text-amber-500"/> Teléfono</label>
                        <p className="text-slate-900 font-semibold text-lg">{currentCustomer.phone || '-'}</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                          <span className="flex items-center gap-2"><Lock size={14} className="text-amber-500"/> Contraseña</span>
                          <button onClick={() => setShowPassword(!showPassword)} className="text-amber-600 hover:text-amber-700 text-xs font-semibold">
                            {showPassword ? 'Ocultar' : 'Mostrar'}
                          </button>
                        </label>
                        <p className="text-slate-900 font-semibold text-lg">
                          {showPassword ? (currentCustomer.password || 'No definida') : '••••••••'}
                        </p>
                      </div>
                    </div>

                    
                    <div className="border-t border-slate-200 pt-6 mb-6">
                      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Lock size={18} className="text-amber-500" /> Cambiar Contraseña</h3>
                      <form onSubmit={handleChangePassword} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Contraseña Actual</label>
                            <div className="relative">
                              <input type={showPassword ? "text" : "password"} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-slate-900 focus:outline-none focus:border-amber-500 transition-colors shadow-xs" />
                              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500 transition-colors">
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Nueva Contraseña</label>
                            <div className="relative">
                              <input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-slate-900 focus:outline-none focus:border-amber-500 transition-colors shadow-xs" />
                              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500 transition-colors">
                                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Confirmar Nueva</label>
                            <div className="relative">
                              <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-slate-900 focus:outline-none focus:border-amber-500 transition-colors shadow-xs" />
                              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500 transition-colors">
                                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end pt-2">
                          <button type="submit" disabled={isChangingPassword || !newPassword} className="px-6 py-2.5 bg-amber-500 text-slate-950 rounded-xl font-bold hover:bg-amber-400 disabled:opacity-50 transition-colors shadow-xs">
                            {isChangingPassword ? 'Cambiando...' : 'Actualizar Contraseña'}
                          </button>
                        </div>
                      </form>
                      {passwordMsg && <p className={`mt-3 text-sm font-medium ${passwordMsg.includes('Error') ? 'text-red-600' : 'text-emerald-600'}`}>{passwordMsg}</p>}
                    </div>

                    <div className="border-t border-slate-200 pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Lock size={18} className="text-emerald-600" />
                          <h3 className="text-lg font-bold text-slate-900">Cuentas de Pago Móvil Autorizadas</h3>
                        </div>
                        <button onClick={() => setIsAddingPayment(true)} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold border border-emerald-200 hover:bg-emerald-100 transition-colors">
                          <Plus size={16} /> Añadir
                        </button>
                      </div>
                      
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-6">
                        <p className="text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2">Seguridad Antifraude Activada</p>
                        <p className="text-emerald-900/90 text-sm leading-relaxed">Los comercios de AxonMarket <strong>solo aceptarán</strong> pagos provenientes de estas cuentas registradas, las cuales están ancladas obligatoriamente a tu cédula. Pagos de terceros no registrados serán retenidos por sospecha de triangulación/fraude.</p>
                      </div>
                      
                      <div className="space-y-4">
                        {(Array.isArray(paymentProfiles) ? paymentProfiles : []).map((p, idx) => (
                          <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50 p-6 rounded-2xl border border-slate-200 relative group">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 w-full">
                              <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Banco</label>
                                <p className="text-slate-900 font-semibold">{p?.bank || '-'}</p>
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Teléfono</label>
                                <p className="text-slate-900 font-semibold">{p?.phone || '-'}</p>
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Cédula</label>
                                <p className="text-slate-900 font-semibold">{p?.cedula || '-'}</p>
                              </div>
                              <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Titular</label>
                                <p className="text-slate-900 font-semibold">{p?.titular || '-'}</p>
                              </div>
                            </div>
                            <button onClick={() => handleDeletePaymentProfile(idx)} className="mt-4 sm:mt-0 p-2 text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                        {(Array.isArray(paymentProfiles) ? paymentProfiles.length : 0) === 0 && (
                          <p className="text-slate-500 text-sm text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">No tienes cuentas de Pago Móvil autorizadas. Añade una para poder realizar compras.</p>
                        )}
                      </div>
                    </div>

                    {/* Apartado para cerrar sesión en Ajustes de Perfil */}
                    <div className="border-t border-slate-200 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Cerrar Sesión</h4>
                        <p className="text-xs text-slate-500">Desconectar tu cuenta en este navegador</p>
                      </div>
                      <button 
                        onClick={handleLogout}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-200 hover:bg-red-100 transition-colors"
                      >
                        <LogOut size={15} /> Cerrar Sesión
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateProfile} className="space-y-6 relative z-10">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Nombre Completo</label>
                      <input type="text" required value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-xs" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Documento de Identidad General</label>
                        <input type="text" value={profileForm.docId} onChange={e => setProfileForm({...profileForm, docId: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-xs" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Teléfono General</label>
                        <input type="tel" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-xs" />
                      </div>
                    </div>
                    
                    <div className="pt-6 flex gap-4 border-t border-slate-200 mt-6">
                      <button type="button" onClick={() => setIsEditingProfile(false)} className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancelar</button>
                      <button type="submit" className="px-8 py-3 bg-amber-500 text-slate-950 rounded-xl font-bold hover:bg-amber-400 transition-colors shadow-xs">Guardar Cambios</button>
                    </div>
                  </form>
                )}
              </motion.div>
            )}

            {/* TABS: NIVELES Y LOGROS - EN CONSTRUCCIÓN */}
            {activeTab === 'niveles' && (
              <motion.div key="niveles" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-xs text-center relative overflow-hidden">
                  <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-amber-200/80 shadow-sm">
                    <Hammer size={36} className="stroke-[2.5]" />
                  </div>
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-black uppercase tracking-wider mb-4">
                    <span>🚧 Sección en Construcción</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3">Niveles y Logros</h2>
                  <p className="text-slate-600 text-sm sm:text-base max-w-md mx-auto mb-8 leading-relaxed">
                    Estamos construyendo un sistema de recompensas, niveles y beneficios exclusivos para premiar tu lealtad en AxonMarket. ¡Estará disponible muy pronto!
                  </p>
                  <button 
                    onClick={() => setActiveTab('menu')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
                  >
                    <ArrowLeft size={16} /> Volver al menú
                  </button>
                </div>
              </motion.div>
            )}

            {/* TABS: CALIFICACIONES */}
            {activeTab === 'calificaciones' && (
              <motion.div key="calificaciones" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 mb-1">Mis Calificaciones</h2>
                      <p className="text-slate-500 text-sm">Reseñas y opiniones que has dejado a los comercios.</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-12 border border-dashed border-slate-200 text-center">
                    <Star size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-900">Aún no has dejado calificaciones</h3>
                    <p className="text-slate-500 text-sm mt-2">Cuando completes un pedido, podrás calificar la calidad de los productos y la atención del comercio.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TABS: RECOMENDACIONES */}
            {activeTab === 'recomendaciones' && (
              <motion.div key="recomendaciones" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 mb-1">Recomendaciones para ti</h2>
                      <p className="text-slate-500 text-sm">Productos y tiendas sugeridos según tus preferencias y ubicación.</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-12 border border-dashed border-slate-200 text-center">
                    <Heart size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-900">Personalizando recomendaciones...</h3>
                    <p className="text-slate-500 text-sm mt-2">Visita tiendas y guarda productos para recibir recomendaciones personalizadas.</p>
                    <button onClick={() => navigate('/')} className="mt-6 px-6 py-2.5 bg-amber-500 text-slate-950 rounded-xl font-bold hover:bg-amber-400 transition-all shadow-xs">
                      Explorar Marketplace
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TABS: VISITAS */}
            {activeTab === 'visitas' && (
              <motion.div key="visitas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 mb-1">Historial de Visitas</h2>
                      <p className="text-slate-500 text-sm">Comercios y tiendas que has visitado recientemente.</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-12 border border-dashed border-slate-200 text-center">
                    <Store size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-900">Historial limpio</h3>
                    <p className="text-slate-500 text-sm mt-2">Tus visitas recientes a tiendas del ecosistema se reflejarán aquí para un acceso directo.</p>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* TABS: DIRECCIONES */}
            {activeTab === 'direcciones' && (
              <motion.div key="direcciones" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Libreta de Direcciones</h2>
                    <p className="text-slate-500 text-sm">Gestiona tus direcciones de entrega.</p>
                  </div>
                  {!isAddingAddress && (
                     <button onClick={() => setIsAddingAddress(true)} className="flex items-center gap-2 bg-amber-500 text-slate-950 px-4 py-2 rounded-xl text-sm font-bold hover:bg-amber-400 transition-all shadow-xs">
                       <Plus size={16} /> Nueva Dirección
                     </button>
                  )}
                </div>

                {isAddingAddress && (
                  <form onSubmit={handleAddAddress} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs mb-6 space-y-6">
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3 text-blue-900 text-sm">
                      <Info size={20} className="shrink-0 mt-0.5 text-blue-600" />
                      <div>
                        <strong>Ubicación Exacta:</strong> Te recomendamos fuertemente usar tu <strong>teléfono móvil</strong> y presionar el botón de GPS para capturar tu ubicación exacta. Esto asegurará que los repartidores lleguen sin problemas.
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Nombre (Ej: Casa, Oficina)</label>
                          <input type="text" required value={newAddressName} onChange={e => setNewAddressName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-xs" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Urbanización / Zona</label>
                            <select value={newAddressSector} onChange={e => setNewAddressSector(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-xs appearance-none">
                              <option value="" className="text-slate-900 bg-white">Seleccione sector...</option>
                              <option value="Corinsa" className="text-slate-900 bg-white">Corinsa (Urbanización Corinsa)</option>
                              <option value="La Segundera / Rafael Urdaneta" className="text-slate-900 bg-white">La Segundera / Rafael Urdaneta</option>
                              <option value="Prados de la Encrucijada" className="text-slate-900 bg-white">Prados de la Encrucijada</option>
                              <option value="Prados de Aragua" className="text-slate-900 bg-white">Prados de Aragua</option>
                              <option value="Ciudad Jardín" className="text-slate-900 bg-white">Ciudad Jardín</option>
                              <option value="Suramericana" className="text-slate-900 bg-white">Suramericana</option>
                              <option value="Fundacagua" className="text-slate-900 bg-white">Fundacagua (Urb. La Fundación)</option>
                              <option value="Francisco de Miranda" className="text-slate-900 bg-white">Francisco de Miranda</option>
                              <option value="Santa Rosalía" className="text-slate-900 bg-white">Santa Rosalía</option>
                              <option value="Rómulo Gallegos" className="text-slate-900 bg-white">Rómulo Gallegos</option>
                              <option value="Blandín" className="text-slate-900 bg-white">Blandín</option>
                              <option value="El Corozal" className="text-slate-900 bg-white">El Corozal</option>
                              <option value="Residencias Codazzi" className="text-slate-900 bg-white">Residencias Codazzi</option>
                              <option value="La Exclusiva" className="text-slate-900 bg-white">La Exclusiva</option>
                              <option value="Tamborito" className="text-slate-900 bg-white">Tamborito</option>
                              <option value="La Carpiera" className="text-slate-900 bg-white">La Carpiera</option>
                              <option value="Huete" className="text-slate-900 bg-white">Huete (Brisas de Aragua)</option>
                              <option value="Alí Primera" className="text-slate-900 bg-white">Alí Primera</option>
                              <option value="Las Vegas" className="text-slate-900 bg-white">Las Vegas</option>
                              <option value="Guillén" className="text-slate-900 bg-white">Guillén</option>
                              <option value="Bella Vista" className="text-slate-900 bg-white">Bella Vista</option>
                              <option value="El Toco" className="text-slate-900 bg-white">El Toco</option>
                              <option value="La Comuna de Chávez" className="text-slate-900 bg-white">La Comuna de Chávez</option>
                              <option value="Casco Central" className="text-slate-900 bg-white">Casco Central (Centro de Cagua)</option>
                              <option value="Barrancón" className="text-slate-900 bg-white">Barrancón</option>
                              <option value="Los Meregotos" className="text-slate-900 bg-white">Los Meregotos</option>
                              <option value="Campo Alegre" className="text-slate-900 bg-white">Campo Alegre</option>
                              <option value="Zona Industrial Soco" className="text-slate-900 bg-white">Zona Industrial Soco</option>
                              <option value="Zona Industrial Corinsa" className="text-slate-900 bg-white">Zona Industrial Corinsa</option>
                              <option value="Zona Industrial Santa Rosalía" className="text-slate-900 bg-white">Zona Industrial Santa Rosalía</option>
                              <option value="Zona Industrial Cagua" className="text-slate-900 bg-white">Zona Industrial Cagua</option>
                              <option value="Otra Zona" className="text-slate-900 bg-white">Otra Zona (Cagua)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Calle / Casa / Piso <span className="text-slate-400 text-xs font-normal">(Opcional si usas GPS)</span></label>
                            <input type="text" value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="Ej: Calle 4, Casa 12" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-xs" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3 items-end">
                          <div className="flex-1 w-full space-y-2">
                            <label className="text-sm font-bold text-slate-700 mb-2">Punto GPS (Opcional)</label>
                            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between shadow-xs h-[52px]">
                               {position ? (
                                 <span className="font-mono text-sm text-amber-600 font-bold">
                                   {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
                                 </span>
                               ) : (
                                 <span className="text-sm text-slate-400 italic">No fijado en el mapa</span>
                               )}
                            </div>
                          </div>
                          <button 
                            type="button"
                            onClick={getLocationFromGPS}
                            disabled={gpsLoading}
                            className="w-full sm:w-auto px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs h-[52px]"
                          >
                            {gpsLoading ? <Loader2 size={18} className="animate-spin" /> : <Navigation size={18} />}
                            Usar GPS
                          </button>
                        </div>
                        {gpsError && <p className="text-red-500 text-xs font-bold">{gpsError}</p>}
                        
                        <div className="h-[200px] w-full rounded-2xl overflow-hidden border border-slate-200 relative z-0">
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

                    <div className="flex gap-4 pt-4 border-t border-slate-200">
                      <button type="submit" className="px-6 py-2.5 bg-amber-500 text-slate-950 rounded-xl font-bold text-sm hover:bg-amber-400 shadow-xs">Guardar Dirección</button>
                      <button type="button" onClick={() => { setIsAddingAddress(false); setPosition(null); setGpsError(''); }} className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200">Cancelar</button>
                    </div>
                  </form>
                )}

                {parsedAddresses.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 border border-slate-200 border-dashed text-center">
                    <MapPin size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-900">No tienes direcciones</h3>
                    <p className="text-slate-500 text-sm mt-2">Añade una dirección para facilitar tu próxima compra.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {parsedAddresses.map(addr => (
                      <div key={addr.id} className={`bg-white rounded-2xl p-5 border ${addr.isDefault ? 'border-amber-400 shadow-xs' : 'border-slate-200/80 shadow-xs'} relative`}>
                        {addr.isDefault && (
                          <span className="absolute top-4 right-4 bg-amber-50 text-amber-700 text-[10px] font-bold uppercase px-2 py-1 rounded-md border border-amber-200">Por defecto</span>
                        )}
                        <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-2"><MapPin size={16} className={addr.isDefault ? "text-amber-500" : "text-slate-400"} /> {addr.name}</h4>
                        <p className="text-slate-600 text-sm mb-4 leading-relaxed pr-12">{addr.address}</p>
                        {(addr.lat && addr.lng) && (
                           <div className="mb-4 inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase rounded-md">
                             <Navigation size={12} />
                             Ubicación GPS Guardada
                           </div>
                        )}
                        
                        <div className="flex items-center gap-3">
                          {!addr.isDefault && (
                            <button onClick={() => setDefaultAddress(addr.id)} className="text-amber-600 text-sm font-bold hover:text-amber-700 transition-colors">Hacer principal</button>
                          )}
                          <button onClick={() => removeAddress(addr.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg ml-auto transition-colors"><Trash2 size={16}/></button>
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
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Historial de Pedidos</h2>
                    <p className="text-slate-500 text-sm">Revisa el estado de tus compras anteriores y deja reseñas.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estado</label>
                      <select 
                        value={orderFilterStatus}
                        onChange={(e) => setOrderFilterStatus(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-amber-500 transition-all shadow-xs"
                      >
                        <option value="Todos">Todos</option>
                        <option value="Activos">En Proceso</option>
                        <option value="Completado">Completados</option>
                        <option value="Cancelado">Cancelados</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fecha</label>
                      <input 
                        type="date"
                        value={orderFilterDate}
                        onChange={(e) => setOrderFilterDate(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-amber-500 transition-all shadow-xs"
                      >
                      </input>
                    </div>
                    {orderFilterDate && (
                      <button 
                        onClick={() => setOrderFilterDate('')}
                        className="self-end h-[38px] px-3 bg-red-50 text-red-600 border border-red-200 rounded-xl flex items-center justify-center hover:bg-red-100 transition-all"
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
                      <div className="bg-white rounded-3xl p-12 border border-slate-200 border-dashed text-center">
                        <Package size={48} className="mx-auto text-slate-300 mb-4" />
                        <h3 className="text-lg font-bold text-slate-900">{orders.length > 0 ? "No hay pedidos con estos filtros" : "No tienes pedidos"}</h3>
                        <p className="text-slate-500 text-sm mt-2">{orders.length > 0 ? "Prueba cambiando el estado o la fecha." : "Tus futuras compras aparecerán aquí."}</p>
                        {orders.length === 0 && <button onClick={() => navigate('/')} className="mt-6 px-6 py-2.5 bg-amber-500 text-slate-950 rounded-xl font-bold shadow-xs hover:bg-amber-400 transition-all">Explorar Marketplace</button>}
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {filteredOrders.map(order => (
                      <div key={order.id} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-xs font-bold font-mono border border-slate-200">{order.id}</span>
                            <span className="text-sm text-slate-500 flex items-center gap-1"><Clock size={14}/> {order.date}</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                              order.status === 'Completado' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {order.status === 'Completado' && <CheckCircle size={14} />} {order.status}
                            </span>
                          </div>
                          
                          <div className="space-y-3">
                            {Array.isArray(order.items) && order.items.map(item => (
                              <div key={item.id} className="flex justify-between text-sm">
                                <span className="font-medium text-slate-800">{item.quantity}x {item.name}</span>
                                <span className="text-slate-500 font-semibold">${(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>

                          {order.paymentStatus === 'review' && (
                            <div className="mt-6 border border-amber-300 bg-amber-50 rounded-xl p-4 flex gap-4 items-start">
                              <AlertCircle size={24} className="text-amber-600 shrink-0" />
                              <div>
                                <h4 className="font-bold text-amber-900 mb-1">Pago En Revisión por Tercero</h4>
                                <p className="text-sm text-amber-800/80 mb-3">El comercio ha detectado que el pago proviene de una cuenta no autorizada en tu perfil. Su orden está congelada.</p>
                                <div className="text-xs text-amber-900 font-medium p-3 bg-amber-100/60 rounded-lg">
                                  <strong>ACCIÓN REQUERIDA:</strong> Tienes 24 horas para comunicarte directamente con el comercio y proveer <strong>pruebas verificables</strong> (Cédula del titular, parentesco) de que el pago es legítimo.
                                </div>
                                <button onClick={() => openChat(order)} className="mt-4 bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors shadow-xs">
                                  <MessageSquare size={16} /> Contactar Soporte / Enviar Pruebas
                                </button>
                              </div>
                            </div>
                          )}
                          {order.paymentStatus === 'fraud' && (
                            <div className="mt-6 border border-red-300 bg-red-50 rounded-xl p-4 flex gap-4 items-start">
                              <AlertCircle size={24} className="text-red-600 shrink-0" />
                              <div>
                                <h4 className="font-bold text-red-900 mb-1">Orden Cancelada - Fraude Reportado</h4>
                                <p className="text-sm text-red-800/80 mb-3">No se pudo verificar la procedencia del pago. Se ha emitido un reporte de fraude a la plataforma y no hay derecho a reembolso.</p>
                              </div>
                            </div>
                          )}
                          
                          {/* Seguridad: PIN del Delivery */}
                          <div className="mt-6 border-t border-slate-100 pt-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Seguridad de Entrega</h4>
                            {order.deliveryPin ? (
                              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                                <div>
                                  <span className="block text-[10px] font-bold text-emerald-800 mb-1">PIN SECRETO DE ENTREGA</span>
                                  <span className="text-3xl font-black text-emerald-600 tracking-[0.3em] font-mono">{order.deliveryPin}</span>
                                </div>
                                <div className="text-right">
                                  <Lock size={24} className="text-emerald-600 inline-block mb-1" />
                                  <p className="text-xs text-emerald-800 max-w-[120px] leading-tight font-medium">Dicta este código al repartidor al recibir tu pedido.</p>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-center gap-2 text-slate-500 text-xs font-medium text-center">
                                <Clock size={14} className="shrink-0" />
                                El PIN de seguridad se generará cuando el comercio valide tu pago.
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="w-full md:w-64 bg-slate-50 p-5 rounded-2xl flex flex-col justify-between shrink-0 border border-slate-200">
                          <div>
                            <div className="text-xs text-slate-500 font-bold uppercase mb-1">Total del Pedido</div>
                            <div className="text-2xl font-black text-slate-900">${order.total.toFixed(2)}</div>
                          </div>
                          <div className="space-y-2 mt-4">
                            <button className="w-full py-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl text-sm font-bold hover:border-amber-500 hover:text-amber-600 transition-colors shadow-xs flex items-center justify-center gap-2">
                              Ver Tienda <ChevronRight size={16} />
                            </button>
                            {order.status === 'Enviado' && (
                              order.customer_confirmed ? (
                                <div className="w-full py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200 flex items-center justify-center gap-2 text-center px-2">
                                  <Clock size={16} /> Esperando al repartidor
                                </div>
                              ) : (
                                <button 
                                  onClick={() => confirmOrderReceived(order.id)}
                                  className="w-full py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-xs hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                                >
                                  <CheckCircle size={16} /> Confirmar Recibido
                                </button>
                              )
                            )}
                            {(order.status === 'Completado' || order.status === 'Entregado') && (
                              <button 
                                onClick={() => setRatingModal({ isOpen: true, orderId: order.id, rating: 0, comment: '' })}
                                className="w-full py-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm font-bold hover:bg-amber-100 transition-colors flex items-center justify-center gap-2"
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
                <h2 className="text-2xl font-black text-slate-900 mb-2">Productos Guardados</h2>
                <p className="text-slate-500 text-sm mb-6">Tus artículos favoritos listos para cuando quieras comprar.</p>
                
                {parsedWishlist.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 border border-slate-200 border-dashed text-center">
                    <Package size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-900">Tu lista está vacía</h3>
                    <p className="text-slate-500 text-sm mt-2">Guarda productos haciendo clic en el corazón mientras navegas por las tiendas.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {parsedWishlist.map(product => (
                      <div key={product.productId} className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xs flex flex-col group hover:border-amber-400 hover:shadow-md transition-all">
                        <div className="h-40 w-full relative bg-slate-100">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.productName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400"><Package size={40}/></div>
                          )}
                          <button 
                            onClick={() => removeWishlist(product.productId)}
                            className="absolute top-3 right-3 w-8 h-8 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-white transition-all shadow-sm"
                          >
                            <Heart size={16} fill="currentColor" />
                          </button>
                        </div>
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="text-xs text-amber-600 font-bold mb-1 uppercase tracking-wide truncate">{product.storeName}</div>
                            <h4 className="font-bold text-slate-900 leading-tight mb-2 line-clamp-2">{product.productName}</h4>
                          </div>
                          <div className="flex items-center justify-between mt-4">
                            <span className="font-black text-slate-900 text-lg">${product.productPrice?.toFixed(2)}</span>
                            <button 
                              onClick={() => navigate(`/${product.storeSlug}`)}
                              className="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl text-sm font-bold shadow-xs hover:bg-amber-400 transition-all"
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

            {/* TABS: FAVORITAS Y GUARDADOS */}
            {activeTab === 'favoritas' && (
              <motion.div key="favoritas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 mb-1">Favoritos y Guardados</h2>
                    <p className="text-slate-500 text-sm">Acceso directo a tus tiendas seguidas y publicaciones guardadas.</p>
                  </div>

                  {/* Selector de Sub-pestañas */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-2xl w-max">
                    <button
                      onClick={() => setFavSubTab('tiendas')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        favSubTab === 'tiendas' 
                          ? 'bg-white text-slate-900 shadow-xs' 
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Tiendas ({parsedFavorites.length})
                    </button>
                    <button
                      onClick={() => setFavSubTab('publicaciones')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        favSubTab === 'publicaciones' 
                          ? 'bg-white text-slate-900 shadow-xs' 
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Publicaciones ({savedPosts.length})
                    </button>
                  </div>
                </div>
                
                {favSubTab === 'tiendas' ? (
                  parsedFavorites.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 border border-slate-200 border-dashed text-center">
                      <Heart size={48} className="mx-auto text-slate-300 mb-4" />
                      <h3 className="text-lg font-bold text-slate-900">Aún no sigues tiendas</h3>
                      <p className="text-slate-500 text-sm mt-2">Navega por el marketplace o el feed y guarda los comercios que más te gusten.</p>
                      <button 
                        onClick={() => navigate('/')} 
                        className="mt-4 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition-all"
                      >
                        Explorar Directorio
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {parsedFavorites.map((store, idx) => (
                        <div 
                          key={store.slug || store.id || idx} 
                          className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex items-center gap-4 hover:border-amber-400 hover:shadow-md transition-all group cursor-pointer" 
                          onClick={() => navigate(`/${store.slug || store.id}`)}
                        >
                          {store.logo ? (
                            <img src={store.logo} alt={store.name} className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shadow-xs" />
                          ) : (
                            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-xs border border-amber-200/80">
                               <Store size={24} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors truncate">{store.name}</h4>
                            <span className="text-xs text-slate-500 mt-1 block">Toca para visitar vitrina</span>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); removeFavorite(store.slug || store.id); }}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                            title="Eliminar de favoritos"
                          >
                            <Heart size={20} fill="currentColor" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  savedPosts.length === 0 ? (
                    <div className="bg-white rounded-3xl p-12 border border-slate-200 border-dashed text-center">
                      <Bookmark size={48} className="mx-auto text-slate-300 mb-4" />
                      <h3 className="text-lg font-bold text-slate-900">No tienes publicaciones guardadas</h3>
                      <p className="text-slate-500 text-sm mt-2">Guarda publicaciones desde el feed con el botón de guardar para verlas cuando desees.</p>
                      <button 
                        onClick={() => navigate('/')} 
                        className="mt-4 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm transition-all"
                      >
                        Ver Feed Social
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {savedPosts.map((post) => (
                        <div key={post.id || post.postId} className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xs flex flex-col group hover:border-amber-400 hover:shadow-md transition-all">
                          {post.image_url ? (
                            <div className="h-44 w-full relative bg-slate-100 overflow-hidden">
                              <img src={post.image_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            </div>
                          ) : (
                            <div className="h-28 w-full bg-amber-50/50 flex items-center justify-center text-amber-500">
                              <Store size={32} />
                            </div>
                          )}
                          <div className="p-5 flex-1 flex flex-col justify-between">
                            <div>
                              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block mb-1">{post.store_name}</span>
                              <h4 className="font-bold text-slate-900 line-clamp-2 leading-snug mb-2">{post.title || post.content}</h4>
                              {post.content && post.title && (
                                <p className="text-xs text-slate-500 line-clamp-2">{post.content}</p>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                              <button 
                                onClick={() => navigate(`/${post.store_slug || post.workspaceId}`)}
                                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all"
                              >
                                Visitar Vitrina
                              </button>
                              <button 
                                onClick={() => navigate('/')}
                                className="text-xs text-slate-400 hover:text-slate-700 font-medium transition-colors"
                              >
                                Ver en Feed
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </motion.div>
            )}

            {/* TABS: AJUSTES */}
            {activeTab === 'ajustes' && (
              <motion.div key="ajustes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <h2 className="text-2xl font-black text-slate-900 mb-2">Configuración y Soporte</h2>
                <p className="text-slate-500 text-sm mb-6">Administra la seguridad de tu cuenta y obtén ayuda.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Seguridad */}
                  <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs relative overflow-hidden group">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-6 border border-amber-200/80 shadow-xs">
                      <Settings size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2 relative z-10">Seguridad de la cuenta</h3>
                    <p className="text-slate-500 text-sm mb-6 leading-relaxed relative z-10">Actualiza tu contraseña periódicamente para mantener tu cuenta segura.</p>
                    <button onClick={() => setActiveTab('datos')} className="px-5 py-2.5 bg-slate-100 text-slate-800 font-bold rounded-xl text-sm hover:bg-slate-200 transition-colors border border-slate-200 relative z-10">
                      Cambiar Contraseña
                    </button>
                  </div>
                  
                  {/* Centro de Ayuda */}
                  <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs relative overflow-hidden group">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6 border border-emerald-200/80 shadow-xs">
                      <HelpCircle size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2 relative z-10">Centro de Ayuda</h3>
                    <p className="text-slate-500 text-sm mb-6 leading-relaxed relative z-10">¿Tienes problemas con un pedido? Consulta nuestras preguntas frecuentes.</p>
                    <button onClick={() => navigate('/legal/terminos')} className="px-5 py-2.5 bg-slate-100 text-slate-800 font-bold rounded-xl text-sm hover:bg-slate-200 transition-colors border border-slate-200 relative z-10">
                      Ir a Preguntas Frecuentes
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
      
      {/* Modal de Añadir Pago Móvil */}
      {isAddingPayment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Banknote className="text-emerald-600" /> Añadir Pago Móvil</h3>
              <button onClick={() => setIsAddingPayment(false)} className="text-slate-400 hover:text-slate-700 transition-colors p-2"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleAddPaymentProfile} className="p-6 space-y-6">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-900">
                <strong>⚠️ Prevención de Triangulación:</strong><br />
                Por seguridad, la cuenta que afilies <strong>DEBE</strong> pertenecer a ti. Tu Cédula y Nombre están bloqueados permanentemente para esta acción.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">Cédula Bloqueada</label>
                  <input type="text" disabled value={currentCustomer?.docId || ''} className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-slate-500 cursor-not-allowed text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">Nombre Bloqueado</label>
                  <input type="text" disabled value={currentCustomer?.name || ''} className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-slate-500 cursor-not-allowed text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">Banco Emisor</label>
                  <select required value={newPayment.bank} onChange={e => setNewPayment({...newPayment, bank: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all appearance-none text-sm">
                    <option value="" className="text-slate-900 bg-white">Selecciona...</option>
                    <option value="Banesco" className="text-slate-900 bg-white">Banesco</option>
                    <option value="Mercantil" className="text-slate-900 bg-white">Mercantil</option>
                    <option value="Provincial" className="text-slate-900 bg-white">Provincial</option>
                    <option value="Venezuela" className="text-slate-900 bg-white">Banco de Venezuela</option>
                    <option value="BNC" className="text-slate-900 bg-white">BNC</option>
                    <option value="Bicentenario" className="text-slate-900 bg-white">Bicentenario</option>
                    <option value="BOD" className="text-slate-900 bg-white">BOD</option>
                    <option value="Exterior" className="text-slate-900 bg-white">Exterior</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">Teléfono Asociado</label>
                  <input type="tel" required placeholder="Ej. 04141234567" value={newPayment.phone} onChange={e => setNewPayment({...newPayment, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all text-sm" />
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-4 mt-2">
                <input type="checkbox" required checked={newPayment.legalAccepted} onChange={e => setNewPayment({...newPayment, legalAccepted: e.target.checked})} className="w-5 h-5 mt-0.5 rounded border-emerald-300 text-emerald-600 bg-white shrink-0 cursor-pointer" />
                <label className="text-sm text-emerald-900 cursor-pointer leading-relaxed" onClick={() => setNewPayment({...newPayment, legalAccepted: !newPayment.legalAccepted})}>
                  <strong>Declaración Jurada:</strong> Declaro que esta cuenta bancaria me pertenece. Acepto que pagos de terceros serán retenidos y procesados como sospechosos de fraude.
                </label>
              </div>

              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setIsAddingPayment(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancelar</button>
                <button type="submit" disabled={!newPayment.legalAccepted} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs">Añadir Cuenta</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal de Chat de Resolución */}
      {isChatOpen && activeChatOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsChatOpen(false)} />
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative z-10 flex flex-col h-[80vh] overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 flex items-center gap-2"><MessageSquare size={18} className="text-amber-500" /> Resolución de Disputa</h3>
                <p className="text-xs font-mono text-slate-500 mt-1">Orden: {activeChatOrder.id}</p>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full p-2 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {chatMessages.length === 0 ? (
                <div className="text-center text-slate-400 text-sm py-10 italic">Cargando chat... o aún no hay mensajes.</div>
              ) : (
                chatMessages.map(msg => (
                  <div key={msg.id} className={`flex flex-col max-w-[85%] ${msg.sender === 'customer' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                    <div className={`p-3 rounded-2xl text-sm shadow-xs ${msg.sender === 'customer' ? 'bg-amber-500 text-slate-950 rounded-tr-none font-medium' : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'}`}>
                      {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                      {msg.imageUrl && (
                        <img src={msg.imageUrl} alt="Evidencia" className="mt-2 rounded-xl max-w-full h-auto max-h-64 object-cover cursor-pointer border border-black/10" onClick={() => window.open(msg.imageUrl, '_blank')} />
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1 mx-1">
                      <span className="text-[10px] text-slate-400">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      {msg.sender === 'customer' && (
                        <CheckCheck size={12} className={msg.read ? 'text-blue-500' : 'text-slate-400'} />
                      )}
                    </div>
                  </div>
                ))
              )}
              {isTyping && (
                <div className="mr-auto flex items-center gap-2 p-3 bg-white border border-slate-200 text-slate-500 rounded-2xl rounded-tl-none text-sm w-fit shadow-xs">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-200">
              {chatImage && (
                 <div className="relative inline-block mb-3">
                   <img src={chatImage} alt="Preview" className="h-16 rounded-lg border border-slate-200" />
                   <button onClick={() => setChatImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md"><X size={12}/></button>
                 </div>
              )}
              <form onSubmit={sendChatMessage} className="flex gap-2 items-end">
                <label className="p-3 bg-slate-100 text-slate-500 hover:text-amber-600 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-amber-400">
                  <input type="file" accept="image/*" className="hidden" onChange={handleChatImageUpload} />
                  <ImageIcon size={20} />
                </label>
                <textarea 
                  value={chatInput} 
                  onChange={handleTyping} 
                  placeholder="Escribe al comercio..." 
                  className="flex-1 max-h-32 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 focus:bg-white resize-none text-slate-900 shadow-xs"
                  rows="1"
                  onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                />
                <button type="submit" disabled={isSendingChat || (!chatInput.trim() && !chatImage) || activeChatOrder?.paymentStatus === 'approved' || activeChatOrder?.paymentStatus === 'fraud'} className="p-3 bg-amber-500 text-slate-950 rounded-xl hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs">
                  {isSendingChat ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* RATING MODAL */}
      {ratingModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white border border-slate-200 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative overflow-hidden">
            <button onClick={() => setRatingModal({ isOpen: false, orderId: null, rating: 0, comment: '' })} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors z-10"><X size={24}/></button>
            <h3 className="text-2xl font-black text-slate-900 mb-2 text-center relative z-10">Calificar Pedido</h3>
            <p className="text-slate-500 text-sm text-center mb-6 relative z-10">¿Qué tal te pareció tu experiencia de compra y los productos recibidos?</p>
            
            <div className="flex items-center justify-center gap-2 mb-6 relative z-10">
              {[1, 2, 3, 4, 5].map((star) => (
                <button 
                  key={star} 
                  onClick={() => setRatingModal({...ratingModal, rating: star})}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star size={32} fill={ratingModal.rating >= star ? '#F59E0B' : '#E2E8F0'} className={ratingModal.rating >= star ? 'text-amber-500' : 'text-slate-200'} />
                </button>
              ))}
            </div>
            
            <div className="mb-6 relative z-10">
              <label className="block text-sm font-bold text-slate-700 mb-2">Comentarios (Opcional)</label>
              <textarea 
                rows="3" 
                value={ratingModal.comment}
                onChange={(e) => setRatingModal({...ratingModal, comment: e.target.value})}
                placeholder="Escribe tu reseña aquí..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white shadow-xs text-sm"
              ></textarea>
            </div>
            
            <button 
              onClick={submitRating}
              disabled={ratingModal.rating === 0}
              className={`w-full py-3 rounded-xl font-bold transition-all relative z-10 ${ratingModal.rating > 0 ? 'bg-amber-500 text-slate-950 shadow-xs hover:bg-amber-400' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
              Enviar Calificación
            </button>
          </motion.div>
        </div>
      )}

      {/* Modal / Dialogo de Aviso: En Construcción */}
      <AnimatePresence>
        {showUnderConstruction && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl border border-slate-200 relative"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
                <Hammer size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">En Construcción</h3>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Estamos construyendo la sección de <strong>Niveles y logros</strong> para recompensar tu fidelidad en AxonMarket. ¡Muy pronto estará disponible!
              </p>
              <button
                onClick={() => setShowUnderConstruction(false)}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-all shadow-md text-xs uppercase tracking-wider"
              >
                Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Wizard Modal */}
      <ProfileWizardModal 
        isOpen={isWizardOpen}
        onClose={() => {
          setIsWizardOpen(false);
          sessionStorage.setItem('wizard_dismissed', 'true');
        }}
        customer={currentCustomer}
        canClose={true}
        onComplete={(updatedCustomer) => {
          const rawPay = updatedCustomer?.payment_profile;
          let safePay = [];
          if (Array.isArray(rawPay)) {
            safePay = rawPay;
          } else if (rawPay && typeof rawPay === 'object' && Object.keys(rawPay).length > 0) {
            safePay = [rawPay];
          } else if (typeof rawPay === 'string') {
            try {
              const parsed = JSON.parse(rawPay);
              safePay = Array.isArray(parsed) ? parsed : [parsed];
            } catch(e) { safePay = []; }
          }
          
          let safeAddresses = [];
          if (Array.isArray(updatedCustomer?.addresses)) {
            safeAddresses = updatedCustomer.addresses;
          } else if (typeof updatedCustomer?.addresses === 'string') {
            try { safeAddresses = JSON.parse(updatedCustomer.addresses); } catch(e){}
          }
          
          const safeCust = {
            ...updatedCustomer,
            payment_profile: safePay,
            addresses: safeAddresses,
            docId: updatedCustomer?.docId || updatedCustomer?.doc_id || ''
          };

          setCurrentCustomer(safeCust);
          localStorage.setItem('ecommerce_current_customer', JSON.stringify(safeCust));
          
          setPaymentProfiles(safePay);
          setProfileForm({
            name: safeCust.name || '',
            docId: safeCust.docId || '',
            phone: safeCust.phone || '',
            address: safeCust.address || '',
            profile_pic: safeCust.profile_pic || ''
          });
          
          setIsWizardOpen(false);
        }}
      />
    </div>
  );
}
