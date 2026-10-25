import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, Search, MapPin, Bike, Store, Smartphone, ArrowRight, 
  ShieldCheck, Clock, Truck, ChevronRight, Star, X, ExternalLink, 
  Compass, LogIn, User, Sparkles, CheckCircle2, Heart, Flame, Gift
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../supabaseClient';

export default function WelcomeLanding() {
  const navigate = useNavigate();
  const [addressInput, setAddressInput] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [showTopBanner, setShowTopBanner] = useState(true);
  const [currentCustomer, setCurrentCustomer] = useState(null);

  // Comprobar si el cliente ya está autenticado
  useEffect(() => {
    const checkUser = async () => {
      try {
        const stored = localStorage.getItem('axon_customer_session');
        if (stored) {
          setCurrentCustomer(JSON.parse(stored));
          return;
        }
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          setCurrentCustomer({
            email: data.session.user.email,
            name: data.session.user.user_metadata?.name || data.session.user.email?.split('@')[0]
          });
        }
      } catch (e) {
        console.error('Error checking user session in WelcomeLanding:', e);
      }
    };
    checkUser();
  }, []);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    navigate('/explorar', { 
      state: { searchQuery: addressInput.trim() } 
    });
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      navigate('/explorar');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        // Lleva al mapa o al directorio con geolocalización
        navigate('/mapa', {
          state: { coords: { lat: pos.coords.latitude, lng: pos.coords.longitude } }
        });
      },
      (err) => {
        setIsLocating(false);
        navigate('/explorar');
      },
      { timeout: 7000 }
    );
  };

  const popularCities = [
    'Cagua', 'Maracay', 'Turmero', 'La Victoria', 'Valencia', 'Caracas', 'San Juan', 'Villa de Cura'
  ];

  const popularCategories = [
    { name: 'Comida Rápida', icon: Flame, tag: 'Comida' },
    { name: 'Bodegones', icon: ShoppingBag, tag: 'Víveres' },
    { name: 'Farmacias', icon: ShieldCheck, tag: 'Farmacia' },
    { name: 'Promos', icon: Gift, tag: 'Ofertas' },
    { name: 'Moda', icon: Sparkles, tag: 'Ropa' },
    { name: 'Tecnología', icon: Smartphone, tag: 'Tecnología' },
  ];

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans selection:bg-amber-500 selection:text-zinc-950 flex flex-col">
      
      {/* 1. SMART APP BANNER SUPERIOR (Estilo DoorDash) */}
      <AnimatePresence>
        {showTopBanner && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-zinc-900 text-white border-b border-zinc-800 text-xs px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 relative z-50 overflow-hidden"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-zinc-950 shrink-0 shadow-sm font-black">
                <ShoppingBag size={16} className="stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-white text-xs truncate">Navega más rápido en la App</span>
                  <span className="hidden sm:inline-block text-[10px] bg-amber-500/20 text-amber-400 font-bold px-1.5 py-0.5 rounded">
                    $0 delivery 1er pedido
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                  <div className="flex text-amber-400">
                    {'★★★★★'}
                  </div>
                  <span>4.9 • Disponible en tu navegador o PWA</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => navigate('/explorar')}
                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs px-3.5 py-1.5 rounded-full transition-all shadow-sm active:scale-95"
              >
                Abrir
              </button>
              <button 
                onClick={() => setShowTopBanner(false)}
                className="p-1 text-zinc-400 hover:text-white transition-colors"
                aria-label="Cerrar banner"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. BARRA DE NAVEGACIÓN SUPERIOR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-100 transition-shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo Oficial AxonMarket */}
          <div 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-zinc-950 shadow-md group-hover:scale-105 transition-transform">
              <ShoppingBag size={22} className="stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-wider text-zinc-950 leading-tight">
                AXON<span className="text-amber-500">MARKET</span>
              </span>
              <span className="text-[9px] font-bold tracking-widest text-zinc-400 uppercase">
                Venezuela
              </span>
            </div>
          </div>

          {/* Selector de Ciudad & Botones de Acción */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            <button 
              onClick={handleUseCurrentLocation}
              className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-amber-600 bg-zinc-100/80 hover:bg-zinc-100 px-3 py-1.5 rounded-full transition-colors"
            >
              <MapPin size={14} className="text-amber-500" />
              <span>{isLocating ? 'Ubicando...' : 'Aragua / Venezuela'}</span>
            </button>

            {currentCustomer ? (
              <button 
                onClick={() => navigate('/explorar')}
                className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold px-3 py-2 rounded-full transition-colors"
              >
                <User size={14} className="text-amber-600" />
                <span className="max-w-[100px] truncate">{currentCustomer.name}</span>
                <span className="text-[10px] bg-amber-500 text-zinc-950 font-black px-1.5 py-0.5 rounded-full">Feed</span>
              </button>
            ) : (
              <button 
                onClick={() => navigate('/explorar', { state: { openAuthModal: true } })}
                className="text-xs font-bold text-zinc-700 hover:text-zinc-950 px-3 py-2 rounded-full hover:bg-zinc-100 transition-colors"
              >
                Iniciar Sesión
              </button>
            )}

            <button 
              onClick={() => navigate('/explorar')}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 font-black text-xs sm:text-sm px-4 sm:px-5 py-2 rounded-full shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <span>Abrir App</span>
              <ArrowRight size={15} />
            </button>
          </div>

        </div>
      </header>

      {/* 3. HERO SECTION (Ingeniería Inversa de DoorDash: Impacto Visual Vibrante) */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-600 via-amber-600 to-amber-500 text-white py-12 sm:py-16 lg:py-20 px-4 sm:px-6">
        
        {/* Patrón de luz ambiental y siluetas sutiles */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white via-transparent to-black"></div>
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-300/30 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-red-600/30 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-6xl mx-auto relative z-10">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Columna Izquierda: Texto, Llamado a la Acción y Buscador */}
            <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left">
              
              {/* Badge Oficial */}
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 bg-black/25 backdrop-blur-md border border-white/20 text-white px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-5 shadow-sm"
              >
                <ShoppingBag size={14} className="text-amber-300 stroke-[2.5]" />
                <span>AxonMarket Delivery & Comercios</span>
              </motion.div>

              {/* Gran Titular Principal (DoorDash Style) */}
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-black tracking-tight text-white uppercase leading-[1.08] drop-shadow-sm mb-3"
              >
                $0 Costo de Envío en tu Primer Pedido
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-xs sm:text-sm font-semibold text-amber-100/90 tracking-wide uppercase mb-6 max-w-xl"
              >
                Tus tiendas, restaurantes y bodegones favoritos en tu ciudad
              </motion.p>

              {/* Imagen en móvil (se muestra justo antes de los botones para máxima tracción visual) */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="block lg:hidden w-full max-w-sm mb-6 rounded-3xl overflow-hidden shadow-2xl border-2 border-white/25 relative group"
              >
                <img 
                  src="/landing-hero.jpg" 
                  alt="AxonMarket Delivery y Comida Venezolana" 
                  className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-amber-300 border border-white/20">
                  🇻🇪 Sabor Local
                </div>
              </motion.div>

              {/* Botón Principal "Abrir App" Prominente */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="w-full max-w-md mb-6"
              >
                <button 
                  onClick={() => navigate('/explorar')}
                  className="w-full py-4 px-8 bg-zinc-950 hover:bg-black text-amber-400 hover:text-amber-300 font-black text-base sm:text-lg rounded-2xl shadow-xl shadow-black/20 hover:shadow-black/30 active:scale-[0.99] transition-all flex items-center justify-center gap-3 border border-white/10"
                >
                  <ShoppingBag size={22} className="stroke-[2.5]" />
                  <span>Abrir App y Explorar</span>
                  <ArrowRight size={20} />
                </button>
              </motion.div>

              {/* Buscador de Dirección / Comercios Cápsula (Estilo DoorDash) */}
              <motion.form 
                onSubmit={handleSearchSubmit}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="w-full max-w-xl bg-white rounded-2xl sm:rounded-full p-2 shadow-2xl flex flex-col sm:flex-row items-center gap-2 border border-white/30"
              >
                <div className="flex items-center gap-2.5 px-3 py-2 w-full text-zinc-700">
                  <Search size={20} className="text-zinc-400 shrink-0" />
                  <input 
                    type="text" 
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    placeholder="Ingresa tu dirección o busca un comercio..."
                    className="w-full text-sm font-medium bg-transparent text-zinc-900 placeholder-zinc-400 focus:outline-none"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-sm px-6 py-3 rounded-xl sm:rounded-full shadow-md transition-all shrink-0 active:scale-95"
                >
                  Buscar
                </button>
              </motion.form>

              {/* Enlace "Usar ubicación actual" */}
              <motion.button 
                type="button"
                onClick={handleUseCurrentLocation}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-4 inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white hover:text-amber-200 underline underline-offset-4 transition-colors"
              >
                <MapPin size={15} />
                <span>{isLocating ? 'Detectando coordenadas...' : 'Usar mi ubicación actual ↗'}</span>
              </motion.button>

            </div>

            {/* Columna Derecha: Tarjeta Imagen Principal (Desktop Showcase) */}
            <div className="hidden lg:flex lg:col-span-5 justify-center">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.5 }}
                className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20 bg-zinc-900 group"
              >
                <img 
                  src="/landing-hero.jpg" 
                  alt="AxonMarket Delivery y Mercado" 
                  className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700"
                />

                {/* Floating Glassmorphic Badges */}
                <div className="absolute top-4 right-4 bg-zinc-950/75 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold text-amber-300 border border-white/20 shadow-lg flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>100% Sabor Local 🇻🇪</span>
                </div>

                <div className="absolute bottom-4 left-4 right-4 bg-zinc-950/80 backdrop-blur-md p-3 rounded-2xl text-xs text-white border border-white/15 shadow-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500 text-zinc-950 flex items-center justify-center font-black">
                      <ShoppingBag size={14} className="stroke-[2.5]" />
                    </div>
                    <div>
                      <p className="font-black text-xs text-white">Pabellón, Hallacas y Víveres</p>
                      <p className="text-[10px] text-zinc-400">Entrega rápida en tu zona</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black bg-amber-500/20 text-amber-400 px-2 py-1 rounded-md">
                    $0 Envío
                  </span>
                </div>
              </motion.div>
            </div>

          </div>

        </div>

        {/* Micro-callout inferior del Hero */}
        <div className="mt-12 pt-6 border-t border-white/15 max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-amber-100/90 gap-2">
          <div className="flex items-center gap-2 font-medium">
            <span className="text-amber-300">🏷️</span>
            <span>Disfruta de delivery rápido y pagos en Bolívares y Divisas</span>
          </div>
          <button 
            onClick={() => navigate('/explorar')}
            className="font-bold text-white hover:text-amber-200 underline"
          >
            Ver todos los comercios ➔
          </button>
        </div>

      </section>

      {/* 4. TRES PILARES DE SERVICIOS (Ingeniería Inversa 1:1 de DoorDash) */}
      <section className="py-16 sm:py-24 bg-zinc-50 border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs font-black tracking-widest uppercase text-amber-600 mb-2 block">
              Ecosistema Integral
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-zinc-950 tracking-tight">
              Una plataforma diseñada para toda la comunidad
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-6 lg:gap-8">
            
            {/* CARD 1: Conviértete en Repartidor (Become a Dasher) */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/80 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Bike size={32} className="stroke-[2.2]" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight mb-3">
                  Conviértete en Repartidor
                </h3>
                <p className="text-sm text-zinc-600 leading-relaxed font-normal mb-6">
                  Como repartidor independiente de AxonMarket, genera ingresos en tu propio horario. Regístrate en minutos con tu moto, bicicleta o vehículo.
                </p>
              </div>

              <div>
                <button 
                  onClick={() => navigate('/delivery')}
                  className="inline-flex items-center gap-2 text-sm font-black text-amber-600 hover:text-amber-700 group-hover:translate-x-1 transition-all"
                >
                  <span>Empezar a ganar</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* CARD 2: Abre tu Tienda en AxonMarket (Become a Merchant) */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/80 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Store size={32} className="stroke-[2.2]" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight mb-3">
                  Abre tu Tienda en AxonMarket
                </h3>
                <p className="text-sm text-zinc-600 leading-relaxed font-normal mb-6">
                  Atrae nuevos clientes y multiplica tus ventas con 0% comisiones abusivas. Publica tu catálogo digital y recibe pedidos directo a WhatsApp.
                </p>
              </div>

              <div>
                <button 
                  onClick={() => navigate('/explorar', { state: { openMerchantRegister: true, mode: 'register' } })}
                  className="inline-flex items-center gap-2 text-sm font-black text-orange-600 hover:text-orange-700 group-hover:translate-x-1 transition-all"
                >
                  <span>Registrar mi comercio</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* CARD 3: Vive la mejor experiencia AxonMarket (Get the best app experience) */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/80 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 text-amber-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm">
                  <Smartphone size={32} className="stroke-[2.2]" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight mb-3">
                  La mejor experiencia en tu móvil
                </h3>
                <p className="text-sm text-zinc-600 leading-relaxed font-normal mb-6">
                  Descubre lo mejor que tu comunidad tiene para ofrecer: historias en vivo, ofertas del día, mapa de tiendas y pedidos directos en una sola app.
                </p>
              </div>

              <div>
                <button 
                  onClick={() => navigate('/explorar')}
                  className="inline-flex items-center gap-2 text-sm font-black text-zinc-950 hover:text-amber-600 group-hover:translate-x-1 transition-all"
                >
                  <span>Abrir la App</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 5. EXPLORACIÓN RÁPIDA: CATEGORÍAS POPULARES */}
      <section className="py-14 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-black tracking-widest uppercase text-amber-600 mb-1 block">
                Descubre por departamento
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight">
                Categorías Populares
              </h2>
            </div>
            <button 
              onClick={() => navigate('/explorar')}
              className="text-xs sm:text-sm font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              <span>Ver catálogo completo</span>
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
            {popularCategories.map((cat, idx) => {
              const IconComp = cat.icon;
              return (
                <button
                  key={idx}
                  onClick={() => navigate('/explorar', { state: { category: cat.tag } })}
                  className="bg-zinc-50 hover:bg-amber-500/10 border border-zinc-200/80 hover:border-amber-500/40 rounded-2xl p-4 flex flex-col items-center text-center gap-2 transition-all active:scale-95 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-white shadow-xs border border-zinc-100 flex items-center justify-center text-zinc-800 group-hover:text-amber-600 transition-colors">
                    <IconComp size={22} />
                  </div>
                  <span className="text-xs font-bold text-zinc-800 group-hover:text-amber-700 transition-colors">
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>

        </div>
      </section>

      {/* 6. CIUDADES ACTIVAS */}
      <section className="py-12 bg-zinc-50 border-t border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-xs font-black tracking-widest uppercase text-zinc-400 mb-4">
            Comercios disponibles en ciudades de Venezuela
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 max-w-4xl mx-auto">
            {popularCities.map((city, i) => (
              <button
                key={i}
                onClick={() => navigate('/explorar', { state: { searchQuery: city } })}
                className="px-3.5 py-1.5 bg-white hover:bg-zinc-900 hover:text-white border border-zinc-200 text-xs font-bold text-zinc-700 rounded-full transition-all shadow-2xs"
              >
                📍 {city}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 7. FOOTER PROFESIONAL AXONMARKET */}
      <footer className="bg-zinc-950 text-zinc-400 text-xs pt-16 pb-12 mt-auto border-t border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 pb-12 border-b border-zinc-800/80">
            
            {/* Columna Marca */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-zinc-950 font-black">
                  <ShoppingBag size={18} className="stroke-[2.5]" />
                </div>
                <span className="text-base font-black tracking-wider text-white">
                  AXON<span className="text-amber-500">MARKET</span>
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                La plataforma de comercio y delivery local más rápida, moderna y transparente de Venezuela.
              </p>
              <div className="text-[11px] text-amber-400 font-bold">
                ✓ 0% comisiones abusivas • Pedidos por WhatsApp
              </div>
            </div>

            {/* Columna Clientes */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-white mb-3">
                Para Clientes
              </h4>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => navigate('/explorar')} className="hover:text-amber-400 transition-colors">
                    Explorar Comercios
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/mapa')} className="hover:text-amber-400 transition-colors">
                    Mapa de Tiendas
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/explorar', { state: { openAuthModal: true } })} className="hover:text-amber-400 transition-colors">
                    Iniciar Sesión / Registro
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/chats')} className="hover:text-amber-400 transition-colors">
                    Mis Pedidos & Chats
                  </button>
                </li>
              </ul>
            </div>

            {/* Columna Comercios & Delivery */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-white mb-3">
                Aliados & Negocios
              </h4>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => navigate('/explorar', { state: { openMerchantRegister: true, mode: 'register' } })} className="hover:text-amber-400 transition-colors">
                    Registrar mi Comercio
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/delivery')} className="hover:text-amber-400 transition-colors">
                    Ser Repartidor Delivery
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/dashboard')} className="hover:text-amber-400 transition-colors">
                    Portal Comerciante (Admin)
                  </button>
                </li>
              </ul>
            </div>

            {/* Columna Legal & Ayuda */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-white mb-3">
                Legal & Soporte
              </h4>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => navigate('/legal/terminos')} className="hover:text-amber-400 transition-colors">
                    Términos y Condiciones
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/legal/privacidad')} className="hover:text-amber-400 transition-colors">
                    Política de Privacidad
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/legal/aviso')} className="hover:text-amber-400 transition-colors">
                    Aviso Legal
                  </button>
                </li>
                <li>
                  <a 
                    href="https://wa.me/584120000000?text=Hola,%20deseo%20asistencia%20en%20AxonMarket" 
                    target="_blank" 
                    rel="noreferrer"
                    className="hover:text-amber-400 transition-colors inline-flex items-center gap-1"
                  >
                    <span>Soporte WhatsApp</span>
                    <ExternalLink size={12} />
                  </a>
                </li>
              </ul>
            </div>

          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500 gap-3">
            <p>© {new Date().getFullYear()} AxonMarket Technologies C.A. Todos los derechos reservados.</p>
            <p>Hecho con pasión para el comercio venezolano 🇻🇪</p>
          </div>

        </div>
      </footer>

    </div>
  );
}
