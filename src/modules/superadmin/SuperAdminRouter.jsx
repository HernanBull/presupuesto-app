import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import { ShieldAlert, ArrowRight, Loader2 } from 'lucide-react';

export default function SuperAdminRouter() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoading(true);
    fetch('http://localhost:3001/api/superadmin/merchants', {
      headers: { 'x-superadmin-key': key }
    })
    .then(res => {
      setIsLoading(false);
      if (res.ok) {
        setIsAuthenticated(true);
        localStorage.setItem('superadmin_key', key);
      } else {
        setError('Clave maestra incorrecta');
      }
    })
    .catch(() => {
      setIsLoading(false);
      setError('Error de conexión con el servidor');
    });
  };

  if (!isAuthenticated) {
    const savedKey = localStorage.getItem('superadmin_key');
    if (savedKey && key === '') {
      setKey(savedKey);
      fetch('http://localhost:3001/api/superadmin/merchants', { headers: { 'x-superadmin-key': savedKey } })
        .then(res => {
          if (res.ok) setIsAuthenticated(true);
          else localStorage.removeItem('superadmin_key');
        }).catch(()=>{});
    }

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
          </form>
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
