# Implémentation — module historique

> Module : historique · reverse (constat) · cartographié à `4ce7095`
> Framework : **reverse (constat)**. Chaque assertion est tracée (`fichier:ligne`). Le code fait foi.
> Réfère le socle : `docs/project/implementation.md` pour les conventions de couche, les alias, le build.

---

## Inventaire des artefacts (constatés)

| Couche | Fichier | Rôle |
|---|---|---|
| Renderer / Page | `src/renderer/pages/History.tsx` | Liste des éditions archivées |
| Renderer / Page | `src/renderer/pages/Reader.tsx` | Lecteur d'une édition (HTML) + copie |
| Renderer / Composant | `src/renderer/components/HistoryRow.tsx` | Carte cliquable d'une édition dans la liste |
| Renderer / Composant | `src/renderer/components/EditionRow.tsx` | Variante légère (usagée dans soul, hors périmètre direct) |
| Renderer / Stories | `src/renderer/components/HistoryRow.stories.tsx` | Vitrine Storybook |
| Renderer / Stories | `src/renderer/components/EditionRow.stories.tsx` | Vitrine Storybook |
| Store | `src/renderer/store/app.store.ts` (slices reader*) | État global : `readerEdition`, `readerText`, `returnTo` |
| Main / Handler | `src/main/ipc/dashboard.handlers.ts` | Enregistre `get-dashboard` + `read-edition` |
| Main / Engine | `src/main/engine.ts:121-128` | `readEdition` : validation regex + lecture fichier |
| Main / IO | `src/main/io/editions.io.ts` | `listEditions` : scan `bbDir/raw/notes` |
| Domain | `src/domain/edition.ts:25-110` | `renderEditionHtml` : parseur markdown → HTML |
| Domain | `src/domain/edition.ts:144-190` | `extractBreves` : extraction des brèves (usage soul) |
| Domain | `src/domain/format.ts:20-23` | `dateLong` : date ISO → format FR long |
| Preload | `src/preload/index.ts:15` | Expose `window.api.readEdition` |

---

## Contrat IPC `read-edition`

**Canal :** `IPC.readEdition = 'read-edition'` (`src/shared/types/ipc.ts:5`)

**Signature handler :** `(_e, file: unknown) => readEdition(deps, String(file))` (`src/main/ipc/dashboard.handlers.ts:6`)

**Entrée :** `file` — nom de fichier brut (string). Le handler coerce en `String` avant de passer au moteur.

**Sortie :** `string | null`
- `string` — contenu markdown brut du fichier si valide et lisible.
- `null` — si le nom ne correspond pas à la regex anti-traversal, ou si la lecture du fichier échoue (exception `fs.readFileSync`).

**Validation anti-traversal (constatée) :** `src/main/engine.ts:122`
```
/^\d{4}-\d{2}-\d{2}-breves-ia-merim(-[a-z0-9-]+)?\.md$/
```
Tout `file` ne correspondant pas → retour `null` immédiat, sans accès disque.

**Implémentation engine :** `src/main/engine.ts:121-128`
```typescript
export function readEdition(deps: EngineDeps, file: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}-breves-ia-merim(-[a-z0-9-]+)?\.md$/.test(String(file))) return null;
  try {
    return deps.readFile(join(deps.bbDir, 'raw', 'notes', file));
  } catch {
    return null;
  }
}
```
`deps.readFile` est injecté (testable via stub) — jamais appelé directement avec `fs`.

**Accès preload :** `src/preload/index.ts:15`
```typescript
readEdition: (file) => ipcRenderer.invoke(IPC.readEdition, file),
```

---

## Contrat IPC `get-dashboard` (partagé avec accueil)

`read-edition` est enregistré dans le même handler que `get-dashboard` (`dashboard.handlers.ts:5-6`). La liste des éditions (`EditionSummary[]`) est produite par `listEditions` et exposée comme sous-champ de la réponse `get-dashboard` (`engine.getDashboard`). Le module historique **consomme** cette liste depuis `store.dashboard.editions` sans déclencher lui-même `get-dashboard`.

---

## `listEditions` — IO scan

**Fichier :** `src/main/io/editions.io.ts:21-40`

**Logique :**
1. `readdirSync(join(bbDir, 'raw', 'notes'))` — si le répertoire est absent, `catch` → `return []`.
2. Filtre par `EDITION_RE` (`/^(\d{4}-\d{2}-\d{2})-breves-ia-merim(?:-([a-z0-9-]+))?\.md$/`).
3. Pour chaque fichier valide : lit le contenu, compte les blocs `— … —` via `/^—\s.+\s—$/gm`, extrait le titre depuis le groupe 2 (slug humanisé).
4. Trie décroissant par nom de fichier (lexicographique → chronologique inverse car `YYYY-MM-DD`).
5. Retourne `EditionSummary[]` avec `corr: 0` hardcodé (réf. GAP-06).

**Contrainte :** synchrone (`readdirSync`, `readFileSync`) — appelé dans le handler `get-dashboard` au clic, pas en background. Acceptable pour des volumes faibles (app mono-utilisateur locale).

---

## `renderEditionHtml` — rendu local

**Fichier :** `src/domain/edition.ts:25-110`

Parseur ligne-à-ligne (pas de bibliothèque tiers). Machines à états :
- `titleDone` / `firstDateSeen` — contrôlent les transitions intro → brèves.
- `cardOpen` / `breveStarted` — contrôlent l'ouverture/fermeture des `div.card.ed-breve` et les séparateurs inter-brèves.

Le HTML produit est injecté via `dangerouslySetInnerHTML` (`Reader.tsx:53`). **Aucune sanitisation supplémentaire** n'est effectuée entre `renderEditionHtml` et l'injection. Réf. GAP-14 (`escapeHtml` n'échappe pas `"` ni `'`), GAP-12 (absence de CSP).

**Impact :** contenu semi-fiable (éditions produites par le propre SDK de Pierre) ; sévérité basse en contexte local. À surveiller si la source des fichiers `raw/notes` devenait externe.

---

## Slices store (renderer)

**Fichier :** `src/renderer/store/app.store.ts`

| Slice | Ligne | Type | Valeur initiale |
|---|---|---|---|
| `readerText` | `:47,:104` | `string` | `''` |
| `readerEdition` | `:48,:105` | `EditionSummary \| null` | `null` |
| `returnTo` | `:59,:116` | `string \| null` | `null` |

**Actions :**
- `openReader(edition, from)` `:139` — set atomique `{readerEdition, returnTo: from, readerText: '', view: 'reader'}`.
- `setReaderText(t)` `:138` — met à jour `readerText` seul.
- `setReturnTo(v)` `:157` — setter isolé (non utilisé par le module historique directement).

---

## Navigation retour — Shell

**Fichier :** `src/renderer/layouts/Shell.tsx:25-36`

```typescript
const back = (): void => {
  if (view === 'detail' || view === 'reader') {
    setView(returnTo ?? 'dashboard');
  } else if (view === 'ech-breves') { ... }
  ...
};
```

Le module historique ne contrôle pas ce code — c'est le **socle** (Shell) qui gère le retour. `returnTo` est le seul point de couplage.

---

## Contraintes d'implémentation

| Contrainte | Source | Valeur |
|---|---|---|
| `bbDir` requis | `env.ts:20` | Défaut `/Users/pleguern/Workspace/BoilingBrain` — réf. GAP-01 |
| Regex en double | `editions.io.ts:4` vs `engine.ts:122` | Non synchronisée — réf. GAP-07 |
| `corr` non calculé | `editions.io.ts:37` | Toujours `0` — réf. GAP-06 |
| XSS échappement partiel | `format.ts:3-5` | `"` et `'` non échappés — réf. GAP-14 |
| `dangerouslySetInnerHTML` | `Reader.tsx:53` | Pas de sanitisation intermédiaire |
| Vue `reader` hors-FLOW | `navigation.ts`, `App.tsx` | Atteinte par `setView` direct — réf. GAP-04 |

---

## Points d'extension constatés (non implémentés)

- **`corr` (corrections)** : le champ `EditionSummary.corr` est structurellement présent et affiché dans `HistoryRow` mais jamais calculé. Extension naturelle : compter les corrections de rédaction associées à chaque édition.
- **Pagination / filtre** : aucun mécanisme de pagination ou de recherche dans la liste. Acceptable pour les volumes actuels (nb d'éditions faible).

---

## GAPS À REMONTER (scope implémentation)

- **GAP-06** — `EditionSummary.corr` toujours `0` (`editions.io.ts:37`). Dead-code partiel.
- **GAP-07** — Regex de validation dupliquée (`editions.io.ts:4` vs `engine.ts:122`). Risque de drift.
- **GAP-14** — `escapeHtml` n'échappe pas `"` ni `'` (`format.ts:3-5`). Sévérité basse (local semi-fiable).
- **GAP-04** — Vue `reader` hors-`VIEWS`/`FLOW`, naviguée uniquement par `openReader`.
