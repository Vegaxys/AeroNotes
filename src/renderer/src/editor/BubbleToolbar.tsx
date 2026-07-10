import { useEffect, useRef, useState } from 'react'
import { BubbleMenu } from '@tiptap/react/menus'
import type { Editor } from '@tiptap/react'
import { t } from '@shared/i18n'
import { HIGHLIGHT_COLORS } from './highlightColors'

interface BubbleToolbarProps {
  editor: Editor
}

interface ToolbarButtonProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

const TEXT_COLORS = ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#c084fc']

function ToolbarButton({ active, onClick, children }: ToolbarButtonProps): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`flex h-7 min-w-7 items-center justify-center rounded-[var(--radius-sm)] px-1.5 text-xs font-medium text-white/90 ${
        active ? 'bg-white/25' : 'hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  )
}

export function BubbleToolbar({ editor }: BubbleToolbarProps): React.JSX.Element {
  const activeColor = editor.getAttributes('textStyle').color as string | undefined
  // 'menu' = the file/folder/web choice list, 'url' = the inline URL input.
  const [linkMenu, setLinkMenu] = useState<'closed' | 'menu' | 'url'>('closed')
  const [urlDraft, setUrlDraft] = useState('')
  const linkMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (linkMenu === 'closed') return
    function handlePointerDown(event: PointerEvent): void {
      if (event.target instanceof Node && !linkMenuRef.current?.contains(event.target)) {
        setLinkMenu('closed')
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [linkMenu])

  const applyLocalLink = async (kind: 'file' | 'folder'): Promise<void> => {
    setLinkMenu('closed')
    const path = await window.aeronotes.pickLocalPath(kind)
    if (!path) return
    // Mark on the current selection: the link lands in the middle of the text.
    editor.chain().focus().setLocalLink({ path, kind }).run()
  }

  const openUrlInput = (): void => {
    setUrlDraft((editor.getAttributes('link').href as string | undefined) ?? '')
    setLinkMenu('url')
  }

  const applyWebLink = (): void => {
    const url = urlDraft.trim()
    setLinkMenu('closed')
    if (!url) return
    const normalized = /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`
    editor.chain().focus().extendMarkRange('link').setLink({ href: normalized }).run()
  }

  const removeLinks = (): void => {
    setLinkMenu('closed')
    editor.chain().focus().extendMarkRange('link').unsetLink().unsetLocalLink().run()
  }

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="textBubbleMenu"
      options={{ flip: true, shift: { padding: 8 }, offset: 8 }}
      // data-mouse-live: in the overlay window the bubble can overflow the
      // dock's rect; the marker keeps it inside the click-through hit-test.
      data-mouse-live=""
      className="relative flex max-w-[280px] flex-wrap items-center gap-1 rounded-[var(--radius-md)] border border-white/15 bg-neutral-900/95 p-1 shadow-2xl"
    >
      <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        B
      </ToolbarButton>
      <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        i
      </ToolbarButton>
      <ToolbarButton active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
        S
      </ToolbarButton>
      <ToolbarButton active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
        {'</>'}
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        H1
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('link') || editor.isActive('localLink') || linkMenu !== 'closed'}
        onClick={() => setLinkMenu(linkMenu === 'closed' ? 'menu' : 'closed')}
      >
        🔗
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-white/15" />
      {TEXT_COLORS.map((color) => (
        <button
          key={color}
          onClick={() => editor.chain().focus().setColor(color).run()}
          className={`h-5 w-5 rounded-full border border-white/20 ${
            activeColor === color ? 'ring-2 ring-offset-1 ring-offset-neutral-900 ring-white' : ''
          }`}
          style={{ background: color }}
          aria-label={t('editor.textColor', { color })}
        />
      ))}
      <button
        onClick={() => editor.chain().focus().unsetColor().run()}
        className={`flex h-5 w-5 items-center justify-center rounded-full border border-white/20 text-[10px] text-white/70 ${
          !activeColor ? 'ring-2 ring-offset-1 ring-offset-neutral-900 ring-white' : ''
        }`}
        aria-label={t('editor.removeColor')}
      >
        ×
      </button>
      <span className="mx-1 h-4 w-px bg-white/15" />
      {/* Highlight swatches: squares, vs the round text-color dots above. */}
      {HIGHLIGHT_COLORS.map((color) => (
        <button
          key={color}
          onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
          className={`h-5 w-5 rounded border border-white/20 ${
            editor.isActive('highlight', { color })
              ? 'ring-2 ring-offset-1 ring-offset-neutral-900 ring-white'
              : ''
          }`}
          style={{ background: color }}
          aria-label={t('editor.highlight', { color })}
        />
      ))}
      {linkMenu !== 'closed' && (
        <div
          ref={linkMenuRef}
          className="absolute left-0 top-full z-20 mt-1 w-52 rounded-[var(--radius-md)] border border-white/15 bg-neutral-900/95 p-1 shadow-2xl"
        >
          {linkMenu === 'menu' ? (
            <div className="flex flex-col gap-0.5 text-xs text-white/85">
              <button
                className="rounded px-2 py-1.5 text-left hover:bg-white/10"
                onClick={() => void applyLocalLink('file')}
              >
                📄 {t('editor.linkToFile')}
              </button>
              <button
                className="rounded px-2 py-1.5 text-left hover:bg-white/10"
                onClick={() => void applyLocalLink('folder')}
              >
                📁 {t('editor.linkToFolder')}
              </button>
              <button className="rounded px-2 py-1.5 text-left hover:bg-white/10" onClick={openUrlInput}>
                🌐 {t('editor.webLink')}
              </button>
              {(editor.isActive('link') || editor.isActive('localLink')) && (
                <button
                  className="rounded px-2 py-1.5 text-left text-red-400 hover:bg-white/10"
                  onClick={removeLinks}
                >
                  {t('editor.removeLink')}
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 p-1">
              <input
                autoFocus
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyWebLink()
                  if (e.key === 'Escape') setLinkMenu('closed')
                }}
                placeholder="https://..."
                spellCheck={false}
                className="min-w-0 flex-1 rounded border border-white/15 bg-transparent px-2 py-1 text-xs text-white outline-none focus:border-white/30"
              />
              <button
                onClick={applyWebLink}
                className="rounded bg-white/10 px-2 py-1 text-xs text-white/85 hover:bg-white/20"
              >
                OK
              </button>
            </div>
          )}
        </div>
      )}
    </BubbleMenu>
  )
}
