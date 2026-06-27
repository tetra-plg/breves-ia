# Architecture — Module reglages

> Module : reglages · reverse (constat) · cartographié à `4ce7095`
> Rôle : Architecte Module (`architecture-module`) · Cycle 1.
> Chaque assertion est tracée. Réfère le socle global : `docs/project/architecture.md`.

---

## Périmètre du module dans l'architecture globale

Le module **reglages** traverse trois couches (renderer, main, io) et repose sur le contrat IPC
partagé (`shared/`). Il ne touche pas aux couches `domain/` (logique pure). Il est **autonome**
vis-à-vis des modules métier (nouvelle-edition, soul, agents, commandes) mais constitue un
**prérequis de données** pour tous (voir GAP-17).

```
Renderer : pages/Settings.tsx + components/PathField.tsx
     │ IPC (5 canaux settings + 3 système)
Main     : ipc/settings.handlers.ts + ipc/system.handlers.ts
     │
IO       : io/config.ts (config.json) + io/env.ts (résolution + MCP)
     │ applyConfig
Engine   : engine.ts (applyConfig, buildWikiMcp)
```

---

## Modèle de données (types TS, pas de BDD)

### Types TS du module (`src/shared/types/api.ts:10-14`)

```typescript
type SettingKey    = 'bbDir' | 'repoDir' | 'claudeBin'
type SettingSource = 'env' | 'file' | 'default'
interface SettingField { value: string; source: SettingSource; valid: boolean }
type SettingsState = Record<SettingKey, SettingField>
type SettingsPatch = Partial<Record<SettingKey, string>>
```

Trace : `src/shared/types/api.ts:10-14`.

### Type de persistance (`src/main/io/config.ts:5-9`)

```typescript
interface UserConfig {
  bbDir?: string;
  repoDir?: string;
  claudeBin?: string;
}
```

Seules ces trois clés sont acceptées en lecture/écriture (filtrées par `KEYS` à `config.ts:11`).

### Type EngineConfig (`src/main/io/env.ts:13-18`)

```typescript
interface EngineConfig {
  bbDir: string;
  repoDir: string;
  claudeBin: string;
  wikiMcp: WikiMcp;          // construit par buildWikiMcp()
}
```

`WikiMcp` décrit le processus stdio du MCP wiki Python : `{ type:'stdio', command:string, args:string[] }`.
Trace : `src/main/io/env.ts:7-11`.

### Fichier de persistance

`{userData}/config.json` — chemin calculé par `configPath(userDataDir)` (`src/main/io/config.ts:13`).
Format : JSON 2 espaces, seules les trois clés `UserConfig`. Créé automatiquement si absent
(`mkdirSync({ recursive: true })` — `config.ts:29-30`). Absent → `{}` (pas d'erreur).

---

## Gestion d'état renderer

La vue `Settings.tsx` gère un état local React (`useState<SettingsState | null>`), distinct
du store Zustand global (`app.store.ts`). Le store global n'est utilisé que pour deux actions
de côté-effet : `showToast` et `setDashboard`.

```
[mount] → window.api.getSettings() → setState(SettingsState)
[onChange/onBrowse] → validatePath() → setState (mise à jour locale)
[save] → saveSettings(patch) → toast + getDashboard() (→ store.setDashboard)
```

Trace : `src/renderer/pages/Settings.tsx:17-51`.

Pas de subscription store pour `SettingsState` : l'état des réglages est chargé à chaque
ouverture de la vue (pas de cache global). Cela est intentionnel : la source `env` peut
changer entre deux ouvertures.

---

## Séquences (constatées)

### Boot 1er lancement — écriture des défauts

```
main/index.ts:? → loadEnvFile('.env') → readUserConfig(userDataDir)
  → si config.json absent : writeUserConfig(userDataDir, {})   [implicite par readUserConfig → {}]
  → defaultDeps(env, userConfig) → loadEngineConfig → resolveSetting × 3
```

> Note : à HEAD, le 1er lancement n'écrit **pas** les défauts dans `config.json` — `writeUserConfig`
> n'est appelé que par `save-settings`. `readUserConfig` renvoie `{}` et les défauts hardcodés
> (`env.ts:20-24`) s'appliquent en mémoire uniquement. Aucun fichier n'est créé tant que
> l'utilisateur n'a pas explicitement enregistré.
> _Trace : `src/main/index.ts`, `src/main/io/env.ts:52-56`._

### Ouverture de la vue — get-settings

```
renderer:Settings.tsx:24 → window.api.getSettings()
  → IPC 'get-settings'
  → settings.handlers.ts:30 → buildSettingsState(env, readUserConfig(userDataDir))
    → resolveSetting('bbDir'|'repoDir'|'claudeBin', env, userConfig) × 3
    → pathValid(value, kind) × 3
  → SettingsState { bbDir: {value,source,valid}, repoDir:{…}, claudeBin:{…} }
  → setState(SettingsState)
```

### Saisie / sélection — validate-path

```
renderer: onChange ou browse → validatePath(value, kind)
  → IPC 'validate-path'
  → settings.handlers.ts:32 → pathValid(path, kind)  [config.ts:34-45]
  → boolean
  → setState(prev => { ...prev, [key]: { ...prev[key], value, valid } })
```

### Enregistrement — save-settings → writeUserConfig → applyConfig → buildWikiMcp

```
renderer: save() → window.api.saveSettings(patch)   [patch = keys where source≠'env']
  → IPC 'save-settings'
  → settings.handlers.ts:39
    → pour chaque key du patch : pathValid(v, KINDS[key]) → si invalide → {ok:false}
    → writeUserConfig(userDataDir, { ...readUserConfig(…), ...patch })
    → applyConfig(deps, patch, env)
        → deps.bbDir/repoDir/claudeBin ← patch values
        → deps.wikiMcp ← buildWikiMcp(env, deps.bbDir)
    → { ok: true }
  → showToast('Réglages enregistrés')
  → getDashboard() → setDashboard(…)
```

Trace complète : `settings.handlers.ts:39-55`, `engine.ts:58-63`, `env.ts:44-50`.

---

## Canaux IPC du module (5 settings + 3 système)

| Canal | Sens | Payload entrant | Retour | Handler (trace) |
|---|---|---|---|---|
| `get-settings` | invoke | `{}` | `SettingsState` | `settings.handlers.ts:30` |
| `validate-path` | invoke | `{ path:string, kind:'directory'\|'file' }` | `boolean` | `settings.handlers.ts:32-35` |
| `pick-path` | invoke | `'directory'\|'file'` | `string\|null` | `settings.handlers.ts:37` |
| `save-settings` | invoke | `SettingsPatch` | `SaveResult` | `settings.handlers.ts:39-55` |
| `quit-app` | invoke | `{}` | `void` | `settings.handlers.ts:57-59` |
| `copy` | invoke | `string` | `true` | `system.handlers.ts:12-14` |
| `open-external` | invoke | `string` (URL) | `void` | `system.handlers.ts:16-18` |
| `hide-window` | invoke | `{}` | `void` | `system.handlers.ts:19-21` |

---

## Composants UI du module

| Composant | Fichier | Rôle |
|---|---|---|
| `Settings` (page) | `src/renderer/pages/Settings.tsx` | Orchestration : 3 `PathField`, bouton Enregistrer |
| `PathField` | `src/renderer/components/PathField.tsx` | Champ chemin : label + StatusDot + Input + bouton Parcourir |
| `PathField.module.css` | `src/renderer/components/PathField.module.css` | Layout flex colonne/ligne du champ |

`PathField` utilise exclusivement des primitives du design system : `Eyebrow`, `Input`, `Button`,
`StatusDot`, `Text` (couche `components/ui/`).

---

## Dépendances entre modules (flux de données)

Le module **reglages** est un **fournisseur de configuration** pour l'ensemble de l'app.
La mutation des réglages (`save-settings` → `applyConfig`) modifie `EngineDeps` en mémoire,
ce qui affecte immédiatement tous les modules qui dépendent de `deps.bbDir`, `deps.repoDir`,
`deps.claudeBin`, et `deps.wikiMcp`.

```
reglages ──► engine.deps ──► nouvelle-edition (dispatch, archiveAndIngest)
                         ──► historique       (listEditions via bbDir)
                         ──► soul             (SOUL.md via repoDir)
                         ──► agents           (.claude/agents via repoDir)
                         ──► commands         (.claude/commands via repoDir)
```

Trace : `src/main/engine.ts:27-39` (interface `EngineDeps`), `engine.ts:58-63` (`applyConfig`).

---

## GAPS À REMONTER

| # | Observation |
|---|---|
| GAP-01 | Défauts hardcodés sur la machine de Pierre (`env.ts:20-24,47-48`) — non portables à un autre poste. Chemins Python MCP wiki aussi hardcodés (`BREVES_WIKI_PY`/`BREVES_WIKI_SCRIPT` surchargeable mais défaut fixe). |
| GAP-17 | Dépendance de données : si les trois chemins sont invalides au démarrage, les modules aval sont en état cassé silencieux — pas d'onboarding ni de blocage d'accès aux autres vues. |
