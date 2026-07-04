import { join } from 'path'
import { app, BrowserWindow, Menu, Tray, globalShortcut, nativeImage } from 'electron'

const TOGGLE_SHORTCUT = 'CommandOrControl+Shift+N'

function getTrayIconPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'tray-icon.png')
    : join(__dirname, '../../resources/tray-icon.png')
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

  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Afficher / masquer le dock', click: toggleOverlay },
      { type: 'separator' },
      { label: 'Quitter', click: () => app.quit() }
    ])
  )

  tray.on('click', toggleOverlay)

  globalShortcut.register(TOGGLE_SHORTCUT, toggleOverlay)

  return tray
}
