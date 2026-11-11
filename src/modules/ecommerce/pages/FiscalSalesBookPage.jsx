// ==============================================================================
// AXONMARKET — LIBRO DE VENTAS FISCALES SENIAT
// Portado desde AxonPOS con soporte para Ley de IVA, IGTF 3% y exportación contable
// ==============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileSpreadsheet, Download, Printer, Calendar, RefreshCw, 
  Search, Filter, Landmark, FileText, CheckCircle2, AlertCircle,
  TrendingUp, DollarSign, Percent, ShieldCheck, ArrowDownRight,
  ExternalLink, Layers, BookOpen
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import toast from 'react-hot-toast';
import FiscalSalesBookTutorialOverlay from '../components/fiscal/FiscalSalesBookTutorialOverlay';

export default function FiscalSalesBookPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [bcvRate, setBcvRate] = useState(894.89);
  const [storeProfile, setStoreProfile] = useState({
    name: 'Mi Comercio',
    rif: 'J-000000000',
    address: 'Venezuela'
  });

  // Guía Didáctica Fiscal SENIAT
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem('hasSeenFiscalBookTour');
    if (!hasSeen) {
      const timer = setTimeout(() => {
        setIsTutorialOpen(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  // Rango de fechas por defecto: Mes en curso
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const todayStr = now.toISOString().split('T')[0];

  const [dateFrom, setDateFrom] = useState(firstDayOfMonth);
  const [dateTo, setDateTo] = useState(todayStr);
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'FISCAL_ONLY' | 'DELIVERY_ONLY'
  const [searchQuery, setSearchQuery] = useState('');

  const workspaceId = localStorage.getItem('activeWorkspace');

  // Cargar datos de la tienda y pedidos
  const loadFiscalData = async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 1. Tasa BCV
      fetch('https://axonmarket-api.onrender.com/api/bcv')
        .then(r => r.json())
        .then(d => { if (d?.rate) setBcvRate(Number(d.rate)); })
        .catch(() => {});

      // 2. Datos del comercio (RIF, Nombre, Dirección)
      const { data: wsData } = await supabase
        .from('workspaces')
        .select('name, config')
        .eq('id', workspaceId)
        .maybeSingle();

      if (wsData) {
        const cfg = typeof wsData.config === 'object' ? (wsData.config || {}) : (() => {
          try { return JSON.parse(wsData.config || '{}'); } catch(e) { return {}; }
        })();

        setStoreProfile({
          name: wsData.name || cfg.businessName || 'Mi Comercio',
          rif: cfg.rif || cfg.taxId || 'J-50000000-0',
          address: cfg.address || cfg.contact?.address || 'Venezuela'
        });
      }

      // 3. Pedidos / Ventas del comercio
      const { data: ordersData, error: ordersErr } = await supabase
        .from('ecommerce_orders_v2')
        .select('id, total, status, paymentmethod, paymentdetails, date, workspace_id, items, order_type, customer')
        .eq('workspace_id', workspaceId)
        .neq('status', 'Cancelado')
        .order('date', { ascending: true });

      if (ordersErr) console.warn('Error cargando ventas fiscales:', ordersErr);
      setOrders(ordersData || []);

    } catch (e) {
      console.error('Error cargando libro SENIAT:', e);
      toast.error('Error al consultar datos fiscales.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiscalData();
  }, [workspaceId]);

  // Normalización y Desglose Impositivo Exacto de cada Venta (SENIAT)
  const normalizedSales = useMemo(() => {
    return orders.map((o, idx) => {
      const pd = typeof o.paymentdetails === 'string'
        ? (() => { try { return JSON.parse(o.paymentdetails); } catch(e) { return {}; } })()
        : (o.paymentdetails || {});

      const totalUsd = Number(o.total) || 0;
      const rate = Number(pd.bcvRate) || bcvRate || 1;
      const totalVes = Number(pd.totalVes) || (totalUsd * rate);

      const items = Array.isArray(o.items) && o.items.length > 0
        ? o.items
        : (Array.isArray(pd.items) ? pd.items : []);

      let exemptUsd = 0;
      let generalBaseUsd = 0;
      let reducedBaseUsd = 0;

      if (items.length > 0) {
        items.forEach(it => {
          const qty = Number(it.quantity) || 1;
          const unitPrice = Number(it.unitPriceUsd || it.price || it.unitPrice || 0);
          const lineTotal = qty * unitPrice;
          const taxType = String(it.taxType || it.tax_type || '').toUpperCase();

          if (taxType === 'GENERAL' || taxType === 'IVA_16' || taxType === '16%') {
            generalBaseUsd += lineTotal;
          } else if (taxType === 'REDUCED' || taxType === 'IVA_8' || taxType === '8%') {
            reducedBaseUsd += lineTotal;
          } else if (taxType === 'EXEMPT' || taxType === 'EXENTO') {
            exemptUsd += lineTotal;
          } else {
            // Por defecto en comercio detal venezolano: gravado general 16%
            generalBaseUsd += lineTotal;
          }
        });
      } else {
        // Si no hay items desglosados, se toma el subtotal general de la orden
        generalBaseUsd = totalUsd / 1.16;
      }

      const exemptVes = exemptUsd * rate;
      const generalBaseVes = generalBaseUsd * rate;
      const generalIvaVes = Number(pd.ivaVes) || (generalBaseVes * 0.16);
      const reducedBaseVes = reducedBaseUsd * rate;
      const reducedIvaVes = reducedBaseVes * 0.08;

      // Cálculo de IGTF en divisas (3%)
      let igtfBaseVes = 0;
      let igtfAmountVes = Number(pd.igtfAmountVes) || 0;
      let igtfAmountUsd = Number(pd.igtfAmountUsd) || 0;

      if (Array.isArray(pd.payments)) {
        pd.payments.forEach(p => {
          const m = String(p.method || '').toUpperCase();
          if (m.includes('CASH_USD') || m.includes('ZELLE') || m === 'EFECTIVO_USD') {
            const paid = Number(p.amountPaid) || 0;
            const vesEquiv = (p.currency === 'USD' ? paid * rate : paid);
            igtfBaseVes += vesEquiv;
          }
        });
        if (!igtfAmountVes && igtfBaseVes > 0) {
          igtfAmountVes = igtfBaseVes * 0.03;
          igtfAmountUsd = igtfAmountVes / rate;
        }
      }

      // Cliente
      let customerName = 'CONSUMIDOR FINAL';
      let customerDoc = 'V-00000000';
      if (typeof o.customer === 'object' && o.customer !== null) {
        customerName = o.customer.name || customerName;
        customerDoc = o.customer.docNumber ? `${o.customer.docType || 'V'}-${o.customer.docNumber}` : customerDoc;
      } else if (typeof pd.customer === 'object' && pd.customer !== null) {
        customerName = pd.customer.name || customerName;
        customerDoc = pd.customer.docNumber ? `${pd.customer.docType || 'V'}-${pd.customer.docNumber}` : customerDoc;
      } else if (typeof o.customer === 'string' && o.customer.trim()) {
        customerName = o.customer.trim();
      }

      const invoiceNumber = pd.invoiceNumber || `FAC-${String(idx + 1).padStart(6, '0')}`;
      const controlNumber = pd.controlNumber || pd.fiscalPrinterSerial || `00-${String(idx + 1).padStart(6, '0')}`;
      const documentType = pd.documentType || (o.order_type === 'pos' ? 'FISCAL_INVOICE' : 'DELIVERY_NOTE');
      const isVoided = o.status === 'Anulado' || o.status === 'Cancelado';

      return {
        id: o.id,
        operationNumber: idx + 1,
        date: o.date ? o.date.split('T')[0] : todayStr,
        fullDate: o.date || new Date().toISOString(),
        customerName,
        customerDoc,
        invoiceNumber,
        controlNumber,
        documentType,
        isVoided,
        totalUsd,
        totalVes,
        exemptVes,
        generalBaseVes,
        generalIvaVes,
        reducedBaseVes,
        reducedIvaVes,
        igtfBaseVes,
        igtfAmountVes,
        igtfAmountUsd,
        rate
      };
    });
  }, [orders, bcvRate]);

  // Filtrado por fecha, tipo de documento y búsqueda
  const filteredSales = useMemo(() => {
    return normalizedSales.filter(s => {
      const inDate = s.date >= dateFrom && s.date <= dateTo;
      if (!inDate) return false;

      if (filterType === 'FISCAL_ONLY' && s.documentType !== 'FISCAL_INVOICE') return false;
      if (filterType === 'DELIVERY_ONLY' && s.documentType !== 'DELIVERY_NOTE') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchInvoice = s.invoiceNumber.toLowerCase().includes(q);
        const matchCustomer = s.customerName.toLowerCase().includes(q) || s.customerDoc.toLowerCase().includes(q);
        if (!matchInvoice && !matchCustomer) return false;
      }

      return true;
    });
  }, [normalizedSales, dateFrom, dateTo, filterType, searchQuery]);

  // Totales Impositivos del Libro de Ventas (Formato SENIAT)
  const bookTotals = useMemo(() => {
    return filteredSales.reduce((acc, s) => {
      const sign = s.isVoided ? -1 : 1;
      acc.totalSalesVes += s.totalVes * sign;
      acc.totalSalesUsd += s.totalUsd * sign;
      acc.exemptVes += s.exemptVes * sign;
      acc.baseGeneralVes += s.generalBaseVes * sign;
      acc.ivaGeneralVes += s.generalIvaVes * sign;
      acc.baseReducedVes += s.reducedBaseVes * sign;
      acc.ivaReducedVes += s.reducedIvaVes * sign;
      acc.baseIgtfVes += s.igtfBaseVes * sign;
      acc.igtfAmountVes += s.igtfAmountVes * sign;
      acc.igtfAmountUsd += s.igtfAmountUsd * sign;

      if (s.isVoided) acc.voidedCount++;
      else acc.activeCount++;

      return acc;
    }, {
      totalSalesVes: 0,
      totalSalesUsd: 0,
      exemptVes: 0,
      baseGeneralVes: 0,
      ivaGeneralVes: 0,
      baseReducedVes: 0,
      ivaReducedVes: 0,
      baseIgtfVes: 0,
      igtfAmountVes: 0,
      igtfAmountUsd: 0,
      activeCount: 0,
      voidedCount: 0
    });
  }, [filteredSales]);

  // Exportar CSV oficial para Saint / Galac / Valery / Excel
  const handleExportCsv = () => {
    const headers = [
      'Operacion',
      'Fecha',
      'RIF/Cedula',
      'Razon Social',
      'Tipo Doc',
      'Nro Factura',
      'Nro Control',
      'Total Ventas Incluyendo IVA (Bs)',
      'Ventas Exentas (Bs)',
      'Base Imponible 16% (Bs)',
      'IVA 16% (Bs)',
      'Base Imponible 8% (Bs)',
      'IVA 8% (Bs)',
      'Base IGTF Divisas (Bs)',
      'IGTF 3% Percibido (Bs)',
      'Total Ref USD'
    ];

    const rows = filteredSales.map((s, index) => {
      const docType = s.documentType === 'FISCAL_INVOICE' ? 'Factura Fiscal' : 'Nota de Entrega';
      const sign = s.isVoided ? -1 : 1;

      return [
        index + 1,
        s.date,
        `"${s.customerDoc}"`,
        `"${s.customerName.replace(/"/g, '""')}"`,
        `"${docType}"`,
        `"${s.invoiceNumber}"`,
        `"${s.controlNumber}"`,
        (s.totalVes * sign).toFixed(2),
        (s.exemptVes * sign).toFixed(2),
        (s.generalBaseVes * sign).toFixed(2),
        (s.generalIvaVes * sign).toFixed(2),
        (s.reducedBaseVes * sign).toFixed(2),
        (s.reducedIvaVes * sign).toFixed(2),
        (s.igtfBaseVes * sign).toFixed(2),
        (s.igtfAmountVes * sign).toFixed(2),
        (s.totalUsd * sign).toFixed(2)
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Libro_Ventas_SENIAT_${storeProfile.name.replace(/\s+/g, '_')}_${dateFrom}_al_${dateTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Libro de Ventas SENIAT exportado en CSV/Excel.');
  };

  // Imprimir Reporte Formal en Formato Apaisado (Landscape SENIAT)
  const handlePrintSeniat = () => {
    const rowsHtml = filteredSales.map((s, index) => `
      <tr style="${s.isVoided ? 'color: #dc2626; text-decoration: line-through;' : ''}">
        <td style="text-align: center;">${index + 1}</td>
        <td style="text-align: center;">${s.date}</td>
        <td>${s.customerDoc}</td>
        <td>${s.customerName}</td>
        <td style="text-align: center;">${s.documentType === 'FISCAL_INVOICE' ? 'FAC' : 'N/E'}</td>
        <td style="font-weight: bold; text-align: center;">${s.invoiceNumber}</td>
        <td style="text-align: center;">${s.controlNumber}</td>
        <td style="text-align: right; font-weight: bold;">${s.totalVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: right;">${s.exemptVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: right;">${s.generalBaseVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: right; font-weight: bold;">${s.generalIvaVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: right;">${s.reducedBaseVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: right;">${s.reducedIvaVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: right;">${s.igtfBaseVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: right; font-weight: bold; color: #b45309;">${s.igtfAmountVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    const printWin = window.open('', '_blank');
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Libro de Ventas SENIAT - ${storeProfile.name}</title>
        <style>
          @page { size: landscape; margin: 8mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 8.5px; color: #111; line-height: 1.25; margin: 0; padding: 10px; }
          .header { text-align: center; margin-bottom: 12px; border-bottom: 2px solid #ea580c; padding-bottom: 8px; }
          .title { font-size: 14px; font-weight: 900; text-transform: uppercase; color: #111; }
          .subtitle { font-size: 10px; margin-top: 2px; color: #444; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border: 1px solid #cbd5e1; padding: 3px 5px; }
          th { background: #f8fafc; font-size: 8px; font-weight: 800; text-transform: uppercase; text-align: center; }
          .totals-table { width: 480px; margin-left: auto; margin-top: 15px; border: 2px solid #334155; }
          .totals-table td { padding: 4px 8px; font-size: 9.5px; }
          .totals-header { background: #ea580c; color: #fff; font-weight: 900; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${storeProfile.name}</div>
          <div class="subtitle">RIF: ${storeProfile.rif} · Dirección: ${storeProfile.address}</div>
          <div style="font-size: 11px; font-weight: 900; margin-top: 5px; color: #ea580c;">
            LIBRO DE VENTAS FISCAL (REGLAMENTO LEY DEL IVA & SENIAT)
          </div>
          <div style="font-size: 9px; color: #64748b; margin-top: 2px;">
            Período: Desde ${dateFrom} Hasta ${dateTo} · Tasa Oficial BCV: Bs. ${bcvRate.toFixed(2)} · Emisión: ${new Date().toLocaleString('es-VE')}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Oper.</th>
              <th>Fecha</th>
              <th>RIF / CI</th>
              <th>Nombre o Razón Social</th>
              <th>Tipo</th>
              <th>Nº Factura</th>
              <th>Nº Control</th>
              <th>Total Ventas c/IVA (Bs.)</th>
              <th>Ventas Exentas (Bs.)</th>
              <th>Base 16% (Bs.)</th>
              <th>IVA 16% (Bs.)</th>
              <th>Base 8% (Bs.)</th>
              <th>IVA 8% (Bs.)</th>
              <th>Base IGTF (Bs.)</th>
              <th>IGTF 3% (Bs.)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <table class="totals-table">
          <thead>
            <tr class="totals-header"><th colspan="2" style="color: #fff; padding: 5px;">RESUMEN IMPOSITIVO DEL PERÍODO (SENIAT)</th></tr>
          </thead>
          <tbody>
            <tr><td>Total Ventas Brutas Facturadas:</td><td style="text-align: right; font-weight: 900;">Bs. ${bookTotals.totalSalesVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} ($${bookTotals.totalSalesUsd.toFixed(2)})</td></tr>
            <tr><td>Total Ventas Exentas / Exoneradas:</td><td style="text-align: right;">Bs. ${bookTotals.exemptVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td></tr>
            <tr><td>Base Imponible Alícuota General (16%):</td><td style="text-align: right;">Bs. ${bookTotals.baseGeneralVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td></tr>
            <tr><td>Débito Fiscal IVA General (16%):</td><td style="text-align: right; font-weight: 900;">Bs. ${bookTotals.ivaGeneralVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td></tr>
            <tr><td>Base Imponible Alícuota Reducida (8%):</td><td style="text-align: right;">Bs. ${bookTotals.baseReducedVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td></tr>
            <tr><td>Débito Fiscal IVA Reducido (8%):</td><td style="text-align: right;">Bs. ${bookTotals.ivaReducedVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td></tr>
            <tr><td>Base Imponible IGTF Divisas:</td><td style="text-align: right;">Bs. ${bookTotals.baseIgtfVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td></tr>
            <tr><td>Total IGTF 3% Percibido:</td><td style="text-align: right; font-weight: 900; color: #b45309;">Bs. ${bookTotals.igtfAmountVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} ($${bookTotals.igtfAmountUsd.toFixed(2)})</td></tr>
            <tr style="background: #f1f5f9;"><td>Comprobantes Auditados:</td><td style="text-align: right; font-weight: bold;">${bookTotals.activeCount} válidos, ${bookTotals.voidedCount} anulados</td></tr>
          </tbody>
        </table>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 pb-28 md:pb-8 animate-in fade-in duration-200">
      
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div data-tour="tour-fiscal-header">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/25 shrink-0">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span>Libro de Ventas Fiscal SENIAT</span>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-500/30">
                    {storeProfile.name}
                  </span>
                </h2>
                <button
                  type="button"
                  onClick={() => setIsTutorialOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/20 text-orange-700 dark:text-orange-300 text-xs font-bold rounded-xl border border-orange-200 dark:border-orange-500/30 transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Abrir Guía Didáctica Fiscal SENIAT"
                >
                  <BookOpen size={14} className="text-orange-600 dark:text-orange-400" />
                  <span>Guía Didáctica</span>
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Cumplimiento de la Ley del IVA, IGTF 3%, facturación e informe contable oficial para SENIAT.
              </p>
            </div>
          </div>
        </div>

        <div data-tour="tour-fiscal-actions" className="flex items-center gap-2.5 flex-wrap">
          {/* Tasa BCV */}
          <div className="bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 shadow-2xs">
            <span className="text-slate-400">Tasa BCV:</span>
            <span className="font-mono text-orange-600 dark:text-orange-400 font-black">Bs. {bcvRate.toFixed(2)}</span>
          </div>

          {/* Exportar Excel/CSV */}
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            title="Exportar a Excel / CSV contable"
          >
            <Download size={14} />
            <span>Exportar CSV</span>
          </button>

          {/* Imprimir SENIAT */}
          <button
            onClick={handlePrintSeniat}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
            title="Imprimir Libro Oficial SENIAT"
          >
            <Printer size={14} className="text-orange-400 dark:text-orange-600" />
            <span>Imprimir SENIAT</span>
          </button>

          {/* Refrescar */}
          <button
            onClick={loadFiscalData}
            className="p-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold border border-slate-200 dark:border-slate-800 shadow-2xs"
            title="Actualizar datos"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-orange-500' : ''} />
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Rango de Fechas */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div data-tour="tour-fiscal-dates" className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Calendar size={14} className="text-orange-500" />
                <span>Desde:</span>
              </span>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Hasta:</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              />
            </div>
          </div>

          <div data-tour="tour-fiscal-filters" className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${filterType === 'ALL' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500'}`}
            >
              Todos ({normalizedSales.length})
            </button>
            <button
              onClick={() => setFilterType('FISCAL_ONLY')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${filterType === 'FISCAL_ONLY' ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-2xs' : 'text-slate-500'}`}
            >
              Solo Facturas
            </button>
            <button
              onClick={() => setFilterType('DELIVERY_ONLY')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${filterType === 'DELIVERY_ONLY' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs' : 'text-slate-500'}`}
            >
              Notas de Entrega
            </button>
          </div>
        </div>

        {/* Buscador de factura o cliente */}
        <div className="relative w-full sm:w-60">
          <input
            type="text"
            placeholder="Buscar por Nº o RIF..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40"
          />
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* Tarjetas KPI de Resumen Impositivo Oficial */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Facturado */}
        <div data-tour="tour-fiscal-kpi-sales" className="bg-gradient-to-br from-slate-900 via-zinc-900 to-black text-white p-5 rounded-3xl shadow-xl flex flex-col justify-between border border-white/10">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 block mb-1">
              Total Ventas Facturadas (c/ IVA)
            </span>
            <h3 className="text-2xl font-black font-mono tracking-tight">
              Bs. {bookTotals.totalSalesVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs font-mono font-bold text-amber-300 mt-1">
              ${bookTotals.totalSalesUsd.toFixed(2)} USD
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <span>Comprobantes:</span>
            <strong className="text-white font-mono">{filteredSales.length} emitidos</strong>
          </div>
        </div>

        {/* IVA 16% */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
              Débito Fiscal IVA 16%
            </span>
            <h3 className="text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
              Bs. {bookTotals.ivaGeneralVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <div className="text-[11px] font-mono text-slate-500 mt-1">
              Base Imponible: <strong className="font-bold text-slate-700 dark:text-slate-300">Bs. {bookTotals.baseGeneralVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>Alícuota general:</span>
            <strong className="text-emerald-600 font-bold">16% SENIAT</strong>
          </div>
        </div>

        {/* Ventas Exentas */}
        <div data-tour="tour-fiscal-kpi-igtf" className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
              Ventas Exentas / Exoneradas
            </span>
            <h3 className="text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
              Bs. {bookTotals.exemptVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <div className="text-[11px] font-mono text-slate-500 mt-1">
              Alimentos básicos y medicinas exentas
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>Tasa impositiva:</span>
            <strong className="text-blue-600 font-bold">0% Exento</strong>
          </div>
        </div>

        {/* IGTF 3% Divisas */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1">
              IGTF 3% Percibido en Divisas
            </span>
            <h3 className="text-2xl font-black font-mono tracking-tight text-amber-600 dark:text-amber-400">
              Bs. {bookTotals.igtfAmountVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <div className="text-[11px] font-mono text-slate-500 mt-1">
              ${bookTotals.igtfAmountUsd.toFixed(2)} USD percibidos
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>Base Divisas:</span>
            <strong className="text-slate-800 dark:text-slate-200 font-mono font-bold">Bs. {bookTotals.baseIgtfVes.toLocaleString('es-VE', { maximumFractionDigits: 0 })}</strong>
          </div>
        </div>
      </div>

      {/* Tabla Oficial de Operaciones del Libro de Ventas */}
      <div data-tour="tour-fiscal-table" className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Landmark size={18} className="text-orange-500" />
              <span>Detalle de Operaciones Gravadas, Exentas e IGTF</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Correlativo cronológico de facturas y notas de entrega del período fiscal seleccionado.
            </p>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20 w-fit">
            {filteredSales.length} registros cargados
          </span>
        </div>

        {filteredSales.length === 0 ? (
          <div className="py-14 text-center text-slate-500 text-xs">
            No se encontraron ventas para el período seleccionado ({dateFrom} al {dateTo}).
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-2 text-center">Nº</th>
                  <th className="py-3 px-2">Fecha</th>
                  <th className="py-3 px-2">RIF / CI</th>
                  <th className="py-3 px-3">Razón Social</th>
                  <th className="py-3 px-2 text-center">Doc</th>
                  <th className="py-3 px-2 text-center">Factura</th>
                  <th className="py-3 px-3 text-right">Total c/IVA (Bs.)</th>
                  <th className="py-3 px-2 text-right">Exento (Bs.)</th>
                  <th className="py-3 px-2 text-right">Base 16% (Bs.)</th>
                  <th className="py-3 px-2 text-right font-bold">IVA 16% (Bs.)</th>
                  <th className="py-3 px-2 text-right">Base IGTF</th>
                  <th className="py-3 px-2 text-right font-bold text-amber-600">IGTF 3%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                {filteredSales.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-2 text-center font-bold text-slate-400 font-sans">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-2 text-slate-500 whitespace-nowrap">
                      {s.date}
                    </td>
                    <td className="py-3 px-2 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {s.customerDoc}
                    </td>
                    <td className="py-3 px-3 font-sans font-bold text-slate-900 dark:text-white truncate max-w-[160px]">
                      {s.customerName}
                    </td>
                    <td className="py-3 px-2 text-center font-sans">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        s.documentType === 'FISCAL_INVOICE' 
                          ? 'bg-orange-50 text-orange-600 border border-orange-200/60' 
                          : 'bg-blue-50 text-blue-600 border border-blue-200/60'
                      }`}>
                        {s.documentType === 'FISCAL_INVOICE' ? 'FAC' : 'N/E'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center font-bold text-slate-900 dark:text-white">
                      {s.invoiceNumber}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white">
                      {s.totalVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-2 text-right text-slate-500">
                      {s.exemptVes > 0 ? s.exemptVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="py-3 px-2 text-right text-slate-700 dark:text-slate-300">
                      {s.generalBaseVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-2 text-right font-black text-emerald-600 dark:text-emerald-400">
                      {s.generalIvaVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-2 text-right text-slate-500">
                      {s.igtfBaseVes > 0 ? s.igtfBaseVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="py-3 px-2 text-right font-black text-amber-600 dark:text-amber-400">
                      {s.igtfAmountVes > 0 ? s.igtfAmountVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Guía Didáctica Oficial del Libro de Ventas Fiscal SENIAT */}
      <FiscalSalesBookTutorialOverlay
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />

    </div>
  );
}

