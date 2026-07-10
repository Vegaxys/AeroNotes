import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { IPC_CHANNELS } from '@shared/ipcChannels'

export function registerShellHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.SHELL_OPEN_PATH,
    async (_event, path: string, kind: 'file' | 'folder') => {
      if (kind === 'folder') {
        shell.showItemInFolder(path)
        return ''
      }
      return shell.openPath(path)
    }
  )

  ipcMain.handle(IPC_CHANNELS.SHELL_OPEN_EXTERNAL, async (_event, url: string) => {
    // Autolinked text can lack a protocol ("www.example.com"); default to https.
    const normalized = /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`
    if (!/^(https?|mailto):/i.test(normalized)) return
    await shell.openExternal(normalized)
  })

  ipcMain.handle(
    IPC_CHANNELS.DIALOG_PICK_PATH,
    async (event, kind: 'file' | 'folder'): Promise<string | null> => {
      const window = BrowserWindow.fromWebContents(event.sender)
      const options: Electron.OpenDialogOptions = {
        properties: [kind === 'folder' ? 'openDirectory' : 'openFile']
      }
      const result = window
        ? await dialog.showOpenDialog(window, options)
        : await dialog.showOpenDialog(options)
      if (result.canceled || result.filePaths.length === 0) {
        return null
      }
      return result.filePaths[0]
    }
  )
}
