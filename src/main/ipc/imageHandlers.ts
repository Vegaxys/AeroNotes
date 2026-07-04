import { join } from 'path'
import { mkdir, writeFile } from 'fs/promises'
import { ipcMain } from 'electron'
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
}
