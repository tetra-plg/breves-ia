# Vue Settings (« Var ») + config persistante — design

**Date** : 2026-06-27
**Statut** : design validé, prêt pour le plan d'implémentation

## Objectif

Donner une **vue de réglages** dans l'app packagée pour configurer les chemins essentiels
(BoilingBrain, repo SOUL/agents, binaire claude), via des **pickers natifs macOS** et avec
**validation visuelle**, persistés hors du bundle. En profiter pour un petit **rework du header**
(historique en lien, bouton Réglages, bouton Quitter — la fenêtre est `frame: false`).

## Contexte

- La config vient de `loadEngineConfig` ([env.ts](../../../src/main/io/env.ts)) : `bbDir`, `repoDir`,
  `claudeBin`, `wikiMcp`. Précédence actuelle = variable d'env, sinon **défaut absolu en dur**.
  Aucune persistance utilisateur (le `.env` est lu depuis `process.cwd()`, cassé en packagé).
- `deps` (`EngineDeps`) est construit **une fois** au boot dans [index.ts](../../../src/main/index.ts)
  et passé à `registerAllHandlers(ipc, deps, sys)`. Les handlers lisent `deps.<champ>` **à chaque
  appel** → muter `deps` en place applique un changement **à chaud**.
- Navigation : `VIEWS` / `ACTIONS` / `viewTitle` dans [navigation.ts](../../../src/domain/navigation.ts).
  Le header ([Shell.tsx](../../../src/renderer/layouts/Shell.tsx)) porte ✦ Soul, ⏱ Historique,
  ⚙ Agents, ◑ Thème, et un sous-titre `rédacteur en chef · /breves-ia`.
- Fenêtre **`frame: false`** → aucun contrôle natif de fermeture.

## Décisions (issues du brainstorming)

| Sujet | Décision |
|---|---|
| Variables exposées | **3 chemins** : `bbDir` (dossier), `repoDir` (dossier), `claudeBin` (fichier). Pas les chemins wiki. |
| Persistance | **`config.json` dans `app.getPath('userData')`**. Précédence lecture : **env > config.json > défaut en dur**. |
| Premier lancement | Si `config.json` absent → **l'initialiser** avec les valeurs effectives par défaut. |
| Application | **Immédiate**, sans redémarrage (mutation de `deps` en place). |
| Validation | **Pastille verte/rouge** : dossier existe / fichier existe + exécutable. |
| Picker | **Dialog natif macOS** (`dialog.showOpenDialog`), fichiers cachés visibles. |
| Header | Retirer ⏱ ; retirer `/breves-ia` du sous-titre ; ajouter ⛭ Réglages et ✕ Quitter (extrême droite). |
| Historique | Lien **« voir l'historique »** à droite de l'en-tête « Éditions récentes » du Dashboard. |

## Architecture

### Persistance & précédence (main)

Nouveau module `src/main/io/config.ts` :

- `type UserConfig = { bbDir?: string; repoDir?: string; claudeBin?: string }`.
- `configPath(userDataDir): string` → `<userData>/config.json`.
- `readUserConfig(userDataDir): UserConfig` → parse JSON, `{}` si absent/illisible.
- `writeUserConfig(userDataDir, cfg): void` → écrit le JSON (création dossier si besoin).

`loadEngineConfig(env, userConfig?)` ([env.ts](../../../src/main/io/env.ts)) évolue : précédence
**`env.BREVES_* ` > `userConfig.<champ>` > défaut en dur** pour `bbDir`, `repoDir`, `claudeBin`.
`wikiMcp` reste dérivé de `bbDir`.

Au boot ([index.ts](../../../src/main/index.ts)) : lire `userData`, charger `userConfig`, **si absent
l'initialiser** (`writeUserConfig` avec les valeurs effectives), construire `deps`.

### Application à chaud (main)

`applyConfig(deps, partial: UserConfig): void` (dans **engine.ts**, car il mute `EngineDeps`) :
- met à jour `deps.bbDir/repoDir/claudeBin` pour les champs fournis ;
- **recompute `deps.wikiMcp`** depuis le nouveau `bbDir` (ses args embarquent `bbDir`).

Le handler `saveSettings` : valide → `writeUserConfig` (merge) → `applyConfig(deps, partial)`. Comme
tous les handlers partagent la **même référence `deps`**, les appels suivants voient les nouvelles valeurs.

### IPC (main) — nouveau `src/main/ipc/settings.handlers.ts`

On **étend l'interface `SystemBridge`** ([system.handlers.ts](../../../src/main/ipc/system.handlers.ts))
avec deux méthodes, **implémentées dans index.ts** (qui a `win`/`app`) :
- `pickPath(kind: 'directory' | 'file'): Promise<string | null>` → `dialog.showOpenDialog(win, { properties })`,
  `['openDirectory']` ou `['openFile']` (+ option fichiers cachés).
- `quit(): void` → `app.quit()`.

Signature d'enregistrement : `registerSettingsHandlers(ipc, deps, sys, userDataDir, env)` — `deps` pour
les valeurs courantes + `applyConfig`, `sys` pour pickPath/quit, `userDataDir` pour lire/écrire
`config.json`, `env` pour détecter la `source`. Appelé depuis
[ipc/index.ts](../../../src/main/ipc/index.ts) (dont la signature gagne `userDataDir`).

Handlers IPC :
- `getSettings()` → pour chaque champ `{ value, source: 'env'|'file'|'default', valid: boolean }`.
  Un champ piloté par une variable d'env est marqué `source:'env'` → **lecture seule** côté UI.
- `validatePath({ path, kind })` → `boolean` (dossier existe ; fichier existe + bit exécutable).
- `pickPath({ kind })` → `string | null`.
- `saveSettings(partial: UserConfig)` → `{ ok: boolean; error?: string }` (valide, persiste, applique).
- `quitApp()` → ferme l'app.

Câblage : `IPC` ([ipc.ts](../../../src/shared/types/ipc.ts)), `BridgeApi` ([api.ts](../../../src/shared/types/api.ts)),
[preload/index.ts](../../../src/preload/index.ts), enregistrement dans
[ipc/index.ts](../../../src/main/ipc/index.ts).

### Renderer

- **Navigation** : ajouter `'settings'` à `VIEWS`, action `goSettings: 'settings'`, cas `viewTitle('settings') = 'Réglages'`.
- **Design system** : tout nouveau composant a sa story (`X.tsx` + `.module.css` + `.stories.tsx`, CSF3). On ajoute une primitive `Input` (il n'en existe pas), on étend `StatusDot` d'un état `error` (rouge) pour la pastille, et un composite présentationnel `PathField` (label · pastille · `Input` · bouton « Parcourir… »). Pas de style inline ; tokens de `styles/tokens.css`.
- **Page** `src/renderer/pages/Settings.tsx` : compose `PathField` ×3 + bouton « Enregistrer ».
  Charge via `getSettings()`. À chaque changement (saisie ou pick) → `validatePath` pour la pastille.
  Bouton **« Enregistrer »** → `saveSettings` → toast + rafraîchit dashboard/soul/agents. Champs `source:'env'` désactivés.
- **Store** ([app.store.ts](../../../src/renderer/store/app.store.ts)) : intégrer la vue `settings` au routage de page.
- **Shell** ([Shell.tsx](../../../src/renderer/layouts/Shell.tsx)) :
  - retirer le bouton ⏱ ;
  - sous-titre dashboard → `rédacteur en chef` (sans `/breves-ia`) ;
  - boutons config : ✦ Soul · ⚙ Agents · ⛭ Réglages (`go('goSettings')`) · ◑ Thème ;
  - **✕ Quitter à l'extrême droite** → `window.api.quitApp()`.
- **Dashboard** ([Dashboard.tsx](../../../src/renderer/pages/Dashboard.tsx)) : lien **« voir l'historique »**
  aligné à droite de l'en-tête « Éditions récentes » → `go('goHist')`.

### Divers
- Compléter [.env.example](../../../.env.example) : `BREVES_REPO_DIR`, `BREVES_CLAUDE_BIN` (+ commentaires).

## Forme des données

```ts
type SettingKey = 'bbDir' | 'repoDir' | 'claudeBin';
type SettingField = { value: string; source: 'env' | 'file' | 'default'; valid: boolean };
type SettingsState = Record<SettingKey, SettingField>;
```

`claudeBin` est de type fichier (validation = existe + exécutable) ; `bbDir`/`repoDir` de type dossier.

## Gestion d'erreurs
- `config.json` illisible → traité comme vide (défauts), pas de crash.
- `saveSettings` avec chemin invalide → `{ ok:false, error }`, rien n'est persisté ni appliqué.
- `pickPath` annulé (Finder fermé) → `null`, aucun changement.
- Écriture `config.json` impossible → `{ ok:false, error }` remontée en toast.

## Tests (vitest)
- **config.ts** : `readUserConfig` (absent/illisible/valide) ; `writeUserConfig` round-trip.
- **env.ts** : précédence `loadEngineConfig` (env > file > défaut) sur les 3 champs.
- **applyConfig** : mutation des champs + recompute `wikiMcp` quand `bbDir` change.
- **validation** : dossier existe ; fichier existe + exécutable ; chemins absents → invalide.
- **navigation** : `nextView(_, 'goSettings') === 'settings'`, `viewTitle('settings')`.
- (UI Settings/Shell : couverture légère, le gros est dans la logique main/domaine.)

## Hors périmètre (YAGNI)
- Chemins wiki MCP dans l'UI (gérés par défaut).
- Réglages non-chemins (modèle, clé API) — le thème reste géré ailleurs.
- Import/export de config, profils multiples.

## Fichiers touchés (estimation)
`src/main/io/config.ts` (neuf), `src/main/io/env.ts`, `src/main/engine.ts` (applyConfig + EngineDeps déjà ok),
`src/main/index.ts` (boot + bridge), `src/main/ipc/settings.handlers.ts` (neuf), `src/main/ipc/index.ts`,
`src/main/ipc/system.handlers.ts` (ou bridge étendu), `src/shared/types/ipc.ts`, `src/shared/types/api.ts`,
`src/preload/index.ts`, `src/domain/navigation.ts`, `src/renderer/pages/Settings.tsx` (neuf),
`src/renderer/store/app.store.ts`, `src/renderer/layouts/Shell.tsx`, `src/renderer/pages/Dashboard.tsx`,
`.env.example`.
