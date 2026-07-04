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

  return (
    <div
      ref={ref}
      className="fixed top-4 bottom-4 flex flex-col overflow-hidden rounded-[var(--radius-lg)] border shadow-2xl transition-[width] duration-200 ease-out"
      style={{
        [dockSide]: 16,
        width,
        background: 'var(--color-glass)',
        borderColor: 'var(--color-glass-border)',
        backdropFilter: 'blur(var(--blur-glass))',
        WebkitBackdropFilter: 'blur(var(--blur-glass))'
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
