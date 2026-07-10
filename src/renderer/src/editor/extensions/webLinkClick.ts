import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

/**
 * StarterKit's Link is configured with `openOnClick: false` because its default
 * handler goes through `window.open`, which in Electron spawns a blank child
 * window instead of the user's browser. This plugin routes clicks on web links
 * through the main process (`shell.openExternal`) so they open in the default
 * OS browser.
 */
export const WebLinkClick = Extension.create({
  name: 'webLinkClick',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('webLinkClick'),
        props: {
          handleClick: (view, pos) => {
            const mark = view.state.doc.resolve(pos).marks().find((m) => m.type.name === 'link')
            if (!mark) return false
            const href = mark.attrs.href as string | null
            if (!href) return false
            void window.aeronotes.openExternalUrl(href)
            return true
          }
        }
      })
    ]
  }
})
