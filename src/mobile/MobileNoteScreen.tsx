import { useEffect, useMemo, useRef, useState } from 'react'
import type { JSONContent } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/react'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Keyboard } from '@capacitor/keyboard'
import { createNoteEditorExtensions } from '@renderer/editor/extensions'
import { imagePasteDropProps } from '@renderer/editor/imagePasteDrop'
import { listPasteProps } from '@renderer/editor/listPaste'
import { MobileEditToolbar } from './MobileEditToolbar'
import { MobileLinkTap } from './mobileLinkTap'
import { IconArrowLeft, IconCheck, IconPencil } from './icons'
import { SAMPLE_NOTE } from './sampleNote'
import '@renderer/styles/editor.css'

const STORAGE_KEY = 'aeronotes.prototype.note'
const NOTE_COLOR = '#bfdbfe'

interface StoredNote {
  title: string
  content: JSONContent
}

/** The prototype keeps its single note in the WebView: no store, no sync yet. */
function loadNote(): StoredNote {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as StoredNote
  } catch {
    // Unreadable storage: start again from the sample.
  }
  return { title: 'Réunion produit', content: SAMPLE_NOTE }
}

function saveNote(note: StoredNote): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(note))
  } catch {
    // Storage full or blocked: the edit stays on screen, only persistence is lost.
  }
}

/** Measures what the keyboard does to the WebView, for testing on a real phone. */
function useKeyboardProbe(): { visible: boolean; height: number } {
  const [probe, setProbe] = useState({ visible: false, height: 0 })
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const show = Keyboard.addListener('keyboardWillShow', (info) => setProbe({ visible: true, height: info.keyboardHeight }))
    const hide = Keyboard.addListener('keyboardWillHide', () => setProbe({ visible: false, height: 0 }))
    return () => {
      void show.then((h) => h.remove())
      void hide.then((h) => h.remove())
    }
  }, [])
  return probe
}

/**
 * One note, full screen, as on the Figma boards 04–06: read mode by default
 * (links open the browser, checkboxes stay tickable), pencil → edit mode with
 * the contextual toolbar above the keyboard, ✓ or Android back → read mode.
 */
export function MobileNoteScreen(): React.JSX.Element {
  const initial = useMemo(loadNote, [])
  const [title, setTitle] = useState(initial.title)
  const [editing, setEditing] = useState(false)
  const contentRef = useRef(initial.content)
  // The editor's onUpdate is created once: it reads the title through a ref.
  const titleRef = useRef(initial.title)
  const containerRef = useRef<HTMLDivElement>(null)
  const keyboard = useKeyboardProbe()
  const [viewport, setViewport] = useState({ inner: window.innerHeight, visual: window.visualViewport?.height ?? 0 })

  const extensions = useMemo(
    () => [
      ...createNoteEditorExtensions({ noteId: 'prototype' })
        // Links: the mobile tap rule replaces the desktop click rule.
        .filter((extension) => extension.name !== 'webLinkClick')
        // Read mode: let the checkbox stay ticked; the change listener below writes it.
        .map((extension) =>
          extension.name === 'taskItem' ? extension.configure({ nested: true, onReadOnlyChecked: () => true }) : extension
        ),
      MobileLinkTap
    ],
    []
  )

  const editor = useEditor({
    immediatelyRender: true,
    editable: false,
    extensions,
    content: initial.content,
    editorProps: {
      ...imagePasteDropProps,
      ...listPasteProps,
      attributes: { spellcheck: 'true' }
    },
    onUpdate: ({ editor: e }) => {
      contentRef.current = e.getJSON()
      saveNote({ title: titleRef.current, content: contentRef.current })
    }
  })

  useEffect(() => {
    titleRef.current = title
    saveNote({ title, content: contentRef.current })
  }, [title])

  useEffect(() => {
    if (!editor) return
    editor.setEditable(editing)
    // Leaving edit mode also closes the keyboard: nothing is left to type into.
    if (editing) editor.commands.focus('end')
    else editor.commands.blur()
  }, [editor, editing])

  // A checkbox ticked in read mode: TaskItem only reports it, so find the item
  // by its DOM node and write the new state into the document ourselves.
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

  // Android back: edit mode → read mode; read mode → leave the app.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const handle = App.addListener('backButton', () => {
      setEditing((wasEditing) => {
        if (!wasEditing) void App.exitApp()
        return false
      })
    })
    return () => void handle.then((h) => h.remove())
  }, [])

  useEffect(() => {
    const update = (): void => setViewport({ inner: window.innerHeight, visual: window.visualViewport?.height ?? 0 })
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [])

  const hideKeyboard = (): void => {
    editor?.commands.blur()
    if (Capacitor.isNativePlatform()) void Keyboard.hide()
  }

  return (
    <div className="flex h-full flex-col bg-[#121214]">
      <div className="mobile-safe-top" />
      <div
        className="relative mx-2.5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[28px]"
        style={{ background: NOTE_COLOR }}
      >
        <div className="flex items-center justify-between px-3 pt-3">
          <button type="button" aria-label="Retour" className="glass-button" onClick={() => setEditing(false)}>
            <IconArrowLeft />
          </button>
          <span className="font-mono text-[10px] text-black/45">
            vh {viewport.inner} · vv {Math.round(viewport.visual)} · kb {keyboard.visible ? keyboard.height : 0}
          </span>
          {editing ? (
            <button type="button" aria-label="Terminer" className="glass-button bg-[#7c9dff] text-[#1e2230]" onClick={() => setEditing(false)}>
              <IconCheck />
            </button>
          ) : (
            <button type="button" aria-label="Modifier" className="glass-button" onClick={() => setEditing(true)}>
              <IconPencil />
            </button>
          )}
        </div>
        <div ref={containerRef} className="note-editor mobile-note min-h-0 flex-1 overflow-y-auto px-5 pb-10 pt-4 text-[16px] leading-relaxed text-[#1e2230]">
          <input
            value={title}
            readOnly={!editing}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Titre"
            className="mb-3 w-full bg-transparent text-[28px] font-bold leading-tight outline-none"
          />
          {editor && <EditorContent editor={editor} />}
        </div>
      </div>
      {editing && editor ? (
        // Above the keyboard there is no navigation bar to clear.
        <div className={keyboard.visible ? '' : 'mobile-safe-pad-bottom bg-[#2a2a31]'}>
          <MobileEditToolbar editor={editor} onHideKeyboard={hideKeyboard} />
        </div>
      ) : (
        <div className="mobile-safe-bottom" style={{ background: NOTE_COLOR }} />
      )}
    </div>
  )
}
