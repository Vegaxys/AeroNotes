import { useMemo, useState } from 'react'
import type { Folder } from '@shared/types'
import { t } from '@shared/i18n'
import { useNotesStore } from '@renderer/state/useNotesStore'

function FolderCard({ folder, noteCount }: { folder: Folder; noteCount: number }): React.JSX.Element {
  const enterFolder = useNotesStore((s) => s.enterFolder)
  const renameFolder = useNotesStore((s) => s.renameFolder)
  const deleteFolder = useNotesStore((s) => s.deleteFolder)
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div
      onClick={() => {
        if (!isEditing) enterFolder(folder.id)
      }}
      className="group flex cursor-pointer select-none items-center gap-2.5 rounded-[var(--radius-md)] border border-white/10 bg-neutral-900/80 p-3 text-white transition-colors hover:bg-neutral-800/80"
    >
      <span aria-hidden className="text-lg">
        📁
      </span>
      {isEditing ? (
        <input
          autoFocus
          defaultValue={folder.name}
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => {
            const name = e.target.value.trim()
            if (name && name !== folder.name) renameFolder(folder.id, name)
            setIsEditing(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') setIsEditing(false)
          }}
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-white outline-none"
        />
      ) : (
        <span
          onDoubleClick={(e) => {
            e.stopPropagation()
            setIsEditing(true)
          }}
          className="min-w-0 flex-1 truncate text-sm font-medium"
        >
          {folder.name}
        </span>
      )}
      <span className="shrink-0 text-xs text-white/45">
        {t(noteCount > 1 ? 'folder.noteCount.many' : 'folder.noteCount.one', { count: noteCount })}
      </span>
      {/* Rename/delete: quiet until the card is hovered. */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsEditing(true)
        }}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs text-white/0 hover:bg-white/10 group-hover:text-white/60"
        aria-label={t('folder.rename')}
        title={t('folder.rename')}
      >
        ✎
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          deleteFolder(folder.id)
        }}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs text-white/0 hover:bg-white/10 hover:!text-red-400 group-hover:text-white/60"
        aria-label={t('folder.delete')}
        title={t('folder.delete')}
      >
        🗑
      </button>
    </div>
  )
}

export function DockFolderList(): React.JSX.Element {
  const folders = useNotesStore((s) => s.folders)
  const notes = useNotesStore((s) => s.notes)
  const searchQuery = useNotesStore((s) => s.searchQuery)

  const filteredFolders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const sorted = [...folders].sort((a, b) => a.createdAt - b.createdAt)
    if (!query) return sorted
    return sorted.filter((folder) => folder.name.toLowerCase().includes(query))
  }, [folders, searchQuery])

  return (
    <div className="dock-scroll flex-1 space-y-2 overflow-y-auto p-3">
      {filteredFolders.map((folder) => (
        <FolderCard
          key={folder.id}
          folder={folder}
          noteCount={notes.filter((note) => note.folderId === folder.id).length}
        />
      ))}
      {filteredFolders.length === 0 && (
        <p className="mt-4 text-center text-xs text-white/40">
          {folders.length === 0 ? t('folder.empty') : t('folder.notFound')}
        </p>
      )}
    </div>
  )
}
