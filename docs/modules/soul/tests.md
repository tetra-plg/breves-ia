# Module soul — Plan de tests

> Module : soul · reverse (constat) · cartographié à `4ce7095`
> Rédigé en posture QA Module override reverse. Chaque TC est tracé à un test réel existant.
> Réfère la stratégie globale : `docs/project/tests.md`.

---

## Couverture constatée

| Couche | Fichier de test | TC tracés | Statut |
|---|---|---|---|
| Domaine pur | `tests/domain/soul.test.mjs` | TC-D1 à TC-D8 | existants |
| IO Main | `tests/main/soul-io.test.mjs` | TC-IO1 à TC-IO2 | existants |
| Engine | `tests/main/engine.test.mjs` | TC-E1 à TC-E5 | existants (parmi d'autres) |
| Store renderer | `tests/renderer/app.store.soul.test.mjs` | TC-ST1 à TC-ST5 | existants |
| Pages React | — | néant | **absent** (voir GAP-16 global) |

---

## TC — Domaine pur (`tests/domain/soul.test.mjs`)

### TC-D1 — `parseSoul` extrait §1-4

**Fichier :** `tests/domain/soul.test.mjs:9`
**Fixture :** `tests/fixtures/SOUL.full.md`
**Vérifie :** `quiParle`, `audience`, présence de sous-chaînes dans `voix` et `lignesRouges`.
```
assert.equal(s.quiParle, 'Je suis Pierre, VP Engineering.')
assert.equal(s.audience, 'Mes collègues PM de Merim.')
assert.match(s.voix, /Première personne/)
assert.match(s.lignesRouges, /Jamais d'invention/)
```

### TC-D2 — `parseSoul` extrait §5 échantillons

**Fichier :** `tests/domain/soul.test.mjs:16`
**Vérifie :** `echantillons.length === 2`, `date` et `source` du premier, `texte` du premier.
**Règle couverte :** shape `{date, source, texte}` correctement extraite.

### TC-D3 — `parseSoul` extrait §6 journal + version

**Fichier :** `tests/domain/soul.test.mjs:26`
**Vérifie :** `journal.length === 2`, date et texte de la première entrée, `version === 'v3'`.
**Règle couverte :** R5 (versioning `v{journal.length+1}`).

### TC-D4 — `parseSoul` tolère une SOUL minimale

**Fichier :** `tests/domain/soul.test.mjs:33`
**Input :** `'# SOUL\n\n## 1. Qui parle\nX\n'`
**Vérifie :** `quiParle === 'X'`, `echantillons === []`, `journal === []`, `version === 'v1'`.
**Règle couverte :** pas de plantage sur fichier minimal.

### TC-D5 — `replaceSoulSections` réécrit §1-4 sans toucher §5/§6

**Fichier :** `tests/domain/soul.test.mjs:40`
**Vérifie :** nouvelles valeurs dans §1-4 après re-parse ; queue `## 5.` identique bit à bit.
**Règle couverte :** R1 (§5 jamais modifié par `replaceSoulSections`).

### TC-D6 — `parseEchantillons` tolère l'ancien format (sans source)

**Fichier :** `tests/domain/soul.test.mjs:69`
**Input :** format `### [2026-06-17] seed: false | épinglé: non`
**Vérifie :** `date === '2026-06-17'`, `source === ''`, texte extrait, flags anciens ignorés.
**Règle couverte :** compatibilité descendante format Echantillon.

### TC-D7 — `serializeEchantillons` : préambule + cap 3 + source omise si vide

**Fichier :** `tests/domain/soul.test.mjs:77`
**Input :** 4 entrées (3 sources, 1 vide, 1 de trop).
**Vérifie :** préambule en `> `, format `### [date] · source`, format `### [date]` quand source vide, 4e entrée absente.
**Règle couverte :** R2 (cap 3 côté domaine), source optionnelle.

### TC-D8 — `replaceSoulEchantillons` remplace §5, préserve §1 et §6 ; liste vide → préambule seul

**Fichier :** `tests/domain/soul.test.mjs:89` (+ `:97`)
**Vérifie :** §1 présent, §6 présent, ancien texte absent, nouvelle entrée présente ; liste vide → 0 échantillons après re-parse.
**Règle couverte :** R1 (§6 inchangé), R2 (cap), idempotence liste vide.

---

## TC — IO Main (`tests/main/soul-io.test.mjs`)

### TC-IO1 — `readSoul` version = v3 quand 2 leçons

**Fichier :** `tests/main/soul-io.test.mjs:17`
**Fixture :** `tests/fixtures/SOUL.sample.md` (copié dans tmpdir)
**Vérifie :** `version === 'v3'`, `rules.length === 2`, `examples.length === 1`, `lessons.length === 2`.
**Note :** couvre le modèle `SoulSummary` (dashboard), distinct de `Soul` (module soul).

### TC-IO2 — `readSoul` version = v1 quand journal vide

**Fichier :** `tests/main/soul-io.test.mjs:24`
**Input :** `'## 6. Journal d\'évolution\n- (vide — première édition)\n'`
**Vérifie :** `version === 'v1'` (aucune ligne datée parsée).

---

## TC — Engine (`tests/main/engine.test.mjs`)

### TC-E1 — `getSoul` parse au bon chemin

**Fichier :** `tests/main/engine.test.mjs:58`
**Vérifie :** chemin demandé `= /repo/.claude/breves-ia/SOUL.md`, `quiParle` extrait correctement.

### TC-E2 — `getSoul` retourne null si lecture échoue

**Fichier :** `tests/main/engine.test.mjs:65`
**Vérifie :** `getSoul(deps) === null` si `readFile` lève une erreur.
**Règle couverte :** pas de propagation d'exception vers le handler IPC.

### TC-E3 — `saveSoulSections` écrit §1-4 modifiés

**Fichier :** `tests/main/engine.test.mjs:69`
**Vérifie :** chemin d'écriture correct, `## 1. Qui parle\nA\n` présent, `## 5.` toujours dans le résultat.
**Règle couverte :** R1, contrat format §1-4.

### TC-E4 — `saveSoulSections` refuse un champ vide

**Fichier :** `tests/main/engine.test.mjs:78`
**Input :** `quiParle: '  '` (espaces seuls).
**Vérifie :** `ok === false`, `writeFile` non appelée.
**Règle couverte :** R3.

### TC-E5 — `saveSoulEchantillons` (absent du fichier engine.test.mjs constaté)

**Statut :** **non couvert au niveau engine** — `saveSoulEchantillons` n'a pas de TC dédié dans `engine.test.mjs` (vu lecture complète jusqu'à `:160`). La validation engine (R2, R4) est couverte indirectement via les TCs domaine.

---

## TC — Store renderer (`tests/renderer/app.store.soul.test.mjs`)

### TC-ST1 — `loadSoul` peuple form/version/journal/échantillons

**Fichier :** `tests/renderer/app.store.soul.test.mjs:7`
**Vérifie :** `soulForm.quiParle`, `soulForm.lignesRouges`, `soulVersion`, `soulJournal.length`, `echantillons.length`.

### TC-ST2 — `setSoulField` met à jour un champ

**Fichier :** `tests/renderer/app.store.soul.test.mjs:19`
**Vérifie :** `soulForm.audience` après `setSoulField('audience', ...)`.

### TC-ST3 — `addEchantillon` respecte le max 3

**Fichier :** `tests/renderer/app.store.soul.test.mjs:23`
**Vérifie :** 4 `addEchantillon` → `echantillons.length === 3`, 4e ignoré.
**Règle couverte :** R2 (guard store).

### TC-ST4 — `removeEchantillon` retire par index

**Fichier :** `tests/renderer/app.store.soul.test.mjs:32`
**Vérifie :** après `removeEchantillon(0)` sur 2 entrées → 1 reste, `texte === 'b'`.

### TC-ST5 — `setEchEdition` / `setEchKeepLocal`

**Fichier :** `tests/renderer/app.store.soul.test.mjs:41`
**Vérifie :** `echKeepLocal === true` après set, `echEdition.file === 'f'` après set.
**Règle couverte :** R7 (slice echKeepLocal présent).

---

## Zones non couvertes (constatées)

| Zone | Observation | Réf GAP |
|---|---|---|
| Pages React (`Soul.tsx`, `EchEditions.tsx`, `EchBreves.tsx`) | Aucun test unitaire ou d'intégration renderer — ni mock IPC, ni rendering | GAP-16 |
| `saveSoulEchantillons` au niveau engine | TC absent dans `engine.test.mjs` | TC-E5 ci-dessus |
| Guard `echKeepLocal` (comportement navigation) | Testé uniquement au niveau store (slice) ; le comportement `useEffect` dans `Soul.tsx` n'est pas testé | GAP-16 |
| Toast d'erreur §1-4 (UI vide) | Logique `Soul.tsx:54-56` non testée (page non testée) | GAP-16 |
| Rechargement dashboard après `saveSoulSections` | `Soul.tsx:64-65` non testé | GAP-16 |

---

## Stratégie de complétion suggérée

> Section « intention non validée » — à arbitrer par le PM/QA avant implémentation.

1. **TC-E5bis** : ajouter dans `engine.test.mjs` un test `saveSoulEchantillons` avec `length > 3` (→ `ok:false`) et `texte` vide (→ `ok:false`) et cas nominal (→ écriture correcte).
2. **TC-PAGE** : tester `Soul.tsx` avec un renderer léger (Vitest + jsdom ou React Testing Library) : montage avec `getSoulStructured` mocké, flow save sections, flow save echantillons, guard `echKeepLocal`.
3. Seuil de couverture : GAP-16 global propose d'ajouter un seuil configuré dans `vitest.config.mjs`.

---

## GAPS À REMONTER (tests)

| # | Observation | Localisation |
|---|---|---|
| GAP-16 (réf) | Pages React non testées ; aucun seuil de couverture ; pas de CI cloud | `docs/REVERSE_GAPS.md#GAP-16` |
| GAP-T1 | `saveSoulEchantillons` n'a pas de TC engine dédié — validations R2/R4 engine non couvertes directement | `tests/main/engine.test.mjs` |
| GAP-T2 | Le sous-flux complet `soul → ech-editions → ech-breves → soul` (avec guard `echKeepLocal`) n'est testé que par fragments (store isolé) — aucun test d'intégration de navigation | `tests/renderer/app.store.soul.test.mjs:41` |
