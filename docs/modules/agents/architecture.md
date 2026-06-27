> Module : agents · reverse (constat) · cartographié à `4ce7095`

# architecture — module agents

> Rédigé en mode Architecte Module, reverse. Chaque assertion est tracée. Le code fait foi.
> Réfère le socle : `docs/project/architecture.md` pour l'architecture en couches globale,
> le contrat IPC (20 canaux), le pont SDK (`llm.service.ts`), et la définition de `EngineDeps`.

---

## 1. Périmètre du module dans l'architecture globale

Le module **agents** couvre la tranche verticale suivante (vu `_REVERSE_MODULE_MAP.md:89`) :

```
Renderer  →  pages/Agents.tsx + components/AgentCard.tsx
IPC       →  'get-agents' / 'save-agent'
Main      →  ipc/agents.handlers.ts + engine.{loadAgents,getAgents,saveAgent,isSafeName}
Domain    →  domain/agents.ts (parseAgent, serializeAgent, toAgentDefinition, labelForTool, activityFromMessage)
             domain/frontmatter.ts (splitFrontmatter)
Données   →  .claude/agents/{enqueteur,redacteur,sceptique}.md
```

Ce module **ne touche pas** à `llm.service.ts` (pas d'invocation SDK) ni aux schemas Zod (`shared/schemas/`).
Les agents parsés par `toAgentDefinition` sont injectés dans `dispatch` (`engine.ts:137`) lors de
l'exécution du pipeline — le pipeline est du ressort du module `nouvelle-edition`, pas de `agents`.

---

## 2. Types de données

### 2.1 `Agent` — vue UI (renderer + main)

```typescript
// src/domain/agents.ts:6-14
export interface Agent {
  name: string;          // clé, = nom du fichier sans .md
  description: string;   // frontmatter description:
  tools: string[];       // frontmatter tools: (liste CSV → array)
  model: string;         // frontmatter model: ('' si absent ou 'inherit')
  enabled: boolean;      // frontmatter breves_enabled: (défaut true)
  mode: string;          // frontmatter breves_mode: ('' si absent)
  systemPrompt: string;  // corps du fichier (hors frontmatter)
}
```

### 2.2 `AgentDefinition` — vue SDK (injectée dans `dispatch`)

```typescript
// src/domain/agents.ts:16-21
export interface AgentDefinition {
  description: string;
  prompt: string;
  tools: string[];
  model?: string;   // omis si '' (mode inherit)
}
```

`toAgentDefinition(Agent) → AgentDefinition` : projection minimale pour le SDK.
Vu `agents.ts:37-41`. `model` est omis si vide. `tools` est toujours présent (même `[]`).

### 2.3 `AgentEdits` — payload de modification

```typescript
// src/main/engine.ts:184-191
export interface AgentEdits {
  systemPrompt: string;
  model?: string;
  tools?: string[];
  enabled?: boolean;
  mode?: string;
  description?: string;
}
```

Tous les champs sauf `systemPrompt` sont optionnels : la sauvegarde est un **merge** avec les
valeurs du fichier existant. Vu `engine.ts:206-215`.

### 2.4 `SaveResult` — réponse de sauvegarde

```typescript
// src/shared/types/api.ts:8
export type SaveResult = { ok: boolean; error?: string };
```

---

## 3. Modèle de données : le fichier `.md` (frontmatter + corps)

Les agents sont stockés en fichiers Markdown à frontmatter YAML minimaliste.
Format constaté sur les trois fichiers de production :

```
---
name: <nom>
description: <description>
tools: <tool1>, <tool2>     ← CSV, peut être vide (redacteur)
model: <opus|sonnet|haiku>  ← omis si mode inherit
breves_enabled: <true|false>
breves_mode: <off|ciblé|toujours>  ← omis si non sceptique
---
<corps = systemPrompt>
```

Parsing : `splitFrontmatter` (`domain/frontmatter.ts:1-11`) découpe `---\n…\n---\n` en `{fm, body}`.
Chaque clé frontmatter est lue en chaîne brute ; `parseAgent` (`agents.ts:23-35`) applique les
conversions (CSV→array, bool, défauts).

Sérialisation : `serializeAgent` (`agents.ts:43-52`) reconstruit le bloc `---…---\n<body>\n`.
Invariant : un `parseAgent(serializeAgent(a))` retourne `a` à l'identique (round-trip vérifié,
vu `tests/domain/agents-file.test.mjs:35-38`).

---

## 4. Structure des composants renderer

```
pages/Agents.tsx
  ├─ state: Agent[] | null  (null = chargement en cours)
  ├─ useEffect → window.api.getAgents() → setAgents
  ├─ save(name, edits) → window.api.saveAgent → showToast
  └─ AgentCard × N  (une carte par agent)
       ├─ state local: model, mode, tools, systemPrompt, enabled
       ├─ isScept = !!agent.mode || agent.name === 'sceptique'
       └─ save() → construit AgentEdits → onSave(edits)
```

**Gestion d'état :** l'état local de chaque `AgentCard` est initialisé depuis `agent` (prop) à
la création. Les modifications restent locales jusqu'au clic « Enregistrer ». Il n'y a pas de
re-chargement automatique post-sauvegarde : la liste n'est rechargée qu'au montage de `Agents`.
Vu `Agents.tsx:12-20`.

---

## 5. Flux de données (lecture → édition → écriture)

```
① Montage de Agents.tsx
   → window.api.getAgents()          [preload/index.ts:20]
   → IPC 'get-agents'
   → agents.handlers.ts:5  →  engine.getAgents(deps)
   → engine.loadAgents(deps)
     → deps.readdir('.claude/agents')
     → Pour chaque .md : parseAgent(readFile(…)) → byName
   → Object.values(byName).sort()    [engine.ts:182]
   → retour Agent[]
   → setAgents(a)

② Édition locale (AgentCard)
   → setState(model/mode/tools/systemPrompt/enabled)
   → (pas d'IPC, local uniquement)

③ Clic « Enregistrer »
   → AgentCard.save()  →  onSave(edits: AgentEdits)
   → Agents.tsx.save(name, edits)
   → window.api.saveAgent(name, edits)  [preload/index.ts:21 : ipcRenderer.invoke('save-agent', { name, edits })]
   → IPC 'save-agent'
   → agents.handlers.ts:6-9
     → isSafeName(name)  →  ok:false si invalide
     → engine.saveAgent(deps, name, edits)
       → isSafeName(name) [guard]
       → edits.systemPrompt.trim() [guard]
       → parseAgent(readFile('.claude/agents/<name>.md'))  [lecture courante]
       → merge(current, edits) → merged: Agent
       → serializeAgent(merged) → texte .md
       → writeFile('.claude/agents/<name>.md', texte)
       → { ok: true }
   → retour SaveResult
   → showToast(…)
```

---

## 6. Injection dans le pipeline (lien avec nouvelle-edition)

Lors de l'appel `dispatch` (module nouvelle-edition), `loadAgents` est rappelé pour construire
`defs: Record<string, AgentDefinition>` (seuls les agents `enabled`).
Vu `engine.ts:137-140` :

```typescript
const { defs, byName } = loadAgents(deps);
// defs injecté dans runSkill → Claude SDK agents
```

Le champ `byName.sceptique.mode` est également lu pour passer `sceptique` (mode) dans les inputs
du skill `breves-verify`. Vu `engine.ts:142-145`.

**Point d'extension :** modifier un agent dans la vue Agents (et sauvegarder) est immédiatement
pris en compte lors du prochain `dispatch` sans redémarrer l'app (les fichiers sont relus à chaque
`dispatch`).

---

## 7. Contrats IPC du module

| Canal | Direction | Entrée | Sortie | Handler |
|---|---|---|---|---|
| `get-agents` | renderer → main | `{}` | `Agent[]` | `agents.handlers.ts:5` |
| `save-agent` | renderer → main | `{ name: string, edits: AgentEdits }` | `SaveResult` | `agents.handlers.ts:6-9` |

Preload : `window.api.getAgents()` et `window.api.saveAgent(name, edits)`.
Vu `src/preload/index.ts:20-21`, `src/shared/types/api.ts:26-27`.

Le payload `save-agent` est désérialisé avec un cast non validé côté handler :
`(payload ?? {}) as { name: string; edits: AgentEdits }`. Il n'y a pas de validation Zod sur
ce canal. Vu `agents.handlers.ts:7`.

---

## 8. Sécurité : anti-traversal

`isSafeName(name: string): boolean` (`engine.ts:194-196`) :

```typescript
return !!name && !/[\\/]/.test(name) && !name.includes('..');
```

Rejette : chaîne vide, tout `name` contenant `/`, `\` ou `..`.
Le chemin final `join(repoDir, '.claude', 'agents', name + '.md')` est donc cantonné au dossier
`agents/` du dépôt. Vu également `engine.ts:243` (même garde réutilisée pour `saveCommand`).

---

## GAPS À REMONTER

| # | Observation |
|---|---|
| GAP-16 | Aucun test de composant pour `Agents.tsx` ni `AgentCard.tsx`. L'IPC côté handler est testé dans `readonly.handlers.test.mjs` et `engine.test.mjs`, mais le renderer est sans filet. |
| (implicite) | Le payload `save-agent` n'est pas validé par un schema Zod côté handler (`agents.handlers.ts:7` = cast `as`). Un `edits` malformé passerait les guards du moteur mais pourrait produire un comportement inattendu si `systemPrompt` est `undefined` (coert en chaîne). |
