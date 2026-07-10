import { BrowserWindow, ipcMain } from 'electron'
import type { AppSettings } from '@shared/types'
import { IPC_CHANNELS } from '@shared/ipcChannels'
import { applyLaunchAtStartup } from '../startup'
import { settingsStore } from '../store/settingsStore'

export function broadcastSettings(): void {
  const settings = settingsStore.get()
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send(IPC_CHANNELS.SETTINGS_CHANGED, settings)
  })
}

export function registerSettingsHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => settingsStore.get())

  ipcMain.on(IPC_CHANNELS.SETTINGS_SET, (_event, patch: Partial<AppSettings>) => {
    const settings = settingsStore.update(patch)
    // Any renderer (e.g. the settings window) can flip this; keep the Windows
    // login item in sync with the persisted value.
    if (patch.launchAtStartup !== undefined) {
      applyLaunchAtStartup(Boolean(settings.launchAtStartup))
    }
    broadcastSettings()
  })
}
