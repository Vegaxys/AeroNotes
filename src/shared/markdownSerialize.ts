import type { JSONContent } from '@tiptap/core'

/**
 * ProseMirror JSON -> Markdown, for the "Export as Markdown" action.
 *
 * Hand-written rather than pulled from prosemirror-markdown: the note schema
 * carries nodes that library doesn't know (task lists, details/toggles,
 * tables, local links), and the app ships no Markdown dependency. GitHub
 * flavour: task lists as `- [ ]`, tables as pipe rows, toggles kept as HTML
 * <details> (there is no Markdown for them).
 */

const MARK_WRAPPERS: Record<string, string> = {
  bold: '**',
  italic: '*',
  strike: '~~',
  code: '`'
}

/** Inline content of a node: text with its marks, images, note links. */
function serializeInline(nodes: JSONContent[] | undefined): string {
  if (!nodes) return ''
  return nodes
    .map((node) => {
      if (node.type === 'hardBreak') return '  \n'
      if (node.type === 'image') {
        const alt = typeof node.attrs?.alt === 'string' ? node.attrs.alt : ''
        return `![${alt}](${node.attrs?.src ?? ''})`
      }
      // Note link: keep the wiki syntax it was typed with.
      if (node.type === 'noteLink') return `[[${node.attrs?.title ?? ''}]]`
      if (!node.text) return ''

      let text = node.text
      for (const mark of node.marks ?? []) {
        const wrapper = MARK_WRAPPERS[mark.type]
        if (wrapper) {
          text = `${wrapper}${text}${wrapper}`
        } else if (mark.type === 'link') {
          text = `[${text}](${mark.attrs?.href ?? ''})`
        } else if (mark.type === 'localLink') {
          text = `[${text}](${mark.attrs?.path ?? ''})`
        }
        // highlight / textStyle colors have no Markdown equivalent: dropped.
      }
      return text
    })
    .join('')
}

function serializeListItems(node: JSONContent, indent: string, bullet: (index: number) => string): string {
  return (node.content ?? [])
    .map((item, index) => {
      const marker = bullet(index)
      const body = serializeBlocks(item.content, `${indent}${' '.repeat(marker.length)}`)
      // The marker replaces the indent of the item's FIRST line only.
      return `${indent}${marker}${body.trimStart()}`
    })
    .join('')
}

function serializeTable(node: JSONContent): string {
  const rows = (node.content ?? []).map((row) =>
    (row.content ?? []).map((cell) => serializeBlocks(cell.content, '').trim().replace(/\n+/g, ' '))
  )
  if (rows.length === 0) return ''
  const [header, ...body] = rows
  const separator = header.map(() => '---')
  return [header, separator, ...body].map((cells) => `| ${cells.join(' | ')} |`).join('\n') + '\n\n'
}

/** Block-level content. `indent` prefixes every line (list nesting). */
function serializeBlocks(nodes: JSONContent[] | undefined, indent = ''): string {
  if (!nodes) return ''

  return nodes
    .map((node) => {
      switch (node.type) {
        case 'paragraph':
          return `${indent}${serializeInline(node.content)}\n\n`
        case 'heading':
          return `${indent}${'#'.repeat(Number(node.attrs?.level ?? 1))} ${serializeInline(node.content)}\n\n`
        case 'bulletList':
          return serializeListItems(node, indent, () => '- ')
        case 'orderedList':
        case 'alphaOrderedList': {
          const start = Number(node.attrs?.start ?? 1)
          return serializeListItems(node, indent, (index) => `${start + index}. `)
        }
        case 'listItem':
          return serializeBlocks(node.content, indent)
        case 'taskList':
          return (node.content ?? [])
            .map((item) => {
              const box = item.attrs?.checked ? '[x]' : '[ ]'
              const body = serializeBlocks(item.content, `${indent}    `)
              return `${indent}- ${box} ${body.trimStart()}`
            })
            .join('')
        case 'blockquote':
          return serializeBlocks(node.content, indent)
            .trimEnd()
            .split('\n')
            .map((line) => `> ${line}`)
            .join('\n') + '\n\n'
        case 'codeBlock':
          return `${indent}\`\`\`${node.attrs?.language ?? ''}\n${serializeInline(node.content)}\n\`\`\`\n\n`
        case 'horizontalRule':
          return `${indent}---\n\n`
        case 'details': {
          // <summary> is the first child, the body the second.
          const [summary, body] = node.content ?? []
          return `<details>\n<summary>${serializeInline(summary?.content)}</summary>\n\n${serializeBlocks(body?.content, indent)}</details>\n\n`
        }
        case 'table':
          return serializeTable(node)
        default:
          // Unknown wrapper: keep whatever text it holds rather than lose it.
          return node.content ? serializeBlocks(node.content, indent) : ''
      }
    })
    .join('')
}

/** A whole note as a Markdown document, its title as the H1. */
export function noteToMarkdown(title: string, content: JSONContent | undefined): string {
  const body = serializeBlocks(content?.content).replace(/\n{3,}/g, '\n\n').trimEnd()
  return `# ${title}\n\n${body}\n`
}
