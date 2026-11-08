// src/modules/ecommerce/services/numericBackupService.js
// Motor Profesional de Respaldo Contable y Numérico de AxonMarket
// Genera plantillas corporativas tipo Excel (.xls) y tipo Word (.doc)
// 100% numérico y analítico: Ventas, Tickets POS, Cajas, Inventario y Clientes (Cero fotos/videos).

import { supabase } from '../../../supabaseClient';
import { offlineDb } from './offlineSyncService';

/**
 * Consulta y estructura todos los datos contables y cuantitativos del comercio desde Supabase.
 * Diseñado con tolerancia total a esquemas para evitar campos vacíos o errores 42703.
 * @param {string} workspaceId 
 * @returns {Promise<Object>} Respaldo consolidado
 */
export const fetchNumericBackupData = async (workspaceId) => {
  if (!workspaceId) throw new Error('ID de comercio no proporcionado.');

  // 0. Obtener tasa BCV oficial de referencia
  let bcvRate = 890;
  try {
    const { data: bcvData } = await supabase.from('app_settings').select('bcv_rate').limit(1).maybeSingle();
    if (bcvData?.bcv_rate) bcvRate = parseFloat(bcvData.bcv_rate) || 890;
  } catch (_) {}

  // 1. Obtener datos del workspace
  const { data: ws } = await supabase
    .from('workspaces')
    .select('id, name, store_slug, map_address, status, config, created_at')
    .eq('id', workspaceId)
    .maybeSingle();

  const cfg = typeof ws?.config === 'object' && ws?.config !== null 
    ? ws.config 
    : (typeof ws?.config === 'string' ? JSON.parse(ws?.config || '{}') : {});

  // 2. Obtener productos (solo números y texto cuantitativo, cero fotos/videos)
  let productsList = [];
  try {
    const { data: prodData } = await supabase
      .from('ecommerce_products')
      .select('*')
      .eq('workspace_id', workspaceId);
    
    if (Array.isArray(prodData) && prodData.length > 0) {
      productsList = prodData.map((p, idx) => {
        const stockDep = Number(p.stock || 0);
        const stockVit = Number(p.stock_vitrina || 0);
        const stockTot = stockDep + stockVit;
        const pUsd = Number(p.price || 0);
        const pBs = Number(p.price_ves || (pUsd * bcvRate).toFixed(2));
        const cUsd = Number(p.cogs || p.cost_price || p.metadata?.cost || 0);

        return {
          numero: idx + 1,
          id: p.id,
          codigo: p.barcode || p.metadata?.barcode || p.sku || p.id,
          nombre: p.name || 'Producto sin nombre',
          categoria: p.category || 'General',
          subcategoria: p.subcategory || 'General',
          precio_usd: pUsd,
          precio_bs: pBs,
          costo_usd: cUsd,
          stock_deposito: stockDep,
          stock_vitrina: stockVit,
          stock_total: stockTot,
          valor_venta_usd: Number((stockTot * pUsd).toFixed(2)),
          valor_costo_usd: Number((stockTot * cUsd).toFixed(2)),
          margen_usd: Number(((pUsd - cUsd) * stockTot).toFixed(2))
        };
      });
    }
  } catch (err) {
    console.warn('Notice loading products for backup:', err);
  }

  // 3. Obtener ventas históricas y tickets del POS (ecommerce_orders_v2 + ecommerce_orders)
  let ordersList = [];
  try {
    let rawOrders = [];
    const { data: ord2 } = await supabase
      .from('ecommerce_orders_v2')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('date', { ascending: false });

    if (Array.isArray(ord2) && ord2.length > 0) {
      rawOrders = ord2;
    } else {
      const { data: ord1 } = await supabase
        .from('ecommerce_orders')
        .select('*')
        .eq('workspace_id', workspaceId);
      if (Array.isArray(ord1) && ord1.length > 0) rawOrders = ord1;
    }

    // Si Supabase remoto no tiene ventas aún, consultar la cola local offline Dexie
    if (rawOrders.length === 0) {
      try {
        const localSales = await offlineDb.offline_sales_queue.toArray();
        if (Array.isArray(localSales) && localSales.length > 0) {
          rawOrders = localSales;
        }
      } catch (_) {}
    }

    ordersList = rawOrders.map((o, idx) => {
      let cleanItems = [];
      let parsedItems = o.items;
      if (typeof parsedItems === 'string') {
        try { parsedItems = JSON.parse(parsedItems); } catch (_) {}
      }

      if (Array.isArray(parsedItems)) {
        cleanItems = parsedItems.map(it => ({
          producto: it.name || it.title || 'Ítem',
          cantidad: Number(it.quantity || it.qty || 1),
          precio_usd: Number(it.price || 0),
          subtotal_usd: Number(it.subtotal || ((Number(it.price || 0)) * Number(it.quantity || it.qty || 1)))
        }));
      }

      const totalUsd = Number(o.total || o.paymentdetails?.totalUsd || 0);
      const totalBs = Number(o.paymentdetails?.totalVes || o.total_ves || (totalUsd * bcvRate).toFixed(2));
      const rawDate = o.date || o.created_at || o.timestamp;

      return {
        numero: idx + 1,
        id_ticket: o.paymentdetails?.invoiceNumber || o.id || `TKT-${idx + 1}`,
        fecha: rawDate ? new Date(rawDate).toLocaleString('es-VE') : 'N/A',
        cliente: o.customer || o.customer_name || 'Consumidor Final',
        telefono: o.customer_phone || o.delivery_driver_phone || 'N/A',
        metodo_pago: o.paymentmethod || o.payment_method || (o.paymentdetails?.payments?.[0]?.method) || 'Efectivo',
        total_usd: totalUsd,
        total_bs: totalBs,
        estado: o.status || 'Completado',
        items_count: cleanItems.length,
        renglones_resumen: cleanItems.map(it => `${it.cantidad}x ${it.producto} ($${it.precio_usd})`).join('; ') || 'Venta global',
        detalle_items: cleanItems
      };
    });
  } catch (err) {
    console.warn('Notice loading orders for backup:', err);
  }

  // 4. Obtener cierres de caja y turnos (cash_shifts de Supabase + fallback config/IndexedDB)
  let shiftsList = [];
  try {
    let csData = null;
    const { data: bData, error: bErr } = await supabase
      .from('cash_shifts')
      .select('*')
      .eq('branch_id', workspaceId)
      .order('opened_at', { ascending: false });

    if (!bErr && Array.isArray(bData)) {
      csData = bData;
    } else {
      const { data: wData } = await supabase
        .from('cash_shifts')
        .select('*')
        .order('opened_at', { ascending: false });
      if (Array.isArray(wData)) {
        csData = wData.filter(s => s.branch_id === workspaceId || s.workspace_id === workspaceId);
      }
    }

    let rawShifts = Array.isArray(csData) && csData.length > 0 ? csData : [];

    if (rawShifts.length === 0) {
      const cfgShifts = cfg.cash_shifts || cfg.shifts || [];
      if (Array.isArray(cfgShifts) && cfgShifts.length > 0) {
        rawShifts = cfgShifts;
      }
    }

    if (rawShifts.length === 0) {
      try {
        const localShifts = await offlineDb.cash_shifts.toArray();
        if (Array.isArray(localShifts) && localShifts.length > 0) {
          rawShifts = localShifts;
        }
      } catch (_) {}
    }

    shiftsList = rawShifts.map((s, idx) => ({
      numero: idx + 1,
      caja: s.register_name || s.registerName || 'Caja Principal',
      cajero: s.cashier_name || s.cashierName || 'Cajero',
      apertura: (s.opened_at || s.openedAt) ? new Date(s.opened_at || s.openedAt).toLocaleString('es-VE') : 'N/A',
      monto_inicial_usd: Number(s.initial_usd || s.initialCashUsd || 0),
      monto_inicial_bs: Number(s.initial_ves || s.initialCashBs || 0),
      cierre: (s.closed_at || s.closedAt) ? new Date(s.closed_at || s.closedAt).toLocaleString('es-VE') : (s.status === 'OPEN' ? 'Turno Abierto' : 'Cerrado'),
      ventas_efectivo_usd: Number(s.actual_usd || s.expected_usd || s.salesCashUsd || 0),
      ventas_pago_movil_bs: Number(s.actual_ves || s.expected_ves || s.salesPagoMovilBs || 0),
      total_arqueado_usd: Number(s.actual_usd || s.countedCashUsd || s.totalCountedUsd || s.expected_usd || 0),
      diferencia_usd: Number(s.difference_usd || s.differenceUsd || 0),
      estado: s.status || ((s.closed_at || s.closedAt) ? 'Cerrado' : 'Abierto')
    }));
  } catch (err) {
    console.warn('Notice loading shifts for backup:', err);
  }

  // 5. Cartera de clientes registrada
  let customersList = [];
  try {
    const customerMap = {};
    ordersList.forEach(o => {
      const key = (o.cliente || '').trim().toLowerCase();
      if (key && key !== 'consumidor final') {
        if (!customerMap[key]) {
          customerMap[key] = {
            nombre: o.cliente,
            telefono: o.telefono,
            total_comprado_usd: 0,
            compras_count: 0
          };
        }
        customerMap[key].total_comprado_usd += o.total_usd;
        customerMap[key].compras_count += 1;
      }
    });
    customersList = Object.values(customerMap).map((c, idx) => ({
      numero: idx + 1,
      nombre: c.nombre,
      telefono: c.telefono,
      total_compras_usd: Number(c.total_comprado_usd.toFixed(2)),
      cantidad_pedidos: c.compras_count
    }));
  } catch (_) {}

  // 6. Métricas y Totales Financieros
  const totalFacturadoUsd = ordersList.reduce((acc, o) => acc + (o.total_usd || 0), 0);
  const totalFacturadoBs = ordersList.reduce((acc, o) => acc + (o.total_bs || 0), 0);
  const totalUnidadesStock = productsList.reduce((acc, p) => acc + (p.stock_total || 0), 0);
  const valorTotalVentaUsd = productsList.reduce((acc, p) => acc + (p.valor_venta_usd || 0), 0);
  const valorTotalCostoUsd = productsList.reduce((acc, p) => acc + (p.valor_costo_usd || 0), 0);
  const gananciaPotencialStock = valorTotalVentaUsd - valorTotalCostoUsd;

  // Desglose por método de pago
  const metodosPagoTotales = {};
  ordersList.forEach(o => {
    const m = o.metodo_pago || 'Otros';
    metodosPagoTotales[m] = (metodosPagoTotales[m] || 0) + o.total_usd;
  });

  return {
    comercio: {
      nombre: ws?.name || 'Mi Comercio',
      slug: ws?.store_slug || workspaceId,
      rif: cfg.rif || cfg.paymentProfile?.pmId || 'J-N/A',
      direccion: ws?.map_address || cfg.address || 'Venezuela',
      propietario: cfg.ownerName || cfg.contact?.name || 'Administrador',
      telefono: cfg.phone || cfg.socialLinks?.whatsapp || cfg.contact?.phone || 'N/A',
      fecha_exportacion: new Date().toLocaleString('es-VE')
    },
    resumen_financiero: {
      total_facturado_usd: Number(totalFacturadoUsd.toFixed(2)),
      total_facturado_bs: Number(totalFacturadoBs.toFixed(2)),
      total_tickets_emitidos: ordersList.length,
      ticket_promedio_usd: ordersList.length > 0 ? Number((totalFacturadoUsd / ordersList.length).toFixed(2)) : 0,
      total_referencias_inventario: productsList.length,
      total_unidades_mercancia: totalUnidadesStock,
      valor_inventario_venta_usd: Number(valorTotalVentaUsd.toFixed(2)),
      valor_inventario_costo_usd: Number(valorTotalCostoUsd.toFixed(2)),
      margen_proyectado_stock_usd: Number(gananciaPotencialStock.toFixed(2)),
      metodos_pago: metodosPagoTotales
    },
    productos: productsList,
    ventas: ordersList,
    cajas: shiftsList,
    clientes: customersList
  };
};

/**
 * Genera y descarga una Plantilla Profesional Tipo Excel (.xls)
 * Utiliza formato HTML-Office nativo soportado al 100% por Microsoft Excel, LibreOffice y Google Sheets.
 */
export const downloadProfessionalExcelTemplate = async (workspaceId, storeName = 'Comercio') => {
  const data = await fetchNumericBackupData(workspaceId);
  const rf = data.resumen_financiero;
  const com = data.comercio;

  const excelHtml = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <!--[if gte mso 9]>
    <xml>
      <x:ExcelWorkbook>
        <x:ExcelWorksheets>
          <x:ExcelWorksheet>
            <x:Name>Resumen y Contabilidad</x:Name>
            <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
          </x:ExcelWorksheet>
        </x:ExcelWorksheets>
      </x:ExcelWorkbook>
    </xml>
    <![endif]-->
    <style>
      body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1e293b; }
      .header-title { font-size: 16pt; font-weight: bold; color: #ea580c; text-align: left; }
      .header-sub { font-size: 10pt; color: #64748b; }
      .section-banner { background-color: #1e293b; color: #ffffff; font-weight: bold; font-size: 12pt; padding: 8px; text-align: left; }
      .table-th { background-color: #f1f5f9; color: #0f172a; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px; text-align: left; }
      .table-th-num { background-color: #f1f5f9; color: #0f172a; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px; text-align: right; }
      .table-td { border: 1px solid #e2e8f0; padding: 5px; }
      .table-td-num { border: 1px solid #e2e8f0; padding: 5px; text-align: right; mso-number-format:"\\$#,##0.00"; }
      .table-td-bs { border: 1px solid #e2e8f0; padding: 5px; text-align: right; mso-number-format:"Bs\\.#,##0.00"; }
      .table-td-qty { border: 1px solid #e2e8f0; padding: 5px; text-align: right; mso-number-format:"#,##0"; }
      .table-total { background-color: #ffedd5; font-weight: bold; border: 1px solid #fdba74; padding: 6px; }
    </style>
  </head>
  <body>
    <table>
      <tr>
        <td colspan="6" class="header-title">INFORME CONTABLE Y RESPALDO NUMÉRICO OFICIAL</td>
      </tr>
      <tr>
        <td colspan="6" class="header-sub">Comercio: <b>${com.nombre}</b> | RIF: ${com.rif} | Responsable: ${com.propietario}</td>
      </tr>
      <tr>
        <td colspan="6" class="header-sub">Dirección: ${com.direccion} | Teléfono: ${com.telefono} | Fecha de Auditoría: ${com.fecha_exportacion}</td>
      </tr>
      <tr><td colspan="6"></td></tr>

      <!-- TABLA 1: RESUMEN EJECUTIVO -->
      <tr><td colspan="6" class="section-banner">1. BALANCE GENERAL Y MÉTRICAS FINANCIERAS</td></tr>
      <tr>
        <td class="table-th" colspan="3">Métrica Contable</td>
        <td class="table-th-num" colspan="3">Monto / Valor</td>
      </tr>
      <tr>
        <td class="table-td" colspan="3">Total Facturado en Ventas (USD)</td>
        <td class="table-td-num" colspan="3">$ ${rf.total_facturado_usd.toFixed(2)}</td>
      </tr>
      <tr>
        <td class="table-td" colspan="3">Total Facturado en Ventas (Bolívares)</td>
        <td class="table-td-bs" colspan="3">Bs. ${rf.total_facturado_bs.toFixed(2)}</td>
      </tr>
      <tr>
        <td class="table-td" colspan="3">Total de Tickets / Órdenes POS Procesadas</td>
        <td class="table-td-qty" colspan="3">${rf.total_tickets_emitidos}</td>
      </tr>
      <tr>
        <td class="table-td" colspan="3">Ticket Promedio por Venta (USD)</td>
        <td class="table-td-num" colspan="3">$ ${rf.ticket_promedio_usd.toFixed(2)}</td>
      </tr>
      <tr>
        <td class="table-td" colspan="3">Valorización Total de Inventario a Precio de Venta (USD)</td>
        <td class="table-td-num" colspan="3">$ ${rf.valor_inventario_venta_usd.toFixed(2)}</td>
      </tr>
      <tr>
        <td class="table-td" colspan="3">Valorización Total de Inventario al Costo (USD)</td>
        <td class="table-td-num" colspan="3">$ ${rf.valor_inventario_costo_usd.toFixed(2)}</td>
      </tr>
      <tr>
        <td class="table-td" colspan="3">Margen Comercial Bruto Proyectado en Stock (USD)</td>
        <td class="table-td-num" colspan="3">$ ${rf.margen_proyectado_stock_usd.toFixed(2)}</td>
      </tr>
      <tr><td colspan="6"></td></tr>

      <!-- TABLA 2: INVENTARIO DE PRODUCTOS -->
      <tr><td colspan="9" class="section-banner">2. INVENTARIO FÍSICO Y VALORIZACIÓN DE PRODUCTOS</td></tr>
      <tr>
        <th class="table-th">#</th>
        <th class="table-th">Código / Barra</th>
        <th class="table-th">Descripción del Producto</th>
        <th class="table-th">Categoría</th>
        <th class="table-th-num">Precio USD</th>
        <th class="table-th-num">Costo USD</th>
        <th class="table-th-num">Stock Total</th>
        <th class="table-th-num">Total Venta ($)</th>
        <th class="table-th-num">Total Costo ($)</th>
      </tr>
      ${data.productos.map(p => `
      <tr>
        <td class="table-td">${p.numero}</td>
        <td class="table-td" style="mso-number-format:'\\@';">${p.codigo}</td>
        <td class="table-td">${p.nombre}</td>
        <td class="table-td">${p.categoria}</td>
        <td class="table-td-num">$ ${p.precio_usd.toFixed(2)}</td>
        <td class="table-td-num">$ ${p.costo_usd.toFixed(2)}</td>
        <td class="table-td-qty">${p.stock_total}</td>
        <td class="table-td-num">$ ${p.valor_venta_usd.toFixed(2)}</td>
        <td class="table-td-num">$ ${p.valor_costo_usd.toFixed(2)}</td>
      </tr>
      `).join('')}
      <tr class="table-total">
        <td colspan="6">TOTALES DE INVENTARIO:</td>
        <td class="table-td-qty">${rf.total_unidades_mercancia} uds</td>
        <td class="table-td-num">$ ${rf.valor_inventario_venta_usd.toFixed(2)}</td>
        <td class="table-td-num">$ ${rf.valor_inventario_costo_usd.toFixed(2)}</td>
      </tr>
      <tr><td colspan="9"></td></tr>

      <!-- TABLA 3: HISTORIAL DE VENTAS Y TICKETS -->
      <tr><td colspan="8" class="section-banner">3. HISTORIAL DETALLADO DE VENTAS Y TICKETS POS</td></tr>
      <tr>
        <th class="table-th">#</th>
        <th class="table-th">ID Ticket</th>
        <th class="table-th">Fecha y Hora</th>
        <th class="table-th">Cliente</th>
        <th class="table-th">Método Pago</th>
        <th class="table-th-num">Total USD</th>
        <th class="table-th-num">Total Bs</th>
        <th class="table-th">Renglones Vendidos</th>
      </tr>
      ${data.ventas.map(v => `
      <tr>
        <td class="table-td">${v.numero}</td>
        <td class="table-td" style="mso-number-format:'\\@';">${v.id_ticket}</td>
        <td class="table-td">${v.fecha}</td>
        <td class="table-td">${v.cliente}</td>
        <td class="table-td">${v.metodo_pago}</td>
        <td class="table-td-num">$ ${v.total_usd.toFixed(2)}</td>
        <td class="table-td-bs">Bs. ${v.total_bs.toFixed(2)}</td>
        <td class="table-td">${v.renglones_resumen || 'Productos'}</td>
      </tr>
      `).join('')}
      <tr class="table-total">
        <td colspan="5">TOTAL HISTÓRICO DE FACTURACIÓN:</td>
        <td class="table-td-num">$ ${rf.total_facturado_usd.toFixed(2)}</td>
        <td class="table-td-bs">Bs. ${rf.total_facturado_bs.toFixed(2)}</td>
        <td>${data.ventas.length} transacciones</td>
      </tr>
      <tr><td colspan="8"></td></tr>

      <!-- TABLA 4: CIERRES DE CAJA Y ARQUEOS -->
      ${data.cajas.length > 0 ? `
      <tr><td colspan="7" class="section-banner">4. ARQUEOS DE CAJA Y TURNOS DE PUNTO DE VENTA</td></tr>
      <tr>
        <th class="table-th">#</th>
        <th class="table-th">Caja / Terminal</th>
        <th class="table-th">Cajero / Operador</th>
        <th class="table-th">Apertura</th>
        <th class="table-th">Cierre</th>
        <th class="table-th-num">Monto Inicial</th>
        <th class="table-th-num">Total Arqueado</th>
      </tr>
      ${data.cajas.map(c => `
      <tr>
        <td class="table-td">${c.numero}</td>
        <td class="table-td">${c.caja}</td>
        <td class="table-td">${c.cajero}</td>
        <td class="table-td">${c.apertura}</td>
        <td class="table-td">${c.cierre}</td>
        <td class="table-td-num">$ ${c.monto_inicial_usd.toFixed(2)}</td>
        <td class="table-td-num">$ ${c.total_arqueado_usd.toFixed(2)}</td>
      </tr>
      `).join('')}
      <tr><td colspan="7"></td></tr>
      ` : ''}

      <!-- TABLA 5: CARTERA DE CLIENTES -->
      ${data.clientes.length > 0 ? `
      <tr><td colspan="4" class="section-banner">5. CARTERA DE CLIENTES REGISTRADOS</td></tr>
      <tr>
        <th class="table-th">#</th>
        <th class="table-th">Nombre del Cliente</th>
        <th class="table-th">Teléfono de Contacto</th>
        <th class="table-th-num">Total Compras Acumuladas ($)</th>
      </tr>
      ${data.clientes.map(cl => `
      <tr>
        <td class="table-td">${cl.numero}</td>
        <td class="table-td">${cl.nombre}</td>
        <td class="table-td">${cl.telefono}</td>
        <td class="table-td-num">$ ${cl.total_compras_usd.toFixed(2)}</td>
      </tr>
      `).join('')}
      ` : ''}

    </table>
  </body>
  </html>
  `;

  const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const cleanName = String(storeName).toLowerCase().replace(/[^a-z0-9]/gi, '_');
  const dateStr = new Date().toISOString().slice(0, 10);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Plantilla_Contable_Excel_${cleanName}_${dateStr}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return data;
};

/**
 * Genera y descarga una Plantilla Profesional Tipo Word (.doc)
 * Documento formal corporativo con membrete, tablas y firmas de auditoría.
 */
export const downloadProfessionalWordTemplate = async (workspaceId, storeName = 'Comercio') => {
  const data = await fetchNumericBackupData(workspaceId);
  const rf = data.resumen_financiero;
  const com = data.comercio;

  const wordHtml = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>Informe Contable Oficial - ${com.nombre}</title>
    <style>
      @page { size: 21.59cm 27.94cm; margin: 2cm 2cm 2cm 2cm; }
      body { font-family: 'Calibri', 'Times New Roman', serif; font-size: 11pt; line-height: 1.35; color: #0f172a; }
      .header-box { border-bottom: 3px solid #ea580c; padding-bottom: 12px; margin-bottom: 20px; }
      .title { font-size: 18pt; font-weight: bold; color: #ea580c; text-transform: uppercase; margin: 0; }
      .subtitle { font-size: 12pt; font-weight: bold; color: #1e293b; margin: 4px 0; }
      .meta { font-size: 9pt; color: #64748b; }
      h2 { font-size: 13pt; color: #1e293b; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 24px; text-transform: uppercase; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 16px; font-size: 9.5pt; }
      th { background-color: #f8fafc; border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-weight: bold; color: #1e293b; }
      td { border: 1px solid #e2e8f0; padding: 5px 8px; }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .highlight { background-color: #fff7ed; font-weight: bold; }
      .signature-section { margin-top: 40px; width: 100%; }
      .signature-box { border-top: 1px solid #64748b; width: 40%; text-align: center; font-size: 9pt; padding-top: 5px; }
    </style>
  </head>
  <body>
    <div class="header-box">
      <h1 class="title">INFORME DE RESPALDO CONTABLE Y FINANCIERO</h1>
      <div class="subtitle">${com.nombre} &bull; RIF: ${com.rif}</div>
      <div class="meta">
        Dirección: ${com.direccion} | Teléfono: ${com.telefono} | Responsable: ${com.propietario}<br/>
        Fecha de Emisión: ${com.fecha_exportacion} | Plataforma: AxonMarket POS & E-commerce
      </div>
    </div>

    <p>El presente informe certifica los datos numéricos, operaciones comerciales, existencias de inventario y arqueos de caja registrados durante la actividad comercial de la empresa <strong>${com.nombre}</strong>.</p>

    <h2>1. Resumen Ejecutivo de Operaciones</h2>
    <table>
      <tr>
        <th>Concepto Contable</th>
        <th class="text-right">Monto USD ($)</th>
        <th class="text-right">Monto Bs.</th>
      </tr>
      <tr class="highlight">
        <td>Total Facturado en Ventas</td>
        <td class="text-right">$ ${rf.total_facturado_usd.toFixed(2)}</td>
        <td class="text-right">Bs. ${rf.total_facturado_bs.toFixed(2)}</td>
      </tr>
      <tr>
        <td>Valor de Mercancía en Stock a Precio de Venta</td>
        <td class="text-right">$ ${rf.valor_inventario_venta_usd.toFixed(2)}</td>
        <td class="text-right">-</td>
      </tr>
      <tr>
        <td>Valor de Mercancía en Stock a Precio de Costo</td>
        <td class="text-right">$ ${rf.valor_inventario_costo_usd.toFixed(2)}</td>
        <td class="text-right">-</td>
      </tr>
      <tr>
        <td>Margen Comercial Bruto Proyectado</td>
        <td class="text-right">$ ${rf.margen_proyectado_stock_usd.toFixed(2)}</td>
        <td class="text-right">-</td>
      </tr>
      <tr>
        <td>Total de Transacciones / Tickets Emitidos</td>
        <td class="text-right">${rf.total_tickets_emitidos} operaciones</td>
        <td class="text-right">-</td>
      </tr>
      <tr>
        <td>Ticket Promedio por Operación</td>
        <td class="text-right">$ ${rf.ticket_promedio_usd.toFixed(2)}</td>
        <td class="text-right">-</td>
      </tr>
      <tr>
        <td>Total Unidades Físicas en Inventario</td>
        <td class="text-right">${rf.total_unidades_mercancia} unidades</td>
        <td class="text-right">-</td>
      </tr>
    </table>

    <h2>2. Inventario de Productos y Existencias Valorizadas</h2>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Código</th>
          <th>Descripción</th>
          <th>Categoría</th>
          <th class="text-right">Stock</th>
          <th class="text-right">Precio ($)</th>
          <th class="text-right">Total Venta ($)</th>
        </tr>
      </thead>
      <tbody>
        ${data.productos.map(p => `
        <tr>
          <td class="text-center">${p.numero}</td>
          <td>${p.codigo}</td>
          <td>${p.nombre}</td>
          <td>${p.categoria}</td>
          <td class="text-right">${p.stock_total}</td>
          <td class="text-right">$ ${p.precio_usd.toFixed(2)}</td>
          <td class="text-right">$ ${p.valor_venta_usd.toFixed(2)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <h2>3. Historial de Ventas y Tickets de Punto de Venta</h2>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Ticket</th>
          <th>Fecha</th>
          <th>Cliente</th>
          <th>Método</th>
          <th class="text-right">Total ($)</th>
          <th class="text-right">Total (Bs)</th>
        </tr>
      </thead>
      <tbody>
        ${data.ventas.map(v => `
        <tr>
          <td class="text-center">${v.numero}</td>
          <td>${v.id_ticket}</td>
          <td>${v.fecha}</td>
          <td>${v.cliente}</td>
          <td>${v.metodo_pago}</td>
          <td class="text-right">$ ${v.total_usd.toFixed(2)}</td>
          <td class="text-right">Bs. ${v.total_bs.toFixed(2)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <table class="signature-section" style="border: none;">
      <tr style="border: none;">
        <td style="border: none;" align="center">
          <div class="signature-box">
            Firma del Comerciante / Administrador<br/>
            <strong>${com.propietario}</strong><br/>
            C.I. / RIF: ${com.rif}
          </div>
        </td>
        <td style="border: none;" align="center">
          <div class="signature-box">
            Certificación Digital del Sistema<br/>
            <strong>AxonMarket Cloud Network</strong><br/>
            Emisión Automatizada
          </div>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  const blob = new Blob([wordHtml], { type: 'application/msword;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const cleanName = String(storeName).toLowerCase().replace(/[^a-z0-9]/gi, '_');
  const dateStr = new Date().toISOString().slice(0, 10);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Informe_Contable_Word_${cleanName}_${dateStr}.doc`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return data;
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
 * Descarga el respaldo en formato CSV plano con UTF-8 BOM para Excel.
 */
export const downloadNumericBackupCSV = async (workspaceId, storeName = 'Comercio') => {
  const data = await fetchNumericBackupData(workspaceId);
  
  let csvContent = `\uFEFF`; // BOM UTF-8 para visualización correcta de tildes en Excel
  csvContent += `RESPALDO CONTABLE AXONMARKET;${data.comercio.nombre};RIF;${data.comercio.rif}\n`;
  csvContent += `Fecha;${data.comercio.fecha_exportacion};Total Ventas USD;$ ${data.resumen_financiero.total_facturado_usd};Total Ventas Bs;Bs. ${data.resumen_financiero.total_facturado_bs}\n\n`;

  csvContent += `INVENTARIO DE PRODUCTOS\n`;
  csvContent += `Codigo;Nombre;Categoria;Precio USD;Precio Bs;Costo USD;Stock Total;Valor Venta USD;Valor Costo USD\n`;
  (data.productos || []).forEach(p => {
    csvContent += `"${p.codigo}";"${p.nombre.replace(/"/g, '""')}";"${p.categoria}";${p.precio_usd};${p.precio_bs};${p.costo_usd};${p.stock_total};${p.valor_venta_usd};${p.valor_costo_usd}\n`;
  });

  csvContent += `\nHISTORIAL DE VENTAS\n`;
  csvContent += `ID Ticket;Fecha;Cliente;Metodo Pago;Total USD;Total Bs;Renglones\n`;
  (data.ventas || []).forEach(v => {
    csvContent += `"${v.id_ticket}";"${v.fecha}";"${(v.cliente || '').replace(/"/g, '""')}";"${v.metodo_pago}";${v.total_usd};${v.total_bs};"${(v.renglones_resumen || '').replace(/"/g, '""')}"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const cleanName = String(storeName).toLowerCase().replace(/[^a-z0-9]/gi, '_');
  const dateStr = new Date().toISOString().slice(0, 10);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `respaldo_contable_${cleanName}_${dateStr}.csv`);
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
  const com = data.comercio;
  
  let summaryText = `📊 RESUMEN CONTABLE Y NUMÉRICO - ${com.nombre}\n`;
  summaryText += `RIF: ${com.rif} | Fecha: ${com.fecha_exportacion}\n\n`;
  summaryText += `💰 FINANZAS Y FACTURACIÓN:\n`;
  summaryText += `• Total Facturado USD: $ ${rf.total_facturado_usd.toLocaleString('es-VE', { minimumFractionDigits: 2 })}\n`;
  summaryText += `• Total Facturado Bs: Bs. ${rf.total_facturado_bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}\n`;
  summaryText += `• Total Tickets Emitidos: ${rf.total_tickets_emitidos}\n`;
  summaryText += `• Ticket Promedio: $ ${rf.ticket_promedio_usd.toLocaleString('es-VE', { minimumFractionDigits: 2 })}\n\n`;
  summaryText += `📦 INVENTARIO Y STOCK:\n`;
  summaryText += `• Total Referencias: ${rf.total_referencias_inventario}\n`;
  summaryText += `• Total Unidades en Stock: ${rf.total_unidades_mercancia}\n`;
  summaryText += `• Valor Inventario a Venta: $ ${rf.valor_inventario_venta_usd.toLocaleString('es-VE', { minimumFractionDigits: 2 })}\n`;
  summaryText += `• Valor Inventario a Costo: $ ${rf.valor_inventario_costo_usd.toLocaleString('es-VE', { minimumFractionDigits: 2 })}\n`;
  summaryText += `• Ganancia Proyectada: $ ${rf.margen_proyectado_stock_usd.toLocaleString('es-VE', { minimumFractionDigits: 2 })}\n\n`;
  summaryText += `📝 PRIMEROS 15 PRODUCTOS:\n`;
  
  (data.productos || []).slice(0, 15).forEach((p, idx) => {
    summaryText += `${idx + 1}. [${p.codigo}] ${p.nombre} | Stock: ${p.stock_total} | Precio: $${p.precio_usd}\n`;
  });
  if (data.productos.length > 15) {
    summaryText += `... y ${data.productos.length - 15} productos más en su archivo de respaldo completo.\n`;
  }

  await navigator.clipboard.writeText(summaryText);
  return summaryText;
};
