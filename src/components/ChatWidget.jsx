import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Send, MessageSquare, X, User, Building } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cx(...inputs) {
  return twMerge(clsx(inputs));
}

export function ChatWidget({ projectId, initialMessages = [], currentUserType = 'client', onClose }) {
  const [messages, setMessages] = useState(initialMessages);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Subscribe to realtime updates for this specific project
    const channel = supabase
      .channel(`chat_${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sdd_projects',
          filter: `id=eq.${projectId}`
        },
        (payload) => {
          if (payload.new && payload.new.messages) {
            setMessages(payload.new.messages);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const messageObj = {
        id: crypto.randomUUID(),
        sender: currentUserType,
        text: newMessage.trim(),
        timestamp: new Date().toISOString()
      };

      const updatedMessages = [...messages, messageObj];

      // Update locally immediately for better UX
      setMessages(updatedMessages);
      setNewMessage('');

      const { error } = await supabase
        .from('sdd_projects')
        .update({ messages: updatedMessages })
        .eq('id', projectId);

      if (error) {
        throw error;
      }
    } catch (err) {
      console.error("Error enviando mensaje:", err);
      alert("Error al enviar el mensaje: " + (err.message || JSON.stringify(err)));
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-xl border-l border-slate-200/50 dark:border-slate-800/50 shadow-2xl relative">
      {/* Glow background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-500 to-purple-500 text-white rounded-xl shadow-lg shadow-indigo-500/30">
              <MessageSquare size={20} />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-white dark:border-slate-900"></span>
            </span>
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-white tracking-tight leading-none mb-1">
              {currentUserType === 'client' ? 'Soporte Agencia' : 'Cliente'}
            </h3>
            <span className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase tracking-widest flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div> Sistema en línea
            </span>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-xl transition-all">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar z-10">
        {messages.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-4"
          >
            <div className="relative">
              <motion.div 
                animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="absolute -inset-4 bg-gradient-to-r from-indigo-500 to-purple-500 blur-xl rounded-full"
              ></motion.div>
              <div className="p-5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-full relative shadow-sm">
                <MessageSquare size={32} className="text-indigo-500 dark:text-indigo-400" />
              </div>
            </div>
            <div className="text-center">
              <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Centro de Soporte</h4>
              <p className="text-xs max-w-[200px] text-slate-500 mx-auto">La conversación está vacía. Escribe un mensaje abajo para iniciar.</p>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => {
              const isMe = msg.sender === currentUserType;
              const isAgency = msg.sender === 'agency';
              
              return (
                <motion.div 
                  key={msg.id} 
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25, mass: 0.8 }}
                  className={cx(
                    "flex w-full gap-3", 
                    isMe ? "justify-end" : "justify-start"
                  )}
                >
                  {!isMe && (
                    <div className={cx(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-auto shadow-sm border",
                      isAgency ? "bg-gradient-to-tr from-indigo-600 to-purple-600 text-white border-indigo-400" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                    )}>
                      {isAgency ? <Building size={14} /> : <User size={14} />}
                    </div>
                  )}

                  <div className={cx("flex flex-col max-w-[75%]", isMe ? "items-end" : "items-start")}>
                    <div className="flex items-center gap-2 mb-1.5 px-1">
                      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        {isAgency ? 'AGENCIA' : 'CLIENTE'}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium">{formatTime(msg.timestamp)}</span>
                    </div>
                    <div className={cx(
                      "p-4 text-sm relative shadow-md leading-relaxed",
                      isMe 
                        ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl rounded-br-sm shadow-indigo-500/20" 
                        : "bg-white/80 dark:bg-slate-800/80 backdrop-blur-md text-slate-800 dark:text-slate-100 rounded-2xl rounded-bl-sm border border-slate-200/50 dark:border-slate-700/50"
                    )}>
                      {msg.text}
                    </div>
                  </div>

                  {isMe && (
                    <div className={cx(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-auto shadow-sm border",
                      isAgency ? "bg-gradient-to-tr from-indigo-600 to-purple-600 text-white border-indigo-400" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                    )}>
                      {isAgency ? <Building size={14} /> : <User size={14} />}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-5 border-t border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md z-10">
        <div className="relative flex items-center group">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-full py-3.5 pl-5 pr-14 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 shadow-sm transition-all"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="absolute right-1.5 p-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-full disabled:opacity-50 transition-all shadow-md group-focus-within:scale-105"
          >
            <Send size={16} className={isSending ? "animate-pulse" : "transform translate-x-px -translate-y-px"} />
          </button>
        </div>
      </form>
    </div>
  );
}
