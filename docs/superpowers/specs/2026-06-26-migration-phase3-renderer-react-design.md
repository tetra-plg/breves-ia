# Migration Phase 3 — Renderer React (design)

**Date** : 2026-06-26
**Branche d'intégration** : `refonte-ts-react-electron`
**Spec parent** : [2026-06-26-migration-ts-react-electron-design.md](./2026-06-26-migration-ts-react-electron-design.md)
**Statut** : design validé, prêt pour plan 3a

## Contexte

La Phase 2 a livré le cœur Electron typé : `domain/` pur, `shared/schemas` Zod, `main/` (io,
services, engine, ipc), et la preload exposant `window.api`. La fenêtre Forge affiche encore le
**placeholder** Phase 1. La Phase 3 remplace le placeholder par un **renderer React** consommant
`window.api`, **en préservant le comportement et le look exact** de l'app vanilla actuelle
([hud/renderer.mjs](../../../hud/renderer.mjs) 506 l + [hud/companion.html](../../../hud/companion.html)).

Atout : la **logique pure est déjà dans `domain/`** (`navigation`, `checking`, `edition`,
`format`, `soul`, `agents`) et testée. Le renderer vanilla n'est que du DOM impératif + des appels
`window.api`. Le port React est donc surtout **présentationnel + un store**.

## Décisions (validées)

- **Look préservé pixel** : on extrait le CSS de `companion.html` (16 tokens `:root` + classes)
  en feuilles globales `src/renderer/styles/{tokens,app}.css` ; les composants réutilisent les
  classes/inline **tels quels**. Pas de redesign, pas de design-system (migration, pas refonte).
- **Pas de router** : la vue active vient du **store** (machine d'états `domain/navigation`).
- **Store léger Zustand** : un store consolide l'objet `state` du renderer + les valeurs du flux.
- **Composants présentationnels** (props in) → **Storybook** ; les **pages** câblent store + `window.api`.
- **Tests** : logique (store, hooks, réducteurs d'events) en **Vitest** headless ; composants en
  **Storybook** (atelier visuel, builder Vite) + revue visuelle `npm start`. La logique métier
  reste celle de `domain/` (déjà testée).
- **Découpage** : **3a Fondation** (carry-overs + store + styles + shell + Storybook + Dashboard
  branché, swap placeholder→React) → **3b Pages** (les 11 vues restantes + flux complet).

## Architecture cible

```text
src/renderer/
  main.tsx              # racine React + providers
  App.tsx               # shell : lit store.view, rend la page active + overlays
  store/app.store.ts    # Zustand : view, theme, dashboard, verify/draft/archive,
                        #   cards, échantillons, editorMode, toast, runStatus
  hooks/
    useCommandStream.ts # window.api.onCommandEvent → store (applyEvent/activityFromMessage)
  layouts/Shell.tsx     # en-tête (titre, retour, stepper, thème, diamant) + contenu + overlays
  pages/                # 12 vues
  components/           # Card(enq), Drawer, Stepper, Toast, AgentCard, EditionView, RunStatus,
                        #   CorrectModal, SoulEditor… (présentationnels)
  styles/{tokens.css,app.css}
  *.stories.tsx         # Storybook
```

**Flux de données** : les pages appellent `window.api.*` (typé) et lisent/écrivent le store ;
`useCommandStream` abonne `onCommandEvent` et met à jour les `cards` via `domain/checking`
`applyEvent` + les libellés d'activité via `domain/agents` `activityFromMessage`. Le rendu d'une
édition réutilise `domain/edition` `renderEditionHtml`/`extractBreves`.

**Vues** (12, depuis `companion.html`) : `dashboard`, `compose`, `checking`, `editor`,
`archived`, `soul`, `history`, `reader`, `agents`, `ech-editions`, `ech-breves`, `detail` (drawer).

## 3a — Fondation (premier sous-plan)

1. **Carry-overs 2.2b** :
   - Typer les retours de `Api` (`shared/types/api.ts`) avec les types domaine déjà exportés :
     `getDashboard(): Promise<Dashboard>`, `getSoulStructured(): Promise<Soul | null>`,
     `getAgents(): Promise<Agent[]>`, `sendCommand`/`archive` → les résultats `{ ok, value|error }`,
     etc. (remplace les `Promise<unknown>`).
   - `onCommandEvent(cb): () => void` renvoyant un **désabonnement** (`ipcRenderer.removeListener`)
     côté `preload/index.ts` + signature `Api` mise à jour.
   - `src/renderer/window.d.ts` : `declare global { interface Window { api: Api; breves: Api } }`.
2. **Store Zustand** `app.store.ts` : `view`, `theme`, `dashboard`, `teamsText`/`readerText`,
   `cards`, `verifyValue`/`draftValue`/`archiveValue`, `echantillons`, `editorMode`,
   `wantSoulLesson`, `toast`, `runStatus` (+ actions `setView`/`go`/`toast`/…). Testé Vitest.
3. **Styles** : `src/renderer/styles/tokens.css` (16 tokens) + `app.css` (classes), extraits
   VERBATIM de `companion.html`. Importés dans `main.tsx`.
4. **Shell + App + main.tsx + providers** : `Shell` rend l'en-tête (titre via
   `domain/navigation` `viewTitle`, bouton retour, `Stepper` via `stepper`, thème) ; `App` rend la
   page active selon `store.view` (rendu conditionnel, pas de router).
5. **Storybook** : setup `@storybook/react-vite` + import des styles globaux + 1ʳᵉ story
   (`Toast` ou `Shell`).
6. **Dashboard bout-en-bout** : page `Dashboard` (`window.api.getDashboard()` → store → rendu des
   cartes d'éditions + tuiles SOUL/historique). **Swap** : `main/index.ts` charge déjà
   `src/renderer` ; le placeholder est remplacé par `App` (shell + Dashboard).

**Critère de sortie 3a** : `npm start` ouvre le shell React avec un Dashboard fonctionnel (vraies
données via IPC), look conforme ; Storybook démarre (`npm run storybook`) avec ≥1 story ; store
testé Vitest ; `npm run typecheck`/`lint`/`test` verts.

## 3b — Pages (sous-plan suivant)

Les 11 vues restantes + le flux complet :
- **compose → checking → editor → archived** avec le **streaming** (`useCommandStream`) : cartes
  d'enquêteurs qui se cochent, statut live (horloge/activité), rédaction éditable (aperçu/édition
  via `domain/edition`), modale de correction, archivage + ingestion.
- **soul** : §1-4 éditables + §5 échantillons (liste + sélecteur 2 écrans `ech-editions` /
  `ech-breves`) + §6 journal (lecture).
- **agents** : cartes d'agents éditables (modèle/outils/mode/prompt).
- **history** + **reader** (rendu d'édition via `domain/edition`).
- **detail** : drawer d'un sujet vérifié.

Une story par nouveau composant. **Critère** : parité fonctionnelle écran par écran avec le
renderer vanilla. Après 3b, le vanilla (`hud/`) pourra être retiré en Phase 4.

## Contraintes transverses

- Comportement et look **identiques** au renderer vanilla.
- Aucune logique métier nouvelle dans les composants (réutiliser `domain/`).
- `lib/*.mjs` et `hud/*` **inchangés** (suppression = Phase 4).
- `npm run typecheck`/`lint`/`test` verts à chaque étape ; pas d'appel réseau réel en test.
- `window.api` est la **seule** frontière vers le main (pas d'accès Electron direct depuis React).

## Critères de réussite (Phase 3)

- Renderer **entièrement React**, servi par Forge à la place du placeholder.
- `window.api` typé (retours réels) ; `onCommandEvent` avec désabonnement.
- Store Zustand testé ; composants présentationnels en Storybook ; look préservé.
- Parité fonctionnelle écran par écran avec l'app vanilla.
- `npm run typecheck`/`lint`/`test` verts ; `npm start` ouvre l'app React fonctionnelle.
