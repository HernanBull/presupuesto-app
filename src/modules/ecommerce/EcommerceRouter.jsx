import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AlertCircle, LogOut } from 'lucide-react';
import EcommerceLayout from './EcommerceLayout';
import EcommerceDashboard from './pages/EcommerceDashboard';
import ProductsManager from './pages/ProductsManager';
import ProductStudio from './pages/ProductStudio';
import OrdersManager from './pages/OrdersManager';
import PromotionsManager from './pages/PromotionsManager';
import OffersManager from './pages/OffersManager';
import NotificationsManager from './pages/NotificationsManager';
import StorefrontSettings from './pages/StorefrontSettings';
import CartSettings from './pages/CartSettings';
import AnalyticsManager from './pages/AnalyticsManager';
import ReviewsManager from './pages/ReviewsManager';
import InventoryManager from './pages/InventoryManager';
import StoreSettings from './pages/StoreSettings';
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
    return <Navigate to="/register" replace />;
  }

  return <Outlet />;
};

const CustomerGuard = () => {
  // Ya no eliminamos activeWorkspace aquí porque rompe la previsualización de la vitrina en otra pestaña.
  // El conflicto real ya fue resuelto en MerchantGuard al eliminar el customer.
  return <Outlet />;
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
          <Route index element={<EcommerceDashboard />} />
          <Route path="analytics" element={<AnalyticsManager />} />
          <Route path="products" element={<ProductsManager />} />
          <Route path="product-studio" element={<ProductStudio />} />
          <Route path="product-studio/:id" element={<ProductStudio />} />
          <Route path="inventory" element={<InventoryManager />} />
          <Route path="orders" element={<OrdersManager />} />
          <Route path="preparation" element={<OrderPreparation />} />
          <Route path="reviews" element={<ReviewsManager />} />
          <Route path="promotions" element={<PromotionsManager />} />
          <Route path="offers" element={<OffersManager />} />
          <Route path="notifications" element={<NotificationsManager />} />
          <Route path="storefront" element={<StorefrontSettings />} />
          <Route path="cart-settings" element={<CartSettings />} />
          <Route path="store-profile" element={<StoreProfileManager />} />
          <Route path="location" element={<StoreLocationManager />} />
          <Route path="settings" element={<StoreSettings />} />
        </Route>
      </Route>
    </Routes>
  );
}
