// ==============================================================================
// AXONMARKET & AXONPOS — Tutorial Interactivo del Libro de Ventas Fiscal SENIAT
// Guía Didáctica Contable según Ley del IVA, Providencia 00071 e IGTF 3%
// Compatible con Contenedor de Scroll Interno <main> y Pantallas Móviles
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, ArrowLeft, X, Sparkles, FileSpreadsheet, 
  HelpCircle, BookOpen, Check, Printer, Download, 
  Calendar, Landmark, Percent, ChevronDown, ChevronUp,
  Receipt, Scale
} from 'lucide-react';

export const FISCAL_BOOK_TUTORIAL_STEPS = [
  {
    id: 'fiscal-header',
    selector: '[data-tour="tour-fiscal-header"]',
    title: '1. Libro de Ventas Fiscal SENIAT',
    subtitle: 'Registro tributario obligatorio de ley en Venezuela',
    badge: 'NORMA SENIAT',
    icon: FileSpreadsheet,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <p>
          Este módulo genera el <b>Libro de Ventas Fiscal</b> exigido por el Reglamento de la Ley del IVA (Art. 56 y 70) y la Providencia Administrativa SNAT/2011/00071.
        </p>
        <p className="bg-amber-50 dark:bg-amber-500/10 p-2 rounded-xl border border-amber-200 dark:border-amber-500/20 text-amber-900 dark:text-amber-200 text-[11px]">
          ⚖️ <b>Validez Jurídica:</b> Agrupa cronológicamente todas las operaciones de venta del comercio, calculando la base imponible, el Débito Fiscal y el IGTF.
        </p>
      </div>
    )
  },
  {
    id: 'fiscal-actions',
    selector: '[data-tour="tour-fiscal-actions"]',
    title: '2. Exportar CSV e Imprimir SENIAT',
    subtitle: 'Entrega directa para tu Contador Público',
    badge: 'REPORTES OFICIALES',
    icon: Printer,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <div className="space-y-1 text-[11px]">
          <div>• <b>Exportar CSV:</b> Descarga un archivo compatible con Microsoft Excel y con software contable venezolano (Galac, Saint, Valery, Premium Soft) para declarar el IVA quincenal o mensual.</div>
          <div>• <b>Imprimir SENIAT:</b> Genera el formato oficial apaisado (Landscape) con membrete, RIF, número de control y cuadro de totales listo para fiscalizaciones.</div>
        </div>
      </div>
    )
  },
  {
    id: 'fiscal-dates',
    selector: '[data-tour="tour-fiscal-dates"]',
    title: '3. Período Fiscal (Desde / Hasta)',
    subtitle: 'Audita quincenas o meses fiscales',
    badge: 'RANGO FISCAL',
    icon: Calendar,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <p>
          Selecciona las fechas que deseas auditar o declarar:
        </p>
        <div className="space-y-1 text-[11px]">
          <div>• <b>Contribuyentes Especiales:</b> Quincena del 1 al 15, o del 16 al último día del mes.</div>
          <div>• <b>Contribuyentes Ordinarios:</b> Mes calendario completo del día 1 al 30/31.</div>
        </div>
      </div>
    )
  },
  {
    id: 'fiscal-filters',
    selector: '[data-tour="tour-fiscal-filters"]',
    title: '4. Filtros: Facturas vs Notas de Entrega',
    subtitle: 'Separación contable de documentos',
    badge: 'TIPOS DE DOCUMENTO',
    icon: Scale,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <div className="space-y-1 text-[11px]">
          <div>• <b>Todos:</b> Muestra el universo completo de operaciones del negocio.</div>
          <div>• <b>Solo Facturas:</b> Filtra únicamente comprobantes fiscales válidos con IVA para la Declaración de Ventas (Forma 30).</div>
          <div>• <b>Notas de Entrega:</b> Registros de despacho previos a la facturación formal.</div>
        </div>
      </div>
    )
  },
  {
    id: 'fiscal-kpi-sales',
    selector: '[data-tour="tour-fiscal-kpi-sales"]',
    title: '5. Total Ventas & Débito Fiscal IVA 16%',
    subtitle: 'Base Imponible de la Alícuota General',
    badge: 'DÉBITO FISCAL',
    icon: Percent,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <div className="space-y-1 text-[11px]">
          <div className="p-1.5 bg-slate-900 text-white rounded-lg">
            📊 <b>Total Ventas Facturadas:</b> Monto bruto total en Bolívares y Dólares con IVA incluido.
          </div>
          <div className="p-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg text-emerald-900 dark:text-emerald-300">
            💚 <b>Débito Fiscal IVA 16%:</b> Es el IVA cobrado que debes enterar al SENIAT al restar tus Créditos Fiscales de compras.
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'fiscal-kpi-igtf',
    selector: '[data-tour="tour-fiscal-kpi-igtf"]',
    title: '6. Ventas Exentas & IGTF 3% en Divisas',
    subtitle: 'Cumplimiento de la Ley del IGTF en divisas',
    badge: 'EXENTOS & IGTF',
    icon: Landmark,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <div className="space-y-1 text-[11px]">
          <div className="p-1.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg text-blue-900 dark:text-blue-300">
            💙 <b>Ventas Exentas (0%):</b> Artículos exentos por ley (pan, leche, carne cruda, harinas, medicinas básicas).
          </div>
          <div className="p-1.5 bg-amber-50 dark:bg-amber-500/10 rounded-lg text-amber-900 dark:text-amber-300">
            🟠 <b>IGTF 3% Divisas:</b> Impuesto del 3% percibido automáticamente al cobrar en Efectivo USD o Zelle, tal como exige la providencia de Sujetos Pasivos Especiales.
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'fiscal-table',
    selector: '[data-tour="tour-fiscal-table"]',
    title: '7. Detalle Correlativo de Comprobantes',
    subtitle: 'Auditoría cronológica ticket a ticket',
    badge: 'CORRELATIVO OFICIAL',
    icon: Receipt,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <p>
          Tabla exigida por fiscalización:
        </p>
        <p className="text-[11px] text-slate-500 dark:text-zinc-400">
          Refleja el correlativo consecutivo, fecha, RIF o Cédula, Razón Social, Nº de Factura, Nº de Control, Base Imponible 16%, Débito Fiscal e IGTF percibido.
        </p>
      </div>
    )
  }
];

export default function FiscalSalesBookTutorialOverlay({ isOpen, onClose }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [cardPlacement, setCardPlacement] = useState('bottom');
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollTimeoutRef = useRef(null);

  const step = FISCAL_BOOK_TUTORIAL_STEPS[currentStepIndex];

  useEffect(() => {
    if (!isOpen || !step) return;

    const findScrollContainer = () => {
      return document.querySelector('main') || document.documentElement;
    };

    const updatePosition = () => {
      const el = document.querySelector(step.selector);
      if (!el) {
        setTargetRect(null);
        return;
      }

      const rect = el.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      const elCenterY = rect.top + rect.height / 2;
      const shouldCardBeBottom = elCenterY < viewportHeight * 0.45;
      const placement = shouldCardBeBottom ? 'bottom' : 'top';
      setCardPlacement(placement);

      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right
      });
    };

    const scrollToTargetAndPosition = () => {
      const el = document.querySelector(step.selector);
      if (!el) {
        scrollTimeoutRef.current = setTimeout(scrollToTargetAndPosition, 80);
        return;
      }

      const scrollContainer = findScrollContainer();
      const elRect = el.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      const containerRect = scrollContainer.getBoundingClientRect ? scrollContainer.getBoundingClientRect() : { top: 0 };
      const relativeTop = elRect.top - containerRect.top;
      
      const shouldCardBeBottom = relativeTop < viewportHeight * 0.42;
      const placement = shouldCardBeBottom ? 'bottom' : 'top';
      setCardPlacement(placement);

      const desiredViewportTop = placement === 'top' 
        ? Math.max(190, Math.min(250, viewportHeight * 0.35)) 
        : 85;

      const currentScrollTop = scrollContainer.scrollTop || window.scrollY || 0;
      const deltaY = elRect.top - desiredViewportTop;
      const targetScroll = Math.max(0, currentScrollTop + deltaY);

      if (scrollContainer.scrollTo) {
        scrollContainer.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      updatePosition();
      const t1 = setTimeout(updatePosition, 100);
      const t2 = setTimeout(updatePosition, 250);
      const t3 = setTimeout(updatePosition, 450);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    };

    const cleanupTimers = scrollToTargetAndPosition();

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      if (cleanupTimers) cleanupTimers();
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, currentStepIndex, step]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStepIndex < FISCAL_BOOK_TUTORIAL_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleFinish = () => {
    localStorage.setItem('hasSeenFiscalBookTour', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-auto animate-in fade-in duration-200">
      
      {/* Máscara Spotlight Nítida 100% Transparente */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-40">
        <defs>
          <mask id="fiscal-book-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={Math.max(2, targetRect.left - 6)}
                y={Math.max(2, targetRect.top - 6)}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="18"
                ry="18"
                fill="black"
              />
            )}
          </mask>
        </defs>

        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.78)"
          mask="url(#fiscal-book-spotlight-mask)"
        />
      </svg>

      {/* Recuadro Luminoso Neón Naranja */}
      {targetRect && (
        <div 
          className="absolute border-2 border-orange-500 rounded-2xl shadow-[0_0_25px_rgba(255,107,0,0.9)] transition-all duration-300 pointer-events-none z-50"
          style={{
            top: Math.max(2, targetRect.top - 6),
            left: Math.max(2, targetRect.left - 6),
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        >
          <span className="absolute -inset-1 rounded-2xl border-2 border-orange-400 animate-ping opacity-60 pointer-events-none" />
          <span className="absolute -top-3 left-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
            <Sparkles size={10} />
            <span>{step.badge}</span>
          </span>
        </div>
      )}

      {/* Flecha Animada Señalizadora */}
      {targetRect && (
        <div 
          className="absolute z-50 transition-all duration-300 pointer-events-none flex items-center justify-center"
          style={{
            left: Math.min(window.innerWidth - 60, Math.max(20, targetRect.left + (targetRect.width / 2) - 16)),
            top: cardPlacement === 'bottom'
              ? Math.min(window.innerHeight - 50, targetRect.bottom + 8)
              : Math.max(8, targetRect.top - 36)
          }}
        >
          <div className="flex flex-col items-center animate-bounce">
            {cardPlacement === 'bottom' ? (
              <div className="w-0 h-0 border-x-8 border-x-transparent border-b-12 border-b-orange-500 drop-shadow-[0_2px_10px_rgba(255,107,0,1)]" />
            ) : (
              <div className="w-0 h-0 border-x-8 border-x-transparent border-t-12 border-t-orange-500 drop-shadow-[0_2px_10px_rgba(255,107,0,1)]" />
            )}
          </div>
        </div>
      )}

      {/* Tarjeta Didáctica Flotante */}
      <div 
        className="fixed z-50 w-full max-w-sm sm:max-w-md px-3 transition-all duration-300 pointer-events-auto"
        style={{
          left: '50%',
          transform: 'translateX(-50%)',
          ...(cardPlacement === 'bottom'
            ? { bottom: '72px' }
            : { top: '16px' }
          )
        }}
      >
        <div className="bg-white/95 dark:bg-zinc-900/95 border-2 border-orange-500 rounded-3xl p-4 shadow-2xl space-y-2.5 backdrop-blur-md">
          
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-white/5 pb-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                <step.icon size={16} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase text-orange-500 tracking-wider block">
                  Paso {currentStepIndex + 1} de {FISCAL_BOOK_TUTORIAL_STEPS.length}
                </span>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight truncate">
                  {step.title}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                title={isMinimized ? 'Desplegar explicación' : 'Minimizar tarjeta'}
              >
                {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              <button
                onClick={handleFinish}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Cerrar tutorial"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              <p className="text-[10px] font-bold text-slate-500 dark:text-zinc-400">
                {step.subtitle}
              </p>

              <div className="max-h-36 overflow-y-auto custom-scrollbar pr-1">
                {step.content}
              </div>
            </>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {FISCAL_BOOK_TUTORIAL_STEPS.map((s, idx) => (
                <div
                  key={s.id}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === currentStepIndex
                      ? 'w-4 bg-orange-500'
                      : idx < currentStepIndex
                        ? 'w-1.5 bg-emerald-500'
                        : 'w-1.5 bg-slate-200 dark:bg-zinc-700'
                  }`}
                  title={s.title}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {currentStepIndex > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                >
                  <ArrowLeft size={12} />
                  <span>Atrás</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="px-3.5 py-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black rounded-xl shadow-md shadow-orange-500/25 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
              >
                <span>{currentStepIndex === FISCAL_BOOK_TUTORIAL_STEPS.length - 1 ? '¡Finalizar!' : 'Siguiente'}</span>
                {currentStepIndex < FISCAL_BOOK_TUTORIAL_STEPS.length - 1 && <ArrowRight size={12} />}
                {currentStepIndex === FISCAL_BOOK_TUTORIAL_STEPS.length - 1 && <Check size={12} />}
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
