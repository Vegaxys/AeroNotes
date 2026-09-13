import { join } from 'path'
import { pathToFileURL } from 'url'
import { app, shell } from 'electron'

/**
 * Every URL the renderers are allowed to sit on: the Vite dev server in dev,
 * the packaged `out/renderer/` directory otherwise. Anything outside it is a
 * navigation we never initiate ourselves.
 */
function rendererBaseUrl(): string {
  const devServer = process.env['ELECTRON_RENDERER_URL']
  if (devServer) return devServer.endsWith('/') ? devServer : `${devServer}/`
  return pathToFileURL(join(__dirname, '../renderer/')).toString()
}

/**
 * Navigation lockdown for every window the app creates, now and later.
 *
 * Nothing in AeroNotes ever navigates a window: the three renderers load once
 * and stay put. But a renderer can be navigated *without* our asking —
 * dropping a .html file (or any file ProseMirror declines) onto a note makes
 * Chromium navigate to it, and a `window.open()` opens a child window with no
 * preload and no `contextIsolation` guarantee. Both would run foreign content
 * with our origin's privileges, which matters more than usual here because
 * note content is not all locally authored: it also arrives from Google Drive,
 * i.e. from another machine.
 *
 * Must be called before any window is created.
 */
export function applyWindowSecurityPolicy(): void {
  const allowedBase = rendererBaseUrl()

  app.on('web-contents-created', (_event, contents) => {
    // Reloads and Vite HMR stay inside the base URL; everything else is a
    // navigation we did not ask for.
    contents.on('will-navigate', (event, url) => {
      if (!url.startsWith(allowedBase)) event.preventDefault()
    })

    // No popup ever gets created. http(s) targets are handed to the OS browser
    // instead, the same route WebLinkClick already uses for clicked links.
    contents.setWindowOpenHandler(({ url }) => {
      if (/^https?:/i.test(url)) void shell.openExternal(url)
      return { action: 'deny' }
    })

    // The app uses no <webview>; a note that managed to inject one would get a
    // frame with its own (weaker) web preferences.
    contents.on('will-attach-webview', (event) => event.preventDefault())
  })
}
