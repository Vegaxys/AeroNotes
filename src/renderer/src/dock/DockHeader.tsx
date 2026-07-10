import { t } from '@shared/i18n'
import { useNotesStore } from '@renderer/state/useNotesStore'
import { DockMenu } from './DockMenu'
import { DockSearchInput } from './DockSearchInput'

export function DockHeader(): React.JSX.Element {
  const currentFolderId = useNotesStore((s) => s.currentFolderId)
  const folders = useNotesStore((s) => s.folders)
  const leaveFolder = useNotesStore((s) => s.leaveFolder)
  const addNote = useNotesStore((s) => s.addNote)
  const addFolder = useNotesStore((s) => s.addFolder)

  const insideFolder = currentFolderId !== null
  const folderName = folders.find((f) => f.id === currentFolderId)?.name

  return (
    <div className="border-b border-white/10 p-3">
      {/* One tall bar holding everything: back button (inside a folder), the
       * search input, then the bare-icon add + side-switch buttons. */}
      <div className="flex h-10 items-center gap-0.5 rounded-[var(--radius-sm)] border border-white/15 bg-neutral-900/95 px-1.5">
        {insideFolder && (
          <button
            onClick={leaveFolder}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-base text-white/70 hover:text-white"
            aria-label={t('dock.backToFolders')}
            title={t('dock.backToFolders')}
          >
            ‹
          </button>
        )}
        <DockSearchInput
          placeholder={
            insideFolder
              ? folderName
                ? t('dock.searchIn', { name: folderName })
                : t('dock.searchInFallback')
              : t('dock.searchFolders')
          }
        />
        <button
          onClick={insideFolder ? addNote : addFolder}
          className="flex h-7 w-7 shrink-0 items-center justify-center text-lg text-white/70 hover:text-white"
          aria-label={insideFolder ? t('dock.addNote') : t('dock.addFolder')}
          title={insideFolder ? t('dock.addNote') : t('dock.addFolder')}
        >
          +
        </button>
        <DockMenu />
      </div>
    </div>
  )
}
