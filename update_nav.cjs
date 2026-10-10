const fs = require('fs');
const path = require('path');

const filePath = path.join('f:', 'Presupuesto', 'src', 'modules', 'ecommerce', 'pages', 'MarketplaceDirectory.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Button
content = content.replace(
  /<button className="flex flex-col items-center justify-center p-2 text-zinc-400 hover:text-amber-500 transition-colors">\n\s*<MapPin size={24} className="mb-1" \/>\n\s*<span className="text-\[10px\] font-medium">Mapa<\/span>\n\s*<\/button>/g,
  `<button onClick={() => navigate('/mapa')} className="flex flex-col items-center justify-center p-2 text-zinc-400 hover:text-amber-500 transition-colors">\n              <MapPin size={24} className="mb-1" />\n              <span className="text-[10px] font-medium">Mapa</span>\n            </button>`
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Nav updated.');
