import { useEffect, useMemo, useState } from 'react'
import type { Note, NoteSortMode } from '@shared/types'
import { t } from '@shared/i18n'
import { useNotesStore } from '@renderer/state/useNotesStore'
import { useSettingsStore } from '@renderer/state/useSettingsStore'
import { DockNotePreview } from './DockNotePreview'
import { useCtrlKeyHeld } from './useCtrlKeyHeld'

/** Pinned notes come first whatever the mode; these order the rest. */
const COMPARATORS: Record<NoteSortMode, (a: Note, b: Note) => number> = {
  manual: (a, b) => a.dockIndex - b.dockIndex,
  created: (a, b) => b.createdAt - a.createdAt,
  updated: (a, b) => b.updatedAt - a.updatedAt,
  name: (a, b) => a.title.localeCompare(b.title)
}

export function DockNoteList(): React.JSX.Element {
  const notes = useNotesStore((s) => s.notes)
  const currentFolderId = useNotesStore((s) => s.currentFolderId)
  const searchQuery = useNotesStore((s) => s.searchQuery)
  const reorderNotes = useNotesStore((s) => s.reorderNotes)
  const sortMode = useSettingsStore((s) => s.sortMode)
  const setSortMode = useSettingsStore((s) => s.setSortMode)
  const detachNote = useNotesStore((s) => s.detachNote)
  const remoteRevisions = useNotesStore((s) => s.remoteRevisions)
  const selectedNoteIds = useNotesStore((s) => s.selectedNoteIds)
  const toggleNoteSelection = useNotesStore((s) => s.toggleNoteSelection)
  const clearNoteSelection = useNotesStore((s) => s.clearNoteSelection)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const ctrlHeld = useCtrlKeyHeld()

  // Holding Ctrl arms the selection; an existing selection keeps it armed once
  // the key is released, so the floating bar can be reached with the mouse.
  const selectionMode = ctrlHeld || selectedNoteIds.length > 0

  const sortedNotes = useMemo(
    () =>
      notes
        .filter((note) => note.folderId === currentFolderId)
        .sort(
          (a, b) =>
            Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || COMPARATORS[sortMode](a, b)
        ),
    [notes, currentFolderId, sortMode]
  )

  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return sortedNotes
    return sortedNotes.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        note.contentPreview.toLowerCase().includes(query)
    )
  }, [sortedNotes, searchQuery])

  // While a card is dragged, accept dragover everywhere (the overlay window
  // covers the whole screen) so the cursor shows 'move' instead of the
  // not-allowed sign — dropping outside the dock is a valid gesture (detach).
  useEffect(() => {
    if (!draggedId) return
    function handleDragOver(event: DragEvent): void {
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
    }
    document.addEventListener('dragover', handleDragOver)
    return () => document.removeEventListener('dragover', handleDragOver)
  }, [draggedId])

  // Escape is the way out of a selection — the overlay is not focusable, so
  // the listener has to live on the window and not on a focused element.
  useEffect(() => {
    if (selectedNoteIds.length === 0) return
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') clearNoteSelection()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNoteIds.length, clearNoteSelection])

  const handleDropOn = (targetId: string): void => {
    if (!draggedId || draggedId === targetId) return
    const order = sortedNotes.map((n) => n.id)
    const fromIndex = order.indexOf(draggedId)
    const toIndex = order.indexOf(targetId)
    if (fromIndex === -1 || toIndex === -1) return
    order.splice(fromIndex, 1)
    order.splice(toIndex, 0, draggedId)
    reorderNotes(order)
    // Dropping a note IS a manual ordering: persist what the user just built
    // instead of letting the active sort mode undo it on the next render.
    setSortMode('manual')
  }

  const handleDragEnd = (id: string, event: React.DragEvent<HTMLDivElement>): void => {
    // Dropped outside the dock entirely (not just onto another note): pop it
    // open right where it was dropped.
    const dropTarget = document.elementFromPoint(event.clientX, event.clientY)
    if (!dropTarget?.closest('[data-dock-root]')) {
      detachNote(id, { x: event.screenX, y: event.screenY })
    }
    setDraggedId(null)
  }

  return (
    <div
      // Extra bottom padding while the floating selection bar is up, so the
      // last card can still be scrolled clear of it.
      className={`dock-scroll dock-scroll-list flex-1 space-y-2 overflow-y-auto p-3 ${
        selectedNoteIds.length > 0 ? 'pb-16' : ''
      }`}
    >
      {filteredNotes.map((note) => (
        <div
          // isDetached and the remote revision in the key: the embedded editor
          // only reads `content` at mount, so a redocked or cloud-updated note
          // must remount to show its fresh content.
          key={`${note.id}:${note.isDetached}:${remoteRevisions[note.id] ?? 0}`}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            handleDropOn(note.id)
          }}
          className={draggedId === note.id ? 'opacity-40' : ''}
        >
          <DockNotePreview
            note={note}
            selectionMode={selectionMode}
            selected={selectedNoteIds.includes(note.id)}
            onToggleSelect={() => toggleNoteSelection(note.id)}
            onDragStart={() => setDraggedId(note.id)}
            onDragEnd={(event) => handleDragEnd(note.id, event)}
          />
        </div>
      ))}
      {filteredNotes.length === 0 && (
        <p className="mt-4 text-center text-xs text-white/40">{t('note.notFound')}</p>
      )}
    </div>
  )
}
