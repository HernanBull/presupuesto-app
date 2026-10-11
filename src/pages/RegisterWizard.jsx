import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, ArrowLeft, CheckCircle, Store, 
  ShoppingCart, UtensilsCrossed, Apple, Pill, Wine, Hammer,
  Wrench, Car, Bike, Beef, Croissant, Smartphone, Paperclip,
  Scissors, Shirt, Droplets, Plug, IceCream, AlertCircle,
  Truck, Calendar, Package, BarChart3, Clock, MapPin, Phone, FileText
} from 'lucide-react';
import { BUSINESS_TYPES } from '../config/businessTypes';
import { supabase } from '../supabaseClient';

// Mapeo de iconos
const iconMap = {
  ShoppingCart, UtensilsCrossed, Apple, Pill, Wine, Hammer,
  Wrench, Car, Bike, Beef, Croissant, Smartphone, Paperclip,
  Scissors, Shirt, Droplets, Plug, Store, IceCream
};

const ToggleSwitch = ({ enabled, onChange, label, icon: Icon, description }) => (
  <div 
    onClick={onChange}
    className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
      enabled 
        ? 'border-amber-500 bg-amber-500/10 shadow-sm' 
        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
    }`}
  >
    <div className="flex items-center gap-4">
      <div className={`p-2.5 rounded-xl ${enabled ? 'bg-amber-500/20 text-amber-600' : 'bg-slate-200 text-slate-500'}`}>
        <Icon size={20} />
      </div>
      <div>
        <h4 className={`font-bold text-sm ${enabled ? 'text-slate-900' : 'text-slate-700'}`}>{label}</h4>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
    </div>
    <div className={`w-11 h-6 rounded-full p-1 transition-colors duration-300 ${enabled ? 'bg-amber-500' : 'bg-slate-300'}`}>
      <motion.div 
        layout 
        className="w-4 h-4 bg-white rounded-full shadow-sm"
        animate={{ x: enabled ? 20 : 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </div>
  </div>
);

export const RegisterWizard = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [setupMessages, setSetupMessages] = useState([]);
  
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: null,
    legalType: 'J', // J, V, G, E
    rif: '',
    state: '',
    city: '',
    whatsapp: '',
    instagram: '',
    features: {
      delivery: true,
      expiration_dates: false,
      calendar: false,
      inventory: true,
      analytics: true
    },
    email: '',
    password: '',
  });

  const handleNext = () => setStep(prev => prev + 1);
  const handlePrev = () => setStep(prev => prev - 1);

  const handleSelectType = (typeId) => {
    const selectedType = BUSINESS_TYPES.find(t => t.id === typeId);
    const newFeatures = {
      delivery: selectedType.defaultModules.includes('orders'),
      expiration_dates: selectedType.defaultModules.includes('expiration_dates'),
      calendar: selectedType.defaultModules.includes('calendar'),
      inventory: selectedType.defaultModules.includes('inventory'),
      analytics: selectedType.defaultModules.includes('analytics'),
    };
    setFormData({ ...formData, businessType: typeId, features: newFeatures });
    handleNext();
  };

  const handleToggleFeature = (feature) => {
    setFormData(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [feature]: !prev.features[feature]
      }
    }));
  };

  const formatRIF = (value) => {
    let formatted = value.replace(/[^\d-]/g, '');
    return formatted.slice(0, 12);
  };

  const formatWhatsApp = (value) => {
    let formatted = value.replace(/\D/g, '');
    return formatted.slice(0, 11);
  };

  const cleanRif = formData.rif.replace(/\D/g, '');
  const cleanWhatsApp = formData.whatsapp.replace(/\D/g, '');

  const simulateSetup = async () => {
    const messages = [
      "Registrando expediente mercantil...",
      "Configurando pasarelas y envíos...",
      "Instalando módulos seleccionados...",
      "Generando categorías por defecto...",
      "¡Todo listo para vender!"
    ];

    for (let msg of messages) {
      setSetupMessages(prev => [...prev, msg]);
      await new Promise(r => setTimeout(r, 800));
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    handleNext(); // Mover al paso 7 (Animación)
    
    try {
      simulateSetup();
      const selectedType = BUSINESS_TYPES.find(t => t.id === formData.businessType);
      
      const id = 'WS-' + Math.floor(Math.random() * 1000000);
      const generatedSlug = formData.businessName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
        
      const finalModules = [];
      if (formData.features.delivery) finalModules.push('orders');
      if (formData.features.expiration_dates) finalModules.push('expiration_dates');
      if (formData.features.calendar) finalModules.push('calendar');
      if (formData.features.inventory) finalModules.push('inventory');
      if (formData.features.analytics) finalModules.push('analytics');
      finalModules.push('product_studio');

      const config = {
        business_type: formData.businessType,
        modules: finalModules,
        categories: selectedType.defaultCategories,
        expediente: {
          legalType: formData.legalType,
          rif: formData.legalType + '-' + formData.rif,
          state: formData.state,
          city: formData.city,
          whatsapp: cleanWhatsApp.startsWith('0') ? '+58' + cleanWhatsApp.slice(1) : (cleanWhatsApp.startsWith('58') ? '+' + cleanWhatsApp : '+58' + cleanWhatsApp),
          instagram: formData.instagram
        },
        adminEmail: formData.email,
        adminPin: formData.password
      };

      const payload = {
        id,
        name: formData.businessName,
        store_slug: generatedSlug,
        config: config,
        owner_email: formData.email,
        created_at: new Date().toISOString()
      };

      const { error: wsError } = await supabase.from('workspaces').insert([payload]);

      if (wsError) throw new Error(wsError.message || 'Error al crear la tienda virtual');

      // Guardar el workspace y el slug en localStorage para el panel de administración
      localStorage.setItem('activeWorkspace', id);
      localStorage.setItem('storeSlug', generatedSlug);

      setTimeout(() => {
        window.location.href = '/'; 
      }, 4500);

    } catch (err) {
      setError(err.message);
      setStep(6); 
      setLoading(false);
    }
  };

  const slideVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
    exit: { opacity: 0, y: -30, transition: { duration: 0.3 } }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-amber-500/5 to-transparent"></div>
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px]"
        />
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-2xl px-4 sm:px-0">
        <div className="bg-white/95 backdrop-blur-xl p-8 sm:p-10 shadow-2xl sm:rounded-[2.5rem] border border-slate-200 min-h-[500px] flex flex-col justify-center relative">
          
          {step > 1 && step < 7 && (
            <div className="absolute top-8 left-8 right-8 flex justify-between items-center">
              <button onClick={handlePrev} className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5 text-sm font-semibold">
                <ArrowLeft size={16} /> Atrás
              </button>
              <div className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                Paso {step} de 6
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            
            {/* PASO 1: Nombre del Negocio */}
            {step === 1 && (
              <motion.div 
                key="step1" variants={slideVariants} initial="hidden" animate="visible" exit="exit"
                className="max-w-lg mx-auto w-full text-center"
              >
                <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-amber-500/20 text-amber-600 shadow-sm">
                  <Store size={32} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">
                  ¡Hola! Empecemos.
                </h2>
                <p className="text-slate-500 mb-8 text-base">
                  ¿Cuál es el nombre de tu tienda virtual?
                </p>
                <input
                  type="text" autoFocus value={formData.businessName}
                  onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                  onKeyDown={(e) => { if (e.key === 'Enter' && formData.businessName) handleNext(); }}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-4 px-6 text-slate-900 text-xl focus:outline-none focus:border-amber-500 focus:bg-white transition-all text-center mb-8 placeholder-slate-400 font-medium"
                  placeholder="Ej. Inversiones San José"
                />
                <button
                  onClick={handleNext} disabled={!formData.businessName.trim()}
                  className="w-full sm:w-auto mx-auto flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 px-8 py-4 rounded-2xl font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed text-base shadow-lg shadow-amber-500/20"
                >
                  Continuar <ArrowRight size={20} />
                </button>
              </motion.div>
            )}

            {/* PASO 2: Selección de Rubro */}
            {step === 2 && (
              <motion.div 
                key="step2" variants={slideVariants} initial="hidden" animate="visible" exit="exit"
                className="w-full pt-8"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-black text-slate-900 mb-2">
                    ¿Qué venderás en <span className="text-amber-600">{formData.businessName}</span>?
                  </h2>
                  <p className="text-slate-500 text-sm">Selecciona tu rubro para sugerirte la mejor configuración.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {BUSINESS_TYPES.map((type) => {
                    const Icon = iconMap[type.icon] || Store;
                    return (
                      <button
                        key={type.id} onClick={() => handleSelectType(type.id)}
                        className="text-left p-4 rounded-2xl border-2 border-slate-200 bg-slate-50/50 hover:border-amber-500/60 hover:bg-amber-50/50 transition-all duration-300 flex flex-col gap-3 group"
                      >
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 group-hover:text-amber-600 group-hover:border-amber-400 group-hover:bg-amber-50 transition-colors inline-flex self-start shadow-sm">
                          <Icon size={24} />
                        </div>
                        <span className="text-sm font-bold text-slate-700 group-hover:text-slate-950 transition-colors leading-snug">
                          {type.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* PASO 3: Identidad Legal (RIF) */}
            {step === 3 && (
              <motion.div 
                key="step3" variants={slideVariants} initial="hidden" animate="visible" exit="exit"
                className="w-full max-w-lg mx-auto pt-8"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-black text-slate-900 mb-2 flex items-center justify-center gap-2">
                    <FileText className="text-amber-500" size={24} /> Expediente Fiscal
                  </h2>
                  <p className="text-slate-500 text-sm">Requerido en Venezuela para facturación y envíos.</p>
                </div>

                <div className="space-y-6 mb-8">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 text-center">Eres una persona...</label>
                    <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                      {[
                        { id: 'J', label: 'Jurídica (J)' },
                        { id: 'V', label: 'Natural (V)' },
                        { id: 'G', label: 'Gobierno (G)' },
                        { id: 'E', label: 'Extranjero (E)' }
                      ].map(type => (
                        <button
                          key={type.id}
                          onClick={() => setFormData({...formData, legalType: type.id})}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                            formData.legalType === type.id 
                              ? 'bg-white text-slate-900 shadow-sm' 
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Número de RIF / Cédula</label>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cleanRif.length >= 6 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {cleanRif.length}/6 mín {cleanRif.length >= 6 ? '✓' : ''}
                      </span>
                    </div>
                    <div className="flex items-stretch border-2 border-slate-200 bg-slate-50 rounded-xl overflow-hidden focus-within:border-amber-500 focus-within:bg-white transition-all">
                      <div className="px-4 flex items-center justify-center bg-slate-100 text-slate-700 font-bold text-lg border-r border-slate-200">
                        {formData.legalType}-
                      </div>
                      <input
                        type="text"
                        value={formData.rif}
                        onChange={(e) => setFormData({...formData, rif: formatRIF(e.target.value)})}
                        className="w-full bg-transparent py-3.5 px-4 text-slate-900 text-lg focus:outline-none placeholder-slate-400 font-mono tracking-widest"
                        placeholder="12345678-9"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleNext} disabled={cleanRif.length < 6}
                  className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 px-8 py-4 rounded-2xl font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed text-base shadow-lg shadow-amber-500/20"
                >
                  Continuar <ArrowRight size={20} />
                </button>
              </motion.div>
            )}

            {/* PASO 4: Logística y Contacto */}
            {step === 4 && (
              <motion.div 
                key="step4" variants={slideVariants} initial="hidden" animate="visible" exit="exit"
                className="w-full max-w-lg mx-auto pt-8"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-black text-slate-900 mb-2 flex items-center justify-center gap-2">
                    <MapPin className="text-amber-500" size={24} /> Logística y Contacto
                  </h2>
                  <p className="text-slate-500 text-sm">¿De dónde salen tus paquetes y cómo te contactan?</p>
                </div>

                <div className="space-y-5 mb-8">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Estado</label>
                      <input
                        type="text" value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 px-4 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all placeholder-slate-400 font-medium"
                        placeholder="Ej. Miranda"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Ciudad</label>
                      <input
                        type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 px-4 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all placeholder-slate-400 font-medium"
                        placeholder="Ej. Caracas"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <Phone size={14} className="text-amber-500" /> WhatsApp de Ventas
                      </label>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cleanWhatsApp.length >= 11 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {cleanWhatsApp.length}/11 mín {cleanWhatsApp.length >= 11 ? '✓' : ''}
                      </span>
                    </div>
                    <div className="flex items-stretch border-2 border-slate-200 bg-slate-50 rounded-xl overflow-hidden focus-within:border-amber-500 focus-within:bg-white transition-all">
                      <input
                        type="tel" value={formData.whatsapp} onChange={(e) => setFormData({...formData, whatsapp: formatWhatsApp(e.target.value)})}
                        className="w-full bg-transparent py-3 px-4 text-slate-900 focus:outline-none placeholder-slate-400 font-mono tracking-wider font-semibold"
                        placeholder="Ej. 04141234567"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                      <span className="text-amber-500 font-bold">@</span> Instagram (Opcional)
                    </label>
                    <div className="flex items-stretch border-2 border-slate-200 bg-slate-50 rounded-xl overflow-hidden focus-within:border-amber-500 focus-within:bg-white transition-all">
                      <div className="px-4 flex items-center justify-center bg-slate-100 text-slate-500 font-bold border-r border-slate-200">
                        @
                      </div>
                      <input
                        type="text" value={formData.instagram} onChange={(e) => setFormData({...formData, instagram: e.target.value.replace('@','')})}
                        className="w-full bg-transparent py-3 px-4 text-slate-900 focus:outline-none placeholder-slate-400 font-medium"
                        placeholder="tu_tienda"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleNext} disabled={!formData.state.trim() || !formData.city.trim() || cleanWhatsApp.length < 11}
                  className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 px-8 py-4 rounded-2xl font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed text-base shadow-lg shadow-amber-500/20"
                >
                  Continuar <ArrowRight size={20} />
                </button>
              </motion.div>
            )}

            {/* PASO 5: Personalización de Módulos */}
            {step === 5 && (
              <motion.div 
                key="step5" variants={slideVariants} initial="hidden" animate="visible" exit="exit"
                className="w-full max-w-lg mx-auto pt-8"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-black text-slate-900 mb-2">Ajustemos tu E-commerce</h2>
                  <p className="text-slate-500 text-sm">Preseleccionamos esto basado en tu rubro. Ajusta si lo deseas.</p>
                </div>
                <div className="space-y-3 mb-10">
                  <ToggleSwitch 
                    enabled={formData.features.delivery} onChange={() => handleToggleFeature('delivery')}
                    label="Delivery y Envíos" description="Gestiona despachos por agencias (MRW, Zoom) o locales." icon={Truck}
                  />
                  <ToggleSwitch 
                    enabled={formData.features.inventory} onChange={() => handleToggleFeature('inventory')}
                    label="Control de Inventario" description="Evita vender agotados. Manejo de stock real." icon={Package}
                  />
                  <ToggleSwitch 
                    enabled={formData.features.expiration_dates} onChange={() => handleToggleFeature('expiration_dates')}
                    label="Lotes y Vencimientos" description="Manejo sanitario ideal para alimentos y medicinas." icon={Clock}
                  />
                  <ToggleSwitch 
                    enabled={formData.features.calendar} onChange={() => handleToggleFeature('calendar')}
                    label="Agenda de Citas" description="Permite agendar servicios presenciales." icon={Calendar}
                  />
                  <ToggleSwitch 
                    enabled={formData.features.analytics} onChange={() => handleToggleFeature('analytics')}
                    label="Analíticas Avanzadas" description="Ventas diarias, productos top y más." icon={BarChart3}
                  />
                </div>
                <button
                  onClick={handleNext}
                  className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 px-8 py-4 rounded-2xl font-bold transition-all text-base shadow-lg shadow-amber-500/20"
                >
                  Confirmar Funciones <ArrowRight size={20} />
                </button>
              </motion.div>
            )}

            {/* PASO 6: Creación de Cuenta */}
            {step === 6 && (
              <motion.div 
                key="step6" variants={slideVariants} initial="hidden" animate="visible" exit="exit"
                className="w-full max-w-md mx-auto pt-8"
              >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 text-emerald-600 shadow-sm">
                    <CheckCircle size={32} />
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 mb-2">¡Casi terminamos!</h2>
                  <p className="text-slate-500 text-sm">Aseguremos tu cuenta para guardar tu expediente y configuración.</p>
                </div>
                {error && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-start gap-3 mb-6 text-sm">
                    <AlertCircle className="shrink-0 mt-0.5" size={18} /><span>{error}</span>
                  </div>
                )}
                <div className="space-y-4 mb-8">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Correo Electrónico (Admin)</label>
                    <input
                      type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 px-4 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all placeholder-slate-400 font-medium"
                      placeholder="ejemplo@correo.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Contraseña Segura</label>
                    <input
                      type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-3 px-4 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-all placeholder-slate-400 font-medium"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <button
                  onClick={handleRegister} disabled={!formData.email.trim() || !formData.password.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 px-8 py-4 rounded-2xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-500/25 text-base"
                >
                  Finalizar y Configurar
                </button>
              </motion.div>
            )}

            {/* PASO 7: Animación de Setup */}
            {step === 7 && (
              <motion.div 
                key="step7" variants={slideVariants} initial="hidden" animate="visible"
                className="w-full max-w-md mx-auto text-center py-12"
              >
                <div className="relative w-24 h-24 mx-auto mb-8">
                  <motion.div 
                    animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full border-[3px] border-amber-500/20 border-t-amber-500"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Store size={32} className="text-amber-500" />
                  </div>
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-6">Armando tu Sistema...</h2>
                <div className="space-y-3">
                  {setupMessages.map((msg, idx) => (
                    <motion.div 
                      key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 text-sm font-semibold text-slate-700"
                    >
                      <CheckCircle size={16} className="text-amber-500" /> {msg}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(203, 213, 225, 0.6); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(245, 158, 11, 0.6); }
      `}} />
    </div>
  );
};
