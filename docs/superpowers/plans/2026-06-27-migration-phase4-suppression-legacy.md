# Migration Phase 4 — Suppression du legacy (`lib/`+`hud/`) : Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire du renderer React l'unique frontal : re-pointer le CLI headless `npm run breves` sur le moteur TS `src/` (via `tsx`), puis supprimer intégralement `lib/` (18 `.mjs`) et `hud/` (5 fichiers).

**Architecture:** Le CLI passe de `scripts/breves-cli.mjs` (→ `hud/engine.mjs` + `lib/load-env.mjs`) à `scripts/breves-cli.ts` (→ `@main/engine` + `@main/io/env`), exécuté par `tsx` qui résout les alias `tsconfig.paths`. Le chemin `engine → services → io` est headless-safe (aucun `import 'electron'`) et sans effet de bord au chargement (client SDK lazy). Ordre « zéro fenêtre cassée » : re-pointer + vérifier le CLI **d'abord**, **puis** supprimer le legacy.

**Tech Stack:** TypeScript strict, `tsx` (runner TS Node), Electron Forge/Vite, Vitest, Storybook 10. Node 22 (`.nvmrc`).

## Global Constraints

- **Lancer sous Node 22** (`nvm use` ; `.nvmrc`=22) **avant toute commande npm**. `npm run typecheck` (0) / `lint` (0) / `test` (verts) à chaque tâche.
- **Ordre « zéro fenêtre cassée »** : Task 1 (re-pointage CLI + vérif) **précède** Task 2 (suppression). Jamais d'état où le CLI est cassé.
- Le chemin du CLI doit rester **headless** : **aucun `import 'electron'`** dans `@main/engine` / `@main/services` / `@main/io` (déjà vérifié — ne pas en introduire).
- `tests/*` **inchangés** (aucun ne référence `lib/`/`hud/`).
- Pas de nouvelle dépendance **runtime** ; `tsx` est une **devDependency**.
- **`git push origin refonte-ts-react-electron` APRÈS CHAQUE COMMIT** (demande utilisateur).
- Ne **jamais** stager `.claude/breves-ia/SOUL.md`.
- Spec : [docs/superpowers/specs/2026-06-27-migration-phase4-suppression-legacy-design.md](../specs/2026-06-27-migration-phase4-suppression-legacy-design.md).

## File Structure

- `scripts/breves-cli.ts` — **créé** : CLI headless re-pointé sur `@main/engine` (run via `tsx`).
- `scripts/breves-cli.mjs` — **supprimé** (remplacé par le `.ts`).
- `package.json` — **modifié** : devDep `tsx` ; script `breves` repointé (Task 1) ; script `hud` retiré (Task 2).
- `hud/` (5 fichiers) + `lib/` (18 `.mjs`) — **supprimés** (Task 2).
- `eslint.config.mjs` — **modifié** : retrait de `'lib'`/`'hud'` des `ignores` (Task 2).
- `README.md` — **modifié** : section app (`npm start`) + section CLI (`npm run breves`) (Task 2).

> Note : `scripts/` n'est ni linté (eslint l'ignore) ni typececké (`tsconfig.include` = `["src","*.config.ts"]`). `tsx` transpile sans type-check : le CLI `.ts` n'est donc pas soumis à un gate TS — acceptable pour un CLI fin. Sa vérification est le **smoke** (ci-dessous).

---

### Task 1 : Re-pointer le CLI sur `src/` via `tsx` (legacy encore présent)

**Files:**
- Create: `scripts/breves-cli.ts`
- Delete: `scripts/breves-cli.mjs`
- Modify: `package.json` (devDep `tsx` + script `breves`)

**Interfaces:**
- Consumes : `defaultDeps()`, `dispatch(args, deps)` (`@main/engine`) ; `loadEnvFile()` (`@main/io/env`). `defaultDeps()` ne lève pas (valeurs par défaut) ; `dispatch` n'est appelé qu'après résolution d'un skill valide.
- Produces : `npm run breves <verify|draft|archive> [arg]` exécuté par `tsx scripts/breves-cli.ts` ; sans argument → message d'usage sur stderr + `exit 1` (sans appel SDK).

- [ ] **Step 1 : Installer `tsx` (devDependency)**

Run : `npm install -D tsx`
Attendu : `tsx` ajouté à `devDependencies` de `package.json` (+ `package-lock.json` mis à jour), sans erreur.

- [ ] **Step 2 : Créer `scripts/breves-cli.ts`** (port 1:1 de `breves-cli.mjs`, branché sur `src/`)

```ts
import { defaultDeps, dispatch } from '@main/engine';
import { loadEnvFile } from '@main/io/env';

loadEnvFile();
const deps = defaultDeps(); // repoDir (cwd) + wikiMcp (MCP) + bbDir
const [, , skillShort, arg] = process.argv;
const SKILLS: Record<string, string> = {
  verify: 'breves-verify',
  draft: 'breves-draft',
  archive: 'breves-archive',
};
const skill = skillShort ? SKILLS[skillShort] : undefined;
if (!skill) {
  console.error('usage: breves-cli <verify|draft|archive> [arg]');
  process.exit(1);
}

async function readStdin(): Promise<string> {
  let data = '';
  for await (const c of process.stdin) data += c;
  return data.trim();
}

const inputs =
  skill === 'breves-verify'
    ? { sujets: arg ?? (await readStdin()) }
    : JSON.parse(await readStdin());

const r = await dispatch(
  { skill, inputs, onEvent: (e) => console.error('·', JSON.stringify(e)) },
  deps,
);
if (!r.ok) {
  console.error('ÉCHEC:', r.error);
  process.exit(1);
}
console.log(JSON.stringify(r.value, null, 2));
```

- [ ] **Step 3 : Re-pointer le script `breves` + supprimer l'ancien `.mjs`**

Dans `package.json`, **remplacer** la ligne du script :
```json
    "breves": "node scripts/breves-cli.mjs",
```
par :
```json
    "breves": "tsx scripts/breves-cli.ts",
```
Puis : `git rm scripts/breves-cli.mjs`

- [ ] **Step 4 : Smoke CLI (sans appel SDK) — prouve que le graphe TS + alias se charge headless**

Run : `npm run breves`
Attendu : sur **stderr** `usage: breves-cli <verify|draft|archive> [arg]` puis **exit 1** (`echo $?` → `1`). Cela charge `@main/engine` (→ `llm.service`, `io/env`, `@domain/*`) via `tsx` + résout les alias `tsconfig.paths`, **sans** instancier le SDK ni faire de réseau.
> Si les alias ne se résolvent pas (`Cannot find module '@main/engine'`), corriger en pointant tsx sur le tsconfig : `"breves": "tsx --tsconfig tsconfig.json scripts/breves-cli.ts"` puis relancer le smoke.

- [ ] **Step 5 : Vérifs qualité (inchangées par cette tâche)**

Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` (160 verts). (`scripts/` est hors lint/typecheck ; ces gates confirment juste l'absence de régression ailleurs.)

- [ ] **Step 6 : Commit + push**

```bash
git add -A && git commit -m "refactor(phase4): re-pointe le CLI breves sur @main/engine via tsx (lib/hud plus requis par le CLI)"
git push origin refonte-ts-react-electron
```

---

### Task 2 : Supprimer `lib/` + `hud/` + nettoyage + vérification finale

**Files:**
- Delete: `hud/` (`main.mjs`, `engine.mjs`, `preload.cjs`, `renderer.mjs`, `companion.html`)
- Delete: `lib/` (18 fichiers `.mjs`)
- Modify: `package.json` (retrait du script `hud`)
- Modify: `eslint.config.mjs` (retrait de `'lib'`/`'hud'` des `ignores`)
- Modify: `README.md` (sections app + CLI)

**Interfaces:**
- Consumes : rien (suppression). Le CLI (Task 1) ne dépend plus de `lib/`/`hud/`.
- Produces : arbre sans `lib/`/`hud/` ; aucune référence résiduelle dans le code/config ; React = unique frontal.

- [ ] **Step 1 : Supprimer les dossiers legacy**

```bash
git rm -r hud lib
```
Attendu : 5 fichiers `hud/` + 18 `lib/*.mjs` supprimés.

- [ ] **Step 2 : Retirer le script npm `hud`**

Dans `package.json`, **supprimer** entièrement la ligne :
```json
    "hud": "electron hud/main.mjs",
```

- [ ] **Step 3 : Nettoyer les `ignores` eslint**

Dans `eslint.config.mjs`, dans le tableau `ignores`, **retirer** les entrées `'lib'` et `'hud'` (garder `'scripts'`, `'tests'`, etc.). Avant :
```js
  { ignores: ['node_modules', '.vite', 'src/**/.vite', 'out', 'dist', 'lib', 'hud', 'scripts', 'tests', 'storybook-static', '.storybook', 'vitest.config.mjs', '*.config.ts', '*.config.mjs'] },
```
Après :
```js
  { ignores: ['node_modules', '.vite', 'src/**/.vite', 'out', 'dist', 'scripts', 'tests', 'storybook-static', '.storybook', 'vitest.config.mjs', '*.config.ts', '*.config.mjs'] },
```

- [ ] **Step 4 : Mettre à jour le README**

Dans `README.md` :
- Section « Lancer l'app » : **remplacer** la commande `npm run hud` par `npm start` (lance l'app React via Electron Forge).
- Section « Moteur en ligne de commande (sans UI) » : **remplacer** les 3 commandes `node scripts/breves-cli.mjs <…>` par leur équivalent `npm run breves <…>`, c.-à-d. :
  ```bash
  npm run breves verify "GLM 5.2, modèle chinois open source 753B"
  npm run breves draft  < verify-output.json
  npm run breves archive < draft-output.json   # écrit dans le wiki
  ```

- [ ] **Step 5 : Vérifier l'absence de référence résiduelle**

Run : `grep -rn "lib/\|hud/" . --include="*.ts" --include="*.tsx" --include="*.mjs" --include="*.cjs" --include="*.json" --include="*.js" | grep -vE "node_modules|/\.vite/|/docs/|storybook-static|package-lock"`
Attendu : **aucune sortie** (plus aucune référence à `lib/` ou `hud/` dans le code/config ; les `docs/` historiques sont exclus et conservés).

- [ ] **Step 6 : Vérification finale complète (Node 22)**

Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` (160 verts).
Run : `npm run build-storybook` → OK.
Run (smoke CLI, toujours fonctionnel après suppression) : `npm run breves` → usage + exit 1.
Run (sanity build) :
```bash
rm -rf .vite && ( npm start > /tmp/p4.log 2>&1 & ) ; sleep 30 ; grep -iE "Cannot find|Failed to resolve|error|Uncaught" /tmp/p4.log | head ; ls .vite/build ; pkill -f electron-forge; pkill -f '\.vite/build'
```
→ `.vite/build/main.cjs` présent ; grep d'erreurs vide.

- [ ] **Step 7 : Commit + push**

```bash
git add -A && git commit -m "chore(phase4): supprime le legacy lib/ + hud/ (React unique frontal) + nettoyage eslint/README/scripts"
git push origin refonte-ts-react-electron
```

---

## Critères de réussite Phase 4 (revue finale)

- [ ] `npm run breves` fonctionne via `tsx` + `@main/engine` (smoke sans arg → usage + exit 1, sans SDK) ; le CLI ne dépend plus de `lib/`/`hud/`. Verify *live* validable manuellement par l'utilisateur.
- [ ] `lib/` et `hud/` **supprimés** ; **aucune référence résiduelle** (grep code/config vide hors `docs/`) ; script npm `hud` retiré ; `ignores` eslint nettoyés ; README à jour (`npm start` / `npm run breves`).
- [ ] `npm run typecheck` (0) / `lint` (0) / `test` (160 verts) / `build-storybook` OK / `npm start` build sans erreur.
- [ ] `tsx` ajouté en **devDependency** uniquement ; aucun `import 'electron'` introduit dans le chemin du CLI. `tests/*` inchangés. Push après chaque commit.

## Reste (Phase 5)

Qualité + packaging (make/distribuable, signature). Candidat reporté : refresh dashboard post-archivage (Minor 3b-4). Plan séparé.
