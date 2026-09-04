import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Send, MessageSquare, X, User, Building } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import logoAxon from '../logo/logo-sin-fondo.png';

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
    <div className="flex flex-col h-full bg-slate-50/95 dark:bg-zinc-950/95 backdrop-blur-2xl border-l border-slate-200/50 dark:border-zinc-800/50 shadow-2xl relative overflow-hidden">
      {/* Glow background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-3xl rounded-full pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-200/50 dark:border-zinc-800/50 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="p-1.5 bg-gradient-to-tr from-zinc-800 to-zinc-950 rounded-xl shadow-lg shadow-amber-500/20 border border-amber-500/30">
              <img src={logoAxon} alt="Axon Logo" className="h-6 w-auto object-contain brightness-150 drop-shadow-[0_0_5px_rgba(212,175,55,0.5)]" />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-white dark:border-zinc-900"></span>
            </span>
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-white tracking-tight leading-none mb-1">
              {currentUserType === 'client' ? 'Soporte Agencia' : 'Cliente'}
            </h3>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-zinc-800/50 rounded-xl transition-all">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar z-10">
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
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-auto shadow-sm border overflow-hidden",
                      isAgency ? "bg-gradient-to-tr from-zinc-800 to-zinc-950 border-amber-500/50 p-1" : "bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-zinc-700"
                    )}>
                      {isAgency ? <img src={logoAxon} alt="Axon" className="h-full w-full object-contain brightness-150" /> : <User size={14} />}
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
                        ? "bg-gradient-to-br from-amber-500 to-yellow-600 text-zinc-950 font-medium rounded-2xl rounded-br-sm shadow-amber-500/20" 
                        : "bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md text-slate-800 dark:text-slate-100 rounded-2xl rounded-bl-sm border border-slate-200/50 dark:border-zinc-700/50"
                    )}>
                      {msg.text}
                    </div>
                  </div>

                  {isMe && (
                    <div className={cx(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-auto shadow-sm border overflow-hidden",
                      isAgency ? "bg-gradient-to-tr from-zinc-800 to-zinc-950 border-amber-500/50 p-1" : "bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-zinc-700"
                    )}>
                      {isAgency ? <img src={logoAxon} alt="Axon" className="h-full w-full object-contain brightness-150" /> : <User size={14} />}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-5 border-t border-slate-200/50 dark:border-zinc-800/50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div className="relative flex items-center group">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe tu mensaje aquí..."
            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 group-hover:border-amber-500/50 rounded-full py-4 pl-6 pr-14 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 shadow-inner dark:shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] transition-all duration-300"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="absolute right-1.5 p-3 bg-gradient-to-tr from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:via-amber-400 hover:to-amber-500 text-zinc-950 rounded-full disabled:opacity-30 transition-all duration-300 shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:shadow-[0_0_25px_rgba(245,158,11,0.6)] group-focus-within:scale-105 group-focus-within:shadow-[0_0_20px_rgba(245,158,11,0.5)]"
          >
            <Send size={18} className={cx(isSending ? "animate-pulse" : "transform translate-x-px -translate-y-px", "drop-shadow-sm")} />
          </button>
        </div>
      </form>
    </div>
  );
}
