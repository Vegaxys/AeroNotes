// FIRST import: sets the UI locale before store modules render any string.
import './bootstrapLocale'
import { app, BrowserWindow, globalShortcut } from 'electron'
import { startFullscreenWatcher } from './fullscreenWatcher'
import { startReminderScheduler } from './reminderScheduler'
import { registerBlockHandlers } from './ipc/blockHandlers'
import { registerImageHandlers } from './ipc/imageHandlers'
import { broadcastNotes, registerNotesHandlers } from './ipc/notesHandlers'
import { registerOverlayHandlers } from './ipc/overlayHandlers'
import { registerSettingsHandlers } from './ipc/settingsHandlers'
import { registerShellHandlers } from './ipc/shellHandlers'
import { registerSyncHandlers } from './ipc/syncHandlers'
import { initSync } from './sync/syncEngine'
import { registerImageProtocol } from './protocols/imageProtocol'
import { applyLaunchAtStartup } from './startup'
import { notesStore } from './store/notesStore'
import { settingsStore } from './store/settingsStore'
import { createTray } from './tray'
import { createOverlayWindow } from './windows/overlayWindow'

let overlayWindow: BrowserWindow | null = null
let tray: ReturnType<typeof createTray> | null = null

/** How often trashed notes past their 30-day TTL are swept away. */
const TRASH_SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000

/** Sweeps now and then periodically — long sessions must not accumulate trash. */
function startTrashSweeper(): void {
  const sweep = (): void => {
    if (notesStore.purgeExpiredTrash().length > 0) broadcastNotes()
  }
  sweep()
  setInterval(sweep, TRASH_SWEEP_INTERVAL_MS)
}

app.whenReady().then(() => {
  // Windows attributes toast notifications to this id; without it reminders
  // either don't show or show as "electron.app.Electron".
  app.setAppUserModelId('com.aeronotes.app')
  registerImageProtocol()
  registerOverlayHandlers(() => overlayWindow)
  registerNotesHandlers()
  registerSettingsHandlers(() => overlayWindow)
  registerShellHandlers()
  registerImageHandlers()
  registerBlockHandlers()
  // Re-assert the login item on every launch so the registry entry tracks the
  // persisted setting even across reinstalls or manual registry cleanups.
  applyLaunchAtStartup(Boolean(settingsStore.get().launchAtStartup))
  registerSyncHandlers()
  overlayWindow = createOverlayWindow()
  tray = createTray(() => overlayWindow)
  startFullscreenWatcher(() => overlayWindow)
  startTrashSweeper()
  startReminderScheduler(broadcastNotes)
  initSync()

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
