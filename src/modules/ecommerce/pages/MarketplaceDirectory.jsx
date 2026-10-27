import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FileText, Cookie, Scale, FileBadge2, Shield, ShoppingBag, Search, Star, ArrowRight, TrendingUp, ShoppingCart, Store, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, User, X, Package, Heart, Loader2, Zap, Lock, Utensils, ShoppingBasket, Apple, ShieldAlert, Shirt, Car, Settings, Wrench, Smartphone, Home, Sparkles, Coffee, Eye, EyeOff, MapPin, MessageSquare, CheckCircle, ShieldCheck, Menu, Bell, MoreHorizontal, MoreVertical, MessageCircle, Send, Bookmark, Camera, Image as ImageIcon, UploadCloud, Trash2, Flame, Gift, Tag, Play } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import * as OTPAuth from 'otpauth';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import ProfileWizardModal from '../components/ProfileWizardModal';
import CustomerAnalyticsModal from '../components/CustomerAnalyticsModal';
import PwaInstallBanner from '../components/PwaInstallBanner';
import SocialFeedCard from '../components/SocialFeedCard';
import PostCommentsDrawer from '../components/PostCommentsDrawer';
import MerchantStatusViewerModal from '../components/MerchantStatusViewerModal';
import { BUSINESS_TYPES } from '../../../config/businessTypes';
import { HeroShowcase } from '../components/HeroShowcase';
import { supabase } from '../../../supabaseClient';
import { registerUser, loginUser } from '../../../supabaseAuth';

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
    <div className="bg-zinc-950 border border-zinc-200 p-3 rounded-xl mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
      {reqs.map((req, i) => (
        <div key={i} className="flex items-center gap-2">
          {req.met ? <CheckCircle size={14} className="text-amber-500" /> : <div className="w-3.5 h-3.5 rounded-full border border-zinc-700"></div>}
          <span className={`text-[10px] font-medium ${req.met ? 'text-amber-500' : 'text-zinc-600'}`}>{req.label}</span>
        </div>
      ))}
    </div>
  );
};

export default function MarketplaceDirectory() {
  const [stores, setStores] = useState([]);
  const [storeNews, setStoreNews] = useState([]);
  const [activeCommentsPost, setActiveCommentsPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [discoveryFilter, setDiscoveryFilter] = useState('all');
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [bannerSlide, setBannerSlide] = useState(0);
  const categoriesScrollRef = useRef(null);

  // Control de Barra de Navegación y Estados (Detección de umbral ultra-liviana sin lag)
  const [isBottomNavOpen, setIsBottomNavOpen] = useState(true);
  const [isStatusViewerOpen, setIsStatusViewerOpen] = useState(false);
  const [activeStatusIndex, setActiveStatusIndex] = useState(0);

  useEffect(() => {
    let isScrolled = false;
    const handleScrollThreshold = () => {
      const past = window.scrollY > 60;
      if (past !== isScrolled) {
        isScrolled = past;
        setIsBottomNavOpen(!past);
      }
    };
    window.addEventListener('scroll', handleScrollThreshold, { passive: true });
    return () => window.removeEventListener('scroll', handleScrollThreshold);
  }, []);

  const scrollCategories = (direction) => {
    if (categoriesScrollRef.current) {
      categoriesScrollRef.current.scrollBy({ left: direction * 280, behavior: 'smooth' });
    }
  };

  const navigate = useNavigate();
  const location = useLocation();

  // Auth State
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [currentMerchant, setCurrentMerchant] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('register');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', docId: '', phone: '', address: '' });
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [showAuthConfirmPassword, setShowAuthConfirmPassword] = useState(false);

  // Merchant Auth State
  const [isMerchantModalOpen, setIsMerchantModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [merchantAuthMode, setMerchantAuthMode] = useState('register');
  const [merchantRegStep, setMerchantRegStep] = useState(1); // 1: Email, 2: Name, 3: 2FA
  const [merchantMfaSecret, setMerchantMfaSecret] = useState('');
  const [merchantMfaUrl, setMerchantMfaUrl] = useState('');
  const [merchantMfaCode, setMerchantMfaCode] = useState('');
  const [tempWorkspace, setTempWorkspace] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [merchantTermsAccepted, setMerchantTermsAccepted] = useState(false);
  const [merchantForm, setMerchantForm] = useState({ 
    ownerName: '',
    contactPhone: '',
    contactEmail: '',
    businessName: '', 
    description: '',
    logoFile: null,
    logoPreview: '',
    coverFile: null,
    coverPreview: '',
    email: '', 
    password: '',
    category: 'Víveres',
    scheduleActive: true,
    scheduleOpen: '08:00',
    scheduleClose: '18:00',
    closeWarningMinutes: 30,
    workingDays: {
      lunes: true, martes: true, miercoles: true, jueves: true, viernes: true, sabado: false, domingo: false
    },
    rifPrefix: 'V',
    rifNumber: '',
    pagoMovilPhone: '',
    pagoMovilBank: '',
    pagoMovilId: '',
    addressState: '',
    addressCity: '',
    addressLine: '',
    gpsCoords: null
  });

  const merchantLogoInputRef = useRef(null);
  const merchantCoverInputRef = useRef(null);

  const handleMerchantLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('El logotipo no debe superar los 5 MB.');
      return;
    }
    setMerchantForm(prev => ({
      ...prev,
      logoFile: file,
      logoPreview: URL.createObjectURL(file)
    }));
  };

  const handleMerchantCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('La foto de portada no debe superar los 10 MB.');
      return;
    }
    setMerchantForm(prev => ({
      ...prev,
      coverFile: file,
      coverPreview: URL.createObjectURL(file)
    }));
  };

  const handleRemoveMerchantLogo = (e) => {
    e.stopPropagation();
    setMerchantForm(prev => ({ ...prev, logoFile: null, logoPreview: '' }));
    if (merchantLogoInputRef.current) merchantLogoInputRef.current.value = '';
  };

  const handleRemoveMerchantCover = (e) => {
    e.stopPropagation();
    setMerchantForm(prev => ({ ...prev, coverFile: null, coverPreview: '' }));
    if (merchantCoverInputRef.current) merchantCoverInputRef.current.value = '';
  };
  const [merchantLoading, setMerchantLoading] = useState(false);
  const [showMerchantPassword, setShowMerchantPassword] = useState(false);
  const [showMerchantConfirmPassword, setShowMerchantConfirmPassword] = useState(false);
  const [merchantConfirmPassword, setMerchantConfirmPassword] = useState('');
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const loadingTexts = ["Configurando tu base de datos...", "Asociando métodos de pago...", "Desplegando tu vitrina..."];

  useEffect(() => {
    if (merchantRegStep === 7) {
      const interval = setInterval(() => {
        setLoadingTextIndex(prev => (prev < loadingTexts.length - 1 ? prev + 1 : prev));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [merchantRegStep]);

  // Pending store to visit after login
  const [pendingStoreSlug, setPendingStoreSlug] = useState(null);

  // Cart State
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [globalCart, setGlobalCart] = useState({});

  // Typewriter State
  const [typedCount, setTypedCount] = useState(0);
  const fullText = "Descubre comercios locales sin intermediarios.";
  
  // BCV Rate State
  const [bcvRate, setBcvRate] = useState('...');

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
    if (location.state?.openMerchantRegister || location.state?.openMerchantModal) {
      setIsMerchantModalOpen(true);
      setMerchantAuthMode(location.state?.mode || 'pitch');
    }
    if (location.state?.openAuthModal) {
      setIsAuthModalOpen(true);
    }
    if (location.state?.searchQuery) {
      setSearchTerm(location.state.searchQuery);
    }
    if (location.state?.category) {
      setActiveCategory(location.state.category);
    }
  }, [location.state]);

  useEffect(() => {
    let interval;
    if (!currentCustomer && !currentMerchant) {
      interval = setInterval(() => {
        setBannerSlide(prev => (prev + 1) % 2);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [currentCustomer, currentMerchant]);

  useEffect(() => {
    if (typedCount < fullText.length) {
      const timeout = setTimeout(() => {
        setTypedCount(c => c + 1);
      }, Math.random() * 50 + 80); // Lento y aleatorio (human-like)
      return () => clearTimeout(timeout);
    }
  }, [typedCount]);

  const loadGlobalCart = () => {
    try {
      setGlobalCart(JSON.parse(localStorage.getItem('ecommerce_global_cart') || '{}'));
    } catch(e) {}
  };

  useEffect(() => {
    const fetchStores = async () => {
      const cached = localStorage.getItem('ecommerce_marketplace_stores');
      if (cached) {
        try {
          setStores(JSON.parse(cached));
          setLoading(false);
        } catch(e) {}
      }
      
      
      // Also fetch if there is a logged-in merchant
      const wsId = localStorage.getItem('activeWorkspace');
      const storeSlug = localStorage.getItem('storeSlug');
      if (wsId) {
        supabase.from('workspaces').select('name').eq('id', wsId).single().then(({data}) => {
           if (data) setCurrentMerchant({ id: wsId, slug: storeSlug, name: data.name });
        });
      }

      const { data, error } = await supabase.from('workspaces').select('*').eq('status', 'Activo');
      if (!error && data) {
        const newCache = JSON.stringify(data);
        if (cached !== newCache) {
          setStores(data);
          localStorage.setItem('ecommerce_marketplace_stores', newCache);
        }
      } else if (error) {
        console.error("Error fetching stores:", error);
      }

      try {
        const { data: newsData } = await supabase
          .from('ecommerce_store_news')
          .select('*')
          .eq('status', 'Publicado')
          .order('created_at', { ascending: false });
        if (newsData && newsData.length > 0) {
          setStoreNews(newsData);
        }
      } catch (newsErr) {
        console.warn("Error fetching store news:", newsErr);
      }

      setLoading(false);
    };
    fetchStores();

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

    loadGlobalCart();
    window.addEventListener('cart_updated', loadGlobalCart);

    // Auto-open merchant register if navigated from Pricing
    if (location.state && location.state.openMerchantRegister) {
      setMerchantAuthMode('pitch');
      setIsMerchantModalOpen(true);
      // Opcional: const selectedPlan = location.state.selectedPlan;
      window.history.replaceState({}, document.title); // clear state to avoid reopening on refresh
    }

    // Detect password recovery magic link
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('reset');
        setIsAuthModalOpen(true);
      }
    });

    return () => {
      if (authListener?.subscription) authListener.subscription.unsubscribe();
      window.removeEventListener('cart_updated', loadGlobalCart);
    };
  }, [location.state]);

  const totalCartItems = Object.values(globalCart).reduce((acc, store) => {
    return acc + Object.values(store.items).reduce((sum, item) => sum + item.quantity, 0);
  }, 0);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (authForm.password !== authConfirmPassword) {
      alert("Las contraseñas no coinciden.");
      return;
    }
    const passReqs = [
      authForm.password.length >= 8,
      /[A-Z]/.test(authForm.password),
      /[a-z]/.test(authForm.password),
      /[0-9]/.test(authForm.password),
      /[^A-Za-z0-9]/.test(authForm.password)
    ];
    if (passReqs.some(r => !r)) {
      alert("La contraseña no cumple con los requisitos mínimos de seguridad.");
      return;
    }
    try {
      // Limpiar cualquier sesión expirada (JWT) que haya quedado en caché antes de registrar
      await supabase.auth.signOut();
      
      const authData = await registerUser(authForm.email, authForm.password, { name: authForm.name });
      
      if (authData?.user?.identities && authData.user.identities.length === 0) {
        alert("Este correo ya está registrado en nuestra plataforma. Por favor, inicia sesión.");
        setAuthMode('login');
        return;
      }

      const finalName = authForm.name ? authForm.name.trim() : authForm.email.split('@')[0];
      const { data: existingName } = await supabase
        .from('ecommerce_customers')
        .select('id')
        .ilike('name', finalName)
        .maybeSingle();

      if (existingName) {
        alert('Este nombre de usuario ya está registrado por otra persona. Por favor, elige uno distinto para evitar cuentas duplicadas.');
        return;
      }

      const newCustomer = {
        id: authData.user.id,
        name: authForm.name,
        email: authForm.email,
        password: 'SUPABASE_AUTH',
        doc_id: authForm.docId,
        phone: authForm.phone,
        address: authForm.address,
        status: 'Activo',
        join_date: new Date().toISOString()
      };

      const { error } = await supabase.from('ecommerce_customers').insert([newCustomer]);
      if (error && error.code !== '23505') throw error;

      if (!authData?.session) {
        alert("¡Registro exitoso! Por favor revisa tu bandeja de entrada o spam para confirmar tu correo electrónico. No podrás continuar hasta que lo verifiques.");
        setIsAuthModalOpen(false);
        setAuthMode('login');
        return;
      }

      const user = { 
        ...newCustomer, 
        docId: newCustomer.doc_id, 
        addresses: [], 
        payment_profile: [], 
        favorites: [], 
        wishlist: [], 
        orders: [] 
      };
      localStorage.setItem('ecommerce_current_customer', JSON.stringify(user));
      localStorage.removeItem('activeWorkspace');
      setCurrentCustomer(user);
      setIsAuthModalOpen(false);
      
      if (!user.phone || !user.doc_id || !user.address || !user.name || user.name === user.email.split('@')[0] || user.name === user.email) {
        setIsWizardOpen(true);
      } else if (pendingStoreSlug) {
        navigate(`/${pendingStoreSlug}`);
        setPendingStoreSlug(null);
      }
    } catch (err) {
      console.error(err);
      let errorMsg = err.message || 'Error al registrarse';
      if (errorMsg.includes('For security purposes, you can only request this after')) {
        errorMsg = 'Por seguridad anti-spam, debes esperar 1 minuto antes de volver a intentarlo.';
      }
      alert(errorMsg);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const rawIdentifier = (authForm.email || '').trim();
      let targetEmail = rawIdentifier;
      let matchedCustomer = null;

      // Si el usuario ingresó cédula o RIF en lugar de correo (ej. 36430689 o V-36430689)
      if (!rawIdentifier.includes('@')) {
        const cleanDocInput = rawIdentifier.replace(/[^0-9]/g, '');
        const { data: byDoc } = await supabase
          .from('ecommerce_customers')
          .select('*')
          .or(`doc_id.eq.${cleanDocInput},doc_id.ilike.%${cleanDocInput}%`)
          .maybeSingle();

        if (byDoc) {
          matchedCustomer = byDoc;
          if (byDoc.email) {
            targetEmail = byDoc.email;
          }
        } else {
          alert('No encontramos ninguna cuenta registrada con esa cédula.');
          return;
        }
      }

      let authData = null;
      try {
        authData = await loginUser(targetEmail, authForm.password);
      } catch (authErr) {
        // Fallback: si el cliente tiene contraseña directa en ecommerce_customers
        if (!matchedCustomer) {
          const { data: byEmail } = await supabase
            .from('ecommerce_customers')
            .select('*')
            .ilike('email', targetEmail)
            .maybeSingle();
          matchedCustomer = byEmail;
        }

        if (matchedCustomer && matchedCustomer.password === authForm.password) {
          authData = { user: { id: matchedCustomer.id, email: matchedCustomer.email || targetEmail } };
        } else {
          throw authErr;
        }
      }
      
      let { data: customerData } = await supabase
        .from('ecommerce_customers')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (!customerData) {
        if (matchedCustomer) {
          customerData = matchedCustomer;
        } else {
          const { data: byEmail } = await supabase
            .from('ecommerce_customers')
            .select('*')
            .ilike('email', targetEmail)
            .maybeSingle();
          if (byEmail) {
            customerData = byEmail;
            await supabase.from('ecommerce_customers').update({ id: authData.user.id }).eq('email', targetEmail);
          }
        }
      }

      let safePaymentProfiles = [];
      if (customerData?.payment_profile) {
        if (Array.isArray(customerData.payment_profile)) {
          safePaymentProfiles = customerData.payment_profile;
        } else if (typeof customerData.payment_profile === 'object' && Object.keys(customerData.payment_profile).length > 0) {
          safePaymentProfiles = [customerData.payment_profile];
        } else if (typeof customerData.payment_profile === 'string') {
          try {
            const p = JSON.parse(customerData.payment_profile);
            safePaymentProfiles = Array.isArray(p) ? p : [p];
          } catch(e){}
        }
      }

      let safeAddresses = [];
      if (customerData?.addresses) {
        if (Array.isArray(customerData.addresses)) {
          safeAddresses = customerData.addresses;
        } else if (typeof customerData.addresses === 'string') {
          try { safeAddresses = JSON.parse(customerData.addresses); } catch(e){}
        }
      }

      let safeFavorites = [];
      if (customerData?.favorites) {
        if (Array.isArray(customerData.favorites)) {
          safeFavorites = customerData.favorites;
        } else if (typeof customerData.favorites === 'string') {
          try { safeFavorites = JSON.parse(customerData.favorites); } catch(e){}
        }
      }

      const user = customerData ? {
        ...customerData,
        docId: customerData.doc_id || customerData.docId || '',
        addresses: safeAddresses,
        payment_profile: safePaymentProfiles,
        favorites: safeFavorites,
        wishlist: Array.isArray(customerData.wishlist) ? customerData.wishlist : [],
        orders: []
      } : {
        id: authData.user.id,
        email: authData.user.email,
        name: authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || 'Usuario',
        doc_id: '',
        docId: '',
        phone: '',
        address: '',
        addresses: [],
        payment_profile: [],
        favorites: [],
        wishlist: [],
        orders: []
      };
      
      localStorage.setItem('ecommerce_current_customer', JSON.stringify(user));
      localStorage.removeItem('activeWorkspace');
      setCurrentCustomer(user);
      setIsAuthModalOpen(false);
      
      const cleanPhone = (user.phone || '').replace(/\D/g, '');
      const cleanDoc = (user.docId || user.doc_id || '').replace(/\D/g, '');
      if (!user.name || user.name === user.email?.split('@')[0] || cleanPhone.length < 11 || cleanDoc.length < 6 || !user.address) {
        setIsWizardOpen(true);
      } else if (pendingStoreSlug) {
        navigate(`/${pendingStoreSlug}`);
        setPendingStoreSlug(null);
      }
    } catch (err) {
      console.error(err);
      alert('Credenciales incorrectas o error de conexión');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const base64Url = credentialResponse.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const payload = JSON.parse(jsonPayload);
      const { email, name, picture } = payload;
      
      if (!email) {
        alert('No se pudo obtener el email de Google');
        return;
      }

      const cleanEmail = email.trim().toLowerCase();

      // Sincronizar sesión con Supabase Auth si está configurado
      try {
        if (supabase.auth?.signInWithIdToken) {
          await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: credentialResponse.credential,
          });
        }
      } catch (authErr) {
        console.warn('Supabase signInWithIdToken omitido o no configurado:', authErr);
      }
      
      // Buscar cliente existente por email (insensible a mayúsculas/minúsculas)
      let { data: user } = await supabase
        .from('ecommerce_customers')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();
      
      let isNewUser = false;
      if (!user) {
        // Auto-creación de cuenta sin bloqueos ni errores
        isNewUser = true;
        const id = 'CUS-' + Math.floor(Math.random() * 1000000);
        const randomPassNum = Math.floor(1000 + Math.random() * 9000);
        const generatedPassword = `Axon${randomPassNum}`;
        const newUser = {
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
        const { error: insertErr } = await supabase.from('ecommerce_customers').insert([newUser]);
        if (insertErr) {
          console.error('Error insertando cliente en ecommerce_customers:', insertErr);
          const { data: retryUser } = await supabase
            .from('ecommerce_customers')
            .select('*')
            .ilike('email', cleanEmail)
            .maybeSingle();
          user = retryUser || newUser;
        } else {
          user = newUser;
        }

        // Enviar correo de bienvenida en segundo plano
        supabase.functions.invoke('send-welcome-email', {
          body: { email: user.email, name: user.name }
        }).catch(e => console.error('Error sending welcome email:', e));
      }
      
      let safePaymentProfiles = [];
      if (user?.payment_profile) {
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
      if (user?.addresses) {
        if (Array.isArray(user.addresses)) {
          safeAddresses = user.addresses;
        } else if (typeof user.addresses === 'string') {
          try { safeAddresses = JSON.parse(user.addresses); } catch(e){}
        }
      }

      const mappedUser = { 
        ...user, 
        auth_provider: 'google',
        is_verified: true,
        status: 'Activo',
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
      setIsAuthModalOpen(false);
      
      // Verificar si requiere completar perfil (teléfono 11 dígitos, cédula 6 dígitos)
      const cleanPhone = (mappedUser.phone || '').replace(/\D/g, '');
      const cleanDoc = (mappedUser.doc_id || mappedUser.docId || '').replace(/\D/g, '');
      const isProfileIncomplete = isNewUser || !mappedUser.address || cleanPhone.length < 11 || cleanDoc.length < 6;

      if (isProfileIncomplete) {
        setIsWizardOpen(true);
      } else if (pendingStoreSlug) {
        navigate(`/${pendingStoreSlug}`);
        setPendingStoreSlug(null);
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al iniciar con Google');
    }
  };

  const handleMerchantLogin = async (e) => {
    e.preventDefault();
    setMerchantLoading(true);
    try {
      const authData = await loginUser(merchantForm.email, merchantForm.password);
      
      const { data: wsData, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', authData.user.id)
        .single();
        
      if (error) throw new Error('No se encontró una tienda asociada a esta cuenta');
      
      localStorage.setItem('activeWorkspace', wsData.id);
      localStorage.setItem('storeSlug', wsData.store_slug || '');
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Credenciales incorrectas');
      setMerchantLoading(false);
    }
  };

  const handleGoogleMerchantSuccess = async (credentialResponse) => {
    try {
      const base64Url = credentialResponse.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const payload = JSON.parse(jsonPayload);
      if (payload.email) {
        const cleanEmail = payload.email.trim().toLowerCase();

        // Sincronizar Supabase Auth si está soportado
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

        // Verificar si la tienda ya existe (por adminEmail o owner_email)
        let { data: wsData } = await supabase
          .from('workspaces')
          .select('*')
          .or(`config->>adminEmail.ilike.${cleanEmail},owner_email.ilike.${cleanEmail}`)
          .maybeSingle();

        if (wsData) {
          // Si ya tiene tienda, iniciar sesión directamente en el ERP
          localStorage.setItem('activeWorkspace', wsData.id);
          localStorage.setItem('storeSlug', wsData.store_slug || '');
          setIsMerchantModalOpen(false);
          setTimeout(() => {
            navigate('/dashboard');
          }, 400);
        } else {
          // Si no tiene tienda, avanzar fluidamente al paso 2 de registro de tienda
          const randomPassword = Math.random().toString(36).slice(-10) + "Aa1!";
          setMerchantForm(prev => ({
            ...prev,
            email: cleanEmail,
            contactEmail: cleanEmail,
            ownerName: payload.name || prev.ownerName,
            password: randomPassword
          }));
          setMerchantAuthMode('register');
          setMerchantRegStep(2);
        }
      }
    } catch (err) {
      console.error('Error decoding google credential', err);
      alert('Hubo un problema al procesar la cuenta de Google.');
    }
  };

  const handleMerchantRegisterStep1 = (e) => {
    e.preventDefault();
    if (merchantForm.password !== merchantConfirmPassword) {
      alert("Las contraseñas no coinciden.");
      return;
    }
    const passReqs = [
      merchantForm.password.length >= 8,
      /[A-Z]/.test(merchantForm.password),
      /[a-z]/.test(merchantForm.password),
      /[0-9]/.test(merchantForm.password),
      /[^A-Za-z0-9]/.test(merchantForm.password)
    ];
    if (passReqs.some(r => !r)) {
      alert("La contraseña no cumple con los requisitos mínimos de seguridad.");
      return;
    }
    if (merchantForm.email && merchantForm.password) setMerchantRegStep(2);
  };

  const handleMerchantRegisterStep2 = async (e) => {
    e.preventDefault();
    const contactPhoneClean = (merchantForm.contactPhone || '').replace(/\D/g, '');
    if (contactPhoneClean.length < 11) {
      alert('El teléfono de contacto debe tener al menos 11 números (Ej. 0414-1234567).');
      return;
    }
    if (merchantForm.businessName && merchantForm.ownerName && merchantForm.contactEmail) {
      setMerchantLoading(true);
      try {
        const { data, error } = await supabase
          .from('workspaces')
          .select('name')
          .ilike('name', merchantForm.businessName.trim());
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          alert('Este nombre de negocio ya está registrado por otro comerciante. Por favor, elige uno diferente.');
          setMerchantLoading(false);
          return;
        }
        
        setMerchantRegStep(3);
      } catch (err) {
        console.error('Error verificando nombre del negocio:', err);
        alert('Hubo un error verificando la disponibilidad del nombre. Por favor intenta de nuevo.');
      }
      setMerchantLoading(false);
    }
  };

  const handleMerchantRegisterStep3 = (e) => {
    e.preventDefault();
    if (!merchantForm.scheduleActive || (merchantForm.scheduleOpen && merchantForm.scheduleClose)) setMerchantRegStep(4);
  };

  const handleMerchantRegisterStep4 = async (e) => {
    e.preventDefault();
    const rifClean = (merchantForm.rifNumber || '').replace(/\D/g, '');
    if (rifClean.length < 6) {
      alert('El número de RIF debe tener al menos 6 números.');
      return;
    }
    const pmPhoneClean = (merchantForm.pagoMovilPhone || '').replace(/\D/g, '');
    if (pmPhoneClean.length < 11) {
      alert('El teléfono de Pago Móvil debe tener al menos 11 números (Ej. 0414-1234567).');
      return;
    }
    const pmIdClean = (merchantForm.pagoMovilId || '').replace(/\D/g, '');
    if (pmIdClean.length < 6) {
      alert('La cédula o RIF de Pago Móvil debe tener al menos 6 números.');
      return;
    }
    if (merchantForm.rifNumber && merchantForm.pagoMovilPhone && merchantForm.pagoMovilBank) {
      setMerchantLoading(true);
      const fullRif = merchantForm.rifPrefix + merchantForm.rifNumber;
      try {
        const { data, error } = await supabase.from('workspaces').select('id').eq('config->>rif', fullRif);
        if (data && data.length > 0) {
          alert('Este RIF ya está registrado en otra tienda.');
          setMerchantLoading(false);
          return;
        }
      } catch (err) {
        console.error("Error verificando RIF:", err);
      }
      setMerchantLoading(false);
      setMerchantRegStep(5);
    }
  };

  const handleMerchantRegisterStep5 = async (e) => {
    e.preventDefault();
    setMerchantLoading(true);
    try {
      // Limpiar cualquier sesión expirada (JWT) que haya quedado en caché antes de registrar
      await supabase.auth.signOut();
      
      const authData = await registerUser(merchantForm.email, merchantForm.password, { name: merchantForm.businessName });
      
      if (authData?.user?.identities && authData.user.identities.length === 0) {
        alert("Este correo ya está registrado. Por favor, inicia sesión en lugar de crear una nueva cuenta.");
        setMerchantAuthMode('login');
        setMerchantLoading(false);
        return;
      }
      
      const generatedSlug = merchantForm.businessName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      // Generar 2FA
      const secret = new OTPAuth.Secret({ size: 20 });
      const totp = new OTPAuth.TOTP({
        issuer: 'Axon Market',
        label: merchantForm.businessName,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: secret
      });
      setMerchantMfaSecret(secret.base32);
      setMerchantMfaUrl(totp.toString());
      
      const resolvedAddress = merchantForm.addressLine || [merchantForm.addressCity, merchantForm.addressState].filter(v => v && v !== 'Por definir').join(', ') || 'Venezuela';
      const resolvedDescription = merchantForm.description?.trim() || `Bienvenido a ${merchantForm.businessName}. Especialistas en ${merchantForm.category}. Calidad y atención garantizada.`;

      // Subida de Logo y Portada HD a Supabase Storage (bucket ecommerce)
      let uploadedLogoUrl = null;
      let uploadedCoverUrl = null;

      if (merchantForm.logoFile) {
        try {
          const logoExt = merchantForm.logoFile.name.split('.').pop() || 'png';
          const logoPath = `store_assets/${authData.user.id}/logo_${Date.now()}.${logoExt}`;
          const { error: logoErr } = await supabase.storage.from('ecommerce').upload(logoPath, merchantForm.logoFile, { upsert: true });
          if (!logoErr) {
            const { data: logoData } = supabase.storage.from('ecommerce').getPublicUrl(logoPath);
            if (logoData?.publicUrl) uploadedLogoUrl = logoData.publicUrl;
          } else {
            console.warn("Error subiendo logo a storage:", logoErr);
          }
        } catch (e) {
          console.warn("Error procesando logo:", e);
        }
      }

      if (merchantForm.coverFile) {
        try {
          const coverExt = merchantForm.coverFile.name.split('.').pop() || 'jpg';
          const coverPath = `store_assets/${authData.user.id}/cover_${Date.now()}.${coverExt}`;
          const { error: coverErr } = await supabase.storage.from('ecommerce').upload(coverPath, merchantForm.coverFile, { upsert: true });
          if (!coverErr) {
            const { data: coverData } = supabase.storage.from('ecommerce').getPublicUrl(coverPath);
            if (coverData?.publicUrl) uploadedCoverUrl = coverData.publicUrl;
          } else {
            console.warn("Error subiendo portada a storage:", coverErr);
          }
        } catch (e) {
          console.warn("Error procesando portada:", e);
        }
      }

      const initialConfig = {
        adminEmail: merchantForm.email,
        description: resolvedDescription,
        business_type: merchantForm.category,
        categories: [merchantForm.category],
        modules: ['orders', 'inventory', 'analytics', 'product_studio'],
        logoUrl: uploadedLogoUrl,
        coverUrl: uploadedCoverUrl,
        heroUrl: uploadedCoverUrl,
        storefront: {
          logoUrl: uploadedLogoUrl,
          coverUrl: uploadedCoverUrl,
          heroUrl: uploadedCoverUrl
        },
        paymentProfile: {
          paymentMobile: true,
          pmBank: merchantForm.pagoMovilBank,
          pmPhone: merchantForm.pagoMovilPhone,
          pmId: merchantForm.pagoMovilId || `${merchantForm.rifPrefix}-${merchantForm.rifNumber}`,
          zelleActive: false,
          zelleEmail: '',
          zelleName: '',
          cashActive: false
        },
        shippingProfile: {
          flatRate: 0,
          freeShipping: false
        },
        scheduleProfile: {
          scheduleActive: merchantForm.scheduleActive,
          workDays: merchantForm.workingDays,
          openTime: merchantForm.scheduleOpen,
          closeTime: merchantForm.scheduleClose,
          closeWarningMinutes: merchantForm.closeWarningMinutes || 30
        },
        address: resolvedAddress,
        location: merchantForm.gpsCoords ? {
          lat: merchantForm.gpsCoords.lat,
          lng: merchantForm.gpsCoords.lng,
          address: resolvedAddress
        } : null,
        expediente: {
          ownerName: merchantForm.ownerName || '',
          legalType: merchantForm.rifPrefix || 'V',
          rif: merchantForm.rifNumber ? `${merchantForm.rifPrefix}-${merchantForm.rifNumber}` : 'V-00000000-0',
          state: merchantForm.addressState || 'Por definir',
          city: merchantForm.addressCity || 'Por definir',
          address: merchantForm.addressLine || '',
          gps: merchantForm.gpsCoords,
          whatsapp: merchantForm.contactPhone || merchantForm.pagoMovilPhone || '',
          instagram: ''
        },
        contact: {
          phone: merchantForm.contactPhone,
          email: merchantForm.contactEmail
        },
        is_verified: false
      };

      const newWorkspace = {
        id: authData.user.id,
        name: merchantForm.businessName,
        store_slug: generatedSlug,
        status: 'Pendiente',
        latitude: merchantForm.gpsCoords?.lat || null,
        longitude: merchantForm.gpsCoords?.lng || null,
        map_address: resolvedAddress,
        config: initialConfig
      };

      const { error } = await supabase.from('workspaces').insert([newWorkspace]);
      if (error && error.code !== '23505') throw error;

      const { error: contactError } = await supabase.from('merchant_contacts').insert([{
        id: authData.user.id,
        full_name: merchantForm.ownerName,
        phone: merchantForm.contactPhone,
        email: merchantForm.contactEmail
      }]);
      if (contactError && contactError.code !== '23505') console.error("Error guardando contacto:", contactError);

      if (!authData?.session) {
        alert("¡Cuenta creada! Por favor revisa tu correo electrónico (bandeja de entrada o spam) para verificar tu cuenta antes de continuar.");
        setMerchantLoading(false);
        setIsMerchantModalOpen(false);
        setMerchantAuthMode('login');
        return;
      }

      setTempWorkspace({ 
        id: newWorkspace.id, 
        slug: generatedSlug,
        logoUrl: uploadedLogoUrl,
        coverUrl: uploadedCoverUrl
      });
      setMerchantRegStep(6);
      setMerchantLoading(false);
    } catch (err) {
      console.error(err);
      if (err.message && err.message.includes('Error sending confirmation email')) {
        alert('Se creó el usuario pero falló el envío del email de confirmación. Revisa tu dominio verificado en Resend o desactiva "Confirm Email" en Supabase.');
      } else if (err.message && err.message.includes('For security purposes, you can only request this after')) {
        alert('Por seguridad anti-spam, debes esperar 1 minuto antes de volver a intentarlo.');
      } else {
        alert(err.message || 'Error de conexión');
      }
      setMerchantLoading(false);
    }
  };

  const handleDetectGPS = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMerchantForm(prev => ({
            ...prev,
            gpsCoords: { lat: position.coords.latitude, lng: position.coords.longitude }
          }));
          alert("¡Ubicación detectada exitosamente!");
        },
        (error) => {
          alert("No se pudo detectar la ubicación. Por favor, ingrésala manualmente.");
        }
      );
    } else {
      alert("Tu navegador no soporta geolocalización.");
    }
  };

  const handleMerchantVerify2FA = async (e) => {
    e.preventDefault();
    setMerchantLoading(true);
    try {
      const totp = new OTPAuth.TOTP({
        issuer: 'Axon Market',
        label: merchantForm.businessName,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(merchantMfaSecret)
      });
      
      const delta = totp.validate({ token: merchantMfaCode, window: 10 });
      if (delta === null) throw new Error('Código 2FA inválido');

      const resolvedAddress = merchantForm.addressLine || [merchantForm.addressCity, merchantForm.addressState].filter(v => v && v !== 'Por definir').join(', ') || 'Venezuela';
      const resolvedDescription = merchantForm.description?.trim() || `Bienvenido a ${merchantForm.businessName}. Especialistas en ${merchantForm.category}. Calidad y atención garantizada.`;

      const configPayload = {
        adminEmail: merchantForm.email,
        description: resolvedDescription,
        generatedPassword: merchantForm.password,
        business_type: merchantForm.category,
        logoUrl: tempWorkspace?.logoUrl || null,
        coverUrl: tempWorkspace?.coverUrl || null,
        heroUrl: tempWorkspace?.coverUrl || null,
        storefront: {
          logoUrl: tempWorkspace?.logoUrl || null,
          coverUrl: tempWorkspace?.coverUrl || null,
          heroUrl: tempWorkspace?.coverUrl || null
        },
        modules: ['orders', 'inventory', 'analytics', 'product_studio'],
        categories: [merchantForm.category],
        paymentProfile: {
          paymentMobile: true,
          pmBank: merchantForm.pagoMovilBank,
          pmPhone: merchantForm.pagoMovilPhone,
          pmId: merchantForm.pagoMovilId || `${merchantForm.rifPrefix}-${merchantForm.rifNumber}`,
          zelleActive: false,
          zelleEmail: '',
          zelleName: '',
          cashActive: false
        },
        shippingProfile: {
          flatRate: 0,
          freeShipping: false
        },
        scheduleProfile: {
          scheduleActive: merchantForm.scheduleActive,
          workDays: merchantForm.workingDays,
          openTime: merchantForm.scheduleOpen,
          closeTime: merchantForm.scheduleClose,
          closeWarningMinutes: merchantForm.closeWarningMinutes
        },
        address: resolvedAddress,
        location: merchantForm.gpsCoords ? {
          lat: merchantForm.gpsCoords.lat,
          lng: merchantForm.gpsCoords.lng,
          address: resolvedAddress
        } : null,
        expediente: {
          ownerName: merchantForm.ownerName || '',
          legalType: merchantForm.rifPrefix || 'V',
          rif: merchantForm.rifNumber ? `${merchantForm.rifPrefix}-${merchantForm.rifNumber}` : 'V-00000000-0',
          state: merchantForm.addressState || 'Por definir',
          city: merchantForm.addressCity || 'Por definir',
          address: merchantForm.addressLine || '',
          gps: merchantForm.gpsCoords,
          whatsapp: merchantForm.pagoMovilPhone || '',
          instagram: ''
        },
        mfaSecret: merchantMfaSecret,
        mfaEnabled: true
      };

      const { error } = await supabase
        .from('workspaces')
        .update({ 
          config: configPayload,
          latitude: merchantForm.gpsCoords?.lat || null,
          longitude: merchantForm.gpsCoords?.lng || null,
          map_address: resolvedAddress
        })
        .eq('id', tempWorkspace.id);

      if (error) throw new Error('Error al configurar los módulos en Supabase');

      localStorage.setItem('activeWorkspace', tempWorkspace.id);
      localStorage.setItem('storeSlug', tempWorkspace.slug);

      setMerchantRegStep(7);
      setMerchantLoading(false);

      setTimeout(() => {
        navigate('/dashboard');
      }, 3500);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error de verificación');
      setMerchantLoading(false);
    }
  };

  const handleRecoverPassword = async (e, type) => {
    e.preventDefault();
    const email = type === 'customer' ? authForm.email : merchantForm.email;
    if (!email) return alert('Por favor ingresa tu correo electrónico');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      
      alert('Se ha enviado un código de recuperación a tu correo electrónico para restablecer tu contraseña.');
      if (type === 'customer') setAuthMode('reset');
      else setMerchantAuthMode('reset');
    } catch (err) {
      alert(err.message || 'Error al solicitar recuperación');
    }
  };

  const handleResetPassword = async (e, type) => {
    e.preventDefault();
    const email = type === 'customer' ? authForm.email : merchantForm.email;
    
    if (!newPassword) {
      return alert('Por favor ingresa la nueva contraseña.');
    }

    const cleanToken = (recoveryCode || '').trim().replace(/\s+/g, '');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        if (!cleanToken) return alert('Por favor ingresa el código de recuperación que enviamos a tu correo.');
        
        // Paso 1: Verificar el código OTP (acepta 6 u 8 dígitos según lo enviado por Supabase)
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email,
          token: cleanToken,
          type: 'recovery'
        });
        if (verifyError) throw verifyError;
      }

      // Paso 2: Actualizar la contraseña ahora que estamos autenticados por la recuperación
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      // Paso 3: Sincronizar en ecommerce_customers si es tipo customer
      if (type === 'customer' && email) {
        try {
          await supabase.from('ecommerce_customers').update({ password: newPassword }).ilike('email', email.trim());
        } catch (e) {
          console.error("Error sincronizando contraseña en ecommerce_customers:", e);
        }
      }
      
      alert('Contraseña actualizada con éxito. Por favor inicia sesión con tu nueva clave.');
      setRecoveryCode('');
      setNewPassword('');
      // Desloguearse para forzar el inicio de sesión limpio con la nueva clave
      await supabase.auth.signOut();

      if (type === 'customer') setAuthMode('login');
      else setMerchantAuthMode('login');
    } catch (err) {
      alert(err.message || 'Error al restablecer la contraseña. Verifica que el código sea correcto y no haya expirado.');
    }
  };

  const isFavorite = (storeSlug) => {
    if (!currentCustomer || !currentCustomer.favorites) return false;
    try {
      const favorites = Array.isArray(currentCustomer.favorites) ? currentCustomer.favorites : (typeof currentCustomer.favorites === 'string' ? JSON.parse(currentCustomer.favorites || '[]') : []);
      return Array.isArray(favorites) && favorites.some(f => f.slug === storeSlug);
    } catch {
      return false;
    }
  };

  const toggleFavorite = async (e, store) => {
    e.stopPropagation();
    if (!currentCustomer) {
      setAuthMode('login');
      setIsAuthModalOpen(true);
      return;
    }
    
    let favorites = Array.isArray(currentCustomer.favorites) ? currentCustomer.favorites : (typeof currentCustomer.favorites === 'string' ? JSON.parse(currentCustomer.favorites || '[]') : []);
    
    const targetSlug = store.store_slug || store.slug;
    
    if (favorites.some(f => f.slug === targetSlug)) {
      favorites = favorites.filter(f => f.slug !== targetSlug);
    } else {
      favorites.push({ slug: targetSlug, name: store.name });
    }
    
    const updatedUser = { ...currentCustomer, favorites };
    setCurrentCustomer(updatedUser);
    localStorage.setItem('ecommerce_current_customer', JSON.stringify(updatedUser));

    try {
      await supabase.from('ecommerce_customers').update({ favorites }).eq('id', currentCustomer.id);
    } catch (err) {
      console.error(err);
    }
  };

  const categories = [
    { id: 'Todas', name: 'Todas', icon: Store },
    { id: 'Víveres', name: 'Víveres', icon: ShoppingBasket },
    { id: 'Proteínas', name: 'Proteínas', icon: Package },
    { id: 'Charcutería y Lácteos', name: 'Charcutería', icon: ShoppingBag },
    { id: 'Frutas y Verduras', name: 'Frutas', icon: Apple },
    { id: 'Panadería y Dulces', name: 'Panadería', icon: Coffee },
    { id: 'Bebidas y Licores', name: 'Bebidas', icon: Coffee },
    { id: 'Snacks y Golosinas', name: 'Snacks', icon: Package },
    { id: 'Cuidado Personal', name: 'C. Personal', icon: Heart },
    { id: 'Limpieza del Hogar', name: 'Limpieza', icon: Sparkles },
    { id: 'Ropa y Calzado', name: 'Ropa', icon: Shirt },
    { id: 'Repuestos para Carros', name: 'Autos', icon: Car },
    { id: 'Repuestos para Motos', name: 'Motos', icon: Settings },
    { id: 'Herramientas y Ferretería', name: 'Ferretería', icon: Wrench },
    { id: 'Tecnología y Celulares', name: 'Tecnología', icon: Smartphone },
    { id: 'Hogar y Electrodomésticos', name: 'Hogar', icon: Home }
  ];

  const filteredStores = stores.filter(store => 
    (activeCategory === 'Todas' || (store.config?.categories && store.config.categories.includes(activeCategory))) &&
    (store.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (store.config?.description && store.config.description.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const merchantStatuses = useMemo(() => {
    const list = [];
    const newsByWorkspace = {};
    (storeNews || []).forEach(news => {
      if (news?.workspace_id) {
        if (!newsByWorkspace[news.workspace_id]) {
          newsByWorkspace[news.workspace_id] = [];
        }
        newsByWorkspace[news.workspace_id].push(news);
      }
    });

    (stores || []).forEach(store => {
      const storeNewsList = newsByWorkspace[store.id] || [];
      const primaryNews = storeNewsList[0];
      const media = primaryNews?.image_url || store.config?.coverUrl || store.config?.storefront?.heroUrl || store.config?.bannerUrl;
      const logo = store.config?.logoUrl || store.config?.storefront?.logoUrl;
      
      if (media || logo || store.name) {
        list.push({
          id: store.id || store.store_slug,
          name: store.name || 'Comercio Axon',
          slug: store.store_slug || store.id,
          avatar: logo,
          mediaUrl: media || logo,
          caption: primaryNews ? `${primaryNews.title ? primaryNews.title + ': ' : ''}${primaryNews.content}` : (store.config?.description || '¡Conoce nuestras promociones y productos disponibles hoy!'),
          time: primaryNews?.created_at ? 'Hoy' : 'Activo',
          isVerified: !!store.config?.is_verified,
          hasNews: storeNewsList.length > 0
        });
      }
    });

    if (list.length === 0) {
      return [
        {
          id: 'demo-1',
          name: 'Burger King Express',
          slug: '',
          avatar: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=150&q=80',
          mediaUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80',
          caption: '🔥 ¡2x1 en combos especiales este fin de semana!',
          time: 'Hace 1h',
          isVerified: true
        },
        {
          id: 'demo-2',
          name: 'Moda Urbana',
          slug: '',
          avatar: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=150&q=80',
          mediaUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
          caption: '✨ Nueva colección de calzado y accesorios ya en vitrina.',
          time: 'Hace 3h',
          isVerified: true
        },
        {
          id: 'demo-3',
          name: 'TechStore',
          slug: '',
          avatar: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=150&q=80',
          mediaUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80',
          caption: '📱 Descuentos del 20% en cargadores rápidos y protectores.',
          time: 'Hace 4h',
          isVerified: true
        }
      ];
    }

    return list;
  }, [stores, storeNews]);

  const feedPosts = useMemo(() => {
    // 1. Vitrinas de tiendas
    const storeCards = filteredStores.map(store => ({
      id: `store_${store.id || store.store_slug}`,
      workspace_id: store.id,
      store_slug: store.store_slug,
      store_name: store.name,
      store_logo: store.config?.logoUrl || store.config?.storefront?.logoUrl,
      image_url: store.config?.coverUrl || store.config?.storefront?.heroUrl,
      content: store.config?.description || '¡Visita nuestra tienda para ver el catálogo completo!',
      map_address: store.map_address || store.config?.address || store.config?.location?.address || store.config?.expediente?.city || 'Venezuela',
      is_verified: store.config?.is_verified,
      created_at: store.created_at || new Date().toISOString(),
      type: 'store'
    }));

    // 2. Noticias y publicaciones de los comercios
    const newsCards = storeNews.map(news => {
      const parentStore = stores.find(s => s.id === news.workspace_id) || {};
      return {
        id: news.id,
        workspace_id: news.workspace_id,
        store_slug: parentStore.store_slug || news.workspace_id,
        store_name: parentStore.name || 'Comercio Axon',
        store_logo: parentStore.config?.logoUrl || parentStore.config?.storefront?.logoUrl,
        image_url: news.image_url || parentStore.config?.coverUrl || parentStore.config?.storefront?.heroUrl,
        content: `${news.title ? `📢 ${news.title}: ` : ''}${news.content}`,
        map_address: parentStore.map_address || parentStore.config?.address || 'Venezuela',
        is_verified: parentStore.config?.is_verified,
        created_at: news.created_at,
        type: 'news'
      };
    });

    let combined = [...newsCards, ...storeCards];

    // Filtros de descubrimiento dinámicos
    if (discoveryFilter === 'ofertas') {
      combined = combined.filter(p => 
        (p.content && /oferta|descuento|rebaja|remate|%/i.test(p.content)) ||
        p.type === 'news'
      );
    } else if (discoveryFilter === 'promociones') {
      combined = combined.filter(p => 
        (p.content && /promo|promoción|combo|2x1|gratis/i.test(p.content)) ||
        p.type === 'news'
      );
    } else if (discoveryFilter === 'verificadas') {
      combined = combined.filter(p => p.is_verified);
    } else if (discoveryFilter === 'eventos') {
      combined = combined.filter(p => p.type === 'news');
    } else if (discoveryFilter === 'top_likes') {
      // Priorizar posts de tiendas con favoritos y verified
      combined = [...combined].sort((a, b) => (b.is_verified ? 1 : 0) - (a.is_verified ? 1 : 0) || new Date(b.created_at || 0) - new Date(a.created_at || 0));
      return combined;
    } else if (discoveryFilter === 'tendencias') {
      // Tendencias: noticias y publicaciones más recientes
      combined = [...combined].sort((a, b) => (a.type === 'news' ? -1 : 1));
      return combined;
    }

    return combined.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [filteredStores, storeNews, stores, discoveryFilter]);

  // Soporte para enlaces compartidos directos (WhatsApp o Copiar Enlace)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetPost = params.get('post') || window.location.hash.replace('#post-', '');
    if (targetPost && feedPosts.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`post-${targetPost}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 350);
    }
  }, [feedPosts.length]);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen bg-zinc-100 md:bg-zinc-950/5 text-zinc-900 font-sans selection:bg-amber-500/30 relative overflow-x-hidden flex flex-col items-center">
      {/* PWA Install Banner */}
      <PwaInstallBanner />
      
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

      {/* Centered Mobile-First App Shell (Wider for Desktop) */}
      <div className="w-full max-w-md md:max-w-2xl lg:max-w-[720px] min-h-screen bg-white md:shadow-2xl md:border-x md:border-zinc-200/80 flex flex-col relative z-10">

        {/* App Header */}
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-zinc-100 py-3 px-4 md:px-6 shadow-xs">
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsMobileMenuOpen(true)} 
                className="text-amber-500 hover:text-amber-600 transition-colors p-1.5 -ml-1 rounded-lg hover:bg-amber-50" 
                title="Menú de opciones"
              >
                <MoreVertical size={22} strokeWidth={2.2} />
              </button>
              <div 
                className="flex items-center gap-2 select-none cursor-pointer" 
                onClick={() => { setActiveCategory('Todas'); setSearchTerm(''); setDiscoveryFilter('all'); window.scrollTo({ top: 0, behavior: 'smooth' }); navigate('/explorar'); }}
              >
                <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-zinc-900 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                  <ShoppingBag size={16} className="stroke-[2.5]"/>
                </div>
                <span className="font-black text-lg tracking-[0.2em] text-zinc-900">AXON<span className="text-amber-600 font-bold">MARKET</span></span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {Object.keys(globalCart).length > 0 && (
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="relative p-1.5 text-amber-500 hover:text-amber-600 transition-colors rounded-lg hover:bg-amber-50"
                  title="Ver mis carritos de compra"
                >
                  <ShoppingCart size={20} />
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black text-amber-400 text-[9px] font-black flex items-center justify-center border border-amber-500">
                    {Object.values(globalCart).reduce((sum, s) => sum + Object.values(s.items || {}).reduce((iSum, it) => iSum + (it.quantity || 1), 0), 0)}
                  </span>
                </button>
              )}

              {currentCustomer ? (
                /* Usuario logueado: Mostramos su foto de perfil */
                <button 
                  onClick={() => navigate('/profile')} 
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-50 transition-all focus:outline-none group"
                  title={`Perfil de ${currentCustomer.name || currentCustomer.email || 'Usuario'}`}
                >
                  {currentCustomer.profile_pic ? (
                    <img 
                      src={resolveImageUrl(currentCustomer.profile_pic)} 
                      alt="Perfil" 
                      className="w-8 h-8 rounded-full object-cover border-2 border-amber-500 shadow-xs group-hover:scale-105 transition-transform" 
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center border-2 border-amber-300 shadow-xs group-hover:scale-105 transition-transform">
                      {(currentCustomer.name || currentCustomer.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>
              ) : currentMerchant ? (
                /* Comercio logueado */
                <button 
                  onClick={() => navigate('/dashboard')} 
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-slate-950 rounded-full text-xs font-bold hover:bg-amber-400 transition-colors shadow-xs"
                >
                  <Store size={14} /> Panel
                </button>
              ) : (
                /* Visitante no logueado */
                <>
                  <button 
                    onClick={() => { setMerchantAuthMode('pitch'); setIsMerchantModalOpen(true); }} 
                    className="text-amber-500 hover:text-amber-600 transition-colors p-1.5 rounded-lg hover:bg-amber-50 flex items-center"
                    title="Abrir mi Tienda"
                  >
                    <Store size={20} strokeWidth={2} />
                  </button>
                  
                  <button 
                    onClick={() => { setAuthMode('login'); setIsAuthModalOpen(true); }} 
                    className="text-amber-500 hover:text-amber-600 transition-colors p-1.5 rounded-lg hover:bg-amber-50 flex items-center"
                    title="Iniciar Sesión"
                  >
                    <User size={20} strokeWidth={2} />
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* 1. Panel de Estados / Promociones de Comerciantes estilo WhatsApp (ARRIBA del buscador) */}
        <div className="px-3 md:px-5 py-2.5 border-b border-zinc-100 bg-white">
          <div className="flex items-center justify-between px-1 mb-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-black tracking-wider uppercase text-zinc-800">Estados de Comerciantes</span>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase tracking-wider">En vivo</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-medium">Toca para ver</span>
          </div>
          
          <div className="flex overflow-x-auto gap-4 py-1 px-1 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {merchantStatuses.map((status, idx) => (
              <div 
                key={status.id || idx}
                onClick={() => {
                  setActiveStatusIndex(idx);
                  setIsStatusViewerOpen(true);
                }}
                className="flex flex-col items-center gap-1.5 cursor-pointer group snap-start shrink-0 select-none"
                title={`Ver estado de ${status.name}`}
              >
                <div className="relative">
                  {/* Anillo de estado circular estilo WhatsApp / Stories */}
                  <div className="w-14 h-14 rounded-full p-[2.5px] bg-gradient-to-tr from-emerald-500 via-amber-500 to-orange-500 group-hover:scale-105 group-active:scale-95 transition-transform duration-150 shadow-sm">
                    <div className="w-full h-full rounded-full bg-white p-[2px] overflow-hidden">
                      {status.avatar ? (
                        <img 
                          src={resolveImageUrl(status.avatar)} 
                          alt={status.name} 
                          className="w-full h-full object-cover rounded-full" 
                          onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=150&q=80'; }}
                        />
                      ) : (
                        <div className="w-full h-full bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs rounded-full">
                          <Store size={20} />
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Badge de video/promo en esquina */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs border-2 border-white">
                    <Play size={8} fill="currentColor" />
                  </div>
                </div>
                <span className="text-[10px] text-center font-bold text-zinc-700 truncate w-14 group-hover:text-amber-600 transition-colors">
                  {status.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. App Search Bar (Buscador) */}
        <div className="px-4 md:px-6 py-2.5 sticky top-[57px] z-40 bg-white/95 backdrop-blur-md border-b border-zinc-100 shadow-xs">
          <div className="relative w-full group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search size={18} className="text-zinc-400" />
            </div>
            <input
              id="mobile-search-input"
              type="text"
              placeholder="¿Qué quieres pedir hoy?"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200/80 rounded-2xl py-2.5 pl-10 pr-4 text-zinc-900 text-sm font-medium focus:outline-none focus:border-amber-500/50 shadow-inner placeholder-zinc-400"
            />
          </div>
        </div>

        {/* 3. Explorar Destacados / Categorías Rápidas (ABAJO del buscador) */}
        <div className="px-3 md:px-5 py-3 border-b border-zinc-100 bg-white">
          <div className="flex items-center justify-between px-1 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-[11px] font-black tracking-wider uppercase text-zinc-800">EXPLORAR DESTACADOS</span>
            </div>
            {discoveryFilter !== 'all' && (
              <button
                onClick={() => setDiscoveryFilter('all')}
                className="text-[10px] font-bold text-amber-600 hover:text-amber-700 hover:underline"
              >
                Ver todo
              </button>
            )}
          </div>
          
          <div className="flex overflow-x-auto gap-3.5 py-1 px-1 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {[
              { id: 'all', name: 'Todo', icon: ShoppingBag, color: 'from-amber-500 to-amber-300' },
              { id: 'ofertas', name: 'Ofertas', icon: Flame, color: 'from-orange-500 to-amber-400' },
              { id: 'promociones', name: 'Promos', icon: Gift, color: 'from-purple-500 to-pink-500' },
              { id: 'top_likes', name: 'Más Likes', icon: Heart, color: 'from-rose-500 to-red-400' },
              { id: 'tendencias', name: 'Tendencias', icon: TrendingUp, color: 'from-blue-500 to-cyan-400' },
              { id: 'verificadas', name: 'Top Tiend...', icon: ShieldCheck, color: 'from-emerald-500 to-teal-400' },
              { id: 'eventos', name: 'Eventos', icon: Zap, color: 'from-yellow-400 to-amber-500' }
            ].map((story) => {
              const isActive = discoveryFilter === story.id;
              const IconComp = story.icon;
              return (
                <div 
                  key={story.id} 
                  onClick={() => setDiscoveryFilter(story.id)} 
                  className="flex flex-col items-center gap-1.5 cursor-pointer group snap-start shrink-0 select-none"
                >
                  <div className={`w-14 h-14 rounded-full p-0.5 transition-all duration-300 ${isActive ? `bg-gradient-to-tr ${story.color} shadow-[0_0_15px_rgba(245,158,11,0.45)] scale-105` : 'bg-zinc-200/80 hover:bg-amber-300'}`}>
                    <div className={`w-full h-full rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-600 group-hover:text-amber-600'}`}>
                      <IconComp size={20} strokeWidth={isActive ? 2.5 : 1.9} className={isActive ? 'text-amber-400' : ''} />
                    </div>
                  </div>
                  <span className={`text-[10px] text-center font-bold truncate w-14 ${isActive ? 'text-amber-600 font-black' : 'text-zinc-500'}`}>
                    {story.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Indicador de Categoría Activa (si el usuario filtró desde el menú de categorías) */}
        {activeCategory !== 'Todas' && (
          <div className="px-4 md:px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="text-xs font-bold text-zinc-800">
                Categoría: <span className="text-amber-700 font-black">{activeCategory}</span>
              </span>
            </div>
            <button
              onClick={() => setActiveCategory('Todas')}
              className="text-xs font-bold text-amber-600 hover:text-amber-800 hover:underline"
            >
              Mostrar todas
            </button>
          </div>
        )}

        {/* Feed Principal de Publicaciones (Estilo TikTok / Pantalla Completa sin fricción) */}
        <div className="flex flex-col space-y-0 px-0 py-0 pb-28 flex-1 w-full bg-black">
          {feedPosts.length === 0 ? (
            <div className="mx-4 my-8 text-center py-16 px-4 bg-zinc-900/60 rounded-2xl border border-dashed border-zinc-800">
              <ShoppingBag size={36} className="text-zinc-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-zinc-300">No hay publicaciones disponibles</p>
              <p className="text-xs text-zinc-500 mt-1">Prueba seleccionando otra categoría o limpiando la búsqueda.</p>
              {activeCategory !== 'Todas' && (
                <button 
                  onClick={() => setActiveCategory('Todas')} 
                  className="mt-4 px-4 py-1.5 bg-amber-500 text-zinc-950 font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Ver todos los comercios
                </button>
              )}
            </div>
          ) : (
            feedPosts.map((post) => (
              <SocialFeedCard
                key={post.id}
                post={post}
                currentCustomer={currentCustomer}
                onOpenComments={(target) => setActiveCommentsPost(target)}
                onRequireAuth={() => setIsAuthModalOpen(true)}
                onNavigateStore={(slug) => navigate(`/${slug}`)}
              />
            ))
          )}

          {/* Footer App Compacto */}
          <div className="mx-4 py-6 px-4 text-center border-t border-zinc-800 bg-zinc-900/50 mt-4 mb-16 rounded-2xl">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-6 h-6 bg-amber-500 rounded-md flex items-center justify-center text-zinc-950 font-black text-xs">
                <ShoppingBag size={14} className="stroke-[2.5]" />
              </div>
              <span className="font-bold text-xs tracking-widest text-zinc-100">AXON<span className="text-amber-500">MARKET</span></span>
            </div>
            <p className="text-[11px] text-zinc-400">Tu marketplace local en Venezuela</p>
            <div className="flex items-center justify-center gap-3 mt-3 text-[10px] text-zinc-400">
              <button onClick={() => navigate('/legal/terminos')} className="hover:text-amber-400">Términos</button>
              <span>•</span>
              <button onClick={() => navigate('/legal/privacidad')} className="hover:text-amber-400">Privacidad</button>
              <span>•</span>
              <button onClick={() => navigate('/legal/aviso')} className="hover:text-amber-400">Aviso Legal</button>
            </div>
            <p className="text-[10px] text-zinc-500 mt-2">© {new Date().getFullYear()} AxonMarket</p>
          </div>
        </div>

      </div>

      {/* Botón flotante en esquina izquierda (Negro transparente ultra moderno, sin parpadeo) */}
      {!isBottomNavOpen && (
        <button
          onClick={() => setIsBottomNavOpen(true)}
          className="fixed bottom-5 left-4 z-50 w-12 h-12 rounded-full dark-glass-fab flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
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
          <ShoppingBag size={22} className="stroke-[2.2] text-amber-400" />
        </button>
      )}

      {/* Bottom Navigation Bar - Negro transparente ultra moderno (Glassmorphism de lujo, Cero Lag) */}
      {isBottomNavOpen && (
        <div 
          className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[480px] z-50 rounded-2xl dark-glass-nav"
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
              onClick={() => { window.scrollTo({ top: 0, behavior: 'instant' }); }}
              className="flex-1 flex flex-col items-center gap-1 p-2 text-amber-400 cursor-pointer"
            >
              <Home size={22} fill="currentColor" />
              <span className="text-[10px] font-bold text-amber-400">Inicio</span>
            </button>
            
            <button onClick={() => {
              setIsCategoriesOpen(true);
            }} className="flex-1 flex flex-col items-center gap-1 p-2 text-zinc-300 hover:text-white cursor-pointer group">
              <Menu size={22} className="text-zinc-300 group-hover:text-white" />
              <span className="text-[10px] font-medium text-zinc-300 group-hover:text-white">Categorías</span>
            </button>

            {/* Floating Action Button */}
            <div className="flex-1 flex justify-center relative -top-6">
              <div 
                onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })} 
                className="w-14 h-14 bg-gradient-to-tr from-amber-500 to-amber-400 rounded-full flex items-center justify-center text-zinc-950 shadow-[0_10px_25px_rgba(245,158,11,0.55)] cursor-pointer active:scale-95 transition-transform"
                title="Subir al inicio"
              >
                <ShoppingBag size={24} className="stroke-[2.5]" />
              </div>
            </div>

            <button onClick={() => {
              if (!currentCustomer) { 
                setAuthMode('login'); 
                setIsAuthModalOpen(true); 
              } else {
                navigate('/profile', { state: { tab: 'favoritas' } });
              }
            }} className="flex-1 flex flex-col items-center gap-1 p-2 text-zinc-300 hover:text-amber-400 cursor-pointer group">
              <Heart size={22} className="text-zinc-300 group-hover:text-amber-400" />
              <span className="text-[10px] font-medium text-zinc-300 group-hover:text-amber-400">Favoritos</span>
            </button>

            <button onClick={() => {
              navigate('/mapa');
            }} className="flex-1 flex flex-col items-center gap-1 p-2 text-zinc-300 hover:text-amber-400 cursor-pointer group">
              <MapPin size={22} className="text-zinc-300 group-hover:text-amber-400" />
              <span className="text-[10px] font-medium text-zinc-300 group-hover:text-amber-400">Mapa</span>
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
        </div>
      )}

      {/* Modal Visor de Estados / Historias de Comerciantes estilo WhatsApp */}
      <MerchantStatusViewerModal
        isOpen={isStatusViewerOpen}
        onClose={() => setIsStatusViewerOpen(false)}
        statuses={merchantStatuses}
        initialIndex={activeStatusIndex}
        onNavigateStore={(slug) => navigate(`/${slug}`)}
      />

      {/* Cart Slide-over */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-black/90" onClick={() => setIsCartOpen(false)}
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 200 }}
              className="bg-zinc-50 border-l border-zinc-200 w-full max-w-md h-full relative z-10 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-black/5 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100">
                    <ShoppingCart className="text-amber-500" size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 tracking-tight">Mis Carritos</h2>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="text-zinc-500 hover:text-black hover:bg-zinc-100 rounded-full p-2 transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 scrollbar-hide bg-zinc-50">
                {Object.keys(globalCart).length === 0 ? (
                  <div className="text-center py-20 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-8 shadow-sm border border-black/5">
                      <ShoppingBag size={48} className="text-zinc-700" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-3 tracking-tight">Carrito Vacío</h3>
                    <p className="text-zinc-600 text-sm mb-10 max-w-[250px] leading-relaxed">El ecosistema está lleno de productos increíbles. Explora el directorio.</p>
                    <button onClick={() => setIsCartOpen(false)} className="px-10 py-4 text-zinc-900 bg-amber-500 rounded-full text-xs font-bold tracking-widest uppercase transition-all shadow-lg shadow-amber-500/30 hover:scale-[1.02]">Explorar</button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(globalCart).map(([storeSlug, storeData]) => (
                      <div key={storeSlug} className="bg-white rounded-[24px] p-5 border border-black/5 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between mb-5 border-b border-black/5 pb-4">
                          <h4 className="font-bold text-slate-800 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center border border-amber-100 text-amber-500">
                              <Store size={16} />
                            </div>
                            {storeData.storeName}
                          </h4>
                          <button onClick={() => {
                            const gc = {...globalCart};
                            delete gc[storeSlug];
                            setGlobalCart(gc);
                            localStorage.setItem('ecommerce_global_cart', JSON.stringify(gc));
                            window.dispatchEvent(new Event('cart_updated'));
                          }} className="text-[10px] text-red-500 hover:text-red-600 font-bold tracking-[0.1em] uppercase transition-colors bg-red-50 px-3 py-1.5 rounded-full">Vaciar</button>
                        </div>
                        <div className="space-y-4">
                          {Object.values(storeData.items).map(item => (
                            <div key={item.id} className="flex gap-4">
                              <div className="w-16 h-16 bg-zinc-50 rounded-2xl border border-black/5 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-inner">
                                {item.imageUrl ? (
                                  <img src={resolveImageUrl(item.imageUrl)} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Package size={20} className="text-zinc-500" />
                                )}
                              </div>
                              <div className="flex-1 flex flex-col justify-center">
                                <h5 className="text-sm font-bold text-slate-800 line-clamp-1 mb-1">{item.name}</h5>
                                <div className="text-amber-500 font-black text-sm tracking-wide">${item.price.toFixed(2)} <span className="text-zinc-600 font-medium ml-1">x {item.quantity}</span></div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => navigate(`/${storeSlug}`)} className="w-full mt-6 py-4 bg-amber-500 text-zinc-900 rounded-2xl text-xs font-bold tracking-[0.2em] uppercase shadow-lg shadow-amber-500/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                          Completar Pedido <ArrowRight size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Categories Slide-over / Modal (Responsive: Slide-over on Mobile, Centered Modal on Desktop) */}
      <AnimatePresence>
        {isCategoriesOpen && (
          <div className="fixed inset-0 z-[100] flex justify-start md:items-center md:justify-center p-0 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-xs" onClick={() => setIsCategoriesOpen(false)}
            />
            <motion.div 
              initial={{ x: isMobile ? '-100%' : 0, scale: isMobile ? 1 : 0.95, opacity: isMobile ? 1 : 0 }}
              animate={{ x: 0, scale: 1, opacity: 1 }}
              exit={{ x: isMobile ? '-100%' : 0, scale: isMobile ? 1 : 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white border border-zinc-200 w-full max-w-[88%] md:max-w-3xl h-full md:h-auto md:max-h-[85vh] md:rounded-3xl relative z-10 shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-5 md:p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20 text-amber-600">
                    <Menu size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-zinc-900 tracking-tight">Departamentos y Categorías</h2>
                    <p className="text-xs text-zinc-500 hidden md:block">Selecciona un departamento para filtrar los comercios disponibles</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activeCategory !== 'Todas' && (
                    <button 
                      onClick={() => { setActiveCategory('Todas'); setIsCategoriesOpen(false); }}
                      className="text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl transition-colors"
                    >
                      Limpiar filtro
                    </button>
                  )}
                  <button onClick={() => setIsCategoriesOpen(false)} className="text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full p-2 transition-all">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 md:p-6 scrollbar-hide">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4 mb-4">
                  {categories.map((cat) => {
                    const isActive = activeCategory === cat.id;
                    const IconComponent = cat.icon;
                    return (
                      <div 
                        key={cat.id} 
                        onClick={() => { 
                          setActiveCategory(cat.id); 
                          setIsCategoriesOpen(false); 
                          window.scrollTo({ top: 0, behavior: 'smooth' }); 
                        }} 
                        className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl border transition-all cursor-pointer text-center group ${
                          isActive 
                            ? 'bg-amber-500/10 border-amber-500 text-amber-600 shadow-sm' 
                            : 'bg-zinc-50/80 border-zinc-200/80 hover:bg-amber-50/40 hover:border-amber-300 text-zinc-700'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                          isActive ? 'bg-amber-500 text-black shadow-xs' : 'bg-white border border-zinc-200 text-zinc-600 group-hover:text-amber-600 shadow-2xs'
                        }`}>
                          <IconComponent size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                        </div>
                        <span className="text-xs font-bold leading-tight line-clamp-1">{cat.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsAuthModalOpen(false)} />
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg relative z-10 overflow-y-auto max-h-[95vh] scrollbar-hide border border-slate-200 animate-in zoom-in-95 duration-150">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 to-amber-600"></div>

              <div className="p-8 pb-6 flex items-center justify-between border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-200/60 shadow-sm text-amber-500">
                      <User size={24} />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                      {authMode === 'login' ? 'Acceso Comprador' : authMode === 'register' ? 'Crear Cuenta' : 'Recuperar Acceso'}
                    </h2>
                  </div>
                  <p className="text-slate-500 font-normal text-sm mt-1">
                    {authMode === 'login' ? 'Inicia sesión con tu correo o cédula para comprar y gestionar tus pedidos.' : authMode === 'register' ? 'Únete a AxonMarket para comprar con Pago Móvil directo y delivery.' : 'Ingresa tu correo o cédula para restablecer tu contraseña.'}
                  </p>
                </div>
                <button onClick={() => setIsAuthModalOpen(false)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full p-2 transition-colors self-start">
                  <X size={20} />
                </button>
              </div>

              {authMode !== 'recover' && authMode !== 'reset' && (
                <div className="px-8 pt-4 pb-2">
                  <div className="flex bg-slate-100 rounded-full p-1 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className={`flex-1 py-3 rounded-full text-xs font-bold tracking-widest uppercase transition-all ${
                        authMode === 'login'
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Iniciar Sesión
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMode('register')}
                      className={`flex-1 py-3 rounded-full text-xs font-bold tracking-widest uppercase transition-all ${
                        authMode === 'register'
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Crear Cuenta
                    </button>
                  </div>
                </div>
              )}

              {authMode === 'recover' || authMode === 'reset' ? (
                <form onSubmit={(e) => authMode === 'recover' ? handleRecoverPassword(e, 'customer') : handleResetPassword(e, 'customer')} className="p-8 pt-4 space-y-5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Correo Electrónico</label>
                    <input type="email" required value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} disabled={authMode === 'reset'} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors font-medium placeholder-slate-400 shadow-sm" placeholder="tu@correo.com" />
                  </div>
                  {authMode === 'reset' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Código de Recuperación <span className="lowercase text-slate-400 font-normal">(Opcional si usaste un enlace mágico)</span></label>
                        <input type="text" value={recoveryCode} onChange={e => setRecoveryCode(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors font-medium placeholder-slate-400 shadow-sm font-mono tracking-wider" placeholder="Ej. 10669615" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Nueva Contraseña</label>
                        <div className="relative">
                          <input 
                            type={showNewPassword ? "text" : "password"} 
                            required 
                            value={newPassword} 
                            onChange={e => setNewPassword(e.target.value)} 
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 pr-12 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors font-medium placeholder-slate-400 shadow-sm" 
                            placeholder="••••••••" 
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowNewPassword(!showNewPassword)} 
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500 transition-colors p-1"
                            title={showNewPassword ? "Ocultar contraseña" : "Ver contraseña"}
                          >
                            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                  <button type="submit" className="w-full bg-amber-500 text-slate-950 rounded-full py-4 font-bold text-xs tracking-[0.2em] uppercase transition-all shadow-lg shadow-amber-500/20 hover:bg-amber-400 flex items-center justify-center gap-2">
                    {authMode === 'recover' ? 'Enviar Código' : 'Restablecer Contraseña'} <ArrowRight size={16} />
                  </button>
                  <p className="text-center text-sm font-light text-slate-500 mt-4">
                    <button type="button" onClick={() => setAuthMode('login')} className="text-slate-900 font-bold hover:text-amber-500 transition-colors focus:outline-none">
                      Volver al inicio de sesión
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="p-8 pt-4 space-y-5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">
                      {authMode === 'login' ? 'Correo Electrónico o Cédula / RIF' : 'Correo Electrónico'}
                    </label>
                    <input 
                      type={authMode === 'login' ? 'text' : 'email'} 
                      required 
                      value={authForm.email} 
                      onChange={e => setAuthForm({...authForm, email: e.target.value})} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors font-medium placeholder-slate-400 shadow-sm" 
                      placeholder={authMode === 'login' ? 'tu@correo.com o V-12345678' : 'tu@correo.com'} 
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

                  {authMode === 'register' && (
                    <>
                      <PasswordRequirements password={authForm.password} />
                      <div className="mt-4">
                        <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Confirmar Contraseña</label>
                        <div className="relative">
                          <input 
                            type={showAuthConfirmPassword ? "text" : "password"} 
                            required 
                            value={authConfirmPassword} 
                            onChange={e => setAuthConfirmPassword(e.target.value)} 
                            className={`w-full bg-slate-50 border ${authConfirmPassword && authConfirmPassword !== authForm.password ? 'border-red-500' : 'border-slate-200'} rounded-2xl px-5 py-4 pr-12 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors font-medium placeholder-slate-400 shadow-sm`} 
                            placeholder="••••••••" 
                          />
                          <button type="button" onClick={() => setShowAuthConfirmPassword(!showAuthConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500 transition-colors">
                            {showAuthConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        {authConfirmPassword && authConfirmPassword !== authForm.password && (
                          <p className="text-red-500 text-xs mt-2">Las contraseñas no coinciden.</p>
                        )}
                      </div>
                    </>
                  )}

                  {authMode === 'login' && (
                    <div className="flex justify-end">
                      <button type="button" onClick={() => setAuthMode('recover')} className="text-[10px] text-amber-600 hover:text-amber-700 font-bold uppercase tracking-wider transition-colors">
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                  )}

                  {authMode === 'register' && (
                    <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                      <input
                        type="checkbox"
                        id="buyer-terms-checkbox"
                        checked={termsAccepted}
                        onChange={e => setTermsAccepted(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-amber-500 shrink-0 cursor-pointer"
                      />
                      <label htmlFor="buyer-terms-checkbox" className="text-xs text-slate-500 leading-relaxed cursor-pointer">
                        He leído y acepto los{' '}
                        <button type="button" onClick={() => { setIsAuthModalOpen(false); navigate('/legal/terminos'); }} className="text-amber-600 hover:underline font-bold">Términos de Uso</button>
                        {' '}y la{' '}
                        <button type="button" onClick={() => { setIsAuthModalOpen(false); navigate('/legal/privacidad'); }} className="text-amber-600 hover:underline font-bold">Política de Privacidad</button>
                        {' '}de AxonMarket.
                      </label>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={authMode === 'register' && !termsAccepted} 
                    className="w-full bg-amber-500 text-slate-950 rounded-full py-4 mt-2 font-bold text-xs tracking-[0.2em] uppercase transition-all shadow-lg shadow-amber-500/20 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {authMode === 'login' ? 'Acceder al Ecosistema' : 'Registrarme'} <ArrowRight size={16} />
                  </button>
                </form>
              )}

              <div className="px-8 pb-8 pt-0">
                <div className="relative py-2 mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                    <span className="bg-white px-3 text-slate-400 font-bold">o continúa con</span>
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => alert('Fallo al conectar con Google')}
                    theme="outline"
                    shape="pill"
                    text="continue_with"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

      {isMerchantModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !merchantLoading && setIsMerchantModalOpen(false)} />
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg relative z-10 overflow-y-auto max-h-[95vh] scrollbar-hide border border-slate-200 animate-in zoom-in-95 duration-150">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 to-amber-600"></div>
              
              <div className="p-8 pb-6 flex items-center justify-between border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-200/60 shadow-sm text-amber-500">
                      <Store size={24} />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                      {merchantAuthMode === 'pitch' ? 'El Control Total de tu Negocio' : merchantAuthMode === 'register' ? 'Inicia tu Tienda' : merchantAuthMode === 'login' ? 'Panel Central' : 'Recuperar Acceso'}
                    </h2>
                  </div>
                  <p className="text-slate-500 font-normal text-sm mt-1">
                    {merchantAuthMode === 'pitch' ? 'Tu propia tienda en la nube con inventario ERP, pagos directos y delivery automatizado.' : merchantAuthMode === 'register' ? 'Crea tu tienda y únete a la red comercial de AxonMarket.' : 'Accede a tu infraestructura de ventas.'}
                  </p>
                </div>
                <button onClick={() => !merchantLoading && setIsMerchantModalOpen(false)} className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full p-2 transition-colors self-start">
                  <X size={20} />
                </button>
              </div>

              {merchantAuthMode !== 'pitch' && (merchantAuthMode !== 'register' || merchantRegStep === 1) && (
                <div className="px-8 pt-4 pb-2">
                  <div className="flex bg-slate-100 rounded-full p-1 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setMerchantAuthMode('register')}
                      className={`flex-1 py-3 rounded-full text-xs font-bold tracking-widest uppercase transition-all ${
                        merchantAuthMode === 'register'
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Crear Tienda
                    </button>
                    <button
                      type="button"
                      onClick={() => setMerchantAuthMode('login')}
                      className={`flex-1 py-3 rounded-full text-xs font-bold tracking-widest uppercase transition-all ${
                        (merchantAuthMode === 'login' || merchantAuthMode === 'recover' || merchantAuthMode === 'reset')
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Iniciar Sesión
                    </button>
                  </div>
                </div>
              )}

              {merchantAuthMode === 'pitch' && (
                <div className="p-8 pt-0">
                  <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 shadow-[0_0_30px_rgba(245,158,11,0.1)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-amber-200/50 blur-3xl rounded-full"></div>
                    
                    <div className="flex items-center justify-between mb-5 relative z-10">
                      <span className="text-amber-700 font-black tracking-widest uppercase text-xs bg-amber-200/60 px-3 py-1.5 rounded-full">TODO EN UNO · 0% COMISIÓN</span>
                      <div className="flex flex-col items-end">
                        <div className="flex items-end gap-2">
                          <span className="text-zinc-400 line-through text-sm font-medium">$60</span>
                          <span className="text-zinc-900 font-black text-4xl leading-none">$40</span>
                          <span className="text-zinc-500 text-xs font-bold mb-1">/ MES</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4 mb-6 relative z-10">
                      <div className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-amber-600 font-bold text-sm">✓</span>
                        </div>
                        <p className="text-zinc-600 font-light text-sm leading-relaxed">
                          <strong className="text-zinc-900">0% Comisiones y Pago Móvil Directo:</strong> Las apps tradicionales te quitan hasta un 30%. Aquí el cliente sube su captura y referencia de Pago Móvil, y tú recibes el 100% del dinero directo en tu cuenta bancaria sin retenciones.
                        </p>
                      </div>
                      
                      <div className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-amber-600 font-bold text-sm">✓</span>
                        </div>
                        <p className="text-zinc-600 font-light text-sm leading-relaxed">
                          <strong className="text-zinc-900">Mini-ERP, Inventario y Analítica en Tiempo Real:</strong> Aloja tu vitrina 24/7 en la nube. Sube productos, controla existencias, lanza ofertas y mide exactamente cuánto estás vendiendo desde un solo panel.
                        </p>
                      </div>
                      
                      <div className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-amber-600 font-bold text-sm">✓</span>
                        </div>
                        <p className="text-zinc-600 font-light text-sm leading-relaxed">
                          <strong className="text-zinc-900">Despacho Automático con Red de Couriers:</strong> Al verificar el pago del cliente con un clic, nuestra plataforma alerta automáticamente a nuestra red de repartidores aliados con el GPS exacto del comprador.
                        </p>
                      </div>

                      <div className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-amber-600 font-bold text-sm">✓</span>
                        </div>
                        <p className="text-zinc-600 font-light text-sm leading-relaxed">
                          <strong className="text-zinc-900">Precios de Anaquel = Más Ventas:</strong> Al no pagar comisiones por cada carrito, mantienes tus precios reales sin inflarlos, fidelizando a tus clientes frente a la competencia.
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-zinc-100 rounded-2xl p-4 border border-zinc-200 shadow-sm relative z-10">
                      <p className="text-zinc-600 text-xs leading-relaxed text-justify">
                        * Tu plan incluye <strong className="text-amber-600 font-bold">500 pedidos mensuales con 0% de comisión</strong> (<strong className="text-amber-600 font-bold">ahorras más de $1,500 USD/mes</strong> frente a otras apps). Al superar las 500 órdenes, solo aplica una micro-tarifa fija de $0.10 por pedido adicional para garantizar tu infraestructura en la nube siempre rápida y en línea.
                      </p>
                    </div>
                    
                    <button 
                      onClick={() => setMerchantAuthMode('register')}
                      className="w-full bg-amber-500 text-black rounded-full py-4 mt-6 font-black text-sm tracking-[0.2em] uppercase transition-all shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:bg-amber-400 hover:shadow-[0_0_50px_rgba(245,158,11,0.5)] flex items-center justify-center gap-3 relative z-10"
                    >
                      ACTIVAR MI VITRINA <ArrowRight size={18} />
                    </button>

                    <p className="text-xs text-neutral-400 text-center mt-4 relative z-10">
                      🔒 Sin contratos forzosos · Dinero 100% directo a tu banco
                    </p>
                    
                    <div className="mt-4 text-center relative z-10">
                      <button onClick={() => setMerchantAuthMode('login')} className="text-xs text-zinc-500 hover:text-amber-600 font-medium transition-colors">
                        Ya tengo una tienda. <span className="text-amber-600 underline font-bold">Iniciar sesión</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {merchantAuthMode === 'recover' || merchantAuthMode === 'reset' ? (
                <form onSubmit={(e) => merchantAuthMode === 'recover' ? handleRecoverPassword(e, 'merchant') : handleResetPassword(e, 'merchant')} className="p-8 pt-4 space-y-5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Correo Electrónico Administrador</label>
                    <input type="email" required value={merchantForm.email} onChange={e => setMerchantForm({...merchantForm, email: e.target.value})} disabled={merchantAuthMode === 'reset'} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors font-medium placeholder-slate-400 shadow-sm" placeholder="admin@empresa.com" />
                  </div>
                  {merchantAuthMode === 'reset' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Código de Recuperación <span className="lowercase text-slate-400 font-normal">(Opcional si usaste un enlace mágico)</span></label>
                        <input type="text" value={recoveryCode} onChange={e => setRecoveryCode(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors font-medium placeholder-slate-400 shadow-sm font-mono tracking-wider" placeholder="Ej. 10669615" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Nueva Contraseña</label>
                        <div className="relative">
                          <input 
                            type={showNewPassword ? "text" : "password"} 
                            required 
                            value={newPassword} 
                            onChange={e => setNewPassword(e.target.value)} 
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 pr-12 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors font-medium placeholder-slate-400 shadow-sm" 
                            placeholder="••••••••" 
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowNewPassword(!showNewPassword)} 
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500 transition-colors p-1"
                            title={showNewPassword ? "Ocultar contraseña" : "Ver contraseña"}
                          >
                            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                  <button type="submit" disabled={merchantLoading || !merchantForm.email} className="w-full bg-amber-500 text-slate-950 rounded-full py-4 mt-4 font-bold text-xs tracking-[0.2em] uppercase transition-all shadow-lg shadow-amber-500/20 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3">
                    {merchantAuthMode === 'recover' ? 'Enviar Código' : 'Restablecer Contraseña'}
                  </button>
                  <div className="flex justify-center mt-4">
                    <button type="button" onClick={() => setMerchantAuthMode('login')} className="text-xs text-slate-500 hover:text-amber-600 transition-colors font-medium">
                      Volver al inicio de sesión
                    </button>
                  </div>
                </form>
              ) : merchantAuthMode !== 'pitch' ? (
                <form onSubmit={merchantAuthMode === 'register' ? (
                  merchantRegStep === 1 ? handleMerchantRegisterStep1 : 
                  merchantRegStep === 2 ? handleMerchantRegisterStep2 : 
                  merchantRegStep === 3 ? handleMerchantRegisterStep3 : 
                  merchantRegStep === 4 ? handleMerchantRegisterStep4 : 
                  merchantRegStep === 5 ? handleMerchantRegisterStep5 : 
                  handleMerchantVerify2FA
                ) : handleMerchantLogin} className="p-8 pt-4 space-y-5">
                  {merchantAuthMode === 'register' ? (
                    merchantRegStep === 7 ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center space-y-6 py-12">
                        <Loader2 className="animate-spin text-amber-500" size={64} />
                        <motion.h3 
                          key={loadingTextIndex}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-lg font-bold text-slate-900 text-center"
                        >
                          {loadingTexts[loadingTextIndex]}
                        </motion.h3>
                      </motion.div>
                    ) : (
                    <>
                      {merchantRegStep === 1 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Correo Electrónico</label>
                            <input type="email" required value={merchantForm.email} onChange={e => setMerchantForm({...merchantForm, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors font-medium placeholder-slate-400 shadow-sm" placeholder="admin@empresa.com" autoFocus />
                          </div>
                          
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Contraseña Administrativa</label>
                            <div className="relative">
                              <input type={showMerchantPassword ? "text" : "password"} required value={merchantForm.password} onChange={e => setMerchantForm({...merchantForm, password: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 pr-12 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors font-medium placeholder-slate-400 shadow-sm" placeholder="••••••••" />
                              <button type="button" onClick={() => setShowMerchantPassword(!showMerchantPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500 transition-colors">
                                {showMerchantPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </div>
                          </div>

                          <PasswordRequirements password={merchantForm.password} />

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Confirmar Contraseña</label>
                            <div className="relative">
                              <input type={showMerchantConfirmPassword ? "text" : "password"} required value={merchantConfirmPassword} onChange={e => setMerchantConfirmPassword(e.target.value)} className={`w-full bg-slate-50 border ${merchantConfirmPassword && merchantConfirmPassword !== merchantForm.password ? 'border-red-500' : 'border-slate-200'} rounded-2xl px-5 py-4 pr-12 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors font-medium placeholder-slate-400 shadow-sm`} placeholder="••••••••" />
                              <button type="button" onClick={() => setShowMerchantConfirmPassword(!showMerchantConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500 transition-colors">
                                {showMerchantConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </div>
                            {merchantConfirmPassword && merchantConfirmPassword !== merchantForm.password && (
                              <p className="text-red-500 text-xs mt-2">Las contraseñas no coinciden.</p>
                            )}
                          </div>

                          <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-slate-200"></div>
                            </div>
                            <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                              <span className="bg-white px-2 text-slate-400">o continúa con</span>
                            </div>
                          </div>

                          <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                            <input
                              type="checkbox"
                              id="merchant-terms-checkbox"
                              checked={merchantTermsAccepted}
                              onChange={e => setMerchantTermsAccepted(e.target.checked)}
                              className="mt-0.5 w-4 h-4 accent-amber-500 shrink-0 cursor-pointer"
                            />
                            <label htmlFor="merchant-terms-checkbox" className="text-xs text-slate-600 leading-relaxed cursor-pointer">
                              He leído y acepto los{' '}
                              <button type="button" onClick={() => { setIsMerchantModalOpen(false); navigate('/legal/terminos'); }} className="text-amber-600 hover:underline font-bold">Términos de Uso</button>
                              {' '}y los{' '}
                              <button type="button" onClick={() => { setIsMerchantModalOpen(false); navigate('/legal/comerciantes'); }} className="text-amber-600 hover:underline font-bold">Términos para Comerciantes</button>.
                            </label>
                          </div>
                            <GoogleLogin
                              onSuccess={handleGoogleMerchantSuccess}
                              onError={() => { console.log('Login Failed'); }}
                              theme="outline"
                              shape="pill"
                              size="large"
                              width="100%"
                            />
                        </motion.div>
                      )}
                      
                      {merchantRegStep === 2 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Nombre Completo del Contacto</label>
                            <input type="text" required value={merchantForm.ownerName} onChange={e => setMerchantForm({...merchantForm, ownerName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors font-medium placeholder-slate-400 shadow-sm" placeholder="Ej. Juan Pérez" autoFocus />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Teléfono de Contacto (11 dígitos)</label>
                            <input 
                              type="tel" 
                              required 
                              value={merchantForm.contactPhone} 
                              onChange={e => {
                                const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                                let formatted = digits;
                                if (digits.length > 4) {
                                  formatted = `${digits.slice(0, 4)}-${digits.slice(4)}`;
                                }
                                setMerchantForm({...merchantForm, contactPhone: formatted});
                              }} 
                              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors font-mono placeholder-slate-400 shadow-sm" 
                              placeholder="Ej. 0414-1234567" 
                            />
                            <div className="flex justify-between items-center text-[11px] px-1 mt-1">
                              <span className="text-slate-400">11 dígitos requeridos</span>
                              <span className={(merchantForm.contactPhone || '').replace(/\D/g, '').length >= 11 ? "text-emerald-600 font-bold" : "text-amber-600 font-medium"}>
                                {(merchantForm.contactPhone || '').replace(/\D/g, '').length}/11 {(merchantForm.contactPhone || '').replace(/\D/g, '').length >= 11 ? "✓ Completo" : ""}
                              </span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Correo de Contacto</label>
                            <input type="email" required value={merchantForm.contactEmail} onChange={e => setMerchantForm({...merchantForm, contactEmail: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors font-medium placeholder-slate-400 shadow-sm" placeholder="contacto@empresa.com" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Nombre del Negocio</label>
                            <input type="text" required value={merchantForm.businessName} onChange={e => setMerchantForm({...merchantForm, businessName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors font-medium placeholder-slate-400 shadow-sm" placeholder="Ej. Inversiones San José" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Categoría Principal</label>
                            <select required value={merchantForm.category} onChange={e => setMerchantForm({...merchantForm, category: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors font-medium appearance-none shadow-sm">
                              {categories.slice(1).map(cat => (
                                <option key={cat.id} value={cat.id} className="bg-white text-slate-900">{cat.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Descripción / Acerca de tu Negocio (Opcional)</label>
                            <textarea 
                              rows="3"
                              value={merchantForm.description} 
                              onChange={e => setMerchantForm({...merchantForm, description: e.target.value})} 
                              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors font-medium placeholder-slate-400 shadow-sm text-sm resize-none leading-relaxed min-h-[80px]" 
                              placeholder={`Ej. Especialistas en ${merchantForm.category || 'productos'}, ofrecemos la mejor calidad y atención directa a nuestros clientes.`} 
                            />
                          </div>

                          {/* IDENTIDAD VISUAL: LOGOTIPO Y PORTADA */}
                          <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
                            <div className="border-b border-slate-200/70 pb-3">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">Identidad Visual de tu Vitrina</h4>
                              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Sube el logotipo y la foto de portada para personalizar tu tienda pública</p>
                            </div>

                            <div className="space-y-3.5">
                              {/* 1. LOGOTIPO CUADRADO (1:1) */}
                              <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-xs flex items-center justify-between gap-3 transition-colors hover:border-slate-300">
                                <div className="flex items-center gap-3.5 min-w-0">
                                  <div 
                                    onClick={() => merchantLogoInputRef.current?.click()}
                                    className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center cursor-pointer overflow-hidden group/logo shrink-0 shadow-inner hover:border-amber-400 transition-all"
                                    title="Haz clic para subir o cambiar el logotipo"
                                  >
                                    {merchantForm.logoPreview ? (
                                      <>
                                        <img 
                                          src={merchantForm.logoPreview} 
                                          alt="Logotipo" 
                                          className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center text-white">
                                          <Camera size={16} />
                                        </div>
                                      </>
                                    ) : (
                                      <div className="flex flex-col items-center justify-center text-slate-400 group-hover/logo:text-amber-500 transition-colors">
                                        <Camera size={20} />
                                      </div>
                                    )}
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs sm:text-sm font-bold text-slate-900">Logotipo Cuadrado</span>
                                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60">
                                        1:1
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                                      Mínimo 400×400 px, óptimo 512×512 px (PNG, JPG o WebP)
                                    </p>
                                    {merchantForm.logoPreview ? (
                                      <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                                        <CheckCircle size={12} /> Logotipo cargado correctamente
                                      </p>
                                    ) : (
                                      <p className="text-[10px] text-slate-400 mt-1">
                                        Se mostrará en la cabecera y listados de tu tienda
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => merchantLogoInputRef.current?.click()}
                                    className="px-3.5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition-colors shadow-xs"
                                  >
                                    {merchantForm.logoPreview ? 'Cambiar' : 'Subir Logo'}
                                  </button>
                                  {merchantForm.logoPreview && (
                                    <button
                                      type="button"
                                      onClick={handleRemoveMerchantLogo}
                                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                                      title="Quitar logotipo"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  )}
                                </div>

                                <input 
                                  ref={merchantLogoInputRef}
                                  type="file" 
                                  accept="image/png, image/jpeg, image/webp" 
                                  className="hidden" 
                                  onChange={handleMerchantLogoChange}
                                />
                              </div>

                              {/* 2. FOTO DE PORTADA PANORÁMICA (16:9) */}
                              <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-xs space-y-2.5 transition-colors hover:border-slate-300">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs sm:text-sm font-bold text-slate-900">Foto de Portada</span>
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60">
                                      16:9
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-slate-500 font-medium">
                                    Óptimo 1920 × 600 px (Máx. 10 MB)
                                  </span>
                                </div>

                                {merchantForm.coverPreview ? (
                                  <div className="relative w-full h-28 sm:h-32 rounded-xl overflow-hidden border border-slate-200 group/cover">
                                    <img 
                                      src={merchantForm.coverPreview} 
                                      alt="Foto de Portada" 
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-xs">
                                      <button
                                        type="button"
                                        onClick={() => merchantCoverInputRef.current?.click()}
                                        className="px-3.5 py-1.5 bg-white text-slate-900 rounded-lg text-xs font-bold shadow hover:bg-slate-100 transition-colors flex items-center gap-1.5"
                                      >
                                        <Camera size={13} /> Cambiar Portada
                                      </button>
                                      <button
                                        type="button"
                                        onClick={handleRemoveMerchantCover}
                                        className="px-3.5 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold shadow hover:bg-rose-700 transition-colors flex items-center gap-1.5"
                                      >
                                        <Trash2 size={13} /> Quitar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div 
                                    onClick={() => merchantCoverInputRef.current?.click()}
                                    className="w-full py-5 px-4 border-2 border-dashed border-slate-200 hover:border-amber-400 rounded-xl bg-slate-50/50 hover:bg-amber-50/20 transition-all flex flex-col items-center justify-center cursor-pointer group/drop text-center"
                                  >
                                    <div className="w-9 h-9 rounded-full bg-slate-100 group-hover/drop:bg-amber-100 flex items-center justify-center text-slate-400 group-hover/drop:text-amber-600 mb-2 transition-colors">
                                      <UploadCloud size={18} />
                                    </div>
                                    <p className="text-xs font-bold text-slate-700 group-hover/drop:text-amber-600 transition-colors">
                                      Haz clic para subir la foto de portada
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                      Formato horizontal panorámico para computadoras y móviles (JPG, PNG o WebP)
                                    </p>
                                  </div>
                                )}

                                <input 
                                  ref={merchantCoverInputRef}
                                  type="file" 
                                  accept="image/png, image/jpeg, image/webp" 
                                  className="hidden" 
                                  onChange={handleMerchantCoverChange}
                                />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {merchantRegStep === 3 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div>
                              <p className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">Activar Restricción de Horario</p>
                              <p className="text-[10px] text-slate-500 mt-1">Bloquea el carrito cuando estés cerrado.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" className="sr-only peer" checked={merchantForm.scheduleActive} onChange={e => setMerchantForm({...merchantForm, scheduleActive: e.target.checked})} />
                              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                            </label>
                          </div>
                          
                          {merchantForm.scheduleActive && (
                            <div className="space-y-4 pt-2">
                              <div className="flex gap-4">
                                <div className="flex-1">
                                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Hora Apertura</label>
                                  <input type="time" required value={merchantForm.scheduleOpen} onChange={e => setMerchantForm({...merchantForm, scheduleOpen: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white" />
                                </div>
                                <div className="flex-1">
                                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Hora Cierre</label>
                                  <input type="time" required value={merchantForm.scheduleClose} onChange={e => setMerchantForm({...merchantForm, scheduleClose: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white" />
                                </div>
                              </div>
                              
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Margen de Cierre (Amarillo)</label>
                                <div className="flex items-center gap-3">
                                  <input type="number" min="0" max="120" required value={merchantForm.closeWarningMinutes} onChange={e => setMerchantForm({...merchantForm, closeWarningMinutes: Number(e.target.value)})} className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white" />
                                  <span className="text-[10px] text-slate-500">minutos antes del cierre se bloquearán las compras.</span>
                                </div>
                              </div>

                              <div className="p-4 rounded-xl border border-slate-200 flex flex-col gap-3 bg-slate-50">
                                <div>
                                  <p className="text-xs font-bold text-slate-900">Vista previa del semáforo actual:</p>
                                  <p className="text-[10px] text-slate-500 mt-0.5">Así ve el estado el cliente en este momento exacto.</p>
                                </div>
                                <div className="self-start px-3 py-1.5 rounded-full flex items-center gap-2 font-bold text-xs bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <div className="w-2 h-2 rounded-full animate-pulse bg-emerald-600"></div>
                                  Abierto (Cierra a las {merchantForm.scheduleClose})
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Días Laborables</label>
                                <div className="flex flex-wrap gap-2">
                                  {['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].map(dia => (
                                    <button 
                                      key={dia}
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        setMerchantForm(prev => ({ 
                                          ...prev, 
                                          workingDays: { ...prev.workingDays, [dia]: !prev.workingDays[dia] } 
                                        }));
                                      }}
                                      className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-colors uppercase tracking-wider ${
                                        merchantForm.workingDays[dia] 
                                        ? 'bg-amber-500/20 border-amber-500/60 text-amber-800' 
                                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                                      }`}
                                    >
                                      {dia}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}

                      {merchantRegStep === 4 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">RIF (Jurídico o Personal, Mínimo 6 dígitos)</label>
                            <div className="flex gap-2">
                              <select 
                                value={merchantForm.rifPrefix} 
                                onChange={e => setMerchantForm({...merchantForm, rifPrefix: e.target.value})} 
                                className="w-[80px] bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-slate-900 focus:outline-none focus:border-amber-500 font-bold appearance-none text-center shadow-sm"
                              >
                                <option value="V">V</option>
                                <option value="J">J</option>
                                <option value="E">E</option>
                                <option value="G">G</option>
                                <option value="P">P</option>
                              </select>
                              <input 
                                type="text" 
                                required 
                                value={merchantForm.rifNumber} 
                                onChange={e => setMerchantForm({...merchantForm, rifNumber: e.target.value.replace(/[^0-9-]/g, '').slice(0, 11)})} 
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors font-mono placeholder-slate-400 shadow-sm" 
                                placeholder="12345678 o 12345678-9" 
                              />
                            </div>
                            <div className="flex justify-between items-center text-[11px] px-1 mt-1">
                              <span className="text-slate-400">Mínimo 6 dígitos</span>
                              <span className={(merchantForm.rifNumber || '').replace(/\D/g, '').length >= 6 ? "text-emerald-600 font-bold" : "text-amber-600 font-medium"}>
                                {(merchantForm.rifNumber || '').replace(/\D/g, '').length}/6 {(merchantForm.rifNumber || '').replace(/\D/g, '').length >= 6 ? "✓ Completo" : ""}
                              </span>
                            </div>
                          </div>
                          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 shadow-sm">
                            <p className="text-xs text-amber-600 font-bold tracking-wider">DATOS PARA RECIBIR PAGO MÓVIL</p>
                            <div>
                              <input 
                                type="tel" 
                                required 
                                value={merchantForm.pagoMovilPhone} 
                                onChange={e => {
                                  const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                                  let formatted = digits;
                                  if (digits.length > 4) {
                                    formatted = `${digits.slice(0, 4)}-${digits.slice(4)}`;
                                  }
                                  setMerchantForm({...merchantForm, pagoMovilPhone: formatted});
                                }} 
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-amber-500 text-sm placeholder-slate-400 font-mono shadow-sm" 
                                placeholder="Teléfono Pago Móvil (Ej. 0414-1234567)" 
                              />
                              <div className="flex justify-between items-center text-[11px] px-1 mt-1">
                                <span className="text-slate-400">11 dígitos requeridos</span>
                                <span className={(merchantForm.pagoMovilPhone || '').replace(/\D/g, '').length >= 11 ? "text-emerald-600 font-bold" : "text-amber-600 font-medium"}>
                                  {(merchantForm.pagoMovilPhone || '').replace(/\D/g, '').length}/11 {(merchantForm.pagoMovilPhone || '').replace(/\D/g, '').length >= 11 ? "✓ Completo" : ""}
                                </span>
                              </div>
                            </div>
                            <select 
                              required 
                              value={merchantForm.pagoMovilBank} 
                              onChange={e => setMerchantForm({...merchantForm, pagoMovilBank: e.target.value})} 
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-amber-500 text-sm appearance-none shadow-sm"
                            >
                              <option value="" className="text-slate-900 bg-white">Selecciona tu Banco</option>
                              <option value="0156 - 100% Banco">0156 - 100% Banco</option>
                              <option value="0172 - Bancamiga">0172 - Bancamiga</option>
                              <option value="0171 - Banco Activo">0171 - Banco Activo</option>
                              <option value="0166 - Banco Agrícola">0166 - Banco Agrícola</option>
                              <option value="0175 - Banco Bicentenario">0175 - Banco Bicentenario</option>
                              <option value="0128 - Banco Caroní">0128 - Banco Caroní</option>
                              <option value="0164 - Banco de Desarrollo del Microempresario">0164 - Banco de Desarrollo del Microempresario</option>
                              <option value="0102 - Banco de Venezuela">0102 - Banco de Venezuela</option>
                              <option value="0114 - Bancaribe">0114 - Bancaribe</option>
                              <option value="0149 - Banco del Pueblo Soberano">0149 - Banco del Pueblo Soberano</option>
                              <option value="0163 - Banco del Tesoro">0163 - Banco del Tesoro</option>
                              <option value="0115 - Banco Exterior">0115 - Banco Exterior</option>
                              <option value="0003 - Banco Industrial de Venezuela">0003 - Banco Industrial de Venezuela</option>
                              <option value="0173 - Banco Internacional de Desarrollo">0173 - Banco Internacional de Desarrollo</option>
                              <option value="0105 - Banco Mercantil">0105 - Banco Mercantil</option>
                              <option value="0191 - Banco Nacional de Crédito (BNC)">0191 - Banco Nacional de Crédito (BNC)</option>
                              <option value="0116 - Banco Occidental de Descuento (BOD)">0116 - Banco Occidental de Descuento (BOD)</option>
                              <option value="0138 - Banco Plaza">0138 - Banco Plaza</option>
                              <option value="0108 - Banco Provincial">0108 - Banco Provincial</option>
                              <option value="0134 - Banesco">0134 - Banesco</option>
                              <option value="0177 - Banfanb">0177 - Banfanb</option>
                              <option value="0146 - Bangente">0146 - Bangente</option>
                              <option value="0174 - Banplus">0174 - Banplus</option>
                              <option value="0190 - Citibank">0190 - Citibank</option>
                              <option value="0121 - Corp Banca">0121 - Corp Banca</option>
                              <option value="0151 - Fondo Común">0151 - Fondo Común</option>
                              <option value="0169 - Mi Banco">0169 - Mi Banco</option>
                              <option value="0137 - Sofitasa">0137 - Sofitasa</option>
                            </select>
                            <div>
                              <input 
                                type="text" 
                                required 
                                value={merchantForm.pagoMovilId} 
                                onChange={e => setMerchantForm({...merchantForm, pagoMovilId: e.target.value.toUpperCase().replace(/[^0-9VEJG-]/g, '').slice(0, 12)})} 
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-amber-500 text-sm placeholder-slate-400 font-mono shadow-sm" 
                                placeholder="Cédula / RIF asociado (Mínimo 6 dígitos)" 
                              />
                              <div className="flex justify-between items-center text-[11px] px-1 mt-1">
                                <span className="text-slate-400">Mínimo 6 dígitos</span>
                                <span className={(merchantForm.pagoMovilId || '').replace(/\D/g, '').length >= 6 ? "text-emerald-600 font-bold" : "text-amber-600 font-medium"}>
                                  {(merchantForm.pagoMovilId || '').replace(/\D/g, '').length}/6 {(merchantForm.pagoMovilId || '').replace(/\D/g, '').length >= 6 ? "✓ Completo" : ""}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {merchantRegStep === 5 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                          <div className="bg-slate-50 p-5 rounded-2xl text-center space-y-3 mb-2 border border-slate-200">
                            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto border border-amber-200 text-amber-500">
                              <MapPin size={22} />
                            </div>
                            <h3 className="text-slate-900 font-bold text-base tracking-tight">Ubicación y Dirección de tu Negocio</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Permite que tus clientes te ubiquen en el mapa interactivo y visiten tu tienda física.
                            </p>
                            
                            <button 
                              type="button" 
                              onClick={handleDetectGPS} 
                              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md shadow-amber-500/10 text-xs uppercase tracking-wider"
                            >
                              <MapPin size={16} /> {merchantForm.gpsCoords ? 'Actualizar Coordenadas GPS' : 'Detectar mi ubicación por GPS'}
                            </button>

                            {merchantForm.gpsCoords ? (
                              <div className="bg-emerald-50 text-emerald-700 py-2.5 px-3 rounded-xl border border-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5">
                                <CheckCircle size={15} className="text-emerald-600 shrink-0" />
                                <span>Punto GPS Fijado ({merchantForm.gpsCoords.lat.toFixed(4)}, {merchantForm.gpsCoords.lng.toFixed(4)})</span>
                              </div>
                            ) : (
                              <p className="text-[11px] text-slate-400 italic">Puedes fijar el GPS ahora o escribir tu dirección física abajo.</p>
                            )}
                          </div>

                          <div className="space-y-2 pt-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                              Dirección Escrita / Punto de Referencia {merchantForm.gpsCoords ? '(Opcional)' : '(Obligatoria sin GPS)'}
                            </label>
                            <div className="flex gap-2">
                              <input 
                                required={!merchantForm.gpsCoords} 
                                type="text" 
                                value={merchantForm.addressState} 
                                onChange={e => setMerchantForm({...merchantForm, addressState: e.target.value})} 
                                className="w-1/2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-amber-500 text-xs placeholder-slate-400 shadow-sm" 
                                placeholder="Estado (Ej. Aragua)" 
                              />
                              <input 
                                required={!merchantForm.gpsCoords} 
                                type="text" 
                                value={merchantForm.addressCity} 
                                onChange={e => setMerchantForm({...merchantForm, addressCity: e.target.value})} 
                                className="w-1/2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-amber-500 text-xs placeholder-slate-400 shadow-sm" 
                                placeholder="Ciudad (Ej. Cagua)" 
                              />
                            </div>
                            <textarea 
                              required={!merchantForm.gpsCoords} 
                              value={merchantForm.addressLine} 
                              onChange={e => setMerchantForm({...merchantForm, addressLine: e.target.value})} 
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:border-amber-500 text-xs min-h-[70px] placeholder-slate-400 shadow-sm resize-none" 
                              placeholder="Calle, Centro Comercial, Local o Punto de referencia..."
                            />
                          </div>
                        </motion.div>
                      )}

                      {merchantRegStep === 6 && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center space-y-4">
                          <p className="text-center text-sm text-slate-500">Escanea este código QR en tu app de Google Authenticator para asegurar tu cuenta de comercio.</p>
                          <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200">
                            <QRCodeSVG value={merchantMfaUrl} size={180} />
                          </div>
                          <p className="text-xs text-slate-500">Clave manual: <span className="font-mono text-amber-600 font-bold">{merchantMfaSecret}</span></p>
                          
                          <div className="w-full mt-4">
                            <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest text-center">Código de 6 dígitos</label>
                            <input type="text" required maxLength={6} value={merchantMfaCode} onChange={e => setMerchantMfaCode(e.target.value.replace(/\D/g, ''))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 focus:outline-none focus:border-amber-500 transition-colors font-mono text-center tracking-[0.5em] text-lg shadow-sm" placeholder="123456" autoFocus />
                          </div>
                        </motion.div>
                      )}

                      <div className="flex gap-3 items-center mt-6">
                        {merchantRegStep > 1 && (
                          <button 
                            type="button" 
                            onClick={() => setMerchantRegStep(prev => prev - 1)}
                            className="py-4 px-6 text-slate-500 hover:text-slate-800 text-xs font-bold tracking-widest uppercase transition-colors"
                          >
                            Atrás
                          </button>
                        )}
                        <button 
                          type="submit" 
                          disabled={
                            merchantLoading || 
                            (merchantRegStep === 1 && (!merchantForm.email || !merchantForm.password || !merchantTermsAccepted)) || 
                            (merchantRegStep === 2 && (!merchantForm.businessName || !merchantForm.ownerName || !merchantForm.contactEmail || !merchantForm.category || (merchantForm.contactPhone || '').replace(/\D/g, '').length < 11)) || 
                            (merchantRegStep === 3 && merchantForm.scheduleActive && (!merchantForm.scheduleOpen || !merchantForm.scheduleClose)) || 
                            (merchantRegStep === 4 && (!merchantForm.pagoMovilBank || (merchantForm.rifNumber || '').replace(/\D/g, '').length < 6 || (merchantForm.pagoMovilPhone || '').replace(/\D/g, '').length < 11 || (merchantForm.pagoMovilId || '').replace(/\D/g, '').length < 6)) ||
                            (merchantRegStep === 5 && !merchantForm.gpsCoords && (!merchantForm.addressState || !merchantForm.addressCity || !merchantForm.addressLine)) ||
                            (merchantRegStep === 6 && merchantMfaCode.length < 6)
                          }
                          className="flex-1 bg-amber-500 text-slate-950 rounded-full py-4 font-bold text-xs tracking-[0.2em] uppercase transition-all shadow-lg shadow-amber-500/20 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                          {merchantLoading ? (
                            <><Loader2 className="animate-spin" size={18} /> Procesando...</>
                          ) : (
                            <>{merchantRegStep < 6 ? 'Continuar' : 'Verificar y Acceder'} <ArrowRight size={16} /></>
                          )}
                        </button>
                      </div>
                    </>
                    )
                  ) : (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Correo Electrónico</label>
                        <input type="email" required value={merchantForm.email} onChange={e => setMerchantForm({...merchantForm, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors font-medium placeholder-slate-400 shadow-sm" placeholder="admin@empresa.com" />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Contraseña Administrativa</label>
                        <div className="relative">
                          <input type={showMerchantPassword ? "text" : "password"} required value={merchantForm.password} onChange={e => setMerchantForm({...merchantForm, password: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 pr-12 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors font-medium placeholder-slate-400 shadow-sm" placeholder="••••••••" />
                          <button type="button" onClick={() => setShowMerchantPassword(!showMerchantPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500 transition-colors">
                            {showMerchantPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-end mt-2">
                        <button type="button" onClick={() => setMerchantAuthMode('recover')} className="text-[10px] text-amber-600 hover:text-amber-700 font-bold uppercase tracking-wider transition-colors">
                          ¿Olvidaste tu contraseña?
                        </button>
                      </div>

                      <button 
                        type="submit" 
                        disabled={merchantLoading || !merchantForm.email}
                        className="w-full bg-amber-500 text-slate-950 rounded-full py-4 mt-4 font-bold text-xs tracking-[0.2em] uppercase transition-all shadow-lg shadow-amber-500/20 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                      >
                        {merchantLoading ? (
                          <><Loader2 className="animate-spin" size={18} /> Procesando...</>
                        ) : (
                          <>Acceder al ERP <ArrowRight size={16} /></>
                        )}
                      </button>

                      <div className="relative py-2 mt-4">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                          <span className="bg-white px-2 text-slate-400">o continúa con</span>
                        </div>
                      </div>

                      <GoogleLogin
                        onSuccess={handleGoogleMerchantSuccess}
                        onError={() => { alert('Fallo al conectar con Google'); }}
                        theme="outline"
                        shape="pill"
                        size="large"
                        width="100%"
                      />
                    </>
                  )}
                </form>
              ) : null}
            </div>
          </div>
        )}

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
          if (pendingStoreSlug) {
            navigate(`/${pendingStoreSlug}`);
            setPendingStoreSlug(null);
          }
        }} 
      />
      <CustomerAnalyticsModal 
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        currentCustomer={currentCustomer}
      />
    </div>
    
      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="fixed inset-y-0 left-0 w-[85%] max-w-sm bg-zinc-50 shadow-2xl z-[201] flex flex-col overflow-y-auto"
            >
              <div className="p-5 flex items-center justify-between border-b border-zinc-200 bg-white">
                <div className="flex items-center gap-2 select-none">
                  <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-zinc-900 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                    <ShoppingBag size={16} className="stroke-[2.5]"/>
                  </div>
                  <span className="font-black text-lg tracking-[0.2em] text-zinc-900">AXON<span className="text-amber-600 font-bold">MARKET</span></span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-zinc-400 hover:text-amber-500 transition-colors p-2 -mr-2">
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex-1 py-4 px-4 flex flex-col gap-6">
                {currentCustomer && (
                  <div 
                    onClick={() => { setIsMobileMenuOpen(false); navigate('/profile'); }}
                    className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200/80 rounded-2xl cursor-pointer hover:bg-amber-100/50 transition-colors"
                  >
                    {currentCustomer.profile_pic ? (
                      <img src={resolveImageUrl(currentCustomer.profile_pic)} alt="Perfil" className="w-10 h-10 rounded-full object-cover border-2 border-amber-500" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center border-2 border-amber-300">
                        {(currentCustomer.name || currentCustomer.email || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{currentCustomer.name || 'Mi Perfil'}</p>
                      <p className="text-xs text-amber-700 truncate">@{currentCustomer.email?.split('@')[0] || 'cliente'}</p>
                    </div>
                    <ChevronRight size={16} className="text-amber-600 shrink-0" />
                  </div>
                )}
                
                <div className="space-y-1">
                  <h3 className="text-[10px] font-black tracking-[0.2em] text-zinc-400 uppercase mb-3 ml-2">Legal y Políticas</h3>
                  
                  <button onClick={() => { setIsMobileMenuOpen(false); navigate('/legal/terminos'); }} className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white text-zinc-700 hover:text-amber-600 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 group-hover:bg-amber-100 flex items-center justify-center text-zinc-500 group-hover:text-amber-600 transition-colors">
                        <FileText size={16} />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="font-bold text-sm">Términos de Uso</span>
                        <span className="text-[10px] text-zinc-400 group-hover:text-amber-500/70 font-medium">Condiciones del servicio</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-zinc-300 group-hover:text-amber-400" />
                  </button>

                  <button onClick={() => { setIsMobileMenuOpen(false); navigate('/'); }} className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white text-zinc-700 hover:text-amber-600 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 group-hover:bg-amber-500/20 flex items-center justify-center text-amber-600 transition-colors">
                        <Home size={16} />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="font-bold text-sm">Página Principal</span>
                        <span className="text-[10px] text-zinc-400 group-hover:text-amber-500/70 font-medium">Bienvenida y servicios</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-zinc-300 group-hover:text-amber-400" />
                  </button>

                  <button onClick={() => { setIsMobileMenuOpen(false); navigate('/legal/privacidad'); }} className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white text-zinc-700 hover:text-amber-600 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 group-hover:bg-amber-100 flex items-center justify-center text-zinc-500 group-hover:text-amber-600 transition-colors">
                        <Shield size={16} />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="font-bold text-sm">Política de Privacidad</span>
                        <span className="text-[10px] text-zinc-400 group-hover:text-amber-500/70 font-medium">Uso de tus datos</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-zinc-300 group-hover:text-amber-400" />
                  </button>

                  <button onClick={() => { setIsMobileMenuOpen(false); navigate('/legal/cookies'); }} className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white text-zinc-700 hover:text-amber-600 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 group-hover:bg-amber-100 flex items-center justify-center text-zinc-500 group-hover:text-amber-600 transition-colors">
                        <Cookie size={16} />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="font-bold text-sm">Política de Cookies</span>
                        <span className="text-[10px] text-zinc-400 group-hover:text-amber-500/70 font-medium">Rastreo y navegación</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-zinc-300 group-hover:text-amber-400" />
                  </button>

                  <button onClick={() => { setIsMobileMenuOpen(false); navigate('/legal/comerciantes'); }} className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white text-zinc-700 hover:text-amber-600 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 group-hover:bg-amber-100 flex items-center justify-center text-zinc-500 group-hover:text-amber-600 transition-colors">
                        <FileBadge2 size={16} />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="font-bold text-sm">Términos Comerciales</span>
                        <span className="text-[10px] text-zinc-400 group-hover:text-amber-500/70 font-medium">Para dueños de tiendas</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-zinc-300 group-hover:text-amber-400" />
                  </button>

                  <button onClick={() => { setIsMobileMenuOpen(false); navigate('/legal/aviso'); }} className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white text-zinc-700 hover:text-amber-600 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 group-hover:bg-amber-100 flex items-center justify-center text-zinc-500 group-hover:text-amber-600 transition-colors">
                        <Scale size={16} />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="font-bold text-sm">Aviso Legal</span>
                        <span className="text-[10px] text-zinc-400 group-hover:text-amber-500/70 font-medium">Información corporativa</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-zinc-300 group-hover:text-amber-400" />
                  </button>

                </div>
              </div>
              <div className="p-5 border-t border-zinc-200 bg-white">
                <p className="text-[10px] text-zinc-400 text-center font-medium">
                  © 2026 AxonMarket. Todos los derechos reservados.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      {/* Comments Drawer (Instagram Style) */}
      <PostCommentsDrawer
        isOpen={Boolean(activeCommentsPost)}
        onClose={() => setActiveCommentsPost(null)}
        postId={activeCommentsPost?.postId}
        postTitle={activeCommentsPost?.postTitle}
        workspaceId={activeCommentsPost?.workspaceId}
        currentCustomer={currentCustomer}
        onRequireAuth={() => setIsAuthModalOpen(true)}
      />

    </GoogleOAuthProvider>
  );
}
