# AeroNotes — Session Handoff

Contexte pour reprendre le développement dans une nouvelle session. Voir [README.md](README.md) pour la présentation générale du projet, la stack et l'architecture — ce document couvre l'état courant, les pièges déjà rencontrés, et ce qu'il reste à faire.

## État actuel

Le prototype est fonctionnel et empaqueté (`release/AeroNotes Setup 0.1.0.exe`). Toutes les fonctionnalités de base marchent : overlay/dock, éditeur riche (Markdown auto, BubbleMenu, listes/checklists/toggles/tableaux, liens locaux, images), notes détachables, couleurs/gradients personnalisés, persistance, tray/raccourci global.

Deux gros cycles de corrections post-prototype ont eu lieu (voir l'historique git pour le détail complet — commits `dd1f800`, `94997ac`, `ed6c5b9`). Le morceau le plus difficile a été le **glisser-déposer de bloc** (voir section dédiée ci-dessous).

## À faire / en attente

- **Ligne d'indicateur de drop** : le padding vertical autour de la ligne (actuellement 25px, voir `.block-drop-indicator` dans `editor.css`) a été ajusté plusieurs fois sans que l'utilisateur confirme que le résultat final soit satisfaisant ("Ca marche pas mais on passe..." — probablement pas bloquant, mais à revisiter si demandé).
- Aucun autre bug connu au moment de la rédaction — mais étant donné le rythme de cette session (beaucoup d'allers-retours de test), s'attendre à ce que l'utilisateur remonte encore des ajustements visuels/UX en testant plus.

## Fixes post-0.4 du 2026-07-13 (à re-tester par l'utilisateur)

Quatre retours de test sur les features 0.4 :

- **Double-clic header (repli) et clic droit header (menu contextuel) ne marchaient pas** : le header des post-its est en `-webkit-app-region: drag`, et Chromium **avale tous les événements souris DOM** sur une zone drag — les handlers React `onDoubleClick`/`onContextMenu` ajoutés en 0.4 ne se déclenchaient jamais (voir le piège dédié ci-dessous). Réécrits côté main dans `noteWindowRegistry.wireTitlebarInteractions` : `hookWindowMessage(WM_NCLBUTTONDBLCLK)` filtré sur `wParam === HTCAPTION` → `toggleNoteCollapse` (la zone drag hit-teste en caption ; titre et boutons sont no-drag donc zone client → jamais HTCAPTION, le comportement « seulement le vide du header » est préservé nativement) ; événement `system-context-menu` (+ `preventDefault`) → coords via `screen.getCursorScreenPoint()` (DIP, le `point` de l'événement est en pixels physiques) converties en relatif fenêtre → canal `NOTE_HEADER_CONTEXT_MENU` → `NoteFrame` ouvre le `NoteHeaderMenu`. `maximizable: false` ajouté sur les fenêtres de note, sinon le double-clic caption maximise (comportement Windows par défaut).
- **Le dock restait devant les jeux plein écran** : le watcher marchait (détection OK), mais `setAlwaysOnTop(false)` est insuffisant — Win32 replace une fenêtre démote **au sommet de la bande non-topmost**, donc toujours devant le jeu. Le watcher fait maintenant `overlay.hide()` / `overlay.showInactive()` (pas de vol de focus), avec un flag `hiddenByWatcher` pour ne pas ré-afficher un dock que l'utilisateur avait masqué lui-même avant le jeu.
- **Fond du carrousel de templates retiré** : plus de conteneur sombre (bordure/fond/ombre supprimés) ; les pilules passent en `bg-black/10 text-black/70` (encre noire translucide, comme les boutons du header) puisqu'elles posent directement sur la couleur de la note.

## Fait dans la session du 2026-07-13 : 0.4 (à re-tester par l'utilisateur)

- **P1 Polish** : menu contextuel du tableau passé en sombre (comme les autres) ; `<input type="color">` rendus ronds via `.color-swatch-input` (`theme.css`, `::-webkit-color-swatch`) — le dialog OS reste natif.
- **P2 Menu header unifié** : `src/renderer/src/shared/NoteHeaderMenu.tsx` (extrait de DockNotePreview) servi par les DEUX surfaces (carte dock + barre de titre des post-its via `NoteFrame.note?`). Items par surface : Rename (édition inline, état remonté), **Copy/Paste color** (presse-papier session-only côté main, canaux `color:copy`/`color:get-copied`), Move to folder (dock), Duplicate, **Create template from this note**, Pin/Unpin (fenêtre), Open/Close note selon l'état, Delete.
- **P3 Repli double-clic** (fenêtres détachées seulement) : `note:toggle-collapse` → `noteWindowRegistry.toggleNoteCollapse` anime `setBounds` (~160 ms ease-out) vers 44 px et retour. Pendant le repli : `resizable=false`, `setMinimumSize` abaissé, et **persistBounds suspendu** (sinon la hauteur repliée deviendrait la taille mémorisée). État runtime uniquement, nettoyé sur close/redock/destroy. Le double-clic ne part que du vide du header (`target === currentTarget`).
- **P4-P5 Templates** : `Template` (id/name/content/timestamps) persisté + **syncé** (SyncDocument.templates optionnel — docs distants pré-0.4 normalisés à `{}`, tombstones.templates avec migration au load). Built-ins dans `src/shared/builtinTemplates.ts` (ids stables, name/content = fonctions pour la locale), désactivables via `AppSettings.disabledBuiltinTemplates` (local). **Carrousel** `TemplateCarousel` monté par NoteEditor quand `editor.isEmpty` + prop `showTemplates` (fenêtres + cartes dock éditables — donc seulement en mode Expand notes) ; pilule ⋯ → fenêtre Paramètres. Panel **Templates** dans les Paramètres (toggles built-ins, Edit/Delete pour les user templates, delete avec confirmation native). **Éditeur de template** : `note.html?templateId=<id>` → `TemplateEditorApp` (contour bleu accent, fond neutre, titre = nom du template, édition en état LOCAL, boutons flottants Discard/Save) ; fenêtres via `templateEditorWindow.ts` (une par template).
- **P6 Block nesting (1 niveau)** : `BlockDragHandle.forEachBlock` itère les blocs top-level ET les enfants des `details` **ouverts** (`attrs.open`), positions absolues `O+1+childOffset+1+blockOffset`. `findBlockAtY` privilégie le match imbriqué ; `computeBoundaries(includeNested)` génère des boundaries internes (désactivées quand on drag un `details` — pas de foldout dans foldout, y compris en transfert inter-fenêtres via le type du payload). `moveBlock` inchangé (positions absolues).

## Debug sync du 2026-07-13 (pièges importants)

- **« Erreur de synchronisation — Drive... » tronquée** : le span de statut avait `truncate` → les erreurs s'affichent maintenant en entier (wrap, rouge) et sont loggées en clair dans la console du main (`console.error('[sync]', ...)` + logs `[sync] init/completed`).
- **`safeStorage` : un kill brutal d'electron.exe peut invalider la clé os_crypt** (stockée dans `Local State` du userData). Symptôme : token présent dans `aeronotes-auth.json` mais indéchiffrable → `signedIn=false` silencieux. Fix : purge automatique de l'auth quand le déchiffrement échoue (état signed-out propre, l'utilisateur se reconnecte en un clic). **Ne pas tuer electron.exe à coups de Stop-Process -Force pendant les tests de sync** — fermer proprement (tray → Quit).
- **`invalid_grant` au refresh** (accès révoqué, ou expiration 7 j en mode Test de l'écran de consentement) → purge auto + message « Google session expired — please sign in again ».
- **403 `accessNotConfigured`** (Drive API activée il y a quelques minutes, propagation en cours) → message explicite « enable it and retry in a few minutes ».
- **403 `ACCESS_TOKEN_SCOPE_INSUFFICIENT` — LA vraie cause de l'erreur de l'utilisateur** : le **consentement granulaire** de Google (cases à cocher par permission sur l'écran de connexion) permet de se connecter SANS accorder l'accès Drive. Fix double : `signIn()` vérifie le champ `scope` de la réponse token et refuse la connexion avec un message actionnable si `drive.appdata` manque ; le 403 correspondant a aussi son message dédié. Le guide GOOGLE_CLOUD_SETUP.md documente la case à cocher.

## Fait dans la session du 2026-07-12 (suite) : sync cloud Google Drive + docs signature

**Architecture sync** (`src/main/sync/`) — Drive API `appDataFolder`, zéro dépendance nouvelle (fetch/crypto/http natifs) :
- `oauthConfig.ts` : client ID/secret compilés depuis `.env` (`MAIN_VITE_*`, gitignoré, template `.env.example`). Sans `.env` → état « unconfigured », l'app marche normalement. **L'utilisateur doit suivre `docs/GOOGLE_CLOUD_SETUP.md`** (création projet + OAuth Desktop) avant tout test réel — pas encore fait au moment de la rédaction.
- `googleAuth.ts` : PKCE + navigateur système + serveur loopback `127.0.0.1:0` (timeout 2 min) ; email lu dans l'id_token ; refresh token chiffré `safeStorage` dans un store séparé `aeronotes-auth` (`tokenStore.ts`).
- `driveClient.ts` : REST pur (list/download/create multipart/update media), retry unique sur 401 après refresh.
- `syncEngine.ts` : un seul fichier distant `aeronotes-sync.json` + images en fichiers séparés. Merge **LWW par note/dossier** sur `updatedAt`, tombstones (TTL 90 j) ; un dossier supprimé est ressuscité si une de ses notes gagne le merge (ne jamais perdre une note). Les champs runtime (`isDetached`, `windowBounds`, `alwaysOnTop`) et les settings ne se synchronisent PAS. Déclencheurs : ready+3 s, débounce 20 s après mutation (hook `notesStore.setOnMutated`, non déclenché par `applyRemote`), timer 5 min, bouton manuel. Limite connue : deux machines qui écrivent EXACTEMENT en même temps → petite fenêtre de course, le LWW par note absorbe (dernier `updatedAt` gagne).
- Notes modifiées depuis le cloud : `NOTES_REMOTE_APPLIED(ids)` → `useNotesStore.remoteRevisions` → remount ciblé des éditeurs (key des cartes + NoteEditor des fenêtres). Notes supprimées à distance → `destroyNoteWindow`.
- UI : section « Compte » en tête des Paramètres (connexion/déconnexion, email, dernière sync, sync manuelle, erreurs).
- **Signature** : `docs/SIGNING.md` (voie PFX = juste `CSC_LINK`/`CSC_KEY_PASSWORD`, voie Azure Trusted Signing = bloc yml à coller) ; `forceCodeSigning: false` explicite.
- **E2E restant à faire par l'utilisateur** : créer le projet Google Cloud, remplir `.env`, tester connexion + sync entre 2 machines (checklist dans le plan : suppression propagée, modif croisée, images, token révoqué, hors-ligne).

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

### Une zone `-webkit-app-region: drag` avale TOUS les événements souris DOM
Aucun `click`, `dblclick` ou `contextmenu` React/DOM ne se déclenche sur un élément en region drag (c'est le compositeur natif qui gère la zone, pas Chromium). Toute interaction sur la barre de titre d'une fenêtre frameless doit passer par le main process : `hookWindowMessage(WM_NCLBUTTONDBLCLK)` pour le double-clic (filtrer `wParam === HTCAPTION`, et mettre `maximizable: false` sinon Windows maximise), événement `system-context-menu` pour le clic droit. Voir `wireTitlebarInteractions` dans `noteWindowRegistry.ts`.

### `setAlwaysOnTop(false)` ne fait PAS passer une fenêtre derrière la fenêtre active
Win32 réinsère la fenêtre démote au sommet de la bande non-topmost — elle reste donc devant un jeu plein écran. Pour s'effacer réellement, il faut `hide()`/`showInactive()` (c'est ce que fait `fullscreenWatcher.ts`).

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
