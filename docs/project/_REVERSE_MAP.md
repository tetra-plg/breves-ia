# _REVERSE_MAP — Brèves IA (Companion)

> Carte factuelle du système, reconstituée par triangulation **code ↔ sillage `docs/` ↔ git**.
> Chaque assertion est tracée (`fichier:ligne`, artefact de sillage, ou commit). Le **code fait foi**.
> Cartographié au commit `4ce7095` (HEAD au 2026-06-27). Voir `_REVERSE_STATE.md`.

---

## 1. Identité du produit

**Brèves IA** (`package.json:3`, nom interne `breves-ia-companion` `package.json:2`, v1.0.0) est une
**application de bureau Electron mono-utilisateur** (macOS, fenêtre 400×760 `src/config/constants.ts:1-3`)
qui pilote le **Claude Agent SDK** pour produire une newsletter de brèves d'actualité IA en **3 phases** :
**vérification → rédaction → archivage**.

- Plateforme : Electron 33 + React 19 + TypeScript 6 + Zustand 5 + Zod 4 (`package.json:25-59`).
- Cible Node ≥ 22 (`package.json:6-8`, `.nvmrc:1`).
- Pas d'auth, pas de serveur : app locale mono-utilisateur (`README.md`, confirmé absence de couche réseau).
- Le moteur n'invente jamais : tout fait non confirmé → `non_verifie` (garde-fou central, `.claude/commands/breves-verify.md`, `src/shared/schemas/outputs.ts:4`).

**Sources de données externes** (hors dépôt, résolues par config — voir §6) :
- `repoDir` → ce dépôt : héberge `.claude/agents`, `.claude/commands`, `.claude/breves-ia/SOUL.md`.
- `bbDir` → dépôt **BoilingBrain** : cible d'archivage (`raw/notes`, `raw/clippings`) + serveur MCP wiki.
- `claudeBin` → binaire `claude` local, exécuté par le SDK.

---

## 2. Stack & build (tracé)

| Élément | Valeur | Trace |
|---|---|---|
| Runtime | Electron 33, React 19, Zustand 5, Zod 4 | `package.json:25-45` |
| Dépendance métier | `@anthropic-ai/claude-agent-sdk` ^0.3.181 | `package.json:26` |
| Bundler | electron-forge 7.11 + plugin-vite (3 configs) | `forge.config.ts`, `vite.*.config.ts` |
| Sortie main/preload | `.vite/build/main.cjs`, `preload.cjs` (CJS) | `package.json:9`, `vite.preload.config.ts:13-16` |
| Sortie renderer | `.vite/renderer/main_window/` (outDir absolu obligatoire) | `vite.renderer.config.ts:15` |
| SDK packagé | **externalisé** (`rollupOptions.external`) + copié via `extraResource` hors asar | `vite.main.config.ts:18`, `forge.config.ts:13-18` |
| Signature macOS | ad-hoc (`identity:'-'`), **hardened-runtime désactivé** + entitlements `allow-jit` | `forge.config.ts:19-39`, `build/entitlements.mac.plist:5-14` |
| Fuses | `OnlyLoadAppFromAsar:true`, `RunAsNode:false`, cookie encryption | `forge.config.ts:53-61` |
| Maker | DMG non signé (`MakerDMG`, darwin) | `forge.config.ts:42` |
| Alias TS | `@main @preload @renderer @domain @shared @config @assets` | `tsconfig.json:18-26`, repris dans chaque vite config |
| Tests | Vitest (Node env), 54 fichiers `.test.mjs` | `vitest.config.mjs`, `tests/**` |
| Qualité | ESLint 9 (flat), Prettier, hook Husky pre-commit (typecheck+lint+test) | `eslint.config.mjs`, `.husky/pre-commit` |
| Vitrine | Storybook 10 (react-vite), build statique `storybook-static/` | `.storybook/main.ts`, `package.json:21-22` |

---

## 3. Architecture en couches

Le code suit une **architecture en couches stricte** (vérifiée par le graphe d'imports : `renderer`
n'importe jamais `main` et vice-versa — ils ne communiquent que via le **contrat IPC partagé**).

```
┌────────────────────────────────────────────────────────────────────┐
│  RENDERER (React/Zustand) — processus chrome, fenêtre 400×760       │
│  pages/ · components/ (design system ui/) · store/app.store.ts ·    │
│  layouts/Shell · hooks/useCommandStream                             │
└───────────────┬────────────────────────────────────────────────────┘
                │ window.api (contextBridge)  ▲ command-event (stream)
┌───────────────▼────────────────────────────┴───────────────────────┐
│  PRELOAD src/preload/index.ts — expose window.api + window.breves   │
│  (alias rétro-compat) ; 20 canaux mappés sur ipcRenderer.invoke     │
└───────────────┬────────────────────────────────────────────────────┘
                │ IPC (src/shared/types/ipc.ts — 20 canaux)
┌───────────────▼────────────────────────────────────────────────────┐
│  MAIN (Electron) — index.ts (boot) · ipc/*.handlers (7 groupes) ·   │
│  engine.ts (orchestration) · services/llm.service (SDK) ·           │
│  io/ (config, env, soul, editions)                                  │
└───────────────┬────────────────────────────────────────────────────┘
                │ appelle
┌───────────────▼────────────────────────────────────────────────────┐
│  DOMAIN (logique pure, testable sans Electron) — soul · edition ·   │
│  checking · agents · commands · events · navigation · format ·      │
│  frontmatter                                                        │
│  SHARED — schemas Zod (inputs/outputs) · types (api, ipc) · skills  │
└───────────────┬────────────────────────────────────────────────────┘
                │ runSkill() → Claude Agent SDK query()
┌───────────────▼────────────────────────────────────────────────────┐
│  DONNÉES EXTERNES (hors dépôt) — .claude/agents · .claude/commands ·│
│  SOUL.md  ·  BoilingBrain/raw/{notes,clippings}  ·  MCP wiki        │
└────────────────────────────────────────────────────────────────────┘
```

### 3.1 Couche `domain/` (logique pure)
| Fichier | Rôle | Exports clés (trace) |
|---|---|---|
| `soul.ts` | Parse/sérialise le profil éditorial SOUL (6 sections) | `parseSoul`, `replaceSoulSections`, `replaceSoulEchantillons` (`:63,:88,:102`) |
| `edition.ts` | Rendu HTML d'édition + extraction `Breve` + parsing sentinelles agent | `renderEditionHtml:25`, `extractBreves:144`, `extractJsonBlock:196`, `parseSentinels:218` |
| `checking.ts` | Machine à états du suivi de vérification (`Card`, 5 étapes) | `STEPS:3`, `initCard:36`, `applyEvent:63`, `summary:114` |
| `agents.ts` | Parse/sérialise les agents `.md` + labels d'activité UI | `parseAgent:23`, `serializeAgent:43`, `activityFromMessage:108` |
| `commands.ts` | Parse/sérialise les slash-commands `.md` | `parseCommand:14`, `serializeCommand:19` |
| `events.ts` | Types d'événements métier (`TopicEvent`, `ActivityEvent`, `Alerte`) | `:1-14` |
| `navigation.ts` | Vues, FLOW linéaire, stepper, titres | `VIEWS:1`, `FLOW:6`, `nextView:15`, `stepper:30` |
| `format.ts` | Échappement HTML, markdown inline, dates FR | `escapeHtml:3`, `inlineMd:8`, `dateLong:20` |
| `frontmatter.ts` | Parser YAML frontmatter trivial (partagé agents/commands) | `splitFrontmatter:1` |

### 3.2 Couche `shared/` (contrats)
| Fichier | Rôle | Trace |
|---|---|---|
| `schemas/inputs.ts` | Validation Zod des entrées des 3 skills (anti-injection control-chars) | `validateInputs:48`, `verifySchema:27`, `draftSchema:28`, `archiveSchema:31` |
| `schemas/outputs.ts` | Validation Zod des sorties d'agent (`.passthrough()` pour carry-over) | `verifyOutputSchema:30`, `draftOutputSchema:33`, `archiveOutputSchema:52` |
| `types/api.ts` | Contrat `window.api` (interface `Api`, `ApiResult`, `SettingsState`) | `:7-38` |
| `types/ipc.ts` | Table des 20 canaux IPC + types `IpcLike`/`IpcHandler` | `IPC:1`, `:24-33` |
| `skills.ts` | Registre `ALLOWED_SKILLS` (3) + `buildPrompt` | `:1,:5` |
| `errors.ts` / `logger.ts` | `AppError` ; logger console | `:1` / `:2` |

### 3.3 Couche `main/` (Electron)
- **`index.ts`** — boot : `loadEnvFile` → `readUserConfig` (écrit défauts au 1er lancement) → `defaultDeps` → `registerAllHandlers` → `createWindow` (`:44-90`). Hook smoke `BREVES_SMOKE=1` qui importe le SDK et quitte (`:44-51`). DevTools sur F12 / Cmd-Alt-I (`:35-41`).
- **`engine.ts`** — orchestration métier : `defaultDeps`, `applyConfig` (config à chaud), `dispatch` (route un skill vers le SDK `:136-156`), `archiveAndIngest` (archive puis `runRaw('/ingest')`), CRUD SOUL/agents/commands, `getDashboard`. Validation anti-traversal des noms (`isSafeName:194`) et des fichiers d'édition (regex `:121-128`).
- **`services/llm.service.ts`** — pont SDK : `runSkill` (`:90-151`) et `runRaw` (`:163-196`). Résolution du SDK selon `app.isPackaged` (extraResource `file://` vs node_modules `:45-66`). Options query `permissionMode:'bypassPermissions'` + `allowDangerouslySkipPermissions:true` (`:113-121`). Valide la sortie via les schémas Zod du skill (`:33-37,:134-141`).
- **`io/`** — `config.ts` (persistance `config.json` + `pathValid`), `env.ts` (hiérarchie env>file>défaut `resolveSetting:32`, `buildWikiMcp:44`, parse `.env`), `editions.io.ts` (`listEditions` scanne `{bbDir}/raw/notes` `:21-40`), `soul.io.ts` (parse SOUL en résumé `readSoul:33`).
- **`ipc/`** — 7 groupes de handlers enregistrés par `registerAllHandlers` (`ipc/index.ts:18-24`). Voir §5.

### 3.4 Couche `renderer/` (React) — la plus lourde (147 co-change components, 56 pages)
- **`store/app.store.ts`** — store Zustand unique (~20 slices, 30+ actions) : `view`, `cards`, `verifyValue`/`draftValue`/`archiveValue`, `runStatus`, `teamsText`, `soulForm`/`echantillons`/`soulJournal`, etc. Navigation `go(action)` (`:118`), cycle de run `beginRun/endRun/tickClock` (`:131-137`), réduction d'événements `applyCardEvent`/`applyResultCards` (`:129-130`).
- **`App.tsx`** — routeur (registry `VIEWS[view]→Page` `:22-37`) + montage unique de `useCommandStream`.
- **`pages/`** (15) — `Dashboard`, `Compose`, `Checking`, `Detail`, `Editor`, `Archived`, `Soul`, `EchEditions`, `EchBreves`, `History`, `Reader`, `Agents`, `Commands`, `Settings`.
- **`components/`** — composites métier (`EnqCard`, `CorrectionRow`, `SourceRow`, `AgentCard`, `CommandCard`, `Drawer`…) + **design system `ui/`** (14 primitives : Button, Card, Alert, Badge, Pill, Spinner, StatusDot, Input, Textarea, Modal, Stepper, Text, Eyebrow + foundations MDX). Chaque primitive a `.stories.tsx` + test (invariant de couverture `tests/renderer/stories-coverage.test.mjs`).
- **`hooks/useCommandStream.ts`** — route le flux `onCommandEvent` → `setRunActivity` / `applyCardEvent`.
- **`styles/`** — `tokens.css` (couches sémantiques + échelle `--space`), `app.css`.

---

## 4. Le pipeline métier en 3 phases (cœur produit)

Le flux utilisateur linéaire est `compose → checking → editor → archived` (`src/domain/navigation.ts:6`).
Chaque phase déclenche un **skill** (slash-command `.claude/commands/*.md`) exécuté par le SDK, qui
fan-out vers des **sous-agents** (`.claude/agents/*.md`).

### Phase 1 — Vérification (`breves-verify`)
- **UI** : `Compose.tsx:41` → `sendCommand('breves-verify',{sujets,sceptique?})` → vue `checking`.
- **Commande** (`.claude/commands/breves-verify.md`) : émet `«BREVES» topic <key>` par sujet (alimente le suivi live), fan-out jusqu'à **15** sous-agents `enqueteur` en parallèle (Task), émet les jalons `step/done/error`, puis **passe sceptique** optionnelle (`off|ciblé|toujours`).
- **Sous-agents** : `enqueteur` (WebSearch/WebFetch, modèle opus, vérifie faits/date/source/clipping, n'invente jamais) ; `sceptique` (WebSearch/WebFetch, modèle sonnet, tente de réfuter — déployé en mode `ciblé` sur affirmations fortes).
- **Sortie** (Zod `verifyOutputSchema`) : `{ topics: [{ key, sujet, date_reelle, fiabilite, source, url_citee, url_clippee, slug, clipping_contenu, faits[], alerte? }] }`.
- **Suivi live** : les sentinelles `«BREVES» …` sont parsées (`parseSentinels`), streamées au renderer (`command-event`), réduites en `Card` à 5 étapes (`recherche→faits→date→source→article`).

### Phase 2 — Rédaction (`breves-draft`)
- **UI** : `Editor.tsx` lance `sendCommand('breves-draft',{topics,feedback?,redacteur?})` au montage si pas de `draftValue`.
- **Commande** : si `redacteur:on` → délègue au sous-agent `redacteur` (modèle opus, aucun outil, incarne la SOUL §3-5) ; sinon rédige en direct. Regroupe par date, accroche en gras, URL nue, **zéro tiret cadratin** (règle SOUL).
- **Sortie** (Zod `draftOutputSchema`) : `{ teamsText, corrections[], sources[], soulLessonProposee? }`.

### Phase 3 — Archivage (`breves-archive`)
- **UI** : `Archived.tsx:30` → `window.api.archive({teamsText,topics,sources,leconSOUL?})`.
- **Commande** : dépose la note (`drop_to_raw('notes',…)`), les clippings par topic (`drop_to_raw('clippings',…)`, sauf `non_verifie`/repli épuisé), met à jour la SOUL **§6 uniquement** si `leconSOUL` (jamais §5). Puis `engine.archiveAndIngest` enchaîne `runRaw('/ingest')` vers le wiki (`command.handlers.ts:17-32`).
- **Sortie** (Zod `archiveOutputSchema`) : `{ archiveSteps[], newsletterText, soulVersion }`.

### La SOUL (profil éditorial, `.claude/breves-ia/SOUL.md`)
6 sections : §1 Qui parle · §2 Audience · §3 Voix & tics · §4 Lignes rouges · §5 Échantillons vivants
(≤3, **curation manuelle, jamais touchés par l'archivage**) · §6 Journal d'évolution (leçons datées,
alimenté par la gate « propose puis confirme »). Versioning implicite : `v{nb leçons §6 + 1}`
(`src/domain/soul.ts:67`).

---

## 5. Surface IPC (20 canaux — `src/shared/types/ipc.ts`)

| Domaine | Canal | Handler (trace) | Entrée → Sortie |
|---|---|---|---|
| Pipeline | `send-command` | `command.handlers.ts:5` | `{skill,inputs}` → `RunResult` (+ stream `command-event`) |
| Pipeline | `archive-ingest` | `command.handlers.ts:17` | `{teamsText,topics,sources,leconSOUL?}` → `RunResult & {ingest?}` |
| Dashboard | `get-dashboard` | `dashboard.handlers.ts:5` | `{}` → `{soul,editions}` |
| Dashboard | `read-edition` | `dashboard.handlers.ts:6` | `file` → `string\|null` |
| SOUL | `get-soul-structured` | `soul.handlers.ts:6` | `{}` → `Soul` |
| SOUL | `save-soul-sections` | `soul.handlers.ts:7` | `SoulSectionEdits` → `{ok,error?}` |
| SOUL | `save-soul-echantillons` | `soul.handlers.ts:8` | `Echantillon[]` (≤3) → `{ok,error?}` |
| Agents | `get-agents` / `save-agent` | `agents.handlers.ts:5,6` | … → `Agent[]` / `{ok,error?}` |
| Commands | `get-commands` / `save-command` | `commands.handlers.ts:5,6` | … → `Command[]` / `{ok,error?}` |
| Système | `copy` / `open-external` / `hide-window` | `system.handlers.ts:12,16,19` | clipboard / URL `https?://` / hide |
| Settings | `get-settings` / `validate-path` / `pick-path` / `save-settings` / `quit-app` | `settings.handlers.ts:30,32,37,39,57` | config bbDir/repoDir/claudeBin |

Preload : `window.api` (+ alias rétro-compat `window.breves` — vestige Phase 4, `src/preload/index.ts:35-36`).

---

## 6. Résolution de configuration (env > file > défaut)

`src/main/io/env.ts:32-42` (`resolveSetting`). Trois réglages (`SettingKey` = `bbDir|repoDir|claudeBin`) :

| Clé | Variable d'env | Défaut (hardcodé `env.ts:20-24`) | Usage |
|---|---|---|---|
| `bbDir` | `BREVES_BB_DIR` | `/Users/pleguern/Workspace/BoilingBrain` | cible archivage + MCP wiki |
| `repoDir` | `BREVES_REPO_DIR` | `/Users/pleguern/Workspace/breves-ia` | SOUL, agents, commands |
| `claudeBin` | `BREVES_CLAUDE_BIN` | `/Users/pleguern/.local/bin/claude` | binaire SDK |

Persistance utilisateur : `{userData}/config.json` (`io/config.ts:14`), écrit au 1er lancement et par
`save-settings` (qui applique aussi à chaud via `applyConfig` `settings.handlers.ts:50`). MCP wiki
construit par `buildWikiMcp` (Python fastmcp + script, chemins hardcodés `env.ts:47-48`).

---

## 7. Périmètre de cartographie & angles morts

- **Mode** : triangulation complète **code + sillage + git** (sillage très riche : 16 specs, 22 plans, 25 buildlogs `docs/`, ~80 rapports SDD `.superpowers/sdd/`).
- Les **zones d'ombre** (intentions métier non déductibles, defaults hardcodés, drift potentiel) sont consignées dans `docs/REVERSE_GAPS.md` (non comblées par hypothèse).
- La **timeline** code↔intention↔git est dans `_REVERSE_RECONCILIATION.md`.
- La **détection de modules** et la proposition global/par-module sont dans `_REVERSE_MODULE_MAP.md` (à valider en checkpoint PM).
