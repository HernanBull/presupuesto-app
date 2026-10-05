import React, { useState, useEffect } from 'react';
import { Save, Store, Calculator, CreditCard, Smartphone as PhoneIcon, Truck, Clock, DollarSign, Building2, RefreshCw, Lock, User, Mail, MailWarning, ShieldCheck, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../../supabaseClient';

export default function StoreProfileManager() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Auth User Info
  const [adminEmail, setAdminEmail] = useState('');
  const [isEmailConfirmed, setIsEmailConfirmed] = useState(false);
  const [authProvider, setAuthProvider] = useState('email');
  const [isResending, setIsResending] = useState(false);
  const [isRefreshingAuth, setIsRefreshingAuth] = useState(false);

  const handleRefreshAuthStatus = async () => {
    setIsRefreshingAuth(true);
    try {
      await supabase.auth.refreshSession();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsEmailConfirmed(!!user.email_confirmed_at);
        if (!!user.email_confirmed_at) {
          alert('¡Tu correo ha sido verificado con éxito!');
        } else {
          alert('Tu correo aún no aparece como verificado. Si ya hiciste clic en el enlace, intenta nuevamente en unos segundos.');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshingAuth(false);
    }
  };
  
  const handleResendConfirmation = async () => {
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: adminEmail,
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      if (error) throw error;
      alert('Correo de confirmación reenviado. Revisa tu bandeja de entrada.');
    } catch (err) {
      console.error(err);
      alert('Error al reenviar el correo: ' + err.message);
    } finally {
      setIsResending(false);
    }
  };
  
  // Perfil
  const [storeName, setStoreName] = useState('Mi Tienda Online');
  const [currency, setCurrency] = useState('USD');
  const [description, setDescription] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  
  // Cambio de contraseña
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState({ type: '', msg: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // BCV
  const [bcvRate, setBcvRate] = useState(36.50);
  const [manualBcv, setManualBcv] = useState(false);
  const [isFetchingBcv, setIsFetchingBcv] = useState(false);

  const fetchBcvRate = async () => {
    setIsFetchingBcv(true);
    try {
      const res = await fetch(`https://axonmarket-api.onrender.com/api/bcv`);
      const data = await res.json();
      if (res.ok && data.rate) {
        setBcvRate(data.rate);
      } else if (data.fallbackRate) {
        setBcvRate(data.fallbackRate);
      }
    } catch (error) {
      console.error("Error al obtener la tasa del BCV:", error);
    } finally {
      setIsFetchingBcv(false);
    }
  };

  useEffect(() => {
    if (!manualBcv) {
      fetchBcvRate();
    }
  }, [manualBcv]);
  
  // Pago Móvil
  const [paymentMobile, setPaymentMobile] = useState(true);
  const [pmBank, setPmBank] = useState('');
  const [pmPhone, setPmPhone] = useState('');
  const [pmId, setPmId] = useState('');
  
  // Zelle
  const [zelleActive, setZelleActive] = useState(false);
  const [zelleEmail, setZelleEmail] = useState('');
  const [zelleName, setZelleName] = useState('');

  // Efectivo en Tienda / Delivery
  const [cashActive, setCashActive] = useState(false);

  // Envíos
  const [flatRate, setFlatRate] = useState(0);
  const [freeShipping, setFreeShipping] = useState(false);

  // Horarios de Atención
  const [scheduleActive, setScheduleActive] = useState(false);
  const [workDays, setWorkDays] = useState({
    lunes: true, martes: true, miercoles: true, jueves: true, viernes: true, sabado: false, domingo: false
  });
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('18:00');
  const [closeWarningMinutes, setCloseWarningMinutes] = useState(30);
  
  const workspaceId = localStorage.getItem('activeWorkspace') || 'default_workspace';

  const handleImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsSaving(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}_${Date.now()}.${fileExt}`;
      const filePath = `store_assets/${workspaceId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('ecommerce').upload(filePath, file);
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage.from('ecommerce').getPublicUrl(filePath);
      if (data && data.publicUrl) {
        if (type === 'logo') setLogoUrl(data.publicUrl);
        if (type === 'cover') setCoverUrl(data.publicUrl);
      }
    } catch (err) {
      console.error(err);
      alert('Error subiendo imagen. Verifica tu conexión a internet.');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setAdminEmail(session.user.email);
        setIsEmailConfirmed(!!session.user.email_confirmed_at);
        setAuthProvider(session.user.app_metadata?.provider || 'email');
      }
    });

    const fetchWorkspace = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setAdminEmail(user.email);
          setIsEmailConfirmed(!!user.email_confirmed_at);
          setAuthProvider(user.app_metadata?.provider || 'email');
        }

        const { data: ws, error } = await supabase.from('workspaces').select('*').eq('id', workspaceId).single();
        if (ws) {
          if (ws.name) setStoreName(ws.name);
          if (ws.config) {
            if (ws.config.generatedPassword) setGeneratedPassword(ws.config.generatedPassword);
            if (ws.config.currency) setCurrency(ws.config.currency);
            if (ws.config.description) setDescription(ws.config.description);
            if (ws.config.adminPin) setAdminPin(ws.config.adminPin);
            if (ws.config.logoUrl) setLogoUrl(ws.config.logoUrl);
            if (ws.config.coverUrl) setCoverUrl(ws.config.coverUrl);
            if (ws.config.bcvRate) setBcvRate(ws.config.bcvRate);
            if (ws.config.manualBcv !== undefined) {
              setManualBcv(ws.config.manualBcv);
            } else if (ws.config.autoBcv !== undefined) {
              setManualBcv(!ws.config.autoBcv); // Migrate from old config
            }
            
            if (ws.config.paymentProfile) {
              setPaymentMobile(ws.config.paymentProfile.paymentMobile !== false);
              setPmBank(ws.config.paymentProfile.pmBank || '');
              setPmPhone(ws.config.paymentProfile.pmPhone || '');
              setPmId(ws.config.paymentProfile.pmId || '');
              setZelleActive(ws.config.paymentProfile.zelleActive || false);
              setZelleEmail(ws.config.paymentProfile.zelleEmail || '');
              setZelleName(ws.config.paymentProfile.zelleName || '');
              setCashActive(ws.config.paymentProfile.cashActive || false);
            }
            if (ws.config.shippingProfile) {
              setFlatRate(ws.config.shippingProfile.flatRate || 0);
              setFreeShipping(ws.config.shippingProfile.freeShipping || false);
            }
            if (ws.config.scheduleProfile) {
              setScheduleActive(ws.config.scheduleProfile.scheduleActive || false);
              if (ws.config.scheduleProfile.workDays) setWorkDays(ws.config.scheduleProfile.workDays);
              if (ws.config.scheduleProfile.openTime) setOpenTime(ws.config.scheduleProfile.openTime);
              if (ws.config.scheduleProfile.closeTime) setCloseTime(ws.config.scheduleProfile.closeTime);
              if (ws.config.scheduleProfile.closeWarningMinutes !== undefined) setCloseWarningMinutes(ws.config.scheduleProfile.closeWarningMinutes);
            }
          }
        }
        setIsLoaded(true);
      } catch (err) {
        console.error(err);
        setIsLoaded(true);
      }
    };
    fetchWorkspace();
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [workspaceId]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordStatus({ type: 'error', msg: 'La nueva contraseña debe tener al menos 6 caracteres' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', msg: 'Las contraseñas nuevas no coinciden' });
      return;
    }

    setIsChangingPassword(true);
    setPasswordStatus({ type: '', msg: '' });

    try {
      const { data: ws, error: fetchErr } = await supabase.from('workspaces').select('config').eq('id', workspaceId).single();
      
      if (fetchErr || !ws) {
        setPasswordStatus({ type: 'error', msg: 'Error de conexión' });
        setIsChangingPassword(false);
        return;
      }
      
      if (ws.config.adminPin !== currentPassword && ws.config.adminEmail !== currentPassword) {
        setPasswordStatus({ type: 'error', msg: 'Contraseña actual incorrecta' });
        setIsChangingPassword(false);
        return;
      }

      const updatedConfig = { ...ws.config, adminPin: newPassword };
      const { error: updateErr } = await supabase.from('workspaces').update({ config: updatedConfig }).eq('id', workspaceId);

      if (!updateErr) {
        setPasswordStatus({ type: 'success', msg: 'Contraseña cambiada exitosamente' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setAdminPin(newPassword);
      } else {
        setPasswordStatus({ type: 'error', msg: updateErr.message || 'Error al cambiar la contraseña' });
      }
    } catch (err) {
      console.error(err);
      setPasswordStatus({ type: 'error', msg: 'Error de conexión' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: ws, error: fetchErr } = await supabase.from('workspaces').select('config').eq('id', workspaceId).single();
      if (fetchErr) throw fetchErr;
      
      const newConfig = {
        ...(ws?.config || {}),
        currency,
        description,
        adminPin,
        logoUrl,
        coverUrl,
        bcvRate,
        manualBcv,
        autoBcv: !manualBcv, // Keep for backward compatibility
        paymentProfile: {
          paymentMobile,
          pmBank,
          pmPhone,
          pmId,
          zelleActive,
          zelleEmail,
          zelleName,
          cashActive
        },
        shippingProfile: {
          flatRate,
          freeShipping
        },
        scheduleProfile: {
          scheduleActive,
          workDays,
          openTime,
          closeTime,
          closeWarningMinutes
        }
      };

      const { error: updateErr } = await supabase.from('workspaces').update({ config: newConfig }).eq('id', workspaceId);
      if (updateErr) throw updateErr;
      
      setTimeout(() => {
        setIsSaving(false);
        alert('Perfil de pagos guardado exitosamente.');
      }, 500);
    } catch (err) {
      console.error(err);
      setIsSaving(false);
      alert('Error al guardar el perfil.');
    }
  };

  if (!isLoaded) return <div className="p-8 text-center font-bold text-slate-500">Cargando perfil...</div>;

  const getStoreScheduleStatus = () => {
    if (!scheduleActive) return { status: 'open', message: 'Abierto 24/7' };
    
    const currentDayIdx = new Date().getDay();
    const daysMap = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const currentDayName = daysMap[currentDayIdx];
    
    if (!workDays[currentDayName]) return { status: 'closed', message: `Cerrado (Hoy ${currentDayName} no laborable)` };
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    
    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);
    
    const currentMins = currentHour * 60 + currentMin;
    const openMins = openH * 60 + openM;
    const closeMins = closeH * 60 + closeM;
    
    let isClosed = false;
    let minsToClose = 0;

    if (closeMins < openMins) {
      if (currentMins < openMins && currentMins >= closeMins) isClosed = true;
      else {
        minsToClose = (currentMins >= openMins) ? ((1440 - currentMins) + closeMins) : (closeMins - currentMins);
      }
    } else {
      if (currentMins < openMins || currentMins >= closeMins) isClosed = true;
      else {
        minsToClose = closeMins - currentMins;
      }
    }
    
    if (isClosed) return { status: 'closed', message: `Cerrado (Abre a las ${openTime})` };
    
    if (minsToClose <= closeWarningMinutes) {
      return { status: 'closing', message: `Cierra en ${minsToClose} min` };
    }
    
    return { status: 'open', message: `Abierto (Cierra a las ${closeTime})` };
  };

  const scheduleStatusPreview = getStoreScheduleStatus();

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8 pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Perfil de la Tienda</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configura los datos públicos y métodos de cobro.</p>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-70 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-violet-500/20">
          <Save size={18} />
          {isSaving ? 'Guardando...' : 'Guardar Perfil'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Cuenta y Seguridad */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
              <User size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Cuenta del Administrador</h3>
          </div>
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center">
                {authProvider === 'google' ? (
                  <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                ) : (
                  <Mail className="text-slate-500" size={24} />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{adminEmail || 'Cargando...'}</p>
                <p className="text-xs font-medium text-slate-500">
                  Registrado vía {authProvider === 'google' ? 'Google' : 'Correo Electrónico'}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col md:items-end gap-2 w-full md:w-auto">
              {isEmailConfirmed ? (
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
                  <ShieldCheck size={16} />
                  <span className="text-xs font-bold">Cuenta Verificada</span>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800/50">
                      <MailWarning size={16} />
                      <span className="text-xs font-bold flex-1">Pendiente de Verificación</span>
                      <button 
                        onClick={handleRefreshAuthStatus} 
                        disabled={isRefreshingAuth}
                        className="ml-2 text-amber-600 dark:text-amber-400 hover:text-amber-700 disabled:opacity-50 transition-colors bg-amber-100/50 dark:bg-amber-800/30 p-1 rounded-md border border-amber-200 dark:border-amber-700/50"
                        title="Actualizar estado si ya verificaste"
                      >
                        <RefreshCw size={14} className={isRefreshingAuth ? 'animate-spin' : ''} />
                      </button>
                    </div>
                    <button 
                      onClick={handleResendConfirmation} 
                      disabled={isResending || !adminEmail}
                      className="text-[10px] text-violet-600 dark:text-violet-400 font-bold hover:underline disabled:opacity-50 text-right w-full block"
                    >
                      {isResending ? 'Enviando...' : 'Reenviar enlace de confirmación'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Contraseña / Key */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-slate-50 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400 rounded-lg">
              <Lock size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Cambio de Contraseña</h3>
              <p className="text-xs text-slate-500 mt-1">Administra tu contraseña para iniciar sesión con correo electrónico.</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 mb-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl">
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">Contraseña generada (Key):</p>
              <p className="text-lg font-mono mt-1 text-slate-600 dark:text-slate-300">
                {showKey ? (generatedPassword || 'No definida') : '••••••••••••'}
              </p>
            </div>
            <button type="button" onClick={() => setShowKey(!showKey)} className="px-3 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-800/50 rounded-lg transition-colors">
              {showKey ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="flex flex-col gap-4 p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-800 dark:text-white mb-1 block">Contraseña Actual</label>
                  <input 
                    type="password" 
                    value={currentPassword} 
                    onChange={e => setCurrentPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500" 
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-800 dark:text-white mb-1 block">Nueva Contraseña</label>
                  <input 
                    type="password" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500" 
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-800 dark:text-white mb-1 block">Confirmar Nueva</label>
                  <input 
                    type="password" 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500" 
                  />
                </div>
              </div>

              {passwordStatus.msg && (
                <div className={`p-3 rounded-lg text-sm font-medium ${passwordStatus.type === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                  {passwordStatus.msg}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button type="submit" disabled={isChangingPassword} className="bg-slate-800 hover:bg-slate-900 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-white px-5 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-70">
                  {isChangingPassword ? 'Cambiando...' : 'Cambiar Contraseña'}
                </button>
              </div>

            </div>
          </form>
        </section>

        {/* Info de Tienda */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-lg">
              <Store size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Información de la Tienda</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nombre de la Tienda</label>
              <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)} disabled className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Moneda Principal</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50">
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="COP">COP ($)</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Descripción Breve</label>
              <textarea rows="3" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej. Vendemos los mejores productos del mercado..." className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"></textarea>
            </div>
          </div>
        </section>

        {/* Imágenes de Tienda */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 rounded-lg">
              <ImageIcon size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Imágenes y Diseño</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Logotipo de la Tienda</label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-slate-950/50">
                  {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" /> : <ImageIcon size={24} className="text-slate-400" />}
                </div>
                <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium cursor-pointer transition-colors">
                  <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'logo')} disabled={isSaving} />
                  Subir Logo
                </label>
              </div>
            </div>
            
            <div className="space-y-4">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Imagen de Portada (Fondo)</label>
              <div className="flex items-center gap-4">
                <div className="w-32 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-slate-950/50">
                  {coverUrl ? <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" /> : <ImageIcon size={24} className="text-slate-400" />}
                </div>
                <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium cursor-pointer transition-colors">
                  <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'cover')} disabled={isSaving} />
                  Subir Portada
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Tasa BCV */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded-lg">
              <Calculator size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Tasa de Cambio (BCV)</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tasa de Cambio Actual (Bs por $)</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-2.5 text-slate-400 font-bold">Bs.</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={bcvRate} 
                    onChange={e => setBcvRate(Number(e.target.value))} 
                    disabled={!manualBcv}
                    className={`w-full pl-12 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-colors ${!manualBcv ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white'}`} 
                  />
                </div>
                {!manualBcv && (
                  <button 
                    onClick={fetchBcvRate} 
                    disabled={isFetchingBcv}
                    title="Sincronizar ahora"
                    className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={18} className={isFetchingBcv ? "animate-spin text-violet-500" : ""} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center pt-6">
               <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={manualBcv} onChange={e => setManualBcv(e.target.checked)} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-violet-600"></div>
                  <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">Actualizar de forma manual (Respaldo)</span>
                </label>
            </div>
          </div>
        </section>

        {/* Pago Móvil */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <CreditCard size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Datos de Pago Móvil</h3>
              <p className="text-xs text-slate-500 mt-1">Estos datos se le mostrarán al cliente al hacer checkout.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col gap-3 p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <PhoneIcon size={18} className="text-slate-500" />
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">Aceptar Pago Móvil</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={paymentMobile} onChange={e => setPaymentMobile(e.target.checked)} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                </label>
              </div>
              
              {paymentMobile && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Banco Emisor</label>
                    <input type="text" value={pmBank} onChange={e => setPmBank(e.target.value)} placeholder="Ej. Banesco (0134)" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Teléfono</label>
                    <input type="text" value={pmPhone} onChange={e => setPmPhone(e.target.value)} placeholder="Ej. 04141234567" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Cédula / RIF</label>
                    <input type="text" value={pmId} onChange={e => setPmId(e.target.value)} placeholder="Ej. V20123456" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none" />
                  </div>
                </div>
              )}
            </div>
            {/* Zelle */}
            <div className="flex flex-col gap-3 p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <DollarSign size={18} className="text-slate-500" />
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">Zelle</p>
                    <p className="text-xs text-slate-500">Recibe pagos en dólares.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={zelleActive} onChange={e => setZelleActive(e.target.checked)} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                </label>
              </div>
              
              {zelleActive && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Correo de Zelle</label>
                    <input type="email" value={zelleEmail} onChange={e => setZelleEmail(e.target.value)} placeholder="Ej. pagos@mitienda.com" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Nombre del Titular</label>
                    <input type="text" value={zelleName} onChange={e => setZelleName(e.target.value)} placeholder="Ej. Juan Perez" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none" />
                  </div>
                </div>
              )}
            </div>

            {/* Efectivo */}
            <div className="flex items-start justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50">
              <div className="flex items-center gap-3">
                <Building2 size={18} className="text-slate-500" />
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">Efectivo en Tienda / Delivery</p>
                  <p className="text-xs text-slate-500">El cliente paga en efectivo al recibir.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={cashActive} onChange={e => setCashActive(e.target.checked)} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>
        </section>

        {/* Envíos */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
              <Truck size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Configuración de Envío</h3>
              <p className="text-xs text-slate-500 mt-1">Reglas para el cobro del delivery.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50">
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">Tarifa Plana</p>
                <p className="text-xs text-slate-500">Cobra un valor fijo por cualquier envío.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-800 dark:text-white font-bold">$</span>
                <input type="number" step="0.01" value={flatRate} onChange={e => setFlatRate(Number(e.target.value))} className="w-24 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50">
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">Envío Gratis</p>
                <p className="text-xs text-slate-500">No cobrar delivery en ningún caso.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={freeShipping} onChange={e => setFreeShipping(e.target.checked)} />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </section>

        {/* Horarios de Atención */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Horarios de Atención</h3>
              <p className="text-xs text-slate-500 mt-1">Configura si tu tienda tiene horario de recepción de pedidos.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col gap-4 p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">Activar Restricción de Horario</p>
                  <p className="text-xs text-slate-500">Bloquea el carrito cuando estés cerrado.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={scheduleActive} onChange={e => setScheduleActive(e.target.checked)} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 dark:peer-focus:ring-violet-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-orange-600"></div>
                </label>
              </div>

              {scheduleActive && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">Hora Apertura</label>
                      <input type="time" value={openTime} onChange={e => setOpenTime(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">Hora Cierre</label>
                      <input type="time" value={closeTime} onChange={e => setCloseTime(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-bold text-slate-500 mb-1 block">Margen de Cierre (Amarillo)</label>
                      <div className="flex items-center gap-2">
                        <input type="number" min="0" max="120" value={closeWarningMinutes} onChange={e => setCloseWarningMinutes(Number(e.target.value))} className="w-24 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-white focus:outline-none" />
                        <span className="text-xs text-slate-500">minutos antes del cierre se bloquearán las compras.</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-xl border flex items-center gap-3 bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800 dark:text-white">Vista previa del semáforo actual:</p>
                      <p className="text-xs text-slate-500 mt-0.5">Así ve el estado el cliente en este momento exacto.</p>
                    </div>
                    <div className={`px-4 py-2 rounded-full flex items-center gap-2 font-bold text-sm tracking-wide ${
                      scheduleStatusPreview.status === 'open' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                      scheduleStatusPreview.status === 'closing' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                      'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                    }`}>
                      <div className={`w-2 h-2 rounded-full animate-pulse ${
                        scheduleStatusPreview.status === 'open' ? 'bg-emerald-500' :
                        scheduleStatusPreview.status === 'closing' ? 'bg-amber-500' : 'bg-red-500'
                      }`}></div>
                      {scheduleStatusPreview.message}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-2 block">Días Laborables</label>
                    <div className="flex flex-wrap gap-2">
                      {['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].map(dia => (
                        <button 
                          key={dia}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setWorkDays(prev => ({ ...prev, [dia]: !prev[dia] }));
                          }}
                          className={`px-3 py-1 text-xs font-bold rounded-lg border transition-colors ${
                            workDays[dia] 
                            ? 'bg-violet-100 border-violet-200 text-violet-700 dark:bg-violet-900/40 dark:border-violet-700 dark:text-violet-300' 
                            : 'bg-white border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'
                          }`}
                        >
                          {dia.charAt(0).toUpperCase() + dia.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Seguridad y Acceso (PIN) */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg">
              <Lock size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Seguridad y Acceso</h3>
              <p className="text-xs text-slate-500 mt-1">Bloquea rutas sensibles para tus empleados usando un PIN.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col gap-4 p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/50">
              <div>
                <label className="text-sm font-bold text-slate-800 dark:text-white mb-1 block">PIN Administrativo (4 dígitos)</label>
                <p className="text-xs text-slate-500 mb-3">Si dejas este campo vacío, cualquier empleado podrá entrar al Dashboard, Analítica y Perfil.</p>
                <input 
                  type="password" 
                  maxLength={4}
                  value={adminPin} 
                  onChange={e => setAdminPin(e.target.value.replace(/\D/g, '').slice(0, 4))} 
                  placeholder="Ej: 1234"
                  className="w-full max-w-[200px] px-4 py-2 text-center tracking-[0.5em] font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white focus:outline-none focus:border-red-500" 
                />
              </div>
            </div>
          </div>
        </section>



      </div>
    </div>
  );
}
