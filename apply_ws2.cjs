const fs = require('fs');

// 1. Enrich orders with customer_phone in server/index.js
let serverContent = fs.readFileSync('server/index.js', 'utf8');

const oldOrdersGet = `orders = db.prepare('SELECT * FROM ecommerce_orders_v2 WHERE workspace_id = ? ORDER BY date DESC').all(workspaceId);
    } else {
      orders = db.prepare('SELECT * FROM ecommerce_orders_v2 ORDER BY date DESC').all();
    }`;
    
const newOrdersGet = `orders = db.prepare('SELECT o.*, c.phone as customer_phone FROM ecommerce_orders_v2 o LEFT JOIN ecommerce_customers c ON o.customer_email = c.email WHERE o.workspace_id = ? ORDER BY o.date DESC').all(workspaceId);
    } else {
      orders = db.prepare('SELECT o.*, c.phone as customer_phone FROM ecommerce_orders_v2 o LEFT JOIN ecommerce_customers c ON o.customer_email = c.email ORDER BY o.date DESC').all();
    }`;

if (serverContent.includes(oldOrdersGet)) {
  serverContent = serverContent.replace(oldOrdersGet, newOrdersGet);
  fs.writeFileSync('server/index.js', serverContent, 'utf8');
  console.log('server/index.js updated with customer_phone join.');
} else {
  console.log('server/index.js join already applied or not found.');
}

// 2. Update SupportManager.jsx to use socket.io
let supportContent = fs.readFileSync('src/modules/ecommerce/pages/SupportManager.jsx', 'utf8');
if (!supportContent.includes('import { io } from')) {
  supportContent = supportContent.replace(
    `import { Search, Filter, MessageSquare, AlertCircle, Check, X, CheckCircle2, User, Clock, Image as ImageIcon, Send, Loader2, Info } from 'lucide-react';`,
    `import { Search, Filter, MessageSquare, AlertCircle, Check, X, CheckCircle2, User, Clock, Image as ImageIcon, Send, Loader2, Info, Phone } from 'lucide-react';\nimport { io } from 'socket.io-client';`
  );
  
  // Remove interval and add socket logic
  supportContent = supportContent.replace(
    `useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);`,
    `useEffect(() => {
    fetchOrders();
  }, []);
  
  useEffect(() => {
    if (!activeChat) return;
    
    const socket = io('http://localhost:3001');
    socket.emit('join_chat', activeChat.id);
    
    socket.on('new_message', (msg) => {
      setChatMessages(prev => [...prev, msg]);
      fetchOrders(); // Refresh order list silently to update last message preview
    });
    
    return () => socket.disconnect();
  }, [activeChat]);`
  );
  
  // Add customer_phone to header
  supportContent = supportContent.replace(
    `<p className="text-xs font-mono text-slate-500 mt-0.5">Orden: {activeChat.id} | {activeChat.paymentMethod === 'pago_movil' ? 'Pago Móvil' : 'Zelle'}</p>`,
    `<p className="text-xs font-mono text-slate-500 mt-0.5 flex items-center gap-2">Orden: {activeChat.id} {activeChat.customer_phone && <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-1.5 rounded"><Phone size={10} /> {activeChat.customer_phone}</span>}</p>`
  );
  
  fs.writeFileSync('src/modules/ecommerce/pages/SupportManager.jsx', supportContent, 'utf8');
  console.log('SupportManager.jsx updated with websockets.');
}

// 3. Update CustomerProfile.jsx to use socket.io
let customerProfile = fs.readFileSync('src/modules/ecommerce/pages/CustomerProfile.jsx', 'utf8');
if (!customerProfile.includes('import { io } from')) {
  customerProfile = customerProfile.replace(
    `import { Package, MapPin, Search, Star, MessageSquare, HelpCircle, Settings, Camera, LogOut, ChevronRight, CheckCircle2, AlertCircle, Phone, Home, Edit2, Trash2, Heart, X, Send, Image as ImageIcon, Loader2 } from 'lucide-react';`,
    `import { Package, MapPin, Search, Star, MessageSquare, HelpCircle, Settings, Camera, LogOut, ChevronRight, CheckCircle2, AlertCircle, Phone, Home, Edit2, Trash2, Heart, X, Send, Image as ImageIcon, Loader2 } from 'lucide-react';\nimport { io } from 'socket.io-client';`
  );
  
  // Replace the interval in fetchChatMessages (wait, in CustomerProfile we didn't have interval yet? let's check)
  // Let's just add a useEffect for the socket
  customerProfile = customerProfile.replace(
    `const openChat = (order) => {
    setActiveChatOrder(order);
    setIsChatOpen(true);
    fetchChatMessages(order.id);
  };`,
    `const openChat = (order) => {
    setActiveChatOrder(order);
    setIsChatOpen(true);
    fetchChatMessages(order.id);
  };
  
  useEffect(() => {
    if (!isChatOpen || !activeChatOrder) return;
    const socket = io('http://localhost:3001');
    socket.emit('join_chat', activeChatOrder.id);
    
    socket.on('new_message', (msg) => {
      setChatMessages(prev => [...prev, msg]);
    });
    
    return () => socket.disconnect();
  }, [isChatOpen, activeChatOrder]);`
  );
  
  fs.writeFileSync('src/modules/ecommerce/pages/CustomerProfile.jsx', customerProfile, 'utf8');
  console.log('CustomerProfile.jsx updated with websockets.');
}

