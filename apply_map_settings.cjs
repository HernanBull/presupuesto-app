const fs = require('fs');
const path = require('path');

const filePath = path.join('f:', 'Presupuesto', 'src', 'modules', 'ecommerce', 'pages', 'StoreScannerMap.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add imports for Circle and MapSettingsModal, and ShoppingBag
if (!content.includes('MapSettingsModal')) {
  content = content.replace(
    /import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';/,
    `import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';\nimport MapSettingsModal from '../components/MapSettingsModal';`
  );
}

// Ensure ShoppingBag is imported
if (!content.includes('ShoppingBag')) {
  content = content.replace(
    /import { X, Search, Settings, Crosshair, MapPin, Store, Clock, SlidersHorizontal, Navigation, ArrowRight } from 'lucide-react';/,
    `import { X, Search, Settings, Crosshair, MapPin, Store, Clock, SlidersHorizontal, Navigation, ArrowRight, ShoppingBag } from 'lucide-react';`
  );
}

// 2. Add Haversine distance function outside component
if (!content.includes('function calculateDistance(')) {
  content = content.replace(
    /export default function StoreScannerMap\(\) {/,
    `// Haversine distance formula (returns distance in meters)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function StoreScannerMap() {`
  );
}

// 3. Add Settings State
if (!content.includes('const [isSettingsOpen, setIsSettingsOpen]')) {
  content = content.replace(
    /const \[userLocation, setUserLocation\] = useState\(null\);/,
    `const [userLocation, setUserLocation] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [scanRadius, setScanRadius] = useState(1000);
  const [showZones, setShowZones] = useState(false);
  const [onlyMalls, setOnlyMalls] = useState(false);`
  );
}

// 4. Update data fetching to filter by distance and malls
if (!content.includes('filteredStores = filteredStores.filter')) {
  content = content.replace(
    /if \(data\) {[\s\S]*?setStores\(data\);[\s\S]*?}/,
    `if (data) {
          // Si tenemos ubicación, filtramos por distancia y configuración
          if (loc && loc.lat && loc.lng) {
            let filteredStores = data.filter(store => {
              const dist = calculateDistance(loc.lat, loc.lng, store.latitude, store.longitude);
              store.distanceToUser = dist; // Guardamos la distancia para mostrarla
              return dist <= scanRadius; // Solo comercios dentro del radio
            });
            
            // Filtro de solo centros comerciales
            if (onlyMalls) {
              filteredStores = filteredStores.filter(store => store.config?.location_type === 'mall' || store.config?.is_mall === true || store.config?.business_type === 'Centro Comercial');
            }
            
            setStores(filteredStores);
          } else {
            // Si por alguna razón no hay loc, cargamos todos (o podríamos no mostrar nada)
            setStores(data);
          }
        }`
  );
  
  // Also pass the dependencies to useEffect if needed, but since it's inside an async call that triggers on mount, 
  // we actually need to re-fetch or re-filter when settings change.
  // We'll update the useEffect dependencies to include scanRadius, onlyMalls.
  content = content.replace(
    /useEffect\(\(\) => {[\s\S]*?navigator\.geolocation\.getCurrentPosition\(\([\s\S]*?}, \[\]\);/m,
    function(match) {
      // Reemplazamos la línea final del useEffect
      return match.replace(/}, \[\]\);/, '}, [scanRadius, onlyMalls]);');
    }
  );
}

// 5. Connect Settings button
content = content.replace(
  /<button className="w-10 h-10 bg-white\/95 backdrop-blur-xl rounded-xl flex items-center justify-center text-zinc-800 border border-zinc-200\/60 shadow-lg">/,
  '<button onClick={() => setIsSettingsOpen(true)} className="w-10 h-10 bg-white/95 backdrop-blur-xl rounded-xl flex items-center justify-center text-zinc-800 border border-zinc-200/60 shadow-lg">'
);

// 6. Draw Leaflet Circle & Central Logo Marker
if (!content.includes('<Circle center={userLocation}')) {
  content = content.replace(
    /<ChangeView center={userLocation} zoom={14} \/>/g,
    `<ChangeView center={userLocation} zoom={14} />
            
            <Circle 
              center={userLocation} 
              radius={scanRadius} 
              pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.05, weight: 1 }} 
            />`
  );
}

// Custom DivIcon for the central Shopping Bag
if (!content.includes('userCenterIcon')) {
  content = content.replace(
    /export default function StoreScannerMap/,
    `import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';

const userCenterIcon = new L.DivIcon({
  className: 'custom-user-center-icon',
  html: renderToStaticMarkup(
    <div style="background-color: #f59e0b; width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.5); border: 3px solid white;">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
    </div>
  ),
  iconSize: [48, 48],
  iconAnchor: [24, 24]
});

export default function StoreScannerMap`
  );
  
  // Replace standard user marker with the custom one
  content = content.replace(
    /<Marker position={userLocation}>[\s\S]*?<\/Marker>/,
    `<Marker position={userLocation} icon={userCenterIcon} zIndexOffset={1000}>
              <Popup className="rounded-2xl">
                Tú estás aquí
              </Popup>
            </Marker>`
  );
}

// 7. Render Settings Modal
if (!content.includes('<MapSettingsModal')) {
  content = content.replace(
    /<\/div>\n\n      \{\/\* BOTTOM STORE DETAILS SHEET \*\/\}/,
    `</div>

      <MapSettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        scanRadius={scanRadius} 
        setScanRadius={setScanRadius}
        showZones={showZones}
        setShowZones={setShowZones}
        onlyMalls={onlyMalls}
        setOnlyMalls={setOnlyMalls}
      />

      {/* BOTTOM STORE DETAILS SHEET */}`
  );
}

// Replace exact distance if available
content = content.replace(
  /\{\(Math\.random\(\) \* 5 \+ 0\.5\)\.toFixed\(1\)\} km/,
  `{selectedStore.distanceToUser ? (selectedStore.distanceToUser / 1000).toFixed(1) : (Math.random() * 5 + 0.5).toFixed(1)} km`
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('StoreScannerMap updated with radar features.');
