const fs = require('fs');

let content = fs.readFileSync('src/modules/ecommerce/pages/CustomerProfile.jsx', 'utf8');

if (!content.includes('MessageSquare')) {
  content = content.replace(
    `import { User, FileText, Phone, MapPin, Edit3, ArrowLeft, LogOut, ShoppingBag, History, Heart, Package, Store, ChevronRight, CheckCircle, Clock, Plus, Trash2, Settings, HelpCircle, Star, StarHalf, Navigation, Loader2, Info, Lock } from 'lucide-react';`,
    `import { User, FileText, Phone, MapPin, Edit3, ArrowLeft, LogOut, ShoppingBag, History, Heart, Package, Store, ChevronRight, CheckCircle, Clock, Plus, Trash2, Settings, HelpCircle, Star, StarHalf, Navigation, Loader2, Info, Lock, AlertCircle, MessageSquare, Send, Image as ImageIcon, X } from 'lucide-react';`
  );
}

if (!content.includes('const [isChatOpen, setIsChatOpen]')) {
  content = content.replace(
    `const [ratingModal, setRatingModal] = useState({ isOpen: false, orderId: null, rating: 0, comment: '' });`,
    `const [ratingModal, setRatingModal] = useState({ isOpen: false, orderId: null, rating: 0, comment: '' });
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChatOrder, setActiveChatOrder] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatImage, setChatImage] = useState(null);
  const [isSendingChat, setIsSendingChat] = useState(false);`
  );
}

if (!content.includes('fetchChatMessages')) {
  content = content.replace(
    `const fetchOrders = async (email) => {`,
    `const fetchChatMessages = async (orderId) => {
    try {
      const res = await fetch(\`http://localhost:3001/api/ecommerce/orders/\${orderId}/chat\`);
      if(res.ok) {
        const data = await res.json();
        setChatMessages(data);
      }
    } catch(e) {}
  };

  const openChat = (order) => {
    setActiveChatOrder(order);
    setIsChatOpen(true);
    fetchChatMessages(order.id);
  };

  const sendChatMessage = async (e) => {
    e?.preventDefault();
    if(!chatInput.trim() && !chatImage) return;
    setIsSendingChat(true);
    try {
      const res = await fetch(\`http://localhost:3001/api/ecommerce/orders/\${activeChatOrder.id}/chat\`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ sender: 'customer', text: chatInput, imageUrl: chatImage })
      });
      if(res.ok) {
        setChatInput('');
        setChatImage(null);
        fetchChatMessages(activeChatOrder.id);
      }
    } catch(e) {}
    setIsSendingChat(false);
  };

  const handleChatImageUpload = (e) => {
    const file = e.target.files[0];
    if(file) {
      const reader = new FileReader();
      reader.onloadend = () => setChatImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const fetchOrders = async (email) => {`
  );
}

// Inject "Contactar Soporte / Enviar Pruebas" button
if (!content.includes('Contactar Soporte / Enviar Pruebas')) {
  content = content.replace(
    `<div className="text-xs text-orange-300 font-medium p-3 bg-orange-950/50 rounded-lg">
                                  <strong>ACCIÓN REQUERIDA:</strong> Tienes 24 horas para comunicarte directamente con el comercio y proveer <strong>pruebas verificables</strong> (Cédula del titular, parentesco) de que el pago es legítimo. De lo contrario, los fondos no serán devueltos y se denunciará fraude.
                                </div>`,
    `<div className="text-xs text-orange-300 font-medium p-3 bg-orange-950/50 rounded-lg">
                                  <strong>ACCIÓN REQUERIDA:</strong> Tienes 24 horas para comunicarte directamente con el comercio y proveer <strong>pruebas verificables</strong> (Cédula del titular, parentesco) de que el pago es legítimo. De lo contrario, los fondos no serán devueltos y se denunciará fraude.
                                </div>
                                <button onClick={() => openChat(order)} className="mt-4 bg-orange-500 hover:bg-orange-600 text-black px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors">
                                  <MessageSquare size={16} /> Contactar Soporte / Enviar Pruebas
                                </button>`
  );
}

// Add the Chat Modal JSX
if (!content.includes('Modal de Chat de Resolución')) {
  content = content.replace(
    `{/* MODAL DE CALIFICACIÓN */}`,
    `{/* Modal de Chat de Resolución */}
      {isChatOpen && activeChatOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsChatOpen(false)} />
          <div className="bg-zinc-950 rounded-3xl w-full max-w-md shadow-2xl relative z-10 flex flex-col h-[80vh] overflow-hidden border border-white/10">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-zinc-900/50">
              <div>
                <h3 className="font-bold text-white flex items-center gap-2"><MessageSquare size={18} className="text-amber-500" /> Resolución de Disputa</h3>
                <p className="text-xs font-mono text-zinc-500 mt-1">Orden: {activeChatOrder.id}</p>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-zinc-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-2 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/40">
              {chatMessages.length === 0 ? (
                <div className="text-center text-zinc-500 text-sm py-10 italic">Cargando chat... o aún no hay mensajes.</div>
              ) : (
                chatMessages.map(msg => (
                  <div key={msg.id} className={\`flex flex-col max-w-[85%] \${msg.sender === 'customer' ? 'ml-auto items-end' : 'mr-auto items-start'}\`}>
                    <div className={\`p-3 rounded-2xl text-sm shadow-sm \${msg.sender === 'customer' ? 'bg-amber-500 text-black rounded-tr-none font-medium' : 'bg-zinc-800 text-zinc-200 border border-white/5 rounded-tl-none'}\`}>
                      {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                      {msg.imageUrl && (
                        <img src={msg.imageUrl} alt="Evidencia" className="mt-2 rounded-xl max-w-full h-auto cursor-pointer border border-black/20" onClick={() => window.open(msg.imageUrl, '_blank')} />
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-1 mx-1">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-zinc-900 border-t border-white/10">
              {chatImage && (
                 <div className="relative inline-block mb-3">
                   <img src={chatImage} alt="Preview" className="h-16 rounded-lg border border-white/20" />
                   <button onClick={() => setChatImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md"><X size={12}/></button>
                 </div>
              )}
              <form onSubmit={sendChatMessage} className="flex gap-2 items-end">
                <label className="p-3 bg-zinc-800 text-zinc-400 hover:text-amber-500 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-amber-500/30">
                  <input type="file" accept="image/*" className="hidden" onChange={handleChatImageUpload} />
                  <ImageIcon size={20} />
                </label>
                <textarea 
                  value={chatInput} 
                  onChange={e => setChatInput(e.target.value)} 
                  placeholder="Escribe al comercio..." 
                  className="flex-1 max-h-32 bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 resize-none text-white"
                  rows="1"
                  onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                />
                <button type="submit" disabled={isSendingChat || (!chatInput.trim() && !chatImage)} className="p-3 bg-amber-500 text-black rounded-xl hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md shadow-amber-500/20">
                  {isSendingChat ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CALIFICACIÓN */}`
  );
}

fs.writeFileSync('src/modules/ecommerce/pages/CustomerProfile.jsx', content, 'utf8');
console.log('CustomerProfile updated');
