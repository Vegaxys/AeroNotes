import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { t } from '@shared/i18n'
import { Selection } from '@tiptap/pm/state'
import {
  TableMap,
  addColumnAfter,
  addRowAfter,
  findTable
} from '@tiptap/pm/tables'

interface TableControlsProps {
  editor: Editor
  containerRef: React.RefObject<HTMLElement | null>
}

interface TableRect {
  top: number
  left: number
  width: number
  height: number
}

interface ContextMenuState {
  x: number
  y: number
}

function getActiveTableElement(editor: Editor): HTMLElement | null {
  const table = findTable(editor.state.selection.$from)
  if (!table) return null
  const dom = editor.view.nodeDOM(table.pos)
  if (!(dom instanceof HTMLElement)) return null
  // The resizable table's NodeView wraps the actual <table> in a container
  // (for the horizontal-scroll/resize-handle chrome); measure the <table>
  // itself so the +buttons hug the real cell borders, not the wrapper.
  if (dom.tagName === 'TABLE') return dom
  return dom.querySelector('table') ?? dom
}

/** Moves the cursor into a specific cell (by table-relative map index) before running a table command. */
function runAtCell(editor: Editor, cellIndex: (map: TableMap) => number, command: typeof addColumnAfter): void {
  const { state, view } = editor
  const table = findTable(state.selection.$from)
  if (!table) return
  const map = TableMap.get(table.node)
  const cellPos = table.start + map.map[cellIndex(map)]
  const selection = Selection.near(state.doc.resolve(cellPos + 1))
  view.dispatch(state.tr.setSelection(selection))
  command(view.state, view.dispatch)
  view.focus()
}

function appendColumn(editor: Editor): void {
  runAtCell(editor, (map) => map.width - 1, addColumnAfter)
}

function appendRow(editor: Editor): void {
  runAtCell(editor, (map) => (map.height - 1) * map.width, addRowAfter)
}

export function TableControls({ editor, containerRef }: TableControlsProps): React.JSX.Element | null {
  const [rect, setRect] = useState<TableRect | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  useEffect(() => {
    function recompute(): void {
      const container = containerRef.current
      const tableEl = getActiveTableElement(editor)
      if (!container || !tableEl) {
        setRect((prev) => (prev === null ? prev : null))
        return
      }
      const containerBox = container.getBoundingClientRect()
      const tableBox = tableEl.getBoundingClientRect()
      const next: TableRect = {
        top: tableBox.top - containerBox.top + container.scrollTop,
        left: tableBox.left - containerBox.left + container.scrollLeft,
        width: tableBox.width,
        height: tableBox.height
      }
      // Avoid triggering a re-render (and downstream re-renders of sibling
      // components) on every keystroke when nothing actually moved.
      setRect((prev) =>
        prev &&
        prev.top === next.top &&
        prev.left === next.left &&
        prev.width === next.width &&
        prev.height === next.height
          ? prev
          : next
      )
    }

    recompute()
    editor.on('transaction', recompute)
    const container = containerRef.current
    container?.addEventListener('scroll', recompute)
    window.addEventListener('resize', recompute)

    return () => {
      editor.off('transaction', recompute)
      container?.removeEventListener('scroll', recompute)
      window.removeEventListener('resize', recompute)
    }
  }, [editor, containerRef])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function handleContextMenu(event: MouseEvent): void {
      if (!editor.isActive('table')) return
      event.preventDefault()
      const containerBox = container!.getBoundingClientRect()
      setContextMenu({
        x: event.clientX - containerBox.left + container!.scrollLeft,
        y: event.clientY - containerBox.top + container!.scrollTop
      })
    }
    function closeMenu(): void {
      setContextMenu(null)
    }

    container.addEventListener('contextmenu', handleContextMenu)
    window.addEventListener('click', closeMenu)
    return () => {
      container.removeEventListener('contextmenu', handleContextMenu)
      window.removeEventListener('click', closeMenu)
    }
  }, [editor, containerRef])

  return (
    <>
      {rect && (
        <>
          <button
            onClick={() => appendColumn(editor)}
            className="absolute z-10 flex w-4 items-center justify-center rounded bg-black/10 text-sm text-black/50 hover:bg-black/25"
            style={{ top: rect.top, left: rect.left + rect.width + 2, height: rect.height }}
            aria-label={t('table.addColumn')}
            title={t('table.addColumn')}
          >
            +
          </button>
          <button
            onClick={() => appendRow(editor)}
            className="absolute z-10 flex h-4 items-center justify-center rounded bg-black/10 text-sm text-black/50 hover:bg-black/25"
            style={{ top: rect.top + rect.height + 2, left: rect.left, width: rect.width }}
            aria-label={t('table.addRow')}
            title={t('table.addRow')}
          >
            +
          </button>
        </>
      )}
      {contextMenu && (
        <div
          className="absolute z-20 flex w-44 flex-col gap-0.5 rounded-[var(--radius-md)] border border-white/15 bg-neutral-900/95 p-1 text-xs text-white/85 shadow-2xl"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={() => setContextMenu(null)}
        >
          <button
            className="rounded px-2 py-1.5 text-left hover:bg-white/10"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
          >{t('table.addColumn')}</button>
          <button
            className="rounded px-2 py-1.5 text-left hover:bg-white/10"
            onClick={() => editor.chain().focus().deleteColumn().run()}
          >{t('table.deleteColumn')}</button>
          <button
            className="rounded px-2 py-1.5 text-left hover:bg-white/10"
            onClick={() => editor.chain().focus().addRowAfter().run()}
          >{t('table.addRow')}</button>
          <button
            className="rounded px-2 py-1.5 text-left hover:bg-white/10"
            onClick={() => editor.chain().focus().deleteRow().run()}
          >{t('table.deleteRow')}</button>
          <span className="my-0.5 h-px bg-white/10" />
          <button
            className="rounded px-2 py-1.5 text-left text-red-400 hover:bg-white/10"
            onClick={() => editor.chain().focus().deleteTable().run()}
          >{t('table.deleteTable')}</button>
        </div>
      )}
    </>
  )
}
