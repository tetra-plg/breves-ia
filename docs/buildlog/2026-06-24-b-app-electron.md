# B — App Electron Brèves IA (build log) : fenêtre compagnon, port du mockup, câblage IPC

**Date** : 2026-06-24
**Spec** : `docs/superpowers/specs/2026-06-24-breves-ia-companion-design.md`
**Plan** : `docs/superpowers/plans/2026-06-24-breves-ia-app-electron.md`
**Objectif** : l'app de bureau (fenêtre compagnon Electron) qui pilote le moteur (build log A) et rend le mockup Claude Design `design.html` : dashboard → compose → checking → editor → archived + soul/history, gates dans l'UI. Vanilla façon poker-suivi (logique pure testée + DOM vérifié à l'œil).
**Statut** : livré — **app lancée et validée visuellement par Pierre** (dashboard, navigation, thème, vues détail/reader). Verify+draft réels OK depuis le moteur. Édition SOUL = reportée au plan migration (build log C). Mergé sur `main`, poussé.

## Livré

| Livrable | Fichier | Notes |
| --- | --- | --- |
| **Machine d'états des vues** | `lib/ui-state.mjs` | `nextView`, `stepper` (done/active/todo), `viewTitle` — pur, testé. |
| **Modèle des cartes checking** | `lib/checking-model.mjs` | Réducteur **immuable** events→cartes (5 étapes/jalons) + **filet zéro-sentinelle** : `applyResult` termine les cartes depuis le résultat final même si aucun jalon n'arrive (cf. gotcha A-1). Testé (immutabilité tracée). |
| **Helpers de formatage** | `lib/ui-format.mjs` | `escapeHtml`, `inlineMd`, `dateLong` (fr-FR, `timeZone:'UTC'` → déterministe), `soulVersionLabel`. Pur, testé. |
| **Dispatch moteur côté main** | `hud/engine.mjs` | `dispatch`, `getDashboard` (tolère SOUL absente), `readEdition`/`readSoulRaw`/`saveSoul` (anti-traversal, refuse vide) — deps injectables, testés sans Electron. |
| **Shell Electron** | `hud/main.mjs`, `hud/preload.cjs` | Fenêtre frameless 400×760, `Menu` null, IPC `send-command`/`get-dashboard`/`copy`/`read-edition` ; streaming des events via `webContents.send` ; raccourci DevTools (Cmd/Ctrl+Alt+I, F12) via `before-input-event`. |
| **Port statique du mockup** | `hud/companion.html` | 7 vues + détail/reader (en vues, pas en popups) + tokens « Halo » clair/sombre, IDs fixes. |
| **Renderer** | `hud/renderer.mjs` | Bootstrap + nav + thème ; dashboard ; compose (chips) ; checking (events + filet résultat) ; editor + gate (corriger/valider) ; archived ; soul ; history ; détail/reader + toast. |
| **README** | `README.md` | Prérequis, `npm run hud`, tests, garde-fous. |

## Validation RÉELLE

- ✅ **App boote** (env réel : `npm run hud`), dashboard peuplé depuis le wiki (dernière édition, version SOUL, éditions récentes), navigation + thème clair/sombre OK — confirmé par Pierre.
- ✅ **Détail d'une brève et reader d'historique = vraies vues** (retour contextuel), après retour sur le mockup qui les faisait en popups.
- ✅ Verify+draft réels (cf. build log A) alimentent checking + editor.
- Suite : **58/58** tests (socle UI + moteur + readEdition + readSoulRaw/saveSoul).

## Gotchas de la passe

1. **`ELECTRON_RUN_AS_NODE=1` dans le sandbox** : l'agent ne pouvait pas lancer l'app — Electron tournait en **Node pur** (`require('electron')` rend le chemin du binaire, pas l'API), d'où un crash `cjsPreparseModuleExports` au boot. **Diagnostic clé** : le main ESM (`import { app } from 'electron'`) est **correct** ; il suffit de **dé-poser la variable** (`ELECTRON_RUN_AS_NODE= npx electron …`). En usage réel (Pierre lance `npm run hud`) la variable n'existe pas → aucun souci. Aucune modif de code nécessaire.
2. **DevTools injoignables** : `Menu.setApplicationMenu(null)` désactive le raccourci natif Cmd+Opt+I. Ajout d'un handler `before-input-event` (Cmd/Ctrl+Alt+I **et** F12).
3. **« Fenêtre dans la fenêtre »** : le mockup était une carte flottante sur un fond de prévisualisation (`--bg` + `.win` centrée). Dans la vraie fenêtre Electron, le fond crème débordait → `.win` remplit `100vw/100vh`, `body` en `--win`.
4. **Détail/reader en popups** : portés tels quels du mockup (overlay + backdrop sombre). Convertis en **vues** `data-view` avec retour contextuel (`state.returnTo`).
5. **Zone draggable mange les clics** : `-webkit-app-region:drag` sur tout l'en-tête → le bouton retour ne réagissait pas. Fix : drag **uniquement sur la zone titre**, boutons hors zone.
6. **Le reader d'historique n'avait pas le texte** : `listEditions` ne renvoie pas le corps ; ajout d'un IPC `read-edition` (lit `raw/notes/<file>`, anti-traversal) pour afficher le vrai contenu.

## Décisions / restes

- **Vanilla (façon poker-suivi)** vs Preact : choisi pour coller à l'archi existante, zéro dépendance/build ; le mockup `renderVals(state)` se porte bien en re-render.
- **Édition de la SOUL** : demandée par Pierre ; reportée au **plan migration** (build log C) car la SOUL va devenir locale au repo — l'éditeur brut (`readSoulRaw`/`saveSoul`, déjà écrits + testés) sera câblé là.
- **Affichage SOUL actuel** jugé infidèle au vrai fichier (montrait §4 Lignes rouges en « Règles de style ») → motive le passage à un éditeur **brut** dans le plan migration.
- **Coins de fenêtre / bouton fermer-pin** : non traités (carrés, fermeture système) — finitions optionnelles.
