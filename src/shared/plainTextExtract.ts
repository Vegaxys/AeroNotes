import type { JSONContent } from '@tiptap/core'

export function extractPlainText(content: JSONContent | undefined): string {
  if (!content) return ''

  let text = ''

  function walk(node: JSONContent): void {
    if (node.text) {
      text += node.text
    }
    // A [[note link]] carries its label in an attribute, not in a text node —
    // without this, searching a note's title would not find the notes linking to it.
    if (node.type === 'noteLink' && typeof node.attrs?.title === 'string') {
      text += node.attrs.title + ' '
    }
    if (node.type === 'paragraph' || node.type === 'heading') {
      text += ' '
    }
    node.content?.forEach(walk)
  }

  walk(content)
  return text.trim().replace(/\s+/g, ' ')
}
