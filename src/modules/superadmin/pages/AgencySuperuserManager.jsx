import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';
import { 
  Crown, ShieldCheck, UserPlus, Send, Trash2, CheckCircle2, 
  XCircle, Phone, Building2, HelpCircle, AlertCircle, Loader2, RefreshCw
} from 'lucide-react';

export default function AgencySuperuserManager() {
  const [superusers, setSuperusers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testSendingId, setTestSendingId] = useState(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [telegramUserId, setTelegramUserId] = useState('');
  const [phone, setPhone] = useState('');
  const [agencyName, setAgencyName] = useState('EnMinutos (EM)');
  const [role, setRole] = useState('owner'); // 'owner' | 'manager'

  useEffect(() => {
    fetchSuperusers();
  }, []);

  async function fetchSuperusers() {
    setLoading(true);
    try {
      // 1. Intentar leer de la tabla dedicada
      let list = [];
      try {
        const { data, error } = await supabase
          .from('delivery_agency_superusers')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) {
          list = data;
        }
      } catch (tableErr) {
        console.warn('Tabla delivery_agency_superusers aún no creada en SQL, usando fallback:', tableErr);
      }

      // 2. Si la tabla está vacía o no existe, leer de platform_settings
      if (list.length === 0) {
        try {
          const { data: settingData } = await supabase
            .from('platform_settings')
            .select('value')
            .eq('key', 'delivery_agency_superusers')
            .maybeSingle();
          if (settingData && settingData.value) {
            list = JSON.parse(settingData.value);
          }
        } catch (setErr) {
          console.warn('Error leyendo platform_settings delivery_agency_superusers:', setErr);
        }
      }

      setSuperusers(list);
    } catch (e) {
      console.error('Error fetching superusers:', e);
    } finally {
      setLoading(false);
    }
  }

  async function syncSuperusers(newList) {
    // Sincronizar en platform_settings (garantía inmediata)
    try {
      await supabase.from('platform_settings').upsert({
        key: 'delivery_agency_superusers',
        value: JSON.stringify(newList)
      }, { onConflict: 'key' });
    } catch (e) {
      console.warn('No se pudo guardar en platform_settings:', e);
    }
  }

  async function handleAddSuperuser(e) {
    e.preventDefault();
    const cleanTgId = telegramUserId.trim().replace(/\D/g, '');
    const cleanName = fullName.trim();

    if (!cleanTgId) {
      alert('Debe ingresar un Telegram User ID numérico válido.');
      return;
    }
    if (!cleanName) {
      alert('Debe ingresar el nombre del directivo.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newRecord = {
        id: Date.now().toString(),
        telegram_user_id: cleanTgId,
        full_name: cleanName,
        phone: phone.trim() || null,
        agency_name: agencyName.trim() || 'EnMinutos (EM)',
        role: role || 'owner',
        is_active: true,
        alert_on_accidents: true,
        alert_on_delays: true,
        created_at: new Date().toISOString()
      };

      // Intentar guardar en la tabla SQL
      try {
        await supabase.from('delivery_agency_superusers').upsert([newRecord], { onConflict: 'telegram_user_id' });
      } catch (sqlErr) {
        console.warn('Tabla SQL no disponible, guardando en settings:', sqlErr);
      }

      // Guardar también en platform_settings
      const filtered = superusers.filter(u => u.telegram_user_id !== cleanTgId);
      const updated = [newRecord, ...filtered];
      await syncSuperusers(updated);

      setSuperusers(updated);
      setFullName('');
      setTelegramUserId('');
      setPhone('');
      alert(`✅ Superusuario "${cleanName}" registrado exitosamente con acceso gerencial.`);
    } catch (err) {
      console.error(err);
      alert('Error al registrar superusuario: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleActive(user) {
    const updatedStatus = !user.is_active;
    try {
      try {
        await supabase.from('delivery_agency_superusers').update({ is_active: updatedStatus }).eq('telegram_user_id', user.telegram_user_id);
      } catch (e) {}

      const updated = superusers.map(u => u.telegram_user_id === user.telegram_user_id ? { ...u, is_active: updatedStatus } : u);
      await syncSuperusers(updated);
      setSuperusers(updated);
    } catch (err) {
      alert('Error cambiando estado del directivo');
    }
  }

  async function handleDelete(user) {
    if (!window.confirm(`¿Seguro que deseas REVOCAR el acceso gerencial a "${user.full_name}"?`)) return;

    try {
      try {
        await supabase.from('delivery_agency_superusers').delete().eq('telegram_user_id', user.telegram_user_id);
      } catch (e) {}

      const updated = superusers.filter(u => u.telegram_user_id !== user.telegram_user_id);
      await syncSuperusers(updated);
      setSuperusers(updated);
      alert('Acceso gerencial revocado correctamente.');
    } catch (err) {
      alert('Error al eliminar superusuario');
    }
  }

  async function handleSendGreeting(user) {
    setTestSendingId(user.telegram_user_id);
    try {
      const greetingText = `👔 <b>¡HOLA ${user.full_name.toUpperCase()}!</b> 🚀\n\nHas sido registrado formalmente como <b>Superusuario / Dueño de ${user.agency_name}</b> en AxonMarket.\n\nYa tienes acceso directo a la <b>Consola Gerencial en Tiempo Real</b> de tu flota:\n• <code>/gerencia</code> o botón <b>📊 Resumen Hoy</b>\n• <code>/gerencia choferes</code> o botón <b>🛵 Flota en Vivo</b>\n• <code>/gerencia tiendas</code> o botón <b>🏬 Comercios Activos</b>\n• <code>/gerencia alertas</code> o botón <b>🚨 Novedades</b>\n\n<i>Escribe /gerencia aquí para abrir tu menú ejecutivo.</i>`;

      // 1. Intentar llamar a la Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      let sent = false;
      try {
        const edgeRes = await fetch(`${supabaseUrl}/functions/v1/telegram-bot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}` },
          body: JSON.stringify({
            type: 'superuser_greeting',
            telegramUserId: user.telegram_user_id,
            message: greetingText
          })
        });
        const edgeData = await edgeRes.json().catch(() => ({}));
        if (edgeData?.success) sent = true;
      } catch (e) {}

      // 2. Fallback Directo vía Telegram Bot API
      if (!sent) {
        const botToken = '8931657407:AAHJtYXikKfBtYowHHB0HBKhaRUskhyyfHo';
        const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: user.telegram_user_id,
            text: greetingText,
            parse_mode: 'HTML'
          })
        });
        const tgData = await tgRes.json().catch(() => ({}));
        if (tgData.ok) sent = true;
      }

      if (sent) {
        alert(`✅ Mensaje gerencial enviado exitosamente a ${user.full_name} por Telegram.`);
      } else {
        alert('⚠️ No se pudo entregar el mensaje. Verifica que el dueño haya iniciado conversación con @DeliveryAxonbot previamente.');
      }
    } catch (err) {
      alert('Error enviando mensaje: ' + err.message);
    } finally {
      setTestSendingId(null);
    }
  }

  return (
    <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 space-y-6">
      
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 shadow-sm">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white uppercase tracking-wider">
                Directores y Superusuarios de Agencia
              </h2>
              <span className="bg-amber-500/20 text-amber-400 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-500/30 uppercase tracking-widest">
                EnMinutos / EM
              </span>
            </div>
            <p className="text-zinc-400 text-xs sm:text-sm mt-0.5">
              Otorga control y monitoreo total del delivery en tiempo real dentro del Bot de Telegram.
            </p>
          </div>
        </div>

        <button 
          onClick={fetchSuperusers}
          className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors flex items-center justify-center gap-1.5 text-xs font-bold self-start sm:self-auto cursor-pointer"
          title="Refrescar lista"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Nota Explicativa */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3 text-xs sm:text-sm text-amber-200">
        <HelpCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">¿Cómo obtiene el dueño su Telegram ID?</span>
          <p className="text-zinc-300 text-xs mt-0.5">
            El dueño o director solo debe abrir el bot <b className="text-white">@DeliveryAxonbot</b> en Telegram y escribir <code className="bg-zinc-950 px-1.5 py-0.5 rounded text-amber-300 font-mono">/id_admin_axon</code> o <code className="bg-zinc-950 px-1.5 py-0.5 rounded text-amber-300 font-mono">/my_id</code>. El bot le devolverá su número de ID para pegarlo aquí.
          </p>
        </div>
      </div>

      {/* Formulario de Registro */}
      <form onSubmit={handleAddSuperuser} className="bg-zinc-950/60 border border-white/5 rounded-2xl p-4 sm:p-5 space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
          <UserPlus size={15} className="text-amber-400" />
          <span>Vincular Nuevo Directivo / Dueño</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] font-bold text-zinc-400 block mb-1">Nombre Completo *</label>
            <input 
              type="text"
              required
              placeholder="Ej. Director EnMinutos"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/60"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-zinc-400 block mb-1">Telegram User ID (Numérico) *</label>
            <input 
              type="text"
              required
              placeholder="Ej. 123456789"
              value={telegramUserId}
              onChange={e => setTelegramUserId(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500/60"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-zinc-400 block mb-1">Teléfono Móvil</label>
            <input 
              type="text"
              placeholder="Ej. 0424-1234567"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/60"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-zinc-400 block mb-1">Rol / Cargo</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/60 cursor-pointer"
            >
              <option value="owner">Dueño / Gerente General</option>
              <option value="manager">Supervisor Operativo</option>
              <option value="auditor">Auditor Financiero</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isSubmitting || !fullName || !telegramUserId}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-md shadow-amber-600/20 disabled:opacity-50 flex items-center gap-2 text-sm cursor-pointer"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            <span>Habilitar Acceso Gerencial</span>
          </button>
        </div>
      </form>

      {/* Lista de Superusuarios */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-3">
          Directores Habilitados ({superusers.length})
        </h3>

        {superusers.length === 0 ? (
          <div className="bg-zinc-950/40 border border-white/5 rounded-2xl p-8 text-center text-zinc-500 text-sm">
            No hay directores ni superusuarios de agencia registrados actualmente.
          </div>
        ) : (
          <div className="space-y-3">
            {superusers.map(user => {
              const isSending = testSendingId === user.telegram_user_id;
              return (
                <div 
                  key={user.telegram_user_id}
                  className="bg-zinc-950/70 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-amber-500/30 transition-all"
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                      user.is_active ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                    }`}>
                      {user.role === 'owner' ? '👑' : '👔'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-white text-sm sm:text-base">{user.full_name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                          user.is_active 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        }`}>
                          {user.is_active ? 'Activo' : 'Suspendido'}
                        </span>
                        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full border border-white/5 font-mono">
                          {user.agency_name || 'EnMinutos'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1 font-mono flex-wrap">
                        <span>ID Telegram: <b className="text-zinc-200">{user.telegram_user_id}</b></span>
                        {user.phone && <span>• Tel: {user.phone}</span>}
                        <span>• Cargo: {user.role === 'owner' ? 'Dueño General' : 'Supervisor'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                    <button
                      onClick={() => handleSendGreeting(user)}
                      disabled={isSending || !user.is_active}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-amber-400 hover:text-amber-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border border-white/5 cursor-pointer disabled:opacity-40"
                      title="Enviar mensaje de bienvenida y verificar canal de Telegram"
                    >
                      {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      <span>Probar Enlace</span>
                    </button>

                    <button
                      onClick={() => handleToggleActive(user)}
                      className={`p-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                        user.is_active 
                          ? 'bg-zinc-800 text-zinc-300 hover:text-amber-400 border-white/5' 
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                      title={user.is_active ? 'Suspender acceso' : 'Reactivar acceso'}
                    >
                      {user.is_active ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                    </button>

                    <button
                      onClick={() => handleDelete(user)}
                      className="p-2 bg-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer border border-white/5"
                      title="Eliminar superusuario"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
