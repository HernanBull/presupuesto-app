import React from 'react';
import { Routes, Route } from 'react-router-dom';
import EcommerceLayout from './EcommerceLayout';
import EcommerceDashboard from './pages/EcommerceDashboard';
import ProductsManager from './pages/ProductsManager';
import OrdersManager from './pages/OrdersManager';
import CustomersManager from './pages/CustomersManager';
import PromotionsManager from './pages/PromotionsManager';
import StorefrontSettings from './pages/StorefrontSettings';
import AnalyticsManager from './pages/AnalyticsManager';
import ReviewsManager from './pages/ReviewsManager';
import InventoryManager from './pages/InventoryManager';
import StoreSettings from './pages/StoreSettings';
import PublicStore from './pages/PublicStore';

export default function EcommerceRouter({ theme, toggleTheme }) {
  return (
    <Routes>
      <Route path="live" element={<PublicStore />} />
      <Route element={<EcommerceLayout theme={theme} toggleTheme={toggleTheme} />}>
        <Route index element={<EcommerceDashboard />} />
        <Route path="analytics" element={<AnalyticsManager />} />
        <Route path="products" element={<ProductsManager />} />
        <Route path="inventory" element={<InventoryManager />} />
        <Route path="orders" element={<OrdersManager />} />
        <Route path="customers" element={<CustomersManager />} />
        <Route path="reviews" element={<ReviewsManager />} />
        <Route path="promotions" element={<PromotionsManager />} />
        <Route path="storefront" element={<StorefrontSettings />} />
        <Route path="settings" element={<StoreSettings />} />
      </Route>
    </Routes>
  );
}
