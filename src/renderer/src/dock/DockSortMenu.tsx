import { useEffect, useRef, useState } from 'react'
import type { NoteSortMode } from '@shared/types'
import { t } from '@shared/i18n'
import { useSettingsStore } from '@renderer/state/useSettingsStore'
import { MenuItem, MenuPanel } from '@renderer/shared/MenuItem'

/** Labels resolve through t() at render time, so they follow a locale switch. */
const SORT_OPTIONS: Array<{ mode: NoteSortMode; label: () => string }> = [
  { mode: 'manual', label: () => t('dock.sort.manual') },
  { mode: 'created', label: () => t('dock.sort.created') },
  { mode: 'updated', label: () => t('dock.sort.updated') },
  { mode: 'name', label: () => t('dock.sort.name') }
]

/** Sort picker for the note list. Dragging a note switches back to 'manual'. */
export function DockSortMenu(): React.JSX.Element {
  const sortMode = useSettingsStore((s) => s.sortMode)
  const setSortMode = useSettingsStore((s) => s.setSortMode)
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
        className={`flex h-7 w-7 items-center justify-center text-sm text-white/70 hover:text-white ${
          open ? 'text-white' : ''
        }`}
        aria-label={t('dock.sort')}
        title={t('dock.sort')}
      >
        ↕
      </button>
      {open && (
        <MenuPanel className="absolute right-0 top-full z-30 mt-2 w-44">
          {SORT_OPTIONS.map((option) => (
            <MenuItem
              key={option.mode}
              onClick={() => {
                setSortMode(option.mode)
                setOpen(false)
              }}
            >
              <span>{option.label()}</span>
              <span className="text-white/60">{sortMode === option.mode ? '✓' : ''}</span>
            </MenuItem>
          ))}
        </MenuPanel>
      )}
    </div>
  )
}
