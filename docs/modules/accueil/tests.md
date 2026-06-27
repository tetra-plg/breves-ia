# Plan de tests — Module : accueil

> Module : accueil · reverse (constat) · cartographié à `4ce7095`
> Rédigé en posture QA Module (reverse) : chaque assertion est tracée. Réfère la stratégie globale : `docs/project/tests.md`.

---

## Couverture existante (constatée)

### TC-ACC-01 — `getDashboard` agrège SOUL + éditions (nominal)

**Fichier :** `tests/main/engine.test.mjs:21-31`  
**Niveau :** unitaire (Node/Vitest, deps injectées)

```
test('getDashboard agrège soul + editions')
  deps.readSoul → { version: 'v8', rules: ['r'], … }
  deps.listEditions → [{ date: '2026-06-17', count: 3, corr: 0, file: 'f' }]
  → d.soul.version === 'v8'
  → d.editions.length === 1
```

**Statut :** PASSE (vu dans la suite vitest, pre-commit hook vert à `4ce7095`).

---

### TC-ACC-02 — `getDashboard` tolère une SOUL absente

**Fichier :** `tests/main/engine.test.mjs:32-42`  
**Niveau :** unitaire

```
test('getDashboard tolère une SOUL absente')
  deps.readSoul → throw Error('ENOENT')
  deps.listEditions → []
  → d.soul === null
  → d.editions deepEqual []
```

**Statut :** PASSE.

---

### TC-ACC-03 — `listEditions` liste triée + count des blocs date

**Fichier :** `tests/main/editions-io.test.mjs:9-19`  
**Niveau :** intégration FS (tmpdir)

```
test('liste triée + count des blocs date')
  2 fichiers copiés (fixtures/note.sample.md)
  → eds.length === 2
  → eds[0].date === '2026-06-17'  (plus récent d'abord)
  → eds[0].count === 2
```

**Statut :** PASSE.

---

### TC-ACC-04 — `listEditions` gère les noms suffixés (multiple editions même jour)

**Fichier :** `tests/main/editions-io.test.mjs:20-31`  
**Niveau :** intégration FS

```
test('plusieurs éditions le même jour (noms suffixés) sont toutes listées + titre')
  → eds.length === 2
  → titres.sort() deepEqual ['', 'Ai act omnibus']
```

**Statut :** PASSE.

---

### TC-ACC-05 — `listEditions` renvoie [] si répertoire absent

**Fichier :** `tests/main/editions-io.test.mjs:32-35`  
**Niveau :** unitaire FS

```
test('répertoire absent => []')
  → listEditions(bb) deepEqual []
```

**Statut :** PASSE.

---

## Couverture manquante (constatée)

### TC-ACC-06 — `getDashboard` tolère un `bbDir` invalide (éditions absentes)

**Statut :** NON TESTÉ explicitement pour le cas `bbDir` invalide (seul le cas `listEditions → []` est testé via mock). Le test `TC-ACC-05` couvre `raw/notes` absent mais pas `bbDir` lui-même inexistant.  
**Priorité :** basse (comportement couvert implicitement par TC-ACC-02 + TC-ACC-05).

---

### TC-ACC-07 — Rendu `Dashboard.tsx` (composant React)

**Statut :** NON TESTÉ — GAP-16. `Dashboard.tsx` est une page React, aucun test de rendu React (RTL/Vitest browser) n'existe dans le projet (`vitest.config.mjs` en env `node`, pas de tests de pages).  
**Scénarios manquants :**
- Rendu état initial (`dashboard = null`) : CTA visible, liste vide.
- Rendu nominal (1+ éditions) : `EditionRow` rendu pour les 4 premiers items.
- Rendu état vide (`editions = []`) : message `Aucune édition archivée`.
- Clic CTA → `go('goCompose')` appelé.
- Clic `voir l'historique →` → `go('goHist')` appelé.
- Clic `EditionRow` → `openReader(edition, 'dashboard')` appelé.

**Raison :** absence de setup de test renderer (env node, pas de jsdom configuré). À adresser en accompagnement de GAP-16.

---

### TC-ACC-08 — `EditionRow.tsx` (composant pur)

**Statut :** NON TESTÉ directement. Composant pur sans logique : le `onClick` délègue à `onOpen`. Couverture implicite attendue dans TC-ACC-07.

---

### TC-ACC-09 — `window.api.getDashboard` (preload / IPC round-trip)

**Statut :** NON TESTÉ (pas de test d'intégration Electron IPC dans la suite). Le contrat preload est validé uniquement par le typecheck TypeScript.

---

### TC-ACC-10 — Affichage de `corr` sur l'UI (GAP-06)

**Statut :** Aucun test ne vérifie que `corr` est calculé (il est toujours `0` — GAP-06). Un test de régression sur la valeur affichée dans `EditionRow` révélerait l'état placeholder.

---

## Matrice de couverture module

| Composant / fonction | Testé | Fichier test | GAP |
|---|---|---|---|
| `getDashboard` nominal | OUI | `engine.test.mjs:21-31` | — |
| `getDashboard` SOUL absente | OUI | `engine.test.mjs:32-42` | — |
| `listEditions` nominal + tri | OUI | `editions-io.test.mjs:9-19` | — |
| `listEditions` noms suffixés | OUI | `editions-io.test.mjs:20-31` | — |
| `listEditions` dir absent | OUI | `editions-io.test.mjs:32-35` | — |
| `readSoul` (module soul, utilisé par getDashboard) | OUI | `soul-io.test.mjs` | — |
| `Dashboard.tsx` (React) | NON | — | GAP-16 |
| `EditionRow.tsx` (React) | NON | — | GAP-16 |
| Preload `getDashboard` IPC | NON | — | GAP-16 |
| Calcul `corr` | NON | — | GAP-06 |

---

## Stratégie de tests (réfère socle)

Voir `docs/project/tests.md` pour :
- Stratégie globale (unitaire → intégration FS → pre-commit hook).
- Convention de nommage `.test.mjs`, runner Vitest env `node`.
- Invariant de couverture Storybook (`tests/renderer/stories-coverage.test.mjs`) — ne couvre **pas** les pages, uniquement les primitives UI.
- Aucun CI cloud (GAP-16 — seul le hook Husky pre-commit protège).

---

## GAPS À REMONTER (module accueil — tests)

| # | Observation | Source |
|---|---|---|
| GAP-06 | Aucun test ne vérifie le calcul (ou l'absence de calcul) de `corr` — champ toujours `0` | `editions-io.test.mjs`, `editions.io.ts:37` |
| GAP-16 | Aucun test de rendu React pour `Dashboard.tsx` ni `EditionRow.tsx` ; pas de test IPC round-trip | `REVERSE_GAPS.md`, `vitest.config.mjs` |
