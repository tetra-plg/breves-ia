import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { Agent } from '@domain/agents';
import type { AgentEdits } from '@main/engine';
import { Eyebrow } from '@renderer/components/ui/Eyebrow';
import { Button } from '@renderer/components/ui/Button';

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
      <Eyebrow style={{ marginBottom: 4 }}>Modèle</Eyebrow>
      <select value={model} onChange={(e) => setModel(e.target.value)} style={selStyle}>
        {MODELES.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
      {isScept && (
        <>
          <Eyebrow style={{ marginBottom: 4 }}>Mode sceptique</Eyebrow>
          <select value={mode} onChange={(e) => setMode(e.target.value)} style={selStyle}>
            {MODES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </>
      )}
      <Eyebrow style={{ marginBottom: 4 }}>Outils (séparés par des virgules)</Eyebrow>
      <input
        value={tools}
        onChange={(e) => setTools(e.target.value)}
        style={{ width: '100%', padding: 8, border: '1px solid var(--line)', borderRadius: 'var(--radiusSm)', background: 'var(--panel)', color: 'var(--text)', font: '400 12px var(--mono)', marginBottom: 10 }}
      />
      <Eyebrow style={{ marginBottom: 4 }}>Prompt système</Eyebrow>
      <textarea spellCheck={false} value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} style={{ minHeight: 160, font: '400 12px/1.55 var(--mono)' }} />
      <Button variant="primary" style={{ marginTop: 10 }} onClick={save}>
        Enregistrer
      </Button>
    </div>
  );
}
