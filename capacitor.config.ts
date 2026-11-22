import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.aeronotes.app',
  appName: 'AeroNotes',
  // Built by `npm run mobile:build` (vite.mobile.config.ts).
  webDir: 'out/mobile',
  backgroundColor: '#121214',
  plugins: {
    SystemBars: {
      // Injects --safe-area-inset-* and pads the WebView above the keyboard,
      // so a bar fixed at the bottom of the page sits right on the keyboard.
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
      // Light status-bar icons over the dark background.
      style: 'DARK'
    }
  }
}

export default config
