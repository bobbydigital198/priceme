/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// App version 1.x.y: x is the build stage, set in package.json ("1.4.0" = stage 4);
// y counts the updates published so far, taken from the number of saved commits.
const [major, stage] = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version.split('.')
const updates = execSync('git rev-list --count HEAD').toString().trim()
const appVersion = `${major}.${stage}.${updates}`

// The app is served from https://bobbydigital198.github.io/priceme/
export default defineConfig({
  base: '/priceme/',
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'PrixIt',
        short_name: 'PrixIt',
        description: 'Log supermarket prices by scanning barcodes and price tags.',
        lang: 'en-GB',
        start_url: '/priceme/',
        scope: '/priceme/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#111111',
        theme_color: '#111111',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,wasm,gz}'],
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
      },
    }),
  ],
  test: {
    environment: 'node',
  },
})
