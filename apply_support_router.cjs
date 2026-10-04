const fs = require('fs');

// 1. Update EcommerceLayout.jsx
let layoutContent = fs.readFileSync('src/modules/ecommerce/EcommerceLayout.jsx', 'utf8');
if (!layoutContent.includes('path: \'/ecommerce/support\'')) {
  layoutContent = layoutContent.replace(
    `import { LayoutDashboard, ShoppingBag, ShoppingCart, Settings, ArrowLeft, Sun, Moon, Tag, MonitorSmartphone, BarChart3, MessageSquare, PackageSearch, Box, Wallet, Zap, MapPin, Bell, CheckCheck } from 'lucide-react';`,
    `import { LayoutDashboard, ShoppingBag, ShoppingCart, Settings, ArrowLeft, Sun, Moon, Tag, MonitorSmartphone, BarChart3, MessageSquare, PackageSearch, Box, Wallet, Zap, MapPin, Bell, CheckCheck, LifeBuoy } from 'lucide-react';`
  );
  
  layoutContent = layoutContent.replace(
    `{ name: 'Pedidos', path: '/ecommerce/orders', icon: ShoppingCart },`,
    `{ name: 'Pedidos', path: '/ecommerce/orders', icon: ShoppingCart },\n    { name: 'Soporte', path: '/ecommerce/support', icon: LifeBuoy },`
  );
  
  fs.writeFileSync('src/modules/ecommerce/EcommerceLayout.jsx', layoutContent, 'utf8');
  console.log('EcommerceLayout updated');
}

// 2. Update EcommerceRouter.jsx
let routerContent = fs.readFileSync('src/modules/ecommerce/EcommerceRouter.jsx', 'utf8');
if (!routerContent.includes('SupportManager')) {
  routerContent = routerContent.replace(
    `import OrdersManager from './pages/OrdersManager';`,
    `import OrdersManager from './pages/OrdersManager';\nimport SupportManager from './pages/SupportManager';`
  );
  
  routerContent = routerContent.replace(
    `<Route path="orders" element={<OrdersManager />} />`,
    `<Route path="orders" element={<OrdersManager />} />\n        <Route path="support" element={<SupportManager />} />`
  );
  
  fs.writeFileSync('src/modules/ecommerce/EcommerceRouter.jsx', routerContent, 'utf8');
  console.log('EcommerceRouter updated');
}
