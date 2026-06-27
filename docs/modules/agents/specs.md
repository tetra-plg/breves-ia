> Module : agents · reverse (constat) · cartographié à `4ce7095`

# specs — module agents

> Rédigé en mode PO Module, reverse. Chaque assertion est tracée. Le code fait foi.
> Réfère le socle : `docs/project/specs.md` pour le contexte produit global, la persona Pierre,
> les règles transverses de sécurité et la définition de la règle anti-traversal.

---

## Contexte du module

Le module **Agents** permet à Pierre d'inspecter et d'éditer les trois sous-agents Claude qui animent
le pipeline de production des brèves : **enquêteur**, **rédacteur** et **sceptique**. Ces agents vivent
dans des fichiers Markdown à frontmatter YAML dans `.claude/agents/` ; l'UI les rend éditables sans
que Pierre n'ouvre un éditeur de texte.

Source globale US-10 : `docs/project/specs.md:237-253`.

---

## US-A1 — Lister les agents disponibles

**En tant que** Pierre, **je veux** voir en un coup d'œil la liste de tous les agents présents dans
`.claude/agents/`, **pour** savoir lesquels sont actifs avant de lancer une nouvelle édition.

**Critères d'acceptance :**

- La vue `agents` affiche une carte par fichier `.md` trouvé dans `.claude/agents/`, triée par nom
  alphabétique.
  _Vu `src/renderer/pages/Agents.tsx:14-16`, `src/main/engine.ts:179-182` (`Object.values(byName).sort`)._
- Chaque carte montre : nom de l'agent, description, modèle actif, outils déclarés, état
  d'activation (coché/décoché).
  _Vu `src/renderer/components/AgentCard.tsx:49-55`._
- Si le dossier `.claude/agents/` est absent ou vide, le message « Aucun agent dans .claude/agents/. »
  s'affiche sans erreur.
  _Vu `src/renderer/pages/Agents.tsx:33-34` ; `src/main/engine.ts:68-71` (`catch → {}`)._
- La vue est atteinte depuis le header ; elle est en dehors du FLOW linéaire (pas de stepper).
  _Vu `src/domain/navigation.ts:1-4` (absent de `VIEWS` stepper), `src/renderer/App.tsx:22-37`._

---

## US-A2 — Éditer la consigne système d'un agent

**En tant que** Pierre, **je veux** modifier le prompt système d'un agent directement dans l'UI,
**pour** affiner ses instructions sans toucher au fichier `.md` manuellement.

**Critères d'acceptance :**

- La zone de texte « Prompt système » est pré-remplie avec le corps du fichier `.md` (hors frontmatter).
  _Vu `src/renderer/components/AgentCard.tsx:32`, `src/domain/agents.ts:33` (`body` ← `splitFrontmatter`)._
- La zone accepte une édition libre (multi-lignes, monospace).
  _Vu `AgentCard.tsx:79` (Textarea, `font: '400 12px/1.55 var(--mono)'`)._
- Un prompt vide (ou n'ayant que des espaces) est rejeté à la sauvegarde ; aucune écriture sur disque
  ne se produit et un toast « Échec : … » s'affiche.
  _Vu `src/main/engine.ts:199-201` (`!edits.systemPrompt.trim()` → `{ ok:false, error:'prompt vide' }`),
  `src/renderer/pages/Agents.tsx:24`._

---

## US-A3 — Choisir le modèle d'un agent

**En tant que** Pierre, **je veux** sélectionner le modèle Claude utilisé par un agent via un menu
déroulant, **pour** adapter le coût/qualité de chaque sous-agent.

**Critères d'acceptance :**

- Le sélecteur propose quatre options : `Hériter` (valeur vide), `Opus`, `Sonnet`, `Haiku`.
  _Vu `AgentCard.tsx:10` (`MODELES = [['', 'Hériter'], ['opus','Opus'], ['sonnet','Sonnet'], ['haiku','Haiku']]`)._
- La valeur initiale du sélecteur reflète le champ `model` parsé depuis le frontmatter.
  _Vu `AgentCard.tsx:29` (`useState(agent.model)`), `agents.ts:30` (`fm.model && fm.model !== 'inherit' ? fm.model : ''`)._
- Sélectionner `Hériter` signifie qu'aucun override modèle n'est sérialisé dans le frontmatter
  (champ `model` absent du fichier `.md`).
  _Vu `agents.ts:47` (`if (a.model) fm.push(...)`) ; `serializeAgent` n'écrit `model:` que si non vide._

**Règle métier :** Le mode `inherit` (valeur vide côté modèle) est le seul cas où le champ `model`
est omis du frontmatter sérialisé. Constaté `agents.ts:47`.

---

## US-A4 — Gérer les outils déclarés d'un agent

**En tant que** Pierre, **je veux** modifier la liste des outils auxquels un agent a accès (ex.
`WebSearch, WebFetch`), **pour** restreindre ou étendre les capacités d'un agent.

**Critères d'acceptance :**

- Le champ « Outils » est pré-rempli avec les outils séparés par des virgules.
  _Vu `AgentCard.tsx:31` (`useState((agent.tools ?? []).join(', '))`)._
- À la sauvegarde, la chaîne saisie est découpée par `,` et les espaces sont supprimés avant
  d'être transmis en tableau.
  _Vu `AgentCard.tsx:38-39` (`tools.split(',').map((t)=>t.trim()).filter(Boolean)`)._
- Les outils sont resérialisés en ligne séparés par `, ` dans le frontmatter.
  _Vu `agents.ts:46` (`tools: ${(a.tools || []).join(', ')}`)._

---

## US-A5 — Activer ou désactiver un agent

**En tant que** Pierre, **je veux** cocher/décocher un agent, **pour** l'exclure du pipeline sans le
supprimer de la liste.

**Critères d'acceptance :**

- La case à cocher « activé » reflète le champ `breves_enabled` du frontmatter (`true` si absent ou
  valeur ≠ `'false'`).
  _Vu `agents.ts:31` (`fm.breves_enabled !== 'false'`)._
- Un agent désactivé (`enabled = false`) est toujours listé dans `getAgents` (visible dans l'UI),
  mais n'est pas injecté en tant que définition SDK dans `loadAgents`.
  _Vu `engine.ts:75-77` (`if (a.enabled) defs[a.name] = toAgentDefinition(a)`) ; `getAgents` lit
  `byName` (tous), pas `defs` (seuls les activés)._
- La valeur `breves_enabled: false` est écrite dans le frontmatter quand la case est décochée.
  _Vu `agents.ts:48` (`a.enabled === false ? 'false' : 'true'`)._

**Règle métier :** `enabled` défaut `true` — un champ `breves_enabled` absent équivaut à `true`.
Constaté `agents.ts:31`.

---

## US-A6 — Configurer le mode sceptique

**En tant que** Pierre, **je veux** choisir le mode d'activation du sceptique (`off`, `ciblé`,
`toujours`), **pour** contrôler l'intensité de la vérification adversariale.

**Critères d'acceptance :**

- Le sélecteur « Mode sceptique » est affiché uniquement si l'agent a un `breves_mode` non vide **ou**
  si son nom est `sceptique`.
  _Vu `AgentCard.tsx:34` (`isScept = !!agent.mode || agent.name === 'sceptique'`)._
- Les valeurs disponibles sont `off`, `ciblé`, `toujours`.
  _Vu `AgentCard.tsx:11` (`MODES`)._
- Le mode sélectionné est transmis dans `edits.mode` à la sauvegarde uniquement pour `isScept`.
  _Vu `AgentCard.tsx:43` (`if (isScept) edits.mode = mode`)._
- La valeur `breves_mode` est omise du frontmatter si elle est vide (mode non sceptique).
  _Vu `agents.ts:49` (`if (a.mode) fm.push(...)`)._
- Le mode `ciblé` par défaut du sceptique (frontmatter initial) signifie : le sceptique s'active sur
  les affirmations fortes (chiffres, superlatifs, records), laissé au jugement de l'agent (LLM-judge).
  _Vu `.claude/agents/sceptique.md:7`, GAP-08._

---

## US-A7 — Enregistrer les modifications d'un agent

**En tant que** Pierre, **je veux** cliquer « Enregistrer » pour persister mes modifications dans le
fichier `.md` correspondant, **pour** que le pipeline reprenne les nouvelles instructions dès la
prochaine exécution.

**Critères d'acceptance :**

- Cliquer « Enregistrer » appelle `window.api.saveAgent(name, edits)` via IPC.
  _Vu `Agents.tsx:23`, `preload/index.ts:21`._
- En cas de succès, un toast « Agent « X » enregistré » s'affiche.
  _Vu `Agents.tsx:24`._
- En cas d'erreur (prompt vide, nom traversant, erreur disque), un toast « Échec : <message> »
  s'affiche.
  _Vu `Agents.tsx:24` (`r.error ?? 'inconnu'`)._
- La sauvegarde est une fusion : les champs non fournis par `edits` conservent la valeur lue dans le
  fichier existant (merge avec `parseAgent` du fichier courant).
  _Vu `engine.ts:206-215` (merge `current` + `edits` → `merged`)._
- Les champs non éditables dans la carte courante (ex. `description` non exposée dans l'UI AgentCard)
  sont préservés à l'identique.
  _Vu `engine.ts:213` (`description: edits.description ?? current.description`)._

---

## Règles métier transverses du module

| Règle | Constaté |
|---|---|
| Anti-traversal : `name` ne peut contenir `..` ni `/` ni `\` | `engine.ts:194-196` (`isSafeName`) |
| Prompt non vide obligatoire | `engine.ts:199-201` |
| `enabled` défaut `true` (absent = activé) | `agents.ts:31` |
| Mode `inherit` = champ `model` absent du fichier | `agents.ts:30,47` |
| Seuls les agents `enabled` sont injectés comme defs SDK | `engine.ts:75-77` |
| `breves_mode` omis si vide | `agents.ts:49` |
| Sauvegarde = merge, non remplacement total | `engine.ts:206-215` |

---

## États UI (mockups textuels)

**État 1 — Chargement :** spinner / « Chargement… » pendant l'appel `get-agents`.
_Vu `Agents.tsx:31` (`agents === null`)._

**État 2 — Liste vide :** texte « Aucun agent dans .claude/agents/. » (tone faint).
_Vu `Agents.tsx:33-34`._

**État 3 — Carte agent (lecture/édition) :**
```
┌─────────────────────────────────────────┐
│ [nom]                          ☑ activé  │
│ [description en muted 11.5px]            │
│ Modèle  [Hériter▼]                       │
│ (si sceptique) Mode sceptique  [ciblé▼]  │
│ Outils (séparés par des virgules)        │
│ [WebSearch, WebFetch______________]      │
│ Prompt système                           │
│ [textarea monospace 160px min]           │
│                     [Enregistrer]        │
└─────────────────────────────────────────┘
```

**État 4 — Toast succès :** `« sceptique » enregistré` (affiché par `app.store.showToast`).
**État 5 — Toast erreur :** `Échec : prompt vide` ou `Échec : nom invalide` ou `Échec : inconnu`.

---

## Cas d'erreur

| Scénario | Comportement attendu | Trace |
|---|---|---|
| Prompt vide (`'   '`) soumis | Rejet backend, `ok:false, error:'prompt vide'`, toast « Échec : prompt vide », pas d'écriture | `engine.ts:199-201` |
| Nom contenant `..` ou `/` | Rejet backend, `ok:false, error:'nom invalide'`, toast « Échec : nom invalide », pas d'écriture | `engine.ts:194-196`, `engine.ts:199` |
| Fichier `.md` illisible (disque) | `catch(e) → { ok:false, error: e.message }`, toast « Échec : … » | `engine.ts:216-218` |
| Dossier `.claude/agents/` absent | `getAgents` retourne tableau vide, UI affiche état 2 (vide) | `engine.ts:68-71` |

---

## GAPS À REMONTER

| # | Observation |
|---|---|
| GAP-08 | Le mode `ciblé` du sceptique est heuristique (jugement LLM), non déterministe. Pas de règle d'activation testable côté code. |
| GAP-16 | `Agents.tsx` et `AgentCard.tsx` ne sont pas testés directement (aucun test de composant/page). Seuls les handlers et les fonctions domain ont des tests. |
