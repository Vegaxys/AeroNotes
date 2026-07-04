import { useNotesStore } from '@renderer/state/useNotesStore'

export function DockSearchInput(): React.JSX.Element {
  const searchQuery = useNotesStore((s) => s.searchQuery)
  const setSearchQuery = useNotesStore((s) => s.setSearchQuery)

  return (
    <input
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder="Rechercher une note..."
      className="h-8 min-w-0 flex-1 rounded-[var(--radius-sm)] border border-white/15 bg-white/10 px-3 text-sm text-white placeholder-white/50 outline-none focus:border-white/30"
    />
  )
}
