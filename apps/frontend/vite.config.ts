import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: false, // Allow Vite to find next available port if 3000 is taken
    // Enable HTTPS for iOS secure context requirement (required for real-time camera stream)
    // iPhone requires HTTPS or localhost for camera access
    https: {
      // For development, using self-signed certificates for iOS camera access
      // iPhone requires HTTPS or localhost for camera access
      key: fs.existsSync(path.resolve(__dirname, 'key.pem')) 
        ? fs.readFileSync(path.resolve(__dirname, 'key.pem'))
        : undefined,
      cert: fs.existsSync(path.resolve(__dirname, 'cert.pem'))
        ? fs.readFileSync(path.resolve(__dirname, 'cert.pem'))
        : undefined,
    },
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://0.0.0.0:8000',
        changeOrigin: true,
        ws: true
      },
      '/health': {
        target: process.env.VITE_API_URL || 'http://0.0.0.0:8000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
