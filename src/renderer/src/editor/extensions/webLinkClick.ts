import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

/**
 * StarterKit's Link is configured with `openOnClick: false` because its default
 * handler goes through `window.open`, which in Electron spawns a blank child
 * window instead of the user's browser. This plugin routes clicks on web links
 * through the main process (`shell.openExternal`) so they open in the default
 * OS browser.
 *
 * The link is read from the clicked DOM element, not from the marks at the
 * click position: a click in the empty space beside a link (to type after it)
 * resolves to the link's edge, whose marks can still include the link.
 */
export const WebLinkClick = Extension.create({
  name: 'webLinkClick',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('webLinkClick'),
        props: {
          handleClick: (view, _pos, event) => {
            const target = event.target instanceof Element ? event.target : null
            const anchor = target?.closest('a[href]')
            if (!anchor || !view.dom.contains(anchor)) return false
            const href = anchor.getAttribute('href')
            if (!href) return false
            void window.aeronotes.openExternalUrl(href)
            return true
          }
        }
      })
    ]
  }
})
