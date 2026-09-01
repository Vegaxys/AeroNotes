import { join } from 'path'
import { BrowserWindow, screen } from 'electron'
import type { Note, WindowBounds } from '@shared/types'
import { getAppIconPath } from '../appIcon'

const DEFAULT_WIDTH = 420
const DEFAULT_HEIGHT = 520

export const NOTE_MIN_WIDTH = 260
export const NOTE_MIN_HEIGHT = 220

export interface ScreenPosition {
  x: number
  y: number
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

export interface NoteWindowOptions {
  /** Opened by the global quick-capture shortcut (adds the clipboard pill). */
  quickCapture?: boolean
  /**
   * Exact opening geometry, overriding both the note's remembered bounds and
   * `dropPosition`. Not persisted on its own: the note only remembers a size
   * once the user actually moves or resizes the window.
   */
  initialBounds?: WindowBounds
}

export function createNoteWindow(
  note: Note,
  dropPosition?: ScreenPosition,
  options?: NoteWindowOptions
): BrowserWindow {
  const bounds = options?.initialBounds ??
    note.windowBounds ?? {
      x: 160,
      y: 160,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT
    }

  // Dragged out of the dock: open right under the cursor (title bar centered
  // on it), clamped to the target display's work area.
  if (dropPosition && !options?.initialBounds) {
    const workArea = screen.getDisplayNearestPoint(dropPosition).workArea
    bounds.x = Math.min(
      Math.max(Math.round(dropPosition.x - bounds.width / 2), workArea.x),
      workArea.x + workArea.width - bounds.width
    )
    bounds.y = Math.min(
      Math.max(Math.round(dropPosition.y - 16), workArea.y),
      workArea.y + workArea.height - bounds.height
    )
  }

  const window = new BrowserWindow({
    ...bounds,
    icon: getAppIconPath(),
    minWidth: NOTE_MIN_WIDTH,
    minHeight: NOTE_MIN_HEIGHT,
    frame: false,
    transparent: true,
    hasShadow: true,
    resizable: true,
    // Without this, double-clicking the titlebar drag region maximizes the
    // window (default caption behavior) instead of letting the collapse
    // toggle handle it.
    maximizable: false,
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

  const query: Record<string, string> = { id: note.id }
  if (options?.quickCapture) query.quickCapture = '1'
  const search = new URLSearchParams(query).toString()

  const rendererUrl = process.env['ELECTRON_RENDERER_URL']
  if (rendererUrl) {
    window.loadURL(`${rendererUrl}/note.html?${search}`)
    window.webContents.openDevTools({ mode: 'detach' })
  } else {
    window.loadFile(join(__dirname, '../renderer/note.html'), { query })
  }

  return window
}
