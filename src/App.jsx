import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './modules/presupuesto/utils/supabaseClient';
import { Login } from './modules/presupuesto/components/Login';
import { LandingPage } from './modules/presupuesto/components/LandingPage';
import { ArrowLeft } from 'lucide-react';
import PresupuestoDashboard from './modules/presupuesto/pages/PresupuestoDashboard';

function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  // Autenticación Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    if (showLogin) {
      return (
        <div className="relative h-screen w-screen bg-black overflow-hidden">
           <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-50">
             <button 
               onClick={() => setShowLogin(false)} 
               className="flex items-center gap-2 px-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-full text-zinc-400 hover:text-white hover:border-amber-500/50 backdrop-blur-md transition-all text-xs font-medium tracking-wide uppercase"
             >
               <ArrowLeft size={16} /> Volver
             </button>
           </div>
           <Login />
        </div>
      );
    }
    return <LandingPage onLoginClick={() => setShowLogin(true)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/presupuesto" replace />} />
        <Route 
          path="/presupuesto/*" 
          element={<PresupuestoDashboard session={session} theme={theme} toggleTheme={toggleTheme} />} 
        />
        {/* Futuras Rutas para ERP, CRM, etc. irán aquí */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
