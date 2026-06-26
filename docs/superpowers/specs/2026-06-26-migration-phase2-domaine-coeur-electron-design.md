# Migration Phase 2 — Domaine + cœur Electron en TypeScript (design)

**Date** : 2026-06-26
**Branche d'intégration** : `refonte-ts-react-electron`
**Spec parent** : [2026-06-26-migration-ts-react-electron-design.md](./2026-06-26-migration-ts-react-electron-design.md)
**Statut** : design validé, prêt pour spike + plan

## Contexte

La Phase 1 a posé la toolchain (Vitest, TS strict, ESLint/Prettier, Electron Forge + Vite) et
le squelette `src/`, sans toucher au code métier `.mjs`. La Phase 2 convertit le **domaine pur**
et le **cœur Electron** en TypeScript, introduit Zod sur la frontière IPC, et rebranche la vraie
UI vanilla sur la preload typée — **sans changer le comportement fonctionnel**.

## Risque n°1 (bloquant) : le Claude Agent SDK sous Electron

[`lib/runner.mjs`](../../../lib/runner.mjs) importe le SDK au top-level. Charger le SDK depuis le
process **main d'Electron** crashe (`TypeError: Cannot read properties of undefined (reading
'exports')` dans le translator ESM/CJS de Node, Electron 33 + Node 20.18.3). C'est **prouvé
antérieur à la migration** (crash identique sur un worktree `main` propre via `npm ci`) et
**bloquant pour toute l'app migrée** : le main devra appeler ce SDK.

Hypothèse favorable : le nouveau main est **bundlé par Vite en un seul `main.cjs`** (CJS), alors
que `hud/main.mjs` était chargé comme ESM par Electron. Selon qu'on bundle ou externalise le SDK,
le bug peut disparaître. Le SDK a des binaires natifs (`claude-agent-sdk-darwin-arm64`, …) et
lance un sous-process Claude → « tout bundler » n'est pas trivial. **Cela impose un spike empirique
avant de figer le cœur Electron.**

## Décisions (validées)

- **Séquencement gated par le spike.** 2.0 (spike SDK) → 2.1 (domaine + Zod, TS pur) → 2.2 (cœur Electron).
- **Spike en systematic-debugging**, pas en plan TDD rigide (résultat inconnu) ; son issue fige le plan de 2.2.
- **`domain/` regroupé par thème** (moins de fichiers, frontières claires).
- **`window.api` typé + alias rétro-compatible `window.breves`** (le temps que le renderer reste vanilla, Phase 3).
- **Zod = source de vérité** : schémas dans `shared/schemas`, types inférés (`z.infer`), validation à la frontière IPC **et** sur les sorties SDK. Remplace `contracts.mjs` + `command-inputs.mjs`.
- **Rebrancher la vraie UI vanilla dans Forge dès la Phase 2** (chaque phase = app fonctionnelle sur la nouvelle stack) ; Phase 3 échangera vanilla→React.

## Séquencement

```text
2.0  SPIKE SDK (de-risk, systematic-debugging)            ← gating
2.1  domain/ + shared/schemas (TS pur + Zod, tests verts) ← zéro Electron, faible risque
2.2  Cœur Electron (main/preload/io/services/ipc) + rebranchement renderer vanilla
```

### 2.0 — Spike SDK (gating)

But : prouver **une** façon de charger/exécuter le SDK depuis le `main.cjs` bundlé Vite sous
Electron, sans le crash ESM/CJS. Pistes à tester dans l'ordre :

1. **Externaliser** le SDK du bundle Vite (`build.rollupOptions.external` / `vite-plugin-electron`
   externals) + **`import()` dynamique** au moment de l'appel (différer le chargement).
2. Externaliser + `require` (le main est CJS).
3. **Bump Electron** vers une version où le loader ESM/CJS est corrigé.
4. SDK dans un **`utilityProcess`/child process** dédié (le SDK lance déjà un sous-process).

Critère de sortie : un smoke qui **initie une `query` SDK depuis le main Electron sans crash**
(le chargement + l'amorçage suffisent ; pas nécessairement un run réseau complet, qui coûte des
tokens et requiert l'auth). **Effet de bord attendu : `npm run hud` refonctionne.** Livrable
documentaire : l'approche retenue + pourquoi, consignée dans le build log et reprise par 2.2.

#### ✅ Conclusion du spike (2026-06-26) — RÉSOLU

**Cause racine** (systematic-debugging) : le crash n'était **pas** le SDK mais l'`import … from
'electron'` **en ESM** dans le process main d'Electron 33 (le builtin ESM d'Electron échoue au
pré-parse CJS : `cjsPreparseModuleExports` → `module.exports` undefined). Preuves :

- Le SDK se charge **sous node nu** (20.18.0) et sous `ELECTRON_RUN_AS_NODE` (node 20.18.3) : OK.
- Un main ESM minimal qui n'importe **que** `electron` (zéro SDK) crashe à l'identique → c'est l'import ESM d'`electron`, pas le SDK.
- Le legacy `hud/main.mjs` est ESM → crash. Le main Forge est **CJS** (`require('electron')`) → pas de crash (d'où `npm start` fonctionnel).
- Test réel : SDK **externalisé** du bundle Vite + `import()` dynamique dans le main CJS Forge → `SPIKE_SDK: OK exports=25`.

**Approche retenue pour 2.2** :

1. Externaliser le SDK du bundle main : `vite.main.config.ts` → `build.rollupOptions.external: ['@anthropic-ai/claude-agent-sdk']` (binaires natifs, non bundlables).
2. `main/services/llm.service.ts` charge le SDK en **`import()` dynamique** (main CJS + SDK ESM : pas de `require` statique). Le `runSkill`/`runRaw` deviennent async sur le chargement paresseux du SDK (le `query` est déjà injectable — l'injection de test reste mockée).
3. **Pas d'`utilityProcess`** (réservé à une optim de perf éventuelle, pas nécessaire pour la correctness).
4. `npm run hud` (ESM) reste cassé jusqu'à son retrait (Phase 4) ; le main fonctionnel est désormais le CJS de Forge.

### 2.1 — Domaine pur + schémas (TS, zéro Electron/fs)

`domain/` (regroupé par thème) :

| Fichier | Sources `lib/` | Nature |
|---|---|---|
| `domain/edition.ts` | edition-render + edition-breves + parse-result | rendu/extraction/parse purs |
| `domain/checking.ts` | checking-model | modèle des cartes de vérification |
| `domain/soul.ts` | soul-model | parsing SOUL pur |
| `domain/agents.ts` | agent-file (parse/serialize) + activity | parse agents + flux d'activité |
| `domain/navigation.ts` | ui-state | machine d'états des vues |
| `domain/format.ts` | ui-format | helpers de formatage |

`shared/` :

| Fichier | Sources / rôle |
|---|---|
| `shared/schemas/inputs.ts` | ← `command-inputs` (`validateInputs`) : un schéma Zod par skill |
| `shared/skills.ts` | ← `command-inputs` (`buildPrompt`) + `skills` (`ALLOWED_SKILLS`) : contrat d'invocation des skills |
| `shared/schemas/outputs.ts` | ← `contracts` : schémas verify/draft/archive |
| `shared/types/api.ts` | interface `Api` = forme de `window.api` |
| `shared/types/ipc.ts` | union des canaux IPC + types payload/result |
| `shared/constants.ts` | ← `skills` (`ALLOWED_SKILLS`) |
| `shared/logger.ts` | logger unique |
| `shared/errors.ts` | `AppError` typé |

Types métier inférés des schémas Zod (`z.infer`) — une seule source de vérité. Les tests
correspondants sont portés vers `domain/`/`shared` (import typé) ; cas valides/invalides des
schémas repris de `contracts.test`/`command-inputs.test`. Suite verte à chaque étape.

### 2.2 — Cœur Electron (TS typé)

| Fichier | Sources `lib/`/`hud/` | Rôle |
|---|---|---|
| `main/index.ts` | hud/main.mjs | fenêtre + lifecycle (remplace le placeholder Phase 1) |
| `main/engine.ts` | hud/engine.mjs | orchestration, `deps` injectées typées |
| `main/services/llm.service.ts` | lib/runner.mjs | consomme le SDK via l'approche du spike |
| `main/io/soul.io.ts` | lib/soul.mjs | I/O SOUL |
| `main/io/editions.io.ts` | lib/editions.mjs + readEdition | I/O éditions |
| `main/io/agents.io.ts` | lib/agent-file.mjs (I/O) | lecture/écriture fichiers agents |
| `main/io/env.ts` | lib/load-env.mjs + config.mjs | env + config moteur |
| `main/ipc/command.handlers.ts` | send-command, archive-ingest | + validation Zod entrée |
| `main/ipc/dashboard.handlers.ts` | get-dashboard, read-edition | |
| `main/ipc/soul.handlers.ts` | get/save soul + échantillons | |
| `main/ipc/agents.handlers.ts` | get/save agents | |
| `main/ipc/system.handlers.ts` | copy, open-external, hide-window | |
| `preload/index.ts` | hud/preload.cjs | contextBridge → `window.api` typé + alias `window.breves` |

Chaque handler `ipcMain.handle` **parse son entrée via Zod** avant traitement ; échec → résultat
`{ ok:false, error }` typé. Validation des **sorties SDK** via les schémas `outputs.ts`.

**Rebranchement renderer (vanilla)** : le placeholder Forge est remplacé par `companion.html` +
`renderer.mjs` servis par Vite. `renderer.mjs` importe les 5 modules `domain/*.ts` (au lieu de
`../lib`) ; ses appels `window.breves.*` passent par l'alias. Phase 3 échangera vanilla→React.

## Erreurs & logging

- `shared/logger.ts` unique remplace les `console.*` côté main.
- `shared/errors.ts` : `AppError` typé ; journalisé côté main, remonté au renderer via `{ ok, error }`
  typé (généralise le pattern `{ ok, error }` déjà présent dans `engine.mjs`).

## Tests

- Port des tests des modules convertis vers `domain/`/`shared` (import typé), suite verte à chaque étape.
- Schémas Zod testés (cas valides/invalides repris de `contracts.test`/`command-inputs.test`).
- `main`/`ipc` testés via l'injection de `deps` (comme `engine.test` aujourd'hui), **SDK mocké** —
  aucun appel réseau ni archivage réel en test.

## Contraintes transverses

- Comportement fonctionnel inchangé ; flux métier préservés.
- App locale mono-utilisateur ; pas d'auth applicative, pas de serveur.
- `breves-archive` écrit dans le wiki → jamais déclenché en test.
- Suite de tests verte à chaque commit.
- Pas de conversion du renderer en React (Phase 3) ni suppression des `.mjs` legacy (Phase 4).
- `npm run hud` conservé comme filet jusqu'en Phase 4 (réparé par le spike 2.0).

## Critères de réussite (Phase 2)

- SDK chargé/exécuté depuis le main Electron sans crash (approche documentée), `npm run hud` réparé.
- `domain/` pur en TS, zéro dépendance Electron/React/fs, testable seul.
- `shared/schemas` Zod = source de vérité ; types via `z.infer` ; validation systématique à la frontière IPC + sorties SDK.
- `main/`+`preload/` typés ; `window.api` exposé (+ alias `window.breves`) ; handlers IPC par domaine.
- L'app Forge (`npm start`) sert la vraie UI vanilla, fonctionnelle, sur le cœur TS.
- `npm run typecheck`/`lint`/`test` verts ; comportement identique à l'avant-Phase 2.
