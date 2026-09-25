import React from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import * as OTPAuth from 'otpauth';
import { AlertCircle, LogOut } from 'lucide-react';
import EcommerceLayout from './EcommerceLayout';
import EcommerceDashboard from './pages/EcommerceDashboard';
import ProductsManager from './pages/ProductsManager';
import ProductStudio from './pages/ProductStudio';
import OrdersManager from './pages/OrdersManager';
import SupportManager from './pages/SupportManager';
import PromotionsManager from './pages/PromotionsManager';
import OffersManager from './pages/OffersManager';
import NotificationsManager from './pages/NotificationsManager';
import StorefrontSettings from './pages/StorefrontSettings';
import CartSettings from './pages/CartSettings';
import AnalyticsManager from './pages/AnalyticsManager';
import ReviewsManager from './pages/ReviewsManager';
import InventoryManager from './pages/InventoryManager';

import StoreProfileManager from './pages/StoreProfileManager';
import StoreLocationManager from './pages/StoreLocationManager';
import PublicStore from './pages/PublicStore';
import MarketplaceDirectory from './pages/MarketplaceDirectory';
import PricingPage from './pages/PricingPage';
import CustomerProfile from './pages/CustomerProfile';
import OrderPreparation from './pages/OrderPreparation';

const MerchantGuard = () => {
  const isMerchantLogged = localStorage.getItem('activeWorkspace');

  // Regla: Exclusión Mutua Automática
  // Si entra al panel de comerciante, cerramos automáticamente cualquier sesión de cliente
  localStorage.removeItem('ecommerce_current_customer');
  localStorage.removeItem('ecommerce_user');

  if (!isMerchantLogged) {
    return <Navigate to="/ecommerce/live" replace />;
  }

  return <Outlet />;
};

const CustomerGuard = () => {
  // Ya no eliminamos activeWorkspace aquí porque rompe la previsualización de la vitrina en otra pestaña.
  // El conflicto real ya fue resuelto en MerchantGuard al eliminar el customer.
  return <Outlet />;
};

const AdminGuard = () => {
  const [pin, setPin] = React.useState('');
  const [error, setError] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const location = useLocation();
  const [adminPin, setAdminPin] = React.useState(null);
  const [mfaSecret, setMfaSecret] = React.useState(null);
  const [isUnlocked, setIsUnlocked] = React.useState(false);
  
  const [show2FA, setShow2FA] = React.useState(false);
  const [mfaCode, setMfaCode] = React.useState('');
  const [mfaError, setMfaError] = React.useState('');
  
  const [recoverySuccess, setRecoverySuccess] = React.useState(false);
  const [newPin, setNewPin] = React.useState('');
  const [updatingPin, setUpdatingPin] = React.useState(false);
  const [updateMsg, setUpdateMsg] = React.useState('');

  React.useEffect(() => {
    if (isUnlocked) {
      setLoading(false);
      return;
    }
    const wsId = localStorage.getItem('activeWorkspace');
    if (!wsId) {
      setLoading(false);
      return;
    }
    fetch('http://localhost:3001/api/workspaces', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        const ws = data.find(w => w.id === wsId);
        if (ws && ws.config) {
          if (ws.config.adminPin) setAdminPin(ws.config.adminPin);
          if (ws.config.mfaSecret) setMfaSecret(ws.config.mfaSecret);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    // Si cambia de ruta dentro del área protegida, vuelve a pedir el PIN
    setIsUnlocked(false);
    setShow2FA(false);
    setRecoverySuccess(false);
    setMfaCode('');
    setMfaError('');
    setNewPin('');
    setUpdateMsg('');
  }, [location.pathname]);

  if (loading) return <div className="p-8 flex-1 flex items-center justify-center text-slate-500 text-sm font-bold animate-pulse">Verificando acceso...</div>;

  if (!adminPin || isUnlocked) {
    return <Outlet />;
  }

  const handleUnlock = (e) => {
    e.preventDefault();
    if (pin === adminPin) {
      setIsUnlocked(true);
      
      const wsId = localStorage.getItem('activeWorkspace');
      if (wsId) {
        fetch('http://localhost:3001/api/workspaces/notify-pin-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceId: wsId })
        }).catch(console.error);
      }
    } else {
      setError(true);
      setPin('');
    }
  };

  const handleVerify2FA = (e) => {
    e.preventDefault();
    if (!mfaSecret) {
      setMfaError('No tienes configurado el 2FA en tu tienda.');
      return;
    }

    try {
      const totp = new OTPAuth.TOTP({
        issuer: 'Axon Market',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(mfaSecret)
      });
      
      const delta = totp.validate({ token: mfaCode, window: 10 });
      if (delta === null) {
        setMfaError('Código 2FA incorrecto');
        setMfaCode('');
      } else {
        setRecoverySuccess(true);
      }
    } catch (err) {
      console.error(err);
      setMfaError('Error verificando 2FA');
    }
  };

  const handleUpdatePin = async (e) => {
    e.preventDefault();
    if (newPin.length < 4) {
      setUpdateMsg('El PIN debe tener al menos 4 dígitos.');
      return;
    }
    setUpdatingPin(true);
    setUpdateMsg('');
    try {
      const wsId = localStorage.getItem('activeWorkspace');
      
      const res = await fetch(`http://localhost:3001/api/workspaces`);
      const data = await res.json();
      const ws = data.find(w => w.id === wsId);
      
      const updatedConfig = { ...ws.config, adminPin: newPin };

      const putRes = await fetch(`http://localhost:3001/api/workspaces/${wsId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: updatedConfig, store_slug: ws.store_slug || ws.slug })
      });

      if (putRes.ok) {
        setAdminPin(newPin);
        setUpdateMsg('¡PIN actualizado correctamente!');
        setTimeout(() => {
          setIsUnlocked(true);
        }, 1500);
      } else {
        setUpdateMsg('Error al actualizar el PIN.');
      }
    } catch (err) {
      console.error(err);
      setUpdateMsg('Error de conexión.');
    } finally {
      setUpdatingPin(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center">
        <div className="bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
          {recoverySuccess ? 'Verificación Exitosa' : (show2FA ? 'Recuperación por 2FA' : 'Acceso Restringido')}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
          {recoverySuccess ? 'Puedes ver tu PIN actual o establecer uno nuevo a continuación.' : (show2FA ? 'Ingresa el código de 6 dígitos de tu aplicación autenticadora.' : 'Ingresa el PIN de administrador para ver este módulo.')}
        </p>
        
        {recoverySuccess ? (
          <div>
            <div className="bg-zinc-100 dark:bg-zinc-950 p-4 rounded-xl mb-6 border border-slate-200 dark:border-zinc-800">
              <p className="text-xs text-zinc-500 mb-1">Tu PIN actual es:</p>
              <p className="font-mono text-2xl tracking-[0.5em] text-amber-500 font-bold">{adminPin}</p>
            </div>
            
            <form onSubmit={handleUpdatePin} className="mb-4">
              <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase tracking-widest text-left">Crear un Nuevo PIN (Opcional)</label>
              <input 
                type="password" 
                maxLength={4}
                value={newPin}
                onChange={e => {setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setUpdateMsg('');}}
                className="w-full text-center tracking-[1em] font-mono text-xl py-3 bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-white mb-4 focus:outline-none focus:border-amber-500/50"
                placeholder="Nuevo"
              />
              <button type="submit" disabled={!newPin || updatingPin || newPin.length !== 4} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 text-sm">
                {updatingPin ? 'Guardando...' : 'Cambiar PIN'}
              </button>
              {updateMsg && <p className={`text-xs mt-2 font-medium ${updateMsg.includes('Error') ? 'text-red-500' : 'text-emerald-500'}`}>{updateMsg}</p>}
            </form>
            
            <button onClick={() => setIsUnlocked(true)} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 rounded-xl transition-colors mt-2">
              Continuar al Panel
            </button>
          </div>
        ) : !show2FA ? (
          <form onSubmit={handleUnlock}>
            <input 
              type="password" 
              maxLength={4}
              value={pin}
              onChange={e => {setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(false);}}
              className={`w-full text-center tracking-[1em] font-mono text-2xl py-3 bg-slate-100 dark:bg-zinc-950 border ${error ? 'border-red-500' : 'border-slate-200 dark:border-zinc-800'} rounded-xl text-slate-900 dark:text-white mb-4 focus:outline-none`}
              placeholder="****"
              autoFocus
            />
            {error && <p className="text-red-500 text-xs font-bold mb-4">PIN incorrecto</p>}
            <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 rounded-xl transition-colors mb-4">Desbloquear</button>
            
            <div className="text-center mt-2">
              <button 
                type="button" 
                onClick={() => setShow2FA(true)}
                className="text-xs font-bold text-slate-500 hover:text-amber-500 transition-colors"
              >
                ¿Olvidaste tu PIN?
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerify2FA}>
            <input 
              type="text" 
              maxLength={6}
              value={mfaCode}
              onChange={e => {setMfaCode(e.target.value.replace(/\D/g, '')); setMfaError('');}}
              className={`w-full text-center tracking-[1em] font-mono text-2xl py-3 bg-slate-100 dark:bg-zinc-950 border ${mfaError ? 'border-red-500' : 'border-slate-200 dark:border-zinc-800'} rounded-xl text-slate-900 dark:text-white mb-4 focus:outline-none`}
              placeholder="123456"
              autoFocus
            />
            {mfaError && <p className="text-red-500 text-xs font-bold mb-4">{mfaError}</p>}
            <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 rounded-xl transition-colors mb-4">Verificar 2FA</button>
            
            <div className="text-center mt-2">
              <button 
                type="button" 
                onClick={() => setShow2FA(false)}
                className="text-xs font-bold text-slate-500 hover:text-amber-500 transition-colors"
              >
                Volver al PIN normal
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default function EcommerceRouter({ theme, toggleTheme }) {
  return (
    <Routes>
      {/* Rutas para clientes (Compradores) */}
      <Route element={<CustomerGuard />}>
        <Route path="live/profile" element={<CustomerProfile />} />
        <Route path="live/:slug" element={<PublicStore />} />
        <Route path="live" element={<MarketplaceDirectory />} />
        <Route path="pricing" element={<PricingPage />} />
      </Route>
      
      <Route path="picking" element={<OrderPreparation />} />
      
      {/* Rutas protegidas exclusivamente para comerciantes */}
      <Route element={<MerchantGuard />}>
        <Route element={<EcommerceLayout theme={theme} toggleTheme={toggleTheme} />}>
          {/* Rutas Protegidas por PIN */}
          <Route element={<AdminGuard />}>
            <Route index element={<EcommerceDashboard />} />
            <Route path="analytics" element={<AnalyticsManager />} />
            <Route path="store-profile" element={<StoreProfileManager />} />
          </Route>
          <Route path="products" element={<ProductsManager />} />
          <Route path="product-studio" element={<ProductStudio />} />
          <Route path="product-studio/:id" element={<ProductStudio />} />
          <Route path="inventory" element={<InventoryManager />} />
          <Route path="orders" element={<OrdersManager />} />
        <Route path="support" element={<SupportManager />} />
          <Route path="preparation" element={<OrderPreparation />} />
          <Route path="reviews" element={<ReviewsManager />} />
          <Route path="promotions" element={<PromotionsManager />} />
          <Route path="offers" element={<OffersManager />} />
          <Route path="notifications" element={<NotificationsManager />} />
          <Route path="storefront" element={<StorefrontSettings />} />
          <Route path="cart-settings" element={<CartSettings />} />
          <Route path="location" element={<StoreLocationManager />} />

        </Route>
      </Route>
    </Routes>
  );
}
