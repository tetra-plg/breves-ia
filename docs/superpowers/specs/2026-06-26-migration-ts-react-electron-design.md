# Migration `.mjs` → TypeScript + React + Electron (Forge + Vite)

**Date** : 2026-06-26
**Statut** : design validé, prêt pour plan Phase 1

## Contexte

`breves-ia-companion` est un compagnon Electron **local, mono-utilisateur, mono-fenêtre**
(400×760) qui pilote la commande `/breves-ia` du BoilingBrain : vérification (fan-out
d'enquêteurs via le Claude Agent SDK), rédaction dans la plume (SOUL), validation/correction,
puis archivage (clip + note + SOUL + ingest) dans le wiki personnel.

L'architecture actuelle est déjà saine pour sa taille :

- [`lib/`](../../../lib) — 17 modules `.mjs` de logique, déjà découplés d'Electron,
  couverts par **16 fichiers de tests** (`node --test`).
- [`hud/main.mjs`](../../../hud/main.mjs) — main Electron + ~11 handlers IPC.
- [`hud/preload.cjs`](../../../hud/preload.cjs) — `contextBridge` déjà en place (`window.breves.*`).
- [`hud/engine.mjs`](../../../hud/engine.mjs) — orchestration avec **injection de dépendances** (`deps`).
- [`hud/renderer.mjs`](../../../hud/renderer.mjs) — **506 lignes de DOM impératif** + [`companion.html`](../../../hud/companion.html).
  C'est le vrai point dur et le seul gros gain React.

## Objectif

Moderniser la base technique **sans changer le comportement fonctionnel** : TypeScript strict
partout, renderer React, build Forge+Vite, frontière IPC validée par Zod, logique métier isolée.

## Cadrage (ce qu'on retient / ce qu'on jette)

Le « brief de migration » fourni est un **catalogue d'exemples génériques**, pas un cahier des
charges. On n'applique que ce qui sert cette app.

**Retenu** : TS strict · React (renderer) · Vite via Electron Forge · `contextBridge` typé
`window.api` · Zod sur la frontière IPC · `domain/` pur · logger unique + erreurs typées ·
handlers IPC par domaine · store léger **Zustand**.

**Écarté** (sur-équipement ici) :

- **React Router** — 1 fenêtre, la machine d'états [`ui-state.mjs`](../../../lib/ui-state.mjs) suffit.
- **TanStack Query** — appels IPC one-shot, pas de cache/refetch à gérer.
- **Repository pattern formel** — l'injection `deps` isole déjà le fs ; on type des modules `io/`,
  sans cérémonie de repositories.
- **GitService / UpdaterService / NotificationService** — n'existent pas dans l'app.
- **`features/notes/chat/vault/workspace`** — features d'une autre app. Si une vraie feature
  complexe émerge plus tard, on introduira `features/<x>/` à ce moment, pas avant.

## Décisions d'outillage

| Sujet | Décision |
|---|---|
| Build/scaffold | **Electron Forge + plugin Vite** (makers pour la distribution) |
| Langage | **TypeScript strict** (`strict: true`, pas de `any`/`ts-ignore` à terme) |
| UI | **React** (renderer uniquement) |
| État | **Zustand** (un store), pas de Router ni TanStack Query |
| Validation IPC | **Zod** (`shared/schemas`) |
| Tests | **Vitest** seul (unit + intégration) ; E2E Playwright = backlog |
| Packaging | **Forge makers** (DMG/exe/deb) dès la Phase 5, icône `assets/` |
| Lint/format | **ESLint + Prettier** |
| Stratégie | **Incrémentale**, suite de tests verte à chaque phase/commit |

## Cartographie pur / node de `lib/`

- **Isomorphe (renderer + main)** → `domain/` : `ui-state`, `ui-format`, `checking-model`,
  `edition-render`, `edition-breves` (les 5 modules importés par le renderer).
- **Domaine pur (main)** → `domain/` : `contracts` (→ `shared/schemas`), `parse-result`,
  `activity`, `agent-file` (parse/serialize), `command-inputs` (→ `shared/schemas`), `soul-model`, `skills`.
- **Main-only (node/SDK)** → `main/io` + `main/services` : `config`, `editions`, `load-env`,
  `soul` (fs) + `runner` (Claude Agent SDK).

## Architecture cible

```text
src/
├── main/                    # Electron main + orchestration
│   ├── index.ts             ← hud/main.mjs (app lifecycle, fenêtre)
│   ├── window.ts            # makeWindow + DevTools + icône
│   ├── engine.ts            ← hud/engine.mjs (orchestration, injection deps conservée)
│   ├── ipc/                 # handlers par domaine (≠ fichier unique)
│   │   ├── command.handlers.ts     # send-command, archive-ingest
│   │   ├── dashboard.handlers.ts   # get-dashboard, read-edition
│   │   ├── soul.handlers.ts        # get/save soul + échantillons
│   │   ├── agents.handlers.ts      # get/save agents
│   │   └── system.handlers.ts      # copy, open-external, hide-window
│   ├── services/
│   │   └── llm.service.ts   ← lib/runner.mjs (Claude Agent SDK)
│   └── io/                  # accès fs centralisés et typés
│       ├── soul.io.ts       ← lib/soul.mjs (I/O)
│       ├── editions.io.ts   ← lib/editions.mjs + readEdition
│       ├── agents.io.ts     ← lib/agent-file.mjs (I/O)
│       └── env.ts           ← lib/load-env.mjs + config.mjs
├── preload/
│   └── index.ts             ← hud/preload.cjs (contextBridge typé window.api)
├── renderer/                # React
│   ├── main.tsx, App.tsx
│   ├── pages/               # vues de companion.html (dashboard, compose, checking,
│   │                        #   editor, archive, soul, agents, history, reader…)
│   ├── components/          # Card, Drawer, Stepper, Toast, AgentCard, RunStatus…
│   ├── hooks/               # useCommandStream, useDashboard (wrappers window.api)
│   ├── store/               # Zustand : un store (view + run + données)
│   └── styles/              # tokens CSS extraits de companion.html
├── domain/                  # PUR : zéro Electron/React/fs
│   ├── checking.ts          ← checking-model.mjs
│   ├── edition.ts           ← edition-render + edition-breves + parse-result
│   ├── soul.ts              ← soul-model.mjs (parsing pur)
│   ├── agents.ts            ← agent-file.mjs (parse/serialize) + activity
│   ├── navigation.ts        ← ui-state.mjs (machine d'états)
│   └── format.ts            ← ui-format.mjs
├── shared/
│   ├── types/               # window.api, DTOs, union des canaux IPC
│   └── schemas/             # Zod ← contracts.mjs + command-inputs.mjs
├── config/                  # paths.ts, constants.ts
└── assets/                  # icônes (déjà là)

tests/                       # Vitest — port des 16 tests
```

**Logger** : `shared/logger.ts` unique remplace les `console.*`.
**Erreurs** : type `AppError` commun, journalisé côté main, remonté au renderer via un résultat
`{ ok, error }` typé (le pattern existe déjà — on le type et le généralise).
**Alias TS** : `@main @renderer @shared @domain @config` (+ `@assets`). Pas de `@features` tant
qu'il n'y a pas de `features/`.

## Frontière IPC (contrat typé)

- `shared/types/api.ts` : interface `Api` = forme exacte de `window.api` (méthodes typées).
- `shared/types/ipc.ts` : union littérale des canaux (`'send-command' | 'get-dashboard' | …`).
- `shared/schemas/*.ts` : un schéma Zod par payload entrant. Tout handler `ipcMain.handle`
  **parse** son entrée via Zod avant traitement ; échec de parse → `{ ok:false, error }` typé.
- `preload/index.ts` expose `window.api` (renommage de `window.breves` → `window.api` conforme
  au brief ; un alias rétro-compatible peut être gardé le temps de la Phase 3 si besoin).

## Découpage en 5 sous-projets

Chaque phase = **1 spec + 1 plan + 1 commit**, app lançable et tests verts à chaque commit.

| Phase | Sous-projet | Cœur | Tests |
|---|---|---|---|
| **1** | **Fondation** | Forge+Vite, tsconfig strict, alias, ESLint/Prettier, Vitest, arbo vide, **port des 16 tests** (sur code `.mjs` réexporté). `npm start` (Forge) lance l'app. | ✅ 16 |
| **2** | **Domaine + cœur Electron en TS** | `domain/` (modules purs → `.ts`), `main/` + `preload/` typés, `window.api`, `io/`, `llm.service`, handlers IPC par domaine, **Zod frontière**. Renderer encore vanilla rebranché. | ✅ + schemas |
| **3** | **Renderer React** | [`renderer.mjs`](../../../hud/renderer.mjs) → composants React + store Zustand. `companion.html` → JSX + tokens CSS. Parité écran par écran. | ✅ + tests composants |
| **4** | **Nettoyage** | Suppression de tous les `.mjs`, code mort, deps inutiles, doc d'archi. | ✅ |
| **5** | **Qualité + packaging** | `strict` plein, zéro `any`/`ts-ignore`, makers Forge (DMG/exe/deb) avec icône, doc finale. E2E Playwright = backlog. | ✅ + distribuable |

## Phase 1 — Fondation (détail, prochain plan)

**But** : poser toute la toolchain et la structure **sans toucher au comportement**. À la fin,
l'app se lance via Forge et les 16 tests passent, encore adossés au code `.mjs` existant.

**Livrables**

1. Dépendances : `electron`, `@electron-forge/cli` + plugin Vite, `typescript`, `react`,
   `react-dom`, `zustand`, `zod`, `vitest`, `eslint`, `prettier` (+ configs/types associées).
2. Scaffold Forge+Vite : `forge.config.*`, `vite.main.config`, `vite.preload.config`,
   `vite.renderer.config`. Point d'entrée renderer = un `index.html` minimal qui charge
   **temporairement** le code existant (ou une page blanche) — la vraie UI vient en Phase 3.
3. `tsconfig.json` `strict: true` + chemins d'alias (`@domain`, `@shared`, `@main`,
   `@renderer`, `@config`, `@assets`).
4. `tests/` : configuration Vitest + **port des 16 tests** depuis `test/*.test.mjs`. Les tests
   importent encore les modules `.mjs` de `lib/` (réexport/inchangés) — but : prouver que Vitest
   reproduit la couverture `node --test` avant toute conversion de code.
5. ESLint + Prettier configurés (TS + React), scripts `lint`/`format`.
6. `package.json` scripts : `start` (Forge), `test` (Vitest), `lint`, `format`. On conserve
   `npm run hud`/`npm run breves` tant que les anciens entrypoints existent.
7. Squelette de dossiers `src/{main,preload,renderer,domain,shared,config}` + `assets/`
   (vides ou avec `index.ts` stub), pour figer l'arbo cible.

**Hors périmètre Phase 1** : conversion du code métier en TS (Phase 2), React (Phase 3),
suppression des `.mjs` (Phase 4), makers/packaging (Phase 5).

**Critère de réussite Phase 1**

- `npm test` (Vitest) : 16 fichiers verts, parité avec `node --test`.
- `npm start` (Forge) ouvre une fenêtre (UI provisoire acceptable).
- `npm run lint` passe.
- Aucun changement de comportement fonctionnel ; les anciens scripts marchent encore.

## Contraintes transverses

- Ne pas modifier les fonctionnalités existantes ; préserver les flux métier.
- App locale mono-utilisateur : pas d'auth applicative, pas de serveur.
- `breves-archive` **écrit dans le wiki** — ne pas déclencher d'archivage réel pendant les tests.
- Garder la suite de tests verte à chaque commit (filet anti-régression principal).

## Critères de réussite (global)

- Tous les `.mjs` remplacés par du TS/TSX.
- Renderer entièrement React.
- Échanges Renderer↔Main exclusivement via `preload`/`contextBridge`, payloads validés Zod.
- Logique métier (`domain/`) découplée d'Electron/React/fs et testable seule.
- Compilation TS strict sans erreur, sans `any`/`ts-ignore`.
- Comportement fonctionnel identique à l'avant-migration.
- Architecture modulaire permettant d'ajouter une feature avec impact minimal.
