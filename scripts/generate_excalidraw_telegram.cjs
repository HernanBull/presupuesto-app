const fs = require('fs');
const path = require('path');

const COLORS = {
  BACKGROUND: "#0f172a", // Slate 900
  TEXT_LIGHT: "#f8f9fa",
  TEXT_MUTED: "#94a3b8",
  ACCENT_BLUE: "#3b82f6", // Telegram Blue
  ACCENT_GREEN: "#10b981",
  ACCENT_RED: "#ef4444",
  ACCENT_YELLOW: "#f59e0b",
  STROKE_DEFAULT: "#334155",
  BOX_BG_DARK: "#1e293b"
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
// TÍTULO PRINCIPAL
// ==========================================
elements.push(...createText({ x: 1000, y: 50, text: "AxonMarket: Bot de Telegram de Logística (Deliveries)", fontSize: 44, color: COLORS.ACCENT_BLUE, font: FONTS.HEADING, textAlign: "center" }));
elements.push(...createText({ x: 1080, y: 110, text: "Supabase Edge Functions / Máquina de Estados de Repartidores", fontSize: 24, color: COLORS.TEXT_MUTED, font: FONTS.NORMAL }));

// ==========================================
// SECCIÓN 1: ONBOARDING Y ESTADO DEL DRIVER
// ==========================================
elements.push(...createText({ x: 100, y: 200, text: "1. REGISTRO Y GESTIÓN DEL REPARTIDOR", fontSize: 26, color: COLORS.ACCENT_BLUE, font: FONTS.HEADING }));

elements.push(...createRect({ x: 50, y: 260, width: 350, height: 80, text: "Comando /registrar\n(Inicia Máquina de Estados)", bg: "#1e3a8a", stroke: COLORS.ACCENT_BLUE }));
elements.push(...createArrow({ x: 225, y: 340, points: [[0,0], [0, 40]] }));

elements.push(...createRect({ x: 50, y: 380, width: 350, height: 260, text: "", bg: "transparent", stroke: COLORS.STROKE_DEFAULT, strokeStyle: "dashed" }));
elements.push(...createRect({ x: 70, y: 400, width: 310, height: 40, text: "WAITING_NAME", bg: COLORS.BOX_BG_DARK, fontSize: 14 }));
elements.push(...createRect({ x: 70, y: 450, width: 310, height: 40, text: "WAITING_PHONE", bg: COLORS.BOX_BG_DARK, fontSize: 14 }));
elements.push(...createRect({ x: 70, y: 500, width: 310, height: 40, text: "WAITING_MOTO", bg: COLORS.BOX_BG_DARK, fontSize: 14 }));
elements.push(...createRect({ x: 70, y: 550, width: 310, height: 40, text: "WAITING_AGENCY", bg: COLORS.BOX_BG_DARK, fontSize: 14 }));

elements.push(...createArrow({ x: 225, y: 640, points: [[0,0], [0, 40]] }));
elements.push(...createRect({ x: 50, y: 680, width: 350, height: 80, text: "Driver Creado en BD\nAsignado ID (REP-XXXX) e Inactivo", bg: "#064e3b", stroke: COLORS.ACCENT_GREEN }));

// Teclado Interactivo
elements.push(...createArrow({ x: 400, y: 720, points: [[0,0], [80, 0]] }));
elements.push(...createRect({ x: 480, y: 660, width: 280, height: 120, text: "Teclado Persistente Telegram\n🟢 Disponible\n🔴 Ocupado\n🚑 Accidente\n💤 Descansando", bg: "#1e1b4b", stroke: "#a855f7" }));

// ==========================================
// SECCIÓN 2: CREACIÓN Y DIFUSIÓN DEL PEDIDO
// ==========================================
elements.push(...createText({ x: 900, y: 200, text: "2. DIFUSIÓN DE VIAJES (DESDE APP)", fontSize: 26, color: COLORS.ACCENT_YELLOW, font: FONTS.HEADING }));

elements.push(...createRect({ x: 900, y: 260, width: 380, height: 80, text: "Frontend envía orden a\nEdge Function 'telegram-bot'", bg: "#451a03", stroke: COLORS.ACCENT_YELLOW }));
elements.push(...createArrow({ x: 1090, y: 340, points: [[0,0], [0, 40]] }));

elements.push(...createRect({ x: 900, y: 380, width: 380, height: 180, text: "Cifrado de Seguridad (Broadcast)\n\nSe envía al Grupo Maestro.\nMuestra zona y distancia.\nOCULTA dirección exacta y teléfono.", bg: COLORS.BOX_BG_DARK }));
elements.push(...createArrow({ x: 1090, y: 560, points: [[0,0], [0, 40]] }));

elements.push(...createRect({ x: 900, y: 600, width: 380, height: 80, text: "Inserción en BDD\n'delivery_pending_trips'", bg: COLORS.BOX_BG_DARK, stroke: COLORS.STROKE_DEFAULT }));

// Botones de Acción
elements.push(...createArrow({ x: 1090, y: 680, points: [[0,0], [0, 40]] }));
elements.push(...createRect({ x: 900, y: 720, width: 380, height: 80, text: "Botón Inline: '🚗 Aceptar Viaje'\nCallback: /start accept_ORD-XXX", bg: "#1e3a8a", stroke: COLORS.ACCENT_BLUE }));


// ==========================================
// SECCIÓN 3: TOMA DEL VIAJE Y CONDUCCIÓN
// ==========================================
elements.push(...createText({ x: 1450, y: 200, text: "3. ASIGNACIÓN Y CONDUCCIÓN", fontSize: 26, color: COLORS.ACCENT_GREEN, font: FONTS.HEADING }));
elements.push(...createArrow({ x: 1280, y: 760, points: [[0,0], [170, 0]] })); // Flecha Aceptar Viaje a Logica

elements.push(...createRect({ x: 1450, y: 260, width: 400, height: 180, text: "Validaciones de Aceptación\n\n1. ¿El viaje sigue pendiente?\n2. ¿El driver está '🟢 Disponible'?\n3. ¿El driver NO tiene viajes activos?\n4. ¿La agencia permite viajes?", bg: "#450a0a", stroke: COLORS.ACCENT_RED }));
elements.push(...createArrow({ x: 1650, y: 440, points: [[0,0], [0, 40]] }));

elements.push(...createRect({ x: 1450, y: 480, width: 400, height: 160, text: "Revelación de Datos (Vía Privada)\n\nEl bot envía mensaje directo al Driver:\n- Dirección Exacta\n- Teléfono del Cliente\n- PIN Secreto (6 dígitos)", bg: "#064e3b", stroke: COLORS.ACCENT_GREEN }));
elements.push(...createArrow({ x: 1650, y: 640, points: [[0,0], [0, 40]] }));

elements.push(...createRect({ x: 1450, y: 680, width: 400, height: 90, text: "Pasa de 'pending_trips' a 'active_trips'\nNotifica al Grupo que el viaje fue tomado", bg: COLORS.BOX_BG_DARK, stroke: COLORS.STROKE_DEFAULT }));

// Bifurcación Abortar vs Completar
elements.push(...createArrow({ x: 1650, y: 770, points: [[0,0], [-200, 40]] })); // Abortar
elements.push(...createArrow({ x: 1650, y: 770, points: [[0,0], [200, 40]] })); // Completar

elements.push(...createRect({ x: 1250, y: 810, width: 350, height: 140, text: "🚨 Abortar Viaje\n(/start cancel_...)\n\n- Pide Motivo (Mecánica, Accidente)\n- Regresa a Pending Trips\n- Alerta Roja al Grupo Maestro", bg: "#450a0a", stroke: COLORS.ACCENT_RED }));

elements.push(...createRect({ x: 1700, y: 810, width: 350, height: 140, text: "✅ Completar Viaje\n(/start complete_...)\n\n- Marca driver_confirmed = 1\n- Espera que cliente confirme (App)\n- Cierra Viaje -> Paga Comisión", bg: "#064e3b", stroke: COLORS.ACCENT_GREEN }));


// ==========================================
// SECCIÓN 4: CONFIRMACIÓN DUAL
// ==========================================
elements.push(...createText({ x: 900, y: 1000, text: "4. SISTEMA DE CONFIRMACIÓN DUAL (ANTI-FRAUDE)", fontSize: 26, color: "#a855f7", font: FONTS.HEADING }));
elements.push(...createArrow({ x: 1875, y: 950, points: [[0,0], [0, 80], [-800, 80], [-800, 110]] })); // Conecta Completar a Dual

elements.push(...createRect({ x: 900, y: 1060, width: 500, height: 180, text: "Lógica de Handshake Dual\n\n1. Repartidor marca en Telegram (driver_confirmed=1)\n2. Cliente marca en la App (customer_confirmed=1)\n\nSólo cuando AMBOS son verdaderos:\n- Se destruye 'active_trips'\n- Se cambia status a 'Entregado'\n- El driver gana la 'delivery_base_fee'", bg: "#1e1b4b", stroke: "#a855f7" }));

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

fs.writeFileSync(path.join(__dirname, '..', 'AxonMarket_Bot_Logistica.excalidraw'), JSON.stringify(excalidrawFile, null, 2));
console.log('✅ Archivo AxonMarket_Bot_Logistica.excalidraw generado con éxito.');
