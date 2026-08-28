import { t } from '@shared/i18n'
import { useNotesStore } from '@renderer/state/useNotesStore'
import { DockMenu } from './DockMenu'
import { DockSearchInput } from './DockSearchInput'
import { DockSortMenu } from './DockSortMenu'

function IconButton({
  onClick,
  label,
  className = '',
  children
}: {
  onClick: () => void
  label: string
  className?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`flex h-7 w-7 shrink-0 items-center justify-center text-white/70 hover:text-white ${className}`}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  )
}

export function DockHeader(): React.JSX.Element {
  const currentFolderId = useNotesStore((s) => s.currentFolderId)
  const folders = useNotesStore((s) => s.folders)
  const leaveFolder = useNotesStore((s) => s.leaveFolder)
  const addNote = useNotesStore((s) => s.addNote)
  const addFolder = useNotesStore((s) => s.addFolder)
  const trashView = useNotesStore((s) => s.trashView)
  const setTrashView = useNotesStore((s) => s.setTrashView)
  const emptyTrash = useNotesStore((s) => s.emptyTrash)

  const insideFolder = currentFolderId !== null
  const folderName = folders.find((f) => f.id === currentFolderId)?.name

  const placeholder = trashView
    ? t('dock.searchTrash')
    : insideFolder
      ? folderName
        ? t('dock.searchIn', { name: folderName })
        : t('dock.searchInFallback')
      : t('dock.searchFolders')

  return (
    <div className="border-b border-white/10 p-3">
      {/* One tall bar holding everything: back button (inside a folder or the
       * trash), the search input, then the list actions and the dock menu. */}
      <div className="flex h-10 items-center gap-0.5 rounded-[var(--radius-sm)] border border-white/15 bg-neutral-900/95 px-1.5">
        {(insideFolder || trashView) && (
          <IconButton
            onClick={trashView ? () => setTrashView(false) : leaveFolder}
            label={trashView ? t('trash.back') : t('dock.backToFolders')}
            className="text-base"
          >
            ‹
          </IconButton>
        )}
        <DockSearchInput placeholder={placeholder} />
        {trashView ? (
          <IconButton onClick={emptyTrash} label={t('trash.empty')} className="text-xs">
            🗑
          </IconButton>
        ) : (
          <>
            {insideFolder && <DockSortMenu />}
            <IconButton
              onClick={insideFolder ? addNote : addFolder}
              label={insideFolder ? t('dock.addNote') : t('dock.addFolder')}
              className="text-lg"
            >
              +
            </IconButton>
          </>
        )}
        <DockMenu />
      </div>
    </div>
  )
}
