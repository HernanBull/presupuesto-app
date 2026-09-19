import db from './db.js';
const rows = db.prepare('SELECT config FROM workspaces').all();
console.log(JSON.stringify(rows, null, 2));
