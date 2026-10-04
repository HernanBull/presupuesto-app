const fs = require('fs');
const path = require('path');

const COLORS = {
  BACKGROUND: "#0f172a", // Slate 900
  TEXT_LIGHT: "#f8f9fa",
  TEXT_MUTED: "#94a3b8",
  ACCENT_PRIMARY: "#f59e0b", // Amber 500
  ACCENT_SECONDARY: "#10b981", // Emerald 500
  ACCENT_TERTIARY: "#3b82f6", // Blue 500
  STROKE_DEFAULT: "#334155",
  BOX_BG_DARK: "#1e293b",
  BOX_BG_LIGHT: "#334155"
};

const FONTS = { NORMAL: 1, HEADING: 3 };

function createRect({ x, y, width, height, text, bg = COLORS.BOX_BG_DARK, stroke = COLORS.STROKE_DEFAULT, strokeWidth = 2, strokeStyle = "solid", fontSize = 16, roundness = 20, textColor = COLORS.TEXT_LIGHT }) {
  const rectId = `rect_${Math.random().toString(36).substr(2, 9)}`;
  const textId = `text_${Math.random().toString(36).substr(2, 9)}`;
  return [
    { id: rectId, type: "rectangle", x, y, width, height, strokeColor: stroke, backgroundColor: bg, fillStyle: bg === "transparent" ? "hachure" : "solid", strokeWidth, strokeStyle, roughness: 0, opacity: 100, roundness: { type: 3, value: roundness }, boundElements: [{ id: textId, type: "text" }] },
    { id: textId, type: "text", x: x + 10, y: y + height / 2 - fontSize / 1.5, width: width - 20, height: fontSize * 1.2, strokeColor: textColor, fontSize, fontFamily: FONTS.NORMAL, textAlign: "center", verticalAlign: "middle", text, containerId: rectId }
  ];
}

function createText({ x, y, text, fontSize = 20, color = COLORS.TEXT_LIGHT, font = FONTS.NORMAL, textAlign = "left" }) {
  return [{ id: `text_${Math.random().toString(36).substr(2, 9)}`, type: "text", x, y, width: text.length * (fontSize * 0.6), height: fontSize * 1.2, strokeColor: color, fontSize, fontFamily: font, textAlign, text }];
}

function createArrow({ x, y, points, color = COLORS.STROKE_DEFAULT, width = 2, start = null, end = "arrow", strokeStyle="solid" }) {
  return [{ id: `arrow_${Math.random().toString(36).substr(2, 9)}`, type: "arrow", x, y, width: Math.abs(points[points.length-1][0] - points[0][0]), height: Math.abs(points[points.length-1][1] - points[0][1]), strokeColor: color, strokeWidth: width, roughness: 0, strokeStyle, startArrowhead: start, endArrowhead: end, points }];
}

let elements = [];

// ==========================================
// TÍTULO
// ==========================================
elements.push(...createText({ x: 1200, y: 50, text: "AxonMarket: Ecosistema Completo del Cliente (PWA)", fontSize: 44, color: COLORS.ACCENT_PRIMARY, font: FONTS.HEADING, textAlign: "center" }));
elements.push(...createText({ x: 1280, y: 110, text: "Diagrama Exhaustivo de Arquitectura de Funciones del Consumidor", fontSize: 24, color: COLORS.TEXT_MUTED, font: FONTS.NORMAL }));

// ==========================================
// COLUMNA 1: ONBOARDING & IDENTIDAD (RUTAS GLOBALES)
// ==========================================
elements.push(...createText({ x: 100, y: 200, text: "1. IDENTIDAD Y ONBOARDING", fontSize: 26, color: COLORS.ACCENT_PRIMARY, font: FONTS.HEADING }));

elements.push(...createRect({ x: 50, y: 260, width: 350, height: 80, text: "Autenticación Base (Auth Modal)\nEmail/Pass & Google OAuth", bg: "#450a0a", stroke: COLORS.ACCENT_PRIMARY }));
elements.push(...createArrow({ x: 225, y: 340, points: [[0,0], [0, 40]] }));

elements.push(...createRect({ x: 50, y: 380, width: 350, height: 80, text: "Supabase Auth & Sessions\n(Genera Token JWT y Envía Correo)", bg: COLORS.BOX_BG_DARK, stroke: COLORS.STROKE_DEFAULT }));
elements.push(...createArrow({ x: 225, y: 460, points: [[0,0], [0, 40]] }));

elements.push(...createRect({ x: 50, y: 500, width: 350, height: 80, text: "ProfileWizard (Control de Acceso)\n(Fuerza DNI, Teléfono y Ubicación)", bg: "#1e1b4b", stroke: COLORS.ACCENT_PRIMARY }));


// ==========================================
// COLUMNA 2: DIRECTORIO GLOBAL (MARKETPLACE)
// ==========================================
elements.push(...createText({ x: 600, y: 200, text: "2. ECOSISTEMA (MARKETPLACE)", fontSize: 26, color: COLORS.ACCENT_SECONDARY, font: FONTS.HEADING }));

elements.push(...createRect({ x: 550, y: 260, width: 380, height: 80, text: "Marketplace Directory (Ruta: /)\n(Vitrina Global de AxonMarket)", bg: "#064e3b", stroke: COLORS.ACCENT_SECONDARY }));
elements.push(...createArrow({ x: 740, y: 340, points: [[0,0], [0, 40]] }));

elements.push(...createRect({ x: 550, y: 380, width: 380, height: 350, text: "", bg: "transparent", stroke: COLORS.STROKE_DEFAULT, strokeStyle: "dashed" }));
elements.push(...createRect({ x: 570, y: 400, width: 340, height: 50, text: "Barra de Búsqueda de Tiendas y Productos", bg: COLORS.BOX_BG_DARK }));
elements.push(...createRect({ x: 570, y: 470, width: 340, height: 50, text: "Grid de Categorías Interactivos (Hardware Accel)", bg: COLORS.BOX_BG_DARK }));
elements.push(...createRect({ x: 570, y: 540, width: 340, height: 50, text: "Lista de Comercios Destacados/Activos", bg: COLORS.BOX_BG_DARK }));
elements.push(...createRect({ x: 570, y: 610, width: 340, height: 50, text: "Instalación PWA (Smart Banners iOS/Android)", bg: COLORS.BOX_BG_DARK }));
elements.push(...createRect({ x: 570, y: 680, width: 340, height: 50, text: "Bottom Navigation (Inicio, Carrito, Chats)", bg: COLORS.BOX_BG_DARK }));


// ==========================================
// COLUMNA 3: TIENDA ESPECÍFICA (PUBLIC STORE)
// ==========================================
elements.push(...createText({ x: 1100, y: 200, text: "3. EXPERIENCIA DE TIENDA", fontSize: 26, color: COLORS.ACCENT_TERTIARY, font: FONTS.HEADING }));
elements.push(...createArrow({ x: 930, y: 300, points: [[0,0], [170, 0]] })); // Flecha de Marketplace a Store

elements.push(...createRect({ x: 1100, y: 260, width: 380, height: 80, text: "Public Store (Ruta: /:slug)\n(UI Dinámica generada por el Comerciante)", bg: "#1e3a8a", stroke: COLORS.ACCENT_TERTIARY }));
elements.push(...createArrow({ x: 1290, y: 340, points: [[0,0], [0, 40]] }));

elements.push(...createRect({ x: 1100, y: 380, width: 380, height: 420, text: "", bg: "transparent", stroke: COLORS.STROKE_DEFAULT, strokeStyle: "dashed" }));
elements.push(...createRect({ x: 1120, y: 400, width: 340, height: 50, text: "Cabecera: Banner, Logo y Estado (Abierto/Cerrado)", bg: COLORS.BOX_BG_DARK }));
elements.push(...createRect({ x: 1120, y: 470, width: 340, height: 50, text: "Catálogo de Productos y Búsqueda Local", bg: COLORS.BOX_BG_DARK }));
elements.push(...createRect({ x: 1120, y: 540, width: 340, height: 50, text: "Private Gateway (Bloqueo de precios sin sesión)", bg: "#450a0a", stroke: COLORS.RED }));
elements.push(...createRect({ x: 1120, y: 610, width: 340, height: 50, text: "Ofertas Flash (Cronómetro de Descuentos)", bg: COLORS.BOX_BG_DARK }));
elements.push(...createRect({ x: 1120, y: 680, width: 340, height: 50, text: "Product Modal: Info Detallada y Variantes", bg: COLORS.BOX_BG_DARK }));
elements.push(...createRect({ x: 1120, y: 750, width: 340, height: 50, text: "Gestión de Wishlist (Agregar/Quitar Guardados)", bg: COLORS.BOX_BG_DARK }));


// ==========================================
// COLUMNA 4: CHECKOUT Y PAGOS
// ==========================================
elements.push(...createText({ x: 1600, y: 200, text: "4. CHECKOUT Y LOGÍSTICA", fontSize: 26, color: COLORS.ACCENT_SECONDARY, font: FONTS.HEADING }));
elements.push(...createArrow({ x: 1480, y: 300, points: [[0,0], [120, 0]] })); // Store a Checkout

elements.push(...createRect({ x: 1600, y: 260, width: 380, height: 80, text: "Proceso de Pago (Checkout Modal)\n(Carritos guardados por Comercio)", bg: "#064e3b", stroke: COLORS.ACCENT_SECONDARY }));
elements.push(...createArrow({ x: 1790, y: 340, points: [[0,0], [0, 40]] }));

elements.push(...createRect({ x: 1600, y: 380, width: 380, height: 420, text: "", bg: "transparent", stroke: COLORS.STROKE_DEFAULT, strokeStyle: "dashed" }));
elements.push(...createRect({ x: 1620, y: 400, width: 340, height: 50, text: "Gestor de Cantidades y Remoción", bg: COLORS.BOX_BG_DARK }));
elements.push(...createRect({ x: 1620, y: 470, width: 340, height: 50, text: "Selector de Propina (Tips Integrados)", bg: COLORS.BOX_BG_DARK }));
elements.push(...createRect({ x: 1620, y: 540, width: 340, height: 50, text: "Cálculo en Tiempo Real (Delivery + Total)", bg: COLORS.BOX_BG_DARK }));
elements.push(...createRect({ x: 1620, y: 610, width: 340, height: 50, text: "Métodos de Pago (Efectivo/Binance/Pago Móvil)", bg: COLORS.BOX_BG_DARK }));
elements.push(...createRect({ x: 1620, y: 680, width: 340, height: 50, text: "Subida de Comprobante de Pago (Supabase Storage)", bg: COLORS.BOX_BG_DARK }));
elements.push(...createRect({ x: 1620, y: 750, width: 340, height: 50, text: "Envío Dual: Creación en BDD + WhatsApp/Telegram", bg: COLORS.BOX_BG_DARK }));


// ==========================================
// FILA INFERIOR: ÁREA PERSONAL PROFUNDA (PROFILE)
// ==========================================
elements.push(...createText({ x: 600, y: 900, text: "5. PANEL DE CONTROL PERSONAL (CUSTOMER PROFILE: /profile)", fontSize: 26, color: "#a855f7", font: FONTS.HEADING }));
elements.push(...createArrow({ x: 225, y: 580, points: [[0,0], [0, 360], [325, 360]] })); // Auth a Profile

elements.push(...createRect({ x: 550, y: 960, width: 1430, height: 350, text: "", bg: "transparent", stroke: "#a855f7", strokeStyle: "dashed", strokeWidth: 3 }));

// Bloques del Perfil
// Bloque 1
elements.push(...createRect({ x: 580, y: 1000, width: 320, height: 280, text: "", bg: "#1e1b4b", stroke: "#a855f7" }));
elements.push(...createText({ x: 600, y: 1020, text: "Tab: Datos Personales", fontSize: 20, color: COLORS.TEXT_LIGHT, font: FONTS.HEADING }));
elements.push(...createRect({ x: 600, y: 1060, width: 280, height: 40, text: "Edición de Perfil (DNI, Tel)", bg: COLORS.BOX_BG_DARK, fontSize: 14 }));
elements.push(...createRect({ x: 600, y: 1110, width: 280, height: 40, text: "Subida de Foto de Perfil (Storage)", bg: COLORS.BOX_BG_DARK, fontSize: 14 }));
elements.push(...createRect({ x: 600, y: 1160, width: 280, height: 40, text: "Gestión de Cuentas Pago Móvil", bg: COLORS.BOX_BG_DARK, fontSize: 14 }));
elements.push(...createRect({ x: 600, y: 1210, width: 280, height: 40, text: "Verificación OTP y Enlaces", bg: COLORS.BOX_BG_DARK, fontSize: 14 }));

// Bloque 2
elements.push(...createRect({ x: 930, y: 1000, width: 320, height: 280, text: "", bg: "#1e1b4b", stroke: "#a855f7" }));
elements.push(...createText({ x: 950, y: 1020, text: "Tab: Historial & Chat", fontSize: 20, color: COLORS.TEXT_LIGHT, font: FONTS.HEADING }));
elements.push(...createRect({ x: 950, y: 1060, width: 280, height: 40, text: "Listado Histórico de Pedidos", bg: COLORS.BOX_BG_DARK, fontSize: 14 }));
elements.push(...createRect({ x: 950, y: 1110, width: 280, height: 40, text: "Estado en Tiempo Real (WebSocket)", bg: COLORS.BOX_BG_DARK, fontSize: 14 }));
elements.push(...createRect({ x: 950, y: 1160, width: 280, height: 40, text: "Chat Nativo Cliente-Vendedor (Imágenes)", bg: "#064e3b", stroke: COLORS.ACCENT_SECONDARY, fontSize: 14 }));
elements.push(...createRect({ x: 950, y: 1210, width: 280, height: 40, text: "Confirmación de Recepción & Reseñas", bg: COLORS.BOX_BG_DARK, fontSize: 14 }));

// Bloque 3
elements.push(...createRect({ x: 1280, y: 1000, width: 320, height: 280, text: "", bg: "#1e1b4b", stroke: "#a855f7" }));
elements.push(...createText({ x: 1300, y: 1020, text: "Tab: Direcciones / GPS", fontSize: 20, color: COLORS.TEXT_LIGHT, font: FONTS.HEADING }));
elements.push(...createRect({ x: 1300, y: 1060, width: 280, height: 40, text: "Libreta de Direcciones Múltiples", bg: COLORS.BOX_BG_DARK, fontSize: 14 }));
elements.push(...createRect({ x: 1300, y: 1110, width: 280, height: 40, text: "Selección de Dirección por Defecto", bg: COLORS.BOX_BG_DARK, fontSize: 14 }));
elements.push(...createRect({ x: 1300, y: 1160, width: 280, height: 55, text: "Módulo React-Leaflet (Mapas)\nClick para fijar Lat/Lng", bg: COLORS.BOX_BG_DARK, fontSize: 14 }));
elements.push(...createRect({ x: 1300, y: 1225, width: 280, height: 40, text: "Extracción Automática GPS", bg: COLORS.BOX_BG_DARK, fontSize: 14 }));

// Bloque 4
elements.push(...createRect({ x: 1630, y: 1000, width: 320, height: 280, text: "", bg: "#1e1b4b", stroke: "#a855f7" }));
elements.push(...createText({ x: 1650, y: 1020, text: "Tab: Favoritos & Guardados", fontSize: 20, color: COLORS.TEXT_LIGHT, font: FONTS.HEADING }));
elements.push(...createRect({ x: 1650, y: 1060, width: 280, height: 50, text: "Lista de Tiendas Favoritas (Directorio Rápido)", bg: COLORS.BOX_BG_DARK, fontSize: 14 }));
elements.push(...createRect({ x: 1650, y: 1130, width: 280, height: 50, text: "Wishlist de Productos Inter-Tiendas", bg: COLORS.BOX_BG_DARK, fontSize: 14 }));


const excalidrawFile = {
  type: "excalidraw",
  version: 2,
  source: "https://excalidraw.com",
  elements: elements.flat(),
  appState: {
    viewBackgroundColor: COLORS.BACKGROUND,
    theme: "dark"
  }
};

fs.writeFileSync(path.join(__dirname, '..', 'AxonMarket_Procesos_Cliente_Completo.excalidraw'), JSON.stringify(excalidrawFile, null, 2));
console.log('✅ Archivo AxonMarket_Procesos_Cliente_Completo.excalidraw generado con éxito.');
