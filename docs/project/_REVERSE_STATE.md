# _REVERSE_STATE — Brèves IA

> Marqueur d'état pour la resync différentielle. Le prochain passage en mode différentiel cartographie
> uniquement les commits postérieurs au SHA ci-dessous.

| Champ | Valeur |
|---|---|
| SHA cartographié (HEAD) | `4ce709539d99cec8ed605a66589f1464a1198495` |
| Réf courte | `4ce7095` |
| Date du commit | 2026-06-27 |
| Branche | `main` |
| Version produit | v1.0.0 (`package.json:4`) |
| Tags présents | `v0.1.0` (2026-06-25), `ds-backup-aae26a6` (2026-06-27), `v1.0.0` (2026-06-27) |
| Nb commits cartographiés | 265 |
| Mode | triangulation complète (code + sillage + git) |
| Sillage consommé | `docs/superpowers/{specs,plans}`, `docs/buildlog/*`, `.superpowers/sdd/*`, `.claude/{agents,commands,breves-ia}` |

## Livrables produits à cet état

**Cartographie** : `docs/project/_REVERSE_MAP.md`, `_REVERSE_RECONCILIATION.md`, `_REVERSE_MODULE_MAP.md`, `_REVERSE_STATE.md` (ce fichier).

**Couche technique** (`docs/project/`) : `architecture.md`, `implementation.md`, `security.md`, `tests.md`.

**Couche fonctionnelle** (`docs/project/`) : `vision.md`, `specs.md`, `modules.md`.

**Couche utilisateur** (`docs/user/`) : `charter.md`, `ui-ux-guidelines.md`, 7 guides `<section>/guide.md`, `SUMMARY.md`, `README.md`.

**Dossiers par-module** (`docs/modules/<m>/`) : 7 modules × `{specs,architecture,implementation,tests}.md` = 28 fichiers.

**Consolidation** : `docs/REVERSE_REVIEW.md` (rapport de cohérence, verdict 🟡 — 1 incohérence doc↔code corrigée : accueil/GAP-20).

**Registre** : `docs/REVERSE_GAPS.md` (**25 zones d'ombre**, GAP-01→25).

**Handoffs** : `docs/followup/_HANDOFF_{cartographe-reverse,reverse-technique,reverse-fonctionnel,reverse-utilisateur}.md`.

## Statut du cycle Reverse
**Terminé** à `4ce7095` (Cartographe → Technique → Fonctionnel → Utilisateur → dossiers par-module → Reviewer). Pas de resync nécessaire (HEAD inchangé depuis la cartographie). Prochaine resync : mode différentiel depuis ce SHA.

## Resync
Commande : « Prends le role de **Cartographe Reverse** en mode différentiel pour Brèves IA ».
Le différentiel se calcule via `git log 4ce7095..HEAD`.
