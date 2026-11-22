import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

/**
 * Mobile replacement for the desktop `webLinkClick`: a tapped link opens the
 * browser only in read mode. While editing, a tap on a link must place the
 * caret in it, as everywhere else in the text.
 */
export const MobileLinkTap = Extension.create({
  name: 'mobileLinkTap',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('mobileLinkTap'),
        props: {
          handleClick: (view, _pos, event) => {
            if (view.editable) return false
            const target = event.target instanceof Element ? event.target : null
            const anchor = target?.closest('a[href]')
            const href = anchor && view.dom.contains(anchor) ? anchor.getAttribute('href') : null
            if (!href) return false
            void window.aeronotes.openExternalUrl(href)
            return true
          }
        }
      })
    ]
  }
})
