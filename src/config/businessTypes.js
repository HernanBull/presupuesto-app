export const BUSINESS_TYPES = [
  {
    id: 'viveres',
    label: 'Venta de víveres de alta rotación (abastos y minimarkets)',
    icon: 'ShoppingCart',
    defaultModules: ['inventory', 'orders', 'picking', 'analytics'],
    defaultCategories: ['Víveres', 'Bebidas', 'Snacks', 'Lácteos']
  },
  {
    id: 'comida_rapida',
    label: 'Puestos de comida rápida (empanadas, perros calientes, hamburguesas)',
    icon: 'UtensilsCrossed',
    defaultModules: ['orders', 'picking', 'analytics', 'tables'],
    defaultCategories: ['Hamburguesas', 'Perros Calientes', 'Empanadas', 'Bebidas']
  },
  {
    id: 'fruterias',
    label: 'Fruterías y verdulerías',
    icon: 'Apple',
    defaultModules: ['inventory', 'orders', 'picking'],
    defaultCategories: ['Frutas', 'Verduras', 'Hortalizas']
  }
];

export const getFeaturesByModules = (modules) => {
  return {
    hasInventory: modules.includes('inventory'),
    hasOrders: modules.includes('orders'),
    hasPicking: modules.includes('picking'),
    hasProductStudio: modules.includes('product_studio'),
    hasAnalytics: modules.includes('analytics'),
    hasExpirationDates: modules.includes('expiration_dates'),
    hasCalendar: modules.includes('calendar'),
    hasTables: modules.includes('tables'),
  };
};
