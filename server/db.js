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

  CREATE TABLE IF NOT EXISTS ecommerce_customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    doc_id TEXT,
    phone TEXT,
    address TEXT,
    join_date TEXT NOT NULL,
    status TEXT DEFAULT 'Activo'
  );

  CREATE TABLE IF NOT EXISTS ecommerce_promotions (
    id TEXT PRIMARY KEY,
    workspace_id TEXT,
    code TEXT,
    type TEXT,
    value TEXT,
    usage_limit INTEGER DEFAULT -1,
    usage_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Activo',
    created_at TEXT,
    expires_at TEXT
  );

  CREATE TABLE IF NOT EXISTS ecommerce_reviews (
    id TEXT PRIMARY KEY,
    workspace_id TEXT,
    product_id TEXT,
    product_name TEXT,
    customer_id TEXT,
    customer_name TEXT,
    rating INTEGER,
    comment TEXT,
    reply TEXT,
    status TEXT DEFAULT 'Pendiente',
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS ecommerce_tracking (
    id TEXT PRIMARY KEY,
    workspace_id TEXT,
    event_type TEXT,
    source TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS ecommerce_notifications (
    id TEXT PRIMARY KEY,
    workspace_id TEXT,
    type TEXT,
    message TEXT,
    product_id TEXT,
    customer_id TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS password_resets (
    email TEXT,
    code TEXT,
    user_type TEXT,
    expires_at TEXT
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

// Migraciones para control de vencimiento y lotes (Farmacias y alimentos)
try {
  db.prepare('ALTER TABLE ecommerce_products ADD COLUMN expiration_date TEXT').run();
} catch(e) {}
try {
  db.prepare('ALTER TABLE ecommerce_products ADD COLUMN batch_number TEXT').run();
} catch(e) {}

// Migraciones para Agenda/Turnos y Mesas (Barberías, Restaurantes)
try {
  db.prepare('ALTER TABLE ecommerce_orders_v2 ADD COLUMN booking_date TEXT').run();
} catch(e) {}
try {
  db.prepare('ALTER TABLE ecommerce_orders_v2 ADD COLUMN booking_time TEXT').run();
} catch(e) {}
try {
  db.prepare('ALTER TABLE ecommerce_orders_v2 ADD COLUMN table_number TEXT').run();
} catch(e) {}
try {
  db.prepare('ALTER TABLE ecommerce_orders_v2 ADD COLUMN order_type TEXT DEFAULT "delivery"').run(); // "delivery", "pickup", "table"
} catch(e) {}
try {
  db.prepare('ALTER TABLE ecommerce_orders_v2 ADD COLUMN customer_email TEXT').run();
} catch(e) {}
try {
  db.prepare('ALTER TABLE ecommerce_customers ADD COLUMN favorites JSON DEFAULT "[]"').run();
} catch(e) {}
try {
  db.prepare('ALTER TABLE ecommerce_customers ADD COLUMN wishlist JSON DEFAULT "[]"').run();
} catch(e) {}
try {
  db.prepare('ALTER TABLE ecommerce_customers ADD COLUMN addresses JSON DEFAULT "[]"').run();
} catch(e) {}

// Migraciones para Venta de Víveres (Peso y fracciones)
try {
  db.prepare('ALTER TABLE ecommerce_products ADD COLUMN unit_type TEXT DEFAULT "unidad"').run(); // "unidad", "kg", "litro"
} catch(e) {}
try {
  db.prepare('ALTER TABLE ecommerce_products ADD COLUMN step_size REAL DEFAULT 1').run(); // 1 para unidad, 0.1 o 0.25 para peso
} catch(e) {}

// Migraciones Multi-Tenant
try {
  db.prepare('ALTER TABLE ecommerce_products ADD COLUMN workspace_id TEXT').run();
  db.prepare("UPDATE ecommerce_products SET workspace_id = 'default_workspace' WHERE workspace_id IS NULL").run();
} catch(e) {}
try {
  db.prepare('ALTER TABLE ecommerce_orders_v2 ADD COLUMN workspace_id TEXT').run();
  db.prepare("UPDATE ecommerce_orders_v2 SET workspace_id = 'default_workspace' WHERE workspace_id IS NULL").run();
} catch (err) {}

try {
  db.prepare('ALTER TABLE ecommerce_orders_v2 ADD COLUMN stock_deducted INTEGER DEFAULT 0').run();
} catch (err) {}

// Migraciones para Logística/Inventario
try {
  db.prepare('ALTER TABLE ecommerce_products ADD COLUMN cogs REAL DEFAULT 0').run();
} catch(e) {}
try {
  db.prepare('ALTER TABLE ecommerce_products ADD COLUMN min_stock INTEGER DEFAULT 5').run();
} catch(e) {}
try {
  db.prepare('ALTER TABLE ecommerce_products ADD COLUMN max_stock INTEGER').run();
} catch(e) {}
try {
  db.prepare('ALTER TABLE ecommerce_products ADD COLUMN supplier TEXT').run();
} catch(e) {}
try {
  db.prepare('ALTER TABLE ecommerce_products ADD COLUMN stock_vitrina INTEGER DEFAULT 0').run();
} catch(e) {}
try {
  db.prepare('ALTER TABLE ecommerce_products ADD COLUMN metadata TEXT DEFAULT \'{}\'').run();
} catch(e) {}
try {
  db.prepare('ALTER TABLE workspaces ADD COLUMN store_slug TEXT').run();
  db.prepare("UPDATE workspaces SET store_slug = 'tienda-ejemplo' WHERE id = 'default_workspace'").run();
} catch(e) {}

// Migración para Super Admin (Suspensión)
try {
  db.prepare('ALTER TABLE workspaces ADD COLUMN status TEXT DEFAULT "Activo"').run();
} catch(e) {}

try {
  db.prepare('ALTER TABLE ecommerce_orders_v2 ADD COLUMN discount_code TEXT').run();
} catch(e) {}

try {
  db.prepare('ALTER TABLE ecommerce_orders_v2 ADD COLUMN delivery_pin TEXT').run();
} catch(e) {}

export default db;
