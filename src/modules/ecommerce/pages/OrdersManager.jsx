import React, { useState, useEffect } from 'react';
import { ShoppingCart, Clock, Package, Truck, CheckCircle2, Search, Filter, Eye, ChevronRight, AlertCircle, FileImage, CreditCard, Check, X, QrCode, Smartphone, Copy } from 'lucide-react';
import { supabase } from '../../presupuesto/utils/supabaseClient';
import { sendDeliveryRequest, globalListeners } from '../../delivery/utils/telegramService';

const initialOrders = [];

export default function OrdersManager() {
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Cargar pedidos desde el backend
  useEffect(() => {
    const workspaceId = localStorage.getItem('activeWorkspace') || 'default_workspace';
    
    const loadOrders = async () => {
      try {
        const { data, error } = await supabase
          .from('ecommerce_orders_v2')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        // Map snake_case from DB to camelCase for UI
        const mappedOrders = (data || []).map(order => ({
          ...order,
          date: new Date(order.created_at).toLocaleString(),
          paymentMethod: order.payment_method,
          paymentStatus: order.payment_status,
          paymentDetails: typeof order.payment_details === 'string' ? JSON.parse(order.payment_details) : order.payment_details,
          shippingInfo: typeof order.shipping_info === 'string' ? JSON.parse(order.shipping_info) : order.shipping_info,
          items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
          deliveryPin: order.delivery_pin,
          isMobile: order.is_mobile
        }));
        
        setOrders(mappedOrders);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadOrders();
  }, []);
  
  // Modal de detalles
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [activeTab, setActiveTab] = useState('Pendiente'); // Para vista móvil

  // Drag and Drop State
  const [draggedOrderId, setDraggedOrderId] = useState(null);

  // Función para enviar a Telegram
  const handleSendToDelivery = async (order) => {
    let phone = 'No indicado';
    let docId = '';
    let address = order.address || 'Sin dirección';
    
    try {
      const details = typeof order.paymentDetails === 'string' ? JSON.parse(order.paymentDetails) : (order.paymentDetails || {});
      if (details.phone) phone = details.phone;
      if (details.docId) docId = details.docId;
      if (details.address) address = details.address;
    } catch(e) {}

    const customerData = {
      name: `${order.customer} ${docId ? `(C.I: ${docId})` : ''}`.trim(),
      phone: phone,
      address: `${address}${(order.shippingInfo && order.shippingInfo.location) ? `\n📍 Ubicación GPS: https://maps.google.com/?q=${order.shippingInfo.location.lat},${order.shippingInfo.location.lng}` : ''}`,
      zone: 'E-commerce',
      packageType: 'Paquete E-commerce',
      productList: `Pedido ${order.id} (${order.items ? (typeof order.items === 'string' ? JSON.parse(order.items) : order.items).length : 0} artículos)`,
      weight: 1,
      quantity: 1,
      deliveryPin: order.deliveryPin
    };

    const res = await sendDeliveryRequest('Tienda Principal', customerData, order.id);
    if (!res.success) {
      console.error("Error al enviar a Telegram: ", res.error);
    }
  };

  // Supabase Realtime Listener
  useEffect(() => {
    const channel = supabase.channel('picking-sync', {
      config: { broadcast: { ack: false } }
    });

    channel.on('broadcast', { event: 'ORDER_COMPLETED' }, (payload) => {
      if (payload.payload?.orderId) {
        setOrders(prevOrders => {
          const targetOrder = prevOrders.find(o => o.id === payload.payload.orderId);
          if (targetOrder && targetOrder.status !== 'Enviado') {
            handleSendToDelivery(targetOrder);
          }
          return prevOrders.map(order => 
            order.id === payload.payload.orderId ? { ...order, status: 'Enviado' } : order
          );
        });
      }
    }).subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // Telegram Listener para Entregas
  useEffect(() => {
    const handleComplete = (completedOrderId) => {
      setOrders(prevOrders => prevOrders.map(order => 
        order.id === completedOrderId ? { ...order, status: 'Entregado' } : order
      ));

      // Update en backend
      supabase.from('ecommerce_orders_v2')
        .update({ status: 'Entregado' })
        .eq('id', completedOrderId)
        .catch(console.error);
    };

    globalListeners.onComplete.push(handleComplete);

    return () => {
      globalListeners.onComplete = globalListeners.onComplete.filter(cb => cb !== handleComplete);
    };
  }, []);

  const columns = [
    { id: 'Pendiente', title: 'Nuevos Pedidos', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/30' },
    { id: 'Preparando', title: 'En Preparación', icon: Package, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/30' },
    { id: 'Enviado', title: 'Delivery', icon: Truck, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-500/10', border: 'border-violet-200 dark:border-violet-500/30' },
    { id: 'Entregado', title: 'Entregados', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/30' },
  ];

  const handleDragStart = (e, id) => {
    setDraggedOrderId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    if (draggedOrderId) {
      const orderToMove = orders.find(o => o.id === draggedOrderId);
      if (!orderToMove || orderToMove.status === targetStatus) return;
      const previousStatus = orderToMove.status;
      
      let newDeliveryPin = orderToMove.deliveryPin;
      if (!newDeliveryPin && (targetStatus === 'Preparando' || targetStatus === 'Enviado')) {
        newDeliveryPin = Math.floor(100000 + Math.random() * 900000).toString();
      }
      
      // Update optimista
      setOrders(orders.map(order => 
        order.id === draggedOrderId ? { ...order, status: targetStatus, deliveryPin: newDeliveryPin } : order
      ));
      
      try {
        const payload = { status: targetStatus };
        if (newDeliveryPin && newDeliveryPin !== orderToMove.deliveryPin) payload.delivery_pin = newDeliveryPin;

        const { error } = await supabase
          .from('ecommerce_orders_v2')
          .update(payload)
          .eq('id', draggedOrderId);
        
        if (error) {
          alert('Error al actualizar pedido: ' + error.message);
          // Revertir
          setOrders(prev => prev.map(order => order.id === draggedOrderId ? { ...order, status: previousStatus } : order));
          return;
        }

        // Integración Telegram Delivery
        if (targetStatus === 'Enviado' && orderToMove.status !== 'Enviado') {
          handleSendToDelivery({ ...orderToMove, deliveryPin: newDeliveryPin });
        }
      } catch (err) {
        console.error(err);
        setOrders(prev => prev.map(order => order.id === draggedOrderId ? { ...order, status: previousStatus } : order));
      }
      setDraggedOrderId(null);
    }
  };

  const moveOrder = (id, newStatus) => {
    const orderToMove = orders.find(o => o.id === id);
    if (!orderToMove) return;

    let newDeliveryPin = orderToMove.deliveryPin;
    if (!newDeliveryPin && (newStatus === 'Preparando' || newStatus === 'Enviado')) {
      newDeliveryPin = Math.floor(100000 + Math.random() * 900000).toString();
    }

    setOrders(orders.map(order => 
      order.id === id ? { ...order, status: newStatus, deliveryPin: newDeliveryPin } : order
    ));
    
    const payload = { status: newStatus };
    if (newDeliveryPin && newDeliveryPin !== orderToMove.deliveryPin) payload.delivery_pin = newDeliveryPin;

    // Update en backend
    supabase.from('ecommerce_orders_v2').update(payload).eq('id', id).catch(console.error);

    // Integración Telegram Delivery
    if (newStatus === 'Enviado' && orderToMove && orderToMove.status !== 'Enviado') {
      handleSendToDelivery({ ...orderToMove, deliveryPin: newDeliveryPin });
    }
  };

  const verifyPayment = async (id, action) => {
    let newPaymentStatus;
    let newStatus = undefined;
    
    if (action === 'approve') {
      newPaymentStatus = 'approved';
      newStatus = 'Preparando';
    } else if (action === 'reject') {
      newPaymentStatus = 'rejected';
    } else if (action === 'review') {
      newPaymentStatus = 'review';
    } else if (action === 'fraud') {
      newPaymentStatus = 'fraud';
      newStatus = 'Pendiente'; // stays here, but marked fraud
    }

    const orderToMove = orders.find(o => o.id === id);
    if (!orderToMove) return;

    const previousStatus = orderToMove.status;
    const previousPaymentStatus = orderToMove.paymentStatus;

    let newDeliveryPin = orderToMove.deliveryPin;
    if (action === 'approve' && !newDeliveryPin) {
      newDeliveryPin = Math.floor(100000 + Math.random() * 900000).toString();
    }

    setOrders(orders.map(order => {
      if (order.id === id) {
        const updatedOrder = { 
          ...order, 
          paymentStatus: newPaymentStatus,
          ...(newStatus && { status: newStatus }),
          ...(newDeliveryPin && { deliveryPin: newDeliveryPin })
        };
        if (selectedOrder && selectedOrder.id === id) {
           setSelectedOrder(updatedOrder);
        }
        return updatedOrder;
      }
      return order;
    }));

    const updatePayload = { payment_status: newPaymentStatus };
    if (newStatus) updatePayload.status = newStatus;
    if (newDeliveryPin && newDeliveryPin !== orderToMove.deliveryPin) updatePayload.delivery_pin = newDeliveryPin;

    try {
      const { error } = await supabase
        .from('ecommerce_orders_v2')
        .update(updatePayload)
        .eq('id', id);
        
      if (error) {
        alert('Error al actualizar pedido: ' + error.message);
        // Revertir
        setOrders(prev => prev.map(order => {
           if (order.id === id) {
              const reverted = { ...order, status: previousStatus, paymentStatus: previousPaymentStatus };
              if (selectedOrder && selectedOrder.id === id) setSelectedOrder(reverted);
              return reverted;
           }
           return order;
        }));
      }
    } catch(err) {
      console.error(err);
      setOrders(prev => prev.map(order => order.id === id ? { ...order, status: previousStatus, paymentStatus: previousPaymentStatus } : order));
    }
  };

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.customer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <div className="p-8 text-center font-bold text-slate-500">Cargando pedidos...</div>;

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6 pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            Gestión de Pedidos <span className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 text-xs px-2 py-0.5 rounded-full font-black uppercase">Kanban Flow</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Arrastra y suelta las tarjetas para actualizar el estado del envío.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar pedido o cliente..."
              className="w-full sm:w-64 pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-shadow dark:text-white shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button 
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-sm"
          >
            <QrCode size={16} /> App de Picking
          </button>
        </div>
      </div>

      {/* TABS MÓVIL — selector de columna */}
      <div className="md:hidden -mx-0 mb-4">
        <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none">
          {columns.map(col => {
            const count = filteredOrders.filter(o => o.status === col.id).length;
            return (
              <button
                key={col.id}
                onClick={() => setActiveTab(col.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap shrink-0 transition-all ${
                  activeTab === col.id
                    ? `${col.bg} ${col.color} border ${col.border} shadow-sm`
                    : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-800'
                }`}
              >
                <col.icon size={15} />
                {col.title}
                <span className={`text-xs font-black px-1.5 py-0.5 rounded-md ${
                  activeTab === col.id ? 'bg-white/50 dark:bg-black/20' : 'bg-slate-100 dark:bg-slate-800'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* KANBAN BOARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
        {columns.map(col => {
          const colOrders = filteredOrders.filter(o => o.status === col.id);
          // En móvil, solo mostrar la columna activa
          const isHiddenOnMobile = col.id !== activeTab;
          
          return (
            <div 
              key={col.id} 
              className={`bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border ${col.border} flex flex-col h-full min-h-[600px] ${
                isHiddenOnMobile ? 'hidden md:flex' : 'flex'
              }`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className={`p-4 border-b ${col.border} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <col.icon size={18} className={col.color} />
                  <h3 className="font-bold text-slate-800 dark:text-white">{col.title}</h3>
                </div>
                <span className={`text-xs font-black px-2 py-1 rounded-lg ${col.bg} ${col.color}`}>
                  {colOrders.length}
                </span>
              </div>
              
              <div className="p-3 flex-1 flex flex-col gap-3 overflow-y-auto">
                {colOrders.map(order => (
                  <div 
                    key={order.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, order.id)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm cursor-grab active:cursor-grabbing hover:border-violet-300 dark:hover:border-violet-700 transition-colors group relative"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{order.id}</span>
                      <span className="text-sm font-black text-slate-800 dark:text-white">${order.total.toFixed(2)}</span>
                    </div>
                    
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
                      {order.isMobile ? <Smartphone size={12} className="inline mr-1" /> : null}
                      {order.customer}
                    </p>
                    <p className="text-xs text-slate-500 mb-4">{order.items?.length || 0} {(order.items?.length || 0) === 1 ? 'artículo' : 'artículos'} • {order.date}</p>
                    
                    {order.paymentMethod === 'pago_movil' && (order.paymentStatus === 'pending' || order.paymentStatus === 'review' || order.paymentStatus === 'fraud') && (
                      <div className={`mb-3 p-3 border rounded-xl flex flex-col gap-2 ${order.paymentStatus === 'review' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/50' : order.paymentStatus === 'fraud' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          {order.paymentStatus === 'review' ? (
                            <><AlertCircle size={14} className="text-orange-600 dark:text-orange-400" /><span className="text-xs font-bold text-orange-700 dark:text-orange-400">En Revisión (Tercero)</span></>
                          ) : order.paymentStatus === 'fraud' ? (
                            <><AlertCircle size={14} className="text-red-600 dark:text-red-400" /><span className="text-xs font-bold text-red-700 dark:text-red-400">Fraude Denunciado</span></>
                          ) : (
                            <><Clock size={14} className="text-amber-600 dark:text-amber-400" /><span className="text-xs font-bold text-amber-700 dark:text-amber-400">Pago por verificar</span></>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-start gap-2">
                          <div className="space-y-1 text-xs">
                            <p className="flex items-center gap-1"><span className="text-slate-500">Ref:</span> <span className="font-bold text-slate-800 dark:text-white">{order.paymentDetails?.ref || 'N/A'}</span>
                              {order.paymentDetails?.ref && (
                                <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(order.paymentDetails.ref); alert('Copiado: ' + order.paymentDetails.ref); }} className="text-slate-400 hover:text-violet-500 transition-colors p-0.5 rounded" title="Copiar Referencia">
                                  <Copy size={12} />
                                </button>
                              )}
                            </p>
                            <p><span className="text-slate-500">Banco:</span> <span className="font-bold text-slate-800 dark:text-white">{order.paymentDetails?.bank || 'N/A'}</span></p>
                          </div>
                          
                          {order.paymentDetails?.capture && (
                            <a href={order.paymentDetails.capture} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0 block hover:opacity-80 transition-opacity">
                              <img src={order.paymentDetails.capture} alt="Capture" className="w-full h-full object-cover" />
                            </a>
                          )}
                        </div>

                        {order.paymentStatus === 'pending' && (
                          <div className="flex gap-1.5 mt-2">
                             <button onClick={(e) => { e.stopPropagation(); verifyPayment(order.id, 'approve'); }} className="flex-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors">
                               <Check size={12} /> Aprobar
                             </button>
                             <button onClick={(e) => { e.stopPropagation(); verifyPayment(order.id, 'review'); }} className="flex-1 bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 py-1.5 rounded-lg text-[10px] font-bold flex flex-col items-center justify-center transition-colors leading-none text-center" title="Marcar como dudoso/tercero">
                               <span>Revisión</span><span className="opacity-70">(Tercero)</span>
                             </button>
                          </div>
                        )}
                        {order.paymentStatus === 'review' && (
                          <div className="flex gap-1.5 mt-2">
                             <button onClick={(e) => { e.stopPropagation(); verifyPayment(order.id, 'approve'); }} className="flex-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors">
                               <Check size={12} /> Válido
                             </button>
                             <button onClick={(e) => { e.stopPropagation(); verifyPayment(order.id, 'fraud'); }} className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors text-center" title="Denunciar Fraude">
                               <AlertCircle size={12} /> Fraude
                             </button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button 
                        onClick={() => setSelectedOrder(order)}
                        className="text-xs font-bold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 flex items-center gap-1"
                      >
                        <Eye size={14} /> Ver Detalles
                      </button>
                      
                      {/* Mobile quick-move buttons (hidden on desktop drag & drop) */}
                      <div className="lg:hidden flex gap-1">
                         {col.id !== 'Entregado' && (
                           <button 
                             onClick={() => {
                               const nextIdx = columns.findIndex(c => c.id === col.id) + 1;
                               if(columns[nextIdx]) moveOrder(order.id, columns[nextIdx].id);
                             }}
                             className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400"
                           >
                             <ChevronRight size={14} />
                           </button>
                         )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {colOrders.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl opacity-50">
                    <p className="text-xs font-medium text-slate-500">Arrastra pedidos aquí</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal Detalles del Pedido */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center px-0 md:px-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}></div>
          <div className="bg-white dark:bg-slate-900 w-full md:max-w-lg rounded-t-3xl md:rounded-2xl shadow-2xl relative z-10 border-t md:border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in slide-in-from-bottom md:zoom-in-95 duration-300 max-h-[90dvh]">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50 dark:bg-slate-950/50">
              <div>
                <h3 className="font-black text-lg text-slate-800 dark:text-white">Pedido {selectedOrder.id}</h3>
                <p className="text-xs text-slate-500">{selectedOrder.date}</p>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                columns.find(c => c.id === selectedOrder.status)?.bg
              } ${columns.find(c => c.id === selectedOrder.status)?.color}`}>
                {selectedOrder.status}
              </span>
            </div>
            
            <div className="p-5 md:p-6 space-y-5 overflow-y-auto">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Cliente y Entrega</h4>
                <p className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1">
                  {selectedOrder.isMobile ? <Smartphone size={14} className="text-violet-500" /> : null}
                  {selectedOrder.customer}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  <span className="font-bold">Dirección / Notas:</span> {selectedOrder.address}
                </p>
                
                {(selectedOrder.shippingInfo && selectedOrder.shippingInfo.location) && (
                   <a href={`https://maps.google.com/?q=${selectedOrder.shippingInfo.location.lat},${selectedOrder.shippingInfo.location.lng}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-3 text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1.5 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
                     <MapPin size={14} /> Ver en Google Maps
                   </a>
                )}
                
                {/* Nuevos campos de E-commerce avanzado */}
                {(selectedOrder.booking_date || selectedOrder.table_number || selectedOrder.order_type) && (
                  <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-lg text-sm text-indigo-900 dark:text-indigo-200">
                    {selectedOrder.order_type && <p><span className="font-bold">Tipo:</span> {selectedOrder.order_type}</p>}
                    {selectedOrder.booking_date && <p><span className="font-bold">Cita:</span> {selectedOrder.booking_date} {selectedOrder.booking_time}</p>}
                    {selectedOrder.table_number && <p><span className="font-bold">Mesa:</span> {selectedOrder.table_number}</p>}
                  </div>
                )}
              </div>
              
               {(selectedOrder.paymentMethod === 'pago_movil' || selectedOrder.paymentMethod === 'zelle') && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1"><CreditCard size={14}/> Detalles del Pago ({selectedOrder.paymentMethod === 'zelle' ? 'Zelle' : 'Pago Móvil'})</h4>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4">
                     <div className="flex-1 space-y-2">
                        <div className="flex justify-between text-sm items-center">
                          <span className="text-slate-500 dark:text-slate-400">Referencia:</span>
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-slate-800 dark:text-white">{selectedOrder.paymentDetails?.ref || 'N/A'}</span>
                            {selectedOrder.paymentDetails?.ref && (
                              <button onClick={() => { navigator.clipboard.writeText(selectedOrder.paymentDetails.ref); alert('Copiado: ' + selectedOrder.paymentDetails.ref); }} className="text-slate-400 hover:text-violet-500 p-1 rounded transition-colors" title="Copiar Referencia">
                                <Copy size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                        {selectedOrder.paymentMethod === 'pago_movil' && (
                           <>
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-500 dark:text-slate-400">Banco:</span>
                                <span className="font-bold text-slate-800 dark:text-white">{selectedOrder.paymentDetails?.bank || 'N/A'}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-500 dark:text-slate-400">Teléfono:</span>
                                <span className="font-bold text-slate-800 dark:text-white">{selectedOrder.paymentDetails?.phone || 'N/A'}</span>
                              </div>
                           </>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500 dark:text-slate-400">Estado:</span>
                          {selectedOrder.paymentStatus === 'pending' ? (
                            <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1"><Clock size={14}/> Por Verificar</span>
                          ) : selectedOrder.paymentStatus === 'review' ? (
                            <span className="text-orange-600 dark:text-orange-400 font-bold flex items-center gap-1"><AlertCircle size={14}/> En Revisión</span>
                          ) : selectedOrder.paymentStatus === 'fraud' ? (
                            <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1"><AlertCircle size={14}/> Fraude</span>
                          ) : selectedOrder.paymentStatus === 'approved' ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 size={14}/> Aprobado</span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1"><X size={14}/> Rechazado</span>
                          )}
                        </div>
                     </div>
                     {selectedOrder.paymentDetails?.capture && (
                       <a href={selectedOrder.paymentDetails.capture} target="_blank" rel="noreferrer" className="w-full sm:w-24 h-32 bg-slate-200 dark:bg-slate-700 rounded-lg overflow-hidden flex-shrink-0 relative group block cursor-pointer">
                         <img src={selectedOrder.paymentDetails.capture} alt="Capture" className="w-full h-full object-cover" />
                         <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <FileImage size={24} className="text-white" />
                         </div>
                       </a>
                     )}
                  </div>
                  {selectedOrder.paymentStatus === 'pending' && (
                    <div className="mt-3 flex gap-2">
                       <button onClick={() => openChat(selectedOrder)} className="flex-1 bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:hover:bg-violet-900/50 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 transition-colors">
                         <MessageSquare size={16} /> Abrir Chat de Resolución
                       </button>
                       <button onClick={() => verifyPayment(selectedOrder.id, 'approve')} className="flex-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 transition-colors">
                         <Check size={16} /> Confirmar Pago
                       </button>
                       <button onClick={() => verifyPayment(selectedOrder.id, 'review')} className="flex-1 bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 transition-colors">
                         <AlertCircle size={16} /> Revisión (Tercero)
                       </button>
                    </div>
                  )}
                  {selectedOrder.paymentStatus === 'review' && (
                    <div className="mt-3 flex gap-2">
                       <button onClick={() => verifyPayment(selectedOrder.id, 'approve')} className="flex-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 transition-colors">
                         <Check size={16} /> Marcar Válido
                       </button>
                       <button onClick={() => verifyPayment(selectedOrder.id, 'fraud')} className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 transition-colors">
                         <AlertCircle size={16} /> Denunciar Fraude
                       </button>
                    </div>
                  )}
                </div>
              )}
              
              {selectedOrder.paymentMethod === 'cash' && (
                 <div>
                   <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1"><CreditCard size={14}/> Método de Pago</h4>
                   <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                     <span className="font-bold text-slate-800 dark:text-white">Pago en Efectivo / Delivery</span>
                     <span className="text-xs text-slate-500 mt-1">El cliente pagará al recibir el pedido.</span>
                   </div>
                 </div>
              )}

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Resumen ({selectedOrder.items ? selectedOrder.items.length : 0} arts.)</h4>
                <div className="space-y-2">
                  {selectedOrder.items && selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-slate-700 dark:text-slate-300">{item.name} x{item.quantity}</span>
                      <span className="font-bold text-slate-800 dark:text-white">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  {selectedOrder.shippingInfo?.cost !== undefined && (
                     <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-sm">
                       <span className="text-slate-600 dark:text-slate-400">Envío</span>
                       <span className="font-bold text-slate-800 dark:text-white">${Number(selectedOrder.shippingInfo.cost).toFixed(2)}</span>
                     </div>
                  )}
                  <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-base">
                    <span className="font-bold text-slate-800 dark:text-white">Total Pagado</span>
                    <span className="font-black text-violet-600 dark:text-violet-400">${selectedOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button 
                onClick={() => setSelectedOrder(null)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-xl text-sm font-bold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal QR Code */}
      {showQrModal && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center px-0 md:px-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowQrModal(false)}></div>
          <div className="bg-white dark:bg-slate-900 w-full md:max-w-sm rounded-t-3xl md:rounded-3xl shadow-2xl relative z-10 p-8 flex flex-col items-center text-center animate-in slide-in-from-bottom md:zoom-in-95 duration-300 border-t md:border border-slate-200 dark:border-slate-800">
             <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/30 rounded-2xl flex items-center justify-center text-violet-600 dark:text-violet-400 mb-4 shadow-inner">
               <Smartphone size={32} />
             </div>
             <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">Vincular Dispositivo</h3>
             <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Escanea este código con el teléfono móvil para abrir la App de Picking.</p>
             
             <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm mb-8 relative group">
               {/* Genera la URL dinámicamente. Si estás en localhost, asume tu IP local de Wi-Fi */}
               <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${
                 window.location.protocol + '//' + (window.location.hostname === 'localhost' ? '192.168.1.101' : window.location.hostname) + ':' + window.location.port + '/ecommerce/picking'
               }`} alt="QR Code" className="w-48 h-48 object-contain" />
               <a 
                 href="/ecommerce/picking" 
                 target="_blank" 
                 className="absolute inset-0 bg-black/50 text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl"
               >
                 Abrir URL Directa
               </a>
             </div>
             
             <div className="w-full mb-6 p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-medium text-left border border-amber-200 dark:border-amber-700">
               <AlertCircle size={14} className="inline mr-1 mb-0.5" />
               Asegúrate de ejecutar el servidor con <strong>--host</strong> (ej: <code>npm run dev -- --host</code>) para que tu teléfono tenga acceso por Wi-Fi.
             </div>
             
             <button 
               onClick={() => setShowQrModal(false)}
               className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-colors"
             >
               Cerrar
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
