import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd())
  // 专区管理后台模式（zone-*）：独立入口 zone.html、独立产物目录 dist-zone
  const isZone = mode.startsWith('zone-')

  return {
    plugins: [react()],
    base: './', // 使用相对路径，支持部署到任意目录
    server: {
      port: Number(env.VITE_PORT) || 3100,
      open: isZone ? '/zone.html' : true,
      proxy: {
        // 代理 API 请求到测试服务器
        '/admin': {
          target: 'https://tlnc-test.vbegin.com.cn',
          changeOrigin: true,
          secure: false, // 允许自签名证书
        },
        // 代理 Linksy AI 图片改尺寸接口到本地调试服务（避免浏览器跨域；
        // 密钥由代理注入请求头，前端不持有、不打包）
        '/linksy-api': {
          target: 'http://127.0.0.1:8081',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/linksy-api/, ''),
          headers: { 'X-API-Key': env.VITE_LINKSY_API_KEY || '' },
        },
      },
    },
    esbuild: {
      // 构建时忽略 TypeScript 类型错误
      logOverride: { 'this-is-undefined-in-esm': 'silent' }
    },
    build: {
      // 根据环境变量设置不同的输出目录（专区管理后台独立 dist-zone）
      outDir: isZone ? 'dist-zone' : (env.VITE_APP_ENV === 'test' ? 'dist-test' : 'dist'),
      sourcemap: true,
      // 静态资源使用相对路径
      assetsDir: 'assets',
      // 跳过后续的 TypeScript 类型检查（由 Vite 插件处理）
      minify: true,
      rollupOptions: {
        // 按模式构建单入口：zone 模式只出 zone.html，主后台模式只出 index.html
        input: isZone
          ? { zone: path.resolve(__dirname, 'zone.html') }
          : { admin: path.resolve(__dirname, 'index.html') },
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
