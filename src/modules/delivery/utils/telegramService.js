// En src/modules/delivery/utils/telegramService.js

// Credenciales Reales proporcionadas
const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '8931657407:AAHJtYXikKfBtYowHHB0HBKhaRUskhyyfHo';
export const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'DeliveryAxonbot';

// --- MOTOR GLOBAL DE TELEGRAM ---
let globalOffset = 0;
let isEngineRunning = false;
const botState = {}; // Para la máquina de estados de conversación

export const globalListeners = {
  onAccept: [],
  onComplete: [],
  onCancel: []
};

// Utilidad para enviar mensajes
const sendMessageToChat = async (chatId, text, replyMarkup = undefined) => {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', reply_markup: replyMarkup })
    });
  } catch (e) { console.error("Error enviando mensaje", e); }
};

export const sendDeliveryRequest = async (commerceId, customerData) => {
  const chatId = localStorage.getItem('delivery_master_group_id');
  if (!chatId) return { success: false, error: "No hay un Grupo de Repartidores configurado en Ajustes." };
  
  const orderId = 'ORD-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  const deliveryPin = Math.floor(1000 + Math.random() * 9000).toString();

  const message = `🚨 <b>NUEVO VIAJE DISPONIBLE</b> 🚨
🆔 <b>Pedido:</b> #${orderId}
🏪 <b>Comercio:</b> ${commerceId}

📍 <b>ZONA DE ENTREGA</b>
<code>${customerData.zone}</code>

📦 <b>DETALLES DEL PAQUETE</b>
<b>Tipo:</b> ${customerData.packageType}
<b>Productos:</b> 
<code>${customerData.productList}</code>
${customerData.weight ? `\n⚖️ <b>Peso:</b> ${customerData.weight} kg` : ''}
${customerData.quantity ? `\n🔢 <b>Cantidad:</b> ${customerData.quantity} uds` : ''}

<i>(El teléfono y dirección exacta se enviarán por privado al aceptar el viaje por seguridad)</i>`;

  const replyMarkup = {
    inline_keyboard: [
      [{ text: "🚗 Aceptar Viaje", url: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=accept_${orderId}` }],
      [{ text: "🗺️ Ver Mapa de la Zona", url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customerData.zone)}` }]
    ]
  };

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML', reply_markup: replyMarkup })
    });
    
    if (!response.ok) throw new Error("Error al enviar a Telegram");
    
    // Guardar orden como PENDIENTE
    const pending = JSON.parse(localStorage.getItem('pending_deliveries') || '[]');
    pending.push({ orderId, customerData, deliveryPin });
    localStorage.setItem('pending_deliveries', JSON.stringify(pending));

    return { success: true, orderId, deliveryPin }; 
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const startTelegramEngine = () => {
  if (isEngineRunning) return;
  isEngineRunning = true;

  const poll = async () => {
    if (!isEngineRunning) return;
    
    // Bloqueo de concurrencia: Evita que múltiples pestañas o recargas duelpliquen el bot
    const now = Date.now();
    const lockTime = parseInt(localStorage.getItem('tg_bot_lock') || '0', 10);
    // Si otro proceso actualizó el lock hace menos de 2.5 segundos, no hacemos nada
    if (now - lockTime < 2500) {
      setTimeout(poll, 3000);
      return;
    }
    // Reclamamos el lock
    localStorage.setItem('tg_bot_lock', now.toString());

    try {
      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${globalOffset}`);
      const data = await res.json();

      if (data.ok && data.result.length > 0) {
        for (const update of data.result) {
          globalOffset = update.update_id + 1;
          const text = update.message?.text || '';
          const chatId = update.message?.chat?.id;
          const driverName = update.message?.from?.first_name || "Conductor";

          if (!chatId) continue;

          // --- VALIDACIÓN DE BANEO ---
          const bannedDrivers = JSON.parse(localStorage.getItem('banned_drivers') || '[]');
          if (bannedDrivers.includes(chatId)) {
            // Responder solo una vez por comando para no hacer spam si envía mensajes normales
            if (text.startsWith('/')) {
              await sendMessageToChat(chatId, "⛔ <b>ACCESO DENEGADO</b>\n\nEstás suspendido de la agencia y no puedes interactuar con el bot ni tomar viajes.");
            }
            continue;
          }

          // --- COMANDOS INFORMATIVOS ---
          if (text === '/ayuda') {
            const helpText = `🛠️ <b>MENÚ DE AYUDA DE REPARTIDORES</b> 🛠️

🔹 <b>/registrar</b> - Llena tus datos para poder trabajar.
🔹 <b>/perfil</b> - Revisa tus estadísticas y viajes completados.
🔹 <b>/ayuda</b> - Muestra este mensaje.

📌 <b>REGLAS DE LA AGENCIA:</b>
1️⃣ Cuando el bot envíe un viaje al grupo, presiona "Aceptar Viaje".
2️⃣ El bot te enviará por privado la dirección exacta del cliente.
3️⃣ Al entregar el pedido pídele al cliente el <b>PIN de Seguridad</b>.
4️⃣ Presiona "Marcar como Entregado".
5️⃣ 🚨 <b>IMPORTANTE:</b> Si te accidentas, usa el botón rojo "Abortar Viaje" para que otro compañero pueda llevar el pedido urgente.`;
            await sendMessageToChat(chatId, helpText);
            continue;
          }
          
          if (text === '/perfil' || text === '/mis_viajes') {
            const storedDrivers = JSON.parse(localStorage.getItem('delivery_drivers') || '[]');
            const driverData = storedDrivers.find(d => d.id === chatId);
            
            if (!driverData) {
              await sendMessageToChat(chatId, "⚠️ Aún no estás registrado. Escribe /registrar para comenzar.");
              continue;
            }

            const completed = JSON.parse(localStorage.getItem('completed_deliveries') || '[]');
            const misViajes = completed.filter(o => o.driverData?.id === chatId).length;

            const perfilText = `👤 <b>TU PERFIL DE REPARTIDOR</b>

📛 <b>Nombre:</b> ${driverData.name}
🆔 <b>ID Agencia:</b> ${driverData.driverCode}
🏍️ <b>Vehículo:</b> ${driverData.moto}
🏷️ <b>Placa:</b> ${driverData.placa}

✅ <b>Viajes Completados Totales:</b> ${misViajes}

¡Sigue así, buen trabajo! 🚀`;
            await sendMessageToChat(chatId, perfilText);
            continue;
          }

          // --- COMANDOS Y ESTADOS ---
          if (text === '/registrar') {
            const storedDrivers = JSON.parse(localStorage.getItem('delivery_drivers') || '[]');
            const existingDriver = storedDrivers.find(d => d.id === chatId);
            
            // Validar si ya tiene la cédula registrada (es decir, ya terminó el registro)
            if (existingDriver && existingDriver.cedula) {
              await sendMessageToChat(chatId, `⚠️ <b>Ya estás registrado</b> en el sistema.\n\n👤 <b>Nombre:</b> ${existingDriver.name}\n🆔 <b>ID Repartidor:</b> ${existingDriver.driverCode}\n\nSi deseas cambiar algún dato, comunícate con la agencia.`);
            } else {
              botState[chatId] = { step: 'WAITING_NAME' };
              await sendMessageToChat(chatId, "¡Hola! Bienvenido al proceso de registro de repartidores. 🛵\n\nPor favor, ingresa tu <b>Nombre Completo</b>:");
            }
          }
          else if (botState[chatId] && !text.startsWith('/start')) {
            const state = botState[chatId];
            
            if (state.step === 'WAITING_NAME') {
              state.fullName = text;
              state.step = 'WAITING_CEDULA';
              await sendMessageToChat(chatId, `Perfecto, ${text}. Ahora ingresa tu número de <b>Cédula</b>:`);
            }
            else if (state.step === 'WAITING_CEDULA') {
              state.cedula = text;
              state.step = 'WAITING_PHONE';
              await sendMessageToChat(chatId, "¡Entendido! Ahora, por favor ingresa tu <b>Número de Teléfono</b> (Ej. 0414-1234567):");
            }
            else if (state.step === 'WAITING_PHONE') {
              state.telefono = text;
              state.step = 'WAITING_AGE';
              await sendMessageToChat(chatId, "¡Anotado! ¿Cuál es tu <b>Edad</b>?");
            }
            else if (state.step === 'WAITING_AGE') {
              state.age = text;
              state.step = 'WAITING_MOTO';
              await sendMessageToChat(chatId, "Perfecto. Ahora dime, ¿Qué <b>Modelo de Vehículo</b> conduces? (Ej. Bera SBR)");
            } 
            else if (state.step === 'WAITING_MOTO') {
              state.moto = text;
              state.step = 'WAITING_PLACA';
              await sendMessageToChat(chatId, "Excelente. Por último, ingresa tu número de <b>Placa</b>:");
            } 
            else if (state.step === 'WAITING_PLACA') {
              state.placa = text;
              state.step = 'WAITING_AGENCY';
              await sendMessageToChat(chatId, "¡Casi listos! Por último, ¿A qué <b>Agencia de Delivery</b> perteneces? (Ej. MotoYa, Independiente, etc):");
            }
            else if (state.step === 'WAITING_AGENCY') {
              state.agencia = text;
              
              const storedDrivers = JSON.parse(localStorage.getItem('delivery_drivers') || '[]');
              const filtered = storedDrivers.filter(d => d.id !== chatId);
              
              // Generar un ID corto y amigable para el repartidor
              const driverCode = 'REP-' + Math.floor(1000 + Math.random() * 9000);
              
              filtered.push({ 
                id: chatId,
                driverCode: driverCode,
                name: state.fullName || driverName, 
                cedula: state.cedula,
                telefono: state.telefono || 'No registrado',
                age: state.age,
                moto: state.moto, 
                placa: state.placa,
                agencia: state.agencia
              });
              localStorage.setItem('delivery_drivers', JSON.stringify(filtered));
              
              delete botState[chatId];
              await sendMessageToChat(chatId, `✅ <b>¡Felicidades!</b> Tus datos han sido registrados exitosamente. Ya puedes empezar a aceptar viajes.\n\nTu ID único de repartidor es: <b>${driverCode}</b>`);
            }
          }
          else if (text.startsWith('/start accept_')) {
            const orderId = text.replace('/start accept_', '');
            
            const pending = JSON.parse(localStorage.getItem('pending_deliveries') || '[]');
            const orderInfo = pending.find(p => p.orderId === orderId);
            
            if (!orderInfo) {
              await sendMessageToChat(chatId, "❌ Este viaje ya no está disponible o ya fue tomado.");
              continue;
            }

            const storedDrivers = JSON.parse(localStorage.getItem('delivery_drivers') || '[]');
            let driverData = storedDrivers.find(d => d.id === chatId);
            
            if (!driverData) {
              const fallbackCode = 'REP-' + Math.floor(1000 + Math.random() * 9000);
              driverData = { id: chatId, driverCode: fallbackCode, name: driverName, cedula: '', telefono: '', age: '', moto: '', placa: '', agencia: 'Desconocida' };
              storedDrivers.push(driverData);
              localStorage.setItem('delivery_drivers', JSON.stringify(storedDrivers));
              await sendMessageToChat(chatId, "⚠️ <b>Aviso:</b> Aceptaste el viaje, pero no estás registrado. Por favor, cuando termines envía el comando /registrar para llenar tus datos completos.");
            } else {
              driverData.name = driverName;
              localStorage.setItem('delivery_drivers', JSON.stringify(storedDrivers));
            }

            const privateMessage = `✅ <b>¡VIAJE ACEPTADO CON ÉXITO!</b> ✅\nAquí tienes los datos privados del cliente:\n\n👤 <b>Cliente:</b> ${orderInfo.customerData.name}\n📱 <b>Teléfono:</b> ${orderInfo.customerData.phone}\n📍 <b>Dirección Exacta:</b> \n<code>${orderInfo.customerData.address}</code>\n\n🔐 <b>PIN DE ENTREGA:</b> <code>${orderInfo.deliveryPin}</code>\n<i>(Pídele este código de 4 dígitos al cliente)</i>`;
            const replyMarkup = { 
              inline_keyboard: [
                [{ text: "✅ Marcar como Entregado", url: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=complete_${orderId}` }],
                [{ text: "🚨 Abortar Viaje (Emergencia)", url: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=cancel_${orderId}` }]
              ] 
            };
            await sendMessageToChat(chatId, privateMessage, replyMarkup);

            const masterChatId = localStorage.getItem('delivery_master_group_id');
            if (masterChatId) {
              await sendMessageToChat(masterChatId, `🔒 El pedido <b>#${orderId}</b> ha sido tomado por <b>${driverName}</b>.`);
            }

            localStorage.setItem('pending_deliveries', JSON.stringify(pending.filter(p => p.orderId !== orderId)));
            
            const active = JSON.parse(localStorage.getItem('active_deliveries') || '[]');
            // Guardamos todo el customerData para poder reconstruir el pedido si se cancela
            active.push({ orderId, driverData, pin: orderInfo.deliveryPin, customerName: orderInfo.customerData.name, customerData: orderInfo.customerData, time: new Date().toISOString() });
            localStorage.setItem('active_deliveries', JSON.stringify(active));

            globalListeners.onAccept.forEach(cb => cb(orderInfo.orderId, driverData));
          }
          else if (text.startsWith('/start complete_')) {
            const orderId = text.replace('/start complete_', '');
            
            await sendMessageToChat(chatId, `✅ <b>¡Listo!</b> Le hemos notificado al comercio que entregaste el pedido <b>#${orderId}</b> con éxito. ¡Buen trabajo!`);

            const masterChatId = localStorage.getItem('delivery_master_group_id');
            if (masterChatId) {
              await sendMessageToChat(masterChatId, `✅ El pedido <b>#${orderId}</b> ha sido entregado exitosamente por <b>${driverName}</b>.`);
            }

            const active = JSON.parse(localStorage.getItem('active_deliveries') || '[]');
            const order = active.find(o => o.orderId === orderId);
            const newActive = active.filter(o => o.orderId !== orderId);
            localStorage.setItem('active_deliveries', JSON.stringify(newActive));
            
            const completed = JSON.parse(localStorage.getItem('completed_deliveries') || '[]');
            if (!completed.some(o => o.orderId === orderId)) {
              const newOrder = order ? { ...order, time: new Date().toISOString() } : { orderId, driverData: { name: driverName }, time: new Date().toISOString(), customerName: 'Cliente' };
              localStorage.setItem('completed_deliveries', JSON.stringify([newOrder, ...completed]));
            }

            globalListeners.onComplete.forEach(cb => cb(orderId, driverName));
          }
          else if (text.startsWith('/start cancel_')) {
            const orderId = text.replace('/start cancel_', '');
            
            const active = JSON.parse(localStorage.getItem('active_deliveries') || '[]');
            const orderIndex = active.findIndex(o => o.orderId === orderId);
            
            if (orderIndex === -1) {
              await sendMessageToChat(chatId, "❌ Este viaje ya no está en curso o ya fue cancelado.");
              continue;
            }

            const order = active[orderIndex];
            
            // Responder al repartidor
            await sendMessageToChat(chatId, `🚨 <b>VIAJE ABORTADO</b> 🚨\n\nHas cancelado el pedido <b>#${orderId}</b>. Será asignado a otro compañero. Por favor, reporta el motivo a la agencia.`);

            // Quitar de activos
            active.splice(orderIndex, 1);
            localStorage.setItem('active_deliveries', JSON.stringify(active));

            // Si tenemos los datos, re-lanzar al grupo maestro
            if (order.customerData) {
              const pending = JSON.parse(localStorage.getItem('pending_deliveries') || '[]');
              pending.push({ orderId: order.orderId, customerData: order.customerData, deliveryPin: order.pin });
              localStorage.setItem('pending_deliveries', JSON.stringify(pending));
              
              const masterChatId = localStorage.getItem('delivery_master_group_id');
              if (masterChatId) {
                const telefonoRepartidor = order.driverData?.telefono ? order.driverData.telefono : "No registrado";
                
                const retryMessage = `🚨 <b>¡VIAJE ABANDONADO - ALTA PRIORIDAD!</b> 🚨
🆔 <b>Pedido:</b> #${order.orderId}

El conductor <b>${driverName}</b> ha tenido un inconveniente y abortó el viaje.
📞 <b>Teléfono del repartidor anterior:</b> ${telefonoRepartidor}
<i>(Si él ya tenía el paquete, comuníquense para el relevo)</i>

¡Necesitamos a alguien más de inmediato!

📍 <b>ZONA DE ENTREGA</b>
<code>${order.customerData.zone}</code>`;

                const replyMarkup = {
                  inline_keyboard: [
                    [{ text: "🚗 Aceptar Viaje Urgente", url: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=accept_${order.orderId}` }]
                  ]
                };
                await sendMessageToChat(masterChatId, retryMessage, replyMarkup);
              }
            }

            // Avisar a la UI
            globalListeners.onCancel.forEach(cb => cb(orderId, driverName));
          }
        }
        
        try { await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${globalOffset}`); } catch(e){}
      }
    } catch (e) { console.error("Error en motor Telegram", e); }
    
    if (isEngineRunning) {
      setTimeout(poll, 3000);
    }
  };

  poll();
};

export const stopTelegramEngine = () => { isEngineRunning = false; };
