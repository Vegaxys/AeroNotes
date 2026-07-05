import type { Note } from '@shared/types'
import { noteColorToCss } from '@shared/colorPalette'
import { useNotesStore } from '@renderer/state/useNotesStore'

interface DockNotePreviewProps {
  note: Note
}

function formatUpdatedAt(timestamp: number): string {
  const updated = new Date(timestamp)
  const now = new Date()
  const isToday =
    updated.getFullYear() === now.getFullYear() &&
    updated.getMonth() === now.getMonth() &&
    updated.getDate() === now.getDate()

  if (isToday) {
    return updated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }
  return updated.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

export function DockNotePreview({ note }: DockNotePreviewProps): React.JSX.Element {
  const detachNote = useNotesStore((s) => s.detachNote)
  const focusNote = useNotesStore((s) => s.focusNote)

  const handleClick = (): void => {
    if (note.isDetached) {
      focusNote(note.id)
    } else {
      detachNote(note.id)
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`cursor-pointer select-none rounded-[var(--radius-md)] p-3 text-black/80 shadow-md transition-transform hover:-translate-y-0.5 ${
        note.isDetached ? 'ring-2 ring-offset-2 ring-white' : ''
      }`}
      style={{ background: noteColorToCss(note.color) }}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium">{note.title || 'Sans titre'}</p>
        {note.isDetached && <span className="shrink-0 text-[10px] text-black/50">ouverte</span>}
      </div>
      <p className="line-clamp-2 text-xs text-black/60">{note.contentPreview}</p>
      <p className="mt-1 text-[10px] text-black/40">{formatUpdatedAt(note.updatedAt)}</p>
    </div>
  )
}
