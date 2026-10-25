import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, Search, MapPin, Bike, Store, Smartphone, ArrowRight, 
  ShieldCheck, Clock, Truck, ChevronRight, Star, X, ExternalLink, 
  Compass, LogIn, User, Sparkles, CheckCircle2, Heart, Flame, Gift, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../supabaseClient';
import { 
  DeliveryRiderIllustration, 
  MerchantStoreIllustration, 
  MobileAppIllustration 
} from '../components/LandingIllustrations';

export default function WelcomeLanding() {
  const navigate = useNavigate();
  const [addressInput, setAddressInput] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [showTopBanner, setShowTopBanner] = useState(true);
  const [currentCustomer, setCurrentCustomer] = useState(null);

  // Tasa Oficial BCV en vivo (con caché local inmediata para evitar parpadeo)
  const [bcvRate, setBcvRate] = useState(() => {
    return localStorage.getItem('axon_bcv_rate') || '887.30';
  });

  useEffect(() => {
    const fetchBcvRate = async () => {
      try {
        const res = await fetch('https://axonmarket-api.onrender.com/api/bcv');
        const data = await res.json();
        if (res.ok && data?.rate) {
          const formatted = Number(data.rate).toFixed(2);
          setBcvRate(formatted);
          localStorage.setItem('axon_bcv_rate', formatted);
        } else if (data?.fallbackRate) {
          const formatted = Number(data.fallbackRate).toFixed(2);
          setBcvRate(formatted);
          localStorage.setItem('axon_bcv_rate', formatted);
        }
      } catch (err) {
        console.error('Error fetching BCV rate in WelcomeLanding:', err);
      }
    };
    fetchBcvRate();
  }, []);

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
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-white text-zinc-900 font-sans selection:bg-amber-500 selection:text-zinc-950 flex flex-col">
      
      {/* 1. HERO SECTION (Estilo DoorDash limpio y organizado sobre imagen gastronómica) */}
      <section 
        className="axon-hero-pure-white relative overflow-hidden text-white flex flex-col justify-between min-h-[580px] sm:min-h-[640px] px-4 sm:px-6 pt-6 pb-12"
        style={{
          background: 'linear-gradient(rgba(0, 0, 0, 0.62), rgba(0, 0, 0, 0.78)), url(/landing-hero.jpg) center center / cover no-repeat',
        }}
      >
        {/* Barra Superior Minimalista (Top-Right: Iniciar Sesión únicamente, limpio como DoorDash) */}
        <div className="max-w-6xl mx-auto w-full flex items-center justify-end relative z-20">
          <div>
            {currentCustomer ? (
              <button 
                onClick={() => navigate('/explorar')}
                className="btn-login bg-white/95 hover:bg-white text-zinc-950 px-5 py-2 rounded-full font-bold text-xs sm:text-sm shadow-lg backdrop-blur-sm transition-all active:scale-95 flex items-center gap-2"
              >
                <span className="text-dark">{currentCustomer.name}</span>
                <span className="text-[10px] bg-orange-600 text-white px-2 py-0.5 rounded-full font-black">Feed</span>
              </button>
            ) : (
              <button 
                onClick={() => navigate('/explorar', { state: { openAuthModal: true } })}
                className="btn-login bg-white/95 hover:bg-white text-zinc-950 px-5 py-2 sm:px-6 sm:py-2 rounded-full font-bold text-xs sm:text-sm shadow-lg backdrop-blur-sm transition-all active:scale-95"
              >
                <span className="text-dark">Iniciar sesión</span>
              </button>
            )}
          </div>
        </div>

        {/* Contenido Central (Limpio y Organizado: Logo, Titular Comercial, 1 Botón, 1 Buscador, 1 Enlace, Tasa BCV) */}
        <div className="max-w-2xl mx-auto w-full text-center flex flex-col items-center justify-center my-auto py-6 relative z-20">
          
          {/* Logo Central de Marca Elegante y Translúcido (Combina con el Fondo) */}
          <div className="inline-flex items-center gap-3 mb-5 px-5 py-2.5 rounded-full bg-black/30 backdrop-blur-md shadow-2xl border border-white/20 select-none">
            {/* Caja / Icono oficial AxonMarket */}
            <img 
              src="/axonmarket-logo-icon.png" 
              alt="AxonMarket" 
              className="w-8 h-8 rounded-xl shadow-sm object-contain" 
            />
            {/* Tipografía de Marca: AXON en blanco y MARKET en dorado/naranja */}
            <span className="text-xl sm:text-2xl font-black tracking-wider flex items-center drop-shadow-md">
              <span className="axon-logo-white">AXON</span>
              <span className="axon-logo-gold ml-0.5">MARKET</span>
            </span>
          </div>

          {/* Gran Titular Comercial en Blanco Puro de Alto Contraste */}
          <h1 
            className="hero-white-title text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight leading-[1.08] mb-3"
          >
            TODO LO QUE TE GUSTA, DIRECTO A TU PUERTA
          </h1>
          
          {/* Subtítulo Comercial Atractivo */}
          <p className="hero-white-title text-sm sm:text-base font-semibold mb-8 max-w-lg">
            Tus tiendas, restaurantes y bodegones favoritos en un solo lugar
          </p>

          {/* Único Botón Principal: Abrir aplicación */}
          <button 
            onClick={() => navigate('/explorar')}
            className="w-full max-w-xs py-3.5 px-8 font-black text-base rounded-full shadow-2xl active:scale-95 transition-all text-center mb-6 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border border-white/20"
            style={{ color: '#ffffff' }}
          >
            Abrir aplicación
          </button>

          {/* Única Cápsula de Búsqueda blanca y limpia con lupa integrada */}
          <form 
            onSubmit={handleSearchSubmit}
            className="w-full max-w-md relative mb-4 shadow-2xl rounded-full"
          >
            <input 
              type="text" 
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="Introduzca la dirección de entrega"
              className="w-full bg-white/95 hover:bg-white focus:bg-white text-zinc-950 placeholder-zinc-500 border border-white/50 focus:border-amber-500 rounded-full py-3.5 pl-6 pr-12 text-sm font-medium transition-all outline-none"
              style={{ color: '#18181b' }}
            />
            <button 
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center transition-all shadow-md"
            >
              <Search size={16} />
            </button>
          </form>

          {/* Enlace Único: Usar ubicación actual */}
          <button 
            type="button"
            onClick={handleUseCurrentLocation}
            style={{ color: '#ffffff' }}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold !text-white underline underline-offset-4 hover:text-amber-300 drop-shadow transition-all"
          >
            <span>{isLocating ? 'Detectando ubicación...' : 'Usar ubicación actual'}</span>
            <span className="text-sm">↗</span>
          </button>

          {/* Tasa Oficial BCV en el Hero (Ubicación cómoda, ergonómica y confiable) */}
          <div className="mt-5 inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-black/45 backdrop-blur-md border border-white/20 text-xs font-semibold text-white shadow-xl">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-zinc-300 font-medium">Tasa Oficial BCV:</span>
            <span className="font-black text-amber-300 tracking-wide text-xs sm:text-sm">
              Bs. {Number(bcvRate || 887.30).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-zinc-400 font-normal">/ USD</span>
          </div>

        </div>

        {/* Espaciador invisible para balance vertical */}
        <div className="h-2 relative z-10"></div>

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
                <div className="mb-6 flex items-center justify-start group-hover:scale-105 transition-transform origin-left">
                  <DeliveryRiderIllustration className="w-28 h-28" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight mb-3">
                  Conviértete en Repartidor
                </h3>
                <p className="text-sm text-zinc-600 leading-relaxed font-normal mb-6">
                  Como repartidor independiente de AxonMarket, gana dinero y trabaja según tu propio horario. Regístrate en minutos con tu moto o vehículo.
                </p>
              </div>

              <div>
                <button 
                  onClick={() => navigate('/delivery')}
                  className="inline-flex items-center gap-2 text-sm font-black text-orange-600 hover:text-orange-700 group-hover:translate-x-1.5 transition-all mb-4"
                >
                  <span>Empieza a ganar</span>
                  <ArrowRight size={16} />
                </button>
                <div className="pt-3 border-t border-zinc-100 flex items-center gap-2.5">
                  <img src="/enminutos-logo.png" alt="En Minutos" className="w-6 h-6 rounded-full shadow-xs object-cover" />
                  <span className="text-[11px] text-zinc-600 font-semibold">Red oficial con En Minutos</span>
                </div>
              </div>
            </div>

            {/* CARD 2: Abre tu Tienda en AxonMarket (Become a Merchant) */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/80 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="mb-6 flex items-center justify-start group-hover:scale-105 transition-transform origin-left">
                  <MerchantStoreIllustration className="w-28 h-28" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight mb-3">
                  Conviértete en comerciante
                </h3>
                <p className="text-sm text-zinc-600 leading-relaxed font-normal mb-6">
                  Atrae nuevos clientes y multiplica tus ventas en línea. Publica tu catálogo digital y haz crecer tu negocio en tu comunidad.
                </p>
              </div>

              <div>
                <button 
                  onClick={() => navigate('/comerciantes')}
                  className="inline-flex items-center gap-2 text-sm font-black text-orange-600 hover:text-orange-700 group-hover:translate-x-1.5 transition-all"
                >
                  <span>Conoce más y empieza</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* CARD 3: Vive la mejor experiencia AxonMarket (Get the best app experience) */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/80 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="mb-6 flex items-center justify-start group-hover:scale-105 transition-transform origin-left">
                  <MobileAppIllustration className="w-28 h-28" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight mb-3">
                  Obtén la mejor experiencia de AxonMarket
                </h3>
                <p className="text-sm text-zinc-600 leading-relaxed font-normal mb-6">
                  Descubre lo mejor que tu ciudad tiene para ofrecer: historias de comercios, ofertas exclusivas y pedidos directos en tu móvil.
                </p>
              </div>

              <div>
                <button 
                  onClick={() => navigate('/explorar')}
                  className="inline-flex items-center gap-2 text-sm font-black text-orange-600 hover:text-orange-700 group-hover:translate-x-1.5 transition-all"
                >
                  <span>Abrir la App</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* SECCIÓN COMERCIAL: ALIANZA LOGÍSTICA OFICIAL CON EN MINUTOS */}
      <section className="py-16 sm:py-24 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-white relative overflow-hidden border-b border-zinc-800">
        {/* Efectos de Iluminación y Patrón Tecnológico */}
        <div className="absolute inset-0 bg-[radial-gradient(#f97316_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-orange-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Columna Izquierda: Mensaje Comercial de la Alianza */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-black tracking-wider uppercase">
                <Zap size={14} className="fill-orange-400 text-orange-400" />
                <span>Alianza Logística Estratégica</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.1]">
                Entregas ultrarrápidas garantizadas con <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400">En Minutos</span>
              </h2>

              <p className="text-sm sm:text-base text-zinc-300 leading-relaxed font-normal max-w-xl">
                En AxonMarket sellamos una alianza estratégica con <strong className="text-white font-bold">En Minutos</strong>, la red de delivery y logística urbana más ágil. Tu tiempo es oro: los pedidos de tus restaurantes, bodegones y tiendas favoritas llegan directo a tu puerta en minutos, con rutas coordinadas por GPS y transportistas verificados.
              </p>

              {/* 3 Métricas Comerciales */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-1">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm hover:border-orange-500/40 transition-colors">
                  <div className="text-xl sm:text-2xl font-black text-amber-400">En Minutos</div>
                  <div className="text-[11px] sm:text-xs text-zinc-400 font-medium mt-0.5">Tiempos récord de despacho</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm hover:border-orange-500/40 transition-colors">
                  <div className="text-sm sm:text-base font-black text-white leading-tight">Maracay • Turmero</div>
                  <div className="text-[11px] sm:text-xs text-zinc-400 font-medium mt-1">Cagua y cobertura regional</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm hover:border-orange-500/40 transition-colors">
                  <div className="text-xl sm:text-2xl font-black text-emerald-400">Garantía</div>
                  <div className="text-[11px] sm:text-xs text-zinc-400 font-medium mt-0.5">Entrega cuidada y protegida</div>
                </div>
              </div>

              {/* Botones de Acción Comercial & Enlace a Instagram Oficial */}
              <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-3.5">
                <button
                  onClick={() => navigate('/explorar')}
                  className="px-6 sm:px-7 py-3.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm shadow-xl active:scale-95 transition-all inline-flex items-center gap-2"
                  style={{ color: '#ffffff' }}
                >
                  <span>Pedir con Delivery</span>
                  <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => navigate('/comerciantes')}
                  className="px-5 sm:px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/15 text-white border border-white/20 font-bold text-sm backdrop-blur-sm active:scale-95 transition-all inline-flex items-center gap-2"
                  style={{ color: '#ffffff' }}
                >
                  <span>Activar en mi Comercio</span>
                </button>
                <a
                  href="https://www.instagram.com/enminutos.ve"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3.5 rounded-full bg-gradient-to-r from-pink-600/20 to-purple-600/20 hover:from-pink-600/30 hover:to-purple-600/30 text-white border border-pink-500/30 font-bold text-sm backdrop-blur-sm active:scale-95 transition-all inline-flex items-center gap-2"
                  style={{ color: '#ffffff' }}
                >
                  <span>@enminutos.ve</span>
                  <ExternalLink size={14} className="text-pink-300" />
                </a>
              </div>
            </div>

            {/* Columna Derecha: Tarjeta Comercial Visual con el Logotipo Oficial Real */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-md bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 sm:p-8 rounded-3xl border border-orange-500/30 shadow-2xl relative">
                
                {/* Cabecera de la Tarjeta con Logo Insignia Oficial Real de En Minutos */}
                <div className="flex items-center justify-between pb-6 border-b border-white/10">
                  <div className="flex items-center gap-3.5">
                    {/* Logotipo Oficial Real cargado desde /enminutos-logo.png */}
                    <img 
                      src="/enminutos-logo.png" 
                      alt="Logo Oficial En Minutos" 
                      className="w-13 h-13 sm:w-14 sm:h-14 rounded-full shadow-2xl object-cover ring-2 ring-red-500/40 shrink-0" 
                    />
                    <div className="flex flex-col text-left leading-tight">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base sm:text-lg font-black text-white tracking-wide">Delivery En Minutos</span>
                        <span className="text-yellow-400 font-black">⚡</span>
                      </div>
                      <a 
                        href="https://www.instagram.com/enminutos.ve" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs text-amber-400 font-bold hover:underline inline-flex items-center gap-1 mt-0.5"
                      >
                        <span>@enminutos.ve</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-black tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full shrink-0">
                    Aliado Oficial
                  </span>
                </div>

                {/* 3 Puntos Clave de la Alianza */}
                <div className="py-6 space-y-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0 mt-0.5">
                      <Truck size={18} />
                    </div>
                    <div className="text-left">
                      <h4 className="text-sm font-bold text-white">Flota Urbana de Motorizados</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">Riders equipados y listos para recoger de inmediato en el comercio y llevar a tu destino.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                      <Clock size={18} />
                    </div>
                    <div className="text-left">
                      <h4 className="text-sm font-bold text-white">Despachos Express sin Demora</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">Algoritmo inteligente para optimizar rutas de entrega en tu localidad.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                      <ShieldCheck size={18} />
                    </div>
                    <div className="text-left">
                      <h4 className="text-sm font-bold text-white">Sello de Calidad y Confianza</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">"Tu tiempo es oro, nosotros lo cuidamos". Aliados oficiales del comercio regional.</p>
                    </div>
                  </div>
                </div>

                {/* Footer de Tarjeta con Sello Conectado */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
                  <span className="flex items-center gap-1.5 font-semibold text-zinc-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Red Activa en tu Ciudad
                  </span>
                  <span className="text-[11px] text-amber-400 font-black">AxonMarket 🤝 En Minutos</span>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. SECCIONES DESTACADAS EDITORIALES (Estilo DoorDash 1:1) */}
      <section className="py-16 sm:py-24 bg-[#FCF9F6] border-b border-zinc-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20 sm:space-y-28">

          {/* BLOQUE 1: Gastronomía Local */}
          <div className="flex flex-col md:flex-row items-center gap-10 lg:gap-16">
            {/* Banner Gráfico Gastronómico Provisional */}
            <div className="w-full md:w-1/2 h-64 sm:h-80 md:h-96 rounded-3xl overflow-hidden relative shadow-lg bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-red-500/25 border border-orange-200/60 flex items-center justify-center group">
              <div className="absolute inset-0 bg-[radial-gradient(#f97316_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />
              <div className="relative z-10 flex flex-col items-center text-center p-6">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white shadow-xl flex items-center justify-center text-orange-600 mb-4 group-hover:scale-110 transition-transform">
                  <Flame size={48} className="stroke-[2.2]" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-orange-700 bg-orange-100/90 px-3 py-1 rounded-full mb-2">
                  Gastronomía Local
                </span>
                <p className="text-xs sm:text-sm font-semibold text-zinc-600 max-w-xs">
                  Pizzas, sushi, hamburguesas, comida china y sabores caseros
                </p>
              </div>
            </div>

            {/* Contenido Editorial */}
            <div className="w-full md:w-1/2 text-left">
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-zinc-950 tracking-tight leading-[1.1] mb-4">
                Todo lo que se te antoja, entregado a domicilio.
              </h2>
              <h3 className="text-base sm:text-xl font-bold text-zinc-800 mb-3">
                Tus restaurantes locales favoritos
              </h3>
              <p className="text-sm sm:text-base text-zinc-600 leading-relaxed font-normal mb-8 max-w-lg">
                Pide a domicilio una porción de pizza crujiente o una hamburguesa gourmet, o disfruta de los platos de comida casera y restaurantes que tanto has querido probar en tu ciudad.
              </p>
              <button 
                onClick={() => navigate('/explorar', { state: { category: 'Comida' } })}
                className="bg-orange-500 hover:bg-orange-600 text-white font-black text-sm sm:text-base px-8 py-3.5 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 inline-flex items-center gap-2"
                style={{ color: '#ffffff' }}
              >
                <span>Buscar restaurantes</span>
              </button>
            </div>
          </div>

          {/* BLOQUE 2: AxonPass (Invertido en Desktop) */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-10 lg:gap-16">
            {/* Banner Gráfico AxonPass Provisional */}
            <div className="w-full md:w-1/2 min-h-[250px] sm:min-h-[280px] md:h-96 rounded-3xl overflow-hidden relative shadow-xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-amber-950 border border-amber-500/30 flex items-center justify-center p-6 group">
              <div className="absolute inset-0 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:20px_20px] opacity-15" />
              {/* Tarjeta AxonPass Compacta y Proporcionada */}
              <div className="relative z-10 w-full max-w-[300px] sm:max-w-xs rounded-2xl bg-gradient-to-br from-zinc-900/95 to-zinc-950/95 p-5 sm:p-6 border border-amber-400/40 shadow-2xl backdrop-blur-md group-hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-2 mb-6">
                  <img src="/axonmarket-logo-icon.png" alt="" className="w-7 h-7 rounded-lg shadow-sm" />
                  <span className="font-black text-lg tracking-wider text-white">AXON<span className="text-amber-400">PASS</span></span>
                </div>
                <div className="space-y-1 mb-6">
                  <div className="text-[11px] uppercase font-bold text-zinc-400 tracking-wider">Beneficios Exclusivos</div>
                  <div className="text-lg sm:text-xl font-black text-amber-300 tracking-tight leading-snug">Entregas Preferenciales & Ahorro</div>
                </div>
                <div className="text-xs text-zinc-400 pt-3 border-t border-white/10 font-medium">
                  <span>Prueba gratuita 30 días</span>
                </div>
              </div>
            </div>

            {/* Contenido Editorial */}
            <div className="w-full md:w-1/2 text-left">
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-zinc-950 tracking-tight leading-[1.1] mb-4">
                AxonPass es entrega a domicilio por menos dinero.
              </h2>
              <p className="text-sm sm:text-base text-zinc-600 leading-relaxed font-normal mb-8 max-w-lg">
                Los miembros obtienen entregas con tarifa preferencial en pedidos de AxonPass, descuentos especiales en pedidos para recoger en tienda y promociones especiales. Además, pruébalo gratis durante 30 días.
              </p>
              <button 
                onClick={() => navigate('/explorar', { state: { openAxonPass: true } })}
                className="bg-orange-500 hover:bg-orange-600 text-white font-black text-sm sm:text-base px-8 py-3.5 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 inline-flex items-center gap-2"
                style={{ color: '#ffffff' }}
              >
                <span>Obtener AxonPass</span>
              </button>
            </div>
          </div>

          {/* BLOQUE 3: Tiendas de Conveniencia & Bodegones */}
          <div className="flex flex-col md:flex-row items-center gap-10 lg:gap-16">
            {/* Banner Gráfico Tiendas / Bodegones Provisional */}
            <div className="w-full md:w-1/2 h-64 sm:h-80 md:h-96 rounded-3xl overflow-hidden relative shadow-lg bg-gradient-to-br from-emerald-500/15 via-teal-500/20 to-amber-500/20 border border-teal-200/60 flex items-center justify-center group">
              <div className="absolute inset-0 bg-[radial-gradient(#14b8a6_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
              <div className="relative z-10 flex flex-col items-center text-center p-6">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white shadow-xl flex items-center justify-center text-teal-600 mb-4 group-hover:scale-110 transition-transform">
                  <Store size={48} className="stroke-[2.2]" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-teal-800 bg-teal-100/90 px-3 py-1 rounded-full mb-2">
                  Bodegones & Farmacias
                </span>
                <p className="text-xs sm:text-sm font-semibold text-zinc-600 max-w-xs">
                  Snacks, víveres, artículos del hogar y farmacia a domicilio
                </p>
              </div>
            </div>

            {/* Contenido Editorial */}
            <div className="w-full md:w-1/2 text-left">
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-zinc-950 tracking-tight leading-[1.1] mb-4">
                Tiendas de conveniencia a la puerta de su casa
              </h2>
              <p className="text-sm sm:text-base text-zinc-600 leading-relaxed font-normal mb-8 max-w-lg">
                Abastece tu despensa con snacks, artículos básicos para el hogar, dulces, bebidas o medicamentos esenciales; todo entregado de forma rápida y directa en tu domicilio.
              </p>
              <button 
                onClick={() => navigate('/explorar', { state: { category: 'Víveres' } })}
                className="bg-orange-500 hover:bg-orange-600 text-white font-black text-sm sm:text-base px-8 py-3.5 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 inline-flex items-center gap-2"
                style={{ color: '#ffffff' }}
              >
                <span>Comprar ahora</span>
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* 6. EXPLORACIÓN RÁPIDA: CATEGORÍAS POPULARES */}
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
                ✓ Comercios locales verificados • Entregas rápidas y seguras
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
                  <button onClick={() => navigate('/comerciantes')} className="hover:text-amber-400 transition-colors">
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
