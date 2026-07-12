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
  'settings.language': 'Language',
  'settings.language.system': 'System (auto)',
  'settings.pressShortcut': 'Press the new shortcut... (Esc to cancel)',
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
/** What the user picks in settings: an explicit locale, or follow the OS. */
export type LocalePreference = 'system' | Locale

const fr: Record<TranslationKey, string> = {
  // Dock chrome
  'dock.expand': 'Déplier le dock',
  'dock.collapse': 'Replier le dock',
  'dock.switchSide': 'Changer le côté du dock',
  'dock.switchSideTitle': 'Placer le dock au bord gauche ou droit',
  'dock.backToFolders': 'Retour aux dossiers',
  'dock.addNote': 'Ajouter une note',
  'dock.addFolder': 'Ajouter un dossier',
  'dock.searchFolders': 'Rechercher un dossier...',
  'dock.searchIn': 'Rechercher dans {name}...',
  'dock.searchInFallback': 'Rechercher une note...',

  // Folder list
  'folder.defaultName': 'Mes notes',
  'folder.newName': 'Nouveau dossier',
  'folder.noteCount.one': '{count} note',
  'folder.noteCount.many': '{count} notes',
  'folder.empty': 'Aucun dossier — créez-en un avec +',
  'folder.notFound': 'Aucun dossier trouvé',
  'folder.rename': 'Renommer le dossier',
  'folder.delete': 'Supprimer le dossier',

  // Note list / cards
  'note.untitled': 'Sans titre',
  'note.defaultTitle': 'Nouvelle note',
  'note.notFound': 'Aucune note trouvée',
  'note.open': 'ouverte',
  'note.clickToRename': 'Cliquer pour renommer',
  'note.detach': 'Détacher en post-it',
  'note.delete': 'Supprimer la note',
  'note.rename': 'Renommer',
  'note.moveToFolder': 'Déplacer vers un dossier',
  'note.duplicate': 'Dupliquer la note',
  'note.copySuffix': '(copie)',
  'note.pin': 'Épingler au premier plan',
  'note.unpin': 'Ne plus épingler',
  'note.redock': 'Ranger dans le dock',
  'note.changeColor': 'Changer la couleur',

  // Delete confirmations (native dialogs)
  'confirm.delete': 'Supprimer',
  'confirm.cancel': 'Annuler',
  'confirm.deleteNote.title': 'Supprimer la note',
  'confirm.deleteNote.message': 'Supprimer « {title} » ?',
  'confirm.deleteFolder.title': 'Supprimer le dossier',
  'confirm.deleteFolder.message': 'Supprimer le dossier « {name} » ?',
  'confirm.deleteFolder.withNotes': 'Supprimer le dossier « {name} » et ses {count} note(s) ?',
  'confirm.irreversible': 'Cette action est irréversible.',

  // Color picker
  'color.custom': 'Couleur personnalisée',
  'color.customGradient': 'Dégradé personnalisé',
  'color.apply': 'Appliquer',
  'color.gradientFrom': 'Couleur de début du dégradé',
  'color.gradientTo': 'Couleur de fin du dégradé',
  'color.gradientAngle': 'Angle du dégradé',
  'color.preset': 'Couleur {index}',

  // Editor
  'editor.placeholder': 'Écrire quelque chose... (« / » pour les commandes)',
  'editor.moveBlock': 'Déplacer ce bloc',
  'editor.moveBlockTitle':
    'Glisser pour réordonner (ou vers un autre post-it) — cliquer pour sélectionner le bloc',
  'editor.highlight': 'Surligner en {color}',
  'editor.removeHighlight': 'Retirer le surlignage',
  'editor.textColor': 'Couleur du texte {color}',
  'editor.removeColor': 'Retirer la couleur',
  'editor.linkToFile': 'Lien vers un fichier',
  'editor.linkToFolder': 'Lien vers un dossier',
  'editor.webLink': 'Lien web',
  'editor.removeLink': 'Retirer le lien',

  // Table controls
  'table.addColumn': 'Ajouter une colonne',
  'table.deleteColumn': 'Supprimer la colonne',
  'table.addRow': 'Ajouter une ligne',
  'table.deleteRow': 'Supprimer la ligne',
  'table.deleteTable': 'Supprimer le tableau',

  // Slash commands
  'slash.heading1': 'Titre 1',
  'slash.heading2': 'Titre 2',
  'slash.bulletList': 'Liste à puces',
  'slash.numberedList': 'Liste numérotée',
  'slash.checklist': 'Checklist',
  'slash.toggle': 'Bloc repliable',
  'slash.table': 'Tableau',
  'slash.image': 'Image',
  'slash.fileLink': 'Lien vers un fichier',
  'slash.folderLink': 'Lien vers un dossier',
  'slash.quote': 'Citation',
  'slash.divider': 'Séparateur',

  // Dock menu
  'menu.open': 'Menu du dock',
  'menu.swapSide': 'Changer de côté',
  'menu.expandNotes': 'Déplier les notes',
  'menu.hideDock': 'Masquer le dock',

  // Tray
  'tray.toggleDock': 'Afficher / masquer le dock',
  'tray.settings': 'Paramètres...',
  'tray.quit': 'Quitter',

  // Settings window
  'settings.title': 'Paramètres',
  'settings.close': 'Fermer',
  'settings.general': 'Général',
  'settings.launchAtStartup': 'Lancer AeroNotes au démarrage de Windows',
  'settings.language': 'Langue',
  'settings.language.system': 'Système (auto)',
  'settings.pressShortcut': 'Appuyez sur le nouveau raccourci... (Échap pour annuler)',
  'settings.globalShortcuts': 'Raccourcis globaux',
  'settings.markdownShortcuts': 'Raccourcis markdown (dans une note)',
  'settings.shortcut.toggleDock': 'Afficher / masquer le dock',
  'settings.shortcut.heading1': 'Titre 1',
  'settings.shortcut.heading2': 'Titre 2',
  'settings.shortcut.heading3': 'Titre 3',
  'settings.shortcut.bold': 'Gras',
  'settings.shortcut.italic': 'Italique',
  'settings.shortcut.strike': 'Barré',
  'settings.shortcut.code': 'Code inline',
  'settings.shortcut.bulletList': 'Liste à puces',
  'settings.shortcut.numberedList': 'Liste numérotée',
  'settings.shortcut.alphaList': 'Liste alphabétique',
  'settings.shortcut.checklist': 'Checklist',
  'settings.shortcut.quote': 'Citation',
  'settings.shortcut.divider': 'Séparateur',
  'settings.shortcut.commandMenu': 'Menu de commandes',
  'settings.key.space': 'espace'
}

const translations: Record<Locale, Partial<Record<TranslationKey, string>>> = { en, fr }

let currentLocale: Locale = 'en'

export function setLocale(locale: Locale): void {
  currentLocale = locale
}

export function getLocale(): Locale {
  return currentLocale
}

/**
 * Resolves the persisted preference to a concrete locale. `systemLanguages`
 * comes from `app.getPreferredSystemLanguages()` in the main process, or
 * `[navigator.language]` in a renderer.
 */
export function resolveLocale(preference: LocalePreference, systemLanguages: string[]): Locale {
  if (preference !== 'system') return preference
  return systemLanguages.some((lang) => lang.toLowerCase().startsWith('fr')) ? 'fr' : 'en'
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
