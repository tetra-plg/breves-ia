# Migration Phase 3b — Vues restantes + flux (design)

**Date** : 2026-06-26
**Branche d'intégration** : `refonte-ts-react-electron`
**Spec parent** : [2026-06-26-migration-phase3-renderer-react-design.md](./2026-06-26-migration-phase3-renderer-react-design.md)
**Statut** : design validé, prêt pour plan 3b-1

## Contexte

La Phase 3a a posé la fondation React (Api typée, store Zustand, styles extraits, Shell,
Dashboard branché, Storybook) sur **Node 22 + Storybook 10**. La Phase 3b porte les **11 vues
restantes** et le **flux live** depuis [hud/renderer.mjs](../../../hud/renderer.mjs), en
**préservant comportement et look**. La logique métier est déjà dans `domain/` (checking, edition,
soul, agents, navigation, format) — 3b est surtout du présentationnel + le câblage IPC/store.

## Décisions (validées)

- **`App` : registry de vues** `Record<string, ComponentType>` (remplace le ternaire ; scale à 12 vues).
- **`useCommandStream`** : abonne `window.api.onCommandEvent`, met à jour les `cards` via
  `domain/checking.applyEvent` et les libellés d'activité via `domain/agents.activityFromMessage` ;
  cleanup via le désabonnement renvoyé par `onCommandEvent`.
- **`useRunStatus`** : horloge + activité live pendant verify/draft/archive (port de
  `beginRun`/`endRun`/`onActivity` de renderer.mjs), sans setInterval qui fuit (cleanup `useEffect`).
- **Tests** : hooks + store en **Vitest** (faux `onCommandEvent`, events injectés) ; vues en
  **Storybook** + visuel. Logique métier = `domain/` (déjà testée).
- **Découpage en 4 sous-plans** (flux d'abord), parité écran par écran à chaque sous-plan.
- **Carry-overs 3a appliqués** : typer `verifyValue`/`draftValue`/`archiveValue` du store (`unknown`
  → types `@domain/checking` + DTO draft/archive de `@shared`/`@main`) ; tooltips d'en-tête
  dynamiques + titres spéciaux `detail`/`reader` ; dédup `@keyframes spin`.

## Architecture

```text
src/renderer/
  App.tsx                # registry { dashboard, compose, checking, editor, archived, soul,
                         #   history, reader, agents, ech-editions, ech-breves, detail }
  hooks/
    useCommandStream.ts  # onCommandEvent → store (applyEvent/activity), cleanup
    useRunStatus.ts      # horloge + activité live (verify/draft/archive)
  pages/                 # une page par vue (les 11 restantes)
  components/            # EnqCard, Drawer, RunStatus, CorrectModal, EditionView, SourceRow,
                         #   CorrectionRow, AgentCard, EchantillonCard, BreveCard…
  store/app.store.ts     # étendu : actions du flux + types réels des valeurs
```

**Flux de données** : une page appelle `window.api.sendCommand`/`archive`, monte `useRunStatus`
(état live) et `useCommandStream` (cartes/activité) ; les résultats vont au store ; la navigation
suit `domain/navigation` via `go(action)`. Le rendu d'édition/brèves réutilise `domain/edition`.

## Découpage (4 sous-plans)

### 3b-1 — Registry + hooks + entrée du flux
- `App` registry ; `useCommandStream` ; `useRunStatus`.
- **compose** : zone « sujets en vrac » + détection de chips (port de `renderDetected`/`launch`).
- **checking** : lancement `sendCommand('breves-verify')`, cartes d'enquêteurs qui se cochent en
  **streaming** (`applyEvent`), filet `applyResult`, résumé (`summary`), statut live.
- **detail** (drawer) : ouverture d'un sujet vérifié (faits, alerte, source, clipping).
- Tests Vitest : `useCommandStream` (events → cards), `useRunStatus` (horloge/activité), store étendu.

### 3b-2 — Rédaction + archivage
- **editor** : `sendCommand('breves-draft')`, aperçu/édition (toggle, `domain/edition` `renderEditionHtml`),
  liste corrections + sources, modale de correction (feedback + leçon SOUL).
- **archived** : `window.api.archive`, étapes d'archivage + ingestion, newsletter finale, copie Teams.

### 3b-3 — SOUL + agents
- **soul** : §1-4 éditables + enregistrement, §5 échantillons (liste + retrait), §6 journal (lecture).
- **ech-editions** / **ech-breves** : sélecteur d'échantillon en 2 écrans (édition → brève via
  `domain/edition.extractBreves`), ajout à §5 (max 3).
- **agents** : cartes d'agents éditables (modèle/outils/mode/prompt), enregistrement.

### 3b-4 — Historique + lecteur
- **history** : liste des éditions archivées.
- **reader** : lecture d'une édition (`window.api.readEdition` + `domain/edition.renderEditionHtml`).

## Contraintes transverses

- Comportement et look **identiques** au renderer vanilla (parité écran par écran).
- `window.api` = seule frontière ; aucun `import 'electron'` dans `src/renderer`.
- Réutiliser `domain/` ; aucune logique métier nouvelle dans les composants.
- `lib/*.mjs`/`hud/*` **inchangés** (suppression = Phase 4).
- `npm run typecheck`/`lint`/`test` verts (sous Node 22) ; pas d'appel réseau réel en test
  (le SDK n'est jamais appelé en test ; `onCommandEvent` est injecté).
- Pas de fuite : `setInterval`/abonnements nettoyés dans les `useEffect`.

## Critères de réussite (Phase 3b)

- Les 11 vues portées en React, **parité fonctionnelle écran par écran** avec le vanilla.
- Flux complet opérationnel : Dashboard → compose → checking (streaming) → editor → archived,
  + soul/agents/history/reader/detail.
- Hooks + store testés (Vitest) ; vues en Storybook ; look préservé.
- `npm run typecheck`/`lint`/`test` verts ; `npm start` ouvre l'app React complète.
- Après 3b : le renderer vanilla (`hud/`) est **remplaçable** (suppression = Phase 4).
