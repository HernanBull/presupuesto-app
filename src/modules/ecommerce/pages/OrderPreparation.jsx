// ==============================================================================
// AXONMARKET — COMANDA DIGITAL MÓVIL DE PICKING & PACKING (/picking)
// Formato unificado 100% idéntico a AxonPOS (Diseño Luminous White & Axon Orange)
// Soporta listas largas (10+ productos) con scroll táctil fluido sin trabas
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  Package,
  Clock,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  CheckSquare,
  Square,
  Printer,
  Box,
  ShieldCheck,
  MapPin,
  ScanBarcode,
  Image as ImageIcon,
  FileText,
  AlertTriangle,
  Phone,
  ShoppingBag,
  RefreshCw,
  Truck,
  Check
} from 'lucide-react';
import { supabase } from '../../presupuesto/utils/supabaseClient';
import { sendDeliveryRequest } from '../../delivery/utils/telegramService';

// Utilidades hápticas y de audio para confirmación táctil en móvil
const triggerHaptic = (pattern) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {}
  }
};

const playBeep = (freq = 880, duration = 0.08) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
};

export default function OrderPreparation() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fiscalInvoicePicked, setFiscalInvoicePicked] = useState({});
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [activeTab, setActiveTab] = useState('PENDING'); // PENDING | IN_PROGRESS | PACKED
  const [channel, setChannel] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const knownOrderIdsRef = useRef(new Set());

  // Habilitar scroll fluido en body y html en móvil
  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'auto';
    document.body.style.overflow = 'auto';
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  const fetchOrders = async () => {
    setIsRefreshing(true);
    const workspaceId = localStorage.getItem('activeWorkspace');
    try {
      let query = supabase.from('ecommerce_orders_v2').select('*');
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }
      
      const { data, error } = await query.order('date', { ascending: false });
      if (error) throw error;
      
      const safeData = (data || []).map(order => ({
        ...order,
        date: new Date(order.date).toLocaleString(),
        paymentMethod: order.paymentmethod,
        paymentStatus: order.paymentstatus,
        paymentDetails: typeof order.paymentdetails === 'string' ? JSON.parse(order.paymentdetails) : order.paymentdetails,
        shippingInfo: typeof order.shipping_info === 'string' ? JSON.parse(order.shipping_info) : order.shipping_info,
        items: typeof order.items === 'string' ? JSON.parse(order.items) : (Array.isArray(order.items) ? order.items : []),
        deliveryPin: order.delivery_pin,
        isMobile: order.ismobile
      }));
      
      // Alerta sonora para nuevos pedidos entrantes
      const newOrders = safeData.filter(o => !knownOrderIdsRef.current.has(o.id));
      if (newOrders.length > 0 && knownOrderIdsRef.current.size > 0) {
        triggerHaptic([100, 80, 150]);
        playBeep(980, 0.15);
      }
      safeData.forEach(o => knownOrderIdsRef.current.add(o.id));

      setOrders(safeData);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setOrders([]);
      setIsLoading(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 6000);
    return () => clearInterval(interval);
  }, []);

  // Setup Realtime Subscription
  useEffect(() => {
    const pickingChannel = supabase.channel('picking-sync', {
      config: {
        broadcast: { ack: false },
      },
    });

    pickingChannel
      .on('broadcast', { event: 'UPDATE_ORDERS' }, (payload) => {
        if (payload.payload) {
          const safeData = payload.payload.map(order => ({
            ...order,
            items: Array.isArray(order.items) ? order.items : []
          }));
          setOrders(safeData);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ecommerce_orders_v2' }, () => {
        fetchOrders();
      })
      .subscribe();

    setChannel(pickingChannel);

    return () => {
      pickingChannel.unsubscribe();
    };
  }, []);

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
    triggerHaptic(30);
    playBeep(880, 0.05);

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

  const toggleFiscalInvoice = (orderId) => {
    triggerHaptic(40);
    playBeep(920, 0.06);
    setFiscalInvoicePicked(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const markOrderAsReady = async (orderId) => {
    const orderToSend = orders.find(o => o.id === orderId);
    if (!orderToSend) return;

    triggerHaptic([100, 50, 200]);
    playBeep(1046, 0.2);

    let newDeliveryPin = orderToSend.deliveryPin;
    if (!newDeliveryPin) {
      newDeliveryPin = Math.floor(100000 + Math.random() * 900000).toString();
    }

    const updatedOrders = orders.map(order => 
      order.id === orderId ? { ...order, status: 'Enviado', deliveryPin: newDeliveryPin } : order
    );
    setOrders(updatedOrders);
    
    // Regresar a la lista de pedidos de inmediato
    setSelectedOrderId(null);
    
    try {
      supabase.from('ecommerce_orders_v2')
        .update({ status: 'Enviado', delivery_pin: newDeliveryPin })
        .eq('id', orderId)
        .then(({ error }) => { 
          if (error) console.error(error); 
          else {
            supabase.channel('support_orders_updates').send({ type: 'broadcast', event: 'order_updated', payload: { orderId } });
          }
        });
    } catch (e) { console.error(e); }

    // Enviar a Telegram directamente desde Picking
    if (orderToSend) {
      const customerData = {
        name: orderToSend.customer,
        phone: orderToSend.paymentDetails?.phone || 'Sin número',
        address: orderToSend.address || 'Dirección del cliente',
        location: orderToSend.shipping_info?.location || null,
        zone: 'Centro de la ciudad',
        packageType: 'Paquete E-commerce',
        productList: `Pedido ${orderToSend.id} (${orderToSend.items?.length || 0} artículos)`,
        weight: 1,
        quantity: 1,
        deliveryPin: newDeliveryPin
      };

      try {
        const res = await sendDeliveryRequest('Tienda Principal', customerData, orderToSend.id);
        if (!res.success) {
          console.error("Error al enviar a Telegram: ", res.error);
        }
      } catch (errTel) {
        console.warn('Error notificando Telegram:', errTel);
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
  };

  // Calcular progreso — incluye la Factura Fiscal como paso obligatorio (SENIAT Art. 57)
  const getProgress = (order) => {
    if (!order || !Array.isArray(order.items) || order.items.length === 0) return 0;
    const pickedCount = order.items.filter(i => i.picked).length;
    const invoicePicked = fiscalInvoicePicked[order.id] ? 1 : 0;
    const totalSteps = order.items.length + 1; // +1 por la factura fiscal
    return Math.round(((pickedCount + invoicePicked) / totalSteps) * 100);
  };

  // Clasificación de Pedidos en pestañas idénticas a AxonPOS
  const pendingOrders = orders.filter(o => o.status === 'Preparando' || o.status === 'ACCEPTED' || o.status === 'Pendiente');
  const inProgressOrders = orders.filter(o => {
    if (o.status !== 'Preparando') return false;
    const hasPicked = o.items.some(i => i.picked);
    const allPicked = o.items.every(i => i.picked) && fiscalInvoicePicked[o.id];
    return hasPicked && !allPicked;
  });
  const packedOrders = orders.filter(o => o.status === 'Enviado' || o.status === 'Entregado' || o.status === 'COMPLETED');

  const visibleOrders = activeTab === 'PENDING' ? pendingOrders : activeTab === 'IN_PROGRESS' ? inProgressOrders : packedOrders;

  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  // ==========================================================================
  // PANTALLA 1: CHECKLIST DETALLADO DE PRODUCTOS A EMPACAR
  // Garantiza scroll táctil continuo sin límites de altura ni bloqueos
  // ==========================================================================
  if (selectedOrder) {
    const totalItems = selectedOrder.items?.length || 0;
    const pickedCount = selectedOrder.items?.filter(i => i.picked).length || 0;
    const isInvoiceChecked = !!fiscalInvoicePicked[selectedOrder.id];
    const progressPercent = getProgress(selectedOrder);
    const isCompleted = progressPercent === 100;
    const deliveryType = selectedOrder.shippingInfo?.type === 'pickup' ? 'PICKUP' : 'DELIVERY';

    return (
      <div
        style={{
          minHeight: '100dvh',
          height: '100%',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorY: 'contain',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          userSelect: 'none',
          boxSizing: 'border-box'
        }}
      >
        {/* Barra Superior Fija con Botón Volver y Progreso */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            padding: '12px 16px',
            boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <button
              type="button"
              onClick={() => {
                triggerHaptic(40);
                setSelectedOrderId(null);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                border: 'none',
                color: '#64748B',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '4px 0'
              }}
            >
              <ArrowLeft size={18} />
              <span>Volver a Pedidos</span>
            </button>

            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '14px',
                fontWeight: 900,
                color: '#0F172A',
                backgroundColor: '#F1F5F9',
                padding: '3px 10px',
                borderRadius: '8px'
              }}
            >
              #{selectedOrder.id}
            </span>
          </div>

          {/* Barra de Progreso Luminous */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800, marginBottom: '6px' }}>
              <span style={{ color: '#0F172A' }}>
                {pickedCount + (isInvoiceChecked ? 1 : 0)} de {totalItems + 1} pasos completados
              </span>
              <span style={{ color: isCompleted ? '#059669' : '#EA580C' }}>{progressPercent}%</span>
            </div>

            <div
              style={{
                height: '8px',
                backgroundColor: '#E2E8F0',
                borderRadius: '9999px',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  backgroundColor: isCompleted ? '#10B981' : '#EA580C',
                  transition: 'width 0.25s ease'
                }}
              />
            </div>
          </div>
        </header>

        {/* Contenido Principal con Scroll Fluido y Padding Inferior Holgado (140px) */}
        <main style={{ flex: 1, padding: '16px 16px 140px 16px', display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '720px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          
          {/* Tarjeta de Cliente y Entrega */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              padding: '14px 16px',
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {selectedOrder.customer || 'Cliente'}
                </h3>
                {selectedOrder.paymentDetails?.phone && (
                  <a
                    href={`tel:${selectedOrder.paymentDetails.phone}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      color: '#0284C7',
                      textDecoration: 'none',
                      marginTop: '3px',
                      fontWeight: 700
                    }}
                  >
                    <Phone size={12} />
                    <span>{selectedOrder.paymentDetails.phone}</span>
                  </a>
                )}
              </div>

              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 800,
                  backgroundColor: deliveryType === 'DELIVERY' ? '#EFF6FF' : '#FEF3C7',
                  color: deliveryType === 'DELIVERY' ? '#1D4ED8' : '#B45309',
                  border: `1px solid ${deliveryType === 'DELIVERY' ? '#BFDBFE' : '#FDE68A'}`
                }}
              >
                {deliveryType === 'DELIVERY' ? '🛵 Delivery' : '🏪 Retiro'}
              </span>
            </div>

            {selectedOrder.address && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px',
                  fontSize: '12px',
                  color: '#475569',
                  marginTop: '8px'
                }}
              >
                <MapPin size={14} color="#94A3B8" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{selectedOrder.address}</span>
              </div>
            )}

            {selectedOrder.notes && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '10px 12px',
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: '#B45309',
                  lineHeight: 1.4
                }}
              >
                <strong>Nota del cliente:</strong> {selectedOrder.notes}
              </div>
            )}
          </div>

          {/* Checklist Táctil de Productos (Soporta 10, 20 o más productos con scroll suave) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B' }}>
              Productos a Empacar ({totalItems})
            </div>

            {selectedOrder.items?.map((item) => {
              const isChecked = !!item.picked;

              return (
                <div
                  key={item.id}
                  onClick={() => toggleItemPick(selectedOrder.id, item.id)}
                  style={{
                    backgroundColor: isChecked ? '#ECFDF5' : '#FFFFFF',
                    border: '1.5px solid',
                    borderColor: isChecked ? '#10B981' : '#E2E8F0',
                    borderRadius: '16px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isChecked
                      ? '0 4px 12px rgba(16, 185, 129, 0.1)'
                      : '0 2px 6px rgba(15, 23, 42, 0.03)'
                  }}
                >
                  {/* Casilla Táctil Grande */}
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      border: '2px solid',
                      borderColor: isChecked ? '#10B981' : '#CBD5E1',
                      backgroundColor: isChecked ? '#10B981' : '#FFFFFF',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isChecked && <Check size={18} strokeWidth={3} />}
                  </div>

                  {/* Foto o Icono del Producto */}
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '10px',
                      backgroundColor: '#F1F5F9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0,
                      border: '1px solid #E2E8F0'
                    }}
                  >
                    {item.image ? (
                      <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <ImageIcon size={20} color="#94A3B8" />
                    )}
                  </div>

                  {/* Nombre y Detalles */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        color: isChecked ? '#065F46' : '#0F172A',
                        textDecoration: isChecked ? 'line-through' : 'none',
                        lineHeight: 1.3
                      }}
                    >
                      {item.name}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          color: isChecked ? '#047857' : '#64748B',
                          backgroundColor: isChecked ? '#D1FAE5' : '#F1F5F9',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontWeight: 600
                        }}
                      >
                        {item.sku ? `Cód: ${item.sku}` : 'Almacén Central'}
                      </span>

                      {item.price && (
                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                          ${Number(item.price).toFixed(2)} c/u
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Badge de Cantidad Solicitada */}
                  <div
                    style={{
                      padding: '6px 12px',
                      borderRadius: '10px',
                      backgroundColor: isChecked ? '#10B981' : '#FFEDD5',
                      color: isChecked ? '#FFFFFF' : '#EA580C',
                      fontWeight: 900,
                      fontSize: '14px',
                      flexShrink: 0
                    }}
                  >
                    x {item.quantity}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sección Fiscal Obligatoria SENIAT (Art. 57 Ley IVA) */}
          <div
            onClick={() => toggleFiscalInvoice(selectedOrder.id)}
            style={{
              backgroundColor: isInvoiceChecked ? '#ECFDF5' : '#FFFBEB',
              border: '1.5px dashed',
              borderColor: isInvoiceChecked ? '#10B981' : '#F59E0B',
              borderRadius: '16px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              marginTop: '4px'
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                border: '2px solid',
                borderColor: isInvoiceChecked ? '#10B981' : '#F59E0B',
                backgroundColor: isInvoiceChecked ? '#10B981' : '#FFFFFF',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {isInvoiceChecked && <Check size={18} strokeWidth={3} />}
            </div>

            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: isInvoiceChecked ? '#D1FAE5' : '#FEF3C7',
                color: isInvoiceChecked ? '#059669' : '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <FileText size={22} />
            </div>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  color: isInvoiceChecked ? '#065F46' : '#92400E',
                  textDecoration: isInvoiceChecked ? 'line-through' : 'none'
                }}
              >
                Factura Fiscal Física (Original y Copia)
              </div>
              <div style={{ fontSize: '11px', color: '#B45309', marginTop: '2px' }}>
                Obligatorio para despacho comercial — Art. 57 Ley IVA
              </div>
            </div>

            {!isInvoiceChecked && (
              <span style={{ fontSize: '10px', fontWeight: 900, backgroundColor: '#FEE2E2', color: '#DC2626', padding: '2px 8px', borderRadius: '6px' }}>
                Pendiente
              </span>
            )}
          </div>
        </main>

        {/* Botón Flotante Inferior Sticky (Nunca se superpone gracias al padding-bottom de 140px) */}
        <footer
          style={{
            position: 'sticky',
            bottom: 0,
            backgroundColor: '#FFFFFF',
            borderTop: '1px solid #E2E8F0',
            padding: '14px 16px',
            boxShadow: '0 -4px 16px rgba(15, 23, 42, 0.05)',
            zIndex: 40
          }}
        >
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            {isCompleted ? (
              <button
                type="button"
                onClick={() => markOrderAsReady(selectedOrder.id)}
                style={{
                  width: '100%',
                  height: '52px',
                  borderRadius: '14px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#FFFFFF',
                  fontSize: '15px',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)'
                }}
              >
                <ShieldCheck size={20} />
                <span>✓ Despachar Pedido</span>
              </button>
            ) : (
              <button
                type="button"
                disabled
                style={{
                  width: '100%',
                  height: '50px',
                  borderRadius: '14px',
                  border: '1px solid #FED7AA',
                  backgroundColor: '#FFF7ED',
                  color: '#EA580C',
                  fontSize: '13px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'not-allowed',
                  opacity: 0.95
                }}
              >
                <span>
                  {!selectedOrder.items?.every(i => i.picked)
                    ? `Faltan ${totalItems - pickedCount} productos por empacar`
                    : 'Confirma la Factura Fiscal para despachar'}
                </span>
              </button>
            )}
          </div>
        </footer>
      </div>
    );
  }

  // ==========================================================================
  // PANTALLA 2: TABLERO DE PEDIDOS WEB ENTRANTES (Formato Unificado AxonPOS)
  // ==========================================================================
  return (
    <div
      style={{
        minHeight: '100dvh',
        height: '100%',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        overscrollBehaviorY: 'contain',
        backgroundColor: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        userSelect: 'none',
        boxSizing: 'border-box'
      }}
    >
      {/* Cabecera Superior del Empacador */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              backgroundColor: '#FFF7ED',
              color: '#EA580C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #FED7AA'
            }}
          >
            <Package size={22} strokeWidth={2.4} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '15px', fontWeight: 900, color: '#0F172A' }}>
                Estación de Picking
              </span>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
            </div>
            <div style={{ fontSize: '11px', color: '#64748B' }}>
              AxonMarket • <strong style={{ color: '#EA580C' }}>Empaque y Despacho</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={fetchOrders}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              color: '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Refrescar pedidos"
          >
            <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Pestañas de Estado E-commerce (Idénticas a AxonPOS) */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          padding: '6px 12px 0',
          maxWidth: '720px',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box'
        }}
      >
        <button
          type="button"
          onClick={() => {
            triggerHaptic(20);
            setActiveTab('PENDING');
          }}
          style={{
            padding: '10px 0',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'PENDING' ? '3px solid #EA580C' : '3px solid transparent',
            color: activeTab === 'PENDING' ? '#EA580C' : '#64748B',
            fontWeight: 800,
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <span>Por Empacar</span>
          <span
            style={{
              padding: '1px 6px',
              borderRadius: '9999px',
              fontSize: '10px',
              backgroundColor: activeTab === 'PENDING' ? '#FFEDD5' : '#F1F5F9',
              color: activeTab === 'PENDING' ? '#C2410C' : '#64748B'
            }}
          >
            {pendingOrders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic(20);
            setActiveTab('IN_PROGRESS');
          }}
          style={{
            padding: '10px 0',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'IN_PROGRESS' ? '3px solid #F59E0B' : '3px solid transparent',
            color: activeTab === 'IN_PROGRESS' ? '#D97706' : '#64748B',
            fontWeight: 800,
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <span>En Proceso</span>
          <span
            style={{
              padding: '1px 6px',
              borderRadius: '9999px',
              fontSize: '10px',
              backgroundColor: activeTab === 'IN_PROGRESS' ? '#FEF3C7' : '#F1F5F9',
              color: activeTab === 'IN_PROGRESS' ? '#B45309' : '#64748B'
            }}
          >
            {inProgressOrders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic(20);
            setActiveTab('PACKED');
          }}
          style={{
            padding: '10px 0',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'PACKED' ? '3px solid #10B981' : '3px solid transparent',
            color: activeTab === 'PACKED' ? '#10B981' : '#64748B',
            fontWeight: 800,
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <span>Listos</span>
          <span
            style={{
              padding: '1px 6px',
              borderRadius: '9999px',
              fontSize: '10px',
              backgroundColor: activeTab === 'PACKED' ? '#D1FAE5' : '#F1F5F9',
              color: activeTab === 'PACKED' ? '#047857' : '#64748B'
            }}
          >
            {packedOrders.length}
          </span>
        </button>
      </div>

      {/* Lista de Pedidos E-commerce con Scroll Fluido Holgado */}
      <main style={{ flex: 1, padding: '16px 16px 100px 16px', display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '720px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {visibleOrders.length === 0 ? (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px dashed #CBD5E1',
              padding: '40px 20px',
              textAlign: 'center',
              color: '#94A3B8'
            }}
          >
            <ShoppingBag size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#475569' }}>
              No hay pedidos en esta sección
            </div>
            <p style={{ fontSize: '12px', margin: '4px 0 0' }}>
              Los pedidos nuevos de AxonMarket aparecerán aquí automáticamente en tiempo real.
            </p>
          </div>
        ) : (
          visibleOrders.map((order) => {
            const itemCount = order.items?.length || 0;
            const totalUnits = order.items?.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0) || 0;
            const isDelivery = order.shippingInfo?.type !== 'pickup';

            return (
              <div
                key={order.id}
                onClick={() => {
                  triggerHaptic(30);
                  setSelectedOrderId(order.id);
                }}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '18px',
                  border: '1px solid #E2E8F0',
                  padding: '16px',
                  boxShadow: '0 3px 10px rgba(15, 23, 42, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, border-color 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '14px',
                        fontWeight: 900,
                        color: '#0F172A',
                        backgroundColor: '#F1F5F9',
                        padding: '3px 8px',
                        borderRadius: '6px'
                      }}
                    >
                      #{order.id}
                    </span>

                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '10px',
                        fontWeight: 800,
                        backgroundColor: isDelivery ? '#EFF6FF' : '#FEF3C7',
                        color: isDelivery ? '#1D4ED8' : '#B45309'
                      }}
                    >
                      {isDelivery ? '🛵 Delivery' : '🏪 Retiro'}
                    </span>
                  </div>

                  <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>
                    {order.date}
                  </span>
                </div>

                <div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#0F172A' }}>
                    {order.customer || 'Cliente'}
                  </div>
                  {order.address && (
                    <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <MapPin size={12} color="#94A3B8" />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{order.address}</span>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '8px',
                    borderTop: '1px solid #F1F5F9'
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                    📦 {itemCount} productos • <strong style={{ color: '#EA580C' }}>{totalUnits} unidades</strong>
                  </span>

                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      fontWeight: 800,
                      color: '#EA580C'
                    }}
                  >
                    <span>Preparar</span>
                    <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
