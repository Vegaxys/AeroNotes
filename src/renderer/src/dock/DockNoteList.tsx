import { useMemo, useState } from 'react'
import { useNotesStore } from '@renderer/state/useNotesStore'
import { DockNotePreview } from './DockNotePreview'

export function DockNoteList(): React.JSX.Element {
  const notes = useNotesStore((s) => s.notes)
  const searchQuery = useNotesStore((s) => s.searchQuery)
  const reorderNotes = useNotesStore((s) => s.reorderNotes)
  const detachNote = useNotesStore((s) => s.detachNote)
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const sortedNotes = useMemo(() => [...notes].sort((a, b) => a.dockIndex - b.dockIndex), [notes])

  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return sortedNotes
    return sortedNotes.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        note.contentPreview.toLowerCase().includes(query)
    )
  }, [sortedNotes, searchQuery])

  const handleDropOn = (targetId: string): void => {
    if (!draggedId || draggedId === targetId) return
    const order = sortedNotes.map((n) => n.id)
    const fromIndex = order.indexOf(draggedId)
    const toIndex = order.indexOf(targetId)
    if (fromIndex === -1 || toIndex === -1) return
    order.splice(fromIndex, 1)
    order.splice(toIndex, 0, draggedId)
    reorderNotes(order)
  }

  const handleDragEnd = (id: string, event: React.DragEvent<HTMLDivElement>): void => {
    // Dropped outside the dock entirely (not just onto another note): pop it open.
    const dropTarget = document.elementFromPoint(event.clientX, event.clientY)
    if (!dropTarget?.closest('[data-dock-root]')) {
      detachNote(id)
    }
    setDraggedId(null)
  }

  return (
    <div className="flex-1 space-y-2 overflow-y-auto p-3">
      {filteredNotes.map((note) => (
        <div
          key={note.id}
          draggable
          onDragStart={() => setDraggedId(note.id)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            handleDropOn(note.id)
          }}
          onDragEnd={(event) => handleDragEnd(note.id, event)}
          className={draggedId === note.id ? 'opacity-40' : ''}
        >
          <DockNotePreview note={note} />
        </div>
      ))}
      {filteredNotes.length === 0 && (
        <p className="mt-4 text-center text-xs text-white/40">Aucune note trouvee</p>
      )}
    </div>
  )
}
