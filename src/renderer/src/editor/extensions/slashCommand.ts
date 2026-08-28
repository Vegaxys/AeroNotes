import { Extension } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import Suggestion from '@tiptap/suggestion'
import { getSlashCommandItems, type SlashCommandItem } from './slashCommandItems'
import { createSuggestionRenderer } from './suggestionPopup'

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashCommandItem>({
        editor: this.editor,
        // Explicit key: the note-link picker is a second Suggestion plugin in
        // the same editor, and they may not share the default key.
        pluginKey: new PluginKey('slashCommandSuggestion'),
        char: '/',
        startOfLine: false,
        items: ({ query }) =>
          getSlashCommandItems()
            .filter((item) => item.title.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 10),
        command: ({ editor, range, props }) => {
          props.command({ editor, range })
        },
        render: createSuggestionRenderer()
      })
    ]
  }
})
