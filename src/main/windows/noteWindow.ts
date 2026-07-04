import { join } from 'path'
import { BrowserWindow } from 'electron'
import type { Note } from '@shared/types'

const DEFAULT_WIDTH = 380
const DEFAULT_HEIGHT = 440

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

  const rendererUrl = process.env['ELECTRON_RENDERER_URL']
  if (rendererUrl) {
    window.loadURL(`${rendererUrl}/note.html?id=${note.id}`)
    window.webContents.openDevTools({ mode: 'detach' })
  } else {
    window.loadFile(join(__dirname, '../renderer/note.html'), { query: { id: note.id } })
  }

  return window
}
