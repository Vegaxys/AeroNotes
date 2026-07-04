import { BrowserWindow, ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipcChannels'

export function registerOverlayHandlers(getOverlayWindow: () => BrowserWindow | null): void {
  ipcMain.on(IPC_CHANNELS.OVERLAY_SET_IGNORE_MOUSE, (_event, ignore: boolean) => {
    getOverlayWindow()?.setIgnoreMouseEvents(ignore, { forward: true })
  })
}
