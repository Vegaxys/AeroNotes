import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Note } from '@shared/types'
import { t } from '@shared/i18n'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { useNotesStore } from '@renderer/state/useNotesStore'
import { useSettingsStore } from '@renderer/state/useSettingsStore'
import { BottomBar, type Page } from './BottomBar'
import { FoldersPage } from './FoldersPage'
import { NoteActionsSheet } from './NoteActionsSheet'
import { NoteScreen } from './NoteScreen'
import { NotesPage } from './NotesPage'
import { SettingsPage } from './SettingsPage'
import { TrashScreen } from './TrashScreen'
import { zoomNote } from './viewTransition'

const PAGES: Page[] = ['folders', 'notes', 'settings']

/** Page change from a button: short and decelerating, like a fling (native smooth scroll takes ~0.5 s). */
const PAGE_SLIDE_MS = 150
const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3

function slidePager(pager: HTMLElement, targetLeft: number): void {
  const start = pager.scrollLeft
  if (start === targetLeft) return
  const startedAt = performance.now()
  // Snapping would pull each intermediate frame back to a page edge.
  pager.style.scrollSnapType = 'none'
  const step = (now: number): void => {
    const progress = Math.min(1, (now - startedAt) / PAGE_SLIDE_MS)
    pager.scrollLeft = start + (targetLeft - start) * easeOutCubic(progress)
    if (progress < 1) requestAnimationFrame(step)
    else pager.style.scrollSnapType = ''
  }
  requestAnimationFrame(step)
}

/** Keyed on the language: t() is resolved at render time, a remount repaints every label. */
export function MobileApp(): React.JSX.Element {
  const locale = useSettingsStore((s) => s.locale)
  return <AppShell key={locale} />
}

/**
 * Three pages side by side — folders | notes | settings — swiped on their
 * content (never from the screen edge, which belongs to Android's back
 * gesture), plus what opens over them: a note, its actions, the trash.
 */
function AppShell(): React.JSX.Element {
  const notes = useNotesStore((s) => s.notes)
  const folders = useNotesStore((s) => s.folders)
  const currentFolderId = useNotesStore((s) => s.currentFolderId)
  const enterFolder = useNotesStore((s) => s.enterFolder)
  const remoteRevisions = useNotesStore((s) => s.remoteRevisions)
  const pagerRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState<Page>('notes')
  const [openNote, setOpenNote] = useState<{ id: string; editing: boolean } | null>(null)
  const [actionsFor, setActionsFor] = useState<string | null>(null)
  const [trashOpen, setTrashOpen] = useState(false)

  const note = openNote ? notes.find((n) => n.id === openNote.id) : undefined
  const actionsNote = actionsFor ? notes.find((n) => n.id === actionsFor) : undefined

  // The phone always shows a folder: the last one opened, else the first.
  useEffect(() => {
    if (folders.length > 0 && !folders.some((f) => f.id === currentFolderId)) enterFolder(folders[0].id)
  }, [folders, currentFolderId, enterFolder])

  // The open note was trashed or deleted (here or by a sync): close it.
  useEffect(() => {
    if (openNote && !note) setOpenNote(null)
  }, [openNote, note])

  const goToPage = useCallback((target: Page) => {
    const pager = pagerRef.current
    if (pager) slidePager(pager, PAGES.indexOf(target) * pager.clientWidth)
  }, [])

  useLayoutEffect(() => {
    const pager = pagerRef.current
    if (pager) pager.scrollLeft = pager.clientWidth
  }, [])

  const openExisting = (target: Note): void => zoomNote(target.id, 'open', () => setOpenNote({ id: target.id, editing: false }))
  const closeNote = useCallback(() => {
    if (!openNote) return
    zoomNote(openNote.id, 'close', () => setOpenNote(null))
  }, [openNote])

  const createNote = async (): Promise<void> => {
    let folderId = currentFolderId
    if (!folderId) {
      const folder = await window.aeronotes.addFolder(t('folder.defaultName'))
      enterFolder(folder.id)
      folderId = folder.id
    }
    const created = await window.aeronotes.addNote(folderId)
    goToPage('notes')
    setOpenNote({ id: created.id, editing: true })
  }

  // Android back: closes what is on top, one layer at a time; leaves the app last.
  const backState = useRef({ openNote, actionsFor, trashOpen, page })
  backState.current = { openNote, actionsFor, trashOpen, page }
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const handle = App.addListener('backButton', () => {
      const state = backState.current
      if (state.actionsFor) setActionsFor(null)
      else if (state.openNote?.editing) setOpenNote({ ...state.openNote, editing: false })
      else if (state.openNote) closeNote()
      else if (state.trashOpen) setTrashOpen(false)
      else if (state.page !== 'notes') goToPage('notes')
      else void App.exitApp()
    })
    return () => void handle.then((h) => h.remove())
  }, [closeNote, goToPage])

  return (
    <div className="safe-top relative h-full">
      <div
        ref={pagerRef}
        onScroll={(event) => {
          const pager = event.currentTarget
          setPage(PAGES[Math.round(pager.scrollLeft / pager.clientWidth)] ?? 'notes')
        }}
        className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
      >
        <section className="pager-page h-full w-full shrink-0 snap-start">
          <FoldersPage onFolderChosen={() => goToPage('notes')} onOpenTrash={() => setTrashOpen(true)} />
        </section>
        <section className="pager-page h-full w-full shrink-0 snap-start">
          <NotesPage
            onOpenNote={openExisting}
            onNoteActions={(target) => setActionsFor(target.id)}
            onShowFolders={() => goToPage('folders')}
          />
        </section>
        <section className="pager-page h-full w-full shrink-0 snap-start">
          <SettingsPage />
        </section>
      </div>
      <BottomBar page={page} onPage={goToPage} onNewNote={() => void createNote()} />

      {trashOpen && <TrashScreen onClose={() => setTrashOpen(false)} />}
      {note && openNote && (
        <NoteScreen
          key={`${note.id}:${remoteRevisions[note.id] ?? 0}`}
          note={note}
          editing={openNote.editing}
          onEditingChange={(editing) => setOpenNote({ id: note.id, editing })}
          onClose={closeNote}
          onActions={() => setActionsFor(note.id)}
        />
      )}
      {actionsNote && (
        <NoteActionsSheet
          note={actionsNote}
          onClose={() => setActionsFor(null)}
          onTrashed={() => {
            if (openNote?.id === actionsNote.id) setOpenNote(null)
          }}
        />
      )}
    </div>
  )
}
