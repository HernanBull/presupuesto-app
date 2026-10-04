import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

import fs from 'fs'
import path from 'path'

const generateVersionFile = () => {
  return {
    name: 'generate-version-file',
    writeBundle() {
      const version = Date.now().toString()
      const versionInfo = { version }
      fs.writeFileSync(
        path.resolve(__dirname, 'dist', 'version.json'),
        JSON.stringify(versionInfo, null, 2)
      )
      console.log('Version file generated with version:', version)
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    generateVersionFile(),
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192x192.png', 'icon-512x512.png', 'icon-maskable.png'],
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 }
            }
          }
        ]
      },
      manifest: {
        name: 'AxonMarket',
        short_name: 'AxonMarket',
        description: 'Tu marketplace local — compra, vende y crece con AxonMarket',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'es',
        categories: ['shopping', 'business'],
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icon-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        screenshots: [
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'AxonMarket Marketplace'
          }
        ]
      }
    })
  ],
})
