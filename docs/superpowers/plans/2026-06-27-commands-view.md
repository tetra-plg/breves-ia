# Vue Commandes + catalogue d'icônes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une vue Commandes pour éditer les slash-commands `breves-{verify,draft,archive}` (description + corps) dans `<repoDir>/.claude/commands/`, calquée sur la vue Agents ; renommer `repoDir` dans Réglages ; cataloguer les icônes dans Storybook.

**Architecture:** Domaine `commands.ts` (parse/serialize d'un `.md` frontmatter+corps, via un `splitFrontmatter` extrait en `frontmatter.ts`). Engine `getCommands`/`saveCommand` + IPC, calqués 1:1 sur Agents. Renderer : composite `CommandCard` (design system + story), page `Commands`, 6e icône header `⌘`. Catalogue d'icônes = page Fondations MDX.

**Tech Stack:** Electron (main + preload + IPC), React 19 + Zustand, TypeScript, Vitest (`.mjs`), Storybook (CSF3 + addon-docs MDX).

## Global Constraints

- Node **22** (`.nvmrc`). Charger nvm avant tout build/commit : `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22`.
- Tests : `tests/**/*.test.mjs`, `import { test } from 'vitest'` + `import assert from 'node:assert/strict'`. Alias `@main`, `@domain`, `@shared`.
- Hook pre-commit Husky : typecheck + lint + test à chaque commit.
- Pas de nouvelle dépendance runtime. Français pour libellés/messages (accents corrects).
- **Design system** : tout nouveau composant = `X.tsx` + `X.module.css` + `X.stories.tsx` (CSF3, `@storybook/react-vite`). Composite → `src/renderer/components/`, titre `Composants/X`. Privilégier les tokens/CSS module aux styles inline ; réutiliser les primitives (Input, Textarea, Button, Eyebrow, Card).
- Les 3 commands sont éditables (description + corps) ; le **nom est figé** (= nom de fichier = identité du slash-command).
- 6e icône header : `⌘`, `title="Commandes"`. Titre de vue : « Commandes ». Label repoDir : « Repo Brèves ».
- Catalogue d'icônes : page MDX `Fondations/Icônes` (pas de composant `Icon`).

---

## File Structure

- `src/domain/frontmatter.ts` (neuf) — `splitFrontmatter` partagé.
- `src/domain/agents.ts` (modif) — importe `splitFrontmatter` (retire la copie privée).
- `src/domain/commands.ts` (neuf) — `Command`, `CommandEdits`, `parseCommand`, `serializeCommand`.
- `src/main/engine.ts` (modif) — `loadCommands`, `getCommands`, `saveCommand` + re-export `CommandEdits`.
- `src/main/ipc/commands.handlers.ts` (neuf) — `registerCommandsHandlers`.
- `src/main/ipc/index.ts` (modif) — enregistre les handlers.
- `src/shared/types/ipc.ts` (modif) — canaux `getCommands`/`saveCommand`.
- `src/shared/types/api.ts` (modif) — méthodes `Api`.
- `src/preload/index.ts` (modif) — câblage.
- `src/domain/navigation.ts` (modif) — vue `commands`.
- `src/renderer/components/CommandCard.{tsx,module.css,stories.tsx}` (neufs).
- `src/renderer/pages/Commands.tsx` (neuf) + `src/renderer/App.tsx` (modif).
- `src/renderer/layouts/Shell.tsx` (modif) — 6e icône.
- `src/renderer/pages/Settings.tsx` (modif) — label repoDir.
- `src/renderer/components/foundations/Icones.mdx` (neuf).

---

## Task 1 : Extraire `splitFrontmatter` (`frontmatter.ts`) + refacto agents

**Files:**
- Create: `src/domain/frontmatter.ts`, `tests/domain/frontmatter.test.mjs`
- Modify: `src/domain/agents.ts`

**Interfaces:**
- Produces: `splitFrontmatter(raw: string): { fm: Record<string, string>; body: string }`.

- [ ] **Step 1: Write the failing test**

```js
// tests/domain/frontmatter.test.mjs
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { splitFrontmatter } from '@domain/frontmatter';

test('splitFrontmatter: extrait fm + body', () => {
  const { fm, body } = splitFrontmatter('---\ndescription: hello\n---\n\nLe corps.');
  assert.equal(fm.description, 'hello');
  assert.equal(body, 'Le corps.');
});

test('splitFrontmatter: sans frontmatter → fm vide, body = tout (trim)', () => {
  const { fm, body } = splitFrontmatter('Juste du texte.');
  assert.deepEqual(fm, {});
  assert.equal(body, 'Juste du texte.');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/domain/frontmatter.test.mjs`
Expected: FAIL (`@domain/frontmatter` introuvable).

- [ ] **Step 3: Create `frontmatter.ts`** (copie exacte de la fonction privée actuelle d'agents.ts)

```ts
// src/domain/frontmatter.ts
export function splitFrontmatter(raw: string): { fm: Record<string, string>; body: string } {
  const m = String(raw).match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: String(raw).trim() };
  const fm: Record<string, string> = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i === -1) continue;
    fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { fm, body: m[2].trim() };
}
```

- [ ] **Step 4: Refactor `agents.ts` to use it**

Dans `src/domain/agents.ts` : **supprimer** la fonction privée `function splitFrontmatter(...) { ... }` (≈ lignes 22-33) et ajouter en haut du fichier l'import :

```ts
import { splitFrontmatter } from '@domain/frontmatter';
```

(`parseAgent` continue d'appeler `splitFrontmatter(raw)` — signature identique.)

- [ ] **Step 5: Run tests (frontmatter + non-régression agents)**

Run: `npx vitest run tests/domain/frontmatter.test.mjs` puis `npx vitest run`
Expected: frontmatter 2/2 PASS ; tous les tests agents existants restent verts ; suite complète verte.

- [ ] **Step 6: Commit**

```bash
git add src/domain/frontmatter.ts src/domain/agents.ts tests/domain/frontmatter.test.mjs
git commit -m "refactor(domain): splitFrontmatter partagé (frontmatter.ts)"
```

---

## Task 2 : Domaine `commands.ts`

**Files:**
- Create: `src/domain/commands.ts`, `tests/domain/commands.test.mjs`

**Interfaces:**
- Consumes: `splitFrontmatter` (Task 1).
- Produces: `interface Command { name: string; description: string; body: string }`, `interface CommandEdits { description: string; body: string }`, `parseCommand(raw): { description: string; body: string }`, `serializeCommand(edits: { description: string; body: string }): string`.

- [ ] **Step 1: Write the failing test**

```js
// tests/domain/commands.test.mjs
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { parseCommand, serializeCommand } from '@domain/commands';

test('parseCommand extrait description + body', () => {
  const c = parseCommand('---\ndescription: Phase 1\n---\n\n# /breves-verify\n\nContenu.');
  assert.equal(c.description, 'Phase 1');
  assert.equal(c.body, '# /breves-verify\n\nContenu.');
});

test('serializeCommand round-trip', () => {
  const raw = serializeCommand({ description: 'Phase 1', body: 'Contenu.' });
  const c = parseCommand(raw);
  assert.equal(c.description, 'Phase 1');
  assert.equal(c.body, 'Contenu.');
});

test('serializeCommand: description vide → frontmatter valide', () => {
  const raw = serializeCommand({ description: '', body: 'X' });
  assert.match(raw, /^---\ndescription: \n---\n/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/domain/commands.test.mjs`
Expected: FAIL (`@domain/commands` introuvable).

- [ ] **Step 3: Implement**

```ts
// src/domain/commands.ts
import { splitFrontmatter } from '@domain/frontmatter';

export interface Command {
  name: string;
  description: string;
  body: string;
}

export interface CommandEdits {
  description: string;
  body: string;
}

export function parseCommand(raw: string): { description: string; body: string } {
  const { fm, body } = splitFrontmatter(raw);
  return { description: fm.description || '', body };
}

export function serializeCommand(edits: { description: string; body: string }): string {
  return `---\ndescription: ${edits.description || ''}\n---\n\n${(edits.body || '').trim()}\n`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/domain/commands.test.mjs`
Expected: PASS (3).

- [ ] **Step 5: Commit**

```bash
git add src/domain/commands.ts tests/domain/commands.test.mjs
git commit -m "feat(domain): commands (parse/serialize .claude/commands)"
```

---

## Task 3 : Engine — `loadCommands` / `getCommands` / `saveCommand`

**Files:**
- Modify: `src/main/engine.ts`
- Test: `tests/main/engine.test.mjs` (ajout)

**Interfaces:**
- Consumes: `parseCommand`, `serializeCommand`, `Command`, `CommandEdits` (Task 2) ; `EngineDeps` (existant).
- Produces: `getCommands(deps): Command[]` (trié par `name`), `saveCommand(deps, name, edits: CommandEdits): { ok: boolean; error?: string }`, re-export type `CommandEdits`.

- [ ] **Step 1: Write the failing test**

```js
// tests/main/engine.test.mjs — AJOUTER
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getCommands, saveCommand } from '@main/engine';

function repoWithCommands() {
  const repo = mkdtempSync(join(tmpdir(), 'repo-'));
  mkdirSync(join(repo, '.claude', 'commands'), { recursive: true });
  writeFileSync(join(repo, '.claude', 'commands', 'breves-verify.md'), '---\ndescription: P1\n---\n\nCorps V.');
  writeFileSync(join(repo, '.claude', 'commands', 'breves-archive.md'), '---\ndescription: P3\n---\n\nCorps A.');
  return repo;
}
const depsFor = (repo) => ({
  repoDir: repo,
  readdir: (p) => readdirSync(p),
  readFile: (p) => readFileSync(p, 'utf8'),
  writeFile: (p, t) => writeFileSync(p, t, 'utf8'),
});

test('getCommands: liste triée, name = filename', () => {
  const deps = depsFor(repoWithCommands());
  const cmds = getCommands(deps);
  assert.equal(cmds.length, 2);
  assert.equal(cmds[0].name, 'breves-archive'); // trié alpha
  assert.equal(cmds[0].description, 'P3');
  assert.equal(cmds[1].name, 'breves-verify');
  assert.equal(cmds[1].body, 'Corps V.');
});

test('getCommands: dossier absent → []', () => {
  const deps = depsFor(mkdtempSync(join(tmpdir(), 'empty-')));
  assert.deepEqual(getCommands(deps), []);
});

test('saveCommand: refuse corps vide, écrit sinon, name figé', () => {
  const deps = depsFor(repoWithCommands());
  assert.equal(saveCommand(deps, 'breves-verify', { description: 'D', body: '' }).ok, false);
  const r = saveCommand(deps, 'breves-verify', { description: 'D', body: 'Nouveau corps.' });
  assert.equal(r.ok, true);
  const c = getCommands(deps).find((x) => x.name === 'breves-verify');
  assert.equal(c.body, 'Nouveau corps.');
  assert.equal(c.description, 'D');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/main/engine.test.mjs`
Expected: FAIL (`getCommands`/`saveCommand` non exportés).

- [ ] **Step 3: Implement**

Dans `src/main/engine.ts` : ajouter l'import (près de l'import `@domain/agents`) et les fonctions (après `saveAgent`).

```ts
import { parseCommand, serializeCommand, type Command, type CommandEdits } from '@domain/commands';
export type { CommandEdits };
```

```ts
export function loadCommands(deps: EngineDeps): Command[] {
  const dir = join(deps.repoDir, '.claude', 'commands');
  let files: string[] = [];
  try {
    files = deps.readdir(dir);
  } catch {
    return [];
  }
  const out: Command[] = [];
  for (const f of files.filter((x) => x.endsWith('.md'))) {
    const { description, body } = parseCommand(deps.readFile(join(dir, f)));
    out.push({ name: f.replace(/\.md$/, ''), description, body });
  }
  return out;
}

export function getCommands(deps: EngineDeps): Command[] {
  return loadCommands(deps).sort((a, b) => a.name.localeCompare(b.name));
}

export function saveCommand(deps: EngineDeps, name: string, edits: CommandEdits): { ok: boolean; error?: string } {
  if (!name || typeof edits?.body !== 'string' || !edits.body.trim()) {
    return { ok: false, error: 'nom ou corps vide' };
  }
  const path = join(deps.repoDir, '.claude', 'commands', `${name}.md`);
  try {
    deps.writeFile(path, serializeCommand({ description: edits.description ?? '', body: edits.body }));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/main/engine.test.mjs`
Expected: PASS (existants + 3 nouveaux).

- [ ] **Step 5: Commit**

```bash
git add src/main/engine.ts tests/main/engine.test.mjs
git commit -m "feat(engine): getCommands / saveCommand (.claude/commands)"
```

---

## Task 4 : IPC — canaux, api, preload, handlers

**Files:**
- Modify: `src/shared/types/ipc.ts`, `src/shared/types/api.ts`, `src/preload/index.ts`, `src/main/ipc/index.ts`
- Create: `src/main/ipc/commands.handlers.ts`
- Test: `tests/main/commands.handlers.test.mjs`

**Interfaces:**
- Consumes: `getCommands`/`saveCommand` (Task 3), `Command`/`CommandEdits`.
- Produces: `registerCommandsHandlers(ipc, deps): void` ; `Api.getCommands()` / `Api.saveCommand(name, edits)`.

> Attention : il existe déjà `command.handlers.ts` / `registerCommandHandlers` (singulier) pour l'exécution des skills. Le nouveau fichier est `commands.handlers.ts` / `registerCommandsHandlers` (pluriel) pour l'édition des fichiers de commands. Ne pas les confondre.

- [ ] **Step 1: Write the failing test**

```js
// tests/main/commands.handlers.test.mjs
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { registerCommandsHandlers } from '@main/ipc/commands.handlers';

function fakeIpc() {
  const h = {};
  return { ipc: { handle: (ch, fn) => { h[ch] = fn; } }, h };
}
function depsWithCommand() {
  const repo = mkdtempSync(join(tmpdir(), 'repo-'));
  mkdirSync(join(repo, '.claude', 'commands'), { recursive: true });
  writeFileSync(join(repo, '.claude', 'commands', 'breves-verify.md'), '---\ndescription: P1\n---\n\nCorps.');
  return { repoDir: repo, readdir: (p) => readdirSync(p), readFile: (p) => readFileSync(p, 'utf8'), writeFile: (p, t) => writeFileSync(p, t, 'utf8') };
}

test('get-commands renvoie la liste', async () => {
  const { ipc, h } = fakeIpc();
  registerCommandsHandlers(ipc, depsWithCommand());
  const cmds = await h['get-commands'](null);
  assert.equal(cmds[0].name, 'breves-verify');
});

test('save-command écrit puis get-commands reflète', async () => {
  const { ipc, h } = fakeIpc();
  const deps = depsWithCommand();
  registerCommandsHandlers(ipc, deps);
  const r = await h['save-command'](null, { name: 'breves-verify', edits: { description: 'P1b', body: 'Maj.' } });
  assert.equal(r.ok, true);
  const c = (await h['get-commands'](null))[0];
  assert.equal(c.description, 'P1b');
  assert.equal(c.body, 'Maj.');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/main/commands.handlers.test.mjs`
Expected: FAIL (`@main/ipc/commands.handlers` introuvable).

- [ ] **Step 3a: Canaux** — dans `src/shared/types/ipc.ts`, ajouter dans l'objet `IPC` :

```ts
  getCommands: 'get-commands',
  saveCommand: 'save-command',
```

- [ ] **Step 3b: Types Api** — dans `src/shared/types/api.ts` :
- ajouter l'import : `import type { Command, CommandEdits } from '@domain/commands';`
- dans l'interface `Api`, ajouter :

```ts
  getCommands(): Promise<Command[]>;
  saveCommand(name: string, edits: CommandEdits): Promise<SaveResult>;
```

- [ ] **Step 3c: Handlers** — créer `src/main/ipc/commands.handlers.ts` :

```ts
import { getCommands, saveCommand, type EngineDeps, type CommandEdits } from '@main/engine';
import { IPC, type IpcLike } from '@shared/types/ipc';

export function registerCommandsHandlers(ipc: IpcLike, deps: EngineDeps): void {
  ipc.handle(IPC.getCommands, () => getCommands(deps));
  ipc.handle(IPC.saveCommand, (_e, payload: unknown) => {
    const { name, edits } = (payload ?? {}) as { name: string; edits: CommandEdits };
    return saveCommand(deps, name, edits);
  });
}
```

- [ ] **Step 3d: Preload** — dans `src/preload/index.ts`, ajouter à l'objet `api` :

```ts
  getCommands: () => ipcRenderer.invoke(IPC.getCommands),
  saveCommand: (name, edits) => ipcRenderer.invoke(IPC.saveCommand, { name, edits }),
```

- [ ] **Step 3e: Enregistrement** — dans `src/main/ipc/index.ts` : ajouter l'import et l'appel.

```ts
import { registerCommandsHandlers } from '@main/ipc/commands.handlers';
```

et dans `registerAllHandlers`, après `registerAgentsHandlers(ipc, deps);` :

```ts
  registerCommandsHandlers(ipc, deps);
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npx vitest run tests/main/commands.handlers.test.mjs && npm run typecheck && npm run lint`
Expected: 2/2 PASS, typecheck + lint verts.

- [ ] **Step 5: Commit**

```bash
git add src/shared/types/ipc.ts src/shared/types/api.ts src/preload/index.ts \
        src/main/ipc/commands.handlers.ts src/main/ipc/index.ts tests/main/commands.handlers.test.mjs
git commit -m "feat(ipc): handlers getCommands / saveCommand"
```

---

## Task 5 : Navigation — vue `commands`

**Files:**
- Modify: `src/domain/navigation.ts`
- Test: `tests/domain/navigation.test.mjs` (ajout)

**Interfaces:**
- Produces: `nextView(_, 'goCommands') === 'commands'`, `viewTitle('commands') === 'Commandes'`, `'commands' ∈ VIEWS`.

- [ ] **Step 1: Write the failing test** — AJOUTER dans `tests/domain/navigation.test.mjs` :

```js
import { nextView, viewTitle, VIEWS } from '@domain/navigation';

test('goCommands → commands', () => {
  assert.equal(nextView('dashboard', 'goCommands'), 'commands');
});
test('viewTitle(commands) = Commandes', () => {
  assert.equal(viewTitle('commands'), 'Commandes');
});
test('VIEWS contient commands', () => {
  assert.ok(VIEWS.includes('commands'));
});
```

(Si `nextView`/`viewTitle`/`VIEWS` sont déjà importés en tête du fichier, ne pas dupliquer l'import.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/domain/navigation.test.mjs`
Expected: FAIL (les 3 nouveaux).

- [ ] **Step 3: Implement** — dans `src/domain/navigation.ts` :
- ajouter `'commands'` à la fin du tableau `VIEWS` ;
- dans `ACTIONS`, ajouter `goCommands: 'commands',` ;
- dans `viewTitle`, avant le `return 'Brèves IA'` final, ajouter :

```ts
  if (view === 'commands') return 'Commandes';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/domain/navigation.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/navigation.ts tests/domain/navigation.test.mjs
git commit -m "feat(nav): vue commands (goCommands + Commandes)"
```

---

## Task 6 : Composite `CommandCard` + story

**Files:**
- Create: `src/renderer/components/CommandCard.tsx`, `CommandCard.module.css`, `CommandCard.stories.tsx`

**Interfaces:**
- Consumes: `Command`/`CommandEdits` (Task 2), primitives `Input`, `Textarea`, `Button`, `Eyebrow`, `Card`.
- Produces: `CommandCard` props `{ command: Command; onSave: (edits: CommandEdits) => void }`.

- [ ] **Step 1: Create the component**

```tsx
// src/renderer/components/CommandCard.tsx
import { useState } from 'react';
import type { Command, CommandEdits } from '@domain/commands';
import { Eyebrow } from '@renderer/components/ui/Eyebrow';
import { Button } from '@renderer/components/ui/Button';
import { Card } from '@renderer/components/ui/Card';
import { Input } from '@renderer/components/ui/Input';
import { Textarea } from '@renderer/components/ui/Textarea';
import s from './CommandCard.module.css';

interface CommandCardProps {
  command: Command;
  onSave: (edits: CommandEdits) => void;
}

export function CommandCard({ command, onSave }: CommandCardProps) {
  const [description, setDescription] = useState(command.description ?? '');
  const [body, setBody] = useState(command.body ?? '');

  return (
    <Card>
      <div className={s.name}>/{command.name}</div>
      <Eyebrow style={{ marginBottom: 4 }}>Description</Eyebrow>
      <Input className={s.field} value={description} onChange={(e) => setDescription(e.target.value)} />
      <Eyebrow style={{ marginBottom: 4 }}>Corps (prompt)</Eyebrow>
      <Textarea spellCheck={false} className={s.body} value={body} onChange={(e) => setBody(e.target.value)} />
      <Button variant="primary" className={s.save} onClick={() => onSave({ description, body })}>
        Enregistrer
      </Button>
    </Card>
  );
}
```

```css
/* src/renderer/components/CommandCard.module.css */
.name{font:600 14px var(--display);margin-bottom:8px}
.field{margin-bottom:10px}
.body{min-height:220px;font:400 12px/1.55 var(--mono)}
.save{margin-top:10px}
```

- [ ] **Step 2: Create the story**

```tsx
// src/renderer/components/CommandCard.stories.tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { CommandCard } from './CommandCard';

const meta: Meta<typeof CommandCard> = {
  component: CommandCard,
  title: 'Composants/CommandCard',
  args: { onSave: () => {} },
};
export default meta;

export const Defaut: StoryObj<typeof CommandCard> = {
  args: {
    command: {
      name: 'breves-verify',
      description: 'Phase 1 — vérification, renvoie un JSON structuré.',
      body: '# /breves-verify\n\nTu exécutes la Phase 1 (vérification), en mode non interactif…',
    },
  },
};
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/CommandCard.tsx src/renderer/components/CommandCard.module.css src/renderer/components/CommandCard.stories.tsx
git commit -m "feat(ds): composite CommandCard + story"
```

---

## Task 7 : Page `Commands` + route

**Files:**
- Create: `src/renderer/pages/Commands.tsx`
- Modify: `src/renderer/App.tsx`

**Interfaces:**
- Consumes: `CommandCard` (Task 6), `window.api.getCommands/saveCommand` (Task 4), `Command`/`CommandEdits`.

- [ ] **Step 1: Create the page** (calquée sur `pages/Agents.tsx`)

```tsx
// src/renderer/pages/Commands.tsx
import { useEffect, useState } from 'react';
import { useAppStore } from '@renderer/store/app.store';
import { CommandCard } from '@renderer/components/CommandCard';
import type { Command, CommandEdits } from '@domain/commands';
import { Text } from '@renderer/components/ui/Text';

export function Commands() {
  const showToast = useAppStore((s) => s.showToast);
  const [commands, setCommands] = useState<Command[] | null>(null);

  useEffect(() => {
    let alive = true;
    void window.api.getCommands().then((c) => {
      if (alive) setCommands(c);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function save(name: string, edits: CommandEdits): Promise<void> {
    const r = await window.api.saveCommand(name, edits);
    showToast(r.ok ? `Commande « ${name} » enregistrée` : 'Échec : ' + (r.error ?? 'inconnu'));
  }

  return (
    <section>
      <div className="pad">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {commands === null ? (
            <Text tone="faint" as="div">Chargement…</Text>
          ) : commands.length === 0 ? (
            <Text tone="faint" as="div">Aucune commande dans .claude/commands/.</Text>
          ) : (
            commands.map((c) => <CommandCard key={c.name} command={c} onSave={(edits) => void save(c.name, edits)} />)
          )}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Register the view** — dans `src/renderer/App.tsx` :
- ajouter l'import : `import { Commands } from '@renderer/pages/Commands';`
- ajouter dans le registre `VIEWS` : `commands: Commands,`

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/pages/Commands.tsx src/renderer/App.tsx
git commit -m "feat(ui): page Commandes (édite les slash-commands)"
```

---

## Task 8 : Header `⌘` + renommage repoDir

**Files:**
- Modify: `src/renderer/layouts/Shell.tsx`, `src/renderer/pages/Settings.tsx`

**Interfaces:**
- Consumes: `go('goCommands')` (Task 5).

- [ ] **Step 1: 6e icône header** — dans `src/renderer/layouts/Shell.tsx`, juste **après** le bouton Agents (`⚙`), ajouter :

```tsx
        <Button variant="icon" title="Commandes" onClick={() => go('goCommands')}>
          ⌘
        </Button>
```

(Ordre final : ✦ Soul · ⚙ Agents · ⌘ Commandes · ⛭ Réglages · ◑ Thème · ✕ Quitter.)

- [ ] **Step 2: Renommer repoDir** — dans `src/renderer/pages/Settings.tsx`, dans le tableau `FIELDS`, remplacer le label de l'entrée `repoDir` :

```tsx
  { key: 'repoDir', label: 'Repo Brèves', kind: 'directory' },
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/layouts/Shell.tsx src/renderer/pages/Settings.tsx
git commit -m "feat(ui): icône ⌘ Commandes + label « Repo Brèves »"
```

---

## Task 9 : Catalogue d'icônes (Fondations MDX)

**Files:**
- Create: `src/renderer/components/foundations/Icones.mdx`

**Interfaces:**
- Aucune (page de documentation Storybook).

- [ ] **Step 1: Create the MDX page** (format calqué sur `foundations/Espacements.mdx`)

```mdx
import { Meta } from '@storybook/addon-docs/blocks';

<Meta title="Fondations/Icônes" />

# Icônes

Glyphes Unicode utilisés dans l'app (pas de composant `Icon` : usage inline via `Button variant="icon"`).

<table>
  <thead>
    <tr><th align="left">Glyphe</th><th align="left">Sens</th><th align="left">Où</th></tr>
  </thead>
  <tbody>
    {[
      ['←', 'Retour', 'Header (vues hors dashboard)'],
      ['✦', 'SOUL — le style', 'Header'],
      ['⚙', 'Agents', 'Header'],
      ['⌘', 'Commandes', 'Header'],
      ['⛭', 'Réglages', 'Header'],
      ['◑', 'Thème clair/sombre', 'Header'],
      ['✕', 'Quitter / état invalide', 'Header · StatusDot(error)'],
      ['✓', 'Validé', 'StatusDot(done)'],
      ['→', 'Action / lien', 'CTA · liens · lignes'],
      ['+', 'Nouvelle édition', 'CTA dashboard'],
    ].map(([g, sens, ou]) => (
      <tr key={sens}>
        <td style={{ fontSize: 20, textAlign: 'center' }}>{g}</td>
        <td>{sens}</td>
        <td style={{ color: 'var(--muted)' }}>{ou}</td>
      </tr>
    ))}
  </tbody>
</table>
```

- [ ] **Step 2: Build Storybook (vérifie que la page MDX compile)**

Run: `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22; npm run build-storybook 2>&1 | tail -6`
Expected: « Storybook build completed successfully », sans erreur sur Icones.mdx.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/foundations/Icones.mdx
git commit -m "docs(storybook): page Fondations/Icônes (catalogue des glyphes)"
```

---

## Task 10 : Intégration packagée (build + install)

**Files:** aucun (vérification).

- [ ] **Step 1: Build + réinstall**

```bash
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22
npm run make 2>&1 | grep -iE "Making a dmg|Making distributables|FAILED|error"
bash scripts/install-local.sh
```

Expected: DMG construit, app installée sans quarantaine.

- [ ] **Step 2: Vérification manuelle (humain)**

`open "/Applications/Brèves IA.app"` puis vérifier :
- Header : ✦ Soul · ⚙ Agents · **⌘ Commandes** · ⛭ Réglages · ◑ Thème · ✕.
- ⌘ Commandes : les 3 commands listées ; éditer la description/corps de l'une → Enregistrer → toast ; relancer une édition fonctionne toujours.
- Réglages : le champ s'appelle désormais **« Repo Brèves »**.
- Storybook (`npm run storybook`) : page **Fondations/Icônes** présente, **Composants/CommandCard** présent.

(Pas de commit — vérification seule.)

---

## Self-Review (rempli)

- **Couverture spec** : frontmatter extraction (T1), commands.ts (T2), engine getCommands/saveCommand (T3), IPC (T4), navigation (T5), CommandCard+story (T6), page Commands (T7), header ⌘ + repoDir « Repo Brèves » (T8), Fondations/Icônes (T9), build/install (T10). ✓
- **Placeholders** : aucun ; code complet à chaque step.
- **Cohérence des types** : `Command`/`CommandEdits` définis en T2, consommés identiquement en T3 (engine), T4 (api/handlers), T6/T7 (renderer) ; `saveCommand(deps, name, edits)` signature constante T3↔T4 ; canaux `'get-commands'`/`'save-command'` identiques entre ipc.ts (T4) et tests (T4). `splitFrontmatter` signature inchangée T1 (agents non régressé). ✓
- **Nommage** : `registerCommandsHandlers` (pluriel, édition de fichiers) distinct de `registerCommandHandlers` (singulier, exécution de skills) — noté en T4. ✓
