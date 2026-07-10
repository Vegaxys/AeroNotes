import { app, BrowserWindow, ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipcChannels'
import { openSettingsWindow } from '../windows/settingsWindow'

export function registerOverlayHandlers(getOverlayWindow: () => BrowserWindow | null): void {
  ipcMain.on(IPC_CHANNELS.OVERLAY_SET_IGNORE_MOUSE, (_event, ignore: boolean) => {
    getOverlayWindow()?.setIgnoreMouseEvents(ignore, { forward: true })
  })

  // App-level actions triggered from the dock's menu (mirrors the tray menu).
  ipcMain.on(IPC_CHANNELS.OVERLAY_HIDE, () => {
    getOverlayWindow()?.hide()
  })

  ipcMain.on(IPC_CHANNELS.SETTINGS_WINDOW_OPEN, () => {
    openSettingsWindow()
  })

  ipcMain.on(IPC_CHANNELS.APP_QUIT, () => {
    app.quit()
  })
}
