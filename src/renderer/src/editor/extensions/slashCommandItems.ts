import type { Editor, Range } from '@tiptap/core'
import { t } from '@shared/i18n'
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

// A function, not a top-level const: titles must be resolved through t() at
// menu-open time so a locale switch is picked up without a reload.
export function getSlashCommandItems(): SlashCommandItem[] {
  return [
  {
    title: t('slash.heading1'),
    icon: 'H1',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run()
  },
  {
    title: t('slash.heading2'),
    icon: 'H2',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run()
  },
  {
    title: t('slash.bulletList'),
    icon: '•',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run()
  },
  {
    title: t('slash.numberedList'),
    icon: '1.',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run()
  },
  {
    title: t('slash.checklist'),
    icon: '☑',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleTaskList().run()
  },
  {
    title: t('slash.toggle'),
    icon: '▸',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setDetails().run()
  },
  {
    title: t('slash.table'),
    icon: '▦',
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  },
  {
    title: t('slash.image'),
    icon: '🖼',
    // File picker, not window.prompt: prompt() is a silent no-op in Electron.
    command: ({ editor, range }) => {
      void (async () => {
        const url = await window.aeronotes.importImage()
        if (!url) {
          editor.chain().focus().deleteRange(range).run()
          return
        }
        editor.chain().focus().deleteRange(range).setImage({ src: url }).run()
      })()
    }
  },
  {
    title: t('slash.fileLink'),
    icon: '📄',
    command: ({ editor, range }) => {
      void insertLocalLink(editor, range, 'file')
    }
  },
  {
    title: t('slash.folderLink'),
    icon: '📁',
    command: ({ editor, range }) => {
      void insertLocalLink(editor, range, 'folder')
    }
  },
  {
    title: t('slash.quote'),
    icon: '❝',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run()
  },
  {
    title: t('slash.divider'),
    icon: '—',
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHorizontalRule().run()
  }
  ]
}
