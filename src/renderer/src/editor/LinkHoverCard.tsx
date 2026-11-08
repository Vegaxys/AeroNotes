import { useEffect, useRef, useState } from 'react'
import { getMarkRange } from '@tiptap/core'
import type { Transaction } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/react'
import { t } from '@shared/i18n'
import type { LocalLinkKind } from './extensions/localLink'
import { normalizeWebUrl } from './linkUrl'

interface LinkHoverCardProps {
  editor: Editor
  /** The scrolling `.note-editor` box the card is positioned in. */
  containerRef: React.RefObject<HTMLDivElement | null>
}

type LinkMarkName = 'link' | 'localLink'

interface HoveredLink {
  markName: LinkMarkName
  /** Document range covered by the link mark. */
  from: number
  to: number
  /** href of a web link, filesystem path of a local one. */
  target: string
  kind: LocalLinkKind
  text: string
  /** Card anchor, in the container's scroll coordinates. */
  top: number
  left: number
  /** Not enough room under the link: the card hangs above it instead. */
  above: boolean
}

const LINK_SELECTOR = 'a[href], .local-link'
const SHOW_DELAY_MS = 350
/** Long enough to cross the gap between the link and the card. */
const HIDE_DELAY_MS = 250
const CARD_WIDTH_PX = 260
/** Height of the card in edit mode, the tallest it gets — decides the flip. */
const EDIT_HEIGHT_PX = 130
const GAP_PX = 4

/**
 * Finds the link mark rendered by `element` and where to show
 * the card for it. Null when the element no longer maps to a link (the
 * document changed under the cursor).
 */
function resolveLink(editor: Editor, element: HTMLElement, container: HTMLElement): HoveredLink | null {
  const markName: LinkMarkName = element.matches('.local-link') ? 'localLink' : 'link'
  const markType = editor.schema.marks[markName]
  if (!markType) return null

  let pos: number
  try {
    pos = editor.view.posAtDOM(element, 0)
  } catch {
    return null
  }
  const $pos = editor.state.doc.resolve(pos)
  const mark = $pos.parent.childAfter($pos.parentOffset).node?.marks.find((m) => m.type === markType)
  if (!mark) return null
  // Matching on the attributes too keeps two adjacent links with different
  // targets apart.
  const range = getMarkRange($pos, markType, mark.attrs)
  if (!range) return null

  const box = container.getBoundingClientRect()
  const rect = element.getBoundingClientRect()
  const spaceBelow = box.bottom - rect.bottom
  const above = spaceBelow < EDIT_HEIGHT_PX && rect.top - box.top > spaceBelow
  const maxLeft = Math.max(container.clientWidth - CARD_WIDTH_PX - GAP_PX, GAP_PX)

  return {
    markName,
    from: range.from,
    to: range.to,
    target: markName === 'link' ? ((mark.attrs.href as string | null) ?? '') : ((mark.attrs.path as string | null) ?? ''),
    kind: (mark.attrs.kind as LocalLinkKind | undefined) ?? 'file',
    text: editor.state.doc.textBetween(range.from, range.to),
    top: (above ? rect.top - box.top - GAP_PX : rect.bottom - box.top + GAP_PX) + container.scrollTop,
    left: Math.min(Math.max(rect.left - box.left + container.scrollLeft, GAP_PX), maxLeft),
    above
  }
}

/**
 * Notion-style card shown when the cursor rests on a web or local link: its
 * target, a copy button, and an edit form for both the target and the
 * displayed text. Clicking a link opens it (see WebLinkClick / LocalLink), so
 * without this the only way to change one was to select its text first.
 * [[Note links]] are atoms with their own picker and are not handled here.
 */
export function LinkHoverCard({ editor, containerRef }: LinkHoverCardProps): React.JSX.Element | null {
  const [link, setLink] = useState<HoveredLink | null>(null)
  const [editing, setEditing] = useState(false)
  const [textDraft, setTextDraft] = useState('')
  const [targetDraft, setTargetDraft] = useState('')
  const [copied, setCopied] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  // Read from the DOM listeners, which are bound once.
  const editingRef = useRef(false)
  const anchorRef = useRef<Element | null>(null)
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  editingRef.current = editing

  const close = (): void => {
    clearTimeout(showTimerRef.current)
    clearTimeout(hideTimerRef.current)
    anchorRef.current = null
    setLink(null)
    setEditing(false)
    setCopied(false)
  }

  const scheduleHide = (): void => {
    clearTimeout(showTimerRef.current)
    clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(close, HIDE_DELAY_MS)
  }

  useEffect(() => {
    const dom = editor.view.dom

    function handleMouseOver(event: MouseEvent): void {
      if (editingRef.current) return
      // A button held down means a text selection is being dragged.
      if (event.buttons !== 0) return
      const element = event.target instanceof Element ? event.target.closest<HTMLElement>(LINK_SELECTOR) : null
      if (!element || !dom.contains(element)) return
      clearTimeout(hideTimerRef.current)
      if (element === anchorRef.current) return
      anchorRef.current = element
      clearTimeout(showTimerRef.current)
      showTimerRef.current = setTimeout(() => {
        const container = containerRef.current
        if (!container || !element.isConnected) return
        setLink(resolveLink(editor, element, container))
        setEditing(false)
        setCopied(false)
      }, SHOW_DELAY_MS)
    }

    function handleMouseOut(event: MouseEvent): void {
      if (editingRef.current) return
      const element = event.target instanceof Element ? event.target.closest(LINK_SELECTOR) : null
      if (!element) return
      const next = event.relatedTarget
      if (next instanceof Node && (element.contains(next) || cardRef.current?.contains(next))) return
      scheduleHide()
    }

    // Keep the range in step with edits made while the card is up (typing
    // elsewhere, a sync from another window), and drop it if the link is gone.
    function handleTransaction({ transaction }: { transaction: Transaction }): void {
      if (!transaction.docChanged) return
      setLink((current) => {
        if (!current) return current
        const from = transaction.mapping.map(current.from, 1)
        const to = transaction.mapping.map(current.to, -1)
        return from < to ? { ...current, from, to } : null
      })
    }

    dom.addEventListener('mouseover', handleMouseOver)
    dom.addEventListener('mouseout', handleMouseOut)
    editor.on('transaction', handleTransaction)
    return () => {
      dom.removeEventListener('mouseover', handleMouseOver)
      dom.removeEventListener('mouseout', handleMouseOut)
      editor.off('transaction', handleTransaction)
      clearTimeout(showTimerRef.current)
      clearTimeout(hideTimerRef.current)
    }
    // close / scheduleHide only touch refs and state setters, so the copies
    // captured on the first render stay valid.
  }, [editor, containerRef])

  // While editing, the card stays put until a click lands outside of it.
  useEffect(() => {
    if (!editing) return
    function handlePointerDown(event: PointerEvent): void {
      if (event.target instanceof Node && cardRef.current?.contains(event.target)) return
      close()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [editing])

  if (!link) return null

  const isWeb = link.markName === 'link'

  const startEditing = (): void => {
    clearTimeout(hideTimerRef.current)
    setTextDraft(link.text)
    setTargetDraft(link.target)
    setEditing(true)
  }

  const copyTarget = (): void => {
    void window.aeronotes.writeClipboardText(link.target)
    setCopied(true)
  }

  const openTarget = (): void => {
    if (isWeb) void window.aeronotes.openExternalUrl(link.target)
    else void window.aeronotes.openLocalPath(link.target, link.kind)
  }

  const browse = async (): Promise<void> => {
    const path = await window.aeronotes.pickLocalPath(link.kind)
    if (path) setTargetDraft(path)
  }

  const save = (): void => {
    const target = targetDraft.trim()
    if (!target) return
    const text = textDraft === '' ? target : textDraft
    const { from, to, markName, kind } = link
    editor
      .chain()
      .command(({ tr, state }) => {
        const markType = state.schema.marks[markName]
        const current = state.doc.nodeAt(from)?.marks ?? []
        const existing = current.find((m) => m.type === markType)
        const attrs = isWeb
          ? { ...existing?.attrs, href: normalizeWebUrl(target) }
          : { path: target, kind }
        // The other marks of the link's first character (bold, color…) carry
        // over to the new text; the link mark itself is rebuilt.
        const marks = markType.create(attrs).addToSet(current.filter((m) => m.type !== markType))
        tr.replaceWith(from, to, state.schema.text(text, marks))
        return true
      })
      .run()
    close()
  }

  const removeLink = (): void => {
    const { from, to, markName } = link
    editor
      .chain()
      .command(({ tr, state }) => {
        tr.removeMark(from, to, state.schema.marks[markName])
        return true
      })
      .run()
    close()
  }

  return (
    <div
      ref={cardRef}
      // In the dock, the card can overflow the card it belongs to; keep it
      // inside the overlay's click-through hit-test.
      data-mouse-live=""
      onMouseEnter={() => clearTimeout(hideTimerRef.current)}
      onMouseLeave={() => {
        if (!editing) scheduleHide()
      }}
      className="absolute z-50 rounded-[var(--radius-md)] border border-white/15 bg-neutral-900 p-1 text-xs text-white/85 shadow-2xl"
      style={{
        top: link.top,
        left: link.left,
        width: `min(${CARD_WIDTH_PX}px, calc(100% - ${GAP_PX * 2}px))`,
        transform: link.above ? 'translateY(-100%)' : undefined
      }}
    >
      {editing ? (
        <form
          className="flex flex-col gap-1.5 p-1"
          onSubmit={(event) => {
            event.preventDefault()
            save()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') close()
          }}
        >
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wide text-white/45">{t('editor.link.text')}</span>
            <input
              autoFocus
              value={textDraft}
              onChange={(event) => setTextDraft(event.target.value)}
              spellCheck={false}
              className="rounded border border-white/15 bg-transparent px-2 py-1 text-white outline-none focus:border-white/30"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wide text-white/45">
              {isWeb ? t('editor.link.target') : t('editor.link.path')}
            </span>
            <div className="flex gap-1">
              <input
                value={targetDraft}
                onChange={(event) => setTargetDraft(event.target.value)}
                placeholder={isWeb ? 'https://...' : undefined}
                spellCheck={false}
                className="min-w-0 flex-1 rounded border border-white/15 bg-transparent px-2 py-1 text-white outline-none focus:border-white/30"
              />
              {!isWeb && (
                <button
                  type="button"
                  onClick={() => void browse()}
                  className="shrink-0 rounded bg-white/10 px-2 py-1 hover:bg-white/20"
                >
                  {t('editor.link.browse')}
                </button>
              )}
            </div>
          </label>
          <div className="flex items-center justify-between pt-0.5">
            <button
              type="button"
              onClick={removeLink}
              className="rounded px-2 py-1 text-red-400 hover:bg-white/10"
            >
              {t('editor.removeLink')}
            </button>
            <button type="submit" className="rounded bg-white/15 px-2.5 py-1 text-white hover:bg-white/25">
              {t('editor.link.save')}
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-center gap-1">
          <button
            onClick={openTarget}
            className="min-w-0 flex-1 truncate rounded px-2 py-1 text-left text-white/70 hover:bg-white/10 hover:text-white"
          >
            {isWeb ? '🌐' : link.kind === 'folder' ? '📁' : '📄'} {link.target}
          </button>
          <button
            onClick={copyTarget}
            aria-label={t('editor.link.copy')}
            className="shrink-0 rounded px-1.5 py-1 hover:bg-white/10"
          >
            {copied ? t('editor.link.copied') : '⧉'}
          </button>
          <button onClick={startEditing} className="shrink-0 rounded px-2 py-1 hover:bg-white/10">
            {t('editor.link.edit')}
          </button>
        </div>
      )}
    </div>
  )
}
