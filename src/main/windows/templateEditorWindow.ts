import { join } from 'path'
import { BrowserWindow } from 'electron'

const editorWindows = new Map<string, BrowserWindow>()

/**
 * Transparent frameless windows on Windows sometimes never get an initial
 * Chromium paint until a resize/move happens (same workaround as noteWindow).
 */
function forceInitialPaint(window: BrowserWindow): void {
  window.once('ready-to-show', () => {
    window.show()
    const bounds = window.getBounds()
    window.setBounds({ ...bounds, width: bounds.width + 1 })
    window.setBounds(bounds)
  })
}

/** One editor window per template; refocuses if it is already open. */
export function openTemplateEditorWindow(templateId: string): void {
  const existing = editorWindows.get(templateId)
  if (existing && !existing.isDestroyed()) {
    if (existing.isMinimized()) existing.restore()
    existing.focus()
    return
  }

  const window = new BrowserWindow({
    width: 460,
    height: 560,
    minWidth: 300,
    minHeight: 260,
    frame: false,
    transparent: true,
    hasShadow: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  editorWindows.set(templateId, window)
  window.on('closed', () => {
    editorWindows.delete(templateId)
  })
  forceInitialPaint(window)

  const rendererUrl = process.env['ELECTRON_RENDERER_URL']
  if (rendererUrl) {
    window.loadURL(`${rendererUrl}/note.html?templateId=${templateId}`)
  } else {
    window.loadFile(join(__dirname, '../renderer/note.html'), { query: { templateId } })
  }
}
