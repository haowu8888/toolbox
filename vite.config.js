import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

const TREND_PROXY_PATH = '/api/finance/chart'
const YAHOO_FINANCE_ORIGIN = 'https://query1.finance.yahoo.com'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-192x192.png', 'pwa-512x512.png', 'apple-touch-icon.png'],
      manifest: {
        name: '工具箱 - 开发者在线工具集',
        short_name: '工具箱',
        description:
          '免费在线开发者工具箱：二维码、JSON、加密、编码、正则、Markdown、时间/单位转换、验证、文件处理等。',
        theme_color: '#4ecdc4',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,txt,woff2}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
  server: {
    host: '127.0.0.1',
    port: 3455,
    strictPort: true,
    proxy: {
      [TREND_PROXY_PATH]: {
        target: YAHOO_FINANCE_ORIGIN,
        changeOrigin: true,
        rewrite: (path) => path.replace(TREND_PROXY_PATH, '/v8/finance/chart'),
      },
    },
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue': ['vue'],
          'vendor-crypto': ['crypto-js'],
          'vendor-markdown': ['markdown-it'],
          'vendor-qrcode': ['qrcode'],
        },
      },
    },
  },
})
