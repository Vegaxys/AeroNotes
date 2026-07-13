import { useState, type CSSProperties } from 'react'
import type { JSONContent } from '@tiptap/core'
import { t } from '@shared/i18n'
import { useNotesStore } from '@renderer/state/useNotesStore'
import { NoteEditor } from '@renderer/editor/NoteEditor'

const dragRegion = { WebkitAppRegion: 'drag' } as unknown as CSSProperties
const noDragRegion = { WebkitAppRegion: 'no-drag' } as unknown as CSSProperties

/**
 * Special note window for editing a template: blue outline, neutral
 * background (a template has no color), no pin/redock/collapse chrome. Edits
 * stay LOCAL until "Save changes" — nothing flows to the notes store.
 */
export function TemplateEditorApp({ templateId }: { templateId: string }): React.JSX.Element | null {
  const template = useNotesStore((s) => s.templates.find((tpl) => tpl.id === templateId))
  const [draftContent, setDraftContent] = useState<JSONContent | null>(null)
  const [draftName, setDraftName] = useState<string | null>(null)
  const [isEditingName, setIsEditingName] = useState(false)

  if (!template) return null

  const name = draftName ?? template.name

  const save = (): void => {
    window.aeronotes.updateTemplate(templateId, {
      name: name.trim() || template.name,
      content: draftContent ?? template.content
    })
    window.close()
  }

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden rounded-[var(--radius-lg)] bg-neutral-100 shadow-2xl ring-2 ring-inset ring-[var(--color-accent)]">
      <div
        className="flex shrink-0 items-center gap-2 border-b border-black/10 px-3 py-2"
        style={dragRegion}
      >
        {isEditingName ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={() => setIsEditingName(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur()
            }}
            spellCheck={false}
            size={Math.max(name.length, 6)}
            style={noDragRegion}
            className="max-w-full truncate bg-transparent text-sm font-semibold text-black/80 outline-none"
          />
        ) : (
          <span
            onClick={() => setIsEditingName(true)}
            style={noDragRegion}
            className="max-w-full cursor-text truncate text-sm font-semibold text-black/80"
          >
            {name}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-hidden pb-12">
        <NoteEditor
          noteId={`template-${templateId}`}
          content={template.content}
          onChange={setDraftContent}
        />
      </div>

      {/* Floating actions, same pill style as the template carousel. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center">
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/15 bg-neutral-900/90 p-1.5 shadow-2xl">
          <button
            onClick={() => window.close()}
            className="shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs text-white/85 hover:bg-white/10"
          >
            {t('templateEditor.discard')}
          </button>
          <button
            onClick={save}
            className="shrink-0 whitespace-nowrap rounded-full bg-[var(--color-accent)] px-3 py-1 text-xs font-medium text-white hover:brightness-110"
          >
            {t('templateEditor.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
