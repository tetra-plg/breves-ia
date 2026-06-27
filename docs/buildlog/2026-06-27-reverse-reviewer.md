# reverse-reviewer (build log) : consolidation de la doc reverse de Brèves IA

**Date** : 2026-06-27
**Spec** : rôle `reverse-reviewer` (MCP `factory`, driver Cycle R) + délégation `doc-reviewer` sous `reverse-base`
**Plan** : cohérence inter-couches + livré↔documenté + revue des gaps + navigation (SUMMARY/README)
**Objectif** : clôturer le cycle Reverse, produire la navigation, corriger les incohérences doc↔code
**Statut** : livré — cycle Reverse terminé

## Livré

| Livrable | Fichier |
|---|---|
| Sommaire navigation | `docs/user/SUMMARY.md` |
| Page d'accueil manuel | `docs/user/README.md` |
| Rapport de revue | `docs/REVERSE_REVIEW.md` |
| Guide accueil corrigé | `docs/user/accueil/guide.md` (aligné sur GAP-20) |
| État final | `docs/project/_REVERSE_STATE.md` (inventaire complet + statut « terminé ») |
| Gap annoté | `docs/REVERSE_GAPS.md` (GAP-20 : doc alignée, reste côté code) |

## Validation RÉELLE

- ✅ Délégation au **Doc Reviewer** forward sous override `reverse-base`.
- ✅ 3 fichiers de consolidation écrits (`SUMMARY.md`, `README.md`, `REVERSE_REVIEW.md`).
- ✅ **Verdict de cohérence : 🟡** — couverture complète (7 modules × guide + 4 docs techniques + US globales), **0 lien « Voir aussi » cassé**, terminologie conforme à `charter.md`.
- 🔴→✅ **1 incohérence doc↔code corrigée** : `accueil/guide.md` affirmait que la version SOUL est affichée sur l'Accueil. Vérification directe de `src/renderer/pages/Dashboard.tsx` : **la SOUL n'y est jamais rendue** (GAP-20). Guide réécrit pour coller au réel (carte « Dernière édition » + liste « Éditions récentes », pas de SOUL).
- ✅ Pas de resync : HEAD inchangé à `4ce7095` depuis la cartographie.

## Gotchas de la passe

- **Documenter ≠ ce qui existe** : le manuel décrivait une feature (SOUL sur l'Accueil) non atteignable. La règle reverse (« ne documenter que l'atteignable ») impose la correction côté doc ; le gap **code** (donnée agrégée mais non rendue) reste ouvert pour arbitrage.
- **Gaps « hors manuel »** : la majorité des 25 gaps (sécurité, tests, config interne) sont hors scope du manuel utilisateur et correctement absents des guides ; seul GAP-20 créait une fausse promesse.

## Décisions / restes

- **Décidé** : cycle Reverse clôturé ; navigation produite ; incohérence doc↔code de l'Accueil corrigée.
- **Restes (côté produit, non doc)** : 25 gaps au registre ; les plus actionnables — GAP-20 (afficher ou retirer la SOUL du dashboard), GAP-23 (bouton Quitter), GAP-19 (sélecteur de thème), GAP-17 (onboarding 1er lancement), GAP-24/25 (validation Zod + états d'erreur des vues config).
- **Resync future** : « Prends le role de Cartographe Reverse en mode différentiel pour Brèves IA » depuis `4ce7095`.
