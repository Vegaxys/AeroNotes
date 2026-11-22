import { useState } from 'react'
import type { Editor } from '@tiptap/core'
import { useEditorState } from '@tiptap/react'
import { HIGHLIGHT_COLORS } from '@renderer/editor/highlightColors'
import { normalizeWebUrl } from '@renderer/editor/linkUrl'
import { TEXT_COLORS } from '@renderer/editor/textColors'
import {
  IconBrush,
  IconCheckSquare,
  IconImage,
  IconKeyboard,
  IconLink,
  IconList,
  IconPlus,
  IconRedo,
  IconTrash,
  IconUndo
} from './icons'

interface MobileEditToolbarProps {
  editor: Editor
  onHideKeyboard: () => void
}

interface ToolButtonProps {
  label: string
  active?: boolean
  disabled?: boolean
  danger?: boolean
  onPress: () => void
  children: React.ReactNode
  className?: string
}

/**
 * Pressing a tool must not take the focus from the editor: that would close
 * the keyboard and drop the selection the tool is about to format.
 */
const keepEditorFocus = (event: React.SyntheticEvent): void => event.preventDefault()

function ToolButton({ label, active, disabled, danger, onPress, children, className = '' }: ToolButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onPointerDown={keepEditorFocus}
      onMouseDown={keepEditorFocus}
      onClick={onPress}
      className={`flex h-11 min-w-11 shrink-0 items-center justify-center rounded-xl px-2 text-[17px] disabled:opacity-35 ${
        active ? 'bg-[#7c9dff]/20 text-[#7c9dff]' : danger ? 'text-red-400' : 'text-[#f3f4f7]'
      } ${className}`}
    >
      {children}
    </button>
  )
}

const Separator = (): React.JSX.Element => <span className="mx-1 h-6 w-px shrink-0 bg-white/10" />

type Palette = 'text' | 'highlight' | null

/**
 * Bar pinned above the keyboard in edit mode. It swaps its tools with the
 * selection (Figma « edit-toolbar »): caret → blocks and history, text
 * selected → inline marks, caret in a table → rows and columns.
 */
export function MobileEditToolbar({ editor, onHideKeyboard }: MobileEditToolbarProps): React.JSX.Element {
  const [palette, setPalette] = useState<Palette>(null)
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      hasSelection: !e.state.selection.empty,
      inTable: e.isActive('table'),
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      strike: e.isActive('strike'),
      code: e.isActive('code'),
      link: e.isActive('link'),
      headingLevel: ([1, 2, 3] as const).find((level) => e.isActive('heading', { level })) ?? 0,
      taskList: e.isActive('taskList'),
      bulletList: e.isActive('bulletList'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
      textColor: e.getAttributes('textStyle').color as string | undefined
    })
  })

  const chain = () => editor.chain().focus()

  // Opens the shared slash menu: it only triggers at a word start.
  const openInsertMenu = (): void => {
    const { from } = editor.state.selection
    const before = editor.state.doc.textBetween(Math.max(0, from - 1), from)
    chain().insertContent(before && before !== ' ' ? ' /' : '/').run()
  }

  const cycleBlockStyle = (): void => {
    const next = state.headingLevel === 3 ? 0 : state.headingLevel + 1
    if (next === 0) chain().setParagraph().run()
    else chain().setHeading({ level: next as 1 | 2 | 3 }).run()
  }

  const insertImage = async (): Promise<void> => {
    const src = await window.aeronotes.importImage()
    if (src) chain().setImage({ src }).run()
  }

  const toggleLink = (): void => {
    if (state.link) {
      chain().extendMarkRange('link').unsetLink().run()
      return
    }
    const url = window.prompt('Lien', 'https://')?.trim()
    if (url && url !== 'https://') chain().extendMarkRange('link').setLink({ href: normalizeWebUrl(url) }).run()
  }

  const togglePalette = (which: Exclude<Palette, null>): void => setPalette((p) => (p === which ? null : which))

  let tools: React.ReactNode
  if (state.inTable) {
    tools = (
      <>
        <ToolButton label="Ajouter une ligne" onPress={() => chain().addRowAfter().run()} className="text-sm font-medium">+ Ligne</ToolButton>
        <ToolButton label="Ajouter une colonne" onPress={() => chain().addColumnAfter().run()} className="text-sm font-medium">+ Colonne</ToolButton>
        <ToolButton label="Supprimer la ligne" onPress={() => chain().deleteRow().run()} className="text-sm font-medium">− Ligne</ToolButton>
        <ToolButton label="Supprimer la colonne" onPress={() => chain().deleteColumn().run()} className="text-sm font-medium">− Col.</ToolButton>
        <Separator />
        <ToolButton label="Supprimer le tableau" danger onPress={() => chain().deleteTable().run()}><IconTrash /></ToolButton>
      </>
    )
  } else if (state.hasSelection) {
    tools = (
      <>
        <ToolButton label="Gras" active={state.bold} onPress={() => chain().toggleBold().run()}><b>B</b></ToolButton>
        <ToolButton label="Italique" active={state.italic} onPress={() => chain().toggleItalic().run()}><i className="font-serif">I</i></ToolButton>
        <ToolButton label="Barré" active={state.strike} onPress={() => chain().toggleStrike().run()}><s>S</s></ToolButton>
        <ToolButton label="Code" active={state.code} onPress={() => chain().toggleCode().run()} className="font-mono text-sm">{'</>'}</ToolButton>
        <ToolButton label="Lien" active={state.link} onPress={toggleLink}><IconLink /></ToolButton>
        <Separator />
        <ToolButton label="Couleur du texte" active={palette === 'text'} onPress={() => togglePalette('text')}>
          <span className="flex flex-col items-center leading-none">
            <b>A</b>
            <span className="mt-0.5 h-[3px] w-4 rounded-full" style={{ background: state.textColor ?? '#fbbf24' }} />
          </span>
        </ToolButton>
        <ToolButton label="Surligner" active={palette === 'highlight'} onPress={() => togglePalette('highlight')}><IconBrush /></ToolButton>
        <ToolButton label="Titre" active={state.headingLevel === 2} onPress={() => chain().toggleHeading({ level: 2 }).run()}><b>H</b></ToolButton>
      </>
    )
  } else {
    tools = (
      <>
        <ToolButton label="Insérer un bloc" active onPress={openInsertMenu}><IconPlus /></ToolButton>
        <ToolButton label="Style du bloc" active={state.headingLevel > 0} onPress={cycleBlockStyle} className="text-base font-bold">
          {state.headingLevel ? `H${state.headingLevel}` : 'Aa'}
        </ToolButton>
        <ToolButton label="Checklist" active={state.taskList} onPress={() => chain().toggleTaskList().run()}><IconCheckSquare /></ToolButton>
        <ToolButton label="Liste" active={state.bulletList} onPress={() => chain().toggleBulletList().run()}><IconList /></ToolButton>
        <ToolButton label="Image" onPress={() => void insertImage()}><IconImage /></ToolButton>
        <Separator />
        <ToolButton label="Annuler" disabled={!state.canUndo} onPress={() => chain().undo().run()}><IconUndo /></ToolButton>
        <ToolButton label="Rétablir" disabled={!state.canRedo} onPress={() => chain().redo().run()}><IconRedo /></ToolButton>
      </>
    )
  }

  const swatches = palette === 'text' ? TEXT_COLORS : HIGHLIGHT_COLORS
  return (
    <div className="border-t border-white/10 bg-[#2a2a31]">
      {palette && state.hasSelection && (
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-2">
          {swatches.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={color}
              onPointerDown={keepEditorFocus}
              onMouseDown={keepEditorFocus}
              onClick={() => {
                if (palette === 'text') chain().setColor(color).run()
                else chain().toggleHighlight({ color }).run()
              }}
              className={`h-8 w-8 border border-white/20 ${palette === 'text' ? 'rounded-full' : 'rounded-md'}`}
              style={{ background: color }}
            />
          ))}
          <button
            type="button"
            onPointerDown={keepEditorFocus}
            onMouseDown={keepEditorFocus}
            onClick={() => (palette === 'text' ? chain().unsetColor().run() : chain().unsetHighlight().run())}
            className="ml-auto rounded-lg px-3 py-1.5 text-sm text-white/70"
          >
            Aucune
          </button>
        </div>
      )}
      <div className="flex h-14 items-center px-1.5">
        <div className="flex min-w-0 flex-1 items-center overflow-x-auto [scrollbar-width:none]">{tools}</div>
        <ToolButton label="Masquer le clavier" onPress={onHideKeyboard} className="text-white/60"><IconKeyboard /></ToolButton>
      </div>
    </div>
  )
}
