import { useRef, useState } from 'react'
import type { Folder } from '@shared/types'
import { t } from '@shared/i18n'
import { useNotesStore } from '@renderer/state/useNotesStore'
import { IconChevronRight, IconFolder, IconPencil, IconPlus, IconTrash } from '../icons'
import { BottomSheet, SheetRow } from './BottomSheet'

interface FoldersPageProps {
  /** A folder was picked: the app goes back to the notes page. */
  onFolderChosen: () => void
  onOpenTrash: () => void
}

const LONG_PRESS_MS = 450

/** Left page (Figma board 02): folders with their note counts, plus the trash. */
export function FoldersPage({ onFolderChosen, onOpenTrash }: FoldersPageProps): React.JSX.Element {
  const folders = useNotesStore((s) => s.folders)
  const notes = useNotesStore((s) => s.notes)
  const trash = useNotesStore((s) => s.trash)
  const currentFolderId = useNotesStore((s) => s.currentFolderId)
  const enterFolder = useNotesStore((s) => s.enterFolder)
  const [menuFor, setMenuFor] = useState<Folder | null>(null)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressed = useRef(false)

  const createFolder = async (): Promise<void> => {
    const name = window.prompt(t('mobile.folderPrompt'), t('folder.newName'))?.trim()
    if (!name) return
    const folder = await window.aeronotes.addFolder(name)
    enterFolder(folder.id)
    onFolderChosen()
  }

  const renameFolder = (folder: Folder): void => {
    setMenuFor(null)
    const name = window.prompt(t('folder.rename'), folder.name)?.trim()
    if (name && name !== folder.name) window.aeronotes.renameFolder(folder.id, name)
  }

  const deleteFolder = (folder: Folder): void => {
    setMenuFor(null)
    void window.aeronotes.deleteFolder(folder.id)
  }

  const count = (id: string): number => notes.filter((note) => note.folderId === id).length

  return (
    <div className="no-scrollbar flex h-full flex-col overflow-y-auto px-4 pt-2 pb-36">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold">{t('mobile.folders')}</h1>
          <p className="text-[13px] text-m-muted">
            {t(notes.length === 1 ? 'folder.noteCount.one' : 'folder.noteCount.many', { count: notes.length })}
          </p>
        </div>
        <button
          type="button"
          aria-label={t('dock.addFolder')}
          onClick={() => void createFolder()}
          className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-m-surface"
        >
          <IconPlus width={22} height={22} />
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        {folders.map((folder) => {
          const active = folder.id === currentFolderId
          return (
            <button
              key={folder.id}
              type="button"
              onPointerDown={() => {
                longPressed.current = false
                pressTimer.current = setTimeout(() => {
                  longPressed.current = true
                  navigator.vibrate?.(10)
                  setMenuFor(folder)
                }, LONG_PRESS_MS)
              }}
              onPointerUp={() => pressTimer.current && clearTimeout(pressTimer.current)}
              onPointerLeave={() => pressTimer.current && clearTimeout(pressTimer.current)}
              onContextMenu={(event) => event.preventDefault()}
              onClick={() => {
                if (longPressed.current) return
                enterFolder(folder.id)
                onFolderChosen()
              }}
              className={`flex h-[60px] items-center gap-3.5 rounded-[18px] pr-3 pl-4 text-left ${
                active ? 'bg-accent/20 text-accent' : 'bg-m-surface text-m-text'
              }`}
            >
              <IconFolder width={22} height={22} className={active ? '' : 'text-m-muted'} />
              <span className="flex-1 truncate text-base font-medium">{folder.name}</span>
              <span className="text-sm font-medium text-m-muted">{count(folder.id)}</span>
              <IconChevronRight width={20} height={20} className="text-m-muted" />
            </button>
          )
        })}
        {folders.length === 0 && <p className="px-2 py-6 text-sm leading-relaxed text-m-muted">{t('mobile.noFolder')}</p>}

        <div className="my-1 h-px bg-m-border" />
        <button
          type="button"
          onClick={onOpenTrash}
          className="flex h-16 items-center gap-3.5 rounded-[18px] bg-m-surface pr-3 pl-4 text-left"
        >
          <IconTrash width={22} height={22} className="text-m-muted" />
          <span className="flex-1">
            <span className="block text-base font-medium">{t('trash.title')}</span>
            <span className="block text-xs text-m-muted">
              {t(trash.length === 1 ? 'folder.noteCount.one' : 'folder.noteCount.many', { count: trash.length })}
            </span>
          </span>
          <IconChevronRight width={20} height={20} className="text-m-muted" />
        </button>
      </div>
      <p className="mt-5 px-2.5 text-[13px] leading-relaxed text-m-muted">{t('mobile.folderHint')}</p>

      {menuFor && (
        <BottomSheet label={t('mobile.folderActions')} onClose={() => setMenuFor(null)}>
          <p className="truncate px-2 pb-2 text-lg font-bold">{menuFor.name}</p>
          <SheetRow icon={<IconPencil />} label={t('folder.rename')} onPress={() => renameFolder(menuFor)} />
          <SheetRow icon={<IconTrash />} label={t('folder.delete')} danger onPress={() => deleteFolder(menuFor)} />
        </BottomSheet>
      )}
    </div>
  )
}
