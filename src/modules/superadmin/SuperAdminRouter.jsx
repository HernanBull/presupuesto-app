import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import { ShieldAlert, ArrowRight, Loader2, X, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SuperAdminRouter() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('superadmin_key');
    if (savedKey) {
      setKey(savedKey);
      fetch('http://localhost:3001/api/superadmin/merchants', { headers: { 'x-superadmin-key': savedKey } })
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
    fetch('http://localhost:3001/api/superadmin/merchants', {
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
                <button onClick={() => setIsRecoveryOpen(false)} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
                
                <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500">
                  <Key size={32} />
                </div>
                
                <h2 className="text-xl font-black text-white uppercase tracking-widest mb-4">Recuperación de Clave</h2>
                
                <p className="text-sm text-zinc-400 font-light leading-relaxed mb-6">
                  Por motivos de seguridad máxima, la clave maestra del ecosistema no puede ser extraída ni reseteada desde esta interfaz.
                </p>

                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 mb-8 text-left relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                  <p className="text-xs text-zinc-300 font-medium">
                    Para visualizar o cambiar tu clave actual, por favor dirígete a los archivos de tu servidor web, abre el archivo <code className="text-red-400 font-mono bg-red-500/10 px-1 py-0.5 rounded">.env</code> y busca la variable:
                  </p>
                  <p className="text-center text-white font-mono font-bold mt-4 tracking-wider text-sm bg-black/50 py-2 rounded-lg border border-white/5">
                    VITE_SUPERADMIN_KEY
                  </p>
                </div>
                
                <button 
                  onClick={() => setIsRecoveryOpen(false)}
                  className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-full py-3 text-xs font-bold uppercase tracking-widest transition-colors"
                >
                  Entendido
                </button>
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
