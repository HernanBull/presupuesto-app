import React, { useState, useEffect } from 'react';
import { Package, Clock, CheckCircle2, ChevronRight, CheckSquare, Square, Printer, Box, ShieldCheck, MapPin, ScanBarcode, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../presupuesto/utils/supabaseClient';
import { sendDeliveryRequest } from '../../delivery/utils/telegramService';

export default function OrderPreparation() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar pedidos desde el backend
  useEffect(() => {
    fetch('http://localhost:3001/api/ecommerce/orders')
      .then(res => res.json())
      .then(data => {
        setOrders(data || []);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error fetching orders:', err);
        setOrders([]);
        setIsLoading(false);
      });
  }, []);

  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // Auto-select first preparing order when loaded
  useEffect(() => {
    if (!isLoading && !selectedOrderId) {
      const pendingOrders = orders.filter(o => o.status === 'Preparando');
      if (pendingOrders.length > 0) {
        setSelectedOrderId(pendingOrders[0].id);
      }
    }
  }, [isLoading, orders, selectedOrderId]);
  const [channel, setChannel] = useState(null);

  // Setup Realtime Subscription
  useEffect(() => {
    // Create a Supabase channel for picking synchronization
    const pickingChannel = supabase.channel('picking-sync', {
      config: {
        broadcast: { ack: false },
      },
    });

    pickingChannel
      .on('broadcast', { event: 'UPDATE_ORDERS' }, (payload) => {
        // Update local state when a broadcast message is received
        if (payload.payload) {
          setOrders(payload.payload);
        }
      })
      .subscribe();

    setChannel(pickingChannel);

    return () => {
      pickingChannel.unsubscribe();
    };
  }, []);

  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  const broadcastUpdate = (newOrders) => {
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'UPDATE_ORDERS',
        payload: newOrders
      });
    }
  };

  const toggleItemPick = (orderId, itemId) => {
    const updatedOrders = orders.map(order => {
      if (order.id === orderId) {
        return {
          ...order,
          items: order.items.map(item => 
            item.id === itemId ? { ...item, picked: !item.picked } : item
          )
        };
      }
      return order;
    });
    setOrders(updatedOrders);
    broadcastUpdate(updatedOrders);
  };

  const markOrderAsReady = async (orderId) => {
    const orderToSend = orders.find(o => o.id === orderId);

    const updatedOrders = orders.map(order => 
      order.id === orderId ? { ...order, status: 'Enviado' } : order
    );
    setOrders(updatedOrders);
    
    fetch(`http://localhost:3001/api/ecommerce/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Enviado' })
    }).catch(console.error);

    // Enviar a Telegram directamente desde Picking
    if (orderToSend) {
      const customerData = {
        name: orderToSend.customer,
        phone: orderToSend.paymentDetails?.phone || 'Sin número',
        address: orderToSend.address || 'Dirección del cliente',
        zone: 'Centro de la ciudad',
        packageType: 'Paquete E-commerce',
        productList: `Pedido ${orderToSend.id} (${orderToSend.items?.length || 0} artículos)`,
        weight: 1,
        quantity: 1
      };

      const res = await sendDeliveryRequest('Tienda Principal', customerData, orderToSend.id);
      if (!res.success) {
        console.error("Error al enviar a Telegram: ", res.error);
      }
    }

    broadcastUpdate(updatedOrders);
    
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'ORDER_COMPLETED',
        payload: { orderId }
      });
    }
    
    if (updatedOrders.length > 0) {
      setSelectedOrderId(updatedOrders[0].id);
    } else {
      setSelectedOrderId(null);
    }
  };

  // Calcular progreso
  const getProgress = (order) => {
    if (!order || !order.items.length) return 0;
    const pickedCount = order.items.filter(i => i.picked).length;
    return Math.round((pickedCount / order.items.length) * 100);
  };

  return (
    <div className="p-6 md:p-8 w-full max-w-7xl mx-auto min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-500">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/30 shrink-0">
             <ScanBarcode size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
               Estación de Picking
            </h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">Empaca los artículos rápidamente y sin errores.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        
        {/* Panel Izquierdo: Lista de Pedidos */}
        <div className="w-full lg:w-1/3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col shadow-sm min-h-[300px] lg:min-h-0">
           <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 rounded-t-2xl flex justify-between items-center">
             <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
               <Package size={18} className="text-violet-500" /> Por Preparar
             </h3>
             <span className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 text-xs px-2 py-0.5 rounded-full font-black">
               {orders.filter(o => o.status === 'Preparando').length}
             </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
             {orders.filter(o => o.status === 'Preparando').length === 0 && (
               <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6 text-center animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 size={48} className="text-emerald-500" />
                </div>
                 <p className="font-black text-xl text-slate-700 dark:text-slate-200">¡Bandeja Vacía!</p>
                 <p className="text-sm mt-2 text-slate-500">No hay pedidos pendientes de preparación.</p>
               </div>
             )}
             {orders.filter(o => o.status === 'Preparando').map((order, idx) => {
               const progress = getProgress(order);
               const isSelected = selectedOrderId === order.id;
               
               return (
                 <div 
                   key={order.id} 
                   onClick={() => setSelectedOrderId(order.id)}
                   className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 relative overflow-hidden group animate-in slide-in-from-left-4 ${
                     isSelected 
                       ? 'bg-violet-50/80 border-violet-400 dark:bg-violet-900/20 dark:border-violet-600 shadow-[0_0_20px_-5px_rgba(139,92,246,0.2)]' 
                       : 'bg-white border-transparent hover:border-violet-200 dark:bg-slate-900/50 dark:hover:border-slate-700 shadow-sm hover:shadow-md'
                   }`}
                   style={{ animationDelay: `${idx * 100}ms` }}
                 >
                    {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-violet-500"></div>}
                    
                    <div className="flex justify-between items-start mb-2">
                       <div className="flex items-center gap-2">
                         <span className="text-xs font-black text-slate-600 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{order.id}</span>
                         {order.priority === 'Alta' && (
                           <span className="text-[10px] font-black uppercase text-rose-600 bg-rose-100 dark:bg-rose-900/30 px-2 py-1 rounded-md animate-pulse">Alta Prioridad</span>
                         )}
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-3 mb-4">
                       <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 shrink-0 border-2 border-white dark:border-slate-900 shadow-sm">
                         {order.customer.charAt(0)}
                       </div>
                       <div>
                         <p className={`font-black text-sm ${isSelected ? 'text-violet-900 dark:text-violet-100' : 'text-slate-800 dark:text-white'}`}>{order.customer}</p>
                         <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5"><Clock size={12}/> {order.date}</p>
                       </div>
                    </div>
                    
                    {/* Barra de progreso */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-500 uppercase tracking-wider text-[10px]">Progreso</span>
                        <span className={progress === 100 ? 'text-emerald-500' : 'text-violet-600 dark:text-violet-400'}>{progress}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                        <div className={`h-full rounded-full transition-all duration-700 ease-out ${progress === 100 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-gradient-to-r from-violet-500 to-fuchsia-500'}`} style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                 </div>
               )
             })}
          </div>
        </div>

        {/* Panel Derecho: Detalles y Checklist */}
        <div className="w-full lg:w-2/3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col shadow-sm min-h-[500px] lg:min-h-0 relative overflow-hidden">
           {selectedOrder ? (
             <div className="animate-in fade-in duration-500 h-full flex flex-col">
               <div className="p-6 md:p-8 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-950/80 dark:to-slate-900">
                 <div className="flex items-center gap-4">
                   <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-violet-500/20">
                     {selectedOrder.customer.charAt(0)}
                   </div>
                   <div>
                     <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{selectedOrder.customer}</h3>
                     <p className="text-sm font-bold text-violet-600 dark:text-violet-400">Pedido {selectedOrder.id}</p>
                     <div className="flex items-center gap-1 mt-1 text-xs font-medium text-slate-500">
                        <MapPin size={12} className="text-rose-500" />
                        <span className="line-clamp-1">{selectedOrder.address}</span>
                     </div>
                   </div>
                 </div>
                 <div className="flex gap-2 w-full sm:w-auto">
                    <button className="flex-1 sm:flex-none px-5 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold hover:border-violet-400 dark:hover:border-violet-500 transition-colors flex items-center justify-center gap-2 shadow-sm group">
                      <Printer size={16} className="text-slate-400 group-hover:text-violet-500 transition-colors" /> Imprimir Etiqueta
                    </button>
                 </div>
               </div>

               <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/20 relative">
                 <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
                    <Box size={16} className="text-violet-500" /> Artículos a empacar ({selectedOrder.items.length})
                 </h4>
                 
                 <div className="space-y-4">
                   {selectedOrder.items.map((item, idx) => (
                     <div 
                       key={item.id} 
                       onClick={() => toggleItemPick(selectedOrder.id, item.id)}
                       className={`flex items-center gap-4 p-4 md:p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 group animate-in slide-in-from-bottom-4 ${
                         item.picked 
                           ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10 dark:border-emerald-500/50 opacity-80' 
                           : 'border-transparent bg-white dark:bg-slate-800 shadow-md hover:shadow-lg hover:border-violet-300 dark:hover:border-violet-600 hover:-translate-y-0.5'
                       }`}
                       style={{ animationDelay: `${idx * 100}ms` }}
                     >
                       <div className={`shrink-0 transition-transform duration-300 group-active:scale-90 ${item.picked ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600 group-hover:text-violet-400'}`}>
                         {item.picked ? <CheckSquare size={32} /> : <Square size={32} />}
                       </div>
                       
                       {/* Product Image */}
                       <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                         {item.image ? (
                           <img src={item.image} alt={item.name} className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${item.picked ? 'grayscale opacity-70' : ''}`} />
                         ) : (
                           <ImageIcon size={24} className="text-slate-400" />
                         )}
                       </div>
                       
                       <div className="flex-1 min-w-0 flex flex-col justify-center">
                         <div className="flex justify-between items-start gap-2">
                           <div className="pr-4">
                             <p className={`font-black text-base md:text-lg leading-tight line-clamp-2 ${item.picked ? 'text-emerald-900 dark:text-emerald-100 line-through decoration-emerald-500/50' : 'text-slate-800 dark:text-white'}`}>
                               {item.name}
                             </p>
                             <p className="text-[11px] font-bold tracking-widest text-slate-400 uppercase mt-1">Cód: {item.sku}</p>
                           </div>
                           <div className="shrink-0 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl shadow-sm">
                             <span className="text-sm font-black text-slate-800 dark:text-white">x{item.quantity}</span>
                           </div>
                         </div>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>

               <div className="p-6 md:p-8 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 relative">
                 <button 
                   onClick={() => markOrderAsReady(selectedOrder.id)}
                   disabled={getProgress(selectedOrder) !== 100}
                   className={`w-full py-4 md:py-5 rounded-2xl text-lg font-black flex items-center justify-center gap-3 transition-all duration-300 relative overflow-hidden ${
                     getProgress(selectedOrder) === 100 
                       ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_10px_30px_-10px_rgba(16,185,129,0.8)] hover:-translate-y-1' 
                       : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border-2 border-dashed border-slate-300 dark:border-slate-700'
                   }`}
                 >
                   {getProgress(selectedOrder) === 100 && (
                      <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite] -skew-x-12 translate-x-[-150%]"></div>
                   )}
                   {getProgress(selectedOrder) === 100 ? (
                     <><ShieldCheck size={24} /> Despachar Pedido</>
                   ) : (
                     'Empaca todos los artículos'
                   )}
                 </button>
               </div>
             </div>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center animate-in zoom-in-95 duration-500">
                <div className="w-32 h-32 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
                  <Box size={64} className="text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-2xl font-black text-slate-700 dark:text-slate-300">Selecciona un pedido</p>
                <p className="text-base font-medium mt-3 max-w-md text-slate-500">Haz clic en un pedido de la lista lateral para ver los artículos que debes buscar y empacar para el cliente.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
