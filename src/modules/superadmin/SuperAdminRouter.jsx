import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import { QRCodeCanvas } from 'qrcode.react';
import { ShieldAlert, ArrowRight, Loader2, X, Key, CheckCircle, Copy, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SuperAdminRouter() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [captchaQ, setCaptchaQ] = useState({ a: 0, b: 0 });
  const [captchaA, setCaptchaA] = useState('');
  const [captchaPassed, setCaptchaPassed] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [recoveredKey, setRecoveredKey] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [is2faActive, setIs2faActive] = useState(null);
  const [isChecking2fa, setIsChecking2fa] = useState(false);
  const [publicQrUri, setPublicQrUri] = useState('');

  useEffect(() => {
    if (isRecoveryOpen) {
      setIsChecking2fa(true);
      fetch(`https://axonmarket-api.onrender.com/api/superadmin/2fa/status`)
        .then(res => res.json())
        .then(data => {
          setIs2faActive(data.isActive);
          if (data.isActive && !captchaPassed && !recoveredKey) {
            setCaptchaQ({ a: Math.floor(Math.random() * 10) + 1, b: Math.floor(Math.random() * 10) + 1 });
            setCaptchaA('');
            setRecoveryError('');
          }
        })
        .catch(() => setIs2faActive(false))
        .finally(() => setIsChecking2fa(false));
    } else {
      setIs2faActive(null);
    }
  }, [isRecoveryOpen]);

  const handleVerifyCaptcha = () => {
    if (parseInt(captchaA) === (captchaQ.a + captchaQ.b)) {
      setCaptchaPassed(true);
      setRecoveryError('');
    } else {
      setRecoveryError('Captcha incorrecto. Intenta de nuevo.');
      setCaptchaQ({ a: Math.floor(Math.random() * 10) + 1, b: Math.floor(Math.random() * 10) + 1 });
      setCaptchaA('');
    }
  };

  const handleRecover = async () => {
    if (totpCode.length !== 6) return;
    setIsRecovering(true);
    try {
      const res = await fetch(`https://axonmarket-api.onrender.com/api/superadmin/recover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: totpCode })
      });
      const data = await res.json();
      if (res.ok) {
        setRecoveredKey(data.key);
        setRecoveryError('');
      } else {
        setRecoveryError(data.error || 'Código incorrecto');
      }
    } catch(e) {
      setRecoveryError('Error de conexión');
    }
    setIsRecovering(false);
  };

  useEffect(() => {
    const savedKey = localStorage.getItem('superadmin_key');
    if (savedKey) {
      setKey(savedKey);
      fetch(`https://axonmarket-api.onrender.com/api/superadmin/merchants`, { headers: { 'x-superadmin-key': savedKey } })
        .then(res => {
          if (res.ok) setIsAuthenticated(true);
          else localStorage.removeItem('superadmin_key');
        })
        .catch(()=>{})
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    
    // Rate limit check
    const lockout = localStorage.getItem('admin_lockout');
    if (lockout && new Date().getTime() < parseInt(lockout)) {
      const minutesLeft = Math.ceil((parseInt(lockout) - new Date().getTime()) / 60000);
      setError(`Demasiados intentos. Intenta en ${minutesLeft} minutos.`);
      return;
    }
    if (lockout) localStorage.removeItem('admin_lockout');

    setIsLoading(true);
    fetch(`https://axonmarket-api.onrender.com/api/superadmin/merchants`, {
      headers: { 'x-superadmin-key': key }
    })
    .then(res => {
      setIsLoading(false);
      if (res.ok) {
        setIsAuthenticated(true);
        localStorage.setItem('superadmin_key', key);
        localStorage.removeItem('admin_attempts');
      } else {
        const attempts = parseInt(localStorage.getItem('admin_attempts') || '0') + 1;
        if (attempts >= 3) {
          localStorage.setItem('admin_lockout', (new Date().getTime() + 5 * 60000).toString());
          localStorage.removeItem('admin_attempts');
          setError('Sistema bloqueado por 5 minutos.');
        } else {
          localStorage.setItem('admin_attempts', attempts.toString());
          setError(`Clave incorrecta. Intentos restantes: ${3 - attempts}`);
        }
      }
    })
    .catch(() => {
      setIsLoading(false);
      setError('Error de conexión con el servidor');
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-red-500" />
      </div>
    );
  }

  if (!isAuthenticated) {

    return (
      <div className="min-h-screen bg-black text-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-zinc-950 border border-red-500/20 rounded-3xl p-8 shadow-[0_0_50px_rgba(239,68,68,0.15)] text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-red-900"></div>
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-red-500/10 text-red-500 rounded-full">
              <ShieldAlert size={48} />
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mb-2 uppercase">Zona Restringida</h1>
          <p className="text-zinc-500 text-sm mb-8">Panel de Administración Maestro. Ingresa la clave maestra para continuar.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input 
                type="password" 
                value={key} 
                onChange={(e) => { setKey(e.target.value); setError(''); }}
                placeholder="Clave Maestra" 
                className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-red-500/50 transition-colors text-center tracking-[0.2em]"
                required
              />
            </div>
            {error && <p className="text-red-500 text-xs font-bold uppercase tracking-wider">{error}</p>}
            <button 
              type="submit" 
              disabled={isLoading || !key}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-[0.2em] py-4 rounded-full transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <>Autenticar <ArrowRight size={18} /></>}
            </button>
            <div className="pt-4 text-center">
              <button 
                type="button" 
                onClick={() => setIsRecoveryOpen(true)}
                className="text-xs text-zinc-500 hover:text-red-500 font-bold uppercase tracking-widest transition-colors focus:outline-none"
              >
                ¿Olvidaste tu clave?
              </button>
            </div>
          </form>
        </div>

        
        {/* Modal de Recuperación */}
        <AnimatePresence>
          {isRecoveryOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                className="absolute inset-0 bg-black/90 backdrop-blur-md" 
                onClick={() => setIsRecoveryOpen(false)} 
              />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} 
                className="bg-zinc-950 border border-red-500/30 rounded-[2rem] p-8 max-w-md w-full relative z-10 shadow-[0_0_50px_rgba(239,68,68,0.15)] text-center"
              >
                <button onClick={() => { setIsRecoveryOpen(false); setCaptchaPassed(false); setRecoveredKey(''); setTotpCode(''); }} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
                
                {isChecking2fa || is2faActive === null ? (
                  <div className="py-12 flex flex-col items-center justify-center">
                    <Loader2 size={40} className="animate-spin text-red-500 mb-4" />
                    <p className="text-sm text-zinc-500 uppercase tracking-widest font-bold animate-pulse">Verificando Seguridad...</p>
                  </div>
                ) : !is2faActive ? (
                  <>
                    
                    <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500">
                      <ShieldAlert size={32} />
                    </div>
                    <h2 className="text-xl font-black text-white uppercase tracking-widest mb-4">Inicialización 2FA</h2>
                    <p className="text-sm text-zinc-400 font-light leading-relaxed mb-6">
                      El sistema 2FA no ha sido configurado. Puedes generar el código QR ahora mismo por única vez para recuperar el acceso.
                    </p>
                    
                    {!publicQrUri ? (
                      <button 
                        onClick={async () => {
                          setIsChecking2fa(true);
                          try {
                            const res = await fetch(`https://axonmarket-api.onrender.com/api/superadmin/2fa/setup-public`, { method: 'POST' });
                            const data = await res.json();
                            if (res.ok) setPublicQrUri(data.uri);
                            else alert(data.error);
                          } catch(e) { alert('Error'); }
                          setIsChecking2fa(false);
                        }}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-full py-4 text-xs font-bold uppercase tracking-[0.2em] transition-colors mb-4"
                      >
                        Generar Código QR Único
                      </button>
                    ) : (
                      <div className="flex flex-col items-center gap-6 mb-6 animate-in zoom-in-95">
                        <div className="bg-white p-4 rounded-xl shadow-lg">
                          <QRCodeCanvas value={publicQrUri} size={200} level="M" />
                        </div>
                        <p className="text-xs text-red-400 font-bold uppercase tracking-widest px-4">¡Escanéalo rápido! Una vez escaneado, presiona Continuar para ingresar el código.</p>
                        <button 
                          onClick={() => {
                            setPublicQrUri('');
                            setIs2faActive(true); // Jump to captcha -> 2FA flow
                            setCaptchaQ({ a: Math.floor(Math.random() * 10) + 1, b: Math.floor(Math.random() * 10) + 1 });
                            setCaptchaA('');
                          }}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-full py-4 text-xs font-bold uppercase tracking-[0.2em] transition-colors"
                        >
                          Ya lo escaneé, Continuar
                        </button>
                      </div>
                    )}

                  </>
                ) : recoveredKey ? (
                  <>
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-emerald-500">
                      <ShieldCheck size={32} />
                    </div>
                    <h2 className="text-xl font-black text-white uppercase tracking-widest mb-4">Identidad Verificada</h2>
                    <p className="text-sm text-zinc-400 font-light leading-relaxed mb-6">
                      Se ha validado tu autenticador. Tu clave maestra es:
                    </p>
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5 mb-8 relative flex flex-col items-center justify-center">
                      <p className="text-2xl font-mono font-bold text-white tracking-[0.2em]">{recoveredKey}</p>
                      <button onClick={() => { navigator.clipboard.writeText(recoveredKey); alert('Copiado'); }} className="mt-4 flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-lg text-xs uppercase tracking-widest font-bold hover:bg-emerald-500 hover:text-white transition-colors">
                        <Copy size={16} /> Copiar Clave
                      </button>
                    </div>
                  </>
                ) : !captchaPassed ? (
                  <>
                    <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500">
                      <ShieldAlert size={32} />
                    </div>
                    <h2 className="text-xl font-black text-white uppercase tracking-widest mb-4">Verificación Anti-Bot</h2>
                    <p className="text-sm text-zinc-400 font-light leading-relaxed mb-6">
                      Demuestra que eres humano resolviendo el siguiente problema.
                    </p>
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6 mb-6 flex flex-col items-center justify-center">
                      <span className="text-3xl font-mono font-bold text-white mb-4">{captchaQ.a} + {captchaQ.b} = ?</span>
                      <input 
                        type="number"
                        value={captchaA}
                        onChange={e => setCaptchaA(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleVerifyCaptcha()}
                        className="w-24 bg-black border border-white/10 rounded-xl px-4 py-3 text-center text-white font-mono text-xl focus:outline-none focus:border-red-500 transition-colors"
                        autoFocus
                      />
                    </div>
                    {recoveryError && <p className="text-red-500 text-xs font-bold uppercase tracking-wider mb-4">{recoveryError}</p>}
                    <button 
                      onClick={handleVerifyCaptcha}
                      className="w-full bg-red-600 hover:bg-red-500 text-white rounded-full py-4 text-xs font-bold uppercase tracking-[0.2em] transition-colors"
                    >
                      Verificar Humano
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-500">
                      <Key size={32} />
                    </div>
                    <h2 className="text-xl font-black text-white uppercase tracking-widest mb-4">Autenticación 2FA</h2>
                    <p className="text-sm text-zinc-400 font-light leading-relaxed mb-6">
                      Ingresa el código de 6 dígitos generado por tu app Google Authenticator.
                    </p>
                    <div className="mb-6">
                      <input 
                        type="text"
                        maxLength="6"
                        value={totpCode}
                        onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                        onKeyDown={e => e.key === 'Enter' && handleRecover()}
                        placeholder="000000"
                        className="w-full bg-black border border-indigo-500/30 rounded-xl px-4 py-4 text-center text-white font-mono text-3xl tracking-[0.5em] focus:outline-none focus:border-indigo-500 transition-colors"
                        autoFocus
                      />
                    </div>
                    {recoveryError && <p className="text-red-500 text-xs font-bold uppercase tracking-wider mb-4">{recoveryError}</p>}
                    <button 
                      onClick={handleRecover}
                      disabled={totpCode.length !== 6 || isRecovering}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-full py-4 text-xs font-bold uppercase tracking-[0.2em] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isRecovering ? <Loader2 size={18} className="animate-spin" /> : <>Validar 2FA <ArrowRight size={18} /></>}
                    </button>
                  </>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    );
  }

  return (
    <Routes>
      <Route index element={<SuperAdminDashboard superKey={key} />} />
      <Route path="*" element={<Navigate to="/superadmin" />} />
    </Routes>
  );
}
