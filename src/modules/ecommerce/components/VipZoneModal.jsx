import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  Sparkles, 
  CheckCircle2, 
  X, 
  ArrowRight, 
  BellRing,
  Zap,
  Gift,
  Heart
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';

export default function VipZoneModal({ isOpen, onClose, currentCustomer }) {
  const [phone, setPhone] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('axon_vip_waitlist_registered');
      if (saved) {
        setIsJoined(true);
      } else {
        setIsJoined(false);
        if (currentCustomer?.phone) {
          setPhone(currentCustomer.phone);
        }
      }
    }
  }, [isOpen, currentCustomer]);

  const handleJoinWaitlist = async (e) => {
    e?.preventDefault();
    if (!phone.trim()) {
      alert('Ingresa tu número de WhatsApp para notificarte.');
      return;
    }

    setIsSubmitting(true);
    try {
      localStorage.setItem('axon_vip_waitlist_registered', 'true');
      localStorage.setItem('axon_vip_user_phone', phone.trim());

      try {
        if (supabase) {
          await supabase.from('axon_vip_waitlist').insert([{
            customer_id: currentCustomer?.id || null,
            name: currentCustomer?.name || 'Cliente VIP',
            phone: phone.trim(),
            created_at: new Date().toISOString()
          }]).select();
        }
      } catch (err) {
        // Silencioso, guardado local listo
      }

      setIsJoined(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Overlay liviano y ultra rápido sin blur pesado */}
      <div 
        className="fixed inset-0 bg-black/60 transition-opacity duration-150"
        onClick={onClose}
      />

      {/* Tarjeta Limpia: Blanco y Anaranjado Axon */}
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-orange-100 overflow-hidden z-10 text-slate-900 transition-transform duration-150 scale-100"
        style={{ willChange: 'transform, opacity' }}
      >
        {/* Barra superior de acento anaranjado */}
        <div className="h-2 w-full bg-gradient-to-r from-orange-500 via-orange-400 to-amber-500" />

        {/* Botón Cerrar */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        <div className="p-6 sm:p-7 text-center">
          {/* Ícono de Corona Anaranjado */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/30 mb-4">
            <Crown size={32} className="stroke-[2.3]" />
          </div>

          {/* Insignia Próximamente */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-600 text-xs font-bold tracking-wide mb-2.5">
            <Sparkles size={13} className="text-orange-500" />
            <span>Zona VIP · Próximamente</span>
          </div>

          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Club VIP
          </h2>

          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Estamos preparando funciones sorpresa diseñadas para resolver el día a día de todos los venezolanos.
          </p>

          {/* Puntos Clave Sencillos (Sin revelar detalles a la competencia) */}
          <div className="mt-5 space-y-2.5 text-left">
            <div className="p-3 rounded-2xl bg-orange-50/70 border border-orange-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0">
                <Zap size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Funciones para tu día a día</h4>
                <p className="text-[11px] text-slate-500 leading-tight">Herramientas prácticas para hacer tus compras más fáciles y rápidas.</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-orange-50/70 border border-orange-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0">
                <Gift size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Beneficios y sorpresas exclusivas</h4>
                <p className="text-[11px] text-slate-500 leading-tight">Ventajas especiales solo para miembros del Club VIP.</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-orange-50/70 border border-orange-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0">
                <Heart size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">100% para Venezuela</h4>
                <p className="text-[11px] text-slate-500 leading-tight">Pensado exclusivamente para nuestra gente y nuestro comercio local.</p>
              </div>
            </div>
          </div>

          {/* Sección de Notificación Rápida */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            {isJoined ? (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span className="text-xs font-bold">¡Excelente! Te notificaremos apenas lancemos el Club VIP.</span>
              </div>
            ) : (
              <form onSubmit={handleJoinWaitlist} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="Tu WhatsApp (ej. 0414 1234567)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <span>Avisarme</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">Te avisaremos de primero cuando esté activo.</p>
              </form>
            )}
          </div>

          {/* Botón Cerrar / Volver */}
          <button 
            onClick={onClose}
            className="mt-4 text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            Volver a la tienda
          </button>
        </div>
      </div>
    </div>
  );
}
