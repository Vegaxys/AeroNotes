import type { EditorProps } from '@tiptap/pm/view'

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function insertImageAt(
  view: Parameters<NonNullable<EditorProps['handlePaste']>>[0],
  file: File,
  pos?: number
): Promise<void> {
  const dataUrl = await fileToDataUrl(file)
  const src = await window.aeronotes.saveImage(dataUrl)
  const { schema, tr, selection } = view.state
  const node = schema.nodes.image.create({ src })
  view.dispatch(tr.insert(pos ?? selection.from, node))
}

export const imagePasteDropProps: EditorProps = {
  handlePaste(view, event) {
    const item = Array.from(event.clipboardData?.items ?? []).find((i) =>
      i.type.startsWith('image/')
    )
    const file = item?.getAsFile()
    if (!file) return false
    event.preventDefault()
    void insertImageAt(view, file)
    return true
  },
  handleDrop(view, event) {
    const file = Array.from(event.dataTransfer?.files ?? []).find((f) =>
      f.type.startsWith('image/')
    )
    if (!file) return false
    event.preventDefault()
    const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
    void insertImageAt(view, file, coords?.pos)
    return true
  }
}
