import { app, BrowserWindow, ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipcChannels'
import { assertOverlayOnTop } from '../windows/overlayWindow'
import { openSettingsWindow } from '../windows/settingsWindow'

export function registerOverlayHandlers(getOverlayWindow: () => BrowserWindow | null): void {
  ipcMain.on(IPC_CHANNELS.OVERLAY_SET_IGNORE_MOUSE, (_event, ignore: boolean) => {
    getOverlayWindow()?.setIgnoreMouseEvents(ignore, { forward: true })
  })

  // Escalate to a focusable window only while an editable field needs the
  // keyboard; focus() so keystrokes actually route to it. Dropping back to
  // non-focusable returns foreground priority to whatever is behind the dock.
  // invoke (not send): the renderer places the caret only once this resolves,
  // i.e. once the window is really active.
  ipcMain.handle(IPC_CHANNELS.OVERLAY_SET_FOCUSABLE, (_event, focusable: boolean) => {
    const overlay = getOverlayWindow()
    if (!overlay || overlay.isDestroyed()) return
    overlay.setFocusable(focusable)
    if (focusable) {
      overlay.focus()
      // Activating the window is not enough — Blink also needs page focus, or
      // the caret stays hidden and keystrokes go nowhere.
      overlay.webContents.focus()
    }
    // setFocusable() deactivates the window internally, which Windows performs
    // as SetWindowPos(HWND_BOTTOM): without this the dock silently falls behind
    // every other app after any click in a text field. See assertOverlayOnTop.
    assertOverlayOnTop(overlay)
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
