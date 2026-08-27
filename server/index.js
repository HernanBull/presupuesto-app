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

// Inicializar el servidor
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
