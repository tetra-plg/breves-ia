# Plan de tests — module historique

> Module : historique · reverse (constat) · cartographié à `4ce7095`
> Framework : **reverse (constat)**. Chaque assertion est tracée (`fichier:ligne`). Le code fait foi.
> Réfère la stratégie globale : `docs/project/implementation.md` (Vitest, Node env, 54 fichiers `.test.mjs`, hook pre-commit).

---

## Couverture constatée (HEAD `4ce7095`)

| Fichier de test | Portée | Nb de TC | Statut |
|---|---|---|---|
| `tests/domain/edition-render.test.mjs` | `renderEditionHtml` | 10 | Existant |
| `tests/domain/edition-breves.test.mjs` | `extractBreves` | 3 | Existant |
| `tests/main/editions-io.test.mjs` | `listEditions` | 3 | Existant |
| `tests/main/engine.test.mjs` (lignes 43-57) | `readEdition` engine | 3 | Existant |
| `tests/main/readonly.handlers.test.mjs` (TC1 partiel) | handler `read-edition` routing | 1 (partagé) | Existant |
| `tests/renderer/app.store.reader.test.mjs` | slices store reader | 3 | Existant |
| Pages React (`History.tsx`, `Reader.tsx`) | — | 0 | Non couvert (réf. GAP-16) |
| `HistoryRow`, `EditionRow` | — | 0 | Non couvert (réf. GAP-16) |

**Total TC tracés pour ce module : 23** (dont 1 partagé avec accueil).

---

## Cas de test tracés

### TC-R01 à TC-R10 — `renderEditionHtml` (`tests/domain/edition-render.test.mjs`)

| TC | Description | Trace |
|---|---|---|
| TC-R01 | Titre et intro détectés | `edition-render.test.mjs:16-20` |
| TC-R02 | `Source : <url>` devient un lien `ed-src` avec `data-url` + domaine | `:21-24` |
| TC-R03 | Titre `##` et séparateur `---` → `ed-h2` + `ed-hr` | `:25-29` |
| TC-R04 | Tableau Markdown → `ed-srclist` + `ed-srcrow` (avec lien, `ed-srcsubj`, `ed-srcnote`) | `:30-44` |
| TC-R05 | Chaque `— … —` produit un `ed-date` (compte = nb de dates) | `:45-49` |
| TC-R06 | Plusieurs brèves sous la même date → une carte `ed-breve`, un séparateur `ed-bsep` | `:50-62` |
| TC-R07 | Chaque date ouvre une carte `card ed-breve` (date + corps + lien inclus) | `:63-68` |
| TC-R08 | Accroche en `**gras**` → `<strong>` | `:69-71` |
| TC-R09 | Texte débutant par une date sans titre → pas de `ed-title` parasite | `:72-77` |
| TC-R10 | Entrée vide ou non-string → `''` sans exception | `:87-91` |

**TC supplémentaire constaté :**

| TC | Description | Trace |
|---|---|---|
| TC-R11 | URL nue → lien `ed-src` avec domaine | `:78-80` |
| TC-R12 | HTML dans le corps échappé (`< >` → `&lt; &gt;`) | `:81-83` |
| TC-R13 | Préfixe `#` du titre retiré | `:84-86` |

---

### TC-B01 à TC-B03 — `extractBreves` (`tests/domain/edition-breves.test.mjs`)

| TC | Description | Trace |
|---|---|---|
| TC-B01 | Extrait une brève par accroche `**…**`, avec date/source/accroche/texte corrects | `edition-breves.test.mjs:24-34` |
| TC-B02 | Titre, intro et bloc Sources ne sont pas des brèves | `:35-39` |
| TC-B03 | Entrée vide ou non-string → `[]` sans exception | `:40-43` |

---

### TC-IO01 à TC-IO03 — `listEditions` (`tests/main/editions-io.test.mjs`)

| TC | Description | Trace |
|---|---|---|
| TC-IO01 | Liste triée (plus récente d'abord) + comptage des blocs date | `editions-io.test.mjs:9-18` |
| TC-IO02 | Plusieurs éditions le même jour (noms suffixés) : toutes listées + titre extrait du slug | `:20-31` |
| TC-IO03 | Répertoire absent → `[]` sans crash | `:32-35` |

---

### TC-E01 à TC-E03 — `readEdition` engine (`tests/main/engine.test.mjs`)

| TC | Description | Trace |
|---|---|---|
| TC-E01 | Fichier valide → lit au bon chemin `bbDir/raw/notes/<file>` | `engine.test.mjs:43-48` |
| TC-E02 | Nom hors motif (traversal `../../etc/passwd`, extension incorrecte `autre.md`) → `null` | `:49-53` |
| TC-E03 | Lecture échoue (exception `ENOENT`) → `null` sans propagation | `:54-57` |

---

### TC-H01 (partagé) — handler `read-edition` (`tests/main/readonly.handlers.test.mjs`)

| TC | Description | Trace |
|---|---|---|
| TC-H01 | Handler `read-edition` route vers `readEdition(deps, file)` et retourne le texte lu | `readonly.handlers.test.mjs:16-17` |

---

### TC-S01 à TC-S03 — slices store reader (`tests/renderer/app.store.reader.test.mjs`)

| TC | Description | Trace |
|---|---|---|
| TC-S01 | `openReader(ed, 'history')` → mémorise `readerEdition`, `returnTo='history'`, vide `readerText`, fixe `view='reader'` | `app.store.reader.test.mjs:8-15` |
| TC-S02 | `setReaderText(t)` → met à jour `readerText` | `:17-20` |
| TC-S03 | `openReader(ed, 'dashboard')` → `returnTo='dashboard'`, `view='reader'` | `:21-25` |

---

## Matrice couverture vs user stories

| User story | TC existants | Lacunes |
|---|---|---|
| US-H1 Parcourir l'historique | TC-IO01, TC-IO02, TC-IO03 | Rendu de `HistoryRow`, état vide UI (réf. GAP-16) |
| US-H2 Ouvrir une édition dans le lecteur | TC-E01..03, TC-H01, TC-S01..03, TC-R01..13 | Comportement `Reader.tsx` au montage (redirect si null, état chargement), `dangerouslySetInnerHTML` |
| US-H3 Copier le texte | — | Aucun test de `window.api.copy` dans ce module (réf. GAP-16) |
| US-H4 Retour contextuel | TC-S01, TC-S03 (returnTo) | Logique Shell `back()` non testée unitairement |

---

## Règles métier testées

| Règle | TC couvrant | Statut |
|---|---|---|
| RM-H1 Regex EDITION_RE filtre les fichiers | TC-IO01, TC-IO02 | Couvert |
| RM-H2 Répertoire absent → `[]` | TC-IO03 | Couvert |
| RM-H3 Anti-traversal sur `read-edition` | TC-E02 | Couvert |
| Tri décroissant (plus récent d'abord) | TC-IO01 | Couvert |
| `corr` toujours `0` | — (dead-code documenté) | Non testé (réf. GAP-06) |

---

## Lacunes identifiées (non couvertes à HEAD)

| # | Lacune | Type | Priorité |
|---|---|---|---|
| L-H01 | `History.tsx` et `Reader.tsx` non testés (montage, états, effets) | Page React | Moyenne (réf. GAP-16) |
| L-H02 | `HistoryRow.tsx` non testé unitairement (rendu, callback `onOpen`) | Composant | Faible |
| L-H03 | Copie (`window.api.copy` + toast) non testée | Intégration IPC | Faible |
| L-H04 | Logique de retour Shell (`back()`) non testée | Comportement Shell | Faible |
| L-H05 | `renderEditionHtml` : `"` et `'` non échappés dans attributs (`srcLink`) non testé | Sécurité | Faible (réf. GAP-14) |
| L-H06 | `readerEdition = null` au montage → redirect `history` non testé | Edge-case Reader | Faible |

---

## Exécution des tests (commandes)

```bash
# Tous les tests du module (domaine + IO + engine + store)
npx vitest run tests/domain/edition-render.test.mjs
npx vitest run tests/domain/edition-breves.test.mjs
npx vitest run tests/main/editions-io.test.mjs
npx vitest run tests/main/engine.test.mjs
npx vitest run tests/main/readonly.handlers.test.mjs
npx vitest run tests/renderer/app.store.reader.test.mjs

# Ou en une passe (tous les tests du dépôt, couvre le module) :
npm test
```

Aucun seuil de couverture configuré (`vitest.config.mjs`) — réf. GAP-16.

---

## GAPS À REMONTER (scope tests)

- **GAP-16** — Pages React (`History`, `Reader`) et composants (`HistoryRow`) non testés. Aucune CI cloud, aucun seuil de couverture.
- **GAP-06** — `corr: 0` non testé (ni positif ni négatif) : valeur dead-code affichée dans l'UI.
- **GAP-14** — Absence de test vérifiant que les guillemets `"` sont échappés dans les attributs `data-url` générés par `srcLink`.
