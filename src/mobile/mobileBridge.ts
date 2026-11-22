import { Browser } from '@capacitor/browser'

type AeronotesApi = Window['aeronotes']

/** Lets the user pick a picture and returns it as a data URL (null when cancelled). */
function pickImageAsDataUrl(): Promise<string | null> {
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

/**
 * The part of the desktop bridge the shared editor really calls on a phone.
 * Images stay inline data URLs for now: the image store (and its sync) comes
 * with the real storage layer, after this prototype.
 */
const implemented: Partial<AeronotesApi> = {
  openExternalUrl: async (url) => {
    await Browser.open({ url })
  },
  saveImage: async (dataUrl) => dataUrl,
  importImage: pickImageAsDataUrl,
  readClipboardText: () => navigator.clipboard.readText(),
  writeClipboardText: async (text) => {
    await navigator.clipboard.writeText(text)
  },
  getSyncStatus: async () => ({ state: 'unconfigured' }),
  // The shared stores load these when imported: empty answers keep them consistent.
  getAllNotes: async () => [],
  getAllFolders: async () => [],
  getAllTemplates: async () => [],
  getSettings: async () => ({ dockSide: 'right', dockCollapsed: false, dockExpandedWidth: 0 })
}

/**
 * Installs `window.aeronotes` for the WebView. Members the prototype does not
 * implement resolve to undefined (subscriptions to a no-op unsubscribe) and
 * warn, so an unexpected call shows up in the WebView console instead of
 * crashing the screen.
 */
export function installMobileBridge(): void {
  window.aeronotes = new Proxy(implemented, {
    get(target, property) {
      if (property in target) return target[property as keyof AeronotesApi]
      const name = String(property)
      return (..._args: unknown[]) => {
        console.warn(`aeronotes.${name} is not available in the mobile prototype`)
        return name.startsWith('on') ? () => {} : Promise.resolve(undefined)
      }
    }
  }) as AeronotesApi
}
