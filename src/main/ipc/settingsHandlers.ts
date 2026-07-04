import { BrowserWindow, ipcMain } from 'electron'
import type { AppSettings } from '@shared/types'
import { IPC_CHANNELS } from '@shared/ipcChannels'
import { settingsStore } from '../store/settingsStore'

function broadcastSettings(): void {
  const settings = settingsStore.get()
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send(IPC_CHANNELS.SETTINGS_CHANGED, settings)
  })
}

export function registerSettingsHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => settingsStore.get())

  ipcMain.on(IPC_CHANNELS.SETTINGS_SET, (_event, patch: Partial<AppSettings>) => {
    settingsStore.update(patch)
    broadcastSettings()
  })
}
