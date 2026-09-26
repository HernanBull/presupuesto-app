import express from 'express';
import * as OTPAuth from 'otpauth';
import nodemailer from 'nodemailer';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from './supabaseClient.js';
import { startTelegramEngine, sendMessageToChat } from './telegramBot.js';
import { OAuth2Client } from 'google-auth-library';
import http from 'http';
import { Server } from 'socket.io';
const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || '106606679170-oheuro9l1qicfspsvsmf6c4ihuif2fq1.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  socket.on('join_chat', (orderId) => {
    socket.join(`chat_${orderId}`);
  });
  socket.on('join_workspace', (workspaceId) => {
    socket.join(`workspace_${workspaceId}`);
  });
  socket.on('typing', ({ orderId, sender }) => {
    socket.to(`chat_${orderId}`).emit('typing', { sender });
  });
});

app.set('io', io);
const PORT = 3001;

startTelegramEngine(supabase, io);

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

// --- BCV API ENDPOINT ---
app.get('/api/bcv', async (req, res) => {
  try {
    // Intentamos hacer scraping simple a la página del BCV
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const response = await fetch('https://www.bcv.org.ve/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';

    if (!response.ok) {
      throw new Error('Error de conexión con el BCV');
    }

    const html = await response.text();
    // Expresión regular para buscar el div con id "dolar" y extraer el texto del strong (que puede tener clases)
    const match = html.match(/<div id="dolar"[\s\S]*?<strong.*?>(.*?)<\/strong>/);

    if (match && match[1]) {
      // El valor viene con comas, por ejemplo "853,49930000"
      let rateStr = match[1].trim().replace(',', '.');
      let rate = parseFloat(rateStr);

      if (!isNaN(rate)) {
        return res.json({ rate });
      }
    }

    throw new Error('No se pudo extraer la tasa del HTML');
  } catch (error) {
    console.error('Error al obtener BCV:', error.message);
    // Si falla, retornamos un valor de fallback o error
    res.status(500).json({ error: error.message, fallbackRate: 36.50 });
  }
});

// --- DELIVERY TELEGRAM ENDPOINTS ---
app.post('/api/delivery/telegram/send', async (req, res) => {
  const { commerceId, customerData, customOrderId } = req.body;

  const { data: setting } = await supabase.from('platform_settings').select('value').eq('key', 'delivery_master_group_id').single();
  const chatId = setting ? setting.value : null;

  if (!chatId) return res.status(400).json({ success: false, error: "No hay un Grupo de Repartidores configurado globalmente." });

  const orderId = customOrderId || 'ORD-' + Math.random().toString(36).substr(2, 6).toUpperCase();

  let deliveryPin = customerData.deliveryPin;
  if (!deliveryPin) {
    deliveryPin = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      await supabase.from('ecommerce_orders_v2').update({ delivery_pin: deliveryPin }).eq('id', orderId);
    } catch (e) {console.error("Error updating emergency pin in db", e);}
  }

  const gpsLink = customerData.location ? `\n📍 <b>GPS:</b> https://www.google.com/maps?q=${customerData.location.lat},${customerData.location.lng}` : '';
  const message = `🚨 <b>NUEVO VIAJE DISPONIBLE</b> 🚨\n🆔 <b>Pedido:</b> #${orderId}\n🏪 <b>Comercio:</b> ${commerceId}\n\n📍 <b>ZONA DE ENTREGA</b>\n<code>${customerData.zone}</code>${gpsLink}\n\n📦 <b>DETALLES DEL PAQUETE</b>\n<b>Tipo:</b> ${customerData.packageType}\n<b>Productos:</b> \n<code>${customerData.productList}</code>\n${customerData.weight ? `\n⚖️ <b>Peso:</b> ${customerData.weight} kg` : ''}\n${customerData.quantity ? `\n🔢 <b>Cantidad:</b> ${customerData.quantity} uds` : ''}\n\n<i>(El teléfono y dirección exacta se enviarán por privado al aceptar el viaje por seguridad)</i>`;

  const TELEGRAM_BOT_USERNAME = process.env.VITE_TELEGRAM_BOT_USERNAME || 'DeliveryAxonbot';
  const replyMarkup = {
    inline_keyboard: [
    [{ text: "🚗 Aceptar Viaje", url: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=accept_${orderId}` }],
    [{ text: "🗺️ Ver Mapa de la Zona", url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customerData.zone)}` }]]

  };

  try {
    const telegramRes = await sendMessageToChat(chatId, message, replyMarkup);
    if (!telegramRes.ok) throw new Error("Error al enviar a Telegram");

    // Save to pending
    await supabase.from('delivery_pending_trips').insert([{ order_id: orderId, customer_data: JSON.stringify(customerData), delivery_pin: deliveryPin }]);


    res.json({ success: true, orderId, deliveryPin });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener todos los servicios
app.get('/api/services', async (req, res) => {
  try {
    const services = (await db.execute({ sql: 'SELECT * FROM services', args: [] })).rows;
    // Parsear el JSON del logbook
    const formattedServices = services.map((s) => ({
      ...s,
      logbook: s.logbook ? JSON.parse(s.logbook) : null
    }));
    res.json(formattedServices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear un servicio
app.post('/api/services', async (req, res) => {
  const { id, name, description, cost, price, category, logbook } = req.body;
  try {




    await db.execute({ sql: `
      INSERT INTO services (id, name, description, cost, price, category, logbook)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, args: [id || Date.now().toString(), name, description || '',
      cost || 0,
      price || 0,
      category || '',
      JSON.stringify(logbook || {})] });

    res.status(201).json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar un servicio
app.put('/api/services/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, cost, price, category, logbook } = req.body;
  try {





    await db.execute({ sql: `
      UPDATE services
      SET name = ?, description = ?, cost = ?, price = ?, category = ?, logbook = ?
      WHERE id = ?
    `, args: [name, description || '', cost || 0, price || 0,
      category || '',
      JSON.stringify(logbook || {}),
      id] });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar un servicio
app.delete('/api/services/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute({ sql: 'DELETE FROM services WHERE id = ?', args: [id] });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- RUTAS DE PRESUPUESTOS (BUDGETS) ---

// Obtener presupuestos (filtrados por workspace_id si se provee)
app.get('/api/budgets', async (req, res) => {
  const { workspaceId } = req.query;
  try {
    let budgets;
    if (workspaceId) {
      budgets = (await db.execute({ sql: 'SELECT * FROM budgets WHERE workspace_id = ? ORDER BY date DESC', args: [workspaceId] })).rows;
    } else {
      budgets = (await db.execute({ sql: 'SELECT * FROM budgets ORDER BY date DESC', args: [] })).rows;
    }
    const formattedBudgets = budgets.map((b) => ({
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
app.post('/api/budgets', async (req, res) => {
  const { id, name, date, items, totalCost, totalRevenue, approvedRevenue, maintenance, workspace_id } = req.body;
  try {




    await db.execute({ sql: `
      INSERT INTO budgets (id, name, date, items, totalCost, totalRevenue, approvedRevenue, maintenance, workspace_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, args: [id || Date.now().toString(), name || 'Presupuesto sin nombre', date || new Date().toISOString(),
      JSON.stringify(items || []),
      totalCost || 0,
      totalRevenue || 0,
      approvedRevenue || 0,
      maintenance ? JSON.stringify(maintenance) : null,
      workspace_id || 'default_workspace'] });

    res.status(201).json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar un presupuesto
app.put('/api/budgets/:id', async (req, res) => {
  const { id } = req.params;
  const { name, items, totalCost, totalRevenue, approvedRevenue, maintenance } = req.body;
  try {





    await db.execute({ sql: `
      UPDATE budgets
      SET name = ?, items = ?, totalCost = ?, totalRevenue = ?, approvedRevenue = ?, maintenance = ?
      WHERE id = ?
    `, args: [name, JSON.stringify(items || []), totalCost || 0, totalRevenue || 0,
      approvedRevenue || 0,
      maintenance ? JSON.stringify(maintenance) : null,
      id] });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar un presupuesto
app.delete('/api/budgets/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute({ sql: 'DELETE FROM budgets WHERE id = ?', args: [id] });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RUTAS DE CATEGORÍAS ---

app.get('/api/categories', async (req, res) => {
  try {
    const categories = (await db.execute({ sql: 'SELECT * FROM categories ORDER BY order_index ASC', args: [] })).rows;
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', async (req, res) => {
  const { name, order_index } = req.body;
  try {
    if (!name) return res.status(400).json({ error: 'Name is required' });

    // Check if exists
    const exists = (await db.execute({ sql: 'SELECT name FROM categories WHERE name = ?', args: [name] })).rows[0];
    if (exists) return res.status(400).json({ error: 'Category already exists' });

    await db.execute({ sql: 'INSERT INTO categories (name, order_index) VALUES (?, ?)', args: [name, order_index || 0] });
    res.status(201).json({ success: true, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/categories', (req, res) => {
  const { categories } = req.body; // Array de {name, order_index}
  try {

    db.transaction(async () => {
      for (const cat of categories) {
        await db.execute({ sql: 'UPDATE categories SET order_index = ? WHERE name = ?', args: [cat.order_index, cat.name] });
      }
    })();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:name', async (req, res) => {
  const { name } = req.params;
  try {
    await db.execute({ sql: 'DELETE FROM categories WHERE name = ?', args: [name] });
    // Mover los servicios de esta categoría a vacío o "Sin Asignar"
    await db.execute({ sql: 'UPDATE services SET category = ? WHERE category = ?', args: ['', name] });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RUTAS DE WORKSPACES ---

app.get('/api/workspaces', async (req, res) => {
  try {
    const workspaces = (await db.execute({ sql: 'SELECT * FROM workspaces ORDER BY created_at ASC', args: [] })).rows;
    const formatted = workspaces.map((w) => ({
      ...w,
      config: w.config ? JSON.parse(w.config) : {}
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/workspaces', async (req, res) => {
  const { name } = req.body;
  try {
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const id = Date.now().toString();
    await db.execute({ sql: 'INSERT INTO workspaces (id, name, config, created_at) VALUES (?, ?, ?, ?)', args: [
      id,
      name,
      '{}',
      new Date().toISOString()] });

    res.status(201).json({ success: true, id, name, config: {} });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/workspaces/:id/config', async (req, res) => {
  const { id } = req.params;
  const { config, store_slug } = req.body;
  try {
    await db.execute({ sql: 'UPDATE workspaces SET config = ? WHERE id = ?', args: [
      JSON.stringify(config || {}),
      id] });


    if (store_slug) {
      await db.execute({ sql: 'UPDATE workspaces SET store_slug = ? WHERE id = ?', args: [store_slug, id] });
    }

    // Sembrar categorías por defecto si se pasan en el config
    if (config && config.categories && Array.isArray(config.categories)) {

      const currentMax = (await db.execute({ sql: 'SELECT MAX(order_index) as maxIdx FROM categories', args: [] })).rows[0];
      let nextIndex = (currentMax.maxIdx || 0) + 1;

      db.transaction(async () => {
        for (const catName of config.categories) {
          await db.execute({ sql: 'INSERT OR IGNORE INTO categories (name, order_index) VALUES (?, ?)', args: [catName, nextIndex++] });
        }
      })();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/workspaces/:id', async (req, res) => {
  const { id } = req.params;
  if (id === 'default_workspace') return res.status(400).json({ error: 'Cannot delete default workspace' });
  try {
    await db.execute({ sql: 'DELETE FROM workspaces WHERE id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM budgets WHERE workspace_id = ?', args: [id] }); // Borrar presupuestos asociados
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/workspaces/change-password', async (req, res) => {
  const { workspaceId, currentPassword, newPassword } = req.body;
  try {
    const ws = (await db.execute({ sql: 'SELECT id, config FROM workspaces WHERE id = ?', args: [workspaceId] })).rows[0];
    if (!ws) return res.status(404).json({ error: 'Tienda no encontrada' });

    let cfg = {};
    try {
      cfg = JSON.parse(ws.config || '{}');
    } catch (e) {}

    // Validar contraseña actual (si ya había una configurada)
    if (cfg.adminPassword && cfg.adminPassword !== currentPassword) {
      return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    }

    // Actualizar con la nueva
    cfg.adminPassword = newPassword;

    await db.execute({ sql: 'UPDATE workspaces SET config = ? WHERE id = ?', args: [
      JSON.stringify(cfg),
      workspaceId] });


    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/workspaces/merchant/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const workspaces = (await db.execute({ sql: 'SELECT id, name, config, store_slug, status FROM workspaces', args: [] })).rows;
    const ws = workspaces.find((w) => {
      try {
        const cfg = JSON.parse(w.config || '{}');
        return cfg.adminEmail === email;
      } catch {return false;}
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

app.get('/api/workspaces/store/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const ws = (await db.execute({ sql: 'SELECT id, name, config, store_slug, status FROM workspaces WHERE store_slug = ?', args: [slug] })).rows[0];
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

app.get('/api/market/stores', async (req, res) => {
  try {
    const stores = (await db.execute({ sql: "SELECT id, name, config, store_slug FROM workspaces WHERE store_slug IS NOT NULL AND store_slug != '' AND status != 'Suspendido'", args: [] })).rows;

    const productCategoriesRows = (await db.execute({ sql: "SELECT workspace_id, category FROM ecommerce_products", args: [] })).rows;
    const storeCategoriesMap = {};
    productCategoriesRows.forEach((row) => {
      if (!storeCategoriesMap[row.workspace_id]) storeCategoriesMap[row.workspace_id] = new Set();
      if (row.category) storeCategoriesMap[row.workspace_id].add(row.category);
    });

    const formatted = stores.map((ws) => {
      let parsedConfig = {};
      try {
        parsedConfig = ws.config ? JSON.parse(ws.config) : {};
      } catch (e) {}

      const storefrontConfig = parsedConfig.storefront || parsedConfig;

      return {
        id: ws.id,
        name: ws.name,
        slug: ws.store_slug,
        logoUrl: storefrontConfig.logoUrl || null,
        heroUrl: storefrontConfig.heroUrl || null,
        description: storefrontConfig.texts?.heroSub || 'Descubre nuestros productos',
        config: parsedConfig,
        productCategories: Array.from(storeCategoriesMap[ws.id] || [])
      };
    });
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RUTAS DE ECOMMERCE PRODUCTS ---

app.get('/api/ecommerce/products', async (req, res) => {
  const workspaceId = req.query.workspaceId || req.query.workspace_id;
  try {
    let products;
    if (workspaceId) {
      products = (await db.execute({ sql: `
        SELECT p.*, COALESCE(AVG(r.rating), 0) AS avg_rating, COUNT(r.id) AS review_count
        FROM ecommerce_products p
        LEFT JOIN ecommerce_reviews r ON p.id = r.product_id AND r.status = 'Aprobado'
        WHERE p.workspace_id = ?
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `, args: [workspaceId] })).rows;
    } else {
      products = (await db.execute({ sql: `
        SELECT p.*, COALESCE(AVG(r.rating), 0) AS avg_rating, COUNT(r.id) AS review_count
        FROM ecommerce_products p
        LEFT JOIN ecommerce_reviews r ON p.id = r.product_id AND r.status = 'Aprobado'
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `, args: [] })).rows;
    }
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ecommerce/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const product = (await db.execute({ sql: 'SELECT * FROM ecommerce_products WHERE id = ?', args: [id] })).rows[0];
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ecommerce/products', async (req, res) => {
  const { id: reqId, name, price, category, stock, description, publishStatus, imageUrl, variants, isOffer, discountPrice, expirationDate, batchNumber, unit_type, step_size, workspace_id, cogs, min_stock, max_stock, supplier, stock_vitrina, metadata } = req.body;
  try {
    const id = reqId || Date.now().toString();




    await db.execute({ sql: `
      INSERT INTO ecommerce_products (id, name, price, category, stock, description, publish_status, image_url, variants, created_at, is_offer, discount_price, expiration_date, batch_number, unit_type, step_size, workspace_id, cogs, min_stock, max_stock, supplier, stock_vitrina, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, args: [id, name, price || 0, category || 'Sin Categoría', stock || 0, description || '', publishStatus || 'Borrador', imageUrl || '', variants || 1, new Date().toISOString(), isOffer ? 1 : 0, discountPrice || 0, expirationDate || null, batchNumber || null, unit_type || 'unidad', step_size || 1, workspace_id || 'default_workspace', cogs || 0, min_stock || 5, max_stock || null, supplier || '', stock_vitrina || 0, metadata ? JSON.stringify(metadata) : '{}'] });res.status(201).json({ success: true, id });} catch (err) {res.status(500).json({ error: err.message });
  }
});

app.put('/api/ecommerce/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, price, category, stock, description, publishStatus, imageUrl, variants, isOffer, discountPrice, expirationDate, batchNumber, unit_type, step_size, cogs, min_stock, max_stock, supplier, stock_vitrina, metadata } = req.body;
  try {





    await db.execute({ sql: `
      UPDATE ecommerce_products
      SET name = ?, price = ?, category = ?, stock = ?, description = ?, publish_status = ?, image_url = ?, variants = ?, is_offer = ?, discount_price = ?, expiration_date = ?, batch_number = ?, unit_type = ?, step_size = ?, cogs = ?, min_stock = ?, max_stock = ?, supplier = ?, stock_vitrina = ?, metadata = ?
      WHERE id = ?
    `, args: [name, price || 0, category || 'Sin Categoría', stock || 0, description || '', publishStatus || 'Borrador', imageUrl || '', variants || 1, isOffer ? 1 : 0, discountPrice || 0, expirationDate || null, batchNumber || null, unit_type || 'unidad', step_size || 1, cogs || 0, min_stock || 5, max_stock || null, supplier || '', stock_vitrina || 0, metadata ? typeof metadata === 'string' ? metadata : JSON.stringify(metadata) : '{}', id] });res.json({ success: true });} catch (err) {res.status(500).json({ error: err.message });}
});

app.put('/api/ecommerce/products/:id/offer', async (req, res) => {
  const { id } = req.params;
  const { isOffer, discountPrice } = req.body;
  try {





    await db.execute({ sql: `
      UPDATE ecommerce_products
      SET is_offer = ?, discount_price = ?
      WHERE id = ?
    `, args: [isOffer ? 1 : 0, discountPrice || 0, id] });res.json({ success: true });} catch (err) {res.status(500).json({ error: err.message });}
});

app.patch('/api/ecommerce/products/:id', async (req, res) => {
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

    Object.keys(updates).forEach((k) => {
      if (k !== 'id') {
        const mappedKey = fieldMap[k] || k;
        keys.push(mappedKey);
        values.push(updates[k]);
      }
    });

    if (keys.length === 0) return res.json({ success: true });

    const setClause = keys.map((k) => `${k} = ?`).join(', ');
    values.push(id);

    await db.execute({ sql: `UPDATE ecommerce_products SET ${setClause} WHERE id = ?`, args: [...values] });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/ecommerce/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute({ sql: 'DELETE FROM ecommerce_products WHERE id = ?', args: [id] });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RUTAS DE ECOMMERCE PEDIDOS (ORDERS) ---

app.get('/api/ecommerce/orders', async (req, res) => {
  const { workspaceId } = req.query;
  try {
    let orders;
    if (workspaceId) {
      orders = (await db.execute({ sql: 'SELECT o.*, c.phone as customer_phone FROM ecommerce_orders_v2 o LEFT JOIN ecommerce_customers c ON o.customer_email = c.email WHERE o.workspace_id = ? ORDER BY o.date DESC', args: [workspaceId] })).rows;
    } else {
      orders = (await db.execute({ sql: 'SELECT o.*, c.phone as customer_phone FROM ecommerce_orders_v2 o LEFT JOIN ecommerce_customers c ON o.customer_email = c.email ORDER BY o.date DESC', args: [] })).rows;
    }
    const formatted = orders.map((o) => ({
      ...o,
      deliveryPin: o.delivery_pin,
      paymentDetails: o.paymentDetails ? JSON.parse(o.paymentDetails) : null,
      items: o.items ? JSON.parse(o.items) : [],
      shipping_info: o.shipping_info ? JSON.parse(o.shipping_info) : null
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ecommerce/customer-orders/:email', async (req, res) => {
  const { email } = req.params;
  try {
    const orders = (await db.execute({ sql: 'SELECT * FROM ecommerce_orders_v2 WHERE customer_email = ? ORDER BY date DESC', args: [email] })).rows;
    const formatted = orders.map((o) => ({
      ...o,
      deliveryPin: o.delivery_pin,
      paymentDetails: o.paymentDetails ? JSON.parse(o.paymentDetails) : null,
      items: o.items ? JSON.parse(o.items) : [],
      shipping_info: o.shipping_info ? JSON.parse(o.shipping_info) : null
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ecommerce/orders', async (req, res) => {
  const { customer, customerEmail, date, total, status, priority, address, paymentMethod, paymentStatus, paymentDetails, items, isMobile, bookingDate, bookingTime, tableNumber, orderType, workspace_id, discount_code, shippingInfo } = req.body;
  try {
    const wsId = workspace_id || 'default_workspace';

    // 1. Validar y Reservar Stock Inmediatamente



    // Verificar todo el stock primero
    for (const item of items) {
      const product = (await db.execute({ sql: 'SELECT name, stock_vitrina, stock FROM ecommerce_products WHERE id = ? AND workspace_id = ?', args: [item.id, wsId] })).rows[0];
      if (!product) {
        return res.status(400).json({ error: `Producto no encontrado: ${item.name}.` });
      }
      const globalStock = (product.stock_vitrina || 0) + (product.stock || 0);
      if (globalStock < item.quantity) {
        return res.status(400).json({ error: `Lo sentimos, otro cliente acaba de llevarse el producto: ${product.name}. Quedan ${globalStock} unidades.` });
      }
    }

    // Deducir stock si todo está bien
    db.transaction(async () => {
      for (const item of items) {
        const product = (await db.execute({ sql: 'SELECT stock_vitrina FROM ecommerce_products WHERE id = ? AND workspace_id = ?', args: [item.id, wsId] })).rows[0];
        if ((product.stock_vitrina || 0) >= item.quantity) {
          await db.execute({ sql: 'UPDATE ecommerce_products SET stock_vitrina = stock_vitrina - ? WHERE id = ? AND workspace_id = ?', args: [item.quantity, item.id, wsId] });
        } else {
          const diff = item.quantity - (product.stock_vitrina || 0);
          await db.execute({ sql: 'UPDATE ecommerce_products SET stock_vitrina = 0, stock = stock - ? WHERE id = ? AND workspace_id = ?', args: [diff, item.id, wsId] });
        }
      }
    })();

    const id = 'ORD-' + Math.floor(1000 + Math.random() * 9000); // Generar ID ej: ORD-1234




    await db.execute({ sql: `
      INSERT INTO ecommerce_orders_v2 (id, customer, customer_email, date, total, status, priority, address, paymentMethod, paymentStatus, paymentDetails, items, isMobile, booking_date, booking_time, table_number, order_type, workspace_id, discount_code, shipping_info)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, args: [id, customer || 'Cliente Anónimo', customerEmail || null,
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
      wsId,
      discount_code || null,
      shippingInfo ? JSON.stringify(shippingInfo) : null] });


    await db.execute({ sql: 'UPDATE ecommerce_orders_v2 SET stock_deducted = 1 WHERE id = ?', args: [id] });

    // Si usó un código de descuento, sumarle al contador de usos
    if (discount_code) {
      await db.execute({ sql: `
        UPDATE ecommerce_promotions 
        SET usage_count = usage_count + 1 
        WHERE code = ? AND workspace_id = ?
      `, args: [discount_code.toUpperCase(), wsId] });
    }


    res.status(201).json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/ecommerce/orders/:id', async (req, res) => {
  const { id } = req.params;
  const { status, paymentStatus, bookingDate, bookingTime, tableNumber, orderType, deliveryPin, customer_confirmed } = req.body;
  try {
    if (status) {
      if (status === 'Cancelado' || status === 'Rechazado') {
        const order = (await db.execute({ sql: 'SELECT items, stock_deducted, workspace_id FROM ecommerce_orders_v2 WHERE id = ?', args: [id] })).rows[0];
        if (order && order.stock_deducted) {
          let items = [];
          try {items = JSON.parse(order.items || '[]');} catch (e) {}


          db.transaction(async () => {
            for (const item of items) {
              await db.execute({ sql: 'UPDATE ecommerce_products SET stock_vitrina = stock_vitrina + ? WHERE id = ? AND workspace_id = ?', args: [item.quantity, item.id, order.workspace_id] });
            }
          })();

          await db.execute({ sql: 'UPDATE ecommerce_orders_v2 SET stock_deducted = 0 WHERE id = ?', args: [id] });
        }
      }
      await db.execute({ sql: 'UPDATE ecommerce_orders_v2 SET status = ? WHERE id = ?', args: [status, id] });
    }
    if (paymentStatus) {
      await db.execute({ sql: 'UPDATE ecommerce_orders_v2 SET paymentStatus = ? WHERE id = ?', args: [paymentStatus, id] });
    }
    if (bookingDate !== undefined) await db.execute({ sql: 'UPDATE ecommerce_orders_v2 SET booking_date = ? WHERE id = ?', args: [bookingDate, id] });
    if (bookingTime !== undefined) await db.execute({ sql: 'UPDATE ecommerce_orders_v2 SET booking_time = ? WHERE id = ?', args: [bookingTime, id] });
    if (tableNumber !== undefined) await db.execute({ sql: 'UPDATE ecommerce_orders_v2 SET table_number = ? WHERE id = ?', args: [tableNumber, id] });
    if (orderType !== undefined) await db.execute({ sql: 'UPDATE ecommerce_orders_v2 SET order_type = ? WHERE id = ?', args: [orderType, id] });
    if (deliveryPin !== undefined) await db.execute({ sql: 'UPDATE ecommerce_orders_v2 SET delivery_pin = ? WHERE id = ?', args: [deliveryPin, id] });
    if (customer_confirmed !== undefined) {
      await db.execute({ sql: 'UPDATE ecommerce_orders_v2 SET customer_confirmed = ? WHERE id = ?', args: [customer_confirmed, id] });
      const order = (await db.execute({ sql: 'SELECT driver_confirmed FROM ecommerce_orders_v2 WHERE id = ?', args: [id] })).rows[0];
      if (order && order.driver_confirmed === 1 && customer_confirmed === 1) {
        await db.execute({ sql: "UPDATE ecommerce_orders_v2 SET status = 'Entregado' WHERE id = ?", args: [id] });
        const io = req.app.get('io');
        if (io) io.emit('delivery_completed', { orderId: id });

        const activeTrip = (await db.execute({ sql: 'SELECT driver_id FROM delivery_active_trips WHERE order_id = ?', args: [id] })).rows[0];
        if (activeTrip && activeTrip.driver_id) {
          sendMessageToChat(activeTrip.driver_id, `✅ <b>¡Listo!</b> El cliente también ha confirmado de recibido. Pedido <b>#${id}</b> finalizado con éxito. ¡Buen trabajo!`);
          await db.execute({ sql: 'DELETE FROM delivery_active_trips WHERE order_id = ?', args: [id] });
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RUTAS DE E-COMMERCE CLIENTES (CUSTOMERS) ---

app.get('/api/ecommerce/customers', async (req, res) => {
  try {
    const customers = (await db.execute({ sql: 'SELECT * FROM ecommerce_customers ORDER BY join_date DESC', args: [] })).rows;
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ecommerce/customers/register', async (req, res) => {
  const { email, password } = req.body;
  let { name } = req.body;
  if (!name) name = email.split('@')[0];

  try {
    const existing = (await db.execute({ sql: 'SELECT id FROM ecommerce_customers WHERE email = ?', args: [email] })).rows[0];
    if (existing) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    const id = 'CUST-' + Math.floor(1000 + Math.random() * 9000);




    await db.execute({ sql: `
      INSERT INTO ecommerce_customers (id, name, email, password, doc_id, phone, address, join_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, args: [id, name, email,
      password, // En un sistema real esto debería estar hasheado
      '',
      '',
      '',
      new Date().toISOString().split('T')[0],
      'Activo'] });


    const newUser = { id, name, email, docId: '', phone: '', address: '', joinDate: new Date().toISOString().split('T')[0] };
    res.status(201).json({ success: true, user: newUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ecommerce/customers/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = (await db.execute({ sql: 'SELECT * FROM ecommerce_customers WHERE email = ? AND password = ?', args: [email, password] })).rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(['/api/ecommerce/customers/google-login', '/api/ecommerce/customers/auth/oauth-g'], async (req, res) => {
  const { credential } = req.body;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const { email, name } = payload;

    if (!email) {
      return res.status(400).json({ error: 'No se pudo obtener el email de Google' });
    }

    let user = (await db.execute({ sql: 'SELECT * FROM ecommerce_customers WHERE email = ?', args: [email] })).rows[0];

    if (!user) {
      // Registro automático
      const id = 'CUST-' + Math.floor(1000 + Math.random() * 9000);




      await db.execute({ sql: `
        INSERT INTO ecommerce_customers (id, name, email, password, doc_id, phone, address, join_date, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, args: [id, name, email,
        'GOOGLE_AUTH',
        '',
        '',
        '',
        new Date().toISOString().split('T')[0],
        'Activo'] });

      user = (await db.execute({ sql: 'SELECT * FROM ecommerce_customers WHERE id = ?', args: [id] })).rows[0];
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } catch (err) {
    console.error("Error validando token de Google:", err);
    res.status(401).json({ error: 'Token de Google inválido o expirado' });
  }
});

app.put('/api/ecommerce/customers/:id', async (req, res) => {
  const { id } = req.params;
  const { name, docId, phone, address, favorites, wishlist, addresses } = req.body;
  try {





    await db.execute({ sql: `
      UPDATE ecommerce_customers
      SET name = ?, doc_id = ?, phone = ?, address = ?, favorites = ?, wishlist = ?, addresses = ?
      WHERE id = ?
    `, args: [name, docId || '', phone || '', address || '',
      typeof favorites === 'string' ? favorites : favorites ? JSON.stringify(favorites) : '[]',
      typeof wishlist === 'string' ? wishlist : wishlist ? JSON.stringify(wishlist) : '[]',
      typeof addresses === 'string' ? addresses : addresses ? JSON.stringify(addresses) : '[]',
      id] });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- RUTAS DE E-COMMERCE ANALYTICS Y BITACORA ---

// Endpoint para insertar datos de prueba
app.post('/api/ecommerce/seed', async (req, res) => {
  try {
    const products = [
    { id: 'p1', name: 'Camiseta de Algodón Premium', price: 29.99, category: 'Ropa' },
    { id: 'p2', name: 'Auriculares Inalámbricos', price: 89.00, category: 'Electrónica' },
    { id: 'p3', name: 'Mochila de Viaje', price: 65.00, category: 'Accesorios' },
    { id: 'p4', name: 'Reloj Inteligente', price: 120.00, category: 'Electrónica' }];



    for (const p of products) {
      await db.execute({ sql: 'INSERT OR IGNORE INTO ecommerce_products (id, name, price, category, created_at) VALUES (?, ?, ?, ?, ?)', args: [p.id, p.name, p.price, p.category, new Date().toISOString()] });
    }




    // Generar ventas aleatorias para los últimos 30 días
    const now = new Date();
    db.transaction(async () => {
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

        await db.execute({ sql: 'INSERT INTO ecommerce_sales (id, customer_email, total, created_at) VALUES (?, ?, ?, ?)', args: [saleId, 'cliente' + i + '@test.com', total, date.toISOString()] });
        for (const item of saleItems) {
          await db.execute({ sql: 'INSERT INTO ecommerce_sale_items (id, sale_id, product_id, quantity, price) VALUES (?, ?, ?, ?, ?)', args: [item.id, item.sale_id, item.product_id, item.quantity, item.price] });
        }
      }
    })();

    res.json({ success: true, message: 'Datos de prueba insertados' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RUTAS DE E-COMMERCE RESEÑAS ---

app.get('/api/ecommerce/reviews', async (req, res) => {
  const workspaceId = req.query.workspaceId || 'default_workspace';
  try {
    const reviews = (await db.execute({ sql: "SELECT * FROM ecommerce_reviews WHERE workspace_id = ? ORDER BY created_at DESC", args: [workspaceId] })).rows;
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ecommerce/reviews', async (req, res) => {
  const { workspaceId = 'default_workspace', productId, productName, customerId, customerName, rating, comment } = req.body;
  const id = 'rev_' + Date.now();
  try {




    await db.execute({ sql: `
      INSERT INTO ecommerce_reviews (id, workspace_id, product_id, product_name, customer_id, customer_name, rating, comment, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente', ?)
    `, args: [id, workspaceId, productId, productName, customerId || null, customerName, rating, comment, new Date().toISOString()] });res.status(201).json({ success: true, id });} catch (err) {res.status(500).json({ error: err.message });
  }
});

app.put('/api/ecommerce/reviews/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    if (status === 'Rechazado') {
      await db.execute({ sql: "DELETE FROM ecommerce_reviews WHERE id = ?", args: [id] });
    } else {
      await db.execute({ sql: "UPDATE ecommerce_reviews SET status = ? WHERE id = ?", args: [status, id] });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/ecommerce/reviews/:id/reply', async (req, res) => {
  const { id } = req.params;
  const { reply } = req.body;
  try {
    await db.execute({ sql: "UPDATE ecommerce_reviews SET reply = ? WHERE id = ?", args: [reply, id] });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RUTAS DE E-COMMERCE PROMOCIONES ---

app.get('/api/ecommerce/promotions', async (req, res) => {
  const workspaceId = req.query.workspaceId || 'default_workspace';
  try {
    const promotions = (await db.execute({ sql: "SELECT * FROM ecommerce_promotions WHERE workspace_id = ? ORDER BY created_at DESC", args: [workspaceId] })).rows;
    res.json(promotions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ecommerce/promotions', async (req, res) => {
  const { workspaceId = 'default_workspace', code, type, value, usageLimit = -1, expiresAt = null } = req.body;
  const id = 'promo_' + Date.now();
  try {
    const check = (await db.execute({ sql: "SELECT id FROM ecommerce_promotions WHERE code = ? AND workspace_id = ?", args: [code, workspaceId] })).rows[0];
    if (check) return res.status(400).json({ error: 'El código ya existe' });

    await db.execute({ sql: `
      INSERT INTO ecommerce_promotions (id, workspace_id, code, type, value, usage_limit, created_at, expires_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, args: [id, workspaceId, code.toUpperCase(), type, value, usageLimit, new Date().toISOString(), expiresAt] });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/ecommerce/promotions/:id', async (req, res) => {
  try {
    await db.execute({ sql: "DELETE FROM ecommerce_promotions WHERE id = ?", args: [req.params.id] });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ecommerce/promotions/validate', async (req, res) => {
  const { code, workspaceId = 'default_workspace' } = req.body;
  try {
    const promo = (await db.execute({ sql: "SELECT * FROM ecommerce_promotions WHERE code = ? AND workspace_id = ?", args: [code.toUpperCase(), workspaceId] })).rows[0];
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
  } else {// default 7d
    pastDate.setDate(now.getDate() - 7);
    olderPastDate.setDate(pastDate.getDate() - 7);
  }

  return {
    currentStart: pastDate.toISOString(),
    previousStart: olderPastDate.toISOString()
  };
}

app.get('/api/ecommerce/analytics/summary', async (req, res) => {
  try {
    const range = req.query.range || '7d';
    const workspaceId = req.query.workspaceId || 'default_workspace';
    const dates = getDateFilter(range);

    const currentSales = (await db.execute({ sql: `
      SELECT SUM(total) as revenue, COUNT(*) as count 
      FROM ecommerce_orders_v2 
      WHERE date >= ? AND workspace_id = ? AND status != 'Cancelado'
    `, args: [dates.currentStart, workspaceId] })).rows[0];

    const prevSales = (await db.execute({ sql: `
      SELECT SUM(total) as revenue, COUNT(*) as count 
      FROM ecommerce_orders_v2 
      WHERE date >= ? AND date < ? AND workspace_id = ? AND status != 'Cancelado'
    `, args: [dates.previousStart, dates.currentStart, workspaceId] })).rows[0];

    const currentRevenue = currentSales.revenue || 0;
    const prevRevenue = prevSales.revenue || 0;
    const revChange = prevRevenue === 0 ? currentRevenue > 0 ? 100 : 0 : (currentRevenue - prevRevenue) / prevRevenue * 100;

    const currentOrders = currentSales.count || 0;
    const prevOrders = prevSales.count || 0;
    const ordersChange = prevOrders === 0 ? currentOrders > 0 ? 100 : 0 : (currentOrders - prevOrders) / prevOrders * 100;

    const currentAov = currentOrders === 0 ? 0 : currentRevenue / currentOrders;
    const prevAov = prevOrders === 0 ? 0 : prevRevenue / prevOrders;
    const aovChange = prevAov === 0 ? currentAov > 0 ? 100 : 0 : (currentAov - prevAov) / prevAov * 100;

    const productsCount = (await db.execute({ sql: 'SELECT COUNT(*) as count FROM ecommerce_products WHERE workspace_id = ?', args: [workspaceId] })).rows[0].count || 0;
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
app.get('/api/ecommerce/analytics/top-products', async (req, res) => {
  try {
    const range = req.query.range || '7d';
    const workspaceId = req.query.workspaceId || 'default_workspace';
    const dates = getDateFilter(range);

    const orders = (await db.execute({ sql: `
      SELECT items 
      FROM ecommerce_orders_v2 
      WHERE date >= ? AND workspace_id = ? AND status != 'Cancelado'
    `, args: [dates.currentStart, workspaceId] })).rows;

    const productStats = {};

    orders.forEach((order) => {
      let items = [];
      try {items = JSON.parse(order.items || '[]');} catch (e) {}

      items.forEach((item) => {
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

// Financieros avanzados
app.get('/api/ecommerce/analytics/financials', async (req, res) => {
  try {
    const range = req.query.range || '30d';
    const workspaceId = req.query.workspaceId || 'default_workspace';
    const dates = getDateFilter(range);

    const orders = (await db.execute({ sql: `
      SELECT customer_email, total, items, date
      FROM ecommerce_orders_v2 
      WHERE date >= ? AND workspace_id = ? AND status != 'Cancelado'
    `, args: [dates.currentStart, workspaceId] })).rows;

    const products = (await db.execute({ sql: `SELECT id, cogs FROM ecommerce_products WHERE workspace_id = ?`, args: [workspaceId] })).rows;
    const cogsMap = {};
    products.forEach((p) => cogsMap[p.id] = p.cogs || 0);

    let totalRevenue = 0;
    let totalCogs = 0;
    const uniqueCustomers = new Set();

    orders.forEach((o) => {
      totalRevenue += o.total;
      if (o.customer_email) uniqueCustomers.add(o.customer_email);
      let items = [];
      try {items = JSON.parse(o.items || '[]');} catch (e) {}
      items.forEach((item) => {
        const itemCogs = cogsMap[item.id] || 0;
        totalCogs += itemCogs * (item.quantity || 1);
      });
    });

    res.json({
      revenue: totalRevenue,
      cogs: totalCogs,
      ordersCount: orders.length,
      customersCount: uniqueCustomers.size
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ventas por fecha (Calendario)
app.get('/api/ecommerce/analytics/sales-by-date', async (req, res) => {
  try {
    const range = req.query.range || '7d';
    const workspaceId = req.query.workspaceId || 'default_workspace';
    const dates = getDateFilter(range);

    const data = (await db.execute({ sql: `
      SELECT substr(date, 1, 10) as date, SUM(total) as revenue, COUNT(*) as orders
      FROM ecommerce_orders_v2
      WHERE date >= ? AND workspace_id = ? AND status != 'Cancelado'
      GROUP BY substr(date, 1, 10)
      ORDER BY date ASC
    `, args: [dates.currentStart, workspaceId] })).rows;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tracking de Analítica
app.post('/api/ecommerce/track', async (req, res) => {
  const { workspaceId, eventType, source } = req.body;
  if (!workspaceId || !eventType) return res.status(400).json({ error: 'Missing data' });
  try {
    const id = Date.now().toString();
    const created_at = new Date().toISOString();
    await db.execute({ sql: 'INSERT INTO ecommerce_tracking (id, workspace_id, event_type, source, created_at) VALUES (?, ?, ?, ?, ?)', args: [
      id, workspaceId, eventType, source || 'Directo', created_at] });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RUTAS DE E-COMMERCE TRACKING ---
app.post('/api/ecommerce/track', async (req, res) => {
  try {
    const { workspaceId, eventType, source } = req.body;
    if (!workspaceId || !eventType) return res.status(400).json({ error: 'Faltan datos' });

    await db.execute({ sql: `
      INSERT INTO ecommerce_tracking (id, workspace_id, event_type, source, created_at)
      VALUES (?, ?, ?, ?, ?)
    `, args: [
      Date.now().toString() + Math.floor(Math.random() * 1000),
      workspaceId,
      eventType,
      source || 'Directo',
      new Date().toISOString()] });


    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Embudo de Conversión
app.get('/api/ecommerce/analytics/funnel', async (req, res) => {
  try {
    const range = req.query.range || '30d';
    const workspaceId = req.query.workspaceId || 'default_workspace';
    const dates = getDateFilter(range);

    const trackingData = (await db.execute({ sql: `
      SELECT event_type, COUNT(*) as count
      FROM ecommerce_tracking
      WHERE created_at >= ? AND workspace_id = ?
      GROUP BY event_type
    `, args: [dates.currentStart, workspaceId] })).rows;

    const purchases = (await db.execute({ sql: `
      SELECT COUNT(*) as count
      FROM ecommerce_orders_v2
      WHERE date >= ? AND workspace_id = ? AND status != 'Cancelado'
    `, args: [dates.currentStart, workspaceId] })).rows[0].count;

    const sourcesData = (await db.execute({ sql: `
      SELECT source, COUNT(*) as count
      FROM ecommerce_tracking
      WHERE created_at >= ? AND workspace_id = ? AND event_type = 'visit'
      GROUP BY source
    `, args: [dates.currentStart, workspaceId] })).rows;

    const funnel = { visitors: 0, addedToCart: 0, checkoutStarted: 0, purchases };
    trackingData.forEach((row) => {
      if (row.event_type === 'visit') funnel.visitors = row.count;
      if (row.event_type === 'add_to_cart') funnel.addedToCart = row.count;
      if (row.event_type === 'checkout_start') funnel.checkoutStarted = row.count;
    });

    // Calcular tráfico
    let totalVisits = 0;
    const traffic = { org: 0, soc: 0, dir: 0 };
    sourcesData.forEach((row) => {
      totalVisits += row.count;
      const s = row.source.toLowerCase();
      if (s.includes('google') || s.includes('bing') || s.includes('yahoo')) traffic.org += row.count;else
      if (s.includes('instagram') || s.includes('facebook') || s.includes('t.co') || s.includes('twitter') || s.includes('tiktok')) traffic.soc += row.count;else
      traffic.dir += row.count;
    });

    if (totalVisits > 0) {
      traffic.org = Math.round(traffic.org / totalVisits * 100);
      traffic.soc = Math.round(traffic.soc / totalVisits * 100);
      traffic.dir = Math.round(traffic.dir / totalVisits * 100);
    }

    res.json({ funnel, traffic });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Carritos abandonados y Recuperados
app.get('/api/ecommerce/analytics/abandoned-carts', async (req, res) => {
  try {
    const workspaceId = req.query.workspaceId || 'default_workspace';

    const carts = (await db.execute({ sql: `
      SELECT * FROM ecommerce_orders_v2 
      WHERE workspace_id = ? AND status IN ('Pendiente', 'Cancelado', 'Aprobado', 'Completado', 'Procesando', 'Enviado')
      ORDER BY date DESC LIMIT 100
    `, args: [workspaceId] })).rows;

    const formatted = carts.map((c) => {
      let displayStatus = 'Pendiente';
      if (['Aprobado', 'Completado', 'Procesando', 'Enviado'].includes(c.status)) displayStatus = 'Recuperado';else
      if (c.status === 'Cancelado') displayStatus = 'Perdido';

      return {
        id: c.id,
        user: c.customer_name || 'Anónimo',
        time: c.date.substring(0, 10),
        status: displayStatus,
        total: c.total,
        dbStatus: c.status
      };
    });

    const displayList = formatted.filter((c) => c.status !== 'Perdido').slice(0, 50);
    res.json(displayList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Super Admin Routes ---

const requireSuperAdmin = (req, res, next) => {
  const key = req.headers['x-superadmin-key'];
  const currentKey = process.env.VITE_SUPERADMIN_KEY || 'cac2003';
  if (key === currentKey) {
    next();
  } else {
    res.status(401).json({ error: 'No autorizado' });
  }
};

app.get('/api/superadmin/stats', requireSuperAdmin, async (req, res) => {
  try {
    const totalMerchants = (await db.execute({ sql: 'SELECT COUNT(*) as count FROM workspaces', args: [] })).rows[0].count;
    const totalCustomers = (await db.execute({ sql: 'SELECT COUNT(*) as count FROM ecommerce_customers', args: [] })).rows[0].count;
    const totalProducts = (await db.execute({ sql: 'SELECT COUNT(*) as count FROM ecommerce_products', args: [] })).rows[0].count;

    const ordersData = (await db.execute({ sql: 'SELECT total, status, paymentMethod FROM ecommerce_orders_v2', args: [] })).rows;
    let totalGMV = 0;
    let totalOrders = 0;
    ordersData.forEach((o) => {
      if (o.status !== 'Cancelado' && o.status !== 'Perdido') {
        totalGMV += Number(o.total || 0);
        totalOrders++;
      }
    });

    const aov = totalOrders > 0 ? totalGMV / totalOrders : 0;

    const pmMap = {};
    const statusMap = {};
    ordersData.forEach((o) => {
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

    const paymentMethodsChart = Object.keys(pmMap).map((name) => ({ name, value: pmMap[name] }));
    const orderStatusesChart = Object.keys(statusMap).map((name) => ({ name, value: statusMap[name] }));

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentOrders = (await db.execute({ sql: 'SELECT date, total, status FROM ecommerce_orders_v2 WHERE date >= ?', args: [sevenDaysAgo.toISOString()] })).rows;

    const chartMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      chartMap[d.toISOString().substring(0, 10)] = 0;
    }

    recentOrders.forEach((o) => {
      if (o.status !== 'Cancelado' && o.status !== 'Perdido') {
        const dateKey = o.date.substring(0, 10);
        if (chartMap[dateKey] !== undefined) {
          chartMap[dateKey] += Number(o.total || 0);
        }
      }
    });

    const salesChartData = Object.keys(chartMap).map((date) => ({
      date,
      sales: chartMap[date]
    }));

    const allMerchants = (await db.execute({ sql: 'SELECT id, name FROM workspaces', args: [] })).rows;
    const merchantMap = {};
    allMerchants.forEach((m) => merchantMap[m.id] = { name: m.name, sales: 0 });

    const allOrdersWithWorkspace = (await db.execute({ sql: 'SELECT workspace_id, total, status FROM ecommerce_orders_v2', args: [] })).rows;
    allOrdersWithWorkspace.forEach((o) => {
      if (o.status !== 'Cancelado' && o.status !== 'Perdido' && o.workspace_id && merchantMap[o.workspace_id]) {
        merchantMap[o.workspace_id].sales += Number(o.total || 0);
      }
    });

    const topMerchants = Object.values(merchantMap).
    sort((a, b) => b.sales - a.sales).
    slice(0, 5);

    const productMap = {};
    const allOrdersItems = (await db.execute({ sql: "SELECT items FROM ecommerce_orders_v2 WHERE status != 'Cancelado' AND status != 'Perdido'", args: [] })).rows;
    allOrdersItems.forEach((row) => {
      if (row.items) {
        try {
          const items = JSON.parse(row.items);
          items.forEach((item) => {
            if (!productMap[item.name]) productMap[item.name] = 0;
            productMap[item.name] += Number(item.quantity || 1);
          });
        } catch (e) {}
      }
    });

    const topProducts = Object.keys(productMap).
    map((name) => ({ name, qty: productMap[name] })).
    sort((a, b) => b.qty - a.qty).
    slice(0, 5);

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

app.get('/api/superadmin/merchants', requireSuperAdmin, async (req, res) => {
  try {
    const merchants = (await db.execute({ sql: 'SELECT id, name, created_at, store_slug, status, config FROM workspaces', args: [] })).rows;
    res.json(merchants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/superadmin/key', requireSuperAdmin, (req, res) => {
  const { newKey } = req.body;
  if (!newKey || newKey.length < 4) {
    return res.status(400).json({ error: 'La nueva clave debe tener al menos 4 caracteres' });
  }

  try {
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    if (envContent.includes('VITE_SUPERADMIN_KEY=')) {
      envContent = envContent.replace(/VITE_SUPERADMIN_KEY=.*/g, `VITE_SUPERADMIN_KEY="${newKey}"`);
    } else {
      envContent += `\nVITE_SUPERADMIN_KEY="${newKey}"\n`;
    }

    fs.writeFileSync(envPath, envContent);
    process.env.VITE_SUPERADMIN_KEY = newKey;

    res.json({ success: true, message: 'Clave actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo guardar la clave: ' + err.message });
  }
});


app.get('/api/superadmin/2fa/setup', requireSuperAdmin, (req, res) => {
  try {
    let secret = process.env.SUPERADMIN_2FA_SECRET;
    
    // Generate if it doesn't exist
    if (!secret) {
      // Generate a random 20 byte buffer and encode it in base32
      const randomBuffer = crypto.randomBytes(20);
      const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
      secret = '';
      for (let i = 0; i < randomBuffer.length; i++) {
        secret += base32chars[randomBuffer[i] % 32];
      }
      
      const envPath = path.join(__dirname, '..', '.env');
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }

      if (envContent.includes('SUPERADMIN_2FA_SECRET=')) {
        envContent = envContent.replace(/SUPERADMIN_2FA_SECRET=.*/g, `SUPERADMIN_2FA_SECRET="${secret}"`);
      } else {
        envContent += `\nSUPERADMIN_2FA_SECRET="${secret}"\n`;
      }
      fs.writeFileSync(envPath, envContent);
      process.env.SUPERADMIN_2FA_SECRET = secret;
    }

    const totp = new OTPAuth.TOTP({
      issuer: 'AxonMarket SuperAdmin',
      label: 'Admin Panel',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secret
    });

    res.json({ success: true, uri: totp.toString(), secret: secret });
  } catch (err) {
    res.status(500).json({ error: 'Error setting up 2FA: ' + err.message });
  }
});



app.post('/api/superadmin/2fa/setup-public', (req, res) => {
  try {
    let secret = process.env.SUPERADMIN_2FA_SECRET;
    
    // If it already exists, refuse to generate a new one publicly
    if (secret) {
      return res.status(403).json({ error: 'El 2FA ya fue inicializado.' });
    }

    // Generate a random 20 byte buffer and encode it in base32
    const randomBuffer = crypto.randomBytes(20);
    const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    secret = '';
    for (let i = 0; i < randomBuffer.length; i++) {
      secret += base32chars[randomBuffer[i] % 32];
    }
    
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    if (envContent.includes('SUPERADMIN_2FA_SECRET=')) {
      envContent = envContent.replace(/SUPERADMIN_2FA_SECRET=.*/g, `SUPERADMIN_2FA_SECRET="${secret}"`);
    } else {
      envContent += `\nSUPERADMIN_2FA_SECRET="${secret}"\n`;
    }
    fs.writeFileSync(envPath, envContent);
    process.env.SUPERADMIN_2FA_SECRET = secret;

    const totp = new OTPAuth.TOTP({
      issuer: 'AxonMarket SuperAdmin',
      label: 'Admin Panel',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secret
    });

    res.json({ success: true, uri: totp.toString() });
  } catch (err) {
    res.status(500).json({ error: 'Error setting up 2FA: ' + err.message });
  }
});

app.get('/api/superadmin/2fa/status', (req, res) => {
  res.json({ isActive: !!process.env.SUPERADMIN_2FA_SECRET });
});

app.post('/api/superadmin/recover', (req, res) => {
  try {
    const { token } = req.body;
    const secret = process.env.SUPERADMIN_2FA_SECRET;

    if (!secret) {
      return res.status(400).json({ error: 'El administrador no ha configurado la recuperación 2FA todavía.' });
    }

    if (!token || token.length !== 6) {
      return res.status(400).json({ error: 'Token inválido' });
    }

    const totp = new OTPAuth.TOTP({
      issuer: 'AxonMarket SuperAdmin',
      label: 'Admin Panel',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secret
    });

    const delta = totp.validate({ token: token, window: 2 });
    
    if (delta !== null) {
      const currentKey = process.env.VITE_SUPERADMIN_KEY || 'cac2003';
      return res.json({ success: true, key: currentKey });
    } else {
      return res.status(401).json({ error: 'El código 2FA es incorrecto o ha expirado.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Error interno de recuperación: ' + err.message });
  }
});

app.delete('/api/superadmin/merchants/:id', requireSuperAdmin, (req, res) => {
  const { id } = req.params;
  try {
    db.transaction(async () => {
      try {await db.execute({ sql: 'DELETE FROM ecommerce_products WHERE workspace_id = ?', args: [id] });} catch (e) {}
      try {await db.execute({ sql: 'DELETE FROM ecommerce_orders_v2 WHERE workspace_id = ?', args: [id] });} catch (e) {}
      try {await db.execute({ sql: 'DELETE FROM ecommerce_promotions WHERE workspace_id = ?', args: [id] });} catch (e) {}
      try {await db.execute({ sql: 'DELETE FROM ecommerce_reviews WHERE workspace_id = ?', args: [id] });} catch (e) {}
      try {await db.execute({ sql: 'DELETE FROM ecommerce_tracking WHERE workspace_id = ?', args: [id] });} catch (e) {}
      try {await db.execute({ sql: 'DELETE FROM ecommerce_notifications WHERE workspace_id = ?', args: [id] });} catch (e) {}
      try {await db.execute({ sql: 'DELETE FROM budgets WHERE workspace_id = ?', args: [id] });} catch (e) {}
      await db.execute({ sql: 'DELETE FROM workspaces WHERE id = ?', args: [id] });
    })();
    res.json({ message: 'Merchant deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/superadmin/customers', requireSuperAdmin, async (req, res) => {
  try {
    const customers = (await db.execute({ sql: 'SELECT id, name, email, phone, doc_id, join_date FROM ecommerce_customers', args: [] })).rows;
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/superadmin/customers/:id', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute({ sql: 'DELETE FROM ecommerce_customers WHERE id = ?', args: [id] });
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/superadmin/merchants/:id/status', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    if (status !== 'Activo' && status !== 'Suspendido') {
      return res.status(400).json({ error: 'Status invalido' });
    }
    await db.execute({ sql: 'UPDATE workspaces SET status = ? WHERE id = ?', args: [status, id] });
    res.json({ success: true, message: `Estado actualizado a ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SUPERADMIN DELIVERY SETTINGS ---
app.get('/api/superadmin/settings', requireSuperAdmin, async (req, res) => {
  try {
    const { data: setting } = await supabase.from('platform_settings').select('value').eq('key', 'delivery_master_group_id').single();
    res.json({ delivery_master_group_id: setting ? setting.value : '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/superadmin/settings', requireSuperAdmin, async (req, res) => {
  const { delivery_master_group_id } = req.body;
  try {
    await db.execute({ sql: "INSERT INTO platform_settings (key, value) VALUES ('delivery_master_group_id', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", args: [delivery_master_group_id] });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/superadmin/drivers', requireSuperAdmin, async (req, res) => {
  try {
    const drivers = (await db.execute({ sql: "SELECT * FROM delivery_drivers", args: [] })).rows;
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/superadmin/drivers/:id/status', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { isBanned } = req.body;
  try {
    await db.execute({ sql: "UPDATE delivery_drivers SET banned = ? WHERE id = ?", args: [isBanned ? 1 : 0, id] });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/superadmin/drivers/:id', requireSuperAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute({ sql: "DELETE FROM delivery_drivers WHERE id = ?", args: [id] });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/superadmin/monitor', requireSuperAdmin, async (req, res) => {
  try {
    const recentOrders = (await db.execute({ sql: `
      SELECT o.id, o.customer, o.date, o.total, o.status, o.workspace_id, w.name as workspace_name
      FROM ecommerce_orders_v2 o
      LEFT JOIN workspaces w ON o.workspace_id = w.id
      ORDER BY o.date DESC
      LIMIT 20
    `, args: [] })).rows;
    res.json(recentOrders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RUTAS DE AUTENTICACION (RECUPERACION DE CONTRASEÑA) ---

app.post('/api/auth/recover-password', async (req, res) => {
  const { email, type } = req.body;
  try {
    let exists = false;
    if (type === 'customer') {
      exists = (await db.execute({ sql: 'SELECT id FROM ecommerce_customers WHERE email = ?', args: [email] })).rows[0];
    } else if (type === 'merchant') {
      const workspaces = (await db.execute({ sql: 'SELECT config FROM workspaces', args: [] })).rows;
      exists = workspaces.some((w) => {
        try {
          const cfg = JSON.parse(w.config || '{}');
          return cfg.adminEmail === email;
        } catch {return false;}
      });
    }

    if (!exists) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Generar código numérico de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // Expiración en 15 minutos
    const expiresAt = new Date(Date.now() + 15 * 60000).toISOString();

    await db.execute({ sql: 'INSERT INTO password_resets (email, code, user_type, expires_at) VALUES (?, ?, ?, ?)', args: [email, code, type, expiresAt] });

    // Como es entorno local de pruebas, devolvemos el código en la respuesta para facilitar la prueba (en prod sería por email)
    console.log(`[RECOVERY CODE] Para ${email} (${type}): ${code}`);
    res.json({ success: true, message: 'Código generado', _devCode: code });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { email, code, newPassword, type } = req.body;
  try {
    const record = (await db.execute({ sql: 'SELECT * FROM password_resets WHERE email = ? AND user_type = ? AND code = ? ORDER BY expires_at DESC LIMIT 1', args: [email, type, code] })).rows[0];

    if (!record) {
      return res.status(400).json({ error: 'Código incorrecto' });
    }

    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ error: 'El código ha expirado' });
    }

    // Cambiar la contraseña
    if (type === 'customer') {
      await db.execute({ sql: 'UPDATE ecommerce_customers SET password = ? WHERE email = ?', args: [newPassword, email] });
    } else if (type === 'merchant') {
      const workspaces = (await db.execute({ sql: 'SELECT id, config FROM workspaces', args: [] })).rows;
      let updated = false;
      for (const ws of workspaces) {
        try {
          const cfg = JSON.parse(ws.config || '{}');
          if (cfg.adminEmail === email) {
            cfg.adminPassword = newPassword;
            await db.execute({ sql: 'UPDATE workspaces SET config = ? WHERE id = ?', args: [JSON.stringify(cfg), ws.id] });
            updated = true;
          }
        } catch (e) {}
      }
      if (!updated) {
        return res.status(404).json({ error: 'Comerciante no encontrado' });
      }
    }

    // Eliminar el código usado
    await db.execute({ sql: 'DELETE FROM password_resets WHERE email = ? AND user_type = ?', args: [email, type] });

    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- RUTAS DE NOTIFICACIONES B2B ---
app.get('/api/ecommerce/notifications/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const notifs = (await db.execute({ sql: 'SELECT * FROM ecommerce_notifications WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 50', args: [workspaceId] })).rows;
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ecommerce/notifications', async (req, res) => {
  try {
    const { workspace_id, type, message, product_id, customer_id } = req.body;

    // Deduplicación para 'stock_alert' (evitar spam en clics rápidos)
    if (type === 'stock_alert' && customer_id && product_id) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const duplicate = (await db.execute({ sql: `
        SELECT id FROM ecommerce_notifications 
        WHERE workspace_id = ? 
          AND type = ? 
          AND product_id = ? 
          AND customer_id = ? 
          AND created_at > ?
      `, args: [workspace_id, type, product_id, customer_id, fiveMinutesAgo] })).rows[0];

      if (duplicate) {
        // Ignorar la notificación para evitar spam
        return res.json({ success: true, id: duplicate.id, ignored: true });
      }
    }

    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const created_at = new Date().toISOString();

    await db.execute({ sql: 'INSERT INTO ecommerce_notifications (id, workspace_id, type, message, product_id, customer_id, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)', args: [
      id, workspace_id, type || 'info', message, product_id || null, customer_id || null, created_at] });

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/ecommerce/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute({ sql: 'UPDATE ecommerce_notifications SET is_read = 1 WHERE id = ?', args: [id] });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- CHAT ENDPOINTS (WEBSOCKET INTEGRATED) ---

app.get('/api/ecommerce/orders/:id/chat', async (req, res) => {
  const { id } = req.params;
  try {
    const order = (await db.execute({ sql: 'SELECT chat_history FROM ecommerce_orders_v2 WHERE id = ?', args: [id] })).rows[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });

    let history = [];
    try {
      history = typeof order.chat_history === 'string' ? JSON.parse(order.chat_history || '[]') : order.chat_history || [];
    } catch (e) {}

    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ecommerce/orders/:id/chat', async (req, res) => {
  const { id } = req.params;
  const { sender, text, imageUrl, id: reqId } = req.body;

  if (!sender || !text && !imageUrl) {
    return res.status(400).json({ error: 'Sender and text/imageUrl are required' });
  }

  try {
    const order = (await db.execute({ sql: 'SELECT chat_history, workspace_id FROM ecommerce_orders_v2 WHERE id = ?', args: [id] })).rows[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });

    let chatHistory = [];
    try {
      chatHistory = typeof order.chat_history === 'string' ? JSON.parse(order.chat_history || '[]') : order.chat_history || [];
    } catch (e) {}

    const newMessage = {
      id: reqId || Date.now().toString(),
      sender,
      text: text || '',
      imageUrl: imageUrl || null,
      timestamp: new Date().toISOString(),
      read: false
    };

    chatHistory.push(newMessage);

    await db.execute({ sql: 'UPDATE ecommerce_orders_v2 SET chat_history = ? WHERE id = ?', args: [JSON.stringify(chatHistory), id] });

    // Emitir mensaje por WebSockets
    const io = req.app.get('io');
    io.to(`chat_${id}`).emit('new_message', newMessage);
    if (order.workspace_id) {
      io.to(`workspace_${order.workspace_id}`).emit('order_updated');
    }

    res.status(201).json({ success: true, message: newMessage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/ecommerce/orders/:id/chat/read', async (req, res) => {
  const { id } = req.params;
  const { reader } = req.body;
  try {
    const order = (await db.execute({ sql: 'SELECT chat_history FROM ecommerce_orders_v2 WHERE id = ?', args: [id] })).rows[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });
    let chatHistory = [];
    try {chatHistory = typeof order.chat_history === 'string' ? JSON.parse(order.chat_history || '[]') : order.chat_history || [];} catch (e) {}

    let updated = false;
    chatHistory.forEach((msg) => {
      if (msg.sender !== reader && !msg.read) {
        msg.read = true;
        updated = true;
      }
    });

    if (updated) {
      await db.execute({ sql: 'UPDATE ecommerce_orders_v2 SET chat_history = ? WHERE id = ?', args: [JSON.stringify(chatHistory), id] });
      const io = req.app.get('io');
      io.to(`chat_${id}`).emit('messages_read', { reader });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Configuración de Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  auth: {
    user: process.env.SMTP_EMAIL, // ej: mi-correo@gmail.com
    pass: process.env.SMTP_PASSWORD // ej: password de aplicación
  }
});

// --- SEGURIDAD Y ACCESO (PIN) ENDPOINTS ---

app.post('/api/workspaces/recover-pin', async (req, res) => {
  const { workspaceId } = req.body;
  try {
    const ws = (await db.execute({ sql: 'SELECT config, name FROM workspaces WHERE id = ?', args: [workspaceId] })).rows[0];
    if (!ws) return res.status(404).json({ error: 'Tienda no encontrada' });

    let config = {};
    try {config = JSON.parse(ws.config || '{}');} catch (e) {}

    if (!config.adminEmail) {
      return res.status(400).json({ error: 'La tienda no tiene un correo de administrador configurado' });
    }
    if (!config.adminPin) {
      return res.status(400).json({ error: 'No hay un PIN configurado en esta tienda' });
    }

    const mailOptions = {
      from: process.env.SMTP_EMAIL || '"Soporte Tienda" <no-reply@mitienda.com>',
      to: config.adminEmail,
      subject: `Recuperación de PIN Administrativo - ${ws.name}`,
      text: `Hola,\n\nHas solicitado recuperar el PIN administrativo de tu tienda "${ws.name}".\n\nTu PIN actual es: ${config.adminPin}\n\nSi no fuiste tú quien lo solicitó, por favor cambia el PIN inmediatamente y asegúrate de que tu cuenta esté segura.\n\nSaludos,\nEl equipo de Soporte.`
    };

    if (process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
      await transporter.sendMail(mailOptions);
    } else {
      console.log('Simulando envío de correo (Faltan variables SMTP_EMAIL y SMTP_PASSWORD en .env):');
      console.log(mailOptions);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error enviando correo de recuperación:', err);
    res.status(500).json({ error: 'Error interno del servidor al enviar el correo' });
  }
});

app.post('/api/workspaces/notify-pin-login', async (req, res) => {
  const { workspaceId } = req.body;
  try {
    const ws = (await db.execute({ sql: 'SELECT config, name FROM workspaces WHERE id = ?', args: [workspaceId] })).rows[0];
    if (!ws) return res.status(404).json({ error: 'Tienda no encontrada' });

    let config = {};
    try {config = JSON.parse(ws.config || '{}');} catch (e) {}

    if (config.adminEmail) {
      const mailOptions = {
        from: process.env.SMTP_EMAIL || '"Alerta de Seguridad" <no-reply@mitienda.com>',
        to: config.adminEmail,
        subject: `Alerta de Acceso: Perfil de Tienda - ${ws.name}`,
        text: `Hola,\n\nQueríamos informarte que recientemente alguien ha accedido exitosamente a la sección protegida por PIN de tu tienda "${ws.name}".\n\nFecha y hora: ${new Date().toLocaleString()}\n\nSi fuiste tú o tu personal autorizado, puedes ignorar este mensaje. Si no reconoces esta actividad, te recomendamos cambiar tu PIN inmediatamente.\n\nSaludos,\nEl equipo de Seguridad.`
      };

      if (process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD) {
        // Enviar en background sin esperar a que termine para no bloquear
        transporter.sendMail(mailOptions).catch((err) => console.error('Error enviando alerta:', err));
      } else {
        console.log('Simulando alerta de login (Faltan variables SMTP):');
        console.log(mailOptions);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error notificando login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Inicializar el servidor
server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});