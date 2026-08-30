import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The page talks to the Spring app on :8080. Proxying /api and /actuator through the dev server
// keeps those calls same-origin, so the common path needs no CORS handling at all. A deployed
// build has no proxy in front of it -- that case is what the backend's CorsConfig covers, and
// VITE_API_BASE_URL points the page at a non-local API.
const backend = { target: 'http://localhost:8080', changeOrigin: true }

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, proxy: { '/api': backend, '/actuator': backend } },
  preview: { port: 4173, proxy: { '/api': backend, '/actuator': backend } },
})
