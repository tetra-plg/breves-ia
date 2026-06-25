# G — Vue de configuration des agents (build log, Plan 2/2)

**Date** : 2026-06-25
**Spec** : `docs/superpowers/specs/2026-06-24-agents-config-design.md` (sous-système 2)
**Plan** : `docs/superpowers/plans/2026-06-25-agents-config-ui.md`
**Objectif** : configurer chaque sous-agent de vérification depuis l'app (modèle, outils, prompt système, activer/désactiver, et — pour le sceptique — le mode), en éditant les fichiers `.claude/agents/*.md`.
**Statut** : livré — la boucle UI → fichier d'agent → moteur est bouclée. Review finale (opus) : *Ready to merge*. Mergé sur `main`, poussé.

## Livré

| Livrable | Fichier | Notes |
| --- | --- | --- |
| **Sérialiseur** | `lib/agent-file.mjs` | `serializeAgent(a) -> string` : reconstruit le fichier d'agent (frontmatter + corps). Round-trip garanti avec `parseAgent`. `model`/`breves_mode` omis si vides. |
| **Engine** | `hud/engine.mjs` | `getAgents(deps)` (tous les agents parsés, triés par nom) ; `saveAgent(deps, name, edits)` (refuse name/prompt vide, merge `?? current` qui préserve les champs non édités, `serializeAgent`, écrit `<repoDir>/.claude/agents/<name>.md`, try/catch). |
| **IPC** | `hud/main.mjs`, `hud/preload.cjs` | `get-agents` / `save-agent` → `window.breves.getAgents()` / `saveAgent(name, edits)`. |
| **Vue Agents** | `hud/companion.html`, `hud/renderer.mjs` | bouton dashboard « Agents » ; section liste une carte par agent : modèle (select), mode sceptique (select, sceptique uniquement), outils (input virgules), prompt système (textarea), activé (checkbox), Enregistrer → toast. |
| **Navigation** | `lib/ui-state.mjs` | `goAgents → agents` ; `viewTitle('agents') = 'Agents'`. Testé. |

## Validation

- ✅ **`getAgents` sur les vrais fichiers** : retourne enquêteur (sonnet, WebSearch/WebFetch, 824 chars) et sceptique (sonnet, mode `ciblé`, 490 chars).
- ✅ **Round-trip** `parseAgent(serializeAgent(a))` testé ; `saveAgent` testé (merge + écriture ; refus du prompt vide sans écrire).
- ✅ **Boucle bouclée** : `off|ciblé|toujours` identique partout — dropdown UI → `serializeAgent` (`breves_mode`) → `parseAgent` → `dispatch` (`inputs.sceptique`) → `breves-verify`. Le mode réglé dans l'UI est lu par le moteur (Plan 1).
- Suite : **99/99** tests, pristine. Plan 1 (verify/archive) non modifié.

## Décisions / restes

- **`escapeHtml` (lib/ui-format.mjs) n'échappe pas les guillemets** : le seul `value="..."` concerné est le champ outils ; risque nul en pratique (vocabulaire d'outils contrôlé par l'utilisateur, app locale mono-utilisateur). Si on durcit un jour, ajouter `"`/`'` à `escapeHtml` couvre tous les `value="..."` d'un coup.
- **Variable `path` dans `saveAgent`** : cosmétique, aucune collision (l'import est `{ join }`). Pourrait être renommée `filePath`.
- Fonctionnalité complète des deux sous-systèmes de la spec agents (Plan 1 = moteur + sceptique ; Plan 2 = config UI).
