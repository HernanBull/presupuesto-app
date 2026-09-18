import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

console.log("Limpiando base de datos...");

db.exec(`
  DELETE FROM ecommerce_customers;
  DELETE FROM workspaces;
  DELETE FROM ecommerce_products;
  DELETE FROM ecommerce_orders_v2;
  DELETE FROM ecommerce_sale_items;
  DELETE FROM ecommerce_sales;
`);

console.log("¡Cuentas de comerciantes y clientes eliminadas correctamente!");
