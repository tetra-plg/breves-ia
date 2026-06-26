# migration-phase3b1-flux-verification (build log) : flux de vérification React

**Date** : 2026-06-26
**Spec** : [docs/superpowers/specs/2026-06-26-migration-phase3b-vues-flux-design.md](../superpowers/specs/2026-06-26-migration-phase3b-vues-flux-design.md)
**Plan** : [docs/superpowers/plans/2026-06-26-migration-phase3b1-flux-verification.md](../superpowers/plans/2026-06-26-migration-phase3b1-flux-verification.md)
**Objectif** : Porter en React l'entrée du flux — registry de vues, hooks de streaming, et les vues compose → checking (streaming) → detail (drawer). Look + comportement préservés.
**Statut** : livré (Phase 3b-1). Branche `refonte-ts-react-electron` (poussée). Revue finale opus : « Ready for 3b-2 = Yes ».

## Livré

| Livrable | Fichier |
|---|---|
| Registry de vues | `src/renderer/App.tsx` (+ montage useCommandStream + horloge) |
| Store flux | `src/renderer/store/app.store.ts` (valeurs typées, runStatus, drawerKey, returnTo, actions reducers domain/checking, fmtClock) |
| Streaming | `src/renderer/hooks/useCommandStream.ts` (onCommandEvent → store) |
| Composants | `RunStatus.tsx`, `EnqCard.tsx`, `Drawer.tsx` (+ stories) |
| Pages | `Compose.tsx`, `Checking.tsx`, `Detail.tsx` |

**Points clés** :
- **Streaming** : `useCommandStream` route les events (`activity` → run-status, `topic-*` → cartes via `applyEvent`) ; l'horloge tourne via un `setInterval` dans `App` gardé par `runStatus.active` (cleanup propre, pas de fuite).
- **Logique testable dans le store** (reducers réutilisant `domain/checking`) ; effets (IPC, intervalle) dans les pages/`App` ; composants présentationnels.
- **Parité look** : classes/inline repris de companion.html ; helpers `niveau*` identiques au legacy.
- **Storybook** : une story par composant (Toast, EditionRow, EnqCard, RunStatus, Drawer).

## Validation RÉELLE (sous Node 22)

- `npm test` : ✅ **25 fichiers / 148 tests** (store flux + useCommandStream testés).
- `npm run typecheck` : ✅ 0. `npm run lint` : ✅ 0. `npm run build-storybook` : ✅ (5 stories).
- `npm start` : `.vite/build/main.cjs` build sans erreur. **Validation visuelle du flux live à confirmer par l'utilisateur** (`nvm use && npm start` → Dashboard → Nouvelle édition → sujets → Lancer → cartes qui se cochent → drawer).
- `lib/*.mjs`/`hud/*` : **inchangés**.
- Exécution subagent-driven : 2 lots + revue par lot + revue finale opus. **Push après chaque commit** (demande utilisateur).

## Gotchas de la passe

- **Retour depuis le drawer** : le bouton retour générique du Shell allait au dashboard ; ajout d'un `returnTo` dans le store (set à `'checking'` par `openDrawer`) pour revenir à la vue d'origine — parité avec `state.returnTo` du legacy.
- **Stories manquantes** : le plan n'avait storybooké qu'`EnqCard` ; ajout de `RunStatus`/`Drawer` (une story par composant, comme convenu).
- **`faits: z.array(z.unknown())`** → `String(f)` dans Drawer (coercition sûre ; le legacy faisait `escapeHtml(f)`).
- Toujours **sous Node 22** (`nvm use`) — Storybook 10.

## Décisions / restes

- **Carry-overs Phase 3b-2** (revue finale, Minor) :
  - Extraire les helpers `niveauColor/Soft/Label` (dupliqués EnqCard/Drawer) dans un module partagé — l'éditeur (corrections) les réutilise.
  - Resserrer le cast `Drawer` à `{ raw?: string }` ; typer `faits` en `string[]` en amont (retire le `String(f)`).
  - Convertir `Compose` en sélecteurs Zustand (cohérence/perf).
  - `TOPIC_TYPES` à coupler au union `TopicEvent`.
- **run-status générique** (`beginRun(title?)`) prêt pour draft/archive en 3b-2.
- **Reste** : 3b-2 (editor/archived), 3b-3 (soul/agents), 3b-4 (history/reader), puis Phases 4-5.
