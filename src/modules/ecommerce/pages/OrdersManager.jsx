import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Clock, Package, Truck, CheckCircle2, Search, Filter, Eye, ChevronRight, AlertCircle, FileImage, CreditCard, Check, X, QrCode, Smartphone, Copy, MapPin, MessageSquare, Calendar, ExternalLink } from 'lucide-react';
import { supabase } from '../../presupuesto/utils/supabaseClient';
import { sendDeliveryRequest, globalListeners } from '../../delivery/utils/telegramService';
import ResponsiveModal from '../components/ResponsiveModal';

// ==============================================================================
// UTILIDADES DE FECHA LOCAL (VENEZUELA / UTC-4) Y FORMATEO CRONOLÓGICO
// ==============================================================================
export const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getYesterdayDateString = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateString(d);
};

export const formatOrderTime = (dateInput) => {
  if (!dateInput) return '--:--';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '--:--';
  const orderDateStr = getLocalDateString(d);
  const todayStr = getLocalDateString();
  const yesterdayStr = getYesterdayDateString();
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (orderDateStr === todayStr) {
    return timeStr;
  } else if (orderDateStr === yesterdayStr) {
    return `Ayer • ${timeStr}`;
  } else {
    const day = d.getDate();
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${day} ${monthNames[d.getMonth()]} • ${timeStr}`;
  }
};

const initialOrders = [];

export default function OrdersManager() {
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [filterMode, setFilterMode] = useState('today'); // 'today' | 'yesterday' | 'specific' | 'all'
  const [currentLocalDate, setCurrentLocalDate] = useState(getLocalDateString());
  const [filterDate, setFilterDate] = useState(getLocalDateString());

  // Cierre y Reinicio Automático a Medianoche (00:00:05 Hora Local)
  useEffect(() => {
    let timerId;
    const scheduleMidnight = () => {
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
      const ms = midnight.getTime() - now.getTime();

      timerId = setTimeout(() => {
        const newToday = getLocalDateString();
        setCurrentLocalDate(newToday);
        setFilterDate(prev => (filterMode === 'today' ? newToday : prev));
        scheduleMidnight();
      }, ms);
    };

    scheduleMidnight();
    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [filterMode]);

  // Cargar pedidos desde el backend
  useEffect(() => {
    const workspaceId = localStorage.getItem('activeWorkspace') || 'default_workspace';
    
    const loadOrders = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from('ecommerce_orders_v2')
          .select('*')
          .eq('workspace_id', workspaceId);

        if (filterMode === 'all') {
          query = query.limit(200);
        } else {
          const targetDateStr = filterMode === 'today'
            ? currentLocalDate
            : filterMode === 'yesterday'
            ? getYesterdayDateString()
            : filterDate;

          const [y, m, d] = targetDateStr.split('-').map(Number);
          const start = new Date(y, m - 1, d, 0, 0, 0, 0);
          const end = new Date(y, m - 1, d, 23, 59, 59, 999);
          query = query.gte('date', start.toISOString()).lte('date', end.toISOString());
        }

        const { data, error } = await query.order('date', { ascending: false });
          
        if (error) throw error;
        
        // Map snake_case from DB to camelCase for UI
        const mappedOrders = (data || []).map(order => ({
          ...order,
          dateRaw: order.date,
          date: new Date(order.date).toLocaleString(),
          paymentMethod: order.paymentmethod,
          paymentStatus: order.paymentstatus,
          paymentDetails: typeof order.paymentdetails === 'string' ? JSON.parse(order.paymentdetails) : order.paymentdetails,
          shippingInfo: typeof order.shipping_info === 'string' ? JSON.parse(order.shipping_info) : order.shipping_info,
          items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
          deliveryPin: order.delivery_pin,
          pickupPin: (typeof order.shipping_info === 'object' ? order.shipping_info?.pickup_pin : null) || (typeof order.shipping_info === 'string' ? (() => { try { return JSON.parse(order.shipping_info)?.pickup_pin; } catch { return null; } })() : null) || order.pickup_pin || null,
          pickerName: order.picker_name || (typeof order.shipping_info === 'object' ? order.shipping_info?.picker_name : null) || (typeof order.shipping_info === 'string' ? (() => { try { return JSON.parse(order.shipping_info)?.picker_name; } catch { return null; } })() : null),
          pickerId: order.picker_id || (typeof order.shipping_info === 'object' ? order.shipping_info?.picker_id : null) || (typeof order.shipping_info === 'string' ? (() => { try { return JSON.parse(order.shipping_info)?.picker_id; } catch { return null; } })() : null),
          isMobile: order.ismobile
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
  }, [filterMode, filterDate, currentLocalDate]);
  
  // Modal de detalles
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [activeTab, setActiveTab] = useState('Pendiente'); // Para vista móvil

  // Drag and Drop State
  const [draggedOrderId, setDraggedOrderId] = useState(null);

  // Helper para resolver datos de la tienda física para el repartidor
  const resolveStorePickupInfo = async (wsId) => {
    try {
      let targetWsId = wsId;
      if (!targetWsId) {
        const { data: defaultWs } = await supabase.from('workspaces').select('id').limit(1).maybeSingle();
        if (defaultWs) targetWsId = defaultWs.id;
      }
      if (!targetWsId) return null;

      const { data: ws } = await supabase.from('workspaces').select('id, name, map_address, latitude, longitude, config').eq('id', targetWsId).maybeSingle();
      if (!ws) return null;
      
      const storeName = ws.config?.expediente?.storeName || ws.config?.expediente?.razonSocial || ws.name || 'Tienda AxonPOS';
      const storeAddress = ws.map_address || ws.config?.location?.address || ws.config?.address || ws.config?.expediente?.address || 'Mostrador Principal';
      const storePhone = ws.config?.expediente?.phone || ws.config?.expediente?.whatsapp || ws.config?.contact?.phone || '';
      
      const lat = ws.latitude || ws.config?.location?.lat || ws.config?.expediente?.gps?.lat;
      const lng = ws.longitude || ws.config?.location?.lng || ws.config?.expediente?.gps?.lng;
      const location = (lat && lng) ? { lat: Number(lat), lng: Number(lng) } : null;
      const maps_url = location ? `https://maps.google.com/?q=${location.lat},${location.lng}` : null;

      return {
        name: storeName,
        address: storeAddress,
        phone: storePhone,
        location,
        maps_url
      };
    } catch (err) {
      console.warn('[OrdersManager] Error resolviendo pickupInfo:', err);
      return null;
    }
  };

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

    const wsId = order.workspace_id || order.workspaceId || localStorage.getItem('activeWorkspace');
    const pickupInfo = await resolveStorePickupInfo(wsId);
    const pickupPin = order.pickupPin || order.shipping_info?.pickup_pin || order.shippingInfo?.pickup_pin || null;
    if (pickupInfo && pickupPin) {
      pickupInfo.pickup_pin = pickupPin;
    }

    const customerLocation = order.shippingInfo?.location || order.shipping_info?.location || null;
    const customerMapsUrl = customerLocation
      ? (order.shippingInfo?.maps_url || order.shipping_info?.maps_url || `https://maps.google.com/?q=${customerLocation.lat},${customerLocation.lng}`)
      : null;

    const customerData = {
      name: `${order.customer} ${docId ? `(C.I: ${docId})` : ''}`.trim(),
      phone: phone,
      address: address,
      location: customerLocation,
      maps_url: customerMapsUrl,
      zone: 'E-commerce',
      packageType: 'Paquete E-commerce',
      productList: `Pedido ${order.id} (${order.items ? (typeof order.items === 'string' ? JSON.parse(order.items) : order.items).length : 0} artículos)`,
      weight: 1,
      quantity: 1,
      deliveryPin: order.deliveryPin,
      pickupPin: pickupPin,
      totalUsd: order.total || 0,
      totalVes: order.total_ves || 0,
      paymentMethod: order.paymentMethod || order.paymentmethod || 'Por verificar'
    };

    const res = await sendDeliveryRequest(
      pickupInfo?.name || 'Tienda AxonPOS',
      customerData,
      order.id,
      wsId,
      pickupInfo
    );
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
    })
    .on('broadcast', { event: 'PICKER_ASSIGNED' }, (payload) => {
      const { orderId, orderNumber, pickerName, pickerId } = payload.payload || {};
      if (orderId || orderNumber) {
        setOrders(prevOrders => prevOrders.map(order => {
          if (order.id === orderId || order.orderNumber === orderNumber || order.id === orderNumber) {
            const currentShipping = typeof order.shippingInfo === 'object' ? (order.shippingInfo || {}) : {};
            const updatedShipping = {
              ...currentShipping,
              picker_name: pickerName,
              picker_id: pickerId
            };
            return {
              ...order,
              pickerName: pickerName || order.pickerName,
              pickerId: pickerId || order.pickerId,
              status: order.status === 'Pendiente' ? 'Preparando' : order.status,
              shippingInfo: updatedShipping
            };
          }
          return order;
        }));
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

  const deductInventory = async (items) => {
    if (!items || !Array.isArray(items)) return;
    try {
      const updates = items.map(async (item) => {
        const { data } = await supabase.from('ecommerce_products').select('stock_vitrina').eq('id', item.id).single();
        if (data && typeof data.stock_vitrina === 'number') {
          const newStockVitrina = Math.max(0, data.stock_vitrina - (item.quantity || 1));
          await supabase.from('ecommerce_products').update({ stock_vitrina: newStockVitrina }).eq('id', item.id);
        }
      });
      await Promise.all(updates);
    } catch (err) {
      console.error('Error deduciendo inventario:', err);
    }
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

        // Lógica Anti-Spam: Restar inventario solo al pasar de Pendiente a estados posteriores
        if (previousStatus === 'Pendiente' && ['Preparando', 'Enviado', 'Entregado'].includes(targetStatus)) {
          deductInventory(orderToMove.items);
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
    supabase.from('ecommerce_orders_v2').update(payload).eq('id', id).then(({error}) => {
      if (!error && orderToMove.status === 'Pendiente' && ['Preparando', 'Enviado', 'Entregado'].includes(newStatus)) {
        deductInventory(orderToMove.items);
      }
      if (!error) {
        supabase.channel('support_orders_updates').send({ type: 'broadcast', event: 'order_updated', payload: { orderId: id } });
      }
    }).catch(console.error);

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

    const updatePayload = { paymentstatus: newPaymentStatus };
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
      } else {
        // Lógica Anti-Spam: Restar inventario al aprobar el pago (pasa de Pendiente a Preparando)
        if (action === 'approve' && previousStatus === 'Pendiente') {
          deductInventory(orderToMove.items);
        }
      }
    } catch(err) {
      console.error(err);
      setOrders(prev => prev.map(order => order.id === id ? { ...order, status: previousStatus, paymentStatus: previousPaymentStatus } : order));
    }
  };

  const filteredOrders = useMemo(() => {
    const result = orders.filter(o => 
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (o.customer || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return result.sort((a, b) => {
      const timeA = a.dateRaw ? new Date(a.dateRaw).getTime() : 0;
      const timeB = b.dateRaw ? new Date(b.dateRaw).getTime() : 0;
      return timeB - timeA;
    });
  }, [orders, searchTerm]);

  const dayStats = useMemo(() => {
    let totalUsd = 0;
    let pendingCount = 0;
    let preparingCount = 0;
    let dispatchedCount = 0;
    let deliveredCount = 0;

    filteredOrders.forEach((o) => {
      if (o.status !== 'Cancelado') {
        totalUsd += Number(o.total || 0);
      }
      if (o.status === 'Pendiente') pendingCount++;
      else if (o.status === 'Preparando') preparingCount++;
      else if (o.status === 'Enviado') dispatchedCount++;
      else if (o.status === 'Entregado') deliveredCount++;
    });

    const validCount = filteredOrders.filter(o => o.status !== 'Cancelado').length;
    const avgTicketUsd = validCount > 0 ? totalUsd / validCount : 0;

    return {
      totalUsd,
      totalOrders: filteredOrders.length,
      pendingCount,
      preparingCount,
      dispatchedCount,
      deliveredCount,
      avgTicketUsd
    };
  }, [filteredOrders]);

  if (isLoading) return <div className="p-8 text-center font-bold text-slate-500">Cargando pedidos...</div>;

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6 pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
            Gestión de Pedidos
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Arrastra y suelta las tarjetas para actualizar el estado del envío.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={17} />
              <input 
                type="text"
                placeholder="Buscar pedido o cliente..."
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-shadow dark:text-white shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Filtro Hoy / Ayer / Todos + Calendario */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => {
                  setFilterMode('today');
                  setFilterDate(currentLocalDate);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterMode === 'today'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Ver pedidos de hoy"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterMode('yesterday');
                  setFilterDate(getYesterdayDateString());
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterMode === 'yesterday'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Ver pedidos de ayer"
              >
                Ayer
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterMode === 'all'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Ver todos los pedidos sin filtro de fecha"
              >
                Todos
              </button>

              <div className="relative flex items-center pl-1 border-l border-slate-200 dark:border-slate-700">
                <Calendar className="absolute left-2.5 text-slate-400 pointer-events-none" size={14} />
                <input 
                  type="date"
                  value={filterDate}
                  max={currentLocalDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      setFilterDate(val);
                      if (val === currentLocalDate) {
                        setFilterMode('today');
                      } else if (val === getYesterdayDateString()) {
                        setFilterMode('yesterday');
                      } else {
                        setFilterMode('specific');
                      }
                    }
                  }}
                  className={`pl-7 pr-2 py-1 bg-transparent border-none text-xs font-bold outline-none cursor-pointer font-mono ${
                    filterMode === 'specific' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'
                  }`}
                  title="Seleccionar fecha específica en el calendario"
                />
              </div>
            </div>
          </div>
          
          <button  
            type="button"
            onClick={() => setShowQrModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm hover:shadow-md hover:shadow-amber-500/20 active:scale-95 transition-all shrink-0 whitespace-nowrap w-full sm:w-auto"
            title="Abrir App de Picking (QR y enlace)"
          >
            <QrCode size={16} className="shrink-0" />
            <span>App de Picking</span>
          </button>
        </div>
      </div>

      {/* MINI-BARRA DE ESTADÍSTICAS Y MÉTRICAS DE LA JORNADA */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 px-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
              {filterMode === 'today' ? '📅 Hoy' : filterMode === 'yesterday' ? '📅 Ayer' : filterMode === 'all' ? '🌐 Histórico' : `📅 ${filterDate}`}:
            </span>
            <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
              ${dayStats.totalUsd.toFixed(2)}
            </span>
          </div>

          <div className="hidden sm:block w-px h-5 bg-slate-200 dark:bg-slate-800" />

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              📦 Pedidos: <strong className="text-slate-900 dark:text-white">{dayStats.totalOrders}</strong>
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
              ⏳ Nuevos: <strong>{dayStats.pendingCount}</strong>
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">
              🧑‍🍳 Prep: <strong>{dayStats.preparingCount}</strong>
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800/50">
              🛵 Delivery: <strong>{dayStats.dispatchedCount}</strong>
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
              ✅ Entregados: <strong>{dayStats.deliveredCount}</strong>
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              🎯 Ticket Prom: <strong className="text-slate-900 dark:text-white">${dayStats.avgTicketUsd.toFixed(2)}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <Clock size={13} className="text-amber-500" />
          <span>Auto-cierre: <strong className="text-slate-700 dark:text-slate-200">00:00 hrs</strong> (medianoche)</span>
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
                    <p className="text-xs text-slate-500 mb-2">{order.items?.length || 0} {(order.items?.length || 0) === 1 ? 'artículo' : 'artículos'} • 🕒 {formatOrderTime(order.dateRaw || order.date)}</p>
                    
                    {/* Badge de Trazabilidad del Picker / Empacador */}
                    {(col.id === 'Preparando' || col.id === 'Enviado') && (
                      <div className={`mb-2 px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs font-bold ${
                        (order.pickerName || order.shippingInfo?.picker_name)
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60'
                      }`}>
                        <div className="flex items-center gap-1.5 truncate">
                          <span>👷‍♂️</span>
                          <span className="truncate">
                            {(order.pickerName || order.shippingInfo?.picker_name)
                              ? `Empacando: ${order.pickerName || order.shippingInfo?.picker_name}`
                              : 'Esperando que un picker lo tome'}
                          </span>
                        </div>
                        {!(order.pickerName || order.shippingInfo?.picker_name) && (
                          <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0 ml-1" />
                        )}
                      </div>
                    )}

                    {/* Badge de Seguridad: PIN de Retiro en Tienda (Comerciante ↔ Delivery) */}
                    {(col.id === 'Preparando' || col.id === 'Enviado') && (
                      <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-amber-600">🔑</span>
                          <span className="text-[10px] uppercase font-bold text-amber-900 dark:text-amber-200">Retiro Tienda:</span>
                          <span className="font-mono font-black text-amber-800 dark:text-amber-300 tracking-wider">
                            {order.pickupPin || (order.shippingInfo && typeof order.shippingInfo === 'object' ? order.shippingInfo?.pickup_pin : null) || 'Pendiente'}
                          </span>
                        </div>
                        <span className="text-[9px] font-semibold text-amber-700/80 dark:text-amber-400/80">
                          Exigir al repartidor
                        </span>
                      </div>
                    )}
                    
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
                            {order.paymentDetails?.titular && <p><span className="text-slate-500">Titular:</span> <span className="font-bold text-slate-800 dark:text-white">{order.paymentDetails.titular}</span></p>}
                            {order.paymentDetails?.docId && <p><span className="text-slate-500">CI:</span> <span className="font-bold text-slate-800 dark:text-white">{order.paymentDetails.docId}</span></p>}
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
      <ResponsiveModal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Pedido ${selectedOrder.id}` : ''}
        className="md:max-w-2xl"
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="flex justify-between items-start -mt-2">
              <p className="text-xs text-slate-500">{selectedOrder.date}</p>
              <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                columns.find(c => c.id === selectedOrder.status)?.bg
              } ${columns.find(c => c.id === selectedOrder.status)?.color}`}>
                {selectedOrder.status}
              </span>
            </div>
            
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Cliente y Entrega</h4>
              <div className="bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                <p className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1">
                  {selectedOrder.isMobile ? <Smartphone size={14} className="text-violet-500" /> : null}
                  {selectedOrder.customer}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  <span className="font-bold">Dirección / Notas:</span> {selectedOrder.address}
                </p>
                
                {(selectedOrder.shippingInfo && selectedOrder.shippingInfo.location) && (
                   <a href={`https://maps.google.com/?q=${selectedOrder.shippingInfo.location.lat},${selectedOrder.shippingInfo.location.lng}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-4 text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-2 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors w-full justify-center md:w-auto">
                     <MapPin size={16} /> Ver en Google Maps
                   </a>
                )}
                
                {/* Nuevos campos de E-commerce avanzado */}
                {(selectedOrder.booking_date || selectedOrder.table_number || selectedOrder.order_type) && (
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-xl text-sm text-amber-900 dark:text-amber-200">
                    {selectedOrder.order_type && <p><span className="font-bold">Tipo:</span> {selectedOrder.order_type}</p>}
                    {selectedOrder.booking_date && <p><span className="font-bold">Cita:</span> {selectedOrder.booking_date} {selectedOrder.booking_time}</p>}
                    {selectedOrder.table_number && <p><span className="font-bold">Mesa:</span> {selectedOrder.table_number}</p>}
                  </div>
                )}

                {/* Trazabilidad de Picking / Empacador */}
                {(selectedOrder.pickerName || selectedOrder.shippingInfo?.picker_name) ? (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl text-sm text-blue-900 dark:text-blue-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">👷‍♂️</span>
                      <div>
                        <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase">Empacador Asignado</p>
                        <p className="font-extrabold text-blue-900 dark:text-blue-100">{selectedOrder.pickerName || selectedOrder.shippingInfo?.picker_name}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-800/40 text-blue-800 dark:text-blue-200">
                      {selectedOrder.status === 'Preparando' ? 'En preparación' : 'Empacado'}
                    </span>
                  </div>
                ) : selectedOrder.status === 'Preparando' ? (
                  <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl text-sm text-amber-900 dark:text-amber-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⏳</span>
                      <div>
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase">Sin Empacador</p>
                        <p className="text-xs text-amber-800 dark:text-amber-300">Esperando que un trabajador tome la orden en la app móvil.</p>
                      </div>
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  </div>
                ) : null}

                {/* Seguridad de Despacho: Doble PIN */}
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black uppercase text-amber-900 dark:text-amber-200 flex items-center gap-1">
                      🔑 PIN de Retiro en Tienda (Comerciante ↔ Delivery)
                    </span>
                    <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                      Exigir al repartidor
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-amber-200 rounded-lg p-2.5">
                    <span className="font-mono text-xl font-black text-amber-600 dark:text-amber-400 tracking-widest">
                      {selectedOrder.pickupPin || (selectedOrder.shippingInfo && typeof selectedOrder.shippingInfo === 'object' ? selectedOrder.shippingInfo?.pickup_pin : null) || 'Pendiente'}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      El repartidor debe dictarte este código
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>PIN de Entrega al Cliente:</span>
                    <span className="font-mono font-bold text-slate-400">•••••• (🔒 Privado en poder del cliente)</span>
                  </div>
                </div>
              </div>
            </div>
              
            {(selectedOrder.paymentMethod === 'pago_movil' || selectedOrder.paymentMethod === 'zelle') && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1"><CreditCard size={14}/> Detalles del Pago ({selectedOrder.paymentMethod === 'zelle' ? 'Zelle' : 'Pago Móvil'})</h4>
                <div className="bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-slate-100 dark:border-white/5 flex flex-col sm:flex-row gap-4">
                   <div className="flex-1 space-y-2">
                      <div className="flex justify-between text-sm items-center">
                        <span className="text-slate-500 dark:text-slate-400">Referencia:</span>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-slate-800 dark:text-white">{selectedOrder.paymentDetails?.ref || 'N/A'}</span>
                          {selectedOrder.paymentDetails?.ref && (
                            <button onClick={() => { navigator.clipboard.writeText(selectedOrder.paymentDetails.ref); alert('Copiado: ' + selectedOrder.paymentDetails.ref); }} className="text-slate-400 hover:text-amber-500 p-1 rounded transition-colors" title="Copiar Referencia">
                              <Copy size={16} />
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
                              <span className="text-slate-500 dark:text-slate-400">Titular:</span>
                              <span className="font-bold text-slate-800 dark:text-white">{selectedOrder.paymentDetails?.titular || selectedOrder.customer || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500 dark:text-slate-400">CI/RIF:</span>
                              <span className="font-bold text-slate-800 dark:text-white">{selectedOrder.paymentDetails?.docId || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-500 dark:text-slate-400">Teléfono:</span>
                              <span className="font-bold text-slate-800 dark:text-white">{selectedOrder.paymentDetails?.phone || 'N/A'}</span>
                            </div>
                         </>
                      )}
                      <div className="flex justify-between text-sm items-center pt-2 mt-2 border-t border-slate-200 dark:border-white/5">
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
                     <a href={selectedOrder.paymentDetails.capture} target="_blank" rel="noreferrer" className="w-full sm:w-28 h-40 bg-slate-200 dark:bg-zinc-800 rounded-xl overflow-hidden flex-shrink-0 relative group block cursor-pointer">
                       <img src={selectedOrder.paymentDetails.capture} alt="Capture" className="w-full h-full object-cover" />
                       <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <FileImage size={24} className="text-white" />
                       </div>
                     </a>
                   )}
                </div>
                {selectedOrder.paymentStatus === 'pending' && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
                     <button onClick={() => openChat(selectedOrder)} className="w-full bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:hover:bg-violet-900/40 p-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-colors active:scale-95">
                       <MessageSquare size={16} /> Abrir Chat
                     </button>
                     <button onClick={() => verifyPayment(selectedOrder.id, 'approve')} className="w-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40 p-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-colors active:scale-95">
                       <Check size={16} /> Aprobar Pago
                     </button>
                     <button onClick={() => verifyPayment(selectedOrder.id, 'review')} className="w-full bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/40 p-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-colors active:scale-95">
                       <AlertCircle size={16} /> Duda/Tercero
                     </button>
                  </div>
                )}
                {selectedOrder.paymentStatus === 'review' && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                     <button onClick={() => verifyPayment(selectedOrder.id, 'approve')} className="w-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40 p-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-colors active:scale-95">
                       <Check size={16} /> Marcar Válido
                     </button>
                     <button onClick={() => verifyPayment(selectedOrder.id, 'fraud')} className="w-full bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 p-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-colors active:scale-95">
                       <AlertCircle size={16} /> Denunciar Fraude
                     </button>
                  </div>
                )}
              </div>
            )}
            
            {selectedOrder.paymentMethod === 'cash' && (
               <div>
                 <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1"><CreditCard size={14}/> Método de Pago</h4>
                 <div className="bg-slate-50 dark:bg-zinc-900/50 p-6 rounded-xl border border-slate-100 dark:border-white/5 flex flex-col items-center justify-center text-center">
                   <span className="font-extrabold text-slate-800 dark:text-white text-lg">Efectivo / Contra Entrega</span>
                   <span className="text-sm text-slate-500 mt-2">El cliente pagará al recibir el pedido en destino.</span>
                 </div>
               </div>
            )}

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Resumen ({selectedOrder.items ? selectedOrder.items.length : 0} arts.)</h4>
              <div className="bg-slate-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-slate-100 dark:border-white/5 space-y-3">
                {Array.isArray(selectedOrder.items) && selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="border-b border-slate-200 dark:border-white/5 pb-2.5 last:border-0 last:pb-0">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-slate-700 dark:text-slate-300 font-semibold">{item.name} <span className="text-slate-400 font-normal">x{item.quantity}</span></span>
                        {(item.is_combo || item.metadata?.is_combo) && (
                          <span className="text-[10px] font-black bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-200 px-1.5 py-0.5 rounded">
                            {item.metadata?.combo_badge || '🎁 COMBO'}
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-slate-800 dark:text-white">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>

                    {/* Desglose Picking / Empaque para combos */}
                    {(item.is_combo || item.metadata?.is_combo) && Array.isArray(item.combo_items || item.metadata?.combo_items) && (item.combo_items || item.metadata?.combo_items).length > 0 && (
                      <div className="mt-2 pl-3 py-1.5 border-l-2 border-orange-400 dark:border-orange-500 bg-orange-50/60 dark:bg-orange-950/20 rounded-r-lg space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-wider text-orange-700 dark:text-orange-400 flex items-center gap-1">
                          <span>📦</span> Desglose para Picking / Empaque:
                        </p>
                        {(item.combo_items || item.metadata?.combo_items).map((ci, cIdx) => (
                          <div key={ci.id || cIdx} className="text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between pl-1">
                            <span>• {ci.name}</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              x{(ci.qty || 1) * (item.quantity || 1)} {ci.unit || 'und'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {selectedOrder.shippingInfo?.cost !== undefined && (
                   <div className="pt-3 flex justify-between items-center text-sm">
                     <span className="text-slate-600 dark:text-slate-400 font-medium">Costo de Envío</span>
                     <span className="font-bold text-slate-800 dark:text-white">${Number(selectedOrder.shippingInfo.cost).toFixed(2)}</span>
                   </div>
                )}
                <div className="pt-3 flex justify-between items-center text-base">
                  <span className="font-extrabold text-slate-800 dark:text-white">Total a Pagar</span>
                  <span className="font-black text-amber-600 dark:text-amber-500 text-lg">${selectedOrder.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </ResponsiveModal>

      {/* Modal QR Code */}
      <ResponsiveModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        title="App de Picking"
        className="md:max-w-sm"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-500 mb-4 shadow-inner">
            <Smartphone size={32} />
          </div>
          <h3 className="text-lg font-extrabold text-slate-800 dark:text-white mb-2 tracking-tight">Vincular Dispositivo</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Escanea este código con el teléfono para preparar los pedidos.</p>
          
          <div className="p-4 bg-white border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm mb-4 relative">
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${
              encodeURIComponent(window.location.protocol + '//' + (window.location.hostname === 'localhost' ? '192.168.1.101' : window.location.hostname) + (window.location.port ? ':' + window.location.port : '') + '/picking')
            }`} alt="QR Code" className="w-48 h-48 object-contain" />
          </div>

          <a 
            href="/picking" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-sm shadow-amber-500/20 active:scale-95 transition-all mb-6"
          >
            <span>Abrir App de Picking</span>
            <ExternalLink size={14} />
          </a>
          
          <div className="w-full p-4 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-medium text-left border border-amber-200 dark:border-amber-500/20">
            <AlertCircle size={14} className="inline mr-1 -mt-0.5" />
            Asegúrate de ejecutar el servidor con <strong>--host</strong> (ej: <code>npm run dev -- --host</code>) para que tu teléfono tenga acceso por Wi-Fi.
          </div>
        </div>
      </ResponsiveModal>
    </div>
  );
}
