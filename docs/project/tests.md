# Stratégie de Tests — Brèves IA

> Framework : **reverse (constat)** · cartographié à `4ce7095` (2026-06-27).
> On **constate la couverture réellement en place**, on ne fixe pas de cible idéale. Chaque
> assertion renvoie aux fichiers de test réels. Le code et les tests font foi.

---

## 1. Pyramide réelle (constatée)

Forte base **unitaire** (logique pure `domain/`, schémas Zod, store Zustand), une couche
**intégration** côté `main/` (handlers IPC + engine avec dépendances injectées, `llm.service`
avec SDK mocké par injection d'un `query` factice), des **invariants** de design system, et
**pas de vrai E2E** — remplacé par un **smoke-boot** qui prouve le chargement du SDK dans le
binaire Forge réel (`npm run smoke`).

| Couche | Nb fichiers | Sous-dossier | Ce qui est couvert |
| --- | --- | --- | --- |
| Domain (pur) | 11 | `tests/domain/` | soul, edition (rendu+breves), checking, agents-file, commands, format, frontmatter, navigation, parse-result, activity |
| Main (intégration) | 11 | `tests/main/` | engine (dispatch/SOUL/agents/commands/archive), llm.service, command.handlers, commands.handlers, config, env, editions-io, soul-io, readonly.handlers, settings.handlers, system.handlers |
| Renderer — store/hooks/invariants | 9 | `tests/renderer/` | app.store (5 fichiers : base, flow, editor, reader, soul), niveau, tokens, stories-coverage, useCommandStream |
| Renderer — primitives UI (SSR) | 12 | `tests/renderer/ui/` | Alert, Badge, Button, Card, Eyebrow, Modal, Pill, Spinner, StatusDot, Stepper, Text, Textarea |
| Shared (contrats) | 4 | `tests/shared/` | inputs, outputs, skills, errors |
| Racine (alias build) | 1 | `tests/` | alias.test.mjs |
| **Total** | **48** | `tests/**` | |

**Smoke** : `scripts/smoke-boot.mjs` lance `npm start` avec `BREVES_SMOKE=1`, attend la sentinelle
`SMOKE_SDK_OK` (le main importe dynamiquement le SDK puis quitte — `src/main/index.ts:44-51`) ou
échoue après 60 s. Non exécuté par le hook pre-commit : commande dédiée `npm run smoke`.

---

## 2. Outils (constatés)

| Outil | Usage | Trace |
|---|---|---|
| **Vitest 4** | runner, `environment: 'node'`, `include: tests/**/*.test.mjs` | `vitest.config.mjs` |
| `node:assert/strict` | assertions (pas de matchers `expect` custom ni de `describe`) | tous les fichiers de test |
| `react-dom/server` (`renderToStaticMarkup`) | rendu SSR des primitives UI vers HTML, assertions sur le markup | `tests/renderer/ui/*.test.mjs` |
| `npm` | gestionnaire de paquets (pas pnpm) | `package.json` |
| alias `@main…@assets` | résolus identiquement au build via `vitest.config.mjs` | `vitest.config.mjs:12-20` |

**Pas de testing-library / jsdom / happy-dom** (constaté) : l'environnement est Node pur. Les
composants React sont vérifiés par rendu serveur en chaîne de caractères, pas par interaction DOM.
Aucune dépendance `@testing-library/*` dans `package.json`.

---

## 3. Couverture qualitative (aucun seuil configuré)

**Aucun seuil de couverture n'est configuré** (constaté : `vitest.config.mjs` ne contient ni bloc
`coverage` ni cible `statements`/`branches`/`lines`). La couverture est donc évaluée
qualitativement par couche :

| Zone | État | Trace |
|---|---|---|
| `domain/` — soul, edition, checking, agents, commands, format, frontmatter, navigation, parse-result, activity | ✅ large | `tests/domain/*` |
| `shared/schemas/` — inputs (anti-injection), outputs (Zod), skills (allow-list), errors | ✅ | `tests/shared/*` |
| `main/services/llm.service` — runSkill (sentinelles→events, Zod output), runRaw, SDK mocking | ✅ SDK mocké par injection | `tests/main/llm.service.test.mjs` |
| `main/engine` — dispatch, archiveAndIngest, CRUD SOUL/agents/commands, loadAgents, applyConfig, anti-traversal | ✅ | `tests/main/engine.test.mjs` |
| `main/ipc/` — command, commands, config, env, editions-io, soul-io, readonly, settings, system handlers | ✅ | `tests/main/*.test.mjs` |
| `renderer/store/app.store` — état initial, navigation, flux verify/draft, reader, soul, editor | ✅ | `tests/renderer/app.store*.test.mjs` |
| `renderer/hooks/useCommandStream` | ✅ | `tests/renderer/useCommandStream.test.mjs` |
| `renderer/components/ui/` (12 primitives) | ✅ SSR | `tests/renderer/ui/*.test.mjs` |
| `renderer/components/niveau` | ✅ | `tests/renderer/niveau.test.mjs` |
| `renderer/styles/tokens.css` | ✅ non-régression | `tests/renderer/tokens.test.mjs` |
| `renderer/pages/*` (15 pages) | ❌ **non testées directement** | — |
| `src/main/index.ts` (boot, BrowserWindow) | ❌ couvert indirectement par smoke uniquement | `scripts/smoke-boot.mjs` |
| `src/preload/index.ts` | ❌ non testé | — |

---

## 4. Conventions (constatées)

### Nommage et emplacement

Tests **non colocalisés** : tous sous `tests/`, miroir de `src/`. Extension `*.test.mjs` (modules
ES natifs — pas TypeScript, pas CommonJS). Pattern Vitest : `include: ['tests/**/*.test.mjs']`
(`vitest.config.mjs:8`).

Arborescence réelle :

```text
tests/
  alias.test.mjs
  domain/          (11 fichiers)
  main/            (11 fichiers)
  renderer/        (9 fichiers dont useCommandStream.test.mjs)
  renderer/ui/     (12 fichiers)
  shared/          (4 fichiers)
  fixtures/
    SOUL.full.md
    SOUL.sample.md
    agent.sample.md
    note.sample.md
```

### Format réel d'un cas

Style direct `test('description', fn)` + `assert` de `node:assert/strict`. Pas de `describe`,
pas de `beforeEach` global. Exemple SSR (primitives UI) :

```javascript
// tests/renderer/ui/Button.test.mjs
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { Button } from '@renderer/components/ui/Button';

test('Button primary rend un bouton avec data-variant', () => {
  const html = renderToStaticMarkup(h(Button, { variant: 'primary' }, 'Lancer'));
  assert.ok(html.includes('data-variant="primary"'));
});
```

Exemple SDK mocké par injection (intégration `main/`) :

```javascript
// tests/main/llm.service.test.mjs
function fakeQuery(messages) {
  return async function* () { for (const m of messages) yield m; };
}
// runSkill reçoit query: fakeQuery(stream) au lieu du vrai SDK
const r = await runSkill({ skill: 'breves-verify', inputs: { sujets: 'x' },
  bbDir: '/tmp/bb', onEvent: (e) => events.push(e), query: fakeQuery(stream) });
```

### Fixtures

`tests/fixtures/` contient 4 fichiers markdown réels utilisés comme données d'entrée :

| Fixture | Usage |
|---|---|
| `SOUL.full.md` | Parsing complet `parseSoul` + `saveSoulSections` (`tests/main/engine.test.mjs`) |
| `SOUL.sample.md` | Parsing minimal soul |
| `agent.sample.md` | Parsing `parseAgent` (`tests/domain/agents-file.test.mjs`) |
| `note.sample.md` | Parsing éditions/brèves |

---

## 5. Invariants et scénarios critiques (constatés)

| Invariant | Garantie | Trace |
|---|---|---|
| **stories↔composants** | Chaque `*.tsx` de `components/` et `components/ui/` a une `*.stories.tsx` — vérifié par scan `readdirSync` | `tests/renderer/stories-coverage.test.mjs` |
| **Tokens CSS** | Échelle `--space-{1..6}` et tokens sémantiques (`--accent`, `--good`, `--warn`, etc.) présents dans `tokens.css` | `tests/renderer/tokens.test.mjs` |
| **Contrat verify bout en bout (mocké)** | Sentinelles `«BREVES» topic/step/done` → events typés + sortie Zod validée sans appeler le vrai SDK | `tests/main/llm.service.test.mjs` |
| **Rejet inputs invalides avant SDK** | `validateInputs` renvoie `{ok:false}`, `query` n'est pas appelée | `tests/main/llm.service.test.mjs`, `tests/shared/inputs.test.mjs` |
| **Contrats Zod outputs** | Formes verify/draft/archive validées + cas de rejet (champ manquant, enum invalide) | `tests/shared/outputs.test.mjs` |
| **Machine d'états checking** | `initCard`, `applyEvent` (topic-detected/progress/done/error), `applyResult` (filet zéro-sentinelle), `summary` | `tests/domain/checking.test.mjs` |
| **Parsing SOUL** | `parseSoul`, `replaceSoulSections`, `replaceSoulEchantillons` sur fixture réelle | `tests/domain/soul.test.mjs`, `tests/main/engine.test.mjs` |
| **Parsing éditions** | `extractBreves`, `renderEditionHtml`, `extractJsonBlock`, `parseSentinels` | `tests/domain/edition-breves.test.mjs`, `tests/domain/edition-render.test.mjs` |
| **Anti-traversal** | `saveAgent`/`saveCommand` refusent `../evil`, `a/b`, `a\b`, `..` — aucune écriture hors dossier cible | `tests/main/engine.test.mjs` (saveAgent, saveCommand) |
| **Handlers en lecture seule** | Non-mutation des données de lecture | `tests/main/readonly.handlers.test.mjs` |
| **Allow-list skills** | `ALLOWED_SKILLS` = `['breves-verify','breves-draft','breves-archive']` ; `buildPrompt` lève hors liste | `tests/shared/skills.test.mjs` |
| **Anti-injection control-chars** | `validateInputs` refuse ` `, `\t`… sauf `\n` | `tests/shared/inputs.test.mjs` |
| **Alias build** | `@config/constants` résolu identiquement en test et en build Forge | `tests/alias.test.mjs` |

---

## 6. Intégration CI/CD (constatée)

**Pas de CI cloud** : le dossier `.github/workflows` est absent. La seule gate automatisée est le
**hook pre-commit Husky** :

```sh
# .husky/pre-commit
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm use >/dev/null 2>&1
npm run typecheck && npm run lint && npm test
```

| Étape | Commande | Outil | Trace |
| --- | --- | --- | --- |
| Typecheck | `npm run typecheck` | `tsc --noEmit` via `scripts/typecheck.mjs` | `package.json:17` |
| Lint | `npm run lint` | ESLint 9 flat config | `package.json:18` |
| Tests unitaires + intégration | `npm test` | `vitest run` | `package.json:13` |
| Smoke boot (manuel) | `npm run smoke` | `scripts/smoke-boot.mjs` | `package.json:20` |

Le smoke n'est **pas** dans le hook — il est déclenché manuellement (nécessite Electron Forge
démarré, plus long que le hook).

---

## 7. Stratégie de mocking (constatée)

**Mocké par injection de dépendance** : aucun `vi.mock()` / `jest.mock()` global. Deux points
d'injection :

1. **SDK Claude** — `runSkill` et `runRaw` (`src/main/services/llm.service.ts`) acceptent un
   paramètre `query` optionnel. Les tests passent un générateur async `fakeQuery(messages)` qui
   émet des messages `assistant` et un `result` sans déclencher aucun appel réseau.
   Trace : `tests/main/llm.service.test.mjs:1-9`.

2. **Dépendances de l'engine** (`EngineDeps`) — `dispatch`, `getDashboard`, `archiveAndIngest`,
   etc. acceptent un objet `deps` (I/O FS, `runSkill`, `runRaw`, `readdir`, `readFile`, `writeFile`).
   Les tests surcharge ce `deps` avec des fonctions espionnes ou des systèmes de fichiers temporaires
   (`mkdtempSync`).
   Trace : `tests/main/engine.test.mjs`.

**Non mocké** : toute la **logique pure** `domain/` (parsing, machine d'états, format, navigation),
les **schémas Zod** `shared/`, les **primitives UI** (rendues réellement par `renderToStaticMarkup`).

---

## GAPS À REMONTER

1. **Pages React non testées** : `renderer/pages/*` (15 pages — Dashboard, Compose, Checking,
   Detail, Editor, Archived, Soul, EchEditions, EchBreves, History, Reader, Agents, Commands,
   Settings) n'ont aucun test direct. Constaté : aucun fichier `tests/renderer/pages/` n'existe.

2. **`preload/index.ts` non testé** : la surface `window.api` (20 canaux) et l'alias rétro-compat
   `window.breves` ne sont couverts par aucun test. Constaté : pas de `tests/preload/`.

3. **Aucun seuil de couverture configuré** : `vitest.config.mjs` ne contient pas de bloc
   `coverage`. Il est impossible de savoir si des chemins de code dans `main/` ou `domain/` sont
   non exercés. Un `coverage: { provider: 'v8', thresholds: {...} }` permettrait de formaliser la
   cible.

4. **Pas de CI cloud** : seul le hook pre-commit protège `main`. Une PR qui bypasse le hook (ex.
   `--no-verify`) ou un push direct contourne toute gate de test.

5. **Smoke non automatisé** : `npm run smoke` vérifie le chargement SDK dans le binaire Forge réel
   mais n'est pas déclenché par le hook ni par un job CI. Un crash de résolution du SDK (ex. drift
   `extraResource`) passerait inaperçu jusqu'au test manuel.
