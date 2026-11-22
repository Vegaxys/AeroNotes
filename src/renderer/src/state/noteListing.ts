import type { Note, NoteSortMode } from '@shared/types'

/** Pinned notes come first whatever the mode; these order the rest. */
const COMPARATORS: Record<NoteSortMode, (a: Note, b: Note) => number> = {
  manual: (a, b) => a.dockIndex - b.dockIndex,
  created: (a, b) => b.createdAt - a.createdAt,
  updated: (a, b) => b.updatedAt - a.updatedAt,
  name: (a, b) => a.title.localeCompare(b.title)
}

/** A folder's notes in display order: pinned first, then by the sort mode. */
export function sortFolderNotes(notes: Note[], folderId: string | null, sortMode: NoteSortMode): Note[] {
  return notes
    .filter((note) => note.folderId === folderId)
    .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || COMPARATORS[sortMode](a, b))
}

/** Keeps the notes whose title or text contains the query (case-insensitive). */
export function filterNotes(notes: Note[], query: string): Note[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return notes
  return notes.filter(
    (note) => note.title.toLowerCase().includes(needle) || note.contentPreview.toLowerCase().includes(needle)
  )
}
