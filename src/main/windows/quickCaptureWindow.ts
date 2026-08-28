import { screen } from 'electron'
import { t } from '@shared/i18n'
import { notesStore } from '../store/notesStore'
import { settingsStore } from '../store/settingsStore'
import { detachNote, focusNote, getNoteWindow } from './noteWindowRegistry'

/** Note id of the capture window currently open, if any. */
let capturingNoteId: string | null = null

/**
 * Grace period after opening during which a blur is ignored. Opening the
 * window (and, in dev, its detached DevTools) shuffles focus around; without
 * this the capture would cancel itself before the user can type.
 */
const BLUR_GRACE_MS = 800

/**
 * Where a captured note lands: the folder the dock has open, or the first one
 * when that is gone (or the dock is showing the folder list).
 */
function resolveTargetFolderId(): string | undefined {
  const { lastOpenFolderId } = settingsStore.get()
  const folders = notesStore.getFolders()
  if (lastOpenFolderId && folders.some((folder) => folder.id === lastOpenFolderId)) {
    return lastOpenFolderId
  }
  return folders[0]?.id
}

/** Nothing was written: the capture is still a blank note nobody asked to keep. */
function isUntouched(noteId: string): boolean {
  const note = notesStore.getById(noteId)
  if (!note) return false
  return note.contentPreview.trim() === '' && note.title === t('note.defaultTitle')
}

/**
 * Global-shortcut capture: creates a note and opens it as a post-it above
 * everything, centered on the screen under the cursor. It IS a regular
 * detached note window (same frame, same editor, same persistence) — only its
 * placement, its always-on-top, the Escape/blur-to-cancel and the clipboard
 * pill the renderer shows for `quickCapture=1` are specific.
 *
 * The note is created up front (the editor needs something to write into) but
 * kept out of every dock list until it holds text: renderers only learn about
 * notes through a broadcast, so an untouched capture is simply never
 * broadcast, and is purged when the window closes.
 */
export function openQuickCapture(onChanged: () => void): void {
  if (capturingNoteId) {
    const existing = getNoteWindow(capturingNoteId)
    if (existing && !existing.isDestroyed()) {
      focusNote(capturingNoteId)
      return
    }
    capturingNoteId = null
  }

  const folderId = resolveTargetFolderId()
  if (!folderId) return

  const note = notesStore.add(folderId)
  // Swallows the broadcasts the window itself triggers (detach, move, close)
  // while the capture is still blank — that is what keeps it out of the dock.
  const broadcastIfWritten = (): void => {
    if (!isUntouched(note.id)) onChanged()
  }

  const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  detachNote(
    note.id,
    broadcastIfWritten,
    // detachNote centers the title bar on this point, then clamps to the work
    // area — so this lands the window in the middle of the active screen.
    { x: Math.round(workArea.x + workArea.width / 2), y: Math.round(workArea.y + workArea.height / 3) },
    { quickCapture: true }
  )

  const window = getNoteWindow(note.id)
  if (!window) return
  capturingNoteId = note.id
  const openedAt = Date.now()

  // Above the dock and any other floating post-it: a capture is transient and
  // must never open behind something.
  window.setAlwaysOnTop(true, 'screen-saver')
  window.focus()

  // Escape discards it the same way clicking away does.
  window.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown' || input.key !== 'Escape') return
    event.preventDefault()
    window.close()
  })

  // Clicking away cancels a capture nobody wrote in. Once it holds text it is
  // an ordinary note window and stays open like any other.
  window.on('blur', () => {
    if (Date.now() - openedAt < BLUR_GRACE_MS) return
    // The detached DevTools taking focus in dev is not the user leaving.
    if (window.webContents.isDevToolsFocused()) return
    if (isUntouched(note.id)) window.close()
  })

  window.on('closed', () => {
    if (capturingNoteId === note.id) capturingNoteId = null
    if (!isUntouched(note.id)) return
    // Purge (with a tombstone): the note may already have been pushed to Drive
    // by the debounced sync, so it must not come back from the cloud.
    notesStore.purgeNote(note.id)
    onChanged()
  })
}
