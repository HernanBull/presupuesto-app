import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import { ShieldAlert, ArrowRight, Loader2, ShieldCheck, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../modules/presupuesto/utils/supabaseClient'; // Adjust path if needed

export default function SuperAdminRouter({ session }) {
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkRole = async () => {
      if (!session?.user) {
        setIsLoading(false);
        return;
      }

      try {
        // Query the user_roles table
        const { data, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();

        if (roleError) throw roleError;

        if (data?.role === 'superadmin') {
          setIsSuperadmin(true);
        } else {
          setError('Tu cuenta no tiene los privilegios necesarios.');
        }
      } catch (err) {
        console.error('Error verifying superadmin role:', err);
        setError('Acceso Denegado. No eres Superadministrador.');
      } finally {
        setIsLoading(false);
      }
    };

    checkRole();
  }, [session]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-red-500" />
      </div>
    );
  }

  // Si no hay sesión iniciada en Supabase, mostramos error
  if (!session) {
    return (
      <div className="min-h-screen bg-black text-slate-50 flex items-center justify-center p-4 font-sans relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-900/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="w-full max-w-md bg-zinc-950/80 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] text-center relative z-10">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-red-500/10 text-red-500 rounded-2xl">
              <ShieldAlert size={40} />
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mb-2 uppercase">No Autenticado</h1>
          <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
            Debes iniciar sesión con tu cuenta de administrador en la página principal para acceder aquí.
          </p>
          <button onClick={() => window.location.href = '/'} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-[0.2em] py-4 rounded-full transition-all flex items-center justify-center gap-2">
            <Home size={18} /> Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  // Si tiene sesión pero NO es superadmin
  if (!isSuperadmin) {
    return (
      <div className="min-h-screen bg-black text-slate-50 flex items-center justify-center p-4 font-sans relative overflow-hidden">
        <div className="w-full max-w-md bg-zinc-950/80 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] text-center relative z-10">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-red-500/10 text-red-500 rounded-2xl">
              <ShieldAlert size={40} />
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mb-2 uppercase">Acceso Denegado</h1>
          <p className="text-red-400 font-bold mb-4">{error}</p>
          <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
            Esta zona está restringida únicamente para personal autorizado de nivel 4 (Superadmin). Todos los intentos de acceso son registrados.
          </p>
          <button onClick={() => window.location.href = '/'} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-[0.2em] py-4 rounded-full transition-all flex items-center justify-center gap-2">
            <ArrowRight size={18} /> Salir de Aquí
          </button>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route index element={<SuperAdminDashboard />} />
      <Route path="*" element={<Navigate to="/superadmin" />} />
    </Routes>
  );
}
