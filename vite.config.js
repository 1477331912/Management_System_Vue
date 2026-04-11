import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 本地后端地址（与 src/api/request.js 中 /api 前缀配合：请求 /api/xxx → 转发到后端 /xxx）
const BACKEND_ORIGIN = 'http://localhost:8080'

const apiProxy = {
  '/api': {
    target: BACKEND_ORIGIN,
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
  },
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  server: {
    // 开发服务器配置：
    // - 监听 0.0.0.0：便于在容器/远程环境下通过网络访问
    // - 端口 3000：与常见反向代理/网关默认配置更容易对齐
    host: "0.0.0.0",
    port: 3000,
    // 允许所有 Host（适配反向代理转发的 Host 头）
    allowedHosts: true,
    proxy: apiProxy,
  },
  preview: {
    // 预览服务器端口与开发保持一致；同样代理 /api 到本地后端
    host: "0.0.0.0",
    port: 3000,
    proxy: apiProxy,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
