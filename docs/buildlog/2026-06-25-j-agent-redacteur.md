# J — Agent rédacteur configurable (build log)

**Date** : 2026-06-25
**Spec** : `docs/superpowers/specs/2026-06-25-agent-redacteur-design.md`
**Plan** : `docs/superpowers/plans/2026-06-25-agent-redacteur.md`
**Objectif** : promouvoir la rédaction (Phase 2) en sous-agent `redacteur` configurable dans la vue Agents, avec repli sur la rédaction directe quand il est désactivé.
**Statut** : livré, smoke réel OK, 120/120 tests. Mergé sur `main`.

## Livré

| Livrable | Fichier | Notes |
| --- | --- | --- |
| **Inputs** | `lib/command-inputs.mjs` (+ test) | `breves-draft` accepte `redacteur ∈ {on, off}` (optionnel). |
| **Engine** | `hud/engine.mjs` (+ tests) | `dispatch` dérive `inputs.redacteur = 'on'` si l'agent `redacteur` est activé, `'off'` sinon (miroir du `sceptique`) ; n'écrase pas une valeur explicite. |
| **Fichier d'agent** | `.claude/agents/redacteur.md` | `model: opus`, `tools:` vide (rédaction pure), prompt générique (la voix SOUL arrive à l'exécution). Apparaît automatiquement dans la vue Agents. |
| **Commande** | `.claude/commands/breves-draft.md` | Aiguillage : `on` → `Task subagent_type: redacteur` (voix §3-4 + échantillons §5 + topics + feedback) ; `off` → rédaction inline (inchangée). L'agent principal assemble `corrections`/`sources`. Contrat `validateDraftOutput` inchangé. |
| **Fix suivi live** | `lib/activity.mjs` (+ test) | L'outil de dispatch de sous-agent du SDK s'appelle **`Agent`** (pas `Task`) : `labelForTool` le gère désormais → « Rédacteur / Enquêteur / Sceptique : … » au lieu de « Agent… ». |

## Validation RÉELLE

- ✅ **Smoke draft mode `on`** (CLI, topic GLM réel, lecture de la vraie SOUL) : exit 0, JSON valide, `teamsText` dans la plume (« — Treize juin deux mille vingt-six — » + accroche en gras), `sources: 1`.
- ✅ **Sous-agent réellement dispatché** : l'activité **« Rédacteur : Rédige brève GLM 5.2 »** apparaît dans le flux d'events → c'est bien le rédacteur (opus) qui rédige, pas l'agent principal. (Avant le fix `Agent`, ce dispatch s'affichait « Agent… ».)
- ✅ **Vue Agents** : `getAgents` liste `enqueteur, redacteur, sceptique` → le rédacteur est configurable (modèle/prompt/activation) sans code UI.
- Suite : **120/120** tests.

## Gotchas de la passe

1. **CLI lit le draft sur stdin** : `breves-cli draft` attend le JSON sur stdin (pas en argument) — le premier smoke a échoué (JSON vide) avant d'être pipé.
2. **Outil de dispatch SDK = `Agent`, pas `Task`** : découvert via le smoke (activité « Agent… »). Tous les sous-agents (enquêteur/sceptique/rédacteur) étaient donc mal étiquetés dans le suivi live. Corrigé dans `labelForTool`.
3. **Repli `off` par défaut** : agent absent ou désactivé → `inputs.redacteur = 'off'` → l'app reste toujours fonctionnelle (jamais d'échec dû à l'agent).

## Décisions / restes

- Le rédacteur **sans outils** : ne peut rien inventer (pas de web), garde-fou central renforcé. La voix lui est passée par l'agent principal (pas d'outil `Read`).
- Comme pour les autres sous-agents, la délégation reste au bon vouloir du modèle principal ; en pratique le smoke montre qu'il délègue. Si besoin un jour, renforcer la consigne de dispatch.
- Pipeline complet : vue Agents (config rédacteur) → `dispatch` (on/off) → `breves-draft` (délègue ou rédige) → `teamsText`.
