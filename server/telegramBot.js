import fetch from 'node-fetch'; // Polyfill or use global fetch if Node 18+

let globalOffset = 0;
let isEngineRunning = false;
const botState = {};
const alertedTrips = new Set();

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

export const startTelegramEngine = (supabase, io) => {
  if (isEngineRunning) return;
  isEngineRunning = true;
  console.log("🚀 Motor de Telegram iniciado en el backend.");

  // --- Límite de Tiempo de Entrega (Timeouts) ---
  setInterval(async () => {
    try {
      const { data: activeTrips } = await supabase.from('delivery_active_trips').select('*');
      if (activeTrips) {
        const now = new Date();
        for (const trip of activeTrips) {
          const startTime = new Date(trip.start_time);
          const diffMinutes = (now.getTime() - startTime.getTime()) / (1000 * 60);
          if (diffMinutes > 45 && !alertedTrips.has(trip.order_id)) {
            alertedTrips.add(trip.order_id);
            // Avisar al grupo maestro
            const { data: setting } = await supabase.from('platform_settings').select('value').eq('key', 'delivery_master_group_id').single();
            if (setting && setting.value) {
              await sendMessageToChat(setting.value, `⏱️ <b>¡ALERTA DE RETRASO!</b> ⏱️\nEl pedido <b>#${trip.order_id}</b> lleva más de 45 minutos en curso.\nConductor ID: <code>${trip.driver_id}</code>`);
            }
            // Avisar al conductor
            await sendMessageToChat(trip.driver_id, `⚠️ <b>ATENCIÓN</b>\nTu pedido <b>#${trip.order_id}</b> lleva más de 45 minutos en curso. ¿Todo está bien?\nRecuerda marcarlo como entregado al finalizar o abortar si tuviste un problema grave.`);
          }
        }
      }
    } catch (e) {
      console.error("Error en timeout de viajes:", e);
    }
  }, 60000 * 5); // Chequear cada 5 minutos

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
            const { data: setting } = await supabase.from('platform_settings').select('value').eq('key', 'delivery_master_group_id').single();
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
          let { data: driverData } = await supabase.from('delivery_drivers').select('*').eq('id', chatId).single();

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
            const { data: setting } = await supabase.from('platform_settings').select('value').eq('key', 'delivery_master_group_id').single();
            if (!setting || setting.value !== chatId) {
              continue; // Ignora silenciosamente para evitar que el bot responda a intrusos en grupos al azar
            }
          }

          if (text === '/ayuda') {
            const helpText = `🛠️ <b>MENÚ DE AYUDA DE REPARTIDORES</b> 🛠️\n\n🔹 <b>/registrar</b> - Llena tus datos para poder trabajar.\n🔹 <b>/perfil</b> - Revisa tus estadísticas y viajes completados.\n🔹 <b>/estado [disponible|ocupado|accidentado|descansando]</b> - Cambia tu estado.\n🔹 <b>/ayuda</b> - Muestra este mensaje.\n\n📌 <b>REGLAS DE LA AGENCIA:</b>\n1️⃣ Cuando el bot envíe un viaje al grupo, presiona "Aceptar Viaje".\n2️⃣ Debes estar "disponible" para aceptarlo.\n3️⃣ El bot te enviará por privado la dirección exacta del cliente.\n4️⃣ Al entregar el pedido pídele al cliente el <b>PIN de Seguridad</b>.\n5️⃣ Presiona "Marcar como Entregado".\n6️⃣ 🚨 <b>IMPORTANTE:</b> Si te accidentas, usa el botón rojo "Abortar Viaje".`;
            await sendMessageToChat(chatId, helpText);
            continue;
          }

          if (text.startsWith('/estado')) {
            const statusMatch = text.replace('/estado', '').trim().toLowerCase();
            const validStatuses = ['disponible', 'ocupado', 'accidentado', 'descansando'];
            
            if (!driverData) {
              await sendMessageToChat(chatId, "⚠️ Aún no estás registrado. Escribe /registrar para comenzar.");
              continue;
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
          } else
          if (botState[chatId] && !text.startsWith('/start')) {
            const state = botState[chatId];
            if (state.step === 'WAITING_NAME') {
              state.fullName = text;state.step = 'WAITING_PHONE';
              await sendMessageToChat(chatId, `Perfecto, ${text}. Ahora, por favor ingresa tu <b>Número de Teléfono</b> (Ej. 0414-1234567):`);
            } else
            if (state.step === 'WAITING_PHONE') {
              state.telefono = text;state.step = 'WAITING_MOTO';
              await sendMessageToChat(chatId, "¡Entendido! Ahora dime, ¿Qué <b>Modelo de Vehículo</b> conduces? (Ej. Bera SBR)");
            } else
            if (state.step === 'WAITING_MOTO') {
              state.moto = text;state.step = 'WAITING_AGENCY';
              await sendMessageToChat(chatId, "Excelente. Por último, ¿A qué <b>Agencia de Delivery</b> perteneces? (Ej. MotoYa, Independiente, etc):");
            } else
            if (state.step === 'WAITING_AGENCY') {
              state.agencia = text;
              const driverCode = 'REP-' + Math.floor(1000 + Math.random() * 9000);

              if (!driverData) {
                await supabase.from('delivery_drivers').insert([{ id: chatId, driver_code: driverCode, name: state.fullName, cedula: '', telefono: state.telefono, age: '', moto: state.moto, placa: '', agencia: state.agencia }]);

              } else {
                await supabase.from('delivery_drivers').update({ driver_code: driverCode, name: state.fullName, telefono: state.telefono, moto: state.moto, agencia: state.agencia }).eq('id', chatId);

              }
              delete botState[chatId];
              await sendMessageToChat(chatId, `✅ <b>¡Felicidades!</b> Tus datos han sido registrados exitosamente. Ya puedes empezar a aceptar viajes.\n\nTu ID único de repartidor es: <b>${driverCode}</b>`);
            }
          } else
          if (text === '/start') {
            await sendMessageToChat(chatId, "👋 ¡Hola! Bienvenido al bot de Delivery. Si deseas tomar un viaje, asegúrate de presionar el botón 'Aceptar Viaje' en el grupo de notificaciones. Si eres nuevo, escribe /registrar para comenzar.");
          } else
          if (text.startsWith('/start accept_')) {
            const orderId = text.replace('/start accept_', '');
            const { data: pendingOrder } = await supabase.from('delivery_pending_trips').select('*').eq('order_id', orderId).single();

            if (!pendingOrder) {
              await sendMessageToChat(chatId, "❌ Este viaje ya no está disponible o ya fue tomado.");
              continue;
            }

            if (!driverData || !driverData.name) {
              await sendMessageToChat(chatId, `❌ No puedes aceptar el viaje porque no estás registrado. Usa el comando /registrar primero.`);
              continue;
            }

            // Verificar estado del repartidor
            if (driverData.status !== 'disponible') {
              await sendMessageToChat(chatId, `❌ No puedes aceptar el viaje porque tu estado actual es <b>${driverData.status ? driverData.status.toUpperCase() : 'DESCONOCIDO (Usa /estado disponible)'}</b>.\nCambia tu estado usando: <code>/estado disponible</code>`);
              continue;
            }

            // --- REGLA ESTRICTA: Un solo pedido activo por repartidor ---
            const { data: activeTrips } = await supabase.from('delivery_active_trips').select('*').eq('driver_id', chatId);
            if (activeTrips && activeTrips.length > 0) {
              await sendMessageToChat(chatId, `⚠️ <b>ACCIÓN DENEGADA</b>\n\nActualmente tienes un viaje en curso (Pedido <b>#${activeTrips[0].order_id}</b>).\n\nDebes marcarlo como entregado o abortarlo antes de poder tomar un nuevo pedido.`);
              continue;
            }

            const customerData = JSON.parse(pendingOrder.customer_data);

            // Move to active
            await supabase.from('delivery_pending_trips').delete().eq('order_id', orderId);
            await supabase.from('delivery_active_trips').insert([{ order_id: orderId, driver_id: chatId, pin: pendingOrder.delivery_pin, customer_name: customerData.name, customer_data: pendingOrder.customer_data, start_time: new Date().toISOString() }]);


            const gpsLink = customerData.location ? `\n📍 <b>Mapa GPS:</b> https://www.google.com/maps?q=${customerData.location.lat},${customerData.location.lng}` : '';
            const privateMessage = `✅ <b>¡VIAJE ACEPTADO CON ÉXITO!</b> ✅\nAquí tienes los datos privados del cliente:\n\n👤 <b>Cliente:</b> ${customerData.name}\n📱 <b>Teléfono:</b> ${customerData.phone}\n📍 <b>Dirección Exacta:</b> \n<code>${customerData.address}</code>${gpsLink}\n\n🔐 <b>PIN DE ENTREGA:</b> <code>${pendingOrder.delivery_pin}</code>\n<i>(Pídele este código de 6 dígitos al cliente)</i>`;
            const replyMarkup = {
              inline_keyboard: [
              [{ text: "✅ Marcar como Entregado", url: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=complete_${orderId}` }],
              [{ text: "🚨 Abortar Viaje (Emergencia)", url: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=cancel_${orderId}` }]]

            };
            await sendMessageToChat(chatId, privateMessage, replyMarkup);

            // Avisar al grupo maestro
            const { data: setting } = await supabase.from('platform_settings').select('value').eq('key', 'delivery_master_group_id').single();
            const masterChatId = setting ? setting.value : null;
            if (masterChatId) {
              await sendMessageToChat(masterChatId, `🔒 El pedido <b>#${orderId}</b> ha sido tomado por <b>${driverName}</b>.`);
            }

            io.emit('delivery_accepted', { orderId, driver: driverData });
          } else
          if (text.startsWith('/start complete_')) {
            const orderId = text.replace('/start complete_', '');

            // Mark driver confirmed
            try {
              await supabase.from('ecommerce_orders_v2').update({ driver_confirmed: 1 }).eq('id', orderId);
            } catch (e) {}

            // Check if customer already confirmed
            const { data: order } = await supabase.from('ecommerce_orders_v2').select('customer_confirmed').eq('id', orderId).single();
            if (order && order.customer_confirmed === 1) {
              await supabase.from('delivery_active_trips').delete().eq('order_id', orderId);
              await sendMessageToChat(chatId, `✅ <b>¡Listo!</b> El cliente también ha confirmado de recibido. Pedido <b>#${orderId}</b> finalizado con éxito. ¡Buen trabajo!`);

              const { data: setting } = await supabase.from('platform_settings').select('value').eq('key', 'delivery_master_group_id').single();
              if (setting && setting.value) {
                await sendMessageToChat(setting.value, `✅ El pedido <b>#${orderId}</b> ha sido entregado exitosamente por <b>${driverName}</b> y el cliente ha confirmado.`);
              }

              // Update the main ecommerce order
              await supabase.from('ecommerce_orders_v2').update({ status: 'Entregado' }).eq('id', orderId);
              io.emit('delivery_completed', { orderId });
            } else {
              await sendMessageToChat(chatId, `⏳ <b>¡Buen trabajo!</b> Ya entregaste el pedido <b>#${orderId}</b>. Ahora estamos esperando que el cliente confirme de recibido en la app.`);
            }
          } else
          if (text.startsWith('/start cancel_')) {
            const orderId = text.replace('/start cancel_', '');
            const { data: active } = await supabase.from('delivery_active_trips').select('*').eq('order_id', orderId).single();

            if (!active) {
              await sendMessageToChat(chatId, "❌ Este viaje ya no está en curso o ya fue cancelado.");
              continue;
            }

            const replyMarkup = {
              inline_keyboard: [
                [{ text: "💥 Falla mecánica", url: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=abort_${orderId}_mecanica` }],
                [{ text: "📵 Cliente no responde", url: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=abort_${orderId}_cliente` }],
                [{ text: "🚑 Accidente", url: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=abort_${orderId}_accidente` }],
                [{ text: "❌ Otro motivo", url: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=abort_${orderId}_otro` }]
              ]
            };
            await sendMessageToChat(chatId, `⚠️ ¿Estás seguro que deseas abortar el viaje <b>#${orderId}</b>?\n\nPor favor, selecciona el motivo:`, replyMarkup);
            continue;
          }

          if (text.startsWith('/start abort_')) {
            const match = text.match(/\/start abort_([^_]+)_(.+)/);
            if (!match) continue;
            const orderId = match[1];
            const reasonCode = match[2];
            const reasons = {
              'mecanica': 'Falla mecánica',
              'cliente': 'Cliente no responde',
              'accidente': 'Accidente',
              'otro': 'Otro motivo'
            };
            const reasonText = reasons[reasonCode] || 'Desconocido';

            const { data: active } = await supabase.from('delivery_active_trips').select('*').eq('order_id', orderId).single();

            if (!active) {
              await sendMessageToChat(chatId, "❌ Este viaje ya no está en curso o ya fue cancelado.");
              continue;
            }

            await sendMessageToChat(chatId, `🚨 <b>VIAJE ABORTADO</b> 🚨\n\nHas cancelado el pedido <b>#${orderId}</b> por el motivo: <b>${reasonText}</b>. Será asignado a otro compañero.`);

            await supabase.from('delivery_active_trips').delete().eq('order_id', orderId);

            // Re-add to pending
            await supabase.from('delivery_pending_trips').insert([{ order_id: active.order_id, customer_data: active.customer_data, delivery_pin: active.pin }]);

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

            io.emit('delivery_cancelled', { orderId, reason: reasonText });
            continue;
          }
        }
      }
    } catch (e) {

      // Silenciar timeout normal
    }
    if (isEngineRunning) {
      setTimeout(poll, 2000);
    }
  };

  poll();
};