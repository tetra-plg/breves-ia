# Migration Phase 5 — Packaging macOS (DMG) + pre-commit : Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Outiller la qualité (hook pre-commit Husky : typecheck+lint+test) et produire un distribuable macOS **`.dmg` non signé** via `npm run make`.

**Architecture:** Husky v9 installe un hook `.husky/pre-commit` qui bloque tout commit dont `typecheck`/`lint`/`test` échoue. `forge.config.ts` est réduit au seul maker macOS **DMG** (`@electron-forge/maker-dmg`), avec métadonnées d'app (`productName`, `appBundleId`), sans signature. Le hook est posé en **premier** : le commit de packaging (Task 2) est ainsi gardé par le hook (preuve live).

**Tech Stack:** Electron Forge + Vite, `@electron-forge/maker-dmg`, Husky v9, Node 22 (`.nvmrc`), Vitest, TypeScript strict.

## Global Constraints

- **Lancer sous Node 22** (`nvm use` ; `.nvmrc`=22) **avant toute commande npm**. `npm run typecheck` (0) / `lint` (0) / `test` (160 verts) à chaque tâche.
- **Pas de signature/notarisation, pas de CI distante, pas d'icône custom** (hors-scope). Pas de montée de version (reste `0.1.0`).
- `src/` et `tests/` **inchangés** (Phase 5 = packaging + outillage uniquement).
- Nouvelles dépendances en **devDependencies** uniquement (`husky`, `@electron-forge/maker-dmg`).
- Ne **jamais** commiter `out/` (artefacts de build) ni stager `.claude/breves-ia/SOUL.md`.
- **`git push origin refonte-ts-react-electron` APRÈS CHAQUE COMMIT** (demande utilisateur).
- Spec : [docs/superpowers/specs/2026-06-27-migration-phase5-packaging-qualite-design.md](../specs/2026-06-27-migration-phase5-packaging-qualite-design.md).

## File Structure

- `.husky/pre-commit` — **créé** : hook (nvm + `npm run typecheck && lint && test`).
- `package.json` — **modifié** : `"prepare": "husky"` ; `"productName": "Brèves IA"` ; devDeps (`husky`, `@electron-forge/maker-dmg` ajoutés ; makers Squirrel/ZIP/Rpm/Deb retirés).
- `forge.config.ts` — **modifié** : makers = `[MakerDMG(['darwin'])]` ; `packagerConfig.appBundleId`.

---

### Task 1 : Hook pre-commit (Husky)

**Files:**
- Create: `.husky/pre-commit`
- Modify: `package.json` (devDep `husky` + script `prepare`)

**Interfaces:**
- Produces : un hook git `pre-commit` qui exécute `npm run typecheck && npm run lint && npm test` (sous Node 22 si `nvm` dispo) et **bloque** le commit en cas d'échec.

- [ ] **Step 1 : Installer Husky + initialiser**

Run : `source ~/.nvm/nvm.sh && nvm use && npm install -D husky && npx husky init`
Attendu : `husky` ajouté en devDependencies ; `"prepare": "husky"` ajouté aux scripts ; un fichier `.husky/pre-commit` par défaut créé (contenant `npm test`).

- [ ] **Step 2 : Écrire le contenu du hook `.husky/pre-commit`**

Remplacer le contenu de `.husky/pre-commit` par :
```sh
# Charge nvm si présent pour rester sur Node 22 (.nvmrc) ; sinon poursuit avec le Node courant.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm use >/dev/null 2>&1

npm run typecheck && npm run lint && npm test
```

- [ ] **Step 3 : Vérifier que le hook BLOQUE un commit fautif**

Créer un fichier temporaire à erreur de type, tenter un commit, confirmer le refus, puis nettoyer :
```sh
printf 'export const broken: number = "oops";\n' > src/__hooktest.ts
git add src/__hooktest.ts
git commit -m "test: doit échouer (hook)"; echo "exit=$?"
```
Attendu : le hook lance les vérifs, `typecheck` échoue → **commit refusé** (`exit=1`, message d'erreur TS sur `src/__hooktest.ts`).
Nettoyer :
```sh
git reset HEAD src/__hooktest.ts && rm -f src/__hooktest.ts
git status --short   # arbre propre, plus de __hooktest.ts
```

- [ ] **Step 4 : Vérifier que le hook LAISSE PASSER un arbre sain (via le commit de la tâche)**

Run : `source ~/.nvm/nvm.sh && nvm use && npm run typecheck && npm run lint && npm test`
Attendu : typecheck 0, lint 0, 160 tests verts (ces mêmes vérifs s'exécuteront dans le hook au commit suivant).

- [ ] **Step 5 : Commit + push** (ce commit est lui-même gardé par le hook → preuve du cas passant)

```bash
git add -A
git commit -m "chore(phase5): hook pre-commit Husky (typecheck+lint+test, nvm)"
git push origin refonte-ts-react-electron
```
Attendu : le hook s'exécute, toutes les vérifs passent, le commit aboutit. (Si `.gitignore` ne couvre pas déjà `.husky/_/`, ne PAS stager `.husky/_/` — husky le régénère via `prepare` ; ne stager que `.husky/pre-commit` et `package.json`.)

---

### Task 2 : Packaging macOS DMG (non signé)

**Files:**
- Modify: `forge.config.ts`
- Modify: `package.json` (devDeps makers + `productName`)

**Interfaces:**
- Consumes : le hook pre-commit (Task 1) gardera le commit de cette tâche.
- Produces : `npm run make` génère un `.dmg` dans `out/make/` ; `forge.config.ts` n'a plus que le maker DMG.

- [ ] **Step 1 : Installer le maker DMG**

Run : `source ~/.nvm/nvm.sh && nvm use && npm install -D @electron-forge/maker-dmg`
Attendu : `@electron-forge/maker-dmg` ajouté en devDependencies.

- [ ] **Step 2 : Réécrire `forge.config.ts`** (makers → DMG seul ; `appBundleId`)

Remplacer le fichier par :
```ts
import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    appBundleId: 'com.tetra-plg.breves-ia',
  },
  rebuildConfig: {},
  makers: [new MakerDMG({}, ['darwin'])],
  plugins: [
    new VitePlugin({
      build: [
        { entry: 'src/main/index.ts', config: 'vite.main.config.ts', target: 'main' },
        { entry: 'src/preload/index.ts', config: 'vite.preload.config.ts', target: 'preload' },
      ],
      renderer: [{ name: 'main_window', config: 'vite.renderer.config.ts' }],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
```

- [ ] **Step 3 : Ajouter `productName` dans `package.json`**

Ajouter (à côté de `"name"`/`"version"`) la clé :
```json
  "productName": "Brèves IA",
```

- [ ] **Step 4 : Désinstaller les makers non utilisés**

Run : `source ~/.nvm/nvm.sh && nvm use && npm uninstall @electron-forge/maker-squirrel @electron-forge/maker-zip @electron-forge/maker-deb @electron-forge/maker-rpm`
Attendu : ces 4 paquets retirés des devDependencies ; `forge.config.ts` ne les importe plus (déjà fait Step 2) → pas de référence cassée.

- [ ] **Step 5 : Vérifs qualité**

Run : `source ~/.nvm/nvm.sh && nvm use && npm run typecheck` (0 — `forge.config.ts` est typechecké via `tsconfig.include`) + `npm run lint` (0) + `npm test` (160 verts).

- [ ] **Step 6 : Produire le DMG**

Run : `source ~/.nvm/nvm.sh && nvm use && npm run make`
Puis : `find out/make -name "*.dmg"`
Attendu : `npm run make` se termine sans erreur ; au moins un fichier `.dmg` listé dans `out/make/` (app « Brèves IA », non signée). (Le build peut prendre 1-2 min ; un avertissement de signature ad-hoc est normal.)

- [ ] **Step 7 : Commit + push** (gardé par le hook)

```bash
git add forge.config.ts package.json package-lock.json
git commit -m "chore(phase5): packaging macOS DMG non signé (maker-dmg, appBundleId, productName) + nettoyage makers"
git push origin refonte-ts-react-electron
```
Attendu : le hook (Task 1) relance typecheck/lint/test verts → commit accepté. **Ne pas** stager `out/`.

---

## Critères de réussite Phase 5 (revue finale)

- [ ] `.husky/pre-commit` actif : commit avec erreur TS **refusé** (vérifié Step 1.3) ; commit sain accepté (commits des deux tâches passés par le hook).
- [ ] `forge.config.ts` réduit au seul `MakerDMG(['darwin'])` + `appBundleId` ; `package.json` `productName: "Brèves IA"` ; makers Squirrel/ZIP/Rpm/Deb désinstallés ; `husky`/`maker-dmg` en devDeps.
- [ ] `npm run make` produit un **`.dmg`** dans `out/make/` (non signé).
- [ ] `npm run typecheck` (0) / `lint` (0) / `test` (160 verts) / `build-storybook` OK / `npm start` sanity OK.
- [ ] `src/`/`tests/` inchangés ; pas de signature/CI/icône ; `out/` non commité ; `SOUL.md` non stagé ; push après chaque commit.
- [ ] Lancement réel du `.dmg`/`.app` = **validation manuelle de l'utilisateur**.

## Reste (post-migration)

Migration terminée. Candidats ultérieurs (hors migration) : refresh dashboard post-archivage, icône custom, signature/notarisation, CI distante, montée de version.
