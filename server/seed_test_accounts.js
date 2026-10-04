import db from './db.js';

async function seedAccounts() {
  try {
    console.log("Iniciando creación de cuentas de prueba...");

    // 1. Crear cuenta administradora para el frontend (Customer)
    const customerExists = (await db.execute({ sql: 'SELECT id FROM ecommerce_customers WHERE email = ?', args: ['admin@admin.com'] })).rows[0];
    if (!customerExists) {
      await db.execute({
        sql: `INSERT INTO ecommerce_customers (id, name, email, password, doc_id, phone, address, join_date, status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          'CUST-ADMIN', 
          'Admin Cliente', 
          'admin@admin.com', 
          'petare413', 
          '', '', '', 
          new Date().toISOString().split('T')[0], 
          'Activo'
        ]
      });
      console.log("✅ Cuenta cliente (frontend) admin@admin.com creada exitosamente.");
    } else {
      console.log("⚠️ La cuenta cliente admin@admin.com ya existe.");
    }

    // 2. Crear cuenta maestra para el comercio (Workspace / Merchant)
    const workspaces = (await db.execute({ sql: 'SELECT id, config FROM workspaces', args: [] })).rows;
    const merchantExists = workspaces.some(w => {
      try {
        const cfg = JSON.parse(w.config || '{}');
        return cfg.adminEmail === 'comercio@admin.com';
      } catch (e) {
        return false;
      }
    });

    if (!merchantExists) {
      const workspaceConfig = {
        adminEmail: 'comercio@admin.com',
        adminPassword: 'petare413',
        storefront: {
            heroSub: 'Tienda maestra para pruebas locales'
        }
      };

      await db.execute({
        sql: 'INSERT INTO workspaces (id, name, config, created_at, store_slug, status) VALUES (?, ?, ?, ?, ?, ?)',
        args: [
          'WS-MASTER-TEST',
          'Comercio Maestro (Pruebas)',
          JSON.stringify(workspaceConfig),
          new Date().toISOString(),
          'comercio-maestro',
          'Activo'
        ]
      });
      console.log("✅ Cuenta comercio (backend) comercio@admin.com creada exitosamente.");
    } else {
      console.log("⚠️ La cuenta comercio comercio@admin.com ya existe.");
    }

    console.log("Proceso finalizado.");
    process.exit(0);
  } catch (error) {
    console.error("Error creando cuentas:", error);
    process.exit(1);
  }
}

seedAccounts();
