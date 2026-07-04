import type { Editor, Range } from '@tiptap/core'
import type { LocalLinkKind } from './localLink'

export interface SlashCommandItem {
  title: string
  icon: string
  command: (args: { editor: Editor; range: Range }) => void
}

function basename(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}

async function insertLocalLink(editor: Editor, range: Range, kind: LocalLinkKind): Promise<void> {
  const path = await window.aeronotes.pickLocalPath(kind)
  if (!path) {
    editor.chain().focus().deleteRange(range).run()
    return
  }
  editor
    .chain()
    .focus()
    .deleteRange(range)
    .insertContent([
      { type: 'text', text: basename(path), marks: [{ type: 'localLink', attrs: { path, kind } }] }
    ])
    .run()
}

export const SLASH_COMMAND_ITEMS: SlashCommandItem[] = [
  {
    title: 'Titre 1',
    icon: 'H1',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
  },
  {
    title: 'Titre 2',
    icon: 'H2',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
  },
  {
    title: 'Liste a puces',
    icon: '•',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run()
  },
  {
    title: 'Liste numerotee',
    icon: '1.',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run()
  },
  {
    title: 'Checklist',
    icon: '☑',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleTaskList().run()
  },
  {
    title: 'Bloc repliable',
    icon: '▸',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setDetails().run()
  },
  {
    title: 'Tableau',
    icon: '▦',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  },
  {
    title: 'Image',
    icon: '🖼',
    command: ({ editor, range }) => {
      const url = window.prompt("URL de l'image")
      if (!url) {
        editor.chain().focus().deleteRange(range).run()
        return
      }
      editor.chain().focus().deleteRange(range).setImage({ src: url }).run()
    }
  },
  {
    title: 'Lien vers un fichier',
    icon: '📄',
    command: ({ editor, range }) => {
      void insertLocalLink(editor, range, 'file')
    }
  },
  {
    title: 'Lien vers un dossier',
    icon: '📁',
    command: ({ editor, range }) => {
      void insertLocalLink(editor, range, 'folder')
    }
  },
  {
    title: 'Citation',
    icon: '❝',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run()
  },
  {
    title: 'Separateur',
    icon: '—',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run()
  }
]
