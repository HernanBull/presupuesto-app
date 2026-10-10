const fs = require('fs');
const filePath = 'src/modules/ecommerce/pages/StoreScannerMap.jsx';
let content = fs.readFileSync(filePath, 'utf-8');
let lines = content.split(/\r?\n/);

const newBlock = `            {/* Active Search Area Circle and Marker */}
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

// Look for "{/* Search History Circles */}" and replace until "})}"
let startIndex = -1;
let endIndex = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('{/* Search History Circles */}')) {
    startIndex = i;
  }
  if (startIndex !== -1 && i > startIndex && lines[i].includes('))}')) {
    endIndex = i;
    break;
  }
}

if (startIndex !== -1 && endIndex !== -1) {
  lines.splice(startIndex, endIndex - startIndex + 1, newBlock);
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  console.log('Successfully spliced lines.');
} else {
  console.log('Could not find the block.');
}
