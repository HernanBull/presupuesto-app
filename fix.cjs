const fs = require('fs');
const filePath = 'src/modules/ecommerce/pages/StoreScannerMap.jsx';
let content = fs.readFileSync(filePath, 'utf-8');

const oldBlock = `{/* Search History Circles */}
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

const newBlock = `{/* Active Search Area Circle and Marker */}
            {activeSearchLocation && (
              <>
                <Circle 
                  center={{ lat: activeSearchLocation.lat, lng: activeSearchLocation.lng }} 
                  radius={scanRadius} 
                  pathOptions={{ color: '#000000', fillColor: '#000000', fillOpacity: 0.15, weight: 1.5 }} 
                />
                <Marker 
                  position={[activeSearchLocation.lat, activeSearchLocation.lng]} 
                  icon={searchLocationIcon} 
                  zIndexOffset={900}
                />
              </>
            )}`;

content = content.replace(oldBlock, newBlock);
// To handle \r\n issues if simple string replace fails:
if (content.includes('searchAreas.map')) {
    content = content.replace(/\{\/\* Search History Circles \*\/\}[\s\S]*?\}\)\}/, newBlock);
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Fixed');
