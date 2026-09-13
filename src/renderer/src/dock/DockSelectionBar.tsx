import { useEffect, useRef, useState } from 'react'
import { t } from '@shared/i18n'
import { useNotesStore } from '@renderer/state/useNotesStore'

/**
 * Floating action bar for the dock's Ctrl multi-selection: sits at the very
 * bottom of the dock, above the note list, and only exists while at least one
 * note is selected.
 *
 * It is rendered by `Dock` rather than by `DockNoteList` so it floats over the
 * scrolling list instead of scrolling with it; it stays inside the dock root's
 * rect, so the overlay's click-through hit test already covers it.
 */
export function DockSelectionBar(): React.JSX.Element | null {
  const selectedNoteIds = useNotesStore((s) => s.selectedNoteIds)
  const clearNoteSelection = useNotesStore((s) => s.clearNoteSelection)
  const moveNotesToFolder = useNotesStore((s) => s.moveNotesToFolder)
  const deleteNotes = useNotesStore((s) => s.deleteNotes)
  const folders = useNotesStore((s) => s.folders)
  const currentFolderId = useNotesStore((s) => s.currentFolderId)

  const [foldersOpen, setFoldersOpen] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)

  const count = selectedNoteIds.length

  // The folder drop-down closes on any click outside the bar (including on a
  // note card, which would otherwise leave it hanging over the list).
  useEffect(() => {
    if (!foldersOpen) return
    function handlePointerDown(event: PointerEvent): void {
      if (event.target instanceof Node && !barRef.current?.contains(event.target)) {
        setFoldersOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [foldersOpen])

  // An emptied selection (Escape, last card deselected, notes moved away) must
  // not leave the drop-down armed for the next selection.
  useEffect(() => {
    if (count === 0) setFoldersOpen(false)
  }, [count])

  if (count === 0) return null

  const otherFolders = folders.filter((folder) => folder.id !== currentFolderId)

  return (
    <div
      ref={barRef}
      data-mouse-live=""
      className="absolute inset-x-3 bottom-3 z-30 rounded-[var(--radius-md)] border border-white/15 bg-neutral-900/95 shadow-2xl"
    >
      {foldersOpen && (
        // Opens upward: the bar is already at the bottom of the screen.
        <div className="dock-scroll max-h-52 overflow-y-auto border-b border-white/10 p-1">
          {otherFolders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => {
                moveNotesToFolder(selectedNoteIds, folder.id)
                setFoldersOpen(false)
              }}
              className="flex w-full items-center gap-1.5 truncate rounded px-2 py-1.5 text-left text-xs text-white/85 hover:bg-white/10"
            >
              📁 <span className="truncate">{folder.name}</span>
            </button>
          ))}
          {otherFolders.length === 0 && (
            <p className="px-2 py-1.5 text-xs text-white/40">{t('selection.noOtherFolder')}</p>
          )}
        </div>
      )}
      <div className="flex items-center gap-1 p-1.5">
        <span className="shrink-0 pl-1 text-xs font-medium text-white/70">
          {t(count === 1 ? 'selection.count.one' : 'selection.count.many', { count })}
        </span>
        <span className="flex-1" />
        <button
          onClick={() => setFoldersOpen(!foldersOpen)}
          className={`flex shrink-0 items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1.5 text-xs text-white/85 ${
            foldersOpen ? 'bg-white/20' : 'hover:bg-white/10'
          }`}
          title={t('selection.move')}
        >
          📁 {t('selection.move')}
          <span className="text-white/50">{foldersOpen ? '▾' : '▸'}</span>
        </button>
        <button
          onClick={() => deleteNotes(selectedNoteIds)}
          className="flex shrink-0 items-center gap-1 rounded-[var(--radius-sm)] px-2 py-1.5 text-xs text-red-400 hover:bg-white/10"
          title={t('selection.trash')}
        >
          🗑 {t('selection.trash')}
        </button>
        <button
          onClick={clearNoteSelection}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-sm text-white/60 hover:bg-white/10 hover:text-white"
          aria-label={t('selection.clear')}
          title={t('selection.clear')}
        >
          ×
        </button>
      </div>
    </div>
  )
}
