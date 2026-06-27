> Module : nouvelle-edition · reverse (constat) · cartographié à 4ce7095

# Implémentation — Module nouvelle-edition

Rôle : **Lead Dev Module** · Cycle 1 · mode reverse (constat).

Les conventions transversales (format `ApiResult`, patterns IPC, injection de dépendances, packaging SDK)
sont documentées dans `docs/project/implementation.md`. Ce fichier couvre **uniquement les
contrats IPC, types de transport et contraintes propres au module**.

---

## 1. Contrats IPC du module

### 1.1 Canal `send-command` (invoke)

Fichier : `src/main/ipc/command.handlers.ts:4-15`

```
Payload entrant  : { skill: string, inputs: Record<string, unknown> }
Retour invoke    : RunResult = { ok: true, value: unknown } | { ok: false, error: string }
Streaming annexe : 'command-event' (push, voir §1.3)
```

Flux interne du handler :
1. Extrait `{ skill, inputs }` du payload brut (aucune validation de structure ici — la validation Zod est dans `runSkill`).
2. Construit `onEvent` : fonction qui pousse chaque `StreamEvent` via `e.sender.send(IPC.commandEvent, ev)` avec garde `!e.sender.isDestroyed()` (`command.handlers.ts:7-9`).
3. Appelle `dispatch({ skill, inputs, onEvent }, deps)` (`engine.ts:136`).
4. Catch toute exception → `{ ok: false, error: message }`.

**Schémas Zod validés** (dans `llm.service.runSkill`, pas dans le handler) :
- Entrée : `validateInputs(skill, inputs)` — `src/shared/schemas/inputs.ts:48` (`.strict()`, anti-contrôles).
- Sortie : `VALIDATORS[skill](jsonBlock)` — `src/main/services/llm.service.ts:33-37,134-141` (`.passthrough()`).

### 1.2 Canal `archive-ingest` (invoke)

Fichier : `src/main/ipc/command.handlers.ts:17-32`

```
Payload entrant  : { teamsText: string, topics: unknown[], sources: unknown[], leconSOUL?: string }
Retour invoke    : RunResult & { ingest?: RunRawResult }
                   RunRawResult = { ok: boolean, text: string }
Streaming annexe : 'command-event' (push, même handler onEvent)
```

Flux interne du handler :
1. Cast le payload en `{ teamsText, topics, sources, leconSOUL? }` (typage de confiance — la validation est dans `archiveSchema` de `runSkill`).
2. Construit `onEvent` identique à `send-command`.
3. Appelle `archiveAndIngest({ ...inputs, onEvent }, deps)` (`engine.ts:264`).
4. `archiveAndIngest` :
   - Appelle `dispatch('breves-archive', …)` → `runSkill` (via `repoDir` comme `bbDir`).
   - Si archive KO → retour immédiat `{ ok:false }` sans déclencher l'ingest.
   - Appelle `runRaw({ prompt:'/ingest', cwd:bbDir, … })` → retour fusionné `{ ...archiveResult, ingest }`.
   _Trace : `engine.ts:264-281`._

### 1.3 Canal `command-event` (push — non-invoke)

Fichier : `src/main/ipc/command.handlers.ts:7-9`, `src/preload/index.ts:7-13`

```
Direction  : main → renderer (push via sender.send)
Type       : StreamEvent = TopicEvent | ActivityEvent | { type: string, [key: string]: unknown }
Abonnement : window.api.onCommandEvent(cb) → () => void (dispose)
```

Le hook `useCommandStream` (`src/renderer/hooks/useCommandStream.ts:26-31`) est monté **une seule fois** dans `App.tsx`. Il abonne `handleStreamEvent` à `onCommandEvent` et retourne le dispose comme cleanup `useEffect`.

**Routage dans `handleStreamEvent`** (`useCommandStream.ts:13-23`) :
- `ev.type === 'activity'` → `store.setRunActivity(ev.label)`.
- `ev.type ∈ TOPIC_TYPES` (`topic-detected|progress|done|error`) → `store.applyCardEvent(ev as TopicEvent)`.
- Tout autre type → ignoré silencieusement.

`handleStreamEvent` appelle `useAppStore.getState()` à chaque événement (pattern store à chaud, voir `docs/project/implementation.md §Patterns transversaux`).

---

## 2. Types de transport du module

### 2.1 `VerifyOutput` (`src/shared/schemas/outputs.ts:31`)

```typescript
type VerifyOutput = {
  topics: Array<{
    key: string;
    sujet: string;
    date_reelle: string;
    fiabilite: 'confirme' | 'partiel' | 'non_verifie';
    source: string;
    url_citee: string;
    url_clippee: string;
    slug: string;
    clipping_contenu: string;
    faits: string[];
    alerte?: { niveau: 'corrigé' | 'nuance' | 'date'; texte: string } | null;
    // + champs passthrough (carry-over)
  }>;
}
```

Stocké dans `store.verifyValue`. Consommé par `Editor.tsx:34` (`getState().verifyValue.topics`) et par `Archived.tsx:19` (`verifyValue.topics`).

### 2.2 `DraftOutput` (`outputs.ts:50`)

```typescript
type DraftOutput = {
  teamsText: string;
  corrections: Array<{ niveau: AlertLevel; titre: string; detail: string }>;
  sources: Array<{ name: string; url_citee: string; url_clippee: string; repli: boolean }>;
  soulLessonProposee?: string | null;
  // + champs passthrough
}
```

Stocké dans `store.draftValue`. `teamsText` recopié dans `store.teamsText` (éditable séparément). `soulLessonProposee` transmis à l'archivage si `wantSoulLesson`.

### 2.3 `ArchiveOutput` (`outputs.ts:58`)

```typescript
type ArchiveOutput = {
  archiveSteps: Array<{ t: string; d: string }>;
  newsletterText: string;
  soulVersion: string;
  // + champs passthrough
}
```

Stocké dans `store.archiveValue`. `newsletterText` copié dans le presse-papier par `Archived.tsx:57`.

### 2.4 `RunRawResult` (ingest)

```typescript
type RunRawResult = { ok: boolean; text: string }
```

Retourné en champ annexe `r.ingest` du résultat `archive-ingest`. Testé séparément par `Archived.tsx:38` (`r.ingest && !r.ingest.ok`).

---

## 3. Dispatch moteur (`engine.dispatch`)

Fichier : `src/main/engine.ts:136-156`

`dispatch` charge les agents (`loadAgents`), injecte les inputs manquants selon le skill, puis délègue à `runSkill` :

- **`breves-verify`** : si `inputs.sceptique == null` → injecte `byName.sceptique.mode` si l'agent est activé, sinon `'off'`. (`engine.ts:139-142`).
- **`breves-draft`** : si `inputs.redacteur == null` → injecte `'on'` si `byName.redacteur.enabled`, sinon `'off'`. (`engine.ts:143-146`).
- Passe `bbDir: deps.repoDir` (non `deps.bbDir`) comme cwd du SDK — vérifié en test (`tests/main/engine.test.mjs:90`).
- Passe `mcpServers: { 'boiling-brain-wiki': deps.wikiMcp }` si `deps.wikiMcp` est défini. Requis pour `drop_to_raw` et `/ingest`.
- Passe `agents: defs` si `Object.keys(defs).length > 0` (sous-agents activés uniquement).

---

## 4. Service LLM (`llm.service.runSkill`)

Fichier : `src/main/services/llm.service.ts:90-151`

Documenté en détail dans `docs/project/implementation.md §Service LLM`. Points propres au module :

1. **Validation entrée** : `validateInputs(skill, inputs)` → si `ok:false` → retour immédiat sans appel SDK (`llm.service.ts:98-104`).
2. **Construction prompt** : `buildPrompt(skill, inputs)` → `/breves-{verify|draft|archive}\nINPUTS:\n{JSON}` (`llm.service.ts:106`).
3. **Options SDK** (pertinentes pour le module) :
   - `permissionMode: 'bypassPermissions'` + `allowDangerouslySkipPermissions: true` — hardcodés, posture assumée (GAP-02).
   - `mcpServers` : injecté si défini, requis pour `drop_to_raw` (Phase 3).
   - `agents` : sous-agents SDK (`enqueteur`, `sceptique`, `redacteur` selon activation).
4. **Streaming** : pour chaque message `type:'assistant'`, `parseSentinels(text)` + `activityFromMessage(m)` → `onEvent(ev)`.
5. **Extraction JSON** : `extractJsonBlock(result.result)` → dernier bloc JSON fencé ou parse entier du texte.
6. **Validation sortie** : `VALIDATORS[skill](jsonBlock)` → `{ ok:true, value }` ou `{ ok:false, errors }`. Si KO → `onEvent({ type:'result-error' })` + retour `{ ok:false }`.

---

## 5. Machine à états `Card` (domaine)

Fichier : `src/domain/checking.ts`

La machine d'états des cards est **fonctionnelle pure** (pas de classe, pas d'effet). L'état est porté dans le store sous la forme `Card[]`.

Transitions constatées :
```
initCard(key, title)        → Card { steps:[active,todo,todo,todo,todo], done:false }
applyEvent([],topic-detected) → [Card(key)]          (idempotent si déjà présente)
applyEvent(cards,topic-progress,step) → step.state='done', suivant='active'
applyEvent(cards,topic-done)  → allDone(), status='Terminé'
applyEvent(cards,topic-error) → done=true, status='Erreur', error=message
applyResult(cards,{topics})   → filet zéro-sentinelle (crée si absent, allDone si pas d'erreur)
```

`applyResult` est le filet de rattrapage : si des topics arrivent dans `VerifyOutput` sans sentinelles préalables (échec réseau partiel), leurs cards sont quand même créées et terminées.

---

## 6. Protocole de sentinelles `«BREVES»`

Lignes texte préfixées émises par le SDK dans les messages `type:'assistant'`. Parsées par `parseSentinels` (`src/domain/edition.ts:218`).

| Ligne sentinel | TopicEvent produit |
|---|---|
| `«BREVES» topic <key> \| <sujet>` | `{ type:'topic-detected', key, sujet }` |
| `«BREVES» step <key> <étape>` | `{ type:'topic-progress', key, step }` (si `étape ∈ SENTINEL_STEPS`) |
| `«BREVES» done <key>` | `{ type:'topic-done', key }` |
| `«BREVES» error <key> \| <message>` | `{ type:'topic-error', key, error }` |

`SENTINEL_STEPS = ['recherche','faits','date','source','article']` (`edition.ts:194`) — duplique `STEPS` (`checking.ts:3`) : voir GAP-07.

Un step inconnu (non dans `SENTINEL_STEPS`) est ignoré silencieusement (`parseSentinels` retourne `[]`).
_Trace test : `tests/domain/parse-result.test.mjs:28-29` (« ignore un step inconnu »)._

---

## 7. Contraintes spécifiques

### 7.1 `bypassPermissions` (socle, référence)
`permissionMode:'bypassPermissions'` + `allowDangerouslySkipPermissions:true` hardcodés dans `llm.service.ts:115-116`. Le SDK exécute les outils (WebSearch, WebFetch, MCP `drop_to_raw`) sans confirmation. Posture assumée (app locale de confiance). Voir GAP-02 et `docs/project/implementation.md §Sécurité`.

### 7.2 Plafond 15 sujets (limite douce)
Défini en prose dans `.claude/commands/breves-verify.md:17`. Aucune validation `topics.length <= 15` côté Zod ou handler. La limite est appliquée par l'agent LLM. Voir GAP-09.

### 7.3 Dépendance MCP `boiling-brain-wiki`
`drop_to_raw` (Phase 3 — notes + clippings) et `/ingest` (Phase 3 — ingestion wiki) nécessitent le serveur MCP Python (`buildWikiMcp`, `env.ts:44-50`) actif dans `bbDir`. Si `deps.wikiMcp` est `undefined` (bbDir non configuré ou script Python absent), le canal MCP n'est pas injecté → Phase 3 partiellement inopérante. Voir GAP-10.

### 7.4 Pattern store `getState()` à chaud
`Editor.tsx:34` et `Archived.tsx:18` lisent `useAppStore.getState()` dans leurs fonctions async (`runDraft`, `runArchive`) **au moment de l'appel**, pas au montage. Ce pattern évite les closures périmées sur `verifyValue`, `draftValue`, `teamsText` — valeurs mises à jour après un feedback ou une correction directe.

### 7.5 Guards de montage unique (once)
- `Editor.tsx:52-59` : `drafted.current = true` avant l'appel `runDraft()` — garantit une seule rédaction auto.
- `Archived.tsx:46-54` : `archivedOnce.current = true` — garantit un seul archivage auto.
Ces guards protègent contre les remontages React en StrictMode.

### 7.6 Sélecteur `sceptique.mode` depuis les agents
`engine.dispatch` (`engine.ts:139-142`) lit `byName.sceptique` depuis les fichiers agents (via `loadAgents`). Si l'agent est désactivé (`enabled: false`) ou absent, `sceptique` reste `'off'`. Ce comportement est testé dans `tests/main/engine.test.mjs:157-165`.

---

## GAPS À REMONTER

| # | Type | Observation | À trancher par |
|---|---|---|---|
| GAP-07 | divergence | `SENTINEL_STEPS` (`edition.ts:194`) duplique `STEPS` (`checking.ts:3`) — risque de drift si l'une change sans mettre à jour l'autre | Lead Dev |
| GAP-09 | edge-case | Plafond 15 sujets en prose uniquement — pas de validation Zod côté code | PM / Lead Dev |
| GAP-02 | sécurité | `bypassPermissions` hardcodé — posture assumée, non documentée comme décision explicite | PM / Security |
| GAP-10 | intention | Ingest inopérant sans bbDir+MCP Python actifs — pas de dégradation gracieuse | PM / Architecte |
| GAP-05 | divergence | Versioning SOUL calculé en double (`soul.ts:67` ET `breves-archive.md`) — risque de drift | PM / Lead Dev |
