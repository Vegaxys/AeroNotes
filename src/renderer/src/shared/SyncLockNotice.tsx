import { t } from '@shared/i18n'

/** Small pill telling why the notes ignore input while the startup sync runs. */
export function SyncLockNotice({ className = '' }: { className?: string }): React.JSX.Element {
  return (
    <div
      role="status"
      className={`pointer-events-none rounded-full border border-white/15 bg-neutral-900/90 px-3 py-1.5 text-xs text-white/85 shadow-lg ${className}`}
    >
      {t('sync.editingLocked')}
    </div>
  )
}
