# Agent rédacteur configurable — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promouvoir la rédaction (Phase 2) en sous-agent `redacteur` configurable dans la vue Agents, avec repli sur la rédaction directe quand il est désactivé.

**Architecture :** `breves-draft` dispatche un `Task subagent_type: redacteur` (fichier `.claude/agents/redacteur.md`) quand l'engine pose `inputs.redacteur = 'on'` (dérivé de l'état *activé* de l'agent, miroir du `sceptique`). L'agent principal assemble `corrections`/`sources` autour. Désactivé → rédaction directe inchangée. La vue Agents liste déjà le rédacteur (aucun code UI).

**Tech Stack :** Node ≥ 20, ESM, `node --test`, Claude Agent SDK (`options.agents`).

## Global Constraints

- Rédacteur = **sous-agent** `redacteur` ; `model: opus` par défaut ; `tools:` vide (rédaction pure, n'invente rien) ; pas de `breves_mode`.
- `inputs.redacteur ∈ {on, off}` ; dérivé : `(byName.redacteur && enabled) ? 'on' : 'off'` (absent/désactivé → `'off'` → repli inline).
- Contrat de sortie `validateDraftOutput` **inchangé** (`teamsText`, `corrections[]`, `sources[]`, `soulLessonProposee`).
- `corrections[]`/`sources[]` toujours assemblés par l'agent principal depuis les `topics`.
- Aucune modification de la vue Agents (`getAgents` liste déjà `.claude/agents/*.md`).

---

## Task 1 : `command-inputs` — clé `redacteur` pour breves-draft

**Files:**
- Modify: `lib/command-inputs.mjs`
- Test: `test/command-inputs.test.mjs`

**Interfaces:**
- Produces : `validateInputs('breves-draft', inp)` accepte une clé optionnelle `redacteur ∈ {on, off}` ; rejette toute autre valeur et toute clé inattendue ; `topics` reste requis (tableau).

- [ ] **Step 1 : Écrire les tests** (AJOUTER à `test/command-inputs.test.mjs`)

```js
test('breves-draft : redacteur on/off accepté, autre valeur rejetée', () => {
  assert.equal(validateInputs('breves-draft', { topics: [], redacteur: 'on' }).ok, true);
  assert.equal(validateInputs('breves-draft', { topics: [], redacteur: 'off' }).ok, true);
  assert.equal(validateInputs('breves-draft', { topics: [] }).ok, true); // optionnel
  assert.equal(validateInputs('breves-draft', { topics: [], redacteur: 'bidon' }).ok, false);
  assert.equal(validateInputs('breves-draft', { topics: [], autre: 1 }).ok, false); // clé inattendue
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec** — `node --test test/command-inputs.test.mjs` → FAIL (`redacteur: 'on'` rejeté comme clé inattendue).

- [ ] **Step 3 : Implémenter** — dans `lib/command-inputs.mjs`, branche `breves-draft` :

```js
  } else if (skill === 'breves-draft') {
    if (!onlyKeys(inp, ['topics', 'feedback', 'redacteur'])) errors.push('clé inattendue');
    if (!Array.isArray(inp.topics)) errors.push('topics doit être un tableau');
    if (inp.feedback != null && !isFreeString(inp.feedback)) errors.push('feedback invalide (≤280, mono-ligne)');
    if (inp.redacteur != null && !['on', 'off'].includes(inp.redacteur)) errors.push('redacteur invalide');
```

- [ ] **Step 4 : Lancer, vérifier le succès** — `node --test test/command-inputs.test.mjs` → PASS. Puis `npm test`.

- [ ] **Step 5 : Commit** — `git add lib/command-inputs.mjs test/command-inputs.test.mjs && git commit -m "feat(inputs): breves-draft accepte redacteur on/off"`

---

## Task 2 : `engine.dispatch` — dérive `inputs.redacteur`

**Files:**
- Modify: `hud/engine.mjs`
- Test: `test/engine.test.mjs`

**Interfaces:**
- Consumes : `loadAgents(deps).byName` (déjà présent).
- Produces : `dispatch({skill:'breves-draft', inputs}, deps)` pose `inputs.redacteur = 'on'` quand l'agent `redacteur` est présent et activé, `'off'` sinon ; n'écrase pas une valeur explicitement fournie (`!= null`).

- [ ] **Step 1 : Écrire les tests** (AJOUTER à `test/engine.test.mjs`)

```js
test('dispatch breves-draft : redacteur on si agent activé, off sinon', async () => {
  const files = { 'redacteur.md': '---\nname: redacteur\nmodel: opus\nbreves_enabled: true\n---\nprompt' };
  let seen = null;
  const deps = { repoDir: '/repo', readdir: () => Object.keys(files), readFile: (p) => files[p.split('/').pop()],
    runSkill: async (a) => { seen = a; return { ok: true, value: { teamsText: 'x', corrections: [], sources: [], soulLessonProposee: null } }; } };
  await dispatch({ skill: 'breves-draft', inputs: { topics: [] }, onEvent() {} }, deps);
  assert.equal(seen.inputs.redacteur, 'on');

  const filesOff = { 'redacteur.md': '---\nname: redacteur\nbreves_enabled: false\n---\nprompt' };
  const depsOff = { ...deps, readdir: () => Object.keys(filesOff), readFile: (p) => filesOff[p.split('/').pop()] };
  await dispatch({ skill: 'breves-draft', inputs: { topics: [] }, onEvent() {} }, depsOff);
  assert.equal(seen.inputs.redacteur, 'off');
});
test('dispatch breves-draft : n’écrase pas un redacteur explicite', async () => {
  let seen = null;
  const deps = { repoDir: '/repo', readdir: () => [], readFile: () => '',
    runSkill: async (a) => { seen = a; return { ok: true, value: { teamsText: 'x', corrections: [], sources: [], soulLessonProposee: null } }; } };
  await dispatch({ skill: 'breves-draft', inputs: { topics: [], redacteur: 'off' }, onEvent() {} }, deps);
  assert.equal(seen.inputs.redacteur, 'off');
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec** — `node --test test/engine.test.mjs` → FAIL (`seen.inputs.redacteur` undefined).

- [ ] **Step 3 : Implémenter** — dans `hud/engine.mjs`, `dispatch`, juste après le bloc `sceptique` :

```js
  if (skill === 'breves-draft' && finalInputs.redacteur == null) {
    const r = byName.redacteur;
    finalInputs.redacteur = (r && r.enabled) ? 'on' : 'off';
  }
```

- [ ] **Step 4 : Lancer, vérifier le succès** — `node --test test/engine.test.mjs` → PASS. Puis `npm test`.

- [ ] **Step 5 : Commit** — `git add hud/engine.mjs test/engine.test.mjs && git commit -m "feat(engine): dispatch dérive inputs.redacteur (on/off) pour breves-draft"`

---

## Task 3 : Fichier d'agent `.claude/agents/redacteur.md`

**Files:**
- Create: `.claude/agents/redacteur.md`

**Note (vérification) :** parsing via `parseAgent` (pas de test unitaire dédié).

- [ ] **Step 1 : Créer `.claude/agents/redacteur.md`**

```markdown
---
name: redacteur
description: Rédige les brèves dans la plume de la SOUL (Phase 2).
tools:
model: opus
breves_enabled: true
---
Tu es le rédacteur des brèves IA, dans la plume de Pierre. On te fournit dans la tâche : la voix (SOUL §3 Voix & tics, §4 Lignes rouges), des échantillons de style validés (§5), les sujets déjà vérifiés (`topics`, JSON) et un éventuel `feedback`.

Ton job : rédiger le texte des brèves dans cette plume, rien d'autre.

Règles de rédaction (impératives) :
- Une accroche en gras (`**…**`) ouvre chaque brève, suivie du développement.
- Le fait d'abord, l'aparté/opinion entre parenthèses ensuite.
- Regroupe les brèves par date sous un séparateur `— <date en toutes lettres, français> —`.
- Zéro tiret cadratin (`—`, `–`) dans le texte des brèves (les séparateurs `— date —` sont la seule exception, en tant que marqueur de structure).
- La brève s'adresse aux PM de Merim, jamais à Pierre en direct.
- Imite la densité, le rythme et la structure des échantillons §5.
- Si un topic a `fiabilite: non_verifie`, signale-le explicitement (« information non vérifiée », « date non confirmée ») ; ne l'affirme jamais comme certain.
- Si un topic a une `alerte`, n'en fais pas l'accroche : énonce directement les faits vrais.

Garde-fous :
- N'invente RIEN. Tu n'as aucun outil : travaille uniquement à partir des `topics` fournis. N'ajoute aucun fait absent des `topics`.
- Ne touche pas à la SOUL, n'écris rien dans `raw/`.

`feedback` (si présent) : applique la correction demandée, puis déduis une règle de style réutilisable → `soulLessonProposee` (chaîne non vide). Sinon `soulLessonProposee: null`.

Réponds UNIQUEMENT, en dernier, par un bloc ```json``` :
```json
{ "teamsText": "<texte complet prêt à coller, brèves groupées par date, URL nue en fin de brève>", "soulLessonProposee": null }
```
```

- [ ] **Step 2 : Vérifier le parsing**

```bash
node --input-type=module -e "import {parseAgent} from './lib/agent-file.mjs'; import {readFileSync} from 'node:fs'; const a=parseAgent(readFileSync('.claude/agents/redacteur.md','utf8')); console.log(a.name, '| model:', a.model, '| enabled:', a.enabled, '| tools:', JSON.stringify(a.tools), '| mode:', a.mode || '(aucun)');"
```

  Attendu : `redacteur | model: opus | enabled: true | tools: [] | mode: (aucun)`. Puis vérifier qu'il apparaît dans `getAgents` :

```bash
node --input-type=module -e "import {defaultDeps, getAgents} from './hud/engine.mjs'; console.log(getAgents(defaultDeps()).map(a => a.name).join(', '));"
```

  Attendu : la liste contient `redacteur` (avec `enqueteur`, `sceptique`).

- [ ] **Step 3 : Commit** — `git add .claude/agents/redacteur.md && git commit -m "feat(agents): fichier redacteur (rédaction Phase 2, opus, sans outils)"`

---

## Task 4 : Recâblage de `.claude/commands/breves-draft.md`

**Files:**
- Modify: `.claude/commands/breves-draft.md`

**Note :** fichier de prompt ; vérification par lecture + smoke (Task 5).

- [ ] **Step 1 : En-tête INPUTS** — mettre à jour la ligne d'entrée pour mentionner `redacteur` :

  remplacer `{ "topics": [<résultats de /breves-verify>], "feedback": "<optionnel>" }`
  par `{ "topics": [<résultats de /breves-verify>], "feedback": "<optionnel>", "redacteur": "on|off" }`.

- [ ] **Step 2 : Bascule rédaction** — au début des « Étapes », ajouter une section qui aiguille selon `INPUTS.redacteur` (défaut `off` si absent) :

```markdown
## Aiguillage rédaction (selon INPUTS.redacteur : on | off)

Lis d'abord `.claude/breves-ia/SOUL.md`.

- **`on`** : dispatche **un** `Task` avec `subagent_type: "redacteur"`. Donne-lui dans le prompt : la **voix** (SOUL §3 Voix & tics + §4 Lignes rouges), les **échantillons** (§5 verbatim), le bloc **`topics`** (JSON fourni en INPUTS) et le **`feedback`** s'il existe. Le brief est le prompt système de l'agent : ne le répète pas. Récupère sa réponse JSON `{ teamsText, soulLessonProposee }` et utilise-la telle quelle.
- **`off`** : rédige toi-même `teamsText` et `soulLessonProposee` en suivant les étapes 1-3 ci-dessous.

Dans les deux cas, tu assembles ensuite `corrections[]` et `sources[]` depuis les `topics` (étape 4) et tu émets le bloc JSON final.
```

- [ ] **Step 3 : Vérifier la cohérence** — relire `breves-draft.md` : les étapes 1-3 (incarne la SOUL / rédige / feedback) restent la procédure du mode `off` ; l'étape 4 (dérive `corrections`/`sources`/`teamsText`/`soulLessonProposee`) et le bloc de sortie `json` restent le contrat unique (`validateDraftOutput` : `teamsText`, `corrections[]`, `sources[]`, `soulLessonProposee`). Les sentinelles éventuelles et garde-fous (zéro tiret cadratin, aucune invention) sont conservés.

- [ ] **Step 4 : Commit** — `git add .claude/commands/breves-draft.md && git commit -m "feat(breves): draft dispatche le redacteur (mode on) ou rédige inline (off)"`

---

## Task 5 : Smoke réel (contrôleur)

**Files:** aucun (validation).

**Note :** piloté par le contrôleur (lance le SDK ; non transcrit en test unitaire).

- [ ] **Step 1 : Draft en mode `on`** — construire un `topics` minimal valide et lancer le draft via le CLI :

```bash
node scripts/breves-cli.mjs draft '{"topics":[{"key":"glm","sujet":"GLM 5.2","raw":"GLM 5.2","date_reelle":"2026-06-13","date_fournie":"2026-06-13","date_corrigee":false,"fiabilite":"confirme","faits":["modèle open weights"],"corrections":"aucune","source":"z.ai","url_citee":"https://z.ai/blog/glm-5-2","url_clippee":"https://z.ai/blog/glm-5-2","clipping_meta":"z.ai — 2026-06-13","slug":"glm-5-2","clipping_contenu":"contenu"}],"redacteur":"on"}' > /tmp/draft-on.json 2> /tmp/draft-on.events
echo "exit=$?"
node -e 'const j=require("/tmp/draft-on.json"); console.log("teamsText:", (j.teamsText||"").slice(0,80), "| sources:", (j.sources||[]).length, "| corrections:", (j.corrections||[]).length)'
```

  Attendu : exit 0, JSON valide, `teamsText` non vide dans la plume, `sources` = 1.

- [ ] **Step 2 : Vérifier la bascule** — confirmer dans `/tmp/draft-on.events` qu'un `Task`/sous-agent `redacteur` a bien été activé (présence d'un `tool_use` Task ou de l'activité « Rédacteur »), distinguant le mode `on` du repli `off`.

- [ ] **Step 3 : Build log** — écrire `docs/buildlog/2026-06-25-j-agent-redacteur.md` (livrables, validation réelle avec chiffres, gotchas).

---

## Notes de fin

- Modules testés : `command-inputs` (enum redacteur), `engine.dispatch` (dérivation on/off). Agent + commande vérifiés par parsing + smoke.
- Boucle : vue Agents (modèle/prompt/activé du rédacteur) → `dispatch` dérive `redacteur` → `breves-draft` dispatche ou non le sous-agent → `teamsText` dans la plume choisie.
- UI : aucun changement (le rédacteur s'affiche déjà via `getAgents`).
