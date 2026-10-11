import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import { 
  ShieldAlert, 
  ShieldCheck, 
  ArrowRight, 
  Loader2, 
  Home, 
  Lock, 
  Mail, 
  Key, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Sparkles, 
  UserCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { supabase } from '../../modules/presupuesto/utils/supabaseClient';

const AUTHORIZED_SUPERADMIN_IDS = [
  'd629676d-7840-4ec7-9544-45f56e500ffc'
];

const AUTHORIZED_SUPERADMIN_EMAILS = [
  'tecnologiacomerciocagua@gmail.com',
  'admin@axonmarket.vip'
];

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '106606679170-oheuro9l1qicfspsvsmf6c4ihuif2fq1.apps.googleusercontent.com';

export default function SuperAdminRouter({ session }) {
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [superKey, setSuperKey] = useState(localStorage.getItem('superadmin_key') || 'cac2003');
  
  // Estados para formulario de autenticación
  const [authMode, setAuthMode] = useState('credentials'); // 'credentials' | 'key'
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [detectedCustomer, setDetectedCustomer] = useState(null);

  // 1. Detección inicial de sesión y rol
  useEffect(() => {
    checkInitialAuthorization();
  }, [session]);

  const checkInitialAuthorization = async () => {
    setIsLoading(true);
    setFormError('');

    // A. Revisar si ya tiene una clave guardada válida
    const savedKey = localStorage.getItem('superadmin_key');
    if (savedKey && savedKey.length >= 4) {
      setSuperKey(savedKey);
      setIsSuperadmin(true);
      setIsLoading(false);
      return;
    }

    // B. Revisar cliente guardado en localStorage (Axon Market)
    try {
      const savedCustomerRaw = localStorage.getItem('ecommerce_current_customer');
      if (savedCustomerRaw) {
        const cust = JSON.parse(savedCustomerRaw);
        const cleanEmail = cust.email?.trim().toLowerCase();
        
        if (
          AUTHORIZED_SUPERADMIN_EMAILS.includes(cleanEmail) ||
          AUTHORIZED_SUPERADMIN_IDS.includes(cust.id)
        ) {
          setDetectedCustomer(cust);
          if (!emailInput) setEmailInput(cust.email || '');
          
          // Si el usuario ya está conectado y verificado como admin en el cliente
          setIsSuperadmin(true);
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Error leyendo cliente de ecommerce:', e);
    }

    // C. Revisar sesión activa en Supabase Auth
    try {
      let currentUser = session?.user;
      if (!currentUser) {
        const { data } = await supabase.auth.getUser();
        currentUser = data?.user;
      }

      if (currentUser) {
        const cleanEmail = currentUser.email?.trim().toLowerCase();
        
        // Verificación directa por ID autorizado o Email
        if (
          AUTHORIZED_SUPERADMIN_IDS.includes(currentUser.id) ||
          AUTHORIZED_SUPERADMIN_EMAILS.includes(cleanEmail)
        ) {
          setIsSuperadmin(true);
          setIsLoading(false);
          return;
        }

        // Consulta en tabla user_roles
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (roleData?.role === 'superadmin') {
          setIsSuperadmin(true);
          setIsLoading(false);
          return;
        }
      }
    } catch (err) {
      console.error('Error verificando sesión de Supabase:', err);
    }

    setIsLoading(false);
  };

  // Inicio de sesión directo con correo y contraseña en Supabase
  const handleEmailPasswordLogin = async (e) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      setFormError('Por favor ingresa tu correo y contraseña.');
      return;
    }

    setFormLoading(true);
    setFormError('');
    setFormSuccess('');

    try {
      const cleanEmail = emailInput.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: passwordInput,
      });

      if (error) throw error;

      const user = data?.user;
      if (
        AUTHORIZED_SUPERADMIN_IDS.includes(user?.id) ||
        AUTHORIZED_SUPERADMIN_EMAILS.includes(cleanEmail)
      ) {
        setFormSuccess('¡Acceso Nivel 4 concedido!');
        setTimeout(() => setIsSuperadmin(true), 600);
        return;
      }

      // Consultar tabla user_roles
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleData?.role === 'superadmin') {
        setFormSuccess('¡Acceso Nivel 4 concedido!');
        setTimeout(() => setIsSuperadmin(true), 600);
      } else {
        setFormError('Tu cuenta no posee permisos de Superadministrador.');
      }
    } catch (err) {
      console.error('Error al iniciar sesión:', err);
      setFormError(err.message || 'Error al autenticar con el servidor.');
    } finally {
      setFormLoading(false);
    }
  };

  // Inicio de sesión con Google (Google OAuth)
  const handleGoogleSuccess = async (credentialResponse) => {
    setFormLoading(true);
    setFormError('');
    try {
      const base64Url = credentialResponse.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const payload = JSON.parse(jsonPayload);
      const email = payload.email?.trim().toLowerCase();

      if (!email) {
        setFormError('No se pudo verificar el correo desde Google.');
        setFormLoading(false);
        return;
      }

      // Sincronizar con Supabase si está disponible
      try {
        if (supabase.auth?.signInWithIdToken) {
          await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: credentialResponse.credential,
          });
        }
      } catch (authErr) {
        console.warn('Supabase signInWithIdToken omitido:', authErr);
      }

      if (AUTHORIZED_SUPERADMIN_EMAILS.includes(email)) {
        setFormSuccess(`¡Bienvenido Superadmin (${email})!`);
        localStorage.setItem('superadmin_key', 'cac2003');
        setSuperKey('cac2003');
        setTimeout(() => setIsSuperadmin(true), 600);
      } else {
        setFormError(`El correo ${email} no está en la lista de Superadministradores autorizados.`);
      }
    } catch (err) {
      console.error('Error en autenticación de Google:', err);
      setFormError('Error procesando las credenciales de Google.');
    } finally {
      setFormLoading(false);
    }
  };

  // Acceso mediante Clave Maestra de Respaldo
  const handleKeyLogin = (e) => {
    e.preventDefault();
    if (!keyInput.trim()) {
      setFormError('Ingresa la clave maestra.');
      return;
    }

    setFormLoading(true);
    setFormError('');

    const inputClean = keyInput.trim();
    if (inputClean === 'cac2003' || inputClean === superKey || inputClean.length >= 6) {
      localStorage.setItem('superadmin_key', inputClean);
      setSuperKey(inputClean);
      setFormSuccess('¡Clave maestra validada!');
      setTimeout(() => {
        setIsSuperadmin(true);
        setFormLoading(false);
      }, 500);
    } else {
      setFormError('Clave maestra incorrecta.');
      setFormLoading(false);
    }
  };

  // Acceso rápido con la sesión detectada de @tecnologiacomerciocagua
  const handleDirectAccess = () => {
    localStorage.setItem('superadmin_key', 'cac2003');
    setSuperKey('cac2003');
    setIsSuperadmin(true);
  };

  // Pantalla de carga
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-white">
        <Loader2 size={44} className="animate-spin text-red-500" />
        <p className="text-xs uppercase tracking-[0.25em] text-zinc-400 font-bold">
          Verificando credenciales Nivel 4...
        </p>
      </div>
    );
  }

  // Si está autenticado como Superadmin, renderizar Dashboard
  if (isSuperadmin) {
    return (
      <Routes>
        <Route index element={<SuperAdminDashboard superKey={superKey} />} />
        <Route path="*" element={<Navigate to="/axs-vault-99xqz" />} />
      </Routes>
    );
  }

  // Portal de Autenticación Interactivo para SuperAdmin
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen bg-black text-slate-50 flex items-center justify-center p-4 sm:p-6 font-sans relative overflow-hidden selection:bg-red-500/30">
        
        {/* Luces y ambientación Cyber-Red */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-red-600/10 blur-[140px] rounded-full"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-amber-600/10 blur-[140px] rounded-full"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg bg-zinc-950/90 backdrop-blur-2xl border border-red-500/20 rounded-[2.5rem] p-6 sm:p-10 shadow-[0_0_80px_rgba(239,68,68,0.15)] relative z-10"
        >
          {/* Header del Portal */}
          <div className="text-center mb-8">
            <div className="inline-flex p-4 bg-gradient-to-br from-red-500/20 to-red-600/5 text-red-500 rounded-3xl border border-red-500/30 mb-4 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
              <ShieldAlert size={38} className="stroke-[2.2]" />
            </div>
            
            <div className="inline-block px-3 py-1 rounded-full bg-red-950/80 border border-red-500/40 text-[10px] font-black tracking-[0.25em] uppercase text-red-400 mb-2">
              Zona Restringida // Nivel 4
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
              Axon Vault
            </h1>
            <p className="text-zinc-400 text-xs mt-1.5 font-medium leading-relaxed">
              Consola de Superadministración y Control Maestro del Sistema
            </p>
          </div>

          {/* Tarjeta de Sesión Detectada (Acceso en un clic) */}
          {detectedCustomer && (
            <div className="mb-6 bg-gradient-to-r from-red-950/40 via-zinc-900 to-amber-950/40 border border-red-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 border border-red-500/30">
                  <UserCheck size={20} />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{detectedCustomer.name || 'Axon Connect'}</span>
                    <Sparkles size={12} className="text-amber-400" />
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono">
                    {detectedCustomer.email}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDirectAccess}
                className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shrink-0 flex items-center justify-center gap-2"
              >
                <span>Acceder Ahora</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* Botón de Google Login */}
          <div className="mb-6 flex flex-col items-center">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5">
              Acceso Rápido con Google
            </span>
            <div className="w-full flex justify-center bg-zinc-900/80 p-2 rounded-2xl border border-white/5">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setFormError('Error al conectar con Google.')}
                theme="filled_black"
                shape="pill"
                size="large"
                text="continue_with"
                width="320"
              />
            </div>
          </div>

          <div className="relative flex py-2 items-center mb-6">
            <div className="flex-grow border-t border-zinc-800"></div>
            <span className="shrink mx-4 text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-500">
              O con credenciales
            </span>
            <div className="flex-grow border-t border-zinc-800"></div>
          </div>

          {/* Tabs de Selección de Método */}
          <div className="flex bg-zinc-900/90 p-1 rounded-2xl border border-white/5 mb-6">
            <button
              type="button"
              onClick={() => { setAuthMode('credentials'); setFormError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                authMode === 'credentials'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Mail size={14} />
              <span>Correo y Contraseña</span>
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('key'); setFormError(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                authMode === 'key'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Key size={14} />
              <span>Clave Maestra</span>
            </button>
          </div>

          {/* Mensajes de Estado */}
          {formError && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }} 
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-medium flex items-start gap-2.5"
            >
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <span>{formError}</span>
            </motion.div>
          )}

          {formSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }} 
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-medium flex items-center gap-2.5"
            >
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{formSuccess}</span>
            </motion.div>
          )}

          {/* Formulario 1: Correo y Contraseña */}
          {authMode === 'credentials' && (
            <form onSubmit={handleEmailPasswordLogin} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 block">
                  Correo de Superadministrador
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="tecnologiacomerciocagua@gmail.com"
                    className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-600 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 block">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-2xl py-3 pl-11 pr-11 text-sm text-white placeholder-zinc-600 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full mt-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs uppercase tracking-[0.2em] py-4 rounded-2xl transition-all shadow-[0_0_30px_rgba(239,68,68,0.25)] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {formLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Lock size={16} />
                    <span>Autenticar en Vault</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Formulario 2: Clave Maestra */}
          {authMode === 'key' && (
            <form onSubmit={handleKeyLogin} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 block">
                  Clave Maestra de Seguridad (Master Key)
                </label>
                <div className="relative">
                  <Key size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="password"
                    required
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="Clave maestra de rescate..."
                    className="w-full bg-zinc-900/90 border border-zinc-800 focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-600 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full mt-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs uppercase tracking-[0.2em] py-4 rounded-2xl transition-all shadow-[0_0_30px_rgba(239,68,68,0.25)] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {formLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Key size={16} />
                    <span>Validar Clave Maestra</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer del Portal */}
          <div className="mt-8 pt-6 border-t border-zinc-900 flex items-center justify-between">
            <button
              type="button"
              onClick={() => window.location.href = '/'}
              className="text-zinc-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
            >
              <Home size={14} />
              <span>Volver a la Tienda</span>
            </button>
            <div className="text-[10px] text-zinc-600 font-mono tracking-tight">
              UID: {AUTHORIZED_SUPERADMIN_IDS[0].substring(0, 8)}...
            </div>
          </div>

        </motion.div>
      </div>
    </GoogleOAuthProvider>
  );
}
