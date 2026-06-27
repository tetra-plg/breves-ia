# Implementation Globale — Brèves IA

> Framework : **reverse (constat)** · cartographié à `4ce7095` (2026-06-27).
> Chaque assertion est tracée (`fichier:ligne`). Le code fait foi.
> Rôle Lead Dev Global (Cycle 0) — périmètre : protocoles de communication, contrats IPC,
> types de transport, conventions de code, contraintes/limitations.

---

## Protocoles de communication

L'application ne comporte ni REST, ni WebSocket, ni aucune couche réseau. La totalité
de la communication est **IPC Electron**.

### Requête / réponse (invoke)

`ipcRenderer.invoke(canal, …args)` côté renderer ↔ `ipc.handle(canal, listener)` côté main.

Trace : `src/preload/index.ts:6-32` (20 appels `.invoke`), `src/main/ipc/*.handlers.ts`.

### Streaming push (événements)

Le main pousse des événements vers le renderer via `event.sender.send(IPC.commandEvent, ev)`
pendant l'exécution d'un skill — avec garde `!e.sender.isDestroyed()` avant chaque envoi.

Trace : `src/main/ipc/command.handlers.ts:7-9`.

Le renderer s'abonne par `window.api.onCommandEvent(cb)` qui retourne une fonction de
désabonnement (pattern `ipcRenderer.on` / `removeListener`).

Trace : `src/preload/index.ts:7-13`, `src/renderer/hooks/useCommandStream.ts:26-31`.

### Exposition (contextBridge)

`contextBridge.exposeInMainWorld('api', api)` expose `window.api`. L'alias rétro-compat
`window.breves` (même objet) est exposé via `exposeInMainWorld('breves', api)`.

Trace : `src/preload/index.ts:34-36`. `contextIsolation` activé (défaut Electron 33) :
aucun accès direct à `ipcRenderer` depuis le renderer. Voir GAP-03 pour l'alias.

---

## Patterns transversaux

### Format de résultat standardisé

Union discriminée, pas de format HTTP :

```typescript
// src/shared/types/api.ts:7-8
type ApiResult<T = unknown> = { ok: true; value: T } | { ok: false; error: string }
type SaveResult = { ok: boolean; error?: string }
```

- Commandes (`send-command`, `archive-ingest`) → `ApiResult`.
- Écritures (`save-soul-sections`, `save-soul-echantillons`, `save-agent`, `save-command`, `save-settings`) → `SaveResult`.
- Lectures (`get-dashboard`, `get-soul-structured`, `get-agents`, `get-commands`, `get-settings`) → valeur directe.
- Lectures optionnelles (`read-edition`, `pick-path`) → `T | null`.
- Actions système (`copy`) → `true` ; (`open-external`, `hide-window`, `quit-app`) → `void`.

### Pagination

**Sans objet** (constaté) : aucune pagination. `listEditions` retourne l'intégralité des fichiers
`.md` du dossier `{bbDir}/raw/notes`, triés plus récents d'abord.
Trace : `src/main/io/editions.io.ts:21-40`.

### Authentification / session

**Sans objet** (constaté) : app locale mono-utilisateur, aucun token, aucune session.
Les permissions du SDK sont bypassées (voir §Contraintes / GAP-02).

---

## Contrats IPC

### Table exhaustive des 20 canaux

Constantes déclarées dans `src/shared/types/ipc.ts:1-22`.
Surface typée dans `src/shared/types/api.ts:17-38` (interface `Api`).

| Canal (`IPC.*`) | Clé string | Payload renderer→main | Retour main→renderer | Handler (trace) |
| --- | --- | --- | --- | --- |
| `sendCommand` | `send-command` | `{ skill: string, inputs: unknown }` | `ApiResult` (+ stream `command-event`) | `command.handlers.ts:5` |
| `commandEvent` | `command-event` | — | `StreamEvent` (push) | broadcast `command.handlers.ts:7-9` |
| `archiveIngest` | `archive-ingest` | `{ teamsText, topics, sources, leconSOUL? }` | `RunResult & { ingest?: RunRawResult }` | `command.handlers.ts:17` |
| `getDashboard` | `get-dashboard` | — | `Dashboard` | `dashboard.handlers.ts:5` |
| `readEdition` | `read-edition` | `file: string` | `string \| null` | `dashboard.handlers.ts:6` |
| `getSoulStructured` | `get-soul-structured` | — | `Soul \| null` | `soul.handlers.ts:6` |
| `saveSoulSections` | `save-soul-sections` | `SoulSectionEdits` | `SaveResult` | `soul.handlers.ts:7` |
| `saveSoulEchantillons` | `save-soul-echantillons` | `Echantillon[]` (≤3) | `SaveResult` | `soul.handlers.ts:8` |
| `getAgents` | `get-agents` | — | `Agent[]` | `agents.handlers.ts:5` |
| `saveAgent` | `save-agent` | `{ name: string, edits: AgentEdits }` | `SaveResult` | `agents.handlers.ts:6` |
| `getCommands` | `get-commands` | — | `Command[]` | `commands.handlers.ts:5` |
| `saveCommand` | `save-command` | `{ name: string, edits: CommandEdits }` | `SaveResult` | `commands.handlers.ts:6` |
| `copy` | `copy` | `text: string` | `true` | `system.handlers.ts:12` |
| `openExternal` | `open-external` | `url: string` (filtré `^https?://`) | `void` | `system.handlers.ts:16` |
| `hideWindow` | `hide-window` | — | `void` | `system.handlers.ts:19` |
| `getSettings` | `get-settings` | — | `SettingsState` | `settings.handlers.ts:30` |
| `validatePath` | `validate-path` | `{ path: string, kind: 'directory'\|'file' }` | `boolean` | `settings.handlers.ts:32` |
| `pickPath` | `pick-path` | `kind: 'directory'\|'file'` | `string \| null` | `settings.handlers.ts:37` |
| `saveSettings` | `save-settings` | `Partial<Record<SettingKey, string>>` | `SaveResult` | `settings.handlers.ts:39` |
| `quitApp` | `quit-app` | — | `void` | `settings.handlers.ts:57` |

Note : `command-event` est un push (`sender.send`) sans invoke ; il n'a pas de handler
`ipc.handle` propre et n'apparaît pas dans les 19 canaux invoke. Il est compté dans les 20
car il figure dans `IPC` et dans `onCommandEvent` (preload).

### Détail des 3 canaux du pipeline

#### `send-command` — validation des entrées (Zod strict)

Source : `src/shared/schemas/inputs.ts`.

```typescript
// breves-verify (verifySchema, ligne 27)
{
  sujets: bulkText,          // string min1 max8000, sauts de ligne autorisés, aucun control-char hors \n
  sceptique?: 'off' | 'ciblé' | 'toujours'
}

// breves-draft (draftSchema, ligne 29)
{
  topics: unknown[],
  feedback?: freeString,     // string max280, aucun control-char
  redacteur?: 'on' | 'off'
}

// breves-archive (archiveSchema, ligne 31)
{
  teamsText: string,         // non vide (trim)
  topics: unknown[],
  sources: unknown[],
  leconSOUL?: freeString     // max280, aucun control-char
}
```

Tous les schémas utilisent `.strict()` : toute clé hors-schéma est rejetée.
`validateInputs(skill, inputs)` vérifie d'abord l'appartenance à `ALLOWED_SKILLS`
(`src/shared/skills.ts:1`), puis applique le schéma. Trace `inputs.ts:48-55`.

Prompt envoyé au SDK : `buildPrompt(skill, inputs)` → `/${skill}\n\nINPUTS (utilise-les, ne pose aucune question) :\n${JSON.stringify(inputs)}`.
Trace `src/shared/skills.ts:5-13`.

#### `send-command` — validation des sorties (Zod passthrough)

Source : `src/shared/schemas/outputs.ts`.

```typescript
// VerifyOutput (verifyOutputSchema:30)
{
  topics: Array<{
    key: string,           // min1
    sujet: string,         // min1
    date_reelle: string,   // min1
    fiabilite: 'confirme' | 'partiel' | 'non_verifie',
    source: string,        // min1
    url_citee: string,     // min1
    url_clippee: string,   // min1
    slug: string,          // min1
    clipping_contenu: string, // min1
    faits: string[],
    alerte?: { niveau: 'corrigé' | 'nuance' | 'date', texte: string } | null
    // champs supplémentaires conservés via .passthrough()
  }>
}

// DraftOutput (draftOutputSchema:33)
{
  teamsText: string,       // min1
  corrections: Array<{ niveau: 'corrigé'|'nuance'|'date', titre: string, detail: string }>,
  sources: Array<{ name: string, url_citee: string, url_clippee: string, repli: boolean }>,
  soulLessonProposee?: string | null
}

// ArchiveOutput (archiveOutputSchema:52)
{
  archiveSteps: Array<{ t: string, d: string }>,
  newsletterText: string,  // min1
  soulVersion: string      // min1
}
```

`topicSchema` est en `.passthrough()` (`:14-28`) : les champs supplémentaires (carry-over)
sont préservés — utilisés par l'UI sans être spécifiés dans le contrat.

Validateurs exportés : `validateVerifyOutput`, `validateDraftOutput`, `validateArchiveOutput`
(`outputs.ts:69-71`). Appelés dans `llm.service.ts:144-150` après extraction du bloc JSON.

#### `archive-ingest` — enchaînement

`archiveAndIngest` dans `src/main/engine.ts:264-281` :

1. `dispatch({ skill: 'breves-archive', inputs, onEvent }, deps)` → `RunResult`.
2. Si `ok: true`, `runRaw({ prompt: '/ingest', cwd: bbDir, … })` → `RunRawResult`.
3. Retour : `{ ...archiveResult, ingest?: RunRawResult }`.

Handler : `command.handlers.ts:17-33`. Le flux `command-event` est actif pendant les deux phases.

---

## Types TypeScript de transport IPC

Types qui transitent par l'IPC (pas des entités persistées en base).

```typescript
// src/shared/types/api.ts:10-14
type SettingKey   = 'bbDir' | 'repoDir' | 'claudeBin'
type SettingSource = 'env' | 'file' | 'default'
interface SettingField  { value: string; source: SettingSource; valid: boolean }
type SettingsState = Record<SettingKey, SettingField>
type SettingsPatch = Partial<Record<SettingKey, string>>

// src/main/engine.ts:184-191
interface AgentEdits {
  systemPrompt: string
  model?: string
  tools?: string[]
  enabled?: boolean
  mode?: string
  description?: string
}

// src/domain/commands.ts (via engine.ts:23)
interface CommandEdits { body: string; description?: string }

// src/domain/soul.ts (via engine.ts:17-20)
interface SoulSectionEdits { quiParle: string; audience: string; voix: string; lignesRouges: string }
// type Echantillon = { date: string; source: string; texte: string }

// src/main/engine.ts:158-161
interface Dashboard { soul: SoulSummary | null; editions: EditionSummary[] }

// src/main/services/llm.service.ts:30-31
type RunResult    = { ok: true; value: unknown } | { ok: false; error: string }
type RunRawResult = { ok: boolean; text: string }

// types StreamEvent (llm.service.ts:28)
type StreamEvent = TopicEvent | ActivityEvent | { type: string; error?: string; [key: string]: unknown }
```

Types exports Zod (`src/shared/schemas/outputs.ts:31,50,58`) :
`VerifyOutput`, `DraftOutput`, `ArchiveOutput`.

---

## Conventions de code (constatées)

### Nommage des fichiers

| Convention | Exemple | Trace |
| --- | --- | --- |
| Handlers IPC | `*.handlers.ts` | `src/main/ipc/` (7 fichiers) |
| I/O fichiers | `*.io.ts` | `src/main/io/editions.io.ts`, `soul.io.ts` |
| Services | `*.service.ts` | `src/main/services/llm.service.ts` |
| Composants React | PascalCase `.tsx` | `src/renderer/components/`, `pages/` |
| Stories Storybook | `*.stories.tsx` | `src/renderer/components/ui/*` |
| Tests | `*.test.mjs` (non colocalisés) | `tests/**/*.test.mjs` |
| Modules domaine | kebab-case `.ts` | `src/domain/soul.ts`, `format.ts`, etc. |

### Alias de chemins (tsconfig + vite)

```text
@main/*     → src/main/*
@preload/*  → src/preload/*
@renderer/* → src/renderer/*
@domain/*   → src/domain/*
@shared/*   → src/shared/*
@config/*   → src/config/*
@assets/*   → src/assets/*
```

Trace : `tsconfig.json:18-26`, repris dans `vite.main.config.ts`, `vite.preload.config.ts`,
`vite.renderer.config.ts`, `vitest.config.mjs`. Zéro `../../` dans les imports `src/`.

### Système de modules

`"type":"module"` (`package.json:5`) — ES modules natifs. Les sorties main et preload sont
bundlées en `.cjs` par Vite/Rollup (`vite.preload.config.ts:13-16`) pour la compatibilité
Electron (require CJS). Le renderer est ESM pur.

### Structure d'un handler IPC

Usine `register*Handlers(ipc, deps[, sys, userDataDir, env])`, enregistrée par groupe.
Point d'entrée unique : `registerAllHandlers` (`src/main/ipc/index.ts:11-25`) appelé au boot.

Patron interne de chaque handler :

1. Extraire et typer le `payload` (`(payload ?? {}) as ...`).
2. Appeler `engine.*` ou `sys.*`.
3. Retourner `ApiResult` / `SaveResult` / valeur directe.
4. Erreurs imprévues catchées → `{ ok: false, error: (err as Error).message }`.

Trace représentative : `command.handlers.ts:5-15`, `settings.handlers.ts:39-55`.

### Composants React

- Fonctionnels uniquement, hooks.
- Primitives `ui/` : CSS Modules (`*.module.css`), une story `.stories.tsx` et un test `.test.mjs` par primitive (invariant vérifié par `tests/renderer/stories-coverage.test.mjs`).
- Styles globaux : `src/renderer/styles/tokens.css` (tokens sémantiques + échelle `--space`) + `app.css`.

### Store Zustand

Store unique `src/renderer/store/app.store.ts`. Deux patterns constatés :

**Lecture à chaud dans les actions async** : `useAppStore.getState()` (et non `get()` de la
closure) pour éviter les valeurs périmées.
Trace (commenté dans les pages) : `Editor.tsx:32-49`, `Archived.tsx:17-43`.

**Ref run-once** : `useRef(false)` pour déclencher une action une seule fois au montage.
Trace : `Editor.tsx:52`, `Archived.tsx:46`, `Soul.tsx:29`.

Navigation par actions nommées : `go(action)` → `nextView(current, action)`.
Trace `app.store.ts:118`, `src/domain/navigation.ts:11-17`.

**Vues hors-routeur** (`detail`, `reader`) : atteintes par `setView(view)` direct, absentes
du tableau `VIEWS` dans `navigation.ts:1-4`, câblées dans le registry `App.tsx:22-37`.
Voir GAP-04.

### Routage de flux `command-event`

`useCommandStream` (monté une fois dans `App.tsx`) abonne `window.api.onCommandEvent` et
route via `handleStreamEvent` :

- `type === 'activity'` → `store.setRunActivity(label)`.
- `type ∈ ['topic-detected','topic-progress','topic-done','topic-error']` → `store.applyCardEvent(ev)`.

Trace : `src/renderer/hooks/useCommandStream.ts:13-31`.

### Qualité / linting

ESLint 9 flat config (`eslint.config.mjs`) :

- `@typescript-eslint/recommended` + `@typescript-eslint/no-explicit-any: 'error'`.
- `eslint-plugin-react-hooks` (règles recommandées).
- `eslint-plugin-react-refresh`.
- `eslint-config-prettier` (désactive les règles de formatage en conflit).
- Scope : `src/**/*.{ts,tsx}` uniquement (scripts et tests exclus par `ignores`).

TypeScript strict (`tsconfig.json:7-13`) : `strict`, `noUnusedLocals`, `noUnusedParameters`,
`noFallthroughCasesInSwitch`, `isolatedModules`.

Gate pre-commit : `.husky/pre-commit` → typecheck + lint + test (via nvm pour Node 22).

### Anti-traversal (nommage de fichiers)

`isSafeName(name)` (`src/main/engine.ts:194-196`) : rejette tout nom contenant `/`, `\` ou `..`.
Appliqué dans `saveAgent` (`:198`) et `saveCommand` (`:243`).
`readEdition` filtre les noms via regex `/^\d{4}-\d{2}-\d{2}-breves-ia-merim(-[a-z0-9-]+)?\.md$/`
(`:122`).

---

## Implémentation par module

| Module | Fichiers clés | Canaux IPC |
| --- | --- | --- |
| **socle** | `shared/types/{api,ipc}.ts`, `shared/schemas/{inputs,outputs}.ts`, `shared/skills.ts`, `shared/errors.ts`, `shared/logger.ts`, `store/app.store.ts`, `components/ui/*` (14 primitives), `engine.ts`, `services/llm.service.ts`, `io/{config,env}.ts`, `preload/index.ts`, configs build (`forge.config.ts`, `vite.*.config.ts`, `tsconfig.json`, `eslint.config.mjs`) | tous |
| **accueil** | `pages/Dashboard.tsx`, `ipc/dashboard.handlers.ts`, `main/engine.ts:163-176` | `get-dashboard` |
| **nouvelle-edition** | `pages/{Compose,Checking,Detail,Editor,Archived}.tsx`, `ipc/command.handlers.ts`, `engine.dispatch:136-156`, `engine.archiveAndIngest:264-281`, `domain/{checking,edition,events}.ts`, `schemas/{inputs,outputs}.ts`, `hooks/useCommandStream.ts` | `send-command`, `command-event`, `archive-ingest` |
| **historique** | `pages/{History,Reader}.tsx`, `ipc/dashboard.handlers.ts`, `io/editions.io.ts` | `read-edition` |
| **soul** | `pages/{Soul,EchEditions,EchBreves}.tsx`, `ipc/soul.handlers.ts`, `io/soul.io.ts`, `domain/soul.ts` | `get-soul-structured`, `save-soul-sections`, `save-soul-echantillons` |
| **agents** | `pages/Agents.tsx`, `ipc/agents.handlers.ts`, `domain/agents.ts`, `engine.ts:65-82,179-220` | `get-agents`, `save-agent` |
| **commands** | `pages/Commands.tsx`, `ipc/commands.handlers.ts`, `domain/commands.ts`, `engine.ts:222-254` | `get-commands`, `save-command` |
| **reglages** | `pages/Settings.tsx`, `ipc/settings.handlers.ts`, `ipc/system.handlers.ts`, `io/{config,env}.ts`, `engine.applyConfig:58-63` | `get-settings`, `validate-path`, `pick-path`, `save-settings`, `quit-app`, `copy`, `open-external`, `hide-window` |

---

## Contraintes et limitations (constatées)

- **Node ≥ 22 imposé** : `engines.node >=22` dans `package.json:6-8`, requis par le hook
  pre-commit (via nvm dans `.husky/pre-commit`).
- **SDK hors asar** : `@anthropic-ai/claude-agent-sdk` est externalisé (`vite.main.config.ts:18`,
  `rollupOptions.external`) et copié via `extraResource` (`forge.config.ts:13-18`). En app
  packagée, importé par chemin `file://` absolu (`llm.service.ts:45-56`). Sans cela, le
  fork/spawn du SDK casse en production.
- **outDir renderer absolu** : `path.resolve(__dirname, '.vite/renderer/main_window')` obligatoire
  dans `vite.renderer.config.ts:15` — sans cela la fenêtre est vide en production.
- **`bypassPermissions` hardcodé** : `permissionMode:'bypassPermissions'` +
  `allowDangerouslySkipPermissions:true` dans `llm.service.ts:113-121` — le SDK exécute
  outils, Bash et MCP sans confirmation utilisateur. Intentionnel (app locale de confiance).
  Voir GAP-02.
- **Plafond de 15 sujets** : limite parallèle du fan-out enquêteur fixée en prose dans
  `.claude/commands/breves-verify.md:17`, sans validation côté code. Voir GAP-09.
- **Dépendance MCP wiki externe** : `buildWikiMcp` construit la config du serveur Python
  (`io/env.ts:44-50`) ; l'archivage (`/ingest`) est inopérant sans le serveur BoilingBrain.
  Voir GAP-10.
- **CLI `npm run breves`** : outil de dev secondaire (`scripts/breves-cli.ts`) ; force
  `repoDir = cwd` et reconstruit `bbDir`/`wikiMcp` indépendamment de `config.json`.
  Voir GAP-11.
- **Fenêtre fixe** 400×760 px (`src/config/constants.ts:1-3`).
- **Signature macOS ad-hoc** : hardened-runtime désactivé (`forge.config.ts:24`). Quarantaine
  à retirer avant le 1er lancement (`scripts/install-local.sh:51-53`). Voir `memory/macos-signing-quarantine.md`.

---

## Gaps à remonter (Lead Dev)

Les gaps ci-dessous relèvent du périmètre Lead Dev ou demandent un arbitrage Lead Dev / PM.
Registre complet : `docs/REVERSE_GAPS.md`.

| # | type | observation | localisation |
| --- | --- | --- | --- |
| GAP-03 | divergence | Alias `window.breves` annoncé « Phase 4 removal » encore présent à HEAD. Retirer ou documenter comme API stable. | `src/preload/index.ts:35-36` |
| GAP-04 | divergence | Vues `detail` et `reader` absentes de `VIEWS` (`navigation.ts:1-4`) mais câblées dans `App.tsx:22-37` via `setView` direct — hors du routeur `nextView`. Incohérence de modèle. | `src/domain/navigation.ts`, `src/renderer/App.tsx` |
| GAP-06 | dead-code | `EditionSummary.corr` toujours à `0` dans `editions.io.ts:37` — feature « nb corrections » non finie. | `src/main/io/editions.io.ts:37` |
| GAP-07 | divergence | `SENTINEL_STEPS` (`edition.ts:194`) duplique `STEPS` (`checking.ts:3`) au lieu de le réutiliser — risque de drift. | `src/domain/edition.ts:194`, `src/domain/checking.ts:3` |
| GAP-09 | edge-case | Plafond 15 sujets en prose uniquement — pas de validation `topics.length<=15` côté code. | `.claude/commands/breves-verify.md:17` |
| GAP-11 | config | CLI dev force `repoDir=cwd`, bypass `config.json`. Comportement non documenté. | `scripts/breves-cli.ts:4-5` |
| GAP-12 | sécurité | Aucune CSP ; polices Google Fonts chargées depuis l'extérieur. Sévérité moyenne. | `src/renderer/index.html:7-12` |
| GAP-13 | sécurité | DevTools (F12 / Cmd-Alt-I) activable en production — à conditionner à `!app.isPackaged`. Sévérité basse. | `src/main/index.ts:35-41` |
| GAP-14 | sécurité | `escapeHtml` n'échappe pas `"` / `'` (seulement `& < >`). URL avec `"` interpolée dans `href` → casse attribut. Sévérité basse. | `src/domain/format.ts:3-5`, `edition.ts:58,89` |
| GAP-15 | sécurité | `sandbox` et `nodeIntegration` non explicités dans `webPreferences`. À durcir explicitement. Sévérité info. | `src/main/index.ts:21-24` |
