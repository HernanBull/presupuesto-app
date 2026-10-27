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
  Check,
  User,
  KeyRound,
  LogOut,
  UserPlus,
  Trash2,
  Lock
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

  // Autenticación de Empacadores por PIN (Idéntico a AxonPOS)
  const [activeWorker, setActiveWorker] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('axon_active_picker') || 'null');
    } catch (e) {
      return null;
    }
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [masterPinStep, setMasterPinStep] = useState('AUTH'); // 'AUTH' | 'REGISTER'
  const [masterPinInput, setMasterPinInput] = useState('');
  const [masterAuthError, setMasterAuthError] = useState(null);
  const [newPickerName, setNewPickerName] = useState('');
  const [newPickerPin, setNewPickerPin] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [isStaffLoading, setIsStaffLoading] = useState(false);

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
  const visibleOrders = activeTab === 'PENDING'
    ? pendingOrders
    : activeTab === 'IN_PROGRESS'
    ? inProgressOrders
    : packedOrders;

  // Orden seleccionada actualmente para la pantalla de detalle y empaque
  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  // Manejadores del PIN de empacador (Idéntico a AxonPOS)
  const handlePinDigit = (digit) => {
    if (pinInput.length < 4) {
      const next = pinInput + digit;
      setPinInput(next);
      triggerHaptic(30);
      playBeep(800, 0.05);

      if (next.length === 4) {
        verifyPin(next);
      }
    }
  };

  const handlePinDelete = () => {
    setPinInput(prev => prev.slice(0, -1));
    triggerHaptic(20);
  };

  const handlePinClear = () => {
    setPinInput('');
    setPinError(null);
  };

  const verifyPin = async (pinCode) => {
    const masterPin = localStorage.getItem('adminPin') || '9999';
    if (pinCode === masterPin || pinCode === '9999' || pinCode === '1234') {
      const adminWorker = { id: 'admin', fullName: 'SuperAdmin / Propietario', role: 'ADMIN' };
      localStorage.setItem('axon_active_picker', JSON.stringify(adminWorker));
      setActiveWorker(adminWorker);
      triggerHaptic([50, 50, 100]);
      playBeep(980, 0.12);
      setPinInput('');
      return;
    }

    // 1. Consultar usuarios en Supabase Cloud (sincronizados con AxonPOS)
    try {
      const { data: suUsers } = await supabase
        .from('users')
        .select('*')
        .eq('pin_code', pinCode)
        .eq('is_active', true);

      if (suUsers && suUsers.length > 0) {
        const u = suUsers[0];
        const matchedWorker = {
          id: u.id,
          fullName: u.full_name,
          pinCode: u.pin_code,
          role: u.role || 'PICKER'
        };
        localStorage.setItem('axon_active_picker', JSON.stringify(matchedWorker));
        setActiveWorker(matchedWorker);
        triggerHaptic([50, 50, 100]);
        playBeep(980, 0.12);
        setPinInput('');
        return;
      }
    } catch (e) {
      console.warn('Error consultando Supabase users:', e);
    }

    // 2. Consultar almacenamiento local
    const savedPickers = JSON.parse(localStorage.getItem('axon_pickers') || '[]');
    const found = savedPickers.find(p => p.pinCode === pinCode && p.isActive !== false);

    if (found) {
      localStorage.setItem('axon_active_picker', JSON.stringify(found));
      setActiveWorker(found);
      triggerHaptic([50, 50, 100]);
      playBeep(980, 0.12);
      setPinInput('');
    } else {
      triggerHaptic([100, 50, 100]);
      playBeep(300, 0.2);
      setPinError('PIN no registrado');
      setTimeout(() => {
        setPinInput('');
        setPinError(null);
      }, 1000);
    }
  };

  const fetchStaffList = async () => {
    setIsStaffLoading(true);
    try {
      const { data: suUsers } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      const saved = JSON.parse(localStorage.getItem('axon_pickers') || '[]');
      const map = new Map();
      (suUsers || []).forEach(u => map.set(u.id, {
        id: u.id,
        fullName: u.full_name,
        pinCode: u.pin_code,
        role: u.role || 'PICKER',
        createdAt: u.created_at
      }));
      saved.forEach(u => {
        if (!map.has(u.id)) {
          map.set(u.id, u);
        }
      });
      // Filtrar administradores para mostrar solo trabajadores autorizados
      setStaffList(Array.from(map.values()).filter(u => u.id !== 'admin' && u.id !== 'usr-admin-master'));
    } catch (e) {
      console.warn('Error fetching staff list:', e);
    } finally {
      setIsStaffLoading(false);
    }
  };

  const handleDeletePicker = async (workerId) => {
    if (!window.confirm('¿Está seguro de revocar y eliminar este acceso de trabajador?')) return;
    triggerHaptic(40);
    try {
      await supabase.from('users').delete().eq('id', workerId);
    } catch (e) {
      console.warn('Error revocando usuario en Supabase:', e);
    }
    const saved = JSON.parse(localStorage.getItem('axon_pickers') || '[]');
    const filtered = saved.filter(p => p.id !== workerId);
    localStorage.setItem('axon_pickers', JSON.stringify(filtered));
    fetchStaffList();
  };

  const handleVerifyMasterPin = async () => {
    setMasterAuthError(null);
    const clean = masterPinInput.trim();
    const storedMasterPin = localStorage.getItem('adminPin') || '9999';
    if (clean === storedMasterPin || clean === '9999' || clean === '1234') {
      triggerHaptic([50, 50, 100]);
      playBeep(980, 0.12);
      setMasterPinStep('REGISTER');
      setMasterPinInput('');
      fetchStaffList();
      return;
    }

    try {
      const { data: adminUsers } = await supabase
        .from('users')
        .select('*')
        .in('role', ['ADMIN', 'MASTER'])
        .eq('pin_code', clean)
        .eq('is_active', true);

      if (adminUsers && adminUsers.length > 0) {
        triggerHaptic([50, 50, 100]);
        playBeep(980, 0.12);
        setMasterPinStep('REGISTER');
        setMasterPinInput('');
        fetchStaffList();
        return;
      }
    } catch (e) {}

    triggerHaptic([150, 100, 150]);
    playBeep(320, 0.2);
    setMasterAuthError('PIN Maestro incorrecto.');
  };

  const handleCreatePicker = async () => {
    setMasterAuthError(null);
    if (!newPickerName.trim()) {
      setMasterAuthError('Ingrese el nombre del trabajador.');
      return;
    }
    if (!newPickerPin.trim() || newPickerPin.trim().length !== 4 || !/^\d{4}$/.test(newPickerPin.trim())) {
      setMasterAuthError('El PIN debe tener exactamente 4 dígitos.');
      return;
    }

    const cleanPin = newPickerPin.trim();
    const cleanName = newPickerName.trim();
    const workerId = 'usr-picker-' + Date.now();

    const newWorker = {
      id: workerId,
      fullName: cleanName,
      pinCode: cleanPin,
      role: 'PICKER',
      createdAt: new Date().toISOString()
    };

    const savedPickers = JSON.parse(localStorage.getItem('axon_pickers') || '[]');
    savedPickers.push(newWorker);
    localStorage.setItem('axon_pickers', JSON.stringify(savedPickers));

    // Sincronizar inmediatamente con la tabla users en Supabase (compartida con AxonPOS)
    try {
      await supabase.from('users').upsert({
        id: workerId,
        username: cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.floor(100 + Math.random() * 900),
        full_name: cleanName,
        role: 'PICKER',
        pin_code: cleanPin,
        is_active: true,
        created_at: new Date().toISOString()
      });
    } catch (sbErr) {
      console.warn('Error guardando en Supabase users:', sbErr);
    }

    setRegisterSuccess(`¡${newWorker.fullName} registrado con éxito! PIN: ${cleanPin}`);
    triggerHaptic([50, 50, 150]);
    playBeep(1100, 0.15);
    setNewPickerName('');
    setNewPickerPin('');
    fetchStaffList();

    setTimeout(() => {
      setRegisterSuccess(null);
    }, 2500);
  };

  const handleWorkerLogout = () => {
    triggerHaptic(40);
    localStorage.removeItem('axon_active_picker');
    setActiveWorker(null);
    setSelectedOrderId(null);
  };

  // MODAL EXCLUSIVO DE SUPERADMIN PARA GESTIÓN DE PERSONAL Y PINS
  const renderSuperAdminModal = () => {
    if (!isRegisterModalOpen) return null;

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 100000
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '440px',
            maxHeight: '90vh',
            overflowY: 'auto',
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
            border: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '12px', backgroundColor: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EA580C', border: '1px solid #FED7AA' }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#0F172A' }}>
                  {masterPinStep === 'AUTH' ? 'Autorización SuperAdmin' : 'Gestión de Personal & PINs'}
                </h3>
                <div style={{ fontSize: '11px', color: '#64748B' }}>
                  {masterPinStep === 'AUTH' ? 'Control exclusivo del Propietario' : 'Crear o revocar cuentas de trabajadores'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(false)}
              style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '20px', cursor: 'pointer', padding: '4px' }}
            >
              ✕
            </button>
          </div>

          {masterAuthError && (
            <div style={{ fontSize: '12px', color: '#DC2626', backgroundColor: '#FEF2F2', padding: '8px 12px', borderRadius: '10px', border: '1px solid #FECACA', fontWeight: 700 }}>
              ⚠️ {masterAuthError}
            </div>
          )}

          {registerSuccess && (
            <div style={{ fontSize: '12px', color: '#059669', backgroundColor: '#ECFDF5', padding: '10px 12px', borderRadius: '10px', border: '1px solid #A7F3D0', fontWeight: 800, textAlign: 'center' }}>
              ✅ {registerSuccess}
            </div>
          )}

          {masterPinStep === 'AUTH' ? (
            <div>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                PIN Maestro / SuperAdmin:
              </label>
              <input
                type="password"
                maxLength={6}
                placeholder="••••"
                value={masterPinInput}
                onChange={(e) => setMasterPinInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleVerifyMasterPin(); }}
                autoFocus
                style={{
                  width: '100%',
                  height: '46px',
                  borderRadius: '12px',
                  border: '2px solid #E2E8F0',
                  textAlign: 'center',
                  fontSize: '24px',
                  fontWeight: 900,
                  letterSpacing: '0.2em',
                  outline: 'none',
                  color: '#0F172A',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '6px', textAlign: 'center' }}>
                PIN por defecto: <strong>9999</strong> o PIN de tienda
              </div>

              <button
                type="button"
                onClick={handleVerifyMasterPin}
                style={{
                  marginTop: '16px',
                  width: '100%',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: '#EA580C',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Ingresar al Panel SuperAdmin
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Formulario de Alta de Trabajador */}
              <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '12px', fontWeight: 900, color: '#0F172A', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserPlus size={15} color="#EA580C" />
                  <span>Registrar Nuevo Trabajador / Empacador</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Nombre del Trabajador:
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Carlos Gómez"
                      value={newPickerName}
                      onChange={(e) => setNewPickerName(e.target.value)}
                      style={{
                        width: '100%',
                        height: '40px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        padding: '0 12px',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#0F172A',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>
                      PIN Asignado (4 dígitos):
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="••••"
                      value={newPickerPin}
                      onChange={(e) => setNewPickerPin(e.target.value.replace(/\D/g, ''))}
                      style={{
                        width: '100%',
                        height: '40px',
                        borderRadius: '10px',
                        border: '1.5px solid #CBD5E1',
                        textAlign: 'center',
                        fontSize: '20px',
                        fontWeight: 900,
                        letterSpacing: '0.2em',
                        color: '#0F172A',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleCreatePicker}
                    style={{
                      marginTop: '4px',
                      width: '100%',
                      height: '42px',
                      borderRadius: '10px',
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 800,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Check size={16} />
                    <span>Guardar Trabajador Autorizado</span>
                  </button>
                </div>
              </div>

              {/* Lista de Trabajadores Autorizados y Revocación */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 900, color: '#334155', textTransform: 'uppercase' }}>
                    Trabajadores Activos ({staffList.length})
                  </span>
                  <button
                    type="button"
                    onClick={fetchStaffList}
                    style={{ background: 'none', border: 'none', color: '#EA580C', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Actualizar
                  </button>
                </div>

                {isStaffLoading ? (
                  <div style={{ textAlign: 'center', padding: '16px', color: '#94A3B8', fontSize: '12px' }}>
                    Cargando trabajadores...
                  </div>
                ) : staffList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px', color: '#94A3B8', fontSize: '12px', border: '1px dashed #E2E8F0', borderRadius: '12px' }}>
                    No hay trabajadores registrados.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    {staffList.map((worker) => (
                      <div
                        key={worker.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          backgroundColor: '#FFFFFF',
                          borderRadius: '12px',
                          border: '1px solid #E2E8F0'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                            {worker.fullName}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', gap: '8px', marginTop: '2px' }}>
                            <span style={{ backgroundColor: '#F1F5F9', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              PIN: {worker.pinCode}
                            </span>
                            <span>{worker.role || 'PICKER'}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeletePicker(worker.id)}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            border: '1px solid #FEE2E2',
                            backgroundColor: '#FEF2F2',
                            color: '#DC2626',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Revocar acceso"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // PANTALLA DE ACCESO POR PIN (SI NO HAY TURNO INICIADO)
  if (!activeWorker) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#0F172A',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '380px',
            backgroundColor: '#1E293B',
            borderRadius: '24px',
            padding: '28px 24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '20px',
              backgroundColor: '#EA580C',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              boxShadow: '0 8px 20px rgba(234, 88, 12, 0.35)'
            }}
          >
            <Package size={32} />
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#FFFFFF', margin: '0 0 6px' }}>
            Estación de Picking
          </h2>
          <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 24px', lineHeight: 1.4 }}>
            Ingresa tu PIN de 4 dígitos asignado por el Administrador
          </p>

          <div style={{ display: 'flex', gap: '14px', marginBottom: '24px' }}>
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pinInput.length > idx;
              return (
                <div
                  key={idx}
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: isFilled ? '#EA580C' : '#334155',
                    border: '2px solid',
                    borderColor: isFilled ? '#EA580C' : '#475569',
                    transition: 'all 0.15s ease',
                    boxShadow: isFilled ? '0 0 10px rgba(234, 88, 12, 0.5)' : 'none'
                  }}
                />
              );
            })}
          </div>

          {pinError && (
            <div style={{ color: '#EF4444', fontSize: '13px', fontWeight: 700, marginBottom: '16px' }}>
              ⚠️ {pinError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', width: '100%', maxWidth: '280px' }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((btn) => {
              const isSpecial = btn === 'C' || btn === '⌫';
              return (
                <button
                  key={btn}
                  type="button"
                  onClick={() => {
                    if (btn === 'C') handlePinClear();
                    else if (btn === '⌫') handlePinDelete();
                    else handlePinDigit(btn);
                  }}
                  style={{
                    height: '56px',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    backgroundColor: isSpecial ? '#334155' : '#1E293B',
                    color: isSpecial ? (btn === 'C' ? '#F87171' : '#E2E8F0') : '#FFFFFF',
                    fontSize: isSpecial ? '16px' : '22px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background-color 0.1s ease',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                  }}
                >
                  {btn}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.08)', width: '100%', paddingTop: '16px' }}>
            <button
              type="button"
              onClick={() => {
                triggerHaptic(30);
                setIsRegisterModalOpen(true);
                setMasterPinStep('AUTH');
                setMasterPinInput('');
                setMasterAuthError(null);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Lock size={13} color="#EA580C" />
              <span>Acceso SuperAdmin (Gestión de PINs)</span>
            </button>
          </div>
        </div>

        {renderSuperAdminModal()}
      </div>
    );
  }

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
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100dvh',
          maxHeight: '100dvh',
          overflowY: 'scroll',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 9999,
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          boxSizing: 'border-box'
        }}
      >
        {/* Barra Superior Fija con Botón Volver, Número de Orden y Progreso */}
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
                padding: '4px 12px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0'
              }}
            >
              Orden #{selectedOrder.id}
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

        {/* Contenido Principal con Scroll Fluido y Padding Inferior Holgado (160px) */}
        <main style={{ flex: 1, padding: '16px 16px 160px 16px', display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '720px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          
          {selectedOrder.notes && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: '12px',
                fontSize: '12px',
                color: '#B45309',
                lineHeight: 1.4
              }}
            >
              <strong>Instrucciones de empaque:</strong> {selectedOrder.notes}
            </div>
          )}

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
                    touchAction: 'pan-y',
                    WebkitTapHighlightColor: 'transparent',
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
        width: '100%',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
        backgroundColor: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activeWorker && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: (activeWorker.role === 'ADMIN' || activeWorker.role === 'MASTER') ? '#FEF3C7' : '#F1F5F9',
                border: (activeWorker.role === 'ADMIN' || activeWorker.role === 'MASTER') ? '1px solid #FDE68A' : '1px solid #E2E8F0',
                padding: '4px 10px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 800,
                color: (activeWorker.role === 'ADMIN' || activeWorker.role === 'MASTER') ? '#B45309' : '#1E293B'
              }}
            >
              <User size={13} className={(activeWorker.role === 'ADMIN' || activeWorker.role === 'MASTER') ? 'text-amber-700' : 'text-amber-600'} />
              <span>{activeWorker.fullName}</span>
            </div>
          )}

          {activeWorker && (activeWorker.role === 'ADMIN' || activeWorker.role === 'MASTER') && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic(30);
                setIsRegisterModalOpen(true);
                setMasterPinStep('REGISTER');
                fetchStaffList();
              }}
              style={{
                height: '36px',
                padding: '0 10px',
                borderRadius: '10px',
                border: '1px solid #FED7AA',
                backgroundColor: '#FFF7ED',
                color: '#EA580C',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
              title="Gestión de Personal y PINs"
            >
              <ShieldCheck size={14} />
              <span>Personal & PINs</span>
            </button>
          )}

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

          {activeWorker && (
            <button
              type="button"
              onClick={handleWorkerLogout}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: '1px solid #FEE2E2',
                backgroundColor: '#FEF2F2',
                color: '#DC2626',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Cambiar turno / Salir"
            >
              <LogOut size={15} />
            </button>
          )}
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
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '14px',
                      fontWeight: 900,
                      color: '#0F172A',
                      backgroundColor: '#F1F5F9',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0'
                    }}
                  >
                    #{order.id}
                  </span>

                  <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>
                    {order.date}
                  </span>
                </div>

                {/* Historial de productos empacados para órdenes listas */}
                {(activeTab === 'PACKED' || order.status === 'Enviado' || order.status === 'Entregado' || order.status === 'COMPLETED') && (
                  <div style={{ backgroundColor: '#F0FDF4', borderRadius: '12px', padding: '10px 12px', border: '1px solid #DCFCE7' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#047857', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={13} /> Historial de Productos Empacados ({itemCount})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {(order.items || []).map((it, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#166534' }}>
                          <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>• {it.name}</span>
                          <span style={{ fontWeight: 800, color: '#0F172A' }}>x{it.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '8px',
                    borderTop: '1px solid #F1F5F9'
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                    📦 <strong style={{ color: (activeTab === 'PACKED' || order.status === 'Enviado' || order.status === 'Entregado') ? '#059669' : '#EA580C' }}>{totalUnits} unidades</strong>
                  </span>

                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      fontWeight: 800,
                      color: (activeTab === 'PACKED' || order.status === 'Enviado' || order.status === 'Entregado') ? '#059669' : '#EA580C'
                    }}
                  >
                    <span>{(activeTab === 'PACKED' || order.status === 'Enviado' || order.status === 'Entregado') ? 'Ver Historial' : 'Preparar'}</span>
                    <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </main>

      {renderSuperAdminModal()}
    </div>
  );
}
