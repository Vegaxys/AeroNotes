import type { JSONContent } from '@tiptap/core'
import { BUILTIN_TEMPLATES } from '@shared/builtinTemplates'
import { t } from '@shared/i18n'
import { useNotesStore } from '@renderer/state/useNotesStore'
import { useSettingsStore } from '@renderer/state/useSettingsStore'

interface TemplateCarouselProps {
  onApply: (content: JSONContent) => void
}

function Pill({
  onClick,
  title,
  children
}: {
  onClick: () => void
  title?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      title={title}
      className="shrink-0 whitespace-nowrap rounded-full bg-black/15 px-3 py-1 text-xs text-black/70 hover:bg-black/30"
    >
      {children}
    </button>
  )
}

/**
 * Template pills shown at the bottom of an empty note. Picking one replaces
 * the (empty) content; the note's colors are untouched. The ⋯ pill opens the
 * settings window on template management.
 */
export function TemplateCarousel({ onApply }: TemplateCarouselProps): React.JSX.Element {
  const userTemplates = useNotesStore((s) => s.templates)
  const disabledBuiltins = useSettingsStore((s) => s.disabledBuiltinTemplates)

  const builtins = BUILTIN_TEMPLATES.filter((tpl) => !disabledBuiltins.includes(tpl.id))

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-center px-2">
      <div
        data-mouse-live=""
        className="dock-scroll pointer-events-auto flex max-w-full items-center gap-1.5 overflow-x-auto rounded-full p-1.5"
      >
        {builtins.map((template) => (
          <Pill key={template.id} onClick={() => onApply(template.content())}>
            {template.name()}
          </Pill>
        ))}
        {userTemplates.map((template) => (
          <Pill key={template.id} onClick={() => onApply(template.content)}>
            {template.name}
          </Pill>
        ))}
        <Pill onClick={() => window.aeronotes.openSettingsWindow()} title={t('template.settingsPill')}>
          ⋯
        </Pill>
      </div>
    </div>
  )
}
