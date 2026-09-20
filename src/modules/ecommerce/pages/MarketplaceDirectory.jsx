import React, { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Search, Star, ArrowRight, TrendingUp, ShoppingCart, Store, ChevronRight, User, X, Package, Heart, Loader2, Zap, Lock, Utensils, ShoppingBasket, Apple, ShieldAlert, Shirt, Car, Settings, Wrench, Smartphone, Home, Sparkles, Coffee } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import ProfileWizardModal from '../components/ProfileWizardModal';
import { BUSINESS_TYPES } from '../../../config/businessTypes';
import { HeroShowcase } from '../components/HeroShowcase';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '106606679170-oheuro9l1qicfspsvsmf6c4ihuif2fq1.apps.googleusercontent.com';

export default function MarketplaceDirectory() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todas');
  const navigate = useNavigate();
  const location = useLocation();

  // Auth State
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('register');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', docId: '', phone: '', address: '' });
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Merchant Auth State
  const [isMerchantModalOpen, setIsMerchantModalOpen] = useState(false);
  const [merchantAuthMode, setMerchantAuthMode] = useState('register');
  const [merchantForm, setMerchantForm] = useState({ businessName: '', email: '', password: '' });
  const [merchantLoading, setMerchantLoading] = useState(false);

  // Pending store to visit after login
  const [pendingStoreSlug, setPendingStoreSlug] = useState(null);

  // Cart State
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [globalCart, setGlobalCart] = useState({});

  const loadGlobalCart = () => {
    try {
      setGlobalCart(JSON.parse(localStorage.getItem('ecommerce_global_cart') || '{}'));
    } catch(e) {}
  };

  useEffect(() => {
    fetch('http://localhost:3001/api/market/stores')
      .then(res => res.json())
      .then(data => {
        setStores(data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });

    const savedCustomer = localStorage.getItem('ecommerce_current_customer');
    if (savedCustomer) setCurrentCustomer(JSON.parse(savedCustomer));

    loadGlobalCart();
    window.addEventListener('cart_updated', loadGlobalCart);

    // Auto-open merchant register if navigated from Pricing
    if (location.state && location.state.openMerchantRegister) {
      setMerchantAuthMode('register');
      setIsMerchantModalOpen(true);
      // Opcional: const selectedPlan = location.state.selectedPlan;
      window.history.replaceState({}, document.title); // clear state to avoid reopening on refresh
    }

    return () => window.removeEventListener('cart_updated', loadGlobalCart);
  }, [location.state]);

  const totalCartItems = Object.values(globalCart).reduce((acc, store) => {
    return acc + Object.values(store.items).reduce((sum, item) => sum + item.quantity, 0);
  }, 0);

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3001/api/ecommerce/customers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error al registrarse');
        return;
      }
      const newUser = { ...data.user, orders: [] };
      localStorage.setItem('ecommerce_current_customer', JSON.stringify(newUser));
      localStorage.removeItem('activeWorkspace');
      setCurrentCustomer(newUser);
      setIsAuthModalOpen(false);
      
      if (pendingStoreSlug) {
        navigate(`/ecommerce/live/${pendingStoreSlug}`);
        setPendingStoreSlug(null);
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3001/api/ecommerce/customers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authForm.email, password: authForm.password })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Credenciales incorrectas');
        return;
      }
      const user = { ...data.user, orders: [] };
      localStorage.setItem('ecommerce_current_customer', JSON.stringify(user));
      localStorage.removeItem('activeWorkspace');
      setCurrentCustomer(user);
      setIsAuthModalOpen(false);
      
      if (pendingStoreSlug) {
        navigate(`/ecommerce/live/${pendingStoreSlug}`);
        setPendingStoreSlug(null);
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await fetch('http://localhost:3001/api/ecommerce/customers/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error al iniciar sesión con Google');
        return;
      }
      const user = { ...data.user, orders: [] };
      localStorage.setItem('ecommerce_current_customer', JSON.stringify(user));
      localStorage.removeItem('activeWorkspace');
      setCurrentCustomer(user);
      setIsAuthModalOpen(false);
      
      if (pendingStoreSlug) {
        navigate(`/ecommerce/live/${pendingStoreSlug}`);
        setPendingStoreSlug(null);
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión con el servidor');
    }
  };

  const handleMerchantLogin = async (e) => {
    e.preventDefault();
    setMerchantLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/workspaces/merchant/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: merchantForm.email, password: merchantForm.password })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Credenciales incorrectas');
        setMerchantLoading(false);
        return;
      }
      
      localStorage.setItem('activeWorkspace', data.id);
      localStorage.setItem('storeSlug', data.store_slug || '');
      
      setTimeout(() => {
        navigate('/ecommerce');
      }, 500);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error de conexión');
      setMerchantLoading(false);
    }
  };

  const handleMerchantRegister = async (e) => {
    e.preventDefault();
    setMerchantLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: merchantForm.businessName })
      });
      if (!res.ok) throw new Error('Error al crear la tienda virtual');
      const data = await res.json();
      
      const generatedSlug = merchantForm.businessName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      const configRes = await fetch(`http://localhost:3001/api/workspaces/${data.id}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          store_slug: generatedSlug,
          config: {
            business_type: 'viveres',
            modules: ['orders', 'inventory', 'analytics', 'product_studio'],
            categories: ['General'],
            expediente: {
              legalType: 'V',
              rif: 'V-00000000-0',
              state: 'Por definir',
              city: 'Por definir',
              whatsapp: '',
              instagram: ''
            },
            adminEmail: merchantForm.email,
            adminPassword: merchantForm.password
          }
        })
      });

      if (!configRes.ok) throw new Error('Error al configurar los módulos');

      localStorage.setItem('activeWorkspace', data.id);
      localStorage.setItem('storeSlug', generatedSlug);

      setTimeout(() => {
        navigate('/ecommerce');
      }, 1000);

    } catch (err) {
      console.error(err);
      alert(err.message || 'Error de conexión');
      setMerchantLoading(false);
    }
  };

  const handleRecoverPassword = async (e, type) => {
    e.preventDefault();
    const email = type === 'customer' ? authForm.email : merchantForm.email;
    if (!email) return alert('Por favor ingresa tu correo electrónico');
    try {
      const res = await fetch('http://localhost:3001/api/auth/recover-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error al solicitar recuperación');
        return;
      }
      alert(data.message + (data._devCode ? `\n\nCódigo de prueba: ${data._devCode}` : ''));
      if (type === 'customer') setAuthMode('reset');
      else setMerchantAuthMode('reset');
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const handleResetPassword = async (e, type) => {
    e.preventDefault();
    const email = type === 'customer' ? authForm.email : merchantForm.email;
    try {
      const res = await fetch('http://localhost:3001/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type, code: recoveryCode, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error al restablecer');
        return;
      }
      alert('Contraseña actualizada con éxito');
      setRecoveryCode('');
      setNewPassword('');
      if (type === 'customer') setAuthMode('login');
      else setMerchantAuthMode('login');
    } catch (err) {
      alert('Error de conexión');
    }
  };

  const isFavorite = (storeSlug) => {
    if (!currentCustomer || !currentCustomer.favorites) return false;
    try {
      const raw = currentCustomer.favorites;
      const favorites = Array.isArray(raw) ? raw : JSON.parse(raw || '[]');
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
    
    if (favorites.some(f => f.slug === store.slug)) {
      favorites = favorites.filter(f => f.slug !== store.slug);
    } else {
      favorites.push({ slug: store.slug, name: store.name });
    }
    
    const updatedUser = { ...currentCustomer, favorites };
    setCurrentCustomer(updatedUser);
    localStorage.setItem('ecommerce_current_customer', JSON.stringify(updatedUser));

    try {
      await fetch(`http://localhost:3001/api/ecommerce/customers/${currentCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updatedUser })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const categories = [
    { id: 'Todas', name: 'Todas', icon: Store },
    { id: 'General', name: 'General', icon: Store },
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
    (activeCategory === 'Todas' || (store.productCategories && store.productCategories.includes(activeCategory))) &&
    (store.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (store.description && store.description.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <div className="min-h-screen bg-black text-slate-50 font-sans selection:bg-amber-500/30 relative overflow-x-hidden">
      
      {/* Background ambient light */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-amber-500/5 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-500/5 blur-[120px] rounded-full -translate-x-1/4 translate-y-1/3"></div>
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-2xl border-b border-white/5 shadow-2xl">
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(245,158,11,0.3)] group-hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] transition-all">
              <ShoppingBag size={20} className="stroke-[2.5]" />
            </div>
            <span className="font-bold text-xl tracking-[0.2em] text-white">AXON<span className="text-amber-500 font-light">MARKET</span></span>
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
             <button onClick={() => window.location.href = '/superadmin'} className="hidden sm:flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-red-500 hover:text-red-400 transition-colors bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20">
               <ShieldAlert size={14} /> Admin
             </button>
             <button onClick={() => { setMerchantAuthMode('register'); setIsMerchantModalOpen(true); }} className="hidden sm:flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-zinc-400 hover:text-amber-500 transition-colors">
               <Store size={16} /> Vender
             </button>
             <div className="h-6 w-[1px] bg-white/10 hidden sm:block"></div>
             
             {currentCustomer ? (
               <button onClick={() => navigate('/ecommerce/live/profile')} className="hidden sm:flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-amber-500 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-full hover:bg-amber-500/20 transition-colors">
                 <User size={16}/> {currentCustomer.name}
               </button>
             ) : (
               <button onClick={() => { setAuthMode('login'); setIsAuthModalOpen(true); }} className="hidden sm:flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-zinc-400 hover:text-white transition-colors">
                 <User size={16} /> Entrar
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

      {/* Mobile Search */}
      <div className="md:hidden px-6 py-4 bg-zinc-950 border-b border-white/5 relative z-40">
        <div className="relative w-full group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={18} className="text-zinc-500" />
          </div>
          <input
            type="text"
            placeholder="Busca tiendas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-white/10 rounded-full py-3 pl-12 pr-6 text-white focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Hero Banner Minimalista Premium */}
      <div className="relative overflow-hidden min-h-[550px] flex items-center z-10 bg-gradient-to-b from-zinc-900/50 to-transparent">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.05)_0%,rgba(0,0,0,0)_50%)] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.02)_0%,transparent_100%)] pointer-events-none"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        
        <div className="max-w-[1400px] w-full mx-auto px-6 py-20 relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
           <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} className="max-w-2xl flex-1">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-amber-500 text-xs font-bold tracking-[0.2em] uppercase mb-8 backdrop-blur-md">
               <Star size={12} fill="currentColor" /> El Ecosistema Gastronómico
             </div>
             
             <h1 className="text-5xl sm:text-7xl font-light text-white mb-8 tracking-tighter leading-tight">
               Descubre <span className="font-normal text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-600">sabores locales</span> sin intermediarios.
             </h1>
             <p className="text-xl text-zinc-400 font-light leading-relaxed mb-12 max-w-2xl">
               La red descentralizada de comida rápida, víveres y productos frescos. Conecta directamente con comercios independientes en una experiencia de primer nivel.
             </p>

             <div className="flex flex-col sm:flex-row items-center gap-4">
               {currentCustomer ? (
                 <button onClick={() => navigate('/ecommerce/live/profile')} className="w-full sm:w-auto px-8 py-4 bg-white/5 text-white rounded-full text-xs font-bold tracking-[0.2em] uppercase border border-white/10 backdrop-blur-md hover:bg-white/10 hover:border-amber-500/50 transition-all flex items-center justify-center gap-3">
                   <User size={16} /> Ver mi Perfil
                 </button>
               ) : (
                 <button 
                   onClick={() => { setAuthMode('register'); setIsAuthModalOpen(true); }}
                   className="w-full sm:w-auto px-10 py-4 bg-white text-black rounded-full text-xs font-bold tracking-[0.2em] uppercase shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_60px_rgba(255,255,255,0.3)] transition-all hover:-translate-y-1 flex items-center justify-center gap-3"
                 >
                   <User size={16} /> Crear Cuenta
                 </button>
               )}
               <button 
                 onClick={() => {
                   setMerchantAuthMode('register');
                   setIsMerchantModalOpen(true);
                 }}
                 className="w-full sm:w-auto px-10 py-4 bg-amber-500 text-black rounded-full text-xs font-bold tracking-[0.2em] uppercase shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] transition-all hover:-translate-y-1 flex items-center justify-center gap-3"
               >
                 <Store size={16} /> Vender <Zap size={14} />
               </button>
             </div>
           </motion.div>
           
           <div className="flex-1 w-full hidden lg:block relative -mr-12">
             <HeroShowcase />
           </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-6 py-12 relative z-10">
        
        {/* Categories / Filters */}
        <div className="flex items-center gap-4 overflow-x-auto pb-8 scrollbar-hide mb-8 border-b border-white/5">
          {categories.map((cat) => {
             const Icon = cat.icon;
             const isActive = activeCategory === cat.id;
             return (
               <button 
                 key={cat.id}
                 onClick={() => setActiveCategory(cat.id)}
                 className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold tracking-widest uppercase transition-all whitespace-nowrap shrink-0 border ${
                   isActive 
                     ? 'bg-amber-500 text-black border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]' 
                     : 'bg-white/5 text-zinc-400 border-white/10 hover:bg-white/10 hover:text-white'
                 }`}
               >
                 <Icon size={16} /> {cat.name}
               </button>
             );
          })}
        </div>

        {/* Directory Grid */}
        <div className="relative min-h-[400px]">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-6"></div>
              <p className="text-zinc-500 text-xs font-bold tracking-[0.2em] uppercase">Sincronizando Nodos...</p>
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center bg-zinc-900/30 rounded-[3rem] border border-white/5 p-12 backdrop-blur-md">
              <Store size={48} className="mx-auto text-zinc-700 mb-6" />
              <h3 className="text-2xl text-white font-light mb-2">No encontramos resultados</h3>
              <p className="text-zinc-500 font-light">Intenta con otros términos o explora otra categoría.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredStores.map((store, idx) => (
                <motion.div
                  key={store.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="group relative bg-zinc-900/40 rounded-[2rem] border border-white/5 overflow-hidden transition-all duration-500 hover:border-amber-500/30 hover:bg-zinc-900/80 cursor-pointer flex flex-col hover:-translate-y-2"
                  onClick={() => {
                    if (!currentCustomer) {
                      setPendingStoreSlug(store.slug);
                      setAuthMode('login');
                      setIsAuthModalOpen(true);
                    } else {
                      navigate(`/ecommerce/live/${store.slug}`);
                    }
                  }}
                >
                  {/* Subtle glowing background on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-amber-500/0 group-hover:from-amber-500/5 group-hover:to-transparent transition-all duration-500 pointer-events-none"></div>

                  {/* Store Banner */}
                  <div className="h-56 w-full relative bg-zinc-950 overflow-hidden">
                    {store.heroUrl ? (
                      <img src={`http://localhost:3001${store.heroUrl}`} alt="Cover" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center group-hover:scale-110 transition-transform duration-700">
                        <Store size={40} className="text-zinc-700" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent opacity-90"></div>
                    
                    <div className="absolute top-4 right-4 flex gap-2 z-10">
                      <span className="bg-black/60 backdrop-blur-md text-white border border-white/10 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full flex items-center gap-1">
                        <TrendingUp size={12} className="text-amber-500" /> Top
                      </span>
                      <button 
                        onClick={(e) => toggleFavorite(e, store)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all backdrop-blur-md border ${
                          isFavorite(store.slug) ? 'bg-red-500/20 border-red-500/30 text-red-500' : 'bg-black/60 border-white/10 text-zinc-400 hover:text-red-500 hover:border-red-500/30'
                        }`}
                      >
                        <Heart size={16} fill={isFavorite(store.slug) ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>

                  {/* Store Details */}
                  <div className="p-8 pt-0 relative flex-grow flex flex-col z-10">
                    <div className="relative -mt-12 mb-6 w-24 h-24 bg-zinc-950 rounded-[1.5rem] shadow-2xl border border-white/10 p-1 flex items-center justify-center overflow-hidden group-hover:border-amber-500/30 transition-colors duration-500">
                      <div className="w-full h-full bg-zinc-900 rounded-[1.2rem] flex items-center justify-center overflow-hidden">
                        {store.logoUrl ? (
                          <img src={`http://localhost:3001${store.logoUrl}`} alt={store.name} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-3xl font-black text-amber-500 uppercase">{store.name.charAt(0)}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="mb-6 flex-grow">
                      <h3 className="text-2xl font-normal text-white mb-2 group-hover:text-amber-400 transition-colors line-clamp-1">{store.name}</h3>
                      <p className="text-zinc-400 text-sm font-light line-clamp-2 leading-relaxed">{store.description}</p>
                    </div>
                    
                    <div className="pt-6 flex items-center justify-between border-t border-white/5">
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star size={14} fill="currentColor" />
                        <Star size={14} fill="currentColor" />
                        <Star size={14} fill="currentColor" />
                        <Star size={14} fill="currentColor" />
                        <Star size={14} fill="currentColor" />
                      </div>
                      {currentCustomer ? (
                        <span className="flex items-center gap-1 text-xs font-bold tracking-[0.2em] uppercase text-amber-500 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                          Entrar <ArrowRight size={14} />
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 text-xs font-bold tracking-[0.2em] uppercase text-zinc-500">
                          <Lock size={12} /> Login
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-zinc-950 border-t border-white/5 mt-20 relative z-10">
        <div className="max-w-[1400px] mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-black">
               <ShoppingBag size={16} className="stroke-[2.5]"/>
             </div>
             <span className="font-bold text-lg tracking-[0.3em] text-white">AXON<span className="text-amber-500 font-light">MARKET</span></span>
           </div>
           <p className="text-zinc-500 font-light text-xs tracking-wider uppercase">© {new Date().getFullYear()} Axon SaaS. Ecosistema Descentralizado.</p>
        </div>
      </footer>

      {/* Cart Slide-over */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 200 }}
              className="bg-zinc-950 border-l border-white/10 w-full max-w-md h-full relative z-10 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/50">
                <h2 className="text-xl font-light text-white flex items-center gap-3 tracking-wide">
                  <ShoppingCart className="text-amber-500" size={20} />
                  Mis <strong className="font-bold">Carritos</strong>
                </h2>
                <button onClick={() => setIsCartOpen(false)} className="text-zinc-500 hover:text-white hover:bg-white/10 rounded-full p-2 transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                {Object.keys(globalCart).length === 0 ? (
                  <div className="text-center py-32 flex flex-col items-center">
                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                      <ShoppingBag size={40} className="text-zinc-600" />
                    </div>
                    <h3 className="text-xl font-light text-white mb-2 tracking-wide">Tu carrito está vacío</h3>
                    <p className="text-zinc-500 font-light mb-8 max-w-[200px]">El ecosistema está lleno de productos increíbles.</p>
                    <button onClick={() => setIsCartOpen(false)} className="px-8 py-3 bg-white text-black rounded-full text-xs font-bold tracking-[0.2em] uppercase hover:bg-zinc-200 transition-colors">Explorar</button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(globalCart).map(([storeSlug, storeData]) => (
                      <div key={storeSlug} className="bg-zinc-900/50 rounded-3xl p-5 border border-white/5 hover:border-amber-500/20 transition-all">
                        <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-4">
                          <h4 className="font-bold text-white flex items-center gap-2"><Store size={16} className="text-amber-500"/> {storeData.storeName}</h4>
                          <button onClick={() => {
                            const gc = {...globalCart};
                            delete gc[storeSlug];
                            setGlobalCart(gc);
                            localStorage.setItem('ecommerce_global_cart', JSON.stringify(gc));
                            window.dispatchEvent(new Event('cart_updated'));
                          }} className="text-xs text-red-400 hover:text-red-300 font-bold tracking-wider uppercase transition-colors">Vaciar</button>
                        </div>
                        <div className="space-y-4">
                          {Object.values(storeData.items).map(item => (
                            <div key={item.id} className="flex gap-4">
                              <div className="w-16 h-16 bg-zinc-950 rounded-2xl border border-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                {item.imageUrl ? (
                                  <img src={`http://localhost:3001${item.imageUrl}`} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Package size={20} className="text-zinc-600" />
                                )}
                              </div>
                              <div className="flex-1 flex flex-col justify-center">
                                <h5 className="text-sm font-normal text-zinc-300 line-clamp-1 mb-1">{item.name}</h5>
                                <div className="text-amber-500 font-bold text-sm tracking-wide">${item.price.toFixed(2)} <span className="text-zinc-600 font-normal ml-1">x {item.quantity}</span></div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => navigate(`/ecommerce/live/${storeSlug}`)} className="w-full mt-6 py-4 bg-white/5 text-white rounded-2xl text-xs font-bold tracking-[0.2em] uppercase border border-white/10 hover:bg-amber-500 hover:border-amber-500 hover:text-black hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all flex items-center justify-center gap-2">
                          Completar Pedido <ArrowRight size={14} />
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

      {/* Auth Modal (Ultra Premium) */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsAuthModalOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
              className="bg-zinc-950 rounded-[3rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-md relative z-10 overflow-hidden border border-white/10"
            >
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
                        <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Código de 6 dígitos</label>
                        <input type="text" required value={recoveryCode} onChange={e => setRecoveryCode(e.target.value)} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="123456" />
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
                    <input type="password" required value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="••••••••" />
                  </div>

                  {authMode === 'login' && (
                    <div className="flex justify-end">
                      <button type="button" onClick={() => setAuthMode('recover')} className="text-xs text-amber-500 hover:text-amber-400 transition-colors">
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                  )}

                  <button type="submit" className="w-full bg-amber-500 text-black rounded-full py-4 text-xs font-bold tracking-[0.2em] uppercase hover:bg-amber-400 transition-colors mt-8 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Merchant Registration Modal (Ultra Premium) */}
      <AnimatePresence>
        {isMerchantModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => !merchantLoading && setIsMerchantModalOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5 }}
              className="bg-zinc-950 rounded-[3rem] shadow-[0_0_80px_rgba(245,158,11,0.15)] w-full max-w-lg relative z-10 overflow-hidden border border-amber-500/20"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-amber-600"></div>
              
              <div className="p-8 pb-6 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
                      <Store size={24} className="text-amber-500" />
                    </div>
                    <h2 className="text-3xl font-light text-white tracking-tight">
                      {merchantAuthMode === 'register' ? 'Inicia tu Imperio' : merchantAuthMode === 'login' ? 'Panel Central' : 'Recuperar Acceso'}
                    </h2>
                  </div>
                  <p className="text-zinc-500 font-light text-sm mt-4">
                    {merchantAuthMode === 'register' ? 'Crea tu tienda y únete a la red comercial más avanzada.' : 'Accede a tu infraestructura de ventas.'}
                  </p>
                </div>
                <button onClick={() => !merchantLoading && setIsMerchantModalOpen(false)} className="text-zinc-500 hover:text-white hover:bg-white/10 rounded-full p-2 transition-colors self-start">
                  <X size={20} />
                </button>
              </div>

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

              {merchantAuthMode === 'recover' || merchantAuthMode === 'reset' ? (
                <form onSubmit={(e) => merchantAuthMode === 'recover' ? handleRecoverPassword(e, 'merchant') : handleResetPassword(e, 'merchant')} className="p-8 pt-4 space-y-5">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Correo Electrónico Administrador</label>
                    <input type="email" required value={merchantForm.email} onChange={e => setMerchantForm({...merchantForm, email: e.target.value})} disabled={merchantAuthMode === 'reset'} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="admin@empresa.com" />
                  </div>
                  {merchantAuthMode === 'reset' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Código de 6 dígitos</label>
                        <input type="text" required value={recoveryCode} onChange={e => setRecoveryCode(e.target.value)} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="123456" />
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
              ) : (
                <form onSubmit={merchantAuthMode === 'register' ? handleMerchantRegister : handleMerchantLogin} className="p-8 pt-4 space-y-5">
                  {merchantAuthMode === 'register' && (
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Nombre del Negocio</label>
                      <input type="text" required value={merchantForm.businessName} onChange={e => setMerchantForm({...merchantForm, businessName: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="Ej. Inversiones San José" />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Correo Electrónico</label>
                    <input type="email" required value={merchantForm.email} onChange={e => setMerchantForm({...merchantForm, email: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="admin@empresa.com" />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 mb-2 uppercase tracking-widest">Contraseña Administrativa</label>
                    <input type="password" required value={merchantForm.password} onChange={e => setMerchantForm({...merchantForm, password: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-amber-500/50 transition-colors font-light placeholder-zinc-700" placeholder="••••••••" />
                  </div>

                  {merchantAuthMode === 'login' && (
                    <div className="flex justify-end mt-2">
                      <button type="button" onClick={() => setMerchantAuthMode('recover')} className="text-[10px] text-amber-500 hover:text-amber-400 font-bold uppercase tracking-wider transition-colors">
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={merchantLoading || (merchantAuthMode === 'register' && !merchantForm.businessName) || !merchantForm.email}
                    className="w-full bg-amber-500 text-black rounded-full py-4 mt-4 font-bold text-xs tracking-[0.2em] uppercase transition-all shadow-[0_0_30px_rgba(245,158,11,0.2)] hover:bg-amber-400 hover:shadow-[0_0_40px_rgba(245,158,11,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    {merchantLoading ? (
                      <><Loader2 className="animate-spin" size={18} /> Procesando...</>
                    ) : (
                      <>{merchantAuthMode === 'register' ? 'Inicializar Instancia' : 'Acceder al ERP'} <ArrowRight size={16} /></>
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ProfileWizardModal 
        isOpen={isWizardOpen} 
        onClose={() => setIsWizardOpen(false)} 
        customer={currentCustomer}
        canClose={false}
        onComplete={(updatedCustomer) => {
          localStorage.setItem('ecommerce_current_customer', JSON.stringify(updatedCustomer));
          setCurrentCustomer(updatedCustomer);
          setIsWizardOpen(false);
          if (pendingStoreSlug) {
            navigate(`/ecommerce/live/${pendingStoreSlug}`);
            setPendingStoreSlug(null);
          }
        }} 
      />
    </div>
    </GoogleOAuthProvider>
  );
}
