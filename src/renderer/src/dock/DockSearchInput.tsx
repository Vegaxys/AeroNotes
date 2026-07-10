import { useNotesStore } from '@renderer/state/useNotesStore'

interface DockSearchInputProps {
  placeholder: string
}

/** Borderless: it lives inside the DockHeader bar, which carries the chrome. */
export function DockSearchInput({ placeholder }: DockSearchInputProps): React.JSX.Element {
  const searchQuery = useNotesStore((s) => s.searchQuery)
  const setSearchQuery = useNotesStore((s) => s.setSearchQuery)

  return (
    <input
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder={placeholder}
      spellCheck={false}
      className="h-full min-w-0 flex-1 bg-transparent px-1.5 text-sm text-white placeholder-white/40 outline-none"
    />
  )
}
