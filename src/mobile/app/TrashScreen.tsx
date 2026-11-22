import { t } from '@shared/i18n'
import { TRASH_TTL_MS } from '@shared/trash'
import { noteColorToCss } from '@shared/colorPalette'
import { useNotesStore } from '@renderer/state/useNotesStore'
import { IconArrowLeft, IconTrash } from '../icons'

/** Trashed notes, restorable for 30 days (desktop dock's trash view, full screen). */
export function TrashScreen({ onClose }: { onClose: () => void }): React.JSX.Element {
  const trash = useNotesStore((s) => s.trash)

  const expiry = (deletedAt: number): string => {
    const days = Math.max(0, Math.ceil((deletedAt + TRASH_TTL_MS - Date.now()) / 86_400_000))
    return days === 0 ? t('trash.expires.today') : t('trash.expires.days', { count: days })
  }

  return (
    <div className="safe-top fixed inset-0 z-30 flex flex-col bg-m-bg">
      <div className="flex items-center gap-3 px-4 pt-2 pb-3">
        <button type="button" aria-label={t('mobile.back')} className="glass-button" onClick={onClose}>
          <IconArrowLeft />
        </button>
        <h1 className="flex-1 text-[22px] font-extrabold">{t('trash.title')}</h1>
        {trash.length > 0 && (
          <button
            type="button"
            aria-label={t('trash.empty')}
            onClick={() => void window.aeronotes.emptyTrash()}
            className="glass-button text-m-danger"
          >
            <IconTrash />
          </button>
        )}
      </div>
      <div className="safe-bottom no-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-6">
        {trash.length === 0 && <p className="pt-16 text-center text-sm text-m-muted">{t('trash.isEmpty')}</p>}
        {trash.map((note) => (
          <div key={note.id} className="rounded-[20px] p-3.5 text-m-ink" style={{ background: noteColorToCss(note.color) }}>
            <p className="truncate font-bold">{note.title || t('note.untitled')}</p>
            {note.contentPreview && <p className="mt-1 line-clamp-2 text-[13px] text-m-ink/65">{note.contentPreview}</p>}
            <div className="mt-3 flex items-center gap-2 text-xs font-medium">
              <span className="flex-1 text-m-ink/60">{expiry(note.deletedAt ?? Date.now())}</span>
              <button type="button" onClick={() => void window.aeronotes.purgeNote(note.id)} className="rounded-full px-3 py-2 text-red-700">
                {t('trash.purge')}
              </button>
              <button type="button" onClick={() => window.aeronotes.restoreNote(note.id)} className="rounded-full bg-m-ink px-3 py-2 text-white">
                {t('trash.restore')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
