import type { JSONContent } from '@tiptap/core'
import { t } from './i18n'

/**
 * Built-in note templates. They live in code (never persisted, never synced)
 * so they can be localized and evolve with the app; ids are stable because
 * `AppSettings.disabledBuiltinTemplates` references them.
 *
 * Name/content are functions: they must resolve through t() at display time,
 * not at module load (locale switching).
 */
export interface BuiltinTemplate {
  id: string
  name: () => string
  content: () => JSONContent
}

function heading(level: number, text: string): JSONContent {
  return { type: 'heading', attrs: { level }, content: [{ type: 'text', text }] }
}

function emptyTaskItem(): JSONContent {
  return { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph' }] }
}

function taskList(itemCount: number): JSONContent {
  return { type: 'taskList', content: Array.from({ length: itemCount }, emptyTaskItem) }
}

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    id: 'builtin-groceries',
    name: () => t('template.groceries.name'),
    content: () => ({
      type: 'doc',
      content: [
        heading(2, t('template.groceries.produce')),
        taskList(2),
        heading(2, t('template.groceries.dairy')),
        taskList(2),
        heading(2, t('template.groceries.pantry')),
        taskList(2)
      ]
    })
  },
  {
    id: 'builtin-todo',
    name: () => t('template.todo.name'),
    content: () => ({
      type: 'doc',
      content: [taskList(3)]
    })
  },
  {
    id: 'builtin-meeting',
    name: () => t('template.meeting.name'),
    content: () => ({
      type: 'doc',
      content: [
        heading(1, t('template.meeting.name')),
        heading(2, t('template.meeting.agenda')),
        { type: 'paragraph' },
        heading(2, t('template.meeting.notes')),
        { type: 'paragraph' },
        heading(2, t('template.meeting.actions')),
        taskList(2)
      ]
    })
  }
]
