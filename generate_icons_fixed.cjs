const fs = require('fs');
const sharp = require('sharp');

const svgCode = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="128" fill="#f59e0b" />
  <g transform="translate(148, 148) scale(9)">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" stroke="#271c19" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M3 6h18" stroke="#271c19" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M16 10a4 4 0 0 1-8 0" stroke="#271c19" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;

async function run() {
  fs.writeFileSync('public/favicon.svg', svgCode);
  await sharp(Buffer.from(svgCode))
    .resize(512, 512)
    .png()
    .toFile('public/icon-512x512.png');
  await sharp(Buffer.from(svgCode))
    .resize(192, 192)
    .png()
    .toFile('public/icon-192x192.png');
  // For maskable icon, it's better to not have rounded corners (the OS applies them)
  const svgMaskable = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" fill="#f59e0b" />
    <g transform="translate(148, 148) scale(9)">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" stroke="#271c19" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M3 6h18" stroke="#271c19" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M16 10a4 4 0 0 1-8 0" stroke="#271c19" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </svg>`;
  await sharp(Buffer.from(svgMaskable))
    .resize(512, 512)
    .png()
    .toFile('public/icon-maskable.png');
  console.log('Icons generated successfully.');
}
run();
