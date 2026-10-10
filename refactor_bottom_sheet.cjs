const fs = require('fs');

let code = fs.readFileSync('src/modules/ecommerce/pages/StoreScannerMap.jsx', 'utf-8');

// The bottom area structure we have now looks roughly like:
// {/* BOTTOM AREA: Filters + Sheet */}
// <div className="absolute bottom-0 left-0 right-0 z-50 flex flex-col pointer-events-none">
// ...
// </div>

const bottomAreaRegex = /\{\/\* BOTTOM AREA: Filters \+ Sheet \*\/\}[\s\S]*?<\/div>\s*<\/div>/;

const match = code.match(bottomAreaRegex);
if (!match) {
    console.error("Could not find bottom area to replace");
    process.exit(1);
}

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
          <motion.div 
            layout
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="bg-white rounded-t-3xl border-t border-zinc-200/60 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {/* Drag Handle to toggle */}
            <button 
              onClick={() => setIsBottomSheetVisible(!isBottomSheetVisible)}
              className="w-full flex justify-center pt-4 pb-2"
            >
              <div className="w-12 h-1.5 bg-zinc-300 rounded-full"></div>
            </button>
            
            <AnimatePresence initial={false}>
              {isBottomSheetVisible && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-6 pb-8"
                >
                  <div className="mt-2">
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
          </motion.div>
        </div>
      </div>`;

code = code.replace(bottomAreaRegex, newBottomArea);

fs.writeFileSync('src/modules/ecommerce/pages/StoreScannerMap.jsx', code, 'utf-8');
console.log('Success');
