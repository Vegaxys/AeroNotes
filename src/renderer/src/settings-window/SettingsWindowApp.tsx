import { useEffect, useState, type CSSProperties } from 'react'
import type { AppSettings } from '@shared/types'
import { resolveLocale, setLocale, t, type LocalePreference } from '@shared/i18n'

/** `WebkitAppRegion` drives native window dragging in Electron but isn't in DOM's CSSProperties. */
const dragRegion = { WebkitAppRegion: 'drag' } as unknown as CSSProperties
const noDragRegion = { WebkitAppRegion: 'no-drag' } as unknown as CSSProperties

function globalShortcuts(): Array<[string, string]> {
  return [['Ctrl+Shift+N', t('settings.shortcut.toggleDock')]]
}

function markdownShortcuts(): Array<[string, string]> {
  const space = t('settings.key.space')
  return [
    [`# ${space}`, t('settings.shortcut.heading1')],
    [`## ${space}`, t('settings.shortcut.heading2')],
    [`### ${space}`, t('settings.shortcut.heading3')],
    ['**text**', t('settings.shortcut.bold')],
    ['*text*', t('settings.shortcut.italic')],
    ['~~text~~', t('settings.shortcut.strike')],
    ['`code`', t('settings.shortcut.code')],
    [`- ${space}`, t('settings.shortcut.bulletList')],
    [`1. ${space}`, t('settings.shortcut.numberedList')],
    [`a. ${space}`, t('settings.shortcut.alphaList')],
    [`[] ${space}`, t('settings.shortcut.checklist')],
    [`> ${space}`, t('settings.shortcut.quote')],
    ['---', t('settings.shortcut.divider')],
    ['/', t('settings.shortcut.commandMenu')]
  ]
}

function ShortcutTable({ rows }: { rows: Array<[string, string]> }): React.JSX.Element {
  return (
    <div className="overflow-hidden rounded-[var(--radius-sm)] border border-white/10">
      {rows.map(([keys, label], index) => (
        <div
          key={keys}
          className={`flex items-center justify-between gap-3 px-3 py-1.5 text-xs ${
            index % 2 === 0 ? 'bg-white/[0.03]' : ''
          }`}
        >
          <span className="text-white/70">{label}</span>
          <kbd className="shrink-0 rounded border border-white/15 bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-white/85">
            {keys}
          </kbd>
        </div>
      ))}
    </div>
  )
}

export function SettingsWindowApp(): React.JSX.Element | null {
  const [settings, setSettings] = useState<AppSettings | null>(null)

  useEffect(() => {
    // setLocale before setState so the re-render reads the new dictionary.
    const applySettings = (next: AppSettings): void => {
      setLocale(resolveLocale(next.locale ?? 'system', [navigator.language]))
      setSettings(next)
    }
    void window.aeronotes.getSettings().then(applySettings)
    return window.aeronotes.onSettingsChanged(applySettings)
  }, [])

  if (!settings) return null

  const toggleLaunchAtStartup = (): void => {
    window.aeronotes.setSettings({ launchAtStartup: !settings.launchAtStartup })
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-neutral-900 text-white">
      <div
        className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3"
        style={dragRegion}
      >
        <span className="text-sm font-semibold">{t('settings.title')}</span>
        <button
          onClick={() => window.close()}
          style={noDragRegion}
          className="flex h-6 w-6 items-center justify-center rounded-full text-sm text-white/50 hover:bg-white/10 hover:text-white"
          aria-label={t('settings.close')}
        >
          ✕
        </button>
      </div>

      <div className="dock-scroll flex-1 space-y-6 overflow-y-auto p-4">
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-white/40">
            {t('settings.general')}
          </h2>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-white/10 px-3 py-2.5 text-sm hover:bg-white/[0.04]">
            <span>{t('settings.launchAtStartup')}</span>
            <input
              type="checkbox"
              checked={Boolean(settings.launchAtStartup)}
              onChange={toggleLaunchAtStartup}
              className="h-4 w-4 shrink-0 accent-[var(--color-accent)]"
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-white/10 px-3 py-2.5 text-sm hover:bg-white/[0.04]">
            <span>{t('settings.language')}</span>
            <select
              value={settings.locale ?? 'system'}
              onChange={(e) =>
                window.aeronotes.setSettings({ locale: e.target.value as LocalePreference })
              }
              className="shrink-0 rounded border border-white/15 bg-neutral-800 px-2 py-1 text-xs text-white outline-none focus:border-white/30"
            >
              <option value="system">{t('settings.language.system')}</option>
              {/* Language names always shown in their own language. */}
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </label>
        </section>

        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-white/40">
            {t('settings.globalShortcuts')}
          </h2>
          <ShortcutTable rows={globalShortcuts()} />
        </section>

        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-white/40">
            {t('settings.markdownShortcuts')}
          </h2>
          <ShortcutTable rows={markdownShortcuts()} />
        </section>
      </div>
    </div>
  )
}
