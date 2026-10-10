const fs = require('fs');
const path = require('path');

const filePath = path.join('f:', 'Presupuesto', 'src', 'modules', 'ecommerce', 'pages', 'MarketplaceDirectory.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Replace the Map button section manually
content = content.replace(
  /\/\/ Future map function/g,
  "navigate('/mapa');"
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Nav fixed.');
