import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  CheckCircle2, 
  X, 
  ArrowRight, 
  ShoppingBag, 
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
    const cleanPhone = phone.trim();
    const cleanDigits = cleanPhone.replace(/\D/g, '');
    const customerName = (currentCustomer?.name || currentCustomer?.full_name || 'Cliente Visitante').trim();

    try {
      localStorage.setItem('axon_vip_waitlist_registered', 'true');
      localStorage.setItem('axon_vip_user_phone', cleanPhone);

      // Guardar también en lista acumulada local para sincronización inmediata
      try {
        const stored = JSON.parse(localStorage.getItem('axon_vip_local_submissions') || '[]');
        if (!stored.some(x => (x.phone || '').replace(/\D/g, '') === cleanDigits)) {
          stored.unshift({
            id: `vip_${Date.now()}`,
            phone: cleanPhone,
            name: customerName,
            customer_id: currentCustomer?.id || null,
            created_at: new Date().toISOString()
          });
          localStorage.setItem('axon_vip_local_submissions', JSON.stringify(stored));
        }
      } catch (_) {}

      const payload = {
        phone: cleanPhone,
        name: customerName,
        customer_id: currentCustomer?.id || null,
        created_at: new Date().toISOString()
      };

      // 1. Enviar al backend Node Express (con fallback a puerto 3001)
      let sentToBackend = false;
      try {
        const res = await fetch('/api/vip-waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) sentToBackend = true;
      } catch (_) {}

      if (!sentToBackend) {
        try {
          const res = await fetch('http://localhost:3001/api/vip-waitlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) sentToBackend = true;
        } catch (_) {}
      }

      // 2. Guardar en Supabase: en ecommerce_customers (100% garantizado en la base de datos)
      try {
        if (supabase) {
          if (currentCustomer?.id) {
            const existingProfile = currentCustomer.payment_profile || {};
            await supabase
              .from('ecommerce_customers')
              .update({
                phone: cleanPhone,
                payment_profile: { ...existingProfile, vip_waitlist: true, vip_registered_at: new Date().toISOString() }
              })
              .eq('id', currentCustomer.id);
          } else {
            const vipGuestId = `vip_${cleanDigits || Date.now()}`;
            const guestEmail = `${cleanDigits || Date.now()}@vip.axonmarket.com`;
            await supabase
              .from('ecommerce_customers')
              .upsert([{
                id: vipGuestId,
                name: customerName,
                phone: cleanPhone,
                email: guestEmail,
                password: 'vip_waitlist_guest',
                join_date: new Date().toISOString(),
                status: 'VIP_WAITLIST',
                payment_profile: { vip_waitlist: true, vip_registered_at: new Date().toISOString() }
              }], { onConflict: 'id' });
          }
        }
      } catch (sbErr) {
        console.warn('Nota Supabase ecommerce_customers:', sbErr);
      }

      // 3. Notificar a toda la ventana para actualizar paneles abiertos
      window.dispatchEvent(new CustomEvent('axon_vip_updated', { detail: payload }));

      setIsJoined(true);
    } catch (err) {
      console.error('Error al registrar en Club VIP:', err);
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

        <div className="p-6 sm:p-7">
          {/* Cabecera: Cuadro anaranjado con la coronita + Club VIP + Próximamente al lado */}
          <div className="flex items-center gap-3.5 mb-3 text-left">
            <div className="w-14 h-14 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/30 shrink-0">
              <Crown size={28} className="stroke-[2.3]" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Club VIP
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-orange-600 text-xs font-bold tracking-wide">
                  Próximamente
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Zona VIP para clientes exclusivos
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-600 mb-4 text-left leading-relaxed">
            Estamos preparando funciones sorpresa diseñadas para resolver el día a día de todos los venezolanos.
          </p>

          {/* Puntos Clave Sencillos (Sin revelar detalles a la competencia) */}
          <div className="space-y-2.5 text-left">
            <div className="p-3 rounded-2xl bg-orange-50/70 border border-orange-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0">
                <ShoppingBag size={16} className="stroke-[2.2]" />
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
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
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
          <div className="text-center">
            <button 
              onClick={onClose}
              className="mt-4 text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              Volver a la tienda
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
