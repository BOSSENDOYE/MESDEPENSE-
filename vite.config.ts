import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Enregistrement fait dans src/pwa.ts (pour afficher « Prête hors-ligne »).
      injectRegister: false,
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'logo-app.png'],
      manifest: {
        name: 'Mes Dépenses',
        short_name: 'Dépenses',
        description: 'Suivi de mes dépenses personnelles en FCFA, 100 % hors-ligne.',
        lang: 'fr',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f8fafc',
        theme_color: '#047857',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Logo original (1,4 Mo) : inutile hors-ligne, l'app utilise logo-app.png.
        globIgnores: ['**/logo.png'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Librairies dans des fichiers séparés : une mise à jour de l'app ne re-télécharge pas Recharts.
        manualChunks: {
          react: ['react', 'react-dom'],
          charts: ['recharts'],
          vendor: ['idb', 'date-fns'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
