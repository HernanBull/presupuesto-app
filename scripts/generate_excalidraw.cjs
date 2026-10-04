const fs = require('fs');

function generateExcalidraw() {
  const elements = [];
  let idCounter = 1;

  const generateId = () => `element-${idCounter++}`;

  const addBox = (x, y, width, height, text, bgColor = 'transparent', strokeColor = '#000000') => {
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
      roughness: 1,
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
      y: y + height / 2 - 12,
      width: width - 20,
      height: 25,
      strokeColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 1,
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
      fontSize: 20,
      fontFamily: 1,
      textAlign: 'center',
      verticalAlign: 'middle',
      containerId: boxId
    });

    return boxId;
  };

  const addArrow = (startX, startY, endX, endY) => {
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
      roughness: 1,
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
      startBinding: null,
      endBinding: null,
      startArrowhead: null,
      endArrowhead: 'arrow'
    });
  };

  // Titulo General
  addBox(400, 50, 400, 60, "AxonMarket - Mapa de Procesos", "#f59e0b", "#ffffff");

  // --- COLUMNA 1: CLIENTES B2C ---
  addBox(100, 150, 300, 50, "Experiencia Cliente (B2C)", "#3b82f6", "#ffffff");
  
  const b2c_auth = addBox(100, 250, 300, 80, "1. Auth Gate & SSO\n(Registro Único Global)", "#eff6ff");
  const b2c_storefront = addBox(100, 380, 300, 80, "2. Marketplace & Tienda Pública\n(Catálogo, Ofertas Flash)", "#eff6ff");
  const b2c_cart = addBox(100, 510, 300, 80, "3. Carrito Slide-over\n(Animación Flying Cart)", "#eff6ff");
  const b2c_checkout = addBox(100, 640, 300, 80, "4. Checkout & Pago\n(Hub de Perfil)", "#eff6ff");

  addArrow(250, 330, 250, 380);
  addArrow(250, 460, 250, 510);
  addArrow(250, 590, 250, 640);

  // --- COLUMNA 2: COMERCIANTES B2B ---
  addBox(500, 150, 300, 50, "Panel Comerciante (B2B)", "#10b981", "#ffffff");

  const b2b_auth = addBox(500, 250, 300, 80, "1. Wizard de Registro\n(SaaS, Planes, Nicho)", "#ecfdf5");
  const b2b_dashboard = addBox(500, 380, 300, 80, "2. Panel Administrativo\n(KPIs, Notificaciones)", "#ecfdf5");
  const b2b_inventory = addBox(500, 510, 300, 80, "3. Inventario & Product Studio\n(KARDEX, Combos)", "#ecfdf5");
  const b2b_orders = addBox(500, 640, 300, 80, "4. Gestión de Órdenes\n(Aprobación de Pago)", "#ecfdf5");
  const b2b_picking = addBox(500, 770, 300, 80, "5. Picking (Preparación)\n(Flujo a Delivery)", "#ecfdf5");

  addArrow(650, 330, 650, 380);
  addArrow(650, 460, 650, 510);
  addArrow(650, 590, 650, 640);
  addArrow(650, 720, 650, 770);

  // Relaciones Cliente -> Comerciante
  // Storefront interactúa con Inventario (Muestra productos)
  addArrow(400, 420, 500, 420); // Dashboard controla storefront
  addArrow(400, 550, 500, 550); // Carrito lee Inventario
  // Checkout dispara Orden
  addArrow(400, 680, 500, 680); 

  // --- COLUMNA 3: LOGISTICA & DELIVERY ---
  addBox(900, 150, 300, 50, "Delivery & Logística", "#8b5cf6", "#ffffff");

  const del_trigger = addBox(900, 770, 300, 80, "1. Bot de Telegram\n(Notificación a Repartidor)", "#f5f3ff");
  const del_track = addBox(900, 890, 300, 80, "2. Rastreo de Entrega\n(Actualización de Estado)", "#f5f3ff");

  // Picking dispara Delivery
  addArrow(800, 810, 900, 810);
  // Telegram Bot a Rastreo
  addArrow(1050, 850, 1050, 890);
  // Rastreo notifica a Cliente (Checkout/Hub)
  addArrow(900, 930, 250, 930); // flecha larga
  addArrow(250, 930, 250, 720); // llega al cliente

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

  fs.writeFileSync('AxonMarket_Procesos.excalidraw', JSON.stringify(excalidrawState, null, 2));
  console.log("Archivo AxonMarket_Procesos.excalidraw generado exitosamente.");
}

generateExcalidraw();
