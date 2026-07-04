# AeroNotes

Application de sticky notes avancée pour Windows : un overlay transparent plein écran avec un dock vertical de notes, un éditeur riche façon Notion (Markdown automatique, blocs, tableaux, listes, toggles) et des notes détachables en fenêtres indépendantes.

## Fonctionnalités

- **Overlay transparent plein écran** avec click-through natif : le bureau et les autres fenêtres restent utilisables partout sauf sur le dock.
- **Dock vertical** repositionnable à gauche ou à droite, rétractable, avec recherche et bouton d'ajout.
- **Éditeur riche (Tiptap/ProseMirror)** :
  - Markdown auto-formatant (`# `, `**gras**`, `- `, `[] `, etc.) sans mode preview séparé.
  - Barre de mise en forme flottante (Quick Formatting Toolbar) qui apparaît à la sélection de texte.
  - Listes à puces/numérotées, checklists, blocs repliables (toggles), tableaux.
  - Poignée de glisser-déposer par bloc et menu slash (`/`) pour insérer un type de contenu.
  - Liens cliquables, liens vers fichiers/dossiers locaux (ouverture Explorateur), images collées/glissées.
- **Notes détachables** : une note peut sortir du dock pour devenir une vraie fenêtre redimensionnable et déplaçable, avec option "toujours au premier plan".
- **Couleurs et gradients** personnalisables par note.
- **Persistance locale** (notes, couleurs, préférences du dock) via `electron-store`.
- **Icône dans la zone de notification** avec raccourci global (`Ctrl+Shift+N`) pour afficher/masquer le dock.

## Stack technique

- [Electron](https://www.electronjs.org/) + [electron-vite](https://electron-vite.org/) (build/dev tooling)
- [React 19](https://react.dev/) + TypeScript
- [Tiptap 3](https://tiptap.dev/) (ProseMirror) pour l'éditeur riche
- [Tailwind CSS 4](https://tailwindcss.com/) pour le style
- [Zustand](https://github.com/pmndrs/zustand) pour l'état côté renderer
- [electron-store](https://github.com/sindresorhus/electron-store) pour la persistance
- [electron-builder](https://www.electron.build/) pour le packaging Windows (NSIS)

## Architecture

- **Process main** (`src/main`) : fenêtre overlay (transparente, click-through), fenêtres de notes détachées, store de notes/réglages en mémoire + persisté sur disque, gestion IPC, protocole custom `aeronotes-image://` pour les images collées, tray et raccourci global.
- **Preload** (`src/preload`) : pont `contextBridge` typé exposant `window.aeronotes` aux renderers.
- **Renderer** (`src/renderer`) : deux points d'entrée HTML — `overlay.html` (dock) et `note.html` (note détachée) — partageant la même bibliothèque de composants React (`src/renderer/src`).
- **Partagé** (`src/shared`) : types (`Note`, `AppSettings`), canaux IPC, palette de couleurs, extraction de texte brut.

## Démarrage

```bash
npm install
npm run dev
```

## Vérification des types

```bash
npm run typecheck
```

## Build et packaging Windows

```bash
npm run build      # build electron-vite (main/preload/renderer)
npm run dist:win   # build + installeur NSIS dans ./release
```

L'installeur généré (`AeroNotes Setup <version>.exe`) se trouve dans `release/`.

## Notes de développement

- Le dock reste cliquable via un hit-test de coordonnées (pas de `elementFromPoint`) : le process main bascule `setIgnoreMouseEvents` selon que le curseur est dans le rectangle du dock (avec une marge pour les éléments qui en dépassent, comme l'onglet de collapse).
- Le contenu des notes est stocké en JSON ProseMirror (pas en Markdown texte), seul format capable de représenter fidèlement checklists, toggles et images ensemble.
- Une note détachée est une vraie `BrowserWindow` par note (pas une simulation en div), ce qui permet un drag/resize/z-order natifs indépendants du reste de l'app.
