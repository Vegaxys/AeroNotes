import { join } from 'path'
import { pathToFileURL } from 'url'
import { app, net, protocol } from 'electron'

export function getImagesDir(): string {
  return join(app.getPath('userData'), 'images')
}

export function registerImageProtocol(): void {
  protocol.handle('aeronotes-image', (request) => {
    const requestedName = decodeURIComponent(request.url.replace('aeronotes-image://', ''))
    const filePath = join(getImagesDir(), requestedName)
    return net.fetch(pathToFileURL(filePath).toString())
  })
}
