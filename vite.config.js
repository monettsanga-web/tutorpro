import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Tencent RTC is intentionally isolated in a lazy-loaded vendor chunk.
    chunkSizeWarningLimit: 1100,
  },
})
