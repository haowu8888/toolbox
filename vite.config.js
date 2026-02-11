import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '127.0.0.1'
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
        }
      }
    }
  }
})
