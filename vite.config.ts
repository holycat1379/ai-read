import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from '@unocss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './', // 关键！让资源路径变成相对路径
  plugins: [vue(), UnoCSS(), VitePWA({
    workbox: {
      clientsClaim: true,
      skipWaiting: true,
      globPatterns: ['**/*.{js,css,html,ico,png,svg}']
    },
    registerType: 'autoUpdate',
    manifest: {
      name: 'My Vue App',
      short_name: 'VueApp',
      theme_color: '#4DBA87',
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
        }
      ]
    }
  })],
  build: {
    rollupOptions: {
      external: ['workbox-window']
    }
  }
})
