import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'configure-response-headers',
      configureServer: (server) => {
        server.middlewares.use((_req, res, next) => {
          // 允许加载自定义协议（ztools-icon://）和本地文件（file://）
          res.setHeader(
            'Content-Security-Policy',
            "default-src * 'unsafe-inline' 'unsafe-eval' data: blob: ztools-icon: file:; img-src * data: blob: ztools-icon: file:;"
          )
          next()
        })
      }
    }
  ],
  base: './',
  server: {
    port: 5177, // 设置插件开发服务器端口（避免与主程序 5173 冲突）
    strictPort: true,
    open: false
  }
})
