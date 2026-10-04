require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const Database = require('better-sqlite3');
const path = require('path');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const dbPath = path.join(__dirname, 'server', 'database.sqlite');
const db = new Database(dbPath);

async function migrate() {
  console.log("🚀 Iniciando migración a Supabase...");

  try {
    // 1. Workspaces
    console.log("Migrando Workspaces...");
    const workspaces = db.prepare('SELECT * FROM workspaces').all();
    for (const ws of workspaces) {
      ws.config = JSON.parse(ws.config || '{}');
      const { error } = await supabase.from('workspaces').upsert(ws);
      if (error) console.error("Error workspace:", error);
    }

    // 2. Customers
    console.log("Migrando Customers...");
    const customers = db.prepare('SELECT * FROM ecommerce_customers').all();
    for (const c of customers) {
      c.favorites = JSON.parse(c.favorites || '[]');
      c.wishlist = JSON.parse(c.wishlist || '[]');
      c.addresses = JSON.parse(c.addresses || '[]');
      const { error } = await supabase.from('ecommerce_customers').upsert(c);
      if (error) console.error("Error customer:", error);
    }

    // 3. Products
    console.log("Migrando Products...");
    const products = db.prepare('SELECT * FROM ecommerce_products').all();
    for (const p of products) {
      p.metadata = JSON.parse(p.metadata || '{}');
      const { error } = await supabase.from('ecommerce_products').upsert(p);
      if (error) console.error("Error product:", error);
    }

    // 4. Orders
    console.log("Migrando Orders...");
    const orders = db.prepare('SELECT * FROM ecommerce_orders_v2').all();
    for (const o of orders) {
      o.items = JSON.parse(o.items || '[]');
      o.paymentDetails = o.paymentDetails ? JSON.parse(o.paymentDetails) : null;
      o.shipping_info = o.shipping_info ? JSON.parse(o.shipping_info) : null;
      o.chat_history = JSON.parse(o.chat_history || '[]');
      const { error } = await supabase.from('ecommerce_orders_v2').upsert(o);
      if (error) console.error("Error order:", error);
    }

    // 5. Drivers
    console.log("Migrando Drivers...");
    const drivers = db.prepare('SELECT * FROM delivery_drivers').all();
    for (const d of drivers) {
      const { error } = await supabase.from('delivery_drivers').upsert(d);
      if (error) console.error("Error driver:", error);
    }

    console.log("✅ ¡Migración completada exitosamente!");
  } catch (error) {
    console.error("❌ Ocurrió un error general:", error);
  }
}

migrate();
