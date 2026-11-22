import { createPortal } from 'react-dom'
interface BottomSheetProps {
  onClose: () => void
  children: React.ReactNode
  /** Accessible name of the dialog. */
  label: string
}

/**
 * Sheet sliding over a dimmed screen (Figma board 07); tapping the dim closes
 * it. Portalled to <body>: the swipe pages are transformed while they move,
 * and a transformed ancestor would trap `position: fixed` inside the page.
 */
export function BottomSheet({ onClose, children, label }: BottomSheetProps): React.JSX.Element {
  return createPortal(
    <div className="fixed inset-0 z-40 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={label}>
      <button type="button" aria-label={label} className="anim-fade-in absolute inset-0 bg-black/55" onClick={onClose} />
      <div className="anim-sheet-in safe-bottom relative max-h-[85%] overflow-y-auto rounded-t-[28px] bg-m-surface px-4 pt-2.5 pb-4">
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-m-muted/60" />
        {children}
      </div>
    </div>,
    document.body
  )
}

interface SheetRowProps {
  icon: React.ReactNode
  label: string
  value?: string
  danger?: boolean
  onPress: () => void
}

/** One 52 dp action line of a sheet. */
export function SheetRow({ icon, label, value, danger, onPress }: SheetRowProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onPress}
      className={`press flex h-[52px] w-full items-center gap-4 rounded-2xl px-2 text-left text-base active:bg-white/5 ${
        danger ? 'text-m-danger' : 'text-m-text'
      }`}
    >
      <span className={danger ? 'text-m-danger' : 'text-m-muted'}>{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {value && <span className="text-sm text-m-muted">{value}</span>}
    </button>
  )
}
