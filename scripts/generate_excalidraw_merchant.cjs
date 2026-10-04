const fs = require('fs');

function generateExcalidraw() {
  const elements = [];
  let idCounter = 1;

  const generateId = () => `element-${idCounter++}`;

  const addBox = (x, y, width, height, text, bgColor = 'transparent', strokeColor = '#000000', fontSize = 16) => {
    const boxId = generateId();
    const textId = generateId();

    elements.push({
      id: boxId,
      type: 'rectangle',
      x,
      y,
      width,
      height,
      strokeColor,
      backgroundColor: bgColor,
      fillStyle: 'solid',
      strokeWidth: 2,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      roundness: { type: 3 },
      seed: Math.floor(Math.random() * 10000),
      version: 1,
      versionNonce: Math.floor(Math.random() * 10000),
      isDeleted: false,
      boundElements: [{ id: textId, type: "text" }],
      updated: Date.now(),
      link: null
    });

    elements.push({
      id: textId,
      type: 'text',
      x: x + 10,
      y: y + height / 2 - fontSize,
      width: width - 20,
      height: fontSize * 2,
      strokeColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      seed: Math.floor(Math.random() * 10000),
      version: 1,
      versionNonce: Math.floor(Math.random() * 10000),
      isDeleted: false,
      boundElements: null,
      updated: Date.now(),
      link: null,
      text: text,
      fontSize: fontSize,
      fontFamily: 1,
      textAlign: 'center',
      verticalAlign: 'middle',
      containerId: boxId
    });

    return { id: boxId, textId, x, y, width, height };
  };

  const addArrow = (box1, box2, label = null) => {
    let startX = box1.x + box1.width / 2;
    let startY = box1.y + box1.height;
    let endX = box2.x + box2.width / 2;
    let endY = box2.y;

    if (box2.x > box1.x + box1.width) {
       startX = box1.x + box1.width;
       startY = box1.y + box1.height / 2;
       endX = box2.x;
       endY = box2.y + box2.height / 2;
    } else if (box2.x + box2.width < box1.x) {
       startX = box1.x;
       startY = box1.y + box1.height / 2;
       endX = box2.x + box2.width;
       endY = box2.y + box2.height / 2;
    } else if (box2.y < box1.y) {
       startX = box1.x + box1.width / 2;
       startY = box1.y;
       endX = box2.x + box2.width / 2;
       endY = box2.y + box2.height;
    }

    elements.push({
      id: generateId(),
      type: 'arrow',
      x: startX,
      y: startY,
      width: Math.abs(endX - startX),
      height: Math.abs(endY - startY),
      strokeColor: '#000000',
      backgroundColor: 'transparent',
      fillStyle: 'hachure',
      strokeWidth: 2,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [],
      seed: Math.floor(Math.random() * 10000),
      version: 1,
      versionNonce: Math.floor(Math.random() * 10000),
      isDeleted: false,
      boundElements: null,
      updated: Date.now(),
      link: null,
      points: [
        [0, 0],
        [endX - startX, endY - startY]
      ],
      startBinding: { elementId: box1.id, focus: 0, gap: 5 },
      endBinding: { elementId: box2.id, focus: 0, gap: 5 },
      startArrowhead: null,
      endArrowhead: 'arrow'
    });
  };

  // Titulo General
  addBox(300, 20, 800, 60, "AxonMarket - Ecosistema Interno del Comerciante (B2B)", "#10b981", "#ffffff", 24);

  // NODO CENTRAL
  const core = addBox(550, 150, 300, 80, "Panel de Control Central\n(EcommerceLayout B2B)", "#ecfdf5", "#059669", 20);

  // --- COLUMNA 1: OPERACIONES Y ORDENES ---
  addBox(100, 280, 280, 40, "1. Gestión Operativa", "#3b82f6", "#ffffff", 18);
  const op1 = addBox(100, 340, 280, 60, "Orders Manager\n(Kanban: Validación de Pago)", "#eff6ff");
  const op2 = addBox(100, 430, 280, 60, "Order Preparation\n(Estación de Empaque / Picking)", "#eff6ff");
  const op3 = addBox(100, 520, 280, 60, "Integración Delivery\n(Despacho One-Click Telegram)", "#eff6ff");
  
  addArrow(core, op1);
  addArrow(op1, op2);
  addArrow(op2, op3);

  // --- COLUMNA 2: CATALOGO E INVENTARIO (ERP) ---
  addBox(420, 280, 280, 40, "2. Inventario y Catálogo (ERP)", "#8b5cf6", "#ffffff", 18);
  const inv1 = addBox(420, 340, 280, 60, "Product Studio Unificado\n(Creación B2B, Metadatos JSON)", "#f5f3ff");
  const inv2 = addBox(420, 430, 280, 60, "Inventory Manager\n(KARDEX Inmutable, Multialmacén)", "#f5f3ff");
  const inv3 = addBox(420, 520, 280, 60, "Control Avanzado\n(Mermas, Caducidad, Recetas)", "#f5f3ff");
  const inv4 = addBox(420, 610, 280, 60, "Costo Promedio Ponderado\n(CPP Automático)", "#f5f3ff");

  addArrow(core, inv1);
  addArrow(inv1, inv2);
  addArrow(inv2, inv3);
  addArrow(inv3, inv4);

  // --- COLUMNA 3: MARKETING Y CONFIGURACIÓN ---
  addBox(740, 280, 280, 40, "3. Marketing y Social Proof", "#f59e0b", "#ffffff", 18);
  const mkt1 = addBox(740, 340, 280, 60, "Offers Manager\n(Control de Ofertas Flash)", "#fffbeb");
  const mkt2 = addBox(740, 430, 280, 60, "Reviews Manager\n(Moderación y Respuesta de Reseñas)", "#fffbeb");
  
  addArrow(core, mkt1);
  addArrow(mkt1, mkt2);

  // --- COLUMNA 4: ANALÍTICA Y SISTEMA ---
  addBox(1060, 280, 280, 40, "4. Sistema y Analítica", "#ef4444", "#ffffff", 18);
  const sys1 = addBox(1060, 340, 280, 60, "Configuración de Tienda\n(Horarios, GPS, Identidad)", "#fef2f2");
  const sys2 = addBox(1060, 430, 280, 60, "Motor de Notificaciones\n(Alertas Stock Vacío en TB)", "#fef2f2");
  const sys3 = addBox(1060, 520, 280, 60, "Analytics Manager\n(Embudos, Ventas Diarias)", "#fef2f2");

  addArrow(core, sys1);
  addArrow(sys1, sys2);
  addArrow(sys2, sys3);

  const excalidrawState = {
    type: "excalidraw",
    version: 2,
    source: "https://excalidraw.com",
    elements: elements,
    appState: {
      viewBackgroundColor: "#ffffff",
      currentItemFontFamily: 1
    }
  };

  fs.writeFileSync('AxonMarket_Modulo_Comerciante.excalidraw', JSON.stringify(excalidrawState, null, 2));
  console.log("Archivo AxonMarket_Modulo_Comerciante.excalidraw generado exitosamente.");
}

generateExcalidraw();
