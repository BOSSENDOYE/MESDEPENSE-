// Prépare le logo à partir de public/logo.png (fond blanc, 1254 px, 1,4 Mo) :
//  - fond blanc rendu transparent (remplissage depuis les bords : les barres blanches du dessin sont conservées)
//  - marges retirées, logo recentré dans un carré
//  - branding/logo-source.png (1024 px, source des icônes PWA) et public/logo-app.png (256 px, affiché dans l'app)
// Usage : node scripts/prepare-logo.mjs && npm run generate-pwa-assets
import sharp from 'sharp';

const SOURCE = 'public/logo.png';

const { data, info } = await sharp(SOURCE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height } = info;

/** Fond : très clair et peu coloré (blanc + ombre vert pâle sous le portefeuille). */
function isBackground(i) {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const min = Math.min(r, g, b), max = Math.max(r, g, b);
  return min > 160 && max - min < 80;
}

// Remplissage depuis les bords de l'image.
const visited = new Uint8Array(width * height);
const stack = [];
for (let x = 0; x < width; x++) stack.push(x, (height - 1) * width + x);
for (let y = 0; y < height; y++) stack.push(y * width, y * width + width - 1);
while (stack.length > 0) {
  const p = stack.pop();
  if (visited[p]) continue;
  visited[p] = 1;
  if (!isBackground(p * 4)) continue;
  data[p * 4 + 3] = 0;
  const x = p % width, y = (p - x) / width;
  if (x > 0) stack.push(p - 1);
  if (x < width - 1) stack.push(p + 1);
  if (y > 0) stack.push(p - width);
  if (y < height - 1) stack.push(p + width);
}

// Adoucit le contour : pixels clairs au bord du logo rendus semi-transparents.
for (let p = 0; p < width * height; p++) {
  const i = p * 4;
  if (data[i + 3] === 0) continue;
  const x = p % width, y = (p - x) / width;
  const nextToTransparent =
    (x > 0 && data[i - 4 + 3] === 0) ||
    (x < width - 1 && data[i + 4 + 3] === 0) ||
    (y > 0 && data[i - width * 4 + 3] === 0) ||
    (y < height - 1 && data[i + width * 4 + 3] === 0);
  if (nextToTransparent) {
    const lightness = Math.min(data[i], data[i + 1], data[i + 2]);
    data[i + 3] = Math.max(0, Math.min(255, Math.round(((255 - lightness) / 80) * 255)));
  }
}

const transparent = await sharp(data, { raw: { width, height, channels: 4 } })
  .png()
  .toBuffer();
const trimmed = await sharp(transparent).trim().toBuffer({ resolveWithObject: true });
const side = Math.round(Math.max(trimmed.info.width, trimmed.info.height) * 1.04);
const square = await sharp({
  create: { width: side, height: side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite([{ input: trimmed.data, gravity: 'center' }])
  .png()
  .toBuffer();

await sharp(square).resize(1024, 1024).png({ compressionLevel: 9 }).toFile('branding/logo-source.png');
await sharp(square).resize(256, 256).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile('public/logo-app.png');
console.log(`Logo détouré : ${trimmed.info.width}×${trimmed.info.height} px → branding/logo-source.png, public/logo-app.png`);
