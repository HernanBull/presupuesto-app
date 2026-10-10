import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, LayoutTemplate, Image as ImageIcon, Calculator, ChevronRight, Heart, X, Plus, Minus, ShoppingBag, ArrowLeft, Lock, Store, User, UserPlus, Zap, Package, ArrowRight, Loader2, Tag, Pen, Smartphone, UploadCloud, ShieldCheck, Hash, MapPin, Map, CreditCard, Star, CheckCircle, CheckCircle2, Clock, Trash2, Building2, Eye, EyeOff, Link, Camera, ChevronLeft, MoreHorizontal, Bike, ChefHat, MessageCircle, Music2, Search, Grid, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import ProfileWizardModal from '../components/ProfileWizardModal';
import ResponsiveModal from '../components/ResponsiveModal';
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

const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url;
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
  const [showFullSchedule, setShowFullSchedule] = useState(false);
  const [showSocialMenu, setShowSocialMenu] = useState(false);
  const [storeNotFound, setStoreNotFound] = useState(false);
  const [config, setConfig] = useState(null);
  const [authGateMode, setAuthGateMode] = useState('login');
  const [isFollowing, setIsFollowing] = useState(false);
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
  
  const [currentCustomer, setCurrentCustomer] = useState(null);

  const customerPaymentProfiles = useMemo(() => {
    if (!currentCustomer?.payment_profile) return [];
    let p = currentCustomer.payment_profile;
    if (typeof p === 'string') {
      try { p = JSON.parse(p); } catch(e) { return []; }
    }
    if (p && !Array.isArray(p)) return [p];
    return p || [];
  }, [currentCustomer]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [ocrStatus, setOcrStatus] = useState('idle');
  const [ocrMessage, setOcrMessage] = useState('');
  
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
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const baseFollowersList = [
    { id: 'f1', name: 'María González', profilePic: 'https://i.pravatar.cc/150?u=maria' },
    { id: 'f2', name: 'Carlos Díaz', profilePic: 'https://i.pravatar.cc/150?u=carlos' },
    { id: 'f3', name: 'Ana Pérez', profilePic: 'https://i.pravatar.cc/150?u=ana' },
    { id: 'f4', name: 'Luis Martínez', profilePic: 'https://i.pravatar.cc/150?u=luis' },
    { id: 'f5', name: 'Andrea Gómez', profilePic: 'https://i.pravatar.cc/150?u=andrea' },
    { id: 'f6', name: 'Jorge Silva', profilePic: 'https://i.pravatar.cc/150?u=jorge' },
  ];
  const currentFollowers = isFollowing && currentCustomer ? 
    [{ id: currentCustomer.id, name: currentCustomer.name + ' (Tú)', profilePic: currentCustomer.profile_pic || 'https://i.pravatar.cc/150?u=' + currentCustomer.email }, ...baseFollowersList] : 
    baseFollowersList;

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
    if (!config?.scheduleProfile?.openTime) return { status: 'unknown', message: 'Horario no especificado' };
    const { workDays, openTime, closeTime, closeWarningMinutes = 30 } = config.scheduleProfile;
    if (!workDays || !openTime || !closeTime) return { status: 'unknown', message: 'Horario no especificado' };
    
    const currentDayIdx = new Date().getDay();
    const daysMap = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const currentDayName = daysMap[currentDayIdx];
    
    if (!workDays[currentDayName]) return { status: 'closed', message: `Cerrado (Hoy ${currentDayName} no laborable)` };
    
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
      alert(`Por favor sube la captura de tu ${selectedPaymentMethod === 'zelle' ? 'Zelle' : 'Pago Móvil'}`);
      return;
    }
    setIsSubmittingOrder(true);
    trackEvent('checkout_start');
    
    // Preparar Items
    const orderItems = Object.entries(cart).map(([id, qty]) => {
      const p = products.find(prod => prod.id === id);
      return { id: p.id, name: p.name, price: p.is_offer ? p.discount_price : p.price, quantity: qty, sku: p.sku };
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
        bank: selectedPaymentMethod === 'zelle' ? 'Zelle' : paymentBank,
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
          setOcrMessage('❌ No pudimos leer la referencia de forma segura. Por favor, ingrésala manualmente.');
        }
      } catch (err) {
        console.error("Error en OCR:", err);
        setOcrStatus('error');
        setOcrMessage('❌ Error de IA al escanear comprobante.');
      }
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `receipts/${workspaceId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('ecommerce').upload(filePath, file);
      if (!uploadError) {
        const { data } = supabase.storage.from('ecommerce').getPublicUrl(filePath);
        if(data && data.publicUrl) {
          setReceiptUrl(data.publicUrl);
        }
      } else {
        throw uploadError;
      }
    } catch (error) {
      console.error(error);
      alert('Error subiendo imagen');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const { data: user, error } = await supabase
        .from('ecommerce_customers')
        .select('*')
        .eq('email', authForm.email)
        .eq('password', authForm.password)
        .maybeSingle();
        
      if (error || !user) {
        alert('Credenciales incorrectas');
        setAuthLoading(false);
        return false;
      }
      
      const mappedUser = {
        ...user,
        docId: user.doc_id,
        orders: []
      };
      
      localStorage.setItem('ecommerce_current_customer', JSON.stringify(mappedUser));
      localStorage.removeItem('activeWorkspace');
      setCurrentCustomer(mappedUser);
      
      if (!mappedUser.phone || !mappedUser.docId || !mappedUser.address || !mappedUser.name || mappedUser.name === mappedUser.email.split('@')[0] || mappedUser.name === mappedUser.email) {
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
      
      const { email, name } = decoded;
      
      let { data: user } = await supabase
        .from('ecommerce_customers')
        .select('*')
        .eq('email', email)
        .maybeSingle();
        
      let isNewUser = false;
      if (!user) {
        isNewUser = true;
        const id = 'CUS-' + Math.floor(Math.random() * 1000000);
        const payload = {
          id,
          email,
          password: 'oauth-google',
          name,
          phone: '',
          doc_id: '',
          address: '',
          wishlist: [],
          join_date: new Date().toISOString()
        };
        await supabase.from('ecommerce_customers').insert([payload]);
        user = payload;
        
        // Send Welcome Email
        supabase.functions.invoke('send-welcome-email', {
          body: { email: user.email, name: user.name }
        }).catch(e => console.error('Error sending welcome email:', e));
      }
      
      const mappedUser = { ...user, docId: user.doc_id, orders: [] };
      localStorage.setItem('ecommerce_current_customer', JSON.stringify(mappedUser));
      localStorage.removeItem('activeWorkspace');
      setCurrentCustomer(mappedUser);
      
      if (isNewUser) {
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

    // Bloqueo estricto: Verificar confirmación de correo antes de añadir al carrito
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !user.email_confirmed_at) {
        alert("Para añadir productos al carrito y comprar, primero debes verificar tu correo electrónico. Por favor, revisa tu bandeja de entrada o verifica desde tu perfil.");
        return;
      }
    } catch (e) {
      console.error("Error verificando estado del correo:", e);
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
        const { data: storeData, error: storeError } = await supabase.from('workspaces').select('*').eq('store_slug', slug || 'tienda-ejemplo').single();
        if (storeError || !storeData) {
          const savedStr = localStorage.getItem('storefrontConfig');
          if (savedStr) {
             const saved = JSON.parse(savedStr);
             saved.texts = { ...defaultTexts, ...(saved.texts || {}) };
             setConfig(saved);
             setWorkspaceId('default_workspace');
             const { data: pData, error: pError } = await supabase.from('ecommerce_products').select('*').eq('workspace_id', 'default_workspace');
             if (!pError && pData) {
               const published = pData
                 .filter(p => p.publish_status === 'Publicado' || p.publish_status === 'Activo')
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
        
        let saved = storeData.config?.storefront || storeData.config;
        if (!saved || Object.keys(saved).length === 0) {
          saved = {
            themeMode: 'dark', primaryColor: '#f59e0b', typography: 'font-sans', baseFontSize: 'text-base', headingWeight: 'font-light',
            logoUrl: null, headerStyle: 'transparent', showBanner: false, heroUrl: null, heroLayout: 'centered',
            buttonStyle: 'rounded-full', cardStyle: 'elevated', catalogFilterStyle: 'sidebar', offersCountdown: true, discountBadgeColor: '#ef4444',
            sections: [
              { id: 'sec-hero-1', type: 'hero' },
              { id: 'sec-feat-1', type: 'featured' }
            ],
            animationsEnabled: true
          };
        }
        
        saved.texts = { ...defaultTexts, ...(saved.texts || {}) };
        if (!Array.isArray(saved.sections)) {
          saved.sections = [{ id: 'sec-hero-1', type: 'hero' }, { id: 'sec-feat-1', type: 'featured' }];
        }
        
        // Ensure logo and cover are taken from the main store config if not explicitly set in storefront
        if (storeData.config) {
          saved.logoUrl = storeData.config.logoUrl || saved.logoUrl;
          saved.heroUrl = storeData.config.coverUrl || saved.heroUrl || saved.coverUrl;
        }
        
        saved.business_name = storeData.name;
        setConfig(saved);
        trackEvent('visit', storeData.id);

        const { data: pData, error: pError } = await supabase.from('ecommerce_products').select('*').eq('workspace_id', storeData.id);
        if (!pError && pData) {
          const published = pData
             .filter(p => p.publish_status === 'Publicado' || p.publish_status === 'Activo')
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
        className="md:max-w-md border border-white/10"
        contentClassName="p-8 relative"
      >
        <div className="absolute top-0 left-0 w-full h-1 z-10" style={{ background: `linear-gradient(90deg, transparent, ${primaryColor}, transparent)` }}></div>
        
        <div className="flex justify-center mb-8 pt-2">
          <div className="w-20 h-20 rounded-[24px] flex items-center justify-center border border-white/10 relative group">
            <div className="absolute inset-0 blur-xl opacity-30 group-hover:opacity-50 transition-opacity" style={{ backgroundColor: primaryColor }}></div>
            <Lock size={32} className="text-white relative z-10" />
          </div>
        </div>

        <h1 className="text-2xl font-light text-white text-center mb-2 tracking-tight">Accede Privado</h1>
        <p className="text-zinc-400 text-center text-sm font-light mb-8">
          Inicia sesión o regístrate para acceder a los precios de <span className="text-white font-normal capitalize">{storeName}</span>.
        </p>

        <div className="flex bg-zinc-900 rounded-full p-1 mb-8 border border-white/5">
          <button onClick={() => setAuthGateMode('login')} className={`flex-1 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${authGateMode === 'login' ? 'bg-zinc-800 text-white shadow-lg border border-white/5' : 'text-zinc-500 hover:text-white'}`} style={{ color: authGateMode === 'login' ? primaryColor : '' }}>Ingresar</button>
          <button onClick={() => setAuthGateMode('register')} className={`flex-1 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${authGateMode === 'register' ? 'bg-zinc-800 text-white shadow-lg border border-white/5' : 'text-zinc-500 hover:text-white'}`} style={{ color: authGateMode === 'register' ? primaryColor : '' }}>Crear Cuenta</button>
        </div>

        <form onSubmit={async (e) => {
          const success = authGateMode === 'login' ? await handleLogin(e) : await handleRegister(e);
          if (success) setShowAuthModal(false);
        }} className="space-y-4">
          {authGateMode === 'register' && (
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Nombre Completo</label>
              <input type="text" required value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none transition-colors font-light placeholder-zinc-700 focus:bg-zinc-800" placeholder="Tu nombre" onFocus={(e) => e.target.style.borderColor = primaryColor} onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}/>
            </div>
          )}
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Correo Electrónico</label>
            <input type="email" required value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none transition-colors font-light placeholder-zinc-700 focus:bg-zinc-800" placeholder="tu@correo.com" onFocus={(e) => e.target.style.borderColor = primaryColor} onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}/>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Contraseña</label>
            <div className="relative">
              <input type={showAuthPassword ? "text" : "password"} required value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 pr-12 text-white focus:outline-none transition-colors font-light placeholder-zinc-700 focus:bg-zinc-800" placeholder="••••••••" onFocus={(e) => e.target.style.borderColor = primaryColor} onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}/>
              <button type="button" onClick={() => setShowAuthPassword(!showAuthPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors" onMouseOver={(e) => e.currentTarget.style.color = primaryColor} onMouseOut={(e) => e.currentTarget.style.color = ''}>
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
                  <input type={showAuthConfirmPassword ? "text" : "password"} required value={authConfirmPassword} onChange={e => setAuthConfirmPassword(e.target.value)} className={`w-full bg-zinc-900 border ${authConfirmPassword && authConfirmPassword !== authForm.password ? 'border-red-500/50' : 'border-white/5'} rounded-2xl px-5 py-4 pr-12 text-white focus:outline-none transition-colors font-light placeholder-zinc-700`} placeholder="••••••••" onFocus={(e) => e.target.style.borderColor = primaryColor} onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'} />
                  <button type="button" onClick={() => setShowAuthConfirmPassword(!showAuthConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors" onMouseOver={(e) => e.currentTarget.style.color = primaryColor} onMouseOut={(e) => e.currentTarget.style.color = ''}>
                    {showAuthConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {authConfirmPassword && authConfirmPassword !== authForm.password && (
                  <p className="text-red-500 text-xs mt-2">Las contraseñas no coinciden.</p>
                )}
              </div>
              
              <div className="flex items-start gap-3 bg-white/5 border border-white/5 rounded-2xl p-4 mt-4">
                <input
                  type="checkbox"
                  id="store-terms-checkbox"
                  checked={termsAccepted}
                  onChange={e => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-amber-500 shrink-0 cursor-pointer"
                />
                <label htmlFor="store-terms-checkbox" className="text-xs text-zinc-400 leading-relaxed cursor-pointer">
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
            className="w-full py-4 text-black font-bold text-xs tracking-[0.2em] uppercase rounded-full transition-all hover:-translate-y-0.5 mt-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: primaryColor, boxShadow: `0 0 30px ${primaryColor}30` }}
          >
            {authLoading ? <Loader2 className="animate-spin" size={16} /> : (authGateMode === 'login' ? 'Acceder al Comercio' : 'Crear Cuenta y Entrar')}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-zinc-600 text-xs font-bold uppercase tracking-widest">
          <span className="w-1/4 border-b border-white/5"></span>
          <span>o continuar con</span>
          <span className="w-1/4 border-b border-white/5"></span>
        </div>
        
        <div className="mt-6 flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => alert('Fallo al conectar con Google')}
            theme="filled_black"
            shape="pill"
            text="continue_with"
          />
        </div>
      </ResponsiveModal>
    );
  };

  const recentProducts = products.slice(0, 8);
  const offerProducts = products.filter(p => !!p.is_offer);
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

  let catalogProducts = products;
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
    <div className={`min-h-screen w-full flex flex-col bg-black text-slate-50 relative overflow-x-hidden ${typoClass} ${baseFontSize}`}>
      
      {isMerchantOwner && (
        <div className="w-full bg-amber-500 text-black text-[10px] sm:text-xs font-black uppercase tracking-widest py-2 px-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 z-[100] relative shadow-[0_0_30px_rgba(245,158,11,0.3)]">
          <div className="flex items-center gap-2">
            <Zap size={14} className="animate-pulse" />
            <span>Modo Administrador Activo - Estás viendo tu tienda</span>
          </div>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="bg-black/90 text-amber-500 px-4 py-1.5 rounded-full hover:bg-black transition-colors flex items-center gap-2 shadow-sm"
          >
             <LayoutTemplate size={12} /> Volver al Panel
          </button>
        </div>
      )}

      {/* Background ambient light */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] blur-[150px] rounded-full translate-x-1/3 -translate-y-1/2 opacity-[0.15]" style={{ backgroundColor: primaryColor }}></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] blur-[120px] rounded-full -translate-x-1/4 translate-y-1/3 bg-zinc-800/40"></div>
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

      {/* Navbar (Premium Glassmorphism) */}
      {currentPage !== 'home' && (
      <nav className={`z-40 transition-all duration-300 px-6 md:px-12 py-5 sticky top-0 ${
        isTransparentHeader ? 'bg-gradient-to-b from-black/80 to-transparent border-none' : 'bg-zinc-950/80 backdrop-blur-2xl border-b border-white/5 shadow-2xl'
      }`}>
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setCurrentPage('home')}>
            <span className={`text-2xl font-black tracking-tight text-white flex items-center gap-2`}>
              {config.business_name || 'MI TIENDA'}
              {config.is_verified && (
                <div title="Comercio Verificado" className="inline-flex mt-1">
                  <ShieldCheck size={20} className="text-blue-500 fill-blue-500/20" />
                </div>
              )}
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-bold tracking-widest uppercase">
            <span onClick={() => setCurrentPage('home')} className="cursor-pointer transition-colors" style={{ color: currentPage === 'home' ? primaryColor : '#71717a' }}>{texts.nav1}</span>
            <span onClick={() => setCurrentPage('products')} className="cursor-pointer transition-colors hover:text-white" style={{ color: currentPage === 'products' ? primaryColor : '#71717a' }}>{texts.nav2 || 'Productos'}</span>
            <span onClick={() => setCurrentPage('offers')} className="cursor-pointer transition-colors hover:text-white" style={{ color: currentPage === 'offers' ? primaryColor : '#71717a' }}>{texts.nav3}</span>
          </div>
          
          <div className="flex items-center gap-6">
             <button onClick={() => navigate('/')} className="hidden sm:flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-zinc-400 hover:text-white transition-colors">
               <ArrowLeft size={16} /> Salir
             </button>
             <div className="h-4 w-[1px] bg-white/10 hidden sm:block"></div>
             
             {!currentCustomer && !isMerchantOwner ? (
               <button onClick={() => setShowAuthModal(true)} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full transition-colors border border-white/5 hover:border-white/20">
                 <User size={14} /> Ingresar
               </button>
             ) : (
               <motion.button 
                 ref={cartIconRef}
                 onClick={() => setIsCartOpen(true)} 
                 className="relative p-2 text-zinc-400 hover:text-white transition-all group z-50"
                 animate={cartBounce ? { scale: [1, 1.4, 1] } : {}}
                 transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
               >
                 <div className="absolute inset-0 rounded-full scale-0 group-hover:scale-100 transition-transform blur-md opacity-20" style={{ backgroundColor: primaryColor }}></div>
                 <ShoppingBag size={22} className="relative z-10" />
                 <AnimatePresence>
                   {totalCartItems > 0 && (
                     <motion.span 
                       initial={{ scale: 0 }}
                       animate={{ scale: 1 }}
                       exit={{ scale: 0 }}
                       className="absolute top-0 right-0 w-4 h-4 text-black text-[9px] font-black flex items-center justify-center rounded-full border border-zinc-950 z-20 shadow-md" 
                       style={{ backgroundColor: primaryColor }}
                     >
                       {totalCartItems}
                     </motion.span>
                   )}
                 </AnimatePresence>
               </motion.button>
             )}
          </div>
        </div>
      </nav>
      )}

      {/* Pages */}
      <div className="flex-1 flex flex-col relative z-10">
        
        {/* INICIO */}
        {currentPage === 'home' && (
          <div className="flex-1 flex flex-col w-full pb-24 text-white relative">
            
            {/* Cabecera Flotante (Life Burger Style) */}
            <div className="absolute top-0 left-0 w-full z-50 flex items-center justify-between px-4 py-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-auto">
              <button onClick={() => navigate('/')} className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer text-pure-white">
                <ChevronLeft size={24} color="white" />
              </button>
              <div className="flex flex-col items-center">
                <span className="font-bold text-lg text-pure-white">{config?.business_name || 'Mi Tienda'}</span>
                <span className="text-xs text-pure-white opacity-80">A 13.98 Km de ti</span>
              </div>
              <div className="w-10"></div>

            </div>

            {/* Hero Background (Absolute) */}
            <div className="absolute top-0 left-0 w-full h-[420px] md:h-[500px] z-0 bg-zinc-800">
              {heroUrl ? (
                <img src={resolveImageUrl(heroUrl)} alt="Cover" className="w-full h-full object-cover opacity-80" />
              ) : (
                <div className="w-full h-full bg-gradient-to-t from-white to-zinc-800"></div>
              )}
            </div>

            {/* Profile Content Container (Relative on top of Hero) */}
            <div className="relative z-10 pt-[180px] md:pt-[220px] px-4 md:px-8 max-w-[1400px] mx-auto w-full flex flex-col">
              
              {/* Avatar */}
              <div className="flex justify-center w-full mb-4">
                <div className="relative">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-[6px] border-[#F8F9FA] overflow-hidden bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                    {logoUrl ? (
                      <img src={resolveImageUrl(logoUrl)} alt="Logo" className="w-full h-full object-cover bg-white" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Store size={40} className="text-zinc-500" />
                      </div>
                    )}
                  </div>
                  {config?.is_verified && (
                    <div className="absolute bottom-1 right-1 bg-blue-600 rounded-full p-1 z-20 border-2 border-black flex items-center justify-center shadow-lg">
                      <CheckCircle2 size={16} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </div>
              </div>

              {/* Title & Slug */}
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center gap-2 justify-center">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-pure-white">
                    {config?.business_name || 'Mi Tienda'}
                  </h1>
                </div>
                <p className="text-pure-white opacity-80 font-medium text-base mt-1">@{slug}</p>
                
                {/* Rating & Delivery */}
                <div className="flex items-center justify-center gap-3 mt-3 mb-4 text-sm font-medium">
                  <button 
                    onClick={() => {
                      if (!currentCustomer) {
                        setShowAuthModal(true);
                        return;
                      }
                      setShowReviewModal(true);
                    }} 
                    className="flex items-center gap-1.5 bg-white text-black hover:bg-zinc-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm"
                  >
                    <Star size={14} className="fill-black" />
                    <span className="font-bold text-xs">Calificar {storeRatingAvg > 0 && `(${storeRatingAvg})`}</span>
                  </button>
                  {config?.has_enminutos_alliance && (
                    <>
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-600"></div>
                      <button className="flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-white/10 px-3 py-1.5 rounded-full transition-colors cursor-pointer shadow-lg">
                        <div className="flex items-center font-black tracking-tighter">
                          <span className="text-red-600 text-sm">E</span>
                          <span className="text-red-600 text-sm">M</span>
                          <Zap size={14} className="fill-yellow-400 text-yellow-400 ml-0.5" />
                        </div>
                        <span className="text-pure-white text-xs font-semibold tracking-wide">en minutos</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Estadísticas */}
              <div className="grid grid-cols-3 gap-4 max-w-[300px] mx-auto mt-6 pb-2 w-full text-center">
                <div className="flex flex-col items-center">
                  <span className="font-bold text-xl">{products.length}</span>
                  <span className="text-zinc-400 text-sm">Publicaciones</span>
                </div>
                <div className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setShowFollowersModal(true)}>
                  <span className="font-bold text-xl">{89 + (isFollowing ? 1 : 0)}</span>
                  <span className="text-zinc-400 text-sm">Seguidores</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-bold text-xl">233</span>
                  <span className="text-zinc-400 text-sm">Me gusta</span>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex gap-2 mt-6 w-full">
                <button 
                  onClick={() => {
                    if (!currentCustomer && !isMerchantOwner) {
                      setShowAuthModal(true);
                      return;
                    }
                    setIsFollowing(!isFollowing);
                  }}
                  className={`flex-1 ${isFollowing ? 'bg-amber-600 text-black border-none' : 'bg-amber-500 hover:bg-amber-600 text-black border-none'} py-2 rounded-xl font-bold transition-colors text-sm flex items-center justify-center gap-2 shadow-sm`}
                >
                  {isFollowing ? (
                    <>
                      <CheckCircle2 size={18} className="text-black" />
                      Siguiendo
                    </>
                  ) : (
                    <>
                      <UserPlus size={18} />
                      Seguir
                    </>
                  )}
                </button>
                <button className="flex-1 bg-amber-500 hover:bg-amber-600 text-black py-2 rounded-xl font-bold transition-colors text-sm shadow-sm border-none">
                  Contactar
                </button>
                <button className="p-2 bg-amber-500 hover:bg-amber-600 text-black rounded-xl transition-colors flex items-center justify-center shadow-sm border-none" onClick={() => { navigator.clipboard.writeText(window.location.href); alert('Enlace copiado!'); }}>
                  <Link size={20} />
                </button>
                <div className="relative">
                  <button onClick={() => setShowSocialMenu(!showSocialMenu)} className="p-2 bg-amber-500 hover:bg-amber-600 text-black rounded-xl transition-colors flex items-center justify-center relative z-50 shadow-sm border-none">
                    <Camera size={20} />
                  </button>
                  <AnimatePresence>
                    {showSocialMenu && config?.socialLinks && Object.values(config.socialLinks).some(val => val) && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-12 right-0 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl py-2 min-w-[180px] z-[100]"
                      >
                        {config.socialLinks.instagram && (
                          <a href={config.socialLinks.instagram.includes('http') ? config.socialLinks.instagram : `https://instagram.com/${config.socialLinks.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-zinc-300 hover:text-white">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] text-pink-500"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                            <span className="text-sm font-bold">Instagram</span>
                          </a>
                        )}
                        {config.socialLinks.tiktok && (
                          <a href={config.socialLinks.tiktok.includes('http') ? config.socialLinks.tiktok : `https://tiktok.com/@${config.socialLinks.tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-zinc-300 hover:text-white">
                            <Music2 size={18} className="text-white" />
                            <span className="text-sm font-bold">TikTok</span>
                          </a>
                        )}
                        {config.socialLinks.facebook && (
                          <a href={config.socialLinks.facebook.includes('http') ? config.socialLinks.facebook : `https://facebook.com/${config.socialLinks.facebook}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-zinc-300 hover:text-white">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] text-blue-500"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                            <span className="text-sm font-bold">Facebook</span>
                          </a>
                        )}
                        {config.socialLinks.whatsapp && (
                          <a href={`https://wa.me/${config.socialLinks.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-zinc-300 hover:text-white">
                            <MessageCircle size={18} className="text-green-500" />
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
                        className="absolute bottom-12 right-0 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl py-3 px-4 min-w-[200px] z-[100]"
                      >
                        <p className="text-xs text-zinc-400 text-center">Este comercio aún no ha agregado redes sociales.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {showSocialMenu && (
                    <div className="fixed inset-0 z-40" onClick={() => setShowSocialMenu(false)}></div>
                  )}
                </div>
              </div>

              {/* Acerca de */}
              <div className="mt-8">
                <h2 className="text-lg font-bold mb-3">Acerca de</h2>
                <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                  {config?.description || 'La mejor calidad para ti.'}
                  <div className="flex flex-col gap-1.5 mt-3 text-zinc-400">
                    {config?.address && (
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-red-500" />
                        <span>{config.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Calificaciones de Clientes */}
              <div className="mt-8 border-t border-white/5 pt-8">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Star size={18} className="fill-amber-400 text-amber-400" /> 
                  Calificaciones de los Clientes
                </h2>
                {storeReviewsList.length > 0 ? (
                  <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {storeReviewsList.map(review => (
                      <div key={review.id} className="bg-white/5 p-4 rounded-xl border border-white/10">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-sm text-white">{review.customer_name}</span>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} size={12} className={s <= review.rating ? 'fill-amber-400 text-amber-400' : 'fill-zinc-600 text-zinc-600'} />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-zinc-300 whitespace-pre-line">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 italic">No hay calificaciones disponibles aún.</p>
                )}
              </div>

              {/* Horario */}
              <div className="mt-8 border-t border-white/5 pt-8">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg font-bold">Horario</h2>
                  {config?.scheduleProfile?.workDays && (
                    <span 
                      onClick={() => setShowFullSchedule(!showFullSchedule)}
                      className="text-sm text-zinc-400 cursor-pointer hover:text-white transition-colors"
                    >
                      {showFullSchedule ? 'Ocultar' : 'Ver todo'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    storeSchedule.status === 'closed' ? 'bg-red-500' : 
                    storeSchedule.status === 'closing' ? 'bg-amber-500' : 
                    storeSchedule.status === 'unknown' ? 'bg-zinc-500' : 'bg-green-500'
                  }`}></div>
                  <span className={`font-semibold ${
                    storeSchedule.status === 'closed' ? 'text-red-500' : 
                    storeSchedule.status === 'closing' ? 'text-amber-500' : 
                    storeSchedule.status === 'unknown' ? 'text-zinc-400' : 'text-green-500'
                  }`}>
                    {storeSchedule.status === 'closed' ? 'Cerrado' : 
                     storeSchedule.status === 'closing' ? 'Cierra pronto' : 
                     storeSchedule.status === 'unknown' ? 'No definido' : 'Abierto'}
                  </span>
                  <span className="text-zinc-400 text-sm">
                    · {storeSchedule.message}
                  </span>
                </div>

                {/* Vista Detallada de Horario (Oculta por defecto) */}
                {showFullSchedule && config?.scheduleProfile?.workDays && (
                  <div className="mt-4 flex flex-col gap-2 text-sm text-zinc-400 bg-black/40 p-5 rounded-2xl border border-white/5 shadow-inner">
                    {['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].map(day => (
                      <div key={day} className="flex justify-between items-center border-b border-white/5 pb-2 last:border-0 last:pb-0">
                        <span className="capitalize">{day}</span>
                        <span className="font-bold text-white tracking-wide">
                          {config.scheduleProfile.workDays[day] 
                            ? `${config.scheduleProfile.openTime} - ${config.scheduleProfile.closeTime}` 
                            : <span className="text-red-400">Cerrado</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Ubicación */}
              <div className="mt-8 border-t border-white/5 pt-8">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg font-bold">Ubicación</h2>
                  <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config?.location?.lat ? `${config.location.lat},${config.location.lng}` : (config?.address || config?.businessName || 'Venezuela'))}`)} className="text-sm font-bold text-zinc-400 hover:text-white transition-colors">Abrir en Maps</button>
                </div>
                {config?.address && <p className="text-sm text-zinc-300 mb-4">{config.address}</p>}
                
                <div className="w-full h-40 rounded-3xl relative overflow-hidden bg-zinc-900 shadow-inner border border-white/5 z-0 group">
                  {config?.location?.lat && config?.location?.lng ? (
                    <MapContainer 
                      center={[config.location.lat, config.location.lng]} 
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
                      <Marker position={[config.location.lat, config.location.lng]} />
                    </MapContainer>
                  ) : (
                    <div 
                      onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config?.address || config?.businessName || 'Venezuela')}`)}
                      className="w-full h-full cursor-pointer relative bg-zinc-100 flex items-center justify-center overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-200 to-zinc-100 opacity-50"></div>
                      <div className="relative flex flex-col items-center group-hover:scale-110 transition-transform duration-300 z-10">
                        <div className="w-10 h-10 rounded-full border-2 border-white shadow-lg overflow-hidden bg-white mb-1 relative z-10">
                          {config?.logoUrl ? (
                            <img src={resolveImageUrl(config.logoUrl)} alt="Store" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
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
                  {config?.location?.lat && (
                    <div className="absolute inset-0 z-[1] cursor-pointer" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${config.location.lat},${config.location.lng}`)}></div>
                  )}
                </div>
              </div>

              {/* Boletín de Noticias */}
              <div className="mt-8 border-t border-white/5 pt-8 pb-32">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold">Novedades y Noticias</h2>
                </div>
                
                <div className="flex flex-col gap-6">
                  {storeNews.length > 0 ? storeNews.map((news) => (
                    <div key={news.id} className="bg-zinc-900/50 rounded-2xl border border-white/5 overflow-hidden">
                      {news.image_url && (
                        <img src={news.image_url} alt={news.title} className="w-full h-48 sm:h-64 object-cover" />
                      )}
                      <div className="p-4 sm:p-5">
                        <span className="text-xs font-medium text-amber-500 mb-2 block">
                          {new Date(news.created_at).toLocaleDateString()}
                        </span>
                        <h3 className="text-lg sm:text-xl font-bold text-white mb-2 leading-tight">{news.title}</h3>
                        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{news.content}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-10 text-zinc-500 font-light border border-dashed border-white/10 rounded-2xl">
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
          <div className="flex-1 flex flex-col w-full relative">
            <div className="py-12 px-6 md:px-12 border-b border-zinc-200 bg-white relative overflow-hidden">
               <div className="max-w-[1400px] mx-auto relative z-10 flex flex-col justify-center">
                 <h1 className={`${headingWeight} text-4xl md:text-5xl text-black tracking-tight`}>{texts.offersTitle || 'Ofertas'}</h1>
               </div>
            </div>
            
            <div className="max-w-[1400px] mx-auto w-full px-4 md:px-8 py-8 md:py-12 relative z-10">
              <div className="flex flex-col md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4 gap-0">
                {offerProducts.length > 0 ? offerProducts.map((p, i) => (
                  <div 
                    key={p.id}
                    id={`product-card-${p.id}`}
                    onClick={() => { if ((p.stock_vitrina || 0) > 0) openProductModal(p); }}
                    className={`group relative flex justify-between gap-3 bg-transparent border-b border-white/5 py-5 last:border-0 md:border md:rounded-2xl md:p-4 md:hover:bg-white/5 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-500 ${(p.stock_vitrina || 0) <= 0 ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex-1 flex flex-col pt-1">
                            <p className="font-semibold text-white text-[15px] line-clamp-2 mb-1 group-hover:text-white/80 transition-colors leading-tight">{p.name}</p>
                            <p className="text-xs text-zinc-400 line-clamp-2 mb-3 leading-relaxed font-light">{p.description || 'Sin descripción detallada.'}</p>
                      
                      <div className="mt-auto flex items-center gap-2">
                         {isUserAllowedToSeePrices ? (
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-sm" style={{ color: primaryColor }}>${Number(p.discount_price || p.price).toFixed(2)}</p>
                              <p className="text-[10px] text-zinc-500 line-through">${Number(p.price).toFixed(2)}</p>
                            </div>
                          ) : (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setShowAuthModal(true); }}
                              className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors border border-white/5 inline-flex items-center gap-1.5"
                            >
                              <Lock size={12} /> Precio
                            </button>
                          )}
                      </div>
                    </div>

                    <div className="w-[100px] h-[100px] md:w-28 md:h-28 rounded-2xl bg-zinc-900/50 overflow-hidden relative flex-shrink-0 border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.3)] self-center">
                      {p.image_url ? (
                        <img id={`product-img-${p.id}`} src={resolveImageUrl(p.image_url)} alt={p.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700">
                           <ImageIcon size={24} />
                        </div>
                      )}
                      
                      <div className="absolute top-1 left-1 text-black text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-md flex items-center gap-1" style={{ backgroundColor: primaryColor }}>
                        <Zap size={8} fill="currentColor" className="animate-pulse" /> OFERTA
                      </div>
                      
                      {(p.stock_vitrina || 0) <= 0 && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-10">
                          <span className="text-white text-[9px] font-bold uppercase tracking-widest bg-red-600/90 px-2 py-1 rounded">Agotado</span>
                        </div>
                      )}
                      
                      <div className="absolute bottom-[-1px] right-[-1px] z-20">
                        {isUserAllowedToSeePrices && cart[p.id] > 0 ? (
                          <div className="flex items-center gap-1.5 bg-zinc-900 border-t border-l border-white/10 rounded-tl-xl p-1" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => removeFromCart(p.id, p.step_size)} className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-zinc-400 transition-colors"><Minus size={12}/></button>
                            <span className="text-xs font-bold text-white min-w-[16px] text-center">{cart[p.id]}</span>
                            <button onClick={() => { if(!storeClosed) addToCart(p.id, p.step_size) }} className={`w-6 h-6 rounded-full flex items-center justify-center text-black transition-colors ${storeClosed ? 'cursor-not-allowed' : 'hover:scale-110'}`} style={{ backgroundColor: storeClosed ? '#52525b' : primaryColor }}><Plus size={12}/></button>
                          </div>
                        ) : (
                          isUserAllowedToSeePrices && (p.stock_vitrina || 0) > 0 && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); if(storeClosed) return; addToCart(p.id, p.step_size || 1); }}
                              className="w-8 h-8 bg-zinc-900 rounded-tl-xl border-t border-l border-white/10 flex items-center justify-center transition-colors hover:bg-zinc-800"
                            >
                              <Plus size={16} style={{ color: primaryColor }} />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                    
                    {isMerchantOwner && (
                      <div className="absolute inset-0 z-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm rounded-xl">
                        <button 
                          onClick={(e) => { e.stopPropagation(); navigate(`/product-studio/${p.id}`); }}
                          className="bg-amber-500 text-black font-black uppercase tracking-widest text-[10px] px-5 py-2.5 rounded-full flex items-center gap-2 shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:scale-110 transition-transform"
                        >
                          <Pen size={14} /> Editar
                        </button>
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="col-span-full py-32 flex flex-col items-center justify-center text-center">
                    <div className="mb-6 opacity-30">
                      <Tag size={64} className="text-zinc-500" strokeWidth={1} />
                    </div>
                    <h3 className="text-2xl text-white font-semibold mb-3">No hay promociones vigentes</h3>
                    <p className="text-zinc-500 text-base max-w-md">
                      En este momento no contamos con ofertas activas. Te invitamos a revisar nuestro catálogo de productos o a volver más tarde.
                    </p>
                    <button 
                      onClick={() => setCurrentPage('products')}
                      className="mt-8 px-8 py-3 rounded-xl text-sm font-bold tracking-wide transition-all border border-white/10 hover:border-white/20 text-white bg-white/5 hover:bg-white/10"
                    >
                      Ir a Productos
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
            <div className="bg-white sticky top-0 z-40 border-b border-zinc-200 px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide shadow-sm">
               {mainCategories.map(mc => (
                 <button 
                   key={mc}
                   onClick={() => setActiveMainCategory(mc)}
                   className={`whitespace-nowrap px-6 py-2 rounded-full text-sm font-bold transition-all border ${activeMainCategory === mc ? 'bg-amber-500 text-black border-amber-500 shadow-md' : 'bg-white text-zinc-600 border-zinc-200 hover:border-amber-500 hover:text-amber-500'}`}
                 >
                   {mc}
                 </button>
               ))}
            </div>

            <div className="max-w-[1600px] mx-auto w-full flex flex-col md:flex-row px-4 md:px-8 py-6 gap-6 md:gap-8">
               
               {/* Barra Lateral Izquierda: Subcategorías */}
               <div className="hidden md:block w-64 flex-shrink-0">
                  <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-4 sticky top-24">
                     <h3 className="font-bold text-lg mb-4 text-zinc-800 px-2">Explorar</h3>
                     <div className="flex flex-col space-y-1">
                       {subCategories.map(sc => (
                         <button
                           key={sc}
                           onClick={() => setActiveSubCategory(sc)}
                           className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeSubCategory === sc ? 'bg-amber-50 text-amber-600 font-bold' : 'text-zinc-600 hover:bg-zinc-50 font-medium'}`}
                         >
                           {sc === 'Todos' ? (
                             <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                             </div>
                           ) : (
                             <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center overflow-hidden">
                                <span className="text-xs">🥦</span>
                             </div>
                           )}
                           <span className="flex-1">{sc}</span>
                         </button>
                       ))}
                     </div>
                  </div>
               </div>
               
               {/* Menú Móvil para Subcategorías */}
               <div className="md:hidden w-full relative z-30">
                  <select 
                     value={activeSubCategory}
                     onChange={(e) => setActiveSubCategory(e.target.value)}
                     className="w-full appearance-none bg-white border border-zinc-200 rounded-xl px-4 py-3.5 font-bold text-zinc-700 shadow-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  >
                     {subCategories.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                     <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
               </div>

               {/* Grid de Productos */}
               <div className="flex-1">
                  
                  {/* Búsqueda y Ordenar */}
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-zinc-100">
                    <div className="relative w-full md:max-w-md">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                      </div>
                      <input 
                        type="text" 
                        placeholder="Buscar productos..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full block pl-10 pr-3 py-2 border border-zinc-200 rounded-xl leading-5 bg-zinc-50 placeholder-zinc-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                      />
                    </div>
                    <div className="w-full md:w-auto">
                      <select 
                        value={sortBy} 
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 text-sm text-zinc-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer"
                      >
                        <option value="newest">Más recientes</option>
                        <option value="priceAsc">Precio: Menor a Mayor</option>
                        <option value="priceDesc">Precio: Mayor a Menor</option>
                        <option value="nameAsc">Nombre: A-Z</option>
                      </select>
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
                          {p.is_offer && (
                            <div className="absolute top-2 left-2 z-10 bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shadow-sm">
                              Oferta
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
                            {/* Veg / Non-Veg Indicator Icon (Mocked for style) */}
                            <div className="absolute bottom-2 left-2 bg-white rounded-sm shadow-sm border border-zinc-200 p-0.5">
                              <div className={`w-2.5 h-2.5 rounded-full ${i % 3 === 0 ? 'bg-red-500' : 'bg-green-500'}`}></div>
                            </div>
                          </div>
                          
                          {/* Info */}
                          <div className="p-3 flex flex-col flex-1">
                            <h3 className="font-semibold text-zinc-800 text-sm line-clamp-2 leading-tight mb-1 min-h-[40px]">{p.name}</h3>
                            <p className="text-xs text-zinc-500 font-medium mb-3">{p.step_size || 1} {p.unit || 'unidad'}</p>
                            
                            <div className="mt-auto flex items-end justify-between gap-1">
                              <div>
                                {isUserAllowedToSeePrices ? (
                                  p.is_offer ? (
                                    <div className="flex flex-col">
                                      <p className="font-bold text-base text-zinc-900 leading-none">${Number(p.discount_price || p.price).toFixed(2)}</p>
                                      <p className="text-[10px] text-zinc-400 line-through mt-0.5">${Number(p.price).toFixed(2)}</p>
                                    </div>
                                  ) : (
                                    <p className="font-bold text-base text-zinc-900 leading-none">${Number(p.price).toFixed(2)}</p>
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
                    <div className="py-20 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-zinc-100">
                       <svg className="w-16 h-16 text-zinc-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                       <h3 className="text-lg font-bold text-zinc-700 mb-2">No se encontraron productos</h3>
                       <p className="text-zinc-500">Prueba ajustando los filtros de búsqueda o categoría.</p>
                    </div>
                  )}
               </div>
            </div>
          </div>
        )}
      </div>
      <footer className="bg-zinc-950 border-t border-white/5 mt-auto relative z-10 py-12 px-6">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-3">
             <img src={logoAxon} alt="Axon Market" className="h-6 w-auto object-contain grayscale opacity-50" />
             <span className="font-black tracking-widest text-zinc-600 uppercase text-sm">
               AXON MARKET
             </span>
           </div>
           <p className="text-zinc-600 font-light text-xs tracking-wider uppercase">{texts.footerText}</p>
        </div>
      </footer>

      {/* Product Modal */}
      <ResponsiveModal
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        className="md:max-w-4xl bg-zinc-950 border border-white/10"
        contentClassName="p-0 flex flex-col md:flex-row max-h-[85vh] md:max-h-[80vh] overflow-hidden"
      >
        {selectedProduct && (
          <>
            <div className="md:w-1/2 bg-black relative flex items-center justify-center p-8 md:p-12 overflow-hidden min-h-[300px] shrink-0">
               <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
               {selectedProduct.image_url ? (
                 <img id={`modal-img-${selectedProduct.id}`} src={resolveImageUrl(selectedProduct.image_url)} alt={selectedProduct.name} className="w-full h-full object-contain relative z-10 max-h-[60vh]" />
               ) : (
                 <ImageIcon size={80} className="text-zinc-800" />
               )}
               {selectedProduct.is_offer && (
                 <div className="absolute top-6 left-6 text-black text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full z-20 shadow-lg" style={{ backgroundColor: primaryColor }}>
                   Oferta
                 </div>
               )}
            </div>
            
            <div className="md:w-1/2 p-6 md:p-10 flex flex-col relative overflow-y-auto custom-scrollbar">
               <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">{selectedProduct.category || 'Categoría'}</p>
               <h2 className="text-3xl md:text-4xl font-light text-white mb-2 tracking-tight leading-tight">{selectedProduct.name}</h2>
               <p className="text-sm text-zinc-400 mb-6">Disponibles en vitrina: <span className="font-bold text-white">{selectedProduct.stock_vitrina || 0}</span> unidades</p>
               
               <div className="mb-8">
                 {isUserAllowedToSeePrices ? (
                   selectedProduct.is_offer ? (
                     <div className="flex items-center gap-4">
                       <p className="text-4xl font-black" style={{ color: primaryColor }}>${Number(selectedProduct.discount_price || selectedProduct.price).toFixed(2)}</p>
                       <p className="text-lg text-zinc-500 line-through">${Number(selectedProduct.price).toFixed(2)}</p>
                     </div>
                   ) : (
                     <p className="text-3xl font-bold" style={{ color: primaryColor }}>${Number(selectedProduct.price).toFixed(2)}</p>
                   )
                 ) : (
                   <button 
                     onClick={(e) => { e.stopPropagation(); setShowAuthModal(true); }}
                     className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 px-6 py-3 rounded-full transition-colors border border-white/5 inline-flex"
                   >
                     <Lock size={16} /> Ver Precio
                   </button>
                 )}
               </div>
               
               <div className="prose prose-invert prose-zinc max-w-none mb-8 font-light text-zinc-400">
                 <p>{selectedProduct.description || 'Sin descripción detallada disponible para este producto.'}</p>
               </div>

               {/* REVIEWS SECTION */}
               <div className="mb-8 border-t border-white/5 pt-8">
                 <h3 className="text-xl font-light text-white mb-6">Reseñas del Producto</h3>
                 
                 {/* Lista de Reseñas Aprobadas */}
                 {productReviews.length > 0 ? (
                   <div className="space-y-4 mb-8">
                     {productReviews.map(r => (
                       <div key={r.id} className="bg-white/5 rounded-2xl p-5 border border-white/5">
                         <div className="flex items-center justify-between mb-2">
                           <span className="font-bold text-white text-sm">{r.customer_name}</span>
                           <span className="text-xs text-zinc-500">{new Date(r.created_at).toLocaleDateString()}</span>
                         </div>
                         <div className="flex gap-1 mb-3">
                           {[1,2,3,4,5].map(star => (
                             <Star key={star} size={12} className={star <= r.rating ? 'fill-amber-400 text-amber-400' : 'fill-white/10 text-transparent'} />
                           ))}
                         </div>
                         <p className="text-sm text-zinc-400 font-light italic">"{r.comment}"</p>
                         {r.reply && (
                           <div className="mt-4 bg-zinc-900 rounded-xl p-4 border-l-2" style={{ borderColor: primaryColor }}>
                             <p className="text-xs font-bold mb-1" style={{ color: primaryColor }}>Respuesta de la Tienda:</p>
                             <p className="text-sm text-zinc-300 font-light">{r.reply}</p>
                           </div>
                         )}
                       </div>
                     ))}
                   </div>
                 ) : (
                   <p className="text-sm text-zinc-500 mb-8 italic">Aún no hay reseñas para este producto. ¡Sé el primero en opinar!</p>
                 )}

                 {/* Formulario para dejar reseña */}
                 <div className="bg-zinc-900 rounded-2xl p-6 border border-white/5">
                   <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-4">Deja tu opinión</h4>
                   {reviewSent ? (
                     <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-4 text-sm text-center">
                       ¡Gracias por tu opinión! Tu reseña ha sido enviada y está pendiente de aprobación.
                     </div>
                   ) : (
                     <form onSubmit={handleReviewSubmit} className="flex flex-col gap-4">
                       <div className="flex items-center gap-2">
                         <span className="text-sm text-zinc-400">Calificación:</span>
                         <div className="flex gap-1 cursor-pointer">
                           {[1,2,3,4,5].map(star => (
                             <Star 
                               key={star} 
                               size={20} 
                               onClick={() => setReviewRating(star)}
                               className={star <= reviewRating ? 'fill-amber-400 text-amber-400 hover:scale-110 transition-transform' : 'fill-white/10 text-white/10 hover:fill-amber-400/50 hover:text-amber-400/50 transition-all'} 
                             />
                           ))}
                         </div>
                       </div>
                       <textarea 
                         required
                         rows="3"
                         placeholder="¿Qué te pareció este producto?"
                         value={reviewComment}
                         onChange={(e) => setReviewComment(e.target.value)}
                         className="w-full bg-black border border-white/10 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-amber-500/50 transition-colors resize-none"
                       ></textarea>
                       <button 
                         type="submit"
                         disabled={isSubmittingReview || !reviewComment.trim()}
                         className="self-end px-6 py-2.5 bg-white text-black font-bold text-xs uppercase tracking-widest rounded-full hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                         {isSubmittingReview ? 'Enviando...' : 'Enviar Reseña'}
                       </button>
                     </form>
                   )}
                 </div>
               </div>

               <div className="mt-auto space-y-6 border-t border-white/5 pt-6 shrink-0">
                 {isUserAllowedToSeePrices ? (
                   <>
                     <div className="flex items-center gap-4">
                       <span className="text-sm font-bold uppercase tracking-widest text-zinc-500">Cantidad</span>
                       <div className="flex items-center bg-zinc-900 border border-white/10 rounded-full p-1">
                         <button onClick={() => setModalQty(Math.max(1, modalQty - (selectedProduct.step_size||1)))} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors"><Minus size={16}/></button>
                         <span className="w-12 text-center font-bold text-lg">{modalQty}</span>
                         <button onClick={() => setModalQty(modalQty + (selectedProduct.step_size||1))} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors"><Plus size={16}/></button>
                       </div>
                     </div>

                     <button 
                       onClick={storeClosed ? undefined : addModalToCart}
                       className={`w-full py-5 rounded-full text-black font-bold uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 transition-all shadow-lg ${storeClosed ? 'bg-zinc-600 cursor-not-allowed' : 'hover:scale-[1.02]'}`}
                       style={{ backgroundColor: storeClosed ? '#52525b' : primaryColor }}
                     >
                       {storeClosed ? <X size={18} /> : <ShoppingBag size={18} />} 
                       {storeSchedule.status === 'closing' ? 'Cierra Pronto' : storeClosed ? 'Tienda Cerrada' : 'Agregar al Carrito'}
                     </button>
                   </>
                 ) : (
                   <button 
                     onClick={(e) => { e.stopPropagation(); setShowAuthModal(true); }}
                     className={`w-full py-5 rounded-full text-white font-bold uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3 transition-all bg-white/5 hover:bg-white/10 border border-white/10`}
                     >
                       <Lock size={18} /> 
                       Ingresa para Comprar
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
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Paso 2: Método de Pago</h3>
                        {/* Payment Method Selection */}
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                         {config?.paymentProfile?.paymentMobile && (
                           <button onClick={() => setSelectedPaymentMethod('pago_movil')} className={`p-4 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold transition-all ${selectedPaymentMethod === 'pago_movil' ? 'bg-zinc-200 border-zinc-200 text-black shadow-lg scale-[1.02]' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`} style={selectedPaymentMethod === 'pago_movil' ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}><Smartphone size={18} /> Pago Móvil</button>
                         )}
                         {config?.paymentProfile?.zelleActive && (
                           <button onClick={() => setSelectedPaymentMethod('zelle')} className={`p-4 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold transition-all ${selectedPaymentMethod === 'zelle' ? 'bg-[#741eed] border-[#741eed] text-white shadow-lg shadow-[#741eed]/20 scale-[1.02]' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}><Zap size={18} /> Zelle</button>
                         )}
                         {config?.paymentProfile?.cashActive && (
                           <button onClick={() => setSelectedPaymentMethod('cash')} className={`p-4 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold transition-all ${selectedPaymentMethod === 'cash' ? 'bg-white border-white text-black shadow-lg scale-[1.02]' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}><Building2 size={18} /> Efectivo</button>
                         )}
                       </div>
                     </div>

                     {/* Payment Mobile Information */}
                     {selectedPaymentMethod === 'pago_movil' && config?.paymentProfile?.paymentMobile && (
                        <div className="pt-4 space-y-3 animate-in slide-in-from-top-2">
                           <div className="p-4 border border-white/10 rounded-xl bg-white/5">
                              <div className="flex flex-col gap-2 mb-4 text-sm text-zinc-300">
                                <p><span className="font-bold text-white">Banco:</span> {config.paymentProfile.pmBank}</p>
                                <p><span className="font-bold text-white">Teléfono:</span> {config.paymentProfile.pmPhone}</p>
                                <p><span className="font-bold text-white">Cédula/RIF:</span> {config.paymentProfile.pmId}</p>
                                <p className="text-xs text-zinc-500 mt-2">
                                  Monto: ${finalCartTotal.toFixed(2)} | Bs. {(finalCartTotal * (config.bcvRate || 36.50)).toFixed(2)}
                                </p>
                              </div>
                              
                              <div className="mt-4 space-y-3">
                                <select value={selectedPaymentProfileIdx} onChange={e => {
                                    const val = e.target.value;
                                    setSelectedPaymentProfileIdx(val);
                                    if (val !== '') {
                                      const profile = customerPaymentProfiles[Number(val)];
                                      if (profile) setPaymentBank(profile.bank);
                                    } else {
                                      setPaymentBank('');
                                    }
                                  }} className="w-full px-3 py-3 border border-white/10 rounded-lg text-sm bg-black/50 focus:outline-none focus:border-white/30 text-white">
                                    <option value="" disabled hidden>¿Desde qué Pago Móvil enviarás el dinero?</option>
                                    {customerPaymentProfiles.map((p, idx) => (
                                      <option key={idx} value={idx}>{p.bank} - {p.phone} ({p.titular})</option>
                                    ))}
                                    {customerPaymentProfiles.length === 0 && (
                                      <option value="" disabled>No tienes cuentas registradas. Actualiza tu perfil.</option>
                                    )}
                                  </select>
                                 {ocrStatus === 'idle' || ocrStatus === 'analyzing' || ocrStatus === 'success' ? (
                                   <div className="w-full px-3 py-3 border border-white/10 rounded-lg text-sm bg-black/50 text-white/50 flex items-center justify-between">
                                     <span className={ocrStatus === 'success' ? 'text-emerald-400 font-bold' : ''}>{ocrStatus === 'analyzing' ? ocrMessage : (ocrStatus === 'success' ? ocrMessage : "Sube el comprobante para extraer la referencia")}</span>
                                     {ocrStatus === 'analyzing' && <Loader2 size={16} className="animate-spin text-amber-500" />}
                                   </div>
                                 ) : (
                                   <div className="space-y-1">
                                     <input type="text" inputMode="numeric" pattern="[0-9]*" value={paymentReference} onChange={e => setPaymentReference(e.target.value.replace(/\\D/g, ''))} placeholder="Referencia de Pago manual" className="w-full px-3 py-3 border border-red-500/50 rounded-lg text-sm bg-black/50 focus:outline-none focus:border-red-500 text-white" />
                                     <p className="text-xs text-red-400 font-bold">{ocrMessage}</p>
                                   </div>
                                 )}
                                
                                <div className="relative overflow-hidden mt-3 p-4 border border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center gap-2 bg-black/30 hover:bg-white/5 transition-colors cursor-pointer">
                                   <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                   {receiptUrl ? (
                                     <div className="text-center">
                                       <ShieldCheck size={24} className="mx-auto text-emerald-400 mb-2" />
                                       <span className="text-xs font-medium text-emerald-400">Comprobante Subido Correctamente</span>
                                     </div>
                                   ) : receiptFile ? (
                                     <div className="text-center">
                                       <Loader2 size={24} className="mx-auto text-zinc-400 mb-2 animate-spin" />
                                       <span className="text-xs font-medium text-zinc-400">Subiendo...</span>
                                     </div>
                                   ) : (
                                     <div className="text-center">
                                       <UploadCloud size={24} className="mx-auto text-zinc-400 mb-2" />
                                       <span className="text-xs font-medium text-zinc-300">Toca para Subir Captura del Pago</span>
                                     </div>
                                   )}
                                </div>
                              </div>
                           </div>
                        </div>
                     )}

                     {/* Zelle Information */}
                     {selectedPaymentMethod === 'zelle' && config?.paymentProfile?.zelleActive && (
                        <div className="pt-4 space-y-3 animate-in slide-in-from-top-2">
                           <div className="p-4 border border-[#741eed]/30 rounded-xl bg-[#741eed]/5">
                              <div className="flex flex-col gap-2 mb-4 text-sm text-zinc-300">
                                <p><span className="font-bold text-white">Correo Zelle:</span> {config.paymentProfile.zelleEmail}</p>
                                <p><span className="font-bold text-white">Titular:</span> {config.paymentProfile.zelleName}</p>
                                <p className="text-xs text-zinc-500 mt-2">
                                  Monto a transferir: ${finalCartTotal.toFixed(2)}
                                </p>
                              </div>
                              
                              <div className="mt-4 space-y-3">
                                 {ocrStatus === 'idle' || ocrStatus === 'analyzing' || ocrStatus === 'success' ? (
                                   <div className="w-full px-3 py-3 border border-white/10 rounded-lg text-sm bg-black/50 text-white/50 flex items-center justify-between">
                                     <span className={ocrStatus === 'success' ? 'text-emerald-400 font-bold' : ''}>{ocrStatus === 'analyzing' ? ocrMessage : (ocrStatus === 'success' ? ocrMessage : "Sube el comprobante para extraer la referencia")}</span>
                                     {ocrStatus === 'analyzing' && <Loader2 size={16} className="animate-spin text-[#741eed]" />}
                                   </div>
                                 ) : (
                                   <div className="space-y-1">
                                     <input type="text" value={paymentReference} onChange={e => setPaymentReference(e.target.value)} placeholder="Referencia de Zelle manual" className="w-full px-3 py-3 border border-red-500/50 rounded-lg text-sm bg-black/50 focus:outline-none focus:border-red-500 text-white" />
                                     <p className="text-xs text-red-400 font-bold">{ocrMessage}</p>
                                   </div>
                                 )}
                                
                                <div className="relative overflow-hidden mt-3 p-4 border border-dashed border-[#741eed]/50 rounded-lg flex flex-col items-center justify-center gap-2 bg-[#741eed]/10 hover:bg-[#741eed]/20 transition-colors cursor-pointer">
                                   <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                   {receiptUrl ? (
                                     <div className="text-center">
                                       <ShieldCheck size={24} className="mx-auto text-[#741eed] mb-2" />
                                       <span className="text-xs font-medium text-[#741eed]">Captura Subida Correctamente</span>
                                     </div>
                                   ) : receiptFile ? (
                                     <div className="text-center">
                                       <Loader2 size={24} className="mx-auto text-[#741eed] mb-2 animate-spin" />
                                       <span className="text-xs font-medium text-[#741eed]">Subiendo...</span>
                                     </div>
                                   ) : (
                                     <div className="text-center">
                                       <UploadCloud size={24} className="mx-auto text-[#741eed] mb-2" />
                                       <span className="text-xs font-medium text-zinc-300">Sube la Captura de Zelle</span>
                                     </div>
                                   )}
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
                        onClick={() => setCheckoutStep(2)}
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
          localStorage.setItem('ecommerce_current_customer', JSON.stringify(updatedCustomer));
          setCurrentCustomer(updatedCustomer);
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
          <h2 className="text-lg font-bold text-white">Seguidores</h2>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar flex flex-col gap-4">
          {currentFollowers.map((follower) => (
            <div key={follower.id} className="flex items-center gap-3">
              <img src={follower.profilePic} alt={follower.name} className="w-12 h-12 rounded-full object-cover border border-white/10" />
              <div className="flex-1">
                <span className="font-semibold text-sm text-white block">{follower.name}</span>
                <span className="text-xs text-zinc-400">Seguidor</span>
              </div>
            </div>
          ))}
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
      <ResponsiveModal isOpen={isToolsModalOpen} onClose={() => setIsToolsModalOpen(false)} title="Herramientas">
        <div className="space-y-6">
          {/* Calculadora Multi-Moneda */}
          <div className="bg-zinc-100 dark:bg-zinc-900 rounded-2xl p-5 border border-black/5 dark:border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Calculator className="text-blue-500" size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">Calculadora BCV</h3>
                <p className="text-xs text-zinc-500">Tasa actual: {bcvRate} Bs.</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-zinc-500 font-bold">$</span>
                </div>
                <input
                  type="number"
                  placeholder="Monto en dólares"
                  value={calcUSD}
                  onChange={(e) => setCalcUSD(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-xl py-3 pl-10 pr-4 text-slate-800 dark:text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>

              {calcUSD && !isNaN(calcUSD) && bcvRate !== '...' && (
                <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">Equivalente:</span>
                    <span className="text-xl font-black text-blue-700 dark:text-blue-300">
                      Bs. {(parseFloat(calcUSD) * parseFloat(bcvRate)).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Simulador de Compra */}
          <div className="bg-zinc-100 dark:bg-zinc-900 rounded-2xl p-5 border border-black/5 dark:border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                <ShoppingCart className="text-amber-500" size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">Simulador de Pago</h3>
                <p className="text-xs text-zinc-500">Calcula tu compra con descuentos</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Product list for simulator (first 5 to not crowd) */}
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2">
                {products.slice(0, 5).map(p => {
                  const qty = simulatedCart[p.id] || 0;
                  return (
                    <div key={p.id} className="flex items-center justify-between bg-white dark:bg-zinc-800 p-2 rounded-xl border border-black/5 dark:border-white/5">
                      <div className="flex flex-col max-w-[120px]">
                        <span className="text-[11px] font-bold truncate">{p.name}</span>
                        <span className="text-[10px] text-zinc-500">${p.price}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => simulateAddToCart(p, -1)} disabled={qty <= 0} className="w-6 h-6 rounded bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center disabled:opacity-50 text-zinc-600 dark:text-zinc-300">
                          <Minus size={12} />
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{qty}</span>
                        <button onClick={() => simulateAddToCart(p, 1)} className="w-6 h-6 rounded bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
                          <Plus size={12} />
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
                  className="flex-1 bg-white dark:bg-zinc-800 border border-black/5 dark:border-white/5 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-amber-500/50 uppercase"
                />
                <button onClick={handleApplySimulatedDiscount} className="bg-zinc-800 text-white text-xs px-3 rounded-xl font-bold hover:bg-zinc-700">
                  Aplicar
                </button>
              </div>

              {/* Totals */}
              <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-amber-700 dark:text-amber-500 font-medium">Subtotal USD:</span>
                  <span className="text-sm font-bold text-amber-700 dark:text-amber-500">
                    ${simulatedTotalUsd.toFixed(2)}
                  </span>
                </div>
                {simulatedDiscountPct > 0 && (
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-green-600 font-medium">Descuento ({simulatedDiscountPct}%):</span>
                    <span className="text-sm font-bold text-green-600">
                      -${(simulatedTotalUsd * (simulatedDiscountPct/100)).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="h-px bg-amber-500/20 my-2"></div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-800 dark:text-white font-bold">Total a Pagar:</span>
                  <div className="text-right">
                    <div className="text-lg font-black text-slate-800 dark:text-white">${finalSimulatedUsd.toFixed(2)}</div>
                    {bcvRate !== '...' && (
                      <div className="text-xs font-medium text-zinc-500">
                        ~ Bs. {(finalSimulatedUsd * parseFloat(bcvRate)).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Métodos de Pago */}
          <div className="bg-zinc-100 dark:bg-zinc-900 rounded-2xl p-5 border border-black/5 dark:border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <CreditCard className="text-emerald-500" size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">Métodos de Pago</h3>
                <p className="text-xs text-zinc-500">Aceptados por la tienda</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-white dark:bg-zinc-800 rounded-full text-xs font-medium border border-black/5 dark:border-white/5 shadow-sm">Pago Móvil</span>
              <span className="px-3 py-1 bg-white dark:bg-zinc-800 rounded-full text-xs font-medium border border-black/5 dark:border-white/5 shadow-sm">Efectivo USD</span>
              <span className="px-3 py-1 bg-white dark:bg-zinc-800 rounded-full text-xs font-medium border border-black/5 dark:border-white/5 shadow-sm">Zelle</span>
            </div>
          </div>
          
          <button 
            onClick={() => { setIsToolsModalOpen(false); navigate('/'); }}
            className="w-full py-3.5 bg-zinc-900 text-amber-500 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
          >
            <Map size={18} /> Explorar más tiendas
          </button>
        </div>
      </ResponsiveModal>
      {/* Mobile Bottom Navigation Bar - Floating Glassmorphic Design */}
      <nav 
        className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[400px] z-50 rounded-2xl bg-zinc-950/70 backdrop-blur-xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
      >
        <div className="flex justify-between items-center h-16 px-2">
          <button
            onClick={() => setCurrentPage('home')}
            className="flex-1 flex flex-col items-center gap-1 p-2 transition-colors"
            style={currentPage === 'home' ? { color: primaryColor } : { color: '#a1a1aa' }}
          >
            <Store size={22} fill={currentPage === 'home' ? "currentColor" : "none"} />
            <span className="text-[10px] font-bold">{texts?.nav1 || 'Inicio'}</span>
          </button>
          
          <button
            onClick={() => setCurrentPage('products')}
            className="flex-1 flex flex-col items-center gap-1 p-2 transition-colors"
            style={currentPage === 'products' ? { color: primaryColor } : { color: '#a1a1aa' }}
          >
            <Package size={22} fill={currentPage === 'products' ? "currentColor" : "none"} />
            <span className="text-[10px] font-medium">{texts?.nav2 || 'Catálogo'}</span>
          </button>

          {/* Standard Button for Cart */}
          <button
            onClick={() => (currentCustomer || isMerchantOwner) ? setIsCartOpen(true) : setShowAuthModal(true)}
            className="flex-1 flex flex-col items-center gap-1 p-2 transition-colors relative"
            style={isCartOpen ? { color: primaryColor } : { color: '#a1a1aa' }}
          >
            <div className="relative">
              <ShoppingCart size={22} fill={isCartOpen ? "currentColor" : "none"} />
              {totalCartItems > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 text-black text-[9px] font-black flex items-center justify-center rounded-full shadow-sm" style={{ backgroundColor: primaryColor }}>
                  {totalCartItems}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium">Carrito</span>
          </button>

          <button
            onClick={() => setCurrentPage('offers')}
            className="flex-1 flex flex-col items-center gap-1 p-2 transition-colors"
            style={currentPage === 'offers' ? { color: primaryColor } : { color: '#a1a1aa' }}
          >
            <Tag size={22} fill={currentPage === 'offers' ? "currentColor" : "none"} />
            <span className="text-[10px] font-medium">{texts?.nav3 || 'Ofertas'}</span>
          </button>

          <button
            onClick={() => setIsToolsModalOpen(true)}
            className="flex-1 flex flex-col items-center gap-1 p-2 transition-colors"
            style={isToolsModalOpen ? { color: primaryColor } : { color: '#a1a1aa' }}
          >
            <Calculator size={22} fill={isToolsModalOpen ? "currentColor" : "none"} />
            <span className="text-[10px] font-medium">Útiles</span>
          </button>
        </div>
      </nav>

      {/* Spacer for mobile bottom nav */}
      <div className="md:hidden h-16" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
  </div>
  </GoogleOAuthProvider>
  );
}
