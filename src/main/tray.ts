import { join } from 'path'
import { app, BrowserWindow, Menu, Tray, globalShortcut, nativeImage } from 'electron'
import { t } from '@shared/i18n'
import { broadcastNotes } from './ipc/notesHandlers'
import { settingsStore } from './store/settingsStore'
import { openQuickCapture } from './windows/quickCaptureWindow'
import { openSettingsWindow } from './windows/settingsWindow'

export const DEFAULT_TOGGLE_SHORTCUT = 'CommandOrControl+Shift+N'
export const DEFAULT_QUICK_CAPTURE_SHORTCUT = 'CommandOrControl+Shift+Space'

/** The app's global shortcuts, each with its default accelerator. */
export type ShortcutId = 'toggle' | 'quickCapture'

const SHORTCUT_DEFAULTS: Record<ShortcutId, string> = {
  toggle: DEFAULT_TOGGLE_SHORTCUT,
  quickCapture: DEFAULT_QUICK_CAPTURE_SHORTCUT
}

let trayInstance: Tray | null = null
const shortcutActions: Record<ShortcutId, (() => void) | null> = { toggle: null, quickCapture: null }
const registeredShortcuts: Record<ShortcutId, string | null> = { toggle: null, quickCapture: null }

/**
 * Swaps one global shortcut. Returns false (and falls back to that shortcut's
 * default) when the accelerator is invalid or already taken by another app —
 * neither the dock nor the quick capture may become unreachable.
 */
export function applyShortcut(id: ShortcutId, accelerator: string): boolean {
  const previous = registeredShortcuts[id]
  if (previous) {
    globalShortcut.unregister(previous)
    registeredShortcuts[id] = null
  }
  const run = (): void => shortcutActions[id]?.()
  let success = false
  try {
    success = globalShortcut.register(accelerator, run)
  } catch {
    success = false
  }
  if (success) {
    registeredShortcuts[id] = accelerator
    return true
  }
  const fallback = SHORTCUT_DEFAULTS[id]
  if (accelerator !== fallback && globalShortcut.register(fallback, run)) {
    registeredShortcuts[id] = fallback
  }
  return false
}

function getTrayIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'tray-icon.png')
    : join(__dirname, '../../resources/tray-icon.png')
}

function buildContextMenu(): Menu {
  return Menu.buildFromTemplate([
    { label: t('tray.toggleDock'), click: () => shortcutActions.toggle?.() },
    { label: t('tray.quickCapture'), click: () => shortcutActions.quickCapture?.() },
    { label: t('tray.settings'), click: () => openSettingsWindow() },
    { type: 'separator' },
    { label: t('tray.quit'), click: () => app.quit() }
  ])
}

/** Rebuilds the tray menu with the current locale's labels (after a language change). */
export function refreshTrayMenu(): void {
  trayInstance?.setContextMenu(buildContextMenu())
}

export function createTray(getOverlayWindow: () => BrowserWindow | null): Tray {
  const icon = nativeImage.createFromPath(getTrayIconPath())
  const tray = new Tray(icon.resize({ width: 16, height: 16 }))
  tray.setToolTip('AeroNotes')

  const toggleOverlay = (): void => {
    const overlay = getOverlayWindow()
    if (!overlay) return
    if (overlay.isVisible()) {
      overlay.hide()
    } else {
      overlay.show()
    }
  }

  trayInstance = tray
  shortcutActions.toggle = toggleOverlay
  shortcutActions.quickCapture = () => openQuickCapture(broadcastNotes)
  tray.setContextMenu(buildContextMenu())

  tray.on('click', toggleOverlay)

  const settings = settingsStore.get()
  applyShortcut('toggle', settings.toggleShortcut ?? DEFAULT_TOGGLE_SHORTCUT)
  applyShortcut('quickCapture', settings.quickCaptureShortcut ?? DEFAULT_QUICK_CAPTURE_SHORTCUT)

  return tray
}
