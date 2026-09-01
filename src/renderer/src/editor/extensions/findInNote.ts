import { Extension } from '@tiptap/core'
import type { Node as PMNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export interface FindMatch {
  from: number
  to: number
}

interface FindState {
  matches: FindMatch[]
  activeIndex: number
}

const findPluginKey = new PluginKey<FindState>('findInNote')

/** Placeholder standing in for a leaf node (an image), so offsets stay aligned. */
const LEAF_PLACEHOLDER = '￼'

/**
 * Every occurrence of `query` in the document, case-insensitively.
 *
 * Matching runs per textblock rather than per text node: marks (bold, a link,
 * a highlight) split a line into several text nodes, and a word straddling
 * such a split would otherwise never be found.
 */
export function findMatches(doc: PMNode, query: string): FindMatch[] {
  const matches: FindMatch[] = []
  const needle = query.toLowerCase()
  if (!needle) return matches

  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true
    // Over a textblock's inline content, textBetween offsets map 1:1 onto
    // document positions (each leaf counts for exactly one character), so an
    // index in this string IS an offset from the block's start.
    const text = node.textBetween(0, node.content.size, undefined, LEAF_PLACEHOLDER).toLowerCase()
    let index = text.indexOf(needle)
    while (index !== -1) {
      matches.push({ from: pos + 1 + index, to: pos + 1 + index + needle.length })
      index = text.indexOf(needle, index + needle.length)
    }
    // Nothing inside a textblock is itself a textblock.
    return false
  })
  return matches
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    findInNote: {
      /** Highlights the given matches, the one at `activeIndex` more strongly. */
      setFindMatches: (matches: FindMatch[], activeIndex: number) => ReturnType
    }
  }
}

/**
 * Highlighting half of the in-note search (Ctrl+F). It only paints what it is
 * told to: the matching itself lives in `findMatches`, driven by the find bar,
 * which is also what keeps the bar's counter and the highlights in step.
 */
export const FindInNote = Extension.create({
  name: 'findInNote',

  addCommands() {
    return {
      setFindMatches:
        (matches, activeIndex) =>
        ({ tr, dispatch }) => {
          if (dispatch) dispatch(tr.setMeta(findPluginKey, { matches, activeIndex }))
          return true
        }
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<FindState>({
        key: findPluginKey,
        state: {
          init: () => ({ matches: [], activeIndex: 0 }),
          apply(tr, value) {
            const meta = tr.getMeta(findPluginKey) as FindState | undefined
            if (meta) return meta
            if (!tr.docChanged) return value
            // The bar recomputes on every edit, but mapping the old positions
            // in the meantime keeps the highlights from flashing off-place.
            return {
              matches: value.matches.map((match) => ({
                from: tr.mapping.map(match.from),
                to: tr.mapping.map(match.to)
              })),
              activeIndex: value.activeIndex
            }
          }
        },
        props: {
          decorations(state) {
            const { matches, activeIndex } = findPluginKey.getState(state) ?? {
              matches: [],
              activeIndex: 0
            }
            if (matches.length === 0) return null
            return DecorationSet.create(
              state.doc,
              matches.map((match, index) =>
                Decoration.inline(match.from, match.to, {
                  class: index === activeIndex ? 'find-match find-match-active' : 'find-match'
                })
              )
            )
          }
        }
      })
    ]
  }
})
