import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Printer, FileText, Download, Calendar, Building2, 
  CheckCircle2, DollarSign, Receipt, Copy, Share2, 
  Smartphone, ShieldCheck, ArrowRightLeft, Store, Scissors, RefreshCw
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
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Cargar órdenes y tasa oficial si no se pasan como props o al cambiar workspace
  useEffect(() => {
    if (!isOpen) return;

    if (workspaceId) {
      setIsLoadingOrders(true);
      supabase
        .from('ecommerce_orders_v2')
        .select('id, total, status, paymentmethod, paymentdetails, date, workspace_id, items, order_type, customer')
        .eq('workspace_id', workspaceId)
        .neq('status', 'Cancelado')
        .order('date', { ascending: true }) // Orden cronológico ascendente fundamental para SENIAT
        .then(({ data }) => {
          if (data) setInternalOrders(data);
        })
        .catch(console.error)
        .finally(() => setIsLoadingOrders(false));

      supabase
        .from('cash_shifts')
        .select('*')
        .eq('branch_id', workspaceId)
        .order('opened_at', { ascending: true })
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
  }, [isOpen, workspaceId]);

  const orders = propOrders.length > 0 ? propOrders : internalOrders;
  const shifts = propShifts.length > 0 ? propShifts : internalShifts;

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
  useEffect(() => {
    if (initialReportType) {
      setReportType(initialReportType);
    }
  }, [initialReportType]);

  // Filtrado de pedidos por fecha seleccionada y caja, con orden cronológico ascendente
  const dayOrders = useMemo(() => {
    const list = orders.filter(o => {
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

    // Orden cronológico estricto ascendente (de la primera venta a la última de la jornada)
    return [...list].sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
  }, [orders, selectedDate, selectedRegisterId]);

  // Turnos del día seleccionado
  const dayShifts = useMemo(() => {
    return shifts.filter(s => {
      if (!s.opened_at) return false;
      const shiftDate = s.opened_at.slice(0, 10);
      return shiftDate === selectedDate;
    });
  }, [shifts, selectedDate]);

  // Determinación de la Tasa BCV Oficial:
  // Si la jornada es "Hoy", se toma la tasa oficial del día en vivo.
  // Si la jornada es una fecha histórica (ej: 09/11/2026), se toma la tasa BCV efectiva registrada en las facturas de ese día.
  const effectiveFiscalRate = useMemo(() => {
    if (selectedDate === todayStr) {
      return Number(liveBcvRate) || Number(propBcvRate) || 901.62;
    }

    // Fecha histórica: buscar tasas registradas en las ventas de ese día
    const recordedRates = dayOrders
      .map(o => {
        const pd = typeof o.paymentdetails === 'string'
          ? (() => { try { return JSON.parse(o.paymentdetails); } catch(e) { return {}; } })()
          : (o.paymentdetails || {});
        const r = Number(pd.bcvRate) || (Number(pd.totalVes) && Number(o.total) ? Number(pd.totalVes) / Number(o.total) : null);
        return r && r > 0 ? r : null;
      })
      .filter(Boolean);

    if (recordedRates.length > 0) {
      // Tomar la tasa de la jornada registrada en las operaciones
      return recordedRates[0];
    }

    return Number(liveBcvRate) || Number(propBcvRate) || 901.62;
  }, [selectedDate, todayStr, dayOrders, liveBcvRate, propBcvRate]);

  // Cálculos Fiscales SENIAT (Providencia SNAT/2018/0141 y Ley de Reforma del IGTF)
  const fiscalStats = useMemo(() => {
    const rate = Number(effectiveFiscalRate) || 1;

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
    let fiscalInvoiceCount = dayOrders.length;

    // Helper para extraer número de factura limpio y correlativo
    const getInvoiceStr = (order, index) => {
      const pd = typeof order.paymentdetails === 'string'
        ? (() => { try { return JSON.parse(order.paymentdetails); } catch(e) { return {}; } })()
        : (order.paymentdetails || {});

      if (pd.invoiceNumber && pd.invoiceNumber.trim()) {
        return pd.invoiceNumber.trim();
      }
      if (pd.controlNumber && pd.controlNumber.trim()) {
        return pd.controlNumber.trim();
      }
      return `FAC-${String(index + 1).padStart(6, '0')}`;
    };

    if (dayOrders.length > 0) {
      firstInvoiceNum = getInvoiceStr(dayOrders[0], 0);
      lastInvoiceNum = getInvoiceStr(dayOrders[dayOrders.length - 1], dayOrders.length - 1);
    } else {
      firstInvoiceNum = '000000';
      lastInvoiceNum = '000000';
    }

    dayOrders.forEach((o, index) => {
      const orderUsd = Number(o.total) || 0;
      const pd = typeof o.paymentdetails === 'string'
        ? (() => { try { return JSON.parse(o.paymentdetails); } catch(e) { return {}; } })()
        : (o.paymentdetails || {});

      const orderRate = Number(pd.bcvRate) || rate;
      const orderVes = Number(pd.totalVes) || (orderUsd * orderRate);

      totalSalesUsd += orderUsd;
      totalSalesVes += orderVes;

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
        // En ausencia de items desglosados, se toma base gravada general
        generalBaseUsd += (orderUsd / 1.16);
      }

      // Pagos y recaudación (IGTF 3% aplica a divisas en efectivo, Zelle, etc.)
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

    // Consecutivo legal estimado de Z o X basado en la fecha
    const daysSinceEpoch = Math.floor(new Date(selectedDate).getTime() / (1000 * 60 * 60 * 24));
    const reportSequence = String((daysSinceEpoch % 9000) + 100).padStart(4, '0');

    return {
      rate,
      isHistorical: selectedDate !== todayStr,
      totalSalesUsd,
      totalSalesVes,
      fiscalInvoiceCount,
      firstInvoiceNum,
      lastInvoiceNum,
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
  }, [dayOrders, dayShifts, effectiveFiscalRate, selectedDate, todayStr]);

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
          body { font-family: 'Courier New', Courier, monospace; font-size: 11pt; color: #111; line-height: 1.35; padding: 25px; }
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
          <div>FECHA JORNADA: <b>${selectedDate}</b> · TASA BCV APLICADA: <b>Bs. ${fiscalStats.rate.toFixed(2)}</b></div>
          <div>HORA DE EMISIÓN: <b>${new Date().toLocaleTimeString()}</b></div>
        </div>

        <table>
          <tr class="border-b"><td colspan="2" class="bold text-center">RANGO DE COMPROBANTES FISCALES</td></tr>
          <tr><td>FACTURAS EMITIDAS:</td><td class="text-right bold">${fiscalStats.fiscalInvoiceCount} operaciones</td></tr>
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
            <td>TOTAL VENTAS FACTURADAS:</td>
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
          <br/>Emitido por Sistema Certificado AxonMarket Cloud POS · Providencia SNAT/2018/0141
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
            <div class="subtitle">SERIAL FISCAL: ${storeInfo.fiscalSerial}</div>
            <div class="double-divider"></div>
            <div class="badge">*** REPORTE ${reportTitle} ***</div>
            <div class="bold">COMPROBANTE #${reportCode}</div>
            <div class="subtitle">FECHA JORNADA: ${selectedDate} | HORA: ${new Date().toLocaleTimeString()}</div>
            <div class="subtitle bold">TASA BCV APLICADA: Bs. ${fiscalStats.rate.toFixed(2)}</div>
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
            <span>TOTAL FACTURADO:</span>
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
            AxonMarket Fiscal System · Providencia SNAT/2018/0141
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
      `📅 Fecha Jornada: ${selectedDate} | Reporte: #${reportCode}\n` +
      `💵 Tasa BCV Aplicada: Bs. ${fiscalStats.rate.toFixed(2)} ${fiscalStats.isHistorical ? '(Jornada)' : '(Hoy)'}\n\n` +
      `🧾 *FACTURACIÓN:*\n` +
      `• Facturas emitidas: ${fiscalStats.fiscalInvoiceCount}\n` +
      `• Rango: ${fiscalStats.firstInvoiceNum} al ${fiscalStats.lastInvoiceNum}\n` +
      `• Total Ventas: Bs. ${fiscalStats.totalSalesVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} (Ref $ ${fiscalStats.totalSalesUsd.toFixed(2)})\n\n` +
      `🏛️ *SENIAT IVA & IGTF:*\n` +
      `• Exento: Bs. ${fiscalStats.exemptVes.toFixed(2)}\n` +
      `• Base 16%: Bs. ${fiscalStats.generalBaseVes.toFixed(2)} | IVA 16%: Bs. ${fiscalStats.generalIvaVes.toFixed(2)}\n` +
      `• IGTF 3% Divisas: Bs. ${fiscalStats.igtfAmountVes.toFixed(2)}\n\n` +
      `💰 *INGRESOS POR MEDIO:*\n` +
      `• Efectivo USD: $ ${fiscalStats.breakdown.cashUsd.toFixed(2)}\n` +
      `• Efectivo Bs: Bs. ${fiscalStats.breakdown.cashVes.toFixed(2)}\n` +
      `• Pago Móvil: Bs. ${fiscalStats.breakdown.pagoMovilVes.toFixed(2)}\n` +
      `• Punto de Venta: Bs. ${fiscalStats.breakdown.posVes.toFixed(2)}\n` +
      `• Zelle: $ ${fiscalStats.breakdown.zelleUsd.toFixed(2)}\n\n` +
      `_AxonMarket Fiscal Cloud - Providencia SNAT/2018/0141_`;

    navigator.clipboard.writeText(text)
      .then(() => toast.success('¡Reporte copiado para enviar por WhatsApp!'))
      .catch(() => toast.error('No se pudo copiar el texto'));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      
      {/* Contenedor Principal: Papel Blanco Continuo de Punta a Punta */}
      <div className="bg-white dark:bg-zinc-950 w-full max-w-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Cabecera del Modal */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/90 dark:bg-zinc-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md ${
              isZ 
                ? 'bg-gradient-to-tr from-rose-600 to-red-500 shadow-rose-500/25' 
                : 'bg-gradient-to-tr from-orange-500 to-amber-500 shadow-orange-500/25'
            }`}>
              <Receipt size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  isZ ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
                }`}>
                  SENIAT OFICIAL
                </span>
                <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                  #{reportCode}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                {reportTitle}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={17} />
          </button>
        </div>

        {/* Barra de Filtro de Fecha y Conmutador X / Z */}
        <div className="px-5 py-2.5 sm:px-6 bg-slate-50/50 dark:bg-zinc-900/50 border-b border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {/* Selector de Tipo: X o Z */}
          <div className="flex items-center bg-slate-200/70 dark:bg-white/10 p-0.5 rounded-xl">
            <button
              onClick={() => setReportType('X')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                !isZ 
                  ? 'bg-orange-500 text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Corte X (Parcial)
            </button>
            <button
              onClick={() => setReportType('Z')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                isZ 
                  ? 'bg-rose-600 text-white shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Cierre Z (Definitivo)
            </button>
          </div>

          {/* Selector de Fecha */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <Calendar size={13} className="text-orange-500" />
              <span>Día:</span>
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-2xs"
            />
            {selectedDate !== todayStr && (
              <button
                onClick={() => setSelectedDate(todayStr)}
                className="text-[11px] font-black text-orange-600 dark:text-orange-400 hover:underline cursor-pointer px-1 py-0.5"
              >
                Hoy
              </button>
            )}
          </div>
        </div>

        {/* ========================================================
            CUERPO DEL MODAL: PAPEL CONTINUO TÉRMICO HASTA EL FONDO
            (Sin márgenes grises que corten por la mitad)
            ======================================================== */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-zinc-950 p-4 sm:p-6 custom-scrollbar">
          <div className="w-full max-w-md mx-auto font-mono text-xs text-slate-800 dark:text-slate-200 space-y-3.5">
            
            {/* Encabezado Fiscal de Máquina Autorizada */}
            <div className="text-center space-y-1 pb-3 border-b-2 border-dashed border-slate-300 dark:border-zinc-700">
              <h4 className="font-black text-sm uppercase tracking-wide text-slate-900 dark:text-white">
                {storeInfo.name}
              </h4>
              <p className="text-[10.5px] text-slate-600 dark:text-slate-400 font-medium">{storeInfo.legalName}</p>
              <p className="text-[11px] font-black text-slate-800 dark:text-zinc-200">RIF: {storeInfo.rif}</p>
              <p className="text-[10px] text-slate-500">{storeInfo.address}</p>
              <p className="text-[10px] text-slate-400 font-bold">SERIAL FISCAL: {storeInfo.fiscalSerial}</p>
              
              <div className="pt-2">
                <span className={`inline-block px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider text-white shadow-xs ${
                  isZ ? 'bg-rose-600' : 'bg-orange-500'
                }`}>
                  *** REPORTE {reportTitle} ***
                </span>
              </div>
              <p className="text-xs font-black text-slate-900 dark:text-white mt-1">COMPROBANTE #{reportCode}</p>
              
              <div className="flex justify-between text-[10.5px] text-slate-500 pt-1 border-t border-slate-100 dark:border-white/5 mt-1.5">
                <span>FECHA: <b>{selectedDate}</b></span>
                <span>HORA: <b>{new Date().toLocaleTimeString()}</b></span>
              </div>

              {/* Tasa BCV Oficial Específica del Día */}
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 rounded-lg py-1 px-2.5 mt-1.5 flex items-center justify-between text-[11px]">
                <span className="text-amber-800 dark:text-amber-300 font-bold">
                  {fiscalStats.isHistorical ? 'TASA BCV APLICADA (JORNADA):' : 'TASA BCV OFICIAL (HOY):'}
                </span>
                <span className="font-black text-amber-700 dark:text-amber-300">
                  Bs. {fiscalStats.rate.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Rango de Facturación Cronológica */}
            <div className="py-2 border-b border-dashed border-slate-300 dark:border-zinc-700 space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center">
                <span>FACTURAS EMITIDAS:</span>
                <span className="font-black text-sm text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded">
                  {fiscalStats.fiscalInvoiceCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span>PRIMERA FACTURA:</span>
                <span className="font-bold text-slate-800 dark:text-zinc-200">{fiscalStats.firstInvoiceNum}</span>
              </div>
              <div className="flex justify-between">
                <span>ÚLTIMA FACTURA:</span>
                <span className="font-bold text-slate-800 dark:text-zinc-200">{fiscalStats.lastInvoiceNum}</span>
              </div>
            </div>

            {/* Desglose Impositivo SENIAT */}
            <div className="py-2 border-b border-dashed border-slate-300 dark:border-zinc-700 space-y-1.5 text-[11px]">
              <p className="font-black text-center text-[10px] uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100 dark:border-white/5">
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
              <div className="flex justify-between font-black text-slate-900 dark:text-white">
                <span>IMPUESTO IVA (16%):</span>
                <span>Bs. {fiscalStats.generalIvaVes.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>BASE IMP. (R 8%):</span>
                <span>Bs. {fiscalStats.reducedBaseVes.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black text-slate-900 dark:text-white">
                <span>IMPUESTO IVA (8%):</span>
                <span>Bs. {fiscalStats.reducedIvaVes.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>BASE IGTF DIVISAS (3%):</span>
                <span>Bs. {fiscalStats.igtfBaseVes.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black text-amber-600 dark:text-amber-400">
                <span>IGTF PERCIBIDO (3%):</span>
                <span>Bs. {fiscalStats.igtfAmountVes.toFixed(2)}</span>
              </div>

              {/* Total Facturado en Bs y Ref USD */}
              <div className="pt-2.5 border-t-2 border-slate-300 dark:border-zinc-700 space-y-1">
                <div className="flex justify-between items-center text-xs font-black text-slate-900 dark:text-white">
                  <span>TOTAL FACTURADO (Bs):</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    Bs. {fiscalStats.totalSalesVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-bold text-slate-500">
                  <span>TOTAL EQUIVALENTE USD:</span>
                  <span className="text-slate-900 dark:text-white font-mono font-bold">
                    $ {fiscalStats.totalSalesUsd.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Medios de Pago Recibidos */}
            <div className="py-2 border-b border-dashed border-slate-300 dark:border-zinc-700 space-y-1.5 text-[11px]">
              <p className="font-black text-center text-[10px] uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-100 dark:border-white/5">
                RECAUDACIÓN POR MÉTODO DE PAGO
              </p>
              <div className="flex justify-between">
                <span>Efectivo Divisas ($):</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">$ {fiscalStats.breakdown.cashUsd.toFixed(2)}</span>
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

            {/* Pie Legal SENIAT */}
            <div className="text-center pt-2 space-y-1 text-[9.5px] text-slate-500 dark:text-slate-400">
              <p className="font-black text-slate-800 dark:text-slate-200">
                {isZ 
                  ? '*** CIERRE DIARIO DEFINITIVO SENIAT ***' 
                  : '*** CORTE X PARCIAL - JORNADA FISCAL ACTIVA ***'}
              </p>
              <p>{isZ ? 'MEMORIA FISCAL REGISTRADA Y ALMACENADA' : 'NO ALTERA ACUMULADORES DE MEMORIA FISCAL'}</p>
              <p className="text-[9px]">AxonMarket Fiscal System · Providencia SNAT/2018/0141</p>
            </div>

            {/* Troquelado Final de Rollo Térmico Continuo (Llega hasta el fondo) */}
            <div className="pt-4 pb-2 text-center text-slate-300 dark:text-zinc-700 select-none">
              <p className="tracking-widest text-[11px]">- - - - - - - - - - - - - - - - - - - - - - - -</p>
              <div className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mt-1">
                <Scissors size={11} />
                <span>CORTE DE PAPEL · FIN DE REPORTE</span>
              </div>
            </div>

          </div>
        </div>

        {/* ========================================================
            BARRA INFERIOR DE ACCIONES (Anclada limpiamente sin tapar)
            ======================================================== */}
        <div className="px-5 py-3 sm:px-6 bg-slate-50/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyWhatsApp}
              className="px-3.5 py-2.5 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
              title="Copiar texto formateado para WhatsApp"
            >
              <Copy size={14} />
              <span>WhatsApp</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Descargar en Word (.doc) */}
            <button
              onClick={handleDownloadWord}
              className="px-3.5 py-2.5 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
              title="Descargar reporte formal en Word"
            >
              <FileText size={14} />
              <span>Descargar Word (.doc)</span>
            </button>

            {/* Imprimir o Guardar en PDF */}
            <button
              onClick={handlePrintOrPdf}
              className={`px-4 sm:px-5 py-2.5 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer ${
                isZ 
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25' 
                  : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/25'
              }`}
              title="Imprimir ticket o guardar en PDF"
            >
              <Printer size={15} />
              <span>Imprimir / PDF</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
