import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'

/** Images live in notes as `aeronotes-image://<file>`, like on the desktop, so they sync unchanged. */
export const IMAGE_URL_PREFIX = 'aeronotes-image://'
const IMAGES_DIR = 'images'

let imagesBaseUrl: string | null = null

/** Resolves where the WebView can load image files from; call once at startup. */
export async function initImageStore(): Promise<void> {
  try {
    const { uri } = await Filesystem.getUri({ directory: Directory.Data, path: IMAGES_DIR })
    imagesBaseUrl = Capacitor.convertFileSrc(uri).replace(/\/+$/, '')
  } catch {
    imagesBaseUrl = null // browser preview: no file URLs, images stay unresolved
  }
}

/** `aeronotes-image://x.png` → a URL the WebView can display; any other src is returned as is. */
export function resolveImageSrc(src: string | null): string | null {
  if (!src?.startsWith(IMAGE_URL_PREFIX) || !imagesBaseUrl) return src
  return `${imagesBaseUrl}/${src.slice(IMAGE_URL_PREFIX.length)}`
}

/** Reverse of {@link resolveImageSrc}, for HTML pasted from the note itself. */
export function unresolveImageSrc(src: string | null): string | null {
  if (!src || !imagesBaseUrl || !src.startsWith(`${imagesBaseUrl}/`)) return src
  return IMAGE_URL_PREFIX + src.slice(imagesBaseUrl.length + 1)
}

function extensionFromDataUrl(dataUrl: string): string {
  const match = /^data:image\/(\w+);base64,/.exec(dataUrl)
  return match ? match[1].replace('jpeg', 'jpg') : 'png'
}

/** Stores a pasted or picked image and returns its note URL (same naming as the desktop). */
export async function saveImageDataUrl(dataUrl: string): Promise<string> {
  const name = `${crypto.randomUUID()}.${extensionFromDataUrl(dataUrl)}`
  await Filesystem.writeFile({
    path: `${IMAGES_DIR}/${name}`,
    directory: Directory.Data,
    data: dataUrl.split(',')[1] ?? '',
    recursive: true
  })
  return IMAGE_URL_PREFIX + name
}

/** File names already on the phone, for the sync's image pass. */
export async function listImageNames(): Promise<Set<string>> {
  try {
    const { files } = await Filesystem.readdir({ path: IMAGES_DIR, directory: Directory.Data })
    return new Set(files.map((file) => file.name))
  } catch {
    return new Set() // no image saved yet: the folder does not exist
  }
}

export async function readImageBytes(name: string): Promise<Uint8Array> {
  const { data } = await Filesystem.readFile({ path: `${IMAGES_DIR}/${name}`, directory: Directory.Data })
  const base64 = typeof data === 'string' ? data : await blobToBase64(data)
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
}

export async function writeImageBytes(name: string, bytes: Uint8Array): Promise<void> {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  await Filesystem.writeFile({ path: `${IMAGES_DIR}/${name}`, directory: Directory.Data, data: btoa(binary), recursive: true })
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** Lets the user pick a picture and returns it as a data URL (null when cancelled). */
export function pickImageAsDataUrl(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(file)
    }
    input.click()
  })
}
