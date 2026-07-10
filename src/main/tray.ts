import { join } from 'path'
import { app, BrowserWindow, Menu, Tray, globalShortcut, nativeImage } from 'electron'
import { t } from '@shared/i18n'
import { openSettingsWindow } from './windows/settingsWindow'

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
      { label: t('tray.toggleDock'), click: toggleOverlay },
      { label: t('tray.settings'), click: () => openSettingsWindow() },
      { type: 'separator' },
      { label: t('tray.quit'), click: () => app.quit() }
    ])
  )

  tray.on('click', toggleOverlay)

  globalShortcut.register(TOGGLE_SHORTCUT, toggleOverlay)

  return tray
}
