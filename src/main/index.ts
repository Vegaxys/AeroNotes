// FIRST import: sets the UI locale before store modules render any string.
import './bootstrapLocale'
import { app, BrowserWindow, globalShortcut } from 'electron'
import { registerBlockHandlers } from './ipc/blockHandlers'
import { registerImageHandlers } from './ipc/imageHandlers'
import { registerNotesHandlers } from './ipc/notesHandlers'
import { registerOverlayHandlers } from './ipc/overlayHandlers'
import { registerSettingsHandlers } from './ipc/settingsHandlers'
import { registerShellHandlers } from './ipc/shellHandlers'
import { registerImageProtocol } from './protocols/imageProtocol'
import { applyLaunchAtStartup } from './startup'
import { notesStore } from './store/notesStore'
import { settingsStore } from './store/settingsStore'
import { createTray } from './tray'
import { createOverlayWindow } from './windows/overlayWindow'

let overlayWindow: BrowserWindow | null = null
let tray: ReturnType<typeof createTray> | null = null

app.whenReady().then(() => {
  registerImageProtocol()
  registerOverlayHandlers(() => overlayWindow)
  registerNotesHandlers()
  registerSettingsHandlers()
  registerShellHandlers()
  registerImageHandlers()
  registerBlockHandlers()
  // Re-assert the login item on every launch so the registry entry tracks the
  // persisted setting even across reinstalls or manual registry cleanups.
  applyLaunchAtStartup(Boolean(settingsStore.get().launchAtStartup))
  overlayWindow = createOverlayWindow()
  tray = createTray(() => overlayWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      overlayWindow = createOverlayWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  notesStore.flush()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
