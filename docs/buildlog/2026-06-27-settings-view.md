# settings-view (build log) : vue Réglages « Var » + config persistante + pickers natifs

**Date** : 2026-06-27
**Spec** : docs/superpowers/specs/2026-06-27-settings-view-design.md
**Plan** : docs/superpowers/plans/2026-06-27-settings-view.md
**Objectif** : Vue de réglages dans l'app packagée pour configurer les 3 chemins essentiels (BoilingBrain, repo SOUL/agents, binaire claude) via pickers natifs macOS, avec validation visuelle et persistance hors bundle ; + rework header (historique en lien, boutons Réglages/Quitter).
**Statut** : livré — mergé sur `main` (`abf12e5..b79b94c`), poussé sur origin.

## Livré

| Livrable | Fichier | Notes |
|---|---|---|
| Persistance config | `src/main/io/config.ts` | `config.json` dans userData + `pathValid` (dossier / fichier exécutable) |
| Résolution + sources | `src/main/io/env.ts` | `resolveSetting` (env > file > défaut), `DEFAULTS`/`ENV_KEYS`, `buildWikiMcp` |
| Application à chaud | `src/main/engine.ts` | `applyConfig` mute `deps` + recompute `wikiMcp` ; `defaultDeps(env, userConfig)` |
| Handlers IPC | `src/main/ipc/settings.handlers.ts` | `getSettings`/`validatePath`/`pickPath`/`saveSettings`/`quitApp` ; save fail-closed |
| Bridge + boot | `src/main/ipc/system.handlers.ts`, `src/main/index.ts` | `SystemBridge.pickPath` (dialog natif) + `quit` ; init config au 1er lancement |
| Contrat partagé | `src/shared/types/{api,ipc}.ts`, `src/preload/index.ts` | `SettingsState`/`SettingKey` source unique, 5 canaux + 5 méthodes preload |
| Navigation | `src/domain/navigation.ts` | vue `settings` + `goSettings` + `viewTitle` |
| Design system | `components/ui/Input.{tsx,module.css,stories}`, `StatusDot` (+état `error`), `components/PathField.*` | 3 composants avec stories (CSF3) |
| Page Réglages | `src/renderer/pages/Settings.tsx`, `App.tsx` | compose `PathField`×3, validation live, champs env verrouillés |
| Header + dashboard | `src/renderer/layouts/Shell.tsx`, `pages/Dashboard.tsx` | ✦ Soul · ⚙ Agents · ⛭ Réglages · ◑ Thème · ✕ Quitter ; lien « voir l'historique » ; retrait `/breves-ia` |
| Doc env | `.env.example` | `BREVES_REPO_DIR`, `BREVES_CLAUDE_BIN` documentés |

## Validation RÉELLE

- ✅ **196 tests** (45 fichiers) verts sur `main` mergé (`npx vitest run`).
- ✅ `npm run typecheck` + `npm run lint` verts (hook Husky pre-commit à chaque commit).
- ✅ `npm run build-storybook` : « Storybook build completed successfully » (Input, StatusDot `error`, PathField inclus).
- ✅ `npm run make` : DMG `Brèves IA-0.1.0-arm64.dmg` construit (darwin/arm64).
- ✅ App réinstallée via `scripts/install-local.sh` (0 quarantaine), lancée → **3 process vivants, aucun crash report**.
- ⏳ Vérif visuelle Electron (pickers Finder, pastilles, application à chaud, bouton Quitter) : manuelle utilisateur.

## Gotchas de la passe

- **Barrière typecheck T5↔T6** : `SystemBridge` gagne `pickPath`/`quit` et `registerAllHandlers` gagne `userDataDir` — les deux tâches devaient atterrir dans **un seul commit** (sinon le hook pre-commit échoue à mi-chemin). Implémentées ensemble.
- **`SettingKey` séquencé** : défini localement dans env.ts en T2, puis déplacé vers `@shared/types/api` en T5 (source unique) avec re-export depuis env.ts pour rétro-compat.
- **`tests/domain/navigation.test.mjs` préexistait** alors que le plan le disait « (neuf) » → 3 tests ajoutés au fichier existant ; outcome correct, RED→GREEN vérifié.
- **Fix de revue T5+6** : `saveSettings` ne filtrait pas les clés inconnues (`KINDS[key]` undefined) → guard `if (!(key in KINDS)) continue;` ajouté (commit `b4cd0ef`).

## Décisions / restes

- **Application à chaud** retenue (vs redémarrage) : les handlers lisent `deps.<champ>` à chaque appel, donc muter `deps` en place suffit ; `wikiMcp` recomputé sur changement de `bbDir`.
- **Persistance JSON** dans userData (pas de dépendance type electron-store), précédence env > fichier > défaut.
- **Picker = chemin configurable** (pas de bundling du binaire claude de 216 Mo) — cohérent avec `BREVES_BB_DIR`/`BREVES_REPO_DIR`.
- Follow-ups non bloquants (revue finale opus) : init 1er lancement fige une valeur env dans config.json (surprise de précédence latente, plan-mandated) ; quelques styles inline résiduels (lien historique, `fontSize:11`/`gap:18`) vs règle no-inline ; rafraîchir aussi soul/agents après save (seul le dashboard l'est) ; commentaire stale `nav.test.mjs` L1.
- Méthode : exécution **subagent-driven** (13 tâches, implémenteur + revue par tâche, fix loop, revue finale whole-branch opus = READY TO MERGE).
