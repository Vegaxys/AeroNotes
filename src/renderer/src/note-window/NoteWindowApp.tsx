import { useNotesStore } from '@renderer/state/useNotesStore'
import { useSettingsStore } from '@renderer/state/useSettingsStore'
import { NoteFrame } from '@renderer/shared/NoteFrame'
import { NoteEditor } from '@renderer/editor/NoteEditor'
import { TemplateEditorApp } from './TemplateEditorApp'

function getNoteIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('id')
}

function getTemplateIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('templateId')
}

export function NoteWindowApp(): React.JSX.Element | null {
  const templateId = getTemplateIdFromUrl()
  const noteId = getNoteIdFromUrl()
  const note = useNotesStore((s) => s.notes.find((n) => n.id === noteId))
  const updateNoteContent = useNotesStore((s) => s.updateNoteContent)
  const redockNote = useNotesStore((s) => s.redockNote)
  const deleteNote = useNotesStore((s) => s.deleteNote)
  const setNoteAlwaysOnTop = useNotesStore((s) => s.setNoteAlwaysOnTop)
  const setNoteColor = useNotesStore((s) => s.setNoteColor)
  const setNoteTitle = useNotesStore((s) => s.setNoteTitle)
  // Keyed remount on language change (labels are resolved at render time).
  const locale = useSettingsStore((s) => s.locale)
  const remoteRevisions = useNotesStore((s) => s.remoteRevisions)

  if (templateId) {
    return <TemplateEditorApp key={locale} templateId={templateId} />
  }

  if (!noteId || !note) {
    return null
  }

  return (
    <NoteFrame
      key={locale}
      note={note}
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
        // Remote revision in the key: reload the editor when this note was
        // changed from the cloud while its window is open.
        key={remoteRevisions[note.id] ?? 0}
        noteId={note.id}
        content={note.content}
        onChange={(content) => updateNoteContent(note.id, content)}
        showTemplates
      />
    </NoteFrame>
  )
}
