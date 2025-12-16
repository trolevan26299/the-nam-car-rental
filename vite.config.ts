import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load toàn bộ biến môi trường từ file .env (kể cả những biến không có prefix VITE_)
  // Tham số thứ 3 là '' nghĩa là không lọc prefix
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Polyfill process.env để code sử dụng được process.env.API_KEY, process.env.GOOGLE_...
      'process.env': env
    }
  }
})