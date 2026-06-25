# §5 « Échantillons vivants » curaté manuellement — Design

**Date** : 2026-06-25
**Statut** : design validé, en attente de relecture utilisateur avant plan.

## Objectif

Remplacer la fenêtre glissante FIFO de la section §5 « Échantillons vivants » de la SOUL par une **liste curatée à la main** : l'utilisateur choisit explicitement les brèves qui servent d'échantillons de style, **3 au maximum**, **sans éviction automatique**. La sélection se fait dans l'éditeur SOUL, en piochant des brèves **dans les éditions passées**. L'archivage ne modifie plus §5.

## Décisions (issues du brainstorm)

- **Moment de la sélection** : dans l'éditeur SOUL (curation centralisée, à froid).
- **Source d'ajout** : brèves verbatim issues des éditions archivées.
- **Limite** : **3 maximum, plafond dur**. Pour en ajouter un 4ᵉ, retirer d'abord une entrée.
- **Pas de FIFO** : aucune éviction automatique ; l'archivage ne touche plus §5.
- **Réordonnancement** : non (ajout / retrait uniquement).
- **Flags supprimés** : `seed:` et `épinglé:` n'ont plus de sens (plus de vieillissement) → retirés du format.
- **Nettoyage** : §5 est **vidé d'emblée** à la livraison (les 3 entrées issues des smoke tests partent) ; l'utilisateur reconstruit §5 via la nouvelle UI.

## Format §5 (simplifié)

Préambule réécrit :

```
## 5. Échantillons vivants
> Jusqu'à 3 brèves validées, choisies à la main, verbatim. Elles donnent le ton de la plume : densité, rythme, structure. Curées depuis l'éditeur SOUL.
```

Chaque entrée :

```
### [YYYY-MM-DD] · <source>
**<accroche en gras>** <corps de la brève, verbatim>
<url citée>
```

- `[YYYY-MM-DD]` = date de l'édition d'origine de la brève.
- `<source>` = publication/domaine de la source (déduit de l'URL de la brève) ; optionnel (omis si inconnu → `### [YYYY-MM-DD]`).
- Le `texte` est le verbatim de la brève (accroche + corps + URL), tel qu'il figure dans la note archivée.

## Composants

### 1. `lib/edition-breves.mjs` (nouveau, pur, testé)

`extractBreves(noteText) -> [{ date, source, accroche, texte }]`

Découpe le markdown d'une note archivée en brèves individuelles, en réutilisant la même structure que le rendu (`lib/edition-render.mjs`) :
- une ligne `— <date> —` ouvre une date courante ;
- une ligne commençant par `**` ouvre une nouvelle brève (l'accroche est le contenu en gras) ;
- les lignes suivantes (corps, URL) appartiennent à la brève courante jusqu'à la prochaine accroche ou la prochaine date ;
- `source` = domaine de la première URL de la brève (via `new URL(...).hostname` sans `www.`), `''` si aucune.
- `accroche` = texte du premier `**…**` de la brève (sans les `**`).
- `texte` = le bloc verbatim de la brève (accroche + corps + URL), réassemblé.

Le titre/intro d'édition et le bloc `## Sources` ne sont pas des brèves (ignorés).

### 2. `lib/soul-model.mjs`

- `parseEchantillons(body5)` simplifié : lit `### [date] · <source?>` + `texte` → `{ date, source, texte }`. (Drop `seed`/`epingle`.) Tolère l'ancien format (entrées avec flags) en ignorant les flags.
- `parseSoul` : `echantillons` devient `[{ date, source, texte }]`. `version` reste `v{journal.length + 1}` (basée sur §6, inchangée).
- Nouveau `replaceSoulEchantillons(raw, entries) -> raw'` : réécrit le corps de §5 (préambule `>` + entrées sérialisées) à partir de `entries` (≤ 3). Si `entries` vide → §5 ne contient que le préambule. N'altère aucune autre section.

### 3. `hud/engine.mjs`

`saveSoulEchantillons(deps, entries) -> { ok } | { ok:false, error }`
- Valide : `entries` est un tableau de longueur ≤ 3 ; chaque entrée a un `texte` non vide. Sinon `{ ok:false, error }` sans écrire.
- Lit la SOUL, applique `replaceSoulEchantillons`, écrit le fichier. `try/catch`.

La lecture des brèves d'une édition passée réutilise `readEdition(deps, file)` (déjà présent) ; l'extraction se fait **côté renderer** via `extractBreves` (import depuis `lib/edition-breves.mjs`). Pas d'IPC dédié à la lecture.

### 4. IPC (`hud/main.mjs` + `hud/preload.cjs`)

`save-soul-echantillons` → `window.breves.saveSoulEchantillons(entries)`.

### 5. UI — éditeur SOUL (§5 éditable)

- §5 affiche les échantillons actuels (≤ 3) en cartes, chacune avec un bouton **« Retirer »**.
- Bouton **« Ajouter un échantillon »**, **désactivé** quand 3 entrées sont présentes.
- L'ajout ouvre un **sélecteur** : liste des éditions passées (via `getDashboard().editions`) ; au clic sur une édition, chargement de son texte (`readEdition`) puis `extractBreves`, et affichage des brèves de cette édition ; chaque brève a un bouton **« Ajouter »** qui l'insère dans §5 (si < 3) et ferme le sélecteur.
- Un bouton **« Enregistrer les échantillons »** persiste §5 via `saveSoulEchantillons` (toast de confirmation). État local des entrées tenu côté renderer jusqu'à l'enregistrement.

### 6. Commandes d'archivage

- `.claude/commands/breves-archive.md` : retirer la consigne « MAJ SOUL §5 = fenêtre glissante FIFO 3 ».
- `.claude/breves-ia/_archive.md` : retirer la procédure §5 (insertion en tête, FIFO, suppression des `seed: true`).
- `soulVersion` (calculé sur le nombre de leçons §6) **inchangé**. Le §6 (journal d'évolution) continue d'être alimenté par `leconSOUL`.
- `archiveSteps` : l'étape « SOUL mise à jour » ne mentionne plus §5 (uniquement §6 le cas échéant).

## Flux de données

```
Éditions passées (raw/notes/*.md) ──readEdition──▶ texte
            texte ──extractBreves (renderer)──▶ [brèves]
   sélection utilisateur ──▶ entries (≤3) ──saveSoulEchantillons (IPC)──▶ replaceSoulEchantillons ──▶ SOUL.md §5
   SOUL.md §5 ──parseSoul/getSoul──▶ draft (prompt §5) ─ imité par /breves-draft
```

## Gestion d'erreurs

- `saveSoulEchantillons` refuse > 3 entrées ou un `texte` vide → `{ ok:false, error }`, aucune écriture.
- `extractBreves` sur un texte vide/non-string → `[]` (ne jette pas).
- `readEdition` renvoie déjà `null` si le fichier est invalide → le sélecteur affiche « aucune brève ».
- Écriture SOUL en échec → `{ ok:false, error }` remonté en toast.

## Tests

- `lib/edition-breves.test.mjs` : note multi-dates/multi-brèves → brèves correctes (date, source via domaine, accroche, texte) ; titre/intro/Sources ignorés ; entrée vide → `[]`.
- `lib/soul-model.test.mjs` : `parseEchantillons` nouveau format (et tolérance ancien format avec flags) ; `replaceSoulEchantillons` (round-trip, ≤ 3, liste vide → préambule seul, autres sections intactes).
- `hud/engine.test.mjs` : `saveSoulEchantillons` refuse > 3 et `texte` vide (sans écrire) ; écrit sinon.
- UI vérifiée en lançant l'app (ajout/retrait, cap 3, persistance).

## Hors périmètre (YAGNI)

- Pas de réordonnancement, pas d'ajout en texte libre, pas d'épinglage.
- Pas de migration automatique de l'ancien format §5 (le `parseEchantillons` tolère l'ancien format en lecture ; §5 est de toute façon vidé à la livraison).
