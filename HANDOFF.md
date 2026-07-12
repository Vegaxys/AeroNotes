# AeroNotes — Session Handoff

Contexte pour reprendre le développement dans une nouvelle session. Voir [README.md](README.md) pour la présentation générale du projet, la stack et l'architecture — ce document couvre l'état courant, les pièges déjà rencontrés, et ce qu'il reste à faire.

## État actuel

Le prototype est fonctionnel et empaqueté (`release/AeroNotes Setup 0.1.0.exe`). Toutes les fonctionnalités de base marchent : overlay/dock, éditeur riche (Markdown auto, BubbleMenu, listes/checklists/toggles/tableaux, liens locaux, images), notes détachables, couleurs/gradients personnalisés, persistance, tray/raccourci global.

Deux gros cycles de corrections post-prototype ont eu lieu (voir l'historique git pour le détail complet — commits `dd1f800`, `94997ac`, `ed6c5b9`). Le morceau le plus difficile a été le **glisser-déposer de bloc** (voir section dédiée ci-dessous).

## À faire / en attente

- **Ligne d'indicateur de drop** : le padding vertical autour de la ligne (actuellement 25px, voir `.block-drop-indicator` dans `editor.css`) a été ajusté plusieurs fois sans que l'utilisateur confirme que le résultat final soit satisfaisant ("Ca marche pas mais on passe..." — probablement pas bloquant, mais à revisiter si demandé).
- Aucun autre bug connu au moment de la rédaction — mais étant donné le rythme de cette session (beaucoup d'allers-retours de test), s'attendre à ce que l'utilisateur remonte encore des ajustements visuels/UX en testant plus.

## Fait dans la session du 2026-07-12 : fixes & features round 4 (à re-tester par l'utilisateur)

- **Version affichée** en bas de la fenêtre Paramètres (`app:get-version` → `app.getVersion()`).
- **Drag-out au curseur** : `NOTE_DETACH` accepte une position écran optionnelle ; `createNoteWindow` centre la barre de titre sous le curseur, clampé dans la workArea de l'écran visé. Le detach via menu contextuel/clic garde l'ancien comportement (bounds persistés).
- **Fantôme de l'app au drag dans le vide** : deux gardes — `select-none` sur le root du dock (`.note-editor` ré-opte en `user-select: text`) + listener `dragstart` document dans `OverlayApp` qui `preventDefault()` sauf si la cible est dans un `[draggable="true"]`.
- **Menu contextuel confiné à l'écran** : `useLayoutEffect` qui mesure le menu et clamp x/y (re-mesure quand la sous-liste dossiers s'ouvre).
- **Raccourci configurable** : `AppSettings.toggleShortcut` (défaut `CommandOrControl+Shift+N`) ; `tray.applyToggleShortcut()` ré-enregistre à chaud, revert au précédent si l'accélérateur est invalide/pris (avec fallback défaut pour ne jamais perdre l'accès au dock) ; recorder dans Paramètres (clic → capture du prochain combo, Échap annule, modificateur obligatoire).
- **Dock derrière les jeux plein écran** : `src/main/fullscreenWatcher.ts` — un PowerShell enfant persistant (spawn caché, tué au quit) poll Win32 toutes les 1,5 s : si la fenêtre au premier plan appartient à un autre process, n'est pas le bureau (classes Progman/WorkerW exclues) et couvre EXACTEMENT son moniteur (une fenêtre maximisée déborde de ses bords invisibles → non matchée), il émet « 1 » → `overlay.setAlwaysOnTop(false)` ; « 0 » → restauré en 'floating'. Zéro dépendance native. Si le spawn échoue, feature silencieusement off.
- **Caret invisible sur checklist vide** : le `<li>` des task lists est en flex et le wrapper de contenu collapsait à 0 de large sur un paragraphe vide → `li > div { flex: 1 1 auto; min-width: 0 }`.

## Fait dans la session du 2026-07-11 (suite) : localisation FR + sélecteur de langue

- **Dictionnaire `fr` complet** dans `src/shared/i18n.ts` (typé `Record<TranslationKey, string>`, donc TS force sa complétude à chaque nouvelle clé `en`).
- **Préférence `AppSettings.locale`** : `'system' | 'en' | 'fr'` (défaut `system` → fr si l'OS est en français, sinon en). Résolution via `resolveLocale(pref, langs)` — langs = `app.getPreferredSystemLanguages()` côté main, `[navigator.language]` côté renderer.
- **Main** : `src/main/bootstrapLocale.ts`, module à effet de bord qui DOIT rester le premier import de `main/index.ts` (les seeds/migration de `notesStore` appellent `t()` à l'import). Changement à chaud : `settingsHandlers` re-résout la locale et appelle `tray.refreshTrayMenu()` (le tray garde une instance module-level pour reconstruire son menu).
- **Renderers** : les trois `main.tsx` attendent `getSettings()` et font `setLocale()` avant le premier rendu (pas de flash anglais). Changement à chaud : `useSettingsStore` fait `setLocale()` avant `set()`, et `OverlayApp`/`NoteWindowApp` remontent leur arbre via `key={locale}` (les `t()` sont résolus au rendu, le remount repeint tous les libellés). La fenêtre settings re-rend simplement.
- **UI** : sélecteur « Language / Langue » dans la fenêtre Paramètres (System (auto) / English / Français — noms de langues toujours affichés dans leur propre langue).
- Piège documenté : ne jamais mettre un `t()` dans une `const` top-level (gelé au chargement) — cf. `getSlashCommandItems()`.

## Fait dans la session du 2026-07-11 : dock UX round 3 (à re-tester par l'utilisateur)

- **Scrollbar du dock stylée** : classe `.dock-scroll` dans `theme.css` (thumb blanc translucide, miroir de celle de `.note-editor`) sur les listes notes/dossiers + la fenêtre settings.
- **Bouton collapse** : fond glass restauré (`var(--color-glass-strong)`) — l'utilisateur n'aimait pas le fond sombre ; il reste collé au bord en replié.
- **Dossier ouvert mémorisé** : `AppSettings.lastOpenFolderId` persisté (écrit par enterFolder/leaveFolder), restauré au lancement après validation contre la liste des dossiers (`Promise.all` folders+settings dans `useNotesStore`) ; invalidé si le dossier est supprimé.
- **Popup highlight** : même style sombre que la bubble toolbar (`bg-neutral-900/95`).
- **Cartes du dock** : le header entier est une zone de grab (plus aucun bouton dedans, juste le badge « open ») ; **clic droit sur le header** → menu contextuel : Rename (édition inline), Move to folder ▸ (sous-liste des autres dossiers ; ferme la fenêtre détachée avant de déplacer), Duplicate note (`note:duplicate`, `structuredClone` du contenu), Detach, Delete. Menu en `position:fixed` avec `data-mouse-live`.
- **Menu du dock** (`DockMenu.tsx`, remplace `DockSideToggle` supprimé) : bouton ⋯ dans la barre → Swap dock side, **Expand notes** (toggle, setting `notesExpanded` persisté), Hide the dock (`overlay:hide`), Settings..., Quit (`app:quit`) — actions app routées par `overlayHandlers`.
- **Vue repliée (`notesExpanded: false`)** : toutes les cartes = header + 3 lignes d'aperçu (`line-clamp-3`), non éditables ; clic = détacher (ou focus si déjà ouverte).

## Fait dans la session du 2026-07-10 : fixes + i18n (à re-tester par l'utilisateur)

- **i18n** : toute l'app est passée en anglais via `src/shared/i18n.ts` (`t(key, params)`, dictionnaire `en`, locale switchable via `setLocale` — le dictionnaire `fr` est vide, à remplir pour localiser). Règle : résoudre les strings au rendu, PAS dans des `const` top-level (seule exception héritée : rien — `slashCommandItems` a été converti en fonction `getSlashCommandItems()` pour ça). Couvre renderer + main (tray, dialogs de confirmation, titres/noms par défaut, seeds).
- **Suppression** : boutons 🗑 sur les cartes du dock (éditable ET détachée), dans la barre de titre des post-its, et sur les cartes dossier (avec ✎ renommer, visibles au hover). Confirmation via `dialog.showMessageBox` natif côté main (`confirmDeletion` dans `notesHandlers.ts`) ; supprimer un dossier supprime aussi ses notes et ferme leurs fenêtres (`destroyNoteWindow`).
- **Renommage dossier** : existait déjà en double-clic (pas découvrable) → bouton ✎ explicite ajouté sur la carte.
- **Cartes dossier** plus opaques (`bg-neutral-900/80`).
- **Bouton du dock replié** : collé au bord de l'écran (2px, animé), fond quasi-opaque `rgba(23,23,23,0.85)` pour que ni gradient ni bureau ne le teintent. Dimensions actuelles (choix utilisateur) : `h-45 w-4`.
- **Drag de carte** : `setDragImage` avec la carte entière sous le curseur + `dropEffect='move'` (listener `dragover` document pendant le drag) pour un curseur « drag accepté » partout, y compris hors du dock (le drop dehors = détacher).
- **Sélection de bloc** : un clic (sans mouvement > 4px) sur le grip fait une `NodeSelection` du bloc (contour accent via `.ProseMirror-selectednode`), supprimable avec Backspace/Delete. Le drag démarre seulement au-delà du seuil.

## Fait dans la session du 2026-07-09 : grosse maj en 5 phases (à re-tester par l'utilisateur)

Plan détaillé approuvé par l'utilisateur (5 phases, ordre pensé pour ne rien démolir). Tout est implémenté, typecheck + build passent, migration vérifiée sur le store réel.

- **P1 — Bugs/polish** : hover d'un `<hr>` garde la ligne visible (cause : le shorthand `background:` de `.block-hover-target` réinitialisait `background-clip` — utiliser `background-color` !) ; effet hover renforcé (0.14) ; marge 26px sous les tableaux (boutons « + ») ; bouton dock `h-24 w-5` ; en replié le fondu horizontal s'arrête à 50% pour ne pas teinter le bouton ; **glisser un post-it du bureau sur le bouton du dock replié ouvre le dock** (main : event `move` des fenêtres de note + `screen.getCursorScreenPoint()` dans `noteWindowRegistry.expandDockIfDraggedOntoTab`).
- **P2 — Formatage** : `@tiptap/extension-highlight@3.27.1` **épinglé exactement** (le `^` tirait 3.27.3 qui exige core 3.27.3 → ERESOLVE) ; swatches carrés dans la BubbleToolbar + popup au clic sur un surlignage (`highlightClick.ts` → callback vers `NoteEditor`, `extendMarkRange('highlight')`) ; palette fixe dans `highlightColors.ts`. **`window.prompt` est un no-op silencieux sous Electron** — c'était la cause du bouton lien « qui ne fait rien » ; remplacé par un sous-menu (fichier/dossier/web avec input URL inline) qui applique les marks sur la sélection ; la commande slash Image utilise maintenant un vrai picker (`image:import` copie le fichier dans le store d'images).
- **P3 — Dossiers** : `Folder` + `Note.folderId` (un seul niveau), migration auto vers « Mes notes » au chargement (vérifiée) ; racine = liste des dossiers (double-clic pour renommer), « ‹ » dans la barre de recherche pour remonter ; **remonter à la racine ferme tous les post-its du bureau** (`closeAllNoteWindows`) ; header = une barre h-10 contenant retour/recherche/+/switch (icônes sans fond) ; « + » contextuel (dossier à la racine, note dans un dossier).
- **P4 — Édition dans le dock** : dock élargi à 380 (migration douce dans `loadSettings` — la valeur persistée 300 n'avait jamais été choisie par l'utilisateur) ; les cartes embarquent un `NoteEditor compact` (max-h-80 puis scroll, sans BlockDragHandle/TableControls) ; note détachée → aperçu + badge « ouverte » (décision : jamais deux éditeurs actifs) ; drag de réordonnancement déplacé sur l'**en-tête** de la carte (sinon il vole la sélection de texte de l'éditeur) ; `key={id:isDetached}` pour recharger le contenu au redock ; les popups slash/bubble portent `data-mouse-live` (ils peuvent déborder du rect du dock dans l'overlay).
- **P5 — Fenêtre Paramètres** : 3e entrée renderer `settings.html` (+ `electron.vite.config.ts`), `settingsWindow.ts` singleton frameless ouvert depuis le tray (« Parametres... » remplace l'ancien sous-menu checkbox) ; toggle démarrage Windows appliqué par `settingsHandlers` (donc depuis n'importe quel renderer) ; tableaux des raccourcis globaux + markdown en lecture seule.

**À tester par l'utilisateur** : tout le visuel P1, le flux highlight/liens P2, la navigation dossiers P3 (y compris fermeture des post-its au retour racine), l'édition dans le dock P4 (perf avec beaucoup de notes ?), la fenêtre paramètres P5 (le toggle démarrage ne s'applique qu'en packagé).

## Fait dans la session du 2026-07-07 (à re-tester par l'utilisateur)

- **Dock replié = click-through sauf sur le bouton** : le hit-test (`useClickThroughHitTest`) ne prend plus des refs mais interroge les éléments marqués `data-mouse-live` ; le root du dock n'est marqué que déplié, l'onglet de collapse l'est toujours.
- **Gradient du dock animé** : le fond est maintenant une couche séparée (`.dock-gradient`, voir `theme.css`) — replié, c'est un halo centré sur le bouton (masque vertical piloté par la custom property `--dock-fade`, enregistrée via `@property` pour être transitionnable) ; il s'étend en pleine hauteur à l'ouverture.
- **Popup couleur** : se ferme au clic extérieur (`pointerdown` document dans `ColorPicker.tsx`).
- **Icônes de liens** : dossier/fichier (via `data-kind` rendu par le mark `localLink`) et globe bleu pour les liens web — SVG inline en data-URI dans `editor.css`.
- **Liens web** : nouvelle extension `webLinkClick.ts` + IPC `shell:open-external` (`shell.openExternal`, protocole https par défaut si absent).
- **Séparateurs (`<hr>`)** : zone de saisie de 30px de haut (ligne visible dessinée en `background-clip: content-box`), voir `editor.css`.
- **Tray → Paramètres → « Lancer au démarrage de Windows »** : checkbox persistée dans `AppSettings.launchAtStartup`, appliquée via `app.setLoginItemSettings` (`src/main/startup.ts`, no-op en dev car ça enregistrerait electron.exe) et ré-assertée à chaque lancement.
- **Transfert de blocs entre post-its : implémenté via IPC** (PAS via le drag HTML5 natif — une première tentative de rebasculer tout le drag sur `draggable`/`dragstart` a cassé le glisser-déposer, l'utilisateur l'a signalé immédiatement ; le suivi souris maison reste la seule mécanique qui marche dans ces fenêtres). Fonctionnement : pendant un drag (bouton maintenu), Chromium capture la souris, donc la fenêtre source continue de recevoir `mousemove`/`mouseup` même hors de ses bords, avec `screenX/screenY`. `BlockDragHandle.tsx` détecte que le curseur est sorti de la fenêtre et relaie la position écran au main (`block:drag-move`) ; le main (`blockHandlers.ts`) trouve la fenêtre de note sous le point (`noteWindowRegistry.findNoteWindowAt`, exclut la source, premier match si chevauchement — pas d'info z-order) et lui pousse `block:drag-over` (indicateur de drop) puis, au relâchement, `block:drop` avec le bloc sérialisé en JSON ProseMirror (`BlockTransferPayload`, sérialisé au début du drag). La cible insère la copie, confirme via `block:transferred`, et le main dit à la source de supprimer l'original (`block:remove`) — la suppression vérifie que `nodeSize` correspond toujours (on préfère laisser un doublon que supprimer le mauvais bloc). Limites connues : pas d'image fantôme du bloc hors de la fenêtre source, et le drop entre deux notes qui se chevauchent choisit arbitrairement.

## Pièges découverts pendant cette session (à ne pas re-débugger deux fois)

### Tailwind Preflight écrase les styles par défaut du navigateur
Tailwind v4 (`@import 'tailwindcss'` dans `theme.css`) réinitialise `list-style`, la taille/graisse des titres, etc. Résultat : les listes à puces/numérotées et les titres Markdown se convertissaient bien (le DOM changeait), mais devenaient **visuellement indiscernables** d'un paragraphe normal — jamais un bug fonctionnel, toujours du CSS manquant dans `editor.css`. Si un futur "ça ne marche pas" concerne le rendu visuel d'un élément HTML standard (blockquote, hr, code, etc.), vérifier le CSS AVANT de suspecter la logique JS.

### `list-style: revert` ne respecte pas l'attribut HTML `type` d'un `<ol>`
Pour supporter les listes alphabétiques (`type="a"/"A"`), il a fallu des règles CSS explicites par attribut (`ol[type='a'] { list-style-type: lower-alpha }` etc.) — `revert` ne suffisait pas de façon fiable. Voir `.note-editor ol[type=...]` dans `editor.css`.

### Les nœuds Tiptap n'ont pas tous un attribut `data-type` fiable
`DetailsSummary` (contrairement à `Details` et `DetailsContent`, qui ont un `addNodeView` custom injectant `data-type`) rend un `<summary>` nu sans cet attribut. Cibler `[data-type='detailsSummary']` en CSS ne matchait donc jamais rien. Toujours vérifier la source de l'extension Tiptap concernée avant de supposer qu'un sélecteur `data-type` existe.

### Priorité des extensions Tiptap pour les raccourcis clavier
Quand deux extensions bindent la même touche (ex. `Tab`), celle avec la priorité la plus haute (ou premher dans l'ordre par défaut) gagne et bloque les autres. `AlphaOrderedList` a dû définir `priority: 1000` pour que son handler `Tab` (cycle 1 → a → i selon la profondeur) s'exécute avant le `Tab: () => sinkListItem(...)` par défaut de `@tiptap/extension-list` (via StarterKit).

### `wrappingInputRule` fusionne avec une liste adjacente du même type — et perd les attributs custom
Le `join` automatique de ProseMirror garde les attributs du nœud **existant** (pas du nouveau), donc une liste alphabétique adjacente à une liste décimale se faisait absorber et perdait son `type`. Fix : `joinPredicate: () => false` sur les règles custom.

### La poignée de glisser-déposer tierce (`@tiptap/extension-drag-handle-react`) — abandonnée
Plusieurs tentatives de configuration (padding, offset positif/négatif, `computePositionConfig`) n'ont pas résolu un bug de clignotement/disparition au survol dans nos fenêtres de note étroites et transparentes. **Remplacée par une implémentation maison** (`src/renderer/src/editor/BlockDragHandle.tsx`) qui fonctionne. Deux leçons de cette implémentation custom :
- **`posAtCoords` n'est pas fiable pour détecter "quel bloc est survolé"** en dehors du texte réel (marge gauche, espace vide dans un paragraphe court). Utiliser une détection géométrique pure (est-ce que la coordonnée Y tombe dans le rectangle vertical du bloc, peu importe X) est beaucoup plus robuste — c'est ce que fait `findBlockAtY`.
- Pour déplacer un nœud ProseMirror : `state.tr.delete(from, to)` puis `tr.mapping.map(targetPos)` pour corriger la position cible après la suppression, puis `tr.insert(mappedPos, slice.content)`. Ne pas faire le calcul de décalage à la main.

### Le cache d'electron-builder plante avec `EXDEV: cross-device link not permitted`
Le dossier cache par défaut (`%LOCALAPPDATA%\electron-builder\Cache`) est sur un volume différent du projet sur cette machine. `ELECTRON_BUILDER_CACHE` doit pointer vers un **chemin absolu** (un chemin relatif via `cross-env` ne suffit pas de façon fiable) — voir `scripts/build-win.cjs`, qui résout le chemin explicitement avant de lancer `electron-builder`.

### Multi-instances de `npm run dev`
Pendant un long débogage, il est facile de se retrouver avec plusieurs process `electron-vite dev` qui tournent en même temps (un lancé par Claude, un autre par l'utilisateur dans VS Code) sans s'en rendre compte — chacun sur un port différent, chacun avec son propre état, ce qui fait ressembler des correctifs qui marchent à des correctifs qui "ne changent rien". Si un correctif semble ne jamais s'appliquer malgré un rebuild propre, vérifier `Get-CimInstance Win32_Process -Filter "Name='node.exe'"` (PowerShell) pour des instances dupliquées avant de continuer à chercher le bug ailleurs. **Une seule personne (utilisateur ou Claude, pas les deux) devrait lancer `npm run dev` à la fois.**

## Commandes utiles

```bash
npm run dev          # dev avec HMR
npm run typecheck    # tsc sur main + renderer
npm run build        # build de prod (electron-vite)
npm run dist:win     # build + installeur NSIS dans ./release
```

Pour tuer des process Electron orphelins sous Windows (PowerShell) :
```powershell
Get-CimInstance Win32_Process -Filter "Name='electron.exe'" | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```
