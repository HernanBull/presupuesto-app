import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, X, 
  Calendar, ShieldCheck, CreditCard, Store, 
  Loader2, Sparkles, User, Phone, AlertCircle
} from 'lucide-react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { supabase } from '../../../supabaseClient';
import { loginUser, registerUser } from '../../../supabaseAuth';
import MerchantOnboardingWizard from './MerchantOnboardingWizard';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '106606679170-oheuro9l1qicfspsvsmf6c4ihuif2fq1.apps.googleusercontent.com';

export default function MerchantTrialAuthModal({ isOpen = true, onClose, initialMode = 'register' }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode); // 'register' | 'login'
  const [step, setStep] = useState(1); // 1: Email + Contraseña, 2: Datos de la tienda
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2 Fields
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  if (!isOpen) return null;

  // Paso 1: Validación y transición directa al Onboarding Wizard de 8 pasos
  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage('Ingresa un correo electrónico válido.');
      return;
    }

    if (mode === 'login') {
      handleLoginSubmit();
      return;
    }

    // Regla de contraseña: al menos 8 caracteres, con letras y números
    if (password.length < 8) {
      setErrorMessage('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    const hasLetters = /[a-zA-Z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);

    if (!hasLetters || !hasNumbers) {
      setErrorMessage('La contraseña debe contener al menos una letra y un número.');
      return;
    }

    setLoading(true);
    try {
      let authData;
      try {
        authData = await registerUser(cleanEmail, password, {
          role: 'merchant',
          business_name: 'Mi Tienda',
          full_name: 'Comerciante'
        });
      } catch (authErr) {
        if (authErr.message && (authErr.message.includes('already registered') || authErr.message.includes('User already registered'))) {
          try {
            authData = await loginUser(cleanEmail, password);
          } catch (_loginErr) {
            throw new Error('Este correo ya está registrado con otra contraseña. Por favor inicia sesión.');
          }
        } else {
          throw authErr;
        }
      }

      if (!authData?.user) {
        throw new Error('No se pudo completar el registro. Intenta de nuevo.');
      }

      const userId = authData.user.id;
      setCreatedWorkspaceId(userId);

      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 7);
      const generatedSlug = `tienda-${Date.now().toString().slice(-4)}`;

      const newWorkspace = {
        id: userId,
        name: 'Nuevo Comercio',
        store_slug: generatedSlug,
        status: 'Pendiente',
        config: {
          adminEmail: cleanEmail,
          adminPassword: password,
          adminPin: password,
          trialActive: true,
          trialEndsAt: trialEndsAt.toISOString(),
          plan: 'Prueba 7 Días Gratis',
          contact: {
            email: cleanEmail
          }
        }
      };

      const { error: wsError } = await supabase.from('workspaces').upsert([newWorkspace]);
      if (wsError && wsError.code !== '23505') {
        console.warn('Workspace upsert notice:', wsError);
      }

      await supabase.from('merchant_contacts').upsert([{
        id: userId,
        email: cleanEmail
      }]);

      localStorage.setItem('activeWorkspace', userId);
      localStorage.setItem('storeSlug', generatedSlug);
      localStorage.removeItem('ecommerce_current_customer');
      localStorage.removeItem('ecommerce_user');

      // Abrir el asistente de 8 pasos completo
      setShowOnboardingWizard(true);
    } catch (err) {
      console.error('Error al registrar:', err);
      setErrorMessage(err.message || 'Error al iniciar el registro. Verifica tus datos.');
    } finally {
      setLoading(false);
    }
  };

  // Paso 2: Crear tienda y activar 7 días gratis
  const handleCreateStoreSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!businessName.trim()) {
      setErrorMessage('Por favor ingresa el nombre de tu tienda o comercio.');
      return;
    }

    const cleanPhone = contactPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Ingresa un número telefónico de contacto válido (mínimo 10 dígitos).');
      return;
    }

    setLoading(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const generatedSlug = businessName
        .trim()
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || `tienda-${Date.now().toString().slice(-4)}`;

      // 1. Registrar usuario en Supabase Auth
      let authData;
      try {
        authData = await registerUser(cleanEmail, password, {
          role: 'merchant',
          business_name: businessName.trim(),
          full_name: ownerName.trim() || businessName.trim()
        });
      } catch (authErr) {
        // Si el usuario ya existe, intentar iniciar sesión
        if (authErr.message && (authErr.message.includes('already registered') || authErr.message.includes('User already registered'))) {
          try {
            authData = await loginUser(cleanEmail, password);
          } catch (_loginErr) {
            throw new Error('Este correo ya está registrado con otra contraseña. Por favor inicia sesión.');
          }
        } else {
          throw authErr;
        }
      }

      if (!authData?.user) {
        throw new Error('No se pudo completar el registro. Intenta de nuevo.');
      }

      const userId = authData.user.id;

      // Calcular fecha fin de prueba de 7 días
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 7);

      // 2. Insertar Workspace de la tienda
      const newWorkspace = {
        id: userId,
        name: businessName.trim(),
        store_slug: generatedSlug,
        status: 'Pendiente',
        config: {
          adminEmail: cleanEmail,
          adminPassword: password,
          adminPin: password,
          ownerName: ownerName.trim() || businessName.trim(),
          trialActive: true,
          trialEndsAt: trialEndsAt.toISOString(),
          plan: 'Prueba 7 Días Gratis',
          contact: {
            phone: contactPhone.trim(),
            email: cleanEmail
          },
          expediente: {
            ownerName: ownerName.trim() || businessName.trim(),
            whatsapp: contactPhone.trim()
          }
        }
      };

      const { error: wsError } = await supabase.from('workspaces').upsert([newWorkspace]);
      if (wsError && wsError.code !== '23505') {
        console.warn('Workspace upsert notice:', wsError);
      }

      // 3. Insertar contacto de comerciante
      const { error: contactError } = await supabase.from('merchant_contacts').upsert([{
        id: userId,
        full_name: ownerName.trim() || businessName.trim(),
        phone: contactPhone.trim(),
        email: cleanEmail
      }]);
      if (contactError && contactError.code !== '23505') {
        console.warn('Contact upsert notice:', contactError);
      }

      // 4. Guardar sesión de comerciante en localStorage
      localStorage.setItem('activeWorkspace', userId);
      localStorage.setItem('storeSlug', generatedSlug);
      if (businessName.trim()) localStorage.setItem('merchant_store_name', businessName.trim());
      if (ownerName.trim()) localStorage.setItem('merchant_owner_name', ownerName.trim());
      localStorage.removeItem('ecommerce_current_customer');
      localStorage.removeItem('ecommerce_user');

      toast.success('¡Tienda creada exitosamente! Tu prueba de 7 días ha comenzado.', {
        duration: 5000,
        icon: '🎉'
      });

      if (onClose) onClose();
      navigate('/dashboard');

    } catch (err) {
      console.error('Error registrando comercio:', err);
      setErrorMessage(err.message || 'Error al crear la tienda. Por favor verifica tus datos.');
      setLoading(false);
    }
  };

  // Iniciar sesión existente
  const handleLoginSubmit = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const cleanEmail = email.trim().toLowerCase();
      const authData = await loginUser(cleanEmail, password);

      // Buscar workspace asociado
      let wsData = null;
      const { data: byId } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (byId) {
        wsData = byId;
      } else {
        const { data: byEmail } = await supabase
          .from('workspaces')
          .select('*')
          .ilike('config->>adminEmail', cleanEmail)
          .maybeSingle();
        if (byEmail) wsData = byEmail;
      }

      if (!wsData) {
        throw new Error('No se encontró una tienda asociada a este correo. Regístrate para comenzar tus 7 días gratis.');
      }

      localStorage.setItem('activeWorkspace', wsData.id);
      localStorage.setItem('storeSlug', wsData.store_slug || '');
      localStorage.removeItem('ecommerce_current_customer');
      localStorage.removeItem('ecommerce_user');

      toast.success(`¡Bienvenido de nuevo, ${wsData.name}!`);
      if (onClose) onClose();
      navigate('/dashboard');

    } catch (err) {
      console.error('Error login comerciante:', err);
      setErrorMessage(err.message || 'Credenciales inválidas. Revisa tu correo y contraseña.');
      setLoading(false);
    }
  };

  // Login / Registro con Google
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
      if (payload.name) setOwnerName(payload.name);

      // Verificar si ya tiene tienda registrada
      const { data: wsData } = await supabase
        .from('workspaces')
        .select('*')
        .ilike('config->>adminEmail', cleanEmail)
        .maybeSingle();

      if (wsData) {
        localStorage.setItem('activeWorkspace', wsData.id);
        localStorage.setItem('storeSlug', wsData.store_slug || '');
        localStorage.removeItem('ecommerce_current_customer');
        localStorage.removeItem('ecommerce_user');

        toast.success(`¡Bienvenido de nuevo, ${wsData.name}!`);
        if (onClose) onClose();
        navigate('/dashboard');
        return;
      }

      // Si no tiene tienda, crear workspace preliminar y abrir el wizard de 8 pasos
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 7);
      const generatedSlug = `tienda-${Date.now().toString().slice(-4)}`;
      const newWsId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : ('00000000-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0'));

      setCreatedWorkspaceId(newWsId);
      const initialOwner = payload.name || '';
      setOwnerName(initialOwner);
      setBusinessName('');

      const newWorkspace = {
        id: newWsId,
        name: 'Nuevo Comercio',
        store_slug: generatedSlug,
        status: 'Pendiente',
        config: {
          adminEmail: cleanEmail,
          trialActive: true,
          trialEndsAt: trialEndsAt.toISOString(),
          plan: 'Prueba 7 Días Gratis',
          contact: {
            email: cleanEmail,
            ownerName: initialOwner
          },
          expediente: {
            ownerName: initialOwner
          }
        }
      };
      await supabase.from('workspaces').upsert([newWorkspace]);

      await supabase.from('merchant_contacts').upsert([{
        id: newWsId,
        email: cleanEmail,
        full_name: initialOwner
      }]);

      localStorage.setItem('activeWorkspace', newWsId);
      localStorage.setItem('storeSlug', generatedSlug);

      setShowOnboardingWizard(true);
      setLoading(false);

    } catch (err) {
      console.error('Error Google OAuth:', err);
      setErrorMessage('Hubo un error autenticando con Google. Intenta con correo y contraseña.');
      setLoading(false);
    }
  };

  if (showOnboardingWizard || (step === 2 && mode === 'register')) {
    return (
      <MerchantOnboardingWizard
        isOpen={true}
        workspaceId={createdWorkspaceId}
        initialData={{
          ownerName: ownerName || '',
          businessName: '',
          whatsapp: contactPhone || ''
        }}
        onClose={onClose}
        onComplete={() => {
          if (onClose) onClose();
          navigate('/dashboard');
        }}
      />
    );
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {/* Vista de Pantalla Completa en Escritorio (Edge-to-Edge 100vw x 100vh) */}
      <div className="fixed inset-0 z-[99999] w-screen h-screen min-h-screen bg-[#F4F6F9] grid grid-cols-1 lg:grid-cols-2 overflow-y-auto lg:overflow-hidden select-none animate-in fade-in duration-200 merchant-auth-modal">
        
        {/* Botón Cerrar Flotante */}
        {onClose && (
          <button 
            onClick={onClose}
            className="fixed top-4 right-4 sm:top-5 sm:right-5 z-50 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-zinc-900/10 hover:bg-zinc-900/25 text-zinc-800 lg:text-white lg:bg-white/20 lg:hover:bg-white/35 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95 border border-zinc-200/50 lg:border-white/20"
            title="Cerrar y volver"
          >
            <X size={22} className="stroke-[2.5]" />
          </button>
        )}

        {/* ========================================================= */}
        {/* COLUMNA IZQUIERDA: Formulario Blanco (50% pantalla)       */}
        {/* ========================================================= */}
        <div className="w-full h-full min-h-screen bg-[#F4F6F9] flex items-center justify-center p-4 sm:p-8 lg:p-12 overflow-y-auto">
          
          {/* Tarjeta Blanca Centrada dentro del 50% izquierdo */}
          <div className="bg-white rounded-3xl sm:rounded-[2rem] p-7 sm:p-10 shadow-xl shadow-slate-200/70 border border-slate-200/80 max-w-[460px] w-full my-auto flex flex-col justify-between">
            
            {/* Header de la tarjeta: Logo Oficial AxonMarket */}
            <div>
              <div className="flex items-center gap-2.5 mb-6">
                <img 
                  src="/axonmarket-logo-icon.png" 
                  alt="AxonMarket" 
                  className="w-7 h-7 rounded-lg shadow-xs object-contain" 
                />
                <span className="font-extrabold text-xl tracking-tight text-zinc-950 flex items-center">
                  Axon<span className="text-orange-500 ml-0.5">Market</span>
                </span>
              </div>

              {/* Botón Volver (si está en Step 2) */}
              {step === 2 && mode === 'register' && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 mb-3 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Volver al paso anterior</span>
                </button>
              )}

              {/* Titulares y Subtítulo */}
              {mode === 'register' ? (
                step === 1 ? (
                  <>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight leading-tight">
                      Prueba AxonMarket <br />
                      <span className="text-zinc-900">7 días gratis</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-zinc-500 font-medium mt-1.5 mb-6">
                      Sin tarjeta. Facturación e inventario se activan con un plan.
                    </p>
                  </>
                ) : (
                  <>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight leading-tight">
                      Configura tu vitrina <br />
                      <span className="text-orange-600">¡Casi listo!</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-zinc-500 font-medium mt-1.5 mb-6">
                      Ingresa los datos comerciales para publicar tu tienda hoy mismo.
                    </p>
                  </>
                )
              ) : (
                <>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-950 tracking-tight leading-tight">
                    Inicia sesión <br />
                    <span className="text-zinc-900">en tu tienda</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-500 font-medium mt-1.5 mb-6">
                    Gestiona tus productos, pedidos y ventas desde el panel central.
                  </p>
                </>
              )}

              {/* Alerta de Error */}
              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2 animate-in fade-in">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* ─────────────────────────────────────────────────── */}
              {/* FORMULARIO STEP 1 (Email + Contraseña)              */}
              {/* ─────────────────────────────────────────────────── */}
              {step === 1 && (
                <form onSubmit={handleStep1Submit} className="space-y-4">
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
                        className="w-full pl-10 pr-4 py-3 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 rounded-xl outline-none font-normal"
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
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (onClose) onClose();
                            navigate('/explorar', { state: { openMerchantRegister: true, mode: 'recover' } });
                          }}
                          className="text-[11px] font-semibold text-orange-600 hover:underline"
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
                        className="w-full pl-10 pr-10 py-3 text-sm text-zinc-900 bg-white placeholder:text-zinc-400 rounded-xl outline-none font-normal"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors p-1"
                        title={showPassword ? 'Ocultar' : 'Mostrar'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {mode === 'register' && (
                      <p className="text-[11px] text-zinc-500 mt-1.5 font-normal">
                        Usa al menos 8 caracteres, con letras y números.
                      </p>
                    )}
                  </div>

                  {/* Botón Primario Naranja (Empezar gratis / Iniciar sesión) */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3.5 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-black text-sm sm:text-base shadow-md hover:shadow-lg hover:shadow-orange-500/20 transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Verificando...</span>
                      </>
                    ) : mode === 'register' ? (
                      <>
                        <span>Empezar gratis</span>
                        <ArrowRight size={18} />
                      </>
                    ) : (
                      <>
                        <span>Ingresar a mi tienda</span>
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

                  {/* Botón de Google OAuth */}
                  <div className="w-full flex justify-center">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => setErrorMessage('Error al conectar con Google.')}
                      theme="outline"
                      shape="pill"
                      size="large"
                      width="100%"
                      text={mode === 'register' ? 'signup_with' : 'signin_with'}
                    />
                  </div>

                  {/* Texto Legal */}
                  {mode === 'register' && (
                    <p className="text-[11px] text-zinc-500 text-center leading-relaxed mt-4">
                      Al continuar con tu correo o con Google, aceptas los{' '}
                      <button 
                        type="button" 
                        onClick={() => { if (onClose) onClose(); navigate('/legal/terminos'); }} 
                        className="text-orange-600 hover:underline font-semibold"
                      >
                        términos
                      </button>{' '}
                      y la{' '}
                      <button 
                        type="button" 
                        onClick={() => { if (onClose) onClose(); navigate('/legal/privacidad'); }} 
                        className="text-orange-600 hover:underline font-semibold"
                      >
                        política de privacidad
                      </button>.
                    </p>
                  )}
                </form>
              )}

            </div>

            {/* Alternador Inferior: Iniciar sesión <-> Registrarse */}
            <div className="text-center mt-6 pt-4 border-t border-zinc-100">
              {mode === 'register' ? (
                <p className="text-xs text-zinc-600">
                  ¿Ya tienes cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setStep(1); setErrorMessage(''); }}
                    className="text-orange-600 hover:text-orange-700 font-bold hover:underline cursor-pointer"
                  >
                    Inicia sesión
                  </button>
                </p>
              ) : (
                <p className="text-xs text-zinc-600">
                  ¿No tienes cuenta aún?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('register'); setStep(1); setErrorMessage(''); }}
                    className="text-orange-600 hover:text-orange-700 font-bold hover:underline cursor-pointer"
                  >
                    Prueba 7 días gratis
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* COLUMNA DERECHA: BANNER NARANJA (50% de pantalla)         */}
        {/* ========================================================= */}
        <div className="hidden lg:flex w-full h-full min-h-screen bg-gradient-to-br from-orange-600 via-orange-500 to-amber-600 text-white p-8 sm:p-12 lg:p-16 flex-col justify-between overflow-y-auto relative">
          
          {/* Esferas decorativas translúcidas de fondo */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-300/20 rounded-full blur-3xl pointer-events-none" />

          {/* Espaciador superior limpio (sin logo duplicado) */}
          <div className="h-6" />

          {/* Contenido Central: Titular + 4 Beneficios de Commercy */}
          <div className="my-auto py-4 sm:py-8 relative z-10">
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight mb-2 sm:mb-3 drop-shadow-sm">
                Prueba AxonMarket gratis
              </h2>
              <p className="text-white/95 text-xs sm:text-base leading-relaxed max-w-md mb-6 sm:mb-8 font-medium">
                Vende en tu local y online, factura y controla tu inventario desde un solo panel.
              </p>

              {/* Lista de 4 Beneficios en cajitas translúcidas (Glassmorphism 1:1) */}
              <div className="space-y-3.5 sm:space-y-4 max-w-md">
                
                {/* Beneficio 1: 7 días de prueba */}
                <div className="flex items-start gap-3.5 group">
                  <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5 group-hover:scale-105 transition-transform">
                    <Calendar size={18} className="stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white leading-tight">
                      7 días de prueba
                    </h3>
                    <p className="text-[11px] sm:text-xs text-white/85 mt-0.5 leading-relaxed">
                      Vendes con POS, cargas inventario y publicas tu tienda.
                    </p>
                  </div>
                </div>

                {/* Beneficio 2: Después continúas gratis */}
                <div className="flex items-start gap-3.5 group">
                  <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5 group-hover:scale-105 transition-transform">
                    <ShieldCheck size={18} className="stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white leading-tight">
                      Después continúas gratis
                    </h3>
                    <p className="text-[11px] sm:text-xs text-white/85 mt-0.5 leading-relaxed">
                      Tus productos, tus ventas y tu tienda continúan activos.
                    </p>
                  </div>
                </div>

                {/* Beneficio 3: Sin tarjeta */}
                <div className="flex items-start gap-3.5 group">
                  <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5 group-hover:scale-105 transition-transform">
                    <CreditCard size={18} className="stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white leading-tight">
                      Sin tarjeta
                    </h3>
                    <p className="text-[11px] sm:text-xs text-white/85 mt-0.5 leading-relaxed">
                      No te pedimos datos de pago para empezar.
                    </p>
                  </div>
                </div>

                {/* Beneficio 4: Facturación fiscal y multimoneda */}
                <div className="flex items-start gap-3.5 group">
                  <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5 group-hover:scale-105 transition-transform">
                    <Store size={18} className="stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white leading-tight">
                      Facturación fiscal y multimoneda
                    </h3>
                    <p className="text-[11px] sm:text-xs text-white/85 mt-0.5 leading-relaxed">
                      Cuando desees facturar, la activas directamente desde el panel.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer sutil */}
            <div className="relative z-10 pt-4 border-t border-white/15 flex items-center justify-between text-[11px] text-white/75">
              <span>AxonMarket E-commerce & POS</span>
              <span className="font-semibold">0% riesgo</span>
            </div>

          </div>

      </div>
    </GoogleOAuthProvider>
  );
}
