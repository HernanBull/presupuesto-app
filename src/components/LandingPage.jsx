import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Box, BarChart, ShoppingBag, 
  Users, LogIn, ChevronRight, Truck,
  Settings, Smartphone, LineChart, Globe, Zap,
  Tags, Store, Database, Menu, X, CheckCircle2,
  Cpu, LayoutDashboard, Fingerprint
} from 'lucide-react';
import logoAxon from '../logo/logo-sin-fondo.png';
import guiaImg from '../logo/guia.png';
import { VirtualMascot } from './VirtualMascot';

// --- Ultra Premium Subcomponents ---

const GlowingOrb = ({ color, size, top, left, delay, duration }) => (
  <motion.div
    className={`absolute rounded-full blur-[120px] pointer-events-none opacity-20 mix-blend-screen ${color}`}
    style={{ width: size, height: size, top, left }}
    animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.3, 0.1], x: [0, 40, -40, 0], y: [0, -50, 30, 0] }}
    transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
  />
);

const SpotlightCard = ({ title, description, icon: Icon, span = 1, delay = 0, onClick }) => {
  const divRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <motion.div
      ref={divRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`group relative rounded-[2rem] bg-transparent p-8 overflow-hidden cursor-pointer transition-all duration-500 hover:bg-zinc-900/20 ${span === 2 ? 'md:col-span-2' : ''}`}
    >
      <div 
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(245,158,11,0.15), transparent 40%)`,
        }}
      />
      {/* Removed static gradient overlay to ensure perfect transparency */}
      
      <div className="relative z-10 h-full flex flex-col">
        <div className="mb-8 p-4 bg-zinc-950/50 backdrop-blur-md rounded-2xl w-fit border border-white/10 group-hover:border-amber-500/50 group-hover:shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all duration-500">
          <Icon size={32} className="text-zinc-300 group-hover:text-amber-500 transition-colors duration-500" />
        </div>
        <h3 className="text-3xl font-light tracking-tight text-white mb-4 group-hover:text-amber-400 transition-colors">{title}</h3>
        <p className="text-zinc-400 font-light leading-relaxed flex-grow text-lg">{description}</p>
        <div className="mt-8 flex items-center gap-2 text-amber-500 text-sm font-bold tracking-[0.2em] uppercase opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500">
          Explorar Módulo <ArrowRight size={16} className="ml-1" />
        </div>
      </div>
    </motion.div>
  );
};

// --- Animations ---


const ToolSelectorAnimation = () => {
  const [activeTool, setActiveTool] = useState(0);

  const tools = [
    { icon: Settings, label: "ERP Core", angle: 0 },
    { icon: Store, label: "POS", angle: Math.PI / 3 },
    { icon: Box, label: "WMS", angle: (2 * Math.PI) / 3 },
    { icon: Users, label: "CRM", angle: Math.PI },
    { icon: Truck, label: "Delivery", angle: (4 * Math.PI) / 3 },
    { icon: LineChart, label: "Analítica", angle: (5 * Math.PI) / 3 },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTool((prev) => (prev + 1) % tools.length);
    }, 2500); 
    return () => clearInterval(interval);
  }, [tools.length]);

  return (
    <div className="relative w-full h-[400px] sm:h-[700px] flex items-center justify-center my-16 overflow-hidden">
      <style>{`
        @keyframes flow {
          to { stroke-dashoffset: -20; }
        }
      `}</style>
      
      {/* Holographic Rings */}
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 100, repeat: Infinity, ease: "linear" }} className="absolute w-[300px] h-[300px] sm:w-[600px] sm:h-[600px] border border-white/5 rounded-full border-dashed opacity-50 z-0"></motion.div>
      <motion.div animate={{ rotate: -360 }} transition={{ duration: 120, repeat: Infinity, ease: "linear" }} className="absolute w-[200px] h-[200px] sm:w-[400px] sm:h-[400px] border border-amber-500/10 rounded-full opacity-50 z-0" style={{ borderStyle: 'dotted' }}></motion.div>

      {/* Robot Center */}
      <motion.div 
        animate={{ y: [-15, 15, -15] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-30"
      >
        {/* Strong Spotlight under robot */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 w-48 h-8 bg-amber-500/40 blur-[20px] rounded-[100%]"></div>
        <img 
          src={guiaImg} 
          alt="Axon Robot Guide" 
          className="w-48 h-48 sm:w-80 sm:h-80 object-contain drop-shadow-[0_30px_50px_rgba(0,0,0,0.9)]" 
        />
        {/* Subtle Glow when choosing */}
        <div className="absolute inset-0 bg-amber-500/20 blur-[60px] rounded-full mix-blend-screen -z-10 animate-pulse"></div>
      </motion.div>

      {/* Animated Circular Tools */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
      >
        {tools.map((tool, i) => {
           const isActive = activeTool === i;
           return (
             <div 
               key={i}
               className="absolute pointer-events-auto transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
               style={{ transform: `translate(calc(${Math.cos(tool.angle)} * clamp(130px, 25vw, 280px)), calc(${Math.sin(tool.angle)} * clamp(130px, 25vw, 280px)))` }}
             >
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                >
                  {/* Tool Icon Card */}
                  <div 
                    onClick={() => setActiveTool(i)}
                    className={`w-14 h-14 sm:w-20 sm:h-20 backdrop-blur-2xl rounded-2xl flex flex-col items-center justify-center transition-all duration-500 cursor-pointer relative overflow-hidden ${isActive ? 'bg-amber-500/10 border-amber-400 shadow-[0_0_50px_rgba(245,158,11,0.6)] scale-125 border-[1.5px]' : 'bg-zinc-950/40 border-white/5 shadow-2xl border scale-90 hover:scale-105 hover:border-white/30 hover:bg-zinc-900/60'}`}
                  >
                    {isActive && <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/30 to-transparent animate-pulse"></div>}
                    <tool.icon size={26} className={`transition-all duration-500 relative z-10 ${isActive ? 'text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,1)] scale-110' : 'text-zinc-500'}`} />
                    <span className={`text-[10px] sm:text-[11px] font-black tracking-[0.2em] uppercase transition-opacity duration-500 absolute -bottom-8 whitespace-nowrap ${isActive ? 'text-amber-500 opacity-100 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]' : 'text-zinc-600 opacity-0'}`}>{tool.label}</span>
                  </div>
                </motion.div>
             </div>
           );
        })}
      </motion.div>
    </div>
  );
};

// --- VIEWS ---

const HERO_PHRASES = [
  { p: "Operación ", s: "Absoluta." },
  { p: "Gestión ", s: "Inteligente." },
  { p: "Expansión ", s: "Sin Límites." },
  { p: "Control ", s: "Total." }
];

const HomeView = ({ onNavigate }) => {
  const { scrollYProgress } = useScroll();
  const [typedText, setTypedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let charIndex = 0;
    let phraseIdx = 0;
    let isDeleting = false;
    let timeoutId;

    const loop = () => {
      const currentFull = HERO_PHRASES[phraseIdx].p + HERO_PHRASES[phraseIdx].s;
      setTypedText(currentFull.substring(0, charIndex));
      setCurrentIndex(phraseIdx);

      let nextDelay = 0;

      if (!isDeleting) {
        // Typing: Slower speed (random between 100ms and 180ms)
        nextDelay = Math.random() * 80 + 100;
        charIndex++;
        
        // When finished typing, pause before deleting
        if (charIndex > currentFull.length) {
          isDeleting = true;
          nextDelay = 3000; // 3 seconds pause
        }
      } else {
        // Deleting: Faster speed (random between 30ms and 60ms)
        nextDelay = Math.random() * 30 + 30;
        charIndex--;
        
        // When finished deleting, switch to next phrase and pause before typing again
        if (charIndex === 0) {
          isDeleting = false;
          phraseIdx = (phraseIdx + 1) % HERO_PHRASES.length;
          nextDelay = 500; // 0.5 seconds pause
        }
      }

      timeoutId = setTimeout(loop, nextDelay);
    };

    // Initial delay before typing starts
    timeoutId = setTimeout(loop, 400);

    return () => clearTimeout(timeoutId);
  }, []);

  const currentPhrase = HERO_PHRASES[currentIndex];
  const prefixLen = currentPhrase.p.length;
  
  const part1 = typedText.substring(0, prefixLen - 1);
  const part2 = typedText.length > prefixLen ? typedText.substring(prefixLen) : "";
  const showBr = typedText.length >= prefixLen;

  const techs = [
    { name: "ERP", icon: Settings }, { name: "POS", icon: Store },
    { name: "WMS", icon: Box }, { name: "SCM", icon: Globe },
    { name: "PIM", icon: Tags }, { name: "CRM", icon: Users },
    { name: "BI", icon: LineChart }, { name: "Delivery", icon: Truck },
    { name: "E-Commerce", icon: ShoppingBag },
  ];

  return (
    <>
      <motion.section 
        className="min-h-screen flex flex-col lg:flex-row items-center justify-center lg:justify-between pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-screen-2xl mx-auto text-center lg:text-left relative gap-16 lg:gap-8 overflow-hidden lg:overflow-visible"
      >
        <div className="flex-1 flex flex-col items-center lg:items-start z-10 w-full mt-20 lg:mt-0">
          <h1 className="text-6xl sm:text-8xl lg:text-9xl xl:text-[9rem] font-light tracking-tighter leading-none w-full mix-blend-plus-lighter relative z-20">
            {/* Invisible placeholder to maintain layout height */}
            <div className="opacity-0 pointer-events-none select-none text-white" aria-hidden="true">
              {currentPhrase.p.trim()} <br />
              <span className="font-normal bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 via-amber-200 to-amber-700 leading-normal pb-4 inline-block">{currentPhrase.s}</span>
            </div>
            {/* Actual typing text */}
            <div className="absolute top-0 left-0 w-full h-full text-white flex flex-col items-center lg:items-start">
              <span>
                {part1}
                {!showBr && (
                  <motion.span 
                    animate={{ opacity: [1, 0] }} 
                    transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                    className="inline-block w-[3px] sm:w-[5px] h-[0.75em] bg-amber-500 ml-1 sm:ml-2 align-baseline translate-y-[2px]"
                  />
                )}
              </span>
              {showBr && (
                <span className="font-normal bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 via-amber-200 to-amber-700 leading-normal pb-4 inline-block">
                  {part2}
                  <motion.span 
                    animate={{ opacity: [1, 0] }} 
                    transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                    className="inline-block w-[3px] sm:w-[5px] h-[0.75em] bg-amber-500 ml-1 sm:ml-2 align-baseline translate-y-[2px]"
                  />
                </span>
              )}
            </div>
          </h1>
          
          <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }} className="mt-10 lg:mt-14 text-xl sm:text-2xl lg:text-3xl text-zinc-400 max-w-3xl font-light tracking-wide leading-relaxed">
            El único ecosistema SaaS que sincroniza nativamente tu <strong className="text-white font-normal">ERP, WMS, CRM y Tienda Virtual</strong>. Construido para empresas que escalan sin límites.
          </motion.p>
          
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 0.6, ease: [0.16, 1, 0.3, 1] }} className="mt-12 lg:mt-16 flex gap-6 justify-center lg:justify-start">
            <button onClick={() => {
                window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
              }} 
              className="group relative flex items-center justify-center gap-3 overflow-hidden rounded-full bg-white px-12 py-6 text-sm font-bold tracking-[0.2em] uppercase text-black transition-all hover:scale-105 hover:shadow-[0_0_50px_rgba(255,255,255,0.3)]"
            >
              Descubrir la Plataforma
            </button>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }} 
          className="flex-1 w-full lg:h-[800px] flex items-center justify-center relative -mt-10 lg:mt-0"
        >
          <VirtualMascot />
        </motion.div>
      </motion.section>

      <div className="relative z-20 pt-10">
        {/* Subtle glow transition */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-transparent to-transparent pointer-events-none -mt-40"></div>
        {/* Infinite Marquee */}
        <section className="py-16 border-b border-white/5 overflow-hidden flex items-center relative">
          <div className="absolute left-0 top-0 bottom-0 w-40 bg-gradient-to-r from-[#050505] to-transparent z-10"></div>
          <div className="absolute right-0 top-0 bottom-0 w-40 bg-gradient-to-l from-[#050505] to-transparent z-10"></div>
          <div className="flex w-fit animate-marquee hover:[animation-play-state:paused]">
             {[...techs, ...techs, ...techs].map((tech, i) => (
               <div key={i} className="flex items-center gap-4 mx-12 opacity-30 hover:opacity-100 transition-opacity duration-300 grayscale hover:grayscale-0">
                  <tech.icon size={32} className="text-amber-500" />
                  <span className="text-2xl font-bold tracking-[0.2em] uppercase text-white">{tech.name}</span>
               </div>
             ))}
          </div>
        </section>

        {/* Bento Grid */}
        <section className="py-40 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto relative">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} className="mb-8 text-center">
            <h2 className="text-xs font-bold tracking-[0.4em] uppercase text-amber-500 mb-6">Arquitectura Modular</h2>
            <p className="text-5xl sm:text-7xl font-light text-white max-w-4xl mx-auto leading-tight">Control maestro sobre cada <span className="font-normal text-zinc-500">milisegundo</span> de tu operación.</p>
          </motion.div>
          
          <ToolSelectorAnimation />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <SpotlightCard onClick={() => onNavigate('features')} span={2} delay={0.1} icon={ShoppingBag} title="Omnicanalidad & E-Commerce" description="Motor de ventas B2B/B2C. Tienda virtual nativa conectada instantáneamente a tu inventario físico y puntos de venta (POS) en tiempo real." />
            <SpotlightCard onClick={() => onNavigate('features')} delay={0.2} icon={Settings} title="ERP Core" description="El cerebro financiero. Gestión automatizada de nóminas, cuentas por cobrar, facturación electrónica e impuestos." />
            <SpotlightCard onClick={() => onNavigate('features')} delay={0.3} icon={Box} title="WMS Avanzado" description="Control multibodega, picking guiado por escáner y pronóstico de demanda basado en IA." />
            <SpotlightCard onClick={() => onNavigate('features')} delay={0.4} icon={Users} title="CRM Predictivo" description="Análisis de comportamiento de clientes, automatización de marketing y recuperación de carritos perdidos." />
            <SpotlightCard onClick={() => onNavigate('features')} span={1} delay={0.5} icon={Truck} title="Delivery Automático" description="Asignación algorítmica de repartidores, rutas óptimas y seguimiento GPS en vivo." />
            <SpotlightCard onClick={() => onNavigate('features')} span={1} delay={0.6} icon={LayoutDashboard} title="Business Intelligence" description="Dashboards holográficos de KPIs. Conoce tus ganancias netas al centavo, cada minuto del día." />
          </div>
        </section>

        {/* Massive CTA */}
        <section className="py-32 px-4 relative overflow-hidden">
           <div className="max-w-[1400px] mx-auto bg-zinc-900 border border-white/5 rounded-[4rem] p-16 lg:p-32 text-center relative overflow-hidden shadow-2xl">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.1)_0%,transparent_60%)] pointer-events-none"></div>
             <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} className="relative z-10">
               <Fingerprint size={64} className="mx-auto text-amber-500 mb-10 opacity-50" />
               <h2 className="text-5xl sm:text-7xl font-light text-white mb-10 tracking-tight">El futuro pertenece a los <span className="font-normal text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-600">rápidos.</span></h2>
               <p className="text-zinc-400 text-xl sm:text-2xl mb-16 max-w-3xl mx-auto font-light">Abandona la fragmentación. Centraliza tu empresa en el ecosistema Axon y escala sin fricción técnica.</p>
               <button onClick={() => onNavigate('pricing')} className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-white px-14 py-7 text-sm font-bold tracking-[0.2em] uppercase text-black transition-all hover:scale-105 hover:shadow-[0_0_60px_rgba(255,255,255,0.4)]">
                 Implementar Ahora
               </button>
             </motion.div>
           </div>
        </section>
      </div>
    </>
  );
};

const FeaturesView = () => (
  <div className="pt-40 pb-32 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto min-h-screen">
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} className="text-center mb-32">
      <h1 className="text-6xl sm:text-8xl lg:text-[8rem] font-light text-white mb-8 tracking-tighter">Motor <span className="font-normal text-amber-500">Operativo</span></h1>
      <p className="text-zinc-400 text-2xl max-w-4xl mx-auto font-light leading-relaxed">Arquitectura de microservicios diseñada para soportar volúmenes transaccionales masivos sin degradación de rendimiento.</p>
    </motion.div>

    {[
      { title: "ERP (Enterprise Resource Planning)", desc: "Automatiza tu contabilidad, nómina, finanzas y facturación. Toma el control absoluto de tus ingresos y egresos con reportes automatizados. Integra todas las áreas de tu negocio en una única fuente de verdad.", icon: Settings },
      { title: "POS (Point of Sale) & Tienda Virtual", desc: "Digitaliza tus ventas físicas y online. Crea tu tienda online en minutos, recibe pagos con tarjeta y vende presencialmente usando el mismo catálogo de productos.", icon: Store },
      { title: "WMS & SCM (Almacenes y Logística)", desc: "Gestiona múltiples bodegas, controla el nivel de stock mínimo, escanea códigos de barras y automatiza las órdenes de compra con proveedores.", icon: Box },
      { title: "CRM (Customer Relationship Management)", desc: "Centraliza la base de datos de tus clientes. Revisa historiales de compras, asigna etiquetas de fidelización, envía correos masivos y recupera carritos abandonados.", icon: Users },
      { 
        title: "Delivery & Routing Integrado", 
        desc: "Sincronización integral de e-commerce, depósitos y transporte. Control absoluto de la última milla logística de tu negocio.", 
        icon: Truck,
        bullets: [
          "Gestión unificada de pedidos (OMS)",
          "Control y optimización de picking con herramientas de escaneo",
          "Diseño automático de rutas inteligentes y asignación de repartidores",
          "Optimización y coordinación de flotas de vehículos",
          "Monitoreo de envíos en tiempo real con notificaciones al comprador",
          "Planificación independiente de rutas para repartidores (App Deri Go)"
        ]
      }
    ].map((feat, idx) => (
      <motion.div 
        key={idx}
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-150px" }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className={`flex flex-col lg:flex-row items-center gap-16 mb-40 ${idx % 2 !== 0 ? 'lg:flex-row-reverse' : ''}`}
      >
        <div className="flex-1 lg:max-w-xl">
          <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-8 backdrop-blur-md shadow-2xl">
            <feat.icon size={40} className="text-amber-500" />
          </div>
          <h2 className="text-4xl sm:text-5xl font-light text-white mb-8 tracking-tight">{feat.title}</h2>
          <p className="text-zinc-400 text-xl leading-relaxed font-light">{feat.desc}</p>
          
          {feat.bullets && (
            <ul className="mt-10 space-y-5">
              {feat.bullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-4">
                  <CheckCircle2 size={24} className="text-amber-500 mt-1 flex-shrink-0 opacity-70" />
                  <span className="text-zinc-300 font-light text-lg">{bullet}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex-1 w-full relative">
          <div className="aspect-[4/3] rounded-[3rem] bg-zinc-900 border border-white/10 shadow-2xl overflow-hidden relative group">
             {/* Glowing BG effect behind UI */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-amber-500/20 blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
            
            {/* Abstract Premium UI representation */}
            <div className="absolute inset-0 p-8 flex flex-col gap-6 opacity-60 group-hover:opacity-100 transition-all duration-700 scale-95 group-hover:scale-100">
              <div className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm"></div>
              <div className="flex gap-6 flex-1">
                <div className="w-1/3 h-full bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm"></div>
                <div className="w-2/3 flex flex-col gap-6">
                   <div className="w-full h-1/2 bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-2xl backdrop-blur-sm"></div>
                   <div className="w-full h-1/2 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm flex items-end p-4">
                     {/* Fake bar chart */}
                     <div className="flex gap-2 w-full h-full items-end">
                       {[40, 70, 30, 90, 50, 100, 60].map((h, i) => (
                         <motion.div key={i} initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.5 + i * 0.1 }} className="flex-1 bg-amber-500/50 rounded-t-sm"></motion.div>
                       ))}
                     </div>
                   </div>
                </div>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80"></div>
          </div>
        </div>
      </motion.div>
    ))}
  </div>
);

const PricingView = () => (
  <div className="pt-40 pb-32 px-4 sm:px-6 lg:px-8 max-w-[1400px] mx-auto min-h-screen">
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} className="text-center mb-32">
      <h1 className="text-6xl sm:text-8xl font-light text-white mb-8 tracking-tighter">Inversión <span className="font-normal text-amber-500">Inteligente</span></h1>
      <p className="text-zinc-400 text-2xl max-w-3xl mx-auto font-light leading-relaxed">Estructura de precios transparente para acompañar el crecimiento de tu operación sin costos ocultos.</p>
    </motion.div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
      {[
        { name: "Starter", price: "$49", desc: "Para negocios emergentes digitalizando su operación.", feats: ["Tienda Virtual Básica", "POS (1 Caja)", "Inventario Simple", "Soporte por Email"] },
        { name: "Pro", price: "$149", desc: "La solución completa para empresas en expansión.", feats: ["ERP y CRM Completo", "POS (Cajas Ilimitadas)", "WMS Multibodega", "Delivery Integrado", "Soporte Prioritario"], highlight: true },
        { name: "Enterprise", price: "Custom", desc: "Infraestructura dedicada para volúmenes masivos.", feats: ["APIs y Webhooks", "Infraestructura Dedicada", "BI y Reportes Custom", "Onboarding Presencial", "Soporte 24/7 Telefónico"] }
      ].map((plan, idx) => (
        <motion.div 
          key={idx} 
          initial={{ opacity: 0, y: 40 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 1, delay: idx * 0.2, ease: [0.16, 1, 0.3, 1] }} 
          className={`relative rounded-[3rem] p-10 lg:p-14 flex flex-col backdrop-blur-2xl transition-all duration-500 hover:-translate-y-4 ${
            plan.highlight 
            ? 'bg-amber-500 text-black shadow-[0_20px_80px_rgba(245,158,11,0.3)] md:scale-105 z-10' 
            : 'bg-zinc-900/50 border border-white/5 text-white hover:border-white/20 hover:bg-zinc-900'
          }`}
        >
          {plan.highlight && <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-black text-amber-500 text-xs font-bold tracking-[0.2em] uppercase px-6 py-2.5 rounded-full border border-amber-500/50 shadow-xl">Más Popular</div>}
          <h3 className={`text-3xl font-light mb-4 ${plan.highlight ? 'text-black' : 'text-white'}`}>{plan.name}</h3>
          <p className={`text-base mb-10 h-12 ${plan.highlight ? 'text-black/70' : 'text-zinc-400'}`}>{plan.desc}</p>
          <div className="mb-12 border-b border-current pb-8 opacity-20"></div>
          <div className="mb-12">
            <span className="text-7xl font-light tracking-tighter">{plan.price}</span>
            {plan.price !== 'Custom' && <span className={`text-xl ${plan.highlight ? 'text-black/70' : 'text-zinc-500'}`}>/mes</span>}
          </div>
          <ul className="flex-1 space-y-6 mb-14">
            {plan.feats.map((f, i) => (
              <li key={i} className="flex items-center gap-4">
                <CheckCircle2 size={24} className={plan.highlight ? 'text-black opacity-50' : 'text-amber-500'} />
                <span className={`text-lg font-light ${plan.highlight ? 'text-black' : 'text-zinc-300'}`}>{f}</span>
              </li>
            ))}
          </ul>
          <button className={`w-full py-6 rounded-full text-sm font-bold tracking-[0.2em] uppercase transition-all duration-300 ${
            plan.highlight 
            ? 'bg-black text-white hover:bg-zinc-900 hover:shadow-2xl' 
            : 'bg-white/5 text-white hover:bg-white hover:text-black border border-white/10 hover:border-transparent'
          }`}>
            Seleccionar Plan
          </button>
        </motion.div>
      ))}
    </div>
  </div>
);

const AboutView = () => (
  <div className="pt-40 pb-32 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto min-h-screen text-center flex flex-col justify-center">
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} className="mb-24">
      <h1 className="text-6xl sm:text-8xl font-light text-white mb-8 tracking-tighter">Democratizando el <br/><span className="font-normal text-amber-500">Retail Tech</span></h1>
    </motion.div>
    
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }} className="prose prose-invert prose-2xl mx-auto text-zinc-400 font-light leading-relaxed">
      <p className="mb-10 text-3xl text-white font-normal leading-tight">Nuestra misión es simple: darle a cada comerciante la infraestructura de software que usan los gigantes de la industria.</p>
      <p className="mb-10">Sabemos lo difícil que es gestionar inventarios en Excel, perder ventas por falta de stock o no entender de dónde provienen las ganancias netas a fin de mes. Construimos el Ecosistema Axon para erradicar el caos operativo.</p>
      <p className="text-amber-500">Creemos fervientemente en el <strong>Efecto Red</strong>. Al utilizar nuestra plataforma, no solo obtienes un ERP, te unes a una red global interconectada de comercios que impulsan la economía del futuro.</p>
    </motion.div>
  </div>
);


// --- Main Layout Component ---

export function LandingPage({ onLoginClick }) {
  const [activePage, setActivePage] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    setMobileMenuOpen(false);
  }, [activePage]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { id: 'home', label: 'Inicio' },
    { id: 'features', label: 'Plataforma' },
    { id: 'pricing', label: 'Precios' },
    { id: 'about', label: 'Manifiesto' },
  ];

  return (
    <div className="min-h-screen bg-black text-slate-50 font-sans selection:bg-amber-500/30 relative flex flex-col scroll-smooth overflow-x-hidden">

      {/* Floating Pill Header */}
      <header className="fixed top-6 left-0 right-0 z-50 px-4 flex justify-center pointer-events-none">
        <div className={`pointer-events-auto flex items-center justify-between px-6 py-3 rounded-full border transition-all duration-500 w-full max-w-6xl
          ${scrolled ? 'bg-zinc-900/80 border-white/10 backdrop-blur-xl shadow-2xl' : 'bg-transparent border-transparent'}
        `}>
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActivePage('home')}>
            <img 
              src={logoAxon} 
              alt="Axon Logo" 
              className="h-7 w-auto brightness-150 drop-shadow-[0_0_12px_rgba(245,158,11,0.4)] group-hover:drop-shadow-[0_0_20px_rgba(245,158,11,0.8)] group-hover:scale-105 transition-all duration-500" 
            />
            <span className="font-bold text-xl tracking-[0.3em] text-white">AXON</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-2">
            {navLinks.map(link => (
              <button 
                key={link.id} 
                onClick={() => setActivePage(link.id)}
                className={`px-5 py-2 rounded-full text-xs font-bold tracking-[0.2em] uppercase transition-all duration-300
                  ${activePage === link.id 
                    ? 'bg-white/10 text-white' 
                    : 'text-zinc-500 hover:text-white hover:bg-white/5'}
                `}
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <button 
              onClick={onLoginClick}
              className="hidden md:flex relative items-center gap-2 overflow-hidden rounded-full bg-white px-6 py-2.5 text-xs font-bold tracking-[0.2em] uppercase text-black transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]"
            >
              <LogIn size={14} />
              Acceso
            </button>
            <button className="md:hidden text-white p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-zinc-950/95 backdrop-blur-2xl pt-32 px-6 pb-6 flex flex-col md:hidden"
          >
            <div className="flex flex-col gap-6 text-center">
              {navLinks.map(link => (
                <button 
                  key={link.id} onClick={() => setActivePage(link.id)}
                  className={`text-2xl font-light tracking-widest uppercase ${activePage === link.id ? 'text-amber-500' : 'text-white'}`}
                >
                  {link.label}
                </button>
              ))}
              <div className="mt-10 pt-10 border-t border-white/10">
                <button onClick={onLoginClick} className="w-full bg-white text-black py-5 rounded-full text-sm font-bold tracking-widest uppercase">
                  Acceso a Plataforma
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Router */}
      <main className="relative z-10 flex-grow">
        <AnimatePresence mode="wait">
          <motion.div 
            key={activePage}
            initial={{ opacity: 0, filter: 'blur(10px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, filter: 'blur(10px)' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {activePage === 'home' && <HomeView onNavigate={setActivePage} />}
            {activePage === 'features' && <FeaturesView />}
            {activePage === 'pricing' && <PricingView />}
            {activePage === 'about' && <AboutView />}
          </motion.div>
        </AnimatePresence>
      </main>
      
      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-black pt-32 pb-12 px-6 sm:px-12 lg:px-24 mt-auto">
         <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-16">
           <div className="max-w-sm">
             <div className="flex items-center gap-4 mb-8">
               <img src={logoAxon} alt="Axon Logo" className="h-10 w-auto brightness-200" />
               <span className="text-2xl tracking-[0.3em] text-white font-bold">AXON</span>
             </div>
             <p className="text-zinc-500 text-base font-light leading-relaxed">El ecosistema operativo definitivo para el comercio moderno. Tecnología de grado empresarial, accesible para todos.</p>
           </div>
           
           <div className="flex flex-wrap gap-16 text-sm text-zinc-400 font-light tracking-wide">
             <div className="flex flex-col gap-5">
               <span className="text-white font-bold uppercase tracking-[0.2em] text-xs mb-2 opacity-50">Plataforma</span>
               <button onClick={() => setActivePage('features')} className="text-left hover:text-amber-500 transition-colors">Infraestructura</button>
               <button onClick={() => setActivePage('pricing')} className="text-left hover:text-amber-500 transition-colors">Inversión</button>
             </div>
             <div className="flex flex-col gap-5">
               <span className="text-white font-bold uppercase tracking-[0.2em] text-xs mb-2 opacity-50">Compañía</span>
               <button onClick={() => setActivePage('about')} className="text-left hover:text-amber-500 transition-colors">Manifiesto</button>
               <a href="#" className="hover:text-amber-500 transition-colors">Legal & Privacidad</a>
             </div>
           </div>
         </div>
         
         <div className="max-w-[1400px] mx-auto mt-32 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
           <p className="text-xs text-zinc-600 tracking-[0.2em] uppercase font-bold">&copy; {new Date().getFullYear()} AXON SAAS. ALL RIGHTS RESERVED.</p>
           <div className="text-xs text-zinc-600 tracking-[0.2em] uppercase font-bold">Design & Engineered in Axon</div>
         </div>
      </footer>
    </div>
  );
}
