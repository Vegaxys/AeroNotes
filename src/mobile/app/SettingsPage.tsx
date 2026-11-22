import { useEffect, useState } from 'react'
import type { NoteSortMode, SyncStatus } from '@shared/types'
import type { LocalePreference } from '@shared/i18n'
import { getLocale, t } from '@shared/i18n'
import { useSettingsStore } from '@renderer/state/useSettingsStore'
import { useSyncStatus } from '@renderer/state/useSyncStatus'
import { IconChevronRight, IconCloud, IconRefresh, IconSettings, IconSliders } from '../icons'
import { BottomSheet, SheetRow } from './BottomSheet'

const SORT_MODES: NoteSortMode[] = ['manual', 'created', 'updated', 'name']
const LOCALES: { value: LocalePreference; label: () => string }[] = [
  { value: 'system', label: () => t('settings.language.system') },
  { value: 'fr', label: () => 'Français' },
  { value: 'en', label: () => 'English' }
]

function syncLine(status: SyncStatus): string {
  if (status.state === 'syncing') return t('settings.syncing')
  if (status.state === 'error') return `${t('settings.syncError')} — ${status.error ?? ''}`
  if (!status.lastSyncAt) return t('settings.syncNever')
  const time = new Date(status.lastSyncAt).toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' })
  return t('settings.lastSync', { time })
}

/** Right page (Figma board 03): Google account and sync, list defaults, language. */
export function SettingsPage(): React.JSX.Element {
  const status = useSyncStatus()
  const sortMode = useSettingsStore((s) => s.sortMode)
  const setSortMode = useSettingsStore((s) => s.setSortMode)
  const locale = useSettingsStore((s) => s.locale)
  const [sheet, setSheet] = useState<'sort' | 'language' | null>(null)
  const [version, setVersion] = useState('')
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    void window.aeronotes.getAppVersion().then((v) => setVersion(v ?? ''))
  }, [])

  const signedIn = status.state === 'idle' || status.state === 'syncing' || (status.state === 'error' && Boolean(status.email))

  const row = (icon: React.ReactNode, label: string, value: string, onPress: () => void): React.JSX.Element => (
    <button type="button" onClick={onPress} className="flex h-14 w-full items-center gap-3.5 pr-3 pl-4 text-left">
      <span className="text-m-muted">{icon}</span>
      <span className="flex-1 text-[15px]">{label}</span>
      <span className="text-sm text-m-muted">{value}</span>
      <IconChevronRight width={20} height={20} className="text-m-muted" />
    </button>
  )

  return (
    <div className="no-scrollbar flex h-full flex-col gap-2.5 overflow-y-auto px-4 pt-2 pb-36">
      <div className="mb-2">
        <h1 className="text-[26px] font-bold">{t('settings.title')}</h1>
        {version && <p className="text-[13px] text-m-muted">AeroNotes {version}</p>}
      </div>

      <section className="flex flex-col gap-3.5 rounded-[20px] bg-m-surface p-4">
        {status.state === 'unconfigured' ? (
          <p className="text-sm text-m-muted">{t('settings.syncNotConfigured')}</p>
        ) : signedIn ? (
          <>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/20 text-lg font-bold text-accent">
                {(status.email ?? '?').charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block text-base font-medium">{t('settings.account')}</span>
                <span className="block truncate text-[13px] text-m-muted">{status.email}</span>
              </span>
            </div>
            <div className="flex items-center gap-2.5 rounded-[14px] bg-m-raised py-1.5 pr-1.5 pl-3">
              <IconCloud width={20} height={20} className={status.state === 'error' ? 'text-m-danger' : 'text-accent'} />
              <span className="min-w-0 flex-1 text-sm break-words">{syncLine(status)}</span>
              <button
                type="button"
                aria-label={t('settings.syncNow')}
                onClick={() => window.aeronotes.syncNow()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              >
                <IconRefresh width={20} height={20} className={status.state === 'syncing' ? 'animate-spin' : ''} />
              </button>
            </div>
            <button type="button" onClick={() => void window.aeronotes.syncSignOut()} className="self-start text-sm font-medium text-m-danger">
              {t('settings.signOut')}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-m-muted">{t('mobile.signInHint')}</p>
            {status.state === 'error' && <p className="text-sm text-m-danger">{status.error}</p>}
            <button
              type="button"
              disabled={signingIn}
              onClick={() => {
                setSigningIn(true)
                void window.aeronotes.syncSignIn().finally(() => setSigningIn(false))
              }}
              className="h-12 rounded-full bg-accent font-medium text-m-ink disabled:opacity-60"
            >
              {t('settings.signInGoogle')}
            </button>
          </>
        )}
      </section>

      <p className="mt-2 px-1 text-[13px] font-medium text-m-muted">{t('mobile.section.notes')}</p>
      <section className="rounded-[20px] bg-m-surface">
        {row(<IconSliders />, t('dock.sort'), t(`dock.sort.${sortMode}`), () => setSheet('sort'))}
      </section>

      <p className="mt-2 px-1 text-[13px] font-medium text-m-muted">{t('mobile.section.app')}</p>
      <section className="rounded-[20px] bg-m-surface">
        {row(<IconSettings />, t('settings.language'), LOCALES.find((l) => l.value === locale)?.label() ?? '', () => setSheet('language'))}
      </section>

      {sheet === 'sort' && (
        <BottomSheet label={t('dock.sort')} onClose={() => setSheet(null)}>
          <p className="px-2 pb-2 text-lg font-bold">{t('dock.sort')}</p>
          {SORT_MODES.map((mode) => (
            <SheetRow
              key={mode}
              icon={<span className={`block h-2.5 w-2.5 rounded-full ${mode === sortMode ? 'bg-accent' : 'bg-transparent'}`} />}
              label={t(`dock.sort.${mode}`)}
              onPress={() => {
                setSortMode(mode)
                setSheet(null)
              }}
            />
          ))}
        </BottomSheet>
      )}
      {sheet === 'language' && (
        <BottomSheet label={t('settings.language')} onClose={() => setSheet(null)}>
          <p className="px-2 pb-2 text-lg font-bold">{t('settings.language')}</p>
          {LOCALES.map((option) => (
            <SheetRow
              key={option.value}
              icon={<span className={`block h-2.5 w-2.5 rounded-full ${option.value === locale ? 'bg-accent' : 'bg-transparent'}`} />}
              label={option.label()}
              onPress={() => {
                window.aeronotes.setSettings({ locale: option.value })
                setSheet(null)
              }}
            />
          ))}
        </BottomSheet>
      )}
    </div>
  )
}
