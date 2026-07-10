/**
 * Minimal localization system, shared by the main process and every renderer.
 *
 * All user-facing strings live in the `en` dictionary below. To add a locale,
 * add a `Partial<typeof en>` dictionary to `translations` and call
 * `setLocale('fr')` early (e.g. from a persisted setting) — missing keys fall
 * back to English.
 *
 * NOTE: strings must be resolved at RENDER time, not at module load time
 * (avoid `const LABEL = t('...')` at a file's top level), otherwise a future
 * locale switch would not be picked up.
 */

const en = {
  // Dock chrome
  'dock.expand': 'Expand the dock',
  'dock.collapse': 'Collapse the dock',
  'dock.switchSide': 'Switch dock side',
  'dock.switchSideTitle': 'Move the dock to the left or right edge',
  'dock.backToFolders': 'Back to folders',
  'dock.addNote': 'Add a note',
  'dock.addFolder': 'Add a folder',
  'dock.searchFolders': 'Search folders...',
  'dock.searchIn': 'Search in {name}...',
  'dock.searchInFallback': 'Search notes...',

  // Folder list
  'folder.defaultName': 'My notes',
  'folder.newName': 'New folder',
  'folder.noteCount.one': '{count} note',
  'folder.noteCount.many': '{count} notes',
  'folder.empty': 'No folders — create one with +',
  'folder.notFound': 'No folders found',
  'folder.rename': 'Rename folder',
  'folder.delete': 'Delete folder',

  // Note list / cards
  'note.untitled': 'Untitled',
  'note.defaultTitle': 'New note',
  'note.notFound': 'No notes found',
  'note.open': 'open',
  'note.clickToRename': 'Click to rename',
  'note.detach': 'Detach as a post-it',
  'note.delete': 'Delete note',
  'note.rename': 'Rename',
  'note.moveToFolder': 'Move to folder',
  'note.duplicate': 'Duplicate note',
  'note.copySuffix': '(copy)',
  'note.pin': 'Pin on top',
  'note.unpin': 'Unpin',
  'note.redock': 'Put back in the dock',
  'note.changeColor': 'Change color',

  // Delete confirmations (native dialogs)
  'confirm.delete': 'Delete',
  'confirm.cancel': 'Cancel',
  'confirm.deleteNote.title': 'Delete note',
  'confirm.deleteNote.message': 'Delete "{title}"?',
  'confirm.deleteFolder.title': 'Delete folder',
  'confirm.deleteFolder.message': 'Delete the folder "{name}"?',
  'confirm.deleteFolder.withNotes': 'Delete the folder "{name}" and its {count} note(s)?',
  'confirm.irreversible': 'This action cannot be undone.',

  // Color picker
  'color.custom': 'Custom color',
  'color.customGradient': 'Custom gradient',
  'color.apply': 'Apply',
  'color.gradientFrom': 'Gradient start color',
  'color.gradientTo': 'Gradient end color',
  'color.gradientAngle': 'Gradient angle',
  'color.preset': 'Color {index}',

  // Editor
  'editor.placeholder': "Write something... ('/' for commands)",
  'editor.moveBlock': 'Move this block',
  'editor.moveBlockTitle': 'Drag to reorder (or into another post-it) — click to select the block',
  'editor.highlight': 'Highlight in {color}',
  'editor.removeHighlight': 'Remove highlight',
  'editor.textColor': 'Text color {color}',
  'editor.removeColor': 'Remove color',
  'editor.linkToFile': 'Link to a file',
  'editor.linkToFolder': 'Link to a folder',
  'editor.webLink': 'Web link',
  'editor.removeLink': 'Remove link',

  // Table controls
  'table.addColumn': 'Add column',
  'table.deleteColumn': 'Delete column',
  'table.addRow': 'Add row',
  'table.deleteRow': 'Delete row',
  'table.deleteTable': 'Delete table',

  // Slash commands
  'slash.heading1': 'Heading 1',
  'slash.heading2': 'Heading 2',
  'slash.bulletList': 'Bullet list',
  'slash.numberedList': 'Numbered list',
  'slash.checklist': 'Checklist',
  'slash.toggle': 'Toggle block',
  'slash.table': 'Table',
  'slash.image': 'Image',
  'slash.fileLink': 'Link to a file',
  'slash.folderLink': 'Link to a folder',
  'slash.quote': 'Quote',
  'slash.divider': 'Divider',

  // Dock menu
  'menu.open': 'Dock menu',
  'menu.swapSide': 'Swap dock side',
  'menu.expandNotes': 'Expand notes',
  'menu.hideDock': 'Hide the dock',

  // Tray
  'tray.toggleDock': 'Show / hide the dock',
  'tray.settings': 'Settings...',
  'tray.quit': 'Quit',

  // Settings window
  'settings.title': 'Settings',
  'settings.close': 'Close',
  'settings.general': 'General',
  'settings.launchAtStartup': 'Launch AeroNotes at Windows startup',
  'settings.globalShortcuts': 'Global shortcuts',
  'settings.markdownShortcuts': 'Markdown shortcuts (inside a note)',
  'settings.shortcut.toggleDock': 'Show / hide the dock',
  'settings.shortcut.heading1': 'Heading 1',
  'settings.shortcut.heading2': 'Heading 2',
  'settings.shortcut.heading3': 'Heading 3',
  'settings.shortcut.bold': 'Bold',
  'settings.shortcut.italic': 'Italic',
  'settings.shortcut.strike': 'Strikethrough',
  'settings.shortcut.code': 'Inline code',
  'settings.shortcut.bulletList': 'Bullet list',
  'settings.shortcut.numberedList': 'Numbered list',
  'settings.shortcut.alphaList': 'Alphabetical list',
  'settings.shortcut.checklist': 'Checklist',
  'settings.shortcut.quote': 'Quote',
  'settings.shortcut.divider': 'Divider',
  'settings.shortcut.commandMenu': 'Command menu',
  'settings.key.space': 'space'
}

export type TranslationKey = keyof typeof en
export type Locale = 'en' | 'fr'

const translations: Record<Locale, Partial<Record<TranslationKey, string>>> = {
  en,
  // French dictionary intentionally empty for now — the app ships in English;
  // fill this in (and persist a `locale` setting) to localize.
  fr: {}
}

let currentLocale: Locale = 'en'

export function setLocale(locale: Locale): void {
  currentLocale = locale
}

export function getLocale(): Locale {
  return currentLocale
}

/** Translates a key, interpolating `{param}` placeholders from `params`. */
export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  let text = translations[currentLocale][key] ?? en[key]
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value))
    }
  }
  return text
}
