const fs = require('fs');

// 1. Update server/db.js
let dbContent = fs.readFileSync('server/db.js', 'utf8');
if (!dbContent.includes('chat_history JSON')) {
  dbContent = dbContent.replace(
    /try \{\s*db\.prepare\('ALTER TABLE ecommerce_orders_v2 ADD COLUMN delivery_pin TEXT'\)\.run\(\);\s*\} catch\(e\) \{\}/,
    `try {
  db.prepare('ALTER TABLE ecommerce_orders_v2 ADD COLUMN delivery_pin TEXT').run();
} catch(e) {}

try {
  db.prepare('ALTER TABLE ecommerce_orders_v2 ADD COLUMN chat_history JSON DEFAULT \\"[]\\"').run();
} catch(e) {}`
  );
  fs.writeFileSync('server/db.js', dbContent, 'utf8');
}

const Database = require('better-sqlite3');
const db = new Database('server/database.sqlite');
try {
  db.prepare('ALTER TABLE ecommerce_orders_v2 ADD COLUMN chat_history JSON DEFAULT "[]"').run();
  console.log('Migration applied to DB.');
} catch(e) {
  console.log('DB Migration already exists or error:', e.message);
}

// 2. Update server/index.js
let indexContent = fs.readFileSync('server/index.js', 'utf8');
if (!indexContent.includes('/api/ecommerce/orders/:id/chat')) {
  const chatEndpoints = `
// ==================== CHAT DE DISPUTAS ====================
app.get('/api/ecommerce/orders/:id/chat', (req, res) => {
  const { id } = req.params;
  try {
    const order = db.prepare('SELECT chat_history FROM ecommerce_orders_v2 WHERE id = ?').get(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const chatHistory = typeof order.chat_history === 'string' ? JSON.parse(order.chat_history || '[]') : (order.chat_history || []);
    res.json(chatHistory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ecommerce/orders/:id/chat', (req, res) => {
  const { id } = req.params;
  const { sender, text, imageUrl } = req.body;
  
  if (!sender || (!text && !imageUrl)) {
    return res.status(400).json({ error: 'Sender and text/imageUrl are required' });
  }

  try {
    const order = db.prepare('SELECT chat_history FROM ecommerce_orders_v2 WHERE id = ?').get(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    const chatHistory = typeof order.chat_history === 'string' ? JSON.parse(order.chat_history || '[]') : (order.chat_history || []);
    
    const newMessage = {
      id: Date.now().toString(),
      sender,
      text: text || '',
      imageUrl: imageUrl || '',
      timestamp: new Date().toISOString()
    };
    
    chatHistory.push(newMessage);
    
    db.prepare('UPDATE ecommerce_orders_v2 SET chat_history = ? WHERE id = ?').run(JSON.stringify(chatHistory), id);
    
    res.json({ success: true, message: newMessage });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ==========================================================
`;

  indexContent = indexContent.replace(
    `app.get('/api/ecommerce/store/:workspaceId/promotions'`,
    `${chatEndpoints}\napp.get('/api/ecommerce/store/:workspaceId/promotions'`
  );
  fs.writeFileSync('server/index.js', indexContent, 'utf8');
  console.log('Endpoints added to index.js');
}

console.log('Backend changes applied.');
