import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

const AppToaster = () => (
  <Toaster 
    position="bottom-center"
    toastOptions={{
      style: { background: "#18181b", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", zIndex: 999999 }
    }}
  />
);
import { supabase } from './modules/presupuesto/utils/supabaseClient';
import { Login } from './modules/presupuesto/components/Login';
import { LandingPage } from './modules/presupuesto/components/LandingPage';
import { ArrowLeft } from 'lucide-react';
import PresupuestoDashboard from './modules/presupuesto/pages/PresupuestoDashboard';
import EcommerceRouter from './modules/ecommerce/EcommerceRouter';
import DeliveryRouter from './modules/delivery/DeliveryRouter';
import { startTelegramEngine } from './modules/delivery/utils/telegramService';

import SuperAdminRouter from './modules/superadmin/SuperAdminRouter';

function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [showLogin, setShowLogin] = useState(false);

  // Aislar módulos para pruebas sin autenticación
  const isDeliveryRoute = window.location.pathname.startsWith('/delivery');
  const isSuperAdminRoute = window.location.pathname.startsWith('/axs-vault-99xqz');
  const isPresupuestoRoute = window.location.pathname.startsWith('/presupuesto');

  // El E-commerce ahora es el core de la aplicación (Directorio Raíz)
  const isEcommerceRoute = !isDeliveryRoute && !isSuperAdminRoute && !isPresupuestoRoute;

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
    
    // Iniciar el motor de Telegram a nivel global para que escuche en todos los módulos
    startTelegramEngine();
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

  if (authLoading && !isEcommerceRoute && !isDeliveryRoute && !isSuperAdminRoute) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (isEcommerceRoute) {
    return (
      <>
        <AppToaster />
        <BrowserRouter>
          <Routes>
            <Route 
              path="/*" 
              element={<EcommerceRouter session={null} theme={theme} toggleTheme={toggleTheme} />} 
            />
          </Routes>
        </BrowserRouter>
      </>
    );
  }

  if (isDeliveryRoute) {
    return (
      <>
        <AppToaster />
        <BrowserRouter>
          <Routes>
            <Route 
              path="/delivery/*" 
              element={<DeliveryRouter session={null} theme={theme} toggleTheme={toggleTheme} />} 
            />
          </Routes>
        </BrowserRouter>
      </>
    );
  }



  if (isSuperAdminRoute) {
    return (
      <>
        <AppToaster />
        <BrowserRouter>
          <Routes>
            <Route path="/axs-vault-99xqz/*" element={<SuperAdminRouter session={session} />} />
          </Routes>
        </BrowserRouter>
      </>
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
    // Axon Market es la página principal del MVP.
    // La LandingPage queda oculta; redirigimos al marketplace público.
    if (!isEcommerceRoute && !isDeliveryRoute && !isSuperAdminRoute) {
      window.location.replace('/');
      return <div style={{ minHeight: '100vh', background: '#000' }} />;
    }
  }

  return (
    <>
      <AppToaster />
      <BrowserRouter>
        <Routes>
          <Route 
            path="/presupuesto/*" 
            element={<PresupuestoDashboard session={session} theme={theme} toggleTheme={toggleTheme} />} 
          />
          {/* Futuras Rutas para ERP, CRM, etc. irán aquí */}
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
