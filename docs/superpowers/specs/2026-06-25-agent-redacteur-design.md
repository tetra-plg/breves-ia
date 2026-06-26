# Agent rédacteur configurable — Design

**Date** : 2026-06-25
**Statut** : design validé, en attente du plan.

## Objectif

Promouvoir la rédaction (Phase 2, `/breves-draft`) en **sous-agent `redacteur`** dédié, configurable dans la vue Agents au même titre qu'`enqueteur` et `sceptique` (modèle, outils, prompt système, activation). Désactivé, on retombe sur la rédaction directe actuelle.

## Décisions (issues du brainstorm)

- **Sous-agent dédié** : `breves-draft` dispatche un `Task subagent_type: redacteur` (fichier `.claude/agents/redacteur.md`). Apparaît automatiquement dans la vue Agents (aucun code UI).
- **Désactivé → repli en rédaction directe** : l'agent principal de `breves-draft` rédige lui-même (comportement actuel). Symétrique du `sceptique` : l'engine passe l'état à la commande via `inputs.redacteur`.
- **Modèle par défaut : `opus`** (étape la plus créative). Réglable ensuite dans la vue Agents.
- **Rédacteur sans outils** (`tools:` vide) : la voix (SOUL) et les `topics` vérifiés lui sont passés en contexte. Garantit qu'il **n'invente rien** (pas de `WebSearch`/`WebFetch` → il ne travaille qu'à partir des faits déjà vérifiés) et reste déterministe (pas de dépendance `cwd`/filesystem).

## Architecture

### Fichier d'agent — `.claude/agents/redacteur.md` (nouveau)

Frontmatter : `name: redacteur`, `description` (« Rédige les brèves dans la plume de la SOUL (Phase 2). »), `tools:` (vide), `model: opus`, `breves_enabled: true`. Pas de `breves_mode` (réservé au sceptique).

Corps (prompt système, **générique et stable** — la voix arrive à l'exécution) : « Tu es le rédacteur des brèves IA. On te fournit la voix (SOUL §3-4), des échantillons de style (§5), les sujets vérifiés (`topics`) et un `feedback` optionnel. Rédige `teamsText` dans cette plume et propose une `soulLessonProposee`. » + les contraintes de rédaction copiées de `breves-draft.md` §2 (accroche en gras, fait puis aparté entre parenthèses, **zéro tiret cadratin**, s'adresse aux PM, signale `non_verifie`, n'invente rien, ne touche pas à la SOUL/`raw/`). Sortie attendue du sous-agent : un bloc JSON `{ "teamsText": "...", "soulLessonProposee": null|"..." }`.

### Vue Agents — aucun changement

`getAgents` lit déjà tous les `.claude/agents/*.md` ; le rédacteur s'affiche avec modèle / outils / prompt / activation. Le sélecteur « mode » reste gated sur `a.name === 'sceptique'` (ou `a.mode`), donc absent pour le rédacteur. **Vérifié** : aucune modification de `hud/renderer.mjs` ni `companion.html`.

### Engine — `hud/engine.mjs` `dispatch`

Ajouter, en miroir exact de la dérivation `sceptique` :

```js
if (skill === 'breves-draft' && finalInputs.redacteur == null) {
  const r = byName.redacteur;
  finalInputs.redacteur = (r && r.enabled) ? 'on' : 'off';
}
```

(Agent absent ou désactivé → `'off'` → repli inline.) L'injection des agents activés dans `options.agents` est déjà faite pour tous les skills (inchangé).

### Validation des inputs — `lib/command-inputs.mjs`

Branche `breves-draft` : `onlyKeys(inp, ['topics', 'feedback', 'redacteur'])` et `if (inp.redacteur != null && !['on', 'off'].includes(inp.redacteur)) errors.push('redacteur invalide')`.

### Commande — `.claude/commands/breves-draft.md` (recâblage)

- En-tête INPUTS : `{ "topics": [...], "feedback": "<optionnel>", "redacteur": "on|off" }`.
- Étape 1 (incarne la SOUL) : l'agent principal lit `SOUL.md` (inchangé).
- Nouvelle bascule sur `INPUTS.redacteur` :
  - **`on`** : dispatche `Task subagent_type: "redacteur"` (un seul Task), en lui passant dans le prompt : la voix (SOUL §3-4), les échantillons §5, le bloc `topics` vérifié, et le `feedback`. Récupère sa réponse JSON `{ teamsText, soulLessonProposee }`.
  - **`off`** : rédige `teamsText` et `soulLessonProposee` toi-même (les étapes 1-3 actuelles, inchangées).
- Étape « Dérive les champs JSON » : `corrections[]` et `sources[]` sont **toujours** assemblés par l'agent principal depuis les `topics` (mécaniques), quel que soit le mode. En mode `on`, `teamsText`/`soulLessonProposee` viennent du sous-agent ; sinon de l'agent principal.
- Garde-fous et **contrat de sortie `validateDraftOutput` inchangés** (`teamsText`, `corrections[]`, `sources[]`, `soulLessonProposee`).

## Flux de données

```
UI Agents (redacteur.md : modèle/prompt/activé)
        │
engine.dispatch(breves-draft) ──derive──▶ inputs.redacteur = on|off (selon enabled)
        │
breves-draft (agent principal) ── lit SOUL ──┐
   on  └─▶ Task redacteur(voix §3-5 + topics + feedback) ─▶ { teamsText, soulLessonProposee }
   off └─▶ rédige lui-même ─────────────────────────────▶ { teamsText, soulLessonProposee }
        │
   assemble corrections[]/sources[] depuis topics ─▶ JSON validateDraftOutput
```

## Gestion d'erreurs

- Agent `redacteur` absent ou désactivé → `inputs.redacteur = 'off'` → rédaction directe (jamais d'échec dû à l'agent).
- `command-inputs` rejette une valeur `redacteur` hors `{on, off}`.
- Si le sous-agent renvoie un JSON invalide, l'agent principal applique la même rigueur qu'aujourd'hui (le contrat final est validé par `validateDraftOutput` côté runner).

## Tests

- `lib/command-inputs.test.mjs` : `breves-draft` accepte `redacteur: 'on'|'off'`, rejette une autre valeur et une clé inattendue ; `topics` toujours requis.
- `test/engine.test.mjs` : `dispatch('breves-draft')` pose `inputs.redacteur = 'on'` quand l'agent redacteur est activé, `'off'` quand absent/désactivé ; n'écrase pas une valeur explicitement fournie.
- Pas de test UI (aucun changement) ; smoke réel piloté par le contrôleur (un draft en mode `on` produit un `teamsText` non vide et un contrat valide).

## Hors périmètre (YAGNI)

- Pas de « mode » pour le rédacteur (juste activé/désactivé).
- Pas de changement du contrat `validateDraftOutput`, ni de la vue Agents, ni du rendu des éditions.
- Le rédacteur ne lit pas la SOUL lui-même (pas d'outil `Read`) : la voix lui est passée en contexte.
