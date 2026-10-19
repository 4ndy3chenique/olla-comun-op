import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// PWA: solo se precachean los estáticos (App Shell). Las respuestas de /api NUNCA se guardan en caché
// (datos personales, Ley N.° 29733); los datos offline viven cifrados en IndexedDB.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Manos y Ollas · Operativo',
        short_name: 'Operativo',
        description: 'Plataforma Operativa: despachos, ruta de entrega, padrón y auditoría de ollas comunes.',
        lang: 'es',
        start_url: '/',
        display: 'standalone',
        theme_color: '#1F4D3F',
        background_color: '#FAF8F3',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,woff2,png}'],
        // Librerías de reportes (requieren conexión): no se precachean para mantener liviana la instalación
        globIgnores: ['**/pdf-*.js', '**/excel-*.js', '**/html2canvas-*.js', '**/purify*.js', '**/index.es-*.js'],
        runtimeCaching: [
          { urlPattern: ({ url }) => url.pathname.startsWith('/api/') || url.hostname.endsWith('.azurewebsites.net'), handler: 'NetworkOnly' },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('qr-scanner')) return 'qr-scanner'
          if (id.includes('jspdf')) return 'pdf'
          if (id.includes('write-excel-file')) return 'excel'
          if (id.includes('node_modules/qrcode')) return 'qrcode'
        },
      },
    },
  },
})
