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
      // The window must be activated before the caret shows, so the focus ring
      // is the immediate feedback that the click landed.
      className="h-full min-w-0 flex-1 rounded bg-transparent px-1.5 text-sm text-white caret-white placeholder-white/40 outline-none focus:bg-white/5"
    />
  )
}
