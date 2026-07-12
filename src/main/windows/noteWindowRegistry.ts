import { BrowserWindow, screen } from 'electron'
import { broadcastSettings } from '../ipc/settingsHandlers'
import { notesStore } from '../store/notesStore'
import { settingsStore } from '../store/settingsStore'
import { createNoteWindow, type ScreenPosition } from './noteWindow'

const noteWindows = new Map<string, BrowserWindow>()

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

  const persistBounds = (): void => {
    if (window.isDestroyed()) return
    notesStore.setWindowBounds(id, window.getBounds())
    onChanged()
  }
  window.on('moved', persistBounds)
  window.on('resized', persistBounds)
  window.on('move', expandDockIfDraggedOntoTab)
  window.on('closed', () => {
    noteWindows.delete(id)
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
