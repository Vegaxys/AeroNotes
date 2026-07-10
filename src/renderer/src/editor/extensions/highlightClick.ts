import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export interface HighlightClickOptions {
  onHighlightClick?: (event: MouseEvent) => void
}

/**
 * Notifies the host component when the user clicks inside a highlight mark so
 * it can show the color-swap popup (see NoteEditor). handleClick returns false
 * on purpose: the click must still place the caret normally — the popup's
 * commands then use extendMarkRange('highlight') from that caret position.
 */
export const HighlightClick = Extension.create<HighlightClickOptions>({
  name: 'highlightClick',

  addOptions() {
    return { onHighlightClick: undefined }
  },

  addProseMirrorPlugins() {
    const { onHighlightClick } = this.options
    return [
      new Plugin({
        key: new PluginKey('highlightClick'),
        props: {
          handleClick: (view, pos, event) => {
            if (!onHighlightClick) return false
            const hasHighlight = view.state.doc
              .resolve(pos)
              .marks()
              .some((mark) => mark.type.name === 'highlight')
            if (hasHighlight) onHighlightClick(event)
            return false
          }
        }
      })
    ]
  }
})
