import type { JSONContent } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import { DragHandle } from '@tiptap/extension-drag-handle-react'
import { createNoteEditorExtensions } from './extensions'
import { BubbleToolbar } from './BubbleToolbar'
import { imagePasteDropProps } from './imagePasteDrop'
import '../styles/editor.css'

interface NoteEditorProps {
  content?: JSONContent
  onChange?: (content: JSONContent) => void
}

export function NoteEditor({ content, onChange }: NoteEditorProps): React.JSX.Element | null {
  const editor = useEditor({
    immediatelyRender: true,
    extensions: createNoteEditorExtensions(),
    content,
    editorProps: imagePasteDropProps,
    onUpdate: ({ editor }) => onChange?.(editor.getJSON())
  })

  if (!editor) {
    return null
  }

  return (
    <div className="note-editor h-full overflow-y-auto px-4 py-3 text-sm text-black/90">
      <BubbleToolbar editor={editor} />
      <DragHandle editor={editor}>
        <div className="drag-handle-grip" />
      </DragHandle>
      <EditorContent editor={editor} />
    </div>
  )
}
