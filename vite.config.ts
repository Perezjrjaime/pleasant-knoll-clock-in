import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'Pleasant Knoll Logo.jpg'],
      manifest: {
        name: 'Pleasant Knoll Clock-In',
        short_name: 'Clock-In',
        description: 'Employee clock-in system for Pleasant Knoll Landscaping',
        theme_color: '#22c55e',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'Pleasant Knoll Logo.jpg',
            sizes: '192x192',
            type: 'image/jpeg'
          },
          {
            src: 'Pleasant Knoll Logo.jpg',
            sizes: '512x512',
            type: 'image/jpeg'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60 // 5 minutes
              }
            }
          }
        ]
      }
    })
  ],
  base: './' // This makes it work on both GitHub Pages and Azure
})
