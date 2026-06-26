# Handoff — Phase 3b-2 (editor + archived)

> Document de passation pour une **instance neuve**. Lis-le en entier d'abord. Il te donne l'état du projet, les conventions **non négociables**, le périmètre exact de la 3b-2, la machinerie réutilisable et le process à suivre.

## TL;DR — par où commencer

1. **Passe sur Node 22** : `nvm use` (le `.nvmrc` est à `22`). Vérifie `node -v` = v22.x **avant toute commande npm**.
2. Tu es sur la branche `refonte-ts-react-electron` (refonte `.mjs` → TypeScript + React + Electron Forge/Vite). **Ne travaille pas sur `main`.**
3. Lis ces 3 docs (ordre) : le **design Phase 3b** `docs/superpowers/specs/2026-06-26-migration-phase3b-vues-flux-design.md`, le **plan 3b-1** `docs/superpowers/plans/2026-06-26-migration-phase3b1-flux-verification.md` (le modèle à suivre), et le **build log 3b-1** `docs/buildlog/2026-06-26-p-migration-phase3b1-flux-verification.md` (gotchas + carry-overs).
4. La 3b-2 = porter les vues **`editor`** et **`archived`** du renderer vanilla en React. Suis le flux superpowers : **brainstorming court (si besoin) → writing-plans (plan 3b-2) → subagent-driven-development** (lots + revue par lot + revue finale opus).

## État de la migration (où on en est)

| Phase | Statut |
|---|---|
| 1 — Fondation (Forge+Vite, TS strict, ESLint/Prettier, Vitest) | ✅ mergée dans `main` |
| 2.0 spike SDK / 2.1 domaine+Zod / 2.2a backend / 2.2b wiring IPC | ✅ livrées |
| 3a — Fondation React (Api typée, store Zustand, styles extraits, Shell, Dashboard, Storybook) | ✅ livrée |
| **3b-1 — flux vérification (compose/checking/detail + streaming)** | ✅ **livrée** |
| **3b-2 — editor/archived** | ⬜ **TOI** |
| 3b-3 (soul/agents), 3b-4 (history/reader), Phase 4 (suppr. `.mjs`/`hud`), Phase 5 (qualité+packaging) | ⬜ |

**Baseline projet** : Node 22 LTS, React 19, Zustand, Zod, Storybook 10 (`@vitejs/plugin-react` requis), Vite 6, Electron Forge. Le code source vit sous `src/` ; le legacy `hud/`+`lib/*.mjs` reste **intact** (suppression = Phase 4).

## Conventions NON NÉGOCIABLES

- **Node 22** pour tout (`nvm use`). Storybook 10 l'exige.
- **`git push origin refonte-ts-react-electron` APRÈS CHAQUE COMMIT** (demande explicite de l'utilisateur).
- **Look + comportement IDENTIQUES** au renderer vanilla ([hud/renderer.mjs](../../hud/renderer.mjs), [hud/companion.html](../../hud/companion.html)). Réutiliser les **classes CSS existantes** (`src/renderer/styles/{tokens,app}.css`) et les styles inline du legacy. Pas de redesign.
- **`window.api` est la SEULE frontière** vers le main. **Aucun `import 'electron'`** dans `src/renderer`.
- **Réutiliser `domain/`** (`@domain/edition`, `@domain/format`, etc.). **Aucune logique métier nouvelle** dans les composants — ils sont **présentationnels** (props in) ; les **pages** câblent store + `window.api`.
- **TS strict** : pas de `any`, pas de `ts-ignore`, pas de variable inutilisée.
- **Pas de fuite** : abonnements / `setInterval` nettoyés dans les `useEffect`.
- **Tests** : la logique (store/actions) en **Vitest** (sous Node 22) ; les composants en **Storybook** (une story par composant) ; validation visuelle finale par l'utilisateur (`npm start`). En test, le SDK n'est jamais appelé.
- **Vérifs à chaque tâche** : `npm run typecheck` (0), `npm run lint` (0), `npm test` (vert), sous Node 22.
- **Process** : subagent-driven-development. Tiens un **ledger** `.superpowers/sdd/progress.md`. Briefs via `scripts/task-brief`, revue via `scripts/review-package` (skill `subagent-driven-development`). Lots groupés (les tâches sont des ports mécaniques). Revue par lot + **revue finale whole-branch (opus)**. Hygiène git : ne JAMAIS stager `.claude/breves-ia/SOUL.md` (édition utilisateur hors-sujet).
- **Build log** à la fin (`docs/buildlog/2026-06-26-q-migration-phase3b2-….md`), format des build logs existants.

## Périmètre 3b-2 : `editor` + `archived`

Porter ces deux vues depuis `hud/renderer.mjs` (fonctions) et `hud/companion.html` (markup) :

### Vue `editor` (companion.html ~lignes 234-265 ; renderer.mjs)
- `runDraft(feedback?)` : `window.api.sendCommand('breves-draft', { topics: verifyValue.topics, feedback? })` ; **run-status** (`beginRun('draft')`/`endRun`) ; sur succès → `draftValue = r.value`, `renderEditor`.
- `renderEditor(d)` : `teamsText`, **mode aperçu/édition** (`editorMode`), liste des **corrections** (puce de niveau + titre + détail), liste des **sources** (nom + url, badge « repli »).
- `applyEditorMode()` / `toggleEditor()` : aperçu = `domain/edition.renderEditionHtml(teamsText)` (rendu HTML) ; édition = `<textarea>` ; bouton bascule « Éditer »/« Aperçu » ; `syncTeamsText`.
- **Modale de correction** (`openCorrect`/`submitCorrect`) : `#correct-modal` (overlay) — feedback (textarea) + case « leçon SOUL » (`wantSoulLesson`) ; envoyer → `runDraft(feedback)`.
- Boutons : « Corriger » (ouvre la modale), « Valider » (→ archivage).

### Vue `archived` (companion.html ~lignes 266-295 ; renderer.mjs)
- `runArchive()` : `syncTeamsText` ; `inputs = { teamsText, topics: verifyValue.topics, sources: draftValue.sources, leconSOUL? }` ; passe à l'écran `archived` **avant** le travail ; `beginRun('arch', 'Archivage…')` ; `window.api.archive(inputs)` (archive + ingestion) ; sur échec → toast + retour `editor`.
- `renderArchived(a)` : **étapes d'archivage** (`a.archiveSteps` : titre + détail) + **newsletter finale** (`domain/edition.renderEditionHtml(a.newsletterText)`).
- Boutons : « Copier » (`window.api.copy(newsletterText)` → toast « prêtes à coller dans Teams »), « Nouvel/Historique ».
- Cas `r.ingest && !r.ingest.ok` → toast « déposé dans raw/, mais ingestion à relancer ».

> Lis les fonctions exactes dans `hud/renderer.mjs` (sections « EDITOR », « CORRECT MODAL », « ARCHIVE ») et reproduis la logique **1:1** en React, en réutilisant `domain/edition`.

## Machinerie DÉJÀ en place (à réutiliser, ne pas réécrire)

- **Store** `src/renderer/store/app.store.ts` : `verifyValue`/`draftValue`/`archiveValue` (typés `VerifyOutput`/`DraftOutput`/`ArchiveOutput`), `teamsText`, `editorMode`, `wantSoulLesson`, `cards`, `runStatus`, `returnTo`, `toast`. Actions : `go`/`setView`, `showToast`, `setDraftValue`/`setArchiveValue`/`setTeamsText`/`setEditorMode`, `beginRun(title?)`/`endRun()`/`setRunActivity`/`tickClock`, `setReturnTo`. **Ajoute** les actions/champs qui manquent pour l'éditeur (ex. toggle modale correction, `wantSoulLesson` setter) en suivant le style existant + test Vitest.
- **`useCommandStream`** (`src/renderer/hooks/useCommandStream.ts`) : déjà monté dans `App`, route les events de streaming → store. La rédaction (`breves-draft`) émet aussi des events `activity` → le run-status s'animera automatiquement.
- **`RunStatus`** (`src/renderer/components/RunStatus.tsx`) : réutilisable tel quel pour l'éditeur/archivage (lit `store.runStatus`). L'horloge tourne déjà via `App` (intervalle gardé par `runStatus.active`).
- **`App` registry** (`src/renderer/App.tsx`) : ajoute `editor` et `archived` au `Record<string, ComponentType>`.
- **`domain/edition`** : `renderEditionHtml(markdown)` (rendu HTML d'une édition/brèves) — pour l'aperçu éditeur et la newsletter finale.
- **Overlay/modale** : classes `.overlay` + `.modal` (dans `app.css`) pour la modale de correction.

## Carry-overs 3b-1 à appliquer en 3b-2 (revue finale opus)

- **Extraire les helpers `niveauColor`/`niveauSoft`/`niveauLabel`** (aujourd'hui dupliqués dans `EnqCard.tsx` ET `Drawer.tsx`) dans un module partagé (ex. `src/renderer/components/niveau.ts` ou `@domain/format`) — **l'éditeur (corrections) les réutilise**. Faire cette extraction au début de 3b-2 et brancher EnqCard/Drawer dessus.
- **Resserrer le cast dans `Drawer.tsx`** à `{ raw?: string }` ; typer `faits` en `string[]` en amont si possible (retire le `String(f)`).
- **Convertir `Compose.tsx`** en sélecteurs Zustand (`useAppStore((s) => s.x)`) au lieu de `useAppStore()` (cohérence/perf) — les nouvelles pages editor/archived doivent utiliser des **sélecteurs** dès le départ.
- **`TOPIC_TYPES`** (`useCommandStream.ts`) à coupler au union `TopicEvent`.
- Une **story par composant** présentationnel ajouté (modale de correction, lignes de correction/source, etc.).

## Découpage suggéré (à affiner dans ton plan 3b-2)

- **Task 0/1** : extraction des helpers `niveau*` partagés + branchement EnqCard/Drawer + (optionnel) sélecteurs Compose.
- **Tasks editor** : page `Editor` (rédaction `breves-draft`, aperçu/édition via `domain/edition`, listes corrections+sources) + composants `CorrectionRow`/`SourceRow` + **modale** `CorrectModal` (+ stories) + actions store nécessaires.
- **Tasks archived** : page `Archived` (archivage+ingestion, étapes, newsletter, copie) + composant `ArchiveStep` (+ story).
- **Enregistrement** dans `App` registry ; mise à jour `Shell` si titres/retour spéciaux nécessaires (cf. carry-over titres `detail`/`reader`).

## Critère de réussite 3b-2

Parité fonctionnelle écran par écran : checking → **editor** (rédiger, éditer, corriger) → **archived** (archiver, copier). `npm run typecheck`/`lint`/`test` verts (Node 22) ; Storybook compile ; `npm start` build sans erreur ; validation visuelle utilisateur. `lib/*.mjs`/`hud/*` inchangés. Push après chaque commit. Build log + revue finale opus.
