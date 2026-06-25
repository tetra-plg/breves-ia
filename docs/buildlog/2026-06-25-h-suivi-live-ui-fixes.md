# H — Suivi live + correctifs UI (build log)

**Date** : 2026-06-25
**Objectif** : rendre le pipeline d'édition lisible et corriger une série de défauts UX remontés à l'usage (écrans figés, rendu des brèves, historique incomplet, menus).
**Statut** : livré, validé en usage par l'utilisateur, 107/107 tests. Mergé sur `main`.

## Livré

| Livrable | Fichier | Notes |
| --- | --- | --- |
| **Suivi live** | `lib/activity.mjs` (+ test) | `activityFromMessage` / `labelForTool` : traduit chaque message SDK en libellé lisible (Enquêteur/Sceptique, recherche web, dépôt wiki, édition SOUL…). Branché dans `lib/runner.mjs` pour tous les skills. |
| **Bandeau de suivi** | `hud/companion.html`, `hud/renderer.mjs` | Spinner + chrono + activité, partagé checking / rédaction / archivage (`beginRun`/`endRun`, titre paramétrable). Boutons d'action désactivés pendant un run. |
| **Archivage → écran 4** | `hud/renderer.mjs`, `hud/companion.html` | La validation bascule tout de suite sur l'écran 4 avec le suivi ; le bloc « Validée et archivée » n'apparaît qu'à la fin (échec → retour écran 3). |
| **Rendu des brèves** | `lib/edition-render.mjs` (+ test) | Bug corrigé : un texte démarrant par `— date —` (cas du draft) prenait la 1re brève pour le titre d'édition (effet « tout en gras »). Plus de card-dans-card sur écrans 3 et 4. |
| **Historique multi-éditions** | `lib/editions.mjs`, `hud/engine.mjs` (+ test) | `listEditions` / `readEdition` acceptent le suffixe `-<slug>` (plusieurs éditions le même jour) ; libellé distinctif dans l'historique et le lecteur. |
| **Menus en icônes** | `hud/companion.html`, `hud/renderer.mjs` | SOUL / Historique / Agents passent en icônes d'en-tête (✦ / ⏱ / ⚙), dashboard épuré ; version SOUL et nombre d'éditions en infobulles. |

## Validation RÉELLE

- ✅ Suivi live confirmé à l'usage (l'utilisateur voit l'activité défiler ; le « blocage » apparent de l'archivage était dû au masquage des appels MCP `drop_to_raw` — désormais affichés).
- ✅ Rendu « tout en gras » reproduit puis corrigé (test de non-régression `edition-render`).
- ✅ Historique : les 6 éditions réelles du wiki remontent (dont 3 le même jour) ; vérifié sur `BoilingBrain`.
- ✅ Suppression des éditions smoke du 25/06 (3 notes + 2 clippings) à la demande.
- Suite : **107/107** tests.

## Gotchas de la passe

1. **Sentinelles `«BREVES»` peu fiables depuis le recâblage agents** : le travail part dans les sous-agents, l'agent principal n'émet plus les jalons → l'écran restait muet. Solution : suivi live indépendant des sentinelles, basé sur l'activité SDK réelle.
2. **Appels MCP masqués** : `mcp__…` était filtré → l'archivage semblait figé sur un vieux `Edit…`. Les `drop_to_raw` et l'ingestion sont maintenant étiquetés.
3. **`renderEditionHtml` et le titre d'édition** : le titre n'était pas gardé sur `!firstDateSeen` → un texte sans titre (draft) promouvait sa 1re brève en titre.
4. **Filtres d'édition trop stricts** : regex `…-merim\.md$` sans suffixe → une seule édition par jour visible.

## Décisions / restes

- `/ingest` reste **synchrone et complet** (choix utilisateur) : peut durer 10-15 min ; le suivi live montre au moins la progression. Fragilité connue : `AskUserQuestion` ne s'affiche pas en headless (sélection d'agent expert).
- Comptage de brèves d'une édition basé sur les lignes `— date —` : une vieille note (17/06) affiche « 0 brèves » (format différent). Non corrigé (non bloquant).
- Suite logique : design §5 « Échantillons vivants » curaté manuellement (spec `docs/superpowers/specs/2026-06-25-soul-echantillons-manuels-design.md`).
