import { useNotesStore } from '@renderer/state/useNotesStore'
import { useSettingsStore } from '@renderer/state/useSettingsStore'
import { DockCollapseTab } from './DockCollapseTab'
import { DockFolderList } from './DockFolderList'
import { DockHeader } from './DockHeader'
import { DockNoteList } from './DockNoteList'

/** Half-height of the gradient halo shown around the collapse tab while collapsed. */
const COLLAPSED_GLOW_HALF_HEIGHT_PX = 130

export function Dock(): React.JSX.Element {
  const dockSide = useSettingsStore((s) => s.dockSide)
  const dockCollapsed = useSettingsStore((s) => s.dockCollapsed)
  const dockExpandedWidth = useSettingsStore((s) => s.dockExpandedWidth)
  const currentFolderId = useNotesStore((s) => s.currentFolderId)

  const width = dockCollapsed ? 28 : dockExpandedWidth
  // Fades from the screen edge (dark) toward the collapse-tab side (transparent).
  // Collapsed, the fade ends at 50% of the (28px) strip so no gradient tints
  // the collapse button, which sits astride the strip's inner edge.
  const gradientDirection = dockSide === 'right' ? 'to left' : 'to right'
  const gradientEnd = dockCollapsed ? 'rgba(0, 0, 0, 0) 50%' : 'rgba(0, 0, 0, 0)'

  return (
    <div
      // The root is only a live (click-capturing) region while expanded; when
      // collapsed, only the collapse tab stays interactive so the gradient
      // strip doesn't block clicks on whatever is behind the overlay.
      data-mouse-live={dockCollapsed ? undefined : ''}
      data-dock-root
      className="fixed top-0 bottom-0 flex flex-col transition-[width] duration-200 ease-out"
      style={{ [dockSide]: 0, width }}
    >
      <div
        aria-hidden
        className="dock-gradient pointer-events-none absolute inset-x-0 -z-10"
        style={{
          background: `linear-gradient(${gradientDirection}, rgba(0, 0, 0, 0.6), ${gradientEnd})`,
          // Collapsed: a soft halo vertically centered on the collapse tab.
          // Expanded: the full-height strip. Both edges are calc() lengths so
          // the expansion animates smoothly between the two states.
          top: dockCollapsed ? `calc(50% - ${COLLAPSED_GLOW_HALF_HEIGHT_PX}px)` : '0px',
          bottom: dockCollapsed ? `calc(50% - ${COLLAPSED_GLOW_HALF_HEIGHT_PX}px)` : '0px',
          ['--dock-fade' as string]: dockCollapsed ? '110px' : '0px'
        }}
      />
      {!dockCollapsed && (
        <>
          <DockHeader />
          {currentFolderId !== null ? <DockNoteList /> : <DockFolderList />}
        </>
      )}
      <DockCollapseTab />
    </div>
  )
}
