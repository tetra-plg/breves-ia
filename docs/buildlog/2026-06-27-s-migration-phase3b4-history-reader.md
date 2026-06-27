# migration-phase3b4-history-reader (build log) : historique + lecteur React

**Date** : 2026-06-27
**Spec** : [docs/superpowers/specs/2026-06-26-migration-phase3b-vues-flux-design.md](../superpowers/specs/2026-06-26-migration-phase3b-vues-flux-design.md) (sous-plan 3b-4)
**Plan** : [docs/superpowers/plans/2026-06-27-migration-phase3b4-history-reader.md](../superpowers/plans/2026-06-27-migration-phase3b4-history-reader.md)
**Objectif** : Porter en React les vues **history** (liste des éditions archivées) et **reader** (lecture d'une édition via `readEdition` + `renderEditionHtml`, copie), et brancher l'ouverture du lecteur depuis l'historique ET le dashboard, 1:1 avec le renderer vanilla.
**Statut** : livré (Phase 3b-4). Branche `refonte-ts-react-electron` (poussée). Revue finale opus : « Phase 3b complete / Ready for Phase 4 = Yes ». **Validation visuelle finale à confirmer par l'utilisateur** (`npm start`).

## Livré

| Livrable | Fichier | Notes |
|---|---|---|
| Store lecteur | `src/renderer/store/app.store.ts` | `readerEdition` + `setReaderText` + `openReader(edition, from)` (mémorise édition + returnTo, vide readerText, navigue) (+ test) |
| Composant | `HistoryRow.tsx` (+ story) | bouton `.card` : date + titre + « Lire › » + stats brèves/corrections |
| Page History | `src/renderer/pages/History.tsx` | liste `dashboard.editions` via HistoryRow → `openReader(e,'history')` |
| Page Reader | `src/renderer/pages/Reader.tsx` | charge le texte au montage (garde `alive`), 3 états (chargement/rendu `renderEditionHtml`/introuvable), sous-ligne date·titre·count·archivée, Copier → toast |
| Câblage Dashboard | `src/renderer/pages/Dashboard.tsx` | clic édition → `openReader(edition,'dashboard')` (stub Phase 3b retiré) |
| Registry | `src/renderer/App.tsx` | vues `history` + `reader` |

**Points clés** :
- **`openReader(edition, from)`** atomique (un seul `set`) : mémorise l'édition, fixe `returnTo = from`, vide `readerText` (évite le flash du texte précédent), navigue vers `reader`. Le bouton retour du Shell (`reader`→`returnTo`, déjà en place 3b-1) ramène correctement vers `history` OU `dashboard` selon l'origine — pas de contamination avec le `returnTo` de `detail`.
- **Reader sans fuite** : chargement async gardé par un drapeau `alive` + cleanup ; StrictMode-safe (double-fetch, dernier gagne, le premier est neutralisé par son cleanup). Écritures store via `getState()` (pas de closure périmée). Pas de `useRef` (rechargement idempotent, contrairement à Soul).
- **Sous-ligne reader** : comme le Shell affiche un titre statique (`viewTitle('reader')` = « Brèves IA »), la date est préfixée dans la sous-ligne de la page pour rester visible (le legacy la mettait dans l'en-tête via `readerLabel`).
- **Parité** : markup/inline repris du legacy ; chaînes identiques (« Aucune édition archivée. », « Brèves copiées », « Texte introuvable… »).
- **Phase 3b achevée** : les **11 vues** sont enregistrées dans App.tsx (dashboard, compose, checking, detail, editor, archived, soul, ech-editions, ech-breves, agents, history, reader) — plus aucun Placeholder.

## Validation RÉELLE (sous Node 22)

- `npm test` : ✅ **29 fichiers / 160 tests** (ajout : `app.store.reader.test.mjs`).
- `npm run typecheck` : ✅ 0. `npm run lint` : ✅ 0 (pristine).
- `npm run build-storybook` : ✅ (85 modules ; story HistoryRow).
- Sanity build `npm start` : ✅ `.vite/build/main.cjs` + `preload.cjs` présents, grep d'erreurs vide.
- `lib/*.mjs`/`hud/*` : **inchangés**. Aucun `import 'electron'` dans `src/renderer`. `SOUL.md` non stagé.
- Exécution subagent-driven : 2 lots + revue par lot (Lot B en opus) + revue finale opus. **Push après chaque commit** (5 commits `1a7b298`..`9ff8ba0`). NB : le Lot A a été terminé/poussé juste avant une interruption de session ; gates re-vérifiés par le contrôleur (typecheck/lint/test verts) avant la revue.

## Gotchas de la passe

- **`setLoading(true)` mort dans Reader** : la version initiale appelait `setLoading(true)` en tête d'effet (état initial déjà `true`, `readerEdition` ne change jamais pendant que Reader est monté → la vue se remonte à chaque navigation), ce qui déclenchait `react-hooks/set-state-in-effect` et nécessitait un `eslint-disable`. Les deux lignes ont été retirées (commit `9ff8ba0`) — lint pristine, comportement identique.
- Toujours **sous Node 22** (`nvm use`) — Storybook 10.

## Décisions / restes

- **Minors (revue finale, non bloquants)** : `dashboard.editions` n'est pas rafraîchi après un archivage in-session (fidèle au legacy — `renderHistory` lit le même cache ; candidat `getDashboard()` post-archivage en Phase 4) ; `dangerouslySetInnerHTML` = même posture XSS que le legacy (contenu = wiki local, `renderEditionHtml` échappe via `escapeHtml`/`inlineMd`).
- **Carry-over hors-scope (rappel)** : `lib/contracts.mjs` `faits` non typé string — passe lib future.
- **Reste migration** : Phase 4 (suppression `lib/*.mjs`/`hud/*` ; le renderer React devient l'unique frontal) ; Phase 5 (qualité + packaging). **Phase 3b terminée : le renderer vanilla est remplaçable.**
