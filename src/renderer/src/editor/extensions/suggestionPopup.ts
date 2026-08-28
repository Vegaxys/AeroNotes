import { ReactRenderer } from '@tiptap/react'
import type { SuggestionOptions } from '@tiptap/suggestion'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import { SlashCommandList, type SlashCommandListHandle } from './SlashCommandList'
import type { SlashCommandItem } from './slashCommandItems'

/**
 * The tippy popup shared by the editor's suggestion menus (the `/` command
 * menu and the `[[` note-link picker): same list component, same keyboard
 * handling, same flip/overflow behaviour in small post-it windows.
 */
export function createSuggestionRenderer(): SuggestionOptions<SlashCommandItem>['render'] {
  return () => {
    let component: ReactRenderer<SlashCommandListHandle>
    let popup: TippyInstance[]

    return {
      onStart: (props) => {
        component = new ReactRenderer(SlashCommandList, {
          props,
          editor: props.editor
        })
        if (!props.clientRect) return

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect as () => DOMRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
          // Note windows are small, so the menu must reposition itself to
          // stay fully visible rather than get clipped near an edge.
          popperOptions: {
            modifiers: [
              {
                name: 'flip',
                options: { fallbackPlacements: ['top-start', 'bottom-end', 'top-end'] }
              },
              { name: 'preventOverflow', options: { boundary: 'clippingParents', padding: 8 } }
            ]
          }
        })
      },
      onUpdate(props) {
        component.updateProps(props)
        if (!props.clientRect) return
        popup[0]?.setProps({ getReferenceClientRect: props.clientRect as () => DOMRect })
      },
      onKeyDown(props) {
        if (props.event.key === 'Escape') {
          popup[0]?.hide()
          return true
        }
        return component.ref?.onKeyDown(props) ?? false
      },
      onExit() {
        popup[0]?.destroy()
        component.destroy()
      }
    }
  }
}
