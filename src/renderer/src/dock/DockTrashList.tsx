import { useMemo } from 'react'
import type { Note } from '@shared/types'
import { noteColorToCss } from '@shared/colorPalette'
import { t } from '@shared/i18n'
import { TRASH_TTL_MS } from '@shared/trash'
import { useNotesStore } from '@renderer/state/useNotesStore'

/** Days left before the automatic purge, as a short footer label. */
function expiryLabel(deletedAt: number): string {
  const daysLeft = Math.ceil((deletedAt + TRASH_TTL_MS - Date.now()) / (24 * 60 * 60 * 1000))
  return daysLeft <= 0 ? t('trash.expires.today') : t('trash.expires.days', { count: daysLeft })
}

function TrashCard({ note }: { note: Note }): React.JSX.Element {
  const restoreNote = useNotesStore((s) => s.restoreNote)
  const purgeNote = useNotesStore((s) => s.purgeNote)

  return (
    <div
      // Muted: a trashed note must not read as one you can still work in.
      className="overflow-hidden rounded-[var(--radius-md)] text-black/80 opacity-60 shadow-md transition-opacity hover:opacity-100"
      style={{ background: noteColorToCss(note.color) }}
    >
      <div className="border-b border-black/10 px-3 py-2">
        <p className="truncate text-sm font-medium">{note.title || t('note.untitled')}</p>
      </div>
      <div className="px-3 py-2">
        <p className="line-clamp-2 text-xs text-black/60">{note.contentPreview}</p>
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => restoreNote(note.id)}
            className="rounded-full bg-black/15 px-2.5 py-1 text-[11px] hover:bg-black/30"
          >
            {t('trash.restore')}
          </button>
          <button
            onClick={() => purgeNote(note.id)}
            className="rounded-full bg-black/15 px-2.5 py-1 text-[11px] text-red-900 hover:bg-black/30"
          >
            {t('trash.purge')}
          </button>
          <span className="ml-auto shrink-0 text-[10px] text-black/40">
            {expiryLabel(note.deletedAt ?? 0)}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * The dock showing the trash instead of a folder's notes: deleted notes stay
 * here (restorable) until the 30-day sweep in the main process purges them.
 */
export function DockTrashList(): React.JSX.Element {
  const trash = useNotesStore((s) => s.trash)
  const searchQuery = useNotesStore((s) => s.searchQuery)

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return trash
    return trash.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        note.contentPreview.toLowerCase().includes(query)
    )
  }, [trash, searchQuery])

  return (
    <div className="dock-scroll dock-scroll-list flex-1 space-y-2 overflow-y-auto p-3">
      {filtered.map((note) => (
        <TrashCard key={note.id} note={note} />
      ))}
      {filtered.length === 0 && (
        <p className="px-1 py-6 text-center text-xs text-white/40">
          {searchQuery ? t('note.notFound') : t('trash.isEmpty')}
        </p>
      )}
    </div>
  )
}
