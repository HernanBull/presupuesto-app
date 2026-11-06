import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  Trash2, Users, Store, ShieldAlert, Loader2, X, Activity, DollarSign, Package, 
  BarChart3, Search, ShoppingBag, EyeOff, Eye, Download, Radio, Key, QrCode, 
  ArrowRight, Truck, ShieldCheck, ShieldBan, Save, Check, Clock, CreditCard, 
  Calendar, MessageCircle, CheckCircle2, XCircle, AlertTriangle, Copy, ExternalLink, RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { supabase } from '../../../supabaseClient';
import DeliveryFleetDashboard from './DeliveryFleetDashboard';
import BotControlPanel from './BotControlPanel';
import HardwareSecurityPanel from './HardwareSecurityPanel';
import AgencySuperuserManager from './AgencySuperuserManager';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];

const safeParseConfig = (configData) => {
  if (!configData) return {};
  if (typeof configData === 'object') return configData;
  try { return JSON.parse(configData); } catch (e) { return {}; }
};

export default function SuperAdminDashboard({ superKey }) {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'merchants', 'customers', 'monitor', 'subscriptions'
  const [merchants, setMerchants] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [liveOrders, setLiveOrders] = useState([]);
  const [billingData, setBillingData] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deliveryGroupId, setDeliveryGroupId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [deliveryGroups, setDeliveryGroups] = useState([]);
  const [drivers, setDrivers] = useState([]);
  
  // Subscriptions & BNC State
  const [subscriptionPayments, setSubscriptionPayments] = useState([]);
  const [trialMerchants, setTrialMerchants] = useState([]);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
  const [copiedRef, setCopiedRef] = useState(null);
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState(null);
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Details Modal State
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState(null);

  // Modal State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Key Change State
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [is2faModalOpen, setIs2faModalOpen] = useState(false);
  const [twoFaSetup, setTwoFaSetup] = useState(null);
  const [newKeyInput, setNewKeyInput] = useState('');
  const [keyError, setKeyError] = useState('');

  // Purge & Test Cleanup State
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [purgeMode, setPurgeMode] = useState('orphaned'); // 'orphaned' | 'all_orders'
  const [purgeConfirmationText, setPurgeConfirmationText] = useState('');
  const [isPurging, setIsPurging] = useState(false);

  useEffect(() => {
    fetchData();
    setSearchTerm('');
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Always check pending payments count for notification badge
      try {
        let pendingCount = 0;
        try {
          const { data: tablePending } = await supabase
            .from('merchant_subscription_payments')
            .select('id')
            .eq('status', 'Pendiente');
          if (tablePending) pendingCount += tablePending.length;
        } catch(e) {}
        
        const { data: wsPending } = await supabase
          .from('workspaces')
          .select('id, status, config')
          .or('status.eq.Pago_En_Revision,config->>paymentReported.eq.true');
        if (wsPending) {
          pendingCount = Math.max(pendingCount, wsPending.length);
        }
        setPendingPaymentsCount(pendingCount);
      } catch (countErr) {
        console.warn('Conteo de pagos pendientes:', countErr);
      }

      if (activeTab === 'subscriptions') {
        const { data: wsData } = await supabase.from('workspaces').select('*').order('created_at', { ascending: false });
        const { data: contactsData } = await supabase.from('merchant_contacts').select('*');
        const contactMap = {};
        if (contactsData) {
          contactsData.forEach(c => {
            contactMap[c.id] = c;
          });
        }

        // Consultar pagos en la tabla dedicada
        let tablePayments = [];
        try {
          const { data: payData } = await supabase.from('merchant_subscription_payments').select('*').order('created_at', { ascending: false });
          if (payData) tablePayments = payData;
        } catch (e) {
          console.warn("Tabla merchant_subscription_payments no lista:", e);
        }

        // Extraer también de workspaces.config.lastSubscriptionPayment
        const combinedPaymentsMap = {};
        tablePayments.forEach(p => {
          const key = p.reference ? `${p.workspace_id}_${p.reference}` : p.id;
          combinedPaymentsMap[key] = p;
        });

        (wsData || []).forEach(ws => {
          const cfg = safeParseConfig(ws.config);
          const lastPay = cfg.lastSubscriptionPayment;
          if (lastPay) {
            const key = lastPay.reference ? `${ws.id}_${lastPay.reference}` : (lastPay.id || ws.id);
            if (!combinedPaymentsMap[key]) {
              combinedPaymentsMap[key] = {
                id: lastPay.id || `ws_${ws.id}`,
                workspace_id: ws.id,
                store_slug: ws.store_slug,
                merchant_name: ws.name,
                amount_usd: lastPay.amount_usd || 20,
                amount_bs: lastPay.amount_bs || 0,
                exchange_rate: lastPay.exchange_rate || 0,
                reference: lastPay.reference || '-',
                bank_origin: lastPay.bank_origin || 'BNC',
                payment_date: lastPay.payment_date || lastPay.created_at || ws.created_at,
                contact_phone: lastPay.contact_phone || contactMap[ws.id]?.phone || cfg.contact?.phone || '-',
                status: lastPay.status || (ws.status === 'Pago_En_Revision' ? 'Pendiente' : 'Aprobado'),
                receipt_url: lastPay.receipt_url || lastPay.screenshot_url || null,
                plan_type: lastPay.plan_type || (Number(lastPay.amount_usd) >= 50 ? 'trimestral' : 'mensual'),
                created_at: lastPay.created_at || ws.created_at
              };
            }
          }
        });

        const allPayments = Object.values(combinedPaymentsMap).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        setSubscriptionPayments(allPayments);

        // Procesar comercios con métricas de Trial y suscripción
        const processedMerchants = (wsData || []).map(ws => {
          const cfg = safeParseConfig(ws.config);
          const contact = contactMap[ws.id] || null;
          const phone = contact?.phone || cfg.contact?.phone || cfg.phone || cfg.storefront?.phone || cfg.paymentProfile?.pmPhone || '-';
          const email = contact?.email || cfg.adminEmail || cfg.contact?.email || '-';
          const owner = contact?.full_name || cfg.expediente?.ownerName || cfg.contact?.ownerName || '-';

          // Fechas
          const createdAt = ws.created_at ? new Date(ws.created_at) : new Date();
          let trialEndsAt;
          if (cfg.trialEndsAt) {
            trialEndsAt = new Date(cfg.trialEndsAt);
          } else {
            trialEndsAt = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
          }

          const subscriptionEndsAt = cfg.subscriptionEndsAt ? new Date(cfg.subscriptionEndsAt) : null;
          const now = Date.now();
          const targetExpDate = subscriptionEndsAt || trialEndsAt;
          const diffMs = targetExpDate.getTime() - now;
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

          let calculatedStatus = 'En_Prueba';
          if (ws.status === 'Suspendido') {
            calculatedStatus = 'Suspendido';
          } else if (ws.status === 'Pago_En_Revision' || cfg.paymentReported) {
            calculatedStatus = 'Pago_En_Revision';
          } else if (ws.status === 'Activo' && (diffDays > 0 || subscriptionEndsAt)) {
            calculatedStatus = 'Activo';
          } else if (diffDays <= 0) {
            calculatedStatus = 'Prueba_Vencida';
          }

          return {
            ...ws,
            config: cfg,
            contact,
            phone,
            email,
            owner,
            trialEndsAt,
            subscriptionEndsAt,
            diffDays,
            calculatedStatus
          };
        });

        setTrialMerchants(processedMerchants);
      } else if (activeTab === 'merchants' || activeTab === 'pending_merchants') {
        const { data: wsData } = await supabase.from('workspaces').select('*').order('created_at', { ascending: false });
        const { data: contactsData } = await supabase.from('merchant_contacts').select('*');
        const contactMap = {};
        if (contactsData) {
          contactsData.forEach(c => {
            contactMap[c.id] = c;
          });
        }
        const mergedMerchants = (wsData || []).map(ws => ({
          ...ws,
          merchantContact: contactMap[ws.id] || null
        }));
        setMerchants(mergedMerchants);
      } else if (activeTab === 'customers') {
        const { data } = await supabase.from('ecommerce_customers').select('*').order('join_date', { ascending: false });
        setCustomers(data || []);
      } else if (activeTab === 'dashboard') {
        const { count: totalMerchants } = await supabase.from('workspaces').select('*', { count: 'exact', head: true });
        const { count: totalCustomers } = await supabase.from('ecommerce_customers').select('*', { count: 'exact', head: true });
        const { count: totalProducts } = await supabase.from('ecommerce_products').select('*', { count: 'exact', head: true });

        const { data: ordersData } = await supabase.from('ecommerce_orders_v2').select('total, status, paymentmethod, date, workspace_id, items');
        
        let totalGMV = 0;
        let totalOrders = 0;
        const pmMap = {};
        const statusMap = {};
        const chartMap = {};
        const merchantMap = {};
        const productMap = {};

        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          chartMap[d.toISOString().substring(0, 10)] = 0;
        }

        if (ordersData) {
          ordersData.forEach((o) => {
            const statusLabel = o.status || 'Desconocido';
            if (!statusMap[statusLabel]) statusMap[statusLabel] = 0;
            statusMap[statusLabel]++;

            if (statusLabel !== 'Cancelado' && statusLabel !== 'Perdido') {
              totalGMV += Number(o.total || 0);
              totalOrders++;

              const pmLabel = o.paymentmethod || 'Otro';
              if (!pmMap[pmLabel]) pmMap[pmLabel] = 0;
              pmMap[pmLabel]++;

              const dateObj = new Date(o.date);
              const dateKey = dateObj.toISOString().substring(0, 10);
              if (chartMap[dateKey] !== undefined) {
                chartMap[dateKey] += Number(o.total || 0);
              }

              if (o.workspace_id) {
                if (!merchantMap[o.workspace_id]) merchantMap[o.workspace_id] = { name: o.workspace_id, sales: 0 };
                merchantMap[o.workspace_id].sales += Number(o.total || 0);
              }

              if (o.items) {
                try {
                  let itemsArray = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
                  itemsArray.forEach(item => {
                    if (!productMap[item.name]) productMap[item.name] = 0;
                    productMap[item.name] += Number(item.quantity || 1);
                  });
                } catch(e) {}
              }
            }
          });
        }

        const aov = totalOrders > 0 ? totalGMV / totalOrders : 0;
        const paymentMethodsChart = Object.keys(pmMap).map((name) => ({ name, value: pmMap[name] }));
        const orderStatusesChart = Object.keys(statusMap).map((name) => ({ name, value: statusMap[name] }));
        const salesChartData = Object.keys(chartMap).map((date) => ({ date, sales: chartMap[date] }));

        const workspaceIds = Object.keys(merchantMap);
        if (workspaceIds.length > 0) {
          const { data: workspaces } = await supabase.from('workspaces').select('id, name').in('id', workspaceIds);
          if (workspaces) {
            workspaces.forEach(w => {
              if (merchantMap[w.id]) merchantMap[w.id].name = w.name;
            });
          }
        }

        const topMerchants = Object.values(merchantMap).sort((a, b) => b.sales - a.sales).slice(0, 5);
        const topProducts = Object.keys(productMap).map((name) => ({ name, qty: productMap[name] })).sort((a, b) => b.qty - a.qty).slice(0, 5);

        setStats({
          totalMerchants: totalMerchants || 0,
          totalCustomers: totalCustomers || 0,
          totalOrders,
          totalGMV,
          aov,
          totalProducts: totalProducts || 0,
          salesChartData,
          topMerchants,
          topProducts,
          paymentMethodsChart,
          orderStatusesChart
        });
      } else if (activeTab === 'monitor') {
        const { data: activeOrders } = await supabase.from('ecommerce_orders_v2')
          .select('*')
          .not('status', 'in', '("Entregado","Cancelado")')
          .order('date', { ascending: false });
        
        if (activeOrders) {
          const workspaceIds = [...new Set(activeOrders.map(o => o.workspace_id))].filter(Boolean);
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const validWorkspaceIds = workspaceIds.filter(id => uuidRegex.test(id));
          
          const wsMap = {};
          if (validWorkspaceIds.length > 0) {
            const { data: workspaces, error } = await supabase.from('workspaces').select('id, name').in('id', validWorkspaceIds);
            if (workspaces) workspaces.forEach(w => wsMap[w.id] = w.name);
            if (error) console.error("Error fetching workspaces:", error);
          }
          
          const enhancedOrders = activeOrders.map(o => ({
            ...o,
            workspace_name: wsMap[o.workspace_id] || 'Desconocida'
          }));
          setLiveOrders(enhancedOrders);
        } else {
          setLiveOrders([]);
        }
      } else if (activeTab === 'delivery_bot') {
        const { data: settingsData } = await supabase.from('platform_settings').select('*').in('key', ['delivery_master_group_id', 'telegram_groups']);
        if (settingsData && settingsData.length > 0) {
          const masterGroup = settingsData.find(s => s.key === 'delivery_master_group_id');
          const savedGroups = settingsData.find(s => s.key === 'telegram_groups');
          if (masterGroup) setDeliveryGroupId(masterGroup.value || '');
          if (savedGroups) try { setDeliveryGroups(JSON.parse(savedGroups.value || '[]')); } catch(e) { setDeliveryGroups([]); }
        }
        const { data: driversData } = await supabase.from('delivery_drivers').select('*');
        setDrivers(driversData || []);
      } else if (activeTab === 'billing') {
        // Fetch workspaces
        const { data: activeWorkspaces } = await supabase.from('workspaces').select('id, name, store_slug, config').eq('status', 'Activo');
        
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

        // Get delivered orders for this month
        const { data: deliveredOrders } = await supabase
          .from('ecommerce_orders_v2')
          .select('workspace_id')
          .eq('status', 'Entregado')
          .gte('date', startOfMonth)
          .lte('date', endOfMonth);

        const orderCounts = {};
        if (deliveredOrders) {
          deliveredOrders.forEach(o => {
            if (!orderCounts[o.workspace_id]) orderCounts[o.workspace_id] = 0;
            orderCounts[o.workspace_id]++;
          });
        }

        const billingList = (activeWorkspaces || []).map(w => {
          const count = orderCounts[w.id] || 0;
          const limit = 500;
          const excess = Math.max(0, count - limit);
          const totalTariff = excess * 0.10;
          
          let email = '-';
          try {
            const config = safeParseConfig(w.config);
            email = config.adminEmail || config.contact?.email || '-';
          } catch(e) {}
          
          return {
            ...w,
            deliveredCount: count,
            excess,
            totalTariff,
            email
          };
        });

        // Sort by highest excess/tariff first
        billingList.sort((a, b) => b.totalTariff - a.totalTariff);
        setBillingData(billingList);
      }
    } catch (e) {
      console.error(e);
      alert('Error al obtener datos');
    }
    setLoading(false);
  };

  const handleApprovePayment = async (payment, customDays = null) => {
    const isQuarterly = payment.plan_type === 'trimestral' || Number(payment.amount_usd) >= 50 || Number(payment.duration_days) >= 60;
    const extensionDays = customDays || (isQuarterly ? 90 : 30);
    const planName = extensionDays >= 90 ? 'Trimestral Promo (90 días / 3 meses)' : 'Mensual (30 días)';
    const amountLabel = isQuarterly ? '$60' : '$30';
    
    const confirmApprove = window.confirm(`¿Aprobar pago de ${amountLabel} (${planName}, Ref: ${payment.reference}) para "${payment.merchant_name || 'Comercio'}" y activar servicio por ${extensionDays} días?`);
    if (!confirmApprove) return;
    setIsActionLoading(true);
    try {
      const now = new Date();
      const nextExpiration = new Date(now.getTime() + extensionDays * 24 * 60 * 60 * 1000).toISOString();
      
      const targetWsId = payment.workspace_id;
      if (targetWsId) {
        const { data: ws } = await supabase.from('workspaces').select('*').eq('id', targetWsId).single();
        const cfg = safeParseConfig(ws?.config);
        const updatedCfg = {
          ...cfg,
          trialEndsAt: nextExpiration,
          subscriptionEndsAt: nextExpiration,
          paymentReported: false,
          lastSubscriptionPayment: {
            ...(cfg.lastSubscriptionPayment || payment),
            status: 'Aprobado',
            approved_at: now.toISOString(),
            extension_days: extensionDays
          }
        };
        await supabase.from('workspaces').update({
          status: 'Activo',
          config: updatedCfg
        }).eq('id', targetWsId);
      }
      
      if (payment.id && !String(payment.id).startsWith('ws_')) {
        try {
          await supabase.from('merchant_subscription_payments').update({
            status: 'Aprobado',
            approved_at: now.toISOString()
          }).eq('id', payment.id);
        } catch(e) {}
      }
      
      alert(`¡Pago Aprobado con Éxito! El comercio "${payment.merchant_name}" ha sido activado por ${extensionDays} días (hasta ${new Date(nextExpiration).toLocaleDateString()}).`);
      fetchData();
    } catch (err) {
      console.error("Error al aprobar pago:", err);
      alert("Error al aprobar pago: " + (err.message || "Error"));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRejectPayment = async (payment) => {
    const reason = window.prompt(`¿Rechazar este pago? Ingrese el motivo (ej. Referencia no coincide en BNC):`);
    if (reason === null) return;
    setIsActionLoading(true);
    try {
      const targetWsId = payment.workspace_id;
      if (targetWsId) {
        const { data: ws } = await supabase.from('workspaces').select('*').eq('id', targetWsId).single();
        const cfg = safeParseConfig(ws?.config);
        const updatedCfg = {
          ...cfg,
          paymentReported: false,
          lastSubscriptionPayment: {
            ...(cfg.lastSubscriptionPayment || payment),
            status: 'Rechazado',
            rejected_reason: reason,
            rejected_at: new Date().toISOString()
          }
        };
        await supabase.from('workspaces').update({
          status: 'Prueba_Expirada',
          config: updatedCfg
        }).eq('id', targetWsId);
      }
      
      if (payment.id && !String(payment.id).startsWith('ws_')) {
        try {
          await supabase.from('merchant_subscription_payments').update({
            status: 'Rechazado',
            notes: reason
          }).eq('id', payment.id);
        } catch(e) {}
      }
      
      alert("Pago marcado como rechazado.");
      fetchData();
    } catch (err) {
      console.error("Error al rechazar pago:", err);
      alert("Error al rechazar pago: " + (err.message || "Error"));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleExtendTrial = async (merchant, extraDays = 7) => {
    const confirmExt = window.confirm(`¿Extender período de prueba por ${extraDays} días a "${merchant.name}"?`);
    if (!confirmExt) return;
    setIsActionLoading(true);
    try {
      const cfg = safeParseConfig(merchant.config);
      const currentTrialEnd = cfg.trialEndsAt ? new Date(cfg.trialEndsAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const baseDate = currentTrialEnd.getTime() > Date.now() ? currentTrialEnd.getTime() : Date.now();
      const newTrialDate = new Date(baseDate + extraDays * 24 * 60 * 60 * 1000).toISOString();
      
      const updatedCfg = {
        ...cfg,
        trialEndsAt: newTrialDate
      };
      await supabase.from('workspaces').update({
        status: 'Activo',
        config: updatedCfg
      }).eq('id', merchant.id);
      
      alert(`Período de prueba extendido hasta el ${new Date(newTrialDate).toLocaleDateString()}`);
      fetchData();
    } catch(err) {
      alert("Error: " + err.message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCopyRef = (ref) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2500);
  };

  const handleSaveDeliveryGroup = async () => {
    if (!deliveryGroupId) return;
    setIsActionLoading(true);
    try {
      // Create new group object
      const nameToSave = groupName.trim() || 'Sin Nombre';
      const newGroup = { id: Date.now().toString(), name: nameToSave, chat_id: deliveryGroupId };
      
      // Check if it exists
      const exists = deliveryGroups.find(g => g.chat_id === deliveryGroupId);
      let updatedGroups = deliveryGroups;
      if (!exists) {
        updatedGroups = [...deliveryGroups, newGroup];
      } else {
        updatedGroups = deliveryGroups.map(g => g.chat_id === deliveryGroupId ? { ...g, name: nameToSave } : g);
      }

      await supabase.from('platform_settings').upsert([
        { key: 'delivery_master_group_id', value: deliveryGroupId },
        { key: 'telegram_groups', value: JSON.stringify(updatedGroups) }
      ], { onConflict: 'key' });

      setDeliveryGroups(updatedGroups);
      setGroupName('');
      alert('Grupo de Telegram guardado exitosamente.');
    } catch(e) { 
      console.error(e);
      alert('Error al guardar grupo'); 
    }
    setIsActionLoading(false);
  };
  
  const handleSetMasterGroup = async (chatId) => {
    if (window.confirm('¿Establecer este grupo como el Grupo Maestro actual?')) {
      setIsActionLoading(true);
      try {
        await supabase.from('platform_settings').upsert({ key: 'delivery_master_group_id', value: chatId }, { onConflict: 'key' });
        setDeliveryGroupId(chatId);
        alert('Grupo Maestro actualizado');
      } catch(e) {
        alert('Error al actualizar');
      }
      setIsActionLoading(false);
    }
  };

  const handleDeleteGroup = async (chatId) => {
    if (window.confirm('¿Eliminar este grupo de la lista?')) {
      setIsActionLoading(true);
      try {
        const updatedGroups = deliveryGroups.filter(g => g.chat_id !== chatId);
        await supabase.from('platform_settings').upsert({ key: 'telegram_groups', value: JSON.stringify(updatedGroups) }, { onConflict: 'key' });
        setDeliveryGroups(updatedGroups);
      } catch(e) {
        alert('Error al eliminar');
      }
      setIsActionLoading(false);
    }
  };

  const handleToggleDriverBan = async (driver) => {
    setIsActionLoading(true);
    const newBannedState = driver.banned ? 0 : 1;
    const confirmMessage = driver.banned 
      ? '✅ ¿Deseas LEVANTAR LA SUSPENSIÓN a este conductor?'
      : '🚨 ¿Estás seguro de que deseas BANEAR a este conductor?';
    
    if (window.confirm(confirmMessage)) {
      try {
        const { error } = await supabase.from('delivery_drivers').update({ banned: newBannedState }).eq('id', driver.id);
        if (!error) fetchData();
        else alert('Error al cambiar estado');
      } catch(e) { alert('Error de conexión'); }
    }
    setIsActionLoading(false);
  };

  const handleDeleteDriver = async (id) => {
    if (window.confirm('🗑️ ¿Deseas eliminar el registro de este conductor?')) {
      setIsActionLoading(true);
      try {
        const { error } = await supabase.from('delivery_drivers').delete().eq('id', id);
        if (!error) fetchData();
        else alert('Error al eliminar');
      } catch(e) { alert('Error de conexión'); }
      setIsActionLoading(false);
    }
  };

  const handleViewDetails = (item, type) => {
    setSelectedDetails({ ...item, type });
    setIsDetailsOpen(true);
  };

  const handleToggleVerification = async (merchant) => {
    setIsActionLoading(true);
    try {
      let configObj = {};
      configObj = safeParseConfig(merchant.config);
      
      const newVerifiedStatus = !configObj.is_verified;
      configObj.is_verified = newVerifiedStatus;
      
      const { error } = await supabase.from('workspaces').update({ config: configObj }).eq('id', merchant.id);
      if (!error) {
        fetchData();
      } else {
        alert('Error al cambiar verificación: ' + error.message);
      }
    } catch(e) {
      alert('Error de conexión');
    }
    setIsActionLoading(false);
  };

  const handleToggleSuspend = async (merchant) => {
    setIsActionLoading(true);
    const isActivating = merchant.status === 'Pendiente' || merchant.status === 'Pre_Registro' || merchant.status === 'Solicitud';
    const newStatus = isActivating ? 'Activo' : (merchant.status === 'Suspendido' ? 'Activo' : 'Suspendido');
    try {
      const cfg = safeParseConfig(merchant.config);
      // Cuando se activa el comercio (pasa de pre-registro a tiendas activas), inicia el conteo de 7 días de prueba!
      if (isActivating || (newStatus === 'Activo' && !cfg.trialEndsAt)) {
        const now = new Date();
        cfg.trialStartedAt = now.toISOString();
        cfg.trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        cfg.trialActive = true;
      }
      const { error } = await supabase.from('workspaces').update({ 
        status: newStatus,
        config: cfg
      }).eq('id', merchant.id);
      if (!error) {
        fetchData();
        if (isActivating) {
          alert(`¡Comercio "${merchant.name}" activado exitosamente! Ha iniciado su período de 7 días de prueba gratuita.`);
        }
      } else {
        alert('Error al cambiar estado: ' + error.message);
      }
    } catch(e) {
      alert('Error de conexión');
    }
    setIsActionLoading(false);
  };

  const handleDeleteClick = (item, type) => {
    setItemToDelete({ ...item, type });
    setConfirmText('');
    setIsConfirmOpen(true);
  };

    const handleExecutePurge = async () => {
    if (purgeConfirmationText.trim().toUpperCase() !== 'LIMPIAR') {
      alert('Escribe la palabra LIMPIAR para autorizar la depuración.');
      return;
    }

    setIsPurging(true);
    try {
      if (purgeMode === 'orphaned') {
        // 1. Obtener los IDs de workspaces actualmente activos
        const { data: activeWorkspaces, error: wsErr } = await supabase
          .from('workspaces')
          .select('id');
        if (wsErr) throw wsErr;

        const activeIds = new Set((activeWorkspaces || []).map(w => String(w.id)));

        // 2. Obtener todas las órdenes para identificar huérfanas
        const { data: allOrders, error: ordErr } = await supabase
          .from('ecommerce_orders_v2')
          .select('id, workspace_id');
        if (ordErr) throw ordErr;

        const orphanedOrderIds = (allOrders || [])
          .filter(o => !o.workspace_id || !activeIds.has(String(o.workspace_id)))
          .map(o => o.id);

        let deletedCount = 0;
        if (orphanedOrderIds.length > 0) {
          const batchSize = 100;
          for (let i = 0; i < orphanedOrderIds.length; i += batchSize) {
            const batch = orphanedOrderIds.slice(i, i + batchSize);
            const { error: delErr } = await supabase
              .from('ecommerce_orders_v2')
              .delete()
              .in('id', batch);
            if (delErr) throw delErr;
            deletedCount += batch.length;
          }
        }

        // 3. Limpiar productos huérfanos de tiendas que ya no existen
        const { data: allProducts } = await supabase
          .from('ecommerce_products')
          .select('id, workspace_id');
        const orphanedProdIds = (allProducts || [])
          .filter(p => !p.workspace_id || !activeIds.has(String(p.workspace_id)))
          .map(p => p.id);
        if (orphanedProdIds.length > 0) {
          for (let i = 0; i < orphanedProdIds.length; i += 100) {
            const batch = orphanedProdIds.slice(i, i + 100);
            await supabase.from('ecommerce_products').delete().in('id', batch);
          }
        }

        alert(`✅ Depuración completada: Se eliminaron ${deletedCount} pedidos huérfanos y ${orphanedProdIds.length} productos residuales de tiendas borradas.`);
      } else if (purgeMode === 'all_orders') {
        // Reset total de pedidos de prueba
        const { data: allOrders } = await supabase
          .from('ecommerce_orders_v2')
          .select('id');
        const allIds = (allOrders || []).map(o => o.id);
        if (allIds.length > 0) {
          for (let i = 0; i < allIds.length; i += 100) {
            const batch = allIds.slice(i, i + 100);
            const { error: delErr } = await supabase
              .from('ecommerce_orders_v2')
              .delete()
              .in('id', batch);
            if (delErr) throw delErr;
          }
        }
        alert(`✅ Reset total completado: Se borraron ${allIds.length} pedidos de prueba. Las métricas del dashboard iniciarán limpias en $0.00.`);
      }

      setIsPurgeModalOpen(false);
      setPurgeConfirmationText('');
      await fetchData();
    } catch (err) {
      console.error('Error al depurar dashboard:', err);
      alert('Error en la depuración: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsPurging(false);
    }
  };

  const confirmDelete = async () => {
    if (confirmText.trim().toUpperCase() !== 'ELIMINAR') return;
    setIsActionLoading(true);
    try {
      // 1. Borrar cuenta real en auth.users mediante Edge Function
      const { data, error: fnError } = await supabase.functions.invoke('delete-user', { 
        body: { 
          userId: itemToDelete.id,
          superKey: superKey 
        } 
      });

      if (fnError) {
        console.error("Function error:", fnError);
        throw new Error("Error en Edge Function: " + fnError.message);
      }
      
      if (data && data.error) {
         throw new Error("Error del servidor: " + data.error);
      }

      // 2. Borrar datos en las tablas públicas con cascada completa
      if (itemToDelete.type === 'merchant') {
        await supabase.from('ecommerce_orders_v2').delete().eq('workspace_id', itemToDelete.id);
        await supabase.from('ecommerce_products').delete().eq('workspace_id', itemToDelete.id);
        const { error } = await supabase.from('workspaces').delete().eq('id', itemToDelete.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ecommerce_customers').delete().eq('id', itemToDelete.id);
        if (error) throw error;
      }
      setIsConfirmOpen(false);
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Error al eliminar: ' + (e.message || 'Desconocido'));
    }
    setIsActionLoading(false);
  };

  const fetch2FaSetup = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetch(`https://axonmarket-api.onrender.com/api/superadmin/2fa/setup`, {
        headers: { 'x-superadmin-key': superKey }
      });
      const data = await res.json();
      if (res.ok) {
        setTwoFaSetup(data);
      } else {
        alert('Error al generar 2FA');
      }
    } catch(e) {
      alert('Error de conexión');
    }
    setIsActionLoading(false);
  };

  const handleChangeKey = async () => {
    if (!newKeyInput || newKeyInput.length < 4) {
      setKeyError('La clave debe tener al menos 4 caracteres');
      return;
    }
    setIsActionLoading(true);
    try {
      const res = await fetch(`https://axonmarket-api.onrender.com/api/superadmin/key`, {
        method: 'PUT',
        headers: { 
          'x-superadmin-key': superKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newKey: newKeyInput })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Clave cambiada exitosamente. Por favor, inicia sesión nuevamente.');
        localStorage.removeItem('superadmin_key');
        window.location.reload();
      } else {
        setKeyError(data.error || 'Error al cambiar la clave');
      }
    } catch(e) {
      setKeyError('Error de conexión');
    }
    setIsActionLoading(false);
  };

  const downloadCSV = () => {
    const dataToExport = (activeTab === 'merchants' || activeTab === 'pending_merchants') ? filteredMerchants : filteredCustomers;
    if (!dataToExport || dataToExport.length === 0) return;

    let headers = [];
    if (activeTab === 'merchants') {
      headers = ['ID', 'Nombre', 'Slug', 'Estado', 'Fecha Creacion'];
    } else {
      headers = ['ID', 'Nombre', 'Email', 'Telefono', 'Fecha Registro'];
    }

    const csvRows = [];
    csvRows.push(headers.join(','));

    dataToExport.forEach(item => {
      const row = activeTab === 'merchants' ? [
        item.id,
        `"${item.name}"`,
        item.store_slug || '',
        item.status || 'Activo',
        new Date(item.created_at).toLocaleDateString()
      ] : [
        item.id,
        `"${item.name}"`,
        item.email,
        item.phone || '',
        new Date(item.join_date).toLocaleDateString()
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${activeTab}_export_${new Date().getTime()}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-white/10 p-3 rounded-xl shadow-xl">
          <p className="text-zinc-400 text-xs mb-1 font-bold">{label}</p>
          <p className="text-emerald-400 font-mono font-bold">${payload[0].value.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };
  
  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-white/10 p-3 rounded-xl shadow-xl">
          <p className="text-white text-xs font-bold">{payload[0].name}</p>
          <p className="text-zinc-400 font-mono text-xs">{payload[0].value} pedidos</p>
        </div>
      );
    }
    return null;
  };

  const filteredMerchants = merchants.filter(m => {
    const matches = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (m.store_slug && m.store_slug.toLowerCase().includes(searchTerm.toLowerCase()));
    if (activeTab === 'pending_merchants') {
      return matches && m.status === 'Pendiente';
    }
    return matches && m.status !== 'Pendiente';
  });

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm))
  );

  return (
    <div className="superadmin-container min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-red-50 text-red-600 rounded-xl border border-red-200 shadow-xs">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-widest text-slate-950">Super Admin</h1>
            <p className="text-xs text-red-600 font-black tracking-widest uppercase">Centro Analítico y Control</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setIsKeyModalOpen(true); setKeyError(''); setNewKeyInput(''); }}
            className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 hover:text-slate-950 hover:bg-slate-200 transition-colors shadow-xs"
            title="Cambiar Clave Maestra"
          >
            <Key size={18} />
          </button>
          <button 
            onClick={() => { setIs2faModalOpen(true); fetch2FaSetup(); }}
            className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-600 hover:bg-indigo-100 transition-colors shadow-xs"
            title="Configurar Google Authenticator (2FA)"
          >
            <QrCode size={18} />
          </button>
          <button 
            onClick={() => { localStorage.removeItem('superadmin_key'); window.location.reload(); }}
            className="px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-full text-xs font-black text-slate-700 hover:text-slate-950 hover:bg-slate-200 transition-colors uppercase tracking-widest shadow-xs"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        
        {/* Tabs */}
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`min-w-[140px] flex-1 py-4 px-2 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'dashboard' ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-950 border border-slate-200/90 shadow-xs'
            }`}
          >
            <BarChart3 size={18} /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('monitor')}
            className={`min-w-[140px] flex-1 py-4 px-2 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'monitor' ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-950 border border-slate-200/90 shadow-xs'
            }`}
          >
            <Radio size={18} /> Monitor
          </button>
          <button 
            onClick={() => setActiveTab('delivery_fleet')}
            className={`min-w-[140px] flex-1 py-4 px-2 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'delivery_fleet' ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-950 border border-slate-200/90 shadow-xs'
            }`}
          >
            <Truck size={18} /> Flota Delivery
          </button>
          <button 
            onClick={() => setActiveTab('delivery_bot')}
            className={`min-w-[140px] flex-1 py-4 px-2 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'delivery_bot' ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-950 border border-slate-200/90 shadow-xs'
            }`}
          >
            <Truck size={18} /> Delivery Bot
          </button>
          <button 
            onClick={() => setActiveTab('subscriptions')}
            className={`min-w-[160px] flex-1 py-4 px-3 rounded-2xl flex items-center justify-center gap-2.5 font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-all whitespace-nowrap cursor-pointer relative ${
              activeTab === 'subscriptions' 
                ? 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.35)]' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-950 border border-slate-200/90 shadow-xs'
            }`}
          >
            <CreditCard size={18} /> 
            <span>Suscripciones & BNC</span>
            {pendingPaymentsCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-sm">
                {pendingPaymentsCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('pending_merchants')}
            className={`min-w-[140px] flex-1 py-4 px-2 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'pending_merchants' ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-950 border border-slate-200/90 shadow-xs'
            }`}
          >
            <ShieldAlert size={18} /> Pre-registros
          </button>
          <button 
            onClick={() => setActiveTab('merchants')}
            className={`min-w-[140px] flex-1 py-4 px-2 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'merchants' ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-950 border border-slate-200/90 shadow-xs'
            }`}
          >
            <Store size={18} /> Tiendas
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`min-w-[140px] flex-1 py-4 px-2 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'security' ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-950 border border-slate-200/90 shadow-xs'
            }`}
          >
            <ShieldCheck size={18} /> Terminales & Anti-Piratería
          </button>
          <button 
            onClick={() => setActiveTab('billing')}
            className={`min-w-[140px] flex-1 py-4 px-2 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'billing' ? 'bg-amber-600 text-white shadow-[0_0_20px_rgba(217,119,6,0.3)]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-950 border border-slate-200/90 shadow-xs'
            }`}
          >
            <span className="text-amber-500">💸</span> Facturación
          </button>
          <button 
            onClick={() => setActiveTab('customers')}
            className={`min-w-[140px] flex-1 py-4 px-2 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'customers' ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-950 border border-slate-200/90 shadow-xs'
            }`}
          >
            <Users size={18} /> Clientes
          </button>

        </div>

        {/* Content Box */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 min-h-[500px] shadow-xs">
          {loading ? (
            <div className="h-full flex items-center justify-center min-h-[400px]">
              <Loader2 size={40} className="animate-spin text-red-500" />
            </div>
          ) : activeTab === 'dashboard' && stats ? (
            <div className="space-y-8">
              {/* Cabecera y Acción de Depuración */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
                <div>
                  <h2 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Métricas Consolidadas de la Red
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Monitoreo en tiempo real del ecosistema de tiendas, clientes y transacciones activas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPurgeConfirmationText('');
                    setPurgeMode('orphaned');
                    setIsPurgeModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
                  title="Depurar órdenes huérfanas de pruebas o reiniciar el dashboard"
                >
                  <Trash2 size={15} />
                  <span>Depurar Datos de Pruebas</span>
                </button>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center col-span-2 md:col-span-1 shadow-xs">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-full mb-2 border border-emerald-200"><DollarSign size={20} /></div>
                  <h3 className="text-slate-600 text-[10px] font-black uppercase tracking-widest mb-1">Volumen (GMV)</h3>
                  <p className="text-xl font-mono font-black text-slate-950">${stats.totalGMV.toFixed(2)}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center col-span-2 md:col-span-1 shadow-xs">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-full mb-2 border border-blue-200"><Activity size={20} /></div>
                  <h3 className="text-slate-600 text-[10px] font-black uppercase tracking-widest mb-1">Ticket Prom.</h3>
                  <p className="text-xl font-mono font-black text-slate-950">${stats.aov.toFixed(2)}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-xs">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-full mb-2 border border-amber-200"><Store size={20} /></div>
                  <h3 className="text-slate-600 text-[10px] font-black uppercase tracking-widest mb-1">Tiendas</h3>
                  <p className="text-xl font-mono font-black text-slate-950">{stats.totalMerchants}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-xs">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-full mb-2 border border-indigo-200"><Users size={20} /></div>
                  <h3 className="text-slate-600 text-[10px] font-black uppercase tracking-widest mb-1">Clientes</h3>
                  <p className="text-xl font-mono font-black text-slate-950">{stats.totalCustomers}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-xs">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-full mb-2 border border-purple-200"><Package size={20} /></div>
                  <h3 className="text-slate-600 text-[10px] font-black uppercase tracking-widest mb-1">Pedidos Tot.</h3>
                  <p className="text-xl font-mono font-black text-slate-950">{stats.totalOrders}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-xs">
                  <div className="p-2 bg-pink-50 text-pink-600 rounded-full mb-2 border border-pink-200"><ShoppingBag size={20} /></div>
                  <h3 className="text-slate-600 text-[10px] font-black uppercase tracking-widest mb-1">Prods. Reg.</h3>
                  <p className="text-xl font-mono font-black text-slate-950">{stats.totalProducts}</p>
                </div>
              </div>

              {/* Main Chart */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-xs">
                <h3 className="text-slate-950 font-black uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
                  <Activity size={18} className="text-red-500"/> Ventas Últimos 7 Días
                </h3>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.salesChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                      <Tooltip content={<CustomTooltip />} cursor={{fill: '#ffffff05'}} />
                      <Bar dataKey="sales" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pie Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-xs">
                  <h3 className="text-slate-950 font-black uppercase tracking-widest text-sm mb-6 text-center">Métodos de Pago</h3>
                  <div className="h-[200px] w-full">
                    {stats.paymentMethodsChart && stats.paymentMethodsChart.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={stats.paymentMethodsChart} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {stats.paymentMethodsChart.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomPieTooltip />} />
                          <Legend wrapperStyle={{ fontSize: '11px', color: '#334155', fontWeight: 'bold' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                       <div className="flex items-center justify-center h-full text-slate-500 font-medium text-sm">Sin datos de pagos</div>
                    )}
                  </div>
                </div>
                
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-xs">
                  <h3 className="text-slate-950 font-black uppercase tracking-widest text-sm mb-6 text-center">Estado de Pedidos</h3>
                  <div className="h-[200px] w-full">
                    {stats.orderStatusesChart && stats.orderStatusesChart.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={stats.orderStatusesChart} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                            {stats.orderStatusesChart.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomPieTooltip />} />
                          <Legend wrapperStyle={{ fontSize: '11px', color: '#334155', fontWeight: 'bold' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                       <div className="flex items-center justify-center h-full text-slate-500 font-medium text-sm">Sin datos de pedidos</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Leaderboards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-xs">
                  <h3 className="text-slate-950 font-black uppercase tracking-widest text-sm mb-6">Top 5 Tiendas (GMV)</h3>
                  <div className="space-y-4">
                    {stats.topMerchants.map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 shadow-xs">{idx+1}</span>
                          <span className="text-sm font-bold text-slate-950">{m.name}</span>
                        </div>
                        <span className="text-emerald-600 font-mono text-sm font-bold">${m.sales.toFixed(2)}</span>
                      </div>
                    ))}
                    {stats.topMerchants.length === 0 && <p className="text-slate-500 text-sm font-medium">Sin datos suficientes</p>}
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-xs">
                  <h3 className="text-slate-950 font-black uppercase tracking-widest text-sm mb-6">Top 5 Productos Vendidos</h3>
                  <div className="space-y-4">
                    {stats.topProducts.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 shadow-xs">{idx+1}</span>
                          <span className="text-sm font-bold text-slate-950 max-w-[200px] truncate">{p.name}</span>
                        </div>
                        <span className="text-slate-600 font-mono text-sm font-semibold">{p.qty} unid.</span>
                      </div>
                    ))}
                    {stats.topProducts.length === 0 && <p className="text-slate-500 text-sm font-medium">Sin datos suficientes</p>}
                  </div>
                </div>
              </div>

            </div>
          ) : activeTab === 'subscriptions' ? (
            <div className="space-y-8">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-widest text-slate-950 flex items-center gap-2.5">
                    <CreditCard className="text-emerald-600" size={24} /> 
                    Suscripciones & Conciliación BNC
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Gestión del período de prueba (7 días), validación de pagos móviles BNC ($20/mes) y control de accesos.
                  </p>
                </div>
                <button 
                  onClick={fetchData}
                  disabled={loading || isActionLoading}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center gap-2 transition-all shadow-xs disabled:opacity-50"
                >
                  <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                  Actualizar
                </button>
              </div>

              {/* KPIs de Suscripciones */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`p-5 rounded-2xl border transition-all ${pendingPaymentsCount > 0 ? 'bg-amber-50/80 border-amber-300 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Por Validar</span>
                    <div className={`p-2 rounded-xl ${pendingPaymentsCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200/60 text-slate-600'}`}>
                      <AlertTriangle size={18} />
                    </div>
                  </div>
                  <p className={`text-2xl font-black ${pendingPaymentsCount > 0 ? 'text-amber-800' : 'text-slate-900'}`}>
                    {pendingPaymentsCount}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium mt-1">
                    {pendingPaymentsCount > 0 ? '⚠️ Pagos BNC por conciliar' : 'Al día, sin pagos pendientes'}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">En Prueba (7D)</span>
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                      <Clock size={18} />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-slate-900">
                    {trialMerchants.filter(m => m.calculatedStatus === 'En_Prueba').length}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium mt-1">Comercios dentro del lapso gratuito</p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Pruebas Vencidas</span>
                    <div className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-200">
                      <XCircle size={18} />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-red-600">
                    {trialMerchants.filter(m => m.calculatedStatus === 'Prueba_Vencida').length}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium mt-1">Requieren renovar para acceder</p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Planes Activos</span>
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                      <CheckCircle2 size={18} />
                    </div>
                  </div>
                  <p className="text-2xl font-black text-emerald-700">
                    {trialMerchants.filter(m => m.calculatedStatus === 'Activo').length}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium mt-1">Planes $30/m o $60/trimestre</p>
                </div>
              </div>

              {/* SECCIÓN 1: Pagos Reportados BNC */}
              <div className="bg-slate-50/60 border border-slate-200 rounded-3xl p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <h3 className="text-base font-black uppercase tracking-wider text-slate-950 flex items-center gap-2">
                      <DollarSign className="text-emerald-600" size={20} />
                      Pagos Móviles BNC Reportados
                    </h3>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      Concilia con BNC y aprueba: $30 activa 30 días (Mensual) y $60 activa 90 días (Promo Trimestral con 1 mes gratis).
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-700">
                    Total: {subscriptionPayments.length} reportes
                  </span>
                </div>

                {subscriptionPayments.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500">
                    <CreditCard className="mx-auto mb-3 text-slate-300" size={36} />
                    <p className="font-bold text-slate-800 text-sm">No hay reportes de pago móvil registrados aún.</p>
                    <p className="text-xs text-slate-500 mt-1">Cuando un comerciante reporte su pago desde el panel o al expirar su prueba, aparecerá aquí.</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile View */}
                    <div className="md:hidden flex flex-col gap-3">
                      {subscriptionPayments.map((pay, pIdx) => {
                        const isPending = pay.status === 'Pendiente';
                        const isQuarterly = pay.plan_type === 'trimestral' || Number(pay.amount_usd) >= 50;
                        return (
                          <div key={pay.id || pIdx} className={`bg-white border rounded-2xl p-4 flex flex-col gap-3 shadow-xs ${isPending ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'}`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-black text-slate-950 text-sm">{pay.merchant_name || 'Comercio'}</p>
                                <p className="text-[11px] text-slate-500 font-mono">Slug: {pay.store_slug || '-'}</p>
                              </div>
                              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                isPending ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse' :
                                pay.status === 'Aprobado' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                'bg-red-100 text-red-800 border border-red-300'
                              }`}>
                                {pay.status || 'Pendiente'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                              <div>
                                <p className="text-[10px] text-slate-500 uppercase font-bold">Referencia BNC</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="font-mono font-black text-slate-900">{pay.reference}</span>
                                  <button onClick={() => handleCopyRef(pay.reference)} className="text-slate-500 hover:text-slate-900">
                                    <Copy size={13} />
                                  </button>
                                </div>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-500 uppercase font-bold">Banco Origen</p>
                                <p className="font-bold text-slate-800 mt-0.5">{pay.bank_origin || 'BNC'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-500 uppercase font-bold">Plan / Monto</p>
                                <p className="font-bold text-emerald-700 mt-0.5">
                                  Bs. {pay.amount_bs ? Number(pay.amount_bs).toLocaleString('es-VE', { minimumFractionDigits: 2 }) : '-'} 
                                  <span className="text-[10px] text-slate-500 block font-normal">
                                    {isQuarterly ? '🔥 Trimestral ($60)' : 'Mensual ($30)'}
                                  </span>
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-500 uppercase font-bold">Fecha</p>
                                <p className="text-slate-700 mt-0.5">{pay.payment_date ? new Date(pay.payment_date).toLocaleDateString() : '-'}</p>
                              </div>
                            </div>

                            {pay.receipt_url && (
                              <div className="flex items-center justify-between bg-orange-50/70 border border-orange-200/80 rounded-xl px-3 py-2">
                                <div className="flex items-center gap-1.5 text-xs font-black text-orange-950">
                                  <Eye size={14} className="text-orange-600" />
                                  <span>Comprobante Adjunto</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewReceiptUrl(pay.receipt_url)}
                                    className="text-[11px] font-black bg-orange-600 text-white px-2.5 py-1 rounded-lg hover:bg-orange-700 transition-colors shadow-2xs"
                                  >
                                    Ver Captura
                                  </button>
                                  <a
                                    href={pay.receipt_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 text-orange-600 hover:text-orange-800"
                                    title="Abrir en pestaña nueva"
                                  >
                                    <ExternalLink size={13} />
                                  </a>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                              {pay.contact_phone && (
                                <a 
                                  href={`https://wa.me/58${pay.contact_phone.replace(/\D/g, '').replace(/^0/, '').replace(/^58/, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-700 hover:text-emerald-800 text-xs font-bold flex items-center gap-1"
                                >
                                  <MessageCircle size={15} /> WhatsApp
                                </a>
                              )}
                              {isPending ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleRejectPayment(pay)}
                                    disabled={isActionLoading}
                                    className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white rounded-lg text-xs font-bold transition-all border border-red-200"
                                  >
                                    Rechazar
                                  </button>
                                  <button
                                    onClick={() => handleApprovePayment(pay)}
                                    disabled={isActionLoading}
                                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                                  >
                                    <Check size={14} /> {isQuarterly ? 'Aprobar Trimestral (+90d)' : 'Aprobar (+30d)'}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-500 font-medium">Procesado</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                      <table className="w-full text-left border-collapse min-w-[850px]">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/70">
                            <th className="py-3 px-4 text-xs font-black uppercase tracking-wider text-slate-700">Fecha</th>
                            <th className="py-3 px-4 text-xs font-black uppercase tracking-wider text-slate-900">Comercio</th>
                            <th className="py-3 px-4 text-xs font-black uppercase tracking-wider text-slate-700">Referencia BNC</th>
                            <th className="py-3 px-4 text-xs font-black uppercase tracking-wider text-slate-700">Banco Origen</th>
                            <th className="py-3 px-4 text-xs font-black uppercase tracking-wider text-slate-700">Plan & Monto</th>
                            <th className="py-3 px-4 text-xs font-black uppercase tracking-wider text-slate-700 text-center">Estado</th>
                            <th className="py-3 px-4 text-xs font-black uppercase tracking-wider text-slate-700">WhatsApp</th>
                            <th className="py-3 px-4 text-xs font-black uppercase tracking-wider text-slate-700 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subscriptionPayments.map((pay, pIdx) => {
                            const isPending = pay.status === 'Pendiente';
                            const isQuarterly = pay.plan_type === 'trimestral' || Number(pay.amount_usd) >= 50;
                            const cleanPhone = (pay.contact_phone || '').replace(/\D/g, '').replace(/^0/, '').replace(/^58/, '');
                            return (
                              <tr key={pay.id || pIdx} className={`border-b border-slate-100 transition-colors ${isPending ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-slate-50/80'}`}>
                                <td className="py-3.5 px-4 text-xs text-slate-600 font-medium whitespace-nowrap">
                                  {pay.created_at || pay.payment_date ? new Date(pay.created_at || pay.payment_date).toLocaleString() : '-'}
                                </td>
                                <td className="py-3.5 px-4 text-sm font-black text-slate-950">
                                  <div>{pay.merchant_name || 'Comercio'}</div>
                                  {pay.store_slug && (
                                    <a 
                                      href={`https://axonmarket.vip/${pay.store_slug}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-[11px] text-blue-600 hover:underline font-mono font-normal flex items-center gap-1 mt-0.5"
                                    >
                                      /{pay.store_slug} <ExternalLink size={10} />
                                    </a>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                      {pay.reference}
                                    </span>
                                    <button 
                                      onClick={() => handleCopyRef(pay.reference)}
                                      className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-900 transition-colors"
                                      title="Copiar referencia"
                                    >
                                      {copiedRef === pay.reference ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                    </button>
                                  </div>
                                  {pay.receipt_url && (
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <button
                                        type="button"
                                        onClick={() => setPreviewReceiptUrl(pay.receipt_url)}
                                        className="inline-flex items-center gap-1 text-[11px] font-black text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200/80 px-2 py-0.5 rounded transition-colors"
                                        title="Ver comprobante adjunto"
                                      >
                                        <Eye size={12} /> Comprobante
                                      </button>
                                      <a
                                        href={pay.receipt_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-slate-400 hover:text-orange-600"
                                        title="Abrir en pestaña nueva"
                                      >
                                        <ExternalLink size={11} />
                                      </a>
                                    </div>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-xs font-bold text-slate-800">
                                  {pay.bank_origin || 'BNC'}
                                </td>
                                <td className="py-3.5 px-4 text-sm">
                                  <div className="font-black text-emerald-700">
                                    Bs. {pay.amount_bs ? Number(pay.amount_bs).toLocaleString('es-VE', { minimumFractionDigits: 2 }) : '-'}
                                  </div>
                                  <div className="text-[10px] text-slate-600 font-bold">
                                    {isQuarterly ? (
                                      <span className="inline-flex items-center gap-1 text-orange-600 font-black">
                                        🔥 Trimestral ($60 / 3m)
                                      </span>
                                    ) : (
                                      <span>Mensual ($30 / 1m)</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                    isPending ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                    pay.status === 'Aprobado' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                    'bg-red-100 text-red-800 border border-red-300'
                                  }`}>
                                    {pay.status || 'Pendiente'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-xs">
                                  {cleanPhone ? (
                                    <a 
                                      href={`https://wa.me/58${cleanPhone}?text=Hola%20${encodeURIComponent(pay.merchant_name || 'Comercio')},%20te%20escribimos%20de%20AxonMarket%20sobre%20tu%20pago%20de%20suscripci%C3%B3n.`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-bold border border-emerald-200 transition-colors"
                                    >
                                      <MessageCircle size={14} /> WhatsApp
                                    </a>
                                  ) : (
                                    <span className="text-slate-400 font-mono">-</span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  {isPending ? (
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => handleRejectPayment(pay)}
                                        disabled={isActionLoading}
                                        className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white rounded-lg text-xs font-bold transition-all border border-red-200 disabled:opacity-50"
                                        title="Rechazar comprobante"
                                      >
                                        Rechazar
                                      </button>
                                      <button
                                        onClick={() => handleApprovePayment(pay)}
                                        disabled={isActionLoading}
                                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                                        title={`Aprobar y activar servicio por ${isQuarterly ? '90 días' : '30 días'}`}
                                      >
                                        <Check size={14} /> {isQuarterly ? 'Aprobar 90d' : 'Aprobar 30d'}
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-400 font-medium">Conciliado</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

              {/* SECCIÓN 2: Monitor de Período de Prueba (7 Días) & Vencimientos */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <h3 className="text-base font-black uppercase tracking-wider text-slate-950 flex items-center gap-2">
                      <Clock className="text-blue-600" size={20} />
                      Monitor de Período de Prueba (7 Días) & Estado de Comercios
                    </h3>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      Control detallado de los 7 días de cortesía por comercio. Envía recordatorios de pago antes de que expire.
                    </p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search size={16} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
                    <input 
                      type="text"
                      placeholder="Filtrar comercios..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[850px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70">
                        <th className="py-3 px-4 text-xs font-black uppercase tracking-wider text-slate-900">Comercio</th>
                        <th className="py-3 px-4 text-xs font-black uppercase tracking-wider text-slate-700">Contacto / Dueño</th>
                        <th className="py-3 px-4 text-xs font-black uppercase tracking-wider text-slate-700">Registro</th>
                        <th className="py-3 px-4 text-xs font-black uppercase tracking-wider text-slate-700">Expira</th>
                        <th className="py-3 px-4 text-xs font-black uppercase tracking-wider text-slate-700 text-center">Estado del Plan</th>
                        <th className="py-3 px-4 text-xs font-black uppercase tracking-wider text-slate-700 text-center">Recordatorio</th>
                        <th className="py-3 px-4 text-xs font-black uppercase tracking-wider text-slate-700 text-right">Acciones Rápidas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trialMerchants
                        .filter(m => {
                          if (!searchTerm) return true;
                          const q = searchTerm.toLowerCase();
                          return (m.name || '').toLowerCase().includes(q) || 
                                 (m.store_slug || '').toLowerCase().includes(q) ||
                                 (m.owner || '').toLowerCase().includes(q) ||
                                 (m.phone || '').includes(q);
                        })
                        .map(m => {
                          const cleanPhone = (m.phone || '').replace(/\D/g, '').replace(/^0/, '').replace(/^58/, '');
                          const isExpired = m.calculatedStatus === 'Prueba_Vencida';
                          const isTrial = m.calculatedStatus === 'En_Prueba';
                          const isActive = m.calculatedStatus === 'Activo';
                          const isReview = m.calculatedStatus === 'Pago_En_Revision';
                          
                          // Template mensaje WhatsApp
                          const waMessage = isExpired 
                            ? `Hola ${m.owner !== '-' ? m.owner : m.name}, te escribimos de AxonMarket. Tu período de prueba de 7 días ha finalizado. Para reactivar tu tienda y catálogo online, puedes reportar tu Pago Móvil de $20 a tasa BCV. ¡Estamos a la orden para ayudarte!`
                            : `Hola ${m.owner !== '-' ? m.owner : m.name}, te escribimos de AxonMarket. Te quedan ${m.diffDays} días de tu prueba gratuita. ¿Tienes alguna duda para configurar tu tienda o métodos de pago?`;

                          return (
                            <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors">
                              <td className="py-3.5 px-4 text-sm font-black text-slate-950">
                                <div>{m.name}</div>
                                {m.store_slug && (
                                  <a 
                                    href={`https://axonmarket.vip/${m.store_slug}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-[11px] text-blue-600 hover:underline font-mono font-normal flex items-center gap-1 mt-0.5"
                                  >
                                    /{m.store_slug} <ExternalLink size={10} />
                                  </a>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-xs text-slate-700">
                                <div className="font-bold text-slate-900">{m.owner}</div>
                                <div className="text-slate-500 font-mono mt-0.5">{m.phone}</div>
                              </td>
                              <td className="py-3.5 px-4 text-xs text-slate-600 font-medium">
                                {new Date(m.created_at).toLocaleDateString()}
                              </td>
                              <td className="py-3.5 px-4 text-xs font-mono font-semibold text-slate-800">
                                {m.subscriptionEndsAt 
                                  ? new Date(m.subscriptionEndsAt).toLocaleDateString() 
                                  : new Date(m.trialEndsAt).toLocaleDateString()}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                {isActive ? (
                                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                    Activo (Suscrito)
                                  </span>
                                ) : isReview ? (
                                  <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-md text-[10px] font-bold uppercase tracking-wider animate-pulse">
                                    Pago en Revisión
                                  </span>
                                ) : isExpired ? (
                                  <span className="px-2.5 py-1 bg-red-100 text-red-800 border border-red-300 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                    Prueba Vencida (Bloqueado)
                                  </span>
                                ) : (
                                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                    m.diffDays <= 2 
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                                  }`}>
                                    {m.diffDays}d restantes
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                {cleanPhone ? (
                                  <a 
                                    href={`https://wa.me/58${cleanPhone}?text=${encodeURIComponent(waMessage)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold border border-emerald-200 transition-colors"
                                    title="Enviar recordatorio por WhatsApp"
                                  >
                                    <MessageCircle size={14} /> Contactar
                                  </a>
                                ) : (
                                  <span className="text-slate-400 text-xs">-</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleExtendTrial(m, 7)}
                                    disabled={isActionLoading}
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors border border-slate-300 disabled:opacity-50"
                                    title="Dar 7 días adicionales de cortesía"
                                  >
                                    +7d
                                  </button>
                                  <button
                                    onClick={() => handleApprovePayment({ workspace_id: m.id, merchant_name: m.name, reference: 'MANUAL_SUPERADMIN', amount_usd: 30 }, 30)}
                                    disabled={isActionLoading}
                                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
                                    title="Activar plan mensual (30 días)"
                                  >
                                    +30d
                                  </button>
                                  <button
                                    onClick={() => handleApprovePayment({ workspace_id: m.id, merchant_name: m.name, reference: 'MANUAL_SUPERADMIN', amount_usd: 60, plan_type: 'trimestral' }, 90)}
                                    disabled={isActionLoading}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors shadow-xs disabled:opacity-50"
                                    title="Activar plan trimestral promo (90 días)"
                                  >
                                    +90d Promo
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      {trialMerchants.length === 0 && (
                        <tr>
                          <td colSpan="7" className="py-12 text-center text-slate-500 font-medium">
                            No se encontraron comercios registrados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          ) : activeTab === 'security' ? (
            <HardwareSecurityPanel superKey={superKey} />
          ) : activeTab === 'delivery_fleet' ? (
            <DeliveryFleetDashboard />
          ) : activeTab === 'delivery_bot' ? (
            <div className="space-y-12 max-w-5xl mx-auto w-full">
              
              {/* Nuevo Panel de Control Avanzado (Switches y Logs) */}
              <BotControlPanel />

              {/* Módulo de Directores y Superusuarios de Agencia (EnMinutos) */}
              <AgencySuperuserManager />

              {/* Configuración Antigua de Telegram y Conductores */}
              <div className="border-t border-white/10 pt-10">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-widest text-white mb-2">Ajustes Base del Bot</h2>
                  <p className="text-zinc-400">Configuración global del ecosistema de delivery de Telegram.</p>
                </div>

              {!deliveryGroupId && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-2xl flex items-center gap-3">
                  <ShieldBan className="w-6 h-6 shrink-0" />
                  <div>
                    <h3 className="font-bold">El motor de envíos requiere configuración</h3>
                    <p className="text-sm text-red-400">Para que el bot pueda despachar viajes, configura el Chat ID global.</p>
                  </div>
                </div>
              )}

              <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-red-500/10 rounded-xl text-red-500">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white uppercase tracking-widest">Grupos de Telegram</h2>
                    <p className="text-zinc-500 text-sm">Gestiona los grupos y define el Grupo Maestro para los despachos</p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-4 mb-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <input 
                      type="text" 
                      value={groupName} 
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="Nombre (ej. Axon Market)"
                      className="w-full sm:w-1/3 bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50"
                    />
                    <input 
                      type="text" 
                      value={deliveryGroupId} 
                      onChange={(e) => setDeliveryGroupId(e.target.value)}
                      placeholder="Chat ID (ej. -1001234567890)"
                      className="w-full sm:w-2/3 bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 font-mono"
                    />
                  </div>
                  <button 
                    onClick={handleSaveDeliveryGroup}
                    disabled={!deliveryGroupId || isActionLoading}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isActionLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Guardar Grupo
                  </button>
                </div>

                {deliveryGroups.length > 0 && (
                  <div className="mt-6">
                    {/* Mobile Cards */}
                    <div className="md:hidden flex flex-col gap-3">
                      {deliveryGroups.map(group => {
                        const isMaster = group.chat_id === deliveryGroupId;
                        return (
                          <div key={group.id} className="bg-zinc-950/50 border border-white/10 rounded-2xl p-4 flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                              <div className="font-bold text-white flex flex-col gap-1">
                                <span>{group.name}</span>
                                {isMaster && <span className="w-fit bg-emerald-500/20 text-emerald-500 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest border border-emerald-500/30">Maestro</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                {!isMaster && (
                                  <button 
                                    onClick={() => handleSetMasterGroup(group.chat_id)}
                                    className="p-2 bg-zinc-800 text-zinc-300 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
                                    title="Establecer como Grupo Maestro"
                                  >
                                    <Check size={16} />
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleDeleteGroup(group.chat_id)}
                                  className="p-2 bg-zinc-800 text-zinc-300 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                  title="Eliminar Grupo"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            <div className="text-xs font-mono text-zinc-400 border-t border-white/5 pt-2 mt-1">
                              ID: {group.chat_id}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto bg-zinc-950/50 border border-white/10 rounded-2xl p-4">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Nombre</th>
                            <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Chat ID</th>
                            <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deliveryGroups.map(group => {
                            const isMaster = group.chat_id === deliveryGroupId;
                            return (
                              <tr key={group.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="py-3 px-4 text-sm font-bold text-white flex items-center gap-2">
                                  {group.name}
                                  {isMaster && <span className="bg-emerald-500/20 text-emerald-500 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest border border-emerald-500/30">Maestro</span>}
                                </td>
                                <td className="py-3 px-4 text-sm font-mono text-zinc-400">{group.chat_id}</td>
                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {!isMaster && (
                                      <button 
                                        onClick={() => handleSetMasterGroup(group.chat_id)}
                                        className="p-2 bg-zinc-800 text-zinc-300 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
                                        title="Establecer como Grupo Maestro"
                                      >
                                        <Check size={16} />
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => handleDeleteGroup(group.chat_id)}
                                      className="p-2 bg-zinc-800 text-zinc-300 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                      title="Eliminar Grupo"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white uppercase tracking-widest">Base de Conductores</h2>
                    <p className="text-zinc-500 text-sm">Gestiona los repartidores registrados en el bot</p>
                  </div>
                </div>
                
                {drivers.length === 0 ? (
                  <div className="bg-zinc-950 border border-white/5 p-8 rounded-2xl text-center text-zinc-500">
                    Aún no hay conductores registrados.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {drivers.map(driver => (
                      <div key={driver.id} className={`p-5 rounded-2xl border ${driver.banned ? 'bg-red-950/20 border-red-900/50' : 'bg-zinc-950 border-white/5'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-3 font-bold text-lg text-white mb-1">
                              <span className={driver.banned ? 'line-through text-red-500' : ''}>{driver.name}</span>
                              <span className="text-[10px] font-normal text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                {driver.driver_code}
                              </span>
                              {driver.banned ? (
                                <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">
                                  Suspendido
                                </span>
                              ) : null}
                            </div>
                            <div className="text-sm text-zinc-400 grid grid-cols-2 gap-x-6 gap-y-1 mt-3">
                              <p><b>CI:</b> {driver.cedula}</p>
                              <p><b>Tel:</b> {driver.telefono}</p>
                              <p><b>Moto:</b> {driver.moto} ({driver.placa})</p>
                              <p><b>Agencia:</b> {driver.agencia}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleDeleteDriver(driver.id)}
                              disabled={isActionLoading}
                              className="text-zinc-500 hover:text-orange-500 bg-zinc-900 hover:bg-orange-500/10 p-3 rounded-xl transition-colors flex items-center justify-center disabled:opacity-50"
                              title="Eliminar Registro"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleToggleDriverBan(driver)}
                              disabled={isActionLoading}
                              className={`p-3 rounded-xl transition-colors flex items-center justify-center disabled:opacity-50 ${driver.banned ? 'text-emerald-500 bg-zinc-900 hover:bg-emerald-500/10' : 'text-zinc-500 hover:text-red-500 bg-zinc-900 hover:bg-red-500/10'}`}
                              title={driver.banned ? 'Levantar Suspensión' : 'Suspender Conductor'}
                            >
                              {driver.banned ? <ShieldCheck className="w-5 h-5" /> : <ShieldBan className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              </div>
            </div>
          ) : activeTab === 'monitor' ? (
            <div className="flex flex-col h-full">
               <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2"><Radio className="text-red-500 animate-pulse" /> Monitor de Pedidos Global</h2>
                  <button onClick={fetchData} className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-xs font-bold uppercase tracking-widest rounded-full transition-colors border border-white/5">
                    Actualizar
                  </button>
               </div>
               <div className="flex-1 mt-4">
                 {/* Mobile Cards */}
                 <div className="md:hidden flex flex-col gap-3">
                   {liveOrders.map(order => (
                     <div key={order.id} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex flex-col gap-2">
                       <div className="flex justify-between items-start">
                         <span className="text-xs text-zinc-400">{new Date(order.date).toLocaleString()}</span>
                         <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                            order.status === 'Completado' || order.status === 'Entregado' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                            order.status === 'Cancelado' || order.status === 'Perdido' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                            'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                         }`}>
                           {order.status || 'Pendiente'}
                         </span>
                       </div>
                       <div className="flex justify-between items-end mt-1">
                         <div>
                           <p className="text-sm font-bold text-emerald-400">{order.workspace_name || 'Desconocida'}</p>
                           <p className="text-xs text-white">{order.customer}</p>
                         </div>
                         <p className="text-sm font-mono font-bold text-white">${order.total.toFixed(2)}</p>
                       </div>
                     </div>
                   ))}
                   {liveOrders.length === 0 && (
                     <div className="py-8 text-center text-zinc-500 text-sm border border-white/5 rounded-xl">No hay pedidos recientes en la plataforma</div>
                   )}
                 </div>

                 {/* Desktop Table */}
                 <div className="hidden md:block overflow-x-auto bg-zinc-900/50 rounded-2xl border border-white/5 p-4">
                   <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Fecha / Hora</th>
                          <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Tienda</th>
                          <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Cliente</th>
                          <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Monto</th>
                          <th className="py-4 px-4 text-xs font-bold uppercase tracking-widest text-zinc-500 text-right">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {liveOrders.map(order => (
                          <tr key={order.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-4 px-4 text-sm text-zinc-400">{new Date(order.date).toLocaleString()}</td>
                            <td className="py-4 px-4 text-sm font-bold text-emerald-400">{order.workspace_name || 'Desconocida'}</td>
                            <td className="py-4 px-4 text-sm text-white">{order.customer}</td>
                            <td className="py-4 px-4 text-sm font-mono text-white">${order.total.toFixed(2)}</td>
                            <td className="py-4 px-4 text-right">
                               <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  order.status === 'Completado' || order.status === 'Entregado' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                                  order.status === 'Cancelado' || order.status === 'Perdido' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                                  'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                               }`}>
                                 {order.status || 'Pendiente'}
                               </span>
                            </td>
                          </tr>
                        ))}
                        {liveOrders.length === 0 && (
                          <tr>
                            <td colSpan="5" className="py-12 text-center text-zinc-500">No hay pedidos recientes en la plataforma</td>
                          </tr>
                        )}
                      </tbody>
                   </table>
                 </div>
               </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Search Bar & Actions */}
              <div className="mb-6 flex items-center gap-4">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search size={18} className="text-slate-400" />
                  </div>
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={`Buscar en ${activeTab === 'merchants' ? 'Tiendas' : 'Clientes'}...`}
                    className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 shadow-xs transition-colors"
                  />
                </div>
                <button 
                  onClick={downloadCSV}
                  className="px-4 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white rounded-xl font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-all flex items-center gap-2 whitespace-nowrap shadow-xs"
                >
                  <Download size={18} /> Exportar CSV
                </button>
              </div>

              <div className="flex-1 mt-4">
                {/* Mobile Cards */}
                <div className="md:hidden flex flex-col gap-3">
                  {((activeTab === 'merchants' || activeTab === 'pending_merchants') ? filteredMerchants : filteredCustomers).map(item => (
                    <div key={item.id} className={`bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 shadow-xs ${item.status === 'Suspendido' ? 'opacity-60 grayscale' : ''}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-black text-slate-950 text-base">{item.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono font-medium">ID: {item.id.substring(0,8)}...</p>
                        </div>
                        {(activeTab === 'merchants' || activeTab === 'pending_merchants') && (
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            item.status === 'Suspendido' ? 'bg-amber-50 text-amber-700 border border-amber-300' : item.status === 'Pendiente' ? 'bg-blue-50 text-blue-700 border border-blue-300' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {item.status || 'Activo'}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        {activeTab === 'merchants' ? (
                          <>
                            <div>
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Slug</p>
                              <p className="text-xs text-slate-800 font-medium">{item.store_slug || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Registro</p>
                              <p className="text-xs text-slate-800 font-medium">{new Date(item.created_at).toLocaleDateString()}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Email</p>
                              <p className="text-xs text-slate-800 font-medium">{safeParseConfig(item.config).adminEmail || safeParseConfig(item.config).contact?.email || 'No registrado'}</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="col-span-2">
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Email</p>
                              <p className="text-xs text-slate-800 font-medium">{item.email}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Teléfono</p>
                              <p className="text-xs text-slate-800 font-medium">{item.phone || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Registro</p>
                              <p className="text-xs text-slate-800 font-medium">{new Date(item.join_date).toLocaleDateString()}</p>
                            </div>
                          </>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 mt-1">
                        {(activeTab === 'merchants' || activeTab === 'pending_merchants') && (
                          <>
                            <button 
                              onClick={() => handleViewDetails(item, 'merchant')}
                              disabled={isActionLoading}
                              className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-200"
                            >
                              <Search size={16} />
                            </button>
                            <button 
                              onClick={() => handleToggleVerification(item)}
                              disabled={isActionLoading}
                              className={`p-2 rounded-lg border ${
                                safeParseConfig(item.config).is_verified
                                ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                              title={safeParseConfig(item.config).is_verified ? "Quitar Verificación" : "Marcar como Verificada"}
                            >
                              {safeParseConfig(item.config).is_verified ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                            </button>
                            <button 
                              onClick={() => handleToggleSuspend(item)}
                              disabled={isActionLoading}
                              className={`p-2 rounded-lg border ${
                                item.status === 'Suspendido' || item.status === 'Pendiente'
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                : 'bg-amber-50 text-amber-600 border-amber-200'
                              }`}
                            >
                              {item.status === 'Suspendido' || item.status === 'Pendiente' ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>
                            <button 
                              onClick={() => setActiveTab('security')}
                              className="p-2 bg-amber-50 text-amber-600 rounded-lg border border-amber-200"
                              title="Terminales y Anti-Piratería"
                            >
                              <Key size={16} />
                            </button>
                          </>
                        )}
                        {activeTab === 'customers' && (
                            <button 
                              onClick={() => handleViewDetails(item, 'customer')}
                              disabled={isActionLoading}
                              className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-200"
                            >
                              <Search size={16} />
                            </button>
                        )}
                        <button 
                          onClick={() => handleDeleteClick(item, activeTab === 'merchants' ? 'merchant' : 'customer')}
                          disabled={isActionLoading}
                          className="p-2 bg-red-50 text-red-600 rounded-lg border border-red-200"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {((activeTab === 'merchants' || activeTab === 'pending_merchants') ? filteredMerchants : filteredCustomers).length === 0 && (
                    <div className="py-8 text-center text-slate-500 text-sm border border-slate-200 rounded-xl bg-white shadow-xs">No se encontraron resultados</div>
                  )}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70">
                        <th className="py-4 px-4 text-xs font-black uppercase tracking-wider text-slate-700">ID</th>
                        <th className="py-4 px-4 text-xs font-black uppercase tracking-wider text-slate-900">Nombre</th>
                        {(activeTab === 'merchants' || activeTab === 'pending_merchants') && <th className="py-4 px-4 text-xs font-black uppercase tracking-wider text-slate-700">Slug</th>}
                        {(activeTab === 'merchants' || activeTab === 'pending_merchants') && <th className="py-4 px-4 text-xs font-black uppercase tracking-wider text-slate-700">Email</th>}
                        {(activeTab === 'merchants' || activeTab === 'pending_merchants') && <th className="py-4 px-4 text-xs font-black uppercase tracking-wider text-slate-700">Estado</th>}
                        {(activeTab === 'merchants' || activeTab === 'pending_merchants') && <th className="py-4 px-4 text-xs font-black uppercase tracking-wider text-slate-700 text-center">Verificación</th>}
                        {activeTab === 'customers' && <th className="py-4 px-4 text-xs font-black uppercase tracking-wider text-slate-700">Email</th>}
                        {activeTab === 'customers' && <th className="py-4 px-4 text-xs font-black uppercase tracking-wider text-slate-700">Teléfono</th>}
                        <th className="py-4 px-4 text-xs font-black uppercase tracking-wider text-slate-700">Creación</th>
                        <th className="py-4 px-4 text-xs font-black uppercase tracking-wider text-slate-700 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {((activeTab === 'merchants' || activeTab === 'pending_merchants') ? filteredMerchants : filteredCustomers).map(item => (
                        <tr key={item.id} className={`border-b border-slate-100 transition-colors group ${item.status === 'Suspendido' ? 'opacity-50 grayscale hover:grayscale-0' : 'hover:bg-slate-50/80'}`}>
                          <td className="py-4 px-4 text-sm font-mono text-slate-600 font-medium">{item.id.substring(0,8)}...</td>
                          <td className="py-4 px-4 text-sm font-black text-slate-950">{item.name}</td>
                          {(activeTab === 'merchants' || activeTab === 'pending_merchants') && <td className="py-4 px-4 text-sm text-slate-700 font-medium">{item.store_slug || 'N/A'}</td>}
                          {(activeTab === 'merchants' || activeTab === 'pending_merchants') && <td className="py-4 px-4 text-sm text-slate-700 font-medium">{(() => { try { return JSON.parse(item.config || '{}').adminEmail || '—'; } catch(e) { return '—'; } })()}</td>}
                          {(activeTab === 'merchants' || activeTab === 'pending_merchants') && (
                            <td className="py-4 px-4 text-sm">
                              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                item.status === 'Suspendido' ? 'bg-amber-50 text-amber-700 border border-amber-300' : item.status === 'Pendiente' ? 'bg-blue-50 text-blue-700 border border-blue-300' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {item.status || 'Activo'}
                              </span>
                            </td>
                          )}
                          {(activeTab === 'merchants' || activeTab === 'pending_merchants') && (
                            <td className="py-4 px-4 text-center">
                              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                safeParseConfig(item.config).is_verified ? 'bg-amber-50 text-amber-700 border border-amber-300' : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                {safeParseConfig(item.config).is_verified ? 'Verificada' : 'No'}
                              </span>
                            </td>
                          )}
                          {activeTab === 'customers' && <td className="py-4 px-4 text-sm text-slate-700 font-medium">{item.email}</td>}
                          {activeTab === 'customers' && <td className="py-4 px-4 text-sm text-slate-700 font-medium">{item.phone || 'N/A'}</td>}
                          <td className="py-4 px-4 text-sm text-slate-600 font-medium">{new Date(item.created_at || item.join_date).toLocaleDateString()}</td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {(activeTab === 'merchants' || activeTab === 'pending_merchants') && (
                                <>
                                  <button 
                                    onClick={() => handleViewDetails(item, 'merchant')}
                                    disabled={isActionLoading}
                                    className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-colors border border-blue-200 shadow-xs"
                                    title="Ver Información del Comerciante"
                                  >
                                    <Search size={18} />
                                  </button>
                                  <button 
                                    onClick={() => handleToggleVerification(item)}
                                    disabled={isActionLoading}
                                    className={`p-2 rounded-lg transition-colors border shadow-xs ${
                                      safeParseConfig(item.config).is_verified
                                      ? 'bg-amber-50 text-amber-600 border-amber-300 hover:bg-amber-500 hover:text-white'
                                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 hover:text-slate-900'
                                    }`}
                                    title={safeParseConfig(item.config).is_verified ? "Quitar Verificación" : "Marcar como Verificada"}
                                  >
                                    {safeParseConfig(item.config).is_verified ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
                                  </button>
                                  <button 
                                    onClick={() => handleToggleSuspend(item)}
                                    disabled={isActionLoading}
                                    className={`p-2 rounded-lg transition-colors border shadow-xs ${
                                      item.status === 'Suspendido' || item.status === 'Pendiente'
                                      ? 'bg-emerald-50 text-emerald-600 border-emerald-300 hover:bg-emerald-600 hover:text-white'
                                      : 'bg-amber-50 text-amber-600 border-amber-300 hover:bg-amber-500 hover:text-white'
                                    }`}
                                    title={item.status === 'Suspendido' ? "Reactivar Tienda" : item.status === 'Pendiente' ? "Aprobar Tienda (Activar)" : "Suspender Tienda (Ocultar)"}
                                  >
                                    {item.status === 'Suspendido' || item.status === 'Pendiente' ? <Eye size={18} /> : <EyeOff size={18} />}
                                  </button>
                                  <button 
                                    onClick={() => setActiveTab('security')}
                                    className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white rounded-lg transition-colors border border-amber-300 shadow-xs"
                                    title="Control de Terminales Físicas y API Key (HWID)"
                                  >
                                    <Key size={18} />
                                  </button>
                                </>
                              )}
                              {activeTab === 'customers' && (
                                  <button 
                                    onClick={() => handleViewDetails(item, 'customer')}
                                    disabled={isActionLoading}
                                    className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-colors border border-blue-200 shadow-xs"
                                    title="Ver Detalles del Cliente"
                                  >
                                    <Search size={18} />
                                  </button>
                              )}
                              <button 
                                onClick={() => handleDeleteClick(item, activeTab === 'merchants' ? 'merchant' : 'customer')}
                                disabled={isActionLoading}
                                className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-colors border border-red-200 shadow-xs disabled:opacity-30"
                                title="Eliminar Definitivamente (Destructivo)"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {((activeTab === 'merchants' || activeTab === 'pending_merchants') ? filteredMerchants : filteredCustomers).length === 0 && (
                        <tr>
                          <td colSpan="8" className="py-12 text-center text-slate-500 font-medium">No se encontraron resultados</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>


      {/* Modal de Depuración y Limpieza de Datos de Pruebas */}
      <AnimatePresence>
        {isPurgeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div initial={{scale:0.95, opacity:0, y: 20}} animate={{scale:1, opacity:1, y: 0}} exit={{scale:0.95, opacity:0, y: 20}} className="bg-white border border-rose-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full relative z-10 shadow-2xl">
              <button 
                onClick={() => !isPurging && setIsPurgeModalOpen(false)} 
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
                disabled={isPurging}
              >
                <X size={22} />
              </button>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  <ShieldAlert size={26} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-950 uppercase tracking-wider">
                    Depurar Dashboard de Pruebas
                  </h2>
                  <p className="text-xs text-slate-500">
                    Limpia transacciones residuales para reflejar datos limpios y precisos.
                  </p>
                </div>
              </div>

              {/* Selector de Modo */}
              <div className="space-y-3 mb-5">
                <label 
                  onClick={() => setPurgeMode('orphaned')}
                  className={`block p-4 rounded-2xl border cursor-pointer transition-all ${
                    purgeMode === 'orphaned' 
                      ? 'border-rose-500 bg-rose-50/50 shadow-xs' 
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input 
                      type="radio" 
                      name="purgeMode" 
                      checked={purgeMode === 'orphaned'} 
                      onChange={() => setPurgeMode('orphaned')}
                      className="mt-1 text-rose-600 focus:ring-rose-500" 
                    />
                    <div>
                      <p className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        1. Limpiar Pedidos Huérfanos (Recomendado)
                      </p>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Elimina únicamente los pedidos y registros de tiendas de prueba que ya fueron borradas de la base de datos. <strong>Conserva intactas las tiendas reales activas y sus ventas legítimas.</strong>
                      </p>
                    </div>
                  </div>
                </label>

                <label 
                  onClick={() => setPurgeMode('all_orders')}
                  className={`block p-4 rounded-2xl border cursor-pointer transition-all ${
                    purgeMode === 'all_orders' 
                      ? 'border-rose-500 bg-rose-50/50 shadow-xs' 
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input 
                      type="radio" 
                      name="purgeMode" 
                      checked={purgeMode === 'all_orders'} 
                      onChange={() => setPurgeMode('all_orders')}
                      className="mt-1 text-rose-600 focus:ring-rose-500" 
                    />
                    <div>
                      <p className="text-xs font-black text-rose-700 uppercase tracking-wider">
                        2. Reset Total de Pedidos de Prueba
                      </p>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Vacía por completo el historial de pedidos para iniciar el volumen GMV y pedidos en <strong>$0.00 y 0</strong>. <strong>No elimina las tiendas activas ni sus productos en catálogo.</strong>
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              {/* Confirmación con palabra clave */}
              <div className="mb-6 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-2 text-center">
                  Para autorizar la depuración, escribe <span className="text-rose-600 font-black">"LIMPIAR"</span>:
                </label>
                <input 
                  type="text" 
                  value={purgeConfirmationText}
                  onChange={(e) => setPurgeConfirmationText(e.target.value)}
                  placeholder="LIMPIAR"
                  autoFocus
                  disabled={isPurging}
                  className="w-full bg-white border border-rose-300 rounded-xl px-4 py-2.5 text-center text-slate-950 font-black uppercase tracking-widest text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                />
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPurgeModalOpen(false)}
                  disabled={isPurging}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleExecutePurge}
                  disabled={purgeConfirmationText.trim().toUpperCase() !== 'LIMPIAR' || isPurging}
                  className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-rose-600/30 transition-all cursor-pointer"
                >
                  {isPurging ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Depurando...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      <span>Ejecutar Depuración</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {isConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div initial={{scale:0.95, opacity:0, y: 20}} animate={{scale:1, opacity:1, y: 0}} exit={{scale:0.95, opacity:0, y: 20}} className="bg-white border border-red-200 rounded-3xl p-8 max-w-md w-full relative z-10 shadow-2xl">
              <button onClick={() => setIsConfirmOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"><X size={24} /></button>
              
              <div className="flex justify-center mb-4 text-red-600">
                <ShieldAlert size={48} />
              </div>
              <h2 className="text-xl font-black text-center text-slate-950 uppercase tracking-widest mb-2">Peligro: Borrado Irreversible</h2>
              
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-red-900 text-center">
                  Estás a punto de eliminar {itemToDelete?.type === 'merchant' ? 'la tienda' : 'el cliente'} <strong className="text-slate-950 font-bold">{itemToDelete?.name}</strong>.
                  {itemToDelete?.type === 'merchant' && " Esto borrará TODOS sus productos, pedidos y configuraciones para siempre."}
                </p>
                {itemToDelete?.type === 'merchant' && (
                  <p className="text-xs text-amber-800 mt-3 text-center border-t border-amber-200 pt-2 font-medium">
                    💡 <strong>TIP:</strong> Si solo quieres ocultarla del público, considera usar el botón de "Suspender" en lugar de eliminarla.
                  </p>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">Para confirmar, escribe "ELIMINAR"</label>
                <input 
                  type="text" 
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full bg-slate-50 border border-red-200 rounded-xl px-4 py-3 text-center text-slate-950 font-black uppercase tracking-widest focus:outline-none focus:border-red-500 transition-colors"
                  placeholder="ELIMINAR"
                />
              </div>

              <button 
                onClick={confirmDelete}
                disabled={confirmText.trim().toUpperCase() !== 'ELIMINAR' || isActionLoading}
                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold text-xs uppercase tracking-[0.2em] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
              >
                {isActionLoading ? <Loader2 size={18} className="animate-spin" /> : <><Trash2 size={18} /> Destruir Registro</>}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Change Key Modal */}
      <AnimatePresence>
        {isKeyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div initial={{scale:0.95, opacity:0, y: 20}} animate={{scale:1, opacity:1, y: 0}} exit={{scale:0.95, opacity:0, y: 20}} className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full relative z-10 shadow-2xl">
              <button onClick={() => setIsKeyModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"><X size={24} /></button>
              
              <div className="flex justify-center mb-4 text-red-600">
                <Key size={48} />
              </div>
              <h2 className="text-xl font-black text-center text-slate-950 uppercase tracking-widest mb-2">Seguridad Maestra</h2>
              <p className="text-sm text-slate-600 text-center mb-6">Modifica la clave de acceso al panel SuperAdmin.</p>

              <div className="mb-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">Nueva Clave Maestra</label>
                  <input 
                    type="text" 
                    value={newKeyInput}
                    onChange={(e) => { setNewKeyInput(e.target.value); setKeyError(''); }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-center text-slate-950 font-bold tracking-[0.2em] focus:outline-none focus:border-red-500 transition-colors"
                    placeholder="Escribe la nueva clave..."
                  />
                </div>
                {keyError && <p className="text-red-600 text-xs font-bold text-center uppercase tracking-widest">{keyError}</p>}
              </div>

              <button 
                onClick={handleChangeKey}
                disabled={!newKeyInput || isActionLoading}
                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold text-xs uppercase tracking-[0.2em] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
              >
                {isActionLoading ? <Loader2 size={18} className="animate-spin" /> : <>Actualizar Clave <ArrowRight size={18}/></>}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Details Modal */}
      <AnimatePresence>
        {isDetailsOpen && selectedDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div initial={{scale:0.95, opacity:0, y: 20}} animate={{scale:1, opacity:1, y: 0}} exit={{scale:0.95, opacity:0, y: 20}} className="bg-white border border-slate-200 rounded-3xl p-8 max-w-lg w-full relative z-10 shadow-2xl">
              <button onClick={() => setIsDetailsOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"><X size={24} /></button>
              
              <h2 className="text-xl font-black text-slate-950 uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-slate-200 pb-4">
                <Search className="text-blue-600" /> Detalles de {selectedDetails.type === 'merchant' ? 'Tienda' : 'Cliente'}
              </h2>
              
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 shadow-xs">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Nombre</p>
                  <p className="text-sm text-slate-950 font-bold">{selectedDetails.name}</p>
                </div>
                
                {selectedDetails.type === 'merchant' && (() => {
                  const config = safeParseConfig(selectedDetails.config);
                  
                  return (
                    <>
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 shadow-xs">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Email Administrador</p>
                        <p className="text-sm text-slate-900 font-semibold">{selectedDetails.merchantContact?.email || config.adminEmail || config.contact?.email || 'No registrado'}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 shadow-xs">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Teléfono</p>
                        <p className="text-sm text-slate-900 font-semibold">{selectedDetails.merchantContact?.phone || config.contact?.phone || config.phone || config.storefront?.phone || config.paymentProfile?.pmPhone || config.expediente?.whatsapp || 'No registrado'}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 shadow-xs">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Dueño / Propietario</p>
                        <p className="text-sm text-slate-900 font-semibold">{selectedDetails.merchantContact?.full_name || config.expediente?.ownerName || config.contact?.ownerName || config.onboarding?.owner_name || 'No registrado'}</p>
                      </div>
                    </>
                  )
                })()}

                {selectedDetails.type === 'customer' && (
                  <>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 shadow-xs">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Email</p>
                      <p className="text-sm text-slate-900 font-semibold">{selectedDetails.email || 'No registrado'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 shadow-xs">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Teléfono</p>
                      <p className="text-sm text-slate-900 font-semibold">{selectedDetails.phone || 'No registrado'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 shadow-xs">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Cédula / Documento</p>
                      <p className="text-sm text-slate-900 font-semibold">{selectedDetails.doc_id || 'No registrado'}</p>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Preview de Comprobante / Captura */}
      <AnimatePresence>
        {previewReceiptUrl && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Eye className="text-orange-600" size={18} />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Comprobante de Pago Móvil BNC
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={previewReceiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors"
                    title="Abrir en pestaña nueva"
                  >
                    <ExternalLink size={18} />
                  </a>
                  <button
                    onClick={() => setPreviewReceiptUrl(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-zinc-950/5 min-h-[300px]">
                {previewReceiptUrl.startsWith('data:application/pdf') || previewReceiptUrl.endsWith('.pdf') ? (
                  <iframe 
                    src={previewReceiptUrl} 
                    className="w-full h-[70vh] rounded-xl border border-slate-200"
                    title="Comprobante PDF"
                  />
                ) : (
                  <img
                    src={previewReceiptUrl}
                    alt="Comprobante de pago"
                    className="max-h-[75vh] w-auto object-contain rounded-xl shadow-md border border-slate-200 bg-white"
                  />
                )}
              </div>

              <div className="p-3 border-t border-slate-100 bg-white flex justify-end gap-2">
                <a
                  href={previewReceiptUrl}
                  download="comprobante_pago"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                >
                  <Download size={14} /> Descargar
                </a>
                <button
                  onClick={() => setPreviewReceiptUrl(null)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
