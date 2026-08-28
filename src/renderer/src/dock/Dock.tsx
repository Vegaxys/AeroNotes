import { useDockAutoHide } from '@renderer/overlay/hooks/useDockAutoHide'
import { useNotesStore } from '@renderer/state/useNotesStore'
import { useSettingsStore } from '@renderer/state/useSettingsStore'
import { DockCollapseTab } from './DockCollapseTab'
import { DockFolderList } from './DockFolderList'
import { DockHeader } from './DockHeader'
import { DockNoteList } from './DockNoteList'
import { DockTrashList } from './DockTrashList'

/** Half-height of the gradient halo shown around the collapse tab while collapsed. */
const COLLAPSED_GLOW_HALF_HEIGHT_PX = 130

export function Dock(): React.JSX.Element {
  const dockSide = useSettingsStore((s) => s.dockSide)
  const dockCollapsed = useSettingsStore((s) => s.dockCollapsed)
  const dockExpandedWidth = useSettingsStore((s) => s.dockExpandedWidth)
  const currentFolderId = useNotesStore((s) => s.currentFolderId)
  const trashView = useNotesStore((s) => s.trashView)
  const autoHidden = useDockAutoHide()

  // Auto-hidden: no strip at all (taskbar behaviour), and nothing interactive
  // either — the edge that reveals it is watched globally, not by this element.
  const width = autoHidden ? 0 : dockCollapsed ? 28 : dockExpandedWidth
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
      data-mouse-live={dockCollapsed || autoHidden ? undefined : ''}
      data-dock-root
      // select-none: the dock chrome must not be text-selectable (dragging a
      // selection ghosts the app); .note-editor opts back in for note content.
      // No overflow-hidden here: the collapse tab pokes out past this box on
      // purpose. Auto-hidden, the children simply aren't rendered.
      className="fixed top-0 bottom-0 flex select-none flex-col transition-[width] duration-200 ease-out"
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
      {!dockCollapsed && !autoHidden && (
        <>
          <DockHeader />
          {trashView ? (
            <DockTrashList />
          ) : currentFolderId !== null ? (
            <DockNoteList />
          ) : (
            <DockFolderList />
          )}
        </>
      )}
      {!autoHidden && <DockCollapseTab />}
    </div>
  )
}
