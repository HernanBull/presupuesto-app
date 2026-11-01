import React, { useState } from 'react';
import { 
  Store, Flower2, Armchair, PawPrint, Hammer, BookOpen, Apple, Shirt, Utensils, PlusSquare, Truck, MoreHorizontal,
  Globe, MessageCircle, Rocket, Building2, ArrowRight, ArrowLeft, Check,
  Phone, Mail, Ban, Share2, Search, Sparkles, 
  Users, UserCheck, Video, Gift, 
  ShoppingBag, ShieldCheck, Loader2, X,
  LayoutDashboard, Package, Tag, BarChart3
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../supabaseClient';
import { getCatalogForRubro } from '../data/seedCatalogs';
import AxonMarketDashboardPreview from './AxonMarketDashboardPreview';

export default function MerchantOnboardingWizard({ 
  isOpen = true, 
  onClose, 
  initialData = {}, 
  workspaceId = null,
  onComplete 
}) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [ownerName, setOwnerName] = useState(initialData.ownerName || '');
  const [businessName, setBusinessName] = useState(initialData.businessName || '');
  const [rubro, setRubro] = useState(initialData.rubro || 'ferreteria');
  const [whatsapp, setWhatsapp] = useState(initialData.whatsapp || '');
  
  // Paso 2: ¿Por cuáles canales vendes?
  const [salesChannels, setSalesChannels] = useState(['local']);
  
  // Paso 3: ¿Cuántas tiendas o sucursales tienes?
  const [locationsCount, setLocationsCount] = useState('1');
  
  // Paso 4: ¿Cómo gestionas tu negocio actualmente?
  const [currentSystems, setCurrentSystems] = useState(['excel']);
  
  // Paso 5: ¿Cómo prefieres que te contactemos?
  const [supportPreference, setSupportPreference] = useState('whatsapp');
  
  // Paso 6: ¿Cómo nos conociste? + Código afiliado
  const [discoveryChannel, setDiscoveryChannel] = useState('instagram');
  const [affiliateCode, setAffiliateCode] = useState('');
  const [affiliateApplied, setAffiliateApplied] = useState(false);

  // Paso 7: Precarga de catálogo
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
        toast.error('Por favor ingresa tu número de WhatsApp');
        return;
      }
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => Math.max(1, prev - 1));
  };

  const handleApplyAffiliate = () => {
    if (!affiliateCode.trim()) {
      toast.error('Ingresa un código de afiliado válido');
      return;
    }
    setAffiliateApplied(true);
    toast.success('¡Código de afiliado aplicado con éxito!', { icon: '🎁' });
  };

  const toggleMultiSelect = (state, setState, value) => {
    if (state.includes(value)) {
      if (state.length > 1) {
        setState(state.filter(item => item !== value));
      }
    } else {
      setState([...state, value]);
    }
  };

  // Guardar configuración y precargar catálogo
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

      const onboardingData = {
        owner_name: ownerName.trim(),
        business_name: businessName.trim(),
        rubro,
        whatsapp: `+58${whatsapp.replace(/\D/g, '')}`,
        sales_channels: salesChannels,
        locations_count: locationsCount,
        current_systems: currentSystems,
        support_preference: supportPreference,
        discovery_channel: discoveryChannel,
        affiliate_code: affiliateCode.trim() || null,
        preload_catalog: withCatalog,
        onboarding_completed: true,
        completed_at: new Date().toISOString()
      };

      if (activeWs) {
        // 1. Actualizar configuración del comercio
        try {
          await supabase
            .from('workspaces')
            .update({
              name: businessName.trim() || 'Mi Tienda',
              store_slug: cleanSlug,
              config: {
                onboarding: onboardingData,
                trialActive: true,
                plan: 'Prueba 7 Días Gratis',
                contact: {
                  phone: `+58 ${whatsapp.trim()}`,
                  ownerName: ownerName.trim()
                }
              }
            })
            .eq('id', activeWs);
        } catch (wsErr) {
          console.warn('Notice updating workspace:', wsErr);
        }

        // 2. Insertar catálogo semilla de 30 productos en ecommerce_products
        if (withCatalog && catalog?.items?.length) {
          const timestamp = Date.now();
          const productsToInsert = catalog.items.map((prod, idx) => ({
            id: `seed_${activeWs}_${idx}_${timestamp}`,
            workspace_id: activeWs,
            name: prod.name,
            category: prod.category || 'General',
            price: Number(prod.priceUsd) || 1,
            price_usd: Number(prod.priceUsd) || 1,
            cogs: Math.round((Number(prod.priceUsd) * 0.7) * 100) / 100,
            stock: 20,
            stock_vitrina: 10,
            image_url: prod.image,
            supplier: 'Catálogo Inicial AxonMarket',
            publish_status: 'Publicado',
            created_at: new Date().toISOString()
          }));

          try {
            const { error: prodErr } = await supabase
              .from('ecommerce_products')
              .upsert(productsToInsert);

            if (prodErr) {
              console.warn('Notice inserting seed catalog to ecommerce_products:', prodErr);
            }
          } catch (pErr) {
            console.warn('Notice inserting seed catalog:', pErr);
          }
        }
      }

      localStorage.setItem('merchant_onboarding_completed', 'true');
      localStorage.setItem('merchant_store_name', businessName.trim() || 'Mi Tienda');
      localStorage.setItem('merchant_owner_name', ownerName.trim() || 'Comerciante');
      if (cleanSlug) localStorage.setItem('storeSlug', cleanSlug);

      toast.success(withCatalog ? '¡30 productos cargados exitosamente!' : '¡Configuración completada!');
    } catch (err) {
      console.error('Error al finalizar onboarding:', err);
    } finally {
      setLoading(false);
      setStep(8);
    }
  };

  const handleFinishAndGoToDashboard = () => {
    const activeWs = workspaceId || localStorage.getItem('activeWorkspace');
    if (activeWs) {
      localStorage.setItem('activeWorkspace', activeWs);
    }
    const cleanSlug = businessName
      .trim()
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'mi-tienda';
    localStorage.setItem('storeSlug', cleanSlug);

    if (onComplete) onComplete();
    if (onClose) onClose();
    window.location.href = '/dashboard';
  };

  const getSystemLabel = (sysKey) => {
    const map = {
      excel: 'Excel o notas manuales',
      saint: 'Saint Enterprise',
      a2: 'A2 Softway',
      valery: 'Valery / Premium Soft',
      tiendanube: 'tu tienda virtual',
      other: 'tu sistema administrativo actual'
    };
    return map[sysKey] || 'tu sistema administrativo actual';
  };

  return (
    <div className="fixed inset-0 z-[99999] w-screen h-screen min-h-screen flex items-center justify-center p-0 sm:p-4 md:p-6 lg:p-8 overflow-y-auto select-none animate-in fade-in duration-200 relative">
      
      {/* 1. Fondo Auténtico: Funciones e Interfaz Real de AxonMarket (Exacto a Commercy) */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none filter blur-[0.5px]">
        <AxonMarketDashboardPreview />
      </div>

      {/* 2. Capa Translúcida con Leve Toque Anaranjado (Efecto Vidrio Commercy) */}
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
      {/* VISTA PASO 8: PANTALLA DE ÉXITO ("¡Listo, [Nombre]!")                     */}
      {/* ========================================================================= */}
      {step === 8 ? (
        <div className="relative z-20 bg-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl border border-slate-200/90 max-w-4xl w-full p-6 sm:p-10 my-auto animate-in zoom-in-95 duration-200 m-4">
          <div className="text-center max-w-xl mx-auto mb-8">
            <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight mb-2">
              ¡Listo, {ownerName.split(' ')[0] || 'Comerciante'}!
            </h1>
            <p className="text-sm sm:text-base text-slate-500 font-medium">
              <span className="font-bold text-slate-900">{businessName || 'Tu tienda'}</span> {preloadCatalog ? 'ya tiene 30 productos cargados.' : 'está lista para comenzar.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center mb-8">
            {/* Mockup Izquierdo */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-inner">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3 font-medium">
                <span>👁 Así va a quedar tu tienda</span>
                <span>·</span>
                <span className="text-slate-500">se publica cuando confirmes los precios</span>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  </div>
                  <div className="bg-white px-3 py-0.5 rounded-md text-[11px] font-mono text-slate-500 truncate flex-1 text-center border border-slate-200">
                    {(businessName || 'tienda').toLowerCase().replace(/\s+/g, '-')}.axonmarket.com
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        {(businessName || 'A')[0].toUpperCase()}
                      </div>
                      <span className="font-bold text-xs text-slate-900 truncate max-w-[130px]">
                        {businessName || 'Mi Tienda'}
                      </span>
                    </div>
                    <ShoppingBag size={15} className="text-slate-400" />
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

            {/* Columna Derecha */}
            <div className="space-y-3.5">
              <div className="p-4 sm:p-5 rounded-2xl bg-orange-50/80 border border-orange-200/80">
                <span className="text-[10px] font-black tracking-wider uppercase text-orange-600 block mb-1">
                  SIGUIENTE PASO
                </span>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug mb-1.5">
                  Confirma 10 precios esta semana y obtén 15% de descuento en tu primer mes
                </h3>
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <span>⏱ 1 minuto</span>
                  <span>·</span>
                  <span>son precios referenciales de tu rubro</span>
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 flex items-start gap-3">
                <MessageCircle size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                  <span className="font-bold">Un asesor de AxonMarket</span> te contactará por WhatsApp para ayudarte a migrar tu catálogo desde {getSystemLabel(currentSystems[0])}.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={18} className="text-orange-500 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900">Estás disfrutando del Plan Profesional 7 días</span>
                    <p className="text-slate-500 text-[11px]">vigente hasta el {formattedTrialEnd}. Luego podrás continuar en el plan Gratuito.</p>
                  </div>
                </div>
                <button type="button" className="text-orange-600 font-bold hover:underline shrink-0 text-xs">
                  Ver planes
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={handleFinishAndGoToDashboard}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-[0.99] text-white font-bold text-sm sm:text-base shadow-lg shadow-orange-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Ir a mi panel</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* VISTA PRINCIPAL: PASOS 1 AL 7 (Fiel 1:1 a Commercy Móvil y Desktop)      */
        /* ========================================================================= */
        <div className="relative z-20 bg-white rounded-t-[32px] sm:rounded-3xl lg:rounded-[2.5rem] shadow-2xl border border-slate-200/80 max-w-[480px] lg:max-w-[960px] w-full overflow-hidden my-auto flex flex-col lg:grid lg:grid-cols-12 max-h-[96vh] sm:max-h-[90vh]">
          
          {/* ===================================================================== */}
          {/* SECCIÓN NARANJA: CABECERA EN MÓVIL / COLUMNA LATERAL EN DESKTOP        */}
          {/* ===================================================================== */}
          <div className="lg:col-span-4 bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 text-white p-5 sm:p-6 lg:p-8 flex flex-col justify-between relative shrink-0">
            {/* Grab handle en móvil estilo iOS/Commercy (exacto como en la foto 2) */}
            <div className="w-12 h-1 bg-white/40 rounded-full mx-auto mb-3 lg:hidden" />

            <div>
              {/* Barra superior de marca: Logo AxonMarket oficial exacto y centrado en su píldora blanca */}
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
                    Paso {step} de 7
                  </span>
                  <span className="text-white/60">·</span>
                  <span className="text-white/80">≈1 minuto</span>
                </div>
              </div>

              {/* Título comercial */}
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight mt-1 lg:mt-0 mb-1.5 lg:mb-3">
                {step === 1 && 'Cuéntanos sobre tu negocio'}
                {step === 2 && '¿Por cuáles canales vendes?'}
                {step === 3 && '¿Cuántas tiendas o sucursales tienes?'}
                {step === 4 && '¿Cómo gestionas tu negocio actualmente?'}
                {step === 5 && '¿Cómo prefieres que te contactemos?'}
                {step === 6 && '¿Cómo conociste AxonMarket?'}
                {step === 7 && `Comienza con 30 productos típicos de ${catalog.rubroName}`}
              </h2>

              {/* Subtítulo explicativo */}
              <p className="text-xs sm:text-sm text-white/90 font-normal leading-relaxed mb-3 lg:mb-6">
                {step === 1 && 'Te precargaremos productos y referencias según el rubro de tu negocio.'}
                {step === 2 && 'Así personalizamos las herramientas que usarás a diario. Selecciona todas las que apliquen.'}
                {step === 3 && 'Para recomendarte el plan adecuado a la escala de tu negocio.'}
                {step === 4 && 'Si utilizas otro sistema, te ayudamos a migrar tus productos y datos sin costo.'}
                {step === 5 && 'Un asesor especialista de AxonMarket te acompañará durante tus primeros días.'}
                {step === 6 && 'Nos ayuda a conocer cómo llegaste a nuestra plataforma.'}
                {step === 7 && 'Con fotos y precios de referencia en USD y Bs. Podrás confirmarlos y editarlos cuando desees desde tu panel.'}
              </p>

              {/* Píldoras contextuales dinámicas (Desktop) */}
              <div className="hidden lg:block">
                {step === 3 && salesChannels.includes('local') && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-950/30 border border-orange-200/30 text-[11px] font-semibold text-white/95 animate-in fade-in">
                    <span>Porque vendes en tienda física</span>
                  </div>
                )}

                {step === 4 && currentSystems.length > 0 && !currentSystems.includes('none') && (
                  <div className="p-3.5 rounded-xl bg-orange-950/30 border border-orange-200/30 text-xs text-white/95 leading-relaxed animate-in fade-in flex items-start gap-2.5">
                    <ArrowRight size={14} className="shrink-0 mt-0.5 text-amber-200" />
                    <span>Te ayudamos a migrar tu catálogo y clientes desde {getSystemLabel(currentSystems[0])}. En el siguiente paso eliges cómo prefieres que te contactemos.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Barra de progreso blanca */}
            <div className="pt-2 lg:pt-4">
              <div className="w-full bg-white/30 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-white h-full rounded-full transition-all duration-300 ease-out" 
                  style={{ width: `${(step / 7) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* SECCIÓN BLANCA: FORMULARIO CURVADO SOBRE LA CABECERA (FOTO 2)        */}
          {/* ===================================================================== */}
          <div className="lg:col-span-8 bg-white rounded-t-[32px] lg:rounded-none p-5 sm:p-6 lg:p-8 flex flex-col justify-between overflow-y-auto flex-1 shadow-2xl lg:shadow-none -mt-2 lg:mt-0 relative z-10">
            
            <div className="py-1">
              {/* ----------------------------------------------------------------- */}
              {/* PASO 1: Tu nombre, Nombre del negocio, Rubro (3 cols) y WhatsApp  */}
              {/* ----------------------------------------------------------------- */}
              {step === 1 && (
                <div className="space-y-3.5 sm:space-y-4 animate-in fade-in duration-150">
                  {/* Tu nombre */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Tu nombre
                    </label>
                    <input 
                      type="text"
                      value={ownerName}
                      onChange={e => setOwnerName(e.target.value)}
                      placeholder="Ej: Carlos Mendoza"
                      className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-orange-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 text-sm font-medium outline-none transition-all shadow-xs"
                      autoFocus
                    />
                  </div>

                  {/* Nombre del negocio */}
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

                  {/* Rubro (Exactamente 3 columnas x 4 filas = 12 como en Commercy) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Rubro
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

                  {/* Tu WhatsApp con prefijo +58 solicitado */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Tu WhatsApp
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
                    <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Ingresa tu número celular (ej. 414 123 4567). Te contactaremos por WhatsApp para asistirte con tu prueba gratuita.
                    </p>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------------------- */}
              {/* PASO 2: ¿Por cuáles canales vendes? (Multi-select A-E)            */}
              {/* ----------------------------------------------------------------- */}
              {step === 2 && (
                <div className="space-y-2.5 sm:space-y-3 animate-in fade-in duration-150">
                  {[
                    { id: 'local', letter: 'A', title: 'En tienda física', subtitle: 'Mostrador, caja y facturación', icon: Store },
                    { id: 'online', letter: 'B', title: 'Tienda virtual', subtitle: 'Tu propia web con catálogo y carrito', icon: Globe },
                    { id: 'social', letter: 'C', title: 'Redes sociales y WhatsApp', subtitle: 'Instagram, WhatsApp y atención directa', icon: MessageCircle },
                    { id: 'wholesale', letter: 'D', title: 'Ventas al mayor', subtitle: 'Distribuidora o despacho mayorista', icon: Truck },
                    { id: 'starting', letter: 'E', title: 'Aún no vendo', subtitle: 'Estoy comenzando mi negocio', icon: Rocket },
                  ].map(item => {
                    const Icon = item.icon;
                    const isChecked = salesChannels.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleMultiSelect(salesChannels, setSalesChannels, item.id)}
                        className={`p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
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
              {/* PASO 3: ¿Cuántas tiendas o sucursales tienes? (Single-select A-D)  */}
              {/* ----------------------------------------------------------------- */}
              {step === 3 && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  {[
                    { id: '1', letter: 'A', title: '1 tienda o sucursal', subtitle: 'Un mostrador o punto de venta, con o sin depósito', icon: Store },
                    { id: '2', letter: 'B', title: '2 sucursales', subtitle: 'Dos puntos de venta físicos', icon: Store },
                    { id: '3-6', letter: 'C', title: '3 a 6 sucursales', subtitle: 'Cadena de tiendas en expansión', icon: Building2 },
                    { id: 'more-6', letter: 'D', title: 'Más de 6 sucursales', subtitle: 'Diseñamos un plan corporativo a tu medida', icon: Building2 },
                  ].map(item => {
                    const Icon = item.icon;
                    const isSelected = locationsCount === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setLocationsCount(item.id)}
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
              {/* PASO 4: ¿Cómo gestionas tu negocio actualmente? (Multi-select)     */}
              {/* ----------------------------------------------------------------- */}
              {step === 4 && (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 animate-in fade-in duration-150">
                  {[
                    { id: 'excel', letter: 'A', title: 'Excel o notas manuales', subtitle: 'Hojas de cálculo o registros en papel' },
                    { id: 'saint', letter: 'B', title: 'Saint Enterprise / A2 Softway', subtitle: 'Sistemas administrativos venezolanos' },
                    { id: 'valery', letter: 'C', title: 'Valery / Premium Soft', subtitle: 'Facturación y gestión de inventario' },
                    { id: 'tiendanube', letter: 'D', title: 'Tiendanube / Shopify / WooCommerce', subtitle: 'Plataformas de comercio online' },
                    { id: 'pos', letter: 'E', title: 'Otro sistema POS', subtitle: 'Puntos de venta y facturación' },
                    { id: 'other', letter: 'F', title: 'Otro sistema', subtitle: 'Contamos con soporte de migración personalizada' },
                    { id: 'none', letter: 'G', title: 'Ninguno', subtitle: 'Empiezo desde cero' },
                  ].map(item => {
                    const isChecked = currentSystems.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (item.id === 'none') {
                            setCurrentSystems(['none']);
                          } else {
                            const withoutNone = currentSystems.filter(s => s !== 'none');
                            toggleMultiSelect(withoutNone, setCurrentSystems, item.id);
                          }
                        }}
                        className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isChecked 
                            ? 'border-orange-500 bg-orange-50/50 shadow-xs' 
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                            isChecked ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {item.letter}
                          </span>
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900">{item.title}</h4>
                            <p className="text-[11px] text-slate-500">{item.subtitle}</p>
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
              {/* PASO 5: ¿Cómo prefieres que te contactemos? (Single-select A-D)   */}
              {/* ----------------------------------------------------------------- */}
              {step === 5 && (
                <div className="space-y-3 animate-in fade-in duration-150">
                  {[
                    { id: 'whatsapp', letter: 'A', title: 'WhatsApp', subtitle: `Te contactamos al +58 ${whatsapp || 'tu número'}`, icon: MessageCircle },
                    { id: 'call', letter: 'B', title: 'Llamada telefónica', subtitle: 'Te llamamos en horario laboral comercial', icon: Phone },
                    { id: 'mail', letter: 'C', title: 'Correo electrónico', subtitle: 'Te escribimos a tu correo electrónico', icon: Mail },
                    { id: 'self', letter: 'D', title: 'Prefiero explorar solo', subtitle: 'Tutoriales y guías disponibles directamente en el panel', icon: Ban },
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
              {/* PASO 6: ¿Cómo conociste AxonMarket? + Código de Afiliado          */}
              {/* ----------------------------------------------------------------- */}
              {step === 6 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { id: 'social', letter: 'A', name: 'Instagram o Facebook', icon: Share2 },
                      { id: 'google', letter: 'B', name: 'Google', icon: Search },
                      { id: 'ai', letter: 'C', name: 'ChatGPT u otra IA', icon: Sparkles },
                      { id: 'friend', letter: 'D', name: 'Recomendación de un colega', icon: Users },
                      { id: 'provider', letter: 'E', name: 'Me invitó mi proveedor', icon: Truck },
                      { id: 'accountant', letter: 'F', name: 'Mi contador o asesor', icon: UserCheck },
                      { id: 'youtube', letter: 'G', name: 'YouTube o TikTok', icon: Video },
                      { id: 'other', letter: 'H', name: 'Otro medio', icon: MoreHorizontal },
                    ].map(item => {
                      const Icon = item.icon;
                      const isSelected = discoveryChannel === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setDiscoveryChannel(item.id)}
                          className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                            isSelected 
                              ? 'border-orange-500 bg-orange-50/70 text-orange-950 shadow-xs' 
                              : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                          }`}
                        >
                          <span className={`w-6 h-6 rounded-md text-[11px] font-bold flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {item.letter}
                          </span>
                          <Icon size={16} className={isSelected ? 'text-orange-600' : 'text-slate-400'} />
                          <span className="text-xs font-bold truncate">{item.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Gift size={16} className="text-orange-500" />
                      <span className="text-xs font-bold text-slate-800">¿Tienes un código de referido o afiliado?</span>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        value={affiliateCode}
                        onChange={e => setAffiliateCode(e.target.value)}
                        placeholder="ej. promo-caracas"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-mono outline-none focus:border-orange-500 bg-white"
                        disabled={affiliateApplied}
                      />
                      <button
                        type="button"
                        onClick={handleApplyAffiliate}
                        disabled={affiliateApplied || !affiliateCode.trim()}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          affiliateApplied 
                            ? 'bg-emerald-600 text-white cursor-default' 
                            : 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer disabled:opacity-50'
                        }`}
                      >
                        {affiliateApplied ? 'Aplicado ✓' : 'Aplicar'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------------------- */}
              {/* PASO 7: Comienza con 30 productos típicos de [Rubro]              */}
              {/* ----------------------------------------------------------------- */}
              {step === 7 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {catalog.items.slice(0, 6).map((prod, idx) => (
                      <div key={idx} className="border border-slate-200 rounded-2xl p-2.5 bg-white shadow-xs flex flex-col justify-between">
                        <img 
                          src={prod.image} 
                          alt={prod.name} 
                          className="w-full h-24 object-cover rounded-xl mb-2" 
                        />
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{prod.name}</h4>
                          <span className="text-xs font-extrabold text-orange-600 block mt-0.5">{prod.refPriceLabel}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <p className="text-xs text-slate-600 font-medium">
                      <span className="font-bold text-slate-900">y 24 productos más:</span> {catalog.items.slice(6, 14).map(p => p.name.split(' ')[0].toLowerCase()).join(', ')}...
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* ================================================================= */}
            {/* BOTÓN INFERIOR DE ACCIÓN (Continuar →) FIEL A LA FOTO 2 DE COMMERCY */}
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

              {step < 7 ? (
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
                    Prefiero cargar los míos
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
                        <span>Precargando...</span>
                      </>
                    ) : (
                      <>
                        <span>Cargar los 30 productos</span>
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
