# Agents formalisés + passe sceptique + vue config — Design

> Date : 2026-06-24
> Statut : design validé, en attente de relecture avant plans d'implémentation
> Portée : transformer les enquêteurs en vrais fichiers d'agent, ajouter un agent sceptique (passe adversariale), et une vue de configuration dans l'UI

## 1. Objectif

Aujourd'hui la phase de vérification (`/breves-verify`) dispatche des sous-agents `general-purpose` à qui elle fait lire un brief (`_brief-enqueteur.md`). On veut :
1. **Formaliser** ces enquêteurs en **fichiers d'agent** Claude Code (`.claude/agents/`), invoqués par `subagent_type`.
2. **Ajouter un agent `sceptique`** qui, en passe adversariale, tente de **réfuter** l'affirmation centrale d'une brève (le vrai levier qualité : un agent ne note plus son propre travail).
3. **Une vue de configuration** dans l'app pour régler chaque agent (modèle, outils, prompt système, activer/désactiver ; et pour le sceptique, le mode).

### Décisions cadrées (brainstorm 2026-06-24)
- Découpage **par sujet** conservé (un enquêteur par brève). Le sceptique est une **2ᵉ passe**, pas un découpage par tâche.
- **Mode sceptique** réglable dans l'UI : `off | ciblé | toujours` (défaut **ciblé** = chiffres/records/superlatifs).
- **Config éditable par agent** : modèle + prompt système + outils + activer/désactiver (+ mode pour le sceptique).
- **Deux sous-systèmes**, une spec, **deux plans** : (1) agents + recâblage verify ; (2) vue config UI.

## 2. Sous-système 1 — Fichiers d'agent + recâblage verify

### 2.1 Format des fichiers d'agent

`.claude/agents/<nom>.md` (format Claude Code) : frontmatter YAML + corps (= prompt système).

```markdown
---
name: enqueteur
description: Vérifie un sujet IA pour une brève (faits, date, source, clipping).
tools: WebSearch, WebFetch
model: sonnet
breves_enabled: true
---
<prompt système = le brief enquêteur actuel, reformulé en « tu es… »>
```

```markdown
---
name: sceptique
description: Tente de réfuter l'affirmation centrale d'une brève (vérification adversariale).
tools: WebSearch, WebFetch
model: sonnet
breves_enabled: true
breves_mode: ciblé
---
<prompt système : « Ton seul job est de RÉFUTER. L'affirmation centrale tient-elle ?
la date ? la source dit-elle vraiment ça ? Doute par défaut. Réponds : refute oui/non,
raison, et fiabilité suggérée (confirme|partiel|non_verifie). »>
```

- `model` : alias Claude Code (`opus|sonnet|haiku|inherit`).
- `tools` : liste (lecture/web uniquement ; pas d'écriture).
- Champs custom `breves_*` : ignorés par Claude Code, lus par l'app.

### 2.2 Recâblage de `breves-verify`

- Phase 1 : extraire les sujets (sentinelles `«BREVES» topic`), puis **dispatcher `subagent_type: enqueteur` par sujet** (un seul message, plusieurs `Agent`). Le brief n'est plus passé inline : c'est le **prompt système de l'agent**. La tâche = le sujet (+ date/url fournies).
- Passe **sceptique**, selon `INPUTS.sceptique` (`off|ciblé|toujours`) :
  - `off` : aucune.
  - `toujours` : pour chaque brève, dispatcher `subagent_type: sceptique` (affirmation + date + source à réfuter).
  - `ciblé` : seulement les brèves à affirmation forte (chiffres, « premier/record », superlatifs).
  - **Fusion** : si le sceptique réfute → `fiabilite` rétrogradée (`partiel`/`non_verifie`) et une `correction`/`alerte` ajoutée ; sinon inchangé.
- Sortie : **même contrat** `validateVerifyOutput`. (Le `_brief-enqueteur.md` snippet devient le corps de l'agent ; on peut le retirer ou le garder comme source.)

### 2.3 Risque clé + repli

À valider au **smoke réel** (comme le MCP en Plan C) : le SDK headless en `cwd=repo` charge-t-il `.claude/agents/` et accepte-t-il `subagent_type: enqueteur` ? **Repli** si non : revenir à `general-purpose` + « lis et applique le corps de l'agent comme brief » (le fichier d'agent reste la source unique du prompt).

## 3. Sous-système 2 — Vue de configuration (UI)

### 3.1 Moteur (pur + testé)

- `lib/agent-file.mjs` : `parseAgent(raw) -> { name, description, tools:[], model, enabled, mode, systemPrompt }` (frontmatter YAML simple + corps) ; `serializeAgent(model) -> raw` (round-trip fidèle).
- `hud/engine.mjs` : `getAgents(deps) -> Agent[]` (lit `<repoDir>/.claude/agents/*.md`) ; `saveAgent(deps, name, edits) -> {ok}|{ok:false,error}` (écrit le fichier, refuse un prompt/nom vide).
- **Passage de la config au verify** : avant un `breves-verify`, l'engine lit l'agent `sceptique` (`enabled`+`mode`) et ajoute `inputs.sceptique = enabled ? mode : 'off'`. `validateInputs('breves-verify')` autorise désormais la clé `sceptique` (∈ `off|ciblé|toujours`).

### 3.2 Vue « Agents »

Nouvelle vue (accessible depuis le dashboard) listant les agents. Par agent :
- **modèle** (select Opus/Sonnet/Haiku/inherit),
- **outils** (liste éditable, ex. champ texte « WebSearch, WebFetch »),
- **prompt système** (textarea = le corps),
- **activer/désactiver** (toggle),
- pour le **sceptique** uniquement : **mode** (off/ciblé/toujours).
- Bouton **Enregistrer** par agent → `saveAgent`.

## 4. Gestion d'erreurs

- `parseAgent` robuste à un frontmatter partiel (champs manquants → valeurs par défaut), ne jette pas.
- `saveAgent` refuse nom/prompt vide ; erreur d'écriture renvoyée.
- `getAgents` : dossier absent → `[]`.
- Si l'agent `sceptique` est absent/désactivé → verify se comporte comme aujourd'hui (sans passe adversariale).

## 5. Tests

- `parseAgent`/`serializeAgent` : round-trip sur un fixture d'agent (frontmatter complet + corps), tolérance champ manquant.
- `getAgents`/`saveAgent` : via `readFile`/`writeFile`/`readdir` injectés ; refus vide.
- `validateInputs('breves-verify', {sujets, sceptique})` : accepte les 3 modes, refuse une valeur hors enum.
- Recâblage verify + sceptique : **smoke réel** (un sujet à chiffre → le sceptique se déclenche en ciblé).
- UI : vérifiée en lançant l'app.

## 6. Découpage en plans

- **Plan 1 — Agents + verify** : créer `enqueteur.md`/`sceptique.md`, recâbler `breves-verify` (dispatch par `subagent_type`, passe sceptique, fusion), autoriser `sceptique` en input, smoke (valide le risque `subagent_type`). 
- **Plan 2 — Vue config** : `lib/agent-file.mjs`, `getAgents`/`saveAgent`, passage du mode sceptique aux inputs verify, IPC, vue « Agents ».

## 7. Hors scope

- `breves-draft` / `breves-archive` / format des notes : inchangés.
- Création/suppression d'agents depuis l'UI (on configure les 2 existants ; ajout d'agents = plus tard).
- Un agent de synthèse/dédup final (éventuellement plus tard).
