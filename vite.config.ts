import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID),
      'process.env.GOOGLE_CLIENT_SECRET': JSON.stringify(env.GOOGLE_CLIENT_SECRET),
      'process.env.GOOGLE_REFRESH_TOKEN': JSON.stringify(env.GOOGLE_REFRESH_TOKEN),
      'process.env.GOOGLE_SPREADSHEET_ID': JSON.stringify(env.GOOGLE_SPREADSHEET_ID),
      'process.env.GOOGLE_DRIVE_FOLDER_ID': JSON.stringify(env.GOOGLE_DRIVE_FOLDER_ID),
      'process.env.GOOGLE_DOC_TEMPLATE_ID': JSON.stringify(env.GOOGLE_DOC_TEMPLATE_ID),
    }
  }
})