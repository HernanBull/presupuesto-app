const fs = require('fs');

let serverContent = fs.readFileSync('server/index.js', 'utf8');

// 1. Initial Imports
if (!serverContent.includes("const { Server } = require('socket.io');")) {
  serverContent = serverContent.replace(
    `const express = require('express');`,
    `const express = require('express');\nconst http = require('http');\nconst { Server } = require('socket.io');`
  );
}

// 2. Setup socket.io server
if (!serverContent.includes("const io = new Server(server")) {
  serverContent = serverContent.replace(
    `const app = express();`,
    `const app = express();\nconst server = http.createServer(app);\nconst io = new Server(server, {\n  cors: {\n    origin: '*',\n    methods: ['GET', 'POST']\n  }\n});\n\nio.on('connection', (socket) => {\n  socket.on('join_chat', (orderId) => {\n    socket.join(\`chat_\${orderId}\`);\n  });\n});\n\napp.set('io', io);`
  );
}

// 3. Replace app.listen with server.listen
if (serverContent.includes("app.listen(PORT")) {
  serverContent = serverContent.replace(
    `app.listen(PORT, () => {`,
    `server.listen(PORT, () => {`
  );
}

// 4. Inject the missing chat endpoints (GET and POST) before the end
if (!serverContent.includes("'/api/ecommerce/orders/:id/chat'")) {
  const chatEndpoints = `
// --- CHAT ENDPOINTS (WEBSOCKET INTEGRATED) ---

app.get('/api/ecommerce/orders/:id/chat', (req, res) => {
  const { id } = req.params;
  try {
    const order = db.prepare('SELECT chat_history FROM ecommerce_orders_v2 WHERE id = ?').get(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    let history = [];
    try {
      history = typeof order.chat_history === 'string' ? JSON.parse(order.chat_history || '[]') : (order.chat_history || []);
    } catch(e) {}
    
    res.json(history);
  } catch(err) {
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
    
    let chatHistory = [];
    try {
      chatHistory = typeof order.chat_history === 'string' ? JSON.parse(order.chat_history || '[]') : (order.chat_history || []);
    } catch(e) {}
    
    const newMessage = {
      id: Date.now().toString(),
      sender,
      text: text || '',
      imageUrl: imageUrl || null,
      timestamp: new Date().toISOString()
    };
    
    chatHistory.push(newMessage);
    
    db.prepare('UPDATE ecommerce_orders_v2 SET chat_history = ? WHERE id = ?').run(JSON.stringify(chatHistory), id);
    
    // Emitir mensaje por WebSockets
    const io = req.app.get('io');
    io.to(\`chat_\${id}\`).emit('new_message', newMessage);
    
    res.status(201).json({ success: true, message: newMessage });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Inicializar el servidor`;

  serverContent = serverContent.replace(`// Inicializar el servidor`, chatEndpoints);
}

fs.writeFileSync('server/index.js', serverContent, 'utf8');
console.log("server/index.js actualizado con WebSockets y Endpoints de Chat.");
