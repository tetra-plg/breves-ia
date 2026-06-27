> Module : agents · reverse (constat) · cartographié à `4ce7095`

# implementation — module agents

> Rédigé en mode Lead Dev Module, reverse. Chaque assertion est tracée. Le code fait foi.
> Réfère le socle : `docs/project/implementation.md` pour les patterns d'injection de dépendances
> (`EngineDeps`), la convention de tests `.test.mjs`, et les alias TypeScript.

---

## 1. Fichiers du module

| Fichier | Rôle | Lignes clés |
|---|---|---|
| `src/renderer/pages/Agents.tsx` | Page React — charge la liste, orchestres les sauvegardes, affiche les toasts | `:1-42` |
| `src/renderer/components/AgentCard.tsx` | Carte éditable par agent — state local, submit | `:1-85` |
| `src/main/ipc/agents.handlers.ts` | Enregistre les 2 canaux IPC | `:1-10` |
| `src/main/engine.ts` | `loadAgents`, `getAgents`, `saveAgent`, `isSafeName` | `:65-219` |
| `src/domain/agents.ts` | `parseAgent`, `serializeAgent`, `toAgentDefinition`, `labelForTool`, `activityFromMessage` | `:1-120` |
| `src/domain/frontmatter.ts` | `splitFrontmatter` (partagé avec commands) | `:1-11` |
| `.claude/agents/enqueteur.md` | Fichier de données — agent enquêteur | — |
| `.claude/agents/redacteur.md` | Fichier de données — agent rédacteur | — |
| `.claude/agents/sceptique.md` | Fichier de données — agent sceptique | — |

---

## 2. Contrats IPC

### Canal `get-agents`

- **IPC key :** `IPC.getAgents = 'get-agents'` (`shared/types/ipc.ts:10`)
- **Entrée :** aucune (invocation sans argument)
- **Sortie :** `Agent[]` (triés alphabétiquement par `name`)
- **Handler :** `agents.handlers.ts:5` → `engine.getAgents(deps)`
- **Preload :** `window.api.getAgents = () => ipcRenderer.invoke('get-agents')` (`preload/index.ts:20`)

### Canal `save-agent`

- **IPC key :** `IPC.saveAgent = 'save-agent'` (`shared/types/ipc.ts:11`)
- **Entrée :** `{ name: string, edits: AgentEdits }` (sérialisé par `ipcRenderer.invoke`)
- **Sortie :** `SaveResult = { ok: boolean; error?: string }`
- **Handler :** `agents.handlers.ts:6-9`

```typescript
// src/main/ipc/agents.handlers.ts:6-9
ipc.handle(IPC.saveAgent, (_e, payload: unknown) => {
  const { name, edits } = (payload ?? {}) as { name: string; edits: AgentEdits };
  return saveAgent(deps, name, edits);
});
```

- **Preload :** `window.api.saveAgent = (name, edits) => ipcRenderer.invoke('save-agent', { name, edits })` (`preload/index.ts:21`)

> Note : le payload est casté sans validation Zod. `edits` provient du renderer de confiance
> (contextBridge). Voir GAPS.

---

## 3. Fonctions domain (`src/domain/agents.ts`)

### `parseAgent(raw: string): Agent`  — `:23-35`

1. `splitFrontmatter(raw)` → `{ fm, body }`
2. `fm.tools` → split CSV par `,`, trim, filter → `tools: string[]`
3. `fm.model !== 'inherit'` et non vide → `model`, sinon `''`
4. `fm.breves_enabled !== 'false'` → `enabled: boolean` (défaut `true`)
5. `fm.breves_mode || ''` → `mode`
6. `body` → `systemPrompt`

### `serializeAgent(a: Agent): string`  — `:43-52`

Reconstruit le bloc frontmatter ligne par ligne :

```
---
name: <a.name>
description: <a.description>   ← omis si vide
tools: <a.tools.join(', ')>
model: <a.model>               ← omis si ''
breves_enabled: <true|false>
breves_mode: <a.mode>          ← omis si ''
---
<a.systemPrompt.trim()>
```

Retourne `${fm.join('\n')}\n${body.trim()}\n`.

**Invariant round-trip :** `parseAgent(serializeAgent(a)) deepEqual a`
Vu `tests/domain/agents-file.test.mjs:35-38`.

### `toAgentDefinition(a: Agent): AgentDefinition`  — `:37-41`

Projection pour le SDK Claude :

```typescript
const def: AgentDefinition = { description: a.description, prompt: a.systemPrompt, tools: a.tools || [] };
if (a.model) def.model = a.model;
return def;
```

- `tools` est **toujours présent** (`[]` si aucun outil).
- `model` est **omis** si `''` (inherit).

### `labelForTool(name, input): string | null`  — `:71-96`

Produit un libellé FR pour l'activité live. Mapping constaté :

| `name` | Libellé |
|---|---|
| `Task` / `Agent` | `Enquêteur :`, `Rédacteur :`, `Sceptique :` (selon `input.subagent_type`) |
| `WebSearch` | `Recherche web : <query>` |
| `WebFetch` | `Lecture : <host>` |
| `Read` | `Lecture : <basename>` |
| `Edit` / `MultiEdit` | `Édition : <basename>` |
| `Write` | `Écriture : <basename>` |
| `Bash` | `Shell : <description>` |
| `TodoWrite` | `null` (filtré) |
| `mcp__*drop_to_raw*` | `Dépôt wiki : <filename>` |
| `mcp__*` | `Wiki : <dernière partie>` |
| autres | `<name>…` |

### `activityFromMessage(m: unknown): ActivityEvent[]`  — `:108-120`

Extrait les blocs `tool_use` d'un message assistant et produit des `ActivityEvent` (libellés FR).
Utilisé par `hooks/useCommandStream.ts` pour le suivi live du pipeline.

---

## 4. Fonctions engine (`src/main/engine.ts`)

### `loadAgents(deps): { defs, byName }`  — `:65-82`

```
dir = join(deps.repoDir, '.claude', 'agents')
files = deps.readdir(dir)   // catch → { defs:{}, byName:{} }
pour chaque .md :
  a = parseAgent(deps.readFile(join(dir, f)))
  si !a.name → skip
  byName[a.name] = a
  si a.enabled → defs[a.name] = toAgentDefinition(a)
retour { defs, byName }
```

`deps.readdir` et `deps.readFile` sont des injections (testabilité sans FS réel).

### `getAgents(deps): Agent[]`  — `:179-182`

```typescript
const { byName } = loadAgents(deps);
return Object.values(byName).sort((a, b) => a.name.localeCompare(b.name));
```

Retourne **tous** les agents (activés ou non), triés par nom.

### `isSafeName(name: string): boolean`  — `:194-196`

```typescript
return !!name && !/[\\/]/.test(name) && !name.includes('..');
```

Rejet : vide, contient `/`, `\`, ou `..`. Anti path-traversal.
Commit qui introduit la guard : `4ce7095` (« rejette les noms traversants dans saveAgent/saveCommand »).

### `saveAgent(deps, name, edits): SaveResult`  — `:198-219`

```
1. isSafeName(name) → { ok:false, error:'nom invalide' }
2. !edits?.systemPrompt?.trim() → { ok:false, error:'prompt vide' }
3. path = join(repoDir, '.claude', 'agents', name + '.md')
4. current = parseAgent(deps.readFile(path))
5. merged = { ...current, model: edits.model ?? current.model,
               tools: edits.tools ?? current.tools,
               systemPrompt: edits.systemPrompt,
               enabled: edits.enabled ?? current.enabled,
               mode: edits.mode ?? current.mode,
               description: edits.description ?? current.description }
6. deps.writeFile(path, serializeAgent(merged))
7. { ok: true }
catch(e) → { ok: false, error: e.message }
```

---

## 5. Format sérialisé des trois agents de production

### `.claude/agents/enqueteur.md`

```
---
name: enqueteur
description: Vérifie un sujet d'actualité IA pour une brève (faits, date, source, clipping).
tools: WebSearch, WebFetch
model: opus
breves_enabled: true
---
<systemPrompt>
```

- Modèle : **opus**
- Outils : WebSearch, WebFetch
- Mode : (pas de `breves_mode` → `mode = ''`)

### `.claude/agents/redacteur.md`

```
---
name: redacteur
description: Rédige les brèves dans la plume de la SOUL (Phase 2).
tools:
model: opus
breves_enabled: true
---
<systemPrompt>
```

- Modèle : **opus**
- Outils : *aucun* (`tools:` présent mais vide → `tools = []`)
- Mode : (pas de `breves_mode`)

### `.claude/agents/sceptique.md`

```
---
name: sceptique
description: Tente de réfuter l'affirmation centrale d'une brève (vérification adversariale).
tools: WebSearch, WebFetch
model: sonnet
breves_enabled: true
breves_mode: ciblé
---
<systemPrompt>
```

- Modèle : **sonnet**
- Outils : WebSearch, WebFetch
- Mode : **ciblé** (seul agent avec `breves_mode` non vide)

---

## 6. Mapping outils → libellés FR (UX suivi live)

| Outil Claude | Libellé affiché dans l'UI | Trace |
|---|---|---|
| `Task` / `Agent` (enqueteur) | `Enquêteur : <description>` | `agents.ts:73,75` |
| `Task` / `Agent` (redacteur) | `Rédacteur : <description>` | `agents.ts:77` |
| `Task` / `Agent` (sceptique) | `Sceptique : <description>` | `agents.ts:75` |
| `WebSearch` | `Recherche web : <query>` | `agents.ts:82` |
| `WebFetch` | `Lecture : <host>` | `agents.ts:83` |
| `Read` | `Lecture : <basename>` | `agents.ts:84` |
| `Edit` / `MultiEdit` | `Édition : <basename>` | `agents.ts:85` |
| `Write` | `Écriture : <basename>` | `agents.ts:86` |
| `Bash` | `Shell : <description>` | `agents.ts:87` |
| `TodoWrite` | `null` (non affiché) | `agents.ts:88` |

---

## 7. Contraintes et guards

| Guard | Localisation | Comportement |
|---|---|---|
| Nom vide | `engine.ts:195` (`!!name`) | `{ ok:false, error:'nom invalide' }` |
| Nom traversant (`/`, `\`, `..`) | `engine.ts:195-196` | `{ ok:false, error:'nom invalide' }` |
| `systemPrompt` vide/espaces | `engine.ts:199-201` | `{ ok:false, error:'prompt vide' }`, pas d'écriture |
| Fichier `.md` illisible | `engine.ts:216` (catch) | `{ ok:false, error:e.message }` |
| Dossier `agents/` absent | `engine.ts:68-71` (catch) | `{ defs:{}, byName:{} }` → `getAgents` retourne `[]` |

---

## 8. Injection de dépendances (`EngineDeps`)

Les fonctions du moteur reçoivent `deps: EngineDeps` (vu `src/main/engine.ts:1` et les tests) :

```typescript
interface EngineDeps {
  repoDir: string;
  readdir: (path: string) => string[];
  readFile: (path: string) => string;
  writeFile: (path: string, content: string) => void;
  // ... autres dépendances (SDK, bbDir, etc.)
}
```

Pour le module agents, seuls `repoDir`, `readdir`, `readFile` et `writeFile` sont consommés.

---

## GAPS À REMONTER

| # | Observation |
|---|---|
| GAP-16 | `AgentCard.tsx` et `Agents.tsx` n'ont aucun test de composant. Le comportement UI (sélecteur modèle, toggle sceptique `isScept`, split outils à la virgule) n'est pas couvert par des tests automatisés. |
| (implicite) | `agents.handlers.ts:7` : le cast `as { name, edits }` sans validation Zod signifie qu'un `edits` mal typé passera les guards (ex. `systemPrompt: undefined` → `typeof edits?.systemPrompt !== 'string'` → `ok:false, error:'prompt vide'` — safe en pratique, mais non garanti par le typage runtime). |
