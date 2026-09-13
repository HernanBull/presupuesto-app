import React, { useState } from 'react';
import { ShoppingCart, X, CreditCard, Smartphone, UploadCloud, ShieldCheck, MapPin, Hash, Map } from 'lucide-react';

export default function CartPreview({ config, previewMode = 'desktop' }) {
  const { 
    cartType = 'drawer', 
    primaryColor = '#7c3aed',
    requireAddress = true,
    requireDni = false,
    paymentMobile = true,
    ocrVerification = false
  } = config;

  const [isAtHome, setIsAtHome] = useState(true);

  const cartItems = [
    { id: 1, name: 'Zapatillas Urbanas', price: 89.99, qty: 1, img: null },
    { id: 2, name: 'Camiseta Algodón Básica', price: 29.50, qty: 2, img: null },
  ];

  const subtotal = 148.99;

  // Renderizado del Interior del Carrito
  const renderCartContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden pointer-events-auto shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
          <ShoppingCart size={20} /> Mi Carrito
        </h2>
        <button className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Body scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        
        {/* Productos */}
        <div className="space-y-4">
          {cartItems.map(item => (
            <div key={item.id} className="flex gap-3 items-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                <ShoppingCart size={20} className="text-slate-300" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1">{item.name}</h4>
                <p className="text-xs text-slate-500">${item.price.toFixed(2)}</p>
                <div className="flex items-center gap-2 mt-1">
                   <button className="w-5 h-5 flex items-center justify-center bg-slate-200 dark:bg-slate-700 rounded text-xs font-bold">-</button>
                   <span className="text-xs font-bold">{item.qty}</span>
                   <button className="w-5 h-5 flex items-center justify-center bg-slate-200 dark:bg-slate-700 rounded text-xs font-bold">+</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Formulario de Checkout */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
           <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Tus Datos</h3>

           {requireDni && (
             <div className="relative">
               <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
               <input type="text" placeholder="RUT / DNI (Documento)" className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none" readOnly />
             </div>
           )}

           {requireAddress && (
             <div className="space-y-3 bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
               <div>
                 <p className="text-sm font-bold text-slate-800 dark:text-white mb-2">¿Estás en tu dirección registrada (tu casa)?</p>
                 <div className="flex gap-2">
                   <button onClick={() => setIsAtHome(true)} className={`flex-1 py-1.5 rounded-lg text-sm font-bold border transition-colors ${isAtHome ? 'bg-teal-500 text-white border-teal-500' : 'bg-white dark:bg-slate-900 text-slate-600 border-slate-200 dark:border-slate-700'}`}>Sí</button>
                   <button onClick={() => setIsAtHome(false)} className={`flex-1 py-1.5 rounded-lg text-sm font-bold border transition-colors ${!isAtHome ? 'bg-teal-500 text-white border-teal-500' : 'bg-white dark:bg-slate-900 text-slate-600 border-slate-200 dark:border-slate-700'}`}>No</button>
                 </div>
               </div>

               {!isAtHome && (
                 <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                   {previewMode === 'mobile' ? (
                     <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-teal-500 text-teal-600 bg-teal-50 dark:bg-teal-900/20 text-sm font-bold transition-colors">
                       <Map size={16} /> Ubicación por Google Maps
                     </button>
                   ) : (
                     <div className="relative">
                       <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                       <input type="text" placeholder="Ingresa la dirección completa..." className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-xl text-sm outline-none" readOnly />
                     </div>
                   )}
                 </div>
               )}
             </div>
           )}
        </div>

        {/* Opciones de Pago */}
        {paymentMobile && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
             <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Método de Pago</h3>
             
             <div className="p-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2 mb-2">
                   <Smartphone size={16} className="text-slate-600 dark:text-slate-300" />
                   <span className="text-sm font-bold text-slate-800 dark:text-white">Pago Móvil</span>
                </div>
                
                <div className="mt-3 p-3 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center gap-1 bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                   <UploadCloud size={18} className="text-slate-400" />
                   <span className="text-xs font-medium text-slate-500">Subir Captura del Pago</span>
                   {ocrVerification && (
                     <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded mt-1">
                       <ShieldCheck size={10} /> OCR Activado
                     </span>
                   )}
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Footer / Checkout Button */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shrink-0">
         <div className="flex items-center justify-between mb-4">
           <span className="text-sm font-bold text-slate-500">Total</span>
           <span className="text-xl font-black text-slate-800 dark:text-white">${subtotal.toFixed(2)}</span>
         </div>
         <button className="w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]" style={{ backgroundColor: primaryColor }}>
           <CreditCard size={18} />
           Finalizar Compra
         </button>
      </div>
    </div>
  );

  return (
    <div className="w-full h-full mt-16 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden relative bg-slate-200 dark:bg-slate-900 flex items-center justify-center">
      
      {/* Fake Store Background */}
      <div className="absolute inset-0 opacity-40 blur-[2px] pointer-events-none p-8">
         <div className="h-12 w-full bg-slate-300 dark:bg-slate-800 rounded-xl mb-8"></div>
         <div className="grid grid-cols-3 gap-6">
           <div className="h-64 bg-slate-300 dark:bg-slate-800 rounded-xl"></div>
           <div className="h-64 bg-slate-300 dark:bg-slate-800 rounded-xl"></div>
           <div className="h-64 bg-slate-300 dark:bg-slate-800 rounded-xl"></div>
         </div>
      </div>

      {/* Overlay Oscuro */}
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 pointer-events-none"></div>

      {/* Tipo de Carrito: DRAWER */}
      {cartType === 'drawer' && (
        <div className="absolute top-0 right-0 bottom-0 w-full max-w-sm shadow-[-10px_0_40px_rgba(0,0,0,0.1)] transition-transform duration-300 translate-x-0">
          {renderCartContent()}
        </div>
      )}

      {/* Tipo de Carrito: MODAL */}
      {cartType === 'modal' && (
        <div className="absolute z-10 w-full max-w-lg max-h-[90%] rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 scale-100 opacity-100 mx-auto">
          {renderCartContent()}
        </div>
      )}
    </div>
  );
}
