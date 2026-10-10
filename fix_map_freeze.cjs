const fs = require('fs');
const path = require('path');

const filePath = path.join('f:', 'Presupuesto', 'src', 'modules', 'ecommerce', 'pages', 'StoreScannerMap.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Change 'move' to 'moveend' to fix the infinite render loop (app freeze)
content = content.replace(
  /move: \(\) => \{[\s\S]*?setMapCenter\(map\.getCenter\(\)\);[\s\S]*?setIsMapMoved\(true\);[\s\S]*?\},/,
  `moveend: () => {
      setMapCenter(map.getCenter());
      setIsMapMoved(true);
    },`
);

// 2. Extract the "Buscar Aquí" button from the central pin container
const buttonCode = `{/* Buscar Aquí Button */}
        <AnimatePresence>
          {isMapMoved && (
            <motion.button 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={() => {
                setIsMapMoved(false);
                fetchStores([mapCenter.lat, mapCenter.lng]);
              }}
              className="pointer-events-auto mb-4 px-6 py-2.5 bg-[#1A1A1A] text-white font-medium text-sm rounded-full shadow-xl border border-white/10 flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
            >
              Buscar aquí
            </motion.button>
          )}
        </AnimatePresence>`;

// Remove it from the central pin area
content = content.replace(buttonCode, '');

// 3. Inject it at the top level, right under the TOP FLOATING HEADER end div
const buttonRelocated = `{/* Buscar Aquí Button Repositioned */}
      <div className="absolute top-28 left-1/2 -translate-x-1/2 z-[60] pointer-events-none flex justify-center w-full">
        <AnimatePresence>
          {isMapMoved && (
            <motion.button 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => {
                setIsMapMoved(false);
                fetchStores([mapCenter.lat, mapCenter.lng]);
              }}
              className="pointer-events-auto px-6 py-2.5 bg-[#1A1A1A] text-white font-medium text-sm rounded-full shadow-xl border border-white/10 transition-transform hover:scale-105 active:scale-95"
            >
              Buscar aquí
            </motion.button>
          )}
        </AnimatePresence>
      </div>`;

content = content.replace(
  /\{\/\* FLOATING ACTION BUTTONS \(RIGHT\) \*\/\}/,
  `${buttonRelocated}\n\n      {/* FLOATING ACTION BUTTONS (RIGHT) */}`
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Map freeze fixed and button repositioned.');
