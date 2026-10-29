import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config';

// Le logo est vert : les icônes à fond plein (Android « maskable », iPhone) ont un fond blanc.
const BACKGROUND = '#ffffff';

// Génère favicon et icônes PWA à partir du logo détouré :
//   node scripts/prepare-logo.mjs && npm run generate-pwa-assets
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...preset,
    maskable: { ...preset.maskable, resizeOptions: { ...preset.maskable.resizeOptions, background: BACKGROUND } },
    apple: { ...preset.apple, resizeOptions: { ...preset.apple.resizeOptions, background: BACKGROUND } },
  },
  images: ['branding/logo-source.png'],
});
