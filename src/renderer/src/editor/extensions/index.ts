import type { AnyExtension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Image from '@tiptap/extension-image'
import Color from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import Placeholder from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { Details, DetailsSummary, DetailsContent } from '@tiptap/extension-details'
import Highlight from '@tiptap/extension-highlight'
import { t } from '@shared/i18n'
import { SlashCommand } from './slashCommand'
import { LocalLink } from './localLink'
import { WebLinkClick } from './webLinkClick'
import { HighlightClick, type HighlightClickOptions } from './highlightClick'
import { NoteLink } from './noteLink'
import { AlphaOrderedList } from './alphaOrderedList'
import { FindInNote } from './findInNote'

interface NoteEditorExtensionOptions extends HighlightClickOptions {
  /** Note being edited — the `[[` picker offers its folder's other notes. */
  noteId?: string
}

export function createNoteEditorExtensions(
  options: NoteEditorExtensionOptions = {}
): AnyExtension[] {
  return [
    StarterKit.configure({
      link: {
        openOnClick: false,
        autolink: true
      }
    }),
    TextStyle,
    Color,
    Placeholder.configure({
      placeholder: t('editor.placeholder')
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    // Corner handles only, ratio locked: an image in a note is a reference to
    // look at, never something to stretch. The size lands in the node's
    // width/height attributes, so it persists and syncs like the rest.
    Image.configure({
      resize: {
        enabled: true,
        directions: ['bottom-left', 'bottom-right', 'top-left', 'top-right'],
        minWidth: 40,
        minHeight: 40,
        alwaysPreserveAspectRatio: true
      }
    }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    Details.configure({
      persist: true,
      // Drawn via CSS (see .note-editor [data-type='details'] > button::before)
      // rather than a Unicode glyph, which can render inconsistently (as a dot
      // in some fonts at small sizes) and made the button hard to read/click.
      renderToggleButton: ({ element, isOpen }) => {
        element.textContent = ''
        element.classList.toggle('is-open', isOpen)
      }
    }),
    DetailsSummary,
    DetailsContent,
    Highlight.configure({ multicolor: true }),
    HighlightClick.configure({ onHighlightClick: options.onHighlightClick }),
    LocalLink,
    NoteLink.configure({ noteId: options.noteId ?? '' }),
    WebLinkClick,
    AlphaOrderedList,
    FindInNote,
    SlashCommand
  ]
}
