const fs = require('fs');

let content = fs.readFileSync('src/modules/ecommerce/pages/OrdersManager.jsx', 'utf8');

if (!content.includes('MessageSquare')) {
  content = content.replace(
    `import { Search, Filter, ChevronDown, Check, X, CreditCard, Box, MapPin, Truck, AlertCircle, RefreshCw, FileImage, Copy, CheckCircle2, Phone } from 'lucide-react';`,
    `import { Search, Filter, ChevronDown, Check, X, CreditCard, Box, MapPin, Truck, AlertCircle, RefreshCw, FileImage, Copy, CheckCircle2, Phone, MessageSquare, Send, Image as ImageIcon, Loader2 } from 'lucide-react';`
  );
}

if (!content.includes('const [isChatOpen, setIsChatOpen]')) {
  content = content.replace(
    `const [isDetailsOpen, setIsDetailsOpen] = useState(false);`,
    `const [isDetailsOpen, setIsDetailsOpen] = useState(false);\n  const [isChatOpen, setIsChatOpen] = useState(false);\n  const [chatMessages, setChatMessages] = useState([]);\n  const [chatInput, setChatInput] = useState('');\n  const [chatImage, setChatImage] = useState(null);\n  const [isSendingChat, setIsSendingChat] = useState(false);`
  );
}

if (!content.includes('fetchChatMessages')) {
  content = content.replace(
    `const verifyPayment = async (orderId, action) => {`,
    `const fetchChatMessages = async (orderId) => {\n    try {\n      const res = await fetch(\`http://localhost:3001/api/ecommerce/orders/\${orderId}/chat\`);\n      if(res.ok) {\n        const data = await res.json();\n        setChatMessages(data);\n      }\n    } catch(e) {}\n  };\n\n  const sendChatMessage = async (e) => {\n    e?.preventDefault();\n    if(!chatInput.trim() && !chatImage) return;\n    setIsSendingChat(true);\n    try {\n      const res = await fetch(\`http://localhost:3001/api/ecommerce/orders/\${selectedOrder.id}/chat\`, {\n        method: 'POST',\n        headers: {'Content-Type': 'application/json'},\n        body: JSON.stringify({ sender: 'merchant', text: chatInput, imageUrl: chatImage })\n      });\n      if(res.ok) {\n        setChatInput('');\n        setChatImage(null);\n        fetchChatMessages(selectedOrder.id);\n      }\n    } catch(e) {}\n    setIsSendingChat(false);\n  };\n\n  const handleChatImageUpload = (e) => {\n    const file = e.target.files[0];\n    if(file) {\n      const reader = new FileReader();\n      reader.onloadend = () => setChatImage(reader.result);\n      reader.readAsDataURL(file);\n    }\n  };\n\n  const openChat = (order) => {\n    setSelectedOrder(order);\n    setIsChatOpen(true);\n    fetchChatMessages(order.id);\n  };\n\n  const verifyPayment = async (orderId, action) => {`
  );
}

// Inject "Abrir Chat de Resolución" button
if (!content.includes('Abrir Chat de Resolución')) {
  content = content.replace(
    `<button onClick={() => verifyPayment(selectedOrder.id, 'approve')} className="flex-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 transition-colors">`,
    `<button onClick={() => openChat(selectedOrder)} className="flex-1 bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:hover:bg-violet-900/50 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 transition-colors">
                         <MessageSquare size={16} /> Abrir Chat de Resolución
                       </button>
                       <button onClick={() => verifyPayment(selectedOrder.id, 'approve')} className="flex-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 transition-colors">`
  );
}

// Ensure the bot sends the first message when marking as 'review'
if (!content.includes('Alerta de Seguridad: Su pago fue retenido')) {
  content = content.replace(
    `if(action === 'review') newStatus = 'review';`,
    `if(action === 'review') {
        newStatus = 'review';
        // Enviar mensaje bot automático
        try {
          await fetch(\`http://localhost:3001/api/ecommerce/orders/\${orderId}/chat\`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ sender: 'merchant', text: '⚠️ Alerta de Seguridad: Su pago fue retenido por provenir de una cuenta no registrada. Por favor, utilice este chat para enviar pruebas de parentesco y titularidad (ej. Foto de la Cédula de Identidad del titular de la cuenta).' })
          });
        } catch(err) {}
      }`
  );
}

// Add the Chat Modal JSX
if (!content.includes('Modal de Chat de Resolución')) {
  content = content.replace(
    `{/* Order Details Modal */}`,
    `{/* Modal de Chat de Resolución */}
      {isChatOpen && selectedOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setIsChatOpen(false)} />
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl relative z-10 flex flex-col h-[80vh] overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><MessageSquare size={18} className="text-violet-500" /> Chat de Resolución</h3>
                <p className="text-xs font-mono text-slate-500 mt-1">Orden: {selectedOrder.id}</p>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-200/50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full p-2 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-100/50 dark:bg-black/20">
              {chatMessages.length === 0 ? (
                <div className="text-center text-slate-400 dark:text-slate-500 text-sm py-10 italic">No hay mensajes. Envía el primero para iniciar la disputa.</div>
              ) : (
                chatMessages.map(msg => (
                  <div key={msg.id} className={\`flex flex-col max-w-[85%] \${msg.sender === 'merchant' ? 'ml-auto items-end' : 'mr-auto items-start'}\`}>
                    <div className={\`p-3 rounded-2xl text-sm shadow-sm \${msg.sender === 'merchant' ? 'bg-violet-600 text-white rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-tl-none'}\`}>
                      {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                      {msg.imageUrl && (
                        <img src={msg.imageUrl} alt="Evidencia" className="mt-2 rounded-xl max-w-full h-auto cursor-pointer border border-black/10" onClick={() => window.open(msg.imageUrl, '_blank')} />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 mx-1">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
              {chatImage && (
                 <div className="relative inline-block mb-3">
                   <img src={chatImage} alt="Preview" className="h-16 rounded-lg border border-slate-300 dark:border-slate-700" />
                   <button onClick={() => setChatImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md"><X size={12}/></button>
                 </div>
              )}
              <form onSubmit={sendChatMessage} className="flex gap-2 items-end">
                <label className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-violet-500 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-violet-500/30">
                  <input type="file" accept="image/*" className="hidden" onChange={handleChatImageUpload} />
                  <ImageIcon size={20} />
                </label>
                <textarea 
                  value={chatInput} 
                  onChange={e => setChatInput(e.target.value)} 
                  placeholder="Escribe un mensaje al cliente..." 
                  className="flex-1 max-h-32 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none text-slate-800 dark:text-white"
                  rows="1"
                  onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                />
                <button type="submit" disabled={isSendingChat || (!chatInput.trim() && !chatImage)} className="p-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md shadow-violet-500/20">
                  {isSendingChat ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}`
  );
}

fs.writeFileSync('src/modules/ecommerce/pages/OrdersManager.jsx', content, 'utf8');
console.log('OrdersManager updated');
