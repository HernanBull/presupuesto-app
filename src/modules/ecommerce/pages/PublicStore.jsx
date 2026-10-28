import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, LayoutTemplate, Image as ImageIcon, Calculator, ChevronRight, Heart, X, Plus, Minus, ShoppingBag, ArrowLeft, Lock, Store, User, UserPlus, Zap, Package, ArrowRight, Loader2, Tag, Pen, Smartphone, UploadCloud, ShieldCheck, Hash, MapPin, Map, CreditCard, Star, CheckCircle, CheckCircle2, Clock, Trash2, Building2, Eye, EyeOff, Link, Camera, ChevronLeft, MoreHorizontal, Bike, ChefHat, MessageCircle, Music2, Search, Grid, Menu, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import ProfileWizardModal from '../components/ProfileWizardModal';
import ResponsiveModal from '../components/ResponsiveModal';
import MerchantStatusViewerModal from '../components/MerchantStatusViewerModal';
import { getStoreFollowState, toggleFollowStore, getStoreRealMetrics, getStoreFollowersList } from '../services/socialService';
import Tesseract from 'tesseract.js';
import { supabase } from '../../../supabaseClient';
import logoAxon from '../../presupuesto/logo/logo-sin-fondo.png';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

if (!L.Icon.Default.prototype._axon_marker_fixed) {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: iconRetinaUrl,
    iconUrl: iconUrl,
    shadowUrl: shadowUrl,
  });
  L.Icon.Default.prototype._axon_marker_fixed = true;
}

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '106606679170-oheuro9l1qicfspsvsmf6c4ihuif2fq1.apps.googleusercontent.com';


const formatStatusTime = (dateStr) => {
  if (!dateStr) return 'Hoy';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Hoy';
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMin / 60);

    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHours < 24) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return 'Hoy';
  }
};

const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  return `https://axonmarket-api.onrender.com${url}`;
};

const PasswordRequirements = ({ password = '' }) => {
  const reqs = [
    { label: 'Mínimo 8 caracteres', met: password.length >= 8 },
    { label: 'Una mayúscula', met: /[A-Z]/.test(password) },
    { label: 'Una minúscula', met: /[a-z]/.test(password) },
    { label: 'Un número', met: /[0-9]/.test(password) },
    { label: 'Un carácter especial (!@#$%^&*)', met: /[^A-Za-z0-9]/.test(password) },
  ];
  
  return (
    <div className="bg-zinc-950 border border-white/5 p-3 rounded-xl mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
      {reqs.map((req, i) => (
        <div key={i} className="flex items-center gap-2">
          {req.met ? <CheckCircle size={14} className="text-amber-500" /> : <div className="w-3.5 h-3.5 rounded-full border border-zinc-700"></div>}
          <span className={`text-[10px] font-medium ${req.met ? 'text-amber-500' : 'text-zinc-500'}`}>{req.label}</span>
        </div>
      ))}
    </div>
  );
};

export default function PublicStore() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [workspaceId, setWorkspaceId] = useState(null);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [showFullSchedule, setShowFullSchedule] = useState(false);
  const [showSocialMenu, setShowSocialMenu] = useState(false);
  const [storeNotFound, setStoreNotFound] = useState(false);
  const [config, setConfig] = useState(null);
  const [authGateMode, setAuthGateMode] = useState('login');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [likesCount, setLikesCount] = useState(0);

  useEffect(() => {
    if (workspaceId) {
      getStoreFollowState(workspaceId, currentCustomer?.id).then(res => {
        setIsFollowing(res.isFollowing);
        if (res.count !== undefined) setFollowersCount(res.count);
      });

      getStoreRealMetrics(workspaceId, slug).then(metrics => {
        if (metrics.followersCount !== undefined) setFollowersCount(metrics.followersCount);
        if (metrics.likesCount !== undefined) setLikesCount(metrics.likesCount);
      });
    }
  }, [workspaceId, currentCustomer?.id, slug]);

  const [currentPage, setCurrentPage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    let pageParam = params.get('page');
    if (pageParam === 'catalog') pageParam = 'products';
    return pageParam || 'home';
  });
  const [products, setProducts] = useState([]);
  const [mainCategories, setMainCategories] = useState(['Todas']);
  const [activeMainCategory, setActiveMainCategory] = useState('Todas');
  const [subCategories, setSubCategories] = useState(['Todos']);
  const [activeSubCategory, setActiveSubCategory] = useState('Todos');
  const [bcvRate, setBcvRate] = useState(36.50);
  const [cart, setCart] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isBottomNavOpen, setIsBottomNavOpen] = useState(true);
  const [isStatusViewerOpen, setIsStatusViewerOpen] = useState(false);
  const [activeStatusIndex, setActiveStatusIndex] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [isCheckoutMode, setIsCheckoutMode] = useState(false);
  const [checkoutAddress, setCheckoutAddress] = useState('');
  const [checkoutLocation, setCheckoutLocation] = useState(null);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [discountError, setDiscountError] = useState('');
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptUrl, setReceiptUrl] = useState(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentBank, setPaymentBank] = useState('');
  const [selectedPaymentProfileIdx, setSelectedPaymentProfileIdx] = useState('');

  const customerPaymentProfiles = useMemo(() => {
    if (!currentCustomer?.payment_profile) return [];
    let p = currentCustomer.payment_profile;
    if (typeof p === 'string') {
      try { p = JSON.parse(p); } catch(e) { return []; }
    }
    if (p && !Array.isArray(p)) return [p];
    return p || [];
  }, [currentCustomer]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('pago_movil');
  const [ocrStatus, setOcrStatus] = useState('idle');
  const [ocrMessage, setOcrMessage] = useState('');

  // Geolocalización real del usuario y cálculo de distancia sin datos ficticios
  const [userDistance, setUserDistance] = useState(null);
  const [isLocatingUser, setIsLocatingUser] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      setIsLocatingUser(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocatingUser(false);
          const uLat = pos.coords.latitude;
          const uLng = pos.coords.longitude;
          
          const sLat = Number(config?.location?.lat || config?.expediente?.gps?.lat || config?.gps?.lat);
          const sLng = Number(config?.location?.lng || config?.expediente?.gps?.lng || config?.gps?.lng);

          if (!isNaN(sLat) && !isNaN(sLng) && sLat !== 0 && sLng !== 0) {
            const R = 6371; // Radio de la Tierra en km
            const dLat = (sLat - uLat) * (Math.PI / 180);
            const dLon = (sLng - uLng) * (Math.PI / 180);
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(uLat * (Math.PI / 180)) *
                Math.cos(sLat * (Math.PI / 180)) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const dist = R * c;

            if (dist < 1) {
              setUserDistance(`A ${Math.round(dist * 1000)} m de ti`);
            } else {
              setUserDistance(`A ${dist.toFixed(1)} Km de ti`);
            }
          } else {
            const storeCity = config?.address || config?.location?.address || config?.expediente?.address;
            if (storeCity) {
              setUserDistance(`📍 ${storeCity}`);
            } else {
              setUserDistance(null);
            }
          }
        },
        () => {
          setIsLocatingUser(false);
          const storeCity = config?.address || config?.location?.address || config?.expediente?.address;
          if (storeCity) {
            setUserDistance(`📍 ${storeCity}`);
          } else {
            setUserDistance(null);
          }
        },
        { timeout: 8000, maximumAge: 60000, enableHighAccuracy: true }
      );
    }
  }, [config]);

  useEffect(() => {
    if (checkoutStep === 2 && !selectedPaymentMethod) {
      if (config?.paymentProfile?.paymentMobile !== false) {
        setSelectedPaymentMethod('pago_movil');
      } else if (config?.paymentProfile?.zelleActive) {
        setSelectedPaymentMethod('zelle');
      } else if (config?.paymentProfile?.cashActive) {
        setSelectedPaymentMethod('cash');
      } else {
        setSelectedPaymentMethod('pago_movil');
      }
    }
  }, [checkoutStep, selectedPaymentMethod, config]);
  
  const cartIconRef = useRef(null);
  const [flyingItems, setFlyingItems] = useState([]);
  const [cartBounce, setCartBounce] = useState(false);
  const [stockAlert, setStockAlert] = useState(null);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', docId: '', phone: '', address: '' });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', docId: '', phone: '', address: '' });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalQty, setModalQty] = useState(1);
  const [authLoading, setAuthLoading] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [showAuthConfirmPassword, setShowAuthConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  // Tools Modal
  const [isToolsModalOpen, setIsToolsModalOpen] = useState(false);
  const [calcUSD, setCalcUSD] = useState('');
  
  // Simulator
  const [simulatedCart, setSimulatedCart] = useState({});
  const [simulatedDiscountCode, setSimulatedDiscountCode] = useState('');
  const [simulatedDiscountPct, setSimulatedDiscountPct] = useState(0);

  // Update subcategories when activeMainCategory changes
  React.useEffect(() => {
    if (activeMainCategory === 'Todas') {
      const allSubCats = new Set(products.map(p => p.subcategory || 'General'));
      setSubCategories(['Todos', ...Array.from(allSubCats)]);
    } else {
      const filteredForMain = products.filter(p => p.category === activeMainCategory);
      const subCats = new Set(filteredForMain.map(p => p.subcategory || 'General'));
      setSubCategories(['Todos', ...Array.from(subCats)]);
    }
    // Always reset subcategory when main category changes
    setActiveSubCategory('Todos');
  }, [activeMainCategory, products]);

  const simulateAddToCart = (product, qty) => {
    setSimulatedCart(prev => {
      const next = (prev[product.id] || 0) + qty;
      const newCart = { ...prev };
      if (next <= 0) {
        delete newCart[product.id];
      } else {
        newCart[product.id] = next;
      }
      return newCart;
    });
  };

  const handleApplySimulatedDiscount = () => {
    if (simulatedDiscountCode.trim() === '') {
      setSimulatedDiscountPct(0);
      return;
    }
    // Simple mock: any code with '10' gives 10%, '20' gives 20%, else 5%.
    if (simulatedDiscountCode.includes('10')) setSimulatedDiscountPct(10);
    else if (simulatedDiscountCode.includes('20')) setSimulatedDiscountPct(20);
    else setSimulatedDiscountPct(5);
  };

  const simulatedTotalUsd = useMemo(() => {
    return Object.entries(simulatedCart).reduce((acc, [pid, qty]) => {
      const p = products.find(prod => prod.id === pid);
      if (!p) return acc;
      return acc + (parseFloat(p.price) * qty);
    }, 0);
  }, [simulatedCart, products]);

  const finalSimulatedUsd = simulatedTotalUsd * (1 - (simulatedDiscountPct / 100));

  const [productReviews, setProductReviews] = useState([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSent, setReviewSent] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [storeRatingAvg, setStoreRatingAvg] = useState(0);
  const [storeReviewsList, setStoreReviewsList] = useState([]);
  const [storeNews, setStoreNews] = useState([]);
  const merchantStatuses = useMemo(() => {
    const storeAvatar = config?.logoUrl || config?.storefront?.logoUrl;
    const storeCover = config?.coverUrl || config?.storefront?.heroUrl || config?.bannerUrl;
    const storeName = config?.business_name || 'Comercio';

    const list = (storeNews || []).map((news) => ({
      id: news.id,
      name: storeName,
      slug: slug,
      avatar: storeAvatar,
      mediaUrl: news.image_url || storeCover || storeAvatar,
      caption: news.title ? `${news.title}: ${news.content}` : news.content,
      time: formatStatusTime(news.created_at),
      isVerified: !!config?.is_verified
    }));

    if (list.length === 0) {
      list.push({
        id: `intro-${slug || 'store'}`,
        name: storeName,
        slug: slug,
        avatar: storeAvatar,
        mediaUrl: storeCover || storeAvatar || 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&q=80',
        caption: config?.description || '¡Bienvenidos a nuestra vitrina oficial en AxonMarket!',
        time: 'Hoy',
        isVerified: !!config?.is_verified
      });
    }

    return list;
  }, [storeNews, config, slug]);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersList, setFollowersList] = useState([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);

  useEffect(() => {
    if (showFollowersModal && workspaceId) {
      setLoadingFollowers(true);
      getStoreFollowersList(workspaceId)
        .then(list => setFollowersList(list))
        .catch(err => console.error('Error cargando seguidores:', err))
        .finally(() => setLoadingFollowers(false));
    }
  }, [showFollowersModal, workspaceId]);

  const trackEvent = async (eventType, wid) => {
    try {
      const activeWId = wid || workspaceId;
      if (!activeWId) return;
      await fetch(`https://axonmarket-api.onrender.com/api/ecommerce/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: activeWId,
          eventType,
          source: document.referrer
        })
      });
    } catch(e) {}
  };

  useEffect(() => {
    const fetchBcvRate = async () => {
      try {
        const res = await fetch('https://axonmarket-api.onrender.com/api/bcv');
        const data = await res.json();
        if (res.ok && data.rate) {
          setBcvRate(Number(data.rate).toFixed(2));
        } else if (data.fallbackRate) {
          setBcvRate(Number(data.fallbackRate).toFixed(2));
        }
      } catch (err) {
        console.error('Error fetching BCV rate:', err);
      }
    };
    fetchBcvRate();
  }, []);

  useEffect(() => {
    const savedCustomer = localStorage.getItem('ecommerce_current_customer');
    if (savedCustomer) {
      const parsed = JSON.parse(savedCustomer);
      if (parsed.profilePic && !parsed.profile_pic) {
        parsed.profile_pic = parsed.profilePic;
        delete parsed.profilePic;
        localStorage.setItem('ecommerce_current_customer', JSON.stringify(parsed));
      }
      setCurrentCustomer(parsed);
      if (!parsed.phone || (!parsed.docId && !parsed.doc_id) || !parsed.address || !parsed.name || parsed.name === parsed.email.split('@')[0] || parsed.name === parsed.email) {
        setIsWizardOpen(true);
      }
    }
  }, []);

  const getStoreScheduleStatus = () => {
    const sched = config?.scheduleProfile || config?.schedule || config?.expediente?.scheduleProfile;
    if (!sched) return { status: 'unknown', message: 'Horario no especificado' };
    if (sched.scheduleActive === false) {
      if (sched.openTime && sched.closeTime) {
        return { status: 'open', message: `Horario (${sched.openTime} - ${sched.closeTime})` };
      }
      return { status: 'open', message: 'Abierto 24/7' };
    }
    const { workDays, openTime, closeTime, closeWarningMinutes = 30 } = sched;
    if (!openTime || !closeTime) return { status: 'unknown', message: 'Horario no especificado' };
    
    const currentDayIdx = new Date().getDay();
    const daysMap = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const currentDayName = daysMap[currentDayIdx];
    
    if (workDays && workDays[currentDayName] === false) return { status: 'closed', message: `Cerrado (Hoy ${currentDayName} no laborable)` };
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    
    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);
    
    const currentMins = currentHour * 60 + currentMin;
    const openMins = openH * 60 + openM;
    const closeMins = closeH * 60 + closeM;
    
    let isClosed = false;
    let minsToClose = 0;

    if (closeMins < openMins) {
      if (currentMins < openMins && currentMins >= closeMins) isClosed = true;
      else {
        minsToClose = (currentMins >= openMins) ? ((1440 - currentMins) + closeMins) : (closeMins - currentMins);
      }
    } else {
      if (currentMins < openMins || currentMins >= closeMins) isClosed = true;
      else {
        minsToClose = closeMins - currentMins;
      }
    }
    
    if (isClosed) return { status: 'closed', message: `Cerrado (Abre a las ${openTime})` };
    if (minsToClose <= closeWarningMinutes) return { status: 'closing', message: `Cierra en ${minsToClose} min` };
    return { status: 'open', message: `Abierto (Cierra a las ${closeTime})` };
  };

  const storeSchedule = getStoreScheduleStatus();
  const storeClosed = storeSchedule.status === 'closed';

  const handleRegister = async (e) => {
    e.preventDefault();
    if (authForm.password !== authConfirmPassword) {
      alert("Las contraseñas no coinciden");
      return false;
    }
    if (!termsAccepted) {
      alert("Debes aceptar los Términos de Uso y Política de Privacidad");
      return false;
    }
    setAuthLoading(true);
    try {
      // Check if email already exists
      const { data: existingUser } = await supabase
        .from('ecommerce_customers')
        .select('*')
        .eq('email', authForm.email)
        .maybeSingle();
        
      if (existingUser) {
        alert('Este correo ya está registrado');
        setAuthLoading(false);
        return false;
      }

      const finalName = authForm.name ? authForm.name.trim() : authForm.email.split('@')[0];
      const { data: existingName } = await supabase
        .from('ecommerce_customers')
        .select('id')
        .ilike('name', finalName)
        .maybeSingle();

      if (existingName) {
        alert('Este nombre de usuario ya está registrado por otra persona. Por favor, elige uno distinto para evitar cuentas duplicadas.');
        setAuthLoading(false);
        return false;
      }

      const id = 'CUS-' + Math.floor(Math.random() * 1000000);
      const payload = {
        id,
        email: authForm.email,
        password: authForm.password,
        name: authForm.name || authForm.email.split('@')[0],
        phone: '',
        doc_id: '',
        address: '',
        wishlist: [],
        join_date: new Date().toISOString()
      };

      const { error } = await supabase.from('ecommerce_customers').insert([payload]);
      
      if (error) {
        alert(error.message || 'Error al registrarse');
        setAuthLoading(false);
        return false;
      }
      
      const newUser = { ...payload, docId: '', orders: [] };
      localStorage.setItem('ecommerce_current_customer', JSON.stringify(newUser));
      localStorage.removeItem('activeWorkspace');
      setCurrentCustomer(newUser);
      
      if (!newUser.phone || !newUser.docId || !newUser.address || !newUser.name || newUser.name === newUser.email.split('@')[0] || newUser.name === newUser.email) {
        setIsWizardOpen(true);
      }
      setShowAuthModal(false);
      setAuthLoading(false);
      return true;
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    }
    setAuthLoading(false);
    return false;
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
        setCheckoutLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setGpsLoading(false);
      },
      (err) => {
        setGpsError('No se pudo obtener la ubicación.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleCheckoutSubmit = async () => {
    if (!currentCustomer) {
      alert("Por favor inicia sesión o regístrate para comprar");
      setAuthGateMode('login');
      setIsCartOpen(false);
      return;
    }

    // Bloqueo de compras para correos no verificados
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !user.email_confirmed_at) {
        alert("Tu correo electrónico no ha sido verificado. Debes verificarlo desde tu perfil o revisando tu bandeja de entrada antes de poder realizar compras.");
        return;
      }
    } catch (e) {
      console.error("Error verificando estado del correo:", e);
    }
    if (!selectedPaymentMethod) {
      alert("Por favor selecciona un método de pago");
      return;
    }
    if (!receiptUrl && (selectedPaymentMethod === 'pago_movil' || selectedPaymentMethod === 'zelle')) {
      alert(`Por favor sube la captura del comprobante de tu ${selectedPaymentMethod === 'zelle' ? 'Zelle' : 'Pago Móvil'}`);
      return;
    }
    setIsSubmittingOrder(true);
    trackEvent('checkout_start');
    
    // Preparar Items
    const orderItems = Object.entries(cart).map(([id, qty]) => {
      const p = products.find(prod => prod.id === id);
      return { 
        id: p.id, 
        name: p.name, 
        price: p.is_offer ? p.discount_price : p.price, 
        quantity: qty, 
        sku: p.sku,
        is_combo: Boolean(p?.metadata?.is_combo),
        combo_items: p?.metadata?.combo_items || null,
        metadata: p?.metadata || null
      };
    });
    
    const subtotal = orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    
    // Calcular Envío
    const isFreeShipping = config?.shippingProfile?.freeShipping;
    const flatRate = config?.shippingProfile?.flatRate ? Number(config.shippingProfile.flatRate) : 0;
    const finalTotal = subtotal + (isFreeShipping ? 0 : flatRate);

    const orderData = {
      id: 'ORD-' + Math.floor(Math.random() * 1000000),
      workspace_id: workspaceId,
      customer: currentCustomer.name,
      customer_email: currentCustomer.email,
      address: checkoutAddress,
      discount_code: appliedDiscount ? appliedDiscount.code : null,
      total: finalTotal,
      items: orderItems,
      status: 'Pendiente',
      paymentmethod: selectedPaymentMethod,
      paymentstatus: selectedPaymentMethod === 'cash' ? 'approved' : 'pending',
      paymentdetails: {
        capture: receiptUrl,
        ref: paymentReference,
        bank: selectedPaymentMethod === 'zelle' ? 'Zelle' : (paymentBank || (selectedPaymentProfileIdx !== '' && customerPaymentProfiles[selectedPaymentProfileIdx]?.bank) || 'Pago Móvil'),
        phone: selectedPaymentMethod === 'pago_movil' && selectedPaymentProfileIdx !== '' && customerPaymentProfiles[selectedPaymentProfileIdx] ? customerPaymentProfiles[selectedPaymentProfileIdx].phone : (currentCustomer.phone || ''),
        docId: selectedPaymentMethod === 'pago_movil' && selectedPaymentProfileIdx !== '' && customerPaymentProfiles[selectedPaymentProfileIdx] ? customerPaymentProfiles[selectedPaymentProfileIdx].cedula : (currentCustomer.docId || ''),
        titular: selectedPaymentMethod === 'pago_movil' && selectedPaymentProfileIdx !== '' && customerPaymentProfiles[selectedPaymentProfileIdx] ? customerPaymentProfiles[selectedPaymentProfileIdx].titular : currentCustomer.name,
        address: checkoutAddress
      },
      shipping_info: {
         cost: isFreeShipping ? 0 : flatRate,
         location: checkoutLocation
      },
      date: new Date().toISOString()
    };

    try {
      const { error } = await supabase.from('ecommerce_orders_v2').insert([orderData]);
      if (!error) {
        // Disparo Realtime instantaneo a AxonPOS
        try {
          const storeCh = supabase.channel('store-' + workspaceId + '-orders');
          storeCh.subscribe(async (st) => {
            if (st === 'SUBSCRIBED') {
              await storeCh.send({
                type: 'broadcast',
                event: 'NEW_ORDER',
                payload: { orderId: orderData.id, workspaceId }
              });
              storeCh.unsubscribe();
            }
          });

          const pickingCh = supabase.channel('picking-sync');
          pickingCh.subscribe(async (st) => {
            if (st === 'SUBSCRIBED') {
              await pickingCh.send({
                type: 'broadcast',
                event: 'NEW_ECOMMERCE_ORDER',
                payload: { order: orderData, workspaceId }
              });
              pickingCh.unsubscribe();
            }
          });
        } catch (broadErr) {
          console.warn('[PublicStore Realtime] Error emitiendo broadcast a terminales:', broadErr);
        }
        setCart({});
        setIsCartOpen(false);
        setIsCheckoutMode(false);
        setAppliedDiscount(null);
        setDiscountCode('');
        
        // Mostrar modal de éxito en lugar de redireccionar
        setShowSuccessModal(true);
      } else {
        alert("Hubo un error al procesar el pedido.");
      }
    } catch(err) {
       console.error(err);
       alert("Error de conexión");
    }
    setIsSubmittingOrder(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    setReceiptFile(file);
    
    // Iniciar OCR
    if (selectedPaymentMethod === 'pago_movil' || selectedPaymentMethod === 'zelle') {
      setOcrStatus('analyzing');
      setOcrMessage('Analizando comprobante con IA...');
      try {
        const worker = await Tesseract.createWorker('spa');
        const ret = await worker.recognize(file);
        let text = ret.data.text;
        await worker.terminate();

        // Fase 1: Limpieza Inteligente (Pre-procesamiento)
        // Corregir confusión de OCR entre letras y números comunes si están cerca
        text = text.replace(/([0-9])[Oo]([0-9])/g, '$10$2')
                   .replace(/([0-9])[lI]([0-9])/g, '$11$2');
        
        let foundRef = null;

        // Fase 2: Búsqueda Basada en Contexto
        if (selectedPaymentMethod === 'zelle') {
          // Zelle: Busca palabras clave (Confirmation, Ref, ID)
          const zelleKeywordRegex = /(?:confirmaci[oó]n|confirmation|ref|referencia|id)\s*[:#\-]?\s*([A-Z0-9]{8,15})/i;
          const match = text.match(zelleKeywordRegex);
          if (match && match[1]) foundRef = match[1];
        } else {
          // Pago Móvil / Transferencia: Busca palabras clave seguidas de números (ignora espacios intermedios del OCR)
          const pmKeywordRegex = /(?:ref(?:erencia)?|recibo|operaci[oó]n|comprobante|aprobado)\s*[:#\-]?\s*([\d\s]{4,20})/i;
          const match = text.match(pmKeywordRegex);
          if (match && match[1]) {
            const cleanedNum = match[1].replace(/\s+/g, '');
            if (cleanedNum.length >= 4 && cleanedNum.length <= 15) {
              foundRef = cleanedNum;
            }
          }
        }

        // Fase 3: Filtrado de Falsos Positivos (Fallback)
        if (!foundRef) {
          const blocks = text.match(/\b[\d\s]{4,20}\b/g) || [];
          let validCandidates = [];
          
          for (let b of blocks) {
            const numStr = b.replace(/\s+/g, '');
            // Rango típico: 4 a 15 dígitos (Banesco ~7-9, BDV/Mercantil 12, BNC ~15)
            if (numStr.length >= 4 && numStr.length <= 15) {
              // Descarte de Fechas recientes
              if (numStr.length === 4 && (numStr.startsWith('202') || numStr.startsWith('203'))) continue;
              // Descarte de Teléfonos venezolanos (ej. 0414, 0424, 0412, o formato +58 omitido)
              if (numStr.length >= 10 && numStr.length <= 11 && (numStr.startsWith('04') || numStr.startsWith('41') || numStr.startsWith('42') || numStr.startsWith('02'))) continue;
              // Descarte de montos redondos puros que suelen estar en Bs
              if (numStr.endsWith('000') && numStr.length < 8) continue;
              
              validCandidates.push(numStr);
            }
          }

          if (selectedPaymentMethod === 'zelle' && validCandidates.length === 0) {
            // Zelle Fallback alfanumérico
            const zBlocks = text.match(/\b[A-Z0-9]{8,15}\b/gi) || [];
            if (zBlocks.length > 0) validCandidates = zBlocks;
          }

          if (validCandidates.length > 0) {
            // Tomamos el número válido más largo (las referencias suelen superar en longitud a las fechas y montos)
            foundRef = validCandidates.reduce((a, b) => a.length > b.length ? a : b);
          }
        }
        
        if (foundRef) {
          setPaymentReference(foundRef);
          setOcrStatus('success');
          setOcrMessage(`✅ Referencia detectada: ${foundRef}`);
        } else {
          setOcrStatus('error');
          setOcrMessage('ℹ️ Puedes escribir la referencia de pago manualmente abajo.');
        }
      } catch (err) {
        console.error("Error en OCR:", err);
        setOcrStatus('error');
        setOcrMessage('ℹ️ Puedes ingresar la referencia de pago manualmente abajo.');
      }
    }

    try {
      const fileExt = file.name.split('.').pop() || 'png';
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const targetWs = workspaceId || slug || 'general';
      const filePath = `receipts/${targetWs}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('ecommerce').upload(filePath, file);
      if (!uploadError) {
        const { data } = supabase.storage.from('ecommerce').getPublicUrl(filePath);
        if(data && data.publicUrl) {
          setReceiptUrl(data.publicUrl);
          return;
        }
      }
      throw uploadError || new Error('No public URL');
    } catch (error) {
      console.warn("Storage upload failed, fallback to DataURL:", error);
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        setReceiptUrl(loadEvent.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const rawIdentifier = (authForm.email || '').trim();
      let targetEmail = rawIdentifier;
      let user = null;

      // Si el cliente ingresó cédula o RIF en lugar de correo
      if (!rawIdentifier.includes('@')) {
        const cleanDoc = rawIdentifier.replace(/[^0-9]/g, '');
        const { data: byDoc } = await supabase
          .from('ecommerce_customers')
          .select('*')
          .or(`doc_id.eq.${cleanDoc},doc_id.ilike.%${cleanDoc}%`)
          .maybeSingle();

        if (byDoc) {
          if (byDoc.email) {
            targetEmail = byDoc.email;
          } else if (byDoc.password === authForm.password) {
            user = byDoc;
          }
        } else {
          alert('No encontramos ninguna cuenta registrada con esa cédula.');
          setAuthLoading(false);
          return false;
        }
      }

      // 1. Probar primero con Supabase Auth si aún no se resolvió
      if (!user) {
        try {
          const { data: authData } = await supabase.auth.signInWithPassword({
            email: targetEmail,
            password: authForm.password
          });
          if (authData?.user) {
            const { data: cData } = await supabase
              .from('ecommerce_customers')
              .select('*')
              .or(`id.eq.${authData.user.id},email.ilike.${targetEmail}`)
              .maybeSingle();
            if (cData) user = cData;
          }
        } catch (authErr) {
          // Continuar con verificación directa si falla
        }
      }

      // 2. Verificación directa en base de datos
      if (!user) {
        const { data: legacyUser } = await supabase
          .from('ecommerce_customers')
          .select('*')
          .ilike('email', targetEmail)
          .eq('password', authForm.password)
          .maybeSingle();
          
        if (legacyUser) user = legacyUser;
      }
        
      if (!user) {
        alert('Credenciales incorrectas');
        setAuthLoading(false);
        return false;
      }

      let safePaymentProfiles = [];
      if (user.payment_profile) {
        if (Array.isArray(user.payment_profile)) {
          safePaymentProfiles = user.payment_profile;
        } else if (typeof user.payment_profile === 'object' && Object.keys(user.payment_profile).length > 0) {
          safePaymentProfiles = [user.payment_profile];
        } else if (typeof user.payment_profile === 'string') {
          try {
            const p = JSON.parse(user.payment_profile);
            safePaymentProfiles = Array.isArray(p) ? p : [p];
          } catch(e){}
        }
      }

      let safeAddresses = [];
      if (user.addresses) {
        if (Array.isArray(user.addresses)) {
          safeAddresses = user.addresses;
        } else if (typeof user.addresses === 'string') {
          try { safeAddresses = JSON.parse(user.addresses); } catch(e){}
        }
      }
      
      const mappedUser = {
        ...user,
        docId: user.doc_id || user.docId || '',
        addresses: safeAddresses,
        payment_profile: safePaymentProfiles,
        favorites: Array.isArray(user.favorites) ? user.favorites : [],
        wishlist: Array.isArray(user.wishlist) ? user.wishlist : [],
        orders: []
      };
      
      localStorage.setItem('ecommerce_current_customer', JSON.stringify(mappedUser));
      localStorage.removeItem('activeWorkspace');
      setCurrentCustomer(mappedUser);
      
      const cleanPhone = (mappedUser.phone || '').replace(/\D/g, '');
      const cleanDoc = (mappedUser.docId || mappedUser.doc_id || '').replace(/\D/g, '');
      if (!mappedUser.name || mappedUser.name === mappedUser.email?.split('@')[0] || cleanPhone.length < 11 || cleanDoc.length < 6 || !mappedUser.address) {
        setIsWizardOpen(true);
      }

      setShowAuthModal(false);
      setAuthLoading(false);
      return true;
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    }
    setAuthLoading(false);
    return false;
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setAuthLoading(true);
    try {
      const base64Url = credentialResponse.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const decoded = JSON.parse(jsonPayload);
      
      const { email, name, picture } = decoded;
      if (!email) {
        alert('No se pudo obtener el email de Google');
        setAuthLoading(false);
        return;
      }

      const cleanEmail = email.trim().toLowerCase();

      // Sincronizar Supabase Auth si está habilitado
      try {
        if (supabase.auth?.signInWithIdToken) {
          await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: credentialResponse.credential,
          });
        }
      } catch (authErr) {
        console.warn('Supabase signInWithIdToken omitido:', authErr);
      }
      
      let { data: user } = await supabase
        .from('ecommerce_customers')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();
        
      let isNewUser = false;
      if (!user) {
        isNewUser = true;
        const id = 'CUS-' + Math.floor(Math.random() * 1000000);
        const randomPassNum = Math.floor(1000 + Math.random() * 9000);
        const generatedPassword = `Axon${randomPassNum}`;
        const payload = {
          id,
          email: cleanEmail,
          password: generatedPassword,
          name: name || cleanEmail.split('@')[0],
          profile_pic: picture || '',
          phone: '',
          doc_id: '',
          address: '',
          wishlist: [],
          join_date: new Date().toISOString()
        };
        const { error: insertErr } = await supabase.from('ecommerce_customers').insert([payload]);
        if (insertErr) {
          const { data: retryUser } = await supabase.from('ecommerce_customers').select('*').ilike('email', cleanEmail).maybeSingle();
          user = retryUser || payload;
        } else {
          user = payload;
        }
        
        // Send Welcome Email
        supabase.functions.invoke('send-welcome-email', {
          body: { email: user.email, name: user.name }
        }).catch(e => console.error('Error sending welcome email:', e));
      }
      
      const mappedUser = { ...user, auth_provider: 'google', is_verified: true, status: 'Activo', docId: user.doc_id || user.docId || '', orders: [] };
      localStorage.setItem('ecommerce_current_customer', JSON.stringify(mappedUser));
      localStorage.removeItem('activeWorkspace');
      setCurrentCustomer(mappedUser);
      
      const cleanPhone = (mappedUser.phone || '').replace(/\D/g, '');
      const cleanDoc = (mappedUser.doc_id || mappedUser.docId || '').replace(/\D/g, '');
      const isProfileIncomplete = isNewUser || !mappedUser.address || cleanPhone.length < 11 || cleanDoc.length < 6;

      if (isProfileIncomplete) {
        setIsWizardOpen(true);
      }

      setShowAuthModal(false);
    } catch (err) {
      console.error(err);
      alert('Error al iniciar sesión con Google');
    }
    setAuthLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('ecommerce_current_customer');
    setCurrentCustomer(null);
    setCart({});
    setCurrentPage('home');
  };

  const isWishlisted = (productId) => {
    if (!currentCustomer) return false;
    try {
      const wishlist = Array.isArray(currentCustomer.wishlist) ? currentCustomer.wishlist : (typeof currentCustomer.wishlist === 'string' ? JSON.parse(currentCustomer.wishlist || '[]') : []);
      return Array.isArray(wishlist) && wishlist.some(p => p.productId === productId);
    } catch {
      return false;
    }
  };

  const toggleWishlist = async (e, p) => {
    e.stopPropagation();
    if (!currentCustomer) return;
    
    let wishlist = Array.isArray(currentCustomer.wishlist) ? currentCustomer.wishlist : (typeof currentCustomer.wishlist === 'string' ? JSON.parse(currentCustomer.wishlist || '[]') : []);
    
    if (wishlist.some(item => item.productId === p.id)) {
      wishlist = wishlist.filter(item => item.productId !== p.id);
    } else {
      wishlist.push({
        productId: p.id,
        productName: p.name,
        productPrice: p.price,
        imageUrl: p.image_url,
        storeSlug: slug,
        storeName: config?.business_name || 'Tienda'
      });
    }
    
    const updatedUser = { ...currentCustomer, wishlist };
    setCurrentCustomer(updatedUser);
    localStorage.setItem('ecommerce_current_customer', JSON.stringify(updatedUser));

    try {
      await supabase
        .from('ecommerce_customers')
        .update({ wishlist })
        .eq('id', currentCustomer.id);
    } catch (err) { console.error(err); }
  };

  const syncGlobalCart = (newCart) => {
    try {
      const globalCart = JSON.parse(localStorage.getItem('ecommerce_global_cart') || '{}');
      if (Object.keys(newCart).length === 0) {
        delete globalCart[slug];
      } else {
        const storeItems = {};
        Object.entries(newCart).forEach(([id, qty]) => {
          const p = products.find(prod => prod.id === id);
          if (p) {
            storeItems[id] = { id, name: p.name, price: p.discount_price || p.price, quantity: qty, imageUrl: p.image_url };
          }
        });
        globalCart[slug] = {
          storeName: config?.texts?.nav1 === 'Inicio' ? slug : slug,
          items: storeItems
        };
      }
      localStorage.setItem('ecommerce_global_cart', JSON.stringify(globalCart));
      window.dispatchEvent(new Event('cart_updated'));
    } catch(e) {}
  };

  const isProfileComplete = (user) => {
    if (!user) return false;
    if (!user.phone || !user.docId || !user.address || !user.name || user.name === user.email.split('@')[0] || user.name === user.email) return false;
    return true;
  };

  const checkGlobalStock = async (productId, neededQty) => {
    try {
      const res = await fetch(`https://axonmarket-api.onrender.com/api/ecommerce/products/${productId}`);
      if (!res.ok) return false;
      const product = await res.json();
      
      // Simplemente retornamos si hay suficiente stock global para cubrir lo que falta, sin parchear nada
      if (product.stock_vitrina >= neededQty) {
        return true;
      }
      return false;
    } catch (e) {
      console.error("Global stock check error:", e);
      return false;
    }
  };

  const sendStockAlertWithAntiSpam = (product, requestedQty, available) => {
    const lastAlertKey = `spam_alert_${product.id}`;
    const lastAlertTime = sessionStorage.getItem(lastAlertKey);
    const now = Date.now();
    
    if (!lastAlertTime || (now - Number(lastAlertTime)) > 900000) { // 15 minutos de bloqueo
      sessionStorage.setItem(lastAlertKey, now.toString());
      
      fetch(`https://axonmarket-api.onrender.com/api/ecommerce/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: slug,
          type: 'stock_alert',
          message: `Intención de compra: Cliente ${currentCustomer?.name || 'Anónimo'} (ID: ${currentCustomer?.id || 'N/A'}) intentó comprar ${requestedQty} u. de '${product.name}' pero el inventario global se agotó. (Disponible en vitrina: ${available})`,
          product_id: product.id,
          customer_id: currentCustomer?.id
        })
      }).catch(console.error);
    }
  };

  const addToCart = async (productId, stepSize) => {
    if (!isProfileComplete(currentCustomer)) {
      setIsWizardOpen(true);
      return;
    }

    // Bloqueo estricto: Verificar confirmación de correo antes de añadir al carrito (los usuarios de Google ya están verificados)
    const isGoogleAuth = currentCustomer?.password === 'GOOGLE_AUTH' || 
                         currentCustomer?.password === 'oauth-google' || 
                         currentCustomer?.auth_provider === 'google' || 
                         (currentCustomer?.profile_pic && currentCustomer.profile_pic.includes('googleusercontent.com'));
    if (!isGoogleAuth) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && !user.email_confirmed_at) {
          alert("Para añadir productos al carrito y comprar, primero debes verificar tu correo electrónico. Por favor, revisa tu bandeja de entrada o verifica desde tu perfil.");
          return;
        }
      } catch (e) {
        console.error("Error verificando estado del correo:", e);
      }
    }

    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const currentQty = cart[productId] || 0;
    const addedQty = Number(stepSize || 1);
    const requestedQty = currentQty + addedQty;
    let available = product.stock_vitrina || 0;
    
    if (requestedQty > available) {
      const neededQty = requestedQty - available;
      const success = await checkGlobalStock(productId, neededQty);
      
      if (success) {
        // Permitimos que lo agregue de forma virtual
      } else {
        setStockAlert({
          title: 'Límite de Inventario',
          message: `Solo quedan ${available} unidades disponibles en vitrina de "${product.name}".`
        });
        setTimeout(() => setStockAlert(null), 4000);
        
        sendStockAlertWithAntiSpam(product, requestedQty, available);
        return;
      }
    }

    setCart(prev => {
      const newCart = {
        ...prev,
        [productId]: requestedQty
      };
      syncGlobalCart(newCart);
      return newCart;
    });
    trackEvent('add_to_cart');
    
    triggerFlyingAnimation(productId, `product-img-${productId}`);
  };

  const triggerFlyingAnimation = (productId, primarySourceId) => {
    if (!cartIconRef.current) {
      setCartBounce(true);
      setTimeout(() => setCartBounce(false), 300);
      return;
    }
    
    let sourceEl = document.getElementById(primarySourceId);
    if (!sourceEl) {
      sourceEl = document.getElementById(`product-card-${productId}`);
    }
    
    if (!sourceEl) {
      setCartBounce(true);
      setTimeout(() => setCartBounce(false), 300);
      return;
    }
    
    const sourceRect = sourceEl.getBoundingClientRect();
    const targetRect = cartIconRef.current.getBoundingClientRect();
    const imgUrl = sourceEl.src || null;
    
    if (!imgUrl) {
      setCartBounce(true);
      setTimeout(() => setCartBounce(false), 300);
      return;
    }
    
    const newItem = {
      id: Date.now() + Math.random(),
      productId,
      imgUrl,
      startX: sourceRect.left,
      startY: sourceRect.top,
      startWidth: sourceRect.width,
      startHeight: sourceRect.height,
      endX: targetRect.left + (targetRect.width / 2) - 15,
      endY: targetRect.top + (targetRect.height / 2) - 15,
    };
    
    setFlyingItems(prev => [...prev, newItem]);
    
    setTimeout(() => {
      setFlyingItems(prev => prev.filter(item => item.id !== newItem.id));
      setCartBounce(true);
      setTimeout(() => setCartBounce(false), 300);
    }, 800);
  };

  const fetchProductReviews = async (productId, currentWorkspace) => {
    try {
      const res = await fetch(`https://axonmarket-api.onrender.com/api/ecommerce/reviews?workspaceId=${currentWorkspace}`);
      if (res.ok) {
        const data = await res.json();
        setProductReviews(data.filter(r => r.product_id === productId && r.status === 'Aprobado'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openProductModal = (p) => {
    setSelectedProduct(p);
    setModalQty(1);
    setReviewRating(5);
    setReviewComment('');
    setReviewSent(false);
    fetchProductReviews(p.id, workspaceId);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;
    setIsSubmittingReview(true);
    try {
      const payload = {
        workspaceId,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        customerId: currentCustomer?.id || null,
        customerName: currentCustomer?.name || 'Cliente Anónimo',
        rating: reviewRating,
        comment: reviewComment
      };
      const res = await fetch(`https://axonmarket-api.onrender.com/api/ecommerce/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setReviewSent(true);
        setReviewComment('');
      }
    } catch (err) {
      console.error(err);
    }
    setIsSubmittingReview(false);
  };

  const addModalToCart = async () => {
    if (!isProfileComplete(currentCustomer)) {
      setIsWizardOpen(true);
      return;
    }
    if (!selectedProduct) return;
    
    const currentQty = cart[selectedProduct.id] || 0;
    let available = selectedProduct.stock_vitrina || 0;
    const requestedQty = currentQty + modalQty;
    
    if (requestedQty > available) {
      const neededQty = requestedQty - available;
      const success = await checkGlobalStock(selectedProduct.id, neededQty);
      
      if (success) {
        // Permitir agregar virtualmente
      } else {
        setStockAlert({
          title: 'Límite de Inventario',
          message: `Solo quedan ${available} unidades disponibles en vitrina de "${selectedProduct.name}".`
        });
        setTimeout(() => setStockAlert(null), 4000);
        
        sendStockAlertWithAntiSpam(selectedProduct, requestedQty, available);
        return;
      }
    }

    setCart(prev => {
      const newCart = { ...prev, [selectedProduct.id]: requestedQty };
      syncGlobalCart(newCart);
      return newCart;
    });
    trackEvent('add_to_cart');
    
    triggerFlyingAnimation(selectedProduct.id, `modal-img-${selectedProduct.id}`);
    
    setSelectedProduct(null);
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;
    setIsValidatingDiscount(true);
    setDiscountError('');
    try {
      const res = await fetch(`https://axonmarket-api.onrender.com/api/ecommerce/promotions/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: discountCode, workspaceId })
      });
      if (!res.ok) {
        const error = await res.json();
        setDiscountError(error.error || 'Cupón inválido');
        setAppliedDiscount(null);
      } else {
        const promo = await res.json();
        setAppliedDiscount(promo);
        setDiscountError('');
      }
    } catch (err) {
      setDiscountError('Error de conexión');
    } finally {
      setIsValidatingDiscount(false);
    }
  };

  const removeFromCart = (productId, stepSize = 1) => {
    setCart(prev => {
      const current = prev[productId] || 0;
      if (current <= 0) return prev;
      const next = current - Number(stepSize || 1);
      let newCart;
      if (next <= 0) {
        newCart = { ...prev };
        delete newCart[productId];
      } else {
        newCart = { ...prev, [productId]: next };
      }
      syncGlobalCart(newCart);
      return newCart;
    });
  };

  useEffect(() => {
    const fetchStoreData = async () => {
      const cacheKey = `ecommerce_store_${slug}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setConfig(parsed.config);
          setWorkspaceId(parsed.workspaceId);
          setProducts(parsed.products);
          setCategories(parsed.categories);
        } catch(e) {}
      }

      const defaultTexts = {
        banner: '¡Envíos gratis en compras mayores a $100!', nav1: 'Inicio', nav2: 'Catálogo', nav3: 'Ofertas',
        heroTitle: 'Descubre la nueva colección', heroSub: 'Productos exclusivos diseñados para ti.', heroBtn: 'Comprar Ahora',
        sectionTitle: 'Novedades', catalogTitle: 'Catálogo de Productos', offersTitle: 'Ofertas Flash', footerText: '© 2026 Todos los derechos reservados.',
        newsletterTitle: 'Únete a nuestro boletín', newsletterSub: 'Recibe ofertas exclusivas en tu correo.', testimonialsTitle: 'Lo que dicen nuestros clientes'
      };

      try {
        const targetSlug = (slug || 'tienda-ejemplo').trim();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetSlug);
        
        let storeData = null;
        let storeError = null;

        if (isUuid) {
          const res = await supabase.from('workspaces').select('*').or(`id.eq.${targetSlug},store_slug.ilike.${targetSlug}`).maybeSingle();
          storeData = res.data;
          storeError = res.error;
        } else {
          const res = await supabase.from('workspaces').select('*').or(`store_slug.ilike.${targetSlug},name.ilike.${targetSlug}`).maybeSingle();
          storeData = res.data;
          storeError = res.error;
        }

        // Resilient fallback: buscar por slug normalizado
        if (!storeData) {
          const { data: allWs } = await supabase.from('workspaces').select('*').limit(100);
          if (allWs) {
            const cleanTarget = targetSlug.toLowerCase().replace(/[^a-z0-9]/g, '');
            storeData = allWs.find(w => {
              const wsSlug = (w.store_slug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              const wsName = (w.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              return w.id === targetSlug || wsSlug === cleanTarget || wsName === cleanTarget;
            }) || null;
          }
        }

        if (!storeData) {
          const savedStr = localStorage.getItem('storefrontConfig');
          if (savedStr) {
             const saved = JSON.parse(savedStr);
             saved.texts = { ...defaultTexts, ...(saved.texts || {}) };
             setConfig(saved);
             setWorkspaceId('default_workspace');
             const { data: pData, error: pError } = await supabase.from('ecommerce_products').select('*').eq('workspace_id', 'default_workspace');
             if (!pError && pData) {
               const published = pData
                 .filter(p => p.publish_status === 'Publicado' || p.publish_status === 'Activo' || p.publish_status === 'published')
                 .sort((a, b) => {
                    const aStock = a.stock_vitrina || 0;
                    const bStock = b.stock_vitrina || 0;
                    if (aStock > 0 && bStock <= 0) return -1;
                    if (aStock <= 0 && bStock > 0) return 1;
                    return 0;
                 });
               setProducts(published);
               const cats = new Set(published.map(p => p.category || 'Sin Categoría'));
               setMainCategories(['Todas', ...Array.from(cats)]);
               const allSubCats = new Set(published.map(p => p.subcategory || 'General'));
               setSubCategories(['Todos', ...Array.from(allSubCats)]);
             }
             return;
          }
          setStoreNotFound(true);
          return;
        }
        
        setWorkspaceId(storeData.id);
        
        const baseConf = storeData.config || {};
        const storefrontConf = storeData.config?.storefront || {};
        
        let saved = {
          ...baseConf,
          ...storefrontConf,
          business_name: storeData.name
        };

        if (!saved || Object.keys(saved).length <= 1) {
          saved = {
            themeMode: 'dark', primaryColor: '#f59e0b', typography: 'font-sans', baseFontSize: 'text-base', headingWeight: 'font-light',
            logoUrl: null, headerStyle: 'transparent', showBanner: false, heroUrl: null, heroLayout: 'centered',
            buttonStyle: 'rounded-full', cardStyle: 'elevated', catalogFilterStyle: 'sidebar', offersCountdown: true, discountBadgeColor: '#ef4444',
            sections: [
              { id: 'sec-hero-1', type: 'hero' },
              { id: 'sec-feat-1', type: 'featured' }
            ],
            animationsEnabled: true,
            ...baseConf,
            ...storefrontConf,
            business_name: storeData.name
          };
        }
        
        saved.texts = { ...defaultTexts, ...(saved.texts || {}) };
        if (!Array.isArray(saved.sections)) {
          saved.sections = [{ id: 'sec-hero-1', type: 'hero' }, { id: 'sec-feat-1', type: 'featured' }];
        }
        
        // Ensure logo and cover are taken from the main store config if not explicitly set in storefront
        saved.logoUrl = baseConf.logoUrl || storefrontConf.logoUrl || saved.logoUrl;
        saved.heroUrl = baseConf.coverUrl || storefrontConf.heroUrl || saved.heroUrl || saved.coverUrl;

        // Resolve location & address with complete fallbacks
        const storeLat = baseConf.location?.lat || baseConf.expediente?.gps?.lat || storeData.latitude;
        const storeLng = baseConf.location?.lng || baseConf.expediente?.gps?.lng || storeData.longitude;
        const storeAddr = baseConf.address || baseConf.location?.address || baseConf.expediente?.address || storeData.map_address || '';

        if (storeLat && storeLng) {
          saved.location = {
            lat: Number(storeLat),
            lng: Number(storeLng),
            address: storeAddr
          };
        }
        if (storeAddr) {
          saved.address = storeAddr;
        }
        if (baseConf.scheduleProfile || baseConf.schedule) {
          saved.scheduleProfile = baseConf.scheduleProfile || baseConf.schedule;
        }
        if (baseConf.description) {
          saved.description = baseConf.description;
        }

        // Resolucion completa de métodos de pago con fallbacks
        const basePay = baseConf.paymentProfile || {};
        saved.paymentProfile = {
          paymentMobile: basePay.paymentMobile !== false && baseConf.paymentMobile !== false,
          pmBank: basePay.pmBank || baseConf.pagoMovilBank || baseConf.pmBank || '',
          pmPhone: basePay.pmPhone || baseConf.pagoMovilPhone || baseConf.pmPhone || baseConf.expediente?.whatsapp || baseConf.socialLinks?.whatsapp || '',
          pmId: basePay.pmId || baseConf.pagoMovilId || baseConf.pmId || baseConf.docId || '',
          zelleActive: basePay.zelleActive || baseConf.zelleActive || false,
          zelleEmail: basePay.zelleEmail || baseConf.zelleEmail || '',
          zelleName: basePay.zelleName || baseConf.zelleName || '',
          cashActive: basePay.cashActive || baseConf.cashActive || false,
          ...basePay
        };
        saved.bcvRate = baseConf.bcvRate || saved.bcvRate || 36.50;
        
        saved.business_name = storeData.name;
        setConfig(saved);
        trackEvent('visit', storeData.id);

        const { data: pData, error: pError } = await supabase.from('ecommerce_products').select('*').eq('workspace_id', storeData.id);
        if (!pError && pData) {
          const published = pData
             .filter(p => p.publish_status === 'Publicado' || p.publish_status === 'Activo' || p.publish_status === 'published')
             .sort((a, b) => {
                const aStock = a.stock_vitrina || 0;
                const bStock = b.stock_vitrina || 0;
                if (aStock > 0 && bStock <= 0) return -1;
                if (aStock <= 0 && bStock > 0) return 1;
                return 0;
             });
          setProducts(published);
          const cats = new Set(published.map(p => p.category || 'Sin Categoría'));
          const finalCats = ['Todas', ...Array.from(cats)];
          setMainCategories(finalCats);
          // Subcategories initial setup
          const allSubCats = new Set(published.map(p => p.subcategory || 'General'));
          setSubCategories(['Todos', ...Array.from(allSubCats)]);
          
          const newCache = JSON.stringify({
            config: saved,
            workspaceId: storeData.id,
            products: published,
            categories: finalCats
          });
          if (cached !== newCache) {
             localStorage.setItem(cacheKey, newCache);
          }
        }
        
        // Fetch store reviews average
        const { data: storeReviews } = await supabase.from('ecommerce_reviews').select('*').eq('workspace_id', storeData.id).eq('status', 'Aprobado');
        if (storeReviews && storeReviews.length > 0) {
           const total = storeReviews.reduce((acc, curr) => acc + curr.rating, 0);
           setStoreRatingAvg((total / storeReviews.length).toFixed(1));
           setStoreReviewsList(storeReviews);
        }

        // Fetch store news
        const { data: newsData } = await supabase.from('ecommerce_store_news').select('*').eq('workspace_id', storeData.id).eq('status', 'Publicado').order('created_at', { ascending: false });
        if (newsData) {
           setStoreNews(newsData);
        }
      } catch (error) {
        console.error(error);
        setStoreNotFound(true);
      }
    };

    fetchStoreData();
    window.addEventListener('storage', fetchStoreData);
    return () => window.removeEventListener('storage', fetchStoreData);
  }, [slug]);

  if (storeNotFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white font-light flex-col gap-4 font-sans selection:bg-amber-500/30 relative">
        <Store size={48} className="text-zinc-700 mb-2" />
        <h2 className="text-3xl text-zinc-300">Tienda no encontrada</h2>
        <p className="text-zinc-500">La URL ingresada no corresponde a ningún comercio.</p>
        <button onClick={() => navigate('/')} className="mt-4 px-6 py-3 bg-white/5 border border-white/10 rounded-full text-sm hover:bg-white/10 transition-colors">Volver al Directorio</button>
      </div>
    );
  }
  if (!config) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white font-light">
      <Loader2 className="animate-spin text-amber-500 mb-4" size={40} />
      <span className="text-sm font-bold tracking-widest uppercase text-zinc-500">Iniciando Entorno...</span>
    </div>
  );

  const {
    logoUrl, headerStyle, showBanner, heroUrl, heroLayout,
    buttonStyle, cardStyle, catalogFilterStyle,
    sections = [], texts
  } = config;

  // Cierre visual: Forzamos la estética ultra-premium y el color Ámbar como estándar universal
  const primaryColor = '#f59e0b';
  const typography = 'font-sans';
  const baseFontSize = 'text-base';
  const headingWeight = 'font-light';

  const typoClass = typography === 'font-serif' ? 'font-serif' : typography === 'font-mono' ? 'font-mono' : 'font-sans';
  const safeSections = Array.isArray(sections) ? sections : [];
  const isTransparentHeader = headerStyle === 'transparent' && currentPage === 'home' && safeSections[0]?.type === 'hero';

  // Modo Administrador
  const isMerchantOwner = localStorage.getItem('activeWorkspace') === workspaceId;

  // Auth Gate
  const isUserAllowedToSeePrices = currentCustomer || isMerchantOwner;

  const renderAuthModal = () => {
    if (!showAuthModal) return null;
    const storeName = config?.business_name || slug || 'la tienda';
    return (
      <ResponsiveModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        className="md:max-w-md border border-zinc-200 shadow-2xl bg-white"
        contentClassName="p-8 relative bg-white rounded-[32px]"
      >
        <div className="absolute top-0 left-0 w-full h-1 z-10 rounded-t-[32px]" style={{ background: `linear-gradient(90deg, transparent, ${primaryColor}, transparent)` }}></div>
        
        <div className="flex justify-center mb-8 pt-2">
          <div className="w-20 h-20 rounded-[24px] flex items-center justify-center border border-zinc-200 bg-zinc-50 relative group shadow-sm">
            <div className="absolute inset-0 blur-xl opacity-30 group-hover:opacity-50 transition-opacity rounded-[24px]" style={{ backgroundColor: primaryColor }}></div>
            <Lock size={32} className="text-zinc-800 relative z-10" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-zinc-900 text-center mb-2 tracking-tight">Accede Privado</h1>
        <p className="text-zinc-500 text-center text-sm font-medium mb-8">
          Inicia sesión o regístrate para acceder a los precios de <span className="text-zinc-900 font-bold capitalize">{storeName}</span>.
        </p>

        <div className="flex bg-zinc-100 rounded-full p-1 mb-8 border border-zinc-200 shadow-inner">
          <button onClick={() => setAuthGateMode('login')} className={`flex-1 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${authGateMode === 'login' ? 'bg-white text-zinc-900 shadow-md border border-zinc-200' : 'text-zinc-500 hover:text-zinc-800'}`} style={{ color: authGateMode === 'login' ? primaryColor : '' }}>Ingresar</button>
          <button onClick={() => setAuthGateMode('register')} className={`flex-1 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${authGateMode === 'register' ? 'bg-white text-zinc-900 shadow-md border border-zinc-200' : 'text-zinc-500 hover:text-zinc-800'}`} style={{ color: authGateMode === 'register' ? primaryColor : '' }}>Crear Cuenta</button>
        </div>

        <form onSubmit={async (e) => {
          const success = authGateMode === 'login' ? await handleLogin(e) : await handleRegister(e);
          if (success) setShowAuthModal(false);
        }} className="space-y-4">
          {authGateMode === 'register' && (
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Nombre Completo</label>
              <input type="text" required value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} className="w-full bg-white border border-zinc-200 rounded-2xl px-5 py-4 text-zinc-900 focus:outline-none transition-colors font-medium placeholder-zinc-400 focus:bg-zinc-50 shadow-sm" placeholder="Tu nombre" onFocus={(e) => e.target.style.borderColor = primaryColor} onBlur={(e) => e.target.style.borderColor = 'rgba(0,0,0,0.1)'}/>
            </div>
          )}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">
              {authGateMode === 'login' ? 'Correo Electrónico o Cédula / RIF' : 'Correo Electrónico'}
            </label>
            <input 
              type={authGateMode === 'login' ? 'text' : 'email'} 
              required 
              value={authForm.email} 
              onChange={e => setAuthForm({...authForm, email: e.target.value})} 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors font-medium placeholder-slate-400 shadow-sm" 
              placeholder={authGateMode === 'login' ? 'tu@correo.com o V-12345678' : 'tu@correo.com'} 
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Contraseña</label>
            <div className="relative">
              <input 
                type={showAuthPassword ? "text" : "password"} 
                required 
                value={authForm.password} 
                onChange={e => setAuthForm({...authForm, password: e.target.value})} 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 pr-12 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors font-medium placeholder-slate-400 shadow-sm" 
                placeholder="••••••••" 
              />
              <button type="button" onClick={() => setShowAuthPassword(!showAuthPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500 transition-colors">
                {showAuthPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          
          {authGateMode === 'register' && (
            <>
              <PasswordRequirements password={authForm.password} />
              <div className="mt-4">
                <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Confirmar Contraseña</label>
                <div className="relative">
                  <input type={showAuthConfirmPassword ? "text" : "password"} required value={authConfirmPassword} onChange={e => setAuthConfirmPassword(e.target.value)} className={`w-full bg-white border ${authConfirmPassword && authConfirmPassword !== authForm.password ? 'border-red-400' : 'border-zinc-200'} rounded-2xl px-5 py-4 pr-12 text-zinc-900 focus:outline-none transition-colors font-medium placeholder-zinc-400 focus:bg-zinc-50 shadow-sm`} placeholder="••••••••" onFocus={(e) => e.target.style.borderColor = primaryColor} onBlur={(e) => e.target.style.borderColor = 'rgba(0,0,0,0.1)'} />
                  <button type="button" onClick={() => setShowAuthConfirmPassword(!showAuthConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors" onMouseOver={(e) => e.currentTarget.style.color = primaryColor} onMouseOut={(e) => e.currentTarget.style.color = ''}>
                    {showAuthConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {authConfirmPassword && authConfirmPassword !== authForm.password && (
                  <p className="text-red-500 text-xs mt-2 font-medium">Las contraseñas no coinciden.</p>
                )}
              </div>
              
              <div className="flex items-start gap-3 bg-zinc-50 border border-zinc-200 rounded-2xl p-4 mt-4">
                <input
                  type="checkbox"
                  id="store-terms-checkbox"
                  checked={termsAccepted}
                  onChange={e => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-amber-500 shrink-0 cursor-pointer"
                />
                <label htmlFor="store-terms-checkbox" className="text-xs text-zinc-600 leading-relaxed cursor-pointer font-medium">
                  He leído y acepto los{' '}
                  <span className="font-bold transition-colors" style={{ color: primaryColor }}>Términos de Uso</span>
                  {' '}y la{' '}
                  <span className="font-bold transition-colors" style={{ color: primaryColor }}>Política de Privacidad</span>
                  {' '}de AxonMarket.
                </label>
              </div>
            </>
          )}

          <button
            type="submit" disabled={authLoading || (authGateMode === 'register' && !termsAccepted)}
            className="w-full py-4 text-white font-bold text-xs tracking-[0.2em] uppercase rounded-full transition-all hover:-translate-y-0.5 mt-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: primaryColor, boxShadow: `0 10px 30px ${primaryColor}40` }}
          >
            {authLoading ? <Loader2 className="animate-spin text-white" size={16} /> : (authGateMode === 'login' ? 'Acceder al Comercio' : 'Crear Cuenta y Entrar')}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-zinc-400 text-xs font-bold uppercase tracking-widest">
          <span className="w-1/4 border-b border-zinc-200"></span>
          <span>o continuar con</span>
          <span className="w-1/4 border-b border-zinc-200"></span>
        </div>
        
        <div className="mt-6 flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => alert('Fallo al conectar con Google')}
            theme="outline"
            shape="pill"
            text="continue_with"
          />
        </div>
      </ResponsiveModal>
    );  };

  const recentProducts = products.slice(0, 8);
  const offerProducts = products.filter(p => !!p.is_offer);
  let catalogProducts = [...products];
  if (activeMainCategory !== 'Todas') {
    catalogProducts = catalogProducts.filter(p => p.category === activeMainCategory);
  }
  if (activeSubCategory !== 'Todos') {
    catalogProducts = catalogProducts.filter(p => (p.subcategory || 'General') === activeSubCategory);
  }

  if (searchQuery) {
    catalogProducts = catalogProducts.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }

  catalogProducts.sort((a, b) => {
    const priceA = a.is_offer ? a.discount_price : a.price;
    const priceB = b.is_offer ? b.discount_price : b.price;

    if (sortBy === 'priceAsc') return priceA - priceB;
    if (sortBy === 'priceDesc') return priceB - priceA;
    if (sortBy === 'nameAsc') return a.name.localeCompare(b.name);
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
  const totalCartItems = Object.values(cart).reduce((a,b)=>a+b,0);

  const cartSubtotal = Object.entries(cart).reduce((acc, [id, qty]) => {
    const p = products.find(prod => prod.id === id);
    if (!p) return acc;
    const price = p.is_offer ? p.discount_price : p.price;
    return acc + (Number(price) * qty);
  }, 0);

  let shippingCost = config?.shippingProfile?.freeShipping ? 0 : Number(config?.shippingProfile?.flatRate || 0);
  let discountAmount = 0;

  if (appliedDiscount) {
    if (appliedDiscount.type === 'Porcentaje (%)') {
      discountAmount = cartSubtotal * (Number(appliedDiscount.value) / 100);
    } else if (appliedDiscount.type === 'Monto Fijo ($)') {
      discountAmount = Number(appliedDiscount.value);
    } else if (appliedDiscount.type === 'Envío Gratis') {
      shippingCost = 0;
    }
  }

  const finalCartTotal = Math.max(0, cartSubtotal + shippingCost - discountAmount);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <div className={`min-h-screen w-full flex flex-col items-center bg-slate-100/70 text-slate-900 relative overflow-x-hidden ${typoClass} ${baseFontSize}`}>
      
      {/* Background ambient light for Desktop view */}
      <div className="hidden md:block fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-amber-500/10 blur-[140px] rounded-full"></div>
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-indigo-500/10 blur-[140px] rounded-full"></div>
      </div>

      {/* Lateral Izquierdo: Branding Decorativo Profesional AxonMarket */}
      <div className="hidden lg:flex fixed left-6 xl:left-14 top-1/2 -translate-y-1/2 flex-col items-center gap-6 pointer-events-none select-none z-0">
        <div className="w-[1.5px] h-28 bg-gradient-to-b from-transparent via-amber-500/50 to-amber-500"></div>
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-sm backdrop-blur-md">
            <ShoppingBag size={18} className="stroke-[2.5]" />
          </div>
          <span className="[writing-mode:vertical-rl] rotate-180 text-xs font-black tracking-[0.4em] text-zinc-600 uppercase">
            AXON<span className="text-amber-600">MARKET</span>
          </span>
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
          <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-bold tracking-[0.3em] text-zinc-400 uppercase">
            MARKETPLACE LOCAL
          </span>
        </div>
        <div className="w-[1.5px] h-28 bg-gradient-to-t from-transparent via-amber-500/50 to-amber-500"></div>
      </div>

      {/* Lateral Derecho: Branding Decorativo Profesional AxonMarket */}
      <div className="hidden lg:flex fixed right-6 xl:right-14 top-1/2 -translate-y-1/2 flex-col items-center gap-6 pointer-events-none select-none z-0">
        <div className="w-[1.5px] h-28 bg-gradient-to-b from-transparent via-amber-500/50 to-amber-500"></div>
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-sm backdrop-blur-md">
            <ShoppingBag size={18} className="stroke-[2.5]" />
          </div>
          <span className="[writing-mode:vertical-rl] rotate-180 text-xs font-black tracking-[0.4em] text-zinc-600 uppercase">
            AXON<span className="text-amber-600">MARKET</span>
          </span>
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
          <span className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-bold tracking-[0.3em] text-zinc-400 uppercase">
            VENEZUELA
          </span>
        </div>
        <div className="w-[1.5px] h-28 bg-gradient-to-t from-transparent via-amber-500/50 to-amber-500"></div>
      </div>

      {/* Centered Mobile-First App Shell (Mismas dimensiones que MarketplaceDirectory) */}
      <div className="w-full max-w-md md:max-w-2xl lg:max-w-[720px] min-h-[100dvh] bg-slate-50 md:shadow-2xl md:border-x md:border-zinc-200/80 flex flex-col relative z-10">
      
      {isMerchantOwner && (
        <div className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] sm:text-xs font-black uppercase tracking-widest py-2 px-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 z-[100] relative shadow-md">
          <div className="flex items-center gap-2">
            <Zap size={14} className="animate-pulse" />
            <span>Modo Administrador Activo - Estás viendo tu tienda</span>
          </div>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="bg-black/80 hover:bg-black text-white px-4 py-1.5 rounded-full transition-colors flex items-center gap-2 shadow-sm font-bold text-[11px]"
          >
             <LayoutTemplate size={12} /> Volver al Panel
          </button>
        </div>
      )}

      {/* Background ambient light - Luminous warm amber/orange */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] blur-[140px] rounded-full translate-x-1/3 -translate-y-1/2 opacity-[0.07] bg-orange-400"></div>
        <div className="absolute bottom-0 left-0 w-[450px] h-[450px] blur-[120px] rounded-full -translate-x-1/4 translate-y-1/3 opacity-[0.04] bg-amber-300"></div>
      </div>

      {/* Alerta de Stock Premium */}
      <AnimatePresence>
        {stockAlert && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 20, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-4 bg-zinc-950/95 backdrop-blur-xl border border-red-500/30 px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(239,68,68,0.2)]"
          >
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30 shrink-0">
              <span className="text-red-500 font-bold text-xl leading-none">!</span>
            </div>
            <div>
              <p className="text-white text-sm font-bold m-0 leading-tight">
                {stockAlert.title}
              </p>
              <p className="text-zinc-400 text-xs m-0 leading-tight mt-1 max-w-[250px]">
                {stockAlert.message}
              </p>
            </div>
            <button 
              onClick={() => setStockAlert(null)}
              className="ml-2 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animación Flying Cart (Premium) */}
      {flyingItems.map(item => (
        <motion.img
          key={item.id}
          src={item.imgUrl}
          className="fixed z-[9999] rounded-2xl object-cover shadow-[0_20px_50px_rgba(0,0,0,0.5)] pointer-events-none border border-white/10"
          initial={{
            top: item.startY,
            left: item.startX,
            width: item.startWidth,
            height: item.startHeight,
            opacity: 1,
            scale: 1,
            rotate: 0
          }}
          animate={{
            top: item.endY,
            left: item.endX,
            width: 30,
            height: 30,
            opacity: 0.2,
            scale: 0.3,
            rotate: 15
          }}
          transition={{
            duration: 0.8,
            ease: [0.32, 0, 0.67, 0] // Curva para efecto parábola
          }}
        />
      ))}

      {showBanner && (
        <div className="w-full text-center text-black font-bold py-2 text-xs uppercase tracking-wider z-50 relative shadow-[0_0_15px_rgba(0,0,0,0.5)]" style={{ backgroundColor: primaryColor }}>
          {texts.banner}
        </div>
      )}

      {/* Navbar Superior (Limpio, integrado sin franja negra) */}
      {currentPage !== 'home' && (
      <nav 
        className="z-40 transition-all duration-300 px-4 md:px-8 py-2.5 sticky top-0 bg-white/95 backdrop-blur-md border-b border-zinc-200/80 shadow-xs"
      >
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setCurrentPage('home')}>
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); setCurrentPage('home'); }} 
              className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-800 hover:text-black flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-2xs border border-zinc-200/60"
              title="Volver al inicio"
            >
              <ChevronLeft size={18} className="stroke-[2.5]" />
            </button>
            <span 
              className="text-lg md:text-xl font-bold text-zinc-900 flex items-center gap-1.5"
              style={{ 
                fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif",
                letterSpacing: '-0.025em'
              }}
            >
              {config.business_name || 'MI TIENDA'}
              {config.is_verified && (
                <div title="Comercio Verificado" className="inline-flex mt-0.5">
                  <ShieldCheck size={18} className="text-amber-500 fill-amber-500/20" />
                </div>
              )}
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-6 text-xs font-semibold tracking-wider uppercase" style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}>
            <span onClick={() => setCurrentPage('home')} className="cursor-pointer transition-colors" style={{ color: currentPage === 'home' ? primaryColor : '#52525b' }}>{texts.nav1}</span>
            <span onClick={() => setCurrentPage('products')} className="cursor-pointer transition-colors hover:text-zinc-950" style={{ color: currentPage === 'products' ? primaryColor : '#52525b' }}>{texts.nav2 || 'Productos'}</span>
            <span onClick={() => setCurrentPage('offers')} className="cursor-pointer transition-colors hover:text-zinc-950" style={{ color: currentPage === 'offers' ? primaryColor : '#52525b' }}>{texts.nav3}</span>
          </div>
          
          <div className="flex items-center gap-2.5">
             <button onClick={() => navigate('/explorar')} className="hidden sm:flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-zinc-500 hover:text-zinc-900 transition-colors" style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}>
               <ArrowLeft size={15} /> Salir
             </button>
             <div className="h-4 w-[1px] bg-zinc-200 hidden sm:block"></div>
             
             {!currentCustomer && !isMerchantOwner ? (
               <button 
                 onClick={() => setShowAuthModal(true)} 
                 className="flex items-center gap-1.5 text-xs font-bold uppercase px-4 py-2 rounded-full transition-all active:scale-95 cursor-pointer border"
                 style={{
                   fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
                   letterSpacing: '0.04em',
                   backgroundColor: '#09090b',
                   color: '#fbbf24',
                   borderColor: 'rgba(251, 191, 36, 0.4)',
                   boxShadow: '0 2px 10px rgba(0, 0, 0, 0.12)'
                 }}
               >
                 <User size={13} className="text-amber-400 stroke-[2.5]" />
                 <span>INGRESAR</span>
               </button>
             ) : (
               <div className="flex items-center gap-3">
                 {currentCustomer && (
                   <button 
                     onClick={() => navigate('/profile')} 
                     className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-amber-500/50 transition-all focus:outline-none"
                     title="Mi Perfil"
                   >
                     {currentCustomer.profile_pic ? (
                       <img 
                         src={resolveImageUrl(currentCustomer.profile_pic)} 
                         alt="Perfil" 
                         className="w-8 h-8 rounded-full object-cover border border-zinc-300" 
                       />
                     ) : (
                       <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center border border-amber-300">
                         {(currentCustomer.name || currentCustomer.email || 'U').charAt(0).toUpperCase()}
                       </div>
                     )}
                   </button>
                 )}
               </div>
             )}
          </div>
        </div>
      </nav>
      )}

      {/* Pages */}
      <div className="flex-1 flex flex-col relative z-10">
        
        {/* INICIO - Formato Luminous White & Axon Orange */}
        {currentPage === 'home' && (
          <div className="flex-1 flex flex-col w-full pb-28 text-slate-900 bg-slate-50/50 relative">
            
            {/* Cabecera Superior Luminous White */}
            <div className="sticky top-0 left-0 w-full z-50 flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
              <button onClick={() => navigate('/explorar')} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all cursor-pointer text-slate-700 hover:text-slate-900 active:scale-90" title="Volver a AxonMarket">
                <ChevronLeft size={20} className="stroke-[2.5]" />
              </button>
              <div className="flex flex-col items-center">
                <span className="font-bold text-base text-slate-900 leading-tight">{config?.business_name || 'Mi Tienda'}</span>
                {userDistance ? (
                  <span className="text-xs font-bold text-orange-600 flex items-center gap-1 mt-0.5">{userDistance}</span>
                ) : isLocatingUser ? (
                  <span className="text-xs text-slate-400 mt-0.5">Calculando distancia real...</span>
                ) : config?.address || config?.location?.address || config?.expediente?.address ? (
                  <span className="text-xs text-slate-500 font-medium mt-0.5">📍 {config?.address || config?.location?.address || config?.expediente?.address}</span>
                ) : null}
              </div>
              <div className="w-10 flex items-center justify-end">
                {currentCustomer ? (
                  <button onClick={() => navigate('/profile')} className="transition-transform hover:scale-105" title="Mi Perfil">
                    {currentCustomer.profile_pic ? (
                      <img src={resolveImageUrl(currentCustomer.profile_pic)} alt="Perfil" className="w-8 h-8 rounded-full object-cover border-2 border-orange-400 shadow-sm" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-orange-500 text-white font-black text-xs flex items-center justify-center border-2 border-white shadow-sm">
                        {(currentCustomer.name || currentCustomer.email || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </button>
                ) : !isMerchantOwner && (
                  <button onClick={() => setShowAuthModal(true)} className="p-2 text-slate-600 hover:text-orange-600 transition-colors" title="Ingresar">
                    <User size={20} />
                  </button>
                )}
              </div>
            </div>

            {/* Hero Cover Header - La foto de portada abarca hasta el renglón de Estadísticas, justo arriba del botón Seguir */}
            <div className="relative w-full z-0 overflow-hidden pb-5 border-b border-slate-200/60 shadow-xs">
              {/* Imagen de Portada de Fondo */}
              {heroUrl ? (
                <div className="absolute inset-0 z-0">
                  <img 
                    src={resolveImageUrl(heroUrl)} 
                    alt="Cover" 
                    className="w-full h-full object-cover object-center block" 
                  />
                  {/* Overlay sutil para garantizar contraste y máxima legibilidad sin opacar la foto del fondo */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/15 to-black/55" />
                </div>
              ) : (
                <div className="absolute inset-0 z-0 bg-gradient-to-b from-orange-100/70 via-amber-50/40 to-slate-50">
                  <div className="absolute inset-0 bg-[radial-gradient(#ea580c_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.08]" />
                </div>
              )}

              {/* Contenido sobre la Portada (Avatar, Nombre, Handle, Calificar/EM y Estadísticas) */}
              <div className="relative z-10 pt-6 px-4 md:px-8 max-w-[1200px] mx-auto w-full flex flex-col items-center">
                
                {/* Avatar centrado con estilo profesional y anillo luminoso */}
                <div className="flex items-center justify-center w-full mb-3">
                  <div className="relative">
                    <div className="w-28 h-28 md:w-36 md:h-36 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-white ring-4 ring-white/30 flex items-center justify-center shrink-0">
                      {logoUrl ? (
                        <img src={resolveImageUrl(logoUrl)} alt="Logo" className="w-full h-full object-cover object-center block" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-orange-50 text-orange-600">
                          <Store size={44} />
                        </div>
                      )}
                    </div>
                    {config?.is_verified && (
                      <div className="absolute bottom-1 right-1 bg-blue-600 rounded-full p-1 z-20 border-2 border-white flex items-center justify-center shadow-md" title="Comercio Verificado">
                        <CheckCircle2 size={16} className="text-white" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Title & Slug (Blanco brillante y legible en fondos de portada) */}
                <div className="flex flex-col items-center text-center">
                  <div className="flex items-center gap-2 justify-center">
                    <h1 
                      className="text-2xl md:text-3xl font-black tracking-tight"
                      style={{ 
                        color: heroUrl ? '#ffffff' : '#0f172a',
                        textShadow: heroUrl ? '0 2px 8px rgba(0,0,0,0.9)' : 'none'
                      }}
                    >
                      {config?.business_name || 'Mi Tienda'}
                    </h1>
                  </div>
                  <p 
                    className="font-extrabold text-sm mt-0.5"
                    style={{ 
                      color: heroUrl ? '#f8fafc' : '#ea580c',
                      textShadow: heroUrl ? '0 1px 4px rgba(0,0,0,0.9)' : 'none'
                    }}
                  >
                    @{slug}
                  </p>
                  
                  {/* Rating & Delivery (EM redondeado compacto con su rayito) */}
                  <div className="flex items-center justify-center gap-2 mt-2.5 mb-3 text-sm font-medium flex-wrap">
                    <button 
                      onClick={() => {
                        if (!currentCustomer) {
                          setShowAuthModal(true);
                          return;
                        }
                        setShowReviewModal(true);
                      }} 
                      className={`inline-flex items-center gap-1.5 ${heroUrl ? 'bg-white/95 backdrop-blur-md text-slate-900 border-white/60 shadow-md hover:bg-white hover:scale-105' : 'bg-white border-slate-200/90 hover:border-orange-300 text-slate-800 shadow-xs hover:bg-orange-50/50'} border px-3.5 py-1.5 rounded-full transition-all cursor-pointer shrink-0`}
                    >
                      <Star size={14} className="fill-amber-400 text-amber-500" />
                      <span className="font-bold text-xs">Calificar {storeRatingAvg > 0 && `(${storeRatingAvg})`}</span>
                    </button>
                    {config?.has_enminutos_alliance && (
                      <div 
                        className="inline-flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-md border border-white/30 shrink-0"
                        style={{ color: '#ffffff' }}
                      >
                        <div className="flex items-center font-black tracking-tighter text-xs">
                          <span className="text-red-500 font-black">E</span>
                          <span className="text-red-500 font-black">M</span>
                          <Zap size={13} className="fill-yellow-400 text-yellow-400 ml-0.5" />
                        </div>
                        <span 
                          className="text-xs font-black tracking-wide whitespace-nowrap"
                          style={{ color: '#ffffff' }}
                        >
                          en minutos
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Estadísticas dentro de la portada, justo arriba del botón Seguir */}
                <div className="grid grid-cols-3 gap-3 max-w-[340px] mx-auto w-full text-center bg-white/95 backdrop-blur-md border border-white/50 rounded-2xl py-2.5 px-3 shadow-lg mt-1">
                  <div className="flex flex-col items-center">
                    <span className="font-black text-lg text-slate-900">{products.length + (storeNews?.length || 0)}</span>
                    <span className="text-slate-500 text-[11px] font-semibold">Publicaciones</span>
                  </div>
                  <div className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity border-x border-slate-200/80 px-2" onClick={() => setShowFollowersModal(true)}>
                    <span className="font-black text-lg text-slate-900">{followersCount}</span>
                    <span className="text-slate-500 text-[11px] font-semibold">Seguidores</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-black text-lg text-slate-900">{likesCount}</span>
                    <span className="text-slate-500 text-[11px] font-semibold">Me gusta</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Profile Content Container (Debajo de la Portada: Botones de Acción, Acerca de, etc.) */}
            <div className="relative z-10 px-4 md:px-8 max-w-[1200px] mx-auto w-full flex flex-col pt-3">

              {/* Botones de Acción */}
              <div className="flex gap-2.5 mt-2 w-full max-w-[440px] mx-auto">
                <button 
                  onClick={async () => {
                    if (!currentCustomer && !isMerchantOwner) {
                      setShowAuthModal(true);
                      return;
                    }
                    if (!currentCustomer || !workspaceId) return;
                    const newFollowing = !isFollowing;
                    setIsFollowing(newFollowing);
                    setFollowersCount(prev => newFollowing ? prev + 1 : Math.max(0, prev - 1));
                    try {
                      const res = await toggleFollowStore(workspaceId, currentCustomer.id);
                      setIsFollowing(res.isFollowing);
                      setFollowersCount(res.count);
                      if (showFollowersModal) {
                        const updatedList = await getStoreFollowersList(workspaceId);
                        setFollowersList(updatedList);
                      }
                    } catch (err) {
                      setIsFollowing(!newFollowing);
                      setFollowersCount(prev => !newFollowing ? prev + 1 : Math.max(0, prev - 1));
                    }
                  }}
                  className={`flex-1 ${isFollowing ? 'bg-slate-100 text-slate-700 border border-slate-300' : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-sm shadow-orange-500/25'} py-2.5 rounded-xl font-extrabold transition-all text-sm flex items-center justify-center gap-2 cursor-pointer`}
                >
                  {isFollowing ? (
                    <>
                      <CheckCircle2 size={18} className="text-emerald-600" />
                      <span>Siguiendo</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={18} />
                      <span>Seguir</span>
                    </>
                  )}
                </button>
                <button 
                  onClick={() => {
                    if (config?.socialLinks?.whatsapp) {
                      window.open(`https://wa.me/${config.socialLinks.whatsapp.replace(/\D/g, '')}`, '_blank');
                    } else if (config?.phone || config?.expediente?.phone) {
                      window.location.href = `tel:${config?.phone || config?.expediente?.phone}`;
                    } else {
                      alert('El comercio no tiene teléfono o WhatsApp registrado.');
                    }
                  }}
                  className="flex-1 bg-white hover:bg-orange-50 border border-slate-200 hover:border-orange-200 text-slate-800 hover:text-orange-600 py-2.5 rounded-xl font-extrabold transition-all text-sm shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Contactar
                </button>
                <button 
                  className="p-2.5 bg-white hover:bg-orange-50 border border-slate-200 hover:border-orange-200 text-slate-700 hover:text-orange-600 rounded-xl transition-all flex items-center justify-center shadow-xs cursor-pointer" 
                  onClick={() => { navigator.clipboard.writeText(window.location.href); alert('¡Enlace copiado!'); }}
                  title="Copiar enlace"
                >
                  <Link size={18} />
                </button>
                <div className="relative">
                  <button 
                    onClick={() => setShowSocialMenu(!showSocialMenu)} 
                    className="p-2.5 bg-white hover:bg-orange-50 border border-slate-200 hover:border-orange-200 text-slate-700 hover:text-orange-600 rounded-xl transition-all flex items-center justify-center shadow-xs cursor-pointer"
                    title="Redes sociales"
                  >
                    <Camera size={18} />
                  </button>
                  <AnimatePresence>
                    {showSocialMenu && config?.socialLinks && Object.values(config.socialLinks).some(val => val) && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-12 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 min-w-[190px] z-[100]"
                      >
                        {config.socialLinks.instagram && (
                          <a href={config.socialLinks.instagram.includes('http') ? config.socialLinks.instagram : `https://instagram.com/${config.socialLinks.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 transition-colors text-slate-700 hover:text-orange-600">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] text-pink-500"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                            <span className="text-sm font-bold">Instagram</span>
                          </a>
                        )}
                        {config.socialLinks.tiktok && (
                          <a href={config.socialLinks.tiktok.includes('http') ? config.socialLinks.tiktok : `https://tiktok.com/@${config.socialLinks.tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 transition-colors text-slate-700 hover:text-orange-600">
                            <Music2 size={18} className="text-slate-900" />
                            <span className="text-sm font-bold">TikTok</span>
                          </a>
                        )}
                        {config.socialLinks.facebook && (
                          <a href={config.socialLinks.facebook.includes('http') ? config.socialLinks.facebook : `https://facebook.com/${config.socialLinks.facebook}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 transition-colors text-slate-700 hover:text-orange-600">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] text-blue-500"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                            <span className="text-sm font-bold">Facebook</span>
                          </a>
                        )}
                        {config.socialLinks.whatsapp && (
                          <a href={`https://wa.me/${config.socialLinks.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 transition-colors text-slate-700 hover:text-orange-600">
                            <MessageCircle size={18} className="text-emerald-500" />
                            <span className="text-sm font-bold">WhatsApp</span>
                          </a>
                        )}
                      </motion.div>
                    )}
                    {showSocialMenu && (!config?.socialLinks || !Object.values(config.socialLinks).some(val => val)) && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-12 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl py-3 px-4 min-w-[200px] z-[100]"
                      >
                        <p className="text-xs text-slate-500 text-center">Este comercio aún no ha registrado redes sociales.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {showSocialMenu && (
                    <div className="fixed inset-0 z-40" onClick={() => setShowSocialMenu(false)}></div>
                  )}
                </div>
              </div>

              {/* Sección de Estados del Comercio (Estilo WhatsApp / Stories Cards) */}
              <div className="mt-5 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <h3 className="text-xs font-black tracking-wider uppercase text-slate-900 flex items-center gap-1.5" style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}>
                      <span>Estados y Promociones</span>
                    </h3>
                  </div>
                  {isMerchantOwner && (
                    <button
                      onClick={() => navigate('/social-feed')}
                      className="text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition-colors cursor-pointer"
                      style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}
                    >
                      <Plus size={13} className="stroke-[2.5]" />
                      <span>Nuevo estado</span>
                    </button>
                  )}
                </div>

                <div className="flex overflow-x-auto gap-3 py-1 px-0.5 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {merchantStatuses.map((status, idx) => (
                    <div 
                      key={status.id || idx}
                      onClick={() => {
                        setActiveStatusIndex(idx);
                        setIsStatusViewerOpen(true);
                      }}
                      className="relative w-24 sm:w-28 h-36 sm:h-40 rounded-2xl overflow-hidden cursor-pointer group snap-start shrink-0 select-none shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.03] active:scale-95 border border-zinc-200/80 bg-zinc-900"
                      title={`Ver estado: ${status.caption || status.name}`}
                    >
                      {/* Imagen de fondo / Preview del Estado */}
                      <img 
                        src={resolveImageUrl(status.mediaUrl || status.avatar)} 
                        alt="" 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = config?.coverUrl || config?.logoUrl || 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&q=80';
                        }}
                      />

                      {/* Degradado oscuro para que el texto y avatar resalten como en WhatsApp/Instagram */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40" />

                      {/* Avatar del comerciante en la esquina superior izquierda */}
                      <div className="absolute top-2 left-2 w-7 h-7 rounded-full p-[1.5px] bg-gradient-to-tr from-emerald-500 via-amber-500 to-orange-500 shadow-md">
                        <div className="w-full h-full rounded-full bg-white overflow-hidden">
                          {status.avatar ? (
                            <img 
                              src={resolveImageUrl(status.avatar)} 
                              alt="" 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <div className="w-full h-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-[10px]">
                              <Store size={14} />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Icono de Play en la esquina superior derecha */}
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/50 backdrop-blur-xs text-white flex items-center justify-center shadow-xs border border-white/20">
                        <Play size={10} fill="currentColor" className="text-amber-400 translate-x-[0.5px]" />
                      </div>

                      {/* Contenido / Título en la parte inferior */}
                      <div className="absolute bottom-2 left-2 right-2 flex flex-col">
                        <span className="text-[11px] font-bold text-white truncate drop-shadow-md leading-tight group-hover:text-amber-300 transition-colors">
                          {status.caption || status.name}
                        </span>
                        <span className="text-[9px] font-medium text-emerald-400 drop-shadow-xs">
                          {status.time || 'Hoy'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Acerca de */}
              <div className="mt-6 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                <h2 className="text-base font-black text-slate-900 mb-2 flex items-center gap-2">
                  <Building2 size={18} className="text-orange-600" />
                  <span>Acerca de</span>
                </h2>
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {config?.description || config?.expediente?.description || 'La mejor calidad para ti.'}
                  {(config?.address || config?.location?.address || config?.expediente?.address) && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 font-medium">
                      <MapPin size={14} className="text-red-500 shrink-0" />
                      <span>{config?.address || config?.location?.address || config?.expediente?.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Calificaciones de Clientes */}
              <div className="mt-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                <h2 className="text-base font-black text-slate-900 mb-3 flex items-center gap-2">
                  <Star size={18} className="fill-amber-400 text-amber-500" /> 
                  <span>Calificaciones de los Clientes</span>
                </h2>
                {storeReviewsList.length > 0 ? (
                  <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {storeReviewsList.map(review => (
                      <div key={review.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 shadow-xs">
                        <div className="flex justify-between items-start mb-1.5">
                          <span className="font-bold text-sm text-slate-900">{review.customer_name}</span>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} size={12} className={s <= review.rating ? 'fill-amber-400 text-amber-500' : 'fill-slate-200 text-slate-300'} />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 whitespace-pre-line">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">No hay calificaciones disponibles aún.</p>
                )}
              </div>

              {/* Horario */}
              <div className="mt-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Clock size={18} className="text-orange-600 shrink-0" />
                    <span>Horario</span>
                  </h2>
                  {(config?.scheduleProfile?.workDays || config?.schedule?.workDays) && (
                    <button 
                      type="button"
                      onClick={() => setShowFullSchedule(!showFullSchedule)}
                      className="text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors cursor-pointer px-2.5 py-1 rounded-lg hover:bg-orange-50"
                    >
                      {showFullSchedule ? 'Ocultar' : 'Ver todo'}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                    storeSchedule.status === 'closed'
                      ? 'bg-rose-50 text-rose-600 border border-rose-200'
                      : storeSchedule.status === 'closing'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : storeSchedule.status === 'unknown'
                      ? 'bg-slate-100 text-slate-600 border border-slate-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      storeSchedule.status === 'closed' ? 'bg-rose-500' : 
                      storeSchedule.status === 'closing' ? 'bg-amber-500 animate-pulse' : 
                      storeSchedule.status === 'unknown' ? 'bg-slate-400' : 'bg-emerald-500'
                    }`}></span>
                    {storeSchedule.status === 'closed' ? 'Cerrado' : 
                     storeSchedule.status === 'closing' ? 'Cierra pronto' : 
                     storeSchedule.status === 'unknown' ? 'No definido' : 'Abierto'}
                  </span>
                  <span className="text-slate-600 text-xs sm:text-sm font-medium">
                    · {storeSchedule.message}
                  </span>
                </div>

                {/* Vista Detallada de Horario */}
                {showFullSchedule && (config?.scheduleProfile?.workDays || config?.schedule?.workDays) && (() => {
                  const sched = config?.scheduleProfile || config?.schedule;
                  const currentDayIdx = new Date().getDay();
                  const daysMap = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
                  const todayName = daysMap[currentDayIdx];
                  const weekDays = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

                  return (
                    <div className="mt-4 flex flex-col gap-1.5 text-sm bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
                      {weekDays.map(day => {
                        const isToday = todayName === day;
                        const isOpen = Boolean(sched?.workDays?.[day]);
                        return (
                          <div 
                            key={day} 
                            className={`flex justify-between items-center px-3 py-2 rounded-xl transition-colors ${
                              isToday 
                                ? 'bg-orange-50 border border-orange-200' 
                                : 'border-b border-slate-200/50 last:border-0 hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`capitalize text-xs sm:text-sm ${
                                isToday 
                                  ? 'font-bold text-orange-900' 
                                  : 'font-medium text-slate-700'
                              }`}>
                                {day}
                              </span>
                              {isToday && (
                                <span className="text-[10px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded-md bg-orange-500 text-white leading-none">
                                  Hoy
                                </span>
                              )}
                            </div>
                            <span className="tracking-wide">
                              {isOpen ? (
                                <span className={`text-xs sm:text-sm font-bold ${
                                  isToday ? 'text-orange-950' : 'text-slate-900'
                                }`}>
                                  {sched.openTime || '08:00'} - {sched.closeTime || '18:00'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200">
                                  Cerrado
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Ubicación */}
              <div className="mt-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <MapPin size={18} className="text-orange-600 shrink-0" />
                    <span>Ubicación</span>
                  </h2>
                  <button 
                    type="button"
                    onClick={() => {
                      const lat = config?.location?.lat || config?.expediente?.gps?.lat;
                      const lng = config?.location?.lng || config?.expediente?.gps?.lng;
                      const addr = config?.address || config?.location?.address || config?.expediente?.address || config?.business_name || 'Venezuela';
                      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lat && lng ? `${lat},${lng}` : addr)}`);
                    }} 
                    className="text-xs sm:text-sm font-bold text-orange-600 hover:text-orange-700 transition-colors cursor-pointer px-2.5 py-1 rounded-lg hover:bg-orange-50"
                  >
                    Abrir en Maps
                  </button>
                </div>
                {(config?.address || config?.location?.address || config?.expediente?.address) && (
                  <p className="text-sm text-slate-600 mb-3">{config?.address || config?.location?.address || config?.expediente?.address}</p>
                )}
                
                <div className="w-full h-44 rounded-2xl relative overflow-hidden bg-slate-100 shadow-inner border border-slate-200 z-0 group">
                  {(config?.location?.lat || config?.expediente?.gps?.lat) && (config?.location?.lng || config?.expediente?.gps?.lng) ? (
                    <MapContainer 
                      center={[
                        Number(config?.location?.lat || config?.expediente?.gps?.lat), 
                        Number(config?.location?.lng || config?.expediente?.gps?.lng)
                      ]} 
                      zoom={15} 
                      style={{ height: "100%", width: "100%", zIndex: 0 }}
                      zoomControl={false}
                      dragging={false}
                      scrollWheelZoom={false}
                      doubleClickZoom={false}
                      attributionControl={false}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={[
                        Number(config?.location?.lat || config?.expediente?.gps?.lat), 
                        Number(config?.location?.lng || config?.expediente?.gps?.lng)
                      ]} />
                    </MapContainer>
                  ) : (
                    <div 
                      onClick={() => {
                        const addr = config?.address || config?.location?.address || config?.expediente?.address || config?.business_name || 'Venezuela';
                        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`);
                      }}
                      className="w-full h-full cursor-pointer relative bg-slate-100 flex items-center justify-center overflow-hidden group"
                    >
                      <div className="relative flex flex-col items-center group-hover:scale-110 transition-transform duration-300 z-10">
                        <div className="w-10 h-10 rounded-full border-2 border-white shadow-lg overflow-hidden bg-white mb-1 relative z-10">
                          {config?.logoUrl ? (
                            <img src={resolveImageUrl(config.logoUrl)} alt="Store" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-orange-500 flex items-center justify-center">
                              <Store size={16} className="text-white" />
                            </div>
                          )}
                        </div>
                        <div className="text-red-600 drop-shadow-md -mt-3 relative z-0">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/></svg>
                        </div>
                      </div>
                    </div>
                  )}
                  {(config?.location?.lat || config?.expediente?.gps?.lat) && (
                    <div 
                      className="absolute inset-0 z-[1] cursor-pointer" 
                      onClick={() => {
                        const lat = config?.location?.lat || config?.expediente?.gps?.lat;
                        const lng = config?.location?.lng || config?.expediente?.gps?.lng;
                        window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
                      }} 
                    />
                  )}
                </div>
              </div>

              {/* Boletín de Novedades y Noticias */}
              <div className="mt-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs mb-8">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Zap size={18} className="text-orange-600" />
                    <span>Novedades y Noticias</span>
                  </h2>
                </div>
                
                <div className="flex flex-col gap-4">
                  {storeNews.length > 0 ? storeNews.map((news) => (
                    <div key={news.id} className="bg-slate-50 rounded-xl border border-slate-200/70 overflow-hidden">
                      {news.image_url && (
                        <img src={news.image_url} alt={news.title} className="w-full h-44 sm:h-56 object-cover" />
                      )}
                      <div className="p-4">
                        <span className="text-xs font-bold text-orange-600 mb-1 block">
                          {new Date(news.created_at).toLocaleDateString()}
                        </span>
                        <h3 className="text-base font-black text-slate-900 mb-1 leading-tight">{news.title}</h3>
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{news.content}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-slate-400 font-medium border border-dashed border-slate-200 rounded-xl text-sm">
                      No hay novedades recientes en la tienda
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* OFERTAS */}
        {currentPage === 'offers' && (
          <div className="flex-1 flex flex-col w-full bg-slate-50 min-h-screen pb-28 relative">
            <div className="py-8 md:py-12 px-4 sm:px-8 border-b border-slate-200/80 bg-white relative overflow-hidden shadow-xs">
               <div className="max-w-[1400px] mx-auto relative z-10 flex flex-col justify-center">
                 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 text-xs font-bold w-max mb-2">
                   <Zap size={14} className="fill-amber-500 text-amber-500" />
                   <span>Promociones y Descuentos</span>
                 </div>
                 <h1 className={`${headingWeight} text-3xl md:text-5xl text-slate-900 tracking-tight font-extrabold`}>
                   {texts.offersTitle || 'Ofertas Flash'}
                 </h1>
                 <p className="text-slate-500 text-sm md:text-base mt-1">
                   Aprovecha los mejores precios y promociones exclusivas de la tienda.
                 </p>
               </div>
            </div>
            
            <div className="max-w-[1400px] mx-auto w-full px-4 md:px-8 py-8 md:py-12 relative z-10">
              <div className="flex flex-col md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {offerProducts.length > 0 ? offerProducts.map((p, i) => (
                  <div 
                    key={p.id}
                    id={`product-card-${p.id}`}
                    onClick={() => { if ((p.stock_vitrina || 0) > 0) openProductModal(p); }}
                    className={`group relative flex justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:border-amber-400 hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 ${(p.stock_vitrina || 0) <= 0 ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex-1 flex flex-col pt-1">
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <span className="text-[10px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md shadow-2xs">
                          {p.metadata?.offer_badge || '🔥 OFERTA FLASH'}
                        </span>
                        {p.metadata?.offer_limit_qty && (
                          <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md">
                            Máx. {p.metadata.offer_limit_qty} {p.unit_type || p.unit || 'und'}
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-slate-900 text-[15px] line-clamp-2 mb-1 group-hover:text-amber-600 transition-colors leading-tight">{p.name}</p>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed font-normal">{p.description || 'Sin descripción detallada.'}</p>
                      
                      <div className="mt-auto flex items-center justify-between gap-2 flex-wrap">
                         {isUserAllowedToSeePrices ? (
                            <div className="flex items-center gap-2">
                              <p className="font-black text-base text-amber-600">
                                ${Number(p.discount_price || p.price).toFixed(2)}
                                <span className="text-xs font-semibold text-slate-500 ml-1">/ {p.unit_type || p.unit || 'und'}</span>
                              </p>
                              <p className="text-xs text-slate-400 line-through">${Number(p.price).toFixed(2)}</p>
                            </div>
                          ) : (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setShowAuthModal(true); }}
                              className="text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition-colors border border-slate-200 inline-flex items-center gap-1.5"
                            >
                              <Lock size={12} /> Precio
                            </button>
                          )}
                          {(p.stock_vitrina || 0) > 0 ? (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              (p.stock_vitrina || 0) <= 5 
                                ? 'bg-amber-500/10 text-amber-700 border border-amber-500/20' 
                                : 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                            }`}>
                              {(p.stock_vitrina || 0) <= 5 ? `¡Solo quedan ${p.stock_vitrina}!` : `${p.stock_vitrina} en vitrina`}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 border border-red-500/20">
                              Agotado
                            </span>
                          )}
                      </div>
                    </div>

                    <div className="w-[100px] h-[100px] md:w-28 md:h-28 rounded-2xl bg-slate-100 overflow-hidden relative flex-shrink-0 border border-slate-200 shadow-sm self-center">
                      {p.image_url ? (
                        <img id={`product-img-${p.id}`} src={resolveImageUrl(p.image_url)} alt={p.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                           <ImageIcon size={24} />
                        </div>
                      )}
                      
                      <div className="absolute top-1 left-1 bg-amber-500 text-black text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1">
                        <Zap size={8} fill="currentColor" className="animate-pulse" /> OFERTA
                      </div>
                      
                      {(p.stock_vitrina || 0) <= 0 && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-10">
                          <span className="text-white text-[9px] font-bold uppercase tracking-widest bg-red-600/90 px-2 py-1 rounded">Agotado</span>
                        </div>
                      )}
                      
                      <div className="absolute bottom-[-1px] right-[-1px] z-20">
                        {isUserAllowedToSeePrices && cart[p.id] > 0 ? (
                          <div className="flex items-center gap-1 bg-white border-t border-l border-slate-200 rounded-tl-xl p-1 shadow-sm" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => removeFromCart(p.id, p.step_size)} className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 text-slate-700 transition-colors"><Minus size={12}/></button>
                            <span className="text-xs font-bold text-slate-900 min-w-[16px] text-center">{cart[p.id]}</span>
                            <button onClick={() => { if(!storeClosed) addToCart(p.id, p.step_size) }} className={`w-6 h-6 rounded-full flex items-center justify-center text-black transition-colors ${storeClosed ? 'cursor-not-allowed bg-slate-300' : 'bg-amber-500 hover:scale-110'}`}><Plus size={12}/></button>
                          </div>
                        ) : (
                          isUserAllowedToSeePrices && (p.stock_vitrina || 0) > 0 && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); if(storeClosed) return; addToCart(p.id, p.step_size || 1); }}
                              className="w-8 h-8 bg-amber-500 text-black rounded-tl-xl border-t border-l border-amber-600/20 flex items-center justify-center transition-all hover:bg-amber-400 active:scale-95 shadow-sm"
                            >
                              <Plus size={16} />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                    
                    {isMerchantOwner && (
                      <div className="absolute inset-0 z-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm rounded-xl">
                        <button 
                          onClick={(e) => { e.stopPropagation(); navigate(`/product-studio/${p.id}`); }}
                          className="bg-amber-500 text-black font-black uppercase tracking-widest text-[10px] px-5 py-2.5 rounded-full flex items-center gap-2 shadow-lg hover:scale-110 transition-transform"
                        >
                          <Pen size={14} /> Editar
                        </button>
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="col-span-full py-20 md:py-28 flex flex-col items-center justify-center text-center px-4">
                    <div className="w-20 h-20 rounded-3xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-5 shadow-xs border border-amber-500/20">
                      <Tag size={40} className="stroke-[1.8]" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">No hay promociones vigentes</h3>
                    <p className="text-slate-600 text-sm md:text-base max-w-md leading-relaxed mb-6">
                      En este momento no contamos con ofertas activas. Te invitamos a revisar nuestro catálogo de productos o a volver más tarde.
                    </p>
                    <button 
                      onClick={() => setCurrentPage('products')}
                      className="px-8 py-3.5 rounded-2xl text-sm font-bold tracking-wide transition-all bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/15 active:scale-95 flex items-center gap-2 cursor-pointer"
                    >
                      <ShoppingBag size={18} />
                      <span>Ir a Productos</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PRODUCTOS */}
        {currentPage === 'products' && (
          <div className="flex-1 flex flex-col w-full bg-slate-50 min-h-screen pb-20">
            
            {/* Barra superior de Categorías Principales */}
            <div className="bg-white sticky top-[49px] md:top-[53px] z-30 border-b border-zinc-200 px-3 sm:px-6 py-2 flex gap-2 overflow-x-auto scrollbar-hide shadow-xs">
               {mainCategories.map(mc => (
                 <button 
                   key={mc}
                   onClick={() => setActiveMainCategory(mc)}
                   style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}
                   className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-all border ${activeMainCategory === mc ? 'bg-amber-500 text-black border-amber-500 shadow-xs' : 'bg-white text-zinc-600 border-zinc-200 hover:border-amber-500 hover:text-amber-500'}`}
                 >
                   {mc}
                 </button>
               ))}
            </div>


            <div className="max-w-[1600px] mx-auto w-full flex flex-col md:flex-row px-3 sm:px-6 md:px-8 py-3.5 md:py-5 gap-3.5 md:gap-6">
               
               {/* Barra Lateral Izquierda: Subcategorías (Desktop) */}
                <div className="hidden md:block w-60 lg:w-64 flex-shrink-0">
                   <div className="bg-white rounded-2xl shadow-xs border border-zinc-200/80 p-3.5 sticky top-24">
                      <h3 className="font-bold text-sm uppercase tracking-wider mb-3 text-zinc-800 px-2 flex items-center justify-between">
                        <span>Explorar</span>
                        <span className="text-[10px] font-bold text-zinc-400 normal-case bg-zinc-100 px-2 py-0.5 rounded-full">{catalogProducts.length}</span>
                      </h3>
                      <div className="flex flex-col space-y-1">
                        {subCategories.map(sc => (
                          <button
                            key={sc}
                            onClick={() => setActiveSubCategory(sc)}
                            className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all ${activeSubCategory === sc ? 'bg-amber-500 text-black font-black shadow-xs' : 'text-zinc-600 hover:bg-zinc-50 font-semibold'}`}
                          >
                            <span className="flex-1 truncate">{sc}</span>
                          </button>
                        ))}
                      </div>
                   </div>
                </div>

                {/* Contenedor Principal de Productos */}
                <div className="flex-1 min-w-0">
                   
                   {/* Barra Compacta de Búsqueda, Subcategorías y Ordenar */}
                   <div className="bg-white p-2.5 sm:p-3 rounded-2xl shadow-xs border border-zinc-200/80 mb-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                     <div className="relative flex-1">
                       <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                         <Search size={16} />
                       </div>
                       <input 
                         type="text" 
                         placeholder="Buscar productos en el catálogo..." 
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                         className="w-full pl-9 pr-8 py-2 text-xs md:text-sm bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                       />
                       {searchQuery && (
                         <button 
                           type="button"
                           onClick={() => setSearchQuery('')}
                           className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-zinc-400 hover:text-zinc-600"
                           aria-label="Limpiar búsqueda"
                         >
                           <X size={14} />
                         </button>
                       )}
                     </div>

                     <div className="flex items-center gap-2">
                       {/* Selector de Subcategoría en Móvil */}
                       {subCategories.length > 1 && (
                         <div className="md:hidden flex-1 relative">
                           <select 
                             value={activeSubCategory}
                             onChange={(e) => setActiveSubCategory(e.target.value)}
                             aria-label="Filtrar por subcategoría"
                             className="w-full appearance-none bg-zinc-50 border border-zinc-200 rounded-xl pl-3 pr-7 py-2 text-xs font-bold text-zinc-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer"
                           >
                             {subCategories.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                           </select>
                           <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-zinc-400">
                             <ChevronRight size={13} className="rotate-90" />
                           </div>
                         </div>
                       )}

                       {/* Selector de Orden */}
                       <div className="relative flex-1 sm:flex-initial min-w-[130px]">
                         <select 
                           value={sortBy} 
                           onChange={(e) => setSortBy(e.target.value)}
                           aria-label="Ordenar productos"
                           className="w-full appearance-none bg-zinc-50 border border-zinc-200 rounded-xl pl-3 pr-7 py-2 text-xs font-bold text-zinc-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer"
                         >
                           <option value="newest">Más recientes</option>
                           <option value="priceAsc">Precio: Menor</option>
                           <option value="priceDesc">Precio: Mayor</option>
                           <option value="nameAsc">Nombre: A-Z</option>
                         </select>
                         <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-zinc-400">
                           <ChevronRight size={13} className="rotate-90" />
                         </div>
                       </div>
                     </div>
                   </div>

                   {catalogProducts.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5">
                      {catalogProducts.map((p, i) => (
                        <div 
                          key={p.id}
                          id={`product-card-${p.id}`}
                          onClick={() => { if ((p.stock_vitrina || 0) > 0) openProductModal(p); }}
                          className={`group bg-white rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md hover:border-amber-300 transition-all overflow-hidden flex flex-col relative ${(p.stock_vitrina || 0) <= 0 ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {/* Top Badges */}
                          {Boolean(p.is_offer) && (
                            <div className={`absolute top-2 left-2 z-10 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-sm ${
                              p.metadata?.is_combo 
                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600' 
                                : 'bg-gradient-to-r from-red-500 to-amber-500'
                            }`}>
                              {p.metadata?.is_combo 
                                ? (p.metadata?.combo_badge || '🎁 COMBO') 
                                : (p.metadata?.offer_badge || 'Oferta')}
                            </div>
                          )}
                          {(p.stock_vitrina || 0) <= 0 && (
                            <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] flex items-center justify-center z-20">
                              <span className="text-white text-xs font-bold uppercase tracking-widest bg-red-600/90 px-3 py-1.5 rounded-lg shadow-lg">Agotado</span>
                            </div>
                          )}

                          {/* Image */}
                          <div className="w-full aspect-square bg-white relative p-4 flex items-center justify-center border-b border-zinc-100">
                            {p.image_url ? (
                              <img id={`product-img-${p.id}`} src={resolveImageUrl(p.image_url)} alt={p.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-300">
                                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                              </div>
                            )}
                          </div>
                          
                          {/* Info */}
                          <div className="p-3 flex flex-col flex-1">
                            <h3 className="font-semibold text-zinc-800 text-sm line-clamp-2 leading-tight mb-1 min-h-[40px]">{p.name}</h3>
                            {p.metadata?.is_combo && Array.isArray(p.metadata?.combo_items) && (
                              <div className="mb-2">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-200/80 px-2 py-0.5 rounded-md">
                                  🎁 Incluye {p.metadata.combo_items.length} artículos
                                </span>
                              </div>
                            )}
                            <div className="flex items-center justify-between gap-1 mb-2.5">
                              <p className="text-xs text-zinc-500 font-medium">{p.step_size || 1} {p.unit || 'unidad'}</p>
                              {(p.stock_vitrina || 0) > 0 ? (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                  (p.stock_vitrina || 0) <= 5 
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}>
                                  {(p.stock_vitrina || 0) <= 5 ? `¡Solo quedan ${p.stock_vitrina}!` : `${p.stock_vitrina} en vitrina`}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200">
                                  Agotado
                                </span>
                              )}
                            </div>
                            
                            <div className="mt-auto flex items-end justify-between gap-1">
                              <div>
                                {isUserAllowedToSeePrices ? (
                                  p.is_offer ? (
                                    <div className="flex flex-col">
                                      <div className="flex items-baseline gap-1">
                                        <p className="font-bold text-base text-zinc-900 leading-none">${Number(p.discount_price || p.price).toFixed(2)}</p>
                                        <span className="text-[10px] text-zinc-500 font-semibold">/ {p.unit_type || p.unit || 'und'}</span>
                                      </div>
                                      <p className="text-[10px] text-zinc-400 line-through mt-0.5">${Number(p.price).toFixed(2)}</p>
                                      {p.metadata?.offer_limit_qty && (
                                        <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1 py-0.5 rounded mt-0.5 inline-block">
                                          Máx. {p.metadata.offer_limit_qty} por pedido
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-baseline gap-1">
                                      <p className="font-bold text-base text-zinc-900 leading-none">${Number(p.price).toFixed(2)}</p>
                                      <span className="text-[10px] text-zinc-500 font-semibold">/ {p.unit_type || p.unit || 'und'}</span>
                                    </div>
                                  )
                                ) : (
                                  <button onClick={(e) => { e.stopPropagation(); setShowAuthModal(true); }} className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">Ver Precio</button>
                                )}
                              </div>
                              
                              {/* Add Button */}
                              {isUserAllowedToSeePrices && (p.stock_vitrina || 0) > 0 && (
                                cart[p.id] > 0 ? (
                                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-1" onClick={(e) => e.stopPropagation()}>
                                    <button onClick={() => removeFromCart(p.id, p.step_size)} className="w-6 h-6 rounded-md bg-white text-amber-600 border border-amber-200 flex items-center justify-center shadow-sm"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"/></svg></button>
                                    <span className="text-xs font-bold text-amber-800 min-w-[12px] text-center">{cart[p.id]}</span>
                                    <button onClick={() => { if(!storeClosed) addToCart(p.id, p.step_size) }} className="w-6 h-6 rounded-md bg-amber-500 text-white flex items-center justify-center shadow-sm"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg></button>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); if(storeClosed) return; addToCart(p.id, p.step_size || 1); }}
                                    className="bg-white border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 font-bold px-4 py-1.5 rounded-lg text-[11px] tracking-wider shadow-sm transition-colors relative group-hover:bg-red-50"
                                  >
                                    ADD <span className="absolute top-0.5 right-1 text-[10px]">+</span>
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                          
                          {/* Edit Button for Merchant */}
                          {isMerchantOwner && (
                            <div className="absolute inset-0 z-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm rounded-2xl">
                              <button 
                                onClick={(e) => { e.stopPropagation(); navigate(`/product-studio/${p.id}`); }}
                                className="bg-amber-500 text-black font-black uppercase tracking-widest text-xs px-6 py-3 rounded-full flex items-center gap-2 shadow-xl hover:scale-105 transition-transform"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg> Editar
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 px-4 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-zinc-200/80 shadow-xs max-w-md mx-auto my-6">
                       <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-3.5 shadow-xs">
                         <Package size={28} className="stroke-[1.8]" />
                       </div>
                       <h3 className="text-base font-bold text-zinc-800 mb-1">No se encontraron productos</h3>
                       <p className="text-xs text-zinc-500 max-w-xs mb-4">
                         {searchQuery ? `No hay resultados para "${searchQuery}".` : 'No hay productos disponibles con los filtros actuales.'}
                       </p>
                       {(searchQuery || activeSubCategory !== 'Todos' || activeMainCategory !== 'Todas') && (
                         <button
                           type="button"
                           onClick={() => {
                             setSearchQuery('');
                             setActiveSubCategory('Todos');
                             setActiveMainCategory('Todas');
                           }}
                           className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-black rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
                         >
                           Ver todo el catálogo
                         </button>
                       )}
                    </div>
                  )}
               </div>
            </div>
          </div>
        )}
      </div>
      <footer className="bg-white border-t border-zinc-200 mt-auto relative z-10 py-8 px-6">
        <div className="max-w-[1400px] mx-auto flex flex-col items-center justify-center gap-3 text-center">
           <div className="flex items-center gap-2.5">
             <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-zinc-950 shadow-md shadow-amber-500/20 shrink-0">
               <ShoppingBag size={18} className="stroke-[2.5]" />
             </div>
             <span className="font-black tracking-tight text-zinc-950 uppercase text-sm">
               AXON<span className="text-amber-500 font-black">MARKET</span>
             </span>
           </div>
           <p className="text-zinc-500 font-medium text-xs tracking-wider">
             {texts.footerText || `© ${new Date().getFullYear()} Todos los derechos reservados.`}
           </p>
        </div>
      </footer>

      {/* Modal Visor de Estados / Historias de la Tienda estilo WhatsApp */}
      <MerchantStatusViewerModal
        isOpen={isStatusViewerOpen}
        onClose={() => setIsStatusViewerOpen(false)}
        statuses={merchantStatuses}
        initialIndex={activeStatusIndex}
        onNavigateStore={() => {}}
      />

                  {/* Product Modal Rediseñado: 100% Blanco y Anaranjado, Elegante y Mobile-Friendly */}
      <ResponsiveModal
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        className="md:max-w-3xl !bg-white bg-white text-slate-900 border border-slate-200 shadow-2xl rounded-t-3xl md:rounded-3xl overflow-hidden"
        contentClassName="p-0 flex flex-col md:flex-row max-h-[88vh] md:max-h-[80vh] overflow-hidden !bg-white bg-white text-slate-900"
      >
        {selectedProduct && (
          <>
            {/* Foto del Producto (Fondo claro suave, adaptable en móvil) */}
            <div className="md:w-5/12 bg-orange-50/40 relative flex items-center justify-center p-4 md:p-8 shrink-0 border-b md:border-b-0 md:border-r border-slate-100 min-h-[200px] md:min-h-[340px]">
              {selectedProduct.image_url ? (
                <img 
                  id={`modal-img-${selectedProduct.id}`} 
                  src={resolveImageUrl(selectedProduct.image_url)} 
                  alt={selectedProduct.name} 
                  className="w-full h-full object-contain max-h-48 md:max-h-64 transition-transform duration-300" 
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-orange-100/60 flex items-center justify-center text-orange-400">
                  <ImageIcon size={40} />
                </div>
              )}

              {/* Badge Promocional / Distintivo */}
              {selectedProduct.metadata?.is_combo ? (
                <div className="absolute top-3 left-3 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-[10px] md:text-xs uppercase tracking-wider px-2.5 py-1 rounded-lg z-20 shadow-sm">
                  {selectedProduct.metadata?.combo_badge || "🎁 COMBO"}
                </div>
              ) : Boolean(selectedProduct.is_offer) && (
                <div className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-amber-500 text-white text-[10px] md:text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg z-20 shadow-sm">
                  {selectedProduct.metadata?.offer_badge || "🔥 OFERTA FLASH"}
                </div>
              )}
            </div>
            
            {/* Información del Producto (Blanco y Anaranjado) */}
            <div className="md:w-7/12 p-4 md:p-7 flex flex-col relative overflow-y-auto custom-scrollbar flex-1 bg-white text-slate-900">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-orange-600">
                  {selectedProduct.category || 'Producto'}
                </span>
                {(selectedProduct.stock_vitrina || 0) > 0 ? (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    (selectedProduct.stock_vitrina || 0) <= 5
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {(selectedProduct.stock_vitrina || 0) <= 5
                      ? `¡Solo quedan ${selectedProduct.stock_vitrina}!`
                      : `${selectedProduct.stock_vitrina} disponibles`}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200">
                    Agotado
                  </span>
                )}
              </div>

              <h2 className="text-lg md:text-2xl font-black text-slate-900 leading-tight mb-2 tracking-tight">
                {selectedProduct.name}
              </h2>

              {/* Precios Claros en Anaranjado */}
              <div className="mb-3 flex items-baseline gap-2 flex-wrap">
                {isUserAllowedToSeePrices ? (
                  selectedProduct.is_offer ? (
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <p className="text-2xl md:text-3xl font-black text-orange-600 leading-none">
                        ${Number(selectedProduct.discount_price || selectedProduct.price).toFixed(2)}
                        <span className="text-xs font-semibold text-slate-500 ml-1">/ {selectedProduct.unit_type || selectedProduct.unit || 'und'}</span>
                      </p>
                      <p className="text-sm text-slate-400 line-through leading-none">
                        ${Number(selectedProduct.price).toFixed(2)}
                      </p>
                      {selectedProduct.metadata?.discount_pct && (
                        <span className="text-[10px] font-black bg-orange-50 text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded-md">
                          -{selectedProduct.metadata.discount_pct}% OFF
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-2xl md:text-3xl font-black text-slate-900 leading-none">
                      ${Number(selectedProduct.price).toFixed(2)}
                      <span className="text-xs font-semibold text-slate-500 ml-1">/ {selectedProduct.unit_type || selectedProduct.unit || 'und'}</span>
                    </p>
                  )
                ) : (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowAuthModal(true); }}
                    className="flex items-center gap-1.5 text-xs font-bold text-orange-700 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200"
                  >
                    <Lock size={14} /> Ver Precio
                  </button>
                )}

                {selectedProduct.metadata?.offer_limit_qty && (
                  <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md">
                    Límite: Máx. {selectedProduct.metadata.offer_limit_qty} por pedido
                  </span>
                )}
              </div>

              {/* Desglose de Productos Incluidos en el Combo */}
              {selectedProduct.metadata?.is_combo && Array.isArray(selectedProduct.metadata?.combo_items) && selectedProduct.metadata.combo_items.length > 0 && (
                <div className="mb-3 p-3 rounded-2xl bg-orange-50/70 border border-orange-200/80">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                    <span className="text-[11px] font-black uppercase text-orange-800 flex items-center gap-1">
                      <span>📦</span> Incluye {selectedProduct.metadata.combo_items.length} productos:
                    </span>
                    {selectedProduct.metadata?.original_sum_price > selectedProduct.price && (
                      <span className="text-[10px] font-bold text-slate-500">
                        Valor individual: ${Number(selectedProduct.metadata.original_sum_price).toFixed(2)}
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                    {selectedProduct.metadata.combo_items.map((ci, cIdx) => (
                      <div key={ci.id || cIdx} className="flex items-center justify-between p-2 rounded-xl bg-white border border-orange-200/60 shadow-2xs text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          {ci.image_url ? (
                            <img src={resolveImageUrl(ci.image_url)} alt={ci.name} className="w-6 h-6 rounded-md object-contain bg-slate-50 shrink-0" />
                          ) : (
                            <span className="text-xs">📦</span>
                          )}
                          <span className="font-semibold text-slate-800 truncate text-[11px]">{ci.name}</span>
                        </div>
                        <span className="font-bold text-orange-700 bg-orange-100/80 border border-orange-200 shrink-0 ml-1 text-[11px] px-2 py-0.5 rounded-md">
                          x{ci.qty || 1} {ci.unit || "und"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Descripción */}
              <div className="text-xs text-slate-600 font-normal leading-relaxed mb-4 line-clamp-3">
                <p>{selectedProduct.description || 'Sin descripción detallada disponible para este producto.'}</p>
              </div>

              {/* Barra de Compra Integrada (Blanco y Anaranjado) */}
              <div className="mt-auto pt-3 border-t border-slate-100 flex items-center gap-2.5">
                {isUserAllowedToSeePrices ? (
                  <>
                    <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1 shrink-0">
                      <button 
                        onClick={() => setModalQty(Math.max(1, modalQty - (selectedProduct.step_size || 1)))} 
                        className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 text-slate-800 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-9 text-center font-bold text-sm text-slate-900">{modalQty}</span>
                      <button 
                        onClick={() => setModalQty(modalQty + (selectedProduct.step_size || 1))} 
                        className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 text-slate-800 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <button 
                      onClick={storeClosed ? undefined : addModalToCart}
                      disabled={storeClosed || (selectedProduct.stock_vitrina || 0) <= 0}
                      className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <ShoppingBag size={16} />
                      <span>
                        {storeClosed ? 'Tienda Cerrada' : (selectedProduct.stock_vitrina || 0) <= 0 ? 'Agotado' : `Agregar • ${((selectedProduct.is_offer ? selectedProduct.discount_price : selectedProduct.price) * modalQty).toFixed(2)}`}
                      </span>
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setShowAuthModal(true); }}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <Lock size={16} /> Ingresa para Comprar
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </ResponsiveModal>

      {/* Cart Slide-over Premium (Glassmorphism Dark) */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[120] flex flex-col justify-end md:flex-row">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
          
          <div 
            className="w-full h-[100dvh] md:h-full md:max-w-[480px] relative z-10 shadow-2xl flex flex-col overflow-hidden bg-[#f4f7f4] md:border-l border-black/10"
          >
              {/* Header */}
              <div className="px-6 py-5 flex items-center justify-between border-b border-black/5 bg-white relative z-10">
                <div className="flex items-center gap-4">
                  {isCheckoutMode ? (
                    <button onClick={() => { if(checkoutStep === 2) setCheckoutStep(1); else setIsCheckoutMode(false); }} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors">
                      <ArrowLeft size={20} />
                    </button>
                  ) : (
                    <button onClick={() => { setIsCartOpen(false); setIsCheckoutMode(false); setCheckoutStep(1); }} className="text-zinc-500 hover:text-black transition-colors">
                      <X size={24} />
                    </button>
                  )}
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">Mi Carrito ({totalCartItems})</h2>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="hover:scale-105 transition-transform flex items-center justify-center w-8 h-8 rounded-lg overflow-hidden bg-white shadow-sm border border-black/5">
                  {config?.logoUrl ? (
                    <img src={resolveImageUrl(config.logoUrl)} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Store size={20} fill="currentColor" className="text-amber-500" />
                  )}
                </button>
              </div>

              {/* Items Area */}
              <div className="flex-1 overflow-y-auto px-8 py-8 scrollbar-hide relative z-10">
                {isCheckoutMode ? (
                  <div className="text-white">
                    {checkoutStep === 1 ? (
                      <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Paso 1: Dirección y Envío</h3>
                     
                     {/* Address Input */}
                     <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/10">
                       <label className="text-sm font-bold text-white mb-2 block">Dirección de Envío</label>
                       
                       {currentCustomer?.addresses && currentCustomer.addresses.length > 0 && !isAddingNewAddress ? (
                         <div className="space-y-3">
                           {currentCustomer.addresses.map(addr => (
                             <button
                               key={addr.id}
                               onClick={() => {
                                 setCheckoutAddress(addr.address);
                                 setCheckoutLocation((addr.lat && addr.lng) ? { lat: addr.lat, lng: addr.lng } : null);
                               }}
                               className={`w-full text-left p-3 rounded-xl border transition-all ${checkoutAddress === addr.address ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 bg-black/30 hover:bg-white/5'}`}
                             >
                               <div className="flex items-center justify-between">
                                 <span className="font-bold text-sm text-white">{addr.name}</span>
                                 {(addr.lat && addr.lng) && <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded flex items-center gap-1"><MapPin size={10}/> GPS</span>}
                               </div>
                               <p className="text-xs text-zinc-400 mt-1">{addr.address}</p>
                             </button>
                           ))}
                           <button onClick={() => setIsAddingNewAddress(true)} className="w-full py-2 text-xs font-bold text-amber-500 hover:text-amber-400 flex items-center justify-center gap-1">
                             <Plus size={14} /> Usar otra dirección
                           </button>
                         </div>
                       ) : (
                         <div className="space-y-3">
                           <div className="relative">
                             <MapPin size={14} className="absolute left-3 top-3 text-zinc-400" />
                             <textarea rows="2" value={checkoutAddress} onChange={e => setCheckoutAddress(e.target.value)} placeholder="Ingresa la dirección completa (Edificio, Casa, etc.)" className="w-full pl-9 pr-3 py-3 bg-black/50 border border-white/10 rounded-xl text-sm outline-none focus:border-white/30 text-white resize-none" />
                           </div>
                           
                           <div className="flex flex-col sm:flex-row gap-2">
                             <button 
                               onClick={getLocationFromGPS}
                               disabled={gpsLoading}
                               className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${checkoutLocation ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                             >
                               {gpsLoading ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                               {checkoutLocation ? '📍 GPS Capturado' : 'Usar mi ubicación GPS'}
                             </button>
                             {currentCustomer?.addresses && currentCustomer.addresses.length > 0 && (
                               <button onClick={() => setIsAddingNewAddress(false)} className="px-4 py-3 bg-zinc-800 text-white rounded-xl text-xs font-bold hover:bg-zinc-700 transition-colors">
                                 Volver
                               </button>
                             )}
                           </div>
                           {gpsError && <p className="text-red-400 text-xs font-bold">{gpsError}</p>}
                         </div>
                       )}
                     </div>

                     {/* Cupón de Descuento */}
                     <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/10">
                       <label className="text-sm font-bold text-white mb-2 block">¿Tienes un código de descuento?</label>
                       {appliedDiscount ? (
                         <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
                           <div className="flex items-center gap-2 text-emerald-400">
                             <Tag size={16} />
                             <span className="font-bold text-sm">{appliedDiscount.code} Aplicado</span>
                           </div>
                           <button onClick={() => setAppliedDiscount(null)} className="text-emerald-400 hover:text-emerald-300 text-xs font-bold uppercase tracking-wider">Quitar</button>
                         </div>
                       ) : (
                         <div className="relative flex gap-2">
                           <input type="text" value={discountCode} onChange={e => setDiscountCode(e.target.value)} placeholder="Ej. OTOÑO20" className="flex-1 px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-sm outline-none focus:border-white/30 text-white uppercase" />
                           <button onClick={handleApplyDiscount} disabled={isValidatingDiscount || !discountCode} className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
                             {isValidatingDiscount ? <Loader2 size={16} className="animate-spin" /> : 'Aplicar'}
                           </button>
                         </div>
                       )}
                       {discountError && <p className="text-red-400 text-xs mt-1">{discountError}</p>}
                     </div>

                      </div>
                    ) : (
                      <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                 <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                         {(config?.paymentProfile?.paymentMobile !== false) && (
                           <button 
                             onClick={() => setSelectedPaymentMethod('pago_movil')} 
                             className={`p-4 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold transition-all ${selectedPaymentMethod === 'pago_movil' ? 'bg-amber-500 border-amber-500 text-black shadow-lg scale-[1.02]' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`} 
                             style={selectedPaymentMethod === 'pago_movil' ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                           >
                             <Smartphone size={18} /> Pago Móvil
                           </button>
                         )}
                         {config?.paymentProfile?.zelleActive && (
                           <button 
                             onClick={() => setSelectedPaymentMethod('zelle')} 
                             className={`p-4 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold transition-all ${selectedPaymentMethod === 'zelle' ? 'bg-[#741eed] border-[#741eed] text-white shadow-lg shadow-[#741eed]/20 scale-[1.02]' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
                           >
                             <Zap size={18} /> Zelle
                           </button>
                         )}
                         {config?.paymentProfile?.cashActive && (
                           <button 
                             onClick={() => setSelectedPaymentMethod('cash')} 
                             className={`p-4 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold transition-all ${selectedPaymentMethod === 'cash' ? 'bg-white border-white text-black shadow-lg scale-[1.02]' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
                           >
                             <Building2 size={18} /> Efectivo
                           </button>
                         )}
                       </div>
                     </div>

                     {/* Payment Mobile Information */}
                     {selectedPaymentMethod === 'pago_movil' && (config?.paymentProfile?.paymentMobile !== false) && (
                        <div className="pt-2 space-y-3 animate-in slide-in-from-top-2">
                           <div className="p-4 border border-white/10 rounded-2xl bg-white/5 space-y-4">
                              <div className="flex flex-col gap-2 text-sm text-zinc-300">
                                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                                  <span className="font-extrabold text-white text-base flex items-center gap-2">
                                    <Smartphone size={18} className="text-amber-400" /> Datos de Pago Móvil
                                  </span>
                                  <span className="text-[11px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-1 rounded-full font-bold">
                                    Tasa BCV: Bs. {bcvRate || config?.bcvRate || 36.50}
                                  </span>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs sm:text-sm">
                                  <p><span className="font-bold text-white">Banco:</span> {config?.paymentProfile?.pmBank || 'Consultar con la tienda'}</p>
                                  <p><span className="font-bold text-white">Teléfono:</span> {config?.paymentProfile?.pmPhone || config?.expediente?.whatsapp || 'Consultar con la tienda'}</p>
                                  <p className="sm:col-span-2"><span className="font-bold text-white">Cédula / RIF:</span> {config?.paymentProfile?.pmId || 'Consultar con la tienda'}</p>
                                </div>

                                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl mt-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-300">Total en Divisa:</span>
                                    <span className="text-sm font-bold text-white">${finalCartTotal.toFixed(2)} USD</span>
                                  </div>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs font-bold text-amber-400">Total a Pagar (Bs):</span>
                                    <span className="text-base font-black text-amber-400">
                                      Bs. {(finalCartTotal * Number(bcvRate || config?.bcvRate || 36.50)).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-3 pt-2 border-t border-white/10">
                                {customerPaymentProfiles.length > 0 && (
                                  <div>
                                    <label className="text-xs font-semibold text-zinc-300 mb-1 block">¿Desde qué cuenta envías?</label>
                                    <select value={selectedPaymentProfileIdx} onChange={e => {
                                        const val = e.target.value;
                                        setSelectedPaymentProfileIdx(val);
                                        if (val !== '') {
                                          const profile = customerPaymentProfiles[Number(val)];
                                          if (profile) setPaymentBank(profile.bank || '');
                                        }
                                      }} className="w-full px-3 py-2.5 border border-white/10 rounded-xl text-sm bg-black/50 focus:outline-none focus:border-amber-500 text-white">
                                        <option value="">Selecciona cuenta guardada (opcional)</option>
                                        {customerPaymentProfiles.map((p, idx) => (
                                          <option key={idx} value={idx}>{p.bank} - {p.phone} ({p.titular})</option>
                                        ))}
                                    </select>
                                  </div>
                                )}

                                <div>
                                  <label className="text-xs font-semibold text-zinc-300 mb-1 block">Banco Emisor (desde donde pagas)</label>
                                  <input 
                                    type="text" 
                                    value={paymentBank} 
                                    onChange={e => {
                                      setPaymentBank(e.target.value);
                                      setSelectedPaymentProfileIdx('');
                                    }} 
                                    placeholder="Ej: Banesco, Banco de Venezuela, Mercantil, Provincial" 
                                    className="w-full px-3 py-2.5 border border-white/10 rounded-xl text-sm bg-black/50 focus:outline-none focus:border-amber-500 text-white placeholder-zinc-500" 
                                  />
                                </div>

                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-semibold text-zinc-300">Número de Referencia</label>
                                    {ocrStatus === 'analyzing' && (
                                      <span className="text-[11px] text-amber-400 flex items-center gap-1 font-bold animate-pulse">
                                        <Loader2 size={12} className="animate-spin" /> Analizando comprobante...
                                      </span>
                                    )}
                                    {ocrStatus === 'success' && (
                                      <span className="text-[11px] text-emerald-400 font-bold">
                                        ✅ Detectada automáticamente
                                      </span>
                                    )}
                                  </div>
                                  <input 
                                    type="text" 
                                    inputMode="numeric" 
                                    value={paymentReference} 
                                    onChange={e => setPaymentReference(e.target.value)} 
                                    placeholder="Ej: 123456 (últimos 4 a 6 dígitos o completa)" 
                                    className="w-full px-3 py-2.5 border border-white/10 rounded-xl text-sm bg-black/50 focus:outline-none focus:border-amber-500 text-white font-mono placeholder-zinc-500" 
                                  />
                                  {ocrMessage && ocrStatus !== 'analyzing' && (
                                    <p className={`text-[11px] mt-1 ${ocrStatus === 'success' ? 'text-emerald-400' : 'text-zinc-400'}`}>
                                      {ocrMessage}
                                    </p>
                                  )}
                                </div>
                                
                                <div>
                                  <label className="text-xs font-semibold text-zinc-300 mb-1 block">Comprobante de Pago</label>
                                  <div className="relative overflow-hidden p-4 border-2 border-dashed border-white/20 rounded-xl flex flex-col items-center justify-center gap-2 bg-black/30 hover:bg-white/5 transition-colors cursor-pointer group">
                                     <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                     {receiptUrl ? (
                                       <div className="flex flex-col items-center text-center">
                                         <div className="w-16 h-16 rounded-xl overflow-hidden border border-emerald-500/50 mb-2 relative shadow-md">
                                           <img src={receiptUrl} alt="Comprobante" className="w-full h-full object-cover" />
                                           <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                                             <ShieldCheck size={20} className="text-emerald-400" />
                                           </div>
                                         </div>
                                         <span className="text-xs font-bold text-emerald-400">Comprobante Cargado Exitosamente</span>
                                         <span className="text-[10px] text-zinc-400 mt-0.5">Toca para cambiar la imagen</span>
                                       </div>
                                     ) : receiptFile ? (
                                       <div className="text-center py-2">
                                         <Loader2 size={24} className="mx-auto text-amber-400 mb-2 animate-spin" />
                                         <span className="text-xs font-medium text-zinc-300">Procesando comprobante...</span>
                                       </div>
                                     ) : (
                                       <div className="text-center py-2 group-hover:scale-[1.02] transition-transform">
                                         <UploadCloud size={28} className="mx-auto text-amber-400 mb-2" />
                                         <span className="text-xs font-bold text-white block">Toca para subir captura del pago</span>
                                         <span className="text-[10px] text-zinc-400 mt-0.5 block">Formatos: JPG, PNG, WEBP</span>
                                       </div>
                                     )}
                                  </div>
                                </div>
                              </div>
                           </div>
                        </div>
                     )}

                     {/* Zelle Information */}
                     {selectedPaymentMethod === 'zelle' && config?.paymentProfile?.zelleActive && (
                        <div className="pt-2 space-y-3 animate-in slide-in-from-top-2">
                           <div className="p-4 border border-[#741eed]/30 rounded-2xl bg-[#741eed]/5 space-y-4">
                              <div className="flex flex-col gap-2 text-sm text-zinc-300">
                                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                                  <span className="font-extrabold text-white text-base flex items-center gap-2">
                                    <Zap size={18} className="text-[#741eed]" /> Datos de Zelle
                                  </span>
                                  <span className="text-[11px] bg-[#741eed]/20 text-[#a855f7] border border-[#741eed]/30 px-2.5 py-1 rounded-full font-bold">
                                    USD Directo
                                  </span>
                                </div>
                                <p><span className="font-bold text-white">Correo Zelle:</span> {config.paymentProfile.zelleEmail}</p>
                                <p><span className="font-bold text-white">Titular:</span> {config.paymentProfile.zelleName}</p>
                                <p className="text-xs text-zinc-400 mt-1">
                                  Monto a transferir: <span className="font-bold text-white">${finalCartTotal.toFixed(2)} USD</span>
                                </p>
                              </div>
                              
                              <div className="space-y-3 pt-2 border-t border-white/10">
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-semibold text-zinc-300">Referencia de Zelle</label>
                                    {ocrStatus === 'analyzing' && (
                                      <span className="text-[11px] text-[#a855f7] flex items-center gap-1 font-bold animate-pulse">
                                        <Loader2 size={12} className="animate-spin" /> Analizando comprobante...
                                      </span>
                                    )}
                                  </div>
                                  <input 
                                    type="text" 
                                    value={paymentReference} 
                                    onChange={e => setPaymentReference(e.target.value)} 
                                    placeholder="Código de confirmación o referencia" 
                                    className="w-full px-3 py-2.5 border border-white/10 rounded-xl text-sm bg-black/50 focus:outline-none focus:border-[#741eed] text-white font-mono placeholder-zinc-500" 
                                  />
                                  {ocrMessage && ocrStatus !== 'analyzing' && (
                                    <p className={`text-[11px] mt-1 ${ocrStatus === 'success' ? 'text-emerald-400' : 'text-zinc-400'}`}>
                                      {ocrMessage}
                                    </p>
                                  )}
                                </div>
                                
                                <div>
                                  <label className="text-xs font-semibold text-zinc-300 mb-1 block">Captura del Comprobante Zelle</label>
                                  <div className="relative overflow-hidden p-4 border-2 border-dashed border-[#741eed]/50 rounded-xl flex flex-col items-center justify-center gap-2 bg-[#741eed]/10 hover:bg-[#741eed]/20 transition-colors cursor-pointer group">
                                     <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                     {receiptUrl ? (
                                       <div className="flex flex-col items-center text-center">
                                         <div className="w-16 h-16 rounded-xl overflow-hidden border border-[#741eed]/50 mb-2 relative shadow-md">
                                           <img src={receiptUrl} alt="Comprobante" className="w-full h-full object-cover" />
                                           <div className="absolute inset-0 bg-[#741eed]/20 flex items-center justify-center">
                                             <ShieldCheck size={20} className="text-[#a855f7]" />
                                           </div>
                                         </div>
                                         <span className="text-xs font-bold text-[#a855f7]">Captura Subida Correctamente</span>
                                         <span className="text-[10px] text-zinc-400 mt-0.5">Toca para cambiar la imagen</span>
                                       </div>
                                     ) : receiptFile ? (
                                       <div className="text-center py-2">
                                         <Loader2 size={24} className="mx-auto text-[#741eed] mb-2 animate-spin" />
                                         <span className="text-xs font-medium text-zinc-300">Subiendo comprobante...</span>
                                       </div>
                                     ) : (
                                       <div className="text-center py-2 group-hover:scale-[1.02] transition-transform">
                                         <UploadCloud size={28} className="mx-auto text-[#741eed] mb-2" />
                                         <span className="text-xs font-bold text-white block">Sube la Captura de Zelle</span>
                                         <span className="text-[10px] text-zinc-400 mt-0.5 block">Formatos: JPG, PNG, WEBP</span>
                                       </div>
                                     )}
                                  </div>
                                </div>
                              </div>
                           </div>
                        </div>
                     )}

                      {/* Cash Information */}
                     {selectedPaymentMethod === 'cash' && config?.paymentProfile?.cashActive && (
                        <div className="pt-4 space-y-3 animate-in slide-in-from-top-2">
                           <div className="p-4 border border-white/10 rounded-xl bg-white/5 text-center">
                             <Building2 size={32} className="mx-auto text-zinc-400 mb-3" />
                             <h4 className="text-white font-bold mb-1">Pago en Efectivo</h4>
                             <p className="text-sm text-zinc-400">Pagarás tu pedido en efectivo al recibirlo.</p>
                             <p className="text-lg font-bold text-white mt-4">
                               Total: ${finalCartTotal.toFixed(2)}
                             </p>
                           </div>
                        </div>
                     )}
                      </div>
                    )}
                  </div>
                ) : totalCartItems === 0 ? (
                  <div className="text-center py-20 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-8 shadow-sm border border-black/5">
                      <Package size={48} className="text-zinc-300" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-3 tracking-tight">Carrito Vacío</h3>
                    <p className="text-zinc-500 text-sm mb-10 max-w-[250px] leading-relaxed">Tu bolsa de compras necesita un poco de acción. Explora nuestro catálogo.</p>
                    <button onClick={() => { setIsCartOpen(false); setCurrentPage('products'); }} className="px-10 py-4 text-white bg-amber-500 rounded-full text-xs font-bold tracking-widest uppercase transition-all shadow-lg shadow-amber-500/30 hover:scale-105">Descubrir Productos</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(cart).map(([id, qty], idx) => {
                      const p = products.find(prod => prod.id === id);
                      if (!p) return null;
                      const currentPrice = p.is_offer ? p.discount_price : p.price;
                      
                      return (
                        <div 
                          key={id}
                          className="flex gap-4 bg-white p-4 rounded-2xl shadow-sm border border-black/5 animate-in fade-in slide-in-from-right-4 duration-300 relative group"
                        >
                          <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => removeFromCart(p.id, cart[p.id])} className="w-6 h-6 flex items-center justify-center bg-white shadow-md text-red-500 rounded-full hover:bg-red-50 transition-colors"><X size={12} /></button>
                          </div>
                          
                          <div className="w-20 h-20 bg-white rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {p.image_url ? (
                              <img src={resolveImageUrl(p.image_url)} alt={p.name} className="w-full h-full object-contain" />
                            ) : (
                              <Package size={24} className="text-zinc-300" />
                            )}
                          </div>
                          
                          <div className="flex-1 flex flex-col justify-center">
                            <h5 className="text-sm font-bold text-slate-800 mb-0.5 line-clamp-1">{p.name}</h5>
                            <p className="text-xs text-zinc-400 mb-3">${Number(currentPrice).toFixed(2)} / unid</p>
                            
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <button onClick={() => removeFromCart(p.id, p.step_size)} className="w-8 h-8 flex items-center justify-center bg-amber-100 text-amber-600 hover:bg-amber-200 rounded-full transition-colors"><Minus size={14}/></button>
                                  <span className="w-4 text-center text-sm font-bold text-slate-800">{qty}</span>
                                  <button onClick={() => addToCart(p.id, p.step_size)} className="w-8 h-8 flex items-center justify-center bg-amber-100 text-amber-600 hover:bg-amber-200 rounded-full transition-colors"><Plus size={14}/></button>
                                </div>
                                <span className="font-bold text-slate-800 text-base">${(Number(currentPrice) * qty).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Cart Footer */}
              {totalCartItems > 0 && (
                <div className="px-5 md:px-8 py-4 md:py-8 pb-[max(1rem,env(safe-area-inset-bottom))] bg-zinc-950 border-t border-white/10 z-10 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="flex justify-between items-end mb-4 md:mb-8 bg-white/5 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-white/5">
                    <div>
                      <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest block mb-2">Subtotal</span>
                      <span className="text-white text-xs font-light opacity-60">Envío: {shippingCost === 0 ? 'Gratis' : `$${shippingCost.toFixed(2)}`}</span>
                      {appliedDiscount && (
                        <span className="text-emerald-400 text-xs font-bold opacity-80 block mt-1">Descuento: -${discountAmount.toFixed(2)}</span>
                      )}
                    </div>
                    <span className="text-4xl font-light text-white tracking-tighter">${finalCartTotal.toFixed(2)}</span>
                  </div>
                  
                  {storeClosed ? (
                    <div className={`w-full py-5 rounded-xl text-center text-sm font-bold border ${storeSchedule.status === 'closing' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                      {storeSchedule.status === 'closing' ? `No se aceptan pedidos. ${storeSchedule.message}` : `Tienda Cerrada. Horario: ${config.scheduleProfile.openTime} - ${config.scheduleProfile.closeTime}`}
                    </div>
                  ) : isCheckoutMode ? (
                    checkoutStep === 2 ? (
                      <button 
                        onClick={handleCheckoutSubmit} 
                        disabled={isSubmittingOrder}
                        className="w-full py-5 text-black rounded-full text-xs font-bold tracking-[0.3em] uppercase flex items-center justify-center gap-3 transition-all hover:scale-105 shadow-2xl relative overflow-hidden disabled:opacity-70 disabled:hover:scale-100"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {isSubmittingOrder ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
                        <span className="relative z-10 flex items-center gap-2">{isSubmittingOrder ? 'Procesando...' : 'Confirmar y Pagar'}</span>
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          setCheckoutStep(2);
                          if (!selectedPaymentMethod) {
                            if (config?.paymentProfile?.paymentMobile !== false) {
                              setSelectedPaymentMethod('pago_movil');
                            } else if (config?.paymentProfile?.zelleActive) {
                              setSelectedPaymentMethod('zelle');
                            } else if (config?.paymentProfile?.cashActive) {
                              setSelectedPaymentMethod('cash');
                            } else {
                              setSelectedPaymentMethod('pago_movil');
                            }
                          }
                        }}
                        disabled={!checkoutAddress}
                        className="w-full py-5 text-black rounded-full text-xs font-bold tracking-[0.3em] uppercase flex items-center justify-center gap-3 transition-all hover:scale-105 shadow-2xl relative overflow-hidden disabled:opacity-70 disabled:hover:scale-100"
                        style={{ backgroundColor: !checkoutAddress ? '#52525b' : primaryColor }}
                      >
                        <span className="relative z-10 flex items-center gap-2">Continuar al Pago <ArrowRight size={18} /></span>
                      </button>
                    )
                  ) : (
                    <button 
                      onClick={() => {
                         if (!currentCustomer) {
                           setAuthGateMode('login');
                           setIsCartOpen(false);
                         } else if (!currentCustomer.phone || !currentCustomer.docId || !currentCustomer.address || !currentCustomer.name || currentCustomer.name === currentCustomer.email.split('@')[0] || currentCustomer.name === currentCustomer.email) {
                           setIsWizardOpen(true);
                         } else {
                           setIsCheckoutMode(true);
                           setCheckoutStep(1);
                           trackEvent('checkout_start');
                         }
                      }} 
                      className="w-full py-5 text-black rounded-full text-xs font-bold tracking-[0.3em] uppercase flex items-center justify-center gap-3 transition-all hover:scale-105 shadow-2xl relative overflow-hidden group"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
                      <span className="relative z-10 flex items-center gap-2">Finalizar Compra <ArrowRight size={18} /></span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
      )}

      <AnimatePresence>
        {renderAuthModal()}
      </AnimatePresence>

      <ProfileWizardModal 
        isOpen={isWizardOpen} 
        onClose={() => setIsWizardOpen(false)} 
        customer={currentCustomer} 
        canClose={true}
        onComplete={(updatedCustomer) => {
          const rawPay = updatedCustomer?.payment_profile;
          let safePay = [];
          if (Array.isArray(rawPay)) safePay = rawPay;
          else if (rawPay && typeof rawPay === 'object' && Object.keys(rawPay).length > 0) safePay = [rawPay];
          
          const safeCust = {
            ...updatedCustomer,
            payment_profile: safePay,
            addresses: Array.isArray(updatedCustomer?.addresses) ? updatedCustomer.addresses : []
          };
          localStorage.setItem('ecommerce_current_customer', JSON.stringify(safeCust));
          setCurrentCustomer(safeCust);
          setIsWizardOpen(false);
          // Si el carrito estaba abierto y quería hacer checkout, lo habilitamos
          if (isCartOpen && totalCartItems > 0) {
            setIsCheckoutMode(true);
            trackEvent('checkout_start');
          }
        }} 
      />

      {/* Success Modal */}
      <ResponsiveModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        className="md:max-w-sm bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10"
        contentClassName="p-8 text-center"
      >
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="text-emerald-500" size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">¡Pedido Exitoso!</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8">Tu orden ha sido recibida y está siendo procesada.</p>
        
        <div className="space-y-3">
          <button 
            onClick={() => navigate('/profile', { state: { tab: 'pedidos' } })}
            className="w-full py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
          >
            Ver estado de mi pedido <ArrowRight size={18} />
          </button>
          <button 
            onClick={() => setShowSuccessModal(false)}
            className="w-full py-3.5 bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-xl font-bold transition-colors"
          >
            Seguir comprando
          </button>
        </div>
      </ResponsiveModal>

      {/* Followers Modal */}
      <ResponsiveModal
        isOpen={showFollowersModal}
        onClose={() => setShowFollowersModal(false)}
        className="md:max-w-sm bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 p-0 overflow-hidden"
        contentClassName="p-0"
      >
        <div className="p-4 border-b border-white/10 flex justify-between items-center sticky top-0 bg-zinc-950 z-10">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">Seguidores</h2>
            <span className="text-xs bg-amber-500/10 text-amber-400 font-bold px-2 py-0.5 rounded-full border border-amber-500/20">
              {followersCount}
            </span>
          </div>
          <button 
            onClick={() => setShowFollowersModal(false)}
            className="text-zinc-400 hover:text-white p-1 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar flex flex-col gap-3">
          {loadingFollowers ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-500">
              <Loader2 className="animate-spin text-amber-500" size={24} />
              <span className="text-xs">Cargando seguidores...</span>
            </div>
          ) : followersList.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-600 mb-3">
                <User size={24} />
              </div>
              <p className="text-sm font-semibold text-zinc-300">Aún no hay seguidores</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-[220px]">
                Sé el primer cliente registrado en seguir esta tienda.
              </p>
            </div>
          ) : (
            followersList.map((follower) => {
              const isMe = currentCustomer && (String(follower.customerId) === String(currentCustomer.id) || follower.email === currentCustomer.email);
              const initials = (follower.name || 'C').slice(0, 2).toUpperCase();
              return (
                <div key={follower.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
                  {follower.profilePic ? (
                    <img 
                      src={follower.profilePic} 
                      alt={follower.name} 
                      className="w-10 h-10 rounded-full object-cover border border-white/10" 
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-xs">
                      {initials}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm text-white truncate block">
                      {follower.name} {isMe && <span className="text-amber-400 text-xs font-normal">(Tú)</span>}
                    </span>
                    <span className="text-[11px] text-zinc-500 block truncate">
                      {follower.email ? follower.email : 'Cliente verificado'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ResponsiveModal>

      {/* Review Modal */}
      <ResponsiveModal
        isOpen={showReviewModal}
        onClose={() => { setShowReviewModal(false); setReviewSent(false); }}
        className="md:max-w-sm bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10"
        contentClassName="p-6 md:p-8 text-center"
      >
        {!reviewSent ? (
          <>
            <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white mb-2">Califica a {config?.business_name || 'la tienda'}</h2>
            <p className="text-sm text-slate-500 mb-6">Tu opinión nos ayuda a mejorar.</p>
            
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map(star => (
                <button 
                  key={star} 
                  onClick={() => setReviewRating(star)}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star 
                    size={36} 
                    className={star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200 dark:fill-slate-800 dark:text-slate-800'} 
                  />
                </button>
              ))}
            </div>

            <textarea
              rows="3"
              placeholder="Escribe tu opinión sobre la tienda..."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="w-full p-4 mb-6 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl resize-none text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800 dark:text-white"
            />

            <button 
              onClick={async () => {
                if (!reviewRating || !reviewComment.trim()) {
                  alert("Por favor califica y escribe un comentario.");
                  return;
                }
                setIsSubmittingReview(true);
                try {
                  await supabase.from('ecommerce_reviews').insert([{
                    workspace_id: workspaceId || slug,
                    customer_name: currentCustomer.name,
                    customer_id: currentCustomer.id,
                    rating: reviewRating,
                    comment: reviewComment,
                    product_id: 'store_review',
                    product_name: 'Tienda en General',
                    status: 'Pendiente'
                  }]);
                  setReviewSent(true);
                } catch (err) {
                  console.error(err);
                  alert("Error al enviar la reseña.");
                }
                setIsSubmittingReview(false);
              }}
              disabled={isSubmittingReview}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-colors shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmittingReview ? <Loader2 className="animate-spin" size={20} /> : 'Enviar Calificación'}
            </button>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="text-amber-500" size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">¡Gracias por calificar!</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8">Tu reseña ha sido enviada al comercio y está pendiente de aprobación.</p>
            <button 
              onClick={() => { setShowReviewModal(false); setReviewSent(false); }}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors"
            >
              Cerrar
            </button>
          </>
        )}
      </ResponsiveModal>

      {/* Tools Modal (Calculadora, etc) */}
      <ResponsiveModal isOpen={isToolsModalOpen} onClose={() => setIsToolsModalOpen(false)} title="Herramientas" disableAnimation={true}>
        <div className="space-y-5">
          {/* Calculadora Multi-Moneda */}
          <div className="bg-slate-50 dark:bg-zinc-900/70 rounded-2xl p-5 border border-slate-200 dark:border-white/10 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                <Calculator className="text-amber-500" size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">Calculadora BCV</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">Tasa oficial: <span className="font-bold text-slate-700 dark:text-zinc-300">{bcvRate} Bs.</span></p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-slate-400 font-bold">$</span>
                </div>
                <input
                  type="number"
                  placeholder="Monto en dólares"
                  value={calcUSD}
                  onChange={(e) => setCalcUSD(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-10 pr-4 text-slate-800 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {calcUSD && !isNaN(calcUSD) && bcvRate !== '...' && (
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 border border-amber-200/80 dark:border-amber-900/40">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-amber-800 dark:text-amber-300 font-medium">Equivalente:</span>
                    <span className="text-xl font-black text-amber-900 dark:text-amber-200">
                      Bs. {(parseFloat(calcUSD) * parseFloat(bcvRate)).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Simulador de Compra */}
          <div className="bg-slate-50 dark:bg-zinc-900/70 rounded-2xl p-5 border border-slate-200 dark:border-white/10 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                <ShoppingCart className="text-amber-500" size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">Simulador de Pago</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">Calcula tu compra con cupones y descuentos</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Product list for simulator (first 5 to not crowd) */}
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                {products.slice(0, 5).map(p => {
                  const qty = simulatedCart[p.id] || 0;
                  return (
                    <div key={p.id} className="flex items-center justify-between bg-white dark:bg-zinc-800 p-2.5 rounded-xl border border-slate-200/80 dark:border-white/5">
                      <div className="flex flex-col max-w-[130px]">
                        <span className="text-xs font-bold text-slate-800 dark:text-white truncate">{p.name}</span>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">${p.price}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          type="button"
                          onClick={() => simulateAddToCart(p, -1)} 
                          disabled={qty <= 0} 
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 flex items-center justify-center disabled:opacity-40 text-slate-700 dark:text-zinc-200 transition-colors"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="text-xs font-black w-5 text-center text-slate-900 dark:text-white">{qty}</span>
                        <button 
                          type="button"
                          onClick={() => simulateAddToCart(p, 1)} 
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 flex items-center justify-center text-slate-700 dark:text-zinc-200 transition-colors"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Discount Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Cupón (Ej: DESCUENTO10)"
                  value={simulatedDiscountCode}
                  onChange={(e) => setSimulatedDiscountCode(e.target.value)}
                  className="flex-1 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-amber-500 uppercase placeholder:text-slate-400"
                />
                <button 
                  type="button"
                  onClick={handleApplySimulatedDiscount} 
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs px-4 rounded-xl font-bold transition-colors shadow-xs"
                >
                  Aplicar
                </button>
              </div>

              {/* Totals */}
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 border border-amber-200/80 dark:border-amber-900/40">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-600 dark:text-zinc-400 font-medium">Subtotal USD:</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-white">
                    ${simulatedTotalUsd.toFixed(2)}
                  </span>
                </div>
                {simulatedDiscountPct > 0 && (
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Descuento ({simulatedDiscountPct}%):</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      -${(simulatedTotalUsd * (simulatedDiscountPct/100)).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="h-px bg-amber-200 dark:bg-amber-900/50 my-2.5"></div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-900 dark:text-white font-bold">Total Estimado:</span>
                  <div className="text-right">
                    <div className="text-lg font-black text-amber-900 dark:text-amber-200">${finalSimulatedUsd.toFixed(2)}</div>
                    {bcvRate !== '...' && (
                      <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                        ~ Bs. {(finalSimulatedUsd * parseFloat(bcvRate)).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            type="button"
            onClick={() => { setIsToolsModalOpen(false); navigate('/explorar'); }}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-xs"
          >
            <Map size={18} /> Explorar más tiendas
          </button>
        </div>
      </ResponsiveModal>
      {/* Botón flotante en esquina izquierda cuando la barra está oculta */}
      {!isBottomNavOpen && (
        <button
          onClick={() => setIsBottomNavOpen(true)}
          className="fixed bottom-5 left-4 md:left-[calc(50%-330px)] z-50 w-12 h-12 rounded-full dark-glass-fab flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
          style={{
            backgroundColor: 'rgba(10, 10, 10, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.75)'
          }}
          title="Abrir menú"
          aria-label="Abrir menú de navegación"
        >
          <Store size={22} className="stroke-[2.2] text-amber-400" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
          </span>
        </button>
      )}

      {/* Mobile Bottom Navigation Bar - Negro transparente ultra moderno (Glassmorphism de lujo, Cero Lag) */}
      {isBottomNavOpen && (
        <nav 
          className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[420px] z-50 rounded-2xl dark-glass-nav"
          style={{
            backgroundColor: 'rgba(12, 12, 14, 0.82)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)'
          }}
        >
          <div className="flex justify-between items-center h-16 px-2 relative">
            <button
              onClick={() => setCurrentPage('home')}
              className="flex-1 flex flex-col items-center gap-1 p-2 active:scale-90 transition-transform cursor-pointer"
              style={currentPage === 'home' ? { color: '#f59e0b' } : { color: '#d4d4d8' }}
            >
              <Store size={22} className={currentPage === 'home' ? "stroke-[2.4] text-amber-400" : "text-zinc-300"} />
              <span className={`text-[10px] ${currentPage === 'home' ? 'font-black text-amber-400' : 'font-semibold text-zinc-300'}`}>{texts?.nav1 || 'Inicio'}</span>
            </button>
            
            <button
              onClick={() => setCurrentPage('products')}
              className="flex-1 flex flex-col items-center gap-1 p-2 active:scale-90 transition-transform cursor-pointer"
              style={currentPage === 'products' ? { color: '#f59e0b' } : { color: '#d4d4d8' }}
            >
              <Package size={22} className={currentPage === 'products' ? "stroke-[2.4] text-amber-400" : "text-zinc-300"} />
              <span className={`text-[10px] ${currentPage === 'products' ? 'font-black text-amber-400' : 'font-semibold text-zinc-300'}`}>{texts?.nav2 || 'Catálogo'}</span>
            </button>

            {/* Standard Button for Cart */}
            <button
              onClick={() => (currentCustomer || isMerchantOwner) ? setIsCartOpen(true) : setShowAuthModal(true)}
              className="flex-1 flex flex-col items-center gap-1 p-2 active:scale-90 transition-transform relative cursor-pointer"
              style={isCartOpen ? { color: '#f59e0b' } : { color: '#d4d4d8' }}
            >
              <div className="relative">
                <ShoppingCart size={22} className={isCartOpen ? "stroke-[2.4] text-amber-400" : "text-zinc-300"} />
                {totalCartItems > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-4 h-4 px-1 text-black font-black text-[9px] flex items-center justify-center rounded-full shadow-sm bg-amber-400">
                    {totalCartItems}
                  </span>
                )}
              </div>
              <span className={`text-[10px] ${isCartOpen ? 'font-black text-amber-400' : 'font-semibold text-zinc-300'}`}>Carrito</span>
            </button>

            <button
              onClick={() => setCurrentPage('offers')}
              className="flex-1 flex flex-col items-center gap-1 p-2 active:scale-90 transition-transform cursor-pointer"
              style={currentPage === 'offers' ? { color: '#f59e0b' } : { color: '#d4d4d8' }}
            >
              <Tag size={22} className={currentPage === 'offers' ? "stroke-[2.4] text-amber-400" : "text-zinc-300"} />
              <span className={`text-[10px] ${currentPage === 'offers' ? 'font-black text-amber-400' : 'font-semibold text-zinc-300'}`}>{texts?.nav3 || 'Ofertas'}</span>
            </button>

            {/* Botón para cerrar la barra al instante y liberar pantalla */}
            <button
              onClick={() => setIsBottomNavOpen(false)}
              className="absolute -top-3 -right-2 w-7 h-7 rounded-full border border-white/25 flex items-center justify-center shadow-lg cursor-pointer text-zinc-300 hover:text-white transition-colors"
              style={{ backgroundColor: 'rgba(24, 24, 27, 0.95)' }}
              title="Ocultar menú"
            >
              <X size={14} />
            </button>
          </div>
        </nav>
      )}

      {/* Spacer for bottom nav */}
      <div className="h-20" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
      </div> {/* Fin del Contenedor Central Móvil */}
    </div> {/* Fin del Wrapper de Escritorio */}
  </GoogleOAuthProvider>
  );
}
