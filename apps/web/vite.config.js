import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Backend FastAPI (apps/api/): o front chama /api/... sem configurar URL.
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
