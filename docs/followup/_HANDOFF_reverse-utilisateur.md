# _HANDOFF — Reverse Utilisateur → Reverse Reviewer (Brèves IA)

> Fin du manuel utilisateur. Étape suivante optionnelle : consolidation/cohérence.

## Livré (manuel utilisateur — `docs/user/`)
- `docs/user/charter.md` (93 l) — charte rédactionnelle : persona (opérateur Pierre), **tutoiement convivial**, vocabulaire métier (brève/édition/SOUL/échantillon/agents), termes techniques bannis, français.
- `docs/user/ui-ux-guidelines.md` (377 l) — guidelines reconstruites du CSS réel : tokens (couleurs oklch clair/sombre, échelle `--space`, rayons, ombres), typo (Hanken Grotesk + JetBrains Mono), iconographie, navigation, états, contrainte fenêtre 400×760.
- **7 guides** `docs/user/<section>/guide.md` : accueil (69), nouvelle-edition (190, démo de bout en bout), historique (65), soul (121), agents (73), commands (68), reglages (91).

## Décisions d'interview (PM)
- Ton = **tutoiement convivial** ; granularité = **1 guide par section** ; démo phare = **produire une édition de bout en bout**.

## Points d'attention pour le Reverse Reviewer
- Cohérence à vérifier : vocabulaire charte ↔ guides ; liens « Voir aussi » entre guides ; alignement guides ↔ `specs.md`.
- **Features non atteignables, exclues du manuel** (à confirmer) : sélecteur de thème (GAP-19, défini en CSS mais pas exposé), CLI `npm run breves` (outil dev, hors manuel).
- Nouvelles zones d'ombre consignées par cette passe : **GAP-18** (accessibilité : focus visible, `prefers-color-scheme`, `aria-live`, tailles <11px), **GAP-19** (thème non exposé). Registre complet : `docs/REVERSE_GAPS.md` (19 entrées).

## Passation
```text
---
Manuel utilisateur produit (charter, ui-ux-guidelines, 7 guides).
Prochaine étape (optionnelle) : consolidation + cohérence.
Déclencheur : "Prends le role de Reverse Reviewer et consolide la documentation de Brèves IA"
---
```
