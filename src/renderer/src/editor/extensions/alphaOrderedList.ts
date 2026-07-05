import { Extension, wrappingInputRule, type Editor } from '@tiptap/core'
import type { ResolvedPos } from '@tiptap/pm/model'

/** Classic outline numbering: top level decimal, then alpha, then roman, then repeats. */
const NESTING_TYPE_CYCLE: Array<string | null> = [null, 'a', 'i']

function nearestListType($pos: ResolvedPos): 'orderedList' | 'bulletList' | null {
  for (let depth = $pos.depth; depth > 0; depth--) {
    const name = $pos.node(depth).type.name
    if (name === 'orderedList' || name === 'bulletList') return name
  }
  return null
}

/**
 * After indenting (Tab) inside an ordered list, ProseMirror's default sink
 * just creates another plain decimal sub-list. Walk the ordered-list
 * ancestors of the cursor and assign each one a type by nesting depth so
 * indenting reads as 1. -> a. -> i. -> 1. like a normal outline.
 */
function syncOrderedListTypesByDepth(editor: Editor): void {
  const { state, dispatch } = editor.view
  const { $from } = state.selection
  let tr = state.tr
  let changed = false
  let orderedDepth = 0

  for (let depth = 1; depth <= $from.depth; depth++) {
    const node = $from.node(depth)
    if (node.type.name === 'orderedList') {
      const desiredType = NESTING_TYPE_CYCLE[orderedDepth % NESTING_TYPE_CYCLE.length]
      if (node.attrs.type !== desiredType) {
        tr = tr.setNodeMarkup($from.before(depth), undefined, { ...node.attrs, type: desiredType })
        changed = true
      }
      orderedDepth++
    }
  }

  if (changed) {
    dispatch(tr)
  }
}

/**
 * OrderedList already supports an HTML `type` attribute (a/A/i/I/1) rendered
 * straight through to `<ol type="...">`, which browsers render natively —
 * these input rules just need to set that attribute for the 'a. '/'A. '
 * shortcuts; no custom list node is needed.
 */
export const AlphaOrderedList = Extension.create({
  name: 'alphaOrderedList',
  // Higher than the default (100) so our Tab handler runs before StarterKit's
  // bundled ListItem's own `Tab: () => sinkListItem(...)` binding, which would
  // otherwise handle the key first and return true, blocking ours entirely.
  priority: 1000,

  addInputRules() {
    const orderedListType = this.editor.schema.nodes.orderedList
    if (!orderedListType) return []

    return [
      wrappingInputRule({
        find: /^a\.\s$/,
        type: orderedListType,
        getAttributes: () => ({ type: 'a' }),
        // Never merge into an adjacent orderedList: ProseMirror's join keeps
        // the *earlier* node's attrs, so joining would silently drop our
        // 'a'/'A' type and the list would render as a plain decimal list.
        joinPredicate: () => false
      }),
      wrappingInputRule({
        find: /^A\.\s$/,
        type: orderedListType,
        getAttributes: () => ({ type: 'A' }),
        joinPredicate: () => false
      })
    ]
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        const { $from } = this.editor.state.selection
        if (nearestListType($from) !== 'orderedList') return false

        const sank = this.editor.commands.sinkListItem('listItem')
        if (sank) syncOrderedListTypesByDepth(this.editor)
        return sank
      }
    }
  }
})
