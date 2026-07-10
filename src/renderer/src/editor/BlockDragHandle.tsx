import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Node as PMNode } from '@tiptap/pm/model'
import { NodeSelection } from '@tiptap/pm/state'
import type { BlockTransferPayload } from '@shared/types'
import { t } from '@shared/i18n'

/** Below this cursor travel (px), a grip mousedown+mouseup counts as a click (select the block). */
const DRAG_THRESHOLD_PX = 4

interface BlockDragHandleProps {
  editor: Editor
  containerRef: React.RefObject<HTMLElement | null>
  noteId: string
}

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

interface Boundary {
  pos: number
  top: number
  left: number
  width: number
}

function measureRelativeTo(dom: HTMLElement, container: HTMLElement): Rect {
  const containerBox = container.getBoundingClientRect()
  const box = dom.getBoundingClientRect()
  return {
    top: box.top - containerBox.top + container.scrollTop,
    left: box.left - containerBox.left + container.scrollLeft,
    width: box.width,
    height: box.height
  }
}

/**
 * Finds whichever top-level block's row spans the given container-relative Y.
 * Deliberately geometry-only (no `posAtCoords`): posAtCoords resolves to a
 * *text* position and can fail to resolve reliably over a plain paragraph's
 * own whitespace/gutter area (it mostly "worked" for wide blocks like tables
 * or details just because they leave little room to miss), whereas checking
 * "is this Y within this block's own rendered box" works uniformly for every
 * block type regardless of X position.
 */
function findBlockAtY(editor: Editor, container: HTMLElement, y: number): { pos: number; rect: Rect } | null {
  let result: { pos: number; rect: Rect } | null = null
  editor.state.doc.forEach((_node, offset) => {
    if (result) return
    const dom = editor.view.nodeDOM(offset)
    if (!(dom instanceof HTMLElement)) return
    const rect = measureRelativeTo(dom, container)
    if (y >= rect.top && y <= rect.top + rect.height) {
      result = { pos: offset, rect }
    }
  })
  return result
}

/** All the positions a block could be dropped at: before the first block, and after every block. */
function computeBoundaries(editor: Editor, container: HTMLElement): Boundary[] {
  const boundaries: Boundary[] = []
  const firstDom = editor.view.nodeDOM(0)
  if (firstDom instanceof HTMLElement) {
    const rect = measureRelativeTo(firstDom, container)
    boundaries.push({ pos: 0, top: rect.top, left: rect.left, width: rect.width })
  }
  editor.state.doc.forEach((node, offset) => {
    const dom = editor.view.nodeDOM(offset)
    if (dom instanceof HTMLElement) {
      const rect = measureRelativeTo(dom, container)
      boundaries.push({ pos: offset + node.nodeSize, top: rect.top + rect.height, left: rect.left, width: rect.width })
    }
  })
  return boundaries
}

function findNearestBoundary(boundaries: Boundary[], y: number): Boundary | null {
  let nearest: Boundary | null = null
  let minDistance = Infinity
  for (const boundary of boundaries) {
    const distance = Math.abs(boundary.top - y)
    if (distance < minDistance) {
      minDistance = distance
      nearest = boundary
    }
  }
  return nearest
}

function moveBlock(editor: Editor, sourcePos: number, sourceSize: number, targetPos: number): void {
  if (targetPos >= sourcePos && targetPos <= sourcePos + sourceSize) return

  const { state, view } = editor
  const slice = state.doc.slice(sourcePos, sourcePos + sourceSize)
  const tr = state.tr.delete(sourcePos, sourcePos + sourceSize)
  const mappedTarget = tr.mapping.map(targetPos)
  tr.insert(mappedTarget, slice.content)
  view.dispatch(tr)
  view.focus()
}

function isInsideThisWindow(event: MouseEvent): boolean {
  return (
    event.clientX >= 0 &&
    event.clientX <= window.innerWidth &&
    event.clientY >= 0 &&
    event.clientY <= window.innerHeight
  )
}

export function BlockDragHandle({ editor, containerRef, noteId }: BlockDragHandleProps): React.JSX.Element | null {
  const [hoveredBlock, setHoveredBlock] = useState<{ pos: number; rect: Rect } | null>(null)
  const [dropIndicator, setDropIndicator] = useState<Boundary | null>(null)
  const isDraggingRef = useRef(false)

  // Track which top-level block is under the cursor, to position the grip. Our
  // own hit-testing (not a third-party plugin's) so we fully control when the
  // grip shows/hides instead of fighting an opaque hover-hide implementation.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function handleMouseMove(event: MouseEvent): void {
      if (isDraggingRef.current) return
      const containerBox = container!.getBoundingClientRect()
      const y = event.clientY - containerBox.top + container!.scrollTop
      setHoveredBlock(findBlockAtY(editor, container!, y))
    }

    function handleMouseLeave(): void {
      if (!isDraggingRef.current) setHoveredBlock(null)
    }

    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [editor, containerRef])

  // Highlight the block the grip currently targets. Depends on just the
  // position (not the whole hoveredBlock object, which gets a new reference
  // on every mousemove) so the class only toggles when the target actually
  // changes block, not on every pixel of movement within the same one.
  const hoveredPos = hoveredBlock?.pos
  useEffect(() => {
    if (hoveredPos === undefined) return
    const dom = editor.view.nodeDOM(hoveredPos)
    if (!(dom instanceof HTMLElement)) return
    dom.classList.add('block-hover-target')
    return () => dom.classList.remove('block-hover-target')
  }, [editor, hoveredPos])

  // Target side of a cross-window drag: another note's window is dragging a
  // block over/into this one. Coordinates arrive relative to this window's
  // content area, i.e. directly comparable to clientX/clientY.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function boundaryAtWindowY(y: number): Boundary | null {
      const containerBox = container!.getBoundingClientRect()
      const relativeY = y - containerBox.top + container!.scrollTop
      return findNearestBoundary(computeBoundaries(editor, container!), relativeY)
    }

    const unsubscribeOver = window.aeronotes.onBlockDragOver((_x, y) => {
      setDropIndicator(boundaryAtWindowY(y))
    })
    const unsubscribeLeave = window.aeronotes.onBlockDragLeave(() => setDropIndicator(null))
    const unsubscribeDrop = window.aeronotes.onBlockDrop((_x, y, payload) => {
      setDropIndicator(null)
      const target = boundaryAtWindowY(y)
      if (!target) return
      let node: PMNode
      try {
        node = PMNode.fromJSON(editor.schema, payload.content)
      } catch {
        return
      }
      editor.view.dispatch(editor.state.tr.insert(target.pos, node))
      editor.view.focus()
      window.aeronotes.notifyBlockTransferred(payload.sourceNoteId, payload.sourcePos, payload.sourceSize)
    })

    return () => {
      unsubscribeOver()
      unsubscribeLeave()
      unsubscribeDrop()
    }
  }, [editor, containerRef])

  // Source side of a completed cross-window transfer: the target window
  // confirmed the insertion (via main), so delete the original block here.
  useEffect(() => {
    return window.aeronotes.onBlockRemoveRequested((pos, size) => {
      const node = editor.state.doc.nodeAt(pos)
      // Only delete if the doc still matches what was dragged — if it changed
      // mid-drag, leaving a duplicate behind beats deleting the wrong block.
      if (!node || node.nodeSize !== size) return
      editor.view.dispatch(editor.state.tr.delete(pos, pos + size))
    })
  }, [editor])

  const startDrag = (event: React.MouseEvent): void => {
    const container = containerRef.current
    const block = hoveredBlock
    if (!container || !block) return
    event.preventDefault()

    const node = editor.state.doc.nodeAt(block.pos)
    if (!node) return

    const sourcePos = block.pos
    const sourceSize = node.nodeSize
    // Serialized up front: the payload must describe the block as it was when
    // the drag started, whatever happens to the doc afterwards.
    const payload: BlockTransferPayload = {
      sourceNoteId: noteId,
      sourcePos,
      sourceSize,
      content: node.toJSON()
    }
    const sourceDom = editor.view.nodeDOM(sourcePos)

    const startX = event.clientX
    const startY = event.clientY
    let dragStarted = false
    let latestTarget: Boundary | null = null
    let wasOutsideWindow = false

    function handleMove(moveEvent: MouseEvent): void {
      // A press only becomes a drag past a small travel threshold; a plain
      // click instead selects the block (see handleUp).
      if (!dragStarted) {
        if (
          Math.abs(moveEvent.clientX - startX) < DRAG_THRESHOLD_PX &&
          Math.abs(moveEvent.clientY - startY) < DRAG_THRESHOLD_PX
        ) {
          return
        }
        dragStarted = true
        isDraggingRef.current = true
        if (sourceDom instanceof HTMLElement) sourceDom.classList.add('block-drag-source')
      }

      // While the button is held, mouse capture keeps these events coming even
      // outside the window — that's what lets a drag reach another post-it.
      if (isInsideThisWindow(moveEvent)) {
        if (wasOutsideWindow) {
          wasOutsideWindow = false
          window.aeronotes.blockDragCancel(noteId)
        }
        const boundaries = computeBoundaries(editor, container!)
        const containerBox = container!.getBoundingClientRect()
        const y = moveEvent.clientY - containerBox.top + container!.scrollTop
        latestTarget = findNearestBoundary(boundaries, y)
        setDropIndicator(latestTarget)
      } else {
        wasOutsideWindow = true
        if (latestTarget) {
          latestTarget = null
          setDropIndicator(null)
        }
        window.aeronotes.blockDragMove(noteId, moveEvent.screenX, moveEvent.screenY)
      }
    }

    function handleUp(upEvent: MouseEvent): void {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      isDraggingRef.current = false
      if (sourceDom instanceof HTMLElement) sourceDom.classList.remove('block-drag-source')

      if (!dragStarted) {
        // Plain click: select the whole block (deletable with Backspace/Delete).
        const { state, view } = editor
        view.dispatch(state.tr.setSelection(NodeSelection.create(state.doc, sourcePos)))
        view.focus()
        return
      }

      if (isInsideThisWindow(upEvent)) {
        if (latestTarget) {
          moveBlock(editor, sourcePos, sourceSize, latestTarget.pos)
        }
      } else {
        // Released over (maybe) another note window: main figures out which
        // one and forwards the payload; deletion happens on its confirmation.
        window.aeronotes.blockDragDrop(upEvent.screenX, upEvent.screenY, payload)
      }
      setDropIndicator(null)
      setHoveredBlock(null)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }

  return (
    <>
      {hoveredBlock && (
        <div
          onMouseDown={startDrag}
          className="block-drag-handle-grip"
          style={{ position: 'absolute', top: hoveredBlock.rect.top }}
          aria-label={t('editor.moveBlock')}
          title={t('editor.moveBlockTitle')}
        >
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      )}
      {dropIndicator && (
        <div
          className="block-drop-indicator"
          style={{
            position: 'absolute',
            top: dropIndicator.top,
            left: dropIndicator.left,
            width: dropIndicator.width
          }}
        />
      )}
    </>
  )
}
