import { join, resolve, sep } from 'path'
import { pathToFileURL } from 'url'
import { app, net, protocol } from 'electron'

export function getImagesDir(): string {
  return join(app.getPath('userData'), 'images')
}

/**
 * Every name this protocol ever serves is one we generated ourselves:
 * `<uuid>.<ext>` (see `imageHandlers`, and `syncEngine` which reuses the same
 * names when pulling images from Drive).
 */
const IMAGE_FILE_NAME = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.[a-zA-Z0-9]{1,8}$/

export function registerImageProtocol(): void {
  protocol.handle('aeronotes-image', (request) => {
    const requestedName = decodeURIComponent(request.url.replace('aeronotes-image://', ''))
    const imagesDir = getImagesDir()
    const filePath = join(imagesDir, requestedName)

    // The requested name comes straight out of a note's image `src`, and note
    // content is not all locally authored — it also arrives from Google Drive,
    // i.e. from another machine. Unchecked, `..%2F..%2F…` walks out of the
    // images directory and this handler serves any file on disk.
    //
    // Two independent checks: the name must be one we could have written, and
    // the resolved path must still sit inside the images directory (which also
    // rules out anything the path layer normalizes differently than we expect).
    const root = resolve(imagesDir)
    const insideImagesDir = resolve(filePath).startsWith(root + sep)
    if (!IMAGE_FILE_NAME.test(requestedName) || !insideImagesDir) {
      return new Response(null, { status: 404 })
    }

    return net.fetch(pathToFileURL(filePath).toString())
  })
}
