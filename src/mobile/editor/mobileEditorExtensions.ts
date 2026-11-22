import type { AnyExtension, Node } from '@tiptap/core'
import { createNoteEditorExtensions } from '@renderer/editor/extensions'
import { resolveImageSrc, unresolveImageSrc } from '../platform/images'
import { MobileLinkTap } from './mobileLinkTap'

/**
 * The desktop editor's extensions with the three phone differences:
 * - links open on tap in read mode only (MobileLinkTap replaces webLinkClick);
 * - checklist boxes stay tickable in read mode (the screen writes the change);
 * - `aeronotes-image://` sources render from the phone's image folder, while
 *   the document keeps the desktop form so it syncs unchanged.
 */
export function createMobileEditorExtensions(noteId: string): AnyExtension[] {
  return [
    ...createNoteEditorExtensions({ noteId })
      .filter((extension) => extension.name !== 'webLinkClick')
      .map((extension) => {
        if (extension.name === 'taskItem') {
          return extension.configure({ nested: true, onReadOnlyChecked: () => true })
        }
        if (extension.name === 'image') {
          return (extension as Node).extend({
            addAttributes() {
              return {
                ...this.parent?.(),
                src: {
                  default: null,
                  parseHTML: (element: HTMLElement) => unresolveImageSrc(element.getAttribute('src')),
                  renderHTML: (attributes: { src: string | null }) => ({ src: resolveImageSrc(attributes.src) })
                }
              }
            }
          })
        }
        return extension
      }),
    MobileLinkTap
  ]
}
