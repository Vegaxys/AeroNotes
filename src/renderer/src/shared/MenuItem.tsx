/**
 * One row of the dock's dark popover menus (dock menu, sort menu, note
 * context menu). Shared so the three keep identical padding and hover.
 */
export function MenuItem({
  onClick,
  danger,
  children
}: {
  onClick: () => void
  danger?: boolean
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left hover:bg-white/10 ${
        danger ? 'text-red-400' : ''
      }`}
    >
      {children}
    </button>
  )
}

/** Shared shell of those popovers: dark card, thin border, high z-index. */
export function MenuPanel({
  children,
  className = ''
}: {
  children: React.ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <div
      data-mouse-live=""
      className={`rounded-[var(--radius-md)] border border-white/15 bg-neutral-900/95 p-1 text-xs text-white/85 shadow-2xl ${className}`}
    >
      {children}
    </div>
  )
}
