# migration-phase2-2a-backend (build log) : cœur Electron backend en TS

**Date** : 2026-06-26
**Spec** : [docs/superpowers/specs/2026-06-26-migration-phase2-domaine-coeur-electron-design.md](../superpowers/specs/2026-06-26-migration-phase2-domaine-coeur-electron-design.md)
**Plan** : [docs/superpowers/plans/2026-06-26-migration-phase2-2a-backend-electron.md](../superpowers/plans/2026-06-26-migration-phase2-2a-backend-electron.md)
**Objectif** : Convertir le backend (`lib/` fs/SDK + `hud/engine.mjs`) en TypeScript strict sous `src/main/{io,services,engine.ts}` + `src/shared/{errors,logger}.ts`, **sans Electron** (wiring = 2.2b), branché sur `domain/`+`shared/` (2.1), comportement inchangé.
**Statut** : livré (Phase 2.2a). Branche `refonte-ts-react-electron`. Revue finale opus : « Ready for Phase 2.2b = Yes ».

## Livré

| Livrable | Fichier | Source |
|---|---|---|
| Config + .env | `src/main/io/env.ts` | lib/config + lib/load-env |
| Lecture SOUL (résumé dashboard) | `src/main/io/soul.io.ts` | lib/soul.mjs |
| Liste des éditions | `src/main/io/editions.io.ts` | lib/editions.mjs |
| Erreur typée + logger | `src/shared/errors.ts`, `src/shared/logger.ts` | (nouveau) |
| Consommation SDK | `src/main/services/llm.service.ts` | lib/runner.mjs |
| Orchestrateur | `src/main/engine.ts` | hud/engine.mjs |

**Points clés** :
- **SDK en `import()` dynamique** : `llm.service` ne charge le SDK que si aucun `query` n'est injecté (prod) ; les tests injectent toujours un faux `query`. Cohérent avec le spike 2.0 (main CJS + SDK ESM).
- **Injection de dépendances** : `engine.ts` expose `EngineDeps` (typé) ; `defaultDeps()` câble io+services+fs ; les tests passent des `deps` partiels mockés (pas d'appel réseau, pas d'écriture wiki).
- **Couche additive** : `lib/*.mjs` et `hud/*` **inchangés** (suppression = Phase 4).

## Validation RÉELLE

- `npm test` : ✅ **19 fichiers / 128 tests** (5 tests portés vers `tests/main/`, +1 fichier `errors.test`, +2 tests load-env).
- `npm run typecheck` : ✅ exit 0. `npm run lint` : ✅ exit 0.
- Garde-fou : **aucun import `electron`** dans `src/main/{io,services}`, `src/main/engine.ts`, `src/shared/*` (seul `src/main/index.ts`, le placeholder Phase 1, importe electron — hors périmètre 2.2a).
- Exécution subagent-driven : 3 lots (A: io+errors, B: llm.service, C: engine) + revue par lot + revue finale opus.

## Gotchas de la passe

- **`import.meta.url` indisponible en CJS** : `config.mjs` dérivait `REPO_ROOT` via `import.meta.url` ; remplacé par `process.cwd()` (le test exige juste `repoDir.endsWith('breves-ia')`, vrai sous Vitest/CLI/Forge-dev). **Attention 2.2b** : KO en app packagée (cf. carry-over).
- **`StreamEvent` trop lâche** : le type interface à index-signature du plan refusait (TS strict) de recevoir les events discriminés `TopicEvent`/`ActivityEvent`. Corrigé en **union** `TopicEvent | ActivityEvent | { type; error?; [k] }` — type-safe, neutre au runtime.
- **Directive lint inutile** : `logger.ts` portait `eslint-disable no-console` (règle non activée) → warning « unused directive ». Retirée (le `lint` par tâche, ajouté cette passe suite à la leçon 2.1, l'a attrapé).

## Décisions / restes

- **Carry-overs Phase 2.2b** (revue finale) :
  - **`repoDir` en app packagée** : `process.cwd()` ne pointe pas le repo une fois packagé. 2.2b devra fixer `BREVES_REPO_DIR` (via `app.getAppPath()`/userData) **avant** `defaultDeps()`. Le seam d'override existe déjà.
  - **Pas de pré-chargement SDK** : les handlers construisent un seul `deps` partagé ; l'`import()` du SDK reste paresseux (premier `dispatch`).
  - **Streaming IPC** : `dispatch`/`archiveAndIngest` acceptent `onEvent?: (ev: StreamEvent) => void` → pont naturel vers `webContents.send`.
- **Cleanup optionnel** : `llm.service` 2 `import type` fusionnables + lisibilité `loadSdkQuery`.
- **Reste Phase 2.2b** : `shared/types/{api,ipc}.ts`, `main/ipc/*.handlers.ts` (Zod sur entrées), `main/index.ts` (fenêtre + IPC + `BREVES_REPO_DIR` + externalisation SDK dans `vite.main.config.ts`), `preload/index.ts` (`window.api` + alias `window.breves`), **smoke de boot SDK**.
