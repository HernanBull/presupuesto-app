import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import './index.css';
import DeliveryRouter from './modules/delivery/DeliveryRouter';
import { Package } from 'lucide-react';

function SandboxApp() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  // Sesión simulada para engañar a los módulos
  const mockSession = { user: { id: 'sandbox-user', email: 'sandbox@test.com' } };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        {/* Navbar de Sandbox */}
        <header className="bg-slate-900 text-white p-4 shadow-lg flex items-center justify-between z-50 relative">
          <div className="flex items-center gap-6">
            <div className="font-mono font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded border border-emerald-400/20">
              🛠️ DEV SANDBOX
            </div>
            <nav className="flex gap-4">
              <Link to="/delivery" className="flex items-center gap-2 hover:text-amber-400 transition-colors">
                <Package size={18} />
                Delivery
              </Link>
              <Link to="/delivery/settings" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors ml-4">
                ⚙️ Ajustes Agencia
              </Link>
            </nav>
          </div>
          <div className="text-sm text-slate-400">
            Aislado de la App Principal
          </div>
        </header>

        {/* Área de Renderizado de Módulos */}
        <div className="flex-1 relative overflow-auto">
          <Routes>
            <Route path="/" element={
              <div className="flex items-center justify-center h-full text-slate-400">
                Selecciona un módulo en la barra superior
              </div>
            } />
            <Route 
              path="/delivery/*" 
              element={<DeliveryRouter session={mockSession} theme={theme} toggleTheme={toggleTheme} />} 
            />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SandboxApp />
  </React.StrictMode>
);
