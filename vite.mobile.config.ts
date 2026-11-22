import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Android WebView bundle (Capacitor). Same aliases as the Electron renderer so
 * the editor and shared modules are imported, not copied.
 */
export default defineConfig({
  root: resolve(__dirname, 'src/mobile'),
  // Relative asset URLs: Capacitor serves the bundle from its own local origin.
  base: './',
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@renderer': resolve(__dirname, 'src/renderer/src')
    }
  },
  plugins: [react(), tailwindcss()],
  build: {
    outDir: resolve(__dirname, 'out/mobile'),
    emptyOutDir: true
  }
})
