import React, { useState, useEffect, useRef } from 'react';
import { 
  Store, Flower2, Armchair, PawPrint, Hammer, BookOpen, Apple, Shirt, Utensils, PlusSquare, Truck, MoreHorizontal,
  Globe, MessageCircle, Rocket, Building2, ArrowRight, ArrowLeft, Check,
  Phone, Mail, Ban, Share2, Search, Sparkles, 
  Users, UserCheck, Video, Gift, 
  ShoppingBag, ShieldCheck, Loader2, X,
  LayoutDashboard, Package, Tag, BarChart3,
  Download, Smartphone, Laptop, CheckCircle2, Share,
  MapPin, Clock, CreditCard, Camera, UploadCloud, Trash2, CheckCircle, FileText,
  Star, Zap, Link as LinkIcon, Compass, ChevronLeft, UserPlus, Play
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import toast from 'react-hot-toast';
import { supabase } from '../../../supabaseClient';
import AxonMarketDashboardPreview from './AxonMarketDashboardPreview';
import { MARKETPLACE_CATEGORIES } from '../../../config/marketplaceCategories';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

const createAxonMarketPinIcon = () => {
  return new L.DivIcon({
    className: 'axon-map-pin',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); pointer-events: none;">
        <div style="width: 36px; height: 36px; border-radius: 9999px; background: linear-gradient(135deg, #f97316, #ea580c); border: 2.5px solid #ffffff; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.45); display: flex; align-items: center; justify-content: center; color: white;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
            <path d="M2 7h20"/>
          </svg>
        </div>
        <div style="width: 10px; height: 10px; background-color: #ea580c; transform: rotate(45deg); margin-top: -5px; border-bottom: 2px solid #ffffff; border-right: 2px solid #ffffff;"></div>
      </div>
    `,
    iconSize: [36, 46],
    iconAnchor: [18, 46],
    popupAnchor: [0, -46]
  });
};

function OnboardingMapPicker({ position, onSelectPosition, onAddressFound }) {
  const map = useMapEvents({
    click(e) {
      const latlng = { lat: e.latlng.lat, lng: e.latlng.lng };
      onSelectPosition(latlng);
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`)
        .then(r => r.json())
        .then(data => {
          if (data?.address) {
            onAddressFound({
              state: data.address.state || '',
              city: data.address.city || data.address.town || data.address.village || data.address.municipality || '',
              road: data.address.road || data.address.suburb || data.address.neighbourhood || ''
            });
          }
        })
        .catch(() => {});
    }
  });

  useEffect(() => {
    if (position && map) {
      map.flyTo([position.lat, position.lng], 16, { animate: true });
    }
  }, [position?.lat, position?.lng, map]);

  return position ? <Marker position={[position.lat, position.lng]} icon={createAxonMarketPinIcon()} /> : null;
}

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
  const [selectedCategories, setSelectedCategories] = useState(
    Array.isArray(initialData.categories) && initialData.categories.length > 0 
      ? initialData.categories 
      : (initialData.rubro ? [initialData.rubro] : ['Víveres'])
  );
  const rubro = selectedCategories[0] || 'Víveres';
  const [whatsapp, setWhatsapp] = useState(initialData.whatsapp || '');
  const [rifPrefix, setRifPrefix] = useState('V');
  const [rifNumber, setRifNumber] = useState('');

  const handleToggleCategory = (catId) => {
    if (selectedCategories.includes(catId)) {
      if (selectedCategories.length > 1) {
        setSelectedCategories(selectedCategories.filter(c => c !== catId));
      }
    } else {
      setSelectedCategories([...selectedCategories, catId]);
    }
  };

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

  if (!isOpen) return null;

  // Calcular fecha de fin de prueba de 7 días
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 7);
  const formattedTrialEnd = trialEndDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'numeric' });

  // 15 Departamentos y Categorías oficiales de AxonMarket
  const RUBROS = MARKETPLACE_CATEGORIES;

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

  // Guardar configuración completa en la base de datos (Inventario 100% limpio en cero)
  const handleFinalize = async () => {
    setLoading(true);

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

        const primaryCat = selectedCategories[0] || 'Víveres';

        // Preparamos categorías y subcategorías iniciales para que el POS e Inventario arranquen listos
        const initialCustomCategories = selectedCategories.map(catName => ({
          name: catName,
          color: '#EA580C',
          subcategories: [{ name: 'General' }]
        }));

        const updatedConfig = {
          ...prevConfig,
          adminEmail: merchantEmail,
          business_type: primaryCat,
          category: primaryCat,
          categories: selectedCategories,
          customCategories: initialCustomCategories,
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
            rubro: primaryCat,
            categories: selectedCategories
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
            business_type: primaryCat,
            config: updatedConfig
          })
          .eq('id', activeWs);

        await supabase.from('merchant_contacts').upsert([{
          id: activeWs,
          full_name: ownerName.trim(),
          phone: `+58${whatsapp.replace(/\D/g, '')}`,
          ...(merchantEmail ? { email: merchantEmail } : {})
        }]);
      }

      localStorage.setItem('merchant_onboarding_completed', 'true');
      localStorage.setItem('merchant_store_name', businessName.trim() || 'Mi Tienda');
      localStorage.setItem('merchant_owner_name', ownerName.trim() || 'Comerciante');
      if (cleanSlug) localStorage.setItem('storeSlug', cleanSlug);
      if (activeWs) localStorage.setItem('activeWorkspace', activeWs);
      localStorage.setItem('merchant_mode', 'true');

      toast.success('¡Tienda configurada con éxito!');
    } catch (err) {
      console.error('Error al finalizar onboarding:', err);
    } finally {
      setLoading(false);
      setStep(9); // Avanzar a pantalla final de éxito / instalación
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
    if (ownerName.trim()) localStorage.setItem('merchant_owner_name', ownerName.trim());
    localStorage.setItem('merchant_onboarding_completed', 'true');
    localStorage.setItem('merchant_mode', 'true');
    localStorage.removeItem('ecommerce_current_customer');
    localStorage.removeItem('ecommerce_user');

    if (onComplete) onComplete();
    if (onClose) onClose();
    window.location.href = '/dashboard';
  };

  const previewSlug = (businessName || 'tienda')
    .trim()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || 'tienda';

  const previewAddress = addressLine.trim() || [addressCity.trim(), addressState.trim()].filter(Boolean).join(', ') || 'Ciudad Jardín, Cagua, Aragua';

  return (
    <div className="fixed inset-0 z-[99999] w-screen h-screen min-h-screen flex items-center justify-center p-0 sm:p-4 md:p-6 lg:p-8 overflow-y-auto select-none animate-in fade-in duration-200 relative merchant-wizard-container">
      
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
      {/* VISTA FINAL (PASO 9): PANTALLA DE ÉXITO CON INSTALACIÓN PWA O ABRIR POS   */}
      {/* ========================================================================= */}
      {step === 9 ? (
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
              <span className="font-bold text-slate-900">{businessName || 'Tu tienda'}</span> está lista para comenzar a operar. Tu inventario está libre y en blanco para que crees tus productos y categorías.
            </p>
          </div>

          {/* Resumen de la tienda creada */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center mb-6">
            {/* Mockup Izquierdo: Vitrina Oficial AxonMarket Estilo Instagram */}
            <div className="bg-slate-900/5 border border-slate-200 rounded-3xl p-3 sm:p-4 shadow-inner">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2 font-semibold px-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-slate-800 font-bold">Vitrina Oficial de tu Negocio</span>
                </span>
                <span className="text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                  En Vivo
                </span>
              </div>

              {/* Marco de Teléfono Móvil 1:1 con AxonMarket */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md overflow-hidden text-slate-900 max-w-[340px] mx-auto relative select-none">
                
                {/* Barra de Notificación / Modo Admin */}
                <div className="bg-orange-500 text-white text-[9px] font-black px-2 py-1 flex items-center justify-between tracking-tight">
                  <span>MODO ADMINISTRADOR ACTIVO · ESTÁS VIENDO TU TIENDA</span>
                </div>

                {/* Cabecera Superior con Botón Volver y Nombre/Ubicación */}
                <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2 bg-white">
                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <ChevronLeft size={14} className="stroke-[2.5]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-black text-slate-900 truncate leading-tight">
                      {businessName || 'Mi Tienda'}
                    </h4>
                    <div className="flex items-center gap-1 text-[9px] text-orange-600 font-bold truncate">
                      <MapPin size={9} className="shrink-0" />
                      <span className="truncate">{previewAddress}</span>
                    </div>
                  </div>
                </div>

                {/* Foto de Portada Panorámica */}
                <div className="relative w-full h-24 bg-gradient-to-r from-zinc-900 via-zinc-800 to-amber-950 overflow-hidden">
                  {coverPreview ? (
                    <img src={coverPreview} alt="Portada" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/40">
                      <div className="text-center">
                        <Store size={22} className="mx-auto mb-0.5 opacity-60" />
                        <span className="text-[9px] font-bold tracking-wider uppercase opacity-75">Portada Oficial</span>
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* Avatar Flotante + Fila de Estadísticas (Estilo Instagram) */}
                <div className="px-3 pb-2 pt-0 relative bg-white">
                  <div className="flex items-end justify-between -mt-8 mb-2">
                    {/* Logo / Avatar con aro blanco */}
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-3 border-white shadow-md bg-white overflow-hidden flex items-center justify-center relative z-10">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-orange-500 to-amber-600 text-white font-black text-xl flex items-center justify-center">
                            {(businessName || 'A')[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="absolute bottom-0 right-0 z-20 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" title="En línea" />
                    </div>

                    {/* 3 Estadísticas: Publicaciones, Seguidores, Me gusta */}
                    <div className="flex-1 flex justify-around items-center text-center pl-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-900 leading-none">0</span>
                        <span className="text-[9px] font-semibold text-slate-400 mt-0.5">Publicaciones</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-900 leading-none">0</span>
                        <span className="text-[9px] font-semibold text-slate-400 mt-0.5">Seguidores</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-900 leading-none">0</span>
                        <span className="text-[9px] font-semibold text-slate-400 mt-0.5">Me gusta</span>
                      </div>
                    </div>
                  </div>

                  {/* Nombre Comercial, Handle, Calificar y Dirección */}
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-black text-slate-900 leading-tight truncate">
                      {businessName || 'Mi Tienda'}
                    </h3>
                    <p className="text-[11px] font-extrabold text-orange-600">
                      @{previewSlug}
                    </p>

                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-900 px-2 py-0.5 rounded-full text-[9px] font-bold">
                        <Star size={9} className="fill-amber-400 text-amber-500" />
                        <span>Calificar</span>
                      </span>
                      <span className="inline-flex items-center gap-1 bg-slate-950 text-white px-2 py-0.5 rounded-full text-[8px] font-black">
                        <span className="text-red-500">EM</span>
                        <Zap size={8} className="fill-yellow-400 text-yellow-400" />
                        <span>en minutos</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-slate-500 pt-1 font-medium truncate">
                      <MapPin size={10} className="text-red-500 shrink-0" />
                      <span className="truncate">{previewAddress}</span>
                    </div>
                  </div>

                  {/* Fila de Botones de Acción (+ Seguir, Contactar, Enlace, Cámara) */}
                  <div className="flex items-center gap-1.5 pt-2.5">
                    <button type="button" className="flex-1 py-1 px-2 rounded-lg bg-orange-500 text-white font-bold text-[10px] shadow-xs flex items-center justify-center gap-1">
                      <UserPlus size={11} />
                      <span>Seguir</span>
                    </button>
                    <button type="button" className="flex-1 py-1 px-2 rounded-lg bg-slate-100 text-slate-800 font-bold text-[10px] border border-slate-200 text-center">
                      Contactar
                    </button>
                    <div className="w-7 h-6 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-600">
                      <LinkIcon size={11} />
                    </div>
                    <div className="w-7 h-6 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-600">
                      <Camera size={11} />
                    </div>
                  </div>

                  {/* Sección Estados y Promociones */}
                  <div className="pt-3 pb-2 border-t border-slate-100 mt-2.5">
                    <div className="flex items-center justify-between text-[10px] font-black mb-1.5">
                      <span className="flex items-center gap-1 text-slate-800 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Estados y Promociones
                      </span>
                      <span className="text-orange-600 text-[9px] font-bold">+ Nuevo estado</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500 flex items-center justify-center">
                          <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-white">
                            <Play size={10} className="fill-white translate-x-0.5" />
                          </div>
                        </div>
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-orange-600 text-white rounded-full flex items-center justify-center text-[8px] font-black border border-white">+</span>
                      </div>
                      <div className="text-[9px] text-slate-400 font-medium leading-tight">
                        Tus clientes podrán ver tus ofertas flash diarias.
                      </div>
                    </div>
                  </div>

                  {/* Dock Flotante de Navegación Inferior (Idéntico a AxonMarket) */}
                  <div className="mt-2 -mx-1 p-1 bg-zinc-900 text-zinc-400 rounded-xl flex items-center justify-around shadow-sm text-[8px] font-bold">
                    <div className="flex flex-col items-center text-amber-400">
                      <Store size={13} className="text-amber-400" />
                      <span>Inicio</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Package size={13} />
                      <span>Catálogo</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <ShoppingBag size={13} />
                      <span>Carrito</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Tag size={13} />
                      <span>Ofertas</span>
                    </div>
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
                    Paso {step} de 8
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
              </p>
            </div>

            {/* Barra de progreso */}
            <div className="pt-2 lg:pt-4">
              <div className="w-full bg-white/30 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-white h-full rounded-full transition-all duration-300 ease-out" 
                  style={{ width: `${(step / 8) * 100}%` }}
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
                        className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-sm font-medium outline-none transition-all shadow-xs text-slate-900 bg-white placeholder:text-slate-400"
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
                        className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-sm font-medium outline-none transition-all shadow-xs text-slate-900 bg-white placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* Categorías y Departamentos Oficiales del Marketplace */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-800">
                        Departamento / Categorías de tu Tienda
                      </label>
                      <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                        {selectedCategories.length} {selectedCategories.length === 1 ? 'seleccionada' : 'seleccionadas'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2">
                      Selecciona las categorías donde los clientes encontrarán tu tienda al filtrar en AxonMarket (puedes marcar varias):
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-2.5 max-h-56 overflow-y-auto p-1 custom-scrollbar">
                      {MARKETPLACE_CATEGORIES.map(cat => {
                        const Icon = cat.icon;
                        const isSelected = selectedCategories.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleToggleCategory(cat.id)}
                            className={`flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-2xl text-center transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-orange-50/90 border-2 border-orange-500 text-orange-950 shadow-xs ring-2 ring-orange-500/20' 
                                : 'bg-[#fffaf5] hover:bg-orange-50/50 border border-slate-200/80 hover:border-orange-200 text-slate-700'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform ${
                              isSelected ? 'bg-orange-500 text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600'
                            }`}>
                              <Icon size={16} />
                            </div>
                            <span className="text-[10px] sm:text-[11px] font-bold leading-tight mt-1 line-clamp-1">{cat.name}</span>
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
                        className="w-full pl-14 pr-4 py-2.5 sm:py-3 text-sm text-slate-900 bg-white placeholder:text-slate-400 rounded-2xl outline-none font-medium"
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
                        className="w-24 sm:w-28 px-3 py-2.5 sm:py-3 rounded-2xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-xs sm:text-sm font-bold bg-white text-slate-900 outline-none shadow-xs cursor-pointer shrink-0"
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
                        className="flex-1 min-w-0 px-4 py-2.5 sm:py-3 rounded-2xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-sm font-mono tracking-wider outline-none shadow-xs text-slate-900 bg-white placeholder:text-slate-400"
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

                    {/* Mapa Interactivo con Pin Oficial de AxonMarket */}
                    <div className="w-full mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-left">
                      <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold px-0.5">
                        <span className="flex items-center gap-1.5 text-slate-800 font-bold">
                          <Compass size={14} className="text-orange-500" />
                          <span>Toca en el mapa para ubicar tu local si estás en casa:</span>
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                          gpsCoords ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'
                        }`}>
                          {gpsCoords ? '✓ Pin marcado' : 'Toca el mapa'}
                        </span>
                      </div>
                      <div className="h-[210px] sm:h-[240px] w-full rounded-2xl overflow-hidden border border-slate-200 relative z-0 shadow-xs">
                        <MapContainer 
                          center={gpsCoords ? [gpsCoords.lat, gpsCoords.lng] : [10.1833, -67.4500]} 
                          zoom={gpsCoords ? 16 : 13} 
                          style={{ height: '100%', width: '100%' }}
                        >
                          <TileLayer 
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                          />
                          <OnboardingMapPicker 
                            position={gpsCoords} 
                            onSelectPosition={(pos) => setGpsCoords(pos)}
                            onAddressFound={({ state, city, road }) => {
                              if (state && !addressState) setAddressState(state);
                              if (city && !addressCity) setAddressCity(city);
                              if (road && !addressLine) setAddressLine(road);
                            }}
                          />
                        </MapContainer>
                      </div>
                      <p className="text-[10px] text-slate-400 italic px-1">
                        Puedes acercar (+) o alejar (-) el mapa y hacer clic exactamente en el techo o puerta de tu negocio.
                      </p>
                    </div>
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
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-sm font-medium outline-none shadow-xs text-slate-900 bg-white placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">Ciudad / Municipio</label>
                      <input 
                        type="text"
                        value={addressCity}
                        onChange={e => setAddressCity(e.target.value)}
                        placeholder="Ej. Cagua"
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-sm font-medium outline-none shadow-xs text-slate-900 bg-white placeholder:text-slate-400"
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
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-sm font-medium outline-none shadow-xs resize-none text-slate-900 bg-white placeholder:text-slate-400"
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
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-sm font-bold outline-none shadow-xs text-slate-900 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">Hora de Cierre</label>
                      <input 
                        type="time"
                        value={scheduleClose}
                        onChange={e => setScheduleClose(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-sm font-bold outline-none shadow-xs text-slate-900 bg-white"
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
                      className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-sm font-semibold outline-none shadow-xs bg-white text-slate-900"
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
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-sm font-mono tracking-wider outline-none shadow-xs text-slate-900 bg-white placeholder:text-slate-400"
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
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-sm font-mono tracking-wider outline-none shadow-xs text-slate-900 bg-white placeholder:text-slate-400"
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

              {step < 8 ? (
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
                <div className="flex items-center justify-end gap-3 w-full">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleFinalize}
                    className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-orange-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Configurando tienda...</span>
                      </>
                    ) : (
                      <>
                        <span>Finalizar Registro y Guardar</span>
                        <ArrowRight size={18} />
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
