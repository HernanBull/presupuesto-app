import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || '106606679170-oheuro9l1qicfspsvsmf6c4ihuif2fq1.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

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
  const { config, store_slug } = req.body;
  try {
    db.prepare('UPDATE workspaces SET config = ? WHERE id = ?').run(
      JSON.stringify(config || {}),
      id
    );

    if (store_slug) {
      db.prepare('UPDATE workspaces SET store_slug = ? WHERE id = ?').run(store_slug, id);
    }

    // Sembrar categorías por defecto si se pasan en el config
    if (config && config.categories && Array.isArray(config.categories)) {
      const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (name, order_index) VALUES (?, ?)');
      const currentMax = db.prepare('SELECT MAX(order_index) as maxIdx FROM categories').get();
      let nextIndex = (currentMax.maxIdx || 0) + 1;
      
      db.transaction(() => {
        for (const catName of config.categories) {
          insertCategory.run(catName, nextIndex++);
        }
      })();
    }

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

app.post('/api/workspaces/merchant/login', (req, res) => {
  const { email, password } = req.body;
  try {
    const workspaces = db.prepare('SELECT id, name, config, store_slug, status FROM workspaces').all();
    const ws = workspaces.find(w => {
      try {
        const cfg = JSON.parse(w.config || '{}');
        return cfg.adminEmail === email;
      } catch { return false; }
    });
    if (!ws) return res.status(401).json({ error: 'No se encontró una tienda con ese correo' });

    if (ws.status === 'Suspendido') {
      return res.status(403).json({ error: 'Tu tienda ha sido suspendida por el administrador.' });
    }

    const cfg = JSON.parse(ws.config || '{}');
    if (cfg.adminPassword && cfg.adminPassword !== password) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    res.json({ id: ws.id, name: ws.name, store_slug: ws.store_slug });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/workspaces/store/:slug', (req, res) => {
  const { slug } = req.params;
  try {
    const ws = db.prepare('SELECT id, name, config, store_slug, status FROM workspaces WHERE store_slug = ?').get(slug);
    if (!ws) return res.status(404).json({ error: 'Tienda no encontrada' });
    if (ws.status === 'Suspendido') return res.status(403).json({ error: 'Tienda temporalmente no disponible' });
    
    res.json({
      id: ws.id,
      name: ws.name,
      store_slug: ws.store_slug,
      config: ws.config ? JSON.parse(ws.config) : {}
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/market/stores', (req, res) => {
  try {
    const stores = db.prepare("SELECT id, name, config, store_slug FROM workspaces WHERE store_slug IS NOT NULL AND store_slug != '' AND status != 'Suspendido'").all();
    const formatted = stores.map(ws => {
      let parsedConfig = {};
      try {
        parsedConfig = ws.config ? JSON.parse(ws.config) : {};
      } catch(e) {}
      
      const storefrontConfig = parsedConfig.storefront || parsedConfig;
      
      return {
        id: ws.id,
        name: ws.name,
        slug: ws.store_slug,
        logoUrl: storefrontConfig.logoUrl || null,
        heroUrl: storefrontConfig.heroUrl || null,
        description: storefrontConfig.texts?.heroSub || 'Descubre nuestros productos'
      };
    });
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RUTAS DE ECOMMERCE PRODUCTS ---

app.get('/api/ecommerce/products', (req, res) => {
  const workspaceId = req.query.workspaceId || req.query.workspace_id;
  try {
    let products;
    if (workspaceId) {
      products = db.prepare(`
        SELECT p.*, COALESCE(AVG(r.rating), 0) AS avg_rating, COUNT(r.id) AS review_count
        FROM ecommerce_products p
        LEFT JOIN ecommerce_reviews r ON p.id = r.product_id AND r.status = 'Aprobado'
        WHERE p.workspace_id = ?
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `).all(workspaceId);
    } else {
      products = db.prepare(`
        SELECT p.*, COALESCE(AVG(r.rating), 0) AS avg_rating, COUNT(r.id) AS review_count
        FROM ecommerce_products p
        LEFT JOIN ecommerce_reviews r ON p.id = r.product_id AND r.status = 'Aprobado'
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `).all();
    }
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
  const { id: reqId, name, price, category, stock, description, publishStatus, imageUrl, variants, isOffer, discountPrice, expirationDate, batchNumber, unit_type, step_size, workspace_id, cogs, min_stock, max_stock, supplier, stock_vitrina, metadata } = req.body;
  try {
    const id = reqId || Date.now().toString();
    const insert = db.prepare(`
      INSERT INTO ecommerce_products (id, name, price, category, stock, description, publish_status, image_url, variants, created_at, is_offer, discount_price, expiration_date, batch_number, unit_type, step_size, workspace_id, cogs, min_stock, max_stock, supplier, stock_vitrina, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run(id, name, price || 0, category || 'Sin Categoría', stock || 0, description || '', publishStatus || 'Borrador', imageUrl || '', variants || 1, new Date().toISOString(), isOffer ? 1 : 0, discountPrice || 0, expirationDate || null, batchNumber || null, unit_type || 'unidad', step_size || 1, workspace_id || 'default_workspace', cogs || 0, min_stock || 5, max_stock || null, supplier || '', stock_vitrina || 0, metadata ? JSON.stringify(metadata) : '{}');
    res.status(201).json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/ecommerce/products/:id', (req, res) => {
  const { id } = req.params;
  const { name, price, category, stock, description, publishStatus, imageUrl, variants, isOffer, discountPrice, expirationDate, batchNumber, unit_type, step_size, cogs, min_stock, max_stock, supplier, stock_vitrina, metadata } = req.body;
  try {
    const update = db.prepare(`
      UPDATE ecommerce_products
      SET name = ?, price = ?, category = ?, stock = ?, description = ?, publish_status = ?, image_url = ?, variants = ?, is_offer = ?, discount_price = ?, expiration_date = ?, batch_number = ?, unit_type = ?, step_size = ?, cogs = ?, min_stock = ?, max_stock = ?, supplier = ?, stock_vitrina = ?, metadata = ?
      WHERE id = ?
    `);
    update.run(name, price || 0, category || 'Sin Categoría', stock || 0, description || '', publishStatus || 'Borrador', imageUrl || '', variants || 1, isOffer ? 1 : 0, discountPrice || 0, expirationDate || null, batchNumber || null, unit_type || 'unidad', step_size || 1, cogs || 0, min_stock || 5, max_stock || null, supplier || '', stock_vitrina || 0, metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : '{}', id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/ecommerce/products/:id/offer', (req, res) => {
  const { id } = req.params;
  const { isOffer, discountPrice } = req.body;
  try {
    const update = db.prepare(`
      UPDATE ecommerce_products
      SET is_offer = ?, discount_price = ?
      WHERE id = ?
    `);
    update.run(isOffer ? 1 : 0, discountPrice || 0, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/ecommerce/products/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    // Definir mapa de campos camelCase a snake_case
    const fieldMap = {
      publishStatus: 'publish_status',
      imageUrl: 'image_url',
      isOffer: 'is_offer',
      discountPrice: 'discount_price',
      expirationDate: 'expiration_date',
      batchNumber: 'batch_number',
      workspaceId: 'workspace_id'
    };

    const keys = [];
    const values = [];

    Object.keys(updates).forEach(k => {
      if (k !== 'id') {
        const mappedKey = fieldMap[k] || k;
        keys.push(mappedKey);
        values.push(updates[k]);
      }
    });

    if (keys.length === 0) return res.json({ success: true });
    
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    values.push(id);
    const update = db.prepare(`UPDATE ecommerce_products SET ${setClause} WHERE id = ?`);
    update.run(...values);
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
  const { workspaceId } = req.query;
  try {
    let orders;
    if (workspaceId) {
      orders = db.prepare('SELECT * FROM ecommerce_orders_v2 WHERE workspace_id = ? ORDER BY date DESC').all(workspaceId);
    } else {
      orders = db.prepare('SELECT * FROM ecommerce_orders_v2 ORDER BY date DESC').all();
    }
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

app.get('/api/ecommerce/customer-orders/:email', (req, res) => {
  const { email } = req.params;
  try {
    const orders = db.prepare('SELECT * FROM ecommerce_orders_v2 WHERE customer_email = ? ORDER BY date DESC').all(email);
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
  const { customer, customerEmail, date, total, status, priority, address, paymentMethod, paymentStatus, paymentDetails, items, isMobile, bookingDate, bookingTime, tableNumber, orderType, workspace_id, discount_code } = req.body;
  try {
    const id = 'ORD-' + Math.floor(1000 + Math.random() * 9000); // Generar ID ej: ORD-1234
    const insert = db.prepare(`
      INSERT INTO ecommerce_orders_v2 (id, customer, customer_email, date, total, status, priority, address, paymentMethod, paymentStatus, paymentDetails, items, isMobile, booking_date, booking_time, table_number, order_type, workspace_id, discount_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run(
      id,
      customer || 'Cliente Anónimo',
      customerEmail || null,
      date || new Date().toISOString(),
      total || 0,
      status || 'Pendiente',
      priority || 'Normal',
      address || '',
      paymentMethod || '',
      paymentStatus || 'pending',
      paymentDetails ? JSON.stringify(paymentDetails) : null,
      items ? JSON.stringify(items) : '[]',
      isMobile ? 1 : 0,
      bookingDate || null,
      bookingTime || null,
      tableNumber || null,
      orderType || 'delivery',
      workspace_id || 'default_workspace',
      discount_code || null
    );
    
    // Si usó un código de descuento, sumarle al contador de usos
    if (discount_code) {
      db.prepare(`
        UPDATE ecommerce_promotions 
        SET usage_count = usage_count + 1 
        WHERE code = ? AND workspace_id = ?
      `).run(discount_code.toUpperCase(), workspace_id || 'default_workspace');
    }
    


    res.status(201).json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/ecommerce/orders/:id', (req, res) => {
  const { id } = req.params;
  const { status, paymentStatus, bookingDate, bookingTime, tableNumber, orderType } = req.body;
  try {
    if (status) {
      if (status === 'Preparando') {
        const order = db.prepare('SELECT items, stock_deducted, workspace_id FROM ecommerce_orders_v2 WHERE id = ?').get(id);
        if (order && !order.stock_deducted) {
          let items = [];
          try { items = JSON.parse(order.items || '[]'); } catch(e) {}
          
          for (const item of items) {
             const product = db.prepare('SELECT name, stock_vitrina FROM ecommerce_products WHERE id = ? AND workspace_id = ?').get(item.id, order.workspace_id);
             if (!product || (product.stock_vitrina || 0) < item.quantity) {
                return res.status(400).json({ error: `Sin stock suficiente en vitrina para: ${product ? product.name : item.name}. Quedan ${product ? (product.stock_vitrina || 0) : 0} unidades.` });
             }
          }
          
          const updateStock = db.prepare('UPDATE ecommerce_products SET stock_vitrina = stock_vitrina - ? WHERE id = ? AND workspace_id = ?');
          db.transaction(() => {
             for (const item of items) {
                updateStock.run(item.quantity, item.id, order.workspace_id);
             }
          })();
          
          db.prepare('UPDATE ecommerce_orders_v2 SET stock_deducted = 1 WHERE id = ?').run(id);
        }
      }
      db.prepare('UPDATE ecommerce_orders_v2 SET status = ? WHERE id = ?').run(status, id);
    }
    if (paymentStatus) {
      db.prepare('UPDATE ecommerce_orders_v2 SET paymentStatus = ? WHERE id = ?').run(paymentStatus, id);
    }
    if (bookingDate !== undefined) db.prepare('UPDATE ecommerce_orders_v2 SET booking_date = ? WHERE id = ?').run(bookingDate, id);
    if (bookingTime !== undefined) db.prepare('UPDATE ecommerce_orders_v2 SET booking_time = ? WHERE id = ?').run(bookingTime, id);
    if (tableNumber !== undefined) db.prepare('UPDATE ecommerce_orders_v2 SET table_number = ? WHERE id = ?').run(tableNumber, id);
    if (orderType !== undefined) db.prepare('UPDATE ecommerce_orders_v2 SET order_type = ? WHERE id = ?').run(orderType, id);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RUTAS DE E-COMMERCE CLIENTES (CUSTOMERS) ---

app.get('/api/ecommerce/customers', (req, res) => {
  try {
    const customers = db.prepare('SELECT * FROM ecommerce_customers ORDER BY join_date DESC').all();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ecommerce/customers/register', (req, res) => {
  const { email, password } = req.body;
  let { name } = req.body;
  if (!name) name = email.split('@')[0];

  try {
    const existing = db.prepare('SELECT id FROM ecommerce_customers WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }
    
    const id = 'CUST-' + Math.floor(1000 + Math.random() * 9000);
    const insert = db.prepare(`
      INSERT INTO ecommerce_customers (id, name, email, password, doc_id, phone, address, join_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run(
      id,
      name,
      email,
      password, // En un sistema real esto debería estar hasheado
      '',
      '',
      '',
      new Date().toISOString().split('T')[0],
      'Activo'
    );
    
    const newUser = { id, name, email, docId: '', phone: '', address: '', joinDate: new Date().toISOString().split('T')[0] };
    res.status(201).json({ success: true, user: newUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ecommerce/customers/login', (req, res) => {
  const { email, password } = req.body;
  try {
    const user = db.prepare('SELECT * FROM ecommerce_customers WHERE email = ? AND password = ?').get(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }
    
    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ecommerce/customers/google-login', async (req, res) => {
  const { credential } = req.body;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name } = payload;

    if (!email) {
      return res.status(400).json({ error: 'No se pudo obtener el email de Google' });
    }

    let user = db.prepare('SELECT * FROM ecommerce_customers WHERE email = ?').get(email);
    
    if (!user) {
      // Registro automático
      const id = 'CUST-' + Math.floor(1000 + Math.random() * 9000);
      const insert = db.prepare(`
        INSERT INTO ecommerce_customers (id, name, email, password, doc_id, phone, address, join_date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insert.run(
        id,
        name,
        email,
        'GOOGLE_AUTH',
        '',
        '',
        '',
        new Date().toISOString().split('T')[0],
        'Activo'
      );
      user = db.prepare('SELECT * FROM ecommerce_customers WHERE id = ?').get(id);
    }
    
    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } catch (err) {
    console.error("Error validando token de Google:", err);
    res.status(401).json({ error: 'Token de Google inválido o expirado' });
  }
});

app.put('/api/ecommerce/customers/:id', (req, res) => {
  const { id } = req.params;
  const { name, docId, phone, address, favorites, wishlist, addresses } = req.body;
  try {
    const update = db.prepare(`
      UPDATE ecommerce_customers
      SET name = ?, doc_id = ?, phone = ?, address = ?, favorites = ?, wishlist = ?, addresses = ?
      WHERE id = ?
    `);
    update.run(
      name, 
      docId || '', 
      phone || '', 
      address || '', 
      favorites ? JSON.stringify(favorites) : '[]', 
      wishlist ? JSON.stringify(wishlist) : '[]',
      addresses ? JSON.stringify(addresses) : '[]',
      id
    );
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

// --- RUTAS DE E-COMMERCE RESEÑAS ---

app.get('/api/ecommerce/reviews', (req, res) => {
  const workspaceId = req.query.workspaceId || 'default_workspace';
  try {
    const reviews = db.prepare("SELECT * FROM ecommerce_reviews WHERE workspace_id = ? ORDER BY created_at DESC").all(workspaceId);
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ecommerce/reviews', (req, res) => {
  const { workspaceId = 'default_workspace', productId, productName, customerId, customerName, rating, comment } = req.body;
  const id = 'rev_' + Date.now();
  try {
    const insert = db.prepare(`
      INSERT INTO ecommerce_reviews (id, workspace_id, product_id, product_name, customer_id, customer_name, rating, comment, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente', ?)
    `);
    insert.run(id, workspaceId, productId, productName, customerId || null, customerName, rating, comment, new Date().toISOString());
    res.status(201).json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/ecommerce/reviews/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    if (status === 'Rechazado') {
      db.prepare("DELETE FROM ecommerce_reviews WHERE id = ?").run(id);
    } else {
      db.prepare("UPDATE ecommerce_reviews SET status = ? WHERE id = ?").run(status, id);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/ecommerce/reviews/:id/reply', (req, res) => {
  const { id } = req.params;
  const { reply } = req.body;
  try {
    db.prepare("UPDATE ecommerce_reviews SET reply = ? WHERE id = ?").run(reply, id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RUTAS DE E-COMMERCE PROMOCIONES ---

app.get('/api/ecommerce/promotions', (req, res) => {
  const workspaceId = req.query.workspaceId || 'default_workspace';
  try {
    const promotions = db.prepare("SELECT * FROM ecommerce_promotions WHERE workspace_id = ? ORDER BY created_at DESC").all(workspaceId);
    res.json(promotions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ecommerce/promotions', (req, res) => {
  const { workspaceId = 'default_workspace', code, type, value, usageLimit = -1, expiresAt = null } = req.body;
  const id = 'promo_' + Date.now();
  try {
    const check = db.prepare("SELECT id FROM ecommerce_promotions WHERE code = ? AND workspace_id = ?").get(code, workspaceId);
    if (check) return res.status(400).json({ error: 'El código ya existe' });

    db.prepare(`
      INSERT INTO ecommerce_promotions (id, workspace_id, code, type, value, usage_limit, created_at, expires_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, workspaceId, code.toUpperCase(), type, value, usageLimit, new Date().toISOString(), expiresAt);
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/ecommerce/promotions/:id', (req, res) => {
  try {
    db.prepare("DELETE FROM ecommerce_promotions WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ecommerce/promotions/validate', (req, res) => {
  const { code, workspaceId = 'default_workspace' } = req.body;
  try {
    const promo = db.prepare("SELECT * FROM ecommerce_promotions WHERE code = ? AND workspace_id = ?").get(code.toUpperCase(), workspaceId);
    if (!promo) return res.status(404).json({ error: 'Cupón no válido' });
    if (promo.status !== 'Activo') return res.status(400).json({ error: 'Cupón inactivo o expirado' });
    if (promo.usage_limit > 0 && promo.usage_count >= promo.usage_limit) return res.status(400).json({ error: 'Cupón agotado' });
    
    res.json(promo);
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

app.get('/api/ecommerce/analytics/summary', (req, res) => {
  try {
    const range = req.query.range || '7d';
    const workspaceId = req.query.workspaceId || 'default_workspace';
    const dates = getDateFilter(range);

    const currentSales = db.prepare(`
      SELECT SUM(total) as revenue, COUNT(*) as count 
      FROM ecommerce_orders_v2 
      WHERE date >= ? AND workspace_id = ? AND status != 'Cancelado'
    `).get(dates.currentStart, workspaceId);
    
    const prevSales = db.prepare(`
      SELECT SUM(total) as revenue, COUNT(*) as count 
      FROM ecommerce_orders_v2 
      WHERE date >= ? AND date < ? AND workspace_id = ? AND status != 'Cancelado'
    `).get(dates.previousStart, dates.currentStart, workspaceId);

    const currentRevenue = currentSales.revenue || 0;
    const prevRevenue = prevSales.revenue || 0;
    const revChange = prevRevenue === 0 ? (currentRevenue > 0 ? 100 : 0) : ((currentRevenue - prevRevenue) / prevRevenue) * 100;

    const currentOrders = currentSales.count || 0;
    const prevOrders = prevSales.count || 0;
    const ordersChange = prevOrders === 0 ? (currentOrders > 0 ? 100 : 0) : ((currentOrders - prevOrders) / prevOrders) * 100;

    const currentAov = currentOrders === 0 ? 0 : currentRevenue / currentOrders;
    const prevAov = prevOrders === 0 ? 0 : prevRevenue / prevOrders;
    const aovChange = prevAov === 0 ? (currentAov > 0 ? 100 : 0) : ((currentAov - prevAov) / prevAov) * 100;

    const productsCount = db.prepare('SELECT COUNT(*) as count FROM ecommerce_products WHERE workspace_id = ?').get(workspaceId).count || 0;
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
    const workspaceId = req.query.workspaceId || 'default_workspace';
    const dates = getDateFilter(range);

    const orders = db.prepare(`
      SELECT items 
      FROM ecommerce_orders_v2 
      WHERE date >= ? AND workspace_id = ? AND status != 'Cancelado'
    `).all(dates.currentStart, workspaceId);
    
    const productStats = {};
    
    orders.forEach(order => {
      let items = [];
      try { items = JSON.parse(order.items || '[]'); } catch(e) {}
      
      items.forEach(item => {
        if (!productStats[item.id]) {
          productStats[item.id] = { id: item.id, name: item.name, sales: 0, revenue: 0 };
        }
        productStats[item.id].sales += Number(item.quantity || 1);
        productStats[item.id].revenue += Number(item.price || 0) * Number(item.quantity || 1);
      });
    });

    const top = Object.values(productStats).sort((a, b) => b.sales - a.sales).slice(0, 5);
    res.json(top);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ventas por fecha (Calendario)
app.get('/api/ecommerce/analytics/sales-by-date', (req, res) => {
  try {
    const range = req.query.range || '7d';
    const workspaceId = req.query.workspaceId || 'default_workspace';
    const dates = getDateFilter(range);

    const data = db.prepare(`
      SELECT substr(date, 1, 10) as date, SUM(total) as revenue, COUNT(*) as orders
      FROM ecommerce_orders_v2
      WHERE date >= ? AND workspace_id = ? AND status != 'Cancelado'
      GROUP BY substr(date, 1, 10)
      ORDER BY date ASC
    `).all(dates.currentStart, workspaceId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tracking de Analítica
app.post('/api/ecommerce/track', (req, res) => {
  const { workspaceId, eventType, source } = req.body;
  if (!workspaceId || !eventType) return res.status(400).json({ error: 'Missing data' });
  try {
    const id = Date.now().toString();
    const created_at = new Date().toISOString();
    db.prepare('INSERT INTO ecommerce_tracking (id, workspace_id, event_type, source, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, workspaceId, eventType, source || 'Directo', created_at);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Embudo de Conversión
app.get('/api/ecommerce/analytics/funnel', (req, res) => {
  try {
    const range = req.query.range || '30d';
    const workspaceId = req.query.workspaceId || 'default_workspace';
    const dates = getDateFilter(range);

    const trackingData = db.prepare(`
      SELECT event_type, COUNT(*) as count
      FROM ecommerce_tracking
      WHERE created_at >= ? AND workspace_id = ?
      GROUP BY event_type
    `).all(dates.currentStart, workspaceId);

    const purchases = db.prepare(`
      SELECT COUNT(*) as count
      FROM ecommerce_orders_v2
      WHERE date >= ? AND workspace_id = ? AND status != 'Cancelado'
    `).get(dates.currentStart, workspaceId).count;

    const sourcesData = db.prepare(`
      SELECT source, COUNT(*) as count
      FROM ecommerce_tracking
      WHERE created_at >= ? AND workspace_id = ? AND event_type = 'visit'
      GROUP BY source
    `).all(dates.currentStart, workspaceId);

    const funnel = { visitors: 0, addedToCart: 0, checkoutStarted: 0, purchases };
    trackingData.forEach(row => {
      if (row.event_type === 'visit') funnel.visitors = row.count;
      if (row.event_type === 'add_to_cart') funnel.addedToCart = row.count;
      if (row.event_type === 'checkout_start') funnel.checkoutStarted = row.count;
    });

    // Calcular tráfico
    let totalVisits = 0;
    const traffic = { org: 0, soc: 0, dir: 0 };
    sourcesData.forEach(row => {
      totalVisits += row.count;
      const s = row.source.toLowerCase();
      if (s.includes('google') || s.includes('bing') || s.includes('yahoo')) traffic.org += row.count;
      else if (s.includes('instagram') || s.includes('facebook') || s.includes('t.co') || s.includes('twitter') || s.includes('tiktok')) traffic.soc += row.count;
      else traffic.dir += row.count;
    });

    if (totalVisits > 0) {
      traffic.org = Math.round((traffic.org / totalVisits) * 100);
      traffic.soc = Math.round((traffic.soc / totalVisits) * 100);
      traffic.dir = Math.round((traffic.dir / totalVisits) * 100);
    }

    res.json({ funnel, traffic });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Carritos abandonados y Recuperados
app.get('/api/ecommerce/analytics/abandoned-carts', (req, res) => {
  try {
    const workspaceId = req.query.workspaceId || 'default_workspace';
    
    const carts = db.prepare(`
      SELECT * FROM ecommerce_orders_v2 
      WHERE workspace_id = ? AND status IN ('Pendiente', 'Cancelado', 'Aprobado', 'Completado', 'Procesando', 'Enviado')
      ORDER BY date DESC LIMIT 100
    `).all(workspaceId);

    const formatted = carts.map(c => {
      let displayStatus = 'Pendiente';
      if (['Aprobado', 'Completado', 'Procesando', 'Enviado'].includes(c.status)) displayStatus = 'Recuperado';
      else if (c.status === 'Cancelado') displayStatus = 'Perdido';
      
      return {
        id: c.id,
        user: c.customer_name || 'Anónimo',
        time: c.date.substring(0, 10),
        status: displayStatus,
        total: c.total,
        dbStatus: c.status
      };
    });
    
    const displayList = formatted.filter(c => c.status !== 'Perdido').slice(0, 50);
    res.json(displayList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Super Admin Routes ---
const SUPERADMIN_KEY = process.env.VITE_SUPERADMIN_KEY || 'axon2026';

const requireSuperAdmin = (req, res, next) => {
  const key = req.headers['x-superadmin-key'];
  if (key === SUPERADMIN_KEY) {
    next();
  } else {
    res.status(401).json({ error: 'No autorizado' });
  }
};

app.get('/api/superadmin/stats', requireSuperAdmin, (req, res) => {
  try {
    const totalMerchants = db.prepare('SELECT COUNT(*) as count FROM workspaces').get().count;
    const totalCustomers = db.prepare('SELECT COUNT(*) as count FROM ecommerce_customers').get().count;
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM ecommerce_products').get().count;
    
    const ordersData = db.prepare('SELECT total, status, paymentMethod FROM ecommerce_orders_v2').all();
    let totalGMV = 0;
    let totalOrders = 0;
    ordersData.forEach(o => {
      if (o.status !== 'Cancelado' && o.status !== 'Perdido') {
        totalGMV += Number(o.total || 0);
        totalOrders++;
      }
    });

    const aov = totalOrders > 0 ? totalGMV / totalOrders : 0;

    const pmMap = {};
    const statusMap = {};
    ordersData.forEach(o => {
      // Status
      const statusLabel = o.status || 'Desconocido';
      if (!statusMap[statusLabel]) statusMap[statusLabel] = 0;
      statusMap[statusLabel]++;

      // Payment Method
      if (statusLabel !== 'Cancelado' && statusLabel !== 'Perdido') {
        const pmLabel = o.paymentMethod || 'Otro';
        if (!pmMap[pmLabel]) pmMap[pmLabel] = 0;
        pmMap[pmLabel]++;
      }
    });

    const paymentMethodsChart = Object.keys(pmMap).map(name => ({ name, value: pmMap[name] }));
    const orderStatusesChart = Object.keys(statusMap).map(name => ({ name, value: statusMap[name] }));

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentOrders = db.prepare('SELECT date, total, status FROM ecommerce_orders_v2 WHERE date >= ?').all(sevenDaysAgo.toISOString());
    
    const chartMap = {};
    for(let i=6; i>=0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      chartMap[d.toISOString().substring(0, 10)] = 0;
    }

    recentOrders.forEach(o => {
      if (o.status !== 'Cancelado' && o.status !== 'Perdido') {
        const dateKey = o.date.substring(0, 10);
        if (chartMap[dateKey] !== undefined) {
          chartMap[dateKey] += Number(o.total || 0);
        }
      }
    });

    const salesChartData = Object.keys(chartMap).map(date => ({
      date,
      sales: chartMap[date]
    }));

    const allMerchants = db.prepare('SELECT id, name FROM workspaces').all();
    const merchantMap = {};
    allMerchants.forEach(m => merchantMap[m.id] = { name: m.name, sales: 0 });

    const allOrdersWithWorkspace = db.prepare('SELECT workspace_id, total, status FROM ecommerce_orders_v2').all();
    allOrdersWithWorkspace.forEach(o => {
      if (o.status !== 'Cancelado' && o.status !== 'Perdido' && o.workspace_id && merchantMap[o.workspace_id]) {
        merchantMap[o.workspace_id].sales += Number(o.total || 0);
      }
    });

    const topMerchants = Object.values(merchantMap)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    const productMap = {};
    const allOrdersItems = db.prepare("SELECT items FROM ecommerce_orders_v2 WHERE status != 'Cancelado' AND status != 'Perdido'").all();
    allOrdersItems.forEach(row => {
      if (row.items) {
        try {
          const items = JSON.parse(row.items);
          items.forEach(item => {
            if (!productMap[item.name]) productMap[item.name] = 0;
            productMap[item.name] += Number(item.quantity || 1);
          });
        } catch (e) {}
      }
    });

    const topProducts = Object.keys(productMap)
      .map(name => ({ name, qty: productMap[name] }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    res.json({
      totalMerchants,
      totalCustomers,
      totalOrders,
      totalGMV,
      aov,
      totalProducts,
      salesChartData,
      topMerchants,
      topProducts,
      paymentMethodsChart,
      orderStatusesChart
    });

  } catch (err) {
    console.error("SuperAdmin Stats Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/superadmin/merchants', requireSuperAdmin, (req, res) => {
  try {
    const merchants = db.prepare('SELECT id, name, created_at, store_slug, status, config FROM workspaces').all();
    res.json(merchants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/superadmin/merchants/:id', requireSuperAdmin, (req, res) => {
  const { id } = req.params;
  try {
    db.transaction(() => {
      db.prepare('DELETE FROM ecommerce_products WHERE workspace_id = ?').run(id);
      db.prepare('DELETE FROM ecommerce_orders_v2 WHERE workspace_id = ?').run(id);
      db.prepare('DELETE FROM ecommerce_promotions WHERE workspace_id = ?').run(id);
      db.prepare('DELETE FROM ecommerce_reviews WHERE workspace_id = ?').run(id);
      db.prepare('DELETE FROM ecommerce_tracking WHERE workspace_id = ?').run(id);
      db.prepare('DELETE FROM workspaces WHERE id = ?').run(id);
    })();
    res.json({ message: 'Merchant deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/superadmin/customers', requireSuperAdmin, (req, res) => {
  try {
    const customers = db.prepare('SELECT id, name, email, phone, doc_id, join_date FROM ecommerce_customers').all();
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/superadmin/customers/:id', requireSuperAdmin, (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM ecommerce_customers WHERE id = ?').run(id);
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/superadmin/merchants/:id/status', requireSuperAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    if (status !== 'Activo' && status !== 'Suspendido') {
      return res.status(400).json({ error: 'Status invalido' });
    }
    db.prepare('UPDATE workspaces SET status = ? WHERE id = ?').run(status, id);
    res.json({ success: true, message: `Estado actualizado a ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/superadmin/monitor', requireSuperAdmin, (req, res) => {
  try {
    const recentOrders = db.prepare(`
      SELECT o.id, o.customer, o.date, o.total, o.status, o.workspace_id, w.name as workspace_name
      FROM ecommerce_orders_v2 o
      LEFT JOIN workspaces w ON o.workspace_id = w.id
      ORDER BY o.date DESC
      LIMIT 20
    `).all();
    res.json(recentOrders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Inicializar el servidor
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
