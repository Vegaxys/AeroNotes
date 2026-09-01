import { Fragment, Slice, type Node as PMNode, type ResolvedPos } from '@tiptap/pm/model'
import type { EditorProps } from '@tiptap/pm/view'

/** Item nodes of the three list kinds this editor's schema knows about. */
const LIST_ITEM_TYPES = new Set(['listItem', 'taskItem'])
/** Blocks that carry no formatting worth keeping when folded into a list item. */
const PLAIN_BLOCK_TYPES = new Set(['paragraph', 'heading'])

/** A textblock with nothing in it — the blank line a paste must not smuggle in. */
function isBlankTextblock(node: PMNode): boolean {
  return node.isTextblock && node.content.size === 0
}

function topLevelNodes(fragment: Fragment): PMNode[] {
  const nodes: PMNode[] = []
  fragment.forEach((node) => nodes.push(node))
  return nodes
}

/**
 * Drops the empty paragraphs many apps wrap their clipboard HTML in. Pasted
 * as-is they become real blank lines around the text — the more visible the
 * deeper the paste lands, since inside a list item they also break the item
 * in two.
 */
function trimBlankEdges(slice: Slice): Slice {
  const nodes = topLevelNodes(slice.content)
  let trimmedStart = false
  let trimmedEnd = false
  // `length > 1`: a slice that is nothing BUT a blank line is an intentional
  // paste of an empty line, and stays one.
  while (nodes.length > 1 && isBlankTextblock(nodes[0])) {
    nodes.shift()
    trimmedStart = true
  }
  while (nodes.length > 1 && isBlankTextblock(nodes[nodes.length - 1])) {
    nodes.pop()
    trimmedEnd = true
  }
  if (!trimmedStart && !trimmedEnd) return slice
  // A trimmed edge exposes a whole node, so that side is no longer open.
  return new Slice(
    Fragment.fromArray(nodes),
    trimmedStart ? 0 : slice.openStart,
    trimmedEnd ? 0 : slice.openEnd
  )
}

/** Innermost list item enclosing the caret, with the list holding it. */
function enclosingListItem($from: ResolvedPos): { item: PMNode; list: PMNode } | null {
  // Stops at depth 1: an item always sits inside a list, so a "list" that
  // would be the document itself means we are not in one.
  for (let depth = $from.depth; depth > 1; depth--) {
    const node = $from.node(depth)
    if (LIST_ITEM_TYPES.has(node.type.name)) {
      return { item: node, list: $from.node(depth - 1) }
    }
  }
  return null
}

/**
 * Re-shapes a run of plain paragraphs into items of the list being pasted
 * into: the first line continues the item under the caret, the rest become
 * siblings. Left alone, ProseMirror instead drops closed paragraphs into the
 * item as extra blocks, splitting it and leaving blank lines behind.
 *
 * Anything richer than paragraphs/headings (a nested list, a table, a code
 * block) is passed through untouched — its own structure is the point.
 */
function reshapeForList(slice: Slice, $from: ResolvedPos): Slice {
  const nodes = topLevelNodes(slice.content)
  if (nodes.length === 0 || !nodes.every((node) => PLAIN_BLOCK_TYPES.has(node.type.name))) {
    return slice
  }

  const context = enclosingListItem($from)
  if (!context) return slice

  // A single line is just text: merge it into the item under the caret rather
  // than starting a new bullet.
  if (nodes.length === 1) {
    return new Slice(Fragment.from(nodes[0]), 1, 1)
  }

  const { schema } = nodes[0].type
  const items = nodes.map((node) =>
    // Fresh attrs: a pasted line must not inherit the source item's state
    // (a checked task item, above all).
    context.item.type.create(null, schema.nodes.paragraph.create(null, node.content))
  )
  // Open down to list > item > paragraph, exactly like a copy of real list
  // items: the first paragraph merges into the current item, the others land
  // as siblings.
  return new Slice(Fragment.from(context.list.type.create(context.list.attrs, items)), 3, 3)
}

/**
 * Paste clean-up shared by every editor: strip the blank lines clipboard HTML
 * comes wrapped in, and make a paste inside a list read as list items.
 */
export const listPasteProps: EditorProps = {
  transformPasted(slice, view) {
    const trimmed = trimBlankEdges(slice)
    return reshapeForList(trimmed, view.state.selection.$from)
  }
}
