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
import { SlashCommand } from './slashCommand'
import { LocalLink } from './localLink'

export function createNoteEditorExtensions(): AnyExtension[] {
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
      placeholder: "Ecrire quelque chose... ('/' pour les commandes)"
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
      renderToggleButton: ({ element, isOpen }) => {
        element.textContent = isOpen ? '▾' : '▸'
      }
    }),
    DetailsSummary,
    DetailsContent,
    LocalLink,
    SlashCommand
  ]
}
