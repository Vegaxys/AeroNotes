import { Extension } from '@tiptap/core'
import { ReactRenderer } from '@tiptap/react'
import Suggestion from '@tiptap/suggestion'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import { SlashCommandList, type SlashCommandListHandle } from './SlashCommandList'
import { SLASH_COMMAND_ITEMS, type SlashCommandItem } from './slashCommandItems'

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashCommandItem>({
        editor: this.editor,
        char: '/',
        startOfLine: false,
        items: ({ query }) =>
          SLASH_COMMAND_ITEMS.filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase())
          ).slice(0, 10),
        command: ({ editor, range, props }) => {
          props.command({ editor, range })
        },
        render: () => {
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
                placement: 'bottom-start'
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
      })
    ]
  }
})
