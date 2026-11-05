import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Store, Lock, Mail, Eye, EyeOff, ArrowRight, 
  ShoppingBag, AlertCircle, Loader2, KeyRound 
} from 'lucide-react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { loginUser } from '../../../supabaseAuth';
import { supabase } from '../../../supabaseClient';
import toast from 'react-hot-toast';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '106606679170-oheuro9l1qicfspsvsmf6c4ihuif2fq1.apps.googleusercontent.com';

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

  // Iniciar sesión con Correo y Contraseña
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    let cleanEmail = email.trim().toLowerCase();
    // Normalizar automáticamente errores tipográficos comunes en dominios (ej: gmaill.com -> gmail.com)
    if (cleanEmail.endsWith('@gmaill.com')) {
      cleanEmail = cleanEmail.replace('@gmaill.com', '@gmail.com');
      setEmail(cleanEmail);
    } else if (cleanEmail.endsWith('@gmial.com')) {
      cleanEmail = cleanEmail.replace('@gmial.com', '@gmail.com');
      setEmail(cleanEmail);
    }

    if (!cleanEmail || !password) {
      setErrorMessage('Por favor ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);
    try {
      let authData = null;
      try {
        authData = await loginUser(cleanEmail, password);
      } catch (authErr) {
        console.warn('Supabase Auth login attempt notice:', authErr?.message);
      }

      // Buscar el workspace asociado a este usuario comerciante
      let ws = null;
      if (authData?.user?.id) {
        const { data: byId } = await supabase
          .from('workspaces')
          .select('*')
          .eq('id', authData.user.id)
          .maybeSingle();
        if (byId) ws = byId;
      }

      if (!ws) {
        const { data: byEmail } = await supabase
          .from('workspaces')
          .select('*')
          .ilike('config->>adminEmail', cleanEmail)
          .maybeSingle();

        if (byEmail) {
          const cfg = typeof byEmail.config === 'object' && byEmail.config !== null 
            ? byEmail.config 
            : JSON.parse(byEmail.config || '{}');
          
          // Si Supabase Auth no autenticó, verificar contra las credenciales del workspace
          if (!authData?.user) {
            const validPassword = cfg.adminPassword || cfg.adminPin;
            if (validPassword && validPassword !== password) {
              throw new Error('Contraseña incorrecta.');
            }
            // Si la contraseña no estaba guardada en el config, sincronizarla ahora
            if (!validPassword) {
              const updatedConfig = { ...cfg, adminPassword: password, adminPin: password };
              await supabase.from('workspaces').update({ config: updatedConfig }).eq('id', byEmail.id);
            }
          }
          ws = byEmail;
        }
      }

      if (!ws) {
        throw new Error('Correo electrónico o contraseña incorrectos.');
      }

      if (ws.status === 'Suspendido') {
        throw new Error('Esta tienda se encuentra temporalmente suspendida.');
      }

      const activeWsId = ws.id;
      const storeSlug = ws.store_slug || 'mi-tienda';

      // Guardar credenciales de comerciante de forma limpia
      localStorage.setItem('activeWorkspace', activeWsId);
      localStorage.setItem('storeSlug', storeSlug);
      if (ws.name) {
        localStorage.setItem('merchant_store_name', ws.name);
      }
      localStorage.setItem('merchant_onboarding_completed', 'true');

      // Regla de Exclusión Mutua: Limpiar sesión de cliente
      localStorage.removeItem('ecommerce_current_customer');
      localStorage.removeItem('ecommerce_user');

      toast.success(`¡Bienvenido de nuevo, ${ws.name || 'Comerciante'}!`, { icon: '👋' });

      // Entrar directamente al Inicio (Dashboard) del comercio
      const owner = ws.config?.ownerName || ws.config?.expediente?.ownerName || ws.config?.contact?.name || '';
      if (owner && owner.toLowerCase() !== (ws.name || '').toLowerCase()) {
        localStorage.setItem('merchant_owner_name', owner);
      }
      navigate('/dashboard', { replace: true });
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

  // Login con Google OAuth
  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const base64Url = credentialResponse.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      const payload = JSON.parse(jsonPayload);

      if (!payload.email) throw new Error('No se pudo obtener el correo de Google.');

      const cleanEmail = payload.email.trim().toLowerCase();
      setEmail(cleanEmail);

      // Buscar workspace asociado al correo de Google
      const { data: wsData } = await supabase
        .from('workspaces')
        .select('*')
        .ilike('config->>adminEmail', cleanEmail)
        .maybeSingle();

      if (wsData) {
        localStorage.setItem('activeWorkspace', wsData.id);
        localStorage.setItem('storeSlug', wsData.store_slug || '');
        if (wsData.name) {
          localStorage.setItem('merchant_store_name', wsData.name);
        }
        localStorage.setItem('merchant_onboarding_completed', 'true');
        localStorage.removeItem('ecommerce_current_customer');
        localStorage.removeItem('ecommerce_user');

        const googleOwner = wsData.config?.ownerName || wsData.config?.expediente?.ownerName || wsData.config?.contact?.name || payload.name || '';
        if (googleOwner && googleOwner.toLowerCase() !== wsData.name.toLowerCase()) {
          localStorage.setItem('merchant_owner_name', googleOwner);
        }

        toast.success(`¡Bienvenido de nuevo, ${wsData.name}!`, { icon: '👋' });
        navigate('/dashboard', { replace: true });
        return;
      }

      throw new Error('No se encontró una tienda asociada a este correo de Google. Por favor regístrate primero.');
    } catch (err) {
      console.error('Error Google OAuth:', err);
      setErrorMessage(err.message || 'Hubo un error autenticando con Google. Intenta con correo y contraseña.');
      setLoading(false);
    }
  };

  // Recuperación de Contraseña
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
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen bg-[#F4F6F9] text-zinc-900 flex items-center justify-center p-4 sm:p-8 font-sans select-none animate-in fade-in duration-200">
        
        {/* Tarjeta Blanca Centrada Idéntica a la Foto */}
        <div className="bg-white rounded-3xl sm:rounded-[2rem] p-7 sm:p-10 shadow-xl shadow-slate-200/70 border border-slate-200/80 max-w-[440px] w-full relative flex flex-col justify-between">
          
          <div>
            {/* Logo Oficial AxonMarket */}
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-sm shadow-orange-500/30">
                <ShoppingBag size={18} className="stroke-[2.5]" />
              </div>
              <span className="font-black text-2xl tracking-tight text-zinc-950 flex items-center">
                Axon<span className="text-orange-500 ml-0.5">Market</span>
              </span>
            </div>

            {/* Titular y Subtítulo de Login Normal */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight leading-tight">
              Inicia sesión
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 font-medium mt-1.5 mb-6">
              Gestiona tus productos, pedidos y ventas desde el panel central.
            </p>

            {/* Alerta de Error */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Formulario de Login */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Campo Email */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Email
                </label>
                <div className="relative rounded-xl border border-zinc-200 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all bg-white shadow-xs">
                  <Mail size={16} className="text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tucorreo@empresa.com"
                    className="w-full pl-10 pr-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 rounded-xl outline-none font-normal"
                    autoFocus
                  />
                </div>
              </div>

              {/* Campo Contraseña */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-zinc-700">
                    Contraseña
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsResetOpen(true)}
                    className="text-[11px] font-semibold text-orange-600 hover:underline cursor-pointer"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative rounded-xl border border-zinc-200 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all bg-white shadow-xs">
                  <Lock size={16} className="text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 rounded-xl outline-none font-normal"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors p-1 cursor-pointer"
                    title={showPassword ? 'Ocultar' : 'Mostrar'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1.5 font-normal">
                  Usa al menos 8 caracteres, con letras y números.
                </p>
              </div>

              {/* Botón Primario: ENTRAR */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-black text-sm sm:text-base shadow-md hover:shadow-lg hover:shadow-orange-500/20 transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Iniciando sesión...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              {/* Separador "o" */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-zinc-400 font-medium">o</span>
                </div>
              </div>

              {/* Botón Google OAuth */}
              <div className="w-full flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setErrorMessage('Error al conectar con Google.')}
                  theme="outline"
                  shape="pill"
                  size="large"
                  width="100%"
                  text="signin_with"
                />
              </div>

              {/* Texto Legal */}
              <p className="text-[11px] text-zinc-500 text-center leading-relaxed mt-4">
                Al continuar con tu correo o con Google, aceptas los{' '}
                <Link to="/legal/terminos" className="text-orange-600 hover:underline font-semibold">
                  términos
                </Link>{' '}
                y la{' '}
                <Link to="/legal/privacidad" className="text-orange-600 hover:underline font-semibold">
                  política de privacidad
                </Link>.
              </p>
            </form>
          </div>

          {/* Enlace Inferior a Registro */}
          <div className="text-center mt-6 pt-4 border-t border-zinc-100">
            <p className="text-xs text-zinc-600">
              ¿No tienes cuenta aún?{' '}
              <Link
                to="/registro-comerciante"
                className="text-orange-600 hover:text-orange-700 font-bold hover:underline"
              >
                Regístrate
              </Link>
            </p>
          </div>
        </div>

        {/* Modal de Recuperación de Contraseña */}
        {isResetOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative">
              <h3 className="text-lg font-black text-zinc-950 mb-2 flex items-center gap-2">
                <KeyRound size={20} className="text-orange-500" />
                Recuperar Contraseña
              </h3>
              <p className="text-xs text-zinc-500 mb-5 leading-relaxed">
                Ingresa el correo registrado con tu comercio para recibir un enlace seguro de restablecimiento.
              </p>

              {resetSuccess ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                  <p className="text-xs text-emerald-800 font-semibold mb-3">
                    ¡Correo enviado! Revisa tu bandeja de entrada o spam.
                  </p>
                  <button
                    onClick={() => { setIsResetOpen(false); setResetSuccess(false); }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
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
                    className="w-full bg-white border border-zinc-200 focus:border-orange-500 rounded-xl px-4 py-3 text-xs text-zinc-900 focus:outline-none shadow-xs"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsResetOpen(false)}
                      className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {resetLoading ? <Loader2 size={14} className="animate-spin" /> : 'Enviar Enlace'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </GoogleOAuthProvider>
  );
}
