# Migration Phase 5 — Packaging macOS (DMG) + garde-fou pre-commit (design)

**Date** : 2026-06-27
**Branche d'intégration** : `refonte-ts-react-electron`
**Spec parent** : [2026-06-26-migration-phase3-renderer-react-design.md](./2026-06-26-migration-phase3-renderer-react-design.md)
**Statut** : design validé (DMG non signé, makers macOS uniquement, hook pre-commit Husky), prêt pour plan Phase 5

## Contexte

La migration `.mjs` → TypeScript + React + Electron est achevée jusqu'à la Phase 4 (le legacy
`lib/`+`hud/` est supprimé, React est l'unique frontal). La Phase 5 — dernière — vise la **qualité**
et le **packaging** distribuable. `forge.config.ts` est le scaffold Forge+Vite par défaut (makers
multi-OS Squirrel/ZIP/Rpm/Deb, aucune métadonnée d'app, pas d'icône, pas de signature). Il existe un
remote GitHub (`tetra-plg/breves-ia`) mais aucun workflow CI.

### Cadrage validé

Outil **personnel macOS** (arm64). Décisions :
- **Signature** : **non signé** (usage local ; Gatekeeper = clic-droit → Ouvrir au 1er lancement).
  Pas de compte Apple Developer requis.
- **Cible** : **DMG seul** (ajout `MakerDMG` ; retrait de Squirrel/ZIP/Rpm/Deb).
- **Qualité** : **hook pre-commit local uniquement** (Husky). **Pas** de CI GitHub, **pas** de smoke
  packaging en CI.

## Décisions (validées)

### Packaging (DMG, non signé)

- `forge.config.ts` : retirer `MakerSquirrel`, `MakerZIP`, `MakerRpm`, `MakerDeb` ; ajouter
  **`MakerDMG`** (`@electron-forge/maker-dmg`, scope `['darwin']`). Désinstaller les devDeps des
  makers retirés (propreté) ; installer `@electron-forge/maker-dmg`.
- Métadonnées : `package.json` → `productName: "Brèves IA"` ; `forge.config` →
  `packagerConfig.appBundleId: "com.tetra-plg.breves-ia"`. Inchangé : `asar: true`, FusesPlugin,
  VitePlugin.
- **Non signé** : aucune config `osxSign`/`osxNotarize` (signature ad-hoc arm64 par défaut
  d'electron-packager, suffisante en local).
- **Icône** : aucune `.icns` fournie → icône Electron par défaut conservée (déposer
  `src/assets/icon.icns` + `packagerConfig.icon` plus tard si voulu). YAGNI.
- Sortie : `npm run make` produit un **`.dmg`** dans `out/make/`.

### Qualité (pre-commit local)

- **Husky v9** : `npm install -D husky` + script `package.json` `"prepare": "husky"`.
- Hook `.husky/pre-commit` : lance `npm run typecheck && npm run lint && npm test`. Échec d'une
  vérif → commit bloqué.
- **Robustesse Node** : le hook source `nvm` et fait `nvm use` si disponible (sinon poursuit avec le
  Node courant — floor `engines.node` ≥20.19), pour rester proche du baseline Node 22.
- Coût : Vitest ~0,6 s (160 tests) + typecheck/lint → quelques secondes par commit, acceptable.

## Architecture (changements)

```text
forge.config.ts          # makers = [MakerDMG(darwin)] ; packagerConfig { asar, appBundleId }
package.json             # productName "Brèves IA" ; prepare: husky ; devDeps makers nettoyés ; +maker-dmg +husky
.husky/pre-commit        # nvm use (si dispo) ; npm run typecheck && lint && test
```

Aucune modification de `src/` ni des `tests/` (Phase 5 = packaging + outillage uniquement).

## Découpage prévu (à affiner dans le plan)

1. **Hook pre-commit (Husky)** : installer husky, `prepare`, écrire `.husky/pre-commit`
   (typecheck+lint+test, nvm). Vérifier que le hook bloque un commit fautif et laisse passer un
   commit sain.
2. **Packaging DMG** : `forge.config.ts` (makers → DMG seul ; appBundleId) + `package.json`
   (productName ; devDeps makers nettoyés ; +maker-dmg) ; `npm run make` → `.dmg` généré.

## Contraintes transverses

- **Node 22** (`nvm use`) pour tout. `npm run typecheck` (0) / `lint` (0) / `test` (160 verts) à chaque tâche.
- Pas de signature/notarisation ; pas de CI distante ; pas d'icône custom (hors-scope).
- `src/` et `tests/` **inchangés**. Pas de nouvelle dépendance **runtime** (husky/maker-dmg = devDeps).
- `git push origin refonte-ts-react-electron` après chaque commit ; ne jamais stager `.claude/breves-ia/SOUL.md`.

## Critères de réussite (Phase 5)

- `.husky/pre-commit` actif : un commit avec erreur TS/lint/test est **refusé** ; un commit sain passe.
- `npm run make` produit un **`.dmg`** macOS dans `out/make/` (app nommée « Brèves IA », bundle id
  `com.tetra-plg.breves-ia`), **non signé**. `forge.config.ts` n'a plus que le maker DMG.
- `npm run typecheck` (0) / `lint` (0) / `test` (160 verts) / `build-storybook` OK / `npm start` sanity OK.
- Lancement réel du `.dmg`/`.app` = **validation manuelle de l'utilisateur**.

## Reste (post-migration)

Migration terminée après la Phase 5. Candidats ultérieurs (hors migration) : refresh dashboard
post-archivage (Minor 3b-4), icône custom, signature/notarisation, CI distante, montée de version.
