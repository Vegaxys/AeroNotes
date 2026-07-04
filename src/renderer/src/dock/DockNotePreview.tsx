import type { Note } from '@shared/types'
import { noteColorToCss } from '@shared/colorPalette'
import { useNotesStore } from '@renderer/state/useNotesStore'

interface DockNotePreviewProps {
  note: Note
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
      className={`cursor-pointer rounded-[var(--radius-md)] p-3 text-black/80 shadow-md transition-transform hover:-translate-y-0.5 ${
        note.isDetached ? 'opacity-50' : ''
      }`}
      style={{ background: noteColorToCss(note.color) }}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium">{note.title || 'Sans titre'}</p>
        {note.isDetached && <span className="shrink-0 text-[10px] text-black/50">ouverte</span>}
      </div>
      <p className="line-clamp-2 text-xs text-black/60">{note.contentPreview}</p>
    </div>
  )
}
