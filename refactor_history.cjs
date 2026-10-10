const fs = require('fs');
const path = require('path');

const filePath = path.join('f:', 'Presupuesto', 'src', 'modules', 'ecommerce', 'pages', 'StoreScannerMap.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add searchAreas state
if (!content.includes('searchAreas')) {
  content = content.replace(/const \[userLocation, setUserLocation\] = useState\(null\);/, 
    `const [userLocation, setUserLocation] = useState(null);\n  const [searchAreas, setSearchAreas] = useState([]);`);
}

// 2. Update initial GPS fetch to add to searchAreas
content = content.replace(/setUserLocation\(\[position\.coords\.latitude, position\.coords\.longitude\]\);\s*setMapCenter\(\{ lat: position\.coords\.latitude, lng: position\.coords\.longitude \}\);\s*fetchStores\(\[position\.coords\.latitude, position\.coords\.longitude\]\);/, 
  `setUserLocation([position.coords.latitude, position.coords.longitude]);
          setMapCenter({ lat: position.coords.latitude, lng: position.coords.longitude });
          setSearchAreas([{ lat: position.coords.latitude, lng: position.coords.longitude, radius: 1000 }]);
          fetchStores([position.coords.latitude, position.coords.longitude]);`);

content = content.replace(/setUserLocation\(defaultLocation\);\s*setMapCenter\(\{ lat: defaultLocation\[0\], lng: defaultLocation\[1\] \}\);\s*fetchStores\(defaultLocation\);/g, 
  `setUserLocation(defaultLocation);
          setMapCenter({ lat: defaultLocation[0], lng: defaultLocation[1] });
          setSearchAreas([{ lat: defaultLocation[0], lng: defaultLocation[1], radius: 1000 }]);
          fetchStores(defaultLocation);`);

// 3. Update useEffect for filter changes to modify last search area's radius
const oldEffect2 = `  // 2. Re-fetch when filters change, using current map center
  useEffect(() => {
    if (mapCenter) {
      fetchStores([mapCenter.lat, mapCenter.lng]);
    }
  }, [scanRadius, onlyMalls]);`;

const newEffect2 = `  // 2. Re-fetch when filters change, update last search area radius
  useEffect(() => {
    if (searchAreas.length > 0) {
      const last = searchAreas[searchAreas.length - 1];
      setSearchAreas(prev => {
        const arr = [...prev];
        arr[arr.length - 1].radius = scanRadius;
        return arr;
      });
      fetchStores([last.lat, last.lng]);
    } else if (mapCenter) {
      fetchStores([mapCenter.lat, mapCenter.lng]);
    }
  }, [scanRadius, onlyMalls]);`;

content = content.replace(oldEffect2, newEffect2);

// 4. Update the "Buscar en esta zona" onClick
content = content.replace(/onClick=\{\(\) => \{\s*setIsMapMoved\(false\);\s*fetchStores\(\[mapCenter\.lat, mapCenter\.lng\]\);\s*\}\}/, 
  `onClick={() => {
                setIsMapMoved(false);
                setSearchAreas(prev => [...prev, { lat: mapCenter.lat, lng: mapCenter.lng, radius: scanRadius }]);
                fetchStores([mapCenter.lat, mapCenter.lng]);
              }}`);

// 5. Replace the single Circle with mapped searchAreas
const oldCircle = `{/* Radar Scanning Radius Circle */}
            <Circle 
              center={mapCenter || userLocation} 
              radius={scanRadius} 
              pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.15, weight: 2 }} 
            />`;

const newCircle = `{/* Search History Circles */}
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

content = content.replace(oldCircle, newCircle);

// 6. Remove the radar animation from the central pin
content = content.replace(/\{\/\* Radar scanning effect \*\/\}\s*\{isScanning && \(\s*<>\s*<div className="absolute top-\[18px\] left-1\/2 -translate-x-1\/2 -translate-y-1\/2 w-64 h-64 border border-amber-500\/30 rounded-full animate-\[ping_3s_cubic-bezier\(0,0,0\.2,1\)_infinite\]"><\/div>\s*<div className="absolute top-\[18px\] left-1\/2 -translate-x-1\/2 -translate-y-1\/2 w-96 h-96 border border-amber-500\/20 rounded-full animate-\[ping_4s_cubic-bezier\(0,0,0\.2,1\)_infinite\]"><\/div>\s*<\/>\s*\)\}/, '');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Search history implemented and radar animation removed.');
