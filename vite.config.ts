import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': 'http://localhost:8201',
      '/results': 'http://localhost:8201',
      '/uploads': 'http://localhost:8201',
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
