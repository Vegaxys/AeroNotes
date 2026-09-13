# Audit de sécurité — pré-v1

Revue manuelle de `src/` (main, preload, renderers, sync), de la configuration
Electron/electron-builder et des dépendances, au niveau du commit `4b58c0a`
(0.4.1). Objectif : ce qui bloque une v1 publique, et ce qui peut attendre.

## Modèle de menace

AeroNotes est une app de bureau mono-utilisateur, donc pas d'authentification
ni de multi-tenance à protéger. Les deux seules sources de données que
l'utilisateur ne contrôle pas entièrement sont :

1. **Le contenu synchronisé depuis Google Drive** — il vient d'une autre
   machine. Une machine compromise (ou un compte Google compromis) peut écrire
   n'importe quel JSON dans `aeronotes-sync.json`, et ce JSON devient des
   nœuds ProseMirror rendus dans les fenêtres de note.
2. **Le presse-papier et les fichiers déposés** dans l'éditeur.

Le reste (les stores locaux, les réglages) n'est pas plus privilégié que
l'utilisateur lui-même. C'est cette frontière-là qui structure les points
ci-dessous : « une note peut-elle faire faire à l'app quelque chose que
l'utilisateur n'a pas demandé ? »

## Ce qui est déjà solide

- `contextIsolation: true` et pas de `nodeIntegration` sur les trois fenêtres ;
  le renderer ne voit que la surface `window.aeronotes` du preload, qui
  n'expose aucun primitif générique (pas de `invoke(channel, …)` ouvert, pas
  d'accès `fs`).
- `SHELL_OPEN_EXTERNAL` filtre déjà les schémas (`https?`/`mailto` seulement) —
  c'est ce qui empêche un `javascript:` ou un `file:` dans un lien de note.
- Le refresh token Google est chiffré via `safeStorage` (DPAPI), dans un store
  séparé, avec purge automatique quand la clé os_crypt n'est plus lisible.
- OAuth en PKCE S256 + navigateur système + loopback `127.0.0.1:0` : conforme à
  la RFC 8252, pas de webview embarquée.
- Le scope Drive demandé est `drive.appdata` — l'app ne peut pas lire le Drive
  de l'utilisateur, seulement son propre dossier caché.
- `.env` (client id/secret) est gitignoré et n'a jamais été commité (vérifié sur
  tout l'historique).
- Aucune exécution de code distant : pas de `eval`, pas de CDN, pas de
  `<webview>`, pas de chargement de script hors bundle.

## Corrigé dans cette passe

### 1. Traversée de chemin dans `aeronotes-image://` — **élevé**

`imageProtocol.ts` faisait `join(imagesDir, decodeURIComponent(nom))` sans rien
vérifier. Le `nom` vient du `src` d'une image de note, c'est-à-dire d'un
contenu qui peut arriver de Drive : un `src` de la forme
`aeronotes-image://..%2F..%2F..%2F<chemin>` sortait du dossier d'images et le
handler servait n'importe quel fichier du disque au renderer.

Corrigé : le nom doit correspondre au format que l'app génère elle-même
(`<uuid>.<ext>`), et le chemin résolu doit rester sous le dossier d'images.
Sinon, 404.

### 2. Aucun garde-fou de navigation — **élevé**

Aucune fenêtre n'avait de `will-navigate`, `setWindowOpenHandler` ni
`will-attach-webview`. Concrètement :

- déposer un fichier que ProseMirror refuse (un `.html`, par exemple) sur une
  note faisait naviguer la fenêtre **vers ce fichier**, qui héritait alors du
  preload et de l'origine de l'app ;
- un `window.open()` ouvrait une fenêtre fille sans preload ni garanties de
  `webPreferences`.

Corrigé dans `src/main/security.ts` (`applyWindowSecurityPolicy()`, appelé avant
la création de la première fenêtre) : la navigation n'est autorisée que vers
l'URL de base des renderers (serveur Vite en dev, `out/renderer/` en prod), les
popups sont refusées (les cibles http(s) partent dans le navigateur système,
comme les liens cliqués), et l'attachement de `<webview>` est bloqué.

### 3. Pas de `state` sur le flux OAuth — **moyen**

Le serveur loopback acceptait n'importe quelle requête `/callback` portant un
`code`. PKCE rendait déjà un code injecté inutilisable (le verifier ne
correspondrait pas), donc l'impact réel se limitait à faire échouer une
connexion en cours, mais c'est le contrôle que la RFC 8252 §8.9 demande.
Ajouté : `state` aléatoire, vérifié avant tout échange de code.

## Corrigé dans cette passe (suite) — dépendances

### 4. Tiptap ≤ 3.30.4 — **élevé**

`@tiptap/core` et toutes ses extensions étaient exposés à
[GHSA-cp6q-959q-f8rh](https://github.com/advisories/GHSA-cp6q-959q-f8rh)
(`mergeAttributes()` transforme une clé `__proto__` en attributs DOM
exécutables) et [GHSA-j95f-988m-3j2f](https://github.com/advisories/GHSA-j95f-988m-3j2f)
(ReDoS quadratique dans le parsing d'attributs Markdown). C'était la faille la
plus directement exposée du lot : les attributs des nœuds d'une note
**synchronisée depuis Drive** passent tous par `mergeAttributes`.

**`npm audit fix` ne suffit pas** — il signale le correctif mais ne bouge pas
Tiptap, probablement à cause des contraintes de pairs entre les seize paquets
`@tiptap/*`. Il faut les monter ensemble :

```bash
npm install $(node -p "Object.keys(require('./package.json').dependencies).filter(d=>d.startsWith('@tiptap/')).map(d=>d+'@latest').join(' ')")
```

Fait : 3.27.1 → 3.31.3 sur les seize paquets. Combiné au `npm audit fix` qui a
nettoyé les dépendances de dev (`undici`, `postcss`, `nanoid`, `tar`,
`js-yaml`, `fast-uri`), l'arbre est à **0 vulnérabilité**.

La montée a été validée par un banc d'essai temporaire qui monte le vrai
`NoteEditor` dans un navigateur, avec le pont `window.aeronotes` bouchonné —
voir la section « Comment l'éditeur a été testé » plus bas.

## Reste à traiter

### A. Aucune Content-Security-Policy — **moyen**

Les trois pages HTML n'ont pas de CSP, et aucune n'est posée côté session. Sans
elle, une image de note pointant vers `https://…` est chargée telle quelle : une
note synchronisée peut donc servir de balise de traçage (l'ouverture de la note
émet une requête vers un serveur tiers), et toute injection DOM future n'a
aucune seconde barrière.

Non appliqué ici parce que la CSP doit différer entre le dev (le client HMR de
Vite a besoin d'inline/eval) et la prod, et que je ne peux pas valider les deux
modes dans cette passe. La direction : une balise `<meta http-equiv>` injectée
au build uniquement, du type

```
default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data: aeronotes-image:; font-src 'self'; connect-src 'self'
```

`'unsafe-inline'` reste nécessaire pour les styles (tippy.js et React posent des
styles inline). Si l'on veut garder les images web distantes dans les notes, il
faut ajouter `https:` à `img-src` — et alors la question du traçage se règle par
un réglage utilisateur, pas par la CSP.

### B. `shell.openPath` sur un chemin arbitraire — **moyen**

`SHELL_OPEN_PATH` ouvre le chemin d'un lien local avec le handler par défaut de
Windows, sans aucun filtre. Le chemin est normalement choisi par l'utilisateur
via le sélecteur de fichiers — mais il est stocké dans la note, **et les notes
se synchronisent**. Une note venue d'une autre machine peut donc porter un lien
vers `C:\…\quelque-chose.bat` ou un chemin UNC `\\serveur\partage\x.exe`, et un
clic l'exécute.

Piste : refuser (ou faire confirmer par `dialog.showMessageBox`) les extensions
exécutables et les chemins UNC. Contrairement aux trois correctifs ci-dessus,
celui-ci change le comportement visible, donc il te revient de trancher entre
« bloquer » et « demander confirmation ».

### C. `sandbox: false` sur les trois fenêtres — **faible**

`contextIsolation` porte déjà l'essentiel de la frontière. Passer à
`sandbox: true` ajoute l'isolation processus de Chromium ; le preload actuel
n'utilise que `ipcRenderer` et `contextBridge`, donc il est compatible, mais le
changement mérite d'être testé (protocole custom, dialogues, DevTools).

### D. Pas de validation d'origine sur les handlers IPC — **faible**

Les `ipcMain.on`/`handle` ne vérifient pas `event.senderFrame`. Avec le
correctif n°2, il n'existe plus de webContents étranger dans le process, donc
c'est de la défense en profondeur — mais c'est le filet qui rattrape une
régression future sur les gardes de navigation.

### E. Divers, faible

- `readClipboardText` est exposé à tous les renderers, sans geste utilisateur :
  n'importe quelle page de l'app peut lire le presse-papier silencieusement.
  Sans conséquence tant qu'aucun contenu tiers ne tourne dans un renderer.
- Les messages d'erreur de `driveFetch`/`requestTokens` recopient le corps de la
  réponse dans l'UI et la console. Aucun jeton n'y transite, mais ça expose des
  identifiants de projet Google dans les captures d'écran de bug report.
- `electron` 43.0.0 est encore supporté (Electron maintient les trois derniers
  majeurs), 44.3.0 est disponible. À garder sous surveillance : un Electron
  périmé est la vulnérabilité la plus probable de la durée de vie de l'app.
- `electron-store` 8.2.0 vs 11.0.2 en amont. La 11 est ESM-only : migration
  réelle, pas urgente.


## Comment l'éditeur a été testé

La montée de Tiptap touche l'intégralité de l'éditeur, et lancer Electron pour
la valider coûte cher (et un `Stop-Process` brutal peut invalider la clé
os_crypt, cf. HANDOFF). À la place : un banc d'essai **temporaire** — une page
`editor-harness.html` servie par un Vite nu, qui bouchonne `window.aeronotes`
avec un `Proxy` (tout `on*` renvoie un désabonnement, le reste résout la valeur
vide valide de l'appel) puis monte le **vrai** `NoteEditor`. Tiptap pose
`view.dom.editor = editor`, donc `document.querySelector('.ProseMirror').editor`
suffit ensuite à tout piloter depuis la console.

Les fichiers du banc ont été supprimés après coup — rien n'en reste dans le
dépôt. À refaire à l'identique à la prochaine montée de Tiptap : c'est le seul
moyen bon marché d'exercer les règles de saisie sans Electron.

**Piège si tu reproduis** : l'automatisation du navigateur insère le texte en
bloc (`Input.insertText`), ce qui **ne déclenche aucune règle de saisie
Markdown** — ProseMirror ne les évalue que caractère par caractère. Il faut
passer par le chemin que le navigateur emprunte vraiment :

```js
for (const ch of texte) {
  const { from, to } = view.state.selection
  const handled = view.someProp('handleTextInput', f => f(view, from, to, ch))
  if (!handled) view.dispatch(view.state.tr.insertText(ch, from, to))
}
```

Ce qui a été vérifié après la montée, tout au vert :

- **Règles de saisie** : `# `, `## `, `### `, `> `, `- `, `1. `, `[] `, ``` ``` ```,
  `--- `, et les marques `**gras**`, `*italique*`, `` `code` ``, `~~barré~~`.
- **Commandes** : les quinze commandes du menu slash et de la BubbleMenu, plus
  `setLocalLink`, `setColor`, `toggleHighlight`, `insertTable`, `setDetails`,
  `noteLink` — aucune ne lève, toutes produisent le nœud attendu.
- **Schéma et extensions** : 56 extensions chargées, les 22 types de nœuds
  présents, et **aucune clé de plugin en double** — le piège `suggestion$` de
  la 0.4 (deux Suggestion sans `pluginKey` explicite faisaient tomber tout
  l'éditeur) reste bien fermé après la montée.
- **UI** : menu slash (ouverture, filtrage, flèches, Entrée, Échap), sélecteur
  `[[`, BubbleMenu (H1/H2/H3, couleurs, surlignages), barre Ctrl+F
  (« alpha » → 3 occurrences, 1 active, compteur 1/3).
- **Sérialisation** : `noteToMarkdown` sur un document contenant titre H3,
  citation, checklist, bloc repliable, tableau et lien `[[…]]` ;
  `extractPlainText` et `countTasks` sur le même document.

Deux régressions ont été trouvées et corrigées à cette occasion — voir la
section suivante.

### Régressions trouvées pendant le test

- **Le menu slash tronquait sa propre fin.** `slashCommand.ts` coupait la liste
  à `.slice(0, 10)` ; avec l'ajout de « Titre 3 » elle passe à 13 entrées, donc
  « Lien vers un dossier », **« Citation »** et « Séparateur » disparaissaient
  du menu par défaut — précisément l'entrée dont la correction était l'objet du
  lot. Le plafond est retiré et `SlashCommandList` défile (`max-h-72`), avec un
  `scrollIntoView` sur l'élément sélectionné pour que les flèches ne puissent
  pas sélectionner une entrée hors écran.
- **La navigation aux flèches partait d'un index périmé.** `setSelectedIndex`
  lisait `selectedIndex` dans sa fermeture ; deux pressions dans le même lot de
  rendu React repartaient donc du même index. Invisible à la vitesse d'une
  frappe humaine, mais c'est ce qui a fait échouer le test — passé à la forme
  fonctionnelle.

## Ce qui manque pour une v1 (hors sécurité pure)

- **Signature du binaire.** `forceCodeSigning: false`, aucun certificat
  configuré. Un installeur non signé déclenche SmartScreen à chaque
  téléchargement et se fait supprimer par certains antivirus. `docs/SIGNING.md`
  documente les deux voies (PFX, Azure Trusted Signing) — il reste à en choisir
  une.
- **Mise à jour automatique.** Aucun `autoUpdater`. Sans ça, un correctif de
  sécurité n'atteint jamais les utilisateurs déjà installés. C'est le manque le
  plus structurant de la liste : à décider avant la v1, pas après.
- **Écran de consentement Google toujours en mode Test.** Conséquence connue et
  déjà constatée (cf. HANDOFF) : le refresh token expire au bout de 7 jours,
  donc la sync casse toute seule chez chaque utilisateur. Il faut publier
  l'écran de consentement, ce qui suppose une politique de confidentialité
  hébergée et un domaine vérifié.
- **Politique de confidentialité + LICENSE.** Aucun des deux n'existe dans le
  dépôt. La première est exigée par la validation OAuth de Google ; la seconde
  détermine ce que les utilisateurs ont le droit de faire du binaire.
  `landing/index.html` est l'endroit naturel pour héberger la première.
- **Aucun test automatisé.** Zéro fichier de test dans `src/`. Les zones où une
  régression silencieuse coûte des données : le merge LWW de `syncEngine`
  (`mergeDocuments`), les migrations de `notesStore` (notes orphelines,
  tombstones), et `markdownSerialize`. Ce sont des fonctions pures — quelques
  tests unitaires y suffisent, sans avoir à piloter Electron.
- **Sauvegarde/restauration.** La corbeille couvre l'erreur de manipulation,
  pas la corruption du store ni le `applyRemote` qui écrase par erreur. Un
  export complet (toutes les notes en Markdown, ou le JSON brut) est un filet
  bon marché avant d'ouvrir la sync au public.
