import { join } from 'path'
import { BrowserWindow, screen } from 'electron'

export function createOverlayWindow(): BrowserWindow {
  const { x, y, width, height } = screen.getPrimaryDisplay().bounds

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
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  window.setAlwaysOnTop(true, 'floating')
  window.setIgnoreMouseEvents(true, { forward: true })

  const rendererUrl = process.env['ELECTRON_RENDERER_URL']
  if (rendererUrl) {
    window.loadURL(`${rendererUrl}/overlay.html`)
    window.webContents.openDevTools({ mode: 'detach' })
  } else {
    window.loadFile(join(__dirname, '../renderer/overlay.html'))
  }

  return window
}
