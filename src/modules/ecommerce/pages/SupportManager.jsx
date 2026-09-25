import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, MessageSquare, AlertCircle, Check, X, CheckCircle2, User, Clock, Image as ImageIcon, Send, Loader2, Info, Phone, CheckCheck } from 'lucide-react';
import { io } from 'socket.io-client';

export default function SupportManager() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState(null);
  
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatImage, setChatImage] = useState(null);
  const [chatImageFile, setChatImageFile] = useState(null);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const chatScrollRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }, 100);
  };

  const workspaceId = localStorage.getItem('activeWorkspace') || 'default_workspace';

  const fetchOrders = async () => {
    try {
      const res = await fetch(`https://axonmarket-api.onrender.com/api/ecommerce/orders?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        // Filtrar órdenes que tengan chat_history con mensajes
        const chatOrders = data.filter(order => {
          if (order.paymentStatus === 'review' || order.paymentStatus === 'fraud') return true;
          try {
            const history = typeof order.chat_history === 'string' ? JSON.parse(order.chat_history) : (order.chat_history || []);
            return Array.isArray(history) && history.length > 0;
          } catch(e) {
            return false;
          }
        });
        
        // Ordenar por fecha del último mensaje
        chatOrders.sort((a, b) => {
           const historyA = typeof a.chat_history === 'string' ? JSON.parse(a.chat_history) : a.chat_history;
           const historyB = typeof b.chat_history === 'string' ? JSON.parse(b.chat_history) : b.chat_history;
           const lastA = historyA.length > 0 ? new Date(historyA[historyA.length - 1].timestamp).getTime() : new Date(a.date || 0).getTime();
           const lastB = historyB.length > 0 ? new Date(historyB[historyB.length - 1].timestamp).getTime() : new Date(b.date || 0).getTime();
           return lastB - lastA;
        });

        setOrders(chatOrders);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const socket = io('https://axonmarket-api.onrender.com');
    const workspaceId = localStorage.getItem('activeWorkspace');
    if (workspaceId) {
      socket.emit('join_workspace', workspaceId);
      socket.on('order_updated', () => {
        fetchOrders();
      });
    }
    return () => socket.disconnect();
  }, []);
  
  useEffect(() => {
    if (!activeChat) return;
    
    const socket = io('https://axonmarket-api.onrender.com');
    socket.emit('join_chat', activeChat.id);
    
    socket.on('new_message', (msg) => {
      setChatMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      scrollToBottom();
      fetchOrders(); // Refresh order list silently to update last message preview
      if (msg.sender === 'customer') {
        fetch(`https://axonmarket-api.onrender.com/api/ecommerce/orders/${activeChat.id}/chat/read`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ reader: 'merchant' })
        }).catch(()=>{});
      }
    });

    socket.on('typing', ({ sender }) => {
      if (sender === 'customer') {
        setIsTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
        scrollToBottom();
      }
    });

    socket.on('messages_read', ({ reader }) => {
      if (reader === 'customer') {
        setChatMessages(prev => prev.map(m => m.sender === 'merchant' ? { ...m, read: true } : m));
      }
    });
    
    return () => socket.disconnect();
  }, [activeChat]);

  const handleTyping = (e) => {
    setChatInput(e.target.value);
    if (activeChat) {
      const socket = io('https://axonmarket-api.onrender.com');
      socket.emit('typing', { orderId: activeChat.id, sender: 'merchant' });
      socket.disconnect();
    }
  };

  const openChat = (order) => {
    setActiveChat(order);
    fetchChatMessages(order.id);
  };

  const fetchChatMessages = async (orderId) => {
    try {
      const res = await fetch(`https://axonmarket-api.onrender.com/api/ecommerce/orders/${orderId}/chat`);
      if(res.ok) {
        const data = await res.json();
        setChatMessages(data);
        scrollToBottom();
        // Mark as read
        fetch(`https://axonmarket-api.onrender.com/api/ecommerce/orders/${orderId}/chat/read`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ reader: 'merchant' })
        }).catch(()=>{});
      }
    } catch(e) {}
  };

  const sendChatMessage = async (e) => {
    e?.preventDefault();
    if(!chatInput.trim() && !chatImage) return;
    setIsSendingChat(true);
    try {
      let finalImageUrl = null;
      if (chatImageFile) {
        const formData = new FormData();
        formData.append('image', chatImageFile);
        const uploadRes = await fetch('https://axonmarket-api.onrender.com/api/upload', { method: 'POST', body: formData });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          finalImageUrl = 'https://axonmarket-api.onrender.com' + uploadData.url;
        }
      }

      const tempId = Date.now().toString();
      const optimisticMsg = {
        id: tempId,
        sender: 'merchant',
        text: chatInput,
        imageUrl: finalImageUrl || chatImage,
        timestamp: new Date().toISOString(),
        read: false
      };
      
      setChatMessages(prev => [...prev, optimisticMsg]);
      setChatInput('');
      setChatImage(null);
      setChatImageFile(null);
      scrollToBottom();

      const res = await fetch(`https://axonmarket-api.onrender.com/api/ecommerce/orders/${activeChat.id}/chat`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ sender: 'merchant', text: optimisticMsg.text, imageUrl: finalImageUrl, id: tempId })
      });
      if(res.ok) {
        const data = await res.json();
        setChatMessages(prev => prev.map(m => m.id === tempId ? data.message : m));
        fetchOrders();
      }
    } catch(err) {
      console.error(err);
    }
    setIsSendingChat(false);
  };

  const handleChatImageUpload = (e) => {
    const file = e.target.files[0];
    if(file) {
      setChatImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setChatImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const verifyPayment = async (orderId, action) => {
    if (!window.confirm(`¿Estás seguro de ${action === 'approve' ? 'APROBAR' : 'DENUNCIAR'} este pago?`)) return;
    
    let newStatus = 'approved';
    if(action === 'review') newStatus = 'review';
    else if(action === 'fraud') newStatus = 'fraud';

    try {
      const res = await fetch(`https://axonmarket-api.onrender.com/api/ecommerce/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: newStatus })
      });
      
      if(res.ok) {
        // Añadimos un mensaje bot automático sobre la resolución
        let botText = action === 'approve' 
          ? '✅ Resolución: El comercio ha verificado las pruebas y ha Aprobado su pago exitosamente. Su orden será procesada.'
          : '🚨 Resolución: El comercio ha rechazado las pruebas y ha marcado esta transacción como Fraude. Su orden ha sido cancelada.';
          
        await fetch(`https://axonmarket-api.onrender.com/api/ecommerce/orders/${orderId}/chat`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ sender: 'merchant', text: botText })
        });
        
        setActiveChat(prev => ({ ...prev, paymentStatus: newStatus }));
        fetchChatMessages(orderId);
        fetchOrders();
        alert(action === 'approve' ? 'Pago aprobado exitosamente.' : 'Fraude reportado.');
      }
    } catch (e) {
      console.error(e);
      alert('Error al actualizar.');
    }
  };

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (o.customer?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-violet-500" size={32} /></div>;
  }

  return (
    <div className="h-[calc(100dvh-80px)] flex flex-col md:flex-row bg-slate-50 dark:bg-black p-4 gap-4">
      {/* Panel Izquierdo: Lista de Chats */}
      <div className={`w-full md:w-1/3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-sm ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
            <MessageSquare className="text-violet-500" /> Centro de Soporte
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por orden o cliente..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-950 border-none rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-slate-800 dark:text-white"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <MessageSquare size={48} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No hay chats activos o disputas en curso.</p>
            </div>
          ) : (
            filteredOrders.map(order => {
              const history = typeof order.chat_history === 'string' ? JSON.parse(order.chat_history) : order.chat_history;
              const lastMessage = history.length > 0 ? history[history.length - 1] : { sender: 'system', text: 'Chat iniciado.', timestamp: order.date || new Date().toISOString() };
              const isUnreadCustomer = lastMessage.sender === 'customer'; // Simple heuristic
              
              return (
                <div 
                  key={order.id} 
                  onClick={() => openChat(order)}
                  className={`p-4 border-b border-slate-100 dark:border-slate-800/50 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 flex flex-col gap-2 ${activeChat?.id === order.id ? 'bg-violet-50 dark:bg-violet-900/20' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-500">{order.id}</span>
                      {order.paymentStatus === 'review' && <span className="bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 text-[10px] px-2 py-0.5 rounded-full font-bold">Disputa</span>}
                    </div>
                    <span className="text-[10px] text-slate-400">{new Date(lastMessage.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white line-clamp-1">{order.customer?.name || 'Cliente'}</h3>
                  <div className="flex items-center gap-2">
                    {lastMessage.imageUrl && <ImageIcon size={14} className="text-slate-400 shrink-0" />}
                    <p className={`text-xs line-clamp-1 ${isUnreadCustomer ? 'text-slate-800 dark:text-white font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                      {lastMessage.sender === 'merchant' ? 'Tú: ' : ''}{lastMessage.text || 'Imagen enviada'}
                    </p>
                    {isUnreadCustomer && <span className="w-2 h-2 rounded-full bg-violet-500 ml-auto shrink-0"></span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Panel Derecho: Chat Activo */}
      <div className={`w-full md:flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden flex-col shadow-sm ${!activeChat ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
        {!activeChat ? (
          <div className="text-center text-slate-400 p-8">
            <MessageSquare size={64} className="mx-auto mb-4 opacity-20" />
            <h2 className="text-xl font-bold text-slate-600 dark:text-slate-300 mb-2">Bandeja de Soporte y Disputas</h2>
            <p className="text-sm">Selecciona una conversación del panel izquierdo para comenzar a chatear con el cliente y resolver problemas.</p>
          </div>
        ) : (
          <>
            {/* Cabecera del Chat */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveChat(null)} className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 dark:hover:text-white">
                  <X size={20} />
                </button>
                <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                  {(activeChat.customer?.name || 'C')[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    {activeChat.customer?.name || 'Cliente'} 
                    {activeChat.paymentStatus === 'review' && <span className="bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><AlertCircle size={10}/> Revisión</span>}
                    {activeChat.paymentStatus === 'fraud' && <span className="bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><AlertCircle size={10}/> Fraude</span>}
                    {activeChat.paymentStatus === 'approved' && <span className="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><CheckCircle2 size={10}/> Aprobado</span>}
                  </h3>
                  <p className="text-xs font-mono text-slate-500 mt-0.5 flex items-center gap-2">Orden: {activeChat.id} {activeChat.customer_phone && <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-800 px-1.5 rounded"><Phone size={10} /> {activeChat.customer_phone}</span>}</p>
                </div>
              </div>
              
              {/* Botones de Acción Rápida Anti-Fraude */}
              {activeChat.paymentStatus === 'review' && (
                <div className="flex gap-2">
                  <button onClick={() => verifyPayment(activeChat.id, 'approve')} title="Aprobar Pago" className="p-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 rounded-lg transition-colors flex items-center gap-1">
                    <Check size={18} /> <span className="hidden lg:inline text-xs font-bold">Aprobar</span>
                  </button>
                  <button onClick={() => verifyPayment(activeChat.id, 'fraud')} title="Denunciar Fraude" className="p-2 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg transition-colors flex items-center gap-1">
                    <AlertCircle size={18} /> <span className="hidden lg:inline text-xs font-bold">Fraude</span>
                  </button>
                </div>
              )}
            </div>
            
            {/* Cuerpo del Chat */}
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 dark:bg-black/20">
              {chatMessages.length === 0 ? (
                <div className="text-center text-slate-400 dark:text-slate-500 text-sm py-10 italic">Cargando mensajes...</div>
              ) : (
                chatMessages.map((msg, i) => {
                  const isMerchant = msg.sender === 'merchant';
                  const isBotMsg = msg.text.includes('Alerta de Seguridad') || msg.text.includes('Resolución:');
                  return (
                    <div key={msg.id || i} className={`flex flex-col max-w-[85%] ${isMerchant ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                      <div className={`p-3.5 rounded-2xl text-sm shadow-sm ${
                        isMerchant 
                          ? (isBotMsg ? 'bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-200 rounded-tr-none border border-orange-500/20' : 'bg-violet-600 text-white rounded-tr-none') 
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-tl-none'
                      }`}>
                        {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                        {msg.imageUrl && (
                          <img src={msg.imageUrl} alt="Evidencia" className="mt-3 rounded-xl max-w-full h-auto max-h-64 object-cover cursor-pointer border border-black/10 hover:opacity-90 transition-opacity" onClick={() => window.open(msg.imageUrl, '_blank')} />
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1 mx-1">
                        <span className="text-[10px] text-slate-400">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        {isMerchant && !isBotMsg && (
                          <CheckCheck size={12} className={msg.read ? 'text-blue-500' : 'text-slate-400'} />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              {isTyping && (
                <div className="mr-auto flex items-center gap-2 p-3.5 bg-white dark:bg-slate-800 text-slate-500 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-700 text-sm w-fit">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                  </div>
                </div>
              )}
            </div>

            {/* Input de Mensaje */}
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
                  <ImageIcon size={22} />
                </label>
                <textarea 
                  value={chatInput} 
                  onChange={handleTyping} 
                  placeholder="Escribe una respuesta al cliente..." 
                  className="flex-1 max-h-32 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none text-slate-800 dark:text-white"
                  rows="1"
                  onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                />
                <button type="submit" disabled={isSendingChat || (!chatInput.trim() && !chatImage) || activeChat.paymentStatus === 'approved' || activeChat.paymentStatus === 'fraud'} className="p-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md shadow-violet-500/20">
                  {isSendingChat ? <Loader2 size={22} className="animate-spin" /> : <Send size={22} />}
                </button>
              </form>
              {(activeChat.paymentStatus === 'approved' || activeChat.paymentStatus === 'fraud') && (
                <div className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
                  Esta orden ya ha sido {activeChat.paymentStatus === 'approved' ? 'aprobada' : 'cancelada'}. Puedes seguir enviando mensajes pero el estado de la orden está cerrado.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
