# AeroNotes Android — plan

Planches UI : Figma « Sticky Note App », page **AeroNote Android**, section *AeroNotes Android — planches UI* (7 écrans + 2 schémas), avec les sections *Composants mobiles* et *Icons (Vegit)* juste en dessous.

## Principe

Le téléphone devient une machine de plus dans la synchro Google Drive existante : il lit et écrit le même `aeronotes-sync.json` dans l'`appDataFolder`, avec la même fusion (dernière écriture gagnante par note, tombstones). L'app est une app **Capacitor** : le renderer React et l'éditeur Tiptap sont réutilisés dans une WebView Android, seule l'UX autour change.

## UX mobile (ce que montrent les planches)

| Écran | Rôle |
|---|---|
| 01 Notes | « Dock en longueur » : notes du dossier courant en 2 colonnes (masonry), épinglées en tête, recherche, tri. Barre flottante en bas : Dossiers · Nouvelle note · Réglages. |
| 02 Dossiers | Page de gauche. Liste des dossiers (actif en accent), création, corbeille 30 jours. |
| 03 Réglages | Page de droite. Compte Google + état de la synchro, tri par défaut, aperçu des cartes, modèles, rappels, langue. |
| 04 Lecture | La carte touchée s'agrandit en plein écran (zoom fluide, et l'inverse à la fermeture). Liens web → navigateur, lien de note → ouvre la note, checklists et blocs repliables cliquables. |
| 05 Édition, curseur | Crayon → édition. Barre d'outils au-dessus du clavier : insertion (menu /), style de bloc, checklist, liste, image, annuler/rétablir, masquer le clavier. ✓ → retour en lecture. |
| 06 Édition, sélection | La barre passe aux styles en ligne : gras, italique, barré, code, lien, couleur, surlignage, titre. Le menu natif couper/copier/coller reste au système. 3ᵉ état (tableau) dans le composant `edit-toolbar`. |
| 07 Actions ⋯ | Feuille du bas = le clic droit du PC : couleurs et dégradés du desktop, épingler, rappel, déplacer, dupliquer, créer un modèle, exporter en Markdown, corbeille. |

Gestes :
- **Trois pages côte à côte** (Dossiers | Notes | Réglages), swipe horizontal sur le contenu. Pas de swipe depuis le bord de l'écran : les bords appartiennent au geste retour d'Android.
- **Bouton/geste retour Android** : sélection → la quitte ; édition → lecture ; note → liste (avec le dézoom) ; page Dossiers/Réglages → Notes ; Notes → quitte l'app.
- **Appui long** sur une carte : sélection multiple (déplacer, corbeille). En tri manuel, appui long puis glisser : réordonner.

Ce qui ne passe pas sur mobile : fenêtres détachées, toujours au premier plan, overlay plein écran, auto-hide du dock, raccourcis globaux, démarrage avec Windows. Ces champs restent propres à chaque machine (ils sont déjà exclus de `SyncedNote`). Les liens vers des fichiers/dossiers locaux s'affichent sans être cliquables.

## Étapes techniques

1. **Sortir le cœur du process main.** `notesStore` ne dépend d'Electron que par `persistence.ts` (electron-store) : le déplacer dans `src/shared` avec un adaptateur de persistance injecté. Idem pour `merge()` (`syncEngine.ts`), qui est déjà pur. Le desktop garde exactement le même comportement.
2. **Entrée mobile.** `src/mobile` : une implémentation de `window.aeronotes` (type `AeronotesApi`) qui appelle directement le store au lieu de l'IPC, sur les méthodes utiles au mobile. Les composants partagés (éditeur, couleurs, i18n) ne voient pas la différence.
3. **Projet Capacitor** (`android/`) : build Vite de l'entrée mobile, stockage dans un fichier JSON via `@capacitor/filesystem`, images dans le même dossier (remplace le protocole `aeronotes-image://`).
4. **Écrans** des planches : pager à 3 pages, liste masonry, note lecture/édition, barre d'outils contextuelle (états curseur / sélection / tableau), feuille d'actions. Zoom carte → note avec la View Transitions API de la WebView.
5. **Synchro.** Identifiant OAuth **Android** dans le *même* projet Google Cloud (sinon l'`appDataFolder` est différent) : nom du package + empreinte SHA-1 de la clé de signature. Connexion Google native pour obtenir le jeton `drive.appdata`, puis `driveClient` (déjà en `fetch` pur) avec ce jeton. Déclencheurs : ouverture de l'app, tirer pour rafraîchir, quelques secondes après une modification, et **passage en arrière-plan** (Android peut tuer l'app à tout moment).
6. **Rappels** en notifications locales (`@capacitor/local-notifications`) ; le champ `remindedAt` déjà synchronisé évite qu'un rappel sonne sur le PC *et* sur le téléphone.
7. **Partage vers AeroNotes** depuis une autre app (texte, lien, image) = équivalent mobile de la capture rapide.
8. **APK signé** à installer à la main (pas besoin du Play Store pour un usage perso).

## Risques à vérifier tôt

- **Clavier Android + ProseMirror** : Gboard (composition, prédictions, retour arrière) a des bugs connus avec les éditeurs ProseMirror. Faire un prototype d'édition sur un vrai téléphone avant de construire le reste.
- **Barre au-dessus du clavier** : la WebView doit se redimensionner à l'ouverture du clavier (plugin Keyboard de Capacitor ou `visualViewport`), sinon la barre passe sous le clavier.
- **Conflits** : la fusion se fait par note entière. Modifier la même note sur le PC et sur le téléphone hors ligne garde la version la plus récente et perd l'autre. C'est déjà vrai entre deux PC, mais plus probable avec un téléphone. Synchroniser à l'ouverture et à la fermeture d'une note réduit le risque.
- **Poignée de glisser-déposer des blocs** : pensée pour la souris. En v1, la remplacer par « monter / descendre » dans le menu du bloc.

## Synchro avant toute modification

Règle validée le 2026-11-22, valable sur PC comme sur mobile : quand l'app s'ouvre (ou revient au premier plan / sort de veille), elle synchronise **avant** qu'on puisse modifier une note. Sinon, une copie périmée modifiée prend un `updatedAt` plus récent et écrase à la fusion les changements faits ailleurs. Côté PC c'est en place (`SyncStatus.editingLocked`, voir HANDOFF). Le mobile réutilisera le même verrou : au lancement et à l'événement `resume` de Capacitor, notes en lecture seule jusqu'à la fin de la synchro (10 s au plus, débloqué tout de suite si hors ligne).

## Décisions

- Swipe : Dossiers à gauche, Réglages à droite, comme les boutons de la barre (validé).
- Les icônes `more-horizontal` (⋯) et `check-square` (checklist) ont été dessinées dans le style Vegit et sont marquées « proposées » : à ajouter au board Vegit si elles conviennent.

## Prototype (2026-11-22)

`src/mobile/` + `android/` : une note plein écran avec l'éditeur partagé, lecture / édition et barre contextuelle. Sert à valider sur le téléphone le point le plus risqué (clavier Android + ProseMirror) avant de construire le reste. Commandes dans HANDOFF.md.

**Résultat (2026-11-22, Android 17 / WebView 157) : validé.** Saisie Gboard, Markdown, sélection, barre contextuelle collée au clavier, lecture, persistance : tout marche, sans erreur. Prochaine étape : le style des planches, puis les étapes 1 à 5 (cœur partagé, stockage, écrans, synchro).
