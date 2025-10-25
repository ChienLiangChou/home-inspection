import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: false, // Allow Vite to find next available port if 3000 is taken
    proxy: {
      '/api': {
        target: 'http://10.0.0.53:8000',
        changeOrigin: true,
        ws: true
      },
      '/health': {
        target: 'http://10.0.0.53:8000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
