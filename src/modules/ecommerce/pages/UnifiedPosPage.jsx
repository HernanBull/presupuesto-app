import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Search, ShoppingCart, DollarSign, CreditCard, 
  Trash2, Plus, Minus, User, Printer, 
  ArrowLeft, ArrowUpRight, ArrowDownRight, BookOpen, X, Check, Scan,
  ChevronDown, ChevronUp, LayoutGrid, List, SlidersHorizontal,
  Info, Settings, PlusCircle, Tag, ShoppingBag,
  Store, AlertCircle, RefreshCw, FileText, Receipt,
  Wifi, WifiOff, Smartphone, Landmark, Eye, EyeOff, Package,
  Wallet, Users, Database, ShieldCheck
} from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import toast from 'react-hot-toast';
import { offlineSyncManager, offlineDb } from '../services/offlineSyncService';
import { hardwareService } from '../services/hardwareService';
import OrdersManager from './OrdersManager';
import { VisualProductCard } from '../components/catalog/VisualProductCard';
import { HierarchicalCategoryBar } from '../components/catalog/HierarchicalCategoryBar';
import { SubcategorySidebar } from '../components/catalog/SubcategorySidebar';
import { AXON_PRODUCTS, AXON_CATEGORIES } from '../data/axonCatalogData';
import { CameraScannerModal } from '../components/catalog/CameraScannerModal';
import CashShiftModal from '../components/admin/CashShiftModal';
import UserManagementModal from '../components/admin/UserManagementModal';
import BackupManagerModal from '../components/admin/BackupManagerModal';
import { authService } from '../services/authService';

export default function UnifiedPosPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromLocation = () => {
    const searchParams = new URLSearchParams(location.search);
    const view = searchParams.get('view');
    if (view === 'orders') return 'orders';
    if (view === 'shifts' || location.pathname === '/shifts') return 'shifts';
    if (view === 'credits' || location.pathname === '/credits') return 'credits';
    if (view === 'invoicing' || location.pathname === '/invoicing') return 'invoicing';
    return 'pos';
  };

  const [activeTab, setActiveTab] = useState(getTabFromLocation);
  const [isCartOpen, setIsCartOpen] = useState(true);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  
  // Modales Administrativos Críticos (AxonPOS ➔ AxonMarket)
  const [isCashShiftModalOpen, setIsCashShiftModalOpen] = useState(
    location.pathname === '/shifts' || new URLSearchParams(location.search).get('view') === 'shifts'
  );
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Atajo de teclado global F9 para Control de Caja y Turnos (Estilo AxonPOS)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F9') {
        e.preventDefault();
        setIsCashShiftModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Consulta de pedidos pendientes en línea (AxonMarket)
  useEffect(() => {
    const fetchPendingOrders = async () => {
      try {
        const workspaceId = localStorage.getItem('activeWorkspace') || 'default_workspace';
        const { count, error } = await supabase
          .from('ecommerce_orders_v2')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId)
          .in('status', ['Pendiente', 'Preparando']);
        
        if (!error && typeof count === 'number') {
          setPendingOrdersCount(count);
        }
      } catch (e) {
        console.warn('Error consultando pedidos pendientes:', e);
      }
    };

    fetchPendingOrders();
    const interval = setInterval(fetchPendingOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setActiveTab(getTabFromLocation());
  }, [location.pathname, location.search]);
  
  // Terminal POS State & Catálogo Oficial AxonPOS
  const [products, setProducts] = useState(AXON_PRODUCTS);
  const [categories, setCategories] = useState(AXON_CATEGORIES);
  const [selectedMainCategory, setSelectedMainCategory] = useState('ALL');
  const [selectedSubcategory, setSelectedSubcategory] = useState('ALL');
  const [sortBy, setSortBy] = useState('name');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [cart, setCart] = useState([]);
  const [bcvRate, setBcvRate] = useState(888.89);
  const [tariffTier, setTariffTier] = useState('detal'); // 'detal' | 'mayor'
  const [discountPercent, setDiscountPercent] = useState(0);
  const [showDiscountPicker, setShowDiscountPicker] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteText, setNoteText] = useState('');
  
  const [selectedCustomer, setSelectedCustomer] = useState('Consumidor Final');
  const [selectedPriceList, setSelectedPriceList] = useState('Sin lista de prec...');
  const [priceMultiplier, setPriceMultiplier] = useState(1.0);
  const [viewMode, setViewMode] = useState('grid');

  // Mapa reactivo de cantidades en carrito por producto
  const cartQuantityMap = useMemo(() => {
    const map = {};
    cart.forEach(ci => {
      map[ci.id] = (map[ci.id] || 0) + ci.quantity;
    });
    return map;
  }, [cart]);

  // Categorías principales (Nivel 1)
  const mainCategories = useMemo(() => {
    return categories.filter(c => !c.parentId || c.level === 'main');
  }, [categories]);

  // Subcategorías activas (Nivel 2)
  const activeSubcategories = useMemo(() => {
    if (selectedMainCategory === 'ALL') {
      return categories.filter(c => c.level === 'sub');
    }
    return categories.filter(c => c.parentId === selectedMainCategory && c.level === 'sub');
  }, [categories, selectedMainCategory]);

  // Conteo de productos por categoría principal
  const mainCategoryCounts = useMemo(() => {
    const counts = {};
    mainCategories.forEach(mCat => {
      const subIds = categories.filter(c => c.parentId === mCat.id).map(c => c.id);
      counts[mCat.id] = products.filter(p => p.categoryId === mCat.id || (p.subcategoryId && subIds.includes(p.subcategoryId))).length;
    });
    return counts;
  }, [mainCategories, categories, products]);

  // Conteo de productos por subcategoría
  const subcategoryCounts = useMemo(() => {
    const counts = {};
    activeSubcategories.forEach(sCat => {
      counts[sCat.id] = products.filter(p => p.subcategoryId === sCat.id).length;
    });
    return counts;
  }, [activeSubcategories, products]);

  // Filtrado y ordenamiento visual de productos
  const visualFilteredProducts = useMemo(() => {
    let list = [...products];

    // Filtro por categoría principal
    if (selectedMainCategory !== 'ALL') {
      const subIds = categories.filter(c => c.parentId === selectedMainCategory).map(c => c.id);
      list = list.filter(p => p.categoryId === selectedMainCategory || (p.subcategoryId && subIds.includes(p.subcategoryId)));
    }

    // Filtro por subcategoría lateral
    if (selectedSubcategory !== 'ALL') {
      list = list.filter(p => p.subcategoryId === selectedSubcategory);
    }

    // Búsqueda por texto (SKU, nombre, código de barras)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p => 
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.barcode && String(p.barcode).toLowerCase().includes(q)) ||
        (p.sku && String(p.sku).toLowerCase().includes(q)) ||
        (p.batch_number && String(p.batch_number).toLowerCase().includes(q)) ||
        (p.id && String(p.id).toLowerCase().includes(q)) ||
        (p.metadata?.sku && String(p.metadata.sku).toLowerCase().includes(q)) ||
        (p.metadata?.barcode && String(p.metadata.barcode).toLowerCase().includes(q))
      );
    }

    // Ordenamiento
    if (sortBy === 'price_asc') {
      list.sort((a, b) => (Number(a.priceUsd ?? a.price ?? 0)) - (Number(b.priceUsd ?? b.price ?? 0)));
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => (Number(b.priceUsd ?? b.price ?? 0)) - (Number(a.priceUsd ?? a.price ?? 0)));
    } else {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return list;
  }, [products, categories, selectedMainCategory, selectedSubcategory, searchQuery, sortBy]);
  
  // Checkout & Liquidación Multimoneda
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [documentType, setDocumentType] = useState('DELIVERY_NOTE'); // 'DELIVERY_NOTE' | 'FISCAL_INVOICE'
  const [selectedMethod, setSelectedMethod] = useState('CASH_USD');
  const [tenderAmount, setTenderAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [payments, setPayments] = useState([]);
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  
  const [isFreeItemModalOpen, setIsFreeItemModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isPriceListModalOpen, setIsPriceListModalOpen] = useState(false);
  const [isHardwareModalOpen, setIsHardwareModalOpen] = useState(false);
  
  const [freeItemName, setFreeItemName] = useState('');
  const [freeItemPrice, setFreeItemPrice] = useState('');
  
  // Customer Selector & New Customer Form
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerList, setCustomerList] = useState([
    { id: 'cf', name: 'Consumidor Final', doc: 'V-00000000', phone: '-' },
    { id: 'c1', name: 'María Fernández', doc: 'V-18.421.902', phone: '0414-1234567' },
    { id: 'c2', name: 'Distribuidora Los Andes', doc: 'J-40918231-1', phone: '0424-9876543' },
    { id: 'c3', name: 'Pedro Castillo', doc: 'V-12.981.332', phone: '0412-5556677' },
  ]);
  const [newCustName, setNewCustName] = useState('');
  const [newCustDoc, setNewCustDoc] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // Hardware Config
  const [hardwareConfig, setHardwareConfig] = useState({
    printerSize: '80mm',
    scaleConnected: true,
    scaleWeight: '0.000',
    scaleUnit: 'Kg',
    autoDrawer: true
  });

  // Offline & Dexie Persistence State (Fase 5)
  const [isOnline, setIsOnline] = useState(offlineSyncManager.effectiveOnline);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(offlineSyncManager.simulatedOffline);
  const [pendingSalesCount, setPendingSalesCount] = useState(0);

  useEffect(() => {
    const updateOfflineState = async () => {
      setIsOnline(offlineSyncManager.effectiveOnline);
      setIsSimulatedOffline(offlineSyncManager.simulatedOffline);
      const pending = await offlineSyncManager.getPendingSales();
      setPendingSalesCount(pending.length);
    };

    updateOfflineState();
    const unsubOffline = offlineSyncManager.subscribe(updateOfflineState);
    const unsubScale = hardwareService.subscribeScale((reading) => {
      setHardwareConfig(prev => ({
        ...prev,
        scaleWeight: reading.weight.toFixed(3),
        scaleUnit: reading.unit.toUpperCase()
      }));
    });

    return () => {
      unsubOffline();
      unsubScale();
    };
  }, []);

  // Sonido de Beep tipo lector láser / balanza
  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch(e) {}
  };
  
  const [paymentEntries, setPaymentEntries] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('CASH_USD');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [completedSale, setCompletedSale] = useState(null);
  const searchInputRef = useRef(null);

  // Cash Shift & Arqueo State (Fase 3)
  const [activeShift, setActiveShift] = useState({
    id: 'SHIFT-20261101-01',
    cashier: 'Carlos (Administrador)',
    openedAt: '08:30 AM · Hoy',
    initialCashUsd: 50.00,
    initialCashVes: 1500.00,
    salesCount: 14,
    totalSalesUsd: 384.50,
    totalSalesVes: 25184.75,
    cashSalesUsd: 140.00,
    cashSalesVes: 4500.00,
    electronicSalesUsd: 244.50,
    status: 'ABIERTO'
  });

  const [shiftMovements, setShiftMovements] = useState([
    { id: 'mov-1', type: 'ENTRY', concept: 'Cambio de billetes sencillo', amount: 20.00, currency: 'USD', time: '09:15 AM' },
    { id: 'mov-2', type: 'EXIT', concept: 'Compra de bolsas y consumibles', amount: 8.50, currency: 'USD', time: '11:40 AM' },
    { id: 'mov-3', type: 'EXIT', concept: 'Pago servicio de hielo', amount: 350.00, currency: 'VES', time: '01:20 PM' }
  ]);

  const [pastShifts, setPastShifts] = useState([
    { id: 'SHIFT-20261030-02', cashier: 'María Gómez', openedAt: 'Ayer 02:00 PM', closedAt: 'Ayer 09:30 PM', totalSalesUsd: 520.80, differenceUsd: 0.00, status: 'CERRADO' },
    { id: 'SHIFT-20261030-01', cashier: 'Carlos (Admin)', openedAt: 'Ayer 08:00 AM', closedAt: 'Ayer 02:00 PM', totalSalesUsd: 412.30, differenceUsd: -1.50, status: 'CERRADO' }
  ]);

  // Modales de Caja (Fase 3)
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isCorteXModalOpen, setIsCorteXModalOpen] = useState(false);
  const [isCierreZModalOpen, setIsCierreZModalOpen] = useState(false);
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState(false);
  const [completedZReport, setCompletedZReport] = useState(null);

  // Inputs para movimientos y turnos
  const [movConcept, setMovConcept] = useState('');
  const [movAmount, setMovAmount] = useState('');
  const [movCurrency, setMovCurrency] = useState('USD');

  // Arqueo Ciego
  const [blindCashUsd, setBlindCashUsd] = useState('');
  const [blindCashVes, setBlindCashVes] = useState('');
  const [blindSubmitted, setBlindSubmitted] = useState(false);

  // Apertura de turno
  const [openCashier, setOpenCashier] = useState('Carlos (Administrador)');
  const [openInitUsd, setOpenInitUsd] = useState('50.00');
  const [openInitVes, setOpenInitVes] = useState('1500.00');

  // Credit Accounts State (Fase 4 - Libro de Fiados)
  const [credits, setCredits] = useState([
    { id: 'cred-1', customer: 'María Fernández', doc: 'V-18.421.902', phone: '04141234567', totalDebt: 45.00, remaining: 25.00, dueDate: '2026-11-05', status: 'PENDIENTE', concept: 'Víveres y embutidos' },
    { id: 'cred-2', customer: 'Distribuidora Los Andes', doc: 'J-40918231-1', phone: '04249876543', totalDebt: 180.00, remaining: 180.00, dueDate: '2026-11-02', status: 'VENCIDO', concept: 'Cajas de aceite y arroz' },
    { id: 'cred-3', customer: 'Pedro Castillo', doc: 'V-12.981.332', phone: '04125556677', totalDebt: 30.00, remaining: 0.00, dueDate: '2026-10-28', status: 'PAGADO', concept: 'Café y azúcar' },
  ]);

  const [isNewCreditModalOpen, setIsNewCreditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCreditForPayment, setSelectedCreditForPayment] = useState(null);
  const [creditPaymentAmount, setCreditPaymentAmount] = useState('');
  const [creditPaymentMethod, setCreditPaymentMethod] = useState('CASH_USD');

  // Nuevo Crédito Inputs
  const [newCreditCust, setNewCreditCust] = useState('María Fernández');
  const [newCreditDoc, setNewCreditDoc] = useState('V-18.421.902');
  const [newCreditPhone, setNewCreditPhone] = useState('04141234567');
  const [newCreditAmount, setNewCreditAmount] = useState('');
  const [newCreditConcept, setNewCreditConcept] = useState('');
  const [newCreditDueDate, setNewCreditDueDate] = useState('2026-11-15');

  // Facturación y Documentos Fiscales (Fase 4 - /invoicing)
  const [invoices, setInvoices] = useState([
    { id: 'FAC-000182', type: 'FACTURA_FISCAL', customer: 'Distribuidora Los Andes', doc: 'J-40918231-1', date: '2026-10-31 16:45', taxableUsd: 120.00, exemptUsd: 25.00, ivaUsd: 19.20, igtfUsd: 3.60, totalUsd: 167.80, totalVes: 10990.90, status: 'EMITIDA' },
    { id: 'TICK-847291', type: 'TICKET_VENTA', customer: 'Consumidor Final', doc: 'V-00000000', date: '2026-10-31 15:30', taxableUsd: 14.50, exemptUsd: 5.00, ivaUsd: 2.32, igtfUsd: 0.00, totalUsd: 21.82, totalVes: 1429.21, status: 'EMITIDA' },
    { id: 'NOTA-000094', type: 'NOTA_ENTREGA', customer: 'María Fernández', doc: 'V-18.421.902', date: '2026-10-31 12:10', taxableUsd: 45.00, exemptUsd: 0.00, ivaUsd: 0.00, igtfUsd: 0.00, totalUsd: 45.00, totalVes: 2947.50, status: 'EMITIDA' },
    { id: 'FAC-000181', type: 'FACTURA_FISCAL', customer: 'Inversiones del Centro C.A.', doc: 'J-31049281-0', date: '2026-10-30 18:20', taxableUsd: 340.00, exemptUsd: 40.00, ivaUsd: 54.40, igtfUsd: 10.20, totalUsd: 444.60, totalVes: 29121.30, status: 'EMITIDA' },
  ]);

  const [invoiceFilter, setInvoiceFilter] = useState('TODAS');
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState(null);

  // Función para exportar Libro de Ventas SENIAT en CSV oficial
  const exportLibroVentasSeniat = () => {
    const headers = ['Operacion', 'Fecha', 'Tipo Documento', 'Numero', 'Cliente', 'RIF / CI', 'Base Imponible ($)', 'Exento ($)', 'IVA 16% ($)', 'IGTF 3% ($)', 'Total USD', 'Total VES (Tasa BCV)'];
    const rows = invoices.map((inv, idx) => [
      idx + 1,
      inv.date,
      inv.type,
      inv.id,
      `"${inv.customer}"`,
      inv.doc,
      inv.taxableUsd.toFixed(2),
      inv.exemptUsd.toFixed(2),
      inv.ivaUsd.toFixed(2),
      inv.igtfUsd.toFixed(2),
      inv.totalUsd.toFixed(2),
      inv.totalVes.toFixed(2)
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Libro_Ventas_SENIAT_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Libro de Ventas SENIAT exportado en CSV/Excel');
  };

  // Cargar catálogo de Supabase o utilizar Catálogo Oficial AxonPOS
  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true);
      try {
        const wsId = localStorage.getItem('activeWorkspace');
        let query = supabase.from('ecommerce_products').select('*');
        if (wsId) query = query.eq('workspace_id', wsId);
        
        const { data, error } = await query.order('name', { ascending: true }).limit(200);
        if (!error && data && data.length > 0) {
          const mapped = data.map(p => {
            const meta = p.metadata ? (typeof p.metadata === 'string' ? JSON.parse(p.metadata) : p.metadata) : {};
            const skuVal = p.sku || p.batch_number || meta.sku || p.id || '';
            const barcodeVal = p.barcode || p.batch_number || p.sku || meta.barcode || meta.sku || p.id || '';
            return {
              ...p,
              sku: skuVal,
              barcode: barcodeVal,
              batch_number: p.batch_number || skuVal,
              metadata: meta
            };
          });
          setProducts(mapped);
        } else {
          setProducts(AXON_PRODUCTS);
          setCategories(AXON_CATEGORIES);
        }
      } catch (e) {
        console.error(e);
        setProducts(AXON_PRODUCTS);
        setCategories(AXON_CATEGORIES);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();

    fetch('https://axonmarket-api.onrender.com/api/bcv')
      .then(res => res.json())
      .then(data => { if (data?.rate) setBcvRate(Number(data.rate)); })
      .catch(() => {});
  }, []);

  // Manejador central de cantidades en carrito
  const handleUpdateCartQuantity = (product, delta) => {
    playBeep();
    setCart(prev => {
      const idx = prev.findIndex(item => item.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        const newQty = next[idx].quantity + delta;
        if (newQty <= 0) {
          next.splice(idx, 1);
        } else {
          next[idx] = { ...next[idx], quantity: newQty };
        }
        return next;
      } else if (delta > 0) {
        return [...prev, {
          id: product.id,
          name: product.name,
          price: Number(product.priceUsd ?? product.price) || 1.0,
          wholesalePrice: product.wholesaleBestRateUsd ? Number(product.wholesaleBestRateUsd) : undefined,
          taxType: product.taxType || 'G',
          stock: product.currentStock ?? product.stock,
          quantity: 1,
          notes: ''
        }];
      }
      return prev;
    });
  };

  // Carrito con Beep de escaneo
  const addToCart = (product) => {
    handleUpdateCartQuantity(product, 1);
  };

  const updateItemNotes = (id, notes) => {
    setCart(prev => prev.map(item => item.id === id ? { ...item, notes } : item));
  };

  // Escaneo continuo con pistola o tecla Enter
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      const q = searchQuery.trim().toLowerCase();
      const found = products.find(p => {
        const pBarcode = String(p.barcode || '').trim().toLowerCase();
        const pSku = String(p.sku || p.batch_number || p.metadata?.sku || '').trim().toLowerCase();
        const pBatch = String(p.batch_number || '').trim().toLowerCase();
        const pId = String(p.id || '').trim().toLowerCase();
        const pName = String(p.name || '').trim().toLowerCase();
        return pBarcode === q || pSku === q || pBatch === q || pId === q || pName === q || pName.includes(q);
      });
      if (found) {
        addToCart(found);
        toast.success(`+1 ${found.name}`);
        setSearchQuery('');
      } else {
        toast.error('Código o producto no encontrado');
      }
    }
  };

  // Escaneo por cámara óptica del teléfono o lector inalámbrico
  const handleBarcodeScanResult = async (code) => {
    if (!code) return;
    const raw = String(code).trim();
    const q = raw.toLowerCase();

    // 1. Buscar en memoria local del catálogo cargado
    let found = products.find(p => {
      const pBarcode = String(p.barcode || '').trim().toLowerCase();
      const pSku = String(p.sku || p.batch_number || p.metadata?.sku || '').trim().toLowerCase();
      const pBatch = String(p.batch_number || '').trim().toLowerCase();
      const pMetaBarcode = String(p.metadata?.barcode || '').trim().toLowerCase();
      const pId = String(p.id || '').trim().toLowerCase();
      const pName = String(p.name || '').trim().toLowerCase();

      return pBarcode === q || 
             pSku === q || 
             pBatch === q || 
             pMetaBarcode === q || 
             pId === q || 
             pName === q;
    });

    // 2. Si no se encontró en memoria, consultar directamente a Supabase
    if (!found) {
      try {
        const wsId = localStorage.getItem('activeWorkspace');
        let query = supabase.from('ecommerce_products').select('*');
        if (wsId) query = query.eq('workspace_id', wsId);

        const { data } = await query
          .or(`batch_number.eq.${raw},id.eq.${raw},name.ilike.%${raw}%`)
          .limit(1);

        if (data && data.length > 0) {
          const dbItem = data[0];
          const meta = dbItem.metadata ? (typeof dbItem.metadata === 'string' ? JSON.parse(dbItem.metadata) : dbItem.metadata) : {};
          found = {
            ...dbItem,
            sku: dbItem.sku || dbItem.batch_number || meta.sku || raw,
            barcode: dbItem.barcode || dbItem.batch_number || meta.barcode || raw,
            batch_number: dbItem.batch_number || raw,
            metadata: meta
          };
          setProducts(prev => [found, ...prev.filter(p => p.id !== found.id)]);
        }
      } catch (err) {
        console.warn('Error buscando producto escaneado en Supabase:', err);
      }
    }

    if (found) {
      addToCart(found);
      toast.success(`+1 ${found.name}`, { icon: '📦' });
    } else {
      toast.error(`Código "${raw}" no encontrado en catálogo`);
    }
  };

  const addFreeItem = () => {
    const p = parseFloat(freeItemPrice);
    if (!freeItemName.trim() || isNaN(p) || p <= 0) {
      toast.error('Indique nombre y precio válido');
      return;
    }
    const freeObj = {
      id: `free-${Date.now()}`,
      name: freeItemName.trim(),
      price: p,
      quantity: 1,
      taxType: 'G',
      notes: '',
      badge: 'LIBRE'
    };
    playBeep();
    setCart(prev => [...prev, freeObj]);
    setFreeItemName('');
    setFreeItemPrice('');
    setIsFreeItemModalOpen(false);
    toast.success('Artículo libre agregado');
  };

  const updateQuantity = (id, delta) => {
    playBeep();
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => setCart([]);

  // Tarifas y Multiplicadores
  const tierMultiplier = tariffTier === 'mayor' ? 0.90 : 1.0;

  // Totales y Desglose Fiscal Idéntico a AxonPOS (Images 1, 2 y 3)
  const rawSubtotalUsd = cart.reduce((acc, item) => acc + (Number(item.price) || 0) * item.quantity * tierMultiplier * priceMultiplier, 0);
  const discountUsd = rawSubtotalUsd * (discountPercent / 100);
  const netSubtotalUsd = rawSubtotalUsd - discountUsd;
  const ivaGeneralUsd = netSubtotalUsd * 0.16;

  // IGTF 3% sobre métodos en divisas extranjeras (USD)
  const igtfUsd = payments
    .filter(p => p.currency === 'USD' && ['CASH_USD', 'ZELLE', 'CREDITO'].includes(p.method))
    .reduce((acc, p) => acc + (p.amountUsdEquivalent * 0.03), 0);

  const totalRequiredUsd = netSubtotalUsd + ivaGeneralUsd + igtfUsd;
  const totalRequiredVes = totalRequiredUsd * bcvRate;

  // Control de Liquidación en Pasarela de Cobro
  const totalPaidUsd = payments.reduce((acc, p) => acc + (p.amountUsdEquivalent || 0), 0);
  const remainingDueUsd = Math.max(0, totalRequiredUsd - totalPaidUsd);
  const remainingDueVes = remainingDueUsd * bcvRate;
  const changeUsd = Math.max(0, totalPaidUsd - totalRequiredUsd);
  const changeVes = changeUsd * bcvRate;
  const isFullyPaid = totalPaidUsd >= (totalRequiredUsd - 0.005);

  const methodCurrency = ['CASH_USD', 'ZELLE', 'CREDITO'].includes(selectedMethod) ? 'USD' : 'VES';
  const suggestedAmount = remainingDueUsd <= 0 ? '0.00' : (
    methodCurrency === 'USD' ? remainingDueUsd.toFixed(2) : remainingDueVes.toFixed(2)
  );

  const handleAddPayment = () => {
    const rawVal = parseFloat(tenderAmount || suggestedAmount);
    if (!rawVal || rawVal <= 0) return;

    let amountUsdEquivalent = 0;
    if (methodCurrency === 'USD') {
      amountUsdEquivalent = rawVal;
    } else {
      amountUsdEquivalent = rawVal / bcvRate;
    }

    const newPayment = {
      id: 'pay-' + Math.random().toString(36).substr(2, 9),
      method: selectedMethod,
      currency: methodCurrency,
      amountPaid: rawVal,
      amountUsdEquivalent: Number(amountUsdEquivalent.toFixed(2)),
      referenceNumber: referenceNumber.trim() || undefined,
      bankName: bankName.trim() || undefined,
      appliesIgtf: (selectedMethod === 'CASH_USD' || selectedMethod === 'ZELLE')
    };

    playBeep();
    setPayments(prev => [...prev, newPayment]);
    setTenderAmount('');
    setReferenceNumber('');
  };

  const handleRemovePayment = (id) => {
    setPayments(prev => prev.filter(p => p.id !== id));
  };

  const handleCompleteSale = async () => {
    if (!isFullyPaid) return;
    setIsProcessingSale(true);
    playBeep();

    const invoiceNum = documentType === 'FISCAL_INVOICE' 
      ? `FAC-${Math.floor(100000 + Math.random() * 900000)}` 
      : `NE-${Math.floor(100000 + Math.random() * 900000)}`;

    const completedSaleData = {
      id: `sale-${Date.now()}`,
      invoiceNumber: invoiceNum,
      documentType,
      customer: selectedCustomer,
      cashier: activeShift?.cashier || 'Cajero 1',
      subtotalUsd: netSubtotalUsd,
      ivaUsd: ivaGeneralUsd,
      igtfUsd: igtfUsd,
      totalUsd: totalRequiredUsd,
      totalVes: totalRequiredVes,
      changeUsd,
      changeVes,
      items: cart,
      payments,
      date: new Date().toLocaleString()
    };

    // 1. Guardar atómicamente en la cola Dexie Local (Offline-First)
    try {
      await offlineSyncManager.enqueueSale(completedSaleData);
      const pending = await offlineSyncManager.getPendingSales();
      setPendingSalesCount(pending.length);
    } catch (dexErr) {
      console.warn('Dexie local queue warning:', dexErr);
    }

    // 2. Hardware: Si está configurada la apertura de gaveta, enviar pulso ESC/POS
    if (hardwareConfig.autoDrawer) {
      hardwareService.openCashDrawer();
    }

    // 3. Simulación de impresión
    try {
      hardwareService.printTestTicket(hardwareConfig.printerSize);
    } catch (e) {}

    // 4. Sincronización en la nube si está online
    if (isOnline) {
      try {
        for (const item of cart) {
          if (item.id && !item.id.toString().startsWith('com-') && !item.id.toString().startsWith('free-')) {
            const currentStock = Number(item.stock) || 0;
            const newStock = Math.max(0, currentStock - item.quantity);
            await supabase.from('ecommerce_products').update({ stock: newStock }).eq('id', item.id);
          }
        }
        await offlineSyncManager.syncPendingSales();
        const pendingAfter = await offlineSyncManager.getPendingSales();
        setPendingSalesCount(pendingAfter.length);
      } catch (e) {
        console.warn('Sync offline fallback:', e);
      }
    }

    // 5. Registrar en métricas del turno de caja
    setActiveShift(prev => {
      const cashUsdFromSale = payments.filter(p => p.method === 'CASH_USD').reduce((a, p) => a + p.amountPaid, 0);
      const cashVesFromSale = payments.filter(p => p.method === 'CASH_VES').reduce((a, p) => a + p.amountPaid, 0);
      const elecUsd = payments.filter(p => !['CASH_USD', 'CASH_VES'].includes(p.method)).reduce((a, p) => a + p.amountUsdEquivalent, 0);

      return {
        ...prev,
        salesCount: (prev?.salesCount || 0) + 1,
        totalSalesUsd: (prev?.totalSalesUsd || 0) + totalRequiredUsd,
        totalSalesVes: (prev?.totalSalesVes || 0) + totalRequiredVes,
        cashSalesUsd: (prev?.cashSalesUsd || 0) + cashUsdFromSale,
        cashSalesVes: (prev?.cashSalesVes || 0) + cashVesFromSale,
        electronicSalesUsd: (prev?.electronicSalesUsd || 0) + elecUsd
      };
    });

    setCompletedSale(completedSaleData);
    setIsCheckoutOpen(false);
    setCart([]);
    setPayments([]);
    setIsProcessingSale(false);
    toast.success(`¡Venta ${invoiceNum} cobrada e impresa con éxito!`);
  };

  // Atajos de teclado idénticos a AxonPOS ([F2] Buscar, [F3] Cliente, [F12] Cobrar)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F3') {
        e.preventDefault();
        setIsCustomerModalOpen(true);
      } else if (e.key === 'F12') {
        e.preventDefault();
        if (isCheckoutOpen) {
          if (isFullyPaid) handleCompleteSale();
        } else if (cart.length > 0) {
          setIsCheckoutOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCheckoutOpen, isFullyPaid, cart.length]);

  // Renderizador unificado del Ticket de Venta (compatible con Desktop Sidebar y Mobile Drawer)
  const renderTicketContent = (isMobile = false) => (
    <div className="flex flex-col h-full min-h-0">
      {/* Header: Tarifa con botones Detal y Mayor */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <Tag size={14} className="text-emerald-600" />
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Tarifa:</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTariffTier('detal')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tariffTier === 'detal'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs font-extrabold'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 border border-transparent hover:bg-slate-200'
            }`}
          >
            Detal
          </button>
          <button
            onClick={() => setTariffTier('mayor')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              tariffTier === 'mayor'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs font-extrabold'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 border border-transparent hover:bg-slate-200'
            }`}
          >
            <span>📦</span> Mayor
          </button>
          <button
            onClick={() => (isMobile ? setIsMobileCartOpen(false) : setIsCartOpen(false))}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer ml-1"
            title={isMobile ? "Cerrar panel de pedido" : "Minimizar panel de pedido"}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Lista de Productos del Carrito o Ticket Vacío */}
      <div className="flex-1 overflow-y-auto pr-1 py-2 space-y-2.5 [scrollbar-width:thin] min-h-0">
        {cart.length === 0 ? (
          /* Ticket de Venta Vacío */
          <div className="h-full flex flex-col items-center justify-center text-center py-10 px-4">
            <div className="w-18 h-18 rounded-full border-2 border-orange-200 bg-orange-50/70 flex items-center justify-center text-orange-500 mb-4 shadow-2xs">
              <ShoppingCart size={32} strokeWidth={1.8} />
            </div>
            <h4 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">
              Ticket de venta vacío
            </h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-[240px] leading-relaxed">
              Haz clic en cualquier producto del catálogo o escanea su código de barras.
            </p>
            {!isMobile && (
              <div className="flex items-center gap-2 mt-5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                <span className="bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 px-2.5 py-1 rounded-md">
                  [F2] Buscar
                </span>
                <span className="bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 px-2.5 py-1 rounded-md">
                  [F3] Cliente
                </span>
                <span className="bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 px-2.5 py-1 rounded-md">
                  [F12] Cobrar
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Tarjetas de Producto en Carrito */
          cart.map((item) => {
            const unitPrice = (Number(item.price) || 0) * tierMultiplier * priceMultiplier;
            const lineTotal = unitPrice * item.quantity;
            const lineVes = lineTotal * bcvRate;
            const isEditingThisNote = editingNoteId === item.id;

            return (
              <div key={item.id} className="p-3 rounded-2xl bg-white dark:bg-zinc-800/90 border border-slate-200/90 dark:border-white/10 shadow-2xs space-y-2">
                {/* Fila 1: Nombre y Precio */}
                <div className="flex justify-between items-start gap-2">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                    {item.name}
                  </h5>
                  <span className="text-xs font-black text-slate-900 dark:text-white font-mono shrink-0">
                    ${lineTotal.toFixed(2)}
                  </span>
                </div>

                {/* Fila 2: 1 x $8.50  IVA 16%   Bs. 7.555,57 */}
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <span>{item.quantity} × ${unitPrice.toFixed(2)}</span>
                    <span className="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 text-[10px] font-bold px-1.5 py-0.2 rounded border border-blue-200/60 dark:border-blue-900/40">
                      IVA 16%
                    </span>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">
                    Bs. {lineVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Fila 3: Controles [-] 1 [+] | [+ Nota] [Trash] */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center border border-slate-200 dark:border-white/10 rounded-lg p-0.5 bg-slate-50 dark:bg-zinc-900">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-6 h-6 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-zinc-700 rounded text-slate-600 dark:text-slate-200 cursor-pointer"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="w-7 text-center text-xs font-black text-slate-900 dark:text-white font-mono">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-6 h-6 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-zinc-700 rounded text-slate-600 dark:text-slate-200 cursor-pointer"
                    >
                      <Plus size={11} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        if (editingNoteId === item.id) {
                          setEditingNoteId(null);
                        } else {
                          setEditingNoteId(item.id);
                          setNoteText(item.notes || '');
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 hover:border-slate-300 bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-300 text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      <BookOpen size={11} />
                      <span>{item.notes ? item.notes : '+ Nota'}</span>
                    </button>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="w-7 h-7 rounded-lg border border-red-200 hover:bg-red-50 text-red-500 flex items-center justify-center transition-colors cursor-pointer"
                      title="Quitar producto"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Editor Inline de Nota */}
                {isEditingThisNote && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="text"
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Ej: Empaque especial, sin factura..."
                      className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-white/10 outline-none text-slate-800 dark:text-white bg-slate-50 dark:bg-zinc-900"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateItemNotes(item.id, noteText);
                          setEditingNoteId(null);
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        updateItemNotes(item.id, noteText);
                        setEditingNoteId(null);
                      }}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer"
                    >
                      OK
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Totales y Botón Cobrar */}
      <div className="pt-3 border-t border-slate-100 dark:border-white/5 space-y-2.5 shrink-0 mt-auto">
        {/* Subtotal Neto e IVA */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span>Subtotal Neto:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              ${netSubtotalUsd.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-300">
            <span>IVA General (16%):</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              ${ivaGeneralUsd.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Separador punteado y Fila Descuento / Tasa BCV */}
        <div className="pt-2 border-t border-dashed border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div className="relative">
            <button
              onClick={() => setShowDiscountPicker(!showDiscountPicker)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                discountPercent > 0
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : 'bg-white dark:bg-zinc-800 text-orange-600 border-slate-200/90 dark:border-white/10 hover:border-orange-400'
              }`}
            >
              <Tag size={12} />
              <span>{discountPercent > 0 ? `Desc: ${discountPercent}%` : '+ Descuento'}</span>
            </button>

            {/* Preset Pickers */}
            {showDiscountPicker && (
              <div className="absolute bottom-full left-0 mb-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-lg p-1.5 flex gap-1 z-30">
                {[0, 5, 10, 15, 20].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => {
                      setDiscountPercent(pct);
                      setShowDiscountPicker(false);
                    }}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      discountPercent === pct ? 'bg-orange-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {pct === 0 ? '0%' : `${pct}%`}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-1 font-semibold">
            <span>BCV:</span>
            <strong className="font-mono text-slate-700 dark:text-slate-200 font-bold">{bcvRate.toFixed(2)} Bs/$</strong>
          </div>
        </div>

        {/* Tarjeta Hero TOTAL A PAGAR con contorno naranja */}
        <div className="p-3.5 rounded-2xl border border-amber-300/80 dark:border-amber-500/30 bg-gradient-to-b from-white to-amber-50/60 dark:from-zinc-900 dark:to-amber-950/20 shadow-2xs">
          <div className="flex justify-between items-baseline">
            <span className="text-xs font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-200">
              TOTAL A PAGAR
            </span>
            <span className="text-3xl font-black font-mono text-orange-600 leading-none">
              ${totalRequiredUsd.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center pt-1.5 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              Equivalente oficial BCV:
            </span>
            <span className="font-mono font-extrabold text-slate-800 dark:text-slate-200">
              Bs. {totalRequiredVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Botón Hero COBRAR */}
        <button
          onClick={() => {
            if (cart.length > 0) {
              if (isMobile) setIsMobileCartOpen(false);
              setIsCheckoutOpen(true);
            }
          }}
          disabled={cart.length === 0}
          className={`w-full py-3.5 px-4 rounded-2xl text-sm font-black flex items-center justify-center gap-2.5 transition-all shadow-md ${
            cart.length === 0
              ? 'bg-slate-200 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/25 active:scale-98 cursor-pointer'
          }`}
        >
          <CreditCard size={18} />
          <span className="tracking-wide">COBRAR</span>
          {!isMobile && (
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-white/20 text-white">
              F12
            </span>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-3 w-full h-[100dvh] flex flex-col justify-between overflow-hidden bg-[#f4f7fb] dark:bg-black font-sans select-none">
      
      {/* ========================================================
          BARRA SUPERIOR CONTINUA IDÉNTICA A COMMERCY (IMAGE 1)
          ======================================================== */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-center pb-2 shrink-0">
          
          {/* Lado Izquierdo: Buscador y Salir */}
          <div className={`${isCartOpen ? 'lg:col-span-8' : 'lg:col-span-9'} flex items-center gap-2 transition-all`}>
            {/* Botón Salir al Menú / Dashboard */}
            <button
              onClick={() => navigate('/dashboard')}
              className="lg:hidden p-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-orange-600 hover:border-orange-400 transition-colors cursor-pointer shadow-2xs shrink-0 flex items-center justify-center"
              title="Volver al menú principal"
            >
              <ArrowLeft size={16} />
            </button>

            {/* Input Buscador con scanner */}
            <div className="flex items-center gap-2 flex-1 min-w-0 bg-white dark:bg-zinc-900 px-3 py-2 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-2xs focus-within:ring-2 focus-within:ring-orange-500/30">
              <Search size={15} className="text-slate-400 shrink-0" />
              <input 
                ref={searchInputRef}
                type="text"
                placeholder="Buscar producto o escanear..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="bg-transparent border-none outline-none text-xs text-slate-800 dark:text-white placeholder-slate-400 w-full min-w-0"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCameraScannerOpen(true);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-orange-500 transition-colors cursor-pointer shrink-0"
                title="Escanear código de barras con la cámara"
              >
                <Scan size={16} />
              </button>
            </div>
          </div>

          {/* Lado Derecho: Controles de Pedidos Online, Cliente, Carrito y Hardware */}
          <div className={`${isCartOpen ? 'lg:col-span-4' : 'lg:col-span-3'} flex items-center justify-end gap-1.5 transition-all`}>
            {/* Botón de Gestión de Pedidos Online (Tablero Kanban) */}
            <button
              onClick={() => navigate('/orders')}
              className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 hover:border-orange-400 px-2.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-orange-600 transition-all cursor-pointer shadow-2xs relative shrink-0"
              title="Gestión de Pedidos en línea (Tablero Kanban)"
            >
              <Package size={14} className="text-orange-500 shrink-0" />
              <span>Pedidos</span>
              {pendingOrdersCount > 0 ? (
                <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black text-white bg-gradient-to-r from-orange-500 to-amber-500 rounded-full shadow-2xs animate-pulse">
                  {pendingOrdersCount}
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full">
                  0
                </span>
              )}
            </button>

            {/* Cliente */}
            <button 
              onClick={() => setIsCustomerModalOpen(true)}
              className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 hover:border-orange-400 px-2.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shadow-2xs truncate max-w-[125px] sm:max-w-[140px]"
              title="Cambiar o crear cliente"
            >
              <User size={13} className="text-slate-400 shrink-0" />
              <span className="truncate">{selectedCustomer}</span>
              <ChevronDown size={12} className="text-slate-400 shrink-0 ml-auto" />
            </button>

            {/* Alternar Carrito / Pantalla Completa */}
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                  setIsMobileCartOpen(!isMobileCartOpen);
                } else {
                  setIsCartOpen(!isCartOpen);
                }
              }}
              className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                (isMobileCartOpen || isCartOpen) 
                  ? 'bg-orange-500 text-white shadow-orange-500/25 ring-2 ring-orange-500/30' 
                  : 'bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 text-slate-700 hover:text-orange-600'
              }`}
              title="Alternar panel de pedido / pantalla completa (5 columnas)"
            >
              <ShoppingCart size={14} />
              <span>{cart.reduce((a, b) => a + b.quantity, 0)}</span>
              {cart.length > 0 && (
                <span className="hidden sm:inline font-mono font-bold">${totalRequiredUsd.toFixed(2)}</span>
              )}
            </button>

            {/* Configuración de Hardware (Solo visible en Desktop) */}
            <button 
              onClick={() => setIsHardwareModalOpen(true)}
              className="hidden lg:flex p-2 rounded-xl text-slate-500 hover:text-orange-600 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 hover:border-orange-400 transition-colors cursor-pointer shadow-2xs shrink-0"
              title="Hardware de mostrador"
            >
              <Settings size={15} />
            </button>

            {/* Control de Caja & Turnos F9 (AxonPOS Módulo 3) */}
            <button 
              onClick={() => setIsCashShiftModalOpen(true)}
              className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 hover:border-orange-400 px-2.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-orange-600 transition-all cursor-pointer shadow-2xs shrink-0"
              title="Control de Caja, Turnos y Arqueo Ciego (Atajo F9)"
            >
              <Wallet size={14} className="text-orange-500 shrink-0" />
              <span className="hidden xl:inline">Caja</span>
              <kbd className="hidden sm:inline bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-orange-200 dark:border-orange-800">F9</kbd>
            </button>

            {/* Centro de Control Maestro: Personal & Cajas (AxonPOS Módulo 1) */}
            <button 
              onClick={() => setIsUserManagementModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 hover:border-orange-400 px-2.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-orange-600 transition-all cursor-pointer shadow-2xs shrink-0"
              title="Centro de Control Maestro: Personal & PINes"
            >
              <Users size={14} className="text-amber-500 shrink-0" />
              <span className="hidden 2xl:inline">Personal</span>
            </button>

            {/* Centro de Respaldos ACID .axonbak (AxonPOS Módulo 2) */}
            <button 
              onClick={() => setIsBackupModalOpen(true)}
              className="hidden md:flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-white/10 hover:border-orange-400 px-2.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-orange-600 transition-all cursor-pointer shadow-2xs shrink-0"
              title="Centro de Respaldos & Disaster Recovery (.axonbak)"
            >
              <Database size={14} className="text-emerald-500 shrink-0" />
              <span className="hidden 2xl:inline">Respaldo</span>
            </button>
          </div>

        </div>
      )}

      {/* ========================================================
          VISTA 1: POS KIOSCO (CUADRÍCULA Y PEDIDO ACTUAL)
          ======================================================== */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start flex-1 min-h-0 overflow-hidden">
          
          {/* Columna Izquierda: Catálogo Oficial AxonPOS (Barra Jerárquica + Subcategory Sidebar + VisualProductCards) */}
          <div className={`${isCartOpen ? 'lg:col-span-8' : 'lg:col-span-12'} h-full flex flex-col min-h-0 overflow-hidden transition-all duration-300 gap-2.5`}>
            
            {/* NIVEL 1: BARRA SUPERIOR DE CATEGORÍAS PRINCIPALES Y ORDENAMIENTO (IMAGE 2) */}
            <HierarchicalCategoryBar
              categories={mainCategories}
              selectedCategoryId={selectedMainCategory}
              onSelectCategory={(catId) => {
                setSelectedMainCategory(catId);
                setSelectedSubcategory('ALL');
              }}
              productCounts={mainCategoryCounts}
              totalProductsCount={products.length}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />

            {/* MÓVIL Y TABLET (lg:hidden): CINTA HORIZONTAL DE SUBCATEGORÍAS EN CHIPS */}
            {activeSubcategories.length > 0 && (
              <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto py-1 px-0.5 shrink-0 [scrollbar-width:none]">
                <button
                  type="button"
                  onClick={() => setSelectedSubcategory('ALL')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedSubcategory === 'ALL'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 hover:border-orange-300'
                  }`}
                >
                  <span>Todos</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    selectedSubcategory === 'ALL' ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500'
                  }`}>
                    {selectedMainCategory === 'ALL' ? products.length : (mainCategoryCounts[selectedMainCategory] || 0)}
                  </span>
                </button>

                {activeSubcategories.map((sub) => {
                  const isSelected = selectedSubcategory === sub.id;
                  const count = subcategoryCounts[sub.id] || 0;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSelectedSubcategory(sub.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-orange-600 text-white shadow-xs'
                          : 'bg-white dark:bg-zinc-900 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 hover:border-orange-300'
                      }`}
                    >
                      <span className="truncate max-w-[120px]">{sub.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-500'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* CONTENEDOR FLEX: PANEL LATERAL DE SUBCATEGORÍAS (DESKTOP) + GRID CENTRAL DE PRODUCTOS */}
            <div className="flex flex-1 min-h-0 overflow-hidden gap-2.5">
              {/* NIVEL 2: SIDEBAR VERTICAL DE SUBCATEGORÍAS CIRCULARES (SOLO DESKTOP) */}
              {activeSubcategories.length > 0 && (
                <div className="hidden lg:flex shrink-0">
                  <SubcategorySidebar
                    subcategories={activeSubcategories}
                    selectedSubcategoryId={selectedSubcategory}
                    onSelectSubcategory={(subId) => setSelectedSubcategory(subId)}
                    productCounts={subcategoryCounts}
                    totalCount={
                      selectedMainCategory === 'ALL'
                        ? products.length
                        : mainCategoryCounts[selectedMainCategory] || 0
                    }
                    activeAccentColor="#EA580C"
                  />
                </div>
              )}

              {/* NIVEL 3: ÁREA CENTRAL - GRID DE PRODUCTOS VISUALES AXONPOS (2 COLUMNAS EN MÓVIL) */}
              <div className="flex-1 overflow-y-auto pr-1 h-full [scrollbar-width:thin] bg-[#F8FAFC] dark:bg-zinc-950 rounded-xl border border-slate-200/80 dark:border-white/10 p-2 sm:p-3 pb-24 lg:pb-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 content-start">
                  {visualFilteredProducts.map((product) => (
                    <VisualProductCard
                      key={product.id}
                      product={product}
                      activeExchangeRate={bcvRate}
                      quantityInCart={cartQuantityMap[product.id] || 0}
                      onAddToCart={() => handleUpdateCartQuantity(product, 1)}
                      onUpdateCartQuantity={handleUpdateCartQuantity}
                      activeAccentColor="#EA580C"
                    />
                  ))}
                </div>

                {visualFilteredProducts.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                    <ShoppingBag size={40} strokeWidth={1.5} />
                    <p className="mt-2 text-sm font-semibold">No se encontraron productos en esta categoría</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Columna Derecha: Pedido Actual / Carrito (Solo Desktop) */}
          {isCartOpen && (
            <div className="hidden lg:flex lg:col-span-4 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs p-4 flex-col h-full min-h-0 animate-in fade-in duration-200">
              {renderTicketContent(false)}
            </div>
          )}

        </div>
      )}

      {/* ========================================================
          BARRA FLOTANTE NARANJA DE CARRITO AXONMARKET (MÓVIL)
          Ubicada directamente en la base de la pantalla
          ======================================================== */}
      {activeTab === 'pos' && (
        <div className="lg:hidden fixed bottom-3 left-3 right-3 z-30 animate-in slide-in-from-bottom-2 duration-200">
          <button
            type="button"
            onClick={() => setIsMobileCartOpen(true)}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-[0.99] text-white px-4 py-3 rounded-2xl shadow-xl shadow-orange-500/30 flex items-center justify-between transition-all cursor-pointer border border-orange-400/40"
          >
            {/* Izquierda: Ícono Carrito + Texto Carrito + Badge Contador */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <ShoppingCart size={18} className="text-white" />
              </div>
              <span className="font-bold text-sm tracking-wide text-white">Carrito</span>
              <span className="bg-white text-orange-600 text-xs font-black px-2.5 py-0.5 rounded-full shadow-2xs">
                {cart.reduce((a, b) => a + b.quantity, 0)}
              </span>
            </div>

            {/* Derecha: Total en USD y Bolívares + Flecha Arriba */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 font-mono text-right">
                <span className="text-sm font-black text-white">
                  ${totalRequiredUsd.toFixed(2)}
                </span>
                <span className="text-orange-200/60 text-xs">|</span>
                <span className="text-xs font-extrabold text-orange-100">
                  Bs. {totalRequiredVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <ChevronUp size={20} className="text-white shrink-0 ml-0.5" />
            </div>
          </button>
        </div>
      )}

      {/* ========================================================
          MODAL BOTTOM SHEET: TICKET DE VENTA COMPLETO (MÓVIL)
          ======================================================== */}
      {activeTab === 'pos' && isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop oscuro translúcido */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setIsMobileCartOpen(false)}
          />

          {/* Drawer deslizable desde abajo */}
          <div className="relative z-10 bg-white dark:bg-zinc-900 rounded-t-3xl border-t border-slate-200 dark:border-white/10 shadow-2xl max-h-[85vh] h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Tirador superior */}
            <div 
              className="pt-2.5 pb-1 flex justify-center cursor-pointer select-none"
              onClick={() => setIsMobileCartOpen(false)}
            >
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-zinc-700 rounded-full" />
            </div>

            <div className="flex-1 flex flex-col p-4 pt-1 min-h-0 overflow-hidden">
              {renderTicketContent(true)}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL DE ESCÁNER DE CÓDIGO DE BARRAS POR CÁMARA
          ======================================================== */}
      <CameraScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScanProduct={handleBarcodeScanResult}
      />

      {/* ========================================================
          VISTA: TABLERO KANBAN DE PEDIDOS (/pos?view=orders)
          Mantiene la sesión dentro del POS Kiosco sin salir
          ======================================================== */}
      {activeTab === 'orders' && (
        <div className="flex-1 overflow-y-auto h-full w-full [scrollbar-width:thin] p-2 sm:p-4 bg-[#f4f7fb] dark:bg-black animate-in fade-in">
          <OrdersManager />
        </div>
      )}

      {/* ========================================================
          VISTA 2: CAJA Y TURNOS (/shifts) — FASE 3 INTEGRAL
          ======================================================== */}
      {activeTab === 'shifts' && (
        <div className="space-y-6 animate-in fade-in font-sans">
          
          {/* Fila 1: Panel Principal de Turno y Movimientos */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* 8 Cols: Estado de Caja, Métricas y Corte X */}
            <div className="lg:col-span-8 bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200/80 dark:border-white/10 shadow-sm p-6 sm:p-7 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      activeShift.status === 'ABIERTO'
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${activeShift.status === 'ABIERTO' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                      {activeShift.status === 'ABIERTO' ? 'Turno Abierto' : 'Turno Finalizado (Caja Cerrada)'}
                    </span>
                    <span className="text-xs font-mono text-slate-400 font-bold">{activeShift.id}</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-2">
                    Control de Caja y Arqueo Ciego (Fase 3)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cajero: <b>{activeShift.cashier}</b> · Apertura: {activeShift.openedAt}
                  </p>
                </div>

                {activeShift.status === 'ABIERTO' ? (
                  <button 
                    onClick={() => setIsCorteXModalOpen(true)}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-2 self-start sm:self-auto"
                  >
                    <Printer size={15} /> Imprimir Corte X
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsOpenShiftModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-2 self-start sm:self-auto"
                  >
                    <Plus size={15} /> Abrir Nuevo Turno
                  </button>
                )}
              </div>

              {/* Métricas Principales de Fondos y Ventas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                  <span className="text-[10px] font-bold text-slate-400 block">Fondo Inicial ($)</span>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white mt-1">${activeShift.initialCashUsd.toFixed(2)}</h4>
                  <span className="text-[10px] text-slate-400">Efectivo base</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                  <span className="text-[10px] font-bold text-slate-400 block">Fondo Inicial (Bs)</span>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white mt-1">{activeShift.initialCashVes.toFixed(2)} Bs</h4>
                  <span className="text-[10px] text-slate-400">Sencillo en Bs</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                  <span className="text-[10px] font-bold text-slate-400 block">Ventas Turno ($)</span>
                  <h4 className="text-lg font-black text-orange-600 mt-1">${activeShift.totalSalesUsd.toFixed(2)}</h4>
                  <span className="text-[10px] text-orange-600 font-semibold">${activeShift.cashSalesUsd.toFixed(2)} en efectivo</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                  <span className="text-[10px] font-bold text-slate-400 block">Operaciones</span>
                  <h4 className="text-lg font-black text-emerald-600 mt-1">{activeShift.salesCount} tickets</h4>
                  <span className="text-[10px] text-emerald-600 font-semibold">100% conciliadas</span>
                </div>
              </div>

              {/* Saldo Teórico en Gaveta */}
              <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-zinc-800/60 border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Saldo Teórico Físico Esperado en Gaveta
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    (Fondo inicial + Ventas efectivo + Entradas - Egresos)
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Efectivo $ esperado</span>
                    <b className="text-base font-black text-slate-900 dark:text-white">
                      ${((activeShift?.initialCashUsd || 0) + (activeShift?.cashSalesUsd || 0) + shiftMovements.filter(m => m.type === 'ENTRY' && m.currency === 'USD').reduce((a,m)=>a+m.amount,0) - shiftMovements.filter(m => m.type === 'EXIT' && m.currency === 'USD').reduce((a,m)=>a+m.amount,0)).toFixed(2)}
                    </b>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Efectivo Bs esperado</span>
                    <b className="text-base font-black text-slate-900 dark:text-white">
                      {((activeShift?.initialCashVes || 0) + (activeShift?.cashSalesVes || 0) + shiftMovements.filter(m => m.type === 'ENTRY' && m.currency === 'VES').reduce((a,m)=>a+m.amount,0) - shiftMovements.filter(m => m.type === 'EXIT' && m.currency === 'VES').reduce((a,m)=>a+m.amount,0)).toFixed(2)} Bs
                    </b>
                  </div>
                </div>
              </div>

              {/* Tabla de Movimientos del Turno */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white">
                    Historial de Entradas y Salidas del Turno
                  </h4>
                  <span className="text-[10px] text-slate-400">{shiftMovements.length} movimientos</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-white/5 text-slate-400 font-bold">
                        <th className="py-2 px-2">Tipo</th>
                        <th className="py-2 px-2">Concepto</th>
                        <th className="py-2 px-2">Hora</th>
                        <th className="py-2 px-2 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-semibold">
                      {shiftMovements.map(m => (
                        <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-white/5">
                          <td className="py-2 px-2">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              m.type === 'ENTRY' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {m.type === 'ENTRY' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                              {m.type === 'ENTRY' ? 'Ingreso' : 'Retiro'}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-slate-800 dark:text-slate-200">{m.concept}</td>
                          <td className="py-2 px-2 text-slate-400">{m.time}</td>
                          <td className={`py-2 px-2 text-right font-black ${m.type === 'ENTRY' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {m.type === 'ENTRY' ? '+' : '-'}{m.currency === 'USD' ? `$${m.amount.toFixed(2)}` : `${m.amount.toFixed(2)} Bs`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* 4 Cols: Acciones Rápidas de Caja */}
            <div className="lg:col-span-4 bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200/80 dark:border-white/10 shadow-sm p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Operaciones de Caja
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Registra ingresos extraordinarios, retiros de dinero para compras y ejecuta el arqueo ciego final.
                  </p>
                </div>

                <div className="space-y-2.5 pt-2">
                  <button 
                    onClick={() => { setMovCurrency('USD'); setIsEntryModalOpen(true); }}
                    disabled={activeShift.status !== 'ABIERTO'}
                    className="w-full py-3 px-4 rounded-xl border border-emerald-200 text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100 text-xs font-extrabold transition-all text-left flex items-center justify-between cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2">
                      <ArrowUpRight size={16} className="text-emerald-600" />
                      <span>+ Entrada de Dinero</span>
                    </div>
                    <span className="text-[10px] bg-white px-2 py-0.5 rounded-md font-bold text-emerald-700">Fondo</span>
                  </button>

                  <button 
                    onClick={() => { setMovCurrency('USD'); setIsExitModalOpen(true); }}
                    disabled={activeShift.status !== 'ABIERTO'}
                    className="w-full py-3 px-4 rounded-xl border border-red-200 text-red-700 bg-red-50/70 hover:bg-red-100 text-xs font-extrabold transition-all text-left flex items-center justify-between cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2">
                      <ArrowDownRight size={16} className="text-red-600" />
                      <span>- Retiro / Egreso</span>
                    </div>
                    <span className="text-[10px] bg-white px-2 py-0.5 rounded-md font-bold text-red-700">Gasto</span>
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-orange-50/70 dark:bg-orange-500/10 border border-orange-200/60 dark:border-orange-500/20 space-y-2">
                  <h4 className="text-xs font-extrabold text-orange-950 dark:text-orange-400">
                    Arqueo Ciego de Cierre Z
                  </h4>
                  <p className="text-[11px] text-orange-900/80 dark:text-orange-300 leading-relaxed">
                    Al cerrar turno, el cajero declara el dinero en mano sin ver el teórico del sistema. El sistema calcula diferencias y emite el informe fiscal/térmico.
                  </p>
                </div>
              </div>

              {/* Botón Finalizar Turno */}
              {activeShift.status === 'ABIERTO' ? (
                <button 
                  onClick={() => {
                    setBlindCashUsd('');
                    setBlindCashVes('');
                    setBlindSubmitted(false);
                    setIsCierreZModalOpen(true);
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold transition-all text-center shadow-lg shadow-slate-900/10 active:scale-98 cursor-pointer mt-4"
                >
                  Finalizar Turno (Cierre Z)
                </button>
              ) : (
                <button 
                  onClick={() => setIsOpenShiftModalOpen(true)}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-all text-center shadow-lg shadow-emerald-600/10 active:scale-98 cursor-pointer mt-4"
                >
                  Abrir Nuevo Turno de Caja
                </button>
              )}
            </div>

          </div>

          {/* Fila 2: Historial de Turnos de Caja Pasados */}
          <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200/80 dark:border-white/10 shadow-sm p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Historial de Turnos de Caja
                </h3>
                <p className="text-xs text-slate-500">
                  Registro de aperturas, cierres Z y diferencias de arqueo históricas.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 text-slate-400 font-extrabold">
                    <th className="py-3 px-3">Turno</th>
                    <th className="py-3 px-3">Cajero</th>
                    <th className="py-3 px-3">Apertura</th>
                    <th className="py-3 px-3">Cierre</th>
                    <th className="py-3 px-3">Ventas ($)</th>
                    <th className="py-3 px-3">Diferencia</th>
                    <th className="py-3 px-3">Estado</th>
                    <th className="py-3 px-3 text-right">Comprobante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-semibold text-slate-700 dark:text-slate-300">
                  {pastShifts.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">{s.id}</td>
                      <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">{s.cashier}</td>
                      <td className="py-3 px-3 text-slate-500">{s.openedAt}</td>
                      <td className="py-3 px-3 text-slate-500">{s.closedAt}</td>
                      <td className="py-3 px-3 font-black text-slate-900 dark:text-white">${s.totalSalesUsd.toFixed(2)}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          s.differenceUsd === 0 ? 'bg-emerald-100 text-emerald-700' :
                          s.differenceUsd > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {s.differenceUsd === 0 ? 'Cuadrado $0.00' : s.differenceUsd > 0 ? `+Sobrante $${s.differenceUsd.toFixed(2)}` : `-Faltante $${Math.abs(s.differenceUsd).toFixed(2)}`}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700">
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button 
                          onClick={() => {
                            setCompletedZReport({
                              id: s.id,
                              cashier: s.cashier,
                              openedAt: s.openedAt,
                              closedAt: s.closedAt,
                              totalSalesUsd: s.totalSalesUsd,
                              differenceUsd: s.differenceUsd
                            });
                          }}
                          className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1 rounded-lg transition-all cursor-pointer"
                        >
                          Ver Z
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================
          VISTA 3: CUENTAS POR COBRAR (/credits) — FASE 4 INTEGRAL
          ======================================================== */}
      {activeTab === 'credits' && (
        <div className="space-y-6 animate-in fade-in font-sans">
          
          {/* Header y Métricas de Cartera de Fiados */}
          <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200/80 dark:border-white/10 shadow-sm p-6 sm:p-7 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <CreditCard size={12} />
                  Libro de Fiados & Deudores (Fase 4)
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-2">
                  Cuentas por Cobrar Indexadas a BCV
                </h3>
                <p className="text-xs text-slate-500">
                  Gestión de deudas en divisas, abonos multimoneda y recordatorios automáticos por WhatsApp.
                </p>
              </div>

              <button 
                onClick={() => setIsNewCreditModalOpen(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-2 self-start sm:self-auto"
              >
                <Plus size={16} /> + Nuevo Crédito / Fiado
              </button>
            </div>

            {/* KPIs de Créditos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                <span className="text-[10px] font-bold text-slate-400 block">Cartera Total ($)</span>
                <h4 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                  ${credits.reduce((a,c) => a + c.totalDebt, 0).toFixed(2)}
                </h4>
                <span className="text-[10px] text-slate-400">Total financiado</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                <span className="text-[10px] font-bold text-slate-400 block">Saldo por Cobrar ($)</span>
                <h4 className="text-lg font-black text-orange-600 mt-1">
                  ${credits.reduce((a,c) => a + c.remaining, 0).toFixed(2)}
                </h4>
                <span className="text-[10px] text-orange-600 font-semibold">
                  {(credits.reduce((a,c) => a + c.remaining, 0) * bcvRate).toFixed(2)} Bs
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                <span className="text-[10px] font-bold text-slate-400 block">Total Recuperado ($)</span>
                <h4 className="text-lg font-black text-emerald-600 mt-1">
                  ${(credits.reduce((a,c) => a + c.totalDebt, 0) - credits.reduce((a,c) => a + c.remaining, 0)).toFixed(2)}
                </h4>
                <span className="text-[10px] text-emerald-600 font-semibold">Abonos cobrados</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                <span className="text-[10px] font-bold text-slate-400 block">Créditos Vencidos</span>
                <h4 className="text-lg font-black text-red-600 mt-1">
                  {credits.filter(c => c.status === 'VENCIDO').length} casos
                </h4>
                <span className="text-[10px] text-red-500 font-semibold">Cobro prioritario</span>
              </div>
            </div>

            {/* Tabla de Clientes con Deuda */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 text-slate-400 font-extrabold">
                    <th className="py-3 px-3">Cliente</th>
                    <th className="py-3 px-3">Documento</th>
                    <th className="py-3 px-3">Concepto</th>
                    <th className="py-3 px-3">Deuda Original</th>
                    <th className="py-3 px-3">Saldo Pendiente</th>
                    <th className="py-3 px-3">Equivalente BCV</th>
                    <th className="py-3 px-3">Vencimiento</th>
                    <th className="py-3 px-3">Estado</th>
                    <th className="py-3 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-semibold text-slate-700 dark:text-slate-300">
                  {credits.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-1.5">
                          <span>{c.customer}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">{c.doc}</td>
                      <td className="py-3 px-3 text-slate-500">{c.concept}</td>
                      <td className="py-3 px-3">${c.totalDebt.toFixed(2)}</td>
                      <td className="py-3 px-3 font-black text-orange-600">${c.remaining.toFixed(2)}</td>
                      <td className="py-3 px-3 text-slate-500">{(c.remaining * bcvRate).toFixed(2)} Bs</td>
                      <td className="py-3 px-3">{c.dueDate}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          c.status === 'PAGADO' ? 'bg-emerald-100 text-emerald-700' :
                          c.status === 'VENCIDO' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {c.remaining > 0 && (
                            <>
                              <button 
                                onClick={() => {
                                  setSelectedCreditForPayment(c);
                                  setCreditPaymentAmount(c.remaining.toFixed(2));
                                  setIsPaymentModalOpen(true);
                                }}
                                className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                              >
                                Abonar
                              </button>

                              <button 
                                onClick={() => {
                                  const text = `Hola ${c.customer}, te saludamos de AxonMarket. Te recordamos que tienes un saldo pendiente de $${c.remaining.toFixed(2)} (${(c.remaining * bcvRate).toFixed(2)} Bs a tasa BCV) por concepto de: "${c.concept}". Puedes realizar tu abono en caja o vía Pago Móvil. ¡Gracias!`;
                                  window.open(`https://wa.me/${c.phone}?text=${encodeURIComponent(text)}`, '_blank');
                                }}
                                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                                title="Enviar recordatorio de cobro por WhatsApp"
                              >
                                WhatsApp
                              </button>
                            </>
                          )}
                          {c.remaining === 0 && (
                            <span className="text-[10px] text-emerald-600 font-bold px-2 py-0.5 bg-emerald-50 rounded-lg">Solvente</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================
          VISTA 4: FACTURACIÓN Y LIBROS SENIAT (/invoicing) — FASE 4
          ======================================================== */}
      {activeTab === 'invoicing' && (
        <div className="space-y-6 animate-in fade-in font-sans">
          
          <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200/80 dark:border-white/10 shadow-sm p-6 sm:p-7 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  <Receipt size={12} />
                  Facturación Fiscal & Libros SENIAT (Fase 4)
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-2">
                  Control Fiscal e Impuestos (IVA 16% & IGTF 3%)
                </h3>
                <p className="text-xs text-slate-500">
                  Emisión de facturas fiscales, tickets de venta y notas de entrega conformes a la normativa venezolana.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button 
                  onClick={exportLibroVentasSeniat}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-2"
                >
                  <FileText size={15} /> Exportar Libro SENIAT (Excel / CSV)
                </button>
              </div>
            </div>

            {/* KPIs Fiscales */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                <span className="text-[10px] font-bold text-slate-400 block">Total Facturado ($)</span>
                <h4 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                  ${invoices.reduce((a,i) => a + i.totalUsd, 0).toFixed(2)}
                </h4>
                <span className="text-[10px] text-slate-400">Total mes en curso</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                <span className="text-[10px] font-bold text-slate-400 block">Total Facturado (Bs)</span>
                <h4 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                  {invoices.reduce((a,i) => a + i.totalVes, 0).toFixed(2)} Bs
                </h4>
                <span className="text-[10px] text-slate-400">Indexado a tasa BCV</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                <span className="text-[10px] font-bold text-slate-400 block">IVA 16% Débito Fiscal</span>
                <h4 className="text-lg font-black text-blue-600 mt-1">
                  ${invoices.reduce((a,i) => a + i.ivaUsd, 0).toFixed(2)}
                </h4>
                <span className="text-[10px] text-blue-600 font-semibold">Declaración quincenal</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                <span className="text-[10px] font-bold text-slate-400 block">IGTF 3% (Divisas)</span>
                <h4 className="text-lg font-black text-emerald-600 mt-1">
                  ${invoices.reduce((a,i) => a + i.igtfUsd, 0).toFixed(2)}
                </h4>
                <span className="text-[10px] text-emerald-600 font-semibold">Retención percibida</span>
              </div>
            </div>

            {/* Filtros de Tipo de Documento */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
              {['TODAS', 'FACTURA_FISCAL', 'TICKET_VENTA', 'NOTA_ENTREGA'].map(tp => (
                <button
                  key={tp}
                  onClick={() => setInvoiceFilter(tp)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    invoiceFilter === tp
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {tp === 'TODAS' ? 'Todos los Documentos' :
                   tp === 'FACTURA_FISCAL' ? 'Facturas Fiscales' :
                   tp === 'TICKET_VENTA' ? 'Tickets de Venta' : 'Notas de Entrega'}
                </button>
              ))}
            </div>

            {/* Tabla de Documentos Fiscales */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 text-slate-400 font-extrabold">
                    <th className="py-3 px-3">Número</th>
                    <th className="py-3 px-3">Tipo</th>
                    <th className="py-3 px-3">Cliente</th>
                    <th className="py-3 px-3">RIF / C.I.</th>
                    <th className="py-3 px-3">Fecha</th>
                    <th className="py-3 px-3">Base Imponible</th>
                    <th className="py-3 px-3">IVA (16%)</th>
                    <th className="py-3 px-3">Total ($)</th>
                    <th className="py-3 px-3">Total (Bs)</th>
                    <th className="py-3 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-semibold text-slate-700 dark:text-slate-300">
                  {invoices
                    .filter(i => invoiceFilter === 'TODAS' || i.type === invoiceFilter)
                    .map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">{inv.id}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            inv.type === 'FACTURA_FISCAL' ? 'bg-blue-100 text-blue-700' :
                            inv.type === 'TICKET_VENTA' ? 'bg-slate-100 text-slate-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {inv.type === 'FACTURA_FISCAL' ? 'Factura' : inv.type === 'TICKET_VENTA' ? 'Ticket' : 'Nota'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">{inv.customer}</td>
                        <td className="py-3 px-3 text-slate-500">{inv.doc}</td>
                        <td className="py-3 px-3 text-slate-500">{inv.date}</td>
                        <td className="py-3 px-3">${inv.taxableUsd.toFixed(2)}</td>
                        <td className="py-3 px-3 text-blue-600">${inv.ivaUsd.toFixed(2)}</td>
                        <td className="py-3 px-3 font-black text-slate-900 dark:text-white">${inv.totalUsd.toFixed(2)}</td>
                        <td className="py-3 px-3 text-slate-500">{inv.totalVes.toFixed(2)} Bs</td>
                        <td className="py-3 px-3 text-right">
                          <button 
                            onClick={() => setSelectedInvoiceForView(inv)}
                            className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1 rounded-lg transition-all cursor-pointer"
                          >
                            Ver / Imprimir
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================
          VISTA 4: PLAN MAESTRO (.MD)
          ======================================================== */}
      {activeTab === 'plan' && (
        <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-slate-200/80 dark:border-white/10 shadow-sm p-7 space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-orange-500 text-white shadow-xs">
                DOCUMENTO MAESTRO ACTIVO
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                Plan de Unificación: AxonPOS ➔ AxonMarket
              </h3>
              <p className="text-xs text-slate-500">
                Archivo oficial: <code>Presupuesto/docs/PLAN_MIGRACION_UNIFICADA_AXONPOS_AXONMARKET.md</code>
              </p>
            </div>
            
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 px-3 py-1 rounded-full">
              Fase 1 y 2 Operativas
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-orange-50/60 dark:bg-orange-500/10 border border-orange-200/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-orange-600">FASE 1</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-white px-2 py-0.5 rounded-full">Listo</span>
              </div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Sidebar Commercy Multinivel</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Menú con las 12 secciones exactas y submenús desplegables (Ventas, Inventario, Precios, Clientes).
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-orange-50/60 dark:bg-orange-500/10 border border-orange-200/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-orange-600">FASE 2</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-white px-2 py-0.5 rounded-full">Listo</span>
              </div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">POS Kiosco Estilo Commercy</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Catálogo visual táctil, tarjetas con badges, pedido actual con artículo libre y cobro multimoneda.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-orange-600">FASE 3</span>
                <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">En marcha</span>
              </div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Persistencia Offline & Hardware</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Cola local Dexie ante caídas de red, balanza de peso e impresión térmica ESC/POS directa.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL ARTÍCULO LIBRE (+ Artículo libre)
          ======================================================== */}
      {isFreeItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] shadow-2xl border border-slate-200 dark:border-white/10 p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Agregar Artículo Libre
              </h3>
              <button onClick={() => setIsFreeItemModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Descripción</label>
                <input 
                  type="text" 
                  placeholder="Ej: Recarga de saldo, Servicio técnico..."
                  value={freeItemName}
                  onChange={(e) => setFreeItemName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs outline-none focus:ring-2 focus:ring-orange-500/40 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Precio ($ USD)</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="0.00"
                  value={freeItemPrice}
                  onChange={(e) => setFreeItemPrice(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs outline-none focus:ring-2 focus:ring-orange-500/40 text-slate-900 dark:text-white"
                />
                {freeItemPrice && (
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Equivalente: {(parseFloat(freeItemPrice || 0) * bcvRate).toFixed(2)} Bs
                  </span>
                )}
              </div>
            </div>

            <button 
              onClick={addFreeItem}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-extrabold py-3 rounded-xl text-xs transition-all cursor-pointer"
            >
              Agregar al Carrito
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL COBRO MULTIMONEDA: PASARELA DE COBRO Y LIQUIDACIÓN (IMAGE 3)
          ======================================================== */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-[2rem] shadow-2xl border border-slate-200 dark:border-white/10 p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            
            {/* Encabezado del Modal con Ícono y Tasa Oficial */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 flex items-center justify-center text-orange-600 shrink-0">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                    Pasarela de Cobro y Liquidación
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Cobro Multimoneda (USD / VES) • Tasa Oficial BCV: Bs. {bcvRate.toFixed(2)} / USD
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsCheckoutOpen(false)}
                className="w-8 h-8 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
                title="Cerrar ventana"
              >
                ✕
              </button>
            </div>

            {/* Fila: Tipo de Documento Fiscal y Badge Tasa BCV (Image 3) */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDocumentType('FISCAL_INVOICE')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    documentType === 'FISCAL_INVOICE'
                      ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                      : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-50'
                  }`}
                >
                  <Printer size={13} />
                  <span>Factura Fiscal (SENIAT)</span>
                </button>

                <button
                  onClick={() => setDocumentType('DELIVERY_NOTE')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    documentType === 'DELIVERY_NOTE'
                      ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                      : 'bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-50'
                  }`}
                >
                  <FileText size={13} />
                  <span>Nota de Entrega</span>
                </button>
              </div>

              <div className="bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-xl text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 font-semibold">
                <span>Tasa BCV:</span>
                <strong className="text-orange-600 font-mono font-bold text-xs">Bs. {bcvRate.toFixed(2)}</strong>
                <span className="text-[10px] text-slate-400">/USD</span>
              </div>
            </div>

            {/* Banner Hero: TOTAL A COBRAR con Desglose Fiscal a la Derecha (Image 3) */}
            <div className="p-4 rounded-2xl border border-amber-200/90 dark:border-amber-500/30 bg-gradient-to-r from-white via-amber-50/40 to-amber-100/30 dark:from-zinc-900 dark:via-zinc-900 dark:to-amber-950/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-2xs">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  TOTAL A COBRAR
                </span>
                <div className="text-3xl font-black font-mono text-orange-600 leading-tight">
                  ${totalRequiredUsd.toFixed(2)}
                </div>
                <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  Bs. {totalRequiredVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              <div className="text-right text-xs space-y-0.5 text-slate-600 dark:text-slate-400 sm:border-l sm:border-amber-200/70 sm:pl-4 self-end sm:self-auto">
                <div className="flex justify-between sm:justify-end gap-3">
                  <span>Subtotal Neto:</span>
                  <strong className="font-mono text-slate-900 dark:text-white font-bold">${netSubtotalUsd.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between sm:justify-end gap-3">
                  <span>IVA Fiscal (16%):</span>
                  <strong className="font-mono text-slate-900 dark:text-white font-bold">${ivaGeneralUsd.toFixed(2)}</strong>
                </div>
                {igtfUsd > 0 && (
                  <div className="flex justify-between sm:justify-end gap-3 text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded">
                    <span>IGTF Divisas (3%):</span>
                    <strong className="font-mono">+${igtfUsd.toFixed(2)}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Sección: SELECCIONAR MEDIO DE PAGO (8 Métodos en 4x2 Grid) (Image 3) */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                SELECCIONAR MEDIO DE PAGO:
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'CASH_USD', label: 'Efectivo $', icon: DollarSign, cur: 'USD' },
                  { id: 'CASH_VES', label: 'Efectivo Bs.', icon: DollarSign, cur: 'VES' },
                  { id: 'PAGO_MOVIL', label: 'Pago Móvil', icon: Smartphone, cur: 'VES' },
                  { id: 'PUNTO_VENTA', label: 'Punto de Venta', icon: CreditCard, cur: 'VES' },
                  { id: 'ZELLE', label: 'Zelle ($)', icon: DollarSign, cur: 'USD' },
                  { id: 'TRANSFERENCIA', label: 'Transferencia', icon: Landmark, cur: 'VES' },
                  { id: 'CREDITO', label: 'Crédito Cuenta', icon: FileText, cur: 'USD' },
                  { id: 'BIOPAGO', label: 'Biopago BDV', icon: Smartphone, cur: 'VES' },
                ].map(m => {
                  const isSelected = selectedMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedMethod(m.id);
                        setTenderAmount('');
                      }}
                      className={`relative p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50/70 dark:bg-orange-500/15 text-orange-600 shadow-2xs'
                          : 'border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <m.icon size={15} className={isSelected ? 'text-orange-600' : 'text-slate-400'} />
                      <span className="truncate">{m.label}</span>
                      <span className={`absolute top-1 right-1.5 text-[9px] font-black ${
                        isSelected ? 'text-orange-600' : 'text-slate-400'
                      }`}>
                        {m.cur}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Conteo Rápido de Billetes Recibidos (USD o VES) (Image 3) */}
            {(selectedMethod === 'CASH_USD' || selectedMethod === 'CASH_VES') && (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Conteo Rápido de Billetes Recibidos ({selectedMethod === 'CASH_USD' ? 'USD $' : 'VES Bs.'}):
                  </span>
                  <button
                    onClick={() => setTenderAmount(suggestedAmount)}
                    className="px-2.5 py-0.5 rounded-lg border border-emerald-400 text-emerald-700 bg-emerald-50 text-[11px] font-extrabold hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    Monto Exacto ({suggestedAmount})
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 items-center">
                  {(selectedMethod === 'CASH_USD'
                    ? [1, 5, 10, 20, 50, 100]
                    : [10, 20, 50, 100, 200, 500]
                  ).map(denom => (
                    <button
                      key={denom}
                      onClick={() => {
                        const cur = parseFloat(tenderAmount) || 0;
                        setTenderAmount((cur + denom).toFixed(2));
                      }}
                      className="px-3 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-800 hover:bg-slate-100 text-xs font-bold font-mono text-slate-800 dark:text-slate-200 cursor-pointer shadow-2xs"
                    >
                      +{selectedMethod === 'CASH_USD' ? `$${denom}` : `Bs. ${denom}`}
                    </button>
                  ))}
                  <button
                    onClick={() => setTenderAmount('')}
                    className="px-3 py-1 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold cursor-pointer"
                  >
                    Borrar
                  </button>
                </div>
              </div>
            )}

            {/* Input Row: Monto a entregar, Banco, Referencia y Botón "+ Agregar Pago" (Image 3) */}
            <div className="flex flex-col sm:flex-row items-end gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-white/10">
              <div className="flex-1 w-full">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Monto a entregar ({methodCurrency}):
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder={suggestedAmount}
                  value={tenderAmount}
                  onChange={(e) => setTenderAmount(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddPayment(); }}
                  className="w-full px-3 py-2 text-base font-black font-mono rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500/40"
                />
              </div>

              {['PAGO_MOVIL', 'PUNTO_VENTA', 'ZELLE', 'TRANSFERENCIA'].includes(selectedMethod) && (
                <>
                  <div className="w-full sm:w-36">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Banco:
                    </label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-slate-800 dark:text-white outline-none"
                    >
                      <option value="">Seleccionar</option>
                      <option value="BDV">BDV (Venezuela)</option>
                      <option value="Banesco">Banesco</option>
                      <option value="Mercantil">Mercantil</option>
                      <option value="Provincial">BBVA Provincial</option>
                      <option value="Bancaribe">Bancaribe</option>
                      <option value="Zelle Bank">Zelle USA</option>
                    </select>
                  </div>

                  <div className="w-full sm:w-36">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Nº Referencia:
                    </label>
                    <input
                      type="text"
                      placeholder="Últimos 4 dígitos"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddPayment(); }}
                      className="w-full px-2.5 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </>
              )}

              <button
                onClick={handleAddPayment}
                className="w-full sm:w-auto px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-orange-500/20 active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
              >
                + Agregar Pago
              </button>
            </div>

            {/* Lista de Pagos Ingresados */}
            {payments.length > 0 && (
              <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                <span className="text-[11px] font-bold text-slate-500 block">Pagos Registrados:</span>
                {payments.map(p => (
                  <div key={p.id} className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs shadow-2xs">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-800 dark:text-white">{p.method.replace('_', ' ')}:</span>
                      <strong className="font-mono text-orange-600">
                        {p.currency === 'USD' ? `$${p.amountPaid.toFixed(2)}` : `Bs. ${p.amountPaid.toFixed(2)}`}
                      </strong>
                      {p.currency === 'VES' && (
                        <span className="text-[10px] text-slate-400 font-mono">(equiv. ${p.amountUsdEquivalent.toFixed(2)})</span>
                      )}
                      {p.referenceNumber && (
                        <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-1.5 py-0.2 rounded border border-blue-200">
                          Ref: #{p.referenceNumber}
                        </span>
                      )}
                      {p.appliesIgtf && (
                        <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1 rounded">
                          IGTF 3%
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemovePayment(p.id)}
                      className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors cursor-pointer"
                      title="Eliminar pago"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Banner de Estado: Resta por Cobrar vs Pago Completo (Image 3) */}
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
              isFullyPaid
                ? 'bg-emerald-50/80 dark:bg-emerald-500/10 border-emerald-400 text-emerald-800 dark:text-emerald-300'
                : 'bg-red-50/80 dark:bg-red-500/10 border-red-300 text-red-700 dark:text-red-300'
            }`}>
              <div className="flex items-center gap-2">
                {isFullyPaid ? (
                  <Check size={18} strokeWidth={3} className="text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle size={18} className="text-red-500 shrink-0" />
                )}
                <span className="text-xs font-black uppercase tracking-wide">
                  {isFullyPaid ? '¡Pago Completo!' : 'Resta por Cobrar:'}
                </span>
              </div>

              <div className="font-mono text-right">
                {isFullyPaid ? (
                  <div>
                    <span className="text-[11px] text-slate-500 mr-1.5">Vuelto:</span>
                    <strong className="text-base font-black text-emerald-700">
                      ${changeUsd.toFixed(2)}
                    </strong>
                    <span className="text-xs text-emerald-600 font-bold ml-1.5">
                      (Bs. {changeVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </span>
                  </div>
                ) : (
                  <div>
                    <strong className="text-base font-black text-red-600">
                      ${remainingDueUsd.toFixed(2)}
                    </strong>
                    <span className="text-xs text-red-500 font-bold ml-1.5">
                      (Bs. {remainingDueVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Pie de Página: Cancelar y Completar Venta e Imprimir (Image 3) */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-white/5">
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-slate-300 text-xs font-bold cursor-pointer transition-colors"
                disabled={isProcessingSale}
              >
                Cancelar
              </button>

              <button
                onClick={handleCompleteSale}
                disabled={!isFullyPaid || isProcessingSale}
                className={`px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-md ${
                  isFullyPaid && !isProcessingSale
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/25 active:scale-95 cursor-pointer'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600 cursor-not-allowed shadow-none'
                }`}
              >
                <Check size={14} strokeWidth={2.5} />
                <span>
                  {isProcessingSale ? 'Procesando e Imprimiendo...' : '✓ Completar Venta e Imprimir (Enter)'}
                </span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          MODAL DE TICKET FINALIZADO
          ======================================================== */}
      {completedSale && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 p-7 text-center space-y-4 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <Check size={28} strokeWidth={3} />
            </div>
            
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Venta Exitosa
            </h3>
            <p className="text-xs text-slate-500">
              Comprobante <b>{completedSale.invoiceNumber}</b> emitido y stock sincronizado.
            </p>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border text-left text-xs space-y-1 text-slate-600 dark:text-slate-400">
              <div className="flex justify-between">
                <span>Cliente:</span>
                <b className="text-slate-900 dark:text-white">{completedSale.customer}</b>
              </div>
              <div className="flex justify-between">
                <span>Total $:</span>
                <b className="text-slate-900 dark:text-white">${completedSale.totalUsd.toFixed(2)}</b>
              </div>
              <div className="flex justify-between">
                <span>Total Bs:</span>
                <b className="text-slate-900 dark:text-white">{completedSale.totalVes.toFixed(2)} Bs</b>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button 
                onClick={() => toast.success('Ticket enviado a impresora térmica (80mm)')}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer size={15} /> Imprimir Ticket
              </button>
              <button 
                onClick={() => setCompletedSale(null)}
                className="w-full text-slate-500 hover:text-slate-800 text-xs font-semibold py-2 cursor-pointer"
              >
                Nueva Venta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 1: SELECTOR Y CREACIÓN DE CLIENTES
          ======================================================== */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest block">Directorio</span>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Seleccionar Cliente</h3>
              </div>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {/* Buscador de clientes */}
            <div className="bg-slate-50 dark:bg-zinc-950 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 flex items-center gap-2">
              <Search size={14} className="text-slate-400" />
              <input 
                type="text"
                placeholder="Buscar por nombre o documento..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-slate-800 dark:text-white placeholder-slate-400 w-full"
              />
            </div>

            {/* Lista de clientes */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {customerList
                .filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.doc.includes(customerSearch))
                .map(c => (
                  <div 
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomer(c.name);
                      setIsCustomerModalOpen(false);
                      toast.success(`Cliente asignado: ${c.name}`);
                    }}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      selectedCustomer === c.name 
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-700 font-bold' 
                        : 'border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div>
                      <p className="font-extrabold">{c.name}</p>
                      <span className="text-[10px] text-slate-400">{c.doc} · {c.phone}</span>
                    </div>
                    {selectedCustomer === c.name && <Check size={14} className="text-orange-600" />}
                  </div>
                ))}
            </div>

            {/* Formulario rápido para nuevo cliente */}
            <div className="pt-3 border-t border-slate-100 dark:border-white/5 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 block">+ Registro Rápido</span>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="text" 
                  placeholder="Nombre y Apellido"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white outline-none"
                />
                <input 
                  type="text" 
                  placeholder="C.I. / RIF"
                  value={newCustDoc}
                  onChange={(e) => setNewCustDoc(e.target.value)}
                  className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white outline-none"
                />
              </div>
              <input 
                type="text" 
                placeholder="Teléfono móvil (WhatsApp)"
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white outline-none"
              />
              <button 
                onClick={() => {
                  if (!newCustName.trim()) { toast.error('Indique al menos el nombre'); return; }
                  const newObj = {
                    id: `cust-${Date.now()}`,
                    name: newCustName.trim(),
                    doc: newCustDoc.trim() || 'V-00000000',
                    phone: newCustPhone.trim() || '-'
                  };
                  setCustomerList(prev => [...prev, newObj]);
                  setSelectedCustomer(newObj.name);
                  setNewCustName('');
                  setNewCustDoc('');
                  setNewCustPhone('');
                  setIsCustomerModalOpen(false);
                  toast.success(`Cliente ${newObj.name} guardado y asignado`);
                }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Crear y Asignar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: SELECTOR DE LISTAS DE PRECIOS
          ======================================================== */}
      {isPriceListModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest block">Tarifas</span>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Lista de Precios</h3>
              </div>
              <button onClick={() => setIsPriceListModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              {[
                { label: 'Sin lista de prec...', title: 'Detal (PVP Base 100%)', mult: 1.0, desc: 'Precio al consumidor final sin descuentos' },
                { label: 'Mayor (-10%)', title: 'Precio al Mayor', mult: 0.90, desc: 'Aplica 10% de descuento en todos los ítems' },
                { label: 'Distribuidor (-18%)', title: 'Precio Distribuidor', mult: 0.82, desc: 'Aplica 18% de descuento para reventa' }
              ].map(pl => (
                <div
                  key={pl.label}
                  onClick={() => {
                    setSelectedPriceList(pl.label);
                    setPriceMultiplier(pl.mult);
                    setIsPriceListModalOpen(false);
                    toast.success(`Tarifa activa: ${pl.title}`);
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    selectedPriceList === pl.label
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10'
                      : 'border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white">{pl.title}</h4>
                    {selectedPriceList === pl.label && <Check size={14} className="text-orange-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{pl.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: HARDWARE, BALANZA E IMPRESORA TÉRMICA
          ======================================================== */}
      {isHardwareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 p-7 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest block">Dispositivos</span>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Hardware de Mostrador</h3>
              </div>
              <button onClick={() => setIsHardwareModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {/* Balanza Electrónica */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Balanza Electrónica RS-232 / USB</h4>
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Conectada y calibrada
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-mono font-black text-orange-600 bg-orange-100 dark:bg-orange-950/40 px-2.5 py-1 rounded-lg">
                    {hardwareConfig.scaleWeight} {hardwareConfig.scaleUnit}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => hardwareService.setSimulatedWeight(1.450)}
                  className="py-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-white hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Pesar 1.45 Kg
                </button>
                <button 
                  onClick={() => hardwareService.tareScale()}
                  className="py-1.5 bg-slate-200 dark:bg-zinc-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition-colors cursor-pointer"
                >
                  Tara (T)
                </button>
                <button 
                  onClick={() => hardwareService.zeroScale()}
                  className="py-1.5 bg-slate-200 dark:bg-zinc-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition-colors cursor-pointer"
                >
                  Cero (Z)
                </button>
              </div>

              <button 
                onClick={() => hardwareService.connectWebSerialScale()}
                className="w-full py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Vincular Balanza por Web Serial API
              </button>
            </div>

            {/* Impresora Térmica & Gaveta ESC/POS */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-3">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Impresora Térmica & Gaveta ESC/POS</h4>
              <div className="flex gap-2">
                {['80mm', '58mm'].map(sz => (
                  <button
                    key={sz}
                    onClick={() => setHardwareConfig(prev => ({ ...prev, printerSize: sz }))}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      hardwareConfig.printerSize === sz
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white'
                    }`}
                  >
                    Formato {sz}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={hardwareConfig.autoDrawer}
                  onChange={(e) => setHardwareConfig(prev => ({ ...prev, autoDrawer: e.target.checked }))}
                  className="rounded text-orange-500 focus:ring-orange-500"
                />
                <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                  Pulso automático a gaveta de dinero al cobrar
                </span>
              </label>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button 
                  onClick={() => hardwareService.openCashDrawer()}
                  className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition-colors cursor-pointer"
                >
                  Abrir Gaveta
                </button>
                <button 
                  onClick={() => hardwareService.printTestTicket(hardwareConfig.printerSize)}
                  className="py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Test ESC/POS
                </button>
              </div>
            </div>

            {/* Cola Offline Dexie IndexedDB */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Base de Datos Dexie (Offline-First)</h4>
                  <span className="text-[10px] text-slate-500">IndexedDB local protegida contra caídas de internet</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700">
                  {pendingSalesCount} pendientes
                </span>
              </div>

              <button 
                onClick={async () => {
                  const res = await offlineSyncManager.syncPendingSales();
                  const p = await offlineSyncManager.getPendingSales();
                  setPendingSalesCount(p.length);
                  if (res.synced === 0) toast.success('Cola Dexie al día. No hay ventas pendientes.');
                }}
                className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-extrabold rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Sincronizar Cola Dexie con Supabase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 4: ENTRADA DE DINERO A CAJA (FASE 3)
          ======================================================== */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block">Caja Chica</span>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">+ Entrada de Dinero</h3>
              </div>
              <button onClick={() => setIsEntryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Concepto / Motivo</label>
                <input 
                  type="text" 
                  placeholder="Ej: Cambio de sencillo, reposición..."
                  value={movConcept}
                  onChange={(e) => setMovConcept(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Moneda</label>
                  <select 
                    value={movCurrency}
                    onChange={(e) => setMovCurrency(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white font-bold outline-none"
                  >
                    <option value="USD">Dólares ($)</option>
                    <option value="VES">Bolívares (Bs)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Monto</label>
                  <input 
                    type="number"
                    step="0.01" 
                    placeholder="0.00"
                    value={movAmount}
                    onChange={(e) => setMovAmount(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                const num = parseFloat(movAmount);
                if (!movConcept.trim() || isNaN(num) || num <= 0) {
                  toast.error('Indique concepto y monto válido');
                  return;
                }
                const newMov = {
                  id: `mov-${Date.now()}`,
                  type: 'ENTRY',
                  concept: movConcept.trim(),
                  amount: num,
                  currency: movCurrency,
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                playBeep();
                setShiftMovements(prev => [newMov, ...prev]);
                setMovConcept('');
                setMovAmount('');
                setIsEntryModalOpen(false);
                toast.success('Entrada de dinero registrada en caja');
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
            >
              Registrar Entrada
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 5: RETIRO / EGRESO DE DINERO (FASE 3)
          ======================================================== */}
      {isExitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest block">Gasto Operativo</span>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">- Retiro / Egreso de Caja</h3>
              </div>
              <button onClick={() => setIsExitModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Concepto / Destino</label>
                <input 
                  type="text" 
                  placeholder="Ej: Pago de hielo, bolsas, transporte..."
                  value={movConcept}
                  onChange={(e) => setMovConcept(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-red-500/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Moneda</label>
                  <select 
                    value={movCurrency}
                    onChange={(e) => setMovCurrency(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white font-bold outline-none"
                  >
                    <option value="USD">Dólares ($)</option>
                    <option value="VES">Bolívares (Bs)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Monto</label>
                  <input 
                    type="number"
                    step="0.01" 
                    placeholder="0.00"
                    value={movAmount}
                    onChange={(e) => setMovAmount(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-red-500/40"
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                const num = parseFloat(movAmount);
                if (!movConcept.trim() || isNaN(num) || num <= 0) {
                  toast.error('Indique concepto y monto válido');
                  return;
                }
                const newMov = {
                  id: `mov-${Date.now()}`,
                  type: 'EXIT',
                  concept: movConcept.trim(),
                  amount: num,
                  currency: movCurrency,
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
                playBeep();
                setShiftMovements(prev => [newMov, ...prev]);
                setMovConcept('');
                setMovAmount('');
                setIsExitModalOpen(false);
                toast.success('Retiro de caja registrado');
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer shadow-md shadow-red-600/20"
            >
              Registrar Retiro
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 6: REPORTE DE CORTE X (TICKET TÉRMICO)
          ======================================================== */}
      {isCorteXModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-white/5">
              <div>
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest block">Cierre Parcial</span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Reporte Corte X</h3>
              </div>
              <button onClick={() => setIsCorteXModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {/* Simulación de Ticket Térmico 80mm */}
            <div className="p-4 bg-slate-50 dark:bg-black font-mono text-[11px] rounded-2xl border border-slate-200 dark:border-white/10 space-y-2 text-slate-800 dark:text-slate-300">
              <div className="text-center border-b border-dashed pb-2">
                <p className="font-bold text-xs uppercase tracking-wider">AXONMARKET · PUNTO DE VENTA</p>
                <p className="text-[10px] text-slate-500">CORTE X (INFORME PARCIAL)</p>
                <p className="text-[9px] text-slate-400 mt-1">{new Date().toLocaleString()}</p>
              </div>

              <div className="space-y-1 py-1">
                <div className="flex justify-between"><span>TURNO:</span><b>{activeShift.id}</b></div>
                <div className="flex justify-between"><span>CAJERO:</span><b>{activeShift.cashier}</b></div>
                <div className="flex justify-between"><span>APERTURA:</span><span>{activeShift.openedAt}</span></div>
              </div>

              <div className="border-t border-dashed pt-2 space-y-1">
                <p className="font-bold">DESGLOSE DE VENTAS:</p>
                <div className="flex justify-between"><span>Efectivo USD:</span><span>${activeShift.cashSalesUsd.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Efectivo VES:</span><span>{activeShift.cashSalesVes.toFixed(2)} Bs</span></div>
                <div className="flex justify-between"><span>Electrónico USD:</span><span>${activeShift.electronicSalesUsd.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>TOTAL VENTAS:</span><span>${activeShift.totalSalesUsd.toFixed(2)}</span></div>
              </div>

              <div className="border-t border-dashed pt-2 space-y-1">
                <p className="font-bold">EFECTIVO EN GAVETA:</p>
                <div className="flex justify-between"><span>Fondo Inicial $:</span><span>${activeShift.initialCashUsd.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-orange-600"><span>TOTAL $ ESPERADO:</span><span>${((activeShift?.initialCashUsd || 0) + (activeShift?.cashSalesUsd || 0) + shiftMovements.filter(m => m.type === 'ENTRY' && m.currency === 'USD').reduce((a,m)=>a+m.amount,0) - shiftMovements.filter(m => m.type === 'EXIT' && m.currency === 'USD').reduce((a,m)=>a+m.amount,0)).toFixed(2)}</span></div>
              </div>

              <div className="text-center pt-2 text-[9px] text-slate-400 border-t border-dashed">
                *** GAVETA PERMANECE ABIERTA ***
              </div>
            </div>

            <button 
              onClick={() => {
                toast.success('Reporte Corte X enviado a impresora térmica (80mm)');
                setIsCorteXModalOpen(false);
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer size={15} /> Imprimir Corte X
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 7: ARQUEO CIEGO Y CIERRE Z DEFINITIVO (FASE 3)
          ======================================================== */}
      {isCierreZModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 p-7 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest block">Fin de Jornada</span>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Arqueo Ciego y Cierre Z</h3>
              </div>
              <button onClick={() => setIsCierreZModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {!blindSubmitted ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-orange-50/70 dark:bg-orange-500/10 border border-orange-200 text-xs text-orange-950 dark:text-orange-300">
                  <p className="font-bold flex items-center gap-1.5 mb-1">
                    <AlertCircle size={14} className="text-orange-600" />
                    Procedimiento de Arqueo a Ciegas
                  </p>
                  Por normativa de control interno, cuenta físicamente el dinero en la gaveta y declara los montos reales sin consultar el sistema.
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Efectivo en Dólares ($) en Mano
                    </label>
                    <input 
                      type="number"
                      step="0.01" 
                      placeholder="0.00"
                      value={blindCashUsd}
                      onChange={(e) => setBlindCashUsd(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500/40"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Efectivo en Bolívares (Bs) en Mano
                    </label>
                    <input 
                      type="number"
                      step="0.01" 
                      placeholder="0.00"
                      value={blindCashVes}
                      onChange={(e) => setBlindCashVes(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-orange-500/40"
                    />
                  </div>
                </div>

                <button 
                  onClick={() => {
                    const u = parseFloat(blindCashUsd);
                    const v = parseFloat(blindCashVes);
                    if (isNaN(u) || isNaN(v)) {
                      toast.error('Declare los montos contados en $ y Bs');
                      return;
                    }
                    setBlindSubmitted(true);
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3.5 rounded-2xl text-xs transition-all shadow-md cursor-pointer"
                >
                  Verificar Cuadre de Caja
                </button>
              </div>
            ) : (
              // Paso 2: Comparación Teórico vs Declarado
              <div className="space-y-4">
                {(() => {
                  const declaredUsd = parseFloat(blindCashUsd) || 0;
                  const declaredVes = parseFloat(blindCashVes) || 0;
                  const theoreticalUsd = ((activeShift?.initialCashUsd || 0) + (activeShift?.cashSalesUsd || 0) + shiftMovements.filter(m => m.type === 'ENTRY' && m.currency === 'USD').reduce((a,m)=>a+m.amount,0) - shiftMovements.filter(m => m.type === 'EXIT' && m.currency === 'USD').reduce((a,m)=>a+m.amount,0));
                  const theoreticalVes = ((activeShift?.initialCashVes || 0) + (activeShift?.cashSalesVes || 0) + shiftMovements.filter(m => m.type === 'ENTRY' && m.currency === 'VES').reduce((a,m)=>a+m.amount,0) - shiftMovements.filter(m => m.type === 'EXIT' && m.currency === 'VES').reduce((a,m)=>a+m.amount,0));
                  const diffUsd = declaredUsd - theoreticalUsd;
                  const diffVes = declaredVes - theoreticalVes;

                  return (
                    <>
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3 text-xs">
                        <div className="flex justify-between items-center pb-2 border-b">
                          <span className="text-slate-500 font-bold">Concepto</span>
                          <span className="text-slate-500 font-bold">Dólares ($)</span>
                          <span className="text-slate-500 font-bold">Bolívares (Bs)</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Teórico Sistema:</span>
                          <b>${theoreticalUsd.toFixed(2)}</b>
                          <b>{theoreticalVes.toFixed(2)} Bs</b>
                        </div>
                        <div className="flex justify-between">
                          <span>Declarado Físico:</span>
                          <b>${declaredUsd.toFixed(2)}</b>
                          <b>{declaredVes.toFixed(2)} Bs</b>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t font-black">
                          <span>Diferencia:</span>
                          <span className={diffUsd === 0 ? 'text-emerald-600' : diffUsd > 0 ? 'text-blue-600' : 'text-red-600'}>
                            {diffUsd === 0 ? '$0.00 (Cuadrado)' : diffUsd > 0 ? `+$${diffUsd.toFixed(2)} (Sobrante)` : `-$${Math.abs(diffUsd).toFixed(2)} (Faltante)`}
                          </span>
                          <span className={diffVes === 0 ? 'text-emerald-600' : diffVes > 0 ? 'text-blue-600' : 'text-red-600'}>
                            {diffVes === 0 ? '0 Bs' : `${diffVes.toFixed(2)} Bs`}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={() => setBlindSubmitted(false)}
                          className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                        >
                          Recontar
                        </button>
                        <button 
                          onClick={() => {
                            const closedRecord = {
                              id: activeShift.id,
                              cashier: activeShift.cashier,
                              openedAt: activeShift.openedAt,
                              closedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · Hoy',
                              totalSalesUsd: activeShift.totalSalesUsd,
                              differenceUsd: diffUsd,
                              differenceVes: diffVes,
                              status: 'CERRADO'
                            };
                            setPastShifts(prev => [closedRecord, ...prev]);
                            setActiveShift(prev => ({ ...prev, status: 'CERRADO' }));
                            setIsCierreZModalOpen(false);
                            setCompletedZReport(closedRecord);
                            toast.success('Turno cerrado exitosamente con Cierre Z');
                          }}
                          className="flex-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-extrabold py-3 rounded-xl transition-all shadow-md cursor-pointer"
                        >
                          Confirmar Cierre Z
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 8: COMPROBANTE CIERRE Z DEFINITIVO (IMPRIMIBLE)
          ======================================================== */}
      {completedZReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 p-6 space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center mx-auto shadow-sm">
              <FileText size={22} />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Cierre Z Finalizado
              </h3>
              <p className="text-xs text-slate-500">
                Turno <b>{completedZReport.id}</b> archivado correctamente.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-black font-mono text-xs rounded-2xl border space-y-1 text-slate-700 dark:text-slate-300">
              <div className="flex justify-between"><span>Cajero:</span><b>{completedZReport.cashier}</b></div>
              <div className="flex justify-between"><span>Apertura:</span><span>{completedZReport.openedAt}</span></div>
              <div className="flex justify-between"><span>Cierre:</span><span>{completedZReport.closedAt}</span></div>
              <div className="flex justify-between"><span>Ventas Totales:</span><b>${completedZReport.totalSalesUsd.toFixed(2)}</b></div>
              <div className="flex justify-between pt-1 border-t">
                <span>Diferencia:</span>
                <b className={completedZReport.differenceUsd === 0 ? 'text-emerald-600' : 'text-red-600'}>
                  ${completedZReport.differenceUsd.toFixed(2)}
                </b>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button 
                onClick={() => toast.success('Cierre Z enviado a impresora térmica (80mm)')}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer size={15} /> Imprimir Cierre Z
              </button>
              <button 
                onClick={() => setCompletedZReport(null)}
                className="w-full text-slate-500 hover:text-slate-800 text-xs font-semibold py-1.5 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 9: APERTURA DE NUEVO TURNO
          ======================================================== */}
      {isOpenShiftModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block">Operaciones</span>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Abrir Nuevo Turno</h3>
              </div>
              <button onClick={() => setIsOpenShiftModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Nombre del Cajero</label>
                <input 
                  type="text" 
                  value={openCashier}
                  onChange={(e) => setOpenCashier(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Fondo Inicial ($)</label>
                  <input 
                    type="number"
                    step="0.01" 
                    value={openInitUsd}
                    onChange={(e) => setOpenInitUsd(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Fondo Inicial (Bs)</label>
                  <input 
                    type="number"
                    step="0.01" 
                    value={openInitVes}
                    onChange={(e) => setOpenInitVes(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white outline-none"
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                const u = parseFloat(openInitUsd) || 0;
                const v = parseFloat(openInitVes) || 0;
                const newShift = {
                  id: `SHIFT-${Date.now().toString().slice(-6)}`,
                  cashier: openCashier.trim() || 'Cajero 1',
                  openedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · Hoy',
                  initialCashUsd: u,
                  initialCashVes: v,
                  salesCount: 0,
                  totalSalesUsd: 0.00,
                  totalSalesVes: 0.00,
                  cashSalesUsd: 0.00,
                  cashSalesVes: 0.00,
                  electronicSalesUsd: 0.00,
                  status: 'ABIERTO'
                };
                setActiveShift(newShift);
                setShiftMovements([]);
                setIsOpenShiftModalOpen(false);
                toast.success(`Turno abierto para ${newShift.cashier}`);
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
            >
              Iniciar Turno
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 10: REGISTRAR NUEVO CRÉDITO / FIADO (FASE 4)
          ======================================================== */}
      {isNewCreditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 p-7 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest block">Financiamiento</span>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Otorgar Nuevo Crédito / Fiado</h3>
              </div>
              <button onClick={() => setIsNewCreditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Cliente</label>
                <input 
                  type="text" 
                  placeholder="Nombre y Apellido"
                  value={newCreditCust}
                  onChange={(e) => setNewCreditCust(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">C.I. / RIF</label>
                  <input 
                    type="text" 
                    value={newCreditDoc}
                    onChange={(e) => setNewCreditDoc(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Teléfono (WhatsApp)</label>
                  <input 
                    type="text" 
                    value={newCreditPhone}
                    onChange={(e) => setNewCreditPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Concepto / Mercadería</label>
                <input 
                  type="text" 
                  placeholder="Ej: Mercado quincenal, 2 bultos de harina..."
                  value={newCreditConcept}
                  onChange={(e) => setNewCreditConcept(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Monto ($ USD)</label>
                  <input 
                    type="number"
                    step="0.01" 
                    placeholder="0.00"
                    value={newCreditAmount}
                    onChange={(e) => setNewCreditAmount(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Fecha Límite Pago</label>
                  <input 
                    type="date" 
                    value={newCreditDueDate}
                    onChange={(e) => setNewCreditDueDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white outline-none"
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                const amt = parseFloat(newCreditAmount);
                if (!newCreditCust.trim() || isNaN(amt) || amt <= 0) {
                  toast.error('Indique nombre y monto válido');
                  return;
                }
                const newCredObj = {
                  id: `cred-${Date.now()}`,
                  customer: newCreditCust.trim(),
                  doc: newCreditDoc.trim() || 'V-00000000',
                  phone: newCreditPhone.trim() || '',
                  concept: newCreditConcept.trim() || 'Compra en mostrador',
                  totalDebt: amt,
                  remaining: amt,
                  dueDate: newCreditDueDate,
                  status: 'PENDIENTE'
                };
                playBeep();
                setCredits(prev => [newCredObj, ...prev]);
                setIsNewCreditModalOpen(false);
                setNewCreditAmount('');
                setNewCreditConcept('');
                toast.success(`Crédito de $${amt.toFixed(2)} asignado a ${newCredObj.customer}`);
              }}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-extrabold py-3 rounded-xl text-xs transition-colors cursor-pointer shadow-md shadow-orange-500/20"
            >
              Registrar Crédito
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 11: ABONAR A CRÉDITO EXISTENTE (FASE 4)
          ======================================================== */}
      {isPaymentModalOpen && selectedCreditForPayment && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 p-7 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block">Cobranza</span>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Abono a Crédito</h3>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border text-xs space-y-1">
              <div className="flex justify-between"><span>Cliente:</span><b>{selectedCreditForPayment.customer}</b></div>
              <div className="flex justify-between"><span>Saldo Actual:</span><b className="text-orange-600">${selectedCreditForPayment.remaining.toFixed(2)}</b></div>
              <div className="flex justify-between"><span>Equivalente:</span><span>{(selectedCreditForPayment.remaining * bcvRate).toFixed(2)} Bs</span></div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Monto a Abonar ($ USD)</label>
                <input 
                  type="number"
                  step="0.01" 
                  value={creditPaymentAmount}
                  onChange={(e) => setCreditPaymentAmount(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/40"
                />
                {creditPaymentAmount && (
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Equivalente: {(parseFloat(creditPaymentAmount || 0) * bcvRate).toFixed(2)} Bs
                  </span>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Forma de Pago</label>
                <select 
                  value={creditPaymentMethod}
                  onChange={(e) => setCreditPaymentMethod(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-white outline-none"
                >
                  <option value="CASH_USD">Efectivo en Dólares ($)</option>
                  <option value="PAGO_MOVIL">Pago Móvil (Bs)</option>
                  <option value="DEBIT_CARD">Punto de Venta / Débito</option>
                  <option value="CASH_VES">Efectivo en Bolívares (Bs)</option>
                </select>
              </div>
            </div>

            <button 
              onClick={() => {
                const pay = parseFloat(creditPaymentAmount);
                if (isNaN(pay) || pay <= 0) {
                  toast.error('Indique un monto de abono válido');
                  return;
                }
                const newRemaining = Math.max(0, selectedCreditForPayment.remaining - pay);
                const newStatus = newRemaining === 0 ? 'PAGADO' : selectedCreditForPayment.status;

                setCredits(prev => prev.map(c => {
                  if (c.id === selectedCreditForPayment.id) {
                    return { ...c, remaining: newRemaining, status: newStatus };
                  }
                  return c;
                }));

                playBeep();
                setIsPaymentModalOpen(false);
                toast.success(`Abono de $${pay.toFixed(2)} procesado. Saldo restante: $${newRemaining.toFixed(2)}`);
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-xl text-xs transition-colors cursor-pointer shadow-md shadow-emerald-600/20"
            >
              Confirmar Abono
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 12: DETALLE Y VISOR DE FACTURA FISCAL SENIAT (FASE 4)
          ======================================================== */}
      {selectedInvoiceForView && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/10 p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-white/5">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block">Documento Conforme</span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {selectedInvoiceForView.type === 'FACTURA_FISCAL' ? 'Factura Fiscal Digital' :
                   selectedInvoiceForView.type === 'TICKET_VENTA' ? 'Ticket de Venta Fiscal' : 'Nota de Entrega'}
                </h3>
              </div>
              <button onClick={() => setSelectedInvoiceForView(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {/* Simulación Documento SENIAT */}
            <div className="p-4 bg-slate-50 dark:bg-black font-mono text-[11px] rounded-2xl border space-y-2 text-slate-800 dark:text-slate-300">
              <div className="text-center border-b border-dashed pb-2">
                <p className="font-bold text-xs uppercase tracking-wider">AXONMARKET C.A.</p>
                <p className="text-[10px] text-slate-500">RIF: J-50192834-2</p>
                <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 mt-1">NÚMERO: {selectedInvoiceForView.id}</p>
                <p className="text-[9px] text-slate-400">FECHA: {selectedInvoiceForView.date}</p>
              </div>

              <div className="space-y-1 py-1">
                <div className="flex justify-between"><span>CLIENTE:</span><b>{selectedInvoiceForView.customer}</b></div>
                <div className="flex justify-between"><span>RIF / C.I.:</span><span>{selectedInvoiceForView.doc}</span></div>
                <div className="flex justify-between"><span>CONDICIÓN:</span><span>CONTADO</span></div>
              </div>

              <div className="border-t border-dashed pt-2 space-y-1">
                <div className="flex justify-between"><span>BASE IMPONIBLE (G 16%):</span><span>${selectedInvoiceForView.taxableUsd.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>MONTO EXENTO:</span><span>${selectedInvoiceForView.exemptUsd.toFixed(2)}</span></div>
                <div className="flex justify-between text-blue-600"><span>IVA (16.00%):</span><span>+${selectedInvoiceForView.ivaUsd.toFixed(2)}</span></div>
                {selectedInvoiceForView.igtfUsd > 0 && (
                  <div className="flex justify-between text-emerald-600"><span>IGTF PERCIBIDO (3%):</span><span>+${selectedInvoiceForView.igtfUsd.toFixed(2)}</span></div>
                )}
                <div className="flex justify-between font-black border-t pt-1 text-sm text-slate-900 dark:text-white">
                  <span>TOTAL A PAGAR ($):</span>
                  <span>${selectedInvoiceForView.totalUsd.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>TOTAL BOLÍVARES:</span>
                  <span>{selectedInvoiceForView.totalVes.toFixed(2)} Bs</span>
                </div>
              </div>

              <div className="text-center pt-2 text-[9px] text-slate-400 border-t border-dashed">
                DOCUMENTO TRIBUTARIO ELECTRÓNICO VALIDO SENIAT
              </div>
            </div>

            <button 
              onClick={() => {
                toast.success(`Documento ${selectedInvoiceForView.id} enviado a impresión térmica / fiscal`);
                setSelectedInvoiceForView(null);
              }}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer size={15} /> Imprimir Documento
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          MODALES MASTER CRÍTICOS (AXONPOS ➔ AXONMARKET)
          ======================================================== */}
      <CashShiftModal 
        isOpen={isCashShiftModalOpen}
        onClose={() => {
          setIsCashShiftModalOpen(false);
          if (location.pathname === '/shifts') {
            navigate('/pos');
          }
        }}
        bcvRate={bcvRate}
        storeName="AxonMarket Store"
      />

      <UserManagementModal
        isOpen={isUserManagementModalOpen}
        onClose={() => setIsUserManagementModalOpen(false)}
      />

      <BackupManagerModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
      />

    </div>
  );
}
