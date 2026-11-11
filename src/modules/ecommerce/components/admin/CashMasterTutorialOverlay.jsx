// ==============================================================================
// AXONMARKET & AXONPOS — Tutorial Interactivo y Guía Didáctica de Caja Maestra
// Navegación paso a paso con flecha señalizadora animada y explicaciones claras
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, ArrowLeft, X, Sparkles, ShieldCheck, 
  HelpCircle, BookOpen, Check, Wallet, Calendar, 
  ArrowRightLeft, Receipt, Printer, DollarSign, Monitor,
  KeyRound, Users, History, CheckCircle2
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
      <div className="space-y-2 text-xs leading-relaxed text-slate-600 dark:text-zinc-300">
        <p>
          Aquí se refleja la <b>Tasa Oficial del Banco Central de Venezuela (BCV)</b> sincronizada al instante.
        </p>
        <p className="bg-amber-50 dark:bg-amber-500/10 p-2 rounded-xl border border-amber-200 dark:border-amber-500/20 text-amber-900 dark:text-amber-200">
          💡 <b>Regla SENIAT:</b> Todas las conversiones de tus precios en dólares a Bolívares se calculan con esta tasa oficial obligatoria.
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
      <div className="space-y-2 text-xs leading-relaxed text-slate-600 dark:text-zinc-300">
        <p>
          Al presionar este botón accedes al <b>Centro de Control Maestro</b> con 3 áreas indispensables:
        </p>
        <ul className="space-y-1.5 pl-1">
          <li className="flex items-start gap-1.5">
            <span className="text-orange-500 font-bold">•</span>
            <span><b>Personal & PINes:</b> Registras cajeros, les creas su PIN táctil de 4 dígitos y configuras qué pueden hacer (anular, dar descuentos, etc.).</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-orange-500 font-bold">•</span>
            <span><b>Cajas Registradoras:</b> Creas cajas independientes (Caja 1, Caja Rápida) y generas su código QR para que cualquier empleado cobre desde su teléfono.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-orange-500 font-bold">•</span>
            <span><b>Libro de Auditoría:</b> Bitácora que registra con fecha y hora quién creó una caja, quién cambió un PIN o modificó permisos.</span>
          </li>
        </ul>
        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold pt-1">
          🔐 Si olvidas tu PIN Maestro, lo recuperas con tu contraseña o con Google Authenticator (2FA).
        </p>
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
      <div className="space-y-2 text-xs leading-relaxed text-slate-600 dark:text-zinc-300">
        <p>
          Este selector gobierna todos los números que ves en pantalla:
        </p>
        <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1">
          <span className="p-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg font-semibold"><b>Hoy:</b> Ventas de la jornada actual.</span>
          <span className="p-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg font-semibold"><b>Ayer:</b> Cuadre de la jornada anterior.</span>
          <span className="p-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg font-semibold"><b>7 Días:</b> Resumen semanal.</span>
          <span className="p-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg font-semibold"><b>Día Específico:</b> Consulta cualquier fecha histórica.</span>
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
      <div className="space-y-2 text-xs leading-relaxed text-slate-600 dark:text-zinc-300">
        <p>
          Cada mañana antes de cobrar, el cajero debe <b>Iniciar Turno</b>.
        </p>
        <p>
          Allí declara el <b>Fondo de Sencillo inicial</b> (en $ y en Bolívares en efectivo) que recibe en la gaveta para poder dar cambio a los primeros clientes.
        </p>
        <p className="text-[11px] text-slate-400 italic">
          El sistema suma este fondo a las ventas del día para que el cuadre nocturno sea exacto.
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
      <div className="space-y-2 text-xs leading-relaxed text-slate-600 dark:text-zinc-300">
        <p>
          ¿Tuviste que sacar dinero de la gaveta para pagar hielo, bolsas plásticas, almuerzo del personal o un anticipo?
        </p>
        <p className="bg-orange-50 dark:bg-orange-500/10 p-2 rounded-xl border border-orange-200 dark:border-orange-500/20 text-orange-950 dark:text-orange-200">
          👉 Presiona <b>Caja Chica</b> y anota la salida. El sistema lo descuenta automáticamente del saldo teórico de gaveta para que al final del día no falte dinero.
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
      <div className="space-y-2 text-xs leading-relaxed text-slate-600 dark:text-zinc-300">
        <p>
          En Venezuela existen dos reportes oficiales exigidos por el SENIAT:
        </p>
        <ul className="space-y-1.5 pl-1">
          <li className="flex items-start gap-1.5">
            <span className="text-amber-500 font-bold">•</span>
            <span><b>Corte X (Parcial):</b> Informe informativo durante el día para chequear cuánto dinero llevas recaudado. <i>No borra memoria ni altera acumuladores</i>.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-rose-500 font-bold">•</span>
            <span><b>Cierre Z (Definitivo):</b> Se emite <u>una sola vez al terminar la jornada</u>. Cierra las ventas fiscales del día y calcula el IVA (16%) y el IGTF (3%) para el contador.</span>
          </li>
        </ul>
        <p className="text-[11px] text-slate-400">
          Ambos reportes se pueden imprimir en papel térmico de 80mm, descargar en Word o enviar por WhatsApp.
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
      <div className="space-y-2 text-xs leading-relaxed text-slate-600 dark:text-zinc-300">
        <p>
          En Venezuela el dinero entra por dos vías completamente distintas:
        </p>
        <div className="space-y-1.5">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-200 dark:border-emerald-500/20 text-emerald-900 dark:text-emerald-300">
            💵 <b>Efectivo Físico en Gaveta:</b> Billetes que debes tener en mano (USD en efectivo y Bolívares en efectivo).
          </div>
          <div className="p-2 bg-sky-50 dark:bg-sky-500/10 rounded-xl border border-sky-200 dark:border-sky-500/20 text-sky-900 dark:text-sky-300">
            🏦 <b>Dinero Digital en Bancos:</b> Lo que entró por Pago Móvil, Punto de Venta, Transferencias y Zelle.
          </div>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-zinc-400">
          Esta división evita que mezcles lo que tienes en el banco con lo que tienes en gaveta.
        </p>
      </div>
    )
  }
];

export default function CashMasterTutorialOverlay({ isOpen, onClose }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const step = TUTORIAL_STEPS[currentStepIndex];

  // Actualizar posición del elemento seleccionado
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (!step) return;
      const el = document.querySelector(step.selector);
      if (el) {
        // Desplazar la pantalla suavemente hacia el elemento si está fuera del viewport
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        setTimeout(() => {
          const rect = el.getBoundingClientRect();
          setTargetRect({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            bottom: rect.bottom,
            right: rect.right
          });
        }, 150);
      } else {
        setTargetRect(null);
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, currentStepIndex, step]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
      setIsAnimating(true);
      setCurrentStepIndex(prev => prev + 1);
      setTimeout(() => setIsAnimating(false), 200);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setIsAnimating(true);
      setCurrentStepIndex(prev => prev - 1);
      setTimeout(() => setIsAnimating(false), 200);
    }
  };

  const handleFinish = () => {
    localStorage.setItem('hasSeenCashMasterTour', 'true');
    onClose();
  };

  // Determinar si la tarjeta explicativa debe ir arriba o abajo del elemento
  const isTargetInBottomHalf = targetRect ? targetRect.top > window.innerHeight / 2 : false;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-auto animate-in fade-in duration-200">
      
      {/* ========================================================
          MÁSCARA SVG DE SPOTLIGHT (RECORTE NÍTIDO 100% TRANSPARENTE)
          El botón señalado queda completamente al descubierto y brillante,
          mientras que el resto de la pantalla se oscurece con elegancia.
          ======================================================== */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-40">
        <defs>
          <mask id="tutorial-spotlight-mask">
            {/* 1. Capa blanca que cubre toda la pantalla */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            
            {/* 2. Recorte transparente (negro en la máscara) donde está el botón */}
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

        {/* Fondo oscuro que respeta el hueco transparente del botón */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.76)"
          mask="url(#tutorial-spotlight-mask)"
        />
      </svg>

      {/* Recuadro Luminoso Neón Naranja alrededor del Botón Descubierto */}
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
            top: isTargetInBottomHalf 
              ? Math.max(6, targetRect.top - 36)
              : Math.min(window.innerHeight - 45, targetRect.bottom + 8)
          }}
        >
          <div className="flex flex-col items-center animate-bounce">
            {isTargetInBottomHalf ? (
              // Flecha apuntando hacia abajo hacia el botón
              <div className="w-0 h-0 border-x-8 border-x-transparent border-t-12 border-t-orange-500 drop-shadow-[0_2px_10px_rgba(255,107,0,1)]" />
            ) : (
              // Flecha apuntando hacia arriba hacia el botón
              <div className="w-0 h-0 border-x-8 border-x-transparent border-b-12 border-b-orange-500 drop-shadow-[0_2px_10px_rgba(255,107,0,1)]" />
            )}
          </div>
        </div>
      )}

      {/* TARJETA DIDÁCTICA FLOTANTE (TOOLTIP EXPLICATIVO) */}
      <div 
        className="fixed z-50 w-full max-w-sm sm:max-w-md px-3.5 transition-all duration-300 pointer-events-auto"
        style={{
          left: '50%',
          transform: 'translateX(-50%)',
          ...(isTargetInBottomHalf
            ? { 
                top: Math.max(12, targetRect ? Math.min(targetRect.top - 340, window.innerHeight * 0.12) : 25) 
              }
            : { 
                bottom: Math.max(12, targetRect ? Math.min(window.innerHeight - targetRect.bottom - 25, window.innerHeight * 0.10) : 25) 
              }
          )
        }}
      >
        <div className="bg-white dark:bg-zinc-900 border-2 border-orange-500/80 rounded-3xl p-5 shadow-2xl space-y-3.5 backdrop-blur-md">
          
          {/* Cabecera del Paso */}
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                <step.icon size={18} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-orange-500 tracking-wider">
                  Guía Didáctica • Paso {currentStepIndex + 1} de {TUTORIAL_STEPS.length}
                </span>
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">
                  {step.title}
                </h3>
              </div>
            </div>

            <button
              onClick={handleFinish}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Cerrar tutorial"
            >
              <X size={16} />
            </button>
          </div>

          {/* Subtítulo */}
          <p className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 -mt-1">
            {step.subtitle}
          </p>

          {/* Cuerpo Explicativo */}
          <div className="max-h-56 overflow-y-auto custom-scrollbar pr-1">
            {step.content}
          </div>

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
                      ? 'w-5 bg-orange-500'
                      : idx < currentStepIndex
                        ? 'w-2 bg-emerald-500'
                        : 'w-1.5 bg-slate-200 dark:bg-zinc-700'
                  }`}
                  title={s.title}
                />
              ))}
            </div>

            {/* Botones Anterior / Siguiente */}
            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                >
                  <ArrowLeft size={13} />
                  <span>Atrás</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black rounded-xl shadow-md shadow-orange-500/25 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
              >
                <span>{currentStepIndex === TUTORIAL_STEPS.length - 1 ? '¡Entendido! Finalizar' : 'Siguiente'}</span>
                {currentStepIndex < TUTORIAL_STEPS.length - 1 && <ArrowRight size={13} />}
                {currentStepIndex === TUTORIAL_STEPS.length - 1 && <Check size={13} />}
              </button>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
}

