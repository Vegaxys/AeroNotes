import { app } from 'electron'

/**
 * Registers (or unregisters) the app in the Windows "run at login" list.
 * No-op in dev: it would register the bare electron.exe binary, which both
 * pollutes the registry and wouldn't actually launch AeroNotes.
 */
export function applyLaunchAtStartup(enabled: boolean): void {
  if (!app.isPackaged) return
  app.setLoginItemSettings({ openAtLogin: enabled })
}
