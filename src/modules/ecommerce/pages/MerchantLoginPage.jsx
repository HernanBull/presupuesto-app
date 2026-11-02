import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Store, Lock, Mail, Eye, EyeOff, ArrowRight, ShieldCheck, 
  Sparkles, ShoppingBag, AlertCircle, Loader2, KeyRound 
} from 'lucide-react';
import { loginUser } from '../../../supabaseAuth';
import { supabase } from '../../../supabaseClient';
import toast from 'react-hot-toast';

export default function MerchantLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMessage('Por favor ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);
    try {
      const authData = await loginUser(cleanEmail, password);
      if (!authData?.user) {
        throw new Error('Credenciales inválidas. Verifica tu correo o contraseña.');
      }

      const userId = authData.user.id;

      // Buscar el workspace asociado a este usuario comerciante
      const { data: ws, error: wsError } = await supabase
        .from('workspaces')
        .select('id, name, store_slug, status')
        .eq('id', userId)
        .maybeSingle();

      const activeWsId = ws?.id || userId;
      const storeSlug = ws?.store_slug || 'mi-tienda';

      // Guardar credenciales de comerciante de forma limpia
      localStorage.setItem('activeWorkspace', activeWsId);
      localStorage.setItem('storeSlug', storeSlug);
      if (ws?.name) {
        localStorage.setItem('merchant_store_name', ws.name);
      }
      localStorage.setItem('merchant_onboarding_completed', 'true');

      // Regla de Exclusión Mutua: Limpiar sesión de cliente
      localStorage.removeItem('ecommerce_current_customer');
      localStorage.removeItem('ecommerce_user');

      toast.success(`¡Bienvenido de nuevo, ${ws?.name || 'Comerciante'}!`, { icon: '👋' });

      // Entrar directamente al POS o Dashboard del comercio
      navigate('/pos', { replace: true });
    } catch (err) {
      console.error('Error al iniciar sesión:', err);
      let msg = 'Error al iniciar sesión. Verifica tus credenciales.';
      if (err.message) {
        if (err.message.includes('Invalid login credentials')) {
          msg = 'Correo electrónico o contraseña incorrectos.';
        } else if (err.message.includes('Email not confirmed')) {
          msg = 'Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada o spam.';
        } else {
          msg = err.message;
        }
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast.error('Ingresa tu correo electrónico registrado.');
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/merchant/login`
      });
      if (error) throw error;
      setResetSuccess(true);
      toast.success('Enlace de recuperación enviado. Revisa tu correo.');
    } catch (err) {
      toast.error(err.message || 'Error enviando el correo de recuperación.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between selection:bg-amber-500/30 font-sans relative overflow-hidden">
      {/* Luces y brillo ambiental premium de fondo */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-amber-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-amber-600/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Barra superior con branding */}
      <header className="w-full px-6 py-5 flex items-center justify-between border-b border-zinc-900/80 bg-zinc-950/60 backdrop-blur-md z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center text-zinc-950 shadow-[0_0_15px_rgba(245,158,11,0.35)] font-black">
            <ShoppingBag size={18} className="stroke-[2.5]" />
          </div>
          <div>
            <span className="font-black text-sm tracking-[0.2em] text-white">AXON<span className="text-amber-500">MARKET</span></span>
            <span className="block text-[9px] font-bold tracking-widest text-amber-400 uppercase">Portal Comerciante</span>
          </div>
        </div>

        <Link
          to="/"
          className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5"
        >
          <span>Ir a la vitrina de compras</span>
          <ArrowRight size={14} />
        </Link>
      </header>

      {/* Contenedor Central de Login */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 z-10">
        <div className="w-full max-w-md bg-zinc-900/80 border border-zinc-800 rounded-3xl p-8 md:p-10 shadow-2xl backdrop-blur-xl relative">
          {/* Badge superior */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold tracking-wide">
              <Store size={14} />
              <span>Acceso a Negocios y POS</span>
            </div>
          </div>

          <h1 className="text-2xl font-black text-center text-white mb-2 tracking-tight">
            Iniciar Sesión
          </h1>
          <p className="text-xs text-zinc-400 text-center mb-8">
            Accede a tu punto de venta, inventario y catálogo de tu comercio
          </p>

          {errorMessage && (
            <div className="mb-6 p-3.5 bg-red-950/60 border border-red-800/80 rounded-2xl flex items-start gap-2.5 text-red-200 text-xs animate-in fade-in duration-200">
              <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@negocio.com"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-zinc-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => setIsResetOpen(true)}
                  className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium cursor-pointer"
                >
                  ¿La olvidaste?
                </button>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-2xl pl-11 pr-11 py-3.5 text-sm text-white placeholder-zinc-600 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-4 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-sm rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.35)] hover:shadow-[0_0_35px_rgba(245,158,11,0.5)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Entrando a tu Tienda...</span>
                </>
              ) : (
                <>
                  <span>Entrar a mi Panel</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Enlace para registrar nueva tienda */}
          <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
            <p className="text-xs text-zinc-400 mb-2.5">
              ¿Todavía no tienes tu comercio en AxonMarket?
            </p>
            <Link
              to="/registro-comerciante"
              className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
            >
              <Sparkles size={14} />
              <span>Registra tu negocio y obtén 7 días gratis</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Modal de Recuperación de Contraseña */}
      {isResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative">
            <h3 className="text-lg font-black text-white mb-2 flex items-center gap-2">
              <KeyRound size={20} className="text-amber-500" />
              Recuperar Contraseña
            </h3>
            <p className="text-xs text-zinc-400 mb-5">
              Ingresa el correo registrado con tu comercio para recibir un enlace seguro de restablecimiento.
            </p>

            {resetSuccess ? (
              <div className="p-4 bg-emerald-950/60 border border-emerald-800/80 rounded-2xl text-center">
                <p className="text-xs text-emerald-300 font-semibold mb-3">
                  ¡Correo enviado! Revisa tu bandeja de entrada o spam.
                </p>
                <button
                  onClick={() => { setIsResetOpen(false); setResetSuccess(false); }}
                  className="px-4 py-2 bg-emerald-500 text-zinc-950 rounded-xl text-xs font-bold"
                >
                  Entendido
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="ejemplo@negocio.com"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-500 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsResetOpen(false)}
                    className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    {resetLoading ? <Loader2 size={14} className="animate-spin" /> : 'Enviar Enlace'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer Mínimo */}
      <footer className="w-full py-4 text-center text-[11px] text-zinc-600 border-t border-zinc-900/60 z-10">
        © {new Date().getFullYear()} AxonMarket Venezuela • Portal de Comercios y Facturación POS
      </footer>
    </div>
  );
}
