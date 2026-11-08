// src/modules/ecommerce/services/numericBackupService.js
// Extractor y generador de respaldo estrictamente numérico y contable.
// Excluye al 100% fotos, videos y archivos pesados para proteger los datos operativos del comercio.

import { supabase } from '../../../supabaseClient';

/**
 * Consulta y estructura todos los datos numéricos y contables del comercio.
 * @param {string} workspaceId 
 * @returns {Promise<Object>} Respaldo estructurado con métricas, productos y órdenes
 */
export const fetchNumericBackupData = async (workspaceId) => {
  if (!workspaceId) throw new Error('ID de comercio no proporcionado.');

  // 1. Obtener datos básicos del workspace
  const { data: ws } = await supabase
    .from('workspaces')
    .select('id, name, store_slug, config, created_at')
    .eq('id', workspaceId)
    .maybeSingle();

  const cfg = typeof ws?.config === 'object' && ws?.config !== null 
    ? ws.config 
    : (typeof ws?.config === 'string' ? JSON.parse(ws?.config || '{}') : {});

  // 2. Obtener productos (solo campos numéricos y descriptivos, omitiendo URLs de imágenes)
  let productsList = [];
  try {
    const { data: prodData } = await supabase
      .from('ecommerce_products')
      .select('id, name, barcode, category, subcategory, price, price_ves, cost_price, stock, stock_vitrina, created_at')
      .eq('workspace_id', workspaceId);
    
    if (Array.isArray(prodData)) {
      productsList = prodData.map(p => ({
        id: p.id,
        nombre: p.name || 'Sin nombre',
        codigo_barra: p.barcode || 'N/A',
        categoria: p.category || 'General',
        subcategoria: p.subcategory || 'General',
        precio_usd: Number(p.price || 0),
        precio_bs: Number(p.price_ves || 0),
        costo_usd: Number(p.cost_price || 0),
        stock_deposito: Number(p.stock || 0),
        stock_vitrina: Number(p.stock_vitrina || 0),
        stock_total: Number(p.stock || 0) + Number(p.stock_vitrina || 0)
      }));
    }
  } catch (err) {
    console.warn('Error obteniendo productos para respaldo:', err);
  }

  // 3. Obtener órdenes y ventas históricas
  let ordersList = [];
  try {
    const { data: ordData } = await supabase
      .from('ecommerce_orders_v2')
      .select('id, created_at, total, total_ves, payment_method, status, customer_name, customer_phone, items')
      .eq('workspace_id', workspaceId);

    const targetOrders = Array.isArray(ordData) && ordData.length > 0 
      ? ordData 
      : ((await supabase.from('ecommerce_orders').select('id, created_at, total, total_ves, payment_method, status, customer_name, customer_phone, items').eq('workspace_id', workspaceId)).data || []);

    if (Array.isArray(targetOrders)) {
      ordersList = targetOrders.map(o => {
        let cleanItems = [];
        if (Array.isArray(o.items)) {
          cleanItems = o.items.map(it => ({
            producto: it.name || it.title || 'Producto',
            cantidad: Number(it.quantity || it.qty || 1),
            precio_unitario_usd: Number(it.price || 0),
            subtotal_usd: Number(it.subtotal || ((it.price || 0) * (it.quantity || it.qty || 1)))
          }));
        }
        return {
          id: o.id,
          fecha: o.created_at,
          cliente: o.customer_name || 'Consumidor Final',
          telefono_cliente: o.customer_phone || 'N/A',
          total_usd: Number(o.total || 0),
          total_bs: Number(o.total_ves || 0),
          metodo_pago: o.payment_method || 'Efectivo',
          estado: o.status || 'Completado',
          cantidad_items: cleanItems.length,
          detalle_renglones: cleanItems
        };
      });
    }
  } catch (err) {
    console.warn('Error obteniendo órdenes para respaldo:', err);
  }

  // 4. Calcular métricas consolidadas
  const totalVentasUsd = ordersList.reduce((acc, o) => acc + (o.total_usd || 0), 0);
  const totalVentasBs = ordersList.reduce((acc, o) => acc + (o.total_bs || 0), 0);
  const totalItemsInventario = productsList.reduce((acc, p) => acc + (p.stock_total || 0), 0);
  const valorInventarioVentaUsd = productsList.reduce((acc, p) => acc + ((p.stock_total || 0) * (p.precio_usd || 0)), 0);
  const valorInventarioCostoUsd = productsList.reduce((acc, p) => acc + ((p.stock_total || 0) * (p.costo_usd || 0)), 0);

  return {
    metadatos_respaldo: {
      sistema: 'AxonMarket POS & E-commerce',
      comercio: ws?.name || 'Mi Comercio',
      identificador_tienda: ws?.store_slug || workspaceId,
      fecha_exportacion: new Date().toISOString(),
      tipo_respaldo: 'ESTRICTAMENTE_NUMÉRICO_Y_CONTABLE (Sin archivos multimedia)',
      moneda_base: cfg.currency || 'USD'
    },
    resumen_financiero: {
      total_facturado_usd: Number(totalVentasUsd.toFixed(2)),
      total_facturado_bs: Number(totalVentasBs.toFixed(2)),
      total_ordenes_registradas: ordersList.length,
      total_referencias_productos: productsList.length,
      total_unidades_inventario: totalItemsInventario,
      valor_inventario_precio_venta_usd: Number(valorInventarioVentaUsd.toFixed(2)),
      valor_inventario_costo_usd: Number(valorInventarioCostoUsd.toFixed(2)),
      margen_potencial_inventario_usd: Number((valorInventarioVentaUsd - valorInventarioCostoUsd).toFixed(2))
    },
    productos: productsList,
    ventas: ordersList
  };
};

/**
 * Descarga el respaldo completo en formato JSON estructurado.
 */
export const downloadNumericBackupJSON = async (workspaceId, storeName = 'Comercio') => {
  const data = await fetchNumericBackupData(workspaceId);
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const cleanName = String(storeName).toLowerCase().replace(/[^a-z0-9]/gi, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `respaldo_numerico_${cleanName}_${dateStr}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return data;
};

/**
 * Descarga el respaldo de productos y ventas en formato CSV compatible con Excel.
 */
export const downloadNumericBackupCSV = async (workspaceId, storeName = 'Comercio') => {
  const data = await fetchNumericBackupData(workspaceId);
  
  // Encabezados y líneas de Productos
  let csvContent = `RESPALDO NUMERICO AXONMARKET - ${data.metadatos_respaldo.comercio}\n`;
  csvContent += `Fecha: ${data.metadatos_respaldo.fecha_exportacion}\n`;
  csvContent += `Total Ventas USD: $${data.resumen_financiero.total_facturado_usd} | Total Unidades Stock: ${data.resumen_financiero.total_unidades_inventario}\n\n`;

  csvContent += `--- INVENTARIO DE PRODUCTOS ---\n`;
  csvContent += `"Codigo","Nombre","Categoria","Precio USD","Precio Bs","Costo USD","Stock Deposito","Stock Vitrina","Stock Total"\n`;
  
  (data.productos || []).forEach(p => {
    csvContent += `"${p.codigo_barra}","${p.nombre.replace(/"/g, '""')}","${p.categoria}","${p.precio_usd}","${p.precio_bs}","${p.costo_usd}","${p.stock_deposito}","${p.stock_vitrina}","${p.stock_total}"\n`;
  });

  csvContent += `\n--- HISTORIAL DE VENTAS ---\n`;
  csvContent += `"ID Venta","Fecha","Cliente","Metodo Pago","Total USD","Total Bs","Estado","Cant. Renglones"\n`;

  (data.ventas || []).forEach(v => {
    csvContent += `"${v.id}","${v.fecha}","${(v.cliente || '').replace(/"/g, '""')}","${v.metodo_pago}","${v.total_usd}","${v.total_bs}","${v.estado}","${v.cantidad_items}"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const cleanName = String(storeName).toLowerCase().replace(/[^a-z0-9]/gi, '_');
  const dateStr = new Date().toISOString().slice(0, 10);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `respaldo_numerico_${cleanName}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return data;
};

/**
 * Genera un resumen numérico limpio y lo copia al portapapeles del dispositivo.
 */
export const copyNumericSummaryToClipboard = async (workspaceId) => {
  const data = await fetchNumericBackupData(workspaceId);
  const rf = data.resumen_financiero;
  
  let summaryText = `📊 RESUMEN CONTABLE Y NUMÉRICO - ${data.metadatos_respaldo.comercio}\n`;
  summaryText += `Fecha: ${new Date().toLocaleDateString('es-VE')} ${new Date().toLocaleTimeString('es-VE')}\n\n`;
  summaryText += `💰 FINANZAS Y FACTURACIÓN:\n`;
  summaryText += `• Total Facturado USD: $${rf.total_facturado_usd.toLocaleString('es-VE', { minimumFractionDigits: 2 })}\n`;
  summaryText += `• Total Facturado Bs: Bs. ${rf.total_facturado_bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}\n`;
  summaryText += `• Total Órdenes Registradas: ${rf.total_ordenes_registradas}\n\n`;
  summaryText += `📦 INVENTARIO Y STOCK:\n`;
  summaryText += `• Referencias de Productos: ${rf.total_referencias_productos}\n`;
  summaryText += `• Total Unidades en Stock: ${rf.total_unidades_inventario}\n`;
  summaryText += `• Valor de Inventario a Venta: $${rf.valor_inventario_precio_venta_usd.toLocaleString('es-VE', { minimumFractionDigits: 2 })}\n`;
  summaryText += `• Valor de Inventario a Costo: $${rf.valor_inventario_costo_usd.toLocaleString('es-VE', { minimumFractionDigits: 2 })}\n`;
  summaryText += `• Ganancia Potencial: $${rf.margen_potencial_inventario_usd.toLocaleString('es-VE', { minimumFractionDigits: 2 })}\n\n`;
  summaryText += `📝 PRIMEROS 15 PRODUCTOS:\n`;
  
  (data.productos || []).slice(0, 15).forEach((p, idx) => {
    summaryText += `${idx + 1}. ${p.nombre} | Stock: ${p.stock_total} | Precio: $${p.precio_usd}\n`;
  });
  if (data.productos.length > 15) {
    summaryText += `... y ${data.productos.length - 15} productos más en su archivo de respaldo completo.\n`;
  }

  await navigator.clipboard.writeText(summaryText);
  return summaryText;
};
