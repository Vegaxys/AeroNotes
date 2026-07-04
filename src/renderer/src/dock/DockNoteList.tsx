import { useMemo } from 'react'
import { useNotesStore } from '@renderer/state/useNotesStore'
import { DockNotePreview } from './DockNotePreview'

export function DockNoteList(): React.JSX.Element {
  const notes = useNotesStore((s) => s.notes)
  const searchQuery = useNotesStore((s) => s.searchQuery)

  const filteredNotes = useMemo(() => {
    const sorted = [...notes].sort((a, b) => a.dockIndex - b.dockIndex)
    const query = searchQuery.trim().toLowerCase()
    if (!query) return sorted
    return sorted.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        note.contentPreview.toLowerCase().includes(query)
    )
  }, [notes, searchQuery])

  return (
    <div className="flex-1 space-y-2 overflow-y-auto p-3">
      {filteredNotes.map((note) => (
        <DockNotePreview key={note.id} note={note} />
      ))}
      {filteredNotes.length === 0 && (
        <p className="mt-4 text-center text-xs text-white/40">Aucune note trouvee</p>
      )}
    </div>
  )
}
