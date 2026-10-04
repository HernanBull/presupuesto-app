require('dotenv').config();

async function setWebhook() {
  const token = process.env.VITE_TELEGRAM_BOT_TOKEN || '8931657407:AAHJtYXikKfBtYowHHB0HBKhaRUskhyyfHo';
  const supabaseUrl = process.env.VITE_SUPABASE_URL;

  if (!supabaseUrl) {
    console.error("Error: VITE_SUPABASE_URL no está definido en tu .env");
    process.exit(1);
  }

  // Supabase Edge Function URL
  const webhookUrl = `${supabaseUrl}/functions/v1/telegram-bot`;
  
  console.log(`Configurando Webhook en: ${webhookUrl}`);

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl })
    });
    const data = await res.json();
    console.log("Respuesta de Telegram:", data);
    
    if (data.ok) {
      console.log("✅ Webhook configurado con éxito. El bot ahora está corriendo en Supabase Edge Functions.");
    } else {
      console.error("❌ Error al configurar el webhook.");
    }
  } catch (err) {
    console.error("Error de red:", err);
  }
}

setWebhook();
