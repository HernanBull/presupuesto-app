import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { ArrowLeft, MessageSquare, Image as ImageIcon, Send, X, Store, Check, CheckCheck, Loader2, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CustomerChatsPage() {
  const navigate = useNavigate();
  const [currentCustomer, setCurrentCustomer] = useState(null);
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Chat state
  const [activeChatOrder, setActiveChatOrder] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatImage, setChatImage] = useState(null);
  const [chatImageFile, setChatImageFile] = useState(null);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatScrollRef = useRef(null);

  useEffect(() => {
    const savedCustomer = localStorage.getItem('ecommerce_current_customer');
    if (savedCustomer) {
      const parsed = JSON.parse(savedCustomer);
      setCurrentCustomer(parsed);
      fetchOrders(parsed.email);
    } else {
      navigate('/');
    }
  }, [navigate]);

  const fetchOrders = async (email) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ecommerce_orders_v2')
        .select('*')
        .eq('customer_email', email)
        .order('date', { ascending: false });

      if (!error && data) {
        const mappedOrders = data.map(order => ({
          ...order,
          date: new Date(order.date).toLocaleString(),
          paymentStatus: order.paymentstatus,
          chat_history: typeof order.chat_history === 'string' ? JSON.parse(order.chat_history) : (order.chat_history || [])
        }));
        
        // Sort orders so those with recent chat messages appear first
        mappedOrders.sort((a, b) => {
          const getValidTime = (order) => {
            if (order.chat_history && order.chat_history.length > 0) {
              const last = order.chat_history[order.chat_history.length - 1];
              return last.timestamp ? new Date(last.timestamp).getTime() : new Date(order.date).getTime();
            }
            return new Date(order.date).getTime();
          };
          return getValidTime(b) - getValidTime(a);
        });

        setOrders(mappedOrders);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!currentCustomer?.email) return;
    const channel = supabase.channel('support_orders_updates_chat')
      .on('broadcast', { event: 'order_updated' }, () => {
        if (!activeChatOrder) fetchOrders(currentCustomer.email);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentCustomer?.email, activeChatOrder]);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }, 100);
  };

  const fetchChatMessages = async (orderId) => {
    try {
      const { data, error } = await supabase
        .from('ecommerce_orders_v2')
        .select('chat_history')
        .eq('id', orderId)
        .single();
      if (!error && data) {
        let history = typeof data.chat_history === 'string' ? JSON.parse(data.chat_history) : (data.chat_history || []);
        
        // Mark merchant messages as read
        let updated = false;
        const newHistory = history.map(m => {
          if (m.sender === 'merchant' && !m.read) {
            updated = true;
            return { ...m, read: true };
          }
          return m;
        });

        if (updated) {
          await supabase.from('ecommerce_orders_v2').update({ chat_history: JSON.stringify(newHistory) }).eq('id', orderId);
        }
        
        setChatMessages(newHistory);
        scrollToBottom();
      }
    } catch(e) { console.error(e); }
  };

  const openChat = (order) => {
    setActiveChatOrder(order);
    fetchChatMessages(order.id);
  };

  const closeChat = () => {
    setActiveChatOrder(null);
    fetchOrders(currentCustomer.email); // Refresh the list to get updated last messages
  };

  useEffect(() => {
    if (!activeChatOrder) return;
    
    const channel = supabase.channel(`chat_${activeChatOrder.id}`)
      .on('broadcast', { event: 'chat_updated' }, (payload) => {
        if (payload.payload && payload.payload.history) {
          const history = payload.payload.history;
          setChatMessages(history);
          scrollToBottom();
          
          // Mark as read logic
          const unreadMerchant = history.some(m => m.sender === 'merchant' && !m.read);
          if (unreadMerchant) {
             const marked = history.map(m => (m.sender === 'merchant' && !m.read) ? { ...m, read: true } : m);
             supabase.from('ecommerce_orders_v2').update({ chat_history: JSON.stringify(marked) }).eq('id', activeChatOrder.id).then(()=>{});
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeChatOrder]);

  const sendChatMessage = async (e) => {
    e?.preventDefault();
    if(!chatInput.trim() && !chatImage) return;
    setIsSendingChat(true);
    try {
      let finalImageUrl = null;
      if (chatImageFile) {
        const fileExt = chatImageFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `chat/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('ecommerce').upload(filePath, chatImageFile);
        if (!uploadError) {
          const { data } = supabase.storage.from('ecommerce').getPublicUrl(filePath);
          if (data && data.publicUrl) finalImageUrl = data.publicUrl;
        }
      }

      const tempId = Date.now().toString();
      const optimisticMsg = {
        id: tempId,
        sender: 'customer',
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

      const { data: orderData } = await supabase.from('ecommerce_orders_v2').select('chat_history').eq('id', activeChatOrder.id).single();
      let currentHistory = [];
      if (orderData && orderData.chat_history) {
        currentHistory = typeof orderData.chat_history === 'string' ? JSON.parse(orderData.chat_history) : orderData.chat_history;
      }
      
      const updatedHistory = [...currentHistory, optimisticMsg];
      
      const { error: updateError } = await supabase
        .from('ecommerce_orders_v2')
        .update({ chat_history: JSON.stringify(updatedHistory) })
        .eq('id', activeChatOrder.id);
        
      if (!updateError) {
        supabase.channel(`chat_${activeChatOrder.id}`).send({
          type: 'broadcast',
          event: 'chat_updated',
          payload: { history: updatedHistory }
        });
        
        supabase.channel('support_orders_updates').send({
          type: 'broadcast',
          event: 'order_updated',
          payload: { orderId: activeChatOrder.id }
        });
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

  if (!currentCustomer) return null;

  const filteredOrders = orders.filter(o => o.id.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="h-screen w-screen bg-black flex flex-col font-sans overflow-hidden fixed inset-0 z-[100]">
      
      <AnimatePresence mode="wait">
        {!activeChatOrder ? (
          /* VISTA A: BANDEJA DE ENTRADA (INBOX) */
          <motion.div 
            key="inbox"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ type: 'tween', duration: 0.2 }}
            className="flex-1 flex flex-col w-full h-full bg-zinc-950"
          >
            {/* Header del Inbox */}
            <div className="bg-zinc-900 border-b border-white/5 pt-safe-top">
              <div className="h-16 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => navigate('/')} className="p-2 text-zinc-400 hover:text-white transition-colors rounded-full active:bg-white/10">
                    <ArrowLeft size={24} />
                  </button>
                  <h1 className="text-xl font-bold text-white tracking-wide">Chats</h1>
                </div>
              </div>
              <div className="px-4 pb-4">
                <div className="bg-zinc-950 border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-2 focus-within:border-amber-500 transition-colors">
                  <Search size={18} className="text-zinc-500" />
                  <input 
                    type="text" 
                    placeholder="Buscar por número de orden..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none text-white w-full text-sm focus:outline-none placeholder:text-zinc-600"
                  />
                </div>
              </div>
            </div>

            {/* Lista de Chats */}
            <div className="flex-1 overflow-y-auto bg-black scrollbar-hide pb-safe-bottom">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 size={32} className="text-amber-500 animate-spin" />
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-white/5">
                    <MessageSquare size={32} className="text-zinc-700" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">No tienes chats activos</h3>
                  <p className="text-zinc-500 text-sm">Tus conversaciones con las tiendas aparecerán aquí cuando realices un pedido.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {filteredOrders.map(order => {
                    let unreadCount = 0;
                    let lastMessage = 'Tap para iniciar el chat';
                    let lastTime = new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    
                    if (order.chat_history && order.chat_history.length > 0) {
                      const history = order.chat_history;
                      unreadCount = history.filter(m => m.sender === 'merchant' && !m.read).length;
                      const lastMsg = history[history.length - 1];
                      lastMessage = lastMsg.text || '📷 Imagen adjunta';
                      if (lastMsg.timestamp) {
                         lastTime = new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      }
                    }

                    return (
                      <div 
                        key={order.id} 
                        onClick={() => openChat(order)}
                        className="px-4 py-4 flex items-center gap-4 active:bg-zinc-900 transition-colors cursor-pointer"
                      >
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex-shrink-0 flex items-center justify-center border border-white/10 relative">
                          <Store size={24} className="text-amber-500" />
                          {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-black text-[11px] font-black flex items-center justify-center rounded-full border-2 border-black">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-white font-bold text-base truncate">Orden #{order.id.slice(-6)}</h4>
                            <span className="text-[11px] font-medium text-zinc-500 flex-shrink-0 ml-2">{lastTime}</span>
                          </div>
                          
                          <div className="flex items-center justify-between gap-4">
                            <p className={`text-sm truncate ${unreadCount > 0 ? 'text-white font-medium' : 'text-zinc-500'}`}>
                              {lastMessage}
                            </p>
                            {order.paymentStatus === 'review' && (
                              <span className="bg-orange-500/20 text-orange-400 text-[9px] font-bold uppercase px-2 py-0.5 rounded flex-shrink-0 border border-orange-500/20">
                                Revisión
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          /* VISTA B: VENTANA DE CHAT (FULL SCREEN) */
          <motion.div 
            key="chatWindow"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ type: 'tween', duration: 0.2 }}
            className="flex-1 flex flex-col w-full h-full bg-[#0a0a0a]"
          >
            {/* Header del Chat */}
            <div className="bg-zinc-900 border-b border-white/5 pt-safe-top shadow-md z-10">
              <div className="h-16 px-2 flex items-center gap-3">
                <button onClick={closeChat} className="p-2 text-amber-500 hover:text-amber-400 transition-colors rounded-full active:bg-white/10 flex items-center">
                  <ArrowLeft size={24} />
                  <div className="w-10 h-10 rounded-full bg-zinc-800 ml-1 flex items-center justify-center border border-white/10">
                    <Store size={18} className="text-amber-500" />
                  </div>
                </button>
                
                <div className="flex-1 min-w-0 pr-4">
                  <h2 className="text-white font-bold text-base truncate leading-tight">Orden #{activeChatOrder.id.slice(-6)}</h2>
                  <p className="text-zinc-400 text-xs truncate">
                    {activeChatOrder.paymentStatus === 'review' ? (
                      <span className="text-orange-400 font-medium">Soporte y Apelaciones</span>
                    ) : (
                      'Chat con la Tienda'
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Mensajes */}
            <div 
              ref={chatScrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 pb-safe-bottom bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed"
              style={{ backgroundBlendMode: 'overlay', backgroundColor: '#050505' }}
            >
              <div className="text-center my-6">
                <span className="bg-zinc-900 text-zinc-400 text-xs font-bold px-3 py-1 rounded-full border border-white/5 shadow-sm">
                  {new Date(activeChatOrder.date).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>
              
              {activeChatOrder.paymentStatus === 'review' && (
                <div className="bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs p-3 rounded-2xl mb-4 text-center mx-4 font-medium shadow-sm">
                  🔒 Este pago requiere verificación. Envía el comprobante original o detalles del titular para procesarlo.
                </div>
              )}

              {chatMessages.length === 0 && (
                <div className="text-center text-zinc-500 text-sm mt-10">
                  <MessageSquare size={32} className="mx-auto text-zinc-800 mb-3" />
                  Envía un mensaje para iniciar la conversación
                </div>
              )}

              {chatMessages.map((msg, idx) => {
                const isCustomer = msg.sender === 'customer';
                const showTail = idx === chatMessages.length - 1 || chatMessages[idx + 1].sender !== msg.sender;
                
                return (
                  <div key={msg.id} className={`flex ${isCustomer ? 'justify-end' : 'justify-start'} mb-1`}>
                    <div className={`max-w-[80%] md:max-w-[60%] flex flex-col relative ${
                      isCustomer 
                        ? 'bg-amber-600 text-white rounded-2xl rounded-tr-sm' 
                        : 'bg-zinc-800 text-zinc-100 rounded-2xl rounded-tl-sm border border-white/5'
                    } ${showTail ? 'mb-2' : ''} shadow-sm`}
                    >
                      {msg.imageUrl && (
                        <div className="p-1">
                          <img src={msg.imageUrl} alt="Adjunto" className="w-full rounded-xl object-cover" style={{ maxHeight: '250px' }} />
                        </div>
                      )}
                      
                      {msg.text && (
                        <div className="px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed">
                          {msg.text}
                        </div>
                      )}
                      
                      <div className={`flex items-center justify-end gap-1 px-3 pb-1.5 pt-0 text-[10px] ${isCustomer ? 'text-amber-200' : 'text-zinc-500'}`}>
                        <span>{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        {isCustomer && (
                          msg.read ? <CheckCheck size={14} className="text-blue-300" /> : <Check size={14} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input de Chat */}
            <div className="bg-zinc-900 border-t border-white/5 p-2 pb-safe-bottom z-10 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
              {chatImage && (
                <div className="px-4 py-3 bg-zinc-950 border-b border-white/5 flex items-start gap-3">
                  <div className="relative">
                    <img src={chatImage} alt="Preview" className="h-20 w-20 object-cover rounded-xl border border-white/10 shadow-lg" />
                    <button onClick={() => { setChatImage(null); setChatImageFile(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}
              
              <form onSubmit={sendChatMessage} className="flex items-end gap-2 px-2 py-1">
                <div className="flex-1 bg-zinc-950 border border-white/10 rounded-3xl flex items-end min-h-[44px] shadow-inner relative">
                  <label className="p-3 text-zinc-400 hover:text-amber-500 cursor-pointer transition-colors active:scale-95 flex-shrink-0">
                    <ImageIcon size={22} />
                    <input type="file" accept="image/*" className="hidden" onChange={handleChatImageUpload} />
                  </label>
                  
                  <textarea 
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 bg-transparent border-none text-white text-[15px] focus:outline-none resize-none py-3 px-1 max-h-32 min-h-[44px] leading-tight"
                    rows={1}
                    onInput={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = (e.target.scrollHeight) + 'px';
                    }}
                    onKeyDown={(e) => {
                      if(e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendChatMessage(e);
                      }
                    }}
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={isSendingChat || (!chatInput.trim() && !chatImage)}
                  className="w-11 h-11 bg-amber-500 text-black rounded-full flex items-center justify-center flex-shrink-0 shadow-lg hover:bg-amber-400 transition-all disabled:opacity-50 disabled:scale-100 active:scale-90"
                >
                  {isSendingChat ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="ml-0.5" />}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
