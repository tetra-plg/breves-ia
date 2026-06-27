> Module : nouvelle-edition · reverse (constat) · cartographié à 4ce7095

# Plan de tests — Module nouvelle-edition

Rôle : **QA Module** · Cycle 1 · mode reverse (constat).

La stratégie globale (pyramide, outils, conventions, aucun seuil de couverture configuré) est dans
`docs/project/tests.md`. Ce fichier couvre **uniquement les cas de test tracés aux fichiers réels
du module nouvelle-edition**.

---

## 1. Synthèse de couverture du module

| Périmètre | Fichier(s) de test | Nb TC | Couche |
|---|---|---|---|
| Machine à états `Card` / `checking.ts` | `tests/domain/checking.test.mjs` | 7 | Domaine |
| Sentinelles + JSON (`edition.ts`) | `tests/domain/parse-result.test.mjs` | 6 | Domaine |
| Canal IPC `send-command` + `archive-ingest` | `tests/main/command.handlers.test.mjs` | 3 | Intégration main |
| Engine `dispatch` / `archiveAndIngest` + injection agents | `tests/main/engine.test.mjs` | 11 sélectionnés (module) | Intégration main |
| Service LLM `runSkill` / `runRaw` | `tests/main/llm.service.test.mjs` | 8 | Intégration main (SDK mocké) |
| Store slices cards/runStatus + `handleStreamEvent` | `tests/renderer/app.store.flow.test.mjs` + `useCommandStream.test.mjs` | 5 + 3 | Renderer |

> Les TCs engine hors module (`saveSoulSections`, `getSoul`, `getAgents`, `saveCommand`, `applyConfig`, etc.)
> sont référencés dans `docs/project/tests.md`.

---

## 2. Table des cas de test (TC-*)

### TC-CHK — Machine à états Card (`tests/domain/checking.test.mjs`)

| TC | Titre | Assertion clé | Trace |
|---|---|---|---|
| TC-CHK-01 | `initCard` démarre `recherche` en `active` | `steps.length == 5` ; états `[active, todo×4]` ; `done == false` | `checking.test.mjs:8-13` |
| TC-CHK-02 | `topic-detected` ajoute une card | `cards.length == 1` ; `cards[0].key == 'glm'` | `checking.test.mjs:14-18` |
| TC-CHK-03 | `topic-progress` coche l'étape et active la suivante | étape `source` → `done` ; `article` → `active` | `checking.test.mjs:19-26` |
| TC-CHK-04 | `topic-done` termine la card | `done == true` ; toutes étapes `done` | `checking.test.mjs:27-33` |
| TC-CHK-05 | `topic-error` marque l'erreur | `done == true` ; `error == 'inaccessible'` | `checking.test.mjs:34-38` |
| TC-CHK-06 | `applyResult` termine les cards sans sentinelles (filet zéro) | card créée et `done` depuis `topics[]` seuls ; `source` et `alerte` récupérés | `checking.test.mjs:38-48` |
| TC-CHK-07 | `summary` compte vérifiés/corrigés/nuancés | `{ verifies:3, corriges:1, nuances:1 }` depuis 3 topics avec alertes | `checking.test.mjs:49-57` |

### TC-SENT — Sentinelles et extraction JSON (`tests/domain/parse-result.test.mjs`)

| TC | Titre | Assertion clé | Trace |
|---|---|---|---|
| TC-SENT-01 | Extrait le **dernier** bloc JSON fencé | retourne `{ topics:[] }` (2ème bloc) | `parse-result.test.mjs:5-8` |
| TC-SENT-02 | Fallback parse du texte entier si pas de fence | retourne `{ ok:true }` | `parse-result.test.mjs:9-11` |
| TC-SENT-03 | Lève si aucun JSON extractable | `throws /aucun bloc JSON/` | `parse-result.test.mjs:12-14` |
| TC-SENT-04 | Parse les sentinelles dans l'ordre | 4 events `topic-detected, topic-progress, topic-done, topic-error` dans le bon ordre | `parse-result.test.mjs:15-30` |
| TC-SENT-05 | Ignore un step inconnu | retourne `[]` pour `«BREVES» step glm bidon` | `parse-result.test.mjs:31-33` |
| TC-SENT-06 | Extrait JSON malgré des fences imbriquées dans la valeur | champ `clipping_contenu` avec code fence interne préservé | `parse-result.test.mjs:34-40` |

### TC-IPC — Canaux IPC (`tests/main/command.handlers.test.mjs`)

| TC | Titre | Assertion clé | Trace |
|---|---|---|---|
| TC-IPC-01 | `send-command` route vers le moteur, stream les events, renvoie la valeur | `r.ok == true` ; `e.sent` contient `{ ch:'command-event', p:{topic-detected} }` | `command.handlers.test.mjs:8-20` |
| TC-IPC-02 | `send-command` capture une exception moteur en `{ok:false}` | `r.ok == false` ; `r.error == 'boom'` | `command.handlers.test.mjs:22-30` |
| TC-IPC-03 | `archive-ingest` route vers `archiveAndIngest`, appelle `breves-archive` | `r.ok == true` ; `seen == 'breves-archive'` | `command.handlers.test.mjs:31-43` |

### TC-ENG — Engine dispatch / archiveAndIngest (`tests/main/engine.test.mjs` — sélection module)

| TC | Titre | Assertion clé | Trace |
|---|---|---|---|
| TC-ENG-01 | `dispatch` passe les bons arguments à `runSkill` | `seen.skill == 'breves-verify'` ; `seen.bbDir == '/tmp/bb'` ; `seen.onEvent === onEvent` | `engine.test.mjs:11-20` |
| TC-ENG-02 | `dispatch` utilise `repoDir` comme cwd + injecte MCP wiki | `seen.bbDir == '/repo'` ; `seen.mcpServers == { 'boiling-brain-wiki': { … } }` | `engine.test.mjs:85-92` |
| TC-ENG-03 | `archiveAndIngest` enchaîne archive (`repoDir`) puis `/ingest` (`bbDir`) | `calls[0] == ['skill','breves-archive','/repo']` ; `calls[1] == ['raw','/ingest','/bb']` | `engine.test.mjs:94-106` |
| TC-ENG-04 | `archiveAndIngest` n'appelle pas `/ingest` si l'archive échoue | `ingestCalled == false` quand `runSkill` retourne `{ok:false}` | `engine.test.mjs:108-116` |
| TC-ENG-05 | `loadAgents` : agent désactivé non injecté en `defs`, `byName.mode` conservé | `defs.sceptique == undefined` (désactivé) ; `byName.sceptique.mode == 'ciblé'` | `engine.test.mjs:118-126` |
| TC-ENG-06 | `dispatch` injecte `sceptique.mode = 'toujours'` et les agents dans les inputs verify | `seen.inputs.sceptique == 'toujours'` ; `seen.agents.sceptique != undefined` | `engine.test.mjs:157-165` |
| TC-ENG-07 | `dispatch breves-draft` : `redacteur:'on'` si agent activé, `'off'` sinon | `seen.inputs.redacteur == 'on'` puis `'off'` selon `breves_enabled` | `engine.test.mjs:187-199` |
| TC-ENG-08 | `dispatch breves-draft` : n'écrase pas un `redacteur` explicite dans les inputs | `seen.inputs.redacteur == 'off'` quand fourni explicitement même si agent activé | `engine.test.mjs` (suite du bloc dispatch-draft) |
| TC-ENG-09 | `saveSoulEchantillons` écrit §5 (≤ 3), §5 remplacée, §6 conservée | `ok == true` ; `wrote.t` contient `### [2026-06-18] · z.ai` ; pas de « Vieux » | `engine.test.mjs:169-177` |
| TC-ENG-10 | `saveSoulEchantillons` refuse > 3 et texte vide, sans écrire | `ok == false` pour 4 entrées et texte vide ; `called == false` | `engine.test.mjs:178-185` |
| TC-ENG-11 | `saveAgent` refuse un nom traversant (pas d'écriture) | `ok == false` ; aucun `writeFile` appelé | `engine.test.mjs` (TC saveAgent traversal) |

### TC-LLM — Service LLM (`tests/main/llm.service.test.mjs`)

| TC | Titre | Assertion clé | Trace |
|---|---|---|---|
| TC-LLM-01 | `runSkill verify` : émet les events et renvoie la valeur validée | `r.ok == true` ; `r.value.topics[0].key == 'glm'` ; events `[topic-detected, topic-progress, topic-done]` | `llm.service.test.mjs:13-28` |
| TC-LLM-02 | `runSkill` rejette des inputs invalides sans appeler `query` | `r.ok == false` ; `called == false` (inputs `sujets:' '`) | `llm.service.test.mjs:30-38` |
| TC-LLM-03 | `runSkill` signale un JSON final invalide | `r.ok == false` ; event `result-error` émis | `llm.service.test.mjs:40-49` |
| TC-LLM-04 | `runSkill` remonte un échec SDK (`is_error:true`) | `r.ok == false` | `llm.service.test.mjs:51-58` |
| TC-LLM-05 | `runSkill` insère `mcpServers` dans les options | `opts.mcpServers == { wiki:{ command:'py', args:['s'] } }` | `llm.service.test.mjs:60-65` |
| TC-LLM-06 | `runSkill` insère `agents` dans les options | `opts.agents == { enqueteur:{ description:'d', prompt:'p' } }` | `llm.service.test.mjs:81-85` |
| TC-LLM-07 | `runRaw` renvoie `ok:true` sur succès SDK sans exiger de JSON | `r.ok == true` ; `r.text == 'ingéré 3 sources'` | `llm.service.test.mjs:68-73` |
| TC-LLM-08 | `runRaw` remonte un échec SDK | `r.ok == false` | `llm.service.test.mjs:75-79` |

### TC-STORE — Store slices + routing events (`tests/renderer/app.store.flow.test.mjs`, `useCommandStream.test.mjs`)

| TC | Titre | Assertion clé | Trace |
|---|---|---|---|
| TC-STORE-01 | `applyCardEvent` ajoute/avance une card via `domain/checking` | `cards.length == 1` ; `cards[0].title == 'Sujet K'` ; après `topic-done`, `done == true` | `app.store.flow.test.mjs:12-19` |
| TC-STORE-02 | `applyResultCards` termine les cards | `cards[0].done == true` depuis `{ topics:[{key:'k',sujet:'S'}] }` | `app.store.flow.test.mjs:20-24` |
| TC-STORE-03 | `beginRun/setRunActivity/endRun` pilotent `runStatus` | `active:true`, `title`, `activity`, puis `active:false` | `app.store.flow.test.mjs:25-33` |
| TC-STORE-04 | `tickClock` met à jour l'horloge | `clock == '1:05'` pour `t0+65000ms` | `app.store.flow.test.mjs:34-39` |
| TC-STORE-05 | `fmtClock` formate m:ss (edge 0 et négatif) | `fmtClock(0)=='0:00'` ; `fmtClock(65000)=='1:05'` ; `fmtClock(-100)=='0:00'` | `app.store.flow.test.mjs:7-11` |
| TC-STREAM-01 | `handleStreamEvent` route `activity` → `runStatus.activity` | `runStatus.activity == 'Lecture : z.ai'` | `useCommandStream.test.mjs:7-11` |
| TC-STREAM-02 | `handleStreamEvent` route `topic-*` → `cards` | `cards.length == 1` ; `cards[0].done == true` après `topic-done` | `useCommandStream.test.mjs:12-18` |
| TC-STREAM-03 | `handleStreamEvent` ignore un type inconnu | `cards.length == 0` pour `{ type:'autre' }` | `useCommandStream.test.mjs:19-23` |

---

## 3. Zones non testées (module)

Les éléments suivants sont **non couverts par des tests automatisés** à la date de cartographie (constat, non prescription) :

| Zone | Raison constatée | Gap |
|---|---|---|
| Pages React (`Compose`, `Checking`, `Editor`, `Archived`, `Detail`) | Pas de jsdom / testing-library ; rendu React non testé directement | GAP-16 |
| Composants métier (`EnqCard`, `Drawer`, `RunStatus`, `CorrectModal`, `ArchiveStep`, `CorrectionRow`, `SourceRow`) | Idem — pas de rendu DOM dans les tests | GAP-16 |
| Flux complet end-to-end (vérif → rédaction → archivage avec vrai SDK) | Remplacé par smoke-boot (`BREVES_SMOKE=1`) — pas de vrai E2E | GAP-16 |
| Plafond 15 sujets (code) | Limite douce en prose uniquement — pas de cas de test Zod | GAP-09 |
| Mode sceptique `ciblé` (critère LLM) | Heuristique — non testable unitairement | GAP-08 |

> Voir `docs/project/tests.md §3` pour la couverture qualitative globale et `docs/REVERSE_GAPS.md` pour les gaps ouverts.

---

## 4. Commandes d'exécution

```bash
# Tous les tests du module (sélection par fichier)
npx vitest run tests/domain/checking.test.mjs tests/domain/parse-result.test.mjs \
  tests/main/command.handlers.test.mjs tests/main/engine.test.mjs \
  tests/main/llm.service.test.mjs \
  tests/renderer/app.store.flow.test.mjs tests/renderer/useCommandStream.test.mjs

# Suite complète (hook pre-commit)
npm test
```

Traces : `package.json:16` (`npm test` → `vitest run`), `.husky/pre-commit` (typecheck + lint + tests).

---

## GAPS À REMONTER

| # | Type | Observation | À trancher par |
|---|---|---|---|
| GAP-16 | tests | Pages React et composants du module non testés directement ; pas de CI cloud ; aucun seuil de couverture | QA |
| GAP-09 | edge-case | Plafond 15 sujets non validé en test (limite douce) | PM / Lead Dev |
| GAP-08 | intention | Mode sceptique `ciblé` : critère LLM heuristique, non testable unitairement | PM |
| GAP-07 | divergence | `SENTINEL_STEPS` (`edition.ts:194`) vs `STEPS` (`checking.ts:3`) — les tests de sentinelles passent sur les deux mais une divergence future serait silencieuse | Lead Dev |
