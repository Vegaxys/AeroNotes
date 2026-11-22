import { useMemo, useState } from 'react'
import type { Note, NoteSortMode } from '@shared/types'
import { t } from '@shared/i18n'
import { filterNotes, sortFolderNotes } from '@renderer/state/noteListing'
import { useNotesStore } from '@renderer/state/useNotesStore'
import { useSettingsStore } from '@renderer/state/useSettingsStore'
import { IconCheck, IconChevronDown, IconClose, IconSearch, IconSliders } from '../icons'
import { BottomSheet, SheetRow } from './BottomSheet'
import { NoteCard } from './NoteCard'

const SORT_MODES: NoteSortMode[] = ['manual', 'created', 'updated', 'name']

interface NotesPageProps {
  onOpenNote: (note: Note) => void
  onNoteActions: (note: Note) => void
  onShowFolders: () => void
}

/**
 * The « dock en longueur » (Figma board 01): the current folder's notes in two
 * columns, pinned first, with search and sort. Cards alternate between the
 * columns so the reading order stays left-right, top-down.
 */
export function NotesPage({ onOpenNote, onNoteActions, onShowFolders }: NotesPageProps): React.JSX.Element {
  const notes = useNotesStore((s) => s.notes)
  const folders = useNotesStore((s) => s.folders)
  const currentFolderId = useNotesStore((s) => s.currentFolderId)
  const searchQuery = useNotesStore((s) => s.searchQuery)
  const setSearchQuery = useNotesStore((s) => s.setSearchQuery)
  const sortMode = useSettingsStore((s) => s.sortMode)
  const setSortMode = useSettingsStore((s) => s.setSortMode)
  const [sortOpen, setSortOpen] = useState(false)

  const folder = folders.find((f) => f.id === currentFolderId)
  const sorted = useMemo(() => sortFolderNotes(notes, currentFolderId, sortMode), [notes, currentFolderId, sortMode])
  const visible = useMemo(() => filterNotes(sorted, searchQuery), [sorted, searchQuery])
  const columns = [visible.filter((_, i) => i % 2 === 0), visible.filter((_, i) => i % 2 === 1)]

  if (!folder) {
    return (
      <div className="flex h-full items-center justify-center px-10 text-center text-sm leading-relaxed text-m-muted">
        {t('mobile.noFolder')}
      </div>
    )
  }

  const count = sorted.length
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-2">
        <button type="button" onClick={onShowFolders} className="min-w-0 text-left">
          <span className="flex items-center gap-1">
            <span className="truncate text-[26px] font-extrabold">{folder.name}</span>
            <IconChevronDown width={20} height={20} className="shrink-0 text-m-muted" />
          </span>
          <span className="text-[13px] text-m-muted">
            {t(count === 1 ? 'folder.noteCount.one' : 'folder.noteCount.many', { count })} · {t(`dock.sort.${sortMode}`)}
          </span>
        </button>
        <button
          type="button"
          aria-label={t('dock.sort')}
          onClick={() => setSortOpen(true)}
          className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-m-surface text-m-muted"
        >
          <IconSliders width={22} height={22} />
        </button>
      </div>

      <label className="mx-4 mt-4 flex h-12 shrink-0 items-center gap-2.5 rounded-full bg-m-surface px-4 text-m-muted">
        <IconSearch width={20} height={20} />
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={t('dock.searchIn', { name: folder.name }).replace(/\.\.\.$/, '')}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-m-text outline-none placeholder:text-m-muted"
        />
        {searchQuery && (
          <button type="button" aria-label={t('confirm.cancel')} onClick={() => setSearchQuery('')}>
            <IconClose width={18} height={18} />
          </button>
        )}
      </label>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3.5 pt-4 pb-36">
        {visible.length === 0 ? (
          <p className="px-6 pt-16 text-center text-sm text-m-muted">
            {searchQuery ? t('note.notFound') : t('mobile.emptyFolder')}
          </p>
        ) : (
          <div className="flex items-start gap-3">
            {columns.map((column, index) => (
              <div key={index} className="flex min-w-0 flex-1 flex-col gap-3">
                {column.map((note) => (
                  <NoteCard key={note.id} note={note} onOpen={() => onOpenNote(note)} onLongPress={() => onNoteActions(note)} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {sortOpen && (
        <BottomSheet label={t('dock.sort')} onClose={() => setSortOpen(false)}>
          <p className="px-2 pb-2 text-lg font-bold">{t('dock.sort')}</p>
          {SORT_MODES.map((mode) => (
            <SheetRow
              key={mode}
              icon={mode === sortMode ? <IconCheck className="text-accent" /> : <span className="block w-6" />}
              label={t(`dock.sort.${mode}`)}
              onPress={() => {
                setSortMode(mode)
                setSortOpen(false)
              }}
            />
          ))}
        </BottomSheet>
      )}
    </div>
  )
}
