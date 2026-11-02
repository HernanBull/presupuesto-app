/**
 * Utilidades para normalizar y abrir enlaces de WhatsApp en AxonMarket.
 * Convierte formatos locales venezolanos (0412, 0414, 0424, 0416, 0426)
 * e internacionales al formato universal requerido por WhatsApp (https://wa.me/58...).
 */

export function getCleanWhatsAppNumber(phone) {
  if (!phone) return '';
  
  // Si viene una URL completa, extraer el número
  if (typeof phone === 'string' && (phone.startsWith('http://') || phone.startsWith('https://'))) {
    const match = phone.match(/wa\.me\/([0-9]+)/i) || phone.match(/phone=([0-9]+)/i);
    if (match && match[1]) {
      phone = match[1];
    } else {
      return phone;
    }
  }

  let clean = String(phone).replace(/\D/g, '');
  if (!clean) return '';

  // Eliminar prefijo internacional doble cero 00
  if (clean.startsWith('00')) {
    clean = clean.slice(2);
  }

  // Corregir casos venezolanos comunes:
  // 1. Guardado como 580424... -> 58424...
  if (clean.startsWith('580') && clean.length === 13) {
    clean = '58' + clean.slice(3);
  }
  // 2. Guardado como 04243592392 (11 dígitos con cero inicial) -> 584243592392
  else if (clean.startsWith('0') && clean.length === 11) {
    clean = '58' + clean.slice(1);
  }
  // 3. Guardado sin cero inicial ni 58: 4243592392 (10 dígitos) -> 584243592392
  else if ((clean.startsWith('412') || clean.startsWith('414') || clean.startsWith('424') || clean.startsWith('416') || clean.startsWith('426')) && clean.length === 10) {
    clean = '58' + clean;
  }
  // 4. Cualquier número local venezolano de 10 dígitos sin 58
  else if (!clean.startsWith('58') && clean.length === 10) {
    clean = '58' + clean;
  }

  return clean;
}

export function buildWhatsAppUrl(phone, defaultText = '') {
  const cleanNumber = getCleanWhatsAppNumber(phone);
  if (!cleanNumber) return null;
  
  if (cleanNumber.startsWith('http://') || cleanNumber.startsWith('https://')) {
    return cleanNumber;
  }
  
  const query = defaultText ? `?text=${encodeURIComponent(defaultText)}` : '';
  return `https://wa.me/${cleanNumber}${query}`;
}

export function resolveStoreWhatsApp(config) {
  if (!config) return null;
  
  const candidates = [
    config?.socialLinks?.whatsapp,
    config?.expediente?.whatsapp,
    config?.phone,
    config?.expediente?.phone,
    config?.paymentProfile?.pmPhone,
    config?.pagoMovilPhone
  ];

  for (const candidate of candidates) {
    if (candidate && String(candidate).trim()) {
      const clean = getCleanWhatsAppNumber(candidate);
      if (clean && clean.length >= 8) {
        return clean;
      }
    }
  }

  return null;
}
