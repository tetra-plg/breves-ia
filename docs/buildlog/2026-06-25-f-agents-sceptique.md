# F — Agents formalisés + passe sceptique (build log, Plan 1/2)

**Date** : 2026-06-25
**Spec** : `docs/superpowers/specs/2026-06-24-agents-config-design.md` (sous-système 1)
**Plan** : `docs/superpowers/plans/2026-06-24-agents-verify.md`
**Objectif** : transformer les enquêteurs en fichiers d'agent injectés programmatiquement dans le SDK, et ajouter une **passe sceptique** (réfutation adversariale) à `breves-verify`, réglable par mode (off/ciblé/toujours).
**Statut** : livré — **validé en RÉEL** : le sceptique a réfuté un superlatif et rétrogradé la fiabilité. Mergé sur `main`, poussé.

## Livré

| Livrable | Fichier | Notes |
| --- | --- | --- |
| **Parseur d'agent** | `lib/agent-file.mjs` | `parseAgent(raw)` (frontmatter + corps → `{name,description,tools,model,enabled,mode,systemPrompt}`) ; `toAgentDefinition` (→ forme SDK `{description,prompt,tools?,model?}`). Pur, testé. |
| **Fichiers d'agent** | `.claude/agents/enqueteur.md`, `.claude/agents/sceptique.md` | enquêteur (faits/date/source/clipping, web-only, « aucune invention ») ; sceptique (`breves_mode: ciblé`, « ton SEUL job est de RÉFUTER », sortie refute/raison/fiabilite_suggeree). |
| **Engine** | `hud/engine.mjs`, `lib/runner.mjs`, `lib/command-inputs.mjs` | `loadAgents(deps)` lit `.claude/agents/*.md` ; `runSkill`/`runRaw` acceptent `agents` → `options.agents` ; `dispatch` injecte les agents activés et, pour verify, passe le mode sceptique en `inputs.sceptique` ; `validateInputs` autorise `sceptique ∈ {off,ciblé,toujours}`. |
| **verify recâblé** | `.claude/commands/breves-verify.md` | dispatch `subagent_type: "enqueteur"` par sujet (le brief = prompt système de l'agent) ; passe sceptique selon le mode ; fusion (refute → rétrograde `fiabilite` + `alerte` + `corrections`). Contrat JSON inchangé. |

## Validation RÉELLE

- ✅ **Probe décisif** : l'auto-découverte `.claude/agents/` **ne charge pas** en SDK headless (le prompt système custom ne s'appliquait pas). Mais **`options.agents` programmatique fonctionne** : un Task vers l'agent custom applique bien son prompt système (token unique forcé renvoyé, `TASK_TOOL_UTILISÉ: true`). → on injecte programmatiquement, comme le MCP.
- ✅ **Smoke verify + sceptique ciblé** : `verify "GLM 5.2 … premier à dépasser GPT-5.5 sur le code"` → exit 0, JSON valide ; le **sceptique a réfuté le superlatif** → `fiabilite: partiel`, `alerte: corrigé` (« le superlatif n'est pas vérifié »), correction ajoutée. La vérification adversariale attrape l'exagération.
- Suite : **94/94** tests, pristine.

## Gotchas de la passe

1. **Auto-découverte `.claude/agents/` KO en headless** : le SDK ne charge pas les fichiers d'agent du projet en cwd. Solution : l'engine les lit et les injecte via `options.agents` (forme `AgentDefinition`). Même schéma que le MCP au Plan C.
2. **Probes d'agent confondus par l'auto-réponse** : demander « utilise tel agent et colle sa réponse » sur une tâche triviale → le main agent répond lui-même. Probe décisif = prompt système de l'agent qui force un **token unique imprévisible** + instruction « tu ne connais pas la réponse, tu DOIS dispatcher » + détection d'un `tool_use` Task dans le flux.
3. **Stubs de test sans `readdir`** : `dispatch` appelle désormais `loadAgents` (→ `deps.readdir`) ; les anciens stubs (Plan C) passaient sans, en s'appuyant sur le `catch` silencieux. Durci : `readdir: () => []` ajouté aux deps concernées.

## Décisions / restes

- **Pas de sentinelle `«BREVES»` pour la passe sceptique** (observabilité) — accepté, le verdict apparaît dans la fiabilité/alerte finale ; à enrichir plus tard si on veut l'afficher dans l'écran Checking.
- **`_brief-enqueteur.md`** devient redondant pour l'app (l'agent porte le prompt) ; le `/breves-ia` interactif (BoilingBrain) le garde. Nettoyage éventuel plus tard.
- **Plan 2 — vue config UI** : `serializeAgent` + `getAgents`/`saveAgent`, IPC, vue « Agents » (modèle/outils/prompt/activer-désactiver/mode). `parseAgent` y est réutilisé.
