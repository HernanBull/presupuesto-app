import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Asegurar que exista la carpeta uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configurar multer para guardar archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Nombre único conservando extensión original
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Limite de 50MB
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } 
});

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Por si acaso también envían mucho json
app.use('/uploads', express.static(uploadDir)); // Servir archivos estáticamente

// Endpoint de subida
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Devolver datos del archivo guardado
    res.json({
      url: `http://localhost:${PORT}/uploads/${req.file.filename}`,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener todos los servicios
app.get('/api/services', (req, res) => {
  try {
    const services = db.prepare('SELECT * FROM services').all();
    // Parsear el JSON del logbook
    const formattedServices = services.map(s => ({
      ...s,
      logbook: s.logbook ? JSON.parse(s.logbook) : null
    }));
    res.json(formattedServices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear un servicio
app.post('/api/services', (req, res) => {
  const { id, name, description, cost, price, category, logbook } = req.body;
  try {
    const insert = db.prepare(`
      INSERT INTO services (id, name, description, cost, price, category, logbook)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run(
      id || Date.now().toString(),
      name,
      description || '',
      cost || 0,
      price || 0,
      category || '',
      JSON.stringify(logbook || {})
    );
    res.status(201).json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar un servicio
app.put('/api/services/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, cost, price, category, logbook } = req.body;
  try {
    const update = db.prepare(`
      UPDATE services
      SET name = ?, description = ?, cost = ?, price = ?, category = ?, logbook = ?
      WHERE id = ?
    `);
    update.run(
      name,
      description || '',
      cost || 0,
      price || 0,
      category || '',
      JSON.stringify(logbook || {}),
      id
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar un servicio
app.delete('/api/services/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM services WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RUTAS DE PRESUPUESTOS (BUDGETS) ---

// Obtener presupuestos (filtrados por workspace_id si se provee)
app.get('/api/budgets', (req, res) => {
  const { workspaceId } = req.query;
  try {
    let budgets;
    if (workspaceId) {
      budgets = db.prepare('SELECT * FROM budgets WHERE workspace_id = ? ORDER BY date DESC').all(workspaceId);
    } else {
      budgets = db.prepare('SELECT * FROM budgets ORDER BY date DESC').all();
    }
    const formattedBudgets = budgets.map(b => ({
      ...b,
      items: b.items ? JSON.parse(b.items) : [],
      maintenance: b.maintenance ? JSON.parse(b.maintenance) : null
    }));
    res.json(formattedBudgets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear un presupuesto nuevo
app.post('/api/budgets', (req, res) => {
  const { id, name, date, items, totalCost, totalRevenue, approvedRevenue, maintenance, workspace_id } = req.body;
  try {
    const insert = db.prepare(`
      INSERT INTO budgets (id, name, date, items, totalCost, totalRevenue, approvedRevenue, maintenance, workspace_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run(
      id || Date.now().toString(),
      name || 'Presupuesto sin nombre',
      date || new Date().toISOString(),
      JSON.stringify(items || []),
      totalCost || 0,
      totalRevenue || 0,
      approvedRevenue || 0,
      maintenance ? JSON.stringify(maintenance) : null,
      workspace_id || 'default_workspace'
    );
    res.status(201).json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar un presupuesto
app.put('/api/budgets/:id', (req, res) => {
  const { id } = req.params;
  const { name, items, totalCost, totalRevenue, approvedRevenue, maintenance } = req.body;
  try {
    const update = db.prepare(`
      UPDATE budgets
      SET name = ?, items = ?, totalCost = ?, totalRevenue = ?, approvedRevenue = ?, maintenance = ?
      WHERE id = ?
    `);
    update.run(
      name,
      JSON.stringify(items || []),
      totalCost || 0,
      totalRevenue || 0,
      approvedRevenue || 0,
      maintenance ? JSON.stringify(maintenance) : null,
      id
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar un presupuesto
app.delete('/api/budgets/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM budgets WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RUTAS DE CATEGORÍAS ---

app.get('/api/categories', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY order_index ASC').all();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', (req, res) => {
  const { name, order_index } = req.body;
  try {
    if (!name) return res.status(400).json({ error: 'Name is required' });
    
    // Check if exists
    const exists = db.prepare('SELECT name FROM categories WHERE name = ?').get(name);
    if (exists) return res.status(400).json({ error: 'Category already exists' });

    db.prepare('INSERT INTO categories (name, order_index) VALUES (?, ?)').run(name, order_index || 0);
    res.status(201).json({ success: true, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/categories', (req, res) => {
  const { categories } = req.body; // Array de {name, order_index}
  try {
    const update = db.prepare('UPDATE categories SET order_index = ? WHERE name = ?');
    db.transaction(() => {
      for (const cat of categories) {
        update.run(cat.order_index, cat.name);
      }
    })();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:name', (req, res) => {
  const { name } = req.params;
  try {
    db.prepare('DELETE FROM categories WHERE name = ?').run(name);
    // Mover los servicios de esta categoría a vacío o "Sin Asignar"
    db.prepare('UPDATE services SET category = ? WHERE category = ?').run('', name);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RUTAS DE WORKSPACES ---

app.get('/api/workspaces', (req, res) => {
  try {
    const workspaces = db.prepare('SELECT * FROM workspaces ORDER BY created_at ASC').all();
    const formatted = workspaces.map(w => ({
      ...w,
      config: w.config ? JSON.parse(w.config) : {}
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/workspaces', (req, res) => {
  const { name } = req.body;
  try {
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const id = Date.now().toString();
    db.prepare('INSERT INTO workspaces (id, name, config, created_at) VALUES (?, ?, ?, ?)').run(
      id,
      name,
      '{}',
      new Date().toISOString()
    );
    res.status(201).json({ success: true, id, name, config: {} });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/workspaces/:id/config', (req, res) => {
  const { id } = req.params;
  const { config } = req.body;
  try {
    db.prepare('UPDATE workspaces SET config = ? WHERE id = ?').run(
      JSON.stringify(config || {}),
      id
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/workspaces/:id', (req, res) => {
  const { id } = req.params;
  if (id === 'default_workspace') return res.status(400).json({ error: 'Cannot delete default workspace' });
  try {
    db.prepare('DELETE FROM workspaces WHERE id = ?').run(id);
    db.prepare('DELETE FROM budgets WHERE workspace_id = ?').run(id); // Borrar presupuestos asociados
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RUTAS DE ECOMMERCE PRODUCTS ---

app.get('/api/ecommerce/products', (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM ecommerce_products ORDER BY created_at DESC').all();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ecommerce/products/:id', (req, res) => {
  const { id } = req.params;
  try {
    const product = db.prepare('SELECT * FROM ecommerce_products WHERE id = ?').get(id);
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ecommerce/products', (req, res) => {
  const { name, price, category, stock, description, publishStatus, imageUrl, variants, isOffer, discountPrice } = req.body;
  try {
    const id = Date.now().toString();
    const insert = db.prepare(`
      INSERT INTO ecommerce_products (id, name, price, category, stock, description, publish_status, image_url, variants, created_at, is_offer, discount_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run(id, name, price || 0, category || 'Sin Categoría', stock || 0, description || '', publishStatus || 'Borrador', imageUrl || '', variants || 1, new Date().toISOString(), isOffer ? 1 : 0, discountPrice || 0);
    res.status(201).json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/ecommerce/products/:id', (req, res) => {
  const { id } = req.params;
  const { name, price, category, stock, description, publishStatus, imageUrl, variants, isOffer, discountPrice } = req.body;
  try {
    const update = db.prepare(`
      UPDATE ecommerce_products
      SET name = ?, price = ?, category = ?, stock = ?, description = ?, publish_status = ?, image_url = ?, variants = ?, is_offer = ?, discount_price = ?
      WHERE id = ?
    `);
    update.run(name, price || 0, category || 'Sin Categoría', stock || 0, description || '', publishStatus || 'Borrador', imageUrl || '', variants || 1, isOffer ? 1 : 0, discountPrice || 0, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/ecommerce/products/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM ecommerce_products WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RUTAS DE ECOMMERCE PEDIDOS (ORDERS) ---

app.get('/api/ecommerce/orders', (req, res) => {
  try {
    const orders = db.prepare('SELECT * FROM ecommerce_orders_v2 ORDER BY date DESC').all();
    const formatted = orders.map(o => ({
      ...o,
      paymentDetails: o.paymentDetails ? JSON.parse(o.paymentDetails) : null,
      items: o.items ? JSON.parse(o.items) : []
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ecommerce/orders', (req, res) => {
  const { customer, date, total, status, priority, address, paymentMethod, paymentStatus, paymentDetails, items, isMobile } = req.body;
  try {
    const id = 'ORD-' + Math.floor(1000 + Math.random() * 9000); // Generar ID ej: ORD-1234
    const insert = db.prepare(`
      INSERT INTO ecommerce_orders_v2 (id, customer, date, total, status, priority, address, paymentMethod, paymentStatus, paymentDetails, items, isMobile)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run(
      id,
      customer || 'Cliente Anónimo',
      date || new Date().toISOString(),
      total || 0,
      status || 'Pendiente',
      priority || 'Normal',
      address || '',
      paymentMethod || '',
      paymentStatus || 'pending',
      paymentDetails ? JSON.stringify(paymentDetails) : null,
      items ? JSON.stringify(items) : '[]',
      isMobile ? 1 : 0
    );
    res.status(201).json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/ecommerce/orders/:id', (req, res) => {
  const { id } = req.params;
  const { status, paymentStatus } = req.body;
  try {
    if (status) {
      db.prepare('UPDATE ecommerce_orders_v2 SET status = ? WHERE id = ?').run(status, id);
    }
    if (paymentStatus) {
      db.prepare('UPDATE ecommerce_orders_v2 SET paymentStatus = ? WHERE id = ?').run(paymentStatus, id);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RUTAS DE E-COMMERCE ANALYTICS Y BITACORA ---

// Endpoint para insertar datos de prueba
app.post('/api/ecommerce/seed', (req, res) => {
  try {
    const products = [
      { id: 'p1', name: 'Camiseta de Algodón Premium', price: 29.99, category: 'Ropa' },
      { id: 'p2', name: 'Auriculares Inalámbricos', price: 89.00, category: 'Electrónica' },
      { id: 'p3', name: 'Mochila de Viaje', price: 65.00, category: 'Accesorios' },
      { id: 'p4', name: 'Reloj Inteligente', price: 120.00, category: 'Electrónica' }
    ];

    const insertProduct = db.prepare('INSERT OR IGNORE INTO ecommerce_products (id, name, price, category, created_at) VALUES (?, ?, ?, ?, ?)');
    for (const p of products) {
      insertProduct.run(p.id, p.name, p.price, p.category, new Date().toISOString());
    }

    const insertSale = db.prepare('INSERT INTO ecommerce_sales (id, customer_email, total, created_at) VALUES (?, ?, ?, ?)');
    const insertSaleItem = db.prepare('INSERT INTO ecommerce_sale_items (id, sale_id, product_id, quantity, price) VALUES (?, ?, ?, ?, ?)');

    // Generar ventas aleatorias para los últimos 30 días
    const now = new Date();
    db.transaction(() => {
      for (let i = 0; i < 50; i++) {
        const saleId = 'sale_' + Date.now() + '_' + i;
        const date = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        
        let total = 0;
        const numItems = Math.floor(Math.random() * 3) + 1;
        const saleItems = [];
        
        for (let j = 0; j < numItems; j++) {
          const product = products[Math.floor(Math.random() * products.length)];
          const qty = Math.floor(Math.random() * 2) + 1;
          total += product.price * qty;
          saleItems.push({
            id: 'si_' + Date.now() + '_' + i + '_' + j,
            sale_id: saleId,
            product_id: product.id,
            quantity: qty,
            price: product.price
          });
        }

        insertSale.run(saleId, 'cliente' + i + '@test.com', total, date.toISOString());
        for (const item of saleItems) {
          insertSaleItem.run(item.id, item.sale_id, item.product_id, item.quantity, item.price);
        }
      }
    })();

    res.json({ success: true, message: 'Datos de prueba insertados' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function getDateFilter(range) {
  const now = new Date();
  let pastDate = new Date();
  let olderPastDate = new Date();
  
  if (range === '30d') {
    pastDate.setDate(now.getDate() - 30);
    olderPastDate.setDate(pastDate.getDate() - 30);
  } else if (range === 'year') {
    pastDate.setFullYear(now.getFullYear() - 1);
    olderPastDate.setFullYear(pastDate.getFullYear() - 1);
  } else { // default 7d
    pastDate.setDate(now.getDate() - 7);
    olderPastDate.setDate(pastDate.getDate() - 7);
  }
  
  return { 
    currentStart: pastDate.toISOString(), 
    previousStart: olderPastDate.toISOString()
  };
}

// Resumen de analítica (KPIs)
app.get('/api/ecommerce/analytics/summary', (req, res) => {
  try {
    const range = req.query.range || '7d';
    const dates = getDateFilter(range);

    const currentSales = db.prepare('SELECT SUM(total) as revenue, COUNT(*) as count FROM ecommerce_sales WHERE created_at >= ?').get(dates.currentStart);
    const prevSales = db.prepare('SELECT SUM(total) as revenue, COUNT(*) as count FROM ecommerce_sales WHERE created_at >= ? AND created_at < ?').get(dates.previousStart, dates.currentStart);

    const currentRevenue = currentSales.revenue || 0;
    const prevRevenue = prevSales.revenue || 0;
    const revChange = prevRevenue === 0 ? (currentRevenue > 0 ? 100 : 0) : ((currentRevenue - prevRevenue) / prevRevenue) * 100;

    const currentOrders = currentSales.count || 0;
    const prevOrders = prevSales.count || 0;
    const ordersChange = prevOrders === 0 ? (currentOrders > 0 ? 100 : 0) : ((currentOrders - prevOrders) / prevOrders) * 100;

    const currentAov = currentOrders === 0 ? 0 : currentRevenue / currentOrders;
    const prevAov = prevOrders === 0 ? 0 : prevRevenue / prevOrders;
    const aovChange = prevAov === 0 ? (currentAov > 0 ? 100 : 0) : ((currentAov - prevAov) / prevAov) * 100;

    const productsCount = db.prepare('SELECT COUNT(*) as count FROM ecommerce_products').get().count || 0;
    const prevProductsCount = productsCount; // Simplification, hard to know previous without product creation dates tracking easily, assume 0 change
    const productsChange = 0;

    res.json({
      revenue: currentRevenue,
      revenueChange: revChange,
      orders: currentOrders,
      ordersChange: ordersChange,
      aov: currentAov,
      aovChange: aovChange,
      products: productsCount,
      productsChange: productsChange
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Productos más vendidos
app.get('/api/ecommerce/analytics/top-products', (req, res) => {
  try {
    const range = req.query.range || '7d';
    const dates = getDateFilter(range);

    const top = db.prepare(`
      SELECT p.id, p.name, SUM(si.quantity) as sales, SUM(si.quantity * si.price) as revenue
      FROM ecommerce_products p
      JOIN ecommerce_sale_items si ON p.id = si.product_id
      JOIN ecommerce_sales s ON si.sale_id = s.id
      WHERE s.created_at >= ?
      GROUP BY p.id
      ORDER BY sales DESC
      LIMIT 5
    `).all(dates.currentStart);
    res.json(top);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ventas por fecha (Calendario)
app.get('/api/ecommerce/analytics/sales-by-date', (req, res) => {
  try {
    const range = req.query.range || '7d';
    const dates = getDateFilter(range);

    const data = db.prepare(`
      SELECT substr(created_at, 1, 10) as date, SUM(total) as revenue, COUNT(*) as orders
      FROM ecommerce_sales
      WHERE created_at >= ?
      GROUP BY substr(created_at, 1, 10)
      ORDER BY date ASC
    `).all(dates.currentStart);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inicializar el servidor
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
