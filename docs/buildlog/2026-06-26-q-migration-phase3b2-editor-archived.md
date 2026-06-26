# migration-phase3b2-editor-archived (build log) : rédaction + archivage React

**Date** : 2026-06-26
**Spec** : [docs/superpowers/specs/2026-06-26-migration-phase3b-vues-flux-design.md](../superpowers/specs/2026-06-26-migration-phase3b-vues-flux-design.md)
**Plan** : [docs/superpowers/plans/2026-06-26-migration-phase3b2-editor-archived.md](../superpowers/plans/2026-06-26-migration-phase3b2-editor-archived.md)
**Objectif** : Porter en React les vues **editor** (rédaction `breves-draft`, aperçu/édition, corrections + sources, modale de correction) et **archived** (archivage + ingestion, étapes, newsletter finale, copie Teams), 1:1 avec le renderer vanilla. + traiter les carry-overs 3b-1.
**Statut** : livré (Phase 3b-2). Branche `refonte-ts-react-electron` (poussée). Revue finale opus : « Ready for 3b-3 = Yes ». **Validation visuelle finale à confirmer par l'utilisateur** (`npm start`).

## Livré

| Livrable | Fichier | Notes |
|---|---|---|
| Helpers `niveau` partagés | `src/renderer/components/niveau.ts` | extraits d'EnqCard/Drawer ; réutilisés par CorrectionRow (carry-over 3b-1) |
| Carry-overs 3b-1 | `EnqCard.tsx`, `Drawer.tsx`, `Compose.tsx`, `useCommandStream.ts`, `shared/schemas/outputs.ts` | Drawer cast `{raw?}` + `faits:string[]` (plus de `String(f)`) ; Compose en sélecteurs + reset draft/archive ; `TOPIC_TYPES` couplé à `TopicEvent['type']` ; `topicSchema.faits = z.array(z.string())` |
| Store | `src/renderer/store/app.store.ts` | action `setWantSoulLesson` |
| Composants présentationnels | `CorrectionRow.tsx`, `SourceRow.tsx`, `CorrectModal.tsx`, `ArchiveStep.tsx` (+ stories) | ports 1:1 du markup legacy ; classes CSS existantes |
| Page Editor | `src/renderer/pages/Editor.tsx` | `breves-draft` au montage, aperçu (`renderEditionHtml`)/édition (textarea contrôlé), corrections+sources, modale → re-rédige, Valider → `archived` |
| Page Archived | `src/renderer/pages/Archived.tsx` | `window.api.archive` au montage, étapes (`ArchiveStep`), newsletter, copie Teams, ingest-fail toast, échec→`editor` |
| Registry | `src/renderer/App.tsx` | vues `editor` + `archived` enregistrées |

**Points clés** :
- **Déclenchement au montage** : Editor rédige (`runDraft`) et Archived archive (`runArchive`) dans un `useEffect` mount-once gardé par `useRef` + un check `useAppStore.getState().draftValue`/`.archiveValue` — fidèle au legacy (`go('toEditor'); runDraft()` et `runArchive` qui navigue puis travaille). Lectures à chaud via `getState()` pour éviter les closures périmées.
- **Anti-double-fire** : le `ref` bascule **avant** le premier `await`, donc le double-invoke StrictMode (React 19, activé dans `main.tsx`) tombe sur le `return` précoce. Le check store évite aussi une re-rédaction/ré-archivage sur le chemin échec-archive → editor → retour.
- **Textarea contrôlé** (`value={teamsText}`/`onChange→setTeamsText`) : rend le `syncTeamsText()` impératif du legacy inutile.
- **Pas de fuite** : les effets de montage n'abonnent rien (pas de cleanup à faire) ; l'horloge `runStatus` reste dans `App`. Les écritures store post-`await` après démontage ciblent le store global (pas de setState sur composant démonté).
- **Parité** : classes/inline repris de companion.html ; rendu d'édition/newsletter via `domain/edition.renderEditionHtml` (`dangerouslySetInnerHTML`, comme le `.innerHTML` legacy, échappement déjà fait par `domain/edition`).

## Validation RÉELLE (sous Node 22)

- `npm test` : ✅ **27 fichiers / 152 tests** (ajouts : `niveau.test.mjs`, `app.store.editor.test.mjs`).
- `npm run typecheck` : ✅ 0. `npm run lint` : ✅ 0 (pristine — directive `eslint-disable` inutilisée retirée d'Archived).
- `npm run build-storybook` : ✅ (77 modules ; stories CorrectionRow/SourceRow/CorrectModal/ArchiveStep).
- Sanity build `npm start` : ✅ `.vite/build/main.cjs` + `preload.cjs` présents, grep d'erreurs vide.
- `lib/*.mjs`/`hud/*` : **inchangés**. Aucun `import 'electron'` dans `src/renderer`. `SOUL.md` non stagé.
- Exécution subagent-driven : 3 lots + revue par lot + revue finale opus. **Push après chaque commit** (6 commits : `08364c5`..`c62bb48`).

## Gotchas de la passe

- **`TOPIC_TYPES.includes(e.type)`** : le typage `ReadonlyArray<TopicEvent['type']>` impose un cast `as ReadonlyArray<string>` au site d'appel (limitation TS de `Array.prototype.includes` sur tableaux `readonly` typés) — élargissement sûr, pas d'`any`/`ts-ignore`.
- **Directive `eslint-disable-next-line react-hooks/exhaustive-deps`** : nécessaire dans `Editor.tsx` (l'effet référence `runDraft`) mais **inutile** dans `Archived.tsx` (l'effet ne déclenche aucun warning) → retirée pour un lint pristine.

## Décisions / restes

- **Minors (revue finale, non bloquants)** : écritures async-after-unmount bénignes (store global, pas de fuite) — un commentaire d'une ligne suffirait ; « Nouvelle édition » (`go('goCompose')`) ne réinitialise qu'à la prochaine « Lancer » (fidèle au legacy `btn-new2`) ; story `CorrectModal` passe `onSend: () => {}` (params extra ignorés, inoffensif).
- **Carry-over restant (hors-scope lib)** : `lib/contracts.mjs` valide `faits` comme tableau mais pas l'élément `string` (le schéma Zod, lui, exige `string[]`) — à durcir lors d'une passe lib future.
- **Reste migration** : 3b-3 (soul/agents), 3b-4 (history/reader), Phase 4 (suppression `.mjs`/`hud`), Phase 5 (qualité + packaging).
