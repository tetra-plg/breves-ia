# Implémentation — Module : commands

> Module : commands · reverse (constat) · cartographié à `4ce7095`
> Rédigé en posture Lead Dev Module (reverse) : chaque assertion est tracée. Le code fait foi.
> Réfère le socle global : `docs/project/implementation.md` pour les conventions de build et d'IPC.

---

## Fichiers du module (constatés)

| Fichier | Rôle | Lignes clés |
|---|---|---|
| `src/renderer/pages/Commands.tsx` | Vue React — chargement + dispatch save | `1-41` |
| `src/renderer/components/CommandCard.tsx` | Formulaire par commande | `1-33` |
| `src/renderer/components/CommandCard.module.css` | Styles locaux | `1-5` |
| `src/main/ipc/commands.handlers.ts` | Handlers IPC (enregistrement) | `1-10` |
| `src/main/engine.ts` — `loadCommands` | Scan FS + parse | `222-236` |
| `src/main/engine.ts` — `getCommands` | Tri + retour | `238-240` |
| `src/main/engine.ts` — `saveCommand` | Validation + écriture | `242-254` |
| `src/main/engine.ts` — `isSafeName` | Garde anti path-traversal | `194-196` |
| `src/domain/commands.ts` | Types + fonctions pures | `1-21` |
| `src/domain/frontmatter.ts` | Parser YAML partagé | `1-11` |

---

## Contrat IPC `get-commands`

### Déclaration du canal

```typescript
// src/shared/types/ipc.ts:12
IPC.getCommands = 'get-commands'
```

### Payload

- **Entrée :** aucune (invocation sans argument côté renderer).
- **Sortie :** `Command[]` trié par `name` (ordre lexicographique) — vu `engine.ts:239`.

```typescript
// src/domain/commands.ts:3-7
export interface Command {
  name: string;        // nom fichier sans .md
  description: string; // frontmatter "description:"
  body: string;        // corps après frontmatter (trimmed)
}
```

### Handler (fichier:ligne)

```typescript
// src/main/ipc/commands.handlers.ts:4-5
export function registerCommandsHandlers(ipc: IpcLike, deps: EngineDeps): void {
  ipc.handle(IPC.getCommands, () => getCommands(deps));
  // …
}
```

Enregistré par `registerAllHandlers` — vu `src/main/ipc/index.ts:18-24`.

### Côté renderer (preload + composant)

```typescript
// src/preload/index.ts:22
getCommands: () => ipcRenderer.invoke(IPC.getCommands),

// src/renderer/pages/Commands.tsx:11-18
useEffect(() => {
  let alive = true;
  void window.api.getCommands().then((c) => {
    if (alive) setCommands(c);
  });
  return () => { alive = false; };
}, []);
```

Le pattern `alive` évite un setState sur composant démonté.

---

## Contrat IPC `save-command`

### Déclaration du canal

```typescript
// src/shared/types/ipc.ts:13
IPC.saveCommand = 'save-command'
```

### Payload

- **Entrée :** `{ name: string, edits: CommandEdits }` — vu `commands.handlers.ts:6-8`.
- **Sortie :** `SaveResult = { ok: boolean; error?: string }` — vu `src/shared/types/api.ts:9`.

```typescript
// src/domain/commands.ts:9-12
export interface CommandEdits {
  description: string;
  body: string;
}
```

### Handler (fichier:ligne)

```typescript
// src/main/ipc/commands.handlers.ts:6-9
ipc.handle(IPC.saveCommand, (_e, payload: unknown) => {
  const { name, edits } = (payload ?? {}) as { name: string; edits: CommandEdits };
  return saveCommand(deps, name, edits);
});
```

**Note :** le payload est casté `as` sans validation Zod (le canal `save-command` ne passe pas par les schémas `shared/schemas/`) — cohérent avec les autres handlers d'écriture config (ex. : `save-agent`).

### Côté renderer (preload + composant)

```typescript
// src/preload/index.ts:23
saveCommand: (name, edits) => ipcRenderer.invoke(IPC.saveCommand, { name, edits }),

// src/renderer/pages/Commands.tsx:21-24
async function save(name: string, edits: CommandEdits): Promise<void> {
  const r = await window.api.saveCommand(name, edits);
  showToast(r.ok ? `Commande « ${name} » enregistrée` : 'Échec : ' + (r.error ?? 'inconnu'));
}
```

---

## Implémentation `loadCommands` / `getCommands` (engine)

```typescript
// src/main/engine.ts:222-240
export function loadCommands(deps: EngineDeps): Command[] {
  const dir = join(deps.repoDir, '.claude', 'commands');
  let files: string[] = [];
  try {
    files = deps.readdir(dir);
  } catch {
    return [];  // répertoire absent → liste vide (silencieux, GAP-17)
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
```

**Points d'attention :**
- Filtre strict `.endsWith('.md')` : seuls les fichiers Markdown sont chargés — vu `:231`.
- Lecture synchrone (FS bloquant), acceptable pour 3 fichiers légers.
- `deps` injectable → testable sans Electron.

---

## Implémentation `saveCommand` (engine)

```typescript
// src/main/engine.ts:242-254
export function saveCommand(
  deps: EngineDeps,
  name: string,
  edits: CommandEdits
): { ok: boolean; error?: string } {
  if (!isSafeName(name)) return { ok: false, error: 'nom invalide' };
  if (typeof edits?.body !== 'string' || !edits.body.trim()) {
    return { ok: false, error: 'corps vide' };
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

**Garde anti path-traversal (`isSafeName`) :**

```typescript
// src/main/engine.ts:194-196
function isSafeName(name: string): boolean {
  return !!name && !/[\\/]/.test(name) && !name.includes('..');
}
```

Rejette : nom vide, nom contenant `/`, `\`, ou `..`. Corrigé en commit `4ce7095` (même garde que `saveAgent` — partagée, non exportée).

---

## Implémentation `parseCommand` / `serializeCommand` (domain)

```typescript
// src/domain/commands.ts:14-21
export function parseCommand(raw: string): { description: string; body: string } {
  const { fm, body } = splitFrontmatter(raw);
  return { description: fm.description || '', body };
}

export function serializeCommand(edits: { description: string; body: string }): string {
  return `---\ndescription: ${edits.description || ''}\n---\n\n${(edits.body || '').trim()}\n`;
}
```

`splitFrontmatter` — vu `src/domain/frontmatter.ts:1-11` :
- Regex : `/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/`
- Si pas de frontmatter détecté : `{ fm: {}, body: raw.trim() }` (tolérance au format non conforme).
- Parser YAML trivial (clé : valeur, pas de multiline ni de types avancés).

---

## Implémentation `CommandCard.tsx` (renderer)

```typescript
// src/renderer/components/CommandCard.tsx:11-33
export function CommandCard({ command, onSave }: CommandCardProps) {
  const [description, setDescription] = useState(command.description ?? '');
  const [body, setBody] = useState(command.body ?? '');

  return (
    <Card>
      <div className={s.name}>/{command.name}</div>
      <Eyebrow style={{ marginBottom: 4 }}>Description</Eyebrow>
      <Input className={s.field} value={description}
             onChange={(e) => setDescription(e.target.value)} />
      <Eyebrow style={{ marginBottom: 4 }}>Corps (prompt)</Eyebrow>
      <Textarea spellCheck={false} className={s.body} value={body}
                onChange={(e) => setBody(e.target.value)} />
      <Button variant="primary" className={s.save}
              onClick={() => onSave({ description, body })}>
        Enregistrer
      </Button>
    </Card>
  );
}
```

**Primitives UI utilisées :** `Card`, `Eyebrow`, `Input`, `Textarea`, `Button` — toutes issues du design system `components/ui/` (socle).

**Styles locaux (`CommandCard.module.css`) :**
```css
.name  { font: 600 14px var(--display); margin-bottom: 8px }
.field { margin-bottom: 10px }
.body  { min-height: 220px; font: 400 12px/1.55 var(--mono) }
.save  { margin-top: 10px }
```

---

## Implémentation `Commands.tsx` (renderer)

```typescript
// src/renderer/pages/Commands.tsx:1-41
export function Commands() {
  const showToast = useAppStore((s) => s.showToast);
  const [commands, setCommands] = useState<Command[] | null>(null);

  useEffect(() => {
    let alive = true;
    void window.api.getCommands().then((c) => { if (alive) setCommands(c); });
    return () => { alive = false; };
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
            commands.map((c) => (
              <CommandCard key={c.name} command={c} onSave={(edits) => void save(c.name, edits)} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
```

**Note :** `save` est async mais appelé dans le callback `onSave` via `void` : les erreurs non catchées ne remontent pas silencieusement car `window.api.saveCommand` retourne toujours un `SaveResult` (jamais de throw côté renderer).

---

## Contraintes constatées

| Contrainte | Trace | Impact |
|---|---|---|
| `isSafeName` non exportée | `engine.ts:194` | Testable uniquement via `saveCommand` ou `saveAgent` (pas de test direct) |
| État local `CommandCard` initialisé une fois | `CommandCard.tsx:12-13` | Pas de sync avec un rechargement parent (GAP-CMD-01) |
| Aucune validation UI corps vide | `CommandCard.tsx:30` | La garde est uniquement backend — UX : bouton cliquable même corps vide (GAP-CMD-02) |
| Lecture FS synchrone | `engine.ts:225` | Bloquant, acceptable pour 3 fichiers |
| `repoDir` invalide → liste vide silencieuse | `engine.ts:225-228` | GAP-17 — pas d'état d'erreur remonté au renderer |

---

## GAPS À REMONTER (module commands — implémentation)

| # | Observation | Source |
|---|---|---|
| GAP-16 | `Commands.tsx` et `CommandCard.tsx` non testés directement | `REVERSE_GAPS.md`, `vitest.config.mjs` |
| GAP-CMD-01 | `useState(command.description)` et `useState(command.body)` initialisés une seule fois : après un `saveCommand` réussi, si le parent recharge `commands`, les `CommandCard` existantes gardent leur état local (pas de `key` forcée à une valeur changeante) | `CommandCard.tsx:12-13`, `Commands.tsx:35` |
| GAP-CMD-02 | `Enregistrer` est cliquable même si le corps est vide : la validation est côté backend uniquement, sans feedback immédiat avant l'IPC | `CommandCard.tsx:30`, `engine.ts:244` |
| GAP-CMD-03 | `command.handlers.ts` / `commands.handlers.ts` — nommage quasi-identique dans le même dossier `ipc/` ; risque d'import erroné silencieux | `src/main/ipc/` |
