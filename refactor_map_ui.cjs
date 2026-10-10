const fs = require('fs');
let code = fs.readFileSync('src/modules/ecommerce/pages/StoreScannerMap.jsx', 'utf-8');

code = code.replace(
  `const [isSettingsOpen, setIsSettingsOpen] = useState(false);`,
  `const [isSettingsOpen, setIsSettingsOpen] = useState(false);\n  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(true);`
);

const filtersJSX = `
            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              <button className="flex-shrink-0 bg-white/95 backdrop-blur-xl shadow-sm border border-zinc-200 px-3.5 py-1.5 rounded-full text-zinc-700 text-xs font-semibold flex items-center gap-1">
                <SlidersHorizontal size={13} /> Filtros
              </button>
              <button className="flex-shrink-0 bg-white/95 backdrop-blur-xl shadow-sm border border-zinc-200 px-3.5 py-1.5 rounded-full text-zinc-700 text-xs font-semibold flex items-center gap-1">
                <Store size={13} /> Ofertas
              </button>
              <button className="flex-shrink-0 bg-white/95 backdrop-blur-xl shadow-sm border border-zinc-200 px-3.5 py-1.5 rounded-full text-zinc-700 text-xs font-semibold flex items-center gap-1">
                <Clock size={13} /> Abierto ahora
              </button>
            </div>`;
code = code.replace(filtersJSX, '');

code = code.replace(
  `<div className="absolute top-36 left-1/2 -translate-x-1/2 z-[60] pointer-events-none flex justify-center w-full">`,
  `<div className="absolute top-20 left-1/2 -translate-x-1/2 z-[60] pointer-events-none flex justify-center w-full">`
);

code = code.replace(
  `<div className="absolute top-1/2 -translate-y-1/2 right-4 z-40 flex flex-col gap-3">`,
  `<div className="absolute top-20 right-4 z-40 flex flex-col gap-3">`
);

const bottomSheetRegex = /\{\/\* BOTTOM SHEET \/ STORE PREVIEW \*\/\}[\s\S]*?<\/AnimatePresence>/;
const match = code.match(bottomSheetRegex);
if (match) {
  const newBottomArea = `{/* BOTTOM AREA: Filters + Sheet */}
      <div className="absolute bottom-0 left-0 right-0 z-50 flex flex-col pointer-events-none">
        
        {/* FILTERS (Arribita del bottom sheet) */}
        <div className="p-4 pointer-events-auto">
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            <button className="flex-shrink-0 bg-white/95 backdrop-blur-xl shadow-sm border border-zinc-200 px-3.5 py-1.5 rounded-full text-zinc-700 text-xs font-semibold flex items-center gap-1">
              <SlidersHorizontal size={13} /> Filtros
            </button>
            <button className="flex-shrink-0 bg-white/95 backdrop-blur-xl shadow-sm border border-zinc-200 px-3.5 py-1.5 rounded-full text-zinc-700 text-xs font-semibold flex items-center gap-1">
              <Store size={13} /> Ofertas
            </button>
            <button className="flex-shrink-0 bg-white/95 backdrop-blur-xl shadow-sm border border-zinc-200 px-3.5 py-1.5 rounded-full text-zinc-700 text-xs font-semibold flex items-center gap-1">
              <Clock size={13} /> Abierto ahora
            </button>
          </div>
        </div>

        {/* BOTTOM SHEET / STORE PREVIEW */}
        <div className="relative pointer-events-auto">
          <AnimatePresence>
            {!isBottomSheetVisible && (
               <motion.div 
                 initial={{ y: '100%', opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 exit={{ y: '100%', opacity: 0 }}
                 className="absolute bottom-6 left-1/2 -translate-x-1/2"
               >
                 <button 
                   onClick={() => setIsBottomSheetVisible(true)}
                   className="bg-zinc-900 text-white px-5 py-2.5 rounded-full font-bold text-sm shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-zinc-700 flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
                 >
                   Ver {stores.length > 0 ? stores.length + ' comercios' : 'detalles'} <ChevronUp size={16} />
                 </button>
               </motion.div>
            )}
          </AnimatePresence>
          
          <AnimatePresence>
            {isBottomSheetVisible && (
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="bg-white rounded-t-3xl border-t border-zinc-200/60 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] p-6 pb-8 relative"
              >
                {/* Close handle */}
                <button 
                  onClick={() => setIsBottomSheetVisible(false)}
                  className="absolute top-2 left-1/2 -translate-x-1/2 p-3 w-16 flex justify-center"
                >
                  <div className="w-12 h-1.5 bg-zinc-300 rounded-full"></div>
                </button>
                <button 
                  onClick={() => setIsBottomSheetVisible(false)}
                  className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 bg-zinc-100 rounded-full p-1.5 transition-colors"
                >
                  <X size={16} />
                </button>

                <div className="mt-4">
                  {selectedStore ? (
                    <div className="flex flex-col">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-100 border border-white/5 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {selectedStore.config?.logoUrl || selectedStore.config?.storefront?.logoUrl ? (
                            <img src={selectedStore.config?.logoUrl || selectedStore.config?.storefront?.logoUrl} alt={selectedStore.name} className="w-full h-full object-cover" />
                          ) : (
                            <Store size={24} className="text-zinc-500" />
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <h2 className="text-zinc-800 font-bold text-lg leading-tight">{selectedStore.name}</h2>
                          <p className="text-zinc-500 text-sm mt-1">{selectedStore.config?.business_type || 'Tienda'}</p>
                          <div className="flex items-center gap-3 mt-3">
                            <span className="flex items-center gap-1 text-amber-600 text-xs font-medium bg-amber-500/10 px-2 py-1 rounded-md">
                              <Navigation size={12} /> {selectedStore.distanceToUser ? (selectedStore.distanceToUser / 1000).toFixed(1) : (Math.random() * 5 + 0.5).toFixed(1)} km
                            </span>
                            <span className="text-zinc-500 text-xs">Aprox 15 min</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => navigate(\`/store/\${selectedStore.store_slug || selectedStore.id}\`)}
                        className="w-full bg-amber-500 text-white hover:bg-amber-600 font-black text-sm uppercase tracking-widest py-4 rounded-2xl mt-6 hover:bg-zinc-200 transition-colors"
                      >
                        Visitar Tienda
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-2">
                      {isScanning ? (
                        <>
                          <div className="w-12 h-12 rounded-full border-4 border-zinc-800 border-t-amber-500 animate-spin mb-4"></div>
                          <p className="text-zinc-800 font-bold">Escaneando zona...</p>
                          <p className="text-zinc-500 text-sm mt-1">Buscando comercios cercanos</p>
                        </>
                      ) : stores.length > 0 ? (
                        <>
                          <Store size={32} className="text-amber-500 mb-3" />
                          <p className="text-zinc-800 font-bold text-lg">{stores.length} comercios encontrados</p>
                          <p className="text-zinc-500 text-sm mt-1">Toca un pin para ver detalles</p>
                        </>
                      ) : (
                        <>
                          <Store size={32} className="text-zinc-600 mb-3" />
                          <p className="text-zinc-800 font-bold text-lg">No hay comercios</p>
                          <p className="text-zinc-500 text-sm mt-1">Intenta ampliar tu radio de búsqueda</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>`;
  
  code = code.replace(bottomSheetRegex, newBottomArea);
}

if (code.includes('lucide-react') && !code.includes('ChevronUp')) {
  code = code.replace(/X,\s*Navigation/, 'X, Navigation, ChevronUp');
}

fs.writeFileSync('src/modules/ecommerce/pages/StoreScannerMap.jsx', code, 'utf-8');
console.log('Done!');
