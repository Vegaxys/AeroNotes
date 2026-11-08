import { t } from '@shared/i18n'
import { useSettingsStore } from '@renderer/state/useSettingsStore'

export function DockCollapseTab(): React.JSX.Element {
  const dockSide = useSettingsStore((s) => s.dockSide)
  const dockCollapsed = useSettingsStore((s) => s.dockCollapsed)
  const toggleDockCollapsed = useSettingsStore((s) => s.toggleDockCollapsed)

  const innerEdge = dockSide === 'right' ? 'left' : 'right'

  return (
    <button
      onClick={toggleDockCollapsed}
      // Always a live region: when the dock is collapsed this button is the
      // only part of the overlay that should capture the mouse.
      data-mouse-live=""
      // The button stays 16px wide as a comfortable hit target; only the thin
      // pill inside it is visible (see below).
      className="group absolute top-1/2 flex h-45 w-4 -translate-y-1/2 items-center justify-center"
      style={{
        // Offsets are for the 16px hit box, so the visible pill sits 5px
        // further in. Collapsed: hug the screen edge to stay out of the way
        // (pill ~4px from it). Expanded: just inside the dock's inner edge, so
        // nothing can clip it and it stays clear of the list's scrollbar.
        [innerEdge]: dockCollapsed ? 13 : -2,
        transition: `${innerEdge} 0.2s ease-out`
      }}
      // No `title`: the native tooltip is a window of its own, and one popping
      // up while a drag crosses the tab (from one screen to another) steals
      // that drag.
      aria-label={dockCollapsed ? t('dock.expand') : t('dock.collapse')}
    >
      {/* Plain solid pill — no icon, no border — sized like a browser
       * scrollbar thumb so it reads as a grab handle rather than a button. */}
      <span className="h-full w-1.5 rounded-full bg-white/40 transition-colors duration-150 group-hover:bg-white/65" />
    </button>
  )
}
