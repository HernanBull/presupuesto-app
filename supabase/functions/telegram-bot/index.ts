import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || Deno.env.get('VITE_TELEGRAM_BOT_TOKEN') || '8931657407:AAHJtYXikKfBtYowHHB0HBKhaRUskhyyfHo';
const TELEGRAM_BOT_USERNAME = 'DeliveryAxonbot';

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

    // Otherwise, assume it's an Update from Telegram Webhook
    return await handleTelegramUpdate(body, supabase);
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
})

// === Logica para manejar el envío desde la app ===
async function handleSendDelivery({ commerceId, customerData, customOrderId }, supabase) {
  const { data: setting } = await supabase.from('platform_settings').select('value').eq('key', 'delivery_master_group_id').single();
  const chatId = setting ? setting.value : null;

  if (!chatId) {
    return new Response(JSON.stringify({ success: false, error: "No hay un Grupo Maestro configurado." }), { status: 400, headers: corsHeaders });
  }

  const orderId = customOrderId || 'ORD-' + Math.random().toString(36).substr(2, 6).toUpperCase();

  let deliveryPin = customerData.deliveryPin;
  if (!deliveryPin) {
    deliveryPin = Math.floor(100000 + Math.random() * 900000).toString();
    await supabase.from('ecommerce_orders_v2').update({ delivery_pin: deliveryPin }).eq('id', orderId);
  }

  const gpsLink = customerData.location ? `\n📍 <b>GPS:</b> https://www.google.com/maps?q=${customerData.location.lat},${customerData.location.lng}` : '';
  const message = `🚨 <b>NUEVO VIAJE DISPONIBLE</b> 🚨\n🆔 <b>Pedido:</b> #${orderId}\n🏪 <b>Comercio:</b> ${commerceId}\n\n📍 <b>ZONA DE ENTREGA</b>\n<code>${customerData.zone}</code>${gpsLink}\n\n📦 <b>DETALLES DEL PAQUETE</b>\n<b>Tipo:</b> ${customerData.packageType}\n<b>Productos:</b> \n<code>${customerData.productList}</code>\n${customerData.weight ? `\n⚖️ <b>Peso:</b> ${customerData.weight} kg` : ''}\n${customerData.quantity ? `\n🔢 <b>Cantidad:</b> ${customerData.quantity} uds` : ''}\n\n<i>(El teléfono y dirección exacta se enviarán por privado al aceptar el viaje por seguridad)</i>`;

  const replyMarkup = {
    inline_keyboard: [
      [{ text: "🚗 Aceptar Viaje", url: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=accept_${orderId}` }],
      [{ text: "🗺️ Ver Mapa de la Zona", url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customerData.zone)}` }]
    ]
  };

  const telegramRes = await sendMessageToChat(chatId, message, replyMarkup);
  if (!telegramRes.ok) throw new Error("Error al enviar a Telegram");

  await supabase.from('delivery_pending_trips').insert([{ order_id: orderId, customer_data: JSON.stringify(customerData), delivery_pin: deliveryPin }]);

  return new Response(JSON.stringify({ success: true, orderId, deliveryPin }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
  if (!update.message) {
    return new Response("OK", { status: 200, headers: corsHeaders });
  }

  const text = update.message.text || '';
  const chatId = update.message.chat?.id?.toString();
  const driverName = update.message.from?.first_name || "Conductor";
  const userId = update.message.from?.id;

  if (!chatId) return new Response("OK");

  // Validaciones de seguridad para chats privados
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

  if (text === '/id_admin_axon') {
    await sendMessageToChat(chatId, `🛡️ El ID de este chat/grupo es: <code>${chatId}</code>`);
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
    await sendMessageToChat(chatId, `🛠️ <b>MENÚ DE AYUDA DE REPARTIDORES</b> 🛠️\n\n🔹 <b>/registrar</b> - Llena tus datos para poder trabajar.\n🔹 <b>/perfil</b> - Revisa tus estadísticas y viajes completados.\n🔹 <b>/ayuda</b> - Muestra este mensaje.\n\n📌 <b>REGLAS DE LA AGENCIA:</b>\n1️⃣ Cuando el bot envíe un viaje al grupo, presiona "Aceptar Viaje".\n2️⃣ El bot te enviará por privado la dirección exacta del cliente.\n3️⃣ Al entregar el pedido pídele al cliente el <b>PIN de Seguridad</b>.\n4️⃣ Presiona "Marcar como Entregado".\n5️⃣ 🚨 <b>IMPORTANTE:</b> Si te accidentas, usa el botón rojo "Abortar Viaje" para que otro compañero pueda llevar el pedido urgente.`);
    return new Response("OK", { headers: corsHeaders });
  }

  if (text === '/perfil' || text === '/mis_viajes') {
    if (!driverData) {
      await sendMessageToChat(chatId, "⚠️ Aún no estás registrado. Escribe /registrar para comenzar.");
      return new Response("OK", { headers: corsHeaders });
    }
    await sendMessageToChat(chatId, `👤 <b>TU PERFIL DE REPARTIDOR</b>\n\n📛 <b>Nombre:</b> ${driverData.name}\n🆔 <b>ID Agencia:</b> ${driverData.driver_code}\n🏍️ <b>Vehículo:</b> ${driverData.moto}\n🏷️ <b>Placa:</b> ${driverData.placa}\n\n¡Sigue así, buen trabajo! 🚀`);
    return new Response("OK", { headers: corsHeaders });
  }

  // Flujo de Registro con Estado en BD
  const botStateKey = `bot_state_${chatId}`;
  const { data: stateData } = await supabase.from('platform_settings').select('value').eq('key', botStateKey).single();
  let state = stateData ? JSON.parse(stateData.value) : null;

  if (text === '/registrar') {
    if (driverData && driverData.name) {
      await sendMessageToChat(chatId, `⚠️ <b>Ya estás registrado</b> en el sistema.\n\n👤 <b>Nombre:</b> ${driverData.name}\n🆔 <b>ID Repartidor:</b> ${driverData.driver_code}\n\nSi deseas cambiar algún dato, comunícate con la agencia.`);
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
      state.step = 'WAITING_AGENCY';
      await supabase.from('platform_settings').upsert({ key: botStateKey, value: JSON.stringify(state) }, { onConflict: 'key' });
      await sendMessageToChat(chatId, "Excelente. Por último, ¿A qué <b>Agencia de Delivery</b> perteneces? (Ej. MotoYa, Independiente, etc):");
    } else if (state.step === 'WAITING_AGENCY') {
      state.agencia = text;
      const driverCode = 'REP-' + Math.floor(1000 + Math.random() * 9000);

      if (!driverData) {
        await supabase.from('delivery_drivers').insert([{ id: chatId, driver_code: driverCode, name: state.fullName, cedula: '', telefono: state.telefono, age: '', moto: state.moto, placa: '', agencia: state.agencia }]);
      } else {
        await supabase.from('delivery_drivers').update({ driver_code: driverCode, name: state.fullName, telefono: state.telefono, moto: state.moto, agencia: state.agencia }).eq('id', chatId);
      }
      
      await supabase.from('platform_settings').delete().eq('key', botStateKey); // Clear state
      await sendMessageToChat(chatId, `✅ <b>¡Felicidades!</b> Tus datos han sido registrados exitosamente. Ya puedes empezar a aceptar viajes.\n\nTu ID único de repartidor es: <b>${driverCode}</b>`);
    }
    return new Response("OK", { headers: corsHeaders });
  }

  // Comandos Start
  if (text === '/start') {
    await sendMessageToChat(chatId, "👋 ¡Hola! Bienvenido al bot de Delivery. Si deseas tomar un viaje, asegúrate de presionar el botón 'Aceptar Viaje' en el grupo de notificaciones. Si eres nuevo, escribe /registrar para comenzar.");
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

    const customerData = JSON.parse(pendingOrder.customer_data);

    await supabase.from('delivery_pending_trips').delete().eq('order_id', orderId);
    await supabase.from('delivery_active_trips').insert([{ order_id: orderId, driver_id: chatId, pin: pendingOrder.delivery_pin, customer_name: customerData.name, customer_data: pendingOrder.customer_data, start_time: new Date().toISOString() }]);

    const gpsLink = customerData.location ? `\n📍 <b>Mapa GPS:</b> https://www.google.com/maps?q=${customerData.location.lat},${customerData.location.lng}` : '';
    const privateMessage = `✅ <b>¡VIAJE ACEPTADO CON ÉXITO!</b> ✅\nAquí tienes los datos privados del cliente:\n\n👤 <b>Cliente:</b> ${customerData.name}\n📱 <b>Teléfono:</b> ${customerData.phone}\n📍 <b>Dirección Exacta:</b> \n<code>${customerData.address}</code>${gpsLink}\n\n🔐 <b>PIN DE ENTREGA:</b> <code>${pendingOrder.delivery_pin}</code>\n<i>(Pídele este código de 6 dígitos al cliente)</i>`;
    const replyMarkup = {
      inline_keyboard: [
        [{ text: "✅ Marcar como Entregado", url: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=complete_${orderId}` }],
        [{ text: "🚨 Abortar Viaje (Emergencia)", url: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=cancel_${orderId}` }]
      ]
    };
    await sendMessageToChat(chatId, privateMessage, replyMarkup);

    const { data: setting } = await supabase.from('platform_settings').select('value').eq('key', 'delivery_master_group_id').single();
    if (setting && setting.value) {
      await sendMessageToChat(setting.value, `🔒 El pedido <b>#${orderId}</b> ha sido tomado por <b>${driverName}</b>.`);
    }
  } else if (text.startsWith('/start complete_')) {
    const orderId = text.replace('/start complete_', '');
    await supabase.from('ecommerce_orders_v2').update({ driver_confirmed: 1 }).eq('id', orderId);

    const { data: order } = await supabase.from('ecommerce_orders_v2').select('customer_confirmed').eq('id', orderId).single();
    if (order && order.customer_confirmed === 1) {
      await supabase.from('delivery_active_trips').delete().eq('order_id', orderId);
      await sendMessageToChat(chatId, `✅ <b>¡Listo!</b> El cliente también ha confirmado de recibido. Pedido <b>#${orderId}</b> finalizado con éxito. ¡Buen trabajo!`);

      const { data: setting } = await supabase.from('platform_settings').select('value').eq('key', 'delivery_master_group_id').single();
      if (setting && setting.value) {
        await sendMessageToChat(setting.value, `✅ El pedido <b>#${orderId}</b> ha sido entregado exitosamente por <b>${driverName}</b> y el cliente ha confirmado.`);
      }

      await supabase.from('ecommerce_orders_v2').update({ status: 'Entregado' }).eq('id', orderId);
    } else {
      await sendMessageToChat(chatId, `⏳ <b>¡Buen trabajo!</b> Ya entregaste el pedido <b>#${orderId}</b>. Ahora estamos esperando que el cliente confirme de recibido en la app.`);
    }
  } else if (text.startsWith('/start cancel_')) {
    const orderId = text.replace('/start cancel_', '');
    const { data: active } = await supabase.from('delivery_active_trips').select('*').eq('order_id', orderId).single();

    if (!active) {
      await sendMessageToChat(chatId, "❌ Este viaje ya no está en curso o ya fue cancelado.");
      return new Response("OK", { headers: corsHeaders });
    }

    await sendMessageToChat(chatId, `🚨 <b>VIAJE ABORTADO</b> 🚨\n\nHas cancelado el pedido <b>#${orderId}</b>. Será asignado a otro compañero.`);
    await supabase.from('delivery_active_trips').delete().eq('order_id', orderId);
    await supabase.from('delivery_pending_trips').insert([{ order_id: active.order_id, customer_data: active.customer_data, delivery_pin: active.pin }]);

    const { data: setting } = await supabase.from('platform_settings').select('value').eq('key', 'delivery_master_group_id').single();
    if (setting && setting.value) {
      const retryMessage = `🚨 <b>¡VIAJE ABANDONADO - ALTA PRIORIDAD!</b> 🚨\n🆔 <b>Pedido:</b> #${orderId}\n\nEl conductor <b>${driverName}</b> ha tenido un inconveniente y abortó el viaje.\n¡Necesitamos a alguien más de inmediato!\n\n<i>(Presiona el botón para tomar este viaje de emergencia)</i>`;
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

async function sendMessageToChat(chatId, text, replyMarkup = undefined) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', reply_markup: replyMarkup })
    });
    return await res.json();
  } catch (e) {
    console.error("Error enviando mensaje Telegram:", e);
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
