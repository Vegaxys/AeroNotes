import { BrowserWindow } from 'electron'
import { notesStore } from '../store/notesStore'
import { createNoteWindow } from './noteWindow'

const noteWindows = new Map<string, BrowserWindow>()

export function detachNote(id: string, onChanged: () => void): void {
  if (noteWindows.has(id)) {
    focusNote(id)
    return
  }

  const note = notesStore.getById(id)
  if (!note) return

  notesStore.setDetached(id, true)
  const window = createNoteWindow(notesStore.getById(id)!)
  noteWindows.set(id, window)

  const persistBounds = (): void => {
    if (window.isDestroyed()) return
    notesStore.setWindowBounds(id, window.getBounds())
    onChanged()
  }
  window.on('moved', persistBounds)
  window.on('resized', persistBounds)
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
