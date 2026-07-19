# AeroNotes

Application de sticky notes avancée pour Windows : un overlay transparent plein écran avec un dock vertical de notes, un éditeur riche façon Notion (Markdown automatique, blocs, tableaux, listes, toggles, templates) et des notes détachables en fenêtres indépendantes, avec synchronisation cloud optionnelle via Google Drive.

## Fonctionnalités

### Dock et overlay
- **Overlay transparent plein écran** avec click-through natif : le bureau et les autres fenêtres restent utilisables partout sauf sur le dock.
- **Dock vertical** repositionnable à gauche ou à droite, rétractable, avec recherche et bouton d'ajout.
- **Édition directement dans le dock** : chaque carte embarque l'éditeur complet (mode « Expand notes »), ou un aperçu compact de 3 lignes en vue repliée.
- **Dossiers** (un niveau) : la racine liste les dossiers, chaque dossier contient ses notes ; le dernier dossier ouvert est mémorisé.
- **Effacement automatique devant les jeux plein écran** : le dock se masque quand une application plein écran passe au premier plan, et revient ensuite.

### Éditeur riche (Tiptap/ProseMirror)
- Markdown auto-formatant (`# `, `**gras**`, `- `, `[] `, etc.) sans mode preview séparé.
- Barre de mise en forme flottante à la sélection, surlignage multi-couleurs, menu slash (`/`) pour insérer un type de contenu.
- Listes à puces/numérotées/alphabétiques, checklists, blocs repliables (toggles), tableaux.
- Poignée de glisser-déposer par bloc, avec imbrication dans les toggles et **transfert de blocs entre fenêtres de notes**.
- Liens web cliquables, liens vers fichiers/dossiers locaux (ouverture Explorateur), images collées/glissées ou importées.
- **Templates** : modèles intégrés + modèles créés depuis n'importe quelle note, proposés en carrousel dans toute note vide, gérables (édition/suppression) depuis les Paramètres.

### Fenêtres de notes
- **Notes détachables** : une note peut sortir du dock (glisser-déposer au curseur ou menu contextuel) pour devenir une vraie fenêtre redimensionnable, avec option « toujours au premier plan ».
- **Repli en barre de titre** par double-clic sur le header ; menu contextuel complet (renommer, couleur copier/coller, déplacer vers un dossier, dupliquer, créer un template, épingler, supprimer) au clic droit.
- **Couleurs et gradients** personnalisables par note (palette + couleurs/dégradés custom).

### Application
- **Synchronisation Google Drive** (optionnelle) : les notes, dossiers et templates se synchronisent entre machines via le dossier applicatif privé de Drive (merge dernière-écriture-gagnante par note, tombstones ; jamais de perte de note). Voir [docs/GOOGLE_CLOUD_SETUP.md](docs/GOOGLE_CLOUD_SETUP.md).
- **Interface en français et en anglais** (suit la langue système par défaut, sélecteur dans les Paramètres).
- **Fenêtre Paramètres** : compte Google, langue, raccourci global configurable, démarrage avec Windows, templates, référence des raccourcis.
- **Persistance locale** (notes, dossiers, templates, couleurs, préférences) via `electron-store`.
- **Icône dans la zone de notification** avec raccourci global configurable (`Ctrl+Shift+N` par défaut) pour afficher/masquer le dock.

## Stack technique

- [Electron](https://www.electronjs.org/) + [electron-vite](https://electron-vite.org/) (build/dev tooling)
- [React 19](https://react.dev/) + TypeScript
- [Tiptap 3](https://tiptap.dev/) (ProseMirror) pour l'éditeur riche
- [Tailwind CSS 4](https://tailwindcss.com/) pour le style
- [Zustand](https://github.com/pmndrs/zustand) pour l'état côté renderer
- [electron-store](https://github.com/sindresorhus/electron-store) pour la persistance
- [electron-builder](https://www.electron.build/) pour le packaging Windows (NSIS)
- Sync Google Drive en REST pur (fetch/crypto natifs, PKCE + `safeStorage`) — zéro dépendance supplémentaire

## Architecture

- **Process main** (`src/main`) : fenêtre overlay (transparente, click-through), fenêtres de notes détachées et d'édition de templates, store notes/dossiers/templates/réglages persisté sur disque, gestion IPC, protocole custom `aeronotes-image://`, tray et raccourci global, watcher plein écran (`fullscreenWatcher.ts`), moteur de sync (`src/main/sync/`).
- **Preload** (`src/preload`) : pont `contextBridge` typé exposant `window.aeronotes` aux renderers.
- **Renderer** (`src/renderer`) : trois points d'entrée HTML — `overlay.html` (dock), `note.html` (note détachée / éditeur de template) et `settings.html` (Paramètres) — partageant la même bibliothèque de composants React (`src/renderer/src`).
- **Partagé** (`src/shared`) : types (`Note`, `Folder`, `Template`, `AppSettings`), canaux IPC, i18n (`i18n.ts`), palette de couleurs, templates intégrés, extraction de texte brut.

Voir [HANDOFF.md](HANDOFF.md) pour l'état courant du développement et les pièges connus.

## Démarrage

```bash
npm install
npm run dev
```

Pour activer la synchronisation Google Drive en dev, suivre [docs/GOOGLE_CLOUD_SETUP.md](docs/GOOGLE_CLOUD_SETUP.md) puis remplir `.env` (template dans `.env.example`). Sans `.env`, l'app fonctionne normalement, sync désactivée.

## Vérification des types

```bash
npm run typecheck
```

## Build et packaging Windows

```bash
npm run build      # build electron-vite (main/preload/renderer)
npm run dist:win   # build + installeur NSIS dans ./release
```

L'installeur généré (`AeroNotes Setup <version>.exe`) se trouve dans `release/`. Pour la signature de code, voir [docs/SIGNING.md](docs/SIGNING.md).

## Notes de développement

- Le dock reste cliquable via un hit-test de coordonnées (pas de `elementFromPoint`) : le process main bascule `setIgnoreMouseEvents` selon que le curseur est sur un élément marqué `data-mouse-live`.
- Le contenu des notes est stocké en JSON ProseMirror (pas en Markdown texte), seul format capable de représenter fidèlement checklists, toggles et images ensemble.
- Une note détachée est une vraie `BrowserWindow` par note (pas une simulation en div), ce qui permet un drag/resize/z-order natifs indépendants du reste de l'app.
- Les interactions sur la barre de titre des post-its (double-clic, clic droit) passent par le process main (`hookWindowMessage`, `system-context-menu`) : une zone `-webkit-app-region: drag` avale tous les événements souris DOM.
