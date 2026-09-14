/// <reference types='vitest' />
import { defineConfig } from 'vite';
import tailwindcss from "@tailwindcss/vite";
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../node_modules/.vite/choir-client',
  server:{
    proxy: {
      "/api": {
        target: "http://localhost:3333",
        changeOrigin: true
      }
    },
    port: 4200,
    host: 'localhost',
  },
  preview:{
    port: 4300,
    host: 'localhost',
  },
  plugins: [
    tailwindcss(), 
    react(), 
    nxViteTsPaths(), 
    nxCopyAssetsPlugin(['*.md']),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      includeAssets: ['icon-192x192.png', 'icon-512x512.png', 'screenshot-mobile.png', 'screenshot-desktop.png'],
      manifest: {
        name: 'Choir Sync',
        short_name: 'Choir Sync',
        description: 'Choir management app for songs, parts, and rehearsals',
        theme_color: '#850bc4',
        background_color: '#1a0a2e',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        screenshots: [
          {
            src: '/screenshot-mobile.png',
            sizes: '1080x2400',
            type: 'image/png',
            form_factor: 'narrow'
          },
          {
            src: '/screenshot-desktop.png',
            sizes: '2560x1600',
            type: 'image/png',
            form_factor: 'wide'
          }
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /\/api\/v1\/songs/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'songs-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
        ],
      },
    })
  ],
  // Uncomment this if you are using workers.
  // worker: {
  //   plugins: () => [ nxViteTsPaths() ],
  // },
  build: {
    outDir: '../dist/choir-client',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
}));
