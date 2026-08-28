import { useEffect, useRef, useState } from 'react'
import { t } from '@shared/i18n'
import { useNotesStore } from '@renderer/state/useNotesStore'
import { useSettingsStore } from '@renderer/state/useSettingsStore'
import { MenuItem, MenuPanel } from '@renderer/shared/MenuItem'

/**
 * Dock menu button (replaces the bare side-switch button): swap side, the
 * expand-notes toggle, plus the same app actions as the tray menu.
 */
export function DockMenu(): React.JSX.Element {
  const toggleDockSide = useSettingsStore((s) => s.toggleDockSide)
  const notesExpanded = useSettingsStore((s) => s.notesExpanded)
  const toggleNotesExpanded = useSettingsStore((s) => s.toggleNotesExpanded)
  const trashCount = useNotesStore((s) => s.trash.length)
  const setTrashView = useNotesStore((s) => s.setTrashView)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: PointerEvent): void {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        onClick={() => setOpen((isOpen) => !isOpen)}
        className={`flex h-7 w-7 items-center justify-center text-white/70 hover:text-white ${
          open ? 'text-white' : ''
        }`}
        aria-label={t('menu.open')}
        title={t('menu.open')}
      >
        ⋯
      </button>
      {open && (
        <MenuPanel className="absolute right-0 top-full z-30 mt-2 w-52">
          <MenuItem
            onClick={() => {
              toggleDockSide()
              setOpen(false)
            }}
          >
            <span>⇄ {t('menu.swapSide')}</span>
          </MenuItem>
          <MenuItem onClick={toggleNotesExpanded}>
            <span>{t('menu.expandNotes')}</span>
            <span className="text-white/60">{notesExpanded ? '✓' : ''}</span>
          </MenuItem>
          <div className="my-1 h-px bg-white/10" />
          <MenuItem
            onClick={() => {
              setTrashView(true)
              setOpen(false)
            }}
          >
            <span>🗑 {t('trash.open', { count: trashCount })}</span>
          </MenuItem>
          <div className="my-1 h-px bg-white/10" />
          <MenuItem
            onClick={() => {
              setOpen(false)
              window.aeronotes.hideOverlay()
            }}
          >
            <span>{t('menu.hideDock')}</span>
          </MenuItem>
          <MenuItem
            onClick={() => {
              setOpen(false)
              window.aeronotes.openSettingsWindow()
            }}
          >
            <span>{t('tray.settings')}</span>
          </MenuItem>
          <MenuItem onClick={() => window.aeronotes.quitApp()}>
            <span>{t('tray.quit')}</span>
          </MenuItem>
        </MenuPanel>
      )}
    </div>
  )
}
