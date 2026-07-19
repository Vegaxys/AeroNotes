import { join } from 'path'
import { BrowserWindow, screen } from 'electron'
import { settingsStore } from '../store/settingsStore'

/**
 * The bounds of the display the overlay should cover: the one saved in
 * settings, or the primary display when none is set or the saved one is no
 * longer connected.
 */
function resolveOverlayBounds(): Electron.Rectangle {
  const { displayId } = settingsStore.get()
  const target =
    displayId != null ? screen.getAllDisplays().find((d) => d.id === displayId) : undefined
  return (target ?? screen.getPrimaryDisplay()).bounds
}

/** Moves the overlay to cover the display currently selected in settings. */
export function repositionOverlayToDisplay(window: BrowserWindow): void {
  if (window.isDestroyed()) return
  const { x, y, width, height } = resolveOverlayBounds()
  window.setBounds({ x, y, width, height })
}

/**
 * Transparent frameless windows on Windows sometimes never get an initial
 * Chromium paint until a resize/move happens, leaving the window blank until
 * the user drags it. Forcing a show-after-ready-to-show plus a 1px bounds
 * nudge reliably triggers that first paint.
 */
function forceInitialPaint(window: BrowserWindow): void {
  window.once('ready-to-show', () => {
    window.show()
    const bounds = window.getBounds()
    window.setBounds({ ...bounds, width: bounds.width + 1 })
    window.setBounds(bounds)
  })
}

export function createOverlayWindow(): BrowserWindow {
  const { x, y, width, height } = resolveOverlayBounds()

  const window = new BrowserWindow({
    x,
    y,
    width,
    height,
    transparent: true,
    frame: false,
    hasShadow: false,
    resizable: false,
    movable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  window.setAlwaysOnTop(true, 'floating')
  window.setIgnoreMouseEvents(true, { forward: true })
  forceInitialPaint(window)

  const rendererUrl = process.env['ELECTRON_RENDERER_URL']
  if (rendererUrl) {
    window.loadURL(`${rendererUrl}/overlay.html`)
    window.webContents.openDevTools({ mode: 'detach' })
  } else {
    window.loadFile(join(__dirname, '../renderer/overlay.html'))
  }

  return window
}
