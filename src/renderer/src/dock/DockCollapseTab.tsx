import { useSettingsStore } from '@renderer/state/useSettingsStore'

export function DockCollapseTab(): React.JSX.Element {
  const dockSide = useSettingsStore((s) => s.dockSide)
  const dockCollapsed = useSettingsStore((s) => s.dockCollapsed)
  const toggleDockCollapsed = useSettingsStore((s) => s.toggleDockCollapsed)

  const innerEdge = dockSide === 'right' ? 'left' : 'right'
  const arrowTowardCenter = dockSide === 'right' ? '‹' : '›'
  const arrowTowardEdge = dockSide === 'right' ? '›' : '‹'

  return (
    <button
      onClick={toggleDockCollapsed}
      className="absolute top-1/2 flex h-12 w-6 -translate-y-1/2 items-center justify-center rounded-[var(--radius-sm)] text-white/70 hover:text-white"
      style={{
        [innerEdge]: -12,
        background: 'var(--color-glass-strong)',
        border: '1px solid var(--color-glass-border)'
      }}
      aria-label={dockCollapsed ? 'Deplier le dock' : 'Replier le dock'}
      title={dockCollapsed ? 'Deplier le dock' : 'Replier le dock'}
    >
      {dockCollapsed ? arrowTowardCenter : arrowTowardEdge}
    </button>
  )
}
