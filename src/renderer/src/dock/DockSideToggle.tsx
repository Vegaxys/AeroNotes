import { useSettingsStore } from '@renderer/state/useSettingsStore'

export function DockSideToggle(): React.JSX.Element {
  const toggleDockSide = useSettingsStore((s) => s.toggleDockSide)

  return (
    <button
      onClick={toggleDockSide}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-white/70 hover:bg-white/15 hover:text-white"
      aria-label="Changer le cote du dock"
      title="Passer le dock a gauche ou a droite"
    >
      ⇄
    </button>
  )
}
