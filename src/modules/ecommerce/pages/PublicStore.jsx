import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, LayoutTemplate, Image as ImageIcon, Calculator, ChevronRight, Heart, X, Plus, Minus, ShoppingBag, ArrowLeft, Lock, Store, User, Zap, Package, ArrowRight, Loader2, Tag, Pen, Smartphone, UploadCloud, ShieldCheck, Hash, MapPin, Map, CreditCard, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import ProfileWizardModal from '../components/ProfileWizardModal';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '106606679170-oheuro9l1qicfspsvsmf6c4ihuif2fq1.apps.googleusercontent.com';

export default function PublicStore() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [workspaceId, setWorkspaceId] = useState(null);
  const [storeNotFound, setStoreNotFound] = useState(false);
  const [config, setConfig] = useState(null);
  const [authGateMode, setAuthGateMode] = useState('login');
  const [currentPage, setCurrentPage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('page') || 'home';
  });
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['Todas']);
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [bcvRate, setBcvRate] = useState(36.50);
  const [cart, setCart] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const [isCheckoutMode, setIsCheckoutMode] = useState(false);
  const [checkoutAddress, setCheckoutAddress] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [discountError, setDiscountError] = useState('');
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptUrl, setReceiptUrl] = useState(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentBank, setPaymentBank] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');

  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', docId: '', phone: '', address: '' });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', docId: '', phone: '', address: '' });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalQty, setModalQty] = useState(1);
  const [authLoading, setAuthLoading] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [productReviews, setProductReviews] = useState([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSent, setReviewSent] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const trackEvent = async (eventType, wid) => {
    try {
      const activeWId = wid || workspaceId;
      if (!activeWId) return;
      await fetch('http://localhost:3001/api/ecommerce/track', {
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
    const savedCustomer = localStorage.getItem('ecommerce_current_customer');
    if (savedCustomer) setCurrentCustomer(JSON.parse(savedCustomer));
  }, []);

  const isStoreClosed = () => {
    if (!config?.scheduleProfile?.scheduleActive) return false;
    const { workDays, openTime, closeTime } = config.scheduleProfile;
    if (!workDays || !openTime || !closeTime) return false;
    
    const currentDayIdx = new Date().getDay();
    const daysMap = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const currentDayName = daysMap[currentDayIdx];
    
    if (!workDays[currentDayName]) return true;
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    
    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);
    
    const currentMins = currentHour * 60 + currentMin;
    const openMins = openH * 60 + openM;
    const closeMins = closeH * 60 + closeM;
    
    if (currentMins < openMins || currentMins > closeMins) return true;
    
    return false;
  };

  const storeClosed = isStoreClosed();

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/ecommerce/customers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error al registrarse');
        setAuthLoading(false);
        return false;
      }
      const newUser = { ...data.user, orders: [] };
      localStorage.setItem('ecommerce_current_customer', JSON.stringify(newUser));
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

  const handleCheckoutSubmit = async () => {
    if (!currentCustomer) {
      alert("Por favor inicia sesión o regístrate para comprar");
      setAuthGateMode('login');
      setIsCartOpen(false);
      return;
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
      workspaceId,
      customerId: currentCustomer.id,
      customer: currentCustomer.name,
      customerEmail: currentCustomer.email,
      address: checkoutAddress,
      discount_code: appliedDiscount ? appliedDiscount.code : null,
      total: finalTotal,
      items: orderItems,
      status: 'Pendiente',
      paymentMethod: selectedPaymentMethod,
      paymentStatus: selectedPaymentMethod === 'cash' ? 'approved' : 'pending',
      paymentDetails: {
        capture: receiptUrl,
        ref: paymentReference,
        bank: selectedPaymentMethod === 'zelle' ? 'Zelle' : paymentBank,
        phone: currentCustomer.phone || '',
        docId: currentCustomer.docId || '',
        address: checkoutAddress
      },
      shippingInfo: {
         cost: isFreeShipping ? 0 : flatRate
      },
      workspace_id: workspaceId
    };

    try {
      const res = await fetch('http://localhost:3001/api/ecommerce/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      if (res.ok) {
        alert("¡Pedido realizado con éxito!");
        setCart({});
        setIsCartOpen(false);
        setIsCheckoutMode(false);
        setAppliedDiscount(null);
        setDiscountCode('');
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
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if(data.url) {
        setReceiptUrl(data.url);
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
      const res = await fetch('http://localhost:3001/api/ecommerce/customers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authForm.email, password: authForm.password })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Credenciales incorrectas');
        setAuthLoading(false);
        return false;
      }
      const user = { ...data.user, orders: [] };
      localStorage.setItem('ecommerce_current_customer', JSON.stringify(user));
      setCurrentCustomer(user);
      
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
      const res = await fetch('http://localhost:3001/api/ecommerce/customers/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error al iniciar sesión con Google');
        setAuthLoading(false);
        return;
      }
      const user = { ...data.user, orders: [] };
      localStorage.setItem('ecommerce_current_customer', JSON.stringify(user));
      setCurrentCustomer(user);
      
      setShowAuthModal(false);
    } catch (err) {
      console.error(err);
      alert('Error de conexión con el servidor');
    }
    setAuthLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('ecommerce_current_customer');
    setCurrentCustomer(null);
    setCurrentPage('home');
  };

  const isWishlisted = (productId) => {
    if (!currentCustomer) return false;
    const wishlist = Array.isArray(currentCustomer.wishlist) ? currentCustomer.wishlist : (
      typeof currentCustomer.wishlist === 'string' ? JSON.parse(currentCustomer.wishlist || '[]') : []
    );
    return wishlist.some(p => p.productId === productId);
  };

  const toggleWishlist = async (e, p) => {
    e.stopPropagation();
    if (!currentCustomer) return;
    
    let wishlist = Array.isArray(currentCustomer.wishlist) ? currentCustomer.wishlist : (
      typeof currentCustomer.wishlist === 'string' ? JSON.parse(currentCustomer.wishlist || '[]') : []
    );
    
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
      await fetch(`http://localhost:3001/api/ecommerce/customers/${currentCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser)
      });
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

  const addToCart = (productId, stepSize) => {
    if (!isProfileComplete(currentCustomer)) {
      setIsWizardOpen(true);
      return;
    }
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const currentQty = cart[productId] || 0;
    const addedQty = Number(stepSize || 1);
    const available = product.stock_vitrina || 0;
    
    if (currentQty + addedQty > available) {
      alert(`Solo quedan ${available} unidades disponibles en vitrina.`);
      return;
    }

    setCart(prev => {
      const newCart = {
        ...prev,
        [productId]: currentQty + addedQty
      };
      syncGlobalCart(newCart);
      return newCart;
    });
    trackEvent('add_to_cart');
  };

  const fetchProductReviews = async (productId, currentWorkspace) => {
    try {
      const res = await fetch(`http://localhost:3001/api/ecommerce/reviews?workspaceId=${currentWorkspace}`);
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
      const res = await fetch('http://localhost:3001/api/ecommerce/reviews', {
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

  const addModalToCart = () => {
    if (!isProfileComplete(currentCustomer)) {
      setIsWizardOpen(true);
      return;
    }
    if (!selectedProduct) return;
    
    const currentQty = cart[selectedProduct.id] || 0;
    const available = selectedProduct.stock_vitrina || 0;
    
    if (currentQty + modalQty > available) {
      alert(`Solo quedan ${available} unidades disponibles en vitrina.`);
      return;
    }

    setCart(prev => {
      const newCart = { ...prev, [selectedProduct.id]: currentQty + modalQty };
      syncGlobalCart(newCart);
      return newCart;
    });
    trackEvent('add_to_cart');
    setSelectedProduct(null);
  };

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;
    setIsValidatingDiscount(true);
    setDiscountError('');
    try {
      const res = await fetch(`http://localhost:3001/api/ecommerce/promotions/validate`, {
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
      const defaultTexts = {
        banner: '¡Envíos gratis en compras mayores a $100!', nav1: 'Inicio', nav2: 'Catálogo', nav3: 'Ofertas',
        heroTitle: 'Descubre la nueva colección', heroSub: 'Productos exclusivos diseñados para ti.', heroBtn: 'Comprar Ahora',
        sectionTitle: 'Novedades', catalogTitle: 'Catálogo de Productos', offersTitle: 'Ofertas Flash', footerText: '© 2026 Todos los derechos reservados.',
        newsletterTitle: 'Únete a nuestro boletín', newsletterSub: 'Recibe ofertas exclusivas en tu correo.', testimonialsTitle: 'Lo que dicen nuestros clientes'
      };

      try {
        const res = await fetch(`http://localhost:3001/api/workspaces/store/${slug || 'tienda-ejemplo'}`);
        if (!res.ok) {
          const savedStr = localStorage.getItem('storefrontConfig');
          if (savedStr) {
             const saved = JSON.parse(savedStr);
             saved.texts = { ...defaultTexts, ...(saved.texts || {}) };
             setConfig(saved);
             setWorkspaceId('default_workspace');
             const pRes = await fetch(`http://localhost:3001/api/ecommerce/products?workspaceId=default_workspace`);
             if (pRes.ok) {
               const pData = await pRes.json();
               const published = pData
                 .filter(p => p.publish_status === 'Publicado')
                 .sort((a, b) => {
                    const aStock = a.stock_vitrina || 0;
                    const bStock = b.stock_vitrina || 0;
                    if (aStock > 0 && bStock <= 0) return -1;
                    if (aStock <= 0 && bStock > 0) return 1;
                    return 0;
                 });
               setProducts(published);
               const cats = new Set(published.map(p => p.category || 'Sin Categoría'));
               setCategories(['Todas', ...Array.from(cats)]);
             }
             return;
          }
          setStoreNotFound(true);
          return;
        }
        
        const storeData = await res.json();
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
        
        saved.business_name = storeData.name;
        setConfig(saved);
        trackEvent('visit', storeData.id);

        const pRes = await fetch(`http://localhost:3001/api/ecommerce/products?workspaceId=${storeData.id}`);
        if (pRes.ok) {
          const pData = await pRes.json();
          const published = pData
             .filter(p => p.publish_status === 'Publicado')
             .sort((a, b) => {
                const aStock = a.stock_vitrina || 0;
                const bStock = b.stock_vitrina || 0;
                if (aStock > 0 && bStock <= 0) return -1;
                if (aStock <= 0 && bStock > 0) return 1;
                return 0;
             });
          setProducts(published);
          const cats = new Set(published.map(p => p.category || 'Sin Categoría'));
          setCategories(['Todas', ...Array.from(cats)]);
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
        <button onClick={() => navigate('/ecommerce/live')} className="mt-4 px-6 py-3 bg-white/5 border border-white/10 rounded-full text-sm hover:bg-white/10 transition-colors">Volver al Directorio</button>
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
  const isTransparentHeader = headerStyle === 'transparent' && currentPage === 'home' && sections[0]?.type === 'hero';

  // Modo Administrador
  const isMerchantOwner = localStorage.getItem('activeWorkspace') === workspaceId;

  // Auth Gate
  const isUserAllowedToSeePrices = currentCustomer || isMerchantOwner;

  const renderAuthModal = () => {
    if (!showAuthModal) return null;
    const storeName = config?.business_name || slug || 'la tienda';
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.4 }}
          className="w-full max-w-md bg-zinc-950/90 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] p-8 overflow-hidden relative"
        >
          <button onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-2 transition-colors z-20"><X size={20}/></button>
          <div className="absolute top-0 left-0 w-full h-1" style={{ background: `linear-gradient(90deg, transparent, ${primaryColor}, transparent)` }}></div>
          
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 rounded-[24px] flex items-center justify-center border border-white/10 relative group">
              <div className="absolute inset-0 blur-xl opacity-30 group-hover:opacity-50 transition-opacity" style={{ backgroundColor: primaryColor }}></div>
              <Lock size={32} className="text-white relative z-10" />
            </div>
          </div>

          <h1 className="text-2xl font-light text-white text-center mb-2 tracking-tight">Accede Privado</h1>
          <p className="text-zinc-400 text-center text-sm font-light mb-8">
            Inicia sesión o regístrate para acceder a los precios exclusivos de <span className="text-white font-normal capitalize">{storeName}</span>.
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
              <input type="password" required value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none transition-colors font-light placeholder-zinc-700 focus:bg-zinc-800" placeholder="••••••••" onFocus={(e) => e.target.style.borderColor = primaryColor} onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}/>
            </div>
            <button
              type="submit" disabled={authLoading}
              className="w-full py-4 text-black font-bold text-xs tracking-[0.2em] uppercase rounded-full transition-all hover:-translate-y-0.5 mt-4 flex items-center justify-center gap-2"
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
        </motion.div>
      </div>
    );
  };

  const recentProducts = products.slice(0, 8);
  const offerProducts = products.filter(p => !!p.is_offer);
  const catalogProducts = activeCategory === 'Todas' ? products : products.filter(p => p.category === activeCategory);
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
            onClick={() => navigate('/ecommerce')} 
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

      {showBanner && (
        <div className="w-full text-center text-black font-bold py-2 text-xs uppercase tracking-wider z-50 relative shadow-[0_0_15px_rgba(0,0,0,0.5)]" style={{ backgroundColor: primaryColor }}>
          {texts.banner}
        </div>
      )}

      {/* Navbar (Premium Glassmorphism) */}
      <nav className={`z-40 transition-all duration-300 px-6 md:px-12 py-5 sticky top-0 ${
        isTransparentHeader ? 'bg-gradient-to-b from-black/80 to-transparent border-none' : 'bg-zinc-950/80 backdrop-blur-2xl border-b border-white/5 shadow-2xl'
      }`}>
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setCurrentPage('home')}>
            {logoUrl ? (
              <div className="h-10 w-auto bg-white/5 rounded-xl border border-white/10 p-1 backdrop-blur-md">
                 <img src={`http://localhost:3001${logoUrl}`} alt="Logo" className="h-full w-auto object-contain rounded-lg" />
              </div>
            ) : (
              <span className={`text-2xl font-black tracking-tight text-white`}>
                {config.business_name || 'MI TIENDA'}
              </span>
            )}
            
            {/* Store Status Indicator */}
            {config?.scheduleProfile?.scheduleActive && (
              <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border ${storeClosed ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                <div className={`w-2 h-2 rounded-full ${storeClosed ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`}></div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold leading-none uppercase tracking-wider">{storeClosed ? 'Cerrado' : 'Abierto'}</span>
                  <span className="text-[8px] opacity-70 leading-none mt-0.5">{config.scheduleProfile.openTime} - {config.scheduleProfile.closeTime}</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-bold tracking-widest uppercase">
            <span onClick={() => setCurrentPage('home')} className="cursor-pointer transition-colors" style={{ color: currentPage === 'home' ? primaryColor : '#71717a' }}>{texts.nav1}</span>
            <span onClick={() => setCurrentPage('catalog')} className="cursor-pointer transition-colors hover:text-white" style={{ color: currentPage === 'catalog' ? primaryColor : '#71717a' }}>{texts.nav2}</span>
            <span onClick={() => setCurrentPage('offers')} className="cursor-pointer transition-colors hover:text-white" style={{ color: currentPage === 'offers' ? primaryColor : '#71717a' }}>{texts.nav3}</span>
          </div>
          
          <div className="flex items-center gap-6">
             <button onClick={() => navigate('/ecommerce/live')} className="hidden sm:flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-zinc-400 hover:text-white transition-colors">
               <ArrowLeft size={16} /> Salir
             </button>
             <div className="h-4 w-[1px] bg-white/10 hidden sm:block"></div>
             
             {!currentCustomer && !isMerchantOwner ? (
               <button onClick={() => setShowAuthModal(true)} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full transition-colors border border-white/5 hover:border-white/20">
                 <User size={14} /> Ingresar
               </button>
             ) : (
               <button onClick={() => setIsCartOpen(true)} className="relative p-2 text-zinc-400 hover:text-white transition-all group">
                 <div className="absolute inset-0 rounded-full scale-0 group-hover:scale-100 transition-transform blur-md opacity-20" style={{ backgroundColor: primaryColor }}></div>
                 <ShoppingBag size={22} className="relative z-10" />
                 {totalCartItems > 0 && (
                   <span className="absolute top-0 right-0 w-4 h-4 text-black text-[9px] font-black flex items-center justify-center rounded-full border border-zinc-950 z-20 shadow-md" style={{ backgroundColor: primaryColor }}>
                     {totalCartItems}
                   </span>
                 )}
               </button>
             )}
          </div>
        </div>
      </nav>

      {/* Pages */}
      <div className="flex-1 flex flex-col relative z-10">
        
        {/* INICIO */}
        {currentPage === 'home' && (
          <div className="flex-1 flex flex-col w-full">
            {sections.map((section, idx) => {
              if (section.type === 'hero') {
                return (
                  <div key={section.id} className="relative overflow-hidden min-h-[500px] md:min-h-[700px] flex items-center justify-center text-center px-6">
                    {heroUrl ? (
                      <div className="absolute inset-0 z-0">
                        <img src={`http://localhost:3001${heroUrl}`} alt="Cover" className="w-full h-full object-cover opacity-40 scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 z-0 bg-zinc-950">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                      </div>
                    )}
                    
                    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
                      <h1 className={`${headingWeight} text-5xl md:text-7xl lg:text-8xl text-white mb-6 tracking-tighter leading-tight drop-shadow-2xl`}>
                        {texts.heroTitle}
                      </h1>
                      <p className="text-lg md:text-2xl text-zinc-300 font-light max-w-2xl mb-12 opacity-90 drop-shadow-md">
                        {texts.heroSub}
                      </p>
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <button 
                          onClick={() => setCurrentPage('catalog')}
                          className={`px-10 py-5 text-black font-bold tracking-[0.2em] uppercase rounded-full transition-all hover:scale-105 hover:-translate-y-1 flex items-center gap-3`}
                          style={{ backgroundColor: primaryColor, boxShadow: `0 10px 40px ${primaryColor}40` }}
                        >
                          {texts.heroBtn} <ArrowRight size={18} />
                        </button>
                        
                        {config?.location && config.location.lat && (
                          <button 
                            onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${config.location.lat},${config.location.lng}`, '_blank')}
                            className="px-10 py-5 bg-white/10 backdrop-blur-md text-white font-bold tracking-[0.2em] uppercase rounded-full transition-all hover:bg-white/20 border border-white/20 flex items-center gap-3"
                          >
                            <MapPin size={18} /> Cómo Llegar
                          </button>
                        )}
                      </div>
                    </motion.div>
                  </div>
                );
              }

              if (section.type === 'featured') {
                return (
                  <div key={section.id} className="px-6 md:px-12 py-24 max-w-[1400px] mx-auto w-full">
                    <div className="flex items-end justify-between mb-12">
                      <h2 className={`${headingWeight} text-3xl md:text-5xl text-white tracking-tight`}>{texts.sectionTitle}</h2>
                      <button onClick={() => setCurrentPage('catalog')} className="text-sm font-bold uppercase tracking-widest hidden md:flex items-center gap-2 hover:opacity-80 transition-opacity" style={{ color: primaryColor }}>
                        Ver Todo <ArrowRight size={14} />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                      {recentProducts.length > 0 ? recentProducts.map((p, i) => (
                        <motion.div 
                          key={p.id}
                          initial={{ opacity: 0, y: 30 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6, delay: i * 0.1 }}
                          onClick={() => { if ((p.stock_vitrina || 0) > 0) openProductModal(p); }}
                          className={`group relative flex flex-col bg-zinc-900/40 rounded-[2rem] border border-white/5 overflow-hidden transition-all duration-500 hover:bg-zinc-900/80 hover:-translate-y-2 ${(p.stock_vitrina || 0) <= 0 ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                           <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/0 group-hover:from-white/5 group-hover:to-transparent transition-all duration-500 pointer-events-none"></div>
                           
                           <div className="w-full aspect-square bg-zinc-950 relative overflow-hidden p-6">
                             {p.image_url ? (
                               <img src={`http://localhost:3001${p.image_url}`} alt={p.name} className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110" />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center text-zinc-800 transition-transform duration-700 group-hover:scale-110">
                                 <ImageIcon size={64} />
                               </div>
                             )}
                             <button 
                               onClick={(e) => toggleWishlist(e, p)}
                               className={`absolute top-4 right-4 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all backdrop-blur-md border ${
                                 isWishlisted(p.id) ? 'bg-red-500/20 border-red-500/30 text-red-500' : 'bg-black/60 border-white/10 text-zinc-400 hover:text-red-500 hover:border-red-500/30'
                               }`}
                             >
                               <Heart size={18} fill={isWishlisted(p.id) ? 'currentColor' : 'none'} />
                             </button>
                             
                             {isMerchantOwner && (
                               <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); navigate(`/ecommerce/product-studio/${p.id}`); }}
                                   className="bg-amber-500 text-black font-black uppercase tracking-widest text-[10px] px-5 py-2.5 rounded-full flex items-center gap-2 shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:scale-110 transition-transform"
                                 >
                                   <Pen size={14} /> Editar
                                 </button>
                               </div>
                             )}

                             {(p.stock_vitrina || 0) <= 0 && (
                               <div className="absolute top-4 left-4 bg-red-600/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-red-500/50 z-30">Agotado en Vitrina</div>
                             )}
                             {p.is_offer && p.stock > 0 && (
                               <div className="absolute top-4 left-4 bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full flex items-center gap-1 shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                                 <Tag size={10} /> Oferta
                               </div>
                             )}
                           </div>
                           
                           <div className="p-6 pt-4 flex-1 flex flex-col z-10 border-t border-white/5">
                             <p className="font-normal text-zinc-400 text-xs mb-1 tracking-wider uppercase line-clamp-1">{p.category || 'General'}</p>
                             <p className="font-light text-white text-lg line-clamp-1 mb-1 group-hover:text-white/80 transition-colors">{p.name}</p>
                             <div className="flex items-center gap-1.5 mb-2">
                               <div className="flex gap-0.5">
                                 {[1, 2, 3, 4, 5].map(star => (
                                   <Star key={star} size={10} className={star <= (p.avg_rating || 0) ? 'fill-amber-400 text-amber-400' : 'fill-white/10 text-transparent'} />
                                 ))}
                               </div>
                               <span className="text-[10px] text-zinc-500 font-bold">({p.review_count || 0})</span>
                             </div>
                             <div className="mt-auto pt-2 flex items-center justify-between">
                               <div>
                                 {isUserAllowedToSeePrices ? (
                                   p.is_offer && p.discount_price ? (
                                     <div className="flex items-end gap-2">
                                       <p className="font-bold text-xl text-amber-400">${Number(p.discount_price).toFixed(2)}</p>
                                       <p className="text-zinc-500 text-sm line-through">${Number(p.price).toFixed(2)}</p>
                                     </div>
                                   ) : (
                                     <p className="font-bold text-xl" style={{ color: primaryColor }}>${Number(p.price).toFixed(2)}</p>
                                   )
                                 ) : (
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); setShowAuthModal(true); }}
                                     className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors border border-white/5"
                                   >
                                     <Lock size={12} /> Ver Precio
                                   </button>
                                 )}
                               </div>
                               {isUserAllowedToSeePrices && (p.stock_vitrina || 0) > 0 && (
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); if (!storeClosed) addToCart(p.id, p.step_size || 1); }}
                                   className={`w-10 h-10 rounded-full flex items-center justify-center text-black transition-all ${storeClosed ? 'bg-zinc-600 opacity-100 cursor-not-allowed' : 'opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0'}`}
                                   style={{ backgroundColor: storeClosed ? '#52525b' : primaryColor }}
                                   title={storeClosed ? 'Tienda Cerrada' : 'Agregar al carrito'}
                                 >
                                   {storeClosed ? <X size={18} /> : <Plus size={18} />}
                                 </button>
                               )}
                             </div>
                           </div>
                        </motion.div>
                      )) : (
                        <div className="col-span-full py-20 text-center text-zinc-500 border border-white/5 border-dashed rounded-3xl">No hay productos destacados.</div>
                      )}
                    </div>
                  </div>
                );
              }

              if (section.type === 'newsletter') {
                return (
                  <div key={section.id} className="border-t border-white/5 py-24 px-6 relative overflow-hidden bg-zinc-950">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] blur-[150px] opacity-10 pointer-events-none" style={{ backgroundColor: primaryColor }}></div>
                    <div className="max-w-3xl mx-auto text-center relative z-10">
                      <h2 className={`${headingWeight} text-white mb-6 text-4xl md:text-5xl tracking-tight`}>{texts.newsletterTitle}</h2>
                      <p className="text-zinc-400 font-light mb-10 text-lg md:text-xl">{texts.newsletterSub}</p>
                      <div className="flex flex-col sm:flex-row max-w-xl mx-auto gap-2">
                         <input type="email" placeholder="tu@correo.com" className="flex-1 px-6 py-4 bg-zinc-900 border border-white/10 rounded-full text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 transition-colors font-light" />
                         <button className="px-10 py-4 font-bold text-black uppercase tracking-widest rounded-full transition-all hover:scale-105 shadow-lg" style={{ backgroundColor: primaryColor }}>Suscribir</button>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}

        {/* OFERTAS (Nivel Experto) */}
        {currentPage === 'offers' && (
          <div className="flex-1 flex flex-col w-full relative">
            <div className="py-24 px-6 md:px-12 text-center border-b border-white/5 bg-zinc-950 relative overflow-hidden flex flex-col items-center justify-center">
               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] blur-[150px] opacity-30 pointer-events-none" style={{ backgroundColor: primaryColor }}></div>
               <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="relative z-10 flex flex-col items-center">
                 <div className="mb-6 bg-white/5 border border-white/10 px-6 py-2 rounded-full flex items-center gap-3 backdrop-blur-md">
                   <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: primaryColor, boxShadow: `0 0 10px ${primaryColor}` }}></div>
                   <span className="text-xs font-bold uppercase tracking-widest text-zinc-300">Flash Deals Activos</span>
                 </div>
                 <h1 className={`${headingWeight} text-5xl md:text-7xl text-white tracking-tighter drop-shadow-2xl`}>{texts.offersTitle}</h1>
                 <p className="text-zinc-400 mt-6 text-xl font-light tracking-wide max-w-2xl">Descubre oportunidades irrepetibles. Precios exclusivos por tiempo ultra limitado.</p>
               </motion.div>
            </div>
            
            <div className="max-w-[1400px] mx-auto w-full px-6 md:px-12 py-16 relative z-10">
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {offerProducts.length > 0 ? offerProducts.map((p, i) => (
                  <motion.div 
                    key={p.id}
                    initial={{ opacity: 0, scale: 0.9, y: 30 }} 
                    animate={{ opacity: 1, scale: 1, y: 0 }} 
                    transition={{ duration: 0.5, delay: i * 0.1, type: "spring", stiffness: 100 }}
                    onClick={() => { if ((p.stock_vitrina || 0) > 0) openProductModal(p); }}
                    className={`group relative flex flex-col bg-zinc-900/40 rounded-[2.5rem] border border-white/5 overflow-hidden transition-all duration-500 hover:-translate-y-3 ${(p.stock_vitrina || 0) <= 0 ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {/* Glow effect on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none blur-2xl" style={{ background: `radial-gradient(circle at 50% 50%, ${primaryColor}20 0%, transparent 70%)` }}></div>
                    <div className="absolute inset-0 border-2 border-transparent group-hover:border-white/10 rounded-[2.5rem] transition-colors duration-500 pointer-events-none z-30"></div>

                    <div className="w-full aspect-[4/5] bg-zinc-950 relative overflow-hidden p-8 flex items-center justify-center">
                      {p.image_url ? (
                        <motion.img whileHover={{ scale: 1.15, rotate: 2 }} transition={{ duration: 0.6 }} src={`http://localhost:3001${p.image_url}`} alt={p.name} className="w-full h-full object-contain relative z-10 drop-shadow-2xl" />
                      ) : (
                        <ImageIcon size={80} className="text-zinc-800 transition-transform duration-700 group-hover:scale-110" />
                      )}
                      
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + (i*0.1) }}
                        className="absolute top-4 left-4 text-black text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full flex items-center gap-2 z-20"
                        style={{ backgroundColor: primaryColor, boxShadow: `0 0 20px ${primaryColor}60` }}
                      >
                        <Zap size={14} fill="currentColor" className="animate-pulse" /> OFERTA
                      </motion.div>
                      {(p.stock_vitrina || 0) <= 0 && (
                         <div className="absolute top-16 left-4 bg-red-600/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-red-500/50 z-30">Agotado en Vitrina</div>
                      )}

                      <button 
                        onClick={(e) => toggleWishlist(e, p)}
                        className={`absolute top-4 right-4 z-20 w-12 h-12 rounded-full flex items-center justify-center transition-all backdrop-blur-md border shadow-xl ${
                          isWishlisted(p.id) ? 'bg-red-500/20 border-red-500/30 text-red-500' : 'bg-black/40 border-white/10 text-zinc-400 hover:text-red-500 hover:bg-black/80'
                        }`}
                      >
                        <Heart size={20} fill={isWishlisted(p.id) ? 'currentColor' : 'none'} className={isWishlisted(p.id) ? 'animate-bounce' : ''} />
                      </button>

                      {isMerchantOwner && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm rounded-[2.5rem]">
                          <button 
                            onClick={(e) => { e.stopPropagation(); navigate(`/ecommerce/product-studio/${p.id}`); }}
                            className="bg-amber-500 text-black font-black uppercase tracking-widest text-[10px] px-5 py-2.5 rounded-full flex items-center gap-2 shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:scale-110 transition-transform"
                          >
                            <Pen size={14} /> Editar
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-8 pt-6 flex-1 flex flex-col relative z-20 bg-gradient-to-t from-zinc-950 to-zinc-900/80">
                      <p className="font-bold text-white text-xl line-clamp-2 mb-1 group-hover:text-white/80 transition-colors">{p.name}</p>
                      <div className="flex items-center gap-1.5 mb-3">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star key={star} size={12} className={star <= (p.avg_rating || 0) ? 'fill-amber-400 text-amber-400' : 'fill-white/10 text-transparent'} />
                          ))}
                        </div>
                        <span className="text-xs text-zinc-500 font-bold">({p.review_count || 0})</span>
                      </div>
                      <p className="text-xs text-zinc-400 mb-4">Disponibles: <span className="font-bold text-white">{p.stock_vitrina || 0}</span></p>
                      
                      <div className="mt-auto flex items-end justify-between">
                        <div className="flex flex-col">
                          {isUserAllowedToSeePrices ? (
                            <>
                              <span className="text-zinc-500 text-sm line-through decoration-white/20 mb-1 font-mono">${Number(p.price).toFixed(2)}</span>
                              <span className="font-black text-4xl drop-shadow-md" style={{ color: primaryColor }}>
                                ${Number(p.discount_price || p.price).toFixed(2)}
                              </span>
                            </>
                          ) : (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setShowAuthModal(true); }}
                              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full transition-colors border border-white/5 mt-2"
                            >
                              <Lock size={14} /> Ver Precio
                            </button>
                          )}
                        </div>
                        {isUserAllowedToSeePrices && (p.stock_vitrina || 0) > 0 && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); if (!storeClosed) addToCart(p.id, p.step_size || 1); }}
                            className={`w-14 h-14 rounded-full flex items-center justify-center text-black transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] ${storeClosed ? 'bg-zinc-600 cursor-not-allowed opacity-80' : 'bg-white hover:scale-110'}`}
                            title={storeClosed ? 'Tienda Cerrada' : 'Agregar al carrito'}
                          >
                            {storeClosed ? <X size={22} fill="currentColor" /> : <ShoppingCart size={22} fill="currentColor" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )) : (
                  <div className="col-span-full py-32 flex flex-col items-center justify-center">
                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-[0_0_50px_rgba(255,255,255,0.05)]">
                      <Tag size={40} className="text-zinc-600" />
                    </div>
                    <h3 className="text-3xl text-white font-light mb-4">El radar está despejado</h3>
                    <p className="text-zinc-500 text-lg font-light max-w-md text-center">No hay ofertas activas en este momento. Vuelve pronto para cazar los mejores descuentos.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CATALOGO */}
        {currentPage === 'catalog' && (
          <div className="flex-1 flex flex-col w-full">
            <div className="py-16 px-6 md:px-12 text-center border-b border-white/5 bg-zinc-950 relative overflow-hidden">
               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] blur-[150px] opacity-10 pointer-events-none" style={{ backgroundColor: primaryColor }}></div>
               <h1 className={`${headingWeight} text-4xl md:text-6xl text-white tracking-tighter relative z-10`}>{texts.catalogTitle}</h1>
            </div>
            
            <div className={`max-w-[1400px] mx-auto w-full flex flex-col ${catalogFilterStyle === 'sidebar' ? 'md:flex-row' : ''} px-6 md:px-12 py-12 gap-12`}>
               
               <div className={`${catalogFilterStyle === 'sidebar' ? 'w-full md:w-64 flex-shrink-0' : 'w-full flex gap-4 overflow-x-auto pb-4 scrollbar-hide'}`}>
                   {catalogFilterStyle === 'sidebar' ? (
                    <div className="sticky top-32 bg-zinc-950 border border-white/5 rounded-3xl p-6">
                      <h3 className="font-light text-xl text-white mb-6 border-b border-white/5 pb-4">Categorías</h3>
                      <ul className="space-y-2">
                        {categories.map(c => (
                          <li key={c} onClick={() => setActiveCategory(c)} className={`cursor-pointer px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-2 ${activeCategory === c ? 'bg-white/5 text-white font-bold' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}>
                            {activeCategory === c && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primaryColor }}></div>}
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    categories.map(c => (
                      <button key={c} onClick={() => setActiveCategory(c)} className={`px-8 py-3 rounded-full text-sm font-bold tracking-wide whitespace-nowrap transition-all border ${activeCategory === c ? 'text-black border-transparent shadow-lg' : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white hover:border-white/20'}`} style={activeCategory === c ? { backgroundColor: primaryColor } : {}}>
                        {c}
                      </button>
                    ))
                  )}
               </div>

               <div className="flex-1">
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {catalogProducts.length > 0 ? catalogProducts.map((p, i) => (
                      <motion.div 
                        key={p.id}
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: (i % 12) * 0.05 }}
                        onClick={() => { if ((p.stock_vitrina || 0) > 0) openProductModal(p); }}
                        className={`group relative flex flex-col bg-zinc-900/40 rounded-3xl border border-white/5 overflow-hidden transition-all duration-300 hover:bg-zinc-900/80 hover:-translate-y-1 hover:border-white/20 ${(p.stock_vitrina || 0) <= 0 ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="w-full aspect-[4/5] bg-zinc-950 relative overflow-hidden p-6 flex items-center justify-center">
                          {p.image_url ? (
                            <img src={`http://localhost:3001${p.image_url}`} alt={p.name} className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110" />
                          ) : (
                            <ImageIcon size={48} className="text-zinc-800 transition-transform duration-700 group-hover:scale-110" />
                          )}
                          
                          {p.is_offer && (
                            <div className="absolute top-3 left-3 text-black text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md" style={{ backgroundColor: primaryColor }}>
                              Oferta
                            </div>
                          )}
                          {(p.stock_vitrina || 0) <= 0 && (
                             <div className="absolute top-12 left-3 bg-red-600/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-red-500/50 z-30">Agotado en Vitrina</div>
                          )}

                          <button 
                            onClick={(e) => toggleWishlist(e, p)}
                            className={`absolute top-3 right-3 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all backdrop-blur-md border ${
                              isWishlisted(p.id) ? 'bg-red-500/20 border-red-500/30 text-red-500' : 'bg-black/60 border-white/10 text-zinc-500 hover:text-red-500 hover:border-red-500/30'
                            }`}
                          >
                            <Heart size={14} fill={isWishlisted(p.id) ? 'currentColor' : 'none'} />
                          </button>

                          {isMerchantOwner && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
                              <button 
                                onClick={(e) => { e.stopPropagation(); navigate(`/ecommerce/product-studio/${p.id}`); }}
                                className="bg-amber-500 text-black font-black uppercase tracking-widest text-[10px] px-5 py-2.5 rounded-full flex items-center gap-2 shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:scale-110 transition-transform"
                              >
                                <Pen size={14} /> Editar
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="p-5 pt-4 flex-1 flex flex-col border-t border-white/5">
                          <p className="font-light text-white text-base line-clamp-2 mb-1 group-hover:text-white/80 transition-colors">{p.name}</p>
                          <div className="flex items-center gap-1 mb-2">
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map(star => (
                                <Star key={star} size={10} className={star <= (p.avg_rating || 0) ? 'fill-amber-400 text-amber-400' : 'fill-white/10 text-transparent'} />
                              ))}
                            </div>
                            <span className="text-[10px] text-zinc-500 font-bold">({p.review_count || 0})</span>
                          </div>
                          <p className="text-[10px] text-zinc-500 mb-2">Disponibles: <span className="text-zinc-300 font-bold">{p.stock_vitrina || 0}</span></p>
                          <div className="mt-auto pt-2 flex items-center justify-between">
                            <div>
                              {isUserAllowedToSeePrices ? (
                                p.is_offer ? (
                                  <p className="font-bold text-lg" style={{ color: primaryColor }}>${Number(p.discount_price || p.price).toFixed(2)}</p>
                                ) : (
                                  <p className="font-bold text-lg" style={{ color: primaryColor }}>${Number(p.price).toFixed(2)}</p>
                                )
                              ) : (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setShowAuthModal(true); }}
                                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors border border-white/5"
                                >
                                  <Lock size={12} /> Ver Precio
                                </button>
                              )}
                            </div>
                            
                            {isUserAllowedToSeePrices && (cart[p.id] > 0 ? (
                              <div className="flex items-center gap-2 bg-zinc-950 border border-white/10 rounded-full p-1" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => removeFromCart(p.id, p.step_size)} className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 text-zinc-400"><Minus size={12}/></button>
                                <span className="text-xs font-bold text-white min-w-[16px] text-center">{cart[p.id]}</span>
                                <button onClick={() => { if(!storeClosed) addToCart(p.id, p.step_size) }} className={`w-6 h-6 rounded-full flex items-center justify-center text-black ${storeClosed ? 'cursor-not-allowed' : ''}`} style={{ backgroundColor: storeClosed ? '#52525b' : primaryColor }}><Plus size={12}/></button>
                              </div>
                            ) : (
                              (p.stock_vitrina || 0) > 0 && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); if (!storeClosed) addToCart(p.id, p.step_size || 1); }}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-black transition-all ${storeClosed ? 'bg-zinc-600 opacity-100 cursor-not-allowed' : 'opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0'}`}
                                  style={{ backgroundColor: storeClosed ? '#52525b' : primaryColor }}
                                  title={storeClosed ? 'Tienda Cerrada' : 'Agregar al carrito'}
                                >
                                  {storeClosed ? <X size={16} /> : <Plus size={16} />}
                                </button>
                              )
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )) : (
                      <div className="col-span-full py-20 text-center text-zinc-500">No se encontraron productos en esta categoría.</div>
                    )}
                  </div>
               </div>
            </div>
          </div>
        )}

      </div>

      <footer className="bg-zinc-950 border-t border-white/5 mt-auto relative z-10 py-12 px-6">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-4">
             {logoUrl && <img src={`http://localhost:3001${logoUrl}`} alt="Logo" className="h-8 object-contain grayscale opacity-50" />}
             <span className="font-bold tracking-widest text-zinc-600 uppercase text-sm">{config.business_name || 'MI TIENDA'}</span>
           </div>
           <p className="text-zinc-600 font-light text-xs tracking-wider uppercase">{texts.footerText}</p>
        </div>
      </footer>

      {/* Product Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedProduct(null)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.4 }}
              className="bg-zinc-950 rounded-[3rem] shadow-[0_0_80px_rgba(0,0,0,0.8)] w-full max-w-4xl relative z-10 overflow-hidden border border-white/10 flex flex-col md:flex-row max-h-[90vh]"
            >
              <div className="md:w-1/2 bg-black relative flex items-center justify-center p-12 overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                 {selectedProduct.image_url ? (
                   <img src={`http://localhost:3001${selectedProduct.image_url}`} alt={selectedProduct.name} className="w-full h-full object-contain relative z-10 max-h-[60vh]" />
                 ) : (
                   <ImageIcon size={80} className="text-zinc-800" />
                 )}
                 {selectedProduct.is_offer && (
                   <div className="absolute top-6 left-6 text-black text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full z-20 shadow-lg" style={{ backgroundColor: primaryColor }}>
                     Oferta
                   </div>
                 )}
                 <button onClick={() => setSelectedProduct(null)} className="md:hidden absolute top-4 right-4 text-zinc-500 bg-white/5 rounded-full p-2 z-20"><X size={20}/></button>
              </div>
              
              <div className="md:w-1/2 p-8 md:p-12 flex flex-col relative overflow-y-auto">
                 <button onClick={() => setSelectedProduct(null)} className="hidden md:flex absolute top-6 right-6 text-zinc-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-2 transition-colors z-20"><X size={20}/></button>
                 
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

                 <div className="mt-auto space-y-6 border-t border-white/5 pt-6">
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
                         {storeClosed ? 'Tienda Cerrada' : 'Agregar al Carrito'}
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cart Slide-over Premium (Glassmorphism Dark) */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-[120] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
            
            <motion.div 
              initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-[480px] h-full relative z-10 shadow-2xl flex flex-col overflow-hidden bg-zinc-950/80 backdrop-blur-3xl border-l border-white/10"
            >
              {/* Cart Ambient Glow */}
              <div className="absolute top-0 right-0 w-[400px] h-[400px] blur-[120px] opacity-20 pointer-events-none rounded-full translate-x-1/2 -translate-y-1/2" style={{ backgroundColor: primaryColor }}></div>

              {/* Header */}
              <div className="px-8 py-8 flex items-center justify-between border-b border-white/10 relative z-10 bg-black/40">
                <div className="flex items-center gap-4">
                  {isCheckoutMode ? (
                    <button onClick={() => setIsCheckoutMode(false)} className="w-12 h-12 rounded-2xl flex items-center justify-center text-white bg-white/5 hover:bg-white/10 transition-colors">
                      <ArrowLeft size={22} />
                    </button>
                  ) : (
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-black shadow-lg" style={{ backgroundColor: primaryColor, boxShadow: `0 0 20px ${primaryColor}40` }}>
                      <ShoppingBag size={22} fill="currentColor" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-light text-white tracking-tight">{isCheckoutMode ? 'Checkout' : 'Tu Compra'}</h2>
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mt-1">{totalCartItems} Ítems seleccionados</p>
                  </div>
                </div>
                <button onClick={() => { setIsCartOpen(false); setIsCheckoutMode(false); }} className="text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-3 transition-all border border-white/5 hover:border-white/20 hover:scale-110"><X size={20} /></button>
              </div>

              {/* Items Area */}
              <div className="flex-1 overflow-y-auto px-8 py-8 scrollbar-hide relative z-10">
                {isCheckoutMode ? (
                  <div className="space-y-6 text-white animate-in fade-in duration-300">
                     <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Tus Datos</h3>
                     
                     {/* Address Input */}
                     <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/10">
                       <label className="text-sm font-bold text-white mb-2 block">Dirección de Envío</label>
                       <div className="relative">
                         <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                         <input type="text" value={checkoutAddress} onChange={e => setCheckoutAddress(e.target.value)} placeholder="Ingresa la dirección completa..." className="w-full pl-9 pr-3 py-3 bg-black/50 border border-white/10 rounded-xl text-sm outline-none focus:border-white/30 text-white" />
                       </div>
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

                     {/* Payment Method Selection */}
                     <div className="pt-4 border-t border-white/10 space-y-3">
                       <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-3">Método de Pago</h3>
                       <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                         {config?.paymentProfile?.paymentMobile && (
                           <button onClick={() => setSelectedPaymentMethod('pago_movil')} className={`p-3 rounded-lg border text-sm font-bold transition-all ${selectedPaymentMethod === 'pago_movil' ? 'bg-zinc-200 border-zinc-200 text-black' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`} style={selectedPaymentMethod === 'pago_movil' ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}>Pago Móvil</button>
                         )}
                         {config?.paymentProfile?.zelleActive && (
                           <button onClick={() => setSelectedPaymentMethod('zelle')} className={`p-3 rounded-lg border text-sm font-bold transition-all ${selectedPaymentMethod === 'zelle' ? 'bg-[#741eed] border-[#741eed] text-white' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}>Zelle</button>
                         )}
                         {config?.paymentProfile?.cashActive && (
                           <button onClick={() => setSelectedPaymentMethod('cash')} className={`p-3 rounded-lg border text-sm font-bold transition-all ${selectedPaymentMethod === 'cash' ? 'bg-white border-white text-black' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}>Efectivo</button>
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
                                <input type="text" value={paymentBank} onChange={e => setPaymentBank(e.target.value)} placeholder="Banco desde donde transferiste" className="w-full px-3 py-3 border border-white/10 rounded-lg text-sm bg-black/50 focus:outline-none focus:border-white/30 text-white" />
                                <input type="text" value={paymentReference} onChange={e => setPaymentReference(e.target.value)} placeholder="Referencia de Pago (Últimos 4 o 6 dígitos)" className="w-full px-3 py-3 border border-white/10 rounded-lg text-sm bg-black/50 focus:outline-none focus:border-white/30 text-white" />
                                
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
                                <input type="text" value={paymentReference} onChange={e => setPaymentReference(e.target.value)} placeholder="Referencia de Zelle (Opcional)" className="w-full px-3 py-3 border border-white/10 rounded-lg text-sm bg-black/50 focus:outline-none focus:border-white/30 text-white" />
                                
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
                ) : totalCartItems === 0 ? (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20 flex flex-col items-center">
                    <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center mb-8 shadow-inner border border-white/10 relative">
                      <div className="absolute inset-0 blur-xl opacity-20 rounded-full" style={{ backgroundColor: primaryColor }}></div>
                      <Package size={48} className="text-zinc-500 relative z-10" />
                    </div>
                    <h3 className="text-3xl font-light text-white mb-4 tracking-tight">Carrito Vacío</h3>
                    <p className="text-zinc-400 text-base font-light mb-10 max-w-[250px] leading-relaxed">Tu bolsa de compras necesita un poco de acción. Explora nuestro catálogo.</p>
                    <button onClick={() => { setIsCartOpen(false); setCurrentPage('catalog'); }} className="px-10 py-4 text-black rounded-full text-xs font-bold tracking-[0.2em] uppercase transition-all shadow-xl hover:scale-105" style={{ backgroundColor: primaryColor, boxShadow: `0 10px 30px ${primaryColor}30` }}>Descubrir Productos</button>
                  </motion.div>
                ) : (
                  <div className="space-y-5">
                    {Object.entries(cart).map(([id, qty], idx) => {
                      const p = products.find(prod => prod.id === id);
                      if (!p) return null;
                      const currentPrice = p.is_offer ? p.discount_price : p.price;
                      
                      return (
                        <motion.div 
                          key={id}
                          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1, type: 'spring', stiffness: 100 }}
                          className="flex gap-5 group bg-white/5 p-4 rounded-3xl border border-white/5 hover:border-white/10 transition-all hover:bg-white/10"
                        >
                          <div className="w-24 h-24 bg-black rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-white/5 relative shadow-inner">
                            {p.image_url ? (
                              <img src={`http://localhost:3001${p.image_url}`} alt={p.name} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity group-hover:scale-110 duration-500" />
                            ) : (
                              <Package size={32} className="text-zinc-700" />
                            )}
                          </div>
                          
                          <div className="flex-1 flex flex-col justify-center py-1 relative">
                            <button onClick={() => removeFromCart(p.id, cart[p.id])} className="absolute top-0 right-0 text-zinc-600 hover:text-red-500 transition-colors p-1"><X size={14} /></button>
                            
                            <h5 className="text-sm font-bold text-white line-clamp-2 mb-2 leading-snug pr-6">{p.name}</h5>
                            
                            <div className="mt-auto flex items-end justify-between">
                              <div className="font-bold text-lg" style={{ color: primaryColor }}>${Number(currentPrice).toFixed(2)}</div>
                              
                              <div className="flex items-center bg-black/50 border border-white/10 rounded-full p-1 shadow-inner backdrop-blur-md">
                                <button onClick={() => removeFromCart(p.id, p.step_size)} className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"><Minus size={14}/></button>
                                <span className="w-8 text-center text-sm font-bold text-white">{qty}</span>
                                <button onClick={() => addToCart(p.id, p.step_size)} className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"><Plus size={14}/></button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Cart Footer */}
              {totalCartItems > 0 && (
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="px-8 py-8 bg-black/60 border-t border-white/10 z-10 backdrop-blur-md">
                  <div className="flex justify-between items-end mb-8 bg-white/5 p-6 rounded-3xl border border-white/5">
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
                    <div className="w-full py-5 bg-red-500/20 text-red-400 rounded-xl text-center text-sm font-bold border border-red-500/30">
                      Tienda Cerrada. Horario: {config.scheduleProfile.openTime} - {config.scheduleProfile.closeTime}
                    </div>
                  ) : isCheckoutMode ? (
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
                         if (!currentCustomer) {
                           setAuthGateMode('login');
                           setIsCartOpen(false);
                         } else if (!currentCustomer.phone || !currentCustomer.docId || !currentCustomer.address || !currentCustomer.name || currentCustomer.name === currentCustomer.email.split('@')[0] || currentCustomer.name === currentCustomer.email) {
                           setIsWizardOpen(true);
                         } else {
                           setIsCheckoutMode(true);
                         }
                      }} 
                      className="w-full py-5 text-black rounded-full text-xs font-bold tracking-[0.3em] uppercase flex items-center justify-center gap-3 transition-all hover:scale-105 shadow-2xl relative overflow-hidden group"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
                      <span className="relative z-10 flex items-center gap-2">Check Out <ArrowRight size={18} /></span>
                    </button>
                  )}
                </motion.div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
          }
        }} 
      />
    </div>
    </GoogleOAuthProvider>
  );
}
