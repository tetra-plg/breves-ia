# C — Migration des artefacts dans le repo (build log) : cwd local, MCP programmatique, archive en 2 temps

**Date** : 2026-06-24
**Spec** : `docs/superpowers/specs/2026-06-24-breves-ia-companion-design.md`
**Plan** : `docs/superpowers/plans/2026-06-24-migration-breves-ia.md`
**Objectif** : rendre `breves-ia` autonome — SOUL + prompts verify/draft/archive dans `breves-ia/.claude/`, SDK en `cwd = repoDir`, MCP wiki fourni programmatiquement, `/ingest` conservé dans le flux via un 2ᵉ appel en `cwd = BoilingBrain`. Réconcilie « migrer » + « garder /ingest » sans déplacer `ia-expert`.
**Statut** : livré — **migration validée en RÉEL** (verify cwd local + MCP wiki accessible). Archive+ingest *écrivant* dans le wiki : différé à une vraie veille (Pierre). Review finale opus : Ready to merge. Retrait BoilingBrain commité **localement, non poussé**.

## Livré

| Livrable | Fichier | Notes |
| --- | --- | --- |
| **Config repoDir + wikiMcp** | `lib/config.mjs` | `repoDir` (racine repo, calculée, overridable `BREVES_REPO_DIR`) ; `wikiMcp = { type:'stdio', command, args }` (overridable `BREVES_WIKI_PY`/`BREVES_WIKI_SCRIPT`). |
| **Runner mcpServers + runRaw** | `lib/runner.mjs` | `runSkill` insère `options.mcpServers` quand fourni ; `runRaw({prompt,cwd,mcpServers})` pour un prompt libre (`/ingest`) sans validation JSON → `{ok,text}`. |
| **Migration prompts + SOUL** | `.claude/commands/breves-{verify,draft,archive}.md`, `.claude/breves-ia/{SOUL.md,_brief-enqueteur.md,_archive.md}` | Copiés depuis BoilingBrain ; `/ingest` **retiré** de l'archive migrée (déclenché par l'app en 2ᵉ temps). |
| **Engine recâblé** | `hud/engine.mjs` | `dispatch` cwd=repoDir + `{ 'boiling-brain-wiki': wikiMcp }` ; `getDashboard` SOUL via repoDir / éditions via bbDir ; `readSoulRaw`/`saveSoul` via repoDir ; **`archiveAndIngest`** (archive cwd=repoDir → si ok, `/ingest` cwd=bbDir). |
| **SOUL en baseDir** | `lib/soul.mjs` | `readSoul(baseDir)` lit `<baseDir>/.claude/breves-ia/SOUL.md` (paramètre renommé, comportement identique). |
| **Câblage app** | `hud/main.mjs`, `hud/preload.cjs`, `hud/renderer.mjs`, `hud/companion.html` | IPC `archive-ingest`/`get-soul-raw`/`save-soul` ; `runArchive` → `archive()` (2 temps) ; **vue SOUL = éditeur brut** du vrai fichier + « Enregistrer ». |
| **CLI repointé** | `scripts/breves-cli.mjs` | Via `dispatch` + `defaultDeps` (cwd=repoDir + MCP) au lieu de `runSkill`+bbDir. |
| **Retrait BoilingBrain** | `BoilingBrain/.claude/commands/breves-{verify,draft,archive}.md` (supprimés) | `/breves-ia` interactif + snippets + `/ingest` + `ia-expert` **conservés**. Commit local, non poussé. |

## Validation RÉELLE

- ✅ **verify migré, cwd=breves-ia** : `node scripts/breves-cli.mjs verify "GLM 5.2…"` → exit 0, JSON valide (1 topic `confirme`, source « Z.ai (Hugging Face Blog officiel) », 8 faits, clip 1412 chars). Le SDK charge bien `/breves-verify` depuis `breves-ia/.claude`.
- ✅ **MCP wiki accessible en cwd=repoDir + mcpServers programmatique** : probe décisif (appel réel de `search_wiki`, read-only) → `OUTIL_OK: wiki/entities/anthropic.md`. Donc `drop_to_raw` de l'archive fonctionnera.
- ✅ **SOUL locale lue** par le moteur (`readSoulRaw` → 5717 chars depuis `breves-ia/.claude/breves-ia/SOUL.md`).
- Suite : **68/68** tests, pristine.

## Gotchas de la passe

1. **`type:'stdio'` nécessaire dans le spec MCP** : `{ command, args }` seul ne suffisait pas de façon fiable ; la forme `McpStdioServerConfig` documentée (`{ type:'stdio', command, args }`) est passée dans `options.mcpServers`. Ajouté à `wikiMcp`.
2. **Faux négatif d'auto-report MCP** : demander à l'agent « as-tu les outils MCP ? » répond **« indisponible »** alors que l'appel direct de `search_wiki` **réussit**. Les modèles sous-déclarent leur inventaire d'outils mais les utilisent quand on les y dirige → ne jamais tester la dispo MCP par auto-report, toujours par un appel réel d'outil read-only.
3. **`runSkill.bbDir` porte désormais le cwd** : depuis `dispatch`, le param `bbDir` reçoit `repoDir`. Sémantiquement trouble mais sans risque (seuls `dispatch` et le CLI appellent `runSkill`, tous deux passent repoDir ; `runRaw` a un param `cwd` propre).

## Décisions / restes

- **Archive+ingest réel différé** : `archiveAndIngest` écrit dans `raw/` du wiki (via MCP) puis lance `/ingest` (cwd=bbDir). Validé indirectement (MCP joignable) mais l'écriture réelle reste à faire par Pierre sur une vraie édition.
- **Retrait BoilingBrain non poussé** : commit local sur `main` du wiki ; à pousser par Pierre quand il valide.
- **Minor reporté** (review finale) : `runRaw` renvoie `{ok:false, text}` en échec là où le reste utilise `{ok:false, error}` ; le toast d'ingestion échouée ignore le détail. Cosmétique, à uniformiser si besoin.
- **`/breves-ia` interactif** reste dans le wiki (workflow terminal) ; doublon mineur des snippets entre repos, assumé.
