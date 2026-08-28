import type { JSONContent } from '@tiptap/core'

export interface TaskProgress {
  done: number
  total: number
}

/**
 * Checklist tally of a note, for the dock card's progress bar. Counts every
 * `taskItem` at any depth (checklists nested in toggles included).
 */
export function countTasks(content: JSONContent | undefined): TaskProgress {
  let done = 0
  let total = 0

  function walk(node: JSONContent): void {
    if (node.type === 'taskItem') {
      total += 1
      if (node.attrs?.checked) done += 1
    }
    node.content?.forEach(walk)
  }

  if (content) walk(content)
  return { done, total }
}
