import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 前端开发服务器配置：
//   - 默认端口 5173。
//   - 把 /api 开头的请求代理到后端 http://localhost:3000，
//     这样开发时前端可以直接用相对路径 /api/xxx 访问后端，避免跨域问题。
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
