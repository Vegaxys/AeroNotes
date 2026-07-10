import { useNotesStore } from '@renderer/state/useNotesStore'
import { NoteFrame } from '@renderer/shared/NoteFrame'
import { NoteEditor } from '@renderer/editor/NoteEditor'

function getNoteIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('id')
}

export function NoteWindowApp(): React.JSX.Element | null {
  const noteId = getNoteIdFromUrl()
  const note = useNotesStore((s) => s.notes.find((n) => n.id === noteId))
  const updateNoteContent = useNotesStore((s) => s.updateNoteContent)
  const redockNote = useNotesStore((s) => s.redockNote)
  const deleteNote = useNotesStore((s) => s.deleteNote)
  const setNoteAlwaysOnTop = useNotesStore((s) => s.setNoteAlwaysOnTop)
  const setNoteColor = useNotesStore((s) => s.setNoteColor)
  const setNoteTitle = useNotesStore((s) => s.setNoteTitle)

  if (!noteId || !note) {
    return null
  }

  return (
    <NoteFrame
      title={note.title}
      color={note.color}
      isPinned={Boolean(note.alwaysOnTop)}
      onTogglePin={() => setNoteAlwaysOnTop(note.id, !note.alwaysOnTop)}
      onRedock={() => redockNote(note.id)}
      onDelete={() => deleteNote(note.id)}
      onColorChange={(color) => setNoteColor(note.id, color)}
      onTitleChange={(title) => setNoteTitle(note.id, title)}
    >
      <NoteEditor
        noteId={note.id}
        content={note.content}
        onChange={(content) => updateNoteContent(note.id, content)}
      />
    </NoteFrame>
  )
}
