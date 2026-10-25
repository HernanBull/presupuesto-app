import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Store, ShoppingBag, ArrowRight, CheckCircle2, Star, ShieldCheck, 
  Zap, Sparkles, TrendingUp, Smartphone, Laptop, Users, RefreshCw, 
  ChevronDown, ChevronUp, MessageCircle, HelpCircle, Building2, 
  MapPin, Mail, Phone, Clock, Award, BarChart3, QrCode, DollarSign,
  ChevronRight, ArrowUpRight, Flame, Layers, Box
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MerchantLandingPage() {
  const navigate = useNavigate();

  // Estado del formulario de captura del Hero (0% Comisión por 30 Días)
  const [formData, setFormData] = useState({
    storeName: '',
    storeAddress: '',
    email: '',
    phone: '',
    businessType: 'Restaurante / Comida rápida'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Acordeón de FAQs
  const [openFaq, setOpenFaq] = useState(0);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Guardar prefill en localStorage para que el modal/wizard de registro lo tome
    try {
      localStorage.setItem('axon_merchant_prefill', JSON.stringify(formData));
    } catch (err) {
      console.warn('Error saving prefill data', err);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      navigate('/explorar', { 
        state: { 
          openMerchantRegister: true, 
          mode: 'register',
          prefill: formData
        } 
      });
    }, 400);
  };

  const faqs = [
    {
      q: "¿Cómo funciona la oferta de 0% de comisión durante 30 días?",
      a: "Al registrar tu comercio en AxonMarket hoy, tienes 30 días continuos con cero por ciento (0%) de comisión sobre todas tus ventas procesadas a través de la plataforma. Todo lo que vendas es 100% tuyo para que pruebes el impacto real en tus ingresos sin ningún riesgo financiero."
    },
    {
      q: "¿Cómo se conecta mi punto de venta físico (Axon POS) con mi tienda online?",
      a: "Axon POS y AxonMarket comparten una arquitectura en tiempo real. Cuando realizas una venta en el mostrador físico de tu tienda, el inventario se actualiza automáticamente en tu catálogo web en milisegundos. Del mismo modo, cuando entra un pedido digital, se refleja en tu pantalla de órdenes para evitar ventas de productos sin stock."
    },
    {
      q: "¿Quién se encarga del delivery de los pedidos?",
      a: "Tú decides con total flexibilidad: puedes utilizar nuestra red de repartidores independientes afiliados a AxonMarket (con cálculo automático de tarifas y rastreo GPS en vivo), o bien puedes asignar los despachos a tus propios motorizados o personal de entrega si ya cuentas con flota."
    },
    {
      q: "¿Cómo y cuándo recibo el dinero de mis ventas?",
      a: "A diferencia de otras plataformas internacionales que retienen fondos, en AxonMarket los cobros por Pago Móvil, transferencia bancaria, Zelle o efectivo van directamente a tus cuentas bancarias o de tu comercio, de forma rápida, transparente y sin comisiones ocultas de cambio."
    },
    {
      q: "¿Puedo operar solo con mi teléfono celular o necesito una computadora?",
      a: "Puedes operar el 100% de tu vitrina digital, catálogo y gestión de pedidos desde cualquier smartphone (Android o iOS). Si además cuentas con una computadora o tablet en caja, puedes instalar o abrir Axon POS para la experiencia completa de facturación rápida e impresión de comandas."
    }
  ];

  return (
    <div className="min-h-screen bg-[#FCF9F6] text-zinc-950 font-sans selection:bg-orange-500 selection:text-white">
      
      {/* 1. NAVBAR DEDICADO PARA COMERCIANTES (ESTILO DOORDASH MERCHANTS) */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-zinc-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo Oficial + Badge 'para Comercios' */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 group text-left"
            >
              <img 
                src="/axonmarket-logo-icon.png" 
                alt="AxonMarket" 
                className="w-9 h-9 rounded-xl shadow-xs group-hover:scale-105 transition-transform" 
              />
              <div className="flex items-baseline">
                <span className="font-black text-xl tracking-tighter text-zinc-950">AXON</span>
                <span className="font-black text-xl tracking-tighter text-amber-500">MARKET</span>
              </div>
            </button>
            <span className="text-[11px] font-black uppercase tracking-wider bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full border border-orange-200">
              para Comercios
            </span>
          </div>

          {/* Menú de Enlaces Desktop */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-bold text-zinc-600">
            <a href="#soluciones" className="hover:text-orange-600 transition-colors">Soluciones</a>
            <a href="#axon-pos" className="hover:text-orange-600 transition-colors">Axon POS</a>
            <a href="#como-funciona" className="hover:text-orange-600 transition-colors">¿Cómo funciona?</a>
            <a href="#faq" className="hover:text-orange-600 transition-colors">Preguntas Frecuentes</a>
          </nav>

          {/* Acciones: Login y Botón Empezar */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button 
              onClick={() => navigate('/explorar', { state: { openMerchantRegister: true, mode: 'login' } })}
              className="text-xs sm:text-sm font-bold text-zinc-700 hover:text-orange-600 transition-colors px-3 py-2"
            >
              Iniciar sesión
            </button>
            <a 
              href="#registro"
              className="bg-orange-500 hover:bg-orange-600 text-white font-black text-xs sm:text-sm px-5 sm:px-6 py-2.5 sm:py-3 rounded-full shadow-md hover:shadow-lg transition-all active:scale-95"
              style={{ color: '#ffffff' }}
            >
              Empezar
            </a>
          </div>

        </div>
      </header>

      {/* 2. HERO SECTION CON FORMULARIO 0% COMISIÓN (DOORDASH 1:1) */}
      <section id="registro" className="relative pt-10 sm:pt-16 pb-16 sm:pb-24 overflow-hidden border-b border-zinc-200/80">
        
        {/* Fondo decorativo sutil */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-orange-100/40 via-amber-50/20 to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Columna Izquierda: Titular y Formulario de Captura 1:1 DoorDash */}
            <div className="lg:col-span-7 xl:col-span-6 space-y-8">
              
              <div>
                <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-800 text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full mb-4 border border-orange-200">
                  <Flame size={14} className="text-orange-600" />
                  <span>Plataforma Omnicanal para Negocios</span>
                </div>
                <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black text-zinc-950 tracking-tight leading-[1.05] uppercase">
                  LLEGA A MILES DE CLIENTES EN TU CIUDAD
                </h1>
                <p className="mt-4 text-base sm:text-lg text-zinc-600 font-normal leading-relaxed max-w-xl">
                  Multiplica tus ventas con vitrina en línea, pedidos directos por delivery y sincronización automática en tiempo real con tu punto de venta <strong>Axon POS</strong>.
                </p>
              </div>

              {/* Formulario DoorDash Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-zinc-200/90 shadow-xl relative">
                <div className="mb-6">
                  <h2 className="text-lg sm:text-xl font-black text-zinc-950 tracking-tight uppercase">
                    PRUEBA AXONMARKET CON 0% DE COMISIÓN HASTA POR 30 DÍAS
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-500 font-medium mt-1">
                    Sin contratos forzosos. Sin comisiones ocultas. Comienza hoy mismo.
                  </p>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                  
                  {/* Nombre del comercio */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                      Nombre del negocio o tienda
                    </label>
                    <div className="relative">
                      <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                      <input 
                        type="text"
                        name="storeName"
                        required
                        value={formData.storeName}
                        onChange={handleInputChange}
                        placeholder="Ej. Pizzería Bella Vista, Bodegón Central"
                        className="w-full bg-zinc-50 hover:bg-zinc-100/80 focus:bg-white text-zinc-950 placeholder-zinc-400 border border-zinc-200 focus:border-orange-500 rounded-2xl py-3 pl-11 pr-4 text-sm font-medium transition-all outline-none"
                      />
                    </div>
                  </div>

                  {/* Dirección del local */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                      Dirección del local comercial
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                      <input 
                        type="text"
                        name="storeAddress"
                        required
                        value={formData.storeAddress}
                        onChange={handleInputChange}
                        placeholder="Ciudad, sector o centro comercial"
                        className="w-full bg-zinc-50 hover:bg-zinc-100/80 focus:bg-white text-zinc-950 placeholder-zinc-400 border border-zinc-200 focus:border-orange-500 rounded-2xl py-3 pl-11 pr-4 text-sm font-medium transition-all outline-none"
                      />
                    </div>
                  </div>

                  {/* Grid 2 Columnas: Correo y Teléfono WhatsApp */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                        Correo electrónico
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                        <input 
                          type="email"
                          name="email"
                          required
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="tu@correo.com"
                          className="w-full bg-zinc-50 hover:bg-zinc-100/80 focus:bg-white text-zinc-950 placeholder-zinc-400 border border-zinc-200 focus:border-orange-500 rounded-2xl py-3 pl-11 pr-4 text-sm font-medium transition-all outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                        Teléfono / WhatsApp
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                        <input 
                          type="tel"
                          name="phone"
                          required
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="0412-1234567"
                          className="w-full bg-zinc-50 hover:bg-zinc-100/80 focus:bg-white text-zinc-950 placeholder-zinc-400 border border-zinc-200 focus:border-orange-500 rounded-2xl py-3 pl-11 pr-4 text-sm font-medium transition-all outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tipo de Comercio */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                      Tipo de negocio
                    </label>
                    <select
                      name="businessType"
                      value={formData.businessType}
                      onChange={handleInputChange}
                      className="w-full bg-zinc-50 hover:bg-zinc-100/80 focus:bg-white text-zinc-950 border border-zinc-200 focus:border-orange-500 rounded-2xl py-3 px-4 text-sm font-medium transition-all outline-none cursor-pointer"
                    >
                      <option value="Restaurante / Comida rápida">Restaurante / Comida rápida</option>
                      <option value="Bodegón / Víveres">Bodegón / Víveres</option>
                      <option value="Supermercado / Abasto">Supermercado / Abasto</option>
                      <option value="Farmacia / Salud">Farmacia / Salud</option>
                      <option value="Panadería / Repostería">Panadería / Repostería</option>
                      <option value="Ropa / Calzado / Moda">Ropa / Calzado / Moda</option>
                      <option value="Tecnología / Accesorios">Tecnología / Accesorios</option>
                      <option value="Licores / Bebidas">Licores / Bebidas</option>
                      <option value="Otro tipo de comercio">Otro tipo de comercio</option>
                    </select>
                  </div>

                  {/* Texto Legal */}
                  <p className="text-[11px] text-zinc-500 leading-snug pt-1">
                    Al hacer clic en &quot;Empezar con 0% de comisión&quot;, aceptas recibir asistencia de activación de cuenta y acceder a los 30 días de prueba sin comisiones de AxonMarket.
                  </p>

                  {/* Botón Píldora Naranja DoorDash 1:1 */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-orange-500 hover:bg-orange-600 active:scale-98 text-white font-black text-base py-4 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    style={{ color: '#ffffff' }}
                  >
                    {isSubmitting ? (
                      <span className="inline-flex items-center gap-2">
                        <RefreshCw className="animate-spin" size={18} />
                        Iniciando tu prueba...
                      </span>
                    ) : (
                      <>
                        <span>Empezar con 0% de comisión</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>

                </form>

              </div>

            </div>

            {/* Columna Derecha: Composición Visual Editorial DoorDash */}
            <div className="lg:col-span-5 xl:col-span-6 relative flex justify-center">
              
              {/* Contenedor con borde curvo estilizado */}
              <div className="relative w-full max-w-lg lg:max-w-none rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 bg-zinc-950 aspect-[4/3] sm:aspect-[4/3] lg:aspect-[5/4] flex items-center justify-center group">
                
                {/* Imagen de fondo / atmósfera de restaurante y comercio */}
                <img 
                  src="/landing-hero.jpg" 
                  alt="Comercio AxonMarket" 
                  className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" 
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />

                {/* Badge flotante 1: Orden digital en camino */}
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="absolute top-6 left-6 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/50 max-w-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                      <ShoppingBag size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-black text-zinc-950">Nuevo pedido en línea</div>
                      <div className="text-[11px] font-bold text-orange-600">Orden #1084 • $28.50</div>
                    </div>
                  </div>
                </motion.div>

                {/* Badge flotante 2: Sincronización POS */}
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="absolute bottom-6 right-6 bg-zinc-900/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-amber-500/30 text-white max-w-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <RefreshCw size={20} className="animate-spin-slow" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-amber-300">Axon POS Sincronizado</div>
                      <div className="text-[11px] text-zinc-400">Stock físico & online al día</div>
                    </div>
                  </div>
                </motion.div>

                {/* Centro: Logo AxonMarket Emblema */}
                <div className="relative z-10 text-center p-8">
                  <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 mx-auto flex items-center justify-center mb-4 shadow-2xl">
                    <img src="/axonmarket-logo-icon.png" alt="Axon" className="w-12 h-12 rounded-xl" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Tu Negocio Conectado
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-300 mt-2 max-w-xs mx-auto">
                    La única plataforma que integra mostrador físico, caja e-commerce y delivery en un solo ecosistema.
                  </p>
                </div>

              </div>

            </div>

          </div>
        </div>
      </section>

      {/* 3. SOCIAL PROOF & MÉTRICAS DE IMPACTO (DOORDASH 1:1) */}
      <section className="py-14 sm:py-20 bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs font-black tracking-widest uppercase text-amber-600 mb-2 block">
              Resultados Comprobados
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-zinc-950 tracking-tight">
              Únete a los comercios que ya están transformando sus ventas
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            
            <div className="bg-zinc-50 rounded-3xl p-6 sm:p-8 border border-zinc-200/80 text-center">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-orange-600 tracking-tight mb-2">
                +35%
              </div>
              <div className="text-xs sm:text-sm font-bold text-zinc-800 uppercase tracking-wider mb-1">
                Aumento en ventas
              </div>
              <p className="text-xs text-zinc-500 font-normal">
                Promedio reportado por comercios al activar su vitrina digital y delivery.
              </p>
            </div>

            <div className="bg-zinc-50 rounded-3xl p-6 sm:p-8 border border-zinc-200/80 text-center">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-amber-500 tracking-tight mb-2">
                0%
              </div>
              <div className="text-xs sm:text-sm font-bold text-zinc-800 uppercase tracking-wider mb-1">
                Comisión inicial
              </div>
              <p className="text-xs text-zinc-500 font-normal">
                Tus primeros 30 días completamente libres de comisiones para probar el sistema.
              </p>
            </div>

            <div className="bg-zinc-50 rounded-3xl p-6 sm:p-8 border border-zinc-200/80 text-center">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-zinc-950 tracking-tight mb-2">
                100%
              </div>
              <div className="text-xs sm:text-sm font-bold text-zinc-800 uppercase tracking-wider mb-1">
                Sincronización POS
              </div>
              <p className="text-xs text-zinc-500 font-normal">
                Control de inventario unificado entre caja física y pedidos por internet.
              </p>
            </div>

            <div className="bg-zinc-50 rounded-3xl p-6 sm:p-8 border border-zinc-200/80 text-center">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-emerald-600 tracking-tight mb-2">
                &lt; 5 min
              </div>
              <div className="text-xs sm:text-sm font-bold text-zinc-800 uppercase tracking-wider mb-1">
                Activación rápida
              </div>
              <p className="text-xs text-zinc-500 font-normal">
                Carga tu catálogo y empieza a recibir pedidos el mismo día.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 4. BENTO GRID DE PRODUCTOS Y SOLUCIONES (DOORDASH MERCHANTS 1:1) */}
      <section id="soluciones" className="py-16 sm:py-24 bg-[#FCF9F6] border-b border-zinc-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-black tracking-widest uppercase text-orange-600 mb-2 block">
              Ecosistema Integral
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-zinc-950 tracking-tight">
              Desde el descubrimiento hasta la entrega final
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 mt-4 font-normal">
              Cuatro soluciones diseñadas para que tu negocio prospere en el comercio físico y digital de Venezuela.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
            
            {/* SOLUCIÓN 1: Marketplace & Vitrina Digital */}
            <div className="bg-white rounded-3xl p-8 sm:p-10 border border-zinc-200 shadow-md hover:shadow-xl transition-all flex flex-col justify-between group">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <ShoppingBag size={28} />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-orange-600 mb-2 block">
                  Axon Marketplace
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight mb-4">
                  Aparece ante clientes que buscan en tu ciudad
                </h3>
                <p className="text-sm sm:text-base text-zinc-600 font-normal leading-relaxed mb-6">
                  Tu catálogo abierto 24/7 con fotos de alta definición, variantes de producto, precios en bolívares y dólares al cambio oficial, y enlace directo para tus redes sociales y WhatsApp.
                </p>
                <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-700 font-semibold mb-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-orange-500" />
                    <span>Recepción de pedidos por WhatsApp o panel web</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-orange-500" />
                    <span>Pagos verificados vía Pago Móvil, Zelle o efectivo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-orange-500" />
                    <span>Fácil de navegar en cualquier teléfono móvil</span>
                  </li>
                </ul>
              </div>
              <a 
                href="#registro"
                className="inline-flex items-center gap-2 text-sm font-black text-orange-600 hover:text-orange-700 group-hover:translate-x-1 transition-all"
              >
                <span>Crear mi vitrina gratis</span>
                <ArrowRight size={16} />
              </a>
            </div>

            {/* SOLUCIÓN 2: Axon POS (Punto de Venta Integrado) */}
            <div id="axon-pos" className="bg-zinc-950 text-white rounded-3xl p-8 sm:p-10 border border-amber-500/30 shadow-xl hover:shadow-2xl transition-all flex flex-col justify-between group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              <div>
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Laptop size={28} />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-amber-400 mb-2 block">
                  Punto de Venta Integrado
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-4">
                  Axon POS: Sincronización en tiempo real
                </h3>
                <p className="text-sm sm:text-base text-zinc-300 font-normal leading-relaxed mb-6">
                  La solución que elimina la pesadilla del inventario desactualizado. Lo que vendes en tu mostrador físico se descuenta al segundo de tu tienda online, protegiéndote de sobreventas.
                </p>
                <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-300 font-semibold mb-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-amber-400" />
                    <span>Facturación rápida y control de caja multimoneda</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-amber-400" />
                    <span>Reportes diarios de ventas y utilidad neta</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-amber-400" />
                    <span>Funciona en computadoras, tablets y teléfonos</span>
                  </li>
                </ul>
              </div>
              <a 
                href="#registro"
                className="inline-flex items-center gap-2 text-sm font-black text-amber-400 hover:text-amber-300 group-hover:translate-x-1 transition-all"
              >
                <span>Conectar Axon POS</span>
                <ArrowRight size={16} />
              </a>
            </div>

            {/* SOLUCIÓN 3: Red de Delivery & Repartidores */}
            <div className="bg-white rounded-3xl p-8 sm:p-10 border border-zinc-200 shadow-md hover:shadow-xl transition-all flex flex-col justify-between group">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Zap size={28} />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-teal-700 mb-2 block">
                  Logística Flexible
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight mb-4">
                  Entregas con nuestra red o tus propios motorizados
                </h3>
                <p className="text-sm sm:text-base text-zinc-600 font-normal leading-relaxed mb-6">
                  Conecta tus pedidos con repartidores independientes verificados en tu zona o gestiona fácilmente a tus propios despachadores con seguimiento en tiempo real.
                </p>
                <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-700 font-semibold mb-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-teal-600" />
                    <span>Cálculo automático de tarifas según distancia</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-teal-600" />
                    <span>Notificaciones en tiempo real al cliente por WhatsApp</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-teal-600" />
                    <span>Sin costos fijos de repartidor para tu negocio</span>
                  </li>
                </ul>
              </div>
              <a 
                href="#registro"
                className="inline-flex items-center gap-2 text-sm font-black text-teal-700 hover:text-teal-800 group-hover:translate-x-1 transition-all"
              >
                <span>Ver opciones de entrega</span>
                <ArrowRight size={16} />
              </a>
            </div>

            {/* SOLUCIÓN 4: Menú Digital QR & Pickup */}
            <div className="bg-white rounded-3xl p-8 sm:p-10 border border-zinc-200 shadow-md hover:shadow-xl transition-all flex flex-col justify-between group">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <QrCode size={28} />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-rose-700 mb-2 block">
                  Atención en Sala & Mostrador
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-zinc-950 tracking-tight mb-4">
                  Menú QR en mesas y pedidos para llevar (Pickup)
                </h3>
                <p className="text-sm sm:text-base text-zinc-600 font-normal leading-relaxed mb-6">
                  Moderniza la experiencia física de tu restaurante o café. Tus clientes escanean el código QR en la mesa, ven las fotos de los platillos y pueden pedir sin esperar al mesonero.
                </p>
                <ul className="space-y-2.5 text-xs sm:text-sm text-zinc-700 font-semibold mb-8">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-rose-600" />
                    <span>Generación automática de códigos QR para mesas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-rose-600" />
                    <span>Opción de retiro en tienda con horario programado</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-rose-600" />
                    <span>Actualización instantánea de precios sin reimprimir menús</span>
                  </li>
                </ul>
              </div>
              <a 
                href="#registro"
                className="inline-flex items-center gap-2 text-sm font-black text-rose-700 hover:text-rose-800 group-hover:translate-x-1 transition-all"
              >
                <span>Generar menú QR</span>
                <ArrowRight size={16} />
              </a>
            </div>

          </div>

        </div>
      </section>

      {/* 5. CÓMO FUNCIONA: 3 PASOS (DOORDASH 1:1) */}
      <section id="como-funciona" className="py-16 sm:py-24 bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-black tracking-widest uppercase text-amber-600 mb-2 block">
              Paso a Paso
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-zinc-950 tracking-tight">
              Empieza a vender en 3 simples pasos
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
            
            <div className="relative bg-zinc-50 rounded-3xl p-8 border border-zinc-200/80">
              <div className="text-5xl font-black text-orange-500/20 mb-4">01</div>
              <h3 className="text-xl font-black text-zinc-950 tracking-tight mb-3">
                Regístrate y configura tu tienda
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed font-normal">
                Indica el nombre de tu negocio, dirección y tus métodos de pago habituales (Pago Móvil, Zelle o efectivo). Tu cuenta se activa de inmediato.
              </p>
            </div>

            <div className="relative bg-zinc-50 rounded-3xl p-8 border border-zinc-200/80">
              <div className="text-5xl font-black text-orange-500/20 mb-4">02</div>
              <h3 className="text-xl font-black text-zinc-950 tracking-tight mb-3">
                Carga tu catálogo o conecta el POS
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed font-normal">
                Sube tus productos con fotos y precios, o si ya usas Axon POS, sincroniza toda tu base de datos de una sola vez con un clic.
              </p>
            </div>

            <div className="relative bg-zinc-50 rounded-3xl p-8 border border-zinc-200/80">
              <div className="text-5xl font-black text-orange-500/20 mb-4">03</div>
              <h3 className="text-xl font-black text-zinc-950 tracking-tight mb-3">
                Recibe pedidos y haz crecer tus ventas
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed font-normal">
                Atiende a clientes en tu ciudad, despacha por delivery o en tienda, y cobra directamente en tus cuentas bancarias con 0% de comisión los primeros 30 días.
              </p>
            </div>

          </div>

          <div className="mt-12 text-center">
            <a 
              href="#registro"
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-black text-sm sm:text-base px-8 py-4 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95"
              style={{ color: '#ffffff' }}
            >
              <span>Comenzar mi registro gratuito</span>
              <ArrowRight size={18} />
            </a>
          </div>

        </div>
      </section>

      {/* 6. TABLA COMPARATIVA: WHATSAPP VS AXONMARKET + AXON POS */}
      <section className="py-16 sm:py-24 bg-[#FCF9F6] border-b border-zinc-200/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-black tracking-widest uppercase text-orange-600 mb-2 block">
              Ventaja Competitiva
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-zinc-950 tracking-tight">
              La diferencia entre vender manual y vender con AxonMarket
            </h2>
          </div>

          <div className="bg-white rounded-3xl border border-zinc-200 shadow-xl overflow-hidden">
            
            <div className="grid grid-cols-3 bg-zinc-950 text-white p-5 sm:p-6 text-xs sm:text-sm font-black uppercase tracking-wider">
              <div>Característica</div>
              <div className="text-center text-zinc-400">Vender solo por WhatsApp</div>
              <div className="text-center text-orange-400">AxonMarket + Axon POS</div>
            </div>

            <div className="divide-y divide-zinc-200 text-xs sm:text-sm">
              
              <div className="grid grid-cols-3 p-5 sm:p-6 items-center">
                <div className="font-bold text-zinc-950">Catálogo interactivo 24/7</div>
                <div className="text-center text-zinc-500">Fotos pesadas que colapsan el chat</div>
                <div className="text-center font-bold text-emerald-600 flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={16} />
                  <span>Vitrina web ultra rápida</span>
                </div>
              </div>

              <div className="grid grid-cols-3 p-5 sm:p-6 items-center bg-zinc-50/50">
                <div className="font-bold text-zinc-950">Control de inventario en tiempo real</div>
                <div className="text-center text-zinc-500">Descontrol de stock y sobreventas</div>
                <div className="text-center font-bold text-emerald-600 flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={16} />
                  <span>Sincronizado con local físico</span>
                </div>
              </div>

              <div className="grid grid-cols-3 p-5 sm:p-6 items-center">
                <div className="font-bold text-zinc-950">Asignación de Delivery</div>
                <div className="text-center text-zinc-500">Llamadas manuales y desorden</div>
                <div className="text-center font-bold text-emerald-600 flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={16} />
                  <span>Red de repartidores o propia</span>
                </div>
              </div>

              <div className="grid grid-cols-3 p-5 sm:p-6 items-center bg-zinc-50/50">
                <div className="font-bold text-zinc-950">Cobro y verificación</div>
                <div className="text-center text-zinc-500">Capturas falsas y esperas</div>
                <div className="text-center font-bold text-emerald-600 flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={16} />
                  <span>Pago directo a tu cuenta</span>
                </div>
              </div>

              <div className="grid grid-cols-3 p-5 sm:p-6 items-center">
                <div className="font-bold text-zinc-950">Comisión inicial</div>
                <div className="text-center text-zinc-500">N/A</div>
                <div className="text-center font-black text-orange-600 flex items-center justify-center gap-1.5">
                  <Sparkles size={16} />
                  <span>0% por 30 días</span>
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* 7. PREGUNTAS FRECUENTES (FAQ ACORDEÓN) */}
      <section id="faq" className="py-16 sm:py-24 bg-white border-b border-zinc-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-black tracking-widest uppercase text-amber-600 mb-2 block">
              Dudas Comunes
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-zinc-950 tracking-tight">
              Preguntas Frecuentes de Comercios
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx}
                className="border border-zinc-200 rounded-2xl overflow-hidden transition-all bg-zinc-50/50 hover:bg-zinc-50"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-black text-base sm:text-lg text-zinc-950 cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <div className="w-8 h-8 rounded-full bg-white shadow-xs border border-zinc-200 flex items-center justify-center shrink-0 text-zinc-500">
                    {openFaq === idx ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>
                <AnimatePresence>
                  {openFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="px-5 sm:px-6 pb-6 text-sm text-zinc-600 leading-relaxed font-normal"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 8. CTA FINAL BANNER ELEGANTE */}
      <section className="py-20 sm:py-28 bg-zinc-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#f97316_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-orange-500/20 text-orange-400 text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-6 border border-orange-500/30">
            <Sparkles size={14} />
            <span>Oferta por Tiempo Limitado</span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] mb-6">
            Comienza a vender más hoy con 0% de comisión
          </h2>
          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto mb-10 font-normal">
            Configura tu tienda en menos de 5 minutos, sincroniza tu inventario y conecta con miles de clientes en tu ciudad.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a 
              href="#registro"
              className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-black text-base px-10 py-4 rounded-full shadow-2xl hover:shadow-orange-500/20 transition-all active:scale-95 text-center"
              style={{ color: '#ffffff' }}
            >
              Empezar mi prueba gratuita de 30 días
            </a>
            <button 
              onClick={() => window.open('https://wa.me/584120000000?text=Hola,%20deseo%20información%20para%20afiliar%20mi%20comercio%20a%20AxonMarket', '_blank')}
              className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-base px-8 py-4 rounded-full border border-zinc-800 transition-all text-center inline-flex items-center justify-center gap-2"
            >
              <MessageCircle size={18} />
              <span>Hablar con un asesor</span>
            </button>
          </div>
        </div>
      </section>

      {/* 9. FOOTER DEDICADO PARA COMERCIOS */}
      <footer className="bg-zinc-900 text-zinc-400 py-12 border-t border-zinc-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/axonmarket-logo-icon.png" alt="Axon" className="w-7 h-7 rounded-lg" />
            <span className="font-black text-white text-sm tracking-tight">AXONMARKET PARA COMERCIOS</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-zinc-400 font-medium">
            <button onClick={() => navigate('/legal/terminos')} className="hover:text-white transition-colors">Términos de Servicio</button>
            <button onClick={() => navigate('/legal/privacidad')} className="hover:text-white transition-colors">Privacidad</button>
            <button onClick={() => navigate('/')} className="hover:text-white transition-colors">Ir a AxonMarket</button>
          </div>
          <p className="text-zinc-500">
            © 2026 AxonMarket Technologies C.A. Todos los derechos reservados.
          </p>
        </div>
      </footer>

    </div>
  );
}
