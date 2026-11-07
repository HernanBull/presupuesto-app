import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, Lock, User, Eye, EyeOff, ArrowRight, ArrowLeft, 
  X, ShoppingBag, AlertCircle, CheckCircle2, Loader2, Store 
} from 'lucide-react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { supabase } from '../../../supabaseClient';
import { loginUser, registerUser } from '../../../supabaseAuth';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '106606679170-oheuro9l1qicfspsvsmf6c4ihuif2fq1.apps.googleusercontent.com';

function PasswordStrengthBar({ password = '' }) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) || /[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password) || (/[A-Z]/.test(password) && /[0-9]/.test(password))) score += 1;

  let label = 'Débil';
  let color = 'bg-red-500 text-red-600';
  let width = 'w-1/4';

  if (score === 2) {
    label = 'Aceptable';
    color = 'bg-amber-500 text-amber-600';
    width = 'w-2/4';
  } else if (score === 3) {
    label = 'Buena';
    color = 'bg-emerald-500 text-emerald-600';
    width = 'w-3/4';
  } else if (score >= 4) {
    label = 'Segura y fuerte';
    color = 'bg-emerald-600 text-emerald-600';
    width = 'w-full';
  }

  return (
    <div className="mt-1.5 space-y-1">
      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
        <div className={`h-full transition-all duration-300 ${width} ${color.split(' ')[0]}`} />
      </div>
      <div className="flex justify-between items-center text-[10px] font-bold">
        <span className="text-slate-400">Seguridad:</span>
        <span className={color.split(' ')[1]}>{label}</span>
      </div>
    </div>
  );
}

export default function CustomerAuthModal({ 
  isOpen = false, 
  onClose, 
  initialMode = 'login', 
  onSuccess,
  storeName = '' 
}) {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState(initialMode); // 'login' | 'register' | 'recover' | 'reset'
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form Fields
  const [name, setName] = useState('');
  const [emailOrDoc, setEmailOrDoc] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Recovery Fields
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAuthMode(initialMode);
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  // Helper para mapear y normalizar el perfil de cliente
  const normalizeAndSaveCustomer = (rawCustomer, authUserId) => {
    let safePaymentProfiles = [];
    if (rawCustomer?.payment_profile) {
      if (Array.isArray(rawCustomer.payment_profile)) {
        safePaymentProfiles = rawCustomer.payment_profile;
      } else if (typeof rawCustomer.payment_profile === 'object' && Object.keys(rawCustomer.payment_profile).length > 0) {
        safePaymentProfiles = [rawCustomer.payment_profile];
      } else if (typeof rawCustomer.payment_profile === 'string') {
        try {
          const p = JSON.parse(rawCustomer.payment_profile);
          safePaymentProfiles = Array.isArray(p) ? p : [p];
        } catch {}
      }
    }

    let safeAddresses = [];
    if (rawCustomer?.addresses) {
      if (Array.isArray(rawCustomer.addresses)) {
        safeAddresses = rawCustomer.addresses;
      } else if (typeof rawCustomer.addresses === 'string') {
        try { safeAddresses = JSON.parse(rawCustomer.addresses); } catch {}
      }
    }

    let safeFavorites = [];
    if (rawCustomer?.favorites) {
      if (Array.isArray(rawCustomer.favorites)) {
        safeFavorites = rawCustomer.favorites;
      } else if (typeof rawCustomer.favorites === 'string') {
        try { safeFavorites = JSON.parse(rawCustomer.favorites); } catch {}
      }
    }

    const cleanUser = rawCustomer ? {
      ...rawCustomer,
      id: rawCustomer.id || authUserId,
      docId: rawCustomer.doc_id || rawCustomer.docId || '',
      addresses: safeAddresses,
      payment_profile: safePaymentProfiles,
      favorites: safeFavorites,
      wishlist: Array.isArray(rawCustomer.wishlist) ? rawCustomer.wishlist : [],
      orders: []
    } : {
      id: authUserId,
      email: emailOrDoc.trim().toLowerCase(),
      name: name.trim() || emailOrDoc.split('@')[0],
      doc_id: '',
      docId: '',
      phone: '',
      address: '',
      addresses: [],
      payment_profile: [],
      favorites: [],
      wishlist: [],
      orders: []
    };

    localStorage.setItem('ecommerce_current_customer', JSON.stringify(cleanUser));
    localStorage.removeItem('activeWorkspace');
    return cleanUser;
  };

  // Manejo de Registro
  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanEmail = emailOrDoc.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Ingresa un correo electrónico válido.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    if (!termsAccepted) {
      setErrorMessage('Debes aceptar los Términos de Uso y la Política de Privacidad.');
      return;
    }

    setLoading(true);
    try {
      await supabase.auth.signOut();

      // Verificar nombre de usuario existente
      const finalName = cleanName || cleanEmail.split('@')[0];
      const { data: existingName } = await supabase
        .from('ecommerce_customers')
        .select('id')
        .ilike('name', finalName)
        .maybeSingle();

      if (existingName) {
        setErrorMessage('Este nombre de usuario ya está registrado por otra persona. Por favor, elige uno distinto.');
        setLoading(false);
        return;
      }

      const authData = await registerUser(cleanEmail, password, { name: finalName });

      if (authData?.user?.identities && authData.user.identities.length === 0) {
        setErrorMessage('Este correo ya está registrado en nuestra plataforma. Por favor, inicia sesión.');
        setAuthMode('login');
        setLoading(false);
        return;
      }

      const newCustomer = {
        id: authData.user.id,
        name: finalName,
        email: cleanEmail,
        password: 'SUPABASE_AUTH',
        doc_id: '',
        phone: '',
        address: '',
        status: 'Activo',
        join_date: new Date().toISOString()
      };

      const { error: insertErr } = await supabase.from('ecommerce_customers').insert([newCustomer]);
      if (insertErr && insertErr.code !== '23505') throw insertErr;

      // Si Supabase requiere verificación de correo
      if (!authData?.session) {
        setSuccessMessage('¡Registro exitoso! Por favor revisa tu bandeja de entrada o spam para confirmar tu correo electrónico.');
        setAuthMode('login');
        setLoading(false);
        return;
      }

      const user = normalizeAndSaveCustomer(newCustomer, authData.user.id);
      if (onSuccess) onSuccess(user);
      if (onClose) onClose();
    } catch (err) {
      console.error('Error al registrarse:', err);
      let msg = err.message || 'Error al registrar la cuenta.';
      if (msg.includes('For security purposes, you can only request this after')) {
        msg = 'Por seguridad anti-spam, debes esperar 1 minuto antes de volver a intentarlo.';
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // Manejo de Inicio de Sesión
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const rawIdentifier = emailOrDoc.trim();
    if (!rawIdentifier || !password) {
      setErrorMessage('Por favor ingresa tu correo (o cédula) y contraseña.');
      return;
    }

    setLoading(true);
    try {
      let targetEmail = rawIdentifier.toLowerCase();
      let matchedCustomer = null;

      // Si el cliente ingresó cédula / RIF
      if (!rawIdentifier.includes('@')) {
        const cleanDocInput = rawIdentifier.replace(/[^0-9]/g, '');
        const { data: byDoc } = await supabase
          .from('ecommerce_customers')
          .select('*')
          .or(`doc_id.eq.${cleanDocInput},doc_id.ilike.%${cleanDocInput}%`)
          .maybeSingle();

        if (byDoc) {
          matchedCustomer = byDoc;
          if (byDoc.email) {
            targetEmail = byDoc.email.toLowerCase();
          }
        } else {
          setErrorMessage('No encontramos ninguna cuenta registrada con esa cédula.');
          setLoading(false);
          return;
        }
      }

      let authData = null;
      try {
        authData = await loginUser(targetEmail, password);
      } catch (authErr) {
        // Fallback: si el cliente tiene contraseña directa en ecommerce_customers
        if (!matchedCustomer) {
          const { data: byEmail } = await supabase
            .from('ecommerce_customers')
            .select('*')
            .ilike('email', targetEmail)
            .maybeSingle();
          matchedCustomer = byEmail;
        }

        if (matchedCustomer && matchedCustomer.password === password) {
          authData = { user: { id: matchedCustomer.id, email: matchedCustomer.email || targetEmail } };
        } else {
          throw authErr;
        }
      }

      // Buscar datos completos en ecommerce_customers
      let { data: customerData } = await supabase
        .from('ecommerce_customers')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (!customerData) {
        if (matchedCustomer) {
          customerData = matchedCustomer;
        } else {
          const { data: byEmail } = await supabase
            .from('ecommerce_customers')
            .select('*')
            .ilike('email', targetEmail)
            .maybeSingle();
          if (byEmail) {
            customerData = byEmail;
            await supabase.from('ecommerce_customers').update({ id: authData.user.id }).eq('email', targetEmail);
          }
        }
      }

      const user = normalizeAndSaveCustomer(customerData, authData.user.id);
      if (onSuccess) onSuccess(user);
      if (onClose) onClose();
    } catch (err) {
      console.error('Error de login:', err);
      let msg = 'Credenciales inválidas. Revisa tu correo/cédula y contraseña.';
      if (err.message && err.message.includes('Invalid login credentials')) {
        msg = 'Correo electrónico o contraseña incorrectos.';
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // Login con Google
  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const base64Url = credentialResponse.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const payload = JSON.parse(jsonPayload);
      const { email: gEmail, name: gName, picture: gPic } = payload;

      if (!gEmail) throw new Error('No se pudo obtener el email de Google.');

      const cleanEmail = gEmail.trim().toLowerCase();

      try {
        if (supabase.auth?.signInWithIdToken) {
          await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: credentialResponse.credential,
          });
        }
      } catch (authErr) {
        console.warn('Supabase signInWithIdToken ignorado:', authErr);
      }

      let { data: userRecord } = await supabase
        .from('ecommerce_customers')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      let isNew = false;
      if (!userRecord) {
        isNew = true;
        const id = 'CUS-' + Math.floor(Math.random() * 1000000);
        const randomPassNum = Math.floor(1000 + Math.random() * 9000);
        const generatedPassword = `Axon${randomPassNum}`;
        const newUser = {
          id,
          email: cleanEmail,
          password: generatedPassword,
          name: gName || cleanEmail.split('@')[0],
          profile_pic: gPic || '',
          phone: '',
          doc_id: '',
          address: '',
          wishlist: [],
          join_date: new Date().toISOString()
        };

        const { error: insertErr } = await supabase.from('ecommerce_customers').insert([newUser]);
        if (insertErr) {
          const { data: retryUser } = await supabase
            .from('ecommerce_customers')
            .select('*')
            .ilike('email', cleanEmail)
            .maybeSingle();
          userRecord = retryUser || newUser;
        } else {
          userRecord = newUser;
        }

        supabase.functions.invoke('send-welcome-email', {
          body: { email: userRecord.email, name: userRecord.name }
        }).catch(() => {});
      }

      const finalUser = normalizeAndSaveCustomer({
        ...userRecord,
        auth_provider: 'google',
        is_verified: true,
        status: 'Activo'
      }, userRecord.id);

      finalUser._isNewGoogleUser = isNew;

      if (onSuccess) onSuccess(finalUser);
      if (onClose) onClose();
    } catch (err) {
      console.error('Error Google OAuth:', err);
      setErrorMessage('Hubo un error autenticando con Google. Intenta con correo y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  // Solicitar recuperación de contraseña
  const handleRecoverPassword = async (e) => {
    e.preventDefault();
    const cleanEmail = emailOrDoc.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Ingresa tu correo electrónico registrado para enviarte el código.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      if (error) throw error;

      setSuccessMessage('Se ha enviado un código de recuperación a tu correo electrónico.');
      setAuthMode('reset');
    } catch (err) {
      setErrorMessage(err.message || 'Error al solicitar el código de recuperación.');
    } finally {
      setLoading(false);
    }
  };

  // Restablecer contraseña con código OTP
  const handleResetPassword = async (e) => {
    e.preventDefault();
    const cleanEmail = emailOrDoc.trim().toLowerCase();

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    const cleanToken = (recoveryCode || '').trim().replace(/\s+/g, '');

    setLoading(true);
    setErrorMessage('');
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        if (!cleanToken) {
          setErrorMessage('Ingresa el código de recuperación recibido en tu correo.');
          setLoading(false);
          return;
        }

        const { error: verifyError } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanToken,
          type: 'recovery'
        });
        if (verifyError) throw verifyError;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      // Sincronizar en ecommerce_customers
      if (cleanEmail) {
        await supabase
          .from('ecommerce_customers')
          .update({ password: newPassword })
          .ilike('email', cleanEmail)
          .catch(() => {});
      }

      setSuccessMessage('¡Contraseña actualizada con éxito! Inicia sesión con tu nueva clave.');
      setRecoveryCode('');
      setNewPassword('');
      await supabase.auth.signOut();
      setAuthMode('login');
    } catch (err) {
      setErrorMessage(err.message || 'Error al restablecer la contraseña. Verifica el código.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
        
        {/* Fondo translúcido suave */}
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm" 
          onClick={() => !loading && onClose && onClose()} 
        />

        {/* Tarjeta Blanca Centrada (Mismo formato y estética que MerchantTrialAuthModal) */}
        <div className="bg-white rounded-3xl sm:rounded-[2rem] p-6 sm:p-9 shadow-2xl shadow-slate-200/80 border border-slate-200/80 max-w-[440px] w-full relative z-10 overflow-y-auto max-h-[92vh] scrollbar-hide animate-in zoom-in-95 duration-200 select-none">
          
          {/* Cabecera con Logo Oficial AxonMarket */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-sm shadow-orange-500/30">
                <ShoppingBag size={18} className="stroke-[2.5]" />
              </div>
              <span className="font-black text-xl tracking-tight text-zinc-950 flex items-center">
                Axon<span className="text-orange-500 ml-0.5">Market</span>
              </span>
            </div>
            
            {onClose && (
              <button 
                type="button" 
                onClick={onClose}
                className="text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full p-1.5 transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Botón Volver si está en Recuperación */}
          {(authMode === 'recover' || authMode === 'reset') && (
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setErrorMessage(''); setSuccessMessage(''); }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 mb-3 transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Volver al inicio de sesión</span>
            </button>
          )}

          {/* Titular y Subtítulo */}
          <h2 className="text-2xl font-extrabold text-zinc-950 tracking-tight leading-tight">
            {authMode === 'login' 
              ? (storeName ? `Accede a ${storeName}` : 'Inicia sesión') 
              : authMode === 'register' 
              ? 'Crea tu cuenta de cliente' 
              : authMode === 'recover' 
              ? 'Recuperar contraseña' 
              : 'Nueva contraseña'}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 font-medium mt-1 mb-5 leading-relaxed">
            {authMode === 'login' 
              ? 'Accede para comprar, ver tus pedidos y tus comercios favoritos.' 
              : authMode === 'register' 
              ? 'Únete a AxonMarket para comprar con Pago Móvil directo y delivery.' 
              : authMode === 'recover' 
              ? 'Ingresa tu correo registrado para recibir las instrucciones de recuperación.' 
              : 'Ingresa el código que te enviamos y escribe tu nueva contraseña.'}
          </p>

          {/* Alertas de Error o Éxito */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Selector Segmentado de Pestañas (Idéntico al estilo corporativo) */}
          {authMode !== 'recover' && authMode !== 'reset' && (
            <div className="flex bg-zinc-100 rounded-full p-1 mb-5 border border-zinc-200 shadow-inner">
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setErrorMessage(''); setSuccessMessage(''); }}
                className={`flex-1 py-2.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                  authMode === 'login'
                    ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('register'); setErrorMessage(''); setSuccessMessage(''); }}
                className={`flex-1 py-2.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                  authMode === 'register'
                    ? 'bg-white text-zinc-950 shadow-sm border border-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                Crear Cuenta
              </button>
            </div>
          )}

          {/* FORMULARIO DE RECUPERACIÓN / RESET */}
          {authMode === 'recover' || authMode === 'reset' ? (
            <form onSubmit={authMode === 'recover' ? handleRecoverPassword : handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Correo Electrónico
                </label>
                <div className="relative rounded-xl border border-zinc-200 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all bg-white shadow-xs">
                  <Mail size={16} className="text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input 
                    type="email" 
                    required 
                    value={emailOrDoc} 
                    onChange={e => setEmailOrDoc(e.target.value)} 
                    disabled={authMode === 'reset'} 
                    placeholder="tu@correo.com" 
                    className="w-full pl-10 pr-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 rounded-xl outline-none font-normal"
                    autoFocus
                  />
                </div>
              </div>

              {authMode === 'reset' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                      Código de Recuperación
                    </label>
                    <input 
                      type="text" 
                      value={recoveryCode} 
                      onChange={e => setRecoveryCode(e.target.value)} 
                      placeholder="Ej. 10669615" 
                      className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm font-mono tracking-wider text-zinc-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                      Nueva Contraseña
                    </label>
                    <div className="relative rounded-xl border border-zinc-200 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all bg-white shadow-xs">
                      <Lock size={16} className="text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input 
                        type={showNewPassword ? 'text' : 'password'} 
                        required 
                        value={newPassword} 
                        onChange={e => setNewPassword(e.target.value)} 
                        placeholder="••••••••" 
                        className="w-full pl-10 pr-11 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 rounded-xl outline-none font-normal"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowNewPassword(!showNewPassword)} 
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors p-1 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <span>{authMode === 'recover' ? 'Enviar Código de Recuperación' : 'Restablecer Contraseña'}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* FORMULARIO DE INICIO DE SESIÓN / REGISTRO */
            <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-4">
              
              {/* Campo Nombre Completo (Sólo en Registro) */}
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                    Nombre Completo
                  </label>
                  <div className="relative rounded-xl border border-zinc-200 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all bg-white shadow-xs">
                    <User size={16} className="text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input 
                      type="text" 
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej. Carlos Rodríguez"
                      className="w-full pl-10 pr-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 rounded-xl outline-none font-normal"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {/* Campo Email o Cédula */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  {authMode === 'login' ? 'Correo Electrónico o Cédula' : 'Correo Electrónico'}
                </label>
                <div className="relative rounded-xl border border-zinc-200 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all bg-white shadow-xs">
                  <Mail size={16} className="text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input 
                    type={authMode === 'login' ? 'text' : 'email'} 
                    required
                    value={emailOrDoc}
                    onChange={(e) => setEmailOrDoc(e.target.value)}
                    placeholder={authMode === 'login' ? 'tu@correo.com o V-12345678' : 'tu@correo.com'}
                    className="w-full pl-10 pr-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 rounded-xl outline-none font-normal"
                    autoFocus={authMode === 'login'}
                  />
                </div>
              </div>

              {/* Campo Contraseña */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-zinc-700">
                    Contraseña
                  </label>
                  {authMode === 'login' && (
                    <button 
                      type="button"
                      onClick={() => { setAuthMode('recover'); setErrorMessage(''); setSuccessMessage(''); }}
                      className="text-[11px] font-bold text-orange-600 hover:text-orange-700 transition-colors cursor-pointer"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <div className="relative rounded-xl border border-zinc-200 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all bg-white shadow-xs">
                  <Lock size={16} className="text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 rounded-xl outline-none font-normal"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirmar Contraseña (Sólo en Registro) */}
              {authMode === 'register' && (
                <>
                  <PasswordStrengthBar password={password} />
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                      Confirmar Contraseña
                    </label>
                    <div className={`relative rounded-xl border ${confirmPassword && confirmPassword !== password ? 'border-red-400' : 'border-zinc-200'} focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all bg-white shadow-xs`}>
                      <Lock size={16} className="text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input 
                        type={showConfirmPassword ? 'text' : 'password'} 
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-11 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 rounded-xl outline-none font-normal"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors p-1 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {confirmPassword && confirmPassword !== password && (
                      <p className="text-red-500 text-xs mt-1 font-medium">Las contraseñas no coinciden.</p>
                    )}
                  </div>

                  {/* Aceptación de Términos */}
                  <div className="flex items-start gap-2.5 bg-zinc-50 border border-zinc-200 rounded-xl p-3">
                    <input 
                      type="checkbox" 
                      id="customer-terms-checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-orange-500 shrink-0 cursor-pointer"
                    />
                    <label htmlFor="customer-terms-checkbox" className="text-xs text-zinc-600 leading-snug cursor-pointer font-medium">
                      He leído y acepto los{' '}
                      <a href="/legal/terminos" target="_blank" rel="noreferrer" className="text-orange-600 hover:underline font-bold">Términos de Uso</a>
                      {' '}y la{' '}
                      <a href="/legal/privacidad" target="_blank" rel="noreferrer" className="text-orange-600 hover:underline font-bold">Política de Privacidad</a>.
                    </label>
                  </div>
                </>
              )}

              {/* Botón Principal (Naranja Radiante) */}
              <button
                type="submit"
                disabled={loading || (authMode === 'register' && (!termsAccepted || (confirmPassword && confirmPassword !== password)))}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <span>{authMode === 'login' ? 'Acceder como Cliente' : 'Crear Cuenta'}</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Separador Social "o continúa con" */}
          {authMode !== 'recover' && authMode !== 'reset' && (
            <>
              <div className="relative py-2 my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-200"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                  <span className="bg-white px-3 text-zinc-400 font-bold">o continúa con</span>
                </div>
              </div>

              {/* Botón Google OAuth */}
              <div className="flex justify-center w-full">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setErrorMessage('Fallo al conectar con Google.')}
                  theme="outline"
                  shape="pill"
                  size="large"
                  width="100%"
                />
              </div>
            </>
          )}

        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
