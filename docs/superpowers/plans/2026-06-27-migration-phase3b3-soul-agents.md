# Migration Phase 3b-3 — SOUL + échantillons + agents : Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Porter en React les vues **soul** (§1-4 éditables + enregistrement, §5 échantillons liste/ajout/retrait/enregistrement, §6 journal en lecture), le sélecteur d'échantillons en 2 écrans **ech-editions** → **ech-breves** (via `domain/edition.extractBreves`), et **agents** (cartes éditables : modèle/mode/outils/prompt/activé + enregistrement), 1:1 avec le renderer vanilla.

**Architecture:** Les pages câblent store + `window.api` ; les composants sont présentationnels (props in). L'état de la SOUL (§1-4, §5 échantillons, §6 journal, version) vit dans le **store** pour survivre à la navigation vers le sous-flux d'échantillons et revenir sans perdre les éditions en cours (port du `echKeepLocal` legacy : on ne recharge pas depuis le disque au retour du sous-flux). Les agents sont chargés en état local de page (rechargés à chaque montage, comme le legacy). Le rendu markdown inline réutilise `domain/format.inlineMd`.

**Tech Stack:** React 19, Zustand, TypeScript strict, Vitest, Storybook 10. Node 22 (`.nvmrc`). Alias `@renderer`/`@domain`/`@shared`/`@main`.

## Global Constraints

- **Lancer sous Node 22** (`nvm use` ; `.nvmrc`=22) **avant toute commande npm**. `npm run typecheck` (0) / `npm run lint` (0) / `npm test` (verts) à chaque tâche.
- Comportement et look **identiques** au vanilla ([hud/renderer.mjs](../../../hud/renderer.mjs) sections AGENTS ~307-349, SOUL/ÉCHANTILLONS ~351-432 ; [hud/companion.html](../../../hud/companion.html) soul ~295-318, ech ~321-335). Réutiliser les **classes CSS existantes** (`.card`, `.eyebrow`, `.btn-primary`, `.btn-ghost`, `.row`, `.faint`, `.pill`) et les styles inline du legacy. **Pas de redesign.**
- `window.api` = **seule** frontière ; **aucun `import 'electron'`** dans `src/renderer`.
- Réutiliser `domain/` (`@domain/soul`, `@domain/agents`, `@domain/edition`, `@domain/format`) ; **aucune logique métier nouvelle** dans les composants/pages.
- TS strict : pas de `any`, pas de `ts-ignore`, pas de variable inutilisée. (`// eslint-disable-next-line` ponctuel toléré, à l'image de `src/shared/schemas/inputs.ts` et des pages Editor/Archived.)
- **Pas de fuite** : abonnements / requêtes async nettoyés (drapeau `alive` ou cleanup `useEffect`). En test, le SDK / `window.api` n'est jamais appelé.
- `lib/*.mjs`/`hud/*` **inchangés**. Ne **jamais** stager `.claude/breves-ia/SOUL.md`.
- **`git push origin refonte-ts-react-electron` APRÈS CHAQUE COMMIT** (demande utilisateur).
- Spec : [docs/superpowers/specs/2026-06-26-migration-phase3b-vues-flux-design.md](../specs/2026-06-26-migration-phase3b-vues-flux-design.md) (sous-plan 3b-3).

## File Structure

- `src/renderer/store/app.store.ts` — **modifié** : type `SoulForm` + état soul/ech (`soulForm`, `soulVersion`, `soulJournal`, `echEdition`, `echKeepLocal`) + actions (`loadSoul`, `setSoulField`, `setEchEdition`, `setEchKeepLocal`, `addEchantillon`, `removeEchantillon`).
- `src/renderer/components/AgentCard.tsx` / `EchantillonCard.tsx` / `BreveCard.tsx` — **créés** (+ stories).
- `src/renderer/pages/Soul.tsx` / `EchEditions.tsx` / `EchBreves.tsx` / `Agents.tsx` — **créés**.
- `src/renderer/layouts/Shell.tsx` — **modifié** : bouton retour pour `ech-breves`→`ech-editions` et `ech-editions`→`soul` (echKeepLocal).
- `src/renderer/App.tsx` — **modifié** : registry `soul`, `agents`, `ech-editions`, `ech-breves`.

---

### Task 1 : Store — état & actions SOUL / échantillons

**Files:**
- Modify: `src/renderer/store/app.store.ts`
- Test: `tests/renderer/app.store.soul.test.mjs`

**Interfaces:**
- Consumes : types `Echantillon`, `JournalEntry`, `Soul` (`@domain/soul`) ; `EditionSummary` (`@main/engine`).
- Produces : export `interface SoulForm { quiParle: string; audience: string; voix: string; lignesRouges: string }` ; état `soulForm: SoulForm`, `soulVersion: string`, `soulJournal: JournalEntry[]`, `echEdition: EditionSummary | null`, `echKeepLocal: boolean` ; actions `loadSoul(s: Soul)`, `setSoulField(field: keyof SoulForm, value: string)`, `setEchEdition(ed: EditionSummary | null)`, `setEchKeepLocal(v: boolean)`, `addEchantillon(e: Echantillon)` (max 3), `removeEchantillon(index: number)`. (`echantillons`/`setEchantillons` existent déjà.)

- [ ] **Step 1 : Écrire le test** `tests/renderer/app.store.soul.test.mjs`

```js
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { useAppStore } from '@renderer/store/app.store';

const get = () => useAppStore.getState();

test('loadSoul peuple form/version/journal/échantillons', () => {
  get().loadSoul({
    version: 'v3', quiParle: 'Q', audience: 'A', voix: 'V', lignesRouges: 'L',
    echantillons: [{ date: '2026-01-01', source: 'z.ai', texte: 'T' }],
    journal: [{ date: '2026-01-01', texte: 'leçon' }],
  });
  assert.equal(get().soulForm.quiParle, 'Q');
  assert.equal(get().soulForm.lignesRouges, 'L');
  assert.equal(get().soulVersion, 'v3');
  assert.equal(get().soulJournal.length, 1);
  assert.equal(get().echantillons.length, 1);
});
test('setSoulField met à jour un champ', () => {
  get().setSoulField('audience', 'Nouvelle audience');
  assert.equal(get().soulForm.audience, 'Nouvelle audience');
});
test('addEchantillon respecte le max 3', () => {
  get().setEchantillons([]);
  get().addEchantillon({ date: 'd', source: 's', texte: 't1' });
  get().addEchantillon({ date: 'd', source: 's', texte: 't2' });
  get().addEchantillon({ date: 'd', source: 's', texte: 't3' });
  get().addEchantillon({ date: 'd', source: 's', texte: 't4' });
  assert.equal(get().echantillons.length, 3);
  assert.equal(get().echantillons[2].texte, 't3');
});
test('removeEchantillon retire par index', () => {
  get().setEchantillons([
    { date: 'd', source: 's', texte: 'a' },
    { date: 'd', source: 's', texte: 'b' },
  ]);
  get().removeEchantillon(0);
  assert.equal(get().echantillons.length, 1);
  assert.equal(get().echantillons[0].texte, 'b');
});
test('setEchEdition / setEchKeepLocal', () => {
  get().setEchKeepLocal(true);
  assert.equal(get().echKeepLocal, true);
  get().setEchEdition({ file: 'f', date: '2026-01-01', range: '2026-01-01', count: 2, corr: 0, title: 'T' });
  assert.equal(get().echEdition?.file, 'f');
});
```

- [ ] **Step 2 : Lancer (échec attendu)**

Run : `npx vitest run tests/renderer/app.store.soul.test.mjs` → FAIL (`loadSoul`/actions absents).

- [ ] **Step 3 : Étendre `src/renderer/store/app.store.ts`**

Dans les imports en tête, **remplacer** `import type { Echantillon } from '@domain/soul';` par :
```ts
import type { Echantillon, JournalEntry, Soul } from '@domain/soul';
import type { Dashboard, EditionSummary } from '@main/engine';
```
(et **supprimer** l'ancien `import type { Dashboard } from '@main/engine';` pour éviter le doublon — fusionné ci-dessus.)

Après le type `RunStatus`/`fmtClock` (vers la ligne 26), **ajouter** :
```ts
export interface SoulForm {
  quiParle: string;
  audience: string;
  voix: string;
  lignesRouges: string;
}

const SOUL_FORM_EMPTY: SoulForm = { quiParle: '', audience: '', voix: '', lignesRouges: '' };
```

Dans l'interface `AppState`, après `echantillons: Echantillon[];` (ligne 39) **ajouter** :
```ts
  soulForm: SoulForm;
  soulVersion: string;
  soulJournal: JournalEntry[];
  echEdition: EditionSummary | null;
  echKeepLocal: boolean;
```
et dans la liste des actions (après `setEchantillons: (e: Echantillon[]) => void;`, ligne 67) **ajouter** :
```ts
  loadSoul: (s: Soul) => void;
  setSoulField: (field: keyof SoulForm, value: string) => void;
  setEchEdition: (ed: EditionSummary | null) => void;
  setEchKeepLocal: (v: boolean) => void;
  addEchantillon: (e: Echantillon) => void;
  removeEchantillon: (index: number) => void;
```

Dans le `create(...)`, après `echantillons: [],` (état initial, ligne 82) **ajouter** :
```ts
  soulForm: SOUL_FORM_EMPTY,
  soulVersion: '',
  soulJournal: [],
  echEdition: null,
  echKeepLocal: false,
```
et après `setEchantillons: (echantillons) => set({ echantillons }),` (ligne 112) **ajouter** :
```ts
  loadSoul: (s) =>
    set({
      soulForm: { quiParle: s.quiParle, audience: s.audience, voix: s.voix, lignesRouges: s.lignesRouges },
      soulVersion: s.version,
      soulJournal: s.journal,
      echantillons: s.echantillons.map((e) => ({ date: e.date, source: e.source || '', texte: e.texte })),
    }),
  setSoulField: (field, value) => set((st) => ({ soulForm: { ...st.soulForm, [field]: value } })),
  setEchEdition: (echEdition) => set({ echEdition }),
  setEchKeepLocal: (echKeepLocal) => set({ echKeepLocal }),
  addEchantillon: (e) => set((st) => (st.echantillons.length >= 3 ? {} : { echantillons: [...st.echantillons, e] })),
  removeEchantillon: (index) => set((st) => ({ echantillons: st.echantillons.filter((_, i) => i !== index) })),
```

- [ ] **Step 4 : Lancer (succès) + qualité**

Run : `npx vitest run tests/renderer/app.store.soul.test.mjs` → PASS.
Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` (tous verts).

- [ ] **Step 5 : Commit + push**

```bash
git add -A && git commit -m "feat(phase3b3): store — état & actions SOUL/échantillons (loadSoul, add/removeEchantillon, echEdition/echKeepLocal) + test"
git push origin refonte-ts-react-electron
```

---

### Task 2 : Composants `AgentCard`, `EchantillonCard`, `BreveCard` (+ stories)

**Files:**
- Create: `src/renderer/components/AgentCard.tsx` (+ `.stories.tsx`)
- Create: `src/renderer/components/EchantillonCard.tsx` (+ `.stories.tsx`)
- Create: `src/renderer/components/BreveCard.tsx` (+ `.stories.tsx`)

**Interfaces:**
- Consumes : `inlineMd`,`dateLong` (`@domain/format`) ; types `Agent` (`@domain/agents`), `AgentEdits` (`@main/engine`), `Echantillon` (`@domain/soul`).
- Produces :
  - `AgentCard({ agent: Agent; onSave: (edits: AgentEdits) => void })` (état local d'édition ; `onSave` construit `AgentEdits`).
  - `EchantillonCard({ echantillon: Echantillon; onRemove: () => void })`.
  - `BreveCard({ texte: string; disabled: boolean; onAdd: () => void })`.

- [ ] **Step 1 : Écrire `AgentCard.tsx`** (port de `agentCard`)

```tsx
import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { Agent } from '@domain/agents';
import type { AgentEdits } from '@main/engine';

const MODELES: [string, string][] = [['', 'Hériter'], ['opus', 'Opus'], ['sonnet', 'Sonnet'], ['haiku', 'Haiku']];
const MODES = ['off', 'ciblé', 'toujours'];

const selStyle: CSSProperties = {
  width: '100%',
  padding: 8,
  border: '1px solid var(--line)',
  borderRadius: 'var(--radiusSm)',
  background: 'var(--panel)',
  color: 'var(--text)',
  marginBottom: 10,
};

interface AgentCardProps {
  agent: Agent;
  onSave: (edits: AgentEdits) => void;
}

export function AgentCard({ agent, onSave }: AgentCardProps) {
  const [model, setModel] = useState(agent.model);
  const [mode, setMode] = useState(agent.mode);
  const [tools, setTools] = useState((agent.tools ?? []).join(', '));
  const [systemPrompt, setSystemPrompt] = useState(agent.systemPrompt ?? '');
  const [enabled, setEnabled] = useState(agent.enabled);
  const isScept = !!agent.mode || agent.name === 'sceptique';

  function save(): void {
    const edits: AgentEdits = {
      model,
      tools: tools.split(',').map((t) => t.trim()).filter(Boolean),
      systemPrompt,
      enabled,
    };
    if (isScept) edits.mode = mode;
    onSave(edits);
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ font: '600 14px var(--display)' }}>{agent.name}</span>
        <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, font: '500 11px var(--body)', color: 'var(--muted)' }}>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> activé
        </label>
      </div>
      <div style={{ font: '400 11.5px var(--body)', color: 'var(--muted)', marginBottom: 10 }}>{agent.description}</div>
      <label className="eyebrow" style={{ display: 'block', marginBottom: 4 }}>Modèle</label>
      <select value={model} onChange={(e) => setModel(e.target.value)} style={selStyle}>
        {MODELES.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
      {isScept && (
        <>
          <label className="eyebrow" style={{ display: 'block', marginBottom: 4 }}>Mode sceptique</label>
          <select value={mode} onChange={(e) => setMode(e.target.value)} style={selStyle}>
            {MODES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </>
      )}
      <label className="eyebrow" style={{ display: 'block', marginBottom: 4 }}>Outils (séparés par des virgules)</label>
      <input
        value={tools}
        onChange={(e) => setTools(e.target.value)}
        style={{ width: '100%', padding: 8, border: '1px solid var(--line)', borderRadius: 'var(--radiusSm)', background: 'var(--panel)', color: 'var(--text)', font: '400 12px var(--mono)', marginBottom: 10 }}
      />
      <label className="eyebrow" style={{ display: 'block', marginBottom: 4 }}>Prompt système</label>
      <textarea spellCheck={false} value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} style={{ minHeight: 160, font: '400 12px/1.55 var(--mono)' }} />
      <button className="btn-primary" style={{ marginTop: 10 }} onClick={save}>
        Enregistrer
      </button>
    </div>
  );
}
```

- [ ] **Step 2 : Écrire `EchantillonCard.tsx`** (port d'une carte §5)

```tsx
import { inlineMd, dateLong } from '@domain/format';
import type { Echantillon } from '@domain/soul';

interface EchantillonCardProps {
  echantillon: Echantillon;
  onRemove: () => void;
}

export function EchantillonCard({ echantillon, onRemove }: EchantillonCardProps) {
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <span style={{ font: '500 10.5px var(--mono)', color: 'var(--accent)' }}>
          {dateLong(echantillon.date)}
          {echantillon.source ? ' · ' + echantillon.source : ''}
        </span>
        <button className="btn-ghost" style={{ marginLeft: 'auto', padding: '5px 10px', fontSize: 11 }} onClick={onRemove}>
          Retirer
        </button>
      </div>
      <div style={{ font: '400 12.5px/1.5 var(--body)' }} dangerouslySetInnerHTML={{ __html: inlineMd(echantillon.texte) }} />
    </div>
  );
}
```

- [ ] **Step 3 : Écrire `BreveCard.tsx`** (port d'une carte de brève sélectionnable)

```tsx
import { inlineMd } from '@domain/format';

interface BreveCardProps {
  texte: string;
  disabled: boolean;
  onAdd: () => void;
}

export function BreveCard({ texte, disabled, onAdd }: BreveCardProps) {
  return (
    <div className="card">
      <div style={{ font: '400 12px/1.55 var(--body)', marginBottom: 9 }} dangerouslySetInnerHTML={{ __html: inlineMd(texte) }} />
      <button className="btn-primary" style={{ padding: '8px 13px', fontSize: 12 }} disabled={disabled} onClick={onAdd}>
        {disabled ? '3 échantillons max atteint' : 'Ajouter cet échantillon'}
      </button>
    </div>
  );
}
```

- [ ] **Step 4 : Écrire les stories**

`src/renderer/components/AgentCard.stories.tsx` :
```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { AgentCard } from './AgentCard';

const meta: Meta<typeof AgentCard> = { component: AgentCard, title: 'AgentCard' };
export default meta;

const base = {
  name: 'enqueteur',
  description: 'Vérifie un sujet et renvoie faits + source.',
  tools: ['WebSearch', 'WebFetch'],
  model: '',
  enabled: true,
  mode: '',
  systemPrompt: 'Tu es un enquêteur rigoureux…',
};

export const Standard: StoryObj<typeof AgentCard> = { args: { agent: base, onSave: () => {} } };
export const Sceptique: StoryObj<typeof AgentCard> = {
  args: { agent: { ...base, name: 'sceptique', mode: 'ciblé', description: 'Tente de réfuter l\'affirmation centrale.' }, onSave: () => {} },
};
```

`src/renderer/components/EchantillonCard.stories.tsx` :
```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { EchantillonCard } from './EchantillonCard';

const meta: Meta<typeof EchantillonCard> = { component: EchantillonCard, title: 'EchantillonCard' };
export default meta;

export const Exemple: StoryObj<typeof EchantillonCard> = {
  args: {
    echantillon: { date: '2026-06-13', source: 'z.ai', texte: '**GLM-5.2** débarque en open weights — 753 milliards de paramètres.' },
    onRemove: () => {},
  },
};
```

`src/renderer/components/BreveCard.stories.tsx` :
```tsx
import type { Meta, StoryObj } from '@storybook/react-vite';
import { BreveCard } from './BreveCard';

const meta: Meta<typeof BreveCard> = { component: BreveCard, title: 'BreveCard' };
export default meta;

export const Ajoutable: StoryObj<typeof BreveCard> = {
  args: { texte: '**Midjourney** lance un scanner corporel pour la cohérence des personnages.', disabled: false, onAdd: () => {} },
};
export const Pleine: StoryObj<typeof BreveCard> = {
  args: { texte: '**Midjourney** lance un scanner corporel.', disabled: true, onAdd: () => {} },
};
```

- [ ] **Step 5 : Vérifier**

Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` (tous verts). Run : `npm run build-storybook` → OK (nouvelles stories compilent).

- [ ] **Step 6 : Commit + push**

```bash
git add -A && git commit -m "feat(phase3b3): composants AgentCard/EchantillonCard/BreveCard + stories"
git push origin refonte-ts-react-electron
```

---

### Task 3 : Page `Soul` (§1-4 édition+save, §5 échantillons, §6 journal) + registry

**Files:**
- Create: `src/renderer/pages/Soul.tsx`
- Modify: `src/renderer/App.tsx` (import + registry `soul`)

**Interfaces:**
- Consumes : `useAppStore` (`soulForm`,`soulVersion`,`soulJournal`,`echantillons`,`setSoulField`,`removeEchantillon`,`setView`,`showToast`,`setDashboard`, + `loadSoul`/`setEchKeepLocal`/`getState`) ; type `SoulForm` (`@renderer/store/app.store`) ; `EchantillonCard` ; `window.api` (`getSoulStructured`,`saveSoulSections`,`saveSoulEchantillons`,`getDashboard`).
- Produces : page `Soul`. Charge la SOUL au montage **sauf** retour du sous-flux (`echKeepLocal`). Boutons « Enregistrer » (§1-4, tous requis), « + Ajouter depuis une édition » (→`ech-editions`, désactivé si 3 échantillons), « Enregistrer §5 ».

- [ ] **Step 1 : Écrire `src/renderer/pages/Soul.tsx`** (port de `renderSoul`/`renderEchantillons`/`saveSoulFromUI`/`saveEchantillons`)

```tsx
import { useEffect } from 'react';
import { useAppStore } from '@renderer/store/app.store';
import type { SoulForm } from '@renderer/store/app.store';
import { EchantillonCard } from '@renderer/components/EchantillonCard';

const SOUL_FIELDS: { key: keyof SoulForm; label: string; mono: boolean; minHeight: number }[] = [
  { key: 'quiParle', label: '1 · Qui parle', mono: false, minHeight: 70 },
  { key: 'audience', label: '2 · Audience', mono: false, minHeight: 70 },
  { key: 'voix', label: '3 · Voix & tics', mono: true, minHeight: 110 },
  { key: 'lignesRouges', label: '4 · Lignes rouges', mono: true, minHeight: 90 },
];

export function Soul() {
  const soulForm = useAppStore((s) => s.soulForm);
  const soulVersion = useAppStore((s) => s.soulVersion);
  const soulJournal = useAppStore((s) => s.soulJournal);
  const echantillons = useAppStore((s) => s.echantillons);
  const setSoulField = useAppStore((s) => s.setSoulField);
  const removeEchantillon = useAppStore((s) => s.removeEchantillon);
  const setView = useAppStore((s) => s.setView);
  const showToast = useAppStore((s) => s.showToast);
  const setDashboard = useAppStore((s) => s.setDashboard);

  // Chargement de la SOUL au montage — sauf retour du sous-flux échantillons (port de echKeepLocal).
  useEffect(() => {
    const st = useAppStore.getState();
    if (st.echKeepLocal) {
      st.setEchKeepLocal(false);
      return;
    }
    void window.api.getSoulStructured().then((s) => {
      if (s) useAppStore.getState().loadSoul(s);
      else useAppStore.getState().showToast('SOUL introuvable.');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveSections(): Promise<void> {
    const f = useAppStore.getState().soulForm;
    const edits = {
      quiParle: f.quiParle.trim(),
      audience: f.audience.trim(),
      voix: f.voix.trim(),
      lignesRouges: f.lignesRouges.trim(),
    };
    if (!edits.quiParle || !edits.audience || !edits.voix || !edits.lignesRouges) {
      showToast('Les 4 sections doivent être remplies.');
      return;
    }
    const r = await window.api.saveSoulSections(edits);
    if (!r.ok) {
      showToast("Échec de l'enregistrement : " + (r.error ?? 'inconnu'));
      return;
    }
    showToast('SOUL enregistrée');
    const d = await window.api.getDashboard();
    setDashboard(d);
  }

  async function saveEchantillons(): Promise<void> {
    const r = await window.api.saveSoulEchantillons(useAppStore.getState().echantillons);
    showToast(r.ok ? 'Échantillons §5 enregistrés' : 'Échec : ' + (r.error ?? 'inconnu'));
  }

  return (
    <section>
      <div className="pad">
        <p className="muted" style={{ font: '400 12.5px/1.5 var(--body)', margin: '0 0 6px' }}>
          La voix de Pierre. Édite les 4 premières sections, puis enregistre.{' '}
          <span style={{ color: 'var(--accent)' }}>{soulVersion}</span>
        </p>
        {SOUL_FIELDS.map((field) => (
          <div key={field.key}>
            <label className="eyebrow" style={{ display: 'block', margin: '14px 0 5px' }}>
              {field.label}
            </label>
            <textarea
              spellCheck={false}
              value={soulForm[field.key]}
              onChange={(e) => setSoulField(field.key, e.target.value)}
              style={{ minHeight: field.minHeight, font: `400 12.5px/1.55 var(--${field.mono ? 'mono' : 'body'})` }}
            />
          </div>
        ))}
        <button className="btn-primary" style={{ marginTop: 12 }} onClick={() => void saveSections()}>
          Enregistrer
        </button>

        <div className="eyebrow" style={{ margin: '22px 0 9px' }}>
          5 · Échantillons vivants{' '}
          <span className="faint" style={{ font: '400 10px var(--mono)' }}>
            ({echantillons.length}/3, choisis à la main)
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {echantillons.length === 0 ? (
            <div className="faint">Aucun échantillon. Ajoute jusqu’à 3 brèves depuis tes éditions.</div>
          ) : (
            echantillons.map((e, i) => <EchantillonCard key={i} echantillon={e} onRemove={() => removeEchantillon(i)} />)
          )}
        </div>
        <div className="row" style={{ marginTop: 9 }}>
          <button className="btn-ghost" style={{ flex: 1 }} disabled={echantillons.length >= 3} onClick={() => setView('ech-editions')}>
            + Ajouter depuis une édition
          </button>
          <button className="btn-primary" style={{ flex: 1 }} onClick={() => void saveEchantillons()}>
            Enregistrer §5
          </button>
        </div>

        <div className="eyebrow" style={{ margin: '22px 0 9px' }}>
          6 · Journal d'évolution
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {soulJournal.length === 0 ? (
            <div className="faint">Aucune leçon enregistrée.</div>
          ) : (
            soulJournal.map((l, i) => (
              <div key={i} className="card">
                <div style={{ font: '500 10.5px var(--mono)', color: 'var(--accent)', marginBottom: 5 }}>{l.date}</div>
                <div style={{ font: '400 12.5px/1.5 var(--body)' }}>{l.texte}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2 : Enregistrer `soul` dans `App.tsx`**

Ajouter l'import et l'entrée registry :
```tsx
import { Soul } from '@renderer/pages/Soul';
// …dans VIEWS :
  soul: Soul,
```

- [ ] **Step 3 : Vérifier**

Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` (tous verts).

- [ ] **Step 4 : Commit + push**

```bash
git add -A && git commit -m "feat(phase3b3): page Soul (§1-4 édition+save, §5 échantillons, §6 journal) + registry"
git push origin refonte-ts-react-electron
```

---

### Task 4 : Pages `EchEditions` + `EchBreves` (sélecteur 2 écrans) + retour Shell + registry

**Files:**
- Create: `src/renderer/pages/EchEditions.tsx`, `src/renderer/pages/EchBreves.tsx`
- Modify: `src/renderer/layouts/Shell.tsx` (bouton retour ech)
- Modify: `src/renderer/App.tsx` (registry `ech-editions`, `ech-breves`)

**Interfaces:**
- Consumes : `useAppStore` (`dashboard`,`echEdition`,`echantillons`,`setEchEdition`,`setView`, + `addEchantillon`/`setEchKeepLocal`/`showToast`/`getState`) ; `dateLong` (`@domain/format`) ; `extractBreves` + type `Breve` (`@domain/edition`) ; `BreveCard` ; type `EditionSummary` (`@main/engine`) ; `window.api.readEdition`.
- Produces : pages `EchEditions` (liste des éditions du dashboard → choisit `echEdition`, va à `ech-breves`) et `EchBreves` (charge l'édition, `extractBreves`, ajoute une brève en échantillon max 3 → revient à `soul` avec `echKeepLocal`). Shell : retour `ech-breves`→`ech-editions`, `ech-editions`→`soul` (echKeepLocal).

- [ ] **Step 1 : Écrire `src/renderer/pages/EchEditions.tsx`** (port de `renderEchEditions`)

```tsx
import { useAppStore } from '@renderer/store/app.store';
import { dateLong } from '@domain/format';
import type { EditionSummary } from '@main/engine';

export function EchEditions() {
  const editions = useAppStore((s) => s.dashboard?.editions ?? []);
  const setEchEdition = useAppStore((s) => s.setEchEdition);
  const setView = useAppStore((s) => s.setView);

  function pick(ed: EditionSummary): void {
    setEchEdition(ed);
    setView('ech-breves');
  }

  return (
    <section>
      <div className="pad">
        <p className="muted" style={{ font: '400 12.5px/1.5 var(--body)', margin: '0 0 14px' }}>
          Choisis l'édition d'où provient la brève à promouvoir en échantillon de style (§5).
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {editions.length === 0 ? (
            <div className="faint">Aucune édition archivée.</div>
          ) : (
            editions.map((ed) => (
              <button key={ed.file} className="card" style={{ display: 'block', width: '100%', textAlign: 'left' }} onClick={() => pick(ed)}>
                <div style={{ font: '600 13px var(--display)' }}>{dateLong(ed.date)}</div>
                {ed.title && (
                  <div style={{ font: '400 11.5px var(--body)', color: 'var(--muted)', marginTop: 2 }}>{ed.title}</div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2 : Écrire `src/renderer/pages/EchBreves.tsx`** (port de `renderEchBreves`)

```tsx
import { useEffect, useState } from 'react';
import { useAppStore } from '@renderer/store/app.store';
import { dateLong } from '@domain/format';
import { extractBreves } from '@domain/edition';
import type { Breve } from '@domain/edition';
import { BreveCard } from '@renderer/components/BreveCard';

export function EchBreves() {
  const echEdition = useAppStore((s) => s.echEdition);
  const echantillons = useAppStore((s) => s.echantillons);
  const setView = useAppStore((s) => s.setView);

  const [breves, setBreves] = useState<Breve[] | null>(null);

  useEffect(() => {
    if (!echEdition) {
      setView('ech-editions');
      return;
    }
    let alive = true;
    const file = echEdition.file;
    void (async () => {
      const text = file ? await window.api.readEdition(file) : '';
      if (alive) setBreves(extractBreves(text ?? ''));
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [echEdition]);

  if (!echEdition) return <div className="pad" />;

  const full = echantillons.length >= 3;

  function add(b: Breve): void {
    const st = useAppStore.getState();
    if (st.echantillons.length >= 3) {
      st.showToast('3 échantillons maximum.');
      return;
    }
    st.addEchantillon({ date: echEdition.date, source: b.source, texte: b.texte });
    st.setEchKeepLocal(true);
    st.setView('soul');
    st.showToast('Échantillon ajouté — pense à « Enregistrer §5 ».');
  }

  return (
    <section>
      <div className="pad">
        <div className="faint" style={{ font: '500 11px var(--mono)', margin: '0 0 12px' }}>
          {dateLong(echEdition.date)}
          {echEdition.title ? ' · ' + echEdition.title : ''}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {breves === null ? (
            <div className="faint">Chargement…</div>
          ) : breves.length === 0 ? (
            <div className="faint">Aucune brève détectée dans cette édition.</div>
          ) : (
            breves.map((b, i) => <BreveCard key={i} texte={b.texte} disabled={full} onAdd={() => add(b)} />)
          )}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3 : Étendre le bouton retour du `Shell`**

Dans `src/renderer/layouts/Shell.tsx`, ajouter le sélecteur (après `const returnTo = …`) :
```tsx
  const setEchKeepLocal = useAppStore((s) => s.setEchKeepLocal);
```
et **remplacer** la fonction `back` par :
```tsx
  // Retour : detail/reader → vue d'origine ; sous-flux échantillons → écran précédent ; sinon dashboard.
  const back = (): void => {
    if (view === 'detail' || view === 'reader') {
      setView(returnTo ?? 'dashboard');
    } else if (view === 'ech-breves') {
      setView('ech-editions');
    } else if (view === 'ech-editions') {
      setEchKeepLocal(true);
      setView('soul');
    } else {
      setView('dashboard');
    }
  };
```

- [ ] **Step 4 : Enregistrer `ech-editions`/`ech-breves` dans `App.tsx`**

Ajouter les imports et les entrées registry :
```tsx
import { EchEditions } from '@renderer/pages/EchEditions';
import { EchBreves } from '@renderer/pages/EchBreves';
// …dans VIEWS :
  'ech-editions': EchEditions,
  'ech-breves': EchBreves,
```

- [ ] **Step 5 : Vérifier**

Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` (tous verts).

- [ ] **Step 6 : Commit + push**

```bash
git add -A && git commit -m "feat(phase3b3): pages EchEditions/EchBreves (sélecteur §5) + retour Shell + registry"
git push origin refonte-ts-react-electron
```

---

### Task 5 : Page `Agents` + registry + sanity build

**Files:**
- Create: `src/renderer/pages/Agents.tsx`
- Modify: `src/renderer/App.tsx` (import + registry `agents`)

**Interfaces:**
- Consumes : `useAppStore` (`showToast`) ; `AgentCard` ; types `Agent` (`@domain/agents`), `AgentEdits` (`@main/engine`) ; `window.api` (`getAgents`,`saveAgent`).
- Produces : page `Agents` (charge les agents au montage, une `AgentCard` par agent, enregistrement via `window.api.saveAgent` + toast).

- [ ] **Step 1 : Écrire `src/renderer/pages/Agents.tsx`** (port de `renderAgents`)

```tsx
import { useEffect, useState } from 'react';
import { useAppStore } from '@renderer/store/app.store';
import { AgentCard } from '@renderer/components/AgentCard';
import type { Agent } from '@domain/agents';
import type { AgentEdits } from '@main/engine';

export function Agents() {
  const showToast = useAppStore((s) => s.showToast);
  const [agents, setAgents] = useState<Agent[] | null>(null);

  useEffect(() => {
    let alive = true;
    void window.api.getAgents().then((a) => {
      if (alive) setAgents(a);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function save(name: string, edits: AgentEdits): Promise<void> {
    const r = await window.api.saveAgent(name, edits);
    showToast(r.ok ? `Agent « ${name} » enregistré` : 'Échec : ' + (r.error ?? 'inconnu'));
  }

  return (
    <section>
      <div className="pad">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {agents === null ? (
            <div className="faint">Chargement…</div>
          ) : agents.length === 0 ? (
            <div className="faint">Aucun agent dans .claude/agents/.</div>
          ) : (
            agents.map((a) => <AgentCard key={a.name} agent={a} onSave={(edits) => void save(a.name, edits)} />)
          )}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2 : Enregistrer `agents` dans `App.tsx`**

Ajouter l'import et l'entrée registry :
```tsx
import { Agents } from '@renderer/pages/Agents';
// …dans VIEWS :
  agents: Agents,
```

- [ ] **Step 3 : Vérifier qualité + Storybook + sanity build**

Run : `npm run typecheck` (0) + `npm run lint` (0) + `npm test` (tous verts).
Run : `npm run build-storybook` → OK.
Run (sanity build, Node 22) :
```bash
rm -rf .vite && ( npm start > /tmp/3b3.log 2>&1 & ) ; sleep 30 ; grep -iE "Cannot find|Failed to resolve|error|Uncaught" /tmp/3b3.log | head ; ls .vite/build ; pkill -f electron-forge; pkill -f '\.vite/build'
```
→ build sans erreur (`.vite/build/main.cjs` présent ; pas d'erreur de résolution).

- [ ] **Step 4 : Commit + push**

```bash
git add -A && git commit -m "feat(phase3b3): page Agents (cartes éditables + enregistrement) + registry"
git push origin refonte-ts-react-electron
```

---

## Critères de réussite Phase 3b-3 (revue finale)

- [ ] **soul** : §1-4 chargées (`getSoulStructured`) et éditables (state store, survit au sous-flux échantillons via `echKeepLocal`), « Enregistrer » exige les 4 sections (`saveSoulSections` + refresh dashboard) ; §5 liste/retrait/ajout (max 3) + « Enregistrer §5 » (`saveSoulEchantillons`) ; §6 journal en lecture.
- [ ] **ech-editions → ech-breves** : choix édition → `extractBreves(readEdition(file))` → ajout d'une brève en échantillon (max 3, `date` = ISO de l'édition) → retour `soul` (echKeepLocal) + toast ; retour Shell `ech-breves`→`ech-editions`, `ech-editions`→`soul`.
- [ ] **agents** : cartes éditables (modèle/mode si sceptique/outils/prompt/activé), « Enregistrer » (`saveAgent`) + toast.
- [ ] Parité look/comportement avec le vanilla (classes CSS + inline repris) ; aucune logique métier nouvelle (réutilise `@domain/soul`,`@domain/agents`,`@domain/edition`,`@domain/format`).
- [ ] `npm run typecheck` (0) / `npm run lint` (0) / `npm test` verts (Node 22) ; Storybook compile (AgentCard/EchantillonCard/BreveCard) ; `npm start` build sans erreur ; **validation visuelle utilisateur**.
- [ ] `lib/*.mjs`/`hud/*` inchangés ; aucun `import 'electron'` dans `src/renderer` ; `SOUL.md` non stagé. Push après chaque commit. Pas de fuite (requêtes async gardées par `alive`).

## Reste (3b-4/4/5)

3b-4 (history/reader), Phase 4 (suppression `.mjs`/`hud`), Phase 5 (qualité + packaging). Plans séparés.
