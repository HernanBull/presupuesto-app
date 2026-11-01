// Catálogos semilla con 30 productos típicos por rubro para AxonMarket
export const SEED_CATALOGS_BY_RUBRO = {
  almacen: {
    rubroName: 'bodega y abasto',
    items: [
      { name: 'Harina PAN Maíz Blanco 1 Kg', category: 'Víveres', priceUsd: 1.45, refPriceLabel: 'Ref. $1.45', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80' },
      { name: 'Arroz Blanco Mary Tradicional 1 Kg', category: 'Víveres', priceUsd: 1.60, refPriceLabel: 'Ref. $1.60', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80' },
      { name: 'Pasta Primor Spaghetti 1 Kg', category: 'Víveres', priceUsd: 1.85, refPriceLabel: 'Ref. $1.85', image: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400&q=80' },
      { name: 'Aceite de Maíz Mazeite 1 Litro', category: 'Víveres', priceUsd: 4.10, refPriceLabel: 'Ref. $4.10', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80' },
      { name: 'Café Fama de América 250g', category: 'Café', priceUsd: 3.50, refPriceLabel: 'Ref. $3.50', image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&q=80' },
      { name: 'Azúcar Montalbán Blanca 1 Kg', category: 'Víveres', priceUsd: 1.50, refPriceLabel: 'Ref. $1.50', image: 'https://images.unsplash.com/photo-1622484214149-68d0e52731bc?w=400&q=80' },
      { name: 'Refresco Coca-Cola Sabor Original 2 Litros', category: 'Bebidas', priceUsd: 2.80, refPriceLabel: 'Ref. $2.80', image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80' },
      { name: 'Galletas Oreo Chocolate 4 Paquetes', category: 'Snacks', priceUsd: 2.20, refPriceLabel: 'Ref. $2.20', image: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&q=80' },
      { name: 'Leche Completa La Campiña en Polvo 900g', category: 'Lácteos', priceUsd: 9.80, refPriceLabel: 'Ref. $9.80', image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80' },
      { name: 'Mayonesa Mavesa 445g', category: 'Salsas', priceUsd: 2.95, refPriceLabel: 'Ref. $2.95', image: 'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?w=400&q=80' },
      { name: 'Salsa de Tomate Pampero Ketchup 397g', category: 'Salsas', priceUsd: 1.75, refPriceLabel: 'Ref. $1.75', image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400&q=80' },
      { name: 'Atún Margarita en Aceite 140g', category: 'Enlatados', priceUsd: 1.95, refPriceLabel: 'Ref. $1.95', image: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?w=400&q=80' },
      { name: 'Margarina Mavesa 500g', category: 'Lácteos', priceUsd: 2.10, refPriceLabel: 'Ref. $2.10', image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&q=80' },
      { name: 'Queso Paisa Rebanado 400g', category: 'Charcutería', priceUsd: 5.50, refPriceLabel: 'Ref. $5.50', image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&q=80' },
      { name: 'Jamón de Pierna Plumrose 250g', category: 'Charcutería', priceUsd: 4.80, refPriceLabel: 'Ref. $4.80', image: 'https://images.unsplash.com/photo-1524438418049-ab2acb7aa48f?w=400&q=80' },
      { name: 'Caraotas Negras Mary 500g', category: 'Granos', priceUsd: 1.70, refPriceLabel: 'Ref. $1.70', image: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400&q=80' },
      { name: 'Detergente en Polvo Las Llaves 1 Kg', category: 'Limpieza', priceUsd: 3.20, refPriceLabel: 'Ref. $3.20', image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&q=80' },
      { name: 'Papel Higiénico Rosal Triple Hoja 4 Rollos', category: 'Higiene', priceUsd: 2.50, refPriceLabel: 'Ref. $2.50', image: 'https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=400&q=80' },
      { name: 'Jabón de Tocador Protex Antibacterial 110g', category: 'Higiene', priceUsd: 1.25, refPriceLabel: 'Ref. $1.25', image: 'https://images.unsplash.com/photo-1607602132700-068258431c6c?w=400&q=80' },
      { name: 'Snack Cheese Tris Frito-Lay 150g', category: 'Snacks', priceUsd: 1.60, refPriceLabel: 'Ref. $1.60', image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=80' },
      { name: 'Galletas María Puig Tradicional 150g', category: 'Snacks', priceUsd: 1.10, refPriceLabel: 'Ref. $1.10', image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&q=80' },
      { name: 'Cereal Flips Chocolate 220g', category: 'Cereales', priceUsd: 3.80, refPriceLabel: 'Ref. $3.80', image: 'https://images.unsplash.com/photo-1521483451569-e33803c0330c?w=400&q=80' },
      { name: 'Sardinas en Tomate La Gaviota 170g', category: 'Enlatados', priceUsd: 1.15, refPriceLabel: 'Ref. $1.15', image: 'https://images.unsplash.com/photo-1534483509719-3feaee7c30da?w=400&q=80' },
      { name: 'Vinagre Blanco El Sol 1 Litro', category: 'Víveres', priceUsd: 1.30, refPriceLabel: 'Ref. $1.30', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=80' },
      { name: 'Crema Dental Colgate Triple Acción 100ml', category: 'Higiene', priceUsd: 2.10, refPriceLabel: 'Ref. $2.10', image: 'https://images.unsplash.com/photo-1559656914-a30970c1affd?w=400&q=80' },
      { name: 'Shampoo Pantene Restauración 400ml', category: 'Cuidado Personal', priceUsd: 5.40, refPriceLabel: 'Ref. $5.40', image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400&q=80' },
      { name: 'Agua Mineral Minalba 1.5 Litros', category: 'Bebidas', priceUsd: 1.20, refPriceLabel: 'Ref. $1.20', image: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=400&q=80' },
      { name: 'Cloro Los Roques Concentrado 1 Litro', category: 'Limpieza', priceUsd: 1.50, refPriceLabel: 'Ref. $1.50', image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&q=80' },
      { name: 'Lavaplatos Axion Limón Pasta 450g', category: 'Limpieza', priceUsd: 1.90, refPriceLabel: 'Ref. $1.90', image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&q=80' },
      { name: 'Nutella Ferrero Crema de Avellanas 350g', category: 'Dulces', priceUsd: 6.50, refPriceLabel: 'Ref. $6.50', image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&q=80' }
    ]
  },
  farmacia: {
    rubroName: 'farmacia y salud',
    items: [
      { name: 'Acetaminofén 500mg (10 Tabletas)', category: 'Analgésicos', priceUsd: 1.20, refPriceLabel: 'Ref. $1.20', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80' },
      { name: 'Ibuprofeno 400mg (10 Cápsulas)', category: 'Antiinflamatorios', priceUsd: 1.80, refPriceLabel: 'Ref. $1.80', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80' },
      { name: 'Alcohol Antiséptico 70% 500ml', category: 'Primeros Auxilios', priceUsd: 2.20, refPriceLabel: 'Ref. $2.20', image: 'https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=400&q=80' },
      { name: 'Loratadina 10mg (10 Tabletas)', category: 'Antialérgicos', priceUsd: 1.50, refPriceLabel: 'Ref. $1.50', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80' },
      { name: 'Omeprazol 20mg (14 Cápsulas)', category: 'Gástrico', priceUsd: 2.50, refPriceLabel: 'Ref. $2.50', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=80' },
      { name: 'Vitamina C 500mg Masticable (30 Tabletas)', category: 'Vitaminas', priceUsd: 4.80, refPriceLabel: 'Ref. $4.80', image: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=400&q=80' }
    ]
  },
  gastronomia: {
    rubroName: 'gastronomía y restaurante',
    items: [
      { name: 'Hamburguesa Especial Doble Carne', category: 'Hamburguesas', priceUsd: 7.50, refPriceLabel: 'Ref. $7.50', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80' },
      { name: 'Pizza Familiar Pepperoni Crujiente', category: 'Pizzas', priceUsd: 12.00, refPriceLabel: 'Ref. $12.00', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80' },
      { name: 'Ración de Papas Fritas con Cheddar y Tocineta', category: 'Entradas', priceUsd: 4.50, refPriceLabel: 'Ref. $4.50', image: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=400&q=80' },
      { name: 'Club House Sandwich Cuatro Pisos con Papas', category: 'Sandwiches', priceUsd: 6.80, refPriceLabel: 'Ref. $6.80', image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&q=80' },
      { name: 'Nuggets de Pollo Crocantes (8 piezas)', category: 'Snacks', priceUsd: 4.20, refPriceLabel: 'Ref. $4.20', image: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&q=80' },
      { name: 'Malteada de Chocolate con Crema Batida', category: 'Bebidas', priceUsd: 3.50, refPriceLabel: 'Ref. $3.50', image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&q=80' }
    ]
  },
  ferreteria: {
    rubroName: 'ferretería y construcción',
    items: [
      { name: 'Bombillo LED 9W Luz Blanca E27', category: 'Electricidad', priceUsd: 1.25, refPriceLabel: 'Ref. $1.25', image: 'https://images.unsplash.com/photo-1550985543-f47f38aeee65?w=400&q=80' },
      { name: 'Tirro Plástico / Teflón para Tuberías 3/4', category: 'Plomería', priceUsd: 0.80, refPriceLabel: 'Ref. $0.80', image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=80' },
      { name: 'Martillo de Uña Curva 16 Oz Mango Fibra', category: 'Herramientas', priceUsd: 6.50, refPriceLabel: 'Ref. $6.50', image: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=400&q=80' },
      { name: 'Cinta Métrica 5 Metros con Freno', category: 'Herramientas', priceUsd: 3.20, refPriceLabel: 'Ref. $3.20', image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&q=80' },
      { name: 'Juego de Destornilladores 6 Piezas', category: 'Herramientas', priceUsd: 7.90, refPriceLabel: 'Ref. $7.90', image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400&q=80' },
      { name: 'Pintura de Caucho Blanco Galón Interior', category: 'Pinturas', priceUsd: 14.50, refPriceLabel: 'Ref. $14.50', image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&q=80' }
    ]
  }
};

export const getCatalogForRubro = (rubroId) => {
  return SEED_CATALOGS_BY_RUBRO[rubroId] || SEED_CATALOGS_BY_RUBRO.almacen;
};
