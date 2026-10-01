const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create clean SVG representation of LUMO Brand Icon
function getLumoSvg(size, isMaskable = false) {
  const padding = isMaskable ? Math.round(size * 0.1) : 0;
  const innerSize = size - padding * 2;
  const rx = isMaskable ? 0 : Math.round(size * 0.22);
  const cx = size / 2;
  const cy = size / 2;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="#0B192C" rx="${rx}" />
    <!-- Outer Orange Glow Ring -->
    <circle cx="${cx}" cy="${cy}" r="${innerSize * 0.38}" fill="none" stroke="#FF5500" stroke-width="${Math.max(4, innerSize * 0.04)}" opacity="0.9" />
    <circle cx="${cx}" cy="${cy}" r="${innerSize * 0.34}" fill="#0B192C" />
    
    <!-- Bold Stylized LUMO 'L' & Fast Arrow / Lightning Bolt -->
    <g transform="translate(${cx - innerSize * 0.22}, ${cy - innerSize * 0.24}) scale(${innerSize / 160})">
      <!-- Lightning Bolt / Fast Dispatch Arrow -->
      <path d="M 35 10 L 10 50 L 32 50 L 20 85 L 60 40 L 38 40 Z" fill="#FF5500" />
      <path d="M 45 25 L 25 58 L 40 58 L 30 85 L 65 48 L 48 48 Z" fill="#FFAA00" opacity="0.6" />
    </g>
    
    <!-- LUMO Text Branding -->
    <text x="${cx}" y="${cy + innerSize * 0.28}" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="${innerSize * 0.14}" fill="#FFFFFF" text-anchor="middle" letter-spacing="2">LUMO</text>
    <text x="${cx}" y="${cy + innerSize * 0.38}" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="${innerSize * 0.06}" fill="#FF5500" text-anchor="middle" letter-spacing="4">MERCHANT</text>
  </svg>`;
}

const svg192 = getLumoSvg(192, false);
const svg512 = getLumoSvg(512, false);
const svg192Maskable = getLumoSvg(192, true);
const svg512Maskable = getLumoSvg(512, true);

fs.writeFileSync(path.join(iconsDir, 'icon-192.svg'), svg192);
fs.writeFileSync(path.join(iconsDir, 'icon-512.svg'), svg512);
fs.writeFileSync(path.join(iconsDir, 'icon-192-maskable.svg'), svg192Maskable);
fs.writeFileSync(path.join(iconsDir, 'icon-512-maskable.svg'), svg512Maskable);

console.log('SVG icons generated successfully in public/icons');
