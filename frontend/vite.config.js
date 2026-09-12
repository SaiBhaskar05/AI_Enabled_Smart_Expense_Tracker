import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Exposes on 0.0.0.0
    port: 5173,
    allowedHosts: true, // Allows Cloudflare tunnels (*.trycloudflare.com), ngrok, local network IP
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
        ws: true,
      }
    }
  }
})
