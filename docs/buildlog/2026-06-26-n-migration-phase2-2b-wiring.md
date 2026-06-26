# migration-phase2-2b-wiring (build log) : wiring Electron (ipc/main/preload/smoke)

**Date** : 2026-06-26
**Spec** : [docs/superpowers/specs/2026-06-26-migration-phase2-domaine-coeur-electron-design.md](../superpowers/specs/2026-06-26-migration-phase2-domaine-coeur-electron-design.md)
**Plan** : [docs/superpowers/plans/2026-06-26-migration-phase2-2b-wiring-electron.md](../superpowers/plans/2026-06-26-migration-phase2-2b-wiring-electron.md)
**Objectif** : Câbler le cœur Electron typé (2.2a) au runtime Forge : handlers IPC par domaine, `main/index.ts` réel, `preload` → `window.api` (+ alias), externalisation du SDK, smoke de boot. Comportement inchangé.
**Statut** : livré (Phase 2.2b). Branche `refonte-ts-react-electron`. **Clôt la Phase 2.** Revue finale opus : « Ready for Phase 3 = Yes ».

## Livré

| Livrable | Fichier |
|---|---|
| Types IPC + contrat window.api | `src/shared/types/ipc.ts`, `src/shared/types/api.ts` |
| Handlers par domaine | `src/main/ipc/{command,dashboard,soul,agents,system}.handlers.ts` + `index.ts` |
| Preload | `src/preload/index.ts` (`window.api` + alias `window.breves`) |
| Entrée Electron réelle | `src/main/index.ts` (fenêtre + env + handlers + hook smoke) |
| Externalisation SDK | `vite.main.config.ts` (`rollupOptions.external`) |
| Smoke de boot | `scripts/smoke-boot.mjs` + `npm run smoke` |

**Points clés** :
- **Handlers headless-testables** : `registerXHandlers(ipc, deps)` prennent un `ipc` injecté (`{ handle }`) → tests Vitest sans Electron, routage vers le moteur 2.2a via deps mockées. Electron n'est importé QUE dans `main/index.ts` + `preload/index.ts`. Le cast `ipcMain as unknown as IpcLike` est confiné à `main/index.ts`.
- **SDK** : externalisé du bundle + `import()` dynamique. Le hook smoke (`BREVES_SMOKE=1`) le charge dans le vrai main puis quitte.
- **Parité 1:1** avec les 11 handlers et la config fenêtre de `hud/main.mjs`.

## Validation RÉELLE

- `npm test` : ✅ **22 fichiers / 135 tests** (3 nouveaux fichiers de tests headless de handlers).
- `npm run typecheck` : ✅ exit 0. `npm run lint` : ✅ exit 0.
- `npm run smoke` : ✅ **`SMOKE_SDK_OK`** — le SDK se charge dans le main Forge réel (run live, pas headless-bloqué).
- `npm start` : `.vite/build/main.cjs` (152 KB) produit, log de boot sans erreur.
- `lib/*.mjs` et `hud/*` : **inchangés**.
- Exécution subagent-driven : 2 lots (A: types+handlers, B: preload/vite+main/smoke) + revue par lot + revue finale opus.

## Gotchas de la passe

- **Variance `IpcLike`** : pour garder les handlers testables (ipc injecté) tout en branchant le vrai `ipcMain`, on type un `IpcLike` minimal et on caste `ipcMain as unknown as IpcLike` à l'unique point de wiring (`main/index.ts`).
- **Hook smoke** : placé AVANT l'enregistrement des handlers/fenêtre (`return` après le `import()` SDK) → prouve le boot SDK sans démarrer l'UI ; pas de `window-all-closed` parasite.

## Décisions / restes

- **Carry-overs Phase 3** (revue finale) :
  - **Typer les retours `Api`** : aujourd'hui `Promise<unknown>`. Remplacer par les types domaine déjà exportés (`Dashboard`, `Soul`, `{ok,error}`, `Agent[]`) → contrat réel pour le renderer React.
  - **`onCommandEvent` doit renvoyer un désabonnement** (`ipcRenderer.removeListener`) pour le cleanup `useEffect` (sinon fuite de listeners en StrictMode/HMR).
  - Swap placeholder→React **non bloqué** : `createWindow` charge déjà le dev-server Vite / le HTML buildé ; déposer une vraie entrée React dans `src/renderer` ne touche ni main ni preload.
- **Reste** : Phase 3 (renderer React sur `window.api`), Phase 4 (suppression des `.mjs`/`hud/` legacy), Phase 5 (qualité plein + packaging Forge makers + `repoDir` app packagée).

## État global de la refonte (fin Phase 2)

`main` ← Phase 1 (fondation, mergée). Branche `refonte-ts-react-electron` : **Phase 2 entièrement livrée** — spike SDK (2.0), domaine pur + Zod (2.1), backend cœur Electron (2.2a), wiring Electron (2.2b). Le cœur est 100% TS strict, testé, le SDK boote dans le main réel, et `window.api` typé est prêt pour React.
