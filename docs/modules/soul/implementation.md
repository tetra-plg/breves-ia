# Module soul — Implémentation

> Module : soul · reverse (constat) · cartographié à `4ce7095`
> Rédigé en posture Lead Dev Module override reverse. Chaque assertion est tracée. Le code fait foi.
> Réfère le socle : `docs/project/implementation.md` (IPC invoke/handle, `ApiResult`, patterns transversaux).

---

## Contrats IPC (3 canaux)

### Canal `get-soul-structured`

| Attribut | Valeur |
|---|---|
| Clé enum | `IPC.getSoulStructured` (`src/shared/types/ipc.ts:7`) |
| Fil | `soul.handlers.ts:6` → `getSoul(deps)` `engine.ts:84` |
| Entrée | aucune |
| Sortie | `Soul \| null` |

**Handler** (`soul.handlers.ts:6`) :
```typescript
ipc.handle(IPC.getSoulStructured, () => getSoul(deps));
```

**Implémentation engine** (`engine.ts:84-90`) :
```typescript
export function getSoul(deps: EngineDeps): Soul | null {
  try {
    return parseSoul(deps.readFile(join(deps.repoDir, ...SOUL_PARTS)));
  } catch {
    return null;
  }
}
```
Chemin résolu : `{repoDir}/.claude/breves-ia/SOUL.md` (constante `SOUL_PARTS` `engine.ts:25`).
Retourne `null` si le fichier est absent ou illisible (aucune exception levée côté IPC).

**Côté renderer** (`Soul.tsx:40-43`) :
```typescript
void window.api.getSoulStructured().then((s) => {
  if (s) useAppStore.getState().loadSoul(s);
  else useAppStore.getState().showToast('SOUL introuvable.');
});
```
Pattern run-once via `loaded = useRef(false)` + guard `echKeepLocal` (`Soul.tsx:29-44`). Pas de React Query.

---

### Canal `save-soul-sections`

| Attribut | Valeur |
|---|---|
| Clé enum | `IPC.saveSoulSections` (`ipc.ts:8`) |
| Fil | `soul.handlers.ts:7` → `saveSoulSections(deps, edits)` `engine.ts:92` |
| Entrée | `SoulSectionEdits` : `{quiParle, audience, voix, lignesRouges}` (tous `string`) |
| Sortie | `{ok: boolean; error?: string}` (`SaveResult`) |

**Handler** (`soul.handlers.ts:7`) :
```typescript
ipc.handle(IPC.saveSoulSections, (_e, edits: unknown) =>
  saveSoulSections(deps, edits as SoulSectionEdits));
```

**Implémentation engine** (`engine.ts:92-104`) — validations dans l'ordre :
1. Chaque champ `['quiParle','audience','voix','lignesRouges']` doit être `string` non vide après `trim()`.
   Si non → `{ok: false, error: '<key> vide'}` **sans écriture**.
2. `readFile(SOUL.md)` → `replaceSoulSections(raw, edits)` → `writeFile(SOUL.md, résultat)`.
3. Erreur I/O → `{ok: false, error: message}`.
4. Succès → `{ok: true}`.

**Format de sérialisation §1-4** (vu `replaceSoulSections` `soul.ts:102-120`) :

Après remplacement, chaque section produit :
```
## N. Titre
<nouvelle valeur>

```
(titre conservé tel quel, valeur remplacée, suivi de deux `\n`). §5 et §6 sont préservés **bit à bit** — garantie confirmée par `tests/domain/soul.test.mjs:40-52`.

**Côté renderer** (`Soul.tsx:46-66`) — validation UI préalable :
- Les 4 champs `trim()` doivent être non vides ; sinon toast sans appel IPC (`Soul.tsx:54-56`).
- Après `{ok: true}` : toast + rechargement dashboard via `getDashboard()`.

---

### Canal `save-soul-echantillons`

| Attribut | Valeur |
|---|---|
| Clé enum | `IPC.saveSoulEchantillons` (`ipc.ts:9`) |
| Fil | `soul.handlers.ts:8` → `saveSoulEchantillons(deps, entries)` `engine.ts:106` |
| Entrée | `Echantillon[]` (tableau, longueur ≤ 3) |
| Sortie | `{ok: boolean; error?: string}` |

**Handler** (`soul.handlers.ts:8`) :
```typescript
ipc.handle(IPC.saveSoulEchantillons, (_e, entries: unknown) =>
  saveSoulEchantillons(deps, entries as Echantillon[]));
```

**Implémentation engine** (`engine.ts:106-118`) — validations dans l'ordre :
1. `!Array.isArray(entries) || entries.length > 3` → `{ok: false, error: 'max 3 échantillons'}`.
2. Un `entry.texte` non-string ou vide après trim → `{ok: false, error: 'échantillon vide'}`.
3. `readFile(SOUL.md)` → `replaceSoulEchantillons(raw, entries)` → `writeFile`.
4. Erreur I/O → `{ok: false, error: message}`.

**Format de sérialisation §5** (vu `serializeEchantillons` `soul.ts:80-86`) :

```
> Jusqu'à 3 brèves validées, choisies à la main, verbatim. Elles donnent le ton...

### [YYYY-MM-DD] · <source>
<texte>

### [YYYY-MM-DD]
<texte>         ← source omise si vide
```

Cap appliqué côté domaine : `.slice(0, 3)` avant sérialisation (`soul.ts:81`).
§1-4 et §6 préservés bit à bit — garantie : `tests/domain/soul.test.mjs:89-100`.

**Côté renderer** (`Soul.tsx:68-71`) — aucune validation UI spécifique (le plafond est géré par le store) :
```typescript
async function saveEchantillons(): Promise<void> {
  const r = await window.api.saveSoulEchantillons(useAppStore.getState().echantillons);
  showToast(r.ok ? 'Échantillons §5 enregistrés' : 'Échec : ' + (r.error ?? 'inconnu'));
}
```

---

## Domaine pur (`src/domain/soul.ts`)

### `parseSoul(raw: string): Soul` (`soul.ts:63`)

Appelle successivement :
- `sectionBody(raw, n)` (`soul.ts:29`) — split sur `^## ` puis cherche le bloc dont la première ligne commence par `^n\.` ; retourne le corps après le premier `\n`.
- `parseEchantillons(body5)` (`soul.ts:39`) — split sur `^### ` (`.slice(1)` pour sauter avant le 1er header), extrait `date` (`/^\[(\d{4}-\d{2}-\d{2})\]/`), `source` (`/·\s*(.+?)\s*$/`), `texte` (après `\n`).
- `parseJournal(body6)` (`soul.ts:56`) — `matchAll(/^-\s*\[(\d{4}-\d{2}-\d{2})\]\s*(.+)$/gm)`.
- Version = `` `v${journal.length + 1}` `` (`soul.ts:67`).

**Tolérance format :** l'ancien format d'échantillon (sans `· source` dans le header) produit `source: ''` — testé `tests/domain/soul.test.mjs:69-76`.

### `replaceSoulSections(raw, edits)` (`soul.ts:102`)

Split sur `/(^##\s+)/m` (séparateur capturant). Itère par paires `(separateur, block)`. Identifie §1-4 par regex `block.match(/^(\d)\./)`. Conserve `titleLine` (tout avant le premier `\n`) et remplace le corps. Les blocs §5 et §6 ne matchent pas `fields[m[1]]` → inchangés.

### `replaceSoulEchantillons(raw, entries)` (`soul.ts:88`)

Même mécanique de split. Identifie le bloc §5 par `/^5\./`. Conserve `titleLine`, remplace le corps par `serializeEchantillons(entries)`.

### `serializeEchantillons(entries)` (`soul.ts:80`)

Produit le préambule fixe `ECH_PREAMBULE` (`soul.ts:77-79`) + les entrées formattées. Applique `.slice(0, 3)` (cap dur).

---

## Contraintes et edge cases

| Contrainte | Valeur | Localisation |
|---|---|---|
| Plafond §5 | 3 échantillons max — double garde store + engine | `app.store.ts:154`, `engine.ts:107` |
| Champs §1-4 non vides | `trim()` requis côté UI et engine | `Soul.tsx:54`, `engine.ts:93-95` |
| texte échantillon non vide | `typeof e?.texte !== 'string' \|\| !e.texte.trim()` | `engine.ts:108-110` |
| Format date échantillon | Extrait par regex `\[(\d{4}-\d{2}-\d{2})\]` — aucune validation à l'écriture | `soul.ts:48` |
| Anti-rechargement sous-flux | `echKeepLocal` flag dans le store — guard run-once | `Soul.tsx:36-38`, `app.store.ts:111` |
| §5 jamais modifié par archivage | `breves-archive.md` écrit uniquement §6 ; `replaceSoulEchantillons` non appelée hors `saveSoulEchantillons` | `engine.ts:106-118`, `_REVERSE_MAP.md §4.3` |

---

## Pattern de chargement (run-once + guard)

Pas de React Query, pas de `useEffect` avec dépendances dynamiques. Le pattern constaté dans `Soul.tsx:29-44` :

```typescript
const loaded = useRef(false);
useEffect(() => {
  if (loaded.current) return;
  loaded.current = true;
  const st = useAppStore.getState();
  if (st.echKeepLocal) {
    st.setEchKeepLocal(false);
    return;           // retour sous-flux : préserve echantillons locaux
  }
  void window.api.getSoulStructured().then((s) => { … });
}, []);
```

Ce pattern est partagé avec d'autres pages (`Editor.tsx`, `Agents.tsx`) — documenté dans le socle.

---

## `window.api` — méthodes utilisées par le module

| Méthode | Canal IPC | Trace preload |
|---|---|---|
| `getSoulStructured()` | `get-soul-structured` | `src/preload/index.ts:23` |
| `saveSoulSections(edits)` | `save-soul-sections` | `src/preload/index.ts:24` |
| `saveSoulEchantillons(entries)` | `save-soul-echantillons` | `src/preload/index.ts:25` |
| `readEdition(file)` | `read-edition` | `src/preload/index.ts:17` (partagé avec historique) |
| `getDashboard()` | `get-dashboard` | `src/preload/index.ts:15` (partagé avec accueil) |

---

## GAPS À REMONTER (implémentation)

| # | Observation | Localisation |
|---|---|---|
| GAP-S3 (réf) | Pas de sauvegarde automatique après ajout sous-flux — risque de perte si l'utilisateur quitte la vue `soul` sans cliquer « Enregistrer §5 » | `EchBreves.tsx:48`, `Soul.tsx:114` |
| GAP-S5 | `saveSoulSections` côté renderer recharge le dashboard (`getDashboard()`) après chaque save §1-4 mais `saveSoulEchantillons` ne le fait pas — les résumés §5 dans le dashboard pourraient être périmés | `Soul.tsx:64-65` vs `Soul.tsx:68-71` |
