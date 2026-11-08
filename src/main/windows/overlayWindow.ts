import { join } from 'path'
import { BrowserWindow, screen } from 'electron'
import { settingsStore } from '../store/settingsStore'

/**
 * The bounds of the display the overlay should cover: the one saved in
 * settings, or the primary display when none is set or the saved one is no
 * longer connected.
 *
 * Matching happens in two passes because Electron regenerates `Display.id`
 * every session on Windows: the id only works within the current session, so
 * after a reboot we fall back to the stable label + geometry descriptor.
 */
function resolveOverlayBounds(): Electron.Rectangle {
  const { displayId, displayTarget } = settingsStore.get()
  const displays = screen.getAllDisplays()

  let target = displayId != null ? displays.find((d) => d.id === displayId) : undefined

  if (!target && displayTarget) {
    const { label, bounds } = displayTarget
    // Prefer an exact label + geometry match; fall back to label alone (the
    // monitor was rearranged) or geometry alone (label unavailable/changed).
    target =
      displays.find(
        (d) =>
          d.label === label &&
          d.bounds.x === bounds.x &&
          d.bounds.y === bounds.y &&
          d.bounds.width === bounds.width &&
          d.bounds.height === bounds.height
      ) ??
      displays.find((d) => label !== '' && d.label === label) ??
      displays.find((d) => d.bounds.x === bounds.x && d.bounds.y === bounds.y)
  }

  return (target ?? screen.getPrimaryDisplay()).bounds
}

/** How often the z-order guard re-asserts the dock's topmost state. */
const Z_ORDER_GUARD_INTERVAL_MS = 2000

/**
 * Re-asserts the dock's topmost z-order (and its hidden taskbar button).
 *
 * Windows pushes the overlay out of the topmost band behind Electron's back:
 * `setFocusable()` deactivates the window as part of the style change, and
 * Chromium implements "deactivate" as `SetWindowPos(HWND_BOTTOM)` — which both
 * clears WS_EX_TOPMOST and drops the dock *behind every other window*. An
 * exclusive-fullscreen app demoting other processes' topmost windows does the
 * same. Electron still believes the window is always-on-top afterwards, so
 * nothing restores it on its own.
 *
 * `setAlwaysOnTop(true)` re-issues `SetWindowPos(HWND_TOPMOST)` even when the
 * state is unchanged, so calling it again is the fix. `setSkipTaskbar` is
 * re-applied because `setFocusable(true)` turns the taskbar button back on.
 */
export function assertOverlayOnTop(window: BrowserWindow | null): void {
  if (!window || window.isDestroyed()) return
  window.setAlwaysOnTop(true, 'floating')
  window.setSkipTaskbar(true)
}

/**
 * Safety net for the z-order losses we can't hook: nothing notifies us when
 * another app steals the topmost slot or when Windows demotes us, so re-assert
 * on a slow timer while the dock is visible. Each tick is a single
 * SetWindowPos with SWP_NOACTIVATE — no focus change, no repaint.
 */
function startOverlayZOrderGuard(window: BrowserWindow): void {
  if (process.platform !== 'win32') return
  const timer = setInterval(() => {
    if (window.isDestroyed() || !window.isVisible()) return
    assertOverlayOnTop(window)
  }, Z_ORDER_GUARD_INTERVAL_MS)
  window.on('closed', () => clearInterval(timer))
}

/** Moves the overlay to cover the display currently selected in settings. */
export function repositionOverlayToDisplay(window: BrowserWindow): void {
  if (window.isDestroyed()) return
  const { x, y, width, height } = resolveOverlayBounds()
  window.setBounds({ x, y, width, height })
  assertOverlayOnTop(window)
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
    // WS_EX_TOOLWINDOW on Windows. Browsers (Chromium, Firefox) compute their
    // own occlusion and treat a window that is fully covered as hidden — which
    // pauses Twitch / YouTube / etc. The overlay spans the whole display, and
    // while the cursor is over the dock it drops WS_EX_TRANSPARENT, so to them
    // it is an opaque window covering everything. Tool windows are skipped by
    // that occlusion calculation (gfx::IsWindowVisibleAndFullyOpaque).
    type: 'toolbar',
    alwaysOnTop: true,
    // Non-focusable (WS_EX_NOACTIVATE on Windows): the dock still receives
    // clicks, but activating it never steals foreground from a fullscreen or
    // borderless video behind the overlay — which would drop that window
    // behind everything and make the video "disappear". The renderer escalates
    // this to true only while an editable field holds focus (see
    // OVERLAY_SET_FOCUSABLE) so typing in search / rename / the embedded editor
    // still works.
    focusable: false,
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
  // show() / showInactive() (tray toggle, shortcut, fullscreen watcher) re-inserts
  // the window in the z-order — re-assert topmost right after every one of them.
  window.on('show', () => assertOverlayOnTop(window))
  startOverlayZOrderGuard(window)

  const rendererUrl = process.env['ELECTRON_RENDERER_URL']
  if (rendererUrl) {
    window.loadURL(`${rendererUrl}/overlay.html`)
    window.webContents.openDevTools({ mode: 'detach' })
  } else {
    window.loadFile(join(__dirname, '../renderer/overlay.html'))
  }

  return window
}
