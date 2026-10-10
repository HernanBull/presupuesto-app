const fs = require('fs');
const path = require('path');

const filePath = path.join('f:', 'Presupuesto', 'src', 'modules', 'ecommerce', 'EcommerceRouter.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Import
content = content.replace(
  /import MarketplaceDirectory from '\.\/pages\/MarketplaceDirectory';/,
  "import MarketplaceDirectory from './pages/MarketplaceDirectory';\nimport StoreScannerMap from './pages/StoreScannerMap';"
);

// Route
content = content.replace(
  /<Route path="\/store\/:storeId" element={<PublicStore theme={theme} \/>} \/>\n\s*<Route path="\/legal\/:docId" element={<LegalPage \/>} \/>/g,
  `<Route path="/store/:storeId" element={<PublicStore theme={theme} />} />\n      <Route path="/legal/:docId" element={<LegalPage />} />\n      <Route path="/mapa" element={<StoreScannerMap />} />`
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Router updated.');
