import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, X, Shield, Zap, Star, ArrowRight, BarChart3, Package, Users, Tag } from 'lucide-react';

export default function PricingPage() {
  const navigate = useNavigate();

  const handleStartTrial = (planName) => {
    // Para simplificar, navegamos a la Landing y le indicamos que abra el registro de comercio
    // Puedes leer este state en MarketplaceDirectory si deseas pre-seleccionar el plan.
    navigate('/ecommerce/live', { state: { openMerchantRegister: true, selectedPlan: planName } });
  };

  return (
    <div className="min-h-screen bg-black text-slate-50 font-sans selection:bg-amber-500/30 overflow-x-hidden">
      
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-amber-500/5 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-500/5 blur-[120px] rounded-full -translate-x-1/4 translate-y-1/3"></div>
      </div>

      {/* Navbar Minimalista */}
      <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-[1200px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/ecommerce/live')}>
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center text-black shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <Zap size={20} className="stroke-[2.5]" />
            </div>
            <span className="font-bold text-xl tracking-[0.2em] text-white">AXON<span className="text-amber-500 font-light">MARKET</span></span>
          </div>
          <button onClick={() => navigate('/ecommerce/live')} className="text-sm font-bold tracking-widest uppercase text-zinc-400 hover:text-white transition-colors">
            Volver al Inicio
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-32 pb-20 px-6 z-10 text-center max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold tracking-[0.2em] uppercase mb-8">
            <Star size={14} fill="currentColor" /> Potencia tu negocio
          </div>
          <h1 className="text-5xl md:text-7xl font-light text-white mb-6 tracking-tighter">
            Vende en piloto automático. <br />
            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-600">Sin comisiones por venta.</span>
          </h1>
          <p className="text-xl text-zinc-400 font-light leading-relaxed mb-10 max-w-2xl mx-auto">
            Únete al ecosistema comercial más avanzado. Pruébalo gratis por 14 días y descubre por qué somos la mejor opción para digitalizar tu inventario.
          </p>
        </motion.div>
      </header>

      {/* Pricing Cards */}
      <section className="relative px-6 pb-32 z-10 max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Plan Básico */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }}
            className="bg-zinc-950 border border-white/5 rounded-3xl p-8 hover:border-white/10 transition-colors flex flex-col"
          >
            <h3 className="text-2xl font-light text-white mb-2">Emprendedor</h3>
            <p className="text-zinc-500 text-sm mb-6">Para negocios que recién inician en línea.</p>
            <div className="mb-8">
              <span className="text-5xl font-black text-white">$15</span>
              <span className="text-zinc-500">/mes</span>
            </div>
            <button onClick={() => handleStartTrial('Emprendedor')} className="w-full py-4 rounded-xl bg-white/5 text-white font-bold tracking-widest uppercase text-xs border border-white/10 hover:bg-white/10 transition-colors mb-8">
              Comenzar Prueba Gratis
            </button>
            <div className="space-y-4 flex-1">
              <p className="text-xs font-bold tracking-widest text-zinc-600 uppercase mb-4">Incluye:</p>
              <Feature text="Catálogo Digital Público" />
              <Feature text="Gestor de Pedidos Básico" />
              <Feature text="Integración con WhatsApp" />
              <Feature text="Límite de 50 Productos" />
              <Feature text="1 Cuenta de Usuario" />
              <Feature text="Estadísticas Avanzadas" disabled />
              <Feature text="Control de Inventario" disabled />
            </div>
          </motion.div>

          {/* Plan Pro */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-zinc-900 border border-amber-500/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(245,158,11,0.1)] relative flex flex-col transform md:-translate-y-4"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-gradient-to-r from-amber-400 to-amber-600 text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-full">
              Más Popular
            </div>
            <h3 className="text-2xl font-bold text-amber-500 mb-2">Pro</h3>
            <p className="text-zinc-400 text-sm mb-6">La solución completa para gestionar y crecer tu marca.</p>
            <div className="mb-8">
              <span className="text-5xl font-black text-white">$29</span>
              <span className="text-zinc-500">/mes</span>
            </div>
            <button onClick={() => handleStartTrial('Pro')} className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-black font-black tracking-widest uppercase text-xs hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all mb-8">
              Comenzar Prueba Gratis
            </button>
            <div className="space-y-4 flex-1">
              <p className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-4">Todo lo Básico, más:</p>
              <Feature text="Productos Ilimitados" highlighted />
              <Feature text="Panel Analítico de Ventas" />
              <Feature text="Control de Inventario Avanzado" />
              <Feature text="CRM y Gestión de Clientes" />
              <Feature text="Gestor de Ofertas y Cupones" />
              <Feature text="Personalización Visual de la Tienda" />
            </div>
          </motion.div>

          {/* Plan Élite */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
            className="bg-zinc-950 border border-white/5 rounded-3xl p-8 hover:border-white/10 transition-colors flex flex-col"
          >
            <h3 className="text-2xl font-light text-white mb-2">Élite</h3>
            <p className="text-zinc-500 text-sm mb-6">Máximo poder y soporte prioritario para operaciones grandes.</p>
            <div className="mb-8">
              <span className="text-5xl font-black text-white">$59</span>
              <span className="text-zinc-500">/mes</span>
            </div>
            <button onClick={() => handleStartTrial('Élite')} className="w-full py-4 rounded-xl bg-white/5 text-white font-bold tracking-widest uppercase text-xs border border-white/10 hover:bg-white/10 transition-colors mb-8">
              Contactar Ventas
            </button>
            <div className="space-y-4 flex-1">
              <p className="text-xs font-bold tracking-widest text-zinc-600 uppercase mb-4">Todo lo Pro, más:</p>
              <Feature text="Exportación Avanzada a CSV" />
              <Feature text="Integraciones con Punto de Venta (POS)" />
              <Feature text="Cuentas de Staff Ilimitadas" />
              <Feature text="Múltiples Sucursales" />
              <Feature text="Soporte VIP 24/7" />
            </div>
          </motion.div>

        </div>
      </section>

      {/* Features Detail Section */}
      <section className="relative px-6 py-24 z-10 border-t border-white/5 bg-zinc-950/50">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
             <h2 className="text-3xl md:text-5xl font-light text-white mb-4">¿Por qué Axon Market?</h2>
             <p className="text-zinc-400 font-light text-lg">Un ecosistema creado con las herramientas que realmente necesitas.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
             <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
                <BarChart3 className="text-blue-400 mb-4" size={32} />
                <h4 className="text-white font-bold mb-2">Analíticas en Tiempo Real</h4>
                <p className="text-zinc-500 text-sm">Visualiza tus ingresos, productos estrella y tendencias de compra con gráficos interactivos.</p>
             </div>
             <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
                <Package className="text-emerald-400 mb-4" size={32} />
                <h4 className="text-white font-bold mb-2">Control de Inventario</h4>
                <p className="text-zinc-500 text-sm">Olvídate de vender lo que no tienes. Axon descuenta tu inventario automáticamente al vender.</p>
             </div>
             <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
                <Users className="text-purple-400 mb-4" size={32} />
                <h4 className="text-white font-bold mb-2">Gestión de Clientes (CRM)</h4>
                <p className="text-zinc-500 text-sm">Fideliza a tus compradores manteniendo un registro de sus compras, teléfonos y correos.</p>
             </div>
             <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/5">
                <Tag className="text-amber-400 mb-4" size={32} />
                <h4 className="text-white font-bold mb-2">Motor de Promociones</h4>
                <p className="text-zinc-500 text-sm">Crea ofertas flash, cupones de descuento y promociones por volumen en segundos.</p>
             </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="relative px-6 py-24 z-10 text-center">
         <h2 className="text-4xl font-bold text-white mb-6">Empieza a digitalizar tu negocio hoy.</h2>
         <p className="text-zinc-400 mb-10 max-w-xl mx-auto">Sin tarjetas de crédito. Sin contratos. Te damos 14 días para que te enamores de nuestra plataforma.</p>
         <button onClick={() => handleStartTrial('Pro')} className="px-10 py-5 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 text-black font-black tracking-widest uppercase text-sm hover:scale-105 transition-transform flex items-center gap-3 mx-auto shadow-[0_0_30px_rgba(245,158,11,0.3)]">
            Comenzar 14 Días Gratis <ArrowRight size={20} />
         </button>
      </section>
      
    </div>
  );
}

const Feature = ({ text, disabled, highlighted }) => (
  <div className="flex items-start gap-3">
    {disabled ? (
      <X size={18} className="text-zinc-700 shrink-0 mt-0.5" />
    ) : (
      <Check size={18} className={`${highlighted ? 'text-amber-500' : 'text-emerald-500'} shrink-0 mt-0.5`} />
    )}
    <span className={`text-sm ${disabled ? 'text-zinc-700' : (highlighted ? 'text-amber-400 font-medium' : 'text-zinc-300')}`}>
      {text}
    </span>
  </div>
);
