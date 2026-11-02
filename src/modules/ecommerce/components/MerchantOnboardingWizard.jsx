import React, { useState, useEffect, useRef } from 'react';
import { 
  Store, Flower2, Armchair, PawPrint, Hammer, BookOpen, Apple, Shirt, Utensils, PlusSquare, Truck, MoreHorizontal,
  Globe, MessageCircle, Rocket, Building2, ArrowRight, ArrowLeft, Check,
  Phone, Mail, Ban, Share2, Search, Sparkles, 
  Users, UserCheck, Video, Gift, 
  ShoppingBag, ShieldCheck, Loader2, X,
  LayoutDashboard, Package, Tag, BarChart3,
  Download, Smartphone, Laptop, CheckCircle2, Share,
  MapPin, Clock, CreditCard, Camera, UploadCloud, Trash2, CheckCircle, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../supabaseClient';
import { getCatalogForRubro } from '../data/seedCatalogs';
import AxonMarketDashboardPreview from './AxonMarketDashboardPreview';

const isIOSDevice = () => {
  return typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

const isAppStandalone = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    (document.referrer && document.referrer.includes('android-app://'))
  );
};

export const VZLA_BANKS = [
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
  '0166 - Banco Agrícola',
  '0168 - Bancrecer',
  '0169 - Mi Banco',
  '0171 - Banco Activo',
  '0172 - Bancamiga',
  '0174 - Banplus',
  '0175 - Banco Bicentenario',
  '0177 - Banfanb',
  '0191 - Banco Nacional de Crédito (BNC)'
];

export default function MerchantOnboardingWizard({ 
  isOpen = true, 
  onClose, 
  initialData = {}, 
  workspaceId = null,
  onComplete 
}) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Referencias a inputs de archivos para identidad visual
  const logoInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // Estados de Instalación PWA (Pantalla Final)
  const [isStandalone, setIsStandalone] = useState(() => isAppStandalone());
  const [deferredPrompt, setDeferredPrompt] = useState(() => (typeof window !== 'undefined' ? window.deferredPwaPrompt : null));
  const [isInstalledJustNow, setIsInstalledJustNow] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isIOS, setIsIOS] = useState(() => isIOSDevice());

  useEffect(() => {
    setIsStandalone(isAppStandalone());
    setIsIOS(isIOSDevice());

    const handlePrompt = (e) => {
      setDeferredPrompt(e.detail || window.deferredPwaPrompt);
    };

    const handleNativePrompt = (e) => {
      e.preventDefault();
      window.deferredPwaPrompt = e;
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalledJustNow(true);
      setIsStandalone(true);
      setDeferredPrompt(null);
      localStorage.setItem('is_merchant_app', 'true');
      localStorage.setItem('merchant_mode', 'true');
      toast.success('¡App de AxonMarket instalada con éxito!', { icon: '🎉' });
    };

    window.addEventListener('axon-pwa-prompt-available', handlePrompt);
    window.addEventListener('beforeinstallprompt', handleNativePrompt);
    window.addEventListener('axon-pwa-app-installed', handleAppInstalled);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('axon-pwa-prompt-available', handlePrompt);
      window.removeEventListener('beforeinstallprompt', handleNativePrompt);
      window.removeEventListener('axon-pwa-app-installed', handleAppInstalled);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // -------------------------------------------------------------
  // FORM STATES: Datos Reales de la Tienda y Onboarding Completo
  // -------------------------------------------------------------

  // Paso 1: Identidad y Expediente Fiscal
  const [ownerName, setOwnerName] = useState(initialData.ownerName || '');
  const [businessName, setBusinessName] = useState(initialData.businessName || '');
  const [rubro, setRubro] = useState(initialData.rubro || 'ferreteria');
  const [whatsapp, setWhatsapp] = useState(initialData.whatsapp || '');
  const [rifPrefix, setRifPrefix] = useState('V');
  const [rifNumber, setRifNumber] = useState('');

  // Paso 2: ¿Por dónde vendes? (Commercy step)
  const [salesChannels, setSalesChannels] = useState(['local']);

  // Paso 3: ¿Con qué te manejas hoy? (Commercy step)
  const [currentSystems, setCurrentSystems] = useState(['excel']);

  // Paso 4: ¿Cómo prefieres que te ayudemos? (Commercy step)
  const [supportPreference, setSupportPreference] = useState('whatsapp');

  // Paso 5: Dirección y Ubicación Física
  const [addressState, setAddressState] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [gpsCoords, setGpsCoords] = useState(null);

  // Paso 6: Horarios de Atención Comercial
  const [scheduleActive, setScheduleActive] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState('08:00');
  const [scheduleClose, setScheduleClose] = useState('18:00');
  const [closeWarningMinutes, setCloseWarningMinutes] = useState(30);
  const [workingDays, setWorkingDays] = useState({
    lunes: true,
    martes: true,
    miercoles: true,
    jueves: true,
    viernes: true,
    sabado: true,
    domingo: false
  });

  // Paso 7: Pago Móvil / Número de Cuenta para Cobrar
  const [pagoMovilBank, setPagoMovilBank] = useState('0102 - Banco de Venezuela');
  const [pagoMovilPhone, setPagoMovilPhone] = useState('');
  const [pagoMovilId, setPagoMovilId] = useState('');

  // Paso 8: Identidad Visual (Logotipo y Portada)
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);

  // Paso 9: Precarga de catálogo
  const [preloadCatalog, setPreloadCatalog] = useState(true);

  if (!isOpen) return null;

  const catalog = getCatalogForRubro(rubro);

  // Calcular fecha de fin de prueba de 7 días
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 7);
  const formattedTrialEnd = trialEndDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'numeric' });

  // 12 Rubros adaptados al comercio venezolano profesional
  const RUBROS = [
    { id: 'ferreteria', name: 'Ferretería', icon: Hammer },
    { id: 'perfumeria', name: 'Perfumería', icon: Flower2 },
    { id: 'dietetica', name: 'Salud y Fitness', icon: Apple },
    { id: 'petshop', name: 'Mascotas', icon: PawPrint },
    { id: 'almacen', name: 'Bodega y Abasto', icon: Store },
    { id: 'libreria', name: 'Librería y Papelería', icon: BookOpen },
    { id: 'bazar', name: 'Hogar y Variedades', icon: Armchair },
    { id: 'indumentaria', name: 'Ropa y Calzado', icon: Shirt },
    { id: 'gastronomia', name: 'Gastronomía', icon: Utensils },
    { id: 'farmacia', name: 'Farmacia', icon: PlusSquare },
    { id: 'distribuidora', name: 'Distribuidora', icon: Truck },
    { id: 'otro', name: 'Otro', icon: MoreHorizontal }
  ];

  // Helper de selección múltiple
  const toggleMultiSelect = (state, setState, value) => {
    if (state.includes(value)) {
      if (state.length > 1) {
        setState(state.filter(item => item !== value));
      }
    } else {
      setState([...state, value]);
    }
  };

  // Detección automática por GPS
  const handleDetectGPS = () => {
    if (typeof navigator !== 'undefined' && "geolocation" in navigator) {
      toast.loading('Detectando coordenadas GPS...', { id: 'gps-loading' });
      navigator.geolocation.getCurrentPosition(
        (position) => {
          toast.dismiss('gps-loading');
          const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
          setGpsCoords(coords);
          toast.success('¡Coordenadas GPS fijadas exitosamente!', { icon: '📍' });

          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`)
            .then(r => r.json())
            .then(data => {
              if (data && data.address) {
                if (!addressState && data.address.state) setAddressState(data.address.state);
                if (!addressCity && (data.address.city || data.address.town || data.address.county)) {
                  setAddressCity(data.address.city || data.address.town || data.address.county);
                }
                if (!addressLine && data.display_name) {
                  setAddressLine(data.display_name.split(',').slice(0, 3).join(','));
                }
              }
            })
            .catch(() => {});
        },
        (error) => {
          toast.dismiss('gps-loading');
          toast.error('No se pudo detectar el GPS. Puedes escribir la dirección manualmente.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      toast.error('Tu navegador no soporta geolocalización');
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('El logo no debe superar los 10 MB');
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
      toast.success('Logotipo cargado');
    }
  };

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 12 * 1024 * 1024) {
        toast.error('La foto de portada no debe superar los 12 MB');
        return;
      }
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
      toast.success('Foto de portada cargada');
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!ownerName.trim()) {
        toast.error('Por favor ingresa tu nombre');
        return;
      }
      if (!businessName.trim()) {
        toast.error('Por favor ingresa el nombre del negocio');
        return;
      }
      if (!whatsapp.trim() || whatsapp.replace(/\D/g, '').length < 7) {
        toast.error('Por favor ingresa tu número de WhatsApp válido');
        return;
      }
      if (rifNumber && rifNumber.replace(/\D/g, '').length < 6) {
        toast.error('El RIF o cédula debe tener al menos 6 dígitos');
        return;
      }
    } else if (step === 5) {
      if (!gpsCoords && (!addressState.trim() || !addressCity.trim() || !addressLine.trim())) {
        toast.error('Ingresa al menos estado, ciudad y dirección, o detecta el GPS.');
        return;
      }
    } else if (step === 6) {
      if (!scheduleOpen || !scheduleClose) {
        toast.error('Por favor define la hora de apertura y cierre.');
        return;
      }
    } else if (step === 7) {
      if (!pagoMovilBank) {
        toast.error('Por favor selecciona el banco para recibir pagos.');
        return;
      }
      if (pagoMovilPhone && pagoMovilPhone.replace(/\D/g, '').length < 11) {
        toast.error('El teléfono de pago móvil debe tener 11 dígitos');
        return;
      }
    }

    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => Math.max(1, prev - 1));
  };

  // Guardar configuración completa en la base de datos
  const handleFinalize = async (withCatalog = true) => {
    setLoading(true);
    setPreloadCatalog(withCatalog);

    try {
      const activeWs = workspaceId || localStorage.getItem('activeWorkspace');
      const cleanSlug = businessName
        .trim()
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'mi-tienda';

      // 1. Subida de Logo y Portada a Supabase Storage (si existen)
      let uploadedLogoUrl = null;
      let uploadedCoverUrl = null;

      if (logoFile && activeWs) {
        try {
          const logoExt = logoFile.name.split('.').pop() || 'png';
          const logoPath = `store_assets/${activeWs}/logo_${Date.now()}.${logoExt}`;
          const { error: logoErr } = await supabase.storage.from('ecommerce').upload(logoPath, logoFile, { upsert: true });
          if (!logoErr) {
            const { data: logoData } = supabase.storage.from('ecommerce').getPublicUrl(logoPath);
            if (logoData?.publicUrl) uploadedLogoUrl = logoData.publicUrl;
          }
        } catch (e) {
          console.warn("Notice logo upload:", e);
        }
      }

      if (coverFile && activeWs) {
        try {
          const coverExt = coverFile.name.split('.').pop() || 'jpg';
          const coverPath = `store_assets/${activeWs}/cover_${Date.now()}.${coverExt}`;
          const { error: coverErr } = await supabase.storage.from('ecommerce').upload(coverPath, coverFile, { upsert: true });
          if (!coverErr) {
            const { data: coverData } = supabase.storage.from('ecommerce').getPublicUrl(coverPath);
            if (coverData?.publicUrl) uploadedCoverUrl = coverData.publicUrl;
          }
        } catch (e) {
          console.warn("Notice cover upload:", e);
        }
      }

      const resolvedAddress = addressLine.trim() || [addressCity.trim(), addressState.trim()].filter(Boolean).join(', ') || 'Venezuela';
      const fullRif = rifNumber.trim() ? `${rifPrefix}-${rifNumber.trim()}` : `${rifPrefix}-00000000`;
      const cleanPmPhone = pagoMovilPhone.trim() 
        ? (pagoMovilPhone.replace(/\D/g, '').startsWith('58') ? `+${pagoMovilPhone.replace(/\D/g, '')}` : `+58${pagoMovilPhone.replace(/\D/g, '')}`)
        : (whatsapp.replace(/\D/g, '').startsWith('58') ? `+${whatsapp.replace(/\D/g, '')}` : `+58${whatsapp.replace(/\D/g, '')}`);

      if (activeWs) {
        const { data: currentWs } = await supabase.from('workspaces').select('config').eq('id', activeWs).maybeSingle();
        const prevConfig = typeof currentWs?.config === 'object' && currentWs?.config !== null 
          ? currentWs.config 
          : (typeof currentWs?.config === 'string' ? JSON.parse(currentWs.config || '{}') : {});

        const merchantEmail = prevConfig.adminEmail || prevConfig.contact?.email || '';

        const updatedConfig = {
          ...prevConfig,
          adminEmail: merchantEmail,
          business_type: rubro,
          trialActive: true,
          plan: 'Prueba 7 Días Gratis',
          logoUrl: uploadedLogoUrl || prevConfig.logoUrl || null,
          coverUrl: uploadedCoverUrl || prevConfig.coverUrl || null,
          heroUrl: uploadedCoverUrl || prevConfig.heroUrl || null,
          storefront: {
            ...(prevConfig.storefront || {}),
            logoUrl: uploadedLogoUrl || prevConfig.storefront?.logoUrl || null,
            coverUrl: uploadedCoverUrl || prevConfig.storefront?.coverUrl || null,
            heroUrl: uploadedCoverUrl || prevConfig.storefront?.heroUrl || null
          },
          onboarding: {
            sales_channels: salesChannels,
            current_systems: currentSystems,
            support_preference: supportPreference,
            owner_name: ownerName.trim(),
            business_name: businessName.trim(),
            rubro
          },
          paymentProfile: {
            paymentMobile: true,
            pmBank: pagoMovilBank,
            pmPhone: cleanPmPhone,
            pmId: pagoMovilId.trim() || fullRif,
            zelleActive: false,
            cashActive: true
          },
          scheduleProfile: {
            scheduleActive: scheduleActive,
            workDays: workingDays,
            openTime: scheduleOpen,
            closeTime: scheduleClose,
            closeWarningMinutes: Number(closeWarningMinutes) || 30
          },
          address: resolvedAddress,
          location: gpsCoords ? {
            lat: gpsCoords.lat,
            lng: gpsCoords.lng,
            address: resolvedAddress
          } : null,
          expediente: {
            ownerName: ownerName.trim(),
            legalType: rifPrefix,
            rif: fullRif,
            state: addressState.trim() || 'Por definir',
            city: addressCity.trim() || 'Por definir',
            address: resolvedAddress,
            gps: gpsCoords,
            whatsapp: `+58${whatsapp.replace(/\D/g, '')}`
          },
          contact: {
            phone: `+58${whatsapp.replace(/\D/g, '')}`,
            ownerName: ownerName.trim(),
            ...(merchantEmail ? { email: merchantEmail } : {})
          },
          onboarding_completed: true
        };

        await supabase
          .from('workspaces')
          .update({
            name: businessName.trim() || 'Mi Tienda',
            store_slug: cleanSlug,
            latitude: gpsCoords?.lat || null,
            longitude: gpsCoords?.lng || null,
            map_address: resolvedAddress,
            config: updatedConfig
          })
          .eq('id', activeWs);

        await supabase.from('merchant_contacts').upsert([{
          id: activeWs,
          full_name: ownerName.trim(),
          phone: `+58${whatsapp.replace(/\D/g, '')}`,
          ...(merchantEmail ? { email: merchantEmail } : {})
        }]);

        // 3. Precarga de catálogo si withCatalog es true
        if (withCatalog && catalog?.items?.length > 0) {
          try {
            const productsPayload = catalog.items.map((prod, idx) => ({
              workspace_id: activeWs,
              name: prod.name,
              sku: prod.sku || `SKU-${idx + 100}`,
              barcode: prod.barcode || `759${Date.now().toString().slice(-9)}${idx}`,
              price: prod.priceUSD || 0,
              ref_price: prod.priceUSD || 0,
              cost: prod.costUSD || 0,
              category: prod.category || catalog.rubroName,
              stock: 25,
              stock_vitrina: 25,
              min_stock: 5,
              unit: prod.unit || 'unidad',
              tax_rate: 16,
              image_url: prod.image || null,
              description: prod.description || `Producto de alta rotación para ${catalog.rubroName}.`,
              status: 'active',
              is_featured: idx < 4,
              created_at: new Date().toISOString()
            }));

            await supabase.from('ecommerce_products').insert(productsPayload);
          } catch (pErr) {
            console.warn('Notice inserting seed catalog:', pErr);
          }
        }
      }

      localStorage.setItem('merchant_onboarding_completed', 'true');
      localStorage.setItem('merchant_store_name', businessName.trim() || 'Mi Tienda');
      localStorage.setItem('merchant_owner_name', ownerName.trim() || 'Comerciante');
      if (cleanSlug) localStorage.setItem('storeSlug', cleanSlug);
      if (activeWs) localStorage.setItem('activeWorkspace', activeWs);
      localStorage.setItem('is_merchant_app', 'true');
      localStorage.setItem('merchant_mode', 'true');

      toast.success(withCatalog ? '¡30 productos cargados y tienda configurada!' : '¡Tienda configurada con éxito!');
    } catch (err) {
      console.error('Error al finalizar onboarding:', err);
    } finally {
      setLoading(false);
      setStep(10); // Avanzar a pantalla final de éxito / instalación
    }
  };

  const handleTriggerInstall = async () => {
    const activeWs = workspaceId || localStorage.getItem('activeWorkspace');
    if (activeWs) localStorage.setItem('activeWorkspace', activeWs);
    
    const cleanSlug = businessName
      .trim()
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'mi-tienda';
    localStorage.setItem('storeSlug', cleanSlug);
    if (businessName.trim()) localStorage.setItem('merchant_store_name', businessName.trim());
    localStorage.setItem('merchant_onboarding_completed', 'true');
    localStorage.setItem('is_merchant_app', 'true');
    localStorage.setItem('merchant_mode', 'true');
    localStorage.removeItem('ecommerce_current_customer');
    localStorage.removeItem('ecommerce_user');

    const promptObj = deferredPrompt || (typeof window !== 'undefined' ? window.deferredPwaPrompt : null);
    if (promptObj) {
      setIsInstalling(true);
      try {
        promptObj.prompt();
        const { outcome } = await promptObj.userChoice;
        if (outcome === 'accepted') {
          setIsInstalledJustNow(true);
          setIsStandalone(true);
          toast.success('¡Instalación completada! Entrando a tu tienda...', { icon: '🚀' });
          setTimeout(() => {
            handleFinishAndGoToDashboard();
          }, 800);
        }
      } catch (err) {
        console.warn('Error en prompt de instalación:', err);
      } finally {
        setIsInstalling(false);
      }
    } else {
      toast('Toca el menú del navegador (⋮) y selecciona "Instalar aplicación" o "Agregar a la pantalla principal"', {
        icon: '📲',
        duration: 6000
      });
    }
  };

  const handleFinishAndGoToDashboard = () => {
    const activeWs = workspaceId || localStorage.getItem('activeWorkspace');
    if (activeWs) localStorage.setItem('activeWorkspace', activeWs);

    const cleanSlug = businessName
      .trim()
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'mi-tienda';
    localStorage.setItem('storeSlug', cleanSlug);
    if (businessName.trim()) localStorage.setItem('merchant_store_name', businessName.trim());
    localStorage.setItem('merchant_onboarding_completed', 'true');
    localStorage.setItem('is_merchant_app', 'true');
    localStorage.setItem('merchant_mode', 'true');
    localStorage.removeItem('ecommerce_current_customer');
    localStorage.removeItem('ecommerce_user');

    if (onComplete) onComplete();
    if (onClose) onClose();
    window.location.href = '/pos';
  };

  return (
    <div className="fixed inset-0 z-[99999] w-screen h-screen min-h-screen flex items-center justify-center p-0 sm:p-4 md:p-6 lg:p-8 overflow-y-auto select-none animate-in fade-in duration-200 relative">
      
      {/* 1. Fondo Auténtico: Previsualización de AxonMarket */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none filter blur-[0.5px]">
        <AxonMarketDashboardPreview />
      </div>

      {/* 2. Capa Translúcida con Toque Anaranjado Corporativo */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[3px] bg-gradient-to-b from-orange-500/15 via-black/30 to-black/55 pointer-events-none" />

      {/* Botón flotante para cerrar */}
      {onClose && (
        <button
          onClick={onClose}
          className="fixed top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95 border border-white/20"
          title="Cerrar"
        >
          <X size={20} className="stroke-[2.5]" />
        </button>
      )}

      {/* ========================================================================= */}
      {/* VISTA FINAL (PASO 10): PANTALLA DE ÉXITO CON INSTALACIÓN PWA O ABRIR POS  */}
      {/* ========================================================================= */}
      {step === 10 ? (
        <div className="relative z-20 bg-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl border border-slate-200/90 max-w-4xl w-full p-6 sm:p-10 my-auto animate-in zoom-in-95 duration-200 m-4">
          
          <div className="text-center max-w-2xl mx-auto mb-6">
            {(isStandalone || isInstalledJustNow) ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black mb-3">
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span>App Oficial Instalada · Tienda Lista al 100%</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100 border border-orange-300 text-orange-950 text-xs font-black uppercase tracking-wider mb-3">
                <Sparkles size={14} className="text-orange-600 animate-spin" style={{ animationDuration: '3s' }} />
                <span>¡Tu Tienda Virtual ha sido creada exitosamente!</span>
              </div>
            )}

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-950 tracking-tight mb-2">
              ¡Todo listo, {ownerName.split(' ')[0] || 'Comerciante'}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              <span className="font-bold text-slate-900">{businessName || 'Tu tienda'}</span> {preloadCatalog ? 'ya tiene sus productos cargados, horarios y cobros configurados.' : 'está lista para comenzar a operar.'}
            </p>
          </div>

          {/* Resumen de la tienda creada */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center mb-6">
            {/* Mockup Izquierdo */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-inner">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3 font-medium">
                <span>👁 Tu vitrina virtual oficial</span>
                <span>·</span>
                <span className="text-emerald-600 font-bold">Activa</span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  </div>
                  <div className="bg-white px-3 py-0.5 rounded-md text-[11px] font-mono text-slate-600 truncate flex-1 text-center border border-slate-200 font-bold">
                    axonmarket.vip/{(businessName || 'tienda').toLowerCase().replace(/\s+/g, '-')}
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo" className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-2xs" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                          {(businessName || 'A')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-xs text-slate-900 truncate block max-w-[130px]">
                          {businessName || 'Mi Tienda'}
                        </span>
                        <span className="text-[10px] text-slate-400 block">{catalog.rubroName}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {scheduleOpen} - {scheduleClose}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {catalog.items.slice(0, 4).map((p, i) => (
                      <div key={i} className="border border-slate-100 rounded-lg p-1.5 flex flex-col justify-between">
                        <img src={p.image} alt={p.name} className="w-full h-14 object-cover rounded-md mb-1.5" />
                        <span className="text-[10px] font-bold text-slate-800 line-clamp-1">{p.name}</span>
                        <span className="text-[10px] font-extrabold text-orange-600">{p.refPriceLabel}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Columna Derecha con resumen de expedientes */}
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-orange-50/80 border border-orange-200/80">
                <span className="text-[10px] font-black tracking-wider uppercase text-orange-600 block mb-1">
                  DATOS FISCALES Y COBRO
                </span>
                <p className="text-xs text-slate-700 font-semibold">
                  RIF: <span className="font-mono font-bold text-slate-900">{rifNumber ? `${rifPrefix}-${rifNumber}` : 'Sin RIF'}</span>
                </p>
                <p className="text-xs text-slate-700 font-semibold mt-0.5">
                  Pago Móvil: <span className="font-bold text-slate-900">{pagoMovilBank.split('-')[1]?.trim() || pagoMovilBank}</span>
                </p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Tel: {pagoMovilPhone || whatsapp}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 flex items-start gap-3">
                <MapPin size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-emerald-950 font-bold">Ubicación física vinculada</p>
                  <p className="text-xs text-emerald-800 leading-snug">
                    {addressLine || [addressCity, addressState].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-orange-500 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900">Plan Profesional 7 Días Gratis</span>
                    <p className="text-slate-500 text-[11px]">Válido hasta el {formattedTrialEnd}.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pie de Página: Botones de instalación y entrar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
            {(!isStandalone && !isInstalledJustNow) ? (
              <>
                <button
                  type="button"
                  onClick={handleFinishAndGoToDashboard}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-600 hover:underline cursor-pointer order-2 sm:order-1"
                >
                  Continuar en el navegador (Abrir POS)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (isAppStandalone()) {
                      handleFinishAndGoToDashboard();
                    } else if (isIOS) {
                      toast.success('¡Excelente! Abre AxonMarket desde tu pantalla de inicio', { icon: '📲' });
                      handleFinishAndGoToDashboard();
                    } else {
                      handleTriggerInstall();
                    }
                  }}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-[0.99] text-white font-bold text-sm sm:text-base shadow-lg shadow-orange-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 order-1 sm:order-2"
                >
                  <Download size={18} />
                  <span>{isIOS ? 'Ya la agregué al inicio ➔ Entrar' : 'Instalar App y Abrir Tienda'}</span>
                </button>
              </>
            ) : (
              <div className="w-full flex justify-end">
                <button
                  onClick={handleFinishAndGoToDashboard}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-[0.99] text-white font-bold text-sm sm:text-base shadow-lg shadow-orange-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Abrir mi Sistema (POS)</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* VISTA PRINCIPAL: PASOS 1 AL 9 CON ONBOARDING COMPLETO                    */
        /* ========================================================================= */
        <div className="relative z-20 bg-white rounded-t-[32px] sm:rounded-3xl lg:rounded-[2.5rem] shadow-2xl border border-slate-200/80 max-w-[480px] lg:max-w-[960px] w-full overflow-hidden my-auto flex flex-col lg:grid lg:grid-cols-12 max-h-[96vh] sm:max-h-[90vh]">
          
          {/* ===================================================================== */}
          {/* SECCIÓN NARANJA: CABECERA EN MÓVIL / COLUMNA LATERAL EN DESKTOP        */}
          {/* ===================================================================== */}
          <div className="lg:col-span-4 bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 text-white p-5 sm:p-6 lg:p-8 flex flex-col justify-between relative shrink-0">
            <div className="w-12 h-1 bg-white/40 rounded-full mx-auto mb-3 lg:hidden" />

            <div>
              <div className="flex items-center justify-between lg:flex-col lg:items-start lg:gap-2.5 mb-3 lg:mb-8">
                <div className="inline-flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full shadow-sm border border-white/40 shrink-0">
                  <img 
                    src="/axonmarket-logo-icon.png" 
                    alt="AxonMarket" 
                    className="w-5 h-5 rounded-md object-contain shrink-0" 
                  />
                  <span className="text-sm font-black tracking-tight text-slate-950 flex items-center leading-none whitespace-nowrap">
                    Axon<span className="text-orange-500 ml-0.5">Market</span>
                  </span>
                </div>

                <div className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-white/95 shrink-0">
                  <span className="bg-white/20 px-2 py-0.5 rounded-full font-bold">
                    Paso {step} de 9
                  </span>
                  <span className="text-white/60">·</span>
                  <span className="text-white/80">≈2 minutos</span>
                </div>
              </div>

              {/* Títulos dinámicos de cada paso */}
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight mt-1 lg:mt-0 mb-1.5 lg:mb-3">
                {step === 1 && 'Cuéntanos sobre tu negocio'}
                {step === 2 && '¿Por dónde vendes?'}
                {step === 3 && '¿Con qué te manejas hoy?'}
                {step === 4 && '¿Cómo prefieres que te ayudemos?'}
                {step === 5 && 'Dirección y Ubicación Física'}
                {step === 6 && 'Horarios de Atención Comercial'}
                {step === 7 && 'Datos de Cobro y Pago Móvil'}
                {step === 8 && 'Logotipo y Foto de Portada'}
                {step === 9 && `Comienza con 30 productos de ${catalog.rubroName}`}
              </h2>

              {/* Subtítulo explicativo */}
              <p className="text-xs sm:text-sm text-white/90 font-normal leading-relaxed mb-3 lg:mb-6">
                {step === 1 && 'Ingresa tu información de contacto, rubro y expediente fiscal.'}
                {step === 2 && 'Así te mostramos primero lo que usas. Elige todas las que correspondan.'}
                {step === 3 && 'Si vienes de otro sistema, te ayudamos a pasar tus productos y datos.'}
                {step === 4 && 'Un asesor especialista de AxonMarket te acompañará durante tus primeros días.'}
                {step === 5 && 'Tus clientes podrán ubicarte en el mapa y para calcular tus despachos.'}
                {step === 6 && 'Controla cuándo tu tienda está abierta y disponible para compras.'}
                {step === 7 && 'Configura tu cuenta bancaria nacional para recibir pagos directos.'}
                {step === 8 && 'Sube las fotos oficiales de tu marca para personalizar tu tienda.'}
                {step === 9 && 'Fotos y precios de referencia en USD y Bs listos para vender o editar.'}
              </p>
            </div>

            {/* Barra de progreso */}
            <div className="pt-2 lg:pt-4">
              <div className="w-full bg-white/30 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-white h-full rounded-full transition-all duration-300 ease-out" 
                  style={{ width: `${(step / 9) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* SECCIÓN BLANCA: FORMULARIO CURVADO SOBRE LA CABECERA                 */}
          {/* ===================================================================== */}
          <div className="lg:col-span-8 bg-white rounded-t-[32px] lg:rounded-none p-5 sm:p-6 lg:p-8 flex flex-col justify-between overflow-y-auto flex-1 shadow-2xl lg:shadow-none -mt-2 lg:mt-0 relative z-10">
            
            <div className="py-1">
              
              {/* ----------------------------------------------------------------- */}
              {/* PASO 1: Identidad, Rubro, WhatsApp y RIF (con selector desplegable)*/}
              {/* ----------------------------------------------------------------- */}
              {step === 1 && (
                <div className="space-y-3.5 sm:space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Tu nombre completo
                      </label>
                      <input 
                        type="text"
                        value={ownerName}
                        onChange={e => setOwnerName(e.target.value)}
                        placeholder="Ej: Carlos Mendoza"
                        className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-sm font-medium outline-none transition-all shadow-xs"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Nombre del negocio
                      </label>
                      <input 
                        type="text"
                        value={businessName}
                        onChange={e => setBusinessName(e.target.value)}
                        placeholder="Ej: Bodegón La Gran Parada"
                        className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-sm font-medium outline-none transition-all shadow-xs"
                      />
                    </div>
                  </div>

                  {/* Rubro (12 rubros) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Rubro Comercial
                    </label>
                    <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                      {RUBROS.map(r => {
                        const Icon = r.icon;
                        const isSelected = rubro === r.id;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setRubro(r.id)}
                            className={`flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl text-center transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-orange-50/90 border-2 border-orange-500 text-orange-950 shadow-sm ring-2 ring-orange-500/20' 
                                : 'bg-[#fffaf5] hover:bg-orange-50/50 border border-slate-100 hover:border-orange-100 text-slate-700'
                            }`}
                          >
                            <Icon size={20} className={isSelected ? 'text-orange-600' : 'text-slate-600'} />
                            <span className="text-[10px] sm:text-[11px] font-semibold leading-tight mt-1 line-clamp-1">{r.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      WhatsApp de Ventas
                    </label>
                    <div className="relative rounded-2xl border border-slate-200 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-100 transition-all bg-white shadow-xs">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-700">
                        +58
                      </span>
                      <input 
                        type="tel"
                        value={whatsapp}
                        onChange={e => setWhatsapp(e.target.value.replace(/[^0-9\s-]/g, ''))}
                        placeholder="414 123 4567"
                        className="w-full pl-14 pr-4 py-2.5 sm:py-3 text-sm text-slate-900 placeholder:text-slate-400 rounded-2xl outline-none font-medium"
                      />
                    </div>
                  </div>

                  {/* RIF o Cédula Fiscal con Selector Desplegable para dar máximo espacio al número */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-slate-800">
                        RIF o Cédula Fiscal (Expediente)
                      </label>
                      <span className="text-[10px] text-slate-400 font-semibold">Mínimo 6 dígitos</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      {/* Desplegable vertical compacto */}
                      <select 
                        value={rifPrefix} 
                        onChange={e => setRifPrefix(e.target.value)} 
                        className="w-24 sm:w-28 px-3 py-2.5 sm:py-3 rounded-2xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-xs sm:text-sm font-bold bg-white text-slate-800 outline-none shadow-xs cursor-pointer shrink-0"
                      >
                        <option value="V">V - Natural</option>
                        <option value="J">J - Jurídico</option>
                        <option value="G">G - Gobierno</option>
                        <option value="E">E - Extranjero</option>
                      </select>
                      
                      {/* Input amplio con máximo espacio para los números */}
                      <input 
                        type="text"
                        value={rifNumber}
                        onChange={e => setRifNumber(e.target.value.replace(/[^0-9-]/g, '').slice(0, 11))}
                        placeholder="Ej: 12345678-9"
                        className="flex-1 min-w-0 px-4 py-2.5 sm:py-3 rounded-2xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-sm font-mono tracking-wider outline-none shadow-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------------------- */}
              {/* PASO 2: ¿Por dónde vendes? (Commercy step exacto)                */}
              {/* ----------------------------------------------------------------- */}
              {step === 2 && (
                <div className="space-y-2.5 sm:space-y-3 animate-in fade-in duration-150">
                  {[
                    { id: 'local', letter: 'A', title: 'En mi local', subtitle: 'Mostrador, caja y factura', icon: Store },
                    { id: 'online', letter: 'B', title: 'Tienda online', subtitle: 'Tu propia web con carrito', icon: Globe },
                    { id: 'social', letter: 'C', title: 'Redes y WhatsApp', subtitle: 'Instagram, Facebook y mensajes', icon: MessageCircle },
                    { id: 'wholesale', letter: 'D', title: 'A otros comercios', subtitle: 'Mayorista o distribuidora', icon: Truck },
                    { id: 'starting', letter: 'E', title: 'Todavía no vendo', subtitle: 'Estoy arrancando', icon: Rocket },
                  ].map(item => {
                    const Icon = item.icon;
                    const isChecked = salesChannels.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleMultiSelect(salesChannels, setSalesChannels, item.id)}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isChecked 
                            ? 'border-orange-500 bg-orange-50/50 shadow-xs' 
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                            isChecked ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {item.letter}
                          </span>
                          <Icon size={18} className={isChecked ? 'text-orange-600' : 'text-slate-400'} />
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900">{item.title}</h4>
                            <p className="text-[11px] sm:text-xs text-slate-500 truncate">{item.subtitle}</p>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isChecked ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isChecked && <Check size={13} className="stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ----------------------------------------------------------------- */}
              {/* PASO 3: ¿Con qué te manejas hoy? (Commercy step exacto)            */}
              {/* ----------------------------------------------------------------- */}
              {step === 3 && (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 animate-in fade-in duration-150">
                  {[
                    { id: 'excel', letter: 'A', title: 'Excel o cuaderno', subtitle: 'Planillas o anotaciones a mano' },
                    { id: 'tango', letter: 'B', title: 'Saint Enterprise / A2 Softway', subtitle: 'Gestión o Punto de Venta administrativo' },
                    { id: 'valery', letter: 'C', title: 'Valery / Premium Soft', subtitle: 'Facturación y control de inventario' },
                    { id: 'tiendanube', letter: 'D', title: 'Tiendanube / Shopify / WooCommerce', subtitle: 'Tu tienda online existente' },
                    { id: 'pos', letter: 'E', title: 'Otro sistema POS', subtitle: 'Puntos de venta y cajas' },
                    { id: 'other', letter: 'F', title: 'Otro sistema', subtitle: 'Contanos cuál después' },
                    { id: 'none', letter: 'G', title: 'Nada todavía', subtitle: 'Arranco de cero' },
                  ].map(item => {
                    const isChecked = currentSystems.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleMultiSelect(currentSystems, setCurrentSystems, item.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isChecked 
                            ? 'border-orange-500 bg-orange-50/50 shadow-xs' 
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                            isChecked ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {item.letter}
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900">{item.title}</h4>
                            <p className="text-[11px] text-slate-500 truncate">{item.subtitle}</p>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isChecked ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isChecked && <Check size={13} className="stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ----------------------------------------------------------------- */}
              {/* PASO 4: ¿Cómo prefieres que te ayudemos? (Commercy step exacto)   */}
              {/* ----------------------------------------------------------------- */}
              {step === 4 && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  {[
                    { id: 'whatsapp', letter: 'A', title: 'WhatsApp', subtitle: whatsapp ? `Te escribimos al ${whatsapp}` : 'Te escribimos a tu número celular', icon: MessageCircle },
                    { id: 'call', letter: 'B', title: 'Llamada telefónica', subtitle: 'Te llamamos en horario comercial', icon: Phone },
                    { id: 'email', letter: 'C', title: 'Correo electrónico', subtitle: 'Te escribimos con guías detalladas', icon: Mail },
                    { id: 'none', letter: 'D', title: 'No hace falta', subtitle: 'Tengo la ayuda y los tutoriales en el panel', icon: Ban },
                  ].map(item => {
                    const Icon = item.icon;
                    const isSelected = supportPreference === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSupportPreference(item.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected 
                            ? 'border-orange-500 bg-orange-50/50 shadow-xs' 
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <span className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {item.letter}
                          </span>
                          <Icon size={18} className={isSelected ? 'text-orange-600' : 'text-slate-400'} />
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900">{item.title}</h4>
                            <p className="text-[11px] sm:text-xs text-slate-500">{item.subtitle}</p>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-orange-500' : 'border-slate-300'
                        }`}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ----------------------------------------------------------------- */}
              {/* PASO 5: Dirección y Ubicación Física con GPS                       */}
              {/* ----------------------------------------------------------------- */}
              {step === 5 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Tarjeta GPS */}
                  <div className="bg-orange-50/60 border border-orange-200/80 rounded-2xl p-4 text-center space-y-2.5">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mx-auto text-orange-600 shadow-xs">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">Ubicación satelital de tu local</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Permite a tus clientes encontrarte en el mapa y calcular distancias de delivery.</p>
                    </div>

                    <button
                      type="button"
                      onClick={handleDetectGPS}
                      className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                      <MapPin size={15} />
                      <span>{gpsCoords ? 'Actualizar Coordenadas GPS' : 'Detectar mi ubicación por GPS'}</span>
                    </button>

                    {gpsCoords && (
                      <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg py-1 px-2.5 inline-block">
                        ✓ GPS Fijado: ({gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)})
                      </p>
                    )}
                  </div>

                  {/* Estado y Ciudad */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">Estado</label>
                      <input 
                        type="text"
                        value={addressState}
                        onChange={e => setAddressState(e.target.value)}
                        placeholder="Ej. Aragua"
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-sm font-medium outline-none shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">Ciudad / Municipio</label>
                      <input 
                        type="text"
                        value={addressCity}
                        onChange={e => setAddressCity(e.target.value)}
                        placeholder="Ej. Cagua"
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-sm font-medium outline-none shadow-xs"
                      />
                    </div>
                  </div>

                  {/* Dirección exacta / Punto de referencia */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Dirección exacta o Punto de referencia
                    </label>
                    <textarea 
                      rows={2}
                      value={addressLine}
                      onChange={e => setAddressLine(e.target.value)}
                      placeholder="Calle, Centro Comercial, Local o número..."
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-sm font-medium outline-none shadow-xs resize-none"
                    />
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------------------- */}
              {/* PASO 6: Horarios de Atención Comercial                            */}
              {/* ----------------------------------------------------------------- */}
              {step === 6 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Activar Control de Horario</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Muestra aviso de abierto/cerrado en tu vitrina.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={scheduleActive} 
                        onChange={e => setScheduleActive(e.target.checked)} 
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                    </label>
                  </div>

                  {/* Horas de apertura y cierre */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">Hora de Apertura</label>
                      <input 
                        type="time"
                        value={scheduleOpen}
                        onChange={e => setScheduleOpen(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-sm font-bold outline-none shadow-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">Hora de Cierre</label>
                      <input 
                        type="time"
                        value={scheduleClose}
                        onChange={e => setScheduleClose(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-sm font-bold outline-none shadow-xs"
                      />
                    </div>
                  </div>

                  {/* Días laborables */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">Días Laborables</label>
                    <div className="flex flex-wrap gap-2">
                      {['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].map(dia => {
                        const isActive = workingDays[dia];
                        return (
                          <button
                            key={dia}
                            type="button"
                            onClick={() => setWorkingDays(prev => ({ ...prev, [dia]: !prev[dia] }))}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                              isActive 
                                ? 'bg-orange-500 text-white shadow-xs' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/60'
                            }`}
                          >
                            {dia.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Margen de advertencia */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-slate-800">Margen de Aviso de Cierre</label>
                      <span className="text-xs font-bold text-orange-600">{closeWarningMinutes} minutos</span>
                    </div>
                    <input 
                      type="range"
                      min="10"
                      max="60"
                      step="5"
                      value={closeWarningMinutes}
                      onChange={e => setCloseWarningMinutes(Number(e.target.value))}
                      className="w-full accent-orange-500 cursor-pointer"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Avisa a los compradores antes de cerrar para asegurar el despacho a tiempo.</p>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------------------- */}
              {/* PASO 7: Datos de Cobro y Pago Móvil                               */}
              {/* ----------------------------------------------------------------- */}
              {step === 7 && (
                <div className="space-y-3.5 animate-in fade-in duration-150">
                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
                    <CreditCard size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      Tus compradores verán estos datos al elegir pagar con <strong>Pago Móvil</strong> en tu vitrina virtual.
                    </p>
                  </div>

                  {/* Banco Receptor */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Banco Receptor
                    </label>
                    <select
                      value={pagoMovilBank}
                      onChange={e => setPagoMovilBank(e.target.value)}
                      className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-sm font-semibold outline-none shadow-xs bg-white"
                    >
                      {VZLA_BANKS.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  {/* Teléfono Pago Móvil */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Teléfono asociado a Pago Móvil (11 dígitos)
                    </label>
                    <input 
                      type="tel"
                      value={pagoMovilPhone}
                      onChange={e => setPagoMovilPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 11))}
                      placeholder={whatsapp ? `Ej: ${whatsapp}` : "Ej: 04141234567"}
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-sm font-mono tracking-wider outline-none shadow-xs"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Si lo dejas vacío, se usará tu WhatsApp de contacto.</p>
                  </div>

                  {/* Cédula o RIF Pago Móvil */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Cédula o RIF del Titular
                    </label>
                    <input 
                      type="text"
                      value={pagoMovilId}
                      onChange={e => setPagoMovilId(e.target.value.toUpperCase().replace(/[^0-9VEJG-]/g, '').slice(0, 12))}
                      placeholder={rifNumber ? `Ej: ${rifPrefix}-${rifNumber}` : "Ej: V-12345678 o J-12345678-9"}
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-sm font-mono tracking-wider outline-none shadow-xs"
                    />
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------------------- */}
              {/* PASO 8: Identidad Visual (Logotipo y Portada)                      */}
              {/* ----------------------------------------------------------------- */}
              {step === 8 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Logotipo Cuadrado 1:1 */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div 
                        onClick={() => logoInputRef.current?.click()}
                        className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-300 hover:border-orange-500 bg-white flex items-center justify-center cursor-pointer overflow-hidden shrink-0 shadow-xs transition-colors"
                      >
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <Camera size={22} className="text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">Logotipo Oficial</span>
                          <span className="text-[10px] font-bold bg-slate-200/80 text-slate-600 px-2 py-0.5 rounded-full">1:1</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">Óptimo 512×512 px (PNG o JPG).</p>
                        {logoPreview && <span className="text-[10px] font-bold text-emerald-600 mt-1 block">✓ Imagen lista</span>}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors shadow-2xs shrink-0 cursor-pointer"
                    >
                      {logoPreview ? 'Cambiar' : 'Subir'}
                    </button>
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                  </div>

                  {/* Foto de Portada 16:9 */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">Foto de Portada</span>
                        <span className="text-[10px] font-bold bg-slate-200/80 text-slate-600 px-2 py-0.5 rounded-full">16:9</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">Panorámica para web y móviles</span>
                    </div>

                    {coverPreview ? (
                      <div className="relative w-full h-24 rounded-xl overflow-hidden border border-slate-200">
                        <img src={coverPreview} alt="Portada" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => coverInputRef.current?.click()}
                          className="absolute inset-0 bg-black/40 hover:bg-black/50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Camera size={14} /> Cambiar Foto de Portada
                        </button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => coverInputRef.current?.click()}
                        className="w-full py-5 border-2 border-dashed border-slate-300 hover:border-orange-500 rounded-xl bg-white flex flex-col items-center justify-center cursor-pointer transition-colors text-center"
                      >
                        <UploadCloud size={20} className="text-slate-400 mb-1" />
                        <span className="text-xs font-bold text-slate-700">Subir foto de portada</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG o WebP hasta 10 MB</span>
                      </div>
                    )}
                    <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------------------- */}
              {/* PASO 9: Catálogo Inicial de 30 Productos                          */}
              {/* ----------------------------------------------------------------- */}
              {step === 9 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {catalog.items.slice(0, 6).map((prod, idx) => (
                      <div key={idx} className="border border-slate-200 rounded-2xl p-2 bg-white shadow-2xs flex flex-col justify-between">
                        <img 
                          src={prod.image} 
                          alt={prod.name} 
                          className="w-full h-20 object-cover rounded-xl mb-1.5" 
                        />
                        <div>
                          <h4 className="text-[11px] font-bold text-slate-900 line-clamp-1">{prod.name}</h4>
                          <span className="text-xs font-black text-orange-600 block mt-0.5">{prod.refPriceLabel}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <p className="text-xs text-slate-600 font-medium">
                      <span className="font-bold text-slate-900">y 24 productos más:</span> {catalog.items.slice(6, 12).map(p => p.name.split(' ')[0].toLowerCase()).join(', ')}...
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* ================================================================= */}
            {/* BOTÓN INFERIOR DE ACCIÓN (Continuar / Finalizar)                  */}
            {/* ================================================================= */}
            <div className="pt-3 sm:pt-4 border-t border-slate-100 flex items-center justify-between gap-3 mt-3">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="w-10 h-10 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-all cursor-pointer shrink-0"
                  title="Paso anterior"
                >
                  <ArrowLeft size={16} />
                </button>
              ) : null}

              {step < 9 ? (
                <div className="flex items-center gap-2 w-full justify-end">
                  {step > 1 && (
                    <button
                      type="button"
                      onClick={() => setStep(prev => prev + 1)}
                      className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors px-3 py-2 cursor-pointer"
                    >
                      Omitir
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleNext}
                    className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Continuar</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 w-full">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleFinalize(false)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors px-3 py-2 cursor-pointer"
                  >
                    Cargar los míos propios
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleFinalize(true)}
                    className="px-6 py-3 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-500/25 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Configurando tienda...</span>
                      </>
                    ) : (
                      <>
                        <span>Finalizar Registro y Guardar</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
