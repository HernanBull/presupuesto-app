const fs = require('fs');

// 1. Fix CustomerProfile.jsx (Inject Chat Modal)
let customerProfile = fs.readFileSync('src/modules/ecommerce/pages/CustomerProfile.jsx', 'utf8');

if (!customerProfile.includes('Modal de Chat de Resolución')) {
  customerProfile = customerProfile.replace(
    `{/* RATING MODAL */}`,
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
                        <img src={msg.imageUrl} alt="Evidencia" className="mt-2 rounded-xl max-w-full h-auto max-h-64 object-cover cursor-pointer border border-black/20" onClick={() => window.open(msg.imageUrl, '_blank')} />
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
                <button type="submit" disabled={isSendingChat || (!chatInput.trim() && !chatImage) || activeChatOrder?.paymentStatus === 'approved' || activeChatOrder?.paymentStatus === 'fraud'} className="p-3 bg-amber-500 text-black rounded-xl hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md shadow-amber-500/20">
                  {isSendingChat ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* RATING MODAL */}`
  );
  fs.writeFileSync('src/modules/ecommerce/pages/CustomerProfile.jsx', customerProfile, 'utf8');
  console.log('CustomerProfile.jsx updated');
}

// 2. Fix SupportManager.jsx (Empty Inbox logic)
let supportManager = fs.readFileSync('src/modules/ecommerce/pages/SupportManager.jsx', 'utf8');

supportManager = supportManager.replace(
  `const chatOrders = data.filter(order => {
          try {
            const history = typeof order.chat_history === 'string' ? JSON.parse(order.chat_history) : (order.chat_history || []);
            return Array.isArray(history) && history.length > 0;
          } catch(e) {
            return false;
          }
        });`,
  `const chatOrders = data.filter(order => {
          if (order.paymentStatus === 'review' || order.paymentStatus === 'fraud') return true;
          try {
            const history = typeof order.chat_history === 'string' ? JSON.parse(order.chat_history) : (order.chat_history || []);
            return Array.isArray(history) && history.length > 0;
          } catch(e) {
            return false;
          }
        });`
);

supportManager = supportManager.replace(
  `const lastA = new Date(historyA[historyA.length - 1].timestamp).getTime();
           const lastB = new Date(historyB[historyB.length - 1].timestamp).getTime();`,
  `const lastA = historyA.length > 0 ? new Date(historyA[historyA.length - 1].timestamp).getTime() : new Date(a.date || 0).getTime();
           const lastB = historyB.length > 0 ? new Date(historyB[historyB.length - 1].timestamp).getTime() : new Date(b.date || 0).getTime();`
);

supportManager = supportManager.replace(
  `const lastMessage = history[history.length - 1];
              const isUnreadCustomer = lastMessage.sender === 'customer';`,
  `const lastMessage = history.length > 0 ? history[history.length - 1] : { sender: 'system', text: 'Chat iniciado.', timestamp: order.date || new Date().toISOString() };
              const isUnreadCustomer = lastMessage.sender === 'customer';`
);

fs.writeFileSync('src/modules/ecommerce/pages/SupportManager.jsx', supportManager, 'utf8');
console.log('SupportManager.jsx updated');
