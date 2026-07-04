import type { JSONContent } from '@tiptap/core'

export function extractPlainText(content: JSONContent | undefined): string {
  if (!content) return ''

  let text = ''

  function walk(node: JSONContent): void {
    if (node.text) {
      text += node.text
    }
    if (node.type === 'paragraph' || node.type === 'heading') {
      text += ' '
    }
    node.content?.forEach(walk)
  }

  walk(content)
  return text.trim().replace(/\s+/g, ' ')
}
