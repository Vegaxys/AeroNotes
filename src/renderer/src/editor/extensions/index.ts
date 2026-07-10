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
import { AlphaOrderedList } from './alphaOrderedList'

export function createNoteEditorExtensions(options: HighlightClickOptions = {}): AnyExtension[] {
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
    Image,
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
    WebLinkClick,
    AlphaOrderedList,
    SlashCommand
  ]
}
