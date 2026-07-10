import { useEffect, useRef, useState } from 'react'
import type { JSONContent } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import { t } from '@shared/i18n'
import { createNoteEditorExtensions } from './extensions'
import { BubbleToolbar } from './BubbleToolbar'
import { TableControls } from './TableControls'
import { BlockDragHandle } from './BlockDragHandle'
import { HIGHLIGHT_COLORS } from './highlightColors'
import { imagePasteDropProps } from './imagePasteDrop'
import '../styles/editor.css'

interface NoteEditorProps {
  noteId: string
  content?: JSONContent
  onChange?: (content: JSONContent) => void
  /**
   * Dock-card mode: grows with content up to a max height then scrolls, and
   * drops the block drag handle + table controls (block reordering and
   * cross-window transfer stay a detached-post-it feature).
   */
  compact?: boolean
}

/** Rough width of the highlight popup, to clamp it inside the container. */
const HIGHLIGHT_MENU_WIDTH_PX = 180

export function NoteEditor({ noteId, content, onChange, compact }: NoteEditorProps): React.JSX.Element | null {
  const containerRef = useRef<HTMLDivElement>(null)
  const [highlightMenu, setHighlightMenu] = useState<{ top: number; left: number } | null>(null)

  const editor = useEditor({
    immediatelyRender: true,
    extensions: createNoteEditorExtensions({
      onHighlightClick: (event) => {
        const container = containerRef.current
        if (!container) return
        const box = container.getBoundingClientRect()
        setHighlightMenu({
          top: event.clientY - box.top + container.scrollTop + 10,
          left: Math.min(
            event.clientX - box.left + container.scrollLeft,
            container.clientWidth - HIGHLIGHT_MENU_WIDTH_PX
          )
        })
      }
    }),
    content,
    editorProps: {
      ...imagePasteDropProps,
      // No correction UI is wired up, so the spellcheck squiggly underline is just noise.
      attributes: { spellcheck: 'false' }
    },
    onUpdate: ({ editor }) => onChange?.(editor.getJSON())
  })

  // The click that opens the menu is already finished when this effect runs,
  // so the very next pointerdown outside the popup closes it.
  useEffect(() => {
    if (!highlightMenu) return
    function handlePointerDown(event: PointerEvent): void {
      if (event.target instanceof Element && event.target.closest('.highlight-color-menu')) return
      setHighlightMenu(null)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [highlightMenu])

  if (!editor) {
    return null
  }

  const applyHighlight = (color: string): void => {
    editor.chain().focus().extendMarkRange('highlight').setHighlight({ color }).run()
    setHighlightMenu(null)
  }

  const removeHighlight = (): void => {
    editor.chain().focus().extendMarkRange('highlight').unsetHighlight().run()
    setHighlightMenu(null)
  }

  return (
    <div
      ref={containerRef}
      className={`note-editor relative overflow-y-auto text-sm text-black/90 ${
        compact ? 'max-h-80 px-3 py-2' : 'h-full py-3 pl-10 pr-4'
      }`}
    >
      <BubbleToolbar editor={editor} />
      {!compact && <BlockDragHandle editor={editor} containerRef={containerRef} noteId={noteId} />}
      {!compact && <TableControls editor={editor} containerRef={containerRef} />}
      <EditorContent editor={editor} />
      {highlightMenu && (
        <div
          className="highlight-color-menu absolute z-20 flex items-center gap-1 rounded-[var(--radius-md)] border border-white/15 bg-neutral-900/95 p-1.5 shadow-2xl"
          style={{ top: highlightMenu.top, left: Math.max(highlightMenu.left, 0) }}
        >
          {HIGHLIGHT_COLORS.map((color) => (
            <button
              key={color}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyHighlight(color)}
              className="h-5 w-5 rounded border border-white/20 hover:scale-110"
              style={{ background: color }}
              aria-label={t('editor.highlight', { color })}
            />
          ))}
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={removeHighlight}
            className="flex h-5 w-5 items-center justify-center rounded border border-white/20 text-[11px] text-white/70 hover:bg-white/10"
            aria-label={t('editor.removeHighlight')}
            title={t('editor.removeHighlight')}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
