// ==============================================================================
// AXONMARKET & AXONPOS — Tutorial Interactivo y Guía Didáctica de Categorías
// Sistema de Posicionamiento Inteligente Sin Superposición (Zero-Overlap)
// Compatible con Contenedor de Scroll Interno <main> y Pantallas Móviles
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, ArrowLeft, X, Sparkles, FolderTree, 
  HelpCircle, BookOpen, Check, Package, Tag, 
  Layers, PackageSearch, Plus, Image as ImageIcon,
  CornerDownRight, ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';

export const CATEGORIES_TUTORIAL_STEPS = [
  {
    id: 'cat-header',
    selector: '[data-tour="tour-cat-header"]',
    title: '1. ¿Para qué sirven las Categorías?',
    subtitle: 'Los departamentos y pasillos de tu negocio',
    badge: 'ORGANIZACIÓN',
    icon: FolderTree,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <p>
          Las categorías organizan tu negocio en <b>departamentos lógicos</b> (ej: <i>Bebidas, Carnes, Víveres, Postres</i>).
        </p>
        <p className="bg-amber-50 dark:bg-amber-500/10 p-2 rounded-xl border border-amber-200 dark:border-amber-500/20 text-amber-900 dark:text-amber-200 text-[11px]">
          ⚡ <b>Ventaja Clave:</b> Permiten a tus cajeros en el POS Kiosco cobrar a toda velocidad tocando botones táctiles por rubro, y a tus clientes ver tu vitrina web ordenada.
        </p>
      </div>
    )
  },
  {
    id: 'cat-new-btn',
    selector: '[data-tour="tour-cat-new-btn"]',
    title: '2. Crear Nueva Categoría',
    subtitle: 'Añade un nuevo departamento al instante',
    badge: 'CREAR RUBRO',
    icon: Plus,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <p>
          Presiona este botón naranja para registrar un nuevo rubro.
        </p>
        <div className="space-y-1 text-[11px]">
          <div>• Solo requieres asignarle un <b>Nombre</b> (ej: <i>Hamburguesas</i> o <i>Repostería</i>).</div>
          <div>• Puedes asignarle un <b>Color distintivo</b> para identificarlo de un vistazo.</div>
          <div>• Aparecerá de inmediato disponible tanto en el POS de cobro como en el Inventario.</div>
        </div>
      </div>
    )
  },
  {
    id: 'cat-tabs',
    selector: '[data-tour="tour-cat-tabs"]',
    title: '3. Combos vs Categorías de Catálogo',
    subtitle: 'Separa artículos individuales de tus promociones',
    badge: 'RUBROS VS COMBOS',
    icon: Package,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <p>Este selector te permite alternar entre dos herramientas comerciales:</p>
        <div className="space-y-1 text-[11px]">
          <div className="p-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg">
            📂 <b>Categorías del Catálogo:</b> Agrupan tus artículos individuales para el control de inventario regular.
          </div>
          <div className="p-1.5 bg-amber-50 dark:bg-amber-500/10 rounded-lg text-amber-900 dark:text-amber-300">
            📦 <b>Combos & Paquetes:</b> Agrupan varios productos en ofertas especiales (ej: <i>Combo Familiar 2x1 con bebida y acompañante</i>).
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'cat-kpis',
    selector: '[data-tour="tour-cat-kpis"]',
    title: '4. Tarjetas de Resumen & Stock Global',
    subtitle: 'Visión panorámica de tu catálogo',
    badge: 'MÉTRICAS CLAVE',
    icon: Layers,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <p>Tres indicadores vitales sincronizados en tiempo real:</p>
        <div className="space-y-1 text-[11px]">
          <div>• <b>Categorías Activas:</b> Cantidad de rubros o pasillos creados en tu tienda.</div>
          <div>• <b>Productos en Catálogo:</b> Cantidad total de códigos o artículos registrados.</div>
          <div>• <b>Unidades Totales Stock:</b> Cantidad de piezas físicas reales disponibles en existencia sumando todo tu inventario.</div>
        </div>
      </div>
    )
  },
  {
    id: 'cat-search',
    selector: '[data-tour="tour-cat-search"]',
    title: '5. Buscador Rápido de Departamentos',
    subtitle: 'Localiza cualquier rubro en un segundo',
    badge: 'BÚSQUEDA RÁPIDA',
    icon: PackageSearch,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <p>
          A medida que tu catálogo crezca a 15, 30 o más categorías, utiliza este campo para filtrar por nombre en milisegundos.
        </p>
        <p className="text-[10px] text-slate-400">
          Muestra al instante cuántos rubros coinciden con el texto ingresado.
        </p>
      </div>
    )
  },
  {
    id: 'cat-card',
    selector: '[data-tour="tour-cat-card"]',
    title: '6. Tarjeta de Categoría y Foto de Portada',
    subtitle: 'Imagen visual para el POS Kiosco y Vitrina',
    badge: 'FOTO & ACCIONES',
    icon: Tag,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <div className="space-y-1 text-[11px]">
          <div>• <b>Subir Foto (+):</b> Presiona el círculo con el símbolo <b>+</b> para subir una imagen de portada. Tus cajeros la verán en el POS táctil como botón grande.</div>
          <div>• <b>Renombrar:</b> Con el ícono de lápiz puedes cambiar el nombre de la categoría en cualquier momento sin perder tus productos.</div>
          <div>• <b>Eliminar:</b> Elimina rubros que ya no uses (la categoría <i>General</i> está protegida por seguridad).</div>
        </div>
      </div>
    )
  },
  {
    id: 'cat-subcats',
    selector: '[data-tour="tour-cat-subcats"]',
    title: '7. Subcategorías (Nivel Secundario)',
    subtitle: 'Organización de precisión para tu mercancía',
    badge: 'SUBCATEGORÍAS',
    icon: CornerDownRight,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <p>
          ¿Vendes variedad de productos dentro de un mismo rubro?
        </p>
        <div className="p-2 bg-slate-50 dark:bg-zinc-800/80 rounded-xl border border-slate-200 dark:border-zinc-700 text-[11px] space-y-1">
          <p>Ejemplo en <b>Bebidas</b>:</p>
          <p className="text-slate-600 dark:text-zinc-300 pl-2">
            ↳ <i>Refrescos</i><br />
            ↳ <i>Cervezas & Licores</i><br />
            ↳ <i>Jugos Naturales</i>
          </p>
        </div>
        <p className="text-[10px] text-slate-400">
          Pulsa <b>+ Subcategoría</b> para crear divisiones y asignarle fotos individuales.
        </p>
      </div>
    )
  },
  {
    id: 'cat-assign',
    selector: '[data-tour="tour-cat-assign"], [data-tour="tour-cat-subcats"]',
    title: '8. Asignar Productos a Subcategorías',
    subtitle: 'Vinculación masiva en un solo clic',
    badge: 'ASIGNAR PRODUCTOS',
    icon: Package,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <p>
          Al presionar el botón <b>Asignar</b>, se abre una lista con todos los productos de esta categoría.
        </p>
        <p className="bg-emerald-50 dark:bg-emerald-500/10 p-2 rounded-xl border border-emerald-200 dark:border-emerald-500/20 text-emerald-900 dark:text-emerald-300 text-[11px]">
          ✅ Solo marcas los casilleros de los artículos que correspondan a esa subcategoría y guardas. ¡Quedan ordenados al instante!
        </p>
      </div>
    )
  },
  {
    id: 'cat-inventory-link',
    selector: '[data-tour="tour-cat-inventory-link"]',
    title: '9. Ver Productos en Inventario',
    subtitle: 'Filtro directo para gestionar precios y stock',
    badge: 'INVENTARIO DIRECTO',
    icon: ExternalLink,
    content: (
      <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
        <p>
          Presiona este botón inferior para ir automáticamente al <b>Módulo de Inventario</b> con el filtro aplicado de esta categoría.
        </p>
        <p className="text-[11px] text-slate-500 dark:text-zinc-400">
          Allí podrás ajustar precios en Dólares/Bolívares, sumar existencias, imprimir etiquetas de código de barras o configurar alertas de stock mínimo.
        </p>
      </div>
    )
  }
];

export default function CategoriesTutorialOverlay({ isOpen, onClose }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [cardPlacement, setCardPlacement] = useState('bottom'); // 'bottom' | 'top'
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollTimeoutRef = useRef(null);

  const step = CATEGORIES_TUTORIAL_STEPS[currentStepIndex];

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
      // Dejamos un espacio libre arriba de ~210px para la tarjeta didáctica.
      // Si la tarjeta está abajo (placement === 'bottom'):
      // El elemento debe quedar en el tercio superior (~85px).
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

      // Sincronizaciones progresivas durante el smooth scroll
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

    // Escuchamos scroll con capture para el contenedor <main>
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
    if (currentStepIndex < CATEGORIES_TUTORIAL_STEPS.length - 1) {
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
    localStorage.setItem('hasSeenCategoriesTour', 'true');
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
          <mask id="categories-tutorial-spotlight-mask">
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
          mask="url(#categories-tutorial-spotlight-mask)"
        />
      </svg>

      {/* Recuadro Luminoso Neón Ámbar/Naranja alrededor del Elemento Descubierto */}
      {targetRect && (
        <div 
          className="absolute border-2 border-amber-500 rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.9)] transition-all duration-300 pointer-events-none z-50"
          style={{
            top: Math.max(2, targetRect.top - 6),
            left: Math.max(2, targetRect.left - 6),
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        >
          {/* Pulso de señalización */}
          <span className="absolute -inset-1 rounded-2xl border-2 border-amber-400 animate-ping opacity-60 pointer-events-none" />
          
          {/* Badge superior indicando la función */}
          <span className="absolute -top-3 left-3 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
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
              <div className="w-0 h-0 border-x-8 border-x-transparent border-b-12 border-b-amber-500 drop-shadow-[0_2px_10px_rgba(245,158,11,1)]" />
            ) : (
              // Tarjeta está arriba -> Flecha apunta hacia abajo hacia el elemento
              <div className="w-0 h-0 border-x-8 border-x-transparent border-t-12 border-t-amber-500 drop-shadow-[0_2px_10px_rgba(245,158,11,1)]" />
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
        <div className="bg-white/95 dark:bg-zinc-900/95 border-2 border-amber-500 rounded-3xl p-4 shadow-2xl space-y-2.5 backdrop-blur-md">
          
          {/* Cabecera del Paso */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-white/5 pb-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <step.icon size={16} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider block">
                  Paso {currentStepIndex + 1} de {CATEGORIES_TUTORIAL_STEPS.length}
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
              {CATEGORIES_TUTORIAL_STEPS.map((s, idx) => (
                <div
                  key={s.id}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === currentStepIndex
                      ? 'w-4 bg-amber-500'
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
                className="px-3.5 py-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 text-xs font-black rounded-xl shadow-md shadow-amber-500/25 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
              >
                <span>{currentStepIndex === CATEGORIES_TUTORIAL_STEPS.length - 1 ? '¡Finalizar!' : 'Siguiente'}</span>
                {currentStepIndex < CATEGORIES_TUTORIAL_STEPS.length - 1 && <ArrowRight size={12} />}
                {currentStepIndex === CATEGORIES_TUTORIAL_STEPS.length - 1 && <Check size={12} />}
              </button>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
}
