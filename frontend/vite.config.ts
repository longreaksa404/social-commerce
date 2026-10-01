import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Local dev uses the single .env at the repo root (see .env.example).
  envDir: '..',
  server: {
    // File-change events don't cross a Windows-drive mount into the
    // devcontainer, so poll instead (set in devcontainer.json).
    watch: process.env.VITE_USE_POLLING === 'true' ? { usePolling: true, interval: 300 } : undefined,
  },
})
