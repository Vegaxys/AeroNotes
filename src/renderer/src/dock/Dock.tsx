import { useSettingsStore } from '@renderer/state/useSettingsStore'
import { DockCollapseTab } from './DockCollapseTab'
import { DockHeader } from './DockHeader'
import { DockNoteList } from './DockNoteList'

interface DockProps {
  ref?: React.Ref<HTMLDivElement>
}

export function Dock({ ref }: DockProps): React.JSX.Element {
  const dockSide = useSettingsStore((s) => s.dockSide)
  const dockCollapsed = useSettingsStore((s) => s.dockCollapsed)
  const dockExpandedWidth = useSettingsStore((s) => s.dockExpandedWidth)

  const width = dockCollapsed ? 28 : dockExpandedWidth
  // Fades from the screen edge (dark) toward the collapse-tab side (transparent).
  const gradientDirection = dockSide === 'right' ? 'to left' : 'to right'

  return (
    <div
      ref={ref}
      data-dock-root
      className="fixed top-0 bottom-0 flex flex-col transition-[width] duration-200 ease-out"
      style={{
        [dockSide]: 0,
        width,
        background: `linear-gradient(${gradientDirection}, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0))`
      }}
    >
      {!dockCollapsed && (
        <>
          <DockHeader />
          <DockNoteList />
        </>
      )}
      <DockCollapseTab />
    </div>
  )
}
