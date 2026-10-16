import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // registry.js 静态引用了 ToolLoading.vue，测试里需要能编译 SFC
  plugins: [vue()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})
