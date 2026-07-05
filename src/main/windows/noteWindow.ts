import { join } from 'path'
import { BrowserWindow } from 'electron'
import type { Note } from '@shared/types'

const DEFAULT_WIDTH = 420
const DEFAULT_HEIGHT = 520

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

export function createNoteWindow(note: Note): BrowserWindow {
  const bounds = note.windowBounds ?? {
    x: 160,
    y: 160,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT
  }

  const window = new BrowserWindow({
    ...bounds,
    minWidth: 260,
    minHeight: 220,
    frame: false,
    transparent: true,
    hasShadow: true,
    resizable: true,
    show: false,
    alwaysOnTop: note.alwaysOnTop ?? false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  if (note.alwaysOnTop) {
    window.setAlwaysOnTop(true, 'floating')
  }

  forceInitialPaint(window)

  const rendererUrl = process.env['ELECTRON_RENDERER_URL']
  if (rendererUrl) {
    window.loadURL(`${rendererUrl}/note.html?id=${note.id}`)
    window.webContents.openDevTools({ mode: 'detach' })
  } else {
    window.loadFile(join(__dirname, '../renderer/note.html'), { query: { id: note.id } })
  }

  return window
}
