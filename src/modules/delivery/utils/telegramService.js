export const sendDeliveryRequest = async (commerceId, customerData, customOrderId = null) => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const res = await fetch(`${supabaseUrl}/functions/v1/telegram-bot`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`
      },
      body: JSON.stringify({ 
        type: 'send_delivery',
        commerceId, 
        customerData, 
        customOrderId 
      })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    return { success: false, error: "Error de red al conectar con el servidor" };
  }
};

export const globalListeners = {
  onAccept: [],
  onComplete: [],
  onCancel: []
};

export const startTelegramEngine = () => {
  // Ahora el motor corre en el backend. 
  // Esta función se mantiene vacía para no romper imports antiguos.
  console.log("El motor de Telegram ahora corre en el backend de Node.js");
};

export const stopTelegramEngine = () => {
  // Dummy function para compatibilidad
};
