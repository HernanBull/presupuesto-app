const fs = require('fs');

function generateExcalidraw() {
  const elements = [];
  let idCounter = 1;

  const generateId = () => `element-${idCounter++}`;

  const addBox = (x, y, width, height, text, bgColor = 'transparent', strokeColor = '#000000', fontSize = 16, textAlign = 'center') => {
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
      textAlign: textAlign,
      verticalAlign: 'middle',
      containerId: boxId
    });

    return { id: boxId, textId, x, y, width, height };
  };

  const addArrow = (box1, box2, dash = false) => {
    let startX = box1.x + box1.width / 2;
    let startY = box1.y + box1.height;
    let endX = box2.x + box2.width / 2;
    let endY = box2.y;

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
      strokeWidth: dash ? 1 : 2,
      strokeStyle: dash ? 'dashed' : 'solid',
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

  // TITULO
  addBox(600, 20, 900, 60, "Panel de Control del Comerciante B2B (Módulos Activos Verificados)", "#10b981", "#ffffff", 24);

  const core = addBox(850, 120, 400, 60, "EcommerceDashboard\n(Hub Central de Control B2B)", "#ecfdf5", "#059669", 18);

  const colWidth = 320;
  const gap = 40;
  const startX = 50;

  // COLUMNA 1: CONFIGURACION
  const col1X = startX;
  const c1_h = addBox(col1X, 250, colWidth, 50, "1. Configuración de Tienda", "#3b82f6", "#ffffff", 18);
  const c1_1 = addBox(col1X, 330, colWidth, 70, "StoreProfileManager\n- Nombre, Logo, Teléfono B2B\n- Perfil de Identidad", "#eff6ff");
  const c1_2 = addBox(col1X, 430, colWidth, 70, "CartSettings\n- Montos Mínimos\n- Métodos de Pago", "#eff6ff");
  const c1_3 = addBox(col1X, 530, colWidth, 70, "StoreLocationManager\n- GPS y Coordenadas\n- Mapa Leaflet para Envío", "#eff6ff");
  addArrow(core, c1_h); addArrow(c1_h, c1_1); addArrow(c1_1, c1_2); addArrow(c1_2, c1_3); 

  // COLUMNA 2: ERP & CATALOGO
  const col2X = startX + colWidth + gap;
  const c2_h = addBox(col2X, 250, colWidth, 50, "2. Catálogo & ERP (Inventario)", "#8b5cf6", "#ffffff", 18);
  const c2_1 = addBox(col2X, 330, colWidth, 70, "ProductsManager & Studio\n- Formularios B2B Unificados\n- Metadatos JSON (Marca/Lote)", "#f5f3ff");
  const c2_2 = addBox(col2X, 430, colWidth, 70, "InventoryManager\n- KARDEX Inmutable\n- Punto de Reorden", "#f5f3ff");
  const c2_3 = addBox(col2X, 530, colWidth, 70, "Control Avanzado ERP\n- Mermas, Rotura, Caducidad\n- Auditoría Ciega", "#f5f3ff");
  const c2_4 = addBox(col2X, 630, colWidth, 70, "Contabilidad de Stock\n- Costo Promedio Ponderado\n- Valorización", "#f5f3ff");
  addArrow(core, c2_h); addArrow(c2_h, c2_1); addArrow(c2_1, c2_2); addArrow(c2_2, c2_3); addArrow(c2_3, c2_4);

  // COLUMNA 3: OPERACIONES Y LOGISTICA
  const col3X = startX + (colWidth + gap) * 2;
  const c3_h = addBox(col3X, 250, colWidth, 50, "3. Operaciones & Órdenes", "#f59e0b", "#ffffff", 18);
  const c3_1 = addBox(col3X, 330, colWidth, 70, "OrdersManager (Kanban)\n- Nueva Orden / En Proceso\n- Filtros Dinámicos", "#fffbeb");
  const c3_2 = addBox(col3X, 430, colWidth, 70, "Validación de Pagos\n- Aprobación de Captures\n- Referencias", "#fffbeb");
  const c3_3 = addBox(col3X, 530, colWidth, 70, "OrderPreparation (Picking)\n- Checklist de Empaque\n- Imprimir Comandas", "#fffbeb");
  const c3_4 = addBox(col3X, 630, colWidth, 70, "Despacho a Delivery\n- Disparo One-Click\n- Telegram Bot API", "#fffbeb");
  addArrow(core, c3_h); addArrow(c3_h, c3_1); addArrow(c3_1, c3_2); addArrow(c3_2, c3_3); addArrow(c3_3, c3_4);

  // COLUMNA 4: CRM & SOPORTE
  const col4X = startX + (colWidth + gap) * 3;
  const c4_h = addBox(col4X, 250, colWidth, 50, "4. CRM & Relación Cliente", "#14b8a6", "#ffffff", 18);
  const c4_1 = addBox(col4X, 330, colWidth, 70, "CustomersManager\n- Base de Datos de Clientes\n- Valor de Vida (LTV)", "#f0fdfa");
  const c4_2 = addBox(col4X, 430, colWidth, 70, "CustomerChatsPage\n- Socket.io En Vivo\n- Chat con Compradores", "#f0fdfa");
  addArrow(core, c4_h); addArrow(c4_h, c4_1); addArrow(c4_1, c4_2); 

  // COLUMNA 5: MARKETING Y SOCIAL PROOF
  const col5X = startX + (colWidth + gap) * 4;
  const c5_h = addBox(col5X, 250, colWidth, 50, "5. Marketing & Crecimiento", "#ec4899", "#ffffff", 18);
  const c5_1 = addBox(col5X, 330, colWidth, 70, "OffersManager\n- Activación de Ofertas Flash\n- Descuentos Rápidos", "#fdf2f8");
  const c5_2 = addBox(col5X, 430, colWidth, 70, "PromotionsManager\n- Creación de Cupones\n- Validación API", "#fdf2f8");
  const c5_3 = addBox(col5X, 530, colWidth, 70, "ReviewsManager\n- Moderación B2B\n- Aprobar / Rechazar / Responder", "#fdf2f8");
  addArrow(core, c5_h); addArrow(c5_h, c5_1); addArrow(c5_1, c5_2); addArrow(c5_2, c5_3);

  // COLUMNA 6: ANALITICA
  const col6X = startX + (colWidth + gap) * 5;
  const c6_h = addBox(col6X, 250, colWidth, 50, "6. Analíticas & Alertas", "#ef4444", "#ffffff", 18);
  const c6_1 = addBox(col6X, 330, colWidth, 70, "AnalyticsManager\n- Gráficas de Ventas Reales\n- Fuentes de Tráfico", "#fef2f2");
  const c6_2 = addBox(col6X, 430, colWidth, 70, "Embudos de Conversión\n- Carritos Abandonados\n- Drop-off Rates", "#fef2f2");
  const c6_3 = addBox(col6X, 530, colWidth, 70, "NotificationsManager\n- Alertas de Stock Vacío\n- Historial de Eventos Sistema", "#fef2f2");
  addArrow(core, c6_h); addArrow(c6_h, c6_1); addArrow(c6_1, c6_2); addArrow(c6_2, c6_3);

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

  fs.writeFileSync('AxonMarket_Comerciante_UltraDetallado.excalidraw', JSON.stringify(excalidrawState, null, 2));
  console.log("Archivo AxonMarket_Comerciante_UltraDetallado.excalidraw actualizado exitosamente.");
}

generateExcalidraw();
