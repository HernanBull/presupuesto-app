import db from '../server/db.js';
db.prepare("UPDATE ecommerce_products SET publish_status = 'Publicado'").run();
console.log("Updated products to Publicado");
