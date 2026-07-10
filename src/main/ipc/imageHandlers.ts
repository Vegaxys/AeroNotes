import { extname, join } from 'path'
import { copyFile, mkdir, writeFile } from 'fs/promises'
import { BrowserWindow, dialog, ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipcChannels'
import { getImagesDir } from '../protocols/imageProtocol'

function extensionFromDataUrl(dataUrl: string): string {
  const match = /^data:image\/(\w+);base64,/.exec(dataUrl)
  return match ? match[1].replace('jpeg', 'jpg') : 'png'
}

export function registerImageHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.IMAGE_SAVE, async (_event, dataUrl: string): Promise<string> => {
    const base64 = dataUrl.split(',')[1] ?? ''
    const buffer = Buffer.from(base64, 'base64')
    const filename = `${crypto.randomUUID()}.${extensionFromDataUrl(dataUrl)}`

    await mkdir(getImagesDir(), { recursive: true })
    await writeFile(join(getImagesDir(), filename), buffer)

    return `aeronotes-image://${filename}`
  })

  // Picks an image on disk and copies it into the app's image store, so the
  // note keeps working even if the original file moves or gets deleted.
  ipcMain.handle(IPC_CHANNELS.IMAGE_IMPORT, async (event): Promise<string | null> => {
    const window = BrowserWindow.fromWebContents(event.sender)
    const options: Electron.OpenDialogOptions = {
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'] }]
    }
    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return null

    const sourcePath = result.filePaths[0]
    const extension = extname(sourcePath).slice(1).toLowerCase() || 'png'
    const filename = `${crypto.randomUUID()}.${extension}`

    await mkdir(getImagesDir(), { recursive: true })
    await copyFile(sourcePath, join(getImagesDir(), filename))

    return `aeronotes-image://${filename}`
  })
}
