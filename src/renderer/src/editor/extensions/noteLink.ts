import { mergeAttributes, Node } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import Suggestion from '@tiptap/suggestion'
import { t } from '@shared/i18n'
import { useNotesStore } from '@renderer/state/useNotesStore'
import type { SlashCommandItem } from './slashCommandItems'
import { createSuggestionRenderer } from './suggestionPopup'

export interface NoteLinkOptions {
  /** The note being edited: links are offered inside its folder, minus itself. */
  noteId: string
}

const MAX_SUGGESTIONS = 8

/**
 * `[[Title]]` links between notes.
 *
 * An inline atom rather than a mark: the target is identified by id, so
 * renaming the note it points to can never break the link, and the visible
 * text stays exactly what was picked. `renderText` gives back the `[[Title]]`
 * syntax (Markdown export, plain-text copy), and `extractPlainText` reads the
 * same attribute so a note is findable by the notes that link TO it.
 */
export const NoteLink = Node.create<NoteLinkOptions>({
  name: 'noteLink',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return { noteId: '' }
  },

  addAttributes() {
    return {
      noteId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-note-id'),
        renderHTML: (attrs) => ({ 'data-note-id': attrs.noteId })
      },
      title: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-title'),
        renderHTML: (attrs) => ({ 'data-title': attrs.title })
      }
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-note-link]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { 'data-note-link': '', class: 'note-link' }),
      `[[${node.attrs.title}]]`
    ]
  },

  renderText({ node }) {
    return `[[${node.attrs.title}]]`
  },

  addProseMirrorPlugins() {
    const sourceNoteId = this.options.noteId

    /** Notes of the same folder, minus this one, matching the typed query. */
    const matchingNotes = (query: string): Array<{ id: string; title: string }> => {
      const { notes } = useNotesStore.getState()
      const folderId = notes.find((note) => note.id === sourceNoteId)?.folderId
      const needle = query.trim().toLowerCase()
      return notes
        .filter(
          (note) =>
            note.id !== sourceNoteId &&
            note.folderId === folderId &&
            (needle === '' || note.title.toLowerCase().includes(needle))
        )
        .slice(0, MAX_SUGGESTIONS)
        .map((note) => ({ id: note.id, title: note.title }))
    }

    const insertLink = (
      { editor, range }: Parameters<SlashCommandItem['command']>[0],
      noteId: string,
      title: string
    ): void => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent([{ type: 'noteLink', attrs: { noteId, title } }, { type: 'text', text: ' ' }])
        .run()
    }

    return [
      Suggestion<SlashCommandItem>({
        editor: this.editor,
        // Every Suggestion plugin defaults to the same key ('suggestion$'), and
        // ProseMirror refuses two plugins sharing a key — without this the
        // editor throws as soon as the slash menu is also registered.
        pluginKey: new PluginKey('noteLinkSuggestion'),
        char: '[[',
        startOfLine: false,
        items: ({ query }) => {
          const items: SlashCommandItem[] = matchingNotes(query).map((note) => ({
            title: note.title || t('note.untitled'),
            icon: '📝',
            command: (args) => insertLink(args, note.id, note.title || t('note.untitled'))
          }))
          // Nothing matches exactly: offer to create that note on the spot.
          const typed = query.trim()
          if (
            typed !== '' &&
            !items.some((item) => item.title.toLowerCase() === typed.toLowerCase())
          ) {
            items.push({
              title: t('noteLink.create', { title: typed }),
              icon: '+',
              command: ({ editor, range }) => {
                const { notes, currentFolderId } = useNotesStore.getState()
                const folderId =
                  notes.find((note) => note.id === sourceNoteId)?.folderId ?? currentFolderId
                if (!folderId) return
                editor.chain().focus().deleteRange(range).run()
                void window.aeronotes.addNote(folderId).then((created) => {
                  window.aeronotes.setNoteTitle(created.id, typed)
                  editor
                    .chain()
                    .focus()
                    .insertContent([
                      { type: 'noteLink', attrs: { noteId: created.id, title: typed } },
                      { type: 'text', text: ' ' }
                    ])
                    .run()
                })
              }
            })
          }
          return items
        },
        command: ({ editor, range, props }) => {
          props.command({ editor, range })
        },
        render: createSuggestionRenderer()
      }),

      // Clicking a link opens (or focuses) the note it points to.
      new Plugin({
        key: new PluginKey('noteLinkClick'),
        props: {
          handleClick: (_view, _pos, event) => {
            const target = event.target instanceof HTMLElement ? event.target : null
            const link = target?.closest('[data-note-link]')
            const noteId = link?.getAttribute('data-note-id')
            if (!noteId) return false
            void window.aeronotes.detachNote(noteId)
            return true
          }
        }
      })
    ]
  }
})
