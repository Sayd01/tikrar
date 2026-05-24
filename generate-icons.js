const fs = require('fs');

function generateSVG(size) {
  const fontSize = Math.round(size * 0.45);
  const subFontSize = Math.round(size * 0.09);
  const cy = Math.round(size * 0.42);
  const subY = Math.round(size * 0.72);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0d9488"/>
      <stop offset="100%" style="stop-color:#059669"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.15)}" fill="url(#bg)"/>
  <text x="50%" y="${cy}" text-anchor="middle" dominant-baseline="central"
        font-family="'Traditional Arabic','Noto Naskh Arabic',serif"
        font-size="${fontSize}" fill="white" font-weight="bold">ت</text>
  <text x="50%" y="${subY}" text-anchor="middle" dominant-baseline="central"
        font-family="system-ui,sans-serif"
        font-size="${subFontSize}" fill="rgba(255,255,255,0.85)" font-weight="600">TIKRAR</text>
</svg>`;
}

// Essayer sharp, sinon sauvegarder en SVG
try {
  const sharp = require('sharp');
  Promise.all([
    sharp(Buffer.from(generateSVG(192))).png().toFile('./icons/icon-192.png'),
    sharp(Buffer.from(generateSVG(512))).png().toFile('./icons/icon-512.png')
  ]).then(() => console.log('PNG icons generated with sharp'));
} catch (e) {
  // Fallback : sauvegarder en SVG et utiliser comme icônes
  fs.writeFileSync('./icons/icon-192.svg', generateSVG(192));
  fs.writeFileSync('./icons/icon-512.svg', generateSVG(512));

  // Créer un canvas-based PNG generator minimal
  // Ou simplement créer un 1x1 PNG placeholder
  const createMinimalPNG = (size) => {
    // PNG avec un simple carré vert teal
    const { createCanvas } = (() => {
      try { return require('canvas'); } catch(e) { return {}; }
    })();

    if (createCanvas) {
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, '#0d9488');
      gradient.addColorStop(1, '#059669');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(0, 0, size, size, size * 0.15);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.font = `bold ${size * 0.45}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ت', size/2, size * 0.42);
      ctx.font = `600 ${size * 0.09}px sans-serif`;
      ctx.fillText('TIKRAR', size/2, size * 0.72);
      return canvas.toBuffer('image/png');
    }
    return null;
  };

  const png192 = createMinimalPNG(192);
  const png512 = createMinimalPNG(512);

  if (png192) {
    fs.writeFileSync('./icons/icon-192.png', png192);
    fs.writeFileSync('./icons/icon-512.png', png512);
    console.log('PNG icons generated with canvas');
  } else {
    // Dernier recours : utiliser les SVG directement
    fs.copyFileSync('./icons/icon-192.svg', './icons/icon-192.png');
    fs.copyFileSync('./icons/icon-512.svg', './icons/icon-512.png');
    console.log('SVG icons saved (install sharp or canvas for proper PNG: npm i sharp)');
  }
}
