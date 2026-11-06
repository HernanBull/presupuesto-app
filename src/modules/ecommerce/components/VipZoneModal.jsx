import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crown, 
  Sparkles, 
  Bot, 
  Zap, 
  ShieldCheck, 
  Flame, 
  Mic, 
  Coins, 
  CheckCircle2, 
  X, 
  ArrowRight, 
  Lock, 
  BellRing,
  ShoppingBag,
  Clock
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';

export default function VipZoneModal({ isOpen, onClose, currentCustomer }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vipPassNumber, setVipPassNumber] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Verificar si ya está en waitlist en localStorage
      const savedPass = localStorage.getItem('axon_vip_pass_id');
      if (savedPass) {
        setVipPassNumber(savedPass);
        setIsJoined(true);
      } else {
        setIsJoined(false);
        if (currentCustomer) {
          setName(currentCustomer.name || currentCustomer.full_name || '');
          setPhone(currentCustomer.phone || '');
        }
      }
    }
  }, [isOpen, currentCustomer]);

  const handleJoinWaitlist = async (e) => {
    e?.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('Por favor ingresa tu nombre y número de WhatsApp para notificarte.');
      return;
    }

    setIsSubmitting(true);
    try {
      const generatedPass = `VIP-${Math.floor(1000 + Math.random() * 9000)}`;
      
      // Guardar localmente
      localStorage.setItem('axon_vip_pass_id', generatedPass);
      localStorage.setItem('axon_vip_user_name', name);
      localStorage.setItem('axon_vip_user_phone', phone);
      localStorage.setItem('axon_vip_registered_at', new Date().toISOString());

      // Si existe sesión o Supabase, intentar registrar
      try {
        if (supabase) {
          await supabase.from('axon_vip_waitlist').insert([{
            customer_id: currentCustomer?.id || null,
            name: name.trim(),
            phone: phone.trim(),
            pass_code: generatedPass,
            created_at: new Date().toISOString()
          }]).select();
        }
      } catch (dbErr) {
        console.warn('Nota: Registro offline/local para waitlist VIP:', dbErr);
      }

      setVipPassNumber(generatedPass);
      setIsJoined(true);
    } catch (err) {
      console.error('Error registrando en VIP waitlist:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Fondo oscuro con desenfoque de ultra-alta definición */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/85 backdrop-blur-xl"
          onClick={onClose}
        />

        {/* Contenedor del Modal Estilo Obsidian & Gold Luxury */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-gradient-to-b from-zinc-900 via-zinc-950 to-black rounded-[2.5rem] border border-amber-500/30 shadow-[0_0_60px_rgba(245,158,11,0.25)] overflow-hidden z-10 my-auto text-white"
        >
          {/* Resplandor superior dorado */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 shadow-[0_0_20px_#f59e0b]" />
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

          {/* Botón de Cierre */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-all cursor-pointer z-20"
          >
            <X size={18} />
          </button>

          <div className="p-6 sm:p-8 max-h-[88vh] overflow-y-auto custom-scrollbar">
            {/* Cabecera VIP */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="relative mb-3">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center text-zinc-950 shadow-[0_8px_25px_rgba(245,158,11,0.5)] ring-4 ring-amber-400/20">
                  <Crown size={32} className="stroke-[2.2]" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-zinc-950 rounded-full p-1 border border-amber-400/40">
                  <Sparkles size={14} className="text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
                </div>
              </div>

              {/* Badge En Construcción + IA */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                <Bot size={13} className="text-amber-400" />
                <span>Zona VIP · Próximamente con Inteligencia Artificial</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                Club VIP AxonMarket
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-2 max-w-sm leading-relaxed">
                Estamos construyendo una experiencia de compra de lujo impulsada por IA para que disfrutes de beneficios exclusivos nunca antes vistos en la ciudad.
              </p>
            </div>

            {/* Aviso de En Construcción */}
            <div className="mb-6 p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/20 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-400">
                <Clock size={20} className="animate-pulse" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-amber-300">Módulo en Desarrollo Exclusivo</p>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  Muy pronto disponible en la barra de navegación para todos los miembros registrados del club.
                </p>
              </div>
            </div>

            {/* Grid de Funciones VIP con IA (Teasers) */}
            <div className="space-y-3 mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400/90 text-left flex items-center gap-1.5">
                <Sparkles size={13} /> Lo que podrás hacer en la Zona VIP
              </h3>

              {/* Función 1: Asistente IA */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/5 hover:border-amber-500/30 transition-all flex items-start gap-3 text-left">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
                  <Bot size={18} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    Asistente de Compras con IA
                    <span className="text-[9px] px-1.5 py-0.2 bg-amber-400/20 text-amber-300 rounded font-semibold">Exclusivo</span>
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                    Dile lo que buscas o tu presupuesto. La IA compara precios en vivo entre todas las bodegas y arma tu carrito optimizado al menor costo posible.
                  </p>
                </div>
              </div>

              {/* Función 2: Despacho Flash Prioritario */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/5 hover:border-amber-500/30 transition-all flex items-start gap-3 text-left">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
                  <Zap size={18} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Despacho Flash Prioritario</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                    Tus pedidos van directo a la primera posición de despacho de los comercios y motorizados. Cero filas, cero demoras.
                  </p>
                </div>
              </div>

              {/* Función 3: Precios Secretos VIP */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/5 hover:border-amber-500/30 transition-all flex items-start gap-3 text-left">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
                  <Crown size={18} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Precios Ocultos & Combos VIP</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                    Acceso a catálogos mayoristas secretos y promociones privadas de hasta un 40% de descuento que no se muestran en el marketplace abierto.
                  </p>
                </div>
              </div>

              {/* Función 4: Pedidos por Voz / Concierge */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/5 hover:border-amber-500/30 transition-all flex items-start gap-3 text-left">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
                  <Mic size={18} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Pedidos por Voz y WhatsApp Concierge</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                    Envía un audio o mensaje en lenguaje natural ("mándame lo de la cena de siempre") y la IA procesa tu pedido y pago al instante.
                  </p>
                </div>
              </div>

              {/* Función 5: Cashback */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/5 hover:border-amber-500/30 transition-all flex items-start gap-3 text-left">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
                  <Coins size={18} />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Cashback & Puntos en Dólares</h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                    Acumula saldo real con cada pedido VIP para canjearlo en tus futuras compras en cualquier tienda de AxonMarket.
                  </p>
                </div>
              </div>
            </div>

            {/* Tarjeta de Espera / Pre-registro */}
            <div className="p-5 rounded-3xl bg-gradient-to-b from-amber-500/10 to-amber-950/20 border border-amber-500/30 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

              {isJoined ? (
                <div className="flex flex-col items-center py-2 animate-in fade-in duration-200">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-3">
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 className="text-base font-black text-white">¡Pase VIP Reservado!</h4>
                  <div className="my-2 px-3 py-1 bg-black/60 rounded-xl border border-amber-400/30 inline-flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Tu Código:</span>
                    <span className="text-sm font-mono font-black text-amber-400 tracking-wider">{vipPassNumber}</span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-1 max-w-xs leading-relaxed">
                    {name ? `${name}, estás` : 'Estás'} en la lista de fundadores. Te avisaremos con prioridad máxima apenas activemos los superpoderes de IA.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <BellRing size={16} className="text-amber-400 animate-bounce" />
                    <h4 className="text-sm font-extrabold text-white">Únete a la Lista de Acceso Anticipado</h4>
                  </div>
                  <p className="text-[11px] text-zinc-300 mb-4 max-w-xs mx-auto leading-tight">
                    Los primeros 100 usuarios VIP recibirán 1 mes gratis de asistente IA y cupón de bienvenida en delivery.
                  </p>

                  <form onSubmit={handleJoinWaitlist} className="space-y-2.5">
                    <input 
                      type="text" 
                      placeholder="Tu nombre completo"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
                      required
                    />
                    <input 
                      type="tel" 
                      placeholder="Número de WhatsApp (ej. 0424 1234567)"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs placeholder:text-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-zinc-950 font-black text-xs uppercase tracking-wider shadow-[0_4px_15px_rgba(245,158,11,0.4)] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <span>Apartando tu lugar...</span>
                      ) : (
                        <>
                          <Crown size={15} />
                          <span>Apartar Mi Pase VIP Gratuito</span>
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Botón inferior Volver al Catálogo */}
            <div className="mt-5 text-center">
              <button 
                onClick={onClose}
                className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer py-1 px-3"
              >
                Continuar explorando AxonMarket
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
