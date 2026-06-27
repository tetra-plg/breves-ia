# Specs — Module reglages

> Module : reglages · reverse (constat) · cartographié à `4ce7095`
> Rôle : PO Module (`specs-module`) · Cycle 1.
> Chaque assertion est tracée. Le code fait foi. Réfère le socle global : `docs/project/specs.md`.

---

## Contexte et périmètre

Le module **reglages** expose à l'utilisateur (Pierre) les trois chemins d'intégration dont dépend
l'ensemble de l'application : `bbDir` (dépôt BoilingBrain), `repoDir` (dépôt `.claude`) et
`claudeBin` (binaire Claude Agent SDK). Il est accessible depuis le header de l'application
(vue `settings` — `src/domain/navigation.ts:1`).

Sans une configuration valide de ces trois chemins, les modules
nouvelle-edition, historique, soul, agents et commandes sont en état dégradé silencieux
(voir GAP-17, `docs/REVERSE_GAPS.md`).

---

## User stories (constatées)

### US-SET-01 — Voir les réglages actuels et leur source

**En tant que** Pierre, **je veux** ouvrir la vue Réglages et voir immédiatement les trois chemins
configurés (`bbDir`, `repoDir`, `claudeBin`) avec leur valeur actuelle et l'indication de leur
provenance (`env`, `file`, ou `default`), **pour** savoir si l'app est correctement configurée et
si un chemin est verrouillé par une variable d'environnement.

**Critères d'acceptance :**
- La vue affiche trois champs (`PathField`) avec label, valeur, indicateur de validité (vert/rouge)
  et source.
  _Trace : `src/renderer/pages/Settings.tsx:10-14,69-79`._
- Si la source est `env`, le champ est en lecture seule (propriété `locked`) et un message
  « Verrouillé par une variable d'environnement. » s'affiche sous le champ.
  _Trace : `src/renderer/components/PathField.tsx:25,29-33`._
- Un indicateur de chargement (texte « Chargement… ») s'affiche pendant la résolution initiale.
  _Trace : `src/renderer/pages/Settings.tsx:53-60`._
- La résolution est appelée à chaque ouverture de la vue (via `useEffect`).
  _Trace : `src/renderer/pages/Settings.tsx:22-30`._

**Règle métier :** hiérarchie de résolution `env > file > défaut`
(`src/main/io/env.ts:32-42`, `resolveSetting`).

---

### US-SET-02 — Choisir un chemin via le sélecteur natif

**En tant que** Pierre, **je veux** cliquer « Parcourir… » pour ouvrir le sélecteur de fichier ou
de dossier natif du système d'exploitation, **pour** ne pas avoir à saisir manuellement un chemin
absolu.

**Critères d'acceptance :**
- Le bouton « Parcourir… » sur chaque `PathField` déclenche `window.api.pickPath(kind)`.
  _Trace : `src/renderer/pages/Settings.tsx:37-39`, `src/renderer/components/PathField.tsx:25`._
- `kind` vaut `'directory'` pour `bbDir` et `repoDir`, et `'file'` pour `claudeBin`.
  _Trace : `src/renderer/pages/Settings.tsx:10-14` (tableau `FIELDS`)._
- Si l'utilisateur annule la sélection (retour `null`), aucun changement n'est appliqué.
  _Trace : `src/renderer/pages/Settings.tsx:38-39` (`if (picked)`)._
- Après sélection, la valeur est immédiatement validée côté main et l'indicateur de validité
  est mis à jour.
  _Trace : `src/renderer/pages/Settings.tsx:32-34` (`setValue` → `validatePath`)._
- Le bouton est désactivé si le champ est verrouillé (`source === 'env'`).
  _Trace : `src/renderer/components/PathField.tsx:25`._

---

### US-SET-03 — Valider un chemin manuellement

**En tant que** Pierre, **je veux** saisir un chemin à la main dans un champ et voir
immédiatement si ce chemin est valide (dossier existant ou fichier exécutable), **pour** détecter
une erreur de frappe avant d'enregistrer.

**Critères d'acceptance :**
- La saisie dans un `Input` (non verrouillé) déclenche `onChange` → `validatePath(value, kind)`.
  _Trace : `src/renderer/pages/Settings.tsx:32-34`, `src/renderer/components/PathField.tsx:24`._
- L'indicateur `StatusDot` passe en état `'done'` (vert) si valide, `'error'` (rouge) sinon.
  _Trace : `src/renderer/components/PathField.tsx:23`._
- La validation est asynchrone (IPC `validate-path` → `pathValid` côté main).
  _Trace : `src/main/ipc/settings.handlers.ts:32-35`, `src/main/io/config.ts:34-45`._

**Règles métier de validation (`pathValid`, `src/main/io/config.ts:34-45`) :**
- `directory` : `statSync(p).isDirectory()` — suit les symlinks.
- `file` : `statSync(p).isFile()` ET `accessSync(p, X_OK)` — le binaire doit être exécutable.
  (Compatibilité symlink vérifiée : `statSync` suit les symlinks — utile car `claudeBin` peut
  être un symlink, commentaire `config.ts:37`.)
- Chemin vide → `false`.

---

### US-SET-04 — Enregistrer les réglages

**En tant que** Pierre, **je veux** cliquer « Enregistrer » pour persister mes modifications et
les appliquer immédiatement, **pour** que l'app utilise les nouveaux chemins sans redémarrage.

**Critères d'acceptance :**
- Le bouton « Enregistrer » envoie uniquement les champs dont la source **n'est pas** `env`
  (les champs env-locked ne sont pas inclus dans le patch).
  _Trace : `src/renderer/pages/Settings.tsx:46` (`if (state[f.key].source !== 'env')`)._
- Si tous les chemins du patch sont valides, l'enregistrement réussit (`ok: true`) et un toast
  « Réglages enregistrés » apparaît.
  _Trace : `src/renderer/pages/Settings.tsx:48-50`._
- Si au moins un chemin est invalide, l'enregistrement échoue (`ok: false`) et un toast
  « Échec : … » s'affiche — aucune écriture en `config.json`.
  _Trace : `src/main/ipc/settings.handlers.ts:41-45`, `src/renderer/pages/Settings.tsx:49`._
- L'application à chaud (`applyConfig`) est déclenchée immédiatement après l'écriture réussie
  en `config.json`.
  _Trace : `src/main/ipc/settings.handlers.ts:50`._
- Après enregistrement réussi, le dashboard est rechargé (`getDashboard`).
  _Trace : `src/renderer/pages/Settings.tsx:50`._
- Le bouton affiche un état `loading` pendant l'enregistrement (état `saving`).
  _Trace : `src/renderer/pages/Settings.tsx:20,42,48,81`._

**Cas d'erreur :**
- Chemin invalide dans le patch → `{ ok: false, error: "Chemin invalide pour <key> : <val>" }`.
  _Trace : `src/main/ipc/settings.handlers.ts:44-45`._
- Erreur `writeUserConfig` ou `applyConfig` → `{ ok: false, error: <message> }`.
  _Trace : `src/main/ipc/settings.handlers.ts:51-53`._

---

### US-SET-05 — Quitter l'application

**En tant que** Pierre, **je veux** pouvoir quitter l'application depuis l'UI (bouton ou raccourci),
**pour** fermer proprement l'app sans passer par la barre de menus macOS.

**Critères d'acceptance :**
- L'appel `window.api.quitApp()` déclenche `sys.quit()` côté main.
  _Trace : `src/main/ipc/settings.handlers.ts:57-59`._

> Note : aucun bouton « Quitter » visible dans `Settings.tsx` à HEAD. Le canal `quit-app` est
> enregistré dans le groupe settings handlers mais son déclencheur UI n'est pas localisé dans
> la vue Settings. Usage potentiel depuis un autre point d'entrée (raccourci clavier, menu ?).
> **→ GAP à remonter (voir section GAPS ci-dessous).**

---

## Règles métier (synthèse)

| # | Règle | Trace |
|---|---|---|
| R1 | Hiérarchie : `env > file > défaut` — une variable d'env verrouille le champ (source=env, non éditable) | `env.ts:32-42` |
| R2 | Validation directory : `statSync.isDirectory()`, suit les symlinks | `config.ts:35-38` |
| R3 | Validation file : `statSync.isFile()` + `accessSync(X_OK)` | `config.ts:39-44` |
| R4 | Chemin invalide → save refusé (`ok: false`), rien écrit en config.json | `settings.handlers.ts:41-45` |
| R5 | Les clés inconnues dans le patch sont ignorées (boucle sur `KINDS` uniquement) | `settings.handlers.ts:41-42` |
| R6 | Application à chaud : `applyConfig(deps, patch, env)` immédiatement après `writeUserConfig` | `settings.handlers.ts:50` |
| R7 | MCP wiki (`buildWikiMcp`) est reconstruit lors de tout `applyConfig` | `engine.ts:62` |
| R8 | Les champs verrouillés par env ne sont pas inclus dans le patch envoyé au `save-settings` | `Settings.tsx:46` |

---

## Cas d'erreur (constatés)

| Cas | Comportement | Trace |
|---|---|---|
| Chemin invalide dans patch | `{ ok: false, error: "Chemin invalide pour <key> : <val>" }` | `settings.handlers.ts:44-45` |
| Erreur FS (write échoue) | `{ ok: false, error: <message Error> }` | `settings.handlers.ts:51-53` |
| Config.json absent/corrompu au démarrage | `readUserConfig` renvoie `{}`, les défauts s'appliquent | `config.ts:17-25` |
| Chemin inexistant au démarrage | `pathValid` renvoie `false`, `SettingField.valid=false`, champ en rouge | `settings.handlers.ts:18` |
| Sélecteur natif annulé par l'utilisateur | `pickPath` renvoie `null`, aucune mise à jour | `Settings.tsx:38-39` |

---

## Mockups (états constatés dans le code)

### État normal — champ valide, source `file`
```
[label Eyebrow]
[● (vert)] [/chemin/existant          ] [Parcourir…]
```

### État invalide — chemin inexistant
```
[label Eyebrow]
[● (rouge)] [/chemin/absent           ] [Parcourir…]
```

### État verrouillé — source `env`
```
[label Eyebrow]
[● (vert/rouge)] [/chemin/via/env     ] [Parcourir… (disabled)]
Verrouillé par une variable d'environnement.
```

### Chargement initial
```
Chargement…
```

---

## GAPS À REMONTER

| # | Observation |
|---|---|
| GAP-01 | Défauts hardcodés sur la machine de Pierre (`/Users/pleguern/...`) — non portables. Idem chemins Python MCP wiki. `env.ts:20-24,47-48`. |
| GAP-17 | État dégradé silencieux au 1er lancement si les trois chemins sont invalides — pas d'onboarding guidé. Dépendance de données `reglages → historique / nouvelle-edition / soul`. `env.ts:20-24`, `Settings.tsx`. |
| GAP-quit | Canal `quit-app` enregistré dans `settings.handlers.ts:57-59` mais aucun bouton « Quitter » visible dans `Settings.tsx` à HEAD — déclencheur UI non localisé. |
