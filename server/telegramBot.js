import fetch from 'node-fetch'; // Polyfill or use global fetch if Node 18+

let globalOffset = 0;
let isEngineRunning = false;
const botState = {}; 

const TELEGRAM_BOT_TOKEN = process.env.VITE_TELEGRAM_BOT_TOKEN || '8931657407:AAHJtYXikKfBtYowHHB0HBKhaRUskhyyfHo';
const TELEGRAM_BOT_USERNAME = process.env.VITE_TELEGRAM_BOT_USERNAME || 'DeliveryAxonbot';

export const sendMessageToChat = async (chatId, text, replyMarkup = undefined) => {
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
};

export const isUserInGroup = async (userId, groupId) => {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChatMember?chat_id=${groupId}&user_id=${userId}`);
    const data = await res.json();
    if (data.ok && data.result) {
      const status = data.result.status;
      return ['creator', 'administrator', 'member', 'restricted'].includes(status);
    }
    return false;
  } catch (e) {
    console.error("Error verificando membresía de grupo:", e);
    return false;
  }
};

export const startTelegramEngine = (db, io) => {
  if (isEngineRunning) return;
  isEngineRunning = true;
  console.log("🚀 Motor de Telegram iniciado en el backend.");

  const poll = async () => {
    if (!isEngineRunning) return;
    try {
      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${globalOffset}&timeout=20`);
      const data = await res.json();
      
      if (data.ok && data.result.length > 0) {
        for (const update of data.result) {
          globalOffset = update.update_id + 1;
          const text = update.message?.text || '';
          const chatId = update.message?.chat?.id?.toString();
          const driverName = update.message?.from?.first_name || "Conductor";

          if (!chatId) continue;

          const userId = update.message?.from?.id;

          // --- BARRERA DE SEGURIDAD: Validación de Membresía (Whitelist) ---
          // Si es un chat privado, verificamos que el usuario esté en el grupo maestro
          if (userId && !chatId.startsWith('-')) {
            const setting = db.prepare("SELECT value FROM platform_settings WHERE key = 'delivery_master_group_id'").get();
            const masterGroupId = setting ? setting.value : null;

            if (masterGroupId) {
              const inGroup = await isUserInGroup(userId, masterGroupId);
              if (!inGroup) {
                if (text.startsWith('/')) {
                  await sendMessageToChat(chatId, "⛔ <b>Acceso Denegado</b>\n\nDebes pertenecer al grupo oficial de repartidores para usar este bot.");
                }
                continue; // Ignorar y bloquear
              }
            }
          }

          // Driver from DB
          let driverData = db.prepare('SELECT * FROM delivery_drivers WHERE id = ?').get(chatId);

          if (driverData && driverData.banned) {
            if (text.startsWith('/')) {
              await sendMessageToChat(chatId, "⛔ <b>ACCESO DENEGADO</b>\n\nEstás suspendido de la agencia y no puedes interactuar con el bot ni tomar viajes.");
            }
            continue;
          }

          if (text === '/id_admin_axon') {
            await sendMessageToChat(chatId, `🛡️ El ID de este chat/grupo es: <code>${chatId}</code>`);
            continue;
          }

          // --- BARRERA DE SEGURIDAD: Grupos no autorizados ---
          // Si el bot está en un grupo (chatId negativo) que no es el oficial configurado, ignorar comandos.
          if (chatId.startsWith('-')) {
            const setting = db.prepare("SELECT value FROM platform_settings WHERE key = 'delivery_master_group_id'").get();
            if (!setting || setting.value !== chatId) {
              continue; // Ignora silenciosamente para evitar que el bot responda a intrusos en grupos al azar
            }
          }

          if (text === '/ayuda') {
            const helpText = `🛠️ <b>MENÚ DE AYUDA DE REPARTIDORES</b> 🛠️\n\n🔹 <b>/registrar</b> - Llena tus datos para poder trabajar.\n🔹 <b>/perfil</b> - Revisa tus estadísticas y viajes completados.\n🔹 <b>/ayuda</b> - Muestra este mensaje.\n\n📌 <b>REGLAS DE LA AGENCIA:</b>\n1️⃣ Cuando el bot envíe un viaje al grupo, presiona "Aceptar Viaje".\n2️⃣ El bot te enviará por privado la dirección exacta del cliente.\n3️⃣ Al entregar el pedido pídele al cliente el <b>PIN de Seguridad</b>.\n4️⃣ Presiona "Marcar como Entregado".\n5️⃣ 🚨 <b>IMPORTANTE:</b> Si te accidentas, usa el botón rojo "Abortar Viaje" para que otro compañero pueda llevar el pedido urgente.`;
            await sendMessageToChat(chatId, helpText);
            continue;
          }

          if (text === '/perfil' || text === '/mis_viajes') {
            if (!driverData) {
              await sendMessageToChat(chatId, "⚠️ Aún no estás registrado. Escribe /registrar para comenzar.");
              continue;
            }
            
            // Mis viajes (Orders where status = Entregado and driver is this one)
            // But we don't have driver_id in ecommerce_orders_v2, so let's just show 0 or query active trips
            const completedCount = 0; // Se puede mejorar si se guarda el driver_id en orders
            const perfilText = `👤 <b>TU PERFIL DE REPARTIDOR</b>\n\n📛 <b>Nombre:</b> ${driverData.name}\n🆔 <b>ID Agencia:</b> ${driverData.driver_code}\n🏍️ <b>Vehículo:</b> ${driverData.moto}\n🏷️ <b>Placa:</b> ${driverData.placa}\n\n✅ <b>Viajes Completados Totales:</b> ${completedCount}\n\n¡Sigue así, buen trabajo! 🚀`;
            await sendMessageToChat(chatId, perfilText);
            continue;
          }

          // Registration logic
          if (text === '/registrar') {
            if (driverData && driverData.name) {
              await sendMessageToChat(chatId, `⚠️ <b>Ya estás registrado</b> en el sistema.\n\n👤 <b>Nombre:</b> ${driverData.name}\n🆔 <b>ID Repartidor:</b> ${driverData.driver_code}\n\nSi deseas cambiar algún dato, comunícate con la agencia.`);
            } else {
              botState[chatId] = { step: 'WAITING_NAME' };
              await sendMessageToChat(chatId, "¡Hola! Bienvenido al proceso de registro de repartidores. 🛵\n\nPor favor, ingresa tu <b>Nombre Completo</b>:");
            }
          }
          else if (botState[chatId] && !text.startsWith('/start')) {
            const state = botState[chatId];
            if (state.step === 'WAITING_NAME') {
              state.fullName = text; state.step = 'WAITING_PHONE';
              await sendMessageToChat(chatId, `Perfecto, ${text}. Ahora, por favor ingresa tu <b>Número de Teléfono</b> (Ej. 0414-1234567):`);
            }
            else if (state.step === 'WAITING_PHONE') {
              state.telefono = text; state.step = 'WAITING_MOTO';
              await sendMessageToChat(chatId, "¡Entendido! Ahora dime, ¿Qué <b>Modelo de Vehículo</b> conduces? (Ej. Bera SBR)");
            }
            else if (state.step === 'WAITING_MOTO') {
              state.moto = text; state.step = 'WAITING_AGENCY';
              await sendMessageToChat(chatId, "Excelente. Por último, ¿A qué <b>Agencia de Delivery</b> perteneces? (Ej. MotoYa, Independiente, etc):");
            }
            else if (state.step === 'WAITING_AGENCY') {
              state.agencia = text;
              const driverCode = 'REP-' + Math.floor(1000 + Math.random() * 9000);
              
              if (!driverData) {
                db.prepare(`INSERT INTO delivery_drivers (id, driver_code, name, cedula, telefono, age, moto, placa, agencia) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
                  chatId, driverCode, state.fullName, '', state.telefono, '', state.moto, '', state.agencia
                );
              } else {
                db.prepare(`UPDATE delivery_drivers SET driver_code=?, name=?, telefono=?, moto=?, agencia=? WHERE id=?`).run(
                  driverCode, state.fullName, state.telefono, state.moto, state.agencia, chatId
                );
              }
              delete botState[chatId];
              await sendMessageToChat(chatId, `✅ <b>¡Felicidades!</b> Tus datos han sido registrados exitosamente. Ya puedes empezar a aceptar viajes.\n\nTu ID único de repartidor es: <b>${driverCode}</b>`);
            }
          }
          else if (text === '/start') {
            await sendMessageToChat(chatId, "👋 ¡Hola! Bienvenido al bot de Delivery. Si deseas tomar un viaje, asegúrate de presionar el botón 'Aceptar Viaje' en el grupo de notificaciones. Si eres nuevo, escribe /registrar para comenzar.");
          }
          else if (text.startsWith('/start accept_')) {
            const orderId = text.replace('/start accept_', '');
            const pendingOrder = db.prepare('SELECT * FROM delivery_pending_trips WHERE order_id = ?').get(orderId);
            
            if (!pendingOrder) {
              await sendMessageToChat(chatId, "❌ Este viaje ya no está disponible o ya fue tomado.");
              continue;
            }

            if (!driverData || !driverData.name) {
              await sendMessageToChat(chatId, `❌ No puedes aceptar el viaje porque no estás registrado. Usa el comando /registrar primero.`);
              continue;
            }

            const customerData = JSON.parse(pendingOrder.customer_data);
            
            // Move to active
            db.prepare('DELETE FROM delivery_pending_trips WHERE order_id = ?').run(orderId);
            db.prepare('INSERT INTO delivery_active_trips (order_id, driver_id, pin, customer_name, customer_data, start_time) VALUES (?, ?, ?, ?, ?, ?)').run(
              orderId, chatId, pendingOrder.delivery_pin, customerData.name, pendingOrder.customer_data, new Date().toISOString()
            );

            const gpsLink = customerData.location ? `\n📍 <b>Mapa GPS:</b> https://www.google.com/maps?q=${customerData.location.lat},${customerData.location.lng}` : '';
            const privateMessage = `✅ <b>¡VIAJE ACEPTADO CON ÉXITO!</b> ✅\nAquí tienes los datos privados del cliente:\n\n👤 <b>Cliente:</b> ${customerData.name}\n📱 <b>Teléfono:</b> ${customerData.phone}\n📍 <b>Dirección Exacta:</b> \n<code>${customerData.address}</code>${gpsLink}\n\n🔐 <b>PIN DE ENTREGA:</b> <code>${pendingOrder.delivery_pin}</code>\n<i>(Pídele este código de 6 dígitos al cliente)</i>`;
            const replyMarkup = { 
              inline_keyboard: [
                [{ text: "✅ Marcar como Entregado", url: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=complete_${orderId}` }],
                [{ text: "🚨 Abortar Viaje (Emergencia)", url: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=cancel_${orderId}` }]
              ] 
            };
            await sendMessageToChat(chatId, privateMessage, replyMarkup);

            // Avisar al grupo maestro
            const setting = db.prepare("SELECT value FROM platform_settings WHERE key = 'delivery_master_group_id'").get();
            const masterChatId = setting ? setting.value : null;
            if (masterChatId) {
              await sendMessageToChat(masterChatId, `🔒 El pedido <b>#${orderId}</b> ha sido tomado por <b>${driverName}</b>.`);
            }
            
            io.emit('delivery_accepted', { orderId, driver: driverData });
          }
          else if (text.startsWith('/start complete_')) {
            const orderId = text.replace('/start complete_', '');
            
            // Mark driver confirmed
            try {
               db.prepare('UPDATE ecommerce_orders_v2 SET driver_confirmed = 1 WHERE id = ?').run(orderId);
            } catch(e) {}
            
            // Check if customer already confirmed
            const order = db.prepare('SELECT customer_confirmed FROM ecommerce_orders_v2 WHERE id = ?').get(orderId);
            if (order && order.customer_confirmed === 1) {
              db.prepare('DELETE FROM delivery_active_trips WHERE order_id = ?').run(orderId);
              await sendMessageToChat(chatId, `✅ <b>¡Listo!</b> El cliente también ha confirmado de recibido. Pedido <b>#${orderId}</b> finalizado con éxito. ¡Buen trabajo!`);
              
              const setting = db.prepare("SELECT value FROM platform_settings WHERE key = 'delivery_master_group_id'").get();
              if (setting && setting.value) {
                await sendMessageToChat(setting.value, `✅ El pedido <b>#${orderId}</b> ha sido entregado exitosamente por <b>${driverName}</b> y el cliente ha confirmado.`);
              }
              
              // Update the main ecommerce order
              db.prepare("UPDATE ecommerce_orders_v2 SET status = 'Entregado' WHERE id = ?").run(orderId);
              io.emit('delivery_completed', { orderId });
            } else {
              await sendMessageToChat(chatId, `⏳ <b>¡Buen trabajo!</b> Ya entregaste el pedido <b>#${orderId}</b>. Ahora estamos esperando que el cliente confirme de recibido en la app.`);
            }
          }
          else if (text.startsWith('/start cancel_')) {
            const orderId = text.replace('/start cancel_', '');
            const active = db.prepare('SELECT * FROM delivery_active_trips WHERE order_id = ?').get(orderId);
            
            if (!active) {
              await sendMessageToChat(chatId, "❌ Este viaje ya no está en curso o ya fue cancelado.");
              continue;
            }

            await sendMessageToChat(chatId, `🚨 <b>VIAJE ABORTADO</b> 🚨\n\nHas cancelado el pedido <b>#${orderId}</b>. Será asignado a otro compañero.`);
            
            db.prepare('DELETE FROM delivery_active_trips WHERE order_id = ?').run(orderId);
            
            // Re-add to pending
            db.prepare('INSERT INTO delivery_pending_trips (order_id, customer_data, delivery_pin) VALUES (?, ?, ?)').run(
              active.order_id, active.customer_data, active.pin
            );

            const setting = db.prepare("SELECT value FROM platform_settings WHERE key = 'delivery_master_group_id'").get();
            if (setting && setting.value) {
              const retryMessage = `🚨 <b>¡VIAJE ABANDONADO - ALTA PRIORIDAD!</b> 🚨\n🆔 <b>Pedido:</b> #${orderId}\n\nEl conductor <b>${driverName}</b> ha tenido un inconveniente y abortó el viaje.\n¡Necesitamos a alguien más de inmediato!\n\n<i>(Presiona el botón para tomar este viaje de emergencia)</i>`;
              const replyMarkup = {
                inline_keyboard: [
                  [{ text: "🚗 Aceptar Viaje Urgente", url: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=accept_${orderId}` }]
                ]
              };
              await sendMessageToChat(setting.value, retryMessage, replyMarkup);
            }

            io.emit('delivery_cancelled', { orderId });
          }
        }
      }
    } catch(e) { 
      // Silenciar timeout normal
    }
    
    if (isEngineRunning) {
      setTimeout(poll, 2000);
    }
  };

  poll();
};
