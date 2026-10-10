const fs = require('fs');
const path = require('path');

const filePath = path.join('f:', 'Presupuesto', 'src', 'modules', 'ecommerce', 'pages', 'StoreScannerMap.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

const searchIconCode = `const searchLocationIcon = new L.DivIcon({
  className: 'custom-search-location-icon',
  html: renderToStaticMarkup(
    <div className="relative mt-2" style={{ filter: 'drop-shadow(0px 10px 15px rgba(0, 0, 0, 0.5))' }}>
      <svg width="44" height="58" viewBox="0 0 44 58" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform -translate-y-1/2">
        <defs>
          <linearGradient id="searchPinGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
        </defs>
        <path d="M22 2C10.954 2 2 10.954 2 22C2 37 22 56 22 56C22 56 42 37 42 22C42 10.954 33.046 2 22 2Z" fill="url(#searchPinGrad)" stroke="white" strokeWidth="3"/>
        <path d="M22 4C11.5 4 4 11.5 4 22C4 32 18 48 22 52C26 48 40 32 40 22C40 11.5 32.5 4 22 4Z" fill="white" fillOpacity="0.15" />
        <g transform="translate(12, 11) scale(0.85)">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 6h18" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 10a4 4 0 0 1-8 0" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </g>
      </svg>
    </div>
  ),
  iconSize: [44, 58],
  iconAnchor: [22, 56]
});`;

content = content.replace(/export default function StoreScannerMap\(\) \{/, 
  `${searchIconCode}\n\nexport default function StoreScannerMap() {`);

content = content.replace(/const \[searchAreas, setSearchAreas\] = useState\(\[\]\);/, 
  `const [activeSearchLocation, setActiveSearchLocation] = useState(null);`);

content = content.replace(/setSearchAreas\(\[\{ lat: position\.coords\.latitude, lng: position\.coords\.longitude, radius: 1000 \}\]\);/, 
  `setActiveSearchLocation({ lat: position.coords.latitude, lng: position.coords.longitude });`);
content = content.replace(/setSearchAreas\(\[\{ lat: defaultLocation\[0\], lng: defaultLocation\[1\], radius: 1000 \}\]\);/g, 
  `setActiveSearchLocation({ lat: defaultLocation[0], lng: defaultLocation[1] });`);

content = content.replace(/  \/\/ 2\. Re-fetch when filters change, update last search area radius[\s\S]*?  \}, \[scanRadius, onlyMalls\]\);/, 
`  // 2. Re-fetch when filters change, keeping the same active search location
  useEffect(() => {
    if (activeSearchLocation) {
      fetchStores([activeSearchLocation.lat, activeSearchLocation.lng]);
    } else if (mapCenter) {
      fetchStores([mapCenter.lat, mapCenter.lng]);
    }
  }, [scanRadius, onlyMalls]);`);

content = content.replace(/setSearchAreas\(prev => \[\.\.\.prev, \{ lat: mapCenter\.lat, lng: mapCenter\.lng, radius: scanRadius \}\]\);/, 
  `setActiveSearchLocation({ lat: mapCenter.lat, lng: mapCenter.lng });`);

const oldCircleBlock = `{/* Search History Circles */}
            {searchAreas.map((area, idx) => (
              <Circle 
                key={idx}
                center={{ lat: area.lat, lng: area.lng }} 
                radius={area.radius} 
                pathOptions={{ 
                  color: idx === searchAreas.length - 1 ? '#f59e0b' : '#71717a', 
                  fillColor: idx === searchAreas.length - 1 ? '#f59e0b' : '#71717a', 
                  fillOpacity: idx === searchAreas.length - 1 ? 0.15 : 0.05, 
                  weight: idx === searchAreas.length - 1 ? 2 : 1 
                }} 
              />
            ))}`;

const newCircleBlock = `{/* Active Search Area Circle and Marker */}
            {activeSearchLocation && (
              <Circle 
                center={{ lat: activeSearchLocation.lat, lng: activeSearchLocation.lng }} 
                radius={scanRadius} 
                pathOptions={{ color: '#000000', fillColor: '#000000', fillOpacity: 0.15, weight: 1.5 }} 
              />
            )}
            
            {activeSearchLocation && (
              <Marker 
                position={[activeSearchLocation.lat, activeSearchLocation.lng]} 
                icon={searchLocationIcon} 
                zIndexOffset={900}
              />
            )}`;

content = content.replace(oldCircleBlock, newCircleBlock);

content = content.replace(/<div className="relative mt-2 animate-\[bounce_2s_ease-in-out_infinite\]" style=\{\{ filter: 'drop-shadow\(0px 10px 15px rgba\(0, 0, 0, 0\.5\)\)' \}\}>/, 
  `<div className="relative mt-2 animate-[pulse_3s_ease-in-out_infinite] opacity-60 pointer-events-none" style={{ filter: 'drop-shadow(0px 10px 15px rgba(0, 0, 0, 0.5))' }}>`);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Pin transparency and active search logic applied.');
