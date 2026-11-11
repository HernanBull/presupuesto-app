// ==============================================================================
// AXONMARKET & AXONPOS — Tutorial Interactivo y Guía Didáctica de Caja Maestra
// Sistema de Posicionamiento Inteligente Sin Superposición (Zero-Overlap)
// Compatible con Contenedor de Scroll Interno <main> y Pantallas Móviles
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, ArrowLeft, X, Sparkles, ShieldCheck, 
  HelpCircle, BookOpen, Check, Wallet, Calendar, 
  ArrowRightLeft, Receipt, Printer, DollarSign, Monitor,
  Landmark, CreditCard, ChevronDown, ChevronUp, Eye
} from 'lucide-react';

export const TUTORIAL_STEPS = [
  {
    id: 'bcv-rate',
    selector: '[data-tour="tour-bcv"]',
    title: '1. Tasa Oficial BCV en Vivo',
    subtitle: 'El ancla de cambio legal en Venezuela',
    badge: 'LEGAL BCV',
    icon: DollarSign,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <p>
          Refleja la <b>Tasa Oficial del Banco Central de Venezuela (BCV)</b> sincronizada al instante.
        </p>
        <p className="bg-amber-50 dark:bg-amber-500/10 p-2 rounded-xl border border-amber-200 dark:border-amber-500/20 text-amber-900 dark:text-amber-200 text-[11px]">
          ⚖️ <b>Norma SENIAT:</b> Toda conversión a Bolívares debe respaldarse obligatoriamente con esta tasa legal del día.
        </p>
      </div>
    )
  },
  {
    id: 'config-btn',
    selector: '[data-tour="tour-config"]',
    title: '2. Configurar Cajas & PINes (Control Maestro)',
    subtitle: 'Seguridad, personal y terminales de cobro',
    badge: 'SEGURIDAD & PINES',
    icon: ShieldCheck,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <p>Centro de control para la administración de tu negocio:</p>
        <div className="space-y-1 text-[11px]">
          <div>• <b>Personal & PINes:</b> Registras cajeros con PIN táctil de 4 dígitos y checklist de 21 permisos.</div>
          <div>• <b>Cajas Registradoras:</b> Creas cajas con código QR para cobrar desde cualquier teléfono o tablet.</div>
          <div>• <b>Libro de Auditoría:</b> Bitácora inmutable de quién creó cajas o cambió contraseñas.</div>
          <div>• <b>2FA Google Authenticator:</b> Si olvidas tu PIN Maestro, lo restableces con tu contraseña o con Google Auth.</div>
        </div>
      </div>
    )
  },
  {
    id: 'period-filter',
    selector: '[data-tour="tour-period"]',
    title: '3. Filtro de Período (Orden Contable)',
    subtitle: 'Audita hoy o cualquier fecha pasada',
    badge: 'FECHAS & FILTROS',
    icon: Calendar,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <p>Este selector gobierna todos los números e ingresos que ves en pantalla:</p>
        <div className="grid grid-cols-2 gap-1 text-[11px]">
          <span className="p-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg"><b>Hoy:</b> Ventas de la jornada activa.</span>
          <span className="p-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg"><b>Ayer:</b> Cuadre del día anterior.</span>
          <span className="p-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg"><b>7 Días:</b> Resumen semanal.</span>
          <span className="p-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg"><b>Día Específico:</b> Cualquier fecha histórica.</span>
        </div>
      </div>
    )
  },
  {
    id: 'open-shift',
    selector: '[data-tour="tour-shift"]',
    title: '4. Iniciar Turno (Abrir Caja del Día)',
    subtitle: 'Fondo de sencillo para dar vuelto',
    badge: 'GAVETA INICIAL',
    icon: Wallet,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <p>
          Cada mañana antes de facturar, el cajero presiona este botón para <b>Abrir Turno</b>.
        </p>
        <p className="bg-emerald-50 dark:bg-emerald-500/10 p-2 rounded-xl border border-emerald-200 dark:border-emerald-500/20 text-emerald-900 dark:text-emerald-300 text-[11px]">
          💵 Declara el <b>Fondo Inicial de Sencillo</b> (en $ y en Bolívares) en gaveta. El sistema lo sumará a las ventas para el cuadre exacto de la noche.
        </p>
      </div>
    )
  },
  {
    id: 'petty-cash',
    selector: '[data-tour="tour-pettycash"]',
    title: '5. Caja Chica (Gastos Menores)',
    subtitle: 'Registra salidas de efectivo sin descuadres',
    badge: 'GASTOS DE GAVETA',
    icon: ArrowRightLeft,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <p>
          ¿Tuviste que sacar efectivo para pagar hielo, bolsas, almuerzo del personal o compras urgentes?
        </p>
        <p className="bg-orange-50 dark:bg-orange-500/10 p-2 rounded-xl border border-orange-200 dark:border-orange-500/20 text-orange-950 dark:text-orange-200 text-[11px]">
          👉 Anota la salida aquí. Se restará del efectivo en gaveta automáticamente para que <b>nunca falte dinero en el arqueo final</b>.
        </p>
      </div>
    )
  },
  {
    id: 'fiscal-reports',
    selector: '[data-tour="tour-fiscal"]',
    title: '6. Reportes SENIAT: Corte X vs Cierre Z',
    subtitle: 'Diferencia legal indispensable',
    badge: 'NORMATIVA SENIAT',
    icon: Printer,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <div className="space-y-1 text-[11px]">
          <div>• <b>Corte X (Parcial):</b> Chequeo informativo durante el día para contar gaveta. <i>No borra memoria ni altera acumuladores</i>.</div>
          <div>• <b>Cierre Z (Definitivo):</b> Se emite <u>una sola vez al terminar la jornada</u>. Consolida ventas, IVA 16% e IGTF 3% para el Libro de Ventas.</div>
        </div>
        <p className="text-[10px] text-slate-400">
          Ambos se pueden imprimir en térmico (80mm), descargar en Word (.doc) o enviar por WhatsApp al contador.
        </p>
      </div>
    )
  },
  {
    id: 'consolidated-kpis',
    selector: '[data-tour="tour-kpis"]',
    title: '7. Efectivo Físico vs Dinero en Banco',
    subtitle: 'El secreto del cuadre bimonetario',
    badge: 'CONCILIACIÓN',
    icon: DollarSign,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <p className="text-slate-500 dark:text-zinc-400">
          En Venezuela el dinero entra por dos vías completamente distintas:
        </p>
        <div className="space-y-1 text-[11px]">
          <div className="p-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg text-emerald-900 dark:text-emerald-300">
            💵 <b>Efectivo Físico en Gaveta:</b> Billetes que debes tener en mano (USD y Bolívares en efectivo).
          </div>
          <div className="p-1.5 bg-sky-50 dark:bg-sky-500/10 rounded-lg text-sky-900 dark:text-sky-300">
            🏦 <b>Dinero Digital en Bancos:</b> Pago Móvil, Punto POS, Transferencias y Zelle.
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'method-breakdown',
    selector: '[data-tour="tour-method-breakdown"]',
    title: '8. Consolidación por Métodos de Pago',
    subtitle: 'Desglose exacto bimonetario canal por canal',
    badge: 'CANALES DE COBRO',
    icon: Landmark,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <p>
          Te muestra exactamente cuánto dinero ingresó por cada método con su cantidad de cobros:
        </p>
        <div className="grid grid-cols-2 gap-1 text-[11px]">
          <div className="p-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg text-emerald-900 dark:text-emerald-300 font-medium">
            💵 Efectivo USD & Bs.
          </div>
          <div className="p-1.5 bg-sky-50 dark:bg-sky-500/10 rounded-lg text-sky-900 dark:text-sky-300 font-medium">
            📲 Pago Móvil & POS
          </div>
          <div className="p-1.5 bg-purple-50 dark:bg-purple-500/10 rounded-lg text-purple-900 dark:text-purple-300 font-medium">
            🟣 Zelle Digital
          </div>
          <div className="p-1.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-900 dark:text-indigo-300 font-medium">
            🏛️ Transferencias
          </div>
        </div>
        <p className="text-[10px] text-slate-400">
          Es la herramienta clave para tu conciliación bancaria diaria: compara lo que dice tu banco contra cada tarjeta.
        </p>
      </div>
    )
  },
  {
    id: 'shift-monitor',
    selector: '[data-tour="tour-shift-monitor"]',
    title: '9. Monitor de Turnos y Cajas Registradoras',
    subtitle: 'Supervisión en vivo de gavetas y cajeros',
    badge: 'MONITOR EN VIVO',
    icon: Monitor,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <p>
          Panel de supervisión en tiempo real de cada punto de venta de tu negocio:
        </p>
        <div className="space-y-1 text-[11px]">
          <div>• <b>Cajeros Activos:</b> Conoce quién está operando cada caja y a qué hora abrió.</div>
          <div>• <b>Base Inicial en Gaveta:</b> Fondo de sencillo asignado al iniciar la jornada.</div>
          <div>• <b>Estado del Turno:</b> Muestra si la caja está <i>En Servicio</i> o <i>Cerrada</i> tras el arqueo.</div>
        </div>
      </div>
    )
  },
  {
    id: 'operations-audit',
    selector: '[data-tour="tour-operations-audit"]',
    title: '10. Arqueo de Operaciones & Cobros Desglosados',
    subtitle: 'Auditoría cronológica ticket a ticket',
    badge: 'AUDITORÍA DE VENTAS',
    icon: Receipt,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <p>
          Historial cronológico detallado de cada ticket y venta procesada en el período:
        </p>
        <div className="space-y-1 text-[11px]">
          <div>• <b>Métodos Combinados:</b> Si un cliente pagó mitad en $ y mitad en Pago Móvil, lo ves desglosado.</div>
          <div>• <b>Recibo & Comprobante:</b> Reimprime el ticket térmico o compártelo al cliente.</div>
          <div>• <b>Seguridad de Anulación:</b> Solo el Propietario con PIN Maestro puede anular ventas, registrándose en auditoría.</div>
        </div>
      </div>
    )
  }
];

export default function CashMasterTutorialOverlay({ isOpen, onClose }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [cardPlacement, setCardPlacement] = useState('bottom'); // 'bottom' | 'top'
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollTimeoutRef = useRef(null);

  const step = TUTORIAL_STEPS[currentStepIndex];

  // Actualizar posición del elemento seleccionado con desplazamiento inteligente
  useEffect(() => {
    if (!isOpen || !step) return;

    const findScrollContainer = () => {
      // En AxonPOS el layout utiliza <main className="flex-1 overflow-y-auto...">
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

      // Determinamos si el elemento está en la mitad superior o inferior del viewport
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
        // Reintentar si el elemento aún está cargando
        scrollTimeoutRef.current = setTimeout(scrollToTargetAndPosition, 80);
        return;
      }

      const scrollContainer = findScrollContainer();
      const elRect = el.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Decidimos la posición de la tarjeta:
      // Si el elemento está en la mitad superior -> tarjeta abajo
      // Si el elemento está en la mitad inferior -> tarjeta arriba
      const containerRect = scrollContainer.getBoundingClientRect ? scrollContainer.getBoundingClientRect() : { top: 0 };
      const relativeTop = elRect.top - containerRect.top;
      
      const shouldCardBeBottom = relativeTop < viewportHeight * 0.42;
      const placement = shouldCardBeBottom ? 'bottom' : 'top';
      setCardPlacement(placement);

      // Desplazamiento inteligente en el contenedor <main>:
      // Si la tarjeta está arriba (placement === 'top'):
      // Dejamos un espacio libre arriba de ~220px para la tarjeta didáctica.
      // Si la tarjeta está abajo (placement === 'bottom'):
      // El elemento debe quedar en el tercio superior (~80px).
      const desiredViewportTop = placement === 'top' 
        ? Math.max(200, Math.min(260, viewportHeight * 0.35)) 
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

      // Varios chequeos para sincronizar el spotlight con el movimiento suave
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

    // Escuchamos el evento de scroll en fase de captura para que detecte el scroll de <main>
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
    if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
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
    localStorage.setItem('hasSeenCashMasterTour', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-auto animate-in fade-in duration-200">
      
      {/* ========================================================
          MÁSCARA SVG DE SPOTLIGHT (RECORTE NÍTIDO 100% TRANSPARENTE)
          El elemento señalado queda totalmente visible e iluminado.
          ======================================================== */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-40">
        <defs>
          <mask id="tutorial-spotlight-mask">
            {/* 1. Capa blanca que cubre toda la pantalla */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            
            {/* 2. Recorte transparente (negro en la máscara) donde está el elemento */}
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

        {/* Fondo oscuro semitransparente que respeta el hueco transparente del elemento */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.78)"
          mask="url(#tutorial-spotlight-mask)"
        />
      </svg>

      {/* Recuadro Luminoso Neón Naranja alrededor del Elemento Descubierto */}
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
          {/* Pulso de señalización */}
          <span className="absolute -inset-1 rounded-2xl border-2 border-orange-400 animate-ping opacity-60 pointer-events-none" />
          
          {/* Badge superior indicando la función */}
          <span className="absolute -top-3 left-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
            <Sparkles size={10} />
            <span>{step.badge}</span>
          </span>
        </div>
      )}

      {/* FLECHA ANIMADA SEÑALIZADORA (POINTER ARROW) */}
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
              // Tarjeta está abajo -> Flecha apunta hacia arriba hacia el elemento
              <div className="w-0 h-0 border-x-8 border-x-transparent border-b-12 border-b-orange-500 drop-shadow-[0_2px_10px_rgba(255,107,0,1)]" />
            ) : (
              // Tarjeta está arriba -> Flecha apunta hacia abajo hacia el elemento
              <div className="w-0 h-0 border-x-8 border-x-transparent border-t-12 border-t-orange-500 drop-shadow-[0_2px_10px_rgba(255,107,0,1)]" />
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TARJETA DIDÁCTICA DOCKED (TOP O BOTTOM)
          Garantiza CERO superposición con el elemento señalado
          En móvil: bottom respeta el bottom navigation bar (72px)
          ======================================================== */}
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
          
          {/* Cabecera del Paso */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-white/5 pb-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                <step.icon size={16} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase text-orange-500 tracking-wider block">
                  Paso {currentStepIndex + 1} de {TUTORIAL_STEPS.length}
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

          {/* Cuerpo Explicativo (Colapsable si el comerciante quiere ver la pantalla completa) */}
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

          {/* Barra de Progreso y Navegación */}
          <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2">
            
            {/* Indicador de Bolitas / Progreso */}
            <div className="flex items-center gap-1">
              {TUTORIAL_STEPS.map((s, idx) => (
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

            {/* Botones Anterior / Siguiente */}
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
                <span>{currentStepIndex === TUTORIAL_STEPS.length - 1 ? '¡Finalizar!' : 'Siguiente'}</span>
                {currentStepIndex < TUTORIAL_STEPS.length - 1 && <ArrowRight size={12} />}
                {currentStepIndex === TUTORIAL_STEPS.length - 1 && <Check size={12} />}
              </button>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
}
