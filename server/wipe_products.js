import Database from 'better-sqlite3';
const db = new Database('./database.sqlite');
db.prepare('DELETE FROM ecommerce_sale_items').run();
db.prepare('DELETE FROM ecommerce_sales').run();
db.prepare('DELETE FROM ecommerce_products').run();
db.prepare('DELETE FROM ecommerce_products').run();
console.log('All products deleted successfully.');
