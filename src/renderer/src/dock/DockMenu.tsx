import { useEffect, useRef, useState } from 'react'
import { t } from '@shared/i18n'
import { useSettingsStore } from '@renderer/state/useSettingsStore'

function MenuItem({
  onClick,
  children
}: {
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left hover:bg-white/10"
    >
      {children}
    </button>
  )
}

/**
 * Dock menu button (replaces the bare side-switch button): swap side, the
 * expand-notes toggle, plus the same app actions as the tray menu.
 */
export function DockMenu(): React.JSX.Element {
  const toggleDockSide = useSettingsStore((s) => s.toggleDockSide)
  const notesExpanded = useSettingsStore((s) => s.notesExpanded)
  const toggleNotesExpanded = useSettingsStore((s) => s.toggleNotesExpanded)
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
        <div
          data-mouse-live=""
          className="absolute right-0 top-full z-30 mt-2 w-52 rounded-[var(--radius-md)] border border-white/15 bg-neutral-900/95 p-1 text-xs text-white/85 shadow-2xl"
        >
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
        </div>
      )}
    </div>
  )
}
