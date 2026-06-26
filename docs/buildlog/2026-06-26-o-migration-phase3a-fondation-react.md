# migration-phase3a-fondation-react (build log) : fondation React

**Date** : 2026-06-26
**Spec** : [docs/superpowers/specs/2026-06-26-migration-phase3-renderer-react-design.md](../superpowers/specs/2026-06-26-migration-phase3-renderer-react-design.md)
**Plan** : [docs/superpowers/plans/2026-06-26-migration-phase3a-fondation-react.md](../superpowers/plans/2026-06-26-migration-phase3a-fondation-react.md)
**Objectif** : Poser la fondation du renderer React (Api typée, store, styles, shell, Storybook) et remplacer le placeholder Forge par une app React avec un Dashboard fonctionnel. Look préservé.
**Statut** : livré (Phase 3a). Branche `refonte-ts-react-electron`. Revue finale opus : « Ready for 3b = Yes, with fixes » (fixes appliqués).

## Livré

| Livrable | Fichier |
|---|---|
| Api typée + désabonnement | `src/shared/types/api.ts`, `src/preload/index.ts`, `src/renderer/window.d.ts` |
| Styles (look préservé) | `src/renderer/styles/{tokens,app}.css` (extraits verbatim de companion.html) |
| Store | `src/renderer/store/app.store.ts` (Zustand, testé Vitest) |
| Composants | `src/renderer/components/{Toast,EditionRow}.tsx`, `layouts/Shell.tsx` |
| Dashboard + swap | `src/renderer/pages/Dashboard.tsx`, `App.tsx`, `main.tsx` (placeholder supprimé) |
| Storybook | `.storybook/*` + stories Toast/EditionRow |

**Points clés** :
- `window.api` aux retours **typés** (via `import type` effacés au build) ; `onCommandEvent` renvoie un désabonnement (prêt pour `useCommandStream` en 3b).
- CSS **extrait verbatim** (108 lignes = tokens 33 + app 75) ; séparateurs `.step-bar` du stepper restitués.
- Store Zustand consolide l'état du renderer ; `go()` délègue à `domain/navigation`. Composants **présentationnels** (props in) ; la page Dashboard porte l'IPC.
- **Baseline projet bumpée à Node 22 LTS** (`.nvmrc`=22, `engines.node`=">=20.19") + **Storybook 10.4.6**.

## Validation RÉELLE (sous Node 22)

- `npm test` : ✅ **23 fichiers / 140 tests** (store testé).
- `npm run typecheck` : ✅ 0. `npm run lint` : ✅ 0 (et **plus de warning EBADENGINE** eslint-visitor-keys, corrigé par le bump Node).
- `npm run build-storybook` (SB 10.4.6) : ✅ `storybook-static/` produit.
- `npm run smoke` : ✅ `SMOKE_SDK_OK` (build Forge + SDK boot OK sous Node 22).
- `npm start` : build `main.cjs`/`preload.cjs` sans erreur, renderer React chargé. **Aperçu visuel du Dashboard à confirmer par l'utilisateur** (`nvm use && npm start`).
- `lib/*.mjs`/`hud/*` : **inchangés**.
- Exécution subagent-driven : 3 lots + revue par lot + revue finale opus.

## Gotchas de la passe

- **Node bump (utilisateur)** : Storybook a fini en 10.4.6 (le rapport initial disait 10, un état intermédiaire était passé en 8.6.18). Décision utilisateur : rester Node 22 + Storybook 10 (version courante). Install propre `uninstall` puis `install storybook@^10` (sinon ERESOLVE sur l'état mixte 8/10). Types `Meta/StoryObj/Preview` importés depuis `@storybook/react-vite` (API SB10).
- **`timeout` absent sur macOS** : le smoke a son propre timeout interne — ne pas wrapper avec `timeout`.
- **Storybook + alias** : `vite-tsconfig-paths` dans `.storybook/main.ts` `viteFinal` pour résoudre `@domain`/`@main` (Storybook a sa propre Vite).
- **Parité look manquée puis corrigée (revue finale)** : (1) `index.html` ne chargeait pas Hanken Grotesk/JetBrains Mono → typo système ; ajouté (+ Storybook `preview-head.html`). (2) Bouton CTA « Nouvelle édition » du dashboard absent ; ajouté (`go('goCompose')`). (3) Eyebrow « Éditions récentes » remis conforme.

## Décisions / restes

- **Carry-overs Phase 3b** (revue finale) :
  - **`App` : ternaire → registry de vues** `{ dashboard: Dashboard, compose: Compose, … }` (scale à 12 vues).
  - **Typer** `verifyValue`/`draftValue`/`archiveValue` (`unknown` → types `@domain/checking` + résultats draft/archive) avant consommation.
  - **`useCommandStream`** (le désabonnement `onCommandEvent` est prêt pour le cleanup `useEffect`).
  - Tooltips d'en-tête dynamiques + titres spéciaux `detail`/`reader` (cf. renderer.mjs).
  - Dédupliquer `@keyframes spin` (hérité de companion.html).
- **Reste** : Phase 3b (11 vues + flux complet streaming), puis Phase 4 (suppression `.mjs`/`hud`), Phase 5 (qualité plein + packaging).
