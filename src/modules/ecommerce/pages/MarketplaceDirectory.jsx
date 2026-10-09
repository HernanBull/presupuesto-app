import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Search, Star, ArrowRight, TrendingUp, ShoppingCart, Store, ChevronRight, User, X, Package, Heart, Loader2, Zap, Lock, Utensils, ShoppingBasket, Apple, ShieldAlert, Shirt, Car, Settings, Wrench, Smartphone, Home, Sparkles, Coffee, Eye, EyeOff, MapPin, MessageSquare, CheckCircle, ShieldCheck, Menu, Bell, MoreHorizontal, MessageCircle, Send, Bookmark } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import * as OTPAuth from 'otpauth';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import ProfileWizardModal from '../components/ProfileWizardModal';
import CustomerAnalyticsModal from '../components/CustomerAnalyticsModal';
import PwaInstallBanner from '../components/PwaInstallBanner';
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

export default function MarketplaceDirectory() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [bannerSlide, setBannerSlide] = useState(0);
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
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [showAuthConfirmPassword, setShowAuthConfirmPassword] = useState(false);

  // Merchant Auth State
  const [isMerchantModalOpen, setIsMerchantModalOpen] = useState(false);
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
    let interval;
    if (isCategoriesOpen && !currentCustomer && !currentMerchant) {
      interval = setInterval(() => {
        setBannerSlide(prev => (prev + 1) % 2);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isCategoriesOpen, currentCustomer, currentMerchant]);

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

      const user = { ...newCustomer, docId: newCustomer.doc_id, orders: [] };
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
      const authData = await loginUser(authForm.email, authForm.password);
      
      const { data: customerData, error } = await supabase
        .from('ecommerce_customers')
        .select('*')
        .eq('id', authData.user.id)
        .single();
        
      if (error && error.code !== 'PGRST116') throw error;

      const user = customerData ? { ...customerData, docId: customerData.doc_id, orders: [] } : { id: authData.user.id, email: authData.user.email, name: authData.user.user_metadata?.name || 'Usuario', orders: [] };
      
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
      const { email, name } = payload;
      
      if (!email) {
        alert('No se pudo obtener el email de Google');
        return;
      }
      
      let { data: user } = await supabase.from('ecommerce_customers').select('*').eq('email', email).maybeSingle();
      
      if (authMode === 'login') {
        if (!user) {
          alert('No tienes una cuenta registrada con este correo. Por favor, regístrate primero.');
          setAuthMode('register');
          return;
        }
      } else if (authMode === 'register') {
        if (user) {
          alert('Este correo ya está registrado. Por favor, inicia sesión.');
          setAuthMode('login');
          return;
        }
        const id = 'CUS-' + Math.floor(Math.random() * 1000000);
        const newUser = {
          id,
          email,
          password: 'GOOGLE_AUTH',
          name: name || email.split('@')[0],
          phone: '',
          doc_id: '',
          address: '',
          wishlist: [],
          join_date: new Date().toISOString()
        };
        const { error } = await supabase.from('ecommerce_customers').insert([newUser]);
        if (error) throw error;
        user = newUser;

        // Send Welcome Email
        supabase.functions.invoke('send-welcome-email', {
          body: { email: newUser.email, name: newUser.name }
        }).catch(e => console.error('Error sending welcome email:', e));
      }
      
      const mappedUser = { ...user, docId: user.doc_id, orders: [] };
      localStorage.setItem('ecommerce_current_customer', JSON.stringify(mappedUser));
      localStorage.removeItem('activeWorkspace');
      setCurrentCustomer(mappedUser);
      setIsAuthModalOpen(false);
      
      if (authMode === 'register') {
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
        // Verificar si la tienda ya existe
        const { data: wsData } = await supabase
          .from('workspaces')
          .select('*')
          .eq('config->>adminEmail', payload.email)
          .maybeSingle();

        if (merchantAuthMode === 'login') {
          if (wsData) {
            localStorage.setItem('activeWorkspace', wsData.id);
            localStorage.setItem('storeSlug', wsData.store_slug || '');
            setTimeout(() => {
              navigate('/dashboard');
            }, 500);
          } else {
            alert('No se encontró una tienda asociada a este correo de Google. Por favor, crea tu tienda primero.');
            setMerchantAuthMode('register');
          }
        } else if (merchantAuthMode === 'register') {
          if (wsData) {
            alert('Ya existe una tienda con este correo de Google. Por favor, inicia sesión.');
            setMerchantAuthMode('login');
          } else {
            const randomPassword = Math.random().toString(36).slice(-10) + "Aa1!";
            setMerchantForm({ ...merchantForm, email: payload.email, password: randomPassword });
            setMerchantRegStep(2);
          }
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
    if (merchantForm.businessName && merchantForm.ownerName && merchantForm.contactPhone && merchantForm.contactEmail) {
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
      
      const initialConfig = {
        adminEmail: merchantForm.email,
        business_type: merchantForm.category,
        categories: [merchantForm.category],
        paymentProfile: {
          pmBank: merchantForm.pagoMovilBank,
          pmPhone: merchantForm.pagoMovilPhone,
          pmId: merchantForm.pagoMovilId || `${merchantForm.rifPrefix}-${merchantForm.rifNumber}`
        },
        expediente: {
          ownerName: merchantForm.ownerName || '',
          legalType: merchantForm.rifPrefix || 'V',
          rif: merchantForm.rifNumber ? `${merchantForm.rifPrefix}-${merchantForm.rifNumber}` : 'V-00000000-0',
          state: merchantForm.addressState || 'Por definir',
          city: merchantForm.addressCity || 'Por definir',
          address: merchantForm.addressLine || '',
          gps: merchantForm.gpsCoords,
          whatsapp: merchantForm.contactPhone || merchantForm.pagoMovilPhone || '',
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

      setTempWorkspace({ id: newWorkspace.id, slug: generatedSlug });
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

      const configPayload = {
        adminEmail: merchantForm.email,
        generatedPassword: merchantForm.password,
        business_type: merchantForm.category,
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
        .update({ config: configPayload })
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
      
      alert('Se ha enviado un código de 6 dígitos a tu correo electrónico para restablecer tu contraseña.');
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
    
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        if (!recoveryCode) return alert('Por favor ingresa el código de 6 dígitos que enviamos a tu correo.');
        
        // Paso 1: Verificar el código OTP
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email,
          token: recoveryCode,
          type: 'recovery'
        });
        if (verifyError) throw verifyError;
      }

      // Paso 2: Actualizar la contraseña ahora que estamos autenticados por la recuperación
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      
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

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <div className="min-h-screen bg-black text-slate-50 font-sans selection:bg-amber-500/30 relative overflow-x-hidden">
      {/* PWA Install Banner */}
      <PwaInstallBanner />
      
      {/* Background ambient light */}
      <div className="hidden md:block fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-amber-500/5 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-500/5 blur-[120px] rounded-full -translate-x-1/4 translate-y-1/3"></div>
      </div>

      {/* App Header (Mobile Only) - Instagram Style */}
      <div className="md:hidden sticky top-0 z-50 bg-zinc-950 border-b border-white/5 pt-4 pb-3 px-5 flex items-center justify-between">
        <button className="text-white hover:text-amber-500 transition-colors">
          <Menu size={26} strokeWidth={2} />
        </button>
        <div className="flex items-center gap-2 select-none cursor-default">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            <ShoppingBag size={16} className="stroke-[2.5]"/>
          </div>
          <span className="font-bold text-lg tracking-[0.2em] text-white">AXON<span className="text-amber-500 font-light">MARKET</span></span>
        </div>
        <button className="text-white hover:text-amber-500 transition-colors relative">
          <Bell size={26} strokeWidth={2} />
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-[2px] border-zinc-950"></span>
        </button>
      </div>

      {/* App Search Bar (Mobile Only) */}
      <div className="px-5 py-4 relative z-40 bg-zinc-950 md:hidden border-b border-white/5 shadow-md">
        <div className="relative w-full group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={18} className="text-zinc-500" />
          </div>
          <input
            id="mobile-search-input"
            type="text"
            placeholder="¿Qué quieres pedir hoy?"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-white text-sm font-light focus:outline-none focus:border-amber-500/50 shadow-inner"
          />
        </div>
      </div>

      {/* Navbar (Desktop Only) */}
      <nav className="hidden md:flex sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-2xl border-b border-white/5 shadow-2xl">
        <div className="max-w-[1400px] mx-auto px-6 h-20 w-full flex items-center justify-between">
          <div className="flex items-center gap-3 group">
            <div 
              className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(245,158,11,0.3)] group-hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all cursor-pointer"
            >
              <ShoppingBag size={20} className="stroke-[2.5]" />
            </div>
            <span onClick={() => navigate('/')} className="font-bold text-xl tracking-[0.2em] text-white cursor-pointer">AXON<span className="text-amber-500 font-light">MARKET</span></span>
          </div>
          
          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <div className="relative w-full group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search size={18} className="text-zinc-500 group-focus-within:text-amber-500 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Busca tiendas, marcas o productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-full py-3 pl-12 pr-6 text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 focus:bg-zinc-800 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
             {currentMerchant ? (
               <>
                 <button onClick={() => navigate('/dashboard')} className="hidden sm:flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full hover:bg-emerald-500/20 transition-colors">
                   <Store size={16}/> <span>{currentMerchant.name} (Admin)</span>
                 </button>
                 <div className="h-6 w-[1px] bg-white/10 hidden sm:block"></div>
               </>
             ) : !currentCustomer && (
               <>
                 <button onClick={() => { setMerchantAuthMode('pitch'); setIsMerchantModalOpen(true); }} className="hidden sm:flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-zinc-400 hover:text-amber-500 transition-colors">
                   <Store size={16} /> Vender
                 </button>
                 <div className="h-6 w-[1px] bg-white/10 hidden sm:block"></div>
               </>
             )}
             
             {currentCustomer ? (
               <button onClick={() => navigate('/profile')} className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-amber-500 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-full hover:bg-amber-500/20 transition-colors">
                 <User size={16}/> <span>{currentCustomer.name}</span>
               </button>
             ) : !currentMerchant && (
               <button onClick={() => { setAuthMode('login'); setIsAuthModalOpen(true); }} className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-zinc-400 hover:text-white transition-colors">
                 <User size={16} /> <span>Entrar</span>
               </button>
             )}

             {currentCustomer && (
               <button onClick={() => setIsCartOpen(true)} className="relative p-2 text-zinc-400 hover:text-amber-500 transition-all group">
                 <div className="absolute inset-0 bg-amber-500/20 rounded-full scale-0 group-hover:scale-100 transition-transform blur-md"></div>
                 <ShoppingCart size={24} className="relative z-10" />
                 {totalCartItems > 0 && (
                   <span className="absolute top-0 right-0 w-5 h-5 bg-amber-500 text-black text-[10px] font-black flex items-center justify-center rounded-full border-2 border-zinc-950 shadow-[0_0_10px_rgba(245,158,11,0.5)] z-20">
                     {totalCartItems}
                   </span>
                 )}
               </button>
             )}
          </div>
        </div>
      </nav>

      {/* Main Content App-Style */}
      <div className="max-w-[1400px] mx-auto px-5 md:px-6 pb-28 md:pb-12 pt-6 md:pt-12 relative z-10 space-y-8">
        
        {/* Categorías Principales (Desktop Only) */}
        <section className="hidden md:block space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-white font-bold text-lg md:text-xl">Categorías</h3>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex overflow-x-auto scrollbar-hide gap-4 pb-1">
              {categories.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <div key={cat.id} onClick={() => setActiveCategory(cat.id)} className="flex flex-col items-center gap-2 cursor-pointer group snap-start w-[80px] shrink-0">
                    <div className={`w-[80px] h-[80px] rounded-[1.5rem] flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)] scale-105' : 'bg-zinc-900 border border-white/5 group-hover:bg-zinc-800 shadow-md group-hover:scale-105'}`}>
                      <cat.icon size={28} strokeWidth={isActive ? 2.5 : 1.5} className={isActive ? 'text-black' : 'text-zinc-400 group-hover:text-amber-500'} />
                    </div>
                    <span className={`text-xs text-center font-bold leading-tight line-clamp-1 w-full px-1 ${isActive ? 'text-amber-500' : 'text-zinc-400'}`}>{cat.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Todas las tiendas Grid / Feed */}
        <div className="pt-2 md:pt-8 md:border-t md:border-white/5 mt-2 md:mt-0 pb-10">
          <div className="hidden md:flex items-center justify-between mb-6">
            <h3 className="text-white font-bold text-xl">Directorio Completo</h3>
          </div>
          
          {/* Mobile Feed (Instagram Style) */}
          <div className="md:hidden flex flex-col space-y-6 -mx-5">
            {filteredStores.map((store) => (
              <div key={store.id} className="bg-zinc-950 flex flex-col pb-4 border-b border-white/5 last:border-b-0">
                {/* Post Header */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/${store.store_slug}`)}>
                    <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center overflow-hidden border border-white/10 p-0.5">
                      {store.config?.logoUrl || store.config?.storefront?.logoUrl ? (
                        <img src={resolveImageUrl(store.config.logoUrl || store.config.storefront.logoUrl)} className="w-full h-full rounded-full object-cover bg-zinc-900" />
                      ) : (
                        <Store size={20} className="text-black" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-white font-bold text-sm tracking-wide leading-tight flex items-center gap-1">
                        {store.name}
                        {store.config?.is_verified && <CheckCircle size={12} className="text-blue-500 fill-blue-500/20" />}
                      </span>
                      <span className="text-zinc-400 text-[11px] flex items-center gap-1 mt-0.5">
                        <MapPin size={10} /> A 2.5 Km de ti
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="bg-zinc-100 text-black text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-white active:scale-95 transition-all">
                      <User size={12} /> Seguir
                    </button>
                    <button className="text-white hover:text-zinc-400">
                      <MoreHorizontal size={20} />
                    </button>
                  </div>
                </div>

                {/* Post Image */}
                <div className="w-full aspect-[4/5] bg-zinc-900 cursor-pointer relative" onClick={() => navigate(`/${store.store_slug}`)}>
                  {store.config?.coverUrl || store.config?.storefront?.heroUrl ? (
                    <img loading="lazy" src={resolveImageUrl(store.config.coverUrl || store.config.storefront.heroUrl)} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-zinc-600 bg-zinc-950">
                      <Store size={64} />
                      <span className="font-medium text-sm">Visitar Tienda</span>
                    </div>
                  )}
                  {/* Pager dots mock */}
                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full text-[10px] text-white font-medium tracking-widest">1/3</div>
                </div>

                {/* Post Actions */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-4 text-white">
                    <button onClick={(e) => toggleFavorite(e, store)} className="hover:text-zinc-300 transition-colors">
                      <Heart size={26} strokeWidth={isFavorite(store.store_slug) ? 0 : 2} fill={isFavorite(store.store_slug) ? '#ef4444' : 'none'} className={isFavorite(store.store_slug) ? 'text-red-500' : ''} />
                    </button>
                    <button className="hover:text-zinc-300 transition-colors" onClick={() => navigate(`/${store.store_slug}`)}>
                      <MessageCircle size={26} strokeWidth={2} />
                    </button>
                    <button className="hover:text-zinc-300 transition-colors -mt-1">
                      <Send size={26} strokeWidth={2} />
                    </button>
                  </div>
                  <button className="text-white hover:text-zinc-300 transition-colors">
                    <Bookmark size={26} strokeWidth={2} />
                  </button>
                </div>

                {/* Post Content */}
                <div className="px-4 flex flex-col gap-1.5" onClick={() => navigate(`/${store.store_slug}`)}>
                  <span className="text-white text-sm font-bold">{Math.floor(Math.random() * 500) + 50} Me gusta</span>
                  <div className="text-white text-sm">
                    <span className="font-bold mr-2">{store.name}</span>
                    <span className="text-zinc-200 line-clamp-2 inline">{store.config?.description || '¡Descubre nuestros mejores productos! Visita nuestra tienda para ver el catálogo completo. 👀✨'}</span>
                  </div>
                  <span className="text-zinc-500 text-xs font-medium mt-1 cursor-pointer">Ver los {Math.floor(Math.random() * 20) + 2} comentarios</span>
                  <span className="text-zinc-600 text-[10px] uppercase tracking-wider mt-0.5">Hace {Math.floor(Math.random() * 12) + 1} horas</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Grid (Hidden on Mobile) */}
          <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {/* Same filtered stores rendered as grid for desktop */}
            {filteredStores.map((store) => (
              <div key={store.id} onClick={() => navigate(`/${store.store_slug}`)} className="bg-zinc-900 rounded-[1.5rem] overflow-hidden border border-white/5 hover:border-amber-500/30 transition-all cursor-pointer group shadow-lg">
                  {/* Reuse horizontal card design for grid */}
                  <div className="h-40 w-full relative bg-zinc-950 overflow-hidden">
                    {store.config?.coverUrl || store.config?.storefront?.heroUrl ? (
                      <img loading="lazy" src={resolveImageUrl(store.config.coverUrl || store.config.storefront.heroUrl)} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center">
                        <Store size={40} className="text-zinc-700" />
                      </div>
                    )}
                    {currentCustomer && (
                      <div className="absolute top-3 right-3">
                        <button onClick={(e) => toggleFavorite(e, store)} className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-black/70">
                          <Heart size={14} fill={isFavorite(store.store_slug) ? 'currentColor' : 'none'} className={isFavorite(store.store_slug) ? 'text-red-500' : ''}/>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="p-5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-white font-bold text-lg line-clamp-1 group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                        {store.name}
                        {store.config?.is_verified && (
                          <div title="Comercio Verificado" className="inline-flex">
                            <ShieldCheck size={16} className="text-blue-500 fill-blue-500/20" />
                          </div>
                        )}
                      </h4>
                    </div>
                    <p className="text-zinc-400 text-sm line-clamp-2">{store.config?.description || 'Tienda en Axon Market'}</p>
                    <div className="flex items-center justify-end pt-4 mt-2 border-t border-white/5">
                      <span className="text-xs text-zinc-500 font-bold uppercase flex items-center gap-1 group-hover:text-amber-500 transition-colors">Visitar <ArrowRight size={12}/></span>
                    </div>
                  </div>
              </div>
            ))}
          </div>
        </div>

      </div>
      
      {/* Footer (Desktop Only) */}
      <footer className="hidden md:block bg-zinc-950 border-t border-white/5 mt-20 relative z-10">
        <div className="max-w-[1400px] mx-auto px-8 py-14">
          <div className="grid grid-cols-4 gap-10 mb-10">
            {/* Brand */}
            <div className="col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center text-black shadow-lg shadow-amber-900/30">
                  <ShoppingBag size={18} className="stroke-[2.5]"/>
                </div>
                <span className="font-bold text-lg tracking-[0.25em] text-white">AXON<span className="text-amber-500 font-light">MARKET</span></span>
              </div>
              <p className="text-zinc-500 text-xs leading-relaxed">
                Tu marketplace local. Conectamos compradores con comerciantes independientes en Venezuela.
              </p>
              <p className="text-zinc-700 text-[10px] mt-4 uppercase tracking-widest">
                República Bolivariana de Venezuela
              </p>
            </div>

            {/* Plataforma */}
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Plataforma</p>
              <div className="space-y-3">
                <button onClick={() => navigate('/')} className="block text-xs text-zinc-400 hover:text-amber-500 transition-colors">Marketplace</button>
                <button onClick={() => { setIsMerchantModalOpen(true); setMerchantAuthMode('pitch'); }} className="block text-xs text-zinc-400 hover:text-amber-500 transition-colors">Abrir mi Tienda</button>
                <button onClick={() => navigate('/pricing')} className="block text-xs text-zinc-400 hover:text-amber-500 transition-colors">Planes y Precios</button>
              </div>
            </div>

            {/* Soporte */}
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Soporte</p>
              <div className="space-y-3">
                <button onClick={() => setIsMerchantModalOpen(true)} className="block text-xs text-zinc-400 hover:text-amber-500 transition-colors">Acceso Comerciantes</button>
                <button onClick={() => setIsAuthModalOpen(true)} className="block text-xs text-zinc-400 hover:text-amber-500 transition-colors">Acceso Compradores</button>
              </div>
            </div>

            {/* Legal */}
            <div>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Legal</p>
              <div className="space-y-3">
                <button onClick={() => navigate('/legal/terminos')} className="block text-xs text-zinc-400 hover:text-amber-500 transition-colors">Términos de Uso</button>
                <button onClick={() => navigate('/legal/privacidad')} className="block text-xs text-zinc-400 hover:text-amber-500 transition-colors">Privacidad</button>
                <button onClick={() => navigate('/legal/cookies')} className="block text-xs text-zinc-400 hover:text-amber-500 transition-colors">Cookies</button>
                <button onClick={() => navigate('/legal/comerciantes')} className="block text-xs text-zinc-400 hover:text-amber-500 transition-colors">Términos Comerciantes</button>
                <button onClick={() => navigate('/legal/aviso')} className="block text-xs text-zinc-400 hover:text-amber-500 transition-colors">Aviso Legal</button>
              </div>
            </div>
          </div>

          {/* Divider + Copyright */}
          <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-zinc-600 text-[11px]">
              © {new Date().getFullYear()} AxonMarket · Emprendimiento Hernán Perdomo · RIF J-508056124 · Venezuela

            </p>
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/legal/terminos')} className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">Términos</button>
              <span className="text-zinc-800">·</span>
              <button onClick={() => navigate('/legal/privacidad')} className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">Privacidad</button>
              <span className="text-zinc-800">·</span>
              <button onClick={() => navigate('/legal/aviso')} className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">Aviso Legal</button>
            </div>
          </div>
        </div>
      </footer>

      {/* Bottom Navigation Bar (Mobile Only) - Floating Glassmorphic Design */}
      <div 
        className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[400px] z-50 rounded-2xl bg-zinc-950/70 backdrop-blur-xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
      >
        <div className="flex justify-between items-center h-16 px-2">
           <button className="flex-1 flex flex-col items-center gap-1 p-2 text-amber-500 transition-colors">
             <Home size={22} fill="currentColor" />
             <span className="text-[10px] font-bold">Inicio</span>
           </button>
           
           <button onClick={() => {
              setIsCategoriesOpen(true);
           }} className="flex-1 flex flex-col items-center gap-1 p-2 text-zinc-400 hover:text-zinc-200 transition-colors relative">
             <Menu size={22} />
             <span className="text-[10px] font-medium">Categorías</span>
           </button>

           {/* Floating Action Button */}
           <div className="flex-1 flex justify-center relative -top-6">
             <div onClick={() => window.scrollTo({top:0, behavior:'smooth'})} className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center text-black shadow-[0_10px_25px_rgba(245,158,11,0.5)] cursor-pointer hover:scale-105 active:scale-95 transition-transform">
               <ShoppingBag size={24} className="stroke-[2.5]" />
             </div>
           </div>

           <button onClick={() => {
              if(!currentCustomer) { setAuthMode('login'); setIsAuthModalOpen(true); }
           }} className="flex-1 flex flex-col items-center gap-1 p-2 text-zinc-400 hover:text-amber-500 transition-colors">
             <Heart size={22} />
             <span className="text-[10px] font-medium">Favoritos</span>
           </button>

           <button onClick={() => {
              // Future map function
           }} className="flex-1 flex flex-col items-center gap-1 p-2 transition-colors text-zinc-400 hover:text-amber-500">
             <MapPin size={22} />
             <span className="text-[10px] font-medium">Mapa</span>
           </button>
        </div>
      </div>

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
                <button onClick={() => setIsCartOpen(false)} className="text-zinc-400 hover:text-black hover:bg-zinc-100 rounded-full p-2 transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 scrollbar-hide bg-zinc-50">
                {Object.keys(globalCart).length === 0 ? (
                  <div className="text-center py-20 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-8 shadow-sm border border-black/5">
                      <ShoppingBag size={48} className="text-zinc-300" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 mb-3 tracking-tight">Carrito Vacío</h3>
                    <p className="text-zinc-500 text-sm mb-10 max-w-[250px] leading-relaxed">El ecosistema está lleno de productos increíbles. Explora el directorio.</p>
                    <button onClick={() => setIsCartOpen(false)} className="px-10 py-4 text-white bg-amber-500 rounded-full text-xs font-bold tracking-widest uppercase transition-all shadow-lg shadow-amber-500/30 hover:scale-[1.02]">Explorar</button>
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
                                  <Package size={20} className="text-zinc-400" />
                                )}
                              </div>
                              <div className="flex-1 flex flex-col justify-center">
                                <h5 className="text-sm font-bold text-slate-800 line-clamp-1 mb-1">{item.name}</h5>
                                <div className="text-amber-500 font-black text-sm tracking-wide">${item.price.toFixed(2)} <span className="text-zinc-500 font-medium ml-1">x {item.quantity}</span></div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => navigate(`/${storeSlug}`)} className="w-full mt-6 py-4 bg-amber-500 text-white rounded-2xl text-xs font-bold tracking-[0.2em] uppercase shadow-lg shadow-amber-500/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
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

      {/* Categories Slide-over (Mobile Only) */}
      <AnimatePresence>
        {isCategoriesOpen && (
          <div className="fixed inset-0 z-[100] flex justify-start md:hidden">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-black/90" onClick={() => setIsCategoriesOpen(false)}
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 200 }}
              className="bg-zinc-950 border-r border-white/5 w-full max-w-[85%] h-full relative z-10 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20">
                    <Menu className="text-amber-500" size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Categorías</h2>
                </div>
                <button onClick={() => setIsCategoriesOpen(false)} className="text-zinc-400 hover:text-white bg-white/5 rounded-full p-2 transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                <div className="grid grid-cols-2 gap-4 mb-8">
                  {categories.map((cat) => {
                    const isActive = activeCategory === cat.id;
                    return (
                      <div key={cat.id} onClick={() => { setActiveCategory(cat.id); setIsCategoriesOpen(false); window.scrollTo({top:0, behavior:'smooth'}); }} className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${isActive ? 'bg-amber-500/10 border-amber-500/30' : 'bg-zinc-900 border-white/5 hover:bg-zinc-800'}`}>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isActive ? 'bg-amber-500 text-black' : 'bg-black text-amber-500'}`}>
                          <cat.icon size={24} strokeWidth={isActive ? 2.5 : 1.5} />
                        </div>
                        <span className={`text-xs font-bold text-center ${isActive ? 'text-amber-500' : 'text-zinc-300'}`}>{cat.name}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Animated Banners inside Categories Menu */}
                {!currentCustomer && !currentMerchant && (
                  <div className="mt-4 relative overflow-hidden rounded-[1.5rem] shadow-2xl bg-zinc-900 border border-white/10 h-40">
                    <AnimatePresence initial={false} mode="wait">
                      {bannerSlide === 0 ? (
                        <motion.div
                          key="banner-0"
                          initial={{ opacity: 0, x: 50 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -50 }}
                          transition={{ duration: 0.5 }}
                          className="absolute inset-0 bg-gradient-to-br from-amber-500 to-amber-600 p-5 flex flex-col justify-between"
                        >
                          <div className="flex flex-col">
                            <span className="text-black font-black text-xl leading-tight">Haz crecer tu negocio</span>
                            <span className="text-black/80 text-sm font-medium mt-1">Crea tu tienda virtual gratis</span>
                          </div>
                          <button onClick={() => { setIsCategoriesOpen(false); setMerchantAuthMode('pitch'); setIsMerchantModalOpen(true); }} className="bg-black text-amber-500 px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg active:scale-95 transition-transform w-full text-center flex items-center justify-center gap-2">
                            <Store size={16} /> Vender en Axon
                          </button>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="banner-1"
                          initial={{ opacity: 0, x: 50 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -50 }}
                          transition={{ duration: 0.5 }}
                          className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 p-5 flex flex-col justify-between"
                        >
                          <div className="flex flex-col">
                            <span className="text-white font-black text-xl leading-tight">¿Ya eres cliente?</span>
                            <span className="text-zinc-400 text-sm font-medium mt-1">Guarda tiendas y pedidos</span>
                          </div>
                          <button onClick={() => { setIsCategoriesOpen(false); setAuthMode('login'); setIsAuthModalOpen(true); }} className="bg-white text-black px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg active:scale-95 transition-transform w-full text-center flex items-center justify-center gap-2">
                            <User size={16} /> Iniciar Sesión
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Pagination Dots */}
                    <div className="absolute top-4 right-4 flex gap-1.5 z-20">
                      <div className={`w-1.5 h-1.5 rounded-full transition-all ${bannerSlide === 0 ? 'bg-black w-3' : 'bg-black/30'}`} />
                      <div className={`w-1.5 h-1.5 rounded-full transition-all ${bannerSlide === 1 ? 'bg-white w-3' : 'bg-white/30'}`} />
                    </div>
                  </div>
                )}

                {currentMerchant && (
                  <div className="mt-4 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-[1.5rem] p-5 flex items-center justify-between shadow-2xl cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => {setIsCategoriesOpen(false); navigate('/dashboard');}}>
                    <div>
                      <h4 className="text-black font-black text-lg">Panel de Control</h4>
                      <p className="text-black/70 text-xs font-medium max-w-[200px]">Administra tu tienda, productos y pedidos.</p>
                    </div>
                    <div className="w-12 h-12 bg-black/10 rounded-full flex items-center justify-center text-black shadow-inner">
                      <Store size={24} />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="absolute inset-0 bg-zinc-950/95" onClick={() => setIsAuthModalOpen(false)} />
          <div className="bg-zinc-950 rounded-[3rem] shadow-2xl w-full max-w-md relative z-10 overflow-y-auto max-h-[95vh] scrollbar-hide border border-white/10 animate-in zoom-in-95 duration-150">
              <div className="p-8 pb-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-light text-white flex items-center gap-3 tracking-tight">
                    <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center">
                      <User size={20} className="text-amber-500" />
                    </div>
                    {authMode === 'login' ? 'Iniciar Sesión' : authMode === 'register' ? 'Crear Cuenta' : 'Recuperar Contraseña'}
                  </h2>
                </div>
                <button onClick={() => setIsAuthModalOpen(false)} className="text-zinc-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-2 transition-colors">
                  <X size={20} />
                </button>
              </div>

              {authMode === 'recover' || authMode === 'reset' ? (
                <form onSubmit={(e) => authMode === 'recover' ? handleRecoverPassword(e, 'customer') : handleResetPassword(e, 'customer')} className="p-8 space-y-5">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Correo Electrónico</label>
                    <input type="email" required value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} disabled={authMode === 'reset'} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="tu@correo.com" />
                  </div>
                  {authMode === 'reset' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Código de 6 dígitos <span className="lowercase text-zinc-600 font-normal">(Opcional si usaste un enlace mágico)</span></label>
                        <input type="text" value={recoveryCode} onChange={e => setRecoveryCode(e.target.value)} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="123456" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Nueva Contraseña</label>
                        <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="••••••••" />
                      </div>
                    </>
                  )}
                  <button type="submit" className="w-full bg-amber-500 text-black rounded-full py-4 text-xs font-bold tracking-[0.2em] uppercase hover:bg-amber-400 transition-colors mt-8 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                    {authMode === 'recover' ? 'Enviar Código' : 'Restablecer Contraseña'}
                  </button>
                  <p className="text-center text-sm font-light text-zinc-500 mt-6">
                    <button type="button" onClick={() => setAuthMode('login')} className="text-white font-bold hover:text-amber-500 transition-colors focus:outline-none">
                      Volver al inicio de sesión
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="p-8 space-y-5">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Correo Electrónico</label>
                    <input type="email" required value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="tu@correo.com" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Contraseña</label>
                    <div className="relative">
                      <input type={showAuthPassword ? "text" : "password"} required value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 pr-12 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="••••••••" />
                      <button type="button" onClick={() => setShowAuthPassword(!showAuthPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-amber-500 transition-colors">
                        {showAuthPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {authMode === 'register' && (
                    <>
                      <PasswordRequirements password={authForm.password} />
                      <div className="mt-4">
                        <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Confirmar Contraseña</label>
                        <div className="relative">
                          <input type={showAuthConfirmPassword ? "text" : "password"} required value={authConfirmPassword} onChange={e => setAuthConfirmPassword(e.target.value)} className={`w-full bg-zinc-900 border ${authConfirmPassword && authConfirmPassword !== authForm.password ? 'border-red-500/50' : 'border-white/5'} rounded-2xl px-5 py-4 pr-12 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700`} placeholder="••••••••" />
                          <button type="button" onClick={() => setShowAuthConfirmPassword(!showAuthConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-amber-500 transition-colors">
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
                      <button type="button" onClick={() => setAuthMode('recover')} className="text-xs text-amber-500 hover:text-amber-400 transition-colors">
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                  )}

                  {authMode === 'register' && (
                    <div className="flex items-start gap-3 bg-white/3 border border-white/5 rounded-2xl p-4">
                      <input
                        type="checkbox"
                        id="buyer-terms-checkbox"
                        checked={termsAccepted}
                        onChange={e => setTermsAccepted(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-amber-500 shrink-0 cursor-pointer"
                      />
                      <label htmlFor="buyer-terms-checkbox" className="text-xs text-zinc-400 leading-relaxed cursor-pointer">
                        He leído y acepto los{' '}
                        <button type="button" onClick={() => { setIsAuthModalOpen(false); navigate('/legal/terminos'); }} className="text-amber-500 hover:underline font-bold">Términos de Uso</button>
                        {' '}y la{' '}
                        <button type="button" onClick={() => { setIsAuthModalOpen(false); navigate('/legal/privacidad'); }} className="text-amber-500 hover:underline font-bold">Política de Privacidad</button>
                        {' '}de AxonMarket.
                      </label>
                    </div>
                  )}

                  <button type="submit" disabled={authMode === 'register' && !termsAccepted} className="w-full bg-amber-500 text-black rounded-full py-4 text-xs font-bold tracking-[0.2em] uppercase hover:bg-amber-400 transition-colors mt-4 shadow-[0_0_30px_rgba(245,158,11,0.2)] disabled:opacity-40 disabled:cursor-not-allowed">
                    {authMode === 'login' ? 'Acceder al Ecosistema' : 'Registrarme'}
                  </button>

                  <p className="text-center text-sm font-light text-zinc-500 mt-6">
                    {authMode === 'login' ? '¿Aún no tienes cuenta?' : '¿Ya eres miembro?'}
                    <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="text-white font-bold ml-2 hover:text-amber-500 transition-colors focus:outline-none">
                      {authMode === 'login' ? 'Regístrate' : 'Inicia sesión'}
                    </button>
                  </p>
                </form>
              )}

              <div className="px-8 pb-8">
                <div className="flex items-center justify-between text-zinc-600 text-xs font-bold uppercase tracking-widest mb-6">
                  <span className="w-1/4 border-b border-white/5"></span>
                  <span>o continuar con</span>
                  <span className="w-1/4 border-b border-white/5"></span>
                </div>
                
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => alert('Fallo al conectar con Google')}
                    theme="filled_black"
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
          <div className="absolute inset-0 bg-zinc-950/95" onClick={() => !merchantLoading && setIsMerchantModalOpen(false)} />
          <div className="bg-zinc-950 rounded-[3rem] shadow-2xl w-full max-w-lg relative z-10 overflow-y-auto max-h-[95vh] scrollbar-hide border border-amber-500/20 animate-in zoom-in-95 duration-150">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-amber-600"></div>
              
              <div className="p-8 pb-6 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
                      <Store size={24} className="text-amber-500" />
                    </div>
                    <h2 className="text-3xl font-light text-white tracking-tight">
                      {merchantAuthMode === 'pitch' ? 'El Control Total de tu Negocio' : merchantAuthMode === 'register' ? 'Inicia tu Imperio' : merchantAuthMode === 'login' ? 'Panel Central' : 'Recuperar Acceso'}
                    </h2>
                  </div>
                  <p className="text-zinc-500 font-light text-sm mt-4">
                    {merchantAuthMode === 'pitch' ? 'Tu propia tienda en la nube con inventario ERP, pagos directos y delivery automatizado.' : merchantAuthMode === 'register' ? 'Crea tu tienda y únete a la red comercial más avanzada.' : 'Accede a tu infraestructura de ventas.'}
                  </p>
                </div>
                <button onClick={() => !merchantLoading && setIsMerchantModalOpen(false)} className="text-zinc-500 hover:text-white hover:bg-white/10 rounded-full p-2 transition-colors self-start">
                  <X size={20} />
                </button>
              </div>

              {merchantAuthMode !== 'pitch' && (merchantAuthMode !== 'register' || merchantRegStep === 1) && (
                <div className="px-8 pb-4">
                  <div className="flex bg-zinc-900 rounded-full p-1 border border-white/5">
                    <button
                      type="button"
                      onClick={() => setMerchantAuthMode('register')}
                      className={`flex-1 py-3 rounded-full text-xs font-bold tracking-widest uppercase transition-all ${
                        merchantAuthMode === 'register'
                          ? 'bg-zinc-800 text-amber-500 shadow-lg border border-white/5'
                          : 'text-zinc-500 hover:text-white'
                      }`}
                    >
                      Crear Tienda
                    </button>
                    <button
                      type="button"
                      onClick={() => setMerchantAuthMode('login')}
                      className={`flex-1 py-3 rounded-full text-xs font-bold tracking-widest uppercase transition-all ${
                        (merchantAuthMode === 'login' || merchantAuthMode === 'recover' || merchantAuthMode === 'reset')
                          ? 'bg-zinc-800 text-amber-500 shadow-lg border border-white/5'
                          : 'text-zinc-500 hover:text-white'
                      }`}
                    >
                      Iniciar Sesión
                    </button>
                  </div>
                </div>
              )}

              {merchantAuthMode === 'pitch' && (
                <div className="p-8 pt-0">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 shadow-[0_0_30px_rgba(245,158,11,0.1)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-amber-500/20 blur-3xl rounded-full"></div>
                    
                    <div className="flex items-center justify-between mb-5 relative z-10">
                      <span className="text-amber-500 font-black tracking-widest uppercase text-xs bg-amber-500/20 px-3 py-1.5 rounded-full">TODO EN UNO · 0% COMISIÓN</span>
                      <div className="flex flex-col items-end">
                        <div className="flex items-end gap-2">
                          <span className="text-zinc-500 line-through text-sm font-medium">$60</span>
                          <span className="text-white font-black text-4xl leading-none">$40</span>
                          <span className="text-zinc-400 text-xs font-bold mb-1">/ MES</span>
                        </div>
                        <p className="text-amber-400 text-[10px] text-right mt-1 font-medium">Se paga solo con tus primeros 2 pedidos</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4 mb-6 relative z-10">
                      <div className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-amber-500 font-bold text-sm">✓</span>
                        </div>
                        <p className="text-zinc-300 font-light text-sm leading-relaxed">
                          <strong className="text-white">0% Comisiones y Pago Móvil Directo:</strong> Las apps tradicionales te quitan hasta un 30%. Aquí el cliente sube su captura y referencia de Pago Móvil, y tú recibes el 100% del dinero directo en tu cuenta bancaria sin retenciones.
                        </p>
                      </div>
                      
                      <div className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-amber-500 font-bold text-sm">✓</span>
                        </div>
                        <p className="text-zinc-300 font-light text-sm leading-relaxed">
                          <strong className="text-white">Mini-ERP, Inventario y Analítica en Tiempo Real:</strong> Aloja tu vitrina 24/7 en la nube. Sube productos, controla existencias, lanza ofertas y mide exactamente cuánto estás vendiendo desde un solo panel.
                        </p>
                      </div>
                      
                      <div className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-amber-500 font-bold text-sm">✓</span>
                        </div>
                        <p className="text-zinc-300 font-light text-sm leading-relaxed">
                          <strong className="text-white">Despacho Automático con Red de Couriers:</strong> Al verificar el pago del cliente con un clic, nuestra plataforma alerta automáticamente a nuestra red de repartidores aliados con el GPS exacto del comprador.
                        </p>
                      </div>

                      <div className="flex gap-3 items-start">
                        <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-amber-500 font-bold text-sm">✓</span>
                        </div>
                        <p className="text-zinc-300 font-light text-sm leading-relaxed">
                          <strong className="text-white">Precios de Anaquel = Más Ventas:</strong> Al no pagar comisiones por cada carrito, mantienes tus precios reales sin inflarlos, fidelizando a tus clientes frente a la competencia.
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-black/30 rounded-2xl p-4 border border-amber-500/10 relative z-10">
                      <p className="text-zinc-400 text-xs leading-relaxed text-justify">
                        * Tu plan incluye <strong className="text-amber-400 font-semibold">500 pedidos mensuales con 0% de comisión</strong> (<strong className="text-amber-400 font-semibold">ahorras más de $1,500 USD/mes</strong> frente a otras apps). Al superar las 500 órdenes, solo aplica una micro-tarifa fija de $0.10 por pedido adicional para garantizar tu infraestructura en la nube siempre rápida y en línea.
                      </p>
                    </div>
                    
                    <button 
                      onClick={() => setMerchantAuthMode('register')}
                      className="w-full bg-amber-500 text-black rounded-full py-4 mt-6 font-black text-sm tracking-[0.2em] uppercase transition-all shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:bg-amber-400 hover:shadow-[0_0_50px_rgba(245,158,11,0.5)] flex items-center justify-center gap-3 relative z-10"
                    >
                      ACTIVAR MI VITRINA SIN COMISIONES <ArrowRight size={18} />
                    </button>

                    <p className="text-xs text-neutral-400 text-center mt-4 relative z-10">
                      🔒 Sin contratos forzosos · Dinero 100% directo a tu banco
                    </p>
                    
                    <div className="mt-4 text-center relative z-10">
                      <button onClick={() => setMerchantAuthMode('login')} className="text-xs text-zinc-500 hover:text-white font-medium transition-colors">
                        Ya tengo una tienda. <span className="text-amber-500 underline">Iniciar sesión</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {merchantAuthMode === 'recover' || merchantAuthMode === 'reset' ? (
                <form onSubmit={(e) => merchantAuthMode === 'recover' ? handleRecoverPassword(e, 'merchant') : handleResetPassword(e, 'merchant')} className="p-8 pt-4 space-y-5">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Correo Electrónico Administrador</label>
                    <input type="email" required value={merchantForm.email} onChange={e => setMerchantForm({...merchantForm, email: e.target.value})} disabled={merchantAuthMode === 'reset'} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="admin@empresa.com" />
                  </div>
                  {merchantAuthMode === 'reset' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Código de 6 dígitos <span className="lowercase text-zinc-600 font-normal">(Opcional si usaste un enlace mágico)</span></label>
                        <input type="text" value={recoveryCode} onChange={e => setRecoveryCode(e.target.value)} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="123456" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Nueva Contraseña</label>
                        <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="••••••••" />
                      </div>
                    </>
                  )}
                  <button type="submit" disabled={merchantLoading || !merchantForm.email} className="w-full bg-amber-500 text-black rounded-full py-4 mt-4 font-bold text-xs tracking-[0.2em] uppercase transition-all shadow-[0_0_30px_rgba(245,158,11,0.2)] hover:bg-amber-400 hover:shadow-[0_0_40px_rgba(245,158,11,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3">
                    {merchantAuthMode === 'recover' ? 'Enviar Código' : 'Restablecer Contraseña'}
                  </button>
                  <div className="flex justify-center mt-4">
                    <button type="button" onClick={() => setMerchantAuthMode('login')} className="text-xs text-zinc-500 hover:text-amber-500 transition-colors">
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
                          className="text-lg font-bold text-white text-center"
                        >
                          {loadingTexts[loadingTextIndex]}
                        </motion.h3>
                      </motion.div>
                    ) : (
                    <>
                      {merchantRegStep === 1 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Correo Electrónico</label>
                            <input type="email" required value={merchantForm.email} onChange={e => setMerchantForm({...merchantForm, email: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="admin@empresa.com" autoFocus />
                          </div>
                          
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Contraseña Administrativa</label>
                            <div className="relative">
                              <input type={showMerchantPassword ? "text" : "password"} required value={merchantForm.password} onChange={e => setMerchantForm({...merchantForm, password: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 pr-12 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="••••••••" />
                              <button type="button" onClick={() => setShowMerchantPassword(!showMerchantPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-amber-500 transition-colors">
                                {showMerchantPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </div>
                          </div>

                          <PasswordRequirements password={merchantForm.password} />

                          <div>
                            <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Confirmar Contraseña</label>
                            <div className="relative">
                              <input type={showMerchantConfirmPassword ? "text" : "password"} required value={merchantConfirmPassword} onChange={e => setMerchantConfirmPassword(e.target.value)} className={`w-full bg-zinc-900 border ${merchantConfirmPassword && merchantConfirmPassword !== merchantForm.password ? 'border-red-500/50' : 'border-white/5'} rounded-2xl px-5 py-4 pr-12 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700`} placeholder="••••••••" />
                              <button type="button" onClick={() => setShowMerchantConfirmPassword(!showMerchantConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-amber-500 transition-colors">
                                {showMerchantConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </div>
                            {merchantConfirmPassword && merchantConfirmPassword !== merchantForm.password && (
                              <p className="text-red-500 text-xs mt-2">Las contraseñas no coinciden.</p>
                            )}
                          </div>

                          <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-zinc-800"></div>
                            </div>
                            <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                              <span className="bg-zinc-950 px-2 text-zinc-500">o continúa con</span>
                            </div>
                          </div>

                          <div className="flex items-start gap-3 bg-white/3 border border-white/5 rounded-2xl p-4">
                            <input
                              type="checkbox"
                              id="merchant-terms-checkbox"
                              checked={merchantTermsAccepted}
                              onChange={e => setMerchantTermsAccepted(e.target.checked)}
                              className="mt-0.5 w-4 h-4 accent-amber-500 shrink-0 cursor-pointer"
                            />
                            <label htmlFor="merchant-terms-checkbox" className="text-xs text-zinc-400 leading-relaxed cursor-pointer">
                              He leído y acepto los{' '}
                              <button type="button" onClick={() => { setIsMerchantModalOpen(false); navigate('/legal/terminos'); }} className="text-amber-500 hover:underline font-bold">Términos de Uso</button>
                              {' '}y los{' '}
                              <button type="button" onClick={() => { setIsMerchantModalOpen(false); navigate('/legal/comerciantes'); }} className="text-amber-500 hover:underline font-bold">Términos para Comerciantes</button>.
                            </label>
                          </div>
                            <GoogleLogin
                              onSuccess={handleGoogleMerchantSuccess}
                              onError={() => { console.log('Login Failed'); }}
                              theme="filled_black"
                              shape="pill"
                              size="large"
                              width="100%"
                            />
                        </motion.div>
                      )}
                      
                      {merchantRegStep === 2 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Nombre Completo del Contacto</label>
                            <input type="text" required value={merchantForm.ownerName} onChange={e => setMerchantForm({...merchantForm, ownerName: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="Ej. Juan Pérez" autoFocus />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Teléfono de Contacto</label>
                            <input type="tel" required value={merchantForm.contactPhone} onChange={e => setMerchantForm({...merchantForm, contactPhone: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="Ej. 04141234567" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Correo de Contacto</label>
                            <input type="email" required value={merchantForm.contactEmail} onChange={e => setMerchantForm({...merchantForm, contactEmail: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="contacto@empresa.com" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Nombre del Negocio</label>
                            <input type="text" required value={merchantForm.businessName} onChange={e => setMerchantForm({...merchantForm, businessName: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="Ej. Inversiones San José" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Categoría Principal</label>
                            <select required value={merchantForm.category} onChange={e => setMerchantForm({...merchantForm, category: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light appearance-none">
                              {categories.slice(1).map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                              ))}
                            </select>
                          </div>
                        </motion.div>
                      )}

                      {merchantRegStep === 3 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                          <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10">
                            <div>
                              <p className="text-[11px] font-bold text-white uppercase tracking-wider">Activar Restricción de Horario</p>
                              <p className="text-[10px] text-zinc-400 mt-1">Bloquea el carrito cuando estés cerrado.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input type="checkbox" className="sr-only peer" checked={merchantForm.scheduleActive} onChange={e => setMerchantForm({...merchantForm, scheduleActive: e.target.checked})} />
                              <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                            </label>
                          </div>
                          
                          {merchantForm.scheduleActive && (
                            <div className="space-y-4 pt-2">
                              <div className="flex gap-4">
                                <div className="flex-1">
                                  <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-widest">Hora Apertura</label>
                                  <input type="time" required value={merchantForm.scheduleOpen} onChange={e => setMerchantForm({...merchantForm, scheduleOpen: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50" />
                                </div>
                                <div className="flex-1">
                                  <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-widest">Hora Cierre</label>
                                  <input type="time" required value={merchantForm.scheduleClose} onChange={e => setMerchantForm({...merchantForm, scheduleClose: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50" />
                                </div>
                              </div>
                              
                              <div>
                                <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-widest">Margen de Cierre (Amarillo)</label>
                                <div className="flex items-center gap-3">
                                  <input type="number" min="0" max="120" required value={merchantForm.closeWarningMinutes} onChange={e => setMerchantForm({...merchantForm, closeWarningMinutes: Number(e.target.value)})} className="w-24 bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50" />
                                  <span className="text-[10px] text-zinc-400">minutos antes del cierre se bloquearán las compras.</span>
                                </div>
                              </div>

                              <div className="p-4 rounded-xl border border-white/5 flex flex-col gap-3 bg-zinc-900/50">
                                <div>
                                  <p className="text-xs font-bold text-white">Vista previa del semáforo actual:</p>
                                  <p className="text-[10px] text-zinc-400 mt-0.5">Así ve el estado el cliente en este momento exacto.</p>
                                </div>
                                <div className="self-start px-3 py-1.5 rounded-full flex items-center gap-2 font-bold text-xs bg-emerald-500/20 text-emerald-400">
                                  <div className="w-2 h-2 rounded-full animate-pulse bg-emerald-500"></div>
                                  Abierto (Cierra a las {merchantForm.scheduleClose})
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Días Laborables</label>
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
                                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' 
                                        : 'bg-zinc-900 border-white/5 text-zinc-500 hover:bg-zinc-800'
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
                            <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">RIF (Jurídico o Personal)</label>
                            <div className="flex gap-2">
                              <select 
                                value={merchantForm.rifPrefix} 
                                onChange={e => setMerchantForm({...merchantForm, rifPrefix: e.target.value})} 
                                className="w-[80px] bg-zinc-900 border border-white/5 rounded-2xl px-4 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light appearance-none text-center"
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
                                onChange={e => setMerchantForm({...merchantForm, rifNumber: e.target.value.replace(/[^0-9-]/g, '')})} 
                                className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" 
                                placeholder="12345678 o 12345678-9" 
                              />
                            </div>
                          </div>
                          <div className="bg-white/5 p-4 rounded-2xl space-y-3">
                            <p className="text-xs text-amber-500 font-bold tracking-wider">DATOS PARA RECIBIR PAGO MÓVIL</p>
                            <input type="text" required value={merchantForm.pagoMovilPhone} onChange={e => setMerchantForm({...merchantForm, pagoMovilPhone: e.target.value})} className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 text-sm placeholder-zinc-600" placeholder="Teléfono (Ej. 04141234567)" />
                            <select required value={merchantForm.pagoMovilBank} onChange={e => setMerchantForm({...merchantForm, pagoMovilBank: e.target.value})} className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 text-sm appearance-none">
                              <option value="">Selecciona tu Banco</option>
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
                            <input type="text" required value={merchantForm.pagoMovilId} onChange={e => setMerchantForm({...merchantForm, pagoMovilId: e.target.value})} className="w-full bg-zinc-950 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 text-sm placeholder-zinc-600" placeholder="Cédula / RIF asociado" />
                          </div>
                        </motion.div>
                      )}

                      {merchantRegStep === 5 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                          {(() => {
                            const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                            return isMobileDevice ? (
                              <div className="bg-zinc-800/50 p-6 rounded-2xl text-center space-y-4 mb-4 border border-white/10">
                                <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-2 border border-amber-500/20">
                                  <MapPin size={24} className="text-amber-500" />
                                </div>
                                <h3 className="text-white font-bold text-lg tracking-tight">Ubicación de tu Negocio</h3>
                                <p className="text-sm text-zinc-400 leading-relaxed">Presiona el botón para detectar automáticamente la ubicación exacta de tu negocio usando el GPS de tu dispositivo.</p>
                                <button type="button" onClick={handleDetectGPS} className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-colors mt-4 shadow-lg shadow-amber-500/20">
                                  <MapPin size={18} /> Detectar mi ubicación por GPS
                                </button>
                                {merchantForm.gpsCoords && <p className="text-sm text-emerald-500 font-bold mt-4 bg-emerald-500/10 py-3 rounded-xl border border-emerald-500/20">¡Ubicación GPS Guardada Exitosamente!</p>}
                              </div>
                            ) : (
                              <>
                                <div className="bg-zinc-800/50 p-5 rounded-2xl text-center space-y-2 mb-4 border border-white/10">
                                  <MapPin size={24} className="text-amber-500 mx-auto mb-1" />
                                  <h3 className="text-white font-bold text-lg tracking-tight">Dirección del Negocio</h3>
                                  <p className="text-xs text-zinc-400">Ingresa tu dirección detallada para que tus clientes puedan visitarte.</p>
                                </div>
                                <div className="flex gap-2">
                                  <input required type="text" value={merchantForm.addressState} onChange={e => setMerchantForm({...merchantForm, addressState: e.target.value})} className="w-1/2 bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 text-sm placeholder-zinc-600" placeholder="Estado (Obligatorio)" />
                                  <input required type="text" value={merchantForm.addressCity} onChange={e => setMerchantForm({...merchantForm, addressCity: e.target.value})} className="w-1/2 bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 text-sm placeholder-zinc-600" placeholder="Ciudad (Obligatorio)" />
                                </div>
                                <textarea required value={merchantForm.addressLine} onChange={e => setMerchantForm({...merchantForm, addressLine: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 text-sm min-h-[80px] placeholder-zinc-600" placeholder="Dirección detallada (Obligatorio)"></textarea>
                              </>
                            );
                          })()}
                        </motion.div>
                      )}

                      {merchantRegStep === 6 && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center space-y-4">
                          <p className="text-center text-sm text-zinc-400">Escanea este código QR en tu app de Google Authenticator para asegurar tu cuenta de comercio.</p>
                          <div className="bg-white p-4 rounded-xl shadow-lg border border-white/20">
                            <QRCodeSVG value={merchantMfaUrl} size={180} />
                          </div>
                          <p className="text-xs text-zinc-600">Clave manual: <span className="font-mono text-amber-500">{merchantMfaSecret}</span></p>
                          
                          <div className="w-full mt-4">
                            <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest text-center">Código de 6 dígitos</label>
                            <input type="text" required maxLength={6} value={merchantMfaCode} onChange={e => setMerchantMfaCode(e.target.value.replace(/\D/g, ''))} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-mono text-center tracking-[0.5em] text-lg" placeholder="123456" autoFocus />
                          </div>
                        </motion.div>
                      )}

                      <button 
                        type="submit" 
                        disabled={
                          merchantLoading || 
                          (merchantRegStep === 1 && (!merchantForm.email || !merchantForm.password || !merchantTermsAccepted)) || 
                          (merchantRegStep === 2 && (!merchantForm.businessName || !merchantForm.ownerName || !merchantForm.contactPhone || !merchantForm.contactEmail || !merchantForm.category)) || 
                          (merchantRegStep === 3 && merchantForm.scheduleActive && (!merchantForm.scheduleOpen || !merchantForm.scheduleClose)) || 
                          (merchantRegStep === 4 && (!merchantForm.rifNumber || !merchantForm.pagoMovilPhone || !merchantForm.pagoMovilBank || !merchantForm.pagoMovilId)) ||
                          (merchantRegStep === 5 && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? !merchantForm.gpsCoords : (!merchantForm.addressState || !merchantForm.addressCity || !merchantForm.addressLine))) ||
                          (merchantRegStep === 6 && merchantMfaCode.length < 6)
                        }
                        className="w-full bg-amber-500 text-black rounded-full py-4 mt-6 font-bold text-xs tracking-[0.2em] uppercase transition-all shadow-[0_0_30px_rgba(245,158,11,0.2)] hover:bg-amber-400 disabled:opacity-50 flex items-center justify-center gap-3"
                      >
                        {merchantLoading ? (
                          <><Loader2 className="animate-spin" size={18} /> Procesando...</>
                        ) : (
                          <>{merchantRegStep < 6 ? 'Continuar' : 'Verificar y Acceder'} <ArrowRight size={16} /></>
                        )}
                      </button>
                    </>
                    )
                  ) : (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Correo Electrónico</label>
                        <input type="email" required value={merchantForm.email} onChange={e => setMerchantForm({...merchantForm, email: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="admin@empresa.com" />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Contraseña Administrativa</label>
                        <div className="relative">
                          <input type={showMerchantPassword ? "text" : "password"} required value={merchantForm.password} onChange={e => setMerchantForm({...merchantForm, password: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 pr-12 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="••••••••" />
                          <button type="button" onClick={() => setShowMerchantPassword(!showMerchantPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-amber-500 transition-colors">
                            {showMerchantPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-end mt-2">
                        <button type="button" onClick={() => setMerchantAuthMode('recover')} className="text-[10px] text-amber-500 hover:text-amber-400 font-bold uppercase tracking-wider transition-colors">
                          ¿Olvidaste tu contraseña?
                        </button>
                      </div>

                      <button 
                        type="submit" 
                        disabled={merchantLoading || !merchantForm.email}
                        className="w-full bg-amber-500 text-black rounded-full py-4 mt-4 font-bold text-xs tracking-[0.2em] uppercase transition-all shadow-[0_0_30px_rgba(245,158,11,0.2)] hover:bg-amber-400 hover:shadow-[0_0_40px_rgba(245,158,11,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                      >
                        {merchantLoading ? (
                          <><Loader2 className="animate-spin" size={18} /> Procesando...</>
                        ) : (
                          <>Acceder al ERP <ArrowRight size={16} /></>
                        )}
                      </button>

                      <div className="relative py-2 mt-4">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-zinc-800"></div>
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                          <span className="bg-zinc-950 px-2 text-zinc-500">o continúa con</span>
                        </div>
                      </div>

                      <GoogleLogin
                        onSuccess={handleGoogleMerchantSuccess}
                        onError={() => { alert('Fallo al conectar con Google'); }}
                        theme="filled_black"
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
          localStorage.setItem('ecommerce_current_customer', JSON.stringify(updatedCustomer));
          setCurrentCustomer(updatedCustomer);
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
    </GoogleOAuthProvider>
  );
}
