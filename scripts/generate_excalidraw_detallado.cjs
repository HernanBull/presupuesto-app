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
  addBox(400, 20, 600, 60, "AxonMarket - Mapa de Procesos Completo", "#f59e0b", "#ffffff", 24);

  // --- COLUMNA 1: CLIENTES B2C ---
  addBox(50, 120, 300, 50, "Módulo Cliente (B2C)", "#3b82f6", "#ffffff", 20);
  
  const c1 = addBox(50, 200, 300, 60, "Registro / Auth Premium", "#eff6ff");
  const c2 = addBox(50, 300, 300, 60, "Verificación de Perfil\n(Datos, GPS, Identidad)", "#eff6ff");
  const c3 = addBox(50, 400, 300, 60, "Exploración Vitrina\n(Catálogo y Ofertas)", "#eff6ff");
  const c4 = addBox(50, 500, 300, 60, "Añadir al Carrito\n(Animación y Slide-over)", "#eff6ff");
  const c5 = addBox(50, 600, 300, 60, "Checkout\n(Confirmación de Pago)", "#eff6ff");
  
  addArrow(c1, c2);
  addArrow(c2, c3);
  addArrow(c3, c4);
  addArrow(c4, c5);

  // --- COLUMNA 2: COMERCIANTES B2B ---
  addBox(550, 120, 300, 50, "Panel Comerciante (B2B)", "#10b981", "#ffffff", 20);

  const m1 = addBox(550, 200, 300, 60, "Panel Administrativo\n(Dashboard Principal)", "#ecfdf5");
  const m2 = addBox(550, 300, 300, 60, "Tablón Kanban de Pedidos:\nNueva Orden Entrante", "#ecfdf5");
  const m3 = addBox(550, 400, 300, 60, "Kanban:\nVerificación del Pago", "#ecfdf5");
  const m4 = addBox(550, 500, 300, 60, "Kanban:\nPreparación del Pedido (Picking)", "#ecfdf5");
  const m5 = addBox(550, 600, 300, 60, "Solicitud de Delivery\n(Marcar para envío)", "#ecfdf5");

  addArrow(m1, m2);
  addArrow(m2, m3);
  addArrow(m3, m4);
  addArrow(m4, m5);

  // Conexión Cliente -> Comerciante
  addArrow(c5, m2); // Checkout dispara Orden Entrante

  // --- COLUMNA 3: LOGISTICA & DELIVERY ---
  addBox(1050, 120, 300, 50, "Logística & Telegram", "#8b5cf6", "#ffffff", 20);

  const d1 = addBox(1050, 500, 300, 60, "Bot de Telegram recibe\nla solicitud", "#f5f3ff");
  const d2 = addBox(1050, 600, 300, 60, "Grupo Principal Telegram\n(Broadcast de Orden)", "#f5f3ff");
  const d3 = addBox(1050, 700, 300, 60, "Repartidor Acepta\ny Recoge Pedido", "#f5f3ff");
  const d4 = addBox(1050, 800, 300, 60, "Entrega Física al Cliente", "#f5f3ff");

  addArrow(m5, d1); // Solicitud Delivery -> Bot
  addArrow(d1, d2);
  addArrow(d2, d3);
  addArrow(d3, d4);

  // --- RETORNO AL CLIENTE Y ANALISIS ---
  const c6 = addBox(50, 800, 300, 60, "Cliente Recibe Pedido", "#eff6ff");
  const c7 = addBox(50, 900, 300, 60, "Orden Marcada como\n'Entregada'", "#eff6ff");
  
  addArrow(d4, c6); // Entrega física -> Cliente recibe
  addArrow(c6, c7); // Cliente recibe -> Marcada Entregada

  const m6 = addBox(550, 900, 300, 60, "Actualización Analíticas\n(Cierre de Venta y KPIs)", "#ecfdf5");
  
  addArrow(c7, m6); // Orden entregada -> Actualiza analíticas

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

  fs.writeFileSync('AxonMarket_Procesos_Detallado.excalidraw', JSON.stringify(excalidrawState, null, 2));
  console.log("Archivo AxonMarket_Procesos_Detallado.excalidraw generado exitosamente.");
}

generateExcalidraw();
