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

        {/* Contenido Central (Limpio y Organizado: Logo, Titular Comercial, 1 Botón, 1 Buscador, 1 Enlace) */}
        <div className="max-w-2xl mx-auto w-full text-center flex flex-col items-center justify-center my-auto py-6 relative z-20">
          
          {/* Logo Central de Marca Elegante y Translúcido (Combina con el Fondo) */}
          <div className="inline-flex items-center gap-3 mb-5 px-5 py-2.5 rounded-full bg-black/30 backdrop-blur-md shadow-2xl border border-white/20 select-none">
            {/* Caja / Icono en dorado con transparencia */}
            <div className="w-9 h-9 rounded-xl bg-amber-500/25 backdrop-blur-sm border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-sm">
              <ShoppingBag size={20} className="stroke-[2.5]" />
            </div>
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
                  Atrae nuevos clientes y multiplica tus ventas. Publica tu catálogo digital en línea y haz crecer tu negocio en tu comunidad.
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
