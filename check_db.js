import Database from 'better-sqlite3';
const db = new Database('./server/database.sqlite');
console.log(db.prepare('SELECT * FROM ecommerce_notifications').all());
