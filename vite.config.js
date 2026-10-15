import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // The Arena preview is served from a subdomain under e2b.app.
    allowedHosts: ['.e2b.app'],
  },
  build: {
    // Tencent RTC is intentionally isolated in a lazy-loaded vendor chunk.
    chunkSizeWarningLimit: 1100,
  },
})
