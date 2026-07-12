import { join } from 'path'
import { app, BrowserWindow, Menu, Tray, globalShortcut, nativeImage } from 'electron'
import { t } from '@shared/i18n'
import { settingsStore } from './store/settingsStore'
import { openSettingsWindow } from './windows/settingsWindow'

export const DEFAULT_TOGGLE_SHORTCUT = 'CommandOrControl+Shift+N'

let trayInstance: Tray | null = null
let toggleOverlayAction: (() => void) | null = null
let registeredShortcut: string | null = null

/**
 * Swaps the global dock-toggle shortcut. Returns false (and keeps the previous
 * one registered) when the accelerator is invalid or taken by another app.
 */
export function applyToggleShortcut(accelerator: string): boolean {
  if (registeredShortcut) {
    globalShortcut.unregister(registeredShortcut)
    registeredShortcut = null
  }
  let success = false
  try {
    success = globalShortcut.register(accelerator, () => toggleOverlayAction?.())
  } catch {
    success = false
  }
  if (success) {
    registeredShortcut = accelerator
    return true
  }
  // Fall back to the default so the dock never becomes unreachable.
  if (accelerator !== DEFAULT_TOGGLE_SHORTCUT && globalShortcut.register(DEFAULT_TOGGLE_SHORTCUT, () => toggleOverlayAction?.())) {
    registeredShortcut = DEFAULT_TOGGLE_SHORTCUT
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
    { label: t('tray.toggleDock'), click: () => toggleOverlayAction?.() },
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
  toggleOverlayAction = toggleOverlay
  tray.setContextMenu(buildContextMenu())

  tray.on('click', toggleOverlay)

  applyToggleShortcut(settingsStore.get().toggleShortcut ?? DEFAULT_TOGGLE_SHORTCUT)

  return tray
}
