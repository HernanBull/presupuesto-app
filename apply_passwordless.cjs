const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'modules', 'superadmin', 'SuperAdminRouter.jsx');

const newContent = `import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import { ShieldAlert, ArrowRight, Loader2, Key, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SuperAdminRouter() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Login States
  const [captchaQ, setCaptchaQ] = useState({ a: 0, b: 0 });
  const [captchaA, setCaptchaA] = useState('');
  const [captchaPassed, setCaptchaPassed] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('superadmin_key');
    if (savedKey) {
      setKey(savedKey);
      fetch(\`https://axonmarket-api.onrender.com/api/superadmin/merchants\`, { headers: { 'x-superadmin-key': savedKey } })
        .then(res => {
          if (res.ok) setIsAuthenticated(true);
          else localStorage.removeItem('superadmin_key');
        })
        .catch(()=>{})
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
      generateCaptcha();
    }
  }, []);

  const generateCaptcha = () => {
    setCaptchaQ({ a: Math.floor(Math.random() * 10) + 1, b: Math.floor(Math.random() * 10) + 1 });
    setCaptchaA('');
  };

  const handleVerifyCaptcha = (e) => {
    e && e.preventDefault();
    if (parseInt(captchaA) === (captchaQ.a + captchaQ.b)) {
      setCaptchaPassed(true);
      setError('');
    } else {
      setError('Captcha incorrecto. Intenta de nuevo.');
      generateCaptcha();
    }
  };

  const handleLogin2FA = async (e) => {
    e && e.preventDefault();
    
    // Rate limit check
    const lockout = localStorage.getItem('admin_lockout');
    if (lockout && new Date().getTime() < parseInt(lockout)) {
      const minutesLeft = Math.ceil((parseInt(lockout) - new Date().getTime()) / 60000);
      setError(\`Demasiados intentos. Intenta en \${minutesLeft} minutos.\`);
      return;
    }
    if (lockout) localStorage.removeItem('admin_lockout');

    if (totpCode.length !== 6) return;
    
    setIsAuthenticating(true);
    try {
      const res = await fetch(\`https://axonmarket-api.onrender.com/api/superadmin/recover\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: totpCode })
      });
      const data = await res.json();
      
      if (res.ok && data.key) {
        setIsAuthenticated(true);
        setKey(data.key);
        localStorage.setItem('superadmin_key', data.key);
        localStorage.removeItem('admin_attempts');
      } else {
        const attempts = parseInt(localStorage.getItem('admin_attempts') || '0') + 1;
        if (attempts >= 3) {
          localStorage.setItem('admin_lockout', (new Date().getTime() + 5 * 60000).toString());
          localStorage.removeItem('admin_attempts');
          setError('Sistema bloqueado por 5 minutos.');
        } else {
          localStorage.setItem('admin_attempts', attempts.toString());
          setError(data.error || \`Código incorrecto. Intentos restantes: \${3 - attempts}\`);
        }
      }
    } catch(err) {
      setError('Error de conexión con el servidor');
    }
    setIsAuthenticating(false);
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
      <div className="min-h-screen bg-black text-slate-50 flex items-center justify-center p-4 font-sans relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-900/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-900/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="w-full max-w-md bg-zinc-950/80 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] text-center relative z-10">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-red-600"></div>
          
          <AnimatePresence mode="wait">
            {!captchaPassed ? (
              <motion.div
                key="captcha"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex justify-center mb-6">
                  <div className="p-4 bg-red-500/10 text-red-500 rounded-2xl">
                    <ShieldAlert size={40} />
                  </div>
                </div>
                <h1 className="text-2xl font-black tracking-tight text-white mb-2 uppercase">Zona Restringida</h1>
                <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
                  Sistema de autenticación Passwordless. Demuestra que eres humano para proceder a la bóveda.
                </p>

                <form onSubmit={handleVerifyCaptcha} className="space-y-6">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center">
                    <span className="text-4xl font-mono font-black text-white mb-6 drop-shadow-lg">{captchaQ.a} + {captchaQ.b}</span>
                    <input 
                      type="number" 
                      value={captchaA} 
                      onChange={(e) => { setCaptchaA(e.target.value); setError(''); }}
                      placeholder="?" 
                      className="w-24 bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors text-center font-mono text-2xl"
                      autoFocus
                      required
                    />
                  </div>
                  {error && <p className="text-red-500 text-xs font-bold uppercase tracking-wider animate-pulse">{error}</p>}
                  <button 
                    type="submit" 
                    disabled={!captchaA}
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-[0.2em] py-4 rounded-full transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    Verificar Humano <ArrowRight size={18} />
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="2fa"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex justify-center mb-6">
                  <div className="p-4 bg-indigo-500/10 text-indigo-500 rounded-2xl">
                    <Key size={40} />
                  </div>
                </div>
                <h1 className="text-2xl font-black tracking-tight text-white mb-2 uppercase">Google Authenticator</h1>
                <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
                  Ingresa el código rotativo de 6 dígitos de tu aplicación autenticadora.
                </p>

                <form onSubmit={handleLogin2FA} className="space-y-6">
                  <div>
                    <input 
                      type="text" 
                      maxLength="6"
                      value={totpCode} 
                      onChange={(e) => { setTotpCode(e.target.value.replace(/\\D/g, '')); setError(''); }}
                      placeholder="000000" 
                      className="w-full bg-black/50 border border-indigo-500/30 rounded-2xl px-6 py-5 text-white focus:outline-none focus:border-indigo-500 transition-colors text-center font-mono text-4xl tracking-[0.5em] placeholder-zinc-700"
                      autoFocus
                      required
                    />
                  </div>
                  {error && <p className="text-red-500 text-xs font-bold uppercase tracking-wider animate-pulse">{error}</p>}
                  <button 
                    type="submit" 
                    disabled={totpCode.length !== 6 || isAuthenticating}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-[0.2em] py-4 rounded-full transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isAuthenticating ? <Loader2 size={18} className="animate-spin" /> : <>Validar y Entrar <ShieldCheck size={18} /></>}
                  </button>
                  <div className="pt-4 text-center">
                    <button 
                      type="button" 
                      onClick={() => { setCaptchaPassed(false); generateCaptcha(); setTotpCode(''); setError(''); }}
                      className="text-xs text-zinc-500 hover:text-white font-bold uppercase tracking-widest transition-colors focus:outline-none"
                    >
                      Volver atrás
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
`;

fs.writeFileSync(filePath, newContent);
console.log("SuperAdminRouter completely refactored for Passwordless!");
