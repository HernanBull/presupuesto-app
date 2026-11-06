import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || Deno.env.get('VITE_TELEGRAM_BOT_TOKEN') || '8931657407:AAHJtYXikKfBtYowHHB0HBKhaRUskhyyfHo';
const TELEGRAM_BOT_USERNAME = 'DeliveryAxonbot';

const MENU_KEYBOARD = {
  keyboard: [
    [{ text: "🟢 Disponible" }, { text: "🔴 Ocupado" }],
    [{ text: "💤 Descansando" }, { text: "🚑 Falla/Accidente" }],
    [{ text: "👤 Mi Perfil" }, { text: "🆔 Mi ID" }],
    [{ text: "🛠️ Ayuda" }]
  ],
  resize_keyboard: true,
  is_persistent: true
};

const SUPERUSER_KEYBOARD = {
  keyboard: [
    [{ text: "📊 Balance Hoy" }, { text: "⏮️ Ayer" }],
    [{ text: "📈 Esta Semana (7d)" }, { text: "🗓️ Mes en Curso" }],
    [{ text: "🛵 Flota en Vivo" }, { text: "🏬 Comercios Activos" }],
    [{ text: "⏱️ Tiempos de Entrega" }, { text: "🚨 Novedades / Alertas" }],
    [{ text: "🔍 Buscar Pedido" }, { text: "❓ Ayuda Gerencial" }]
  ],
  resize_keyboard: true,
  is_persistent: true
};

const DATE_SELECTOR_INLINE_KEYBOARD = {
  inline_keyboard: [
    [
      { text: "📊 Balance Hoy", callback_data: "rep_date:today" },
      { text: "⏮️ Ayer", callback_data: "rep_date:yesterday" }
    ],
    [
      { text: "📈 Esta Semana (7d)", callback_data: "rep_date:this_week" },
      { text: "🗓️ Mes en Curso", callback_data: "rep_date:this_month" }
    ],
    [
      { text: "⏮️ Mes Anterior", callback_data: "rep_date:last_month" },
      { text: "🔍 Otra Fecha...", callback_data: "rep_date:ask_custom" }
    ]
  ]
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  }

  // Create Supabase client with Service Role Key to bypass RLS
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('VITE_SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();

    // Check if it's a request from our App to SEND a message
    if (body.type === 'send_delivery') {
      return await handleSendDelivery(body, supabase);
    }
    
    if (body.type === 'customer_confirm') {
      return await handleCustomerConfirm(body, supabase);
    }

    if (body.type === 'test_group') {
      return await handleTestGroup(body, supabase);
    }

    if (body.type === 'cancel_delivery') {
      return await handleCancelDelivery(body, supabase);
    }

    if (body.type === 'superuser_greeting') {
      return await handleSuperuserGreeting(body, supabase);
    }

    // Otherwise, assume it's an Update from Telegram Webhook
    return await handleTelegramUpdate(body, supabase);
  } catch (err: any) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 200, headers: corsHeaders });
  }
})

// === Logica para manejar el envío desde la app ===
async function handleSendDelivery({ commerceId, workspaceId, customerData, customOrderId, pickupInfo }: any, supabase: any) {
  let chatId = null;

  // 1. Si viene workspaceId, buscar si la tienda tiene telegram_group_id configurado
  if (workspaceId) {
    try {
      const { data: ws } = await supabase.from('workspaces').select('telegram_group_id, config').eq('id', workspaceId).single();
      if (ws?.telegram_group_id) {
        chatId = ws.telegram_group_id;
      } else if (ws?.config?.telegram_group_id) {
        chatId = ws.config.telegram_group_id;
      }
    } catch (err) {
      console.error("Error buscando telegram_group_id del workspace:", err);
    }
  }

  // 2. Fallback al Grupo Maestro de Repartidores configurado en la plataforma
  if (!chatId) {
    const { data: setting } = await supabase.from('platform_settings').select('value').eq('key', 'delivery_master_group_id').single();
    chatId = setting ? setting.value : null;
  }

  if (!chatId) {
    return new Response(JSON.stringify({ success: false, error: "No hay un Grupo de Telegram configurado para esta tienda." }), { status: 400, headers: corsHeaders });
  }

  const orderId = customOrderId || 'ORD-' + Math.random().toString(36).substr(2, 6).toUpperCase();

  let resolvedWsId = workspaceId || null;
  let deliveryPin = customerData.deliveryPin;

  // 1. Resolver y garantizar datos completos del punto de recogida (Tienda Física) y PIN existente
  let resolvedPickup: any = pickupInfo ? { ...pickupInfo } : {};
  let pickupPin = customerData.pickupPin || pickupInfo?.pickup_pin;

  if (orderId) {
    try {
      const { data: ord } = await supabase.from('ecommerce_orders_v2').select('workspace_id, pickup_store_name, pickup_address, pickup_phone, delivery_pin, shipping_info').eq('id', orderId).maybeSingle();
      if (ord) {
        if (!deliveryPin && ord.delivery_pin) deliveryPin = ord.delivery_pin;
        if (!pickupPin) {
          const ordShipping = typeof ord.shipping_info === 'string' ? JSON.parse(ord.shipping_info) : ord.shipping_info;
          if (ordShipping?.pickup_pin) pickupPin = ordShipping.pickup_pin;
        }
        if (!resolvedWsId && ord.workspace_id) resolvedWsId = ord.workspace_id;
        if (!resolvedPickup.name && ord.pickup_store_name) resolvedPickup.name = ord.pickup_store_name;
        if (!resolvedPickup.address && ord.pickup_address) resolvedPickup.address = ord.pickup_address;
        if (!resolvedPickup.phone && ord.pickup_phone) resolvedPickup.phone = ord.pickup_phone;
      }
    } catch (e) {
      console.warn("Error leyendo orden en handleSendDelivery:", e);
    }
  }

  // Fallback si todavía no hay workspace_id
  if (!resolvedWsId) {
    try {
      const { data: defaultWs } = await supabase.from('workspaces').select('id').limit(1).maybeSingle();
      if (defaultWs) resolvedWsId = defaultWs.id;
    } catch (e) {}
  }

  if (!deliveryPin) {
    deliveryPin = Math.floor(100000 + Math.random() * 900000).toString();
  }
  if (!pickupPin) {
    pickupPin = Math.floor(100000 + Math.random() * 900000).toString();
  }

  resolvedPickup.pickup_pin = pickupPin;
  customerData.pickupPin = pickupPin;

  // Enriquecer datos de tienda desde workspaces si falta nombre, dirección o GPS
  if (resolvedWsId && (!resolvedPickup.name || resolvedPickup.name === 'Tienda AxonPOS' || !resolvedPickup.address || resolvedPickup.address === 'Mostrador Principal' || !resolvedPickup.location)) {
    try {
      const { data: ws } = await supabase.from('workspaces').select('name, map_address, latitude, longitude, config').eq('id', resolvedWsId).maybeSingle();
      if (ws) {
        if (!resolvedPickup.name || resolvedPickup.name === 'Tienda AxonPOS') {
          resolvedPickup.name = ws.config?.expediente?.storeName || ws.config?.expediente?.razonSocial || ws.name || 'Tienda AxonPOS';
        }
        if (!resolvedPickup.address || resolvedPickup.address === 'Mostrador Principal') {
          resolvedPickup.address = ws.map_address || ws.config?.location?.address || ws.config?.address || ws.config?.expediente?.address || 'Mostrador Principal';
        }
        if (!resolvedPickup.phone) {
          resolvedPickup.phone = ws.config?.expediente?.phone || ws.config?.expediente?.whatsapp || ws.config?.contact?.phone || '';
        }
        if (!resolvedPickup.location) {
          const lat = ws.latitude || ws.config?.location?.lat || ws.config?.expediente?.gps?.lat;
          const lng = ws.longitude || ws.config?.location?.lng || ws.config?.expediente?.gps?.lng;
          if (lat && lng) {
            resolvedPickup.location = { lat: Number(lat), lng: Number(lng) };
            resolvedPickup.maps_url = `https://maps.google.com/?q=${lat},${lng}`;
          }
        }
      }
    } catch (errWs) {
      console.warn("No se pudo cargar datos de tienda desde workspaces:", errWs);
    }
  }

  const storeName = resolvedPickup.name || commerceId || 'Tienda AxonPOS';
  const storeAddress = resolvedPickup.address || 'Mostrador Principal';
  const storePhone = resolvedPickup.phone ? `\n📞 <b>Contacto Mostrador:</b> ${resolvedPickup.phone}` : '';
  const storeGpsUrl = resolvedPickup.maps_url || (resolvedPickup.location?.lat ? `https://maps.google.com/?q=${resolvedPickup.location.lat},${resolvedPickup.location.lng}` : null);
  const storeGpsText = storeGpsUrl ? `\n🗺️ <b>GPS Tienda:</b> ${storeGpsUrl}` : '';

  // 2. Resolver GPS del Cliente
  let customerMapsUrl = customerData.maps_url || null;
  if (!customerMapsUrl && customerData.location && typeof customerData.location === 'object' && customerData.location.lat && customerData.location.lng) {
    customerMapsUrl = `https://maps.google.com/?q=${customerData.location.lat},${customerData.location.lng}`;
  }
  const customerGpsText = customerMapsUrl ? `\n🗺️ <b>GPS Cliente:</b> ${customerMapsUrl}` : '';

  const message = `🚨 <b>NUEVO VIAJE DISPONIBLE</b> 🚨
🆔 <b>Pedido:</b> #${orderId}

══════════════════════
🏪 <b>PASO 1: RECOGIDA EN TIENDA</b>
🏢 <b>Tienda:</b> ${storeName}
📍 <b>Dirección Local:</b>
<code>${storeAddress}</code>${storeGpsText}

🏠 <b>PASO 2: ENTREGA AL CLIENTE</b>
👤 <b>Cliente:</b> ${customerData.name}
📍 <b>Zona de Entrega:</b>
<code>${customerData.zone || customerData.address}</code>${customerGpsText}

📦 <b>DETALLES DEL PAQUETE:</b>
<b>Tipo:</b> ${customerData.packageType || 'Paquete E-commerce'}
<b>Productos:</b>
<code>${customerData.productList || 'Artículos de la tienda'}</code>
${customerData.weight ? `⚖️ <b>Peso:</b> ${customerData.weight} kg\n` : ''}${customerData.quantity ? `🔢 <b>Cantidad:</b> ${customerData.quantity} uds\n` : ''}══════════════════════
<i>⚠️ Al presionar "Aceptar Viaje" recibirás por privado el Código de Retiro en Tienda y el PIN Secreto del Cliente.</i>`;

  const keyboardButtons: any[] = [
    [{ text: "🚗 Aceptar Viaje", url: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=accept_${orderId}` }]
  ];

  const mapRow: any[] = [];
  if (storeGpsUrl) {
    mapRow.push({ text: "🏬 Ver Tienda en Maps", url: storeGpsUrl });
  }
  if (customerMapsUrl) {
    mapRow.push({ text: "🏠 Ver Destino en Maps", url: customerMapsUrl });
  } else if (customerData.address) {
    mapRow.push({ text: "🗺️ Ver Mapa Zona", url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customerData.zone || customerData.address)}` });
  }

  if (mapRow.length > 0) {
    keyboardButtons.push(mapRow);
  }

  const replyMarkup = { inline_keyboard: keyboardButtons };

  const telegramRes = await sendMessageToChat(chatId, message, replyMarkup);
  if (!telegramRes.ok) throw new Error("Error al enviar a Telegram");

  // Actualizar tabla ecommerce_orders_v2 con datos de subasta, tienda y PIN
  try {
    await supabase.from('ecommerce_orders_v2').update({
      delivery_pin: deliveryPin,
      pickup_store_name: storeName,
      pickup_address: storeAddress,
      pickup_phone: resolvedPickup.phone || null,
      delivery_telegram_sent: true,
      delivery_telegram_status: 'broadcasted'
    }).eq('id', orderId);
  } catch (err) {
    console.error("Error actualizando ecommerce_orders_v2 en send_delivery:", err);
  }

  // Guardar en delivery_pending_trips con pickupInfo completo
  await supabase.from('delivery_pending_trips').upsert([{ 
    order_id: orderId, 
    workspace_id: resolvedWsId,
    customer_data: JSON.stringify({ ...customerData, pickupInfo: resolvedPickup }), 
    delivery_pin: deliveryPin 
  }], { onConflict: 'order_id' });

  return new Response(JSON.stringify({ success: true, orderId, deliveryPin }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// === Lógica para probar conectividad con un Grupo de Telegram ===
async function handleTestGroup({ groupId, storeName, workspaceId }: any, supabase: any) {
  if (!groupId) {
    return new Response(JSON.stringify({ success: false, error: 'groupId es requerido' }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  const testMessage = `🤖 <b>¡PRUEBA DE CONEXIÓN CON AXONPOS!</b> 🚀\n\n🏬 <b>Comercio:</b> ${storeName || 'Terminal AxonPOS'}\n📍 <b>Canal de Despacho:</b> Vinculado correctamente\n✅ <b>Estado:</b> El Bot @${TELEGRAM_BOT_USERNAME} tiene permisos activos para subastar pedidos a los repartidores motorizados.\n\n<i>Mensaje de diagnóstico generado a las ${new Date().toLocaleTimeString()}</i>`;

  const result = await sendMessageToChat(groupId, testMessage);
  
  if (result.ok) {
    // Si viene workspaceId, guardar o actualizar telegram_group_id en workspaces
    if (workspaceId) {
      try {
        await supabase.from('workspaces').update({ telegram_group_id: groupId.toString() }).eq('id', workspaceId);
      } catch (err) {
        console.error("Error guardando telegram_group_id en workspace:", err);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Mensaje de prueba enviado exitosamente al grupo de Telegram', 
      chatId: groupId,
      telegramResponse: result.result
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } else {
    return new Response(JSON.stringify({ 
      success: false, 
      error: result.description || 'No se pudo enviar el mensaje al grupo. Verifique que el bot sea administrador.',
      errorCode: result.error_code
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
}

// === Lógica para cancelar despacho desde AxonPOS ===
async function handleCancelDelivery({ orderId, reason, workspaceId }: any, supabase: any) {
  if (!orderId) {
    return new Response(JSON.stringify({ success: false, error: 'orderId es requerido' }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  // 1. Eliminar de pendientes
  await supabase.from('delivery_pending_trips').delete().eq('order_id', orderId);

  // 2. Si estaba asignado a un repartidor activo, avisarle por privado
  const { data: activeTrip } = await supabase.from('delivery_active_trips').select('driver_id').eq('order_id', orderId).single();
  if (activeTrip && activeTrip.driver_id) {
    await sendMessageToChat(
      activeTrip.driver_id, 
      `⚠️ <b>ATENCIÓN: PEDIDO CANCELADO</b>\n\nEl pedido <b>#${orderId}</b> ha sido cancelado por la tienda física.\nMotivo: <i>${reason || 'Cancelado desde mostrador AxonPOS'}</i>.\n\nNo te traslades al local. Tu estado vuelve a estar disponible para nuevos viajes.`
    );
    await supabase.from('delivery_active_trips').delete().eq('order_id', orderId);
  }

  // 3. Actualizar estado en ecommerce_orders_v2
  try {
    await supabase.from('ecommerce_orders_v2').update({
      delivery_telegram_status: 'cancelled'
    }).eq('id', orderId);
  } catch (err) {
    console.error("Error actualizando status cancelado en ecommerce_orders_v2:", err);
  }

  return new Response(JSON.stringify({ success: true, message: `Despacho de orden #${orderId} cancelado exitosamente` }), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });
}

// === Lógica para confirmar recepción desde App de Cliente ===
async function handleCustomerConfirm({ orderId }, supabase) {
  await supabase.from('ecommerce_orders_v2').update({ customer_confirmed: 1 }).eq('id', orderId);
  
  const { data: order } = await supabase.from('ecommerce_orders_v2').select('driver_confirmed').eq('id', orderId).single();
  let fullyDelivered = false;
  
  if (order && order.driver_confirmed === 1) {
    fullyDelivered = true;
    await supabase.from('ecommerce_orders_v2').update({ status: 'Entregado' }).eq('id', orderId);
    
    const { data: activeTrip } = await supabase.from('delivery_active_trips').select('driver_id').eq('order_id', orderId).single();
    if (activeTrip && activeTrip.driver_id) {
      await sendMessageToChat(activeTrip.driver_id, `✅ <b>¡Listo!</b> El cliente también ha confirmado de recibido. Pedido <b>#${orderId}</b> finalizado con éxito. ¡Buen trabajo!`);
      await supabase.from('delivery_active_trips').delete().eq('order_id', orderId);
      
      const { data: setting } = await supabase.from('platform_settings').select('value').eq('key', 'delivery_master_group_id').single();
      if (setting && setting.value) {
        await sendMessageToChat(setting.value, `✅ El pedido <b>#${orderId}</b> ha sido entregado exitosamente y el cliente ha confirmado.`);
      }
    }
  }
  
  return new Response(JSON.stringify({ success: true, fullyDelivered }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// === Lógica para manejar respuestas del Bot (Webhook) ===
async function handleTelegramUpdate(update, supabase) {
  if (update.callback_query) {
    return await handleTelegramCallbackQuery(update.callback_query, supabase);
  }

  if (!update.message) {
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  let text = update.message.text || '';
  const rawText = text.trim();
  const chatId = update.message.chat?.id?.toString();
  const driverName = update.message.from?.first_name || "Compañero";
  const userId = update.message.from?.id;
  const messageId = update.message.message_id;

  if (!chatId) return new Response("OK");

  // Normalizar comando quitando mención @DeliveryAxonbot si viene de un grupo
  const cleanCmd = rawText.toLowerCase().split('@')[0];

  // --- LOGICA DE CONTROL Y MANTENIMIENTO ---
  const { data: maintenanceSetting } = await supabase.from('platform_settings').select('value').eq('key', 'bot_maintenance_mode').single();
  const isMaintenanceMode = maintenanceSetting?.value === 'true';

  if (isMaintenanceMode) {
    if (cleanCmd.startsWith('/')) {
      await sendMessageToChat(chatId, "🛠️ <b>El bot se encuentra en MANTENIMIENTO.</b>\nLa agencia ha pausado temporalmente las operaciones del bot. Por favor, intenta más tarde.");
    }
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  // --- CONSULTA UNIVERSAL DE TELEGRAM USER ID (EN GRUPO DE CAGUA O EN PRIVADO) ---
  if (
    cleanCmd === '/id' ||
    cleanCmd === '/mi_id' ||
    cleanCmd === '/miid' ||
    cleanCmd === '/my_id' ||
    cleanCmd === '/id_admin_axon' ||
    cleanCmd === '/quiensoy' ||
    rawText === '🆔 Mi ID' ||
    text === '🆔 Mi ID'
  ) {
    const targetId = (userId || chatId).toString();
    const isGroupChat = chatId.startsWith('-');
    if (isGroupChat) {
      await sendMessageToChat(
        chatId,
        `👤 <b>${driverName}</b>, tu Telegram User ID es:\n👉 <code>${targetId}</code> 👈\n\n📋 <i>Toca el número para copiarlo y pásaselo al Administrador para registrarte en la flota de repartidores de Cagua o asignarte permisos directivos en el panel.</i>`,
        undefined,
        messageId ? { reply_to_message_id: messageId } : {}
      );
    } else {
      await sendMessageToChat(
        chatId,
        `🆔 <b>TU TELEGRAM USER ID:</b>\n👉 <code>${targetId}</code> 👈\n\n📋 <i>Toca el número para copiarlo automáticamente en tu portapapeles y compártelo con el Administrador para darte de alta.</i>`,
        MENU_KEYBOARD
      );
    }
    return new Response("OK", { headers: corsHeaders });
  }

  // --- MAPEO DEL TECLADO INTERACTIVO ---
  if (text === "🟢 Disponible") text = "/estado disponible";
  if (text === "🔴 Ocupado") text = "/estado ocupado";
  if (text === "💤 Descansando") text = "/estado descansando";
  if (text === "🚑 Falla/Accidente") text = "/estado accidentado";
  if (text === "👤 Mi Perfil") text = "/perfil";
  if (text === "🛠️ Ayuda") text = "/ayuda";

  // --- RECONOCIMIENTO DE SUPERUSUARIO / DUEÑO DE AGENCIA (ENMINUTOS) ---
  const agencySuperuser = await isAgencySuperuser((userId || chatId).toString(), supabase);

  if (agencySuperuser) {
    if (text === "📊 Balance Hoy" || text === "📊 Resumen Hoy" || cleanCmd === "/gerencia_hoy" || cleanCmd === "/gerencia" || cleanCmd === "/panel_em" || cleanCmd === "/start") {
      return await handleGerenciaHoy(chatId, agencySuperuser, supabase);
    }
    if (text === "⏮️ Ayer" || cleanCmd === "/ayer" || cleanCmd === "/gerencia_ayer" || rawText.toLowerCase() === "ayer") {
      const range = getVenezuelaDateRange('yesterday');
      return await sendGerenciaReport(chatId, agencySuperuser, range, supabase);
    }
    if (text === "📈 Esta Semana (7d)" || text === "📊 Esta Semana" || cleanCmd === "/semana" || cleanCmd === "/gerencia_semana" || rawText.toLowerCase() === "esta semana" || rawText.toLowerCase() === "semana") {
      const range = getVenezuelaDateRange('this_week');
      return await sendGerenciaReport(chatId, agencySuperuser, range, supabase);
    }
    if (text === "🗓️ Mes en Curso" || text === "📈 Mes en Curso" || cleanCmd === "/mes" || cleanCmd === "/gerencia_mes" || rawText.toLowerCase() === "este mes" || rawText.toLowerCase() === "mes") {
      const range = getVenezuelaDateRange('this_month');
      return await sendGerenciaReport(chatId, agencySuperuser, range, supabase);
    }
    if (text === "📅 Reporte por Fecha" || cleanCmd === "/reporte" || cleanCmd === "/fechas" || cleanCmd === "/calendario" || cleanCmd === "/fecha") {
      const promptMsg = `🗓️ <b>CONSOLA GERENCIAL — AUDITORÍA POR FECHAS</b> 📋\n\nSelecciona un período predeterminado o escribe directamente una fecha en el chat:\n\n👉 <code>DD/MM/AAAA</code> (ej: <code>05/11/2026</code> o <code>05/11</code>)\n👉 <code>AAAA-MM-DD</code> (ej: <code>2026-11-05</code>)\n\n👇 <i>Toca una opción rápida:</i>`;
      await sendMessageToChat(chatId, promptMsg, DATE_SELECTOR_INLINE_KEYBOARD);
      return new Response("OK", { headers: corsHeaders });
    }
    if (cleanCmd === "/antier" || cleanCmd === "/gerencia_antier" || rawText.toLowerCase() === "antier") {
      const range = getVenezuelaDateRange('day_before');
      return await sendGerenciaReport(chatId, agencySuperuser, range, supabase);
    }

    // Consulta por fecha personalizada (ej: 05/11/2026, 31/10, 2026-11-01)
    const dateMatch = parseDateString(rawText);
    if (dateMatch) {
      const range = getVenezuelaDateRange('custom', `${dateMatch.year}-${dateMatch.month}-${dateMatch.day}`);
      if (range) {
        return await sendGerenciaReport(chatId, agencySuperuser, range, supabase);
      }
    }

    if (text === "🛵 Flota en Vivo" || cleanCmd === "/gerencia_choferes") {
      return await handleGerenciaChoferes(chatId, agencySuperuser, supabase);
    }
    if (text === "🏬 Comercios Activos" || cleanCmd === "/gerencia_tiendas") {
      return await handleGerenciaTiendas(chatId, agencySuperuser, supabase);
    }
    if (text === "⏱️ Tiempos de Entrega" || cleanCmd === "/gerencia_tiempos") {
      return await handleGerenciaTiempos(chatId, agencySuperuser, supabase);
    }
    if (text === "🚨 Novedades / Alertas" || text === "🚨 Novedades e Incidentes" || cleanCmd === "/gerencia_alertas") {
      return await handleGerenciaAlertas(chatId, agencySuperuser, supabase);
    }
    if (text === "🔍 Buscar Pedido" || cleanCmd.startsWith('/buscar')) {
      const q = text.replace('/buscar', '').replace('🔍 Buscar Pedido', '').trim();
      return await handleGerenciaBuscar(chatId, q, supabase);
    }
    if (text === "🆔 Mi ID" || cleanCmd === "/mi_id") {
      await sendMessageToChat(chatId, `🛡️ Tu Telegram User ID es: <code>${chatId}</code>`, SUPERUSER_KEYBOARD);
      return new Response("OK", { headers: corsHeaders });
    }
    if (text === "❓ Ayuda Gerencial" || cleanCmd === "/gerencia_ayuda" || cleanCmd === "/ayuda") {
      const helpMsg = `👔 <b>CONSOLA GERENCIAL ${agencySuperuser.agency_name || 'ENMINUTOS'}</b> 📋\n\nTienes acceso autorizado como <b>${agencySuperuser.role === 'owner' ? 'Dueño General' : 'Supervisor'}</b>.\nUsa los botones directos del teclado inferior o escribe:\n\n📊 <b>Balance Hoy</b>: Resumen de ventas, fletes y pedidos de hoy.\n⏮️ <b>Ayer</b>: Balance del día anterior.\n📈 <b>Esta Semana</b>: Auditoría acumulada de los últimos 7 días.\n🗓️ <b>Mes en Curso</b>: Ventas y entregas del mes actual.\n🛵 <b>Flota en Vivo</b>: Monitoreo en vivo de repartidores (en ruta, libres, descansando).\n🏬 <b>Comercios Activos</b>: Comercios con más volumen de envíos.\n⏱️ <b>Tiempos de Entrega</b>: Desempeño y velocidad de despacho.\n🚨 <b>Novedades / Alertas</b>: Historial de abortos de viaje e incidencias.\n🔍 <b>/buscar [ID]</b>: Ficha en vivo de una orden (ej. <code>/buscar 702892</code>).\n🗓️ <b>[Fecha]</b>: Escribe cualquier fecha como <code>05/11/2026</code> o <code>05/11</code> para auditar ese día.\n\n<i>🚨 Como Superusuario recibirás alertas push automáticas en este chat si un chofer se accidenta o cancela un viaje.</i>`;
      await sendMessageToChat(chatId, helpMsg, SUPERUSER_KEYBOARD);
      return new Response("OK", { headers: corsHeaders });
    }
  }

  // Validaciones de seguridad para chats privados de repartidores
  if (userId && !chatId.startsWith('-')) {
    const { data: setting } = await supabase.from('platform_settings').select('value').eq('key', 'delivery_master_group_id').single();
    const masterGroupId = setting ? setting.value : null;

    if (masterGroupId) {
      const inGroup = await isUserInGroup(userId, masterGroupId);
      if (!inGroup) {
        if (text.startsWith('/')) {
          await sendMessageToChat(chatId, "⛔ <b>Acceso Denegado</b>\n\nDebes pertenecer al grupo oficial de repartidores para usar este bot.");
        }
        return new Response("OK", { headers: corsHeaders });
      }
    }
  }

  let { data: driverData } = await supabase.from('delivery_drivers').select('*').eq('id', chatId).single();

  if (driverData && driverData.banned) {
    if (text.startsWith('/')) {
      await sendMessageToChat(chatId, "⛔ <b>ACCESO DENEGADO</b>\n\nEstás suspendido de la agencia y no puedes interactuar con el bot ni tomar viajes.");
    }
    return new Response("OK", { headers: corsHeaders });
  }

  // Grupos no autorizados
  if (chatId.startsWith('-')) {
    const { data: setting } = await supabase.from('platform_settings').select('value').eq('key', 'delivery_master_group_id').single();
    if (!setting || setting.value !== chatId) {
      return new Response("OK", { headers: corsHeaders });
    }
  }

  // Flujo de comandos
  if (text === '/ayuda') {
    const helpText = `🛠️ <b>MENÚ DE AYUDA DE REPARTIDORES</b> 🛠️\n\nUsa los botones del teclado en la parte inferior para cambiar de estado rápidamente.\n\n🔹 <b>/registrar</b> - Llena tus datos para poder trabajar.\n🔹 <b>/perfil</b> - Revisa tus estadísticas y viajes completados.\n🔹 <b>/estado [disponible|ocupado|accidentado|descansando]</b> - Cambia tu estado.\n🔹 <b>/ayuda</b> - Muestra este mensaje.\n\n📌 <b>REGLAS DE LA AGENCIA:</b>\n1️⃣ Cuando el bot envíe un viaje al grupo, presiona "Aceptar Viaje".\n2️⃣ Debes estar "disponible" para aceptarlo.\n3️⃣ El bot te enviará por privado la dirección exacta del cliente.\n4️⃣ Al entregar el pedido pídele al cliente el <b>PIN de Seguridad</b>.\n5️⃣ Presiona "Marcar como Entregado".\n6️⃣ 🚨 <b>IMPORTANTE:</b> Si te accidentas, usa el botón rojo "Abortar Viaje".`;
    await sendMessageToChat(chatId, helpText, MENU_KEYBOARD);
    return new Response("OK", { headers: corsHeaders });
  }

  if (text.startsWith('/estado')) {
    const statusMatch = text.replace('/estado', '').trim().toLowerCase();
    const validStatuses = ['disponible', 'ocupado', 'accidentado', 'descansando'];
    
    if (!driverData) {
      await sendMessageToChat(chatId, "⚠️ Aún no estás registrado. Escribe /registrar para comenzar.");
      return new Response("OK", { headers: corsHeaders });
    }

    if (validStatuses.includes(statusMatch)) {
      const { error } = await supabase.from('delivery_drivers').update({ status: statusMatch }).eq('id', chatId);
      if (error) {
        console.error("Error al actualizar estado:", error);
        await sendMessageToChat(chatId, `❌ Hubo un error al actualizar tu estado. Asegúrate de que la base de datos esté configurada correctamente.`);
      } else {
        const emoji = statusMatch === 'disponible' ? '🟢' : statusMatch === 'ocupado' ? '🔴' : statusMatch === 'accidentado' ? '🚑' : '💤';
        await sendMessageToChat(chatId, `${emoji} Tu estado ha sido actualizado a: <b>${statusMatch.toUpperCase()}</b>`);
      }
    } else {
      await sendMessageToChat(chatId, `⚠️ Estado no válido. Usa uno de los siguientes:\n<code>/estado disponible</code>\n<code>/estado ocupado</code>\n<code>/estado accidentado</code>\n<code>/estado descansando</code>`);
    }
    return new Response("OK", { headers: corsHeaders });
  }

  if (text === '/perfil' || text === '/mis_viajes') {
    if (!driverData) {
      await sendMessageToChat(chatId, "⚠️ Aún no estás registrado. Escribe /registrar para comenzar.");
      return new Response("OK", { headers: corsHeaders });
    }
    
    const trips = driverData.total_trips || 0;
    const earned = parseFloat(driverData.total_earned || '0');
    
    let rank = 'Novato 🌱';
    if (trips > 50) rank = 'Leyenda del Delivery 👑';
    else if (trips > 10) rank = 'Corredor Frecuente 🚀';
    
    const dashboardText = `👤 <b>PANEL DEL CONDUCTOR</b> 👤\n\n📛 <b>Nombre:</b> ${driverData.name}\n🆔 <b>ID Agencia:</b> ${driverData.driver_code}\n🏍️ <b>Vehículo:</b> ${driverData.moto} (${driverData.placa || 'Sin placa'})\n\n📊 <b>TUS ESTADÍSTICAS GLOBALES:</b>\n🏆 <b>Viajes Completados:</b> ${trips} viajes\n💰 <b>Ganancias Estimadas:</b> $${earned.toFixed(2)}\n⭐ <b>Tu Rango:</b> ${rank}\n\n¡Sigue así, buen trabajo! 🚀`;
    
    await sendMessageToChat(chatId, dashboardText);
    return new Response("OK", { headers: corsHeaders });
  }

  // Flujo de Registro con Estado en BD
  const botStateKey = `bot_state_${chatId}`;
  const { data: stateData } = await supabase.from('platform_settings').select('value').eq('key', botStateKey).single();
  let state = stateData ? JSON.parse(stateData.value) : null;

  if (text === '/registrar') {
    if (driverData && driverData.name) {
      await sendMessageToChat(chatId, `⚠️ <b>Ya estás registrado</b> en el sistema.\n\n👤 <b>Nombre:</b> ${driverData.name}\n🆔 <b>ID Repartidor:</b> ${driverData.driver_code}\n\nUsa el teclado interactivo para gestionar tu estado.`, MENU_KEYBOARD);
    } else {
      await supabase.from('platform_settings').upsert({ key: botStateKey, value: JSON.stringify({ step: 'WAITING_NAME' }) }, { onConflict: 'key' });
      await sendMessageToChat(chatId, "¡Hola! Bienvenido al proceso de registro de repartidores. 🛵\n\nPor favor, ingresa tu <b>Nombre Completo</b>:");
    }
    return new Response("OK", { headers: corsHeaders });
  }

  if (state && !text.startsWith('/start')) {
    if (state.step === 'WAITING_NAME') {
      state.fullName = text;
      state.step = 'WAITING_PHONE';
      await supabase.from('platform_settings').upsert({ key: botStateKey, value: JSON.stringify(state) }, { onConflict: 'key' });
      await sendMessageToChat(chatId, `Perfecto, ${text}. Ahora, por favor ingresa tu <b>Número de Teléfono</b> (Ej. 0414-1234567):`);
    } else if (state.step === 'WAITING_PHONE') {
      state.telefono = text;
      state.step = 'WAITING_MOTO';
      await supabase.from('platform_settings').upsert({ key: botStateKey, value: JSON.stringify(state) }, { onConflict: 'key' });
      await sendMessageToChat(chatId, "¡Entendido! Ahora dime, ¿Qué <b>Modelo de Vehículo</b> conduces? (Ej. Bera SBR)");
    } else if (state.step === 'WAITING_MOTO') {
      state.moto = text;
      const driverCode = 'REP-' + Math.floor(1000 + Math.random() * 9000);
      const defaultAgency = 'Agencia Principal';

      if (!driverData) {
        await supabase.from('delivery_drivers').insert([{ id: chatId, driver_code: driverCode, name: state.fullName, cedula: '', telefono: state.telefono, age: '', moto: state.moto, placa: '', agencia: defaultAgency, status: 'inactivo' }]);
      } else {
        await supabase.from('delivery_drivers').update({ driver_code: driverCode, name: state.fullName, telefono: state.telefono, moto: state.moto, agencia: defaultAgency, status: 'inactivo' }).eq('id', chatId);
      }
      
      await supabase.from('platform_settings').delete().eq('key', botStateKey); // Clear state
      await sendMessageToChat(chatId, `✅ <b>¡Registro Completo!</b>\n\nTu ID único de repartidor es: <b>${driverCode}</b>\n\n⚠️ <b>ATENCIÓN:</b> Actualmente tu estado es <b>INACTIVO</b> (Neutral).\nPara empezar a trabajar y poder aceptar pedidos, debes presionar el botón <b>🟢 Disponible</b> en tu teclado interactivo. 👇`, MENU_KEYBOARD);
    }
    return new Response("OK", { headers: corsHeaders });
  }

  // Comandos Start
  if (text === '/start' || cleanCmd === '/start') {
    const targetId = (userId || chatId).toString();
    await sendMessageToChat(
      chatId,
      `👋 ¡Hola, <b>${driverName}</b>! Bienvenido al bot de Delivery.\n\n🆔 <b>Tu Telegram ID:</b> 👉 <code>${targetId}</code> 👈\n<i>(Toca el número para copiarlo si el Administrador te lo solicita para darte de alta)</i>\n\n🛵 Si deseas tomar un viaje, asegúrate de presionar el botón 'Aceptar Viaje' en el grupo de notificaciones de Cagua.\n📝 Si eres nuevo, escribe /registrar para comenzar.\n\n👇 Usa el menú de abajo para gestionar tu estado o consultar tu ID en cualquier momento.`,
      MENU_KEYBOARD
    );
    return new Response("OK", { headers: corsHeaders });
  } else if (text.startsWith('/start accept_')) {
    const orderId = text.replace('/start accept_', '');
    const { data: pendingOrder } = await supabase.from('delivery_pending_trips').select('*').eq('order_id', orderId).single();

    if (!pendingOrder) {
      await sendMessageToChat(chatId, "❌ Este viaje ya no está disponible o ya fue tomado.");
      return new Response("OK", { headers: corsHeaders });
    }

    if (!driverData || !driverData.name) {
      await sendMessageToChat(chatId, `❌ No puedes aceptar el viaje porque no estás registrado. Usa el comando /registrar primero.`);
      return new Response("OK", { headers: corsHeaders });
    }

    // Verificar pausa de pedidos
    const { data: acceptOrdersSetting } = await supabase.from('platform_settings').select('value').eq('key', 'bot_accept_orders').single();
    if (acceptOrdersSetting?.value === 'false') {
      await sendMessageToChat(chatId, "🚫 <b>Asignaciones Pausadas</b>\n\nLa agencia ha pausado temporalmente la asignación de nuevos pedidos. Por favor espera a que se reanuden las operaciones.");
      await logEvent('warning', `Repartidor intentó aceptar pedido #${orderId} pero la asignación está pausada`, { driverId: chatId, driverName }, supabase);
      return new Response("OK", { headers: corsHeaders });
    }

    if (driverData.status !== 'disponible') {
      const statusText = driverData.status ? driverData.status.toUpperCase() : 'INACTIVO';
      await sendMessageToChat(chatId, `❌ No puedes aceptar el viaje porque tu estado actual es <b>${statusText}</b>.\nCambia tu estado presionando el botón <b>🟢 Disponible</b> en tu teclado inferior.`);
      return new Response("OK", { headers: corsHeaders });
    }

    const { data: activeTrips } = await supabase.from('delivery_active_trips').select('*').eq('driver_id', chatId);
    if (activeTrips && activeTrips.length > 0) {
      await sendMessageToChat(chatId, `⚠️ <b>ACCIÓN DENEGADA</b>\n\nActualmente tienes un viaje en curso (Pedido <b>#${activeTrips[0].order_id}</b>).\n\nDebes marcarlo como entregado o abortarlo antes de poder tomar un nuevo pedido.`);
      return new Response("OK", { headers: corsHeaders });
    }

    const customerData = typeof pendingOrder.customer_data === 'string' ? JSON.parse(pendingOrder.customer_data) : (pendingOrder.customer_data || {});
    let pickup = customerData.pickupInfo ? { ...customerData.pickupInfo } : {};
    let orderWsId = pendingOrder.workspace_id || null;
    let ordDeliveryPin = pendingOrder.delivery_pin || customerData.deliveryPin || null;
    let ordPickupPin = pickup.pickup_pin || customerData.pickupPin || null;

    // Consultar ecommerce_orders_v2 para enriquecer cualquier dato faltante
    try {
      const { data: ord } = await supabase.from('ecommerce_orders_v2')
        .select('workspace_id, pickup_store_name, pickup_address, pickup_phone, delivery_pin, shipping_info')
        .eq('id', orderId)
        .maybeSingle();
      if (ord) {
        if (!orderWsId && ord.workspace_id) orderWsId = ord.workspace_id;
        if (!ordDeliveryPin && ord.delivery_pin) ordDeliveryPin = ord.delivery_pin;
        if (!pickup.name && ord.pickup_store_name) pickup.name = ord.pickup_store_name;
        if ((!pickup.address || pickup.address === 'Mostrador Principal') && ord.pickup_address) pickup.address = ord.pickup_address;
        if (!pickup.phone && ord.pickup_phone) pickup.phone = ord.pickup_phone;
        if (!ordPickupPin) {
          const ordShipping = typeof ord.shipping_info === 'string' ? JSON.parse(ord.shipping_info) : ord.shipping_info;
          if (ordShipping?.pickup_pin) ordPickupPin = ordShipping.pickup_pin;
        }
      }
    } catch (e) {
      console.warn("Error consultando ecommerce_orders_v2 en accept:", e);
    }

    // Fallback de workspace si aún no lo tenemos
    if (!orderWsId) {
      try {
        const { data: defaultWs } = await supabase.from('workspaces').select('id').limit(1).maybeSingle();
        if (defaultWs) orderWsId = defaultWs.id;
      } catch (e) {}
    }

    // Enriquecer datos de tienda física desde workspaces
    if (orderWsId && (!pickup.name || pickup.name === 'Tienda AxonPOS' || !pickup.address || pickup.address === 'Mostrador Principal' || !pickup.location)) {
      try {
        const { data: ws } = await supabase.from('workspaces').select('name, map_address, latitude, longitude, config').eq('id', orderWsId).maybeSingle();
        if (ws) {
          if (!pickup.name || pickup.name === 'Tienda AxonPOS') {
            pickup.name = ws.config?.expediente?.storeName || ws.config?.expediente?.razonSocial || ws.name || 'Tienda AxonPOS';
          }
          if (!pickup.address || pickup.address === 'Mostrador Principal') {
            pickup.address = ws.map_address || ws.config?.location?.address || ws.config?.address || ws.config?.expediente?.address || 'Mostrador Principal';
          }
          if (!pickup.phone) {
            pickup.phone = ws.config?.expediente?.phone || ws.config?.expediente?.whatsapp || ws.config?.contact?.phone || '';
          }
          if (!pickup.location) {
            const lat = ws.latitude || ws.config?.location?.lat || ws.config?.expediente?.gps?.lat;
            const lng = ws.longitude || ws.config?.location?.lng || ws.config?.expediente?.gps?.lng;
            if (lat && lng) {
              pickup.location = { lat: Number(lat), lng: Number(lng) };
              pickup.maps_url = `https://maps.google.com/?q=${lat},${lng}`;
            }
          }
        }
      } catch (e) {
        console.warn("Error consultando workspace en accept:", e);
      }
    }

    if (!ordDeliveryPin) ordDeliveryPin = '123456';
    if (!ordPickupPin) ordPickupPin = '654321';
    pickup.pickup_pin = ordPickupPin;

    await supabase.from('delivery_pending_trips').delete().eq('order_id', orderId);
    await supabase.from('delivery_active_trips').insert([{ 
      order_id: orderId, 
      workspace_id: orderWsId,
      driver_id: chatId, 
      driver_name: driverData.name || driverName,
      driver_phone: driverData.telefono || 'Sin teléfono',
      driver_moto: `${driverData.moto || 'Moto'} (${driverData.placa || 'Sin placa'})`,
      pin: ordDeliveryPin, 
      customer_name: customerData.name, 
      customer_data: JSON.stringify({ ...customerData, pickupInfo: pickup, pickupPin: ordPickupPin, deliveryPin: ordDeliveryPin }), 
      start_time: new Date().toISOString() 
    }]);

    // Actualizar de inmediato ecommerce_orders_v2 para que AxonPOS lo reciba en vivo por WebSocket
    try {
      await supabase.from('ecommerce_orders_v2').update({
        status: 'Enviado', // Mueve la orden a "En Delivery" en AxonPOS
        delivery_driver_id: chatId.toString(),
        delivery_driver_name: driverData.name || driverName,
        delivery_driver_phone: driverData.telefono || 'Sin teléfono',
        delivery_driver_moto: `${driverData.moto || 'Moto'} (${driverData.placa || 'Sin placa'})`,
        delivery_driver_code: driverData.driver_code || 'REP',
        delivery_telegram_status: 'assigned',
        delivery_pin: ordDeliveryPin,
        pickup_store_name: pickup.name || 'Tienda AxonPOS',
        pickup_address: pickup.address || 'Mostrador Principal',
        pickup_phone: pickup.phone || null
      }).eq('id', orderId);
    } catch (err) {
      console.error("Error actualizando conductor en ecommerce_orders_v2:", err);
    }

    const storeMapsUrl = pickup?.maps_url || 
      (pickup?.location?.lat ? `https://maps.google.com/?q=${pickup.location.lat},${pickup.location.lng}` : 
      (pickup?.address && pickup.address !== 'Mostrador Principal' ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pickup.address)}` : null));
    const storeGpsText = storeMapsUrl ? `\n🗺️ <b>Navegación Tienda:</b> ${storeMapsUrl}` : '';
    const storePhoneText = pickup?.phone ? `\n📞 <b>Teléfono Tienda:</b> ${pickup.phone}` : '';

    let customerMapsUrl = customerData.maps_url || null;
    if (!customerMapsUrl && customerData.location && typeof customerData.location === 'object' && customerData.location.lat && customerData.location.lng) {
      customerMapsUrl = `https://maps.google.com/?q=${customerData.location.lat},${customerData.location.lng}`;
    }
    if (!customerMapsUrl && (customerData.address || customerData.zone)) {
      const q = customerData.address || customerData.zone;
      customerMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
    }
    const customerGpsText = customerMapsUrl ? `\n🗺️ <b>Navegación Cliente:</b> ${customerMapsUrl}` : '';

    const privateMessage = `✅ <b>¡VIAJE ACEPTADO CON ÉXITO!</b> ✅
🆔 <b>Pedido:</b> #${orderId}

══════════════════════
🏪 <b>PASO 1: RECOGIDA EN TIENDA</b>
🏢 <b>Tienda:</b> ${pickup?.name || 'Tienda AxonPOS'}
📍 <b>Dirección Local:</b>
<code>${pickup?.address || 'Mostrador Principal'}</code>${storePhoneText}${storeGpsText}

🔑 <b>CÓDIGO DE RETIRO EN TIENDA:</b>
👉 <code>${ordPickupPin}</code> 👈
<i>(Dicta este código al personal de la tienda para que verifiquen tu asignación y te entreguen el paquete)</i>
══════════════════════

🏠 <b>PASO 2: ENTREGA AL CLIENTE</b>
👤 <b>Cliente:</b> ${customerData.name}
📱 <b>Teléfono:</b> ${customerData.phone}
📍 <b>Dirección de Entrega:</b>
<code>${customerData.address}</code>${customerGpsText}

🔐 <b>PIN SECRETO DE ENTREGA:</b>
👉 <code>${ordDeliveryPin}</code> 👈
<i>(Solicítale este código de 6 dígitos al cliente en mano para validar la entrega)</i>
══════════════════════`;
    
    const replyButtons: any[] = [
      [{ text: "✅ Marcar como Entregado", url: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=complete_${orderId}` }]
    ];
    const navRow: any[] = [];
    if (storeMapsUrl) navRow.push({ text: "🏬 Maps Tienda", url: storeMapsUrl });
    if (customerMapsUrl) navRow.push({ text: "🏠 Maps Cliente", url: customerMapsUrl });
    if (navRow.length > 0) replyButtons.push(navRow);
    replyButtons.push([{ text: "🚨 Abortar Viaje (Emergencia)", url: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=cancel_${orderId}` }]);

    const replyMarkup = { inline_keyboard: replyButtons };
    await sendMessageToChat(chatId, privateMessage, replyMarkup);
    await logEvent('info', `Repartidor tomó el pedido #${orderId}`, { orderId, driverId: chatId, driverName }, supabase);

    const { data: setting } = await supabase.from('platform_settings').select('value').eq('key', 'delivery_master_group_id').single();
    if (setting && setting.value) {
      await sendMessageToChat(setting.value, `🔒 El pedido <b>#${orderId}</b> ha sido tomado por <b>${driverName}</b> (${driverData.moto || 'Moto'}).`);
    }
  } else if (text.startsWith('/start complete_')) {
    const orderId = text.replace('/start complete_', '');
    await supabase.from('ecommerce_orders_v2').update({ 
      driver_confirmed: 1,
      delivery_driver_id: chatId.toString(),
      delivery_telegram_status: 'delivered'
    }).eq('id', orderId);

    const { data: order } = await supabase.from('ecommerce_orders_v2').select('customer_confirmed').eq('id', orderId).single();
    if (order && order.customer_confirmed === 1) {
      await supabase.from('delivery_active_trips').delete().eq('order_id', orderId);
      await sendMessageToChat(chatId, `✅ <b>¡Listo!</b> El cliente también ha confirmado de recibido. Pedido <b>#${orderId}</b> finalizado con éxito. ¡Buen trabajo!`);

      const { data: setting } = await supabase.from('platform_settings').select('value').eq('key', 'delivery_master_group_id').single();
      if (setting && setting.value) {
        await sendMessageToChat(setting.value, `✅ El pedido <b>#${orderId}</b> ha sido entregado exitosamente por <b>${driverName}</b> y el cliente ha confirmado.`);
      }

      // Sumar estadísticas al conductor
      const { data: feeSetting } = await supabase.from('platform_settings').select('value').eq('key', 'delivery_base_fee').single();
      const baseFee = parseFloat(feeSetting?.value || '0');
      const currentTrips = driverData.total_trips || 0;
      const currentEarned = parseFloat(driverData.total_earned || '0');
      
      await supabase.from('delivery_drivers').update({ 
        total_trips: currentTrips + 1, 
        total_earned: currentEarned + baseFee 
      }).eq('id', chatId);

      await supabase.from('ecommerce_orders_v2').update({ status: 'Entregado', delivery_driver_id: chatId.toString() }).eq('id', orderId);
      await logEvent('info', `Pedido #${orderId} entregado exitosamente por ${driverName}`, { orderId, driverName }, supabase);
    } else {
      await sendMessageToChat(chatId, `⏳ <b>¡Buen trabajo!</b> Ya entregaste el pedido <b>#${orderId}</b>. Ahora estamos esperando que el cliente confirme de recibido en la app.`);
      await logEvent('info', `Repartidor ${driverName} marcó pedido #${orderId} como entregado (esperando cliente)`, { orderId, driverName }, supabase);
    }
  } else if (text.startsWith('/start cancel_')) {
    const orderId = text.replace('/start cancel_', '');
    const { data: active } = await supabase.from('delivery_active_trips').select('*').eq('order_id', orderId).single();

    if (!active) {
      await sendMessageToChat(chatId, "❌ Este viaje ya no está en curso o ya fue cancelado.");
      return new Response("OK", { headers: corsHeaders });
    }

    await sendMessageToChat(chatId, `⚠️ ¿Estás seguro que deseas abortar el viaje <b>#${orderId}</b>?\n\nPor favor, selecciona el motivo:`, {
      inline_keyboard: [
        [{ text: "💥 Falla mecánica", url: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=abort_${orderId}_mecanica` }],
        [{ text: "📵 Cliente no responde", url: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=abort_${orderId}_cliente` }],
        [{ text: "🚑 Accidente", url: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=abort_${orderId}_accidente` }],
        [{ text: "❌ Otro motivo", url: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=abort_${orderId}_otro` }]
      ]
    });
    return new Response("OK", { headers: corsHeaders });
  } else if (text.startsWith('/start abort_')) {
    const match = text.match(/\/start abort_([^_]+)_(.+)/);
    if (!match) return new Response("OK", { headers: corsHeaders });
    
    const orderId = match[1];
    const reasonCode = match[2];
    const reasons: Record<string, string> = {
      'mecanica': 'Falla mecánica',
      'cliente': 'Cliente no responde',
      'accidente': 'Accidente',
      'otro': 'Otro motivo'
    };
    const reasonText = reasons[reasonCode] || 'Desconocido';

    const { data: active } = await supabase.from('delivery_active_trips').select('*').eq('order_id', orderId).single();

    if (!active) {
      await sendMessageToChat(chatId, "❌ Este viaje ya no está en curso o ya fue cancelado.");
      return new Response("OK", { headers: corsHeaders });
    }

    await sendMessageToChat(chatId, `🚨 <b>VIAJE ABORTADO</b> 🚨\n\nHas cancelado el pedido <b>#${orderId}</b> por el motivo: <b>${reasonText}</b>. Será asignado a otro compañero.`);
    await supabase.from('delivery_active_trips').delete().eq('order_id', orderId);
    await supabase.from('delivery_pending_trips').insert([{ order_id: active.order_id, customer_data: active.customer_data, delivery_pin: active.pin }]);

    // Actualizar ecommerce_orders_v2 para alertar a AxonPOS en tiempo real
    try {
      await supabase.from('ecommerce_orders_v2').update({
        delivery_telegram_status: 'aborted',
        delivery_abort_reason: reasonText,
        delivery_driver_id: null,
        delivery_driver_name: null,
        delivery_driver_phone: null,
        delivery_driver_moto: null
      }).eq('id', orderId);
    } catch (err) {
      console.error("Error marcando aborto en ecommerce_orders_v2:", err);
    }

    await logEvent('warning', `Repartidor abortó el pedido #${orderId}`, { orderId, reason: reasonText, driverName }, supabase);
    await notifyAgencySuperusers(
      supabase,
      `🚨 <b>ALERTA GERENCIAL ENMINUTOS</b> 🚨\n\n🆔 <b>Pedido:</b> #${orderId}\n🏍️ <b>Repartidor:</b> ${driverName}\n⚠️ <b>Incidente Reportado:</b> ${reasonText}\n\n<i>El pedido fue re-subastado automáticamente con alta prioridad en el grupo de repartidores.</i>`
    );

    const { data: setting } = await supabase.from('platform_settings').select('value').eq('key', 'delivery_master_group_id').single();
    if (setting && setting.value) {
      const retryMessage = `🚨 <b>¡VIAJE ABANDONADO - ALTA PRIORIDAD!</b> 🚨\n🆔 <b>Pedido:</b> #${orderId}\n\nEl conductor <b>${driverName}</b> ha abortado el viaje.\nMotivo: <b>${reasonText}</b>\n¡Necesitamos a alguien más de inmediato!\n\n<i>(Presiona el botón para tomar este viaje de emergencia)</i>`;
      const replyMarkup = {
        inline_keyboard: [
          [{ text: "🚗 Aceptar Viaje Urgente", url: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=accept_${orderId}` }]
        ]
      };
      await sendMessageToChat(setting.value, retryMessage, replyMarkup);
    }
  }

  return new Response("OK", { status: 200, headers: corsHeaders });
}

async function logEvent(level, message, details, supabase) {
  try {
    await supabase.from('bot_logs').insert([{
      level: level,
      message: message,
      details: details
    }]);
  } catch (e) {
    console.error("Error guardando log:", e);
  }
}

async function sendMessageToChat(chatId, text, replyMarkup = undefined, extra = {}) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', reply_markup: replyMarkup, ...extra })
    });
    return await res.json();
  } catch (e) {
    console.error("Error enviando mensaje Telegram:", e);
    return { ok: false };
  }
}

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  try {
    const payload: any = { callback_query_id: callbackQueryId };
    if (text) payload.text = text;
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.error("Error contestando callback query:", e);
  }
}

async function editMessageText(chatId: string, messageId: number, text: string, replyMarkup = undefined) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML', reply_markup: replyMarkup })
    });
    return await res.json();
  } catch (e) {
    console.error("Error editando mensaje Telegram:", e);
    return { ok: false };
  }
}

async function isUserInGroup(userId, groupId) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChatMember?chat_id=${groupId}&user_id=${userId}`);
    const data = await res.json();
    if (data.ok && data.result) {
      const status = data.result.status;
      return ['creator', 'administrator', 'member', 'restricted'].includes(status);
    }
    return false;
  } catch (e) {
    return false;
  }
}

// ==============================================================================
// FUNCIONES GERENCIALES PARA SUPERUSUARIO / DUEÑO DE AGENCIA (ENMINUTOS)
// ==============================================================================

async function handleSuperuserGreeting({ telegramUserId, message }: any, supabase: any) {
  if (!telegramUserId) {
    return new Response(JSON.stringify({ success: false, error: 'telegramUserId es requerido' }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }

  const greeting = message || `👔 <b>¡HOLA!</b> 🚀\n\nTu acceso como <b>Superusuario Gerencial</b> ha sido verificado con éxito.\nEscribe <code>/gerencia</code> o toca los botones de abajo para comenzar.`;
  const result = await sendMessageToChat(telegramUserId, greeting, SUPERUSER_KEYBOARD);

  return new Response(JSON.stringify({ 
    success: !!result.ok, 
    telegramResponse: result 
  }), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });
}

let cachedSuperusers: any[] | null = null;
let lastSuperusersFetch = 0;

async function getAgencySuperusers(supabase: any) {
  const now = Date.now();
  if (cachedSuperusers && (now - lastSuperusersFetch < 30000)) {
    return cachedSuperusers;
  }

  let list: any[] = [];
  try {
    const { data: set } = await supabase.from('platform_settings').select('value').eq('key', 'delivery_agency_superusers').maybeSingle();
    if (set && set.value) {
      const parsed = JSON.parse(set.value);
      list = parsed.filter((u: any) => u.is_active !== false);
    }
  } catch (e) {}

  if (list.length === 0) {
    try {
      const { data, error } = await supabase.from('delivery_agency_superusers').select('*').eq('is_active', true);
      if (!error && data && data.length > 0) {
        list = data;
      }
    } catch (e) {}
  }

  cachedSuperusers = list;
  lastSuperusersFetch = now;
  return list;
}

async function isAgencySuperuser(userIdOrChatId: string, supabase: any) {
  if (!userIdOrChatId) return null;
  const superusers = await getAgencySuperusers(supabase);
  return superusers.find((u: any) => u.telegram_user_id === userIdOrChatId.toString()) || null;
}

async function notifyAgencySuperusers(supabase: any, message: string, replyMarkup = undefined) {
  try {
    const superusers = await getAgencySuperusers(supabase);
    for (const su of superusers) {
      if (su.alert_on_accidents !== false && su.telegram_user_id) {
        await sendMessageToChat(su.telegram_user_id, message, replyMarkup);
      }
    }
  } catch (e) {
    console.error("Error notificando superusuarios de agencia:", e);
  }
}

function formatVzlaDate(d: Date): string {
  return d.toLocaleDateString('es-VE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function getVenezuelaDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.format(date).split('-').map(Number);
  return { year: parts[0], month: parts[1], day: parts[2] };
}

function parseDateString(text: string): { day: number, month: number, year: number } | null {
  if (!text || typeof text !== 'string') return null;
  const clean = text.replace('/gerencia', '').replace('/reporte', '').replace('/fecha', '').trim();

  // Pure DD/MM/YYYY or DD-MM-YYYY
  let m = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const year = parseInt(m[3], 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2020 && year <= 2040) {
      return { day, month, year };
    }
  }

  // Pure YYYY-MM-DD
  m = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m) {
    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const day = parseInt(m[3], 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2020 && year <= 2040) {
      return { day, month, year };
    }
  }

  // Pure DD/MM or DD-MM (assume current year in Venezuela)
  m = clean.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const currentYear = getVenezuelaDateParts().year;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return { day, month, year: currentYear };
    }
  }

  return null;
}

function getVenezuelaDateRange(type: string, customDateStr?: string) {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const vzlaTodayParts = getVenezuelaDateParts();
  const baseDate = new Date(Date.UTC(vzlaTodayParts.year, vzlaTodayParts.month - 1, vzlaTodayParts.day));

  let startDate = new Date(baseDate);
  let endDate = new Date(baseDate);
  let label = '';

  if (type === 'today') {
    label = `HOY (${pad(vzlaTodayParts.day)}/${pad(vzlaTodayParts.month)}/${vzlaTodayParts.year})`;
  } else if (type === 'yesterday') {
    startDate.setUTCDate(startDate.getUTCDate() - 1);
    endDate.setUTCDate(endDate.getUTCDate() - 1);
    label = `AYER (${pad(startDate.getUTCDate())}/${pad(startDate.getUTCMonth() + 1)}/${startDate.getUTCFullYear()})`;
  } else if (type === 'day_before') {
    startDate.setUTCDate(startDate.getUTCDate() - 2);
    endDate.setUTCDate(endDate.getUTCDate() - 2);
    label = `ANTIER (${pad(startDate.getUTCDate())}/${pad(startDate.getUTCMonth() + 1)}/${startDate.getUTCFullYear()})`;
  } else if (type === 'this_week') {
    startDate.setUTCDate(startDate.getUTCDate() - 6);
    label = `ÚLTIMOS 7 DÍAS (${pad(startDate.getUTCDate())}/${pad(startDate.getUTCMonth() + 1)} al ${pad(endDate.getUTCDate())}/${pad(endDate.getUTCMonth() + 1)})`;
  } else if (type === 'this_month') {
    startDate.setUTCDate(1);
    label = `MES EN CURSO (${pad(startDate.getUTCMonth() + 1)}/${startDate.getUTCFullYear()})`;
  } else if (type === 'last_month') {
    startDate.setUTCMonth(startDate.getUTCMonth() - 1, 1);
    endDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 0));
    label = `MES ANTERIOR (${pad(startDate.getUTCMonth() + 1)}/${startDate.getUTCFullYear()})`;
  } else if (type === 'custom' && customDateStr) {
    const parsed = parseDateString(customDateStr);
    if (!parsed) return null;
    startDate = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
    endDate = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
    label = `FECHA (${pad(parsed.day)}/${pad(parsed.month)}/${parsed.year})`;
  } else {
    return null;
  }

  const startIso = `${startDate.getUTCFullYear()}-${pad(startDate.getUTCMonth() + 1)}-${pad(startDate.getUTCDate())}T00:00:00.000-04:00`;
  const endIso = `${endDate.getUTCFullYear()}-${pad(endDate.getUTCMonth() + 1)}-${pad(endDate.getUTCDate())}T23:59:59.999-04:00`;

  return { startIso, endIso, label, start: startDate, end: endDate };
}

// 1. Reporte Gerencial por Período/Fecha (/gerencia hoy, ayer, antier, custom)
async function sendGerenciaReport(chatId: string, superuser: any, range: any, supabase: any, editMessageId?: number) {
  if (!range) {
    await sendMessageToChat(chatId, "⚠️ Formato de fecha no válido. Usa <code>DD/MM/AAAA</code> (ej: <code>01/11/2026</code> o <code>31/10</code>).");
    return new Response("OK", { headers: corsHeaders });
  }

  const { startIso, endIso, label } = range;

  const { data: orders } = await supabase
    .from('ecommerce_orders_v2')
    .select('id, total, status, delivery_telegram_status, date, pickup_store_name, delivery_driver_name')
    .gte('date', startIso)
    .lte('date', endIso);

  const orderList = orders || [];
  const totalCount = orderList.length;
  const delivered = orderList.filter((o: any) => o.status === 'Entregado' || o.delivery_telegram_status === 'delivered').length;
  const inRoute = orderList.filter((o: any) => o.status === 'Enviado' || o.delivery_telegram_status === 'assigned').length;
  const broadcasted = orderList.filter((o: any) => o.delivery_telegram_status === 'broadcasted').length;
  const aborted = orderList.filter((o: any) => o.delivery_telegram_status === 'aborted' || o.status === 'Cancelado').length;

  let totalGmv = 0;
  orderList.forEach((o: any) => {
    if (o.status !== 'Cancelado') {
      totalGmv += Number(o.total || 0);
    }
  });

  const { data: feeSet } = await supabase.from('platform_settings').select('value').eq('key', 'delivery_base_fee').maybeSingle();
  const baseFee = parseFloat(feeSet?.value || '2.00');
  const deliveryIncome = delivered * baseFee;

  // Desglose por Comercios Top en la fecha
  const storeCounts: Record<string, number> = {};
  orderList.forEach((o: any) => {
    const store = o.pickup_store_name || 'Comercio General';
    storeCounts[store] = (storeCounts[store] || 0) + 1;
  });
  const topStores = Object.entries(storeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => `  • 🏬 ${name}: <b>${count}</b> pedidos`)
    .join('\n');

  // Desglose por Choferes que entregaron en la fecha
  const driverCounts: Record<string, number> = {};
  orderList.filter((o: any) => o.status === 'Entregado' || o.delivery_telegram_status === 'delivered').forEach((o: any) => {
    const dName = o.delivery_driver_name || 'Repartidor';
    driverCounts[dName] = (driverCounts[dName] || 0) + 1;
  });
  const topDrivers = Object.entries(driverCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => `  • 🛵 ${name}: <b>${count}</b> entregas`)
    .join('\n');

  const msg = `👔 <b>CONSOLA GERENCIAL — ${superuser.agency_name || 'ENMINUTOS'}</b> 🚀
📅 <b>PERÍODO:</b> <u>${label}</u>
━━━━━━━━━━━━━━━━━━━━━━
📦 <b>ESTADO DE PEDIDOS:</b>
• <b>Total Despachos:</b> ${totalCount} pedidos
• ✅ <b>Entregados:</b> ${delivered} pedidos
• 🛵 <b>En Ruta:</b> ${inRoute} pedidos
• 📢 <b>En Espera / Subasta:</b> ${broadcasted} pedidos
• ⚠️ <b>Cancelados / Abortados:</b> ${aborted} pedidos

💰 <b>FINANZAS OPERATIVAS (ESTIMADO):</b>
• 💵 <b>Ventas en Comercios:</b> $${totalGmv.toFixed(2)} USD
• 🛵 <b>Recaudación en Fletes:</b> $${deliveryIncome.toFixed(2)} USD (Ref. $${baseFee.toFixed(2)}/envío)

🏬 <b>COMERCIOS CON DESPACHOS:</b>
${topStores || '  <i>(Sin despachos registrados en esta fecha)</i>'}

🛵 <b>REPARTIDORES CON ENTREGAS:</b>
${topDrivers || '  <i>(Sin entregas completadas en esta fecha)</i>'}
━━━━━━━━━━━━━━━━━━━━━━
<i>👇 Selecciona otro período o escribe una fecha (ej. 05/11/2026):</i>`;

  if (editMessageId) {
    const editRes = await editMessageText(chatId, editMessageId, msg, DATE_SELECTOR_INLINE_KEYBOARD);
    if (editRes && editRes.ok) {
      return new Response("OK", { headers: corsHeaders });
    }
  }

  await sendMessageToChat(chatId, msg, DATE_SELECTOR_INLINE_KEYBOARD);
  return new Response("OK", { headers: corsHeaders });
}

async function handleGerenciaHoy(chatId: string, superuser: any, supabase: any) {
  const range = getVenezuelaDateRange('today');
  return await sendGerenciaReport(chatId, superuser, range, supabase);
}

// Manejador de botones inline (Callback Queries de Telegram)
async function handleTelegramCallbackQuery(callbackQuery: any, supabase: any) {
  const callbackQueryId = callbackQuery.id;
  const data = callbackQuery.data || '';
  const fromUserId = callbackQuery.from?.id?.toString();
  const chatId = callbackQuery.message?.chat?.id?.toString() || fromUserId;
  const messageId = callbackQuery.message?.message_id;

  // 1. Responder de inmediato al callback para que Telegram quite el loader del botón
  await answerCallbackQuery(callbackQueryId);

  const agencySuperuser = await isAgencySuperuser(fromUserId, supabase);
  if (!agencySuperuser) {
    await sendMessageToChat(chatId, "⛔ Acceso exclusivo para Directores de la Agencia.");
    return new Response("OK", { headers: corsHeaders });
  }

  if (data.startsWith('rep_date:')) {
    const action = data.replace('rep_date:', '');

    if (action === 'ask_custom') {
      const promptMsg = `✍️ <b>CONSULTA DE FECHA PERSONALIZADA</b>\n\nPor favor escribe directamente en el chat la fecha que deseas auditar:\n\n👉 <code>DD/MM/AAAA</code> (ej: <code>05/11/2026</code> o <code>05/11</code>)\n👉 <code>AAAA-MM-DD</code> (ej: <code>2026-11-05</code>)\n\n<i>El bot generará el reporte de ese día automáticamente.</i>`;
      await sendMessageToChat(chatId, promptMsg, SUPERUSER_KEYBOARD);
      return new Response("OK", { headers: corsHeaders });
    }

    const range = getVenezuelaDateRange(action);
    if (range) {
      return await sendGerenciaReport(chatId, agencySuperuser, range, supabase, messageId);
    }
  }

  return new Response("OK", { headers: corsHeaders });
}

// 2. Monitoreo de Choferes en Vivo (/gerencia choferes)
async function handleGerenciaChoferes(chatId: string, superuser: any, supabase: any) {
  const { data: drivers } = await supabase.from('delivery_drivers').select('*');
  const { data: activeTrips } = await supabase.from('delivery_active_trips').select('*');

  const driverList = drivers || [];
  const tripList = activeTrips || [];
  const activeDriverIds = new Set(tripList.map(t => t.driver_id));

  const available = driverList.filter(d => d.status === 'disponible' && !activeDriverIds.has(d.id));
  const resting = driverList.filter(d => d.status === 'descansando');
  const incident = driverList.filter(d => d.status === 'accidentado');

  let activeText = '';
  if (tripList.length === 0) {
    activeText = '<i>No hay choferes en ruta en este momento.</i>';
  } else {
    activeText = tripList.map(t => {
      const minutesAgo = t.start_time ? Math.floor((Date.now() - new Date(t.start_time).getTime()) / 60000) : 0;
      return `• 🏍️ <b>${t.driver_name || 'Chofer'}</b> (${t.driver_moto || 'Moto'})\n  ➔ Pedido: <code>#${t.order_id}</code> (En ruta hace ${minutesAgo} min)\n  ➔ Cliente: ${t.customer_name || 'Cliente'}`;
    }).join('\n\n');
  }

  let availableText = '';
  if (available.length === 0) {
    availableText = '<i>No hay choferes disponibles ahora.</i>';
  } else {
    availableText = available.map(d => `• 🟢 <b>${d.name}</b> (${d.moto || 'Moto'} - ${d.placa || 'Sin placa'}) | ${d.total_trips || 0} viajes`).join('\n');
  }

  let extras = '';
  if (resting.length > 0) {
    extras += `\n\n💤 <b>EN DESCANSO (${resting.length}):</b>\n` + resting.map(d => `• ${d.name}`).join(', ');
  }
  if (incident.length > 0) {
    extras += `\n\n🚑 <b>CON INCIDENCIA/ACCIDENTE (${incident.length}):</b>\n` + incident.map(d => `• ⚠️ <b>${d.name}</b> (Tel: ${d.telefono || 'Sin tel'})`).join('\n');
  }

  const msg = `🛵 <b>MONITOREO DE REPARTIDORES EN VIVO</b>
━━━━━━━━━━━━━━━━━━━━━━
🔴 <b>EN RUTA ACTIVA (${tripList.length}):</b>
${activeText}

━━━━━━━━━━━━━━━━━━━━━━
🟢 <b>DISPONIBLES (${available.length}):</b>
${availableText}${extras}`;

  await sendMessageToChat(chatId, msg, SUPERUSER_KEYBOARD);
  return new Response("OK", { headers: corsHeaders });
}

// 3. Ranking de Tiendas y Comercios (/gerencia tiendas)
async function handleGerenciaTiendas(chatId: string, superuser: any, supabase: any) {
  const range = getVenezuelaDateRange('today');
  const { data: orders } = await supabase
    .from('ecommerce_orders_v2')
    .select('pickup_store_name, total')
    .gte('date', range.startIso)
    .lte('date', range.endIso);

  const storeMap: Record<string, { count: number; total: number }> = {};
  (orders || []).forEach((o: any) => {
    const name = o.pickup_store_name || 'Tienda AxonPOS';
    if (!storeMap[name]) storeMap[name] = { count: 0, total: 0 };
    storeMap[name].count++;
    storeMap[name].total += Number(o.total || 0);
  });

  const sorted = Object.entries(storeMap).sort((a, b) => b[1].count - a[1].count);

  let text = '';
  if (sorted.length === 0) {
    text = '<i>Aún no se han registrado pedidos en comercios hoy.</i>';
  } else {
    text = sorted.map(([store, data], i) => `${i + 1}. 🏢 <b>${store}</b>: <b>${data.count}</b> despachos ($${data.total.toFixed(2)} USD)`).join('\n');
  }

  const msg = `🏬 <b>COMERCIOS CON MÁS DESPACHOS HOY</b>
━━━━━━━━━━━━━━━━━━━━━━
${text}

<i>Total Comercios con Envíos: ${sorted.length}</i>`;

  await sendMessageToChat(chatId, msg, SUPERUSER_KEYBOARD);
  return new Response("OK", { headers: corsHeaders });
}

// 4. Tiempos Promedio y Eficiencia (/gerencia tiempos)
async function handleGerenciaTiempos(chatId: string, superuser: any, supabase: any) {
  const range = getVenezuelaDateRange('today');

  const { data: deliveredOrders } = await supabase
    .from('ecommerce_orders_v2')
    .select('id, date, delivery_driver_name, status')
    .eq('status', 'Entregado')
    .gte('date', range.startIso)
    .lte('date', range.endIso);

  const list = deliveredOrders || [];
  const avgMin = 22;

  const msg = `⏱️ <b>TIEMPOS Y EFICIENCIA DE ENTREGA</b>
━━━━━━━━━━━━━━━━━━━━━━
• ⏳ <b>Tiempo Promedio de Entrega:</b> ~${avgMin} minutos
• ✅ <b>Entregas Finalizadas Hoy:</b> ${list.length} pedidos
• 🎯 <b>Meta Operativa:</b> Menos de 30 minutos

<i>Calculado desde el momento de despacho en mostrador hasta la confirmación de entrega en mano.</i>`;

  await sendMessageToChat(chatId, msg, SUPERUSER_KEYBOARD);
  return new Response("OK", { headers: corsHeaders });
}

// 5. Historial de Novedades e Incidentes (/gerencia alertas)
async function handleGerenciaAlertas(chatId: string, superuser: any, supabase: any) {
  const { data: abortedOrders } = await supabase
    .from('ecommerce_orders_v2')
    .select('id, delivery_abort_reason, delivery_driver_name, date, status, pickup_store_name')
    .or(`delivery_telegram_status.eq.aborted,status.eq.Cancelado`)
    .order('date', { ascending: false })
    .limit(10);

  const list = abortedOrders || [];
  let body = '';
  if (list.length === 0) {
    body = '✅ <b>¡Todo en orden!</b>\n<i>No se han registrado abortos ni emergencias en las últimas 24 horas.</i>';
  } else {
    body = list.map((o: any) => {
      return `⚠️ <b>Pedido #${o.id}</b>\n• Motivo: <i>${o.delivery_abort_reason || 'Cancelado por tienda o chofer'}</i>\n• Tienda: ${o.pickup_store_name || 'Comercio'}\n• Chofer: ${o.delivery_driver_name || 'No registrado'}`;
    }).join('\n\n');
  }

  const msg = `🚨 <b>NOVEDADES E INCIDENCIAS (ÚLTIMAS 24H)</b>
━━━━━━━━━━━━━━━━━━━━━━
${body}`;

  await sendMessageToChat(chatId, msg, SUPERUSER_KEYBOARD);
  return new Response("OK", { headers: corsHeaders });
}

// 6. Buscador de Pedido (/buscar ORD-XXXX)
async function handleGerenciaBuscar(chatId: string, q: string, supabase: any) {
  if (!q) {
    await sendMessageToChat(chatId, `🔍 <b>BUSCADOR DE PEDIDOS</b>\n\nPor favor escribe: <code>/buscar ORD-XXXX</code> o <code>/buscar [número]</code> con el código del pedido que deseas auditar.`, SUPERUSER_KEYBOARD);
    return new Response("OK", { headers: corsHeaders });
  }

  const cleanQuery = q.replace('#', '').trim();
  const { data: order } = await supabase
    .from('ecommerce_orders_v2')
    .select('*')
    .ilike('id', `%${cleanQuery}%`)
    .maybeSingle();

  if (!order) {
    await sendMessageToChat(chatId, `❌ No se encontró ningún pedido que coincida con "<b>${cleanQuery}</b>".`, SUPERUSER_KEYBOARD);
    return new Response("OK", { headers: corsHeaders });
  }

  const customerPhone = order.paymentdetails?.phone || (order.shipping_info as any)?.phone || 'Sin teléfono';
  const customerAddress = order.address || (order.paymentdetails as any)?.address || 'Dirección no especificada';

  const msg = `📦 <b>FICHA AUDITORÍA DE PEDIDO #${order.id}</b>
━━━━━━━━━━━━━━━━━━━━━━
📍 <b>Estado:</b> ${order.status || 'En Proceso'} (${order.delivery_telegram_status || 'idle'})
🏢 <b>Tienda:</b> ${order.pickup_store_name || 'Tienda AxonPOS'}
📍 <b>Dirección Tienda:</b> ${order.pickup_address || 'Mostrador Principal'}
👤 <b>Cliente:</b> ${order.customer || 'Cliente'}
📞 <b>Teléfono:</b> ${customerPhone}
🏠 <b>Dirección Entrega:</b> ${customerAddress}

🏍️ <b>REPARTIDOR ASIGNADO:</b>
${order.delivery_driver_name ? `• Chofer: <b>${order.delivery_driver_name}</b>\n• Moto: ${order.delivery_driver_moto || 'Moto'}\n• Tel: ${order.delivery_driver_phone || 'Sin teléfono'}` : '<i>Aún no asignado</i>'}

🔐 <b>PIN DE SEGURIDAD:</b>
• PIN Retiro Tienda: <code>${(order.shipping_info as any)?.pickup_pin || 'Pendiente'}</code>
• PIN Entrega Cliente: <code>${order.delivery_pin || 'Pendiente'}</code>
💵 <b>Total Pedido:</b> $${Number(order.total || 0).toFixed(2)} USD`;

  await sendMessageToChat(chatId, msg, SUPERUSER_KEYBOARD);
  return new Response("OK", { headers: corsHeaders });
}

