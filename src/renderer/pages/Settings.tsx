// src/renderer/pages/Settings.tsx
import { useEffect, useState } from 'react';
import { useAppStore } from '@renderer/store/app.store';
import type { SettingsState, SettingKey } from '@shared/types/api';
import { Button } from '@renderer/components/ui/Button';
import { Text } from '@renderer/components/ui/Text';
import { PathField } from '@renderer/components/PathField';

type Kind = 'directory' | 'file';
const FIELDS: { key: SettingKey; label: string; kind: Kind }[] = [
  { key: 'bbDir', label: 'BoilingBrain (dossier)', kind: 'directory' },
  { key: 'repoDir', label: 'Repo Brèves', kind: 'directory' },
  { key: 'claudeBin', label: 'Binaire claude (fichier)', kind: 'file' },
];

export function Settings() {
  const showToast = useAppStore((s) => s.showToast);
  const setDashboard = useAppStore((s) => s.setDashboard);
  const [state, setState] = useState<SettingsState | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    void window.api.getSettings().then((s) => {
      if (alive) setState(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function setValue(key: SettingKey, kind: Kind, value: string): Promise<void> {
    const valid = await window.api.validatePath(value, kind);
    setState((prev) => (prev ? { ...prev, [key]: { ...prev[key], value, valid } } : prev));
  }

  async function browse(key: SettingKey, kind: Kind): Promise<void> {
    const picked = await window.api.pickPath(kind);
    if (picked) await setValue(key, kind, picked);
  }

  async function save(): Promise<void> {
    if (!state) return;
    setSaving(true);
    const patch: Record<string, string> = {};
    for (const f of FIELDS) if (state[f.key].source !== 'env') patch[f.key] = state[f.key].value;
    const r = await window.api.saveSettings(patch);
    setSaving(false);
    showToast(r.ok ? 'Réglages enregistrés' : 'Échec : ' + (r.error ?? 'inconnu'));
    if (r.ok) void window.api.getDashboard().then(setDashboard);
  }

  if (!state) {
    return (
      <section>
        <div className="pad">
          <Text tone="faint" as="div">Chargement…</Text>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="pad" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Text tone="muted" as="p" style={{ margin: 0 }}>
          Chemins utilisés par l'app. Appliqués immédiatement à l'enregistrement.
        </Text>
        {FIELDS.map((f) => (
          <PathField
            key={f.key}
            label={f.label}
            value={state[f.key].value}
            valid={state[f.key].valid}
            locked={state[f.key].source === 'env'}
            onChange={(v) => void setValue(f.key, f.kind, v)}
            onBrowse={() => void browse(f.key, f.kind)}
          />
        ))}
        <div>
          <Button variant="primary" loading={saving} onClick={() => void save()}>
            Enregistrer
          </Button>
        </div>
      </div>
    </section>
  );
}
