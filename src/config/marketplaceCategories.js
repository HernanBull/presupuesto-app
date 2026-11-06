import { 
  Store, 
  ShoppingBasket, 
  Package, 
  ShoppingBag, 
  Apple, 
  Coffee, 
  Heart, 
  Sparkles, 
  Shirt, 
  Car, 
  Settings, 
  Wrench, 
  Smartphone, 
  Home 
} from 'lucide-react';

export const MARKETPLACE_CATEGORIES = [
  { id: 'Víveres', name: 'Víveres', fullName: 'Víveres y Abarrotes', icon: ShoppingBasket },
  { id: 'Proteínas', name: 'Proteínas', fullName: 'Carnes, Pollo y Pescado', icon: Package },
  { id: 'Charcutería y Lácteos', name: 'Charcutería', fullName: 'Charcutería y Lácteos', icon: ShoppingBag },
  { id: 'Frutas y Verduras', name: 'Frutas', fullName: 'Frutas y Verduras', icon: Apple },
  { id: 'Panadería y Dulces', name: 'Panadería', fullName: 'Panadería y Dulces', icon: Coffee },
  { id: 'Bebidas y Licores', name: 'Bebidas', fullName: 'Bebidas y Licores', icon: Coffee },
  { id: 'Snacks y Golosinas', name: 'Snacks', fullName: 'Snacks y Golosinas', icon: Package },
  { id: 'Cuidado Personal', name: 'C. Personal', fullName: 'Cuidado Personal y Farmacia', icon: Heart },
  { id: 'Limpieza del Hogar', name: 'Limpieza', fullName: 'Limpieza del Hogar', icon: Sparkles },
  { id: 'Ropa y Calzado', name: 'Ropa', fullName: 'Ropa y Calzado', icon: Shirt },
  { id: 'Repuestos para Carros', name: 'Autos', fullName: 'Repuestos para Carros', icon: Car },
  { id: 'Repuestos para Motos', name: 'Motos', fullName: 'Repuestos para Motos', icon: Settings },
  { id: 'Herramientas y Ferretería', name: 'Ferretería', fullName: 'Herramientas y Ferretería', icon: Wrench },
  { id: 'Tecnología y Celulares', name: 'Tecnología', fullName: 'Tecnología y Celulares', icon: Smartphone },
  { id: 'Hogar y Electrodomésticos', name: 'Hogar', fullName: 'Hogar y Electrodomésticos', icon: Home }
];
