import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // 测试环境
    environment: 'jsdom',

    // 全局设置文件
    setupFiles: ['./src/setupTests.ts'],

    // 启用全局API（如describe, it, expect）
    globals: true,

    // 处理CSS文件
    css: true,

    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/setupTests.ts',
        '**/*.d.ts',
        '**/*.config.*'
      ]
    },

    // 排除目录
    exclude: ['**/tests/e2e/**', '**/node_modules/**']
  },

  // 路径别名配置（与vite.config.ts保持一致）
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@api': path.resolve(__dirname, './src/api'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
      '@shared': path.resolve(__dirname, '../../src/shared'),
    }
  }
})