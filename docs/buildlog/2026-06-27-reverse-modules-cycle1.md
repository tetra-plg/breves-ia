# reverse-modules-cycle1 (build log) : dossiers par-module (Cycle 1 reverse) de Brèves IA

**Date** : 2026-06-27
**Spec** : rôles module forward (`po-module`, `architect-module`, `lead-dev-module`, `qa-module`) en posture `reverse-base` + templates `specs-module`, `architecture-module`, `implementation-module`, `tests-plan`
**Plan** : sur demande PM (« documenter les modules comme en phase 1 »), produire un dossier Cycle 1 complet par section d'app
**Objectif** : `docs/modules/<m>/{specs,architecture,implementation,tests}.md` pour les 7 sections, en mode reverse (constat tracé)
**Statut** : livré

## Livré

| Module | Dossier | Fichiers |
|---|---|---|
| accueil | `docs/modules/accueil/` | specs, architecture, implementation, tests |
| nouvelle-edition | `docs/modules/nouvelle-edition/` | specs, architecture, implementation, tests |
| historique | `docs/modules/historique/` | specs, architecture, implementation, tests |
| soul | `docs/modules/soul/` | specs, architecture, implementation, tests |
| agents | `docs/modules/agents/` | specs, architecture, implementation, tests |
| commands | `docs/modules/commands/` | specs, architecture, implementation, tests |
| reglages | `docs/modules/reglages/` | specs, architecture, implementation, tests |

**28 fichiers** au total. Carte de modules mise à jour (D6/D7) ; 6 nouvelles zones d'ombre (GAP-20→25) consignées dans `docs/REVERSE_GAPS.md`.

## Validation RÉELLE

- ✅ 28 fichiers créés sous `docs/modules/` (vérifié : `find docs/modules -name '*.md' | wc -l` = 28).
- ✅ Délégation aux **agents module forward** (PO/Architecte/Lead Dev/QA Module) adoptés en posture reverse, un agent par module produisant les 4 livrables tracés, en 2 vagues (cœur : nouvelle-edition/soul/accueil/historique ; config : agents/commands/reglages).
- ✅ Templates **adaptés au stack Electron** : « Modèle de données » = types TS + fichiers (pas SQL) ; « Contrats d'API » = contrats IPC ; « tests » = TC tracés aux fichiers `tests/**` réels.
- ✅ Chaque module reste **dans son périmètre** (`_REVERSE_MODULE_MAP.md`) et **réfère le socle** (`docs/project/`) sans le redupliquer.

## Gotchas de la passe

- **Ambiguïté de nommage levée** : le PM a noté que « replié » rendait le terme *module* impropre. Acté : **socle = `docs/project/` (Cycle 0)**, **7 sections = `docs/modules/` (Cycle 1)** (D7).
- **Frontière `dashboard.handlers.ts`** : porte `get-dashboard` (accueil) ET `read-edition` (historique) — frontière conceptuelle non matérialisée en code, documentée dans les deux modules (GAP-M3).
- **Divergences nouvelles révélées par le grain fin** : `Dashboard.soul` jamais rendu (GAP-20), double modèle SOUL (GAP-21), bouton Quitter absent malgré le canal `quit-app` (GAP-23), payloads d'écriture non validés Zod (GAP-24), vues config en chargement infini si l'IPC échoue (GAP-25).
- **Un agent par module** (4 rôles consolidés) plutôt que 4 agents × 7 modules : choix du driver pour borner le coût (28 docs) tout en gardant la cohérence intra-module ; chaque fichier indique le rôle producteur.

## Décisions / restes

- **Décidé (PM)** : dossiers par-module Cycle 1 pour les 7 sections (D6) ; socle = doc globale (D7).
- **Restes** : GAP-20→25 à arbitrer ; le registre compte désormais 25 entrées. Une passe **Reverse Reviewer** (consolidation/cohérence inter-docs + SUMMARY) reste optionnelle.
- **Prochaine étape (optionnelle)** : « Prends le role de Reverse Reviewer et consolide la documentation de Brèves IA ».
