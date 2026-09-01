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
  'dock.searchTrash': 'Search the trash...',
  'dock.sort': 'Sort notes',
  'dock.sort.manual': 'Manual order',
  'dock.sort.created': 'Date created',
  'dock.sort.updated': 'Last modified',
  'dock.sort.name': 'Name',

  // Trash
  'trash.title': 'Trash',
  'trash.open': 'Trash ({count})',
  'trash.back': 'Back to notes',
  'trash.empty': 'Empty the trash',
  'trash.isEmpty': 'The trash is empty',
  'trash.restore': 'Restore',
  'trash.purge': 'Delete permanently',
  'trash.expires.today': 'purged today',
  'trash.expires.days': 'purged in {count} d',

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
  'note.copyColor': 'Copy color',
  'note.pasteColor': 'Paste color',
  'note.openNote': 'Open note',
  'note.closeNote': 'Close note',
  'note.moveToFolder': 'Move to folder',
  'note.duplicate': 'Duplicate note',
  'note.copySuffix': '(copy)',
  'note.pin': 'Pin on top',
  'note.unpin': 'Unpin',
  'note.redock': 'Put back in the dock',
  'note.changeColor': 'Change color',
  'reminder.menu': 'Reminder',
  'reminder.in1h': 'In 1 hour',
  'reminder.tomorrow': 'Tomorrow 9:00',
  'reminder.nextWeek': 'Monday 9:00',
  'reminder.snooze': 'Snooze 10 min',
  'reminder.clear': 'Remove the reminder',
  'reminder.emptyBody': 'Reminder',
  'reminder.due': 'Reminder: {time}',
  'note.pinToTop': 'Pin to the top',
  'note.unpinFromTop': 'Unpin from the top',

  // Delete confirmations (native dialogs)
  'confirm.delete': 'Delete',
  'confirm.cancel': 'Cancel',
  'confirm.deleteNote.title': 'Delete note',
  'confirm.deleteNote.message': 'Delete "{title}"?',
  'confirm.deleteFolder.title': 'Delete folder',
  'confirm.deleteFolder.message': 'Delete the folder "{name}"?',
  'confirm.deleteFolder.withNotes': 'Delete the folder "{name}" and its {count} note(s)?',
  'confirm.emptyTrash.title': 'Empty the trash',
  'confirm.emptyTrash.message': 'Permanently delete the {count} note(s) in the trash?',
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
  'editor.find.placeholder': 'Search in the note',
  'editor.find.previous': 'Previous match (Shift+Enter)',
  'editor.find.next': 'Next match (Enter)',
  'editor.find.close': 'Close the search (Esc)',

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

  // Templates
  'note.createTemplate': 'Create template from this note',
  'note.exportMarkdown': 'Export as Markdown...',
  'noteLink.create': 'Create "{title}"',
  'template.groceries.name': 'Groceries list',
  'template.groceries.produce': 'Produce',
  'template.groceries.dairy': 'Dairy',
  'template.groceries.pantry': 'Pantry',
  'template.todo.name': 'To-do list',
  'template.meeting.name': 'Meeting notes',
  'template.meeting.agenda': 'Agenda',
  'template.meeting.notes': 'Notes',
  'template.meeting.actions': 'Action items',
  'template.clipboard': 'Clipboard',
  'template.clipboardTitle': 'Paste the clipboard into this note',
  'template.settingsPill': 'Template settings',
  'confirm.deleteTemplate.title': 'Delete template',
  'confirm.deleteTemplate.message': 'Delete the template "{name}"?',
  'settings.templates': 'Templates',
  'settings.templates.edit': 'Edit',
  'settings.templates.delete': 'Delete',
  'settings.templates.empty': 'No custom templates yet — right-click a note header to create one',
  'templateEditor.discard': 'Discard changes',
  'templateEditor.save': 'Save changes',

  // Tray
  'tray.toggleDock': 'Show / hide the dock',
  'tray.quickCapture': 'Quick capture',
  'tray.settings': 'Settings...',
  'tray.quit': 'Quit',

  // Settings window
  'settings.title': 'Settings',
  'settings.close': 'Close',
  'settings.account': 'Account',
  'settings.signInGoogle': 'Sign in with Google',
  'settings.signingIn': 'Waiting for the browser...',
  'settings.signOut': 'Sign out',
  'settings.syncNow': 'Sync now',
  'settings.syncing': 'Syncing...',
  'settings.lastSync': 'Last sync: {time}',
  'settings.syncNever': 'Not synced yet',
  'settings.syncNotConfigured': 'Cloud sync not configured — see docs/GOOGLE_CLOUD_SETUP.md',
  'settings.syncError': 'Sync error',
  'settings.general': 'General',
  'settings.launchAtStartup': 'Launch AeroNotes at Windows startup',
  'settings.dockAutoHide': 'Hide the dock until the cursor reaches the screen edge',
  'settings.showTaskProgress': 'Show the checklist progress bar on notes',
  'settings.display': 'Display',
  'settings.display.screen': 'Screen {index}',
  'settings.display.primary': 'Screen {index} (primary)',
  'settings.language': 'Language',
  'settings.language.system': 'System (auto)',
  'settings.pressShortcut': 'Press the new shortcut... (Esc to cancel)',
  'settings.globalShortcuts': 'Global shortcuts',
  'settings.markdownShortcuts': 'Markdown shortcuts (inside a note)',
  'settings.shortcut.quickCapture': 'Quick capture',
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
  'dock.searchTrash': 'Rechercher dans la corbeille...',
  'dock.sort': 'Trier les notes',
  'dock.sort.manual': 'Ordre manuel',
  'dock.sort.created': 'Date de création',
  'dock.sort.updated': 'Dernière modification',
  'dock.sort.name': 'Nom',

  // Trash
  'trash.title': 'Corbeille',
  'trash.open': 'Corbeille ({count})',
  'trash.back': 'Retour aux notes',
  'trash.empty': 'Vider la corbeille',
  'trash.isEmpty': 'La corbeille est vide',
  'trash.restore': 'Restaurer',
  'trash.purge': 'Supprimer définitivement',
  'trash.expires.today': 'purge aujourd’hui',
  'trash.expires.days': 'purge dans {count} j',

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
  'note.copyColor': 'Copier la couleur',
  'note.pasteColor': 'Coller la couleur',
  'note.openNote': 'Ouvrir la note',
  'note.closeNote': 'Fermer la note',
  'note.moveToFolder': 'Déplacer vers un dossier',
  'note.duplicate': 'Dupliquer la note',
  'note.copySuffix': '(copie)',
  'note.pin': 'Épingler au premier plan',
  'note.unpin': 'Ne plus épingler',
  'note.redock': 'Ranger dans le dock',
  'note.changeColor': 'Changer la couleur',
  'reminder.menu': 'Rappel',
  'reminder.in1h': 'Dans 1 heure',
  'reminder.tomorrow': 'Demain 9 h',
  'reminder.nextWeek': 'Lundi 9 h',
  'reminder.snooze': 'Reporter de 10 min',
  'reminder.clear': 'Retirer le rappel',
  'reminder.emptyBody': 'Rappel',
  'reminder.due': 'Rappel : {time}',
  'note.pinToTop': 'Épingler en haut',
  'note.unpinFromTop': 'Ne plus épingler en haut',

  // Delete confirmations (native dialogs)
  'confirm.delete': 'Supprimer',
  'confirm.cancel': 'Annuler',
  'confirm.deleteNote.title': 'Supprimer la note',
  'confirm.deleteNote.message': 'Supprimer « {title} » ?',
  'confirm.deleteFolder.title': 'Supprimer le dossier',
  'confirm.deleteFolder.message': 'Supprimer le dossier « {name} » ?',
  'confirm.deleteFolder.withNotes': 'Supprimer le dossier « {name} » et ses {count} note(s) ?',
  'confirm.emptyTrash.title': 'Vider la corbeille',
  'confirm.emptyTrash.message': 'Supprimer définitivement les {count} note(s) de la corbeille ?',
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
  'editor.find.placeholder': 'Rechercher dans la note',
  'editor.find.previous': 'Occurrence précédente (Maj+Entrée)',
  'editor.find.next': 'Occurrence suivante (Entrée)',
  'editor.find.close': 'Fermer la recherche (Échap)',

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

  // Templates
  'note.createTemplate': 'Créer un template depuis cette note',
  'note.exportMarkdown': 'Exporter en Markdown...',
  'noteLink.create': 'Créer « {title} »',
  'template.groceries.name': 'Liste de courses',
  'template.groceries.produce': 'Fruits & légumes',
  'template.groceries.dairy': 'Produits laitiers',
  'template.groceries.pantry': 'Épicerie',
  'template.todo.name': 'To-do list',
  'template.meeting.name': 'Notes de réunion',
  'template.meeting.agenda': 'Ordre du jour',
  'template.meeting.notes': 'Notes',
  'template.meeting.actions': 'Actions à faire',
  'template.clipboard': 'Presse-papier',
  'template.clipboardTitle': 'Coller le presse-papier dans cette note',
  'template.settingsPill': 'Paramètres des templates',
  'confirm.deleteTemplate.title': 'Supprimer le template',
  'confirm.deleteTemplate.message': 'Supprimer le template « {name} » ?',
  'settings.templates': 'Templates',
  'settings.templates.edit': 'Modifier',
  'settings.templates.delete': 'Supprimer',
  'settings.templates.empty':
    "Aucun template personnalisé — clic droit sur le header d'une note pour en créer un",
  'templateEditor.discard': 'Abandonner',
  'templateEditor.save': 'Enregistrer',

  // Tray
  'tray.toggleDock': 'Afficher / masquer le dock',
  'tray.quickCapture': 'Capture rapide',
  'tray.settings': 'Paramètres...',
  'tray.quit': 'Quitter',

  // Settings window
  'settings.title': 'Paramètres',
  'settings.close': 'Fermer',
  'settings.account': 'Compte',
  'settings.signInGoogle': 'Se connecter avec Google',
  'settings.signingIn': 'En attente du navigateur...',
  'settings.signOut': 'Se déconnecter',
  'settings.syncNow': 'Synchroniser maintenant',
  'settings.syncing': 'Synchronisation...',
  'settings.lastSync': 'Dernière sync : {time}',
  'settings.syncNever': 'Pas encore synchronisé',
  'settings.syncNotConfigured': 'Sync cloud non configurée — voir docs/GOOGLE_CLOUD_SETUP.md',
  'settings.syncError': 'Erreur de synchronisation',
  'settings.general': 'Général',
  'settings.launchAtStartup': 'Lancer AeroNotes au démarrage de Windows',
  'settings.dockAutoHide': 'Masquer le dock jusqu’à ce que le curseur touche le bord',
  'settings.showTaskProgress': 'Afficher la barre de progression des cases à cocher',
  'settings.display': 'Écran',
  'settings.display.screen': 'Écran {index}',
  'settings.display.primary': 'Écran {index} (principal)',
  'settings.language': 'Langue',
  'settings.language.system': 'Système (auto)',
  'settings.pressShortcut': 'Appuyez sur le nouveau raccourci... (Échap pour annuler)',
  'settings.globalShortcuts': 'Raccourcis globaux',
  'settings.markdownShortcuts': 'Raccourcis markdown (dans une note)',
  'settings.shortcut.quickCapture': 'Capture rapide',
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
