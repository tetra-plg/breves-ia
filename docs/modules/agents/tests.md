> Module : agents · reverse (constat) · cartographié à `4ce7095`

# tests — module agents

> Rédigé en mode QA Module, reverse. Chaque assertion est tracée. Le code fait foi.
> Réfère la stratégie globale : `docs/project/tests.md`. Seuls les tests existants sont listés.
> Les lacunes sont signalées en GAPS.

---

## Stratégie de couverture (rappel socle)

La suite de tests est en **Vitest** (`vitest.config.mjs`, env Node), fichiers `.test.mjs`.
Pas de seuil de couverture configuré, pas de CI cloud (hook pre-commit uniquement).
Les tests de **composants React** (renderer) ne sont pas couverts systématiquement (GAP-16).

Pour le module **agents**, les tests se répartissent en :

1. **Tests domain purs** (`tests/domain/agents-file.test.mjs`) — round-trips de sérialisation.
2. **Tests engine** (`tests/main/engine.test.mjs`) — guards et logique de merge.
3. **Tests handler** (`tests/main/readonly.handlers.test.mjs`) — câblage IPC.
4. **Aucun test renderer** — `Agents.tsx` et `AgentCard.tsx` non testés (GAP-16).

---

## TC-D01 — `parseAgent` : frontmatter complet + corps

**Fichier :** `tests/domain/agents-file.test.mjs:8-16`
**Fixture :** `tests/fixtures/agent.sample.md`

```
name: enqueteur
description: Vérifie un sujet IA pour une brève.
tools: WebSearch, WebFetch
model: sonnet
breves_enabled: true
---
Tu es un enquêteur. Vérifie les faits…
```

**Assertions vérifiées :**
- `a.name === 'enqueteur'`
- `a.description === 'Vérifie un sujet IA pour une brève.'`
- `a.tools deepEqual ['WebSearch', 'WebFetch']`
- `a.model === 'sonnet'`
- `a.enabled === true`
- `a.systemPrompt` commence par `'Tu es un enquêteur.'`

---

## TC-D02 — `parseAgent` : `breves_mode` + `enabled=false`

**Fichier :** `tests/domain/agents-file.test.mjs:17-21`

Entrée : frontmatter avec `breves_enabled: false` et `breves_mode: toujours`.

**Assertions vérifiées :**
- `a.enabled === false`
- `a.mode === 'toujours'`

---

## TC-D03 — `parseAgent` : champs absents → valeurs par défaut

**Fichier :** `tests/domain/agents-file.test.mjs:22-28`

Entrée : frontmatter minimal (`name: x` seulement), corps `'prompt'`.

**Assertions vérifiées :**
- `a.tools deepEqual []`
- `a.model === ''`
- `a.enabled === true`  (défaut)
- `a.systemPrompt === 'prompt'`

---

## TC-D04 — `toAgentDefinition` : forme SDK (model présent / absent)

**Fichier :** `tests/domain/agents-file.test.mjs:29-33`

**Assertions vérifiées :**
- Avec `model: 'sonnet'` → `def.model === 'sonnet'`
- Avec `model: ''` → `def.model` absent (undefined)
- `def.tools` toujours présent (même `[]`)
- `def.prompt === systemPrompt`, `def.description === description`

---

## TC-D05 — Round-trip `serializeAgent → parseAgent`

**Fichier :** `tests/domain/agents-file.test.mjs:35-38`

Entrée : objet `Agent` complet (sceptique avec tous les champs).

**Assertion :** `parseAgent(serializeAgent(a)) deepEqual a`

---

## TC-D06 — `serializeAgent` : modèle inherit (vide) et mode vide omis

**Fichier :** `tests/domain/agents-file.test.mjs:40-48`

Entrée : `model: ''`, `mode: ''`, `enabled: false`.

**Assertions vérifiées :**
- Pas de ligne `model:` dans le texte sérialisé
- Pas de ligne `breves_mode:` dans le texte sérialisé
- Ligne `breves_enabled: false` présente
- Round-trip : `model === ''`, `enabled === false`, `tools deepEqual []`

---

## TC-E01 — `loadAgents` : agents activés → defs, désactivés → byName seulement

**Fichier :** `tests/main/engine.test.mjs:118-127`

Stub `deps` avec deux agents : `enqueteur` (enabled) et `sceptique` (`breves_enabled: false`).

**Assertions vérifiées :**
- `defs.enqueteur` = `{ description, prompt, tools, model }` (forme SDK)
- `defs.sceptique === undefined`  (désactivé → non injecté)
- `byName.sceptique.mode === 'ciblé'`  (toujours dans byName)

---

## TC-E02 — `getAgents` : liste triée par nom

**Fichier :** `tests/main/engine.test.mjs:128-135`

Stub avec `sceptique.md` et `enqueteur.md` (ordre inverse).

**Assertion :** `list.map(a => a.name)` = `['enqueteur', 'sceptique']` (tri alphabétique).

---

## TC-E03 — `saveAgent` : merge et écriture correcte

**Fichier :** `tests/main/engine.test.mjs:136-149`

Entrée : agent existant `sceptique` (model sonnet, enabled true, mode ciblé).
Edits : `{ model:'haiku', tools:['WebSearch','WebFetch'], systemPrompt:'nouveau prompt', enabled:false, mode:'toujours' }`.

**Assertions vérifiées :**
- `r.ok === true`
- Chemin écrit : `.../repo/.claude/agents/sceptique.md`
- Texte contient `model: haiku`
- Texte contient `breves_enabled: false`
- Texte contient `breves_mode: toujours`
- Texte contient `tools: WebSearch, WebFetch`
- Texte contient `nouveau prompt`
- Texte contient `description: Réfute.`  (champ non édité, préservé du fichier existant)

---

## TC-E04 — `saveAgent` : prompt vide refusé (pas d'écriture)

**Fichier :** `tests/main/engine.test.mjs:150-155`

Edits : `{ systemPrompt: '   ' }`.

**Assertions vérifiées :**
- `r.ok === false`
- `writeFile` jamais appelé (`called === false`)

---

## TC-E05 — `saveAgent` : nom traversant refusé (anti path-traversal)

**Fichier :** `tests/main/engine.test.mjs:270-276`

Test sur un répertoire réel (`mkdtemp`). Cible : `'../evil'` (fichier `.claude/evil.md` pré-créé).

**Assertions vérifiées :**
- `saveAgent(deps, '../evil', { systemPrompt:'pwn', … }).ok === false`
- `writes === []` (aucune écriture)

---

## TC-H01 — Handlers IPC : câblage `get-agents` / `save-agent`

**Fichier :** `tests/main/readonly.handlers.test.mjs:33-42`

Stub `deps` avec un agent `sceptique`.

**Assertions vérifiées :**
- `ipc.h['get-agents'](e)` → `list[0].name === 'sceptique'`
- `ipc.h['save-agent'](e, { name:'sceptique', edits:{ systemPrompt:'nouveau' } })` → `r.ok === true`

---

## Couverture — tableau de synthèse

| Couche | Comportements couverts | Lacunes |
|---|---|---|
| `domain/agents.ts` — `parseAgent` | TC-D01, TC-D02, TC-D03 | — |
| `domain/agents.ts` — `toAgentDefinition` | TC-D04 | — |
| `domain/agents.ts` — `serializeAgent` | TC-D05, TC-D06 | — |
| `domain/agents.ts` — `labelForTool`, `activityFromMessage` | Couverts dans `tests/domain/activity.test.mjs` | — |
| `engine.ts` — `loadAgents` | TC-E01 | — |
| `engine.ts` — `getAgents` | TC-E02 | — |
| `engine.ts` — `saveAgent` (merge) | TC-E03 | — |
| `engine.ts` — `saveAgent` (prompt vide) | TC-E04 | — |
| `engine.ts` — `saveAgent` (traversal) | TC-E05 | — |
| `ipc/agents.handlers.ts` | TC-H01 | — |
| `renderer/pages/Agents.tsx` | — | **NON TESTÉ** (GAP-16) |
| `renderer/components/AgentCard.tsx` | — | **NON TESTÉ** (GAP-16) |

---

## Fixture de référence

**`tests/fixtures/agent.sample.md`** — utilisé par TC-D01.

```
---
name: enqueteur
description: Vérifie un sujet IA pour une brève.
tools: WebSearch, WebFetch
model: sonnet
breves_enabled: true
---
Tu es un enquêteur. Vérifie les faits, la date, la source, récupère le clipping.
```

---

## GAPS À REMONTER

| # | Observation |
|---|---|
| GAP-16 | **`Agents.tsx` et `AgentCard.tsx` non testés.** Comportements non couverts : chargement initial (effet `useEffect`), détection `isScept` (`!!agent.mode \|\| agent.name === 'sceptique'`), split outils à la virgule côté UI, affichage toast succès/erreur, état vide « Aucun agent… », état chargement `null`. Il faudrait des tests de composant (ex. Vitest + Testing Library) ou des tests E2E (Playwright). |
| (implicite) | Pas de test couvrant le cas où `getAgents` rejette (erreur IPC) — le renderer n'a pas de gestion d'erreur explicite sur `getAgents` (`Agents.tsx:14-16` ne catch pas le rejet). |
