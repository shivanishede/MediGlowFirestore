import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// PWA plugin removed for Electron — service workers don't work on file:// protocol.
// For the web/PWA version keep vite-plugin-pwa, but for desktop Electron we don't need it.

export default defineConfig({
  base: './',   // ← critical: makes all asset paths relative so file:// works
  plugins: [
    react(),
  ],
})
