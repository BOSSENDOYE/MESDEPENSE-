import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config';

const BRAND = '#047857';

// Génère les icônes PNG de la PWA à partir de public/icon.svg :
//   npm run generate-pwa-assets
// Les icônes Android « maskable » et iPhone ont un fond vert plein (pas de marge blanche).
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...preset,
    maskable: { ...preset.maskable, resizeOptions: { ...preset.maskable.resizeOptions, background: BRAND } },
    apple: { ...preset.apple, resizeOptions: { ...preset.apple.resizeOptions, background: BRAND } },
  },
  images: ['public/icon.svg'],
});
