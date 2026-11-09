import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Store, Lock, Mail, Eye, EyeOff, ArrowRight, 
  ShoppingBag, AlertCircle, Loader2, KeyRound, CheckCircle2, ShieldCheck, RefreshCw 
} from 'lucide-react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { loginUser } from '../../../supabaseAuth';
import { supabase } from '../../../supabaseClient';
import toast from 'react-hot-toast';
import { checkMerchantPlanStatus } from '../services/planSecurityService';
import MerchantPlanExpiredView from '../components/MerchantPlanExpiredView';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '106606679170-oheuro9l1qicfspsvsmf6c4ihuif2fq1.apps.googleusercontent.com';

export default function MerchantLoginPage() {
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const redirectTarget = searchParams.get('redirect') || '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState('email'); // 'email' | 'code'
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [expiredWorkspace, setExpiredWorkspace] = useState(null);

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

      // Si no encontró por id directo de usuario auth, buscar por emails en el workspace
      if (!ws) {
        const { data: allWs } = await supabase.from('workspaces').select('*').limit(100);
        
        if (allWs && allWs.length > 0) {
          // 1. Buscar coincidencia exacta o coincidencia en contact / expediente / onboarding
          const matchedWs = allWs.find(w => {
            const cfg = typeof w.config === 'object' && w.config !== null ? w.config : (typeof w.config === 'string' ? JSON.parse(w.config || '{}') : {});
            const adminE = (cfg.adminEmail || '').trim().toLowerCase();
            const contactE = (cfg.contact?.email || '').trim().toLowerCase();
            const genE = (cfg.email || '').trim().toLowerCase();
            const expE = (cfg.expediente?.email || '').trim().toLowerCase();
            const onbE = (cfg.onboarding?.email || '').trim().toLowerCase();

            // Coincidencia directa o coincidencia sin números/variantes
            const baseClean = cleanEmail.replace(/\d+@/, '@');
            const baseAdmin = adminE.replace(/\d+@/, '@');

            return adminE === cleanEmail || contactE === cleanEmail || genE === cleanEmail || expE === cleanEmail || onbE === cleanEmail || (baseClean && baseAdmin && baseClean === baseAdmin);
          });

          if (matchedWs) {
            const cfg = typeof matchedWs.config === 'object' && matchedWs.config !== null 
              ? matchedWs.config 
              : JSON.parse(matchedWs.config || '{}');
            
            const validPassword = cfg.adminPassword || cfg.generatedPassword || cfg.adminPin;

            // Si Supabase Auth autenticó con éxito, aceptamos de inmediato
            if (authData?.user) {
              ws = matchedWs;
            } else if (validPassword) {
              if (validPassword === password) {
                ws = matchedWs;
              } else {
                // Verificar si coincide con la contraseña registrada en ecommerce_customers
                const { data: custCheck } = await supabase
                  .from('ecommerce_customers')
                  .select('password')
                  .ilike('email', cleanEmail)
                  .maybeSingle();
                if (custCheck && custCheck.password === password) {
                  ws = matchedWs;
                  // Sincronizar credenciales en el workspace
                  const updatedConfig = { 
                    ...cfg, 
                    adminPassword: password, 
                    generatedPassword: password, 
                    adminPin: password, 
                    adminEmail: cleanEmail 
                  };
                  await supabase.from('workspaces').update({ config: updatedConfig }).eq('id', matchedWs.id);
                } else {
                  throw new Error('Contraseña incorrecta.');
                }
              }
            } else {
              // Si la contraseña no estaba guardada en config, validar contra ecommerce_customers o sincronizarla
              const { data: custCheck } = await supabase
                .from('ecommerce_customers')
                .select('password')
                .ilike('email', cleanEmail)
                .maybeSingle();
              if (custCheck && custCheck.password && custCheck.password !== password) {
                throw new Error('Contraseña incorrecta.');
              }
              const updatedConfig = { 
                ...cfg, 
                adminPassword: password, 
                generatedPassword: password, 
                adminPin: password, 
                adminEmail: cleanEmail 
              };
              await supabase.from('workspaces').update({ config: updatedConfig }).eq('id', matchedWs.id);
              ws = matchedWs;
            }
          }
        }
      }

      // Si aún no hay workspace, verificar si es un comerciante/usuario en ecommerce_customers
      if (!ws) {
        const { data: customerRecord } = await supabase
          .from('ecommerce_customers')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (customerRecord) {
          if (customerRecord.password && customerRecord.password !== password && customerRecord.password !== 'SUPABASE_AUTH' && customerRecord.password !== 'GOOGLE_AUTH') {
            throw new Error('Contraseña incorrecta.');
          }

          // Si la contraseña coincide (o authData autenticó), vincular con el workspace de la tienda
          const { data: allWsFallback } = await supabase.from('workspaces').select('*').limit(50);
          if (allWsFallback && allWsFallback.length > 0) {
            // Buscar por customerRecord.workspace_id o el primer workspace disponible
            const targetWs = allWsFallback.find(w => w.id === customerRecord.workspace_id) || allWsFallback[0];
            if (targetWs) {
              ws = targetWs;
              const cfg = typeof ws.config === 'object' && ws.config !== null ? ws.config : JSON.parse(ws.config || '{}');
              const updatedConfig = {
                ...cfg,
                adminEmail: cleanEmail,
                adminPassword: password,
                generatedPassword: password,
                adminPin: password
              };
              await supabase.from('workspaces').update({ config: updatedConfig }).eq('id', ws.id);
              try {
                await supabase.from('ecommerce_customers').update({ workspace_id: ws.id, is_merchant: true }).eq('id', customerRecord.id);
              } catch (_) {}
            }
          }
        }
      }

      if (!ws) {
        throw new Error('Correo electrónico o contraseña incorrectos.');
      }

      if (ws.status === 'Suspendido') {
        throw new Error('Esta tienda se encuentra temporalmente suspendida.');
      }

      // Verificación estricta de Vencimiento de Prueba VIP (7 Días) o Suscripción
      const planStatus = checkMerchantPlanStatus(ws);
      if (planStatus.isExpired) {
        setExpiredWorkspace(ws);
        setLoading(false);
        return;
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
      navigate(redirectTarget, { replace: true });
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
        // Verificación estricta de Vencimiento de Prueba VIP (7 Días) o Suscripción
        const planStatus = checkMerchantPlanStatus(wsData);
        if (planStatus.isExpired) {
          setExpiredWorkspace(wsData);
          setLoading(false);
          return;
        }

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
        navigate(redirectTarget, { replace: true });
        return;
      }

      throw new Error('No se encontró una tienda asociada a este correo de Google. Por favor regístrate primero.');
    } catch (err) {
      console.error('Error Google OAuth:', err);
      setErrorMessage(err.message || 'Hubo un error autenticando con Google. Intenta con correo y contraseña.');
      setLoading(false);
    }
  };

  // Recuperación de Contraseña - Paso 1: Enviar Código OTP por Correo
  const handlePasswordReset = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanEmail = resetEmail.trim().toLowerCase();
    if (!cleanEmail) {
      toast.error('Ingresa tu correo electrónico registrado.');
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/merchant/login`
      });
      if (error) throw error;
      setResetStep('code');
      toast.success('¡Código enviado! Revisa tu bandeja de entrada o spam.', { icon: '📩' });
    } catch (err) {
      console.error('Error enviando correo de recuperación:', err);
      toast.error(err.message || 'Error enviando el correo de recuperación.');
    } finally {
      setResetLoading(false);
    }
  };

  // Recuperación de Contraseña - Paso 2: Verificar Código OTP y Asignar Nueva Contraseña
  const handleVerifyAndResetPassword = async (e) => {
    e.preventDefault();
    const cleanEmail = resetEmail.trim().toLowerCase();
    const cleanCode = (resetCode || '').trim().replace(/\s+/g, '');

    if (!cleanCode) {
      toast.error('Por favor ingresa el código recibido en tu correo.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }

    setResetLoading(true);
    try {
      // 1. Verificar OTP de tipo 'recovery'
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanCode,
        type: 'recovery'
      });
      if (verifyError) throw verifyError;

      // 2. Actualizar contraseña del usuario en Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (updateError) throw updateError;

      // 3. Sincronizar contraseña en el config del workspace si existe
      try {
        const { data: ws } = await supabase
          .from('workspaces')
          .select('id, config')
          .ilike('config->>adminEmail', cleanEmail)
          .maybeSingle();

        if (ws) {
          const updatedConfig = {
            ...(ws.config || {}),
            adminPassword: newPassword,
            adminPin: newPassword.length === 4 ? newPassword : (ws.config?.adminPin || '')
          };
          await supabase
            .from('workspaces')
            .update({ config: updatedConfig })
            .eq('id', ws.id);
        }
      } catch (wsErr) {
        console.warn('Sync ws config pass error (ignorable):', wsErr);
      }

      setResetSuccess(true);
      toast.success('¡Contraseña restablecida con éxito!', { icon: '🎉' });
      setEmail(cleanEmail);
      setPassword(newPassword);

      setTimeout(() => {
        setIsResetOpen(false);
        setResetStep('email');
        setResetSuccess(false);
        setResetCode('');
        setNewPassword('');
        setConfirmNewPassword('');
      }, 2200);
    } catch (err) {
      console.error('Error al restablecer contraseña:', err);
      let msg = err.message || 'Código inválido o expirado. Por favor verifica.';
      if (msg.includes('Token has expired or is invalid')) {
        msg = 'El código es inválido o ha expirado. Por favor solicita uno nuevo.';
      }
      toast.error(msg);
    } finally {
      setResetLoading(false);
    }
  };

  if (expiredWorkspace) {
    return (
      <MerchantPlanExpiredView 
        workspace={expiredWorkspace} 
        onClose={() => setExpiredWorkspace(null)} 
        onLogout={() => setExpiredWorkspace(null)} 
      />
    );
  }

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
                    onClick={() => {
                      setIsResetOpen(true);
                      setResetStep('email');
                      setResetSuccess(false);
                      setResetCode('');
                      setNewPassword('');
                      setConfirmNewPassword('');
                      if (email.trim()) setResetEmail(email.trim());
                    }}
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

        {/* Modal de Recuperación de Contraseña en 2 Pasos */}
        {isResetOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={(e) => {
              if (resetStep === 'code' || resetLoading) return;
              if (e.target === e.currentTarget) setIsResetOpen(false);
            }}
          >
            <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-black text-zinc-950 flex items-center gap-2">
                  <KeyRound size={20} className="text-orange-500" />
                  {resetStep === 'email' ? 'Recuperar Contraseña' : 'Nueva Contraseña'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsResetOpen(false)}
                  className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 flex items-center justify-center transition-colors cursor-pointer text-sm font-bold"
                  title="Cerrar"
                >
                  ✕
                </button>
              </div>

              {resetSuccess ? (
                <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3 animate-in fade-in">
                  <CheckCircle2 size={40} className="text-emerald-600 mx-auto" />
                  <h4 className="text-sm font-extrabold text-emerald-900">
                    ¡Contraseña Actualizada!
                  </h4>
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    Tu nueva contraseña ya está activa. Tus campos de acceso han sido completados para entrar de inmediato.
                  </p>
                  <button
                    onClick={() => { setIsResetOpen(false); setResetSuccess(false); }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
                  >
                    Entendido e Iniciar Sesión
                  </button>
                </div>
              ) : resetStep === 'email' ? (
                /* PASO 1: Ingreso de correo */
                <div>
                  <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
                    Ingresa el correo registrado con tu comercio. Te enviaremos un código de seguridad para validar tu identidad.
                  </p>

                  <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1.5">
                        Correo Electrónico
                      </label>
                      <div className="relative rounded-xl border border-zinc-200 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all bg-white shadow-xs">
                        <Mail size={16} className="text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="email"
                          required
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="ejemplo@negocio.com"
                          className="w-full pl-10 pr-4 py-3 text-xs text-zinc-900 focus:outline-none rounded-xl"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
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
                        className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                      >
                        {resetLoading ? <Loader2 size={14} className="animate-spin" /> : 'Enviar Código'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* PASO 2: Ingreso de Código OTP y Nueva Contraseña */
                <div>
                  <div className="bg-orange-50 border border-orange-200/80 rounded-2xl p-3 mb-4 text-xs text-orange-950 flex items-start gap-2.5">
                    <Mail size={16} className="text-orange-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">Código enviado a:</p>
                      <p className="font-mono text-[11px] text-orange-700 truncate">{resetEmail}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setResetStep('email')}
                      className="text-[10px] font-bold text-orange-700 underline hover:text-orange-900 shrink-0 cursor-pointer"
                    >
                      Cambiar
                    </button>
                  </div>

                  <form onSubmit={handleVerifyAndResetPassword} className="space-y-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        Código de Recuperación (OTP)
                      </label>
                      <input
                        type="text"
                        required
                        autoFocus
                        autoComplete="one-time-code"
                        value={resetCode}
                        onChange={(e) => setResetCode(e.target.value)}
                        placeholder="Ej. 123456"
                        className="w-full px-4 py-2.5 text-center tracking-widest font-mono text-base font-black border border-zinc-200 focus:border-orange-500 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        Nueva Contraseña
                      </label>
                      <div className="relative rounded-xl border border-zinc-200 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all bg-white shadow-xs">
                        <Lock size={15} className="text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          className="w-full pl-9 pr-9 py-2.5 text-xs text-zinc-900 focus:outline-none rounded-xl"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        Confirmar Nueva Contraseña
                      </label>
                      <div className="relative rounded-xl border border-zinc-200 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all bg-white shadow-xs">
                        <Lock size={15} className="text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="Repite la contraseña"
                          className="w-full pl-9 pr-4 py-2.5 text-xs text-zinc-900 focus:outline-none rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="pt-2 space-y-2">
                      <button
                        type="submit"
                        disabled={resetLoading}
                        className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-orange-500/20"
                      >
                        {resetLoading ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Validando código...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck size={16} />
                            <span>Restablecer Contraseña</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <button
                          type="button"
                          disabled={resetLoading}
                          onClick={handlePasswordReset}
                          className="text-orange-600 hover:text-orange-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <RefreshCw size={12} />
                          <span>Reenviar código</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsResetOpen(false)}
                          className="text-zinc-400 hover:text-zinc-600 font-medium cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </GoogleOAuthProvider>
  );
}
