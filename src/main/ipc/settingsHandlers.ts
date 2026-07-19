import { app, BrowserWindow, ipcMain, screen } from 'electron'
import type { AppSettings, DisplayInfo } from '@shared/types'
import { IPC_CHANNELS } from '@shared/ipcChannels'
import { resolveLocale, setLocale } from '@shared/i18n'
import { applyLaunchAtStartup } from '../startup'
import { settingsStore } from '../store/settingsStore'
import { applyToggleShortcut, DEFAULT_TOGGLE_SHORTCUT, refreshTrayMenu } from '../tray'
import { repositionOverlayToDisplay } from '../windows/overlayWindow'

/** The connected monitors, primary first, for the settings display picker. */
function listDisplays(): DisplayInfo[] {
  const primaryId = screen.getPrimaryDisplay().id
  return screen.getAllDisplays().map((display, index) => ({
    id: display.id,
    index: index + 1,
    isPrimary: display.id === primaryId
  }))
}

export function broadcastSettings(): void {
  const settings = settingsStore.get()
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send(IPC_CHANNELS.SETTINGS_CHANGED, settings)
  })
}

export function registerSettingsHandlers(getOverlayWindow: () => BrowserWindow | null): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => settingsStore.get())

  ipcMain.handle(IPC_CHANNELS.DISPLAYS_GET, () => listDisplays())

  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, () => app.getVersion())

  ipcMain.on(IPC_CHANNELS.SETTINGS_SET, (_event, patch: Partial<AppSettings>) => {
    const previousShortcut = settingsStore.get().toggleShortcut ?? DEFAULT_TOGGLE_SHORTCUT
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
    // Shortcut change: try to register the new accelerator; on failure
    // (invalid or taken by another app) revert the persisted value so the
    // broadcast shows the shortcut actually in effect.
    if (patch.toggleShortcut !== undefined) {
      const applied = applyToggleShortcut(settings.toggleShortcut ?? DEFAULT_TOGGLE_SHORTCUT)
      if (!applied) {
        settingsStore.update({ toggleShortcut: previousShortcut })
        applyToggleShortcut(previousShortcut)
      }
    }
    // Display change: move the dock overlay onto the newly chosen monitor.
    if (patch.displayId !== undefined) {
      const overlay = getOverlayWindow()
      if (overlay) repositionOverlayToDisplay(overlay)
    }
    broadcastSettings()
  })
}
