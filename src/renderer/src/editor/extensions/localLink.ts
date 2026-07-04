import { Mark, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export type LocalLinkKind = 'file' | 'folder'

export interface LocalLinkAttributes {
  path: string
  kind: LocalLinkKind
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    localLink: {
      setLocalLink: (attrs: LocalLinkAttributes) => ReturnType
      unsetLocalLink: () => ReturnType
    }
  }
}

export const LocalLink = Mark.create({
  name: 'localLink',

  addAttributes() {
    return {
      path: { default: null },
      kind: { default: 'file' }
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-local-link]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { 'data-local-link': '', class: 'local-link' }),
      0
    ]
  },

  addCommands() {
    return {
      setLocalLink:
        (attrs: LocalLinkAttributes) =>
        ({ chain }) =>
          chain().setMark(this.name, attrs).run(),
      unsetLocalLink:
        () =>
        ({ chain }) =>
          chain().unsetMark(this.name).run()
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('localLinkClick'),
        props: {
          handleClick: (view, pos) => {
            const mark = view.state.doc.resolve(pos).marks().find((m) => m.type.name === 'localLink')
            if (!mark) return false
            const { path, kind } = mark.attrs as LocalLinkAttributes
            void window.aeronotes.openLocalPath(path, kind)
            return true
          }
        }
      })
    ]
  }
})
