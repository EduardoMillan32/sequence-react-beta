import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  return {
    // Fíjate que ya le puse el nombre exacto de tu carpeta/repositorio
    base: command === 'build' ? '/sequence-react-beta/' : '/',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,mp3}'] 
        },
        manifest: {
          name: 'Sequence Classic',
          short_name: 'Sequence',
          description: 'Juego de mesa Sequence multijugador',
          theme_color: '#1a252f',
          background_color: '#1a252f',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            {
              src: './icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: './icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: './icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })]
  };
});
