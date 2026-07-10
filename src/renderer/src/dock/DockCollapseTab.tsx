import { t } from '@shared/i18n'
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
      // Always a live region: when the dock is collapsed this button is the
      // only part of the overlay that should capture the mouse.
      data-mouse-live=""
      className="absolute top-1/2 flex h-45 w-4 -translate-y-1/2 items-center justify-center rounded-[var(--radius-sm)] text-white/70 hover:text-white"
      style={{
        // Collapsed: hug the screen edge to stay out of the way (2px gap).
        // Expanded: straddle the dock's inner edge, half outside.
        [innerEdge]: dockCollapsed ? 10 : -8,
        background: 'var(--color-glass-strong)',
        border: '1px solid var(--color-glass-border)',
        transition: `${innerEdge} 0.2s ease-out`
      }}
      aria-label={dockCollapsed ? t('dock.expand') : t('dock.collapse')}
      title={dockCollapsed ? t('dock.expand') : t('dock.collapse')}
    >
      {dockCollapsed ? arrowTowardCenter : arrowTowardEdge}
    </button>
  )
}
