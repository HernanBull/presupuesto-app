import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

const dbUrl = process.env.TURSO_DATABASE_URL;
const dbToken = process.env.TURSO_AUTH_TOKEN;

if (!dbUrl || !dbToken) {
  console.warn("⚠️ TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is not set. Database might not connect.");
}

const db = createClient({
  url: dbUrl,
  authToken: dbToken,
});

async function initDB() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      cost REAL,
      price REAL,
      category TEXT,
      logbook JSON
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      name TEXT,
      date TEXT NOT NULL,
      items JSON,
      totalCost REAL,
      totalRevenue REAL,
      approvedRevenue REAL,
      maintenance JSON,
      workspace_id TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      name TEXT PRIMARY KEY,
      order_index INTEGER
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      config JSON,
      created_at TEXT NOT NULL,
      store_slug TEXT,
      status TEXT DEFAULT 'Activo'
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ecommerce_products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT,
      created_at TEXT NOT NULL,
      stock INTEGER DEFAULT 0,
      description TEXT,
      publish_status TEXT DEFAULT 'Borrador',
      image_url TEXT,
      variants INTEGER DEFAULT 1,
      is_offer INTEGER DEFAULT 0,
      discount_price REAL DEFAULT 0,
      expiration_date TEXT,
      batch_number TEXT,
      unit_type TEXT DEFAULT 'unidad',
      step_size REAL DEFAULT 1,
      workspace_id TEXT,
      cogs REAL DEFAULT 0,
      min_stock INTEGER DEFAULT 5,
      max_stock INTEGER,
      supplier TEXT,
      stock_vitrina INTEGER DEFAULT 0,
      metadata TEXT DEFAULT '{}'
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ecommerce_sales (
      id TEXT PRIMARY KEY,
      customer_email TEXT,
      total REAL NOT NULL,
      status TEXT DEFAULT 'Completed',
      created_at TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ecommerce_sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      FOREIGN KEY(sale_id) REFERENCES ecommerce_sales(id),
      FOREIGN KEY(product_id) REFERENCES ecommerce_products(id)
    );
  `);

  await db.execute(`
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
      isMobile INTEGER DEFAULT 0,
      booking_date TEXT,
      booking_time TEXT,
      table_number TEXT,
      order_type TEXT DEFAULT 'delivery',
      customer_email TEXT,
      shipping_info JSON,
      workspace_id TEXT,
      stock_deducted INTEGER DEFAULT 0,
      discount_code TEXT,
      delivery_pin TEXT,
      chat_history JSON DEFAULT '[]',
      driver_confirmed INTEGER DEFAULT 0,
      customer_confirmed INTEGER DEFAULT 0
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ecommerce_customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      doc_id TEXT,
      phone TEXT,
      address TEXT,
      join_date TEXT NOT NULL,
      status TEXT DEFAULT 'Activo',
      favorites JSON DEFAULT '[]',
      wishlist JSON DEFAULT '[]',
      addresses JSON DEFAULT '[]'
    );
  `);

  await db.execute(`
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
  `);

  await db.execute(`
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
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ecommerce_tracking (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      event_type TEXT,
      source TEXT,
      created_at TEXT
    );
  `);

  await db.execute(`
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
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS password_resets (
      email TEXT,
      code TEXT,
      user_type TEXT,
      expires_at TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS platform_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS delivery_drivers (
      id TEXT PRIMARY KEY,
      driver_code TEXT,
      name TEXT,
      cedula TEXT,
      telefono TEXT,
      age TEXT,
      moto TEXT,
      placa TEXT,
      agencia TEXT,
      banned INTEGER DEFAULT 0
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS delivery_pending_trips (
      order_id TEXT PRIMARY KEY,
      customer_data TEXT,
      delivery_pin TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS delivery_active_trips (
      order_id TEXT PRIMARY KEY,
      driver_id TEXT,
      pin TEXT,
      customer_name TEXT,
      customer_data TEXT,
      start_time TEXT
    );
  `);

  // Default Workspace Migration
  const defaultWorkspaceId = 'default_workspace';
  const workspaceExists = await db.execute({ sql: 'SELECT id FROM workspaces WHERE id = ?', args: [defaultWorkspaceId] });
  if (workspaceExists.rows.length === 0) {
    await db.execute({
      sql: 'INSERT INTO workspaces (id, name, config, created_at) VALUES (?, ?, ?, ?)',
      args: [defaultWorkspaceId, 'Mi Negocio', '{}', new Date().toISOString()]
    });
  }
}

// Call initDB to set up tables when the server starts
initDB().catch(console.error);

export default db;
