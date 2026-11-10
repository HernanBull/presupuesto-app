import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, LayoutTemplate, Image as ImageIcon, Calculator, ChevronRight, Heart, X, Plus, Minus, ShoppingBag, ArrowLeft, Lock, Store, User, UserPlus, Zap, Package, ArrowRight, Loader2, Tag, Pen, Smartphone, UploadCloud, ShieldCheck, Hash, MapPin, Map as MapIcon, CreditCard, Star, CheckCircle, CheckCircle2, Clock, Trash2, Building2, Eye, EyeOff, Link, Camera, ChevronLeft, MoreHorizontal, Bike, ChefHat, MessageCircle, Music2, Search, Grid, Menu, Play, ExternalLink, RefreshCw, Repeat, AlertTriangle, Check, Copy, Palette, Sparkles, RotateCcw, Info, Film, Video, Briefcase, FileText, Download, CheckSquare, Square, CornerDownRight, Edit2, LayoutGrid, FolderTree } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import ProfileWizardModal from '../components/ProfileWizardModal';
import CustomerAuthModal from '../components/CustomerAuthModal';
import ResponsiveModal from '../components/ResponsiveModal';
import MerchantStatusViewerModal from '../components/MerchantStatusViewerModal';
import { getStoreFollowState, toggleFollowStore, getStoreRealMetrics, getStoreFollowersList, recordPostView, getPostRealViews, formatRealViews, resolvePostImages, recordStoreVisit } from '../services/socialService';
import { buildWhatsAppUrl, resolveStoreWhatsApp } from '../utils/whatsappHelper';
import { 
  STOREFRONT_COLOR_PRESETS, 
  DEFAULT_STOREFRONT_COLOR, 
  normalizeHex, 
  getContrastTextColor, 
  hexToRgba, 
  isValidHex,
  getStorefrontThemeStyles
} from '../utils/storefrontThemeUtils';
import Tesseract from 'tesseract.js';
import { supabase } from '../../../supabaseClient';
import logoAxon from '../../presupuesto/logo/logo-sin-fondo.png';
import FlashOfferCountdown from '../components/FlashOfferCountdown';

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

const VENEZUELA_BANKS = [
  '0102 - Banco de Venezuela',
  '0104 - Banco Venezolano de Crédito',
  '0105 - Banco Mercantil',
  '0108 - Banco Provincial',
  '0114 - Bancaribe',
  '0115 - Banco Exterior',
  '0128 - Banco Caroní',
  '0134 - Banesco',
  '0138 - Banco Plaza',
  '0151 - Fondo Común (BFC)',
  '0156 - 100% Banco',
  '0157 - Del Sur',
  '0163 - Banco del Tesoro',
  '0166 - Banco Agrícola de Venezuela',
  '0168 - Bancrecer',
  '0169 - Mi Banco',
  '0171 - Banco Activo',
  '0172 - Bancamiga',
  '0174 - Banplus',
  '0175 - Banco Bicentenario',
  '0177 - Banco de las Fuerzas Armadas (Banfanb)',
  '0191 - Banco Nacional de Crédito (BNC)'
];

export const resolveStoreCategory = (cfg) => {
  if (!cfg) return '';
  const isInvalid = (val) => !val || typeof val !== 'string' || /^(almacen|almacén|deposito|depósito|bodega)$/i.test(val.trim());
  
  if (Array.isArray(cfg.categories) && cfg.categories.length > 0) {
    const valid = cfg.categories.find(c => !isInvalid(c));
    if (valid) return valid;
  }
  if (!isInvalid(cfg.category)) return cfg.category;
  if (!isInvalid(cfg.rubro)) return cfg.rubro;
  if (!isInvalid(cfg.expediente?.rubro)) return cfg.expediente.rubro;
  if (!isInvalid(cfg.expediente?.category)) return cfg.expediente.category;
  if (!isInvalid(cfg.business_type)) return cfg.business_type;
  return '';
};


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

const PasswordStrengthBar = ({ password = '' }) => {
  if (!password) return null;

  // Cálculo de fuerza de contraseña: Débil, Media, Segura
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) || /[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password) || (/[A-Z]/.test(password) && /[0-9]/.test(password))) score += 1;

  let label = 'Débil';
  let color = 'bg-red-500 text-red-600';
  let width = 'w-1/4';

  if (score === 2) {
    label = 'Aceptable';
    color = 'bg-amber-500 text-amber-600';
    width = 'w-2/4';
  } else if (score === 3) {
    label = 'Buena';
    color = 'bg-emerald-500 text-emerald-600';
    width = 'w-3/4';
  } else if (score >= 4) {
    label = 'Segura y fuerte';
    color = 'bg-emerald-600 text-emerald-600';
    width = 'w-full';
  }

  return (
    <div className="mt-1.5 space-y-1">
      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
        <div className={`h-full transition-all duration-300 ${width} ${color.split(' ')[0]}`} />
      </div>
      <div className="flex justify-between items-center text-[10px] font-bold">
        <span className="text-slate-400">Seguridad:</span>
        <span className={color.split(' ')[1]}>{label}</span>
      </div>
    </div>
  );
};

export default function PublicStore() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [workspaceId, setWorkspaceId] = useState(() => {
    try {
      const activeWs = localStorage.getItem('activeWorkspace') || localStorage.getItem('workspace_id');
      const cached = localStorage.getItem(`axon_store_${slug}`) || (activeWs ? localStorage.getItem(`axon_store_${activeWs}`) : null);
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.workspaceId || activeWs || null;
      }
      return activeWs || null;
    } catch {}
    return null;
  });
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [showFullSchedule, setShowFullSchedule] = useState(false);
  const [showSocialMenu, setShowSocialMenu] = useState(false);
  const [storeNotFound, setStoreNotFound] = useState(false);
  const [config, setConfig] = useState(() => {
    try {
      const activeWs = localStorage.getItem('activeWorkspace') || localStorage.getItem('workspace_id');
      const cached = localStorage.getItem(`axon_store_${slug}`) || (activeWs ? localStorage.getItem(`axon_store_${activeWs}`) : null);
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.config || null;
      }
    } catch {}
    return null;
  });
  const [authGateMode, setAuthGateMode] = useState('login');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [likesCount, setLikesCount] = useState(0);

  // Modo Administrador y Comerciante Visitante (Exploración B2B)
  const activeMerchantWs = localStorage.getItem('activeWorkspace') || localStorage.getItem('workspace_id');
  const activeMerchantSlug = localStorage.getItem('storeSlug');
  const isAnyMerchantLoggedIn = Boolean(
    (activeMerchantWs && activeMerchantWs !== 'default_workspace' && activeMerchantWs !== 'null' && activeMerchantWs !== 'undefined' && activeMerchantWs.trim() !== '') ||
    (activeMerchantSlug && activeMerchantSlug !== 'null' && activeMerchantSlug !== 'undefined' && activeMerchantSlug.trim() !== '')
  );
  const isMerchantOwner = Boolean(
    (activeMerchantWs && workspaceId && activeMerchantWs === workspaceId) ||
    (activeMerchantSlug && slug && activeMerchantSlug.toLowerCase() === slug.toLowerCase())
  );
  const isVisitingMerchant = Boolean(isAnyMerchantLoggedIn && !isMerchantOwner && !currentCustomer);

  // Personalización del Color de Marca en vivo (exclusivo para el comerciante en su vitrina)
  const [brandColorCustomizerOpen, setBrandColorCustomizerOpen] = useState(false);
  const [liveBrandColor, setLiveBrandColor] = useState(null);
  const [isSavingColor, setIsSavingColor] = useState(false);
  const [customHexInput, setCustomHexInput] = useState('');

  // Personalización del Cuadro de Ofertas en vivo (exclusivo para el comerciante en su vitrina)
  const [offersCustomizerOpen, setOffersCustomizerOpen] = useState(false);
  const [editOffersTitle, setEditOffersTitle] = useState('');
  const [editOffersSubtitle, setEditOffersSubtitle] = useState('');
  const [editOffersTitleColor, setEditOffersTitleColor] = useState('#0f172a');
  const [editOffersSubtitleColor, setEditOffersSubtitleColor] = useState('#64748b');
  const [editOffersBannerUrl, setEditOffersBannerUrl] = useState('');
  const [isSavingOffers, setIsSavingOffers] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const offersBannerInputRef = useRef(null);
  const titleInputRef = useRef(null);
  const subtitleInputRef = useRef(null);

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
  const [storeCustomCategories, setStoreCustomCategories] = useState([]);
  const [bcvRate, setBcvRate] = useState(36.50);

  // Estados para Edición Rápida de Información de la Tienda
  const [storeInfoModalOpen, setStoreInfoModalOpen] = useState(false);
  const [editStoreName, setEditStoreName] = useState('');
  const [editStoreBio, setEditStoreBio] = useState('');
  const [editStorePhone, setEditStorePhone] = useState('');
  const [editStoreAddress, setEditStoreAddress] = useState('');
  const [editStoreOpenTime, setEditStoreOpenTime] = useState('08:00');
  const [editStoreCloseTime, setEditStoreCloseTime] = useState('18:00');
  const [isSavingStoreInfo, setIsSavingStoreInfo] = useState(false);

  // Estados para Módulo de Empleos y Recepción de CV
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [jobAdminModalOpen, setJobAdminModalOpen] = useState(false);
  const [jobAdminTab, setJobAdminTab] = useState('openings'); // 'openings' | 'applications'
  const [selectedJobOpening, setSelectedJobOpening] = useState(null);

  // Formulario del postulante
  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantAge, setApplicantAge] = useState('');
  const [applicantLocation, setApplicantLocation] = useState('');
  const [applicantEducation, setApplicantEducation] = useState('Bachiller');
  const [applicantHasDocuments, setApplicantHasDocuments] = useState(true);
  const [applicantPosition, setApplicantPosition] = useState('');
  const [applicantNotes, setApplicantNotes] = useState('');
  const [applicantCvFile, setApplicantCvFile] = useState(null);
  const [isSubmittingJob, setIsSubmittingJob] = useState(false);
  const applicantCvInputRef = useRef(null);

  // Formulario del comerciante para crear / editar vacante
  const [editingOpeningId, setEditingOpeningId] = useState(null);
  const [openingTitle, setOpeningTitle] = useState('');
  const [openingDescription, setOpeningDescription] = useState('');
  const [openingAgeRange, setOpeningAgeRange] = useState('');
  const [openingLocation, setOpeningLocation] = useState('');
  const [openingEducation, setOpeningEducation] = useState('');
  const [openingDocs, setOpeningDocs] = useState('');
  const [openingRequirements, setOpeningRequirements] = useState('');
  const [isSavingJobsConfig, setIsSavingJobsConfig] = useState(false);
  const [cart, setCart] = useState({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isBottomNavOpen, setIsBottomNavOpen] = useState(true);
  const lastStoreScrollRef = useRef(0);
  const isStoreNavOpenRef = useRef(true);

  useEffect(() => {
    isStoreNavOpenRef.current = isBottomNavOpen;
  }, [isBottomNavOpen]);

  useEffect(() => {
    const handleStoreScroll = () => {
      const currentScroll = window.scrollY || document.documentElement.scrollTop || 0;
      const delta = currentScroll - lastStoreScrollRef.current;
      // Scroll hacia abajo: ocultar barra inferior para despejar la vista
      if (delta > 8 && currentScroll > 60) {
        if (isStoreNavOpenRef.current) {
          isStoreNavOpenRef.current = false;
          setIsBottomNavOpen(false);
        }
      } else if (delta < -12 || currentScroll <= 30) {
        // Scroll hacia arriba o volver arriba: reaparecer barra
        if (!isStoreNavOpenRef.current) {
          isStoreNavOpenRef.current = true;
          setIsBottomNavOpen(true);
        }
      }
      lastStoreScrollRef.current = currentScroll;
    };
    window.addEventListener('scroll', handleStoreScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleStoreScroll);
  }, []);

  const [isStatusViewerOpen, setIsStatusViewerOpen] = useState(false);
  const [activeStatusIndex, setActiveStatusIndex] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastPlacedOrder, setLastPlacedOrder] = useState(null);
  const [pinCopied, setPinCopied] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [isCheckoutMode, setIsCheckoutMode] = useState(false);
  const [checkoutAddress, setCheckoutAddress] = useState('');
  const [checkoutLocation, setCheckoutLocation] = useState(null);
  const [gpsDetails, setGpsDetails] = useState(null);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [discountCode, setDiscountCode] = useState('');

  const merchantWhatsAppUrl = useMemo(() => {
    const phone = resolveStoreWhatsApp(config);
    if (!phone || !lastPlacedOrder) return null;
    const msg = `🛍️ *¡NUEVO PEDIDO RECIBIDO EN TU VITRINA AXONMARKET!* 📦\n━━━━━━━━━━━━━━━━━━━━━━\n• *Orden:* #${lastPlacedOrder.id}\n• *Total:* $${Number(lastPlacedOrder.total || 0).toFixed(2)} USD\n• *Cliente:* ${currentCustomer?.name || 'Cliente'}\n• *Teléfono:* ${currentCustomer?.phone || 'No especificado'}\n• *Dirección:* ${lastPlacedOrder.address || 'Mostrador / Retiro'}\n━━━━━━━━━━━━━━━━━━━━━━\n👉 *Revisar en tu Panel de Administrador:* https://axonmarket.vip/orders`;
    return buildWhatsAppUrl(phone, msg);
  }, [config, lastPlacedOrder, currentCustomer]);
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [discountError, setDiscountError] = useState('');
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptUrl, setReceiptUrl] = useState(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentBank, setPaymentBank] = useState('0102 - Banco de Venezuela');
  const [selectedPaymentProfileIdx, setSelectedPaymentProfileIdx] = useState('');
  const [duplicateRefError, setDuplicateRefError] = useState(null);
  const [isCheckingRef, setIsCheckingRef] = useState(false);

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
  const [activeImageIndex, setActiveImageIndex] = useState(0);
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
  // Estados y Promociones Permanentes (Fijos en la barra superior "Estados y Promociones")
  const permanentStatuses = useMemo(() => {
    const storeAvatar = config?.logoUrl || config?.storefront?.logoUrl;
    const storeCover = config?.coverUrl || config?.storefront?.heroUrl || config?.bannerUrl;
    const storeName = config?.business_name || 'Comercio';

    const items = (storeNews || []).filter(news => {
      if (news.status && news.status !== 'Publicado') return false;
      const isPermanent = news.is_permanent === true || 
        (typeof news.title === 'string' && (news.title.startsWith('[ESTADO_PERMANENTE]') || news.title.startsWith('[ESTADO_FIJO]')));
      const isStatus = news.post_type === 'status' || (typeof news.title === 'string' && news.title.startsWith('[ESTADO'));
      return isStatus && isPermanent;
    });

    return items.map((news, idx) => {
      const cleanTitle = (news.title || '')
        .replace(/^\[ESTADO_PERMANENTE\]\s*/i, '')
        .replace(/^\[ESTADO_FIJO\]\s*/i, '')
        .replace(/^\[ESTADO\]\s*/i, '')
        .trim();
      const imagesList = resolvePostImages(news);
      let rawMedia = imagesList[0] || news.image_url || storeCover || storeAvatar;
      const isVid = news.media_type === 'video' || (typeof rawMedia === 'string' && /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(rawMedia));

      return {
        id: news.id,
        name: storeName,
        store_name: storeName,
        slug: slug,
        store_slug: slug,
        avatar: storeAvatar,
        store_logo: storeAvatar,
        mediaUrl: rawMedia,
        media_url: rawMedia,
        images: imagesList.length > 0 ? imagesList : (rawMedia ? [rawMedia] : []),
        image_urls: imagesList.length > 0 ? imagesList : (rawMedia ? [rawMedia] : []),
        video_url: isVid ? rawMedia : null,
        media_type: isVid ? 'video' : 'image',
        caption: cleanTitle ? (news.content ? `${cleanTitle}: ${news.content}` : cleanTitle) : news.content,
        time: 'Permanente',
        isPermanent: true,
        is_permanent: true,
        hoursLeft: null,
        isVerified: !!config?.is_verified,
        is_verified: !!config?.is_verified,
        statusIndex: idx
      };
    });
  }, [storeNews, config, slug]);

  // Estados Efímeros de 24 Horas (Exclusivos para la pestaña "Estados" estilo WhatsApp)
  const ephemeralStatuses = useMemo(() => {
    const storeAvatar = config?.logoUrl || config?.storefront?.logoUrl;
    const storeCover = config?.coverUrl || config?.storefront?.heroUrl || config?.bannerUrl;
    const storeName = config?.business_name || 'Comercio';
    const now = Date.now();

    const items = (storeNews || []).filter(news => {
      if (news.status && news.status !== 'Publicado') return false;
      const isPermanent = news.is_permanent === true || 
        (typeof news.title === 'string' && (news.title.startsWith('[ESTADO_PERMANENTE]') || news.title.startsWith('[ESTADO_FIJO]')));
      if (isPermanent) return false;

      const isStatus = news.post_type === 'status' || (typeof news.title === 'string' && news.title.startsWith('[ESTADO]'));
      if (!isStatus) return false;

      const createdAt = new Date(news.created_at || now).getTime();
      return (now - createdAt) <= (24 * 60 * 60 * 1000);
    });

    return items.map((news, idx) => {
      const cleanTitle = (news.title || '').replace(/^\[ESTADO\]\s*/i, '').trim();
      const imagesList = resolvePostImages(news);
      let rawMedia = imagesList[0] || news.image_url || storeCover || storeAvatar;
      const isVid = news.media_type === 'video' || (typeof rawMedia === 'string' && /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(rawMedia));
      const createdAt = new Date(news.created_at || now).getTime();
      const elapsedHours = Math.floor((now - createdAt) / (1000 * 60 * 60));
      const hoursLeft = Math.max(1, 24 - elapsedHours);

      return {
        id: news.id,
        name: storeName,
        store_name: storeName,
        slug: slug,
        store_slug: slug,
        avatar: storeAvatar,
        store_logo: storeAvatar,
        mediaUrl: rawMedia,
        media_url: rawMedia,
        images: imagesList.length > 0 ? imagesList : (rawMedia ? [rawMedia] : []),
        image_urls: imagesList.length > 0 ? imagesList : (rawMedia ? [rawMedia] : []),
        video_url: isVid ? rawMedia : null,
        media_type: isVid ? 'video' : 'image',
        caption: cleanTitle ? (news.content ? `${cleanTitle}: ${news.content}` : cleanTitle) : news.content,
        time: formatStatusTime(news.created_at),
        hoursLeft,
        isPermanent: false,
        is_permanent: false,
        isVerified: !!config?.is_verified,
        is_verified: !!config?.is_verified,
        statusIndex: idx
      };
    });
  }, [storeNews, config, slug]);

  // Colección unificada de estados del comercio (permanentes y efímeros)
  const merchantStatuses = useMemo(() => {
    return [...permanentStatuses, ...ephemeralStatuses];
  }, [permanentStatuses, ephemeralStatuses]);

  // Colección completa de publicaciones (Fotos y Videos) — no excluye fotos
  const merchantPublications = useMemo(() => {
    const list = [];
    const seenIds = new Set();
    const storeAvatar = config?.logoUrl || config?.storefront?.logoUrl;
    const storeCover = config?.coverUrl || config?.storefront?.heroUrl || config?.bannerUrl;
    const storeName = config?.business_name || 'Comercio';

    (storeNews || []).forEach((n, idx) => {
      if (n.status && n.status !== 'Publicado') return;
      const idKey = n.id || `news-${idx}`;
      if (seenIds.has(idKey)) return;
      seenIds.add(idKey);

      const imagesList = resolvePostImages(n);
      const isVid = n.media_type === 'video' || 
        (typeof n.video_url === 'string' && n.video_url.length > 0) || 
        (typeof n.image_url === 'string' && /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(n.image_url));

      const primaryMedia = isVid 
        ? (n.video_url || n.image_url || imagesList[0] || storeCover)
        : (imagesList[0] || n.image_url || storeCover || storeAvatar);

      const cleanTitle = (n.title || '')
        .replace(/^\[ESTADO_PERMANENTE\]\s*/i, '')
        .replace(/^\[ESTADO_FIJO\]\s*/i, '')
        .replace(/^\[ESTADO\]\s*/i, '')
        .trim();

      const realViews = Number(n.views || n.view_count || (typeof localStorage !== 'undefined' ? localStorage.getItem(`axon_views_${idKey}`) : 0) || 0);

      list.push({
        id: idKey,
        name: storeName,
        store_name: storeName,
        slug: slug,
        store_slug: slug,
        avatar: storeAvatar,
        store_logo: storeAvatar,
        mediaUrl: primaryMedia,
        media_url: primaryMedia,
        images: imagesList.length > 0 ? imagesList : (primaryMedia ? [primaryMedia] : []),
        image_urls: imagesList.length > 0 ? imagesList : (primaryMedia ? [primaryMedia] : []),
        video_url: isVid ? primaryMedia : null,
        media_type: isVid ? 'video' : 'image',
        isVideo: isVid,
        imageCount: imagesList.length || (primaryMedia ? 1 : 0),
        title: cleanTitle,
        caption: cleanTitle ? (n.content ? `${cleanTitle}: ${n.content}` : cleanTitle) : (n.content || ''),
        content: n.content || '',
        views: realViews,
        likes: Number(n.likes || n.like_count || 0),
        created_at: n.created_at,
        time: formatStatusTime(n.created_at),
        isVerified: !!config?.is_verified,
        statusIndex: idx,
        sourceList: 'publications'
      });
    });

    (permanentStatuses || []).forEach((st, idx) => {
      const idKey = st.id || `st-perm-${idx}`;
      if (seenIds.has(idKey)) return;
      seenIds.add(idKey);
      list.push({
        ...st,
        id: idKey,
        isVideo: st.media_type === 'video',
        imageCount: (st.images && st.images.length) || 1,
        views: Number(st.views || 0),
        likes: Number(st.likes || 0),
        statusIndex: idx,
        sourceList: 'permanent'
      });
    });

    return list;
  }, [storeNews, permanentStatuses, config, slug]);

  const merchantVideos = merchantPublications;

  const [activeStatusModalList, setActiveStatusModalList] = useState('publications'); // 'publications' | 'permanent' | 'ephemeral'
  const activeStatusesForViewer = useMemo(() => {
    if (activeStatusModalList === 'publications') {
      return merchantPublications.length > 0 ? merchantPublications : merchantStatuses;
    }
    if (activeStatusModalList === 'ephemeral') {
      return ephemeralStatuses.length > 0 ? ephemeralStatuses : permanentStatuses;
    }
    return permanentStatuses.length > 0 ? permanentStatuses : ephemeralStatuses;
  }, [activeStatusModalList, merchantPublications, permanentStatuses, ephemeralStatuses, merchantStatuses]);

  // Limpieza automática en segundo plano de estados efímeros de más de 24 horas
  useEffect(() => {
    if (!storeNews || storeNews.length === 0) return;
    const now = Date.now();
    const expiredEphemeral = storeNews.filter(n => {
      const isPermanent = n.is_permanent === true || (typeof n.title === 'string' && n.title.startsWith('[ESTADO_PERMANENTE]'));
      if (isPermanent) return false;
      const isStatus = n.post_type === 'status' || (typeof n.title === 'string' && n.title.startsWith('[ESTADO]'));
      if (!isStatus) return false;
      const createdAt = new Date(n.created_at || now).getTime();
      return (now - createdAt) > (24 * 60 * 60 * 1000);
    });

    if (expiredEphemeral.length > 0 && isMerchantOwner) {
      const expiredIds = expiredEphemeral.map(n => n.id).filter(Boolean);
      if (expiredIds.length > 0) {
        supabase
          .from('ecommerce_store_news')
          .delete()
          .in('id', expiredIds)
          .then(() => {
            console.log(`Auto-limpieza de estados 24h: eliminados ${expiredIds.length} estados caducados.`);
          })
          .catch(err => console.warn('Error en auto-limpieza:', err));
      }
    }
  }, [storeNews, isMerchantOwner]);

  const hasActiveStatuses = useMemo(() => {
    return permanentStatuses.length > 0 || ephemeralStatuses.length > 0;
  }, [permanentStatuses, ephemeralStatuses]);

  const latestStatusId = useMemo(() => {
    return permanentStatuses[0]?.id || ephemeralStatuses[0]?.id || slug;
  }, [permanentStatuses, ephemeralStatuses, slug]);

  const [hasViewedStatus, setHasViewedStatus] = useState(false);

  useEffect(() => {
    try {
      const viewed = localStorage.getItem('axon_viewed_statuses');
      const viewedArr = viewed ? JSON.parse(viewed) : [];
      setHasViewedStatus(viewedArr.includes(latestStatusId));
    } catch {
      setHasViewedStatus(false);
    }
  }, [latestStatusId]);

  const markStatusAsViewed = (idx = 0, sourceList = 'permanent') => {
    setActiveStatusModalList(sourceList);
    setActiveStatusIndex(idx);
    setIsStatusViewerOpen(true);
    setHasViewedStatus(true);
    try {
      const targetStatuses = sourceList === 'permanent' ? permanentStatuses : ephemeralStatuses;
      const targetStatus = targetStatuses?.[idx];
      const targetId = targetStatus?.id || latestStatusId;
      if (targetId) {
        recordPostView(targetId, config?.id || config?.workspace_id, currentCustomer?.id || 'guest');
      }
      const viewed = localStorage.getItem('axon_viewed_statuses');
      const viewedArr = viewed ? JSON.parse(viewed) : [];
      if (targetId && !viewedArr.includes(targetId)) {
        viewedArr.push(targetId);
        localStorage.setItem('axon_viewed_statuses', JSON.stringify(viewedArr));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const [profileSubTab, setProfileSubTab] = useState('info'); // 'info' | 'media' | 'statuses'
  const profileTouchStartX = useRef(0);
  const handleProfileTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      profileTouchStartX.current = e.touches[0].clientX;
    }
  };
  const handleProfileTouchEnd = (e) => {
    if (e.changedTouches && e.changedTouches[0]) {
      const touchEndX = e.changedTouches[0].clientX;
      const diff = profileTouchStartX.current - touchEndX;
      const tabs = ['info', 'media', 'statuses'];
      const curIdx = tabs.indexOf(profileSubTab);
      if (diff > 50 && curIdx < tabs.length - 1) {
        setProfileSubTab(tabs[curIdx + 1]);
      } else if (diff < -50 && curIdx > 0) {
        setProfileSubTab(tabs[curIdx - 1]);
      }
    }
  };

  const formatViews = (val) => {
    const num = Number(val) || 0;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace('.0', '')} mill.`;
    if (num >= 1000) return `${(num / 1000).toFixed(1).replace('.0', '')} mil`;
    return num.toString();
  };


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
      localStorage.removeItem('workspace_id');
      localStorage.removeItem('storeSlug');
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

  const fetchAddressFromCoords = async (lat, lng) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=es`,
        {
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        }
      );
      clearTimeout(timeoutId);
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.address) {
          const addr = data.address;
          const road = addr.road || addr.pedestrian || addr.street || addr.avenue || '';
          const neighborhood = addr.neighbourhood || addr.suburb || addr.residential || addr.quarter || '';
          const city = addr.city || addr.town || addr.village || addr.municipality || '';
          const state = addr.state || '';
          
          const cleanParts = [road, neighborhood, city, state].filter(Boolean);
          if (cleanParts.length >= 2) {
            return cleanParts.join(', ');
          }
          if (data.display_name) {
            return data.display_name.split(',').slice(0, 4).map(s => s.trim()).join(', ');
          }
        }
      }
    } catch (e) {
      console.warn('Reverse geocoding error or timeout:', e);
    }
    return null;
  };

  const handlePositionSuccess = async (pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const accuracy = Math.round(pos.coords.accuracy || 10);

    setCheckoutLocation({ lat, lng, accuracy });

    // Reverse geocoding to human-readable address
    const detectedAddress = await fetchAddressFromCoords(lat, lng);
    const finalAddress = detectedAddress || `Ubicación GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    
    setCheckoutAddress(finalAddress);
    setGpsDetails({
      lat,
      lng,
      accuracy,
      address: finalAddress,
      mapsUrl: `https://maps.google.com/?q=${lat},${lng}`
    });
    setGpsLoading(false);
  };

  const getLocationFromGPS = () => {
    setGpsLoading(true);
    setGpsError('');
    if (!navigator.geolocation) {
      setGpsError('Tu navegador no soporta geolocalización.');
      setGpsLoading(false);
      return;
    }

    const friendlyError = (err) => {
      if (!err) return 'No se pudo obtener la ubicación GPS.';
      if (err.code === 1) return 'Permiso de ubicación denegado. Habilita los permisos de GPS en tu navegador.';
      if (err.code === 2) return 'Señal GPS no disponible. Verifica que la ubicación esté activada en tu dispositivo.';
      if (err.code === 3) return 'Tiempo de espera agotado al conectar con el GPS. Intenta nuevamente.';
      return 'No se pudo obtener la ubicación GPS.';
    };

    // Fase 1: Intentar alta precisión con timeout de 6s
    navigator.geolocation.getCurrentPosition(
      (pos) => handlePositionSuccess(pos),
      (err) => {
        console.warn('GPS Fase 1 (alta precisión) no respondió, intentando Fase 2...', err);
        // Fase 2: Redundancia estándar con caché reciente y timeout de 8s
        navigator.geolocation.getCurrentPosition(
          (pos) => handlePositionSuccess(pos),
          (err2) => {
            console.error('GPS Fase 2 falló:', err2);
            setGpsError(friendlyError(err2 || err));
            setGpsLoading(false);
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
    );
  };

  const checkDuplicateReference = async (refValue) => {
    if (!refValue) {
      setDuplicateRefError(null);
      return false;
    }
    const cleanRef = String(refValue).trim().replace(/\D/g, '');
    if (cleanRef.length < 4) {
      setDuplicateRefError(null);
      return false;
    }

    setIsCheckingRef(true);
    try {
      // 1. Consultar historial de órdenes de este comercio en Supabase
      const { data: existingOrders, error: ordErr } = await supabase
        .from('ecommerce_orders_v2')
        .select('id, date, status, paymentdetails')
        .eq('workspace_id', workspaceId)
        .limit(200);

      let foundDuplicate = null;
      if (!ordErr && existingOrders && existingOrders.length > 0) {
        foundDuplicate = existingOrders.find(ord => {
          const ordRef = ord?.paymentdetails?.ref ? String(ord.paymentdetails.ref).trim().replace(/\D/g, '') : '';
          if (!ordRef || ordRef.length < 4) return false;
          // Coincidencia exacta o coincidencia en los últimos 4-6 dígitos
          if (ordRef === cleanRef) return true;
          if (ordRef.length >= 6 && cleanRef.length >= 6 && (ordRef.endsWith(cleanRef) || cleanRef.endsWith(ordRef))) {
            return true;
          }
          return false;
        });
      }

      // 2. Consultar base de datos de referencias del comercio en su configuración
      if (!foundDuplicate && Array.isArray(config?.used_references)) {
        const matchConfig = config.used_references.some(r => {
          const cleanR = String(r).trim().replace(/\D/g, '');
          return cleanR && (cleanR === cleanRef || (cleanR.length >= 6 && cleanRef.length >= 6 && (cleanR.endsWith(cleanRef) || cleanRef.endsWith(cleanR))));
        });
        if (matchConfig) {
          foundDuplicate = { id: 'REGISTRO-COMERCIO' };
        }
      }

      if (foundDuplicate) {
        setDuplicateRefError('⚠️ Referencia duplicada: este número de pago ya fue utilizado en un pedido anterior.');
        setIsCheckingRef(false);
        return true;
      } else {
        setDuplicateRefError(null);
        setIsCheckingRef(false);
        return false;
      }
    } catch (err) {
      console.warn('Error al verificar referencia duplicada:', err);
      setIsCheckingRef(false);
      return false;
    }
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

    // Verificación Estricta Anti-Fraude: Detector de Referencia Duplicada
    if (paymentReference && (selectedPaymentMethod === 'pago_movil' || selectedPaymentMethod === 'zelle')) {
      const isDupe = await checkDuplicateReference(paymentReference);
      if (isDupe) {
        setIsSubmittingOrder(false);
        alert("⛔ REFERENCIA DUPLICADA\n\nEl número de referencia que ingresaste ya fue registrado en una compra anterior de esta tienda.\n\nEl pedido no procede para evitar pagos duplicados. Por favor ingresa el comprobante o referencia correcta.");
        
        // Alerta en tiempo real al panel/POS del comerciante
        try {
          const alertCh = supabase.channel('store-' + workspaceId + '-orders');
          alertCh.subscribe(async (st) => {
            if (st === 'SUBSCRIBED') {
              await alertCh.send({
                type: 'broadcast',
                event: 'SECURITY_ALERT',
                payload: {
                  type: 'DUPLICATE_REFERENCE_ATTEMPT',
                  reference: paymentReference,
                  customerName: currentCustomer?.name || 'Cliente',
                  customerPhone: currentCustomer?.phone || '',
                  timestamp: new Date().toISOString()
                }
              });
              alertCh.unsubscribe();
            }
          });
        } catch (alertErr) {
          console.warn('Error emitiendo alerta de seguridad al comerciante:', alertErr);
        }
        return;
      }
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

    // Generar PIN Secreto de Entrega único de 6 dígitos (Cliente ↔ Repartidor)
    const generatedDeliveryPin = Math.floor(100000 + Math.random() * 900000).toString();
    // Generar PIN de Recogida en Tienda único de 6 dígitos (Comerciante ↔ Repartidor)
    const generatedPickupPin = Math.floor(100000 + Math.random() * 900000).toString();

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
      delivery_pin: generatedDeliveryPin,
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
         location: checkoutLocation,
         maps_url: checkoutLocation ? `https://maps.google.com/?q=${checkoutLocation.lat},${checkoutLocation.lng}` : null,
         accuracy: checkoutLocation?.accuracy || null,
         pickup_pin: generatedPickupPin
      },
      date: new Date().toISOString()
    };

    try {
      const { error } = await supabase.from('ecommerce_orders_v2').insert([orderData]);
      if (!error) {
        // Guardar la nueva dirección en el perfil del cliente para futuras compras
        if (checkoutAddress && currentCustomer?.id) {
          try {
            await supabase
              .from('ecommerce_customers')
              .update({ address: checkoutAddress })
              .eq('id', currentCustomer.id);
            setCurrentCustomer(prev => prev ? ({ ...prev, address: checkoutAddress }) : prev);
          } catch (addrErr) {
            console.warn('[PublicStore] Error actualizando dirección de cliente:', addrErr);
          }
        }
        // Disparo Realtime instantaneo a AxonPOS
        try {
          const storeCh = supabase.channel('store-' + workspaceId + '-orders');
          storeCh.subscribe(async (st) => {
            if (st === 'SUBSCRIBED') {
              await storeCh.send({
                type: 'broadcast',
                event: 'NEW_ORDER',
                payload: { orderId: orderData.id, workspaceId, deliveryPin: generatedDeliveryPin, pickupPin: generatedPickupPin }
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
        
        // Guardar datos del pedido para mostrar en el modal de confirmación
        setLastPlacedOrder({
          id: orderData.id,
          deliveryPin: generatedDeliveryPin,
          total: finalTotal,
          itemsCount: orderItems.length,
          address: checkoutAddress
        });
        setPinCopied(false);
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
          checkDuplicateReference(foundRef);
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
      localStorage.removeItem('workspace_id');
      localStorage.removeItem('storeSlug');
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
    if (!currentCustomer) {
      setShowAuthModal(true);
      return;
    }

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
    setActiveImageIndex(0);
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
    if (!currentCustomer) {
      setShowAuthModal(true);
      return;
    }
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
      // Función pura para sanitizar el slug de entrada desde cualquier origen o red social
      const sanitizeSlug = (raw) => {
        if (!raw) return '';
        let s = String(raw).trim();
        try { s = decodeURIComponent(s); } catch(e) {}
        s = s.replace(/^@+/, '');
        s = s.replace(/^\/+|\/+$/g, '');
        return s.trim();
      };

      const cleanSlug = sanitizeSlug(slug);
      const cacheKey = `ecommerce_store_${cleanSlug || slug}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.config) {
            setConfig(parsed.config);
            setWorkspaceId(parsed.workspaceId);
            setProducts(parsed.products || []);
            setCategories(parsed.categories || ['Todas']);
          }
        } catch(e) {}
      }

      const defaultTexts = {
        banner: '¡Envíos gratis en compras mayores a $100!', nav1: 'Inicio', nav2: 'Catálogo', nav3: 'Ofertas',
        heroTitle: 'Descubre la nueva colección', heroSub: 'Productos exclusivos diseñados para ti.', heroBtn: 'Comprar Ahora',
        sectionTitle: 'Novedades', catalogTitle: 'Catálogo de Productos', offersTitle: 'Ofertas Flash',
        offersSubtitle: 'Aprovecha los mejores precios y promociones exclusivas de la tienda.',
        footerText: '© 2026 Todos los derechos reservados.',
        newsletterTitle: 'Únete a nuestro boletín', newsletterSub: 'Recibe ofertas exclusivas en tu correo.', testimonialsTitle: 'Lo que dicen nuestros clientes'
      };

      let storeData = null;

      // ═══ RESOLUCIÓN MULTICAPA RESILIENTE DE VITRINA ═══
      try {
        const targetSlug = cleanSlug || (slug || 'tienda-ejemplo').trim();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetSlug);

        // Capa 1: Búsqueda exacta case-insensitive en store_slug
        const resSlug = await supabase.from('workspaces').select('*').ilike('store_slug', targetSlug).maybeSingle();
        if (resSlug.data) {
          storeData = resSlug.data;
        }

        // Capa 2: Si es UUID, búsqueda directa por id
        if (!storeData && isUuid) {
          const resUuid = await supabase.from('workspaces').select('*').eq('id', targetSlug).maybeSingle();
          if (resUuid.data) {
            storeData = resUuid.data;
          }
        }

        // Capa 3: Búsqueda por nombre de tienda (soporta guiones sustituidos por espacios)
        if (!storeData) {
          const nameWithSpaces = targetSlug.replace(/-/g, ' ');
          const resName = await supabase.from('workspaces').select('*').ilike('name', nameWithSpaces).maybeSingle();
          if (resName.data) {
            storeData = resName.data;
          }
        }

        // Capa 4: Fallback alfanumérico normalizado sobre comercios
        if (!storeData) {
          const alphaClean = targetSlug.toLowerCase().replace(/[^a-z0-9]/g, '');
          const { data: allWs } = await supabase.from('workspaces').select('*').limit(150);
          if (allWs && allWs.length > 0) {
            storeData = allWs.find(w => {
              const wsSlug = (w.store_slug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              const wsName = (w.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              return w.id === targetSlug || wsSlug === alphaClean || wsName === alphaClean;
            }) || null;
          }
        }

        // Si después de todas las capas no existe el comercio en la base de datos
        if (!storeData) {
          const savedStr = localStorage.getItem('storefrontConfig');
          if (savedStr) {
            try {
              const saved = JSON.parse(savedStr);
              saved.texts = { ...defaultTexts, ...(saved.texts || {}) };
              setConfig(saved);
              setWorkspaceId('default_workspace');
              return;
            } catch (e) {}
          }
          setStoreNotFound(true);
          return;
        }

        // Comercio encontrado exitosamente
        setStoreNotFound(false);
        setWorkspaceId(storeData.id);

        // Registrar visita orgánica en historial del cliente ("Lugares recorridos")
        recordStoreVisit(storeData, storeData.id);

        const baseConf = typeof storeData.config === 'object' && storeData.config !== null ? storeData.config : {};
        const storefrontConf = baseConf.storefront || {};

        let saved = {
          ...baseConf,
          ...storefrontConf,
          business_name: storeData.name || baseConf.business_name || baseConf.onboarding?.business_name || 'Comercio'
        };

        const resolvedLoadedColor = baseConf.primaryColor || baseConf.themeColor || storefrontConf.primaryColor || storefrontConf.themeColor || DEFAULT_STOREFRONT_COLOR;
        saved.primaryColor = normalizeHex(resolvedLoadedColor);

        if (!saved || Object.keys(saved).length <= 1) {
          saved = {
            themeMode: 'dark', primaryColor: normalizeHex(resolvedLoadedColor), typography: 'font-sans', baseFontSize: 'text-base', headingWeight: 'font-light',
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

        saved.logoUrl = baseConf.logoUrl || storefrontConf.logoUrl || saved.logoUrl;
        saved.heroUrl = baseConf.coverUrl || storefrontConf.heroUrl || saved.heroUrl || saved.coverUrl;

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

        const rawCustomList = baseConf.customCategories || baseConf.custom_categories || storeData.customCategories || storeData.custom_categories || [];
        const normalizedCustomCats = Array.isArray(rawCustomList) ? rawCustomList.map(item => {
          if (typeof item === 'string') {
            const clean = item.trim();
            return clean ? { name: clean, imageUrl: '', subcategories: [] } : null;
          }
          if (item && typeof item === 'object') {
            const name = (item.name || '').trim();
            const imageUrl = item.imageUrl || item.image_url || '';
            const rawSubs = Array.isArray(item.subcategories) ? item.subcategories : [];
            const subcategories = rawSubs.map(s => {
              if (typeof s === 'string') {
                const sClean = s.trim();
                return sClean ? { name: sClean, imageUrl: '' } : null;
              }
              if (s && typeof s === 'object') {
                const sName = (s.name || '').trim();
                return sName ? { name: sName, imageUrl: s.imageUrl || s.image_url || '' } : null;
              }
              return null;
            }).filter(Boolean);
            return name ? { ...item, name, imageUrl, subcategories } : null;
          }
          return null;
        }).filter(Boolean) : [];

        setStoreCustomCategories(normalizedCustomCats);

        setConfig(saved);
        trackEvent('visit', storeData.id);

        // ═══ CARGA AISLADA DE PRODUCTOS (ERRORES NO TUMBAN LA TIENDA) ═══
        let finalPublished = [];
        let finalCats = ['Todas'];
        try {
          const { data: pData, error: pError } = await supabase.from('ecommerce_products').select('*').eq('workspace_id', storeData.id);
          if (!pError && pData) {
            finalPublished = pData
              .filter(p => {
                const s = (p.publish_status || '').toLowerCase();
                const st = (p.status || '').toLowerCase();
                return s === 'publicado' || s === 'activo' || s === 'published' || st === 'activo' || (!p.publish_status && !p.status);
              })
              .map(p => ({
                ...p,
                stock_vitrina: (Number(p.stock_vitrina) > 0) ? Number(p.stock_vitrina) : (Number(p.stock) > 0 ? Number(p.stock) : (p.stock_vitrina || 0))
              }))
              .sort((a, b) => {
                const aStock = a.stock_vitrina || 0;
                const bStock = b.stock_vitrina || 0;
                if (aStock > 0 && bStock <= 0) return -1;
                if (aStock <= 0 && bStock > 0) return 1;
                return 0;
              });
            setProducts(finalPublished);
            const cats = new Set(finalPublished.map(p => p.category || 'Sin Categoría'));
            if (Array.isArray(loadedCustomCats)) {
              loadedCustomCats.forEach(c => {
                const cName = typeof c === 'string' ? c : c?.name;
                if (cName) cats.add(cName);
              });
            }
            finalCats = ['Todas', ...Array.from(cats)];
            setMainCategories(finalCats);
            const allSubCats = new Set(finalPublished.map(p => p.subcategory || 'General'));
            setSubCategories(['Todos', ...Array.from(allSubCats)]);
          }
        } catch (prodErr) {
          console.warn('[PublicStore] Error cargando productos de vitrina:', prodErr);
        }

        // ═══ CACHÉ LOCAL SEGURO (PROTEGIDO CONTRA CUOTA EXCEDIDA) ═══
        try {
          const newCache = JSON.stringify({
            config: saved,
            workspaceId: storeData.id,
            products: finalPublished,
            categories: finalCats
          });
          if (cached !== newCache) {
            localStorage.setItem(cacheKey, newCache);
          }
        } catch (cacheErr) {}

        // ═══ CARGA AISLADA DE RESEÑAS ═══
        try {
          const { data: storeReviews } = await supabase.from('ecommerce_reviews').select('*').eq('workspace_id', storeData.id).eq('status', 'Aprobado');
          if (storeReviews && storeReviews.length > 0) {
            const total = storeReviews.reduce((acc, curr) => acc + curr.rating, 0);
            setStoreRatingAvg((total / storeReviews.length).toFixed(1));
            setStoreReviewsList(storeReviews);
          }
        } catch (revErr) {}

        // ═══ CARGA AISLADA DE NOTICIAS ═══
        try {
          const { data: newsData } = await supabase.from('ecommerce_store_news').select('*').eq('workspace_id', storeData.id).eq('status', 'Publicado').order('created_at', { ascending: false });
          if (newsData) {
            setStoreNews(newsData);
          }
        } catch (newsErr) {}

      } catch (fatalErr) {
        console.error('[PublicStore] Error crítico resolviendo vitrina:', fatalErr);
        if (!storeData) {
          setStoreNotFound(true);
        }
      }
    };

    fetchStoreData();
    window.addEventListener('storage', fetchStoreData);
    return () => window.removeEventListener('storage', fetchStoreData);
  }, [slug]);

  if (storeNotFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white font-light flex-col gap-4 font-sans selection:bg-amber-500/30 relative px-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-zinc-900/80 border border-white/10 flex items-center justify-center text-zinc-500 mb-2 shadow-xl">
          <Store size={40} className="text-orange-500/80" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Tienda no encontrada</h2>
        <p className="text-zinc-400 text-sm max-w-sm">
          La dirección ingresada no coincide con un comercio activo o el enlace ha expirado.
        </p>
        <button 
          onClick={() => navigate('/explorar')} 
          className="mt-4 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-zinc-950 font-bold rounded-full text-sm transition-all shadow-lg shadow-orange-500/20 active:scale-95 cursor-pointer"
        >
          Explorar Comercios en AxonMarket
        </button>
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

  const resolvedCoverUrl = heroUrl || config?.coverUrl || config?.storefront?.heroUrl || config?.storefront?.coverUrl || config?.bannerUrl || null;
  const resolvedLogoUrl = logoUrl || config?.storefront?.logoUrl || config?.avatarUrl || config?.logo || null;
  const resolvedOffersBannerUrl = config?.offersBannerUrl || config?.storefront?.offersBannerUrl || texts?.offersBannerUrl || null;
  const resolvedOffersTitleColor = config?.offersTitleColor || config?.storefront?.offersTitleColor || texts?.offersTitleColor || '#0f172a';
  const resolvedOffersSubtitleColor = config?.offersSubtitleColor || config?.storefront?.offersSubtitleColor || texts?.offersSubtitleColor || '#64748b';

  // Color de marca dinámico de la vitrina (exclusivo para este comercio)
  const primaryColor = liveBrandColor || config?.primaryColor || config?.storefront?.primaryColor || config?.themeColor || DEFAULT_STOREFRONT_COLOR;
  const primaryTextColor = getContrastTextColor(primaryColor);
  const themeStyles = getStorefrontThemeStyles(primaryColor);
  const typography = 'font-sans';
  const baseFontSize = 'text-base';
  const headingWeight = 'font-light';

  const typoClass = typography === 'font-serif' ? 'font-serif' : typography === 'font-mono' ? 'font-mono' : 'font-sans';
  const safeSections = Array.isArray(sections) ? sections : [];
  const isTransparentHeader = headerStyle === 'transparent' && currentPage === 'home' && safeSections[0]?.type === 'hero';



  // Guardar nuevo color de marca en Supabase (solo para el comerciante dueño)
  const handleSaveBrandColor = async (colorToSave) => {
    const finalColor = normalizeHex(colorToSave || primaryColor);
    if (!isMerchantOwner || !workspaceId) return;
    setIsSavingColor(true);
    try {
      const { data: ws, error: fetchErr } = await supabase.from('workspaces').select('config').eq('id', workspaceId).single();
      if (fetchErr) throw fetchErr;

      const currentConfig = ws?.config || {};
      const updatedConfig = {
        ...currentConfig,
        primaryColor: finalColor,
        themeColor: finalColor,
        storefront: {
          ...(currentConfig.storefront || {}),
          primaryColor: finalColor,
          themeColor: finalColor
        }
      };

      const { error: updErr } = await supabase.from('workspaces').update({ config: updatedConfig }).eq('id', workspaceId);
      if (updErr) throw updErr;

      setConfig(prev => ({
        ...prev,
        primaryColor: finalColor,
        themeColor: finalColor,
        storefront: {
          ...(prev?.storefront || {}),
          primaryColor: finalColor,
          themeColor: finalColor
        }
      }));
      setLiveBrandColor(finalColor);
      localStorage.setItem('axon_storefront_color_' + workspaceId, finalColor);

      const cacheKey = `axon_storefront_cache_${slug}`;
      try {
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw) {
          const cachedObj = JSON.parse(cachedRaw);
          cachedObj.config = { ...cachedObj.config, primaryColor: finalColor, themeColor: finalColor };
          localStorage.setItem(cacheKey, JSON.stringify(cachedObj));
        }
      } catch (e) {}

      alert('¡Color de marca guardado exitosamente para tu vitrina!');
      setBrandColorCustomizerOpen(false);
    } catch (err) {
      console.error('Error al guardar color de marca:', err);
      alert('Error al guardar el color de marca: ' + (err.message || 'Error de conexión'));
    } finally {
      setIsSavingColor(false);
    }
  };

  // Renderizador de texto con soporte para negrita (**palabra** o <b>palabra</b>)
  const renderFormattedText = (rawText, defaultWeightClass = '') => {
    if (!rawText) return null;
    const parts = String(rawText).split(/(\*\*.*?\*\*|<b>.*?<\/b>)/g);
    return parts.map((part, idx) => {
      if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('<b>') && part.endsWith('</b>'))) {
        const clean = part.replace(/^\*\*|^\<b\>|\*\*$|\<\/b\>$/g, '');
        return (
          <strong key={idx} className="font-black">
            {clean}
          </strong>
        );
      }
      return <span key={idx} className={defaultWeightClass}>{part}</span>;
    });
  };

  // Función para aplicar/deshacer negrita en la selección de texto
  const applyBoldFormatting = (inputRef, value, setValue) => {
    const input = inputRef?.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    if (start === undefined || end === undefined) return;
    
    const selected = value.substring(start, end);
    let newValue = '';
    if (selected.length > 0) {
      if (selected.startsWith('**') && selected.endsWith('**')) {
        newValue = value.substring(0, start) + selected.slice(2, -2) + value.substring(end);
      } else {
        newValue = value.substring(0, start) + `**${selected}**` + value.substring(end);
      }
    } else {
      newValue = value.substring(0, start) + '**palabra**' + value.substring(end);
    }
    setValue(newValue);
    setTimeout(() => {
      input.focus();
      if (selected.length > 0) {
        input.setSelectionRange(start, start + selected.length + 4);
      } else {
        input.setSelectionRange(start + 2, start + 9);
      }
    }, 50);
  };

  const handleBoldKeyDown = (e, inputRef, value, setValue) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      applyBoldFormatting(inputRef, value, setValue);
    }
  };

  // Abrir editor in-situ de la sección de Ofertas
  const openOffersCustomizer = () => {
    setEditOffersTitle(texts?.offersTitle || 'Ofertas Flash');
    setEditOffersSubtitle(texts?.offersSubtitle || 'Aprovecha los mejores precios y promociones exclusivas de la tienda.');
    setEditOffersTitleColor(resolvedOffersTitleColor);
    setEditOffersSubtitleColor(resolvedOffersSubtitleColor);
    setEditOffersBannerUrl(resolvedOffersBannerUrl || '');
    setOffersCustomizerOpen(true);
  };

  // Subir imagen para banner de ofertas
  const handleBannerFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBanner(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `offers-banner-${Date.now()}.${ext}`;
      const filePath = `storefront/${workspaceId || 'common'}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('ecommerce').upload(filePath, file, { upsert: true });
      if (!uploadError) {
        const { data } = supabase.storage.from('ecommerce').getPublicUrl(filePath);
        if (data?.publicUrl) {
          setEditOffersBannerUrl(data.publicUrl);
          setIsUploadingBanner(false);
          return;
        }
      }
      // Fallback base64
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        setEditOffersBannerUrl(loadEvent.target.result);
        setIsUploadingBanner(false);
      };
      reader.onerror = () => setIsUploadingBanner(false);
      reader.readAsDataURL(file);
    } catch (err) {
      console.warn("Storage upload fallback to DataURL:", err);
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        setEditOffersBannerUrl(loadEvent.target.result);
        setIsUploadingBanner(false);
      };
      reader.onerror = () => setIsUploadingBanner(false);
      reader.readAsDataURL(file);
    }
  };

  // Guardar configuración de Ofertas en Supabase
  const handleSaveOffersConfig = async () => {
    if (!isMerchantOwner || !workspaceId) return;
    setIsSavingOffers(true);
    try {
      const { data: ws, error: fetchErr } = await supabase.from('workspaces').select('config').eq('id', workspaceId).single();
      if (fetchErr) throw fetchErr;

      const currentConfig = ws?.config || {};
      const newTitle = editOffersTitle.trim() || 'Ofertas Flash';
      const newSubtitle = editOffersSubtitle.trim() || 'Aprovecha los mejores precios y promociones exclusivas de la tienda.';
      const newBanner = editOffersBannerUrl.trim() || null;
      const newTitleColor = editOffersTitleColor || '#0f172a';
      const newSubtitleColor = editOffersSubtitleColor || '#64748b';

      const updatedTexts = {
        ...(currentConfig.texts || {}),
        ...(currentConfig.storefront?.texts || {}),
        offersTitle: newTitle,
        offersSubtitle: newSubtitle,
        offersTitleColor: newTitleColor,
        offersSubtitleColor: newSubtitleColor
      };

      const updatedConfig = {
        ...currentConfig,
        offersBannerUrl: newBanner,
        offersTitleColor: newTitleColor,
        offersSubtitleColor: newSubtitleColor,
        texts: updatedTexts,
        storefront: {
          ...(currentConfig.storefront || {}),
          offersBannerUrl: newBanner,
          offersTitleColor: newTitleColor,
          offersSubtitleColor: newSubtitleColor,
          texts: updatedTexts
        }
      };

      const { error: updErr } = await supabase.from('workspaces').update({ config: updatedConfig }).eq('id', workspaceId);
      if (updErr) throw updErr;

      setConfig(prev => ({
        ...prev,
        offersBannerUrl: newBanner,
        offersTitleColor: newTitleColor,
        offersSubtitleColor: newSubtitleColor,
        texts: {
          ...(prev?.texts || {}),
          offersTitle: newTitle,
          offersSubtitle: newSubtitle,
          offersTitleColor: newTitleColor,
          offersSubtitleColor: newSubtitleColor
        },
        storefront: {
          ...(prev?.storefront || {}),
          offersBannerUrl: newBanner,
          offersTitleColor: newTitleColor,
          offersSubtitleColor: newSubtitleColor,
          texts: updatedTexts
        }
      }));

      const cacheKey = `axon_storefront_cache_${slug}`;
      try {
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw) {
          const cachedObj = JSON.parse(cachedRaw);
          cachedObj.config = {
            ...cachedObj.config,
            offersBannerUrl: newBanner,
            offersTitleColor: newTitleColor,
            offersSubtitleColor: newSubtitleColor,
            texts: updatedTexts,
            storefront: {
              ...(cachedObj.config?.storefront || {}),
              offersBannerUrl: newBanner,
              offersTitleColor: newTitleColor,
              offersSubtitleColor: newSubtitleColor,
              texts: updatedTexts
            }
          };
          localStorage.setItem(cacheKey, JSON.stringify(cachedObj));
        }
      } catch (e) {}

      alert('¡Configuración de la sección de ofertas guardada exitosamente!');
      setOffersCustomizerOpen(false);
    } catch (err) {
      console.error('Error al guardar configuración de ofertas:', err);
      alert('Error al guardar: ' + (err.message || 'Error de conexión'));
    } finally {
      setIsSavingOffers(false);
    }
  };

  // ═══ HANDLERS EDICIÓN RÁPIDA DE TIENDA ═══
  const handleOpenStoreInfoModal = () => {
    setEditStoreName(config?.business_name || '');
    setEditStoreBio(config?.description || '');
    setEditStorePhone(config?.phone || config?.expediente?.whatsapp || '');
    setEditStoreAddress(config?.address || '');
    const sched = config?.scheduleProfile || config?.schedule || {};
    setEditStoreOpenTime(sched.openTime || '08:00');
    setEditStoreCloseTime(sched.closeTime || '18:00');
    setStoreInfoModalOpen(true);
  };

  const handleSaveStoreInfo = async () => {
    if (!isMerchantOwner || !workspaceId) return;
    setIsSavingStoreInfo(true);
    try {
      const { data: ws, error: fetchErr } = await supabase.from('workspaces').select('config, name').eq('id', workspaceId).single();
      if (fetchErr) throw fetchErr;

      const curConfig = ws?.config || {};
      const newName = editStoreName.trim() || ws?.name || 'Mi Comercio';
      const newBio = editStoreBio.trim();
      const newPhone = editStorePhone.trim();
      const newAddress = editStoreAddress.trim();

      const updatedSchedule = {
        ...(curConfig.scheduleProfile || curConfig.schedule || {}),
        openTime: editStoreOpenTime || '08:00',
        closeTime: editStoreCloseTime || '18:00'
      };

      const updatedConfig = {
        ...curConfig,
        business_name: newName,
        description: newBio,
        phone: newPhone,
        address: newAddress,
        scheduleProfile: updatedSchedule,
        schedule: updatedSchedule
      };

      const { error: updErr } = await supabase
        .from('workspaces')
        .update({ name: newName, config: updatedConfig })
        .eq('id', workspaceId);

      if (updErr) throw updErr;

      setConfig(prev => ({
        ...prev,
        ...updatedConfig
      }));

      alert('¡Información de la tienda actualizada con éxito!');
      setStoreInfoModalOpen(false);
    } catch (err) {
      console.error('Error al guardar información de tienda:', err);
      alert('Error al guardar: ' + (err.message || 'Error de conexión'));
    } finally {
      setIsSavingStoreInfo(false);
    }
  };

  // ═══ HANDLERS MÓDULO DE EMPLEOS Y CURRÍCULUMS ═══
  const currentJobsRaw = config?.jobs || {};
  const jobsConfig = {
    enabled: currentJobsRaw.enabled !== false,
    openings: Array.isArray(currentJobsRaw.openings) ? currentJobsRaw.openings : [
      {
        id: '1',
        title: 'Personal de Atención y Ventas',
        description: 'Atención al cliente, toma de pedidos en mostrador y despacho de productos.',
        ageRange: '20 a 35 años',
        locationRequired: 'Residenciado en zonas cercanas al establecimiento',
        educationLevel: 'Bachiller',
        requiredDocs: 'Cédula de identidad, RIF vigente, Certificado de manipulación de alimentos',
        requirements: 'Buena presencia, dinamismo y orientación al cliente',
        active: true,
        createdAt: '2026-11-10'
      },
      {
        id: '2',
        title: 'Personal de Cocina y Preparación',
        description: 'Preparación de alimentos a la parrilla, ensamble y apoyo en inventario.',
        ageRange: '20 a 40 años',
        locationRequired: 'Disponibilidad para turnos vespertinos y nocturnos',
        educationLevel: 'Bachiller o TSU',
        requiredDocs: 'Cédula, RIF, Curso de manipulación de alimentos vigente',
        requirements: 'Mínimo 6 meses de experiencia en comida rápida o plancha',
        active: true,
        createdAt: '2026-11-10'
      }
    ],
    applications: Array.isArray(currentJobsRaw.applications) ? currentJobsRaw.applications : []
  };

  const handleOpenCreateOpening = () => {
    setEditingOpeningId(null);
    setOpeningTitle('');
    setOpeningDescription('');
    setOpeningAgeRange('20 a 35 años');
    setOpeningLocation('Residenciado en zonas cercanas');
    setOpeningEducation('Bachiller');
    setOpeningDocs('Cédula de identidad, RIF vigente, Manipulación de alimentos');
    setOpeningRequirements('Puntualidad, ganas de trabajar y buena actitud');
  };

  const handleOpenEditOpening = (op) => {
    setEditingOpeningId(op.id);
    setOpeningTitle(op.title || '');
    setOpeningDescription(op.description || '');
    setOpeningAgeRange(op.ageRange || '');
    setOpeningLocation(op.locationRequired || '');
    setOpeningEducation(op.educationLevel || '');
    setOpeningDocs(op.requiredDocs || '');
    setOpeningRequirements(op.requirements || '');
  };

  const handleSaveJobOpening = async (e) => {
    e?.preventDefault();
    if (!openingTitle.trim() || !isMerchantOwner || !workspaceId) {
      alert('Por favor ingresa al menos el título del cargo.');
      return;
    }

    try {
      setIsSavingJobsConfig(true);
      const { data: ws } = await supabase.from('workspaces').select('config').eq('id', workspaceId).single();
      const curConfig = ws?.config || {};
      const curJobs = curConfig.jobs || {};
      const curOpenings = Array.isArray(curJobs.openings) ? curJobs.openings : [...jobsConfig.openings];

      let updatedOpenings;
      if (editingOpeningId) {
        // Actualizar vacante existente
        updatedOpenings = curOpenings.map(op => {
          if (op.id === editingOpeningId) {
            return {
              ...op,
              title: openingTitle.trim(),
              description: openingDescription.trim(),
              ageRange: openingAgeRange.trim(),
              locationRequired: openingLocation.trim(),
              educationLevel: openingEducation.trim(),
              requiredDocs: openingDocs.trim(),
              requirements: openingRequirements.trim(),
              updatedAt: new Date().toISOString()
            };
          }
          return op;
        });
      } else {
        // Crear nueva vacante
        const newOpening = {
          id: `op_${Date.now()}`,
          title: openingTitle.trim(),
          description: openingDescription.trim(),
          ageRange: openingAgeRange.trim(),
          locationRequired: openingLocation.trim(),
          educationLevel: openingEducation.trim(),
          requiredDocs: openingDocs.trim(),
          requirements: openingRequirements.trim(),
          active: true,
          createdAt: new Date().toISOString()
        };
        updatedOpenings = [newOpening, ...curOpenings];
      }

      const updatedConfig = {
        ...curConfig,
        jobs: {
          ...curJobs,
          enabled: true,
          openings: updatedOpenings
        }
      };

      await supabase.from('workspaces').update({ config: updatedConfig }).eq('id', workspaceId);
      setConfig(prev => ({ ...prev, jobs: updatedConfig.jobs }));
      alert(editingOpeningId ? '¡Oferta de trabajo actualizada con éxito!' : '¡Nueva oferta de trabajo agregada!');
      handleOpenCreateOpening();
    } catch (err) {
      console.error(err);
      alert('Error al guardar vacante: ' + err.message);
    } finally {
      setIsSavingJobsConfig(false);
    }
  };

  const handleDeleteJobOpening = async (openingId) => {
    if (!isMerchantOwner || !workspaceId) return;
    if (!window.confirm('¿Seguro que deseas eliminar esta oferta de trabajo? Ya no aparecerá en tu vitrina.')) return;

    try {
      setIsSavingJobsConfig(true);
      const { data: ws } = await supabase.from('workspaces').select('config').eq('id', workspaceId).single();
      const curConfig = ws?.config || {};
      const curJobs = curConfig.jobs || {};
      const curOpenings = Array.isArray(curJobs.openings) ? curJobs.openings : [...jobsConfig.openings];
      const updatedOpenings = curOpenings.filter(op => op.id !== openingId);

      const updatedConfig = {
        ...curConfig,
        jobs: {
          ...curJobs,
          openings: updatedOpenings
        }
      };

      await supabase.from('workspaces').update({ config: updatedConfig }).eq('id', workspaceId);
      setConfig(prev => ({ ...prev, jobs: updatedConfig.jobs }));
      if (editingOpeningId === openingId) {
        handleOpenCreateOpening();
      }
      alert('Oferta de trabajo eliminada exitosamente.');
    } catch (err) {
      console.error(err);
      alert('Error al eliminar vacante: ' + err.message);
    } finally {
      setIsSavingJobsConfig(false);
    }
  };

  const handleToggleJobOpening = async (openingId) => {
    if (!isMerchantOwner || !workspaceId) return;
    try {
      const { data: ws } = await supabase.from('workspaces').select('config').eq('id', workspaceId).single();
      const curConfig = ws?.config || {};
      const curJobs = curConfig.jobs || {};
      const curOpenings = Array.isArray(curJobs.openings) ? curJobs.openings : [...jobsConfig.openings];
      const currentOpenings = curOpenings.map(op => 
        op.id === openingId ? { ...op, active: !op.active } : op
      );

      const updatedConfig = {
        ...curConfig,
        jobs: {
          ...curJobs,
          openings: currentOpenings
        }
      };

      await supabase.from('workspaces').update({ config: updatedConfig }).eq('id', workspaceId);
      setConfig(prev => ({ ...prev, jobs: updatedConfig.jobs }));
    } catch (err) {
      console.error(err);
      alert('Error al actualizar estado de la vacante: ' + err.message);
    }
  };

  const handleDeleteApplication = async (applicationId) => {
    if (!isMerchantOwner || !workspaceId) return;
    if (!window.confirm('¿Deseas descartar o eliminar esta postulación?')) return;

    try {
      const { data: ws } = await supabase.from('workspaces').select('config').eq('id', workspaceId).single();
      const curConfig = ws?.config || {};
      const curJobs = curConfig.jobs || {};
      const curApps = Array.isArray(curJobs.applications) ? curJobs.applications : [];
      const updatedApps = curApps.filter(app => app.id !== applicationId);

      const updatedConfig = {
        ...curConfig,
        jobs: {
          ...curJobs,
          applications: updatedApps
        }
      };

      await supabase.from('workspaces').update({ config: updatedConfig }).eq('id', workspaceId);
      setConfig(prev => ({ ...prev, jobs: updatedConfig.jobs }));
      alert('Postulación descartada.');
    } catch (err) {
      console.error(err);
      alert('Error al eliminar postulación: ' + err.message);
    }
  };

  const handleSubmitApplication = async (e) => {
    e?.preventDefault();
    if (!applicantName.trim() || !applicantPhone.trim()) {
      alert('Por favor ingresa tu nombre completo y número telefónico.');
      return;
    }
    if (!applicantCvFile) {
      alert('Por favor adjunta tu currículum vitae (PDF o imagen).');
      return;
    }

    setIsSubmittingJob(true);
    try {
      let cvUrl = '';
      try {
        const fileExt = applicantCvFile.name ? applicantCvFile.name.split('.').pop() : 'pdf';
        const fileName = `cv_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `resumes/${workspaceId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('ecommerce')
          .upload(filePath, applicantCvFile, { upsert: true });

        if (!uploadError) {
          const { data: pubData } = supabase.storage.from('ecommerce').getPublicUrl(filePath);
          cvUrl = pubData?.publicUrl || '';
        }
      } catch (_) {}

      if (!cvUrl) {
        cvUrl = await new Promise((res) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result);
          reader.readAsDataURL(applicantCvFile);
        });
      }

      const newApplication = {
        id: `app_${Date.now()}`,
        applicantName: applicantName.trim(),
        phone: applicantPhone.trim(),
        age: applicantAge.trim(),
        location: applicantLocation.trim(),
        education: applicantEducation || 'Bachiller',
        hasDocuments: Boolean(applicantHasDocuments),
        position: applicantPosition || selectedJobOpening?.title || 'Postulación Abierta',
        notes: applicantNotes.trim(),
        cvUrl,
        createdAt: new Date().toISOString()
      };

      const { data: ws } = await supabase.from('workspaces').select('config').eq('id', workspaceId).single();
      const curConfig = ws?.config || {};
      const curJobs = curConfig.jobs || {};
      const updatedApplications = [newApplication, ...(curJobs.applications || [])];

      const updatedConfig = {
        ...curConfig,
        jobs: {
          ...curJobs,
          enabled: true,
          applications: updatedApplications
        }
      };

      await supabase.from('workspaces').update({ config: updatedConfig }).eq('id', workspaceId);

      setConfig(prev => ({
        ...prev,
        jobs: updatedConfig.jobs
      }));

      alert('¡Tu postulación y currículum han sido enviados al comercio con éxito! Pronto te contactarán.');
      setJobModalOpen(false);
      setApplicantName('');
      setApplicantPhone('');
      setApplicantAge('');
      setApplicantLocation('');
      setApplicantNotes('');
      setApplicantCvFile(null);
      setSelectedJobOpening(null);
    } catch (err) {
      console.error(err);
      alert('Error al enviar postulación: ' + err.message);
    } finally {
      setIsSubmittingJob(false);
    }
  };

  // Auth Gate: Clientes autenticados, dueño de vitrina y comerciantes visitantes pueden ver catálogo completo y precios
  const isUserAllowedToSeePrices = currentCustomer || isMerchantOwner || isAnyMerchantLoggedIn;

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/explorar');
    }
  };

  const renderAuthModal = () => {
    if (!showAuthModal) return null;
    const storeName = config?.business_name || slug || 'la tienda';
    return (
      <CustomerAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode={authGateMode || 'login'}
        storeName={storeName}
        onSuccess={(user) => {
          setCurrentCustomer(user);
          setShowAuthModal(false);
          const cleanPhone = (user.phone || '').replace(/\D/g, '');
          const cleanDoc = (user.docId || user.doc_id || '').replace(/\D/g, '');
          if (!user.name || user.name === user.email?.split('@')[0] || cleanPhone.length < 11 || cleanDoc.length < 6 || !user.address) {
            setIsWizardOpen(true);
          }
        }}
      />
    );
  };

  const recentProducts = products.slice(0, 8);
  const nowTime = Date.now();
  const offerProducts = products.filter(p => {
    if (!p.is_offer || Number(p.is_offer) === 0) return false;
    const endDate = p.metadata?.offer_end_date;
    if (endDate) {
      const endMs = new Date(endDate).getTime();
      if (!isNaN(endMs) && endMs < nowTime) return false;
    }
    return true;
  });
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
    <div 
      className={`min-h-screen w-full flex flex-col items-center bg-slate-100/70 text-slate-900 relative overflow-x-hidden ${typoClass} ${baseFontSize}`}
      style={{
        '--store-primary': primaryColor,
        '--store-primary-contrast': primaryTextColor,
        '--store-primary-subtle': hexToRgba(primaryColor, 0.12),
        '--store-primary-border': hexToRgba(primaryColor, 0.3),
        '--store-primary-glow': hexToRgba(primaryColor, 0.25)
      }}
    >
      
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
        <div 
          className="w-full text-white text-[10px] sm:text-xs font-black uppercase tracking-widest py-2 px-3 sm:px-4 flex flex-col sm:flex-row items-center justify-between gap-2 z-[100] relative shadow-md transition-all"
          style={{ background: themeStyles.bannerGradient }}
        >
          <div className="flex items-center gap-2">
            <Store size={14} className="shrink-0" />
            <span>Modo Administrador Activo - Estás viendo tu tienda</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => {
                setCustomHexInput(primaryColor);
                setBrandColorCustomizerOpen(true);
              }}
              className="bg-white hover:bg-slate-100 text-slate-950 px-3 py-1 rounded-full transition-all flex items-center gap-1.5 shadow-sm font-black text-[10px] sm:text-[11px] cursor-pointer hover:scale-105"
              title="Personalizar color de marca de tu vitrina"
            >
              <Palette size={13} style={{ color: primaryColor }} />
              <span>Color Vitrina</span>
              <span className="w-3.5 h-3.5 rounded-full border border-black/25 shrink-0 shadow-2xs" style={{ backgroundColor: primaryColor }} />
            </button>
            <button 
              onClick={() => navigate('/dashboard')} 
              className="bg-black/80 hover:bg-black text-white px-3.5 py-1 rounded-full transition-colors flex items-center gap-1.5 shadow-sm font-bold text-[10px] sm:text-[11px] cursor-pointer"
            >
              <LayoutTemplate size={12} /> Volver al Panel
            </button>
          </div>
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
          

          <div className="flex items-center gap-2.5">
             <button onClick={handleGoBack} className="hidden sm:flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-zinc-500 hover:text-zinc-900 transition-colors" style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}>
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
            
            {/* Hero Cover Header - Portada Full Bleed extendida hacia abajo para máxima vista panorámica */}
            <div className="relative z-0 w-full h-76 sm:h-96 md:h-[440px] overflow-hidden bg-slate-900 border-b border-slate-200/80 shadow-xs flex items-center justify-center">
              
              {/* Botón flotante para salir directamente al mercado general de comercios */}
              <button 
                onClick={() => navigate('/explorar', { replace: true })}
                className="absolute top-4 left-4 z-40 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md text-white border border-white/20 shadow-lg flex items-center justify-center transition-all cursor-pointer active:scale-90"
                title="Salir al Mercado"
              >
                <ChevronLeft size={22} className="stroke-[2.5] -ml-0.5" />
              </button>

              {/* Botón flotante de Perfil si el usuario está autenticado */}
              {currentCustomer && (
                <button 
                  onClick={() => navigate('/profile')} 
                  className="absolute top-4 right-4 z-40 transition-transform hover:scale-105" 
                  title="Mi Perfil"
                >
                  {currentCustomer.profile_pic ? (
                    <img src={resolveImageUrl(currentCustomer.profile_pic)} alt="Perfil" className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-md" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-orange-500 text-white font-black text-xs flex items-center justify-center border-2 border-white shadow-md">
                      {(currentCustomer.name || currentCustomer.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>
              )}

              {resolvedCoverUrl ? (
                <>
                  {/* Fondo ambiental desenfocado para fotos que no sean panorámicas */}
                  <img 
                    src={resolveImageUrl(resolvedCoverUrl)} 
                    alt="" 
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover object-center blur-md opacity-35 scale-110 pointer-events-none select-none" 
                  />
                  {/* Portada principal centrada con mayor campo visual */}
                  <img 
                    src={resolveImageUrl(resolvedCoverUrl)} 
                    alt="Cover" 
                    className="w-full h-full object-cover object-center block relative z-0" 
                  />
                  {/* Gradiente sutil inferior para contraste y profundidad cinematográfica */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent pointer-events-none z-10" />
                </>
              ) : (
                <div 
                  className="w-full h-full flex items-center justify-center relative transition-all"
                  style={{ background: themeStyles.coverGradient }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />
                  <Store size={56} className="text-white/60 drop-shadow-sm" />
                </div>
              )}
            </div>

            {/* Perfil del Comerciante (Estilo Instagram - Debajo de la Portada) */}
            <div className="relative z-20 bg-white border-b border-slate-200/80 px-4 md:px-8 pt-3 pb-4 shadow-xs">
              <div className="max-w-[700px] mx-auto w-full">
                
                {/* Fila Superior: Avatar a la izquierda, Estadísticas a la derecha */}
                <div className="flex items-center gap-4 sm:gap-6">
                  {/* Avatar con aro interactivo tipo WhatsApp / Stories */}
                  <div className="relative z-30 shrink-0 -mt-11 sm:-mt-13">
                    {hasActiveStatuses ? (
                      <div 
                        onClick={() => markStatusAsViewed(0)}
                        className={`relative rounded-full cursor-pointer hover:scale-105 active:scale-95 transition-all p-[3.5px] ${
                          hasViewedStatus
                            ? 'bg-zinc-400'
                            : 'shadow-md ring-2 ring-white/40'
                        }`}
                        style={!hasViewedStatus ? { background: themeStyles.bannerGradient } : {}}
                        title={hasViewedStatus ? 'Estado ya visto' : 'Toca para ver el estado del comercio'}
                      >
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-white overflow-hidden bg-white flex items-center justify-center">
                          {resolvedLogoUrl ? (
                            <img 
                              src={resolveImageUrl(resolvedLogoUrl)} 
                              alt="Logo" 
                              className="w-full h-full object-cover object-center rounded-full block" 
                            />
                          ) : (
                            <div 
                              className="w-full h-full flex items-center justify-center transition-colors"
                              style={{ backgroundColor: themeStyles.subtleBg, color: primaryColor }}
                            >
                              <Store size={36} />
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => {
                          if (merchantStatuses && merchantStatuses.length > 0) {
                            markStatusAsViewed(0);
                          }
                        }}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all"
                        title={merchantStatuses && merchantStatuses.length > 0 ? "Toca para ver historias del comercio" : (config?.business_name || "Tienda")}
                      >
                        {resolvedLogoUrl ? (
                          <img 
                            src={resolveImageUrl(resolvedLogoUrl)} 
                            alt="Logo" 
                            className="w-full h-full object-cover object-center rounded-full block" 
                          />
                        ) : (
                          <div 
                            className="w-full h-full flex items-center justify-center transition-colors"
                            style={{ backgroundColor: themeStyles.subtleBg, color: primaryColor }}
                          >
                            <Store size={36} />
                          </div>
                        )}
                      </div>
                    )}

                    {config?.is_verified && (
                      <div className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-1 border-2 border-white flex items-center justify-center shadow-md z-40" title="Comercio Verificado">
                        <CheckCircle2 size={14} className="text-white" strokeWidth={3} />
                      </div>
                    )}
                  </div>

                  {/* Estadísticas Horizontales a la derecha (Estilo Instagram) */}
                  <div className="flex-1 flex justify-around items-center text-center">
                    <div 
                      onClick={() => setProfileSubTab('media')}
                      className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity active:scale-95"
                      title="Ver publicaciones"
                    >
                      <span className="font-black text-base sm:text-lg text-slate-900 leading-tight">
                        {merchantPublications.length}
                      </span>
                      <span className="text-slate-500 text-[11px] sm:text-xs font-semibold">Anuncios</span>
                    </div>
                    {/* Seguidores */}
                    <div className="flex flex-col items-center px-2 select-none">
                      <span className="font-black text-base sm:text-lg text-slate-900 leading-tight">
                        {followersCount}
                      </span>
                      <span className="text-slate-500 text-[11px] sm:text-xs font-semibold">Seguidores</span>
                    </div>
                    {/* Me gusta */}
                    <div className="flex flex-col items-center select-none">
                      <span className="font-black text-base sm:text-lg text-slate-900 leading-tight">
                        {likesCount}
                      </span>
                      <span className="text-slate-500 text-[11px] sm:text-xs font-semibold">Me gusta</span>
                    </div>
                  </div>
                </div>

                {/* Datos de la Tienda: Nombre, Handle, Calificar, EM, Bio y Dirección */}
                <div className="mt-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
                      {config?.business_name || 'Mi Tienda'}
                    </h1>
                  </div>
                  <p className="font-extrabold text-xs sm:text-sm" style={{ color: primaryColor }}>
                    @{slug}
                  </p>

                  {/* Rating y Badge EM (Botón Calificar ocultado temporalmente por solicitud) */}
                  {config?.has_enminutos_alliance && (
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <div className="inline-flex items-center gap-1.5 bg-slate-950 text-white px-3 py-1 rounded-full shadow-2xs">
                        <div className="flex items-center font-black tracking-tighter text-xs">
                          <span className="text-red-500">E</span>
                          <span className="text-red-500">M</span>
                          <Zap size={11} className="fill-yellow-400 text-yellow-400 ml-0.5" />
                        </div>
                        <span className="text-[10px] font-black tracking-wide">en minutos</span>
                      </div>
                    </div>
                  )}

                  {/* Descripción / Bio */}
                  {(config?.description || config?.expediente?.description) && (
                    <p className="text-xs sm:text-sm text-slate-700 mt-2 leading-relaxed whitespace-pre-line">
                      {config?.description || config?.expediente?.description}
                    </p>
                  )}

                  {/* Categorías / Rubros oficiales del comercio (descarta 'almacén' y no duplica la dirección del mapa) */}
                  {(() => {
                    const isInvalid = (val) => !val || typeof val !== 'string' || /^(almacen|almacén|deposito|depósito|bodega)$/i.test(val.trim());
                    const rawCats = Array.isArray(config?.marketplaceCategories) && config.marketplaceCategories.length > 0
                      ? config.marketplaceCategories
                      : (Array.isArray(config?.categories) && config.categories.length > 0
                        ? config.categories
                        : (resolveStoreCategory(config) ? [resolveStoreCategory(config)] : []));
                    const resolvedCategories = rawCats.filter(c => !isInvalid(c));

                    return resolvedCategories.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {resolvedCategories.map((cat, idx) => (
                          <div 
                            key={idx}
                            className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg w-fit transition-all shadow-2xs"
                            style={{ 
                              backgroundColor: themeStyles.subtleBg, 
                              color: primaryColor,
                              border: `1px solid ${primaryColor}30`
                            }}
                          >
                            <Tag size={13} className="shrink-0" />
                            <span className="capitalize">{cat}</span>
                          </div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Botones de Acción (+ Seguir, Contactar, 🔗, 📷) */}
                <div className="flex gap-2.5 mt-3.5 w-full">
                  <button 
                    onClick={async () => {
                      const followerId = currentCustomer?.id || activeMerchantWs || activeMerchantSlug;
                      if (!followerId) {
                        setShowAuthModal(true);
                        return;
                      }
                      if (!workspaceId) return;
                      const newFollowing = !isFollowing;
                      setIsFollowing(newFollowing);
                      setFollowersCount(prev => newFollowing ? prev + 1 : Math.max(0, prev - 1));
                      try {
                        const res = await toggleFollowStore(workspaceId, followerId);
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
                    style={!isFollowing ? themeStyles.buttonStyle : {}}
                    className={`flex-1 ${isFollowing ? 'bg-slate-100 text-slate-700 border border-slate-300' : ''} py-2.5 rounded-xl font-extrabold transition-all text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95`}
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
                      const cleanWaNumber = resolveStoreWhatsApp(config);
                      if (cleanWaNumber) {
                        const storeName = config?.business_name || 'la tienda';
                        const url = buildWhatsAppUrl(cleanWaNumber, `Hola ${storeName}, te contacto desde tu vitrina oficial en AxonMarket y quisiera información.`);
                        if (url) {
                          window.open(url, '_blank', 'noopener,noreferrer');
                          return;
                        }
                      }
                      
                      const phoneFallback = config?.phone || config?.expediente?.phone;
                      if (phoneFallback) {
                        window.location.href = `tel:${phoneFallback}`;
                      } else {
                        alert('El comercio no tiene un número telefónico o de WhatsApp registrado.');
                      }
                    }}
                    className="flex-1 bg-white py-2.5 rounded-xl font-extrabold transition-all text-sm shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    style={{
                      border: `1.5px solid ${primaryColor ? primaryColor + '50' : '#e2e8f0'}`,
                      color: primaryColor || '#1e293b'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = primaryColor ? primaryColor + '12' : '#f8fafc';
                      e.currentTarget.style.borderColor = primaryColor || '#ea580c';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = primaryColor ? primaryColor + '50' : '#e2e8f0';
                    }}
                  >
                    Contactar
                  </button>
                  <button 
                    className="p-2.5 bg-white rounded-xl transition-all flex items-center justify-center shadow-xs cursor-pointer active:scale-95"
                    style={{
                      border: `1.5px solid ${primaryColor ? primaryColor + '50' : '#e2e8f0'}`,
                      color: primaryColor || '#334155'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = primaryColor ? primaryColor + '12' : '#f8fafc';
                      e.currentTarget.style.borderColor = primaryColor || '#ea580c';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                      e.currentTarget.style.borderColor = primaryColor ? primaryColor + '50' : '#e2e8f0';
                    }}
                    onClick={() => { navigator.clipboard.writeText(window.location.href); alert('¡Enlace copiado!'); }}
                    title="Copiar enlace"
                  >
                    <Link size={18} />
                  </button>
                  <div className="relative">
                    <button 
                      onClick={() => setShowSocialMenu(!showSocialMenu)} 
                      className="p-2.5 bg-white rounded-xl transition-all flex items-center justify-center shadow-xs cursor-pointer active:scale-95"
                      style={{
                        border: `1.5px solid ${primaryColor ? primaryColor + '50' : '#e2e8f0'}`,
                        color: primaryColor || '#334155'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = primaryColor ? primaryColor + '12' : '#f8fafc';
                        e.currentTarget.style.borderColor = primaryColor || '#ea580c';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.borderColor = primaryColor ? primaryColor + '50' : '#e2e8f0';
                      }}
                      title="Redes sociales"
                    >
                      <Camera size={18} />
                    </button>
                    <AnimatePresence>
                      {showSocialMenu && ((config?.socialLinks && Object.values(config.socialLinks).some(val => val)) || resolveStoreWhatsApp(config)) && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-12 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 min-w-[190px] z-[100]"
                        >
                          {config?.socialLinks?.instagram && (
                            <a href={config.socialLinks.instagram.includes('http') ? config.socialLinks.instagram : `https://instagram.com/${config.socialLinks.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 transition-colors text-slate-700 hover:text-orange-600">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] text-pink-500"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                              <span className="text-sm font-bold">Instagram</span>
                            </a>
                          )}
                          {config?.socialLinks?.tiktok && (
                            <a href={config.socialLinks.tiktok.includes('http') ? config.socialLinks.tiktok : `https://tiktok.com/@${config.socialLinks.tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 transition-colors text-slate-700 hover:text-orange-600">
                              <Music2 size={18} className="text-slate-900" />
                              <span className="text-sm font-bold">TikTok</span>
                            </a>
                          )}
                          {config?.socialLinks?.facebook && (
                            <a href={config.socialLinks.facebook.includes('http') ? config.socialLinks.facebook : `https://facebook.com/${config.socialLinks.facebook}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 transition-colors text-slate-700 hover:text-orange-600">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] text-blue-500"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                              <span className="text-sm font-bold">Facebook</span>
                            </a>
                          )}
                          {(config?.socialLinks?.whatsapp || resolveStoreWhatsApp(config)) && (
                            <a 
                              href={buildWhatsAppUrl(config?.socialLinks?.whatsapp || resolveStoreWhatsApp(config), `Hola ${config?.business_name || ''}, te contacto desde tu vitrina oficial en AxonMarket.`)} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 transition-colors text-slate-700 hover:text-orange-600"
                            >
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

              </div>
            </div>

            {/* Profile Content Container (Estados y Sub-Pestañas Inteligentes) */}
            <div className="relative z-10 px-4 md:px-8 max-w-[1200px] mx-auto w-full flex flex-col pt-3">

              {/* Sección de Estados Permanentes del Comercio (Carrusel Superior "Estados y Promociones") */}
              {(permanentStatuses.length > 0 || isMerchantOwner) && (
                <div className="mt-5 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }}></span>
                      <h3 className="text-xs font-black tracking-wider uppercase text-slate-900 flex items-center gap-1.5" style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}>
                        <span>Historias</span>
                      </h3>
                    </div>
                    {isMerchantOwner && (
                      <button
                        onClick={() => navigate('/social-feed?type=status&create=true')}
                        className="text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer hover:opacity-85"
                        style={{ color: primaryColor, fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif" }}
                      >
                        <Plus size={13} className="stroke-[2.5]" />
                        <span>Nueva historia</span>
                      </button>
                    )}
                  </div>

                  <div className="flex overflow-x-auto gap-3 py-1 px-0.5 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {permanentStatuses.map((status, idx) => (
                      <div 
                        key={status.id || idx}
                        onClick={() => markStatusAsViewed(idx, 'permanent')}
                        className="relative w-24 sm:w-28 h-36 sm:h-40 rounded-2xl overflow-hidden cursor-pointer group snap-start shrink-0 select-none shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.03] active:scale-95 border border-zinc-200/80 bg-zinc-900"
                        title={`Ver estado permanente: ${status.caption || status.name}`}
                      >
                        {/* Imagen o Video de fondo / Preview del Estado */}
                        {(status.media_type === 'video' || (typeof status.mediaUrl === 'string' && /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(status.mediaUrl))) ? (
                          <video 
                            src={resolveImageUrl(status.mediaUrl || status.avatar)} 
                            muted 
                            playsInline 
                            loop 
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
                          />
                        ) : (
                          <img 
                            src={resolveImageUrl(status.mediaUrl || status.avatar)} 
                            alt="" 
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = config?.coverUrl || config?.logoUrl || 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&q=80';
                            }}
                          />
                        )}

                        {/* Degradado oscuro para que el texto y avatar resalten como en WhatsApp/Instagram */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40" />

                        {/* Avatar del comerciante en la esquina superior izquierda */}
                        <div className="absolute top-2 left-2 w-7 h-7 rounded-full p-[1.5px] shadow-md" style={{ background: `linear-gradient(135deg, ${primaryColor}, #f59e0b)` }}>
                          <div className="w-full h-full rounded-full bg-white overflow-hidden">
                            {status.avatar ? (
                              <img 
                                src={resolveImageUrl(status.avatar)} 
                                alt="" 
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-[10px]" style={{ color: primaryColor }}>
                                <Store size={14} />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Icono de Play en la esquina superior derecha */}
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black/50 backdrop-blur-xs text-white flex items-center justify-center shadow-xs border border-white/20">
                          <Play size={10} fill="currentColor" className="translate-x-[0.5px]" style={{ color: primaryColor }} />
                        </div>

                        {/* Contenido / Título y etiqueta de permanente */}
                        <div className="absolute bottom-2 left-2 right-2 flex flex-col">
                          <span className="text-[11px] font-bold text-white truncate drop-shadow-md leading-tight group-hover:text-amber-300 transition-colors">
                            {status.caption || status.name}
                          </span>
                          <span className="text-[9px] font-bold drop-shadow-xs flex items-center gap-1 mt-0.5" style={{ color: primaryColor }}>
                            <span>📌 Destacado</span>
                          </span>
                        </div>
                      </div>
                    ))}

                    {permanentStatuses.length === 0 && isMerchantOwner && (
                      <div 
                        onClick={() => navigate('/social-feed?type=status&permanent=true&create=true')}
                        className="w-28 h-36 sm:h-40 rounded-2xl border-2 border-dashed border-slate-300 hover:border-orange-500 bg-slate-50 hover:bg-orange-50/40 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all shrink-0 p-3 text-center group"
                      >
                        <div className="w-10 h-10 rounded-full text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform" style={{ backgroundColor: primaryColor }}>
                          <Plus size={20} strokeWidth={2.5} />
                        </div>
                        <span className="text-xs font-bold text-slate-700">Fijar Promo</span>
                        <span className="text-[10px] text-slate-400 leading-tight">Permanente</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUB-PESTAÑAS INTELIGENTES: 3 ÍCONOS (Información vs Publicaciones vs Estados 24h) */}
              <div className="mt-5 border-b border-slate-200 bg-white rounded-t-2xl shadow-xs overflow-hidden">
                <div className="grid grid-cols-3 max-w-[480px] mx-auto">
                  {/* Ícono 1: Información del Comerciante */}
                  <button
                    type="button"
                    onClick={() => setProfileSubTab('info')}
                    className={`py-3.5 px-1 sm:px-2 flex items-center justify-center gap-1 sm:gap-1.5 min-w-0 relative transition-all cursor-pointer select-none ${
                      profileSubTab === 'info' ? 'text-slate-900 font-black' : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title="Información del Comerciante"
                  >
                    <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                      <Info size={15} className="stroke-[2.2] shrink-0" />
                      <span className="text-[10px] sm:text-xs uppercase tracking-tight sm:tracking-wider font-extrabold truncate">Información</span>
                    </div>
                    {profileSubTab === 'info' && (
                      <motion.div 
                        layoutId="profileSubTabIndicator"
                        className="absolute bottom-0 left-2 right-2 sm:left-3 sm:right-3 h-[2.5px] rounded-full" 
                        style={{ backgroundColor: primaryColor }}
                      />
                    )}
                  </button>

                  {/* Ícono 2: Anuncios (Fotos y Videos con ícono Film profesional) */}
                  <button
                    type="button"
                    onClick={() => setProfileSubTab('media')}
                    className={`py-3.5 px-1 sm:px-2 flex items-center justify-center gap-1 sm:gap-1.5 min-w-0 relative transition-all cursor-pointer select-none ${
                      profileSubTab === 'media' ? 'text-slate-900 font-black' : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title="Anuncios"
                  >
                    <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                      <Film size={15} className="stroke-[2.2] shrink-0" />
                      <span className="text-[10px] sm:text-xs uppercase tracking-tight sm:tracking-wider font-extrabold truncate">Anuncios</span>
                      {merchantPublications.length > 0 && (
                        <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 shrink-0">
                          {merchantPublications.length}
                        </span>
                      )}
                    </div>
                    {profileSubTab === 'media' && (
                      <motion.div 
                        layoutId="profileSubTabIndicator"
                        className="absolute bottom-0 left-2 right-2 sm:left-3 sm:right-3 h-[2.5px] rounded-full" 
                        style={{ backgroundColor: primaryColor }}
                      />
                    )}
                  </button>

                  {/* Ícono 3: Estados de 24 Horas WhatsApp Style */}
                  <button
                    type="button"
                    onClick={() => setProfileSubTab('statuses')}
                    className={`py-3.5 px-1 sm:px-2 flex items-center justify-center gap-1 sm:gap-1.5 min-w-0 relative transition-all cursor-pointer select-none ${
                      profileSubTab === 'statuses' ? 'text-slate-900 font-black' : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title="Estados de 24 Horas"
                  >
                    <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                      <Clock size={15} className="stroke-[2.2] shrink-0" />
                      <span className="text-[10px] sm:text-xs uppercase tracking-tight sm:tracking-wider font-extrabold truncate">Estados</span>
                      {ephemeralStatuses.length > 0 && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      )}
                    </div>
                    {profileSubTab === 'statuses' && (
                      <motion.div 
                        layoutId="profileSubTabIndicator"
                        className="absolute bottom-0 left-2 right-2 sm:left-3 sm:right-3 h-[2.5px] rounded-full" 
                        style={{ backgroundColor: primaryColor }}
                      />
                    )}
                  </button>
                </div>
              </div>

              {/* Contenedor de Contenido de Pestaña con Soporte para Swipe Táctil Horizontal */}
              <div 
                onTouchStart={handleProfileTouchStart}
                onTouchEnd={handleProfileTouchEnd}
                className="transition-all"
              >
                {/* PESTAÑA 1: INFORMACIÓN */}
                {profileSubTab === 'info' && (
                  <div className="space-y-4 pt-3 pb-8">
                    {/* Información */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                      <div className="flex items-center justify-between mb-2">
                        <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                          <Building2 size={18} style={{ color: primaryColor }} />
                          <span>Información</span>
                        </h2>
                        {isMerchantOwner && (
                          <button
                            type="button"
                            onClick={handleOpenStoreInfoModal}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-zinc-950 transition-all shadow-2xs active:scale-95 cursor-pointer"
                          >
                            <Edit2 size={13} />
                            <span>Editar Información</span>
                          </button>
                        )}
                      </div>
                      <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                        {config?.description || config?.expediente?.description || 'La mejor calidad para ti.'}
                      </div>
                    </div>

                    {/* Horario */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                      <div className="flex justify-between items-center mb-3">
                        <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                          <Clock size={18} style={{ color: primaryColor }} className="shrink-0" />
                          <span>¿A qué hora abrimos?</span>
                        </h2>
                        {(config?.scheduleProfile?.workDays || config?.schedule?.workDays) && (
                          <button 
                            type="button"
                            onClick={() => setShowFullSchedule(!showFullSchedule)}
                            className="text-xs font-bold transition-colors cursor-pointer px-2.5 py-1 rounded-lg"
                            style={{ color: primaryColor, backgroundColor: `${primaryColor}14` }}
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
                                      ? 'border' 
                                      : 'border-b border-slate-200/50 last:border-0 hover:bg-white'
                                  }`}
                                  style={isToday ? { borderColor: `${primaryColor}40`, backgroundColor: `${primaryColor}0d` } : {}}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`capitalize text-xs sm:text-sm ${
                                      isToday 
                                        ? 'font-bold' 
                                        : 'font-medium text-slate-700'
                                    }`} style={isToday ? { color: primaryColor } : {}}>
                                      {day}
                                    </span>
                                    {isToday && (
                                      <span className="text-[10px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded-md text-white leading-none shadow-xs" style={{ backgroundColor: primaryColor }}>
                                        Hoy
                                      </span>
                                    )}
                                  </div>
                                  <span className="tracking-wide">
                                    {isOpen ? (
                                      <span className="text-xs sm:text-sm font-bold text-slate-900">
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
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                      <div className="flex justify-between items-center mb-3">
                        <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                          <MapPin size={18} style={{ color: primaryColor }} className="shrink-0" />
                          <span>Encuéntranos en</span>
                        </h2>
                        <button 
                          type="button"
                          onClick={() => {
                            const lat = config?.location?.lat || config?.expediente?.gps?.lat;
                            const lng = config?.location?.lng || config?.expediente?.gps?.lng;
                            const addr = config?.address || config?.location?.address || config?.expediente?.address || config?.business_name || 'Venezuela';
                            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lat && lng ? `${lat},${lng}` : addr)}`);
                          }} 
                          className="text-xs sm:text-sm font-bold transition-colors cursor-pointer px-2.5 py-1 rounded-lg"
                          style={{ color: primaryColor, backgroundColor: `${primaryColor}14` }}
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
                                  <div className="w-full h-full flex items-center justify-center text-white" style={{ backgroundColor: primaryColor }}>
                                    <Store size={16} />
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

                    {/* Módulo de Empleo / Trabaja con Nosotros */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Briefcase size={18} style={{ color: primaryColor }} className="shrink-0" />
                          <h2 className="text-base font-black text-slate-900">Trabaja con Nosotros</h2>
                        </div>
                        {isMerchantOwner && (
                          <button
                            type="button"
                            onClick={() => setJobAdminModalOpen(true)}
                            className="text-xs font-black px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <FileText size={12} />
                            <span>Postulaciones ({jobsConfig.applications.length})</span>
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 mb-3.5 leading-relaxed">
                        Conoce nuestras vacantes activas y sus requisitos o postúlate directamente enviando tus datos y currículum vitae (CV).
                      </p>

                      {/* Lista de vacantes activas con requisitos detallados */}
                      <div className="space-y-3 mb-4">
                        {jobsConfig.openings.filter(o => o.active).map(op => (
                          <div 
                            key={op.id}
                            className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:border-amber-400 transition-all flex flex-col gap-2.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                                  <h3 className="text-xs sm:text-sm font-black text-slate-900">{op.title}</h3>
                                </div>
                                {op.description && (
                                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                    {op.description}
                                  </p>
                                )}
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                Activa
                              </span>
                            </div>

                            {/* Ficha de Requisitos Clave */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] bg-white p-2.5 rounded-xl border border-slate-200/60">
                              {op.ageRange && (
                                <div className="flex items-center gap-1.5 text-slate-700">
                                  <span className="font-bold text-amber-600">🎂 Edad:</span>
                                  <span>{op.ageRange}</span>
                                </div>
                              )}
                              {op.locationRequired && (
                                <div className="flex items-center gap-1.5 text-slate-700">
                                  <span className="font-bold text-amber-600">📍 Zona:</span>
                                  <span className="truncate">{op.locationRequired}</span>
                                </div>
                              )}
                              {op.educationLevel && (
                                <div className="flex items-center gap-1.5 text-slate-700">
                                  <span className="font-bold text-amber-600">🎓 Nivel:</span>
                                  <span>{op.educationLevel}</span>
                                </div>
                              )}
                              {op.requiredDocs && (
                                <div className="flex items-center gap-1.5 text-slate-700 sm:col-span-2">
                                  <span className="font-bold text-amber-600">📄 Documentos:</span>
                                  <span className="truncate">{op.requiredDocs}</span>
                                </div>
                              )}
                              {op.requirements && (
                                <div className="flex items-center gap-1.5 text-slate-700 sm:col-span-2">
                                  <span className="font-bold text-amber-600">⚡ Requisitos:</span>
                                  <span>{op.requirements}</span>
                                </div>
                              )}
                            </div>

                            {/* Acciones de la Vacante */}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                              {isMerchantOwner ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleOpenEditOpening(op);
                                      setJobAdminTab('openings');
                                      setJobAdminModalOpen(true);
                                    }}
                                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                                  >
                                    <Edit2 size={12} />
                                    <span>Editar</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteJobOpening(op.id)}
                                    className="text-[11px] font-bold text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer ml-1"
                                  >
                                    <Trash2 size={12} />
                                    <span>Eliminar</span>
                                  </button>
                                </div>
                              ) : <div></div>}

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedJobOpening(op);
                                  setApplicantPosition(op.title);
                                  setJobModalOpen(true);
                                }}
                                style={{ backgroundColor: primaryColor, color: primaryTextColor }}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-xs hover:shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer ml-auto"
                              >
                                <span>Postularme</span>
                                <ChevronRight size={14} className="stroke-[2.5]" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Botón principal de enviar CV */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedJobOpening(null);
                          setApplicantPosition('Postulación General');
                          setJobModalOpen(true);
                        }}
                        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
                      >
                        <UploadCloud size={15} />
                        <span>Enviar CV Abierto / Espontáneo</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* PESTAÑA 2: PUBLICACIONES (FOTOS Y VIDEOS) */}
                {profileSubTab === 'media' && (
                  <div className="pt-3 pb-8">
                    {merchantPublications.length > 0 ? (
                      <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
                        {merchantPublications.map((item, idx) => (
                          <div
                            key={item.id || idx}
                            onClick={() => {
                              setActiveStatusModalList('publications');
                              setActiveStatusIndex(idx);
                              setIsStatusViewerOpen(true);
                              recordPostView(item.id, workspaceId, currentCustomer?.id || 'guest');
                            }}
                            className="relative aspect-[9/16] rounded-xl overflow-hidden bg-zinc-900 group cursor-pointer shadow-xs hover:scale-[1.02] active:scale-98 transition-all select-none"
                            title={item.caption || item.title || 'Ver publicación'}
                          >
                            {/* Video o Imagen de Fondo */}
                            {item.isVideo ? (
                              <video 
                                src={resolveImageUrl(item.mediaUrl)} 
                                muted 
                                playsInline 
                                loop 
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                              />
                            ) : (
                              <img 
                                src={resolveImageUrl(item.mediaUrl)} 
                                alt={item.title || ''} 
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = config?.coverUrl || config?.logoUrl || 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&q=80';
                                }}
                              />
                            )}

                            {/* Degradado inferior cinematográfico */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent pointer-events-none" />

                            {/* Badge Play si es video / Badge Álbum si son varias fotos */}
                            {item.isVideo ? (
                              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white/90 shadow-xs">
                                <Play size={10} fill="currentColor" className="text-white translate-x-[0.5px]" />
                              </div>
                            ) : item.imageCount > 1 ? (
                              <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-xs flex items-center gap-1 text-[10px] font-bold text-white shadow-xs">
                                <Copy size={10} />
                                <span>{item.imageCount}</span>
                              </div>
                            ) : null}

                            {/* Métricas en el pie (Reproducciones y Likes) */}
                            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-[11px] font-black drop-shadow-md">
                              <div className="flex items-center gap-1">
                                <Play size={11} fill="white" className="text-white shrink-0 drop-shadow-md" />
                                <span className="tracking-tight truncate">
                                  {formatViews(item.views)}
                                </span>
                              </div>
                              {item.likes > 0 && (
                                <div className="flex items-center gap-0.5 text-red-400">
                                  <Heart size={10} fill="#ef4444" className="text-red-500" />
                                  <span>{item.likes}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 px-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                        <div 
                          className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-3"
                          style={{ backgroundColor: `${primaryColor}18`, color: primaryColor }}
                        >
                          <Film size={24} style={{ color: primaryColor }} />
                        </div>
                        <h4 className="text-base font-bold text-slate-800">No hay anuncios aún</h4>
                        <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                          Este comercio aún no ha subido anuncios, fotos o videos a su vitrina.
                        </p>
                        {isMerchantOwner && (
                          <button
                            onClick={() => navigate('/social-feed?create=true')}
                            className="mt-4 px-4 py-2 rounded-xl text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-1.5 cursor-pointer hover:brightness-110 active:scale-95"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <Plus size={14} />
                            <span>Publicar nuevo anuncio</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* PESTAÑA 3: ESTADOS EFÍMEROS DE 24 HORAS (WHATSAPP STYLE) */}
                {profileSubTab === 'statuses' && (
                  <div className="pt-3 pb-8">
                    {ephemeralStatuses.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3.5">
                        {ephemeralStatuses.map((item, idx) => (
                          <div
                            key={item.id || idx}
                            onClick={() => markStatusAsViewed(idx, 'ephemeral')}
                            className="relative aspect-[9/16] rounded-2xl overflow-hidden bg-zinc-900 group cursor-pointer shadow-md hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-98 select-none border border-slate-200/80"
                            title={item.caption || 'Ver estado'}
                          >
                            {item.isVideo ? (
                              <video 
                                src={resolveImageUrl(item.mediaUrl)} 
                                muted 
                                playsInline 
                                loop 
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                              />
                            ) : (
                              <img 
                                src={resolveImageUrl(item.mediaUrl)} 
                                alt={item.caption || ''} 
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                              />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40 pointer-events-none" />

                            {/* Badge de Tiempo Restante WhatsApp Style */}
                            <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 bg-black/60 px-2 py-0.5 rounded-full border border-white/20 text-[10px] font-bold text-white shadow-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>Expira en {item.hoursLeft || 24}h</span>
                            </div>

                            {/* Multi-foto indicator */}
                            {item.images && item.images.length > 1 && (
                              <div className="absolute top-2.5 right-2.5 z-10 bg-black/60 px-1.5 py-0.5 rounded-md border border-white/20 text-[9px] font-black text-white">
                                1/{item.images.length}
                              </div>
                            )}

                            {/* Pie de foto / Título */}
                            <div className="absolute inset-x-0 bottom-0 p-3 z-10 flex flex-col justify-end">
                              <p className="text-white text-xs font-bold line-clamp-2 drop-shadow-sm leading-snug">
                                {item.caption}
                              </p>
                              <span className="text-[10px] text-zinc-300 font-medium mt-1">
                                {item.time}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 px-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                        <div 
                          className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-3"
                          style={{ backgroundColor: `${primaryColor}18`, color: primaryColor }}
                        >
                          <Clock size={24} className="stroke-[2.2]" />
                        </div>
                        <h4 className="text-base font-bold text-slate-800">No hay estados de 24 horas activos</h4>
                        <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                          Los estados de 24 horas son efímeros y desaparecen automáticamente como en WhatsApp.
                        </p>
                        {isMerchantOwner && (
                          <button
                            onClick={() => navigate('/social-feed?type=status&create=true')}
                            className="mt-4 px-4 py-2 rounded-xl text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-1.5 cursor-pointer hover:brightness-110 active:scale-95"
                            style={{ backgroundColor: primaryColor }}
                          >
                            <Plus size={14} />
                            <span>Publicar estado de 24 horas</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* OFERTAS */}
        {currentPage === 'offers' && (
          <div className="flex-1 flex flex-col w-full bg-slate-50 min-h-screen pb-28 relative">
            {/* 1. Imagen de Banner de Ancho Completo (Edge-to-Edge sin bordes blancos) */}
            {resolvedOffersBannerUrl && (
              <div className="w-full relative overflow-hidden bg-slate-900 border-b border-slate-200/80">
                <div className="w-full h-64 sm:h-80 md:h-96 relative group">
                  <img 
                    src={resolveImageUrl(resolvedOffersBannerUrl)} 
                    alt="Banner de Ofertas" 
                    className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.02]" 
                  />
                </div>
              </div>
            )}

            {/* 2. Bloque de Textos, Ticket y Botón de Edición (Debajo de la Imagen) */}
            <div className="py-5 sm:py-7 px-4 sm:px-6 border-b border-slate-200/80 bg-white shadow-2xs">
               <div className="w-full max-w-[1400px] mx-auto flex flex-col justify-center">
                 <div className="flex items-center justify-between gap-3 mb-2.5 flex-wrap">
                   <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold w-max bg-amber-500/10 text-amber-700 border border-amber-500/20 shadow-2xs">
                     <Tag size={12} className="text-amber-600" />
                     <span>Promociones y Descuentos</span>
                   </div>
                   {isMerchantOwner && (
                     <button
                       type="button"
                       onClick={openOffersCustomizer}
                       className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-white hover:bg-slate-50 text-slate-900 shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer border border-slate-200"
                       title="Editar Título, Subtítulo, Colores e Imagen de Ofertas"
                     >
                       <Pen size={12} style={{ color: primaryColor }} />
                       <span>Editar Sección</span>
                     </button>
                   )}
                 </div>
                 <h1 
                   className={`${headingWeight} text-3xl md:text-5xl tracking-tight font-extrabold`}
                   style={{ color: resolvedOffersTitleColor }}
                 >
                   {renderFormattedText(texts?.offersTitle || 'Ofertas Flash')}
                 </h1>
                 <p 
                   className="text-sm md:text-base mt-1.5 max-w-2xl leading-relaxed font-medium"
                   style={{ color: resolvedOffersSubtitleColor }}
                 >
                   {renderFormattedText(texts?.offersSubtitle || 'Aprovecha los mejores precios y promociones exclusivas de la tienda.')}
                 </p>
               </div>
            </div>
            
            <div className="max-w-[1400px] mx-auto w-full px-4 md:px-8 py-8 md:py-12 relative z-10">
              <div className="flex flex-col md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-3 gap-3.5">
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
                        {p.metadata?.offer_end_date && (
                          <FlashOfferCountdown endDate={p.metadata.offer_end_date} compact />
                        )}
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
                        <Tag size={8} className="fill-current" /> OFERTA
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
                            <button onClick={() => { if(!storeClosed) addToCart(p.id, p.step_size) }} style={!storeClosed ? { backgroundColor: primaryColor, color: primaryTextColor } : {}} className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${storeClosed ? 'cursor-not-allowed bg-slate-300' : 'hover:scale-110'}`}><Plus size={12}/></button>
                          </div>
                        ) : (
                          isUserAllowedToSeePrices && (p.stock_vitrina || 0) > 0 && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); if(storeClosed) return; addToCart(p.id, p.step_size || 1); }}
                              style={{ backgroundColor: primaryColor, color: primaryTextColor }}
                              className="w-8 h-8 rounded-tl-xl border-t border-l flex items-center justify-center transition-all active:scale-95 shadow-sm"
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
                          onClick={(e) => { e.stopPropagation(); navigate('/inventory'); }}
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

        {/* PRODUCTOS - VISTA 2 COLUMNAS ESTILO POS KIOSCO Y APP MODERNA */}
        {currentPage === 'products' && (() => {
          // Categoría general personalizada activa
          const activeCustomCat = storeCustomCategories.find(
            c => (typeof c === 'string' ? c : c?.name || '').trim().toLowerCase() === (activeMainCategory || '').trim().toLowerCase()
          );

          // Subcategorías de la categoría general activa
          const currentCategorySubCats = (() => {
            if (activeMainCategory === 'Todas') return [];
            const subMap = {};
            if (activeCustomCat && Array.isArray(activeCustomCat.subcategories)) {
              activeCustomCat.subcategories.forEach(sc => {
                const sName = (typeof sc === 'string' ? sc : sc?.name || '').trim();
                if (sName) {
                  const sKey = sName.toLowerCase();
                  subMap[sKey] = {
                    name: sName,
                    imageUrl: typeof sc === 'object' ? (sc.imageUrl || sc.image_url || '') : ''
                  };
                }
              });
            }
            products
              .filter(p => (p.category || '').toLowerCase() === activeMainCategory.toLowerCase() && p.subcategory)
              .forEach(p => {
                const sName = (p.subcategory || '').trim();
                const sKey = sName.toLowerCase();
                if (sName && !subMap[sKey]) {
                  subMap[sKey] = {
                    name: sName,
                    imageUrl: p.image_url || ''
                  };
                }
              });
            return Object.values(subMap);
          })();

          return (
            <div className="flex-1 flex flex-col w-full bg-slate-50 min-h-screen pb-20">
              <div className="max-w-[1600px] mx-auto w-full flex px-2 sm:px-4 md:px-6 py-3 gap-2.5 sm:gap-4 items-start">
                
                {/* ═══ COLUMNA 1: SIDEBAR VERTICAL DE CATEGORÍAS (CUADRADOS REDONDEADOS) ═══ */}
                <aside className="w-20 sm:w-24 shrink-0 sticky top-[53px] self-start py-1">
                  <div className="flex flex-col items-center gap-3 bg-white/95 backdrop-blur-xs rounded-2xl p-2 sm:p-2.5 border border-slate-200/80 shadow-xs max-h-[calc(100vh-100px)] overflow-y-auto scrollbar-hide">
                    
                    {/* Botón ALL (Todas) */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMainCategory('Todas');
                        setActiveSubCategory('Todos');
                      }}
                      className="group flex flex-col items-center gap-1 cursor-pointer w-full select-none"
                    >
                      <div
                        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex flex-col items-center justify-center transition-all ${
                          activeMainCategory === 'Todas'
                            ? 'shadow-md scale-102 ring-2 ring-offset-2'
                            : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
                        }`}
                        style={activeMainCategory === 'Todas' ? {
                          backgroundColor: `${primaryColor}15`,
                          color: primaryColor,
                          ringColor: primaryColor
                        } : {}}
                      >
                        <LayoutGrid size={22} className={activeMainCategory === 'Todas' ? 'stroke-[2.5]' : 'stroke-2'} />
                        <span className="text-[10px] font-black uppercase tracking-wider mt-0.5">All</span>
                      </div>
                      <span className={`text-[10px] font-black text-center truncate max-w-[70px] ${
                        activeMainCategory === 'Todas' ? 'text-slate-900 font-extrabold' : 'text-slate-500'
                      }`}>
                        Todas
                      </span>
                    </button>

                    <div className="w-8 h-[1px] bg-slate-200 my-0.5"></div>

                    {/* Categorías Generales con imágenes cuadradas redondeadas */}
                    {mainCategories.filter(mc => mc !== 'Todas').map((mc) => {
                      const customCat = storeCustomCategories.find(c => (typeof c === 'string' ? c : c?.name || '').trim().toLowerCase() === mc.trim().toLowerCase());
                      const catImg = (typeof customCat === 'object' ? (customCat?.imageUrl || customCat?.image_url) : null) ||
                        products.find(p => (p.category || '').trim().toLowerCase() === mc.trim().toLowerCase() && p.image_url)?.image_url;
                      const isActive = (activeMainCategory || '').trim().toLowerCase() === mc.trim().toLowerCase();

                      return (
                        <div key={mc} className="w-full flex flex-col items-center gap-2">
                          {/* Botón de Categoría General */}
                          <button
                            type="button"
                            onClick={() => {
                              if (activeMainCategory === mc) {
                                setActiveMainCategory('Todas');
                                setActiveSubCategory('Todos');
                              } else {
                                setActiveMainCategory(mc);
                                setActiveSubCategory('Todos');
                              }
                            }}
                            className="group flex flex-col items-center gap-1 cursor-pointer w-full select-none"
                          >
                            <div
                              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden flex items-center justify-center relative transition-all ${
                                isActive
                                  ? 'shadow-md ring-2 ring-offset-2 scale-102'
                                  : 'border border-slate-200/90 hover:border-slate-300 bg-white'
                              }`}
                              style={isActive ? { ringColor: primaryColor } : {}}
                            >
                              {catImg ? (
                                <img
                                  src={resolveImageUrl(catImg)}
                                  alt={mc}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div
                                  className="w-full h-full flex items-center justify-center font-black text-base uppercase"
                                  style={{
                                    backgroundColor: isActive ? `${primaryColor}20` : '#f1f5f9',
                                    color: isActive ? primaryColor : '#64748b'
                                  }}
                                >
                                  {mc.substring(0, 2)}
                                </div>
                              )}
                            </div>
                            <span
                              className={`text-[10px] font-bold text-center leading-tight line-clamp-2 max-w-[72px] ${
                                isActive ? 'text-slate-900 font-black' : 'text-slate-600'
                              }`}
                            >
                              {mc}
                            </span>
                          </button>

                          {/* Subcategorías Desplegadas Debajo */}
                          {isActive && currentCategorySubCats.length > 0 && (
                            <div className="w-full flex flex-col items-center gap-2 pt-1 pb-1 border-t border-b border-amber-200/60 bg-amber-50/40 rounded-xl p-1">
                              <button
                                type="button"
                                onClick={() => setActiveSubCategory('Todos')}
                                className={`w-full text-center py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                  activeSubCategory === 'Todos'
                                    ? 'bg-amber-500 text-zinc-950 shadow-2xs font-extrabold'
                                    : 'text-slate-600 hover:bg-white/80'
                                }`}
                              >
                                Todo
                              </button>

                              {currentCategorySubCats.map((sc) => {
                                const isSubActive = (activeSubCategory || '').toLowerCase() === sc.name.toLowerCase();
                                const subImg = sc.imageUrl || products.find(p => (p.category || '').toLowerCase() === mc.toLowerCase() && (p.subcategory || '').toLowerCase() === sc.name.toLowerCase() && p.image_url)?.image_url;

                                return (
                                  <button
                                    key={sc.name}
                                    type="button"
                                    onClick={() => setActiveSubCategory(sc.name)}
                                    className="group flex flex-col items-center gap-0.5 cursor-pointer w-full select-none"
                                  >
                                    <div
                                      className={`w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center transition-all ${
                                        isSubActive
                                          ? 'ring-2 ring-offset-1 shadow-xs scale-105'
                                          : 'border border-slate-200 bg-white hover:border-slate-300'
                                      }`}
                                      style={isSubActive ? { ringColor: primaryColor } : {}}
                                    >
                                      {subImg ? (
                                        <img
                                          src={resolveImageUrl(subImg)}
                                          alt={sc.name}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <div
                                          className="w-full h-full flex items-center justify-center text-[11px] font-black uppercase"
                                          style={{
                                            backgroundColor: isSubActive ? `${primaryColor}25` : '#f8fafc',
                                            color: isSubActive ? primaryColor : '#64748b'
                                          }}
                                        >
                                          {sc.name.substring(0, 1)}
                                        </div>
                                      )}
                                    </div>
                                    <span
                                      className={`text-[9px] font-bold text-center leading-tight line-clamp-1 max-w-[65px] ${
                                        isSubActive ? 'text-amber-800 font-black' : 'text-slate-600'
                                      }`}
                                    >
                                      {sc.name}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </aside>

                {/* ═══ COLUMNA 2: BUSCADOR Y PRODUCTOS ═══ */}
                <div className="flex-1 min-w-0">
                   
                   {/* Barra Compacta de Búsqueda y Ordenar */}
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
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-3.5 md:gap-5">
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

                            {/* Badge de fotos múltiples */}
                            {((Array.isArray(p.images) && p.images.length > 1) || (Array.isArray(p.metadata?.images) && p.metadata.images.length > 1)) && (
                              <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                                <ImageIcon size={10} />
                                <span>{(p.images || p.metadata?.images).length}</span>
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
                            
                            <div className="mt-auto pt-2 flex items-center justify-between gap-1 w-full min-w-0">
                              <div className="min-w-0 flex-1 pr-1">
                                {isUserAllowedToSeePrices ? (
                                  p.is_offer ? (
                                    <div className="flex flex-col min-w-0">
                                      <div className="flex items-baseline gap-0.5 truncate">
                                        <p className="font-extrabold text-sm sm:text-base text-zinc-900 leading-none truncate">${Number(p.discount_price || p.price).toFixed(2)}</p>
                                        <span className="text-[9px] sm:text-[10px] text-zinc-500 font-semibold truncate">/ {p.unit_type || p.unit || 'und'}</span>
                                      </div>
                                      <p className="text-[9px] sm:text-[10px] text-zinc-400 line-through mt-0.5">${Number(p.price).toFixed(2)}</p>
                                      {p.metadata?.offer_limit_qty && (
                                        <span className="text-[8px] sm:text-[9px] font-bold text-amber-700 bg-amber-50 px-1 py-0.5 rounded mt-0.5 inline-block truncate">
                                          Máx. {p.metadata.offer_limit_qty} por pedido
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex flex-col min-w-0">
                                      <p className="font-extrabold text-sm sm:text-base text-zinc-900 leading-none truncate">${Number(p.price).toFixed(2)}</p>
                                      <span className="text-[9px] sm:text-[10px] text-zinc-500 font-semibold truncate mt-0.5">/ {p.unit_type || p.unit || 'und'}</span>
                                    </div>
                                  )
                                ) : (
                                  <button onClick={(e) => { e.stopPropagation(); setShowAuthModal(true); }} className="text-[9px] sm:text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded truncate">Ver Precio</button>
                                )}
                              </div>
                              
                              {/* Add Button & Quantity Selector Widget (Anti-overflow shrink-0) */}
                              {isUserAllowedToSeePrices && (p.stock_vitrina || 0) > 0 && (
                                cart[p.id] > 0 ? (
                                  <div 
                                    className="flex items-center gap-1 sm:gap-1.5 border rounded-lg p-0.5 sm:p-1 bg-white shadow-2xs shrink-0 select-none" 
                                    style={{ backgroundColor: hexToRgba(primaryColor, 0.08), borderColor: hexToRgba(primaryColor, 0.35) }} 
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button 
                                      type="button"
                                      onClick={() => removeFromCart(p.id, p.step_size)} 
                                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-white border border-slate-200/90 flex items-center justify-center shadow-xs text-slate-700 active:scale-90 transition-transform cursor-pointer" 
                                      style={{ color: primaryColor }}
                                      title="Disminuir"
                                    >
                                      <Minus size={11} className="stroke-[2.5]" />
                                    </button>
                                    
                                    <span className="text-[11px] sm:text-xs font-black min-w-[14px] text-center px-0.5" style={{ color: primaryColor }}>
                                      {cart[p.id]}
                                    </span>
                                    
                                    <button 
                                      type="button"
                                      onClick={() => { if(!storeClosed) addToCart(p.id, p.step_size); }} 
                                      style={{ backgroundColor: primaryColor, color: primaryTextColor }} 
                                      className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center shadow-xs active:scale-90 transition-transform cursor-pointer ${storeClosed ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      title="Aumentar"
                                    >
                                      <Plus size={11} className="stroke-[2.5]" />
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); if(storeClosed) return; addToCart(p.id, p.step_size || 1); }}
                                    className="bg-white border font-black px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] tracking-wider shadow-2xs transition-all hover:opacity-90 active:scale-95 cursor-pointer shrink-0 inline-flex items-center gap-1"
                                    style={{ borderColor: hexToRgba(primaryColor, 0.4), color: primaryColor }}
                                    title="Añadir al carrito"
                                  >
                                    <span>ADD</span>
                                    <Plus size={10} className="stroke-[3]" />
                                  </button>
                                )
                              )}
                            </div>
                          </div>
                          
                          {/* Edit Button for Merchant */}
                          {isMerchantOwner && (
                            <div className="absolute inset-0 z-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm rounded-2xl">
                              <button 
                                onClick={(e) => { e.stopPropagation(); navigate('/inventory'); }}
                                style={{ backgroundColor: primaryColor, color: primaryTextColor }}
                                className="font-black uppercase tracking-widest text-xs px-6 py-3 rounded-full flex items-center gap-2 shadow-xl hover:scale-105 transition-transform"
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
        ); })()}
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

      {/* Modal Visor de Estados / Historias de la Tienda estilo WhatsApp con color dinámico y vistas reales */}
      <MerchantStatusViewerModal
        isOpen={isStatusViewerOpen}
        onClose={() => setIsStatusViewerOpen(false)}
        statuses={activeStatusesForViewer}
        initialIndex={activeStatusIndex}
        primaryColor={primaryColor}
        workspaceId={config?.id || config?.workspace_id}
        isMerchantOwner={isMerchantOwner}
        onNavigateStore={(storeSlug) => {
          if (storeSlug && storeSlug !== slug) {
            navigate(`/${storeSlug}`);
          }
        }}
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
            {/* Foto del Producto con Soporte Multi-Imagen / Carrusel */}
            {(() => {
              const productGallery = (Array.isArray(selectedProduct.images) && selectedProduct.images.length > 0)
                ? selectedProduct.images
                : (Array.isArray(selectedProduct.metadata?.images) && selectedProduct.metadata.images.length > 0)
                  ? selectedProduct.metadata.images
                  : selectedProduct.image_url ? [selectedProduct.image_url] : [];

              const currentImgUrl = productGallery[activeImageIndex] || selectedProduct.image_url;

              return (
                <div className="md:w-5/12 bg-orange-50/40 relative flex flex-col items-center justify-between p-4 md:p-6 shrink-0 border-b md:border-b-0 md:border-r border-slate-100 min-h-[260px] md:min-h-[380px] select-none">
                  {/* Visor Principal con flechas de navegación si hay múltiples imágenes */}
                  <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden min-h-[190px]">
                    {currentImgUrl ? (
                      <img 
                        id={`modal-img-${selectedProduct.id}`} 
                        key={currentImgUrl}
                        src={resolveImageUrl(currentImgUrl)} 
                        alt={selectedProduct.name} 
                        className="w-full h-full object-contain max-h-52 md:max-h-64 transition-all duration-300 animate-in fade-in zoom-in-95" 
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-2xl bg-orange-100/60 flex items-center justify-center text-orange-400">
                        <ImageIcon size={40} />
                      </div>
                    )}

                    {/* Flechas de navegación para carrusel */}
                    {productGallery.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImageIndex(prev => (prev > 0 ? prev - 1 : productGallery.length - 1));
                          }}
                          className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 text-slate-800 shadow-md flex items-center justify-center hover:bg-white hover:scale-105 transition-all z-20"
                          title="Foto anterior"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImageIndex(prev => (prev < productGallery.length - 1 ? prev + 1 : 0));
                          }}
                          className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 text-slate-800 shadow-md flex items-center justify-center hover:bg-white hover:scale-105 transition-all z-20"
                          title="Siguiente foto"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </>
                    )}

                    {/* Badge Promocional / Distintivo */}
                    {selectedProduct.metadata?.is_combo ? (
                      <div className="absolute top-1 left-1 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-[10px] md:text-xs uppercase tracking-wider px-2.5 py-1 rounded-lg z-20 shadow-sm">
                        {selectedProduct.metadata?.combo_badge || "🎁 COMBO"}
                      </div>
                    ) : Boolean(selectedProduct.is_offer) && (
                      <div className="absolute top-1 left-1 z-20 flex flex-col gap-1 items-start">
                        <div className="bg-gradient-to-r from-red-500 to-amber-500 text-white text-[10px] md:text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-sm">
                          {selectedProduct.metadata?.offer_badge || "🔥 OFERTA FLASH"}
                        </div>
                        {selectedProduct.metadata?.offer_end_date && (
                          <FlashOfferCountdown endDate={selectedProduct.metadata.offer_end_date} compact />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Barra de miniaturas e indicadores de puntos (dots) si hay más de 1 imagen */}
                  {productGallery.length > 1 && (
                    <div className="w-full mt-3 flex flex-col items-center gap-2 z-10">
                      {/* Puntos (Dots) */}
                      <div className="flex items-center gap-1.5">
                        {productGallery.map((_, dotIdx) => (
                          <button
                            key={dotIdx}
                            type="button"
                            onClick={() => setActiveImageIndex(dotIdx)}
                            className={`transition-all rounded-full ${
                              activeImageIndex === dotIdx
                                ? 'w-5 h-1.5 bg-orange-600'
                                : 'w-1.5 h-1.5 bg-slate-300 hover:bg-slate-400'
                            }`}
                          />
                        ))}
                      </div>

                      {/* Miniaturas */}
                      <div className="flex items-center justify-center gap-1.5 overflow-x-auto max-w-full py-1 custom-scrollbar">
                        {productGallery.map((thumbUrl, tIdx) => (
                          <button
                            key={tIdx}
                            type="button"
                            onClick={() => setActiveImageIndex(tIdx)}
                            className={`w-10 h-10 md:w-12 md:h-12 rounded-xl overflow-hidden border-2 transition-all shrink-0 bg-white shadow-2xs ${
                              activeImageIndex === tIdx
                                ? 'border-orange-500 ring-2 ring-orange-500/30 scale-105'
                                : 'border-slate-200 opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img
                              src={resolveImageUrl(thumbUrl)}
                              alt={`Miniatura ${tIdx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
            
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
                      style={{ backgroundColor: primaryColor, color: primaryTextColor }}
                      className="flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
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
                    style={{ backgroundColor: primaryColor, color: primaryTextColor }}
                    className="w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
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
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => {
                      if (window.__axonPurgeCache) window.__axonPurgeCache();
                      else window.location.reload();
                    }} 
                    title="Actualizar / Limpiar caché" 
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                  >
                    <RefreshCw size={15} />
                  </button>
                  <button onClick={() => setIsCartOpen(false)} className="hover:scale-105 transition-transform flex items-center justify-center w-8 h-8 rounded-lg overflow-hidden bg-white shadow-sm border border-black/5">
                    {config?.logoUrl ? (
                      <img src={resolveImageUrl(config.logoUrl)} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Store size={20} fill="currentColor" className="text-amber-500" />
                    )}
                  </button>
                </div>
              </div>

              {/* Items Area */}
              <div className="flex-1 overflow-y-auto px-8 py-8 scrollbar-hide relative z-10">
                {isCheckoutMode ? (
                  <div className="text-slate-800">
                    {checkoutStep === 1 ? (
                      <div className="space-y-5 animate-in slide-in-from-left-4 duration-300">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Paso 1: Dirección y Envío</h3>
                          <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                            1 de 2
                          </span>
                        </div>
                     
                        {/* Address Input */}
                        <div className="space-y-3.5 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <MapPin size={14} className="text-amber-500" /> Dirección de Entrega
                            </label>
                            <span className="text-[11px] text-slate-400 font-medium">Requerido</span>
                          </div>
                          
                          {currentCustomer?.addresses && currentCustomer.addresses.length > 0 && !isAddingNewAddress ? (
                            <div className="space-y-2.5">
                              {currentCustomer.addresses.map(addr => {
                                const isSelected = checkoutAddress === addr.address;
                                return (
                                  <button
                                    key={addr.id}
                                    type="button"
                                    onClick={() => {
                                      setCheckoutAddress(addr.address);
                                      setCheckoutLocation((addr.lat && addr.lng) ? { lat: addr.lat, lng: addr.lng } : null);
                                    }}
                                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                                      isSelected 
                                        ? 'border-amber-500 bg-amber-50/60 shadow-xs ring-1 ring-amber-500/20' 
                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-sm text-slate-900">{addr.name}</span>
                                      {(addr.lat && addr.lng) && (
                                        <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                          <MapPin size={10}/> GPS
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">{addr.address}</p>
                                  </button>
                                );
                              })}
                              <button 
                                type="button"
                                onClick={() => setIsAddingNewAddress(true)} 
                                className="w-full py-2.5 text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50/50 hover:bg-amber-50 border border-dashed border-amber-300 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <Plus size={14} /> Usar otra dirección
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="relative">
                                <MapPin size={16} className="absolute left-3.5 top-3.5 text-amber-500" />
                                <textarea 
                                  rows="3" 
                                  value={checkoutAddress} 
                                  onChange={e => setCheckoutAddress(e.target.value)} 
                                  placeholder="Ingresa la dirección detallada (Edificio, Casa, Calle, Punto de referencia...)" 
                                  className="w-full pl-10 pr-3.5 py-3 bg-slate-50/70 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all resize-none shadow-xs" 
                                />
                              </div>
                              
                              <div className="flex flex-col sm:flex-row gap-2">
                                <button 
                                  type="button"
                                  onClick={getLocationFromGPS}
                                  disabled={gpsLoading}
                                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black tracking-wide transition-all shadow-xs ${
                                    checkoutLocation 
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100' 
                                      : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:brightness-105 active:scale-[0.99]'
                                  }`}
                                >
                                  {gpsLoading ? (
                                    <Loader2 size={16} className="animate-spin text-slate-950" />
                                  ) : checkoutLocation ? (
                                    <Check size={16} className="text-emerald-700" />
                                  ) : (
                                    <MapPin size={16} />
                                  )}
                                  <span>
                                    {gpsLoading 
                                      ? 'Capturando GPS y dirección...' 
                                      : checkoutLocation 
                                      ? '📍 GPS Capturado (Tocar para reintentar)' 
                                      : 'Usar mi ubicación GPS actual'}
                                  </span>
                                </button>
                                {currentCustomer?.addresses && currentCustomer.addresses.length > 0 && (
                                  <button 
                                    type="button"
                                    onClick={() => setIsAddingNewAddress(false)} 
                                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                                  >
                                    Volver
                                  </button>
                                )}
                              </div>

                              {/* Error de GPS */}
                              {gpsError && (
                                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold animate-in fade-in duration-200">
                                  <AlertTriangle size={15} className="flex-shrink-0 text-red-500 mt-0.5" />
                                  <span>{gpsError}</span>
                                </div>
                              )}

                              {/* Widget de Confirmación GPS */}
                              {checkoutLocation && (
                                <div className="p-3.5 bg-gradient-to-br from-emerald-50/90 to-teal-50/50 border border-emerald-200 rounded-xl space-y-2 animate-in fade-in duration-200">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                      </span>
                                      <span className="text-xs font-black text-emerald-900 uppercase tracking-wider">
                                        GPS Verificado
                                      </span>
                                    </div>
                                    <span className="text-[11px] font-mono font-bold text-emerald-800 bg-white/90 px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs">
                                      {checkoutLocation.accuracy ? `±${checkoutLocation.accuracy}m precisión` : 'Alta precisión'}
                                    </span>
                                  </div>
                                  <div className="text-[11px] font-mono text-slate-700 bg-white/80 p-2 rounded-lg border border-emerald-100 flex items-center justify-between">
                                    <span className="truncate">{checkoutLocation.lat.toFixed(5)}, {checkoutLocation.lng.toFixed(5)}</span>
                                    <a 
                                      href={`https://maps.google.com/?q=${checkoutLocation.lat},${checkoutLocation.lng}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-bold ml-2 underline flex-shrink-0"
                                    >
                                      Ver en Maps <ExternalLink size={12} />
                                    </a>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Cupón / Promoción de Descuento — Oculto temporalmente a solicitud */}
                        {/*
                        <div className="space-y-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                          <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                            ¿Tienes un código de descuento?
                          </label>
                          {appliedDiscount ? (
                            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                              <div className="flex items-center gap-2 text-emerald-800">
                                <Tag size={16} className="text-emerald-600" />
                                <span className="font-bold text-sm">{appliedDiscount.code} Aplicado</span>
                              </div>
                              <button 
                                type="button"
                                onClick={() => setAppliedDiscount(null)} 
                                className="text-emerald-700 hover:text-emerald-900 text-xs font-bold uppercase tracking-wider transition-colors"
                              >
                                Quitar
                              </button>
                            </div>
                          ) : (
                            <div className="relative flex gap-2">
                              <input 
                                type="text" 
                                value={discountCode} 
                                onChange={e => setDiscountCode(e.target.value)} 
                                placeholder="Ej. DESCUENTO10" 
                                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 placeholder-slate-400 uppercase outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-xs" 
                              />
                              <button 
                                type="button"
                                onClick={handleApplyDiscount} 
                                disabled={isValidatingDiscount || !discountCode} 
                                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black tracking-wider uppercase transition-colors disabled:opacity-50"
                              >
                                {isValidatingDiscount ? <Loader2 size={16} className="animate-spin" /> : 'Aplicar'}
                              </button>
                            </div>
                          )}
                          {discountError && <p className="text-red-500 text-xs font-semibold mt-1">{discountError}</p>}
                        </div>
                        */}
                      </div>
                    ) : (
                      <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Paso 2: Método de Pago</h3>
                          <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                            2 de 2
                          </span>
                        </div>

                        {/* Payment Method Selector */}
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            {(config?.paymentProfile?.paymentMobile !== false) && (
                              <button 
                                type="button"
                                onClick={() => setSelectedPaymentMethod('pago_movil')} 
                                className={`p-3.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition-all ${
                                  selectedPaymentMethod === 'pago_movil' 
                                    ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-md scale-[1.02]' 
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs'
                                }`} 
                                style={selectedPaymentMethod === 'pago_movil' ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                              >
                                <Smartphone size={16} /> Pago Móvil
                              </button>
                            )}
                            {config?.paymentProfile?.zelleActive && (
                              <button 
                                type="button"
                                onClick={() => setSelectedPaymentMethod('zelle')} 
                                className={`p-3.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition-all ${
                                  selectedPaymentMethod === 'zelle' 
                                    ? 'bg-[#741eed] border-[#741eed] text-white shadow-md shadow-[#741eed]/20 scale-[1.02]' 
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs'
                                }`}
                              >
                                <Zap size={16} /> Zelle
                              </button>
                            )}
                            {config?.paymentProfile?.cashActive && (
                              <button 
                                type="button"
                                onClick={() => setSelectedPaymentMethod('cash')} 
                                className={`p-3.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition-all ${
                                  selectedPaymentMethod === 'cash' 
                                    ? 'bg-slate-900 border-slate-900 text-white shadow-md scale-[1.02]' 
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs'
                                }`}
                              >
                                <Building2 size={16} /> Efectivo
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Payment Mobile Information */}
                        {selectedPaymentMethod === 'pago_movil' && (config?.paymentProfile?.paymentMobile !== false) && (
                          <div className="space-y-4 animate-in slide-in-from-top-2">
                            <div className="p-4 sm:p-5 border border-slate-200/90 rounded-2xl bg-white shadow-xs space-y-4">
                              <div className="flex flex-col gap-2.5 text-sm text-slate-700">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                  <span className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                                    <Smartphone size={18} className="text-amber-500" /> Datos de Pago Móvil
                                  </span>
                                  <span className="text-[11px] bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-full font-black">
                                    Tasa BCV: Bs. {bcvRate || config?.bcvRate || 36.50}
                                  </span>
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs sm:text-sm">
                                  <p><span className="font-extrabold text-slate-900">Banco:</span> <span className="font-semibold text-slate-700">{config?.paymentProfile?.pmBank || 'Consultar con la tienda'}</span></p>
                                  <p><span className="font-extrabold text-slate-900">Teléfono:</span> <span className="font-semibold text-slate-700">{config?.paymentProfile?.pmPhone || config?.expediente?.whatsapp || 'Consultar con la tienda'}</span></p>
                                  <p className="sm:col-span-2"><span className="font-extrabold text-slate-900">Cédula / RIF:</span> <span className="font-semibold text-slate-700">{config?.paymentProfile?.pmId || 'Consultar con la tienda'}</span></p>
                                </div>

                                <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50/70 border border-amber-200/80 rounded-xl mt-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-600">Total en Divisa:</span>
                                    <span className="text-sm font-black text-slate-900">${finalCartTotal.toFixed(2)} USD</span>
                                  </div>
                                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-amber-200/40">
                                    <span className="text-xs font-black text-amber-900 uppercase tracking-wide">Total a Pagar (Bs):</span>
                                    <span className="text-base font-black text-amber-700 font-mono">
                                      Bs. {(finalCartTotal * Number(bcvRate || config?.bcvRate || 36.50)).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-3 pt-2 border-t border-slate-100">
                                {customerPaymentProfiles.length > 0 && (
                                  <div>
                                    <label className="text-xs font-bold text-slate-700 mb-1 block">¿Desde qué cuenta envías?</label>
                                    <select 
                                      value={selectedPaymentProfileIdx} 
                                      onChange={e => {
                                        const val = e.target.value;
                                        setSelectedPaymentProfileIdx(val);
                                        if (val !== '') {
                                          const profile = customerPaymentProfiles[Number(val)];
                                          if (profile) setPaymentBank(profile.bank || '');
                                        }
                                      }} 
                                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500 text-slate-900 font-medium"
                                    >
                                      <option value="">Selecciona cuenta guardada (opcional)</option>
                                      {customerPaymentProfiles.map((p, idx) => (
                                        <option key={idx} value={idx}>{p.bank} - {p.phone} ({p.titular})</option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                                <div>
                                  <label className="text-xs font-bold text-slate-700 mb-1 block">Banco Emisor (desde donde pagas)</label>
                                  <div className="relative">
                                    <select 
                                      value={paymentBank} 
                                      onChange={e => {
                                        setPaymentBank(e.target.value);
                                        setSelectedPaymentProfileIdx('');
                                      }} 
                                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500 text-slate-900 font-medium shadow-xs appearance-none cursor-pointer pr-10"
                                    >
                                      <option value="">Selecciona tu banco...</option>
                                      {VENEZUELA_BANKS.map((b, idx) => (
                                        <option key={idx} value={b}>{b}</option>
                                      ))}
                                    </select>
                                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                      <ChevronRight size={16} className="rotate-90 stroke-[2.5]" />
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-bold text-slate-700">Número de Referencia</label>
                                    {ocrStatus === 'analyzing' && (
                                      <span className="text-[11px] text-amber-600 flex items-center gap-1 font-bold animate-pulse">
                                        <Loader2 size={12} className="animate-spin" /> Analizando comprobante...
                                      </span>
                                    )}
                                    {ocrStatus === 'success' && (
                                      <span className="text-[11px] text-emerald-700 font-bold">
                                        ✅ Detectada automáticamente
                                      </span>
                                    )}
                                  </div>
                                  <input 
                                    type="text" 
                                    inputMode="numeric" 
                                    value={paymentReference} 
                                    onChange={e => {
                                      const val = e.target.value;
                                      setPaymentReference(val);
                                      if (val.trim().length >= 4) {
                                        checkDuplicateReference(val);
                                      } else {
                                        setDuplicateRefError(null);
                                      }
                                    }} 
                                    placeholder="Ej: 123456 (últimos 4 a 6 dígitos o completa)" 
                                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none font-mono font-bold placeholder-slate-400 shadow-xs transition-colors ${
                                      duplicateRefError 
                                        ? 'border-red-500 bg-red-50/60 text-red-900 focus:border-red-600' 
                                        : 'border-slate-300 text-slate-900 focus:border-amber-500'
                                    }`} 
                                  />
                                  {duplicateRefError ? (
                                    <div className="flex items-center gap-1.5 mt-1.5 p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-bold animate-in fade-in">
                                      <AlertTriangle size={14} className="shrink-0 text-red-600" />
                                      <span>{duplicateRefError}</span>
                                    </div>
                                  ) : isCheckingRef ? (
                                    <p className="text-[11px] mt-1 text-slate-400 flex items-center gap-1 font-medium">
                                      <Loader2 size={11} className="animate-spin" /> Verificando referencia...
                                    </p>
                                  ) : ocrMessage && ocrStatus !== 'analyzing' ? (
                                    <p className={`text-[11px] mt-1 ${ocrStatus === 'success' ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                                      {ocrMessage}
                                    </p>
                                  ) : null}
                                </div>
                                
                                <div>
                                  <label className="text-xs font-bold text-slate-700 mb-1 block">Comprobante de Pago</label>
                                  <div className="relative overflow-hidden p-4 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-2 bg-slate-50/70 hover:bg-amber-50/40 hover:border-amber-400 transition-colors cursor-pointer group">
                                     <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                     {receiptUrl ? (
                                       <div className="flex flex-col items-center text-center">
                                         <div className="w-16 h-16 rounded-xl overflow-hidden border border-emerald-500 mb-2 relative shadow-sm">
                                           <img src={receiptUrl} alt="Comprobante" className="w-full h-full object-cover" />
                                           <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                                             <ShieldCheck size={20} className="text-emerald-600" />
                                           </div>
                                         </div>
                                         <span className="text-xs font-bold text-emerald-700">Comprobante Cargado Exitosamente</span>
                                         <span className="text-[10px] text-slate-500 mt-0.5">Toca para cambiar la imagen</span>
                                       </div>
                                     ) : receiptFile ? (
                                       <div className="text-center py-2">
                                         <Loader2 size={24} className="mx-auto text-amber-500 mb-2 animate-spin" />
                                         <span className="text-xs font-semibold text-slate-700">Procesando comprobante...</span>
                                       </div>
                                     ) : (
                                       <div className="text-center py-2 group-hover:scale-[1.01] transition-transform">
                                         <UploadCloud size={28} className="mx-auto text-amber-500 mb-2" />
                                         <span className="text-xs font-black text-slate-800 block">Toca para subir captura del pago</span>
                                         <span className="text-[10px] text-slate-500 mt-0.5 block">Formatos: JPG, PNG, WEBP</span>
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
                          <div className="space-y-4 animate-in slide-in-from-top-2">
                            <div className="p-4 sm:p-5 border border-purple-200 rounded-2xl bg-white shadow-xs space-y-4">
                              <div className="flex flex-col gap-2 text-sm text-slate-700">
                                <div className="flex items-center justify-between pb-3 border-b border-purple-100">
                                  <span className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                                    <Zap size={18} className="text-[#741eed]" /> Datos de Zelle
                                  </span>
                                  <span className="text-[11px] bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-full font-black">
                                    USD Directo
                                  </span>
                                </div>
                                <p><span className="font-extrabold text-slate-900">Correo Zelle:</span> <span className="font-semibold text-slate-800">{config.paymentProfile.zelleEmail}</span></p>
                                <p><span className="font-extrabold text-slate-900">Titular:</span> <span className="font-semibold text-slate-800">{config.paymentProfile.zelleName}</span></p>
                                <div className="p-3 bg-purple-50 rounded-xl mt-1 flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-600">Monto a transferir:</span>
                                  <span className="text-sm font-black text-slate-900">${finalCartTotal.toFixed(2)} USD</span>
                                </div>
                              </div>
                              
                              <div className="space-y-3 pt-2 border-t border-slate-100">
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-bold text-slate-700">Referencia de Zelle</label>
                                    {ocrStatus === 'analyzing' && (
                                      <span className="text-[11px] text-purple-700 flex items-center gap-1 font-bold animate-pulse">
                                        <Loader2 size={12} className="animate-spin" /> Analizando comprobante...
                                      </span>
                                    )}
                                  </div>
                                  <input 
                                    type="text" 
                                    value={paymentReference} 
                                    onChange={e => {
                                      const val = e.target.value;
                                      setPaymentReference(val);
                                      if (val.trim().length >= 4) {
                                        checkDuplicateReference(val);
                                      } else {
                                        setDuplicateRefError(null);
                                      }
                                    }} 
                                    placeholder="Código de confirmación o referencia" 
                                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none font-mono font-bold placeholder-slate-400 shadow-xs transition-colors ${
                                      duplicateRefError 
                                        ? 'border-red-500 bg-red-50/60 text-red-900 focus:border-red-600' 
                                        : 'border-slate-300 text-slate-900 focus:border-[#741eed]'
                                    }`} 
                                  />
                                  {duplicateRefError ? (
                                    <div className="flex items-center gap-1.5 mt-1.5 p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-bold animate-in fade-in">
                                      <AlertTriangle size={14} className="shrink-0 text-red-600" />
                                      <span>{duplicateRefError}</span>
                                    </div>
                                  ) : isCheckingRef ? (
                                    <p className="text-[11px] mt-1 text-slate-400 flex items-center gap-1 font-medium">
                                      <Loader2 size={11} className="animate-spin" /> Verificando referencia...
                                    </p>
                                  ) : ocrMessage && ocrStatus !== 'analyzing' ? (
                                    <p className={`text-[11px] mt-1 ${ocrStatus === 'success' ? 'text-emerald-700 font-medium' : 'text-slate-500'}`}>
                                      {ocrMessage}
                                    </p>
                                  ) : null}
                                </div>
                                
                                <div>
                                  <label className="text-xs font-bold text-slate-700 mb-1 block">Captura del Comprobante Zelle</label>
                                  <div className="relative overflow-hidden p-4 border-2 border-dashed border-purple-200 rounded-xl flex flex-col items-center justify-center gap-2 bg-purple-50/40 hover:bg-purple-50/70 transition-colors cursor-pointer group">
                                     <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                     {receiptUrl ? (
                                       <div className="flex flex-col items-center text-center">
                                         <div className="w-16 h-16 rounded-xl overflow-hidden border border-purple-400 mb-2 relative shadow-sm">
                                           <img src={receiptUrl} alt="Comprobante" className="w-full h-full object-cover" />
                                           <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                                             <ShieldCheck size={20} className="text-purple-600" />
                                           </div>
                                         </div>
                                         <span className="text-xs font-bold text-purple-700">Captura Subida Correctamente</span>
                                         <span className="text-[10px] text-slate-500 mt-0.5">Toca para cambiar la imagen</span>
                                       </div>
                                     ) : receiptFile ? (
                                       <div className="text-center py-2">
                                         <Loader2 size={24} className="mx-auto text-purple-600 mb-2 animate-spin" />
                                         <span className="text-xs font-semibold text-slate-700">Subiendo comprobante...</span>
                                       </div>
                                     ) : (
                                       <div className="text-center py-2 group-hover:scale-[1.01] transition-transform">
                                         <UploadCloud size={28} className="mx-auto text-[#741eed] mb-2" />
                                         <span className="text-xs font-black text-slate-800 block">Sube la Captura de Zelle</span>
                                         <span className="text-[10px] text-slate-500 mt-0.5 block">Formatos: JPG, PNG, WEBP</span>
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
                          <div className="space-y-4 animate-in slide-in-from-top-2">
                            <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-xs text-center space-y-2">
                              <Building2 size={36} className="mx-auto text-slate-600 mb-2" />
                              <h4 className="text-slate-900 font-black text-base">Pago en Efectivo</h4>
                              <p className="text-xs text-slate-500">Pagarás tu pedido en efectivo en divisa o bolívares al recibirlo.</p>
                              <div className="pt-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Total a pagar:</span>
                                <span className="text-2xl font-black text-slate-900 font-mono">${finalCartTotal.toFixed(2)}</span>
                              </div>
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
                    <button 
                      onClick={() => { setIsCartOpen(false); setCurrentPage('products'); }} 
                      className="px-10 py-4 text-white rounded-full text-xs font-bold tracking-widest uppercase transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
                      style={{
                        backgroundColor: primaryColor || '#ea580c',
                        boxShadow: `0 10px 25px ${primaryColor ? primaryColor + '4d' : 'rgba(234, 88, 12, 0.3)'}`
                      }}
                    >
                      Descubrir Productos
                    </button>
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

              {/* Cart Footer — Luminous White & Axon Orange */}
              {totalCartItems > 0 && (
                <div className="px-5 sm:px-6 py-4 sm:py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] bg-white border-t border-slate-200/90 shadow-[0_-6px_25px_rgba(0,0,0,0.06)] z-10 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="flex justify-between items-center mb-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                    <div>
                      <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest block mb-1">Total a Pagar</span>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-slate-600 text-xs font-semibold">
                          Envío: {shippingCost === 0 ? <strong className="text-emerald-700">Gratis</strong> : `$${shippingCost.toFixed(2)}`}
                        </span>
                        {appliedDiscount && (
                          <span className="text-emerald-700 text-xs font-bold">Descuento: -${discountAmount.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight block">
                        ${finalCartTotal.toFixed(2)}
                      </span>
                      <span className="text-xs font-black text-amber-600 font-mono block">
                        Bs. {(finalCartTotal * Number(bcvRate || config?.bcvRate || 36.50)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  {storeClosed ? (
                    <div className={`w-full py-4 px-4 rounded-xl text-center text-xs sm:text-sm font-bold border ${
                      storeSchedule.status === 'closing' 
                        ? 'bg-amber-50 text-amber-800 border-amber-300' 
                        : 'bg-red-50 text-red-800 border-red-300'
                    }`}>
                      {storeSchedule.status === 'closing' ? `No se aceptan pedidos. ${storeSchedule.message}` : `Tienda Cerrada. Horario: ${config.scheduleProfile.openTime} - ${config.scheduleProfile.closeTime}`}
                    </div>
                  ) : isCheckoutMode ? (
                    checkoutStep === 2 ? (
                      <button 
                        type="button"
                        onClick={handleCheckoutSubmit} 
                        disabled={isSubmittingOrder || Boolean(duplicateRefError)}
                        className="w-full py-4 rounded-xl text-xs sm:text-sm font-black tracking-widest uppercase flex items-center justify-center gap-2.5 transition-all hover:brightness-105 active:scale-[0.99] shadow-lg relative overflow-hidden disabled:opacity-50 disabled:hover:brightness-100"
                        style={{ backgroundColor: duplicateRefError ? '#dc2626' : primaryColor, color: primaryTextColor }}
                      >
                        {isSubmittingOrder ? <Loader2 size={18} className="animate-spin" style={{ color: primaryTextColor }} /> : duplicateRefError ? <AlertTriangle size={18} /> : <CreditCard size={18} />}
                        <span>{isSubmittingOrder ? 'Procesando Pedido...' : duplicateRefError ? 'Referencia Duplicada' : 'Confirmar y Pagar'}</span>
                      </button>
                    ) : (
                      <button 
                        type="button"
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
                        style={checkoutAddress ? { backgroundColor: primaryColor, color: primaryTextColor } : {}}
                        className={`w-full py-4 rounded-xl text-xs sm:text-sm font-black tracking-widest uppercase flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-[0.99] ${
                          !checkoutAddress 
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                            : 'hover:brightness-105'
                        }`}
                      >
                        <span>Continuar al Pago</span>
                        <ArrowRight size={18} />
                      </button>
                    )
                  ) : !currentCustomer ? (
                    <button 
                      type="button"
                      onClick={() => {
                        setAuthGateMode('login');
                        setShowAuthModal(true);
                      }} 
                      className="w-full py-4 rounded-xl text-xs sm:text-sm font-black tracking-widest uppercase flex items-center justify-center gap-2.5 transition-all hover:brightness-105 active:scale-[0.99] shadow-lg cursor-pointer"
                      style={{ backgroundColor: primaryColor, color: primaryTextColor }}
                    >
                      <User size={18} />
                      <span>Ingresar como Cliente para Comprar</span>
                    </button>
                  ) : (
                    <button 
                      type="button"
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
                      className="w-full py-4 rounded-xl text-xs sm:text-sm font-black tracking-widest uppercase flex items-center justify-center gap-2.5 transition-all hover:brightness-105 active:scale-[0.99] shadow-lg relative overflow-hidden group"
                      style={{ backgroundColor: primaryColor, color: primaryTextColor }}
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

      {/* Success Modal con PIN Secreto de Entrega */}
      <ResponsiveModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        className="md:max-w-md bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10"
        contentClassName="p-6 text-center"
      >
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
          <CheckCircle2 className="text-emerald-500" size={36} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">¡Pedido Registrado con Éxito!</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          Tu orden <span className="font-bold text-slate-800 dark:text-slate-200">#{lastPlacedOrder?.id}</span> ha sido recibida y se encuentra en proceso.
        </p>

        {/* Tarjeta Destacada de Seguridad: PIN Secreto de Entrega */}
        <div className="mb-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10 border-2 border-amber-300 dark:border-amber-500/40 rounded-2xl p-4 text-left shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="p-1 rounded-md bg-amber-500 text-white">
                <Lock size={13} />
              </span>
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">
                PIN Secreto de Entrega
              </span>
            </div>
            <span className="text-[10px] bg-amber-200/60 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-bold px-2 py-0.5 rounded-full">
              Requerido al recibir
            </span>
          </div>

          <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-500/30 rounded-xl px-4 py-3 shadow-inner">
            <span className="font-mono text-3xl font-black tracking-[0.3em] text-slate-900 dark:text-amber-400">
              {lastPlacedOrder?.deliveryPin || '------'}
            </span>
            <button
              type="button"
              onClick={() => {
                if (lastPlacedOrder?.deliveryPin) {
                  navigator.clipboard.writeText(lastPlacedOrder.deliveryPin);
                  setPinCopied(true);
                  setTimeout(() => setPinCopied(false), 2500);
                }
              }}
              className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              {pinCopied ? <Check size={14} /> : <Copy size={14} />}
              <span>{pinCopied ? '¡Copiado!' : 'Copiar'}</span>
            </button>
          </div>

          <p className="text-[11px] text-amber-900/90 dark:text-amber-300/90 mt-2.5 font-medium leading-relaxed">
            🛡️ <strong>Importante:</strong> Dicta este código único al repartidor únicamente cuando recibas tu paquete en tus manos para validar la entrega.
          </p>
        </div>
        
        <div className="space-y-2.5">
          {merchantWhatsAppUrl && (
            <a
              href={merchantWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <MessageCircle size={18} />
              <span>Notificar Pedido al Comercio por WhatsApp</span>
            </a>
          )}
          <button 
            onClick={() => {
              setShowSuccessModal(false);
              navigate('/profile', { state: { tab: 'pedidos' } });
            }}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-bold transition-all shadow-md shadow-amber-500/25 flex items-center justify-center gap-2 text-sm cursor-pointer"
          >
            Ver estado en Mis Pedidos <ArrowRight size={16} />
          </button>
          <button 
            onClick={() => setShowSuccessModal(false)}
            className="w-full py-3 bg-slate-100 dark:bg-zinc-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-xl font-semibold transition-colors text-sm cursor-pointer"
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

              {/* Discount Input — Oculto temporalmente a solicitud */}
              {/*
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
              */}

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
            <MapIcon size={18} /> Explorar más tiendas
          </button>
        </div>
      </ResponsiveModal>
      {/* Botón flotante en esquina izquierda cuando la barra está oculta con el color de tema del comerciante */}
      {!isBottomNavOpen && (
        <button
          onClick={() => setIsBottomNavOpen(true)}
          className="fixed bottom-5 left-4 md:left-[calc(50%-330px)] z-50 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
          style={{
            backgroundColor: primaryColor || '#ea580c',
            background: primaryColor || '#ea580c',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '2px solid rgba(255, 255, 255, 0.7)',
            boxShadow: `0 8px 30px ${primaryColor ? primaryColor + '66' : 'rgba(234, 88, 12, 0.45)'}`
          }}
          title="Abrir menú"
          aria-label="Abrir menú de navegación"
        >
          <Store size={22} className="stroke-[2.2] text-white" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white shadow-xs"></span>
          </span>
        </button>
      )}

      {/* Mobile Bottom Navigation Bar - Con acento y resplandor dinámico del color de la tienda */}
      {isBottomNavOpen && (
        <nav 
          className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[420px] z-50 rounded-2xl dark-glass-nav transition-all duration-200"
          style={{
            backgroundColor: 'rgba(12, 12, 14, 0.90)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: `1.5px solid ${primaryColor ? primaryColor + '45' : 'rgba(255, 255, 255, 0.20)'}`,
            boxShadow: `0 20px 50px rgba(0, 0, 0, 0.85), 0 0 25px ${primaryColor ? primaryColor + '25' : 'transparent'}`
          }}
        >
          <div className="flex justify-between items-center h-16 px-2 relative">
            <button
              onClick={() => setCurrentPage('home')}
              className="flex-1 flex flex-col items-center gap-1 p-2 active:scale-90 transition-transform cursor-pointer"
              style={currentPage === 'home' ? { color: primaryColor } : { color: '#ffffff' }}
            >
              <Store size={22} className={currentPage === 'home' ? "stroke-[2.4]" : "text-white opacity-95"} style={currentPage === 'home' ? { color: primaryColor } : {}} />
              <span className={`text-[10px] ${currentPage === 'home' ? 'font-black' : 'font-bold text-white'}`} style={currentPage === 'home' ? { color: primaryColor } : {}}>{texts?.nav1 || 'Inicio'}</span>
            </button>
            
            <button
              onClick={() => setCurrentPage('products')}
              className="flex-1 flex flex-col items-center gap-1 p-2 active:scale-90 transition-transform cursor-pointer"
              style={currentPage === 'products' ? { color: primaryColor } : { color: '#ffffff' }}
            >
              <Package size={22} className={currentPage === 'products' ? "stroke-[2.4]" : "text-white opacity-95"} style={currentPage === 'products' ? { color: primaryColor } : {}} />
              <span className={`text-[10px] ${currentPage === 'products' ? 'font-black' : 'font-bold text-white'}`} style={currentPage === 'products' ? { color: primaryColor } : {}}>{texts?.nav2 || 'Catálogo'}</span>
            </button>

            {/* Standard Button for Cart */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex-1 flex flex-col items-center gap-1 p-2 active:scale-90 transition-transform relative cursor-pointer"
              style={isCartOpen ? { color: primaryColor } : { color: '#ffffff' }}
            >
              <div className="relative">
                <ShoppingCart size={22} className={isCartOpen ? "stroke-[2.4]" : "text-white opacity-95"} style={isCartOpen ? { color: primaryColor } : {}} />
                {totalCartItems > 0 && (
                  <span 
                    className="absolute -top-2 -right-2 min-w-4 h-4 px-1 font-black text-[9px] flex items-center justify-center rounded-full shadow-sm"
                    style={{ backgroundColor: primaryColor, color: primaryTextColor }}
                  >
                    {totalCartItems}
                  </span>
                )}
              </div>
              <span className={`text-[10px] ${isCartOpen ? 'font-black' : 'font-bold text-white'}`} style={isCartOpen ? { color: primaryColor } : {}}>Carrito</span>
            </button>

            <button
              onClick={() => setCurrentPage('offers')}
              className="flex-1 flex flex-col items-center gap-1 p-2 active:scale-90 transition-transform cursor-pointer"
              style={currentPage === 'offers' ? { color: primaryColor } : { color: '#ffffff' }}
            >
              <Tag size={22} className={currentPage === 'offers' ? "stroke-[2.4]" : "text-white opacity-95"} style={currentPage === 'offers' ? { color: primaryColor } : {}} />
              <span className={`text-[10px] ${currentPage === 'offers' ? 'font-black' : 'font-bold text-white'}`} style={currentPage === 'offers' ? { color: primaryColor } : {}}>{texts?.nav3 || 'Ofertas'}</span>
            </button>

            {/* Botón para cerrar la barra al instante y liberar pantalla */}
            <button
              onClick={() => setIsBottomNavOpen(false)}
              className="absolute -top-3 -right-2 w-7 h-7 rounded-full border border-white/25 flex items-center justify-center shadow-lg cursor-pointer text-white hover:text-rose-400 transition-colors"
              style={{ backgroundColor: 'rgba(24, 24, 27, 0.95)' }}
              title="Ocultar menú"
            >
              <X size={14} />
            </button>
          </div>
        </nav>
      )}

      {/* Modal / Sheet de Personalización de Color de Marca (Exclusivo Dueño en su Vitrina) */}
      <ResponsiveModal
        isOpen={brandColorCustomizerOpen}
        onClose={() => {
          setLiveBrandColor(null);
          setBrandColorCustomizerOpen(false);
        }}
        className="md:max-w-xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10"
        contentClassName="p-5 sm:p-6"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <Palette size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Color de Marca de tu Vitrina</h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Prueba los colores en vivo. Solo afecta a tu vitrina, no a tu panel ni al POS.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setLiveBrandColor(null);
              setBrandColorCustomizerOpen(false);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Swatches Grid */}
        <div className="py-4">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Elige una combinación de marca:
            </span>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
              <span className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: primaryColor }} />
              <span>{primaryColor.toUpperCase()}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
            {STOREFRONT_COLOR_PRESETS.map((preset) => {
              const isSelected = (primaryColor || '').toLowerCase() === preset.hex.toLowerCase();
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setLiveBrandColor(preset.hex);
                    setCustomHexInput(preset.hex);
                  }}
                  className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-slate-900 dark:border-white ring-2 ring-slate-900/10 dark:ring-white/20 bg-slate-100 dark:bg-zinc-800 shadow-xs'
                      : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                  }`}
                >
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 shadow-xs border border-black/10"
                    style={{ backgroundColor: preset.hex }}
                  >
                    {isSelected && (
                      <CheckCircle2 size={13} style={{ color: getContrastTextColor(preset.hex) }} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">{preset.name}</p>
                    <p className="text-[9px] text-slate-400 dark:text-zinc-500 truncate">{preset.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selector a la medida */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">Personalizado:</span>
              <input
                type="color"
                value={isValidHex(primaryColor) ? primaryColor : DEFAULT_STOREFRONT_COLOR}
                onChange={(e) => {
                  const val = e.target.value;
                  setLiveBrandColor(val);
                  setCustomHexInput(val);
                }}
                className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent p-0"
                title="Rueda de color"
              />
              <input
                type="text"
                value={customHexInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomHexInput(val);
                  if (isValidHex(val)) {
                    setLiveBrandColor(val);
                  }
                }}
                placeholder="#HEX"
                maxLength={7}
                className="w-20 px-2 py-1 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-mono font-bold text-slate-800 dark:text-white uppercase focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setLiveBrandColor(DEFAULT_STOREFRONT_COLOR);
                setCustomHexInput(DEFAULT_STOREFRONT_COLOR);
              }}
              className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <RotateCcw size={11} /> Ámbar Original
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setLiveBrandColor(null);
              setBrandColorCustomizerOpen(false);
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isSavingColor}
            onClick={() => handleSaveBrandColor(primaryColor)}
            style={{ backgroundColor: primaryColor, color: primaryTextColor }}
            className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {isSavingColor ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span>{isSavingColor ? 'Guardando...' : 'Guardar en Vitrina'}</span>
          </button>
        </div>
      </ResponsiveModal>

      {/* Modal de Personalización de Cuadro de Ofertas (Exclusivo Dueño en su Vitrina) */}
      <ResponsiveModal
        isOpen={offersCustomizerOpen}
        onClose={() => {
          if (!isSavingOffers) setOffersCustomizerOpen(false);
        }}
        className="md:max-w-xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10"
        contentClassName="p-5 sm:p-6"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <Tag size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Personalizar Sección de Ofertas</h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Ajusta el título, subtítulo explicativo y la imagen de portada de tus promociones.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!isSavingOffers) setOffersCustomizerOpen(false);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="py-4 space-y-5 max-h-[72vh] overflow-y-auto px-0.5">
          {/* 1. Título de la sección y Color */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                Título de Ofertas (Tamaño Grande)
              </label>
              <button
                type="button"
                onClick={() => applyBoldFormatting(titleInputRef, editOffersTitle, setEditOffersTitle)}
                className="px-2.5 py-0.5 rounded text-[11px] font-black border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-700 flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition-all"
                title="Selecciona texto y pulsa aquí (o Ctrl+B) para ponerlo en negrita"
              >
                <span className="font-black text-xs">B</span>
                <span className="text-[10px]">Negrita</span>
              </button>
            </div>
            <input
              ref={titleInputRef}
              type="text"
              value={editOffersTitle}
              onChange={(e) => setEditOffersTitle(e.target.value)}
              onKeyDown={(e) => handleBoldKeyDown(e, titleInputRef, editOffersTitle, setEditOffersTitle)}
              placeholder="Ej: HUELE A **NAVIDAD**"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-[10px] text-slate-400">💡 Tip: Selecciona una palabra y pulsa <b>[ B Negrita ]</b> o <b>Ctrl+B</b> para destacarla.</p>
            
            {/* Paleta de Color del Título */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">Color del Título:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {['#0f172a', '#ea580c', '#dc2626', '#d97706', '#059669', '#2563eb', '#7c3aed', '#ffffff'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditOffersTitleColor(c)}
                    className={`w-5 h-5 rounded-full border transition-transform ${editOffersTitleColor === c ? 'scale-125 ring-2 ring-amber-500 ring-offset-1' : 'hover:scale-110'} ${c === '#ffffff' ? 'border-slate-300' : 'border-black/20'}`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
                <label className="relative flex items-center cursor-pointer ml-1" title="Color personalizado">
                  <input
                    type="color"
                    value={editOffersTitleColor.startsWith('#') && editOffersTitleColor.length === 7 ? editOffersTitleColor : '#0f172a'}
                    onChange={(e) => setEditOffersTitleColor(e.target.value)}
                    className="w-6 h-6 rounded-full cursor-pointer opacity-0 absolute inset-0"
                  />
                  <div className="w-6 h-6 rounded-full border border-slate-300 bg-gradient-to-tr from-rose-500 via-amber-400 to-blue-500 flex items-center justify-center text-[10px] text-white font-bold shadow-2xs">
                    +
                  </div>
                </label>
                <span className="text-[10px] font-mono text-slate-400 ml-1">{editOffersTitleColor}</span>
              </div>
            </div>
          </div>

          {/* 2. Subtítulo / Preámbulo y Color */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                Subtítulo / Preámbulo de la Tienda
              </label>
              <button
                type="button"
                onClick={() => applyBoldFormatting(subtitleInputRef, editOffersSubtitle, setEditOffersSubtitle)}
                className="px-2.5 py-0.5 rounded text-[11px] font-black border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-zinc-700 flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95 transition-all"
                title="Selecciona texto y pulsa aquí (o Ctrl+B) para ponerlo en negrita"
              >
                <span className="font-black text-xs">B</span>
                <span className="text-[10px]">Negrita</span>
              </button>
            </div>
            <textarea
              ref={subtitleInputRef}
              rows={2}
              value={editOffersSubtitle}
              onChange={(e) => setEditOffersSubtitle(e.target.value)}
              onKeyDown={(e) => handleBoldKeyDown(e, subtitleInputRef, editOffersSubtitle, setEditOffersSubtitle)}
              placeholder="Ej: Comparte con tu familia los mejores **ASADOS** de Cagua"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-xs sm:text-sm font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none leading-relaxed"
            />

            {/* Paleta de Color del Subtítulo */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">Color del Subtítulo:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {['#334155', '#64748b', '#94a3b8', '#b45309', '#c2410c', '#047857', '#1d4ed8', '#ffffff'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditOffersSubtitleColor(c)}
                    className={`w-5 h-5 rounded-full border transition-transform ${editOffersSubtitleColor === c ? 'scale-125 ring-2 ring-amber-500 ring-offset-1' : 'hover:scale-110'} ${c === '#ffffff' ? 'border-slate-300' : 'border-black/20'}`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
                <label className="relative flex items-center cursor-pointer ml-1" title="Color personalizado">
                  <input
                    type="color"
                    value={editOffersSubtitleColor.startsWith('#') && editOffersSubtitleColor.length === 7 ? editOffersSubtitleColor : '#64748b'}
                    onChange={(e) => setEditOffersSubtitleColor(e.target.value)}
                    className="w-6 h-6 rounded-full cursor-pointer opacity-0 absolute inset-0"
                  />
                  <div className="w-6 h-6 rounded-full border border-slate-300 bg-gradient-to-tr from-rose-500 via-amber-400 to-blue-500 flex items-center justify-center text-[10px] text-white font-bold shadow-2xs">
                    +
                  </div>
                </label>
                <span className="text-[10px] font-mono text-slate-400 ml-1">{editOffersSubtitleColor}</span>
              </div>
            </div>
          </div>

          {/* 3. Previsualización en Vivo de Textos y Colores */}
          <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Vista Previa de Tipografía (con Negritas y Colores)
            </span>
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: editOffersTitleColor }}>
              {renderFormattedText(editOffersTitle || 'Ofertas Flash')}
            </div>
            <div className="text-xs sm:text-sm mt-0.5 leading-relaxed font-medium" style={{ color: editOffersSubtitleColor }}>
              {renderFormattedText(editOffersSubtitle || 'Aprovecha los mejores precios y promociones exclusivas de la tienda.')}
            </div>
          </div>

          {/* 4. Imagen de Portada / Banner y Recuadro de Encuadre */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                Imagen de Portada / Banner
              </label>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400">
                📐 1200 x 600 px (2:1 o 16:9)
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mb-2">
              Se mostrará en la parte superior con encuadre panorámico completo sin textos que la tapen.
            </p>

            <input 
              type="file" 
              ref={offersBannerInputRef} 
              onChange={handleBannerFileSelect} 
              accept="image/*" 
              className="hidden" 
            />

            {editOffersBannerUrl ? (
              <div className="space-y-2">
                {/* Recuadro de Encuadre Visual con guías de marco */}
                <div className="relative aspect-[2/1] w-full rounded-2xl overflow-hidden border-2 border-amber-500/50 shadow-md bg-slate-950 group">
                  <img 
                    src={resolveImageUrl(editOffersBannerUrl)} 
                    alt="Vista previa de banner" 
                    className="w-full h-full object-cover object-center" 
                  />
                  
                  {/* Guías visuales de encuadre de marco en las 4 esquinas */}
                  <div className="absolute inset-2 pointer-events-none border border-white/30 rounded-xl">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-400"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-400"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-400"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-400"></div>
                  </div>

                  {/* Indicador de Marco de Visión */}
                  <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-400/30 flex items-center gap-1 shadow-sm">
                    <span>Área visible en Vitrina</span>
                  </div>

                  {/* Botones de acción sobre la imagen */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                    <button
                      type="button"
                      onClick={() => offersBannerInputRef.current?.click()}
                      disabled={isUploadingBanner}
                      className="px-2.5 py-1 rounded-lg bg-black/75 hover:bg-black text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer backdrop-blur-xs shadow-sm"
                      title="Cambiar imagen"
                    >
                      <UploadCloud size={13} />
                      <span className="text-[10px]">Cambiar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditOffersBannerUrl('')}
                      className="p-1.5 rounded-lg bg-red-600/85 hover:bg-red-600 text-white transition-all cursor-pointer backdrop-blur-xs shadow-sm"
                      title="Quitar imagen"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 text-center">
                  💡 Este recuadro delimita exactamente el rango de visión que verán tus clientes.
                </p>
              </div>
            ) : (
              <div 
                onClick={() => offersBannerInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-zinc-800 hover:border-amber-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/70 dark:bg-zinc-900/50 group"
              >
                {isUploadingBanner ? (
                  <div className="flex flex-col items-center justify-center py-3">
                    <Loader2 size={26} className="animate-spin text-amber-500 mb-1.5" />
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Subiendo imagen al marco...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-2">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform shadow-2xs">
                      <ImageIcon size={24} />
                    </div>
                    <span className="text-xs font-black text-slate-800 dark:text-zinc-200">
                      Toca para seleccionar tu imagen de portada
                    </span>
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-1">
                      Medidas ideales: 1200 x 600 px (panorámica 2:1)
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      Formatos compatibles: JPG, PNG, WEBP (hasta 5 MB)
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={isSavingOffers}
            onClick={() => setOffersCustomizerOpen(false)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isSavingOffers || isUploadingBanner}
            onClick={handleSaveOffersConfig}
            style={{ backgroundColor: primaryColor, color: primaryTextColor }}
            className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {isSavingOffers ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            <span>{isSavingOffers ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        </div>
      </ResponsiveModal>

      {/* ═══ MODAL 1: EDICIÓN RÁPIDA DE INFORMACIÓN DE TIENDA ═══ */}
      <ResponsiveModal
        isOpen={storeInfoModalOpen}
        onClose={() => setStoreInfoModalOpen(false)}
        title="Editar Información de la Tienda"
        disableAnimation={true}
      >
        <div className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
              Nombre de la Tienda / Comercio
            </label>
            <input
              type="text"
              value={editStoreName}
              onChange={(e) => setEditStoreName(e.target.value)}
              placeholder="Ej: Los Mejores Asados"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
              Descripción corta / Biografía
            </label>
            <textarea
              rows={2}
              value={editStoreBio}
              onChange={(e) => setEditStoreBio(e.target.value)}
              placeholder="Ej: Hamburguesas a la parrilla, pepitos y cortes de primera..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                Teléfono / WhatsApp
              </label>
              <input
                type="text"
                value={editStorePhone}
                onChange={(e) => setEditStorePhone(e.target.value)}
                placeholder="Ej: +58 412 1234567"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                Dirección física
              </label>
              <input
                type="text"
                value={editStoreAddress}
                onChange={(e) => setEditStoreAddress(e.target.value)}
                placeholder="Ej: Av. Principal, Local 4B"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-zinc-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-zinc-800">
            <span className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2">
              Horario de Atención
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-zinc-400 mb-1">
                  Hora Apertura
                </label>
                <input
                  type="time"
                  value={editStoreOpenTime}
                  onChange={(e) => setEditStoreOpenTime(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-zinc-400 mb-1">
                  Hora Cierre
                </label>
                <input
                  type="time"
                  value={editStoreCloseTime}
                  onChange={(e) => setEditStoreCloseTime(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={isSavingStoreInfo}
              onClick={() => setStoreInfoModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSavingStoreInfo}
              onClick={handleSaveStoreInfo}
              style={{ backgroundColor: primaryColor, color: primaryTextColor }}
              className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isSavingStoreInfo ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              <span>{isSavingStoreInfo ? 'Guardando...' : 'Guardar Información'}</span>
            </button>
          </div>
        </div>
      </ResponsiveModal>

      {/* ═══ MODAL 2: POSTULACIÓN DE EMPLEO / ENVIAR CV ═══ */}
      <ResponsiveModal
        isOpen={jobModalOpen}
        onClose={() => {
          setJobModalOpen(false);
          setSelectedJobOpening(null);
        }}
        title="Postularme a Vacante / Enviar CV"
        disableAnimation={true}
      >
        <form onSubmit={handleSubmitApplication} className="space-y-4 text-left">
          {/* Ficha informativa de la vacante seleccionada */}
          {selectedJobOpening && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-black text-amber-900 dark:text-amber-300">
                  Vacante: {selectedJobOpening.title}
                </span>
              </div>
              {selectedJobOpening.description && (
                <p className="text-[11px] text-slate-600 dark:text-zinc-300 mb-2 leading-relaxed">
                  {selectedJobOpening.description}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px] text-slate-700 dark:text-zinc-300 bg-white/70 dark:bg-zinc-900/60 p-2 rounded-xl">
                {selectedJobOpening.ageRange && (
                  <div><span className="font-bold text-amber-700">🎂 Edad:</span> {selectedJobOpening.ageRange}</div>
                )}
                {selectedJobOpening.locationRequired && (
                  <div><span className="font-bold text-amber-700">📍 Zona:</span> {selectedJobOpening.locationRequired}</div>
                )}
                {selectedJobOpening.educationLevel && (
                  <div><span className="font-bold text-amber-700">🎓 Estudios:</span> {selectedJobOpening.educationLevel}</div>
                )}
                {selectedJobOpening.requiredDocs && (
                  <div className="sm:col-span-2"><span className="font-bold text-amber-700">📄 Docs requeridos:</span> {selectedJobOpening.requiredDocs}</div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                Nombre y Apellido *
              </label>
              <input
                type="text"
                required
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                placeholder="Ej: Carlos Pérez"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                Teléfono / WhatsApp *
              </label>
              <input
                type="tel"
                required
                value={applicantPhone}
                onChange={(e) => setApplicantPhone(e.target.value)}
                placeholder="Ej: 0414 1234567"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                Tu Edad *
              </label>
              <input
                type="number"
                min="16"
                max="75"
                required
                value={applicantAge}
                onChange={(e) => setApplicantAge(e.target.value)}
                placeholder="Ej: 24"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                Zona donde vives *
              </label>
              <input
                type="text"
                required
                value={applicantLocation}
                onChange={(e) => setApplicantLocation(e.target.value)}
                placeholder="Ej: Centro / Los Guayos"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                Nivel Académico
              </label>
              <select
                value={applicantEducation}
                onChange={(e) => setApplicantEducation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                <option value="Bachiller">Bachiller</option>
                <option value="Estudiante Universitario">Estudiante Universitario</option>
                <option value="TSU">TSU</option>
                <option value="Universitario / Licenciado">Universitario / Licenciado</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
              Cargo de Interés
            </label>
            <input
              type="text"
              value={applicantPosition}
              onChange={(e) => setApplicantPosition(e.target.value)}
              placeholder="Ej: Personal de Cocina, Despachador..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
          </div>

          {/* Confirmación de Documentos */}
          <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 cursor-pointer">
            <input
              type="checkbox"
              checked={applicantHasDocuments}
              onChange={(e) => setApplicantHasDocuments(e.target.checked)}
              className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
            />
            <span className="text-xs text-slate-700 dark:text-zinc-300 font-medium">
              Dispongo de mis documentos de identidad y requisitos en regla
            </span>
          </label>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
              Experiencia previa o notas adicionales
            </label>
            <textarea
              rows={2}
              value={applicantNotes}
              onChange={(e) => setApplicantNotes(e.target.value)}
              placeholder="Cuéntanos sobre tus trabajos anteriores o disponibilidad horaria..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
            />
          </div>

          {/* Carga de Archivo CV */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
              Adjuntar Currículum Vitae (PDF o Imagen) *
            </label>
            <input
              type="file"
              ref={applicantCvInputRef}
              accept=".pdf,.doc,.docx,image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setApplicantCvFile(e.target.files[0]);
                }
              }}
            />
            <div
              onClick={() => applicantCvInputRef.current?.click()}
              className={`p-4 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                applicantCvFile
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : 'border-slate-300 dark:border-zinc-800 hover:border-amber-500 bg-slate-50/70 dark:bg-zinc-900/50'
              }`}
            >
              <div className="flex flex-col items-center justify-center gap-1.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  applicantCvFile ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                }`}>
                  <FileText size={20} />
                </div>
                {applicantCvFile ? (
                  <>
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                      Archivo cargado: {applicantCvFile.name}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {(applicantCvFile.size / 1024).toFixed(1)} KB — Toca para cambiar de archivo
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-black text-slate-800 dark:text-zinc-200">
                      Toca aquí para seleccionar tu CV (PDF o Imagen)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Formatos compatibles: PDF, JPG, PNG (hasta 10 MB)
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={isSubmittingJob}
              onClick={() => {
                setJobModalOpen(false);
                setSelectedJobOpening(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmittingJob}
              style={{ backgroundColor: primaryColor, color: primaryTextColor }}
              className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isSubmittingJob ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
              <span>{isSubmittingJob ? 'Enviando Postulación...' : 'Enviar Postulación'}</span>
            </button>
          </div>
        </form>
      </ResponsiveModal>

      {/* ═══ MODAL 3: GESTIÓN DE EMPLEOS Y CURRÍCULUMS (PANEL COMERCIANTE) ═══ */}
      <ResponsiveModal
        isOpen={jobAdminModalOpen}
        onClose={() => setJobAdminModalOpen(false)}
        title="Gestión de Empleos y Vacantes de la Tienda"
        disableAnimation={true}
      >
        <div className="space-y-4 text-left">
          {/* Selector de Pestañas del Modal */}
          <div className="flex border-b border-slate-200 dark:border-zinc-800 gap-1 pb-1">
            <button
              type="button"
              onClick={() => setJobAdminTab('openings')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                jobAdminTab === 'openings'
                  ? 'bg-amber-500 text-zinc-950 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Vacantes ({jobsConfig.openings.length})
            </button>
            <button
              type="button"
              onClick={() => setJobAdminTab('applications')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                jobAdminTab === 'applications'
                  ? 'bg-amber-500 text-zinc-950 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Postulaciones Recibidas ({jobsConfig.applications.length})
            </button>
          </div>

          {/* PESTAÑA 1: GESTIÓN DE VACANTES (CREAR, EDITAR, ELIMINAR) */}
          {jobAdminTab === 'openings' && (
            <div className="space-y-4">
              {/* Formulario de Crear / Editar Vacante */}
              <form onSubmit={handleSaveJobOpening} className="p-3.5 bg-slate-50 dark:bg-zinc-900/60 rounded-2xl border border-slate-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                    {editingOpeningId ? '✏️ Editar Oferta de Trabajo' : '➕ Publicar Nueva Oferta de Trabajo'}
                  </h4>
                  {editingOpeningId && (
                    <button
                      type="button"
                      onClick={handleOpenCreateOpening}
                      className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                    >
                      Cancelar Edición
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-0.5">
                      Título del Cargo *
                    </label>
                    <input
                      type="text"
                      required
                      value={openingTitle}
                      onChange={(e) => setOpeningTitle(e.target.value)}
                      placeholder="Ej: Cocinero de Hamburguesas / Parrillero"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-0.5">
                      Rango de Edad
                    </label>
                    <input
                      type="text"
                      value={openingAgeRange}
                      onChange={(e) => setOpeningAgeRange(e.target.value)}
                      placeholder="Ej: 20 a 35 años / Indiferente"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-0.5">
                      Zona de Residencia Requerida
                    </label>
                    <input
                      type="text"
                      value={openingLocation}
                      onChange={(e) => setOpeningLocation(e.target.value)}
                      placeholder="Ej: Vivir en zona céntrica / norte"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-0.5">
                      Nivel Académico / Título
                    </label>
                    <input
                      type="text"
                      value={openingEducation}
                      onChange={(e) => setOpeningEducation(e.target.value)}
                      placeholder="Ej: Bachiller / TSU / Indiferente"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-0.5">
                      Documentos Necesarios
                    </label>
                    <input
                      type="text"
                      value={openingDocs}
                      onChange={(e) => setOpeningDocs(e.target.value)}
                      placeholder="Ej: Cédula, RIF, Manipulación de alimentos"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-0.5">
                      Requisitos y Experiencia
                    </label>
                    <input
                      type="text"
                      value={openingRequirements}
                      onChange={(e) => setOpeningRequirements(e.target.value)}
                      placeholder="Ej: Mínimo 6 meses de experiencia en comida rápida"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-0.5">
                      Descripción de Funciones
                    </label>
                    <textarea
                      rows={2}
                      value={openingDescription}
                      onChange={(e) => setOpeningDescription(e.target.value)}
                      placeholder="Ej: Elaboración de hamburguesas a la parrilla y preparación de insumos..."
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSavingJobsConfig || !openingTitle.trim()}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isSavingJobsConfig ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>{editingOpeningId ? 'Guardar Cambios de Vacante' : 'Publicar Vacante en Vitrina'}</span>
                </button>
              </form>

              {/* Lista de vacantes existentes */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Vacantes Existentes ({jobsConfig.openings.length})
                </h5>
                {jobsConfig.openings.map((op) => (
                  <div
                    key={op.id}
                    className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-black ${op.active ? 'text-slate-900 dark:text-white' : 'text-slate-400 line-through'}`}>
                        {op.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleJobOpening(op.id)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase transition-all cursor-pointer ${
                            op.active
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {op.active ? 'Activa' : 'Pausada'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditOpening(op)}
                          className="p-1 rounded-lg hover:bg-blue-50 text-blue-600 cursor-pointer"
                          title="Editar vacante"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteJobOpening(op.id)}
                          className="p-1 rounded-lg hover:bg-red-50 text-red-500 cursor-pointer"
                          title="Eliminar vacante"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 flex flex-wrap gap-2">
                      {op.ageRange && <span>🎂 {op.ageRange}</span>}
                      {op.locationRequired && <span>📍 {op.locationRequired}</span>}
                      {op.educationLevel && <span>🎓 {op.educationLevel}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PESTAÑA 2: POSTULACIONES RECIBIDAS */}
          {jobAdminTab === 'applications' && (
            <div>
              {jobsConfig.applications.length === 0 ? (
                <div className="p-6 border border-slate-200 dark:border-zinc-800 rounded-2xl text-center bg-slate-50/50 dark:bg-zinc-900/40">
                  <Briefcase size={28} className="mx-auto text-slate-400 mb-2 stroke-[1.5]" />
                  <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                    Aún no has recibido currículums
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Cuando los candidatos se postulen desde tu vitrina, aparecerán listados aquí con todos sus datos y su documento descargable.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {jobsConfig.applications.map((app) => (
                    <div
                      key={app.id || app.createdAt}
                      className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              {app.applicantName}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                              {app.position || 'Postulación General'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-zinc-400">
                            {app.age && <span>🎂 {app.age} años</span>}
                            {app.location && <span>📍 {app.location}</span>}
                            {app.education && <span>🎓 {app.education}</span>}
                            {app.createdAt && (
                              <span>📅 {new Date(app.createdAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>

                        {app.cvUrl && (
                          <a
                            href={app.cvUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-black flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 shrink-0"
                          >
                            <Download size={12} />
                            <span>Ver CV</span>
                          </a>
                        )}
                      </div>

                      {app.notes && (
                        <p className="text-[11px] bg-slate-50 dark:bg-zinc-800/60 p-2 rounded-lg text-slate-600 dark:text-zinc-300 italic">
                          "{app.notes}"
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-zinc-800">
                        <a
                          href={`https://wa.me/${(app.phone || '').replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          <MessageCircle size={12} />
                          Contactar: {app.phone}
                        </a>

                        <button
                          type="button"
                          onClick={() => handleDeleteApplication(app.id)}
                          className="text-[10px] text-red-500 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={11} />
                          <span>Descartar</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
            <button
              type="button"
              onClick={() => setJobAdminModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </ResponsiveModal>

      {/* Spacer for bottom nav */}
      <div className="h-20" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
      </div> {/* Fin del Contenedor Central Móvil */}
    </div> {/* Fin del Wrapper de Escritorio */}
  </GoogleOAuthProvider>
  );
}
