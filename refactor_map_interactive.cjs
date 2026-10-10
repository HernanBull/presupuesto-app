const fs = require('fs');
const path = require('path');

const filePath = path.join('f:', 'Presupuesto', 'src', 'modules', 'ecommerce', 'pages', 'StoreScannerMap.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Remove the custom Leaflet DivIcon userCenterIcon since we will use a CSS overlay
content = content.replace(/const userCenterIcon = new L\.DivIcon\(\{[\s\S]*?\}\);\s*/, '');

// 2. Add useMapEvents to the imports
if (!content.includes('useMapEvents')) {
  content = content.replace(/import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';/, 
    "import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, useMapEvents } from 'react-leaflet';");
}

// 3. Insert the MapEventsHandler component right before StoreScannerMap function
if (!content.includes('function MapEventsHandler')) {
  content = content.replace(/export default function StoreScannerMap\(\) \{/, 
`// Component to listen to map drag/pan events
function MapEventsHandler({ setMapCenter, setIsMapMoved }) {
  const map = useMapEvents({
    move: () => {
      setMapCenter(map.getCenter());
      setIsMapMoved(true);
    },
  });
  return null;
}

export default function StoreScannerMap() {`);
}

// 4. Add new states inside StoreScannerMap
if (!content.includes('const [mapCenter, setMapCenter] = useState(null);')) {
  content = content.replace(/const \[userLocation, setUserLocation\] = useState\(null\);/, 
    `const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [isMapMoved, setIsMapMoved] = useState(false);`);
}

// 5. Update initial location setting to also set mapCenter
content = content.replace(/setUserLocation\(\[position\.coords\.latitude, position\.coords\.longitude\]\);/g, 
  `setUserLocation([position.coords.latitude, position.coords.longitude]);
          setMapCenter({ lat: position.coords.latitude, lng: position.coords.longitude });`);

content = content.replace(/setUserLocation\(defaultLocation\);/g, 
  `setUserLocation(defaultLocation);
      setMapCenter({ lat: defaultLocation[0], lng: defaultLocation[1] });`);

// 6. Update centerOnUser function
content = content.replace(/const centerOnUser = \(\) => \{[\s\S]*?\}\;/m, 
`const centerOnUser = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
        setMapCenter({ lat: position.coords.latitude, lng: position.coords.longitude });
        fetchStores([position.coords.latitude, position.coords.longitude]);
        setIsMapMoved(false);
      });
    }
  };`);

// 7. Update MapContainer to use mapCenter for the Circle
content = content.replace(/<Circle[\s]*center=\{userLocation\}[\s]*radius=\{scanRadius\}[\s]*pathOptions=\{\{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0\.05, weight: 1 \}\}[\s]*\/>/, 
  `<Circle 
              center={mapCenter || userLocation} 
              radius={scanRadius} 
              pathOptions={{ color: '#000000', fillColor: '#000000', fillOpacity: 0.15, weight: 1 }} 
            />`);

// 8. Add MapEventsHandler inside MapContainer and remove the old Marker
content = content.replace(/<Marker position=\{userLocation\} icon=\{userCenterIcon\} zIndexOffset=\{1000\}>[\s\S]*?<\/Marker>/, 
  `<MapEventsHandler setMapCenter={setMapCenter} setIsMapMoved={setIsMapMoved} />`);

// 9. Change radar ring position to center of screen (absolute div) instead of map layer
content = content.replace(/\{\/\* Radar Effect CSS Overlay centered on user \*\/\}/, 
  `{/* Fixed Central Pin & Search Button Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-[50]">
        
        {/* Buscar Aquí Button */}
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
        </AnimatePresence>

        {/* Central Pin (Fixed) */}
        <div className="relative mt-2" style={{ filter: 'drop-shadow(0px 8px 12px rgba(0, 0, 0, 0.4))' }}>
          <svg width="44" height="58" viewBox="0 0 44 58" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform -translate-y-1/2">
            <path d="M22 2C10.954 2 2 10.954 2 22C2 37 22 56 22 56C22 56 42 37 42 22C42 10.954 33.046 2 22 2Z" fill="#f59e0b" stroke="white" strokeWidth="3"/>
            <g transform="translate(12, 11) scale(0.85)">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 6h18" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 10a4 4 0 0 1-8 0" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </g>
          </svg>
          
          {/* Radar scanning effect */}
          {isScanning && (
            <>
              <div className="absolute top-[18px] left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-amber-500/30 rounded-full animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
              <div className="absolute top-[18px] left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-amber-500/20 rounded-full animate-[ping_4s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
            </>
          )}
        </div>
      </div>

      {/* Radar Effect CSS Overlay centered on user */}`); // Keep original comment to avoid breaking anything else

// Remove the old radar effect block from map layer
content = content.replace(/<div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">[\s\S]*?<\/div>\s*<\/div>\s*\{\/\* TOP FLOATING HEADER \*\/\}/m, 
  `</div>\n\n      {/* TOP FLOATING HEADER */}`);

// Update MapContainer ChangeView to respond to mapCenter changes when centering on user
content = content.replace(/<ChangeView center=\{userLocation\} zoom=\{14\} \/>/, 
  `<ChangeView center={userLocation} zoom={14} />`); // we leave it as userLocation so it only flies back when userLocation state is forcibly updated by crosshair

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Map interactive mode implemented.');
