import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Bot, Lightbulb, TrendingDown, TrendingUp, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CFOAssistantWizard({ isOpen, onClose, data }) {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const { rev, cogs, mkt, fc, grossMargin, netMargin, breakEvenPoint, cac, ltv } = data;

  const isNetNegative = netMargin < 0;
  const isCacHigh = cac > (rev / 2); // Un CAC muy alto respecto a los ingresos
  const isHealthyLTV = ltv > (cac * 3); // Idealmente LTV > 3x CAC

  const slides = [
    {
      title: "¡Hola! Soy tu Asistente CFO",
      icon: <Bot className="text-indigo-500" size={32} />,
      content: (
        <div className="space-y-3">
          <p>Veo que los números de la pestaña financiera pueden parecer un poco intimidantes, ¡especialmente si ves porcentajes enormes negativos!</p>
          <p>No te preocupes, estoy aquí para <strong>traducir esos números al español</strong> y explicarte exactamente qué está pasando en tu negocio con los datos que ingresaste.</p>
        </div>
      )
    },
    {
      title: "Paso 1: Tu Margen Bruto",
      icon: <Lightbulb className="text-amber-500" size={32} />,
      content: (
        <div className="space-y-3">
          <p>El <strong>Margen Bruto</strong> es del <span className="font-bold text-slate-900 dark:text-white">{grossMargin.toFixed(1)}%</span>.</p>
          <p>¿Qué significa? Que de cada $100 dólares que vendes, te quedan ${grossMargin.toFixed(0)} después de restarle el costo puro del producto (lo que te costó comprarlo o fabricarlo).</p>
          <p><em>Tu situación actual:</em> Tienes ingresos de ${rev.toFixed(2)} y el costo de tus productos (COGS) fue de ${cogs.toFixed(2)}.</p>
        </div>
      )
    },
    {
      title: "Paso 2: ¿Por qué el Margen Neto está así?",
      icon: isNetNegative ? <TrendingDown className="text-rose-500" size={32} /> : <TrendingUp className="text-emerald-500" size={32} />,
      content: (
        <div className="space-y-3">
          <p>Tu <strong>Margen Neto</strong> actual es <span className={`font-bold ${isNetNegative ? 'text-rose-500' : 'text-emerald-500'}`}>{netMargin.toFixed(1)}%</span>.</p>
          {isNetNegative ? (
            <div className="bg-rose-50 dark:bg-rose-900/20 p-3 rounded-lg border border-rose-100 dark:border-rose-900/50">
              <p className="text-rose-800 dark:text-rose-200 text-sm">
                <strong>¡No te asustes por el número rojo gigante!</strong> Esto es completamente normal en esta fase. 
                Tus ingresos totales son apenas <strong>${rev.toFixed(2)}</strong>, pero le indicaste al sistema que gastas 
                <strong> ${mkt.toFixed(2)} en Marketing</strong> y <strong>${fc.toFixed(2)} en Costos Fijos</strong>.
              </p>
              <p className="text-rose-800 dark:text-rose-200 text-sm mt-2">
                Como tus costos fijos actuales son mucho más grandes que tus ventas iniciales, la fórmula matemática explota hacia abajo. A medida que tus ventas suban, este porcentaje se estabilizará.
              </p>
            </div>
          ) : (
             <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
               <p className="text-emerald-800 dark:text-emerald-200 text-sm">
                 ¡Felicidades! Estás en verde. Tus ventas (${rev.toFixed(2)}) ya son lo suficientemente altas para cubrir el costo de tus productos, tu publicidad (${mkt.toFixed(2)}) y el alquiler/gastos fijos (${fc.toFixed(2)}).
               </p>
             </div>
          )}
        </div>
      )
    },
    {
      title: "Paso 3: Tu Punto de Equilibrio",
      icon: <Target className="text-violet-500" size={32} />,
      content: (
        <div className="space-y-3">
          <p>El <strong>Punto de Equilibrio</strong> es tu meta mágica: <span className="font-bold text-violet-600 dark:text-violet-400">${breakEvenPoint.toFixed(2)}</span>.</p>
          <p>Significa que, manteniendo tus costos fijos y gastos actuales, necesitas vender exactamente <strong>${breakEvenPoint.toFixed(2)} en un mes</strong> para quedar "tablas" (no ganar ni perder dinero).</p>
          {breakEvenPoint > rev ? (
            <p className="text-sm bg-slate-100 dark:bg-slate-800 p-2 rounded">Te faltan ${(breakEvenPoint - rev).toFixed(2)} en ventas para llegar a la meta. ¡Sigue así!</p>
          ) : (
            <p className="text-sm bg-slate-100 dark:bg-slate-800 p-2 rounded">¡Ya superaste la meta! Todo dólar adicional a partir de aquí aumenta tus ganancias puras.</p>
          )}
        </div>
      )
    },
    {
      title: "Paso 4: CAC y LTV",
      icon: <Lightbulb className="text-blue-500" size={32} />,
      content: (
        <div className="space-y-3">
          <p><strong>CAC (Costo de Adquisición): ${cac.toFixed(2)}</strong></p>
          <p className="text-sm text-slate-600 dark:text-slate-400">Te costó ${cac.toFixed(2)} de publicidad conseguir a cada cliente este mes.</p>
          
          <div className="h-px w-full bg-slate-200 dark:bg-slate-700 my-2"></div>
          
          <p><strong>LTV (Valor de Vida): ${ltv.toFixed(2)}</strong></p>
          <p className="text-sm text-slate-600 dark:text-slate-400">Es el dinero estimado que un cliente gastará en tu tienda durante todo un año (proyectado).</p>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900/50 mt-2">
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              {isHealthyLTV 
                ? "¡Excelente ratio! Tus clientes te dejan mucha más ganancia (LTV) de lo que te cuesta conseguirlos (CAC)." 
                : "Regla de oro: Tu LTV debería ser al menos 3 veces más grande que tu CAC. Si te cuesta $10 conseguir un cliente, este debería gastar al menos $30 en tu tienda con el tiempo."}
            </p>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (step < slides.length - 1) setStep(step + 1);
    else onClose();
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors z-10 bg-slate-100 dark:bg-slate-800 rounded-full p-2">
          <X size={20} />
        </button>

        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                  {slides[step].icon}
                </div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white">{slides[step].title}</h2>
              </div>
              
              <div className="text-slate-700 dark:text-slate-300 min-h-[180px] text-[15px] leading-relaxed">
                {slides[step].content}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex gap-1.5">
              {slides.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-indigo-500' : 'w-1.5 bg-slate-200 dark:bg-slate-700'}`} />
              ))}
            </div>

            <div className="flex gap-2">
              <button 
                onClick={handlePrev}
                disabled={step === 0}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-0 transition-all"
              >
                Atrás
              </button>
              <button 
                onClick={handleNext}
                className="px-6 py-2 rounded-xl text-sm font-bold text-white bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/30 flex items-center gap-2 transition-all"
              >
                {step === slides.length - 1 ? '¡Entendido!' : 'Siguiente'}
                {step < slides.length - 1 && <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
