import { BubbleMenu } from '@tiptap/react/menus'
import type { Editor } from '@tiptap/react'

interface BubbleToolbarProps {
  editor: Editor
}

interface ToolbarButtonProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

const TEXT_COLORS = ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#c084fc']

function ToolbarButton({ active, onClick, children }: ToolbarButtonProps): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`flex h-7 min-w-7 items-center justify-center rounded-[var(--radius-sm)] px-1.5 text-xs font-medium text-white/90 ${
        active ? 'bg-white/25' : 'hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  )
}

export function BubbleToolbar({ editor }: BubbleToolbarProps): React.JSX.Element {
  const activeColor = editor.getAttributes('textStyle').color as string | undefined

  const setLink = (): void => {
    const previousUrl = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('URL du lien', previousUrl ?? '')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="textBubbleMenu"
      options={{ flip: true, shift: { padding: 8 }, offset: 8 }}
      className="flex max-w-[260px] flex-wrap items-center gap-1 rounded-[var(--radius-md)] border border-white/15 bg-neutral-900/95 p-1 shadow-2xl"
    >
      <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        B
      </ToolbarButton>
      <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        i
      </ToolbarButton>
      <ToolbarButton active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
        S
      </ToolbarButton>
      <ToolbarButton active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
        {'</>'}
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        H1
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <ToolbarButton active={editor.isActive('link')} onClick={setLink}>
        🔗
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-white/15" />
      {TEXT_COLORS.map((color) => (
        <button
          key={color}
          onClick={() => editor.chain().focus().setColor(color).run()}
          className={`h-5 w-5 rounded-full border border-white/20 ${
            activeColor === color ? 'ring-2 ring-offset-1 ring-offset-neutral-900 ring-white' : ''
          }`}
          style={{ background: color }}
          aria-label={`Couleur ${color}`}
        />
      ))}
      <button
        onClick={() => editor.chain().focus().unsetColor().run()}
        className={`flex h-5 w-5 items-center justify-center rounded-full border border-white/20 text-[10px] text-white/70 ${
          !activeColor ? 'ring-2 ring-offset-1 ring-offset-neutral-900 ring-white' : ''
        }`}
        aria-label="Retirer la couleur"
      >
        ×
      </button>
    </BubbleMenu>
  )
}
