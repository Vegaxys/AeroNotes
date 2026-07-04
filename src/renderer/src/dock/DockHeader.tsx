import { useNotesStore } from '@renderer/state/useNotesStore'
import { DockSearchInput } from './DockSearchInput'
import { DockSideToggle } from './DockSideToggle'

export function DockHeader(): React.JSX.Element {
  const addNote = useNotesStore((s) => s.addNote)

  return (
    <div className="flex items-center gap-2 border-b border-white/10 p-3">
      <DockSearchInput />
      <button
        onClick={addNote}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-lg font-medium text-white hover:brightness-110"
        style={{ background: 'var(--color-accent)' }}
        aria-label="Ajouter une note"
        title="Ajouter une note"
      >
        +
      </button>
      <DockSideToggle />
    </div>
  )
}
