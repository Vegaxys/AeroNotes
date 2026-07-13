import { BrowserWindow, screen } from 'electron'
import { IPC_CHANNELS } from '@shared/ipcChannels'
import { broadcastSettings } from '../ipc/settingsHandlers'
import { notesStore } from '../store/notesStore'
import { settingsStore } from '../store/settingsStore'
import { createNoteWindow, type ScreenPosition } from './noteWindow'

const noteWindows = new Map<string, BrowserWindow>()

/** Collapsed (header-only) notes: id -> full height to restore on expand. */
const collapsedHeights = new Map<string, number>()
/** Windows whose bounds must NOT be persisted right now (collapsed/animating). */
const boundsPersistSuspended = new Set<string>()

const COLLAPSED_HEIGHT_PX = 44
const COLLAPSE_ANIM_MS = 160
const NOTE_MIN_WIDTH = 260
const NOTE_MIN_HEIGHT = 220

/** Win32 non-client double-click; the titlebar drag region hit-tests as HTCAPTION. */
const WM_NCLBUTTONDBLCLK = 0x00a3
const HTCAPTION = 2

/**
 * The titlebar is a `-webkit-app-region: drag` zone, where Chromium swallows
 * every DOM mouse event — React handlers on the header never fire. Double-click
 * and right-click must instead be caught at the native level: the drag region
 * hit-tests as non-client caption, so WM_NCLBUTTONDBLCLK covers double-click
 * (title text and buttons are no-drag → client area → never HTCAPTION) and the
 * `system-context-menu` event covers right-click, relayed to the renderer at
 * window-relative coordinates.
 */
function wireTitlebarInteractions(window: BrowserWindow, id: string): void {
  if (process.platform !== 'win32') return

  window.hookWindowMessage(WM_NCLBUTTONDBLCLK, (wParam) => {
    if (wParam.readUInt32LE(0) === HTCAPTION) toggleNoteCollapse(id)
  })

  window.on('system-context-menu', (event) => {
    event.preventDefault()
    // getCursorScreenPoint is in DIPs like getContentBounds (the event's own
    // point is physical pixels, wrong on scaled displays).
    const cursor = screen.getCursorScreenPoint()
    const content = window.getContentBounds()
    window.webContents.send(
      IPC_CHANNELS.NOTE_HEADER_CONTEXT_MENU,
      cursor.x - content.x,
      cursor.y - content.y
    )
  })
}

function clearCollapseState(id: string): void {
  collapsedHeights.delete(id)
  boundsPersistSuspended.delete(id)
}

function animateWindowHeight(window: BrowserWindow, to: number, onDone: () => void): void {
  const from = window.getBounds().height
  const startedAt = Date.now()
  const timer = setInterval(() => {
    if (window.isDestroyed()) {
      clearInterval(timer)
      return
    }
    const progress = Math.min((Date.now() - startedAt) / COLLAPSE_ANIM_MS, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    const bounds = window.getBounds()
    window.setBounds({ ...bounds, height: Math.round(from + (to - from) * eased) })
    if (progress >= 1) {
      clearInterval(timer)
      onDone()
    }
  }, 16)
}

/**
 * Double-click on a post-it's titlebar: tween the window down to just its
 * header (and back). Runtime-only state — a reopened note is always expanded;
 * bounds persistence is suspended so the collapsed height never becomes the
 * note's remembered size.
 */
export function toggleNoteCollapse(id: string): void {
  const window = noteWindows.get(id)
  if (!window || window.isDestroyed()) return

  const expandedHeight = collapsedHeights.get(id)
  if (expandedHeight === undefined) {
    collapsedHeights.set(id, window.getBounds().height)
    boundsPersistSuspended.add(id)
    window.setResizable(false)
    // The regular minimum height would block the shrink.
    window.setMinimumSize(NOTE_MIN_WIDTH, COLLAPSED_HEIGHT_PX)
    animateWindowHeight(window, COLLAPSED_HEIGHT_PX, () => {})
  } else {
    animateWindowHeight(window, expandedHeight, () => {
      if (window.isDestroyed()) return
      window.setMinimumSize(NOTE_MIN_WIDTH, NOTE_MIN_HEIGHT)
      window.setResizable(true)
      clearCollapseState(id)
    })
  }
}

/** Screen-edge zone around the collapsed dock's toggle button (which is ~96px tall). */
const DOCK_TAB_ZONE_WIDTH_PX = 40
const DOCK_TAB_ZONE_HALF_HEIGHT_PX = 80

/**
 * Dragging a detached post-it onto the collapsed dock's toggle button expands
 * the dock, so the note can be dropped back in without a separate click.
 * Called on every window `move` event; the dockCollapsed guard makes it a
 * cheap no-op while the dock is already open.
 */
function expandDockIfDraggedOntoTab(): void {
  const settings = settingsStore.get()
  if (!settings.dockCollapsed) return

  const cursor = screen.getCursorScreenPoint()
  const bounds = screen.getPrimaryDisplay().bounds
  const nearEdge =
    settings.dockSide === 'right'
      ? cursor.x >= bounds.x + bounds.width - DOCK_TAB_ZONE_WIDTH_PX
      : cursor.x <= bounds.x + DOCK_TAB_ZONE_WIDTH_PX
  const nearCenter = Math.abs(cursor.y - (bounds.y + bounds.height / 2)) <= DOCK_TAB_ZONE_HALF_HEIGHT_PX

  if (nearEdge && nearCenter) {
    settingsStore.update({ dockCollapsed: false })
    broadcastSettings()
  }
}

export function detachNote(id: string, onChanged: () => void, dropPosition?: ScreenPosition): void {
  if (noteWindows.has(id)) {
    focusNote(id)
    return
  }

  const note = notesStore.getById(id)
  if (!note) return

  notesStore.setDetached(id, true)
  const window = createNoteWindow(notesStore.getById(id)!, dropPosition)
  noteWindows.set(id, window)
  wireTitlebarInteractions(window, id)

  const persistBounds = (): void => {
    if (window.isDestroyed() || boundsPersistSuspended.has(id)) return
    notesStore.setWindowBounds(id, window.getBounds())
    onChanged()
  }
  window.on('moved', persistBounds)
  window.on('resized', persistBounds)
  window.on('move', expandDockIfDraggedOntoTab)
  window.on('closed', () => {
    noteWindows.delete(id)
    clearCollapseState(id)
    notesStore.setDetached(id, false)
    onChanged()
  })

  onChanged()
}

export function redockNote(id: string, onChanged: () => void): void {
  const window = noteWindows.get(id)
  if (window && !window.isDestroyed()) {
    window.removeAllListeners('closed')
    window.close()
  }
  noteWindows.delete(id)
  clearCollapseState(id)
  notesStore.setDetached(id, false)
  onChanged()
}

export function getNoteWindow(id: string): BrowserWindow | undefined {
  return noteWindows.get(id)
}

/**
 * Note window whose content area contains the given screen point, excluding
 * the drag's source window. If several overlap, the first hit wins — good
 * enough for now (the map holds no z-order information).
 */
export function findNoteWindowAt(
  screenX: number,
  screenY: number,
  excludeId: string
): BrowserWindow | null {
  for (const [id, window] of noteWindows) {
    if (id === excludeId || window.isDestroyed() || window.isMinimized() || !window.isVisible()) {
      continue
    }
    const bounds = window.getContentBounds()
    if (
      screenX >= bounds.x &&
      screenX < bounds.x + bounds.width &&
      screenY >= bounds.y &&
      screenY < bounds.y + bounds.height
    ) {
      return window
    }
  }
  return null
}

/** Closes a note's window without redocking (the note is being deleted). */
export function destroyNoteWindow(id: string): void {
  const window = noteWindows.get(id)
  if (window && !window.isDestroyed()) {
    window.removeAllListeners('closed')
    window.close()
  }
  noteWindows.delete(id)
  clearCollapseState(id)
}

/** Silently redocks every open post-it — used when navigating back to the folder list. */
export function closeAllNoteWindows(onChanged: () => void): void {
  const ids = [...noteWindows.keys()]
  if (ids.length === 0) return
  ids.forEach((id) => {
    const window = noteWindows.get(id)
    if (window && !window.isDestroyed()) {
      window.removeAllListeners('closed')
      window.close()
    }
    noteWindows.delete(id)
    clearCollapseState(id)
    notesStore.setDetached(id, false)
  })
  onChanged()
}

export function focusNote(id: string): void {
  const window = noteWindows.get(id)
  if (!window || window.isDestroyed()) return
  if (window.isMinimized()) window.restore()
  window.focus()
}

export function setNoteAlwaysOnTop(id: string, alwaysOnTop: boolean): void {
  notesStore.setAlwaysOnTop(id, alwaysOnTop)
  const window = noteWindows.get(id)
  if (window && !window.isDestroyed()) {
    window.setAlwaysOnTop(alwaysOnTop, 'floating')
  }
}
