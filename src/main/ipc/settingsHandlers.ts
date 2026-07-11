import { app, BrowserWindow, ipcMain } from 'electron'
import type { AppSettings } from '@shared/types'
import { IPC_CHANNELS } from '@shared/ipcChannels'
import { resolveLocale, setLocale } from '@shared/i18n'
import { applyLaunchAtStartup } from '../startup'
import { settingsStore } from '../store/settingsStore'
import { refreshTrayMenu } from '../tray'

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
    // Language change: main-process strings (tray, dialogs) switch right away;
    // renderers re-resolve from the broadcast below.
    if (patch.locale !== undefined) {
      setLocale(resolveLocale(settings.locale ?? 'system', app.getPreferredSystemLanguages()))
      refreshTrayMenu()
    }
    broadcastSettings()
  })
}
