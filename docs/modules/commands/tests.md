# Plan de tests — Module : commands

> Module : commands · reverse (constat) · cartographié à `4ce7095`
> Rédigé en posture QA Module (reverse) : chaque assertion est tracée. Réfère la stratégie globale : `docs/project/tests.md`.

---

## Couverture existante (constatée)

### TC-CMD-01 — `parseCommand` extrait description + body

**Fichier :** `tests/domain/commands.test.mjs:5-9`
**Niveau :** unitaire (Node/Vitest, import direct du module domain)

```
test('parseCommand extrait description + body')
  input: '---\ndescription: Phase 1\n---\n\n# /breves-verify\n\nContenu.'
  → c.description === 'Phase 1'
  → c.body === '# /breves-verify\n\nContenu.'
```

**Statut :** PASSE (pre-commit hook vert à `4ce7095`).

---

### TC-CMD-02 — `serializeCommand` round-trip

**Fichier :** `tests/domain/commands.test.mjs:11-16`
**Niveau :** unitaire

```
test('serializeCommand round-trip')
  serializeCommand({ description: 'Phase 1', body: 'Contenu.' })
  → parseCommand(raw).description === 'Phase 1'
  → parseCommand(raw).body === 'Contenu.'
```

**Statut :** PASSE.

---

### TC-CMD-03 — `serializeCommand` : description vide → frontmatter valide

**Fichier :** `tests/domain/commands.test.mjs:18-21`
**Niveau :** unitaire

```
test('serializeCommand: description vide → frontmatter valide')
  serializeCommand({ description: '', body: 'X' })
  → raw.match(/^---\ndescription: \n---\n/)  // description: <vide>
```

**Statut :** PASSE.

---

### TC-CMD-04 — `get-commands` renvoie la liste

**Fichier :** `tests/main/commands.handlers.test.mjs:19-24`
**Niveau :** intégration (FS réel, tmpdir, `registerCommandsHandlers` injectée)

```
test('get-commands renvoie la liste')
  fixture : breves-verify.md avec frontmatter description: P1
  → h['get-commands'](null)[0].name === 'breves-verify'
```

**Statut :** PASSE.

---

### TC-CMD-05 — `save-command` écrit puis `get-commands` reflète

**Fichier :** `tests/main/commands.handlers.test.mjs:26-35`
**Niveau :** intégration (FS réel, tmpdir)

```
test('save-command écrit puis get-commands reflète')
  h['save-command'](null, { name: 'breves-verify', edits: { description: 'P1b', body: 'Maj.' } })
  → r.ok === true
  h['get-commands'](null)[0].description === 'P1b'
  h['get-commands'](null)[0].body === 'Maj.'
```

**Statut :** PASSE.

---

## Couverture manquante (constatée)

### TC-CMD-06 — `saveCommand` : corps vide refusé

**Fichier :** aucun test existant pour ce cas
**Niveau :** unitaire (engine direct ou via handler)

```
saveCommand(deps, 'breves-verify', { description: 'X', body: '' })
→ { ok: false, error: 'corps vide' }

saveCommand(deps, 'breves-verify', { description: 'X', body: '   ' })
→ { ok: false, error: 'corps vide' }
```

**Statut :** NON TESTÉ. La règle existe (`engine.ts:244`) mais aucun TC ne la couvre.
**Priorité :** haute — garde métier centrale.

---

### TC-CMD-07 — `saveCommand` : nom traversant rejeté (anti path-traversal)

**Fichier :** aucun test existant pour ce cas dans `commands.handlers.test.mjs`
**Niveau :** unitaire

```
saveCommand(deps, '../etc/passwd', { description: '', body: 'x' })
→ { ok: false, error: 'nom invalide' }

saveCommand(deps, 'a/b', { description: '', body: 'x' })
→ { ok: false, error: 'nom invalide' }

saveCommand(deps, '', { description: '', body: 'x' })
→ { ok: false, error: 'nom invalide' }
```

**Statut :** NON TESTÉ directement dans la suite `commands.handlers.test.mjs`. La fonction `isSafeName` est non exportée (`engine.ts:194`) ; le test doit passer par `saveCommand`.
**Priorité :** haute — corrigé en commit `4ce7095`, mais non verrouillé par un TC de régression.

**Note :** `tests/main/engine.test.mjs` contient des tests de `saveAgent` qui couvrent la même `isSafeName` — vérifier si une couverture croisée existe via agent.

---

### TC-CMD-08 — `loadCommands` : répertoire absent → `[]`

**Fichier :** aucun test explicite pour `loadCommands` seul
**Niveau :** unitaire

```
loadCommands({ repoDir: '/chemin/inexistant', readdir: () => { throw new Error('ENOENT'); } })
→ []
```

**Statut :** NON TESTÉ explicitement (couvert implicitement par TC-CMD-04 via un répertoire valide, mais le cas d'échec non testé).
**Priorité :** basse (comportement de robustesse simple, silencieux).

---

### TC-CMD-09 — `parseCommand` sans frontmatter (fichier mal formé)

**Fichier :** aucun test
**Niveau :** unitaire

```
parseCommand('# Contenu sans frontmatter')
→ { description: '', body: '# Contenu sans frontmatter' }
```

**Statut :** NON TESTÉ. `splitFrontmatter` gère ce cas (`frontmatter.ts:3` — `if (!m) return { fm: {}, body: raw.trim() }`), mais aucun TC ne le documente pour `parseCommand`.
**Priorité :** basse (edge-case format).

---

### TC-CMD-10 — `Commands.tsx` : rendu React (page entière)

**Statut :** NON TESTÉ — GAP-16. `Commands.tsx` est une page React ; pas de setup de test renderer dans la suite (`vitest.config.mjs` en env `node`, jsdom absent).

**Scénarios manquants :**
- Rendu état initial (`commands === null`) : `Chargement…` visible.
- Rendu nominal (3 commandes) : 3 `CommandCard` rendus.
- Rendu état vide (`commands = []`) : message `Aucune commande dans .claude/commands/.`.
- Clic `Enregistrer` → `save(name, edits)` appelé.
- Toast succès et toast échec affichés selon `r.ok`.

**Raison :** absence de setup de test renderer (env node, pas de jsdom configuré). À adresser en accompagnement de GAP-16.

---

### TC-CMD-11 — `CommandCard.tsx` : formulaire (composant pur)

**Statut :** NON TESTÉ — GAP-16.

**Scénarios manquants :**
- Rendu initial : `description` et `body` initialisés depuis `command`.
- Modification `Input` → `description` local mis à jour.
- Modification `Textarea` → `body` local mis à jour.
- Clic `Enregistrer` → `onSave({ description, body })` appelé avec les valeurs courantes.

---

### TC-CMD-12 — `window.api.saveCommand` (preload / IPC round-trip)

**Statut :** NON TESTÉ (pas de test d'intégration Electron IPC dans la suite). Le contrat preload est validé uniquement par le typecheck TypeScript.

---

## Matrice de couverture module

| Composant / fonction | Testé | Fichier test | GAP |
|---|---|---|---|
| `parseCommand` nominal | OUI | `commands.test.mjs:5-9` | — |
| `serializeCommand` round-trip | OUI | `commands.test.mjs:11-16` | — |
| `serializeCommand` description vide | OUI | `commands.test.mjs:18-21` | — |
| `get-commands` IPC (handler) | OUI | `commands.handlers.test.mjs:19-24` | — |
| `save-command` IPC (handler) — nominal | OUI | `commands.handlers.test.mjs:26-35` | — |
| `saveCommand` corps vide → rejeté | NON | — | TC-CMD-06 |
| `saveCommand` nom traversant → rejeté | NON | — | TC-CMD-07 |
| `loadCommands` répertoire absent | NON | — | TC-CMD-08 |
| `parseCommand` sans frontmatter | NON | — | TC-CMD-09 |
| `Commands.tsx` (React) | NON | — | GAP-16, TC-CMD-10 |
| `CommandCard.tsx` (React) | NON | — | GAP-16, TC-CMD-11 |
| Preload `saveCommand` IPC round-trip | NON | — | GAP-16, TC-CMD-12 |

---

## Stratégie de tests (réfère socle)

Voir `docs/project/tests.md` pour :
- Stratégie globale (unitaire → intégration FS → pre-commit hook).
- Convention de nommage `.test.mjs`, runner Vitest env `node`.
- `tests/domain/commands.test.mjs` — logique domain pure (pas de FS, pas d'Electron).
- `tests/main/commands.handlers.test.mjs` — intégration FS réelle (tmpdir), handler enregistré via `registerCommandsHandlers`.
- `tests/main/command.handlers.test.mjs` (sans « s ») — test du **pipeline d'exécution** (canaux `send-command`, `archive-ingest`), **pas ce module**.
- Invariant Storybook (`tests/renderer/stories-coverage.test.mjs`) — couvre `CommandCard.stories.tsx` (story présente), **pas les tests fonctionnels du composant**.
- Aucun CI cloud (GAP-16 — seul le hook Husky pre-commit protège).

---

## GAPS À REMONTER (module commands — tests)

| # | Observation | Source |
|---|---|---|
| GAP-16 | Aucun test de rendu React pour `Commands.tsx` ni `CommandCard.tsx` ; pas de test IPC round-trip | `REVERSE_GAPS.md`, `vitest.config.mjs` |
| TC-CMD-06 | Garde `corps vide` de `saveCommand` non couverte par un TC — règle métier sans test de régression | `engine.ts:244`, `commands.handlers.test.mjs` |
| TC-CMD-07 | Garde anti path-traversal de `saveCommand` non couverte dans la suite `commands` — corrigée en `4ce7095` sans TC de régression dédié | `engine.ts:194-196`, commit `4ce7095` |
