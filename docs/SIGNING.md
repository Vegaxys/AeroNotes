# Signer AeroNotes (Windows)

Les builds sont **non signés par défaut** (`forceCodeSigning: false` dans `electron-builder.yml`). Sans signature, SmartScreen affiche « Windows a protégé votre ordinateur » au premier lancement et certains antivirus/services IT bloquent l'exe. Deux voies pour signer, au choix — dans les deux cas `npm run dist:win` reste la seule commande.

## Voie 1 — Certificat OV classique (fichier PFX)

1. Acheter un certificat de signature de code **OV** (Organization/Individual Validation) chez SSL.com, Sectigo, Certum… (~250-450 €/an ; Certum « Open Source » est moins cher pour les particuliers). La validation d'identité prend quelques jours.
2. Depuis juin 2023, les clés doivent vivre sur un support matériel (token USB ou HSM cloud). Si le fournisseur livre un PFX cloud/token, suivre sa doc `signtool` ; si vous avez un PFX exportable (anciens certs, ou certains cloud HSM) :

```powershell
$env:CSC_LINK = "C:\chemin\vers\certificat.pfx"
$env:CSC_KEY_PASSWORD = "motdepasse"
npm run dist:win
```

electron-builder détecte ces variables et signe l'exe + l'installeur automatiquement. Rien d'autre à configurer.

## Voie 2 — Azure Trusted Signing (recommandée : ~9,99 $/mois)

Certificat géré par Microsoft, validation d'identité **individuelle** possible, et réputation SmartScreen quasi immédiate.

1. Créer un compte [Azure](https://portal.azure.com) et une ressource **Trusted Signing** (région East US ou West Europe).
2. Compléter la **validation d'identité** (pièce d'identité pour un particulier).
3. Créer un **certificate profile** (type Public Trust).
4. Créer une app registration / utiliser `az login` et donner le rôle *Trusted Signing Certificate Profile Signer*.
5. Ajouter ce bloc dans `electron-builder.yml` sous `win:` :

```yaml
win:
  azureSignOptions:
    endpoint: https://eus.codesigning.azure.net # selon la région
    codeSigningAccountName: <nom-du-compte-trusted-signing>
    certificateProfileName: <nom-du-profil>
```

6. Exporter les identifiants Azure avant de builder :

```powershell
$env:AZURE_TENANT_ID = "..."
$env:AZURE_CLIENT_ID = "..."
$env:AZURE_CLIENT_SECRET = "..."
npm run dist:win
```

> Ne committez le bloc `azureSignOptions` qu'une fois le compte Azure prêt : s'il est présent sans les variables d'environnement, le build échoue.

## SmartScreen, quand même

Avec un cert OV classique, SmartScreen continue d'avertir jusqu'à ce que l'exe accumule de la « réputation » (téléchargements). Trusted Signing et les certs EV sautent cette phase. Chaque nouvelle version repart de zéro côté réputation OV — une raison de plus de préférer Trusted Signing.
