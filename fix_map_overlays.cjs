const fs = require('fs');
const path = require('path');

const filePath = path.join('f:', 'Presupuesto', 'src', 'modules', 'ecommerce', 'pages', 'StoreScannerMap.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Replace dark overlays with light overlays
content = content.replace(/bg-zinc-900\/90 backdrop-blur-md/g, 'bg-white/95 backdrop-blur-xl');
content = content.replace(/border-white\/10/g, 'border-zinc-200/60');
content = content.replace(/text-white/g, 'text-zinc-800');
content = content.replace(/text-zinc-400/g, 'text-zinc-500'); // for the search icon
content = content.replace(/border-t-teal-500/g, 'border-t-amber-500'); // loading spinner color to match brand
content = content.replace(/text-teal-500/g, 'text-amber-500'); // icons to match brand
content = content.replace(/text-teal-400/g, 'text-amber-600');
content = content.replace(/bg-teal-400\/10/g, 'bg-amber-500/10');

// Bottom sheet adjustments
content = content.replace(/bg-zinc-950/g, 'bg-white');
content = content.replace(/bg-zinc-800/g, 'bg-zinc-200'); // grabber handle
content = content.replace(/bg-zinc-900/g, 'bg-zinc-100'); // store logo background
content = content.replace(/bg-white text-black/g, 'bg-amber-500 text-white hover:bg-amber-600'); // CTA button

// Make sure icons that might be text-white are text-zinc-800
// Note: we already replaced text-white with text-zinc-800 globally

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Map overlays updated to light theme.');
