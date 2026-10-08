import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Practical Chinese',
        short_name: '中文',
        description: 'Flashcards and games built on your own Notion dictionary.',
        lang: 'en',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F3EDE3',
        theme_color: '#F3EDE3',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The hanzi font ships as ~580 small subsets; cache them as they're used instead of precaching all.
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        globIgnores: ['**/lxgwwenkai-*'],
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          { urlPattern: /lxgwwenkai-.*\.woff2$/, handler: 'CacheFirst', options: { cacheName: 'hanzi-font', expiration: { maxEntries: 600 } } },
          { urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//, handler: 'StaleWhileRevalidate', options: { cacheName: 'google-fonts' } },
        ],
      },
    }),
  ],
  test: { include: ['shared/**/*.test.ts', 'src/**/*.test.ts', 'tests/**/*.test.ts'] },
} as any);
