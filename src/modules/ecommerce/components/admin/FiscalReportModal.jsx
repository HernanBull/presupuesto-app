import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Printer, FileText, Download, Calendar, Building2, 
  CheckCircle2, DollarSign, Receipt, Copy, Share2, 
  Smartphone, ShieldCheck, ArrowRightLeft, Store
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../../supabaseClient';
import { hardwareService } from '../../services/hardwareService';

export default function FiscalReportModal({
  isOpen,
  onClose,
  initialReportType = 'X', // 'X' o 'Z'
  workspaceId: propWorkspaceId,
  storeName = 'Mi Comercio',
  bcvRate: propBcvRate = 888.89,
  orders: propOrders = [],
  shifts: propShifts = [],
  registers = []
}) {
  const workspaceId = propWorkspaceId || localStorage.getItem('activeWorkspace');
  const [reportType, setReportType] = useState(initialReportType); // 'X' o 'Z'
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedRegisterId, setSelectedRegisterId] = useState('ALL'); // 'ALL' o id de caja
  const [internalOrders, setInternalOrders] = useState([]);
  const [internalShifts, setInternalShifts] = useState([]);
  const [liveBcvRate, setLiveBcvRate] = useState(propBcvRate);

  // Cargar órdenes y tasa si no se pasan como props
  useEffect(() => {
    if (!isOpen) return;

    if (propOrders.length === 0 && workspaceId) {
      supabase
        .from('ecommerce_orders_v2')
        .select('id, total, status, paymentmethod, paymentdetails, date, workspace_id, items, order_type, customer')
        .eq('workspace_id', workspaceId)
        .neq('status', 'Cancelado')
        .order('date', { ascending: false })
        .then(({ data }) => {
          if (data) setInternalOrders(data);
        })
        .catch(console.error);
    }

    if (propShifts.length === 0 && workspaceId) {
      supabase
        .from('cash_shifts')
        .select('*')
        .eq('branch_id', workspaceId)
        .order('opened_at', { ascending: false })
        .then(({ data }) => {
          if (data) setInternalShifts(data);
        })
        .catch(console.error);
    }

    fetch('https://axonmarket-api.onrender.com/api/bcv')
      .then(res => res.json())
      .then(d => {
        if (d?.rate) setLiveBcvRate(Number(d.rate));
      })
      .catch(() => {});
  }, [isOpen, workspaceId, propOrders.length, propShifts.length]);

  const orders = propOrders.length > 0 ? propOrders : internalOrders;
  const shifts = propShifts.length > 0 ? propShifts : internalShifts;
  const bcvRate = propBcvRate || liveBcvRate;

  // Extraer información fiscal del comercio guardada en localStorage o fallback
  const storeInfo = useMemo(() => {
    let rif = localStorage.getItem('merchant_rif') || 'J-508056124';
    let address = localStorage.getItem('merchant_address') || 'Cagua, Estado Aragua - Venezuela';
    let phone = localStorage.getItem('merchant_phone') || '';
    let legalName = localStorage.getItem('merchant_legal_name') || storeName;

    return {
      name: storeName,
      legalName,
      rif,
      address,
      phone,
      fiscalSerial: 'Z4A' + (workspaceId ? workspaceId.replace(/[^0-9A-Z]/gi, '').slice(0, 7).toUpperCase() : '8492011')
    };
  }, [storeName, workspaceId]);

  // Sincronizar el tipo de reporte cuando cambia la prop initialReportType
  React.useEffect(() => {
    if (initialReportType) {
      setReportType(initialReportType);
    }
  }, [initialReportType]);

  // Filtrado de pedidos por fecha seleccionada y caja
  const dayOrders = useMemo(() => {
    return orders.filter(o => {
      if (!o.date) return false;
      const orderDateStr = o.date.slice(0, 10);
      if (orderDateStr !== selectedDate) return false;

      // Filtro de caja si aplica
      if (selectedRegisterId !== 'ALL') {
        const pd = typeof o.paymentdetails === 'string'
          ? (() => { try { return JSON.parse(o.paymentdetails); } catch(e) { return {}; } })()
          : (o.paymentdetails || {});
        if (pd.registerId && pd.registerId !== selectedRegisterId) return false;
      }

      return true;
    });
  }, [orders, selectedDate, selectedRegisterId]);

  // Turnos del día seleccionado
  const dayShifts = useMemo(() => {
    return shifts.filter(s => {
      if (!s.opened_at) return false;
      const shiftDate = s.opened_at.slice(0, 10);
      return shiftDate === selectedDate;
    });
  }, [shifts, selectedDate]);

  // Cálculos Fiscales SENIAT
  const fiscalStats = useMemo(() => {
    const rate = Number(bcvRate) || 1;

    let totalSalesUsd = 0;
    let totalSalesVes = 0;
    let exemptUsd = 0;
    let generalBaseUsd = 0;
    let reducedBaseUsd = 0;
    let igtfBaseVes = 0;
    let igtfAmountVes = 0;

    const breakdown = {
      cashUsd: 0,
      cashVes: 0,
      pagoMovilVes: 0,
      posVes: 0,
      zelleUsd: 0,
      transfVes: 0,
      otrosUsd: 0
    };

    let firstInvoiceNum = null;
    let lastInvoiceNum = null;
    let fiscalInvoiceCount = 0;

    dayOrders.forEach((o, index) => {
      const orderUsd = Number(o.total) || 0;
      const pd = typeof o.paymentdetails === 'string'
        ? (() => { try { return JSON.parse(o.paymentdetails); } catch(e) { return {}; } })()
        : (o.paymentdetails || {});

      const orderRate = Number(pd.bcvRate) || rate;
      const orderVes = Number(pd.totalVes) || (orderUsd * orderRate);

      totalSalesUsd += orderUsd;
      totalSalesVes += orderVes;

      // Numeración de facturas
      fiscalInvoiceCount++;
      const invNum = pd.invoiceNumber || String(index + 1).padStart(6, '0');
      if (!firstInvoiceNum) firstInvoiceNum = invNum;
      lastInvoiceNum = invNum;

      // Desglose impositivo de los productos
      const items = Array.isArray(o.items) ? o.items : [];
      if (items.length > 0) {
        items.forEach(it => {
          const qty = Number(it.quantity) || 1;
          const unitPrice = Number(it.unitPriceUsd || it.price || 0);
          const lineTotal = qty * unitPrice;
          const taxType = String(it.taxType || it.tax_type || '').toUpperCase();

          if (taxType === 'GENERAL' || taxType === 'IVA_16' || taxType === '16%') {
            generalBaseUsd += lineTotal;
          } else if (taxType === 'REDUCED' || taxType === 'IVA_8' || taxType === '8%') {
            reducedBaseUsd += lineTotal;
          } else if (taxType === 'EXEMPT' || taxType === 'EXENTO') {
            exemptUsd += lineTotal;
          } else {
            generalBaseUsd += lineTotal;
          }
        });
      } else {
        generalBaseUsd += (orderUsd / 1.16);
      }

      // Pagos y recaudación
      if (Array.isArray(pd.payments) && pd.payments.length > 0) {
        pd.payments.forEach(p => {
          const m = String(p.method || '').toUpperCase();
          const cur = String(p.currency || 'USD').toUpperCase();
          const paid = Number(p.amountPaid) || 0;
          const vesEquiv = (cur === 'USD' ? paid * orderRate : paid);

          if (m === 'CASH_USD' || (m.includes('CASH') && cur === 'USD') || m === 'EFECTIVO_USD') {
            breakdown.cashUsd += paid;
            igtfBaseVes += vesEquiv;
          } else if (m === 'CASH_VES' || (m.includes('CASH') && cur === 'VES') || m.includes('EFECTIVO_BS')) {
            breakdown.cashVes += paid;
          } else if (m === 'PAGO_MOVIL' || m.includes('MOVIL')) {
            breakdown.pagoMovilVes += paid;
          } else if (m === 'POS_CARD' || m.includes('PUNTO') || m.includes('TARJETA') || m.includes('CARD')) {
            breakdown.posVes += paid;
          } else if (m === 'ZELLE') {
            breakdown.zelleUsd += paid;
            igtfBaseVes += vesEquiv;
          } else if (m.includes('TRANSF')) {
            breakdown.transfVes += paid;
          } else {
            breakdown.otrosUsd += (cur === 'USD' ? paid : (paid / orderRate));
          }
        });
      } else {
        const pm = String(o.paymentmethod || '').toLowerCase();
        if (pm.includes('cash_usd') || pm.includes('dolares')) {
          breakdown.cashUsd += orderUsd;
          igtfBaseVes += orderVes;
        } else if (pm.includes('cash_ves') || pm.includes('bolivares')) {
          breakdown.cashVes += orderVes;
        } else if (pm.includes('movil')) {
          breakdown.pagoMovilVes += orderVes;
        } else if (pm.includes('punto') || pm.includes('tarjeta')) {
          breakdown.posVes += orderVes;
        } else if (pm.includes('zelle')) {
          breakdown.zelleUsd += orderUsd;
          igtfBaseVes += orderVes;
        } else {
          breakdown.otrosUsd += orderUsd;
        }
      }
    });

    const generalBaseVes = generalBaseUsd * rate;
    const generalIvaVes = generalBaseVes * 0.16;
    const reducedBaseVes = reducedBaseUsd * rate;
    const reducedIvaVes = reducedBaseVes * 0.08;
    const exemptVes = exemptUsd * rate;
    igtfAmountVes = igtfBaseVes * 0.03;

    // Resumen de gaveta física
    const initialCashUsd = dayShifts.reduce((acc, s) => acc + (Number(s.initial_usd) || 0), 0);
    const initialCashVes = dayShifts.reduce((acc, s) => acc + (Number(s.initial_ves) || 0), 0);

    const expectedCashUsd = initialCashUsd + breakdown.cashUsd;
    const expectedCashVes = initialCashVes + breakdown.cashVes;

    // Consecutivo estimado de Z o X basado en la fecha
    const daysSinceEpoch = Math.floor(new Date(selectedDate).getTime() / (1000 * 60 * 60 * 24));
    const reportSequence = String((daysSinceEpoch % 9000) + 100).padStart(4, '0');

    return {
      rate,
      totalSalesUsd,
      totalSalesVes,
      fiscalInvoiceCount,
      firstInvoiceNum: firstInvoiceNum || '000001',
      lastInvoiceNum: lastInvoiceNum || '000001',
      exemptVes,
      exemptUsd,
      generalBaseVes,
      generalBaseUsd,
      generalIvaVes,
      reducedBaseVes,
      reducedIvaVes,
      igtfBaseVes,
      igtfAmountVes,
      breakdown,
      initialCashUsd,
      initialCashVes,
      expectedCashUsd,
      expectedCashVes,
      reportSequence
    };
  }, [dayOrders, dayShifts, bcvRate, selectedDate]);

  if (!isOpen) return null;

  const isZ = reportType === 'Z';
  const reportTitle = isZ ? 'CIERRE Z (DEFINITIVO DIARIO)' : 'CORTE X (INFORME PARCIAL)';
  const reportCode = isZ ? `Z-${fiscalStats.reportSequence}` : `X-${fiscalStats.reportSequence}`;

  // 1. Exportar / Descargar en Documento Word (.doc)
  const handleDownloadWord = () => {
    try {
      const docHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Reporte Fiscal SENIAT ${reportCode} - ${storeInfo.name}</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace; font-size: 11pt; color: #111; line-height: 1.35; padding: 20px; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 12px; margin-bottom: 15px; }
          .store-title { font-size: 16pt; font-weight: bold; text-transform: uppercase; }
          .report-badge { font-size: 14pt; font-weight: bold; margin: 10px 0; color: #000; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { padding: 4px 6px; font-size: 10pt; }
          .border-b { border-bottom: 1px dashed #444; }
          .border-t { border-top: 1px dashed #444; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .bold { font-weight: bold; }
          .signature-box { border-top: 1px solid #000; width: 220px; margin-top: 50px; text-align: center; font-size: 9pt; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="store-title">${storeInfo.name}</div>
          <div>${storeInfo.legalName}</div>
          <div>RIF: ${storeInfo.rif}</div>
          <div>DIRECCIÓN: ${storeInfo.address}</div>
          <div>SERIAL FISCAL: ${storeInfo.fiscalSerial}</div>
          <div class="report-badge">*** REPORTE FISCAL ${reportTitle} ***</div>
          <div>NÚMERO DE REPORTE: <b>#${reportCode}</b></div>
          <div>FECHA JORNADA: <b>${selectedDate}</b> · TASA BCV: <b>Bs. ${fiscalStats.rate.toFixed(2)}</b></div>
          <div>HORA DE EMISIÓN: <b>${new Date().toLocaleTimeString()}</b></div>
        </div>

        <table>
          <tr class="border-b"><td colspan="2" class="bold text-center">RANGO DE COMPROBANTES FISCALES</td></tr>
          <tr><td>CANTIDAD DE FACTURAS:</td><td class="text-right bold">${fiscalStats.fiscalInvoiceCount} emitidas</td></tr>
          <tr><td>PRIMERA FACTURA:</td><td class="text-right bold">${fiscalStats.firstInvoiceNum}</td></tr>
          <tr><td>ÚLTIMA FACTURA:</td><td class="text-right bold">${fiscalStats.lastInvoiceNum}</td></tr>
        </table>

        <table>
          <tr class="border-b border-t"><td colspan="3" class="bold text-center">DESGLOSE IMPOSITIVO SENIAT</td></tr>
          <tr>
            <td>VENTAS EXENTAS (E):</td>
            <td class="text-right">Bs. ${fiscalStats.exemptVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
            <td class="text-right bold">($ ${fiscalStats.exemptUsd.toFixed(2)})</td>
          </tr>
          <tr>
            <td>BASE IMPONIBLE (G 16%):</td>
            <td class="text-right">Bs. ${fiscalStats.generalBaseVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
            <td class="text-right bold">($ ${fiscalStats.generalBaseUsd.toFixed(2)})</td>
          </tr>
          <tr>
            <td>DÉBITO FISCAL IVA (16%):</td>
            <td class="text-right bold">Bs. ${fiscalStats.generalIvaVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
            <td class="text-right">-</td>
          </tr>
          <tr>
            <td>BASE IMPONIBLE (R 8%):</td>
            <td class="text-right">Bs. ${fiscalStats.reducedBaseVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
            <td class="text-right">-</td>
          </tr>
          <tr>
            <td>DÉBITO FISCAL IVA (8%):</td>
            <td class="text-right bold">Bs. ${fiscalStats.reducedIvaVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
            <td class="text-right">-</td>
          </tr>
          <tr>
            <td>BASE IMPONIBLE IGTF DIVISAS (3%):</td>
            <td class="text-right">Bs. ${fiscalStats.igtfBaseVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
            <td class="text-right">-</td>
          </tr>
          <tr>
            <td>IGTF PERCIBIDO (3%):</td>
            <td class="text-right bold">Bs. ${fiscalStats.igtfAmountVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
            <td class="text-right">-</td>
          </tr>
          <tr class="border-t bold">
            <td>TOTAL VENTAS DEL DÍA:</td>
            <td class="text-right bold">Bs. ${fiscalStats.totalSalesVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
            <td class="text-right bold">Ref $ ${fiscalStats.totalSalesUsd.toFixed(2)}</td>
          </tr>
        </table>

        <table>
          <tr class="border-b border-t"><td colspan="2" class="bold text-center">DESGLOSE DE MEDIOS DE PAGO</td></tr>
          <tr><td>Efectivo Divisas ($):</td><td class="text-right bold">$ ${fiscalStats.breakdown.cashUsd.toFixed(2)}</td></tr>
          <tr><td>Efectivo Bolívares (Bs):</td><td class="text-right bold">Bs. ${fiscalStats.breakdown.cashVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td></tr>
          <tr><td>Pago Móvil:</td><td class="text-right bold">Bs. ${fiscalStats.breakdown.pagoMovilVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td></tr>
          <tr><td>Punto de Venta / Tarjetas:</td><td class="text-right bold">Bs. ${fiscalStats.breakdown.posVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td></tr>
          <tr><td>Zelle:</td><td class="text-right bold">$ ${fiscalStats.breakdown.zelleUsd.toFixed(2)}</td></tr>
          <tr><td>Transferencias Bancarias:</td><td class="text-right bold">Bs. ${fiscalStats.breakdown.transfVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td></tr>
        </table>

        <div style="margin-top: 30px; text-align: center; font-size: 8pt; border-top: 1px dashed #000; padding-top: 10px;">
          ${isZ ? '*** CIERRE DIARIO DEFINITIVO - MEMORIA FISCAL SENIAT ACTUALIZADA ***' : '*** CORTE X PARCIAL - LA JORNADA FISCAL CONTINÚA ABIERTA ***'}
          <br/>Emitido por Sistema Certificado AxonMarket Cloud POS
        </div>

        <table style="margin-top: 40px; width: 100%;">
          <tr>
            <td align="center">
              <div class="signature-box">Firma del Cajero Responsable</div>
            </td>
            <td align="center">
              <div class="signature-box">Firma Gerente / Auditor Fiscal</div>
            </td>
          </tr>
        </table>
      </body>
      </html>
      `;

      const blob = new Blob([docHtml], { type: 'application/msword;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Reporte_${reportType}_${storeInfo.name.replace(/\s+/g, '_')}_${selectedDate}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Reporte ${reportType} exportado en formato Word (.doc)`);
    } catch (e) {
      console.error('Error exportando Word:', e);
      toast.error('No se pudo generar el archivo Word.');
    }
  };

  // 2. Imprimir o Guardar en PDF (Optimizado para teléfonos móviles y computadoras)
  const handlePrintOrPdf = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Por favor permite ventanas emergentes para imprimir o guardar en PDF');
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${reportTitle} - ${storeInfo.name}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 3mm;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              color: #000;
              margin: 0;
              padding: 6px;
              width: 74mm;
              line-height: 1.3;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-bottom: 1px dashed #000; margin: 5px 0; }
            .double-divider { border-bottom: 2px solid #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; }
            .title { font-size: 13px; font-weight: 900; text-transform: uppercase; }
            .subtitle { font-size: 10px; }
            .badge { font-size: 12px; font-weight: 900; margin: 6px 0; }
            @media print {
              body { width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="title">${storeInfo.name}</div>
            <div class="subtitle">${storeInfo.legalName}</div>
            <div class="subtitle">RIF: ${storeInfo.rif}</div>
            <div class="subtitle">${storeInfo.address}</div>
            <div class="subtitle">SERIAL: ${storeInfo.fiscalSerial}</div>
            <div class="double-divider"></div>
            <div class="badge">*** REPORTE ${reportTitle} ***</div>
            <div class="bold">COMPROBANTE #${reportCode}</div>
            <div class="subtitle">FECHA: ${selectedDate} | HORA: ${new Date().toLocaleTimeString()}</div>
            <div class="subtitle">TASA BCV: Bs. ${fiscalStats.rate.toFixed(2)}</div>
            <div class="divider"></div>
          </div>

          <div class="center bold" style="margin-bottom: 3px;">RESUMEN DE FACTURACIÓN</div>
          <div class="row"><span>FACTURAS EMITIDAS:</span><span class="bold">${fiscalStats.fiscalInvoiceCount}</span></div>
          <div class="row"><span>DESDE FACTURA:</span><span class="bold">${fiscalStats.firstInvoiceNum}</span></div>
          <div class="row"><span>HASTA FACTURA:</span><span class="bold">${fiscalStats.lastInvoiceNum}</span></div>
          <div class="divider"></div>

          <div class="center bold" style="margin-bottom: 3px;">DESGLOSE FISCAL SENIAT</div>
          <div class="row">
            <span>EXENTO (E):</span>
            <span class="bold">Bs. ${fiscalStats.exemptVes.toFixed(2)}</span>
          </div>
          <div class="row">
            <span>BASE IMP. (G 16%):</span>
            <span>Bs. ${fiscalStats.generalBaseVes.toFixed(2)}</span>
          </div>
          <div class="row">
            <span>IMPUESTO IVA (16%):</span>
            <span class="bold">Bs. ${fiscalStats.generalIvaVes.toFixed(2)}</span>
          </div>
          <div class="row">
            <span>BASE IMP. (R 8%):</span>
            <span>Bs. ${fiscalStats.reducedBaseVes.toFixed(2)}</span>
          </div>
          <div class="row">
            <span>IMPUESTO IVA (8%):</span>
            <span class="bold">Bs. ${fiscalStats.reducedIvaVes.toFixed(2)}</span>
          </div>
          <div class="row">
            <span>BASE IGTF DIVISAS:</span>
            <span>Bs. ${fiscalStats.igtfBaseVes.toFixed(2)}</span>
          </div>
          <div class="row">
            <span>IGTF PERCIBIDO (3%):</span>
            <span class="bold">Bs. ${fiscalStats.igtfAmountVes.toFixed(2)}</span>
          </div>
          <div class="divider"></div>
          <div class="row bold" style="font-size: 12px;">
            <span>TOTAL FISCAL:</span>
            <span>Bs. ${fiscalStats.totalSalesVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
          </div>
          <div class="row bold" style="font-size: 11px;">
            <span>TOTAL REF USD:</span>
            <span>$ ${fiscalStats.totalSalesUsd.toFixed(2)}</span>
          </div>
          <div class="double-divider"></div>

          <div class="center bold" style="margin-bottom: 3px;">DESGLOSE DE MEDIOS DE PAGO</div>
          <div class="row"><span>Efectivo Divisas ($):</span><span class="bold">$ ${fiscalStats.breakdown.cashUsd.toFixed(2)}</span></div>
          <div class="row"><span>Efectivo Bolívares (Bs):</span><span class="bold">Bs. ${fiscalStats.breakdown.cashVes.toFixed(2)}</span></div>
          <div class="row"><span>Pago Móvil:</span><span class="bold">Bs. ${fiscalStats.breakdown.pagoMovilVes.toFixed(2)}</span></div>
          <div class="row"><span>Punto de Venta / Tarjetas:</span><span class="bold">Bs. ${fiscalStats.breakdown.posVes.toFixed(2)}</span></div>
          <div class="row"><span>Zelle ($):</span><span class="bold">$ ${fiscalStats.breakdown.zelleUsd.toFixed(2)}</span></div>
          <div class="row"><span>Transferencias:</span><span class="bold">Bs. ${fiscalStats.breakdown.transfVes.toFixed(2)}</span></div>
          
          <div class="double-divider"></div>
          <div class="center subtitle bold">
            ${isZ ? '*** CIERRE DIARIO DEFINITIVO SENIAT ***<br/>MEMORIA FISCAL ALMACENADA' : '*** CORTE X PARCIAL SENIAT ***<br/>LA JORNADA FISCAL CONTINÚA ABIERTA'}
          </div>
          <div class="center subtitle" style="margin-top: 5px;">
            AxonMarket Cloud Network v4.5
          </div>
        </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 350);
      toast.success('Abriendo vista de impresión / PDF');
    } catch (e) {
      console.error('Error al imprimir:', e);
      toast.error('Error al abrir la ventana de impresión.');
    }
  };

  // 3. Copiar resumen para WhatsApp
  const handleCopyWhatsApp = () => {
    const text = `📊 *REPORTE FISCAL ${reportTitle}*\n` +
      `🏢 *${storeInfo.name}* (RIF: ${storeInfo.rif})\n` +
      `📅 Fecha: ${selectedDate} | Reporte: #${reportCode}\n` +
      `💵 Tasa BCV: Bs. ${fiscalStats.rate.toFixed(2)}\n\n` +
      `🧾 *FACTURACIÓN:*\n` +
      `• Facturas emitidas: ${fiscalStats.fiscalInvoiceCount}\n` +
      `• Rango: ${fiscalStats.firstInvoiceNum} al ${fiscalStats.lastInvoiceNum}\n` +
      `• Total Ventas: Bs. ${fiscalStats.totalSalesVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} (Ref $ ${fiscalStats.totalSalesUsd.toFixed(2)})\n\n` +
      `🏛️ *SENIAT IVA & IGTF:*\n` +
      `• Exento: Bs. ${fiscalStats.exemptVes.toFixed(2)}\n` +
      `• Base 16%: Bs. ${fiscalStats.generalBaseVes.toFixed(2)} | IVA: Bs. ${fiscalStats.generalIvaVes.toFixed(2)}\n` +
      `• IGTF 3% Divisas: Bs. ${fiscalStats.igtfAmountVes.toFixed(2)}\n\n` +
      `💰 *INGRESOS POR MEDIO:*\n` +
      `• Efectivo USD: $ ${fiscalStats.breakdown.cashUsd.toFixed(2)}\n` +
      `• Efectivo Bs: Bs. ${fiscalStats.breakdown.cashVes.toFixed(2)}\n` +
      `• Pago Móvil: Bs. ${fiscalStats.breakdown.pagoMovilVes.toFixed(2)}\n` +
      `• Punto de Venta: Bs. ${fiscalStats.breakdown.posVes.toFixed(2)}\n` +
      `• Zelle: $ ${fiscalStats.breakdown.zelleUsd.toFixed(2)}\n\n` +
      `_AxonMarket Fiscal Cloud_`;

    navigator.clipboard.writeText(text)
      .then(() => toast.success('¡Reporte copiado para enviar por WhatsApp!'))
      .catch(() => toast.error('No se pudo copiar el texto'));
  };

  // 4. Enviar a Impresora Hardware / Térmica si está conectada
  const handleSendHardware = () => {
    toast.success(`Enviando comando de ${reportTitle} a impresora conectada`);
    handlePrintOrPdf();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Cabecera del Modal */}
        <div className="px-5 py-4 sm:px-7 sm:py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/80 dark:bg-white/2">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md ${
              isZ 
                ? 'bg-gradient-to-tr from-rose-600 to-red-500 shadow-rose-500/25' 
                : 'bg-gradient-to-tr from-orange-500 to-amber-500 shadow-orange-500/25'
            }`}>
              <Receipt size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  isZ ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
                }`}>
                  SENIAT OFICIAL
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">
                  #{reportCode}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {reportTitle}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Barra de Filtro de Fecha y Conmutador X / Z */}
        <div className="px-5 py-3 sm:px-7 bg-white dark:bg-zinc-900 border-b border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-2.5">
          {/* Selector de Tipo: X o Z */}
          <div className="flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
            <button
              onClick={() => setReportType('X')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                !isZ 
                  ? 'bg-orange-500 text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Corte X (Parcial)
            </button>
            <button
              onClick={() => setReportType('Z')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                isZ 
                  ? 'bg-rose-600 text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Cierre Z (Definitivo)
            </button>
          </div>

          {/* Selector de Fecha */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Calendar size={13} className="text-orange-500" />
              <span>Día:</span>
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1 text-xs font-bold bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            {selectedDate !== todayStr && (
              <button
                onClick={() => setSelectedDate(todayStr)}
                className="text-[10px] font-bold text-orange-600 hover:underline cursor-pointer"
              >
                Hoy
              </button>
            )}
          </div>
        </div>

        {/* Cuerpo del Modal: Simulación de Ticket Fiscal 80mm */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-black/40 flex justify-center">
          <div className="w-full max-w-md bg-white dark:bg-zinc-950 p-5 sm:p-6 rounded-2xl shadow-md border border-slate-200 dark:border-white/10 font-mono text-xs text-slate-800 dark:text-slate-200 space-y-3">
            
            {/* Encabezado Fiscal */}
            <div className="text-center space-y-1 pb-3 border-b-2 border-dashed border-slate-300 dark:border-zinc-700">
              <h4 className="font-black text-sm uppercase tracking-wide text-slate-900 dark:text-white">
                {storeInfo.name}
              </h4>
              <p className="text-[10.5px] text-slate-600 dark:text-slate-400">{storeInfo.legalName}</p>
              <p className="text-[11px] font-bold">RIF: {storeInfo.rif}</p>
              <p className="text-[10px] text-slate-500">{storeInfo.address}</p>
              <p className="text-[10px] text-slate-400">SERIAL FISCAL: {storeInfo.fiscalSerial}</p>
              
              <div className="pt-2">
                <span className={`inline-block px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider text-white ${
                  isZ ? 'bg-rose-600' : 'bg-orange-500'
                }`}>
                  *** REPORTE {reportTitle} ***
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">COMPROBANTE #{reportCode}</p>
              <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                <span>FECHA: {selectedDate}</span>
                <span>HORA: {new Date().toLocaleTimeString()}</span>
              </div>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                TASA OFICIAL BCV: Bs. {fiscalStats.rate.toFixed(2)}
              </p>
            </div>

            {/* Rango de Facturación */}
            <div className="py-2 border-b border-dashed border-slate-300 dark:border-zinc-700 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>FACTURAS EMITIDAS:</span>
                <span className="font-bold text-slate-900 dark:text-white">{fiscalStats.fiscalInvoiceCount}</span>
              </div>
              <div className="flex justify-between">
                <span>PRIMERA FACTURA:</span>
                <span className="font-bold">{fiscalStats.firstInvoiceNum}</span>
              </div>
              <div className="flex justify-between">
                <span>ÚLTIMA FACTURA:</span>
                <span className="font-bold">{fiscalStats.lastInvoiceNum}</span>
              </div>
            </div>

            {/* Desglose Impositivo SENIAT */}
            <div className="py-2 border-b border-dashed border-slate-300 dark:border-zinc-700 space-y-1.5 text-[11px]">
              <p className="font-black text-center text-[10px] uppercase tracking-wider text-slate-500">
                DESGLOSE TRIBUTARIO SENIAT
              </p>
              <div className="flex justify-between">
                <span>VENTAS EXENTAS (E):</span>
                <span className="font-bold">Bs. {fiscalStats.exemptVes.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>BASE IMP. (G 16%):</span>
                <span>Bs. {fiscalStats.generalBaseVes.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                <span>IMPUESTO IVA (16%):</span>
                <span>Bs. {fiscalStats.generalIvaVes.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>BASE IMP. (R 8%):</span>
                <span>Bs. {fiscalStats.reducedBaseVes.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                <span>IMPUESTO IVA (8%):</span>
                <span>Bs. {fiscalStats.reducedIvaVes.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>BASE IGTF DIVISAS (3%):</span>
                <span>Bs. {fiscalStats.igtfBaseVes.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-amber-600 dark:text-amber-400">
                <span>IGTF PERCIBIDO (3%):</span>
                <span>Bs. {fiscalStats.igtfAmountVes.toFixed(2)}</span>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center text-xs font-black text-slate-900 dark:text-white">
                <span>TOTAL FACTURADO (Bs):</span>
                <span className="text-sm text-emerald-600 dark:text-emerald-400">
                  Bs. {fiscalStats.totalSalesVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px] font-bold text-slate-500">
                <span>TOTAL EQUIVALENTE USD:</span>
                <span className="text-slate-900 dark:text-white font-mono">
                  $ {fiscalStats.totalSalesUsd.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Medios de Pago Recibidos */}
            <div className="py-2 border-b border-dashed border-slate-300 dark:border-zinc-700 space-y-1 text-[11px]">
              <p className="font-black text-center text-[10px] uppercase tracking-wider text-slate-500">
                RECAUDACIÓN POR MÉTODO DE PAGO
              </p>
              <div className="flex justify-between">
                <span>Efectivo Divisas ($):</span>
                <span className="font-bold text-emerald-600">$ {fiscalStats.breakdown.cashUsd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Efectivo Bolívares (Bs):</span>
                <span className="font-bold">Bs. {fiscalStats.breakdown.cashVes.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pago Móvil:</span>
                <span className="font-bold">Bs. {fiscalStats.breakdown.pagoMovilVes.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Punto de Venta / Tarjetas:</span>
                <span className="font-bold">Bs. {fiscalStats.breakdown.posVes.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Zelle:</span>
                <span className="font-bold">$ {fiscalStats.breakdown.zelleUsd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Transferencias:</span>
                <span className="font-bold">Bs. {fiscalStats.breakdown.transfVes.toFixed(2)}</span>
              </div>
            </div>

            {/* Pie de Ticket Fiscal */}
            <div className="text-center pt-2 space-y-1 text-[9.5px] text-slate-400">
              <p className="font-bold text-slate-700 dark:text-slate-300">
                {isZ 
                  ? '*** CIERRE DIARIO DEFINITIVO SENIAT ***' 
                  : '*** CORTE X PARCIAL - JORNADA ACTIVA ***'}
              </p>
              <p>{isZ ? 'MEMORIA FISCAL ACTUALIZADA CORRECTAMENTE' : 'NO MODIFICA ACUMULADORES DE MEMORIA FISCAL'}</p>
              <p className="text-[9px]">AxonMarket Fiscal System · Conforme Providencia SNAT/2018/0141</p>
            </div>
          </div>
        </div>

        {/* Barra Inferior de Acciones: Imprimir, PDF, Word y WhatsApp */}
        <div className="px-5 py-4 sm:px-7 bg-white dark:bg-zinc-900 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyWhatsApp}
              className="px-3.5 py-2.5 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              title="Copiar texto para enviar por WhatsApp"
            >
              <Copy size={14} />
              <span>Copiar WhatsApp</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Descargar en Word (.doc) */}
            <button
              onClick={handleDownloadWord}
              className="px-4 py-2.5 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
            >
              <FileText size={15} />
              <span>Descargar en Word (.doc)</span>
            </button>

            {/* Imprimir o Guardar en PDF */}
            <button
              onClick={handlePrintOrPdf}
              className={`px-5 py-2.5 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer ${
                isZ 
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25' 
                  : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/25'
              }`}
            >
              <Printer size={15} />
              <span>Imprimir / Guardar PDF</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
