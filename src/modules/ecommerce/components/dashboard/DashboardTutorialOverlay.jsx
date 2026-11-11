// ==============================================================================
// AXONMARKET & AXONPOS — Tutorial Interactivo y Guía Didáctica de Inicio (Dashboard)
// Sistema de Posicionamiento Inteligente Sin Superposición (Zero-Overlap)
// Compatible con Contenedor de Scroll Interno <main> y Pantallas Móviles
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, ArrowLeft, X, Sparkles, Store, 
  HelpCircle, BookOpen, Check, ShoppingCart, Wallet, 
  DollarSign, TrendingUp, Users, ChevronDown, ChevronUp,
  LayoutDashboard, Bell, Eye
} from 'lucide-react';

export const DASHBOARD_TUTORIAL_STEPS = [
  {
    id: 'dash-greeting',
    selector: '[data-tour="tour-dash-greeting"]',
    title: '1. ¡Bienvenido a tu Panel de Control!',
    subtitle: 'El centro neurálgico de tu comercio',
    badge: 'PANEL PRINCIPAL',
    icon: Store,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <p>
          Desde aquí supervisas en vivo la salud financiera y operativa de tu negocio.
        </p>
        <div className="space-y-1 text-[11px]">
          <div>• <b>Nombre de tu Tienda:</b> Con botón para previsualizar tu Vitrina Web tal como la ven tus clientes.</div>
          <div>• <b>Campanita 🔔:</b> Avisos de nuevos pedidos y alertas de inventario bajo.</div>
          <div>• <b>Ícono del Ojo 👁️:</b> Modo discreto para ocultar montos y cuidar tu privacidad ante clientes.</div>
        </div>
      </div>
    )
  },
  {
    id: 'dash-rate',
    selector: '[data-tour="tour-dash-rate"]',
    title: '2. Tasa Oficial BCV del Día',
    subtitle: 'Cotización legal sincronizada al segundo',
    badge: 'LEGAL BCV',
    icon: DollarSign,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <p>
          Muestra en tiempo real la <b>Tasa Oficial del Banco Central de Venezuela (BCV)</b>.
        </p>
        <p className="bg-amber-50 dark:bg-amber-500/10 p-2 rounded-xl border border-amber-200 dark:border-amber-500/20 text-amber-900 dark:text-amber-200 text-[11px]">
          ⚖️ <b>Cumplimiento SENIAT:</b> Todos tus cobros bimonetarios en Bolívares y Dólares se calculan automáticamente con esta tasa sin que debas calcular a mano.
        </p>
      </div>
    )
  },
  {
    id: 'dash-period',
    selector: '[data-tour="tour-dash-period"]',
    title: '3. Selector de Ventas: Hoy vs Este Mes',
    subtitle: 'Alterna entre el día actual y el acumulado',
    badge: 'PERÍODOS',
    icon: TrendingUp,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <p>
          Con un solo toque puedes cambiar la vista de ingresos:
        </p>
        <div className="grid grid-cols-2 gap-1 text-[11px]">
          <div className="p-1.5 bg-orange-50 dark:bg-orange-500/10 rounded-lg text-orange-900 dark:text-orange-300 font-medium">
            📅 <b>Hoy:</b> Ventas de la jornada activa de trabajo.
          </div>
          <div className="p-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg text-slate-800 dark:text-zinc-200 font-medium">
            📈 <b>Este Mes:</b> Acumulado total mensual facturado.
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'dash-hero',
    selector: '[data-tour="tour-dash-hero"]',
    title: '4. Vendiste Hoy (Bimonetario)',
    subtitle: 'El termómetro de ingresos de tu negocio',
    badge: 'INGRESOS TOTALES',
    icon: DollarSign,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <p>
          Visualizas tu facturación en <b>Dólares ($)</b> y su <b>equivalente en Bolívares (Bs.)</b> en tiempo real.
        </p>
        <p className="bg-emerald-50 dark:bg-emerald-500/10 p-2 rounded-xl border border-emerald-200 dark:border-emerald-500/20 text-emerald-900 dark:text-emerald-300 text-[11px]">
          🚀 <b>Comparador Inteligente:</b> Te muestra el porcentaje de crecimiento respecto al día anterior para saber si vas superando tus metas.
        </p>
      </div>
    )
  },
  {
    id: 'dash-actions',
    selector: '[data-tour="tour-dash-actions"]',
    title: '5. Botones de Acción Rápida',
    subtitle: 'Cobrar y gestionar caja en un clic',
    badge: 'ACCIONES RÁPIDAS',
    icon: ShoppingCart,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <div className="space-y-1 text-[11px]">
          <div>• <b>Nueva Venta:</b> Abre el <i>Punto de Venta POS</i> para emitir tickets táctiles rápidos con lector de código de barras.</div>
          <div>• <b>Caja Maestra:</b> Abre el control maestro para iniciar turnos, registrar base de sencillo, gastos de caja chica y arqueo.</div>
          <div>• <b>Botón Más (...):</b> Atajos directos a inventario, catálogo y reportes.</div>
        </div>
      </div>
    )
  },
  {
    id: 'dash-metrics',
    selector: '[data-tour="tour-dash-metrics"]',
    title: '6. Hoy en Números (Métricas Operativas)',
    subtitle: 'Monitorea tus pedidos y rendimiento',
    badge: 'OPERACIONES',
    icon: LayoutDashboard,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <p>Tres indicadores de rendimiento fundamentales:</p>
        <div className="space-y-1 text-[11px]">
          <div>• <b>Pedidos:</b> Pedidos activos por despachar y entregar.</div>
          <div>• <b>Ticket Promedio:</b> Promedio de dinero que gasta cada cliente en una compra.</div>
          <div>• <b>Clientes Nuevos:</b> Cantidad de compradores registrados en tu base de datos comercial este mes.</div>
        </div>
      </div>
    )
  },
  {
    id: 'dash-nav',
    selector: '[data-tour="tour-dash-nav"], nav.fixed.bottom-0, [data-tour="tour-dash-nav-desktop"]',
    title: '7. Menú de Navegación',
    subtitle: 'Todo tu negocio en la punta de tus dedos',
    badge: 'NAVEGACIÓN',
    icon: Check,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <p>Muévete fácilmente entre los módulos de AxonPOS:</p>
        <div className="grid grid-cols-2 gap-1 text-[11px]">
          <span className="p-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg">🏠 <b>Inicio:</b> Este panel.</span>
          <span className="p-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg">🛒 <b>POS:</b> Cobro táctil.</span>
          <span className="p-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg">📋 <b>Órdenes:</b> Despacho.</span>
          <span className="p-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg">📦 <b>Inventario:</b> Stock y precios.</span>
        </div>
        <p className="text-[10px] text-orange-600 dark:text-orange-400 font-bold mt-1">
          💡 En la pestaña "Más" encontrarás el Libro de Ventas Fiscal SENIAT, Clientes y Configuración.
        </p>
      </div>
    )
  }
];

export default function DashboardTutorialOverlay({ isOpen, onClose }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [cardPlacement, setCardPlacement] = useState('bottom');
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollTimeoutRef = useRef(null);

  const step = DASHBOARD_TUTORIAL_STEPS[currentStepIndex];

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

      // Si es el menú de navegación inferior o está abajo, la tarjeta DEBE ir arriba siempre
      const isBottomNav = step.id === 'dash-nav' || rect.top > viewportHeight * 0.55;
      const placement = isBottomNav ? 'top' : (rect.top + rect.height / 2 < viewportHeight * 0.45 ? 'bottom' : 'top');
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

      const isBottomNav = step.id === 'dash-nav' || elRect.top > viewportHeight * 0.55;
      const placement = isBottomNav ? 'top' : (elRect.top < viewportHeight * 0.42 ? 'bottom' : 'top');
      setCardPlacement(placement);

      // Si es la barra de navegación fija inferior, no necesita desplazar el scroll
      if (!isBottomNav) {
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
    if (currentStepIndex < DASHBOARD_TUTORIAL_STEPS.length - 1) {
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
    localStorage.setItem('hasSeenDashboardTour', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-auto animate-in fade-in duration-200">
      
      {/* Máscara Spotlight Nítida 100% Transparente */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-40">
        <defs>
          <mask id="dash-tutorial-spotlight-mask">
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
          mask="url(#dash-tutorial-spotlight-mask)"
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
                  Paso {currentStepIndex + 1} de {DASHBOARD_TUTORIAL_STEPS.length}
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
              {DASHBOARD_TUTORIAL_STEPS.map((s, idx) => (
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
                <span>{currentStepIndex === DASHBOARD_TUTORIAL_STEPS.length - 1 ? '¡Entendido!' : 'Siguiente'}</span>
                {currentStepIndex < DASHBOARD_TUTORIAL_STEPS.length - 1 && <ArrowRight size={12} />}
                {currentStepIndex === DASHBOARD_TUTORIAL_STEPS.length - 1 && <Check size={12} />}
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

