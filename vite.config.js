import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

function normalizeBasePath(path = '/') {
  if (!path.startsWith('/')) return `/${path}/`;
  if (!path.endsWith('/')) return `${path}/`;
  return path;
}

// https://vite.dev/config/
export default defineConfig(() => {
  const basePath = normalizeBasePath(process.env.VITE_BASE_PATH || '/AppartmentApp/');

  return {
    base: basePath,
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon-180x180.png', 'fonts/NotoSans-Regular.ttf'],
        manifest: {
          name: 'The Pride of Tirumala — Expense Tracker',
          short_name: 'TPT Tracker',
          description: 'Apartment maintenance expense tracker with Google Sheets integration',
          theme_color: '#f3efe6',
          background_color: '#f3efe6',
          display: 'standalone',
          scope: basePath,
          start_url: basePath,
          orientation: 'any',
          icons: [
            {
              src: 'icons/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'icons/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'icons/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          cacheId: 'tpt-v53',
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,ttf}'],
          navigateFallbackDenylist: [/^https:\/\/(apis\.google\.com|accounts\.google\.com|.*\.googleapis\.com)/],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/(apis\.google\.com|accounts\.google\.com|.*\.googleapis\.com|content\.googleapis\.com|www\.gstatic\.com)\//i,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ],
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router')) {
              return 'vendor';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'icons';
            }
            if (id.includes('node_modules/jspdf')) {
              return 'pdf';
            }
          },
        },
      },
    },
  };
});
