# Plan de tests — Module reglages

> Module : reglages · reverse (constat) · cartographié à `4ce7095`
> Rôle : QA Module (`tests-plan`) · Cycle 1.
> Chaque assertion est tracée. Réfère la stratégie globale : `docs/project/tests.md`.
> Les TC-* existants sont constatés dans les fichiers de test ; les TC-* manquants sont signalés.

---

## Stratégie (contexte module)

Le module reglages repose sur **trois couches testables** :

| Couche | Fichiers | Testable sans Electron ? |
|---|---|---|
| IO (`config.ts`, `env.ts`) | `tests/main/config.test.mjs`, `tests/main/env.test.mjs` | Oui (Node pur) |
| Handlers IPC (`settings.handlers.ts`, `system.handlers.ts`) | `tests/main/settings.handlers.test.mjs`, `tests/main/system.handlers.test.mjs` | Oui (IPC fakée) |
| UI React (`Settings.tsx`, `PathField.tsx`) | Aucun fichier de test à HEAD | Non testé (**GAP-16**) |

La stratégie globale (Vitest, env Node, hook pre-commit) s'applique intégralement.
Voir `docs/project/tests.md`.

---

## TC existants — `tests/main/config.test.mjs`

### TC-CFG-01 — `readUserConfig` : fichier absent → `{}`
```
config.test.mjs:9-12
Vérifie : readUserConfig(dossier vide) === {}
```

### TC-CFG-02 — `writeUserConfig` + `readUserConfig` : round-trip
```
config.test.mjs:14-18
Vérifie : writeUserConfig(d, {bbDir:'/a',repoDir:'/b',claudeBin:'/c'})
          → readUserConfig(d) deepEqual {bbDir:'/a',repoDir:'/b',claudeBin:'/c'}
```

### TC-CFG-03 — `readUserConfig` : JSON corrompu → `{}`
```
config.test.mjs:20-24
Vérifie : writeFileSync(config.json, '{pas du json') → readUserConfig → {}
```

### TC-CFG-04 — `pathValid` directory : existant → `true`, absent → `false`
```
config.test.mjs:26-30
Vérifie : pathValid(dossier_tmp, 'directory') === true
          pathValid('/dossier/absent', 'directory') === false
```

### TC-CFG-05 — `pathValid` file : exécutable → `true`, non-exécutable → `false`
```
config.test.mjs:32-38
Vérifie : chmod 0o755 → pathValid(exe, 'file') === true
          chmod 0o644 → pathValid(plain, 'file') === false
```

---

## TC existants — `tests/main/env.test.mjs`

### TC-ENV-01 — `bbDir` par défaut
```
env.test.mjs:5-7
Vérifie : loadEngineConfig({}).bbDir === '/Users/pleguern/Workspace/BoilingBrain'
Note : valeur hardcodée — test lié à la machine auteur (GAP-01)
```

### TC-ENV-02 — `bbDir` surchargé par `BREVES_BB_DIR`
```
env.test.mjs:8-10
Vérifie : loadEngineConfig({ BREVES_BB_DIR: '/tmp/bb' }).bbDir === '/tmp/bb'
```

### TC-ENV-03 — `repoDir` surchargé par `BREVES_REPO_DIR`
```
env.test.mjs:11-13
Vérifie : loadEngineConfig({ BREVES_REPO_DIR: '/tmp/repo' }).repoDir === '/tmp/repo'
```

### TC-ENV-04 — `repoDir` par défaut (absolu, se termine par `breves-ia`)
```
env.test.mjs:14-18
Vérifie : r.startsWith('/') && r.endsWith('breves-ia')
```

### TC-ENV-05 — `wikiMcp` pointe le script Python du wiki
```
env.test.mjs:19-24
Vérifie : type='stdio', command='/Users/pleguern/.local/pipx/venvs/fastmcp/bin/python'
          args=['/tmp/bb/scripts/mcp/mcp-wiki.py']
Note : chemin Python hardcodé — lié machine auteur (GAP-01)
```

### TC-ENV-06 — `wikiMcp` surchargeable via `BREVES_WIKI_PY` / `BREVES_WIKI_SCRIPT`
```
env.test.mjs:25-29
Vérifie : command='/py', args=['/s.py']
```

### TC-ENV-07 — `parseEnv` : parse `KEY=val`, ignore `#` et lignes vides, retire guillemets
```
env.test.mjs:30-33
Input  : '# commentaire\nA=1\n\nB="deux"\nC=\'trois\'\nMAUVAIS'
Résultat : { A:'1', B:'deux', C:'trois' }
```

### TC-ENV-08 — `loadEnvFile` : n'écrase pas une variable déjà définie
```
env.test.mjs:34-39
Vérifie : env.A='déjà' → loadEnvFile('/chemin/inexistant', env) → env.A inchangé, applied={}
```

### TC-ENV-09 — `resolveSetting` : hiérarchie `env > file > défaut`
```
env.test.mjs:41-46
Vérifie :
  env=bbDir: source='env', value='/env'
  file=bbDir seulement: source='file'
  ni env ni file: source='default'
```

### TC-ENV-10 — `loadEngineConfig` applique `userConfig`
```
env.test.mjs:48-52
Vérifie : loadEngineConfig({}, {repoDir:'/my/repo', claudeBin:'/my/claude'})
          → repoDir='/my/repo', claudeBin='/my/claude'
```

### TC-ENV-11 — `buildWikiMcp` dérive `args[0]` de `bbDir`
```
env.test.mjs:54-57
Vérifie : buildWikiMcp({}, '/BB').args[0] === '/BB/scripts/mcp/mcp-wiki.py'
```

---

## TC existants — `tests/main/settings.handlers.test.mjs`

### TC-SET-01 — `buildSettingsState` : source `env` quand variable définie
```
settings.handlers.test.mjs:16-20
Input  : env={ BREVES_BB_DIR:'/x' }, userConfig={}
Vérifie : st.bbDir.source==='env', st.bbDir.value==='/x'
```

### TC-SET-02 — `buildSettingsState` : source `file` + `valid=true` quand dossier existe
```
settings.handlers.test.mjs:22-27
Input  : userConfig={ repoDir: dossier_tmp_existant }
Vérifie : st.repoDir.source==='file', st.repoDir.valid===true
```

### TC-SET-03 — `saveSettings` : persiste + applique quand chemins valides
```
settings.handlers.test.mjs:29-40
Input  : patch={ bbDir: valid_dir, repoDir: valid_dir }
Vérifie : r.ok===true
          deps.bbDir === valid_dir
          deps.wikiMcp.args[0] === join(valid_dir, 'scripts/mcp/mcp-wiki.py')
          readUserConfig(userData).bbDir === valid_dir
```

### TC-SET-04 — `saveSettings` : chemin invalide → `ok:false`, rien persisté
```
settings.handlers.test.mjs:42-50
Input  : patch={ bbDir: '/n/existe/pas' }
Vérifie : r.ok===false
          readUserConfig(userData) deepEqual {}   [rien écrit]
```

### TC-SET-05 — `getSettings` handler : renvoie un `SettingsState`
```
settings.handlers.test.mjs:52-59
Input  : env={ BREVES_BB_DIR:'/x' }
Vérifie : st.bbDir.source==='env'
```

---

## TC existants — `tests/main/system.handlers.test.mjs`

### TC-SYS-01 — `copy` / `open-external` (https seulement) / `hide-window`
```
system.handlers.test.mjs:8-25
Vérifie :
  copy('salut') → writeClipboard('salut'), retourne true
  open-external('https://ok.com') → openExternal appelé
  open-external('javascript:alert(1)') → openExternal NON appelé (URL non-http ignorée)
  hide-window → hideWindow appelé 1 fois
```

---

## Matrice de couverture du module

| Fonctionnalité | TC(s) couvrant | Statut |
|---|---|---|
| Hiérarchie env > file > défaut | TC-ENV-09, TC-SET-01, TC-SET-02, TC-SET-05 | Couvert |
| Valeur par défaut bbDir | TC-ENV-01 | Couvert (hardcodé machine auteur) |
| Surcharge par variable d'env | TC-ENV-02, TC-ENV-03, TC-ENV-06 | Couvert |
| Surcharge par userConfig | TC-ENV-10 | Couvert |
| `pathValid` directory | TC-CFG-04 | Couvert |
| `pathValid` file exécutable | TC-CFG-05 | Couvert |
| `pathValid` chemin vide | Non testé | **Manquant** |
| Round-trip config.json | TC-CFG-02 | Couvert |
| Config corrompue → `{}` | TC-CFG-03 | Couvert |
| Config absente → `{}` | TC-CFG-01 | Couvert |
| `parseEnv` format | TC-ENV-07 | Couvert |
| `loadEnvFile` no-overwrite | TC-ENV-08 | Couvert |
| `buildWikiMcp` dérive script de bbDir | TC-ENV-11, TC-SET-03 | Couvert |
| `buildWikiMcp` surcharge BREVES_WIKI_* | TC-ENV-06 | Couvert |
| saveSettings valide avant d'écrire | TC-SET-04 | Couvert |
| saveSettings filtre clés inconnues | Non testé | **Manquant** |
| saveSettings → applyConfig (mutation deps) | TC-SET-03 | Couvert |
| open-external garde https seulement | TC-SYS-01 | Couvert |
| copy retourne `true` | TC-SYS-01 | Couvert |
| Page `Settings.tsx` (UI) | Aucun | **Non testé (GAP-16)** |
| Composant `PathField.tsx` | Aucun | **Non testé (GAP-16)** |
| Handler `quit-app` | Aucun (pas de test dédié) | **Manquant** |

---

## TC manquants (signalés, non implémentés à HEAD)

| TC-ID | Cas | Fichier cible suggéré |
|---|---|---|
| TC-CFG-06 | `pathValid('')` → `false` (chemin vide explicitement) | `config.test.mjs` |
| TC-SET-06 | `saveSettings` avec clé inconnue dans patch → ignorée, pas d'erreur | `settings.handlers.test.mjs` |
| TC-SET-07 | `quit-app` handler appelle `sys.quit()` | `settings.handlers.test.mjs` |
| TC-UI-01 | `Settings.tsx` — rendu initial avec état `null` (chargement) | non couvert (GAP-16) |
| TC-UI-02 | `Settings.tsx` — champ `locked` quand `source === 'env'` | non couvert (GAP-16) |
| TC-UI-03 | `PathField` — bouton Parcourir désactivé si `locked` | non couvert (GAP-16) |

---

## GAPS À REMONTER

| # | Observation |
|---|---|
| GAP-16 | `Settings.tsx` (page) et `PathField.tsx` (composant) non testés directement. Aucun test de rendu, d'état `locked`, de flux `onChange`/`onBrowse`/`save`. Couverture UI = zéro pour ce module. |
| GAP-01 | TC-ENV-01 et TC-ENV-05 assertent les valeurs hardcodées de la machine auteur — ces tests échoueront sur tout autre poste sans variable d'env `BREVES_BB_DIR` / `BREVES_WIKI_PY`. |
