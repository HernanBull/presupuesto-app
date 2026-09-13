import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

// Inicializar Tablas
db.exec(`
  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    cost REAL,
    price REAL,
    category TEXT,
    logbook JSON
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    name TEXT,
    date TEXT NOT NULL,
    items JSON,
    totalCost REAL,
    totalRevenue REAL,
    approvedRevenue REAL,
    maintenance JSON
  );

  CREATE TABLE IF NOT EXISTS categories (
    name TEXT PRIMARY KEY,
    order_index INTEGER
  );

  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    config JSON,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ecommerce_products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ecommerce_sales (
    id TEXT PRIMARY KEY,
    customer_email TEXT,
    total REAL NOT NULL,
    status TEXT DEFAULT 'Completed',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ecommerce_sale_items (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY(sale_id) REFERENCES ecommerce_sales(id),
    FOREIGN KEY(product_id) REFERENCES ecommerce_products(id)
  );

  CREATE TABLE IF NOT EXISTS ecommerce_orders_v2 (
    id TEXT PRIMARY KEY,
    customer TEXT NOT NULL,
    date TEXT NOT NULL,
    total REAL NOT NULL,
    status TEXT DEFAULT 'Pendiente',
    priority TEXT DEFAULT 'Normal',
    address TEXT,
    paymentMethod TEXT,
    paymentStatus TEXT,
    paymentDetails JSON,
    items JSON,
    isMobile INTEGER DEFAULT 0
  );
`);

// Migración simple por si la tabla budgets ya existía sin la columna name o maintenance
try {
  db.prepare('ALTER TABLE budgets ADD COLUMN name TEXT').run();
} catch (e) {
  // Ignorar si ya existe
}

try {
  db.prepare('ALTER TABLE budgets ADD COLUMN maintenance JSON').run();
} catch (e) {
  // Ignorar si ya existe
}

// Migración para Multi-Workspace
try {
  db.prepare('ALTER TABLE budgets ADD COLUMN workspace_id TEXT').run();
  
  // Asignar los presupuestos existentes a un workspace "default" (opcional si hay registros previos)
  const defaultWorkspaceId = 'default_workspace';
  const workspaceExists = db.prepare('SELECT id FROM workspaces WHERE id = ?').get(defaultWorkspaceId);
  if (!workspaceExists) {
    db.prepare('INSERT INTO workspaces (id, name, config, created_at) VALUES (?, ?, ?, ?)').run(
      defaultWorkspaceId, 
      'Mi Negocio', 
      '{}', 
      new Date().toISOString()
    );
  }
  db.prepare('UPDATE budgets SET workspace_id = ? WHERE workspace_id IS NULL').run(defaultWorkspaceId);
} catch (e) {
  // Ignorar si ya existe la columna
}

// Migración para tabla de ecommerce_products
try {
  db.prepare('ALTER TABLE ecommerce_products ADD COLUMN stock INTEGER DEFAULT 0').run();
} catch(e) {}
try {
  db.prepare('ALTER TABLE ecommerce_products ADD COLUMN description TEXT').run();
} catch(e) {}
try {
  db.prepare('ALTER TABLE ecommerce_products ADD COLUMN publish_status TEXT DEFAULT "Borrador"').run();
} catch(e) {}
try {
  db.prepare('ALTER TABLE ecommerce_products ADD COLUMN image_url TEXT').run();
} catch(e) {}
try {
  db.prepare('ALTER TABLE ecommerce_products ADD COLUMN variants INTEGER DEFAULT 1').run();
} catch(e) {}

// Migración para tabla de ecommerce_products (Ofertas)
try {
  db.prepare('ALTER TABLE ecommerce_products ADD COLUMN is_offer INTEGER DEFAULT 0').run();
} catch(e) {}
try {
  db.prepare('ALTER TABLE ecommerce_products ADD COLUMN discount_price REAL DEFAULT 0').run();
} catch(e) {}

export default db;
