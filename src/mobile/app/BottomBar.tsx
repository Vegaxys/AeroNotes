import { t } from '@shared/i18n'
import { IconFolderOpen, IconPlus, IconSettings } from '../icons'

/** The three swipe pages, left to right. */
export type Page = 'folders' | 'notes' | 'settings'

interface BottomBarProps {
  page: Page
  onPage: (page: Page) => void
  onNewNote: () => void
}

/**
 * Floating bar shared by the three pages (Figma « bottom-bar »): the side
 * buttons reach the pages without swiping, the centre one always writes a
 * new note in the current folder.
 */
export function BottomBar({ page, onPage, onNewNote }: BottomBarProps): React.JSX.Element {
  const side = (target: Page, icon: React.ReactNode, label: string): React.JSX.Element => (
    <button
      type="button"
      aria-label={label}
      aria-current={page === target ? 'page' : undefined}
      onClick={() => onPage(page === target ? 'notes' : target)}
      className={`press flex h-12 w-12 items-center justify-center rounded-full ${
        page === target ? 'bg-accent/20 text-accent' : 'text-m-muted'
      }`}
    >
      {icon}
    </button>
  )

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center bg-gradient-to-t from-m-bg from-40% to-transparent pt-10">
      <div className="safe-bottom">
        <div className="pointer-events-auto mb-3 flex items-center gap-5 rounded-full border border-m-border bg-m-glass px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
          {side('folders', <IconFolderOpen />, t('mobile.folders'))}
          <button
            type="button"
            aria-label={t('dock.addNote')}
            onClick={onNewNote}
            className="press flex h-14 w-14 items-center justify-center rounded-full bg-accent text-m-ink"
          >
            <IconPlus width={28} height={28} />
          </button>
          {side('settings', <IconSettings />, t('settings.title'))}
        </div>
      </div>
    </div>
  )
}
