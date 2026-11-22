import { useState } from 'react'
import type { Note } from '@shared/types'
import { t } from '@shared/i18n'
import { GRADIENT_PRESETS, SOLID_PRESETS, isSameNoteColor, noteColorToCss } from '@shared/colorPalette'
import { useNotesStore } from '@renderer/state/useNotesStore'
import { IconCopy, IconDownload, IconFolder, IconLayers, IconStar, IconTrash } from '../icons'
import { BottomSheet, SheetRow } from './BottomSheet'

interface NoteActionsSheetProps {
  note: Note
  onClose: () => void
  /** The note went to the trash: whoever shows it must close it. */
  onTrashed: () => void
}

/**
 * The ⋯ menu (Figma board 07): what a right-click does on the desktop —
 * colors and gradients, pin, move, duplicate, template, Markdown export, trash.
 */
export function NoteActionsSheet({ note, onClose, onTrashed }: NoteActionsSheetProps): React.JSX.Element {
  const folders = useNotesStore((s) => s.folders)
  const [choosingFolder, setChoosingFolder] = useState(false)
  const run = (action: () => void): void => {
    action()
    onClose()
  }

  return (
    <BottomSheet label={t('mobile.noteActions')} onClose={onClose}>
      <div className="px-2 pb-3">
        <p className="truncate text-lg font-bold">{note.title || t('note.untitled')}</p>
        <p className="text-[13px] text-m-muted">{folders.find((f) => f.id === note.folderId)?.name}</p>
      </div>

      {choosingFolder ? (
        <>
          <p className="px-2 pb-1 text-[13px] font-medium text-m-muted">{t('note.moveToFolder')}</p>
          {folders.map((folder) => (
            <SheetRow
              key={folder.id}
              icon={<IconFolder />}
              label={folder.name}
              value={folder.id === note.folderId ? '✓' : undefined}
              onPress={() => run(() => window.aeronotes.moveNoteToFolder(note.id, folder.id))}
            />
          ))}
        </>
      ) : (
        <>
          <p className="px-2 pb-2.5 text-[13px] font-medium text-m-muted">{t('mobile.color')}</p>
          {/* Vertical padding: the scroller clips, and the active ring sits 5 px outside the dot. */}
          <div className="no-scrollbar mb-2 flex items-center gap-2 overflow-x-auto px-3 py-2">
            {[...SOLID_PRESETS, ...GRADIENT_PRESETS].map((color, index) => (
              <button
                key={index}
                type="button"
                aria-label={t('color.preset', { index: index + 1 })}
                onClick={() => window.aeronotes.setNoteColor(note.id, color)}
                className={`press h-8 w-8 shrink-0 rounded-full ${
                  isSameNoteColor(color, note.color) ? 'ring-[3px] ring-m-text ring-offset-2 ring-offset-m-surface' : ''
                }`}
                style={{ background: noteColorToCss(color) }}
              />
            ))}
          </div>
          <SheetRow
            icon={<IconStar />}
            label={note.pinned ? t('note.unpinFromTop') : t('note.pinToTop')}
            onPress={() => run(() => window.aeronotes.setNotePinned(note.id, !note.pinned))}
          />
          {folders.length > 1 && (
            <SheetRow
              icon={<IconFolder />}
              label={t('mobile.moveTo')}
              value={folders.find((f) => f.id === note.folderId)?.name}
              onPress={() => setChoosingFolder(true)}
            />
          )}
          <SheetRow icon={<IconCopy />} label={t('note.duplicate')} onPress={() => run(() => void window.aeronotes.duplicateNote(note.id))} />
          <SheetRow
            icon={<IconLayers />}
            label={t('note.createTemplate')}
            onPress={() => run(() => void window.aeronotes.addTemplate(note.title || t('note.untitled'), note.content))}
          />
          <SheetRow
            icon={<IconDownload />}
            label={t('note.exportMarkdown').replace(/\.\.\.$/, '')}
            onPress={() => run(() => void window.aeronotes.exportNoteMarkdown(note.id))}
          />
          <SheetRow
            icon={<IconTrash />}
            label={t('note.delete')}
            danger
            onPress={() =>
              run(() => {
                void window.aeronotes.deleteNote(note.id)
                onTrashed()
              })
            }
          />
        </>
      )}
    </BottomSheet>
  )
}
