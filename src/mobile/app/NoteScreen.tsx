import { useEffect, useMemo, useRef, useState } from 'react'
import type { Note } from '@shared/types'
import { t } from '@shared/i18n'
import { noteColorToCss } from '@shared/colorPalette'
import { EditorContent, useEditor } from '@tiptap/react'
import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'
import { imagePasteDropProps } from '@renderer/editor/imagePasteDrop'
import { listPasteProps } from '@renderer/editor/listPaste'
import { TemplateCarousel } from '@renderer/editor/TemplateCarousel'
import { useEditingLocked } from '@renderer/state/useEditingLocked'
import { MobileEditToolbar } from '../editor/MobileEditToolbar'
import { createMobileEditorExtensions } from '../editor/mobileEditorExtensions'
import { IconArrowLeft, IconCheck, IconMoreHorizontal, IconPencil } from '../icons'
import { NOTE_SHEET_TRANSITION } from './viewTransition'
import '@renderer/styles/editor.css'

interface NoteScreenProps {
  note: Note
  editing: boolean
  onEditingChange: (editing: boolean) => void
  onClose: () => void
  onActions: () => void
}

function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const show = Keyboard.addListener('keyboardWillShow', () => setVisible(true))
    const hide = Keyboard.addListener('keyboardWillHide', () => setVisible(false))
    return () => {
      void show.then((handle) => handle.remove())
      void hide.then((handle) => handle.remove())
    }
  }, [])
  return visible
}

/**
 * A note full screen (Figma boards 04–06). Read mode by default: links open
 * the browser, checkboxes and toggles still work, nothing else changes by
 * accident while scrolling. The pencil switches to edit mode with the
 * contextual toolbar above the keyboard. While the startup sync holds the
 * notes read-only, edit mode waits for it.
 */
export function NoteScreen({ note, editing, onEditingChange, onClose, onActions }: NoteScreenProps): React.JSX.Element {
  const locked = useEditingLocked()
  const editable = editing && !locked
  const keyboardVisible = useKeyboardVisible()
  const containerRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState(note.title)
  const [isEmpty, setIsEmpty] = useState(false)
  const extensions = useMemo(() => createMobileEditorExtensions(note.id), [note.id])

  const editor = useEditor({
    immediatelyRender: true,
    editable: false,
    extensions,
    content: note.content,
    editorProps: { ...imagePasteDropProps, ...listPasteProps, attributes: { spellcheck: 'true' } },
    onCreate: ({ editor: e }) => setIsEmpty(e.isEmpty),
    onUpdate: ({ editor: e }) => {
      setIsEmpty(e.isEmpty)
      window.aeronotes.updateNoteContent(note.id, e.getJSON())
    }
  })

  // A title changed on another machine shows up, unless the user is typing in it.
  useEffect(() => {
    if (document.activeElement !== titleRef.current) setTitle(note.title)
  }, [note.title])

  useEffect(() => {
    if (!editor) return
    editor.setEditable(editable)
    // Leaving edit mode closes the keyboard: nothing is left to type into.
    if (editable) editor.commands.focus(editor.isEmpty ? 'start' : 'end')
    else editor.commands.blur()
  }, [editor, editable])

  // A box ticked in read mode: TaskItem only reports it, so find the item by
  // its DOM node and write the new state into the document.
  useEffect(() => {
    const container = containerRef.current
    if (!container || !editor) return
    const onChange = (event: Event): void => {
      if (editor.isEditable) return
      const input = event.target
      if (!(input instanceof HTMLInputElement) || input.type !== 'checkbox') return
      const item = input.closest('li[data-type="taskItem"]')
      if (!item) return
      let done = false
      editor.state.doc.descendants((node, pos) => {
        if (done) return false
        if (node.type.name === 'taskItem' && editor.view.nodeDOM(pos) === item) {
          editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, checked: input.checked }))
          done = true
        }
        return !done
      })
    }
    container.addEventListener('change', onChange)
    return () => container.removeEventListener('change', onChange)
  }, [editor])

  const hideKeyboard = (): void => {
    editor?.commands.blur()
    if (Capacitor.isNativePlatform()) void Keyboard.hide()
  }

  return (
    <div className="safe-top fixed inset-0 z-20 flex flex-col bg-m-bg">
      <div
        // In read mode the post-it runs under the gesture bar: one element, so
        // a gradient stays continuous to the bottom edge.
        className={`relative mx-2.5 mt-1 flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[28px] text-m-ink ${
          editable && editor ? '' : 'safe-bottom'
        }`}
        style={{ background: noteColorToCss(note.color), viewTransitionName: NOTE_SHEET_TRANSITION }}
      >
        <div className="flex items-center gap-2.5 px-3 pt-3">
          <button type="button" aria-label={t('mobile.back')} className="glass-button" onClick={onClose}>
            <IconArrowLeft />
          </button>
          <span className="flex-1" />
          {!editing && (
            <button type="button" aria-label={t('mobile.noteActions')} className="glass-button" onClick={onActions}>
              <IconMoreHorizontal />
            </button>
          )}
          {editing ? (
            <button
              type="button"
              aria-label={t('mobile.done')}
              className="glass-button bg-accent text-m-ink"
              onClick={() => onEditingChange(false)}
            >
              <IconCheck />
            </button>
          ) : (
            <button
              type="button"
              aria-label={t('mobile.edit')}
              className="glass-button disabled:opacity-50"
              disabled={locked}
              onClick={() => onEditingChange(true)}
            >
              <IconPencil />
            </button>
          )}
        </div>
        <div ref={containerRef} className="note-editor mobile-note no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-12 text-base leading-relaxed">
          <input
            ref={titleRef}
            value={title}
            readOnly={!editable}
            placeholder={t('note.untitled')}
            onChange={(event) => {
              setTitle(event.target.value)
              window.aeronotes.setNoteTitle(note.id, event.target.value)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') editor?.commands.focus('start')
            }}
            className="mb-1 w-full bg-transparent text-[28px] leading-tight font-extrabold outline-none placeholder:text-m-ink/40"
          />
          {editor && <EditorContent editor={editor} />}
          {editable && isEmpty && editor && (
            <TemplateCarousel
              onApply={(content) => {
                editor.commands.setContent(content)
                setIsEmpty(editor.isEmpty)
                window.aeronotes.updateNoteContent(note.id, editor.getJSON())
              }}
            />
          )}
        </div>
        {locked && (
          <div role="status" className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
            <span className="rounded-full bg-m-ink/85 px-3 py-1.5 text-xs text-white">{t('sync.editingLocked')}</span>
          </div>
        )}
      </div>
      {editable && editor && (
        // Above the keyboard there is no navigation bar to clear.
        <div className={keyboardVisible ? '' : 'safe-bottom bg-m-raised'}>
          <MobileEditToolbar editor={editor} onHideKeyboard={hideKeyboard} />
        </div>
      )}
    </div>
  )
}
