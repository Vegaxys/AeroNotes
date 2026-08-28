import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Note, NoteColor } from '@shared/types'
import { t } from '@shared/i18n'
import { useNotesStore } from '@renderer/state/useNotesStore'
import { MenuItem } from './MenuItem'

export interface NoteHeaderMenuState {
  x: number
  y: number
  foldersOpen: boolean
  /** The reminder sub-list is expanded. */
  reminderOpen?: boolean
}

const HOUR_MS = 60 * 60 * 1000
const SNOOZE_MS = 10 * 60 * 1000

/** Today+`days` at 9:00 local time. */
function morningIn(days: number): number {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(9, 0, 0, 0)
  return date.getTime()
}

/** Next Monday 9:00 (a week away when today is Monday). */
function nextMondayMorning(): number {
  const daysUntilMonday = ((8 - new Date().getDay()) % 7) || 7
  return morningIn(daysUntilMonday)
}

/** Epoch ms -> the `YYYY-MM-DDTHH:mm` a datetime-local input expects (local time). */
function toDateTimeLocal(timestamp: number | undefined): string {
  if (timestamp === undefined) return ''
  const date = new Date(timestamp - new Date().getTimezoneOffset() * 60_000)
  return date.toISOString().slice(0, 16)
}

interface NoteHeaderMenuProps {
  note: Note
  menu: NoteHeaderMenuState
  setMenu: (menu: NoteHeaderMenuState | null) => void
  /** 'dock' = card in the dock; 'window' = detached post-it titlebar. */
  surface: 'dock' | 'window'
  onRename: () => void
}

/**
 * Right-click menu of a note header, shared by dock cards and detached
 * windows. Fixed-positioned at the click point, clamped to the viewport
 * (the overlay window's viewport IS the screen; a note window clamps to
 * itself, which is what we want there).
 */
export function NoteHeaderMenu({
  note,
  menu,
  setMenu,
  surface,
  onRename
}: NoteHeaderMenuProps): React.JSX.Element {
  const detachNote = useNotesStore((s) => s.detachNote)
  const redockNote = useNotesStore((s) => s.redockNote)
  const deleteNote = useNotesStore((s) => s.deleteNote)
  const duplicateNote = useNotesStore((s) => s.duplicateNote)
  const createTemplateFromNote = useNotesStore((s) => s.createTemplateFromNote)
  const moveNoteToFolder = useNotesStore((s) => s.moveNoteToFolder)
  const setNoteColor = useNotesStore((s) => s.setNoteColor)
  const setNoteAlwaysOnTop = useNotesStore((s) => s.setNoteAlwaysOnTop)
  const setNotePinned = useNotesStore((s) => s.setNotePinned)
  const setNoteDueAt = useNotesStore((s) => s.setNoteDueAt)
  const exportNoteMarkdown = useNotesStore((s) => s.exportNoteMarkdown)
  const folders = useNotesStore((s) => s.folders)

  const menuRef = useRef<HTMLDivElement>(null)
  const [copiedColor, setCopiedColor] = useState<NoteColor | null>(null)

  useEffect(() => {
    void window.aeronotes.getCopiedNoteColor().then(setCopiedColor)
  }, [])

  // Keep the menu fully inside the viewport — re-measured when the folders
  // sub-list expands it.
  useLayoutEffect(() => {
    if (!menuRef.current) return
    const rect = menuRef.current.getBoundingClientRect()
    const x = Math.max(Math.min(menu.x, window.innerWidth - rect.width - 8), 8)
    const y = Math.max(Math.min(menu.y, window.innerHeight - rect.height - 8), 8)
    if (x !== menu.x || y !== menu.y) {
      setMenu({ ...menu, x, y })
    }
  }, [menu, setMenu])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent): void {
      if (event.target instanceof Element && event.target.closest('.note-context-menu')) return
      setMenu(null)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [setMenu])

  const close = (): void => setMenu(null)
  const otherFolders = folders.filter((folder) => folder.id !== note.folderId)

  const applyReminder = (dueAt: number | undefined): void => {
    setNoteDueAt(note.id, dueAt)
    close()
  }

  return (
    <div
      ref={menuRef}
      data-mouse-live=""
      onClick={(e) => e.stopPropagation()}
      className="note-context-menu fixed z-50 w-52 rounded-[var(--radius-md)] border border-white/15 bg-neutral-900/95 p-1 text-xs text-white/85 shadow-2xl"
      style={{ top: menu.y, left: menu.x }}
    >
      <MenuItem
        onClick={() => {
          onRename()
          close()
        }}
      >
        {t('note.rename')}
      </MenuItem>
      <MenuItem
        onClick={() => {
          window.aeronotes.copyNoteColor(note.color)
          close()
        }}
      >
        {t('note.copyColor')}
      </MenuItem>
      {copiedColor && (
        <MenuItem
          onClick={() => {
            setNoteColor(note.id, copiedColor)
            close()
          }}
        >
          {t('note.pasteColor')}
        </MenuItem>
      )}
      <MenuItem
        onClick={() => {
          setNotePinned(note.id, !note.pinned)
          close()
        }}
      >
        {note.pinned ? t('note.unpinFromTop') : t('note.pinToTop')}
      </MenuItem>
      <MenuItem onClick={() => setMenu({ ...menu, reminderOpen: !menu.reminderOpen })}>
        <span>⏰ {t('reminder.menu')}</span>
        <span className="text-white/50">{menu.reminderOpen ? '▾' : '▸'}</span>
      </MenuItem>
      {menu.reminderOpen && (
        <div className="ml-2 flex flex-col border-l border-white/10 pl-1">
          <MenuItem onClick={() => applyReminder(Date.now() + HOUR_MS)}>
            {t('reminder.in1h')}
          </MenuItem>
          <MenuItem onClick={() => applyReminder(morningIn(1))}>{t('reminder.tomorrow')}</MenuItem>
          <MenuItem onClick={() => applyReminder(nextMondayMorning())}>
            {t('reminder.nextWeek')}
          </MenuItem>
          {/* Free date/time. Changing it keeps the menu open, so the value can
           * be adjusted field by field without it closing under the cursor. */}
          <input
            type="datetime-local"
            value={toDateTimeLocal(note.dueAt)}
            onChange={(event) => {
              const value = event.target.value
              setNoteDueAt(note.id, value ? new Date(value).getTime() : undefined)
            }}
            className="mx-2 my-1 rounded border border-white/15 bg-neutral-800 px-1.5 py-1 text-[11px] text-white outline-none focus:border-white/30"
          />
          {note.dueAt !== undefined && (
            <>
              <MenuItem onClick={() => applyReminder(Date.now() + SNOOZE_MS)}>
                {t('reminder.snooze')}
              </MenuItem>
              <MenuItem danger onClick={() => applyReminder(undefined)}>
                {t('reminder.clear')}
              </MenuItem>
            </>
          )}
        </div>
      )}
      {surface === 'dock' && (
        <>
          <MenuItem onClick={() => setMenu({ ...menu, foldersOpen: !menu.foldersOpen })}>
            <span>{t('note.moveToFolder')}</span>
            <span className="text-white/50">{menu.foldersOpen ? '▾' : '▸'}</span>
          </MenuItem>
          {menu.foldersOpen && (
            <div className="ml-2 flex flex-col border-l border-white/10 pl-1">
              {otherFolders.map((folder) => (
                <MenuItem
                  key={folder.id}
                  onClick={() => {
                    moveNoteToFolder(note.id, folder.id)
                    close()
                  }}
                >
                  📁 {folder.name}
                </MenuItem>
              ))}
              {otherFolders.length === 0 && <p className="px-2 py-1.5 text-white/40">—</p>}
            </div>
          )}
        </>
      )}
      <MenuItem
        onClick={() => {
          duplicateNote(note.id)
          close()
        }}
      >
        {t('note.duplicate')}
      </MenuItem>
      <MenuItem
        onClick={() => {
          createTemplateFromNote(note)
          close()
        }}
      >
        {t('note.createTemplate')}
      </MenuItem>
      <MenuItem
        onClick={() => {
          exportNoteMarkdown(note.id)
          close()
        }}
      >
        {t('note.exportMarkdown')}
      </MenuItem>
      {surface === 'window' && (
        <MenuItem
          onClick={() => {
            setNoteAlwaysOnTop(note.id, !note.alwaysOnTop)
            close()
          }}
        >
          {note.alwaysOnTop ? t('note.unpin') : t('note.pin')}
        </MenuItem>
      )}
      {note.isDetached ? (
        <MenuItem
          onClick={() => {
            redockNote(note.id)
            close()
          }}
        >
          {t('note.closeNote')}
        </MenuItem>
      ) : (
        <MenuItem
          onClick={() => {
            detachNote(note.id)
            close()
          }}
        >
          {t('note.openNote')}
        </MenuItem>
      )}
      <div className="my-1 h-px bg-white/10" />
      <MenuItem
        danger
        onClick={() => {
          deleteNote(note.id)
          close()
        }}
      >
        {t('note.delete')}
      </MenuItem>
    </div>
  )
}
