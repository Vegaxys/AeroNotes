# Configurer la sync Google Drive (côté Google Cloud)

La sync stocke les notes dans l'`appDataFolder` du Drive de l'utilisateur : un espace caché réservé à l'application (invisible dans « Mon Drive », supprimable par l'utilisateur depuis les paramètres Drive → Applications). Gratuit, aucun serveur. Pour l'activer, il faut créer un identifiant OAuth **une seule fois** — le voici pas à pas.

## 1. Créer le projet

1. Aller sur [console.cloud.google.com](https://console.cloud.google.com) (compte Google normal, pas besoin de facturation).
2. Bandeau du haut → sélecteur de projet → **Nouveau projet** → nom « AeroNotes » → Créer.

## 2. Activer l'API Drive

1. Menu ☰ → **API et services** → **Bibliothèque**.
2. Chercher « Google Drive API » → **Activer**.

## 3. Écran de consentement OAuth

1. **API et services** → **Écran de consentement OAuth** (ou « Branding » dans la nouvelle console).
2. Type d'utilisateurs : **Externe** → Créer.
3. Nom de l'app « AeroNotes », votre e-mail en assistance et contact développeur → Enregistrer.
4. Étape « Accès aux données » (scopes) → **Ajouter des champs d'application** → cocher :
   - `.../auth/drive.appdata` (données de l'application dans Drive)
   - `openid`
   - `.../auth/userinfo.email`
   Ce sont des scopes **non sensibles** : aucune validation Google n'est requise.
5. Étape « Audience » : ajoutez votre (vos) compte(s) Google comme **utilisateurs test**. Pour un usage perso vous pouvez rester en mode « Test » pour toujours — seuls les comptes testeurs pourront se connecter. (En mode Test, Google expire le refresh token après 7 jours : pour un usage quotidien, cliquez plutôt **Publier l'application** — avec uniquement des scopes non sensibles, il n'y a pas d'audit, juste un écran « app non validée » à accepter à la première connexion.)

## 4. Créer l'identifiant OAuth

1. **API et services** → **Identifiants** → **Créer des identifiants** → **ID client OAuth**.
2. Type d'application : **Application de bureau** → nom « AeroNotes Desktop » → Créer.
3. Copier le **Client ID** (`xxxx.apps.googleusercontent.com`) et le **Client secret** (`GOCSPX-...`).

## 5. Brancher dans AeroNotes

À la racine du repo, copier `.env.example` en `.env` et remplir :

```
MAIN_VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
MAIN_VITE_GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
```

Puis rebuilder (`npm run dev` ou `npm run dist:win`). Les valeurs sont compilées dans le process main au build.

- `.env` est **gitignoré** : le repo étant public, on n'y committe pas ces valeurs. (Pour une app de bureau, Google considère le « secret » comme non confidentiel — c'est PKCE qui sécurise le flux — mais inutile de le crier sur GitHub.)
- Sans `.env`, l'app fonctionne normalement et la fenêtre Paramètres affiche « Sync non configurée ».

## 6. Première connexion

Paramètres → **Se connecter avec Google** : le navigateur s'ouvre, choisissez le compte, acceptez les autorisations.

> ⚠️ **Important — consentement granulaire** : Google affiche une **case à cocher par permission**. La case « Consulter, créer et supprimer ses propres données de configuration dans votre Google Drive » (l'accès Drive) doit être **cochée**, sinon la sync échouera avec « Missing Drive permission ». Si ça arrive : se déconnecter, se reconnecter, et cocher la case.

L'app affiche l'e-mail connecté et synchronise. Le même `.env` sert pour le build installé sur le PC du taff — c'est le même « client » OAuth, chaque machine fait sa propre connexion.

## Révoquer / réinitialiser

- Côté Google : [myaccount.google.com/connections](https://myaccount.google.com/connections) → AeroNotes → Supprimer l'accès.
- Les données cloud : paramètres Drive → **Gérer les applications** → AeroNotes → Supprimer les données d'application masquées.
