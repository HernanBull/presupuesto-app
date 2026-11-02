import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, Store, Smartphone, ArrowRight, 
  ShieldCheck, Clock, Truck, ExternalLink, CheckCircle2
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import { 
  DeliveryRiderIllustration, 
  MerchantStoreIllustration, 
  MobileAppIllustration 
} from '../components/LandingIllustrations';
import MerchantTrialAuthModal from '../components/MerchantTrialAuthModal';

export default function WelcomeLanding() {
  const navigate = useNavigate();
  const [showMerchantTrialModal, setShowMerchantTrialModal] = useState(false);
  const [merchantTrialInitialMode, setMerchantTrialInitialMode] = useState('register');

  // Redirección inmediata si es comerciante o app instalada
  useEffect(() => {
    const isMerchant = localStorage.getItem('activeWorkspace');
    const isMerchantApp = localStorage.getItem('is_merchant_app') === 'true';
    const isStandalone = typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true
    );

    if (isMerchant) {
      navigate('/dashboard', { replace: true });
    } else if (isStandalone || isMerchantApp) {
      navigate('/merchant/login', { replace: true });
    }
  }, [navigate]);

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

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-white text-zinc-900 font-sans selection:bg-amber-500 selection:text-zinc-950 flex flex-col">
      
      {/* 1. HERO SECTION (Limpio y enfocado: máxima visibilidad a la foto de fondo) */}
      <section 
        className="axon-hero-pure-white relative overflow-hidden text-white flex flex-col justify-between min-h-[580px] sm:min-h-[640px] md:min-h-[680px] px-4 sm:px-6 pt-6 pb-24 sm:pb-32 md:pb-40"
        style={{
          background: 'linear-gradient(rgba(0, 0, 0, 0.52), rgba(0, 0, 0, 0.72)), url(/landing-hero.jpg) center center / cover no-repeat',
        }}
      >
        {/* Espacio superior limpio (sin botones para dar total foco a la marca) */}
        <div className="max-w-6xl mx-auto w-full h-4 sm:h-6 relative z-20" />

        {/* Contenido Central: Logo, Titular Comercial, Único Botón "Abrir aplicación", Tasa BCV */}
        <div className="max-w-2xl mx-auto w-full text-center flex flex-col items-center justify-center my-auto py-4 relative z-20">
          
          {/* Logo Central de Marca Elegante y Translúcido */}
          <div className="inline-flex items-center gap-3 mb-5 px-5 py-2.5 rounded-full bg-black/35 backdrop-blur-md shadow-2xl border border-white/20 select-none">
            <img 
              src="/axonmarket-logo-icon.png" 
              alt="AxonMarket" 
              className="w-8 h-8 rounded-xl shadow-sm object-contain" 
            />
            <span className="text-xl sm:text-2xl font-black tracking-wider flex items-center drop-shadow-md">
              <span className="axon-logo-white">AXON</span>
              <span className="axon-logo-gold ml-0.5">MARKET</span>
            </span>
          </div>

          {/* Gran Titular Comercial en Blanco Puro */}
          <h1 
            className="hero-white-title text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight leading-[1.08] mb-3"
          >
            TODO LO QUE TE GUSTA, DIRECTO A TU PUERTA
          </h1>
          
          {/* Subtítulo Comercial */}
          <p className="hero-white-title text-sm sm:text-base font-semibold mb-8 max-w-lg">
            Tus tiendas, restaurantes y bodegones favoritos en un solo lugar
          </p>

          {/* Único Botón Principal: Abrir aplicación */}
          <div className="w-full max-w-sm flex items-center justify-center mb-6">
            <button 
              onClick={() => navigate('/explorar')}
              className="w-full py-4 px-8 font-black text-base sm:text-lg rounded-full shadow-2xl active:scale-95 transition-all text-center bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white border border-white/30 cursor-pointer flex items-center justify-center gap-2 group"
              style={{ color: '#ffffff' }}
            >
              <span>Abrir aplicación</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Tasa Oficial BCV en el Hero */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-black/45 backdrop-blur-md border border-white/20 text-xs font-semibold text-white shadow-xl">
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

        {/* Separador Vectorial Ondulado hacia el Fondo Blanco */}
        <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-none z-10 pointer-events-none">
          <svg 
            viewBox="0 0 1440 280" 
            preserveAspectRatio="none" 
            className="relative block w-full h-20 sm:h-28 md:h-36 lg:h-44"
          >
            <path 
              d="M0,160 C320,240 420,60 740,140 C1060,220 1200,80 1440,130 L1440,280 L0,280 Z" 
              fill="#ffffff" 
              fillOpacity="0.3" 
            />
            <path 
              d="M0,190 C260,110 520,220 820,130 C1120,40 1300,180 1440,150 L1440,280 L0,280 Z" 
              fill="#ffffff" 
              fillOpacity="0.5" 
            />
            <path 
              d="M0,130 C280,210 460,70 760,150 C1060,230 1260,60 1440,120 L1440,280 L0,280 Z" 
              fill="#ffffff" 
            />
          </svg>
        </div>

      </section>

      {/* 2. TRES PILARES DE SERVICIOS (Ecosistema Integral) */}
      <section className="py-16 sm:py-24 bg-white border-b border-zinc-200/80">
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
            
            {/* CARD 1: Conviértete en Repartidor */}
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
                  className="inline-flex items-center gap-2 text-sm font-black text-orange-600 hover:text-orange-700 group-hover:translate-x-1.5 transition-all mb-4 cursor-pointer"
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

            {/* CARD 2: Conviértete en comerciante (Con botón "Prueba gratis 7 días" y badges) */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/80 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="mb-6 flex items-center justify-start group-hover:scale-105 transition-transform origin-left">
                  <MerchantStoreIllustration className="w-28 h-28" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight mb-3">
                  Conviértete en comerciante
                </h3>
                <p className="text-sm text-zinc-600 leading-relaxed font-normal mb-4">
                  Atrae nuevos clientes y multiplica tus ventas en línea. Publica tu catálogo digital y haz crecer tu negocio en tu comunidad.
                </p>

                {/* Chips de Beneficios Comerciales Reubicados */}
                <div className="flex flex-wrap items-center gap-2 mb-6">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-zinc-800 text-[11px] font-bold shadow-2xs border border-slate-200/60">
                    <CheckCircle2 size={13} className="text-blue-600 stroke-[2.5]" />
                    <span>Plan gratis para empezar</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-zinc-800 text-[11px] font-bold shadow-2xs border border-slate-200/60">
                    <CheckCircle2 size={13} className="text-blue-600 stroke-[2.5]" />
                    <span>Sin tarjeta</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-zinc-800 text-[11px] font-bold shadow-2xs border border-slate-200/60">
                    <CheckCircle2 size={13} className="text-blue-600 stroke-[2.5]" />
                    <span>0% de comisión por venta</span>
                  </div>
                </div>
              </div>

              <div>
                <button 
                  onClick={() => navigate('/probar-gratis')}
                  className="w-full py-3.5 px-6 font-black text-sm rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer group"
                >
                  <span>Prueba gratis 7 días</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* CARD 3: Obtén la mejor experiencia de AxonMarket */}
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
                  className="inline-flex items-center gap-2 text-sm font-black text-orange-600 hover:text-orange-700 group-hover:translate-x-1.5 transition-all cursor-pointer"
                >
                  <span>Abrir la App</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 3. SECCIÓN LOGÍSTICA: EN MINUTOS (TARJETA CENTRADA - TEMA BLANCO Y NARANJA) */}
      <section className="py-12 sm:py-16 bg-gradient-to-b from-white via-orange-50/25 to-white relative overflow-hidden border-b border-orange-100/70">
        <div className="absolute inset-0 bg-[radial-gradient(#f97316_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-orange-400/10 blur-3xl pointer-events-none" />

        <div className="max-w-md mx-auto px-4 sm:px-6 relative z-10 flex justify-center">
          <div className="w-full bg-white p-6 sm:p-8 rounded-3xl border border-orange-200/90 shadow-xl shadow-orange-500/5 relative hover:border-orange-300 transition-all">
            
            {/* Cabecera con Logo Insignia Oficial En Minutos */}
            <div className="flex items-center gap-3.5 pb-6 border-b border-orange-100/80">
              <img 
                src="/enminutos-logo.png" 
                alt="Logo Oficial En Minutos" 
                className="w-13 h-13 sm:w-14 sm:h-14 rounded-full shadow-md object-cover ring-2 ring-orange-500/25 shrink-0" 
              />
              <div className="flex flex-col text-left leading-tight">
                <span className="text-base sm:text-lg font-black text-zinc-950 tracking-wide">Delivery En Minutos</span>
                <a 
                  href="https://www.instagram.com/enminutos.ve" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs text-orange-600 font-bold hover:underline inline-flex items-center gap-1 mt-0.5 hover:text-orange-700 transition-colors"
                >
                  <span>@enminutos.ve</span>
                  <ExternalLink size={11} />
                </a>
              </div>
            </div>

            {/* 3 Puntos Clave de la Alianza */}
            <div className="py-6 space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200/70 flex items-center justify-center text-orange-600 shrink-0 mt-0.5 shadow-2xs">
                  <Truck size={18} />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-bold text-zinc-900">Flota Urbana de Motorizados</h4>
                  <p className="text-xs text-zinc-500 leading-relaxed">Riders equipados y listos para recoger de inmediato en el comercio y llevar a tu destino.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200/70 flex items-center justify-center text-orange-600 shrink-0 mt-0.5 shadow-2xs">
                  <Clock size={18} />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-bold text-zinc-900">Despachos Express sin Demora</h4>
                  <p className="text-xs text-zinc-500 leading-relaxed">Algoritmo inteligente para optimizar rutas de entrega en tu localidad.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200/70 flex items-center justify-center text-orange-600 shrink-0 mt-0.5 shadow-2xs">
                  <ShieldCheck size={18} />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-bold text-zinc-900">Sello de Calidad y Confianza</h4>
                  <p className="text-xs text-zinc-500 leading-relaxed">"Tu tiempo es oro, nosotros lo cuidamos". Aliados oficiales del comercio regional.</p>
                </div>
              </div>
            </div>

            {/* Footer de Tarjeta Centrado en Naranja */}
            <div className="pt-4 border-t border-orange-100/80 flex items-center justify-center text-xs">
              <span className="text-xs sm:text-sm text-orange-600 font-black tracking-wide">
                AxonMarket 🤝 En Minutos
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* 4. FOOTER PROFESIONAL AXONMARKET */}
      <footer className="bg-white text-zinc-600 text-xs pt-16 pb-12 mt-auto border-t border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 pb-12 border-b border-zinc-200">
            
            {/* Columna Marca */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-zinc-950 font-black">
                  <ShoppingBag size={18} className="stroke-[2.5]" />
                </div>
                <span className="text-base font-black tracking-wider text-zinc-950" style={{ color: '#09090b' }}>
                  AXON<span className="text-amber-500">MARKET</span>
                </span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                La plataforma de comercio y delivery local más rápida, moderna y transparente de Venezuela.
              </p>
              <div className="text-[11px] text-amber-600 font-bold">
                ✓ Comercios locales verificados • Entregas rápidas y seguras
              </div>
            </div>

            {/* Columna Clientes */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 mb-3" style={{ color: '#18181b' }}>
                Para Clientes
              </h4>
              <ul className="space-y-2 text-zinc-600">
                <li>
                  <button onClick={() => navigate('/explorar')} className="hover:text-amber-600 transition-colors">
                    Explorar Comercios
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/mapa')} className="hover:text-amber-600 transition-colors">
                    Mapa de Tiendas
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/chats')} className="hover:text-amber-600 transition-colors">
                    Mis Pedidos & Chats
                  </button>
                </li>
              </ul>
            </div>

            {/* Columna Comercios & Delivery */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 mb-3" style={{ color: '#18181b' }}>
                Aliados & Negocios
              </h4>
              <ul className="space-y-2 text-zinc-600">
                <li>
                  <button 
                    onClick={() => {
                      setMerchantTrialInitialMode('register');
                      setShowMerchantTrialModal(true);
                    }} 
                    className="hover:text-amber-600 transition-colors cursor-pointer font-medium"
                  >
                    Registrar mi Comercio (7 días gratis)
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/delivery')} className="hover:text-amber-600 transition-colors">
                    Ser Repartidor Delivery
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate('/merchant/login')} 
                    className="hover:text-amber-600 transition-colors cursor-pointer font-bold text-amber-700"
                  >
                    Portal Comerciante (Iniciar sesión)
                  </button>
                </li>
              </ul>
            </div>

            {/* Columna Legal & Ayuda */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 mb-3" style={{ color: '#18181b' }}>
                Legal & Soporte
              </h4>
              <ul className="space-y-2 text-zinc-600">
                <li>
                  <button onClick={() => navigate('/legal/terminos')} className="hover:text-amber-600 transition-colors">
                    Términos y Condiciones
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/legal/privacidad')} className="hover:text-amber-600 transition-colors">
                    Política de Privacidad
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/legal/aviso')} className="hover:text-amber-600 transition-colors">
                    Aviso Legal
                  </button>
                </li>
                <li>
                  <a 
                    href="https://wa.me/584243606289?text=Hola,%20deseo%20asistencia%20en%20AxonMarket" 
                    target="_blank" 
                    rel="noreferrer"
                    className="hover:text-amber-600 transition-colors inline-flex items-center gap-1 text-zinc-700 font-semibold"
                  >
                    <span>Soporte WhatsApp</span>
                    <ExternalLink size={12} />
                  </a>
                </li>
              </ul>
            </div>

          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500 gap-3">
            <p>© {new Date().getFullYear()} AxonMarket · Emprendimiento Hernan Perdomo · RIF J-508056124. Todos los derechos reservados.</p>
            <p>Hecho con pasión para el comercio venezolano 🇻🇪</p>
          </div>

        </div>
      </footer>

      {/* Modal de Registro / Prueba Gratis si se activa */}
      {showMerchantTrialModal && (
        <MerchantTrialAuthModal
          isOpen={showMerchantTrialModal}
          initialMode={merchantTrialInitialMode}
          onClose={() => setShowMerchantTrialModal(false)}
        />
      )}
    </div>
  );
}
