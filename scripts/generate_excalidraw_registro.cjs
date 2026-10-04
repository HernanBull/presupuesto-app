const fs = require('fs');
const path = require('path');

// Constantes de estilo
const COLORS = {
  BACKGROUND: "#121212", // Gris oscuro
  TEXT_LIGHT: "#f8f9fa",
  TEXT_MUTED: "#ced4da",
  ACCENT_PRIMARY: "#f59e0b", // Amber 500
  ACCENT_SECONDARY: "#10b981", // Emerald
  STROKE_DEFAULT: "#495057",
  BLUE: "#3b82f6",
  RED: "#ef4444",
  PURPLE: "#8b5cf6"
};

const FONTS = {
  NORMAL: 1, // Cascadia
  HEADING: 3 // Virgil
};

// Utilidades para generar elementos de Excalidraw
function createRect({ x, y, width, height, text, bg = "transparent", stroke = COLORS.STROKE_DEFAULT, strokeWidth = 2, strokeStyle = "solid", fontSize = 20, roundness = 20, textColor = COLORS.TEXT_LIGHT }) {
  const rectId = `rect_${Math.random().toString(36).substr(2, 9)}`;
  const textId = `text_${Math.random().toString(36).substr(2, 9)}`;
  
  const elements = [
    {
      id: rectId,
      type: "rectangle",
      x,
      y,
      width,
      height,
      strokeColor: stroke,
      backgroundColor: bg,
      fillStyle: bg === "transparent" ? "hachure" : "solid",
      strokeWidth,
      strokeStyle,
      roughness: 0,
      opacity: 100,
      roundness: { type: 3, value: roundness },
      boundElements: [{ id: textId, type: "text" }]
    },
    {
      id: textId,
      type: "text",
      x: x + 10,
      y: y + height / 2 - fontSize / 1.5,
      width: width - 20,
      height: fontSize * 1.2,
      strokeColor: textColor,
      fontSize,
      fontFamily: FONTS.NORMAL,
      textAlign: "center",
      verticalAlign: "middle",
      text,
      containerId: rectId
    }
  ];
  return elements;
}

function createText({ x, y, text, fontSize = 20, color = COLORS.TEXT_LIGHT, font = FONTS.NORMAL, textAlign = "left" }) {
  return [{
    id: `text_${Math.random().toString(36).substr(2, 9)}`,
    type: "text",
    x,
    y,
    width: text.length * (fontSize * 0.6),
    height: fontSize * 1.2,
    strokeColor: color,
    fontSize,
    fontFamily: font,
    textAlign,
    text
  }];
}

function createArrow({ x, y, points, color = COLORS.STROKE_DEFAULT, width = 2, start = null, end = "arrow" }) {
  return [{
    id: `arrow_${Math.random().toString(36).substr(2, 9)}`,
    type: "arrow",
    x,
    y,
    width: Math.abs(points[points.length-1][0] - points[0][0]),
    height: Math.abs(points[points.length-1][1] - points[0][1]),
    strokeColor: color,
    strokeWidth: width,
    roughness: 0,
    startArrowhead: start,
    endArrowhead: end,
    points
  }];
}

// Generación de elementos
let elements = [];

// TÍTULO PRINCIPAL
elements.push(...createText({ x: 600, y: 50, text: "AxonMarket: Flujo de Autenticación y Registro", fontSize: 40, color: COLORS.ACCENT_PRIMARY, font: FONTS.HEADING, textAlign: "center" }));
elements.push(...createText({ x: 700, y: 110, text: "Lógica de Onboarding de Clientes y Comerciantes", fontSize: 24, color: COLORS.TEXT_MUTED, font: FONTS.NORMAL }));

// ==========================================
// SECCIÓN 1: REGISTRO DE CLIENTES (IZQUIERDA)
// ==========================================
elements.push(...createText({ x: 200, y: 200, text: "FLUJO DE CLIENTE", fontSize: 30, color: COLORS.ACCENT_SECONDARY, font: FONTS.HEADING }));

elements.push(...createRect({ x: 100, y: 280, width: 280, height: 80, text: "Cliente abre Auth Modal\n(MarketplaceDirectory)", bg: "#1e293b", stroke: COLORS.ACCENT_SECONDARY }));
elements.push(...createArrow({ x: 240, y: 360, points: [[0,0], [0, 50]] }));

// Bifurcación Email vs Google
elements.push(...createRect({ x: 0, y: 410, width: 220, height: 70, text: "Registro Email/Pass", bg: "#0f172a" }));
elements.push(...createRect({ x: 260, y: 410, width: 220, height: 70, text: "Google OAuth", bg: "#0f172a" }));
elements.push(...createArrow({ x: 240, y: 360, points: [[0,30], [-130, 30], [-130, 50]] })); // a email
elements.push(...createArrow({ x: 240, y: 360, points: [[0,30], [130, 30], [130, 50]] })); // a google

// Procesamiento de Google
elements.push(...createArrow({ x: 370, y: 480, points: [[0,0], [0, 40]] }));
elements.push(...createRect({ x: 260, y: 520, width: 220, height: 80, text: "Extraer JWT\n(Verifica si existe email)", stroke: COLORS.ACCENT_PRIMARY }));
elements.push(...createArrow({ x: 370, y: 600, points: [[0,0], [0, 40], [-130, 40], [-130, 60]] })); // Conecta al registro base

// Registro Supabase
elements.push(...createArrow({ x: 110, y: 480, points: [[0,0], [0, 180]] }));
elements.push(...createRect({ x: 100, y: 660, width: 280, height: 90, text: "Supabase Auth signUp\n(Crea 'ecommerce_customers')", bg: "#312e81", stroke: COLORS.BLUE }));

// POST REGISTRO
elements.push(...createArrow({ x: 240, y: 750, points: [[0,0], [0, 50]] }));
elements.push(...createRect({ x: 100, y: 800, width: 280, height: 80, text: "Edge Function\n'send-welcome-email'", stroke: COLORS.BLUE, strokeStyle: "dashed" }));

// WIZARD
elements.push(...createArrow({ x: 240, y: 880, points: [[0,0], [0, 50]] }));
elements.push(...createRect({ x: 100, y: 930, width: 280, height: 90, text: "¿Perfil Incompleto?\nLanza ProfileWizardModal\n(Teléfono, DNI, Dirección)", stroke: COLORS.ACCENT_SECONDARY, bg: "#022c22" }));


// ==========================================
// SECCIÓN 2: REGISTRO DE COMERCIANTES (DERECHA)
// ==========================================
elements.push(...createText({ x: 900, y: 200, text: "FLUJO DE COMERCIANTE (6 PASOS)", fontSize: 30, color: COLORS.ACCENT_PRIMARY, font: FONTS.HEADING }));

elements.push(...createRect({ x: 800, y: 280, width: 400, height: 80, text: "Comerciante abre Merchant Modal\nClick en 'Vender'", bg: "#451a03", stroke: COLORS.ACCENT_PRIMARY }));
elements.push(...createArrow({ x: 1000, y: 360, points: [[0,0], [0, 40]] }));

// PASO 1
elements.push(...createRect({ x: 850, y: 400, width: 300, height: 70, text: "Paso 1: Credenciales\n(Email, Password, Términos)", bg: "#1c1917" }));
elements.push(...createArrow({ x: 1000, y: 470, points: [[0,0], [0, 30]] }));

// PASO 2
elements.push(...createRect({ x: 850, y: 500, width: 300, height: 80, text: "Paso 2: Datos del Negocio\nVerificación Unicidad Nombre", bg: "#1c1917" }));
elements.push(...createArrow({ x: 1000, y: 580, points: [[0,0], [0, 30]] }));

// PASO 3
elements.push(...createRect({ x: 850, y: 610, width: 300, height: 70, text: "Paso 3: Horarios y Días Laborables", bg: "#1c1917" }));
elements.push(...createArrow({ x: 1000, y: 680, points: [[0,0], [0, 30]] }));

// PASO 4
elements.push(...createRect({ x: 850, y: 710, width: 300, height: 70, text: "Paso 4: Legal y Pago Móvil\n(RIF, Teléfono, Banco)", bg: "#1c1917" }));
elements.push(...createArrow({ x: 1000, y: 780, points: [[0,0], [0, 30]] }));

// PASO 5
elements.push(...createRect({ x: 850, y: 810, width: 300, height: 70, text: "Paso 5: Ubicación Física / GPS", bg: "#1c1917" }));
elements.push(...createArrow({ x: 1000, y: 880, points: [[0,0], [0, 40]] }));

// INSERCIÓN BDD
elements.push(...createRect({ x: 800, y: 920, width: 400, height: 110, text: "Creación en BDD\n- signUp en Auth\n- Crea Workspace (Genera slug)\n- Crea Contacto", bg: "#312e81", stroke: COLORS.BLUE }));
elements.push(...createArrow({ x: 1000, y: 1030, points: [[0,0], [0, 40]] }));

// PASO 6 (2FA)
elements.push(...createRect({ x: 800, y: 1070, width: 400, height: 100, text: "Paso 6: Configuración 2FA (MFA)\nGenera TOTP Base32\nEscaneo de QR -> Validación código", stroke: COLORS.RED, bg: "#450a0a" }));

// EXITO
elements.push(...createArrow({ x: 1000, y: 1170, points: [[0,0], [0, 40]] }));
elements.push(...createRect({ x: 850, y: 1210, width: 300, height: 70, text: "Redirección a ERP Dashboard\n(/dashboard)", bg: "#064e3b", stroke: COLORS.ACCENT_SECONDARY }));


// ==========================================
// ESTRUCTURA FINAL JSON EXCALIDRAW
// ==========================================
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

fs.writeFileSync(path.join(__dirname, '..', 'AxonMarket_Proceso_Registro.excalidraw'), JSON.stringify(excalidrawFile, null, 2));
console.log('✅ Archivo AxonMarket_Proceso_Registro.excalidraw generado con éxito.');
