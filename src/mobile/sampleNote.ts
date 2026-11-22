import type { JSONContent } from '@tiptap/core'

const text = (value: string, marks?: JSONContent['marks']): JSONContent => ({ type: 'text', text: value, ...(marks ? { marks } : {}) })
const p = (...content: JSONContent[]): JSONContent => ({ type: 'paragraph', content })
const li = (value: string): JSONContent => ({ type: 'listItem', content: [p(text(value))] })
const task = (checked: boolean, value: string): JSONContent => ({ type: 'taskItem', attrs: { checked }, content: [p(text(value))] })
const cell = (type: 'tableHeader' | 'tableCell', value: string): JSONContent => ({ type, content: [p(text(value))] })

/**
 * Test note for the editing prototype: one of every block the desktop editor
 * knows, so each can be read, tapped and edited with the Android keyboard.
 */
export const SAMPLE_NOTE: JSONContent = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [text('Ordre du jour')] },
    p(text('Point hebdo, on fait le tour de la '), text('version mobile', [{ type: 'bold' }]), text('. Spec : '), text('capacitorjs.com/docs', [{ type: 'link', attrs: { href: 'https://capacitorjs.com/docs' } }])),
    { type: 'bulletList', content: [li('Revoir la roadmap Q1'), li('Démo de la synchro mobile'), li('Budget des icônes')] },
    { type: 'heading', attrs: { level: 2 }, content: [text('Actions')] },
    { type: 'taskList', content: [task(true, 'Envoyer le compte rendu'), task(false, 'Préparer la démo Android'), task(false, 'Valider les icônes')] },
    {
      type: 'details',
      content: [
        { type: 'detailsSummary', content: [text('Notes de la réunion précédente')] },
        { type: 'detailsContent', content: [p(text('Rien de bloquant, la synchro Drive tient la charge.'))] }
      ]
    },
    {
      type: 'table',
      content: [
        { type: 'tableRow', content: [cell('tableHeader', 'Tâche'), cell('tableHeader', 'Qui')] },
        { type: 'tableRow', content: [cell('tableCell', 'Proto Android'), cell('tableCell', 'Moi')] },
        { type: 'tableRow', content: [cell('tableCell', 'Planches UI'), cell('tableCell', 'Claude')] }
      ]
    },
    { type: 'blockquote', content: [p(text('Simple, mais pas simpliste.'))] },
    p(text('Essaie aussi le Markdown : tape « # », « - », « [] » ou **gras** en début de ligne.'))
  ]
}
