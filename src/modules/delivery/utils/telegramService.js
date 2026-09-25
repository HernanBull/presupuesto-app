export const sendDeliveryRequest = async (commerceId, customerData, customOrderId = null) => {
  try {
    const res = await fetch('http://localhost:3001/api/delivery/telegram/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commerceId, customerData, customOrderId })
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
