import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd())

  return {
    plugins: [react()],
    base: './', // 使用相对路径，支持部署到任意目录
    server: {
      port: Number(env.VITE_PORT) || 3100,
      open: true,
      proxy: {
        // 代理 API 请求到测试服务器
        '/admin': {
          target: 'https://hsh-test.vbegin.com.cn',
          changeOrigin: true,
          secure: false, // 允许自签名证书
        },
      },
    },
    esbuild: {
      // 构建时忽略 TypeScript 类型错误
      logOverride: { 'this-is-undefined-in-esm': 'silent' }
    },
    build: {
      // 根据环境变量设置不同的输出目录
      outDir: env.VITE_APP_ENV === 'test' ? 'dist-test' : 'dist',
      sourcemap: true,
      // 静态资源使用相对路径
      assetsDir: 'assets',
      // 跳过后续的 TypeScript 类型检查（由 Vite 插件处理）
      minify: true,
      rollupOptions: {
        output: {
          manualChunks: {
            // 将第三方库单独打包，优化加载
            vendor: ['react', 'react-dom', 'react-router-dom'],
            antd: ['antd', '@ant-design/icons'],
            charts: ['@ant-design/charts'],
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@pages': path.resolve(__dirname, './src/pages'),
        '@api': path.resolve(__dirname, './src/api'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@contexts': path.resolve(__dirname, './src/contexts'),
        '@shared': path.resolve(__dirname, './src/shared'),
      }
    },
  }
})
