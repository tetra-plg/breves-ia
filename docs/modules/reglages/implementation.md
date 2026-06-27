# Implementation — Module reglages

> Module : reglages · reverse (constat) · cartographié à `4ce7095`
> Rôle : Lead Dev Module (`implementation-module`) · Cycle 1.
> Chaque assertion est tracée (`fichier:ligne`). Le code fait foi.
> Réfère le socle global : `docs/project/implementation.md`.

---

## Fichiers du module

| Fichier | Rôle |
|---|---|
| `src/renderer/pages/Settings.tsx` | Page React — orchestration UI |
| `src/renderer/components/PathField.tsx` | Composant champ chemin |
| `src/renderer/components/PathField.module.css` | Layout CSS du PathField |
| `src/main/ipc/settings.handlers.ts` | Handlers IPC (5 canaux settings) |
| `src/main/ipc/system.handlers.ts` | Handlers IPC système (copy/open-external/hide-window) + quit |
| `src/main/io/config.ts` | Persistance `config.json` + `pathValid` |
| `src/main/io/env.ts` | Résolution `resolveSetting`, défauts, `buildWikiMcp`, `parseEnv`, `loadEnvFile` |
| `src/main/engine.ts` | `applyConfig` (mutation à chaud de `EngineDeps`) |
| `src/shared/types/api.ts:10-14` | Types `SettingKey`, `SettingSource`, `SettingField`, `SettingsState`, `SettingsPatch` |
| `src/shared/types/ipc.ts:16-21` | Noms de canaux IPC settings |

---

## Contrats IPC (5 canaux settings)

### `get-settings`

```
Canal    : IPC.getSettings = 'get-settings'  [ipc.ts:16]
Handler  : settings.handlers.ts:30
Payload  : aucun
Retour   : SettingsState = { bbDir: SettingField, repoDir: SettingField, claudeBin: SettingField }
Logique  : buildSettingsState(env, readUserConfig(userDataDir))
             → resolveSetting(key, env, userConfig) × 3   [env.ts:32-42]
             → pathValid(value, KINDS[key]) × 3           [config.ts:34-45]
```

### `validate-path`

```
Canal    : IPC.validatePath = 'validate-path'  [ipc.ts:17]
Handler  : settings.handlers.ts:32-35
Payload  : { path?: string; kind?: 'directory' | 'file' }   [payload inconnu typé en cast]
Retour   : boolean
Logique  : pathValid(path ?? '', kind === 'file' ? 'file' : 'directory')
Note     : `kind` invalide → repli sur 'directory'
```

### `pick-path`

```
Canal    : IPC.pickPath = 'pick-path'  [ipc.ts:18]
Handler  : settings.handlers.ts:37
Payload  : 'directory' | 'file'   [typé inconnu, cast inline]
Retour   : string | null   (null si annulé)
Logique  : sys.pickPath(kind === 'file' ? 'file' : 'directory')
           sys.pickPath → Electron dialog.showOpenDialog (implémentation dans main/index.ts)
```

### `save-settings`

```
Canal    : IPC.saveSettings = 'save-settings'  [ipc.ts:19]
Handler  : settings.handlers.ts:39-55
Payload  : SettingsPatch (Partial<Record<SettingKey, string>>)  [casté depuis unknown]
Retour   : SaveResult = { ok: boolean; error?: string }
Logique  :
  1. Pour chaque key dans patch ∩ KINDS :
       si pathValid(v, KINDS[key]) === false → return { ok:false, error:`Chemin invalide pour ${key} : ${v}` }
  2. writeUserConfig(userDataDir, { ...readUserConfig(userDataDir), ...patch })
  3. applyConfig(deps, patch, env)
  4. return { ok: true }
  Erreur FS → catch(e) → return { ok: false, error: e.message }
```

**Filtre clés inconnues :** `for (const key of Object.keys(patch) as SettingKey[]) { if (!(key in KINDS)) continue; … }`
Les clés absentes de `KINDS` sont ignorées sans erreur.
_Trace : `settings.handlers.ts:41-42`._

### `quit-app`

```
Canal    : IPC.quitApp = 'quit-app'  [ipc.ts:20]
Handler  : settings.handlers.ts:57-59
Payload  : aucun
Retour   : void
Logique  : sys.quit()  → Electron app.quit()
```

---

## Contrats IPC (3 canaux système)

Ces canaux sont enregistrés par `registerSystemHandlers` (`system.handlers.ts`) et sont partagés
avec d'autres modules (usage cross-module). Ils sont documentés ici car leurs handlers vivent
dans le même groupe de fichiers que `registerSettingsHandlers`.

| Canal | Payload | Retour | Garde | Trace |
|---|---|---|---|---|
| `copy` | `string` | `true` | aucune | `system.handlers.ts:12-14` |
| `open-external` | `string` (URL) | `void` | `/^https?:\/\//` — URL non-http ignorée silencieusement | `system.handlers.ts:16-18` |
| `hide-window` | — | `void` | aucune | `system.handlers.ts:19-21` |

---

## Résolution `resolveSetting` (`src/main/io/env.ts:32-42`)

```typescript
function resolveSetting(key, env, userConfig): { value, source }
  envVal = env[ENV_KEYS[key]]       // ENV_KEYS: { bbDir:'BREVES_BB_DIR', repoDir:'BREVES_REPO_DIR', claudeBin:'BREVES_CLAUDE_BIN' }
  if (envVal)  return { value: envVal, source: 'env' }
  fileVal = userConfig[key]
  if (fileVal) return { value: fileVal, source: 'file' }
  return { value: DEFAULTS[key], source: 'default' }
```

Variables d'environnement (`env.ts:26-29`) :
- `bbDir` → `BREVES_BB_DIR`
- `repoDir` → `BREVES_REPO_DIR`
- `claudeBin` → `BREVES_CLAUDE_BIN`

Défauts hardcodés (`env.ts:20-24`) :
- `bbDir` → `/Users/pleguern/Workspace/BoilingBrain`
- `repoDir` → `/Users/pleguern/Workspace/breves-ia`
- `claudeBin` → `/Users/pleguern/.local/bin/claude`

**GAP-01 :** ces défauts sont non portables (machine de l'auteur).

---

## `buildWikiMcp` (`src/main/io/env.ts:44-50`)

```typescript
function buildWikiMcp(env, bbDir): WikiMcp {
  return {
    type: 'stdio',
    command: env.BREVES_WIKI_PY   || '/Users/pleguern/.local/pipx/venvs/fastmcp/bin/python',
    args:   [env.BREVES_WIKI_SCRIPT || join(bbDir, 'scripts', 'mcp', 'mcp-wiki.py')],
  }
}
```

Chemins Python hardcodés surchargeable par `BREVES_WIKI_PY` et `BREVES_WIKI_SCRIPT`.
Appelé à chaque `applyConfig` (`engine.ts:62`) : tout save-settings reconstruit le MCP.

**GAP-01 :** chemin Python (`pipx/venvs/fastmcp`) non portable.

---

## `applyConfig` (`src/main/engine.ts:58-63`)

```typescript
function applyConfig(deps: EngineDeps, patch: UserConfig, env): void {
  if (patch.bbDir    != null) deps.bbDir    = patch.bbDir;
  if (patch.repoDir  != null) deps.repoDir  = patch.repoDir;
  if (patch.claudeBin != null) deps.claudeBin = patch.claudeBin;
  deps.wikiMcp = buildWikiMcp(env, deps.bbDir);
}
```

Mutation directe de l'objet `deps` (singleton, partagé entre tous les handlers).
Effet immédiat sur tous les modules aval (nouvelle-edition, historique, soul, agents, commandes).

---

## `pathValid` (`src/main/io/config.ts:34-45`)

```typescript
function pathValid(p, kind): boolean {
  if (!p) return false;
  try {
    const st = statSync(p);   // suit les symlinks (claudeBin peut être symlink)
    if (kind === 'directory') return st.isDirectory();
    if (!st.isFile()) return false;
    accessSync(p, constants.X_OK);
    return true;
  } catch { return false; }
}
```

Contrainte notable : `claudeBin` doit être un fichier **exécutable** (`X_OK`), pas seulement
existant. Les symlinks sont suivis (`statSync` vs `lstatSync`).

---

## `readUserConfig` / `writeUserConfig` (`src/main/io/config.ts:17-32`)

```typescript
// Lecture : filtre sur KEYS (['bbDir','repoDir','claudeBin']) — autres clés ignorées
function readUserConfig(userDataDir): UserConfig
  → JSON.parse(config.json) → filtre KEYS → UserConfig
  → catch → {}

// Écriture : mkdirSync récursif + writeFileSync JSON 2 espaces
function writeUserConfig(userDataDir, cfg): void
  → mkdirSync(dirname(p), { recursive: true })
  → writeFileSync(p, JSON.stringify(cfg, null, 2), 'utf8')
```

Stratégie merge dans `save-settings` : `{ ...readUserConfig(…), ...patch }` — les clés non
présentes dans `patch` sont conservées.

---

## `parseEnv` / `loadEnvFile` (`src/main/io/env.ts:60-95`)

```typescript
// Mini-parser .env (sans dépendance externe)
// Syntaxe : KEY=val | KEY="val" | KEY='val' | # commentaire | ligne vide
function parseEnv(text): Record<string, string>

// Charge le .env dans env SANS écraser les variables déjà définies
function loadEnvFile(path='.env', env=process.env): Record<string, string>
  → readFileSync → parseEnv → { if env[k]===undefined: env[k]=v }
  → fichier absent → no-op (catch → {})
```

Chargé au boot dans `main/index.ts` avant la construction des `deps`.

---

## Flux de données au boot (`src/main/index.ts`)

```
loadEnvFile('.env', process.env)         // injecte .env dans process.env
readUserConfig(userDataDir)              // lit config.json (ou {})
defaultDeps(process.env, userConfig)     // → loadEngineConfig → resolveSetting × 3 + buildWikiMcp
registerAllHandlers(ipc, deps, …)        // enregistre les 5 canaux settings (+ système)
createWindow()
```

---

## Contraintes et limites (constatées)

- **Defaults non portables (GAP-01) :** les trois chemins par défaut et le chemin Python MCP sont
  hardcodés sur la machine de l'auteur (`env.ts:20-24,47-48`). Acceptable pour app mono-poste,
  documenté comme gap.
- **Dépendance de données vers les modules aval (GAP-17) :** `applyConfig` est le seul mécanisme
  de mise à jour — toute incohérence entre `config.json` et les données réelles provoque des
  erreurs silencieuses dans les modules aval.
- **Settings.tsx non testé (GAP-16) :** la page React et le composant `PathField` n'ont pas de
  test unitaire direct. La logique métier est couverte via les tests handlers (`settings.handlers.test.mjs`).
- **Filtre `kind` permissif :** `validate-path` et `pick-path` reçoivent `payload: unknown` et
  opèrent un repli sur `'directory'` si `kind` est absent/invalide — pas de rejet explicite.
  _Trace : `settings.handlers.ts:33-34,37`._

---

## GAPS À REMONTER

| # | Observation |
|---|---|
| GAP-01 | Défauts hardcodés (`env.ts:20-24`) + chemins Python MCP (`env.ts:47-48`) non portables. |
| GAP-16 | `Settings.tsx` et `PathField.tsx` non testés directement (pages React hors couverture). |
| GAP-17 | Dépendance de données : pas de garde ni d'onboarding si les chemins sont invalides au 1er lancement. |
