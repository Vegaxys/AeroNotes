import { useRef } from 'react'
import type { JSONContent } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import { createNoteEditorExtensions } from './extensions'
import { BubbleToolbar } from './BubbleToolbar'
import { TableControls } from './TableControls'
import { BlockDragHandle } from './BlockDragHandle'
import { imagePasteDropProps } from './imagePasteDrop'
import '../styles/editor.css'

interface NoteEditorProps {
  content?: JSONContent
  onChange?: (content: JSONContent) => void
}

export function NoteEditor({ content, onChange }: NoteEditorProps): React.JSX.Element | null {
  const containerRef = useRef<HTMLDivElement>(null)

  const editor = useEditor({
    immediatelyRender: true,
    extensions: createNoteEditorExtensions(),
    content,
    editorProps: {
      ...imagePasteDropProps,
      // No correction UI is wired up, so the spellcheck squiggly underline is just noise.
      attributes: { spellcheck: 'false' }
    },
    onUpdate: ({ editor }) => onChange?.(editor.getJSON())
  })

  if (!editor) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className="note-editor relative h-full overflow-y-auto py-3 pl-10 pr-4 text-sm text-black/90"
    >
      <BubbleToolbar editor={editor} />
      <BlockDragHandle editor={editor} containerRef={containerRef} />
      <TableControls editor={editor} containerRef={containerRef} />
      <EditorContent editor={editor} />
    </div>
  )
}
