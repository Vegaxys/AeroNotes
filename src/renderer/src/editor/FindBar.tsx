import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { t } from '@shared/i18n'
import { findMatches } from './extensions/findInNote'

interface FindBarProps {
  editor: Editor
  /** Bumped every time Ctrl+F is pressed, to re-focus an already-open bar. */
  focusToken: number
  onClose: () => void
}

/**
 * Ctrl+F inside a note: a small pill pinned to the top of the editor that
 * highlights every match and steps through them.
 *
 * The matching lives here rather than in the ProseMirror plugin so the counter
 * the user reads and the highlights they see can never disagree — the plugin
 * is handed the very list this component counted.
 */
export function FindBar({ editor, focusToken, onClose }: FindBarProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [count, setCount] = useState(0)
  // Editing the note while the bar is open must re-run the search.
  const [docVersion, setDocVersion] = useState(0)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [focusToken])

  useEffect(() => {
    const bump = (): void => setDocVersion((version) => version + 1)
    editor.on('update', bump)
    return () => {
      editor.off('update', bump)
    }
  }, [editor])

  // Leaving the search must not leave the note painted yellow.
  useEffect(() => {
    return () => {
      editor.commands.setFindMatches([], 0)
    }
  }, [editor])

  useEffect(() => {
    const matches = findMatches(editor.state.doc, query)
    // The active match can fall off the end when the query narrows or the
    // note is edited; wrap back onto the last one rather than lose it.
    const index = matches.length === 0 ? 0 : Math.min(activeIndex, matches.length - 1)
    setCount(matches.length)
    if (index !== activeIndex) setActiveIndex(index)
    editor.commands.setFindMatches(matches, index)
    if (matches.length === 0) return
    // After the decorations have been painted, not before.
    const frame = requestAnimationFrame(() => {
      editor.view.dom.querySelector('.find-match-active')?.scrollIntoView({ block: 'nearest' })
    })
    return () => cancelAnimationFrame(frame)
  }, [editor, query, activeIndex, docVersion])

  const step = (delta: number): void => {
    if (count === 0) return
    setActiveIndex((index) => (index + delta + count) % count)
  }

  const buttonClass =
    'flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs text-black/50 hover:bg-black/10 disabled:opacity-30'

  return (
    <div className="sticky top-0 z-30 mb-1 flex justify-end">
      <div className="flex items-center gap-1 rounded-[var(--radius-md)] border border-black/10 bg-white/90 px-1.5 py-1 shadow-md">
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            // A new needle always starts from the first match.
            setActiveIndex(0)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              onClose()
              editor.commands.focus()
              return
            }
            if (event.key === 'Enter') {
              event.preventDefault()
              step(event.shiftKey ? -1 : 1)
            }
          }}
          placeholder={t('editor.find.placeholder')}
          spellCheck={false}
          className="w-28 min-w-0 bg-transparent text-xs text-black/80 outline-none placeholder:text-black/35"
        />
        <span className="w-9 shrink-0 text-center text-[10px] tabular-nums text-black/45">
          {query === '' ? '' : `${count === 0 ? 0 : activeIndex + 1}/${count}`}
        </span>
        <button
          onClick={() => step(-1)}
          disabled={count === 0}
          className={buttonClass}
          aria-label={t('editor.find.previous')}
          title={t('editor.find.previous')}
        >
          ↑
        </button>
        <button
          onClick={() => step(1)}
          disabled={count === 0}
          className={buttonClass}
          aria-label={t('editor.find.next')}
          title={t('editor.find.next')}
        >
          ↓
        </button>
        <button
          onClick={onClose}
          className={buttonClass}
          aria-label={t('editor.find.close')}
          title={t('editor.find.close')}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
