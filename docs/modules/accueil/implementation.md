# Implémentation — Module : accueil

> Module : accueil · reverse (constat) · cartographié à `4ce7095`
> Rédigé en posture Lead Dev Module (reverse) : chaque assertion est tracée. Le code fait foi.
> Réfère le socle global : `docs/project/implementation.md` pour les conventions de build et d'IPC.

---

## Fichiers du module (constatés)

| Fichier | Rôle | Lignes clés |
|---|---|---|
| `src/renderer/pages/Dashboard.tsx` | Vue React d'accueil | `1-101` |
| `src/renderer/components/EditionRow.tsx` | Composant ligne d'édition | `1-18` |
| `src/main/ipc/dashboard.handlers.ts` | Enregistrement handlers IPC | `1-7` |
| `src/main/engine.ts` — `getDashboard` | Agrégation SOUL + éditions | `163-177` |
| `src/main/io/soul.io.ts` — `readSoul` | IO SOUL (lecture, parsing) | `33-41` |
| `src/main/io/editions.io.ts` — `listEditions` | IO éditions (scan `raw/notes`) | `21-39` |
| `src/renderer/store/app.store.ts` — slice dashboard | État Zustand | `40,65,97,121,139` |

---

## Contrat IPC `get-dashboard`

### Déclaration du canal

```typescript
// src/shared/types/ipc.ts
IPC.getDashboard = 'get-dashboard'
```

### Payload

- **Entrée :** aucune (invocation sans argument côté renderer).
- **Sortie :** `Dashboard` — vu `src/main/engine.ts:158-161`.

```typescript
interface Dashboard {
  soul: SoulSummary | null;
  editions: EditionSummary[];
}
```

### Handler (fichier:ligne)

```typescript
// src/main/ipc/dashboard.handlers.ts:4-5
export function registerDashboardHandlers(ipc: IpcLike, deps: EngineDeps): void {
  ipc.handle(IPC.getDashboard, () => getDashboard(deps));
  // ligne 6 : IPC.readEdition → module historique (GAP-M3)
}
```

Enregistré par `registerAllHandlers` — vu `src/main/ipc/index.ts:18-24`.

### Côté renderer (preload + store)

```typescript
// src/preload/index.ts:14
getDashboard: () => ipcRenderer.invoke(IPC.getDashboard),

// src/renderer/pages/Dashboard.tsx:17-19
useEffect(() => {
  void window.api.getDashboard().then(setDashboard);
}, [setDashboard]);
```

---

## Implémentation `getDashboard` (engine)

```typescript
// src/main/engine.ts:163-177
export function getDashboard(deps: EngineDeps): Dashboard {
  let soul: SoulSummary | null = null;
  try {
    soul = deps.readSoul(deps.repoDir);
  } catch {
    soul = null;  // SOUL absente ou repoDir invalide → null silencieux
  }
  let editions: EditionSummary[] = [];
  try {
    editions = deps.listEditions(deps.bbDir);
  } catch {
    editions = [];  // bbDir invalide ou raw/notes absent → [] silencieux
  }
  return { soul, editions };
}
```

**Points d'attention :**
- Fonction **synchrone** (FS bloquant). Acceptable pour un payload léger (< 4 éditions visibles en accueil, liste complète chargée).
- Chaque IO est isolé dans son propre `try/catch` : une SOUL absente n'empêche pas de charger les éditions, et vice-versa.
- `deps` injectable → testable sans Electron (voir `tests/main/engine.test.mjs:21-42`).

---

## Implémentation `readSoul`

```typescript
// src/main/io/soul.io.ts:33-41
export function readSoul(baseDir: string): SoulSummary {
  const md = readFileSync(join(baseDir, '.claude', 'breves-ia', 'SOUL.md'), 'utf8');
  const rules = [...section(md, 4).matchAll(/^-\s+(.+)$/gm)].map((m) => m[1].trim());
  const examples = [...section(md, 5).matchAll(…)].map(…);
  const lessons = datedLessons(section(md, 6));
  return { version: `v${lessons.length + 1}`, rules, examples, lessons };
}
```

- Chemin résolu : `{repoDir}/.claude/breves-ia/SOUL.md`.
- Si le fichier est absent ou illisible : `readFileSync` lève → capturé dans `getDashboard` → `soul = null`.
- **Versioning implicite :** `v{lessons.length + 1}` — GAP-05 (double calcul avec la commande archive).

---

## Implémentation `listEditions`

```typescript
// src/main/io/editions.io.ts:4,21-39
const EDITION_RE = /^(\d{4}-\d{2}-\d{2})-breves-ia-merim(?:-([a-z0-9-]+))?\.md$/;

export function listEditions(bbDir: string): EditionSummary[] {
  const dir = join(bbDir, 'raw', 'notes');
  let files: string[];
  try { files = readdirSync(dir); } catch { return []; }
  return files
    .map((file) => ({ file, m: file.match(EDITION_RE) }))
    .filter(…)
    .map(({ file, m }) => {
      const count = (md.match(/^—\s.+\s—$/gm) || []).length;
      return { file, date: m[1], range: date, count, corr: 0, title };  // corr toujours 0 — GAP-06
    })
    .sort((a, b) => (a.file < b.file ? 1 : …));  // tri DESC par nom de fichier
}
```

- **Regex de nommage :** `YYYY-MM-DD-breves-ia-merim(-slug)?.md` — vu `:4`.
- **Tri :** DESC par nom de fichier (l'ordre lexicographique du nom `YYYY-MM-DD-…` est équivalent à l'ordre chronologique inverse).
- **Count :** nb de lignes `— … —` dans le markdown (séparateur de brève) — vu `:36`.
- **`corr` :** hardcodé à `0` — GAP-06.

---

## Rendu `Dashboard.tsx` (points structurants)

| Section | Ce qui est rendu | Trace |
|---|---|---|
| En-tête | `dateLong(new Date()…)` + `Bonjour Pierre.` + sous-titre | `Dashboard.tsx:23-33` |
| CTA Nouvelle édition | `Button variant="cta"` → `go('goCompose')` | `Dashboard.tsx:35-51` |
| Carte dernière édition | date + count + corr de `editions[0]` | `Dashboard.tsx:53-73` |
| Lien Historique | `voir l'historique →` → `go('goHist')` | `Dashboard.tsx:77-90` |
| Liste éditions récentes | `editions.slice(0, 4)` via `EditionRow` → `openReader` | `Dashboard.tsx:92-97` |
| État vide | `Text tone="faint"` si `editions.length === 0` | `Dashboard.tsx:93` |

> `dashboard?.soul` est accessible dans le composant via le store mais **aucun rendu de la SOUL n'est présent dans `Dashboard.tsx`** (GAP-M1).

---

## Contraintes constatées

| Contrainte | Trace | Impact |
|---|---|---|
| `corr` toujours `0` | `editions.io.ts:37` | GAP-06 — valeur affichée est un placeholder |
| État vide silencieux si `bbDir` invalide | `engine.ts:170-175` | GAP-17 — aucun onboarding, état cassé invisible |
| `soul` agrégée, non rendue | `Dashboard.tsx:1-101` | GAP-M1 — payload inutilisé côté renderer accueil |
| `readEdition` dans le même handler | `dashboard.handlers.ts:6` | GAP-M3 — frontière de module non reflétée |
| Message d'accueil en dur (`Bonjour Pierre.`) | `Dashboard.tsx:31` | Non configurable, couplé au persona unique |
| Chargement état initial `null` | `app.store.ts:97` | Pas de skeleton/spinner : rendu direct avec `dashboard?.editions ?? []` |

---

## GAPS À REMONTER (module accueil — implémentation)

| # | Observation | Source |
|---|---|---|
| GAP-06 | `corr: 0` hardcodé dans `listEditions` — le champ est prévu mais jamais calculé | `editions.io.ts:37` |
| GAP-17 | Aucun état d'erreur/onboarding exposé si `bbDir`/`repoDir` invalides au 1er lancement | `engine.ts:163-177` |
| GAP-M1 | `soul` présente dans le payload `Dashboard` et dans le store, mais non rendue dans `Dashboard.tsx` | `Dashboard.tsx` |
| GAP-M3 | `registerDashboardHandlers` contient `read-edition` qui relève du module historique | `dashboard.handlers.ts:6` |
